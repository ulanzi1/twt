// Reconciliation-review contract tests — Story 9.8 (Task 2; AC3/AC4/AC5/AC6/AC7).
//
// The four action request DTOs + the superRefine, plus the outcome/reason-code lockstep with the domain
// source of truth. Focus:
//   · outcome↔reason-code compatibility (per bound-outcome route) — a rejected combination is a 400;
//   · rationale required on `other` + on a reject/reverse; the 500-char cap;
//   · the request DTOs are `.strict()` — a smuggled actor field is rejected;
//   · the compat map + enums match the domain source of truth (value-aligned, anti-drift).

import { reconciliation } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import {
  isReconciliationRationaleRequired,
  isReconciliationReasonCodeValidForOutcome,
  reconciliationReasonCodesForOutcome,
  RECONCILIATION_REASON_CODE_OUTCOME_COMPAT,
  ReconciliationConfirmRequest,
  ReconciliationRejectRequest,
  ReconciliationRecoverRequest,
  ReconciliationReverseRequest,
  ReconciliationReviewOutcome,
  ReconciliationReviewReasonCode,
  RECONCILIATION_REVIEW_RATIONALE_MAX_CHARS,
} from '../src/reconciliation/index.js';

describe('outcome↔reason-code compatibility (AC7)', () => {
  it('pins each reason code to its valid outcome(s); `other` is any', () => {
    expect(isReconciliationReasonCodeValidForOutcome('reject', 'wrong_pool')).toBe(true);
    expect(isReconciliationReasonCodeValidForOutcome('confirm', 'screenshot_verified')).toBe(true);
    expect(isReconciliationReasonCodeValidForOutcome('recover', 'member_contacted')).toBe(true);
    expect(isReconciliationReasonCodeValidForOutcome('reverse', 'duplicate')).toBe(true);
    for (const outcome of ['confirm', 'reject', 'recover', 'reverse']) {
      expect(isReconciliationReasonCodeValidForOutcome(outcome, 'other')).toBe(true);
    }
  });

  it('rejects incompatible combinations + unknown tokens (fail-closed)', () => {
    expect(isReconciliationReasonCodeValidForOutcome('confirm', 'wrong_pool')).toBe(false);
    expect(isReconciliationReasonCodeValidForOutcome('reject', 'screenshot_verified')).toBe(false);
    expect(isReconciliationReasonCodeValidForOutcome('bogus', 'other')).toBe(false);
    expect(isReconciliationReasonCodeValidForOutcome('reject', 'bogus')).toBe(false);
  });

  it('reconciliationReasonCodesForOutcome offers only compatible codes (drives the dropdown)', () => {
    expect(reconciliationReasonCodesForOutcome('reject').sort()).toEqual(
      ['amount_mismatch', 'no_evidence', 'no_statement_entry', 'other', 'wrong_pool'].sort(),
    );
  });

  it('isReconciliationRationaleRequired forces rationale on `other` + reject/reverse (not confirm/recover)', () => {
    expect(isReconciliationRationaleRequired('confirm', 'screenshot_verified')).toBe(false);
    expect(isReconciliationRationaleRequired('recover', 'member_contacted')).toBe(false);
    expect(isReconciliationRationaleRequired('reject', 'no_evidence')).toBe(true);
    expect(isReconciliationRationaleRequired('reverse', 'confirmed_in_error')).toBe(true);
    expect(isReconciliationRationaleRequired('confirm', 'other')).toBe(true);
  });
});

// ── lockstep (anti-drift guard) — @twt/domain cannot import @twt/contracts, so the two copies are guarded here.
describe('Story 9.8 — outcome/reason-code lockstep (contracts ↔ domain anti-drift guard)', () => {
  it('domain RECONCILIATION_REVIEW_OUTCOMES === contracts ReconciliationReviewOutcome.options', () => {
    expect([...reconciliation.RECONCILIATION_REVIEW_OUTCOMES].sort()).toEqual(
      [...ReconciliationReviewOutcome.options].sort(),
    );
  });

  it('domain RECONCILIATION_REVIEW_REASON_CODES === contracts ReconciliationReviewReasonCode.options', () => {
    expect([...reconciliation.RECONCILIATION_REVIEW_REASON_CODES].sort()).toEqual(
      [...ReconciliationReviewReasonCode.options].sort(),
    );
  });

  it('domain REASON_CODE_OUTCOME_COMPAT === contracts, key-for-key and value-for-value', () => {
    const domainKeys = Object.keys(reconciliation.REASON_CODE_OUTCOME_COMPAT).sort();
    const contractsKeys = Object.keys(RECONCILIATION_REASON_CODE_OUTCOME_COMPAT).sort();
    expect(domainKeys).toEqual(contractsKeys);
    for (const key of domainKeys) {
      const d = [...reconciliation.REASON_CODE_OUTCOME_COMPAT[key as reconciliation.ReconciliationReviewReasonCode]].sort();
      const c = [...RECONCILIATION_REASON_CODE_OUTCOME_COMPAT[key as ReconciliationReviewReasonCode]].sort();
      expect(c).toEqual(d);
    }
  });
});

const ENTRY_ID = '99999999-9999-9999-9999-999999999999';

describe('action request superRefine (AC3/AC4/AC5/AC6)', () => {
  it('confirm accepts a compatible code + a bank entry id, no rationale', () => {
    expect(
      ReconciliationConfirmRequest.safeParse({ reason_code: 'screenshot_verified', bank_statement_entry_id: ENTRY_ID })
        .success,
    ).toBe(true);
  });

  it('confirm requires the bank_statement_entry_id (the confirmed-money link)', () => {
    expect(ReconciliationConfirmRequest.safeParse({ reason_code: 'screenshot_verified' }).success).toBe(false);
  });

  it('confirm rejects a reject-family code (incompatible → 400)', () => {
    expect(
      ReconciliationConfirmRequest.safeParse({ reason_code: 'wrong_pool', bank_statement_entry_id: ENTRY_ID }).success,
    ).toBe(false);
  });

  it('reject requires a rationale (member-consequential outcome)', () => {
    expect(ReconciliationRejectRequest.safeParse({ reason_code: 'no_evidence' }).success).toBe(false);
    expect(
      ReconciliationRejectRequest.safeParse({ reason_code: 'no_evidence', rationale: 'No entry found.' }).success,
    ).toBe(true);
  });

  it('recover accepts a compatible code without a rationale', () => {
    expect(ReconciliationRecoverRequest.safeParse({ reason_code: 'member_contacted' }).success).toBe(true);
  });

  it('reverse requires the reversed_confirmed_event_id + a rationale', () => {
    expect(ReconciliationReverseRequest.safeParse({ reason_code: 'duplicate', rationale: 'dup' }).success).toBe(false);
    expect(
      ReconciliationReverseRequest.safeParse({
        reason_code: 'duplicate',
        rationale: 'Double counted.',
        reversed_confirmed_event_id: '11111111-1111-1111-1111-111111111111',
      }).success,
    ).toBe(true);
  });

  it('caps the rationale at 500 chars and rejects a smuggled actor field (.strict())', () => {
    expect(
      ReconciliationRejectRequest.safeParse({
        reason_code: 'no_evidence',
        rationale: 'x'.repeat(RECONCILIATION_REVIEW_RATIONALE_MAX_CHARS + 1),
      }).success,
    ).toBe(false);
    expect(
      ReconciliationConfirmRequest.safeParse({ reason_code: 'screenshot_verified', actor_display: 'Not Me' }).success,
    ).toBe(false);
  });
});
