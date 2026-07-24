// packages/contracts/src/alerts/reconciliation-tail.ts
//
// The reconciliation-tail-window SEAM contract — Story 8.9 (Task 3; AC4).
//
// ⚠ NO LIVE CONSUMER YET. This is a DECLARED SEAM, the Epic-8 convention (cf. Story 8.4's nominee-VPA
// `{available:false}` resolver seam). The two first callers are already known and are DIFFERENT
// stories in DIFFERENT epics, which is precisely why the shape is committed here rather than invented
// twice:
//   · Epic 9, Story 9.x — the matcher-tail scheduler: how long after a cycle's close bank-statement
//     matching is still expected to be settling, before an unmatched contribution is escalated.
//   · Epic 11b, Story 11b.3 — the Sahyog Vivran auto-publish gate: UX-DR77's "Sahyog Vivran
//     auto-publish waits for matching to settle" (epics.md:477,3808,3855).
// Wire either one WITHOUT re-deriving this shape, and delete this notice when the first lands.
//
// ── What a tail window IS (and emphatically is not) ─────────────────────────────────────────────────
// It is POST-CLOSE timing. The member's contribution window closed, HARD, at Day 15 — FR-22's
// `live → closed` transition is mechanical and Story 8.9 leaves it byte-unchanged. (The Story 8.9 AC
// prose in `epics.md:3022` describing an EXTENDED CONTRIBUTION window is a RATIFIED drafting error —
// BigDev, 2026-07-24; see the story banner + sprint-change-proposal-2026-07-24.md.) Do NOT reach for
// this contract to answer "may a member still contribute?" — that is `CYCLE_WINDOW_DAYS` +
// `computeDaysRemaining` in ./contribution-loop-templates.ts, and the two must never be conflated.
//
// ── Where the arithmetic lives ──────────────────────────────────────────────────────────────────────
// The RESOLVER (`reconciliationTailDeadline`, the IST calendar math, the per-Pariwar
// `pariwar_holiday_calendar` reads) is in `@twt/domain`'s `cycleCalendar` namespace. Only the wire
// SHAPE lives here: `@twt/contracts` is a React Native bundle dependency and must never import
// anything pg-touching ([[project_contracts_domain_bundle_boundary]]). The two tail-band constants
// below are therefore a DELIBERATE duplication of the domain defaults, guarded against drift by a
// test-only cross-package assertion (tests/reconciliation-tail.test.ts) — the same discipline as the
// `benefit_mechanism` ↔ `BenefitMechanism` enum mirror.
//
// ── OpenAPI posture ────────────────────────────────────────────────────────────────────────────────
// Internal queue/scheduler seam, NOT an HTTP endpoint → NO `.openapi()` registration, so
// `openapi/v1.yaml` stays byte-identical (the `alerts/` directory posture).

import { z } from 'zod';

/**
 * The normal post-close reconciliation tail in calendar days — UX-DR77's "reconciliation tail 1-2 days
 * normal" (`epics.md:477`), upper bound. Mirrors `@twt/domain` `cycleCalendar.DEFAULT_NORMAL_TAIL_DAYS`.
 */
export const RECONCILIATION_TAIL_NORMAL_DAYS = 2;

/**
 * The ceiling on a holiday-extended tail in calendar days — UX-DR77's "5-7 days on Bihar holiday
 * windows", upper bound. Mirrors `@twt/domain` `cycleCalendar.DEFAULT_MAX_TAIL_DAYS`. A consumer that
 * needs a different band passes it to the domain resolver as DATA; neither number is ever re-typed at
 * a call site (D3).
 */
export const RECONCILIATION_TAIL_MAX_DAYS = 7;

/**
 * The resolved reconciliation-tail window for ONE cycle close.
 *
 *   · `close_at`          — the cycle's `live → closed` instant (ISO-8601). The HARD Day-15 close.
 *   · `tail_deadline_at`  — the instant the tail ENDS, EXCLUSIVE (ISO-8601). The domain resolver emits
 *                           IST midnight opening the day after the deadline day, so a consumer asks
 *                           `now < tail_deadline_at` ("matching is still expected to be settling")
 *                           with no end-of-day off-by-one.
 *   · `extended_by_holiday` — whether a curated holiday window pushed the deadline past the normal tail.
 *   · `holiday_label`     — WHICH observance did (e.g. `'Chhath Puja'`), else `null`. This is the field
 *                           the member-facing empathy copy names, so a delayed match reads as the
 *                           calendar being honored rather than as a failure.
 *
 * `.strict()` (the alerts/ posture): an unknown field is a producer bug, rejected at the boundary
 * rather than carried silently into a scheduler.
 *
 * Two COHERENCE refinements make an incoherent tail unrepresentable rather than merely discouraged:
 * a tail must run FORWARD from its close, and `extended_by_holiday` must agree with `holiday_label`
 * (an extension with nothing to name would leave the copy path with no observance to acknowledge —
 * the exact hole UX-DR77 exists to close; a label on an un-extended tail would invite copy that
 * apologises for a holiday that changed nothing).
 */
export const ReconciliationTailWindow = z
  .object({
    close_at: z.string().datetime(),
    tail_deadline_at: z.string().datetime(),
    extended_by_holiday: z.boolean(),
    holiday_label: z.string().min(1).nullable(),
  })
  .strict()
  .refine((v) => Date.parse(v.tail_deadline_at) > Date.parse(v.close_at), {
    message: 'tail_deadline_at must be strictly after close_at — a reconciliation tail runs forward',
    path: ['tail_deadline_at'],
  })
  .refine((v) => v.extended_by_holiday === (v.holiday_label !== null), {
    message:
      'holiday_label must name the observance when extended_by_holiday is true, and be null otherwise',
    path: ['holiday_label'],
  });

export type ReconciliationTailWindow = z.output<typeof ReconciliationTailWindow>;
