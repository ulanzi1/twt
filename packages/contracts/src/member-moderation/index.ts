// Member-moderation contracts barrel — Story 10.10 (Task 7).
//
// The wire enums (action / derived status / the two reason-code families — sync-guarded against the
// @twt/domain tuples) + the transport DTOs. Every route gates on the EXISTING `member.moderate` key
// at `dimension: 'pariwar'` and is STEP-UP gated — the first Epic-10 story that is.
//
// ⚠ The free-text rationale never appears on a LIST or ACTION response shape — the ONLY response
// that ever carries it is `ModerationRationaleResponse`, a single-item decrypt-on-demand read
// behind the same `member.moderate` gate. See dto.ts.

export {
  MODERATION_ACTIONS,
  ModerationAction,
  MODERATION_STATUSES,
  ModerationStatus,
  MODERATION_REASON_CODES,
  ModerationReasonCode,
  RESTORE_REASON_CODES,
  RestoreReasonCode,
  ALL_REASON_CODES,
  ReasonCode,
} from './enums.js';

export {
  EVIDENCE_REF_KINDS,
  type EvidenceRefKind,
  EVIDENCE_REFS_MAX,
  EVIDENCE_REF_MAX_LENGTH,
  EVIDENCE_REF_PATTERN,
  EvidenceRefDto,
  EvidenceRefsDto,
} from './evidence-refs.js';

export {
  MODERATION_DECISION_NOTE_MAX_CHARS,
  MODERATION_ESCALATION_MAX_CHARS,
  MODERATION_ESCALATION_MIN_CHARS,
  ModerateMemberRequest,
  ModerationActionResponse,
  ModerationHistoryEntryDto,
  ModerationHistoryResponse,
  ModeratedMemberDto,
  ModeratedMembersListResponse,
  ModerationRationaleResponse,
  AppendModerationGroundRequest,
  ModerationGroundDto,
  AppendModerationGroundResponse,
  ReasonCodeMetaDto,
  ReasonCodesListResponse,
} from './dto.js';

// Story 10.22 — the Niyamavali §8.8 moderation appeal (Decision `2026-08-15-121`).
// ⚠ The two shared constants are here rather than at their call sites because BOTH have silent
// failure modes: the step-up context is compared as a bare string with no registry (a typo on the
// OTP side yields an elevation that can never satisfy the gate), and the helpdesk subcategory has no
// allow-list (a typo routes just as cleanly to the same desk). ⛔ Never re-declare either.
export {
  MODERATION_APPEAL_STEP_UP_CONTEXT,
  MODERATION_APPEAL_SUBCATEGORY,
  MODERATION_APPEAL_HELPDESK_CATEGORY,
  APPEAL_FILED_VIA,
  AppealFiledVia,
  APPEAL_STATUSES,
  AppealStatus,
  APPEAL_OUTCOMES,
  AppealOutcome,
  APPEAL_GROUNDS_MIN_CHARS,
  APPEAL_GROUNDS_MAX_CHARS,
  APPEAL_REASONED_OUTCOME_MIN_CHARS,
  APPEAL_REASONED_OUTCOME_MAX_CHARS,
  FileModerationAppealRequest,
  FileModerationAppealOffPortalRequest,
  ModerationAppealFiledResponse,
  DecideModerationAppealRequest,
  ModerationAppealDecidedResponse,
  ModerationAppealDto,
  ModerationAppealsListResponse,
  ModerationAppealDetailResponse,
  MemberAppealContextResponse,
} from './appeal.js';
