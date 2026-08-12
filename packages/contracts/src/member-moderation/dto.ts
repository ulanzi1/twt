// Member-moderation transport DTOs — Story 10.10 (Task 7; AC3, AC9).
//
// Pure Zod, `.strict()` throughout, snake_case wire (domain camelCase — watch the
// [[project_story_validate_footguns]] drift: `reason_code`/`reasonCode`,
// `rejoin_permitted_at`/`rejoinPermittedAt`, `actor_display`/`actorDisplay`,
// `moderation_action_id`/`moderationActionId`). NO `@twt/domain` import (the RN Metro bundle
// boundary).
//
// ── ⚠ `rationale` is INBOUND-ONLY on every LIST/ACTION shape; the ciphertext NEVER appears ────────
// The free-text rationale is Tier-1 encrypted at rest (`member_moderation_actions.
// decision_note_ciphertext`) and the ciphertext is NEVER projected into a DTO — not into the history
// list, not into the action response, not anywhere. The ONE exception is
// `ModerationRationaleResponse`: a single-item, decrypt-on-demand read (behind the same
// `member.moderate` gate) that carries the PLAINTEXT rationale for exactly one action, never the
// ciphertext and never a list. If you are adding a `rationale` field to any OTHER response shape
// below, stop and re-read AC3.

import { z } from 'zod';

import { Iso8601Datetime, UuidString } from '../_common/primitives.js';
import { ModerationAction, ModerationStatus, ReasonCode } from './enums.js';
import { EvidenceRefDto, EvidenceRefsDto } from './evidence-refs.js';

/**
 * The free-text rationale. REQUIRED on every action (AC3) — deliberately stricter than the UX
 * `<ReasonCodeDropdown>` `other-text-required` state, which asks for text only on an "other" code.
 * `.trim()` runs BEFORE the length check, so a whitespace-only string is a schema failure here and
 * the domain's `ModerationRationaleRequiredError` is the defence-in-depth backstop behind it.
 */
/**
 * The DECISION NOTE's max length, EXPORTED so the admin textarea's `maxLength` reads the same number
 * the server validates against (review follow-up). It was previously hand-copied into
 * `ModerationStrip.tsx` with a "mirrors the contracts DTO" comment and no sync-guard — the exact
 * duplication-by-value shape this surface's earlier review pass removed from the reason-code
 * registry. Raising it here alone would silently truncate the operator's text at the old value;
 * lowering it would let the client accept text the server then 400s.
 *
 * ⚠ RENAMED from `MODERATION_RATIONALE_MAX_CHARS` by Story 10.20 (AC12), alongside the column rename
 * `rationale_ciphertext` → `decision_note_ciphertext`. The old name described a field that was asked
 * to answer three questions at once; the record now separates them, and a constant still saying
 * "rationale" would name a field that no longer exists.
 */
export const MODERATION_DECISION_NOTE_MAX_CHARS = 4_000;

const DecisionNote = z.string().trim().min(1).max(MODERATION_DECISION_NOTE_MAX_CHARS);

/**
 * The minimum-substance floor for each escalation part (Story 10.20, AC6). Value-aligned with
 * `ESCALATION_PART_MIN_CHARS` in `@twt/domain` and pinned by the drift guard.
 *
 * ⚠ A FLOOR IS NOT A QUALITY TEST. It exists to reject `"n/a"`, not to judge reasoning.
 */
export const MODERATION_ESCALATION_MIN_CHARS = 40;

/**
 * One part of the two-part escalation justification. Same cap as the Decision Note — this is
 * governance-grade prose, not a label.
 */
const EscalationPart = z.string().trim().min(1).max(MODERATION_DECISION_NOTE_MAX_CHARS);

