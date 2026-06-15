# Turnstile widgets for the FR-88 surfaces + the auth entry points (AC-6d).
#
# Each widget produces a PUBLIC site key (consumed at the rendering surface via the
# build-time VITE_TURNSTILE_SITE_KEY) and a SECRET key (server-only, used by
# @twt/edge's createCloudflareTurnstileVerifier). The secret is pushed to GCP Secret
# Manager out-of-band (the secret NAME → apps/api TURNSTILE_SECRET_NAME); it is NOT
# surfaced as a plaintext Terraform output (mirrors infra/gcp's connection-string
# discipline — secret VALUES never leave Cloudflare/Secret Manager).
#
# One widget for the admin/auth surface (Story 1.9 LoginPage, live now) + one for the
# member-facing FR-88 surfaces (signup / claim filing / helpdesk — forward-referenced
# to Story 2.5 / Epic 11a). Splitting keys lets per-surface rotation + analytics.

resource "cloudflare_turnstile_widget" "auth" {
  account_id = var.account_id
  name       = "${local.name_prefix}-auth"
  domains    = local.turnstile_domains
  mode       = var.turnstile_widget_mode
  region     = "world"
}

resource "cloudflare_turnstile_widget" "member_surfaces" {
  account_id = var.account_id
  name       = "${local.name_prefix}-member-fr88"
  domains    = local.turnstile_domains
  mode       = var.turnstile_widget_mode
  region     = "world"
}
