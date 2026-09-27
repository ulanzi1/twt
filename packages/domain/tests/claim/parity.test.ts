// evaluateParity + normalization truth table — Story 6.5 (Task 3/Task 7; AC2/AC6).
// DB-free unit tests (the claim/state.ts reducer-test precedent).

import { describe, expect, it } from 'vitest';

import {
  evaluateParity,
  levenshtein,
  namesWithinTolerance,
  normalizeDate,
  normalizeName,
  normalizeOcrFields,
  type DeceasedRecord,
  type NormalizedOcrFields,
} from '../../src/claim/parity.js';

const MEMBER: DeceasedRecord = {
  name: 'Ravi Kumar',
  dateOfBirth: '1955-03-01',
  joinedAt: new Date('2020-01-01T00:00:00Z'),
};

function ocr(over: Partial<NormalizedOcrFields> = {}): NormalizedOcrFields {
  return {
    deceasedName: 'ravi kumar',
    dateOfBirth: '1955-03-01',
    dateOfDeath: '2026-06-30',
    issuingAuthority: 'municipal corporation',
    certificateNumber: 'dc-12345',
    // Absent by default (most fixtures never asserted an issue date) — AR-61: absent evidence
    // never infers a mismatch, so this cannot leak a spurious flag into unrelated cases.
    certificateIssueDate: null,
    ...over,
  };
}

const NOW = new Date('2026-07-09T00:00:00Z');

describe('normalization', () => {
  it('normalizeName trims, collapses whitespace, case-folds; empty → null', () => {
    expect(normalizeName('  Ravi   Kumar ')).toBe('ravi kumar');
    expect(normalizeName('   ')).toBeNull();
    expect(normalizeName(null)).toBeNull();
  });

  it('normalizeDate parses ISO + DD/MM/YYYY + DD-MM-YYYY to canonical YYYY-MM-DD', () => {
    expect(normalizeDate('1955-03-01')).toBe('1955-03-01');
    expect(normalizeDate('01/03/1955')).toBe('1955-03-01');
    expect(normalizeDate('1-3-1955')).toBe('1955-03-01');
    expect(normalizeDate('2026-06-30T12:00:00Z')).toBe('2026-06-30');
  });

  it('normalizeDate rejects non-calendar / unparseable dates', () => {
    expect(normalizeDate('31/02/2020')).toBeNull();
    expect(normalizeDate('not a date')).toBeNull();
    expect(normalizeDate('2020-13-01')).toBeNull();
    expect(normalizeDate(null)).toBeNull();
  });

  it('normalizeOcrFields normalizes all six fields', () => {
    const n = normalizeOcrFields({
      deceasedName: '  RAVI  Kumar ',
      dateOfBirth: '01/03/1955',
      dateOfDeath: '30/06/2026',
      issuingAuthority: ' Municipal  Corporation ',
      certificateNumber: '  DC 12345 ',
      certificateIssueDate: '05/07/2026',
    });
    expect(n.deceasedName).toBe('ravi kumar');
    expect(n.dateOfBirth).toBe('1955-03-01');
    expect(n.dateOfDeath).toBe('2026-06-30');
    expect(n.certificateNumber).toBe('dc12345');
    expect(n.certificateIssueDate).toBe('2026-07-05');
  });
});

describe('levenshtein + name tolerance', () => {
  it('computes edit distance', () => {
    expect(levenshtein('ravi kumar', 'ravi kumar')).toBe(0);
    expect(levenshtein('ravi', 'ravl')).toBe(1);
    expect(levenshtein('', 'abc')).toBe(3);
  });

  it('accepts minor variance, rejects a different name', () => {
    expect(namesWithinTolerance('ravi kumar', 'ravi kumar')).toBe(true); // 1/10 = 0.1 ≤ 0.2
    expect(namesWithinTolerance('ravi kumar', 'suresh patel')).toBe(false);
  });
});

