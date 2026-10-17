---
baseline_commit: dae96d9b
---

<!--
PINNED: dae96d9b (`main` == `origin/main` after a fresh `git fetch`, 2026-10-17). Worktree `.claude/worktrees/6-31`, branch
`story/6-31-peer-mesh-whatsapp-reminder-at-48-hours` (fast-forwarded to dae96d9b; ⛔ no commits of its own at creation).
Re-check before Task 1: `git diff --name-only dae96d9b..origin/main -- packages apps scripts docs/adr docs/launch-gate-inventory`.

STATUS: ready-for-dev (created 2026-10-17 via `bmad-create-story 6.31`; was `backlog`).

START CONDITION — MET at the pin: rows 6-27 (a), 6-27b, 6-27c, 6-27d, 6-30, 6-34, 6-36, 6-37 are `done`. 6.31 reads 6.27c's
send record and 6.27a's reply state; it changes ⛔ neither. Row 6-35 (language switch) is ⛔ not needed (WR14).

§0 GATE (the Panel template, `trustee-panel-routing-note-TEMPLATE.md`): the reminder ITSELF is ratified (`-303` Q1 A, Consequence 3;
its language by `-310` CF1 A; its window by `-305` §2 item 4). Every build decision WR1–WR16 is the AUTHOR's. ONE question is the
Panel's and is routed (F14, Task 0.5): how long a member's "yes to WhatsApp from the Trust" lasts — the Trustee-ratified ADR-0029
(`-065`) built it as 24 hours; reading it longer would SUPERSEDE a ratified clause and is a consent basis. ⭐ It blocks ⛔ nothing:
6.31 builds on the ratified 24-hour reading (WR3) and one read changes if the Panel rules otherwise.
Places a decision would become the Panel's, each kept OUT: (1) a reminder to someone whose text never went (WR2 (i) — it would be a
FIRST message, widening `-303`); (2) any wording but the ruled text (WR6 — if Meta demands other words, STOP S1); (3) a reminder
outside the answer window (WR2 (iv) — `-305` §2 item 4); (4) a second SMS (I2 — `-311` PM2); (5) reading "has ⛔ not answered"
as "has opened nothing" (WR2 (iii) option (a) — it narrows `-303`; ⛔ recommended). Three edges the author-commit records, each
with its basis — MATCH, ⛔ narrowing: WR5's lateness bound is a delivery give-up, the framing of `-302` §0 (a give-up narrows none of the ratified texts
because *"none of the three sets a delivery deadline"* — and `-303` Q1 A sets none either; `-302` superseded `-295` §2 RB3 as a
mechanism); WR6's "Meta files it as MARKETING ⇒ Meta refuses" applies
`-303`'s *"if Meta refuses"* under architecture §3.4's *"Meta UTILITY templates only"* (and F13 — a marketing cap revokes consent);
WR2 (ix)'s "still an eligible member" applies who the five ARE (`-310` CF4 A + `-311` PM1's filters — a neighbour who has since
died or left is ⛔ one of the five).

GLYPH REGISTER: `⛔` negates the word it precedes — before a word that is ALREADY negative (no / not / never / nothing / none) it is
emphasis only, ⛔ a double negative; `⭐` emphasis / action; `⚠` a hazard. ⛔ No `file:NNN` into `.decision-log.md`,
`deferred-work.md` or `sprint-status.yaml` (newest-first files) — cite the decision id + clause, the item's phrase, or the row key.
Line numbers into CODE files are as of the pin; re-grep the symbol if a line moved.

LETTERS: F = found facts (at the pin) · WR = build decisions (PROPOSED; answered at Task 0.2) · I = invariants · T = traps ·
S = Task 0.1 STOP conditions. Decision-entry letters (PM, SW, MG, CF, FQ …) keep their own stories' meaning.
-->

# Story 6.31: One WhatsApp Reminder, Two Days After the Text, to Each Neighbour Who Has ⛔ Not Answered and Chose WhatsApp — the Same Words, Its Own Record, ⛔ Never a Second SMS `[SURFACE]`

Status: ready-for-dev

