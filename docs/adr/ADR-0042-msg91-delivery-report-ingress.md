# ADR-0042: MSG91 delivery-report ingress — a static-header webhook (MSG91 offers no signature), a global inbox that keeps no phone number, and correlation by our own row id

> **Status:** drafted
> **Date:** 2026-10-17 (date entered current status)
> **Author:** BigDev (Solo Builder)
> **Ratifying trustees:** — (populated at `ratified`)
> **Supersedes:** —
> **Superseded by:** —

## Context

This ADR records a **provider-ingress control**: how the platform receives MSG91's SMS delivery reports, authenticates them, what it
keeps, and how it matches each report to the text it describes. The build decisions are
[`-347`](../../.decision-log.md#decision-2026-10-17-347) (Story 6.37b, DR1–DR14 and DR5-G); the row was chartered by
[`-345`](../../.decision-log.md#decision-2026-10-17-345) MG1 (a). ADR-0041 (the MSG91 send path) left delivery reports to this row
(*"Delivery reports are ⛔ consumed here — they are row `6-37b-msg91-delivery-reports`"*, where "⛔" means "not").

- **The properties it controls.** Architecture §3.11 (`architecture.md:2572-2585`) commits webhook ingress as *"1. **Verify** provider
  signature at handler entry … 2. **Persist** … 3. **ACK** … 4. **Return.** No business logic, no synchronous downstream calls"*.
  §5.9 (`:3520-3531`) commits webhook signing secrets *"rotated on a committed cadence; rotation coordinated with provider via
  dual-secret window"* (`:3530-3531`). The edge capability bar names *"Ingress signature verification"* (`:3492-3493`).
- **The deciding fact: MSG91 signs nothing.** Its SMS webhook (configured in MSG91's panel, JSON, one POST per recipient) offers no
  HMAC, no shared secret and no basic auth — only custom static headers we choose, which it sends with every report — and publishes no
  source IP addresses. §3.11 step 1 therefore cannot be met as written; this ADR records the deviation and what replaces it.
- **Why reports matter.** At send time MSG91 answers `success` even to a fake key (Story 6.37 F9), so `accepted` means "MSG91 took
  the request", not "the phone received it". Whether the Trust may use a reported failure to change what counts as "reached" before a
  claim is closed for silence is the Trustee Panel's question PQ1 (routing note
  `trustee-panel-routing-note-2026-10-17-6-37b-reported-undelivered.md`); this ADR covers only how the reports arrive and are stored.
- **Provider behaviour that shapes the design** (MSG91's help pages, read 2026-10-17): failed POSTs are retried (30 s up to 30 min);
  the webhook is PAUSED automatically when more than 2 % of at least 10 requests finally fail; MSG91 expects an answer within 5–8 s;
  duplicates are expected (*"you may receive multiple callbacks"*); every value is a JSON string.
- **Edge.** Cloudflare challenges automated traffic (`browser_check`, the security level, free-plan Bot Fight Mode). A challenged
  POST is not a clean 200, so MSG91 would retry and then pause the webhook — silently.
- **Residency.** A report carries the member's phone number. Keeping it would add a copy of member PII for no matching benefit,
  because each send is identified by our own id (Decision below).
- **Deadline:** none for the build (nothing is in production). Ratification is roster **Row 33 (a)** — a go-live gate, not a merge
  fence.

## Decision

**MSG91's SMS delivery reports are received at one public `apps/api` route authenticated by a static secret header, persisted as an
allowlisted projection that never includes the phone number, acknowledged only after the write commits, and matched later by a jobs
correlator to the exact send through a correlation id (`CRQID`) that every send carries — our own send row's id.**

Load-bearing details:

- **The route.** `POST /api/v1/webhooks/msg91/sms-reports` in the `channel-webhooks` module (inside the AI-5-1 constant-time gate's
  scan), hidden from the OpenAPI document, on the public-route allowlist.
- **Authentication (replacing §3.11 step 1).** The header `x-twt-msg91-secret-token`, configured in MSG91's panel, written as an
  inline literal in the handler (the gate recognises the `x-*-secret-token` shape) and compared by two direct
  `timingSafeEqualString` calls with a current and an optional next token from Secret Manager (`SMS_REPORT_WEBHOOK_TOKEN_SECRET_NAME`,
  `SMS_REPORT_WEBHOOK_TOKEN_NEXT_SECRET_NAME`, each with an `…_ENV_FALLBACK` for local development). The token rides in a header,
  never the URL, because Traefik logs the query string. A token is usable when, trimmed, it is at least 32 characters. Both tokens
  are read once at boot. A wrong or missing header is `403 webhook.signature_rejected` and nothing is written.
- **When a secret cannot be used, the api still starts.** Current name unset ⇒ the webhook is disabled (403 to every request; one
  production warning). Current name set but unreadable, blank or too short ⇒ disabled, one error line naming the secret. Current
  usable and next broken ⇒ the webhook accepts the current token only, one error line naming the next secret. No line ever carries a
  value. Each state lasts until the next restart.
- **Rotation (the §5.9 dual-secret window).** Set the next token in Secret Manager and restart (both tokens are now
  accepted); change the header value in MSG91's panel to the next token; promote it to the current token and restart; clear the next
  token and restart. Each step is a restart.
- **Persist-then-acknowledge.** The handler parses the body itself (every content type is read as raw bytes in the route's own
  scope, so no content type is refused before authentication), keeps exactly seven columns per report — request id, CRQID, status
  code, event name, failure reason (digit runs of seven or more masked), delivery time as raw text, and our receive time — inserts one
  row per report into the global inbox `sms_delivery_report_inbox`, commits, and only then answers `200 {received:true}`. A failed
  commit is a 5xx so MSG91 retries. A parse error is caught and never logged (its message can quote the body). A body with no usable
  report is `200` plus one log line, because a 4xx would count toward the automatic pause. No KMS, Secret Manager or outbound call is
  made per request.
- **No phone number.** MSG91's payload template omits the phone number, sender id, credit, user id and DLT id, and the handler drops
  them if they arrive. The inbox therefore holds no personal data and has no Pariwar column (MSG91 is one global account); its
  row-security policies are `USING (true)` per granted command, the global-table shape of migration 0049.
- **Deduplication.** Two reports are duplicates when they share the request id, the CRQID and the status code; the first is kept.
- **Correlation by our own id.** Every send carries `CRQID` = a kind prefix (`cr`, `ce`, `sn`, `pm`, or `ot` for a login code) plus
  the send row's uuid, inside the single recipient object of the Flow request. A report is matched by one primary-key lookup — no
  index is added to any send table, and a report whose MSG91 request id was lost (a timeout after acceptance, a retry) still finds its
  row. The result is written to a new Pariwar-scoped table `sms_send_deliveries`; the four send tables are never written.
- **The correlator** is a pg-boss job every minute that leases due inbox rows and settles each in its own transaction by
  compare-and-set — at least once, never counted twice.
- **The edge.** A Cloudflare skip rule for exactly this path and `POST`, placed directly after the app-link verification rule,
  skipping the browser integrity check, the security level, Super Bot Fight Mode and the custom rules. Authentication stays in the
  api; the skip is not trust.
- **Rate limit.** The route has its own limit, provisionally 1,200 requests per minute, which replaces the global 300 per minute for
  this route.

## Alternatives considered

- **A secret path segment in the URL** — rejected: Traefik's access log records the full request path and query.
- **An IP allowlist** — rejected: MSG91 publishes no source IPs, and behind the proxy the client address is caller-supplied.
- **Keep the phone number and compare it with the send's number** — rejected: one KMS-backed hash per report (and the global audit
  lock in the api) for a check that is not needed when the id is ours.
- **Match on MSG91's request id only** — rejected: four new indexes, a four-table scan, and reports for lost request ids stay
  unmatched.
- **Write the delivery state onto the send tables** — rejected: those tables are frozen by design (migrations 0155, 0166 and the
  narrowed grants of 0128 / 0138); one new table holds the fact in one shape.
- **Refuse to start the api when the token cannot be read** — rejected: in the Dokploy deployment (`restart: unless-stopped`) a
  refusal is a restart loop of every route, for one webhook.
- **Pull MSG91's report-log API instead of (or as well as) the webhook** — deferred, not rejected: it needs an outbound MSG91 call
  and a key scope. Trigger: Row 33 (e) observes a pause, or the silence alarm fires in production.

## Consequences

- **Operational.** Roster Row 33 (`sms-delivery-reports-provisioned`) carries the provisioning, in order: this ADR ratified; the
  staging login-code proof from the build that adds the CRQID (Row 33 (b0)); the token secret or secrets set; the Cloudflare skip
  applied (and whether Bot Fight Mode is on recorded); MSG91's retry, timeout and automatic-pause rules confirmed in writing or
  observed (Row 33 (c2)); the two webhooks created in MSG91's panel ("On Report Received" and "API Failed Events") with the header and
  the seven-field payload template; the CRQID echo proven on a real report (Row 33 (e0)); each arriving report kind stored without a phone number (Row 33 (e)); the
  silence alarm reaching a named person; and the row closed before any claim-text template id is provisioned (Row 33 (g)).
  Every rotation step is an api restart.
- **Security.** The webhook is authenticated by a static bearer-style secret, not a signature: anyone who holds the token can post a
  report. **The forgery bound** (holds under PQ1 options A, B1 and B2): a report can only SUBTRACT reach, never add it — `accepted`
  already counts, and a `delivered` report adds nothing. A forged "not delivered" report can therefore never cause a claim to be
  closed. ⚠ Under PQ1 option C (only a delivered report counts) this bound FAILS: a forged or mistaken "delivered" report would ADD
  reach and could let a closure be requested — option C would need an amendment to this ADR (a stronger authentication or a
  cross-check) before it is built. If the Panel adopts PQ1 option B1,
  a forged report could, for one person: delay their closure, make them eligible for a posted letter for the rest of that number's
  life in the chase, and send their closure notice by letter instead of by text (and start the District Admin's letter reminders).
  A leaked token is rotated as above.
- **Performance / cost.** One insert per report on the api; one primary-key lookup and one upsert per report in jobs. No per-request
  secret read.
- **Failure modes accepted.**
  - **Silence.** A report that never comes (a paused webhook, an account fault MSG91 never reports, a dropped CRQID) leaves the send
    `accepted`. A daily alarm counts accepted SMS sends 48 hours to 7 days old with no report.
  - **A boot-time Secret Manager outage** disables the webhook until the next restart; every report is then answered 403, which
    counts toward MSG91's automatic pause. The silence alarm is the detector.
  - **The rate limit is keyed on a caller-supplied IP** (the proxy trusts `X-Forwarded-For`), so someone who knows MSG91's egress
    address could use up its quota and cause 429s, which may count toward the pause. The limit is provisional and is not proof that
    MSG91 will never pause the webhook.
  - **A malformed `Content-Type` header** is answered 415 by the framework before the handler runs.
  - **The CRQID placement inside the recipient** follows MSG91's only Flow sample; until a real report shows it (Row 33 (e0)), every
    report could arrive without it — loudly (an unmatched-report alarm per report), and in the safe direction (nothing is
    un-counted).
  - **Same-key duplicates.** If MSG91 sent the same status twice for one request with a different failure reason or delivery time,
    only the first is kept.
  - Every alarm reaches the logs only until `onAlarm` is wired to a named person (roster Row 32 (h)).
- **Migration / pivot.** If MSG91 adds request signing, a successor ADR adds signature verification ahead of the header check and
  restores §3.11 step 1. A new gateway is a new adapter and a new ingress route; the inbox and `sms_send_deliveries` are
  gateway-neutral apart from the request-id format.

## References

- [Source: `.decision-log.md`, Decision 2026-10-17-347] — Story 6.37b's build decisions (DR1–DR14, DR5-G)
- [Source: `.decision-log.md`, Decision 2026-10-17-345] — MG1 (a), this row's charter
- [Source: `.decision-log.md`, Decision 2026-09-27-252] — cl.1–cl.3 (Trustee-ratified; cl.3 as intent only)
- [Source: `.decision-log.md`, Decision 2026-10-12-323] — R2 (the accepted delivery-report gap)
- [Source: architecture.md §3.11, lines 2572-2585] — webhook ingress (verify, persist, ACK, return)
- [Source: architecture.md §5.9, lines 3520-3531] — webhook signing secrets and the dual-secret window
- [Source: architecture.md, lines 3492-3493] — the edge's "Ingress signature verification"
- [Source: epics.md, Story 6.37b] — owning Story
- [Source: `docs/launch-gate-inventory/inventory-roster.md`, Rows 30, 32, 33] — the go-live gates
- [Source: `docs/knowledge-transfer/adr-index.md`] — the live index row
- [Source: `docs/adr/ADR-0029-whatsapp-webhook-ingress-and-opt-in-lifecycle.md`] — the signed-webhook precedent this ADR deviates from
- [Source: `docs/adr/ADR-0041-sms-gateway-msg91.md`] — the MSG91 send path
- [Source: https://msg91.com/help/webhook-new/how-to-receive-sms-delivery-reports-via-webhook-new; https://msg91.com/help/webhooks/webhook-auto-pause-simple-explanation; https://msg91.com/help/webhooks/how-can-i-get-the-delivery-reports-on-my-webhook-url] — read 2026-10-17
- Memory: [[feedback_architecture_vs_adr_boundary]] — discipline anchor

---

## Changelog

| Date | Status flip | Author | Notes |
|---|---|---|---|
| 2026-10-17 | (initial draft) | BigDev (Solo Builder) | Authored under Story 6.37b Task 0.4 (Decision `2026-10-17-347`) |
