// Member event vocabulary + Zod payload schemas — Story 3.1 (Task 2; AC1).
//
// The `member.*` event types are the lifecycle's WRITE vocabulary: every legal
// transition (and the two non-transition markers) is a named, dotted
// `resource.action` event on the member's `events_log` stream (architecture line
// 3830-3833). These schemas validate the event PAYLOAD; `timestamp` + `pariwar_id`
// + `actor_id` are columns on `events_log` and are NOT duplicated here.
//
// ── Why these live in @twt/domain (not @twt/contracts) ────────────────────────
// `@twt/events` depends on @twt/domain; the registry (packages/events/src/registry.ts)
// imports these schemas, and so does the reducer (member/state.ts). Putting them in
// @twt/contracts would force domain→contracts, reversing the legal import direction
// (contracts→domain). Transport mirrors for apps/api are Story 3.2+/3.3 territory.
//
// Every payload carries the architecture §1.14 audit shape — `from_state`,
// `to_state`, `trigger`, `actor` — plus event-specific fields where load-bearing.
// `.strict()` everywhere: an unknown key is a defect, not silently tolerated.

import { z } from 'zod';

import { MEMBER_LIFECYCLE_STATES } from '../schema/members.js';

/** Who caused the transition (architecture §1.14 line 1262-1268). `system` = SIE. */
export const memberActorSchema = z.enum(['member', 'system', 'trustee']);
export type MemberEventActor = z.infer<typeof memberActorSchema>;

/** A lifecycle-state literal, derived from the one tuple in schema/members.ts. */
export const memberLifecycleStateSchema = z.enum(MEMBER_LIFECYCLE_STATES);

/**
 * The audit shape every member.* payload carries. `from_state` is nullable — the
 * initial `signup_initiated` event has no prior state. For non-transition markers
 * (`nominees_declared`, `medical_disclosed`, …) `from_state` === `to_state`.
 *
 * NOTE: these are AUDIT metadata. The reducer (member/state.ts) is the runtime
 * authority for the transition — it derives the next state from the CURRENT state
 * + the event TYPE, never from `to_state` in the payload (so a mislabelled payload
 * can never corrupt replay).
 */
const auditShape = {
  from_state: memberLifecycleStateSchema.nullable(),
  to_state: memberLifecycleStateSchema,
  trigger: z.string().min(1),
  actor: memberActorSchema,
};

// ── Transition events ─────────────────────────────────────────────────────────

/** Signup flow initiated → `pending-kyc` (initial). FR-1. */
export const SignupInitiatedPayloadSchema = z.object({ ...auditShape }).strict();

/** KYC completed (DigiLocker-verified, or trustee-approved from `pending-valid`). FR-1/FR-2. */
export const KycCompletedPayloadSchema = z
  .object({ ...auditShape, kyc_reference: z.string().min(1).optional() })
  .strict();

/** KYC manual fallback recorded (KYC unverified; resolves after lock-in). FR-2. */
export const KycManualFallbackPayloadSchema = z
  .object({ ...auditShape, reason: z.string().min(1) })
  .strict();

/** Vyawastha Shulk (membership fee) paid — UPI Intent + UTR confirmed. FR-1/FR-3. */
export const VyawasthaShulkPaidPayloadSchema = z
  .object({ ...auditShape, utr: z.string().min(1), amount_inr: z.number().positive() })
  .strict();

/**
 * Lock-in clock expired. The reducer branches on `kyc_verified`: `lock-in` →
 * `active` when true, `lock-in` → `pending-valid` when false (Dev Notes note b).
 * `kyc_verified` is therefore REQUIRED and load-bearing — populated by whatever
 * emits the event (the SIE scheduler in Story 3.7).
 */
export const LockInExpiredPayloadSchema = z
  .object({ ...auditShape, kyc_verified: z.boolean() })
  .strict();

/** valid_through + 1 day reached → enter the 90-day grace. FR-1A. */
export const GraceEnteredPayloadSchema = z.object({ ...auditShape }).strict();

