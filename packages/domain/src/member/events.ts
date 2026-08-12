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

import { auditShape } from './audit-shape.js';
import { MODERATION_EVENT_PAYLOAD_SCHEMAS } from './moderation/events.js';
import { RESTORATION_DISCIPLINE_EVENT_PAYLOAD_SCHEMAS } from './restoration-discipline/events.js';

// The audit shape + the two literal schemas are DECLARED in `./audit-shape.ts` (Story 10.10) so
// that `moderation/events.ts` can share them without an import cycle — this module imports the
// moderation payload schemas below, so the dependency must run one way only. Re-exported here so
// this module's public API is unchanged.
export {
  memberActorSchema,
  memberLifecycleStateSchema,
  type MemberEventActor,
} from './audit-shape.js';

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

/**
 * Vyawastha Shulk (membership fee) paid — UPI Intent + UTR confirmed. FR-1/FR-3.
 *
 * Story 3.8 (Decision 1): the SAME event type is the renewal transition trigger (the
 * architecture-committed vocabulary has no separate `vyawastha_shulk_renewed`; the reducer routes
 * `active-in-grace`/`lapsed-unpaid` → `active` off this event, and it is identity from `active`). The
 * OPTIONAL `kind` discriminator distinguishes a signup payment from a renewal for audit/reporting
 * WITHOUT changing reducer behaviour (the marker-widening precedent: 3.4/3.5/3.6b widened payloads).
 * Absent `kind` ≡ signup (the 3.6b signup path omits it); the 3.8 renewal path sets `kind: 'renewal'`.
 */
export const VyawasthaShulkPaidPayloadSchema = z
  .object({
    ...auditShape,
    utr: z.string().min(1),
    amount_inr: z.number().positive(),
    kind: z.enum(['signup', 'renewal']).optional(),
  })
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

/**
 * Story 3.4: nominee declaration. NON-PII audit only — the events_log payload is plaintext
 * JSONB and MUST NEVER carry nominee names / mobiles / addresses (R1; mirrors the 3.3b
 * `kyc.completed` precedent, which carries only the masked-Aadhaar reference). The nominee
 * PII lives Tier-1-encrypted in `member_nominees`; here we record only the COUNT + the
 * SERVER-derived split shape. Still a non-transition marker (from_state === to_state) — the
 * reducer treats `member.nominees_declared` as identity; widening this payload does NOT
 * change reducer behavior.
 */
export const NomineesDeclaredPayloadSchema = z
  .object({
    ...auditShape,
    nominee_count: z.union([z.literal(1), z.literal(2)]),
    split: z.enum(['sole', '75-25']),
  })
  .strict();
/**
 * Story 3.5: medical disclosure. NON-PII audit only — the events_log payload is plaintext JSONB
 * and MUST NEVER carry selected condition codes / free-text additional context (R1; mirrors the
 * 3.4 `nominees_declared` precedent, which carries only count + split). The medical PII lives
 * Tier-1-encrypted in `member_medical_disclosures`; here we record only the COUNT + the resolved
 * `ima_list_version` (the `niy.medical.ima-list` clause_version_id the member saw) + the ack
 * marker. `acknowledged` is `z.literal(true)` — a recorded disclosure is ALWAYS acknowledged
 * (server rejects `acknowledged !== true` before emitting, AC2/AC6). Still a non-transition
 * marker (from_state === to_state) — the reducer treats `member.medical_disclosed` as identity;
 * widening this payload does NOT change reducer behavior (R4).
 */
export const MedicalDisclosedPayloadSchema = z
  .object({
    ...auditShape,
    ima_list_version: z.string().min(1),
    condition_count: z.number().int().nonnegative(),
    acknowledged: z.literal(true),
    ack_locale: z.enum(['en', 'hi']),
  })
  .strict();
/**
 * Story 3.6b: the lock-in clock-start MARKER (`from_state === to_state === 'lock-in'`; the reducer
 * treats `member.lock_in_entered` as identity — `default → identity` in state.ts). The payload is
 * WIDENED (AC3 / R3) to carry the FR-8 lock-in snapshot for audit-reproducibility — exactly as 3.4
 * widened `NomineesDeclaredPayloadSchema` and 3.5 widened `MedicalDisclosedPayloadSchema`. This is the
 * AUTHORITATIVE historical record of the snapshot (replay-derivable, immutable); the
 * `members.lock_in_days_at_join` column is a derived read-cache of these two fields. Widening does NOT
 * change reducer behaviour (the marker is already identity). `lock_in_days_at_join` is the resolved
 * `niy.lock-in.policy` `lock_in_days`; `lock_in_policy_version` is that clause's `clause_version_id`.
 */
export const LockInEnteredPayloadSchema = z
  .object({
    ...auditShape,
    lock_in_days_at_join: z.number().int().positive(),
    lock_in_policy_version: z.string().min(1),
  })
  .strict();
