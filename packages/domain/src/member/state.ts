// Member lifecycle state machine + pure reducer — Story 3.1 (Task 3; AC1/AC2/AC4).
//
// THE source of truth for a member's state. The persisted `members.state` column
// is a projection of replaying this reducer over the member's `events_log` stream
// (architecture §1.14 line 1231-1236). The reducer is the runtime authority; the
// `transitions` table is documentation only.
//
// ── PURE + DETERMINISTIC + IDEMPOTENT (AC2 — load-bearing) ────────────────────
// `reduce(state, event)` MUST be pure: no Date.now(), no randomness, no I/O, no
// reads of mutable module state. Replaying a stream from event 1..N produces the
// SAME final state every time, on every machine — that is what makes Epic 7's
// audit-reproducibility free. A non-pure reducer silently breaks it.
//
// ── Total reducer: illegal/inapplicable transitions are IDENTITY (no-op) ──────
// The reducer never throws on a well-formed event. An event that does not apply to
// the current state returns the state unchanged. This keeps replay robust and
// forward-compatible (an event type a LATER story adds replays as identity on this
// reducer). Whether a transition SHOULD be emitted is the EMITTER's concern (the
// signup route / SIE scheduler / projector), not the reducer's. The non-transition
// MARKER events (nominees_declared, medical_disclosed, lock_in_entered,
// valid_through_reached, withdrawal_requested, the Story 3.9 Life Events markers
// address_updated + posting_updated, and Story 10.26's personal_event_asserted) are
// identity by design (events.ts) — they need no arm below, only the `default` one.

import { z } from 'zod';

import { defineStateMachine, type StateMachine } from '../state-machine.js';
import { eventsLog } from '../schema/events_log.js';
import { type MemberLifecycleState } from '../schema/members.js';

export { MEMBER_LIFECYCLE_STATES, type MemberLifecycleState } from '../schema/members.js';

/** The live-DB event row shape (Drizzle camelCase). Derived locally so the reducer
 * has no `@twt/events` dependency (domain↔events would cycle). */
type EventRow = typeof eventsLog.$inferSelect;

/**
 * The reducer's event input. `StateMachineConfig<S, E>` requires `E extends { type:
 * string }`, but `EventRow` carries `eventType` (Drizzle camelCase of `event_type`),
 * NOT `type` — so `machine.fold(rows)` would fail type-check. `toMemberEvent` is the
 * mandatory bridge (Dev Notes "EventRow → typed event bridge"). Unit tests construct
 * `MemberEventInput` objects directly (DB-free).
 */
export interface MemberEventInput {
  readonly type: string;
  readonly payload: unknown;
}

/** Minimal extractor for the ONE payload field the reducer branches on. The FULL
 * strict payload is validated at append time (the projector's payloadSchema); the
 * reducer reads only `kyc_verified` so it stays robust and easy to unit-test. */
const kycVerifiedSchema = z.object({ kyc_verified: z.boolean() });

/**
 * The canonical member-lifecycle reducer. Encodes the architecture §1.14 transition
 * table extended with `pending-kyc` (PRD FR-1 initial) + `anonymized` (RTBF terminal,
 * Story 3.12). Branch order mirrors the documented table.
 */
