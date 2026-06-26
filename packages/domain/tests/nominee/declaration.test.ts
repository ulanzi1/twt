// Nominee declaration — domain UNIT tests (Story 3.4, Task 9). DB-free.
//
// Two pure surfaces:
//   · deriveNomineeSplit — the SERVER-authoritative 75/25 derivation (R4): 1 → sole/100,
//     2 → 75-25 (75 + 25); 0 or >2 throw. The split is computed from the COUNT, never from a
//     client value, so this is the whole "no override" guarantee in one function.
//   · NomineesDeclaredPayloadSchema — the widened (Task 3) NON-PII event payload: it accepts
//     {…auditShape, nominee_count, split} and `.strict()`-REJECTS any PII key (name/mobile/
//     address) that must never enter the plaintext events_log (R1).
//
// The latest-wins replace (delete-then-insert) is a DB behaviour — covered by the live-DB
// integration spec (tests/integration/nominee/member-nominees.spec.ts), not here.

import { describe, expect, it } from 'vitest';

import { NomineesDeclaredPayloadSchema } from '../../src/member/events.js';
import { deriveNomineeSplit } from '../../src/nominee/index.js';

describe('deriveNomineeSplit — server-authoritative 75/25 (R4)', () => {
  it('1 nominee → sole, 100%', () => {
    expect(deriveNomineeSplit(1)).toEqual({ split: 'sole', ranks: [{ rank: 1, splitPct: 100 }] });
  });

  it('2 nominees → 75-25, primary 75 / secondary 25', () => {
    expect(deriveNomineeSplit(2)).toEqual({
      split: '75-25',
      ranks: [
        { rank: 1, splitPct: 75 },
        { rank: 2, splitPct: 25 },
      ],
    });
  });

  it('rejects 0 nominees', () => {
    expect(() => deriveNomineeSplit(0)).toThrow(RangeError);
  });

  it('rejects more than 2 nominees', () => {
    expect(() => deriveNomineeSplit(3)).toThrow(RangeError);
  });
});

describe('NomineesDeclaredPayloadSchema — NON-PII, strict (Task 3 / R1)', () => {
  const base = {
    from_state: 'pending-fee',
    to_state: 'pending-fee',
    trigger: 'nominee_declaration',
    actor: 'member',
  } as const;

  it('accepts the non-PII audit shape (count + split), both split shapes', () => {
    expect(() =>
      NomineesDeclaredPayloadSchema.parse({ ...base, nominee_count: 1, split: 'sole' }),
    ).not.toThrow();
    expect(() =>
      NomineesDeclaredPayloadSchema.parse({ ...base, nominee_count: 2, split: '75-25' }),
    ).not.toThrow();
  });

  it('REJECTS any nominee-PII key (.strict() — name/mobile/address never enter the event-log)', () => {
    expect(() =>
      NomineesDeclaredPayloadSchema.parse({ ...base, nominee_count: 1, split: 'sole', name: 'Asha Devi' }),
    ).toThrow();
    expect(() =>
      NomineesDeclaredPayloadSchema.parse({ ...base, nominee_count: 1, split: 'sole', mobile: '+919876543210' }),
    ).toThrow();
    expect(() =>
      NomineesDeclaredPayloadSchema.parse({ ...base, nominee_count: 1, split: 'sole', address: '12 MG Road' }),
    ).toThrow();
  });

  it('rejects an out-of-range nominee_count', () => {
    expect(() =>
      NomineesDeclaredPayloadSchema.parse({ ...base, nominee_count: 3, split: '75-25' }),
    ).toThrow();
  });

  it('rejects an unknown split label', () => {
    expect(() =>
      NomineesDeclaredPayloadSchema.parse({ ...base, nominee_count: 2, split: '50-50' }),
    ).toThrow();
  });

  it('requires the widened fields (count + split are mandatory)', () => {
    expect(() => NomineesDeclaredPayloadSchema.parse({ ...base })).toThrow();
  });
});
