// R12 retirement-coverage extension — Story 4.5 (Tasks 3 + 4).
//
// FR-12's "+1 year post-retirement coverage per 5 years of valid membership" delivered as DATA:
// a single registry clause (`niy.retirement-coverage.r12`) interpreted by the Story 4.1 primitive
// (`interpretClause`). This module contributes ONLY:
//   · the caller-supplied `member.*` fact contract the rule reads (Task 3), and
//   · thin direct evaluators over the Story 4.1 primitive (Task 4).
//
// It is the FOURTH consumer of the engine primitive (after R7/R8/R5-R9-R14) but the FIRST that
// asks the engine to COMPUTE AND RETURN A VALUE (`granted_years`) rather than a boolean decision.
// That value rides the `rule_kind: 'computed'` branch + the namespaced `result.computed.values`
// channel added to the interpreter in Task 1 — NOT a boolean operator (operators return
// `{passed, detail}` and cannot emit a value). Like R14 concealment (`special-death.ts`), R12 is a
// SINGLE-CLAUSE family with no competing sub-clauses, so it needs NO ladder wrapper: it is
// evaluated DIRECTLY via `evaluateAt`/`evaluate`, mirroring `evaluateConcealmentAt`/`Live`.
//
// ── NO hardcoded rule logic ────────────────────────────────────────────────────────
// The +1-per-5-years grant ladder is DATA in the payload (`grant_every_years`/`years_per_grant`/
// `min_years`); the interpreter's registered `grant_ladder` computation runs it. Re-tuning the
// policy (e.g. +1 per 4 years) is a clause amendment, ZERO engine change. `granted_years` is
// computed by the interpreter from the payload params, NEVER a `switch (clauseId)`.
//
// ── The engine EVALUATES facts, it never DERIVES them ────────────────────────────────
// The two facts — `member.valid_membership_years` (int) + `member.is_retired` (bool) — arrive
// PRE-DERIVED as caller-injected facts. The raw `joined_at`/`retired_at` dates are DELIBERATELY
// NOT in the engine's fact vocabulary (D2-i fact-vocabulary narrowing): they are the producer's
// derivation inputs (folded into `valid_membership_years`, calendar-correctly per AI-3-1) and the
// Story 4.6 date-projection's inputs, never the engine's. The producer is the Story 4.6 Validity
// Service, reading the Story 3.1 signup event (`joined_at`) + the Story 3.9 first-ever
// `member_postings.is_retirement=true` anchor (`retired_at`, via `getMemberPostingRetiredEver` —
// a permanent, monotonic-once-set anchor; it also accepts an admin trustee-marked retirement
// event). NO source system / producer exists yet at Epic 4 — this module defines the CONTRACT +
// tests against synthetic facts, exactly as 4.2/4.3/4.4 did.
// [[project_engine_never_infers_contribution_facts]]
//
// ── EXTENSION, never a denial ────────────────────────────────────────────────────────
// `granted_years` is a PURE function of tenure, independent of `is_retired` — a non-retired member
// with enough tenure still earns a nonzero `granted_years` (PRD FR-12A's `years_of_coverage_earned`;
// see `deferred-work.md` CR-4.5-D3). `is_retired` is echoed separately and gates ONLY the decision
// slug (`retirement_coverage_computed` iff retired AND `granted_years > 0`, else
// `retirement_coverage_not_applicable`) + Story 4.6's `active` — NOT an ineligible verdict either
// way. Retirement coverage EXTENDS eligibility; consistent with the Epic 4 never-auto-deny posture
// and the `pool` mechanism.
//
// ── Boundary (Story 4.6) ─────────────────────────────────────────────────────────────
// The engine emits the RAW computed values (`granted_years` + echoed `is_retired`) under
// `result.computed.values` ONLY. Story 4.6 does the calendar-correct date projection
// (`coverage_through = retired_at + granted_years`; `days_remaining`; `active = is_retired &&
// days_remaining > 0`) and maps to BOTH the FR-12A canonical `retirement_coverage` shape and the
// epic's `retirement_coverage_extension` field names. Do NOT build that projection here.

