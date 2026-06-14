# Terraform + provider version pins for the GCP infrastructure module.
#
# Story 1.2 substrate (Cloud SQL Postgres + Drizzle migration tooling).
# Story 1.15 will extend this module for staging + prod + Dokploy auto-deploy.

terraform {
  required_version = ">= 1.7.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = ">= 5.10, < 6.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}
