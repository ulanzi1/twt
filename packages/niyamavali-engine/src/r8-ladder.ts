// R8 ninety-percent-rule ladder — Story 4.3 (Tasks 3 + 4); thinned to a wrapper in 4.4.
//
// R8 is delivered as DATA: three registry clauses (`niy.ninety-percent-rule.r8`,
// `…r8-a`, `…r8-b`), each a self-contained `rule_kind: 'conditional'` payload interpreted
// by the Story 4.1 primitive (`interpretClause`). This module contributes ONLY:
//   · the caller-supplied `contribution.*` / `claim.*` fact contract R8 reads (Task 4), and
//   · the R8-FAMILY parameterization of the generic ladder resolver (`ladder.ts`) — the
//     `clauseIds` list + the `notApplicableSlug` that make the shared mechanics run R8.
//
// The ladder MECHANICS moved to `ladder.ts` in Story 4.4's rule-of-three extraction (R7/R8/
// special-death share them field-for-field). The named exports below (`evaluateR8Ladder*`)
// are behavior-preserving thin wrappers — every existing R8 test stays byte-for-byte green.
//
// ── NO hardcoded rule logic (AC2.5) ───────────────────────────────────────────────
// There is NO `switch (clauseId)` / branch keyed by registry identity. Each R8 branch is
// interpreted from its payload; the ladder's applicable-pick reads `precedence` + `on_pass`
// as DATA. The illness-only gate (AC2.4) is DATA too — a `claim.death_classification == 'illness'`
// precondition in every R8 payload, never a hardcoded `if (accident)` branch.
//
// ── `precedence` selects the surfaced EXPLANATION, not eligibility (Decision §5) ──────
// Every sub-clause whose `on_pass` fires already means "eligible". When a member qualifies via
// more than one R8 path, the ladder pick only decides WHICH reason (provenance) is reported.
// Re-tune the DATA (the seed payload), never add engine logic.
// [[project_niyamavali_precedence_is_provenance]]
//
// ── The load-bearing seam: the engine EVALUATES facts, it never DERIVES them ─────────
// The "90% computation" is a PRE-DERIVED fact (`contribution.compliance_percent`), not an
// engine calculation — R8 base only checks `fact_gte >= 90`. The PRODUCER (Epic 8/9 + Epic 6
// claim intake, assembled by the 4.6 Validity Service) derives it. See §"R8 fact contract".
//
// ── Boundary (Story 4.6) ──────────────────────────────────────────────────────────
// This is R8-FAMILY scoped. The cross-family ordered provenance trace (R8 vs R7 vs R5/R9 vs
// accident-vs-illness classification) is Story 4.6's Validity Service — do NOT build the
// cross-family orchestrator here.

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

// ── Fact contract (the Epic 8/9 + Epic 6 claim-intake seam — Task 4) ────────────────
//
// INVARIANT: the engine NEVER infers contribution/claim facts. It only READS pre-derived
// facts handed in via `EvaluationContext.facts`; it never counts contributions, computes
// the compliance percentage, or classifies the death. Deriving those is exclusively the
// fact PRODUCER's job (Epic 8/9 contribution history + Epic 6 claim intake, assembled by
// the Story 4.6 Validity Service) — contribution/claim events do NOT exist yet (Story 9.x;
// `data-export/assemble.ts:20` confirms "no source system at Epic 3"). 4.3 defines the
// CONTRACT and tests against injected synthetic facts (exactly as 4.2 did for R7).

/** Net-new `contribution.*` fact keys R8 reads (the two shared keys live in `r7-ladder.ts`). */
export const R8_CONTRIBUTION_FACT_KEYS = {
  /** number 0–100 — pre-derived % of expected contributions made. R8 base `>= 90` (the "90% computation"). */
  COMPLIANCE_PERCENT: 'contribution.compliance_percent',
  /** bool — the prior year was 100% compliant. R8(A) `== true` (skip-allowance precondition). */
  PRIOR_PERIOD_FULL_COMPLIANCE: 'contribution.prior_period_full_compliance',
} as const;

