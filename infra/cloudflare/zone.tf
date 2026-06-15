# Zone settings + the proxied DNS records (AC-6a — all public traffic proxied
# through Cloudflare so the backend is reachable only via the edge).
#
# The `proxied = true` flag on the A/AAAA/CNAME records is what routes public traffic
# through Cloudflare's edge (orange-cloud). Combined with the origin firewall
# (origin-ingress.tf), this makes the origin unreachable except through Cloudflare.

resource "cloudflare_zone_settings_override" "twt" {
  zone_id = var.zone_id

  settings {
    # TLS posture (§5.8 — strict end-to-end). `strict` requires a valid cert on the
    # origin; the GCP origin terminates TLS (Cloud Run managed cert) at Story 1.15.
    ssl                      = "strict"
    min_tls_version          = "1.2"
    always_use_https         = "on"
    automatic_https_rewrites = "on"
    tls_1_3                  = "on"
    opportunistic_encryption = "on"

    # Baseline managed protections. Per-surface sensitivity is layered in waf.tf.
    security_level = "medium"
    browser_check  = "on"
    challenge_ttl  = 1800

    # Defense-in-depth headers (HSTS). Conservative max-age for dev; prod raises it.
    security_header {
      enabled            = true
      max_age            = 31536000
      include_subdomains = true
      preload            = false
      nosniff            = true
    }
  }
}

# Apex record → the GCP origin, proxied through Cloudflare. `origin_hostname` is null
# until Story 1.15 provisions the live Cloud Run service; the record is authored here
# so the proxy topology is committed (deferred-apply).
resource "cloudflare_record" "apex" {
  count = var.origin_hostname == null ? 0 : 1

  zone_id = var.zone_id
  name    = "@"
  type    = "CNAME"
  value   = var.origin_hostname
  proxied = true # orange-cloud — public traffic transits the edge (AC-6a)
  ttl     = 1    # 1 = automatic (required when proxied)
  comment = "twt-${var.environment} apex → origin (proxied, edge-only ingress)"
}

resource "cloudflare_record" "www" {
  count = var.origin_hostname == null ? 0 : 1

  zone_id = var.zone_id
  name    = "www"
  type    = "CNAME"
  value   = var.zone_name
  proxied = true
  ttl     = 1
  comment = "twt-${var.environment} www → apex (proxied)"
}
