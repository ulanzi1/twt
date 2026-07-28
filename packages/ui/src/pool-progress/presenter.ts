// The `<PoolProgressCard>` presenter — Story 9.12 (Task 2; AC1/AC3/AC4/AC5). The Story 9.6 `status-pill`
// sibling: STRICTLY PURE — `(input) → view-model` and NOTHING else. NO react/react-native import, NO API
// call, NO DB read, NO side-effecting i18n lookup (it emits KEYS), NO palette (it emits a `@twt/tokens` role
// NAME), NO numeral formatting (raw integers out; the render layer applies `formatInr` + Latin numerals at
// the boundary — Story 1.17 / AC5). Same input → same output. Because there is nothing to mock, it is
// asserted with pure unit tests (tests/pool-progress/presenter.test.ts — the anti-widening + confirmed-only
// teeth).
//
// ── The confirmed-only invariant expressed as ARITHMETIC (Decision 3, load-bearing) ─────────────────────
// `amountRaisedInr = confirmedCount × fixedAmount` is the SINGLE canonical definition of "amount raised". It
// is structurally yellow-proof: there is no attested/pending operand in the multiplication, so the figure
// CANNOT be inflated by intent (every confirmed contribution is money at EXACTLY `fixedAmount` — an over/
// under-payment stays a RED `amount_mismatch`, never confirmed; Story 9.5 / 9.11). We never sum a per-event
// confirmed amount (Decision 3).
//
// ── SURFACE a corrupt/impossible figure, never silently render 0 or a falsely-full meter (AC2/AC3) ──────
// Non-integer / negative / non-finite operands THROW (the `classifyAmountMismatchDirection` posture). AND
// `confirmedCount > rosterSize` THROWS — an impossible state (you cannot confirm more contributors than the
// roster holds) that MUST surface at the boundary a developer sees, never be masked by the percentage clamp
// into a falsely-100%-complete public meter (contrast the domain `computePendingAggregate`, which defensively
// clamps an over-count to 0 pending — this presenter deliberately chooses to SURFACE, because a public
// surface showing a falsely-full pool is a worse failure than a thrown error).

import { COLOR_TOKEN_STATUS_CONFIRMED } from './constants.js';
import {
  POOL_PROGRESS_A11Y_KEY,
  POOL_PROGRESS_AMOUNT_RAISED_LABEL_KEY,
  POOL_PROGRESS_DAYS_KEY,
  POOL_PROGRESS_LABEL_KEY,
} from './i18n-keys.js';
import type { PoolProgressCardInput, PoolProgressCardViewModel } from './view-model.js';

/** Throw unless `value` is a non-negative, finite integer (the corrupt-figure-surfaces posture, AC2). */
function assertNonNegativeInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(
      `[derivePoolProgressCardViewModel] ${field} must be a non-negative finite integer (got ${String(value)})`,
    );
  }
}

/**
 * Derive the `<PoolProgressCard>` view-model from confirmed-only pool progress. Pure + synchronous +
 * dependency-free — same `input` in → same view-model out. Throws on a corrupt or impossible figure (AC2);
 * derives `amountRaisedInr` as `confirmedCount × fixedAmount` (Decision 3) and the confirmed-only meter.
 */
export function derivePoolProgressCardViewModel(
  input: PoolProgressCardInput,
): PoolProgressCardViewModel {
  const { pool, confirmedCount, rosterSize, fixedAmount, daysRemaining } = input;

  // Guard every numeric operand — a corrupt figure surfaces as a defect, never silently renders as 0 (AC2).
  assertNonNegativeInteger(confirmedCount, 'confirmedCount');
  assertNonNegativeInteger(rosterSize, 'rosterSize');
  assertNonNegativeInteger(fixedAmount, 'fixedAmount');
  assertNonNegativeInteger(daysRemaining, 'daysRemaining');

  // The impossible-state guard (AC2/AC3): you cannot confirm more contributors than the roster holds. SURFACE
  // it — never let the `min(100, …)` clamp mask it into a falsely-100%-complete meter on a public surface.
  if (confirmedCount > rosterSize) {
    throw new Error(
      `[derivePoolProgressCardViewModel] confirmedCount (${String(confirmedCount)}) cannot exceed ` +
        `rosterSize (${String(rosterSize)}) — an impossible over-count that must surface, never render as full`,
    );
  }

  // Amount raised — the single canonical definition, structurally yellow-proof (Decision 3). Whole INR, same
  // unit as `fixedAmount`; `formatInr` at the render boundary, never here.
  const amountRaisedInr = confirmedCount * fixedAmount;

  // Confirmed-only meter. The `min(100, …)` is rounding-safety ONLY — with a valid `confirmedCount ≤ rosterSize`
  // the rounded percentage never exceeds 100 (the over-count already threw above).
  const confirmedPercentage =
    rosterSize > 0 ? Math.min(100, Math.round((confirmedCount / rosterSize) * 100)) : 0;
  const isComplete = rosterSize > 0 && confirmedCount >= rosterSize;

  return {
    pool,
    confirmedCount,
    rosterSize,
    amountRaisedInr,
    fixedAmount,
    daysRemaining,
    confirmedPercentage,
    isComplete,
    meterFillTokenRole: COLOR_TOKEN_STATUS_CONFIRMED,
    progressLabelKey: POOL_PROGRESS_LABEL_KEY,
    progressA11yKey: POOL_PROGRESS_A11Y_KEY,
    amountRaisedLabelKey: POOL_PROGRESS_AMOUNT_RAISED_LABEL_KEY,
    daysLabelKey: POOL_PROGRESS_DAYS_KEY,
  };
}
