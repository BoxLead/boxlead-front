output "s3_bucket_name" {
  description = "S3 bucket name (also in SSM as S3_BUCKET_NAME)."
  value       = aws_s3_bucket.site.bucket
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID (also in SSM as CLOUDFRONT_DISTRIBUTION_ID)."
  value       = aws_cloudfront_distribution.site.id
}

output "cloudfront_domain_name" {
  description = "CloudFront *.cloudfront.net hostname (CNAME your custom domain here)."
  value       = aws_cloudfront_distribution.site.domain_name
}

output "cloudfront_url" {
  description = "HTTPS URL via CloudFront default hostname (custom domain is var.domain_name)."
  value       = "https://${aws_cloudfront_distribution.site.domain_name}"
}

output "spa_custom_domain_url" {
  description = "HTTPS URL for the SPA when DNS points to CloudFront (your domain_name)."
  value       = "https://${var.domain_name}"
}

output "acm_validation_records" {
  description = "DNS validation CNAME(s) for the ACM certificate (us-east-1). Add at your registrar, then wait for aws_acm_certificate_validation to complete."
  value       = aws_acm_certificate.site.domain_validation_options
}

output "deployer_access_key_id" {
  description = "Set as GitHub secret AWS_ACCESS_KEY_ID for the frontend workflow."
  value       = aws_iam_access_key.github_deploy.id
}

output "deployer_secret_access_key" {
  description = "Set as GitHub secret AWS_SECRET_ACCESS_KEY (shown once; stored in Terraform state)."
  value       = aws_iam_access_key.github_deploy.secret
  sensitive   = true
}

output "ssm_parameter_prefix" {
  description = "Must match SIGNAL_FRONT_SSM_PREFIX in .github/workflows/deploy.yml."
  value       = local.ssm_dir
}

output "admin_s3_bucket_name" {
  description = "Backoffice S3 bucket name (also in SSM as ADMIN_S3_BUCKET_NAME)."
  value       = aws_s3_bucket.admin.bucket
}

output "admin_cloudfront_distribution_id" {
  description = "Backoffice CloudFront distribution ID (also in SSM as ADMIN_CLOUDFRONT_DISTRIBUTION_ID)."
  value       = aws_cloudfront_distribution.admin.id
}

output "admin_cloudfront_domain_name" {
  description = "Backoffice CloudFront hostname, the target of the proxied admin CNAME in Cloudflare."
  value       = aws_cloudfront_distribution.admin.domain_name
}

output "admin_custom_domain_url" {
  description = "HTTPS URL of the backoffice once the Cloudflare CNAME is in place."
  value       = "https://${var.admin_domain_name}"
}

output "admin_acm_validation_records" {
  description = "DNS validation CNAME(s) for the backoffice certificate (us-east-1). Add them in Cloudflare as DNS only, not proxied."
  value       = aws_acm_certificate.admin.domain_validation_options
}
