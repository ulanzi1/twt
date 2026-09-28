// Story 6.20 (AC12) — the NOMINEE relationship vocabulary is in lockstep, contracts ↔ domain, in ORDER.
//
// `2026-09-21-237` cl.1 moved the list from five values to FIFTEEN; `2026-09-27-257` (Story 6.19a, AC13)
// moved it to TWENTY. Both packages name it: the contracts
// enum validates the wire, the domain tuple carries the one rule that reads a relationship (`other`
// forecloses a correction, cl.2). A drift between them would let the wire accept a code the domain
// rule has never heard of — the serialize-time 500 class `nominee-name-check-vocabulary-lockstep` pins.

import { describe, expect, it } from 'vitest';

import { nominee as nomineeDomain } from '@twt/domain';

import {
  CLAIMANT_NOMINEE_RELATIONSHIP_CODES,
  ClaimantNomineeRelationship,
  ClaimantRelationship,
  NOMINEE_RELATIONSHIP_CODES,
  NomineeRelationship,
} from '../src/index.js';

describe('the nominee relationship vocabulary (AC12)', () => {
  it('⭐ the contracts enum EQUALS the domain tuple, in order', () => {
    expect([...NOMINEE_RELATIONSHIP_CODES]).toEqual([...nomineeDomain.NOMINEE_RELATIONSHIPS]);
    expect(NomineeRelationship.options).toEqual([...nomineeDomain.NOMINEE_RELATIONSHIPS]);
  });

  it('carries exactly the TWENTY ratified codes (`-257`), snake_case (⛔ never a slash or a hyphen)', () => {
    expect(NomineeRelationship.options).toHaveLength(20);
    for (const code of NomineeRelationship.options) expect(code).toMatch(/^[a-z]+(_[a-z]+)*$/);
    for (const ratified of [
      'niece_nephew',
      'sister_in_law',
      'daughter_in_law',
      'grandchild',
      'brother_in_law',
      'son_in_law',
      'mother_in_law',
      'father_in_law',
      'grandparent',
      'other',
    ]) {
      expect(NomineeRelationship.options).toContain(ratified);
    }
  });

  it('⛔ the retired five-value codes are gone (`child`, `parent`, `sibling`)', () => {
    for (const retired of ['child', 'parent', 'sibling']) {
      expect(NomineeRelationship.safeParse(retired).success).toBe(false);
    }
  });

  it('⭐ `other` is the ONE unknown relationship — it forecloses a correction (`-237` cl.2)', () => {
    expect(nomineeDomain.isKnownNomineeRelationship('other')).toBe(false);
    expect(nomineeDomain.isKnownNomineeRelationship('niece_nephew')).toBe(true);
    expect(nomineeDomain.isKnownNomineeRelationship('child')).toBe(false); // retired
    expect(nomineeDomain.isKnownNomineeRelationship(null)).toBe(false);
  });

  it('⭐ a `-257` value is a KNOWN relationship — it does ⛔ not foreclose a correction', () => {
    for (const added of ['brother_in_law', 'son_in_law', 'mother_in_law', 'father_in_law', 'grandparent']) {
      expect(nomineeDomain.isKnownNomineeRelationship(added)).toBe(true);
    }
  });

  it('⭐ the CLAIMANT-TO-NOMINEE list (`-255` F8) EQUALS the twenty minus `other` — DERIVED, ⛔ never a hand-typed second list (Story 6.19a AC13)', () => {
    expect([...CLAIMANT_NOMINEE_RELATIONSHIP_CODES]).toEqual(NOMINEE_RELATIONSHIP_CODES.filter((c) => c !== 'other'));
    expect(ClaimantNomineeRelationship.options).toEqual([...CLAIMANT_NOMINEE_RELATIONSHIP_CODES]);
    expect(CLAIMANT_NOMINEE_RELATIONSHIP_CODES).toHaveLength(19);
    expect(ClaimantNomineeRelationship.safeParse('other').success).toBe(false);
  });

  it('⛔ the CLAIMANT relationship is a different list and stays FIVE values', () => {
    expect(ClaimantRelationship.options).toEqual(['spouse', 'child', 'parent', 'sibling', 'other']);
  });
});
