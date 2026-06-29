// Lock-in events + policy-payload parsing — pure, DB-free unit tests (Story 3.6b, Task 10).
//
// Covers the two DB-free pieces of 3.6b's domain surface:
//   · the WIDENED member.lock_in_entered payload schema (AC3 / R3) — `.strict()` rejects unknown
//     keys AND requires the two new snapshot fields;
//   · the `niy.lock-in.policy` clause-payload parse (AC3) — passthrough tolerates structural keys,
//     reads `lock_in_days`, and rejects a malformed / absent value.
// The gate matrix + resolveLockInPolicy registry round-trip are integration-tested (they read the DB).

import { describe, expect, it } from 'vitest';

import { LockInEnteredPayloadSchema, VyawasthaShulkPaidPayloadSchema } from '../../src/member/events.js';
import { LockInPolicyPayloadSchema } from '../../src/member/lock-in.js';

const baseAudit = {
  from_state: 'lock-in' as const,
  to_state: 'lock-in' as const,
  trigger: 'lock_in_entered',
  actor: 'member' as const,
};

describe('LockInEnteredPayloadSchema (widened — AC3 / R3)', () => {
  it('accepts the audit shape + the two snapshot fields', () => {
    const parsed = LockInEnteredPayloadSchema.parse({
      ...baseAudit,
      lock_in_days_at_join: 30,
      lock_in_policy_version: '0e1c0006-0000-4000-8000-000000000006',
    });
    expect(parsed.lock_in_days_at_join).toBe(30);
    expect(parsed.lock_in_policy_version).toBe('0e1c0006-0000-4000-8000-000000000006');
  });

  it('requires lock_in_days_at_join (a positive int) + lock_in_policy_version', () => {
    expect(() => LockInEnteredPayloadSchema.parse({ ...baseAudit })).toThrow();
    expect(() =>
      LockInEnteredPayloadSchema.parse({ ...baseAudit, lock_in_days_at_join: 0, lock_in_policy_version: 'v' }),
    ).toThrow();
    expect(() =>
      LockInEnteredPayloadSchema.parse({ ...baseAudit, lock_in_days_at_join: 30, lock_in_policy_version: '' }),
    ).toThrow();
  });

  it('.strict() rejects an unknown key', () => {
    expect(() =>
      LockInEnteredPayloadSchema.parse({
        ...baseAudit,
        lock_in_days_at_join: 30,
        lock_in_policy_version: 'v',
        rogue: true,
      }),
    ).toThrow();
  });
});

describe('VyawasthaShulkPaidPayloadSchema (unchanged — emit, not widen)', () => {
  it('still accepts { ...audit, utr, amount_inr } and rejects unknown keys', () => {
    const parsed = VyawasthaShulkPaidPayloadSchema.parse({
      from_state: 'pending-fee',
      to_state: 'lock-in',
      trigger: 'vyawastha_shulk_paid',
      actor: 'member',
      utr: '123456789012',
      amount_inr: 110,
    });
    expect(parsed.amount_inr).toBe(110);
    expect(() =>
      VyawasthaShulkPaidPayloadSchema.parse({
        from_state: 'pending-fee',
        to_state: 'lock-in',
        trigger: 'vyawastha_shulk_paid',
        actor: 'member',
        utr: '123456789012',
        amount_inr: 110,
        lock_in_days_at_join: 30,
      }),
    ).toThrow();
  });
});

describe('LockInPolicyPayloadSchema (niy.lock-in.policy parse — AC3)', () => {
  it('reads lock_in_days and passes through structural keys', () => {
    const parsed = LockInPolicyPayloadSchema.parse({
      rule_code: 'LOCK-IN',
      title_en: 'Lock-in policy',
      lock_in_days: 30,
      provisional: true,
    });
    expect(parsed.lock_in_days).toBe(30);
  });

  it('rejects a missing / non-positive / non-integer lock_in_days', () => {
    expect(LockInPolicyPayloadSchema.safeParse({ rule_code: 'X' }).success).toBe(false);
    expect(LockInPolicyPayloadSchema.safeParse({ lock_in_days: 0 }).success).toBe(false);
    expect(LockInPolicyPayloadSchema.safeParse({ lock_in_days: 30.5 }).success).toBe(false);
    expect(LockInPolicyPayloadSchema.safeParse({ lock_in_days: '30' }).success).toBe(false);
  });
});
