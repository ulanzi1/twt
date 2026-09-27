// `isEmptyOcrRead` — Story 6.21b (D6, `-249` §3; code review 2026-09-27, round-2 decision (a)). The job's
// "never actually read" signal is keyed on the FIELDS, ⛔ not on confidence. Pure — no DB.

import type { DeathCertificateFields } from '@twt/contracts';
import { describe, expect, it } from 'vitest';

import { isEmptyOcrRead } from '../src/claim-ocr-parity.js';

const EMPTY: DeathCertificateFields = {
  deceasedName: null,
  dateOfBirth: null,
  dateOfDeath: null,
  issuingAuthority: null,
  certificateNumber: null,
  certificateIssueDate: null,
};

describe('isEmptyOcrRead', () => {
  it('every field null ⇒ empty (the v1 deterministic provider\'s parse)', () => {
    expect(isEmptyOcrRead(EMPTY)).toBe(true);
  });

  it('whitespace-only fields count as empty', () => {
    expect(isEmptyOcrRead({ ...EMPTY, deceasedName: '   ', certificateNumber: '' })).toBe(true);
  });

  it('ANY one field read ⇒ ⛔ not empty — including a read whose only content is the date of death', () => {
    for (const key of Object.keys(EMPTY) as Array<keyof DeathCertificateFields>) {
      expect(isEmptyOcrRead({ ...EMPTY, [key]: 'x' }), key).toBe(false);
    }
  });
});
