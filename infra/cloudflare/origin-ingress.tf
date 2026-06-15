# Edge-only ingress (AC-6b, AR-33, §5.8 L3251-3266) — the backend is not directly
# reachable from the public internet; it accepts traffic ONLY through Cloudflare.
#
# The MECHANISM is an ADR-0010 decision (var.edge_only_ingress_mechanism). The
# Cloudflare side expressed here is the `header_secret` default: a Transform Rule that
# injects a shared-secret header on every proxied request. The GCP origin verifies the
# header (a vendor-neutral Fastify guard behind @twt/edge) and rejects any request
# lacking it — i.e., any request that did NOT transit Cloudflare. The header VALUE is a
# secret resolved from Secret Manager, never committed.
#
# Alternatives (documented in README + ADR-0010):
#   - tunnel  — Cloudflare Tunnel (cloudflared); the origin has NO public ingress at
#               all (cleanest for Cloud Run private ingress). Tunnel config is wired
#               GCP-side at Story 1.15 (deferred).
#   - aop_mtls — Authenticated Origin Pulls (client-cert mTLS from Cloudflare).
#
# The GCP ingress side (Cloud Run ingress restriction / firewall) lands with Story
# 1.15; the break-glass bypass path must stay time-bounded + audit-logged (§5.8).

resource "cloudflare_ruleset" "edge_origin_auth" {
  count = var.edge_only_ingress_mechanism == "header_secret" ? 1 : 0

  zone_id     = var.zone_id
  name        = "${local.name_prefix}-edge-origin-auth"
  description = "Inject the edge-auth shared-secret header so the origin can prove ingress transited Cloudflare (AR-33)."
  kind        = "zone"
  phase       = "http_request_late_transform"

  rules {
    ref         = "inject_edge_auth_header"
    description = "Set ${var.edge_auth_header_name} on all proxied requests to the origin"
    expression  = "true"
    action      = "rewrite"
    enabled     = true

    action_parameters {
      headers {
        name      = var.edge_auth_header_name
        operation = "set"
        # The VALUE is a secret resolved at apply time from var.edge_auth_secret
        # (sensitive = true, no default). Never committed; resolved from Secret Manager
        # or passed via TF_VAR_edge_auth_secret at apply time (§5.9).
        value = var.edge_auth_secret
      }
    }
  }

  lifecycle {
    precondition {
      condition     = var.edge_auth_secret != null
      error_message = "edge_auth_secret must be provided when edge_only_ingress_mechanism = \"header_secret\". Supply it via TF_VAR_edge_auth_secret or a Secret Manager-backed workspace variable."
    }
  }
}
