// Cost-optimization composition seams — DB-free unit test (Story 5.7, Task 3/4; AC4).
//
// Asserts:
//   · resolveMemberLastEngagement is a thin pass-through to the pure-domain getMemberLastEngagementAt
//     accessor (the MAX-last_seen_at app-open proxy) — returning its Date | null verbatim, keyed by memberId
//     (RLS-scoped; the pariwarId arg documents the tenant boundary the caller already entered).
//   · resolveCostOptimizationToggle returns the FAIL-SAFE default (false / OFF) until Epic 10 wires the real
//     per-Pariwar FR-58C flag — OFF ⇒ the policy suppresses nothing ⇒ full reach.

import { describe, expect, it, vi } from 'vitest';

const getMemberLastEngagementAt = vi.fn();

vi.mock('@twt/domain', async (importActual) => {
  const actual = await importActual<typeof import('@twt/domain')>();
  return {
    ...actual,
    deviceToken: { ...actual.deviceToken, getMemberLastEngagementAt },
  };
});

const { resolveMemberLastEngagement, resolveCostOptimizationToggle } = await import(
  '../../src/modules/channel-config/composition.js'
);
const { ids } = await import('@twt/domain');

const PARIWAR = ids.pariwarId('11111111-1111-1111-1111-111111111111');
const MEMBER = ids.memberId('22222222-2222-2222-2222-222222222222');
const DEPS = { db: {} as never };

describe('resolveMemberLastEngagement — thin pass-through to the domain accessor (AC4)', () => {
  it('returns the accessor Date verbatim, keyed by memberId', async () => {
    const at = new Date('2026-07-07T11:30:00.000Z');
    getMemberLastEngagementAt.mockReset().mockResolvedValue(at);

    const last = await resolveMemberLastEngagement(DEPS, PARIWAR, MEMBER);
    expect(last).toBe(at);
    expect(getMemberLastEngagementAt).toHaveBeenCalledWith(DEPS.db, MEMBER);
  });

  it('propagates null (no engagement signal → the policy fails toward reach)', async () => {
    getMemberLastEngagementAt.mockReset().mockResolvedValue(null);
    expect(await resolveMemberLastEngagement(DEPS, PARIWAR, MEMBER)).toBeNull();
  });
});

describe('resolveCostOptimizationToggle — fail-safe OFF until Epic 10 (AC4)', () => {
  it('returns false (OFF) — suppress nothing ⇒ full reach', async () => {
    expect(await resolveCostOptimizationToggle(DEPS, PARIWAR)).toBe(false);
  });
});
