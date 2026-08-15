// Member lifecycle reducer — pure, DB-free unit tests (Story 3.1, Task 9; AC1/AC2/AC4).
//
// Covers: every legal transition, illegal/marker transitions are no-ops, and the
// load-bearing determinism + idempotency property (replay 1..N twice → identical).
// Tests construct MemberEventInput objects directly (no DB, no EventRow needed).

import { describe, expect, it } from 'vitest';

import {
  MEMBER_LIFECYCLE_STATES,
  type MemberEventInput,
  type MemberLifecycleState,
  memberStateMachine,
  replayMemberState,
} from '../../src/member/state.js';

// The (partial) live-DB row shape replayMemberState accepts — derived from its own
// signature so the test never imports @twt/events (domain has no such dependency).
type ReplayRows = Parameters<typeof replayMemberState>[0];

/** A reducer input. Payload defaults to {} (ignored by all but lock_in_expired). */
const ev = (type: string, payload: unknown = {}): MemberEventInput => ({ type, payload });

/** Fold a sequence from the machine's initial state. */
const fold = (events: MemberEventInput[]): MemberLifecycleState => memberStateMachine.fold(events);

describe('member lifecycle reducer — transitions', () => {
  it('initial state is pending-kyc; signup_initiated keeps pending-kyc', () => {
    expect(memberStateMachine.initial).toBe('pending-kyc');
    expect(fold([ev('member.signup_initiated')])).toBe('pending-kyc');
  });

  it('happy path: signup → kyc → fee → lock-in → (verified) active', () => {
    expect(
      fold([
        ev('member.signup_initiated'),
        ev('member.kyc_completed'),
        ev('member.vyawastha_shulk_paid', { utr: 'X', amount_inr: 110 }),
        ev('member.lock_in_expired', { kyc_verified: true }),
      ]),
    ).toBe('active');
  });

  it('manual-KYC path: lock_in_expired unverified → pending-valid → trustee kyc_completed → active', () => {
    const toPendingValid = [
      ev('member.signup_initiated'),
      ev('member.kyc_manual_fallback', { reason: 'digilocker down' }),
      ev('member.vyawastha_shulk_paid', { utr: 'X', amount_inr: 110 }),
      ev('member.lock_in_expired', { kyc_verified: false }),
    ];
    expect(fold(toPendingValid)).toBe('pending-valid');
    expect(fold([...toPendingValid, ev('member.kyc_completed')])).toBe('active');
  });

  it('grace path: active → grace_entered → active-in-grace → grace_expired → lapsed-unpaid', () => {
    const active = [
      ev('member.signup_initiated'),
      ev('member.kyc_completed'),
      ev('member.vyawastha_shulk_paid', { utr: 'X', amount_inr: 110 }),
      ev('member.lock_in_expired', { kyc_verified: true }),
    ];
    expect(fold([...active, ev('member.grace_entered')])).toBe('active-in-grace');
    expect(fold([...active, ev('member.grace_entered'), ev('member.grace_expired')])).toBe(
      'lapsed-unpaid',
    );
  });

  it('renewal restores to active WITHOUT re-lock-in (from grace and from lapsed)', () => {
    const active = [
      ev('member.signup_initiated'),
      ev('member.kyc_completed'),
      ev('member.vyawastha_shulk_paid', { utr: 'X', amount_inr: 110 }),
      ev('member.lock_in_expired', { kyc_verified: true }),
    ];
    const renew = ev('member.vyawastha_shulk_paid', { utr: 'Y', amount_inr: 110 });
    // from active-in-grace
    expect(fold([...active, ev('member.grace_entered'), renew])).toBe('active');
    // from lapsed-unpaid
    expect(
      fold([...active, ev('member.grace_entered'), ev('member.grace_expired'), renew]),
    ).toBe('active');
  });

  it('withdrawal + RTBF terminal: active → withdrawn → anonymized', () => {
    const active = [
      ev('member.signup_initiated'),
      ev('member.kyc_completed'),
      ev('member.vyawastha_shulk_paid', { utr: 'X', amount_inr: 110 }),
      ev('member.lock_in_expired', { kyc_verified: true }),
    ];
    expect(fold([...active, ev('member.withdrawal_completed')])).toBe('withdrawn');
    expect(
      fold([...active, ev('member.withdrawal_completed'), ev('member.rtbf_anonymized')]),
    ).toBe('anonymized');
  });

  it('marker events are no-ops (state unchanged)', () => {
    const markers = [
      'member.nominees_declared',
      'member.medical_disclosed',
      'member.lock_in_entered',
      'member.valid_through_reached',
      'member.withdrawal_requested',
    ];
    for (const m of markers) {
      // From pending-kyc
      expect(memberStateMachine.step('pending-kyc', ev(m))).toBe('pending-kyc');
      // From active
      expect(memberStateMachine.step('active', ev(m))).toBe('active');
    }
  });

  it('illegal/inapplicable transitions are identity (no throw)', () => {
    // fee paid before fee state
    expect(memberStateMachine.step('pending-kyc', ev('member.vyawastha_shulk_paid', { utr: 'X', amount_inr: 1 }))).toBe('pending-kyc');
    // kyc_completed when already active
    expect(memberStateMachine.step('active', ev('member.kyc_completed'))).toBe('active');
    // ⚠ REWRITTEN by Story 10.21 — this line previously asserted
    //   step('active', rtbf) === 'active'
    // i.e. that RTBF from a non-`withdrawn` state is IDENTITY. That is now the EXACT OPPOSITE of the
    // truth: the arm was widened to every label but `anonymized`, because termination is an overlay and
    // a terminated member's lifecycle state is whatever it already was — so an `active` member CAN be
    // legally erased, and an identity return there is precisely the PHANTOM ANONYMIZATION the widening
    // exists to prevent. ⛔ Not deleted, rewritten: the pinned invariant moved, and the move is recorded.
    // The positive assertions now live in the two 10.21 blocks below.
    // (RTBF is only identity from `anonymized` itself — asserted in the totality block.)
    // grace_expired when not in grace
    expect(memberStateMachine.step('active', ev('member.grace_expired'))).toBe('active');
    // withdrawal from lock-in (funds locked) → no-op
    expect(memberStateMachine.step('lock-in', ev('member.withdrawal_completed'))).toBe('lock-in');
    // unknown/forward-compat event type → identity
    expect(memberStateMachine.step('active', ev('member.some_future_event'))).toBe('active');
    // signup_initiated from a non-initial state → identity (must NOT regress back to pending-kyc)
    expect(memberStateMachine.step('active', ev('member.signup_initiated'))).toBe('active');
    expect(memberStateMachine.step('lock-in', ev('member.signup_initiated'))).toBe('lock-in');
    // lock_in_expired with malformed payload → identity (total reducer: no throw)
    expect(memberStateMachine.step('lock-in', ev('member.lock_in_expired', {}))).toBe('lock-in');
    expect(memberStateMachine.step('lock-in', ev('member.lock_in_expired', { kyc_verified: 'yes' }))).toBe('lock-in');
  });

  it('withdrawal completes from active and its sub-states only', () => {
    expect(memberStateMachine.step('active', ev('member.withdrawal_completed'))).toBe('withdrawn');
    expect(memberStateMachine.step('active-in-grace', ev('member.withdrawal_completed'))).toBe('withdrawn');
    expect(memberStateMachine.step('lapsed-unpaid', ev('member.withdrawal_completed'))).toBe('withdrawn');
    expect(memberStateMachine.step('pending-fee', ev('member.withdrawal_completed'))).toBe('pending-fee');
  });
});

