// The reconciliation-review reason-code + outcome-compat vocabulary — Story 9.8 (Task 2), DB-free.
//
// Proves the SINGLE domain source of truth (mirrored value-aligned in @twt/contracts):
//   · every reason code maps to ≥1 outcome, and `other` maps to all four;
//   · isReasonCodeValidForOutcome is fail-closed on unknown pairs;
//   · reasonCodesForOutcome returns exactly the compatible codes (drives the dropdown);
//   · isRationaleRequired forces a rationale on `other` + on reject/reverse (the member-consequential ones).

import { describe, expect, it } from 'vitest';

import {
  RECONCILIATION_REVIEW_OUTCOMES,
  RECONCILIATION_REVIEW_REASON_CODES,
  REASON_CODE_OUTCOME_COMPAT,
  isRationaleRequired,
  isReasonCodeValidForOutcome,
  reasonCodesForOutcome,
} from '../../src/reconciliation/review-reason-codes.js';

describe('reconciliation-review reason-code compatibility (Story 9.8, AC7)', () => {
  it('every reason code maps to ≥1 outcome; every mapped outcome is a real outcome', () => {
    for (const code of RECONCILIATION_REVIEW_REASON_CODES) {
      const outcomes = REASON_CODE_OUTCOME_COMPAT[code];
      expect(outcomes.length).toBeGreaterThan(0);
      for (const o of outcomes) expect(RECONCILIATION_REVIEW_OUTCOMES).toContain(o);
    }
  });

  it('`other` is valid for every outcome (the escape hatch)', () => {
    for (const o of RECONCILIATION_REVIEW_OUTCOMES) {
      expect(isReasonCodeValidForOutcome(o, 'other')).toBe(true);
    }
  });

  it('a reject code is not valid for confirm (fail-closed)', () => {
    expect(isReasonCodeValidForOutcome('confirm', 'wrong_pool')).toBe(false);
    expect(isReasonCodeValidForOutcome('reject', 'wrong_pool')).toBe(true);
  });

  it('unknown outcome/code pairs are not compatible (fail-closed)', () => {
    expect(isReasonCodeValidForOutcome('made_up', 'wrong_pool')).toBe(false);
    expect(isReasonCodeValidForOutcome('reject', 'made_up')).toBe(false);
  });

  it('reasonCodesForOutcome returns exactly the compatible codes', () => {
    expect(reasonCodesForOutcome('confirm').sort()).toEqual(
      ['other', 'screenshot_verified', 'statement_matched_manually'].sort(),
    );
    expect(reasonCodesForOutcome('reverse').sort()).toEqual(['confirmed_in_error', 'duplicate', 'other'].sort());
  });

  it('isRationaleRequired forces a rationale on `other` and on reject/reverse (not confirm/recover)', () => {
    expect(isRationaleRequired('confirm', 'screenshot_verified')).toBe(false);
    expect(isRationaleRequired('recover', 'member_contacted')).toBe(false);
    expect(isRationaleRequired('reject', 'no_statement_entry')).toBe(true);
    expect(isRationaleRequired('reverse', 'duplicate')).toBe(true);
    expect(isRationaleRequired('confirm', 'other')).toBe(true);
  });
});
