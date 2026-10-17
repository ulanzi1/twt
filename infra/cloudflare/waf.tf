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

  # Story 6.30 (N11): ⛔ no `account_id` — it is ⛔ not an argument of `cloudflare_bot_management` in provider
  # 4.52.x (`terraform validate` failed on it); the resource is zone-scoped.
  zone_id = var.zone_id

  # Super Bot Fight Mode knobs (Pro/Business). On Enterprise Bot Management these are
  # superseded by the score-based custom rules below. enable_js powers the score.
  enable_js                 = true
  sbfm_definitely_automated = "block"
  sbfm_likely_automated     = "managed_challenge"
  sbfm_verified_bots        = "allow" # search engines, uptime monitors, etc.
}

resource "cloudflare_ruleset" "waf_custom" {
  # ⭐ UNCONDITIONAL (Story 6.30, `2026-10-10-312` AL10, corrected by `-315` C5 and `-316` E2). This is the zone's
  # ENTRY-POINT ruleset for `http_request_firewall_custom`, and Cloudflare allows ONE per phase per zone — so the
  # app-link skip lives INSIDE it (a second ruleset in this phase would fail at APPLY; `terraform validate`
  # cannot see that). Its FIRST rule is the skip; the bot-score Rules 1–3 follow ONLY when bot management is on
  # (`cf.bot_management.score` is only populated then — without it the score evaluates to 1 for all traffic,
  # which would challenge or block every request to the sensitive paths).
  zone_id     = var.zone_id
  name        = "${local.name_prefix}-waf-custom"
  description = "App-link verification files skip the edge challenges (Story 6.30); MSG91's SMS delivery-report webhook skips them too (Story 6.37b); per-surface bot sensitivity (Story 1.13, §5.8a) when bot management is on."
  kind        = "zone"
  phase       = "http_request_firewall_custom"

  # Rule 0 (FIRST) — Story 6.30: the two app-link verification files. Apple's CDN and Android's verifier are
  # bots by design; a challenge is ⛔ not a clean 200, and verification then fails SILENTLY. Skips the rest of
  # THIS ruleset (Rules 1–3), Browser Integrity Check and the zone security level (both ALWAYS on — zone.tf)
  # and Super Bot Fight Mode, for EXACTLY these two public, data-free paths — ⛔ never `/peer-request` (a human
  # page: normal edge rules apply). Free-plan Bot Fight Mode cannot be skipped — the operator records whether
  # it is on (roster Row 29). ADR-0010's DPDPA clearance covers the edge design "as recorded": the author's
  # reading that this skip is ⛔ not material is recorded with its ground on Row 29; if questioned it goes to
  # Row 3's owners (Trustee Panel; support Legal Counsel) — ⛔ never settled by the operator.
  rules {
    ref         = "app_link_verification_files_skip"
    description = "Skip BIC, security level, SBFM and the custom rules for the two app-link verification files (Story 6.30)"
    expression  = "http.request.uri.path in {\"/.well-known/apple-app-site-association\" \"/.well-known/assetlinks.json\"}"
    action      = "skip"
    action_parameters {
      ruleset  = "current"
      products = ["bic", "securityLevel"]
      phases   = ["http_request_sbfm"]
    }
    logging {
      enabled = true
    }
    enabled = true
  }

  # Rule 0b — Story 6.37b (`2026-10-17-347` DR9; ADR-0042): MSG91's SMS delivery-report webhook. MSG91's servers are a
  # bot by design; a challenge is ⛔ a clean 2xx, so MSG91 RETRIES it and then AUTO-PAUSES the webhook (> 2% final
  # failures over ≥ 10 requests) — and a paused webhook goes SILENT (the jobs service's silence alarm is the only
  # detector, and it counts claim-text sends only — ADR-0042).
  # Skips, for EXACTLY this one POST path, the same edge checks Rule 0 skips (BIC, security level, SBFM and Rules 1–3).
  # ⚠ A skip is ⛔ trust: the api still refuses (403) any request without the boot-resolved header token. A SEPARATE rule
  # (⛔ the path added to Rule 0's expression — those files are GETs with their own reason). Free-plan Bot Fight Mode
  # cannot be skipped — whether it is on is recorded at roster Row 33 (c). OPERATOR-applied (Row 33 (c)).
  rules {
    ref         = "msg91_sms_reports_skip"
    description = "Skip BIC, security level, SBFM and the custom rules for MSG91's SMS delivery-report webhook (Story 6.37b)"
    expression  = "http.request.uri.path eq \"/api/v1/webhooks/msg91/sms-reports\" and http.request.method eq \"POST\""
    action      = "skip"
    action_parameters {
      ruleset  = "current"
      products = ["bic", "securityLevel"]
      phases   = ["http_request_sbfm"]
    }
    logging {
      enabled = true
    }
    enabled = true
  }

  # Rules 1–3 — only when bot management is on (a `for` filter, so the list type never changes with the flag).
  # Rule 1 — FR-88 high-sensitivity surfaces: challenge below the STRICTER score.
  # Rule 2 — everything else: challenge only clearly-automated traffic.
  # Rule 3 — block definitely-automated traffic outright (score = 1..2).
  dynamic "rules" {
    for_each = [for rule in [
      {
        ref         = "fr88_sensitive_surfaces"
        description = "Managed-challenge bots on signup / claim filing / helpdesk / auth (stricter threshold)"
        expression  = "(${local.sensitive_paths_expression}) and (cf.bot_management.score lt ${var.bot_score_sensitive_threshold})"
        action      = "managed_challenge"
      },
      {
        ref         = "standard_surfaces"
        description = "Managed-challenge clearly-automated traffic on standard surfaces"
        expression  = "not (${local.sensitive_paths_expression}) and (cf.bot_management.score lt ${var.bot_score_challenge_threshold})"
        action      = "managed_challenge"
      },
      {
        ref         = "block_definite_bots"
        description = "Block definitely-automated traffic (lowest bot scores)"
        expression  = "cf.bot_management.score lt 2 and not cf.bot_management.verified_bot"
        action      = "block"
      },
    ] : rule if var.enable_bot_management]
    content {
      ref         = rules.value.ref
      description = rules.value.description
      expression  = rules.value.expression
      action      = rules.value.action
      enabled     = true
    }
  }

  lifecycle {
    # Only when bot management is on — the ruleset is ALWAYS present now (Story 6.30), and with the flag off no
    # rule reads either threshold, so an inverted pair must ⛔ not refuse the apply (code review 2026-10-11).
    precondition {
      condition     = !var.enable_bot_management || var.bot_score_sensitive_threshold >= var.bot_score_challenge_threshold
      error_message = "bot_score_sensitive_threshold (${var.bot_score_sensitive_threshold}) must be >= bot_score_challenge_threshold (${var.bot_score_challenge_threshold}). A lower sensitive threshold would challenge LESS aggressively on high-sensitivity surfaces, inverting the intended security posture."
    }
  }
}
