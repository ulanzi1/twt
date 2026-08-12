// `member.moderation` namespace barrel — Story 10.10.
//
// The member-moderation `[SURFACE]`: suspend / terminate / restore with registry-driven reason
// codes, a mandatory Tier-1-encrypted rationale, full attribution and step-up gating.
//
// ── THE ONE THING TO KNOW (Decision 1) ───────────────────────────────────────────────────────────
// Moderation is an event-derived OVERLAY orthogonal to the member lifecycle machine — the shipped
// `member/overlay.ts` (account-frozen) shape. `MEMBER_LIFECYCLE_STATES` is UNCHANGED: no
// `ALTER TYPE`, no new enum label, no lifecycle-reducer arm, no projector edit, no
// `app.member_state_writer` trigger change, and no addition to the `member-state-invariant` CI-gate
// allowlist. All three `member.moderation.*` events are IDENTITY through `memberStateMachine`.
//
// ── The enforcement surface: TWO pre-derived predicates (Decision 8, AMENDED by Story 10.17) ─────
// `packages/validity-service/src/payload.ts` folds `moderationStatus` into the payload derivations —
// `deriveIsValid` (COVERAGE, suspended ⇒ false) and `deriveIsAssignable` (ROSTER, suspended ⇒ TRUE;
// only termination removes it). Story 10.10's Decision 8 claimed `is_valid` alone was the whole
// enforcement surface; that was only ever true for pool assignability (claim eligibility runs the
// human R5/R8 ladder and the niyamavali engine produces INPUTS to the payload — neither read
// `is_valid`). **Canonical amendment record:** `apps/jobs/src/assignable-roster.ts`'s doc block on
// `isMemberAssignable` — read that, not a second copy of the rationale, here.
//
// Do NOT add a moderation predicate to `assignable-roster.ts`, `peer-mesh-read.ts`, the niyamavali
// `member_state_in` operator, or any `TERMINAL_STATES` Set — that would fork the AI-7-2 invariant
// ([[project_assignability_predicate_is_isvalid_only]]) into N places. The invariant survives Story
// 10.17 precisely BECAUSE the new field is pre-derived here and read as ONE field there.

export {
  MODERATION_STATUSES,
  type ModerationStatus,
  MODERATION_ACTIONS,
  type ModerationAction,
  nextModerationStatus,
  isLegalModerationTransition,
  MODERATION_ACTION_EVENT_TYPES,
  MODERATION_EVENT_TYPES,
  MODERATION_EVENT_TYPE_ACTIONS,
  type ModerationEventType,
  moderationActionForEventType,
} from './status.js';

export {
  MODERATION_REASON_CODES,
  type ModerationReasonCode,
  RESTORE_REASON_CODES,
  type RestoreReasonCode,
  ALL_REASON_CODES,
  type ReasonCode,
  type ReasonCodeMeta,
  REASON_CODE_REGISTRY,
  isReasonCode,
  reasonCodeMeta,
  reasonCodeAppliesTo,
  reasonCodesForAction,
  listReasonCodeMeta,
  assertReasonCodeAppliesTo,
} from './reason-codes.js';

export {
  moderationStatusSchema,
  ModerationSuspendedPayloadSchema,
  ModerationTerminatedPayloadSchema,
  ModerationRestoredPayloadSchema,
  ModerationGroundAppendedPayloadSchema,
  MODERATION_EVENT_PAYLOAD_SCHEMAS,
} from './events.js';

export {
  type ModerationOverlayEventInput,
  type ModerationOverlay,
  NO_MODERATION,
  evaluateModerationOverlay,
  getMemberModerationOverlay,
  getCurrentMemberModerationOverlay,
} from './overlay.js';

export {
  type InsertModerationActionInput,
  type ModerateMemberInput,
  type ModerateMemberResult,
  moderationResourceLocator,
  assertRationalePresent,
  moderateMember,
} from './write.js';

// ⚠ The signup REJOIN-LOCK read is deliberately NOT here. It runs PRE-scope on the BYPASSRLS
// servicePool (`apps/api/.../member-auth.repo.ts`), where no `app.pariwar_id` is set — exactly the
// posture `member_withdrawals` already uses for the same guard (`member/withdrawal.ts:15-19`).
// Adding a tenant-scoped mirror of it here would be a second implementation of one rule.
export {
  type ModerationHistoryEntry,
  type ModerationHistoryPage,
  type ModeratedMemberEntry,
  type ListModeratedMembersOptions,
  listModerationHistoryForMember,
  listModeratedMembersForPariwar,
  getModerationActionRationale,
} from './read.js';

export {
  EVIDENCE_REF_KINDS,
  type EvidenceRefKind,
  EVIDENCE_REFS_MAX,
  EVIDENCE_REF_MAX_LENGTH,
  EVIDENCE_REF_PATTERN,
  EVIDENCE_REFS_SQL_VALIDATOR,
  evidenceRefSchema,
  evidenceRefsSchema,
  type EvidenceRef,
  assertEvidenceRefs,
} from './evidence-refs.js';

export {
  ESCALATION_PART_MIN_CHARS,
  ESCALATION_PART_MAX_CHARS,
  type EscalationJustificationInput,
  type EscalationJustificationPlaintext,
  normalizeEscalationPart,
  assertEscalationJustification,
  assertImmediateTerminationReason,
} from './escalation.js';

export {
  MODERATION_GROUND_APPENDED_EVENT,
  type ModerationGround,
  type InsertPrimaryGroundInput,
  type AppendGroundInput,
  type AppendGroundResult,
  insertPrimaryGround,
  appendModerationGround,
  listGroundsForActions,
  moderationGroundResourceLocator,
} from './grounds.js';

export {
  MODERATION_DWELL_POLICY_CLAUSE_ID,
  ModerationDwellPolicyPayloadSchema,
  type ModerationDwellPolicyPayload,
  type ResolvedModerationDwellPolicy,
  resolveModerationDwellPolicy,
  terminationAvailableAt,
  isDwellElapsed,
  getProducingSuspensionActedAt,
} from './dwell.js';

export {
  MODERATION_INVALID_STATE_CODE,
  MODERATION_REASON_CODE_INVALID_CODE,
  MODERATION_RATIONALE_REQUIRED_CODE,
  MODERATION_ESCALATION_REQUIRED_CODE,
  MODERATION_ESCALATION_NOT_APPLICABLE_CODE,
  MODERATION_ESCALATION_RESTATEMENT_CODE,
  MODERATION_EVIDENCE_REF_INVALID_CODE,
  MODERATION_DWELL_NOT_ELAPSED_CODE,
  MODERATION_DWELL_UNPROVISIONED_CODE,
  MODERATION_ACTION_NOT_FOUND_CODE,
  MODERATION_GROUND_NOT_FOUND_CODE,
  MODERATION_PRIMARY_GROUND_IMMUTABLE_CODE,
  type EscalationPart,
  ModerationStateError,
  ModerationReasonCodeInvalidError,
  ModerationRationaleRequiredError,
  ModerationEscalationRequiredError,
  ModerationEscalationNotApplicableError,
  ModerationEscalationRestatementError,
  ModerationEvidenceRefInvalidError,
  ModerationDwellNotElapsedError,
  ModerationDwellPolicyUnprovisionedError,
  ModerationActionNotFoundError,
  ModerationGroundNotFoundError,
  ModerationPrimaryGroundImmutableError,
} from './errors.js';
