// packages/domain/src/nominee-console/takeover.ts
//
// Staff-takeover-by-day-N — the PURE eligibility derivation (Story 9.1, Task 3 / AC3).
//
// "Donors never see false-yellow forever because a human silently picked up the work" (UX spec L121).
// When a bereaved nominee disengages from daily reconciliation for ≥ N days, the case is flagged for
// District-Admin takeover (into the Story 9.8 reconciliation review queue) and the console renders the
// grey "staff is helping" state. This module owns ONLY the derivation — a total, pure function of its
// inputs — never the writer, the queue render, or the admin console.
//
// ── PURE + replay-deterministic (AC3, the load-bearing property) ────────────────────────────────────────
// `now` is INJECTED — there is NO wall-clock read inside the pure core. Given the same
// `{ lastEngagedAt, poolOpenAt, thresholdDays, now }` it returns the same verdict forever, so a replay
// (or a unit test with frozen vectors) is identity. Same discipline as the pool-assignment version-pinned
// replay-identity ([[project_pool_assignment_engine]]) and the Yogdaan status pure-derivation
// ([[project_yogdaan_status_derivation_convention]]).
//
// ── clock-from-pool-open while the engagement WRITER is deferred (AC3) ──────────────────────────────────
// The engagement signal (a nominee's daily upload) is Story 9.3 — UNBUILT. So `last_engaged_at` has no
// writer yet. Rather than block, the day-N clock runs from `pool_open_at`:
// `effectiveLastEngagedAt = lastEngagedAt ?? poolOpenAt`. This is NOT a stopgap — it is CORRECT: a
// nominee who never engages should be flagged for takeover N days after the pool opens. Story 9.3 later
// adds the reset-on-upload writer that pushes `lastEngagedAt` forward, and this derivation consumes it
// with ZERO change (the `?? poolOpenAt` fall-through simply stops firing once a real timestamp exists).
//
// ── grey state is NEUTRAL "on record", never blame (AC3) ────────────────────────────────────────────────
// A `takeoverEligible` verdict drives a strictly-neutral grey console state ("staff is helping with
// today's uploads"), never "you failed / you're behind" — the grey-neutrality convention from
// [[project_yogdaan_status_derivation_convention]] (grey = neutral, never missed/failed).
//
// ── the flag is a RESERVED SEAM for Story 9.8 (no live consumer today) ──────────────────────────────────
// `takeoverEligible` IS the derivation the 9.8 reconciliation review queue consumes (run over the live
// pools, the eligible ones are the takeover work-list). 9.8 is unbuilt, so 9.1 raises the flag against the
// shape 9.8 will read — no standalone District-Admin surface, no event emitted (an event needs a live
// writer/consumer; the derivation-as-read is the honest reserved-seam shape). See the module README-style
// note in nominee-console/index.ts.

/**
 * The default staff-takeover threshold — N days of nominee disengagement before the case is flagged.
 *
 * CONFIGURABLE, not a magic literal (respects the FM-14 token/magic-number governance the microcopy gate
 * enforces): callers pass `thresholdDays` explicitly; this is the ONE default they fall back to. Homed as
 * a named domain constant so a single edit re-tunes every consumer, and a test can pin the boundary
 * against the same value the runtime uses (no drift between "the default" and "the tested default").
 */
export const DEFAULT_STAFF_TAKEOVER_THRESHOLD_DAYS = 7;

/** Milliseconds in one 24-hour day — the deterministic day unit (no DST/timezone dependence in the pure core). */
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * The inputs to the staff-takeover derivation. All timestamps are `Date`s; `now` is injected (never read
 * inside). `lastEngagedAt` is `null` until the Story 9.3 engagement writer exists (the clock then runs
 * from `poolOpenAt`).
 */
export interface StaffTakeoverInput {
  /** The last time the nominee engaged (reset-on-upload → Story 9.3). `null` today (no writer yet). */
  readonly lastEngagedAt: Date | null;
  /** When the pool opened for contributions (`pool.opened_for_contributions` event timestamp). */
  readonly poolOpenAt: Date;
  /** The disengagement threshold in whole days (default {@link DEFAULT_STAFF_TAKEOVER_THRESHOLD_DAYS}). */
  readonly thresholdDays: number;
  /** The evaluation instant — INJECTED (no wall-clock read inside the pure core). */
  readonly now: Date;
}

/**
 * The staff-takeover verdict — a total function of {@link StaffTakeoverInput}.
 *   · `takeoverEligible`      — has the nominee been disengaged for ≥ `thresholdDays`? (≥, so exactly-N is eligible).
 *   · `daysSinceEngagement`   — whole days since `effectiveLastEngagedAt` (floor; clamped ≥0 under clock skew).
 *   · `effectiveLastEngagedAt` — `lastEngagedAt ?? poolOpenAt` (the clock the verdict is computed against).
 */
export interface StaffTakeoverVerdict {
  readonly takeoverEligible: boolean;
  readonly daysSinceEngagement: number;
  readonly effectiveLastEngagedAt: Date;
}

/**
 * Compute the staff-takeover verdict (AC3). PURE + replay-deterministic — `now` is injected.
 *
 * `effectiveLastEngagedAt = lastEngagedAt ?? poolOpenAt`. Eligibility is `elapsed ≥ thresholdDays` measured
 * in whole 24h days: at EXACTLY the threshold the case is eligible (the boundary is inclusive — a nominee
 * disengaged for precisely N days is flagged). `daysSinceEngagement` clamps to 0 when the effective clock
 * is in the FUTURE relative to `now` (clock skew / a fresh engagement timestamp ahead of the read clock) —
 * never negative, never eligible.
 *
 * @throws if `thresholdDays` is not a finite, non-negative number (a config misconfiguration must fail
 *   loud, not silently flag every nominee for takeover).
 * @throws if `poolOpenAt`, `lastEngagedAt`, or `now` is an Invalid Date (Review fix — an unparseable
 *   timestamp must fail loud too, never silently produce a NaN `daysSinceEngagement`).
 */
export function computeStaffTakeover(input: StaffTakeoverInput): StaffTakeoverVerdict {
  const { lastEngagedAt, poolOpenAt, thresholdDays, now } = input;

  if (!Number.isFinite(thresholdDays) || thresholdDays < 0) {
    throw new Error(
      `[computeStaffTakeover] thresholdDays must be a finite, non-negative number, got: ${String(thresholdDays)}`,
    );
  }
  for (const [label, d] of [
    ['poolOpenAt', poolOpenAt],
    ['now', now],
    ...(lastEngagedAt === null ? [] : [['lastEngagedAt', lastEngagedAt] as const]),
  ] as const) {
    if (Number.isNaN(d.getTime())) {
      throw new Error(`[computeStaffTakeover] ${label} must be a valid Date, got an Invalid Date`);
    }
  }

  const effectiveLastEngagedAt = lastEngagedAt ?? poolOpenAt;
  const elapsedMs = now.getTime() - effectiveLastEngagedAt.getTime();

  // Whole days since engagement, clamped ≥0 (a future effective clock ⇒ 0, never negative).
  const daysSinceEngagement = elapsedMs <= 0 ? 0 : Math.floor(elapsedMs / MS_PER_DAY);

  // Inclusive boundary: disengaged for ≥ thresholdDays ⇒ eligible. Compared in ms (not the floored
  // day count) so the boundary is exact — at precisely thresholdDays*MS_PER_DAY the case flips eligible.
  const takeoverEligible = elapsedMs >= thresholdDays * MS_PER_DAY;

  return { takeoverEligible, daysSinceEngagement, effectiveLastEngagedAt };
}
