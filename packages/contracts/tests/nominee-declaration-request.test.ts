// `NomineeDeterminationRequest` / `NomineeCorrectionRaiseRequest` — the Story 6.20 wire boundary (AC4, AC7).
// Code review 2026-09-24: neither request schema had a contracts-level test.
//
// ⭐ The load-bearing ones:
//   · the determination's `marks` cap is NOMINEE_DETERMINATION_MAX_MARKS (1000). Every version must be
//     marked and a history is unbounded, so the old 64 made a long history PERMANENTLY undeterminable
//     (BigDev 2026-09-24, option (a)); the domain writer refuses past the same number with a TYPED 409;
//   · a determination's note is required (`-236` CC3) and the certificate date is `YYYY-MM-DD`;
//   · a raise requires a note and a KNOWN relationship code; `other` is a VALID wire value (the domain
//     refuses it with the typed `relationship_other` 409 the member is shown — ⛔ never a 400).

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
  NOMINEE_DETERMINATION_MAX_MARKS,
  NomineeCorrectionRaiseRequest,
  NomineeDeterminationRequest,
} from '../src/index.js';

const determination = (over: Record<string, unknown> = {}) => ({
  certificate_date: '2026-05-01',
  marks: [{ version_id: randomUUID(), mark: 'stands' }],
  note: 'Certificate checked',
  watermark: { rank1: 1, rank2: null },
  expected_live_determination_id: null,
  ...over,
});

const raise = (over: Record<string, unknown> = {}) => ({
  rank: 1,
  proposed: { name: 'Rani Devi', relationship: 'spouse', mobile: '9876543210' },
  note: 'Married name',
  ...over,
});

describe('NomineeDeterminationRequest', () => {
  it('accepts a well-formed determination', () => {
    expect(NomineeDeterminationRequest.safeParse(determination()).success).toBe(true);
  });

  it('⭐⭐ the marks cap is 1000 — exactly 1000 marks parse, 1001 do not', () => {
    expect(NOMINEE_DETERMINATION_MAX_MARKS).toBe(1000);
    const marks = (n: number) => Array.from({ length: n }, () => ({ version_id: randomUUID(), mark: 'stands' }));
    expect(NomineeDeterminationRequest.safeParse(determination({ marks: marks(1000) })).success).toBe(true);
    expect(NomineeDeterminationRequest.safeParse(determination({ marks: marks(1001) })).success).toBe(false);
  });

  it('⛔ a blank note, a malformed date, or an unknown mark is refused', () => {
    expect(NomineeDeterminationRequest.safeParse(determination({ note: '   ' })).success).toBe(false);
    expect(NomineeDeterminationRequest.safeParse(determination({ certificate_date: '01/05/2026' })).success).toBe(false);
    expect(
      NomineeDeterminationRequest.safeParse(determination({ marks: [{ version_id: randomUUID(), mark: 'maybe' }] })).success,
    ).toBe(false);
  });

  it('⛔ it is STRICT — an unexpected field is refused', () => {
    expect(NomineeDeterminationRequest.safeParse(determination({ decided_by: 'someone' })).success).toBe(false);
  });
});

describe('NomineeCorrectionRaiseRequest', () => {
  it('accepts a well-formed raise, with or without an address', () => {
    expect(NomineeCorrectionRaiseRequest.safeParse(raise()).success).toBe(true);
    expect(
      NomineeCorrectionRaiseRequest.safeParse(raise({ proposed: { name: 'Rani Devi', relationship: 'spouse', mobile: '9876543210', address: '12 Road' } }))
        .success,
    ).toBe(true);
  });

  it('⛔ a raise without a note, with a retired relationship code, or at rank 3 is refused', () => {
    expect(NomineeCorrectionRaiseRequest.safeParse(raise({ note: '' })).success).toBe(false);
    expect(
      NomineeCorrectionRaiseRequest.safeParse(raise({ proposed: { name: 'Rani Devi', relationship: 'child', mobile: '9876543210' } })).success,
    ).toBe(false);
    expect(NomineeCorrectionRaiseRequest.safeParse(raise({ rank: 3 })).success).toBe(false);
  });

  it('`other` is a VALID wire value — the DOMAIN refuses it with the typed 409 the member is shown (⛔ never a 400)', () => {
    expect(
      NomineeCorrectionRaiseRequest.safeParse(raise({ proposed: { name: 'Rani Devi', relationship: 'other', mobile: '9876543210' } })).success,
    ).toBe(true);
  });
});
