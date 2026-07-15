// claim.r9_outcome event schema — pure unit tests (Story 6.14, Task 11; AC0/AC10).
//
// The 29th claim event: registered + bound in the payload-schema map, strict, and carries the NON-PII tally
// + rule snapshot ONLY (no display name / voter identity — AC10).

import { describe, expect, it } from 'vitest';

import {
  CLAIM_EVENT_PAYLOAD_SCHEMAS,
  CLAIM_EVENT_TYPES,
  ClaimR9OutcomePayloadSchema,
} from '../../src/claim/events.js';

const validPayload = {
  from_state: 'verifier_approved',
  to_state: 'state_trustee_approved',
  trigger: 'r9_panel_finalize_approve',
  actor: 'trustee',
  outcome: 'approved',
  clause_id: 'niy.special-death.r9',
  clause_version_id: '0e1c0013-0000-4000-8000-000000000013',
  voting_requirement: 'majority',
  approve_count: 2,
  deny_count: 1,
};

describe('ClaimR9OutcomePayloadSchema (the 29th claim event)', () => {
  it('is registered as a claim event type + bound in the payload-schema map', () => {
    expect(CLAIM_EVENT_TYPES).toContain('claim.r9_outcome');
    expect(CLAIM_EVENT_TYPES).toHaveLength(30); // Story 6.15 added the 30th (claim.concealment_assessed)
    expect(CLAIM_EVENT_PAYLOAD_SCHEMAS['claim.r9_outcome']).toBe(ClaimR9OutcomePayloadSchema);
  });

  it('accepts a valid non-PII tally + rule snapshot payload', () => {
    expect(ClaimR9OutcomePayloadSchema.parse(validPayload)).toMatchObject({ outcome: 'approved', approve_count: 2 });
  });

  it('rejects an unknown key (.strict() — e.g. a smuggled display name / voter identity, AC10)', () => {
    expect(() => ClaimR9OutcomePayloadSchema.parse({ ...validPayload, finalized_display: 'Trustee One' })).toThrow();
    expect(() => ClaimR9OutcomePayloadSchema.parse({ ...validPayload, voter_actor_id: 'x' })).toThrow();
  });

  it('rejects an invalid outcome / voting_requirement / non-uuid clause_version_id / negative count', () => {
    expect(() => ClaimR9OutcomePayloadSchema.parse({ ...validPayload, outcome: 'routed_to_r9' })).toThrow();
    expect(() => ClaimR9OutcomePayloadSchema.parse({ ...validPayload, voting_requirement: 'plurality' })).toThrow();
    expect(() => ClaimR9OutcomePayloadSchema.parse({ ...validPayload, clause_version_id: 'not-a-uuid' })).toThrow();
    expect(() => ClaimR9OutcomePayloadSchema.parse({ ...validPayload, approve_count: -1 })).toThrow();
  });

  it('rejects a negative deny_count + an empty clause_id (siblings of the approve_count/other checks above)', () => {
    expect(() => ClaimR9OutcomePayloadSchema.parse({ ...validPayload, deny_count: -1 })).toThrow();
    expect(() => ClaimR9OutcomePayloadSchema.parse({ ...validPayload, clause_id: '' })).toThrow();
  });
});
