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
import { z } from 'zod';

import {
  CycleFreezeCommitRequest,
  CycleFreezeDecisionRequest,
  StateTrusteeDecisionOutcome,
  StateTrusteeReasonCode,
  TRUSTEE_REASON_CODE_OUTCOME_COMPAT,
  CycleFreezeDecisionResponse,
  trusteeReasonCodeRequiredForOutcome,
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

  it('⭐ domain STATE_TRUSTEE_DECISION_PHASES === the CycleFreezeDecisionResponse.phase enum (Story 6.18)', () => {
    // ⚠ THE GAP THIS CLOSES. Until Story 6.18 the phase tuple was the ONE piece of this vocabulary
    // with no lockstep pin, so a new domain phase could ship while the response enum stayed behind —
    // and because responses are SERIALIZER-PARSED, the failure mode is not a type error at build time
    // but a 500 on the first 201 that carries the new phase, in production, on a governance action.
    // 6.18 adds `correction_return` and pays the debt rather than stepping over it.
    const responsePhases = (CycleFreezeDecisionResponse.shape.phase as z.ZodEnum<[string, ...string[]]>).options;
    expect([...responsePhases].sort()).toEqual([...claim.STATE_TRUSTEE_DECISION_PHASES].sort());
  });

  it('⭐ the reason-code PRESENCE rule agrees domain ↔ contracts for every outcome (Story 6.18)', () => {
    // Two hand-maintained copies of `trusteeReasonCodeRequiredForOutcome` exist by design (the
    // browser-bundle rule forbids contracts importing @twt/domain). 6.18 found a THIRD copy inlined
    // in `state-trustee-decision-persist.ts`'s `assertReasonCode` and collapsed it into the domain
    // function; these two are what remain, so they must be pinned to each other.
    for (const outcome of claim.STATE_TRUSTEE_DECISION_OUTCOMES) {
      expect(
        trusteeReasonCodeRequiredForOutcome(outcome),
        `presence rule disagrees for outcome '${outcome}'`,
      ).toBe(claim.trusteeReasonCodeRequiredForOutcome(outcome));
    }
  });
});

// ── superRefine (D-F) ───────────────────────────────────────────────────────────────────────
describe('CycleFreezeDecisionRequest superRefine (D-F)', () => {
  const CLAIM = '00000000-0000-0000-0000-000000000001';

  it('approve needs NO reason code', () => {
    expect(CycleFreezeDecisionRequest.safeParse({ claim_case_id: CLAIM, action: 'approve' }).success).toBe(true);
  });

  it('Story 6.15 — approve WITH concealment_override + rationale is accepted (the override path)', () => {
    const r = CycleFreezeDecisionRequest.safeParse({
      claim_case_id: CLAIM,
      action: 'approve',
      reason_code: 'concealment_override',
      rationale: 'Reviewed the concealment flag; the linkage does not hold — approving.',
    });
    expect(r.success).toBe(true);
  });

  it('Story 6.15 — approve WITH concealment_override but NO rationale is rejected (mandatory rationale)', () => {
    const r = CycleFreezeDecisionRequest.safeParse({
      claim_case_id: CLAIM,
      action: 'approve',
      reason_code: 'concealment_override',
    });
    expect(r.success).toBe(false);
  });

  it('Story 6.15 — a DENY-only code on an approve is still rejected (outcome compat unchanged)', () => {
    const r = CycleFreezeDecisionRequest.safeParse({
      claim_case_id: CLAIM,
      action: 'approve',
      reason_code: 'concealment_upheld',
      rationale: 'x',
    });
    expect(r.success).toBe(false);
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

// ── Story 6.18 (AC11) — `return_to_district_admin` through the REAL schema ────────────────────
//
// ⭐⭐ THIS SUITE EXISTS BECAUSE THE ARM IT COVERS IS LOAD-BEARING AND WAS SILENT (code review
// 2026-09-20). `effectiveOutcome()`'s `switch` has ⛔ no `default`, and the `superRefine` RETURNS
// EARLY on `undefined` — so deleting the `return_to_district_admin` arm makes the required-
// reason-code AND required-note rules never run for a return, and `tsc` catches nothing. Before
// these tests, `return_to_district_admin` appeared in exactly ONE test in the whole repo: a
// mocked-client UI test that never touches this schema. The arm could have been deleted and every
// suite would have stayed green, while `-227` cl.10's note requirement quietly vanished.
//
// ⚠ Each case asserts the ISSUE MESSAGE, not just `.success` — a wrong-but-present message (the
// schema used to tell a returning Pariwar Admin off about "a route-to-R9 decision") passes a bare
// `.success === false` and tells the user something false.
describe('Story 6.18 (AC11) — return_to_district_admin, the effectiveOutcome() arm', () => {
  const CLAIM = '00000000-0000-0000-0000-000000000001';
  const NOTE = 'The holder name on account 2 is not the nominee — please get it corrected.';

  it('⛔ REJECTS a bare return: no reason_code, no note', () => {
    const r = CycleFreezeDecisionRequest.safeParse({ claim_case_id: CLAIM, action: 'return_to_district_admin' });
    expect(r.success).toBe(false);
    const issues = JSON.stringify(r.error?.issues);
    // ⭐ It names the RETURN — not R9. The two-way ternary this replaced called every non-deny
    // outcome a "route-to-R9 decision".
    expect(issues).toContain('return-to-District-Admin');
    expect(issues).not.toContain('route-to-R9');
  });

  it('⛔ REJECTS `other` with NO note — `-227` cl.10 requires the note', () => {
    const r = CycleFreezeDecisionRequest.safeParse({
      claim_case_id: CLAIM,
      action: 'return_to_district_admin',
      reason_code: 'other',
    });
    expect(r.success).toBe(false);
    expect(JSON.stringify(r.error?.issues)).toContain('a note is required when returning a claim');
  });

  it('⛔ REJECTS a whitespace-only note — a blank note is no note', () => {
    const r = CycleFreezeDecisionRequest.safeParse({
      claim_case_id: CLAIM,
      action: 'return_to_district_admin',
      reason_code: 'other',
      rationale: '   ',
    });
    expect(r.success).toBe(false);
  });

  it('⭐ ACCEPTS `other` + a note', () => {
    const r = CycleFreezeDecisionRequest.safeParse({
      claim_case_id: CLAIM,
      action: 'return_to_district_admin',
      reason_code: 'other',
      rationale: NOTE,
    });
    expect(r.success).toBe(true);
  });

  it('⛔ REJECTS an escalation_outcome on a return (the presence rule still applies)', () => {
    const r = CycleFreezeDecisionRequest.safeParse({
      claim_case_id: CLAIM,
      action: 'return_to_district_admin',
      reason_code: 'other',
      rationale: NOTE,
      escalation_outcome: 'denied',
    });
    expect(r.success).toBe(false);
  });

  it("⛔ REJECTS a reason code that is not compatible with 'returned_for_correction'", () => {
    const r = CycleFreezeDecisionRequest.safeParse({
      claim_case_id: CLAIM,
      action: 'return_to_district_admin',
      reason_code: 'concealment_upheld',
      rationale: NOTE,
    });
    expect(r.success).toBe(false);
  });
});
