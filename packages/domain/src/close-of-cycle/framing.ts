// Close-of-cycle template-driven framing policy — Story 7.8 (AC3/AC4). [GOVERNANCE]
//
// This is a PURE PRIMITIVE: the single seam Epic 8's Panchayat Noticeboard, Epic 11b's
// Sahyog Vivran (FR-77), and Story 8.9's calendar-aware close consume so the
// outcome→template decision is MADE ONCE, TESTED ONCE, and never re-implemented per
// consumer. It ships the building blocks, NOT the surfaces that render them (mirrors the
// 7.6/7.7 primitive/consumer seam discipline).
//
// ── The load-bearing governance property (Pool-Reality #1 + #2) ───────────────────────
// FR-19: close-of-cycle copy is template-driven, celebrates the ACTUAL delivered outcome +
// contributor solidarity (Pool-Reality #1), and NEVER surfaces a comparison-to-target /
// shortfall narrative (Pool-Reality #2 — the rejected Ketto/GoFundMe progress-meter frame).
// Two structural guarantees enforce #2 here:
//   1. `selectCloseOfCycleFraming` returns only the canonical `close-of-cycle` template
//      keys — there is NO comparison template to return on ANY branch, so the under_funded
//      branch STRUCTURALLY cannot select a shortfall frame. The absence of shortfall copy
//      in the i18n catalog + the strengthened `microcopy` tone gate are the two enforcement
//      layers over the copy itself (this module owns the DECISION, not the strings).
//   2. `classifyCycleOutcome` QUARANTINES the target: the expected/target total flows *in*
//      and only the `CycleFundingOutcome` enum flows *out*. The comparison is computed once,
//      internally, and the raw numbers physically never reach the copy path.
//
// ── Purity contract ───────────────────────────────────────────────────────────────────
// Both functions are PURE + deterministic + replay-safe (no clock, no DB, no I/O, no
// randomness) — the "outcome" and the totals are INPUTS a consumer (Epic 9 reconciliation)
// supplies. DB-free unit-testable (tests/close-of-cycle/framing.test.ts), the 7.6/7.7 posture.

/**
 * The canonical cycle-funding-outcome union (the ordering is provenance-stable — never
 * re-order). Each maps to a `close-of-cycle` template family. `fully_funded` = the family
 * received the full expected amount; `under_funded` = they received less than expected but
 * the copy celebrates the actual delivered amount + solidarity (Pool-Reality #1); `partial`
 * = a consumer-supplied outcome for a close whose delivery is acknowledged without any
 * comparison (see {@link classifyCycleOutcome} for which outcomes the two-total classifier
 * derives, and which a consumer supplies directly).
 */
export const CYCLE_FUNDING_OUTCOMES = ['fully_funded', 'under_funded', 'partial'] as const;
export type CycleFundingOutcome = (typeof CYCLE_FUNDING_OUTCOMES)[number];

/** The i18n namespace every close-of-cycle template key resolves in (Story 7.8, D1). */
export const CLOSE_OF_CYCLE_NAMESPACE = 'close-of-cycle' as const;
export type CloseOfCycleNamespace = typeof CLOSE_OF_CYCLE_NAMESPACE;

/**
 * The interpolation params EVERY close-of-cycle template requires (the token contract the
 * consumer must supply to `t()`). NONE of these is a target/shortfall figure — the target
 * is quarantined in {@link classifyCycleOutcome} and never reaches the copy path (AC4).
 *
 * `amount` is a PRE-FORMATTED display string (e.g. `'₹4,20,000'`), not a raw number — the
 * consumer formats currency before interpolating, mirroring how `poolLabel`/`familyName` are
 * already display strings. This module does no currency formatting itself.
 */
export const CLOSE_OF_CYCLE_REQUIRED_PARAMS = [
  'poolLabel',
  'contributorCount',
  'familyName',
  'amount',
] as const;
export type CloseOfCycleParam = (typeof CLOSE_OF_CYCLE_REQUIRED_PARAMS)[number];

/**
 * The framing decision for one outcome — the canonical `close-of-cycle` template keys +
 * the required interpolation-param contract. `namespace` is a constant so a consumer reads
 * `t(framing.titleKey, params, { namespace: framing.namespace })` uniformly. There is no
 * `comparison`/`shortfall` variant in this shape by construction.
 */
export interface CloseOfCycleFraming {
  readonly outcome: CycleFundingOutcome;
  readonly namespace: CloseOfCycleNamespace;
  readonly titleKey: string;
  readonly bodyKey: string;
  readonly requiredParams: readonly CloseOfCycleParam[];
}

