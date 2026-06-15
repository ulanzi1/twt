# Observable edge metrics (AC-6e, §5.8a Category 5) — request / error / challenge /
# bot-classification rates queryable.
#
# Cloudflare exposes these natively via Analytics (GraphQL Analytics API + dashboard).
# For durable, queryable export to the platform observability sink, a Logpush job
# streams edge logs (including bot scores + WAF/challenge actions) to a destination
# (GCS bucket / SIEM). Gated behind var.enable_logpush — the live sink is an ops
# decision wired at Story 1.15; dev relies on the native Analytics dashboard.

resource "cloudflare_logpush_job" "edge_logs" {
  count = var.enable_logpush ? 1 : 0

  zone_id          = var.zone_id
  name             = "${local.name_prefix}-edge-logs"
  dataset          = "http_requests"
  destination_conf = var.logpush_destination_conf
  enabled          = true

  # The fields that make the edge observable: bot classification, WAF/challenge
  # outcomes, and the request/response basics for rate + error analysis.
  logpull_options = "fields=RayID,EdgeStartTimestamp,ClientIP,ClientRequestHost,ClientRequestPath,ClientRequestMethod,EdgeResponseStatus,BotScore,BotScoreSrc,SecurityLevel,WAFAction,EdgeColoCode&timestamps=rfc3339"
}
