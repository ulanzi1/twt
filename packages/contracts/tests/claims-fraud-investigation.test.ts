// Story 6.22 — the fraud-investigation contracts (DL3–DL7, DL10). The LOCKSTEP pins with @twt/domain, the strict shapes,
// and the ONE step-up constant.

import { claim, schema } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import {
  FRAUD_FINDING_STEP_UP_CONTEXT,
  FraudAliveConfirmation,
  FraudFindingOutcome,
  FraudFindingRequest,
  FraudFlagRequest,
  FraudInvestigationResponse,
  FraudInvestigationStepKind,
  MemberFraudClaimsResponse,
  OpenFraudInvestigationsResponse,
} from '../src/claims/fraud-investigation.js';

const UUID = '11111111-1111-4111-8111-111111111111';
const AT = '2026-11-01T00:00:00.000Z';

describe('Story 6.22 — fraud-investigation contracts', () => {
  it('LOCKSTEP — the proof-of-life set, the outcomes and the step kinds === the domain tuples', () => {
    expect([...FraudAliveConfirmation.options]).toEqual([...schema.FRAUD_ALIVE_CONFIRMATIONS]);
    expect([...FraudFindingOutcome.options]).toEqual([...claim.FRAUD_FINDING_OUTCOMES]);
    expect([...FraudInvestigationStepKind.options]).toEqual([...schema.FRAUD_INVESTIGATION_STEPS]);
  });

  it('the step-up context is ONE exported constant (the route and the admin caller share it)', () => {
    expect(FRAUD_FINDING_STEP_UP_CONTEXT).toBe('fraud_finding');
  });

  it('the flag and finding requests are strict; a phone call is ⛔ proof of life; a missing proof reaches the writer', () => {
    expect(FraudFlagRequest.safeParse({ step_id: UUID, note: 'x' }).success).toBe(true);
    expect(FraudFlagRequest.safeParse({ step_id: UUID, note: 'x', claimant_name: 'X' }).success).toBe(false);
    const finding = { step_id: UUID, finding_id: UUID, outcome: 'innocent', alive_confirmation: 'video_call', note: 'seen' };
    expect(FraudFindingRequest.safeParse(finding).success).toBe(true);
    expect(FraudFindingRequest.safeParse({ ...finding, alive_confirmation: 'phone_call' }).success).toBe(false);
    expect(FraudFindingRequest.safeParse({ ...finding, outcome: 'inconclusive' }).success).toBe(false);
    const noProof: Record<string, unknown> = { ...finding };
    delete noProof['alive_confirmation'];
    expect(FraudFindingRequest.safeParse(noProof).success).toBe(true);
  });

  it('the reads carry ⛔ claimant PII (strict) — the helpline list, the work-list, the console read', () => {
    const member = { claims: [{ claim_case_id: UUID, claim_state: 'denied', filed_at: AT, investigation: 'none' }] };
    expect(MemberFraudClaimsResponse.safeParse(member).success).toBe(true);
    expect(MemberFraudClaimsResponse.safeParse({ claims: [{ ...member.claims[0], claimant_name: 'X' }] }).success).toBe(false);
    const list = { items: [{ claim_case_id: UUID, claim_state: 'verifier_review', claim_filed_at: AT, flagged_at: AT }] };
    expect(OpenFraudInvestigationsResponse.safeParse(list).success).toBe(true);
    expect(OpenFraudInvestigationsResponse.safeParse({ items: [{ ...list.items[0], district: 'Patna' }] }).success).toBe(false);
    const read = {
      claim_case_id: UUID,
      claim_state: 'verifier_review',
      steps: [{ step: 'flagged', actor_display: 'Helpline Operator', acted_at: AT, alive_confirmation: null, note: { state: 'withheld' } }],
      viewer: { can_record_finding: false, is_flagger: false },
    };
    expect(FraudInvestigationResponse.safeParse(read).success).toBe(true);
  });
});
