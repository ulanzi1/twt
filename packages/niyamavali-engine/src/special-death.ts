// R5/R9 special-death family + R14 concealment — Story 4.4 (Tasks 4 + 5).
//
// FR-11's special-death scenarios delivered as DATA: seven registry clauses interpreted by the
// Story 4.1 primitive (`interpretClause`). This module contributes ONLY:
//   · the caller-supplied `claim.*` fact contract the family reads (Task 5), and
//   · the special-death-FAMILY parameterization of the generic ladder resolver (`ladder.ts`)
//     for R5(C.2)/R5(D)/R5(E)/R5(F)/R9/R9(A) + the Mar-2025 rule, PLUS
//   · a thin direct evaluator for R14 concealment (`niy.concealment.r14`) — a single clause with
//     no competing sub-clauses, so it needs NO ladder wrapper (see §"R14 concealment" below).
//
// It is the direct sibling of `r8-ladder.ts` (Story 4.3) and mirrors it. Unlike 4.2/4.3 it adds
// NO new interpreter operator — the family's vocabulary (`fact_in` + `fact_equals`) is already in
// the `OPERATORS` registry (`interpret.ts`); Story 4.4 Decision D3 confirmed `fact_in` covers the
// set-membership (`death_classification ∈ {suicide, murder}`) and producer-derived booleans cover
// the compounds, so no `any_of` operator was added.
//
// ── NEVER auto-deny — the whole point of this story (SM-1 C7) ──────────────────────
// R5/R9/R14 produce ROUTING slugs and FLAGS — the consumer (Epic 6 claim filing) makes the actual
// deny decision via State Trustee review / R9 voting. NO family payload has a deny/ineligible
// `on_pass`/`on_fail`; every path routes or flags (prd.md:370 "never auto-denial — but the engine
// surfaces the trigger"; `never_auto_deny:true` on every clause).
//
// ── `precedence` selects the surfaced EXPLANATION, not eligibility ─────────────────
// Every sub-clause whose `on_pass` fires already means the special case applies; the ladder pick
// only decides WHICH provenance surfaces when several apply (Mar-2025 > R9 > R9(A) > R5(E) > R5(F)
// > R5(C.2) > R5(D)). Re-tune the DATA, never add engine logic.
// [[project_niyamavali_precedence_is_provenance]]
//
// ── The engine EVALUATES facts, it never DERIVES them ─────────────────────────────
// `concealed_ima_condition_linked`, `nominee_accused`, `honestly_declared_preexisting` etc. arrive
// PRE-DERIVED as caller-injected facts. The producer is Epic 6 claim intake + Story 3.9 disclosure
// history + Story 3.5 IMA-list resolution, assembled by the Story 4.6 Validity Service — NO source
// system exists yet at Epic 4. This module defines the CONTRACT + tests against synthetic facts.
// [[project_engine_never_infers_contribution_facts]]
//
// ── AC2 provenance scope (D4) ─────────────────────────────────────────────────────
// The concealment flag's provenance here is the flag + `clause_id`/`clauseVersionId` ONLY. AC2's
// literal "which disclosure events / which IMA-list versions" trace is the Story 4.6 Validity
// Service's job (it reads Story 3.9's event log + IMA-list version history directly) — the engine's
// provenance channel (`buildInputsSummary`) is PII-free by construction (fact KEYS only, never
// VALUES) and CANNOT carry that richer trace even if a producer supplied it.
//
// ── Boundary (Story 4.6) ──────────────────────────────────────────────────────────
// This is special-death-FAMILY scoped. The cross-family ordered provenance trace (R5/R9 vs R7 vs
// R8) is Story 4.6's Validity Service — do NOT build the cross-family orchestrator here.

import { ids } from '@twt/domain';

import { evaluate, evaluateAt, type EvaluateDeps } from './evaluate.js';
import {
  evaluateLadder,
  evaluateLadderAt,
  evaluateLadderLive,
  type LadderClauseEvaluation,
  type LadderResult,
} from './ladder.js';
import { R8_CLAIM_FACT_KEYS } from './r8-ladder.js';
import type {
  EvaluationContext,
  EvaluationResult,
  ResolvedClause,
  ResolvedEvaluationContext,
} from './types.js';

