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
import { APPEAL_FILED_VIA, APPEAL_OUTCOMES } from './appeal-vocabulary.js';
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

/**
 * An appeal FILED against a moderation act — Story 10.22 (AC4). Niyamavali §8.8, ratified by
 * Decision `2026-08-15-121`.
 *
 * ── ⚠ `auditShape` IS SPREAD; `overlayShape` DELIBERATELY IS NOT ────────────────────────────────
 * The `ground-appended` template, verbatim, for the same reason: **NO MODERATION STATUS MOVES ON A
 * FILING.** §8.8 states expressly that "the filing of an appeal does not suspend the act appealed
 * against" — a suspended member remains suspended and a terminated member's access does not return.
 * Claiming a `moderation_from`/`moderation_to` pair here would be a false statement about the
 * member's standing, and a later reader folding this stream must not be told otherwise.
 * `auditShape` is REQUIRED, not decoration: `projectMemberState` parses the payload against this
 * schema before the insert, and the `from_state === to_state` identity test needs those fields.
 *
 * ── ⛔ WHAT THIS PAYLOAD MUST NEVER CARRY (R1 — `events_log.payload` is plaintext JSONB) ─────────
 * ⛔ NO GROUNDS TEXT. The member's grounds of appeal are member-authored free text and live Tier-1
 * encrypted in `member_moderation_appeals.grounds_ciphertext`. NO member name. NO actor display.
 * No free text of ANY kind. Only the audit shape, the bounded `filed_via` token, and two ids.
 */
export const ModerationAppealFiledPayloadSchema = z
  .object({
    ...auditShape,
    /** Which of the two ruled intake surfaces produced the record. Bounded, non-PII. */
    filed_via: z.enum(APPEAL_FILED_VIA),
    /** The appeal record this event announces. */
    appeal_id: z.string().uuid(),
    /** The moderation act under appeal — §8.8 identifies the appeal by the act's §8.6 record. */
    moderation_action_id: z.string().uuid(),
  })
  .strict();

/**
 * An appeal DETERMINED — Story 10.22 (AC4). Niyamavali §8.8.
 *
 * ── ⚠ `overlayShape` IS OMITTED HERE TOO, AND THIS IS THE LOAD-BEARING ONE ──────────────────────
 * ⛔ An `allowed` outcome does **NOT** move the overlay. §8.8: an allowed appeal **DIRECTS** that the
 * act be undone; it does not undo it. The restore is a subsequent, separately-attributed act through
 * the existing `POST …/moderation` path, carrying its own reason code, its own Decision Note, its own
 * dwell posture, and — from `terminated` — the Panel-exclusive `member.restore_terminated` check.
 * Spreading `overlayShape` here out of habit would create a SECOND moderation write path that
 * bypasses §8.6's record entirely. A test folds a stream containing both appeal events through
 * `evaluateModerationOverlay` and asserts the result is byte-identical to the same stream without
 * them.
 *
 * ── ⛔ WHAT THIS PAYLOAD MUST NEVER CARRY (R1) ──────────────────────────────────────────────────
 * ⛔ NO OUTCOME PROSE. The reasoned outcome §8.8 requires is adjudicator-authored free text and lives
 * Tier-1 encrypted in `member_moderation_appeals.reasoned_outcome_ciphertext`. NO adjudicator display
 * name — the attribution snapshot lives on the record, not on the timeline. Only the audit shape, the
 * bounded `outcome` token, and two ids.
 */
export const ModerationAppealDecidedPayloadSchema = z
  .object({
    ...auditShape,
    /** `upheld` | `allowed`. Bounded, non-PII. ⛔ There is no third `varied` outcome (§8.8). */
    outcome: z.enum(APPEAL_OUTCOMES),
    appeal_id: z.string().uuid(),
    moderation_action_id: z.string().uuid(),
  })
  .strict();

/** type → payload-schema map for the moderation events (consumed by `member/events.ts`). */
export const MODERATION_EVENT_PAYLOAD_SCHEMAS = {
  'member.moderation.suspended': ModerationSuspendedPayloadSchema,
  'member.moderation.terminated': ModerationTerminatedPayloadSchema,
  'member.moderation.restored': ModerationRestoredPayloadSchema,
  'member.moderation.ground-appended': ModerationGroundAppendedPayloadSchema,
  // Story 10.22 — Niyamavali §8.8. ⛔ Both OMIT `overlayShape`; neither moves the overlay. They are
  // deliberately absent from `MODERATION_EVENT_TYPES` / `MODERATION_ACTION_EVENT_TYPES` for the same
  // reason `ground-appended` is: those tuples are the ACTION-BEARING three, and
  // `moderationActionForEventType` returning null for these types is CORRECT, not a gap to close.
  'member.moderation.appeal-filed': ModerationAppealFiledPayloadSchema,
  'member.moderation.appeal-decided': ModerationAppealDecidedPayloadSchema,
} as const;
