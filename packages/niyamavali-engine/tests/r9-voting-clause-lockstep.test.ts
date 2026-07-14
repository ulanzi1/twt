// R9_VOTING_CLAUSE_IDS lockstep — Story 6.14 (Task 11).
//
// The domain constant `claim.R9_VOTING_CLAUSE_IDS` (the allowed-selection set `openR9VotingSession` accepts)
// MUST stay in lockstep with the niyamavali-engine truth: the special-death clauses whose payload routes via
// `on_pass: 'route_r9_voting'`. Domain cannot import the engine (the turbo cycle), so this pin lives in the
// engine package (which CAN import @twt/domain). A new/removed route_r9_voting clause fails HERE until the
// domain set is updated in lockstep.

import { claim } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import { SPECIAL_DEATH_PAYLOADS } from './fixtures/special-death-clauses.js';

describe('R9_VOTING_CLAUSE_IDS ↔ engine route_r9_voting clauses', () => {
  it('domain R9_VOTING_CLAUSE_IDS === the special-death clauses that route via route_r9_voting', () => {
    const engineRouteR9 = Object.entries(SPECIAL_DEATH_PAYLOADS)
      .filter(([, payload]) => payload['on_pass'] === 'route_r9_voting')
      .map(([clauseId]) => clauseId)
      .sort();
    expect([...claim.R9_VOTING_CLAUSE_IDS].sort()).toEqual(engineRouteR9);
  });
});