// ── Fact contract (the Epic 6 claim-intake + Story 3.9/3.5 seam — Task 5) ───────────
//
// INVARIANT: the engine NEVER infers these — it READS caller-injected facts. The producer (Epic 6
// claim intake + Story 3.9 disclosure history + Story 3.5 IMA-list resolution, assembled by the
// Story 4.6 Validity Service) derives them; NO source system exists yet at Epic 4. These keys are
// the single source of truth shared by the future producer and the tests.

/** `claim.*` death-circumstance fact keys the R5/R9 special-death family reads. */
export const SPECIAL_DEATH_CLAIM_FACT_KEYS = {
  /**
   * string enum — the death classification. R9/Mar-2025 read `∈ {suicide, murder}` via `fact_in`.
   * REUSED from `R8_CLAIM_FACT_KEYS` (imported, not redefined) — its documented enum spans
   * `'illness'` | `'accident'` | `'natural'` | `'suicide'` | `'murder'`.
   */
  DEATH_CLASSIFICATION: R8_CLAIM_FACT_KEYS.DEATH_CLASSIFICATION,
  /** bool — a pre-existing condition was HONESTLY declared (FR-5 disclosure). R5(C.2) `== true`. */
  HONESTLY_DECLARED_PREEXISTING: 'claim.honestly_declared_preexisting',
  /** bool — a member/nominee asserted a legal claim to support. R5(D) `== true` (records "no legal claim"). */
  LEGAL_CLAIM_ASSERTED: 'claim.legal_claim_asserted',
  /** bool — a multi-nominee (75/25) dispute or defamatory-beneficiary recovery scenario. R5(E) `== true`. */
  MULTI_NOMINEE_DISPUTE: 'claim.multi_nominee_dispute',
  /** bool — an erroneous excess transfer occurred. R5(F) `== true`. */
  ERRONEOUS_EXCESS_TRANSFER: 'claim.erroneous_excess_transfer',
  /** bool — the nominee is accused in the death. Mar-2025 `== true` (with death ∈ {suicide, murder}). */
  NOMINEE_ACCUSED: 'claim.nominee_accused',
  /** bool — multiple member deaths on the same date. R9(A) `== true`. */
  MULTIPLE_DEATHS_SAME_DATE: 'claim.multiple_deaths_same_date',
} as const;

/** `claim.*` fact keys the R14 concealment clause reads. */
export const CONCEALMENT_FACT_KEYS = {
  /**
   * bool — an undeclared IMA-listed condition is reasonably linked to the death (the single
   * pre-derived "concealment" fact; the producer collapses the disclosure-history + IMA-list walk
   * into this one boolean — the disclosure-event/IMA-version trace is Story 4.6's job, not here).
   * R14 `== true` → `special_flags:[concealment_review_required]` + route to State Trustee review.
   */
  CONCEALED_IMA_CONDITION_LINKED: 'claim.concealed_ima_condition_linked',
} as const;

/** A `claim.*` fact key the special-death family reads (producer + tests share this type). */
export type SpecialDeathClaimFactKey =
  (typeof SPECIAL_DEATH_CLAIM_FACT_KEYS)[keyof typeof SPECIAL_DEATH_CLAIM_FACT_KEYS];

/** A `claim.*` fact key the R14 concealment clause reads (producer + tests share this type). */
export type ConcealmentFactKey =
  (typeof CONCEALMENT_FACT_KEYS)[keyof typeof CONCEALMENT_FACT_KEYS];

// ── The seven special-death sub-clause ids (stable, sorted) ────────────────────────

/**
 * The R5/R9 special-death family clause ids — the family the ladder evaluates, in stable
 * (sorted) order. R14 concealment is NOT here: it is its own single-clause family (below).
 */
export const SPECIAL_DEATH_CLAUSE_IDS = [
  'niy.special-death.r5-c-2',
  'niy.special-death.r5-d',
  'niy.special-death.r5-e',
  'niy.special-death.r5-f',
  'niy.special-death.r9',
  'niy.special-death.r9-a',
  'niy.special-death.r9-suicide-murder',
] as const;

