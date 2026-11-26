// Story 6.39a, Task 4.1 / AC7 (DL7, N4) — the gate's NEW wait reason `bank_date_recorded`: a check computed before the
// claim's CURRENT live bank-date record (or naming one that is no longer live) is not current. Pure; the live legs are in
// `membership-check-approval.spec.ts` and the API specs.

import { describe, expect, it } from 'vitest';

import { MEMBERSHIP_CHECK_WAIT_REASONS } from '../../src/claim/errors.js';
import { type MembershipCheckFacts, resolveMembershipCheckApprovalState } from '../../src/claim/membership-check-approval.js';

const R1 = '11111111-1111-4111-8111-111111111111';
const R2 = '22222222-2222-4222-8222-222222222222';

const facts = (over: {
  feeOutcome?: 'before_death' | 'same_day' | 'after_death';
  feeBankDateId?: string | null;
  liveFeeBankDateId?: string | null;
  reviewCurrent?: boolean;
  identityOutcome?: 'not_required' | 'confirmed' | 'not_confirmed';
} = {}): MembershipCheckFacts => ({
  liveCheck: {
    checkId: 'c' as never,
    deathCertificateReviewId: 'R' as never,
    feeOutcome: over.feeOutcome ?? 'before_death',
    feeBankDateId: (over.feeBankDateId ?? null) as never,
    identityRequired: true,
    identityOutcome: over.identityOutcome ?? 'confirmed',
  },
  currentAcceptedReviewId: (over.reviewCurrent === false ? 'OTHER' : 'R') as never,
  liveFeeBankDateId: (over.liveFeeBankDateId ?? null) as never,
  kyc: null,
});

describe('the gate — `bank_date_recorded` (DL7, N4)', () => {
  it('the precedence is not_checked → stale → bank_date_recorded → fee_after_death → identity_not_confirmed', () => {
    expect([...MEMBERSHIP_CHECK_WAIT_REASONS]).toEqual(['not_checked', 'stale', 'bank_date_recorded', 'fee_after_death', 'identity_not_confirmed']);
  });

  it('a live record the check did ⛔ consider ⇒ `bank_date_recorded` (the claim waits for a re-check)', () => {
    expect(resolveMembershipCheckApprovalState(facts({ liveFeeBankDateId: R1 }))).toEqual({ passed: false, reason: 'bank_date_recorded' });
  });

  it('⭐ a check naming a SUPERSEDED record (the live one is another) ⇒ `bank_date_recorded`', () => {
    expect(resolveMembershipCheckApprovalState(facts({ feeBankDateId: R1, liveFeeBankDateId: R2 }))).toEqual({
      passed: false,
      reason: 'bank_date_recorded',
    });
  });

  it('a check naming the live record ⇒ not this wait (ids compared lower-cased)', () => {
    expect(resolveMembershipCheckApprovalState(facts({ feeBankDateId: R1.toUpperCase(), liveFeeBankDateId: R1 }))).toEqual({ passed: true });
  });

  it('`stale` comes BEFORE `bank_date_recorded`; `bank_date_recorded` BEFORE `fee_after_death` and `identity_not_confirmed`', () => {
    expect(resolveMembershipCheckApprovalState(facts({ reviewCurrent: false, liveFeeBankDateId: R1 }))).toEqual({ passed: false, reason: 'stale' });
    expect(resolveMembershipCheckApprovalState(facts({ feeOutcome: 'after_death', liveFeeBankDateId: R1 }))).toEqual({
      passed: false,
      reason: 'bank_date_recorded',
    });
    expect(resolveMembershipCheckApprovalState(facts({ identityOutcome: 'not_confirmed', liveFeeBankDateId: R1 }))).toEqual({
      passed: false,
      reason: 'bank_date_recorded',
    });
  });

  it('⛔ record and ⛔ named record ⇒ 6.39 unchanged (a pass; a blocking fee ⇒ `fee_after_death`)', () => {
    expect(resolveMembershipCheckApprovalState(facts())).toEqual({ passed: true });
    expect(resolveMembershipCheckApprovalState(facts({ feeOutcome: 'same_day' }))).toEqual({ passed: false, reason: 'fee_after_death' });
  });

  it('a check naming a record when ⛔ record is live (can only be a raw row) ⇒ `bank_date_recorded` (fail closed)', () => {
    expect(resolveMembershipCheckApprovalState(facts({ feeBankDateId: R1, liveFeeBankDateId: null }))).toEqual({
      passed: false,
      reason: 'bank_date_recorded',
    });
  });
});