/**
 * The canonical template-key pair per outcome — exported so a test can cross-check that
 * every key EXISTS in the `close-of-cycle.json` catalog (no dangling key; the selector and
 * the catalog cannot drift). Flat dot-keyed, mirroring the 7.6/7.7 `contribution.json`
 * convention (`"<outcome>.<part>"`).
 */
export const CLOSE_OF_CYCLE_TEMPLATE_KEYS: Readonly<
  Record<CycleFundingOutcome, { readonly titleKey: string; readonly bodyKey: string }>
> = {
  fully_funded: { titleKey: 'fully_funded.title', bodyKey: 'fully_funded.body' },
  under_funded: { titleKey: 'under_funded.title', bodyKey: 'under_funded.body' },
  partial: { titleKey: 'partial.title', bodyKey: 'partial.body' },
};

/**
 * Map a `CycleFundingOutcome` to its canonical close-of-cycle framing (AC3.9). PURE,
 * exhaustive (a compile-time `never` default — adding a union member without a branch is a
 * type error, the assignment/verdict exhaustiveness precedent), deterministic + replay-safe.
 *
 * The `under_funded` (and `partial`) branch STRUCTURALLY cannot return a comparison-to-target
 * template — the shape has only `titleKey`/`bodyKey` into the `close-of-cycle` namespace, and
 * that namespace carries no shortfall copy. This is the epic's demoable closure made
 * executable (AC3.10): under-funded → celebration keys, the shortfall math stays internal.
 */
export function selectCloseOfCycleFraming(outcome: CycleFundingOutcome): CloseOfCycleFraming {
  switch (outcome) {
    case 'fully_funded':
    case 'under_funded':
    case 'partial': {
      const keys = CLOSE_OF_CYCLE_TEMPLATE_KEYS[outcome];
      return {
        outcome,
        namespace: CLOSE_OF_CYCLE_NAMESPACE,
        titleKey: keys.titleKey,
        bodyKey: keys.bodyKey,
        requiredParams: CLOSE_OF_CYCLE_REQUIRED_PARAMS,
      };
    }
    default: {
      // Exhaustiveness guard — a new outcome without a branch is a compile-time error here,
      // and a runtime throw if an out-of-union value is forced past the type system.
      const _never: never = outcome;
      throw new Error(`[selectCloseOfCycleFraming] unhandled cycle-funding outcome: ${String(_never)}`);
    }
  }
}

/**
 * Classify a cycle's funding outcome from its reconciled totals — the TARGET-QUARANTINING
 * classifier (AC3.11, D2). PURE + deterministic. The expected/target total flows IN and only
 * the `CycleFundingOutcome` enum flows OUT: the comparison is computed once, internally, and
 * the numbers physically never reach the copy path (Pool-Reality #2 by construction).
 *
 *   · `deliveredTotal >= expectedTotal` → `fully_funded` (met OR exceeded the expected amount)
 *   · `deliveredTotal <  expectedTotal` → `under_funded`
 *
 * `partial` is NOT derivable from a two-total reconciliation comparison — it is a distinct
 * outcome a consumer supplies directly (e.g. a close acknowledged before the final delivered
 * figure is reconciled). Keeping it out of this classifier keeps the target-quarantine
 * property clean: the ONLY thing this function decides is met-or-not, and it emits an opaque
 * enum, never a ratio/percentage/shortfall. Compose it with {@link selectCloseOfCycleFraming}
 * so an internal under-funded FACT yields celebration copy (the AC3.10 load-bearing test).
 *
 * Both totals must be finite non-negative integers (whole INR, mirroring `pools.fixed_amount`
 * — this classifier does NO paise arithmetic) — `NaN`/`Infinity`/negative/non-integer inputs
 * throw rather than silently classifying, surfacing an upstream defect instead of masking it
 * (the 7.7 `Number.isInteger` guard precedent).
 */
export function classifyCycleOutcome(input: {
  readonly expectedTotal: number;
  readonly deliveredTotal: number;
}): Exclude<CycleFundingOutcome, 'partial'> {
  const { expectedTotal, deliveredTotal } = input;
  if (
    !Number.isInteger(expectedTotal) ||
    !Number.isInteger(deliveredTotal) ||
    expectedTotal < 0 ||
    deliveredTotal < 0
  ) {
    throw new Error(
      `[classifyCycleOutcome] expectedTotal and deliveredTotal must both be finite non-negative integers ` +
        `(got expectedTotal=${String(expectedTotal)}, deliveredTotal=${String(deliveredTotal)})`,
    );
  }
  return deliveredTotal >= expectedTotal ? 'fully_funded' : 'under_funded';
}
