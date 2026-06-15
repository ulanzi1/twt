# Derived names + shared expressions for the Cloudflare edge module.
#
# Centralised so the resource files reference one source of truth, mirroring
# infra/gcp/locals.tf. All names follow the twt-${environment}-* convention to
# support multi-environment reuse (Story 1.15).

locals {
  name_prefix = "twt-${var.environment}"

  # Turnstile widget domains: the apex + www + any caller-supplied extras. Site keys
  # are domain-bound; the documented Cloudflare TEST keys cover localhost for dev.
  turnstile_domains = distinct(concat(
    [var.zone_name, "www.${var.zone_name}"],
    var.turnstile_extra_domains,
  ))

  # A wirefilter expression matching any FR-88 high-sensitivity surface path prefix.
  # Used by the stricter WAF custom rule + (documentation for) the surface Turnstile.
  sensitive_paths_expression = join(" or ", [
    for p in var.sensitive_surface_paths : format("starts_with(http.request.uri.path, %q)", p)
  ])

  # Resource-tagging convention (Cloudflare rulesets/records don't take free-form
  # labels like GCP; we encode the framework identity in resource names + descriptions).
  managed_by = "terraform"
  component  = "edge-cloudflare"
}