/**
 * `claim.*` death-circumstance fact keys R8 reads (Epic 6 claim intake). The Story 4.4
 * special-death family REUSES `DEATH_CLASSIFICATION` (imports this key, does not redefine
 * the literal) — its enum documentation is extended below to cover the special-death values.
 */
export const R8_CLAIM_FACT_KEYS = {
  /**
   * string enum — the death classification. R8/R8(A)/R8(B) illness gate `== 'illness'`.
   * Known values across R8 + the Story 4.4 special-death family:
   * `'illness'` | `'accident'` | `'natural'` | `'suicide'` | `'murder'`. The engine only
   * ever compares the value (via `fact_equals` / `fact_in`); it never derives the classification.
   */
  DEATH_CLASSIFICATION: 'claim.death_classification',
  /** bool — died after a contribution alert was published, before its deadline. R8(B) `== true`. */
  MID_CONTRIBUTION_DEATH: 'claim.mid_contribution_death',
} as const;

/** A net-new `contribution.*` fact key R8 reads (the producer + tests share this type). */
export type R8ContributionFactKey =
  (typeof R8_CONTRIBUTION_FACT_KEYS)[keyof typeof R8_CONTRIBUTION_FACT_KEYS];

/** A `claim.*` fact key R8 reads (the producer + tests share this type). */
export type R8ClaimFactKey = (typeof R8_CLAIM_FACT_KEYS)[keyof typeof R8_CLAIM_FACT_KEYS];

// ── The three R8 sub-clause ids (stable, sorted) ──────────────────────────────────

/** The R8 clause ids — the family the ladder evaluates, in stable (sorted) order. */
export const R8_CLAUSE_IDS = [
  'niy.ninety-percent-rule.r8',
  'niy.ninety-percent-rule.r8-a',
  'niy.ninety-percent-rule.r8-b',
] as const;

/** The shared not-applicable outcome slug every R8 clause maps `on_fail` to (DATA, in each payload). */
export const R8_NOT_APPLICABLE = 'r8_not_applicable';

// ── Result shape (exported — Story 4.6 consumes it; aliases the generic ladder shape) ──

export type R8ClauseEvaluation = LadderClauseEvaluation;
export type R8LadderResult = LadderResult;

// ── R8-family thin wrappers over the generic ladder (behavior-preserving) ──────────

/**
 * Interpret the three resolved R8 clauses against one resolved context and resolve the
 * family ladder — PURE + DETERMINISTIC. Delegates to the generic `evaluateLadder`,
 * parameterized by the R8 not-applicable slug.
 *
 * The "R8 applies vs 90% failed" distinction is NOT lost through the shared `r8_not_applicable`
 * slug: it is read from the base-R8 clause's `subClauseResults` (illness pass + `>= 10` pass +
 * `>= 90` FAIL ⇒ "subject to R8 but failed the 90% threshold"). Story 4.6 reads `perClauseResults`.
 */
export function evaluateR8Ladder(
  resolvedClauses: ResolvedClause[],
  ctx: ResolvedEvaluationContext,
): R8LadderResult {
  return evaluateLadder(resolvedClauses, ctx, R8_NOT_APPLICABLE);
}

/** Historical / replay-correct R8-family evaluation at a FIXED instant `at`. */
export async function evaluateR8LadderAt(
  deps: EvaluateDeps,
  context: EvaluationContext,
  at: Date,
): Promise<R8LadderResult> {
  return evaluateLadderAt(deps, context, at, R8_CLAUSE_IDS, R8_NOT_APPLICABLE);
}

/** Live R8-family evaluation: resolves DB-authoritative `now()` ONCE and delegates. */
export async function evaluateR8LadderLive(
  deps: EvaluateDeps,
  context: EvaluationContext,
): Promise<R8LadderResult> {
  return evaluateLadderLive(deps, context, R8_CLAUSE_IDS, R8_NOT_APPLICABLE);
}
