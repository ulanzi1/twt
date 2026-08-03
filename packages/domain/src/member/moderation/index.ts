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
// ── The enforcement surface is `is_valid`, and ONLY `is_valid` (Decision 8) ──────────────────────
// `packages/validity-service/src/payload.ts` folds `moderationStatus` into `deriveIsValid`. That
// ONE edit is the whole enforcement surface: pool assignability, claim eligibility and the rules
// engine inherit suspension with NO change of their own. Do NOT add a moderation predicate to
// `assignable-roster.ts`, `peer-mesh-read.ts`, the niyamavali `member_state_in` operator, or any
// `TERMINAL_STATES` Set — that would fork the frozen AI-7-2 invariant
// ([[project_assignability_predicate_is_isvalid_only]]) into N places.

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
} from './reason-codes.js';

export {
  moderationStatusSchema,
  ModerationSuspendedPayloadSchema,
  ModerationTerminatedPayloadSchema,
  ModerationRestoredPayloadSchema,
  MODERATION_EVENT_PAYLOAD_SCHEMAS,
} from './events.js';

export {
  type ModerationOverlayEventInput,
  type ModerationOverlay,
  NO_MODERATION,
  evaluateModerationOverlay,
  getMemberModerationOverlay,
} from './overlay.js';

export {
  type InsertModerationActionInput,
  type ModerateMemberInput,
  type ModerateMemberResult,
  moderationResourceLocator,
  assertRationalePresent,
  assertReasonCodeAppliesTo,
  moderateMember,
} from './write.js';

// ⚠ The signup REJOIN-LOCK read is deliberately NOT here. It runs PRE-scope on the BYPASSRLS
// servicePool (`apps/api/.../member-auth.repo.ts`), where no `app.pariwar_id` is set — exactly the
// posture `member_withdrawals` already uses for the same guard (`member/withdrawal.ts:15-19`).
// Adding a tenant-scoped mirror of it here would be a second implementation of one rule.
export {
  type ModerationHistoryEntry,
  type ModeratedMemberEntry,
  type ListModeratedMembersOptions,
  listModerationHistoryForMember,
  listModeratedMembersForPariwar,
  getModerationActionRationale,
} from './read.js';

export {
  MODERATION_INVALID_STATE_CODE,
  MODERATION_REASON_CODE_INVALID_CODE,
  MODERATION_RATIONALE_REQUIRED_CODE,
  ModerationStateError,
  ModerationReasonCodeInvalidError,
  ModerationRationaleRequiredError,
} from './errors.js';
