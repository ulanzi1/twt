---
baseline_commit: 15acb570
---

<!--
PINNED: 15acb570 (`main`, 2026-10-19 — the validate pass REBASED the branch onto it; the story was authored at `dae96d9b`,
2026-10-17, which is an ancestor). Worktree `.claude/worktrees/6-31`, branch `story/6-31-peer-mesh-whatsapp-reminder-at-48-hours`.
Two facts, kept apart (footgun #24): the pin is an ancestor of HEAD (durable); the CODE claims were re-derived at 15acb570
(perishable). Between `dae96d9b` and `15acb570` Stories 6.37b and 6.37c shipped; of the files this story cites only
`claim-peer-mesh-requests.ts` (+2 lines, the `pm` CRQID), `claim-dlt-sms-send.ts`, `boot.ts`, `packages/queue/src/index.ts`
and `claim-correction-reminders.ts` moved, and AC12's frozen files did ⛔ not.
Re-check before Task 1: `git diff --name-only 15acb570..origin/main -- packages apps scripts docs/adr docs/launch-gate-inventory`.

STATUS: ready-for-dev (created 2026-10-17 via `bmad-create-story 6.31`; was `backlog`; validated v1.5 on 2026-10-19).

START CONDITION — MET at the pin: rows 6-27 (a), 6-27b, 6-27c, 6-27d, 6-30, 6-34, 6-36, 6-37, 6-37b, 6-37c are `done`. 6.31
reads 6.27c's send record and 6.27a's reply state; it changes ⛔ neither. Row 6-35 (language switch) is ⛔ not needed (WR14).
DOWNSTREAM: row 6-37d (`-355` decision 1: *"after 6.31 and 6-37c"*) REUSES this story's WR7–WR10 (the template-name key family,
the multi-value + timeout client, the ONE exposed cache, the exported secret resolver, the exported outcome classifier) — its
WS1 (a) starts its code only once row 6-31 is `done` on `main`. Change ⛔ those shapes after Task 0 without telling 6.37d.

