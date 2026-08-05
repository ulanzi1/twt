// R7 contribution-discipline ladder — Story 4.2 (Tasks 3 + 4); thinned to a wrapper in 4.4.
//
// R7 is delivered as DATA: seven registry clauses (`niy.contribution-discipline.r7-a`
// … `r7-g`), each a self-contained `rule_kind: 'conditional'` payload interpreted by the
// Story 4.1 primitive (`interpretClause`). This module contributes ONLY:
//   · the caller-supplied `contribution.*` fact contract R7 reads (Task 4), and
//   · the R7-FAMILY parameterization of the generic ladder resolver (`ladder.ts`) — the
//     `clauseIds` list + the `notApplicableSlug` that make the shared mechanics run R7.
//
// The ladder MECHANICS moved to `ladder.ts` in Story 4.4's rule-of-three extraction (R7/R8/
// special-death share them field-for-field). The named exports below (`evaluateR7Ladder*`)
// are behavior-preserving thin wrappers — every existing R7 test stays byte-for-byte green.
//
// ── NO hardcoded rule logic (AC1.4) ───────────────────────────────────────────────
// There is NO `switch (clauseId)` / branch keyed by registry identity. Each R7 branch is
// interpreted from its payload; the ladder's applicable-pick reads `precedence` + `on_pass`
// as DATA from the resolved payload. Adding / re-tuning an R7 rule stays a clause change.
//
// ── `precedence` selects the surfaced EXPLANATION, not eligibility ─────────────────
// Every R7(x) whose `on_pass` fires already means "restoration path applies"; the ladder pick
// only decides WHICH reason surfaces when several apply. Re-tune the DATA, never add engine
// logic. [[project_niyamavali_precedence_is_provenance]]
//
// ── The load-bearing seam: the engine EVALUATES facts, it never DERIVES them ─────────
// `total_count`, `skips_current_year`, `months_since_last` etc. arrive PRE-DERIVED as
// caller-injected facts — the engine never counts contributions or computes gaps. The
// PRODUCER (Epic 8/9, assembled by the 4.6 Validity Service) derives them; see §"R7 fact
// contract".
//
// ── Boundary (Story 4.6) ──────────────────────────────────────────────────────────
// This is R7-FAMILY scoped. The cross-family ordered provenance trace (R7 vs R8 vs R5…)
// is Story 4.6's Validity Service — do NOT build the cross-family orchestrator here.

import {
  evaluateLadder,
  evaluateLadderAt,
  evaluateLadderLive,
  type LadderClauseEvaluation,
  type LadderResult,
} from './ladder.js';
import type { EvaluateDeps } from './evaluate.js';
import type {
  EvaluationContext,
  ResolvedClause,
  ResolvedEvaluationContext,
} from './types.js';

// ── Contribution-history fact contract (the Epic 8/9 seam — Task 4) ────────────────
//
// INVARIANT: the engine NEVER infers contribution facts. It only READS pre-derived
// `contribution.*` facts handed in via `EvaluationContext.facts`; it never counts
// contributions, computes skips/gaps, or reaches for a source to synthesize them.
// Deriving these is exclusively the fact PRODUCER's job — Story 10.24, assembled by the
// Story 4.6 Validity Service, supplies `total_count` / `ever_contributed` /
// `months_since_last` / `skips_current_year` / `in_lapse` from real event history as of
// Story 9.4 (the `contribution.confirmed` event producer has existed since then). 4.2
// defines the CONTRACT and tests against injected synthetic facts.
//
// Calendar-correct derivation (AI-3-1: `date_trunc`/`interval`, never fixed-ms spans) is
// the PRODUCER's responsibility — `months_since_last` etc. arrive here already computed.
// These keys are the single source of truth shared by the future producer and the tests.

export const R7_CONTRIBUTION_FACT_KEYS = {
  /** int — lifetime confirmed contributions. R7(A) `< 10`; R7(D/E) `>= 10` gate. */
  TOTAL_COUNT: 'contribution.total_count',
  /** bool — `total_count > 0` (explicit for clarity). R7(B) `== false`. */
  EVER_CONTRIBUTED: 'contribution.ever_contributed',
  /** int — missed cycles in the rolling/calendar year. R7(D) `== 1`; R7(E) `>= 2`. */
  SKIPS_CURRENT_YEAR: 'contribution.skips_current_year',
  /** int — CALENDAR months since last contribution. R7(C) long-gap; R7(F) `>= 6`. */
  MONTHS_SINCE_LAST: 'contribution.months_since_last',
  /** int — lifetime R7(A) one-time restorations consumed. R7(A) `< 2` (lifetime cap). */
  R7A_RESTORATIONS_USED: 'contribution.r7a_restorations_used',
  /** bool — currently in a discipline lapse. R7(A) precondition gate. */
  IN_LAPSE: 'contribution.in_lapse',
  /** bool — a personal-event excuse was asserted. R7(G) declarative. */
  PERSONAL_EVENT_EXCUSE_CLAIMED: 'contribution.personal_event_excuse_claimed',
} as const;

/** A `contribution.*` fact key R7 reads (the producer + tests share this type). */
export type R7ContributionFactKey =
  (typeof R7_CONTRIBUTION_FACT_KEYS)[keyof typeof R7_CONTRIBUTION_FACT_KEYS];

// ── The seven R7 sub-clause ids (stable, sorted) ──────────────────────────────────

/** The R7(A–G) clause ids — the family the ladder evaluates, in stable (sorted) order. */
export const R7_CLAUSE_IDS = [
  'niy.contribution-discipline.r7-a',
  'niy.contribution-discipline.r7-b',
  'niy.contribution-discipline.r7-c',
  'niy.contribution-discipline.r7-d',
  'niy.contribution-discipline.r7-e',
  'niy.contribution-discipline.r7-f',
  'niy.contribution-discipline.r7-g',
] as const;

/** The shared not-applicable outcome slug every R7 clause maps `on_fail` to (DATA, in each payload). */
export const R7_NOT_APPLICABLE = 'r7_not_applicable';

// ── Result shape (exported — Story 4.6 consumes it; aliases the generic ladder shape) ──

export type R7ClauseEvaluation = LadderClauseEvaluation;
export type R7LadderResult = LadderResult;

// ── R7-family thin wrappers over the generic ladder (behavior-preserving) ──────────

/**
 * Interpret the seven resolved R7 clauses against one resolved context and resolve the
 * family ladder — PURE + DETERMINISTIC. Delegates to the generic `evaluateLadder`,
 * parameterized by the R7 not-applicable slug.
 */
export function evaluateR7Ladder(
  resolvedClauses: ResolvedClause[],
  ctx: ResolvedEvaluationContext,
): R7LadderResult {
  return evaluateLadder(resolvedClauses, ctx, R7_NOT_APPLICABLE);
}

/** Historical / replay-correct R7-family evaluation at a FIXED instant `at`. */
export async function evaluateR7LadderAt(
  deps: EvaluateDeps,
  context: EvaluationContext,
  at: Date,
): Promise<R7LadderResult> {
  return evaluateLadderAt(deps, context, at, R7_CLAUSE_IDS, R7_NOT_APPLICABLE);
}

/** Live R7-family evaluation: resolves DB-authoritative `now()` ONCE and delegates. */
export async function evaluateR7LadderLive(
  deps: EvaluateDeps,
  context: EvaluationContext,
): Promise<R7LadderResult> {
  return evaluateLadderLive(deps, context, R7_CLAUSE_IDS, R7_NOT_APPLICABLE);
}
