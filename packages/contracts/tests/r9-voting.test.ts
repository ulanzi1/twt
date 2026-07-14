// R9 voting contract tests — Story 6.14 (Task 11; AC1–AC8).
//
// `.strict()` discipline (a smuggled actor identity is a 400), the R9-clause-id superRefine, the rationale
// ≤500 required-non-empty rule, and the DRIFT LOCKSTEP: R9_VOTING_CLAUSE_IDS + the wire enums are
// value-aligned with the @twt/domain canonical sources (contracts tests MAY import domain).

import { claim } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import {
  R9_RATIONALE_MAX_CHARS,
  R9_VOTING_CLAUSE_IDS,
  R9CancelRequest,
  R9OpenSessionRequest,
  R9Vote,
  R9VoteRequest,
  R9VotingRequirement,
} from '../src/index.js';

const UUID = '11111111-1111-1111-1111-111111111111';

describe('R9OpenSessionRequest', () => {
  it('accepts an R9-voting clause + a non-empty roster', () => {
    expect(R9OpenSessionRequest.safeParse({ clause_id: 'niy.special-death.r9', panel_actor_ids: [UUID] }).success).toBe(true);
  });
  it('rejects a non-R9 clause id (the superRefine)', () => {
    expect(R9OpenSessionRequest.safeParse({ clause_id: 'niy.special-death.r5-e', panel_actor_ids: [UUID] }).success).toBe(false);
  });
  it('rejects an empty roster + duplicate roster members', () => {
    expect(R9OpenSessionRequest.safeParse({ clause_id: 'niy.special-death.r9', panel_actor_ids: [] }).success).toBe(false);
    expect(R9OpenSessionRequest.safeParse({ clause_id: 'niy.special-death.r9', panel_actor_ids: [UUID, UUID] }).success).toBe(false);
  });
  it('rejects an unknown key (.strict() — a smuggled opened_display)', () => {
    expect(
      R9OpenSessionRequest.safeParse({ clause_id: 'niy.special-death.r9', panel_actor_ids: [UUID], opened_display: 'X' }).success,
    ).toBe(false);
  });
});

describe('R9VoteRequest', () => {
  it('requires a non-empty rationale ≤500 chars', () => {
    expect(R9VoteRequest.safeParse({ vote: 'approve', rationale: 'ok' }).success).toBe(true);
    expect(R9VoteRequest.safeParse({ vote: 'approve', rationale: '' }).success).toBe(false);
    expect(R9VoteRequest.safeParse({ vote: 'approve', rationale: '   ' }).success).toBe(false);
    expect(R9VoteRequest.safeParse({ vote: 'deny', rationale: 'x'.repeat(R9_RATIONALE_MAX_CHARS + 1) }).success).toBe(false);
  });
  it('accepts a rationale at the exact ≤500-char boundary', () => {
    expect(R9VoteRequest.safeParse({ vote: 'approve', rationale: 'x'.repeat(R9_RATIONALE_MAX_CHARS) }).success).toBe(true);
  });
  it('rejects an unknown key (.strict() — a smuggled voter_display)', () => {
    expect(R9VoteRequest.safeParse({ vote: 'approve', rationale: 'ok', voter_display: 'X' }).success).toBe(false);
  });
  it('rejects an unknown key (.strict() — a smuggled voter_actor_id)', () => {
    expect(R9VoteRequest.safeParse({ vote: 'approve', rationale: 'ok', voter_actor_id: UUID }).success).toBe(false);
  });
});

describe('R9CancelRequest', () => {
  it('requires reason_code + rationale', () => {
    expect(R9CancelRequest.safeParse({ reason_code: 'wrong_clause', rationale: 'corrected panel' }).success).toBe(true);
    expect(R9CancelRequest.safeParse({ reason_code: '', rationale: 'x' }).success).toBe(false);
    expect(R9CancelRequest.safeParse({ reason_code: 'x', rationale: '' }).success).toBe(false);
  });
});

describe('DRIFT LOCKSTEP — R9 wire vocabulary matches @twt/domain canonical sources', () => {
  it('R9_VOTING_CLAUSE_IDS === domain R9_VOTING_CLAUSE_IDS (order-exact)', () => {
    expect([...R9_VOTING_CLAUSE_IDS]).toEqual([...claim.R9_VOTING_CLAUSE_IDS]);
  });
  it('R9Vote options === domain R9_VOTES', () => {
    expect(R9Vote.options).toEqual([...claim.R9_VOTES]);
  });
  it('R9VotingRequirement options === domain R9_VOTING_REQUIREMENTS', () => {
    expect(R9VotingRequirement.options).toEqual([...claim.R9_VOTING_REQUIREMENTS]);
  });
});