NUMBERS (footguns #19 / #42(e)): this file names ⛔ migration number, decision id, roster row number or ledger letter that is
not yet TAKEN. At the pin `main` holds migrations to 0170, decisions to `-363`, roster Rows to 34, ledger `2026-10-19a`; branch
`story/6-37d-claim-contact-whatsapp-step` plans 0171 / `-364` / Row 35 / ledger `2026-10-19b`. Each is "the next free one" at
the moment of ITS commit — re-grep `main`, every branch and every worktree (T4). This story's roster row is named by its KEY,
`peer-mesh-wa-reminder-template-approved`; its migration by its SLUG, `peer-mesh-wa-reminders`.

§0 GATE (the Panel template, `trustee-panel-routing-note-TEMPLATE.md`): the reminder ITSELF is ratified (`-303` Q1 A, Consequence 3;
its language by `-310` CF1 A; its window by `-305` §2 item 4). Every build decision WR1–WR16 is the AUTHOR's. ONE question is the
Panel's and is routed (F14, Task 0.5): how long a member's "yes to WhatsApp from the Trust" lasts — the Trustee-ratified ADR-0029
(`-065`) built it as 24 hours; reading it longer would SUPERSEDE a ratified clause and is a consent basis. ⭐ It blocks ⛔ nothing:
6.31 builds on the ratified 24-hour reading (WR3) and one read changes if the Panel rules otherwise.
Places a decision would become the Panel's, each kept OUT: (1) a reminder to someone whose text was never ACCEPTED by the gateway
(WR2 (i) — it would be a FIRST message, widening `-303`; a text accepted and later REPORTED undelivered is ⛔ this case — F18,
WR2 (i)); (2) any wording but the ruled text (WR6 — if Meta refuses the words, the reminder does ⛔ not go in that language, S1); (3) a reminder
outside the answer window (WR2 (iv) — `-305` §2 item 4); (4) a second SMS (I2 — `-311` PM2); (5) reading "has ⛔ not answered"
as "has opened nothing" (WR2 (iii) option (a) — it narrows `-303`; ⛔ recommended). Three edges the author-commit records, each
with its basis — MATCH, ⛔ narrowing: WR5's lateness bound is a delivery give-up, the framing of `-302` §0 (a give-up narrows none of the ratified texts
because *"none of the three sets a delivery deadline"* — and `-303` Q1 A sets none either; `-302` superseded `-295` §2 RB3 as a
mechanism); WR6's "Meta files it as MARKETING ⇒ Meta refuses" applies
`-303`'s *"if Meta refuses"* under architecture §3.4's *"Meta UTILITY templates only"* (and F13 — a marketing cap revokes consent);
WR2 (ix)'s "still an eligible member" applies who the five ARE (`-310` CF4 A + `-311` PM1's filters — a neighbour who has since
died or left is ⛔ one of the five).
Four more edges (validate 2026-10-19; (i)–(iii) answered by BigDev in session, each recorded again at Task 0.2):
(i) "a text that went" = `send_outcome = 'accepted'`; a delivery report is ⛔ read (BigDev: *"(a) Send it"*) — MATCH: `-303` Q1 A
names *"those of the five who have ⛔ not answered"* with ⛔ delivery condition, `-347` DR13 records peer-mesh reports *"recorded
but not acted on"*, and `-351` 3 B confined the delivery ladder to the correction and certificate reminders; (ii) the reminder
carries the member's FULL name, ⛔ the text's short form (BigDev: *"(a) Full name always"*) — MATCH: `-362` narrows `-303`'s name
for the neighbours' TEXT only, and *"only when the full name does not fit"* — WhatsApp has ⛔ SMS name slot, so the full name
fits; (iii) a NOMINEE of the deceased is to be EXCLUDED FROM THE FIVE at selection — new row
`6-36d-exclude-nominees-from-the-five` (BigDev 2026-10-19, in session: *"Exclude at selection"*; a nominee has a stake in the
payout, so their answer is ⛔ an independent one — the same class as `-340` / `-341`'s exclusion of filers). 6.31 therefore adds
⛔ nominee check of its own: once that row ships a nominee is never pinged, so is never reminded and `-356` (*"drop WhatsApp only
notification for nominee"*) is never in play. ⚠ Until it ships, a nominee-member selected as one of the five would be texted
(6.27c) and, if opted in, reminded — recorded; ⛔ in production (`-356`'s own not-ratified reading (ii) says a member opt-in does
⛔ count by itself for a nominee, which is why the fix is at selection and ⛔ a reading here); (iv) WR15's annotations (a direct send outside `dispatch()`, three body values) are
the AUTHOR's: ⛔ property a person sees changes (the dual gate, UTILITY only, the opt-in origin all held), and the reminder is ⛔
the §3.4 claim-contact exception (`-357`) — it rides the member opt-in flow.

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
> `dispatch()` (whose WhatsApp→SMS fallback would send a second text) — and keeps its OWN once-ever record per ping.
>
> **Day-one output: none, by design of its gates.** At the pin 6.27c HOLDS every Pariwar's texts (`config:counsel_basis_pending`
> — the live questionnaire's two counsel-pending questions; Row 27), ⛔ Pariwar has WhatsApp provisioned (`pariwar_wa_config.enabled`
> defaults `false`, set only by an operator through the admin channel-config form), and the ratified 24-hour opt-in reaches almost
> nobody (F14). 6.31 is built so that the reminder goes the day all three lift — ⛔ a green suite proves it sends today.
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
| `2026-10-17-347` DR13 | *"Reports on certificate, suspicion-notice and peer-mesh rows are recorded but not acted on."* — a neighbour's text can be REPORTED undelivered (F18); 6.31 does ⛔ read it (§0 edge (i)) | author-commit |
| `2026-10-17-350` "What this ruling does NOT cover — put back to the Panel" (b) | *"how long that consent lasts is open (Story 6.31's routing note)"* — the TRANSCRIBER's list inside the ratified entry (⛔ ratified itself); the Panel was TOLD the question exists by the ladder follow-up note (sent; answered as `-351`), Q2: *"How long a WhatsApp "yes" lasts is itself a separate open question for you, from Story 6.31."* It has ⛔ ruled it | transcriber's scope text; the note: sent |
| `2026-10-18-355` decision 1 | *"A NEW row `6-37d-claim-contact-whatsapp-step` (`backlog`; after 6.31 and 6-37c) builds the WhatsApp step …"* — 6.37d builds ON 6.31's client (header DOWNSTREAM) | author-commit |
| `2026-10-18-356` | *"drop WhatsApp only notification for nominee."*; BigDev's scope: *"WhatsApp can be in future if nominee has opted to receive the notification …"*; its NOT-ratified reading (ii): a member nominee's existing member WhatsApp opt-in *"does not count by itself"* — ⇒ nominees leave the five at SELECTION (row 6-36d, §0 edge (iii)), ⛔ a reminder-side reading | ⭐ TRUSTEE-RATIFIED (ruling); scope BigDev's |
| `2026-10-18-357` (applied to architecture §3.4 "Claim-contact exception", ADR-0029 changelog) | *"Outside the member opt-in flow, WhatsApp may carry messages about a claim … to ONE person only: the **claimant** … The exception does not change any member's opt-in state and opens WhatsApp to no other surface"*; for the claimant *"withdrawing it, or STOP, ends WhatsApp contact for that claim"* — about ONE claim; it says ⛔ thing about a duration and its duration was ⛔ asked (⛔ a ruling on how long a member's yes lasts) — 6.31 is ⛔ under it (§0 edge (iv)) | ⭐ TRUSTEE-RATIFIED |
| `2026-10-18-362` | the neighbours' TEXT carries *"first name and the initial of the surname … only when the full name does not fit"* — SUPERSEDES `-311` PM3's "no text" reading; row 6-37e builds the fallback. The reminder carries the full name (§0 edge (ii), WR13) | ⭐ TRUSTEE-RATIFIED |
| Roster Row 27 note (3) | *"Row 6-31 … built, or its absence at go-live recorded as a decision."* | go-live gate — ⛔ never a merge fence |

⚠ **STALE LEDGER TEXT — do ⛔ not build it.** The sprint ledger entry `2026-10-10f` (which added this row) says *"⛔ no reminder once
the District Admin has decided (6.27 PM5 (iv))"* — WITHDRAWN by `-305` §2 item 4 (above); the gate is the ANSWER WINDOW. The same
entry says *"48 h after selection … so an answer still counts in FQ10's 72-hour tally"* — WR4 counts from the TEXT instead (F3); the
author-commit names that departure. (The row's own comment block does ⛔ not carry the clause; its annotation pointing to `-305` was
made at creation.)

## ⭐ THE INVARIANTS

- **I1 — Once ever per ping (per text sent).** At most ONE reminder row per ping (`UNIQUE (ping_id)`), claimed by a compare-and-set,
  and a finished row's delivery columns are frozen by a DB trigger. ⛔ No path re-sends after `accepted` or after an ambiguous
  failure. (A neighbour asked about two claims of one death has two pings — 6.27c is unique on `(selection_id, member_id)` — and
  so two texts and two reminders; recorded, as 6.27c records it for the text.)
  *Proof:* a two-connection race spec + a trigger spec + the may-have-sent leg (AC7).
- **I2 — ⛔ Never `dispatch()`, ⛔ never an SMS, ⛔ never an `Alert`.** The reminder imports ⛔ nothing from `dispatch.ts` /
  `cascade.ts`, constructs ⛔ no `AlertCategory`, and its deps type carries ⛔ SMS client at all. A failed WhatsApp send ends the
  reminder; ⛔ nothing falls back.
  *Proof:* AC8's symbol fence (incl. the SMS symbols) + a type-level absence of any SMS field on the reminder deps.
- **I3 — Only after a text that went.** ⛔ No reminder for a ping whose `send_outcome` is not `accepted` (`-311` PM2: ⛔ no day-one
  WhatsApp). "Went" = accepted by the gateway; a later delivery report (F18) is ⛔ read (§0 edge (i)). *Proof:* one leg per
  non-accepted outcome + one leg for an accepted ping REPORTED `undelivered` in `sms_send_deliveries` (it IS due).
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

## ⭐ FOUND FACTS (authored at dae96d9b, re-derived at 15acb570 — each re-run at Task 0.1)

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
  `claim-correction-reminders.ts:719` — push only; 6.37c's ladder RECORDS its WhatsApp step as skipped and sends ⛔ WhatsApp).
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
  `createWhatsappAppCache()` (`contribution-providers.ts:287`) and keeps it private; `ContributionProviderWiring` exposes the SMS
  clients (`smsAppClient` — added for 6.19b, *"never a second client"* — and `smsTemplateReader`, `smsPreflightReadsWithSendKey`)
  but ⛔ the WA cache. ⇒ WR9 exposes the ONE cache.
- **F11 — The Pariwar switch** is `pariwar_wa_config.enabled` (default `false`) + `phone_number_id`, `access_token_secret_name`,
  `graph_api_version` (all four in 0038; 0041 adds the webhook credential names), read by `channelConfig.getWaConfig`; its ONLY
  writer is `upsertWaConfig` (`channel-config/wa-config.ts`), reached from the admin channel-config form — ⛔ migration or seed
  enables any Pariwar. ⛔ No feature flag. ⇒ WR2 (v), WR9.
- **F12 — Delivery statuses already land for ANY wamid** in `whatsapp_send_status` (5.4's webhook worker). ⇒ WR11: store the wamid;
  ⛔ no new webhook work; 6.31 adds ⛔ no reaction to a status (but see F13 — 5.4's worker already reacts to some).
- **F13 — A capped marketing delivery revokes consent.** `WA_BLOCK_ERROR_CODES = {131050, 131049, 131026, 131047}`
  (`wa-webhook-processor.ts:110`): a failed status with one of them moves the opt-in to `BLOCKED_BY_META` and REVOKES the consent.
  131049 is Meta's marketing per-user cap. Two more in the set are ⛔ consent signals at all (Meta's error-codes page, read
  2026-10-19): 131026 (not on WhatsApp / Terms not accepted / an old app version) and 131047 (*"More than 24 hours have passed …
  Send a template message instead"* — the chat-window rule again, F14) ⇒ a reminder that fails 131026 revokes the neighbour's
  member opt-in (WR15 (2)). ⇒ WR6 / the roster row: UTILITY only; a template Meta files as MARKETING = "Meta refuses".

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
  ⭐ The 24 hours is Meta's CHAT window, ⛔ an opt-in life: the code names it so (`wa-webhook-processor.ts:40` *"The 24h Meta
  customer-service window"*; `whatsapp-errors.ts:31` *"UTILITY templates CAN be sent outside 24h"*), and Meta's Business Messaging
  Policy (whatsappbusiness.com/policy, updated 2026-09-23, read 2026-10-19) asks for *"opt-in permission from the recipient
  confirming that they wish to receive subsequent messages"* with ⛔ time limit, and *"You must respect all requests (either on or
  off WhatsApp) by a person to block, discontinue, or otherwise opt out"*. Only a PENDING→ACTIVE match sets the window; ⛔ later
  inbound message extends it.
  ⚠ **Withdrawal is per consent ROW, and rows accumulate.** Every activation mints a NEW `consent_records` row (a fresh
  `consentId`, `wa-webhook-processor.ts` activation path); expiry revokes ⛔ none; STOP and the API revoke revoke ONLY the current
  opt-in's `consentId`; `consent_records` has ⛔ unique index; `consentExists` is true on ANY unrevoked row. ⇒ a member who
  expired, opted in again and then sent STOP still has `consentExists('whatsapp_opt_in') = true`. Latent today (nothing reads
  `consentExists` alone for WhatsApp); under the Panel note's A or B it would message a member who withdrew — WR3, T2, WR15 (4).

**The plumbing**
- **F15 — Migrations** are hand-authored SQL with `--> statement-breakpoint` and a manual journal entry; at the pin the last is
  `0170_claim-contact-ladder-backstops` (journal idx 170, `when` 1794195600014). This story's migration takes the next free number
  and a journal `when` GREATER than the highest `when` on `main` AND on every branch (row 6-37d plans the same next number) — a
  `when` at or below an applied one makes the drizzle migrator SKIP it silently (deferred-work's *"cross-branch
  migration/decision-id/roster-row numbering race (6-37c vs. sibling story 6-31)"* item) (T4).
- **F16 — The DLT gate scans text, comments included.** `scripts/dlt-typed-variables/lib.ts` `REGISTRY_FILES`: `{#var#}`, `DLT_VAR`
  and `sms.dlt.template_id.` may appear ONLY in registry files; the gate scans `apps/*/src/**` ⇒ the new template file is IN scope.
  ⇒ the WA template file must ⛔ never copy the DLT text (T6).
- **F17 — Numbers.** ⚠ Record only (authoring, at `dae96d9b`): the story then planned 0167 / `-347` / Row 33 PROVISIONALLY; all
  three were taken by 6.37b, and Row 34 / 0168–0170 / `-348`…`-363` since. ⇒ the header's NUMBERS rule; S4 settles each at its
  commit; the story's creation took ledger `2026-10-17k` (kept; `main` skipped it).

**Since the pin of authoring (6.37b / 6.37c shipped, Panel sitting 2026-10-18)**
- **F18 — A neighbour's text can now be REPORTED undelivered.** 6.37b tags every peer-mesh text with a `pm` correlation
  (`claim-peer-mesh-requests.ts:699-700`) and its correlator records the carrier's report per ping in `sms_send_deliveries`
  (`send_kind 'pm'`, `send_row_id` = the ping id; `packages/domain/src/sms-delivery/reports.ts`); `-347` DR13: *"recorded but not
  acted on"*. ⇒ §0 edge (i): 6.31 reads `send_outcome` only and does ⛔ read `sms_send_deliveries`.
- **F19 — The name.** 6.27c's `readDeceasedName` (`claim-peer-mesh-requests.ts:476`) ends with the SMS slot check
  (`if (!fitsDltAlphanumeric(name)) return { fault: 'name_too_long' }`); `-362` replaces the text's "no text" reading with a short
  form, built by row 6-37e (backlog) as *"ONE fallback function for the four texts"*. ⇒ WR13: the reminder takes the name BEFORE
  that check; row 6-37e edits the same function — whichever lands second rebases.
- **F20 — Config keys with dots.** WR7's key reads through `resolveSmsDltConfig` (`contribution-providers.ts:119`) ⇒ GCP Secret
  Manager `projects/$GOOGLE_CLOUD_PROJECT/secrets/<name>/versions/latest` (`packages/domain/src/secrets.ts`), with a local env fallback (non-alphanumerics
  → `_`, upper-cased); `NOT_FOUND` ⇒ `null`, any other fault rethrown. deferred-work's *"Dotted Secret Manager names (UNVERIFIED)"*
  item: GCP secret ids allow only `[A-Za-z0-9_-]`, so a dotted name is `INVALID_ARGUMENT` — the helpline and DLT keys 6.27c already
  depends on share it. ⇒ WR7 keeps the house key shape and inherits that item; a non-`NOT_FOUND` read fault HOLDS the Pariwar.
- **F21 — The cross-tenant role guard.** 6.37b's correlator / silence check and 6.37c's ladder sweep call
  `smsDelivery.canReadAcrossPariwars(pool)` before a cross-Pariwar scan (an RLS-bound role would see ⛔ row and report "nothing
  due") and joined roster Row 26 (the jobs login grants) by dated notes; 6.27c's sweep joined Row 26 too. ⇒ WR12, Task 0.4.

## ⚖️ Build decisions WR1–WR16 (PROPOSED — answered by BigDev at Task 0.2; ⭐ = recommended)

> Each is the AUTHOR's (§0 above). The options state a cost. Answers are recorded verbatim at Task 0.2 and committed as ONE
> author-commit at Task 0.3, ⛔ before any code.

- **WR1 — The record.** ⭐ (a) A new table `claim_peer_mesh_wa_reminders` (migration `<next free>_peer-mesh-wa-reminders` — F15): `reminder_id uuid PK`, `ping_id`
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
  (i) the ping's `send_outcome = 'accepted'` (⛔ read of `sms_send_deliveries` — a text REPORTED undelivered is still due; §0
  edge (i), BigDev 2026-10-19 *"(a) Send it"*); (ii) `send_updated_at + 48 h ≤ clock_timestamp() < send_updated_at + 72 h` (WR4,
  WR5); (iii) "has ⛔ not answered" (below); (iv) the claim is in the answer window; (v) the Pariwar's `pariwar_wa_config.enabled`
  is ON — a switch-OFF Pariwar is ⛔ offered at all (⛔ row, ⛔ alarm); ON with an incomplete config ⇒ HOLD (⛔ enqueued, one alarm per Pariwar per tick); (vi)
  `isPeerMeshWaReminderOptedIn` (WR3); (vii) NO finished reminder row exists (none yet, a parked one, or a re-claimable one — WR10);
  (viii) inside 09:00–20:00 IST (import 6.27c's exported `isInPeerRequestSendWindow` / `nextPeerRequestSendWindowStart` — ⛔ a
  copy); (ix) the recipient is still an eligible member — `readPeerMeshRequestEligibility(db, { pariwarId, memberId, deceasedMemberId })`
  (exported, `peer-mesh-request.ts:170`; it wraps `peerMeshEligibleMemberSql` and is what 6.27c's begin uses) — any ineligible
  reason ⇒ `skipped_recipient_ineligible`.
  A begin that finds (iii) / (iv) / (vi) / (ix) false writes a FINISHED skip row (`skipped_answered` / `skipped_window_closed` /
  `skipped_not_opted_in` / `skipped_recipient_ineligible`) so the ping is ⛔ never re-evaluated. Recorded costs: a claim that
  later RE-ENTERS the answer window (an R9 routing, `-324`) keeps its `skipped_window_closed`; a neighbour who opts in after the
  48-hour begin keeps `skipped_not_opted_in` — both judged once.
  ⚠ On an EXISTING `attempting` row the begin's FIRST test is `send_started_at IS NOT NULL` ⇒ return "in flight" with ⛔ write and ⛔ re-check
  (a pg-boss retry or expiry re-run of the same job id passes the own-retry ground while the send it began is in flight; a skip
  write there would trip the `skipped_% ⇒ send_started_at IS NULL` CHECK on every retry). The lapsed-row finisher owns that row.
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
  transaction; with rows accumulating (F14) it is still only narrowing, because `isOptInActive` is false after a STOP). Cost:
  reaches almost nobody (F14). The Panel note asks whether the choice lasts
  until withdrawn; under option B this function's body changes PLUS the wording / withdrawal fixes the note names — and the
  withdrawal fix must revoke EVERY unrevoked `whatsapp_opt_in` consent row of the member, ⛔ only the current opt-in's (F14),
  with a leg "opt in, expire, opt in again, STOP ⇒ ⛔ reminder"; under A,
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
  for a bound reached, ⛔ `exhausted`; `claimed_by_job` and `parked_at` are cleared TOGETHER — the CHECK makes them a
  biconditional). The late marking runs REGARDLESS of the switch, the Pariwar's config hold AND the answer window (a parked row on
  a claim decided since must still finish — the due list requires the window, so ⛔ other path reaches it). The begin ALSO
  re-checks `clock_timestamp() < send_updated_at + 72 h` under the lock (a
  child deferred by quiet hours or a retry can start late) — else it writes `skipped_late` for a ping that WAS due when its child
  was enqueued. ⛔ Other row is written for a ping that was never due (⛔ backfill — a switch-OFF Pariwar's ping, or one never
  begun before `+ 72 h`, gets ⛔ row; an answered or non-opted-in neighbour reached by a begin gets its `skipped_*` row, WR2). It is a reminder, ⛔ not the request: a hold or
  outage longer than a day loses it — a DELIVERY failure (§0). (b) send any time within the answer window — cost: a reminder days
  late. ⛔ Never outside the answer window under either (I4).
- **WR6 — The words and the template.** ⭐ The Meta template body, per locale, is the ruled text with three body variables:
  `{{1}}` the member's name, `{{2}}` the link, `{{3}}` the helpline — ⛔ no header, ⛔ no footer, ⛔ no buttons, ⛔ no "TWT:"
  prefix (WhatsApp shows the Pariwar's business name; PM3's reading for the DLT header). Category **UTILITY**. Registered in ONE
  file `apps/jobs/src/scheduler/peer-mesh-wa-templates.ts` (`PEER_MESH_WA_REMINDER_BODY = { en, hi }`) with a lockstep test against
  the real `t('peer_mesh_sms.request', …, { namespace: 'claim' })` (I6). Meta files it as MARKETING, or rejects it ⇒ "Meta refuses"
  (`-303`): ⛔ no reminder; the text still goes. ⚠ S1: Meta's error-codes page lists 2388299 *"Leading or trailing parameters not
  allowed — Variables cannot be at the start or end of the template"* and 2388293 *"Parameters words ratio exceeds limit"* (read
  2026-10-19). The English body ENDS `… {{3}}.` (only a full stop after the variable — Meta does ⛔ say whether that counts as
  trailing); the Hindi ends `{{3}} पर कॉल करें।` and starts with a word — safe; ⛔ two variables are adjacent. If Meta refuses a
  locale's body, that locale's template is "Meta refuses" (`-303`): the roster row records it, a Pariwar on that locale HOLDS
  (`config:wa_template_missing:<locale>`), and the build goes on — ⛔ re-word it here (a wording change is the Panel's; the
  SMS analogue is `-349`). A URL inside a body variable is neither allowed nor forbidden by Meta's docs (their link pattern is a
  URL button) — observed at submission like the category. Meta's `language.code` must be the code the
  template was REGISTERED under: a fixed map `PEER_MESH_WA_REMINDER_LANGUAGE = { en: 'en', hi: 'hi' }` in the template file, and
  the roster row's leg (b) requires the templates be registered under EXACTLY those codes (⛔ `en_US`, ⛔ `en_IN` — separate codes).
- **WR7 — Where the approved template name lives.** ⭐ (a) a per-Pariwar config value from ONE exported key builder for a KEY
  FAMILY `wa.template.<purpose>.<locale>.<pariwarId>` (this story's purpose `peer_mesh.reminder`; row 6-37d adds
  `claim_contact.correction_reminder` / `…certificate_reminder` through the same builder), the `pariwarId` lower-cased as
  `claimCorrectionHelplineConfigKey` does, read through the SAME resolver the DLT template ids use (`resolveSmsDltConfig` → GCP
  Secret Manager + the local env fallback — F20, S3 settled), set by
  the operator ONLY after Meta approves the template as UTILITY in that Pariwar's WABA (the roster row's leg (b)); unset (`null`)
  ⇒ HOLD that Pariwar (`config:wa_template_missing:<locale>`); a read that THROWS (an outage, or `INVALID_ARGUMENT` on the dotted
  name — F20) ⇒ HOLD that Pariwar for this tick with ONE alarm (`config:wa_template_unreadable`), ⛔ a per-row transient (it would
  alarm per ping per tick). Cost: approval status is an operator attestation (as `pariwar_wa_templates.approval_status` already
  is — ⛔ no sync with Meta); the dotted-name item (F20) is inherited, ⛔ fixed here — the roster row's leg (b) proves the key
  resolves in production.
  (b) widen `pariwar_wa_templates` — ⛔ rejected (frozen `AlertCategory`, F8).
