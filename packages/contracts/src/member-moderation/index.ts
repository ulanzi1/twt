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
  MODERATION_RATIONALE_MAX_CHARS,
  ModerateMemberRequest,
  ModerationActionResponse,
  ModerationHistoryEntryDto,
  ModerationHistoryResponse,
  ModeratedMemberDto,
  ModeratedMembersListResponse,
  ModerationRationaleResponse,
  ReasonCodeMetaDto,
  ReasonCodesListResponse,
} from './dto.js';