describe('member lifecycle reducer — determinism + idempotency (AC2)', () => {
  const stream: MemberEventInput[] = [
    ev('member.signup_initiated'),
    ev('member.nominees_declared'),
    ev('member.medical_disclosed'),
    ev('member.kyc_completed'),
    ev('member.vyawastha_shulk_paid', { utr: 'X', amount_inr: 110 }),
    ev('member.lock_in_entered'),
    ev('member.lock_in_expired', { kyc_verified: true }),
    ev('member.valid_through_reached'),
    ev('member.grace_entered'),
  ];

  it('replaying 1..N twice yields the identical final state', () => {
    expect(fold(stream)).toBe(fold([...stream]));
    expect(fold(stream)).toBe('active-in-grace');
  });

  it('fold equals manual events.reduce(step, initial) — deterministic equivalence', () => {
    const manual = stream.reduce<MemberLifecycleState>(
      (s, e) => memberStateMachine.step(s, e),
      memberStateMachine.initial,
    );
    expect(fold(stream)).toBe(manual);
  });

  it('prefix-folding is consistent: fold(all) === fold(continue from fold(prefix))', () => {
    for (let k = 0; k <= stream.length; k++) {
      const prefix = stream.slice(0, k);
      const rest = stream.slice(k);
      const viaPrefix = rest.reduce<MemberLifecycleState>(
        (s, e) => memberStateMachine.step(s, e),
        fold(prefix),
      );
      expect(viaPrefix).toBe(fold(stream));
    }
  });

  it('replayMemberState (EventRow bridge) matches fold over the same stream', () => {
    const rows = stream.map((e, i) => ({
      eventType: e.type,
      payload: e.payload,
      eventVersion: i + 1,
    })) as unknown as ReplayRows;
    expect(replayMemberState(rows)).toBe(fold(stream));
  });
});

