// Verifier-decision domain tests — Story 6.11 (Task 7; AC2/AC3/AC5/AC8, D-D/D-E).
//
// DB-free: the outcome↔reason-code compat matrix (the single domain source of truth) + the reducer
// IDENTITY of the two new annotation events (verifier_escalated / verifier_decision_revised) from every
// state (the reducer stays total — the write path owns the preconditions).

import { describe, expect, it } from 'vitest';

import {
  isReasonCodeValidForOutcome,
  reasonCodesForOutcome,
  REASON_CODE_OUTCOME_COMPAT,
  VERIFIER_DECISION_OUTCOMES,
  VERIFIER_REASON_CODES,
} from '../../src/claim/verifier-decision.js';
import { CLAIM_LIFECYCLE_STATES } from '../../src/schema/claims.js';
import { claimStateMachine } from '../../src/claim/state.js';

describe('REASON_CODE_OUTCOME_COMPAT — the single domain source of truth (AC8)', () => {
  it('every reason code maps to at least one outcome', () => {
    for (const code of VERIFIER_REASON_CODES) {
      expect(REASON_CODE_OUTCOME_COMPAT[code].length).toBeGreaterThan(0);
    }
  });

  it('the matrix is exact', () => {
    const matrix: Record<string, string[]> = {
      r5_d_natural_death: ['approved'],
      r8_90pct_met: ['approved'],
      concealment_flag_override: ['approved'],
      concealment_flag_uphold: ['denied'],
      r9_routed_to_voting: ['escalated'],
      other: ['approved', 'denied', 'escalated'],
    };
    for (const code of VERIFIER_REASON_CODES) {
      for (const outcome of VERIFIER_DECISION_OUTCOMES) {
        const expected = (matrix[code] ?? []).includes(outcome);
        expect(isReasonCodeValidForOutcome(outcome, code)).toBe(expected);
      }
    }
  });

  it('reasonCodesForOutcome returns only compatible codes', () => {
    for (const outcome of VERIFIER_DECISION_OUTCOMES) {
      for (const code of reasonCodesForOutcome(outcome)) {
        expect(isReasonCodeValidForOutcome(outcome, code)).toBe(true);
      }
    }
  });

  it('an unknown outcome or code is never compatible (fail-closed)', () => {
    expect(isReasonCodeValidForOutcome('nonsense', 'other')).toBe(false);
    expect(isReasonCodeValidForOutcome('approved', 'nonsense')).toBe(false);
  });
});

describe('reducer identity for the two new annotation events (D-D/D-E)', () => {
  const reduce = (state: string, type: string) =>
    claimStateMachine.step(state as never, { type, payload: {} });

  it('claim.verifier_escalated is identity from EVERY state (no `escalated` state added)', () => {
    for (const s of CLAIM_LIFECYCLE_STATES) {
      expect(reduce(s, 'claim.verifier_escalated')).toBe(s);
    }
    expect(CLAIM_LIFECYCLE_STATES).not.toContain('escalated');
  });

  it('claim.verifier_decision_revised is identity from EVERY state (not a verdict re-emit)', () => {
    for (const s of CLAIM_LIFECYCLE_STATES) {
      expect(reduce(s, 'claim.verifier_decision_revised')).toBe(s);
    }
  });

  it('approve/deny still advance only from verifier_review (unchanged)', () => {
    expect(reduce('verifier_review', 'claim.verifier_approved')).toBe('verifier_approved');
    expect(reduce('verifier_review', 'claim.verifier_denied')).toBe('denied');
    expect(reduce('verification_in_progress', 'claim.verifier_approved')).toBe('verification_in_progress');
  });
});
