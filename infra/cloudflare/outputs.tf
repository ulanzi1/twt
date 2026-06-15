# Outputs exposed by the Cloudflare edge module.
#
# Turnstile SECRET keys are intentionally NOT exposed as plaintext outputs — they are
# pushed to GCP Secret Manager out-of-band and resolved at runtime by @twt/edge
# (mirrors infra/gcp's connection-string discipline; secret VALUES never surface in
# Terraform state outputs or logs). Site keys ARE public (rendered into the widget).

output "turnstile_auth_site_key" {
  description = "PUBLIC Turnstile site key for the admin/auth surface (apps/admin VITE_TURNSTILE_SITE_KEY)."
  value       = cloudflare_turnstile_widget.auth.id
}

output "turnstile_auth_secret_key" {
  description = "SECRET Turnstile key for the auth surface — push to Secret Manager as the apps/api TURNSTILE_SECRET_NAME. Sensitive."
  value       = cloudflare_turnstile_widget.auth.secret
  sensitive   = true
}

output "turnstile_member_site_key" {
  description = "PUBLIC Turnstile site key for the FR-88 member surfaces (signup / claim filing / helpdesk — Story 2.5 / Epic 11a)."
  value       = cloudflare_turnstile_widget.member_surfaces.id
}

output "turnstile_member_secret_key" {
  description = "SECRET Turnstile key for the member surfaces — push to Secret Manager. Sensitive."
  value       = cloudflare_turnstile_widget.member_surfaces.secret
  sensitive   = true
}

output "waf_custom_ruleset_id" {
  description = "ID of the per-surface WAF custom ruleset (bot-score sensitivity). null when enable_bot_management = false."
  value       = var.enable_bot_management ? cloudflare_ruleset.waf_custom[0].id : null
}

output "edge_only_ingress_mechanism" {
  description = "The selected edge-only-ingress mechanism (ADR-0010). The origin verifies ingress accordingly; the GCP ingress side is wired at Story 1.15."
  value       = var.edge_only_ingress_mechanism
}