> **WHAT THIS STORY IS, IN ONE PARAGRAPH.** When a member's death is reported, up to five neighbours are texted (Story 6.27c) with
> the member's name, a link to a few short questions, and the helpline. The Panel ruled (`-303` Q1 A) that those of the five who
> have ⛔ not answered **and** have chosen WhatsApp messages from the Trust get **one** WhatsApp reminder after two days, **with the
> same words**. 6.31 builds exactly that: a sweep finds texted neighbours whose text went out ≥ 48 hours ago, who have ⛔ not
> submitted an answer, whose claim can still take an answer, whose Pariwar has WhatsApp switched on and who are opted in; it sends
> ONE Meta-approved UTILITY template (the same words, three values) **directly** through the Meta Cloud API client — ⛔ never
> `dispatch()` (whose WhatsApp→SMS fallback would send a second text) — and keeps its OWN once-ever record per neighbour.
>
> **What already ships and this story READS — rebuild ⛔ none of it:**
> - the text's send record — `claim_peer_mesh_pings` (`send_outcome`, `send_updated_at`, `link_code`, `locale_source`) — 6.27c;
> - `peerMeshReplyState(db, pariwarId, pingId) → 'none' | 'started' | 'submitted'` — `packages/domain/src/claim/peer-mesh-reply.ts:266-268` (its code comment: *"row 6-31's "has ⛔ not answered" reads THIS (PM7 (g))"*);
> - the answer window — `isClaimInAnswerWindow` / `answerWindowSql` — `packages/domain/src/claim/answer-window.ts:47-68`;
> - quiet hours — `isInPeerRequestSendWindow` / `nextPeerRequestSendWindowStart` — `apps/jobs/src/scheduler/claim-peer-mesh-requests.ts` (09:00–20:00 IST);
> - the one language read — `resolvePeerRequestLocale` — `packages/domain/src/claim/peer-mesh-request.ts` (`-305` §2 item 2; 6.27 PM22: *"Row 6-31's reminder reads the same"*);
> - the link — `buildAppLinkUrl(origin, 'peerRequest', link_code)` (`@twt/contracts` app-links) + `APP_LINKS_BASE_URL`;
> - the words — `peer_mesh_sms.request` in `packages/i18n/locales/{en,hi}/claim.json` (via the real `t()`);
> - WhatsApp: the Meta Cloud client `createWhatsappAppCache` (`packages/channels/src/providers/whatsapp-app.ts`), the error classifier
>   `classifyWhatsappError` (`whatsapp-errors.ts`), the Pariwar switch `channelConfig.getWaConfig` (`pariwar_wa_config.enabled`),
>   the opt-in read `waOptIn.isOptInActive` (the dual gate's half, ADR-0029) and `consent.consentExists(…, 'whatsapp_opt_in')`, the status table `whatsapp_send_status`
>   (filled by Story 5.4's webhook worker for ANY wamid).

## Story

As **the Trust**,
I want **each texted neighbour who has ⛔ not answered after two days, and who chose WhatsApp messages from the Trust, to get ONE
WhatsApp reminder with the same words as the text** — the member's name, the link to the questions and the helpline —
so that **a neighbour who missed the text has one more chance to answer while an answer can still be taken**, and ⛔ no one gets a
second SMS, a message in other words, or a reminder after the claim is decided.

## The rulings and records this story builds on

| Source | Key (verbatim, abridged) | Status |
|---|---|---|
| `2026-10-10-303` Q1 A, ruling item 1 | *"plus one WhatsApp reminder after two days (48 hours), with the same words, to those of the five who have ⛔ not answered and have chosen WhatsApp messages from the Trust"* | ⭐ TRUSTEE-RATIFIED |
| `-303` Consequence 3 (the transcriber's consequence text inside the ratified entry) | *"Row `6-31-peer-mesh-whatsapp-reminder-at-48-hours` is RATIFIED as to substance (Q1 A as put) and follows the same language rule."* | ⭐ TRUSTEE-RATIFIED |
| `-303` "What this ruling does NOT cover" (transcriber's scope text inside the ratified entry) | *"Meta's approval of the WhatsApp wording (go-live gated — row 6-31); if Meta refuses, the reminder does ⛔ not go, and the text still does."* | ⭐ TRUSTEE-RATIFIED (scope) |
| `2026-10-10-304` Q6 A | *"a few short questions"* (amends `-303`'s *"two"*) — the reminder carries the same words ⇒ "a few" | ⭐ TRUSTEE-RATIFIED |
| `2026-10-10-305` §2 item 4 | *"withdrawn: a text (and 6-31's reminder) is sent while the claim is in the answer window (`CLAIM_REVIEW_WINDOW_STATES`), and ⛔ never once a final approval is given or the claim is refused / closed."* | author-commit |
| `-305` §2 item 2 | texts go in the Pariwar's default language (`pariwar_passport.locale_default`) until an in-app switch exists | author-commit |
| `2026-10-10-310` CF1 A — option A AS PUT in `trustee-panel-routing-note-2026-10-10-6-27-confirms.md` (ratified as put) | *"the Pariwar's language until the setting exists; then each member's choice … The WhatsApp reminder at 48 hours follows the same rule."* | ⭐ TRUSTEE-RATIFIED |
| `2026-10-10-311` PM2 | *"⛔ no WhatsApp on day one … ⛔ no second SMS (the alert system's WhatsApp-to-SMS fallback is ⛔ not used)."* | author-commit |
| `-311` (6.27 file) PM7 (g), PM8, PM22, Trap 17 | PM7 (g): *"the WhatsApp reminder's "has ⛔ not answered" reads it"* (`peerMeshReplyState`); ONLY within PM8's answer window; reads the same language; its own record + own send path | author-commit |
| `2026-10-12-324` A | the answer window includes `state_trustee_approved` with a live special-panel (R9) routing — `answerWindowSql` already encodes it | ⭐ TRUSTEE-RATIFIED |
| `2026-10-17-344` | the Hindi text is the Panel-seen routing draft with दो → कुछ; Row 28's human review is the control | author-commit |
| `2026-07-08-065` ratifying ADR-0028 + ADR-0029 (the phrases are the ADRs' text) | ADR-0028: WhatsApp direct to Meta's Cloud API; ADR-0029: the opt-in lifecycle incl. *"the 24h-window expiry"*; *"The AC6 dual gate reads BOTH (`isOptInActive` AND the admin toggle)"* | ⭐ TRUSTEE-RATIFIED |
| `2026-09-28-263` FQ10 A | the peer mesh is a SIGNAL; fewer than 3 replies in 72 hours ⇒ the inspection is the main check | ⭐ TRUSTEE-RATIFIED |
| Roster Row 27 note (3) | *"Row 6-31 … built, or its absence at go-live recorded as a decision."* | go-live gate — ⛔ never a merge fence |

⚠ **STALE LEDGER TEXT — do ⛔ not build it.** The sprint ledger entry `2026-10-10f` (which added this row) says *"⛔ no reminder once
the District Admin has decided (6.27 PM5 (iv))"* — WITHDRAWN by `-305` §2 item 4 (above); the gate is the ANSWER WINDOW. The same
entry says *"48 h after selection … so an answer still counts in FQ10's 72-hour tally"* — WR4 counts from the TEXT instead (F3); the
author-commit names that departure. (The row's own comment block does ⛔ not carry the clause; its annotation pointing to `-305` was
made at creation.)

## ⭐ THE INVARIANTS

- **I1 — Once ever per neighbour.** At most ONE reminder row per ping (`UNIQUE (ping_id)`), claimed by a compare-and-set, and a
  finished row's delivery columns are frozen by a DB trigger. ⛔ No path re-sends after `accepted` or after an ambiguous failure.
  *Proof:* a two-connection race spec + a trigger spec + the may-have-sent leg (AC7).
- **I2 — ⛔ Never `dispatch()`, ⛔ never an SMS, ⛔ never an `Alert`.** The reminder imports ⛔ nothing from `dispatch.ts` /
  `cascade.ts` and constructs ⛔ no `AlertCategory`. A failed WhatsApp send ends the reminder; ⛔ nothing falls back.
  *Proof:* an import fence test + a zero-call SMS recorder on every failure leg.
- **I3 — Only after a text that went.** ⛔ No reminder for a ping whose `send_outcome` is not `accepted` (`-311` PM2: ⛔ no day-one
  WhatsApp). *Proof:* one leg per non-accepted outcome.
- **I4 — Only while an answer can be taken.** Checked set-based in the sweep (`answerWindowSql`) AND under the claim lock at begin
  (`isClaimInAnswerWindow`). *Proof:* a claim decided between sweep and begin ⇒ `skipped_window_closed`, zero sends.
- **I5 — Only to the opted in, only where WhatsApp is on.** The ONE read `isPeerMeshWaReminderOptedIn` (WR3) and the Pariwar switch,
  both re-read under the lock at begin. *Proof:* legs for switch off, no consent, revoked, blocked, expired window.
- **I6 — The same words.** The registered Meta body is, per locale, exactly the real `t('peer_mesh_sms.request')` output with
  `{member}` / `{link}` / `{helpline}` replaced by `{{1}}` / `{{2}}` / `{{3}}`. *Proof:* a lockstep test calling the real `t()`.
- **I7 — Ids only.** ⛔ No name, mobile, link code or link in a log, alarm, `detail` or event. *Proof:* an alarm-capture leg greps
  the fixture's name, mobile and link code ⇒ zero hits.
- **I8 — It changes nothing else.** ⛔ No event, ⛔ no claim state, ⛔ no label, ⛔ no ping column is written. 6.27c's sender, the
  FQ10 tally and `dispatch()` behave identically. (5.4's EXISTING webhook worker may still block a neighbour's opt-in on a failed
  reminder delivery — WR11; that path is ⛔ 6.31's and AC11's event count does ⛔ not cover it.) *Proof:* an event count before/after a run; AC12's frozen-file diff.

## 📜 Policy meaning (AI-10-1)

**6.31 introduces ⛔ no predicate that gates a member's access to a benefit, and changes ⛔ none.** It adds a SEND condition — who
of the already-texted neighbours gets one more message, and when — and ⛔ nothing reads its record: ⛔ no approval, refusal,
payment, warning, label or claim state. It reuses the answer window (`answerWindowSql` / `isClaimInAnswerWindow`, ratified via
`-324`) and the reply state (`peerMeshReplyState`) without changing either. In the member's terms: *"whether the Trust sends a
neighbour a WhatsApp reminder about a reported death never changes whether, or how much, the family is paid."* Checked against the
Niyamavali: ⛔ no clause governs reminders to people asked about a death (⛔ not a benefit predicate; the Niyamavali is a rulebook,
⛔ not binding — [[feedback_niyamavali_rulebook_not_spec]]).

## ⭐ FOUND FACTS (at dae96d9b — each re-run at Task 0.1)

**The text and the reply (what 6.31 reads)**
- **F1 — The text's record is ON the ping row and its delivery columns are frozen.** `claim_peer_mesh_pings` carries 13 delivery
  columns (0156) and `twt_app` may UPDATE only those (0156 `REVOKE UPDATE` + column `GRANT`); the trigger
  `claim_peer_mesh_pings_guard_delivery` (created in 0156, replaced in 0166) freezes a finished row's delivery columns. 0156's header: *"It freezes ONLY the delivery
  columns, so row 6-31's WhatsApp reminder can keep its OWN record (Trap 17)."* ⇒ WR1: a SEPARATE table (a new ping column would
  need its own GRANT and would sit under a trigger written for the text).
- **F2 — "Sent" = `send_outcome = 'accepted'`, and its time is `send_updated_at`** (`schema/claim_peer_mesh_pings.ts:137`;
  `finalisePeerMeshRequest` writes it with `clock_timestamp()`). The link code resolves only for an `accepted` ping
  (`resolvePeerRequestByLinkCode`). ⇒ WR2 (i), WR4.
- **F3 — The text can go long after selection.** Quiet hours, a held Pariwar (`sweep:held`), a transient retry — and at the pin
  EVERY Pariwar is held (the live questionnaire carries two counsel-pending questions; template ids unset — 6.27c Completion Notes).
  `claim_peer_mesh_selections.created_at` is selection; `response_window_expires_at` = selection + 72 h and an operator may EXTEND
  it. ⇒ "48 h after selection" can fall BEFORE the text went. ⇒ WR4 counts from the text.
- **F4 — `peerMeshReplyState` is the seam** (`peer-mesh-reply.ts:266-268`): `none` = no reply row; `started` = a reply row, not
  submitted; `submitted`. A reply row is created at the FIRST save of ANY question — `how_known`, `relationship`,
  `callback_consent` have ⛔ no `showIf` — so `started` can exist with ⛔ no `has_died` answer. ⇒ WR2 (iii).
- **F5 — The FQ10 tally** (`runClaimPeerMeshWindow`, `apps/jobs/src/claim-peer-mesh.ts`) runs at `response_window_expires_at`,
  counts DISTINCT `claim.peer_mesh_responded` events (written once, at the first `has_died` save), labels once, never recounts.
  Answers after it still count as warnings (`-303` Q2 A; PM8). ⇒ a reminder helps the tally only if it lands before 72 h; it is
  still worth sending after (WR5).
- **F6 — The answer window** (`answer-window.ts:38-68`): `CLAIM_REVIEW_WINDOW_STATES`, or `state_trustee_approved` with a live R9
  routing (`-324`). 6.27c checks it set-based (`answerWindowSql('pr_c')`) AND under the claim lock (`beginPeerMeshRequest`). ⇒ I4.

**WhatsApp as built**
- **F7 — ⛔ No code sends WhatsApp directly.** The ONLY path that reaches WhatsApp is `dispatch()` from
  `apps/jobs/src/scheduler/contribution-notify.ts` (`dispatch()` is also called for 6.19b's staff PUSH at
  `claim-correction-reminders.ts:619` — push only).
  `dispatch()` takes an `Alert` (a union on the frozen 9-value `AlertCategory`, `packages/contracts/src/alerts/alert.ts`); the
  ladder `push → whatsapp → sms` advances to SMS on a WA reject (`cascade.ts` `RETRYABLE_CASCADE_OUTCOMES`). ⇒ I2: 6.31 is the
  FIRST direct WA sender (as 6.19b / 6.27c were for DLT SMS: `claim-peer-mesh-requests.ts:5` — *"⛔ Never `dispatch()`"*).
- **F8 — The WA template table cannot hold this template.** `pariwar_wa_templates` is UNIQUE `(pariwar_id, alert_category)` with a
  CHECK listing exactly the 9 `AlertCategory` values (`migrations/0038_pariwar-wa-config.sql`). ⛔ No code-side WA template
  registry exists; ⛔ no WA template is registered or approved anywhere. ⇒ WR7 (⛔ never widen the frozen enum or that CHECK).
- **F9 — The client sends ONE body value.** `WhatsappTemplateMessage.bodyParam: string` — *"The single `{{1}}` body parameter"*
  (`whatsapp-app.ts:38-48`); ADR-0028: *"single-body-parameter UTILITY-template shape is v1 … structured multi-parameter templates
  are the Epic-10 evolution"*. The ruled words carry THREE values. A whole-body `{{1}}` is also what Meta's guidelines name as a
  reason to recategorise to marketing. ⛔ No fetch timeout on the WA send. ⇒ WR8.
- **F10 — The WA client is built inside jobs but ⛔ not exposed.** `buildContributionProviderResolver` creates
  `createWhatsappAppCache()` (`contribution-providers.ts:287`) and keeps it private; only `smsAppClient` is exposed (added for 6.19b,
  *"never a second client"*). ⇒ WR9 exposes the ONE cache.
- **F11 — The Pariwar switch** is `pariwar_wa_config.enabled` (default `false`) + `phone_number_id`, `access_token_secret_name`,
  `graph_api_version` (0038/0041), read by `channelConfig.getWaConfig`. ⛔ No feature flag. ⇒ WR2 (v), WR9.
- **F12 — Delivery statuses already land for ANY wamid** in `whatsapp_send_status` (5.4's webhook worker). ⇒ WR11: store the wamid;
  ⛔ no new webhook work; 6.31 adds ⛔ no reaction to a status (but see F13 — 5.4's worker already reacts to some).
- **F13 — A capped marketing delivery revokes consent.** `WA_BLOCK_ERROR_CODES = {131050, 131049, 131026, 131047}`
  (`wa-webhook-processor.ts:110`): a failed status with one of them moves the opt-in to `BLOCKED_BY_META` and REVOKES the consent.
  131049 is Meta's marketing per-user cap. ⇒ WR6 / Row 33: UTILITY only; a template Meta files as MARKETING = "Meta refuses".

**The opt-in — the one Panel question**
- **F14 — As built, "opted in" lasts 24 hours.** `isOptInActive` (`packages/domain/src/wa-opt-in/read.ts:135-162`) is true iff
  `state = 'ACTIVE' AND (window_expires_at IS NULL OR now() < window_expires_at)`; the window is set to opt-in + 24 h and never extended
  (`wa-webhook-processor.ts` `resolveWindowExpiresAt`); a sweep moves the row to `EXPIRED_24H_WINDOW` and its own comment says
  *"Consent is NOT revoked on window expiry — the member remains opted in"*. Once EXPIRED, a WhatsApp STOP is ignored
  (`getActiveOptInByMobile` needs ACTIVE) and the API's revoke returns 409 `wa_opt_in.not_active`
  (`apps/api/src/modules/wa-opt-in/handlers.ts:217`, `:277`); the APP shows an EXPIRED member only *"WhatsApp opt-in expired"* /
  *"Your WhatsApp opt-in window closed. Tap below to opt in again."* and an enable button — ⛔ a withdraw control
  (`apps/mobile/app/(settings)/notifications.tsx`; `waNotifications.expired_*` in `packages/i18n/locales/en/common.json`). So the
  member is TOLD their yes ended, while the consent record still says granted. ADR-0029 (Trustee-ratified, `-065`) ratified the lifecycle *"incl.
  the 24h-window expiry"* and the dual gate on `isOptInActive`. ⇒ under the ratified reading the reminder reaches only neighbours
  who opted in within the last 24 hours — almost nobody. ⇒ the Panel note (Task 0.5); WR3 builds the ratified reading meanwhile.
  ⚠ The same 24-hour reach applies to `dispatch()`'s WhatsApp rung today (a deferred-work item, Task 0.4 — ⛔ not 6.31's to fix).

**The plumbing**
- **F15 — Migrations** are hand-authored SQL with `--> statement-breakpoint` and a manual journal entry; the last is
  `0166_peer-mesh-request-sending` (journal idx 166) ⇒ **0167** is next (re-check every branch at Task 0.1 — T4).
- **F16 — The DLT gate scans text, comments included.** `scripts/dlt-typed-variables/lib.ts` `REGISTRY_FILES`: `{#var#}`, `DLT_VAR`
  and `sms.dlt.template_id.` may appear ONLY in registry files. ⇒ the WA template file must ⛔ never copy the DLT text (T6).
- **F17 — Decision ids / roster / ledger at the pin:** highest decision `2026-10-17-346`; highest roster row **Row 32**; last
  migration 0166; newest sprint ledger line on `main` `2026-10-17i`. ⚠ Branch `story/6-37b-msg91-delivery-reports` has COMMITTED
  (`e01c90c3`, ⛔ on `main`) a story that plans 0167, `-347`, roster Row 33 and used ledger `2026-10-17j` ⇒ this story's creation
  took `2026-10-17k`, and every "0167 / `-347` / Row 33" below is PROVISIONAL — the first Task 0 to commit takes them; S4 settles
  the numbers (T4).

## ⚖️ Build decisions WR1–WR16 (PROPOSED — answered by BigDev at Task 0.2; ⭐ = recommended)

> Each is the AUTHOR's (§0 above). The options state a cost. Answers are recorded verbatim at Task 0.2 and committed as ONE
> author-commit at Task 0.3, ⛔ before any code.

- **WR1 — The record.** ⭐ (a) A new table `claim_peer_mesh_wa_reminders` (migration 0167): `reminder_id uuid PK`, `ping_id`
  (FK → `claim_peer_mesh_pings`, **UNIQUE**), `pariwar_id`, `claim_case_id`, `member_id`, `send_outcome` (CHECK ∈ WR10's list),
  `attempt_count`, `claimed_at`, `claimed_by_job`, `aging_since`, `parked_at`, `send_started_at` (WR10's in-flight marker),
  `detail`, `first_detail`, `provider_message_id`
  (the wamid), `recipient_number_hash`, `template_name`, `locale`, `locale_source`, `send_updated_at`, `created_at`. RLS by
  `pariwar_id`; column GRANTs like 0156 (`twt_app` UPDATEs only the delivery columns); CHECKs mirroring 0156/0166 (`attempting` ⇒
  claimed + `aging_since`; `claimed_by_job = 'sweep:held'` ⇔ `parked_at IS NOT NULL`; a `detail` grammar) PLUS the in-flight
  marker's: `send_started_at IS NULL OR claimed_at IS NOT NULL`; `claimed_by_job = 'sweep:held'` ⇒ `send_started_at IS NULL`;
  `send_outcome LIKE 'skipped_%'` ⇒ `send_started_at IS NULL`; `send_outcome = 'accepted'` ⇒ `send_started_at IS NOT NULL`;
  `send_started_at` is in the column-GRANT list AND in the guard trigger's frozen delivery-column array (0156's shape); a
  finished-row guard trigger (once finished, ⛔ no delivery column changes). ⚠ Rows are created ONLY by a child's begin under the lock (⛔ a set-based INSERT — T10). The once-ever claim is `INSERT … ON CONFLICT (ping_id) DO NOTHING` + a CAS. Cost: a sixth peer-mesh
  table. (b) Columns on the ping row — ⛔ rejected (F1).
- **WR2 — Who gets it (ALL must hold).** The SWEEP pre-filters (i), (ii), (iv), (v), (vii) set-based; the claim child re-checks
  (iii), (iv), (v), (vi), (ix) under the lock claim → ping → reminder (6.27a's Trap 13 order — the 6-27 file):
  (i) the ping's `send_outcome = 'accepted'`; (ii) `send_updated_at + 48 h ≤ clock_timestamp() < send_updated_at + 72 h` (WR4,
  WR5); (iii) "has ⛔ not answered" (below); (iv) the claim is in the answer window; (v) the Pariwar's `pariwar_wa_config.enabled`
  is ON — a switch-OFF Pariwar is ⛔ offered at all (⛔ row, ⛔ alarm); ON with an incomplete config ⇒ HOLD (⛔ enqueued, one alarm per Pariwar per tick); (vi)
  `isPeerMeshWaReminderOptedIn` (WR3); (vii) NO finished reminder row exists (none yet, a parked one, or a re-claimable one — WR10);
  (viii) inside 09:00–20:00 IST (import 6.27c's exported `isInPeerRequestSendWindow` / `nextPeerRequestSendWindowStart` — ⛔ a
  copy); (ix) the recipient is still an eligible member — `readPeerMeshRequestEligibility(db, { pariwarId, memberId, deceasedMemberId })`
  (exported, `peer-mesh-request.ts:170`; it wraps `peerMeshEligibleMemberSql` and is what 6.27c's begin uses) — any ineligible
  reason ⇒ `skipped_recipient_ineligible`.
  A begin that finds (iii) / (iv) / (vi) / (ix) false writes a FINISHED skip row (`skipped_answered` / `skipped_window_closed` /
  `skipped_not_opted_in` / `skipped_recipient_ineligible`) so the ping is ⛔ never re-evaluated.
  On (iii), against the ratified *"those of the five who have ⛔ not answered"* (`-303` Q1 A):
  ⭐ **(b) `peerMeshReplyState !== 'submitted'`** — MATCHES the ruling literally and reads the seam unchanged (PM7 (g)); cost: a
  neighbour mid-answer (whose `has_died` may already count) gets the same "please answer a few short questions" nudge.
  (c) "⛔ no `has_died` answer saved" (FQ10's own unit) — also matches; cost: a NEW read beside `peerMeshReplyState`, which amends
  PM7 (g) (an author-commit) and touches the frozen `peer-mesh-reply.ts` (AC12 would need a carve-out).
  (a) `=== 'none'` only — ⛔ recommended: it drops a neighbour who saved only *"how did you know them"* and has ⛔ not answered the
  question asked ⇒ it NARROWS the ratified text ⇒ choosing it is the PANEL's (§0).
- **WR3 — "Has chosen WhatsApp messages from the Trust" — ONE exported read** `isPeerMeshWaReminderOptedIn(db, {pariwarId,
  memberId})` in `packages/domain/src/wa-opt-in/` = `isOptInActive(…)` (the ratified dual gate's member half as built — ADR-0029, `-065`; `resolveWaTarget` reads exactly this) AND
  `consentExists(…, 'whatsapp_opt_in')` — a DEFENSIVE extra conjunct (it can only narrow: 5.4 mints and revokes both in one
  transaction). Cost: reaches almost nobody (F14). The Panel note asks whether the choice lasts
  until withdrawn; under option B ONLY this function's body changes (plus the wording / withdrawal fixes the note names); under A,
  ALSO the alert system's gate (`resolveWaTarget`) and the expiry sweep / EXPIRED state change — in a follow-up row, or
  in 6.31 if the ruling lands before Task 1. ⛔ Never read `consentExists` alone before a ruling (it would SUPERSEDE a ratified
  clause by reading — [[feedback_supersede_never_reinterpret]]).
- **WR4 — The 48 hours count from the TEXT.** ⭐ (a) due at `send_updated_at + 48 h` of the accepted ping — *"after two days"* stays
  literally true and the reminder ⛔ never precedes or crowds the text; a replacement ping counts from its OWN text. Cost: a late
  text pushes the reminder past the 72-hour tally (F3/F5) — recorded. (b) selection + 48 h, only if the text went ≥ 24 h earlier —
  cost: a second rule, and a reminder at 24 h after a late text.
- **WR5 — A bounded lateness.** ⭐ (a) ⛔ no send ATTEMPT may start after `send_updated_at + 72 h`: the due list stops at
  `< + 72 h` (AC2), so the SWEEP's bound acts ONLY on rows that already exist (and only on those with `send_started_at IS NULL` —
  an in-flight row is the lapsed-row finisher's, WR10) — a parked `sweep:held` row or a transient-retry row still
  ⛔ finished at `+ 72 h` becomes `skipped_late` (⛔ no send; its last `detail` kept in `first_detail` / `detail` — the ONE ending
  for a bound reached, ⛔ `exhausted`). The begin ALSO re-checks `clock_timestamp() < send_updated_at + 72 h` under the lock (a
  child deferred by quiet hours or a retry can start late) — else it writes `skipped_late` for a ping that WAS due when its child
  was enqueued. ⛔ Other row is written for a ping that was never due (⛔ backfill —
  a switch-OFF Pariwar, an answered or non-opted-in neighbour gets ⛔ no row). It is a reminder, ⛔ not the request: a hold or
  outage longer than a day loses it — a DELIVERY failure (§0). (b) send any time within the answer window — cost: a reminder days
  late. ⛔ Never outside the answer window under either (I4).
- **WR6 — The words and the template.** ⭐ The Meta template body, per locale, is the ruled text with three body variables:
  `{{1}}` the member's name, `{{2}}` the link, `{{3}}` the helpline — ⛔ no header, ⛔ no footer, ⛔ no buttons, ⛔ no "TWT:"
  prefix (WhatsApp shows the Pariwar's business name; PM3's reading for the DLT header). Category **UTILITY**. Registered in ONE
  file `apps/jobs/src/scheduler/peer-mesh-wa-templates.ts` (`PEER_MESH_WA_REMINDER_BODY = { en, hi }`) with a lockstep test against
  the real `t('peer_mesh_sms.request', …, { namespace: 'claim' })` (I6). Meta files it as MARKETING, or rejects it ⇒ "Meta refuses"
  (`-303`): ⛔ no reminder; the text still goes. ⚠ S1: if Meta's variable rules refuse the English body (it ENDS with
  `{{3}}.`), never re-word it here — STOP and route (a wording change is the Panel's). Meta's `language.code` must be the code the
  template was REGISTERED under: a fixed map `PEER_MESH_WA_REMINDER_LANGUAGE = { en: 'en', hi: 'hi' }` in the template file, and
  Row 33 (b) requires the templates be registered under EXACTLY those codes (⛔ `en_US`).
- **WR7 — Where the approved template name lives.** ⭐ (a) a per-Pariwar config value `wa.template.peer_mesh.reminder.<locale>.<pariwarId>`
  read through the SAME config resolver the DLT template ids use (`resolveSmsDltConfig`'s store — confirm at Task 0.1, S3), set by
  the operator ONLY after Meta approves the template as UTILITY in that Pariwar's WABA (Row 33 (b)); unset ⇒ HOLD that Pariwar.
  Cost: approval status is an operator attestation (as `pariwar_wa_templates.approval_status` already is — ⛔ no sync with Meta).
  (b) widen `pariwar_wa_templates` — ⛔ rejected (frozen `AlertCategory`, F8).
- **WR8 — Three values on the wire.** ⭐ ADDITIVE in `packages/channels/src/providers/whatsapp-app.ts`: `WhatsappTemplateMessage`
  becomes a union — the existing `{ bodyParam }` (unchanged, the dispatch provider keeps using it) OR `{ bodyParams: readonly
  string[] }` (1–3 values, each non-empty) — and `buildRequestBody` emits one `{type:'text', text}` per value in order; plus an
  optional per-send `timeoutMs` (AbortSignal) for the direct path (architecture §3.12). Cost: a touched shared client — its existing
  tests must stay green UNCHANGED. ADR-0028 is ANNOTATED (Task 0.4), ⛔ never rewritten.
- **WR9 — One WA client.** ⭐ expose `whatsappAppCache` on `ContributionProviderWiring` (as `smsAppClient` was for 6.19b) and pass it
  into 6.31's deps from `boot.ts`; EXPORT `resolveChannelSecret` (module-private at `contribution-providers.ts:78`, fail-loud — it
  THROWS on not-found and on an outage alike) and call it in the pre-begin race guard: any throw ⇒ HOLD `config:wa_secret_unresolved`
  (ids only). ⛔ A second `createWhatsappAppCache()`. ⛔ The fixture provider as a fallback: an unconfigured WA client ⇒ HOLD (fail
  closed, 6.19b precedent). ⚠ `messagingFor` caches one client per Pariwar and IGNORES later config — a rotated token or phone
  number needs a jobs restart (recorded on Row 33 (a)).
- **WR10 — Outcomes.** `send_outcome` ∈ `attempting`, `accepted`, `rejected_recipient`, `no_target` (no sendable mobile, or a
  name fault), `error` (ambiguous or refused), `skipped_answered`, `skipped_window_closed`, `skipped_not_opted_in`,
  `skipped_recipient_ineligible`, `skipped_late`. The `detail` grammar (`PEER_MESH_WA_REMINDER_DETAIL_PATTERN`, Task 1.2) covers
  exactly (`sweep:held` is a `claimed_by_job` marker, ⛔ a `detail`; the `config:<gap>` codes of Task 5.2 appear ONLY in alarms —
  a held Pariwar writes ⛔ row): the transients
  `rate_limited:<code|none>` (an HTTP 429), `api_unavailable:<code|status>`,
  `decrypt_failed:tier1` (6.27c's spellings); `may_have_sent:<network|timeout|no_wamid|lease_lapsed|gateway_502|gateway_504|unknown>`;
  `refused:<class>`; `scope:<class>`; `no_target:no_sendable_number`;
  `no_target:name_<none|erased|unresolvable|too_long>`. ⚠ `classifyWhatsappError`'s CLASS alone is ⛔ enough: it returns `api_unavailable` for BOTH a thrown fetch
  (`httpStatus` 0) and a 5xx, and `unknown` for a 429 without a Meta code. The rule is over the class AND `httpStatus` (the order
  below is the order of evaluation):
  1. **`httpStatus === 0`** (a thrown fetch — connect error, reset, the `timeoutMs` abort; the client cannot tell whether Meta
     received it) or a **2xx without a wamid** ⇒ `error` / `may_have_sent:<network|timeout|unknown>` (status 0, by `transport`) or `may_have_sent:no_wamid` (a 2xx) — ⛔ never resent (Meta has ⛔ no
     idempotency key; I1). Cost: a connect failure that never reached Meta also loses the reminder — the safe side of "once ever".
  2. `template_not_approved`, `auth`, or a **parameter-shaped** `invalid_recipient` code (131008 / 131009 — missing / invalid
     parameter: OUR values or template, ⛔ the recipient; re-verify the codes at S1) ⇒ SCOPE-WIDE: the row gets `detail = scope:<class>`,
     `claimed_by_job = 'sweep:held'`, `parked_at`, `send_started_at = NULL` (Meta answered with a refusal) — ⛔ finished; an alarm
     names the Pariwar; the claim child ends its loop (WR12). ⚠ Unlike 6.27c's P1 (which FINISHES the current ping as `error`), 6.31
     re-parks so a template approved later can still go; cost: an unapproved template is retried once per claim per hourly tick
     until `+ 72 h` — recorded.
  3. **`httpStatus` 502 or 504** (a gateway that may have forwarded the request) ⇒ `error` / `may_have_sent:gateway_<status>` (I1;
     6.37's may-have-sent precedent).
  4. **`httpStatus === 429`** (with or without a Meta code ⇒ `rate_limited:<code|none>`), or class `api_unavailable` with any other
     `httpStatus ≠ 0` (500, 503, and Meta's rate-limit codes 130429 / 131048 / 131056 / 133016 / 80007, which usually arrive on a
     400; re-verify at S1) ⇒ transient, retried under the 10-minute lease until WR5's bound, then `skipped_late`.
  5. `recipient_blocked` or any other `invalid_recipient` ⇒ `rejected_recipient` (finished).
  6. Anything else (`unknown` with a 4xx, `window_expired`, which cannot occur for a template) ⇒ `error` / `refused:<class>`
     (finished, alarm) — Meta answered, so nothing was sent; ⛔ resent either way.
  Before the send: a mobile DECRYPT throw ⇒ transient (`decrypt_failed:tier1`, 6.27c's precedent — ⛔ a finished row on a KMS fault);
  ⛔ decryptable / normalisable mobile ⇒ `no_target:no_sendable_number`; a name read that fails (`readDeceasedName`'s `name_none` /
  `name_erased` / `name_unresolvable` / `name_too_long` — e.g. an erasure since the text) ⇒ `no_target:name_<reason>` (finished).
  **The in-flight marker (I1).** Immediately before the fetch the child sets `send_started_at = clock_timestamp()` in its OWN
  committed UPDATE, as a CAS: `WHERE send_outcome = 'attempting' AND claimed_by_job = $job AND send_started_at IS NULL AND
  claimed_at > clock_timestamp() − (CORRECTION_SEND_LEASE_MS − PEER_REQUEST_HANDOFF_LEASE_MARGIN_MS)`; ZERO rows ⇒ ⛔ send (the
  lease was lost). Because the CAS only promises that `PEER_REQUEST_HANDOFF_LEASE_MARGIN_MS` (2 min) of lease REMAINS, the send's
  whole tail must fit inside that margin: `timeoutMs` (⭐ `CORRECTION_SEND_TIMEOUT_MS`, the SMS core's 10 s,
  `claim-dlt-sms-send.ts`) + the finalise < `PEER_REQUEST_HANDOFF_LEASE_MARGIN_MS` — a test pins the inequality — so a live send
  can ⛔ never be finished `lease_lapsed` under it. The marker is cleared to NULL only by a rule-2 park or a rule-4 / pre-send transient (Meta
  answered with a refusal, or the send never began). The re-claim CAS requires `send_started_at IS NULL` AND one of 6.27c's three re-claim
  grounds (`peer-mesh-request.ts:373-375`): the job's OWN retry, a parked row, or a lapsed lease — so a child that died between the begin COMMIT and the marker (it never reached Meta) is re-claimable; a lapsed
  `attempting` row with `send_started_at IS NOT NULL` died mid-flight ⇒ finished `error` / `may_have_sent:lease_lapsed` by the
  sweep — ⛔ ever re-claimed or parked. (⛔ a rule keyed on `detail`: 6.27c's re-claim keeps the previous `detail` — `-302` RN6 — so
  a stale transient note would make a mid-flight death look re-claimable.) ⚠ A timeout DURING the body read is caught by the
  client (`whatsapp-app.ts:184-188`): a 2xx becomes "no wamid" (rule 1) and a non-2xx keeps its status class — still safe.
- **WR11 — ⛔ No events; the wamid is the trail.** Like 6.27c (AC5b) the reminder emits ⛔ no event; `provider_message_id` holds the
  wamid; delivery statuses join `whatsapp_send_status` read-only. 6.31 builds ⛔ no reaction to a status (⛔ no fallback, I2).
  ⚠ RECORDED, ⛔ built here: 5.4's existing webhook worker (`wa-webhook-processor.ts:356-368`) moves a recipient's opt-in to
  `BLOCKED_BY_META` and revokes the consent on a failed status carrying 131050 / 131049 / 131026 / 131047 for ANY wamid — a
  reminder's included (F13). That is the existing opt-in rule acting, ⛔ a 6.31 effect to suppress.
- **WR12 — The sweep.** ⭐ queues `claim.peer_mesh_wa_reminder.sweep` + `claim.peer_mesh_wa_reminder.send` (added to
  `packages/queue/src/index.ts`; its duplicate-value test covers them), cron `20 9-19 * * *` tz `Asia/Kolkata` (09:20 … 19:20 —
  inside the send window; a daily sweep would delay a 48-hour reminder up to a day). The parent lists due pings set-based
  (cross-tenant BYPASSRLS pool, the "DELIBERATE" block shape of `listDuePeerMeshRequestClaims`), FIRST finishes lapsed in-flight rows
  (`finishLapsedInFlightPeerMeshWaReminders` — regardless of the switch and of the 72 h bound, so ⛔ such row is stranded), THEN
  marks the late ones (`markLatePeerMeshWaReminders` — REGARDLESS of the switch, so a row parked before a Pariwar is switched OFF
  still finishes), checks each Pariwar's config gaps once (a held Pariwar: ⛔ enqueued, one alarm) and enqueues **one child per
  CLAIM** (6.27c's shape — `runPeerMeshRequestChild` loops its
  pings; a scope-wide fault returns the CURRENT row to `sweep:held` and ends the loop — the claim's other pings simply stay un-begun).
  Other claims' children already queued for the same Pariwar each make at most ONE failing call — recorded, ⛔ prevented. Run limits sized for an HOURLY cron:
  mirror 6.25's sub-interval constants (`STAFF_EMAIL_SWEEP_BUDGET_MS` / `STAFF_EMAIL_SWEEP_EXPIRE_SECONDS`), scaled so a tick ends
  well inside 60 min — ⛔ 6.27c's 45-min budget / 90-min expiry (built for a daily cron; a slow tick would overlap the next).
  Registered by `registerClaimPeerMeshWaReminderWorkers(boss, deps)` in `apps/jobs/src/scheduler/claim-peer-mesh-wa-reminders.ts`,
  wired in `boot.ts` next to 6.27c's.
- **WR13 — The values.** `{{1}}` = 6.27c's `{member}` render — `readDeceasedName` (`claim-peer-mesh-requests.ts:476`,
  module-private; it takes `ClaimPeerMeshRequestDeps` and hard-codes `claim-peer-mesh-request` in its alarm text: ⭐ EXPORT it with
  its deps NARROWED to `{ pool, encryption, onAlarm }` and an alarm-LABEL parameter (used in its two alarm strings and its two
  `ClaimCorrectionTransientError` messages; `alarmOf` at `:100` builds ⛔ text — only its parameter narrows to `Pick<…, 'onAlarm'>`) (6.27c passes its current label — ⛔ a
  behaviour change for the text); the jobs file is ⛔ frozen; it wraps `notifications.resolveMemberFacingDeceasedName` and keeps
  `fitsDltAlphanumeric`, which an `accepted` ping has already passed — `name_too_long` can only arise if the name changed since the
  text, recorded) — ⛔ a second name read; `{{2}}` =
  `buildAppLinkUrl(resolveAppLinksOrigin(APP_LINKS_BASE_URL), 'peerRequest', ping.link_code)` (an invalid base URL ⇒ HOLD,
  `config:app_links_base_url_invalid`); `{{3}}` = the Pariwar's helpline (`claimCorrectionHelplineConfigKey`) — unset ⇒ HOLD
  `config:helpline_number_missing` (6.27c's name). Also mirror 6.27c's questionnaire gaps (`config:questionnaire_unavailable`,
  `config:counsel_basis_pending` — `pariwarConfig`, `claim-peer-mesh-requests.ts:211-213`): the reminder carries the same link to the
  same questions, so a Pariwar whose text would HOLD holds its reminder too. The recipient: the member's CURRENT mobile
  (`getMemberMobileCiphertext` → `decryptMobile` → `normalizeMobile`, which returns `+91XXXXXXXXXX`) with the `+` stripped (Meta's
  `to`); `recipient_number_hash` via `claim.correctionNumberHash` as 6.27c does. ⚠ Every KMS / Secret Manager read (name, mobile,
  token, template key, helpline) happens OUTSIDE the row locks (T15).
- **WR14 — The language.** ⭐ `resolvePeerRequestLocale` — THE one read (Pariwar default today; row 6-35 changes it in one place) —
  recorded as `locale` + `locale_source`. ⛔ The ping's `locale_source` copied (the language may differ by then only when row 6-35
  ships; reading again is the ruled rule — `-310` CF1 A).
- **WR15 — The records (Task 0.4).** `epics.md` entry; roster **Row 33** (WR16); ANNOTATIONS (⛔ rewrites) on architecture §3.4 (a
  direct WhatsApp path outside `dispatch()`, a message outside the UTILITY list's examples, three body values), ADR-0028 (multi-value
  for this path), ADR-0029 (the reminder reads the dual gate as ratified; the Panel note pending); the sprint row → `in-progress` (its
  annotation on the stale ledger-`2026-10-10f` clause was ⭐ DONE at creation); `deferred-work.md` items: (1) the 24-hour opt-in reach of `dispatch()`'s WA rung and the
  un-withdrawable EXPIRED consent (F14); (2) 131049 revoking consent (F13); (3) ⛔ no `template_category_update` webhook handling.
- **WR16 — Roster Row 33** `peer-mesh-wa-reminder-template-approved` (Rows 29–32's eleven fields): **(a)** each live Pariwar's WABA
  provisioned (`pariwar_wa_config` complete, switch on); **(b)** the en + hi templates approved by Meta **as UTILITY**, the names set
  under WR7's keys, each with the exact registered language code; **(c)** the Hindi body human-reviewed (Row 28's control); **(d)** counsel's view recorded on Meta as a processor of
  the deceased member's name and the neighbour's number (Row 27 (a) names only the DLT text); **(e)** an owner for the HOLD /
  `may_have_sent` alarms; **(f)** a re-check procedure for Meta re-categorising an approved template (no webhook handles it — WR15
  (3)); **(g)** the Panel's ruling on Task 0.5's note recorded, or its absence at go-live recorded as a decision. ⛔ Never a merge fence.

## Acceptance Criteria

**AC0 — Governance before code (Task 0).** S1–S4 settled or their STOP raised; WR1–WR16 answered by BigDev and committed ALONE as
one author-commit (`-347` or the next free id) naming what it adds to `-311` (PM7 (g) / Trap 17 realised) and what it annotates
(ADR-0028, ADR-0029 — ⛔ superseding neither); then, in one records commit: the `epics.md` entry, roster Row 33, the architecture
§3.4 / ADR annotations (the sprint-row annotation was made at creation), the `deferred-work.md` items (WR15),
the ledger line — all BEFORE any code. The Panel note (Task 0.5) is WRITTEN at creation and ⛔ not yet sent; it blocks ⛔ nothing.

**AC1 — The record (WR1).** Migration `0167_peer-mesh-wa-reminders.sql` (hand-authored, journal idx 167) creates
`claim_peer_mesh_wa_reminders` with `UNIQUE (ping_id)`, the FK to the ping, RLS by `pariwar_id`, the column GRANTs, the CHECKs and
the finished-row guard trigger; the Drizzle schema file `packages/domain/src/schema/claim_peer_mesh_wa_reminders.ts` matches it;
applied on :5432 AND :5433 ([[project_live_db_test_gotchas]]). A spec proves: a second row for one ping is refused (23505); a
finished row's delivery columns cannot change (the trigger); `twt_app` cannot UPDATE a non-delivery column; a `detail` outside the
grammar is refused. ⛔ No column is added to `claim_peer_mesh_pings`, ⛔ no 0156 / 0166 object changes.

**AC2 — Who is due (WR2, WR4, WR5).** The sweep's set-based list returns a ping iff: `send_outcome = 'accepted'`;
`send_updated_at + 48 h ≤ clock_timestamp() < send_updated_at + 72 h`; the claim satisfies `answerWindowSql`; the Pariwar's WA switch
is ON; and EITHER ⛔ no reminder row, OR a parked `sweep:held` row, OR a re-claimable `attempting` row (WR10's lapsed-lease rule; a
lapsed row with `send_started_at` set is finished `may_have_sent:lease_lapsed` by the same sweep, BEFORE the late marking and
whatever the switch or the bound). A Pariwar whose switch is OFF is ⛔
offered at all — ⛔ no row, ⛔ no alarm (the default is OFF, F11; turning it on later makes its 48–72 h pings due). An EXISTING
⛔-finished row (parked, or transient) whose ping is past `+ 72 h` becomes `skipped_late` (⛔ no send) — and ⛔ any other row is
written for a ping that was never due (WR5). Legs, each red on a sweep that omits the conjunct: every non-`accepted` outcome (`attempting`,
`rejected_invalid_number`, `rejected_unreachable`, `no_target`, `error`, `skipped_superseded`, NULL); 47 h 59 m (⛔ due); 48 h
(due); 72 h (late); a decided claim; switch off (⛔ listed, ⛔ row, ⛔ alarm); a finished row (⛔ listed); a parked row (listed); a lapsed `attempting` row with `send_started_at` NULL and `detail` NULL (listed — it never reached Meta) and one with
`send_started_at` NOT NULL and a stale transient `detail` (finished `may_have_sent:lease_lapsed`, ZERO sends);
a parked row past `+ 72 h` (`skipped_late`); an accepted ping past `+ 72 h` with ⛔ no row (⛔ row written). ⚠ Time legs set `send_updated_at` relative to the DB clock in a SEPARATE committed transaction
([[project_db_clock_ordering_tests_tie]]).

**AC3 — Begin under the lock (WR2, I4, I5).** The claim child (one per claim — WR12) first runs the race guard OUTSIDE any lock
(the switch + config gaps of WR9 / WR13, the template name, the secret, the name render — T15); then, per due ping, locks claim →
ping (6.27c's `lockClaimThenPing` ORDER — its SQL shape copied into the reminder module, ⛔ the private function exported), then
inserts / CASes the reminder row, re-checking: `peerMeshReplyState !== 'submitted'` (WR2 (iii) (b); else finished `skipped_answered` — a `started` leg SENDS);
`isClaimInAnswerWindow` (else `skipped_window_closed`); `isPeerMeshWaReminderOptedIn` (else `skipped_not_opted_in`); the recipient still eligible (WR2 (ix), else
`skipped_recipient_ineligible`); the switch
still ON (else ⛔ row is written — the ping stays un-begun; an EXISTING parked / transient row is left untouched and finished
later by `markLatePeerMeshWaReminders`); `clock_timestamp() < send_updated_at + 72 h` (WR5, else `skipped_late` — a leg: a child
enqueued at 19:20 for a +71 h ping and deferred to 09:00); quiet hours (else the child is re-enqueued `startAfter` =
the next 09:00 IST). The mobile is decrypted AFTER the claiming COMMIT (6.27c's module header steps (4)–(5); Trap 9 of the 6-27 file — T15). Each leg asserts ZERO WA sends (a zero-call
recorder — ⛔ a throwing stub). A two-connection race on one ping ⇒ exactly ONE send.

**AC4 — "Opted in" is ONE read (WR3).** `isPeerMeshWaReminderOptedIn` is exported from `packages/domain/src/wa-opt-in/` and is
`isOptInActive(…) AND consentExists(…, 'whatsapp_opt_in')`; the reminder code calls ⛔ nothing else for it (a source-text fence over
`claim-peer-mesh-wa-reminders.ts` AND `claim/peer-mesh-wa-reminder.ts`, COMMENTS STRIPPED first: ⛔ `consentExists` /
`isOptInActive` / `member_wa_opt_in`). Legs: ACTIVE with a live window + consent ⇒ true; ACTIVE with a NULL `window_expires_at` +
consent ⇒ true; ACTIVE past `window_expires_at` ⇒ false; `EXPIRED_24H_WINDOW`, `REVOKED`, `BLOCKED_BY_META`, `PENDING`, no row ⇒
false; ACTIVE but consent revoked ⇒ false (5.4's writers revoke both together, so THIS leg alone seeds the consent row by a
raw `UPDATE` — say so in the test).

**AC5 — The words (WR6, WR13, WR14, I6).** `PEER_MESH_WA_REMINDER_BODY.en` / `.hi` equal the real `t('peer_mesh_sms.request', {
member: '{{1}}', link: '{{2}}', helpline: '{{3}}' }, { namespace: 'claim', locale })` output (the lockstep test calls the REAL `t()`
— [[feedback_stub_must_call_not_transcribe]]); the request body sends exactly three body values in that order — the 6.27c member
render, `buildAppLinkUrl(origin, 'peerRequest', link_code)`, the Pariwar's helpline — with the template name read from WR7's key for
`resolvePeerRequestLocale`'s locale, and `language.code` = `PEER_MESH_WA_REMINDER_LANGUAGE[locale]` (asserted). ⛔ No `{#var#}`, `DLT_VAR` or `sms.dlt.template_id.` string
appears in any new file (the `dlt-typed-variables` gate stays green — F16).

**AC6 — Three values on the wire (WR8).** `packages/channels` unit tests: a `{ bodyParams: [a, b, c] }` message builds
`components: [{ type: 'body', parameters: [ {type:'text',text:a}, {…b}, {…c} ] }]`; an empty value or more than three is refused
before `fetch`; `FetchInit` gains an optional `signal?: AbortSignal` (exported, additive) and `timeoutMs` aborts a hung fetch, which
rejects with a `WhatsappSendError` with `httpStatus` 0 and a new OPTIONAL field `transport: 'timeout' | 'network'` (6.37's precedent:
`sms-app.ts`'s `signal` and its `readBody` timeout / body_read split) — WR10 rule 1 ⇒ `may_have_sent`; the existing `{ bodyParam }`
tests (`whatsapp-business.test.ts`, `provider-composition.test.ts`, `apps/api/tests/unit/whatsapp-composition.test.ts`,
`contribution-provider-resolver.test.ts`) and the existing `{ metaCode: null, httpStatus: 0 }` transport assertion pass UNCHANGED.

**AC7 — Outcomes (WR10, I1).** Injected-fetch legs (⛔ network), one per WR10 rule: 200 + wamid ⇒ `accepted`,
`provider_message_id` = the wamid, `send_updated_at` set; (1) a thrown fetch (network, and the `timeoutMs` abort) and a 2xx with ⛔
no wamid ⇒ `error` / `may_have_sent:…` and a re-run sends ⛔ nothing; (2) `template_not_approved`, `auth`, and 131008 ⇒ the row
back to `sweep:held` (⛔ finished), an alarm, and the claim child's loop ENDS (the claim's second due ping is ⛔ attempted — a
two-ping fixture); (2′) 131009 ⇒ the same as (2); (3) a 502 and a 504 ⇒ `may_have_sent:gateway_<status>`, ⛔ resent; (4) a 429 WITHOUT a Meta
code, a 429 WITH 130429, a 400 with 131056, and a 503 ⇒ transient, retried, then `skipped_late` at WR5's bound; (5) `recipient_blocked` ⇒ `rejected_recipient`; (6) a 400 with an unrecognised code ⇒ `error` /
`refused:unknown`; no sendable mobile ⇒ `no_target:no_sendable_number`; a decrypt throw ⇒ transient (⛔ finished); an erased
name ⇒ `no_target:name_erased`; SEPARATELY (the in-flight marker): a marker CAS whose lease is lost ⇒ ZERO sends; a lapsed row with
the marker set, past `+ 72 h` in a switch-OFF Pariwar ⇒ finished `may_have_sent:lease_lapsed` (⛔ stranded); a late marking over
a Pariwar with a live in-flight row ⇒ the sweep ⛔ aborts (23514). EVERY failure leg asserts ZERO SMS sends (an SMS recorder wired into the deps)
— I2.

**AC8 — ⛔ Never `dispatch()` (I2).** A source fence BY SYMBOL NAME (every export comes through the `@twt/channels` barrel, so a
path fence cannot tell modules apart), comments stripped: `claim-peer-mesh-wa-reminders.ts` and `claim/peer-mesh-wa-reminder.ts`
name ⛔ `dispatch`, `runChannelCascade`, `resolveWhatsappProviderDeps`, `createContributionProviderResolver`,
`resolveApprovedTemplate`, `AlertCategory`, or `pariwar_wa_templates`.

**AC9 — One client (WR9).** `ContributionProviderWiring` exposes `whatsappAppCache`; `resolveChannelSecret` is exported; `boot.ts`
passes the cache to `registerClaimPeerMeshWaReminderWorkers`; `grep -rn "createWhatsappAppCache()" apps/jobs/src` finds exactly ONE
call. A switch-ON Pariwar with an incomplete config (blank secret name, blank `phone_number_id`, a secret that throws, a missing
template-name key for its locale, an invalid `APP_LINKS_BASE_URL`, a missing helpline, an unavailable questionnaire or a
counsel-pending basis) ⇒ HOLD with the matching `config:<gap>` of Task 5.2 — ONE leg per gap — (ids only) — ⛔ enqueued, ⛔ row written, ONE alarm per
Pariwar per tick, ⛔ a fixture send. A
switch-OFF Pariwar ⇒ AC2 (⛔ offered).

**AC10 — The sweep (WR12).** Queues registered in `packages/queue/src/index.ts`; cron `20 9-19 * * *` `Asia/Kolkata`; one child per
claim; a held Pariwar's pings ⛔ enqueued (one alarm) and due again once the gap closes, inside `< + 72 h`; a row returned to
`sweep:held` by a scope-wide fault listed again, subject to WR5's bound; run limits
sized for an hourly tick (WR12). A live suite `apps/jobs/tests/claim-peer-mesh-wa-reminders-live.test.ts` drives the sweep end to end
over a fixture MIRRORING 6.27c's live suite's `world()` (that helper is local to its file — copy its shape, seed via
`_claim-correction-seed.ts`'s `onOwnTx`, clean by `pariwar_id`).

**AC11 — Ids only; nothing else moves (I7, I8).** An alarm/log capture over the whole live suite contains ⛔ none of the fixture's
member name, mobile, link code or link. A run writes ⛔ no `events_log` row (count before/after), ⛔ no claim state, ⛔ no ping
column, ⛔ no selection `outcome`.

**AC12 — Frozen files.** `git diff --stat dae96d9b -- packages/channels/src/dispatch.ts packages/channels/src/cascade.ts
packages/contracts/src/alerts packages/domain/migrations/0038_pariwar-wa-config.sql packages/domain/migrations/0156*
packages/domain/migrations/0166* packages/domain/src/claim/peer-mesh-request.ts packages/domain/src/claim/peer-mesh-reply.ts
packages/domain/src/claim/answer-window.ts apps/jobs/src/scheduler/contribution-notify.ts apps/jobs/src/wa-webhook-processor.ts` is
EMPTY — except (b): ONLY if Task 0.5's in-story path is taken (the Panel ruled before Task 1), the withdrawal fix's edits to
`wa-webhook-processor.ts`, each listed in the File List. (The two exports 6.31 adds — `readDeceasedName` in `claim-peer-mesh-requests.ts` (deps narrowed + a label parameter, 6.27c's
behaviour unchanged), `resolveChannelSecret` in `contribution-providers.ts` — are in files ⛔ on this list; each is listed in the File List with its reason.)

**AC13 — The proof.** `DATABASE_URL='postgresql://twt_dev_app:devpass@127.0.0.1:5433/twt_dev?sslmode=disable' pnpm ci:local` green
(every static gate incl. `dlt-typed-variables`, `channels-determinism`, `pii-scrape`, `schema-diff`, `db-check`; the integration
tests), ⛔ no network call in any test. New tests are each shown RED on the unfixed code (Debug Log).

## Tasks / Subtasks

- [ ] **Task 0 — governance FIRST (AC0). ⛔ No code.**
  - [ ] 0.1 `git fetch origin`; re-run the Re-check diff (header); re-grep F1–F17 and record the results in Debug Log (a). Settle:
    - **S1** — Meta's current template rules for a UTILITY body with three variables, one of them LAST before a full stop
      (English: `… {{3}}.`) — fetch Meta's own template-guidelines page (record the date). If Meta's rules would refuse the
      ruled words, re-word nothing: STOP and put it to BigDev (a wording change is the Panel's — the §0 header).
    - **S2** — the format `normalizeMobile` returns (`packages/domain/src/encryption/member-fields.ts:92`) and the exact transform to
      Meta's `to` (E.164 without `+`); record it.
    - **S3** — which store `resolveSmsDltConfig` reads (`apps/jobs/src/scheduler/contribution-providers.ts`) and that a per-Pariwar
      key of WR7's shape is readable through it; if ⛔ not, propose the nearest existing per-Pariwar config read to BigDev at 0.2.
    - **S4** — `git branch -a` + every worktree: ⛔ another branch has taken migration 0167, decision `-347` or roster Row 33
      ([[feedback_concurrent_review_agents_mutate_tree]]); take the next free one if so and say so.
  - [ ] 0.2 Put WR1–WR16 to BigDev, each with its ⭐ recommendation and cost (WR2 (iii), WR4, WR5, WR7 have real alternatives).
    Record the answers verbatim in Debug Log (b).
  - [ ] 0.3 Write the author-commit (`.decision-log.md`, prepended; the `-345` / `-346` entry shape: Decision type / Status / Author /
    Ratifying trustees: ⛔ None / §0 gate / Occasion / FOUND / The decisions / Consequences / References). It REALISES `-311` PM7 (g)
    + Trap 17 and ANNOTATES ADR-0028 / ADR-0029 — it supersedes ⛔ nothing. Stage in the scratchpad; try the insert
    ([[project_decision_log_writes_user_inserted]]); commit ALONE on the story branch; write its SHA here AFTER the commit
    ([[feedback_governance_commits_precede_implementation]]).
  - [ ] 0.4 The records, ONE commit after 0.3 (WR15, WR16): `epics.md` `### Story 6.31: … \`[SURFACE]\`` placed after the 6.37 entry,
    before the `---` that precedes `## Epic 7` (the 6.30 / 6.34 blockquote shape — *"⛔ Never a merge fence"*); roster Row 33 (Row 32's
    block format, eleven fields, (a)–(g)) + a dated pointer on Row 27 note (3) (⛔ a word of Row 27 rewritten); ANNOTATIONS on
    architecture §3.4, ADR-0028, ADR-0029 (+ the ADR index if it carries annotations); the sprint row `6-31-…` → `in-progress`
    (its annotation pointing the stale ledger-`2026-10-10f` clause to `-305` §2 item 4 was ⭐ DONE at creation — ⛔ repeat it);
    `deferred-work.md` items (1)–(3); the ledger line (the next free letter after `2026-10-17k` — re-check every branch) ([[project_sprint_status_safe_prepend]] — guard the size, verify
    the YAML).
  - [ ] 0.5 The Panel note `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-10-17-6-31-how-long-a-whatsapp-yes-lasts.md`
    exists (written at creation, from the TEMPLATE). Re-run its E4 commands; BigDev decides whether and when to send it. Record it
    as "shown to the Panel" ONLY once it has gone ([[feedback_shown_to_panel_means_sent]]). ⭐ Nothing waits on it: Task 1 builds WR3
    as ratified. If the Panel rules BEFORE Task 1 starts, apply the ruling's read + withdrawal fix inside 6.31 (re-open AC4; the
    fix touches `wa-webhook-processor.ts` STOP handling, the API revoke handler and the app's expired-state screen — AC12's carve-out
    (b)); after, it is a new row.
- [ ] **Task 1 — the record (AC1, WR1).**
  - [ ] 1.1 Hand-write `0167_peer-mesh-wa-reminders.sql` (header: the pre-apply CHECK queries, the GRANT list, why a separate table —
    F1); journal entry idx 167 (`when` > the 0166 entry's); ⛔ `db:generate` (the snapshot is frozen).
  - [ ] 1.2 The Drizzle schema + its export from the schema index; `REMINDER_SEND_OUTCOMES` + `PEER_MESH_WA_REMINDER_DETAIL_PATTERN`
    exported beside it (one grammar — the CHECK mirrors it; a test compares them).
  - [ ] 1.3 Apply on :5432 and :5433; the AC1 spec (`packages/domain/tests/integration/claim/peer-mesh-wa-reminder-record.spec.ts`)
    and the RLS policy-regression spec `packages/domain/tests/integration/rls/claim-peer-mesh-wa-reminders-policy-regression.spec.ts`
    (the `claim-peer-mesh-replies-policy-regression.spec.ts` shape).
- [ ] **Task 2 — opted in (AC4, WR3).**
  - [ ] 2.1 `isPeerMeshWaReminderOptedIn` in `packages/domain/src/wa-opt-in/read.ts` (or a sibling file exported through the same
    `waOptIn` namespace) — a one-line doc naming F14 and the Panel note.
  - [ ] 2.2 Its spec: every AC4 leg, seeded through `member_wa_opt_in` + `consent_records` writers (⛔ raw INSERTs that bypass them — except AC4's one
    split-state leg).
- [ ] **Task 3 — three values on the wire (AC6, WR8).**
  - [ ] 3.1 The `WhatsappTemplateMessage` union + `buildRequestBody` + the validation; `timeoutMs` via `AbortSignal.timeout` (or an
    `AbortController` the client owns) — the rejection is a `WhatsappSendError` with `httpStatus` 0 and `transport: 'timeout'` (AC6; WR10 rule 1 ⇒ `may_have_sent`).
  - [ ] 3.2 Unit tests (AC6), RED first; the existing WA tests UNCHANGED and green.
- [ ] **Task 4 — the domain begin / finalise (AC3, AC7).** `packages/domain/src/claim/peer-mesh-wa-reminder.ts`:
  `beginPeerMeshWaReminder` (lock claim → ping, insert-or-CAS the row, the re-checks, the skip rows), `finalisePeerMeshWaReminder`
  (only an `attempting` row held by the same job), `notePeerMeshWaReminderTransient`, `parkPeerMeshWaReminderScope` (rule 2's single-row
  UPDATE under the lock), `markPeerMeshWaReminderInFlight` (the marker CAS), the set-based `listDuePeerMeshWaReminderPings`
  / `markLatePeerMeshWaReminders` / `finishLapsedInFlightPeerMeshWaReminders` (the "DELIBERATE" cross-tenant blocks; ⛔ a
  set-based park — a park is the child's own single-row UPDATE, WR10 rule 2); export through the
  `claim` namespace. Specs: begin/finalise, the race (two connections), the marker CAS, the scope park, the lapsed-row finisher (incl. past the
  bound and switch-OFF), the late and skip paths. Add the module to the decrypt
  fence `packages/domain/tests/claim/nominee-name-no-comparison-fence.test.ts` (`FENCED_FILES` 53 → 54) with a "returns the mobile
  ciphertext AS STORED, ⛔ never decrypts" arm (6.27c's BF16 shape) — the decrypt is the jobs child's, after COMMIT.
- [ ] **Task 5 — the jobs sweep + child (AC2, AC3, AC5, AC7–AC11, WR9–WR14).**
  - [ ] 5.1 `apps/jobs/src/scheduler/peer-mesh-wa-templates.ts` (WR6) + its lockstep test against the real `t()`.
  - [ ] 5.2 `apps/jobs/src/scheduler/claim-peer-mesh-wa-reminders.ts`: config gaps for a switch-ON Pariwar (`config:wa_config_incomplete`,
    `config:wa_template_missing:<locale>`, `config:wa_secret_unresolved`, `config:app_links_base_url_invalid`,
    `config:helpline_number_missing`, `config:questionnaire_unavailable`, `config:counsel_basis_pending`,
    `config:locale_unavailable` — `resolvePeerRequestLocale` throws `PeerRequestLocaleMissingError`, as 6.27c holds it; a failed
    READ is a transient); the claim child (race
    guard → per ping: begin → decrypt after COMMIT → send with `timeoutMs` → finalise / classify, ending the loop on a scope-wide
    fault); the sweep; the `register…Workers` export. IMPORT 6.27c's quiet-hours helpers (already exported) and `readDeceasedName`
    (add its `export`, ⛔ a behaviour change); export `resolveChannelSecret`.
  - [ ] 5.3 Queue names in `packages/queue/src/index.ts`; expose `whatsappAppCache` (WR9); wire in `boot.ts` beside 6.27c's
    registration (pass `APP_LINKS_BASE_URL` the same way).
  - [ ] 5.4 Pure tests (`claim-peer-mesh-wa-reminders.test.ts`) + the live suite (AC10) incl. the alarm-capture, event-count and
    zero-SMS legs; the source fences (AC4, AC8).
- [ ] **Task 6 — the proof (AC12, AC13).** The frozen-file diff; `ci:local` on :5433; the RED-first evidence for every new test in
  Debug Log; Completion Notes; File List; Change Log; the story → `review`, the sprint row → `review` (a ledger line).

## Dev Notes

### ⚠ TRAPS

- **T1 — The stale "District Admin" clause.** Ledger entry `2026-10-10f` says *"⛔ no reminder once the District Admin has decided"*.
  WITHDRAWN (`-305` §2 item 4). The gate is the ANSWER WINDOW — build ⛔ nothing keyed on a District Admin step.
- **T2 — `consentExists` alone is a SUPERSESSION, ⛔ a convenience.** It would send to `EXPIRED_24H_WINDOW` members whom the app
  has TOLD their opt-in expired, and whom the STOP path ignores (F14). Until the Panel rules, WR3's read is the ratified gate.
  ⛔ "Fix" the 24-hour window in Story 5.4's code as part of 6.31's Task 1–6 (only Task 0.5's ruled path may).
- **T3 — ⛔ Never `dispatch()`, ⛔ never `resolveWhatsappProviderDeps`.** Both are keyed by `AlertCategory`; the cascade falls back
  to SMS on a WA reject — a SECOND text (Trap 17 of 6.27; `-311` PM2). Build the `WhatsappTemplateMessage` yourself and call
  `messagingFor(pariwarId, config).send(…)`.
- **T4 — Numbers taken on other branches.** At the pin `main` has migration 0166, decision `-346`, roster Row 32, ledger
  `2026-10-17i`. Branch `story/6-37b-msg91-delivery-reports` has COMMITTED a story (`e01c90c3`) planning 0167, `-347`, Row 33 and
  ledger `2026-10-17j` (its T9 names this story). This story's creation therefore took ledger `2026-10-17k`; its 0167 / `-347` /
  Row 33 are PROVISIONAL. Re-check at Task 0.1 (S4) and before each commit; whichever Task 0 commits second takes the next free
  numbers and fixes its own references (the Panel note names ⛔ row number).
- **T5 — Clock.** Business time from the DB: `clock_timestamp()` in writes (⛔ `now()` — one transaction freezes it); the 48 h / 72 h
  comparisons in SQL. Time-ordering tests need SEPARATE committed transactions ([[project_db_clock_ordering_tests_tie]]).
- **T6 — The DLT gate reads comments too** (F16). In the WA template file write ⛔ no `{#var#}`, ⛔ no `DLT_VAR`, ⛔ no
  `sms.dlt.template_id.` — not even in a comment that explains the difference.
- **T7 — Same words means the CURRENT `t()` output**, ⛔ the routing note's text (which said "two" and carried "TWT:") and ⛔ a hand
  copy of the JSON. The lockstep test calls the real `t()`.
- **T8 — Live DB.** Every live suite with `DATABASE_URL=…:5433` EXPLICITLY (the worktree has ⛔ no `apps/api/.env`); a `git push`
  runs the pre-push hook against the shell's DATABASE_URL — push with :5433 ([[project_prepush_hook_inherits_5432]]). ⛔ Regenerate
  an applied migration (42P07); ⛔ `DROP SCHEMA` ([[project_live_db_test_gotchas]]).
- **T9 — Prettier is ⛔ enforced** — hand-format; ⛔ `--write` ([[project_prettier_not_enforced]]). A `**…**` in a JSDoc can contain
  `**/` and close the comment — grep after edits ([[project_markdown_emphasis_closes_jsdoc]]).
- **T10 — Lock order** claim → ping → reminder, everywhere (6.27a's Trap 13, the 6-27 file). The reminder row's FK to the ping takes a KEY SHARE lock
  on the ping at INSERT — begin AFTER the ping lock, ⛔ before it.
- **T11 — The link code is a credential.** It goes into `{{2}}` only; ⛔ in `detail`, an alarm, a log, a test name or a snapshot
  (6.27 PM21 (e)). The member's name and mobile likewise (I7).
- **T12 — A throwing fetch stub proves nothing.** "⛔ No send" legs use a zero-call recorder and assert `calls.length === 0`.
- **T13 — Classify by class AND `httpStatus`, ⛔ class alone.** `classifyWhatsappError` returns `api_unavailable` for a thrown fetch
  (`httpStatus` 0) AND for a 5xx, and `unknown` for a code-less 429; Meta's codes in `whatsapp-errors.ts` are "INDICATIVE, VERIFY".
  Follow WR10's ordered rules exactly; an unrecognised failure is NEVER retried.
- **T14 — Contracts / jobs tests sit partly outside `tsc`** — run vitest for every touched package
  ([[project_contracts_tests_outside_tsc]]).
- **T15 — ⛔ KMS or Secret Manager under a row lock.** The name read, the token, the template-name and helpline keys are read in the
  race guard BEFORE begin; the mobile is decrypted AFTER the claiming COMMIT (6.27c's module header steps (4)–(5); Trap 9 of the
  6-27 file). A decrypt THROW is transient (`decrypt_failed:tier1`, 6.27c's precedent) — ⛔ a finished `no_target`.

### Reuse map

| Need | Reuse | ⛔ Rebuild |
|---|---|---|
| has ⛔ not answered | `peerMeshReplyState` (`claim/peer-mesh-reply.ts`) | a query on `claim_peer_mesh_replies` |
| answer window | `answerWindowSql` (sweep) + `isClaimInAnswerWindow` (lock) | a state list |
| quiet hours | `isInPeerRequestSendWindow` / `nextPeerRequestSendWindowStart` (already exported, `claim-peer-mesh-requests.ts:134-140`) | an IST offset |
| lock order | 6.27c's `lockClaimThenPing` (`peer-mesh-request.ts:287`, module-private) — COPY its SQL shape (`lock_timeout`, claim `FOR UPDATE`, ping `FOR UPDATE OF p`) into the reminder module; ⛔ export it (the file is frozen, AC12) | a different order |
| language | `resolvePeerRequestLocale` (`peer-mesh-request.ts:640`) | a passport read |
| member name for `{{1}}` | `readDeceasedName` (`claim-peer-mesh-requests.ts:476` — add `export`) → `notifications.resolveMemberFacingDeceasedName` | a second KYC-name read |
| link | `buildAppLinkUrl` + `resolveAppLinksOrigin` (`staff-email-config.ts`) | URL string building |
| helpline | `deps.resolveConfig(claimCorrectionHelplineConfigKey(pariwarId))` (`claim-dlt-sms-send.ts:246`) | a new key |
| mobile | `getMemberMobileCiphertext` → `decryptMobile` → `normalizeMobile`; `claim.correctionNumberHash` | a new decrypt path |
| WA client | `whatsappAppCache.messagingFor` (exposed per WR9) + `resolveChannelSecret` (export it — WR9) | a second cache / fetch |
| WA config | `channelConfig.getWaConfig` | a raw read of `pariwar_wa_config` |
| error class | `classifyWhatsappError` | a code table |
| sweep / child / lease / park | MIRROR 6.27c's `registerClaimPeerMeshRequestWorkers` / `enqueuePeerMeshRequestChild` (hard-wired to its own queue — copy the shape); REUSE `CORRECTION_SEND_LEASE_MS`, `PEER_REQUEST_HANDOFF_LEASE_MARGIN_MS`, `CORRECTION_SWEEP_RETRY`, the `sweep:held` `claimed_by_job` marker | a new job framework |
| test world | MIRROR `world()` (local to `claim-peer-mesh-requests-live.test.ts`); REUSE `_claim-correction-seed.ts` `onOwnTx` | a new fixture style |

### Testing standards

- vitest per package; live suites `describe.skipIf(!process.env.DATABASE_URL)`, own-committing, cleaned by `pariwar_id`
  (`session_replication_role='replica'` as 6.27c's live suite does).
- Inject `fetch` everywhere; ⛔ network. Inject `now` for quiet hours; DB time for the 48 h / 72 h windows.
- Every new test is shown RED on the unfixed code first (record each in Debug Log).
- `ci:local` on :5433 is the proof (AC13); integration concurrency 1 is load-bearing ([[project_ci_local_concurrency_oversubscription]]).
  A `deadlock detected` is lock order, ⛔ a flake ([[project_fk_truncate_cascade_deadlock]]).

### Project structure notes

- **NEW:** `packages/domain/migrations/0167_peer-mesh-wa-reminders.sql` (+ journal entry);
  `packages/domain/src/schema/claim_peer_mesh_wa_reminders.ts`; `packages/domain/src/claim/peer-mesh-wa-reminder.ts`;
  `apps/jobs/src/scheduler/peer-mesh-wa-templates.ts`; `apps/jobs/src/scheduler/claim-peer-mesh-wa-reminders.ts`; their tests;
  the Panel note (written at creation).
- **UPDATE:** `packages/channels/src/providers/whatsapp-app.ts` (WR8 — additive: the union, `FetchInit.signal`, `transport`);
  `packages/domain/src/wa-opt-in/read.ts` (WR3 — one function); `packages/domain/src/schema/index.ts` + the `claim` namespace export;
  `packages/queue/src/index.ts` (two queue names); `apps/jobs/src/scheduler/contribution-providers.ts` (expose the cache, export
  `resolveChannelSecret`); `apps/jobs/src/scheduler/claim-peer-mesh-requests.ts` (export `readDeceasedName` — ⛔ a behaviour
  change); `apps/jobs/src/boot.ts` (wire); `packages/domain/tests/claim/nominee-name-no-comparison-fence.test.ts` (53 → 54); the
  records (Task 0.4).
- **⛔ Touched:** AC12's list.

### Sequencing

- Independent of row 6-37b (MSG91 delivery reports) and row 6-35 (language switch — WR14 reads through the one function it will
  change). 6.31 adds ⛔ nothing 6.27c's go-live (Rows 27–29) waits on; Row 27 note (3) is discharged by 6.31's `done`.
- Go-live of the reminder waits on Row 33 — ⛔ never a merge fence ([[project_not_in_production_merge_is_not_golive]]).

### Previous story intelligence (6.27c, 6.37)

- 6.27c built the ONE direct-SMS peer-mesh sender: CAS begin under claim → ping locks, a HOLD on any config gap (⛔ a broken text), a
  scope-wide STOP on `config:` / `auth:` / `dlt_template_not_approved:` (P1), park `sweep:held`, give-up after 3 IST days, ⛔ events
  (AC5b), ids only in alarms. 6.31 mirrors that shape for WhatsApp; its review rounds found the same classes 6.31 can hit:
  a re-claimed row's re-check, an unreadable Pariwar parked (⛔ crashing the sweep), the read's SQLSTATE in alarms
  (`peerMeshSqlStateOf`), fresh fixture link codes per test.
- 6.37 (MSG91): the may-have-sent rule for a timeout after the request was written; redirects refused; a 60 s cached pre-flight
  transient. ⚠ There is ⛔ no WA pre-flight (Meta has ⛔ no cheap template-read in the built client) — a template problem surfaces as
  `template_not_approved` on the first send ⇒ WR10's scope-wide HOLD.

### Git intelligence

The last 10 commits are 6.37's adapter and its review rounds (`dae96d9b`, `252a6df0`, `da27b82d`, `171e2040`, `b90a319c`) and 6.27c's
review (`466e9b0e`, `e762a1af`, `c7d2f9ca`). Their conventions: governance commit ALONE first (`governance: …`), then `story(6.xx): …`
commits naming the ACs / patches; records in the same story's commits; `ci:local 36/36 on :5433` stated in the message.

### Latest tech information (fetched 2026-10-17 — re-check at Task 0.1)

- **Meta template categories:** a UTILITY template must be non-promotional and tied to a specific transaction/account OR essential to
  the user; Meta may approve a utility submission AS MARKETING (since Apr 2025) and re-categorise an approved one later (1 day's
  notice, `template_category_update` webhook — ⛔ handled in this repo). A reminder to verify a third party's death is an
  uncertain fit — hence `-303`'s *"if Meta refuses, the reminder does ⛔ not go"* and Row 33 (b).
- **Pricing:** per-message since 1 Jul 2025; utility outside the 24-hour service window is charged at the utility rate (India ≈
  ₹0.115); ONLY templates may be sent outside it — 6.31 sends only a template.
- **Per-user marketing cap:** failure 131049 — in this repo it REVOKES the opt-in (F13); a reason to accept UTILITY only.
- **UNVERIFIED (third-party guides, ⛔ Meta's page):** a variable may ⛔ not be the first or last token, and the fixed text must be
  long enough for the variable count (enforced at creation since 1 Oct 2025) — S1.
- Sources: developers.facebook.com WhatsApp template guidelines + pricing pages; ycloud.com, infobip.com, syniverse.com support notes.

### References

- `.decision-log.md`: `2026-10-10-303` (Q1 A, Consequence 3, "does NOT cover"), `2026-10-10-304` Q6 A, `2026-10-10-305` §2 items 2
  and 4 + §4, `2026-10-10-310` CF1 A / CF4 A, `2026-10-10-311` PM2, `2026-10-12-324`, `2026-10-17-344`, `2026-07-08-065`,
  `2026-09-28-263` FQ10 A.
- `_bmad-output/implementation-artifacts/6-27-peer-mesh-sending-replies-and-date-of-death.md` (PM5, PM6, PM7 (g), PM8, PM21, PM22,
  Trap 13, Trap 17) · `6-27c-peer-mesh-sending-texts-and-links.md` · `6-37-msg91-sms-gateway-adapter.md` ·
  `5-4-member-wa-opt-in-via-inbound-webhook-matching-webhook-ingress-primitive.md`.
- `_bmad-output/planning-artifacts/architecture.md` §3.4 (channel providers, WhatsApp dual gate, UTILITY scope), §3.11, §3.12, §1.8,
  §1.11 · `docs/adr/ADR-0028-*.md`, `docs/adr/ADR-0029-*.md` · `docs/launch-gate-inventory/inventory-roster.md` Rows 27, 28, 32.
- `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-10-10-6-27-asking-the-neighbours.md` (how the reminder was put) ·
  `trustee-panel-routing-note-2026-10-17-6-31-how-long-a-whatsapp-yes-lasts.md` (this story's note).

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

- Ultimate context engine analysis completed — comprehensive developer guide created (2026-10-17, `bmad-create-story 6.31`; four
  read-only research passes over the governance trail, the peer-mesh sender, the WhatsApp substrate and the planning records).

### File List

## Change Log

| Date | Version | Change |
|---|---|---|
| 2026-10-17 | 1.0 | Created via `bmad-create-story 6.31` at `dae96d9b`: F1–F17, WR1–WR16 PROPOSED, I1–I8, AC0–AC13, Tasks 0–6; the Panel note on how long a WhatsApp opt-in lasts WRITTEN (⛔ sent); the stale "District Admin" clause flagged (T1). |
| 2026-10-17 | 1.1 | Create-story validation (two fresh-context passes — code; governance + footguns): 7 HIGH / 18 MEDIUM / 16 LOW, all applied. WR10 rewritten as ordered rules over class AND `httpStatus` (a thrown fetch / timeout ⇒ `may_have_sent`; `FetchInit.signal` + `transport` field); due list = no row OR parked OR re-claimable; switch-OFF ⇒ ⛔ offered; one child per CLAIM; WR2 (iii) ⭐ (b) `!== 'submitted'` ((a) narrows `-303` ⇒ Panel's); WR5 bound acts only on existing rows (⛔ backfill), recorded as a delivery failure; WR2 (ix) recipient eligibility; WR3 relabelled (dual gate + a defensive conjunct); decrypt throw transient, name-fault and lapsed-lease outcomes; `readDeceasedName` / `resolveChannelSecret` exported; `lockClaimThenPing` copied; RLS + decrypt-fence specs; quotes re-sourced (CF1 A, `-065` phrases, PM7 (g)); the stale clause sourced to ledger `2026-10-10f`; F7 / F12 / F14 / F17 / I8 corrected; T13 rewritten, T15 added. The Panel note rewritten in plain words (⛔ glyph removed), its deciding fact corrected (the app TELLS the member their yes expired). |
| 2026-10-17 | 1.2 | Validation round 2 (fresh context): 3 HIGH / 9 MEDIUM / 8 LOW, all applied — AC3 now `!== 'submitted'`; WR10's outcome + `detail` grammar complete (`skipped_recipient_ineligible`, `name_none`); the lapsed-lease rule keyed on a new `send_started_at` in-flight marker (⛔ on `detail`); rows created only by a begin under the lock (⛔ a set-based park INSERT); rule 3 takes Meta's rate-limit codes on any non-zero status; `readDeceasedName` exported with narrowed deps + a label; `readPeerMeshRequestEligibility` for WR2 (ix); §0 records the three MATCH edges (WR5 as a delivery give-up per `-302` §0, WR6, WR2 (ix)); option A's wider change named; a fixed language-code map; the `6-37b` number collision recorded (T4, F17); the glyph register's emphasis rule; T1 quote, T13, T14/T15 order. The Panel note: ⛔ row number, option B's cost, the elided quote, an E4 line. |
| 2026-10-17 | 1.3 | Validation round 3 (fresh context, the round-2 edits): 4 HIGH / 6 MEDIUM / 5 LOW, all applied — AC2's lapsed legs keyed on `send_started_at` (⛔ `detail`); a rule-2 park clears the marker; begin re-checks `< + 72 h`; the marker write is a CAS with the lease margin and `timeoutMs` + margin < lease; `send_started_at`'s CHECKs / GRANT / trigger named; one ending at the bound (`skipped_late`); the set-based park function removed; `sweep:held` is a `claimed_by_job` marker; 502 / 504 ⇒ `may_have_sent`; `config:locale_unavailable`; `rate_limited` = HTTP 429; the 6.31 park cost vs 6.27c's P1 recorded; the `6-37b` branch's committed numbers ⇒ this creation's ledger `2026-10-17k`, 0167 / `-347` / Row 33 PROVISIONAL. |
| 2026-10-17 | 1.4 | Validation round 4 (the v1.3 edits): 1 HIGH / 2 MEDIUM / 7 LOW, all applied — the lease inequality corrected (`CORRECTION_SEND_TIMEOUT_MS` + finalise < the 2-min handoff margin, pinned by a test); the lapsed in-flight finisher runs first, regardless of switch and bound, and late marking skips in-flight rows; rule 1's `detail` values; `config:<gap>` alarm-only; the three re-claim grounds; `readDeceasedName`'s label sites; WR5's sweep-vs-begin bound; AC7 legs for 502 / 131009 / the marker; Task 4's scope-park and marker functions + specs. |
