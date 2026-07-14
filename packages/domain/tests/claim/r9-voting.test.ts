// R9 voting — pure, DB-free unit tests (Story 6.14, Task 11; AC2/AC3/AC4).
//
// Covers the pure vocabulary + DATA-driven derivations (deriveVotingRequirement / r9QuorumFor /
// computeR9Outcome — panel-size denominator across N∈{1,3,4,5}; the majority/supermajority/unanimous
// boundaries; an absent/deny panelist counting against approval) + the R9_VOTING_CLAUSE_IDS set, AND the
// claim.r9_outcome reducer edges (from all six TRUSTEE_ROUTABLE_STATES; identity elsewhere; malformed → identity).

import { describe, expect, it } from 'vitest';

import {
  computeR9Outcome,
  deriveVotingRequirement,
  isR9VotingClauseId,
  prepareR9VoteCiphertext,
  R9_VOTE_CIPHERTEXT_MAX_BYTES,
  R9_VOTING_CLAUSE_IDS,
  R9CiphertextStorageError,
  R9UnrecognizedVotingRequirementError,
  r9QuorumFor,
  type R9Vote,
} from '../../src/claim/r9-voting.js';
import {
  claimStateMachine,
  R9_OUTCOME_FROM_STATES,
  type ClaimEventInput,
  type ClaimLifecycleState,
} from '../../src/claim/state.js';
import { TRUSTEE_ROUTABLE_STATES } from '../../src/claim/state-trustee-decision-persist.js';

const votes = (approve: number, deny: number): { vote: R9Vote }[] => [
  ...Array.from({ length: approve }, () => ({ vote: 'approve' as const })),
  ...Array.from({ length: deny }, () => ({ vote: 'deny' as const })),
];

describe('deriveVotingRequirement (DATA-driven — D-D)', () => {
  it('defaults to majority (the v1 seed carries only majority_required / bare voting_required)', () => {
    expect(deriveVotingRequirement({ rule_code: 'R9', voting_required: true, majority_required: true })).toBe('majority');
    expect(deriveVotingRequirement({ rule_code: 'R9(A)', voting_required: true })).toBe('majority');
    expect(deriveVotingRequirement({ rule_code: 'R9', majority_required: true })).toBe('majority');
  });
  it('reads supermajority_required / unanimous_required forward-compat flags', () => {
    expect(deriveVotingRequirement({ supermajority_required: true })).toBe('supermajority');
    expect(deriveVotingRequirement({ unanimous_required: true })).toBe('unanimous');
    // unanimous takes precedence over supermajority when both are (erroneously) set.
    expect(deriveVotingRequirement({ unanimous_required: true, supermajority_required: true })).toBe('unanimous');
  });
  it('throws on a payload carrying NONE of the recognized voting-requirement keys (registry data-shape drift) — never silently defaults to majority', () => {
    expect(() => deriveVotingRequirement({})).toThrow(R9UnrecognizedVotingRequirementError);
    expect(() => deriveVotingRequirement({ rule_code: 'R9', unrelated_field: true })).toThrow(R9UnrecognizedVotingRequirementError);
  });
});

describe('r9QuorumFor (v1 default ⌊N/2⌋+1)', () => {
  it.each([
    [1, 1],
    [2, 2],
    [3, 2],
    [4, 3],
    [5, 3],
  ])('N=%i → quorum %i', (n, q) => {
    expect(r9QuorumFor(n)).toBe(q);
  });
});

describe('isR9VotingClauseId / R9_VOTING_CLAUSE_IDS', () => {
  it('accepts exactly the three route_r9_voting clauses', () => {
    expect(R9_VOTING_CLAUSE_IDS).toEqual([
      'niy.special-death.r9',
      'niy.special-death.r9-a',
      'niy.special-death.r9-suicide-murder',
    ]);
    for (const id of R9_VOTING_CLAUSE_IDS) expect(isR9VotingClauseId(id)).toBe(true);
    expect(isR9VotingClauseId('niy.special-death.r5-e')).toBe(false);
    expect(isR9VotingClauseId('niy.concealment.r14')).toBe(false);
  });
});

