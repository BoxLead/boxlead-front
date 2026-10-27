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

variable "auth0_domain" {
  type        = string
  description = "Auth0 tenant domain baked into the SPA for Google and Facebook logins (stored in SSM as VITE_AUTH0_DOMAIN; e.g. tenant.us.auth0.com). Empty hides the social buttons."
  default     = ""

  validation {
    condition     = !strcontains(var.auth0_domain, "://") && !endswith(var.auth0_domain, "/")
    error_message = "auth0_domain is a hostname without scheme or trailing slash."
  }
}

variable "auth0_client_id" {
  type        = string
  description = "Client ID of the Auth0 application the SPA signs in with (stored in SSM as VITE_AUTH0_CLIENT_ID). Public value, not a secret."
  default     = ""
}

variable "ga_measurement_id" {
  type        = string
  description = "Google Analytics 4 measurement id baked into the public pages (stored in SSM as VITE_GA_MEASUREMENT_ID). Public value. Empty ships no analytics."
  default     = "G-V8C8SV97VC"
}

variable "google_site_verification" {
  type        = string
  description = "Search Console verification token for a meta tag (stored in SSM as VITE_GOOGLE_SITE_VERIFICATION). Prefer the DNS record and leave it empty."
  default     = ""
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

variable "admin_domain_name" {
  type        = string
  description = "Custom domain for the backoffice (CloudFront alternate domain name of the admin distribution)."
  default     = "admin.boxlead.app"
}

variable "admin_bucket_name" {
  type        = string
  description = "Globally unique S3 bucket name for the backoffice. Empty uses bucket_name with an -admin suffix."
  default     = ""
}

variable "admin_origin_header_name" {
  type        = string
  description = "Name of the header the Cloudflare transform rule adds toward the admin distribution. Requests without it get 403."
  sensitive   = true

  validation {
    condition     = can(regex("^[A-Za-z0-9-]{8,64}$", var.admin_origin_header_name))
    error_message = "admin_origin_header_name has 8 to 64 letters, digits or dashes."
  }
}

variable "admin_origin_header_value" {
  type        = string
  description = "Secret value of the Cloudflare origin header (e.g. openssl rand -hex 32)."
  sensitive   = true

  validation {
    condition     = can(regex("^[A-Za-z0-9_-]{32,128}$", var.admin_origin_header_value))
    error_message = "admin_origin_header_value has 32 to 128 letters, digits, dashes or underscores."
  }
}

variable "admin_origin_header_previous_value" {
  type        = string
  description = "Previous value of the Cloudflare origin header, still accepted while a rotation is in progress. Empty outside a rotation."
  sensitive   = true
  default     = ""

  validation {
    condition     = var.admin_origin_header_previous_value == "" || can(regex("^[A-Za-z0-9_-]{32,128}$", var.admin_origin_header_previous_value))
    error_message = "admin_origin_header_previous_value is empty or has 32 to 128 letters, digits, dashes or underscores."
  }
}
