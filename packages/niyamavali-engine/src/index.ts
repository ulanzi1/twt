// @twt/niyamavali-engine — the rule-evaluation engine primitive (Story 4.1).
//
// The FIRST and ONLY interpreter of the opaque `clause_versions.payload` (freeze row 14).
// Depends on @twt/domain (registry resolvers + member-state replay spine + idempotency
// store + audit writer + canonical-JSON hasher); domain must NEVER depend back.
//
// Public API:
//   · evaluate / evaluateAt — the DB shell (resolve → interpret → memo → audit)
//   · interpretClause       — the PURE deterministic core (DB-free; the determinism spine)
//   · cache-key + audit helpers — exported for the consuming surfaces (4.6 validity, Epic 6)
//   · all result / context / provenance types

export { evaluate, evaluateAt, type EvaluateDeps } from './evaluate.js';
export { interpretClause, OPERATOR_NAMES, COMPUTATION_NAMES } from './interpret.js';
export {
  evaluateR7Ladder,
  evaluateR7LadderAt,
  evaluateR7LadderLive,
  R7_CLAUSE_IDS,
  R7_CONTRIBUTION_FACT_KEYS,
  R7_NOT_APPLICABLE,
  type R7ClauseEvaluation,
  type R7ContributionFactKey,
  type R7LadderResult,
} from './r7-ladder.js';
export {
  evaluateR8Ladder,
  evaluateR8LadderAt,
  evaluateR8LadderLive,
  R8_CLAUSE_IDS,
  R8_CONTRIBUTION_FACT_KEYS,
  R8_CLAIM_FACT_KEYS,
  R8_NOT_APPLICABLE,
  type R8ClauseEvaluation,
  type R8ContributionFactKey,
  type R8ClaimFactKey,
  type R8LadderResult,
} from './r8-ladder.js';
export {
  evaluateLadder,
  evaluateLadderAt,
  evaluateLadderLive,
  type LadderClauseEvaluation,
  type LadderResult,
} from './ladder.js';
export {
  evaluateSpecialDeathLadder,
  evaluateSpecialDeathLadderAt,
  evaluateSpecialDeathLadderLive,
  evaluateConcealmentAt,
  evaluateConcealmentLive,
  SPECIAL_DEATH_CLAUSE_IDS,
  SPECIAL_DEATH_NOT_APPLICABLE,
  SPECIAL_DEATH_CLAIM_FACT_KEYS,
  CONCEALMENT_FACT_KEYS,
  CONCEALMENT_CLAUSE_ID,
  CONCEALMENT_REVIEW_FLAG,
  type SpecialDeathClauseEvaluation,
  type SpecialDeathClaimFactKey,
  type SpecialDeathLadderResult,
  type ConcealmentFactKey,
} from './special-death.js';
export {
  evaluateRetirementCoverageAt,
  evaluateRetirementCoverageLive,
  R12_CLAUSE_ID,
  R12_MEMBER_FACT_KEYS,
  R12_GRANTED_YEARS_KEY,
  R12_IS_RETIRED_KEY,
  RETIREMENT_COVERAGE_COMPUTED,
  RETIREMENT_COVERAGE_NOT_APPLICABLE,
  type R12MemberFactKey,
} from './retirement-coverage.js';
export {
  buildCacheKey,
  memberStateHash,
  niyamavaliVersionHash,
  type CacheKeyParts,
} from './cache-key.js';
export { auditCompute, type AuditActor, type AuditComputeInput } from './audit.js';
export type {
  BenefitMechanism,
  EvaluationContext,
  EvaluationResult,
  Facts,
  Provenance,
  ResolvedClause,
  ResolvedEvaluationContext,
  RuleOutcome,
  SubClauseResult,
} from './types.js';
