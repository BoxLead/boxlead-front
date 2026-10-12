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
- `{ssm_prefix}S3_BUCKET_NAME`
- `{ssm_prefix}CLOUDFRONT_DISTRIBUTION_ID`

## Outputs

- `acm_validation_records` — CNAME records required to issue the ACM certificate.
- `cloudfront_domain_name` / `cloudfront_url` — CloudFront hostname (CNAME target).
- `spa_custom_domain_url` — expected SPA URL once DNS is correct.
- `deployer_access_key_id` / `deployer_secret_access_key` — GitHub secrets for CI.
- `ssm_parameter_prefix` — should match `SIGNAL_FRONT_SSM_PREFIX` in the workflow.

## GitHub Actions

**Secrets required:** `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` only (plus optional `AWS_REGION`).

**Not used:** `VITE_API_BASE_URL`, `S3_BUCKET_NAME`, `CLOUDFRONT_DISTRIBUTION_ID` — all read from SSM.
