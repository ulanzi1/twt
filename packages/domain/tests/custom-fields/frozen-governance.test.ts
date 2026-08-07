// Story 10.12 (Task 1; AC3 layer 1, AC4) — the RUNTIME half of the governance fence.
//
// ⚠ THE NORMALIZATION CASES ARE THE POINT. The fence's whole value is that a tenant cannot step over
// it by changing a hyphen, a dot or the case of a letter. A test suite that only ever asks about
// `payout_destinations` in canonical snake_case would pass against a fence made of a single
// `===` comparison — and that fence would be walked around within a week of a real admin using the
// form. So every prefix family is probed through its plausible disguises.

import { beforeEach, describe, expect, it } from 'vitest';

import {
  CUSTOM_FIELD_FORBIDDEN_KEY_PATTERNS,
  assertNotFrozenGovernanceKey,
  assertNotNakedPii,
  clearFr100Cache,
  fr100ForbiddenColumnPrefix,
  matchFrozenGovernanceKey,
  matchNakedPii,
  normalizeFieldKey,
} from '../../src/custom-fields/frozen-governance.js';
import {
  CustomFieldFrozenGovernanceKeyError,
  CustomFieldNakedPiiKeyError,
} from '../../src/custom-fields/errors.js';

beforeEach(() => {
  clearFr100Cache();
});

describe('normalizeFieldKey', () => {
  it('case-folds and collapses -, . and whitespace to _', () => {
    expect(normalizeFieldKey('Payout-Destinations')).toBe('payout_destinations');
    expect(normalizeFieldKey('payout.destination')).toBe('payout_destination');
    expect(normalizeFieldKey('PAYOUT DESTINATIONS')).toBe('payout_destinations');
    expect(normalizeFieldKey('  Alternate ID  ')).toBe('alternate_id');
  });

  it('collapses repeated separators so a doubled hyphen cannot launder a key', () => {
    expect(normalizeFieldKey('payout--destination')).toBe('payout_destination');
    expect(normalizeFieldKey('payout _ destination')).toBe('payout_destination');
    expect(normalizeFieldKey('payout.-.destination')).toBe('payout_destination');
  });
});

describe('the FR-100 registry is READ, not re-declared', () => {
  it('resolves patterns.forbidden_column from the repo-root fr-100-non-add.yaml', () => {
    // If this ever returns null in CI, the fence still holds via the static list — but the SUPERSET
    // relationship the gate asserts would be the only thing keeping them aligned, so surface it here.
    expect(fr100ForbiddenColumnPrefix()).toBe('payout_destination');
  });

  it('the static denylist covers the FR-100 prefix independently (fail-open-to-static, not to nothing)', () => {
    const fr100 = fr100ForbiddenColumnPrefix();
    expect(fr100).not.toBeNull();
    expect(CUSTOM_FIELD_FORBIDDEN_KEY_PATTERNS.some((p) => p.pattern === fr100)).toBe(true);
  });
});

describe('⭐ REVERT-SANITY: the frozen-governance prefix family rejects, through every disguise', () => {
  const disguises = [
    'payout_destinations',
    'Payout-Destinations',
    'payout.destination',
    'PAYOUT_DESTINATIONS',
    'payout destination upi',
    'payout--destination_2',
  ];

  it.each(disguises)('rejects %s', (key) => {
    expect(matchFrozenGovernanceKey(key)).not.toBeNull();
    expect(() => {
      assertNotFrozenGovernanceKey(key);
    }).toThrow(CustomFieldFrozenGovernanceKeyError);
  });

  it.each([
    'benefit_mechanism',
    'Benefit.Mechanism',
    'is_valid',
    'is_valid_override',
    'is_assignable',
    'moderation_status',
    'state',
    'state_event_version',
    'pariwar_id',
    'member_id',
    'lock_in_days',
    'fixed_amount_paisa',
    'audit_id',
    'consent_type',
  ])('rejects the frozen control %s', (key) => {
    expect(() => {
      assertNotFrozenGovernanceKey(key);
    }).toThrow(CustomFieldFrozenGovernanceKeyError);
  });

  it('names the control in the message so an author knows WHY, not just that it failed', () => {
    try {
      assertNotFrozenGovernanceKey('Payout-Destinations');
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(CustomFieldFrozenGovernanceKeyError);
      const e = err as CustomFieldFrozenGovernanceKeyError;
      expect(e.normalizedKey).toBe('payout_destinations');
      expect(e.code).toBe('custom_field.frozen_governance_key');
      expect(e.message).toContain('FR-100');
    }
  });
});

