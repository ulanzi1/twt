// Verifier-decision contract tests — Story 6.11 (Task 7; AC1/AC8).
//
// The adjudication request DTOs + the superRefine. Focus:
//   · outcome↔reason-code compatibility (AC8) — a rejected combination is a validation failure;
//   · rationale required on `other` + on a Deny (AC1(b)); the 500-char cap;
//   · the request DTO is `.strict()` — a smuggled `actor_display` (or any unknown field) is rejected (R5);
//   · the compat map + helpers match the domain source of truth (value-aligned).

import { claim } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import {
  isReasonCodeValidForOutcome,
  reasonCodesForOutcome,
  REASON_CODE_OUTCOME_COMPAT,
  VerifierDecisionRequest,
  VerifierDecisionReviseRequest,
  VerifierDecisionOutcome,
  VerifierReasonCode,
  VERIFIER_RATIONALE_MAX_CHARS,
} from '../src/claims/index.js';

describe('outcome↔reason-code compatibility (AC8)', () => {
  it('pins each reason code to its valid outcome(s); `other` is any', () => {
    expect(isReasonCodeValidForOutcome('approved', 'r5_d_natural_death')).toBe(true);
    expect(isReasonCodeValidForOutcome('approved', 'r8_90pct_met')).toBe(true);
    expect(isReasonCodeValidForOutcome('approved', 'concealment_flag_override')).toBe(true);
    expect(isReasonCodeValidForOutcome('denied', 'concealment_flag_uphold')).toBe(true);
    expect(isReasonCodeValidForOutcome('escalated', 'r9_routed_to_voting')).toBe(true);
    for (const outcome of ['approved', 'denied', 'escalated']) {
      expect(isReasonCodeValidForOutcome(outcome, 'other')).toBe(true);
    }
  });

  it('rejects incompatible combinations', () => {
    expect(isReasonCodeValidForOutcome('approved', 'concealment_flag_uphold')).toBe(false);
    expect(isReasonCodeValidForOutcome('denied', 'r5_d_natural_death')).toBe(false);
    expect(isReasonCodeValidForOutcome('approved', 'r9_routed_to_voting')).toBe(false);
    expect(isReasonCodeValidForOutcome('denied', 'concealment_flag_override')).toBe(false);
    expect(isReasonCodeValidForOutcome('bogus', 'other')).toBe(false);
    expect(isReasonCodeValidForOutcome('approved', 'bogus')).toBe(false);
  });

  it('reasonCodesForOutcome offers only compatible codes (drives the dropdown)', () => {
    expect(reasonCodesForOutcome('approved').sort()).toEqual(
      ['concealment_flag_override', 'other', 'r5_d_natural_death', 'r8_90pct_met'].sort(),
    );
    expect(reasonCodesForOutcome('denied').sort()).toEqual(['concealment_flag_uphold', 'other'].sort());
    expect(reasonCodesForOutcome('escalated').sort()).toEqual(['other', 'r9_routed_to_voting'].sort());
  });

  it('the compat map covers every reason code', () => {
    expect(Object.keys(REASON_CODE_OUTCOME_COMPAT).sort()).toEqual(
      [
        'concealment_flag_override',
        'concealment_flag_uphold',
        'other',
        'r5_d_natural_death',
        'r8_90pct_met',
        'r9_routed_to_voting',
      ].sort(),
    );
  });
});

