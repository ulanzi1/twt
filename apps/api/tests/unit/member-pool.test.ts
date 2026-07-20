// Member-pool (My Pool card) handler PURE units — Story 8.2 (Task 7; AC2/D5/D11).
//
// The DB-free halves of the handler: the PII-shielding name split (D11) and the leap-safe
// days-remaining window math (D5 SEAM). Both are pure + deterministic, so they are unit-tested here
// without a DB / KMS; the full resolution pipeline is exercised by the live-DB integration spec.

import { describe, expect, it } from 'vitest';

import { computeDaysRemaining } from '../../src/modules/member-pool/handlers.js';
import { splitFirstNameLastInitial } from '../../src/modules/member-pool/name.js';

describe('splitFirstNameLastInitial — PII-shielded name split (AC2 / D11)', () => {
  it('splits a two-token name to first name + last-name INITIAL only (never the surname)', () => {
    expect(splitFirstNameLastInitial('Rajesh Sharma')).toEqual({ firstName: 'Rajesh', lastInitial: 'S' });
  });

  it('a three-token name uses the FIRST token + the LAST token initial', () => {
    expect(splitFirstNameLastInitial('Ram Prasad Yadav')).toEqual({ firstName: 'Ram', lastInitial: 'Y' });
  });

  it('a single-token name yields an EMPTY last initial (no surname to leak)', () => {
    expect(splitFirstNameLastInitial('Rajesh')).toEqual({ firstName: 'Rajesh', lastInitial: '' });
  });

  it('collapses extra internal whitespace', () => {
    expect(splitFirstNameLastInitial('  Sunita   Devi  ')).toEqual({ firstName: 'Sunita', lastInitial: 'D' });
  });

  it('a Devanagari name splits to the first Devanagari grapheme initial (no clipping / partial byte)', () => {
    const { firstName, lastInitial } = splitFirstNameLastInitial('राजेश शर्मा');
    expect(firstName).toBe('राजेश');
    // The initial is a single grapheme — the base consonant of the surname, never the whole surname.
    expect(lastInitial.length).toBeGreaterThan(0);
    expect('शर्मा'.startsWith(lastInitial)).toBe(true);
    expect(lastInitial).not.toBe('शर्मा');
  });

  it('an empty / whitespace-only name yields empty parts (the handler fail-softs the card)', () => {
    expect(splitFirstNameLastInitial('')).toEqual({ firstName: '', lastInitial: '' });
    expect(splitFirstNameLastInitial('   ')).toEqual({ firstName: '', lastInitial: '' });
  });
});

describe('computeDaysRemaining — leap-safe 15-day window seam (D5)', () => {
  it('is 15 at the freeze instant (window just opened)', () => {
    const committedAt = new Date('2026-07-01T00:00:00.000Z');
    expect(computeDaysRemaining(committedAt, committedAt)).toBe(15);
  });

  it('counts down day by day', () => {
    const committedAt = new Date('2026-07-01T00:00:00.000Z');
    expect(computeDaysRemaining(committedAt, new Date('2026-07-06T00:00:00.000Z'))).toBe(10);
    expect(computeDaysRemaining(committedAt, new Date('2026-07-15T00:00:00.000Z'))).toBe(1);
  });

  it('clamps to 0 at/after the close (never negative)', () => {
    const committedAt = new Date('2026-07-01T00:00:00.000Z');
    expect(computeDaysRemaining(committedAt, new Date('2026-07-16T00:00:00.000Z'))).toBe(0);
    expect(computeDaysRemaining(committedAt, new Date('2026-08-01T00:00:00.000Z'))).toBe(0);
  });

  it('is leap-safe across a month boundary (setDate rollover, not fixed-ms add)', () => {
    // Feb 20 2028 + 15 days → window end March 6 (Feb 2028 has 29 days: 20→29 is 9 days, +6 = Mar 6).
    // A fixed-ms add would land a day early (Feb has 28 in a non-leap year); setDate handles the rollover.
    const committedAt = new Date('2028-02-20T00:00:00.000Z');
    expect(computeDaysRemaining(committedAt, new Date('2028-03-01T00:00:00.000Z'))).toBe(5); // Mar 6 − Mar 1
    expect(computeDaysRemaining(committedAt, new Date('2028-03-06T00:00:00.000Z'))).toBe(0);
  });
});