describe('the fence does not fire on ordinary tenant fields (a noisy fence gets switched off)', () => {
  it.each([
    'school_block_code',
    'cadre_grade',
    'ward_number',
    'occupation_category',
    'panchayat_ward',
    'stateless_note',
    'estate_size',
  ])('accepts %s', (key) => {
    expect(matchFrozenGovernanceKey(key)).toBeNull();
  });

  it('⚠ the two match MODES: `state` is segment-scoped, `payout_destination` is a bare prefix', () => {
    // This is the pair that forces `FrozenKeyMatchMode` to exist. `stateless_note` and
    // `payout_destinations` are structurally identical cases — the pattern plus more letters — but
    // one must pass and the other must fail, so no universal predicate separates them.
    expect(matchFrozenGovernanceKey('stateless_note')).toBeNull();
    expect(matchFrozenGovernanceKey('statement_ref')).toBeNull();
    expect(matchFrozenGovernanceKey('estate_size')).toBeNull();
    expect(matchFrozenGovernanceKey('state_of_residence')?.mode).toBe('segment');
    expect(matchFrozenGovernanceKey('payout_destinations')?.mode).toBe('prefix');
  });
});

describe('AC4 — the naked-PII detector', () => {
  it.each([
    ['aadhaar_number', 'Aadhaar number', 'आधार संख्या'],
    ['member_pan', 'PAN', 'पैन'],
    ['alt_mobile', 'Alternate mobile', 'वैकल्पिक मोबाइल'],
    ['dob', 'Date of birth', 'जन्म तिथि'],
    ['bank_account_no', 'Account number', 'खाता संख्या'],
    ['ifsc', 'IFSC', 'आईएफएससी'],
    ['upi', 'UPI', 'यूपीआई'],
    ['vpa', 'VPA', 'वीपीए'],
  ])('rejects the PII-shaped key %s', (key, en, hi) => {
    expect(matchNakedPii(key, en, hi)).not.toBeNull();
    expect(() => {
      assertNotNakedPii(key, en, hi);
    }).toThrow(CustomFieldNakedPiiKeyError);
  });

  it('catches PII named only in the LABEL, with a clean key', () => {
    // The mis-declaration this exists for: an innocuous key hiding an identifier the form asks for.
    const match = matchNakedPii('alt_id', 'Enter the member Aadhaar details', 'आधार विवरण');
    expect(match?.where).toBe('label_en');
  });

  it('does NOT fire on a legitimate field whose key merely contains a marker as a fragment', () => {
    // `pan` is a segment match, not a substring match — `panchayat` must survive.
    expect(matchNakedPii('panchayat_ward', 'Panchayat ward', 'पंचायत वार्ड')).toBeNull();
    expect(matchNakedPii('company_name', 'Company', 'कंपनी')).toBeNull();
  });

  it('reports WHERE the marker was found so the author knows which input to change', () => {
    expect(matchNakedPii('aadhaar_no', 'Alt id', 'वैकल्पिक')?.where).toBe('field_key');
  });

  // ⭐ [Review][Patch] REVERT-SANITY for the Devanagari marker set — a Hindi-ONLY PII-shaped label,
  // with a clean key AND a clean English label, must still be caught. Before this fix, the detector's
  // label branch only ever checked `labelHi` against the ENGLISH marker list, so none of these fired.
  it.each([
    ['alt_id', 'Alternate identifier', 'आधार संख्या'], // Aadhaar number
    ['tax_ref', 'Tax reference', 'पैन विवरण'], // PAN details
    ['contact_alt', 'Alternate contact', 'मोबाइल नंबर'], // mobile number
    ['date_ref', 'Reference date', 'जन्म तिथि'], // date of birth
    ['fin_ref', 'Financial reference', 'बैंक खाता'], // bank account
    ['routing_ref', 'Routing reference', 'आईएफएससी कोड'], // IFSC code
    ['pay_ref', 'Payment reference', 'यूपीआई आईडी'], // UPI id
  ])('rejects a Hindi-ONLY PII-shaped label_hi for key %s, even with a clean key and label_en', (key, en, hi) => {
    const match = matchNakedPii(key, en, hi);
    expect(match).not.toBeNull();
    expect(match?.where).toBe('label_hi');
    expect(() => {
      assertNotNakedPii(key, en, hi);
    }).toThrow(CustomFieldNakedPiiKeyError);
  });

  it('does NOT fire on an unrelated Hindi label with no PII-shaped substring', () => {
    expect(matchNakedPii('school_block_code', 'School block code', 'विद्यालय प्रखंड कोड')).toBeNull();
  });
});