describe('computeR9Outcome — panel-size denominator (D-D)', () => {
  it('majority ⟺ approve > N/2 (an absent/deny panelist counts against approval)', () => {
    // N=3: threshold ⌊3/2⌋+1 = 2.
    expect(computeR9Outcome(votes(2, 0), 3, 'majority')).toMatchObject({ outcome: 'approved', approve_count: 2, deny_count: 0 });
    expect(computeR9Outcome(votes(1, 1), 3, 'majority')).toMatchObject({ outcome: 'denied', approve_count: 1, deny_count: 1 }); // 1 approve of 3 → below 2
    expect(computeR9Outcome(votes(1, 0), 3, 'majority')).toMatchObject({ outcome: 'denied', approve_count: 1, deny_count: 0 }); // 1 approve, 2 absent → denied
    // N=4 (even): threshold ⌊4/2⌋+1 = 3 (approve > N/2, NOT ≥).
    expect(computeR9Outcome(votes(2, 2), 4, 'majority')).toMatchObject({ outcome: 'denied', approve_count: 2, deny_count: 2 }); // a 2-2 tie is NOT a majority
    expect(computeR9Outcome(votes(3, 1), 4, 'majority')).toMatchObject({ outcome: 'approved', approve_count: 3, deny_count: 1 });
    // N=1: threshold 1.
    expect(computeR9Outcome(votes(1, 0), 1, 'majority')).toMatchObject({ outcome: 'approved', approve_count: 1, deny_count: 0 });
    expect(computeR9Outcome(votes(0, 1), 1, 'majority')).toMatchObject({ outcome: 'denied', approve_count: 0, deny_count: 1 });
  });

  it('supermajority ⟺ approve ≥ ⌈2N/3⌉', () => {
    // N=3: ⌈6/3⌉ = 2.
    expect(computeR9Outcome(votes(2, 1), 3, 'supermajority')).toMatchObject({ outcome: 'approved', approve_count: 2, deny_count: 1 });
    expect(computeR9Outcome(votes(1, 2), 3, 'supermajority')).toMatchObject({ outcome: 'denied', approve_count: 1, deny_count: 2 });
    // N=4: ⌈8/3⌉ = 3.
    expect(computeR9Outcome(votes(3, 1), 4, 'supermajority')).toMatchObject({ outcome: 'approved', approve_count: 3, deny_count: 1 });
    expect(computeR9Outcome(votes(2, 2), 4, 'supermajority')).toMatchObject({ outcome: 'denied', approve_count: 2, deny_count: 2 });
    // N=5: ⌈10/3⌉ = 4.
    expect(computeR9Outcome(votes(4, 1), 5, 'supermajority')).toMatchObject({ outcome: 'approved', approve_count: 4, deny_count: 1 });
    expect(computeR9Outcome(votes(3, 2), 5, 'supermajority')).toMatchObject({ outcome: 'denied', approve_count: 3, deny_count: 2 });
  });

  it('unanimous ⟺ approve === N (a single dissent/absentee denies)', () => {
    expect(computeR9Outcome(votes(5, 0), 5, 'unanimous')).toMatchObject({ outcome: 'approved', approve_count: 5, deny_count: 0 });
    expect(computeR9Outcome(votes(4, 1), 5, 'unanimous')).toMatchObject({ outcome: 'denied', approve_count: 4, deny_count: 1 }); // one dissent
    expect(computeR9Outcome(votes(4, 0), 5, 'unanimous')).toMatchObject({ outcome: 'denied', approve_count: 4, deny_count: 0 }); // one absentee (only 4 cast)
    expect(computeR9Outcome(votes(1, 0), 1, 'unanimous')).toMatchObject({ outcome: 'approved', approve_count: 1, deny_count: 0 });
  });

  it('returns the exact tally counts', () => {
    const r = computeR9Outcome(votes(3, 2), 5, 'majority');
    expect(r).toMatchObject({ approve_count: 3, deny_count: 2, outcome: 'approved' });
  });
});

describe('prepareR9VoteCiphertext (AC3 — the storage-safety ceiling, NOT a plaintext-length proxy)', () => {
  it('stamps a normal-sized ciphertext unchanged', () => {
    expect(prepareR9VoteCiphertext('enc:v1:fake-ciphertext')).toBe('enc:v1:fake-ciphertext');
  });
  it('rejects an empty ciphertext', () => {
    expect(() => prepareR9VoteCiphertext('')).toThrow(R9CiphertextStorageError);
  });
  it('rejects a ciphertext exceeding the storage-safety ceiling', () => {
    expect(() => prepareR9VoteCiphertext('x'.repeat(R9_VOTE_CIPHERTEXT_MAX_BYTES + 1))).toThrow(R9CiphertextStorageError);
  });
  it('accepts a ciphertext exactly at the storage-safety ceiling', () => {
    const atCeiling = 'x'.repeat(R9_VOTE_CIPHERTEXT_MAX_BYTES);
    expect(prepareR9VoteCiphertext(atCeiling)).toBe(atCeiling);
  });
});

describe('claim.r9_outcome reducer edges (D-A)', () => {
  const step = (s: ClaimLifecycleState, e: ClaimEventInput) => claimStateMachine.step(s, e);
  const ev = (outcome: 'approved' | 'denied'): ClaimEventInput => ({ type: 'claim.r9_outcome', payload: { outcome } });

  it('R9_OUTCOME_FROM_STATES stays byte-identical (lockstep) with TRUSTEE_ROUTABLE_STATES — state.ts inlines its own copy (to avoid a state.ts → state-trustee-decision-persist → project → state import cycle), so a future edit to one that is not mirrored in the other would silently make finalize a no-op for legitimately-routed claims', () => {
    expect([...R9_OUTCOME_FROM_STATES].sort()).toEqual([...TRUSTEE_ROUTABLE_STATES].sort());
  });

  it('advances from ALL SIX TRUSTEE_ROUTABLE_STATES: approved → state_trustee_approved, denied → denied', () => {
    for (const from of TRUSTEE_ROUTABLE_STATES) {
      expect(step(from as ClaimLifecycleState, ev('approved'))).toBe('state_trustee_approved');
      expect(step(from as ClaimLifecycleState, ev('denied'))).toBe('denied');
    }
  });

  it('is identity from a NON-routable state (e.g. approved / settled / denied)', () => {
    for (const from of ['approved', 'settled', 'denied', 'intake_pending'] as ClaimLifecycleState[]) {
      expect(step(from, ev('approved'))).toBe(from);
    }
  });

  it('is identity on a malformed payload (safeParse fallback — never throws)', () => {
    expect(step('verifier_approved', { type: 'claim.r9_outcome', payload: {} })).toBe('verifier_approved');
    expect(step('verifier_approved', { type: 'claim.r9_outcome', payload: { outcome: 'nonsense' } })).toBe('verifier_approved');
    expect(step('verifier_approved', { type: 'claim.r9_outcome', payload: null })).toBe('verifier_approved');
  });

  it('re-approving an already state_trustee_approved claim is identity (idempotent-safe)', () => {
    expect(step('state_trustee_approved', ev('approved'))).toBe('state_trustee_approved');
  });
});
