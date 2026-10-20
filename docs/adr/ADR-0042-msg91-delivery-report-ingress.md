# ADR-0042: MSG91 delivery-report ingress — a static-header webhook (MSG91 offers no signature), a global inbox that keeps no phone number, and correlation by our own row id

> **Status:** ratified
> **Date:** 2026-10-18 (date entered current status)
> **Author:** BigDev (Solo Builder)
> **Ratifying trustees:** Dhiraj Rahul (Trustee 1) + Kalpana Bharti (Trustee 2) — 2026-10-18; logged in `.decision-log.md` Decision `2026-10-18-358`
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
- **The edge bar, too (DR14 (c)).** The edge capability reads *"Ingress signature verification — verifies inbound traffic origin
  before passing to backend (§3.11 webhook persist + ack assumes verified ingress)"* (`architecture.md:3492-3493`). Read against this
  route: (1) this repo expresses the bar as the edge-auth header — `infra/cloudflare/README.md`'s capability table maps it to
  *"`origin-ingress.tf` header + a vendor-neutral origin guard (behind edge)"*, i.e. proof that a request transited Cloudflare — and
  the skip rule below skips no phase but Super Bot Fight Mode's — ⛔ that `http_request_late_transform` ruleset — so this path
  keeps whatever that leg gives every route (whether the origin guard is live is Story 1.15's, ⛔ checked here); (2) the bar's own
  parenthetical ties it to §3.11's verified webhook ingress — the PROVIDER's origin — and for MSG91 nothing can verify that, at the
  edge or in the api: no signature exists to verify (no HMAC, no secret — the deciding fact above) and no source-IP list is published.
  ⇒ This ADR DOES depart from the edge bar as it applies to webhooks, not only from §3.11 step 1: the static header proves only that
  the caller holds the token. Accepted as this ADR's recorded deviation, with the same successor-ADR trigger (MSG91 adds signing —
  Consequences, Migration / pivot).
