# Bot Management + WAF custom rules with per-surface sensitivity (AC-6c, §5.8a).
#
# Two layers:
#   1. cloudflare_bot_management — the ML bot-scoring engine (cf.bot_management.score).
#      PLAN-TIER DEPENDENT (Enterprise = full Bot Management; Pro/Business = Super Bot
#      Fight Mode). Gated behind var.enable_bot_management — the architecture commits
#      the capability, not the SKU (ADR-0010 Bot-Management plan-tier nuance).
#   2. cloudflare_ruleset (http_request_firewall_custom) — WAF custom rules keyed on
#      the bot score, grouped by route: the FR-88 high-sensitivity surfaces (signup,
#      claim filing, helpdesk, auth) get a STRICTER threshold than read surfaces.
#
# Layer-1 rate limiting (architecture §2.11) is Cloudflare's front line; the server-
# side rate-limit POLICY layer is Story 1.14 — NOT built here.

resource "cloudflare_bot_management" "twt" {
  count = var.enable_bot_management ? 1 : 0

  account_id = var.account_id
  zone_id    = var.zone_id

  # Super Bot Fight Mode knobs (Pro/Business). On Enterprise Bot Management these are
  # superseded by the score-based custom rules below. enable_js powers the score.
  enable_js                = true
  sbfm_definitely_automated = "block"
  sbfm_likely_automated     = "managed_challenge"
  sbfm_verified_bots        = "allow" # search engines, uptime monitors, etc.
}

resource "cloudflare_ruleset" "waf_custom" {
  # cf.bot_management.score is only populated when Bot Management is enabled. Without it
  # the score field evaluates to 1 for all traffic, which would challenge or block every
  # request to the sensitive paths at apply time. Guard to match cloudflare_bot_management.
  count = var.enable_bot_management ? 1 : 0

  zone_id     = var.zone_id
  name        = "${local.name_prefix}-waf-custom"
  description = "Per-surface bot sensitivity (Story 1.13, §5.8a). FR-88 surfaces stricter than read surfaces."
  kind        = "zone"
  phase       = "http_request_firewall_custom"

  # Rule 1 — FR-88 high-sensitivity surfaces: challenge below the STRICTER score.
  rules {
    ref         = "fr88_sensitive_surfaces"
    description = "Managed-challenge bots on signup / claim filing / helpdesk / auth (stricter threshold)"
    expression  = "(${local.sensitive_paths_expression}) and (cf.bot_management.score lt ${var.bot_score_sensitive_threshold})"
    action      = "managed_challenge"
    enabled     = true
  }

  # Rule 2 — everything else: challenge only clearly-automated traffic.
  rules {
    ref         = "standard_surfaces"
    description = "Managed-challenge clearly-automated traffic on standard surfaces"
    expression  = "not (${local.sensitive_paths_expression}) and (cf.bot_management.score lt ${var.bot_score_challenge_threshold})"
    action      = "managed_challenge"
    enabled     = true
  }

  # Rule 3 — block definitely-automated traffic outright (score = 1..2).
  rules {
    ref         = "block_definite_bots"
    description = "Block definitely-automated traffic (lowest bot scores)"
    expression  = "cf.bot_management.score lt 2 and not cf.bot_management.verified_bot"
    action      = "block"
    enabled     = true
  }

  lifecycle {
    precondition {
      condition     = var.bot_score_sensitive_threshold >= var.bot_score_challenge_threshold
      error_message = "bot_score_sensitive_threshold (${var.bot_score_sensitive_threshold}) must be >= bot_score_challenge_threshold (${var.bot_score_challenge_threshold}). A lower sensitive threshold would challenge LESS aggressively on high-sensitivity surfaces, inverting the intended security posture."
    }
  }
}
