---
baseline_commit: c19e6534
---

<!--
PINNED: `c19e6534` (2026-10-18 — branch `story/6-37c-undelivered-reminder-ladder` REBASED onto `main` @ `ed862339`, which carries ALL of
Story 6.37b: dev `f7e695b7`, review rounds `b5044a2d` / `ac123e19`, Decision `2026-10-18-354` `a81cdbf7`, its records `ed862339`; 6.37b is
`done`). Two facts, stated separately: (1) the pin is an ancestor of this branch (durable); (2) every `apps/` / `packages/` / `scripts/`
cite in this file was RE-DERIVED at `c19e6534`, whose code tree equals `ed862339`'s (perishable — re-check at Task 0.1:
`git diff --name-only c19e6534..HEAD -- apps packages scripts`). The v1.0 / v1.1 pin `f8102c02` is ⛔ an ancestor any more (its rebased twin
is `1534293b`; the trees differ — the base moved). Every cite into 6.37b's files (`sms-delivery/*`, `sms-delivery-correlator.ts`, `claim-dlt-sms-send.ts`, 0167 / 0168) is its FINAL code
(after both review rounds), ⛔ `f7e695b7`.
Re-locate by FUNCTION, ⛔ by number ([[feedback_story_validate_footguns]] #19, #21, #24). Built in its OWN worktree
`.claude/worktrees/6-37c` ([[feedback_commit_on_story_branch]], [[feedback_shared_tree_branch_switch]]).

STATUS (dated 2026-10-18, code review round 2): `in-progress (code review round 2, 2026-10-18)` — the row was `done` after round 1
(`b2aa00ff`) and is back to `in-progress` until round 2's patches land (Decision `2026-10-18-363`, `39b52757`). ⭐ Round 2's patches LANDED in the round-2 code-review commit that follows `39b52757` (38 applied, P27 deferred as W15; the fix diff re-reviewed; ci:local on :5433) ⇒ `done` again (Change Log v1.8). The paragraph below is
kept as written; its opening `in-progress` is the Task 0 status. SHAs it lacks: `-356` was committed as `2f2de2db` (records `5ce7646f`);
the Task 0 records commit (Change Log v1.3) is `2936f531`.

STATUS: `in-progress` — Task 0 DONE (2026-10-18): LD1–LD17 answered by BigDev and committed as `2026-10-18-355` (`d93b7c75`); PQ1–PQ3
routed (the note WRITTEN, ⛔ sent); the counsel question WRITTEN (⛔ sent); the records commit applied. Code (Tasks 1–9) may start; the row
is ⛔ `done` until PQ1–PQ3 are ruled and transcribed. ✅ RULED 2026-10-18 — `2026-10-18-360` (Trustee-ratified): Q1 A, Q2 A, Q3 A — our
readings, as designed; the code must match them at review. The §3.4 claim-contact exception (claimant) approved (`-357`); ADR-0042
ratified (`-358`); the Panel told that alarms reach the logs only (pack item 5). GO-LIVE (⛔ merge or `done` fences — [[project_not_in_production_merge_is_not_golive]]): roster Row 32 (h) closed is a
go-live condition of this row's ladder (`-354` decision 4 (b)); a call to a nominee waits for G1 (`-354` decision 5).
⚠ 2026-10-18, AFTER Task 0 — `2026-10-18-356` (TRUSTEE-RATIFIED): ⛔ WhatsApp notification to a nominee (BigDev's recorded scope: in future
only one who has opted to receive it, or who is also the claimant). Nothing this row builds changes (it sends ⛔ WhatsApp) — except that a
NOMINEE's ladder records its WhatsApp step as `skipped:nominee_no_whatsapp` (⛔ `skipped:whatsapp_not_built` — nothing will build it for
them); a claimant's stays `skipped:whatsapp_not_built`. Every "nominee's WhatsApp step", G2 and "G1's WhatsApp half" below now has ⛔ case —
row 6-37d builds the claimant's WhatsApp step only; the §3.4 amendment is NARROWED to the claimant (still Panel pack item 1). Kept as written.

