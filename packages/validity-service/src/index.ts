// @twt/validity-service — the FR-12A Member Validity Service (Story 4.6).
//
// The FIRST `[SURFACE]` of Epic 4: the canonical "is this member valid right now?" service. It
// COMPOSES the Story 4.1 engine primitive + its consumers (R12 today; R7/R8/R5-R9/R14 as their
// producers land) into ONE deterministic, idempotent, provenance-carrying payload, and is the first
// real PRODUCER of the caller-injected facts those consumers read. Framework-agnostic (D1-A) — every
// surface (apps/admin, apps/mobile, apps/jobs, Epic 6/10) consumes the SAME service, so the redaction
// + audit contract lives here, not per-app (D5).
//
// Public API:
//   · getValidity / getValidityAt — the canonical payload (live / replay-correct-historical)
//   · the payload contract types + the sub-object shapes
//   · the pure producer + payload + redaction + calendar seams (unit-testable; the determinism spine)

export {
  getValidity,
  getValidityAt,
  auditValidityRead,
  type ValidityServiceDeps,
  type ValidityServiceOptions,
} from './service.js';

// Story 4.8 — the per-cohort cache-aside wrapper (the p95<200ms@4L delivery + the conservative-recompute
// fallback that makes stale validity structurally impossible) + its observability contract.
export { getValidityCached, type ValidityCachedOptions } from './cache.js';
export {
  FallbackRateMonitor,
  NOOP_CACHE_OBSERVER,
  type ValidityCacheObserver,
  type ValidityCacheEvent,
  type ValidityCacheOutcome,
  type ValidityCacheFallbackReason,
  type FallbackRateMonitorOptions,
  type FallbackRateSnapshot,
} from './cache-observability.js';

export type {
  MemberValidityPayload,
  RedactedMemberValidityPayload,
  ApplicableClause,
  ProvenanceEntry,
  LockInStatusPayload,
  VyawasthaShulkStatusPayload,
  ContributionHistoryUnavailable,
  ContributionHistoryAvailable,
  ContributionHistorySummary,
  MedicalDisclosureFlagsPayload,
  RetirementCoveragePayload,
  RetirementCoverageUnavailable,
} from './types.js';

export {
  assemblePayload,
  assembleClauses,
  computeValidityPayloadHash,
  projectRetirementCoverage,
  projectLockInStatus,
  deriveIsValid,
  deriveIsActive,
  // Story 10.17 — the DONOR-ROSTER predicate (`is_assignable`), distinct from `is_valid` (coverage).
  deriveIsAssignable,
  // Story 10.10 — the `suspended_per_<code>` / `terminated_per_<code>` special-flag builder.
  moderationSpecialFlag,
  VALID_STATES,
  ACTIVE_STATES,
  CONTRIBUTION_UNAVAILABLE,
  CONTRIBUTION_R7_REGISTRY_UNAVAILABLE,
  EMPTY_REGISTRY_VERSION,
  type AssembleInput,
  type AssembledClauses,
} from './payload.js';

export {
  deriveRetirementFacts,
  retirementFactsToBag,
  produceRetirementFacts,
  deriveMedicalDisclosureFlags,
  produceMedicalDisclosureFlags,
  // Story 10.24 — the contribution-fact producer (the seam Story 4.2 deferred to "Epic 8/9").
  deriveContributionFacts,
  contributionFactsToBag,
  contributionFactsToSummary,
  produceContributionFacts,
  CONTRIBUTION_LAPSE_POLICY,
  R7_SUPPLIED_FACT_KEYS,
  R7_HELD_FACTS,
  type ContributionFacts,
  type ContributionFactsInput,
  type ContributionLapsePolicy,
  type RetirementFacts,
  type RetirementFactsInput,
  type LapseNettingPolicy,
  type ConcealmentAssessment,
  type MedicalDisclosureRecord,
} from './producer.js';

export {
  VALIDITY_RULE_ORDER,
  buildRuleDescriptors,
  evaluateOrderedClauses,
  // Story 10.24 — the R7(C)–(F) activation/hold constants + the APPLIED-ONLY family evaluator (D2/D4).
  R7_ACTIVATED_CLAUSE_IDS,
  R7_HELD_CLAUSES,
  R7_REGISTRY_UNPROVISIONED_PRODUCER,
  evaluateAppliedR7ClauseSlots,
  type R7ClauseId,
  type R7HeldClause,
  type R7ClauseEvaluation,
  type RuleDescriptor,
  type AvailableFacts,
  type ClauseEvalSlot,
} from './rules.js';

export {
  assertCanReadValidity,
  redactForCaller,
  canSeeConcealment,
  MEMBER_VIEW_VALIDITY_KEY,
  type ValidityCaller,
} from './redaction.js';

export {
  addCalendarYears,
  addCalendarDays,
  addCalendarMonths,
  calendarYearsBetween,
  calendarMonthsBetween,
  ceilDaysBetween,
} from './calendar.js';

// Story 10.24 — the Trustee-Lite R7 candidate scan (the supply side of Story 10.11's named seam).
// BOUNDED over the Pariwar (7 queries, member-count-independent), APPLIED-clauses-only (D2).
export {
  scanR7ViolatorCandidates,
  type R7ViolatorCandidate,
  type R7CandidateClause,
} from './r7-candidate-scan.js';