describe('Story 10.21 — member.rtbf_anonymized is legal from EVERY label but `anonymized` (AC7)', () => {
  it('TOTALITY — the accepted `from` set is DERIVED FROM THE ENUM, never hand-listed', () => {
    // ⭐ This is the test that makes a TENTH lifecycle label a deliberate decision rather than a silent
    // re-opening of the phantom-anonymization hole. It iterates `MEMBER_LIFECYCLE_STATES` itself, so a
    // new label is covered the moment it is added — ⛔ do not replace this loop with a literal array,
    // which is exactly the mistake that once left four `pending-*`/`lock-in` labels uncovered.
    const anonymizing = MEMBER_LIFECYCLE_STATES.filter((s) => s !== 'anonymized');
    expect(anonymizing).toHaveLength(MEMBER_LIFECYCLE_STATES.length - 1);

    for (const from of anonymizing) {
      expect(memberStateMachine.step(from, ev('member.rtbf_anonymized'))).toBe('anonymized');
    }

    // ...and `anonymized` is the ONE identity case (terminal, and re-erasing is a no-op, not a throw).
    expect(memberStateMachine.step('anonymized', ev('member.rtbf_anonymized'))).toBe('anonymized');
  });

  it('the documentation matrix carries a row for every accepted `from` state', () => {
    // The matrix is documentation-only, but a matrix that disagrees with the reducer is worse than no
    // matrix — it is a false map. Derived from the enum for the same reason as above.
    // ⛔ Assert the matrix EXISTS before filtering it. `transitions` is optional on the StateMachine
    // type, and a `?? []` fallback here would make every assertion below pass vacuously against an
    // absent matrix — the exact shape of vacuity this story polices elsewhere.
    const { transitions } = memberStateMachine;
    expect(transitions).toBeDefined();
    const rows = transitions!.filter((t) => t.event === 'member.rtbf_anonymized');
    const documented = rows.map((t) => t.from).sort();
    const expected = MEMBER_LIFECYCLE_STATES.filter((s) => s !== 'anonymized').slice().sort();
    expect(documented).toEqual(expected);
    for (const row of rows) expect(row.to).toBe('anonymized');
  });

  it('replay reaches `anonymized` from a live `active` stream (the off-portal case)', () => {
    // The end-to-end shape 10.21's off-portal path produces: a member who never withdrew, erased under
    // the termination overlay. Under the pre-10.21 reducer this replayed to 'active' with the PII gone.
    const stream: MemberEventInput[] = [
      ev('member.signup_initiated'),
      ev('member.kyc_completed'),
      ev('member.vyawastha_shulk_paid', { utr: 'U1', amount_inr: 1 }),
      ev('member.lock_in_expired', { kyc_verified: true }),
      ev('member.rtbf_anonymized'),
    ];
    const rows = stream.map((e, i) => ({
      eventType: e.type,
      payload: e.payload,
      eventVersion: i + 1,
    })) as unknown as ReplayRows;
    expect(replayMemberState(rows)).toBe('anonymized');
  });
});
