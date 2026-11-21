// Story 6.39 — code review 2026-11-21: the writer maps a 23505 on the one-live-check index (and ONLY that index) to the
// typed `check_changed` refusal. The predicate is pure; the race itself is proved live in
// `tests/integration/claim/membership-check-concurrency.spec.ts`.

import { describe, expect, it } from 'vitest';

import { CLAIM_MEMBERSHIP_CHECK_ONE_LIVE_INDEX, isOneLiveCheckViolation } from '../../src/claim/index.js';

describe('isOneLiveCheckViolation', () => {
  it('names the 0212 index', () => {
    expect(CLAIM_MEMBERSHIP_CHECK_ONE_LIVE_INDEX).toBe('claim_membership_checks_one_live_per_claim_uq');
  });
  it('is true for a 23505 on that index — on the error or on its drizzle `.cause`', () => {
    expect(isOneLiveCheckViolation({ code: '23505', constraint: CLAIM_MEMBERSHIP_CHECK_ONE_LIVE_INDEX })).toBe(true);
    expect(isOneLiveCheckViolation({ cause: { code: '23505', constraint: CLAIM_MEMBERSHIP_CHECK_ONE_LIVE_INDEX } })).toBe(true);
  });
  it('is false for any other 23505, another SQLSTATE, and a non-object', () => {
    expect(isOneLiveCheckViolation({ code: '23505', constraint: 'claim_membership_checks_pkey' })).toBe(false);
    expect(isOneLiveCheckViolation({ code: '23503', constraint: CLAIM_MEMBERSHIP_CHECK_ONE_LIVE_INDEX })).toBe(false);
    expect(isOneLiveCheckViolation(null)).toBe(false);
    expect(isOneLiveCheckViolation(new Error('x'))).toBe(false);
  });
});
