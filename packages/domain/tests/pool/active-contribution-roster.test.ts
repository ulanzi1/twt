// Roster-size resolution — DB-free unit suite (Story 8.2, Task 7; AC4).
//
// Covers the PURE core `resolveAssignedPoolWithRosterFromCandidates`: the My Pool progress meter's
// DENOMINATOR (roster size N) is read off the MATCHED candidate's latest-snapshot `memberIds`, and the
// absence signal is preserved for an unassigned member. The DB shell (…ForMember) is exercised by the
// live-DB integration spec. This is the AC4 load-bearing derivation: the meter's N comes from the pool
// roster, never re-derived elsewhere.

import { describe, expect, it } from 'vitest';

import {
  MemberPoolAssignmentIntegrityError,
  resolveAssignedPoolWithRosterFromCandidates,
  type PoolBindingCandidate,
} from '../../src/pool/index.js';
import { claimId, poolId } from '../../src/ids/index.js';

const CYCLE = '00000000-0000-4000-8000-0000000000c1';
const MEMBER_A = '11111111-1111-4111-8111-111111111111';
const MEMBER_B = '22222222-2222-4222-8222-222222222222';
const MEMBER_C = '33333333-3333-4333-8333-333333333333';
const OUTSIDER = '99999999-9999-4999-8999-999999999999';

function candidate(
  poolSuffix: string,
  claimSuffix: string,
  poolIndex: number,
  memberIds: readonly string[],
): PoolBindingCandidate {
  return {
    poolId: poolId(`00000000-0000-4000-8000-0000000000${poolSuffix}`),
    claimCaseId: claimId(`00000000-0000-4000-8000-0000000000${claimSuffix}`),
    poolIndex,
    poolCanonicalIdentifier: `P-2026-07-00${poolIndex + 1}`,
    fixedAmount: 500,
    memberIds,
  };
}

describe('resolveAssignedPoolWithRosterFromCandidates — the AC4 meter denominator', () => {
  it('returns the assigned pool + rosterSize = the matched pool member count', () => {
    const candidates = [
      candidate('a1', 'c1', 0, [MEMBER_A, MEMBER_B, MEMBER_C]),
      candidate('a2', 'c2', 1, [OUTSIDER]),
    ];
    const res = resolveAssignedPoolWithRosterFromCandidates(MEMBER_A, candidates, CYCLE);
    expect(res.assigned).toBe(true);
    if (res.assigned) {
      expect(res.rosterSize).toBe(3);
      expect(res.poolIndex).toBe(0);
      expect(res.fixedAmount).toBe(500);
    }
  });

  it('roster size is the pool the member is IN — not the largest / another pool', () => {
    const candidates = [
      candidate('a1', 'c1', 0, [MEMBER_A, MEMBER_B, MEMBER_C]),
      candidate('a2', 'c2', 1, [OUTSIDER]),
    ];
    const res = resolveAssignedPoolWithRosterFromCandidates(OUTSIDER, candidates, CYCLE);
    expect(res.assigned).toBe(true);
    if (res.assigned) expect(res.rosterSize).toBe(1);
  });

  it('a single-member pool → rosterSize 1 (the meter is 0 of 1 until Epic 9 confirms)', () => {
    const res = resolveAssignedPoolWithRosterFromCandidates(MEMBER_A, [candidate('a1', 'c1', 0, [MEMBER_A])], CYCLE);
    expect(res.assigned).toBe(true);
    if (res.assigned) expect(res.rosterSize).toBe(1);
  });

  it('an unassigned member → { assigned: false } (the absence signal is preserved)', () => {
    const res = resolveAssignedPoolWithRosterFromCandidates(OUTSIDER, [candidate('a1', 'c1', 0, [MEMBER_A])], CYCLE);
    expect(res).toEqual({ assigned: false });
  });

  it('an empty candidate set → { assigned: false }', () => {
    expect(resolveAssignedPoolWithRosterFromCandidates(MEMBER_A, [], CYCLE)).toEqual({ assigned: false });
  });

  it('a member in ≥2 pools still throws the integrity error (delegates to the shared core)', () => {
    const candidates = [
      candidate('a1', 'c1', 0, [MEMBER_A]),
      candidate('a2', 'c2', 1, [MEMBER_A]),
    ];
    expect(() => resolveAssignedPoolWithRosterFromCandidates(MEMBER_A, candidates, CYCLE)).toThrow(
      MemberPoolAssignmentIntegrityError,
    );
  });
});
