// The staged fixed-amount transition on the My Pool card — the PURE stage selector. Story 8.15 (Task 2;
// AC1, D1–D7). UX-DR25, guaranteed by policy by Decision `2026-08-16-124` cl.1–2.
//
// The card tells a member, in stages, that the per-pool contribution is going to change: the date and
// the new amount, then "from next month", then (if the change lands inside an open pool) "from the next
// cycle", then a note on the first pool at the new amount, and after that nothing. The SERVER decides the
// stage here; the client renders it (8.2 D2 — "the client resolves nothing").
//
// ── Calendar months in IST, ⛔ never cycles (D2) ─────────────────────────────────────────────────────
// A cycle is a trustee-committed `cycle_freeze_commits` row with no cadence, so no copy may count cycles
// ("3 चक्र बाद" would be a guess presented as a fact). The stages are anchored to the IST calendar month
// of `effective_from`: distance 1 → `next_month`; otherwise (0 or ≥ 2) → `scheduled`, dated. At the
// 90-day notice floor a change is ≥ 2 IST months away on the day it is scheduled, so the dated stage
// fires on announcement. IST parts come from `istCalendarDate`/`istDateOf` — ⛔ never `getMonth()`.
//
// ── Emergency changes (Decision `2026-10-22-383`, PQ1 = B) ──────────────────────────────────────────
// An emergency change is shown as plain facts only: dated when set ahead, `next_cycle` when it lands
// inside an open pool, the first-cycle note after. ⛔ NEVER `next_month` — that stage implies a notice
// the emergency path does not give (`-124` cl.2: "no stages" read as "no notice-implying stages").
//
// ⛔ Not in `@twt/contracts` (D1): no push or notification mentions a transition. The API handler maps
// this union to the contract EXPLICITLY.

import { istCalendarDate, istDateOf } from '../cycle-calendar/holiday-resolver.js';
import type { PoolFixedAmountScheduleRow } from '../schema/pool_fixed_amount_schedule.js';

/** The resolved stage. `effectiveOn` is an IST calendar date (`YYYY-MM-DD`), ⛔ never an instant. */
export type FixedAmountTransition =
  | { readonly stage: 'scheduled' | 'next_month'; readonly effectiveOn: string; readonly newAmount: number }
  | { readonly stage: 'next_cycle'; readonly newAmount: number }
  | { readonly stage: 'first_cycle' };

export interface FixedAmountTransitionInput {
  /** The live pool's SNAPSHOTTED amount — the amount the member is asked to pay (8.2 D3). */
  readonly poolFixedAmount: number;
  /** The live pool's cycle `committed_at` (C). */
  readonly poolCommittedAt: Date;
  /** The request instant — labels the stage only (D9). */
  readonly now: Date;
  /** The nearest qualifying schedule row after C (`resolveUpcomingFixedAmountChange` as of C, D3). */
  readonly upcoming: {
    readonly effectiveFrom: Date;
    readonly fixedAmount: number;
    readonly changeType: PoolFixedAmountScheduleRow['changeType'];
  } | null;
  /**
   * The amount IN FORCE at `now` (`resolveEffectiveFixedAmountRow` at `now`; `null` = none resolved).
   * Review D1 (Option A): `next_cycle` is decided from THIS, not from `upcoming` — the next cycle snapshots
   * whatever is in force when it commits, and `upcoming` is only the NEAREST row after C.
   */
  readonly inForceNow: { readonly fixedAmount: number } | null;
  /** The pool is the first cycle under a changed amount (`resolveFirstCycleUnderAmount`, D5). */
  readonly isFirstCycle: boolean;
}

/** IST calendar-month distance from `now` to `at` (`0` = same IST month). */
function istMonthDistance(now: Date, at: Date): number {
  const a = istCalendarDate(at);
  const n = istCalendarDate(now);
  return a.year * 12 + a.month - (n.year * 12 + n.month);
}

/**
 * Every stage EXCEPT `first_cycle`, or `null`. Exported so the handler can skip the (up to three-query)
 * first-cycle read whenever an upcoming stage already wins (Review P3) — the rule itself stays here.
 *
 *  · `next_cycle` (Review D1, Option A): the amount IN FORCE at `now` differs from the pool's snapshot,
 *    so the next cycle will carry it. It names THAT amount. This is the one rule behind three cases the
 *    nearest-row read got wrong or missed: a change inside the live window (Trap 4), TWO changes inside
 *    it (the next cycle carries the LATER one), and a BACKDATED emergency written after the pool spawned
 *    (`effective_from ≤ C`, so the as-of-C read never sees it). If a later change reverts to the pool's
 *    own amount the next cycle is unchanged and nothing is said.
 *  · `scheduled` / `next_month`: a FUTURE row (`effective_from > now`) from the as-of-C read.
 *    A row at or before `now` is already accounted for by `inForceNow` (or is moot), so it is never
 *    announced here.
 */
export function selectUpcomingStage(
  input: Omit<FixedAmountTransitionInput, 'isFirstCycle'>,
): FixedAmountTransition | null {
  const { upcoming, inForceNow } = input;
  if (inForceNow !== null && inForceNow.fixedAmount !== input.poolFixedAmount) {
    return { stage: 'next_cycle', newAmount: inForceNow.fixedAmount };
  }
  // D6: a "change" to the amount the pool already holds is no change for its member. A row at or
  // before C is not this pool's transition (the read is anchored at C; this guards the input).
  if (
    upcoming !== null &&
    upcoming.fixedAmount !== input.poolFixedAmount &&
    upcoming.effectiveFrom.getTime() > input.poolCommittedAt.getTime() &&
    upcoming.effectiveFrom.getTime() > input.now.getTime()
  ) {
    const effectiveOn = istDateOf(upcoming.effectiveFrom);
    if (upcoming.changeType === 'standard' && istMonthDistance(input.now, upcoming.effectiveFrom) === 1) {
      return { stage: 'next_month', effectiveOn, newAmount: upcoming.fixedAmount };
    }
    return { stage: 'scheduled', effectiveOn, newAmount: upcoming.fixedAmount };
  }
  return null;
}

/**
 * The single transition line for the My Pool card, or `null`. Precedence (D7): `next_cycle` >
 * `next_month` > `scheduled` > `first_cycle` > `null` — an upcoming change always wins over the
 * first-cycle note, and at most one stage is returned.
 */
export function selectFixedAmountTransition(input: FixedAmountTransitionInput): FixedAmountTransition | null {
  return selectUpcomingStage(input) ?? (input.isFirstCycle ? { stage: 'first_cycle' } : null);
}
