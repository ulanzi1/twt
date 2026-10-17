---
baseline_commit: dae96d9b
---

<!--
PINNED: `dae96d9b` (2026-10-17 — `main` == `origin/main` after a fresh `git fetch`; Story 6.37 `done`). Every `file:NNN` below is AS
OF that sha; Task 0.1 re-checks what moved. Built in its OWN worktree `.claude/worktrees/6-37b`, branch
`story/6-37b-msg91-delivery-reports` ([[feedback_commit_on_story_branch]], [[feedback_shared_tree_branch_switch]]). ⚠ A peer worktree
`.claude/worktrees/6-31` (row 6-31, also at `dae96d9b`) has ALREADY WRITTEN — uncommitted, 2026-10-17 — its own claims on migration
0167, decision id `-347`, roster Row 33 and ledger suffix `2026-10-17k` (T9). Whichever lands on a branch first keeps the number.

STATUS: `in-progress` — Task 0 is DONE (2026-10-17): DR1–DR14 + DR5-G recorded as `-347` (`bf1d57f7`); the Panel ruled PQ1 and its
follow-ups (`-350`, `-351`, `-352`); PQ2 was withdrawn (`-348`). ⭐ SPLIT (`-353`): Task 7 — the Panel's delivery ladder and the "not
delivered" conclusion — is now row `6-37c-undelivered-reminder-ladder`. THIS story builds Tasks 1–6 (receiving and recording reports,
changing nothing a person receives) and closes with Task 8. No claim-text template id until Row 33 has closed AND 6-37c is `done`.