export const ValidThroughReachedPayloadSchema = z.object({ ...auditShape }).strict();
export const WithdrawalRequestedPayloadSchema = z.object({ ...auditShape }).strict();

/**
 * Story 3.9: address change via the Life Events panel. NON-PII audit only — the events_log
 * payload is plaintext JSONB and MUST NEVER carry the member's raw address bytes (R1; the same
 * discipline as `nominees_declared`, which carries only count + split). The address PII lives
 * Tier-1-encrypted in `member_addresses`; "prior value preserved" (AC1) is satisfied by that
 * APPEND-ONLY history table, NOT by stuffing the old value into this payload. Here we record
 * only the presence MARKER — a recorded address is always present. Still a non-transition marker
 * (from_state === to_state) — the reducer treats `member.address_updated` as identity (R5).
 */
export const AddressUpdatedPayloadSchema = z
  .object({
    ...auditShape,
    address_present: z.literal(true),
  })
  .strict();
/**
 * Story 3.9: posting / transfer-in-out change via the Life Events panel. The posting `district`
 * is a geographic location, NOT sensitive identity data → non-PII, so it is safe in BOTH the
 * column and this payload (Dev Notes §"Posting PII tier"). `pariwar_ref` is an OPTIONAL
 * forward-compat reference (a true cross-Pariwar tenant migration is out of scope for v1-S —
 * this records the district change as a member attribute + marker only). `is_retirement` is a
 * non-PII boolean lifecycle marker — Epic 4 Story 4.5 computes `retired_at` from the FIRST
 * `posting.updated` where `is_retirement === true` (omitting it now would force a migration +
 * event-schema extension in Epic 4). Non-transition marker (from_state === to_state; R5).
 */
export const PostingUpdatedPayloadSchema = z
  .object({
    ...auditShape,
    district: z.string().min(1),
    pariwar_ref: z.string().min(1).optional(),
    is_retirement: z.boolean(),
  })
  .strict();

/**
 * The BOUNDED vocabulary a personal-event assertion may name — Story 10.26 (D3). NO free text.
 *
 * Free text here would be Tier-1 PII of the most sensitive kind (a member describing a death, an
 * illness, a family crisis) landing in `events_log`, which is append-only plaintext JSONB and is
 * NEVER redacted — requiring KMS envelope encryption (1.5), an RTBF path (3.12) and a
 * PII-scrape-gate exemption (1.16b). And it would earn nothing: R7(G) is declarative, there is no
 * reviewer (D1), and the fact the engine reads is a BOOLEAN. A free-text box nothing reads is a
 * false promise that someone is listening. Members who need a human have the Helpdesk (10.1–10.4).
 *
 * ⚠ `other` is retained deliberately despite carrying no information: removing it would force a
 * member whose situation is not on this list to mis-categorise their own life, which is worse than
 * a coarse bucket.
 */
export const PERSONAL_EVENT_KINDS = [
  'bereavement',
  'illness',
  'caregiving',
  'displacement',
  'financial_hardship',
  'other',
] as const;

/** One bounded personal-event kind. */
export type PersonalEventKind = (typeof PERSONAL_EVENT_KINDS)[number];

export const personalEventKindSchema = z.enum(PERSONAL_EVENT_KINDS);

/**
 * Story 10.26: the member asserts that a personal event affected their ability to contribute.
 *
 * ⚖ THE INSTRUMENT GRANTS NOTHING. The ratified Niyamavali §3.1 (`docs/legal/niyamavali.md:81`,
 * Trustee Panel 2026-08-06) is explicit: "No exemption. Personal events do not excuse a missed
 * contribution; the assertion is recorded on the member's own record but grants no restoration
 * relief and carries no consequence of its own." The seeded R7(G) clause matches
 * (`on_pass: no_exemption`, `restoration: {never_excuses: true}`).
 *
 * So there is deliberately NO approval field, NO status, NO reviewer, NO state machine and nothing
 * to reverse — a one-way record with no counterparty (D1). A member may assert again; nothing
 * "approves" an earlier assertion. Naming any field `status` / `approved` / `request` would make a
 * false promise STRUCTURAL, which is the strongest form of the harm AC1 forbids.
 *
 * Why it exists at all, given it changes nothing: the member has something to say and had nowhere to
 * say it, and an un-evaluated R7(G) never told them what the rule was. Once evaluated, their own
 * record states it plainly — and the assertion is visible to a trustee as a FACT that can inform
 * discretion on a flag that already exists, while never itself creating one (AC5/D4).
 *
 * ⚠ NON-TRANSITION MARKER (`from_state === to_state`) — the reducer treats it as IDENTITY via its
 * `default` arm, exactly like `member.address_updated` / `member.posting_updated` (R5).
 *
 * ⚠ NOT in the `contribution.*` namespace (D2), for three reasons — it is semantically a member act
 * about the member; the reducer already has this identity shape; and, decisively, migration
 * `0036_member-validity-cache.sql:103-107` fires its cache-eviction trigger on
 * `NEW.event_type LIKE 'member.%'` keyed `member_id = NEW.stream_id`, so an assertion evicts the
 * member's validity-cache row with NO new trigger and NO migration. Any other namespace would owe
 * one. (It also keeps Story 8.10's `no-ingest-path` fence green, which pins the `contribution.*`
 * event vocabulary at exactly three.)
 */
