// Story 6.26b (Task 3.3, Task 10; AC8, AC9b; RD9, Traps 2, 4, 8, 15, 16) — the PURE half of the three death-fact
// warning kinds: the ONE date comparison (`deathDateComparison`, in `-289` L4's ORDER) and the ONE derivation both
// readers call (`deriveDeathFactWarningKeys` — GI6 + `-283` A3 + `-289` L3; GI17; GI18 + `-288` K1 / `-289` L1).

import { describe, expect, it } from 'vitest';

import {
  type DeathFactInspection,
  type DeathFactWarningInputs,
  deathDateComparison,
  deriveDeathFactWarningKeys,
} from '../../src/claim/approval-warnings.js';

const UP_CURRENT = '11111111-1111-4111-8111-111111111111';
const UP_OLD = '22222222-2222-4222-8222-222222222222';
const GI_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const GI_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

const row = (over: Partial<DeathFactInspection> = {}): DeathFactInspection => ({
  groundInspectionId: GI_A,
  inherited: false,
  deathDateIndex: 'idx-D',
  deathDateSource: 'family_statement',
  originalCertificateVerdict: 'matches',
  comparedCertificateUploadId: UP_CURRENT,
  ...over,
});
const accepted = (acceptedDateIndex: string | null = 'idx-D') => ({ acceptedDateIndex });
const inputs = (over: Partial<DeathFactWarningInputs> = {}): DeathFactWarningInputs => ({
  inspections: [row()],
  currentReview: accepted(),
  currentUploadId: UP_CURRENT,
  registerMismatchPresent: false,
  ...over,
});

describe('deathDateComparison — the ONE comparison, in `-289` L4\'s order', () => {
  it.each([
    ['differs', row({ deathDateIndex: 'idx-E' }), accepted('idx-D'), UP_CURRENT, 'differs'],
    ['same', row(), accepted('idx-D'), UP_CURRENT, 'same'],
    ['⛔ no row index ⇒ not_compared', row({ deathDateIndex: null }), accepted(), UP_CURRENT, 'not_compared'],
    [
      'a printed date from a REPLACED original ⇒ not_compared (`-283` A3)',
      row({ deathDateSource: 'original_certificate', comparedCertificateUploadId: UP_OLD, deathDateIndex: 'idx-E' }),
      accepted(),
      UP_CURRENT,
      'not_compared',
    ],
    [
      'a printed date with ⛔ no current upload ⇒ not_compared',
      row({ deathDateSource: 'original_certificate', deathDateIndex: 'idx-E' }),
      accepted(),
      null,
      'not_compared',
    ],
    [
      'a printed date from the CURRENT original is compared',
      row({ deathDateSource: 'original_certificate', deathDateIndex: 'idx-E' }),
      accepted(),
      UP_CURRENT,
      'differs',
    ],
    ['⛔ no current accepted review ⇒ not_compared (L4)', row({ deathDateIndex: 'idx-E' }), null, UP_CURRENT, 'not_compared'],
    ['⛔ no accepted index (pre-6.26b) ⇒ not_indexed', row({ deathDateIndex: 'idx-E' }), accepted(null), UP_CURRENT, 'not_indexed'],
    ['overlap: ⛔ no row index AND ⛔ no accepted index ⇒ not_compared', row({ deathDateIndex: null }), accepted(null), UP_CURRENT, 'not_compared'],
    ['overlap: ⛔ no accepted review AND ⛔ no accepted index is not_compared', row(), null, UP_CURRENT, 'not_compared'],
  ] as const)('%s', (_label, r, review, upload, expected) => {
    expect(deathDateComparison(r, review, upload)).toBe(expected);
  });
});

