// Story 3.10 voluntary withdrawal — pure, DB-free reducer unit tests (Task 3 / Task 10).
//
// The withdrawal events were AUTHORED + frozen by Story 3.1 (this story is the FIRST EMITTER, not an
// author — state.ts / events.ts are UNCHANGED). This covers the reducer contract 3.10 relies on:
//   · `member.withdrawal_completed` moves `active` / `active-in-grace` / `lapsed-unpaid` → `withdrawn`,
//   · it is IDENTITY from every other (pre-active / locked-in / terminal) state,
//   · `member.withdrawal_requested` is a NON-TRANSITION marker (identity everywhere),
//   · the frozen `WithdrawalCompletedPayloadSchema` is auditShape-only + `.strict()` (structurally
//     CANNOT carry the withdrawal reason — the by-design R1 discipline).

import { describe, expect, it } from 'vitest';

import {
  MEMBER_EVENT_PAYLOAD_SCHEMAS,
  WithdrawalCompletedPayloadSchema,
  WithdrawalRequestedPayloadSchema,
} from '../../src/member/events.js';
import {
  type MemberEventInput,
  type MemberLifecycleState,
  memberStateMachine,
} from '../../src/member/state.js';

const ev = (type: string, payload: unknown = {}): MemberEventInput => ({ type, payload });
const fold = (events: MemberEventInput[]): MemberLifecycleState => memberStateMachine.fold(events);

const TO_ACTIVE: MemberEventInput[] = [
  ev('member.signup_initiated'),
  ev('member.kyc_completed'),
  ev('member.vyawastha_shulk_paid', { utr: 'X', amount_inr: 110 }),
  ev('member.lock_in_expired', { kyc_verified: true }),
];
const TO_GRACE: MemberEventInput[] = [...TO_ACTIVE, ev('member.grace_entered')];
const TO_LAPSED: MemberEventInput[] = [...TO_GRACE, ev('member.grace_expired')];

const withdrawal = () => ev('member.withdrawal_completed', {});

describe('Story 3.10 — withdrawal_completed transition (active + sub-states → withdrawn)', () => {
  it('withdraws from active', () => {
    expect(fold(TO_ACTIVE)).toBe('active');
    expect(fold([...TO_ACTIVE, withdrawal()])).toBe('withdrawn');
  });

  it('withdraws from active-in-grace', () => {
    expect(fold(TO_GRACE)).toBe('active-in-grace');
    expect(fold([...TO_GRACE, withdrawal()])).toBe('withdrawn');
  });

  it('withdraws from lapsed-unpaid', () => {
    expect(fold(TO_LAPSED)).toBe('lapsed-unpaid');
    expect(fold([...TO_LAPSED, withdrawal()])).toBe('withdrawn');
  });
});

describe('Story 3.10 — withdrawal is identity from non-withdrawable states', () => {
  it('is a no-op from pre-active states (pending-kyc / pending-fee / lock-in)', () => {
    expect(fold([ev('member.signup_initiated'), withdrawal()])).toBe('pending-kyc');
    expect(fold([ev('member.signup_initiated'), ev('member.kyc_completed'), withdrawal()])).toBe(
      'pending-fee',
    );
    const toLockIn = [
      ev('member.signup_initiated'),
      ev('member.kyc_completed'),
      ev('member.vyawastha_shulk_paid', { utr: 'X', amount_inr: 110 }),
    ];
    expect(fold(toLockIn)).toBe('lock-in');
    expect(fold([...toLockIn, withdrawal()])).toBe('lock-in');
  });

  it('cannot re-withdraw a withdrawn member (terminal no-op)', () => {
    const once = [...TO_ACTIVE, withdrawal()];
    expect(fold(once)).toBe('withdrawn');
    expect(fold([...once, withdrawal()])).toBe('withdrawn');
  });

  it('is a no-op from anonymized (RTBF terminal)', () => {
    const anon = [...TO_ACTIVE, withdrawal(), ev('member.rtbf_anonymized', {})];
    expect(fold(anon)).toBe('anonymized');
    expect(fold([...anon, withdrawal()])).toBe('anonymized');
  });
});

describe('Story 3.10 — withdrawal_requested is a NON-TRANSITION marker (identity)', () => {
  it('never moves state (from active or pre-active)', () => {
    expect(fold([...TO_ACTIVE, ev('member.withdrawal_requested', {})])).toBe('active');
    expect(fold([ev('member.signup_initiated'), ev('member.withdrawal_requested', {})])).toBe(
      'pending-kyc',
    );
  });
});

describe('Story 3.10 — frozen payload schemas are auditShape-only + strict (R1)', () => {
  const base = {
    from_state: 'active',
    to_state: 'withdrawn',
    trigger: 'voluntary_withdrawal',
    actor: 'member',
  } as const;

  it('accepts the auditShape payload', () => {
    expect(WithdrawalCompletedPayloadSchema.parse(base)).toMatchObject({ to_state: 'withdrawn' });
  });

  it('rejects any attempt to smuggle the reason into the event payload', () => {
    expect(() =>
      WithdrawalCompletedPayloadSchema.parse({ ...base, reason_code: 'financial' }),
    ).toThrow();
    expect(() =>
      WithdrawalCompletedPayloadSchema.parse({ ...base, reason_text: 'moving abroad' }),
    ).toThrow();
  });

  it('binds both withdrawal types in the registry', () => {
    expect(MEMBER_EVENT_PAYLOAD_SCHEMAS['member.withdrawal_completed']).toBe(
      WithdrawalCompletedPayloadSchema,
    );
    expect(MEMBER_EVENT_PAYLOAD_SCHEMAS['member.withdrawal_requested']).toBe(
      WithdrawalRequestedPayloadSchema,
    );
  });
});