/** The shared not-applicable outcome slug every special-death clause maps `on_fail` to (DATA). */
export const SPECIAL_DEATH_NOT_APPLICABLE = 'special_death_not_applicable';

// ── Result shape (exported — Story 4.6 consumes it; aliases the generic ladder shape) ──

export type SpecialDeathClauseEvaluation = LadderClauseEvaluation;
export type SpecialDeathLadderResult = LadderResult;

// ── Special-death-family thin wrappers over the generic ladder ─────────────────────

/**
 * Interpret the seven resolved special-death clauses against one resolved context and resolve the
 * family ladder — PURE + DETERMINISTIC. Delegates to the generic `evaluateLadder`, parameterized
 * by the special-death not-applicable slug. Every applicable clause's decision is a ROUTING slug,
 * never a deny (SM-1 C7).
 */
export function evaluateSpecialDeathLadder(
  resolvedClauses: ResolvedClause[],
  ctx: ResolvedEvaluationContext,
): SpecialDeathLadderResult {
  return evaluateLadder(resolvedClauses, ctx, SPECIAL_DEATH_NOT_APPLICABLE);
}

/** Historical / replay-correct special-death-family evaluation at a FIXED instant `at`. */
export async function evaluateSpecialDeathLadderAt(
  deps: EvaluateDeps,
  context: EvaluationContext,
  at: Date,
): Promise<SpecialDeathLadderResult> {
  return evaluateLadderAt(deps, context, at, SPECIAL_DEATH_CLAUSE_IDS, SPECIAL_DEATH_NOT_APPLICABLE);
}

/** Live special-death-family evaluation: resolves DB-authoritative `now()` ONCE and delegates. */
export async function evaluateSpecialDeathLadderLive(
  deps: EvaluateDeps,
  context: EvaluationContext,
): Promise<SpecialDeathLadderResult> {
  return evaluateLadderLive(deps, context, SPECIAL_DEATH_CLAUSE_IDS, SPECIAL_DEATH_NOT_APPLICABLE);
}

// ── R14 concealment — a single clause, NO ladder (SM-1 C7 flag seam) ────────────────
//
// R14 is its OWN clause family (`niy.concealment.r14`) with a single clause and no competing
// sub-clauses to select between — it needs NO ladder wrapper (no precedence selection). It is
// evaluated DIRECTLY via the Story 4.1 primitive against its one `clause_id`. Its output is a
// FLAG (`concealment_review_required`) emitted through the interpreter's existing `flag_if_true`
// mechanism (`interpret.ts`) — it surfaces in `EvaluationResult.result.specialFlags`, and the
// decision is a routing slug (`route_state_trustee_review`), NEVER a deny.

/** The R14 concealment clause id (its own single-clause family; NOT in the ladder). */
export const CONCEALMENT_CLAUSE_ID = 'niy.concealment.r14';

/** The special flag R14 raises when an undeclared, linked IMA condition is present (SM-1 C7). */
export const CONCEALMENT_REVIEW_FLAG = 'concealment_review_required';

/**
 * Historical / replay-correct R14 concealment evaluation at a FIXED instant `at`. Delegates to the
 * reviewed Story 4.1 `evaluateAt` against the single `niy.concealment.r14` clause (resolve →
 * interpret → memo → audit-on-compute). Returns `null` when the clause is not resolvable for this
 * pariwar at `at` (mirror the primitive). When the pre-derived `concealed_ima_condition_linked`
 * fact is true the result carries `specialFlags:[concealment_review_required]` and routes to State
 * Trustee review — NEVER a deny (SM-1 C7).
 */
export async function evaluateConcealmentAt(
  deps: EvaluateDeps,
  context: EvaluationContext,
  at: Date,
): Promise<EvaluationResult | null> {
  return evaluateAt(deps, ids.clauseId(CONCEALMENT_CLAUSE_ID), context, at);
}

/** Live R14 concealment evaluation: resolves DB-authoritative `now()` ONCE and delegates. */
export async function evaluateConcealmentLive(
  deps: EvaluateDeps,
  context: EvaluationContext,
): Promise<EvaluationResult | null> {
  return evaluate(deps, ids.clauseId(CONCEALMENT_CLAUSE_ID), context);
}
