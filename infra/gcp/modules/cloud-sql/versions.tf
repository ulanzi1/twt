# Provider requirements for the reusable cloud-sql module (Story 1.15, D3-1.2).
#
# A module declares only `required_providers` (no `provider` block) — the root
# config (infra/gcp/versions.tf) configures the google + random providers and
# passes them down implicitly. Pins mirror the root so dev/staging/prod resolve
# the same provider versions.

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