- **WR8 — Three values on the wire.** ⭐ ADDITIVE in `packages/channels/src/providers/whatsapp-app.ts`: `WhatsappTemplateMessage`
  becomes a union — the existing `{ bodyParam }` (unchanged, the dispatch provider keeps using it) OR `{ bodyParams: readonly
  string[] }` (1–3 values, each non-empty — row 6-37d sends two) — and `buildRequestBody` emits one `{type:'text', text}` per value
  in order; a value list outside 1–3 or an empty value throws a NEW `WhatsappTemplateParamError` BEFORE `fetch` (⛔ a
  `WhatsappSendError` — nothing was sent; WR10 rule 6); plus an optional per-send `timeoutMs` (AbortSignal) for the direct path
  (architecture §3.12); the FETCH catch sets `transport` on its `httpStatus` 0 error (`timeout` when the signal aborted, else
  `network`); the body-read catch stays UNCHANGED (a 2xx ⇒ no wamid ⇒ rule 1; a non-2xx keeps its status — WR10's closing ⚠).
  The 1–3 / non-empty validation applies to `bodyParams` only; `{ bodyParam }` passes through unchanged. Cost: a touched shared
  client — its existing tests must stay green UNCHANGED. ADR-0028 is ANNOTATED (Task 0.4), ⛔ never rewritten.
- **WR9 — One WA client.** ⭐ expose `whatsappAppCache` on `ContributionProviderWiring` (as `smsAppClient` was for 6.19b) and pass it
  into 6.31's deps from `boot.ts`; EXPORT `resolveChannelSecret` (module-private at `contribution-providers.ts:78`, fail-loud — it
  THROWS on not-found and on an outage alike) and call it in the pre-begin race guard: any throw ⇒ HOLD `config:wa_secret_unresolved`
  (ids only). ⛔ A second `createWhatsappAppCache()`. ⛔ The fixture provider as a fallback: an unconfigured WA client ⇒ HOLD (fail
  closed, 6.19b precedent). ⚠ `messagingFor` caches one client per Pariwar and IGNORES later config — a rotated token or phone
  number needs a jobs restart (recorded on the roster row's leg (a)).
- **WR10 — Outcomes.** `send_outcome` ∈ `attempting`, `accepted`, `rejected_recipient`, `no_target` (no sendable mobile, or a
  name fault), `error` (a send that MAY have reached Meta — `may_have_sent:*` only), `skipped_answered`, `skipped_window_closed`,
  `skipped_not_opted_in`, `skipped_recipient_ineligible`, `skipped_late`. The `detail` grammar (`PEER_MESH_WA_REMINDER_DETAIL_PATTERN`,
  Task 1.2) covers exactly (`sweep:held` is a `claimed_by_job` marker, ⛔ a `detail`; the `config:<gap>` codes of Task 5.2 appear
  ONLY in alarms — a held Pariwar writes ⛔ row): the transients `rate_limited:<code|none>` (an HTTP 429 or a Meta rate-limit
  code), `api_unavailable:<status>`, `decrypt_failed:tier1` and `hash_failed:tier1` (6.27c's spellings, `claim_peer_mesh_pings`'
  grammar); `may_have_sent:<network|timeout|no_wamid|lease_lapsed|gateway_502|gateway_504|unknown>`; the two park notes
  `scope:<token>` (a scope-wide refusal) and `held:<token>` (a refusal of unknown scope), `<token>` ∈ `[a-z0-9_]+` (the class, or
  `meta_<code>` / `http_<status>`); `no_target:no_sendable_number`; `no_target:name_<none|erased|unresolvable>` (⛔ `name_too_long`
  — §0 edge (ii), WR13).
  **ONE exported pure classifier** (⭐ for row 6-37d's reuse — the header's DOWNSTREAM): `classifyDirectWaSendFailure(err)` in a
  NEW `packages/channels/src/providers/whatsapp-direct-send-outcome.ts` (exported through the barrel), over `metaCode`,
  `httpStatus`, `transport` and the presence of a wamid, returning `{ kind: 'may_have_sent' | 'transient' | 'scope' |
  'unknown_scope' | 'recipient'; token }`. It decides ⛔ record shape: park-or-finish is the CALLER's (6.31 parks `scope` /
  `unknown_scope`; 6.37d's WS8 records its own way). It reads the Meta-code sets BEFORE `classifyWhatsappError`'s class and leaves
  `whatsapp-errors.ts` UNCHANGED (its 131048 / 133016 in `RATE_LIMIT_CODES` keep `dispatch()`'s behaviour — a LOW correction
  recorded in deferred-work, WR15 (5)). ⚠ `classifyWhatsappError`'s CLASS alone is ⛔ enough: it returns `api_unavailable` for
  BOTH a thrown fetch (`httpStatus` 0) and a 5xx, and `unknown` for a 401 / 403 without a code and for every Meta code outside
  its five sets (`whatsapp-errors.ts:40-52`). Meta's codes below are from its error-codes page (read 2026-10-19 — re-verify at
  S1). The rules, IN THIS ORDER:
  0. **Param** — `err instanceof WhatsappTemplateParamError` (WR8 — thrown BEFORE `fetch`, so nothing was sent) ⇒ `unknown_scope`
     / `held:param_invalid` (rule 6's park), tested FIRST. (A client-config throw — `assertClientConfig`'s plain `Error` from
     `messagingFor`, `whatsapp-app.ts:100-110` — never reaches the classifier: `messagingFor` is called inside the race guard,
     where any throw HOLDS the Pariwar `config:wa_config_incomplete`.)
  1. **`may_have_sent`** — `httpStatus === 0` (a thrown fetch — connect error, reset, the `timeoutMs` abort; by `transport`),
     `httpStatus === -1` (any other throw that is ⛔ a `WhatsappSendError` — the classifier cannot prove it preceded the send),
     or a 2xx without a wamid ⇒ `error` / `may_have_sent:<network|timeout|unknown|no_wamid>` — ⛔ never resent (Meta
     has ⛔ idempotency key; I1). Cost: a connect failure that never reached Meta also loses the reminder — the safe side of
     "once ever".
  2. **`httpStatus` 502 or 504** (a gateway that may have forwarded the request) ⇒ `error` / `may_have_sent:gateway_<status>`
     (I1; 6.37's may-have-sent precedent).
  3. **Transient** — a Meta code NOT named in rule 4 or rule 5, and: `httpStatus === 429` (with or without a code ⇒
     `rate_limited:<code|none>` — incl. code 4, the app request limit, and 133016, which a send should never return); a Meta
     rate-limit code 130429 / 131056 / 80007 on any status (`rate_limited:<code>`); any other 5xx (`api_unavailable:<status>`) ⇒
     retried under the 10-minute lease until WR5's bound, then `skipped_late`.
  4. **Scope-wide** (`scope:<token>`) — TESTED BEFORE rule 3's status test (Meta's error-codes page, 2026-10-19: 131048 arrives on
     a 429 and 131057 on a 503) — class `template_not_approved` (132xxx) or `auth`; `httpStatus` 401 or 403 WHATEVER the code;
     Meta 131048 (the number's quality restriction — Pariwar-wide, ⛔ a rate limit), 131031 (account locked), 131042 (payment),
     131045 (the SENDER number's registration error — ⛔ the recipient's), 131057 (maintenance), 133010 (number not registered),
     368 (policy block) ⇒ the row gets `detail =
     scope:<token>`, `claimed_by_job = 'sweep:held'`, `parked_at`, `send_started_at = NULL` (Meta answered with a refusal) — ⛔
     finished; an alarm names the Pariwar; the claim child ENDS its loop (WR12). ⚠ Unlike 6.27c's P1 (which FINISHES the
     current ping as `error`), 6.31 re-parks so a template approved later can still go; cost: an unapproved template is retried
     once per claim per hourly tick until `+ 72 h` — one alarm per claim per tick, ≤ 11 ticks — recorded.
  5. **Recipient** — 131026 (not on WhatsApp / Terms / an old app) and 131021 (recipient = sender) only ⇒ `rejected_recipient`
     (finished). (131045 is rule 4's; 131052 concerns inbound media and cannot arise for this send — if it does, rule 6.)
  6. **Unknown scope** (`held:<token>`) — everything else Meta answered (`httpStatus` ≥ 400): 131008 / 131009 (missing / invalid
     parameter — our values OR the recipient's number; BigDev 2026-10-19: *"Park, continue loop"*), 100, 131047 / the window
     class (cannot occur for a template), any code outside the sets above, and WR8's pre-fetch validation error
     (`WhatsappTemplateParamError` — nothing was sent) ⇒ the row is PARKED exactly as rule 4 (`held:<token>`), an alarm, and
     the claim child CONTINUES with its next ping. Cost: a Pariwar-wide fault of unknown scope costs one failed call per due
     ping per tick, and ONE ALARM PER PING PER TICK — up to 5 × 11 = 55 calls and 55 alarms per claim before `+ 72 h`; a
     one-recipient fault never starves the claim's other neighbours. ⛔ Row is
     ever FINISHED on a refusal whose scope is unknown — a once-ever reminder is ⛔ spent on a fault that may be the account's.
  Before the send: a mobile DECRYPT throw or a number-HASH throw ⇒ transient (`decrypt_failed:tier1` / `hash_failed:tier1`,
  6.27c's precedent — ⛔ a finished row on a KMS fault); ⛔ decryptable / normalisable mobile ⇒ `no_target:no_sendable_number`;
  a name read that returns a fault (`name_none` / `name_erased` / `name_unresolvable` — e.g. an erasure since the text) ⇒
  `no_target:name_<reason>` (finished); a name read that THROWS ⇒ transient (6.27c's `ClaimCorrectionTransientError`).
  **The in-flight marker (I1).** Immediately before the fetch the child sets `send_started_at = clock_timestamp()` in its OWN
  committed UPDATE, as a CAS: `WHERE send_outcome = 'attempting' AND claimed_by_job = $job AND send_started_at IS NULL AND
  claimed_at > clock_timestamp() − (CORRECTION_SEND_LEASE_MS − PEER_REQUEST_HANDOFF_LEASE_MARGIN_MS)`; ZERO rows ⇒ ⛔ send (the
  lease was lost). The child ALSO re-checks quiet hours at this point (`isInPeerRequestSendWindow` — a begin at 19:59 must ⛔ send
  at 20:01; 6.27c's MG16 (i), `claim-peer-mesh-requests.ts:701-704`): outside ⇒ ⛔ marker; the child defers to the next 09:00
  IST (6.27c's `deferToMorning`) and the begun row is re-claimed then (its lease has lapsed — the third re-claim ground). Because the
  CAS only promises that `PEER_REQUEST_HANDOFF_LEASE_MARGIN_MS` (2 min) of lease REMAINS, the send's whole tail must fit inside
  that margin: `timeoutMs` (⭐ `CORRECTION_SEND_TIMEOUT_MS`, the SMS core's 10 s, `claim-dlt-sms-send.ts:53`) + the finalise,
  itself BOUNDED (`SET LOCAL lock_timeout` and `statement_timeout` inside its transaction, their sum counted) <
  `PEER_REQUEST_HANDOFF_LEASE_MARGIN_MS` — a test pins the inequality over all three constants — so a live send can ⛔ never be
  finished `lease_lapsed` under it. A finalise that FAILS after an `accepted` send alarms with the ids AND the wamid before it
  rethrows (pg-boss 12 only calls `fail()` on a throw and logs ⛔ thing — footgun #49(c)); the row is later finished
  `may_have_sent:lease_lapsed` and the alarm is the only record of the wamid. The marker is cleared to NULL only by a rule-4 /
  rule-6 park or a rule-3 / pre-send transient (Meta answered with a refusal, or the send never began). The re-claim CAS requires
  `send_started_at IS NULL` AND one of 6.27c's three re-claim grounds (`peer-mesh-request.ts:373-375`): the job's OWN retry, a
  parked row, or a lapsed lease — so a child that died between the begin COMMIT and the marker (it never reached Meta) is
  re-claimable; a lapsed `attempting` row with `send_started_at IS NOT NULL` died mid-flight ⇒ finished `error` /
  `may_have_sent:lease_lapsed` by the sweep — ⛔ ever re-claimed or parked. (⛔ a rule keyed on `detail`: 6.27c's re-claim keeps
  the previous `detail` — `-302` RN6 — so a stale transient note would make a mid-flight death look re-claimable.) ⚠ A timeout
  DURING the body read is caught by the client (`whatsapp-app.ts:184-188`): a 2xx becomes "no wamid" (rule 1) and a non-2xx
  keeps its status class — still safe.
- **WR11 — ⛔ No events; the wamid is the trail.** Like 6.27c (AC5b) the reminder emits ⛔ no event; `provider_message_id` holds the
  wamid; delivery statuses join `whatsapp_send_status` read-only. 6.31 builds ⛔ no reaction to a status (⛔ no fallback, I2).
  ⚠ RECORDED, ⛔ built here: 5.4's existing webhook worker (`wa-webhook-processor.ts:356-368`) moves a recipient's opt-in to
  `BLOCKED_BY_META` and revokes the consent on a failed status carrying 131050 / 131049 / 131026 / 131047 for ANY wamid — a
  reminder's included (F13). That is the existing opt-in rule acting, ⛔ a 6.31 effect to suppress.
- **WR12 — The sweep.** ⭐ queues `claim.peer_mesh_wa_reminder.sweep` + `claim.peer_mesh_wa_reminder.send` (added to
  `packages/queue/src/index.ts`; its duplicate-value test covers them), cron `20 9-19 * * *` tz `Asia/Kolkata` (09:20 … 19:20 —
  inside the send window; a daily sweep would delay a 48-hour reminder up to a day). The parent lists due pings set-based
  (cross-tenant BYPASSRLS pool, the "DELIBERATE" block shape of `listDuePeerMeshRequestClaims`, its `.limit()` through `clampLimit`
  — the domain-invariants gate), AFTER the role guard `smsDelivery.canReadAcrossPariwars(pool)` (6.37b / 6.37c's precedent, F21 —
  false ⇒ ONE alarm and the tick ends; ⛔ "nothing due"), FIRST finishes lapsed in-flight rows
  (`finishLapsedInFlightPeerMeshWaReminders` — regardless of the switch, the window and the 72 h bound, so ⛔ such row is stranded),
  THEN marks the late ones (`markLatePeerMeshWaReminders` — REGARDLESS of the switch, a config hold and the answer window, so a row
  parked before a Pariwar is switched OFF or its claim decided still finishes; it skips in-flight rows), checks each Pariwar's
  config gaps once (a held Pariwar: ⛔ enqueued, one alarm) and enqueues **one child per CLAIM** (6.27c's shape —
  `runPeerMeshRequestChild` loops its pings; a rule-4 scope-wide fault returns the CURRENT row to `sweep:held` and ends the loop —
  the claim's other pings simply stay un-begun; a rule-6 park continues the loop). Other claims' children already queued for the
  same Pariwar each make at most ONE failing call on a scope fault — recorded, ⛔ prevented. Run limits sized for an HOURLY cron:
  mirror 6.25's sub-interval constants (`STAFF_EMAIL_SWEEP_BUDGET_MS` / `STAFF_EMAIL_SWEEP_EXPIRE_SECONDS`, 10 min / 14 min), scaled
  so a tick ends well inside 60 min — ⛔ 6.27c's 45-min budget / 90-min expiry (built for a daily cron; a slow tick would overlap
  the next) — and an EXPLICIT `expireInSeconds` on the child queue (pg-boss's default expiry re-runs a slow child under the SAME
  job id — deferred-work's 6.27c item *"The child queue runs on pg-boss's default 900 s expiry"*; the begin's in-flight test, WR2, is what makes that re-run harmless).
  Registered by `registerClaimPeerMeshWaReminderWorkers(boss, deps)` in `apps/jobs/src/scheduler/claim-peer-mesh-wa-reminders.ts`,
  wired in `boot.ts` next to 6.27c's.
- **WR13 — The values.** `{{1}}` = the member's FULL member-facing name (§0 edge (ii), BigDev 2026-10-19 *"(a) Full name
  always"*) — 6.27c's name read MINUS its SMS slot check. `readDeceasedName` (`claim-peer-mesh-requests.ts:476`, module-private;
  it takes `ClaimPeerMeshRequestDeps`, hard-codes `claim-peer-mesh-request` in its alarm text, and ENDS with
  `if (!fitsDltAlphanumeric(name)) return { fault: 'name_too_long' }` — F19): ⭐ SPLIT it — an EXPORTED
  `readMemberFacingDeceasedName(deps, pariwarId, deceasedMemberId, tag, label)` holding everything up to and including the
  `name_unresolvable` test, with deps NARROWED to `{ pool, encryption, onAlarm }` and an alarm-LABEL parameter (used in its two
  alarm strings and its two `ClaimCorrectionTransientError` messages; `alarmOf` at `:100` builds ⛔ text — only its parameter
  narrows to `Pick<…, 'onAlarm'>`); and 6.27c's `readDeceasedName` becomes that call (its current label) + the unchanged
  `fitsDltAlphanumeric` step — ⛔ a behaviour change for the text (its spec stays green UNCHANGED). The reminder calls the
  exported read and applies ⛔ SMS fit check. ⚠ Row 6-37e (`-362`'s fallback) edits that SAME fit step — whichever lands second
  rebases onto the other; the split puts 6-37e's change in 6.27c's wrapper, ⛔ in the reminder's path. ⛔ A second name read;
  `{{2}}` =
  `buildAppLinkUrl(resolveAppLinksOrigin(APP_LINKS_BASE_URL), 'peerRequest', ping.link_code)` (an invalid base URL ⇒ HOLD,
  `config:app_links_base_url_invalid` — ⛔ 6.27c's exported `appLinksConfigGap`, whose `config:app_link_too_long` arm is the DLT
  `{link}` slot's, `fitsDltUrl`); `{{3}}` = the Pariwar's helpline (`claimCorrectionHelplineConfigKey`,
  `claim-correction-sms-templates.ts:109`; 6.27c's use `claim-peer-mesh-requests.ts:232`) — unset ⇒ HOLD
  `config:helpline_number_missing` (6.27c's name). Also mirror 6.27c's questionnaire gaps (`config:questionnaire_unavailable`,
  `config:counsel_basis_pending` — `pariwarConfig`, `claim-peer-mesh-requests.ts:211-213`): the reminder carries the same link to the
  same questions, so a Pariwar whose text would HOLD holds its reminder too. The recipient: the member's CURRENT mobile
  (`getMemberMobileCiphertext` → `decryptMobile` → `normalizeMobile`, which returns `+91XXXXXXXXXX`) with the `+` stripped (Meta's
  `to`); `recipient_number_hash` via `claim.correctionNumberHash` as 6.27c does. ⚠ Every KMS / Secret Manager read (name, mobile,
  token, template key, helpline) happens OUTSIDE the row locks (T15).
- **WR14 — The language.** ⭐ `resolvePeerRequestLocale` — THE one read (Pariwar default today; row 6-35 changes it in one place) —
  recorded as `locale` + `locale_source`. ⛔ The ping's `locale_source` copied (the language may differ by then only when row 6-35
  ships; reading again is the ruled rule — `-310` CF1 A).
- **WR15 — The records (Task 0.4).** `epics.md` entry; the NEW roster row `peer-mesh-wa-reminder-template-approved` (WR16 — the
  next free row number); a dated note on roster Row 26 (`jobs-db-role`): the reminder sweep and `claim_peer_mesh_wa_reminders`
  join its list (F21); ANNOTATIONS (⛔ rewrites), each a DATED NOTE placed AFTER the 2026-10-18 `-357` amendment and ⛔ a new
  bullet in a ratified list, on architecture §3.4 (a direct WhatsApp path outside `dispatch()` that rides the MEMBER opt-in dual
  gate — ⛔ the claim-contact exception; a message outside the UTILITY list's examples; three body values), ADR-0028 (multi-value
  for this path), ADR-0029 (the reminder reads the dual gate as ratified; the Panel note pending; the 2026-10-18 amendment changes
  ⛔ member opt-in); the sprint row → `in-progress` (its annotation on the stale ledger-`2026-10-10f` clause was ⭐ DONE at
  creation); `anonymize.ts` gains a "nothing to scrub" line for the new table in the BF32 shape (it holds ⛔ name, ⛔ mobile, ⛔
  link — ids, the number hash and the wamid only); `deferred-work.md` items: (1) the 24-hour opt-in reach of `dispatch()`'s WA rung
  and the un-withdrawable EXPIRED consent (F14); (2) `WA_BLOCK_ERROR_CODES` revoking consent on signals that are ⛔ consent —
  131049 (a marketing cap), 131026 (an app / Terms state), 131047 (the chat window) (F13); (3) ⛔ no `template_category_update`
  webhook handling; (4) withdrawal revokes only the CURRENT consent row while every re-opt-in mints another (F14) — latent; the
  Panel note's A / B fix must revoke all; (5) `whatsapp-errors.ts` files 131048 (a number quality restriction) and 133016 (never a
  send response) as rate limits — `dispatch()`'s classification, ⛔ fixed here (WR10's classifier reads them first).
- **WR16 — Roster row `peer-mesh-wa-reminder-template-approved`** (the next free row number; Rows 29–34's eleven fields): **(a)**
  each live Pariwar's WABA provisioned (`pariwar_wa_config` complete, switch on); **(b)** the en + hi templates approved by Meta
  **as UTILITY**, the names set under WR7's keys AND each key proven to RESOLVE in production (the dotted-name item, F20), each
  with the exact registered language code — a locale Meta refuses is recorded as "Meta refuses" for that locale (S1), ⛔ re-worded;
  **(c)** the Hindi body human-reviewed (Row 28's control); **(d)** counsel's view recorded on Meta as a processor of
  the deceased member's name and the neighbour's number (Row 27 (a) names only the DLT text); **(e)** an owner for the HOLD /
  `may_have_sent` alarms — ⭐ tied to Row 32 (h), the leg under which alarms stop reaching the LOGS only (`-354` decision 4; the
  Panel was told, `-360` "Item 5 of the pack"), ⛔ a second alarm route; **(f)** a re-check procedure for Meta re-categorising an approved template (no webhook handles it — WR15
  (3)); **(g)** the Panel's ruling on Task 0.5's note recorded, or its absence at go-live recorded as a decision; and row 6-36d
  (nominees out of the five) `done`, or its absence recorded as a decision. ⛔ Never a merge fence.

## Acceptance Criteria

**AC0 — Governance before code (Task 0).** S1–S4 settled or their STOP raised; WR1–WR16 answered by BigDev and committed ALONE as
one author-commit (the next free decision id — header NUMBERS) naming what it adds to `-311` (PM7 (g) / Trap 17 realised), what
it annotates (ADR-0028, ADR-0029 — ⛔ superseding either), and the §0 block's MATCH edges incl. (i)–(iv); then, in one records
commit: the `epics.md` entry, the roster row `peer-mesh-wa-reminder-template-approved`, the Row 26 dated note, the Row 27 note (3) pointer, the architecture
§3.4 / ADR annotations (the sprint-row annotation was made at creation), the `deferred-work.md` items (1)–(5) (WR15), the ledger
line — all BEFORE any code. The Panel note (Task 0.5) is WRITTEN at creation and ⛔ yet sent; it blocks ⛔ nothing.

**AC1 — The record (WR1).** Migration `<next free>_peer-mesh-wa-reminders.sql` (hand-authored; its journal idx the next free and
its `when` greater than the highest on `main` and every branch — F15) creates
`claim_peer_mesh_wa_reminders` with `UNIQUE (ping_id)`, the FK to the ping, RLS by `pariwar_id`, the column GRANTs, the CHECKs and
the finished-row guard trigger; the Drizzle schema file `packages/domain/src/schema/claim_peer_mesh_wa_reminders.ts` matches it;
applied on :5432 AND :5433 ([[project_live_db_test_gotchas]]). A spec proves: a second row for one ping is refused (23505); a
finished row's delivery columns cannot change (the trigger); `twt_app` cannot UPDATE a non-delivery column; a `detail` outside the
grammar is refused; and `anonymize.ts` carries the "nothing to scrub" line for the new table (WR15). ⛔ No column is added to `claim_peer_mesh_pings`, ⛔ no 0156 / 0166 object changes.

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
a parked row past `+ 72 h` (`skipped_late`); a parked row past `+ 72 h` on a claim DECIDED since (`skipped_late` — the late
marking ignores the window, WR5); an accepted ping past `+ 72 h` with ⛔ no row (⛔ row written); an accepted ping 48 h old whose
text is REPORTED `undelivered` in `sms_send_deliveries` (listed — I3, §0 edge (i)); the role guard false (ONE alarm, ⛔ listed,
⛔ row — WR12). ⚠ Time legs set `send_updated_at` relative to the DB clock in a SEPARATE committed transaction
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
recorder — ⛔ a throwing stub). A two-connection race on one ping ⇒ exactly ONE send. An EXISTING row with `send_started_at` set,
reached by the same job id's re-run while the neighbour has since SUBMITTED ⇒ "in flight": ⛔ write, ⛔ re-check, ⛔ 23514
(WR2). A begin at 19:59 whose marker step falls after 20:00 ⇒ ⛔ marker, ZERO sends, deferred to 09:00 (WR10's marker paragraph).

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
render WITHOUT its SMS fit check (a leg: a name that fails `fitsDltAlphanumeric` is sent IN FULL — §0 edge (ii), WR13), `buildAppLinkUrl(origin, 'peerRequest', link_code)`, the Pariwar's helpline — with the template name read from WR7's key for
`resolvePeerRequestLocale`'s locale, and `language.code` = `PEER_MESH_WA_REMINDER_LANGUAGE[locale]` (asserted). ⛔ No `{#var#}`, `DLT_VAR` or `sms.dlt.template_id.` string
appears in any new file (the `dlt-typed-variables` gate stays green — F16).

**AC6 — Three values on the wire (WR8).** `packages/channels` unit tests: a `{ bodyParams: [a, b, c] }` message builds
`components: [{ type: 'body', parameters: [ {type:'text',text:a}, {…b}, {…c} ] }]`; an empty value, zero values or more than three
throws `WhatsappTemplateParamError` before `fetch` (a zero-call fetch recorder); `FetchInit` gains an optional `signal?: AbortSignal`
(exported, additive) and `timeoutMs` aborts a hung fetch, which
rejects with a `WhatsappSendError` with `httpStatus` 0 and a new OPTIONAL field `transport: 'timeout' | 'network'` set at the fetch catch (6.37's precedent:
`sms-app.ts`'s `signal` and its `readBody` timeout / body_read split) — WR10 rule 1 ⇒ `may_have_sent`; the existing `{ bodyParam }`
tests (`whatsapp-business.test.ts`, `provider-composition.test.ts`, `apps/api/tests/unit/whatsapp-composition.test.ts`,
`contribution-provider-resolver.test.ts`) and the existing `{ metaCode: null, httpStatus: 0 }` transport assertion pass UNCHANGED.

**AC7 — Outcomes (WR10, I1).** `classifyDirectWaSendFailure` has pure unit legs in `packages/channels` for every rule and code
named in WR10 (incl. a 429 with 131048 ⇒ `scope`, a 503 with 131057 ⇒ `scope`, a 400 with 131045 ⇒ `scope`, a 429 with 4 ⇒
`rate_limited:4`, `httpStatus` -1 ⇒ `may_have_sent`, a `WhatsappTemplateParamError` ⇒ `unknown_scope` / `param_invalid`, a 401
and a 403 with ⛔ code ⇒ `scope`, code 100 ⇒ `unknown_scope`). Injected-fetch legs in jobs (⛔ network), one per WR10 rule: 200 + wamid ⇒
`accepted`, `provider_message_id` = the wamid, `send_updated_at` set; (1) a thrown fetch (network, and the `timeoutMs` abort), a
non-`WhatsappSendError` throw, and a 2xx with ⛔ wamid ⇒ `error` / `may_have_sent:…` and a re-run sends ⛔ nothing; (2) a 502 and
a 504 ⇒ `may_have_sent:gateway_<status>`, ⛔ resent; (3) a 429 WITHOUT a Meta code, a 429 WITH 130429, a 400 with 131056, and a
503 ⇒ transient, retried, then `skipped_late` at WR5's bound; (4) `template_not_approved`, `auth`, a code-less 401, and a 429 with 131048 ⇒
the row back to `sweep:held` with `scope:<token>` (⛔ finished), an alarm, and the claim child's loop ENDS (the claim's second
due ping is ⛔ attempted — a two-ping fixture); (5) `recipient_blocked` (131026) ⇒ `rejected_recipient`; (6) 131009, 131008, a
400 with an unrecognised code, and a `WhatsappTemplateParamError` ⇒ parked `held:<token>` (⛔ finished), an alarm, and the claim
child's loop CONTINUES (the second due ping IS attempted — the same two-ping fixture); no sendable mobile ⇒
`no_target:no_sendable_number`; a decrypt throw and a hash throw ⇒ transient (`decrypt_failed:tier1` / `hash_failed:tier1`, ⛔
finished); an erased name ⇒ `no_target:name_erased`; SEPARATELY (the in-flight marker): a marker CAS whose lease is lost ⇒ ZERO
sends; a lapsed row with the marker set, past `+ 72 h` in a switch-OFF Pariwar ⇒ finished `may_have_sent:lease_lapsed` (⛔
stranded); a late marking over a Pariwar with a live in-flight row ⇒ the in-flight row is ⛔ touched and the sweep does ⛔ abort;
a finalise that throws after a 200 ⇒ ONE alarm carrying the ids and the wamid (and ⛔ name, mobile or link), then the rethrow;
the inequality test (`CORRECTION_SEND_TIMEOUT_MS` + the finalise's bounds < `PEER_REQUEST_HANDOFF_LEASE_MARGIN_MS`). ⛔ SMS can
be sent on any leg because the reminder's deps type carries ⛔ SMS client (I2, AC8) — a compile-time property, ⛔ a recorder.

**AC8 — ⛔ Never `dispatch()` (I2).** A source fence BY SYMBOL NAME (every export comes through the `@twt/channels` barrel, so a
path fence cannot tell modules apart), comments stripped: `claim-peer-mesh-wa-reminders.ts` and `claim/peer-mesh-wa-reminder.ts`
name ⛔ `dispatch`, `runChannelCascade`, `resolveWhatsappProviderDeps`, `createContributionProviderResolver`,
`resolveApprovedTemplate`, `AlertCategory`, `pariwar_wa_templates`, `sendClaimDltSms`, `smsAppClient`, `SmsAppClient`,
`PEER_MESH_REQUEST_SMS_TEMPLATES` or `renderPeerMeshRequest`; and the reminder's deps type has ⛔ field whose type is an SMS
client (a `expectTypeOf` leg).

**AC9 — One client (WR9).** `ContributionProviderWiring` exposes `whatsappAppCache`; `resolveChannelSecret` is exported; `boot.ts`
passes the cache to `registerClaimPeerMeshWaReminderWorkers`; `grep -rn "createWhatsappAppCache(" apps/jobs/src` finds exactly ONE
call. A switch-ON Pariwar with an incomplete config (blank secret name, blank `phone_number_id`, a secret that throws, a missing
template-name key for its locale, a template-name read that THROWS, an invalid `APP_LINKS_BASE_URL`, a missing helpline, an
unavailable questionnaire, a counsel-pending basis or a missing locale) ⇒ HOLD with the matching `config:<gap>` of Task 5.2 — ONE leg per gap — (ids only) — ⛔ enqueued, ⛔ row written, ONE alarm per
Pariwar per tick, ⛔ a fixture send. A
switch-OFF Pariwar ⇒ AC2 (⛔ offered).

**AC10 — The sweep (WR12).** Queues registered in `packages/queue/src/index.ts`; cron `20 9-19 * * *` `Asia/Kolkata`; one child per
claim; a held Pariwar's pings ⛔ enqueued (one alarm) and due again once the gap closes, inside `< + 72 h`; a row returned to
`sweep:held` by a rule-4 or rule-6 park listed again, subject to WR5's bound; run limits
sized for an hourly tick (WR12). A live suite `apps/jobs/tests/claim-peer-mesh-wa-reminders-live.test.ts` drives the sweep end to end
over a fixture MIRRORING 6.27c's live suite's `world()` (that helper is local to its file — copy its shape, seed via
`_claim-correction-seed.ts`'s `onOwnTx`, clean by `pariwar_id`).

**AC11 — Ids only; nothing else moves (I7, I8).** An alarm/log capture over the whole live suite contains ⛔ none of the fixture's
member name, mobile, link code or link. A run writes ⛔ no `events_log` row (count before/after), ⛔ no claim state, ⛔ no ping
column, ⛔ no selection `outcome`.

**AC12 — Frozen files.** `git diff --stat 15acb570 -- packages/channels/src/dispatch.ts packages/channels/src/cascade.ts
packages/channels/src/providers/whatsapp-errors.ts
packages/contracts/src/alerts packages/domain/migrations/0038_pariwar-wa-config.sql packages/domain/migrations/0156*
packages/domain/migrations/0166* packages/domain/src/claim/peer-mesh-request.ts packages/domain/src/claim/peer-mesh-reply.ts
packages/domain/src/claim/answer-window.ts apps/jobs/src/scheduler/contribution-notify.ts apps/jobs/src/wa-webhook-processor.ts` is
EMPTY — except (b): ONLY if Task 0.5's in-story path is taken (the Panel ruled before Task 1), the withdrawal fix's edits to
`wa-webhook-processor.ts`, each listed in the File List. (The two exports 6.31 adds — `readMemberFacingDeceasedName` split out of
`readDeceasedName` in `claim-peer-mesh-requests.ts` (deps narrowed + a label parameter; 6.27c's wrapper keeps the fit check, its
behaviour and its spec unchanged), `resolveChannelSecret` in `contribution-providers.ts` — are in files ⛔ on this list; each is listed in the File List with its reason.)

**AC13 — The proof.** `DATABASE_URL='postgresql://twt_dev_app:devpass@127.0.0.1:5433/twt_dev?sslmode=disable' pnpm ci:local` green
(every static gate incl. `dlt-typed-variables`, `channels-determinism`, `pii-scrape`, `schema-diff`, `db-check`; the integration
tests), ⛔ no network call in any test. New tests are each shown RED on the unfixed code (Debug Log).

## Tasks / Subtasks

- [ ] **Task 0 — governance FIRST (AC0). ⛔ No code.**
  - [ ] 0.1 `git fetch origin`; re-run the Re-check diff (header); re-grep F1–F21 and record the results in Debug Log (a). Settle:
    - **S1** — Meta's current template rules (its error-codes page listed 2388299 *"Variables cannot be at the start or end of
      the template"* and 2388293 on the variable-to-word ratio on 2026-10-19 — WR6) and WR10's Meta codes: re-read Meta's own
      pages and record the date. Whether `… {{3}}.` counts as trailing is answered only by Meta at submission: a refused
      locale is "Meta refuses" for that locale (`-303`; the roster row's leg (b)) — re-word NOTHING, ⛔ a STOP for the build (a
      wording change is the Panel's — the §0 header; `-349` is the SMS analogue).
    - **S2** — the format `normalizeMobile` returns (`packages/domain/src/encryption/member-fields.ts:92`) and the exact transform to
      Meta's `to` (E.164 without `+`); record it.
    - **S3** — SETTLED at validate (F20): `resolveSmsDltConfig` reads GCP Secret Manager with a local env fallback; WR7's key
      family is readable through it and inherits the dotted-name item. Re-check only that nothing changed.
    - **S4** — `git branch -a` + every worktree (⚠ row 6-37d's branch plans the same next migration, decision id, roster row and
      ledger letter): take the next free of each at the moment of ITS commit, and a journal `when` above every branch's
      ([[feedback_concurrent_review_agents_mutate_tree]]; F15). Re-grep again right before each commit.
  - [ ] 0.2 Put WR1–WR16 to BigDev, each with its ⭐ recommendation and cost (WR2 (iii), WR4, WR5, WR7 have real alternatives).
    Record the answers verbatim in Debug Log (b).
  - [ ] 0.3 Write the author-commit (`.decision-log.md`, prepended; the `-345` / `-346` entry shape: Decision type / Status / Author /
    Ratifying trustees: ⛔ None / §0 gate / Occasion / FOUND / The decisions / Consequences / References). It REALISES `-311` PM7 (g)
    + Trap 17 and ANNOTATES ADR-0028 / ADR-0029 — it supersedes ⛔ nothing. Stage in the scratchpad; try the insert
    ([[project_decision_log_writes_user_inserted]]); commit ALONE on the story branch; write its SHA here AFTER the commit
    ([[feedback_governance_commits_precede_implementation]]).
  - [ ] 0.4 The records, ONE commit after 0.3 (WR15, WR16): `epics.md` `### Story 6.31: … \`[SURFACE]\`` placed after the LAST
    Epic 6 entry, before the `---` that precedes `## Epic 7` (the 6.30 / 6.34 blockquote shape — *"⛔ Never a merge fence"*); the
    roster row `peer-mesh-wa-reminder-template-approved` (the next free number; Row 34's block format, eleven fields, (a)–(g)) + a
    dated pointer on Row 27 note (3) (⛔ a word of Row 27 rewritten) + a dated note on Row 26 (F21); ANNOTATIONS on
    architecture §3.4, ADR-0028, ADR-0029 (+ the ADR index if it carries annotations); the sprint row `6-31-…` → `in-progress`
    (its annotation pointing the stale ledger-`2026-10-10f` clause to `-305` §2 item 4 was ⭐ DONE at creation — ⛔ repeat it);
    `deferred-work.md` items (1)–(5); the ledger line (the next free letter of the commit's day — re-check every branch) ([[project_sprint_status_safe_prepend]] — guard the size, verify
    the YAML).
  - [ ] 0.5 The Panel note `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-10-17-6-31-how-long-a-whatsapp-yes-lasts.md`
    exists (written at creation, from the TEMPLATE; revised at validate 2026-10-19 — ⛔ yet sent). Re-run its E4 commands; BigDev
    decides whether and when to send it (it may go with any sitting; the ladder follow-up note — sent, answered as `-351` — already told the Panel the question exists). Record it
    as "shown to the Panel" ONLY once it has gone ([[feedback_shown_to_panel_means_sent]]). ⭐ Nothing waits on it: Task 1 builds WR3
    as ratified. If the Panel rules BEFORE Task 1 starts, apply the ruling's read + withdrawal fix inside 6.31 (re-open AC4; the
    fix touches `wa-webhook-processor.ts` STOP handling (revoking EVERY unrevoked `whatsapp_opt_in` consent row — F14), the API
    revoke handler and the app's expired-state screen — AC12's carve-out (b); ⚠ row 6-37d's claim-contact STOP work edits the
    same STOP path — sequence with it); after, it is a new row.
- [ ] **Task 1 — the record (AC1, WR1).**
  - [ ] 1.1 Hand-write `<next free>_peer-mesh-wa-reminders.sql` (header: the pre-apply CHECK queries, the GRANT list, why a separate
    table — F1); its journal entry (the next idx; `when` > the highest `when` on `main` AND on every branch — F15); ⛔ `db:generate`
    (the snapshot is frozen). `packages/domain/src/member/anonymize.ts` gains the "nothing to scrub" line for the new table in
    6.27c's BF32 shape (WR15).
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
  - [ ] 3.1 The `WhatsappTemplateMessage` union + `buildRequestBody` + the validation (`WhatsappTemplateParamError`); `timeoutMs` via
    `AbortSignal.timeout` (or an `AbortController` the client owns) — the rejection is a `WhatsappSendError` with `httpStatus` 0 and
    `transport: 'timeout'` (the fetch catch; the body-read catch unchanged — WR8) (AC6; WR10 rule 1 ⇒ `may_have_sent`).
  - [ ] 3.1b `packages/channels/src/providers/whatsapp-direct-send-outcome.ts`: `classifyDirectWaSendFailure` (WR10 — pure,
    exported through the barrel; ⛔ edit to `whatsapp-errors.ts`, AC12) + its unit legs (AC7).
  - [ ] 3.2 Unit tests (AC6), RED first; the existing WA tests UNCHANGED and green.
- [ ] **Task 4 — the domain begin / finalise (AC3, AC7).** `packages/domain/src/claim/peer-mesh-wa-reminder.ts`:
  `beginPeerMeshWaReminder` (lock claim → ping; a FINISHED existing row ⇒ done, ⛔ write; on an existing `attempting` row FIRST
  `send_started_at IS NOT NULL` ⇒ "in flight", ⛔ write;
  then insert-or-CAS the row, the re-checks, the skip rows), `finalisePeerMeshWaReminder` (bounded: `SET LOCAL lock_timeout` +
  `statement_timeout`)
  (only an `attempting` row held by the same job), `notePeerMeshWaReminderTransient`, `parkPeerMeshWaReminder` (rule 4's / rule 6's single-row
  UPDATE under the lock), `markPeerMeshWaReminderInFlight` (the marker CAS), the set-based `listDuePeerMeshWaReminderPings`
  / `markLatePeerMeshWaReminders` / `finishLapsedInFlightPeerMeshWaReminders` (the "DELIBERATE" cross-tenant blocks; ⛔ a
  set-based park — a park is the child's own single-row UPDATE, WR10 rules 4 / 6); export through the
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
    locale READ is a transient; `config:wa_template_unreadable` — WR7's read THROWS); the claim child (race
    guard → per ping: begin → decrypt + hash after COMMIT → the marker CAS + the quiet-hours re-check → send with `timeoutMs` →
    finalise / classify through `classifyDirectWaSendFailure`, ENDING the loop on a rule-4 park and CONTINUING on a rule-6 park);
    the sweep (the role guard first — F21); the `register…Workers` export (an explicit child `expireInSeconds`). IMPORT 6.27c's
    quiet-hours helpers (already exported) and the SPLIT name read `readMemberFacingDeceasedName` (WR13 — 6.27c's
    `readDeceasedName` keeps its fit check, ⛔ a behaviour change); export `resolveChannelSecret`.
  - [ ] 5.3 Queue names in `packages/queue/src/index.ts`; expose `whatsappAppCache` (WR9); wire in `boot.ts` beside 6.27c's
    registration (pass `APP_LINKS_BASE_URL` the same way).
  - [ ] 5.4 Pure tests (`claim-peer-mesh-wa-reminders.test.ts`) + the live suite (AC10) incl. the alarm-capture and event-count
    legs; the source and type fences (AC4, AC8).
- [ ] **Task 6 — the proof (AC12, AC13).** The frozen-file diff; `ci:local` on :5433; the RED-first evidence for every new test in
  Debug Log; Completion Notes; File List; Change Log; the story → `review`, the sprint row → `review` (a ledger line).

## Dev Notes

### ⚠ TRAPS

- **T1 — The stale "District Admin" clause.** Ledger entry `2026-10-10f` says *"⛔ no reminder once the District Admin has decided"*.
  WITHDRAWN (`-305` §2 item 4). The gate is the ANSWER WINDOW — build ⛔ nothing keyed on a District Admin step.
- **T2 — `consentExists` alone is a SUPERSESSION, ⛔ a convenience.** It would send to `EXPIRED_24H_WINDOW` members whom the app
  has TOLD their opt-in expired, and whom the STOP path ignores (F14). Until the Panel rules, WR3's read is the ratified gate.
  ⛔ "Fix" the 24-hour window in Story 5.4's code as part of 6.31's Task 1–6 (only Task 0.5's ruled path may). And a
  consent-based read is UNSAFE even after a ruling until withdrawal revokes EVERY consent row (F14).
- **T3 — ⛔ Never `dispatch()`, ⛔ never `resolveWhatsappProviderDeps`.** Both are keyed by `AlertCategory`; the cascade falls back
  to SMS on a WA reject — a SECOND text (Trap 17 of 6.27; `-311` PM2). Build the `WhatsappTemplateMessage` yourself and call
  `messagingFor(pariwarId, config).send(…)`.
- **T4 — Numbers race.** ⚠ Record: at authoring this story planned 0167 / `-347` / Row 33, and 6.37b took all three. At the pin
  `main` holds migrations to 0170, decisions to `-363`, roster rows to 34, ledger `2026-10-19a`; row 6-37d's branch plans the next
  of each. This file therefore names ⛔ untaken number (header NUMBERS). Re-check at Task 0.1 (S4) and before EACH commit; a
  journal `when` at or below an applied one is SKIPPED silently by the migrator (deferred-work's *"cross-branch
  migration/decision-id/roster-row numbering race (6-37c vs. sibling story 6-31)"* item). The Panel note names ⛔ row number.
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
- **T13 — Classify by code, class AND `httpStatus`, ⛔ class alone.** `classifyWhatsappError` returns `api_unavailable` for a
  thrown fetch (`httpStatus` 0) AND for a 5xx, and `unknown` for a code-less 429 / 401 / 403 and for every code outside its five
  sets; Meta's codes in `whatsapp-errors.ts` are "INDICATIVE, VERIFY". Follow WR10's ordered rules exactly through
  `classifyDirectWaSendFailure`; a refusal of unknown scope is PARKED (rule 6), ⛔ finished — the once-ever reminder is ⛔ spent
  on what may be the account's fault — and ⛔ resent at once.
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
| member name for `{{1}}` | `readMemberFacingDeceasedName`, SPLIT out of `readDeceasedName` (`claim-peer-mesh-requests.ts:476` — WR13; the reminder skips the SMS fit check) → `notifications.resolveMemberFacingDeceasedName` | a second KYC-name read |
| link | `buildAppLinkUrl` + `resolveAppLinksOrigin` (`staff-email-config.ts`) | URL string building |
| helpline | `deps.resolveConfig(claimCorrectionHelplineConfigKey(pariwarId))` (`claim-correction-sms-templates.ts:109`; 6.27c's use `claim-peer-mesh-requests.ts:232`) | a new key |
| mobile | `getMemberMobileCiphertext` → `decryptMobile` → `normalizeMobile`; `claim.correctionNumberHash` | a new decrypt path |
| WA client | `whatsappAppCache.messagingFor` (exposed per WR9) + `resolveChannelSecret` (export it — WR9) | a second cache / fetch |
| WA config | `channelConfig.getWaConfig` | a raw read of `pariwar_wa_config` |
| error class | `classifyWhatsappError` inside the NEW exported `classifyDirectWaSendFailure` (WR10 — row 6-37d reuses it) | a code table in jobs |
| cross-tenant role guard | `smsDelivery.canReadAcrossPariwars(pool)` (6.37b / 6.37c — F21) | an unguarded cross-Pariwar scan |
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

- **NEW:** `packages/domain/migrations/<next free>_peer-mesh-wa-reminders.sql` (+ journal entry);
  `packages/channels/src/providers/whatsapp-direct-send-outcome.ts` (WR10's classifier);
  `packages/domain/src/schema/claim_peer_mesh_wa_reminders.ts`; `packages/domain/src/claim/peer-mesh-wa-reminder.ts`;
  `apps/jobs/src/scheduler/peer-mesh-wa-templates.ts`; `apps/jobs/src/scheduler/claim-peer-mesh-wa-reminders.ts`; their tests;
  the Panel note (written at creation).
- **UPDATE:** `packages/channels/src/providers/whatsapp-app.ts` (WR8 — additive: the union, `FetchInit.signal`, `transport`);
  `packages/domain/src/wa-opt-in/read.ts` (WR3 — one function); `packages/domain/src/schema/index.ts` + the `claim` namespace export;
  `packages/channels/src/index.ts` (barrel: the classifier, `WhatsappTemplateParamError`); `packages/queue/src/index.ts` (two
  queue names); `apps/jobs/src/scheduler/contribution-providers.ts` (expose the cache, export `resolveChannelSecret`);
  `apps/jobs/src/scheduler/claim-peer-mesh-requests.ts` (split out + export `readMemberFacingDeceasedName` — ⛔ a behaviour change);
  `apps/jobs/src/boot.ts` (wire); `packages/domain/src/member/anonymize.ts` (a "nothing to scrub" line);
  `packages/domain/tests/claim/nominee-name-no-comparison-fence.test.ts` (53 → 54, an exact `toBe` pin); the records (Task 0.4).
- **⛔ Touched:** AC12's list.

### Sequencing

- 6.37b / 6.37c are `done` and on `main` (the pin). 6.31 reads nothing they added except the role guard `canReadAcrossPariwars`
  (F21) — the delivery report is ⛔ read (F18) — but
  the neighbours' text the reminder follows is itself gated — counsel (Row 27), and ⛔ claim text goes live while its DLT template
  is unapproved (`-349`, roster Row 30). Independent of row 6-35 (language switch — WR14 reads through the one function it will change).
- ⭐ UPSTREAM (⛔ a merge fence): row `6-36d-exclude-nominees-from-the-five` (backlog, BigDev 2026-10-19) removes the deceased's
  declared nominees from the five (a mobile match — a nominee row has ⛔ member link); 6.31 relies on it and carries ⛔ nominee
  check (§0 edge (iii)). Go-live of the reminder should follow it — the roster row's leg (g) notes it.
- ⭐ DOWNSTREAM: row 6-37d builds on WR7–WR10 (header). Row 6-37e (`-362`'s short-name fallback) edits the same name function
  as WR13 — whichever lands second rebases (F19). Row 6-37d's STOP work and Task 0.5's in-story path share `wa-webhook-processor.ts`.
- 6.31 adds ⛔ nothing 6.27c's go-live (Rows 27–29) waits on; Row 27 note (3) is discharged by 6.31's `done`.
- Go-live of the reminder waits on the roster row `peer-mesh-wa-reminder-template-approved` — ⛔ never a merge fence
  ([[project_not_in_production_merge_is_not_golive]]).

### Previous story intelligence (6.27c, 6.37, 6.37b, 6.37c)

- 6.27c built the ONE direct-SMS peer-mesh sender: CAS begin under claim → ping locks, a HOLD on any config gap (⛔ a broken text), a
  scope-wide STOP on `config:` / `auth:` / `dlt_template_not_approved:` (P1), park `sweep:held`, give-up after 3 IST days, ⛔ events
  (AC5b), ids only in alarms. 6.31 mirrors that shape for WhatsApp; its review rounds found the same classes 6.31 can hit:
  a re-claimed row's re-check, an unreadable Pariwar parked (⛔ crashing the sweep), the read's SQLSTATE in alarms
  (`peerMeshSqlStateOf`), fresh fixture link codes per test.
- 6.37 (MSG91): the may-have-sent rule for a timeout after the request was written; redirects refused; a 60 s cached pre-flight
  transient. ⚠ There is ⛔ no WA pre-flight (Meta has ⛔ no cheap template-read in the built client) — a template problem surfaces as
  `template_not_approved` on the first send ⇒ WR10's scope-wide HOLD.
- 6.37b / 6.37c (shipped after this story was authored): the role guard `canReadAcrossPariwars` before a cross-tenant sweep;
  MATERIALIZED-CTE claims (an `UPDATE … IN (SELECT … LIMIT n SKIP LOCKED)` over-claims — [[project_in_subquery_limit_skip_locked_overclaim]]);
  ⛔ path that can strand an `attempting` row (6.37c round 2 removed a no-number branch that could — its final attempt now
  finalises `no_target`); a lock timeout only on an attempt that can still be retried; every new table joins roster Row 26 by a dated note.

### Git intelligence

At the pin the last commits are 6.37c's review rounds (`15acb570`, `cda305df`, `39b52757` — a `governance:` decision committed
alone — `b2aa00ff`) and its dev (`99644db0`, `a4247ab1`, `e44dcfef`); before them 6.37b and 6.37. Their conventions: governance
commit ALONE first (`governance: …`), then `story(6.xx): …` commits naming the ACs / patches; records in the same story's commits;
`ci:local` on :5433 stated in the message, with any load-timeout re-runs named.

### Latest tech information (fetched 2026-10-17, re-checked 2026-10-19 — re-check at Task 0.1)

- **Meta template categories:** a UTILITY template must be non-promotional and tied to a specific transaction/account OR essential to
  the user; Meta may approve a utility submission AS MARKETING (since Apr 2025) and re-categorise an approved one later (1 day's
  notice, `template_category_update` webhook — ⛔ handled in this repo). A reminder to verify a third party's death is an
  uncertain fit — hence `-303`'s *"if Meta refuses, the reminder does ⛔ not go"* and the roster row's leg (b). Meta's own
  categorization page (2026-10-19): utility must be *"Non-promotional"* AND specific to / requested by the user OR essential;
  a survey is utility only when tied to a specific prior interaction — a neighbour has ⛔ prior interaction about this death ⇒
  MARKETING or a refusal is PLAUSIBLE.
- **Pricing:** per-message since 1 Jul 2025; Meta's rate cards now read *"effective July 1, 2026"*; ONLY templates may be sent
  outside the 24-hour window — 6.31 sends only a template. ⚠ The earlier "India ≈ ₹0.115" utility figure is pre-July-2026 and
  UNVERIFIED — re-read the rate card before any cost statement.
- **Per-user marketing cap:** failure 131049 — in this repo it REVOKES the opt-in (F13); a reason to accept UTILITY only.
- **VERIFIED on Meta's error-codes page (2026-10-19):** 2388299 *"Variables cannot be at the start or end of the template"*;
  2388293 *"Parameters words ratio exceeds limit"* (⛔ threshold published) — WR6 / S1.
- **Opt-in:** Meta's Business Messaging Policy asks for opt-in with ⛔ time limit and requires honouring opt-outs *"either on or off
  WhatsApp"* (F14). Language codes `en` / `hi` are valid; `en_US` / `en_IN` are separate codes.
- Sources: developers.facebook.com/documentation/business-messaging/whatsapp (support/error-codes, templates/template-categorization,
  templates/supported-languages, pricing); whatsappbusiness.com/policy; earlier: ycloud.com, infobip.com, syniverse.com notes.

### References

- `.decision-log.md`: `2026-10-10-303` (Q1 A, Consequence 3, "does NOT cover"), `2026-10-10-304` Q6 A, `2026-10-10-305` §2 items 2
  and 4 + §4, `2026-10-10-310` CF1 A / CF4 A, `2026-10-10-311` PM2, `2026-10-12-324`, `2026-10-17-344`, `2026-07-08-065`,
  `2026-09-28-263` FQ10 A; since the authoring pin: `-347` DR13, `-349`, `-350` put-back (b), `-351` 3 B, `-354` decision 4,
  `-355` decision 1, `-356`, `-357`, `-360` (item 5), `-362`.
- `_bmad-output/implementation-artifacts/6-27-peer-mesh-sending-replies-and-date-of-death.md` (PM5, PM6, PM7 (g), PM8, PM21, PM22,
  Trap 13, Trap 17) · `6-27c-peer-mesh-sending-texts-and-links.md` · `6-37-msg91-sms-gateway-adapter.md` ·
  `6-37b-msg91-delivery-reports.md` · `6-37c-undelivered-reminder-ladder.md` · row 6-37d's story (on its branch) ·
  `5-4-member-wa-opt-in-via-inbound-webhook-matching-webhook-ingress-primitive.md`.
- `_bmad-output/planning-artifacts/architecture.md` §3.4 (channel providers, WhatsApp dual gate, UTILITY scope), §3.11, §3.12, §1.8,
  §1.11 · `docs/adr/ADR-0028-*.md`, `docs/adr/ADR-0029-*.md` · `docs/launch-gate-inventory/inventory-roster.md` Rows 26, 27, 28, 32.
- `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-10-10-6-27-asking-the-neighbours.md` (how the reminder was put) ·
  `trustee-panel-routing-note-2026-10-17-6-31-how-long-a-whatsapp-yes-lasts.md` (this story's note).

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

- Ultimate context engine analysis completed — comprehensive developer guide created (2026-10-17, `bmad-create-story 6.31`; four
  read-only research passes over the governance trail, the peer-mesh sender, the WhatsApp substrate and the planning records).
- Validated 2026-10-19 (v1.5, `bmad-create-story validate 6.31`): rebased onto `15acb570`, four parallel fresh-context verifiers,
  every finding applied; then the fix diff and the revised Panel note re-validated by two fresh-context reviewers (story: 3 HIGH /
  4 MEDIUM / 5 LOW; note: 1 HIGH / 4 MEDIUM / 5 LOW — all the pass's own, all applied; Change Log v1.5). Those corrections were
  ⛔ re-reviewed by a further round.

### File List

## Change Log

| Date | Version | Change |
|---|---|---|
| 2026-10-17 | 1.0 | Created via `bmad-create-story 6.31` at `dae96d9b`: F1–F17, WR1–WR16 PROPOSED, I1–I8, AC0–AC13, Tasks 0–6; the Panel note on how long a WhatsApp opt-in lasts WRITTEN (⛔ sent); the stale "District Admin" clause flagged (T1). |
| 2026-10-17 | 1.1 | Create-story validation (two fresh-context passes — code; governance + footguns): 7 HIGH / 18 MEDIUM / 16 LOW, all applied. WR10 rewritten as ordered rules over class AND `httpStatus` (a thrown fetch / timeout ⇒ `may_have_sent`; `FetchInit.signal` + `transport` field); due list = no row OR parked OR re-claimable; switch-OFF ⇒ ⛔ offered; one child per CLAIM; WR2 (iii) ⭐ (b) `!== 'submitted'` ((a) narrows `-303` ⇒ Panel's); WR5 bound acts only on existing rows (⛔ backfill), recorded as a delivery failure; WR2 (ix) recipient eligibility; WR3 relabelled (dual gate + a defensive conjunct); decrypt throw transient, name-fault and lapsed-lease outcomes; `readDeceasedName` / `resolveChannelSecret` exported; `lockClaimThenPing` copied; RLS + decrypt-fence specs; quotes re-sourced (CF1 A, `-065` phrases, PM7 (g)); the stale clause sourced to ledger `2026-10-10f`; F7 / F12 / F14 / F17 / I8 corrected; T13 rewritten, T15 added. The Panel note rewritten in plain words (⛔ glyph removed), its deciding fact corrected (the app TELLS the member their yes expired). |
| 2026-10-17 | 1.2 | Validation round 2 (fresh context): 3 HIGH / 9 MEDIUM / 8 LOW, all applied — AC3 now `!== 'submitted'`; WR10's outcome + `detail` grammar complete (`skipped_recipient_ineligible`, `name_none`); the lapsed-lease rule keyed on a new `send_started_at` in-flight marker (⛔ on `detail`); rows created only by a begin under the lock (⛔ a set-based park INSERT); rule 3 takes Meta's rate-limit codes on any non-zero status; `readDeceasedName` exported with narrowed deps + a label; `readPeerMeshRequestEligibility` for WR2 (ix); §0 records the three MATCH edges (WR5 as a delivery give-up per `-302` §0, WR6, WR2 (ix)); option A's wider change named; a fixed language-code map; the `6-37b` number collision recorded (T4, F17); the glyph register's emphasis rule; T1 quote, T13, T14/T15 order. The Panel note: ⛔ row number, option B's cost, the elided quote, an E4 line. |
| 2026-10-17 | 1.3 | Validation round 3 (fresh context, the round-2 edits): 4 HIGH / 6 MEDIUM / 5 LOW, all applied — AC2's lapsed legs keyed on `send_started_at` (⛔ `detail`); a rule-2 park clears the marker; begin re-checks `< + 72 h`; the marker write is a CAS with the lease margin and `timeoutMs` + margin < lease; `send_started_at`'s CHECKs / GRANT / trigger named; one ending at the bound (`skipped_late`); the set-based park function removed; `sweep:held` is a `claimed_by_job` marker; 502 / 504 ⇒ `may_have_sent`; `config:locale_unavailable`; `rate_limited` = HTTP 429; the 6.31 park cost vs 6.27c's P1 recorded; the `6-37b` branch's committed numbers ⇒ this creation's ledger `2026-10-17k`, 0167 / `-347` / Row 33 PROVISIONAL. |
| 2026-10-17 | 1.4 | Validation round 4 (the v1.3 edits): 1 HIGH / 2 MEDIUM / 7 LOW, all applied — the lease inequality corrected (`CORRECTION_SEND_TIMEOUT_MS` + finalise < the 2-min handoff margin, pinned by a test); the lapsed in-flight finisher runs first, regardless of switch and bound, and late marking skips in-flight rows; rule 1's `detail` values; `config:<gap>` alarm-only; the three re-claim grounds; `readDeceasedName`'s label sites; WR5's sweep-vs-begin bound; AC7 legs for 502 / 131009 / the marker; Task 4's scope-park and marker functions + specs. |
| 2026-10-19 | 1.5 | Validate (`bmad-create-story validate 6.31`): the branch REBASED onto `main` `15acb570` (50 commits — 6.37b / 6.37c shipped; ledger `2026-10-17k` re-placed in its slot) and RE-PINNED; four parallel fresh-context verifiers (governance staleness; every code cite at HEAD; the mechanism; premise + Meta's own pages): 6 HIGH / ~15 MEDIUM / ~20 LOW, all applied. BigDev answered three in session (recorded as §0 edges (i)–(ii) and WR10 rule 6, again at Task 0.2): *"(a) Send it"* (a text REPORTED undelivered is still "a text that went"), *"(a) Full name always"* (the reminder skips the SMS name fit check — `-362` narrows the TEXT only), *"Park, continue loop"* (131008 / 131009). HIGH: every planned number taken (0167 / `-347` / Row 33 → "the next free", the 6.37d race named, the roster row by KEY); F18 the peer-mesh delivery report; F19 `-362` and the name read SPLIT (`readMemberFacingDeceasedName`); WR10 rule 6 no longer FINISHES a refusal of unknown scope (401/403, code 100, account codes ⇒ park) and an exported `classifyDirectWaSendFailure` for 6.37d; consent rows accumulate and withdrawal revokes only the newest (F14, WR3, deferred item (4)); the Panel note revised before sending (`-357`'s claimant precedent, `-350`'s put-back, Meta's policy cited, the Hindi copy, the withdrawal cost). Also: §0 edges (iii) `-356` and (iv) the §3.4 annotation; new rulings rows; the day-one line; I1 per ping; I2 / AC8 a type-level SMS absence + SMS symbols; `hash_failed:tier1`; the begin's in-flight test (⛔ 23514); quiet hours at the marker; the bounded finalise + wamid alarm; late marking regardless of window; WR7 a key family, dotted-name item inherited, `config:wa_template_unreadable`; WR12 the role guard, `clampLimit`, an explicit child expiry; Row 26 note; `anonymize.ts` line; Meta codes 131048 / 133016 / 131026 / 131047; S1 / S3 re-scoped; DOWNSTREAM 6.37d and 6-37e in the header and Sequencing; cites corrected (`:719`, the helpline key's definition, F10, F11). Re-validation (two fresh-context reviewers) then found 3 HIGH in the story edits (WR10's reordering left rule 4's codes unreachable — 131048 / 131057 arrive on 429 / 503; `WhatsappTemplateParamError` fell into `may_have_sent`; §0 edge (iii) cited `-356`'s scope line against its own reading) and 1 HIGH in the note (`-357` presented as ruling a duration) — all applied; edge (iii) REPLACED by BigDev's *"Exclude at selection"*: nominees leave the five under the NEW row `6-36d-exclude-nominees-from-the-five`, 6.31 adds ⛔ nominee check. |
