// Pool-bound payment enforcement — DB-free unit + property suite (Story 7.6, Task 6; AC1/AC2).
//
// Covers the PURE core: the wrong-pool classifier (purity/determinism/exhaustiveness) + the resolution
// guards (absence signal, ≥2-membership integrity throw, binding-uniqueness throw). The DB accessors are
// exercised by contribution-binding.spec.ts (the live-DB integration suite).

import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  CONTRIBUTION_VALIDITY_REASON_CODES,
  CONTRIBUTION_VALIDITY_VERDICTS,
  MemberPoolAssignmentIntegrityError,
  WrongPoolBindingAmbiguousError,
  assertUniquePoolCollectionBindings,
  amountMismatchExcessPaise,
  classifyAmountMismatchDirection,
  classifyContributionAmount,
  classifyContributionDestination,
  resolveAssignedPoolFromCandidates,
  type PoolBindingCandidate,
} from '../../src/pool/index.js';
import { claimId, poolId } from '../../src/ids/index.js';

const CYCLE = '00000000-0000-4000-8000-0000000000c1';

/** Build a candidate (branded ids from arbitrary label suffixes). */
function candidate(
  poolSuffix: string,
  claimSuffix: string,
  poolIndex: number,
  memberIds: readonly string[],
  fixedAmount = 500,
): PoolBindingCandidate {
  return {
    poolId: poolId(`00000000-0000-4000-8000-0000000000${poolSuffix}`),
    claimCaseId: claimId(`00000000-0000-4000-8000-0000000000${claimSuffix}`),
    poolIndex,
    poolCanonicalIdentifier: `P-2026-07-00${poolIndex + 1}`,
    fixedAmount,
    memberIds,
  };
}

const MEMBER_A = '11111111-1111-4111-8111-111111111111';
const MEMBER_B = '22222222-2222-4222-8222-222222222222';
const MEMBER_C = '33333333-3333-4333-8333-333333333333';

describe('classifyContributionDestination — pure wrong-pool classifier (AC2)', () => {
  it('valid iff the deposited pool equals the assigned pool', () => {
    expect(classifyContributionDestination({ assignedPoolId: 'p1', depositedToPoolId: 'p1' })).toEqual({
      verdict: 'valid',
      reasonCode: 'assigned_pool_match',
    });
  });

  it('wrong_pool iff the deposited pool differs', () => {
    expect(classifyContributionDestination({ assignedPoolId: 'p1', depositedToPoolId: 'p2' })).toEqual({
      verdict: 'wrong_pool',
      reasonCode: 'deposited_to_non_assigned_pool',
    });
  });

  it('is PURE + deterministic (same inputs → same output; no clock/DB/randomness)', () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), (assignedPoolId, depositedToPoolId) => {
        const first = classifyContributionDestination({ assignedPoolId, depositedToPoolId });
        const second = classifyContributionDestination({ assignedPoolId, depositedToPoolId });
        expect(first).toEqual(second);
        // The predicate is exactly inequality of the two ids.
        expect(first.verdict).toBe(assignedPoolId === depositedToPoolId ? 'valid' : 'wrong_pool');
        // Verdict + reason code are always members of the shipped tuples (exhaustive, no dead surface).
        expect(CONTRIBUTION_VALIDITY_VERDICTS).toContain(first.verdict);
        expect(CONTRIBUTION_VALIDITY_REASON_CODES).toContain(first.reasonCode);
      }),
    );
  });

  it('deliberately exercises the VALID branch across many equal-id inputs (incl. empty string)', () => {
    // fc.string(),fc.string() almost never generates two EQUAL strings, so the property above exercises
    // the `valid` branch only incidentally. Feed the SAME id to both params so the valid branch is
    // covered across a broad input space (empty string, unicode, long ids) — not just the one 'p1' case.
    fc.assert(
      fc.property(fc.string(), (id) => {
        expect(classifyContributionDestination({ assignedPoolId: id, depositedToPoolId: id })).toEqual({
          verdict: 'valid',
          reasonCode: 'assigned_pool_match',
        });
      }),
    );
  });

  it('ships EXACTLY the three verdicts landed through 7.7 (union open by design, no dead surface now)', () => {
    expect([...CONTRIBUTION_VALIDITY_VERDICTS]).toEqual(['valid', 'wrong_pool', 'amount_mismatch']);
  });
});