function reduce(state: MemberLifecycleState, event: MemberEventInput): MemberLifecycleState {
  switch (event.type) {
    // Creation: only legal as the FIRST event of a stream. The machine starts at
    // `pending-kyc` (= initial), so this is a no-op from initial. From any other
    // state it returns state unchanged (IDENTITY contract — a corrupt replay must
    // not regress an active member back to pending-kyc).
    case 'member.signup_initiated':
      return state;

    // KYC: pending-kyc → pending-fee (DigiLocker verified); pending-valid → active
    // (trustee approves manual KYC after lock-in). Other states → no-op.
    case 'member.kyc_completed':
      if (state === 'pending-kyc') return 'pending-fee';
      if (state === 'pending-valid') return 'active';
      return state;

    // Manual KYC fallback (unverified) at signup: pending-kyc → pending-fee.
    case 'member.kyc_manual_fallback':
      if (state === 'pending-kyc') return 'pending-fee';
      return state;

    // Fee paid: pending-fee → lock-in (first payment). Renewal from grace/lapsed →
    // active with NO re-lock-in (PRD FR-1A line 249).
    case 'member.vyawastha_shulk_paid':
      if (state === 'pending-fee') return 'lock-in';
      if (state === 'active-in-grace' || state === 'lapsed-unpaid') return 'active';
      return state;

    // Lock-in clock expired (SIE-fired, Story 3.7). Branches on payload.kyc_verified:
    // verified → active; unverified → pending-valid (awaits trustee). FR-2/FR-3.
    // safeParse keeps the reducer total: a malformed payload (e.g. seeded without
    // kyc_verified) returns identity rather than throwing ZodError.
    case 'member.lock_in_expired': {
      if (state !== 'lock-in') return state;
      const parsed = kycVerifiedSchema.safeParse(event.payload);
      if (!parsed.success) return state;
      return parsed.data.kyc_verified ? 'active' : 'pending-valid';
    }

    // valid_through + 1 day → enter 90-day grace. FR-1A.
    case 'member.grace_entered':
      if (state === 'active') return 'active-in-grace';
      return state;

    // 90-day grace elapsed unpaid → lapsed-unpaid. FR-1A.
    case 'member.grace_expired':
      if (state === 'active-in-grace') return 'lapsed-unpaid';
      return state;

    // Voluntary withdrawal completes from `active` or its sub-states (active-in-grace,
    // lapsed-unpaid) — the post-active lifecycle (FR-6). Pre-active / locked-in /
    // terminal states → no-op.
    case 'member.withdrawal_completed':
      if (state === 'active' || state === 'active-in-grace' || state === 'lapsed-unpaid') {
        return 'withdrawn';
      }
      return state;

    // ── DELIBERATE — RTBF anonymization is legal from EVERY live state, and legality is NOT here ──────
    //
    // ⚠ THIS ARM IS DELIBERATELY BROAD. It was `withdrawn`-only (Story 3.12, FR-96) and was widened by
    // Story 10.21 to every `MEMBER_LIFECYCLE_STATES` label except `anonymized` — eight `from` states.
    // ⛔ This is NOT a loosened guard. It is a RELOCATED one.
    //
    // WHY. Termination is an OVERLAY, not a lifecycle state (the ratified 10.16–10.23 model), so a
    // terminated member's `members.state` is whatever it already was — and `nextModerationStatus`
    // carries NO lifecycle precondition, so termination is legal from ANY of the nine labels. Under the
    // old `withdrawn`-only arm, an off-portal erasure of a terminated `active` member would scrub every
    // PII column and then append an event that returned IDENTITY — a PHANTOM ANONYMIZATION: PII gone,
    // state never moved, member still `active` on replay.
    //
    // WHERE LEGALITY LIVES NOW — in the CALLERS, both of them, and there are exactly two:
    //   1. `apps/api/src/modules/rtbf/handlers.ts`            — member self-service (`withdrawn` only)
    //   2. `apps/api/src/modules/member-data-rights/`          — off-portal admin (the overlay reads
    //                                                            `terminated`)
    // Each asserts its own predicate BEFORE appending. This is the Story 10.20 WS-D shape: a precondition
    // belongs in `nextModerationStatus`'s CALLER, never as a new state.
    //
    // ⛔ WHY THE REDUCER MUST NOT READ THE OVERLAY. `reduce` is a PURE, SYNCHRONOUS fold over
    // `(state, event)` with no DB handle and no I/O — that purity is what makes replay deterministic and
    // what `member-state-invariant` enforces. The overlay is a SEPARATE event-derived projection
    // requiring an async read. Teaching this arm to consult it would make replay non-deterministic and
    // order-dependent on a second stream. ⛔ Do not.
    //
    // ⚠ RE-EXAMINATION TRIGGER — a NEW caller appending `member.rtbf_anonymized` MUST carry the overlay
    // precondition, or this arm is wrong for that path. If you are adding a third emitter and did not
    // write a legality check, stop: the breadth here is covering for you, and it will phantom-anonymize.
    // Likewise, a TENTH lifecycle label is admitted here automatically — the totality test in
    // `tests/member/state.test.ts` is what forces a deliberate decision about it.
    case 'member.rtbf_anonymized':
      // ⚠ NOT A LEGALITY GUARD (code-review correction, this story). This arm is a plain
      // unconditional transition to `anonymized` — it does NOT gate against re-anonymizing an
      // already-anonymized member; that legality check lives entirely in the CALLERS
      // (`resolveRtbfLegality`), which is why `reduce` may see this event applied to a member
      // already in `anonymized` without objecting. Derived from the enum, ⛔ NEVER hand-listed —
      // a hand-listed set is how the four `pending-*`/`lock-in` labels were missed once already.
      return 'anonymized';

    // Non-transition markers + any unknown/forward-compat event type → identity.
    default:
      return state;
  }
}