import { ids } from '@twt/domain';

import { evaluate, evaluateAt, type EvaluateDeps } from './evaluate.js';
import type { EvaluationContext, EvaluationResult } from './types.js';

// ── Fact contract (the Story 4.6 Validity Service seam — Task 3) ─────────────────────
//
// INVARIANT: the engine NEVER derives these — it READS caller-injected facts. Exactly TWO
// `member.*` keys (D2-i fact-vocabulary narrowing — no raw `retired_at`/`joined_at` here). These
// keys are the single source of truth shared by the future producer and the tests.

/** The two `member.*` retirement fact keys the R12 computed rule reads (pre-derived, caller-injected). */
export const R12_MEMBER_FACT_KEYS = {
  /**
   * int — the producer-derived, calendar-correct count of VALID membership years (lapse policy
   * applied per the Trustee Panel's future resolution; the D4 `policy_review_required` ambiguity).
   * The grant ladder's sole tenure input (`floor(valid_membership_years / 5)`).
   */
  VALID_MEMBERSHIP_YEARS: 'member.valid_membership_years',
  /**
   * bool — the Story 3.9 first-ever-retirement anchor (`is_retirement=true`, permanent once set).
   * Echoed into `computed.values` so Story 4.6 can gate `active`; also gates the decision slug
   * (`retirement_coverage_computed` vs `_not_applicable`).
   */
  IS_RETIRED: 'member.is_retired',
} as const;

/** A `member.*` fact key the R12 rule reads (the producer + tests share this type). */
export type R12MemberFactKey = (typeof R12_MEMBER_FACT_KEYS)[keyof typeof R12_MEMBER_FACT_KEYS];

// ── The R12 clause id + its decision-slug vocabulary (its own single-clause family) ──

/** The R12 retirement-coverage clause id (a single-clause family; NO ladder). */
export const R12_CLAUSE_ID = 'niy.retirement-coverage.r12';

/** The decision slug when the member is retired AND has earned coverage (`granted_years > 0`). */
export const RETIREMENT_COVERAGE_COMPUTED = 'retirement_coverage_computed';

/** The decision slug when not applicable (non-retired, or below the `min_years` gate). */
export const RETIREMENT_COVERAGE_NOT_APPLICABLE = 'retirement_coverage_not_applicable';

/** The `computed.values` output key carrying the granted post-retirement coverage years. */
export const R12_GRANTED_YEARS_KEY = 'granted_years';

/** The `computed.values` output key echoing the retirement flag (Story 4.6 gates `active` on it). */
export const R12_IS_RETIRED_KEY = 'is_retired';

// ── Direct evaluators (single clause — mirror `evaluateConcealmentAt`/`Live`, NO ladder) ──

/**
 * Historical / replay-correct R12 evaluation at a FIXED instant `at`. Delegates to the reviewed
 * Story 4.1 `evaluateAt` against the single `niy.retirement-coverage.r12` clause (resolve →
 * interpret → memo → audit-on-compute). Returns `null` when the clause is not resolvable for this
 * pariwar at `at` (mirror the primitive). The applicable result carries the computed
 * `granted_years` (+ echoed `is_retired`) under `result.computed.values` — never a deny.
 */
export async function evaluateRetirementCoverageAt(
  deps: EvaluateDeps,
  context: EvaluationContext,
  at: Date,
): Promise<EvaluationResult | null> {
  return evaluateAt(deps, ids.clauseId(R12_CLAUSE_ID), context, at);
}

/** Live R12 evaluation: resolves DB-authoritative `now()` ONCE and delegates. */
export async function evaluateRetirementCoverageLive(
  deps: EvaluateDeps,
  context: EvaluationContext,
): Promise<EvaluationResult | null> {
  return evaluate(deps, ids.clauseId(R12_CLAUSE_ID), context);
}