- **Why reports matter.** At send time MSG91 answers `success` even to a fake key (Story 6.37 F9), so `accepted` means "MSG91 took
  the request", not "the phone received it". Whether the Trust may use a reported failure to change what counts as "reached" before a
  claim is closed for silence was the Trustee Panel's question PQ1 (routing note
  `trustee-panel-routing-note-2026-10-17-6-37b-reported-undelivered.md`). It is ruled: B1 — a reminder concluded "not delivered" no
  longer counts as reaching the person, who is offered the letter route — but only after a delivery ladder
  ([`-350`](../../.decision-log.md#decision-2026-10-17-350); its follow-ups [`-351`](../../.decision-log.md#decision-2026-10-17-351)).
  That conclusion and the ladder moved to sprint row `6-37c-undelivered-reminder-ladder`
  ([`-353`](../../.decision-log.md#decision-2026-10-17-353)); Story 6.37b receives and records reports only, and this ADR covers only
  how the reports arrive and are stored.
- **Provider behaviour that shapes the design** (MSG91's help pages, read 2026-10-17): failed POSTs are retried (30 s up to 30 min);
  the webhook is PAUSED automatically when more than 2 % of at least 10 requests finally fail; MSG91 expects an answer within 5–8 s;
  duplicates are expected (*"you may receive multiple callbacks"*); every value is a JSON string.
- **Edge.** Cloudflare challenges automated traffic (`browser_check`, the security level, free-plan Bot Fight Mode). A challenged
  POST is not a clean 200, so MSG91 would retry and then pause the webhook — silently. Free-plan Bot Fight Mode cannot be skipped by
  any rule (only the paid-plan Super Bot Fight Mode phase can).
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
  never the URL, because Traefik logs the query string. A token is usable when, trimmed, it is at least 32 characters — ⚠ and, as
  built after code review round 2, only printable ASCII (space included; else the class `not_header_safe` — a token MSG91's header
  could never match), a narrowing of `-347` DR1 recorded by [`-354`](../../.decision-log.md#decision-2026-10-18-354) decision 1 (iii). Both tokens
  are read once at boot. A wrong or missing header is `403 webhook.signature_rejected` and nothing is written.
- **When a secret cannot be used, the api still starts.** Current name unset ⇒ the webhook is disabled (403 to every request; one
  production warning). Current name set but unreadable, blank or too short ⇒ disabled, one error line naming the secret. Current
  usable and next broken ⇒ the webhook accepts the current token only, one error line naming the next secret. No line ever carries a
  value. Each state lasts until the next restart.
- **Rotation (the §5.9 dual-secret window).** Set the next token in Secret Manager and restart (both tokens are now
  accepted); change the header value in MSG91's panel to the next token; promote it to the current token and restart; clear the next
  token and restart. Each step is a restart.
- **Persist-then-acknowledge.** The handler parses the body itself (every content type is read as raw bytes in the route's own
  scope, so no content type is refused before authentication), keeps exactly seven columns per report — six of MSG91's fields
  (request id, CRQID, status code, event name, failure reason, delivery time) and our own receive time — inserts one
  row per report into the global inbox `sms_delivery_report_inbox`, commits, and only then answers `200 {received:true}`.
  **The failure reason** is masked BEFORE its 200-character cut: any run of seven or more numerals of any script (`\p{N}`),
  contiguous or with one to three characters that are neither letters nor numerals between each pair, becomes `#` — a DELIBERATE
  over-mask (a seven-digit timestamp in the text is masked too). **The delivery time** is kept as MSG91's raw text ONLY when it has a
  timestamp shape (`YYYY-MM-DD[ T]HH:MM[:SS[.f]][Z|±HH[:]MM]`), else NULL. Forward migration 0168 (code review round 2) mirrors both
  as DB CHECKs — the delivery-time shape on the inbox, and the separated-number rule on `failure_reason` on both tables (ASCII
  digits and an explicit ASCII separator class — deliberately NARROWER than the handler's, so a masked value never fails the
  INSERT) — and narrows `twt_app`'s INSERT on the inbox to the six projection columns. A failed
  commit is a 5xx so MSG91 retries. A parse error is caught and never logged (its message can quote the body). A body with no usable
  report is `200` plus one log line, because a 4xx would count toward the automatic pause. No KMS, Secret Manager or outbound call is
  made per request.
- **No phone number.** MSG91's payload template omits the phone number, sender id, credit, user id and DLT id, and the handler drops
  them if they arrive. The inbox therefore holds no personal data by design and has no Pariwar column (MSG91 is one global account);
  its row-security policies are `USING (true)` per granted command, the global-table shape of migration 0049. ⚠ One residual:
  `request_id` (`^[A-Za-z0-9]{1,64}$`, generated by MSG91) is ⛔ masked and can hold an all-digit value — MSG91 sets it, but a
  mis-mapped panel template could put a number (a phone number) there; only Row 33 (d)'s template check guards it.
- **Deduplication.** Two reports are duplicates when they share the request id, the CRQID and the status code; the first is kept.
- **Correlation by our own id.** Every send carries `CRQID` = a kind prefix (`cr`, `ce`, `sn`, `pm`, or `ot` for a login code) plus
  the send row's uuid, inside the single recipient object of the Flow request. A report is matched by one primary-key lookup — no
  index is added to any send table. A report whose MSG91 request id was lost (a timeout after acceptance, a retry) still finds its
  row, and is DETECTED, ⛔ matched: when the send row's recorded request id is NULL or different, the report is settled
  `other_attempt` with a `second_request_for_one_send` alarm and records NO delivery state (DR6 row 7). The result of a match is
  written to a new Pariwar-scoped table `sms_send_deliveries`; the four send tables are never written.
- **The correlator** is a pg-boss job every minute that leases up to 200 due inbox rows —
  `WITH due AS MATERIALIZED (SELECT … LIMIT n FOR UPDATE SKIP LOCKED) UPDATE … FROM due`, so the due set is evaluated once (the
  first shape, `UPDATE … WHERE id IN (SELECT … LIMIT n … SKIP LOCKED)`, over-claimed under a Nested Loop Semi Join plan: `LIMIT 2`
  leased 40 of 40 due rows on :5433 — fixed in code review round 2) — and settles each in its own transaction by compare-and-set — at
  least once, never counted twice.
- **The edge.** A Cloudflare skip rule for exactly this path and `POST`, placed directly after the app-link verification rule,
  skipping the browser integrity check, the security level, Super Bot Fight Mode (the `http_request_sbfm` phase — a paid-plan phase)
  and the rest of the current custom ruleset. ⛔ Skipped: free-plan Bot Fight Mode (no rule can skip it — Row 33 (c) records whether
  it is on), the managed rules and the `http_ratelimit` phase. Authentication stays in the api; the skip is not trust.
- **Rate limit.** The route has its own limit, provisionally 1,200 requests per minute, which replaces the global 300 per minute for
  this route.

## Alternatives considered

- **A secret path segment in the URL** — rejected: Traefik's access log records the full request path and query.
- **An IP allowlist** — rejected: MSG91 publishes no source IPs, and behind the proxy the client address is caller-supplied.
- **Keep the phone number and compare it with the send's number** — rejected: one KMS-backed hash per report (and the global audit
  lock in the api) for a check that is not needed when the id is ours.
- **Match on MSG91's request id only** — rejected: four new indexes, a four-table scan, and a report for a lost request id would find
  no row at all — undetected. Under the built design such a report is detected (settled `other_attempt`, alarmed) but records no
  delivery state either: the gain is detection, ⛔ recording.
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
  the six-field payload template (request id, CRQID, status, event name, failure reason, delivery time — the seventh stored column,
  `received_at`, is our own clock); the CRQID echo proven on a real report (Row 33 (e0)); each arriving report kind stored without a phone number (Row 33 (e)); the
  silence alarm reaching a named person; and the row closed before any claim-text template id is provisioned (Row 33 (g)) — and, by
  [`-353`](../../.decision-log.md#decision-2026-10-17-353) decision 3, no claim-text template id (1–14) until row
  `6-37c-undelivered-reminder-ladder` is `done` too. Every rotation step is an api restart.
- **Security.** The webhook is authenticated by a static bearer-style secret, not a signature: anyone who holds the token can post a
  report. **The forgery bound holds for Story 6.37b AS BUILT:** reports are recorded (`sms_send_deliveries`, the inbox, the alarms)
  and no send, count of reach, closure or letter reads them — *"recording reports changes nothing a person receives"*
  ([`-353`](../../.decision-log.md#decision-2026-10-17-353) decision 2) — so a forged report can change only the record and raise
  alarms.
  ⚠ **Under the delivery ladder as ruled (row `6-37c-undelivered-reminder-ladder`) the bound must be RESTATED — an OPEN item.**
  Relative to today (no report at all), a forged report still can never make a person count as reached who would not count today:
  `accepted` already counts, and [`-351`](../../.decision-log.md#decision-2026-10-17-351) ruling 4 A's *"any message to that person
  that IS delivered — a later reminder or a ladder step, on either channel — ends it, and the person counts as reached"* returns
  the person to today's state (row 6-37c's own I1 says the same — *"⛔ worse than today"*). But relative to a GENUINE failure report
  two new effects exist: (i) a forged `delivered` can END a ladder the network's real failure started — cancelling the protection the
  Panel ruled for a person never reached (our reading: their closure for silence is then no longer held by a running ladder, `-351`
  ruling 6 A — *"a claim cannot be closed for silence while a ladder for any of its people is still running"*); (ii) a forged
  `undelivered` STARTS the ladder's fan-out ([`-350`](../../.decision-log.md#decision-2026-10-17-350) ruling 2, `-351` ruling 1 A) —
  WhatsApp, further SMS and a call or letter to the claimant and the nominee ([`-352`](../../.decision-log.md#decision-2026-10-17-352)
  Q2). And B1 (`-350` ruling 1) brings back the effects this ADR first recorded for it: a forged report could, for one person, delay
  their closure, make them eligible for a posted letter for the rest of that number's life in the chase, and send their closure notice
  by letter instead of by text (and start the District Admin's letter reminders). ⇒ Row 6-37c restates this bound in this ADR (a dated
  note — its Task 0.4 plans one) and decides whether the static token is still enough, BEFORE it builds the ladder and before Row 33
  (a) ratifies this text. ⛔ Closed — an OPEN item, carried in `deferred-work.md` (code review round 2 of 6-37b). A leaked token is
  rotated as above.
  ⚠ **Dated note, 2026-10-18 ([Decision 2026-10-18-355](../../.decision-log.md#decision-2026-10-18-355) decision 15 — no word above
  rewritten):** **the bound RESTATED for the ladder, and the token decided.** Relative to TODAY (no report at all), a forged report still
  never makes a person count as reached who would not count today. Relative to a GENUINE failure report: (i) a forged `delivered` ends
  that person's ladder and its closure hold (`-351` ruling 6 A); (ii) a forged `undelivered` starts up to two more copies of an approved
  reminder (no WhatsApp — row 6-37c skips that step), an about-eight-day closure hold and a call-or-letter ask to the District Admin,
  and, on conclusion, un-counts that reminder (closure `not_reached` until a letter's delivery or a reached call is recorded), makes the
  person letter-eligible for that number for good and sends their closure notice by letter. Both are bounded PER PERSON: one ladder at a
  time, no new ladder after a conclusion on that number, and a start-burst alarm (≥ 3 ladders in one Pariwar on one day) — which
  reaches the logs only until roster Row 32 (h). **The static header token is KEPT** (option (a)): MSG91 signs no report and publishes
  no source IPs (the deciding fact above), so no stronger ingress authentication is available from it; a status-pull cross-check is
  unverified and not adopted. Cost, accepted: a leaked token lets its holder end a real failure's protection for the persons they target
  until the token is rotated. The deferred item's ADR half is addressed by this note; the consent sheet §1–§2 is revised in the same
  commit.
  ⚠ **Dated note, 2026-10-20 (Story 6.37d — [Decision 2026-10-20-367](../../.decision-log.md#decision-2026-10-20-367) WS14; no word
  above rewritten):** **the bound as restated above (and ratified with this ADR by `-358`) WIDENS** now that the claimant's WhatsApp step
  is built — a consequence of [`-350`](../../.decision-log.md#decision-2026-10-17-350) ruling 2 (1), ⛔ a new decision: a forged
  `undelivered` now ALSO sends at most ONE WhatsApp message to the CLAIMANT (⛔ a nominee — `-356`), about four hours after the forged
  text, between 9 am and 8 pm ([`-368`](../../.decision-log.md#decision-2026-10-20-368) Q1 A), and only where the claim's filing
  agreement on file is the new wording naming WhatsApp (`-357` G3), the Pariwar has WhatsApp switched on and its claim template
  provisioned (roster Row 36), and the number has not sent STOP. "(no WhatsApp — row 6-37c skips that step)" above is therefore no longer
  true once roster Row 36 closes. A forged `delivered` is unchanged; a DELIVERED WhatsApp now ALSO ends a ladder (`-351` 4 A) — that
  report is Meta's own signed webhook, ⛔ MSG91's. The per-person bounds stand (one ladder at a time; ⛔ a new ladder after a conclusion
  on that number; ONE WhatsApp per ladder, ever — a DB UNIQUE), and the start-burst alarm still bounds it WHICHEVER sweep starts the
  ladders: the new quarter-hourly WhatsApp sweep starts most ladders and runs the SAME start tail (6.37d AC4). The Panel was TOLD on
  2026-10-20 (a "told" item, ⛔ a ruling — `trustee-panel-told-2026-10-20-6-37d-whatsapp-and-forged-reports.md`, sent by BigDev). The deferred-work line on the forged report is annotated.
- **Performance / cost.** One insert per report on the api; one primary-key lookup and one upsert per report in jobs. No per-request
  secret read.
- **Failure modes accepted.**
  - **Silence.** A report that never comes (a paused webhook, an account fault MSG91 never reports, a dropped CRQID) leaves the send
    `accepted`. A daily jobs alarm counts accepted CLAIM-TEXT SMS sends (the four claim send tables) 48 hours to 7 days old with no
    report. ⚠ Login codes feed no alarm — their daily line is information only ([`-347`](../../.decision-log.md#decision-2026-10-17-347)
    decision 12) — so while only login codes flow (before Row 33 (g) and any claim-text template id), a paused webhook or a
    boot-time token outage has NO detector. A residual.
  - **A boot-time Secret Manager outage** disables the webhook until the next restart; every report is then answered 403, which
    counts toward MSG91's automatic pause. The silence alarm is the detector — once claim texts flow (above); the disabled-webhook
    boot line is the only signal before that.
  - **The rate limit is keyed on a caller-supplied IP** (the proxy trusts `X-Forwarded-For`), so someone who knows MSG91's egress
    address could use up its quota and cause 429s, which may count toward the pause. The limit is provisional and is not proof that
    MSG91 will never pause the webhook.
  - **A malformed `Content-Type` header** is answered 415 by the framework before the handler runs.
  - **The CRQID placement inside the recipient** follows MSG91's only Flow sample; until a real report shows it (Row 33 (e0)), every
    report could arrive without it — loudly (an unmatched-report alarm per report), and in the safe direction (nothing is
    un-counted).
  - **Same-key duplicates.** If MSG91 sent the same status twice for one request with a different failure reason or delivery time,
    only the first is kept.
  - **An RLS-bound jobs login.** The correlator's lookup and the silence count read the four claim send tables ACROSS Pariwars; under
    a login without BYPASSRLS (roster Row 26's leading option, `SET LOCAL ROLE twt_app`) both would see ⛔ row and fail silently, so
    the correlator refuses to run and the silence check skips its silence count (the login-code line, global, still logs), each with ONE
    `sms_report.rls_bound_role` alarm (code review round 2). ⇒ Row 26's decision must give them a
    cross-tenant path, or the paused-webhook detector stops (roster Row 26's dated note, 2026-10-18).
  - Every alarm — the silence alarm, the unmatched-report and `second_request_for_one_send` alarms included — reaches the logs only
    until `onAlarm` is wired to a named person (roster Row 32 (h)); until then a detector is a log line nobody is paged by.
- **Migration / pivot.** If MSG91 adds request signing, a successor ADR adds signature verification ahead of the header check and
  restores §3.11 step 1 and the edge bar's webhook reading (Context, "The edge bar, too"). A new gateway is a new adapter and a new ingress route; the inbox and `sms_send_deliveries` are
  gateway-neutral apart from the request-id format.

## References

- [Source: `.decision-log.md`, Decision 2026-10-17-347] — Story 6.37b's build decisions (DR1–DR14, DR5-G)
- [Source: `.decision-log.md`, Decision 2026-10-17-345] — MG1 (a), this row's charter
- [Source: `.decision-log.md`, Decisions 2026-10-17-350, -351] — PQ1 ruled B1 after a delivery ladder; the ladder's follow-ups (Trustee-ratified)
- [Source: `.decision-log.md`, Decision 2026-10-17-352] — WhatsApp and calls to the claimant and the nominee (Trustee-ratified)
- [Source: `.decision-log.md`, Decision 2026-10-17-353] — the split: the conclusion and the ladder move to row 6-37c; the claim-text gate
- [Source: `.decision-log.md`, Decision 2026-09-27-252] — cl.1–cl.3 (Trustee-ratified; cl.3 as intent only)
- [Source: `.decision-log.md`, Decision 2026-10-12-323] — R2 (the accepted delivery-report gap)
- [Source: architecture.md §3.11, lines 2572-2585] — webhook ingress (verify, persist, ACK, return)
- [Source: architecture.md §5.9, lines 3520-3531] — webhook signing secrets and the dual-secret window
- [Source: architecture.md, lines 3492-3493] — the edge's "Ingress signature verification"
- [Source: `infra/cloudflare/README.md` (the §5.8a capability table); `infra/cloudflare/origin-ingress.tf`] — how this repo expresses that edge bar
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
| 2026-10-18 | (draft — amended) | BigDev (Solo Builder) | Story 6.37b code review round 2 — the body corrected (status stays `drafted`): (1) PQ1 is no longer open — ruled B1 after a delivery ladder (`-350`, `-351`), that work moved to row `6-37c-undelivered-reminder-ladder` (`-353`); the "is the Trustee Panel's question PQ1" and "If the Panel adopts PQ1 option B1" framings replaced; (2) the forgery bound restated — it holds for 6.37b AS BUILT (`-353` decision 2: *"recording reports changes nothing a person receives"*); under the ladder as ruled for 6-37c it must be RESTATED: relative to today (no report) a forged report still never makes a person count as reached who would not count today (row 6-37c's own I1 agrees), but relative to a GENUINE failure report a forged `delivered` can end its ladder (our reading of `-351` 6 A: the closure is then no longer held) and a forged `undelivered` starts the WhatsApp / SMS / call fan-out to the claimant and the nominee; B1's three effects (`-350` ruling 1) restored — 6-37c restates it in this ADR (or adopts stronger ingress authentication) at its Task 0, before building the ladder and before Row 33 (a): an OPEN item, ⛔ closed; the PQ1 option A / B1 / B2 / C reading removed; (3) the failure-reason mask as built (round 1 F1: any ≥ 7 numerals of any script, contiguous or 1–3-character separated, masked before the 200 cut — a DELIBERATE over-mask; the earlier "digit runs of seven or more" was too narrow); (4) the delivery-time grammar (round 2: a timestamp shape or NULL — the earlier "raw text" kept anything) and migration 0168's CHECKs and narrowed inbox INSERT; (5) "the inbox holds no personal data" qualified by the `request_id` residual; (6) the lost-request-id wording — DETECTED (`other_attempt`, `second_request_for_one_send` alarm, no delivery state — DR6 row 7), ⛔ "still finds its row" read as matched; the request-id-only alternative's reason restated accordingly; (7) free-plan Bot Fight Mode is ⛔ skippable (only the paid-plan SBFM phase is); the managed rules and `http_ratelimit` phase are ⛔ skipped; (8) the silence alarm counts claim-text sends only — while only login codes flow a paused webhook or a boot-time token outage has ⛔ detector (a residual); every alarm logs-only until Row 32 (h); (9) DR14 (c)'s owed conclusion added — the static header DOES depart from the edge's "Ingress signature verification" bar as it applies to webhooks (no signature exists to verify), accepted here with the same successor trigger; the repo's edge-auth-header expression of that bar is ⛔ skipped for this path; (10) the correlator's claim as fixed in round 2 (a `MATERIALIZED` CTE — the `IN (… LIMIT … SKIP LOCKED)` shape over-claimed); (11) the payload template is SIX MSG91 fields (`received_at` is our clock), and `-353` decision 3's claim-text gate added to Consequences; References gain `-350`–`-353` and the Cloudflare README; (12) the token rule's printable-ASCII class (`not_header_safe`) — a `-347` DR1 narrowing — recorded by `-354` decision 1 (iii); (13) the RLS-bound-login failure mode (`sms_report.rls_bound_role`; Row 26's dated note) |
| 2026-10-18 | (draft — amended) | BigDev (Solo Builder) | [`-354`](../../.decision-log.md#decision-2026-10-18-354) recorded the five `-347` narrowings this ADR describes (the token's printable-ASCII class, the delivery-time grammar and the wider mask, the inbox INSERT limited to the projection, the `first_reported_at` UPDATE grant, the 5-attempt / 72 h give-up) — the "pending its decision entry" wording replaced; ⛔ a change of substance |
| 2026-10-18 | drafted → ratified | Dhiraj Rahul + Kalpana Bharti | Ratified at the 2026-10-18 Trustee Panel session (Panel pack item 2; consent sheet `adr-ratification-consent-sheet-2026-10-17.md`, revised before presentation); logged in Decision `2026-10-18-358`. No amendments, no conditions. The departure from architecture §3.11 step 1 and from the edge's "Ingress signature verification" bar accepted, with the §3.11 pointer applied; the forgery bound as restated (2026-10-18 dated note) ratified with it. |