/**
 * The body of a suspend / terminate / restore request. The ACTION itself is carried by the ROUTE
 * (`…/moderation/suspend`), not the body — so a client cannot post a `restore` body to the
 * `terminate` endpoint, and the step-up action context (which is per-route) can never disagree with
 * the action being performed.
 *
 * ── ⚠ Why the escalation parts are OPTIONAL HERE and REQUIRED ON `terminate` ─────────────────────
 * ONE request schema serves all three routes (see above), so a `.required()` here would break
 * `suspend` and `restore`. The `iff` is therefore enforced where it can see the action: the route
 * handler (`assertEscalationJustification`, a typed 422 naming which part failed and why), backed by
 * the domain presence backstop and — structurally, on every write path including raw SQL — by
 * migration 0099's `member_moderation_actions_escalation_iff_terminate` CHECK.
 * ⛔ Do NOT "tidy" this into a discriminated union on an action field in the body: the action's
 * absence from the body is what keeps it from disagreeing with the route's step-up context.
 *
 * ⛔ TWO SEPARATE FIELDS, NEVER ONE (D2). `epics.md:3851` requires the two parts be "separately
 * answerable" and neither "pre-filled from the other"; one field (or a nested object) lets a UI
 * concatenate them and satisfy a presence check with a single paragraph.
 */