§0 GATE (the routing template's, applied FIRST — `_bmad-output/planning-artifacts/trustee-panel-routing-note-TEMPLATE.md`): the
behaviour is the Panel's and is ALREADY RULED (`-350`, `-351`, `-352`); each LD below is the AUTHOR's because it decides how that ruling
is timed, stored, shown to staff or split into rows — the follow-up note's own §0 put *"how the ladder is timed and stored in the
system"* on our side and the Panel ruled on that note. ⚠ FOUR LDs have a person-facing half and are FLAGGED for BigDev's own §0 check at
Task 0.2: LD4 (one message a day — fewer texts), LD5's no-restart rule (fewer texts), LD9 (a reached call stops the staff asks — ladder
persons only) and LD17 (letter-eligibility after a later delivered reminder — 6.37b's AC11 annotation). LD11 is ⛔ on that list any more:
the nominee gates are DECIDED by `-354` decision 5 (author-commit; its §0: *"stricter, never looser"*) — LD11 now picks only the
MECHANISM. ⭐ THREE questions look like the PANEL's (PQ1–PQ3) — two Trustee-ratified rulings meet at an edge the notes never put
([[feedback_panel_gate_read_ratified_verbatim]]). ⭐ ONE question goes to COUNSEL with Task 0 (`-354` decision 5 — LD16).

GLYPH REGISTER: `⛔` negates the word it precedes; `⭐` emphasis / action; `⚠` a hazard. ⛔ No `file:NNN` into `.decision-log.md`,
`deferred-work.md` or `sprint-status.yaml` (newest-first files — footgun #19) — cite the decision id, the item's phrase, or the row key.

LETTERS: F = found facts (F1–F21); LD = build decisions (LD1–LD17 — PROPOSED, ⏳ BigDev at Task 0.2); PQ = candidate Panel questions
(PQ1–PQ3); I = invariants (I1–I9); T = traps (T1–T24). Decision-entry letters stay the entry's own (`-351` rulings 1–6, `-252`
cl.1–cl.3, `-250` #1–#6, `-347` DR1–DR14, `-354` decisions 1–5); G1–G3 are the §3.4 proposal's go-live conditions. This story's OWN
decision entry is called **"the 6.37c entry"** below — its id is the next free one at Task 0.3 (`-355` at this pin — now committed as `2026-10-18-355`, `d93b7c75`; ⛔ written as a number
anywhere but here and F18, so it cannot go stale twice).
⚠ *Dated 2026-10-18 (code review round 2):* "LD1–LD17 — PROPOSED, ⏳ BigDev at Task 0.2" is as written at
create-story — LD1–LD17 were answered at Task 0 (`2026-10-18-355`, `d93b7c75`); LD9 and LD12 are narrowed as built by
`2026-10-18-363` (`39b52757`).
-->

# Story 6.37c: A reminder the network reports undelivered is followed up — the same reminder twice more over four days, then a call or a letter — and only then stops counting as reaching the family; a claim is never closed for silence while that follow-up runs `[PRIMITIVE]`

Status: done

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
> - **6.37b (final code, `done`):** `sms_send_deliveries` (`0167_sms-delivery-reports.sql:78-106` — PK (`send_kind`, `send_row_id`),
>   `send_kind IN ('cr','ce','sn','pm')`, `delivery_state IN ('delivered','undelivered')`, `first_reported_at`, `reported_at`,
>   `report_count`, tenant RLS, ⛔ DELETE, indexes: the PK and `pariwar_id` only; ⛔ pruned — the 30-day prune deletes INBOX rows only,
>   `pruneSettledSmsDeliveryReports`; `0168_sms-delivery-report-backstops.sql` adds only CHECKs); `readSmsSendDeliveries(db, kind, rowIds)`
>   (`packages/domain/src/sms-delivery/reports.ts:296-303` — ⛔ production caller; RLS-scoped, unordered; an unbounded id list, a non-uuid
>   id raises `22P02` — deferred to THIS row's first call, T23); the correlator `apps/jobs/src/sms-delivery-correlator.ts` (writes
>   `sms_send_deliveries` ONLY for a finished `accepted` row whose `provider_message_id` = the report's request id — `decideSmsReport`
>   `:95-178`; row 4 `:123-128` checks the purpose on BOTH send tables: `CORRECTION_SMS_PURPOSES = {'family_sms','closure_notice'}` `:63`,
>   `CERTIFICATE_SMS_PURPOSES = {'family_sms'}` `:65` — anything else settles `unmatched:not_sms`; the `ce` lookup reads the row's real
>   `purpose`, `reports.ts:212`; it refuses to run unless `canReadAcrossPariwars` `:259-262`, `reports.ts:242`); the silence check
>   `countSilentSmsSends` (`reports.ts:316`; `cr` `s.purpose IN ('family_sms','closure_notice')` `:327`; `ce` `s.purpose = 'family_sms'`
>   `:330`); the CRQID on every send (`apps/jobs/src/scheduler/claim-dlt-sms-send.ts:144` required `correlation` — kind + row id only;
>   the wrapper `sendClaimCorrectionSms` `claim-correction-reminders.ts:238-264` maps `reminder` / `closure_notice` ⇒ `cr`,
>   `certificate_reminder` ⇒ `ce` through the exhaustive `CLAIM_CORRECTION_SMS_KIND` `:214-222`).
> - **The correction chase** (6.19b / 6.19c): persons `readCorrectionRecipients` (`packages/domain/src/claim/correction-chase.ts:601-654`;
>   the `CorrectionPerson` shape `:564-576`); rows `readReturnFamilyRows` (`correction-reminder-record.ts:604-641`, `purpose='family_sms'`
>   `:634`, ⛔ `reminder_id` selected) → `readReturnPersonStates` (`:816-858`) → the shared pure `evaluatePersonRunState`
>   (`correction-chase.ts:737-772`; `DEAD_OUTCOMES` `:698-702`; `const dead = epoch.find(…)` `:758`, `foundDeadOn = dead?.sentOn` `:765` — the FIRST dead row of the
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
| **`2026-10-17-352`** | Q1 B — *"The claimant's filing agreement names text message, WhatsApp, phone call and post, and adds "or any other means of communication that may appear in future"."* Q2 — *"WhatsApp and calls go to the claimant and nominee both but The claimant's agreement doesn't cover the nominees. Instead it's permissible under DPDPA."* NOT covered (for counsel): (a) the legal basis as quoted; (b) Meta's opt-in rule; (c) architecture §3.4. Consequence 3: *"A go-live condition is proposed (BigDev's decision, recorded separately): WhatsApp and calls to a nominee do not go live until counsel confirms the legal basis in writing (a) and the Meta policy check (b) is recorded"* — RECORDED by `-354` decision 5 (calls narrowed to G1 alone). | ⭐⭐ **TRUSTEE-RATIFIED** |
| **`2026-10-17-353`** | decision 1: row 6-37c builds the conclusion, the ladder, the call / letter escalation with a call that counts, closure waiting, *"the new wording of the claimant's filing agreement (`-352` Q1); and WhatsApp and calls to the claimant and the nominee (`-352` Q2) — the nominee's WhatsApp step only once the architecture §3.4 amendment is ratified and its go-live conditions are met"* (the go-live conditions are now `-354` decision 5's); *"its `epics.md` entry is owed at its create-story"*. decision 2: 6.37b's Task 7 and AC11 *"move to 6-37c unchanged, as that row's starting point"*. decision 3: no claim-text template id until Row 33 has closed AND 6-37c is `done`. Consequence 2: the deferred-work dispositions against *"Task 7"* are made by 6-37c when it closes. | author-commit — THIS ROW's charter |
| `2026-10-17-347` | DR4 (`1` ⇒ delivered; `2/9/16/17/20/25` ⇒ undelivered); DR6 (`undelivered` absorbing; the counting contract); DR12 (silence alarm); DR13 (*"The correction chase screen changes only through Task 7"*). DR1 / DR2 / DR5-G / DR6 as NARROWED by `-354` decision 1. | author-commit |
| **`2026-10-18-354`** | (6.37b's review round 2.) decision 1 narrows `-347` (i) `first_reported_at` in G-a's UPDATE grant; (ii) the inbox INSERT limited to the six projection columns; (iii) a printable-ASCII token; (iv) a timestamp-shaped delivery time, the wider mask; (v) *"A report whose processing fails every time is settled `unmatched:row_failed` once it has had 5 attempts AND is 72 hours past receipt"*. decision 4 *"every alarm reaches the LOGS only until roster Row 32 (h) wires `onAlarm` to a named person … (b) Row 32 (h) closed is a go-live condition of row `6-37c-undelivered-reminder-ladder`'s ladder … (c) the Panel is told at its next sitting — ⛔ told yet (owed, recorded here)."* decision 5 *"**a WhatsApp message to a nominee** waits for G1 … AND G2 …; **a call to a nominee** waits for G1 … The basis for the texts and letters nominees receive TODAY, once the claimant's new agreement no longer names nominees (`-352`'s reading), is put to counsel with row 6-37c's Task 0 — ⛔ changed until then."* Consequence 2: *"Row 6-37c carries decision 4 (b), decision 5 and the nominee text / letter basis question; its create-story … planned decision id `-354` — it takes the next free id."* | author-commit — binds THIS row |
| **`2026-09-27-252`** | cl.1 *"A closure may be **requested** only when, for **each** person who must be reached, ≥ 1 reminder was **accepted** by the network (or shown **delivered**, where a report exists) — **or** a posted letter has a **recorded delivery date**."* cl.2 *"A FAMILY NO CHANNEL CAN REACH IS OFFERED THE LETTER ROUTE — as for an invalid number."* | ⭐⭐ **TRUSTEE-RATIFIED** (as narrowed by `-350`) |
| **`2026-09-27-250`** | #2 the letter chase *"counts from the day the phone was found dead"*; #4 *"A letter can **still be recorded** after day 90, with **no more reminders**."*; #5 *"… weekly on days 42, 49, 56, 63, 70, 77, 84; **stop at day 90**. One message a day, at **10:00 in the morning**."* (*"⇒ the 10:00 hour is now the Panel's"*). | ⭐⭐ **TRUSTEE-RATIFIED** |
| **`2026-09-27-259`** | the certificate reminders follow the correction schedule to day 90, then monthly — *"AND THE REMINDERS STOP AFTER"* 180 days (`-260` G6: days 120 / 150 / 180). | ⭐⭐ **TRUSTEE-RATIFIED** |
| **`2026-10-03-275`** | Q1 A one certificate letter per person per CLAIM, ever; Q4 A *"reminders stop while it stands accepted and resume on the re-rejection"*. | ⭐⭐ **TRUSTEE-RATIFIED** |
| `2026-09-20-230` / `-231` C | a DEAD NUMBER is answered by the District Admin's POSTED LETTERS; the letter record is chased by reminders and then ESCALATED. | ⭐⭐ **TRUSTEE-RATIFIED** |
| 6.37b story (`6-37b-msg91-delivery-reports.md`) | AC11 + Task 7 — MOVED here (`-353`), kept there as written. ⚠ Two of its lines do ⛔ survive the rulings: AC11 maps the REPORT straight to `rejected_unreachable` (⛔ — the rulings conclude only after the ladder — F1) and says *"the certificate chase's letter-eligibility is unchanged"* (⛔ — `-351` 3 B). | story record |
| Panel pack `panel-pack-2026-10-17-6-37c.md` + `sprint-change-proposal-2026-10-17-whatsapp-claim-contact.md` | the §3.4 claim-contact amendment + G3 (new agreement live before a claimant gets WhatsApp), for the claimant only; a call to a nominee waits for G1 (counsel's written basis), as decided by `-354` decision 5. ⚠ The proposal's new-bullet text was ALREADY corrected by 6.37b's review round 2 (it now names *"sprint row `6-37c-undelivered-reminder-ladder`'s comment"*, with a revision line); what still names this row for work LD1 moves to 6-37d is listed in F19. ⚠ **Dated note, 2026-10-18 (review P37):** `-356` (Trustee-ratified) supersedes the WhatsApp half of `-354` decision 5 — no WhatsApp notification goes to a nominee at all, built or gated (⛔ "WhatsApp: G1 + G2" case any more); only the call half (G1) stands. | **PRESENTED and ANSWERED 2026-10-18** (`-357` item 1, `-358` item 2, `-359` item 3, `-360` item 4, item 5 told) |
| deferred-work | Routed to THIS row (navigate by phrase — ⛔ line): *"⛔ DLT send consumes a delivery report — a rejection seen only there is recorded `accepted`, and on the correction chase D22 counts the family reached"* (closer now 6-37c — 6.37b's annotation); *"⛔ Staff view labels a send 'reported undelivered'"* (6.37b — ⭐ trigger: THIS create-story); *"`delivered_at` on `claim_correction_reminders` / `claim_certificate_reminders` stays NULL — an unused seam"* (trigger: the next migration touching either table — THIS story's); *"⛔ No staff prompt to CALL a dead-phone family whose second certificate is rejected after their one letter"* (trigger: *"a staff call-task seam"* — THIS story's call record); both *"At-least-once SMS"* items; *"`readSmsSendDeliveries` takes an unbounded id list, and a non-uuid id raises `22P02`"* (**"Deferred to 6-37c"** — its first caller bounds / batches and validates); *"Reports in one POST share `received_at`"* (trigger includes *"6-37c reading report order"*); the `-354` carrier *"For row 6-37c"* (items (a) Row 32 (h) a go-live condition, (b) the Panel told, (c) the nominee gates, (d) the nominee text / letter basis to counsel); the ADR-0042 restatement (*"ADR-0042 restated (or stronger ingress authentication / a cross-check adopted) BEFORE the ladder is built; the consent sheet §1–§2 revised (or ADR-0042 pulled from the pack) BEFORE it is presented"*). | open |

## ⭐ THE INVARIANTS

1. **I1 — A report still only SUBTRACTS reach; reach is ADDED only by a staff-recorded call** (6.37b's I1, restated). A `delivered`
   report ⛔ adds an `accepted` row and so ⛔ adds reach on its own (an accepted row already counts). The ONE new source of reach is a call
   recorded `reached` by a District Admin under a permission key (LD10) — ⛔ a provider input. ⇒ the forgery bound (anyone holding 6.37b's
   header token): a forged `undelivered` on a reminder whose person receives ⛔ later `delivered` report STARTS a ladder (up to two more
   copies of an approved reminder), holds the closure ≈ 8 days, then CONCLUDES — un-counting that reminder (closure `not_reached` until a
   letter's delivery or a reached call is recorded), making the person letter-eligible and asking the District Admin to call or post; a
   forged `delivered` ENDS a ladder early (the person then counts as reached through rows that were already `accepted` — ⛔ worse than
   TODAY; but relative to a GENUINE failure report it cancels the protection the Panel ruled — the ladder's closure hold, `-351` 6 A — for a
   person the network never reached: ADR-0042 Security effect (i)). ADR-0042 already records the bound as an OPEN item and says this row
   *"restates this bound in this ADR (a dated note …) and decides whether the static token is still enough, BEFORE it builds the ladder and
   before Row 33 (a) ratifies this text"* ⇒ LD15 decides the token; Task 0.4 writes the dated note (⛔ a word above rewritten) and revises
   the consent sheet §1–§2 (or pulls ADR-0042 from the pack).
2. **I2 — The send tables are written ONLY by new INSERTs through the existing claim / finalise accessors** (already keyed on
   `purpose` + `subjectKey` — `CorrectionReminderKey` `correction-reminder-record.ts:61-70`, `CertificateReminderKey`
   `certificate-reminder-record.ts:43-52`; only the hard-coded `family_sms` call sites are new paths — Task 3). ⛔ `UPDATE` of an existing reminder row outside its existing finaliser semantics; ⛔ a stored `outcome` rewritten by the
   conclusion (the mapping is READ-time — LD6); `delivered_at` stays NULL (LD14 (d)).
3. **I3 — ONE mapping per chase, inside its row reader** — `readReturnFamilyRows` (correction) and `readClaimCertificateFamilyRows`
   (certificate) — BEFORE the shared `evaluatePersonRunState`. ⛔ in `DEAD_OUTCOMES`, ⛔ in `evaluatePersonRunState`'s OUTCOME logic (both
   are shared by `correction-closure.ts:73,380` and the certificate chase — `certificate-reminder.ts:63, 809, 818`), ⛔ a second copy per
   reader. `readClosureReach` already reads `readReturnFamilyRows` directly (`:409`) ⇒ it inherits the mapping by construction.
4. **I4 — The mapping keys on a CONCLUDED ladder, ⛔ on a raw report** (F1). A reminder reported `undelivered` whose ladder is running
   or ended `delivered` reads EXACTLY as today (`accepted`) — in an epoch with ⛔ concluded ladder; once ANY ladder of that person and number
   concludes in the epoch, LD6 maps every undelivered row of it.
5. **I5 — One running ladder per (claim, chase, person)** — a partial UNIQUE index, ⛔ an application check alone (`-351` 4 A); every
   start and state move happens under the chase's lock (LD5 — the closure gate reads the same lock).
6. **I6 — Every ladder SMS honours every stop the chase's own reminder honours, PLUS the chase's ratified horizon and pause** — through
   extracted predicates SHARED with `beginCorrectionFamilySend` (`correction-reminder-record.ts:391-480`) / `beginCertificateFamilySend`
   (`certificate-reminder-record.ts:360-471`) — ⛔ a copy (T7). Correction: ONE extracted function. Certificate: ONE set of extracted
   sub-predicates (received, pause reason) that `planCertificateRun` and the ladder's predicate BOTH compose — ⛔ the same function, because
   `planCertificateRun` judges only the OPEN run (Task 3). ⛔ A ladder SMS on correction day ≥ 90, on a
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
phone them)."* ⚠ *Dated 2026-10-18 (code review round 2):* two phrases above say more than is built: "never twice in a day" is
one text per NUMBER per CHASE per day (I8 — the two chases can each text on one day, and a scheduled catch-up `late` send does ⛔ check
ladder rows, a disclosed residual); "if any text gets through … you count as reached" is per chase for ENDING the ladder — under
`-360` Q2 A the other chase's delivered text does ⛔ end it. And under `2026-10-18-363` decision 1 a phone call answers the ask only
when made on or after the failed text that started the ladder. The sentence is kept as written; these narrow it. Its costs to the family: up to two extra copies of a reminder (often none in the first week, when a daily reminder already
goes); a closure up to about a week later (longer when the network's report itself arrives late — LD3); and — as for a number refused at
send today — once concluded, the person stays letter-eligible for that number even if a later text gets through (letter-eligibility
keys on the FIRST dead outcome — B1's *"as when the network refuses a number"*; ⚠ 6.37b's AC11 annotation says this CONFLICTS with `-351`
4 A's *"the person counts as reached"* — LD17, flagged for BigDev's §0 check). ⚠ What it does ⛔ mean: a text with
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
- a nominee is asked for a letter, ⛔ a call, until counsel (G1) — a go-live hold DECIDED by `-354` decision 5 (author-commit; its §0:
  *"stricter, never looser"*, ⛔ a Trustee-ratified clause moves); LD11 builds it; disclosed to the Panel with the pack (Task 0.4);
- the nominee's EXISTING texts and letters keep going on today's basis until counsel answers (`-354` decision 5: *"⛔ changed until then"*) — LD16;
- the no-restart rule (LD5) — our reading of 4 A's *"one ladder … at a time"* for a person already concluded (flagged);
- a ladder SMS the network REFUSES at send (dead number) does ⛔ conclude the ladder early — it waits for the conclusion date like any step
  (LD3) — NARROWS `-350` ruling 1's *"as when the network refuses a number"* by up to ≈ 4 days for that person (disclosed);
- the one-off `ladder_escalation` (+ push) after day 90 — our reading that a staff ask is ⛔ a *"reminder"* in `-250` #4's *"no more
  reminders"* (6.19 built `slot < 90` on every staff ask, F8) — flagged for BigDev at Task 0.2, and put in PQ3's note as context;
- a failure reported more than 14 days after its send is never followed up and keeps counting unless another ladder on that number
  concludes in the same epoch (LD6) (LD5's scan bound) — NARROWS `-350` ruling 2
  at the edge (MSG91 reports on the final status, usually within minutes — 6.37b F5);
- a failure reported after a closure was DECIDED changes nothing (`closure_closed`) — the closure already happened; disclosed;
- a reported failure whose follow-up was STOPPED (a pause, a mark switch, a contact-record gap) and that is followed by ⛔ later reported
  failure in the epoch keeps counting as reaching the person (D22) — re-starting it would re-send its steps (`-350` Consequence 3); disclosed;
- a certificate ladder ENDS (⛔ pauses) when the certificate stands ACCEPTED — `-275` Q4 makes that a PAUSE for the reminders (*"resume on
  the re-rejection"*); a re-rejection opens a new run, and a new failure there may start a new ladder — disclosed (LD5);
- a certificate ladder ENDS when the contact record cannot be reminded (`cannotRemind`) — the chase treats that as a retryable no-op
  (`certificate-reminder-record.ts:408`); the ladder does ⛔ wait for it — disclosed (LD5);
- a certificate ladder's `ladder_escalation` is written on conclusion even while the run is PAUSED (a staff record, ⛔ a family text —
  `-275` Q4 governs reminders) — ⛔ deferred to an unpaused day (LD9);
- a CONCLUDED person later reached by a recorded call still shows `unreachable` on the correction queue (the status reads SMS outcomes); the call
  shows in `calls` and counts for D22 (LD12) — disclosed.

## ⭐ FOUND FACTS (re-derived at `c19e6534` — code tree = `main` @ `ed862339`, 6.37b final; re-check at Task 0.1)

**What 6.37b gives this story**
- **F1 — The report is NOT the conclusion.** `-350` concludes "not delivered" only after the ladder (≈ 8 days) with ⛔ delivered message.
  The 6.37b AC11 mapping (*"a `family_sms` row whose `sms_send_deliveries` state is `undelivered` reads with EFFECTIVE outcome
  `rejected_unreachable`"*) fires on the REPORT — eight days early: letter-eligible, `unreachable` on the queue and the found-dead +7
  letter chase all start at once. ⇒ I4.
- **F2 — ⛔ Column records WHEN a send became `undelivered`.** `first_reported_at` / `reported_at` are the earliest / latest matching
  report of ANY state (`0167:78-106`; `upsertSmsSendDelivery` `reports.ts:277-294`). ⇒ the ladder's clock is anchored on the SEND's IST
  date (LD3), ⛔ on a report time; the ladder STARTS when the sweep first sees the `undelivered` row. ⇒ 6.37c reads ⛔ report ORDER (an
  absorbing state + the send date) — the deferred *"Reports in one POST share `received_at`"* trigger does ⛔ fire (Task 10).
- **F3 — Reports are recorded only while the row is `accepted` with that request id** (`decideSmsReport` `sms-delivery-correlator.ts:95-178`).
  A report arriving while the row is still `attempting` is retried up to 72 h from receipt (row 6), but the next 10:00 exhausted finaliser
  makes the row `error` (`claim-correction-reminders.ts:748-759`), after which the report settles `other_attempt` (row 7, `:137-152`); a
  report whose processing throws 5× over 72 h settles `unmatched:row_failed` (`-354` decision 1 (v)). ⇒ a ladder SMS that went
  transient → `error` but WAS delivered can never end its ladder `delivered` (disclosed — LD3's outcome table). Reports can arrive minutes
  to days late (6.37b F5 — on the FINAL operator status).
- **F4 — The correlator and the silence check filter by purpose on BOTH `cr` AND `ce`** (6.37b review round 2). `CORRECTION_SMS_PURPOSES =
  {'family_sms','closure_notice'}` and `CERTIFICATE_SMS_PURPOSES = {'family_sms'}` (`sms-delivery-correlator.ts:63`, `:65`; row 4
  `:123-128`) ⇒ a `cr` or `ce` report on any other purpose settles `unmatched:not_sms`. The `ce` lookup reads the row's real `purpose`
  (`reports.ts:212`). Silence filters: `cr` `s.purpose IN ('family_sms','closure_notice')` (`:327`), `ce` `s.purpose = 'family_sms'`
  (`:330`). ⇒ Task 5 widens BOTH sets and BOTH silence filters with `ladder_sms` (⛔ `ladder_escalation` — it carries ⛔ CRQID).
- **F5 — `readSmsSendDeliveries(db, kind, rowIds)`** is RLS-scoped (on the BYPASSRLS pool it reads EVERY Pariwar) and unordered
  (`reports.ts:296-303`). Kinds: `cr` = a `claim_correction_reminders` row (reminder OR closure notice — filter by `purpose`), `ce` =
  `claim_certificate_reminders` (`correlation.ts:7-11`). ⚠ The INVERSE of T12 also holds: under an RLS-bound role (roster Row 26's
  leading option) every cross-tenant send-table read returns ⛔ row SILENTLY — 6.37b's correlator and silence check therefore call
  `canReadAcrossPariwars` first and refuse (`reports.ts:220-224`, `:242`; `sms-delivery-correlator.ts:259-262`) ⇒ T24. `send_kind` CHECK `IN ('cr','ce','sn','pm')` (`0167:91`) and the CRQID grammar
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
  `decideCorrectionClosure` `:978`, `decideEscalatedClosure` `:1309`; request / decide / escalated-decide take the chase lock through
  `lockForClosure` (`:178-188` — `acquireCorrectionChaseLock(client, pariwarId, claimCaseId)`, claim-keyed, THEN `claims` FOR UPDATE; the
  lock order — advisory THEN row — `:12-16`); `readClosureReadiness` takes none. A new refusal code must ALSO reach: the union
  `CorrectionClosureRefusal` (`:105-135`), the
  hand-kept `AC6_REQUEST_REFUSALS` (`:146-155`) pinned IN ORDER by `packages/contracts/tests/correction-closure-lockstep.test.ts:55-56`, the
  contracts `ClosureRequestBlocker` (`packages/contracts/src/claims/correction-closure.ts:84-96`), `blockerDto`
  (`apps/api/src/modules/claims/correction-closure-dto.ts:18-23` — THROWS on a code missing from the contract enum ⇒ the queue 500s), the
  exhaustive api switch `closureRefusalError` (`claims.correction-closure.handlers.ts:113+`, `never` at `:176`), and the admin
  blocker copy (`apps/admin/src/modules/correction-closure/i18n-en.ts:10-21` — cast `as Record<string, string>`, ⛔ exhaustive: a missing
  code renders `''` silently; `errors.ts` needs ⛔ change — its `closure.` prefix shows the server's message); `readClosureReadiness`'s `number_unverified` special case applies to
  `not_reached` only (`:762-765`).
- **F8 — The day-90 edge.** The sweep visits OPEN runs only (`claim-correction-reminders.ts:837`, `ended_at IS NULL`); `planRun` ends a
  run `day_90` / `superseded` (`:1053-1060`); every letter-chase / escalation write is guarded `slot < 90` (`:1258-1364`). A closure decided
  on a run already ended `day_90` keeps `end_reason = 'day_90'` (`endOpenRunDecided` is a no-op there, `correction-closure.ts:575-584`) — so `run_ended` / `day_90` alone does ⛔
  tell "closed" from "time ran out". The last reminder is day 84 (`correction-schedule.ts:24-26`). `closure_due` (days 90–96) and
  `closure_escalation` (day 97) fire whether or not anyone was reached (`packages/domain/src/claim/correction-closure-jobs.ts:259-290`;
  `:74-75`). The ended-run staff-row anchor: `latestRunOfReturn` / `staffWriter` (`correction-closure-jobs.ts:107-126`, `:163-188`).
- **F9 — The send table's constraints** (0128 / 0130 / 0135 — ⛔ trigger on any `claim_correction_*` table): purpose CHECK replaced in 0135
  (`:26-27`), lockstep with `CORRECTION_REMINDER_PURPOSES` (`schema/claim_correction_chase.ts:68-93`) AND the Drizzle `check()` copy
  (`:274-275`) — pinned by the LOCKSTEP leg in `packages/domain/tests/integration/rls/claim-correction-closure-policy-regression.spec.ts:516-524`
  (`pg_get_constraintdef` against the tuple — ⛔ the chase spec, whose `:328-336` is the UPDATE-column 42501 leg); CHECKs on the table are
  purpose, outcome, `slot_day >= 0` (⛔ upper bound — a row on day 92 of an ended run passes; the 6.19c spec seeds `slot_day: 92`),
  recipient non-blank, attempting / claimed, delivered / accepted — ⛔ purpose↔outcome or purpose↔subject CHECK; outcome CHECK (`0128:57`); the slot UNIQUE `(run_id, slot_day, recipient_key, purpose, subject_key)` (`0128:75`); the
  `staff_push` day UNIQUE (`0128:77`); `run_id` NOT NULL FK; `sent_on` a DATE; `created_at`; UPDATE grant `0128:68`; `delivered_at` ⛔
  granted (`0128:64`, `:68`).
- **F10 — The send path.** The child `runCorrectionFamilySmsChild` (`claim-correction-reminders.ts:286-475`): stale-day guard → `beginCorrectionFamilySend`
  (the stops `correction-reminder-record.ts:429-463` — FIRST `run.endedAt !== null ⇒ run_ended` `:430`; hard-coded `purpose:'family_sms',
  subjectKey:''` `:409-417`) → commit → decrypt (`resolveCorrectionMobile`) → hash → send → `finaliseCorrectionReminder` (`:235-268`, stamps
  `updated_at = clock_timestamp()` `:256`). The exhausted finaliser is raw cross-tenant SQL over ALL purposes (`claim-correction-reminders.ts:748-759`) — it
  will finalise a stale `ladder_sms` row too (LD3's outcome table relies on it). Only the 10:00 cron times a send (`:92`, `:1430-1435`).
- **F11 — The staff view.** `correctionPersonStatus` (`correction-chase-read.ts:124-129`): `dead` ≻ `unreachable` ≻ `reached`
  (accepted > 0) ≻ `not_yet`; `deadKind` `'dead'` for `rejected_invalid_number`, else `'unreachable'` (`correction-chase.ts:766`; the union
  `:685`); `remindersAccepted` (`:229`); `escalated` = ANY `purpose='escalation'` row in the return (`:367-378`); the DTO `correctionChaseDto`
  (`claims.nominee-name-check.handlers.ts:804-834`); the contract enum `status: z.enum(['reached','dead','unreachable','not_yet'])`
  (`packages/contracts/src/claims/correction-chase.ts:158`; header `:10-13` — vocabularies re-declared by hand, ⛔ lockstep test).
- **F12 — The staff asks.** `letter_chase` to the District Admin on found-dead +7…+12 (`subject_key = personKey`) and ONE `escalation`
  to every Pariwar Admin on +13 (`claim-correction-reminders.ts:1272-1312`; both gated `track.foundDeadOn !== null && !capped`; the chase
  also `familyCanBeReminded && !track.letterDelivered && !familyPaused`, the +13 escalation only `!track.letterDelivered && !familyPaused`
  — it runs under D30; offsets `correction-schedule.ts:35-37`), then one `staff_push` per staff member per day (dispatch `:635-650`; the
  day UNIQUE `0128:77`; `STAFF_PUSH_ITEM_PURPOSES` `:495-501`; the push child lists ONLY rows with `sent_on = p.sentOn` `:592-597`, and a
  push is enqueued only for staff with a recorded row TODAY `:1364-1369`; the push copy is HARD-CODED English `correctionStaffPushText`
  `:504-518`; the "escalated" wording list `:511-513`). The family's correction reminder already says *"…or **the District Admin will contact you**"*
  (`en/claim.json:148`). Letters are capped at 2 per person per return (`CORRECTION_LETTERS_PER_PERSON`, `correction-reminder-record.ts:763`;
  `correction-letter.ts:249`).
- **F13 — The burst alarm** (`-269` §4): raw SQL `purpose='family_sms' AND outcome='rejected_unreachable' AND sent_on=$1`, threshold 3
  (`claim-correction-reminders.ts:766-782`, `:121`) — counts SEND-time refusals only.

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
  (`claim-certificate-reminders.ts:262-276`) and candidate claims (`:277-291`); the CR10 chase runs only while the run is open and not paused (`:388-396`).
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
  `emitAuthAudit(… 'admin_claim_correction.letter_recorded', { resourceLocator: 'claim:<lower uuid>' })` after commit (the
  `AuthAuditEventType` union `audit-sink.ts:338-347`; the certificate events use the prefix `admin_claim_certificate_reminder.` —
  `claims.certificate-reminder.handlers.ts:175`, `:227`, `:275`); the display name `getDisplayName` ⇒ `AdminDisplayNameMissingError` on
  null, ⛔ fallback (`claims.correction-chase.handlers.ts:239-240`);
  admin `apps/admin/src/modules/correction-chase/{CorrectionChasePanel,CorrectionLetterForm}.tsx`, `errors.ts`, `i18n-en.ts`; the step-up
  context precedent `correction_letter_address` (+ the admin's copy of the constant, `apps/admin/src/api/client.ts:1622`). The key
  `claim.record_correction_letter` (`permissions.ts:1048`, `district_admin` + derived `super_admin`; catalog `PERMISSION_CATALOG_VERSION = 52`
  `:770`; pin `permissions.test.ts:232-234`) was reused by 6.19c and 6.19d *"the same act, the same holder"*. The route gate
  `scripts/claim-adjudication-human-actor-invariant/check.ts` matches the correction-chase file by `pathSubstrings: ['/correction/']`
  (`:212`) and scans ONLY matched paths (`:382-386`) — a path outside it is UNSCANNED (`COVERAGE_SET` `:46`, `expectedMethods` `:211-214`,
  floor `:347`). The letter route has ⛔ idempotency key; a call has ⛔ natural cap ⇒ the keyed store (`idempotency.createKeyedStore`,
  `packages/domain/src/idempotency/keyed-store.ts:50-77` — `claim` / `recordResult` / `getResult` / `release` ONLY: ⛔ body comparison, a
  replay returns the stored result whatever the body; the house handler `apps/api/src/modules/contributions/personal-event-handlers.ts:113-125`;
  the mandatory-HEADER precedent `claims.ground-inspection.handlers.ts:398-403`; [[project_idempotent_write_handler_shape]]).

**Governance and numbers**
- **F18 — Numbers (checked at the pin across every ref, `origin`, and the 6-31 / 6-37b worktrees).** Decision: head `2026-10-18-354`
  (6.37b's round 2) ⇒ the 6.37c entry is the next free (**`-355`** at this pin). Migration: 0167 / 0168 = 6.37b
  (`0168_sms-delivery-report-backstops.sql`, journal `when` `1794195600012`) ⇒ this story takes the **next free at Task 0** (**0169** if
  6.31 has not committed one, else 0170), journal `when` = previous + 1 ms (`1794195600013` after 0168's `…012`). Roster: ends at Row 33 ⇒
  ONE new row (LD11) takes the next free (Row 34 if 6.31 has not taken it). ⚠ 6.31's story still claims `0167` / `-347` / Row 33
  *"provisional"* — all taken — so 6.31 and 6.37c will both reach for 0169 / `-355` / Row 34: re-grep EVERY branch and worktree right
  before each write (Task 0.3, Task 1). ADR: ⛔ new one (ADR-0042 gets a dated note — LD15). Ledger: this create-story = `2026-10-17u`;
  Task 0's = the next free then.
- **F19 — The Panel pack and the §3.4 amendment are PREPARED / DRAFTED, ⛔ sent, ⛔ ratified** (pack *"PREPARED, not yet presented"*;
  proposal *"DRAFTED 2026-10-17 — not yet presented"*; ⛔ decision entry approving either). The new bullet's *"roster row … gate"* was
  ALREADY corrected by 6.37b's review round 2 (it now reads *"sprint row `6-37c-undelivered-reminder-ladder`'s comment"*, with a revision
  line). Still naming THIS row for work LD1 (a) moves to 6-37d (navigate by phrase — ⛔ line): the proposal's *"(the row that builds it,
  `6-37c-undelivered-reminder-ladder`)"*, *"row 6-37c changes it to `-352` Q1's wording"*, *"**Row 6-37c** builds the exception"*,
  *"Roster: row 6-37c's gate carries G1–G3"* and *"row 6-37c's create-story picks up the exception and G1–G3"*; the pack's *"row 6-37c's
  create-story carries G1–G3"* and its stale *"`2026-10-17-353` is the head today"*. Because the Panel would RATIFY those sentences (a
  ratified sentence is superseded, ⛔ re-read — [[feedback_supersede_never_reinterpret]]), they are CORRECTED in place while unpresented,
  each with a revision line — Task 0.4. Disclosures: `-354` decision 2's (*"the Panel is told this when the proposal is presented"* — the claimant
  reading narrows `-351` (b)) ALREADY stands in the proposal (*"⚠ Stated per Decision `2026-10-18-354` decision 2 …"*, `ed862339`) — the
  pack's cover does ⛔ point to it yet (Task 0.4 adds the pointer); `-354` decision 4 (c)'s (alarms reach the LOGS only until Row 32 (h)) is OWED in full.
  G1's CALL half stays in THIS row (LD11), its WhatsApp half goes to 6-37d. ⚠ **Dated note, 2026-10-18 (review P37):** the pack and the
  proposal, as re-derived above, are no longer PREPARED/unsent — they were PRESENTED and ANSWERED 2026-10-18 (`-357` item 1, `-358`
  item 2, `-359` item 3, `-360` item 4, item 5 told; see the rulings table above). `-356` (Trustee-ratified) further supersedes "G1's
  WhatsApp half goes to 6-37d": no nominee WhatsApp step is built anywhere — not here, not at 6-37d — only the claimant's WhatsApp
  step (6-37d) and a call to a nominee (G1, this row, LD11) remain.
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
  reader ignores it (`packages/domain/src/claim/claim-contact-check.ts:120-132`, `readClaimContactAgreementState`); roster Row 18 (counsel) covers SMS and post only. ⇒ a CLAIMANT call rides on
  `-351`'s reading (*"The call half of the escalation is not held"* — the correction text promises *"the District Admin will contact you"*),
  ⛔ on the agreement (disclosed in LD11).

## ⚖️ Build decisions LD1–LD17 (DECIDED 2026-10-18 — `2026-10-18-355`: every ⭐ option taken, LD3 / LD5–LD9 / LD12 / LD13 accepted as written, LD14 (d) "keep"; each kept below as proposed, with its recommendation and its cost)

- **LD1 — Story shape: the WhatsApp step and the agreement's new wording move to a NEW row `6-37d-claim-contact-whatsapp-step`.**
  ⭐ **(a) Recommended.** 6.37c builds the ladder with step 1 RECORDED `skipped:whatsapp_not_built` and goes on to the 48-hour SMS —
  `-351`'s recorded reading. 6-37d (backlog; AFTER 6.31 and 6.37c) builds: the filing agreement's `-352` Q1 wording (en + reviewed hi) with
  a BUMPED copy version and a version-aware reader (G3, F21); the nominees removed from it (the REWORDING only — the question to counsel
  on the basis of the texts and letters nominees receive today stays with THIS row's Task 0, `-354` decision 5 — LD16); the
  claim-contact WhatsApp templates (Meta, en + hi); a direct non-member sender (on 6.31's client work); a sub-daily step; claim-contact STOP;
  an absorbing WA "ever delivered" read; the member-opt-in side-effect isolation (F20); the nominee step behind the §3.4 amendment + G1 + G2;
  and the G1 (WhatsApp half) / G2 / G3 roster row. It SUPERSEDES `-353` decision 1 IN PART (those items move rows) and NARROWS `-351`
  Consequence 2 (*"built but off"* — built in 6-37d instead), and states that roster Row 32 note (9)'s *"6-37c is `done`"* does ⛔ wait for
  6-37d — the gap `-350` closed (a reported failure counting as reached) is closed WITHOUT WhatsApp, and the ladder without its WhatsApp
  step is `-351`'s own reading. **Cost:** families get ⛔ WhatsApp until 6-37d; nothing is sent between hour 4 and day 2. **(b)** everything
  in 6.37c — F20's whole list on top of the ladder, racing 6.31 on `whatsapp-app.ts`, `contribution-providers.ts`, `boot.ts` and the queue
  index; the agreement re-wording sits in counsel's open Row 18 anyway. **(c)** the WhatsApp step built DARK here (code before §3.4 is
  ratified; its tests drive a send that cannot go; a sub-daily sweep for one dark step). ⚠ **Dated note, 2026-10-18 (review P37):**
  `-356` (Trustee-ratified) supersedes "the nominee step behind the §3.4 amendment + G1 + G2" and "the G1 (WhatsApp half)": no WhatsApp
  notification goes to a nominee at all, built or gated — not here, not at 6-37d. 6-37d now builds the CLAIMANT's WhatsApp step only
  (`skipped:whatsapp_not_built` as above); a nominee's ladder records `skipped:nominee_no_whatsapp` instead, permanently (`ladderWhatsappStep`
  in `contact-ladder.ts`), and a call to a nominee (G1 alone, this row's LD11) is the only contact a capped/concluded nominee can be asked for. ⚠ *Dated 2026-10-18 (code review round 2):* inexact — `ladderAsk`
  (`contact-ladder.ts`) asks for a LETTER for a concluded nominee below the letter cap while nominee calls are not cleared,
  `call_or_letter` once cleared, `call` at the cap once cleared, and `none` ("neither — escalate", `-355` decision 9) at the cap before
  clearance; a call is the only ask for a CAPPED nominee, and only once cleared.
- **LD2 — Where a ladder lives.** ⭐ **(a) Recommended:** ONE new tenant table `claim_contact_ladders` + each ladder SMS as a NEW-PURPOSE
  row `ladder_sms` in the chase's OWN send table (`claim_correction_reminders` / `claim_certificate_reminders`) — so its CRQID is `cr` / `ce`
  with the row's own uuid and 6.37b's inbox, grammar and `sms_send_deliveries` need ⛔ change, only the `cr` AND `ce` purpose filters
  widened (F4).
  `subject_key = 'ladder:<ladder_id>:<step>'` (step `2` / `3`); `run_id` = the ladder's origin run (an ENDED run is fine — the 6.19c
  closure-notice precedent); `slot_day` = the run day of the step's DUE DATE, fixed when the row is first claimed (a label — a retry
  re-claims the SAME row); `sent_on` = the due date. ⚠ Every `family_sms`-filtered reader IGNORES `ladder_sms` by construction
  (`readReturnFamilyRows` `:634`, `readRunFamilyRows` `:513`, the burst alarm, the D30 `DISTINCT ON` `claim-correction-reminders.ts:1165-1172`,
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
  `concluded_on date`, `escalated_on date` (the `ladder_escalation`'s date, NULL until written), `created_at` DEFAULT `clock_timestamp()`.
  CHECKs: state ↔ `ended_at` pair; `concluded_on` NOT NULL ⇔ `concluded_undelivered`. Partial UNIQUE `(claim_case_id, chase, person_key)
  WHERE state = 'running'` (I5); UNIQUE `(chase, origin_row_id)` (a row is the origin of at most ONE ladder, ever — a stopped ladder keeps
  it, so a lifted stop cannot re-send its steps; LD6 still maps it if a later ladder concludes); an index `(state, conclude_on)`. Tenant RLS per command (the 0128 / 0167 shape) — declared in
  `packages/domain/src/policies/claim-contact-ladder-rls.ts` (`pgPolicy`, the `*-rls.ts` convention; precedent
  `claim-certificate-reminder-rls.ts`; `policies/index.ts`); grants G-a (`-347` DR5-G's house shape, as narrowed by `-354` decision 1
  (i)–(ii) — its column-limited INSERT is the precedent for refusing a pre-settled row): `SELECT, INSERT` + `UPDATE` of the mutable
  columns only (⛔ identity columns; ⛔ DELETE); a comment naming roster Row 26. **Cost:** two purpose CHECK replacements (correction
  0135-style; certificate 0138 + 0141's purpose↔outcome — `ladder_sms` with the family outcomes, `ladder_escalation` beside the staff
  purposes as `('recorded','no_target')`, LD9) + TS tuples + Drizzle `check()` copies + the purpose-lockstep legs (T9). **(b)**
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
  ladder CONCLUDES on its date (its `ladder_escalation` is written on conclusion, paused or not — a staff record — LD9) — our reading of how `-351` 6 A's *"at most about a week past day 90"* and `-250` #5's *"stop at day 90"* fit
  together (PQ3 asks). ⭐ **What each ladder SMS outcome does to its step** (the core's outcomes, F10):

  | Row outcome | Step | Next date counts from |
  |---|---|---|
  | `accepted` | `sent` | the row's `sent_on` |
  | `rejected_invalid_number` / `rejected_unreachable` / `no_target` | `sent` (the attempt was made; the number is dead at send — ⛔ a reach; ⚠ the ladder still waits for its conclusion date — disclosed, Policy meaning) | its `sent_on` |
  | a transient (the row stays `attempting`) | retried within the same run's backoff only (*"(60 s with backoff over 4 tries) is minutes, ⛔ never a day"*, `claim-correction-reminders.ts:735-736`); a row still `attempting` from a previous IST day is finalised `error` by the exhausted finaliser (or treated as `error` by the ladder sweep if it runs first) ⇒ `sent` (⚠ if that text WAS delivered, its report can never match — F3 — so it cannot end the ladder; disclosed) | its `sent_on` |
  | the person's current number hash FAILS (KMS) before the send | `skipped:hash_unavailable` (the clock runs on — ⛔ a hold; alarmed by ids) | the due date |
  | `error` (any final) | `sent` (one attempt, as a scheduled slot spends its day — `-349` FOUND (a)) | its `sent_on` |
  | refused by a stop (LD5) | ⛔ a step — the ladder ENDS `ended_stopped:<reason>` | — |
  | refused by the horizon / pause | `skipped:past_horizon` / `skipped:paused` | the due date |
  | refused by I8's one-a-day (LD4) | `satisfied` | the due date |

  **Cost:** a step can slip to the next morning; a late report (F3) stretches the ladder — and the closure hold — past the *"about a week
  past day 90"* the Panel was told (disclosed in the PQ note's E3 and the Policy meaning).
- **LD4 — One message a day: a scheduled day IS the step (⚠ flagged for BigDev's §0 check — it changes how many texts a family gets).**
  ⭐ **(a) Recommended:** on a date the chase has a scheduled reminder slot for ANY person of that claim and chase whose current number hash equals the
  ladder's (the run is open and the run day is a slot of `correctionReminderSchedule(run.kind, run.day0)` (`correction-schedule.ts:95-104`
  — ⛔ the raw `CORRECTION_REMINDER_DAYS`) / the certificate schedule — computed from the SCHEDULE, ⛔ by watching for a sent row, so ⛔ race
  with the 10:00 chase sweep), the ladder does ⛔ send: the step is `satisfied` (the scheduled reminder, whatever its outcome, is that
  day's SMS — its row id recorded when found). ⚠ On the ladder's NEXT visit, a `satisfied` step whose scheduled row is ABSENT or
  `skipped_superseded` (the chase sweep skipped the run that day — a timed-out run — or its child never sent) is re-recorded
  `skipped:scheduled_not_sent` with an alarm by ids (the clock runs on; ⛔ a resend — the day is gone). And, under the chase lock, the
  ladder child refuses (step `satisfied`) when ANY `family_sms` / `ladder_sms` row of that claim and chase to that NUMBER (any person —
  T22) has `sent_on = today` — counting rows whose `recipient_number_hash` = the number's hash PLUS `attempting` rows (whose hash is still
  NULL until finalise — `claimCorrectionReminder` / `finaliseCorrectionReminder`) whose `recipient_key` is a person whose CURRENT hash is
  that hash (the child hashes before a send anyway — F6). For an origin on days 1–3 the ladder adds ⛔ extra SMS (days 3, 5, 7
  are scheduled); from day 4 it adds one or two (e.g. day 4 ⇒ day 8; day 7 ⇒ days 9, 11). This MATCHES `-250` #5 (*"One message a day"*) and meets *"try again with SMS
  one more time"*; the family never gets more texts than the Panel was told (*"up to two extra SMS"*). **Cost:** for an early-week origin the
  ladder's value is the conclusion and the closure hold only. **(b)** always a separate ladder SMS (two identical texts on a scheduled morning —
  against `-250` #5).
- **LD5 — What starts, stops and ends a ladder** (the start, every state move and every send-begin under the chase's lock —
  `acquireCorrectionChaseLock` / `lockCertificateClaim` — the lock the closure request / decide take, F7 — so `ladder_running` at decide is ⛔
  a check-then-act race). **Start** (the 10:00 sweep, per chase, per person — ⭐ after `canReadAcrossPariwars` (T24); the candidate scan
  bounded to `family_sms` rows with `sent_on` within the last 14 days — ⛔ an unbounded scan of `sms_send_deliveries`, F5): a `family_sms`
  row `accepted` whose `sms_send_deliveries` state is `undelivered` (filtered by `pariwar_id` — T12); ⛔ running ladder for (claim, chase,
  person); the row's `recipient_number_hash` = the person's CURRENT number hash (an old-number failure starts nothing); ⛔ `family_sms` /
  `ladder_sms` row of that chase to that person on that number CREATED after the origin (`created_at > origin.created_at`) is `delivered`
  (4 A — already reached); ⛔ call recorded `reached` for that person on/after the origin's `sent_on`; ⛔ ladder CONCLUDED for (claim, chase,
  person, number) in the CURRENT epoch — ⚠ **the no-restart rule (flagged for BigDev's §0 check):** a person already concluded on that
  number is letter-eligible and `foundDeadOn` is sticky, so a second ladder would only add texts (a dead phone would otherwise get a new
  ladder about every 8 days to day 84 — nine ladders, eighteen extra SMS — against `-350` Consequence 3 and the Panel's refusal of one
  ladder per reminder, Q4 B); a ladder that ENDED (delivered / call / number changed / stopped) may be followed by a new one on a NEW
  failure; a person already dead AT SEND in the epoch may still start one (their later accepted rows count for D22, so the ladder's closure
  hold matters); and the stop predicate (I6). ⚠ The ORIGIN = the EARLIEST row in the epoch that passes EVERY row-level start condition above
  (accepted + `undelivered`, the current hash, ⛔ later `delivered` row, ⛔ reached call on/after its `sent_on`, the stop predicate judged on
  the row's OWN `run_id` — so a row in a run ended `mark_changed` fails it and blocks nothing) and is ⛔ COVERED: a row is COVERED by a
  ladder when its `created_at` lies between that ladder's origin's `created_at` and its `ended_at` (or the ladder still runs); an origin and a
  covered row never start a ladder (the UNIQUE `(chase, origin_row_id)`, LD2, backs the origin half). A stopped ladder KEEPS its origin and
  its covered rows: after a mark switch
  ends a family run `mark_changed` (`correction-chase.ts:20-28`) — or a `resubmitted` pause, a lifted `cannotRemind`, a person re-added —
  the NEXT reported failure (a row created after the stopped ladder's `ended_at`) starts the next ladder; re-starting the old origin or a
  covered row would re-send its steps (four extra texts for one
  undelivered reminder, against `-350` Consequence 3). If that later ladder concludes, LD6 maps the earlier row too.
  **Stop predicates** (extracted, I6 — Task 3): correction — the stops of `beginCorrectionFamilySend` with `run_ended` allowed ONLY for
  `end_reason = 'day_90'`, PLUS ⭐ `closure_closed` (the return's `claim_correction_closures` row is `closed` (`0131:77`), or the claim is in a
  terminal state — F8: `day_90` alone does ⛔ say whether a closure was decided) — read by its OWN query in the predicate's module or an
  injected hook shaped like `CorrectionHoldCheck` (`correction-chase.ts:142`), ⛔ an import of `correction-closure.ts` (which imports
  `correction-reminder-record.ts`, `:83-89` — a cycle; [[project_type_only_import_cycle_trap]]; the same holds for `contact-ladder-record.ts`
  if `correction-closure.ts` imports it for `ladder_running`); certificate — `certificateLadderStopReason` reads the ladder's ORIGIN run by
  `run_id` through `readCertificateRun(db, pariwarId, runId)` (`certificate-reminder.ts:123` — open OR ended; `planCertificateRun` CANNOT be
  reused: it judges only `f.openRun` (`readCertificatePlanFacts`, `:291`, `:306`), returns `{ kind: 'none' }` with no open run (`:248`) and,
  once the day-181 sweep ends a run `completed`, never returns `completed` again, `:246-252`; `beginCertificateFamilySend` maps anything but
  `continue` to `run_ended`, `certificate-reminder-record.ts:404`) and composes sub-predicates EXTRACTED from `planCertificateRun` (which
  calls them, so its own order is unchanged): `certificateRunReceived(run, facts)` (`:255-257`) and `certificateRunPauseReason(run, facts)`
  (`:259-268`). Its order: ended `superseded` / `certificate_received` ⇒ END; the certificate received ⇒ END; the pause reasons —
  `certificate_accepted` or a state in `NEVER_REENTERS` (moved out of the read model and exported — module-private at
  `certificate-reminder-read.ts:42`, its only user `:237`) ⇒ END, any other pause ⇒ the step `skipped:paused` (I6, LD3 — ⛔ a hold);
  `recipients.cannotRemind` (`certificate-reminder-record.ts:408`) ⇒ END; the person no longer on the contact record
  (`not_a_recipient`, `:410`) ⇒ END; a letter DELIVERED at that number to ANY person (`numberLetterDelivered`, `:420`; CR6
  `certificate-reminder.ts:779`) ⇒ END; and only then the horizon (run day > 180, the run open or ended `completed`) ⇒
  `skipped:past_horizon`. ⛔ `planCertificateRun`'s sweep order (completed BEFORE received / pause — it ends RUNS, ⛔ ladders). Checked at
  start, before each send and before conclusion / `ladder_escalation`. **End `ended_delivered`:** a `delivered` report on ANY `family_sms`
  or `ladder_sms` row of THAT chase to that person's number created after the origin — incl. a row sent to ANOTHER person of the claim on
  the same number that satisfied this person's step (T22) (PQ2 (a) asks whether the OTHER chase's delivered message also ends it — our
  reading ⛔). **End `ended_call`:** a call recorded `reached` for that person with `called_on ≥` `origin_sent_on` (LD10 — the call is a fact
  about the PERSON, so it ends a running ladder of EITHER chase — disclosed in PQ2). **End `ended_number_changed`:** the person's current
  number hash ≠ the ladder's (hash only at start, before a send and at conclusion — F6's KMS cost; between them the version-unchanged
  convention `currentNumberHash: undefined`). ⚠ **A hash that FAILS** (`readReturnPersonStates` catches it per person and sets `hashFailed`,
  `correction-reminder-record.ts:833-845`): before a send ⇒ the step `skipped:hash_unavailable` (LD3); at conclusion ⇒ conclude on the
  RECORDED number (the D30 convention) and alarm by ids — so a failing envelope can ⛔ hold a closure past `conclude_on`. **End
  `ended_stopped:<reason>`:** a stop. ⚠ **A step with NO report (silence) does ⛔ end a ladder** — our reading of 4 A's *"IS delivered"*
  (PQ1 asks). **Conclude** on `conclude_on` when ⛔ end condition has fired ⇒ `concluded_undelivered`, `concluded_on` = the IST date the
  sweep concluded it (= `conclude_on` unless a run was missed). A `delivered` report arriving AFTER conclusion: ⛔ un-conclude — the person
  counts as reached through that accepted row (D22, as for any accepted row) and stays letter-eligible (LD6) — as for a send-time refusal
  today, unless LD17 decides otherwise.
- **LD6 — What a conclusion un-counts (the B1 mapping — I3, I4).** Inside each chase's row reader (`readReturnFamilyRows` — return-scoped,
  `run.return_decision_id`; `readClaimCertificateFamilyRows` — CLAIM-wide across runs, `certificate-reminder.ts:699-731`): the SQL gains
  `reminder_id` and the row's `sms_send_deliveries` state (a LEFT JOIN on (`cr`|`ce`, `reminder_id`) — at most ONE row per send, the PK);
  the person's concluded ladders are read SEPARATELY; and the mapping is applied in TS INSIDE the reader (still the ONE copy per chase) —
  ⛔ a row-multiplying JOIN on `claim_contact_ladders` (under A→B→A two concluded ladders share hash A and a JOIN returns every A row twice,
  inflating `remindersAccepted`), ⛔ an `=` on a hash in SQL (`correction-closure.ts:323` — inv. (f): compare with `sameNumberHash`).
  Epochs come from the SAME rules as `evaluatePersonRunState` — `isEvidentialReminderRow` (`correction-chase.ts:711-714`) + the time order
  `compareReminderRowsByTime` — and each row matches at most ONE ladder (its own epoch's). **The rule:** once ANY ladder of that (claim,
  chase, person, number) is `concluded_undelivered` in an epoch, EVERY `accepted` `family_sms` row of that person, on that number, in that
  epoch, whose report is `undelivered` — EARLIER rows included (a row "covered" by a stopped ladder — LD5) — reads with EFFECTIVE outcome
  `rejected_unreachable`, `deadOn = concluded_on`, `concluded: true` (a row covered by an `ended_delivered` ladder may be mapped harmlessly:
  that ladder's delivered row still counts). Every other row reads as stored — incl. an `accepted` row with ⛔ report (`-351` 1 A) and
  every row of an epoch with ⛔ concluded ladder (a RUNNING or ENDED ladder only). ⛔ A stored outcome changes (I2). ⇒ by construction: D22
  `reachedBySms` stops counting the concluded rows; `foundDeadOn` is set (letter-eligible on BOTH chases — `correction-letter.ts:185-187`,
  `certificate-reminder.ts:818`); `numberKnownDead` follows if the LAST evidential row is a concluded one (⇒ closure notice by LETTER,
  `closureNoticeRecipients` `:435`); the queue status `unreachable`; the letter track starts. The mapping needs ⛔ number hash and ⛔ KMS (it
  compares the ladder's STORED hash with the rows' stored hashes) ⇒ the record-derived queue lines and the D30 sweep path, which read rows
  WITHOUT crypto (`correction-chase-read.ts:345`, `claim-correction-reminders.ts:1186`), inherit it — they judge on the recorded epoch, as
  today. Every caller of `readReturnFamilyRows` gets it (`readReturnPersonStates` → `beginCorrectionFamilySend`, the letter precondition
  `correction-letter.ts:181`, the sweep, the queue; `readClosureReach` `:409`; the record lines; the D30 path) — intended; the catch-up's
  `readRunFamilyRows` stays unmapped (slot presence only).
- **LD7 — The found-dead DATE of a concluded reminder = `concluded_on`, and `foundDeadOn` = the EARLIEST dead date in the epoch.** `-250`
  #2: the letter chase *"counts from the day the phone was found dead"* — under a ladder that is the day the system concluded it (with
  `sent_on` the +7 chase would be overdue on the day of conclusion). The row type gains OPTIONAL `deadOn?: string` and `concluded?: true` (set
  only by the mapping); `evaluatePersonRunState` computes `foundDeadOn = min over the epoch's dead rows of (deadOn ?? sentOn)` and takes
  `deadKind` from THAT row, ties broken by `compareReminderRowsByTime` (the earlier row) — with ⛔ `deadOn` anywhere this is EXACTLY today's
  `epoch.find` on the time-sorted epoch (`correction-chase.ts:758`) (⛔ "the first row in time order" otherwise — a concluded origin sent on
  day 1 but dated day 9 must ⛔ push a day-5 send-time refusal's found-dead date to day 9); the epoch and reset logic read `sentOn` only and
  are unaffected; `deadKind` gains `'not_delivered'` (iff the chosen dead row has `concluded`) — its only consumer TODAY is
  `correctionPersonStatus` (`correction-chase-read.ts:124-129`; ⛔ on any DTO; the certificate chase never reads it — this story adds LD9's `planCertificateStaffChase`
  read and LD12's `unreachable_reason` on both DTOs), which maps it to
  `unreachable` (a compile error until widened). ⛔ Its OUTCOME logic changes (I3). **Cost:** a shared pure function gains one optional input
  — both chases' tests pin the default (⛔ `deadOn` ⇒ today's result).
- **LD8 — D22 and the closure hold (`-351` 4 A, 5 A, 6 A).** `evaluateClosurePersonReach` (`correction-closure.ts:365-392`) gains
  `reachedByLadderSms` — any correction `ladder_sms` row of that person, scoped to the return, `accepted`, on the current number, whose OWN
  `sms_send_deliveries` state is ⛔ `undelivered` (so a SILENT ladder SMS counts — `-351` 1 A, PQ1's reading) — read by ONE new reader beside
  `readReturnFamilyRows` (⛔ widening it — LD2), and `reachedByCall` — any call recorded `reached` for that person on/after the return's
  first family run's start (LD10); `reached = sms || ladderSms || letter || call`. `assertClosureGround` gains `ladder_running` — ANY
  correction ladder `running` for any person of the claim's live return — placed AFTER `claim_corrected` and BEFORE `not_reached` (so staff
  see WHY) in the guard, the union, `AC6_REQUEST_REFUSALS` (its lockstep test pins `ClosureRequestBlocker.options.slice(0, AC6.length)` against
  it plus the literal tail — inserting before `not_reached` in BOTH stays green; ⛔ `assertClosureGround`'s own order) and
  `ClosureRequestBlocker`; at ALL four callers by construction (request / decide / escalated-decide under `lockForClosure`; `readClosureReadiness`
  unlocked — a read); plus F7's list (`blockerDto`, the api switch, the admin blocker copy — asserted by TEXT, since the map is ⛔
  exhaustive); the api `not_reached` message (*"reached by a delivered text or letter"*, `claims.correction-closure.handlers.ts:130-134`)
  gains *"or a call"*. ⚠ A running CERTIFICATE ladder does ⛔ hold the correction closure (our reading — 6.19d invariant 2; PQ2 (b) asks).
  `closure_due` / `closure_escalation` keep firing (`readClosureReadiness` shows `ladder_running`; ⛔ change to `correction-closure-jobs.ts`
  — a staff prompt, ⛔ what a family receives). The frozen closure notice: a ladder cannot be running at decide (the gate) and ⛔ ladder
  starts after a closure (`closure_closed`, LD5).
- **LD9 — The escalation "for a call or a letter" (`-350` ruling 2, `-351` 5 A; ⚠ the reached-call half flagged for BigDev's §0 check).** On
  conclusion the sweep writes ONE staff row per ladder, purpose `ladder_escalation` (NEW on both send tables, `subject_key =
  'ladder:<ladder_id>'`, the new partial UNIQUE), to the claim's live District Admin (correction: the `letter_chase` recipient rule;
  certificate: the live shepherd, as CR10 — `districtAdminKey`, `claim-certificate-reminders.ts:499-502`) — outcome `recorded`, or
  `no_target` when there is no live shepherd (`staff:unassigned`, with the `contact_ladder.escalation_unassigned` alarm in CR10's shape `:487-491`; the certificate purpose↔outcome CHECK
  allows both — LD2) — on the return's LATEST run even if ended (the `staffWriter` anchor, F8 — exported for this; correction) / the origin
  run (certificate), written on conclusion WHETHER OR NOT the certificate run is paused (a staff record, ⛔ a family text; `-275` Q4 governs
  reminders — disclosed in the Policy meaning); `claim_contact_ladders.escalated_on` records it. Correction: PUSHED — and the push must
  actually reach it: the push child lists only rows with `sent_on = p.sentOn` and a push is enqueued only for staff with a row recorded
  TODAY (F12), so (i) `ladder_escalation` joins `STAFF_PUSH_ITEM_PURPOSES` (`claim-correction-reminders.ts:495-501`) AND the `todays`
  enqueue list (`:1366-1369`); (ii) the push child's item query takes `ladder_escalation` rows with `sent_on <= p.sentOn` that were created
  after the LATEST `staff_push` row for that recipient on the claim with `sent_on < p.sentOn` (or with none) — ⛔ today's, which
  `runCorrectionStaffPush` claims BEFORE its item query (`claim-correction-reminders.ts:577-597`) — ⛔ "the next morning's push" would never list a row
  dated yesterday; (iii) the ladder sweep enqueues a push for (claim, District Admin, today) whenever such an un-pushed row exists and ⛔
  `staff_push` row exists for them today — open or ended run — under the day UNIQUE (`0128:77`); a row written AFTER today's push went is
  carried by (ii) into the next push. Certificate: RECORDED only (CR10 — ⛔ push in v1). The ask is CAP-AWARE: "call or post a letter";
  "call" only when the letter cap is reached (correction 2 per person per return — F12; certificate one per claim, ever — F14); "post a
  letter" only for a nominee while nominee calls are not cleared (LD11 — `-354` decision 5); "neither is possible — escalate" when both are
  closed (a nominee at the certificate letter cap before counsel). The existing found-dead letter track (+7…+12 / +13) then runs FROM
  `concluded_on` (LD7) where its window allows (open run, `slot < 90` / not paused) — its rules unchanged. ⭐ A call recorded `reached` stops
  the staff asks ONLY for a person whose dead outcome is a CONCLUDED one (`deadKind 'not_delivered'`): `planRun` and
  `planCertificateStaffChase` (which already receives `deadKind` through `p.track`) gain a per-person `reachedCallOn` (scoped to the epoch
  like `letterDelivered`) consulted only then — that MATCHES `-351` 5 A (*"asked to call or post"*, satisfied by either); for a SEND-time
  dead number the letter track is unchanged (`-230` / `-231` C — a dead number is answered by POSTED LETTERS — a reached call stopping it
  there would NARROW them ⇒ the Panel's, ⛔ built). ⛔ The scheduled family reminders change (their stop stays `-250` #1, a DELIVERED letter).
  `escalated` on the correction queue counts `purpose='escalation'` only — `ladder_escalation` does ⛔ light it. **Cost:** a day-84 ladder
  concluding ≈ day 92 gets the `ladder_escalation` + push, but ⛔ +7…+13 chase (the run is ended — as today for a number refused on day 84).
  ⚠ *Dated 2026-10-18 (code review round 2):* narrowed as built by Decision `2026-10-18-363` decision 1 (`39b52757`, BigDev: D1 (a)): ONE rule for
  which reached call answers the ask AND stops the letter-chase asks — `called_on` on or after the concluded ladder's `origin_sent_on`;
  the "scoped to the epoch like `letterDelivered`" reading above no longer governs it.
- **LD10 — The call record.** NEW tenant table `claim_contact_calls` (append-only): `call_id`, `pariwar_id`, `claim_case_id` FK,
  `person_key` (the chase grammar), `chase` (`correction|certificate` — the surface it was recorded from; ⛔ a reach scope), `ladder_id`
  (nullable), `called_on date` (IST; ≤ today; ≥ the claim's filing date), `answered_by` (`the_person|family_member|someone_else|nobody`),
  `outcome` (`reached|not_reached`; CHECK `outcome='reached' ⇒ answered_by IN ('the_person','family_member')`), `recorded_by_actor`,
  `recorded_by_display` (`getDisplayName` ⇒ `AdminDisplayNameMissingError` on null, ⛔ fallback — F17;
  [[project_admin_display_name_attribution]]), `created_at` (`clock_timestamp()`). ⛔ free text, ⛔ names, ⛔ a number (*"who answered"* as
  a role — `-351` 5 A's reading). GRANT `SELECT, INSERT` only; tenant RLS per command (`policies/claim-contact-call-rls.ts`);
  policy-regression spec. Routes, in the EXISTING route files and path grammar (so the district resolver and the human-actor gate apply —
  F17): `POST /api/v1/p/:pariwarId/admin/claims/:claimCaseId/correction/calls`, `GET …/correction/calls/number?person_key=`, `POST
  …/admin/claims/:claimCaseId/certificate-reminders/calls`, `GET …/certificate-reminders/calls/number?person_key=` (⛔ collision with an
  existing segment). Each POST takes a MANDATORY `Idempotency-Key` (`400` without it) over the keyed store, in the house shape (T17): store
  key `claim.contact_call:<pariwar>:<actor>:<Idempotency-Key>`, a 24 h TTL, the tx opened INSIDE the claim's try (the letter handler already
  opens its own `openScopeTx`), COMMIT then `recordResult`, `release()` on failure; a replay under the same key returns the FIRST result
  whatever the body (the store compares ⛔ bodies — F17; ⛔ a "mismatch refusal"); a replay while the first is in flight ⇒ `409
  …idempotency_in_progress`. Each GET is behind a NEW step-up context `contact_call_number` (a free string — ⛔ registry; the constant in
  BOTH `apps/api` and `apps/admin/src/api/client.ts`), decrypts the person's CURRENT number through the reminders' resolver (after a 6.20
  change: the new number), writes ONE audit line per reveal, `Cache-Control: no-store`. Audit: `admin_claim_correction.call_recorded`,
  `admin_claim_correction.call_number_revealed`, `admin_claim_certificate_reminder.call_recorded`,
  `admin_claim_certificate_reminder.call_number_revealed` (the `AuthAuditEventType` union — ⛔ frozen pin; locator `claim:<lower uuid>`; ⛔
  PII in `context`). Preconditions: a contact record + live agreement (D30 — as letters); the person on the chase's recipient set; LD11.
  **Locks:** a call that may end ladders of BOTH chases takes `acquireCorrectionChaseLock` THEN `lockCertificateClaim` (advisory THEN row —
  `correction-closure.ts:12-16`; `lockCertificateClaim` is `claims` FOR UPDATE, `certificate-reminder.ts:322-334`, and ⛔ certificate writer
  takes the advisory key ⇒ ⛔ deadlock); the ladder sweep re-reads calls inside each chase's lock before an end / conclude. **Key — ⭐ (a)
  Recommended:** REUSE `claim.record_correction_letter` (same holder, same act family; the 6.19c / 6.19d precedent; catalog stays version 52
  / 68 keys). **(b)** mint `claim.record_contact_call` (catalog version 52 → 53 and keys 68 → 69 — `permissions.test.ts:234`; authorised in
  the 6.37c entry first). ⭐ A reached call: ⇒ D22 `reachedByCall` (LD8 — a call recorded from either surface counts for the correction
  closure, because it reached the PERSON; disclosed in PQ2); ⇒ ends that person's running ladder(s) whose `origin_sent_on` ≤ `called_on`
  (LD5); ⇒ stops their asks if concluded (LD9); ⇒ ⛔ changes letter-eligibility or the scheduled reminders.
- **LD11 — Calls to a NOMINEE before counsel: the gate is DECIDED, only its MECHANISM is open.** `-354` decision 5 (author-commit) recorded
  what `-352` Consequence 3 called *"BigDev's decision, recorded separately"*: *"**a call to a nominee** waits for G1"* (counsel's written
  confirmation of the nominee's basis); its §0: *"stricter, never looser"* — ⛔ a Trustee-ratified clause moves. ⇒ the conclusion's ask for
  a NOMINEE reads "post a letter" (LD9), and the call routes refuse a nominee person key (`nominee_calls_not_cleared`) and its number reveal
  until the gate is cleared, which happens ONLY when a NEW roster row (next free — F18) `claim-contact-nominee-call-basis` closes on
  counsel's written basis (G1's call half). The claimant's calls are live — on `-351`'s reading, ⛔ on the agreement (F21; disclosed).
  **Mechanism — ⭐ (a) Recommended:** ONE environment variable (e.g. `CLAIM_NOMINEE_CALLS_CLEARED=1`, default unset ⇒ refused) read at boot
  by BOTH `apps/api/src/config.ts` `loadConfig` (the api's booleans are ad-hoc env vars there — `COOKIE_SECURE`, `TURNSTILE_FAIL_OPEN`; ⛔
  a dotted-key registry exists; the dotted `sms.dlt.*` names are Secret Manager names) AND `apps/jobs/src/boot.ts` (module-level, beside
  `CLAIM_PEER_MESH_WINDOW_SECONDS` `:200` — jobs has ⛔ config module; passed into the ladder sweep's deps as `nomineeCallsCleared`, the
  `appLinksBaseUrl` precedent `:687`), set in ONE place in the deployment config and logged at boot by both apps; the domain never reads
  it — the api call handlers, the api staff-view DTO handlers (LD12's `ask`) and the jobs ladder sweep pass
  `nomineeCallsCleared: boolean` into the domain (`contact-call.ts`, `ladderAsk`). **Cost:** two readers of one variable (a boot line in
  each shows a drift). **(b′)** a governed feature flag in the Story 10.8 registry (`packages/domain/src/feature-flags/registry.ts:110`
  `FLAG_DEFAULTS`) — **cost:** `governance_boundary.yaml` admits a flag only with a Trustee attestation in `.decision-log.md`, an
  ADR-cited `allow` entry and a `count` bump; none of its three kinds (`member_flow` / `provider_selection` / `channel_routing`) fits a
  staff call gate, and a new kind is itself a bar expansion; `packages/domain/src/claim` is a PROHIBITED root (*"A flag must never condition
  claim lifecycle …"*) — leg (b) goes RED on a flag import there, so the flag could be read only in `apps/api/src/modules/claims` handlers
  and `apps/jobs`, passed in as the same boolean; and its per-Pariwar ≻ global override contradicts *"cleared ONLY when the roster row
  closes"*. **(d)** ⛔ switch:
  the nominee-call condition held ONLY as a closure leg of the new roster row that must close before claim texts go live — cost: counsel's
  answer then gates EVERY claim text, ⛔ only nominee calls. ~~(b) both live now~~ — FORECLOSED by `-354` decision 5 (choosing it would
  need a superseding entry). **Cost (all):** a nominee is reached only by post until counsel answers (and at the certificate letter cap,
  not at all — LD9's "neither"); a DA who phoned a nominee anyway cannot record it.
- **LD12 — What staff see (fires the deferred *"⛔ Staff view labels a send 'reported undelivered'"* — its trigger is THIS create-story).**
  Correction: `CorrectionChasePersonDto` gains `follow_up: { state: 'running'|'concluded'|'ended_delivered'|'ended_call'|'ended_other',
  started_on, next_step_on, concluded_on } | null` (the person's LATEST ladder in the return), `unreachable_reason: 'refused'|'not_delivered'|null`
  (from `track.deadKind` — LD7's MIN row), `reported_undelivered: number` (accepted reminders in the epoch whose report says undelivered),
  `ask: 'call_or_letter'|'call'|'letter'|'none'|null` (LD9), and `calls: ContactCallDto[]`; the status enum is UNCHANGED (F11) — a concluded
  person reached by a call still shows `unreachable` (disclosed in the Policy meaning). Certificate: `CertificateReminderPersonDto` gains the
  same `follow_up` (the LATEST ladder in the CLAIM — certificate runs have no return), `unreachable_reason` (from `track.deadKind`), `ask`,
  `calls`; `sms_state` gains ⛔ value — it shows `unreachable` only when the LAST evidential row is the concluded one
  (`certificate-reminder-read.ts:197-209`); a later accepted row shows `reminded` while the person stays letter-eligible, so the panel reads
  `unreachable_reason`, ⛔ `sms_state`; the copy *"this person's number does not work"* (`certificate-reminders/i18n-en.ts:53`) becomes
  reason-aware. ⚠ The certificate LIST hides a claim whose run is ended (`listedForRun` `certificate-reminder-read.ts:237-238`) ⇒ the listing
  predicate gains "any running ladder, or a concluded ladder whose ask is not yet answered" (else a day-180 origin's ladder and a "call"-only
  ask after day 180 are invisible). Both DTOs are `.strict()` RESPONSE schemas (`packages/contracts/src/claims/correction-chase.ts:153-163`,
  `certificate-reminder.ts:91-103`) — a field missing from the schema fails the serializer. Admin: both panels show "Follow-up texts running —
  next on <date>", "Texts were reported not delivered — <the ask>", the call form and the call list. Contracts re-declare the vocabularies
  by hand (F11) — the certificate side HAS a lockstep test (`packages/contracts/tests/certificate-reminder-lockstep.test.ts:25-30`) that
  gains legs for `follow_up.state`, `unreachable_reason`, `ask`; the correction side has ⛔; contracts tests run outside tsc
  ([[project_contracts_tests_outside_tsc]]). Peer-mesh / suspicion views: ⛔ (the deferred item's peer-mesh part stays).
  ⚠ *Dated 2026-10-18 (code review round 2):* three staff lines reworded as built by Decision `2026-10-18-363` decision 2 (`39b52757`, BigDev: D2
  (a)) — the closure refusal *"A follow-up is still open for someone the network said a text did not reach."*, *"Follow-up running —
  next step on <date>."*, *"Follow-up ended on <date> — none was reported delivered."*; the LD12 wording above is kept as written.
- **LD13 — Alarms and the burst.** The `-269` §4 burst alarm (F13) is ⛔ extended (it counts SEND-time refusals — a different signal). NEW:
  a daily ladder line `[jobs] contact-ladder: started N, ended_delivered N, ended_call N, concluded N` and an alarm
  `contact_ladder.burst:<count>` when ≥ 3 ladders START in one Pariwar on one IST day (a DLT scrub / template fault makes EVERY report
  undelivered ⇒ every person gets a ladder, more failing texts and a conclusion — the alarm is the pointer); plus
  `contact_ladder.rls_bound_role` (T24), `…hash_unavailable`, `…scheduled_not_sent`, `…escalation_unassigned`. ⚠ Every alarm reaches the
  LOGS only until roster Row 32 (h) wires `onAlarm` to a named person — and Row 32 (h) closed is a GO-LIVE condition of this ladder
  (`-354` decision 4 (b); ⛔ a merge or `done` fence). ⛔ an id, number or name in a line (the hash / scheduled alarms carry claim ids only, as
  6.37b's do).
- **LD14 — Records.** (a) ONE author-commit — the 6.37c entry (the next free id, re-grepped on EVERY branch and worktree right before;
  6-31 wants the next id too — F18), dated the day it is committed — carrying LD1–LD13 and LD15–LD17 as answered + the supersessions (the
  ONE copy): `-353` decision 1 IN PART (LD1); `-353` decision 2's *"move to 6-37c unchanged"* (AC11 is re-written — F1, `-351` 3 B); (⛔ a
  supersession: `-353` decision 1's *"its `epics.md` entry is owed at its create-story"* was DISCHARGED at create-story — Task 0.4 adds the
  decided shape as a dated note); `-351` Consequence 2's *"built but off"* (LD1 — NARROWED); the 6.37b story file's AC11 / Task 7 lines (F1)
  and *"the certificate chase's letter-eligibility is unchanged"* (superseded by `-351` 3 B — recorded, ⛔ an edit); the 6.37b I1 restated (I1
  here); LD16's answer — if BigDev moves the counsel question to 6-37d, `-354` decision 5's *"with row 6-37c's Task 0"* is superseded IN
  PART (⛔ re-read). ⛔ `-352` C3 on that list — `-354` decision 5 already recorded it (LD11). (b) Records commit: a dated note under the
  `epics.md` `### Story 6.37c` entry (the decided shape, the nominee caveat — `-354` decision 5 — and the Row 32 (h) go-live condition —
  `-354` decision 4 (b)); (6.37b's `epics.md` entry already carries its round-2 dated note — ⛔ another); the sprint rows (6-37c →
  `in-progress`; NEW `6-37d-claim-contact-whatsapp-step: backlog` with its comment, if LD1 (a)); roster Row 32 note (9) AND Row 33's note
  that repeats its gate (6-37c `done` does ⛔ need 6-37d — both sites, ⛔ one); Row 26 note (the ladder sweep joins the jobs-role list and
  adopts the `canReadAcrossPariwars` guard — T24); Row 18 note (`-352` moves the nominee basis off the claimant's agreement; claimant calls
  ride on `-351`'s reading — F21; the counsel question LD16 put); the NEW nominee-call roster row (LD11); ADR-0042's dated note (LD15 — the
  restated bound incl. I1's genuine-failure effect, and the token decision); the consent sheet
  `docs/knowledge-transfer/adr-ratification-consent-sheet-2026-10-17.md` §1–§2 revised (§2's *"holds under the Panel's ruling"* lacks
  ADR-0042's two effects; §1 lacks the edge-bar departure) — or ADR-0042 pulled from the pack; the §3.4 proposal's and the Panel pack's
  row references CORRECTED in place while unpresented, each with a revision line (F19's list — 6-37d for WhatsApp; this row for G1's call
  half), plus the pack's disclosures (a pointer to `-354` decision 2's, which stands in the proposal; `-354` decision 4 (c)'s in full); and an annotation where deferred-work, the sprint comment and the
  6.37b story cite this row's pre-rebase SHAs (`1e0c6f2e` ⇒ `c19e6534`, `f8102c02` ⇒ `1534293b`). (c) ⛔ new ADR (the ladder is domain
  logic on existing transports). (d) The deferred *"`delivered_at` … an unused seam"* item's trigger FIRES (this migration touches both
  tables): ⭐ recommended — keep it unused (delivery lives in `sms_send_deliveries`, `-347` DR5) and record that in the 6.37c entry, the
  item **Resolved via explicit deferral** by that entry (the seam remains).
- **LD15 — The report token, BEFORE the ladder is built (ADR-0042 Security: this row *"decides whether the static token is still enough,
  BEFORE it builds the ladder and before Row 33 (a) ratifies this text"*).** Under the ladder a forged report has two new effects relative
  to a genuine failure (I1; ADR-0042 (i) and (ii)): a forged `delivered` cancels a person's closure hold; a forged `undelivered` starts up to
  two more copies of an approved reminder, an ≈ 8-day closure hold and a call / letter ask. ⭐ **(a) Recommended:** keep the static header
  token (rotation as ADR-0042 says) and RESTATE the bound in a dated ADR-0042 note — the forger must hold the token; the worst case is
  bounded per person (one ladder at a time, the no-restart rule, the burst alarm); ⛔ worse than today's no-report state. **Cost:** a token
  leak lets one end a real failure's protection for persons the forger targets until rotation. **(b)** a cross-check — a ladder ends
  `ended_delivered` only when a status pulled from MSG91 for that request id agrees (whether MSG91 offers such a pull for Flow sends is
  UNVERIFIED — a Task 0 check before choosing it; a new outbound call, a new failure mode). **(c)** stronger ingress authentication — ⛔
  available from MSG91: it signs ⛔ report (⛔ HMAC, ⛔ shared secret) and publishes ⛔ source IPs (ADR-0042's deciding fact), so only the token's
  handling can be hardened (shorter rotation), which narrows a leak's window and ⛔ closes it. Whichever: the consent sheet §1–§2 is revised (or ADR-0042 pulled from the pack) before the pack is
  presented (LD14 (b)).
- **LD16 — The nominee text / letter basis question goes to COUNSEL with THIS row's Task 0 (`-354` decision 5: *"The basis for the texts
  and letters nominees receive TODAY, once the claimant's new agreement no longer names nominees (`-352`'s reading), is put to counsel with
  row 6-37c's Task 0 — ⛔ changed until then"*; Consequence 2).** ⭐ **(a) Recommended:** Task 0.5 puts it (a short written question; a Row
  18 dated note naming it); nothing a nominee receives changes until counsel answers; 6-37d keeps only the REWORDING. **Cost:** ⛔ (the
  question rides with the Row 18 conversation already open). **(b)** move it to 6-37d with the rewording — supersedes `-354` decision 5 IN
  PART in the 6.37c entry. **Cost:** the question waits for 6-37d (after 6.31), though the nominees' basis question exists today.
- **LD17 — Letter-eligibility after a later DELIVERED reminder (⚠ flagged for BigDev's §0 check — it decides who is offered letters).**
  6.37b's AC11 annotation: *"the leg 'STILL so after a later reminder is reported `delivered`' CONFLICTS with `-351` ruling 4 A … row
  6-37c's Task 0 reconciles both."* B1 (`-350` ruling 1) says a concluded person is offered the letter route *"as when the network refuses
  a number at the moment of sending"* — and a send-time refusal today stays letter-eligible for that number for good (`foundDeadOn` is
  sticky); 4 A says a delivered message *"ends it, and the person counts as reached"* — which this story honours for REACH (the delivered
  row counts for D22). ⭐ **(a) Recommended:** keep letter-eligibility sticky after conclusion (B1's *"as when"*; reach is restored by the
  delivered row; a letter is an EXTRA channel, ⛔ a penalty) and disclose it — AC4's leg stays. **Cost:** a District Admin may post a letter
  to a family whose later text got through. **(b)** a `delivered` report on a later row of the SAME epoch clears the concluded mapping
  for letter-eligibility (the person counts as reached in every sense) — cost: the epoch rule gains a delivered-report exception in the
  shared pure function (I3's "outcome logic unchanged" no longer holds) and the found-dead letter chase can stop mid-way. If BigDev judges
  it the Panel's, it joins the PQ note as PQ4.

## 🏛️ Candidate Panel questions (⏳ §0 check by BigDev at Task 0.2; routed at Task 0.3 only if they pass — ⛔ answered here)

> ✅ **RULED 2026-10-18 — Decision `2026-10-18-360` (Dhiraj Rahul + Kalpana Bharti): PQ1 A, PQ2 A, PQ3 A** — each our reading below,
> as designed. Every *"or as ruled"* in the ACs now means the reading. The text below is kept as written.
>
> ⚠ *Dated 2026-10-18 (code review round 2):* the heading's ⏳ and the routing-note line below (*"WRITTEN 2026-10-18, ⛔ sent"*) are as written; the §0
> check passed (`-355` decision 18), the note went out as Panel pack item 4 and was ANSWERED 2026-10-18 (`-360`). `-360` Consequence 1:
> *"the code must still match at review"* — checked in code review round 2: three acceptance auditors (chunks A, B, D) confirmed
> `ladderEndReason` (a follow-up text with no report does ⛔ end a ladder; only this chase's rows end it — Q1 A, Q2 A),
> `hasRunningCorrectionLadder` (only a CORRECTION ladder holds the correction closure — `contact-ladder-read.ts`, `correction-closure.ts`;
> Q2 A) and `ladderStepGate` (`skipped:past_horizon` / `skipped:paused`, the ladder still concludes — Q3 A). A match.

- **PQ1 — A follow-up text that gets NO report at all.** `-351` 1 A *"A text with no report keeps counting as reaching the person"* meets
  4 A *"any message to that person that IS delivered … ends it"*. If ladder SMS 2 or 3 is accepted and NO report ever comes (MSG91's webhook
  paused, an account fault — 6.37b F6 / F8), does the ladder end with the person reached (1 A), or run on to its conclusion and the call /
  letter ask (4 A)? §0: passes — it decides who is offered a letter and whether the District Admin is asked to call, and two ratified clauses
  meet at an edge. **Our reading (built unless ruled otherwise): run on** — only a `delivered` report or a reached call ends a ladder; the
  silent ladder SMS still COUNTS for D22 (1 A — LD8), so the claim CAN be closed once the ladder concludes, while the person is ALSO
  letter-eligible and the District Admin asked. Options: **A** run on (our reading — cost: a call / letter for a family a silent text may have
  reached); **B** end as reached once the step is two days old with ⛔ report (cost: a family whose phone stayed off is treated as reached on a
  text ⛔ report confirms; ⛔ call / letter). Arises only when reports stop — the silence alarm (`-347` DR12) fires then, to the LOGS only
  until roster Row 32 (h) (`-354` decision 4 — the note says so; ⛔ "tells staff").
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
  ladder started by a late reminder (certificate day 180; a correction reminder near day 84 only when its report arrives days late — a
  day-84 failure reported on time sends its texts on days 86 and 88), or running through a certificate pause, would text the family
  after the reminders' ratified end or while they are paused. §0: passes — WHEN a family is texted, and two ratified clauses conflict. **Our reading (built unless ruled
  otherwise): the end wins for texts** — ⛔ ladder SMS past day 90 / day 180 / while paused; the ladder's clock still runs and it CONCLUDES on
  its date (so the closure still waits — 6 A — and the letter route still opens). Options: **A** the end wins (our reading — cost: a family
  whose last reminder failed gets one or two fewer tries before the call / letter); **B** the ladder's texts go past the end (cost: texts
  after *"stop at day 90"* / 180 days, against those rulings as written); **C** a late ladder concludes at once at the end (cost: no retry at
  all for a last-day failure).
- **All three:** ONE routing note `trustee-panel-routing-note-2026-10-18-6-37c-ladder-edges.md` (WRITTEN 2026-10-18, ⛔ sent — Panel pack item 4) (independent questions, the `-351` note's
  shape), written from the TEMPLATE (referenced, ⛔ copied), E3 stating LD3's slippage (a late report stretches the closure hold), E4's
  commands run (an empty result is a finding), ⛔ "shown to the Panel" until BigDev SENDS it ([[feedback_shown_to_panel_means_sent]]).
  **Blocks:** ⛔ any code task (Tasks 1–9); the end / horizon rules are written to our readings behind ONE pure function `ladderEndReason(…)` and ONE
  `ladderStepGate(…)` so a ruling is a one-function change + its legs; the row is ⛔ `done` until each routed question is RULED and transcribed
  (a Trustee-ratified entry) and the code matches it. If BigDev judges any one the author's at Task 0.2, it is recorded in the 6.37c entry
  instead. If BigDev judges LD17 the Panel's, it joins the same note as PQ4.

## Acceptance Criteria

Notation: "the chase" = correction or certificate; every AC holds for BOTH unless it names one. Live legs at :5433. A controllable clock.

- **AC0 — Governance before code (Task 0).** LD1–LD17 answered by BigDev (verbatim in the Debug Log) and committed ALONE as the 6.37c entry
  (the next free id, re-grepped on every branch and worktree first — F18); PQ1–PQ3 (+ PQ4 if LD17 is routed) through BigDev's §0 check and,
  if they pass, the ONE routing note WRITTEN (⛔ sent); the counsel question (LD16) WRITTEN; LD15's token decision taken; then ONE records
  commit (LD14 (b)); the sprint row → `in-progress` and the ledger — all BEFORE any code.
- **AC1 — A ladder starts only on a REPORTED failure (LD5 start; I5).** Legs: `accepted` + `undelivered` ⇒ ONE `running` ladder
  (`origin_sent_on` = the row's `sent_on`; `sms2_due_on = D + 2`; `whatsapp_step = 'skipped:whatsapp_not_built'` for a claimant,
  `'skipped:nominee_no_whatsapp'` for a nominee — `ladderWhatsappStep(role)`, `-356` dated note); `accepted` + ⛔ report ⇒ ⛔
  ladder (1 A); `delivered` ⇒ ⛔; a report on an OLD number (after a 6.20 change) ⇒ ⛔; a second undelivered reminder while one runs ⇒ ⛔ second
  ladder (and the partial UNIQUE refuses a direct INSERT — 23505 pinned); a later reminder already `delivered` ⇒ ⛔; a reached call on/after the
  origin ⇒ ⛔; a person already CONCLUDED on that number ⇒ ⛔ (the no-restart rule — or as BigDev decides); a person whose earlier ladder ENDED
  delivered and who fails again ⇒ a new ladder; a report on a day-84 origin first seen on day ≥ 90 (the run ended `day_90`) ⇒ starts; a report after a closure
  was DECIDED (incl. on a `day_90`-ended run) ⇒ ⛔ (`closure_closed`); a stop failing ⇒ ⛔; two concurrent sweeps ⇒ one ladder (UNIQUE `(chase,
  origin_row_id)` and the chase lock); a row older than the 14-day scan bound ⇒ ⛔ scanned; a `closure_notice` / `ladder_sms` / other-chase row
  ⇒ ⛔ origin; a ladder ended `ended_stopped` (a mark switch ends its run `mark_changed`) KEEPS its origin — after the switch back opens a
  new family run, that origin row starts ⛔ second ladder (the UNIQUE refuses a direct INSERT) and the NEXT reported failure starts the next
  ladder; a stop that lifts (`resubmitted` resumes) re-sends ⛔ step of the stopped ladder, and a COVERED row of it starts ⛔ ladder; a covered row
  before an `ended_delivered` end does ⛔ block a fresh failure created after that end; under an RLS-bound
  role the sweep refuses with `contact_ladder.rls_bound_role` and starts ⛔ ladder (T24 — a leg).
- **AC2 — The steps and the clock (LD3, LD4, I6, I8).** SMS 2 on D + 2 at the 10:00 run; SMS 3 on <SMS 2's date> + 2; conclusion on <SMS 3's
  date> + 4 (D + 8); a late-detected ladder sends its first due step at the next 10:00 run (⛔ two in one run) and every later date moves; each
  ladder SMS is a `ladder_sms` row in the chase's own table with `subject_key 'ladder:<id>:2|3'`, the chase's reminder template and named
  values (⛔ a new template), `correlation` `cr` / `ce` + its own row id; every row of LD3's outcome table, one leg each (incl. a transient
  retried within the run's backoff, a row left `attempting` past the day finalised `error` ⇒ `sent`, the next date from its `sent_on`, and a
  failed hash ⇒ `skipped:hash_unavailable`); every stop refuses (one leg per
  stop through the EXTRACTED predicate — and the original `begin*FamilySend` suites green UNCHANGED); ⛔ ladder SMS on correction day ≥ 90, on
  a `completed` certificate run, or while paused ⇒ `skipped:past_horizon` / `skipped:paused`, the ladder still concludes on its date (PQ3 —
  or as ruled); a pause `certificate_accepted` / a never-re-entering state / `cannotRemind` / the person off the record (`not_a_recipient`) / a letter
  delivered at that number to any person ⇒ `ended_stopped`; a certificate run ended `completed` with a certificate since received ⇒ END (⛔
  `skipped:past_horizon`); an SMS due on day 182 of a run ended `completed` on day 181 ⇒ `skipped:past_horizon` (⛔ a stop — the ended ORIGIN
  run is read, ⛔ `planCertificateRun`); a ladder concluding during a pause writes its `ladder_escalation` on conclusion. LD4 (a): on a
  scheduled day for that person ⇒ `satisfied`, ⛔ `ladder_sms` row (incl. the scheduled reminder and the ladder child running in either
  order at 10:00, the day-14 collision, and a step falling on a scheduled day after a slip); a `satisfied` step whose scheduled row never
  went ⇒ re-recorded `skipped:scheduled_not_sent` + the alarm; a second person of the claim on the SAME number already texted today ⇒
  `satisfied` (T22) — incl. while that person's row is still `attempting` with a NULL hash (two children, one phone); (b) if chosen
  instead: a `ladder_sms` row regardless.
- **AC3 — What ends a ladder (LD5; PQ1 / PQ2 as ruled).** `delivered` on a later `family_sms` ⇒ `ended_delivered`; on a `ladder_sms` ⇒
  `ended_delivered`; on another person's row that satisfied this step (same number) ⇒ `ended_delivered`; a reached call with `called_on ≥`
  the origin ⇒ `ended_call` (for a running ladder of EITHER chase), an earlier call ⇒ ⛔; a number change ⇒ `ended_number_changed`; each stop ⇒
  `ended_stopped:<reason>`; a silent `ladder_sms` ⇒ ⛔ end (PQ1 reading — or as ruled); a `delivered` message of the OTHER chase ⇒ ⛔ end (PQ2
  (a) reading — or as ruled); `undelivered` on a `ladder_sms` ⇒ ⛔ end; an end condition and `conclude_on` on the same run ⇒ the END wins; a
  `delivered` report after conclusion ⇒ ⛔ un-conclude, the person reached through the accepted row, still letter-eligible (LD17 (a) — or
  as decided). All end rules live
  in ONE pure `ladderEndReason(…)` with a unit table of every row above; the horizon / pause / one-a-day rules in ONE `ladderStepGate(…)`.
- **AC4 — The conclusion and the ONE mapping per chase (LD6, LD7, I2–I4).** Live, per chase: a ladder past `conclude_on` with ⛔ end ⇒
  `concluded_undelivered`, `concluded_on` = that date; a failed hash at conclusion ⇒ concluded on the recorded number + the alarm. Then,
  through the REAL readers: EVERY `accepted` `undelivered` `family_sms` row of that person/number in the epoch — the origin, every later one,
  AND an earlier one covered by a stopped ladder (the mark-switch round trip — every accepted row of the epoch reported `undelivered` in
  the fixture, else a silent row legitimately counts: D22 then refuses a silence closure) — reads
  `rejected_unreachable` (`deadOn = concluded_on`); under A→B→A with a concluded ladder in each A epoch, every row is returned ONCE
  (`remindersAccepted` unchanged by the mapping — a no-duplication leg); an `accepted` row with ⛔ report still `accepted`; a concluded row and a send-time refusal on the SAME date ⇒
  the earlier row by `compareReminderRowsByTime` gives `deadKind` (the tie-break); a
  RUNNING or ENDED ladder's rows read UNCHANGED in an epoch with ⛔ concluded ladder (I4 — one leg each); `foundDeadOn = concluded_on`, `deadKind 'not_delivered'`; a concluded
  origin sent BEFORE a send-time refusal ⇒ `foundDeadOn` = the refusal's date (the MIN — LD7); letter-eligible (`assertCorrectionLetterRecordable`
  and the certificate letter precondition accept); still so after a later reminder is `delivered` (LD17 (a) — or as decided); the LAST evidential row concluded ⇒
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
  typecheck leg); the admin blocker copy — asserted by its TEXT (the map is ⛔ exhaustive; a missing key renders `''`); the api `not_reached`
  message names a call; a running CERTIFICATE ladder ⇒ ⛔ refusal (PQ2 (b) reading — or as ruled); `closure_due` /
  `closure_escalation` unchanged.
- **AC6 — The escalation (LD9, LD11).** On conclusion: ONE `ladder_escalation` row per ladder (the partial UNIQUE refuses a second), on the
  ladder's run even if ENDED; correction ⇒ in a `staff_push` that day when none had gone, or — when that day's push had ALREADY claimed and
  listed its items — in the NEXT push for that recipient, which lists the un-pushed `ladder_escalation` dated before it (both pinned, the
  second through the REAL push child; the day UNIQUE kept); on an ENDED run whose next day has ⛔ other staff row, the ladder
  sweep enqueues the push and it lists the escalation ONCE; certificate ⇒ recorded only, `recorded` or `no_target` (no live shepherd — the
  `contact_ladder.escalation_unassigned` alarm), and written while the run is PAUSED too; the ask per LD9's cap-aware table (one leg per row: call-or-letter, call only at the letter cap, letter only for a nominee
  while nominee calls are uncleared (LD11), neither); the found-dead letter track then runs from `concluded_on` (+7 / +12 / +13) inside its existing window, and ⛔
  outside it (a day-84 ladder concluded on day 92 gets the `ladder_escalation` only); a reached call stops `letter_chase` / `escalation` /
  `letter_escalation` for a CONCLUDED person, and ⛔ for a send-time dead person (both pinned); ⛔ the scheduled
  `family_sms`; `escalated` on the correction queue ⛔ lit by `ladder_escalation`.
- **AC7 — The call record (LD10, LD11).** Each `POST …/calls` (both routes) with a valid key ⇒ one row, `201`, the DTO; the SAME
  `Idempotency-Key` replayed ⇒ the FIRST result, ONE row — whatever the replay's body (the keyed store compares ⛔ bodies); a replay while
  the first is in flight ⇒ `409 …idempotency_in_progress`; a failed write releases the key (a retry succeeds); ⛔ key ⇒ `400`; a missing
  display name ⇒ `AdminDisplayNameMissingError` (⛔ fallback); `outcome 'reached'` with `answered_by 'nobody'` / `'someone_else'` ⇒ `400` (and the CHECK refuses a direct INSERT); a `called_on` in the
  future or before filing ⇒ `400`; a person ⛔ on the chase's recipient set ⇒ refused; agreement not live / ⛔ contact record ⇒ refused; a nominee
  while the LD11 gate is uncleared ⇒ `nominee_calls_not_cleared` (route AND number reveal), allowed once it is cleared (the SAME
  variable read by the jobs ask — a leg per app: the api through `loadConfig(env)`, jobs through the sweep's deps — each flipping it and
  seeing the route / the ask change); a caller ⛔ holding the
  key, or outside the district ⇒ `403`; `GET …/calls/number` needs the fresh step-up `contact_call_number`, returns the CURRENT number (a leg
  after a 6.20 change), `no-store`, ONE audit line per reveal; every audit line holds ⛔ name / number (a recorder); the human-actor gate's
  `expectedMethods` updated (a sorted multiset — `check.ts:403-408`) — correction-chase `['post','post','post','get','get']` (`:214`) ⇒
  `['post','post','post','post','get','get','get']`, certificate `['get','post','post','get','get']` (`:255`) + one `post` + one `get` — and a
  gate-bites leg (a renamed path ⇒ the gate goes RED); a call ending ladders of both chases takes both locks in order (a concurrency leg). The
  policy-regression spec pins `SELECT, INSERT` only and the tenant policies.
- **AC8 — Records are append-only and scoped (LD2, LD10).** `claim_contact_ladders`: the grants (⛔ UPDATE of an identity column — a `42501`
  leg; ⛔ DELETE), the tenant policies (a row invisible under another Pariwar), the state ↔ `ended_at` / `concluded_on` CHECKs; both send
  tables' purpose CHECKs accept `ladder_sms` / `ladder_escalation` and their TS tuples AND Drizzle `check()` copies match (the purpose
  LOCKSTEP legs — correction `claim-correction-closure-policy-regression.spec.ts:516-524`, certificate
  `claim-certificate-reminder-policy-regression.spec.ts:388`); the certificate purpose↔outcome CHECK allows `ladder_sms` the family outcomes
  and `ladder_escalation` `recorded` / `no_target`; the new
  partial UNIQUEs; `delivered_at` NULL on every row.
- **AC9 — What staff see (LD12).** Both DTOs carry `follow_up`, `unreachable_reason`, `ask`, `calls` (+ `reported_undelivered` on correction),
  each in the `.strict()` response schema; the status enums unchanged; `unreachable_reason` is `not_delivered` for a concluded person even when
  a later accepted row makes `sms_state` `reminded`; a certificate claim whose run has ENDED is still LISTED while a ladder runs or a
  concluded ladder's ask is unanswered (a day-180 origin; a "call"-only ask after day 180); the certificate lockstep test gains the new
  enums; flipping `nomineeCallsCleared` changes a nominee's DTO `ask` (`letter` ⇒ `call_or_letter`); the admin panels render "follow-up running — next on", "texts reported not delivered — <the ask>", the call form
  (with the step-up number reveal) and the list; refusal texts in `errors.ts`; the microcopy gate green over every new admin string (it scans
  comments too — and its `report` term bans the bare word in both modules, T18); contracts vitest green (fixtures updated —
  `apps/admin/tests/{correction-chase-forms,correction-queue,certificate-reminders}.test.tsx`,
  `packages/domain/tests/integration/claim/correction-chase-shape.spec.ts`).
- **AC10 — 6.37b's reports reach the ladder (F4).** The correlator's `cr` AND `ce` purpose sets accept `ladder_sms` (a `cr` and a `ce`
  `ladder_sms` report ⇒ `matched:*` + an `sms_send_deliveries` row — live, one leg each, RED before Task 5); `ladder_escalation` (⛔ CRQID) ⇒
  `unmatched:not_sms` on both kinds; the `cr` AND `ce` silence queries count an accepted `ladder_sms` with ⛔ report; the 6.37b suites green
  with ONLY those legs added (the certificate staff-row leg *"a `ce` row is an SMS only as `family_sms`"* re-worded to the widened set).
- **AC11 — Alarms (LD13).** The daily ladder line counts by state and carries ⛔ id; three ladders started in one Pariwar on one IST day ⇒ ONE
  `contact_ladder.burst:3`, two ⇒ ⛔; `…rls_bound_role`, `…hash_unavailable`, `…scheduled_not_sent`, `…escalation_unassigned` one leg each
  (claim ids only — ⛔ number, ⛔ name); the `-269` §4 alarm unchanged.
- **AC12 — Nothing else moves (I7, I8).** ⛔ `packages/i18n/locales/**` diff; ⛔ DLT template / registry text / sheet edit; ⛔ change to
  `packages/channels/**` or any WhatsApp file; `CORRECTION_REMINDER_DAYS` / the certificate schedule unchanged; the suspicion / peer-mesh /
  closure-notice paths unchanged (⛔ edit of `claim-peer-mesh-requests.ts`); `dlt-typed-variables` gate green (new files spell ⛔ the
  template-id prefix, `DLT_VAR` or the `{#var#}` literal; the env var name holds ⛔ `sms.dlt.template_id.`); `channels-determinism` green.
- **AC13 — The proof.** `pnpm ci:local` green with `DATABASE_URL` at :5433 EXPLICITLY (each red explained and re-run alone —
  [[project_known_livedb_test_failures]]); a global-fetch RECORDER at ZERO calls across the new suites (I9); every new table has its
  `…-policy-regression.spec.ts` and its `policies/*-rls.ts`; the access-wrapper and human-actor route-gate invariants green; the new modules
  ENROLLED in the no-decision fences (`apps/jobs/tests/claim-certificate-reminder-no-decision.test.ts` `CERTIFICATE_MODULES`,
  `claim-correction-closure-no-decision.test.ts` `SWEEP_MODULES` — they read named files only: `contact-ladder.ts`,
  `contact-ladder-record.ts`, `contact-call.ts`, `claim-contact-ladder.ts`).
- **AC14 — Records and close (Task 10).** Every deferred-work disposition Task 10 lists is written with its precise status word (**Closed by** /
  **narrowed** / **⛔ addressed** / **trigger ⛔ fired** / **trigger FIRED, partly addressed** / **addressed** only when sent —
  [[feedback_closure_language_precision]], ⛔ collapsed), each naming its instrument;
  the NEW items recorded; the Change Log and File List complete; the sprint row → `review` and the ledger prepended safely.

## Tasks / Subtasks

- [x] **Task 0 — governance FIRST (AC0). ⛔ No code.**
  - [x] 0.1 `git fetch origin`; 6.37b is ALREADY on this branch (rebased onto `main` @ `ed862339` at the pin); `git log c19e6534..origin/main`
        — if `main` moved, rebase again (BigDev's call; local branch); `git diff --name-only c19e6534..HEAD -- apps packages scripts
        docs/launch-gate-inventory docs/adr .decision-log.md _bmad-output/implementation-artifacts/deferred-work.md` and re-read any cited
        file that moved — re-locate by FUNCTION. Re-check the 6-31 worktree / branch for its claims (migration, decision id, roster row, the
        `epics.md` slot) — F18. 6.37b's recorded proof: `ci:local` 35/36 on :5433 + `@twt/admin` re-run alone 1229/1229 (`ac123e19`).
  - [x] 0.2 Put LD1–LD17 to BigDev, each with its recommendation and cost (incl. LD4's, LD5's no-restart, LD9's and LD17's §0 flags, LD10's
        key, LD11's MECHANISM, LD14 (d), LD15's token, LD16's counsel question); then PQ1–PQ3 (+ LD17 if judged the Panel's) — BigDev's §0
        check FIRST (*"STRIP THE CITATIONS AND READ WHAT IS LEFT"*): route, or record as the author's in the 6.37c entry. Record every answer
        verbatim (Debug Log).
  - [x] 0.3 Write the 6.37c entry (`.decision-log.md`, prepended; the `-353` / `-354` shape; the next free id re-grepped on EVERY branch and
        worktree right before — F18) with LD14 (a)'s supersession list. ⛔ Edits any entry ([[feedback_supersede_never_reinterpret]]). Stage in
        scratchpad; try the insert ([[project_decision_log_writes_user_inserted]]). Commit ALONE; write its SHA after, ⛔ before. Then, if
        routed, WRITE the PQ note (⛔ sent).
  - [x] 0.4 The records commit (LD14 (b)) — every item listed there, incl. ADR-0042's dated note (LD15), the consent sheet §1–§2 (or ADR-0042
        pulled from the pack), the Panel pack's disclosures (a pointer to `-354` decision 2's in the proposal; decision 4 (c)'s in full — alarms reach logs only),
        and the pre-rebase SHA annotations; ⛔ a word above a dated note rewritten, EXCEPT the unpresented §3.4 proposal's and Panel pack's
        phrases F19 lists (corrected in place, each with a revision line); both ledgers ([[project_sprint_status_safe_prepend]] — guard the
        size, verify the YAML parses).
  - [x] 0.5 The counsel question (LD16 (a) — `-354` decision 5): the basis for the texts and letters nominees receive TODAY, once the
        claimant's new agreement no longer names them — written, handed to BigDev for counsel (⛔ "asked" until it is sent), named in the
        Row 18 dated note; nothing a nominee receives changes until counsel answers.

- [x] **Task 1 — the migration (LD2, LD9, LD10; AC8).** `packages/domain/migrations/0169_claim-contact-ladder.sql` (or the next free — F18;
      hand-authored, journal `when` + 1 ms — `1794195600013` after 0168's `…012` — T10): `claim_contact_ladders` (LD2's columns, CHECKs, the
      running partial UNIQUE, the UNIQUE `(chase, origin_row_id)`, the `(state, conclude_on)` index),
      `claim_contact_calls` (LD10), the correction purpose CHECK replaced (+ `ladder_sms`, `ladder_escalation`), the certificate purpose CHECK
      (0138) and purpose↔outcome CHECK (0141) replaced (`ladder_escalation` `('recorded','no_target')`), the two new partial UNIQUEs
      `(claim_case_id, subject_key) WHERE purpose IN ('ladder_sms','ladder_escalation')`; grants (G-a) + tenant per-command policies; a comment
      naming roster Row 26. Drizzle schema files (+ index exports) incl. the `check()` copies; the RLS declarations
      `packages/domain/src/policies/claim-contact-ladder-rls.ts` / `claim-contact-call-rls.ts` (+ `policies/index.ts`); the purpose tuples;
      policy-regression specs for both new tables; the two purpose LOCKSTEP legs stay green by moving the tuple with the CHECK (correction
      `claim-correction-closure-policy-regression.spec.ts:516-524`, certificate `claim-certificate-reminder-policy-regression.spec.ts:388`).
      ⛔ Touch an existing migration; ⛔ `delivered_at` (LD14 (d)).
- [x] **Task 2 — the readers and the mapping (LD6, LD7, LD8; AC4, AC5).** `readReturnFamilyRows` and `readClaimCertificateFamilyRows`: select
      `reminder_id` and the row's `sms_send_deliveries` state (`cr` / `ce`, one row per send); read the person's concluded ladders separately;
      apply the mapping in TS inside the reader (I3, I4 — the ONE copy per chase; epochs by `isEvidentialReminderRow` +
      `compareReminderRowsByTime`; hashes by `sameNumberHash`; ⛔ a row-multiplying JOIN) and emit the effective outcome + `deadOn` +
      `concluded`. If `readSmsSendDeliveries` is called at all (⛔ needed — the JOIN suffices), bound / batch its id list and validate uuids at
      the edge (the deferred item's trigger — T23). `correction-chase.ts`: `deadOn?`, the `deadKind` union, the MIN computation + its
      tie-break (LD7). `correction-chase-read.ts`: `correctionPersonStatus`'s `'not_delivered'` case. `correction-closure.ts`:
      `reachedByLadderSms` (a new reader `readReturnLadderSmsRows`, return-scoped), `reachedByCall` (a new reader `readReturnContactCalls`,
      return-scoped), `ladder_running` in `assertClosureGround` + F7's whole lockstep list (incl. `blockerDto`, the api `not_reached` message
      and `apps/admin/src/modules/correction-closure/i18n-en.ts` — ⛔ `errors.ts`). Legs per AC4 / AC5 (live, real readers).
- [x] **Task 3 — the extracted stop predicates (I6, LD5; AC2).** Factor `correctionFamilyStopReason(tx, …)` out of `beginCorrectionFamilySend`
      (taking the run's END REASON — `day_90` is ⛔ a stop for a ladder, every other end reason is; + the NEW `closure_closed`, read WITHOUT
      importing `correction-closure.ts` — LD5) — `beginCorrectionFamilySend` calls it and keeps its own `day < 90` / `not_due`. Certificate:
      extract `certificateRunReceived(run, facts)` and `certificateRunPauseReason(run, facts)` from `planCertificateRun` (which calls them —
      its order and verdicts unchanged), and compose `certificateLadderStopReason(tx, …)` over `readCertificateRun` (the ORIGIN run, open or
      ended) in LD5's order, incl. `cannotRemind`, `not_a_recipient` and `numberLetterDelivered`; `beginCertificateFamilySend` keeps
      `planCertificateRun` and its slot-label `taken` check (T22). Export `NEVER_REENTERS`. Existing suites green UNCHANGED (a refactor leg:
      every original stop still refuses). The claim / finalise accessors are ALREADY keyed on `purpose` + `subjectKey` (I2) — the new paths
      are only the hard-coded `family_sms` sites: `beginCorrectionFamilySend`'s key (`correction-reminder-record.ts:409-417`), the stale-child
      read in `runCorrectionFamilySmsChild` (`claim-correction-reminders.ts:314-322`) and `beginCertificateFamilySend` /
      `recordCertificateHashFailure` (`certificate-reminder-record.ts:385-386`, `:500-501`) — the ladder child gets its own begin / stale read,
      ⛔ a changed default.
- [x] **Task 4 — the ladder engine (LD3–LD5, LD9; AC1–AC3, AC6).**
  - [x] 4.1 `packages/domain/src/claim/contact-ladder.ts` (PURE: `planLadderStart`, `ladderEndReason` (AC3's table), `ladderStepGate` (the
        horizon / pause / one-a-day rules), `nextLadderStepDate` (LD3's outcome table), the cap-aware `ladderAsk`; IST dates through
        `cycleCalendar`'s primitives — ⛔ re-derive the offset) + `contact-ladder-record.ts` (accessors: start with `ON CONFLICT DO NOTHING` under
        the chase lock, CAS state moves `WHERE state = 'running'`, step row links, the `ladder_escalation` writer on an ended run).
  - [x] 4.2 `apps/jobs/src/scheduler/claim-contact-ladder.ts`: the 10:00 sweep (`'0 10 * * *'` IST; the service pool — FIRST
        `smsDelivery.canReadAcrossPariwars` (T24: else alarm `contact_ladder.rls_bound_role` and refuse); T12: filter by `pariwar_id`
        explicitly; a batched candidate claim with a `LIMIT` uses a `MATERIALIZED` CTE — [[project_in_subquery_limit_skip_locked_overclaim]])
        + a child queue per ladder SMS (the send through `sendClaimCorrectionSms` with `message` `reminder` / `certificate_reminder`, `rowId` =
        the `ladder_sms` row; the chase child's stale-day guard; hash only at start / before send / at conclusion — F6; a failed hash per LD5);
        queue constants in `QUEUE_NAMES`; registered in `boot.ts` (⚠ 6.31 also edits it — merge, ⛔ overwrite); LD9 (iii): each run, for every ladder with `escalated_on`
        set whose `ladder_escalation` is un-pushed (keyed as in LD9 (ii)) on an ENDED run, enqueue a push to that row's own `recipient_key`
        (⛔ the live District Admin; ⛔ `staff:unassigned`) when ⛔ `staff_push` exists for it today — for an OPEN run the chase sweep's
        `todays` query carries it (Task 4.3), so an early ladder push never claims the day before the chase writes its own rows; alarms through an `onAlarm?` dep (default `console.warn`, unwired — logs only until Row 32 (h)).
  - [x] 4.3 The reached-call stop on the staff asks (LD9): `planRun` (`claim-correction-reminders.ts` — the letter track) and
        `planCertificateStaffChase` (`certificate-reminder.ts:875-925`) take a per-person `reachedCallOn` (epoch-scoped, like
        `letterDelivered`), consulted ONLY for `deadKind 'not_delivered'`. The push (LD9): `ladder_escalation` joins `STAFF_PUSH_ITEM_PURPOSES`
        (`:495-501`) and the `todays` enqueue list (`:1366-1369`); the push child's item query (`:592-597`) also takes un-pushed
        `ladder_escalation` rows dated ≤ `p.sentOn` (created after that recipient's previous `staff_push` on the claim); `correctionStaffPushText`
        gains the ask's words; for an OPEN run the `todays` query (`:1365-1369`) ALSO selects recipients holding an un-pushed
        `ladder_escalation` (LD9 (iii)). (A retry of one push job re-claims the same row and may list an escalation written in between on
        two days — harmless, noted.)
- [x] **Task 5 — 6.37b's purpose filters, BOTH chases (AC10).** `sms-delivery-correlator.ts` `CORRECTION_SMS_PURPOSES` AND
      `CERTIFICATE_SMS_PURPOSES` (+ `ladder_sms`; ⛔ `ladder_escalation`); `reports.ts` `countSilentSmsSends`' `cr` AND `ce` filters (`:327`,
      `:330`) + its doc-block; the certificate staff-row unit leg (`sms-delivery-correlator.test.ts:130`) re-worded to the widened set; the
      correlator comment *"the Panel-ruled use is row 6-37c"* (`:13`) updated to name the reader.
- [x] **Task 6 — the call record (LD10, LD11; AC7).** `packages/domain/src/claim/contact-call.ts` (assert-allowed — D30, recipient, LD11 —
      under both locks in order; record; list; refusal union) + index export; contracts `RecordContactCallRequest` / `ContactCallDto` (hand
      re-declared enums); api routes + handlers in the two existing route files on F17's path grammar (the keyed idempotency store in the
      house shape — LD10, T17; the step-up context `contact_call_number` in api AND admin; the audit event types with the house prefixes;
      `AdminDisplayNameMissingError`); RBAC per LD10 (reuse ⇒ ⛔ catalog change); the LD11 gate by the mechanism BigDev picks (⭐ ONE env
      var read by api AND jobs, passed into the domain as `nomineeCallsCleared` — ⛔ a read under `packages/domain/src/claim`); `scripts/claim-adjudication-human-actor-invariant/check.ts` `expectedMethods` (both entries) + the
      gate-bites leg.
- [x] **Task 7 — staff views (LD12; AC9).** Domain read models (`correction-chase-read.ts`, `certificate-reminder-read.ts` — incl. its
      listing predicate) + DTO mappers (`claims.nominee-name-check.handlers.ts:804-834`, `claims.certificate-reminder.handlers.ts:127-128`) +
      contracts (`.strict()` response schemas; the certificate lockstep legs); admin `CorrectionChasePanel.tsx`, `CertificateRemindersList.tsx`,
      a `ContactCallForm.tsx` (one component imported by both modules is fine — [[feedback_no_premature_package]] is about packages),
      `api/{client,hooks}.ts`, `errors.ts`, `i18n-en.ts` (both modules — ⛔ the bare word "report", T18). The DTO handlers
      (`claims.nominee-name-check.handlers.ts`, `claims.certificate-reminder.handlers.ts`) pass the api config's `nomineeCallsCleared` into
      the read models' `ladderAsk` — ⛔ a read in `correction-chase-read.ts` / `certificate-reminder-read.ts`. Tests: the admin suites +
      contracts vitest + the fixtures AC9 names.
- [x] **Task 8 — alarms (LD13; AC11)** in the ladder sweep; the daily line.
- [x] **Task 9 — gates and the untouched (AC12, AC13).** I2's snapshot leg; the `git diff`s of AC4; ⛔ diff under `packages/i18n/locales`,
      `packages/channels`, any `whatsapp*` file, `claim-peer-mesh-requests.ts`; `pnpm dlt-typed-variables:test && pnpm dlt-typed-variables:check`
      (`git add` new files first); `pnpm --filter @twt/channels test:determinism`; the microcopy gate; the human-actor gate; the no-decision
      fences' enrolment; the fetch recorder; `pnpm ci:local` at :5433.
- [x] **Task 10 — records and close (AC14).** ⚠ 2026-10-18: the `-354` carrier's (b) is **Closed by** `-360` and the ADR-0042
      restatement item by `-358` (deferred-work) — Task 10 only CHECKS those two, ⛔ disposes of them again. The deferred-work dispositions ([[feedback_closure_language_precision]] — ⛔ collapsed): *"⛔ DLT send
      consumes a delivery report …"* — **Closed by** this story for a REPORTED failure on the correction AND certificate chases, **narrowed** to
      silence (a text with ⛔ report still counts — `-351` 1 A; DR12 alarms it), **⛔ addressed** for peer mesh / suspicion (recorded, ⛔ acted on);
      *"⛔ Staff view labels a send 'reported undelivered'"* — **Closed by** this story for the correction and certificate views, the peer-mesh
      part stays; *"`delivered_at` … an unused seam"* — **Resolved via explicit deferral** by the 6.37c entry (LD14 (d) — done at Task 0.4); *"⛔ No staff prompt to CALL a dead-phone
      family whose second certificate is rejected after their one letter"* — the seam exists (the call record) ⇒ **trigger FIRED, partly
      addressed** (a call can be recorded and counts; ⛔ prompt for that family unless a ladder concludes for them); both *"At-least-once
      SMS"* items — a dated annotation: a ladder adds up to two SMS per undelivered reminder under the same residual; *"`readSmsSendDeliveries`
      takes an unbounded id list …"* — **Closed by** this story if it calls it (bounded + validated), else **trigger ⛔ fired** (6.37c reads
      the state by JOIN); *"Reports in one POST share `received_at`"* — **trigger ⛔ fired** (6.37c reads state, ⛔ order — F2); the `-354`
      carrier *"For row 6-37c"* — (a) Row 32 (h): **⛔ addressed** (a go-live condition, carried — LD13), (b) the Panel told: **addressed**
      only once BigDev SENDS the pack ([[feedback_shown_to_panel_means_sent]]), (c) the nominee gates: the CALL half **Closed by** this story (the gate as built; LD11 as recorded in the 6.37c entry), the WhatsApp half (G1 + G2) carried to row 6-37d (LD1 (a)) — **⛔
      addressed** here (⚠ 2026-10-18: that half is **superseded by `-356`** — ⛔ case, ⛔ carried), (d) the
      counsel question: **addressed** when sent (LD16), **closed** only when counsel answers; the ADR-0042 restatement — **Closed by** the
      ADR-0042 dated note + the consent-sheet revision (LD15, Task 0.4). ⚠ *Dated 2026-10-18 (code review round 2):* ONE closer — deferred-work records the item ✅ **Closed by**
      `-358` (the pack went out with the revised sheet; ADR-0042 ratified with the restated bound). The ADR's dated note and the sheet's
      revision are the trigger ACTIONS (`-355` decision 15), ⛔ closers (the ADR's own line: its ADR half is *addressed* by the note). NEW items: the WhatsApp step (→ row 6-37d, if LD1 (a)); phase 2
      call tracking (`-351` Consequence 4 — ⛔ row); a scheduled catch-up `late` send does ⛔ check ladder rows (a ladder SMS and a catch-up text
      can meet on one day — T22's residual); a transient → `error` ladder SMS that was delivered can never end its ladder (F3); any PQ not yet
      ruled. The Change Log; the File List; the sprint row → `review`; the ledger. Landing on `main` (fast-forward) is BigDev's call
      ([[feedback_land_prs_by_fast_forward]]).

### Review Findings

Whole-branch review (`main..HEAD` @ `99644db0`, 104 files / 11565+/244-), 4 chunks (ladder-primitive / chase-integration+jobs /
contracts-api-admin / governance-records) × 3 layers (Blind Hunter, Edge Case Hunter, Acceptance Auditor) — 12 parallel reviewers, one
Blind Hunter retried after a stall. 84 raw findings; several verified directly against the live worktree before triage (confirmed some
as real, cleared others as cross-chunk false positives). 11 decision-needed (all resolved below), 43 patch, 16 defer, 11 dismissed as
noise, resolved by cross-check against a sibling chunk, or decided to stand as already made.
⚠ *Dated 2026-10-18 (code review round 2):* the counts here disagree with Change Log v1.7, ledger `2026-10-18j` and `b2aa00ff`'s message ("18 defer, 9
dismissed"). The lists below hold **18** defer items (D7–D9 included) and **11** dismissed (D4 and D6 included) — "16 defer" matches
nothing, and "9 dismissed" leaves out the two dismissals that came from decisions. The fix-diff size "32 files, 644+/116-" (v1.7)
cannot be re-derived from any commit (the re-reviewed diff was never committed alone); `b2aa00ff` as landed is 35 files, 753+/119-
(601+/103- in `apps/` / `packages/` / `scripts/`).

**[Review][Decision] — all 11 resolved by the user (2026-10-18)**
- [x] D1 Retries skip `ladderStepGate` in `beginCorrectionLadderSend`/`beginCertificateLadderSend` — **→ Patch** (run the gate on retry too).
- [x] D2 `correctionStaffPushText` names only the first co-bundled `ladder_escalation` item — **→ Patch** (describe multiple items generically).
- [x] D3 `LADDER_ASK_WORDS` falls back to the most permissive wording on an unrecognized detail — **→ Patch** (fail loud instead).
- [x] D4 Role-inference fallback feeding the G1 nominee-call gate — **→ Dismiss**, safe by construction (personKey grammar, F6, reliably encodes role; confirmed via grep).
- [x] D5 Two independently-read `CLAIM_NOMINEE_CALLS_CLEARED` env vars (api + jobs) — **→ Patch** (extract to one shared module; no hard boot-assertion).
- [x] D6 LD10(a)'s permission-key reuse for call-recording, no catalog bump — **→ Dismiss**, kept as decided (already a made, disclosed design choice).
- [x] D7 Cross-branch migration/decision/roster-row numbering race (silent drizzle skip on collision) — **→ Defer** (process convention stands; this story's own numbers are confirmed clear; general hardening is cross-story, out of scope here).
- [x] D8 Roster Row 34's undefined "escalate" for a capped nominee — **→ Defer**, routed to BigDev: needs a new Decision defining the escalation path (who/what/claim-disposition) — a governance call, not a code fix.
- [x] D9 `recordContactCall`'s unconditional dual-lock-taking for every call — **→ Defer** (narrowing safely needs confirming no invariant relies on the unconditional locking; follow-up perf item).
- [x] D10 Ladder/call attribution not scoped to the claim's live `returnDecisionId` — **→ Patch** (scope defensively even if hard to trigger today).
- [x] D11 `ContactCallForm` stays offered after `follow_up` already ended — **→ Dismiss**, kept as-is (staff may legitimately log a late/historical call); a one-line clarifying comment added.

**[Review][Patch] — all 43 resolved (2026-10-18), applied by 4 parallel forks over disjoint file sets + D5 handled centrally**
- [x] [Review][Patch] `epochsOf` splits epochs on raw string inequality of `recipientNumberHash` instead of the project's own `sameNumberHash()` used everywhere else in the module — **fixed** [packages/domain/src/claim/contact-ladder.ts:80-89]
- [x] [Review][Patch] LD9's escalation writers (`writeCorrectionLadderEscalation`/`writeCertificateLadderEscalation`) have zero direct test coverage — **fixed**, integration test added calling the real writers [packages/domain/src/claim/contact-ladder-record.ts]
- [x] [Review][Patch] No CHECK ties `sms2_row_id`/`sms3_row_id` nullability to `sms2_state`/`sms3_state = 'sent'` — **fixed**, new `sms2_row_id_check`/`sms3_row_id_check` CHECKs added to migration 0169 (confirmed unapplied to any DB beforehand) + the Drizzle schema [packages/domain/migrations/0169_claim-contact-ladder.sql] — ⚠ *Dated 2026-10-18 (code review round 2):* "confirmed unapplied to any DB beforehand" is FALSE: Debug Log (b)1
  records 0169 applied to `:5433`, and `:5433`'s `drizzle.__drizzle_migrations` row for 0169 holds hash `b88e8cb8…` — the file as of
  `b1d39f0c` — while both CHECKs exist there, so they were added by hand outside any migration (`:5432` never applied 0169). Round 2
  restores 0169 as applied and carries the CHECKs in an idempotent 0170 (round-2 P9) ([[project_live_db_test_gotchas]]).
- [x] [Review][Patch] `assertContactCallFacts`'s inclusive boundaries are untested — **fixed**, boundary tests added [packages/domain/src/claim/contact-call.ts:128-143]
- [x] [Review][Patch] The regex-grammar CHECKs are untested at their length/charset boundaries — **fixed**, boundary regression tests added [packages/domain/migrations/0169_claim-contact-ladder.sql]
- [x] [Review][Patch] `beginCertificateLadderSend`'s defensive "unreachable" assert missing from `beginCorrectionLadderSend` — **fixed**, matching assert added for symmetry [packages/domain/src/claim/contact-ladder-record.ts]
- [x] [Review][Patch] `readChasePerson` rethrows `recipients.cannotRemind` with no LOCKSTEP test — **investigated, no change needed**: TypeScript's structural assignability against `ContactCallRefusal` already fails the build (not silently) if either reason union ever drifts; confirmed both `CorrectionCannotRemindReason`/`CertificateCannotRemindReason` are already subsets — a runtime lockstep test would be redundant with a compile-time guarantee [packages/domain/src/claim/contact-call.ts]
- [x] [Review][Patch] The "sweep ran late" scenario is never exercised by a test — **fixed**, test added [packages/domain/tests]
- [x] [Review][Patch] `dueLadderStep` ignores the ladder's overall `state` — **fixed**, `state === 'running'` guard added [packages/domain/src/claim/contact-ladder.ts:312-326]
- [x] [Review][Patch] `concludeContactLadder`'s CAS doesn't require `sms3_state` resolved — **fixed**, WHERE clause tightened [packages/domain/src/claim/contact-ladder-record.ts:135-158]
- [x] [Review][Patch] A timestamp tie in `epochsOf`'s ordering is unguarded — **fixed**, `reminderId` tie-break added [packages/domain/src/claim/contact-ladder.ts:80-89] — ⚠ *Dated 2026-10-18 (code review round 2):* the stated risk does not exist: both send tables default
  `created_at` to `clock_timestamp()` (`schema/claim_correction_chase.ts`, `schema/claim_certificate_reminder.ts`), so two rows of one
  transaction do ⛔ share a `now()`; the tie-break is harmless, ⛔ needed.
- [x] [Review][Patch] The certificate chase's "already sent today" check lacks the current-hash fallback — **fixed** at both locations [packages/domain/src/claim/contact-ladder-record.ts:605-613; apps/jobs/src/scheduler/claim-contact-ladder.ts:737-744]
- [x] [Review][Patch] The daily ladder-sweep summary log omits three tallies — **fixed**, all three added to the log line [apps/jobs/src/scheduler/claim-contact-ladder.ts]
- [x] [Review][Patch] `isPlanTimeout` only unwraps one level of `.cause` — **fixed**, now walks the full chain (cycle-guarded) [apps/jobs/src/scheduler/claim-contact-ladder.ts:88-92]
- [x] [Review][Patch] The certificate-run PAUSE test fabricates state via raw SQL — **investigated, no change needed**: confirmed `planCertificateRun`'s pause check reads `claims.currentState` alone with no `events_log`/version dependency, so the shortcut sets exactly the field the code under test consults; a comment recording this verification was added instead of a riskier full-transition rewrite [packages/domain/tests/integration]
- [x] [Review][Patch] The due-step and stale-slot checks silently no-op with no alarm — **fixed**, `alarm(...)` added at both sites [apps/jobs/src/scheduler/claim-contact-ladder.ts:465-466, :868-869]
- [x] [Review][Patch] The call-record idempotency `storeKey` omits `claimCaseId`/`chase` — **fixed**, both added to the key [apps/api/src/modules/claims/claims.contact-call.handlers.ts:~100]
- [x] [Review][Patch] "reached needs an answer" enforced in the Zod schema, masking the domain's refusal code — **fixed**, `.refine()` removed from `RecordContactCallRequest` (kept to pure shape validation); the domain's `reached_needs_answer` now reaches the client. Lockstep test and the 400 assertion updated to the new code — **confirmed** by a full `ci:local` run against :5433 (`apps/api/tests/integration/claims/contact-call.spec.ts` 8/8 passing) [packages/contracts/src/claims/contact-call.ts; apps/api/src/modules/claims/claims.contact-call.handlers.ts:141]
- [x] [Review][Patch] `CONTACT_CALL_NUMBER_STEP_UP_CONTEXT` hand-duplicated with no lockstep guard — **investigated, no change needed**: the sibling precedent `CORRECTION_LETTER_ADDRESS_STEP_UP_CONTEXT` is duplicated the identical way with no lockstep test anywhere in the codebase — this is the established pattern for free-string step-up contexts (explicitly commented "a free string — ⛔ registry"), not an inconsistency specific to this story
- [x] [Review][Patch] `followUp.unreachableReason` i18n map is dead code — **fixed**, removed [apps/admin/src/modules/correction-chase/i18n-en.ts]
- [x] [Review][Patch] `notDeliveredLine` ignores its own `unreachableReason` parameter — **fixed**, now requires `unreachableReason === 'not_delivered'` [apps/admin/src/modules/correction-chase/ContactLadderLines.tsx:45-48]
- [x] [Review][Patch] No mutual exclusion between `ContactCallForm`'s three async flows — **fixed**, a shared `anyOperationInFlight()` check now gates all five action buttons [apps/admin/src/modules/correction-chase/ContactCallForm.tsx]
- [x] [Review][Patch] Neither new call route has a per-route rate limiter — **investigated, no change needed**: the sibling `.../correction/letters/address` reveal route (identical step-up pattern) also carries no rate limiter; adding one only here would be a new asymmetry, not a fix, under this codebase's existing (if imperfect) convention [apps/api/src/modules/claims/claims.contact-call.handlers.ts]
- [x] [Review][Patch] `toContactCallDto` has two valid import paths — **fixed**, dead re-export removed, both real callers already imported from the leaf
- [x] [Review][Patch] `ContactCallForm`'s `verifyAndReveal` doesn't check the epoch before `setState` — **fixed**, matching epoch check added [apps/admin/src/modules/correction-chase/ContactCallForm.tsx:185-208]
- [x] [Review][Patch] `idempotencyStore.recordResult()` failure releases the key for retry — **fixed**, `settled = true` now set before `recordResult()`, not after, so a post-commit failure never releases the key; **fix-diff review found a residual**: if `recordResult` itself throws, the key stays claimed-but-unresolved until its 24h TTL expires, then a retry can still reclaim and double-write — a property of the keyed-store's project-wide "COMMIT then recordResult" shape, not fixable in this one handler; **moved to Defer** below [apps/api/src/modules/claims/claims.contact-call.handlers.ts:138-154]
- [x] [Review][Patch] `Idempotency-Key` header has no length/charset bound — **fixed**, 200-char cap added; **fix-diff review caught** that the too-long case reused the missing-key error code (`contact_call.idempotency_key_required`) — split into its own `contact_call.idempotency_key_too_long` + a 200/201-char boundary test added [apps/api/src/modules/claims/claims.contact-call.handlers.ts:76-87]
- [x] [Review][Patch] `onSettled`'s `Promise.all([...])` has no `.catch` — **fixed**, switched to `Promise.allSettled`; **fix-diff review caught** that this silently discarded a rejection instead of just not propagating it — added a `console.error` on any rejected invalidation [apps/admin/src/api/hooks.ts:1119-1123]
- [x] [Review][Patch] The call-record form is offered even when `ask === 'none'` — **fixed, then re-fixed**: the first pass's `follow_up !== null || (ask !== null && ask !== 'none')` was a no-op (`ask` is only ever set once `follow_up.state === 'concluded'`, so the first clause was already true whenever the second mattered) — fix-diff review caught this; corrected to `(follow_up !== null && follow_up.state !== 'concluded') || (ask !== null && ask !== 'none')` at both locations [apps/admin/src/modules/correction-chase/CorrectionChasePanel.tsx:269-271; apps/admin/src/modules/certificate-reminders/CertificateRemindersList.tsx:408-410]
- [x] [Review][Patch] Decision `-356`'s scope quoted without attribution in 3 docs — **fixed** in the counsel-question file (attributed explicitly to BigDev, not the Panel); checked `sprint-change-proposal-2026-10-17-whatsapp-claim-contact.md` directly — it already carries the correct attribution ("BigDev's scope: in future only a nominee who has opted to receive it, or one who is also the claimant"), so no further edit was needed there [_bmad-output/planning-artifacts and docs/launch-gate-inventory]
- [x] [Review][Patch] `adr-index.md`'s arithmetic left stale — **investigated, no change needed**: on inspection the file's summary table (111/0/0/42/1/154) is already current and correct; its "drift... recorded and not corrected here" note is this project's own deliberate, already-disclosed convention (confirmed via git blame), not a bug. The actual stale arithmetic was in the consent sheet, fixed below. [docs/knowledge-transfer/adr-index.md] — ⚠ **Corrected 2026-10-18 (code review round 2, P15):** the consent sheet's arithmetic was ⛔ changed by round 1 (`git show b2aa00ff -- docs/knowledge-transfer/adr-ratification-consent-sheet-2026-10-17.md` touches only its `.decision-log.md` row) — "fixed below" was untrue; the sheet's presented 37→40 / 153 now carries a dated note instead.
- [x] [Review][Patch] ADR-0042's static-header exception has no "⭐ Trigger:" field — **fixed**, trigger line added [docs/adr/ADR-0042-msg91-delivery-report-ingress.md] — ⚠ **Reverted 2026-10-18 (code review round 2, P14):** the edit rewrote a ratified bullet after `-358` (*"No amendments, no conditions"*) and its premise was false — the ratified text already named the trigger (*"If MSG91 adds request signing, a successor ADR adds…"*); ADR-0042 is restored byte-for-byte to `4e7ddd84`.
- [x] [Review][Patch] `deferred-work.md`'s staff-email item self-contradicts — **fixed**, "SENT and answered" step inserted, mirroring the sibling item's phrasing [_bmad-output/implementation-artifacts/deferred-work.md]
- [x] [Review][Patch] `panel-pack-2026-10-17-6-37c.md`'s stale head-of-log reference — **fixed**, corrected to the true outcome per the file's own Status line [_bmad-output/planning-artifacts/panel-pack-2026-10-17-6-37c.md] — ⚠ **Reverted 2026-10-18 (code review round 2, P15):** an in-place edit of presented text; the presented line is restored and the facts sit in a dated post-presentation note.
- [x] [Review][Patch] `adr-ratification-consent-sheet-2026-10-17.md`'s stale decision-head id — **fixed**, corrected with a note that it was only the head when the sheet was prepared; ratification actually landed as `-358` [docs/knowledge-transfer/adr-ratification-consent-sheet-2026-10-17.md] — ⚠ **Reverted 2026-10-18 (code review round 2, P15):** an in-place edit of presented text; restored, with a dated note (ratification landed as `-358`).
- [x] [Review][Patch] `counsel-question` footer vs. roster Row 18 criteria mismatch — **fixed differently than proposed**: rather than retroactively expanding Row 18's (a)-(c) criteria to include something they never listed, the counsel-question file's footer was corrected to stop claiming Question 3 closes Row 18 — the more conservative resolution of the same contradiction [_bmad-output/planning-artifacts/counsel-question-2026-10-18-nominee-contact-basis.md]
- [x] [Review][Patch] The `-356` narrowing left FOUR spots stale — **fixed**, all four corrected (this story's rulings table, F19, LD1's definition, AC1's `whatsapp_step` value now conditional on role) + the routing note's banner fixed to "Sent and answered 2026-10-18" [this file, multiple locations; _bmad-output/planning-artifacts/trustee-panel-routing-note-2026-10-18-6-37c-ladder-edges.md]
- [x] [Review][Patch] (from D1) Retries bypass `ladderStepGate` entirely — **fixed**, the gate now runs on retry too in both `beginCorrectionLadderSend`/`beginCertificateLadderSend`; a stale retry the gate now rejects abandons the claim via `giveUp(\`ladder_stale_retry_${verdict}\`)` (encoding the gate's own rejection reason in `end_detail`, whose CHECK grammar `^[a-z_:]{1,64}$` allows the colon) (⚠ *Dated 2026-10-18 (code review round 2):* the reason lands in the claimed REMINDER row's `detail` via
  `skipCorrectionReminder` / its certificate twin — a column with ⛔ CHECK on either send table — ⛔ in the ladder's `end_detail`; nothing
  fails, but the grammar cited is ⛔ the one that applies) instead of a generic uninformative detail — corrected description: the fix does NOT call `ladderEndReason` (an earlier summary of this fix said it did; verified against the actual diff that it doesn't — the gate-verdict-encoding approach is the right fix for this specific "why was a stale retry abandoned" question, a different question than what `ladderEndReason` answers) [packages/domain/src/claim/contact-ladder-record.ts:451,644]
- [x] [Review][Patch] (from D2) `correctionStaffPushText` collapses multi-item pushes — **fixed**, generic "N items ... where the network said not delivered" phrasing added for >1 co-bundled item [apps/jobs/src/scheduler/claim-correction-reminders.ts:514-532]
- [x] [Review][Patch] (from D3) `LADDER_ASK_WORDS` permissive fallback — **fixed**, unrecognized detail now alarms and falls back to the conservative letter-only wording instead of the permissive one [apps/jobs/src/scheduler/claim-contact-ladder.ts, `LADDER_ASK_WORDS` lookup]
- [x] [Review][Patch] (from D5) `CLAIM_NOMINEE_CALLS_CLEARED` env-var drift — **fixed**, new shared `CLAIM_NOMINEE_CALLS_CLEARED_ENV_VAR`/`parseNomineeCallsClearedFlag` in `contact-ladder.ts`; both `apps/api/src/config.ts` and `apps/jobs/src/boot.ts` now read through it [apps/api/src/config.ts:429; apps/jobs/src/boot.ts:208]
- [x] [Review][Patch] (from D10) Ladder/call attribution not scoped to the live `returnDecisionId` — **fixed**, new `liveReturnIdFor()` re-derives the live return via `getLiveCorrectionReturn`; both `readClaimLadders` calls in `recordContactCall` now scope to it [packages/domain/src/claim/contact-call.ts:195-199; contact-ladder.ts:191-196] (⚠ *Dated 2026-10-18 (code review round 2):* line refs drifted — `liveReturnIdFor` is defined at `contact-call.ts:48` and
  used at `:215` and `:242` as of `b2aa00ff`; locate by name)
- [x] [Review][Patch] (from D11) Clarifying comment on `ContactCallForm`'s post-end availability — **fixed**, comment added in `CorrectionChasePanel.tsx`/`CertificateRemindersList.tsx`; no behavior change [apps/admin/src/modules/correction-chase/ContactCallForm.tsx]

**[Review][Defer]** (pre-existing, disclosed, or low-priority — not blocking this review)
- [x] [Review][Defer] (found by the fix-diff's own Edge Case Hunter pass) P26's fix leaves a residual: if `idempotencyStore.recordResult()` itself throws (not just a failure before commit), the key stays claimed-but-unresolved until its 24h TTL expires, then a retry can reclaim it and double-write the call row — a property of the keyed-store's project-wide "COMMIT then recordResult" shape ([[project_idempotent_write_handler_shape]]), not something fixable in this one handler without a keyed-store-wide change [apps/api/src/modules/claims/claims.contact-call.handlers.ts:138-154] — deferred, pre-existing architectural tradeoff, trigger: a `recordResult` failure is actually observed in production, or the keyed-store's shape is revisited project-wide
- [x] [Review][Defer] (found while applying P1) `evaluatePersonRunState`'s epoch-boundary loop uses raw `!==` on `recipientNumberHash` instead of `sameNumberHash()` — the same pattern P1 fixed in `contact-ladder.ts`'s `epochsOf`, but this loop is untouched by this diff (only the `dead`-finding logic a few lines below it was touched, for LD7) — pre-existing, out of this review's scope to patch unreviewed [packages/domain/src/claim/correction-chase.ts:756] — deferred, pre-existing, trigger: next story touching `evaluatePersonRunState`
- [x] [Review][Defer] Heavy ~150-line duplication between `beginCorrectionLadderSend`/`beginCertificateLadderSend` — a DRY/refactor concern, not a correctness bug [packages/domain/src/claim/contact-ladder-record.ts] — deferred, pre-existing design shape
- [x] [Review][Defer] `called_on` bounds are enforced only in `assertContactCallFacts`, not a DB CHECK — a cross-table CHECK against `claims.created_at` needs a trigger; heavier-weight hardening for later [packages/domain/src/claim/contact-call.ts:128-143] — deferred, pre-existing
- [x] [Review][Defer] The 14-day ladder scan window is uncoupled from the 72h delivery-report SLA — already disclosed in the spec's Policy-meaning section as an accepted narrowing of `-350` ruling 2 — deferred, pre-existing and disclosed
- [x] [Review][Defer] `assertClosureGround` throws `ladder_running` before computing `not_reached`, so staff discover blockers sequentially — the code's own comment frames this as intentional — deferred, UX nicety only
- [x] [Review][Defer] The ladder sweep borrows its retry/timeout tuning constants wholesale from `claim-correction-reminders.ts` with no ladder-specific override — reasonable to share initially — deferred, pre-existing
- [x] [Review][Defer] `CONTACT_LADDER_MAX_CLAIMS`'s bounded-scan early exit still issues one wasted page query on the next chase after the break — minor perf inefficiency — deferred, low priority
- [x] [Review][Defer] The correction-chase status badge and the calls list can show a contradictory pair ("unreachable" + "reached") for the same row — the code's own comment documents this as a known limitation — deferred, already disclosed
- [x] [Review][Defer] `ContactCallNumberResponse.number` has no E.164 shape constraint at the contract level — the value is already-decrypted/stored data, so the risk is corruption surfacing badly rather than bad input — deferred, hardening nicety
- [x] [Review][Defer] Six Trustee rulings in this diff (`-357`–`-362`) are all terse one-line relays through the same author with no independent minute or countersignature — an institutional pattern across many decisions, not specific to this diff — deferred, out of this review's scope
- [x] [Review][Defer] PQ3's ruling (`-360` Q3 A) never covered the SMS-2-due-the-same-morning-a-ladder-starts edge the dev build later hit — already disclosed as a residual in the spec's Policy-meaning section and deferred-work — deferred, already disclosed
- [x] [Review][Defer] The no-restart rule's permanent letter-eligibility off a single early failure is already an open item FLAGGED in the spec's own §0 section for BigDev's review — deferred, already tracked
- [x] [Review][Defer] ADR-0042's forgery-bound mitigation ("the burst alarm") reaching logs only until roster Row 32(h) closes is already disclosed and gated via that row as an explicit go-live condition of this story's ladder — deferred, already disclosed and gated
- [x] [Review][Defer] The counsel question gating nominee calls (`-354` decision 5) is still unsent while code depending on its answer has shipped — a governance/process gap, not a code patch; flagged for the user's awareness — deferred, process item
- [x] [Review][Defer] (from D7) The cross-branch migration/decision/roster-row numbering race (silent drizzle skip on a colliding journal `when`) — deferred, reasoned by the user: the "re-grep every branch" process convention stands and this story's own numbers are confirmed clear; a general hardening fix (e.g. a journal-integrity CI check) is a cross-story concern, out of scope here
- [x] [Review][Defer] (from D8) Roster Row 34's undefined "escalate" for a capped nominee — deferred, reasoned by the user: routed to BigDev, needs a new Decision defining the escalation path (who receives it, what happens to the claim) — a governance call, not a code fix
- [x] [Review][Defer] (from D9) `recordContactCall`'s unconditional dual-lock-taking for every call — deferred, reasoned by the user: narrowing the lock scope safely needs confirming no invariant relies on the unconditional locking first; treated as a follow-up perf item [packages/domain/src/claim/contact-call.ts]

**Dismissed as noise, resolved by cross-chunk verification, or decided to stand as already made (11):** a claimed-unused `CONTACT_LADDER_BURST_THRESHOLD` (confirmed consumed in `apps/jobs/src/scheduler/claim-contact-ladder.ts:260` — ⚠ *Dated 2026-10-18 (code review round 2):* `:268` as of `b2aa00ff`; locate by name); a claimed purpose↔outcome CHECK asymmetry between the two send tables (confirmed pre-existing per F9/F15, not introduced here); a claimed no-caller `readLadderOriginCreatedAt` (confirmed called 4× in the jobs sweep); a claimed missing migration for the schema edits (confirmed covered by migration 0169); a claimed UI gap on `unreachableReason` (confirmed consumed by `ContactLadderLines.notDeliveredLine`); the claimant/nominee `nomineeCallsCleared` trust assumption (confirmed correctly separated in the domain by the ladder-primitive chunk's Acceptance Auditor); mechanically-patched test-fixture formatting (this project doesn't enforce Prettier — [[project_prettier_not_enforced]]); ADR-0040's ratification-clause gap (already self-patched within this same diff by a second same-day routing note); one reviewer's own scope-boundary disclosure (not a finding); (from D4) the role-inference fallback feeding the G1 nominee-call gate, dismissed by the user as safe by construction per the personKey grammar (F6); (from D6) LD10(a)'s permission-key reuse for call-recording, dismissed by the user — kept as already decided.

### Review Findings — round 2 (2026-10-18)

Whole-branch review (`main...HEAD` @ `b2aa00ff`, 105 files / 12206+/251-), the same 4 chunks × 3 layers — 12 parallel read-only
reviewers, all completed. Raw findings verified against the worktree before triage (several HIGH claims from diff-only layers were
false: `knownCurrentHash`'s `null ?? undefined` IS `undefined`; a `satisfied` step's carrying row is "whatever its outcome" by LD4;
the old-return ladder is ended `stopped:return_superseded` by the sweep; the push child takes the same chase lock as the ladder
plan). The orchestrator's own read-only check of `:5433` found 0169's recorded hash `b88e8cb8…` (= `b1d39f0c`'s file) with the two
P3 CHECKs present ⇒ applied out-of-band. Panel-routing §0 applied: ⛔ question below is the Panel's — both decisions are BigDev's
(they narrow `-355`'s author-committed LD9 / LD12 text; the code already matches `-360` Q1–Q3 A, verified by three auditors).
2 decision-needed (both resolved by `2026-10-18-363` → P38 / P39), 39 patch (38 applied, P27 deferred as W15), 22 defer, 30 dismissed (+3 in the 2nd fix-diff pass).

**[Review][Decision]**
- [x] [Review][Decision] D1 — **RESOLVED (a) by `2026-10-18-363` decision 1 → Patch P38** — Which reached call answers the ask / stops the letter track — three rules disagree: `reachedCallSince` (the letter chase + escalation stop, both chases) counts any reached call RECORDED since the EPOCH began and returns its `called_on`; `pendingLadderAsk` (the staff view) counts only calls RECORDED after the conclusion; D22 / `ladderEndReason` / `planLadderStart` key on `called_on`. ⇒ (i) ladder L1 ended by a reached call on day 13, a day-21 reminder fails, L2 starts and concludes — the day-13 call silently stops L2's letter chase while the view still shows "call or letter"; (ii) a historical call logged late (D11 keeps the form open for it) with `called_on` before the origin closes the ask and stops the letter track. LD9's "scoped to the epoch like `letterDelivered`" produces (i) literally; `-351` 5 A ("asked to call or post", satisfied by either) is the ratified meaning. Options: **(a) ⭐ one rule everywhere — a reached call with `called_on ≥` the concluded ladder's `origin_sent_on`** (a call after the failure; anything earlier either ended the ladder or predates it); (b) `called_on ≥ concluded_on` only (post-conclusion calls); (c) keep LD9 as written, align only the view. [`packages/domain/src/claim/contact-ladder.ts:376-384,450-453`; `apps/jobs/src/scheduler/claim-correction-reminders.ts:1339-1345`; `apps/jobs/src/scheduler/claim-certificate-reminders.ts:463-469`] (blind B + edge A + edge B + auditor B; checklist family 11)
- [x] [Review][Decision] D2 — **RESOLVED (a) by `2026-10-18-363` decision 2 → Patch P39** — Three staff lines say more than the code knows (LD12 copy): the closure blocker "Follow-up texts are still being sent to someone" can only show at correction day ≥ 90, when every ladder step is `skipped:past_horizon`; "Follow-up texts running — next on <date>" fills in a date that can be a past-horizon / paused / satisfied step or the conclusion date (not a text); "…ended on X — none reached the family" when the code knows only "none was reported delivered" (PQ1 A counts a silent ladder SMS as reached). Options: **(a) ⭐ reword the three strings** ("A follow-up is still open for someone — it ends on <date>"; "Follow-up running — next step on <date>"; "…— none was reported delivered"); (b) keep LD12 copy; (c) keep the copy and make `next_step_on` gate-aware. [`apps/admin/src/modules/correction-closure/i18n-en.ts:18`; `apps/admin/src/modules/correction-chase/i18n-en.ts` `followUp.*`; `packages/domain/src/claim/contact-ladder.ts:431-432`] (auditor C)

**[Review][Patch]**
- [x] [Review][Patch] P1 (MED) `planLadderStart`'s coverage window ignores the number — a failed text to a NEW number sent before the old ladder ended `ended_number_changed` is "covered" forever and never starts a ladder (the `-350` gap); add `sameNumberHash(l.recipientNumberHash, r.recipientNumberHash)` to the window half + a pure leg on another number [packages/domain/src/claim/contact-ladder.ts:217-222]
- [x] [Review][Patch] P2 (MED) Enter in the OTP input submits the call `<form>` ⇒ `save()` runs, the code is never verified and the step-up is cleared; Enter must verify [apps/admin/src/modules/correction-chase/ContactCallForm.tsx:318-325]
- [x] [Review][Patch] P3 (MED) A `reached` save unmounts the form (the ask closes) before "Call recorded." is set — no confirmation, focus to `<body>`; the success line must outlive the refetch (the 6.19c lesson the letter form follows) [ContactCallForm.tsx:265,276; CorrectionChasePanel.tsx:276; CertificateRemindersList.tsx:415]
- [x] [Review][Patch] P4 (MED) After an ambiguous failure, EDITED fields are saved under the kept key ⇒ the server replays the first call and the form says "Call recorded." — mint a new key whenever the body changes [ContactCallForm.tsx:253; claims.contact-call.handlers.ts:107-117]
- [x] [Review][Patch] P5 (MED) A `recordResult` throw after COMMIT skips `auditClaim` — a committed call with no `call_recorded` line and a 500 that says "could not be saved"; audit right after commit, before `recordResult` (family 8) [apps/api/src/modules/claims/claims.contact-call.handlers.ts:148-157]
- [x] [Review][Patch] P6 (MED) A nominee while calls are not cleared (`ask === 'letter'`, or a running ladder): the form is offered and the reveal's step-up preHandler spends an OTP before the 409 — run the recipient / nominee refusal before `callNumberStepUp`, and hide the form for `ask === 'letter'` [claims.correction-chase.routes.ts; claims.certificate-reminder.routes.ts; CorrectionChasePanel.tsx:276; CertificateRemindersList.tsx:415]
- [x] [Review][Patch] P7 (MED) `crypto.randomUUID()` runs after `savingRef.current = true` and outside the `try` — a throw (non-secure context) locks every button for good; use `newIdempotencyKey()` inside the guard [ContactCallForm.tsx:252-253; apps/admin/src/api/hooks.ts:549-562]
- [x] [Review][Patch] P8 (MED) Certificate ladder child: ONE decrypt failure marks the hash failed ⇒ the re-check records `skipped:hash_unavailable` at once, contradicting its docstring ("A KMS failure is retried") and the correction child (which throws transient) [apps/jobs/src/scheduler/claim-contact-ladder.ts:1043-1050]
- [x] [Review][Patch] P9 (MED) Migration 0169 was APPLIED to `:5433` (hash `b88e8cb8…` = `b1d39f0c`) and then edited in round 1 (P3's row-id CHECKs, present on `:5433` only by a hand ALTER); round 1's "confirmed unapplied to any DB beforehand" is false — restore 0169 as applied and carry the CHECKs (and P31) in an idempotent 0170; correct round 1's P3 line ([[project_live_db_test_gotchas]]) [packages/domain/migrations/0169_claim-contact-ladder.sql:84-100]
- [x] [Review][Patch] P10 (MED) AC7's in-flight replay leg (409 `contact_call.idempotency_in_progress`) has no test anywhere [apps/api/tests/integration/claims/contact-call.spec.ts]
- [x] [Review][Patch] P11 (MED) Family 3 REAL GAP — no runtime cross-Pariwar (B's claim on A's path) or non-human / member-session denial leg on the three new routes [apps/api/tests/integration/claims/contact-call.spec.ts]
- [x] [Review][Patch] P12 (MED) AC2's certificate stop legs were never built (`certificateLadderStopReason` has ⛔ test: `certificate_accepted`, `never_reenters`, `cannotRemind`, `letter_delivered`, received, day 182; plus the transient-within-backoff, `attempting`-past-day and T22 NULL-hash legs) and are not carried as a risk (family 10) [packages/domain/src/claim/certificate-reminder-record.ts:509] — ⚠ **partly:** nine live legs through `certificateLadderStopReason` built (`certificate-reminder-send.spec.ts`); the T22 NULL-hash `attempting` leg inside the begin re-check ⛔ built (needs the jobs begin-send harness) — W20
- [x] [Review][Patch] P13 (MED) `CLAIM_NOMINEE_CALLS_CLEARED` is in neither the `api` nor the `jobs` `environment:` block — "set in ONE place in the deployment config" (`-355` d11, Row 34) is not built (fails closed) [infra/dokploy/compose.yaml]
- [x] [Review][Patch] P14 (MED) ADR-0042's ratified body was rewritten after `-358` ("No amendments, no conditions") with a false sentence — the ratified text already named the trigger ("If MSG91 adds request signing…"); restore the ratified bullet ([[feedback_supersede_never_reinterpret]]) [docs/adr/ADR-0042-msg91-delivery-report-ingress.md "Migration / pivot"]
- [x] [Review][Patch] P15 (MED) The Panel pack and the consent sheet were edited after presentation against their own "kept as presented" lines (and the pack's "-355 … at this revision" is itself wrong); restore the presented text and add dated post-presentation notes; round 1's "the stale arithmetic … fixed below" is untrue (37→40 / 153 was the presented figure) — correct that line [_bmad-output/planning-artifacts/panel-pack-2026-10-17-6-37c.md:86; docs/knowledge-transfer/adr-ratification-consent-sheet-2026-10-17.md:135-138]
- [x] [Review][Patch] P16 (LOW) AC7's jobs LD11 leg asserts the pure `ladderAsk`, not the sweep — the cleared direction is never driven through `writeCorrectionLadderEscalation` [apps/jobs/tests/claim-contact-ladder-live.test.ts:767-779]
- [x] [Review][Patch] P17 (LOW) Round-1 D1 side effect — a retry the gate now refuses leaves the step `sent` on a row `giveUp` marked `skipped_superseded` (nothing sent), with no alarm; resolve the step to the verdict when no attempt ran; correct round 1's rationale (the reason lands in the reminder row's unconstrained `detail`, ⛔ `end_detail`) [packages/domain/src/claim/contact-ladder-record.ts:445-454,640-646]
- [x] [Review][Patch] P18 (LOW) The `ended` branch of both begin functions discards `giveUp`'s `expiredAttempt` ⇒ the "earlier attempt ran" alarm never fires there [contact-ladder-record.ts:~409, certificate twin]
- [x] [Review][Patch] P19 (LOW) D10 incomplete — after the correction closure supersedes the return, `liveReturnIdFor` is `undefined` ⇒ `readClaimLadders` reads every return; the comment ("NEVER been returned … ZERO rows") is false — scope to the latest return [packages/domain/src/claim/contact-call.ts:43-56,215]
- [x] [Review][Patch] P20 (LOW) Round-1 P16 asymmetric — the certificate child's stale-slot path (`run === null`, ignored `lockCertificateClaim` null) is still silent [apps/jobs/src/scheduler/claim-contact-ladder.ts:1014-1018]
- [x] [Review][Patch] P21 (LOW) Certificate child: `e164 === null` after the claim throws transient with ⛔ transient note; mirror the correction child (finalise `no_target`) [claim-contact-ladder.ts:1083-1085]
- [x] [Review][Patch] P22 (LOW) Round-1 D2 regression — a co-bundled ladder ask retitles a batch holding an `escalation` / `closure_escalation` as "texts did not reach the family" and drops the escalation from the body [apps/jobs/src/scheduler/claim-correction-reminders.ts:535-555]
- [x] [Review][Patch] P23 (LOW) Round-1 D3's fallback is `'ask:letter'` — for a capped person that tells staff to post a forbidden letter; fall back to neutral wording [claim-correction-reminders.ts:514]
- [x] [Review][Patch] P24 (LOW) The certificate ask's `letterCapReached` ignores the one-letter-per-NUMBER rule (CR6) — a person whose number-mate has a letter is asked to "post a letter" the route refuses `already_recorded` [claim-contact-ladder.ts:797; packages/domain/src/claim/certificate-reminder-read.ts]
- [x] [Review][Patch] P25 (LOW) The burst alarm counts per sweep RUN, not per IST day (AC11), tallies count work a later timeout rolled back, and alarm id lists repeat one claim [claim-contact-ladder.ts:257-279,437,570]
- [x] [Review][Patch] P26 (LOW) The correction ladder child sets ⛔ `lock_timeout` (the certificate child does) [claim-contact-ladder.ts:880-919]
- [x] [Review][Patch] P27 (LOW) **→ DEFERRED (W15)** — AC6's same-day push holds only when the ladder sweep runs before the chase sweep; enqueue the push when an open-run ask is written after today's push went [claim-contact-ladder.ts:526,725]
- [x] [Review][Patch] P28 (LOW) AC6's ended-run push is pinned only at enqueue — drive `runCorrectionStaffPush` ("lists once", not relisted next day) [apps/jobs/tests/claim-contact-ladder-live.test.ts]
- [x] [Review][Patch] P29 (LOW) `admin.display_name_missing` (and `contact_call.idempotency_key_too_long`) fall through to "Try again" — map them [apps/admin/src/modules/correction-chase/errors.ts:47-58]
- [x] [Review][Patch] P30 (LOW) Family 13 — the outcome `<fieldset>` has no `<legend>`, the disabled "reached" radio gives no reason, and `ContactLadderLines`' "Every line is ANNOUNCED" is false for regions that mount with text [ContactCallForm.tsx:369; ContactLadderLines.tsx:5]
- [x] [Review][Patch] P31 (LOW) DB backstops for 0170 (family 5): `concluded_undelivered` ⇒ both steps resolved (P10's CAS mirrored; fix fixtures that insert concluded ladders with pending steps); `claim_contact_calls.ladder_id` `ON DELETE SET NULL` (a reach fact outlives its ladder); policy specs assert the three tenant-scoped indexes [0169:117-118,143,152; both policy-regression specs]
- [x] [Review][Patch] P32 (LOW) `readNumber` maps every non-refusal error to a retryable 503 and logs only `err.name` [claims.contact-call.handlers.ts:185-189]
- [x] [Review][Patch] P33 (LOW) AC4's two named legs missing — A→B→A after a conclusion on A (a new report in the new A epoch maps and may start); an earlier row covered by a STOPPED ladder [packages/domain/tests/claim/contact-ladder.test.ts; tests/integration/claim/contact-ladder.spec.ts] — ⚠ **partly:** the A→B→A new-epoch pure leg built; the live STOPPED-ladder round trip ⛔ built (the pure leg `tests/claim/contact-ladder.test.ts:308` pins the rule) — W20
- [x] [Review][Patch] P34 (LOW) Test tightening — the contact-call spec's title vs body ("a later one" is another person's); the escalation idempotency leg never asserts the second call's `written: false` / unchanged `escalatedOn`; `arrayContaining` on an oldest-first reader; the gate's rename leg `.not.toBe` passes on a parse failure [packages/domain/tests/integration/claim/contact-call.spec.ts; contact-ladder.spec.ts; scripts/claim-adjudication-human-actor-invariant/lib.test.ts:217]
- [x] [Review][Patch] P35 (LOW) Story-file records — the STATUS comment still opens `in-progress`; "LD1–LD17 — PROPOSED, ⏳"; the PQ heading's ⏳ and "WRITTEN, ⛔ sent"; Sequencing's "nominee half"; round 1's counts (16 / 11 vs 18 / 9; 644 vs 753); P11's rationale (both tables default `created_at` to `clock_timestamp()`); drifted line refs; the File List vs `git diff --name-only main...HEAD`; LD1's dated note on what a nominee can be asked; the Policy-meaning sentence not narrowed to Q2 A / I8's per-chase rule; v1.4's "build unchanged"; and record that the `-360` "code must match at review" check was made (round 2, three auditors) [this file]
- [x] [Review][Patch] P36 (LOW) deferred-work records — the no-restart item's trigger already fired (`-355` §0: BigDev answered LD5 as the author's); the SMS-2-on-the-start-morning item cites a Policy-meaning disclosure that is not there and files it under PQ3; "six Trustee rulings" is seven (`-356`); D8 quotes Row 34 words that are `-355` d9's; the ADR-0042 restatement item has three closers — one; the "a District Admin can RECORD a call" line for the send-time-dead family is untrue (⛔ ladder ⇒ ⛔ form) [_bmad-output/implementation-artifacts/deferred-work.md]
- [x] [Review][Patch] P37 (LOW) Governance records — adr-index's older notes still say ADR-0040–0042 `drafted` (dated annotation); architecture §3.4's heading cites `-350`–`-352` but not `-357` / `-356`; the counsel question says its answers "close" Row 18, which also needs the copy marker replaced; `-361` (iii)'s not-ratified reading says ADR-0040 keeps ZeptoMail "set up" (ADR-0040: "built and unset") — a dated correction; `-356`'s "told to the Panel" asserted before the pack went out (told at `-357`) — a dated note; `-356`'s commit SHA and the Task 0 records commit SHA unrecorded [docs/knowledge-transfer/adr-index.md; _bmad-output/planning-artifacts/architecture.md:2245; counsel-question-2026-10-18-nominee-contact-basis.md; .decision-log.md]

- [x] [Review][Patch] P38 (MED, from D1) One reached-call rule — `called_on ≥` the concluded ladder's `origin_sent_on` — in `pendingLadderAsk` and `reachedCallSince` (letter chase + escalation, both chases); legs: a call before the origin answers nothing, a late-logged call after it does [packages/domain/src/claim/contact-ladder.ts:376-384,450-453; apps/jobs/src/scheduler/claim-correction-reminders.ts:1339-1345; claim-certificate-reminders.ts:463-469]
- [x] [Review][Patch] P39 (MED, from D2) The three staff lines reworded per `-363` decision 2 (admin + api closure refusal), microcopy gate + admin tests [apps/admin/src/modules/correction-closure/i18n-en.ts:18; apps/api/src/modules/claims/claims.correction-closure.handlers.ts:132; apps/admin/src/modules/correction-chase/i18n-en.ts:151-154]

**[Review][Defer]**
- [x] [Review][Defer] W1 Same-day boundary — a reached call made at 09:00 on the day a 10:00 text fails still ends / blocks that ladder; `claim_contact_calls` stores a date only (the PII-free record, LD10) [packages/domain/src/claim/contact-ladder.ts:215,288] — deferred, inherent to the date-only call record
- [x] [Review][Defer] W2 The 20,000-claim scan bound always cuts the same tail (correction first, `claim_case_id` ascending) — no rotation; the daily alarm fires [apps/jobs/src/scheduler/claim-contact-ladder.ts:199-206] — deferred, far beyond today's scale
- [x] [Review][Defer] W3 The correction plan does KMS work while holding the trustee lock (the certificate plan hashes before its lock) [claim-contact-ladder.ts:394-420] — deferred, performance
- [x] [Review][Defer] W4 A hash failure on the conclude date hides the `letter_delivered` stop ⇒ the ladder concludes `hash_unavailable` and writes an ask [claim-contact-ladder.ts:423] — deferred, a double fault, alarmed (LD5)
- [x] [Review][Defer] W5 An ask written `no_target` (no shepherd) is never pushed once a shepherd is assigned; it stays on the view [claim-contact-ladder.ts:447,725] — deferred
- [x] [Review][Defer] W6 An ask from a ladder concluded on an OLD number stays open after a 6.20 number change [packages/domain/src/claim/correction-chase-read.ts:283; certificate-reminder-read.ts:253,271] — deferred
- [x] [Review][Defer] W7 The late-ask carry is claim-wide, ⛔ return-scoped — a superseded return's un-pushed ask rides a later return's push [claim-correction-reminders.ts:648,1445] — deferred
- [x] [Review][Defer] W8 A reached call recorded after a ladder SMS was claimed `attempting` does not stop that send [packages/domain/src/claim/contact-call.ts:440] — deferred, the claim-then-send window
- [x] [Review][Defer] W9 `claim_contact_calls.ladder_id`'s FK bypasses RLS — a raw INSERT could probe another tenant's ladder id (23503 vs success); the domain always derives it [0169:143] — deferred
- [x] [Review][Defer] W10 A refused number reveal (`nominee_calls_not_cleared`, `not_a_recipient`) leaves no audit line [claims.contact-call.handlers.ts:191] — deferred
- [x] [Review][Defer] W11 The step-up is scoped to the `contact_call_number` context, ⛔ to a claim / person — one OTP reveals any number in the district for the window (the letter-address precedent is identical) [claims.correction-chase.routes.ts; claims.certificate-reminder.routes.ts] — deferred, house pattern
- [x] [Review][Defer] W12 A hung list refetch after a successful save keeps the form disabled (`apiFetch` has no timeout — [[project_tanstack_refetch_rejoins_hung_fetch]]) [apps/admin/src/api/hooks.ts:1124] — deferred, transport-wide
- [x] [Review][Defer] W13 A replay returns the stored DTO with no check against today's `.strict()` schema — a deploy inside the 24 h window can 500 a replay [claims.contact-call.handlers.ts:112] — deferred
- [x] [Review][Defer] W14 The AC7 lock-order leg is timing-based (`setTimeout(400)` then "not settled") [apps/jobs/tests/claim-contact-ladder-live.test.ts:846-847] — deferred

- [x] [Review][Defer] W15 (P27) AC6's same-day push when the chase sweep ran first with no items — `staff_push` is one per (claim, recipient, day) (partial UNIQUE + per-day alert id) and the ladder sweep cannot know whether the chase sweep has run; pushing first would claim the day's one push before the chase writes its rows (the hazard `unpushedEndedRunAsks` documents); the ask rides the next day's push (LD9 (ii) live leg) [apps/jobs/src/scheduler/claim-contact-ladder.ts:526,725] — deferred, needs a push-ordering seam
- [x] [Review][Defer] W16 (P6, form half) The call form is still offered to an uncleared nominee whose follow-up runs / ended (only `ask === 'letter'` hides it) — every save is refused 409 in plain words and, since P6, no OTP is spent; hiding it needs the clearance flag in the DTO [apps/admin/src/modules/correction-chase/ContactCallForm.tsx:95] — deferred
- [x] [Review][Defer] W17 (P25) Two concurrent sweeps can each raise `contact_ladder.burst:N` for one crossing (both read the committed day count); a run straddling IST midnight can re-alarm — logs only (Row 32 (h)) [claim-contact-ladder.ts burst block] — deferred
- [x] [Review][Defer] W18 (P5) A synchronous `auditClaim` throw after COMMIT leaves the key `pending` until the 24 h TTL (retries 409) — the round-1 keyed-store residual's sibling [apps/api/src/modules/claims/claims.contact-call.handlers.ts] — deferred
- [x] [Review][Defer] W19 (P4, by design) An EDITED retry after a first POST that committed but lost its response writes a second call row (both listed; the first may already have ended ladders) — chosen over silently replaying the first call [ContactCallForm.tsx] — deferred, the intended trade-off
- [x] [Review][Defer] W20 (P12 / P33, legs not built) the T22 NULL-hash `attempting` leg inside the begin re-check (needs the jobs begin-send harness) and the live stopped-ladder round trip (pure leg only) — deferred, disclosed

**Fix-diff review (2026-10-18)** — the patch wave (44 files, 1649+/229-) re-reviewed adversarially in fresh context (Blind Hunter on
the code diff; Edge Case Hunter with repo access; a records reviewer): 0 H / 6 M / ~20 L. Applied before commit: P17's `giveUp`
conflated "own row skipped" with "row final / held by another job" ⇒ a sent step could be un-sent (now tri-state, CAS-checked, step 2
guarded on `sms3_state='pending'`); P32 logged `err.message` (envelope content) ⇒ ids + name only; P21 left a claimed row that sent
nothing as `sent` / "an attempt ran" ⇒ `skipped:no_sendable_number`; the `-363` live leg could not fail (non-chase day) ⇒ moved and
proven red on the old rule; P24's VIEW half (one shared cap function); P19 scoped to the latest RETURN; P3 withdrawal resets the
fields and key; P30's hint text distinct; the gate test's `indexOf` guard; P26 stale-slot timeout ⇒ transient; a stale comment; the
api closure string set to `-363`'s exact words; records — round 1's four "fixed" lines that round 2 reverted got dated notes, the
ladder-edges note's in-place banner flip a dated note, the 6.31 migration pointer moved to 0171, the sheet / index / deferred-work
wording tightened, roster Row 24 points at the `-361` (iii) correction.

**Fix-diff review, 2nd pass (2026-10-19)** — fork E's corrections (`89b903ba..cda305df` code, 20 files, 401+/89-) had gone into
`cda305df` without their own review; two fresh-context reviewers found 1 H / 3 M. Applied: the P21 no-number branch (fork E's
`abandonCertificateLadderSend`) could strand a row `attempting` for good when an earlier attempt had noted a `detail`, set a lock
timeout on an attempt with no retry left, and recorded the event differently from LD3 and the correction child ⇒ REMOVED; the final
attempt now finalises `no_target` (`no_target:no_sendable_number`, the step stays `sent` — LD3, exactly as the correction child;
`finaliseCertificateReminder` admits `no_target`, which 0141's purpose / outcome CHECK already allows; the branch is effectively
unreachable — the hash and the number decrypt from one ciphertext). `unsendContactLadderStep` step 2 under a RESOLVED step 3 now
un-sends and leaves `sms3_due_on` alone (⛔ a `sent` step left on a `skipped_superseded` row). The call form: a refusal settling
after withdrawal shows ⛔ alert; a form offered again starts without the old status line (a leg, proven red without the guard).
Two defers (W21, W22). Dismissed: the latest-return leg's tie (`created_at` is `clock_timestamp()`), `letter` as `undefined`
(typed `| null`, built `?? null`), the closure string's full stop (`-363`'s exact words).
- [x] [Review][Defer] W21 The certificate LIST's ask computes the letter cap from the persons' STORED row hashes (`evaluateCertificatePersonStates(…, new Map())` — ⛔ KMS on a list read), while the planner and the letter route use the CURRENT hash — after a number change (or with ⛔ hashed row yet) the list's ask can say "post a letter" the route refuses `already_recorded`, or hide one it would accept [packages/domain/src/claim/certificate-reminder-read.ts:177,260] — deferred, the list's no-KMS design; the route stays the authority
- [x] [Review][Defer] W22 The certificate ladder child's lock timeouts surface as raw pg errors, ⛔ `ClaimCorrectionTransientError` (the correction child maps them) — pg-boss retries any throw, so only the log class differs [apps/jobs/src/scheduler/claim-contact-ladder.ts certificate child] — deferred

**Dismissed (30)** — verified false or by design: `knownCurrentHash` null passthrough (`null ?? undefined` is `undefined`); `settleSatisfied` recording a failed scheduled row (LD4 "whatever its outcome"); a running ladder on a superseded return blocking a new one (the sweep ends it `stopped:return_superseded`, `claim-contact-ladder.ts:382-389`); a retry re-keyed on a later day (`sentOn` is the payload's); two texts on a re-run (an ended run stops the ladder, `correction-reminder-record.ts:536`); `end_detail` grammar (every writer fits); `planLadderStart`'s sort (stable over tie-broken keys); the origin `createdAt` fallback; a co-recipient KMS crash (assumption); string date compares (the contract validates); a stuck `attempting` row (the crossed-midnight finaliser); `hashOf` under `cannotRemind` (the stop ends it first); the correction gate's `paused: false` (`family_part_done` is a stop); the push / ladder race (one chase lock, READ COMMITTED); the burst alarm firing after the queue (by design); the MATERIALIZED CTE (perf, no LIMIT); the batch-handler comment; a shared push `requestId`; the found-dead tie (LD7); a failed enqueue retried next day; the reveal rate limit (round 1); `.strict()` on the querystring; the lockstep's hand-picked inputs; a two-render test; loose i18n typing; the `allSettled` logging (round 1's choice); the 6.37c id-as-number rule; `delivered_at`'s "Resolved via explicit deferral" (Task 10's prescribed words); the unsent counsel question (round 1 deferred); Row 32 note (9)'s optional annotation.

## Dev Notes

### ⚠ TRAPS

1. **T1 — ⛔ Map on the report** (F1, I4). The 6.37b AC11 text says it; the rulings do ⛔. Map on a CONCLUDED ladder.
2. **T2 — ⛔ Touch `DEAD_OUTCOMES` or `evaluatePersonRunState`'s outcome logic** (I3) — shared by the correction closure AND the certificate
   chase. Only `deadOn?`, the `deadKind` union and the MIN (LD7).
3. **T3 — `readClosureReach` bypasses `readReturnPersonStates`** (`correction-closure.ts:409`) ⇒ the mapping lives in `readReturnFamilyRows`
   ITSELF.
4. **T4 — `foundDeadOn` is sticky, dated, and "first" in TIME** (F6, `correction-chase.ts:758`) — LD7's MIN or the found-dead date moves
   LATER at conclusion.
5. **T5 — The chase sweeps only see OPEN runs and `slot < 90`** (F8, F14) — the ladder has its OWN sweep; its `ladder_escalation` writes on an
   ended run.
6. **T6 — ⛔ Ladder SMS as `family_sms`** (LD2 (c)) — they would suppress scheduled slots through the catch-up's recorded set.
7. **T7 — ⛔ Copy the stop predicates** (I6) — extract them ([[feedback_mechanization_split_commitment]]); and `run_ended` is the FIRST stop
   (`correction-reminder-record.ts:430`) — a ladder must read the END REASON, or every ladder dies at day 90 (and `day_90` alone does ⛔ mean "not closed" — `closure_closed`).
8. **T8 — 6.37b's correlator filters `cr` AND `ce` by purpose** (F4) — forget `ladder_sms` in EITHER set and that chase's ladder SMS reports
   land `unmatched:not_sms`: ⛔ ladder of that chase ever ends `delivered` — and a delivered person is wrongly concluded.
9. **T9 — A purpose is lockstep in FOUR places** — the TS tuple, the migration CHECK, the Drizzle `check()` copy, the partial unique indexes (+
   the purpose LOCKSTEP leg — correction in the CLOSURE policy spec `:516-524`, certificate `:388`; + the certificate purpose↔outcome CHECK). A missed one is a `23514` that rolls back a whole sweep plan.
10. **T10 — Migrations are hand-authored; ⛔ regenerate an applied one** (42P07); ⛔ `DROP SCHEMA`; edits reach :5432 AND :5433
    ([[project_live_db_test_gotchas]]); push with `DATABASE_URL` at :5433 ([[project_prepush_hook_inherits_5432]]). The number races 6.31.
11. **T11 — The WhatsApp fixture reports `accepted`** (I7) — ⛔ `resolveWhatsappProvider` / `dispatch()` / `cascade`.
12. **T12 — `readSmsSendDeliveries` / any raw read on the BYPASSRLS pool reads EVERY Pariwar** (F5) — filter by `pariwar_id` or run in scope.
    The inverse is T24.
13. **T13 — DB-clock ordering ties in one transaction** ([[project_db_clock_ordering_tests_tie]]) — `created_at` / `updated_at` comparisons
    need SEPARATE transactions or an injected clock; `clock_timestamp()` vs `now()`.
14. **T14 — Dates are IST** — `cycleCalendar`'s primitives (`istDateOf`, `addCalendarDays`, `istMidnightAt`); ⛔ a new copy of the offset.
15. **T15 — Contracts tests sit outside tsc** ([[project_contracts_tests_outside_tsc]]); contracts ⛔ import `@twt/domain` (re-declare enums).
16. **T16 — The closure refusal is lockstep** (F7) — the union, `AC6_REQUEST_REFUSALS` + its ORDERED test, `ClosureRequestBlocker`, `blockerDto`
    (throws ⇒ 500), the api's exhaustive switch, the admin copy.
17. **T17 — Idempotent handler shape** ([[project_idempotent_write_handler_shape]]) — the tx INSIDE the claim's try; COMMIT then
    `recordResult`; `closeScopeTx` RETHROWS a failed COMMIT.
18. **T18 — The microcopy gate scans comments** in `apps/admin/src/**` (`microcopy.yaml:283-284`) — and its canonical term `report`
    (`microcopy.yaml:36`, matched whole-word, case-insensitive) is allow-listed ONLY for the Reports page files and `client.ts`: in
    `correction-chase/` and `certificate-reminders/` write "reported" or "the network said", ⛔ the bare word "report" (`reported_undelivered`
    passes). The DLT gate scans comments in new `src` files — ⛔ spell the template-id prefix, `DLT_VAR` or `{#var#}`.
19. **T19 — Prettier is ⛔ enforced** — hand-format ([[project_prettier_not_enforced]]); ⚠ `**cl.3**` inside a JSDoc closes it
    ([[project_markdown_emphasis_closes_jsdoc]]).
20. **T20 — `boot.ts` and `packages/queue/src/index.ts` are shared** (6.37b's edits are on this branch; 6.31 plans its own) — merge by hand.
21. **T21 — The route gate scans only matched paths** (F17) — a call route outside `/correction/` / `/certificate-reminders/` is UNSCANNED and the
    gate stays GREEN; the gate-bites leg proves it.
22. **T22 — One human can be two person keys; one number one text a day** (certificate CR6; LD4) — the ladder child's same-number-same-day check
    under the chase lock covers ladder-vs-ladder and ladder-vs-scheduled — counting an `attempting` row, whose hash is NULL until finalise, by
    its person's CURRENT hash (LD4); ⚠ the chase's own catch-up `late` send does ⛔ check ladder rows (a residual, recorded at Task 10).
23. **T23 — `readSmsSendDeliveries` takes an UNBOUNDED id list and a non-uuid id raises `22P02`** (6.37b's deferred item, **"Deferred to
    6-37c"**) — prefer the JOIN (LD6); if it is called, bound / batch and validate at the edge.
24. **T24 — Under an RLS-bound jobs role the ladder sweep's cross-tenant scan returns ⛔ row SILENTLY** (F5; `reports.ts:220-224`) — ⛔
    ladder would ever start and every reported failure would keep counting as reached: the very gap `-350` closed. ⇒ call
    `smsDelivery.canReadAcrossPariwars` FIRST and alarm + refuse (6.37b's correlator / silence-check precedent), or run per Pariwar in scope;
    a leg for it; roster Row 26's note names the sweep (LD14 (b)).

### Reuse map

| Need | Reuse | ⛔ Rebuild |
|---|---|---|
| Delivery state | a JOIN on `sms_send_deliveries` (6.37b; `readSmsSendDeliveries` only bounded + validated — T23) | a report reader of our own |
| Send + CRQID | `sendClaimCorrectionSms` (`rowId`, kind derived) | a send core |
| Stop predicates | `correctionFamilyStopReason`; the certificate sub-predicates extracted from `planCertificateRun` (Task 3) | a copy |
| Rhythm | the chases' `'0 10 * * *'` IST cron + the chase child's stale-day guard | an hourly sweep, a send window |
| IST dates | `cycleCalendar` (`istDateOf`, `addCalendarDays`, `istMidnightAt`) | offset arithmetic |
| Ended-run staff row | `latestRunOfReturn` / `staffWriter` (`correction-closure-jobs.ts:107-188`) | a new anchor |
| Staff push | `staff_push` rows + the day UNIQUE (`claim-correction-reminders.ts:477-651`) — with the un-pushed item query (LD9) | a push path |
| Staff record | the letter record end to end (F17) | a new shape |
| Idempotency | `idempotency.createKeyedStore` (the `personal-event-handlers.ts:113-125` shape; ground-inspection's mandatory header) | a dedupe column |
| Step-up reveal | the letter-address reveal (`correction_letter_address`) | a new reveal mechanism |
| Tenant RLS | 0128's / 0167's per-command block + a `policies/*-rls.ts` declaration | a new policy shape |
| Cross-tenant guard | `smsDelivery.canReadAcrossPariwars` (6.37b) | an unguarded scan (T24) |
| The nominee-call switch | ONE env var read by api + jobs at boot, passed to the domain as a boolean (LD11 (a)) | a flag read under `packages/domain/src/claim` (a prohibited root) |
| Alarms | per-module `onAlarm?` (`cycle-spawn.ts:75,118`) | a sink |

### Testing standards

Vitest; live suites `describe.skipIf(!hasDatabase)` at :5433; a controllable clock and injected IST dates; fixture reports through 6.37b's own
accessors (the correlator over `persistSmsDeliveryReports`, or `upsertSmsSendDelivery` directly — named per leg); ⛔ network (I9). Pure tables
for `ladderEndReason`, `ladderStepGate`, `nextLadderStepDate`, `ladderAsk`. Every AC leg drives the REAL reader
([[feedback_stub_must_call_not_transcribe]]).

### Project structure notes

- **NEW:** `packages/domain/migrations/0169_claim-contact-ladder.sql` (or the next free — F18; + journal); `packages/domain/src/schema/claim_contact_ladders.ts`,
  `claim_contact_calls.ts`; `packages/domain/src/policies/claim-contact-ladder-rls.ts`, `claim-contact-call-rls.ts`;
  `packages/domain/src/claim/contact-ladder.ts`, `contact-ladder-record.ts`, `contact-call.ts` (+ tests, two policy-regression specs); `apps/jobs/src/scheduler/claim-contact-ladder.ts` (+ tests); `apps/admin/src/modules/…/ContactCallForm.tsx`; the
  PQ routing note (if routed); the counsel question (LD16).
- **UPDATE:** `packages/domain/src/claim/{correction-reminder-record,correction-chase,correction-closure,correction-chase-read,certificate-reminder,certificate-reminder-record,certificate-reminder-read}.ts`,
  `claim/index.ts`, `schema/{claim_correction_chase,claim_certificate_reminder,index}.ts`, `policies/index.ts`; `apps/jobs/src/sms-delivery-correlator.ts`,
  `packages/domain/src/sms-delivery/reports.ts` (the `cr` AND `ce` purpose filters only) + `apps/jobs/tests/sms-delivery-correlator.test.ts`;
  `apps/jobs/tests/claim-certificate-reminder-no-decision.test.ts` / `claim-correction-closure-no-decision.test.ts` (enrolment);
  `apps/api/src/config.ts` + `apps/jobs/src/boot.ts` (LD11 (a)); `apps/jobs/src/boot.ts`, `packages/queue/src/index.ts`;
  `apps/jobs/src/scheduler/claim-correction-reminders.ts` (the letter track's `reachedCallOn` — Task 4.3 — and the push purposes / copy),
  `apps/jobs/src/scheduler/claim-certificate-reminders.ts` (its `planCertificateStaffChase` call `:461` — the new input);
  `packages/contracts/src/claims/{correction-chase,correction-closure,certificate-reminder}.ts` + tests;
  `apps/api/src/modules/claims/{claims.correction-chase.routes,claims.correction-chase.handlers,claims.certificate-reminder.routes,claims.certificate-reminder.handlers,claims.correction-closure.handlers,claims.nominee-name-check.handlers,correction-closure-dto}.ts`,
  `apps/api/src/audit/audit-sink.ts`; `apps/admin/src/modules/{correction-chase,certificate-reminders,correction-closure}/**`,
  `apps/admin/src/api/{client,hooks}.ts`; `scripts/claim-adjudication-human-actor-invariant/check.ts`; the records (Task 0.4).
- **⛔ Touched:** `packages/i18n/locales/**`; `packages/channels/**`; every WhatsApp file; `apps/jobs/src/scheduler/claim-peer-mesh-requests.ts`;
  `apps/mobile`; every existing migration; `DEAD_OUTCOMES`. `packages/domain/src/claim/correction-closure-jobs.ts`: behaviour unchanged (LD8) —
  ONLY `latestRunOfReturn` / `staffWriter` exported (LD9).

### Sequencing

6.37b `done` and on `main` (this branch is rebased on it) → **6.37c** (Task 0 → code) → roster Row 33 closed AND 6-37c `done` → claim-text
template ids (Row 32 note (9); under LD1 (a) ⛔ 6-37d). GO-LIVE of the ladder (⛔ a merge or `done` fence): roster Row 32 (h) closed (`-354`
decision 4 (b)); nominee calls after G1 (`-354` decision 5). 6-37d (WhatsApp step + agreement wording) AFTER 6.31 (the direct
WA client) and 6.37c, behind the §3.4 amendment for its nominee half. The Panel pack's items (the amendment, the three ADRs) block ⛔ code here;
a routed PQ blocks `done`, ⛔ code.
⚠ *Dated 2026-10-18 (code review round 2):* there is ⛔ "nominee half" any more — `-356` ended WhatsApp to a nominee; the §3.4 amendment,
approved by `-357`, covers the claimant only, with G3; 6-37d builds the claimant's WhatsApp step.

### Previous story intelligence (6.37b)

- Governance pattern: author-commit ALONE → records commit → code; a Panel question through §0 BEFORE it is written; a question with ⛔
  reachability trace is withdrawn, ⛔ sent (6.37b's PQ2 — `-348`; [[feedback_trace_reachability_before_escalating]]). PQ1–PQ3 here are
  reachable: PQ1 whenever reports stop (6.37b F6 auto-pause, F8 account faults); PQ2 whenever both chases run on one claim (F16); PQ3 on every
  day-84 / day-180 failure (F8, F14).
- 6.37b's dev diverged from its design in small, recorded ways (its Debug Log (k)): `first_reported_at` in the UPDATE grant (since recorded by
  `-354` decision 1 (i)); the core refuses `ot`; `lookupSendForCorrelation` selects ⛔ `updated_at`. Its review rounds then changed what this
  story leans on: the `ce` purpose filter (F4), the `canReadAcrossPariwars` guard (T24), the 72 h / 5-attempt give-up (F3), the
  `MATERIALIZED` lease claim. Read the code, ⛔ the design ([[feedback_trace_internal_state_never_cite_decision_text]]).
- 6.37b's recorded proof: `ci:local` 35/36 on :5433 + `@twt/admin` re-run alone 1229/1229 (jsdom timeouts) — `ac123e19`.

### Git intelligence

This branch: `main` @ `ed862339` (all of 6.37b — dev `f7e695b7`, reviews `b5044a2d` / `ac123e19`, `-354` `a81cdbf7`, records `ed862339`) + two
commits of its own: the Panel pack `1534293b` (was `f8102c02` before the rebase) and the create-story `c19e6534` (was `1e0c6f2e`). The code
6.37c extends is 6.37b's final code (F1–F5) and 6.19b / 6.19c / 6.19d's chase code.

### Latest tech information

⛔ new library. MSG91's report semantics are 6.37b's (its Latest tech information — re-read there at Task 0.1). Meta / WhatsApp: ⛔ used (LD1).
Postgres partial UNIQUE + `ON CONFLICT DO NOTHING` for the start race; `clock_timestamp()` vs `now()` (T13).

### References

- `.decision-log.md` — `2026-10-17-350`, `-351`, `-352` (TRUSTEE-RATIFIED), `-353`, `2026-10-18-354` (decisions 1, 4, 5; Consequence 2),
  `-347` (DR4, DR5-G, DR6, DR12, DR13), `-349`,
  `2026-09-27-252` (cl.1–cl.2), `2026-09-27-250` (#1, #2, #4, #5), `2026-09-27-259`, `2026-10-03-275` (Q1, Q4), `2026-09-20-230` / `-231` C,
  `2026-09-29-269` §4, `2026-10-12-322` §0, `2026-10-12-323` R2.
- `_bmad-output/implementation-artifacts/6-37b-msg91-delivery-reports.md` (AC11, Task 7 — MOVED; F5, F6, F8, F12–F16, DR4–DR13, I1);
  `6-19-correction-return-reminders-and-closure.md`, `6-19d-replacement-certificate-reminder.md`, `6-19a-claim-contact-capture-at-filing.md`;
  `6-31-…` on its branch (the WA client, for 6-37d).
- `_bmad-output/planning-artifacts/trustee-panel-routing-note-TEMPLATE.md`; `…-2026-10-17-6-37b-reported-undelivered.md`,
  `…-6-37b-delivery-ladder-follow-ups.md`, `…-6-37b-whatsapp-consent-wording.md` (the rulings' blocks); `panel-pack-2026-10-17-6-37c.md`;
  `sprint-change-proposal-2026-10-17-whatsapp-claim-contact.md`.
- `docs/launch-gate-inventory/inventory-roster.md` Rows 18, 20, 21, 26, 30, 32 (notes (9), (h)), 33; `docs/adr/ADR-0042-msg91-delivery-report-ingress.md`
  (Security — the OPEN restatement item), `ADR-0029-…`; `docs/knowledge-transfer/adr-ratification-consent-sheet-2026-10-17.md` §1–§2;
  architecture.md §3.4 (`:2088+`; the member WA opt-in flow `:2218-2246`); `_bmad-output/implementation-artifacts/deferred-work.md` (the
  items in the rulings table — by phrase).

## Dev Agent Record

### Agent Model Used

Claude Opus 5.5 (1M context) — `bmad-dev-story 6.37c`, 2026-10-18 (two forks of the same session built Task 6 and Task 7's admin half
and wrote the pure `contact-ladder.test.ts`; every fork diff was read and re-run here before its commit).

### Debug Log References

- **(a) Task 0, 2026-10-18.** 0.1: `git fetch origin` — `main` unmoved at `ed862339`; next free ids `-355` (every ref; 6-31 at `-346`),
  migration 0169, roster Row 34 (6-31 has committed none). 0.2: BigDev, verbatim — *"LD1 a, LD2 a, LD3 ok, LD4 a, LD5 a, LD6 ok, LD7 ok,
  LD8 ok, LD9 ok, LD10 a, LD11 a, LD12 ok, LD13 ok, LD14 keep, LD15 a, LD16 a, LD17 a, PQ1–3 route."* 0.3: the entry staged, reviewed by a
  fresh-context reviewer (1 HIGH — the draft said "no Trustee-ratified clause moves" while this story discloses three build narrowings of
  `-350`; 8 MEDIUM / 5 LOW — dropped conditions, the forgery bound, the nominee "neither" case, status words), all applied; the additions put
  to BigDev, who answered *"Insert as is"*; inserted and committed ALONE as `d93b7c75`. The PQ note written from the template; its E4
  commands run (two empty results were search defects — one phrase lives in the `-351` routing note, not the log — fixed). 0.4: the records
  commit (this story's Change Log v1.3). 0.5: the counsel question written (`counsel-question-2026-10-18-nominee-contact-basis.md`), ⛔ sent.
- **(b) Dev, 2026-10-18 (Tasks 1–10).** Built at `story/6-37c-undelivered-reminder-ladder` from `33a9f550`; ⛔ base move (`git fetch` —
  `main` @ `ed862339`; 6-31 has ⛔ migration). Commits: `b1d39f0c` (Task 1), `533f6944` (Tasks 2–5 code), `b75e81c3` (Task 6 + the suites),
  `e44dcfef` (Task 7 domain / contracts / api), `a4247ab1` (Task 7 admin), then the gap legs and the records. What the build decided where
  the story left room, or departed (each kept to the story's meaning — none moves a Trustee-ratified clause):
  1. **Migration 0169** (the next free; journal `when` `1794195600013`) — applied to **:5433 ONLY** (⛔ :5432). LD2's columns PLUS
     `sms2_on` / `sms3_on` (the IST date a step RESOLVED — LD4's next-visit check and LD3's "next date counts from" need it) and
     `updated_at`; CHECKs pair each step's state with its date and the next date. ⚠ **6.31 will reach for 0169 too** — if it lands an
     0169 with a `when` ≤ `…013`, the drizzle migrator on :5433 SKIPS it (it is past `…013`): 6.31 must take 0170 / `…014`. ⚠ **Dated note 2026-10-18 (code review round 2):** this story now takes 0170 / `…014` itself (`0170_claim-contact-ladder-backstops`, P9 / P31) ⇒ 6.31 must take **0171 / `…015`** or later — re-grep every branch first.
  2. **A step is recorded `sent` when its `ladder_sms` row is CLAIMED** (in the re-check's transaction) — LD3's outcome table counts the
     next date from the send's own `sent_on` for EVERY send outcome (accepted, refused, `no_target`, `error`, a transient that the next
     morning's exhausted finaliser makes `error`), so resolving at claim is the same date; a retry of the same job re-claims the SAME row.
  3. **SMS 2 due on the very morning a ladder starts is sent in that run** — only a date strictly PASSED moves to the next run (LD3's
     words); a report first seen on D + 2 sends SMS 2 that morning (48 h, as `-350` ruling 2). ⛔ Two steps in one run either way. Recorded
     as a reading in deferred-work. (Flagged by the pure-test fork.)
  4. **A current-number hash that FAILS at START** ⇒ ⛔ start that day (the alarm `contact_ladder.hash_unavailable`); the row stays in
     the 14-day scan and starts the next morning. Before a send ⇒ `skipped:hash_unavailable`; at conclusion ⇒ concluded on the recorded
     number + the alarm (LD5 as written).
  5. **The live suite caught a real bug** the pure tests could not: `stops.get(runId) ?? 'unknown'` read a `null` ("⛔ stop") as unknown,
     so ⛔ ladder ever started — fixed (`stops.has(runId) ? … : 'unknown'`).
  6. **T22** — the correction ladder child reads EVERY person's state (the version-unchanged convention — ⛔ a KMS call unless a version
     moved, or the claimant) so another person's still-`attempting` row (its hash NULL until finalise) counts by that person's CURRENT
     hash.
  7. **`sameNumberHash` moved** to the leaf `correction-crypto.ts` (re-exported from `correction-closure.ts`) — the mapping, which the
     row readers call, compares hashes without importing `correction-closure.ts` (a cycle). New domain leaf `contact-ladder-read.ts` (the
     ladder / call reads the readers and the closure gate need). `correction-closure-jobs.ts`: ONLY `latestRunOfReturn` exported
     (`staffWriter` was ⛔ needed).
  8. **Contracts**: a LEAF `contact-ladder.ts` holds the call DTO, the follow-up, the ask and the reason; `CorrectionPersonKey` and
     `isRealCalendarDate` moved there and are re-exported from `correction-chase.ts` (else `correction-chase.ts` ↔ `contact-call.ts` is a
     runtime init cycle). `ContactCallDto.person_key` is an unconstrained output (footgun #29(a)). API leaf `contact-ladder-dto.ts`.
  9. **Task 6 (built by a fork, reviewed here)**: the handlers sit in a NEW `claims.contact-call.handlers.ts` (the routes stay in the two
     EXISTING route files on F17's path grammar — the district resolver and the human-actor gate apply; a new file avoids the
     `claims.correction-chase.handlers.ts` ↔ `claims.correction-closure.handlers.ts` cycle); a replay answers **200** with the first result
     (the `personal-event-handlers.ts` precedent; 201 the first time); the reveal answers a retryable **503
     `contact_call.number_unavailable`** on an unreadable envelope / KMS fault; refusals `called_on_*` / `reached_needs_answer` ⇒ 400,
     `claim_not_found` ⇒ 404, the rest ⇒ 409; the lockstep leg sits in contracts tests (they import `@twt/domain`, as the certificate
     lockstep does). The two-connection lock-order leg it could not build under per-test ROLLBACK is in the jobs live suite (own-commit).
  10. **Task 7 admin (a fork, reviewed here)**: the call form shows while the person has a follow-up or an open ask (⛔ every row); the
      certificate list reuses the correction module's call copy and classifier (ONE set of call words); a concluded line reads
      "Follow-up texts ended on <date> — none reached the family".
  11. **The ladder children read ⛔ pg-boss retry metadata** (lint) — a transient throws and pg-boss retries the same job; a hash that never
      clears that morning is the re-check's `skipped:hash_unavailable`, ⛔ a retry storm.
  12. **Task 9's diffs**: `correction-chase.ts` shows ONLY `deadOn?` / `concluded?`, the `deadKind` union and the MIN (AC4); ⛔ diff under
      `packages/i18n/locales`, `packages/channels`, `apps/mobile`, `claim-peer-mesh-requests.ts` or any existing migration. The two
      WhatsApp-named files in `c19e6534..HEAD` are Task 0's records (the §3.4 proposal, ADR-0029's changelog) — ⛔ code.

### Completion Notes List

- **Dev complete (2026-10-18).** A reminder the network REPORTS undelivered now starts a delivery ladder (correction AND certificate
  chases): the WhatsApp step recorded skipped, SMS 2 on D + 2 and SMS 3 two days later as the chase's OWN approved reminder (a
  `ladder_sms` row — CRQID `cr` / `ce`, so 6.37b's reports reach it), on the 10:00 rhythm (a scheduled day IS the step; ⛔ two texts to one
  number in one chase on one day; ⛔ a text past day 90 / 180 or in a pause — PQ3 A), then CONCLUDED on D + 8 unless a delivered message,
  a reached call, a number change or a stop ends it. A concluded ladder makes every undelivered reminder of its epoch read never
  delivered — at READ time inside each chase's ONE row reader (⛔ a stored outcome rewritten) — so D22 stops counting it, the person is
  letter-eligible (found dead on the conclusion date), the staff views say "not delivered" with a cap-aware call-or-letter ask (a
  nominee: "post a letter" until counsel — LD11's ONE switch), and the found-dead letter track runs from that date. A correction closure
  for silence WAITS while a correction ladder runs (`closure.ladder_running`, at all four callers). A District Admin can RECORD a call
  (append-only, idempotent, a step-up number reveal); a reached call counts for D22, ends the person's ladders on both chases and stops a
  concluded person's staff asks. Alarms (burst, RLS-bound role, hash, scheduled-not-sent, unassigned ask) reach the LOGS only — roster
  Row 32 (h) is a GO-LIVE condition (⛔ a merge or `done` fence).
- **Tests added**: 2 policy-regression specs (35 + 16); pure `contact-ladder.test.ts` (59); live `contact-ladder.spec.ts` (17 — the
  mapping through the real readers, I2's snapshot, A→B→A, LD7's MIN, LD17 (a), D22's ladder SMS / call, `ladder_running` at the four
  callers and its guard order, `closure_closed`, the staff read models); live `contact-call.spec.ts` (8); the jobs end-to-end
  `claim-contact-ladder-live.test.ts` (21 — real chase sends, real reports, the sweep and both children over injected IST days; a global
  fetch recorder at ZERO); the api call spec (6); `contact-call-form.test.tsx` (15) + the three admin suites' fixtures; the correlator's
  `cr` / `ce` ladder legs (unit + live, RED without Task 5 — a revert-sanity run); the contracts lockstep legs; the human-actor gate's
  gate-bites legs. Existing suites green with fixture-only edits (the 6.19b chase spec's pinned summaries, the control-paths mock seam).
- **Gaps stated, ⛔ hidden** (AC legs ⛔ built live; each rule is pinned in the pure tables or by construction): a transient ladder SMS
  retried inside the run's backoff and one left `attempting` past the day (the chase finaliser's path, unchanged); the certificate stops
  `certificate_accepted`, a never-re-entering state, `cannotRemind`, a letter delivered at the number to another person, a run ended
  `completed` with a certificate since received, and day 182 of a run ended on day 181 (the composed predicate's order is pinned by its
  unit-free reading and two live stops — `certificate_received`, `not_a_recipient` — plus the pause); T22's NULL-hash `attempting` variant
  across two children (the final-row variant is live).
- **Proof:** ci:local on :5433: every job green but integration-tests — its domain run 386/392 files (6 test timeouts under load, re-run alone 6/6, 60/60); the job stops after domain, so the other seven packages ran as the same command with --continue: queue, events, niyamavali-engine, channels, validity-service green, jobs 66/66 (1161), api 23 files hit vitest worker transform timeouts — re-run alone 174/174 (1981). Gates: dlt-typed-variables, domain-invariants, access-wrapper, human-actor, microcopy, channels-determinism green; a
  global-fetch recorder at ZERO across the jobs ladder suite (I9). ⚠ GO-LIVE (⛔ merge fences): roster Row 32 (h); nominee calls after Row 34.
- Ultimate context engine analysis completed — comprehensive developer guide created (`bmad-create-story 6.37c`, 2026-10-17; six parallel
  read-only research passes — the correction chase + D22, the certificate chase, the WhatsApp infrastructure, the consent / call / staff
  surfaces, the governance records and numbers, 6.37b's staged code — then one fresh-context validation pass against `checklist.md`).

### File List

- `_bmad-output/implementation-artifacts/6-37c-undelivered-reminder-ladder.md` (new)
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/planning-artifacts/epics.md` (`### Story 6.37c` entry — `-353`'s *"owed at its create-story"*; the Task 0 dated note)
- `.decision-log.md` (`2026-10-18-355`)
- `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-10-18-6-37c-ladder-edges.md` (new)
- `_bmad-output/planning-artifacts/counsel-question-2026-10-18-nominee-contact-basis.md` (new)
- `_bmad-output/planning-artifacts/panel-pack-2026-10-17-6-37c.md`, `sprint-change-proposal-2026-10-17-whatsapp-claim-contact.md` (revised before presentation)
- `docs/knowledge-transfer/adr-ratification-consent-sheet-2026-10-17.md` (§1–§2 revised)
- `docs/adr/ADR-0042-msg91-delivery-report-ingress.md` (dated note)
- `docs/launch-gate-inventory/inventory-roster.md` (Rows 18, 26, 32, 33 notes; Row 34 new)
- `_bmad-output/implementation-artifacts/deferred-work.md`, `6-37b-msg91-delivery-reports.md` (annotations)
- **Dev (Tasks 1–10):** `packages/domain/migrations/0169_claim-contact-ladder.sql` (new), `packages/domain/migrations/meta/_journal.json`;
  `packages/domain/src/schema/{claim_contact_ladders,claim_contact_calls}.ts` (new), `schema/{claim_correction_chase,claim_certificate_reminder,index}.ts`;
  `packages/domain/src/policies/{claim-contact-ladder-rls,claim-contact-call-rls}.ts` (new), `policies/index.ts`;
  `packages/domain/src/claim/{contact-ladder,contact-ladder-read,contact-ladder-record,contact-call}.ts` (new),
  `claim/{correction-chase,correction-chase-read,correction-reminder-record,correction-closure,correction-closure-jobs,correction-crypto,certificate-reminder,certificate-reminder-record,certificate-reminder-read,index}.ts`,
  `packages/domain/src/sms-delivery/reports.ts`; `packages/queue/src/index.ts`;
  `apps/jobs/src/scheduler/claim-contact-ladder.ts` (new), `scheduler/{claim-correction-reminders,claim-certificate-reminders}.ts`, `apps/jobs/src/boot.ts`,
  `apps/jobs/src/sms-delivery-correlator.ts`; `packages/contracts/src/claims/{contact-ladder,contact-call}.ts` (new),
  `claims/{correction-chase,correction-closure,certificate-reminder,index}.ts`; `apps/api/src/modules/claims/{claims.contact-call.handlers,contact-ladder-dto}.ts`
  (new), `claims/{claims.correction-chase.routes,claims.certificate-reminder.routes,claims.certificate-reminder.handlers,claims.correction-closure.handlers,claims.nominee-name-check.handlers}.ts`,
  `apps/api/src/{config,index}.ts`, `apps/api/src/audit/audit-sink.ts`; `apps/admin/src/modules/correction-chase/{ContactCallForm,ContactLadderLines}.tsx` (new),
  `correction-chase/{CorrectionChasePanel.tsx,errors.ts,i18n-en.ts,index.ts}`, `certificate-reminders/{CertificateRemindersList.tsx,i18n-en.ts}`,
  `correction-closure/i18n-en.ts`, `apps/admin/src/api/{client,hooks}.ts`; `scripts/claim-adjudication-human-actor-invariant/{check.ts,lib.test.ts}`.
- **Dev tests:** `packages/domain/tests/integration/rls/{claim-contact-ladder,claim-contact-call}-policy-regression.spec.ts` (new),
  `packages/domain/tests/claim/contact-ladder.test.ts` (new), `packages/domain/tests/integration/claim/{contact-ladder,contact-call}.spec.ts` (new),
  `packages/domain/tests/integration/claim/correction-chase.spec.ts`; `apps/jobs/tests/claim-contact-ladder-live.test.ts` (new),
  `apps/jobs/tests/{sms-delivery-correlator,sms-delivery-correlator-live,claim-correction-control-paths,claim-certificate-reminder-no-decision,claim-correction-closure-no-decision}.test.ts`;
  `apps/api/tests/integration/claims/contact-call.spec.ts` (new); `packages/contracts/tests/contact-call-lockstep.test.ts` (new),
  `packages/contracts/tests/certificate-reminder-lockstep.test.ts`; `apps/admin/tests/contact-call-form.test.tsx` (new),
  `apps/admin/tests/{correction-chase-forms,correction-queue,certificate-reminders}.test.tsx`.
- **Code review round 2 (v1.8):** `.decision-log.md` (`2026-10-18-363`, committed alone `39b52757`); `packages/domain/migrations/0169_claim-contact-ladder.sql` (RESTORED as applied), `0170_claim-contact-ladder-backstops.sql` (new), `meta/_journal.json`;
  `packages/domain/src/claim/{contact-ladder,contact-ladder-record,contact-call,certificate-reminder,certificate-reminder-read,certificate-reminder-record,correction-reminder-record}.ts`, `schema/{claim_contact_calls,claim_contact_ladders}.ts`;
  `apps/jobs/src/scheduler/{claim-contact-ladder,claim-correction-reminders,claim-certificate-reminders}.ts`; `apps/api/src/modules/claims/{claims.contact-call.handlers,claims.correction-chase.routes,claims.certificate-reminder.routes,claims.correction-closure.handlers}.ts`;
  `apps/admin/src/modules/correction-chase/{ContactCallForm.tsx,ContactLadderLines.tsx,CorrectionChasePanel.tsx,errors.ts,i18n-en.ts}`, `certificate-reminders/CertificateRemindersList.tsx`, `correction-closure/i18n-en.ts`; `infra/dokploy/compose.yaml`;
  tests — `packages/domain/tests/claim/{contact-ladder,certificate-recipients}.test.ts`, `tests/integration/claim/{contact-ladder,contact-call,certificate-reminder-send,correction-chase}.spec.ts`, both `rls/claim-contact-*-policy-regression.spec.ts`,
  `apps/jobs/tests/{claim-contact-ladder-live,claim-correction-send,claim-correction-control-paths}.test.ts`, `apps/api/tests/integration/claims/contact-call.spec.ts`, `apps/admin/tests/contact-call-form.test.tsx`, `scripts/claim-adjudication-human-actor-invariant/lib.test.ts`;
  records — ADR-0042 (restored to `4e7ddd84`), `docs/knowledge-transfer/{adr-index,adr-ratification-consent-sheet-2026-10-17}.md`, `docs/launch-gate-inventory/inventory-roster.md` (Row 24 note),
  `_bmad-output/planning-artifacts/{architecture,panel-pack-2026-10-17-6-37c,counsel-question-2026-10-18-nominee-contact-basis,trustee-panel-routing-note-2026-10-18-staff-email-provider,trustee-panel-routing-note-2026-10-18-6-37c-ladder-edges}.md`, `deferred-work.md`, `sprint-status.yaml`, this file.
- ⚠ *Dated 2026-10-18 (code review round 2):* the list above omits files the branch touched in its records commits (`architecture.md`, `adr-index.md`, ADR-0009 / -0029 / -0040 / -0041, `6-37-msg91-sms-gateway-adapter.md`, the `-351`, 6.37 name-too-long, neighbours'-name and staff-email routing notes, the 6.27c story) and lists `.decision-log.md` as `-355` only (`-356` – `-363` are on this branch too); `git diff --name-only main...HEAD` is the authority.
- **Dev records (Task 10):** `_bmad-output/implementation-artifacts/deferred-work.md` (dispositions + a new section),
  `_bmad-output/implementation-artifacts/sprint-status.yaml`, this story file.

## Change Log

| Date | Version | Change |
|---|---|---|
| 2026-10-17 | 1.0 | Created by `bmad-create-story 6.37c` at `f8102c02` (worktree `.claude/worktrees/6-37c`). F1–F20 found; LD1–LD14 PROPOSED (⏳ Task 0.2); PQ1 / PQ2 candidate. Status `ready-for-dev`. |
| 2026-10-17 | 1.1 | Create-story's own validation (one fresh-context read-only verifier, `checklist.md` + the footgun catalogue): 7 CRITICAL / 17 SHOULD / 10 NICE, all applied. ⭐ The ladder now keeps the reminders' RATIFIED rhythm — `-250` #5 (*"One message a day, at 10:00"*, *"stop at day 90"*), `-259` (180 days), `-275` Q4 (pause) — steps are IST dates sent by the 10:00 sweep, a scheduled day IS the step, ⛔ text past the end or in a pause (new PQ3: may the ladder conclude without that text?); the stop predicates read the run's END REASON and gain `closure_closed` (a late report after a decided closure could otherwise text a closed claim); every start / state move under the chase lock; the no-restart rule after a conclusion (else nine ladders to day 84); LD3's per-outcome step table; the call routes on the real path grammar (else the human-actor gate is vacuous) + a gate-bites leg; the reached call stops the staff asks ONLY for concluded persons (send-time dead numbers keep `-230` / `-231` C's letter track) — Task 4.3 added; `foundDeadOn` = the MIN dead date; PQ2 states that it narrows `-351` 4 A / 6 A and that a call already crosses chases; the `-354` supersession list completed (`-353` decision 2, `-351` Consequence 2, `-352` C3 → LD11); the unpresented §3.4 bullet corrected in place (F19); LD11 gains option (d) and a roster row; the ask is letter-cap-aware; the call takes both locks in order; F4's `ce` premise corrected (Task 5 is correction-only); I1's forgery bound completed; `ladder_running` after `claim_corrected` + `blockerDto` and the closure admin copy named; a partial UNIQUE per ladder step / escalation; 6.37b is COMMITTED (`f7e695b7`) — the header's cite shifts; the Policy meaning rewritten match / narrow per line; cites corrected (`sameNumberHash` `:324-327`, `readCorrectionRecipients` `:601`, the certificate one-letter check `:233`, the spec paths, `correction-closure-jobs.ts`'s package); the `epics.md` entry written now (`-353`). F21 added (the agreement as built). A second fresh-context review of the v1.1 rewrite (3 HIGH / 11 MED / 12 LOW, all applied): a certificate pause SKIPS a step and the clock runs on (⛔ a hold) everywhere; the certificate stop predicate reads the ORIGIN run (open or ended) and checks received / pause BEFORE the horizon; AC4's diff pin matches Task 7 and the `concluded` marker; the transient row matches the code's minute-scale backoff; the old anchor wording removed; LD4's early-week counts and the Policy meaning's wording corrected; the one-a-day check covers every person on the number; the mapping and no-restart rule are epoch-scoped (A→B→A); a send-time refusal of a ladder SMS waits for the conclusion (disclosed); the push "that day or next morning"; `staffWriter` exported, `correction-closure-jobs.ts` behaviour unchanged; three more disclosed narrowings in the Policy meaning; PQs block every code task; cites corrected. |
| 2026-10-18 | 1.2 | `bmad-create-story validate 6.37c` after 6.37b reached `main`: the branch REBASED onto `main` @ `ed862339` (two ledger conflicts resolved, both entries kept); re-pinned `c19e6534` (the v1.0 / v1.1 pin `f8102c02` is ⛔ an ancestor any more). Four parallel read-only verifiers (governance; 6.37b's final code; the correction chase; the certificate chase + call record + staff views), each headline finding re-checked by hand: 14 critical / 16 should / ≈ 15 small — all applied. ⭐ F4 was FALSE after 6.37b's round 2 — the correlator and the silence check filter `ce` by purpose too (`CERTIFICATE_SMS_PURPOSES`), so Task 5 / AC10 / T8 widen BOTH chases (the v1.1 row's *"F4's `ce` premise corrected (Task 5 is correction-only)"* is SUPERSEDED here, kept as written); the numbers moved — `-354` and migration 0168 are 6.37b's ⇒ the 6.37c entry is the next free (F18; v1.1's "`-354`" everywhere meant what is now "the 6.37c entry"), the migration 0169; `-354` decision 5 already DECIDES the nominee gates ⇒ LD11 picks only the MECHANISM ((b) foreclosed; the invented "api boolean config registry" replaced by ONE env var read by both apps — a 10.8 feature flag is barred under `packages/domain/src/claim` by `governance_boundary.yaml`); `-354` decision 4 (b) makes Row 32 (h) a GO-LIVE condition and (c) owes the Panel a telling (PQ1's alarm sentence corrected); `-354` decision 5 routes the nominee text / letter basis to counsel with Task 0 (new LD16, Task 0.5 — LD1 (a)'s contrary line corrected); ADR-0042 obliges a token decision before the ladder (new LD15) and the consent sheet's revision; 6.37b's AC11 annotation's conflict put to BigDev (new LD17). Design: a stopped ladder RELEASES its origin and the mapping reaches every undelivered row of a concluded epoch (else a mark-switch round trip left a reported failure counting as reached); the mapping is applied in TS (⛔ a row-multiplying JOIN, ⛔ `=` on a hash); the push carries a late `ladder_escalation` through an un-pushed item query ("the next morning's push" could never list it); the certificate stop composes extracted sub-predicates over the ORIGIN run (`planCertificateRun` judges only the open run) and gains `not_a_recipient` / `letter_delivered`; the keyed store's "mismatch refusal" (⛔ such thing) replaced by its real replay semantics; T24 — the `canReadAcrossPariwars` guard; the one-a-day check counts in-flight rows; a failed hash and a scheduled day that never sent are specified; the certificate escalation `no_target` and written while paused; the certificate list shows a running ladder after its run ends; the microcopy `report` term (T18); LD7's tie-break; RLS policy files, the no-decision fences, the certificate lockstep legs, the audit prefix, the 68 → 69 key count. Cites re-derived at the pin (the header's old shift table removed — it was wrong past line ≈ 436). The deferred items routed to this row (the `readSmsSendDeliveries` bound, the shared `received_at`, the `-354` carrier, the ADR-0042 restatement) are now in the rulings table and Task 10. A fresh-context re-validate of this rewrite (footgun #22) found 2 HIGH / 3 MEDIUM / 8 LOW in the pass's OWN edits — all applied: the feature-flag mechanism it first recommended is barred (prohibited root + Trustee attestation) ⇒ an env var; "a stopped ladder releases its origin" would re-send a stopped ladder's steps after a lifted stop (four extra texts) and was unneeded (LD6 maps the earlier row) ⇒ the origin is kept, the UNIQUE unconditional; I4 / AC4 / the Policy meaning narrowed to an epoch with ⛔ concluded ladder; Task 10's nominee-gate closure split (call half here, WhatsApp half 6-37d); LD9's push query keyed on the latest PREVIOUS-day `staff_push`; one alarm name; `-354` decision 2's disclosure already stands in the proposal; AC3's LD17 qualifier; two cites; the header's (6.37b) marker; LD7's "only consumer TODAY"; AC14 added for Task 10. A second round (0 HIGH / 4 MEDIUM / 5 LOW, all applied): jobs has ⛔ config module — the env var is read in `apps/jobs/src/boot.ts` and passed through deps; the staff-view `ask` gets the same boolean through the api DTO handlers; "COVERED" defined (origin `created_at` … `ended_at`) so a lifted stop starts ⛔ ladder from a covered row and "the NEXT failure" holds; LD9 (iii) carried into Task 4.2 / 4.3 (an open run's push rides the chase's own `todays` query); the stopped-ladder gap disclosed; the pack pointer is OWED (⛔ already there); status words. |
| 2026-10-18 | 1.3 | Task 0 DONE. BigDev's answers recorded as `2026-10-18-355` (author-commit, committed alone `d93b7c75`; the review-added disclosures confirmed by BigDev before insertion). Records: new sprint row `6-37d-claim-contact-whatsapp-step: backlog`; roster Row 34 `claim-contact-nominee-call-basis` and dated notes on Rows 18, 26, 32 (9.1), 33 (7); ADR-0042's dated note (the bound restated, the static token kept); the consent sheet §1–§2, the §3.4 proposal (five phrases → row 6-37d) and the Panel pack (items 4 — the PQ1–PQ3 routing note — and 5 — `-354` d4 (c)'s alarm correction; the `-354` d2 pointer; the head line) revised before presentation; the routing note and the counsel question written, ⛔ sent; deferred-work (`delivered_at` resolved by `-355` d13; the ADR item addressed; pre-rebase SHAs annotated); `epics.md` dated note. Status → `in-progress` (ledger 2026-10-18d). |
| 2026-10-18 | 1.4 | `2026-10-18-356` (Trustee-ratified, DR + KB, relayed by BigDev: *"drop WhatsApp only notification for nominee"*; scope in BigDev's words: *"WhatsApp can be in future if nominee has opted to receive the notification, or a case where nominee and claimant is same"*) — a dated header note only: this row's build is unchanged (it sends no WhatsApp); the nominee's WhatsApp step, G2 and G1's WhatsApp half leave row 6-37d; the §3.4 amendment NARROWED to the claimant (still Panel pack item 1); a nominee's ladder records `skipped:nominee_no_whatsapp`; Task 10's carrier (c) WhatsApp half marked superseded; the counsel question's part 2 asks about calls only (ledger 2026-10-18e). ⚠ *Dated 2026-10-18 (code review round 2):* "this row's build is unchanged" is inexact — the build gains one persisted value, `skipped:nominee_no_whatsapp` (`ladderWhatsappStep(role)`), for a nominee's WhatsApp step. |
| 2026-10-18 | 1.5 | The Panel sitting (`-357` – `-360`, committed alone `4c09d2a3`): PQ1–PQ3 RULED as our readings (`-360`) — the row's "not `done` until ruled" gate discharged; pack item 5 told (`-354` d4 (c) discharged); the §3.4 claimant exception approved (`-357`, applied to architecture §3.4 / ADR-0029); ADR-0042 ratified (`-358` — roster Row 33 (a) met). Dated notes in the header and the PQ section only (ledger 2026-10-18f). |
| 2026-10-18 | 1.6 | `bmad-dev-story 6.37c` — Tasks 1–10 DONE. Migration 0169 (`claim_contact_ladders`, `claim_contact_calls`, `ladder_sms` / `ladder_escalation` on both send tables; :5433 only); the B1 mapping inside both chase readers (READ-time, I2), LD7's MIN found-dead date, D22's ladder SMS / call reach and `closure.ladder_running`; the extracted stops (`correctionFamilyStopReason` + `closure_closed`, the certificate sub-predicates composed over the origin run); the ladder engine (pure rules, leaf reads, the record, the jobs sweep + two children; the push carries the ask; a reached call stops a concluded person's asks); 6.37b's `cr` AND `ce` filters widened; the call record (idempotent POST, step-up reveal, audit, LD11's ONE switch read by api and jobs, the human-actor gate); both staff views + the admin panels and call form; the alarms and the daily line; deferred-work dispositions + a new section. Deviations and readings in Debug Log (b). Ci:local on :5433: every job green but integration-tests — its domain run 386/392 files (6 test timeouts under load, re-run alone 6/6, 60/60); the job stops after domain, so the other seven packages ran as the same command with --continue: queue, events, niyamavali-engine, channels, validity-service green, jobs 66/66 (1161), api 23 files hit vitest worker transform timeouts — re-run alone 174/174 (1981). Status → `review` (ledger 2026-10-18i). |
| 2026-10-18 | 1.7 | `bmad-code-review` — whole branch (`main..HEAD` @ `99644db0`, 104 files / 11565+/244-), 4 chunks (ladder-primitive / chase-integration+jobs / contracts-api-admin / governance-records) × 3 layers (Blind Hunter, Edge Case Hunter, Acceptance Auditor), 12 parallel reviewers (one Blind Hunter retried after a stall). 84 raw findings → 11 decision-needed, 43 patch (6 absorbed from resolved decisions), 18 defer, 9 dismissed (several confirmed false positives from a reviewer's single-chunk blindness — a burst-threshold constant, a no-caller read function, a schema asymmetry, a missing migration — each verified against the live worktree before dismissal). All 11 decisions resolved by BigDev: retries now re-check `ladderStepGate`; the multi-item staff push and the unrecognized-ask-detail fallback fail loud / describe generically instead of defaulting permissively; `CLAIM_NOMINEE_CALLS_CLEARED` reads through one shared domain-exported name + parser (`CLAIM_NOMINEE_CALLS_CLEARED_ENV_VAR` / `parseNomineeCallsClearedFlag`) instead of two independent env reads; ladder/call attribution now scopes to the claim's live return via `liveReturnIdFor`; LD10(a)'s permission-key reuse and the role-inference fallback feeding G1 kept as already-sound; the Row 34 undefined-"escalate" case and the migration/decision-numbering race routed to BigDev / deferred as process items; the call form's post-end availability confirmed intentional (a comment only). Applied in 4 parallel forks over disjoint files + D5 handled centrally. The `-356` nominee-WhatsApp correction (STATUS block + PQ section only, per v1.4/1.5) left FOUR stale spots fixed here: this story's rulings table, F19, AC1/LD1's prose, and the new routing note's "Not yet sent" banner. ⭐ The fix diff (32 files, 644+/116-) was itself adversarially re-reviewed (Blind Hunter + Edge Case Hunter): two real bugs caught and fixed — P29's `ask==='none'` guard was a no-op (`follow_up !== null` was already true whenever `ask` was set, since `ask` is only ever set once `follow_up.state === 'concluded'`; corrected to exclude the `concluded` state from the first clause, with new regression tests pinning it in both admin surfaces) and the Idempotency-Key length check reused the missing-key error code (split, + a 200/201-char boundary test). One residual accepted as a pre-existing, codebase-wide tradeoff (not fixable in this one handler): a `recordResult` failure after commit can still eventually double-write past the keyed store's 24h TTL — deferred. `ci:local` on :5433 green, all 36 jobs, confirmed TWICE (once after the patch wave, once after the fix-diff corrections) — including the one assertion (`contact-call.spec.ts`'s `reached_needs_answer` reachability after removing the duplicate Zod-level check) a parallel fork couldn't confirm itself. Status → `done` (ledger 2026-10-18j). |
| 2026-10-18 | 1.8 | `bmad-code-review` ROUND 2 — whole branch (`main...HEAD` @ `b2aa00ff`, 105 files / 12206+/251-), the same 4 chunks × 3 layers, 12 parallel read-only reviewers, findings verified against the worktree (several diff-only HIGH claims false). 2 decision-needed → `2026-10-18-363` (author-commit, committed alone `39b52757`: D1 (a) one reached-call rule — `called_on ≥` the concluded ladder's origin; D2 (a) three staff lines reworded); 39 patch — 38 applied in 4 parallel forks over disjoint files, P27 deferred (W15); 20 defer; 30 dismissed. Headline fixes: migration 0169 had been APPLIED to :5433 then edited by round 1 (its "unapplied" record false) ⇒ restored as applied + idempotent 0170 (the row-id CHECKs, concluded ⇒ steps resolved, the call FK ON DELETE SET NULL); ADR-0042, the Panel pack and the consent sheet restored to their ratified / presented text with dated notes; P1 a new number's failed text could never start a ladder; the call form (Enter in the OTP box saved; the confirmation lost on unmount; an edited retry replayed the first call; the audit lost on a `recordResult` failure; an OTP spent before a nominee refusal); `CLAIM_NOMINEE_CALLS_CLEARED` in compose; AC2 / AC4 / AC7 / family-3 legs. The fix diff re-reviewed in fresh context (0 H / 6 M / ~20 L — P17's `giveUp` conflation, P32's log content, P21, a `-363` leg that could not fail (now proven red under two mutants), P24's view half, all applied by a fifth fork + records centrally). ci:local on :5433 (see the ledger 2026-10-18k). Status `done`. |
| 2026-10-19 | 1.9 | Code review round 2 — the 2nd fix-diff pass: fork E's corrections reviewed in fresh context (1 H / 3 M): the P21 no-number branch now finalises `no_target` as LD3 and the correction child (⛔ a stranded `attempting` row); step-2 un-send under a resolved step 3; the call form's late refusal and re-offer status. W21, W22 deferred (ledger 2026-10-19a). |
