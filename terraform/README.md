# signal-front AWS (MVP)

Provisions an S3 bucket + CloudFront distribution to host the Signal SPA, **SSM parameters** for CI (Vite API URL, bucket name, distribution ID), and an **IAM user** whose keys are used only by GitHub Actions.

## Philosophy (same as signal-core backend)

- **Terraform Cloud** is the source of truth for configuration.
- **SSM Parameter Store** holds values the CI pipeline reads at build/deploy time (no app config in GitHub secrets).
- The SPA still bakes `VITE_API_BASE_URL` at **build** time; CI fetches it from SSM before `npm run build`.

## Prerequisites

- AWS account; Terraform Cloud or Terraform CLI with credentials
- A globally unique S3 `bucket_name`
- A DNS-controlled **`domain_name`** (e.g. `boxlead.app`) for the SPA — ACM validates via CNAME at your registrar
- Backend **`api_base_url`** (HTTPS, e.g. `https://api.boxlead.app`)
- Agent **`agent_api_base_url`** (HTTPS, e.g. `https://agent.boxlead.app`)

## Usage

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars

terraform init
terraform plan
terraform apply
```

## After apply

1. **ACM DNS validation:** Use output **`acm_validation_records`** — add the CNAME record(s) at your DNS provider. Re-run or wait for `terraform apply` to finish once validation completes (can take several minutes).
2. **Frontend DNS:** Point **`domain_name`** at CloudFront: use a **CNAME** to **`cloudfront_domain_name`** for a subdomain, or an **ALIAS/ANAME** (or Route 53 alias) to the same target for an **apex** name like `boxlead.app` (many registrars do not allow a bare CNAME at the root).
3. Copy outputs **`deployer_access_key_id`** and **`deployer_secret_access_key`** into GitHub **Actions secrets** (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`).
4. Set GitHub secret **`AWS_REGION`** to match Terraform `aws_region` (e.g. `us-east-2`).
5. Set backend **`cors_allowed_origins`** to **`https://<your-domain>`** (e.g. `https://boxlead.app`) and redeploy the backend so SSM updates.

## SSM prefix and GitHub Actions

Terraform variable **`ssm_prefix`** (default `/signal-front/`) must match workflow env **`SIGNAL_FRONT_SSM_PREFIX`** in [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml). If you change one, change the other.

SSM parameters created:

- `{ssm_prefix}VITE_API_BASE_URL`
- `{ssm_prefix}VITE_AGENT_API_BASE_URL`
- `{ssm_prefix}VITE_AUTH0_DOMAIN` and `{ssm_prefix}VITE_AUTH0_CLIENT_ID` (only created when `auth0_domain` and `auth0_client_id` are set; without them the build hides the Google and Facebook buttons)
- `{ssm_prefix}S3_BUCKET_NAME`
- `{ssm_prefix}CLOUDFRONT_DISTRIBUTION_ID`
- `{ssm_prefix}ADMIN_S3_BUCKET_NAME` and `{ssm_prefix}ADMIN_CLOUDFRONT_DISTRIBUTION_ID` for the backoffice

## Outputs

- `acm_validation_records` — CNAME records required to issue the ACM certificate.
- `cloudfront_domain_name` / `cloudfront_url` — CloudFront hostname (CNAME target).
- `spa_custom_domain_url` — expected SPA URL once DNS is correct.
- `deployer_access_key_id` / `deployer_secret_access_key` — GitHub secrets for CI.
- `ssm_parameter_prefix` — should match `SIGNAL_FRONT_SSM_PREFIX` in the workflow.
- `admin_*` — the same for the backoffice, see Backoffice below.

## GitHub Actions

**Secrets required:** `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` only (plus optional `AWS_REGION`).

**Not used:** `VITE_API_BASE_URL`, `S3_BUCKET_NAME`, `CLOUDFRONT_DISTRIBUTION_ID` — all read from SSM.

## Backoffice

`admin.tf` hosts the backoffice of `admin.boxlead.app` apart from the site. Nothing in it changes the site bucket, distribution or certificate.

It creates
- A private bucket with public access blocked, ACLs off and SSE-S3 encryption. Like the site bucket it has no versioning.
- An origin access control and a bucket policy so only the new distribution reads it.
- An ACM certificate for `admin_domain_name` in us-east-1, validated by DNS.
- The `admin-gate` CloudFront Function. It answers 403 when the Cloudflare origin header is missing or wrong and serves `index.html` for any path whose last segment has no extension.
- Two response header policies with the CSP of the backoffice plan, `connect-src` taken from the origin of `api_base_url`, HSTS, nosniff, DENY, `no-referrer`, COOP `same-origin` and `X-Robots-Tag` with noindex and nofollow. The one for pages adds `Cache-Control: no-store` and the one for `/assets/*` keeps the immutable caching set at upload.
- A distribution with only GET and HEAD, no query strings, cookies or access logs.
- SSM parameters `ADMIN_S3_BUCKET_NAME` and `ADMIN_CLOUDFRONT_DISTRIBUTION_ID` under `ssm_prefix`.
- A second inline policy for the deployer user that syncs the new bucket and invalidates the new distribution, nothing more.

Variables to load in Terraform Cloud
- `admin_origin_header_name` and `admin_origin_header_value`, both sensitive. Generate the value with `openssl rand -hex 32`.
- `admin_domain_name` and `admin_bucket_name` only to change their defaults.

The header value ends up in the function code. That means it lives in the Terraform state and anyone with `cloudfront:DescribeFunction` or `cloudfront:GetFunction` in the account can read it. The deployer user has neither. A CloudFront KeyValueStore would not help, since a key written by Terraform is in the state too, and writing it by hand would take rotation out of Terraform. The header only keeps people from skipping Cloudflare Access through the cloudfront.net hostname, and Access plus the checks in core still stand behind it.

After the apply
1. Copy `admin_acm_validation_records` into Cloudflare as CNAME records with the proxy off. If the apply is still waiting for validation, the same records are in the ACM console in us-east-1.
2. Add `admin` in Cloudflare as a proxied CNAME to `admin_cloudfront_domain_name`, with SSL in Full strict like the site.
3. Add a request header transform rule for the hostname `admin.boxlead.app` that sets the header named `admin_origin_header_name` to `admin_origin_header_value`.
4. Check that `https://<admin_cloudfront_domain_name>/` answers 403 and that the site still works as before.

Rotating the header
1. Set `admin_origin_header_previous_value` to the current value and `admin_origin_header_value` to a new one, then apply. Both values work now.
2. Change the value in the Cloudflare transform rule.
3. Empty `admin_origin_header_previous_value` and apply again.
