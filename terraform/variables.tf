variable "aws_region" {
  type        = string
  description = "AWS region for the S3 bucket (CloudFront is global)."
  default     = "us-east-2"
}

variable "bucket_name" {
  type        = string
  description = "Globally unique S3 bucket name for the static site."
}

variable "domain_name" {
  type        = string
  description = "Custom domain for the SPA (CloudFront alternate domain name; e.g. boxlead.app)."
}

variable "ssm_prefix" {
  type        = string
  description = "SSM path prefix for CI-readable parameters (must match GitHub Actions env SIGNAL_FRONT_SSM_PREFIX)."
  default     = "/signal-front/"

  validation {
    condition     = startswith(var.ssm_prefix, "/")
    error_message = "ssm_prefix must start with / (e.g. /signal-front/)."
  }
}

variable "api_base_url" {
  type        = string
  description = "Backend API base URL for Vite (stored in SSM as VITE_API_BASE_URL; e.g. https://api.boxlead.app)."
}

variable "agent_api_base_url" {
  type        = string
  description = "Agent API origin baked into the SPA (stored in SSM as VITE_AGENT_API_BASE_URL; e.g. https://agent.boxlead.app)."
}

variable "project_name" {
  type        = string
  description = "Prefix for resource Name tags."
  default     = "signal-front"
}

variable "price_class" {
  type        = string
  description = "CloudFront price class (e.g. PriceClass_100 for US/EU only — lowest cost)."
  default     = "PriceClass_100"
}