// ── AC8 lockstep (anti-drift guard) ──────────────────────────────────────────────────────────
// `@twt/domain` cannot import `@twt/contracts` (turbo cycle), so the domain write-path re-declares its
// own `REASON_CODE_OUTCOME_COMPAT` + outcome/reason-code enums rather than importing this package's copy
// — contracts → domain is the legal direction (the consent.ts / claims-filing.ts precedent), so THIS
// test is the anti-drift guard: it fails the moment either copy is edited without the other.
describe('Story 6.11 — outcome/reason-code lockstep (contracts ↔ domain, AC8 anti-drift guard)', () => {
  it('domain VERIFIER_DECISION_OUTCOMES === contracts VerifierDecisionOutcome.options', () => {
    expect([...claim.VERIFIER_DECISION_OUTCOMES].sort()).toEqual([...VerifierDecisionOutcome.options].sort());
  });

  it('domain VERIFIER_REASON_CODES === contracts VerifierReasonCode.options', () => {
    expect([...claim.VERIFIER_REASON_CODES].sort()).toEqual([...VerifierReasonCode.options].sort());
  });

  it('domain REASON_CODE_OUTCOME_COMPAT === contracts REASON_CODE_OUTCOME_COMPAT, key-for-key and value-for-value', () => {
    const domainKeys = Object.keys(claim.REASON_CODE_OUTCOME_COMPAT).sort();
    const contractsKeys = Object.keys(REASON_CODE_OUTCOME_COMPAT).sort();
    expect(domainKeys).toEqual(contractsKeys);
    for (const key of domainKeys) {
      const domainOutcomes = [...claim.REASON_CODE_OUTCOME_COMPAT[key as claim.VerifierReasonCode]].sort();
      const contractsOutcomes = [...REASON_CODE_OUTCOME_COMPAT[key as VerifierReasonCode]].sort();
      expect(contractsOutcomes).toEqual(domainOutcomes);
    }
  });
});

describe('VerifierDecisionRequest superRefine (AC1/AC8)', () => {
  it('accepts a compatible approve with no rationale', () => {
    const parsed = VerifierDecisionRequest.safeParse({ outcome: 'approved', reason_code: 'r8_90pct_met' });
    expect(parsed.success).toBe(true);
  });

  it('rejects an incompatible outcome↔reason-code (400 at the boundary)', () => {
    const parsed = VerifierDecisionRequest.safeParse({ outcome: 'approved', reason_code: 'concealment_flag_uphold' });
    expect(parsed.success).toBe(false);
  });

  it('requires a rationale on a Deny', () => {
    const noRationale = VerifierDecisionRequest.safeParse({ outcome: 'denied', reason_code: 'concealment_flag_uphold' });
    expect(noRationale.success).toBe(false);
    const withRationale = VerifierDecisionRequest.safeParse({
      outcome: 'denied',
      reason_code: 'concealment_flag_uphold',
      rationale: 'Concealment upheld after review.',
    });
    expect(withRationale.success).toBe(true);
  });

  it('requires a rationale on the `other` reason code', () => {
    const noRationale = VerifierDecisionRequest.safeParse({ outcome: 'approved', reason_code: 'other' });
    expect(noRationale.success).toBe(false);
    const withRationale = VerifierDecisionRequest.safeParse({
      outcome: 'approved',
      reason_code: 'other',
      rationale: 'Special circumstance approved.',
    });
    expect(withRationale.success).toBe(true);
  });

  it('caps the rationale at 500 chars', () => {
    const parsed = VerifierDecisionRequest.safeParse({
      outcome: 'approved',
      reason_code: 'r8_90pct_met',
      rationale: 'x'.repeat(VERIFIER_RATIONALE_MAX_CHARS + 1),
    });
    expect(parsed.success).toBe(false);
  });

  it('rejects a smuggled actor_display / unknown field (.strict(), R5)', () => {
    const parsed = VerifierDecisionRequest.safeParse({
      outcome: 'approved',
      reason_code: 'r8_90pct_met',
      actor_display: 'Not Anita',
    });
    expect(parsed.success).toBe(false);
  });
});

describe('VerifierDecisionReviseRequest (AC5)', () => {
  it('accepts an optional supersedes_decision_id', () => {
    const parsed = VerifierDecisionReviseRequest.safeParse({
      outcome: 'denied',
      reason_code: 'concealment_flag_uphold',
      rationale: 'Corrected rationale.',
      supersedes_decision_id: '11111111-1111-1111-1111-111111111111',
    });
    expect(parsed.success).toBe(true);
  });

  it('enforces the same compat + rationale rules as the decision request', () => {
    expect(
      VerifierDecisionReviseRequest.safeParse({ outcome: 'denied', reason_code: 'r5_d_natural_death' }).success,
    ).toBe(false);
  });
});
