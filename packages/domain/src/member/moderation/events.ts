// The `member.moderation.*` event payload schemas — Story 10.10 (Task 1; AC1, AC3).
//
// Three events on the MEMBER's OWN stream (`stream_id = member_id`), registered in
// `EVENT_TYPE_REGISTRY` and folded by `evaluateModerationOverlay`. Three-segment dotted names are
// legal — `cycle.spawn.started` / `cycle.spawn.aborted` (`packages/events/src/registry.ts:332,344`)
// set the precedent, and `architecture.md:3860` uses `member.suspended` as its own dotted-name
// example. The epic's spellings are used VERBATIM: event-name drift is a known, expensive failure
// class ([[project_contribution_event_name_contract]]).
//
// ── These are lifecycle NON-transitions (Decision 1) ─────────────────────────────────────────────
// Moderation is an OVERLAY orthogonal to `members.state`. All three events fold through
// `memberStateMachine` as IDENTITY (its `default: return state` arm), so `from_state === to_state`
// on EVERY one and `members.state` provably cannot move. A test pins exactly that.
//
// ── ⚠ WHAT THE PAYLOAD MUST NEVER CARRY (R1 — `events_log.payload` is plaintext JSONB) ──────────
// NO rationale free-text. NO member name. NO actor display name. Only the audit shape + the bounded
// non-PII `reason_code` + the overlay's own from/to. This is the `nominees_declared` /
// `medical_disclosed` / `address_updated` discipline: the sensitive bytes live Tier-1-encrypted in
// `member_moderation_actions.decision_note_ciphertext`, and the event carries only the CODE.

import { z } from 'zod';

import { auditShape } from '../audit-shape.js';
import { MODERATION_REASON_CODES, RESTORE_REASON_CODES } from './reason-codes.js';
import { MODERATION_STATUSES } from './status.js';

/** A moderation-status literal, derived from the one tuple in status.ts. */
export const moderationStatusSchema = z.enum(MODERATION_STATUSES);

/** The overlay from/to pair every moderation payload carries (the audit shape's overlay mirror). */
const overlayShape = {
  moderation_from: moderationStatusSchema,
  moderation_to: moderationStatusSchema,
};

/**
 * Suspension recorded (`none → suspended`). FR-56. Carries the bounded moderation reason CODE only
 * — the mandatory free-text rationale is Tier-1 encrypted in `member_moderation_actions`.
 */
export const ModerationSuspendedPayloadSchema = z
  .object({
    ...auditShape,
    ...overlayShape,
    reason_code: z.enum(MODERATION_REASON_CODES),
  })
  .strict();

/**
 * Termination recorded (`suspended → terminated`; NEVER from `none` — Decision 2). FR-56 → FR-6:
 * the 12-month rejoin lock instant lands in `member_moderation_actions.rejoin_permitted_at`, NOT
 * here (a payload date would become a second source of truth for the signup guard).
 */
export const ModerationTerminatedPayloadSchema = z
  .object({
    ...auditShape,
    ...overlayShape,
    reason_code: z.enum(MODERATION_REASON_CODES),
  })
  .strict();

/** Restoration recorded (`suspended | terminated → none`). FR-56; the restore-code family. */
export const ModerationRestoredPayloadSchema = z
  .object({
    ...auditShape,
    ...overlayShape,
    reason_code: z.enum(RESTORE_REASON_CODES),
  })
  .strict();

/**
 * A SUPPORTING ground appended to an existing moderation action — Story 10.20 (Task 7; AC9, WS-E).
 *
 * ── ⚠ `auditShape` IS SPREAD; `overlayShape` DELIBERATELY IS NOT ────────────────────────────────
 * `auditShape` is REQUIRED, not decoration: `projectMemberState` parses the payload against this
 * schema BEFORE the insert, every `member.*` payload carries `from_state`/`to_state`/`trigger`/
 * `actor`, and this event's own `from_state === to_state` identity test would have nothing to
 * assert without them.
 *
 * `overlayShape` is omitted because NO MODERATION STATUS MOVES ON AN APPEND. Claiming a
 * `moderation_from`/`moderation_to` pair here would be a false statement about the overlay — the
 * member's standing is exactly what it was a moment ago, and a later reader folding this stream must
 * not be told otherwise.
 *
 * ── ⛔ WHAT THIS PAYLOAD MUST NEVER CARRY (R1) ──────────────────────────────────────────────────
 * NO note. NO evidence refs. NO actor display. No free text of ANY kind — `events_log.payload` is
 * plaintext JSONB. Only the audit shape, the bounded registry `code`, and the id of the ground this
 * one supersedes.
 *
 * ⛔ `is_primary` is NOT here, and the omission is reasoned rather than accidental: the primary
 * ground is written in the ACTION's own transaction and is already on the timeline via that action's
 * `member.moderation.suspended` / `.terminated` event `reason_code`. Appends are supporting-only by
 * construction, so `is_primary` would be a field that is ALWAYS `false`. A test pins that no
 * `ground-appended` event is ever emitted for a primary ground.
 */
export const ModerationGroundAppendedPayloadSchema = z
  .object({
    ...auditShape,
    code: z.enum([...MODERATION_REASON_CODES, ...RESTORE_REASON_CODES]),
    /** The SUPPORTING ground this one replaces, when it replaces one. Never a primary (23505). */
    supersedes_ground_id: z.string().uuid().nullable(),
  })
  .strict();

/** type → payload-schema map for the moderation events (consumed by `member/events.ts`). */
export const MODERATION_EVENT_PAYLOAD_SCHEMAS = {
  'member.moderation.suspended': ModerationSuspendedPayloadSchema,
  'member.moderation.terminated': ModerationTerminatedPayloadSchema,
  'member.moderation.restored': ModerationRestoredPayloadSchema,
  'member.moderation.ground-appended': ModerationGroundAppendedPayloadSchema,
} as const;