/** 90-day grace elapsed unpaid → `lapsed-unpaid`. FR-1A. */
export const GraceExpiredPayloadSchema = z.object({ ...auditShape }).strict();

/** Voluntary withdrawal completed → `withdrawn`. FR-6. */
export const WithdrawalCompletedPayloadSchema = z.object({ ...auditShape }).strict();

/** RTBF anonymization → `anonymized` (terminal). FR-96 (Story 3.12). */
export const RtbfAnonymizedPayloadSchema = z.object({ ...auditShape }).strict();

// ── Non-transition marker events (reducer returns the current state unchanged) ──
// Declared in the vocabulary (AC1) + replay-safe (Dev Notes note e). They record a
// lifecycle MOMENT on the stream without moving the primary state:
//   · nominees_declared / medical_disclosed — Story 3.4 / 3.5 data is recorded
//     elsewhere; these mark that the step happened.
//   · lock_in_entered — the lock-in clock-start marker (the state already became
//     `lock-in` via `vyawastha_shulk_paid` per the authoritative transition table;
//     Story 3.7's clock widget keys off this event's `occurred_at`).
//   · valid_through_reached — the renewal-reminder anchor (the state moves to
//     `active-in-grace` via `grace_entered`, fired at valid_through + 1 day).
//   · withdrawal_requested — the withdrawal-initiated marker (the state moves to
//     `withdrawn` via `withdrawal_completed`).

export const NomineesDeclaredPayloadSchema = z.object({ ...auditShape }).strict();
export const MedicalDisclosedPayloadSchema = z.object({ ...auditShape }).strict();
export const LockInEnteredPayloadSchema = z.object({ ...auditShape }).strict();
export const ValidThroughReachedPayloadSchema = z.object({ ...auditShape }).strict();
export const WithdrawalRequestedPayloadSchema = z.object({ ...auditShape }).strict();

// ── The 14-event vocabulary + the type→schema map (single source) ─────────────

export const MEMBER_EVENT_TYPES = [
  'member.signup_initiated',
  'member.kyc_completed',
  'member.kyc_manual_fallback',
  'member.nominees_declared',
  'member.medical_disclosed',
  'member.vyawastha_shulk_paid',
  'member.lock_in_entered',
  'member.lock_in_expired',
  'member.valid_through_reached',
  'member.grace_entered',
  'member.grace_expired',
  'member.withdrawal_requested',
  'member.withdrawal_completed',
  'member.rtbf_anonymized',
] as const;

/** The dotted `member.*` event-type literal union (the 14 AC1 events). */
export type MemberEventType = (typeof MEMBER_EVENT_TYPES)[number];

/**
 * type → payload-schema map. The ONE place the 14 events bind to their schemas;
 * `EVENT_TYPE_REGISTRY` (packages/events) and the reducer both consume it. The
 * `satisfies` keeps it exhaustive — adding a `MemberEventType` without a schema is
 * a compile error.
 */
export const MEMBER_EVENT_PAYLOAD_SCHEMAS = {
  'member.signup_initiated': SignupInitiatedPayloadSchema,
  'member.kyc_completed': KycCompletedPayloadSchema,
  'member.kyc_manual_fallback': KycManualFallbackPayloadSchema,
  'member.nominees_declared': NomineesDeclaredPayloadSchema,
  'member.medical_disclosed': MedicalDisclosedPayloadSchema,
  'member.vyawastha_shulk_paid': VyawasthaShulkPaidPayloadSchema,
  'member.lock_in_entered': LockInEnteredPayloadSchema,
  'member.lock_in_expired': LockInExpiredPayloadSchema,
  'member.valid_through_reached': ValidThroughReachedPayloadSchema,
  'member.grace_entered': GraceEnteredPayloadSchema,
  'member.grace_expired': GraceExpiredPayloadSchema,
  'member.withdrawal_requested': WithdrawalRequestedPayloadSchema,
  'member.withdrawal_completed': WithdrawalCompletedPayloadSchema,
  'member.rtbf_anonymized': RtbfAnonymizedPayloadSchema,
} as const satisfies Record<MemberEventType, z.ZodTypeAny>;
