locals {
  admin_bucket_name = var.admin_bucket_name != "" ? var.admin_bucket_name : "${var.bucket_name}-admin"
  admin_api_origin  = regex("^https://[^/]+", var.api_base_url)

  admin_content_security_policy = join("; ", [
    "default-src 'none'",
    "script-src 'self'",
    "style-src 'self'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src ${local.admin_api_origin}",
    "frame-ancestors 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    "object-src 'none'",
  ])

  admin_header_policies = {
    pages  = ["no-store"]
    assets = []
  }
}

resource "aws_s3_bucket" "admin" {
  bucket = local.admin_bucket_name

  tags = {
    Name = "${var.project_name}-admin"
  }
}

resource "aws_s3_bucket_ownership_controls" "admin" {
  bucket = aws_s3_bucket.admin.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_public_access_block" "admin" {
  bucket = aws_s3_bucket.admin.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "admin" {
  bucket = aws_s3_bucket.admin.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_acm_certificate" "admin" {
  provider          = aws.us_east_1
  domain_name       = var.admin_domain_name
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name = "${var.project_name}-admin-acm"
  }
}

resource "aws_acm_certificate_validation" "admin" {
  provider        = aws.us_east_1
  certificate_arn = aws_acm_certificate.admin.arn
}

resource "aws_cloudfront_origin_access_control" "admin" {
  name                              = "${var.project_name}-admin-oac"
  description                       = "OAC for ${local.admin_bucket_name}"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_function" "admin_gate" {
  name    = "${var.project_name}-admin-gate"
  runtime = "cloudfront-js-2.0"
  comment = "Rejects requests without the Cloudflare origin header and serves the backoffice shell"
  publish = true
  code = templatefile("${path.module}/functions/admin-gate.js.tftpl", {
    header_name   = lower(var.admin_origin_header_name)
    header_values = compact([var.admin_origin_header_value, var.admin_origin_header_previous_value])
  })
}

resource "aws_cloudfront_response_headers_policy" "admin" {
  for_each = local.admin_header_policies

  name    = "${var.project_name}-admin-${each.key}-headers"
  comment = "Security headers for ${var.admin_domain_name} ${each.key}"

  security_headers_config {
    strict_transport_security {
      access_control_max_age_sec = 31536000
      include_subdomains         = false
      preload                    = false
      override                   = true
    }

    content_type_options {
      override = true
    }

    frame_options {
      frame_option = "DENY"
      override     = true
    }

    referrer_policy {
      referrer_policy = "no-referrer"
      override        = true
    }

    content_security_policy {
      content_security_policy = local.admin_content_security_policy
      override                = true
    }
  }

  custom_headers_config {
    items {
      header   = "X-Robots-Tag"
      value    = "noindex, nofollow"
      override = true
    }

    items {
      header   = "Cross-Origin-Opener-Policy"
      value    = "same-origin"
      override = true
    }

    items {
      header   = "Cross-Origin-Resource-Policy"
      value    = "same-origin"
      override = true
    }

    items {
      header   = "Permissions-Policy"
      value    = "camera=(), microphone=(), geolocation=(), payment=(), usb=(), accelerometer=(), gyroscope=(), magnetometer=()"
      override = true
    }

    dynamic "items" {
      for_each = each.value

      content {
        header   = "Cache-Control"
        value    = items.value
        override = true
      }
    }
  }
}

resource "aws_cloudfront_distribution" "admin" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "${var.project_name}-admin"
  default_root_object = "index.html"
  price_class         = var.price_class
  aliases             = [var.admin_domain_name]

  depends_on = [aws_acm_certificate_validation.admin]

  origin {
    domain_name              = aws_s3_bucket.admin.bucket_regional_domain_name
    origin_id                = "s3-admin"
    origin_access_control_id = aws_cloudfront_origin_access_control.admin.id
  }

  default_cache_behavior {
    target_origin_id           = "s3-admin"
    viewer_protocol_policy     = "redirect-to-https"
    compress                   = true
    response_headers_policy_id = aws_cloudfront_response_headers_policy.admin["pages"].id

    allowed_methods = ["GET", "HEAD"]
    cached_methods  = ["GET", "HEAD"]

    forwarded_values {
      query_string = false

      cookies {
        forward = "none"
      }
    }

    min_ttl     = 0
    default_ttl = 3600
    max_ttl     = 86400

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.admin_gate.arn
    }
  }

  ordered_cache_behavior {
    path_pattern               = "/assets/*"
    target_origin_id           = "s3-admin"
    viewer_protocol_policy     = "redirect-to-https"
    compress                   = true
    response_headers_policy_id = aws_cloudfront_response_headers_policy.admin["assets"].id

    allowed_methods = ["GET", "HEAD"]
    cached_methods  = ["GET", "HEAD"]

    forwarded_values {
      query_string = false

      cookies {
        forward = "none"
      }
    }

    min_ttl     = 0
    default_ttl = 3600
    max_ttl     = 86400

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.admin_gate.arn
    }
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate.admin.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  tags = {
    Name = "${var.project_name}-admin-cdn"
  }
}

data "aws_iam_policy_document" "s3_admin_cloudfront" {
  statement {
    sid    = "AllowCloudFrontRead"
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.admin.arn}/*"]

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.admin.arn]
    }
  }
}

resource "aws_s3_bucket_policy" "admin" {
  bucket = aws_s3_bucket.admin.id
  policy = data.aws_iam_policy_document.s3_admin_cloudfront.json

  depends_on = [aws_s3_bucket_public_access_block.admin]
}

resource "aws_ssm_parameter" "admin_s3_bucket_name" {
  name  = "${local.ssm_dir}ADMIN_S3_BUCKET_NAME"
  type  = "String"
  value = aws_s3_bucket.admin.bucket

  tags = {
    Name = "${var.project_name}-admin-s3-bucket-name"
  }
}

resource "aws_ssm_parameter" "admin_cloudfront_distribution_id" {
  name  = "${local.ssm_dir}ADMIN_CLOUDFRONT_DISTRIBUTION_ID"
  type  = "String"
  value = aws_cloudfront_distribution.admin.id

  tags = {
    Name = "${var.project_name}-admin-cloudfront-distribution-id"
  }
}

data "aws_iam_policy_document" "github_deploy_admin" {
  statement {
    sid    = "SyncAdminDistToS3"
    effect = "Allow"
    actions = [
      "s3:PutObject",
      "s3:DeleteObject",
      "s3:ListBucket",
    ]
    resources = [
      aws_s3_bucket.admin.arn,
      "${aws_s3_bucket.admin.arn}/*",
    ]
  }

  statement {
    sid    = "InvalidateAdminCloudFront"
    effect = "Allow"
    actions = [
      "cloudfront:CreateInvalidation",
    ]
    resources = [
      aws_cloudfront_distribution.admin.arn,
    ]
  }
}

resource "aws_iam_user_policy" "github_deploy_admin" {
  name   = "${var.project_name}-github-deploy-admin"
  user   = aws_iam_user.github_deploy.name
  policy = data.aws_iam_policy_document.github_deploy_admin.json
}