describe('deriveDeathFactWarningKeys — the three kinds (GI6, GI17, GI18)', () => {
  it('the default (family date = accepted date, verdict matches, register matches) raises ⛔ nothing (GI15)', () => {
    const out = deriveDeathFactWarningKeys(inputs());
    expect(out.keys).toEqual([]);
    expect(out.kinds).toEqual([]);
    expect(out.comparisons.get(GI_A)).toBe('same');
  });

  describe('GI6 — inspection_death_date_differs', () => {
    it('a differing family date ⇒ the key, per inspection', () => {
      const out = deriveDeathFactWarningKeys(inputs({ inspections: [row({ deathDateIndex: 'idx-E' })] }));
      expect(out.keys).toEqual([`inspection_death_date_differs:${GI_A}`]);
      expect(out.kinds).toEqual(['inspection_death_date_differs']);
    });
    it('⛔ no accepted certificate ⇒ ⛔ no key', () => {
      expect(deriveDeathFactWarningKeys(inputs({ currentReview: null, inspections: [row({ deathDateIndex: 'idx-E' })] })).keys).toEqual([]);
    });
    it('a pre-6.26b review (⛔ no index) ⇒ ⛔ no key', () => {
      const out = deriveDeathFactWarningKeys(inputs({ currentReview: accepted(null), inspections: [row({ deathDateIndex: 'idx-E' })] }));
      expect(out.keys).toEqual([]);
      expect(out.comparisons.get(GI_A)).toBe('not_indexed');
    });
    it('a printed date from the current original ⇒ the key; from a replaced one ⇒ ⛔ no key (`-283` A3, Trap 8)', () => {
      const printed = row({ deathDateSource: 'original_certificate', deathDateIndex: 'idx-E' });
      expect(deriveDeathFactWarningKeys(inputs({ inspections: [printed] })).keys).toEqual([`inspection_death_date_differs:${GI_A}`]);
      expect(
        deriveDeathFactWarningKeys(inputs({ inspections: [{ ...printed, comparedCertificateUploadId: UP_OLD }] })).keys,
      ).toEqual([]);
    });
    it('a `family_statement` row is ⛔ not currency-filtered — its compared upload is irrelevant', () => {
      const out = deriveDeathFactWarningKeys(
        inputs({ inspections: [row({ deathDateIndex: 'idx-E', comparedCertificateUploadId: UP_OLD })] }),
      );
      expect(out.keys).toEqual([`inspection_death_date_differs:${GI_A}`]);
    });
    it('an INHERITED `family_statement` row ⇒ the key (`-289` L3)', () => {
      const out = deriveDeathFactWarningKeys(
        inputs({ inspections: [row({ inherited: true, deathDateIndex: 'idx-E', comparedCertificateUploadId: UP_OLD })] }),
      );
      expect(out.keys).toEqual([`inspection_death_date_differs:${GI_A}`]);
    });
    it('an INHERITED `original_certificate` row compared the OTHER claim\'s upload ⇒ ⛔ no key', () => {
      const out = deriveDeathFactWarningKeys(
        inputs({
          inspections: [
            row({ inherited: true, deathDateSource: 'original_certificate', deathDateIndex: 'idx-E', comparedCertificateUploadId: UP_OLD }),
          ],
        }),
      );
      expect(out.keys).toEqual([]);
      expect(out.comparisons.get(GI_A)).toBe('not_compared');
    });
  });

  describe('GI17 — original_certificate_mismatch', () => {
    it('an OWN `does_not_match` compared against the CURRENT upload ⇒ the key', () => {
      const out = deriveDeathFactWarningKeys(inputs({ inspections: [row({ originalCertificateVerdict: 'does_not_match' })] }));
      expect(out.keys).toEqual([`original_certificate_mismatch:${GI_A}`]);
      expect(out.kinds).toEqual(['original_certificate_mismatch']);
    });
    it('against a REPLACED upload ⇒ ⛔ no key (Trap 4)', () => {
      const out = deriveDeathFactWarningKeys(
        inputs({ inspections: [row({ originalCertificateVerdict: 'does_not_match', comparedCertificateUploadId: UP_OLD })] }),
      );
      expect(out.keys).toEqual([]);
    });
    it('an INHERITED `does_not_match` ⇒ ⛔ no key', () => {
      const out = deriveDeathFactWarningKeys(
        inputs({ inspections: [row({ inherited: true, originalCertificateVerdict: 'does_not_match' })] }),
      );
      expect(out.keys).toEqual([]);
    });
    it('needs ⛔ no accepted review (it is about the upload, ⛔ not the accepted date)', () => {
      const out = deriveDeathFactWarningKeys(
        inputs({ currentReview: null, inspections: [row({ originalCertificateVerdict: 'does_not_match' })] }),
      );
      expect(out.keys).toEqual([`original_certificate_mismatch:${GI_A}`]);
    });
  });

  describe('GI18 — register_check_mismatch (keyed by UPLOAD, `-289` L1)', () => {
    it('a recorded mismatch on the current upload ⇒ ONE key for that upload', () => {
      const out = deriveDeathFactWarningKeys(inputs({ registerMismatchPresent: true }));
      expect(out.keys).toEqual([`register_check_mismatch:${UP_CURRENT}`]);
      expect(out.kinds).toEqual(['register_check_mismatch']);
    });
    it('it STAYS when a later `matches` re-review superseded it, and a second `does_not_match` is the SAME key (K1 / L1)', () => {
      // The input is "ANY accepted review of the current upload recorded does_not_match" — the reader's EXISTS — so
      // both cases arrive here as `true` and yield the SAME single key.
      const once = deriveDeathFactWarningKeys(inputs({ registerMismatchPresent: true }));
      const twice = deriveDeathFactWarningKeys(inputs({ registerMismatchPresent: true }));
      expect(twice.keys).toEqual(once.keys);
      expect(twice.keys).toHaveLength(1);
    });
    it('⛔ no current upload (a replaced upload with no new one judged) ⇒ ⛔ no key', () => {
      expect(deriveDeathFactWarningKeys(inputs({ registerMismatchPresent: true, currentUploadId: null })).keys).toEqual([]);
    });
    it('`matches` / `could_not_check` alone ⇒ ⛔ no key', () => {
      expect(deriveDeathFactWarningKeys(inputs({ registerMismatchPresent: false })).keys).toEqual([]);
    });
  });

  it('all three at once ⇒ three kinds in `APPROVAL_WARNING_KINDS` order, keys sorted', () => {
    const out = deriveDeathFactWarningKeys(
      inputs({
        registerMismatchPresent: true,
        inspections: [
          row({ groundInspectionId: GI_B, originalCertificateVerdict: 'does_not_match' }),
          row({ groundInspectionId: GI_A, deathDateIndex: 'idx-E' }),
        ],
      }),
    );
    expect(out.kinds).toEqual(['inspection_death_date_differs', 'original_certificate_mismatch', 'register_check_mismatch']);
    expect(out.keys).toEqual(
      [
        `inspection_death_date_differs:${GI_A}`,
        `original_certificate_mismatch:${GI_B}`,
        `register_check_mismatch:${UP_CURRENT}`,
      ].sort(),
    );
    expect(out.comparisons.get(GI_B)).toBe('same');
  });
});
