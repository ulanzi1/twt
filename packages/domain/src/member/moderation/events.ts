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
// `member_moderation_actions.rationale_ciphertext`, and the event carries only the CODE.

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

/** type → payload-schema map for the three moderation events (consumed by `member/events.ts`). */
export const MODERATION_EVENT_PAYLOAD_SCHEMAS = {
  'member.moderation.suspended': ModerationSuspendedPayloadSchema,
  'member.moderation.terminated': ModerationTerminatedPayloadSchema,
  'member.moderation.restored': ModerationRestoredPayloadSchema,
} as const;