describe('classifyContributionAmount — pure amount-mismatch classifier (Story 7.7, AC2.6)', () => {
  it('valid iff the deposited amount equals the locked fixed amount', () => {
    expect(classifyContributionAmount({ expectedFixedAmount: 500, depositedAmount: 500 })).toEqual({
      verdict: 'valid',
      reasonCode: 'assigned_pool_match',
    });
  });

  it('amount_mismatch iff the amounts differ (over- OR under-payment)', () => {
    expect(classifyContributionAmount({ expectedFixedAmount: 500, depositedAmount: 600 })).toEqual({
      verdict: 'amount_mismatch',
      reasonCode: 'amount_does_not_match_fixed_amount',
    });
    expect(classifyContributionAmount({ expectedFixedAmount: 500, depositedAmount: 400 })).toEqual({
      verdict: 'amount_mismatch',
      reasonCode: 'amount_does_not_match_fixed_amount',
    });
  });

  it('is PURE + deterministic; the predicate is exactly inequality of the two amounts', () => {
    fc.assert(
      fc.property(fc.integer(), fc.integer(), (expectedFixedAmount, depositedAmount) => {
        const first = classifyContributionAmount({ expectedFixedAmount, depositedAmount });
        const second = classifyContributionAmount({ expectedFixedAmount, depositedAmount });
        expect(first).toEqual(second);
        expect(first.verdict).toBe(expectedFixedAmount === depositedAmount ? 'valid' : 'amount_mismatch');
        // Verdict + reason code are always members of the shipped tuples (exhaustive, no dead surface).
        expect(CONTRIBUTION_VALIDITY_VERDICTS).toContain(first.verdict);
        expect(CONTRIBUTION_VALIDITY_REASON_CODES).toContain(first.reasonCode);
      }),
    );
  });

  it('deliberately exercises the VALID branch across many EQUAL-amount inputs', () => {
    // Two random ints almost never collide, so the property above hits `valid` only incidentally. Feed the
    // SAME amount to both params so the valid branch is covered across a broad range (the 7.6 lesson).
    fc.assert(
      fc.property(fc.integer(), (amount) => {
        expect(classifyContributionAmount({ expectedFixedAmount: amount, depositedAmount: amount })).toEqual({
          verdict: 'valid',
          reasonCode: 'assigned_pool_match',
        });
      }),
    );
  });

  it('THROWS on non-integer/NaN/Infinity inputs rather than silently misclassifying corrupt data', () => {
    // NaN !== NaN is true, so without the guard a NaN would silently classify as an ordinary amount_mismatch.
    expect(() => classifyContributionAmount({ expectedFixedAmount: NaN, depositedAmount: 500 })).toThrow(/integer/);
    expect(() => classifyContributionAmount({ expectedFixedAmount: 500, depositedAmount: NaN })).toThrow(/integer/);
    expect(() => classifyContributionAmount({ expectedFixedAmount: Infinity, depositedAmount: 500 })).toThrow(/integer/);
    expect(() => classifyContributionAmount({ expectedFixedAmount: 500.5, depositedAmount: 500 })).toThrow(/integer/);
  });

  it('does NO auto-correction — a mismatch is classified invalid, never rewritten to the fixed amount', () => {
    // The classifier only ever RETURNS a verdict; it never mutates or "rounds" the deposited amount (AC2.8/D4).
    const result = classifyContributionAmount({ expectedFixedAmount: 500, depositedAmount: 501 });
    expect(result.verdict).toBe('amount_mismatch');
  });
});

describe('classifyAmountMismatchDirection — the SINGLE source of truth for over/under (Story 9.11, AC2)', () => {
  it('deposited > expected → over', () => {
    expect(classifyAmountMismatchDirection({ expectedPaise: 100_000, depositedPaise: 110_000 })).toBe('over');
  });

  it('deposited < expected → under', () => {
    expect(classifyAmountMismatchDirection({ expectedPaise: 100_000, depositedPaise: 90_000 })).toBe('under');
  });

  it('deposited === expected → exact', () => {
    expect(classifyAmountMismatchDirection({ expectedPaise: 100_000, depositedPaise: 100_000 })).toBe('exact');
  });

  it('non-integer / non-finite inputs throw (the classifyContributionAmount posture — never silently classify)', () => {
    expect(() => classifyAmountMismatchDirection({ expectedPaise: NaN, depositedPaise: 100_000 })).toThrow(/integer/);
    expect(() => classifyAmountMismatchDirection({ expectedPaise: 100_000, depositedPaise: NaN })).toThrow(/integer/);
    expect(() => classifyAmountMismatchDirection({ expectedPaise: Infinity, depositedPaise: 100_000 })).toThrow(/integer/);
    expect(() => classifyAmountMismatchDirection({ expectedPaise: 100_000, depositedPaise: 100.5 })).toThrow(/integer/);
  });

  it('the excess = deposited − expected is the amount FR-36 records (positive for an over-payment)', () => {
    expect(amountMismatchExcessPaise({ expectedPaise: 100_000, depositedPaise: 110_000 })).toBe(10_000);
    expect(amountMismatchExcessPaise({ expectedPaise: 100_000, depositedPaise: 90_000 })).toBe(-10_000);
    expect(() => amountMismatchExcessPaise({ expectedPaise: 100_000, depositedPaise: NaN })).toThrow(/integer/);
  });
});

