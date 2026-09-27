---
baseline_commit: c136b03c
---

<!--
SPLIT FROM Story 6.19 v0.9 on 2026-09-27 (D13) — the CC1 item (`-236` CC1, carried to 6.19 by `-241` §3 and `-244` 6.21a D16).
⭐ STATUS `backlog`, DELIBERATELY: its schedule, channels and letters are UNRULED (CC1 protection 3), and the §0 gate run on 2026-09-27 found
them the Panel's. The routing note is `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-09-27-6-19d-replacement-certificate-reminder.md`
(drafted, ⛔ not sent). ⛔ Do not write ACs for the schedule until it is answered — re-run bmad-create-story then.
The shared spec `6-19-correction-return-reminders-and-closure.md` is part of this story.
-->

# Story 6.19d: The Reminder for a Replacement Death Certificate — ⛔ Never a Deadline, ⛔ Never a Closure `[SURFACE]`

Status: backlog

> ⭐ **A go-live coupling of Story 6.21a** (`epics.md` §6.21a: *"Go-live couplings … (2) 6.19's CC1 reminder"*) — 6.21a must not go live
> without this. ⛔ Nothing is live today.
> ⛔ **Fenced on its routing note** (protection 3). Depends on 6.19a (the contact record) and 6.19b (the SMS path and the reminder record), both
> of which it will most likely reuse — ⛔ but whether it reuses the correction **schedule** is exactly the Panel's question.

## What CC1 says, and the three protections that bind it (verbatim)

**CC1** (`-236`, our default, ⛔ not the Panel's words; it stands unless objected): *"A time limit for the replacement certificate. Our default:
**none** — the claim simply waits, chased by the reminders of Story 6.19 (a claim is never refused for a missing certificate)."*
1. ⭐ ***"a claim is never refused for a missing certificate"*** — and `-236` BB: *"family will be asked to produce certificate with clear date
   without the claim being denied."*
2. ⛔ ***"the `-229`…`-232` day-90 closure does NOT apply to a certificate wait."***
3. ⚠ ***"the certificate reminder's schedule and channels (incl. letters for a dead number) are UNRULED — 6.19 runs §0 on them."*** ⇒ §0 run
   2026-09-27: **the Panel's** (it fixes what messages a family receives, and whether the Trust writes to them by post — the ground `-250` gave
   for this story's own schedule). ⇒ the routing note above.

**The trigger (6.21a D16, built):** `isDeathCertificateReplacementRequested(db, pariwarId, claimCaseId)`
(`packages/domain/src/claim/death-certificate-approval.ts:223`) — true only in the review window with a current `rejected` certificate. ⚠ The
family status also has `missing` (no certificate), widened by `-247` §2 to the two pre-verification states — whether `missing` is chased is part
of the note.

## 📜 Policy meaning (AI-10-1)

⭐ **This story introduces ⛔ no predicate that gates a member's claim** — its one binding rule is a **negative** (a certificate wait is ⛔ never
refused, closed or given a time limit), which protects the benefit rather than gating it. ⚠ If the Panel's answer adds any condition on the claim
(e.g. a hold after N reminders), re-run this check.

## Acceptance Criteria

### AC12 — CC1: the replacement-certificate reminder (`-236` CC1, `-241` §3, `-244`) — ⛔ FENCED on its routing note
**Given** its routing note is answered (§0 in this pass: the Panel's) **and** `isDeathCertificateReplacementRequested` is true
**Then** the family is reminded to send a certificate with a clear date on **the schedule and channels the Panel rules** (protection 3); **and**
the claim is ⛔ **never** refused, closed or denied for a missing certificate (protections 1–2) — a test proves the day-90 closure cannot run on a
certificate wait; **and** ⛔ no time limit is imposed.

## Tasks / Subtasks

- [ ] **Task 0 — Route and wait** — send the routing note (BigDev); transcribe the ruling into the note's ⏳ block and `.decision-log.md`; then **re-run `bmad-create-story` on this row** to derive the schedule / channel / letter ACs and flip it to `ready-for-dev`. ⛔ No code before.
- [ ] **Task 1 — (after the ruling)** Build the reminder on `isDeathCertificateReplacementRequested` (and on `missing`, if ruled), on the schedule and channels the Panel rules.
- [ ] **Task 2 — The negative, proved** — a test that ⛔ no closure, refusal or denial path runs on a certificate wait (6.19c's closure request 409s on a claim with no live return), and that ⛔ no time limit exists.

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

## Change Log

| Version | Date | Change |
|---|---|---|
| v1.0 | 2026-09-27 | Split from Story 6.19 v0.9 (D13). AC12 carried verbatim; the CC1 section re-homed. `backlog` — fenced on its routing note (drafted 2026-09-27, unsent). |
