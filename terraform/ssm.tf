locals {
  ssm_dir = endswith(var.ssm_prefix, "/") ? var.ssm_prefix : "${var.ssm_prefix}/"

  # IAM ARN segment after "parameter" (no leading slash), e.g. signal-front/*
  ssm_iam_path = trimsuffix(trimprefix(local.ssm_dir, "/"), "/")
}

resource "aws_ssm_parameter" "vite_api_base_url" {
  name  = "${local.ssm_dir}VITE_API_BASE_URL"
  type  = "String"
  value = var.api_base_url

  tags = {
    Name = "${var.project_name}-vite-api-base-url"
  }
}

resource "aws_ssm_parameter" "vite_agent_api_base_url" {
  name  = "${local.ssm_dir}VITE_AGENT_API_BASE_URL"
  type  = "String"
  value = var.agent_api_base_url

  tags = {
    Name = "${var.project_name}-vite-agent-api-base-url"
  }
}

resource "aws_ssm_parameter" "s3_bucket_name" {
  name  = "${local.ssm_dir}S3_BUCKET_NAME"
  type  = "String"
  value = aws_s3_bucket.site.bucket

  tags = {
    Name = "${var.project_name}-s3-bucket-name"
  }
}

resource "aws_ssm_parameter" "cloudfront_distribution_id" {
  name  = "${local.ssm_dir}CLOUDFRONT_DISTRIBUTION_ID"
  type  = "String"
  value = aws_cloudfront_distribution.site.id

  tags = {
    Name = "${var.project_name}-cloudfront-distribution-id"
  }
}