describe('resolveAssignedPoolFromCandidates — the resolution core (AC1.1/AC1.4)', () => {
  it('returns the single pool whose latest snapshot contains the member', () => {
    // Distinct per-pool fixedAmount (500 vs 700) so the assertion below can only pass if the resolved
    // ref threads through the MATCHED candidate's amount, not e.g. always the first candidate's.
    const candidates = [
      candidate('a1', 'c1', 0, [MEMBER_A, MEMBER_C], 500),
      candidate('a2', 'c2', 1, [MEMBER_B], 700),
    ];
    const r = resolveAssignedPoolFromCandidates(MEMBER_B, candidates, CYCLE);
    expect(r.assigned).toBe(true);
    if (r.assigned) {
      expect(r.poolIndex).toBe(1);
      expect(r.claimCaseId).toBe(candidates[1]!.claimCaseId);
      // The amount-lock surfaces the ASSIGNED pool's (index 1, 700) snapshotted fixed_amount — not
      // candidate 0's 500 (Story 7.7, AC2.5).
      expect(r.fixedAmount).toBe(700);
    }
  });

  it('returns the ABSENCE signal { assigned: false } for an unassigned member (never a throw)', () => {
    const candidates = [candidate('a1', 'c1', 0, [MEMBER_A]), candidate('a2', 'c2', 1, [MEMBER_B])];
    expect(resolveAssignedPoolFromCandidates(MEMBER_C, candidates, CYCLE)).toEqual({ assigned: false });
  });

  it('returns absence when the cycle has no pools', () => {
    expect(resolveAssignedPoolFromCandidates(MEMBER_A, [], CYCLE)).toEqual({ assigned: false });
  });

  it('THROWS MemberPoolAssignmentIntegrityError when a member is in ≥2 pools (AC1.4)', () => {
    const candidates = [
      candidate('a1', 'c1', 0, [MEMBER_A]),
      candidate('a2', 'c2', 1, [MEMBER_A]), // same member in a second pool — integrity violation
    ];
    expect(() => resolveAssignedPoolFromCandidates(MEMBER_A, candidates, CYCLE)).toThrow(
      MemberPoolAssignmentIntegrityError,
    );
  });
});

describe('assertUniquePoolCollectionBindings — the uniqueness guard (AC1.3 / D5)', () => {
  it('passes when every pool in the cycle has a distinct claim_case_id', () => {
    const candidates = [candidate('a1', 'c1', 0, []), candidate('a2', 'c2', 1, [])];
    expect(() => assertUniquePoolCollectionBindings(candidates, CYCLE)).not.toThrow();
  });

  it('THROWS WrongPoolBindingAmbiguousError when two pools share a claim_case_id', () => {
    const candidates = [
      candidate('a1', 'cc', 0, [MEMBER_A]),
      candidate('a2', 'cc', 1, [MEMBER_B]), // same claim → same collection accounts → ambiguous
    ];
    expect(() => assertUniquePoolCollectionBindings(candidates, CYCLE)).toThrow(
      WrongPoolBindingAmbiguousError,
    );
  });

  it('the uniqueness guard fires from resolveAssignedPoolFromCandidates too (guards before matching)', () => {
    const candidates = [candidate('a1', 'cc', 0, [MEMBER_A]), candidate('a2', 'cc', 1, [MEMBER_A])];
    // Even though MEMBER_A is in both, the uniqueness guard fires FIRST (ambiguity is the loud failure).
    expect(() => resolveAssignedPoolFromCandidates(MEMBER_A, candidates, CYCLE)).toThrow(
      WrongPoolBindingAmbiguousError,
    );
  });
});
