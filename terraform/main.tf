terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Optional remote state:
  #   terraform init -backend-config=backend.hcl
  # backend "s3" {
  #   bucket         = "your-terraform-state-bucket"
  #   key            = "signal-front/terraform.tfstate"
  #   region         = "us-east-1"
  #   encrypt        = true
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Application = "boxlead"
    }
  }
}

# CloudFront ACM certificates must live in us-east-1 (AWS requirement).
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"

  default_tags {
    tags = {
      Application = "boxlead"
    }
  }
}