export const PersonalEventAssertedPayloadSchema = z
  .object({
    ...auditShape,
    /** ⚠ `actor` is narrowed to `member`: nobody asserts a member's own life on their behalf. */
    actor: z.literal('member'),
    kind: personalEventKindSchema,
    /**
     * OPTIONAL provenance: the cycle the member means. Unpopulated by any surface today, and that is
     * a recorded gap rather than an oversight — NO member surface lists a MISSED cycle (the Yogdaan
     * Bahi lists ATTESTED contributions, and a missed cycle produces no attestation and so no row),
     * so the member has nothing to point at. Carried now so a future cycle-scoped surface needs no
     * new event type (D5; Escalation 5).
     */
    cycle_ref: z.string().min(1).optional(),
  })
  .strict();

// ── The 20-event vocabulary + the type→schema map (single source) ─────────────
//
// Story 10.10 adds the THREE `member.moderation.*` events. They are declared in
// `moderation/events.ts` (with the moderation overlay they belong to) and folded in here so this
// map stays the ONE place a `member.*` event binds to its schema. They are lifecycle
// NON-TRANSITIONS: the reducer's `default: return state` arm makes all three IDENTITY on
// `members.state` by construction (Decision 1 — moderation is an event-derived OVERLAY, not a
// `member_lifecycle_state` label; no ALTER TYPE, no reducer arm, no projector edit).

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
  // Story 3.9 — Life Events panel: two NON-TRANSITION markers (address + posting change).
  'member.address_updated',
  'member.posting_updated',
  // Story 10.26 — the personal-event ASSERTION: a NON-TRANSITION marker on the member's own stream.
  // Supplies `contribution.personal_event_excuse_claimed`, the seventh and final engine fact key.
  'member.personal_event_asserted',
  // Story 10.10 — moderation OVERLAY: three NON-TRANSITION events on the member's own stream.
  // They move the ORTHOGONAL moderation status machine (moderation/status.ts), never `members.state`.
  'member.moderation.suspended',
  'member.moderation.terminated',
  'member.moderation.restored',
  // Story 10.20 — a SUPPORTING ground appended to an existing moderation action (WS-E). ⚠ It is
  // ACTION-LESS: no moderation status moves, so it carries no overlay from/to and must NOT join
  // `MODERATION_EVENT_TYPES` / `MODERATION_ACTION_EVENT_TYPES` (moderation/status.ts) merely because
  // it is spelled `member.moderation.*`. Those tuples are the action-bearing three, and
  // `moderationActionForEventType` returning null for this type is CORRECT, not a gap to close.
  'member.moderation.ground-appended',
  // Story 10.23 — restoration-discipline OVERLAY: the SECOND governance overlay, one NON-TRANSITION
  // event. It moves an independent, event-derived status machine (restoration-discipline/status.ts)
  // and never `members.state`. ⚠ There is deliberately NO `…expired` sibling: expiry is DERIVED at
  // read from `expires_at` (AC4/D6), because this overlay has no lifecycle state that must move.
  'member.restoration_discipline.imposed',
] as const;

/**
 * The dotted `member.*` event-type literal union — the 16 AC1 events + the 3 Story 10.10 moderation
 * events + Story 10.26's `personal_event_asserted` + Story 10.23's restoration-discipline
 * imposition + Story 10.20's `moderation.ground-appended` = **22**.
 */
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
  // Story 3.9 — Life Events markers (both non-transition; reducer treats them as identity).
  'member.address_updated': AddressUpdatedPayloadSchema,
  'member.posting_updated': PostingUpdatedPayloadSchema,
  // Story 10.26 — the personal-event assertion (non-transition; reducer treats it as identity).
  'member.personal_event_asserted': PersonalEventAssertedPayloadSchema,
  // Story 10.10 — moderation overlay (all three non-transition; reducer treats them as identity).
  ...MODERATION_EVENT_PAYLOAD_SCHEMAS,
  // Story 10.23 — restoration-discipline overlay (non-transition; reducer treats it as identity).
  ...RESTORATION_DISCIPLINE_EVENT_PAYLOAD_SCHEMAS,
} as const satisfies Record<MemberEventType, z.ZodTypeAny>;
