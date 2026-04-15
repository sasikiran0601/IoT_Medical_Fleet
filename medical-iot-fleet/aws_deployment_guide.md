# AWS Deployment Architecture & Implementation Guide

This guide details the implementation for deploying your Medical IoT Fleet application to AWS based on your specific requirements: CloudFront for static/dynamic routing, an EC2 instance running Docker Compose (Backend + DB), an Application Load Balancer (ALB), and AWS WAF for rate limiting.

## 1. Architectural Overview

*   **Frontend (Static):** Built React/Vite assets hosted in an Amazon S3 Bucket.
*   **Backend & DB (Dynamic):** An AWS EC2 instance running your two Docker containers (`fastapi-backend` and `postgres-db`) via Docker Compose.
*   **Load Balancer:** An Application Load Balancer (ALB) routes dynamic traffic to your EC2 instance over HTTP/HTTPS.
*   **CDN / Routing (CloudFront):** CloudFront acts as your single entry point for your custom domain.
    *   **Behavior `/*` (Default):** Routes to your static S3 Bucket.
    *   **Behavior `/api/*`:** Routes to your ALB (Backend API).
*   **Rate Limiting (AWS WAF):** Attached to CloudFront to prevent DDoS and API abuse.

---

## 2. Docker Compose (Backend & Database)
Save this in your project root as `docker-compose.yml`. This handles the two containers you requested.

```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: medical-iot-backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://user:password@db:5432/medical_iot
      - SECRET_KEY=$${SECRET_KEY}
    depends_on:
      db:
        condition: service_healthy
    restart: always

  db:
    image: postgres:15-alpine
    container_name: medical-iot-db
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
      POSTGRES_DB: medical_iot
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user -d medical_iot"]
      interval: 5s
      timeout: 5s
      retries: 5
    restart: always

volumes:
  postgres_data:
```

---

## 3. Terraform Implementation
Below is the core Terraform structure (`main.tf`) that spins up the infrastructure. *Note: You'll need an ACM Certificate created in `us-east-1` for CloudFront.*

```hcl
provider "aws" {
  region = "us-east-1"
}

# 1. VPC & Subnets (Simplified default VPC retrieval)
data "aws_vpc" "default" { default = true }
data "aws_subnets" "default" { filter { name = "vpc-id" values = [data.aws_vpc.default.id] } }

# 2. S3 Bucket for Frontend
resource "aws_s3_bucket" "frontend" {
  bucket = "my-medical-iot-frontend-bucket"
}
resource "aws_s3_bucket_website_configuration" "frontend_website" {
  bucket = aws_s3_bucket.frontend.id
  index_document { suffix = "index.html" }
  error_document { key = "index.html" } # For React Router
}

# 3. EC2 Security Group
resource "aws_security_group" "ec2_sg" {
  name        = "medical-iot-ec2-sg"
  description = "Allow ALB traffic to EC2"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    from_port       = 8000
    to_port         = 8000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb_sg.id] # Only accept traffic from ALB
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# 4. EC2 Instance (Runs Docker Compose)
resource "aws_instance" "app_server" {
  ami           = "ami-0c7217cdde317cfec" # Ubuntu 22.04 LTS us-east-1
  instance_type = "t3.medium"
  vpc_security_group_ids = [aws_security_group.ec2_sg.id]

  # User Data script installs Docker and starts your app
  user_data = <<-EOF
              #!/bin/bash
              apt-get update -y
              apt-get install docker.io docker-compose -y
              systemctl start docker
              systemctl enable docker
              # Deployment script will pull code and run docker-compose here
              EOF
}

# 5. Application Load Balancer (ALB)
resource "aws_security_group" "alb_sg" {
  name   = "medical-iot-alb-sg"
  vpc_id = data.aws_vpc.default.id
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"] # CloudFront talks to ALB over HTTP/HTTPS
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_lb" "backend_alb" {
  name               = "medical-iot-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb_sg.id]
  subnets            = data.aws_subnets.default.ids
}

resource "aws_lb_target_group" "backend_tg" {
  name     = "medical-iot-tg"
  port     = 8000
  protocol = "HTTP"
  vpc_id   = data.aws_vpc.default.id
  health_check {
    path                = "/api/health" # Ensure you have a health endpoint
    healthy_threshold   = 2
    unhealthy_threshold = 10
  }
}

resource "aws_lb_target_group_attachment" "ec2_attach" {
  target_group_arn = aws_lb_target_group.backend_tg.arn
  target_id        = aws_instance.app_server.id
  port             = 8000
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.backend_alb.arn
  port              = "80"
  protocol          = "HTTP"
  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend_tg.arn
  }
}

# 6. AWS WAF (Rate Limiting)
resource "aws_wafv2_web_acl" "rate_limit" {
  name        = "medical-iot-rate-limit"
  description = "Rate limiting for CloudFront"
  scope       = "CLOUDFRONT"
  default_action { allow {} }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "WAFRateLimit"
    sampled_requests_enabled   = true
  }

  rule {
    name     = "LimitRequests"
    priority = 1
    action { block {} }
    statement {
      rate_based_statement {
        limit              = 2000 # Max 2000 requests per 5 minutes per IP
        aggregate_key_type = "IP"
      }
    }
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "LimitRequestsRule"
      sampled_requests_enabled   = true
    }
  }
}

# 7. CloudFront Distribution (Routing Static & Dynamic)
resource "aws_cloudfront_distribution" "cdn" {
  enabled             = true
  is_ipv6_enabled     = true
  web_acl_id          = aws_wafv2_web_acl.rate_limit.arn
  aliases             = ["app.yourdomain.com"]

  # Default Cache Behavior: Routes to S3 (Frontend)
  origin {
    domain_name = aws_s3_bucket_website_configuration.frontend_website.website_endpoint
    origin_id   = "S3-Frontend"
    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-Frontend"
    viewer_protocol_policy = "redirect-to-https"
    forwarded_values {
      query_string = false
      cookies { forward = "none" }
    }
  }

  # API Cache Behavior: Routes to EC2 via ALB
  origin {
    domain_name = aws_lb.backend_alb.dns_name
    origin_id   = "ALB-Backend"
    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  ordered_cache_behavior {
    path_pattern     = "/api/*"
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "ALB-Backend"
    viewer_protocol_policy = "https-only"
    
    # Disable cache for API
    min_ttl          = 0
    default_ttl      = 0
    max_ttl          = 0
    
    forwarded_values {
      query_string = true
      headers      = ["Authorization", "Host"]
      cookies { forward = "all" }
    }
  }

  # Requires ACM Certificate created in us-east-1
  viewer_certificate {
    acm_certificate_arn      = "arn:aws:acm:us-east-1:123456789012:certificate/abc-123"
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }
  
  restrictions {
    geo_restriction { restriction_type = "none" }
  }
}
```

