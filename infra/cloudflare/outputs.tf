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
  description = "ID of the zone's custom-rules entry-point ruleset — always present (Story 6.30): the app-link verification-file skip, plus the per-surface bot-score rules when enable_bot_management = true."
  value       = cloudflare_ruleset.waf_custom.id
}

output "edge_only_ingress_mechanism" {
  description = "The selected edge-only-ingress mechanism (ADR-0010). The origin verifies ingress accordingly; the GCP ingress side is wired at Story 1.15."
  value       = var.edge_only_ingress_mechanism
}
