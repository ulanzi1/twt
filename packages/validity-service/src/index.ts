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
  type ValidityServiceDeps,
  type ValidityServiceOptions,
} from './service.js';

export type {
  MemberValidityPayload,
  RedactedMemberValidityPayload,
  ApplicableClause,
  ProvenanceEntry,
  LockInStatusPayload,
  VyawasthaShulkStatusPayload,
  ContributionHistoryUnavailable,
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
  VALID_STATES,
  ACTIVE_STATES,
  CONTRIBUTION_UNAVAILABLE,
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
  calendarYearsBetween,
  ceilDaysBetween,
} from './calendar.js';