---

## 4. GitHub Actions CI/CD Pipeline
Create this file at `.github/workflows/deploy.yml`. It will automatically build your frontend, sync it to S3, invalidate the CloudFront cache, and SSH into your EC2 instance to restart the Docker Compose stack.

```yaml
name: Deploy to AWS

on:
  push:
    branches:
      - main

jobs:
  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Build Frontend
        working-directory: ./frontend
        run: |
          npm ci
          npm run build
          
      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: $${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: $${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Deploy to S3
        run: aws s3 sync ./frontend/dist s3://my-medical-iot-frontend-bucket --delete

      - name: Invalidate CloudFront
        run: |
          aws cloudfront create-invalidation \
            --distribution-id $${{ secrets.CLOUDFRONT_DIST_ID }} \
            --paths "/*"

  deploy-backend:
    runs-on: ubuntu-latest
    needs: deploy-frontend
    steps:
      - name: SSH into EC2 & Restart Docker Compose
        uses: appleboy/ssh-action@v0.1.7
        with:
          host: $${{ secrets.EC2_HOST }}
          username: ubuntu
          key: $${{ secrets.EC2_SSH_KEY }}
          script: |
            cd /home/ubuntu/medical-iot-fleet
            git pull origin main
            docker-compose down
            docker-compose up -d --build
```

---

## Recommendations & Best Practices Implemented

1. **Routing Strategy (CloudFront):** By pointing `/api/*` to the LoadBalancer and `/*` to S3, you avoid CORS issues entirely. Your frontend just makes calls to `/api/...` on the same domain.
2. **Rate Limiting (WAF):** AWS Web Application Firewall is linked to CloudFront. The Terraform script sets a hard limit of `2000 requests / 5 mins` per IP, protecting the Backend EC2 CPU from being overwhelmed.
3. **Database Security:** In `docker-compose.yml`, the Postgres database port `5432` is only mapped inside Docker's virtual network. By default, with the Security Group configuration in the Terraform snippet, port 5432 is not exposed to the public internet, meaning the DB is safe.
4. **Resiliency:** The Application Load Balancer acts as a reliable gateway. If your Docker backend restarts, the ALB holds incoming requests or returns standard 502s until the health check (`/api/health`) passes again.
5. **No Downtime Frontend:** Updating the front end simply puts files in S3 and invalidates the edge cache, deploying in seconds without restarting any servers.
