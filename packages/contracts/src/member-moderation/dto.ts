// Member-moderation transport DTOs — Story 10.10 (Task 7; AC3, AC9).
//
// Pure Zod, `.strict()` throughout, snake_case wire (domain camelCase — watch the
// [[project_story_validate_footguns]] drift: `reason_code`/`reasonCode`,
// `rejoin_permitted_at`/`rejoinPermittedAt`, `actor_display`/`actorDisplay`,
// `moderation_action_id`/`moderationActionId`). NO `@twt/domain` import (the RN Metro bundle
// boundary).
//
// ── ⚠ `rationale` is INBOUND-ONLY. It NEVER appears on a response ────────────────────────────────
// The free-text rationale is Tier-1 encrypted at rest (`member_moderation_actions.
// rationale_ciphertext`) and the ciphertext is NEVER projected into a DTO — not into the history
// list, not into the action response, not anywhere. The admin console decrypts a SINGLE rationale on
// demand through a dedicated read; everything else carries only the bounded, non-PII reason CODE.
// If you are adding a `rationale` field to a response shape below, stop and re-read AC3.

import { z } from 'zod';

import { Iso8601Datetime, UuidString } from '../_common/primitives.js';
import { ModerationAction, ModerationStatus, ReasonCode } from './enums.js';

/**
 * The free-text rationale. REQUIRED on every action (AC3) — deliberately stricter than the UX
 * `<ReasonCodeDropdown>` `other-text-required` state, which asks for text only on an "other" code.
 * `.trim()` runs BEFORE the length check, so a whitespace-only string is a schema failure here and
 * the domain's `ModerationRationaleRequiredError` is the defence-in-depth backstop behind it.
 */
const Rationale = z.string().trim().min(1).max(4_000);

/**
 * The body of a suspend / terminate / restore request. The ACTION itself is carried by the ROUTE
 * (`…/moderation/suspend`), not the body — so a client cannot post a `restore` body to the
 * `terminate` endpoint, and the step-up action context (which is per-route) can never disagree with
 * the action being performed.
 */
export const ModerateMemberRequest = z
  .object({
    reason_code: ReasonCode,
    rationale: Rationale,
  })
  .strict();
export type ModerateMemberRequest = z.output<typeof ModerateMemberRequest>;

/** The result of a moderation action — the new derived standing plus the decision record's id. */
export const ModerationActionResponse = z
  .object({
    moderation_action_id: UuidString,
    member_id: UuidString,
    action: ModerationAction,
    reason_code: ReasonCode,
    /** The overlay status BEFORE the action (what the legality check ran against). */
    from_status: ModerationStatus,
    /** The overlay status AFTER the action. */
    to_status: ModerationStatus,
    actor_display: z.string(),
    /** FR-56 → FR-6: set on `terminate` only; null for suspend/restore. */
    rejoin_permitted_at: Iso8601Datetime.nullable(),
    acted_at: Iso8601Datetime,
  })
  .strict();
export type ModerationActionResponse = z.output<typeof ModerationActionResponse>;

/**
 * One entry of a member's moderation history — the audit trail the admin record renders.
 * ⚠ No rationale field, by design (see the header).
 */
export const ModerationHistoryEntryDto = z
  .object({
    moderation_action_id: UuidString,
    action: ModerationAction,
    reason_code: ReasonCode,
    actor_id: UuidString,
    actor_display: z.string(),
    rejoin_permitted_at: Iso8601Datetime.nullable(),
    acted_at: Iso8601Datetime,
  })
  .strict();
export type ModerationHistoryEntryDto = z.output<typeof ModerationHistoryEntryDto>;

/** A member's CURRENT moderation standing + their history, in one read. */
export const ModerationHistoryResponse = z
  .object({
    member_id: UuidString,
    /** The DERIVED current standing (Decision 1) — folded from events, never a stored column. */
    current_status: ModerationStatus,
    /** The reason code behind the current standing; null when `current_status` is `none`. */
    current_reason_code: ReasonCode.nullable(),
    /** When the current standing began; null when `none`. */
    since: Iso8601Datetime.nullable(),
    /**
     * The actions LEGAL from `current_status` right now (AC9). Server-derived from the SAME
     * `nextModerationStatus` reducer the write path uses, so the console's button enablement can
     * never disagree with what the server will accept — the client re-implements no legality rules.
     */
    legal_actions: z.array(ModerationAction),
    entries: z.array(ModerationHistoryEntryDto),
  })
  .strict();
export type ModerationHistoryResponse = z.output<typeof ModerationHistoryResponse>;

/** One entry of the Pariwar-wide moderated-members list (Decision 9). */
export const ModeratedMemberDto = z
  .object({
    member_id: UuidString,
    /** Only `suspended` / `terminated` ever appear — an unmoderated member is not in this list. */
    status: z.enum(['suspended', 'terminated']),
    reason_code: ReasonCode,
    actor_id: UuidString,
    actor_display: z.string(),
    since: Iso8601Datetime,
    rejoin_permitted_at: Iso8601Datetime.nullable(),
  })
  .strict();
export type ModeratedMemberDto = z.output<typeof ModeratedMemberDto>;

/**
 * The moderated-members list (Decision 9) — what Story 10.11's Trustee-Lite view consumes.
 *
 * ⚠ FORWARD COMMITMENT, recorded not hidden: `epics.md:3564` expects 10.11 to sort moderation items
 * "by deadline-proximity" with "category + age + severity". Moderation items carry NO deadline and
 * NO severity — Story 10.10's AC block defines no such concept — so 10.11 CANNOT sort this list as
 * written. Routed to PM before 10.11 is drafted rather than fabricating a deadline field to make
 * the sort work ([[feedback_record_unattested_no_backfill]]).
 */
export const ModeratedMembersListResponse = z
  .object({
    items: z.array(ModeratedMemberDto),
    has_more: z.boolean(),
  })
  .strict();
export type ModeratedMembersListResponse = z.output<typeof ModeratedMembersListResponse>;

/** Registry metadata for one reason code — what the admin dropdown renders + filters on (AC9). */
export const ReasonCodeMetaDto = z
  .object({
    code: ReasonCode,
    applies_to: z.array(ModerationAction),
    niyamavali_ref: z.string(),
    label: z.string(),
  })
  .strict();
export type ReasonCodeMetaDto = z.output<typeof ReasonCodeMetaDto>;
