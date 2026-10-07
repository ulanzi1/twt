// Story 6.26b (GI10 [b]; RD18; invariant 5, Trap 11) — the console's per-assignment comparison and warning flags, stitched
// from the warnings read: `false` ONLY where the assignment section alone rules a key out; `null` ("could not be checked
// just now") on a failed read AND for a completed row the read did ⛔ see (the two reads are separate statements).

import type { GroundInspectionSection } from '@twt/contracts';
import { describe, expect, it } from 'vitest';

import { stitchDeathFactFlags } from '../../src/modules/claims/claims.verifier-console.handlers.js';

type Item = Extract<GroundInspectionSection, { status: 'present' }>['assignments'][number];
type Unstitched = Omit<Item, 'dateComparison' | 'dateDiffersWarning' | 'originalMismatchWarning'>;

const row = (over: Partial<Unstitched> = {}): Unstitched => ({
  groundInspectionId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  district: 'Patna',
  inspectionStage: 'initial',
  inspectionSiteType: 'family_residence',
  inspectorActorId: 'i',
  scheduledAt: '2026-05-01T00:00:00.000Z',
  status: 'completed',
  refusalReason: null,
  completedAt: '2026-05-02T00:00:00.000Z',
  notes: null,
  structuredFindings: null,
  photos: [],
  originalCertificateVerdict: 'does_not_match',
  comparedAgainst: 'current',
  deathDateSource: 'family_statement',
  deathDate: '2026-04-28',
  deathTime: null,
  deathDateUnreadable: false,
  deathTimeUnreadable: false,
  inherited: false,
  ...over,
});
const A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const present = (...assignments: Unstitched[]) => ({ status: 'present' as const, assignments });
const items = (s: GroundInspectionSection) => (s.status === 'present' ? s.assignments : []);

describe('stitchDeathFactFlags (Story 6.26b RD18)', () => {
  it('a successful read: the comparison, and each flag from the keys', () => {
    const out = stitchDeathFactFlags(present(row()), {
      keys: [`inspection_death_date_differs:${A}`, `original_certificate_mismatch:${A}`],
      inspectionComparisons: new Map([[A, 'differs' as const]]),
    });
    expect(items(out)[0]).toMatchObject({ dateComparison: 'differs', dateDiffersWarning: true, originalMismatchWarning: true });
  });

  it('⭐ a completed row the read did ⛔ see ⇒ `null`, ⛔ never "nothing" — but `false` where the section rules a key out', () => {
    const out = stitchDeathFactFlags(present(row({ groundInspectionId: B }), row({ groundInspectionId: B, originalCertificateVerdict: 'matches' })), {
      keys: [],
      inspectionComparisons: new Map([[A, 'same' as const]]),
    });
    expect(items(out)[0]).toMatchObject({ dateComparison: null, dateDiffersWarning: null, originalMismatchWarning: null });
    expect(items(out)[1]).toMatchObject({ dateComparison: null, dateDiffersWarning: null, originalMismatchWarning: false });
  });

  it('a FAILED read: `null` everywhere the section does ⛔ rule a key out; an un-completed row and an inherited verdict stay `false`', () => {
    const out = stitchDeathFactFlags(
      present(row(), row({ inherited: true }), row({ status: 'scheduled', completedAt: null })),
      { keys: null, inspectionComparisons: null },
    );
    expect(items(out)[0]).toMatchObject({ dateComparison: null, dateDiffersWarning: null, originalMismatchWarning: null });
    expect(items(out)[1]).toMatchObject({ dateComparison: null, dateDiffersWarning: null, originalMismatchWarning: false });
    expect(items(out)[2]).toMatchObject({ dateComparison: 'not_compared', dateDiffersWarning: false, originalMismatchWarning: false });
  });

  it('a non-present section passes through untouched', () => {
    expect(stitchDeathFactFlags({ status: 'unavailable' }, { keys: null, inspectionComparisons: null })).toEqual({ status: 'unavailable' });
  });
});
