# Terraform + provider version pins for the Cloudflare edge module (Story 1.13).
#
# The control mechanism for architecture §5.8a's vendor-neutral Edge/WAF capability
# bar (AR-52). Live `terraform apply` is DEFERRED to a D-item — there is no live
# Cloudflare zone in this environment (mirrors infra/gcp's D1-1.2 / D1-1.5 substrate
# pattern). The HCL is authored-but-not-applied; ADR-0010 records the disposition.
#
# Provider pinned to cloudflare/cloudflare v4 (the established schema used here). The
# v5 provider is an API-generated rewrite with breaking resource changes — the live-
# apply D-item re-validates against whatever provider is current at onboarding time.

terraform {
  required_version = ">= 1.7.0"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = ">= 4.40, < 5.0"
    }
  }
}

provider "cloudflare" {
  # Resolved from the environment / Secret Manager at apply time, NEVER committed.
  # Local apply: `export CLOUDFLARE_API_TOKEN=...` (provider reads it) or pass via
  # var. The token VALUE never enters the repo (architecture §5.9).
  api_token = var.cloudflare_api_token
}
