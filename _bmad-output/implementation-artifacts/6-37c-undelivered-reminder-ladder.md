---
baseline_commit: f8102c02
---

<!--
PINNED: `f8102c02` (2026-10-17 — branch `story/6-37c-undelivered-reminder-ladder`, on `story/6-37b-msg91-delivery-reports` @ `c46402cd`;
`main` == `origin/main` == `dae96d9b`). `git diff --stat dae96d9b f8102c02 -- apps packages` is EMPTY ⇒ every plain `apps/` / `packages/`
cite is true of `main`. ⭐ Story 6.37b's code is COMMITTED as `f7e695b7` on `story/6-37b-msg91-delivery-reports` (2026-10-18 00:08 +0530)
but is ⛔ yet on THIS branch — cites marked **(6.37b)** are at `f7e695b7`. ⚠ Once this branch carries `f7e695b7` (Task 0.1), every plain
cite into `apps/jobs/src/scheduler/claim-correction-reminders.ts` past line 65 shifts (+1 … +8 to line 438, +9 from 439 — 6.37b's
hunks sit at 65, 220, 230, 242, 433) and into `apps/jobs/src/scheduler/claim-certificate-reminders.ts` at line ≥ 662 by **+1** —
re-locate by FUNCTION, ⛔ by number ([[feedback_story_validate_footguns]] #19, #21, #24). Built in its OWN worktree
`.claude/worktrees/6-37c` ([[feedback_commit_on_story_branch]], [[feedback_shared_tree_branch_switch]]).

STATUS: `ready-for-dev` — buildable after Task 0 (LD1–LD14 answered by BigDev and committed; PQ1–PQ3 put through the §0 gate and, if
they pass it, routed) and after this branch carries `f7e695b7`.

§0 GATE (the routing template's, applied FIRST — `_bmad-output/planning-artifacts/trustee-panel-routing-note-TEMPLATE.md`): the
behaviour is the Panel's and is ALREADY RULED (`-350`, `-351`, `-352`); each LD below is the AUTHOR's because it decides how that ruling
is timed, stored, shown to staff or split into rows — the follow-up note's own §0 put *"how the ladder is timed and stored in the
system"* on our side and the Panel ruled on that note. ⚠ FOUR LDs have a person-facing half and are FLAGGED for BigDev's own §0 check at
Task 0.2: LD4 (one message a day — fewer texts), LD5's no-restart rule (fewer texts), LD9 (a reached call stops the staff asks — ladder
persons only) and LD11 (calls to a nominee before counsel — narrows `-352` Q2). ⭐ THREE questions look like the PANEL's (PQ1–PQ3) —
two Trustee-ratified rulings meet at an edge the notes never put ([[feedback_panel_gate_read_ratified_verbatim]]).

GLYPH REGISTER: `⛔` negates the word it precedes; `⭐` emphasis / action; `⚠` a hazard. ⛔ No `file:NNN` into `.decision-log.md`,
`deferred-work.md` or `sprint-status.yaml` (newest-first files — footgun #19) — cite the decision id, the item's phrase, or the row key.

LETTERS: F = found facts (F1–F21); LD = build decisions (LD1–LD14 — PROPOSED, ⏳ BigDev at Task 0.2); PQ = candidate Panel questions
(PQ1–PQ3); I = invariants (I1–I9); T = traps (T1–T22). Decision-entry letters stay the entry's own (`-351` rulings 1–6, `-252`
cl.1–cl.3, `-250` #1–#6, `-347` DR1–DR14); G1–G3 are the §3.4 proposal's go-live conditions.
-->

# Story 6.37c: A reminder the network reports undelivered is followed up — the same reminder twice more over four days, then a call or a letter — and only then stops counting as reaching the family; a claim is never closed for silence while that follow-up runs `[PRIMITIVE]`

Status: ready-for-dev

> ⭐⭐ **WHAT THIS STORY IS, IN ONE PARAGRAPH.** Story 6.37b receives MSG91's delivery reports and records, per send, whether the network
> said `delivered` or `undelivered` (`sms_send_deliveries`, absorbing `undelivered` — `-347` DR6) — and changes ⛔ nothing a family
> receives. The Trustee Panel then ruled what an `undelivered` report MEANS for the two chases with a letter route — the correction-return
> reminders (6.19b / 6.19c) and the replacement-certificate reminders (6.19d): **(1)** only a REPORTED failure starts a follow-up (`-351`
> 1 A); **(2)** one follow-up — a *delivery ladder* — per person at a time (`-351` 4 A): WhatsApp at 4 hours, a second SMS at 48 hours, a
> third 48 hours later, then a 96-hour wait (`-350` ruling 2); **(3)** any message that IS delivered, or a recorded call that reaches the
> family, ends it and the person counts as reached (`-351` 4 A, 5 A); **(4)** otherwise the reminder is CONCLUDED never delivered — it no
> longer counts as reaching the person, who is offered the letter route exactly as when the network refuses a number at send (`-350`
> ruling 1, B1), and the District Admin is asked to call or post the letter (`-351` 5 A); **(5)** a claim cannot be closed for silence
> while a ladder for any of its people runs (`-351` 6 A). This story builds (1)–(4) for BOTH chases and (5) for the correction chase
> (the only one with a closure — F14; PQ2 (b)), the call record, and the staff views,
> inside the reminders' ratified rhythm (`-250` #5: *"One message a day, at 10:00 in the morning"*, *"stop at day 90"*; `-259`: the
> certificate reminders stop after 180 days). ⭐ Under LD1 (recommended) it does ⛔ send WhatsApp: the WhatsApp step is RECORDED as
> skipped and the ladder goes on to the 48-hour SMS — exactly `-351`'s recorded reading *"until (a)–(c) … are settled, no WhatsApp message
> is sent"* — and the WhatsApp step, the filing agreement's new wording (`-352` Q1) and the nominee's WhatsApp basis move to a NEW row
> `6-37d-claim-contact-whatsapp-step`. ⛔ No family-facing text changes; ⛔ no new DLT template (a ladder SMS is the chase's OWN approved
> reminder, sent again); ⛔ no claim-text template id is provisioned by this story (roster Row 32 note (9)).

> **What already ships and this story READS — rebuild ⛔ none of it:**
> - **6.37b (`f7e695b7`):** `sms_send_deliveries` (`0167_sms-delivery-reports.sql:78-106` — PK (`send_kind`, `send_row_id`), `send_kind
>   IN ('cr','ce','sn','pm')`, `delivery_state IN ('delivered','undelivered')`, `first_reported_at`, `reported_at`, `report_count`, tenant
>   RLS, ⛔ DELETE, indexes: the PK and `pariwar_id` only); `readSmsSendDeliveries(db, kind, rowIds)` (`packages/domain/src/sms-delivery/reports.ts:254-260`
>   — ⛔ production caller; RLS-scoped, unordered); the correlator `apps/jobs/src/sms-delivery-correlator.ts` (writes `sms_send_deliveries`
>   ONLY for a finished `accepted` row whose `provider_message_id` = the report's request id — `decideSmsReport` `:96-167`; for `cr` ONLY it
>   checks `CORRECTION_SMS_PURPOSES = {'family_sms','closure_notice'}` `:61-62`, `:121`; the `ce` lookup returns `NULL::text AS purpose`,
>   `reports.ts:190`); the silence check `countSilentSmsSends` (`reports.ts:273`; its `cr` filter `s.purpose IN ('family_sms','closure_notice')`
>   `:282`; ⛔ purpose filter on `ce`); the CRQID on every send (`claim-dlt-sms-send.ts:144` required `correlation`; the wrapper
>   `sendClaimCorrectionSms` derives `ce` for `certificate_reminder`, else `cr` — `claim-correction-reminders.ts:238-252`).
> - **The correction chase** (6.19b / 6.19c): persons `readCorrectionRecipients` (`packages/domain/src/claim/correction-chase.ts:601-656`;
>   the `CorrectionPerson` shape `:564-576`); rows `readReturnFamilyRows` (`correction-reminder-record.ts:604-641`, `purpose='family_sms'`
>   `:634`, ⛔ `reminder_id` selected) → `readReturnPersonStates` (`:816-858`) → the shared pure `evaluatePersonRunState`
>   (`correction-chase.ts:737-772`; `DEAD_OUTCOMES` `:698-702`; `foundDeadOn = dead?.sentOn` `:765` — the FIRST dead row of the
>   current-number epoch, sticky); D22 `evaluateClosurePersonReach` (`correction-closure.ts:365-392`), `readClosureReach` (`:399-421`, calls
>   `readReturnFamilyRows` DIRECTLY `:409`), `assertClosureGround` (`:457-482`, four callers); letters `correction-letter.ts`; the staff view
>   `correction-chase-read.ts`; the daily 10:00 sweep `apps/jobs/src/scheduler/claim-correction-reminders.ts`.
> - **The certificate chase** (6.19d): `readClaimCertificateFamilyRows` (`certificate-reminder.ts:699-731`, `purpose='family_sms'` `:721`,
>   ⛔ `reminder_id`) → `evaluateCertificatePersonStates` (`:792-821`, `letterEligible: s.track.foundDeadOn !== null` `:818` — the SAME
>   shared `evaluatePersonRunState`); letters `certificate-letter.ts`; the CR10 staff chase `planCertificateStaffChase` (`:875-925`); the
>   daily 10:00 sweep `apps/jobs/src/scheduler/claim-certificate-reminders.ts`.

## Story

As **a family whose claim is being chased for a correction or a death certificate**,
I want **a reminder the phone network reports it could not deliver to me to be sent again, and — if nothing gets through — the District
Admin to phone me or post me a letter, a phone call that reaches us counting as reaching us**,
so that **my family's claim is never closed for our silence on the strength of a text that never arrived, and we are not left
unreached because one phone was switched off**.

## The rulings and records this story builds on

| Source | Key (verbatim, abridged) | Status |
|---|---|---|
| **`2026-10-17-350`** | ruling 1 *"A reminder the system has concluded was never delivered no longer counts as reaching the person, and the person is offered the letter route — as when the network refuses a number at the moment of sending."* ruling 2 *"(1) sent the message over WhatsApp, when the SMS has not been delivered 4 hours after it was sent; (2) sent the SMS once more, when the message is still not delivered by either channel after 48 hours; (3) sent one more SMS 48 hours after the second, and waited 96 hours. If it has still failed, the reminder is escalated for a call or a letter."* ⚠ Its *"Our reading of the ladder's timing — NOT RATIFIED"* (hours 0 / 4 / 48 / 96 / 192). Consequence 3: *"up to two extra SMS per undelivered reminder"*. | ⭐⭐ **TRUSTEE-RATIFIED** (Dhiraj Rahul + Kalpana Bharti) |
| **`2026-10-17-351`** | 1 A *"ONLY A TEXT REPORTED AS FAILED STARTS THE LADDER. A text with no report keeps counting as reaching the person … a text lost without any report is caught by the silence alarm, not followed up with the family."* 3 B *"THE LADDER APPLIES TO THE CORRECTION REMINDERS AND THE CERTIFICATE REMINDERS … The certificate chase's own letter rule takes the same B1 change."* 4 A *"ONE LADDER PER PERSON AT A TIME, started by the first reminder that is not delivered; any message to that person that IS delivered — a later reminder or a ladder step, on either channel — ends it, and the person counts as reached."* 5 A *"THE DISTRICT ADMIN IS ASKED TO CALL OR POST THE LETTER; A CALL THAT REACHES THE FAMILY IS RECORDED (DATE, WHO ANSWERED) AND COUNTS AS REACHING THEM."* 6 A *"CLOSURE WAITS: a claim cannot be closed for silence while a ladder for any of its people is still running."* (option A as put: *"(at most about a week past day 90)"*). ⚠ Its NOT-RATIFIED readings: the call is recorded by hand (date, who answered, outcome); the certificate ladder uses the same timings; *"no WhatsApp message is sent … the ladder goes on to the second SMS at 48 hours … The call half of the escalation is not held"*. Consequence 2: *"with the WhatsApp step built but off until (a)–(c) are settled"*. Consequence 4: phase 2 (call tracking / recording / transcription) has ⛔ row. | ⭐⭐ **TRUSTEE-RATIFIED** |
| **`2026-10-17-352`** | Q1 B — *"The claimant's filing agreement names text message, WhatsApp, phone call and post, and adds "or any other means of communication that may appear in future"."* Q2 — *"WhatsApp and calls go to the claimant and nominee both but The claimant's agreement doesn't cover the nominees. Instead it's permissible under DPDPA."* NOT covered (for counsel): (a) the legal basis as quoted; (b) Meta's opt-in rule; (c) architecture §3.4. Consequence 3: *"A go-live condition is proposed (BigDev's decision, recorded separately): WhatsApp and calls to a nominee do not go live until counsel confirms the legal basis in writing (a) and the Meta policy check (b) is recorded"* — ⚠ ⛔ recorded separately yet (LD11). | ⭐⭐ **TRUSTEE-RATIFIED** |
| **`2026-10-17-353`** | decision 1: row 6-37c builds the conclusion, the ladder, the call / letter escalation with a call that counts, closure waiting, *"the new wording of the claimant's filing agreement (`-352` Q1); and WhatsApp and calls to the claimant and the nominee … the nominee's WhatsApp step only once the architecture §3.4 amendment is ratified"*; *"its `epics.md` entry is owed at its create-story"*. decision 2: 6.37b's Task 7 and AC11 *"move to 6-37c unchanged, as that row's starting point"*. decision 3: no claim-text template id until Row 33 has closed AND 6-37c is `done`. Consequence 2: the deferred-work dispositions against *"Task 7"* are made by 6-37c when it closes. | author-commit — THIS ROW's charter |
| `2026-10-17-347` | DR4 (`1` ⇒ delivered; `2/9/16/17/20/25` ⇒ undelivered); DR6 (`undelivered` absorbing; the counting contract); DR12 (silence alarm); DR13 (*"The correction chase screen changes only through Task 7"*). | author-commit |
| **`2026-09-27-252`** | cl.1 *"A closure may be **requested** only when, for **each** person who must be reached, ≥ 1 reminder was **accepted** by the network (or shown **delivered**, where a report exists) — **or** a posted letter has a **recorded delivery date**."* cl.2 *"A FAMILY NO CHANNEL CAN REACH IS OFFERED THE LETTER ROUTE — as for an invalid number."* | ⭐⭐ **TRUSTEE-RATIFIED** (as narrowed by `-350`) |
| **`2026-09-27-250`** | #2 the letter chase *"counts from the day the phone was found dead"*; #4 *"A letter can **still be recorded** after day 90, with **no more reminders**."*; #5 *"… weekly on days 42, 49, 56, 63, 70, 77, 84; **stop at day 90**. One message a day, at **10:00 in the morning**."* (*"⇒ the 10:00 hour is now the Panel's"*). | ⭐⭐ **TRUSTEE-RATIFIED** |
| **`2026-09-27-259`** | the certificate reminders follow the correction schedule to day 90, then monthly — *"AND THE REMINDERS STOP AFTER"* 180 days (`-260` G6: days 120 / 150 / 180). | ⭐⭐ **TRUSTEE-RATIFIED** |
| **`2026-10-03-275`** | Q1 A one certificate letter per person per CLAIM, ever; Q4 A *"reminders stop while it stands accepted and resume on the re-rejection"*. | ⭐⭐ **TRUSTEE-RATIFIED** |
| `2026-09-20-230` / `-231` C | a DEAD NUMBER is answered by the District Admin's POSTED LETTERS; the letter record is chased by reminders and then ESCALATED. | ⭐⭐ **TRUSTEE-RATIFIED** |
| 6.37b story (`6-37b-msg91-delivery-reports.md`) | AC11 + Task 7 — MOVED here (`-353`), kept there as written. ⚠ Two of its lines do ⛔ survive the rulings: AC11 maps the REPORT straight to `rejected_unreachable` (⛔ — the rulings conclude only after the ladder — F1) and says *"the certificate chase's letter-eligibility is unchanged"* (⛔ — `-351` 3 B). | story record |
| Panel pack `panel-pack-2026-10-17-6-37c.md` + `sprint-change-proposal-2026-10-17-whatsapp-claim-contact.md` | the §3.4 claim-contact amendment + G1 (counsel's written nominee basis before any WhatsApp **or call** reaches a nominee — pack line 35), G2 (Meta check), G3 (new agreement live before a claimant gets WhatsApp). ⚠ The unpresented bullet names *"roster row `6-37c-undelivered-reminder-ladder`'s gate"* (proposal `:124-125`; pack `:16`, `:56`) — a SPRINT row, and the wrong one under LD1 (F19). | ⛔ PREPARED, ⛔ presented — ⛔ ratified |
| deferred-work | *"⛔ DLT send consumes a delivery report — a rejection seen only there is recorded `accepted`, and on the correction chase D22 counts the family reached"* (closer now 6-37c — 6.37b's annotation); *"⛔ Staff view labels a send 'reported undelivered'"* (6.37b — ⭐ trigger: THIS create-story); *"`delivered_at` on `claim_correction_reminders` / `claim_certificate_reminders` stays NULL — an unused seam"* (6.37b — trigger: the next migration touching either table — THIS story's); *"⛔ No staff prompt to CALL a dead-phone family whose second certificate is rejected after their one letter"* (trigger: *"a staff call-task seam"* — THIS story's call record); both *"At-least-once SMS"* items. | open |

## ⭐ THE INVARIANTS

1. **I1 — A report still only SUBTRACTS reach; reach is ADDED only by a staff-recorded call** (6.37b's I1, restated). A `delivered`
   report ⛔ adds an `accepted` row and so ⛔ adds reach on its own (an accepted row already counts). The ONE new source of reach is a call
   recorded `reached` by a District Admin under a permission key (LD10) — ⛔ a provider input. ⇒ the forgery bound (anyone holding 6.37b's
   header token): a forged `undelivered` on a reminder whose person receives ⛔ later `delivered` report STARTS a ladder (up to two more
   copies of an approved reminder), holds the closure ≈ 8 days, then CONCLUDES — un-counting that reminder (closure `not_reached` until a
   letter's delivery or a reached call is recorded), making the person letter-eligible and asking the District Admin to call or post; a
   forged `delivered` ENDS a ladder early (the person then counts as reached through rows that were already `accepted` — ⛔ worse than today).
   ADR-0042's forgery bound gains these lines (Task 0.4 — a dated note, ⛔ a word above rewritten).
2. **I2 — The send tables are written ONLY by new INSERTs through the existing claim / finalise accessors** (generalised to a purpose —
   Task 3). ⛔ `UPDATE` of an existing reminder row outside its existing finaliser semantics; ⛔ a stored `outcome` rewritten by the
   conclusion (the mapping is READ-time — LD6); `delivered_at` stays NULL (LD14 (d)).
3. **I3 — ONE mapping per chase, inside its row reader** — `readReturnFamilyRows` (correction) and `readClaimCertificateFamilyRows`
   (certificate) — BEFORE the shared `evaluatePersonRunState`. ⛔ in `DEAD_OUTCOMES`, ⛔ in `evaluatePersonRunState`'s OUTCOME logic (both
   are shared by `correction-closure.ts:73,380` and the certificate chase — `certificate-reminder.ts:63, 809, 818`), ⛔ a second copy per
   reader. `readClosureReach` already reads `readReturnFamilyRows` directly (`:409`) ⇒ it inherits the mapping by construction.
4. **I4 — The mapping keys on a CONCLUDED ladder, ⛔ on a raw report** (F1). A reminder reported `undelivered` whose ladder is running
   or ended `delivered` reads EXACTLY as today (`accepted`).
5. **I5 — One running ladder per (claim, chase, person)** — a partial UNIQUE index, ⛔ an application check alone (`-351` 4 A); every
   start and state move happens under the chase's lock (LD5 — the closure gate reads the same lock).
6. **I6 — Every ladder SMS honours every stop the chase's own reminder honours, PLUS the chase's ratified horizon and pause** — through ONE
   extracted predicate per chase, shared with `beginCorrectionFamilySend` (`correction-reminder-record.ts:391-480`) /
   `beginCertificateFamilySend` (`certificate-reminder-record.ts:360-466`) — ⛔ a copy (T7). ⛔ A ladder SMS on correction day ≥ 90, on a
   certificate run that is `completed` (day > 180), or while a certificate run is paused (`-250` #5, `-259`, `-275` Q4 — PQ3 asks whether a
   ladder may then CONCLUDE without that text; our reading: yes, LD3).
7. **I7 — ⛔ WhatsApp is sent by this story** (LD1 (a)). The WhatsApp step is a RECORDED skip; ⛔ a WhatsApp provider, `dispatch()`,
   `cascade`, `resolveWhatsappProvider` or the fixture is touched (the fixture reports `accepted` —
   `packages/channels/src/providers/fixture-whatsapp.ts:23-41` — a step "sent" that never went, T11).
8. **I8 — ⛔ A word a family receives changes; ⛔ more than one text to one number in one chase on one day; ⛔ a text outside 10:00.** A
   ladder SMS is the chase's approved reminder (`correction_sms.reminder` / `certificate_sms.reminder`, same DLT template, same named values —
   `claim-correction-sms-templates.ts:57-72`, `:90-104`), sent by the 10:00 sweep (`-250` #5); ⛔ `packages/i18n/locales/*/claim.json` edit;
   ⛔ a new DLT template; ⛔ the filing agreement (LD1 — row 6-37d). ⚠ One residual to the one-a-day rule: the chase's own catch-up `late` send
   does ⛔ check ladder rows (T22, recorded at Task 10). Staff copy (`apps/admin/**/i18n-en.ts`, the hard-coded push copy) DOES
   change (AC9).
9. **I9 — Tests never touch MSG91 or Meta** (6.37 T1 / 6.37b I9): injected `fetch`; a global-fetch RECORDER at ZERO calls across the
   new suites.

## 📜 Policy meaning (AI-10-1)

**This story CHANGES predicates that gate a family's benefit** — what counts as reaching a person before a claim may be closed for
silence (D22 `evaluateClosurePersonReach`; `assertClosureGround`, which gains `ladder_running`), who is letter-eligible on BOTH chases
(`foundDeadOn` via the concluded mapping), and when the District Admin is asked to call or post (the ladder's escalation; a reached call).
In the family's terms: ⭐ *"If the phone network reports that a reminder never reached you, the Trust does not yet treat you as reached:
it sends you the same reminder again two days later and again two days after that — unless a reminder is already due to you that day —
never twice in a day and never after the reminders' end — and while it is trying, over about eight days, your claim cannot be closed for your silence; if any text
gets through, or the District Admin reaches you by phone, you count as reached; if none does, that reminder no longer counts as reaching
you, and the District Admin is asked to phone you or post you a letter (a nominee: post a letter, until the Trust's lawyer confirms it may
phone them)."* Its costs to the family: up to two extra copies of a reminder (often none in the first week, when a daily reminder already
goes); a closure up to about a week later (longer when the network's report itself arrives late — LD3); and — as for a number refused at
send today — once concluded, the person stays letter-eligible and shown "unreachable" for that number even if a later text gets through
(letter-eligibility keys on the FIRST dead outcome — B1's *"as when the network refuses a number"*). ⚠ What it does ⛔ mean: a text with
NO report at all still counts as reaching the person (`-351` 1 A); a WhatsApp message is ⛔ sent by this story (LD1); a certificate
reminder ⛔ counts toward the correction closure (6.19d invariant 2 — PQ2 asks whether that holds for ladders).
**Niyamavali check:** ⛔ applicable — the Niyamavali does not speak to how a reminder is proven delivered, and it is ⛔ ratified
([[feedback_niyamavali_rulebook_not_spec]]). ⚠ Checked against `-350` / `-351` / `-352` / `-252` cl.1–cl.2 / `-250` #2, #4, #5 / `-259` /
`-275` Q1, Q4 VERBATIM (the table above), each line MATCH / NARROW:
- ladder, conclusion, call that counts, closure waits — MATCH `-350` 1–2 / `-351` 1, 3–6;
- the WhatsApp step skipped — MATCHES `-351`'s recorded reading, NARROWS `-351` Consequence 2 (*"built but off"* — LD1 builds it in 6-37d);
- one message a day at 10:00, ⛔ text past day 90 / day 180 / during a pause — MATCHES `-250` #5 / `-259` / `-275` Q4, NARROWS `-350`
  ruling 2's hours (a step waits for 10:00 and for a free day — LD3, LD4) and, at the horizon, may conclude a ladder with a step unsent (PQ3);
- found-dead = the conclusion date (LD7) — MATCHES `-250` #2 (*"the day the phone was found dead"*);
- each chase alone (PQ2) — NARROWS `-351` 4 A's *"any message"* and 6 A's *"any of its people"* (routed);
- a nominee is asked for a letter, ⛔ a call, until counsel (LD11 (a)) — NARROWS `-352` Q2 and `-351` 5 A for nominees (`-352` C3's own condition);
- the no-restart rule (LD5) — our reading of 4 A's *"one ladder … at a time"* for a person already concluded (flagged);
- a ladder SMS the network REFUSES at send (dead number) does ⛔ conclude the ladder early — it waits for the conclusion date like any step
  (LD3) — NARROWS `-350` ruling 1's *"as when the network refuses a number"* by up to ≈ 4 days for that person (disclosed);
- the one-off `ladder_escalation` (+ push) after day 90 — our reading that a staff ask is ⛔ a *"reminder"* in `-250` #4's *"no more
  reminders"* (6.19 built `slot < 90` on every staff ask, F8) — flagged for BigDev at Task 0.2, and put in PQ3's note as context;
- a failure reported more than 14 days after its send is never followed up and keeps counting (LD5's scan bound) — NARROWS `-350` ruling 2
  at the edge (MSG91 reports on the final status, usually within minutes — 6.37b F5);
- a failure reported after a closure was DECIDED changes nothing (`closure_closed`) — the closure already happened; disclosed.

## ⭐ FOUND FACTS (at `f8102c02` / `dae96d9b`, plus 6.37b at `f7e695b7`; re-check at Task 0.1)

**What 6.37b gives this story**
- **F1 — The report is NOT the conclusion.** `-350` concludes "not delivered" only after the ladder (≈ 8 days) with ⛔ delivered message.
  The 6.37b AC11 mapping (*"a `family_sms` row whose `sms_send_deliveries` state is `undelivered` reads with EFFECTIVE outcome
  `rejected_unreachable`"*) fires on the REPORT — eight days early: letter-eligible, `unreachable` on the queue and the found-dead +7
  letter chase all start at once. ⇒ I4.
- **F2 — ⛔ Column records WHEN a send became `undelivered`.** `first_reported_at` / `reported_at` are the earliest / latest matching
  report of ANY state (`0167:78-106`; `upsertSmsSendDelivery` `reports.ts:234-251`). ⇒ the ladder's clock is anchored on the SEND's IST
  date (LD3), ⛔ on a report time; the ladder STARTS when the sweep first sees the `undelivered` row.
- **F3 — Reports are recorded only for the request the row holds** (`sms-delivery-correlator.ts:96-167`, row 7 ⇒ `other_attempt`); a row
  stuck `attempting` > 72 h never gets one; reports can arrive minutes to days late (6.37b F5 — on the FINAL operator status).
- **F4 — The correlator and the silence check filter by purpose ON `cr` ONLY.** `CORRECTION_SMS_PURPOSES = {'family_sms','closure_notice'}`
  (`sms-delivery-correlator.ts:61-62`, `:121`) ⇒ a `cr` report on any other purpose settles `unmatched:not_sms`; the `cr` silence filter
  (`reports.ts:282`). The `ce` lookup returns `NULL::text AS purpose` (`reports.ts:190`) and the `ce` silence query has ⛔ purpose filter ⇒
  a `ce` `ladder_sms` report already matches UNCHANGED. ⇒ Task 5 is correction-only (+ a leg proving the `ce` side).
- **F5 — `readSmsSendDeliveries(db, kind, rowIds)`** is RLS-scoped (on the BYPASSRLS pool it reads EVERY Pariwar) and unordered
  (`reports.ts:254-260`). Kinds: `cr` = a `claim_correction_reminders` row (reminder OR closure notice — filter by `purpose`), `ce` =
  `claim_certificate_reminders` (`correlation.ts:21-36`). `send_kind` CHECK `IN ('cr','ce','sn','pm')` (`0167:91`) and the CRQID grammar
  (`0167:50`) ⇒ a NEW send table would need a 6.37b CHECK + grammar change (LD2 (b)). `sms_send_deliveries` has ⛔ index on
  `delivery_state` and ⛔ DELETE ⇒ an unbounded scan grows forever (LD5 bounds it).

**The correction chase (as built)**
- **F6 — Persons and epochs.** `personKey` = `'nominee:<chain root>'` (`nomineePersonKey`, `correction-chase.ts:590-593`) or `'claimant'`
  (only when `claim_contacts.claimant_nominee_version_id IS NULL`, `:637-647`); D30 (`:615-618`). The current-number epoch = the evidential
  rows since the last change of `recipient_number_hash` (`evaluatePersonRunState` `:744-756`; `reset` when the current hash differs from the
  last row's). Hashes: a per-Pariwar blind index, field class `claim_contact_mobile` (`correction-crypto.ts:57-60`), compared timing-safe
  (`sameNumberHash`, `correction-closure.ts:324-327`). ⛔ Per-person state is stored — everything is derived from rows on every read. Each
  current-number hash costs one KMS HMAC with its own audit line under a global lock ([[project_kms_audit_per_hmac_global_lock]]).
- **F7 — D22 and the closure gate.** `reachedBySms` (`correction-closure.ts:373-375`); `reachedByLetter` (`:376`, epoch-blind);
  `numberKnownDead` (`:377-382`, the LAST evidential row dead — picks closure LETTER vs SMS in `closureNoticeRecipients` `:428-437`, frozen
  at `markClosed` `:897-923`). `assertClosureGround` (`:457-482`) order: `not_family_action` → `too_early` → `claim_routed_to_r9` →
  `claim_corrected` → `not_reached` (`:478-479`) → D14; four callers — `readClosureReadiness` `:754`, `requestCorrectionClosure` `:804`,
  `decideCorrectionClosure` `:978`, `decideEscalatedClosure` `:1309`; request / decide take `acquireCorrectionChaseLock` (`:179`, `:275`;
  the lock order — advisory THEN row — `:12-16`). A new refusal code must ALSO reach: the union `CorrectionClosureRefusal` (`:104-134`), the
  hand-kept `AC6_REQUEST_REFUSALS` (`:146-155`) pinned IN ORDER by `packages/contracts/tests/correction-closure-lockstep.test.ts:55-56`, the
  contracts `ClosureRequestBlocker` (`packages/contracts/src/claims/correction-closure.ts:84-96`), `blockerDto`
  (`apps/api/src/modules/claims/correction-closure-dto.ts:18-23` — THROWS on a code missing from the contract enum ⇒ the queue 500s), the
  exhaustive api switch `closureRefusalError` (`claims.correction-closure.handlers.ts:113+`), and the admin copy
  (`apps/admin/src/modules/correction-closure/i18n-en.ts`, `errors.ts`); `readClosureReadiness`'s `number_unverified` special case applies to
  `not_reached` only (`:762-765`).
- **F8 — The day-90 edge.** The sweep visits OPEN runs only (`claim-correction-reminders.ts:818`, `ended_at IS NULL`); `planRun` ends a
  run `day_90` / `superseded` (`:1034-1041`); every letter-chase / escalation write is guarded `slot < 90` (`:1239-1345`). A closure decided
  on a run already ended `day_90` keeps `end_reason = 'day_90'` (`endOpenRunDecided` is a no-op there, `correction-closure.ts:575-584`) — so `run_ended` / `day_90` alone does ⛔
  tell "closed" from "time ran out". The last reminder is day 84 (`correction-schedule.ts:24-26`). `closure_due` (days 90–96) and
  `closure_escalation` (day 97) fire whether or not anyone was reached (`packages/domain/src/claim/correction-closure-jobs.ts:259-290`;
  `:74-75`). The ended-run staff-row anchor: `latestRunOfReturn` / `staffWriter` (`correction-closure-jobs.ts:107-126`, `:163-188`).
- **F9 — The send table's constraints** (0128 / 0130 / 0135 — ⛔ trigger on any `claim_correction_*` table): purpose CHECK replaced in 0135
  (`:26-27`), lockstep with `CORRECTION_REMINDER_PURPOSES` (`schema/claim_correction_chase.ts:62-94`) AND the Drizzle `check()` copy
  (`:274-275`) and the policy spec (`packages/domain/tests/integration/rls/claim-correction-chase-policy-regression.spec.ts`, grant leg
  `:328-336`); outcome CHECK (`0128:57`); the slot UNIQUE `(run_id, slot_day, recipient_key, purpose, subject_key)` (`0128:75`); the
  `staff_push` day UNIQUE (`0128:77`); `run_id` NOT NULL FK; `sent_on` a DATE; `created_at`; UPDATE grant `0128:68`; `delivered_at` ⛔
  granted (`0128:64`, `:68`).
- **F10 — The send path.** The child `runCorrectionFamilySmsChild` (`claim-correction-reminders.ts:268-458`): stale-day guard → `beginCorrectionFamilySend`
  (the stops `correction-reminder-record.ts:429-463` — FIRST `run.endedAt !== null ⇒ run_ended` `:433`; hard-coded `purpose:'family_sms',
  subjectKey:''` `:409-417`) → commit → decrypt (`resolveCorrectionMobile`) → hash → send → `finaliseCorrectionReminder` (`:235-268`, stamps
  `updated_at = clock_timestamp()` `:256`). The exhausted finaliser is raw cross-tenant SQL over ALL purposes (`:734-745`) — it will
  finalise a stale `ladder_sms` row too (LD3's outcome table relies on it). Only the 10:00 cron times a send (`:91`, `:1411-1416`).
- **F11 — The staff view.** `correctionPersonStatus` (`correction-chase-read.ts:124-129`): `dead` ≻ `unreachable` ≻ `reached`
  (accepted > 0) ≻ `not_yet`; `deadKind` `'dead'` for `rejected_invalid_number`, else `'unreachable'` (`correction-chase.ts:766`; the union
  `:685`); `remindersAccepted` (`:229`); `escalated` = ANY `purpose='escalation'` row in the return (`:367-378`); the DTO `correctionChaseDto`
  (`claims.nominee-name-check.handlers.ts:804-834`); the contract enum `status: z.enum(['reached','dead','unreachable','not_yet'])`
  (`packages/contracts/src/claims/correction-chase.ts:158`; header `:10-13` — vocabularies re-declared by hand, ⛔ lockstep test).
- **F12 — The staff asks.** `letter_chase` to the District Admin on found-dead +7…+12 (`subject_key = personKey`) and ONE `escalation`
  to every Pariwar Admin on +13 (`claim-correction-reminders.ts:1253-1293`, gated `familyCanBeReminded && !track.letterDelivered &&
  !familyPaused`; offsets `correction-schedule.ts:35-37`), then one `staff_push` per staff member per day (dispatch `:616-631`; the day
  UNIQUE `0128:77`; `STAFF_PUSH_ITEM_PURPOSES` `:476-482`; the push copy is HARD-CODED English `correctionStaffPushText` `:485-499`; the
  "escalated" wording list `:494-496`). The family's correction reminder already says *"…or **the District Admin will contact you**"*
  (`en/claim.json:148`). Letters are capped at 2 per person per return (`CORRECTION_LETTERS_PER_PERSON`, `correction-reminder-record.ts:763`;
  `correction-letter.ts:249`).
- **F13 — The burst alarm** (`-269` §4): raw SQL `purpose='family_sms' AND outcome='rejected_unreachable' AND sent_on=$1`, threshold 3
  (`claim-correction-reminders.ts:747-763`, `:120`) — counts SEND-time refusals only.

**The certificate chase (as built)**
- **F14 — It never refuses, closes or time-limits a claim** (6.19d invariant 1); ⛔ "reached" consumer exists; B1's only effects are
  letter-eligibility (`certificate-reminder.ts:818`), the CR10 staff chase (`letter_chase` +7…+12, `letter_escalation` RECORD at +13 —
  ⛔ push in v1; `planCertificateStaffChase` `:875-925`, gated `if (!p.letterEligible || foundDeadOn === null || p.letter !== null) continue`)
  and the list's `sms_state` (`certificate-reminder-read.ts:190-210`). ONE letter per person per CLAIM, ever (`-275` Q1; enforced
  `certificate-letter.ts:234`, the per-number check `:237-239`). Schedule: `CORRECTION_REMINDER_DAYS` then `[120, 150, 180]`
  (`certificate-reminder-schedule.ts:17-23`); `planCertificateRun` (`certificate-reminder.ts:213-269`) returns, in this order: open ≻
  `completed` (day > 180 — BEFORE pause, `:252`) ≻ `certificate_received` ≻ pause ≻ continue; ends `superseded` / `completed` /
  `certificate_received`; a PAUSE (the claim outside `CLAIM_REVIEW_WINDOW_STATES`, or the anchor upload standing accepted — `-275` Q4) sends
  nothing; `NEVER_REENTERS` (`certificate-reminder-read.ts:42`) names states a claim never comes back from. The sweep visits OPEN runs
  (`claim-certificate-reminders.ts:260-291`); the CR10 chase runs only while the run is open and not paused (`:388-396`).
- **F15 — Its table** (0138 / 0141): purpose CHECK `{family_sms, letter_chase, letter_escalation}` (`0138:48`) pinned by
  `packages/domain/tests/integration/rls/claim-certificate-reminder-policy-regression.spec.ts:388` and the Drizzle `check()` copy
  (`schema/claim_certificate_reminder.ts:179-190`); `subject_key` CHECK `(purpose='family_sms') = (subject_key='')` (`0138:54`); the
  purpose↔outcome CHECK (0141); slot UNIQUE `(run_id, slot_day, recipient_key, purpose, subject_key)` (`0138:68`); `delivered_at` ⛔ granted
  (`:61`, spec `:307`); ⛔ trigger. Recipients = the CONTACT RECORD (CR6, `certificate-reminder.ts:605-659`); one text per NUMBER per slot
  (the `taken` check `certificate-reminder-record.ts:439-453` — compares slot-day LABELS). The certificate text does ⛔ promise District
  Admin contact (`en/claim.json:151`).
- **F16 — The two chases are separate machines** (tables, queues, sweeps, both 10:00 IST), can run on one claim at once, share person keys
  (`certificate-reminder.ts:519`) and hashes, and the certificate chase ⛔ feeds the correction closure (6.19d invariant 2;
  `correction-closure.ts:779`).

**The staff record precedents and the call**
- **F17 — ⛔ notion of a phone call exists.** The letter record is the precedent end to end: table `claim_correction_letters` (0129);
  domain `correction-letter.ts` (refusal union `:52-74`; `recordCorrectionLetter` under `acquireCorrectionChaseLock`); contracts
  `packages/contracts/src/claims/correction-chase.ts` (`:82-117`); api `claims.correction-chase.{routes,handlers}.ts` — paths
  `/api/v1/p/:pariwarId/admin/claims/:claimCaseId/correction/…` (pre-handler chain `[adminSession, scope, resolveNomineeNameCheckDistrict(),
  requirePermissionHook(KEY, {dimension:'district'})]`) and `/admin/claims/:claimCaseId/certificate-reminders/…` (`claims.certificate-reminder.routes.ts:81`);
  `emitAuthAudit(… 'admin_claim_correction.letter_recorded', { resourceLocator: 'claim:<lower uuid>' })` after commit (`audit-sink.ts:338-347`);
  admin `apps/admin/src/modules/correction-chase/{CorrectionChasePanel,CorrectionLetterForm}.tsx`, `errors.ts`, `i18n-en.ts`; the step-up
  context precedent `correction_letter_address` (+ the admin's copy of the constant, `apps/admin/src/api/client.ts:1622`). The key
  `claim.record_correction_letter` (`permissions.ts:1048`, `district_admin` + derived `super_admin`; catalog `PERMISSION_CATALOG_VERSION = 52`
  `:770`; pin `permissions.test.ts:232-234`) was reused by 6.19c and 6.19d *"the same act, the same holder"*. The route gate
  `scripts/claim-adjudication-human-actor-invariant/check.ts` matches the correction-chase file by `pathSubstrings: ['/correction/']`
  (`:212`) and scans ONLY matched paths (`:382-386`) — a path outside it is UNSCANNED (`COVERAGE_SET` `:46`, `expectedMethods` `:211-214`,
  floor `:347`). The letter route has ⛔ idempotency key; a call has ⛔ natural cap ⇒ the keyed store (`idempotency.createKeyedStore`;
  mandatory-key precedent `claims.ground-inspection.handlers.ts:398-403`; [[project_idempotent_write_handler_shape]]).

**Governance and numbers**
- **F18 — Numbers (checked across every ref and the three worktrees).** Decision: head `-353` ⇒ next **`-354`**. Migration: 0167 =
  6.37b (`f7e695b7`); 6.31 plans 0167 PROVISIONALLY ⇒ this story takes the **next free at Task 0** (0168 if 6.31 has not committed one,
  else 0169), journal `when` = previous + 1 ms (`1794195600012` after 0167's `…011`). ADR: ⛔ needed. Roster: ONE new row if LD11 (a)
  (next free — Row 34 if 6.31 has not taken it). Ledger: this create-story = `2026-10-17u` (agreed with the 6.37b session, which took `t`);
  Task 0's = the next free then.
- **F19 — The Panel pack and the §3.4 amendment are PREPARED / DRAFTED, ⛔ sent, ⛔ ratified** (pack *"PREPARED, not yet presented"*;
  proposal *"DRAFTED 2026-10-17 — not yet presented"*; ⛔ decision entry approving either). Its new §3.4 bullet names *"roster row
  `6-37c-undelivered-reminder-ladder`'s gate"* — a SPRINT row, and the WRONG row under LD1 (a). Because the Panel would RATIFY that sentence
  (a ratified sentence is superseded, ⛔ re-read — [[feedback_supersede_never_reinterpret]]), it is CORRECTED in place while it is still
  unpresented (it was revised before, `c46402cd`) — Task 0.4. G1's CALL half stays in THIS row (LD11), its WhatsApp half goes to 6-37d.
- **F20 — The WhatsApp infrastructure cannot do the ladder's step today** (why LD1): ⛔ path messages a NON-member (the one live WA call
  site is member-gated — `contribution-notify.ts:246` → `resolveWaTarget`, `packages/domain/src/notifications/delivery.ts:116-148`);
  `whatsapp-app.ts` sends ONE body value (`:46-47`) with ⛔ timeout (`:169-176`), the reminder has two; `pariwar_wa_templates` holds one
  template per `AlertCategory` (CHECK-locked, `0038:61,63`); the status store is LATEST-WINS (`wa-status.ts:32-45`, pinned
  `wa-status.spec.ts:19`) and the drain is at-most-once (`packages/domain/src/wa-opt-in/webhook-events.ts:58-75`) ⇒ "ever delivered" is ⛔
  readable; a STOP from a non-member is ignored (`wa-webhook-processor.ts:268-279`); a failed claim send with 131026 / 131049 to someone who
  is ALSO an opted-in member would REVOKE their member opt-in (`:110`, `:356-368`); ⛔ claim-contact template is Meta-approved; 6.31 (the
  first direct WA sender) has ⛔ code yet (`29320851`). The +4 h step is also sub-daily — the 10:00 rhythm (I8) cannot carry it as an SMS.
- **F21 — The agreement as built** names *"by text message and by post"* only (`packages/i18n/locales/en/claim.json:139`, hi `:139`;
  the server copy `apps/api/src/modules/claims/claim-contact-copy.ts:19-24`, version `'2026-09-28.v1-pending-story-0.13'`, pinned
  byte-identical by `apps/api/tests/unit/claim-contact-copy.test.ts:24-31`); the version lives only in `consent_payload` JSON and the
  reader ignores it (`claim-contact-check.ts:120-132`); roster Row 18 (counsel) covers SMS and post only. ⇒ a CLAIMANT call rides on
  `-351`'s reading (*"The call half of the escalation is not held"* — the correction text promises *"the District Admin will contact you"*),
  ⛔ on the agreement (disclosed in LD11).

## ⚖️ Build decisions LD1–LD14 (PROPOSED — ⏳ BigDev at Task 0.2; each with its recommendation and its cost)

- **LD1 — Story shape: the WhatsApp step and the agreement's new wording move to a NEW row `6-37d-claim-contact-whatsapp-step`.**
  ⭐ **(a) Recommended.** 6.37c builds the ladder with step 1 RECORDED `skipped:whatsapp_not_built` and goes on to the 48-hour SMS —
  `-351`'s recorded reading. 6-37d (backlog; AFTER 6.31 and 6.37c) builds: the filing agreement's `-352` Q1 wording (en + reviewed hi) with
  a BUMPED copy version and a version-aware reader (G3, F21); the nominees removed from it (and Row 18's question re-put to counsel); the
  claim-contact WhatsApp templates (Meta, en + hi); a direct non-member sender (on 6.31's client work); a sub-daily step; claim-contact STOP;
  an absorbing WA "ever delivered" read; the member-opt-in side-effect isolation (F20); the nominee step behind the §3.4 amendment + G1 + G2;
  and the G1 (WhatsApp half) / G2 / G3 roster row. It SUPERSEDES `-353` decision 1 IN PART (those items move rows) and NARROWS `-351`
  Consequence 2 (*"built but off"* — built in 6-37d instead), and states that roster Row 32 note (9)'s *"6-37c is `done`"* does ⛔ wait for
  6-37d — the gap `-350` closed (a reported failure counting as reached) is closed WITHOUT WhatsApp, and the ladder without its WhatsApp
  step is `-351`'s own reading. **Cost:** families get ⛔ WhatsApp until 6-37d; nothing is sent between hour 4 and day 2. **(b)** everything
  in 6.37c — F20's whole list on top of the ladder, racing 6.31 on `whatsapp-app.ts`, `contribution-providers.ts`, `boot.ts` and the queue
  index; the agreement re-wording sits in counsel's open Row 18 anyway. **(c)** the WhatsApp step built DARK here (code before §3.4 is
  ratified; its tests drive a send that cannot go; a sub-daily sweep for one dark step).
- **LD2 — Where a ladder lives.** ⭐ **(a) Recommended:** ONE new tenant table `claim_contact_ladders` + each ladder SMS as a NEW-PURPOSE
  row `ladder_sms` in the chase's OWN send table (`claim_correction_reminders` / `claim_certificate_reminders`) — so its CRQID is `cr` / `ce`
  with the row's own uuid and 6.37b's inbox, grammar and `sms_send_deliveries` need ⛔ change, only the `cr` purpose filters widened (F4).
  `subject_key = 'ladder:<ladder_id>:<step>'` (step `2` / `3`); `run_id` = the ladder's origin run (an ENDED run is fine — the 6.19c
  closure-notice precedent); `slot_day` = the run day of the step's DUE DATE, fixed when the row is first claimed (a label — a retry
  re-claims the SAME row); `sent_on` = the due date. ⚠ Every `family_sms`-filtered reader IGNORES `ladder_sms` by construction
  (`readReturnFamilyRows` `:634`, `readRunFamilyRows` `:513`, the burst alarm, the D30 `DISTINCT ON` `:1146-1153`,
  `readClaimCertificateFamilyRows` `:721`, `certificateRecordedDays`) — that is the POINT: a ladder SMS never suppresses a scheduled slot and
  never changes `numberKnownDead` / `remindersAccepted`; its reach is added on purpose (LD8). A NEW partial UNIQUE on each send table
  `(claim_case_id, subject_key) WHERE purpose IN ('ladder_sms','ladder_escalation')` (the slot UNIQUE includes `slot_day` and `recipient_key`
  and would ⛔ enforce "one per ladder step"). The ladder table: `ladder_id uuid PK DEFAULT gen_random_uuid()`, `pariwar_id`, `claim_case_id`
  FK, `chase` (`correction|certificate`), `run_id` (the origin's run; ⛔ FK across two run tables — the kind-discriminated precedent,
  [[project_pool_primitive_substrate]]), `return_decision_id` (correction only — the return scope every reader keys on), `person_key`,
  `recipient_number_hash` (the origin's — same type as the send tables'), `origin_row_id uuid`, `origin_sent_on date`, `whatsapp_step text
  NOT NULL` (CHECK `^(pending|skipped:[a-z_]{1,48})$` so 6-37d can add values), `sms2_due_on date`, `sms2_state` / `sms3_state`
  (`pending|sent|satisfied|skipped:<reason>`), `sms2_row_id`, `sms3_row_id`, `sms3_due_on`, `conclude_on date`, `state`
  (`running|ended_delivered|ended_call|ended_number_changed|ended_stopped|concluded_undelivered`), `end_detail` (≤ 64 `[a-z_:]`), `ended_at`,
  `concluded_on date`, `created_at`. CHECKs: state ↔ `ended_at` pair; `concluded_on` NOT NULL ⇔ `concluded_undelivered`. Partial UNIQUE
  `(claim_case_id, chase, person_key) WHERE state = 'running'` (I5); UNIQUE `(chase, origin_row_id)`; an index `(state, conclude_on)`.
  Tenant RLS per command (the 0128 / 0167 shape); grants G-a (`-347` DR5-G's house shape): `SELECT, INSERT` + `UPDATE` of the mutable
  columns only (⛔ identity columns; ⛔ DELETE); a comment naming roster Row 26. **Cost:** two purpose CHECK replacements (correction
  0135-style; certificate 0138 + 0141's purpose↔outcome) + TS tuples + Drizzle `check()` copies + policy-spec legs in lockstep (T9). **(b)**
  a new send table with kind `ld` — 6.37b's `send_kind` CHECK, CRQID grammar, correlator lookup and the wrapper's kind derivation all change.
  **(c)** ladder SMS as `family_sms` rows — REFUSED: they would enter the catch-up's recorded set and SUPPRESS real scheduled reminders, and
  join D22 / epochs / `numberKnownDead` / the burst alarm as ordinary reminders.
- **LD3 — The clock: DATES and the 10:00 rhythm (the author's — the follow-up note's §0; ⚠ disclosed as NOT RATIFIED).** The reminders'
  ratified rhythm is *"One message a day, at 10:00 in the morning"* (`-250` #5, *"the 10:00 hour is now the Panel's"*), and the origin was
  sent at ≈ 10:00 on `origin_sent_on` (D). Steps are IST DATES, sent by a 10:00 sweep (`'0 10 * * *'`, `tz: 'Asia/Kolkata'` — the chases'
  own cron): **SMS 2 on D + 2** (= 48 h); **SMS 3 on <SMS 2's date> + 2** (*"48 hours after the second"*); **conclude on <SMS 3's date> + 4**
  (*"waited 96 hours"*) ⇒ D + 8 (192 h) when nothing slips; the WhatsApp step (D + 4 h) is recorded skipped (LD1 (a)). A step whose date
  has passed when the ladder starts (a report seen late — F3) is due on the run AFTER the one that starts the ladder (⛔ two steps in one run); every later date moves
  with it. ⚠ **The horizon (I6, PQ3):** ⛔ ladder SMS on correction day ≥ 90, on a certificate run `completed` (day > 180), or while a
  certificate run is paused; such a step is recorded `skipped:past_horizon` / `skipped:paused` (the clock runs on — ⛔ a hold) and the
  ladder CONCLUDES on its date (its `ladder_escalation` is written only on a day the run is not paused — LD9) — our reading of how `-351` 6 A's *"at most about a week past day 90"* and `-250` #5's *"stop at day 90"* fit
  together (PQ3 asks). ⭐ **What each ladder SMS outcome does to its step** (the core's outcomes, F10):

  | Row outcome | Step | Next date counts from |
  |---|---|---|
  | `accepted` | `sent` | the row's `sent_on` |
  | `rejected_invalid_number` / `rejected_unreachable` / `no_target` | `sent` (the attempt was made; the number is dead at send — ⛔ a reach; ⚠ the ladder still waits for its conclusion date — disclosed, Policy meaning) | its `sent_on` |
  | a transient (the row stays `attempting`) | retried within the same run's backoff only (*"60 s with backoff over 4 tries … ⛔ never a day"*, `claim-correction-reminders.ts:715-716`); a row still `attempting` from a previous IST day is finalised `error` by the exhausted finaliser (or treated as `error` by the ladder sweep if it runs first) ⇒ `sent` | its `sent_on` |
  | `error` (any final) | `sent` (one attempt, as a scheduled slot spends its day — `-349` FOUND (a)) | its `sent_on` |
  | refused by a stop (LD5) | ⛔ a step — the ladder ENDS `ended_stopped:<reason>` | — |
  | refused by the horizon / pause | `skipped:past_horizon` / `skipped:paused` | the due date |
  | refused by I8's one-a-day (LD4) | `satisfied` | the due date |

  **Cost:** a step can slip to the next morning; a late report (F3) stretches the ladder — and the closure hold — past the *"about a week
  past day 90"* the Panel was told (disclosed in the PQ note's E3 and the Policy meaning).
- **LD4 — One message a day: a scheduled day IS the step (⚠ flagged for BigDev's §0 check — it changes how many texts a family gets).**
  ⭐ **(a) Recommended:** on a date the chase has a scheduled reminder slot for ANY person of that claim and chase whose current number hash equals the
  ladder's (the run is open and the run day is in
  `CORRECTION_REMINDER_DAYS` / the certificate days — computed from the SCHEDULE, ⛔ by watching for a sent row, so ⛔ race with the 10:00
  chase sweep), the ladder does ⛔ send: the step is `satisfied` (the scheduled reminder, whatever its outcome, is that day's SMS — its row id
  recorded when found). And, under the chase lock, the ladder child refuses (step `satisfied`) when ANY `family_sms` / `ladder_sms` row of
  that claim and chase to that NUMBER (any person — T22) has `sent_on = today`. For an origin on days 1–3 the ladder adds ⛔ extra SMS (days 3, 5, 7
  are scheduled); from day 4 it adds one or two (e.g. day 4 ⇒ day 8; day 7 ⇒ days 9, 11). This MATCHES `-250` #5 (*"One message a day"*) and meets *"try again with SMS
  one more time"*; the family never gets more texts than the Panel was told (*"up to two extra SMS"*). **Cost:** for an early-week origin the
  ladder's value is the conclusion and the closure hold only. **(b)** always a separate ladder SMS (two identical texts on a scheduled morning —
  against `-250` #5).
- **LD5 — What starts, stops and ends a ladder** (the start, every state move and every send-begin under the chase's lock —
  `acquireCorrectionChaseLock` / `lockCertificateClaim` — the lock the closure request / decide take, F7 — so `ladder_running` at decide is ⛔
  a check-then-act race). **Start** (the 10:00 sweep, per chase, per person; the candidate scan bounded to `family_sms` rows with `sent_on`
  within the last 14 days — ⛔ an unbounded scan of `sms_send_deliveries`, F5): a `family_sms` row `accepted` whose `sms_send_deliveries`
  state is `undelivered` (filtered by `pariwar_id` — T12); ⛔ running ladder for (claim, chase, person); the row's `recipient_number_hash`
  = the person's CURRENT number hash (an old-number failure starts nothing); ⛔ `family_sms` / `ladder_sms` row of that chase to that person
  on that number CREATED after the origin (`created_at > origin.created_at`) is `delivered` (4 A — already reached); ⛔ call recorded
  `reached` for that person on/after the origin's `sent_on`; ⛔ ladder CONCLUDED for (claim, chase, person, number) in the CURRENT epoch — ⚠ **the no-restart rule
  (flagged for BigDev's §0 check):** a person already concluded on that number is letter-eligible and `foundDeadOn` is sticky, so a second
  ladder would only add texts (a dead phone would otherwise get a new ladder about every 8 days to day 84 — nine ladders, eighteen extra
  SMS — against `-350` Consequence 3 and the Panel's refusal of one ladder per reminder, Q4 B); a ladder that ENDED (delivered / call /
  number changed / stopped) may be followed by a new one on a NEW failure; a person already dead AT SEND in the epoch may still start one
  (their later accepted rows count for D22, so the ladder's closure hold matters); and the stop predicate (I6). ⚠ The ORIGIN = the EARLIEST such row
  in the epoch not covered by an ended or concluded ladder. **Stop predicates** (extracted, I6 — Task 3): correction — the stops of
  `beginCorrectionFamilySend` with `run_ended` allowed ONLY for `end_reason = 'day_90'`, PLUS ⭐ `closure_closed` (the return's
  `claim_correction_closures` row is `closed`, or the claim is in a terminal state — F8: `day_90` alone does ⛔ say whether a closure was
  decided); certificate — `certificateFamilyStopReason` reads the ladder's ORIGIN run by `run_id` (open OR ended — `planCertificateRun` reads only
  `f.openRun` and, once the day-181 sweep ends a run `completed`, never returns `completed` again, `certificate-reminder.ts:246-252`;
  `beginCertificateFamilySend` maps anything but `continue` to `run_ended`, `certificate-reminder-record.ts:404`): ended `superseded` /
  `certificate_received` ⇒ END; otherwise, IN THIS ORDER, the certificate received (the run's anchor against the current upload / status) ⇒
  END; the pause reasons — `certificate_accepted` or a state in `NEVER_REENTERS` (moved out of the read model and exported — it is
  module-private at `certificate-reminder-read.ts:42`) ⇒ END, any other pause ⇒ the step `skipped:paused` (I6, LD3 — ⛔ a hold);
  `recipients.cannotRemind` (`certificate-reminder-record.ts:408`) ⇒ END; and only then the horizon (run day > 180, the run open or ended
  `completed`) ⇒ `skipped:past_horizon`. ⛔ `planCertificateRun`'s sweep order (completed BEFORE received / pause — it ends RUNS, ⛔ ladders). Checked at start, before each send and before conclusion / `ladder_escalation`. **End `ended_delivered`:** a
  `delivered` report on ANY `family_sms` or `ladder_sms` row of THAT chase to that person's number created after the origin — incl. a row
  sent to ANOTHER person of the claim on the same number that satisfied this person's step (T22) (PQ2 (a) asks whether the OTHER chase's
  delivered message also ends it — our reading ⛔). **End `ended_call`:** a call recorded `reached` for that person with `called_on ≥`
  `origin_sent_on` (LD10 — the call is a fact about the PERSON, so it ends a running ladder of EITHER chase — disclosed in PQ2). **End
  `ended_number_changed`:** the person's current number hash ≠ the ladder's (hash only at start, before a send and at conclusion —
  F6's KMS cost; between them the version-unchanged convention `currentNumberHash: undefined`). **End `ended_stopped:<reason>`:** a stop.
  ⚠ **A step with NO report (silence) does ⛔ end a ladder** — our reading of 4 A's *"IS delivered"* (PQ1 asks). **Conclude** on `conclude_on`
  when ⛔ end condition has fired ⇒ `concluded_undelivered`, `concluded_on` = the IST date the sweep concluded it (= `conclude_on` unless a
  run was missed). A `delivered` report arriving AFTER conclusion: ⛔
  un-conclude — the person counts as reached through that accepted row (D22, as for any accepted row) and stays letter-eligible (LD6), as
  for a send-time refusal today.
- **LD6 — What a conclusion un-counts (the B1 mapping — I3, I4).** Inside each chase's row reader (gaining `reminder_id` and a LEFT JOIN on
  `claim_contact_ladders` + `sms_send_deliveries` for (`cr`|`ce`, `reminder_id`), scoped to the return (`run.return_decision_id`) as the
  reader already is): a `family_sms` row that is `accepted`, whose `sms_send_deliveries` state is `undelivered`, on the number of a
  `concluded_undelivered` ladder of that person and chase, and created at/after that ladder's origin IN THE SAME EPOCH (⛔ a row of another hash
  created between the origin and it — a number changed A→B→A starts a new epoch; OPEN-ended within the epoch — the no-restart rule means
  every later reported failure on that number in it belongs to it), reads with EFFECTIVE outcome `rejected_unreachable`,
  `deadOn = concluded_on`, `concluded: true`. Every other row reads as stored — incl. an `accepted` row with ⛔ report (`-351` 1 A) and every
  row of a RUNNING or ENDED ladder. ⛔ A stored outcome changes (I2). ⇒ by construction: D22 `reachedBySms` stops counting the concluded rows;
  `foundDeadOn` is set (letter-eligible on BOTH chases — `correction-letter.ts:185-187`, `certificate-reminder.ts:818`); `numberKnownDead`
  follows if the LAST evidential row is a concluded one (⇒ closure notice by LETTER, `closureNoticeRecipients` `:435`); the queue status
  `unreachable`; the letter track starts. ⚠ The record-derived queue lines and the D30 sweep path read rows WITHOUT crypto
  (`correction-chase-read.ts:345`, `claim-correction-reminders.ts:1167`) — they judge on the recorded epoch, as today.
- **LD7 — The found-dead DATE of a concluded reminder = `concluded_on`, and `foundDeadOn` = the EARLIEST dead date in the epoch.** `-250`
  #2: the letter chase *"counts from the day the phone was found dead"* — under a ladder that is the day the system concluded it (with
  `sent_on` the +7 chase would be overdue on the day of conclusion). The row type gains OPTIONAL `deadOn?: string` and `concluded?: true` (set only
  by the mapping); `evaluatePersonRunState` computes `foundDeadOn = min over the epoch's dead rows of (deadOn ?? sentOn)` and takes `deadKind` from
  THAT row (⛔ "the first row in time order" — a concluded origin sent on day 1 but dated day 9 must ⛔ push a day-5 send-time refusal's
  found-dead date to day 9, `correction-chase.ts:757`); `deadKind` gains `'not_delivered'` (iff the chosen dead row has `concluded`); `correctionPersonStatus`
  (`correction-chase-read.ts:124-129`) maps it to `unreachable` (else it falls through to `reached` / `not_yet`). ⛔ Its OUTCOME logic
  changes (I3). **Cost:** a shared pure function gains one optional input — both chases' tests pin the default (⛔ `deadOn` ⇒ today's result).
- **LD8 — D22 and the closure hold (`-351` 4 A, 5 A, 6 A).** `evaluateClosurePersonReach` (`correction-closure.ts:365-392`) gains
  `reachedByLadderSms` — any correction `ladder_sms` row of that person, scoped to the return, `accepted`, on the current number, whose OWN
  `sms_send_deliveries` state is ⛔ `undelivered` (so a SILENT ladder SMS counts — `-351` 1 A, PQ1's reading) — read by ONE new reader beside
  `readReturnFamilyRows` (⛔ widening it — LD2), and `reachedByCall` — any call recorded `reached` for that person on/after the return's
  first family run's start (LD10); `reached = sms || ladderSms || letter || call`. `assertClosureGround` gains `ladder_running` — ANY
  correction ladder `running` for any person of the claim's live return — placed AFTER `claim_corrected` and BEFORE `not_reached` (so staff
  see WHY) in the guard, the union, `AC6_REQUEST_REFUSALS` (its lockstep test pins the literal against the contract's order — ⛔ `assertClosureGround`'s own order) and `ClosureRequestBlocker`; at ALL four callers
  by construction; plus F7's list (`blockerDto`, the api switch, admin copy). ⚠ A running CERTIFICATE ladder does ⛔ hold the correction
  closure (our reading — 6.19d invariant 2; PQ2 (b) asks). `closure_due` / `closure_escalation` keep firing (`readClosureReadiness` shows
  `ladder_running`; ⛔ change to `correction-closure-jobs.ts` — a staff prompt, ⛔ what a family receives). The frozen closure notice: a ladder
  cannot be running at decide (the gate) and ⛔ ladder starts after a closure (`closure_closed`, LD5).
- **LD9 — The escalation "for a call or a letter" (`-350` ruling 2, `-351` 5 A; ⚠ the reached-call half flagged for BigDev's §0 check).** On
  conclusion the sweep writes ONE staff row per ladder, purpose `ladder_escalation` (NEW on both send tables, `subject_key =
  'ladder:<ladder_id>'`, `outcome 'recorded'`, the new partial UNIQUE), to the claim's live District Admin (correction: the `letter_chase`
  recipient rule; certificate: the live shepherd, as CR10) — on the return's LATEST run even if ended (the `staffWriter` anchor, F8 — exported for
  this; correction) / the origin run (certificate), and only on a day the run is not paused (certificate). Correction: pushed (added to
  `STAFF_PUSH_ITEM_PURPOSES` and the push query; the ladder sweep issues the push itself whenever ⛔ `staff_push` exists for that staff
  member today — open or ended run — under the day UNIQUE; if one already went, the item rides the next morning's push); certificate: RECORDED only (CR10 — ⛔ push in v1). The ask
  is CAP-AWARE: "call or post a letter"; "call" only when the letter cap is reached (correction 2 per person per return — F12; certificate
  one per claim, ever — F14); "post a letter" only for a nominee under LD11 (a); "neither is possible — escalate" when both are closed (a
  nominee at the certificate letter cap before counsel). The existing found-dead letter track (+7…+12 / +13) then runs FROM `concluded_on`
  (LD7) where its window allows (open run, `slot < 90` / not paused) — its rules unchanged. ⭐ A call recorded `reached` stops the staff asks
  ONLY for a person whose dead outcome is a CONCLUDED one (`deadKind 'not_delivered'`): `planRun` and `planCertificateStaffChase` gain a
  per-person `reachedCallOn` (scoped to the epoch like `letterDelivered`) consulted only then — that MATCHES `-351` 5 A (*"asked to call or
  post"*, satisfied by either); for a SEND-time dead number the letter track is unchanged (`-230` / `-231` C — a dead number is answered by
  POSTED LETTERS — a reached call stopping it there would NARROW them ⇒ the Panel's, ⛔ built). ⛔ The scheduled family reminders change (their
  stop stays `-250` #1, a DELIVERED letter). `escalated` on the correction queue counts `purpose='escalation'` only — `ladder_escalation` does
  ⛔ light it. **Cost:** a day-84 ladder concluding ≈ day 92 gets the `ladder_escalation` + push, but ⛔ +7…+13 chase (the run is ended — as
  today for a number refused on day 84).
- **LD10 — The call record.** NEW tenant table `claim_contact_calls` (append-only): `call_id`, `pariwar_id`, `claim_case_id` FK,
  `person_key` (the chase grammar), `chase` (`correction|certificate` — the surface it was recorded from; ⛔ a reach scope), `ladder_id`
  (nullable), `called_on date` (IST; ≤ today; ≥ the claim's filing date), `answered_by` (`the_person|family_member|someone_else|nobody`),
  `outcome` (`reached|not_reached`; CHECK `outcome='reached' ⇒ answered_by IN ('the_person','family_member')`), `recorded_by_actor`,
  `recorded_by_display` (`getDisplayName` — [[project_admin_display_name_attribution]]), `created_at` (`clock_timestamp()`). ⛔ free text, ⛔
  names, ⛔ a number (*"who answered"* as a role — `-351` 5 A's reading). GRANT `SELECT, INSERT` only; tenant RLS per command;
  policy-regression spec. Routes, in the EXISTING route files and path grammar (so the district resolver and the human-actor gate apply — F17):
  `POST /api/v1/p/:pariwarId/admin/claims/:claimCaseId/correction/calls`, `GET …/correction/calls/number?person_key=`, `POST
  …/admin/claims/:claimCaseId/certificate-reminders/calls`, `GET …/certificate-reminders/calls/number?person_key=`. Each POST takes a
  MANDATORY `Idempotency-Key` (the keyed store); each GET is behind a NEW step-up context `contact_call_number` (the constant in BOTH
  `apps/api` and `apps/admin/src/api/client.ts`), decrypts the person's CURRENT number through the reminders' resolver (after a 6.20 change:
  the new number), writes ONE audit line per reveal, `Cache-Control: no-store`. Audit: `admin_claim_correction.call_recorded`,
  `…call_number_revealed`, `admin_claim_certificate.call_recorded`, `…call_number_revealed` (the `AuthAuditEventType` union; locator
  `claim:<lower uuid>`; ⛔ PII in `context`). Preconditions: a contact record + live agreement (D30 — as letters); the person on the chase's
  recipient set; LD11. **Locks:** a call that may end ladders of BOTH chases takes `acquireCorrectionChaseLock` THEN `lockCertificateClaim`
  (advisory THEN row — `correction-closure.ts:12-16`); the ladder sweep re-reads calls inside each chase's lock before an end / conclude.
  **Key — ⭐ (a) Recommended:** REUSE `claim.record_correction_letter` (same holder, same act family; the 6.19c / 6.19d precedent; catalog
  stays 52 / 68). **(b)** mint `claim.record_contact_call` (catalog 52 → 53, authorised in `-354` first). ⭐ A reached call: ⇒ D22
  `reachedByCall` (LD8 — a call recorded from either surface counts for the correction closure, because it reached the PERSON; disclosed in
  PQ2); ⇒ ends that person's running ladder(s) whose `origin_sent_on` ≤ `called_on` (LD5); ⇒ stops their asks if concluded (LD9); ⇒ ⛔ changes
  letter-eligibility or the scheduled reminders.
- **LD11 — Calls to a NOMINEE before counsel (⚠ BigDev's — `-352` Consequence 3 calls it *"BigDev's decision, recorded separately"*; ⛔
  recorded yet; it NARROWS `-352` Q2 and `-351` 5 A for nominees).** ⭐ **(a) Recommended:** the conclusion's ask for a NOMINEE reads "post a
  letter" (LD9), and the call routes refuse a nominee person key (`nominee_calls_not_cleared`) and its number reveal until a per-deployment
  config key `claim.contact.nominee_calls_cleared` reads `true` (registered where the api's other boolean config keys are — Task 6); the key
  may be set ONLY when a NEW roster row (next free — F18) `claim-contact-nominee-call-basis` closes on counsel's written basis (G1's call
  half). The claimant's calls are live — on `-351`'s reading, ⛔ on the agreement (F21; disclosed). **Cost:** a nominee is reached only by
  post until counsel answers (and at the certificate letter cap, not at all — LD9's "neither"); a DA who phoned a nominee anyway cannot record
  it. **(b)** both live now (`-351`'s reading for everyone) — a nominee is called on a basis counsel has ⛔ confirmed (`-352` (a)). **(c)**
  calls to nobody until counsel — beyond `-352` C3. **(d)** both built live, and the nominee-call condition held ONLY as a closure leg of
  the new roster row that must close before claim texts go live (`-352` C3's own form; the product is ⛔ in production —
  [[project_not_in_production_merge_is_not_golive]]) — cost: counsel's answer then gates EVERY claim text, ⛔ only nominee calls.
- **LD12 — What staff see (fires the deferred *"⛔ Staff view labels a send 'reported undelivered'"* — its trigger is THIS create-story).**
  Correction: `CorrectionChasePersonDto` gains `follow_up: { state: 'running'|'concluded'|'ended_delivered'|'ended_call'|'ended_other',
  started_on, next_step_on, concluded_on } | null` (the person's LATEST ladder in the return), `unreachable_reason: 'refused'|'not_delivered'|null`,
  `reported_undelivered: number` (accepted reminders in the epoch whose report says undelivered), `ask: 'call_or_letter'|'call'|'letter'|'none'|null`
  (LD9), and `calls: ContactCallDto[]`; the status enum is UNCHANGED (F11). Certificate: `CertificateReminderPersonDto` gains the same
  `follow_up`, `unreachable_reason`, `ask`, `calls`; `sms_state` gains ⛔ value (a concluded person shows `unreachable` with reason
  `not_delivered`; the copy *"this person's number does not work"* (`certificate-reminders/i18n-en.ts:53`) becomes reason-aware). Admin:
  both panels show "Follow-up texts running — next on <date>", "Texts were reported not delivered — <the ask>", the call form and the call
  list. Contracts re-declare the vocabularies by hand (F11); contracts tests run outside tsc ([[project_contracts_tests_outside_tsc]]).
  Peer-mesh / suspicion views: ⛔ (the deferred item's peer-mesh part stays).
- **LD13 — Alarms and the burst.** The `-269` §4 burst alarm (F13) is ⛔ extended (it counts SEND-time refusals — a different signal). NEW:
  a daily ladder line `[jobs] contact-ladder: started N, ended_delivered N, ended_call N, concluded N` and an alarm
  `contact_ladder.burst:<count>` when ≥ 3 ladders START in one Pariwar on one IST day (a DLT scrub / template fault makes EVERY report
  undelivered ⇒ every person gets a ladder, more failing texts and a conclusion — the alarm is the pointer; logs only until Row 32 (h)). ⛔ an
  id, number or name in a line.
- **LD14 — Records.** (a) ONE author-commit `2026-10-17-354` (or the next free id, re-grepped on EVERY branch and worktree right before)
  carrying LD1–LD13 as answered + the supersessions (the ONE copy): `-353` decision 1 IN PART (LD1); `-353` decision 2's *"move to 6-37c
  unchanged"* (AC11 is re-written — F1, `-351` 3 B); (⛔ a supersession: `-353` decision 1's *"its `epics.md` entry is owed at its create-story"* was DISCHARGED at create-story —
  Task 0.4 adds the decided shape as a dated note); `-351` Consequence 2's *"built but off"* (LD1 —
  NARROWED); `-352` C3's *"BigDev's decision, recorded separately"* — RECORDED here as LD11, which NARROWS `-352` Q2 / `-351` 5 A for
  nominees; the 6.37b story file's AC11 / Task 7 lines (F1) and *"the certificate chase's letter-eligibility is unchanged"* (superseded by
  `-351` 3 B — recorded, ⛔ an edit); the 6.37b I1 restated (I1 here). (b) Records commit: a dated note under the `epics.md` `### Story 6.37c`
  entry (the decided shape) and under 6.37b's (its *"Task 7 waits for that ruling"* is stale — ⛔ edited); the sprint rows (6-37c →
  `in-progress`; NEW `6-37d-claim-contact-whatsapp-step: backlog` with its comment, if LD1 (a)); roster Row 32 note (9.1) (6-37c `done` does ⛔
  need 6-37d); Row 26 note (the ladder sweep joins the jobs-role list); Row 18 note (`-352` moves the nominee basis off the claimant's
  agreement; claimant calls ride on `-351`'s reading — F21); the NEW nominee-call roster row (LD11 (a) / (d)); ADR-0042 dated note (I1's
  forgery lines); the §3.4 proposal's bullet and the Panel pack's row references CORRECTED in place while unpresented, with a revision line
  (F19 — 6-37d for WhatsApp; this row for G1's call half). (c) ⛔ new ADR (the ladder is domain logic on existing transports). (d) The
  deferred *"`delivered_at` … an unused seam"* item's trigger FIRES (this migration touches both tables): ⭐ recommended — keep it unused
  (delivery lives in `sms_send_deliveries`, `-347` DR5) and record that in `-354`, the item **Closed by** `-354`.

## 🏛️ Candidate Panel questions (⏳ §0 check by BigDev at Task 0.2; routed at Task 0.3 only if they pass — ⛔ answered here)

- **PQ1 — A follow-up text that gets NO report at all.** `-351` 1 A *"A text with no report keeps counting as reaching the person"* meets
  4 A *"any message to that person that IS delivered … ends it"*. If ladder SMS 2 or 3 is accepted and NO report ever comes (MSG91's webhook
  paused, an account fault — 6.37b F6 / F8), does the ladder end with the person reached (1 A), or run on to its conclusion and the call /
  letter ask (4 A)? §0: passes — it decides who is offered a letter and whether the District Admin is asked to call, and two ratified clauses
  meet at an edge. **Our reading (built unless ruled otherwise): run on** — only a `delivered` report or a reached call ends a ladder; the
  silent ladder SMS still COUNTS for D22 (1 A — LD8), so the claim CAN be closed once the ladder concludes, while the person is ALSO
  letter-eligible and the District Admin asked. Options: **A** run on (our reading — cost: a call / letter for a family a silent text may have
  reached); **B** end as reached once the step is two days old with ⛔ report (cost: a family whose phone stayed off is treated as reached on a
  text ⛔ report confirms; ⛔ call / letter). Arises only when reports stop — the silence alarm (`-347` DR12) fires then.
- **PQ2 — Across the two chases.** (a) Does a DELIVERED message of one chase end the OTHER chase's ladder for the same person on the same
  number, and count them reached for the correction closure? (b) Does a running CERTIFICATE ladder hold the CORRECTION closure? The
  follow-up note put every question inside ONE chase (Q4's "later reminder" was a correction reminder; Q3 B extended the ladder to the
  certificate chase); the cross-chase case was ⛔ put. §0: passes — what counts as reaching a family before closure; and our reading NARROWS
  `-351` 4 A's *"any message"* and 6 A's *"any of its people"* as worded. **Our reading: ⛔ to both** — each chase is its own machine and a
  certificate reminder never counts toward the correction closure (6.19d invariant 2, ours — `correction-closure.ts:779`). ⚠ Disclosed: a
  CALL already crosses (LD10 — it reached the person). Options: **A** each chase alone (our reading — cost: a family reached by a certificate
  text keeps its correction ladder running and its correction closure waits up to ≈ 8 days); **B** a delivered message of either chase ends
  both, only a correction ladder holds the closure (cost: a certificate text decides correction reach — supersedes 6.19d invariant 2); **C**
  both ways (cost: a certificate ladder delays a correction closure by up to ≈ 8 days, more when a report is late).
- **PQ3 — When the follow-up would fall after the reminders end.** `-250` #5 *"stop at day 90"* and `-259` (*"the reminders stop after"*
  180 days) meet `-350` ruling 2 (*"sent the SMS once more … sent one more SMS"*) and `-351` 6 A (*"at most about a week past day 90"*). A
  ladder started by a late reminder (correction day 84, certificate day 180), or running through a certificate pause, would text the family
  after the reminders' ratified end or while they are paused. §0: passes — WHEN a family is texted, and two ratified clauses conflict. **Our reading (built unless ruled
  otherwise): the end wins for texts** — ⛔ ladder SMS past day 90 / day 180 / while paused; the ladder's clock still runs and it CONCLUDES on
  its date (so the closure still waits — 6 A — and the letter route still opens). Options: **A** the end wins (our reading — cost: a family
  whose last reminder failed gets one or two fewer tries before the call / letter); **B** the ladder's texts go past the end (cost: texts
  after *"stop at day 90"* / 180 days, against those rulings as written); **C** a late ladder concludes at once at the end (cost: no retry at
  all for a last-day failure).
- **All three:** ONE routing note `trustee-panel-routing-note-2026-10-17-6-37c-ladder-edges.md` (independent questions, the `-351` note's
  shape), written from the TEMPLATE (referenced, ⛔ copied), E3 stating LD3's slippage (a late report stretches the closure hold), E4's
  commands run (an empty result is a finding), ⛔ "shown to the Panel" until BigDev SENDS it ([[feedback_shown_to_panel_means_sent]]).
  **Blocks:** ⛔ any code task (Tasks 1–9); the end / horizon rules are written to our readings behind ONE pure function `ladderEndReason(…)` and ONE
  `ladderStepGate(…)` so a ruling is a one-function change + its legs; the row is ⛔ `done` until each routed question is RULED and transcribed
  (a Trustee-ratified entry) and the code matches it. If BigDev judges any one the author's at Task 0.2, it is recorded in `-354` instead.

## Acceptance Criteria

Notation: "the chase" = correction or certificate; every AC holds for BOTH unless it names one. Live legs at :5433. A controllable clock.

- **AC0 — Governance before code (Task 0).** LD1–LD14 answered by BigDev (verbatim in the Debug Log) and committed ALONE as `-354` (id
  re-grepped on every branch and worktree first); PQ1–PQ3 through BigDev's §0 check and, if they pass, the ONE routing note WRITTEN (⛔ sent);
  then ONE records commit (LD14 (b)); the sprint row → `in-progress` and the ledger — all BEFORE any code; ⛔ code before this branch carries
  `f7e695b7`.
- **AC1 — A ladder starts only on a REPORTED failure (LD5 start; I5).** Legs: `accepted` + `undelivered` ⇒ ONE `running` ladder
  (`origin_sent_on` = the row's `sent_on`; `sms2_due_on = D + 2`; `whatsapp_step = 'skipped:whatsapp_not_built'`); `accepted` + ⛔ report ⇒ ⛔
  ladder (1 A); `delivered` ⇒ ⛔; a report on an OLD number (after a 6.20 change) ⇒ ⛔; a second undelivered reminder while one runs ⇒ ⛔ second
  ladder (and the partial UNIQUE refuses a direct INSERT — 23505 pinned); a later reminder already `delivered` ⇒ ⛔; a reached call on/after the
  origin ⇒ ⛔; a person already CONCLUDED on that number ⇒ ⛔ (the no-restart rule — or as BigDev decides); a person whose earlier ladder ENDED
  delivered and who fails again ⇒ a new ladder; a report on a day-84 origin first seen on day ≥ 90 (the run ended `day_90`) ⇒ starts; a report after a closure
  was DECIDED (incl. on a `day_90`-ended run) ⇒ ⛔ (`closure_closed`); a stop failing ⇒ ⛔; two concurrent sweeps ⇒ one ladder (UNIQUE `(chase,
  origin_row_id)` and the chase lock); a row older than the 14-day scan bound ⇒ ⛔ scanned; a `closure_notice` / `ladder_sms` / other-chase row
  ⇒ ⛔ origin.
- **AC2 — The steps and the clock (LD3, LD4, I6, I8).** SMS 2 on D + 2 at the 10:00 run; SMS 3 on <SMS 2's date> + 2; conclusion on <SMS 3's
  date> + 4 (D + 8); a late-detected ladder sends its first due step at the next 10:00 run (⛔ two in one run) and every later date moves; each
  ladder SMS is a `ladder_sms` row in the chase's own table with `subject_key 'ladder:<id>:2|3'`, the chase's reminder template and named
  values (⛔ a new template), `correlation` `cr` / `ce` + its own row id; every row of LD3's outcome table, one leg each (incl. a transient
  retried within the run's backoff, and a row left `attempting` past the day finalised `error` ⇒ `sent`, the next date from its `sent_on`); every stop refuses (one leg per
  stop through the EXTRACTED predicate — and the original `begin*FamilySend` suites green UNCHANGED); ⛔ ladder SMS on correction day ≥ 90, on
  a `completed` certificate run, or while paused ⇒ `skipped:past_horizon` / `skipped:paused`, the ladder still concludes on its date (PQ3 —
  or as ruled); a pause `certificate_accepted` / a never-re-entering state / `cannotRemind` ⇒ `ended_stopped`; a certificate run ended `completed` with a
  certificate since received ⇒ END (⛔ `skipped:past_horizon`); a ladder concluding during a pause writes its `ladder_escalation` on the first
  unpaused day. LD4 (a): on a scheduled day for that person ⇒
  `satisfied`, ⛔ `ladder_sms` row (incl. the scheduled reminder and the ladder child running in either order at 10:00, the day-14 collision, and a step falling on a scheduled day after a slip); a second person of the claim on the SAME number already texted today
  ⇒ `satisfied` (T22); (b) if chosen instead: a `ladder_sms` row regardless.
- **AC3 — What ends a ladder (LD5; PQ1 / PQ2 as ruled).** `delivered` on a later `family_sms` ⇒ `ended_delivered`; on a `ladder_sms` ⇒
  `ended_delivered`; on another person's row that satisfied this step (same number) ⇒ `ended_delivered`; a reached call with `called_on ≥`
  the origin ⇒ `ended_call` (for a running ladder of EITHER chase), an earlier call ⇒ ⛔; a number change ⇒ `ended_number_changed`; each stop ⇒
  `ended_stopped:<reason>`; a silent `ladder_sms` ⇒ ⛔ end (PQ1 reading — or as ruled); a `delivered` message of the OTHER chase ⇒ ⛔ end (PQ2
  (a) reading — or as ruled); `undelivered` on a `ladder_sms` ⇒ ⛔ end; an end condition and `conclude_on` on the same run ⇒ the END wins; a
  `delivered` report after conclusion ⇒ ⛔ un-conclude, the person reached through the accepted row, still letter-eligible. All end rules live
  in ONE pure `ladderEndReason(…)` with a unit table of every row above; the horizon / pause / one-a-day rules in ONE `ladderStepGate(…)`.
- **AC4 — The conclusion and the ONE mapping per chase (LD6, LD7, I2–I4).** Live, per chase: a ladder past `conclude_on` with ⛔ end ⇒
  `concluded_undelivered`, `concluded_on` = that date. Then, through the REAL readers: the origin + every later `undelivered` `family_sms` row of
  that person/number in the epoch reads `rejected_unreachable` (`deadOn = concluded_on`); an `accepted` row with ⛔ report still `accepted`; a
  RUNNING or ENDED ladder's rows read UNCHANGED (I4 — one leg each); `foundDeadOn = concluded_on`, `deadKind 'not_delivered'`; a concluded
  origin sent BEFORE a send-time refusal ⇒ `foundDeadOn` = the refusal's date (the MIN — LD7); letter-eligible (`assertCorrectionLetterRecordable`
  and the certificate letter precondition accept); still so after a later reminder is `delivered`; the LAST evidential row concluded ⇒
  `numberKnownDead` ⇒ the closure notice recipient is a LETTER; a concluded row on an OLD number changes ⛔ the current number's facts; every
  stored `outcome` byte-identical before / after (I2 — a row snapshot); `DEAD_OUTCOMES` and the OUTCOME logic unchanged — the `git diff` of
  `correction-chase.ts` shows only `deadOn?` / `concluded?` on the row type, the `deadKind` union and the MIN computation (`not_delivered` iff
  the chosen dead row has `concluded`); in `correction-chase-read.ts`, `correctionPersonStatus` gains only the new case (Task 7's read-model
  additions are AC9's); a number changed A→B→A after a conclusion on A ⇒ a new report in the new A epoch is ⛔ mapped and may start a ladder; the certificate chase inherits it with ⛔ change of its own.
- **AC5 — Reach and the closure hold (LD8).** D22: a `ladder_sms` `accepted` with ⛔ report ⇒ reached; with `delivered` ⇒ reached; with
  `undelivered` ⇒ ⛔; a reached call ⇒ reached, a `not_reached` call ⇒ ⛔; the old `reachedBySms` / `reachedByLetter` legs green UNCHANGED.
  `ladder_running`: ANY running CORRECTION ladder ⇒ refused at `readClosureReadiness`, `requestCorrectionClosure`, `decideCorrectionClosure`
  AND `decideEscalatedClosure` (one leg each — a ladder that starts between request and decide refuses the decide; the start and the decide
  serialise on the chase lock); its position (after `claim_corrected`, before `not_reached`) in the guard, the union, `AC6_REQUEST_REFUSALS`
  (+ the lockstep test) and `ClosureRequestBlocker`, + a guard-order leg (the lockstep test does ⛔ pin `assertClosureGround`'s order); `blockerDto` maps it (the queue does ⛔ 500); the api switch (exhaustive — a
  typecheck leg); the admin blocker copy; a running CERTIFICATE ladder ⇒ ⛔ refusal (PQ2 (b) reading — or as ruled); `closure_due` /
  `closure_escalation` unchanged.
- **AC6 — The escalation (LD9, LD11).** On conclusion: ONE `ladder_escalation` row per ladder (the partial UNIQUE refuses a second), on the
  ladder's run even if ENDED; correction ⇒ a `staff_push` that day, or the next morning when that day's push had already gone (both pinned; the day UNIQUE kept); certificate
  ⇒ recorded only; the ask per LD9's cap-aware table (one leg per row: call-or-letter, call only at the letter cap, letter only for a nominee
  under LD11 (a), neither); the found-dead letter track then runs from `concluded_on` (+7 / +12 / +13) inside its existing window, and ⛔
  outside it (a day-84 ladder concluded on day 92 gets the `ladder_escalation` only); a reached call stops `letter_chase` / `escalation` /
  `letter_escalation` for a CONCLUDED person, and ⛔ for a send-time dead person (both pinned); ⛔ the scheduled
  `family_sms`; `escalated` on the correction queue ⛔ lit by `ladder_escalation`.
- **AC7 — The call record (LD10, LD11).** Each `POST …/calls` (both routes) with a valid key ⇒ one row, `201`, the DTO; the SAME
  `Idempotency-Key` replayed ⇒ the same result, ONE row; a different body under the same key ⇒ the keyed store's mismatch refusal; ⛔ key ⇒
  `400`; `outcome 'reached'` with `answered_by 'nobody'` / `'someone_else'` ⇒ `400` (and the CHECK refuses a direct INSERT); a `called_on` in the
  future or before filing ⇒ `400`; a person ⛔ on the chase's recipient set ⇒ refused; agreement not live / ⛔ contact record ⇒ refused; a nominee
  under LD11 (a) with the key unset ⇒ `nominee_calls_not_cleared` (route AND number reveal), allowed once it is `true`; a caller ⛔ holding the
  key, or outside the district ⇒ `403`; `GET …/calls/number` needs the fresh step-up `contact_call_number`, returns the CURRENT number (a leg
  after a 6.20 change), `no-store`, ONE audit line per reveal; every audit line holds ⛔ name / number (a recorder); the human-actor gate's
  `expectedMethods` updated — correction-chase `['post','post','post','post','get','get','get']`, certificate + one `post` + one `get` — and a
  gate-bites leg (a renamed path ⇒ the gate goes RED); a call ending ladders of both chases takes both locks in order (a concurrency leg). The
  policy-regression spec pins `SELECT, INSERT` only and the tenant policies.
- **AC8 — Records are append-only and scoped (LD2, LD10).** `claim_contact_ladders`: the grants (⛔ UPDATE of an identity column — a `42501`
  leg; ⛔ DELETE), the tenant policies (a row invisible under another Pariwar), the state ↔ `ended_at` / `concluded_on` CHECKs; both send
  tables' purpose CHECKs accept `ladder_sms` / `ladder_escalation` and their TS tuples AND Drizzle `check()` copies match (the policy specs'
  purpose legs); the certificate purpose↔outcome CHECK allows `ladder_sms` the family outcomes and `ladder_escalation` `recorded`; the new
  partial UNIQUEs; `delivered_at` NULL on every row.
- **AC9 — What staff see (LD12).** Both DTOs carry `follow_up`, `unreachable_reason`, `ask`, `calls` (+ `reported_undelivered` on correction);
  the status enums unchanged; the admin panels render "follow-up running — next on", "texts reported not delivered — <the ask>", the call form
  (with the step-up number reveal) and the list; refusal texts in `errors.ts`; the microcopy gate green over every new admin string (it scans
  comments too); contracts vitest green (fixtures updated).
- **AC10 — 6.37b's reports reach the ladder (F4).** The correlator's `cr` purpose set accepts `ladder_sms` (a `cr` `ladder_sms` report ⇒
  `matched:*` + an `sms_send_deliveries` row — live); a `ce` `ladder_sms` report matches with ⛔ correlator change (a live leg proving it);
  `ladder_escalation` (⛔ CRQID) ⇒ never matched; the `cr` silence query counts an accepted `ladder_sms` with ⛔ report; the 6.37b suites green
  with ONLY those legs added.
- **AC11 — Alarms (LD13).** The daily ladder line counts by state and carries ⛔ id; three ladders started in one Pariwar on one IST day ⇒ ONE
  `contact_ladder.burst:3`, two ⇒ ⛔; the `-269` §4 alarm unchanged.
- **AC12 — Nothing else moves (I7, I8).** ⛔ `packages/i18n/locales/**` diff; ⛔ DLT template / registry text / sheet edit; ⛔ change to
  `packages/channels/**` or any WhatsApp file; `CORRECTION_REMINDER_DAYS` / the certificate schedule unchanged; the suspicion / peer-mesh /
  closure-notice paths unchanged (⛔ edit of `claim-peer-mesh-requests.ts`); `dlt-typed-variables` gate green (new files spell ⛔ the
  template-id prefix, `DLT_VAR` or the `{#var#}` literal; the config key is ⛔ under `sms.dlt.`); `channels-determinism` green.
- **AC13 — The proof.** `pnpm ci:local` green with `DATABASE_URL` at :5433 EXPLICITLY (each red explained and re-run alone —
  [[project_known_livedb_test_failures]]); a global-fetch RECORDER at ZERO calls across the new suites (I9); every new table has its
  `…-policy-regression.spec.ts`; the access-wrapper and human-actor route-gate invariants green.

## Tasks / Subtasks

- [ ] **Task 0 — governance FIRST (AC0). ⛔ No code.**
  - [ ] 0.1 `git fetch origin`; bring `f7e695b7` (6.37b's dev commit) onto this branch (BigDev's call — rebase onto / merge
        `story/6-37b-msg91-delivery-reports`; ⛔ cherry-pick a subset); re-read every (6.37b) cite against it and re-locate the shifted plain
        cites (header); `git diff --name-only f8102c02..HEAD -- packages/domain/src/claim apps/jobs/src/scheduler apps/api/src/modules/claims
        packages/contracts/src/claims apps/admin/src/modules packages/domain/migrations docs/launch-gate-inventory` and re-read any cited file
        that moved. Re-check the 6-31 worktree / branch for its claims (migration, decision id, roster row, the `epics.md` slot) — F18.
  - [ ] 0.2 Put LD1–LD14 to BigDev, each with its recommendation and cost (incl. LD4's, LD5's no-restart, LD9's and LD11's §0 flags, LD10's
        key, LD14 (d)); then PQ1–PQ3 — BigDev's §0 check FIRST (*"STRIP THE CITATIONS AND READ WHAT IS LEFT"*): route, or record as the
        author's in `-354`. Record every answer verbatim (Debug Log).
  - [ ] 0.3 Write `-354` (`.decision-log.md`, prepended; the `-353` shape) with LD14 (a)'s supersession list. ⛔ Edits any entry
        ([[feedback_supersede_never_reinterpret]]). Stage in scratchpad; try the insert ([[project_decision_log_writes_user_inserted]]). Commit
        ALONE; write its SHA after, ⛔ before. Then, if routed, WRITE the PQ note (⛔ sent).
  - [ ] 0.4 The records commit (LD14 (b)) — every item listed there; ⛔ a word above a dated note rewritten, EXCEPT the unpresented §3.4
        proposal bullet and Panel-pack row references (corrected in place with a revision line — F19); both ledgers
        ([[project_sprint_status_safe_prepend]] — guard the size, verify the YAML parses).

- [ ] **Task 1 — the migration (LD2, LD9, LD10; AC8).** `packages/domain/migrations/0168_claim-contact-ladder.sql` (or the next free — F18;
      hand-authored, journal `when` + 1 ms — T10): `claim_contact_ladders` (LD2's columns, CHECKs, partial UNIQUE, UNIQUE `(chase,
      origin_row_id)`, the `(state, conclude_on)` index), `claim_contact_calls` (LD10), the correction purpose CHECK replaced (+ `ladder_sms`,
      `ladder_escalation`), the certificate purpose CHECK (0138) and purpose↔outcome CHECK (0141) replaced, the two new partial UNIQUEs
      `(claim_case_id, subject_key) WHERE purpose IN ('ladder_sms','ladder_escalation')`; grants (G-a) + tenant per-command policies; a comment
      naming roster Row 26. Drizzle schema files (+ index exports) incl. the `check()` copies; the purpose tuples; policy-regression specs for
      both new tables and the two existing specs' purpose legs. ⛔ Touch an existing migration; ⛔ `delivered_at` (LD14 (d)).
- [ ] **Task 2 — the readers and the mapping (LD6, LD7, LD8; AC4, AC5).** `readReturnFamilyRows` and `readClaimCertificateFamilyRows`: select
      `reminder_id`; LEFT JOIN `claim_contact_ladders` (concluded, same person / number / chase) and `sms_send_deliveries` (`cr` / `ce`); emit
      the effective outcome + `deadOn` + `concluded` (I3, I4 — the SQL is the ONE copy per chase). `correction-chase.ts`: `deadOn?`, the
      `deadKind` union, the MIN computation (LD7). `correction-chase-read.ts`: `correctionPersonStatus`'s `'not_delivered'` case.
      `correction-closure.ts`: `reachedByLadderSms` (a new reader `readReturnLadderSmsRows`, return-scoped), `reachedByCall` (a new reader
      `readReturnContactCalls`, return-scoped), `ladder_running` in `assertClosureGround` + F7's whole lockstep list (incl. `blockerDto` and
      `apps/admin/src/modules/correction-closure/{i18n-en,errors}.ts`). Legs per AC4 / AC5 (live, real readers).
- [ ] **Task 3 — the extracted stop predicates (I6, LD5; AC2).** Factor `correctionFamilyStopReason(tx, …)` out of `beginCorrectionFamilySend`
      (taking the run's END REASON — `day_90` is ⛔ a stop for a ladder, every other end reason is; + the NEW `closure_closed`) and
      `certificateFamilyStopReason(tx, …)` out of `beginCertificateFamilySend` (returning `planCertificateRun`'s verdict incl. the pause reason,
      ⛔ the slot-label `taken` check — T22); both `begin*FamilySend` call them and keep their own `day < 90` / `not_due` / `taken` — their
      existing suites green UNCHANGED (a refactor leg: every original stop still refuses). Generalise the claim / finalise accessors to take
      `purpose` + `subjectKey` (default `family_sms` / `''` — ⛔ a caller changes).
- [ ] **Task 4 — the ladder engine (LD3–LD5, LD9; AC1–AC3, AC6).**
  - [ ] 4.1 `packages/domain/src/claim/contact-ladder.ts` (PURE: `planLadderStart`, `ladderEndReason` (AC3's table), `ladderStepGate` (the
        horizon / pause / one-a-day rules), `nextLadderStepDate` (LD3's outcome table), the cap-aware `ladderAsk`; IST dates through
        `cycleCalendar`'s primitives — ⛔ re-derive the offset) + `contact-ladder-record.ts` (accessors: start with `ON CONFLICT DO NOTHING` under
        the chase lock, CAS state moves `WHERE state = 'running'`, step row links, the `ladder_escalation` writer on an ended run).
  - [ ] 4.2 `apps/jobs/src/scheduler/claim-contact-ladder.ts`: the 10:00 sweep (`'0 10 * * *'` IST; the service pool — T12: filter by
        `pariwar_id` explicitly) + a child queue per ladder SMS (the send through `sendClaimCorrectionSms` with `message` `reminder` /
        `certificate_reminder`, `rowId` = the `ladder_sms` row; the chase child's stale-day guard; hash only at start / before send / at
        conclusion — F6); queue constants in `QUEUE_NAMES`; registered in `boot.ts` (⚠ 6.37b and 6.31 also edit it — merge, ⛔ overwrite); the
        push for an ended run (LD9); alarms through an `onAlarm?` dep (default `console.warn`, unwired).
  - [ ] 4.3 The reached-call stop on the staff asks (LD9): `planRun` (`claim-correction-reminders.ts` — the letter track) and
        `planCertificateStaffChase` (`certificate-reminder.ts:875-925`) take a per-person `reachedCallOn` (epoch-scoped, like
        `letterDelivered`), consulted ONLY for `deadKind 'not_delivered'`; `STAFF_PUSH_ITEM_PURPOSES`, the push query and
        `correctionStaffPushText` gain `ladder_escalation` and the ask's words.
- [ ] **Task 5 — 6.37b's `cr` purpose filters (AC10).** `sms-delivery-correlator.ts` `CORRECTION_SMS_PURPOSES` (+ `ladder_sms`);
      `reports.ts` `countSilentSmsSends`' `cr` filter; ⛔ `ce` change (F4 — a leg proves it); the correlator comment *"the Panel-ruled use is
      row 6-37c"* (`:13`) updated to name the reader.
- [ ] **Task 6 — the call record (LD10, LD11; AC7).** `packages/domain/src/claim/contact-call.ts` (assert-allowed — D30, recipient, LD11 —
      under both locks in order; record; list; refusal union) + index export; contracts `RecordContactCallRequest` / `ContactCallDto` (hand
      re-declared enums); api routes + handlers in the two existing route files on F17's path grammar (the keyed idempotency store; the step-up
      context `contact_call_number` in api AND admin; the audit event types); RBAC per LD10 (reuse ⇒ ⛔ catalog change); the LD11 config key,
      registered with the api's other boolean config keys; `scripts/claim-adjudication-human-actor-invariant/check.ts` `expectedMethods` (both
      entries) + the gate-bites leg.
- [ ] **Task 7 — staff views (LD12; AC9).** Domain read models (`correction-chase-read.ts`, `certificate-reminder-read.ts`) + DTO mappers
      (`claims.nominee-name-check.handlers.ts:804-834`, `claims.certificate-reminder.handlers.ts:127-128`) + contracts; admin
      `CorrectionChasePanel.tsx`, `CertificateRemindersList.tsx`, a `ContactCallForm.tsx` (one component imported by both modules is fine —
      [[feedback_no_premature_package]] is about packages), `api/{client,hooks}.ts`, `errors.ts`, `i18n-en.ts` (both modules). Tests: the admin
      suites + contracts vitest.
- [ ] **Task 8 — alarms (LD13; AC11)** in the ladder sweep; the daily line.
- [ ] **Task 9 — gates and the untouched (AC12, AC13).** I2's snapshot leg; the `git diff`s of AC4; ⛔ diff under `packages/i18n/locales`,
      `packages/channels`, any `whatsapp*` file, `claim-peer-mesh-requests.ts`; `pnpm dlt-typed-variables:test && pnpm dlt-typed-variables:check`
      (`git add` new files first); `pnpm --filter @twt/channels test:determinism`; the microcopy gate; the human-actor gate; the fetch recorder;
      `pnpm ci:local` at :5433.
- [ ] **Task 10 — records and close.** The deferred-work dispositions ([[feedback_closure_language_precision]] — ⛔ collapsed): *"⛔ DLT send
      consumes a delivery report …"* — **Closed by** this story for a REPORTED failure on the correction AND certificate chases, **narrowed** to
      silence (a text with ⛔ report still counts — `-351` 1 A; DR12 alarms it), **⛔ addressed** for peer mesh / suspicion (recorded, ⛔ acted on);
      *"⛔ Staff view labels a send 'reported undelivered'"* — **Closed by** this story for the correction and certificate views, the peer-mesh
      part stays; *"`delivered_at` … an unused seam"* — **Closed by** `-354` (LD14 (d)); *"⛔ No staff prompt to CALL a dead-phone family whose
      second certificate is rejected after their one letter"* — the seam exists (the call record) ⇒ **trigger FIRED, partly addressed** (a call
      can be recorded and counts; ⛔ prompt for that family unless a ladder concludes for them); both *"At-least-once SMS"* items — a dated
      annotation: a ladder adds up to two SMS per undelivered reminder under the same residual. NEW items: the WhatsApp step (→ row 6-37d, if
      LD1 (a)); phase 2 call tracking (`-351` Consequence 4 — ⛔ row); a scheduled catch-up `late` send does ⛔ check ladder rows (a ladder SMS and a
      catch-up text can meet on one day — T22's residual); any PQ not yet ruled. The Change Log; the File List; the sprint row → `review`; the
      ledger. ⛔ Fast-forward to `main` — BigDev's call ([[feedback_land_prs_by_fast_forward]]).

## Dev Notes

### ⚠ TRAPS

1. **T1 — ⛔ Map on the report** (F1, I4). The 6.37b AC11 text says it; the rulings do ⛔. Map on a CONCLUDED ladder.
2. **T2 — ⛔ Touch `DEAD_OUTCOMES` or `evaluatePersonRunState`'s outcome logic** (I3) — shared by the correction closure AND the certificate
   chase. Only `deadOn?`, the `deadKind` union and the MIN (LD7).
3. **T3 — `readClosureReach` bypasses `readReturnPersonStates`** (`correction-closure.ts:409`) ⇒ the mapping lives in `readReturnFamilyRows`
   ITSELF.
4. **T4 — `foundDeadOn` is sticky, dated, and "first" in TIME** (F6, `correction-chase.ts:757`) — LD7's MIN or the found-dead date moves
   LATER at conclusion.
5. **T5 — The chase sweeps only see OPEN runs and `slot < 90`** (F8, F14) — the ladder has its OWN sweep; its `ladder_escalation` writes on an
   ended run.
6. **T6 — ⛔ Ladder SMS as `family_sms`** (LD2 (c)) — they would suppress scheduled slots through the catch-up's recorded set.
7. **T7 — ⛔ Copy the stop predicates** (I6) — extract them ([[feedback_mechanization_split_commitment]]); and `run_ended` is the FIRST stop
   (`:433`) — a ladder must read the END REASON, or every ladder dies at day 90 (and `day_90` alone does ⛔ mean "not closed" — `closure_closed`).
8. **T8 — 6.37b's correlator filters `cr` by purpose** (F4) — forget `ladder_sms` and every correction ladder SMS report lands
   `unmatched:not_sms`: ⛔ ladder ever ends `delivered`.
9. **T9 — A purpose is lockstep in FOUR places** — the TS tuple, the migration CHECK, the Drizzle `check()` copy, the partial unique indexes (+
   the policy spec's purpose leg). A missed one is a `23514` that rolls back a whole sweep plan.
10. **T10 — Migrations are hand-authored; ⛔ regenerate an applied one** (42P07); ⛔ `DROP SCHEMA`; edits reach :5432 AND :5433
    ([[project_live_db_test_gotchas]]); push with `DATABASE_URL` at :5433 ([[project_prepush_hook_inherits_5432]]). The number races 6.31.
11. **T11 — The WhatsApp fixture reports `accepted`** (I7) — ⛔ `resolveWhatsappProvider` / `dispatch()` / `cascade`.
12. **T12 — `readSmsSendDeliveries` / any raw read on the BYPASSRLS pool reads EVERY Pariwar** (F5) — filter by `pariwar_id` or run in scope.
13. **T13 — DB-clock ordering ties in one transaction** ([[project_db_clock_ordering_tests_tie]]) — `created_at` / `updated_at` comparisons
    need SEPARATE transactions or an injected clock; `clock_timestamp()` vs `now()`.
14. **T14 — Dates are IST** — `cycleCalendar`'s primitives (`istDateOf`, `addCalendarDays`, `istMidnightAt`); ⛔ a new copy of the offset.
15. **T15 — Contracts tests sit outside tsc** ([[project_contracts_tests_outside_tsc]]); contracts ⛔ import `@twt/domain` (re-declare enums).
16. **T16 — The closure refusal is lockstep** (F7) — the union, `AC6_REQUEST_REFUSALS` + its ORDERED test, `ClosureRequestBlocker`, `blockerDto`
    (throws ⇒ 500), the api's exhaustive switch, the admin copy.
17. **T17 — Idempotent handler shape** ([[project_idempotent_write_handler_shape]]) — the tx INSIDE the claim's try; COMMIT then
    `recordResult`; `closeScopeTx` RETHROWS a failed COMMIT.
18. **T18 — The microcopy gate scans comments** in `apps/admin/src/**`; the DLT gate scans comments in new `src` files — ⛔ spell the
    template-id prefix, `DLT_VAR` or `{#var#}`.
19. **T19 — Prettier is ⛔ enforced** — hand-format ([[project_prettier_not_enforced]]); ⚠ `**cl.3**` inside a JSDoc closes it
    ([[project_markdown_emphasis_closes_jsdoc]]).
20. **T20 — Three sessions edit `boot.ts` and `packages/queue/src/index.ts`** (6.37b committed; 6.31 planned) — merge by hand.
21. **T21 — The route gate scans only matched paths** (F17) — a call route outside `/correction/` / `/certificate-reminders/` is UNSCANNED and the
    gate stays GREEN; the gate-bites leg proves it.
22. **T22 — One human can be two person keys; one number one text a day** (certificate CR6; LD4) — the ladder child's same-number-same-day check
    under the chase lock covers ladder-vs-ladder and ladder-vs-scheduled; ⚠ the chase's own catch-up `late` send does ⛔ check ladder rows (a
    residual, recorded at Task 10).

### Reuse map

| Need | Reuse | ⛔ Rebuild |
|---|---|---|
| Delivery state | a JOIN on `sms_send_deliveries` / `readSmsSendDeliveries` (6.37b) | a report reader of our own |
| Send + CRQID | `sendClaimCorrectionSms` (`rowId`, kind derived) | a send core |
| Stop predicates | the extracted `*FamilyStopReason` (Task 3) | a copy |
| Rhythm | the chases' `'0 10 * * *'` IST cron + the chase child's stale-day guard | an hourly sweep, a send window |
| IST dates | `cycleCalendar` (`istDateOf`, `addCalendarDays`, `istMidnightAt`) | offset arithmetic |
| Ended-run staff row | `latestRunOfReturn` / `staffWriter` (`correction-closure-jobs.ts:107-188`) | a new anchor |
| Staff push | `staff_push` rows + the day UNIQUE (`claim-correction-reminders.ts:458-632`) | a push path |
| Staff record | the letter record end to end (F17) | a new shape |
| Idempotency | `idempotency.createKeyedStore` (ground-inspection precedent) | a dedupe column |
| Step-up reveal | the letter-address reveal (`correction_letter_address`) | a new reveal mechanism |
| Tenant RLS | 0128's / 0167's per-command block | a new policy shape |
| Alarms | per-module `onAlarm?` (`cycle-spawn.ts:75,118`) | a sink |

### Testing standards

Vitest; live suites `describe.skipIf(!hasDatabase)` at :5433; a controllable clock and injected IST dates; fixture reports through 6.37b's own
accessors (the correlator over `persistSmsDeliveryReports`, or `upsertSmsSendDelivery` directly — named per leg); ⛔ network (I9). Pure tables
for `ladderEndReason`, `ladderStepGate`, `nextLadderStepDate`, `ladderAsk`. Every AC leg drives the REAL reader
([[feedback_stub_must_call_not_transcribe]]).

### Project structure notes

- **NEW:** `packages/domain/migrations/0168_claim-contact-ladder.sql` (+ journal); `packages/domain/src/schema/claim_contact_ladders.ts`,
  `claim_contact_calls.ts`; `packages/domain/src/claim/contact-ladder.ts`, `contact-ladder-record.ts`, `contact-call.ts` (+ tests, two
  policy-regression specs); `apps/jobs/src/scheduler/claim-contact-ladder.ts` (+ tests); `apps/admin/src/modules/…/ContactCallForm.tsx`; the
  PQ routing note (if routed).
- **UPDATE:** `packages/domain/src/claim/{correction-reminder-record,correction-chase,correction-closure,correction-chase-read,certificate-reminder,certificate-reminder-record,certificate-reminder-read}.ts`,
  `claim/index.ts`, `schema/{claim_correction_chase,claim_certificate_reminder,index}.ts`; `apps/jobs/src/sms-delivery-correlator.ts`,
  `packages/domain/src/sms-delivery/reports.ts` (`cr` purpose filters only); `apps/jobs/src/boot.ts`, `packages/queue/src/index.ts`;
  `apps/jobs/src/scheduler/claim-correction-reminders.ts` (the letter track's `reachedCallOn` — Task 4.3 — and the push purposes / copy),
  `apps/jobs/src/scheduler/claim-certificate-reminders.ts` (its `planCertificateStaffChase` call `:461` — the new input);
  `packages/contracts/src/claims/{correction-chase,correction-closure,certificate-reminder}.ts` + tests;
  `apps/api/src/modules/claims/{claims.correction-chase.routes,claims.correction-chase.handlers,claims.certificate-reminder.routes,claims.certificate-reminder.handlers,claims.correction-closure.handlers,claims.nominee-name-check.handlers,correction-closure-dto}.ts`,
  `apps/api/src/audit/audit-sink.ts`, the api config-key registration; `apps/admin/src/modules/{correction-chase,certificate-reminders,correction-closure}/**`,
  `apps/admin/src/api/{client,hooks}.ts`; `scripts/claim-adjudication-human-actor-invariant/check.ts`; the records (Task 0.4).
- **⛔ Touched:** `packages/i18n/locales/**`; `packages/channels/**`; every WhatsApp file; `apps/jobs/src/scheduler/claim-peer-mesh-requests.ts`;
  `apps/mobile`; every existing migration; `DEAD_OUTCOMES`. `packages/domain/src/claim/correction-closure-jobs.ts`: behaviour unchanged (LD8) —
  ONLY `latestRunOfReturn` / `staffWriter` exported (LD9).

### Sequencing

6.37b's dev commit `f7e695b7` (on its branch) → this branch carries it (Task 0.1) → **6.37c** (Task 0 → code) → roster Row 33 closed AND 6-37c
`done` → claim-text template ids (Row 32 note (9); under LD1 (a) ⛔ 6-37d). 6-37d (WhatsApp step + agreement wording) AFTER 6.31 (the direct
WA client) and 6.37c, behind the §3.4 amendment for its nominee half. The Panel pack's items (the amendment, the three ADRs) block ⛔ code here;
a routed PQ blocks `done`, ⛔ code.

### Previous story intelligence (6.37b)

- Governance pattern: author-commit ALONE → records commit → code; a Panel question through §0 BEFORE it is written; a question with ⛔
  reachability trace is withdrawn, ⛔ sent (6.37b's PQ2 — `-348`; [[feedback_trace_reachability_before_escalating]]). PQ1–PQ3 here are
  reachable: PQ1 whenever reports stop (6.37b F6 auto-pause, F8 account faults); PQ2 whenever both chases run on one claim (F16); PQ3 on every
  day-84 / day-180 failure (F8, F14).
- 6.37b's dev diverged from its design in small, recorded ways (its Debug Log (k)): `first_reported_at` in the UPDATE grant; the core refuses
  `ot`; `lookupSendForCorrelation` selects ⛔ `updated_at`. Read the code, ⛔ the design ([[feedback_trace_internal_state_never_cite_decision_text]]).
- Check 6.37b's recorded `ci:local` at Task 0.1 before relying on its suites.

### Git intelligence

This branch: 22 records-only commits over `dae96d9b` (`-347` … `-353`, the routing notes, ADR-0042, Rows 32 / 33, the Panel pack `f8102c02`).
The code 6.37c extends is 6.37b's `f7e695b7` (57 files; F1–F5) and 6.19b / 6.19c / 6.19d's chase code on `main`.

### Latest tech information

⛔ new library. MSG91's report semantics are 6.37b's (its Latest tech information — re-read there at Task 0.1). Meta / WhatsApp: ⛔ used (LD1).
Postgres partial UNIQUE + `ON CONFLICT DO NOTHING` for the start race; `clock_timestamp()` vs `now()` (T13).

### References

- `.decision-log.md` — `2026-10-17-350`, `-351`, `-352` (TRUSTEE-RATIFIED), `-353`, `-347` (DR4, DR5-G, DR6, DR12, DR13), `-349`,
  `2026-09-27-252` (cl.1–cl.2), `2026-09-27-250` (#1, #2, #4, #5), `2026-09-27-259`, `2026-10-03-275` (Q1, Q4), `2026-09-20-230` / `-231` C,
  `2026-09-29-269` §4, `2026-10-12-322` §0, `2026-10-12-323` R2.
- `_bmad-output/implementation-artifacts/6-37b-msg91-delivery-reports.md` (AC11, Task 7 — MOVED; F5, F6, F8, F12–F16, DR4–DR13, I1);
  `6-19-correction-return-reminders-and-closure.md`, `6-19d-replacement-certificate-reminder.md`, `6-19a-claim-contact-capture-at-filing.md`;
  `6-31-…` on its branch (the WA client, for 6-37d).
- `_bmad-output/planning-artifacts/trustee-panel-routing-note-TEMPLATE.md`; `…-2026-10-17-6-37b-reported-undelivered.md`,
  `…-6-37b-delivery-ladder-follow-ups.md`, `…-6-37b-whatsapp-consent-wording.md` (the rulings' blocks); `panel-pack-2026-10-17-6-37c.md`;
  `sprint-change-proposal-2026-10-17-whatsapp-claim-contact.md`.
- `docs/launch-gate-inventory/inventory-roster.md` Rows 18, 20, 21, 26, 30, 32 (note (9)), 33; `docs/adr/ADR-0042-msg91-delivery-report-ingress.md`,
  `ADR-0029-…`; architecture.md §3.4 (`:2218-2246`).

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

- Ultimate context engine analysis completed — comprehensive developer guide created (`bmad-create-story 6.37c`, 2026-10-17; six parallel
  read-only research passes — the correction chase + D22, the certificate chase, the WhatsApp infrastructure, the consent / call / staff
  surfaces, the governance records and numbers, 6.37b's staged code — then one fresh-context validation pass against `checklist.md`).

### File List

- `_bmad-output/implementation-artifacts/6-37c-undelivered-reminder-ladder.md` (new)
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/planning-artifacts/epics.md` (`### Story 6.37c` entry — `-353`'s *"owed at its create-story"*)

## Change Log

| Date | Version | Change |
|---|---|---|
| 2026-10-17 | 1.0 | Created by `bmad-create-story 6.37c` at `f8102c02` (worktree `.claude/worktrees/6-37c`). F1–F20 found; LD1–LD14 PROPOSED (⏳ Task 0.2); PQ1 / PQ2 candidate. Status `ready-for-dev`. |
| 2026-10-17 | 1.1 | Create-story's own validation (one fresh-context read-only verifier, `checklist.md` + the footgun catalogue): 7 CRITICAL / 17 SHOULD / 10 NICE, all applied. ⭐ The ladder now keeps the reminders' RATIFIED rhythm — `-250` #5 (*"One message a day, at 10:00"*, *"stop at day 90"*), `-259` (180 days), `-275` Q4 (pause) — steps are IST dates sent by the 10:00 sweep, a scheduled day IS the step, ⛔ text past the end or in a pause (new PQ3: may the ladder conclude without that text?); the stop predicates read the run's END REASON and gain `closure_closed` (a late report after a decided closure could otherwise text a closed claim); every start / state move under the chase lock; the no-restart rule after a conclusion (else nine ladders to day 84); LD3's per-outcome step table; the call routes on the real path grammar (else the human-actor gate is vacuous) + a gate-bites leg; the reached call stops the staff asks ONLY for concluded persons (send-time dead numbers keep `-230` / `-231` C's letter track) — Task 4.3 added; `foundDeadOn` = the MIN dead date; PQ2 states that it narrows `-351` 4 A / 6 A and that a call already crosses chases; the `-354` supersession list completed (`-353` decision 2, `-351` Consequence 2, `-352` C3 → LD11); the unpresented §3.4 bullet corrected in place (F19); LD11 gains option (d) and a roster row; the ask is letter-cap-aware; the call takes both locks in order; F4's `ce` premise corrected (Task 5 is correction-only); I1's forgery bound completed; `ladder_running` after `claim_corrected` + `blockerDto` and the closure admin copy named; a partial UNIQUE per ladder step / escalation; 6.37b is COMMITTED (`f7e695b7`) — the header's cite shifts; the Policy meaning rewritten match / narrow per line; cites corrected (`sameNumberHash` `:324-327`, `readCorrectionRecipients` `:601`, the certificate one-letter check `:233`, the spec paths, `correction-closure-jobs.ts`'s package); the `epics.md` entry written now (`-353`). F21 added (the agreement as built). A second fresh-context review of the v1.1 rewrite (3 HIGH / 11 MED / 12 LOW, all applied): a certificate pause SKIPS a step and the clock runs on (⛔ a hold) everywhere; the certificate stop predicate reads the ORIGIN run (open or ended) and checks received / pause BEFORE the horizon; AC4's diff pin matches Task 7 and the `concluded` marker; the transient row matches the code's minute-scale backoff; the old anchor wording removed; LD4's early-week counts and the Policy meaning's wording corrected; the one-a-day check covers every person on the number; the mapping and no-restart rule are epoch-scoped (A→B→A); a send-time refusal of a ladder SMS waits for the conclusion (disclosed); the push "that day or next morning"; `staffWriter` exported, `correction-closure-jobs.ts` behaviour unchanged; three more disclosed narrowings in the Policy meaning; PQs block every code task; cites corrected. |