describe('evaluateParity truth table', () => {
  it('match: name within tolerance + DoB exact + plausible dates', () => {
    const r = evaluateParity(ocr(), MEMBER, { now: NOW });
    expect(r.outcome).toBe('match');
    expect(r.flags).toEqual({});
    expect(r.verifierReviewRequired).toBe(false);
  });

  it('match: name with a minor spelling variance within tolerance', () => {
    const r = evaluateParity(ocr({ deceasedName: 'ravi kumar' }), MEMBER, { now: NOW });
    expect(r.outcome).toBe('match');
  });

  it('mismatch: name beyond tolerance', () => {
    const r = evaluateParity(ocr({ deceasedName: 'suresh patel' }), MEMBER, { now: NOW });
    expect(r.outcome).toBe('mismatch');
    expect(r.flags['name']).toBe('beyond_tolerance');
    expect(r.verifierReviewRequired).toBe(true);
  });

  it('mismatch: DoB differs', () => {
    const r = evaluateParity(ocr({ dateOfBirth: '1960-01-01' }), MEMBER, { now: NOW });
    expect(r.outcome).toBe('mismatch');
    expect(r.flags['dob']).toBe('mismatch');
  });

  it('mismatch: implausible date — death before birth', () => {
    const r = evaluateParity(
      ocr({ dateOfBirth: '1955-03-01', dateOfDeath: '1950-01-01' }),
      MEMBER,
      { now: NOW },
    );
    expect(r.outcome).toBe('mismatch');
    expect(r.flags['date']).toBe('death_before_birth');
  });

  it('mismatch: implausible date — death after certificate issue date', () => {
    const r = evaluateParity(
      ocr({ dateOfDeath: '2026-06-30', certificateIssueDate: '2026-06-01' }),
      MEMBER,
      { now: NOW },
    );
    expect(r.outcome).toBe('mismatch');
    expect(r.flags['date']).toBe('death_after_certificate_issue');
  });

  it('match: certificate issued after death is plausible', () => {
    const r = evaluateParity(
      ocr({ dateOfDeath: '2026-06-30', certificateIssueDate: '2026-07-01' }),
      MEMBER,
      { now: NOW },
    );
    expect(r.outcome).toBe('match');
  });

  it('does not infer a mismatch when the certificate issue date is absent or unreadable (AR-61)', () => {
    const r = evaluateParity(ocr({ certificateIssueDate: null }), MEMBER, { now: NOW });
    expect(r.outcome).toBe('match');
    expect(r.flags['date']).toBeUndefined();
  });

  it('mismatch: implausible date — death before member joined', () => {
    const r = evaluateParity(ocr({ dateOfDeath: '2019-06-01' }), MEMBER, { now: NOW });
    expect(r.outcome).toBe('mismatch');
    expect(r.flags['date']).toBe('death_before_member_joined');
  });

  it('mismatch: implausible date — death in the future', () => {
    const r = evaluateParity(ocr({ dateOfDeath: '2030-01-01' }), MEMBER, { now: NOW });
    expect(r.outcome).toBe('mismatch');
    expect(r.flags['date']).toBe('death_in_future');
  });

  it('ambiguous: no comparison source (member record absent) — never mismatch (AR-61)', () => {
    const r = evaluateParity(ocr(), { name: null, dateOfBirth: null }, { now: NOW });
    expect(r.outcome).toBe('ambiguous');
    expect(r.verifierReviewRequired).toBe(true);
  });

  it('ambiguous: OCR name + DoB both unreadable', () => {
    const r = evaluateParity(
      ocr({ deceasedName: null, dateOfBirth: null }),
      MEMBER,
      { now: NOW },
    );
    expect(r.outcome).toBe('ambiguous');
  });

  it('ambiguous: a single critical field missing (name) → ambiguous, not mismatch', () => {
    const r = evaluateParity(ocr({ deceasedName: null }), MEMBER, { now: NOW });
    expect(r.outcome).toBe('ambiguous');
    expect(r.flags['name']).toBe('missing');
  });
});

// ── Story 6.21b (D6) — the death-date OCR flag (display only; AC5) ─────────────────────────────

describe('evaluateParity — the death-date OCR flag (D6)', () => {
  it('null date of death, no raw value present ⇒ death_date: missing, ambiguous', () => {
    const r = evaluateParity(ocr({ dateOfDeath: null }), MEMBER, { now: NOW, rawDateOfDeathPresent: false });
    expect(r.outcome).toBe('ambiguous');
    expect(r.flags['death_date']).toBe('missing');
    expect(r.verifierReviewRequired).toBe(true);
  });

  it('rawDateOfDeathPresent ABSENT (undefined) reads the same as false ⇒ missing (BW-C12)', () => {
    const r = evaluateParity(ocr({ dateOfDeath: null }), MEMBER, { now: NOW });
    expect(r.flags['death_date']).toBe('missing');
  });

  it('null date of death, a raw value WAS present but did not normalize ⇒ death_date: unreadable, ambiguous', () => {
    const r = evaluateParity(ocr({ dateOfDeath: null }), MEMBER, { now: NOW, rawDateOfDeathPresent: true });
    expect(r.outcome).toBe('ambiguous');
    expect(r.flags['death_date']).toBe('unreadable');
    expect(r.verifierReviewRequired).toBe(true);
  });

  it('BOTH early-return paths (missing member record; OCR name+DoB unreadable) carry the death_date flag too', () => {
    const r1 = evaluateParity(ocr({ dateOfDeath: null }), { name: null, dateOfBirth: null }, { now: NOW });
    expect(r1.outcome).toBe('ambiguous');
    expect(r1.flags['source']).toBe('missing_member_record');
    expect(r1.flags['death_date']).toBe('missing');

    const r2 = evaluateParity(
      ocr({ deceasedName: null, dateOfBirth: null, dateOfDeath: null }),
      MEMBER,
      { now: NOW },
    );
    expect(r2.outcome).toBe('ambiguous');
    expect(r2.flags['ocr']).toBe('unreadable');
    expect(r2.flags['death_date']).toBe('missing');
  });

  it('a present, valid date of death carries NO death_date flag; `date` stays the plausibility key', () => {
    const r = evaluateParity(ocr({ dateOfDeath: '2026-06-30' }), MEMBER, { now: NOW });
    expect(r.flags['death_date']).toBeUndefined();
    expect(r.outcome).toBe('match');
  });

  it('an OCR/fetch FAILURE (ocrFailed: true) skips the death_date flag entirely — the existing `ocr` flag already says why (`-249` §3)', () => {
    const r = evaluateParity(
      ocr({ deceasedName: null, dateOfBirth: null, dateOfDeath: null }),
      MEMBER,
      { now: NOW, ocrFailed: true, rawDateOfDeathPresent: false },
    );
    expect(r.outcome).toBe('ambiguous');
    expect(r.flags['ocr']).toBe('unreadable');
    expect(r.flags['death_date']).toBeUndefined();
  });
});