§0 GATE (the routing template's): every DR below is the AUTHOR's — how a provider callback is authenticated, what is kept of it, how
it is matched to a send, where the result is stored, how long the inbox lives (`-314` §0: *"which vendor carries the texts … ⛔ who
is texted, ⛔ when"*). ⭐ TWO questions are the PANEL's, routed by Task 0.3 and ⛔ settled here:
**PQ1** — does a send the network REPORTS it could not deliver still count as "reached" before a claim is closed for silence, and
does it make the person letter-eligible (`-252` cl.1 / cl.2 — Trustee-ratified; `-345` §0 (1), MG1, Consequence 4)? — it changes WHEN
a family's claim can be closed and WHO is offered a letter ⇒ "what the Trust OWES a family" + a ratified clause matched or narrowed
(the template's §0). **PQ2** — whether a PROVEN content mismatch
should REFUSE a correction / closure / certificate text (`-345` §0 / Consequence 3; roster Row 32 note (6.4): *"ask it with row
6-37b's create-story"* — the question is WRITTEN here and the note itself is written at Task 0.3, because the note's E3 needs DR3 /
DR6 answered first; note (6.4) is advisory and Task 8 holds the stricter bar, SENT before `done`) — refusing a text changes WHO is
texted (`-322` §0 option (a)). ⚠ Both read verbatim below ([[feedback_panel_gate_read_ratified_verbatim]]). ⚠ Kept OUT of the Panel
(the author's, each because it changes ⛔ nothing a person receives or is owed): recording reports; matching them; the OTP tag (DR11);
showing nothing new to staff in Tasks 1–6 (DR13). ⚠ A MIXED part, disclosed in PQ1's note (the template: *"say in the note that you
have done so"*): which status codes count as `undelivered` (DR4) and that `undelivered` is absorbing (DR6) stay the author's, but under
B1 they decide who becomes letter-eligible — PQ1's E3 states both and B1's cost carries them.

GLYPH REGISTER: `⛔` negates the word it precedes; `⭐` emphasis / action; `⚠` a hazard. ⛔ No `file:NNN` into `.decision-log.md`,
`deferred-work.md` or `sprint-status.yaml` (newest-first files) — cite the decision id, the item's phrase, or the row key.

LETTERS: F = found facts (F1–F24); DR = build decisions (DR1–DR14 + DR5-G — DECIDED by BigDev at Task 0.2, recorded as `-347`); PQ = Panel questions (PQ1–PQ2 —
routed, ⛔ answered); I = invariants (I1–I9); T = traps (T1–T22). Decision-entry letters stay the entry's own (`-345` MG1–MG17,
`-252` cl.1–cl.3, `-323` R2).
-->

# Story 6.37b: The Trust learns whether each text actually arrived — MSG91's delivery reports, received, kept without the phone number, matched to the exact send, and (once the Panel rules) a text the network reports undelivered no longer counts as "reached" `[PRIMITIVE]`

Status: in-progress

> ⭐⭐ **WHAT THIS STORY IS, IN ONE PARAGRAPH.** Story 6.37 sends every SMS through MSG91, but MSG91's answer at send time is only
> *"request received"* — HTTP 200 `type:"success"` even for a fake key (6.37 F9). Whether the operator delivered the text arrives
> LATER, as a **delivery report** POSTed to a webhook we configure in MSG91's panel (F1–F8). Today ⛔ report is received, so a text
> DLT scrubbed, an operator refused, or a switched-off phone never got is recorded `accepted` — and on the correction chase 6.19c's D22
> `reachedBySms` counts the family REACHED, the input of the Trustee-ratified `-252` closure-for-silence (`-323` R2, `-345` MG15). This
> story: (1) tags every send with a **correlation id** (`CRQID` = a kind prefix + the send row's own id — DR3) that MSG91 echoes back;
> (2) adds a public **webhook** in `apps/api` that checks a static secret header (MSG91 has ⛔ signature — F4), keeps ONLY an
> allowlisted projection of each report (⛔ the phone number — DR2), and ACKs (persist-then-ack, architecture §3.11); (3) a **jobs
> correlator** that matches each report to its send row and records `delivered` / `undelivered` in ONE new table (⛔ a write to the
> four frozen send tables — I2); (4) a **silence alarm** for a paused webhook; and (5) — ⭐ only after the Panel rules on PQ1 — the
> one-line D22 change. It also lands ADR-0042 (the webhook's deviation from §3.11's "verify the signature"), roster Row 33 (the
> webhook provisioned), and the `epics.md` entry. ⛔ No text's wording changes; ⛔ no template is provisioned; ⛔ who is texted or when
> changes before PQ1's ruling.

> **What already ships and this story READS — rebuild ⛔ none of it:**
> - The MSG91 Flow client `packages/channels/src/providers/sms-app.ts` — `buildFlowBody` (`:303-308`, today *"⛔ `CRQID`"*; the body is
>   exactly `{template_id, short_url:'0', recipients:[{mobiles, …values}]}`), the reserved recipient keys in `localRefusal`
>   (`:316-320`), the 24-hex template id, the `≤ 64 [A-Za-z0-9]` request id (`:191`, used `:401`), `redirect: 'error'` (`:375`), the 9 s
>   signal (`:182`).
> - The send core `apps/jobs/src/scheduler/claim-dlt-sms-send.ts` `sendClaimDltSms` (`:230-238` overloads; `ClaimDltSmsInput` `:111-133`;
>   the house rule *"A throw is a crash, ⛔ a final"* `:119-124`) and its five callers — THREE through the wrapper
>   `sendClaimCorrectionSms` (`claim-correction-reminders.ts:224-246`): correction reminder (`:430`), closure notice
>   (`claim-correction-closure.ts:371`), certificate reminder (`claim-certificate-reminders.ts:658`); TWO direct: suspicion notice
>   (`claim-suspicion-notices.ts:457`), peer-mesh request (`claim-peer-mesh-requests.ts:689`). Each row is claimed `attempting` in a
>   COMMITTED `withPariwarScope` tx BEFORE the send, and each caller holds its uuid row id (`begun.reminderId` ×3, `begun.noticeId`,
>   `pingId` `:588`). A may-have-sent retry re-claims the SAME row (`attemptCount + 1`) ⇒ same CRQID, new request id.
> - The OTP adapter `apps/api/src/modules/auth/shared/sms-step-up-delivery.ts` — calls `deps.messaging.send({to, templateId, values,
>   body})` DIRECTLY (`:206`, ⛔ through `SmsProviderDeps`); returns `gatewayMessageId` (`:203-216` — ⛔ read by any caller); its deps
>   `SmsDltStepUpDeliveryDeps` (`:63-86`) have ⛔ random source today.
> - The house static-header webhook: `receiveTelegram` (`apps/api/src/modules/channel-webhooks/handlers.ts:137-179`) — header read,
>   timing-safe compare (`:148`), `403 webhook.signature_rejected`, `200 {received:true}` (`:178`); ⚠ it resolves its secret PER REQUEST
>   (`deps.resolveChannelSecret`, `:145` — uncached in prod, `deps.ts:398-401`) and opens `openScopeTx` per Pariwar — ⛔ the pattern for
>   either (I4, DR1). The boot-resolved-secret precedent is `buildTurnstileVerifier` (`apps/api/src/deps.ts:129-143`). The module's
>   raw-body parser (`channel-webhooks/routes.ts:31-38`, `index.ts:19-21` — one scoped `application/json` `parseAs:'buffer'` parser).
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
| `2026-10-17-346` | MG3 helpline exemption; MG7 unlisted code → status class; MG5 transient cached 60 s. Its Status is WRONG TWICE (the 6.37 story file's D1 correction block): (1) *"decisions 2 and 3 precede their code"*, and (2) it attaches `fe3dc2c4` / `88e1ec97` to decision 1 — the right attribution is decision 1 = `4c03aed1`, decision 2 = `88e1ec97`. The D1 block says *"the next decision entry that touches this story carries the same correction"*; plus the two dated `-346` §0 corrections (6.37 Debug Log (a), (p)). ⇒ this story's author-commit carries all of them (DR14 (c)). | author-commit |
| **`2026-09-27-252`** | cl.1 *"A closure may be **requested** only when, for **each** person who must be reached, ≥ 1 reminder was **accepted** by the network (or shown **delivered**, where a report exists) — **or** a posted letter has a **recorded delivery date**."* cl.2 *"A FAMILY NO CHANNEL CAN REACH IS OFFERED THE LETTER ROUTE — as for an invalid number."* cl.3 *"[Trustee-ratified, as intent only] PROVEN DELIVERY (option B) MAY BE BUILT IN A FUTURE VERSION. ⛔ Not now."* The Panel's answer: *"Option A, in future version we may want to build option B, but for now option A is fine."* — B was DEFERRED, ⛔ rejected. Consequence 3: *"a delivery-report integration (SMS DLR; …) would need its own row."* ⚠ The entry's own *"Our reading — ⛔ NOT RATIFIED"*: the Panel chose cl.1 *"knowing 'accepted is not received'"*. | ⭐ **TRUSTEE-RATIFIED** (Dhiraj Rahul + Kalpana Bharti; cl.3 as intent only) |
| `2026-10-12-323` R2 | *"if it arrives only in an asynchronous delivery report (this repo consumes ⛔ delivery report), the send is recorded `accepted` and 6.19c's D22 `reachedBySms` counts the family REACHED … PRE-EXISTING for EVERY DLT rejection cause."* | author-commit (accepted cost) |
| `2026-10-10-314` | decision 2: *"… delivery-report correlation …"* (moved to this row by `-345` MG1). | author-commit |
| `2026-10-12-322` §0 | the rejected (a) / (c) *"would have changed WHO is texted or WHEN on the correction, closure and certificate paths — and through D22's `reachedBySms` the input of the Trustee-ratified `-252` closure-for-silence — and so would have been the Panel's"*. | author-commit |
| Roster Row 32 | (i) *"row `6-37b-msg91-delivery-reports` is `done` BEFORE ANY claim-text template id (templates 1–14) is provisioned — … this is what keeps `-345` MG15's reading of the Trustee-ratified `-252` cl.1 the author's (if this leg is ever dropped, that question is the Panel's)"*; note (2) *"check the balance and the key's rule BY EYE … until row 6-37b reports delivery"*; note (6.4) PQ2's carrier. | go-live gate — ⛔ a merge fence |
| ADR-0041 | `:48` *"⛔ `CRQID`"*; `:81` *"Delivery reports are ⛔ consumed here — they are row `6-37b-msg91-delivery-reports` (`-345` MG1)"*; `:106-107` *"MSG91 has ⛔ request signature on its delivery webhooks (static headers only) — row 6-37b's concern."* | `drafted` |
| ADR-0029 | the WhatsApp webhook: per-Pariwar signed URL, persist-and-ack + pg-boss drain (§3.11). The precedent this story DEVIATES from (⛔ signature exists — DR1 / ADR-0042). | ratified |
| architecture §3.11 | *"1. **Verify** provider signature at handler entry … 2. **Persist** … 3. **ACK** … 4. **Return.** No business logic, no synchronous downstream calls"* (`architecture.md:2572-2585`); §5.9 *"Webhook signing secrets: rotated on a committed cadence; rotation coordinated with provider via dual-secret window"* (`:3520-3531`); edge *"Ingress signature verification"* (`:3492-3493`). | architecture |
| deferred-work | *"⛔ DLT send consumes a delivery report — a rejection seen only there is recorded `accepted` …"* (closer: 6-37b); *"At-least-once SMS (inherited from 6.19b)"*; *"⚠ At-least-once family SMS"*; *"MG5's content / DLT-id / `sms_type_needs_unicode` checks are alarm-only …"* (PQ2's second carrier). | open |

## ⭐ THE INVARIANTS

1. **I1 — A report can only SUBTRACT reach, never add it** (true under PQ1 A, B1 and B2; under C a `delivered` report ADDS reach, so
   I1 fails and C needs an ADR-0042 amendment before Task 7 builds it). Every effect of a report on any predicate excludes a send from "reached";
   ⛔ a report ever makes a send count that did not count before (`accepted` already counts — a `delivered` report adds nothing to
   D22). ⇒ a forged report (anyone holding the header token) can ⛔ cause a closure (`assertClosureGround` closes only on
   `reach.allReached` — `correction-closure.ts:478-479` — and a report never ADDS an `accepted` row, the only thing `reachedBySms` counts). ⚠ Under PQ1 B1 it CAN, for one person:
   (i) DELAY that person's closure ground; (ii) make them letter-eligible and `unreachable` for the rest of the current-number epoch
   (`foundDeadOn` is the FIRST dead outcome — `correction-chase.ts:758,765` — so a later `delivered` report does ⛔ undo it); (iii)
   change WHO is contacted — the closure notice goes by LETTER instead of SMS (`closureNoticeRecipients`, `correction-closure.ts:434-435`, when it is the
   last evidential attempt), and the sweep starts the District Admin's letter-chase rows (found-dead +7 … +12) and the +13 Pariwar
   Admin escalation (`claim-correction-reminders.ts:1253-1290`). All three are in ADR-0042's forgery bound and PQ1's B1 cost. Pinned
   by a test per reader.
2. **I2 — The four send tables (five send kinds) are ⛔ written by this story.** ⛔ `UPDATE` of `claim_correction_reminders` / `claim_certificate_reminders`
   / `claim_suspicion_notices` / `claim_peer_mesh_pings`; ⛔ change to their triggers (0155's finished-row freeze, 0166's
   `claim_peer_mesh_pings_guard_delivery`) or grants; `delivered_at` (0128 / 0138) stays NULL (DR5). Proof: `git diff --stat main --
   packages/domain/migrations ':(exclude)packages/domain/migrations/0167*' ':(exclude)packages/domain/migrations/meta/_journal.json'`
   EMPTY (⛔ an existing migration moves — this covers 0054 / 0128 / 0130 / 0135 / 0138 / 0141 / 0151 / 0155 / 0156 / 0157 / 0163 /
   0166 and every other one; quoted — zsh), AND `grep -nE 'claim_(correction_reminders|certificate_reminders|suspicion_notices|peer_mesh_pings)'
   packages/domain/migrations/0167*` EMPTY (0167 names ⛔ send table — ⛔ even in a comment: comments say the KIND, `cr` / `ce` / `sn` /
   `pm`; ⛔ index is needed — DR3).
3. **I3 — ⛔ phone number from a report is stored, logged or alarmed.** The handler persists an ALLOWLISTED projection (DR2) — ⛔ the
   raw body, ⛔ `telNum`, ⛔ `senderId`, ⛔ `credit`, ⛔ `userId`, ⛔ `DLT_TE_ID`. A test posts a body carrying `telNum` and asserts no
   column, log line or alarm holds it (a recorder on the logger). ⚠ Node 22's `JSON.parse` error message QUOTES the body (*`Unexpected
   token '}', ..."5678","x":}" is not valid JSON`*), and an uncaught throw is logged with `err` by `errorMappingHandler`
   (`apps/api/src/middleware/error-mapping/index.ts:690`) ⇒ the handler CATCHES the parse error itself and ⛔ logs the error or its
   message (DR10).
4. **I4 — Persist-then-ack, nothing else in the handler** (§3.11): verify the header → insert ONE projected row per report (`ON
   CONFLICT DO NOTHING`) → COMMIT → `200`. ⛔ correlation, ⛔ KMS, ⛔ Secret Manager call per request (the token is resolved at boot), ⛔
   an outbound call. A duplicate is a `200` no-op.
5. **I5 — The token rides in a HEADER, never the URL** (Traefik logs the query string — `infra/dokploy/README.md:79-82`), compared
   timing-safe (`timingSafeEqualString`, `channel-webhooks/signature.ts:45-50`), resolved ONCE at boot (DR1). ⚠ The header is named
   `x-twt-msg91-secret-token` and read as an INLINE literal in the handler — the AI-5-1 gate only treats a function as a verification
   context when its own nodes hold an `x-*-signature[-256]` / `x-*-secret-token` literal, a `resolve*Secret` call, `createHmac` or an
   approved comparator (`scripts/access-wrapper-invariants/lib.ts:197-200`, `:259-272`); a boot-resolved token under any other header
   name makes the gate VACUOUS (an `===` passes un-flagged — T13).
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
reading, the dead-number facts that make a person LETTER-ELIGIBLE and pick the closure notice's channel: D31 letter-eligibility is
`state.track.foundDeadOn !== null` (`correction-letter.ts:185`; D20 / D31 `:4-5`) where `foundDeadOn` is the FIRST dead outcome in the
current-number epoch (`correction-chase.ts:758,765`); the queue status (`correction-chase-read.ts:120-128`, dead *"WINS over
'reached'"*); `numberKnownDead` (`correction-closure.ts:377-382`, the LAST evidential row — it chooses closure LETTER vs closure SMS,
`:434-435`, ⛔ eligibility); and the jobs sweep's letter chase / escalation (`claim-correction-reminders.ts:1123-1290`). Under our
reading (PQ1 option **B1**) a reminder REPORTED undelivered is treated, by every one of those readers, as a reminder the network
REFUSED at send (`rejected_unreachable`).
In the family's terms: ⭐ *"a reminder the phone network reported it could not deliver to you is treated like one the network
refused: it no longer counts as having reached you — so your claim cannot be closed for your silence on the strength of it — and the
District Admin is offered the posted letter for you instead."* Its cost to the family: their closure ground is harder to meet and a
letter may be posted where one later text would have got through (a phone switched off for a day reads as unreachable — and stays
`unreachable` for that number even if a later text is reported delivered, because letter-eligibility keys on the FIRST dead outcome)
— SLOWER, ⛔ worse for them. ⚠ Without the letter half (option **B2**) a person whose reminders are all reported undelivered is ⛔
reached AND ⛔ letter-eligible (letter-eligibility needs a SEND-time dead outcome today) ⇒ their claim can never be closed for silence
— by ANALOGY the cost the 6.19 note gave its option B (proven delivery only: *"the claim waits forever again"*; `-252` chose A *"for
now"* and kept B as intent only — cl.3 — ⛔ rejected it), and against cl.2 (*"A FAMILY NO CHANNEL CAN REACH IS OFFERED THE LETTER
ROUTE"*). ⚠ Neither means *"a text with no report is not reached"* — silence (a paused webhook, a report
that never comes) still counts as `accepted` (DR12 alarms it; the residual PQ1 names). Tasks 1–6 introduce no predicate that decides a
send, a closure, reach or letter-eligibility, and change none. They READ reports in exactly three ways, none of which changes what a
person receives or is owed: the correlator writes `sms_send_deliveries` (DR6); alarms are raised from reports and from their absence
(DR4, DR6, DR12's silence alarm — an alarm is a pointer for a person, never an input to a send); and login-code reports are counted
in DR11's daily line (information only until Row 33 (e0), then citable as delivery evidence — still never an input to a send). ⚠ They DO change what goes on the wire — a `CRQID` inside the recipient of every claim text AND every login
code — ⛔ who is texted, when, or the words; the one person-facing risk (MSG91 refusing a request that carries it with ⛔ error
reaching our system — 6.37 F9; F8 — so a member's login code never arrives) is checked by DR11 (c)'s operator device proof from
the CRQID build on staging BEFORE production (a dated Row 30 note — Task 0.4). A malformed id — reachable only through a code bug
(the id is the row's own uuid; AC1's core leg pins it) — is a crash, ⛔ a final: it keeps the bad id OFF the wire and the core logs
ONE line before each throw (pg-boss swallows a handler's throw — DR3), but the row's give-up (`exhausted:*`) still records `error`
a day or three later, so the once-only text is still lost (DR3).
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
  parameter you can pass in the API payload. You will receive the same value in the webhook"*; *"Supported in all versions of webhook
  and delivery reports"*. ⭐ PLACEMENT: the ONLY Flow-specific sample (the legacy webhook page, *"V5 or FLOW API"*) puts it INSIDE the
  recipient — `"recipients":[{"mobiles":"919999999999","var":"XYZ","CRQID":"Beta1"}]`; the *"Bulk / Single: Pass one CRQID at the top
  level"* / *"Advance: … inside each entry of the recipients array"* text is the TEXT-SMS custom-metadata page, which names ⛔ endpoint
  and ⛔ Flow; the Flow API reference (`docs.msg91.com/sms/module.json`) lists ⛔ `CRQID` at all (body keys `template_id`,
  `short_url`, `short_url_expiry`, `realTimeResponse`, `recipients`) ⇒ inside the single recipient (DR3), UNVERIFIED until DR14 (c)
  Row 33 (e0). ⚠ Limits conflict: *"Alphanumeric + _ . -"*, *"Maximum length: 80"* (2026 page) vs *"only allows alphanumeric …
  Maximum characters allowed in CRQID: 52"* (legacy) ⇒ use ≤ 52 alphanumeric.
- **F8 — Account faults and API failures.** Legacy: *"Webhook will not be sent for following API failure error codes - 301 :
  Insufficient Balance - 203 : Invalid Sender ID - 211 : Empty DLT ID"*; the new webhook has an *"API Failed Events"* type whose
  PAYLOAD is ⛔ documented. ⇒ a zero-balance send may produce ⛔ "On Report Received" at all (UNVERIFIED either way — DR4, Row 33 (e))
  ⇒ roster Row 32 note (2) (*"check the balance … BY EYE … until row 6-37b reports delivery"*) is ⛔ discharged by this story — only
  DR12's 48 h silence alarm HINTS at a balance fault (DR14 (c)).
- **F9 — Pull API (documented, ⛔ called):** `POST /api/v5/report/logs/p/sms?startDate=&endDate=` (`authkey`; *"Range … 3 days"*;
  `requestId` filter; fields incl. `status`, `statusCode`, `failureReason`); errors as HTTP 200 `{"error":"…"}`. Panel exports cover
  100 days. ⇒ a reconciliation fallback for a paused webhook — OUT of this story (DR12 (b)).
- **F10 — OTP.** SendOTP has its OWN webhook (*"OTP » Webhook"*); our OTPs go through FLOW (6.37 MG2) ⇒ they are SMS submissions and
  should reach the SMS webhook (INFERENCE, ⛔ stated).

**The code today**
- **F11 — ⛔ Report is received anywhere.** `getStatus` returns `unknown` (*"its delivery reports are row 6-37b"*, `sms-dlt.ts:99-102`);
  `buildFlowBody` sends ⛔ `CRQID` (`sms-app.ts:303-308`; pinned by the whole-body equality `packages/channels/tests/sms.test.ts:254-258` + its comment `:259`; ADR-0041 `:48`).
  Comments naming row 6-37b that go stale with it: `sms-app.ts:18`, `sms-dlt.ts:100`, `sms-errors.ts:15`, `sms.test.ts:93`,
  `apps/jobs/src/sms-otp-preflight.ts:6` (re-locate each at Task 1). `getStatus` STAYS `unknown` (reports arrive by webhook, ⛔ a poll — I8).
- **F12 — The send tables.** `claim_correction_reminders` (0128; reminder `purpose='family_sms'` + closure notice
  `'closure_notice'`, 0135; ⚠ staff rows `staff_push` hold an FCM id in the SAME `provider_message_id`, `claim-correction-reminders.ts:617-631`),
  `claim_certificate_reminders` (0138 / 0141), `claim_suspicion_notices` (0151 / 0155), `claim_peer_mesh_pings` (0054 / 0156 / 0166).
  Every one stores the accepted id in `provider_message_id` (finalisers: `correction-reminder-record.ts:252`, `certificate-reminder-record.ts:249`,
  `suspicion-notice.ts:888`, `peer-mesh-request.ts:510`) and ⛔ indexes it. `recipient_number_hash` = a PER-PARIWAR blind index
  (`correction-crypto.ts:57-60`) ⇒ ⛔ computable from a report alone. The columns the correlator and DR12 read (all four have
  `pariwar_id` and `recipient_number_hash`; every row id is a uuid PK — 0128 `:29`, 0138 `:21`, 0151 `:18`, 0054 `:65`):

  | Table | Row id | SMS rows | Outcome | Finalise timestamp |
  |---|---|---|---|---|
  | `claim_correction_reminders` | `reminder_id` | `purpose IN ('family_sms','closure_notice')` (⚠ `staff_push` holds an FCM id even on `error`, `claim-correction-reminders.ts:631`) | `outcome` (incl. `attempting`) | `updated_at` (`clock_timestamp()`, `correction-reminder-record.ts:255`) |
  | `claim_certificate_reminders` | `reminder_id` | only `family_sms` can be `accepted` (0141 `:12-13`) ⇒ `outcome='accepted'` suffices | `outcome` | `updated_at` |
  | `claim_suspicion_notices` | `notice_id` | all three purposes (`suspicion_refusal`, `closed_after_appeal`, `refusal_appeal_notice` — 0151 `:38`) are SMS | `outcome` | `updated_at` (frozen once finished — 0155) |
  | `claim_peer_mesh_pings` | `ping_id` | ⛔ purpose column — every sent ping is SMS | `send_outcome` (NULL = ⛔ begun; `attempting` …) | `send_updated_at` (`peer-mesh-request.ts:514`) |
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
  closure notice, certificate reminder (CR12), suspicion notice and peer mesh ⛔ do. Every family-SMS reader goes through
  `readReturnFamilyRows` → `readReturnPersonStates` (`correction-reminder-record.ts:824`), which feeds `correction-letter.ts:181`
  (eligibility, enforced server-side by `assertCorrectionLetterRecordable` `:237`), `correction-chase-read.ts:345-361` and
  `correction-closure.ts:409` — AND the jobs sweep (`claim-correction-reminders.ts:1123` states, `:1144` D30, `:1167`, `:1210` D21
  `everyoneDelivered`, `:1253-1290` letter chase / +13 escalation). ⚠ `readReturnFamilyRows` does ⛔ select `reminder_id` today. ONE
  raw-SQL reader bypasses it: the `-269` §4 burst alarm (`claim-correction-reminders.ts:751-756`, `outcome = 'rejected_unreachable'`;
  its comment: *"a content-level block would make everyone letter-eligible"* — PQ2's DLT-scrub case). Unaffected by B1: the
  `:1146-1153` `DISTINCT ON` (skipped_superseded only) and `readRunFamilyRows` (`:1118`, slot days). Letter-eligibility of the
  CERTIFICATE chase (`certificate-reminder.ts:809,818`) reads its own table — unchanged by B1. PQ1 trace (cheap answers, re-confirmed
  at Task 0.1): the sweep touches OPEN runs only (`claim-correction-reminders.ts:818`, `r.ended_at IS NULL`) ⇒ after day 90 ⛔
  reminder, ⛔ letter chase, ⛔ +13 escalation fires; letters stay recordable after the run ends (`correction-letter.ts:10-11`,
  `-250` #4); `closure_due` (days 90–96) and `closure_escalation` (day 97) fire whether or not anyone was reached
  (`packages/domain/src/claim/correction-closure-jobs.ts:259-288`; constants `:74-75`); there is ⛔ end-of-chase state — a never-reached person keeps closure refused
  `not_reached` until a letter's delivery is recorded. ⇒ a failure reported on the LAST reminder (day 84 — `CORRECTION_REMINDER_DAYS`, `correction-schedule.ts:24`), or any report
  arriving after day 89, makes the person letter-eligible but the District Admin is ⛔ letter-chased for them — as already happens
  today for a number refused at send on day 84.
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
  `apps/api/src/modules/channel-webhooks` (`scripts/access-wrapper-invariants/check.ts:69-77`) — but flags a compare ONLY inside a
  "verification context" (I5: `lib.ts:197-200`, `:259-272`); probed: a handler comparing a boot-resolved token with `===` under
  `x-twt-msg91-token` is ⛔ flagged, nor is a compare inside a `.some(t => …)` arrow; it IS flagged with an inline
  `'x-twt-msg91-secret-token'` literal and DIRECT compares. Every public route must be in `PUBLIC_ALLOWLIST`
  (`apps/api/tests/integration/login-wall.spec.ts:28` — a Set of `"METHOD url"` keys with comments; precedents `:79`, `:290-298`).
  Existing paths `/api/v1/webhooks/{whatsapp,telegram}/:pariwarId`; Traefik routes `PathPrefix(/api/v1)` (`compose.yaml:36`). Node
  joins a repeated header with `", "` (⛔ an array in production — an array arises under `app.inject` only; Telegram takes
  `provided[0]`, `:147`). The api has ⛔ alarm sink: ad-hoc `request.log` / `console.error` (`deps.ts:342`); the test log recorder is
  `buildServer(deps, { logStream })` (`server.ts:91-111`; precedent `tests/integration/claims/correction-closure.spec.ts`). The api's
  global-table writes set ⛔ role today (`otp-rate-limit.ts:59-76` bare `deps.pool.query`; `admin-auth.repo.ts:117-136` BEGIN only);
  `sms_rate_buckets` has ⛔ api writer (`checkAndConsumeSmsBudget` has ⛔ caller); `SET LOCAL ROLE twt_app` is `apps/api/src/modules/multi-tenant/scope-tx.ts` `:24-38`'s
  shape (the login role is a `twt_app` member); `openScopeTx` is ⛔ reusable for a global write because it calls `setPariwarScope`
  and the inbox has ⛔ Pariwar; `closeScopeTx` (`:67-78`) RETHROWS a failed COMMIT (since `eb6d2769`, 2026-10-15) — the global
  write keeps that behaviour.
- **F19 — The drain trap.** `claimUnprocessedWebhookEvents` stamps `processed_at` IN the claim (`telegram-opt-in/webhook-events.ts:57-74`)
  ⇒ at-most-once; the comment *"the event stays unprocessed and retries next tick"* (`tg-webhook-processor.ts:398-399`) is FALSE. The
  WA status branch `upsertWaSendStatus` is latest-wins (`channel-config/wa-status.ts:32-45`) — and a test PINS that (`packages/domain/tests/integration/channel-config/wa-status.spec.ts:19`). `purgeProcessedWebhookEvents`
  is ⛔ called by anything.
- **F20 — Rate limit and edge.** The global per-IP limit `RATE_LIMIT_MAX` 300 / min (`config.ts:407`, `plugins/rate-limit/index.ts:121-124`)
  applies to webhooks; per-route precedent `config: { rateLimit: IP_RATE }` (`kyc.routes.ts:31`, `:82`). Cloudflare: `browser_check = "on"`
  and `security_level medium` (`infra/cloudflare/zone.tf:22-23`) plus free-plan Bot Fight Mode are the ALWAYS-ON challengers; the
  managed challenge on automated traffic (`waf.tf:80-83`) exists only when `enable_bot_management` is true (default false,
  `variables.tf:49-53`); the ONLY skip is 6.30's `app_link_verification_files_skip` (`waf.tf:41-63`, "Rule 0 (FIRST)" — *"a challenge
  is ⛔ not a clean 200, and verification then fails SILENTLY"*). ⇒ a challenged MSG91 POST ⇒ retries ⇒ auto-pause (F6). (The WA and
  Telegram webhooks have ⛔ skip either — an observation, ⛔ this story's.) ⛔ IP allowlist is possible (`trustProxy: true` ⇒
  `request.ip` is the leftmost, caller-supplied `X-Forwarded-For`). The per-route limit REPLACES the global one for that route
  (`@fastify/rate-limit` `index.js:142-156`; `global: true` at `plugins/rate-limit/index.ts:121-124`) — and is keyed on that same
  spoofable `request.ip` ⇒ anyone who knows MSG91's egress IP can spend its bucket ⇒ 429 ⇒ auto-pause (ADR-0042's residual).
  `infra/cloudflare/README.md:47` maps the edge's *"Ingress signature verification"* to `origin-ingress.tf`'s edge-auth header ⇒
  ADR-0042's deviation is from §3.11 step 1; whether it is ALSO one from the edge bar, the ADR states after reading both.
- **F21 — DB roles.** `twt_app` (tenant RLS) for the api; jobs runs on the BYPASSRLS service pool; roster Row 26 `jobs-db-role` is
  OPEN (`twt_service` has ⛔ grant on claim tables — every jobs sweep would 42501 in production). New tables inherit that open row.
- **F22 — Numbers.** Next migration **0167** (journal idx 167, `when` 1794195600011 — `meta/_journal.json:1163`); ADR **0042**
  (adr-index Total 152, `drafted` 2); roster **Row 33**; decision id **`2026-10-17-347`** (every one of the 313 refs tops out at
  `-346`). Ledger suffix: `2026-10-17j` is TAKEN (this story's creation) and `2026-10-17k` is held by the 6-31 worktree's uncommitted
  ledger ⇒ the NEXT FREE letter after `k`, re-checked on every branch and in the 6-31 worktree. ⚠ 0167, `-347` and Row 33 are ALREADY
  claimed in 6-31's uncommitted story (its Row 33 = `peer-mesh-wa-reminder-template-approved`) — races (T9).
- **F23 — `epics.md`**: the `### Story 6.37` entry `:3511-3533`; the `---` before `## Epic 7` `:3535`; ⛔ 6.37b entry.
- **F24 — The PRD** has ⛔ FR / NFR on SMS delivery receipts (grep "delivery report" / "DLR" / "receipt" — FR-33's "never 'receipt'"
  only).

## ⚖️ Build decisions DR1–DR14 (DECIDED — BigDev at Task 0.2, 2026-10-17: all as recommended, DR5-G = G-a, DR9 provisional, DR11 (c), DR14 (a); recorded as `-347`, `bf1d57f7`)

- **DR1 — The route and its auth.** `POST /api/v1/webhooks/msg91/sms-reports` in `apps/api/src/modules/channel-webhooks` (inside the
  AI-5-1 gate — F18), `schema: { hide: true }`, a `PUBLIC_ALLOWLIST` entry with its justification. Auth: header
  `x-twt-msg91-secret-token` (configured in MSG91's panel as a custom header — F4), read as an INLINE literal in the handler (I5 —
  the gate's shape match), compared by TWO DIRECT `timingSafeEqualString` calls (current, then next — ⛔ inside an arrow /
  `.some(…)`, which the gate does ⛔ see) against a 32-byte random token from Secret Manager:
  `SMS_REPORT_WEBHOOK_TOKEN_SECRET_NAME` + `SMS_REPORT_WEBHOOK_TOKEN_ENV_FALLBACK` (default `'SMS_REPORT_WEBHOOK_TOKEN'`, the
  `config.ts:427-434` naming), and an OPTIONAL `SMS_REPORT_WEBHOOK_TOKEN_NEXT_SECRET_NAME` + `…_NEXT_ENV_FALLBACK` accepted beside it
  (§5.9's *"dual-secret window"* — each rotation step is an api RESTART, the token being boot-resolved; Row 32 note (3) is the
  precedent). Resolved ONCE at boot (I4, I5) by an EXPORTED builder `buildSmsReportWebhookAuth({config, resolveSecret})` (the
  `buildTurnstileVerifier` `deps.ts:129-143` / `buildMemberStepUpDelivery` `:240-245` shape — so a test can count the resolver
  without `createDeps`); ⛔ Telegram's per-request `resolveChannelSecret` (`handlers.ts:145`). Bad / missing token ⇒ `403
  webhook.signature_rejected`, persist nothing (the Telegram shape). ⭐ **Secret-failure behaviour: the api always starts (6.37 T13 — refusing to start
  is a restart loop of every route); only the webhook's state changes.** The house convention (`config.ts:427-434`,
  `resolveSecretValue` in `packages/domain/src/secrets.ts:101-131`): when a secret NAME is unset, the feature is off; when it is
  set, production reads Secret Manager (which throws on NOT_FOUND, on an empty payload and on no access) and local dev reads the
  `…_ENV_FALLBACK` variable (which throws when that variable is unset); a whitespace-only value is returned, not thrown. A token is
  usable when, after trimming, it is at least 32 characters long.

  | Current token name | Current token value | Next token | Webhook state at boot | Boot log (secret names only, never a value) |
  |---|---|---|---|---|
  | unset | — | anything | disabled: 403 `webhook.signature_rejected` to every request | in production, one warning: *"sms report webhook disabled: SMS_REPORT_WEBHOOK_TOKEN_SECRET_NAME unset"* (plus *"next ignored"* if a next name is set); in other environments, no line |
  | set | cannot be read, blank, or shorter than 32 characters | anything | disabled: 403 to every request | one error naming the secret and the failure class (`unavailable`, `empty` or `too_short`), in every environment |
  | set | usable | unset | enabled on the current token | none |
  | set | usable | set and usable | enabled on both tokens | none |
  | set | usable | set but fails as in row 2 | enabled on the current token only — a broken rotation half never disables a working token | one error naming the next secret and the failure class |

  Each state holds until the next api restart; nothing re-reads the secrets at runtime. Residual risk, recorded in ADR-0042: a
  Secret Manager outage AT BOOT disables the webhook until a restart, every report is then answered 403, and those 403s count toward
  MSG91's auto-pause (F6). DR12's silence alarm is the detector, and Row 33 (b) checks that no disabled-webhook line appears.
  ⭐ Recommended. Alternatives: (b) a secret path segment —
  refused (Traefik logs the URL, I5); (c) an IP allowlist — refused (F4 ⛔ list; F20 spoofable); (d) refuse boot on an
  unresolvable name, as Turnstile does — refused (the whole api goes down for one webhook).
- **DR2 — Keep only an allowlisted projection; ⛔ the phone number.** One recipient per Flow call (6.37 MG9) ⇒ `requestId` + `CRQID`
  identify the send; `telNum` adds ⛔ match power and IS member PII. The handler persists, per report, EXACTLY these columns
  (⛔ anything else is read):

  | Column | From | Rule (else) |
  |---|---|---|
  | `request_id` | `requestId` | `^[A-Za-z0-9]{1,64}$`, NOT NULL — else the REPORT is ⛔ stored (so the CHECK never 5xxes a retry toward auto-pause and the dedupe key is never NULL) and counts toward the request's `bad_request_id` line |
  | `crqid` | `CRQID` | DR3's grammar; `""` / `"0"` ⇒ NULL (T7); any other non-matching value ⇒ NULL |
  | `status_code` | `status` | `^[0-9]{1,3}$`, else NULL |
  | `event_name` | `eventName` | `^[A-Za-z_]{1,32}$`, else NULL |
  | `failure_reason` | `failureReason` | trimmed, ≤ 200, control chars stripped, every run of ≥ 7 digits ⇒ `#` (the 0155 / 0166 digit-run rule's spirit) |
  | `reported_delivery_time` | `deliveryTime` | the raw string ≤ 40, ⛔ parsed for logic (T8) |
  | `received_at` | — | `now()` (ours — the correlator's clock) |

  The panel template (Row 33 (d)) OMITS `telNum`, `senderId`, `credit`, `userId`, `DLT_TE_ID` (data minimisation at the source), and
  the handler drops them anyway (I3). A body that is one object ⇒ one row; an ARRAY of ≤ 100 objects ⇒ one row each (defensive — F2);
  anything else, once authenticated (incl. a parse failure — DR10) ⇒ `200` and ⛔ row. ⚠ "Alarm" in the api = ONE
  `request.log.error({ alarm: 'sms_report.unusable_body' }, …)` line PER REQUEST (⛔ per report; ⛔ the body, ⛔ the parse error; ⛔
  `console.*`, which bypasses the `logStream` recorder — F18); likewise ONE `{ alarm: 'sms_report.bad_request_id', count }` line per
  request that dropped ≥ 1 report. A 4xx would count toward auto-pause (F6). ⭐ Recommended. Cost: ⛔ cross-check
  that the report's number is the row's number (a mis-correlation by MSG91 would go unseen); (b) keep `telNum`, hash it per Pariwar in
  jobs and compare to `recipient_number_hash` — one KMS HMAC per report (in api it would also take the global audit lock —
  [[project_kms_audit_per_hmac_global_lock]]) for a check ⛔ needed when the id is ours.
- **DR3 — ⭐⭐ Correlate by OUR id: every send carries `CRQID` = `<kind><row-uuid-hex>`.** `kind` ∈ `cr` (a
  `claim_correction_reminders` row — reminder OR closure notice), `ce` (`claim_certificate_reminders`), `sn` (`claim_suspicion_notices`),
  `pm` (`claim_peer_mesh_pings`), `ot` (an OTP — DR11); the row's uuid lower-case without dashes ⇒ 34 characters,
  `^(cr|ce|sn|pm|ot)[0-9a-f]{32}$` — inside BOTH documented limits (F7). ⭐ The grammar, `formatSmsCorrelationId({kind, rowId})` and
  `parseSmsCorrelationId(s)` live in `@twt/domain` (new `sms-delivery` namespace — Task 1.1) — ⛔ `@twt/channels`: domain cannot import
  channels (channels already depends on domain — `sms-app.ts:24`, `sms-errors.ts`), and Task 3's accessors need it; channels, api and
  jobs import it from domain; the 0167 CHECKs are the ONE sanctioned SQL mirror. `SmsGatewayMessage` gains `correlationId?: string`;
  `SmsProviderDeps` binds it per send (as 6.37 bound `values`, copied into the message by `buildGatewayMessage` — I8; the core builds
  one provider per send, `claim-dlt-sms-send.ts:308`); the OTP adapter sets it straight on the message it passes to
  `messaging.send` (`sms-step-up-delivery.ts:206`). ⭐ PLACEMENT: `buildFlowBody` puts `"CRQID"` INSIDE the single recipient object —
  `recipients:[{mobiles, …values, CRQID}]` — Flow's own sample (F7); ⛔ top level (that wording is the Text-SMS page's, ⛔ Flow's).
  `CRQID` joins `mobiles` in `localRefusal`'s RESERVED recipient keys (`sms-app.ts:316-320`) so a template value of that name can
  ⛔ overwrite it. Placement is UNVERIFIED until a real report shows a non-NULL `crqid` (DR14 (c) Row 33 (e0)) — if MSG91 ignores it,
  every report lands `unmatched:no_crqid` (loud — DR6 / DR12 — and the safe direction, I1). A value outside the grammar: the CORE
  validates `correlation` with `formatSmsCorrelationId` at the TOP of `sendClaimDltSms` — OUTSIDE every try (T22: the config-resolve try
  `:244-256` returns a final on a known fault, and the provider-build try `:306-311` and the send try `:318-342` each turn ANY throw
  (a `SendTimeoutError` excepted — a transient, `:340`) into a final `error` `config:sms_messaging_unavailable`; nothing before the top writes state or catches; and a throw in
  `buildGatewayMessage` is caught inside `provider.send` (`sms-dlt.ts:77-96`) and returned `rejected` `unknown:*` ⇒ the core's
  default case ⇒ a final `error` too) — and THROWS (the house rule *"A throw is a crash, ⛔ a final"*, `claim-dlt-sms-send.ts:119-124`); the provider and `buildGatewayMessage` only COPY the already-formatted string. Why a crash: a final would record the
  bad-id refusal AS the send (a suspicion notice is once per claim — 0155; a ping is one text ever — 0166) and
  `dlt_template_not_approved:*` is scope-wide on peer mesh (`isScopeWideSendFault`, `claim-peer-mesh-requests.ts:243-246` — the run
  stops); a crash keeps the id off the wire. ⚠ A crash is otherwise SILENT: all five callers let the throw reach pg-boss
  (`claim-correction-reminders.ts:1372-1386`, `claim-certificate-reminders.ts:710-722`, `claim-correction-closure.ts:424-430`,
  `claim-suspicion-notices.ts:498-504`, `claim-peer-mesh-requests.ts:783-789`), and pg-boss 12.19.1 handles a handler error with
  `fail()` only (`node_modules/pg-boss/dist/manager.js:227-228`) — ⛔ `'error'` emitted, so `createQueueClient`'s `onError`
  (`packages/queue/src/index.ts:545-551`) never logs it ⇒ the core logs ONE `console.error` line `[jobs] sms.bad_correlation:<kind>` (⛔ the
  id) BEFORE it throws. ⚠ And it does ⛔ save the text: the id is the row's own uuid, so a bad one is a CODE BUG that fails identically
  on every retry, and the row's give-up still records `error` — `exhausted:attempting_three_days` (suspicion `:240-251`, peer mesh
  `:369-381`; on peer mesh the throw also stops every later ping in the child on each retry); `exhausted:attempting_past_day`
  (correction reminder, closure notice, certificate — the next day's sweep finaliser, correction `:729-735`, certificate `:180-186`;
  `exhausted:crossed_midnight` if a retry spans midnight). The client keeps a LOCAL refusal as defence only
  (`dlt_template_not_approved:bad_correlation_id` — an existing class whose detail is free-form `[A-Za-z0-9_.-]{1,64}`, accepted by the
  0155 / 0166 CHECKs; ⛔ test pins a list). `ClaimDltSmsInput` gains `correlation: {kind: 'cr'|'ce'|'sn'|'pm'; rowId}`; the wrapper
  `sendClaimCorrectionSms` takes only `rowId` and DERIVES the kind from its `message` (`certificate_reminder` ⇒ `ce`, the others ⇒
  `cr`) so the certificate caller can ⛔ pass `cr`; the two direct callers pass `{kind:'sn', rowId: begun.noticeId}` /
  `{kind:'pm', rowId: pingId}`. ⇒ (i) a report is matched by a PRIMARY KEY lookup in ONE table (⛔ scan of four, ⛔ new index on four
  `provider_message_id` columns); (ii) a report for a request id no row holds (F14) still finds its row ⇒ the may-have-sent retry is
  DETECTED (DR6); (iii) the 0128 FCM ids can ⛔ collide (they carry ⛔ CRQID). Supersedes the 6.37 story file's MG9 *"⛔ `CRQID` (6-37b
  decides correlation)"* (`-345`'s own MG9 has ⛔ CRQID — so a DECISION, ⛔ an edit; Task 0.3's list). Updated (⛔ broken — the field is optional in the TYPE, but the
  core and the OTP adapter always set it): `sms.test.ts:254-258`'s deep-equal (6.37 AC1), the two api whole-body checks and the 51
  calls T15 lists; ADR-0041 `:48` gains a dated amendment row. ⭐ Recommended. Alternatives: (b) match on `requestId` =
  `provider_message_id` only — four new indexes, a four-table scan with the 0128 purpose filter, and F14's orphans stay orphans; (c)
  `UUID` — the same echo, ⛔ better documented.
- **DR4 — Status → delivery state (data-driven, one table — applied at DR6 rows 2, 8 and 9).** `1` ⇒ `delivered`; `2`,
  `9`, `16`, `17`, `20`, `25` ⇒ `undelivered` (final — F5); `0` ⇒ `intermediate` (recorded, ⛔ state); NULL / any other ⇒
  `unknown_status` + an alarm naming the code (⛔ state — an unknown code must ⛔ un-count a send, I1's spirit applied to doubt).
  `event_name` / `failure_reason` are RECORDED, ⛔ decide (their strings are ⛔ documented — F5); an "API Failed" event (F8) whose
  shape is unknown is therefore `unknown_status` — or, if it carries ⛔ usable `requestId`, ⛔ stored at all (DR2) and seen only as the
  request's `bad_request_id` line — until Row 33 (e) records a real one (then a later change maps it — a deferred item). ⚠ Under PQ1
  B1 this mapping decides who becomes letter-eligible (`9` NDNC, `17` blocked, `20` country blocked included) — it stays the
  author's, and PQ1's E3 STATES it (the §0 mixed-question disclosure). ⭐ Recommended.
- **DR5 — Where the result lives: ONE pariwar-scoped table `sms_send_deliveries`**, ⛔ the send tables (I2). Columns: `pariwar_id`,
  `send_kind` (`cr|ce|sn|pm`), `send_row_id uuid`, `request_id`, `delivery_state` (`delivered|undelivered`), `status_code`,
  `failure_reason`, `first_reported_at`, `reported_at`, `report_count`; PK (`send_kind`, `send_row_id`); tenant RLS (ENABLE + FORCE,
  the 0128 per-command policy shape, `pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`); written ONLY by the
  jobs correlator (grants — DR5-G). ⛔ FK across four tables (a kind-discriminated id — the `cycle_id` unFK'd precedent,
  [[project_pool_primitive_substrate]]); the correlator proves existence by the lookup it made. `delivered_at` on 0128 / 0138 stays
  NULL and its CHECK stays — a deferred item records it as an unused seam (adopt or drop later), ⛔ silently. ⭐ Recommended.
  Alternative (b): `delivered_at` on 0128 / 0138 + new delivery columns on 0151 / 0156 — four grant changes, 0155's trigger amended
  to let a FINISHED suspicion row change (it was frozen on purpose), two shapes for one fact.
- **DR5-G — The grants on both new tables (⏳ BigDev at Task 0.2 — put WITHOUT a recommendation).** Every table jobs drains or
  prunes grants its writing privileges to `twt_app` (0039 `:23` `whatsapp_send_status`, 0043 `:24`, 0047 `:25`, 0049 `:38`: `GRANT
  SELECT, INSERT, UPDATE, DELETE … TO twt_app`; every jobs-written claim table: INSERT + a column-narrowed UPDATE, 0128 `:65`, `:68`),
  and roster Row 26 (a)'s leading posture is *"a member of `twt_app` with … `SET LOCAL ROLE twt_app`"*. Options:
  **(G-a)** the house shape — inbox: `SELECT, INSERT, DELETE` + `UPDATE (match_state, match_detail, attempts, next_attempt_at,
  lease_until, settled_at)`; `sms_send_deliveries`: `SELECT, INSERT` + `UPDATE (delivery_state, status_code, failure_reason,
  reported_at, report_count)`; per-command policies that MATCH the grants. Cost: the api's own role can write delivery state, so an
  api-side bug (⛔ a forged report — the api never writes there) could un-count reach; held only by code review and the policy-
  regression specs. **(G-b)** read-only for `twt_app` (inbox `SELECT, INSERT`; `sms_send_deliveries` `SELECT`), policies for those
  commands ONLY (⛔ INSERT / UPDATE policy text with ⛔ grant — *"dead text that reads as permission"*, 0109 `:46-48`), and the
  migration comment states that the correlator's UPSERT, lease / settle UPDATE and the prune's DELETE depend on Row 26 choosing
  BYPASSRLS + `twt_service` grants. Cost: under Row 26 (a) every correlator / prune write is a `42501` in production — the story ships
  a write path that its own roster's leading option breaks. Either way both policy-regression specs pin the chosen grants.
- **DR6 — The matching rule (I6): one ordered table, first match wins.** Run on each claimed `pending` inbox row; lookups on the
  service pool (F21). AC notation `a:b` means `match_state = a`, `match_detail = b`; `match_state` ∈
  `pending|matched|other_attempt|unmatched|ignored|otp` (DR7's CHECK), `match_detail` ≤ 64 `[a-z_:]`. "Retry" = stay `pending`,
  `next_attempt_at` per the backoff (1 min, 5 min, 30 min, 2 h, then every 6 h, by `attempts`), `lease_until = NULL`; a retry that
  reaches **72 h** after `received_at` settles as the row's "after 72 h" column instead.

  | # | Condition | Result | After 72 h | Alarm (kind + counts only) |
  |---|---|---|---|---|
  | 1 | `crqid` NULL (⛔ sent, `""`, `"0"` — T7; a panel test send, a foreign send) | `unmatched:no_crqid` | — | `sms_report.no_crqid` (⭐ the LOUD signal that MSG91 dropped the CRQID — DR3) |
  | 2 | kind `ot` | `otp:<DR4 result>` (`otp:delivered` / `otp:undelivered` / `otp:intermediate` / `otp:unknown_status`) — ⛔ lookup, ⛔ member, ⛔ row | — | `otp:unknown_status` only: `sms_report.unknown_status:<code ≤ 3 digits or 'none'>` (as row 9 — a non-digit code such as `"x"` is NULL by DR2 ⇒ `none`); the rest counted by DR11's daily line |
  | 3 | ⛔ row for `(kind, row id)` | retry | `unmatched:no_row` | `sms_report.unmatched:<kind>` |
  | 4 | a `cr` row whose `purpose` ∉ (`family_sms`, `closure_notice`) — a staff push (unreachable: a push carries ⛔ CRQID — checked) | `unmatched:not_sms` | — | `sms_report.not_sms` |
  | 5 | a `pm` row with `send_outcome` NULL (⛔ begun) | retry | `unmatched:not_begun` | `sms_report.unmatched:pm` |
  | 6 | the row is `attempting` (`outcome`; pings `send_outcome`) — the report beat the finaliser's COMMIT | retry | `unmatched:still_attempting` | `sms_report.unmatched:<kind>` |
  | 7 | finished, and `provider_message_id` IS DISTINCT FROM `request_id` (an `accepted` row of ANOTHER attempt, or a non-`accepted` row — its `provider_message_id` is NULL, `claim-dlt-sms-send.ts:255-341` — whose request MSG91 nevertheless took) | `other_attempt:<kind>` — ⛔ `sms_send_deliveries` change | — | `sms_report.second_request_for_one_send:<kind>` (a double text, or a text the row says was ⛔ sent) |
  | 8 | finished, `accepted`, `provider_message_id = request_id`, DR4 = `delivered` / `undelivered` | `matched:delivered` / `matched:undelivered` + the `sms_send_deliveries` UPSERT (below) | — | ⛔ |
  | 9 | as 8, DR4 = `intermediate` / `unknown_status` | `ignored:intermediate` / `ignored:unknown_status` — ⛔ state | — | `unknown_status` only: `sms_report.unknown_status:<code ≤ 3 digits or 'none'>` (`"x"` ⇒ NULL by DR2 ⇒ `none`) |

  ⭐ **The `sms_send_deliveries` counting contract (DR6 row 8 only).** The write is ONE statement, `INSERT … ON CONFLICT (send_kind,
  send_row_id) DO UPDATE SET …`, with NO `WHERE` clause on the update (a `WHERE` that skipped the absorbed case would also skip its
  count) and no read-then-write in application code.

  | Column | Set by the first matching report (INSERT) | Set by each later matching report (ON CONFLICT) |
  |---|---|---|
  | `delivery_state` | that report's state | `undelivered` if either the stored state or this report's state is `undelivered`; otherwise `delivered`. A later `delivered` never replaces `undelivered` (the latest report does not win — F19's WhatsApp trap, T3) |
  | `status_code`, `failure_reason` | that report's values | this report's values only when this report changes the state from `delivered` to `undelivered`; in every other case the stored values are kept, so they always belong to the report that set the current state |
  | `request_id` | that report's request id | unchanged (DR6 row 8 only applies when the request id equals the row's) |
  | `report_count` | `1` | the stored count plus 1, for every matching report, including one that leaves the state unchanged |
  | `first_reported_at` | that report's `received_at` | the earlier of the stored value and this report's `received_at` |
  | `reported_at` | that report's `received_at` | the later of the stored value and this report's `received_at` (the drain can settle reports out of `received_at` order) |

  So `report_count` is the number of distinct INBOX ROWS that reached DR6 row 8 for that send — one per distinct (request id, CRQID,
  status code) under DR7's dedupe rule — and NOT the number of distinct provider payloads: two POSTs with the same three values but a
  different failure reason, event name or delivery time are one inbox row and count once. These are
  NOT counted and cause no `sms_send_deliveries` write at all: a duplicate POST (it is one inbox row — AC4); every report settled by
  DR6 rows 1–7 or row 9; and a settle that is replayed after its lease lapsed (DR8's compare-and-set rolls the upsert back). ⭐ Recommended. Costs (accepted, and DISCLOSED in PQ1's E3 / B1 cost):
  a genuine "failed then delivered" sequence for ONE request reads `undelivered` (under B1: letter-eligible though the text did
  arrive); a row parked `attempting` past 72 h (a `sweep:held` row — 0155, 0166) loses its report to `unmatched:still_attempting`
  (⛔ `other_attempt`); the 72 h window matches the pull API's 3-day reach (F9).
- **DR7 — The inbox `sms_delivery_report_inbox` (migration 0167, hand-authored — T10).** GLOBAL (⛔ `pariwar_id`): ENABLE + FORCE RLS,
  one PER-COMMAND policy `… TO twt_app` for each GRANTED command only — SELECT / DELETE `USING (true)`; INSERT `WITH CHECK (true)`
  (Postgres refuses `USING` on `FOR INSERT`); UPDATE both (0049 `:40-41`'s `USING
  (true)` body in 0128 `:69-73`'s per-command layout — a `FOR ALL` policy would be 0109 `:46-48`'s *"dead text"* under G-b; the
  inbox holds ⛔ PII after DR2); grants per DR5-G. Columns: DR2's projection + `report_id uuid` PK + `match_state` (DR6's six values, CHECK, NOT NULL
  DEFAULT `'pending'`), `match_detail` (≤ 64 `[a-z_:]`, CHECK), `attempts int NOT NULL DEFAULT 0`, `next_attempt_at timestamptz NOT
  NULL DEFAULT now()` (⛔ NULL — a NULL never matches `next_attempt_at <= now()`), `lease_until`, `settled_at` (stamped by EVERY settle to a non-`pending` state — DR8 — the prune's clock). Dedupe: an EXPRESSION
  unique index — `CREATE UNIQUE INDEX … ON sms_delivery_report_inbox (request_id, coalesce(crqid,''), coalesce(status_code,''))`
  (Drizzle `uniqueIndex().on(sql\`…\`)`; ⛔ a table `UNIQUE` constraint, which cannot hold an expression) ⇒ a bare `INSERT … ON
  CONFLICT DO NOTHING` (a retry or a duplicate is one row — F6). ⭐ **The dedupe rule.** Two reports are DUPLICATES by definition
  when they agree on the three key values — the request id, the CRQID (blank when absent) and the status code (blank when absent) —
  whatever else differs (`failure_reason`, `event_name`, `reported_delivery_time`, or any dropped field). The FIRST one stored is kept;
  a later duplicate is discarded by `ON CONFLICT DO NOTHING` (answered `200`, ⛔ logged, ⛔ counted), so its other values are lost.
  Why this key: MSG91 retries by resending the same event (F6 — *"you may receive multiple callbacks"*), and everything a report
  decides — which send, and which delivery state through DR4 — depends only on the request, the send and the status code; a second
  report that agrees on all three carries no new fact for DR6. Accepted cost: if MSG91 ever sends the same status twice for one
  request with a DIFFERENT failure reason or delivery time, only the first is kept. Migration 0167's unique index is EXACTLY this
  key (Task 2), and AC4 / AC6 (8f) pin it. Index (`match_state`, `next_attempt_at`) for the drain. Retention: a
  daily prune deletes rows whose `settled_at` is more than **30 days** ago (every `match_state` ≠ `pending`); `pending` rows and `sms_send_deliveries`
  are ⛔ pruned (AC10). ⭐ Recommended.
- **DR8 — The correlator (jobs).** A pg-boss cron (`'* * * * *'`, `tz: 'Asia/Kolkata'`, the `tg-webhook-processor.ts:413-431`
  registration; a queue-name constant in `QUEUE_NAMES`, `packages/queue/src/index.ts:41`) that claims ≤ 200 due rows with a LEASE
  (`UPDATE … SET lease_until = now() + 5 min, attempts = attempts + 1 WHERE report_id IN (SELECT … WHERE match_state = 'pending' AND
  next_attempt_at <= now() AND (lease_until IS NULL OR lease_until < now()) ORDER BY received_at LIMIT $n FOR UPDATE SKIP LOCKED)
  RETURNING …`) — ⛔ `processed_at` on claim (T2). ⚠ The domain limit-clamp gate sees Drizzle `.limit()` only
  (`scripts/domain-accessor-invariants/lib.ts:4-12`) ⇒ a raw-SQL `LIMIT $n` is UNGATED: apply `clampLimit(limit, {default: 200, cap:
  500})` (`packages/domain/src/pagination.ts:34`) by hand, or write the claim in Drizzle (the Telegram claim is the precedent). Each
  row settles in its own try / catch (a crash ⇒ the lease lapses ⇒ re-claimed). The `sms_send_deliveries` write and the inbox row's
  settle (which stamps `settled_at = now()` on any non-`pending` result) commit in ONE transaction, and the settle is a compare-and-set (`WHERE match_state = 'pending' AND attempts = <the claimed
  attempts>` — 0 rows ⇒ ROLLBACK, so a settle after a lapsed lease never counts a report twice — AC7); a RETRY settle also sets
  `lease_until = NULL` (else the 1-min backoff is really the 5-min lease). Alarms go through a per-module `onAlarm?: (message: string)
  => void` dep defaulting to `console.warn` (the house shape — `cycle-spawn.ts:75,118`, `claim-peer-mesh.ts:66,176`; `boot.ts:668`
  *"`onAlarm` is ⛔ wired"* ⇒ logs only until Row 32 (h)). ⭐ Recommended.
- **DR9 — Rate limit and the edge.** The route gets an explicit `config: { rateLimit: { max: SMS_REPORT_WEBHOOK_RATE_MAX (default 1200),
  timeWindow: '1 minute' } }` (⛔ the 300 global — F20; ⛔ `rateLimit: false`) — PROVISIONAL (BigDev, Task 0.2), re-checked against
  Row 33 (c2)'s answer; it REPLACES the global for this route; a 429 test
  pins it (assert the 429, ⛔ the hook order — [[project_rate_limit_prehandler_hook_order]]). Cloudflare: a SEPARATE rule
  `msg91_sms_reports_skip` in `infra/cloudflare/waf.tf`, placed directly AFTER 6.30's "Rule 0 (FIRST)" and BEFORE Rules 1–3 (⛔ the
  path added to 6.30's expression), expression `http.request.uri.path eq "/api/v1/webhooks/msg91/sms-reports" and
  http.request.method eq "POST"`, skipping BIC, security level, SBFM and the custom rules (the 6.30 rule's shape, with its comment on
  why); `terraform fmt -check` / `terraform validate` run on HEAD FIRST (a pre-existing red is recorded, ⛔ blamed on this edit);
  OPERATOR-applied (roster Row 33 (c)). Auth stays in the api (a skip is ⛔ trust). The rate-limit key is the spoofable `request.ip`
  (F20) — ADR-0042's residual. ⭐ Recommended.
- **DR10 — Body parsing (Fastify 5.8.5, read in source).** Today's scoped parser: `application/json; charset=utf-8` DOES match (the
  media-type fallback in `content-type-parser.js` `getParser` — T18 holds); an EMPTY body with a JSON content type reaches the handler
  as an empty Buffer (`FST_ERR_CTP_EMPTY_JSON_BODY` is the DEFAULT JSON parser's only, `:311-314` — T17's 400 does ⛔ happen here); ⛔
  content type and ⛔ body ⇒ the handler runs with `rawBody` undefined (`handle-request.js:37-47`); `text/plain` ⇒ a string body, ⛔
  `rawBody`; ANY other content type, or a body with ⛔ content type ⇒ **415 before auth** — which counts toward auto-pause, and MSG91's
  real content type is UNVERIFIED. ⇒ the route registers in its OWN encapsulated scope that calls `removeAllContentTypeParsers()` then
  `addContentTypeParser('*', { parseAs: 'buffer' }, …)` — every content type reaches auth as a Buffer (or `undefined`); the handler
  parses JSON ITSELF in a try / catch (I3 — ⛔ the error or its message logged) ⇒ anything unparseable, empty, or absent with a valid
  token ⇒ DR2's `unusable_body` (200) — ⛔ WA's *"wiring bug"* 403 (`handlers.ts:86-89`). The global `bodyLimit` (1 MiB, `server.ts:117`)
  stays. Row 33 (d) records the content type MSG91 actually sends. Residual: a syntactically INVALID `Content-Type` header is still a
  415 before any parser is looked up (`handle-request.js`, `contentType.isValid === false`) — recorded in ADR-0042, ⛔ worked around.
  ⭐ Recommended.
- **DR11 — The OTP: a tag, ⛔ a stored id.** The audit has ⛔ good home for the gateway id (F17): its context is only hashed, and
  `resource_locator` — which COULD hold a lower-case 24-hex id — already carries the actor (`user:<actorId>`, `audit-log-sink.ts:117`),
  so the id would REPLACE it; storing it per member would add a member-linked table for ⛔ use. ⇒ (a) the OTP adapter sends `CRQID =
  'ot' + 32 random hex` from a NEW optional dep `correlationHex?: () => string` on `SmsDltStepUpDeliveryDeps` (`:63-86`), defaulting
  to `() => randomBytes(16).toString('hex')` (⛔ such dep exists today — the only precedent is `vi.mock('node:crypto')`,
  `packages/domain/tests/integration/claim/peer-mesh-request.spec.ts:25`); `member-step-up-delivery-wiring.test.ts` builds through
  `buildMemberStepUpDelivery` (`deps.ts:239`, adapter `:348`) and asserts `expect.stringMatching(/^ot[0-9a-f]{32}$/)` (⛔ threading the
  dep through `MemberStepUpDeliveryOptions`). (b) The correlator settles every `ot` report as `otp:<DR4 result>` (⛔ member, ⛔ row) and
  a DAILY jobs line counts them (`otp delivery: delivered N, undelivered M, intermediate I, unknown K` — ⛔ an id). That SUPERSEDES the
  6.37 story file's MG1 *"the OTP's gateway id in its audit"* (`-345`'s entry: *"the OTP's gateway id"*) — a DECISION; the audit as
  built has ⛔ good home for it. (c) ⚠ The person-facing risk: every login code now carries a `CRQID` whose acceptance by Flow is
  UNVERIFIED (F7; 6.37 F9 — MSG91 answers `success` even to a fake key, so a 200 proves nothing), and login codes (Row 30 (b), templates 15
  / 16) may go live BEFORE Row 33 — and a refusal may be a `200` followed by SILENCE (6.37 F9; F8 — failures land in MSG91's own Failed Logs / e-mail), so ⛔ error
  reaches our system. ⇒ Task 0.4 adds
  a DATED note to roster Row 30 (⛔ a word above rewritten): *"once row 6-37b's OTP CRQID is merged, a login code AND a step-up code
  are RECEIVED on the operator's phone from a build carrying it, on staging (with the key staging uses under Row 32 (b)), BEFORE that build is deployed
  to production — an added check on (b)'s device proof (note (6) (b): ⛔ for row 6-37b), whether (b) closed before or after."*
  (A NARROWING of Row 30 (b) — the author's: a check added, ⛔ who is texted; Task 0.3's list.) Row 33 (e0) then proves the echo.
  ⭐ **The OTP production gates (BigDev, Task 0.2).** OTP delivery does not wait for Row 32 to close or for 6-37b to be `done`; the
  staging proof comes before production relies on the CRQID; Row 33 (e0) is the echo proof. The OTP code never reads a delivery
  report, in any gate — the gates only limit which build may send production login codes and what may be relied on.
  - **Gate 0 — until Row 33 (b0) is recorded.** Production may send login and step-up codes only from a build that does NOT add the
    OTP CRQID (6.37 as built), and only once Row 30's and Row 32's required setup legs are done. The CRQID build must not be deployed
    to any production environment that sends login codes.
  - **Row 33 (b0)** is recorded when, on staging and from the CRQID build, a login code AND a step-up code were each sent to and
    received on the operator's phone, with the date written down.
  - **Gate 1 — after (b0), until Row 33 (e0) is recorded.** The CRQID build may send production login and step-up codes; every
    member's code then carries an `ot…` CRQID. Nothing may rely on an OTP delivery report: DR11's daily OTP count line is
    informational only — it is not evidence that codes were delivered and it does not feed any alarm — and no code reads `otp:*` rows.
  - **Row 33 (e0)** is recorded when, in production and after the webhook exists (Row 33 (d)), a login code triggered by the operator
    was received on the operator's phone AND its delivery report was stored with a non-empty CRQID starting `ot`, `match_state =
    'otp'`, and no phone number in any column.
  - **Gate 2 — after (e0).** The daily OTP count line may be cited as evidence of OTP delivery. Claim texts are still not sent: no
    claim-text template id is provisioned until Row 33 closes (Row 33 (g)).
  - **If (b0) fails** (a code is not received from the CRQID build on staging): the CRQID build is not deployed to production, and
    the fix (removing the OTP's CRQID, by (c′)'s switch or a code change) is a new decision for BigDev.
  - **If (e0) fails** (the stored report's CRQID is empty): Gate 1 continues, because delivery was already proven by (b0); the
    placement is fixed by a code change and a new decision; Row 33 cannot close, so no claim-text template id is provisioned.
  ⭐ Recommended (a)–(c).
  Alternatives:
  (a′) a global `sms_otp_sends(request_id, intent, sent_at)` the api writes best-effort — a write on the login path for a metric;
  (c′) a config switch `SMS_OTP_CORRELATION_ENABLED`, default OFF, turned on only after Row 33 (e0) — the OTP then carries ⛔ CRQID
  until proven, at the cost of one more config and an (e0) that needs the switch flipped first.
- **DR12 — Silence: the alarm, ⛔ a pull.** A daily jobs check (`'40 3 * * *'` IST) counts `accepted` SMS sends finalised between
  7 days and **48 h** ago with ⛔ `sms_send_deliveries` row and ⛔ inbox row carrying their `crqid`, per table (F12's columns):
  `claim_correction_reminders` `purpose IN ('family_sms','closure_notice') AND outcome = 'accepted'` by `updated_at` (⛔ `staff_push`:
  an FCM id, ⛔ CRQID — it would alarm every day); `claim_certificate_reminders` `outcome = 'accepted'` by `updated_at`;
  `claim_suspicion_notices` `outcome = 'accepted'` by `updated_at`; `claim_peer_mesh_pings` `send_outcome = 'accepted'` by
  `send_updated_at`. If > 0 ⇒ ONE alarm `sms_report.silence:<count>` (⚠ a phone off for two days can still read as silence — the
  alarm is a pointer, ⛔ a state; MSG91's maximum report delay is ⛔ documented) (a paused webhook — F6 — an account fault MSG91 never
  reports — F8 — or a dropped CRQID — DR3). Logs only until `onAlarm` is wired (Row 32 (h)). (b) A reconciliation pull of
  `report/logs/p/sms` (F9) — OUT (an outbound MSG91 call and its key scope); a deferred item with trigger *"Row 33 (e) observes a
  pause, or the silence alarm fires in production"*. ⭐ Recommended.
- **DR13 — What staff see: ⛔ change in Tasks 1–6.** The chase views (F16) keep showing `accepted` until Task 7. ⚠ Under PQ1 B1,
  Task 7 changes the CORRECTION chase view BY CONSTRUCTION — it is built from the same `readReturnPersonStates`: its `status`
  (`unreachable`), `foundDeadOn` and `remindersAccepted` (`correction-chase-read.ts:229-235`; DTO
  `claims.nominee-name-check.handlers.ts:822-823`) move with the ruling, and offering the letter form IS cl.2's point — the Panel's
  change, ⛔ a UI change of this story's own. A deferred item carries the REST (*"the certificate and peer-mesh staff views show a send
  the network reported undelivered as sent; ⛔ view labels a send 'reported undelivered'"*), trigger: PQ1's ruling. Peer mesh /
  suspicion / certificate reports are RECORDED, ⛔ act on (a neighbour reported unreached is ⛔ replaced — that would change WHO is
  texted). ⭐ Recommended (scope; ⛔ a UI story inside a webhook story).
- ⭐ **2026-10-17 — DR14 is now option (b) (`-353`, superseding `-347` decision 15):** Task 7 moved to row
  `6-37c-undelivered-reminder-ladder`; this story builds Tasks 1–6 and closes with Task 8. The text below is kept as it was decided.
- **DR14 — Story shape and records.** (a) ⭐ ONE story: Tasks 1–6 build; **Task 7 (D22) waits for PQ1's ruling** and the row stays
  `in-progress` until then (Row 32 (i) is unchanged and keeps its meaning — 6-37b `done` ⇒ reports are consumed AS the Panel ruled).
  Landing Tasks 1–6 on `main` before the ruling is BigDev's call ([[feedback_land_prs_by_fast_forward]]) — it changes ⛔ who is
  texted, when, or what counts (I7). (b) Alternative: split — Task 7 becomes row 6-37c, Row 32 (i) re-pointed to 6-37c by the
  author-commit (a narrowing of when ids may be provisioned). (c) Records: the author-commit `-347` — DR1–DR14 (+ DR5-G), the
  supersessions and the `-346` corrections exactly as Task 0.3 lists them (⛔ `-346` edited); ADR-0042 `msg91-delivery-report-ingress`
  (`drafted` — the static-header deviation from §3.11 step 1 (and the edge bar, if F20's reading holds), the header name and why
  (the AI-5-1 shape match), the global inbox, ⛔ phone number kept, I1's forgery bound incl. its three B1 effects, rotation by restart,
  auto-pause, the Cloudflare skip, the spoofable rate-limit key, the boot-time secret outage that disables the webhook until a
  restart (DR1), the provisional rate limit (DR9), the residual) + its index row (Total 152 → 153, `drafted` 2 → 3,
  reconciled in the SAME commit); ADR-0041 a dated Changelog row (CRQID now sent, inside the recipient); roster **Row 33
  `sms-delivery-reports-provisioned`** (Row 32's block shape), legs IN THIS ORDER (a report that meets a missing token or a challenge
  is a 403 that counts toward auto-pause — F6):
  (a) ADR-0042 ratified;
  (b0) Row 30's dated-note proof RECORDED here too — a login code AND a step-up code received from the CRQID build, on staging,
      BEFORE that build is deployed to production (and so before (b), which needs it deployed) — a note on Row 30 may sit on a CLOSED
      row nobody re-reads; this leg is where it is owned (the operator's, recorded with its date) — recording it moves OTP production use from Gate 0 to Gate 1 (DR11);
  (b) the token secret(s) set in the deployed api (DR1) and the boot line checked ABSENT;
  (c) the Cloudflare skip applied (DR9) AND whether free-plan Bot Fight Mode is on recorded (it ⛔ can be skipped — `waf.tf:47-48`;
      the Row 29 precedent) — if on, a test POST from outside the origin's network proves the path is ⛔ challenged BEFORE (d);
  (c2) MSG91's retry schedule, response timeout and auto-pause rule — incl. whether a 403 / 429 counts, how a paused webhook is
      resumed and whether paused events are replayed — confirmed in writing by MSG91 or observed and recorded, BEFORE production relies
      on reports (BigDev, DR9: the 1,200 / min limit is PROVISIONAL and ⛔ proof that MSG91 will never pause the webhook — ADR-0042
      keeps that residual);
  (d) THEN the SMS webhook created in MSG91's panel — "On Report Received" AND "API Failed Events" (two webhooks, F1) — to the
      production URL (HTTPS), the `x-twt-msg91-secret-token` header, and the payload template of exactly DR2's fields (+ `{{
      deliveryTime | datetime:… }}`), recorded with a panel screenshot; the content type of the first report recorded (DR10);
  (e0) ⭐ the CRQID ECHO: an OPERATOR-TRIGGERED login code after (d) (templates 15 / 16 — the ONLY templates live before (g)),
      received on the operator's phone AND its report stored with a non-NULL `ot…` `crqid`, `match_state = 'otp'`, ⛔ number in any
      column — the proof of DR3's placement (F7); recording it moves OTP production use to Gate 2 (DR11);
  (e) every report kind that ARRIVES within 14 days of (d) recorded — delivered, failed, API-failed (from the `bad_request_id` log
      line if it carries ⛔ usable `requestId` — DR4) — each stored row checked to hold ⛔ number;
  (f) the silence alarm reaching a NAMED person (Row 32 (h)'s bar);
  **(g) Row 33 is closed before ANY claim-text template id (1–14) is provisioned** — Row 32 (i) is ⛔ edited, Row 33 (g) ADDS the
      provisioning half (6-37b `done` is code; reports need the webhook LIVE) — a narrowing, the author's;
  The row's CLOSURE legs are (a), (b0), (b), (c), (c2), (d), (e0), (e)–(g) — ALL of them, each recorded as a Decision (the house shape). ⚠ ⛔ a closure leg,
  a DATED NOTE on the row instead: *"after (g), the first claim-text reports reach `matched:*` — the proof that Flow's `message` IS
  the webhook's `requestId` (F7, ⛔ stated by MSG91); recorded with its date when seen."* It CANNOT come before (g) — ⛔ claim text
  can be sent before then — so as a leg the row could never close; its failure is LOUD and SAFE: every claim report lands
  `other_attempt` with `second_request_for_one_send` alarms, ⛔ state changes (I1), i.e. `-323` R2's gap, alarmed.
  Row 32 gains a dated note pointing to Row 33 AND stating that note (2)'s *"check the balance … BY EYE"* stays IN FORCE (a zero-
  balance send produces ⛔ webhook — F8; only DR12 hints at it). The `epics.md` `### Story 6.37b` entry (6.37's blockquote shape)
  between `:3533` and `:3535`. The deferred-work dispositions (Task 8). ⭐ Recommended (a).

## 🏛️ The Panel's questions (routed by Task 0.3 — ⛔ answered here)

- ⭐ **RULED 2026-10-17 — `-350` (Trustee-ratified, Dhiraj Rahul + Kalpana Bharti): option B1, applied only after a DELIVERY LADDER**
  (WhatsApp when the SMS is not delivered after 4 hours; a second SMS after 48 hours if not delivered by either channel; a third SMS
  48 hours later and a 96-hour wait; then escalation for a call or letter). Six follow-up questions are open (`-350`, "What this ruling
  does NOT cover" (a)–(f)) and go back to the Panel. The text below is kept as it was put.
  ⭐ **FOLLOW-UPS RULED 2026-10-17 — `-351`:** 1 A (only a reported failure starts the ladder); 2 (the claimant's filing agreement is the
  consent — but as built it names texts and post only, so the WhatsApp step stays off until the wording, the opt-in rule and nominees'
  consent are settled with counsel); 3 B (correction AND certificate reminders); 4 A (one ladder per person); 5 A (a recorded call that
  reaches the family counts; tracking / recording / transcription in phase 2); 6 A (no closure while a ladder runs).
  ⭐ **CONSENT RULED 2026-10-17 — `-352`:** the claimant's agreement names text, WhatsApp, phone call, post and any later means (Q1 B);
  WhatsApp and calls reach the claimant AND the nominee — the nominee's basis is the Panel's stated DPDP Act ground, not the claimant's
  agreement (Q2). Counsel's written confirmation, a Meta opt-in check and an architecture §3.4 / ADR-0029 amendment are recorded as owed.
- **PQ1 — "Reached" when the network REPORTS a reminder undelivered** (one routing note, the TEMPLATE's order; the clause each option
  touches goes in the note's EVIDENCE section, ⛔ in the options). §0: passes — *"what the Trust OWES a family"* and a ratified clause
  that is matched or *"narrowed"* (`-252` cl.1 read verbatim: *"accepted by the network (or shown delivered, where a report
  exists)"* — the note gives BOTH readings (Policy meaning (i) / (ii)) and says match / narrow for each). The one fact that decides
  it: **MSG91 says "received" for every text, then tells us hours later — sometimes never — whether the phone network delivered it.**
  Options:
  **A** — record reports, change nothing: an accepted reminder still counts even when reported failed (cost: a claim can be closed for
  silence on a text the network said never arrived — `-323` R2's accepted gap, kept).
  **B1** — ⭐ our reading: a reminder REPORTED undelivered is treated as one the network REFUSED (`rejected_unreachable`) — it no
  longer counts as reached AND it makes the person letter-eligible, exactly as a send-time carrier refusal does today; a reminder with
  ⛔ report counts as today. Cost: closure harder to reach; ONE undelivered report (e.g. a phone off for a day) makes the person
  letter-eligible and `unreachable` for that number for good — a later reminder reported DELIVERED does ⛔ undo it (eligibility keys on
  the FIRST dead outcome); a report that FAILED and then DELIVERED for the same text still reads undelivered (DR6's absorbing rule);
  the closure notice goes by letter instead of SMS when the last reminder was reported undelivered, and the District Admin is chased
  to post the letter (+7 … +12, escalated at +13); a failure reported on the last reminder (day 84), or any report arriving after
  day 89, makes the person letter-eligible but the District Admin is ⛔ chased for them (as today for a number refused on day 84); silence still counts, so a paused webhook or an account fault MSG91
  never reports leaves the old gap for those texts (DR12 alarms it). Which status codes count as "undelivered" (DR4 — incl. NDNC,
  blocked number, country blocked) is the author's choice, stated in E3.
  **B2** — un-count only, ⛔ letter-eligibility (cost: a person whose reminders are all reported undelivered is never reached and
  never offered a letter ⇒ the claim can never be closed for silence — by analogy the cost the 6.19 note gave proven-delivery-only,
  *"the claim waits forever again"*). Put so the Panel sees why B1 carries the letter half.
  **C** — only a DELIVERED report counts (cl.3's "proven delivery", now — cost: when MSG91 sends ⛔ report — a paused webhook, an
  account fault — the family can never be reached by SMS, and without a letter half they are never letter-eligible either ⇒ the same
  *"waits forever"* cost as B2, for every family MSG91 goes silent on; and C is the only option in which a report ADDS reach — a
  forged or mistaken `delivered` report could let a closure be requested, so I1 and ADR-0042's forgery bound fail under C and C
  would need an ADR-0042 amendment first).
  The trace for the note's E3 is F15's (letter-eligibility `foundDeadOn`, `numberKnownDead`, the queue status, the jobs sweep, the
  burst alarm, day 90 and after) — Task 0.1 RE-CONFIRMS it at the then-HEAD and cites it. E3 also states DR4's mapping and DR6's
  absorbing rule (the mixed part — §0 above), and that the CERTIFICATE chase's letter-eligibility is unchanged under every option.
  Blocks: Task 7 only.
- ⛔ **WITHDRAWN 2026-10-17 (`-348`) — not sent.** Under DLT an operator delivers only DLT-approved text, so MSG91 cannot deliver words
  that were not approved: case (i) below is blocked by the operator; case (ii) can arise only if DLT approved different words from the
  Panel's — the question BigDev named instead, traced in Debug Log (e). The text below is kept as it was written.
- **PQ2 — Refuse a correction / closure / certificate text when MSG91's stored template provably differs** (its own note — *"a mixed
  question is two questions"*). §0: passes — refusing a text changes WHO is texted (`-322` §0 option (a)). The one fact: **MSG91 can
  hold a template whose words differ from the ones we render — and the delivery report catches only HALF of that**: (i) MSG91's
  template differs from the DLT-registered words ⇒ it fails DLT scrubbing and, from this story, comes back as a reported failure (⚠
  an INFERENCE from MSG91's DLT failure reasons — F5 — ⛔ stated by MSG91 as a guarantee; the note says so); (ii) MSG91's template
  MATCHES the DLT registration but differs from OUR render (`-345`: *"MSG91 would deliver OTHER words"*) ⇒ it passes scrubbing, is
  DELIVERED, and the report says `delivered` — ⛔ report ever catches it. Options:
  **A** — no refusal (6.37 as built — the text is sent and alarmed). Cost: in case (ii) the family receives other words than the
  Trust approved and it counts as reached; in case (i), under PQ1 A, or when no report arrives, nothing un-counts it either.
  Our reading: **A** if PQ1 is B1, B2 or C (case (i) is then un-counted by its report, or never counted; case (ii) stays the cost);
  **B** if PQ1 is A (nothing else would stop a blocked text from counting as reached). Written in the note as
  `trustee-panel-routing-note-2026-10-17-6-37b-content-mismatch-refusal.md`.
  **B** — refuse on a PROVEN mismatch (cost: that day's reminder slot, or the closure notice for good — `-345` X1's cost, extended);
  the note says PROOF still waits on `-345` S1 / Row 32 (e) (`-345` Consequence 3's trigger — ⛔ changed).
  Blocks: ⛔ code in this story — but Row 32 note (6.4) asks it *"before leg (i) closes"* ⇒ Task 8 requires the PQ2 note SENT (⛔
  ruled) before the row is `done`.
- Both notes: WRITTEN at Task 0.3 from `_bmad-output/planning-artifacts/trustee-panel-routing-note-TEMPLATE.md` (referenced, ⛔
  copied); E4's commands run (an empty result is a finding); ⛔ "shown to the Panel" until BigDev SENDS them
  ([[feedback_shown_to_panel_means_sent]]).

## Acceptance Criteria

Notation: `a:b` = inbox `match_state = a`, `match_detail = b` (DR6).

- **AC0 — Governance before code (Task 0).** DR1–DR14 and DR5-G answered by BigDev and committed ALONE as `-347` (id re-grepped on
  EVERY branch and the 6-31 worktree first — T9), carrying EXACTLY Task 0.3's supersession list and the two `-346` corrections; then
  ONE records commit: ADR-0042 + index row (reconciled), ADR-0041's Changelog row, roster Row 33 + Row 32's pointer note (note (2)
  stays in force), the `epics.md` entry, the two routing notes (written, ⛔ sent), the sprint row → `in-progress` and the ledger line
  — all BEFORE any code.
- **AC1 — Every send carries its CRQID, inside the recipient (DR3).** For each of the five callers, a test drives the REAL caller with
  a fake handle and asserts the message's `correlationId` = `<kind>` + its row id (lower-case, ⛔ dashes) — the certificate caller
  ⇒ `ce` (the wrapper derives it), the closure notice ⇒ `cr`; the client's Flow body (PARSED JSON) deep-equals
  `{"template_id":…,"short_url":"0","recipients":[{"mobiles":…,<values>,"CRQID":"cr<32 hex>"}]}` (`sms.test.ts:254-258`'s leg
  UPDATED, ⛔ deleted); a template value named `CRQID` ⇒ refused like `mobiles` (`localRefusal`); a `correlation` outside the grammar
  ⇒ the CORE logs ONE `[jobs] sms.bad_correlation:<kind>` line (⛔ the id — a recorder) and THROWS before the provider is built (⛔ `fetch`,
  ⛔ a finalised row — the row stays `attempting`, a crash); the client's
  own defence (`dlt_template_not_approved:bad_correlation_id`, ⛔ `fetch`) pinned at the client; the OTP adapter sends `ot` + 32 hex
  from `correlationHex` (two sends with the default ⇒ two values; an injected source ⇒ its value). Updated, ⛔ deleted: the api
  whole-body checks (`member-step-up-delivery-wiring.test.ts:213-215` — `expect.stringMatching(/^ot[0-9a-f]{32}$/)`;
  `sms-step-up-delivery.test.ts:303-307`) and the 51 calls (T15 — fixture row ids uuid-shaped). `sms.test.ts:74`'s exact-keys
  `toEqual` gains a `correlationId` leg. Every OTHER 6.37 assertion stays green UNCHANGED.
- **AC2 — The route authenticates (DR1, I5).** A valid `x-twt-msg91-secret-token` (current OR next token) ⇒ `200 {received:true}` and
  one inbox row; a wrong / missing header ⇒ `403 webhook.signature_rejected`, ZERO rows (an array-valued header — `app.inject` only;
  Node joins repeats with `", "` — ⇒ 403); one leg per ROW of
  DR1's secret-failure table (a fake resolver: throws / blank / 31 chars / usable, for the current and the next name) asserting the
  webhook state, the 403s, and EXACTLY the boot line(s) the table names (a log recorder; ⛔ a value in any line; ⛔ throw from the
  builder — the api starts in every row); the
  token is read ONCE (a counting resolver passed to `buildSmsReportWebhookAuth` — ⛔ per request); the route is in `PUBLIC_ALLOWLIST`
  with its justification. ⭐ The AI-5-1 gate BITES: a `lib.test.ts` leg runs `scanSecretCompareInvariant` on a copy of the handler
  with `===` and asserts it IS flagged, and the real handler passes.
- **AC3 — Only the projection is kept (DR2, DR10, I3).** A body holding every F3 field ⇒ the row holds exactly DR2's columns;
  `telNum`, `senderId`, `credit`, `userId`, `DLT_TE_ID` appear in ⛔ column, ⛔ log line, ⛔ alarm (the `buildServer` `logStream`
  recorder; a `SELECT row_to_json` scan for the number's digits); a MALFORMED body carrying `telNum`'s digits ⇒ `200`, ⛔ row, and
  ⛔ log line holds the digits (the parse error is caught, ⛔ logged); `"CRQID":"0"` / `""` ⇒ NULL; a `failure_reason` with a 10-digit
  run ⇒ stored with `#`; an array of 3 ⇒ 3 rows; a report with ⛔ usable `requestId` inside an array of 3 ⇒ 2 rows + ONE
  `bad_request_id` line; a non-object / non-JSON / empty body, ⛔ content type, `text/plain`, or `application/x-www-form-urlencoded`,
  each with a valid token ⇒ `200` (⛔ 415, ⛔ 400), ⛔ row, ONE `{alarm:'sms_report.unusable_body'}` line per request (⛔ `console.*`);
  `application/json; charset=utf-8` accepted.
- **AC4 — Persist-then-ack and dedupe (I4, DR7).** The same report posted twice ⇒ ONE row, both `200`; two POSTs with the same
  request id, CRQID and status code but a different `failureReason`, `eventName` and `deliveryTime` ⇒ ONE row holding the FIRST
  POST's values, both `200`, and no log line for the second; two POSTs that differ only in status code ⇒ TWO rows; two with no
  CRQID and no status but the same request id ⇒ ONE row (the blank-key case); the handler makes ⛔ KMS,
  Secret Manager or outbound call (counting fakes); a failed COMMIT is RETHROWN ⇒ 5xx (MSG91 retries) — ⛔ a 200 for a lost write
  (the `closeScopeTx` `:67-78` behaviour, kept in the global write — F18).
- **AC5 — Status mapping (DR4).** One leg per code: `1` ⇒ `delivered`; `2` / `9` / `16` / `17` / `20` / `25` ⇒ `undelivered`; `0` ⇒
  `ignored:intermediate`; NULL / `7` / `"x"` ⇒ `ignored:unknown_status` + alarm; ⛔ `event_name` / `failure_reason` changes a result
  (pinned with `eventName:"delivered"` on a `status:"2"` body ⇒ `undelivered`); the same mapping on an `ot` report ⇒ `otp:<result>`,
  and an `ot` report with an unknown code raises the same `unknown_status` alarm.
- **AC6 — Matching (DR6, I6).** Live (:5433), one leg per DR6 row: (1) ⛔ CRQID ⇒ `unmatched:no_crqid` + alarm; (2) `ot…` ⇒
  `otp:*`, ⛔ lookup (a statement recorder); (3) a row that does not yet exist ⇒ `pending`, retried on the schedule, `unmatched:no_row`
  + alarm after 72 h (a controllable clock); (4) a CRQID naming a 0128 `staff_push` row ⇒ `unmatched:not_sms`, ⛔
  `sms_send_deliveries` row; (5) a ping with `send_outcome` NULL ⇒ retried, then `unmatched:not_begun`; (6) an `attempting` row ⇒
  retried, then `matched:*` once it is finalised `accepted` — and `unmatched:still_attempting` if still `attempting` at 72 h; (7) a
  different request id for the row, and a report for a row whose outcome is `error` ⇒ `other_attempt:<kind>` + ONE alarm, ⛔
  `sms_send_deliveries` change; (8) the counting contract, one leg per line of DR6's contract table, each reading the `sms_send_deliveries` row back
  under the send row's own Pariwar scope (and showing it is not visible under another Pariwar):
  (8a) the first matching report creates exactly one row with `report_count = 1`, `first_reported_at = reported_at` = that report's
  `received_at`, and that report's `delivery_state`, `status_code`, `failure_reason` and `request_id`;
  (8b) `delivered` then `undelivered` ⇒ state `undelivered`, `report_count = 2`, and the `undelivered` report's `status_code` and
  `failure_reason`;
  (8c) `undelivered` (status `2`) then `delivered` ⇒ state still `undelivered`, `report_count = 2`, `status_code` still `2`,
  `failure_reason` still the first report's, `reported_at` = the later report's `received_at`;
  (8d) `undelivered` (status `2`) then `undelivered` (status `16`) ⇒ `report_count = 2`, `status_code` still `2`, `failure_reason`
  still the first report's;
  (8e) in every later-report leg, `request_id` is unchanged;
  (8f) the same report POSTed twice ⇒ one inbox row and `report_count = 1`; and two POSTs with the same request id, CRQID and status
  code but a different failure reason, event name and delivery time ⇒ one inbox row and `report_count = 1`, with
  `sms_send_deliveries`' `failure_reason` being the FIRST POST's (DR7's dedupe rule: duplicates by key, not by payload);
  (8g) status `0` then status `1` for the same send ⇒ `report_count = 1` (the status-`0` report is DR6 row 9 and is not counted);
  (8h) two reports where the one received LATER is settled FIRST ⇒ `first_reported_at` = the earlier `received_at` and
  `reported_at` = the later one;
  (8i) a settle replayed after its lease lapsed ⇒ `report_count` and every other column unchanged (with AC7);
  (9) status `0`, and separately an unknown status (`7`), on a matching row ⇒ `ignored:intermediate` / `ignored:unknown_status`, no
  state change and no `sms_send_deliveries` write. Legs (1)–(7) and (9) each also assert that `sms_send_deliveries` is unchanged
  (the same rows, every column equal) — none of those reports is counted. Each kind
  (cr reminder, cr closure notice, ce, sn, pm) matched at least once.
- **AC7 — The drain is at-least-once (DR8, T2).** A worker that throws mid-row leaves it re-claimable after the lease (pinned); a
  retry settle clears `lease_until` (the next attempt is due at the backoff, ⛔ the lease); a new row's `next_attempt_at` defaults to
  `now()`; two concurrent drains settle a row ONCE (`SKIP LOCKED`, counted); the settle and the `sms_send_deliveries` write are atomic
  (a forced failure after the upsert leaves BOTH unchanged); the claim's limit is clamped (default 200, cap 500).
- **AC8 — The send tables are untouched (I2).** I2's migration diff and grep are EMPTY; a live leg asserts every send-table row of
  AC6 is byte-identical (all columns) before and after correlation; `delivered_at` is NULL on every row; 0155's and 0166's triggers ⛔
  fire (⛔ UPDATE is attempted — a statement recorder on the correlator's client).
- **AC9 — Silence and the OTP line (DR11, DR12).** An accepted SMS send 49 h old with ⛔ report ⇒ ONE `sms_report.silence:1` alarm;
  one with a report ⇒ ⛔ counted; one 47 h or 8 days old ⇒ ⛔ counted; an accepted 0128 `staff_push` row ⇒ ⛔ counted; an accepted
  ping (`send_outcome`, by `send_updated_at`) ⇒ counted; one leg per table (cr reminder, cr closure notice, ce, sn, pm); the daily
  OTP line counts `otp:*` rows by result and carries ⛔ id.
- **AC10 — Retention and grants (DR5-G, DR7).** A daily prune deletes inbox rows whose `settled_at` (stamped on every non-`pending` settle) is more than
  30 days ago (the `device-token-cleanup.ts` shape); `pending` rows are ⛔ pruned; `sms_send_deliveries` is ⛔ pruned (it is the record). Both
  tables' policy-regression specs pin EXACTLY the grants and policies DR5-G chose (⛔ a policy for an ungranted command).
- ⭐ **MOVED 2026-10-17 to row `6-37c-undelivered-reminder-ladder` (`-353`)** — AC11 is that row's starting point and is NOT built
  by this story. Kept as written below.
- **AC11 — D22 and letter-eligibility, AS THE PANEL RULES (Task 7; I1, I7).** ⭐ RULED: `-350` — B1 plus the delivery ladder. ⏳ The
  legs below are B1's and still hold for the CONCLUSION; the ladder's legs (WhatsApp at 4 h, SMS at 48 h and 96 h, the 96-hour wait,
  the call / letter escalation) are written only after the Panel answers `-350`'s follow-up questions (a)–(f), because each changes
  what is built. Under B1: ONE mapping inside `readReturnFamilyRows` (it gains `reminder_id`; a LEFT JOIN on `('cr',
  reminder_id)`) — a `family_sms` row whose `sms_send_deliveries` state is `undelivered` reads with EFFECTIVE outcome
  `rejected_unreachable` (⛔ a stored outcome changes — I2). Legs: accepted + ⛔ report ⇒ reached (UNCHANGED); accepted +
  `delivered` ⇒ reached; accepted + `undelivered` ⇒ ⛔ reached; ANY undelivered row in the current-number epoch ⇒ `foundDeadOn` set,
  letter-eligible (`assertCorrectionLetterRecordable` accepts), queue status `unreachable` — and STILL so after a later reminder is
  reported `delivered`; the LAST evidential row undelivered ⇒ `numberKnownDead` ⇒ the closure notice is a LETTER, ⛔ an SMS
  (`closureNoticeRecipients`); closure refused at request AND at decide (each of the four `assertClosureGround` callers); the jobs
  sweep starts the District Admin's letter-chase row on found-dead +7 and the +13 escalation for that person; an undelivered report
  on the OLD number after a 6.20 number change changes ⛔ the current number's facts; a report on a closure-notice / certificate /
  suspicion / peer-mesh row changes ⛔ any of them (F15); the certificate chase's letter-eligibility is unchanged; the `-269` §4 burst
  alarm either ALSO counts yesterday's undelivered reports or the Completion Notes record why not (Task 7 decides — the author's).
  The correction chase view's `status` / `foundDeadOn` / `remindersAccepted` change as the ruling says (DR13). Under B2: the reach
  half only, and a leg pins that the person is ⛔ letter-eligible (the cost the note names). Under A: ⛔ code change, a leg pins that.
  Under C: the Panel's text decides; this AC is re-written. The Policy meaning is re-checked against the ruling's words.
- **AC12 — Nothing else moves.** I8's diff EMPTY; ⛔ i18n / registry text / sheet table edit; `dlt-typed-variables` gate green (new
  non-registry files spell ⛔ the template-id prefix — T11); `channels-determinism` green; ⛔ staff view change in Tasks 1–6 (DR13 —
  Task 7's correction-chase change is the Panel's); ⛔ OTP-path behaviour change beyond the CRQID (I7); `getStatus` still `unknown`.
- **AC13 — The proof.** `pnpm ci:local` green with `DATABASE_URL` at :5433 EXPLICITLY (or each red explained and re-run alone); a
  global-fetch RECORDER at ZERO calls across the new suites (I9); every new table has its `…-policy-regression.spec.ts`; the route's
  per-route limit answers 429 past `SMS_REPORT_WEBHOOK_RATE_MAX` (DR9); `terraform fmt -check` and `terraform validate` on
  `infra/cloudflare` as green as on HEAD before the edit.

## Tasks / Subtasks

- [ ] **Task 0 — governance FIRST (AC0). ⛔ No code.**
  - [x] 0.1 `git fetch origin`; `git diff --name-only dae96d9b..origin/main -- packages/channels apps/jobs/src apps/api/src
        packages/domain/migrations packages/domain/src/claim infra docs/launch-gate-inventory docs/adr`; re-read any cited file that
        moved. Check the 6-31 worktree / branch for its claims on 0167, `-347`, ADR-0042, Row 33 and the ledger letter (T9 — already
        written there, uncommitted, 2026-10-17). Re-read F1–F10's pages (docs ONLY — T1; record the date). ⭐ RE-CONFIRM F15's PQ1
        trace at the then-HEAD (letter-eligibility `foundDeadOn`, `numberKnownDead`, the queue status, the jobs sweep `:1123-1290`,
        the burst alarm `:751-756`, day 90 and after) — cites for the PQ1 note's E3.
  - [x] 0.2 Put DR1–DR14 to BigDev, each with its recommendation and cost — incl. DR6's 72 h, DR7's 30-day prune (AC10), DR9's 1200 / min,
        DR11 (c) vs (c′), DR14 (a) vs (b), the Row 30 note (6) (b) reading (Sequencing) — and **DR5-G WITHOUT a recommendation** (both options and costs as written). Record the
        answers verbatim.
  - [x] 0.3 Write the author-commit `-347` (`.decision-log.md`, prepended; the `-345` entry's shape: Decision type / Status / Author /
        Ratifying trustees: None / §0 gate / Occasion / FOUND / The decisions / Consequences / References). ⭐ THE supersession list
        (the ONE copy — AC0 and DR14 (c) point here; each attributed to the entry OR the story file, as it is):
        - DR3 supersedes the 6.37 story file's MG9 *"⛔ `CRQID` (6-37b decides correlation)"*;
        - DR5 supersedes `-345` MG1's *"delivery state on the five send tables"* (a new table instead);
        - DR2 / DR3 supersede the 6.37 story file's MG1 *"correlation by request id + recipient"* (⛔ recipient);
        - DR11 supersedes the 6.37 story file's MG1 *"the OTP's gateway id in its audit"* (`-345`'s entry: *"the OTP's gateway id"*);
        - Row 33 (g) NARROWS Row 32 (i)'s practical meaning (the webhook LIVE before any claim-text id);
        - a dated Row 30 note NARROWS Row 30 (b)'s device proof (a staging proof from the CRQID build before production — DR11 (c));
        - it ADDS to `-345`;
        - the `-346` corrections: (1) its Status's *"decisions 2 and 3 precede their code"* is wrong; (2) its Status attaches
          `fe3dc2c4` / `88e1ec97` to decision 1 — decision 1 = `4c03aed1`, decision 2 = `88e1ec97`; plus the two dated `-346` §0
          corrections (6.37 Debug Log (a), (p)).
        ⛔ Edits any entry ([[feedback_supersede_never_reinterpret]]). Re-grep every branch's `.decision-log.md` (and the 6-31
        worktree's) for the next free id right before inserting. Stage in scratchpad; try the insert
        ([[project_decision_log_writes_user_inserted]]). Commit ALONE on the story branch; write its SHA after, ⛔ before. Then WRITE the
        two routing notes `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-10-17-6-37b-reported-undelivered.md` (PQ1) and
        `…-6-37b-content-mismatch-refusal.md` (PQ2) from the TEMPLATE (referenced, ⛔ copied); PQ1's E3 states DR4's mapping and DR6's
        absorbing rule (the §0 mixed-question disclosure); clause cites in EVIDENCE, ⛔ in the options; run each E4; ⛔ "sent" until
        BigDev sends them.
  - [x] 0.4 The records (one commit, after 0.3): ADR-0042 from `docs/adr/_adr-template.md` (DR14 (c)'s contents) +
        `docs/knowledge-transfer/adr-index.md` row and reconciliation (Total 152 → 153; `drafted` 2 → 3; arithmetic re-checked);
        ADR-0041 Changelog row (CRQID, inside the recipient; ⛔ a word above rewritten); roster Row 33 (DR14 (c) closure legs (a), (b0),
        (b), (c), (c2), (d), (e0), (e)–(g) + the dated `requestId` observation note) + Row 32 dated note (points to Row 33; note (2) stays in force; ⛔ a
        word rewritten) + Row 30 dated note (DR11 (c)'s device proof from the CRQID build); `epics.md` `### Story 6.37b: … \`[PRIMITIVE]\``
        before `:3535`; the sprint row comment + `6-37b-msg91-delivery-reports: in-progress`; both ledgers (the top-of-file `#
        last_updated: 2026-10-17<next free letter after k> (…)` and the `last_updated: >-` list)
        ([[project_sprint_status_safe_prepend]] — guard the size, verify the YAML parses).

- [ ] **Task 1 — the CRQID (AC1).**
  - [ ] 1.1 `packages/domain/src/sms-delivery/correlation.ts` (+ index export): the grammar `^(cr|ce|sn|pm|ot)[0-9a-f]{32}$`,
        `formatSmsCorrelationId({kind, rowId})` (lower-case, ⛔ dashes; throws on a non-uuid) and `parseSmsCorrelationId(s)` — the ONE
        TS copy (DR3); unit legs.
  - [ ] 1.2 `packages/channels/src/providers/sms-app.ts`: `SmsGatewayMessage.correlationId?`; `buildFlowBody` puts `CRQID` INSIDE the
        single recipient object when present (update its doc comment — `:303` says ⛔); `CRQID` added to `localRefusal`'s reserved
        recipient keys (`:316-320`); the defence-only local refusal `dlt_template_not_approved:bad_correlation_id` (grammar from
        `@twt/domain`). `sms-dlt.ts`: `SmsProviderDeps.correlationId?` copied into the message by `buildGatewayMessage`; the stale
        6-37b comments (F11 — `sms-app.ts:18`, `sms-dlt.ts:100`, `sms-errors.ts:15`, `sms.test.ts:93`, `sms-otp-preflight.ts:6`);
        `getStatus` stays `unknown`.
  - [ ] 1.3 `claim-dlt-sms-send.ts`: `ClaimDltSmsInput.correlation: {kind: 'cr'|'ce'|'sn'|'pm'; rowId: string}`, validated by
        `formatSmsCorrelationId` at the TOP of `sendClaimDltSms`, OUTSIDE every try (config `:244-256`, provider-build
        `:306-311`, send `:318-342`) — ONE `console.error` line `[jobs] sms.bad_correlation:<kind>` (⛔ the id) then a THROW
        (`:119-124`'s rule), ⛔ a final (T22; pg-boss logs ⛔ handler throw — DR3); the provider only copies the formatted string. The wrapper
        `sendClaimCorrectionSms` (`claim-correction-reminders.ts:224-246`) takes `rowId` and DERIVES the kind from `message`
        (`certificate_reminder` ⇒ `ce`, else `cr`). Callers: reminder `:430`, closure `claim-correction-closure.ts:371`, certificate
        `claim-certificate-reminders.ts:658` (via the wrapper, `begun.reminderId`); suspicion `claim-suspicion-notices.ts:457`
        (`{kind:'sn', rowId: begun.noticeId}`); peer mesh `claim-peer-mesh-requests.ts:689` (`{kind:'pm', rowId: pingId}`).
  - [ ] 1.4 `apps/api/src/modules/auth/shared/sms-step-up-delivery.ts`: `SmsDltStepUpDeliveryDeps.correlationHex?: () => string`
        (default `() => randomBytes(16).toString('hex')`); the message passed to `messaging.send` (`:206`) carries `correlationId:
        'ot' + correlationHex()`.
  - [ ] 1.5 Tests: `sms.test.ts:254-258` updated (inside the recipient) + `:74` gains a `correlationId` leg; the T15 list (51 calls
        — a typecheck break first; uuid-shaped fixture row ids in the two `msg91-*` suites); the two api whole-body checks (AC1); a
        per-caller leg; a core leg (bad correlation ⇒ throw, ⛔ `fetch`, row stays `attempting`). `git grep -n "CRQID\|short_url" --
        packages apps` before declaring Task 1 done.
- [ ] **Task 2 — the migration 0167 (DR5, DR5-G, DR7; AC8, AC10).** `packages/domain/migrations/0167_sms-delivery-reports.sql`
      (hand-authored; the journal entry idx 167, `when` 1794195600011 — re-check T9): `sms_delivery_report_inbox` (global RLS — ENABLE +
      FORCE, a per-command policy for each granted command — DR7's clause forms) and `sms_send_deliveries` (tenant RLS — the 0128 `:69-73` per-command shape; PK); CHECKs on `send_kind`,
      `delivery_state`, `match_state`, `match_detail`, the `request_id` / `crqid` grammars (the SQL mirror of 1.1); the dedupe as an
      EXPRESSION unique index on EXACTLY (request id, CRQID blank-coalesced, status code blank-coalesced) — DR7's dedupe rule; `attempts` / `next_attempt_at` / `match_state` NOT NULL with defaults; grants AND policies EXACTLY
      as DR5-G was answered (+ a comment naming roster Row 26 for jobs' production role — F21). Drizzle schema files in
      `packages/domain/src/schema/` (`uniqueIndex().on(sql\`…\`)`) + their index export. Policy-regression specs for BOTH tables
      (`packages/domain/tests/integration/rls/`). ⛔ Touch any send table (I2).
- [ ] **Task 3 — the domain accessors (AC6, AC7, AC10).** `packages/domain/src/sms-delivery/` (with 1.1):
      `persistSmsDeliveryReports(tx, rows)` (`ON CONFLICT DO NOTHING`, returns inserted count), `claimDueSmsDeliveryReports(db, {limit,
      leaseMs, now})` (the lease — T2; `clampLimit` default 200 / cap 500 APPLIED BY HAND if the claim is raw SQL — DR8),
      `settleSmsDeliveryReport(...)` (the CAS; a retry clears `lease_until`), `upsertSmsSendDelivery(...)` (DR6's contract table IN SQL
      — ONE `ON CONFLICT … DO UPDATE SET …` with ⛔ `WHERE`; ⛔ read-then-write), `lookupSendForCorrelation(db, kind, rowId)` (per-kind SELECT of F12's
      columns: `pariwar_id`, `outcome` / pings `send_outcome`, `provider_message_id`, `updated_at` / pings `send_updated_at`, and
      `purpose` on `claim_correction_reminders`), `pruneSettledSmsDeliveryReports(db, {olderThanDays})`, `readSmsSendDeliveries(tx,
      kind, rowIds)`. Unit + live legs.
- [ ] **Task 4 — the route (AC2–AC4, AC13).** `apps/api/src/modules/channel-webhooks/`: `msg91-sms-reports.ts` (the projection —
      DR2; the JSON parse in a try / catch; pure, unit-tested exhaustively) + the handler (header `x-twt-msg91-secret-token` as an
      INLINE literal; TWO DIRECT `timingSafeEqualString` calls) + the route registered in its OWN encapsulated scope with
      `removeAllContentTypeParsers()` + a `'*'` buffer parser (DR10), `schema: { hide: true }`, DR9's `rateLimit`. Global write: a
      `deps.pool` client, `BEGIN` → `SET LOCAL ROLE twt_app` (`apps/api/src/modules/multi-tenant/scope-tx.ts` `:24-38`'s shape, WITHOUT `setPariwarScope` — a NEW shape for a
      global write, F18) → INSERT → `COMMIT` RETHROWN on failure (as `closeScopeTx` `:67-78` does) → `200` (I4). Alarms: `request.log.error({alarm:…})`
      once per request (DR2). `apps/api/src/config.ts`: `smsReportWebhook: {tokenSecretName?, tokenEnvFallback, nextTokenSecretName?,
      nextTokenEnvFallback, rateMax}` (DR1's names); `deps.ts`: the exported `buildSmsReportWebhookAuth({config, resolveSecret})`
      (boot-resolved; unset / unresolvable ⇒ 403-everything + one line — DR1). ⭐ ALSO UPDATE (the `AppDeps` ripple):
      `apps/api/src/context.ts` (the new `AppDeps` field, beside `:709`), `apps/api/tests/integration/_setup.ts` (`TestDepsOverrides`
      `:290`, `buildTestDeps` `:461`), `tests/integration/claims/verifier-console.spec.ts` (its `AppDeps` literal).
      `infra/dokploy/compose.yaml`: the secret-name lines under `services.api.environment` beside `:32-33` (operator applies — the
      6.30 precedent). `infra/cloudflare/waf.tf`: DR9's SEPARATE rule after Rule 0, with its comment; `terraform fmt -check` /
      `validate` before and after. `login-wall.spec.ts` allowlist entry. Tests: `apps/api/tests/integration/channel-webhooks-msg91.spec.ts`
      (the header read, 403, `{received:true}` legs from `channel-webhooks-telegram.spec.ts`'s harness — ⛔ its per-request secret or
      scope tx) + unit + the 429 leg (DR9) + the `logStream` recorder legs (AC3).
- [ ] **Task 5 — the correlator, prune, silence and OTP line (AC5–AC7, AC9, AC10).** `apps/jobs/src/sms-delivery-correlator.ts` (DR4,
      DR6's TABLE row by row, DR8 — the status table data-driven), `sms-delivery-prune.ts` (daily `'25 3 * * *'` IST),
      `sms-delivery-silence.ts` (DR12's per-table queries + DR11's OTP line, daily `'40 3 * * *'` IST); queue constants in
      `QUEUE_NAMES` (`packages/queue/src/index.ts:41`); registered in `apps/jobs/src/boot.ts` with the service pool (the
      `tg-webhook-processor` / `device-token-cleanup` wiring). Alarms through each module's `onAlarm?` dep (default `console.warn`,
      unwired in boot — DR8; ⛔ an id, ⛔ a number, ⛔ a request id in an alarm — the kind and counts only). Live tests :5433.
- [ ] **Task 6 — the gates and the untouched (AC2, AC8, AC12, AC13).** I2's diff + grep and I8's diff EMPTY; AC8's live leg (every
      AC6 send-table row byte-identical before / after; `delivered_at` NULL) and the statement recorder on the correlator's client (⛔
      `UPDATE` of a send table); `pnpm --filter @twt/channels test:determinism`; `pnpm dlt-typed-variables:test && pnpm
      dlt-typed-variables:check` (`git add` new files first); the access-wrapper invariants + AC2's `lib.test.ts` leg + a REVERT-SANITY
      run (swap one compare to `===` locally ⇒ the gate goes RED ⇒ revert; record it in the Debug Log); the AC13 fetch recorder.
- ⭐ **MOVED 2026-10-17 to row `6-37c-undelivered-reminder-ladder` (`-353`)** — not built by this story; kept as written below.
- [ ] **Task 7 — D22, AS THE PANEL RULES (AC11).** ⭐ Ruled (`-350`): B1 + the delivery ladder. ⏳ Still blocked: the ladder's
      follow-up questions (a)–(f) are open, and the ladder's story shape (here, or a new row) is BigDev's decision. **Do not start Task 7 until** the ruling is TRANSCRIBED into the routing note's block
      and a Trustee-ratified decision entry, and AC11 is re-written to it. Under B1: ONE effective-outcome mapping inside
      `readReturnFamilyRows` (it gains `reminder_id`; an `undelivered` `family_sms` row reads as `rejected_unreachable`) — every
      reader F15 lists inherits it (`readReturnPersonStates` ⇒ `correction-letter.ts`, `correction-chase-read.ts`,
      `correction-closure.ts`, and the jobs sweep `claim-correction-reminders.ts:1123-1290`); ⛔ a second copy of the mapping per
      reader. Decide the `-269` §4 burst alarm (`:751-756`, raw SQL — it bypasses the mapping): extend it to count yesterday's
      undelivered reports, or record why not (AC11). Legs per AC11 incl. the four `assertClosureGround` callers, the letter form's
      eligibility, the jobs letter-chase / escalation legs, and `foundDeadOn`'s stickiness; the Policy meaning re-checked. ⚠ The
      domain type change ripples into `correction-chase-read.ts` fixtures ([[feedback_story_validate_footguns]] #1 — domain vs
      contracts shape; ⛔ a contracts change is expected).
- [ ] **Task 8 — records and close (AC13).** ⭐ (`-353`) every disposition below that depends on Task 7 or on the Panel's ruling is
      made by row 6-37c when it closes; this story records only that the reports are received and recorded. `pnpm ci:local` at :5433; the deferred-work dispositions ([[feedback_closure_language_precision]]
      — ⛔ collapsed): *"⛔ DLT send consumes a delivery report …"* — under B, **Closed by** Task 7 for the CORRECTION CHASE's D22,
      **⛔ addressed** for the certificate / peer-mesh staff views (→ DR13's new item) and **narrowed** to silence (DR12); under A,
      **⛔ addressed — the Panel kept the gap** (cite the ruling); *"At-least-once SMS (inherited from 6.19b)"* and *"⚠ At-least-once
      family SMS"* — each lists *"a delivery-receipt (DLR) seam"* as a TRIGGER and this story ships it ⇒ **trigger FIRED** (say so) and
      **partly addressed**: a second request for one send is now DETECTED and alarmed (DR6 row 7), ⛔ prevented (MSG91 has ⛔
      idempotency key) ⇒ OPEN, residual re-triggered on *"a gateway idempotency key"* (a dated annotation — ⛔ a silent trigger
      rewrite); *"MG5's content / DLT-id …"* — its Panel question WITHDRAWN (`-348`; already annotated), the item stays OPEN as engineering. NEW items: DR4's API-failed
      mapping (trigger Row 33 (e)); DR5's unused `delivered_at`; DR12 (b)'s pull; DR13's certificate / peer-mesh views. (The PQ2 note
      is WITHDRAWN — `-348` — so the row no longer waits for it.) The Change Log; the File
      List; the sprint row → `review`; the ledger line. ⛔ Fast-forward to `main` — BigDev's call.

## Dev Notes

### ⚠ TRAPS

1. **T1 — ⛔ Never call MSG91** — ⛔ a test, a script, a webhook configured from dev; ⛔ a "smoke" POST to a real MSG91 endpoint; ⛔
   the pull API (F9). I9's recorder enforces the send side; the webhook side is ours (`app.inject` only).
2. **T2 — ⛔ Copy the Telegram / WA drain's CLAIM.** It stamps `processed_at` in the claim ⇒ at-most-once (F19); copy only the cron
   registration and the per-row try / catch. The lease is the at-least-once mechanism (DR8).
3. **T3 — ⛔ Latest-wins.** `upsertWaSendStatus` regresses a status on a retried / out-of-order report (F19). DR6's UPSERT (row 8) is absorbing, in SQL, and still COUNTS the absorbed report (⛔ a `WHERE`).
4. **T4 — A Cloudflare challenge pauses the webhook SILENTLY** (F6, F20) — DR9's skip and Row 33 (c); the silence alarm (DR12) is the
   only in-app detector.
5. **T5 — The global rate limit (300 / min per IP) would 429 a burst** ⇒ retries ⇒ auto-pause; set the per-route limit (DR9). ⚠
   Whether 429 counts toward SMS auto-pause is ⛔ documented (WhatsApp exempts it).
6. **T6 — The send tables are frozen ON PURPOSE** (0155's whole-row freeze; 0166's delivery-column guard; 0128 / 0138's narrowed
   grants and the `delivered_at` CHECK) — ⛔ UPDATE them (I2). The correlator READS them on the service pool.
7. **T7 — `"CRQID":"0"`** is MSG91's "none" (F3) — and `""` too; both ⇒ NULL ⇒ `unmatched:no_crqid`.
8. **T8 — Every field is a STRING; timestamps disagree in form** (F2, F3) — ⛔ arithmetic on `deliveryTime` / `requestedAt`; the
   correlator's clock is `received_at` (ours). Store `reported_delivery_time` as text for the record only.
9. **T9 — Five numbers race the 6-31 worktree** — migration 0167 (and its journal `when`), decision `-347`, ADR-0042, roster Row 33,
   the ledger letter. 6-31's uncommitted story ALREADY claims 0167, `-347`, Row 33 (`peer-mesh-wa-reminder-template-approved`) and
   ledger `2026-10-17k` (F22). Re-check `git log --all` and the 6-31 worktree at Task 0.1 AND right before each write; whichever lands
   on a branch first keeps the number — the other renumbers EVERY cite of it in its own files.
10. **T10 — Migrations are hand-authored; ⛔ regenerate an applied one** (42P07); ⛔ `DROP SCHEMA`; edits reach :5432 AND :5433
    ([[project_live_db_test_gotchas]]). Push with `DATABASE_URL` at :5433 ([[project_prepush_hook_inherits_5432]]).
11. **T11 — The `dlt-typed-variables` gate reads COMMENTS** (6.37 T4): new `src` files outside `REGISTRY_FILES` must ⛔ spell the
    template-id prefix, `DLT_VAR` or the `{#var#}` literal.
12. **T12 — `PUBLIC_ALLOWLIST`** (`login-wall.spec.ts:28`) — the login-wall test fails without the entry; it needs a justification comment.
13. **T13 — The AI-5-1 constant-time gate covers `CHANNEL_ROOTS` only, and only VERIFICATION CONTEXTS inside them** (F18, I5) —
    keep the handler in `channel-webhooks`, read `'x-twt-msg91-secret-token'` as an INLINE literal, and compare with DIRECT
    `timingSafeEqualString` calls (⛔ inside an arrow); otherwise a regression to `===` passes the gate GREEN. AC2's `lib.test.ts` leg
    and Task 6's revert-sanity run prove it bites.
14. **T14 — Row 26 (`jobs-db-role`) is OPEN** (F21) — the new tables' grants are DR5-G's answer (⛔ a third shape); name Row 26 in
    the migration comment; ⛔ invent a production role here.
15. **T15 — The 6.37 pins that turn red** — `sms.test.ts:254-258` (the body deep-equal; `:259` *"⛔ CRQID"*); `sms.test.ts:74`'s
    exact-keys `toEqual({to, templateId, values, body})` (stays GREEN — `toEqual` ignores an `undefined` key — so it needs its OWN
    `correlationId` leg); the api whole-body checks `member-step-up-delivery-wiring.test.ts:213-215` (`stringMatching`),
    `sms-step-up-delivery.test.ts:303-307` (inject `correlationHex`); the REQUIRED `ClaimDltSmsInput.correlation` breaks 51 calls —
    `apps/jobs/tests/claim-correction-send.test.ts` (7 core + 32 wrapper), `msg91-real-client-caller.test.ts` (1 + 8),
    `msg91-no-network.test.ts` (2 + 1) — 10 to `sendClaimDltSms`, 41 to `sendClaimCorrectionSms`; a TYPECHECK error first
    (`apps/jobs/tsconfig.json` includes `tests/**/*`), a runtime crash second; the two `msg91-*` suites drive the REAL client, so their
    fixture row ids must be uuid-shaped or the grammar refuses them; ADR-0041 `:48` / `sms-app.ts:303`'s comment and F11's stale
    comments. `git grep -n "CRQID\|short_url" -- packages apps`
    before declaring Task 1 done ([[feedback_story_validate_footguns]] #31).
16. **T16 — Prettier is ⛔ enforced** — hand-format ([[project_prettier_not_enforced]]); ⚠ `**cl.3**` inside a JSDoc closes it
    ([[project_markdown_emphasis_closes_jsdoc]]).
17. **T17 — Fastify (5.8.5, read in source — DR10)** — [[project_fastify_empty_json_body_400]]'s 400 is the DEFAULT JSON parser's
    and does ⛔ apply under a `parseAs:'buffer'` parser (an empty Buffer reaches the handler); ⛔ content type ⇒ `rawBody` undefined
    (⛔ WA's *"wiring bug"* 403); an unregistered content type ⇒ 415 BEFORE auth (counts toward auto-pause) ⇒ DR10's own scope with a
    `'*'` parser; ⛔ async `onSend` ([[project_fastify_onsend_doublesend]]).
18. **T18 — Content-type with a charset** — `application/json; charset=utf-8` matches (the media-type fallback); assert it (AC3).
19. **T19 — Contracts / jobs tests sit partly outside tsc** — run vitest per package ([[project_contracts_tests_outside_tsc]]); ⛔ a
    `@twt/events` import into domain ([[project_member_lifecycle_domain_substrate]] — turbo cycle).
20. **T20 — `JSON.parse`'s message QUOTES the body** (I3) — catch the parse error in the handler and ⛔ log it or its message; an
    uncaught throw reaches `errorMappingHandler`'s `err` log (`error-mapping/index.ts:690`) with the member's number in it.
21. **T21 — ⛔ Copy Telegram's secret or tx** — it resolves the secret per request (`handlers.ts:145`) and opens `openScopeTx` per
    Pariwar (DR1, F18) — `openScopeTx` needs a Pariwar the inbox does ⛔ have; AC4 needs a failed COMMIT RETHROWN, as `closeScopeTx` does.
22. **T22 — Where a throw becomes a final** (DR3) — in `claim-dlt-sms-send.ts` the provider-build try (`:306-311`) and the send try
    (`:318-342`) turn ANY throw (a `SendTimeoutError` excepted — a transient, `:340`) into a final `error` (`config:sms_messaging_unavailable`) that SPENDS the text, and `provider.send`
    catches a `buildGatewayMessage` throw itself (`sms-dlt.ts:77-96` ⇒ `rejected` `unknown:*` ⇒ a final `error`); a correlation check
    placed in `createSmsDltProvider` or `buildGatewayMessage` is therefore a final, ⛔ a crash. A crash is SILENT in pg-boss (DR3) ⇒
    log one line first. Validate at the TOP of `sendClaimDltSms`. ⭐ And the wrapper `sendClaimCorrectionSms` DERIVES the kind (`ce` for the
    certificate reminder) — ⛔ a caller-supplied kind.

### Reuse map

| Need | Reuse | ⛔ Rebuild |
|---|---|---|
| Static-header webhook | `receiveTelegram`'s header read / 403 / `{received:true}` (`channel-webhooks/handlers.ts:137-179`), `timingSafeEqualString` | a new compare; ⛔ its per-request secret or scope tx (T21) |
| Boot-resolved secret | `buildTurnstileVerifier` (`deps.ts:129-143`), `buildMemberStepUpDelivery`'s builder shape (`:240-245`) | a per-request resolve |
| Raw-body parser | the module's buffer-parser idea (`channel-webhooks/routes.ts:31-38`), in the route's OWN scope with `'*'` (DR10) | a global parser |
| Global table RLS | 0049 `sms_rate_buckets_global_access` (`:40-41`) | a BYPASSRLS write from api |
| Global write tx in the api | `apps/api/src/modules/multi-tenant/scope-tx.ts` `:24-38`'s `SET LOCAL ROLE twt_app` without `setPariwarScope` (a NEW shape for a global table — F18), COMMIT rethrown as `closeScopeTx` `:67-78` does | `openScopeTx` (needs a Pariwar) |
| api alarm / log recorder | `request.log.error({alarm})`; `buildServer(deps, { logStream })` (`server.ts:91-111`) | `console.*` |
| jobs alarm | a per-module `onAlarm?` dep (`cycle-spawn.ts:75,118`, `claim-peer-mesh.ts:66,176`) | a new sink |
| Tenant table RLS | 0128's policy block | a new policy shape |
| Cron registration | `tg-webhook-processor.ts:413-431` (registration only — T2) | its claim |
| Daily prune | `device-token-cleanup.ts` (`boot.ts:432`) | a new scheduler |
| Per-route limit | `kyc.routes.ts:31, :82` | `rateLimit: false` |
| Edge skip | 6.30's `app_link_verification_files_skip` (`waf.tf:41-63`) | a zone-wide change |
| Correlation-id plumbing | 6.37's per-send `values` binding in `SmsProviderDeps` (`sms-dlt.ts`, `buildGatewayMessage`) | a port change |
| Correlation grammar | `@twt/domain` `sms-delivery/correlation.ts` (Task 1.1) | a second regex; a copy in `@twt/channels` |
| Injectable random | a `correlationHex?` dep (DR11) | `vi.mock('node:crypto')` |
| Route test harness | `apps/api/tests/integration/channel-webhooks-telegram.spec.ts` | a new harness |
| Limit clamp | `clampLimit` (`packages/domain/src/pagination.ts:34`) — BY HAND on raw SQL (the gate sees `.limit()` only) | an unclamped `LIMIT` |
| Gate probe | `scanSecretCompareInvariant` in `scripts/access-wrapper-invariants/lib.test.ts` | trusting a green scan |

### Testing standards

Vitest; inject `fetch` (6.37's house pattern); `app.inject` for the route (⛔ a network listener). MSG91 fixtures are the DOCUMENTED
samples (cite the help URL in a comment); codes with ⛔ documented sample (16, 17, 20, 25, an API-failed event) are labelled SYNTHETIC.
Live suites `describe.skipIf(!hasDatabase)` at :5433. A controllable clock for DR6's schedule and DR12's windows.

### Project structure notes

- **NEW:** `packages/domain/migrations/0167_sms-delivery-reports.sql` (+ journal); `packages/domain/src/schema/sms_delivery_report_inbox.ts`,
  `sms_send_deliveries.ts`; `packages/domain/src/sms-delivery/` incl. `correlation.ts` (+ tests, two policy-regression specs);
  `apps/api/src/modules/channel-webhooks/msg91-sms-reports.ts` (+ tests); `apps/jobs/src/sms-delivery-correlator.ts`,
  `sms-delivery-prune.ts`, `sms-delivery-silence.ts` (+ tests); `docs/adr/ADR-0042-msg91-delivery-report-ingress.md`; the two routing notes.
- **UPDATE:** `packages/channels/src/providers/sms-app.ts`, `sms-dlt.ts`, `sms-errors.ts` (comment), `packages/channels/tests/sms.test.ts`;
  `packages/domain/src/index.ts` (the `sms-delivery` export); `apps/jobs/src/sms-otp-preflight.ts` (comment);
  `apps/jobs/src/scheduler/claim-dlt-sms-send.ts`, `claim-correction-reminders.ts`, `claim-correction-closure.ts`,
  `claim-certificate-reminders.ts`, `claim-suspicion-notices.ts`, `claim-peer-mesh-requests.ts`; `apps/jobs/src/boot.ts`;
  `packages/queue/src/index.ts`; `apps/api/src/modules/channel-webhooks/{handlers,routes}.ts`, `apps/api/src/config.ts`,
  `apps/api/src/deps.ts`, `apps/api/src/context.ts` (`AppDeps`), `apps/api/src/modules/auth/shared/sms-step-up-delivery.ts`;
  `apps/api/tests/integration/_setup.ts`, `tests/integration/claims/verifier-console.spec.ts`, `login-wall.spec.ts`;
  `scripts/access-wrapper-invariants/lib.test.ts`; `infra/dokploy/compose.yaml`, `infra/cloudflare/waf.tf`; Task 7 only (under B1):
  `packages/domain/src/claim/correction-reminder-record.ts` (the mapping), and the legs over `correction-closure.ts`,
  `correction-letter.ts`, `correction-chase-read.ts`, `apps/jobs/src/scheduler/claim-correction-reminders.ts` (the sweep; the burst
  alarm if extended) — F15's list, re-confirmed at Task 0.1; the records (Task 0.4).
- **⛔ Touched:** `provider.ts`, `dispatch.ts`, `cascade.ts`, `render.ts`; every existing migration (I2); any i18n file, any
  registry TEXT; `apps/mobile`, `apps/admin`; `packages/contracts` (⛔ expected — if Task 7 seems to need it, STOP and re-check DR13).

### Sequencing

⭐ 2026-10-17 (`-353`): 6.37b (Tasks 1–6) → row 6-37c (the delivery ladder) → Row 33 closed AND 6-37c `done` → the claim-text
template ids. The paragraph below is kept as written before the split.

6.37 (done) → **6.37b** (Tasks 0–6; Task 7 after PQ1's ruling) → roster Row 33 provisioned → Row 32 (i) / Row 33 (g) open the
claim-text template ids → Row 33's dated `requestId` note observed on the first claim-text reports. OTPs (templates 15 / 16, Row 30
(b)) wait on ⛔ this row (they feed ⛔ D22) — reading Row 30 note (6) (b)'s *"waits for **Row 32**"* as Row 32's provisioning legs
(the account, the pre-flight green), ⛔ Row 32 CLOSED (which (i) ties to 6-37b `done`, i.e. to PQ1's ruling under DR14 (a));
Task 0.2 confirms that reading with BigDev — their CRQID rides along, Row 30's dated note adds a staging device proof from the
CRQID build before production (DR11 (c)), and an operator-triggered login code after Row 33 (d) is Row 33 (e0)'s echo proof.
6-31 (WhatsApp reminder) is independent but shares five number allocations (T9) and `claim_peer_mesh_pings` (it adds its OWN
columns — 0156 `:19`; this story adds ⛔ column there).

### Previous story intelligence (6.37)

- F9 (a `success` to a fake key) is WHY reports matter: `accepted` is "MSG91 took the request", ⛔ "the family got it".
- 6.37's review rounds found every place an UNDOCUMENTED provider shape was treated as proof (F2, P1) — DR4 applies the same rule:
  an unknown status ⛔ un-counts a send.
- 6.37's governance pattern: author-commit ALONE → records commit → code; the Panel gate read verbatim; corrections carried by the next
  entry, ⛔ edits (DR14 (c) owes `-346`'s).
- 6.37 ci:local: 36/36 on :5433; the admin jsdom-under-load timeout is a known re-run-alone case.
- 6.37 Debug Log (n): a timeout after MSG91 took the request is a may-have-sent retry — DR3 + DR6 row 7 are what finally SEE it.

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
- CRQID `https://msg91.com/help/text-sms/custom-metadata-parameters-for-tracking-api-requests` (80, `_ . -`; top level vs per recipient
  — Text-SMS, ⛔ endpoint named); the Flow sample INSIDE the recipient is on the legacy webhook page above; the Flow API reference
  `https://docs.msg91.com/sms/module.json` (⛔ `CRQID`).
- Pipes `https://msg91.com/help/webhook-new/feature-webhook-pipes`; OTP webhook
  `https://msg91.com/help/webhook-new/how-to-receive-otp-delivery-reports-via-webhook`.
- Pull API `https://docs.msg91.com/sms/sms-logs.md` (2025-11-13; 3 days); analytics `https://docs.msg91.com/sms/sms-analytics.md`.
- **UNVERIFIED:** any signature; MSG91's source IPs; status 0 on "On Report Received"; `eventName` strings beyond `delivered`; which
  status a DLT failure carries; 16 vs 25; the API-failed payload; which fields are "stringified JSON array"; retries 4 vs 5 and
  timeout 8 s vs 5 s; 429 and auto-pause; un-pause and replay; ordering; whether a status can change after a final one; Flow `message`
  == webhook `requestId` in words; maximum report delay; CRQID 52 vs 80; whether Flow-sent OTPs reach the SMS webhook; ⭐ that Flow
  v5 ACCEPTS a `CRQID` inside the recipient (and does ⛔ refuse the request) and echoes it — Row 33 (e0); the content type MSG91's
  webhook POSTs with — Row 33 (d).

### References

- `.decision-log.md` — `2026-10-17-345` (MG1, MG9, MG14 (i), MG15, Consequences 3–4), `-346`, `2026-09-27-252` (cl.1–cl.3,
  Consequence 3 — TRUSTEE-RATIFIED), `2026-10-12-323` R2, `2026-10-10-314`, `2026-10-12-322` §0.
- `_bmad-output/implementation-artifacts/6-37-msg91-sms-gateway-adapter.md` (F9, F18, F19, MG1, MG9, MG15, T1, T13, D1's correction block, Debug Log (a), (n), (p));
  `6-19-correction-return-reminders-and-closure.md` (AC3, AC5, AC6); `6-27c-peer-mesh-sending-texts-and-links.md`.
- `_bmad-output/planning-artifacts/trustee-panel-routing-note-TEMPLATE.md`; `…-2026-09-20-6-19-reached-before-closure.md` (the
  options `-252` chose between — its option B's cost line); `…-2026-10-17-6-37-name-too-long-for-the-text.md` (written, ⛔ sent).
- `docs/adr/ADR-0029-…` (webhook precedent), `ADR-0041-sms-gateway-msg91.md`, `_adr-template.md`; `docs/knowledge-transfer/adr-index.md`.
- `docs/launch-gate-inventory/inventory-roster.md` Rows 26, 29 (note (3) — Bot Fight Mode), 30, 32 (notes (2), (3), (6.4)).
- architecture.md §3.11 (`:2572-2585`), §3.12 (`:2587-2604`), §2.11 rate limits (`:1768-1788`), §5.9 secrets (`:3520-3531`), edge
  bar (`:3492-3493`), module placement (`:4742`).

## Dev Agent Record

### Agent Model Used

### Debug Log References

- **(a) Task 0.1 (2026-10-17).** `git fetch origin`: `origin/main` == `dae96d9b` (⛔ cited file moved). `-347` free on every ref
  and in the 6-31 worktree; 6-31 committed its story (`29320851`, ledger `2026-10-17k`) and keeps 0167 / `-347` / Row 33
  PROVISIONAL. MSG91's pages and F15's PQ1 trace were re-read the same day by the validate pass's verifiers (v1.2) — ⛔ re-read again.
- **(b) Task 0.2 — BigDev's answers, verbatim (2026-10-17):** *"DR1–DR4 — Accept as proposed. DR5 — Accept the dedicated
  sms_send_deliveries table. DR5-G — Choose G-a. DR6–DR8 — Accept as proposed. DR9 — Accept 1,200 requests per minute
  provisionally. Verify MSG91's retry and auto-pause behavior before production. Preserve the residual risk in ADR-0042; the limit
  is not proof that the provider will never pause the webhook. DR10 — Accept as proposed. DR11 — Choose option (c). Add the dated
  Row 30 note and Row 33 (b0) staging proof. Require Row 33 (e0)'s CRQID-echo evidence before relying on the new correlation
  behavior in production. DR12–DR13 — Accept as proposed. DR14 — Choose option (a)."* And: *"Row 30 sequencing interpretation —
  "OTPs wait for Row 32" means the required Row 32 setup legs are complete; it does not mean that Row 32 must be fully closed or
  that Story 6.37b must reach done before OTP delivery can proceed. OTP delivery may proceed once the required setup is complete and
  the staging evidence is satisfactory. The dated Row 30 note and Row 33 (b0) staging proof must be in place before production
  reliance on the new CRQID behavior. Row 33 (e0) remains the required CRQID-echo proof."* Then, before approving `-347`'s draft:
  *"1. DR1 to match the stated secret-failure behaviour. 2. (b0) versus (e0) to state exactly what OTP production use is allowed
  before correlation is proven. 3. The committed status to match the actual repository state. 4. The DR6/AC6 report-count contract
  to be explicitly resolved in the story."* ⇒ v1.3: DR1's secret-failure table (+ AC2's legs); DR11's S0 / S1 / S2 stage table;
  DR6's `sms_send_deliveries` contract table (+ AC6's legs, Task 3 — ⛔ `WHERE`); Row 33 (c2) for DR9's verification; `-347`'s Status
  written to the repository state at its commit.
- **(c) Task 0.3 — `2026-10-17-347` committed ALONE as `bf1d57f7`** (2026-10-17, on this branch on top of `5dfa5775`; ⛔ yet on
  `main`), after BigDev approved the draft (*"approved."*). `-347` was re-checked free on every ref and in the 6-31 worktree right
  before the insert. Still owed by Task 0.3: the PQ1 and PQ2 routing notes (written, ⛔ sent); then Task 0.4's records commit.
- **(d) Task 0.3 / 0.4 — the routing notes and the records (2026-10-17, one commit after `-347`).** PQ1:
  `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-10-17-6-37b-reported-undelivered.md` (options A / B1 / B2 / C, our
  reading B1; E4 run — commands 1–18 returned lines, 19 empty as expected; a first run caught command 4 failing on the log's bold
  markup, corrected). PQ2: `…-2026-10-17-6-37b-content-mismatch-refusal.md` (options A / B; our reading A unless PQ1 = A, then B; E4
  run — 1–10 returned lines, 11 empty as expected). Both WRITTEN, not sent ([[feedback_shown_to_panel_means_sent]]). ADR-0042
  `msg91-delivery-report-ingress` (`drafted`) + its adr-index row and note (`drafted` 2→3, Total 152→153, `112+3+0+37+1`); ADR-0041's
  dated Changelog row; roster Row 33 `sms-delivery-reports-provisioned` (closure legs (a), (b0), (b), (c), (c2), (d), (e0), (e)–(g); the
  `requestId` observation as note (1)); Row 32 note (7) and Row 30 note (7), no word above rewritten; the `epics.md` `### Story 6.37b`
  entry before `## Epic 7`; the sprint row → `in-progress` with ledger `2026-10-17m` (`l` was this story's validate; `k` is 6-31's).
  The PQ2 reading for PQ1 = A changed from "no reading" to B (the template asks every note to recommend). A fresh-context review of
  these records (0 HIGH / 5 MED / 9 LOW, all applied): the day-84 last reminder (⛔ "days 88–89"), the closure-jobs path, the
  zero-balance claim qualified as legacy documentation, PQ2's "only recorded" wording removed, option C's forgery cost (I1 and
  ADR-0042 fail under C), the §5.9 line cite, cl.1 readings (A widens under (ii); B1 / B2 narrow on failed-then-delivered), identifiers
  out of the plain sections, the decided-DR headings, and the adr-index tally drift recorded (pre-existing, ⛔ corrected).
- **(e) PQ2 withdrawn (2026-10-17).** BigDev, on reading the PQ2 note before sending it: *"DLT approved template cannot be refused
  and operator cannot send any template. I feel like if question would exist for panel, then it should be what happens if DLT
  deosn't approve the template approved by Panel."* The premise (*"MSG91 would deliver OTHER words"*, from `-345` §0) cannot occur
  under DLT — it had been carried into a Panel note without a reachability trace ([[feedback_trace_reachability_before_escalating]]).
  `-348` committed alone (`a9b0112c`): PQ2 withdrawn, not sent; the note marked WITHDRAWN (unedited below the marker); roster Row 32
  note (8); `deferred-work.md`'s MG5 item annotated (it stays open as engineering); Task 8's "PQ2 sent before `done`" removed. The
  question BigDev named — DLT not approving (or changing) a Panel-approved template — is being traced per text family before any
  routing; if it passes §0, its own note is shown to BigDev before it is sent.
- **(f) The DLT-rejection trace (2026-10-17; provenance only — outside this story's build).** BigDev's question (Debug Log (e)) traced
  per kind of text; no Panel question routed. `-349` committed alone (`b878d25a`): a go-live condition on roster Row 30 (note (8) — no
  claim flow live in production with its template unapproved); the DLT sheet's rejection procedure (Panel wording of 7–14 back to the
  Panel before its id is set; author wording re-worded, reviewed, re-registered); a `deferred-work.md` risk item for what an unapproved
  template does today. A standing delegation for 7–14 is raised only at the first DLT rejection. BigDev also asked whether PQ1 is
  withdrawn: it is not — a reminder accepted and then not delivered is a real case under DLT, and which reading of `-252` cl.1 applies
  is the Panel's; the PQ1 note stands, ready to send.
- **(g) PQ1 RULED (2026-10-17).** BigDev relayed the Panel's answer (*"by DR and KB"*), verbatim in `-350` (`b731b0df`, Trustee-ratified,
  committed alone) and in the PQ1 note's ruling block: B1, but only after a delivery ladder (WhatsApp at 4 h; SMS again at 48 h; one
  more SMS 48 h later and a 96 h wait; then a call / letter escalation); *"Any followup question, let the panel know."* Our reading of
  the timing is recorded as NOT ratified; six follow-ups (a)–(f) are recorded as not covered. The ladder adds sends the platform does
  not make today (a WhatsApp correction-reminder template in English and Hindi, needing Meta approval and the person's opt-in; up to
  two extra SMS per undelivered reminder) and a call / letter escalation — Task 7 grows from a one-mapping change into a send engine.
  The Policy meaning is re-checked when Task 7's AC is written to the answered follow-ups.
- **(h) The ladder's follow-ups RULED (2026-10-17).** `-351` (`984bc546`, Trustee-ratified, committed alone) records the six answers
  verbatim. Answer 2 rests on the claimant's filing agreement naming WhatsApp and calls; the agreement as built (`claim.json`
  `contact.agreement`, en + hi) says *"by text message and by post"* only, and architecture §3.4's ratified opt-in rule accepts only an
  explicit, not bundled, in-app consent — so the gap is put back to the Panel with counsel (a second follow-up note), together with
  nominees' consent; no WhatsApp message is sent meanwhile (our reading). Task 7 now covers BOTH chases (correction and certificate),
  a hand-recorded call, and closure waiting for a running ladder; its AC is written once the story shape is decided.
- **(i) Consent RULED (2026-10-17).** `-352` (`6e54afe7`, Trustee-ratified, committed alone) records Q1 B and Q2 verbatim, with the
  Panel's pasted legal text. Recorded as not covered, for counsel before WhatsApp or calls to a nominee go live: the quoted basis
  against the DPDP Act's text (our understanding — no general legitimate-interest ground; Section 7's listed uses; Section 17(1)(a) for
  legal claims — not legal advice), Meta's own opt-in rule, and an architecture §3.4 / ADR-0029 amendment. Our reading of the new
  English wording is recorded (not ratified); the Hindi follows through its review.
- **(j) The split (2026-10-17).** BigDev: *"alright do it 6.37c, and draft it for the Panel"*. `-353` (`08e368f4`, committed alone):
  Task 7 and AC11 move to the new row `6-37c-undelivered-reminder-ladder` (kept here as written, marked MOVED); this story keeps Tasks
  1–6 and 8; the claim-text gate now also waits for 6-37c (roster Row 32 note (9)). The architecture §3.4 amendment for WhatsApp contact
  about a claim (the claimant on the filing agreement, the nominee on the DPDP basis, go-live conditions G1–G3) is drafted for the Panel:
  `_bmad-output/planning-artifacts/sprint-change-proposal-2026-10-17-whatsapp-claim-contact.md` — not yet presented.

### Completion Notes List

- Ultimate context engine analysis completed — comprehensive developer guide created (`bmad-create-story 6.37b`, 2026-10-17; four
  parallel research passes: the send tables + D22, the governance records, MSG91's live help / docs pages, the webhook house patterns).

### File List

- `.decision-log.md` (Decision `2026-10-17-347` — `bf1d57f7`)
- `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-10-17-6-37b-reported-undelivered.md` (new)
- `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-10-17-6-37b-content-mismatch-refusal.md` (new)
- `docs/adr/ADR-0042-msg91-delivery-report-ingress.md` (new)
- `docs/knowledge-transfer/adr-index.md`
- `docs/adr/ADR-0041-sms-gateway-msg91.md` (Changelog row)
- `docs/launch-gate-inventory/inventory-roster.md` (Row 33; Row 32 note (7); Row 30 note (7))
- `_bmad-output/planning-artifacts/epics.md` (Story 6.37b entry)
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Change Log

| Date | Version | Change |
|---|---|---|
| 2026-10-17 | 1.0 | Created by `bmad-create-story 6.37b` at `dae96d9b` (worktree `.claude/worktrees/6-37b`). F1–F24 found; DR1–DR14 PROPOSED (⏳ Task 0.2); PQ1 (reported-undelivered vs `-252` cl.1) and PQ2 (content-mismatch refusal — Row 32 note (6.4)) to be ROUTED at Task 0.3. ⭐ DR3 — correlate by our own row id in `CRQID` (supersedes `-345` MG9's "⛔ CRQID"); I1 — a report only subtracts reach. Status `ready-for-dev`, buildable after Task 0; Task 7 waits for the Panel. |
| 2026-10-17 | 1.1 | Create-story's own validation (one fresh-context read-only verifier, `checklist.md`): 2 HIGH / 8 MED / 9 LOW, all applied. ⭐ HIGH 1 — under PQ1 B with letter-eligibility unchanged, a person reported undelivered was never reached AND never letter-eligible (D20 / D31 need a SEND-time dead outcome) ⇒ the claim could never close (the 2026-09 rejected cost, against cl.2) ⇒ PQ1 split into B1 (an undelivered report reads as `rejected_unreachable` everywhere — our reading) / B2; the Policy meaning, AC11 and Task 7 rewritten. HIGH 2 — DR12's silence alarm counted 0128 `staff_push` rows (FCM, ⛔ CRQID) ⇒ fired daily ⇒ SMS purposes only, `send_outcome` for pings, 48 h. Also: DR6 ordered (finished non-accepted ⇒ `other_attempt`; a staff-push CRQID ⇒ `unmatched:not_sms`); the supersession list (MG1's "delivery state on the five send tables" and "correlation by request id + recipient"; the OTP quote attributed to the story file); cl.1's two readings (match / narrow); the 6.37 tests that turn red (2 api whole-body checks, 51 core calls; an injectable OTP random); I2's diff command (quoted full paths + 0054); Bot Fight Mode and leg ORDER on Row 33 (token → edge → webhook); Row 33 (e) proves the `requestId` match; PQ2 SENT before `done` and its fact marked inference; a bad `request_id` ⇒ ⛔ row (200 + alarm); the settle compare-and-set; DR11's reason; F19 (latest-wins IS tested); cites (README `:79-82`, `handlers.ts:146`, `sms.test.ts:254-258`, 0049 `:40`). |
| 2026-10-17 | 1.2 | `bmad-create-story validate 6.37b` (five parallel fresh-context read-only verifiers — send path, webhook / api, DB / jobs / D22, governance, the footgun catalogue; the CRQID placement, the AI-5-1 gate, the grants and `foundDeadOn` re-checked by hand): 8 critical / 12 should / 10 nice, all applied (BigDev: "all"). ⭐ CRQID goes INSIDE the recipient (Flow's only sample; the top-level text is the Text-SMS page's) + reserved key + Row 33 (e0) echo proof via the first login code; the webhook header is `x-twt-msg91-secret-token` with direct compares (the AI-5-1 gate was VACUOUS for a boot-resolved token) + a gate-bites leg; DR5-G — the two tables' grants put to BigDev WITHOUT a recommendation (SELECT-only breaks Row 26 (a)); B1's letter-eligibility is `foundDeadOn` (first dead outcome, sticky) ⛔ `numberKnownDead`, and a forged report changes who is contacted (closure letter, letter chase) — I1, Policy meaning, PQ1, AC11, Task 7 (+ the jobs sweep and the burst alarm) rewritten; the secret resolved at boot by a `buildTurnstileVerifier`-shape builder (Telegram resolves per request), an unresolvable name ⇒ 403 + a line; a malformed body's `JSON.parse` message can carry the number ⇒ caught, ⛔ logged; a bad correlation id is a crash in the core, ⛔ a final (it keeps the id off the wire; the row's give-up still records `error` — a code bug only); the grammar lives in `@twt/domain`. Also: DR6 as one ordered table with `(match_state, match_detail)` pairs; DR10 rewritten from Fastify 5.8.5's source (a `'*'` parser in its own scope — ⛔ a 415 before auth); the api / jobs alarm mechanisms named; DR13 / AC12 scoped to Tasks 1–6; PQ2's option A costed, its fact split in two; `-252`'s B was DEFERRED, ⛔ rejected; the §0 mixed-part disclosure (DR4 / DR6 under B1); ledger letter after `k`, 6-31's written claims; Tasks gained AC8's / AC1's / DR9's legs; Row 32 note (2) stays in force; both `-346` corrections; the at-least-once triggers FIRED; Row 33's `requestId` equality can only be observed AFTER (g) (a circularity found while applying) ⇒ a dated observation note, ⛔ a closure leg; I2's diff by exclusion; cites corrected. The pass's OWN diff then adversarially reviewed in three fresh-context rounds, each applied. Round 1 (2 HIGH / 3 MED / 6 LOW): `closeScopeTx` RETHROWS a failed COMMIT (the global write is a new shape because `openScopeTx` needs a Pariwar, ⛔ because of COMMIT); the OTP device proof made real (a dated Row 30 note — from the CRQID build, on staging before production; a refusal may be a silent 200); Row 33's closure legs listed; where a throw becomes a final (T22 — validate at the top of `sendClaimDltSms`); DR4 ↔ DR6 rows; MG9 attributed to the 6.37 story file; DR7's prune and per-command policies; the 415-on-an-invalid-header residual. Round 2 (0 HIGH / 4 MED / 4 LOW): the crash still loses the once-only text at give-up (said so), the Row 30 note's wording + its place in Task 0.3's list, 6.37 F9 vs this file's F9, per-command policy clause forms, `settled_at` as the prune's clock, the OTP-before-Row-32 reading. Round 3 (1 HIGH / 2 MED / 3 LOW): pg-boss 12.19.1 never logs a handler's throw ⇒ the core logs ONE line before a bad-correlation throw; the give-up names corrected (`attempting_past_day` for correction / closure / certificate); Row 33 (b0) owns the staging OTP proof, before the production deploy and so before (b) (closure legs (a), (b0), (b)–(d), (e0), (e)–(g)); a fourth round (0 HIGH / 1 MED / 2 LOW) fixed (b0)'s place, a timeout's exception and the `[jobs] ` prefix; `buildGatewayMessage`'s throw is caught in `provider.send`; Task 2's wording. Status stays `ready-for-dev`. |
| 2026-10-17 | 1.3 | Task 0.1 / 0.2 done — BigDev's answers recorded verbatim (Debug Log (b)): all as recommended, DR5-G = G-a, DR9's 1,200 / min PROVISIONAL with MSG91's retry / auto-pause verified before production (new Row 33 leg (c2)), DR11 (c), DR14 (a), Row 30 = Row 32's setup legs. BigDev's four pre-approval requirements for `-347` resolved in the story: DR1's secret-failure table (the api always starts; a broken NEXT token never disables a working current one; a boot-time outage is a residual) + AC2's per-row legs; DR11's S0 / S1 / S2 table of allowed OTP production use; DR6's `sms_send_deliveries` contract table (one upsert, ⛔ `WHERE`; every row-8 report counts; the state-setting report's code kept; min / max timestamps) + AC6's legs; ADR-0042's residual list. Status stays `ready-for-dev`. |
| 2026-10-17 | 1.4 | Before approving `-347`, BigDev asked for the OTP gates to be unambiguous, the shorthand to be explicit prose, and AC6 to match the counting contract. DR1's secret-failure block, DR6's counting contract, DR11's OTP gates (Gate 0 / 1 / 2, with (b0) and (e0) defined in full) and AC6's counting legs are rewritten in plain prose. AC6 checked line by line against the contract: added (8a) the first report's INSERT values, (8c)/(8d) `failure_reason` kept, (8e) `request_id` unchanged, (8h) which report is received vs settled first, an unknown-status leg in (9), and a no-write assertion on legs (1)–(7) and (9). Status stays `ready-for-dev`. |
| 2026-10-17 | 1.5 | Before approving `-347`, BigDev asked for (1) the claim that reports are only recorded to be narrowed — the Policy meaning now names the three ways Tasks 1–6 read reports (the correlator's write, alarms including DR12's silence alarm, DR11's daily login-code count — information until Row 33 (e0), then citable evidence), none an input to a send, a closure, reach or letter-eligibility; and (2) the dedupe and counting definitions to agree — DR7 now states the rule: duplicates are defined by the three key values (request id, CRQID, status code), the first stored is kept, a later one with a different failure reason / event name / delivery time is discarded uncounted, chosen because MSG91 retries by resending the same event and every DR6 outcome depends only on those three values; `report_count` counts inbox rows under that key, not distinct payloads; AC4 and AC6 (8f) gained the different-payload-same-key, different-status and blank-key legs; Task 2 names the exact index. Status stays `ready-for-dev`. |
| 2026-10-17 | 1.6 | Task 0 done: `-347` committed alone (`bf1d57f7`); the PQ1 and PQ2 routing notes written (not sent); ADR-0042, the adr-index row (Total 153), ADR-0041's Changelog row, roster Row 33 with Row 32 / Row 30 dated notes, the `epics.md` entry; story and sprint row → `in-progress` (ledger `2026-10-17m`). PQ2's reading under PQ1 = A is now B. No code. |
| 2026-10-17 | 1.7 | PQ2 WITHDRAWN before it was sent (`-348`, `a9b0112c`): under DLT a gateway cannot deliver words that were not approved, so the question had no case (BigDev). The PQ2 section is marked withdrawn (kept as written); Task 8 no longer waits for a PQ2 note; Debug Log (e). The replacement question — DLT refusing a Panel-approved template — is being traced. |
| 2026-10-17 | 1.8 | Debug Log (f): the DLT-rejection trace recorded as `-349` (`b878d25a`) — a Row 30 go-live condition, the DLT sheet's rejection procedure, a deferred-work risk item; no Panel question; PQ1 confirmed as still the Panel's. No change to this story's build scope. |
| 2026-10-17 | 1.9 | PQ1 RULED — `-350` (Trustee-ratified): B1 after a delivery ladder (WhatsApp 4 h → SMS 48 h → SMS 96 h + 96 h wait → call / letter). The PQ1 note's ruling block filled; PQ1 section marked ruled; AC11 and Task 7 annotated — the ladder's legs wait for the six follow-up questions; Debug Log (g). |
| 2026-10-17 | 1.10 | The ladder's six follow-ups RULED — `-351`: 1 A, 2 (the filing agreement as consent — its wording gap put back with counsel), 3 B, 4 A, 5 A (call recorded by hand; phase 2 automation), 6 A. Debug Log (h). |
| 2026-10-17 | 1.11 | Consent RULED — `-352`: Q1 B (the agreement names text, WhatsApp, call, post and any later means), Q2 (WhatsApp and calls to claimant and nominee; the nominee's basis the Panel's stated DPDP ground). Counsel / Meta / architecture-amendment items recorded. Debug Log (i). |
| 2026-10-17 | 1.12 | SPLIT (`-353`): Task 7 and AC11 moved to row `6-37c-undelivered-reminder-ladder` (kept as written, marked MOVED); DR14 now (b); Task 8's ladder-dependent dispositions move to 6-37c; the claim-text gate waits for 6-37c too; the §3.4 amendment proposal drafted. Debug Log (j). |
