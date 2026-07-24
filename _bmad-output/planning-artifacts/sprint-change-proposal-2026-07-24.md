# Sprint Change Proposal — Story 8.9 Scope Correction (drafting-error resolution)

- **Date:** 2026-07-24
- **Author:** BigDev (via bmad-create-story validate pass)
- **Trigger:** Story 8.9 context-file creation surfaced that the epics.md AC prose for Story 8.9 contradicts FR-22 and its own UX-DR77 anchor
- **Change scope classification:** **Minor** (epics.md correction note + story reframing; no PRD/architecture amendment, no new story)
- **Mode:** Single-decision

---

## Section 1 — Issue Summary

`epics.md:3011-3023` (Story 8.9, "Calendar-Aware Close-of-Cycle Timing") reads as if the contribution close date itself moves: *"when a cycle's default close date (Day 15) lands within a holiday window, the close is extended... only the time-window when contributions are accepted"* (`epics.md:3022-3023`).

This directly contradicts three higher-authority sources that were never updated to match:

| Source | What it says | Ref |
| --- | --- | --- |
| FR-22 (PRD — alert state machine) | `live → closed`: hard close at Day 15 | `prd.md:524,531` |
| UX-DR77 anchor (the DR Story 8.9 realizes) | "Day 15 mechanical close; reconciliation tail 1-2 days normal, 5-7 days on Bihar holiday windows... Per-Pariwar holiday windows configurable" | `epics.md:477` |
| UX spec — Sushil journey | "Day 15 (alert close) is mechanically hard per FR-22, but reconciliation tail extends a calendar-aware window beyond it" | `ux-design-specification.md:995-1003` |

**Compounding factor:** Story 8.8 (merged `75b8e9b`, days before this correction) was written under the *old* (uncorrected) reading — its own AC2 text says *"Story 8.9 (calendar-aware close-of-cycle) replaces both together"*, and it left forward-looking code comments at `contribution-loop-templates.ts:34-37,48-49` and `contribution-notify-triggers.ts:810-811` asserting 8.9 will **replace** the fixed contribution window. Those comments are real, recent, and contradict this correction — they are not stale drift, they're the previous (incorrect) scope understanding made concrete in code. This proposal supersedes them.

---

## Section 2 — Impact Analysis

- **Epic 8 (host, in-flight):** No change to the shipped alert lifecycle (Story 8.1), `CYCLE_WINDOW_DAYS`, `computeDaysRemaining`, the My Pool card window, or the deadline-reminder sweep. Story 8.9 narrows from "window-extension" to "reconciliation-tail substrate + declared seams."
- **Story 8.8 (done):** Its AC2 text and the two code comments it left become historically inaccurate forward-references. Not reopened; Story 8.9 corrects the comments as part of its own AC3 (revert-sanity fenced — the window math itself is untouched, only comment text changes).
- **Epic 9 (Reconciliation Engine, backlog):** Gains the real first live caller for the reconciliation-tail-window contract seam (matcher-tail timing) that Story 8.9 declares but does not wire.
- **Epic 11b (backlog):** Gains the real first live caller for the holiday-aware Sahyog Vivran auto-publish gate (`epics.md:3808,3855`, Story 11b.3) — **not** Epic 9, which was Story 8.9's first-draft misattribution. Epic 9 supplies the underlying `contribution.confirmed`/matcher events; Epic 11b's publish gate is the actual holiday-aware consumer.
- **No PRD/architecture/UX amendment required** — FR-22 and UX-DR77 are already correct; only `epics.md`'s AC prose for 8.9 itself was wrong.

## Section 3 — Recommended Approach

**Option 1 — Direct Adjustment (epics.md correction note + reframed story), CHOSEN.**

Story 8.9 ships the substrate BigDev decision (b) describes below, not a window-extension:
1. Per-Pariwar effective-dated `pariwar_holiday_calendar` registry (modeled on Story 7.5's `pool_fixed_amount_schedule`).
2. A pure, DB-free holiday resolver in `@twt/domain` (`isHolidayDate` / `nextNonHolidayDate` / `reconciliationTailDeadline`), outside `packages/domain/src/pool/` to avoid the pool support-category invariant gate's `pool/`-scoped scan (`scripts/pool-support-category-invariant/check.ts`).
3. A reconciliation-tail-window contract seam in `@twt/contracts` — declared, no live caller yet. First live callers: **Epic 9** (matcher-tail scheduler) and **Epic 11b Story 11b.3** (Sahyog Vivran auto-publish gate) — two separate future consumers, not one.
4. Member-facing empathy copy seam (i18n `contribution`, en+hi) — consumed live by Epic 9/FR-19 close-of-cycle framing.

The Day-15 hard close (FR-22), the alert lifecycle (8.1), and the D5 contribution-window seam are unchanged.

**Confirmed decision (BigDev, 2026-07-24):** Ratify Option 1 as above. Correct `epics.md:3011-3023` with an inline note (not a silent rewrite — the original AC prose is preserved for history, flagged as superseded) so a future story-creation pass reading the epic fresh sees the correction, not just the story file.

---

## Section 4 — Detailed Change Proposals

### 4a — epics.md correction note (applied)
Insert a callout immediately above Story 8.9's AC block (`epics.md:3017`, before "**Acceptance Criteria:**") pointing to this proposal and stating the AC3 sentence ("only the time-window when contributions are accepted") is superseded — the close date does not move; only reconciliation-tail timing does.

### 4b — Story 8.9 file corrections (applied)
- Banner cites this proposal file as the record of ratification, not just an in-story assertion.
- AC4 splits consumer attribution: Epic 9 (matcher-tail scheduler) vs. Epic 11b Story 11b.3 (Sahyog Vivran auto-publish gate).
- AC6/Dev Notes gate rationale corrected: only the **pool support-category** invariant gate is `pool/`-scoped; the pool **state** invariant gate scans all of `packages/domain/src` and is a non-issue for an unrelated reason (no `pools.current_state` write pattern), not directory placement.

---

## Section 5 — Implementation Handoff

- **Scope classification:** Minor → no PM/Architect sign-off required (PRD/UX/architecture already correct; only epics.md's own drafting error is being flagged).
- **Sequencing:** No change — Story 8.9 remains next in Epic 8.
- **Success criteria:** epics.md carries a visible correction note; Story 8.9's file matches this proposal's scope exactly; Story 8.8's forward-reference comments are corrected as part of 8.9 AC3 (not reopened as their own story).