/**
 * The member lifecycle state machine. `initial` is `pending-kyc`: a member only
 * exists once `member.signup_initiated` is appended, and that event projects to
 * `pending-kyc`, so a real stream's fold begins effectively at `pending-kyc`. The
 * architecture table's conceptual `(none)` pre-state is not a persisted enum label.
 */
export const memberStateMachine: StateMachine<MemberLifecycleState, MemberEventInput> =
  defineStateMachine<MemberLifecycleState, MemberEventInput>({
    initial: 'pending-kyc',
    reduce,
    // Documentation-only transition matrix (architecture §1.14). Creation
    // (signup_initiated → pending-kyc) is omitted: its `from` is the conceptual
    // `(none)`, which is not a valid persisted state.
    transitions: [
      { from: 'pending-kyc', event: 'member.kyc_completed', to: 'pending-fee' },
      { from: 'pending-kyc', event: 'member.kyc_manual_fallback', to: 'pending-fee' },
      { from: 'pending-fee', event: 'member.vyawastha_shulk_paid', to: 'lock-in' },
      { from: 'lock-in', event: 'member.lock_in_expired', to: 'active' },
      { from: 'lock-in', event: 'member.lock_in_expired', to: 'pending-valid' },
      { from: 'pending-valid', event: 'member.kyc_completed', to: 'active' },
      { from: 'active', event: 'member.grace_entered', to: 'active-in-grace' },
      { from: 'active-in-grace', event: 'member.vyawastha_shulk_paid', to: 'active' },
      { from: 'active-in-grace', event: 'member.grace_expired', to: 'lapsed-unpaid' },
      { from: 'lapsed-unpaid', event: 'member.vyawastha_shulk_paid', to: 'active' },
      { from: 'active', event: 'member.withdrawal_completed', to: 'withdrawn' },
      { from: 'active-in-grace', event: 'member.withdrawal_completed', to: 'withdrawn' },
      { from: 'lapsed-unpaid', event: 'member.withdrawal_completed', to: 'withdrawn' },
      // Story 10.21 — RTBF is legal from every live label, not only `withdrawn` (see the DELIBERATE
      // block on the reducer arm). Seven rows added; the `withdrawn` row below predates this story.
      { from: 'pending-kyc', event: 'member.rtbf_anonymized', to: 'anonymized' },
      { from: 'pending-fee', event: 'member.rtbf_anonymized', to: 'anonymized' },
      { from: 'pending-valid', event: 'member.rtbf_anonymized', to: 'anonymized' },
      { from: 'lock-in', event: 'member.rtbf_anonymized', to: 'anonymized' },
      { from: 'active', event: 'member.rtbf_anonymized', to: 'anonymized' },
      { from: 'active-in-grace', event: 'member.rtbf_anonymized', to: 'anonymized' },
      { from: 'lapsed-unpaid', event: 'member.rtbf_anonymized', to: 'anonymized' },
      { from: 'withdrawn', event: 'member.rtbf_anonymized', to: 'anonymized' },
    ],
  });

/** Map a live-DB `EventRow` to the reducer's `MemberEventInput` (the mandatory
 * bridge — `eventType` → `type`). */
function toMemberEvent(row: EventRow): MemberEventInput {
  return { type: row.eventType, payload: row.payload };
}

/**
 * Replay an ordered event stream to the member's current lifecycle state. Callers
 * load the rows (PK-ordered by `event_version`) and fold them through the machine.
 * Deterministic + idempotent (AC2): replaying 1..N twice yields the same state.
 */
export function replayMemberState(rows: readonly EventRow[]): MemberLifecycleState {
  return memberStateMachine.fold(rows.map(toMemberEvent));
}