export const ModerateMemberRequest = z
  .object({
    reason_code: ReasonCode,
    /** The governance-grade Decision Note. Required on EVERY action. */
    rationale: DecisionNote,
    /** `terminate` only — (a) why SUSPENSION is inadequate. */
    escalation_inadequacy: EscalationPart.optional(),
    /** `terminate` only — (b) why TERMINATION is proportionate. */
    escalation_proportionality: EscalationPart.optional(),
    /** References only, never prose (AC4). Absent ⇒ no references. */
    evidence_refs: EvidenceRefsDto.optional(),
    /**
     * `terminate` only — the recorded reason for invoking the IMMEDIATE-TERMINATION exception (AC8).
     *
     * ⭐ ITS PRESENCE SELECTS THE ROUTE. Absent ⇒ the ordinary path, gated by the 7-day dwell.
     * Present ⇒ the exception the Panel preserved (Q4.1), which the dwell does not close.
     * ⛔ A SEPARATE field from both escalation parts, never a re-use of either: they answer *why
     * termination*, this answers *why now*. Collapsing them makes both unfalsifiable.
     */
    immediate_termination_reason: EscalationPart.optional(),
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

// ── Story 10.20 (WS-E) — the APPEND-ONLY grounds ────────────────────────────────────────────────

/**
 * The body of an append-a-supporting-ground request (AC9).
 *
 * ⛔ There is deliberately NO `is_primary` field. Appends are supporting-only BY CONSTRUCTION: the
 * primary ground is written in the action's own transaction and is structurally immutable
 * thereafter (a partial unique index plus a `SELECT, INSERT`-only grant). Accepting an `is_primary`
 * flag here would offer a client something the database can never honour.
 */
export const AppendModerationGroundRequest = z
  .object({
    code: ReasonCode,
    /** Optional Tier-1 note explaining the ground. */
    note: DecisionNote.optional(),
    /** References only, never prose (AC4). */
    evidence_refs: EvidenceRefsDto.optional(),
    /**
     * The SUPPORTING ground this one replaces, if any.
     * ⛔ Superseding the PRIMARY ground is a typed 409 — it is fixed at the action.
     */
    supersedes_ground_id: UuidString.optional(),
  })
  .strict();
export type AppendModerationGroundRequest = z.output<typeof AppendModerationGroundRequest>;

/**
 * One ground on a moderation action.
 *
 * ⚠ `has_note` rather than the note itself: the note is Tier-1 and stays decrypt-on-demand, per
 * action, exactly like the Decision Note. ⛔ Three new Tier-1 fields must not become three new list
 * columns.
 */
export const ModerationGroundDto = z
  .object({
    ground_id: UuidString,
    code: ReasonCode,
    is_primary: z.boolean(),
    has_note: z.boolean(),
    evidence_refs: z.array(EvidenceRefDto),
    supersedes_ground_id: UuidString.nullable(),
    /**
     * True when a LATER ground supersedes this one.
     * ⛔ A superseded ground is FLAGGED, never filtered out — an audit trail that hides what was
     * superseded is not an audit trail, and the superseded ground is often the one under dispute.
     */
    superseded: z.boolean(),
    added_by: UuidString,
    added_by_display: z.string(),
    added_at: Iso8601Datetime,
  })
  .strict();
export type ModerationGroundDto = z.output<typeof ModerationGroundDto>;

/** The result of appending a supporting ground. */
export const AppendModerationGroundResponse = z
  .object({
    ground_id: UuidString,
    moderation_action_id: UuidString,
    code: ReasonCode,
    supersedes_ground_id: UuidString.nullable(),
    added_at: Iso8601Datetime,
  })
  .strict();
export type AppendModerationGroundResponse = z.output<typeof AppendModerationGroundResponse>;

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
    /**
     * The grounds behind this action — primary first, then supporting in append order, with
     * superseded rows RETAINED and flagged (Story 10.20, AC9).
     */
    grounds: z.array(ModerationGroundDto),
    /** The evidence REFERENCES recorded on the action itself. Identifiers, never prose (AC4). */
    evidence_refs: z.array(EvidenceRefDto),
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
    /**
     * When the ORDINARY termination path opens for a currently-SUSPENDED member (Story 10.20, AC8) —
     * the producing suspension's `acted_at` plus the registry dwell. `null` when the member is not
     * suspended, when the dwell has already elapsed, or when the dwell policy is unprovisioned.
     *
     * ── ⭐ ADDITIVE, AND `legal_actions` IS DELIBERATELY NOT FILTERED ─────────────────────────────
     * Legality and precondition are DIFFERENT FACTS. `legal_actions` derives purely from
     * `nextModerationStatus`, so `terminate` stays in it for the whole dwell window; collapsing the
     * two into one list would make a pure reducer's output depend on a clock, and would fork the one
     * place four call sites derive legality from (D5). ✅ The Panel ruled this correction explicitly
     * right (Q4.2): *"legal_actions should not silently be rewritten merely because the dwell
     * exists."*
     *
     * ⛔ The console must NOT disable the Terminate control until this instant. The ruled shape
     * (Q4.2) is: control visible and ENABLED, selecting it requires an explicit re-confirmation
     * stating that the dwell is still open and that the actor is invoking the immediate-termination
     * route, and the SERVER remains authoritative — the dialog obtains informed intent, it does not
     * grant authority.
     */
    termination_available_at: Iso8601Datetime.nullable(),
    entries: z.array(ModerationHistoryEntryDto),
    /**
     * True when moderation actions exist beyond this page. An AUDIT TRAIL must never present a
     * truncated page as the whole record: without this the console silently dropped everything past
     * the newest 50, which on a contested member is typically the ORIGINAL decision under dispute.
     */
    has_more: z.boolean(),
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

/**
 * ONE decrypted rationale, on demand (review follow-up — the read this file's header always
 * claimed existed). `rationale` is nullable ONLY as the fail-soft outcome of a corrupt/rotated
 * envelope (the `claims.verifier-console.handlers.ts` `safeDecrypt` discipline) — never because the
 * rationale was optional to write (AC3 makes it mandatory on every action).
 */
export const ModerationRationaleResponse = z
  .object({
    moderation_action_id: UuidString,
    rationale: z.string().nullable(),
  })
  .strict();
export type ModerationRationaleResponse = z.output<typeof ModerationRationaleResponse>;

/** Registry metadata for one reason code — what the admin dropdown renders + filters on (AC9). */
export const ReasonCodeMetaDto = z
  .object({
    code: ReasonCode,
    applies_to: z.array(ModerationAction),
    niyamavali_ref: z.string(),
    label: z.string(),
    /**
     * ⚖ Q6-ratified GUIDANCE — what this ground ordinarily results in (Story 10.20, AC10).
     *
     * ⛔ The admin dropdown renders this as GUIDANCE TEXT ONLY — never as a default selection, a
     * pre-selected action, a severity score, or a recommendation. FR-57's prohibition is a
     * prohibition ON THE DECISION MOVING, and a pre-selected sanction moves it.
     * ⛔ `null` on all three RESTORE grounds — a code that justifies no sanction carries no sanction
     * guidance — and the UI renders NOTHING there: not "n/a", not an empty chip.
     */
    ordinarily_results_in: ModerationAction.nullable(),
  })
  .strict();
export type ReasonCodeMetaDto = z.output<typeof ReasonCodeMetaDto>;

/**
 * The full reason-code registry (review follow-up — `ReasonCodeMetaDto` above had no endpoint
 * that ever returned it, so the admin console hand-duplicated `appliesTo` + `label` by value
 * instead of reading the ONE frozen source). All 10 codes, always — this is not paginated: the
 * registry is code-level and frozen (Decision 3), never a per-Pariwar-growing list.
 */
export const ReasonCodesListResponse = z.object({ items: z.array(ReasonCodeMetaDto) }).strict();
export type ReasonCodesListResponse = z.output<typeof ReasonCodesListResponse>;
