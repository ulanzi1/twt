// The fact PRODUCER — pure unit tests (Story 4.6, Task 6; the never-placeholder discipline).
//
// Proves the producer DERIVES facts genuinely (calendar-correct tenure; retirement freezes tenure) and
// NEVER fabricates a placeholder: an absent tenure anchor → `null` (inject nothing → the engine routes
// to rule.inputs_unavailable), NOT a `0`. Medical flags are NON-PII only; the concealment flag is
// gated on a completed assessment ([[CR-4.4-D3]] / [[CR-4.5-D1]] / [[CR-4.5-D3]]).

import { describe, expect, it } from 'vitest';

import {
  deriveMedicalDisclosureFlags,
  deriveRetirementFacts,
  retirementFactsToBag,
} from '../src/producer.js';

const EVAL_AT = new Date('2025-06-01T00:00:00Z');

describe('deriveRetirementFacts — genuine tenure derivation (never a placeholder)', () => {
  it('absent signup anchor → null (inject NOTHING; never a fabricated 0)', () => {
    expect(
      deriveRetirementFacts({ signupAt: null, retiredAt: null, evaluatedAt: EVAL_AT }),
    ).toBeNull();
  });

  it('non-retired: valid_membership_years = calendar years join→evaluatedAt; is_retired false', () => {
    const facts = deriveRetirementFacts({
      signupAt: new Date('2015-06-01T00:00:00Z'),
      retiredAt: null,
      evaluatedAt: EVAL_AT,
    });
    expect(facts).toEqual({ validMembershipYears: 10, isRetired: false });
  });

  it('retired: tenure FREEZES at retiredAt (coverage earned against pre-retirement tenure)', () => {
    const facts = deriveRetirementFacts({
      signupAt: new Date('2005-06-01T00:00:00Z'),
      retiredAt: new Date('2020-06-01T00:00:00Z'), // 15 years of tenure, frozen at retirement
      evaluatedAt: EVAL_AT, // evaluating 5 years later — tenure does NOT keep growing
    });
    expect(facts).toEqual({ validMembershipYears: 15, isRetired: true });
  });

  it('a nonzero-tenure non-retiree still earns years (is_retired-independent; [[CR-4.5-D3]])', () => {
    const facts = deriveRetirementFacts({
      signupAt: new Date('2012-06-01T00:00:00Z'),
      retiredAt: null,
      evaluatedAt: EVAL_AT,
    })!;
    expect(facts.validMembershipYears).toBe(13);
    expect(facts.isRetired).toBe(false);
  });

  it('maps to the engine fact bag under the R12 member.* keys', () => {
    const bag = retirementFactsToBag({ validMembershipYears: 15, isRetired: true });
    expect(bag).toEqual({
      'member.valid_membership_years': 15,
      'member.is_retired': true,
    });
  });
});

describe('deriveMedicalDisclosureFlags — NON-PII member-standing signal (D2m-A)', () => {
  it('no disclosure on record → all absent, concealment flag false (not a placeholder)', () => {
    expect(deriveMedicalDisclosureFlags([])).toEqual({
      hasDisclosureOnRecord: false,
      declaredConditionCount: null,
      imaListVersion: null,
      pendingConcealmentFlag: false,
    });
  });

  it('reads the newest disclosure head (count + ima_list_version); flag false without an assessment', () => {
    const flags = deriveMedicalDisclosureFlags([
      { conditionCount: 2, imaListVersion: 'ima-v3' }, // newest-first (getMedicalDisclosures order)
      { conditionCount: 1, imaListVersion: 'ima-v2' },
    ]);
    expect(flags).toEqual({
      hasDisclosureOnRecord: true,
      declaredConditionCount: 2,
      imaListVersion: 'ima-v3',
      pendingConcealmentFlag: false,
    });
  });

  it('sets pendingConcealmentFlag ONLY from a completed assessment (gated seam, never fabricated)', () => {
    const rows = [{ conditionCount: 0, imaListVersion: 'ima-v3' }];
    expect(deriveMedicalDisclosureFlags(rows, { flagged: true }).pendingConcealmentFlag).toBe(true);
    expect(deriveMedicalDisclosureFlags(rows, { flagged: false }).pendingConcealmentFlag).toBe(false);
    expect(deriveMedicalDisclosureFlags(rows).pendingConcealmentFlag).toBe(false);
  });
});
