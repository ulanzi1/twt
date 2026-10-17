---
baseline_commit: dae96d9b
---

<!--
PINNED: `dae96d9b` (2026-10-17 — `main` == `origin/main` after a fresh `git fetch`; Story 6.37 `done`). Every `file:NNN` below is AS
OF that sha; Task 0.1 re-checks what moved. Built in its OWN worktree `.claude/worktrees/6-37b`, branch
`story/6-37b-msg91-delivery-reports` ([[feedback_commit_on_story_branch]], [[feedback_shared_tree_branch_switch]]). ⚠ A peer worktree
`.claude/worktrees/6-31` (row 6-31, `backlog`, also at `dae96d9b`) may want migration 0167 and decision id `-347` too (T9).

STATUS: `ready-for-dev` — buildable AFTER Task 0 (DR1–DR14 answered by BigDev, ONE author-commit ALONE; the two routing notes
written). ⛔ No code before that ([[feedback_governance_commits_precede_implementation]]). ⭐ Task 7 (the D22 change) waits for the
Panel's ruling on PQ1 — Tasks 1–6 do ⛔ (DR14).

§0 GATE (the routing template's): every DR below is the AUTHOR's — how a provider callback is authenticated, what is kept of it, how
it is matched to a send, where the result is stored, how long the inbox lives (`-314` §0: *"which vendor carries the texts … ⛔ who
is texted, ⛔ when"*). ⭐ TWO questions are the PANEL's, routed by Task 0.3 and ⛔ settled here:
**PQ1** — does a send the network REPORTS it could not deliver still count as "reached" before a claim is closed for silence, and
does it make the person letter-eligible (`-252` cl.1 / cl.2 — Trustee-ratified; `-345` §0 (1), MG1, Consequence 4)? — it changes WHEN
a family's claim can be closed and WHO is offered a letter ⇒ "what the Trust OWES a family" + a ratified clause matched or narrowed
(the template's §0). **PQ2** — whether a PROVEN content mismatch
should REFUSE a correction / closure / certificate text (`-345` §0 / Consequence 3; roster Row 32 note (6.4): *"ask it with row
6-37b's create-story"*) — refusing a text changes WHO is texted (`-322` §0 option (a)). ⚠ Both read verbatim below
([[feedback_panel_gate_read_ratified_verbatim]]). ⚠ Kept OUT of the Panel (the author's, each because it changes ⛔ nothing a person
receives or is owed): recording reports; matching them; the OTP tag (DR11); showing nothing new to staff (DR13).

GLYPH REGISTER: `⛔` negates the word it precedes; `⭐` emphasis / action; `⚠` a hazard. ⛔ No `file:NNN` into `.decision-log.md`,
`deferred-work.md` or `sprint-status.yaml` (newest-first files) — cite the decision id, the item's phrase, or the row key.

LETTERS: F = found facts (F1–F24); DR = build decisions (DR1–DR14 — PROPOSED, ⏳ BigDev at Task 0.2); PQ = Panel questions (PQ1–PQ2 —
routed, ⛔ answered); I = invariants (I1–I9); T = traps (T1–T19). Decision-entry letters stay the entry's own (`-345` MG1–MG17,
`-252` cl.1–cl.3, `-323` R2).
-->

# Story 6.37b: The Trust learns whether each text actually arrived — MSG91's delivery reports, received, kept without the phone number, matched to the exact send, and (once the Panel rules) a text the network reports undelivered no longer counts as "reached" `[PRIMITIVE]`

Status: ready-for-dev

> ⭐⭐ **WHAT THIS STORY IS, IN ONE PARAGRAPH.** Story 6.37 sends every SMS through MSG91, but MSG91's answer at send time is only
> *"request received"* — HTTP 200 `type:"success"` even for a fake key (6.37 F9). Whether the operator delivered the text arrives
> LATER, as a **delivery report** POSTed to a webhook we configure in MSG91's panel (F1–F8). Today ⛔ report is received, so a text
> DLT scrubbed, an operator refused, or a switched-off phone never got is recorded `accepted` — and on the correction chase 6.19c's D22
> `reachedBySms` counts the family REACHED, the input of the Trustee-ratified `-252` closure-for-silence (`-323` R2, `-345` MG15). This
> story: (1) tags every send with a **correlation id** (`CRQID` = a kind prefix + the send row's own id — DR3) that MSG91 echoes back;
> (2) adds a public **webhook** in `apps/api` that checks a static secret header (MSG91 has ⛔ signature — F4), keeps ONLY an
> allowlisted projection of each report (⛔ the phone number — DR2), and ACKs (persist-then-ack, architecture §3.11); (3) a **jobs
> correlator** that matches each report to its send row and records `delivered` / `undelivered` in ONE new table (⛔ a write to the
> five frozen send tables — I2); (4) a **silence alarm** for a paused webhook; and (5) — ⭐ only after the Panel rules on PQ1 — the
> one-line D22 change. It also lands ADR-0042 (the webhook's deviation from §3.11's "verify the signature"), roster Row 33 (the
> webhook provisioned), and the `epics.md` entry. ⛔ No text's wording changes; ⛔ no template is provisioned; ⛔ who is texted or when
> changes before PQ1's ruling.

> **What already ships and this story READS — rebuild ⛔ none of it:**
> - The MSG91 Flow client `packages/channels/src/providers/sms-app.ts` — `buildFlowBody` (`:303-308`, today *"⛔ `CRQID`"*), the 24-hex
>   template id, the `≤ 64 [A-Za-z0-9]` request id (`:191`, `:399-406`), `redirect: 'error'`, the 9 s signal.
> - The send core `apps/jobs/src/scheduler/claim-dlt-sms-send.ts` `sendClaimDltSms` (`:230-238` overloads; `ClaimDltSmsInput` `:111-133`)
>   and its five callers — correction reminder (`claim-correction-reminders.ts:430` via `sendClaimCorrectionSms` `:224-246`), closure
>   notice (`claim-correction-closure.ts:371`), certificate reminder (`claim-certificate-reminders.ts:658`), suspicion notice
>   (`claim-suspicion-notices.ts:457`), peer-mesh request (`claim-peer-mesh-requests.ts:689`). Each already holds its row id at send
>   time (`begun.reminderId`, `begun.noticeId`, `pingId`).
> - The OTP adapter `apps/api/src/modules/auth/shared/sms-step-up-delivery.ts` (returns `gatewayMessageId`, `:203-216` — ⛔ read by any caller).
> - The house static-header webhook: `receiveTelegram` (`apps/api/src/modules/channel-webhooks/handlers.ts:137-179`) — timing-safe
>   compare, persist on a tx, `200 {received:true}`; the module's raw-body parser (`channel-webhooks/routes.ts:31-38`, `index.ts:19-21`).
> - The global-table RLS shape `0049_sms-rate-buckets.sql` (`:34-40`; the policy `:40` `sms_rate_buckets_global_access … USING (true)`).
> - The pg-boss drain skeleton `apps/jobs/src/tg-webhook-processor.ts:386-431` (⚠ NOT its claim — T2); the daily prune
>   `apps/jobs/src/device-token-cleanup.ts` (registered `boot.ts:432`).
> - D22 `reachedBySms` — `packages/domain/src/claim/correction-closure.ts:373-375`; its reader `readReturnFamilyRows`
>   (`packages/domain/src/claim/correction-reminder-record.ts:604-640`).

## Story

As **the Trust**,
I want **every SMS the platform sends to carry an id MSG91 echoes back, and MSG91's delivery reports received, kept without the
phone number and matched to the exact send — and, once the Trustee Panel rules, a reminder the network reports it could not deliver
to no longer count as having reached the family**,
so that **a family's claim is never closed for their silence on the strength of a text that never arrived, and the Trust can see
when its texts are not getting through**.

## The rulings and records this story builds on

| Source | Key (verbatim, abridged) | Status |
|---|---|---|
| **`2026-10-17-345`** | MG1 (a): *"delivery reports go to a NEW row `6-37b-msg91-delivery-reports` (MSG91's webhook, an inbound table, correlation, delivery state on the five send tables, the OTP's gateway id, and the `-252` "reported failure" question — the Panel's). The deferred delivery-report item and the two at-least-once SMS items name 6-37b as their closer (⛔ closed)."* MG9: *"⛔ `CRQID` (6-37b decides correlation)"* (story file). MG14 (i) / X2: Row 32 (i). MG15: the residual *"stays the author's because Row 32 (i) keeps every claim-text template id unprovisioned until 6-37b exists"*. Consequence 4: *"6-37b's create-story inherits the `-252` "reported failure" question (the Panel's) and the at-least-once items."* | author-commit — THIS ROW's charter |
| `2026-10-17-346` | MG3 helpline exemption; MG7 unlisted code → status class; MG5 transient cached 60 s. Its Status's *"decisions 2 and 3 precede their code"* is WRONG (6.37 D1 correction) — *"the next decision entry that touches this story carries the same correction"*, plus the two dated `-346` §0 corrections (6.37 Debug Log (a), (p)). ⇒ this story's author-commit carries them (DR14 (c)). | author-commit |
| **`2026-09-27-252`** | cl.1 *"A closure may be **requested** only when, for **each** person who must be reached, ≥ 1 reminder was **accepted** by the network (or shown **delivered**, where a report exists) — **or** a posted letter has a **recorded delivery date**."* cl.2 *"A FAMILY NO CHANNEL CAN REACH IS OFFERED THE LETTER ROUTE — as for an invalid number."* cl.3 *"PROVEN DELIVERY (option B) MAY BE BUILT IN A FUTURE VERSION. ⛔ Not now."* Consequence 3: *"a delivery-report integration (SMS DLR; …) would need its own row."* ⚠ Our reading (⛔ ratified): the Panel chose cl.1 *"knowing 'accepted is not received'"*. | ⭐ **TRUSTEE-RATIFIED** (Dhiraj Rahul + Kalpana Bharti) |
| `2026-10-12-323` R2 | *"if it arrives only in an asynchronous delivery report (this repo consumes ⛔ delivery report), the send is recorded `accepted` and 6.19c's D22 `reachedBySms` counts the family REACHED … PRE-EXISTING for EVERY DLT rejection cause."* | author-commit (accepted cost) |
| `2026-10-10-314` | decision 2: *"… delivery-report correlation …"* (moved to this row by `-345` MG1). | author-commit |
| `2026-10-12-322` §0 | the rejected (a) / (c) *"would have changed WHO is texted or WHEN on the correction, closure and certificate paths — and through D22's `reachedBySms` the input of the Trustee-ratified `-252` closure-for-silence — and so would have been the Panel's"*. | author-commit |
| Roster Row 32 | (i) *"row `6-37b-msg91-delivery-reports` is `done` BEFORE ANY claim-text template id (templates 1–14) is provisioned — … this is what keeps `-345` MG15's reading of the Trustee-ratified `-252` cl.1 the author's (if this leg is ever dropped, that question is the Panel's)"*; note (2) *"check the balance and the key's rule BY EYE … until row 6-37b reports delivery"*; note (6.4) PQ2's carrier. | go-live gate — ⛔ a merge fence |
| ADR-0041 | `:81` *"Delivery reports are ⛔ consumed here — they are row `6-37b`"*; `:106-107` *"MSG91 has ⛔ request signature on its delivery webhooks (static headers only) — row 6-37b's concern."* | `drafted` |
| ADR-0029 | the WhatsApp webhook: per-Pariwar signed URL, persist-and-ack + pg-boss drain (§3.11). The precedent this story DEVIATES from (⛔ signature exists — DR1 / ADR-0042). | ratified |
| architecture §3.11 | *"1. **Verify** provider signature at handler entry … 2. **Persist** … 3. **ACK** … 4. **Return.** No business logic, no synchronous downstream calls"* (`architecture.md:2572-2585`); §5.9 *"Webhook signing secrets: rotated on a committed cadence; rotation coordinated with provider via dual-secret window"* (`:3520-3531`); edge *"Ingress signature verification"* (`:3492-3493`). | architecture |
| deferred-work | *"⛔ DLT send consumes a delivery report — a rejection seen only there is recorded `accepted` …"* (closer: 6-37b); *"At-least-once SMS (inherited from 6.19b)"*; *"⚠ At-least-once family SMS"*; *"MG5's content / DLT-id / `sms_type_needs_unicode` checks are alarm-only …"* (PQ2's second carrier). | open |

## ⭐ THE INVARIANTS

1. **I1 — A report can only SUBTRACT reach, never add it.** Every effect of a report on any predicate excludes a send from "reached";
   ⛔ a report ever makes a send count that did not count before (`accepted` already counts — a `delivered` report adds nothing to
   D22). ⇒ a forged report (anyone holding the header token) can at worst DELAY a closure — or, under PQ1 B1, start the letter track
   for one person — ⛔ cause a closure. Pinned by a test per reader.
2. **I2 — The four send tables (five send kinds) are ⛔ written by this story.** ⛔ `UPDATE` of `claim_correction_reminders` / `claim_certificate_reminders`
   / `claim_suspicion_notices` / `claim_peer_mesh_pings`; ⛔ change to their triggers (0155's finished-row freeze, 0166's
   `claim_peer_mesh_pings_guard_delivery`) or grants; `delivered_at` (0128 / 0138) stays NULL (DR5). Proof: `git diff --stat main -- 'packages/domain/migrations/0054*'
   'packages/domain/migrations/0128*' 'packages/domain/migrations/0135*' 'packages/domain/migrations/0138*'
   'packages/domain/migrations/0141*' 'packages/domain/migrations/0151*' 'packages/domain/migrations/0155*'
   'packages/domain/migrations/0156*' 'packages/domain/migrations/0166*'` EMPTY (quoted — zsh), and 0167 names ⛔ send table (⛔ index
   is needed — DR3).
3. **I3 — ⛔ phone number from a report is stored, logged or alarmed.** The handler persists an ALLOWLISTED projection (DR2) — ⛔ the
   raw body, ⛔ `telNum`, ⛔ `senderId`, ⛔ `credit`, ⛔ `userId`, ⛔ `DLT_TE_ID`. A test posts a body carrying `telNum` and asserts no
   column, log line or alarm holds it (a recorder on the logger).
4. **I4 — Persist-then-ack, nothing else in the handler** (§3.11): verify the header → insert ONE projected row per report (`ON
   CONFLICT DO NOTHING`) → COMMIT → `200`. ⛔ correlation, ⛔ KMS, ⛔ Secret Manager call per request (the token is resolved at boot), ⛔
   an outbound call. A duplicate is a `200` no-op.
5. **I5 — The token rides in a HEADER, never the URL** (Traefik logs the query string — `infra/dokploy/README.md:79-82`), compared
   timing-safe (`timingSafeEqualString`, `channel-webhooks/signature.ts:45-50`), resolved ONCE at boot (DR1).
6. **I6 — `undelivered` is absorbing per send, and follows the send's RECORDED request id only** (DR6). A report for another attempt
   of the same row (the may-have-sent retry) is recorded as such and ⛔ moves the row's state.
7. **I7 — D22 is ⛔ changed until the Panel rules on PQ1** (Task 7 gated). Tasks 1–6 change ⛔ who is texted, when, or what counts.
8. **I8 — One seam.** `ChannelProvider`, `RenderedMessage`, `dispatch`, `cascade`, `render` ⛔ edited — EMPTY `git diff --stat main --
   packages/channels/src/{provider,dispatch,cascade,render}.ts` (6.37 I2's proof). The correlation id is bound per send in
   `SmsProviderDeps` exactly as 6.37's `values` are (`sms-dlt.ts`).
9. **I9 — Tests never touch MSG91** (6.37 T1, inherited): inject `fetch`; a global-fetch RECORDER at ZERO calls; ⛔ a real webhook is
   configured from dev or CI.

## 📜 Policy meaning (AI-10-1)

**This story CHANGES predicates that gate a family's benefit — in Task 7 only, and only as the Panel rules on PQ1**: D22
`reachedBySms` (`correction-closure.ts:373-375`) — the input of the Trustee-ratified `-252` closure-for-silence — AND, under our
reading, the dead-number facts that make a person LETTER-ELIGIBLE (D20 / D31, `correction-letter.ts:4-5`; `numberKnownDead`
`correction-closure.ts:378-382`; the queue status `correction-chase-read.ts:120-128`). Under our reading (PQ1 option **B1**) a reminder
REPORTED undelivered is treated, by every one of those readers, as a reminder the network REFUSED at send (`rejected_unreachable`).
In the family's terms: ⭐ *"a reminder the phone network reported it could not deliver to you is treated like one the network
refused: it no longer counts as having reached you — so your claim cannot be closed for your silence on the strength of it — and the
District Admin is offered the posted letter for you instead."* Its cost to the family: their closure ground is harder to meet and a
letter may be posted where one later text would have got through (a phone switched off for a day reads as unreachable) — SLOWER,
⛔ worse for them. ⚠ Without the letter half (option **B2**) a person whose reminders are all reported undelivered is ⛔ reached AND ⛔
letter-eligible (letter-eligibility needs a SEND-time dead outcome today) ⇒ their claim can never be closed for silence — the cost the
Panel REJECTED in 2026-09 (the 6.19 note's option B: *"the claim waits forever again"*) and against cl.2 (*"A FAMILY NO CHANNEL CAN
REACH IS OFFERED THE LETTER ROUTE"*). ⚠ Neither means *"a text with no report is not reached"* — silence (a paused webhook, a report
that never comes) still counts as `accepted` (DR12 alarms it; the residual PQ1 names). Tasks 1–6 introduce ⛔ predicate and change ⛔
predicate: they record.
**Niyamavali check:** ⛔ applicable — the Niyamavali does not speak to how a reminder is proven delivered; and it is ⛔ ratified
([[feedback_niyamavali_rulebook_not_spec]]). ⚠ Checked against `-252` cl.1 VERBATIM — *"accepted by the network (or shown delivered,
where a report exists)"* — which bears TWO readings: (i) silent on a reminder accepted and then reported failed ⇒ B NARROWS cl.1; (ii)
*"where a report exists"* sets the DELIVERED bar wherever a report exists ⇒ B MATCHES cl.1 (and a reported failure was never
"reached"). Which reading is right is the Panel's ⇒ PQ1 states both (match / narrow for each), ⛔ our call. The letter half reads
cl.2 (*"as for an invalid number"*) — MATCHES under either reading.

## ⭐ FOUND FACTS (at `dae96d9b`; MSG91's help / docs pages read 2026-10-17 — docs pages ONLY, ⛔ API call; re-check at Task 0.1)

**MSG91's delivery reports** (sources: Latest tech information; the help pages carry JSON-LD `dateModified` 2026-06-11 … 2026-09-10)
- **F1 — Panel-configured only.** *"MSG91 Dashboard » SMS » Webhook (New) » Create Webhook"*; ⛔ per-request callback URL on Flow.
  Event types incl. *"On Report Received"* (final delivery status), *"API Failed Events"*, *"Delivered / Failed / Rejected Events"*;
  *"To receive both event types, you must create two separate webhooks."* ⭐ The PAYLOAD is a template WE write in the panel with
  `{{field}}` placeholders (fields may be omitted; pipes such as `{{ x | datetime:… }}` transform values).
- **F2 — Transport.** HTTP POST, *"Only JSON is supported"*; *"one log (payload) per recipient number"*; ⚠ *"The value of a few
  parameters is a stringified JSON array"* (which — ⛔ documented). Every sample value is a JSON STRING (`"status":"1"`, `"credit":"0.25"`).
- **F3 — Fields** (the full template): `pluginsource, requestedAt, status, deliveryTime, telNum, credit, senderId, campaignName, route,
  campaign_pid, clientId, userId, ts, CRQID, requestId, UUID, INMSID, DLT_TE_ID, eventName, event, failureReason, smsLength,
  upperCaseEventName`. Sample: `"status":"1"`, `"telNum":"919XXXXXXXXX"`, `"CRQID":"0"`, `"requestId":"69XXXXXXXXXXXXXXXXXXXXXXX3"`,
  `"eventName":"delivered"`, `"failureReason":""`. ⚠ `CRQID` reads `"0"` when none was sent (T7). ⚠ Timestamps disagree in form
  (`"2025-07-09 11:29:46"` in the field notes vs ISO `+05:30` in the sample) (T8).
- **F4 — ⛔ Signature.** ⛔ HMAC, ⛔ secret, ⛔ basic auth documented — only *"add the Headers in the key-value pairs, and then we will
  send all the reports including these Headers"*; ⛔ source-IP list (*"Ensure your server/firewall is not blocking MSG91 requests"*);
  *"Use a valid HTTPS (SSL secured) URL"*. ⇒ §3.11 step 1 cannot be met as written (ADR-0042).
- **F5 — Status codes** (new webhook): *"0 = Sent · 1 = Delivered · 2 = Failed · 9 = NDNC (In case of Promotional SMS only) · 16 & 25
  = Rejected · 17 = Blocked number · 20 = Country code blocked"*. *"Report received webhooks are not triggered for messages in a
  Pending status"* (fires on the final operator status). ⚠ Which number a DLT failure carries (2 vs 16 / 25), 16 vs 25, and the
  `eventName` strings other than `delivered` are ⛔ documented. DLT failures arrive as `failureReason` TEXT (*"DLT Scrubbing Failed"*,
  *"Template not matched on DLT"*, *"Template Id not found on DLT"*, … ~60 reasons) — the legacy sample shows *"Template Inactive on
  DLT"* with `status "2"`.
- **F6 — Retries, timeout, auto-pause.** *"respond … within 8000 milliseconds"* (overview) vs *"Response time should be under 5
  seconds"* (logs page); retries 30 s / 1 min / 5 min / 15 min / 30 min (*"Maximum retries: 5 attempts … marked as Final Failed"*; the
  overview says 4); ⭐ AUTO-PAUSE when *"Failure rate > 2%"* of final-failed events AND *"Total requests ≥ 10"*, counts reset after 48 h;
  how to un-pause and whether paused events are replayed — ⛔ documented; the pause e-mail is *"to be implemented soon"*. ⇒ a broken
  endpoint goes SILENT (DR12). *"Because of this retry mechanism, you may receive multiple callbacks"* ⇒ duplicates expected; ⛔ event id.
- **F7 — Correlation.** Flow's success `message` and the webhook's `requestId` are both 24-hex request ids, one per Flow call (the
  legacy sample shows two recipients of one call sharing it) — equality is strongly implied, ⛔ stated in words. `CRQID`: *"A custom
  parameter you can pass in the API payload. You will receive the same value in the webhook"*; *"Bulk / Single: Pass one CRQID at the
  top level"*; *"Supported in all versions of webhook and delivery reports"*. ⚠ Limits conflict: *"Alphanumeric + _ . -"*, *"Maximum
  length: 80"* (2026 page) vs *"only allows alphanumeric … Maximum characters allowed in CRQID: 52"* (legacy) ⇒ use ≤ 52 alphanumeric.
- **F8 — Account faults and API failures.** Legacy: *"Webhook will not be sent for following API failure error codes - 301 :
  Insufficient Balance - 203 : Invalid Sender ID - 211 : Empty DLT ID"*; the new webhook has an *"API Failed Events"* type whose
  PAYLOAD is ⛔ documented. ⇒ a zero-balance send may produce ⛔ "On Report Received" at all (UNVERIFIED either way — DR4, Row 33 (e)).
- **F9 — Pull API (documented, ⛔ called):** `POST /api/v5/report/logs/p/sms?startDate=&endDate=` (`authkey`; *"Range … 3 days"*;
  `requestId` filter; fields incl. `status`, `statusCode`, `failureReason`); errors as HTTP 200 `{"error":"…"}`. Panel exports cover
  100 days. ⇒ a reconciliation fallback for a paused webhook — OUT of this story (DR12 (b)).
- **F10 — OTP.** SendOTP has its OWN webhook (*"OTP » Webhook"*); our OTPs go through FLOW (6.37 MG2) ⇒ they are SMS submissions and
  should reach the SMS webhook (INFERENCE, ⛔ stated).

**The code today**
- **F11 — ⛔ Report is received anywhere.** `getStatus` returns `unknown` (*"its delivery reports are row 6-37b"*, `sms-dlt.ts:99-102`);
  `buildFlowBody` sends ⛔ `CRQID` (`sms-app.ts:303-308`; pinned by the whole-body equality `packages/channels/tests/sms.test.ts:254-258` + its comment `:259`; ADR-0041 `:48`).
- **F12 — The send tables.** `claim_correction_reminders` (0128; reminder `purpose='family_sms'` + closure notice
  `'closure_notice'`, 0135; ⚠ staff rows `staff_push` hold an FCM id in the SAME `provider_message_id`, `claim-correction-reminders.ts:617-631`),
  `claim_certificate_reminders` (0138 / 0141), `claim_suspicion_notices` (0151 / 0155), `claim_peer_mesh_pings` (0054 / 0156 / 0166).
  Every one stores the accepted id in `provider_message_id` (finalisers: `correction-reminder-record.ts:252`, `certificate-reminder-record.ts:249`,
  `suspicion-notice.ts:888`, `peer-mesh-request.ts:510`) and ⛔ indexes it. `recipient_number_hash` = a PER-PARIWAR blind index
  (`correction-crypto.ts:57-60`) ⇒ ⛔ computable from a report alone.
- **F13 — The freezes.** 0155 (`:47-73`): *"a finished row (%) is never updated"* on `claim_suspicion_notices`, EVERY role. 0166
  (`:78-128`): `claim_peer_mesh_pings_guard_delivery` freezes the 13 delivery columns of a finished ping (*"a finished send (%) is never
  rewritten — one text per ping, ever"*); 0156 `:19` — a NEW column is ⛔ frozen (*"so row 6-31's WhatsApp reminder can keep its OWN
  record"*). `delivered_at` exists ONLY on 0128 / 0138 — CHECK `delivered_at IS NULL OR outcome = 'accepted'` (0128 `:64`, 0138 `:58`)
  — and is ⛔ granted (`GRANT UPDATE (…)` 0128 `:68`, 0138 `:61` omit it; pinned by
  `claim-correction-chase-policy-regression.spec.ts:332-333`, `claim-certificate-reminder-policy-regression.spec.ts:307`). ⛔ Writer
  anywhere (*"⛔ `delivered_at` is ⛔ never written here"*, `correction-reminder-record.ts:233`).
- **F14 — The id is LOST on three paths** (the orphan source): a transient (timeout / 5xx after MSG91 took it) records ⛔ id; a retry
  keeps only the LAST attempt's id; a finaliser that loses its compare-and-set drops it with an alarm. ⇒ reports WILL arrive for
  request ids no row holds — unless the send carries its row id (DR3).
- **F15 — D22.** `reachedBySms = currentNumberHash !== undefined && mine.some((r) => r.outcome === 'accepted' && r.recipientNumberHash
  !== null && sameNumberHash(r.recipientNumberHash, current))` (`correction-closure.ts:373-375`); `numberKnownDead` reads
  `DEAD_OUTCOMES` (`rejected_invalid_number`, `rejected_unreachable`, `no_target` — `correction-chase.ts:698-702`) (`:378-382`). Rows
  from `readReturnFamilyRows` (`correction-reminder-record.ts:604-640`, `purpose='family_sms'` only). Consumers: `readClosureReach`
  (`:399-421`) → `assertClosureGround` — `readClosureReadiness`, `requestCorrectionClosure`, `decideCorrectionClosure`,
  `decideEscalatedClosure` (`:459-460`) — and `closureNoticeRecipients` (`:428-437`). ⭐ ONLY the correction reminder feeds D22: the
  closure notice, certificate reminder (CR12), suspicion notice and peer mesh ⛔ do.
- **F16 — Other `accepted` readers (⛔ D22):** the staff chase view `remindersAccepted` (`correction-chase-read.ts:229`), the certificate
  view's "reminded" (`certificate-reminder-read.ts:201`), the peer-mesh link (`send_outcome = 'accepted'`, `peer-mesh-request.ts:663`,
  `peer-mesh-reply.ts:179`, `:231`).
- **F17 — OTP.** ⛔ OTP table has a delivery / gateway column (`member_auth_otps`, `step_up_otps`); the auth-audit `delivery_channel` /
  `delivery_status` keys only feed `request_payload_hash` (`audit-log-sink.ts:119`, `auth/shared/audit.ts:26-28`); `resource_locator`
  is lower-case only (`audit.ts:35-38`) and is the actor's slot (`user:<actorId>`, `audit-log-sink.ts:117`); `gatewayMessageId` is
  dropped by every caller (login / step-up `member-auth.handlers.ts:258-267`,
  `:544-554`; data export `member-data-rights/handlers.ts:673-679`; claim handover `claims.service.ts:180-188`). ⇒ the 6.37 story file's MG1 *"the
  OTP's gateway id in its audit"* (`-345`'s entry: *"the OTP's gateway id"*) has ⛔ good home in the audit as built (DR11).
- **F18 — The webhook house shape.** `channel-webhooks` module: WA (HMAC, `signature.ts:21-38`) and Telegram (static header
  `x-telegram-bot-api-secret-token`, `handlers.ts:22`, `:146`) both 403 `webhook.signature_rejected` and persist nothing on a bad
  token; a scoped raw-body JSON parser; `schema: { hide: true }`; per-Pariwar URL ⇒ `openScopeTx`. ⚠ MSG91 is ONE global account ⇒
  ⛔ Pariwar at ingress ⇒ a GLOBAL inbox (the 0049 shape). The AI-5-1 constant-time gate scans `CHANNEL_ROOTS` incl.
  `apps/api/src/modules/channel-webhooks` (`scripts/access-wrapper-invariants/check.ts:69-77`). Every public route must be in
  `PUBLIC_ALLOWLIST` (`apps/api/tests/integration/login-wall.spec.ts:28`, precedents `:79`, `:290-298`).
- **F19 — The drain trap.** `claimUnprocessedWebhookEvents` stamps `processed_at` IN the claim (`telegram-opt-in/webhook-events.ts:57-74`)
  ⇒ at-most-once; the comment *"the event stays unprocessed and retries next tick"* (`tg-webhook-processor.ts:398-399`) is FALSE. The
  WA status branch `upsertWaSendStatus` is latest-wins (`channel-config/wa-status.ts:32-45`) — and a test PINS that (`packages/domain/tests/integration/channel-config/wa-status.spec.ts:19`). `purgeProcessedWebhookEvents`
  is ⛔ called by anything.
- **F20 — Rate limit and edge.** The global per-IP limit `RATE_LIMIT_MAX` 300 / min (`config.ts:407`, `plugins/rate-limit/index.ts:121-124`)
  applies to webhooks; per-route precedent `config: { rateLimit: IP_RATE }` (`kyc.routes.ts:31`, `:82`). Cloudflare: `browser_check = "on"`
  (`infra/cloudflare/zone.tf:22-23`), managed challenge on automated traffic (`waf.tf:80-83`); the ONLY skip is 6.30's
  `app_link_verification_files_skip` (`waf.tf:41-63` — *"a challenge is ⛔ not a clean 200, and verification then fails SILENTLY"*).
  ⇒ a challenged MSG91 POST ⇒ retries ⇒ auto-pause (F6). ⛔ IP allowlist is possible (`trustProxy: true` ⇒ `request.ip` is caller-supplied).
- **F21 — DB roles.** `twt_app` (tenant RLS) for the api; jobs runs on the BYPASSRLS service pool; roster Row 26 `jobs-db-role` is
  OPEN (`twt_service` has ⛔ grant on claim tables — every jobs sweep would 42501 in production). New tables inherit that open row.
- **F22 — Numbers.** Next migration **0167** (journal idx 167, `when` 1794195600011 — `meta/_journal.json:1163`); ADR **0042**
  (adr-index Total 152); roster **Row 33**; decision id **`2026-10-17-347`** (every ref tops out at `-346`); ledger suffix
  **2026-10-17j**. ⚠ All four are races with the 6-31 worktree (T9).
- **F23 — `epics.md`**: the `### Story 6.37` entry `:3511-3533`; the `---` before `## Epic 7` `:3535`; ⛔ 6.37b entry.
- **F24 — The PRD** has ⛔ FR / NFR on SMS delivery receipts (grep "delivery report" / "DLR" / "receipt" — FR-33's "never 'receipt'"
  only).

## ⚖️ Build decisions DR1–DR14 (PROPOSED — ⏳ BigDev at Task 0.2; one author-commit `-347` records them)

- **DR1 — The route and its auth.** `POST /api/v1/webhooks/msg91/sms-reports` in `apps/api/src/modules/channel-webhooks` (inside the
  AI-5-1 gate — F18), `schema: { hide: true }`, a `PUBLIC_ALLOWLIST` entry with its justification. Auth: header `x-twt-msg91-token`
  (configured in MSG91's panel as a custom header — F4) compared with `timingSafeEqualString` against a 32-byte random token from
  Secret Manager: `SMS_REPORT_WEBHOOK_TOKEN_SECRET_NAME` (+ `_ENV_FALLBACK`), resolved ONCE at boot (I4, I5) — and an OPTIONAL
  `SMS_REPORT_WEBHOOK_TOKEN_NEXT_SECRET_NAME` accepted beside it (§5.9's *"dual-secret window"* for rotation). Bad / missing token ⇒
  `403 webhook.signature_rejected`, persist nothing (the Telegram shape). Name unset ⇒ the route answers 403 to everything and prod
  boot logs ONE line (⛔ refuses — 6.37 T13: a refusal is a restart loop of every route). ⭐ Recommended. Alternatives: (b) a secret
  path segment — refused (Traefik logs the URL, I5); (c) an IP allowlist — refused (F4 ⛔ list; F20 spoofable).
- **DR2 — Keep only an allowlisted projection; ⛔ the phone number.** One recipient per Flow call (6.37 MG9) ⇒ `requestId` + `CRQID`
  identify the send; `telNum` adds ⛔ match power and IS member PII. The handler persists, per report: `request_id` (≤ 64
  `[A-Za-z0-9]`, NOT NULL; a report without a usable one is ⛔ stored — `200` + ONE alarm `sms_report.bad_request_id`, as
  `unusable_body` below — so the column CHECK never 5xxes a retry toward auto-pause and the dedupe key is never NULL), `crqid` (DR3's grammar; `""` / `"0"` ⇒ NULL — T7), `status_code`
  (`^[0-9]{1,3}$`, else NULL), `event_name` (`^[A-Za-z_]{1,32}$`, else NULL), `failure_reason` (trimmed, ≤ 200, control chars stripped,
  every run of ≥ 7 digits replaced by `#` — the 0155 / 0166 digit-run rule's spirit), `reported_delivery_time` (the raw string ≤ 40, ⛔
  parsed for logic — T8), `received_at now()`. ⛔ Anything else is read. The panel template (Row 33 (d)) OMITS `telNum`, `senderId`,
  `credit`, `userId`, `DLT_TE_ID` (data minimisation at the source), and the handler drops them anyway (I3). A body that is one object
  ⇒ one row; an ARRAY of ≤ 100 objects ⇒ one row each (defensive — F2); anything else, once authenticated ⇒ `200` + ONE alarm
  `sms_report.unusable_body` (⛔ the body) and ⛔ row — a 4xx would count toward auto-pause (F6). ⭐ Recommended. Cost: ⛔ cross-check
  that the report's number is the row's number (a mis-correlation by MSG91 would go unseen); (b) keep `telNum`, hash it per Pariwar in
  jobs and compare to `recipient_number_hash` — one KMS HMAC per report (in api it would also take the global audit lock —
  [[project_kms_audit_per_hmac_global_lock]]) for a check ⛔ needed when the id is ours.
- **DR3 — ⭐⭐ Correlate by OUR id: every send carries `CRQID` = `<kind><row-uuid-hex>`.** `kind` ∈ `cr` (a
  `claim_correction_reminders` row — reminder OR closure notice), `ce` (`claim_certificate_reminders`), `sn` (`claim_suspicion_notices`),
  `pm` (`claim_peer_mesh_pings`), `ot` (an OTP — DR11); the row's uuid lower-case without dashes ⇒ 34 characters,
  `^(cr|ce|sn|pm|ot)[0-9a-f]{32}$` — inside BOTH documented limits (F7). `SmsGatewayMessage` gains `correlationId?: string`;
  `SmsProviderDeps` binds it per send (as 6.37 bound `values` — I8); `buildFlowBody` adds top-level `"CRQID"` when present (*"Bulk /
  Single: Pass one CRQID at the top level"*); a value outside the grammar is refused LOCALLY (`dlt_template_not_approved:bad_correlation_id`
  — an existing class, 6.37 I5; effectively unreachable — the core builds it). `ClaimDltSmsInput` gains `correlation: {kind, rowId}`;
  each caller passes the row id it already holds (`begun.reminderId` / `begun.noticeId` / `pingId`). ⇒ (i) a report is matched by a
  PRIMARY KEY lookup in ONE table (⛔ scan of five, ⛔ new index on four `provider_message_id` columns); (ii) a report for a request id no
  row holds (F14) still finds its row ⇒ the may-have-sent retry is DETECTED (DR6); (iii) the 0128 FCM ids can ⛔ collide (they carry ⛔
  CRQID). Supersedes `-345` MG9's *"⛔ `CRQID`"* (the story file's: *"6-37b decides correlation"* — so a DECISION, ⛔ an edit). Updated (⛔ broken — the field is optional
  in the TYPE, but the core and the OTP adapter always set it): `sms.test.ts:254-258`'s deep-equal (6.37 AC1), the two api whole-body
  checks and the 51 direct core calls T15 lists; ADR-0041 `:48` gains a dated amendment row.
  ⭐ Recommended. Alternatives: (b) match on `requestId` = `provider_message_id` only — four new indexes, a five-table scan with the
  0128 purpose filter, and F14's orphans stay orphans; (c) `UUID` — the same echo, ⛔ better documented.
- **DR4 — Status → delivery state (data-driven, one table).** `1` ⇒ `delivered`; `2`, `9`, `16`, `17`, `20`, `25` ⇒ `undelivered`
  (final — F5); `0` ⇒ `ignored:intermediate` (recorded, ⛔ state); NULL / any other ⇒ `ignored:unknown_status` + an alarm naming the
  code (⛔ state — an unknown code must ⛔ un-count a send, I1's spirit applied to doubt). `event_name` / `failure_reason` are RECORDED,
  ⛔ decide (their strings are ⛔ documented — F5); an "API Failed" event (F8) whose shape is unknown is therefore `ignored:unknown_status`
  until Row 33 (e) records a real one (then a later change maps it — a deferred item). ⭐ Recommended.
- **DR5 — Where the result lives: ONE pariwar-scoped table `sms_send_deliveries`**, ⛔ the send tables (I2). Columns: `pariwar_id`,
  `send_kind` (`cr|ce|sn|pm`), `send_row_id uuid`, `request_id`, `delivery_state` (`delivered|undelivered`), `status_code`,
  `failure_reason`, `first_reported_at`, `reported_at`, `report_count`; PK (`send_kind`, `send_row_id`); tenant RLS (FORCE, the 0128
  policy shape); `GRANT SELECT` to `twt_app`; written ONLY by the jobs correlator. ⛔ FK across five tables (a kind-discriminated id —
  the `cycle_id` unFK'd precedent, [[project_pool_primitive_substrate]]); the correlator proves existence by the lookup it made.
  `delivered_at` on 0128 / 0138 stays NULL and its CHECK stays — a deferred item records it as an unused seam (adopt or drop later),
  ⛔ silently. ⭐ Recommended. Alternative (b): `delivered_at` on 0128 / 0138 + new delivery columns on 0151 / 0156 — four grant
  changes, 0155's trigger amended to let a FINISHED suspicion row change (it was frozen on purpose), two shapes for one fact.
- **DR6 — The matching rule (I6), in this order.** For an inbox row with a valid `crqid`: look up `(kind, row id)` (service pool —
  F21). (a) ⛔ row ⇒ retry (backoff 1 min, 5 min, 30 min, 2 h, then every 6 h) until **72 h** after receipt, then `unmatched` + alarm.
  (a2) A `cr` row whose `purpose` is ⛔ `family_sms` / `closure_notice` (a staff push) ⇒ `unmatched:not_sms` + alarm (unreachable —
  a push carries ⛔ CRQID — but checked). (b) The row is still `attempting` (outcome; pings `send_outcome`) ⇒ retry as (a) (the
  report beat the finaliser's COMMIT) — ONLY `attempting`: a FINISHED row is never retried. (c) Finished, `accepted`, and
  `provider_message_id = request_id` ⇒ upsert `sms_send_deliveries` — `undelivered` ABSORBING: a `delivered` never overwrites an `undelivered`; an
  `undelivered` overwrites a `delivered` (`report_count += 1`, `reported_at` = latest); ⛔ latest-wins (F19's WA trap). (d) Finished
  and either `accepted` with a DIFFERENT request id, or ⛔ `accepted` at all (an `error` / rejected / `no_target` row whose request
  MSG91 nevertheless took — its `provider_message_id` is NULL) ⇒ `other_attempt` —
  recorded on the inbox row, ONE alarm `sms_report.second_request_for_one_send:<kind>` (a double text, or a text the row says was ⛔
  sent), ⛔ state change. (e) `kind = ot` ⇒ `otp` (DR11). ⛔ CRQID ⇒ `unmatched:no_crqid` at once (a panel test send, a foreign
  send). ⭐ Recommended. Cost (accepted): a genuine "failed then delivered" sequence for ONE request reads `undelivered` (the safe
  direction — one more reminder or the letter route); the 72 h window matches the pull API's 3-day reach (F9).
- **DR7 — The inbox `sms_delivery_report_inbox` (migration 0167, hand-authored — T10).** GLOBAL (⛔ `pariwar_id`): ENABLE + FORCE RLS,
  policy `… TO twt_app USING (true) WITH CHECK (true)` (the 0049 shape — the inbox holds ⛔ PII after DR2); `GRANT SELECT, INSERT` to
  `twt_app`. Columns: DR2's projection + `report_id uuid` PK + `match_state` (`pending|matched|other_attempt|unmatched|ignored|otp`,
  CHECK), `match_detail` (≤ 64 `[a-z_:]`), `attempts`, `next_attempt_at`, `lease_until`, `matched_at`. Dedupe: UNIQUE (`request_id`,
  `coalesce(crqid,'')`, `coalesce(status_code,'')`) ⇒ `INSERT … ON CONFLICT DO NOTHING` (a retry or a duplicate is one row — F6).
  Index (`match_state`, `next_attempt_at`) for the drain. ⭐ Recommended.
- **DR8 — The correlator (jobs).** A pg-boss cron (`'* * * * *'`, `tz: 'Asia/Kolkata'`, the `tg-webhook-processor.ts:413-431`
  registration; a queue-name constant in `packages/queue/src/index.ts`) that claims ≤ 200 due rows with a LEASE (`UPDATE … SET
  lease_until = now() + 5 min, attempts = attempts + 1 WHERE report_id IN (SELECT … WHERE match_state = 'pending' AND
  next_attempt_at <= now() AND (lease_until IS NULL OR lease_until < now()) ORDER BY received_at LIMIT … FOR UPDATE SKIP LOCKED)`) —
  ⛔ `processed_at` on claim (T2) — and settles each in its own try / catch (a crash ⇒ the lease lapses ⇒ re-claimed). The
  `sms_send_deliveries` write and the inbox row's settle commit in ONE transaction, and the settle is a compare-and-set (`WHERE
  match_state = 'pending' AND attempts = <the claimed attempts>` — 0 rows ⇒ ROLLBACK, so a settle after a lapsed lease never counts a
  report twice — AC7). ⭐ Recommended.
- **DR9 — Rate limit and the edge.** The route gets an explicit `config: { rateLimit: { max: SMS_REPORT_WEBHOOK_RATE_MAX (default 1200),
  timeWindow: '1 minute' } }` (⛔ the 300 global — F20; ⛔ `rateLimit: false`). Cloudflare: a skip rule in `infra/cloudflare/waf.tf` for
  EXACTLY `/api/v1/webhooks/msg91/sms-reports` (BIC, security level, SBFM, the custom rules — the 6.30 rule's shape, with its comment
  on why), OPERATOR-applied (roster Row 33 (c)). Auth stays in the api (a skip is ⛔ trust). ⭐ Recommended.
- **DR10 — Body parsing.** Reuse the module's scoped raw-body JSON parser; ALSO accept `application/json; charset=utf-8` (assert it
  with a test — T18); an empty / non-JSON body with a valid token ⇒ DR2's `unusable_body` (200). The global `bodyLimit` (1 MiB) stays.
  ⭐ Recommended.
- **DR11 — The OTP: a tag, ⛔ a stored id.** The audit has ⛔ good home for the gateway id (F17): its context is only hashed, and
  `resource_locator` — which COULD hold a lower-case 24-hex id — already carries the actor (`user:<actorId>`, `audit-log-sink.ts:117`),
  so the id would REPLACE it; storing it per member would add a member-linked table for ⛔ use. ⇒ the OTP adapter sends `CRQID = 'ot' + 32 random hex` (`crypto.randomBytes(16)`); the correlator settles every `ot`
  report as `otp` (⛔ member, ⛔ row) and a DAILY jobs line counts OTP reports by state (`otp delivery: delivered N, undelivered M,
  unknown K` — ⛔ an id). That SUPERSEDES the 6.37 story file's MG1 *"the OTP's gateway id in its audit"* (`-345`'s entry: *"the OTP's gateway id"*) — a
  DECISION; the audit as built has ⛔ good home for it. ⭐ Recommended. Alternative (b): a global `sms_otp_sends(request_id, intent, sent_at)` the api writes best-effort — a write on
  the login path for a metric.
- **DR12 — Silence: the alarm, ⛔ a pull.** A daily jobs check (`'40 3 * * *'` IST): `accepted` SMS sends — cr ONLY `purpose IN
  ('family_sms','closure_notice')` (⛔ `staff_push`: an FCM id, ⛔ CRQID — it would alarm every day); ce / sn their SMS rows only (any
  non-SMS purpose excluded — confirm each table's purpose column at Task 3); pm `send_outcome = 'accepted'` — finalised (each table's finalise timestamp: `updated_at`; pings
  `send_updated_at` — confirm per table at Task 3) between 7 days and **48 h** ago, with ⛔ `sms_send_deliveries` row and ⛔ inbox row
  carrying their `crqid` ⇒ if > 0, ONE alarm `sms_report.silence:<count>` (⚠ a phone off for two days can still read as silence — the
  alarm is a pointer, ⛔ a state; MSG91's maximum report delay is ⛔ documented) (a paused webhook — F6 — or an account fault MSG91 never reports — F8). Logs only until
  `onAlarm` is wired (Row 32 (h)). (b) A reconciliation pull of `report/logs/p/sms` (F9) — OUT (an outbound MSG91 call and its key
  scope); a deferred item with trigger *"Row 33 (e) observes a pause, or the silence alarm fires in production"*. ⭐ Recommended.
- **DR13 — What staff see: ⛔ change in this story.** The chase views (F16) keep showing `accepted`; a deferred item (*"the staff chase
  views show a send the network reported undelivered as `accepted`"*) carries it, trigger: PQ1's ruling (under B the closure ground
  already refuses; a view change then is display only). Peer mesh / suspicion / certificate reports are RECORDED, ⛔ act on (a
  neighbour reported unreached is ⛔ replaced — that would change WHO is texted). ⭐ Recommended (scope; ⛔ a UI story inside a webhook story).
- **DR14 — Story shape and records.** (a) ⭐ ONE story: Tasks 1–6 build; **Task 7 (D22) waits for PQ1's ruling** and the row stays
  `in-progress` until then (Row 32 (i) is unchanged and keeps its meaning — 6-37b `done` ⇒ reports are consumed AS the Panel ruled).
  Landing Tasks 1–6 on `main` before the ruling is BigDev's call ([[feedback_land_prs_by_fast_forward]]) — it changes ⛔ behaviour
  (I7). (b) Alternative: split — Task 7 becomes row 6-37c, Row 32 (i) re-pointed to 6-37c by the author-commit (a narrowing of when ids
  may be provisioned). (c) Records: the author-commit `-347` (DR1–DR14 + the `-346` Status / §0 corrections owed by 6.37 D1 — ⛔
  `-346` edited); ADR-0042 `msg91-delivery-report-ingress` (`drafted` — the static-header deviation from §3.11 step 1 / the edge
  capability bar, the global inbox, ⛔ phone number kept, I1's forgery bound, rotation, auto-pause, Cloudflare skip, the residual) +
  its index row (Total 152 → 153, reconciled in the SAME commit); ADR-0041 a dated Changelog row (CRQID now sent); roster **Row 33
  `sms-delivery-reports-provisioned`** (Row 32's block shape), legs IN THIS ORDER (a report that meets a missing token or a challenge is a 403 that counts toward
  auto-pause — F6): (a) ADR-0042 ratified; (b) the token secret(s) set in the deployed api (DR1); (c) the Cloudflare skip applied (DR9)
  AND whether free-plan Bot Fight Mode is on recorded (it ⛔ can be skipped — `waf.tf:47-48`; the Row 29 precedent) — if on, a
  test POST from outside the origin's network proves the path is ⛔ challenged BEFORE (d); (d) THEN the SMS webhook created in MSG91's panel — "On Report Received"
  AND "API Failed Events" (two webhooks, F1) — to the production URL (HTTPS), the `x-twt-msg91-token` header, and the payload
  template of exactly DR2's fields (+ `{{ deliveryTime | datetime:… }}`), recorded with a panel screenshot; (e) ONE real report of
  each kind received on the deployed api — delivered, failed, and an API-failed event if MSG91 sends one (F8) — each stored row
  checked to hold ⛔ number AND to reach `match_state = 'matched'` (the proof that Flow's `message` IS the webhook's `requestId` — F7,
  ⛔ stated by MSG91); (f) the silence alarm reaching a NAMED person (Row 32 (h)'s bar); **(g) Row 33 is closed before ANY claim-text
  template id (1–14) is provisioned** — Row 32 (i) is ⛔ edited, Row 33 (g) ADDS the provisioning half (6-37b `done` is code; reports
  need the webhook LIVE) — a narrowing, the author's. Row 32 gains a dated note pointing to Row 33. The `epics.md` `### Story 6.37b` entry (6.37's
  blockquote shape) between `:3533` and `:3535`. The deferred-work dispositions (Task 8). ⭐ Recommended (a).

## 🏛️ The Panel's questions (routed by Task 0.3 — ⛔ answered here)

- **PQ1 — "Reached" when the network REPORTS a reminder undelivered** (one routing note, the TEMPLATE's order). §0: passes — *"what
  the Trust OWES a family"* and a ratified clause that is matched or *"narrowed"* (`-252` cl.1 read verbatim: *"accepted by the network
  (or shown delivered, where a report exists)"* — the note gives BOTH readings (Policy meaning (i) / (ii)) and says match / narrow for
  each). The one fact that decides it: **MSG91 says "received" for every text, then tells us hours later — sometimes never — whether
  the phone network delivered it.** Options:
  **A** — record reports, change nothing: an accepted reminder still counts even when reported failed (cost: a claim can be closed for
  silence on a text the network said never arrived — `-323` R2's accepted gap, kept).
  **B1** — ⭐ our reading: a reminder REPORTED undelivered is treated as one the network REFUSED (`rejected_unreachable`) — it no
  longer counts as reached AND it makes the person letter-eligible, exactly as a send-time carrier refusal does today (cl.2 *"as for
  an invalid number"*); a reminder with ⛔ report counts as today (cost: closure harder to reach; a letter posted where a later text
  might have got through — one undelivered report, e.g. a phone off for a day, starts the letter track; silence still counts, so a
  paused webhook or an account fault MSG91 never reports leaves the old gap for those texts — DR12 alarms it).
  **B2** — un-count only, ⛔ letter-eligibility (cost: a person whose reminders are all reported undelivered is never reached and
  never offered a letter ⇒ the claim can never be closed for silence — the 2026-09 note's rejected *"the claim waits forever
  again"*, against cl.2). Put so the Panel sees why B1 carries the letter half.
  **C** — only a DELIVERED report counts (cl.3's "proven delivery", now — cost: when MSG91 sends ⛔ report, the family can never be
  reached by SMS).
  ⭐ BEFORE the note is written, Task 0.1 TRACES (cites in the note's E3): D20 / D31 letter-eligibility (`correction-letter.ts:4-5`),
  `numberKnownDead` / `lastEvidentialAttempt` (`correction-closure.ts:377-382`), the queue status (`correction-chase-read.ts:120-128`,
  *"A dead / unreachable fact of the CURRENT number WINS over 'reached'"*), and what happens to a never-reached person when the
  chase's reminders end (day 90). Blocks: Task 7 only.
- **PQ2 — Refuse a correction / closure / certificate text when MSG91's stored template provably differs** (its own note — *"a mixed
  question is two questions"*). §0: passes — refusing a text changes WHO is texted (`-322` §0 option (a)). The one fact: **a template
  whose words differ from the registered ones fails DLT scrubbing and, from this story, comes back as a reported failure** (⚠ an
  INFERENCE from MSG91's DLT failure reasons — F5 — ⛔ stated by MSG91 as a guarantee; the note says so). Options:
  **A** — ⭐ our reading if PQ1 = B: ⛔ refusal (6.37 as built — the text is sent and alarmed; if DLT scrubs it, the report un-counts it);
  **B** — refuse on a PROVEN mismatch (cost: that day's reminder slot, or the closure notice for good — `-345` X1's cost, extended);
  the note says PROOF still waits on `-345` S1 / Row 32 (e) (`-345` Consequence 3's trigger — ⛔ changed). Blocks: ⛔ code in this story —
  but Row 32 note (6.4) asks it *"before leg (i) closes"* ⇒ Task 8 requires the PQ2 note SENT (⛔ ruled) before the row is `done`.
- Both notes: WRITTEN at Task 0.3 from `_bmad-output/planning-artifacts/trustee-panel-routing-note-TEMPLATE.md` (referenced, ⛔
  copied); E4's commands run (an empty result is a finding); ⛔ "shown to the Panel" until BigDev SENDS them
  ([[feedback_shown_to_panel_means_sent]]).

## Acceptance Criteria

1. **AC0 — Governance before code (Task 0).** DR1–DR14 answered by BigDev and committed ALONE as `-347` (id re-grepped on EVERY
   branch first — T9) naming each supersession — DR3: the story file's MG9 *"⛔ `CRQID`"*; DR5: `-345` MG1's *"delivery state on the five send
   tables"* (a new table instead); DR2 / DR3: the story file's MG1 *"correlation by request id + recipient"* (⛔ recipient); DR11:
   the story file's MG1 *"the OTP's gateway id in its audit"* (`-345`'s entry: *"the OTP's gateway id"*) and carrying the `-346` corrections (DR14 (c)); then ONE records commit: ADR-0042 + index row (reconciled), ADR-0041's
   Changelog row, roster Row 33 + Row 32's pointer note, the `epics.md` entry, the two routing notes (written, ⛔ sent), the sprint row →
   `in-progress` and the ledger line — all BEFORE any code.
2. **AC1 — Every send carries its CRQID (DR3).** For each of the five callers, a test drives the REAL caller with a fake handle and
   asserts the message's `correlationId` = `<kind>` + its row id (lower-case, ⛔ dashes); the client's Flow body (PARSED JSON) deep-equals
   `{"template_id":…,"short_url":"0","CRQID":"cr<32 hex>","recipients":[…]}` (`sms.test.ts:254-258`'s leg UPDATED, ⛔ deleted); an id outside
   `^(cr|ce|sn|pm|ot)[0-9a-f]{32}$` ⇒ `dlt_template_not_approved:bad_correlation_id`, ⛔ `fetch`; the OTP adapter sends `ot` + 32 hex,
   a fresh one per send from an INJECTABLE random source (two sends ⇒ two values). Updated, ⛔ deleted: the api whole-body checks
   (`member-step-up-delivery-wiring.test.ts:213-215`, `sms-step-up-delivery.test.ts:304-308`) and the 51 direct core calls (T15).
   Every OTHER 6.37 assertion stays green UNCHANGED.
3. **AC2 — The route authenticates (DR1, I5).** A valid header (current OR next token) ⇒ `200 {received:true}` and one inbox row; a
   wrong / missing / array-valued header ⇒ `403 webhook.signature_rejected`, ZERO rows; the token name unset ⇒ 403 to everything +
   ONE prod boot line (⛔ throw); the token is read from Secret Manager ONCE (a counting resolver — boot, ⛔ per request); the route is
   in `PUBLIC_ALLOWLIST` with its justification; the AI-5-1 gate passes with the route inside `channel-webhooks`.
4. **AC3 — Only the projection is kept (DR2, I3).** A body holding every F3 field ⇒ the row holds exactly DR2's columns; `telNum`,
   `senderId`, `credit`, `userId`, `DLT_TE_ID` appear in ⛔ column, ⛔ log line, ⛔ alarm (a logger recorder; a `SELECT row_to_json`
   scan for the number's digits); `"CRQID":"0"` / `""` ⇒ NULL; a `failure_reason` with a 10-digit run ⇒ stored with `#`; an array of 3 ⇒
   3 rows; a non-object / non-JSON / empty body with a valid token ⇒ `200`, ⛔ row, ONE `unusable_body` alarm; `application/json;
   charset=utf-8` accepted.
5. **AC4 — Persist-then-ack and dedupe (I4, DR7).** The same report posted twice ⇒ ONE row, both `200`; the handler makes ⛔ KMS,
   Secret Manager or outbound call (counting fakes); a failed COMMIT ⇒ 5xx (MSG91 retries) — ⛔ a 200 for a lost write.
6. **AC5 — Status mapping (DR4).** One leg per code: `1` ⇒ `delivered`; `2` / `9` / `16` / `17` / `20` / `25` ⇒ `undelivered`; `0` ⇒
   `ignored:intermediate`; NULL / `7` / `"x"` ⇒ `ignored:unknown_status` + alarm; ⛔ `event_name` / `failure_reason` changes a result
   (pinned with `eventName:"delivered"` on a `status:"2"` body ⇒ `undelivered`).
7. **AC6 — Matching (DR6, I6).** Live (:5433), one leg each: (a) a report for a row that does not yet exist / is `attempting` ⇒
   `pending`, retried on the schedule, `unmatched` + alarm after 72 h (a controllable clock); (b) matching request id ⇒ one
   `sms_send_deliveries` row in the ROW's Pariwar (RLS-read back under that scope, ⛔ visible under another); (c) `delivered` then
   `undelivered` ⇒ `undelivered`, `report_count 2`; `undelivered` then `delivered` ⇒ stays `undelivered`; (d) a different request id
   for the row, and a report for a row whose outcome is `error` ⇒ `other_attempt` + ONE alarm, ⛔ `sms_send_deliveries` change; (e) ⛔
   CRQID ⇒ `unmatched:no_crqid`; (f) `ot…` ⇒ `otp`; (g) a report whose CRQID names a 0128 `staff_push` row ⇒ `unmatched:not_sms`, ⛔
   `sms_send_deliveries` row (DR6 (a2)). Each kind (cr reminder, cr closure notice, ce, sn, pm) matched at least once.
8. **AC7 — The drain is at-least-once (DR8, T2).** A worker that throws mid-row leaves it re-claimable after the lease (pinned); two
   concurrent drains settle a row ONCE (`SKIP LOCKED`, counted); the settle and the `sms_send_deliveries` write are atomic (a forced
   failure after the upsert leaves BOTH unchanged).
9. **AC8 — The send tables are untouched (I2).** The migration diff in I2 is EMPTY; a live leg asserts every send-table row of AC6 is
   byte-identical (all columns) before and after correlation; `delivered_at` is NULL on every row; 0155's and 0166's triggers ⛔ fire
   (⛔ UPDATE is attempted — a statement recorder on the correlator's client).
10. **AC9 — Silence and the OTP line (DR11, DR12).** An accepted SMS send 49 h old with ⛔ report ⇒ ONE `sms_report.silence:1` alarm;
    one with a report ⇒ ⛔ counted; one 47 h or 8 days old ⇒ ⛔ counted; an accepted 0128 `staff_push` row ⇒ ⛔ counted; an accepted
    ping (`send_outcome`) ⇒ counted; the daily OTP line counts `otp` rows by state and carries ⛔ id.
11. **AC10 — Retention (DR7).** A daily prune deletes inbox rows settled (`match_state` ≠ `pending`) more than 30 days ago (the
    `device-token-cleanup.ts` shape); `pending` rows are ⛔ pruned; `sms_send_deliveries` is ⛔ pruned (it is the record).
12. **AC11 — D22 and letter-eligibility, AS THE PANEL RULES (Task 7; I1, I7).** ⏳ Written against PQ1 option B1; re-written to the
    ruling before Task 7 starts. Under B1: ONE mapping — the family-SMS reader (`readReturnFamilyRows`) and every D20 letter-eligibility
    / queue-status reader see a `family_sms` row whose `sms_send_deliveries` state is `undelivered` (a LEFT JOIN on `('cr', reminder
    id)`) with its EFFECTIVE outcome `rejected_unreachable` (⛔ a stored outcome changes — I2); legs — accepted + ⛔ report ⇒ reached
    (UNCHANGED); accepted + `delivered` ⇒ reached; accepted + `undelivered` ⇒ ⛔ reached, `numberKnownDead` true when it is the last
    evidential attempt on the CURRENT number, the person letter-eligible, the queue status `unreachable`; closure refused at request
    AND at decide (each of the four `assertClosureGround` callers); an undelivered report on the OLD number after a 6.20 number change
    changes ⛔ the current number's facts; a report on a closure-notice / certificate / suspicion / peer-mesh row changes ⛔ any of them
    (F15). Under B2: the reach half only, and a leg pins that the person is ⛔ letter-eligible (the cost the note names). Under A: ⛔ code
    change, a leg pins that. Under C: the Panel's text decides; this AC is re-written. The Policy meaning is re-checked against the
    ruling's words.
13. **AC12 — Nothing else moves.** I8's diff EMPTY; ⛔ i18n / registry text / sheet table edit; `dlt-typed-variables` gate green (new
    non-registry files spell ⛔ the template-id prefix — T11); `channels-determinism` green; ⛔ staff view change (DR13); ⛔ OTP-path
    behaviour change beyond the CRQID (I7).
14. **AC13 — The proof.** `pnpm ci:local` green with `DATABASE_URL` at :5433 EXPLICITLY (or each red explained and re-run alone); a
    global-fetch RECORDER at ZERO calls across the new suites (I9); every new table has its `…-policy-regression.spec.ts`.

## Tasks / Subtasks

- [ ] **Task 0 — governance FIRST (AC0). ⛔ No code.**
  - [ ] 0.1 `git fetch origin`; `git diff --name-only dae96d9b..origin/main -- packages/channels apps/jobs/src apps/api/src
        packages/domain/migrations packages/domain/src/claim infra docs/launch-gate-inventory docs/adr`; re-read any cited file that
        moved. Check the 6-31 worktree / branch for a claimed 0167, `-347`, ADR-0042, Row 33 (T9). Re-read F1–F10's pages (docs ONLY —
        T1; record the date). ⭐ TRACE for PQ1's E3: what happens to a person never "reached" when the correction chase's reminders run
        out (the slot schedule, `numberKnownDead`, the District Admin's unreachable / letter-route surface — cl.2) — with cites.
  - [ ] 0.2 Put DR1–DR14 to BigDev, each with its recommendation and cost — incl. DR6's 72 h, DR7's 30-day prune, DR9's 1200 / min,
        DR14 (a) vs (b). Record the answers verbatim.
  - [ ] 0.3 Write the author-commit `-347` (`.decision-log.md`, prepended; the `-345` entry's shape: Decision type / Status / Author /
        Ratifying trustees: None / §0 gate / Occasion / FOUND / The decisions / Consequences / References) — it ADDS to `-345`, SUPERSEDES
        by a new entry AC0's four clauses (MG9's *"⛔ `CRQID`"*; MG1's *"delivery state on the five send tables"*, *"correlation by
        request id + recipient"* and *"the OTP's gateway id in its audit"* — each attributed to the entry OR the story file, as it is), NARROWS Row 32 (i)'s practical meaning via
        Row 33 (g), and carries the `-346` corrections — ⛔ edits any entry ([[feedback_supersede_never_reinterpret]]). Re-grep every
        branch's `.decision-log.md` for the next free id right before inserting. Stage in scratchpad; try the insert
        ([[project_decision_log_writes_user_inserted]]). Commit ALONE on the story branch; write its SHA after, ⛔ before. Then WRITE the
        two routing notes `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-10-17-6-37b-reported-undelivered.md` (PQ1) and
        `…-6-37b-content-mismatch-refusal.md` (PQ2) from the TEMPLATE; run each E4; ⛔ "sent" until BigDev sends them.
  - [ ] 0.4 The records (one commit, after 0.3): ADR-0042 from `docs/adr/_adr-template.md` + `docs/knowledge-transfer/adr-index.md` row
        and reconciliation (Total 152 → 153; `drafted` 2 → 3; arithmetic re-checked); ADR-0041 Changelog row (CRQID; ⛔ a word above
        rewritten); roster Row 33 (DR14 (c) legs (a)–(g)) + Row 32 dated note (⛔ a word rewritten); `epics.md` `### Story 6.37b: …
        \`[PRIMITIVE]\`` before `:3535`; the sprint row comment + `6-37b-msg91-delivery-reports: in-progress`; both ledgers (the
        top-of-file `# last_updated: 2026-10-17j (…)` and the `last_updated: >-` list) ([[project_sprint_status_safe_prepend]] — guard
        the size, verify the YAML parses).

- [ ] **Task 1 — the CRQID (AC1).** `packages/channels/src/providers/sms-app.ts`: `SmsGatewayMessage.correlationId?`; the grammar check
      (a local refusal); `buildFlowBody` adds top-level `CRQID` when present (update its doc comment — `:303` says ⛔). `sms-dlt.ts`:
      `SmsProviderDeps.correlationId?` bound per send. `claim-dlt-sms-send.ts`: `ClaimDltSmsInput.correlation: {kind: 'cr'|'ce'|'sn'|'pm';
      rowId: string}` → `correlationId` (lower-case, ⛔ dashes); `sendClaimCorrectionSms` passes it through. The five callers pass
      `begun.reminderId` (cr — reminder AND closure notice), `begun.reminderId` (ce), `begun.noticeId` (sn), `pingId` (pm).
      `sms-step-up-delivery.ts`: `ot` + `randomBytes(16).toString('hex')` per send. Export the grammar + a `parseSmsCorrelationId` from
      `packages/channels/src/index.ts` (the api and jobs both read it — ⛔ a second regex). Tests: `sms.test.ts:254-258` updated; the T15 list; every fake
      that asserts the Flow body or the message shape (`git grep -n "short_url" -- '*.test.ts' '*.spec.ts'`); a per-caller leg (AC1).
- [ ] **Task 2 — the migration 0167 (DR5, DR7).** `packages/domain/migrations/0167_sms-delivery-reports.sql` (hand-authored; the
      journal entry idx 167, `when` 1794195600011 — re-check T9): `sms_delivery_report_inbox` (global RLS — the 0049 shape) and
      `sms_send_deliveries` (tenant RLS — the 0128 policy shape; PK; CHECKs on `send_kind`, `delivery_state`, `match_state`, the
      `request_id` / `crqid` grammars); grants per DR5 / DR7 (+ a comment naming roster Row 26 for jobs' production role — F21). Drizzle
      schema files in `packages/domain/src/schema/` + their index export. Policy-regression specs for BOTH tables
      (`packages/domain/tests/integration/rls/`). ⛔ Touch any send table (I2).
- [ ] **Task 3 — the domain accessors.** `packages/domain/src/sms-delivery/` (new namespace): `persistSmsDeliveryReports(tx, rows)`
      (`ON CONFLICT DO NOTHING`, returns inserted count), `claimDueSmsDeliveryReports(db, {limit, leaseMs, now})` (the lease — T2;
      `clampLimit` default 200 / cap 500 — [[project_domain_limit_clamp_and_savepoint_retry]]), `settleSmsDeliveryReport(...)`,
      `upsertSmsSendDelivery(...)` (DR6 (c)'s absorbing rule IN SQL — `ON CONFLICT … DO UPDATE … WHERE` — ⛔ read-then-write),
      `lookupSendForCorrelation(db, kind, rowId)` (per-kind SELECT of `pariwar_id`, the outcome (pings: `send_outcome`),
      `provider_message_id`, the finalise timestamp (`updated_at` / pings `send_updated_at`) and `purpose` where the table has one),
      `pruneSettledSmsDeliveryReports(db, {olderThanDays})`, `readSmsSendDeliveries(tx, kind, rowIds)`. Unit + live legs.
- [ ] **Task 4 — the route (AC2–AC4).** `apps/api/src/modules/channel-webhooks/`: `msg91-sms-reports.ts` (the projection — DR2;
      pure, unit-tested exhaustively) + the handler in `handlers.ts` + the route in `routes.ts` (`schema: { hide: true }`, DR9's
      `rateLimit`). Global write: a plain `deps.pool` transaction with `SET LOCAL ROLE twt_app` (⛔ `openScopeTx` — ⛔ Pariwar); COMMIT
      before the 200 (I4). `apps/api/src/config.ts`: `smsReportWebhook: {tokenSecretName?, tokenEnvFallback, nextTokenSecretName?,
      nextTokenEnvFallback, rateMax}`; `deps.ts`: resolve the token(s) once at boot (⛔ refuse; one prod line when unset).
      `infra/dokploy/compose.yaml`: the secret-name lines on api (operator applies — the 6.30 precedent). `infra/cloudflare/waf.tf`:
      DR9's skip rule FIRST in the ruleset beside 6.30's, with its comment. `login-wall.spec.ts` allowlist entry. Tests:
      `apps/api/tests/integration/channel-webhooks-msg91.spec.ts` (copy `channel-webhooks-telegram.spec.ts`'s harness) + unit.
- [ ] **Task 5 — the correlator, prune, silence and OTP line (AC5–AC7, AC9, AC10).** `apps/jobs/src/sms-delivery-correlator.ts`
      (DR4, DR6, DR8 — the status table data-driven), `sms-delivery-prune.ts` (daily `'25 3 * * *'` IST), `sms-delivery-silence.ts`
      (DR12 + DR11's OTP line, daily `'40 3 * * *'` IST); queue constants in `packages/queue/src/index.ts`; registered in
      `apps/jobs/src/boot.ts` with the service pool (the `tg-webhook-processor` / `device-token-cleanup` wiring). Alarms through the
      jobs alarm sink (⛔ an id, ⛔ a number, ⛔ a request id in an alarm — the kind and counts only). Live tests :5433.
- [ ] **Task 6 — the gates and the untouched (AC8, AC12).** I2's and I8's diffs EMPTY; `pnpm --filter @twt/channels test:determinism`;
      `pnpm dlt-typed-variables:test && pnpm dlt-typed-variables:check` (`git add` new files first); the access-wrapper invariants; the
      AC13 recorder test.
- [ ] **Task 7 — D22, AS THE PANEL RULES (AC11). ⛔ START BEFORE the ruling is TRANSCRIBED** into the routing note's block and a
      Trustee-ratified decision entry (and the AC re-written to it). Under B1: ONE effective-outcome mapping (an `undelivered`
      `family_sms` row reads as `rejected_unreachable`) applied where the rows are READ — `readReturnFamilyRows` and the D20 / D31
      letter-eligibility and queue-status reads (`correction-letter.ts`, `correction-chase-read.ts` — Task 0.1's trace lists every
      reader; ⛔ a second copy of the mapping per reader); legs per AC11 incl. the four `assertClosureGround` callers and the letter
      form's eligibility; the Policy meaning re-checked. ⚠ The domain type change ripples into `correction-chase-read.ts` fixtures
      ([[feedback_story_validate_footguns]] #1 — domain vs contracts shape; ⛔ a contracts change is expected).
- [ ] **Task 8 — records and close (AC13).** `pnpm ci:local` at :5433; the deferred-work dispositions ([[feedback_closure_language_precision]]
      — ⛔ collapsed): *"⛔ DLT send consumes a delivery report …"* — under B, **Closed by** Task 7 for the CORRECTION CHASE's D22,
      **⛔ addressed** for the staff views (→ DR13's new item) and **narrowed** to silence (DR12); under A, **⛔ addressed — the Panel
      kept the gap** (cite the ruling); *"At-least-once SMS (inherited from 6.19b)"* and *"⚠ At-least-once family SMS"* — **partly
      addressed**: a second request for one send is now DETECTED and alarmed (DR6 (d)), ⛔ prevented (MSG91 has ⛔ idempotency key) ⇒
      OPEN, trigger *"a gateway idempotency key"*; *"MG5's content / DLT-id …"* — PQ2's carrier: annotate *"routed (note …)"*, ⛔ closed.
      NEW items: DR4's API-failed mapping (trigger Row 33 (e)); DR5's unused `delivered_at`; DR12 (b)'s pull; DR13's staff views. ⭐ The
      PQ2 note SENT by BigDev before the row is `done` (Row 32 note (6.4) — record the date; ⛔ "shown" before). The
      Change Log; the File List; the sprint row → `review`; the ledger line. ⛔ Fast-forward to `main` — BigDev's call.

## Dev Notes

### ⚠ TRAPS

1. **T1 — ⛔ Never call MSG91** — ⛔ a test, a script, a webhook configured from dev; ⛔ a "smoke" POST to a real MSG91 endpoint; ⛔
   the pull API (F9). I9's recorder enforces the send side; the webhook side is ours (`app.inject` only).
2. **T2 — ⛔ Copy the Telegram / WA drain's CLAIM.** It stamps `processed_at` in the claim ⇒ at-most-once (F19); copy only the cron
   registration and the per-row try / catch. The lease is the at-least-once mechanism (DR8).
3. **T3 — ⛔ Latest-wins.** `upsertWaSendStatus` regresses a status on a retried / out-of-order report (F19). DR6 (c) is absorbing, in SQL.
4. **T4 — A Cloudflare challenge pauses the webhook SILENTLY** (F6, F20) — DR9's skip and Row 33 (c); the silence alarm (DR12) is the
   only in-app detector.
5. **T5 — The global rate limit (300 / min per IP) would 429 a burst** ⇒ retries ⇒ auto-pause; set the per-route limit (DR9). ⚠
   Whether 429 counts toward SMS auto-pause is ⛔ documented (WhatsApp exempts it).
6. **T6 — The send tables are frozen ON PURPOSE** (0155's whole-row freeze; 0166's delivery-column guard; 0128 / 0138's narrowed
   grants and the `delivered_at` CHECK) — ⛔ UPDATE them (I2). The correlator READS them on the service pool.
7. **T7 — `"CRQID":"0"`** is MSG91's "none" (F3) — and `""` too; both ⇒ NULL ⇒ `unmatched:no_crqid`.
8. **T8 — Every field is a STRING; timestamps disagree in form** (F2, F3) — ⛔ arithmetic on `deliveryTime` / `requestedAt`; the
   correlator's clock is `received_at` (ours). Store `reported_delivery_time` as text for the record only.
9. **T9 — Four numbers race the 6-31 worktree** — migration 0167 (and its journal `when`), decision `-347`, ADR-0042, roster Row 33.
   Re-check `git log --all` and the 6-31 worktree at Task 0.1 AND right before each write; whichever lands first keeps the number.
10. **T10 — Migrations are hand-authored; ⛔ regenerate an applied one** (42P07); ⛔ `DROP SCHEMA`; edits reach :5432 AND :5433
    ([[project_live_db_test_gotchas]]). Push with `DATABASE_URL` at :5433 ([[project_prepush_hook_inherits_5432]]).
11. **T11 — The `dlt-typed-variables` gate reads COMMENTS** (6.37 T4): new `src` files outside `REGISTRY_FILES` must ⛔ spell the
    template-id prefix, `DLT_VAR` or the `{#var#}` literal.
12. **T12 — `PUBLIC_ALLOWLIST`** (`login-wall.spec.ts:28`) — the login-wall test fails without the entry; it needs a justification comment.
13. **T13 — The AI-5-1 constant-time gate covers `CHANNEL_ROOTS` only** (F18) — keep the handler in `channel-webhooks` or the
    timing-safe compare goes un-gated.
14. **T14 — Row 26 (`jobs-db-role`) is OPEN** (F21) — the new tables' grants follow the house (`twt_app`); name Row 26 in the migration
    comment; ⛔ invent a production role here.
15. **T15 — The 6.37 pins that turn red** — `sms.test.ts:254-258` (the body deep-equal; `:259` *"⛔ CRQID"*); the api whole-body
    checks `member-step-up-delivery-wiring.test.ts:213-215`, `sms-step-up-delivery.test.ts:304-308` (the OTP's `ot…` — inject the
    random source); the REQUIRED `ClaimDltSmsInput.correlation` breaks 51 direct core calls at runtime —
    `apps/jobs/tests/claim-correction-send.test.ts` (39), `msg91-real-client-caller.test.ts` (9), `msg91-no-network.test.ts` (3); any fake asserting
    `SmsGatewayMessage`'s exact keys, ADR-0041 `:48` / `sms-app.ts:303`'s comment. `git grep -n "CRQID\|short_url" -- packages apps`
    before declaring Task 1 done ([[feedback_story_validate_footguns]] #31).
16. **T16 — Prettier is ⛔ enforced** — hand-format ([[project_prettier_not_enforced]]); ⚠ `**cl.3**` inside a JSDoc closes it
    ([[project_markdown_emphasis_closes_jsdoc]]).
17. **T17 — Fastify** — a bodyless POST with `content-type: application/json` is a 400 before the handler
    ([[project_fastify_empty_json_body_400]]) — test what MSG91's empty body would do and route it to DR2's `unusable_body` if the
    module parser allows; ⛔ async `onSend` ([[project_fastify_onsend_doublesend]]).
18. **T18 — Content-type with a charset** — assert `application/json; charset=utf-8` reaches the scoped buffer parser (DR10).
19. **T19 — Contracts / jobs tests sit partly outside tsc** — run vitest per package ([[project_contracts_tests_outside_tsc]]); ⛔ a
    `@twt/events` import into domain ([[project_member_lifecycle_domain_substrate]] — turbo cycle).

### Reuse map

| Need | Reuse | ⛔ Rebuild |
|---|---|---|
| Static-header webhook | `receiveTelegram` (`channel-webhooks/handlers.ts:137-179`), `timingSafeEqualString` | a new compare |
| Raw-body JSON parser | the module's scoped parser (`channel-webhooks/routes.ts:31-38`) | a global parser |
| Global table RLS | 0049 `sms_rate_buckets_global_access` | a BYPASSRLS write from api |
| Tenant table RLS | 0128's policy block | a new policy shape |
| Cron registration | `tg-webhook-processor.ts:413-431` (registration only — T2) | its claim |
| Daily prune | `device-token-cleanup.ts` (`boot.ts:432`) | a new scheduler |
| Per-route limit | `kyc.routes.ts:31, :82` | `rateLimit: false` |
| Edge skip | 6.30's `app_link_verification_files_skip` (`waf.tf:41-63`) | a zone-wide change |
| Correlation-id plumbing | 6.37's per-send `values` binding in `SmsProviderDeps` (`sms-dlt.ts`) | a port change |
| Route test harness | `apps/api/tests/integration/channel-webhooks-telegram.spec.ts` | a new harness |
| Limit clamp | `clampLimit` (domain gate) | an unclamped `.limit()` |

### Testing standards

Vitest; inject `fetch` (6.37's house pattern); `app.inject` for the route (⛔ a network listener). MSG91 fixtures are the DOCUMENTED
samples (cite the help URL in a comment); codes with ⛔ documented sample (16, 17, 20, 25, an API-failed event) are labelled SYNTHETIC.
Live suites `describe.skipIf(!hasDatabase)` at :5433. A controllable clock for DR6's schedule and DR12's windows.

### Project structure notes

- **NEW:** `packages/domain/migrations/0167_sms-delivery-reports.sql` (+ journal); `packages/domain/src/schema/sms_delivery_report_inbox.ts`,
  `sms_send_deliveries.ts`; `packages/domain/src/sms-delivery/` (+ tests, two policy-regression specs);
  `apps/api/src/modules/channel-webhooks/msg91-sms-reports.ts` (+ tests); `apps/jobs/src/sms-delivery-correlator.ts`,
  `sms-delivery-prune.ts`, `sms-delivery-silence.ts` (+ tests); `docs/adr/ADR-0042-msg91-delivery-report-ingress.md`; the two routing notes.
- **UPDATE:** `packages/channels/src/providers/sms-app.ts`, `sms-dlt.ts`, `packages/channels/src/index.ts`;
  `apps/jobs/src/scheduler/claim-dlt-sms-send.ts`, `claim-correction-reminders.ts`, `claim-correction-closure.ts`,
  `claim-certificate-reminders.ts`, `claim-suspicion-notices.ts`, `claim-peer-mesh-requests.ts`; `apps/jobs/src/boot.ts`;
  `packages/queue/src/index.ts`; `apps/api/src/modules/channel-webhooks/{handlers,routes}.ts`, `apps/api/src/config.ts`,
  `apps/api/src/deps.ts`, `apps/api/src/modules/auth/shared/sms-step-up-delivery.ts`; `infra/dokploy/compose.yaml`,
  `infra/cloudflare/waf.tf`; `apps/api/tests/integration/login-wall.spec.ts`; Task 7 only (under B1): `packages/domain/src/claim/correction-reminder-record.ts`,
  `correction-closure.ts`, `correction-letter.ts`, `correction-chase-read.ts` (as Task 0.1's trace finds); the records (Task 0.4).
- **⛔ Touched:** `provider.ts`, `dispatch.ts`, `cascade.ts`, `render.ts`; every migration of the four send tables; any i18n file, any
  registry TEXT; `apps/mobile`, `apps/admin`; `packages/contracts` (⛔ expected — if Task 7 seems to need it, STOP and re-check DR13).

### Sequencing

6.37 (done) → **6.37b** (Tasks 0–6; Task 7 after PQ1's ruling) → roster Row 33 provisioned → Row 32 (i) / Row 33 (g) open the
claim-text template ids. OTPs (templates 15 / 16, Row 30 (b)) wait on ⛔ this row (they feed ⛔ D22) — their CRQID rides along.
6-31 (WhatsApp reminder) is independent but shares four number allocations (T9) and `claim_peer_mesh_pings` (it adds its OWN
columns — 0156 `:19`; this story adds ⛔ column there).

### Previous story intelligence (6.37)

- F9 (a `success` to a fake key) is WHY reports matter: `accepted` is "MSG91 took the request", ⛔ "the family got it".
- 6.37's review rounds found every place an UNDOCUMENTED provider shape was treated as proof (F2, P1) — DR4 applies the same rule:
  an unknown status ⛔ un-counts a send.
- 6.37's governance pattern: author-commit ALONE → records commit → code; the Panel gate read verbatim; corrections carried by the next
  entry, ⛔ edits (DR14 (c) owes `-346`'s).
- 6.37 ci:local: 36/36 on :5433; the admin jsdom-under-load timeout is a known re-run-alone case.
- 6.37 Debug Log (n): a timeout after MSG91 took the request is a may-have-sent retry — DR3 + DR6 (d) are what finally SEE it.

### Git intelligence

The last commits are 6.37's review round 2 (`dae96d9b`), its `-346` (`da27b82d`) and routing note (`252a6df0`), and its F1–F4 fixes
(`b90a319c`) — they touched `sms-app.ts`, `sms-preflight.ts`, `claim-dlt-sms-send.ts` and the five callers this story extends; re-read
them at Task 0.1.

### Latest tech information (fetched 2026-10-17 — docs / help pages ONLY; re-check at Task 0.1)

- SMS webhook (new): `https://msg91.com/help/webhook-new/how-to-receive-sms-delivery-reports-via-webhook-new` (2026-06-11);
  overview `https://msg91.com/help/webhook-new` (8 s, *"up to 4 times"*); auto-pause
  `https://msg91.com/help/webhooks/webhook-auto-pause-simple-explanation` (5 retries, 2% / ≥ 10, 48 h reset); logs
  `https://msg91.com/help/webhooks/webhook-logs` (*"under 5 seconds"*, HTTPS); legacy
  `https://msg91.com/help/webhooks/how-can-i-get-the-delivery-reports-on-my-webhook-url` (v2 form / v3 JSON; *"Webhook will not be
  sent for … 301 … 203 … 211"*; CRQID 52).
- Status meanings `https://msg91.com/help/delivery-report/what-is-the-meaning-of-different-status-in-the-delivery-reports`
  (2026-09-10); DLT reasons `https://msg91.com/help/delivery-report/dlt-related-failure-reasons` (2026-09-03); failure reasons
  `https://msg91.com/help/delivery-report/what-are-the-reasons-behind-a-failed-message`.
- CRQID `https://msg91.com/help/text-sms/custom-metadata-parameters-for-tracking-api-requests` (80, `_ . -`).
- Pipes `https://msg91.com/help/webhook-new/feature-webhook-pipes`; OTP webhook
  `https://msg91.com/help/webhook-new/how-to-receive-otp-delivery-reports-via-webhook`.
- Pull API `https://docs.msg91.com/sms/sms-logs.md` (2025-11-13; 3 days); analytics `https://docs.msg91.com/sms/sms-analytics.md`.
- **UNVERIFIED:** any signature; MSG91's source IPs; status 0 on "On Report Received"; `eventName` strings beyond `delivered`; which
  status a DLT failure carries; 16 vs 25; the API-failed payload; which fields are "stringified JSON array"; retries 4 vs 5 and
  timeout 8 s vs 5 s; 429 and auto-pause; un-pause and replay; ordering; whether a status can change after a final one; Flow `message`
  == webhook `requestId` in words; maximum report delay; CRQID 52 vs 80; whether Flow-sent OTPs reach the SMS webhook.

### References

- `.decision-log.md` — `2026-10-17-345` (MG1, MG9, MG14 (i), MG15, Consequences 3–4), `-346`, `2026-09-27-252` (cl.1–cl.3,
  Consequence 3 — TRUSTEE-RATIFIED), `2026-10-12-323` R2, `2026-10-10-314`, `2026-10-12-322` §0.
- `_bmad-output/implementation-artifacts/6-37-msg91-sms-gateway-adapter.md` (F9, F14, F18, F19, MG1, MG9, MG15, T1, Debug Log (n));
  `6-19-correction-return-reminders-and-closure.md` (AC3, AC5, AC6); `6-27c-peer-mesh-sending-texts-and-links.md`.
- `_bmad-output/planning-artifacts/trustee-panel-routing-note-TEMPLATE.md`; `…-2026-09-20-6-19-reached-before-closure.md` (the
  options `-252` chose between — its option B's cost line); `…-2026-10-17-6-37-name-too-long-for-the-text.md` (written, ⛔ sent).
- `docs/adr/ADR-0029-…` (webhook precedent), `ADR-0041-sms-gateway-msg91.md`, `_adr-template.md`; `docs/knowledge-transfer/adr-index.md`.
- `docs/launch-gate-inventory/inventory-roster.md` Rows 26, 30, 32.
- architecture.md §3.11 (`:2572-2585`), §3.12 (`:2587-2604`), §2.11 rate limits (`:1768-1788`), §5.9 secrets (`:3520-3531`), edge
  bar (`:3492-3493`), module placement (`:4742`).

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

- Ultimate context engine analysis completed — comprehensive developer guide created (`bmad-create-story 6.37b`, 2026-10-17; four
  parallel research passes: the send tables + D22, the governance records, MSG91's live help / docs pages, the webhook house patterns).

### File List

## Change Log

| Date | Version | Change |
|---|---|---|
| 2026-10-17 | 1.0 | Created by `bmad-create-story 6.37b` at `dae96d9b` (worktree `.claude/worktrees/6-37b`). F1–F24 found; DR1–DR14 PROPOSED (⏳ Task 0.2); PQ1 (reported-undelivered vs `-252` cl.1) and PQ2 (content-mismatch refusal — Row 32 note (6.4)) to be ROUTED at Task 0.3. ⭐ DR3 — correlate by our own row id in `CRQID` (supersedes `-345` MG9's "⛔ CRQID"); I1 — a report only subtracts reach. Status `ready-for-dev`, buildable after Task 0; Task 7 waits for the Panel. |
| 2026-10-17 | 1.1 | Create-story's own validation (one fresh-context read-only verifier, `checklist.md`): 2 HIGH / 8 MED / 9 LOW, all applied. ⭐ HIGH 1 — under PQ1 B with letter-eligibility unchanged, a person reported undelivered was never reached AND never letter-eligible (D20 / D31 need a SEND-time dead outcome) ⇒ the claim could never close (the 2026-09 rejected cost, against cl.2) ⇒ PQ1 split into B1 (an undelivered report reads as `rejected_unreachable` everywhere — our reading) / B2; the Policy meaning, AC11 and Task 7 rewritten. HIGH 2 — DR12's silence alarm counted 0128 `staff_push` rows (FCM, ⛔ CRQID) ⇒ fired daily ⇒ SMS purposes only, `send_outcome` for pings, 48 h. Also: DR6 ordered (finished non-accepted ⇒ `other_attempt`; a staff-push CRQID ⇒ `unmatched:not_sms`); the supersession list (MG1's "delivery state on the five send tables" and "correlation by request id + recipient"; the OTP quote attributed to the story file); cl.1's two readings (match / narrow); the 6.37 tests that turn red (2 api whole-body checks, 51 core calls; an injectable OTP random); I2's diff command (quoted full paths + 0054); Bot Fight Mode and leg ORDER on Row 33 (token → edge → webhook); Row 33 (e) proves the `requestId` match; PQ2 SENT before `done` and its fact marked inference; a bad `request_id` ⇒ ⛔ row (200 + alarm); the settle compare-and-set; DR11's reason; F19 (latest-wins IS tested); cites (README `:79-82`, `handlers.ts:146`, `sms.test.ts:254-258`, 0049 `:40`). |
