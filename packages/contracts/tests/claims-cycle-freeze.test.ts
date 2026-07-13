// State-Trustee cycle-freeze contract tests — Story 6.13 (Task 9).
//
// Verifies (1) the decision-request superRefine enforces the D-F rules (reason-code required for deny +
// route_to_r9 + a denying escalation resolution; optional for approve; outcome-compat; rationale on
// deny/"other"; escalation_outcome presence), (2) `.strict()` rejects a smuggled actor_display, and (3)
// the trustee outcome/reason-code enums + compat map are value-aligned (lockstep) with the @twt/domain
// source of truth (the anti-drift guard — @twt/domain cannot import @twt/contracts, so the wire mirror is
// re-declared and pinned here).

import { claim } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import {
  CycleFreezeCommitRequest,
  CycleFreezeDecisionRequest,
  StateTrusteeDecisionOutcome,
  StateTrusteeReasonCode,
  TRUSTEE_REASON_CODE_OUTCOME_COMPAT,
} from '../src/index.js';

// ── Lockstep (anti-drift guard, D-F) ────────────────────────────────────────────────────────
describe('Story 6.13 — trustee outcome/reason-code lockstep (contracts ↔ domain)', () => {
  it('domain STATE_TRUSTEE_DECISION_OUTCOMES === contracts StateTrusteeDecisionOutcome.options', () => {
    expect([...claim.STATE_TRUSTEE_DECISION_OUTCOMES].sort()).toEqual([...StateTrusteeDecisionOutcome.options].sort());
  });

  it('domain STATE_TRUSTEE_REASON_CODES === contracts StateTrusteeReasonCode.options', () => {
    expect([...claim.STATE_TRUSTEE_REASON_CODES].sort()).toEqual([...StateTrusteeReasonCode.options].sort());
  });

  it('domain TRUSTEE_REASON_CODE_OUTCOME_COMPAT === contracts copy, key-for-key and value-for-value', () => {
    const domainKeys = Object.keys(claim.TRUSTEE_REASON_CODE_OUTCOME_COMPAT).sort();
    const contractKeys = Object.keys(TRUSTEE_REASON_CODE_OUTCOME_COMPAT).sort();
    expect(contractKeys).toEqual(domainKeys);
    for (const key of domainKeys) {
      const d = [...claim.TRUSTEE_REASON_CODE_OUTCOME_COMPAT[key as claim.StateTrusteeReasonCode]].sort();
      const c = [...TRUSTEE_REASON_CODE_OUTCOME_COMPAT[key as StateTrusteeReasonCode]].sort();
      expect(c).toEqual(d);
    }
  });
});

// ── superRefine (D-F) ───────────────────────────────────────────────────────────────────────
describe('CycleFreezeDecisionRequest superRefine (D-F)', () => {
  const CLAIM = '00000000-0000-0000-0000-000000000001';

  it('approve needs NO reason code', () => {
    expect(CycleFreezeDecisionRequest.safeParse({ claim_case_id: CLAIM, action: 'approve' }).success).toBe(true);
  });

  it('deny REQUIRES a reason code', () => {
    expect(CycleFreezeDecisionRequest.safeParse({ claim_case_id: CLAIM, action: 'deny' }).success).toBe(false);
  });

  it('deny with a valid reason + rationale is accepted', () => {
    const r = CycleFreezeDecisionRequest.safeParse({
      claim_case_id: CLAIM,
      action: 'deny',
      reason_code: 'standing_not_met',
      rationale: 'Ladder not met on review.',
    });
    expect(r.success).toBe(true);
  });

  it('deny with a reason but NO rationale is rejected (rationale required on deny)', () => {
    const r = CycleFreezeDecisionRequest.safeParse({
      claim_case_id: CLAIM,
      action: 'deny',
      reason_code: 'standing_not_met',
    });
    expect(r.success).toBe(false);
  });

  it('route_to_r9 REQUIRES a reason code; r9_special_case is valid', () => {
    expect(CycleFreezeDecisionRequest.safeParse({ claim_case_id: CLAIM, action: 'route_to_r9' }).success).toBe(false);
    expect(
      CycleFreezeDecisionRequest.safeParse({ claim_case_id: CLAIM, action: 'route_to_r9', reason_code: 'r9_special_case' })
        .success,
    ).toBe(true);
  });

  it('route_to_r9 rejects a deny-only reason (outcome compat)', () => {
    const r = CycleFreezeDecisionRequest.safeParse({
      claim_case_id: CLAIM,
      action: 'route_to_r9',
      reason_code: 'standing_not_met',
    });
    expect(r.success).toBe(false);
  });

  it('resolve_escalation REQUIRES escalation_outcome', () => {
    expect(CycleFreezeDecisionRequest.safeParse({ claim_case_id: CLAIM, action: 'resolve_escalation' }).success).toBe(
      false,
    );
  });

  it('resolve_escalation → approved needs no reason; → denied needs a reason', () => {
    expect(
      CycleFreezeDecisionRequest.safeParse({
        claim_case_id: CLAIM,
        action: 'resolve_escalation',
        escalation_outcome: 'approved',
      }).success,
    ).toBe(true);
    expect(
      CycleFreezeDecisionRequest.safeParse({
        claim_case_id: CLAIM,
        action: 'resolve_escalation',
        escalation_outcome: 'denied',
      }).success,
    ).toBe(false);
  });

  it('escalation_outcome is FORBIDDEN on a non-resolve action', () => {
    const r = CycleFreezeDecisionRequest.safeParse({
      claim_case_id: CLAIM,
      action: 'approve',
      escalation_outcome: 'approved',
    });
    expect(r.success).toBe(false);
  });

  it('.strict() rejects a smuggled actor_display (R5 — server-derived only)', () => {
    const r = CycleFreezeDecisionRequest.safeParse({
      claim_case_id: CLAIM,
      action: 'approve',
      actor_display: 'Attacker',
    });
    expect(r.success).toBe(false);
  });

  it('rejects a rationale over 500 chars', () => {
    const r = CycleFreezeDecisionRequest.safeParse({
      claim_case_id: CLAIM,
      action: 'deny',
      reason_code: 'standing_not_met',
      rationale: 'x'.repeat(501),
    });
    expect(r.success).toBe(false);
  });
});

describe('CycleFreezeCommitRequest', () => {
  it('requires a UUID commit_id and rejects unknown fields (.strict())', () => {
    expect(CycleFreezeCommitRequest.safeParse({ commit_id: '00000000-0000-0000-0000-000000000009' }).success).toBe(true);
    expect(CycleFreezeCommitRequest.safeParse({ commit_id: 'not-a-uuid' }).success).toBe(false);
    expect(
      CycleFreezeCommitRequest.safeParse({ commit_id: '00000000-0000-0000-0000-000000000009', extra: 1 }).success,
    ).toBe(false);
  });
});
