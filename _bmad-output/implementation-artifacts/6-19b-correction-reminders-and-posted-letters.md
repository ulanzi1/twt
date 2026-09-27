---
baseline_commit: c136b03c
---

<!--
SPLIT FROM Story 6.19 v0.9 on 2026-09-27 (BigDev: "split it three ways") — D13. The set: 6.19a → 6.19b (this file) → 6.19c; 6.19d (CC1)
`backlog`. AC numbers KEPT from 6.19 v0.9; AC8/AC9/AC11 restated per slice.
⭐ THE SHARED SPEC IS PART OF THIS STORY: `6-19-correction-return-reminders-and-closure.md` — rulings, invariants, *What already EXISTS*
(re-verified on `c136b03c`), traps T1–T14, author decisions D1–D24. ⛔ Do not start without reading it end to end.
GLYPH REGISTER: `⛔` only on a negation word; `⭐` key fact; `⚠` hazard. ⛔ No `file:NNN` into `.decision-log.md`, `deferred-work.md` or
`sprint-status.yaml`.
-->

# Story 6.19b: The Correction-Return Reminders — the Panel's Schedule, the Text Message to Each Person, the Staff Chase and the Posted Letter `[SURFACE]`

Status: ready-for-dev

> ⛔ **Start only when 6.19a is `done`** (its contact table is this slice's recipient list and letter address book) **and** 6.19a's Task 0
> author-commit (D1–D24, the six keys) has landed.
> ⭐ **The family SMS is go-live gated on counsel** (M, S) and cannot send for real until the DLT templates are registered (T13) — a missing
> template id fails **closed**. ⛔ Neither blocks the build.
> ⭐ **6.18 must still not go live without 6.19c** — this slice chases; only 6.19c lets a chased claim end.

## Read first — the parts of the shared spec this slice depends on

- **Rulings:** ⭐ **`-258` (who must act — AC16)**, `-229`, `-230` 1–4, `-231` C/D/E/F, `-232` I/J, `-250` #1–#5, `-252` cl.1–2, `-253` cl.3, `-255` F5/F6/F7.
- **Invariants:** 1 (the system never decides), 3 (never `delivered` for an accepted send), 4 (no name in a family message).
- **What already EXISTS:** *The return*, *Helpers* (`resolveClaimCorrectionState`), *The dispatch substrate* (⭐ the DLT registry excludes `alert_published`), *The scheduler analogues*, *Staff recipients*, *The District Admin's correction queue*, *District keys*, *Documents*, *Audit*.
- **Traps:** T1, T5, T6, T7, T12, T13, T14.
- **Decisions:** D2, D3, D4, D6, D7, D8 (keys **1 and 7** are minted here), D10, D11, D20, D21, ⭐ **D25, D26, D28**.

## Story

As the **District Admin** (with the **Pariwar Admin** above me), I want a claim sent back for a bank-name correction to be **chased on the
Panel's fixed schedule** — a text message to each person the family agreed may be contacted, a reminder to me on the same days, a flag when
someone's phone is dead or unreachable, and a short form to **record the letter I post** to that person — so that every attempt to reach the
family is **on the record** before anyone can ask for the claim to be closed.

## 📜 Policy meaning (AI-10-1)

⭐ **This slice introduces ⛔ no predicate that gates a member's access to a benefit.** ⚠ (`-258`) It **records** the mark that 6.19c's closure predicate reads (a claim can be closed for no response only when the family must act) and sets the family's day 0 — the predicate itself, and its note, are 6.19c's. It sends, records and flags; ⛔ nothing it computes
blocks, approves, refuses or closes a claim. The one predicate built on its records — *"each person was reached"* (D22) — gates the closure
**request** and is built and noted in **6.19c**. ⚠ One thing here does change what a person **receives**: an SMS to someone outside the app
(`-255` F7) — the Panel's own widening, recorded with its costs, go-live gated on counsel.

## Acceptance Criteria

### AC2 — The clock and the schedule (`-229`, `-230` 2/4, `-250` #5)
**Given** a live `correction_return` row **Then** its run starts at `istDateOf(decidedAt)`; a **second return is a new row and a new run**
**And** a **pure** `correctionReminderSchedule(day0)` returns the Panel's slots from a data table (D3), injectable clock; every boundary tested
(day 1, day 84, day 89, day 90, a return decided at 23:59 IST and at 00:01 IST)
**And** the run stops per D4 (superseded, resubmitted, day 90) — computed through `resolveClaimCorrectionState`, ⛔ never re-derived
**And** the sweep (daily 10:00 IST) is idempotent under at-least-once redelivery: a child job per `(run, slot, recipient)`, a per-entity
try/catch, a bounded batch that alarms at its cap, the child throwing on `error` so pg-boss retries
**And** a reminder row is written `attempting` **before** the send and moved to its final state **after**; a row stuck in `attempting` past a
timeout is retried — ⛔ a crash between the insert and the send leaves neither a phantom "sent" nor a blocked slot; the catch-up rule of D3 holds.

### AC3 — The reminder record and the family message (`-230` 1/3, `-252`, `-253` cl.3, `-255` F6/F7)
**Given** a slot is due **Then** each person who must be reached — **each effective nominee**, and the **claimant** when none of them —
covered by the agreement, gets one reminder row and one SMS (D7)
**And** the row records what is known: `accepted`, `rejected_invalid_number`, `no_target` or `error`; `delivered_at` ⭐ **only** from a real
signal (T1); `provider_message_id` kept; ⛔ never reconstructed ([[feedback_record_unattested_no_backfill]])
**And** the SMS is **name-free**: a short non-name claim reference + the helpline number, ⛔ no name, ⛔ no bank detail, ⛔ no reason; **en or hi**
per `contact_locale`, from `claim.json` through the real `t()` (a test resolves the real keys in both locales), matching the registered DLT
content; tone per T6
**And** a missing DLT template id fails **closed**: the row is `error`, an alarm fires, ⛔ never a fixture `accepted` (T13)
**And** a person becomes **letter-eligible** on their first `rejected_invalid_number` or `no_target` (D20) and is shown to the District Admin as
**dead** or **unreachable** with the letter route offered (`-252` cl.2); their reminders stop only when a letter to them has a recorded
delivery (`-250` #1); the marker is **per run**.

### AC4 — Staff reminders and escalation (`-230` 1, `-231` C/F, `-232` I/J, `-250` #2/#3)
**Then** the District Admin (the live shepherd) is reminded on D3's days until D21 replaces them with ONE reminder 30 days after delivery
**And** for each letter-eligible person without a complete letter record, the District Admin is reminded from the **found-dead day**: day 7,
daily through day 12, then **escalated to the Pariwar Admin** — a record and a reminder, ⛔ never an automatic act (AR-63); the **overdue** flag
at 14 days after posting is shown, nothing else
**And** delivery is D11's: the queues show every due item, and ⭐ the correction queue is **linked from the admin nav**; staff push is
best-effort, English, ⛔ no Telegram mirror; each reminder deep-links to the claim in the correction queue.

### AC5 — The posted letter (`-230` 3, `-231` D, `-255` F5, `-250` #3/#4)
**Given** a letter-eligible person **Then** the District Admin (key (1)) records a letter **to that person, at their own address** (read from the
contact record): posting date, **tracking number**, and — within 14 days of posting — the **delivery date** and a **screenshot** (D6); at most two
per person per run; the second due 30 days after the first's recorded delivery (D20)
**And** the address is shown only in the letter form (a gated, audited read)
**And** the record is staff-entered evidence: an un-recorded field is shown as un-recorded, ⛔ never inferred; every write carries its audit line
with the actor's snapshotted display name ([[project_admin_display_name_attribution]]); letters stay recordable after day 90, ⛔ no reminders.

### AC10 — Nothing else moves
**Then** ⛔ no new lifecycle state, ⛔ no new claim event type, ⛔ no new `AlertCategory`, ⛔ no `SMS_DLT_TEMPLATE_REGISTRY` entry;
`voteOnFrozenClaim` and `assertClaimApprovable` behave exactly as today for their existing callers; 6.16's one-journey rule is unchanged;
`-226` cl.1/cl.6 and `-227` cl.2 are unchanged **everywhere except the one Super Admin approve path** (invariant 7); ⛔ nothing is automatic.

### AC16 — Who must act (`-258`; APPENDED 2026-09-27 — ⭐ it CONDITIONS AC2, AC3 and AC4)
**Given** the Pariwar Admin sends a claim back **Then** the return carries a **required** mark — **the family must act** or **staff must put
it right** — written in the same tx as the return (D25; 6.18's cycle-freeze contract + handler gain the field); the **District Admin** may
change it with a **required note** (key (7), district dimension), and every change is recorded (who, when, the note)
**And** the family's reminders (AC3) and the letter track (AC5) run **only while the latest mark is `family`**: day 0 = the return's date, or the
date of the latest change **to** `family` (`-258` detail 1 — a full 90 days from then); a change to `staff` stops the family's reminders at once
**And** while the mark is `staff`, **staff** are chased (D26): the District Admin on D3's days, **escalated to the Pariwar Admin at day 12**
(a record + a reminder, ⛔ no automatic act); the day-90 Super Admin escalation is 6.19c's (AC17)
**And** in a staff case the family gets ⛔ no reminder and the app says *"Your claim is still open — we are checking the bank details"* (en,
ratified; hi reviewed — D28) — ⛔ never "please correct"; `nominee.bank.correction_needed` shows **only** in a family case; the member status
carries ⛔ no note and ⛔ no actor
**And** the queue (AC8b) shows the mark, who set it and when (staff only); the Pariwar Admin's return form requires the choice before submit.

### AC8b — The surfaces (this slice)
**Then** the District Admin's **correction queue** (6.18's — ⛔ no second list) gains per claim: the day count, the next reminder, a
reminder-record summary **per person** (roles only — "nominee 1", "claimant" — ⛔ no names), the dead / unreachable flags, each letter's state
(+ the day-14 **overdue** flag), and the **letter form** (short — NFR-8: usable at ≤ 720p; the address shown only inside it, a gated, audited
read); ⭐ the admin nav **links** to the queue (closes the 6.18 deferred item); the Pariwar Admin sees the letter chases escalated to them
(the same queue, filtered — they hold its read key); staff copy **English-only**
**And** semantic accessibility (family 13): every reachable state (`recorded`, `overdue`, `dead number`, `unreachable`, `escalated`) is
**announced** (`role="status"`/`aria-live`), ⛔ not merely reflected in a prop; every interactive role has a real handler; WCAG AA.

### AC9b — PII and audit posture (this slice)
**Then** an `AuthAuditEventType` entry for each letter write (posting, delivery + screenshot) with `resourceLocator: 'claim:<lower-case
uuid>'`; a live-DB test plants a **tracking number**, a **screenshot** and the recipient's **mobile** (decrypted for the send) as sentinels and
finds them in ⛔ no log, event, audit line, error body or job payload (the child job carries ids, ⛔ never a number); the **virus-scan gap** on the
screenshot is recorded in Dev Notes and `deferred-work.md`, ⛔ not fixed.

### AC11b — The proof (this slice)
**Then** live-DB specs on `twt-test-pg :5433`, **executed**: every slot of the schedule table and its boundaries (day 1, 84, 89, 90; a return at
23:59 and 00:01 IST); a second return restarting the run; the stop predicate (superseded, resubmitted, each alone); **two sweeps racing one slot
→ exactly one send and one record** (two connections); a crash between the reminder insert and the send (neither a phantom "sent" nor a blocked
slot); a late-slot catch-up after an outage (one `late`, older `skipped_superseded`, ⛔ no burst); `delivered_at` **never** set for an accepted
send; a missing DLT template id → `error` + alarm, ⛔ never `accepted`; the SMS body is name-free and matches the registered DLT content in **both**
locales through the real `t()`; letter eligibility from `rejected_invalid_number` and from `no_target`; the chase anchored on the found-dead day
(7 → 12 → escalate), the overdue flag 14 days after posting, the second letter due 30 days after the first's delivery, D21's single replacement
reminder only when every person is letter-eligible and delivered; a person's reminders stop on their letter's recorded delivery (and ⛔ not
before); staff push runs ⛔ no Telegram mirror; key (1) **cross-Pariwar** and **non-human/system-actor** denial; the human-actor gate classifies
the new route file and lists its methods; a `*-shape.spec.ts` for the extended queue read model; `{ timeout: 20000 }` on each new domain live spec.

## Tasks / Subtasks

- [ ] **Task 0 — Preflight** — confirm 6.19a is `done` and its Task 0 author-commit landed; re-verify the shared spec's cited code against HEAD; read the four DLT config keys' status (T13). ⭐ V is RULED (`-258`, option B) — confirm D25–D28 are in 6.19a's author-commit; AC16 conditions every family reminder.
- [ ] **Task 1 — Migrations (next free number after 6.19a's)** (AC2, AC5) — the reminder record (D2) and the letters table (D6), each with its RLS policy file, journal entry and migration-level policy spec (family 5).
- [ ] **Task 2 — The schedule and the record** (AC2, AC3) — the pure `correctionReminderSchedule` + its data table (D3, the Panel's numbers); the record writer (`attempting` → final); the 10:00 IST sweep + child queue (`QUEUE_NAMES`, `boot.ts` registration); the stop predicate through `resolveClaimCorrectionState` (D4); injectable clock everywhere.
- [ ] **Task 3 — The family SMS** (AC3) — the claim-correction SMS template registry (message × locale; config keys per D7) and the direct `createSmsDltProvider` send to the **explicit** number (claimant from the contact record; each nominee from the **effective** declaration version, T12); `providerMessageId` + the classified error on the row; fail-closed on a missing id; the name-free en/hi copy in `claim.json` (microcopy-clean) + the DLT-content lockstep test. ⛔ No `AlertCategory`, ⛔ no `SMS_DLT_TEMPLATE_REGISTRY` entry, ⛔ no `dispatch()` for the family.
- [ ] **Task 4 — Staff reach** (AC4) — the admin directory accessor (`role_grants ⋈ users`; the District Admin = the live shepherd); staff reminders on D3's days; D21's replacement reminder; the letter chase (D20: 7 → 12 → escalate to the Pariwar Admin); admin push via `dispatch()` narrowed to push (`resolvePushTargets(…,'admin',…)`, English, `time_critical:false`, ⛔ not `fanOutAlert`, ⛔ no Telegram); every reminder deep-links to the claim in the queue.
- [ ] **Task 5 — Letters** (AC5) — mint **key (1)** (catalog bump from HEAD's value, counts, `roles.ts`, `permissions.test.ts`, `roles.test.ts`); the letter writer + screenshot handler (port, key prefix, MIME/size before `put`, signed read); the district preHandler (copy `resolveNomineeNameCheckDistrict`); letter eligibility per person (D20); ≤ 2 letters per person per run; recordable after day 90 with ⛔ no reminders; audit lines with the snapshotted display name.
- [ ] **Task 6 — Surfaces** (AC8b) — the queue columns, the letter form, the nav link, the Pariwar Admin's escalated view; family-13 assertions.
- [ ] **Task 7 — Gates and tests** (AC9b, AC11b) — the human-actor gate entry; **execute** on `twt-test-pg :5433`; record the virus-scan gap in `deferred-work.md`.
- [ ] **Task 8 — Who must act** (AC16; `-258`) — the mark table + migration (D25); the required `must_act` field on the Pariwar Admin's return (6.18's `cycle-freeze` decision contract, handler and `CycleFreezeRoute` form — the same tx as the return row); the District Admin's change route (**key (7)**, district preHandler, required note, audit line); family runs vs staff runs (D26) in the sweep and the stop predicate; the staff chase (day 12 → Pariwar Admin); the staff-case member status + copy (D28, en + reviewed hi); tests: a staff-marked return sends the family ⛔ nothing, a switch to `family` opens a run with day 0 = the switch date, a switch to `staff` stops it mid-run, the copy branches, cross-Pariwar / non-human denial on key (7).

## Dev Notes

### Dependency and sequencing
6.19a `done` first. Task 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7. ⭐ 6.19c starts only when this slice is `done` — its closure precondition ("reached",
D22) reads this slice's reminder and letter records, and its closure notice uses this slice's SMS path.

### Files
**UPDATE:** `packages/queue/src/index.ts`, `apps/jobs/src/boot.ts`, the correction-queue read / handler / contract / view
(`correction-queue-read.ts`, `claims.nominee-name-check.{routes,handlers}.ts`, `contracts/src/claims/nominee-name-check.ts`,
`CorrectionQueueRoute.tsx`), the admin nav, `packages/domain/src/rbac/{permissions,roles}.ts` + tests, `apps/api/src/audit/audit-sink.ts`,
`packages/i18n/locales/{en,hi}/claim.json`, `scripts/claim-adjudication-human-actor-invariant/check.ts`.
**NEW:** the reminder-record and letters tables + RLS files; a reminder sweep module beside `contribution-notify-triggers.ts`; the
claim-correction SMS template registry (beside the OTP one — ⚠ it lives outside `packages/channels/src` only if that keeps the frozen
convention; the developer places it and records why); the admin directory accessor; the letter handler + routes.
**⛔ NEVER edit:** `packages/channels/src/{dispatch,render,sms-dlt-registry}.ts`, `AlertCategory`, `claim_documents` / `uploadClaimDocument`.

### Testing standards
As the shared spec's. Exemplars: `apps/jobs/tests/contribution-notify-triggers.test.ts` (mocked deps, `now: () => NOW`),
`apps/jobs/tests/pending-match-idempotency-live.test.ts` (live, own-committing, injected clock), `packages/domain/tests/integration/alert/alert-stream-concurrency.spec.ts` (two connections).

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

## Change Log

| Version | Date | Change |
|---|---|---|
| v1.1 | 2026-09-27 | ⭐ **`-258` (V, option B) appended:** AC16 (the mark, family vs staff runs, the staff-case copy) and Task 8; key (7) minted here. |
| v1.0 | 2026-09-27 | Split from Story 6.19 v0.9 (D13, BigDev: *"split it three ways"*). ACs AC2–AC5 and AC10 carried verbatim; AC8b/AC9b/AC11b restated for this slice; Tasks re-cut. Status `ready-for-dev`, fenced on 6.19a `done`. |
