// Lock-in clock snapshot derivation — pure, DB-free unit tests (Story 3.7, Task 1; AC1).
//
// `getLockInClock` issues a targeted `events_log` query (most-recent member.lock_in_entered, DESC,
// limit 1) and maps the row via the pure `deriveLockInClock` seam — the same shape as `getMemberStateAt`
// delegating to the pure `replayMemberState`. The DB query itself is exercised end-to-end by the API
// integration test (member-home/lock-in-status.spec.ts); HERE we replay the snapshot/parse logic with
// fixtures: a valid lock_in_entered row → snapshot; no such row → null; a malformed payload → null.

import { describe, expect, it } from 'vitest';

import { deriveLockInClock } from '../../src/member/read.js';

const enteredAt = new Date('2026-06-01T10:00:00.000Z');

const validPayload = {
  from_state: 'lock-in' as const,
  to_state: 'lock-in' as const,
  trigger: 'lock_in_entered',
  actor: 'member' as const,
  lock_in_days_at_join: 30,
  lock_in_policy_version: '0e1c0006-0000-4000-8000-000000000006',
};

describe('deriveLockInClock (Story 3.7 clock snapshot — AC1)', () => {
  it('a stream WITH a lock_in_entered row → returns the snapshot (occurred_at + payload fields)', () => {
    const clock = deriveLockInClock({ occurredAt: enteredAt, payload: validPayload });
    expect(clock).toEqual({
      enteredAt,
      lockInDaysAtJoin: 30,
      lockInPolicyVersion: '0e1c0006-0000-4000-8000-000000000006',
    });
  });

  it('a stream WITHOUT a lock_in_entered row (query returned no row) → null', () => {
    expect(deriveLockInClock(undefined)).toBeNull();
  });

  it('a malformed payload (missing snapshot fields) → null (safeParse, never throws)', () => {
    const malformed = {
      from_state: 'lock-in',
      to_state: 'lock-in',
      trigger: 'lock_in_entered',
      actor: 'member',
      // lock_in_days_at_join + lock_in_policy_version absent
    };
    expect(deriveLockInClock({ occurredAt: enteredAt, payload: malformed })).toBeNull();
  });

  it('a non-positive lock_in_days_at_join → null (schema rejects, treated as malformed)', () => {
    expect(
      deriveLockInClock({ occurredAt: enteredAt, payload: { ...validPayload, lock_in_days_at_join: 0 } }),
    ).toBeNull();
  });

  it('a totally non-object payload → null', () => {
    expect(deriveLockInClock({ occurredAt: enteredAt, payload: 'not-an-object' })).toBeNull();
  });
});
