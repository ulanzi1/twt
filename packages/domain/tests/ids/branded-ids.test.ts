// Branded-ID smart-constructor unit tests — Story 1.7 (AC-5).
//
// The brand itself is compile-time-only (no runtime tag), so these tests assert
// the *runtime* contract: the smart constructor validates UUID shape and returns
// the same string value; a malformed input throws InvalidBrandedIdError.

import { describe, expect, it } from 'vitest';

import {
  InvalidBrandedIdError,
  claimId,
  pariwarId,
  userId,
} from '../../src/ids/index.js';

const VALID_UUID = '11111111-1111-1111-1111-111111111111';
const VALID_UUID_V4 = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

describe('branded-id smart constructors', () => {
  it('returns the lowercase string value for a valid UUID', () => {
    const id = pariwarId(VALID_UUID);
    expect(id).toBe(VALID_UUID); // all-lowercase input unchanged
    expect(typeof id).toBe('string');
  });

  it('accepts a v4 UUID', () => {
    expect(pariwarId(VALID_UUID_V4)).toBe(VALID_UUID_V4);
  });

  it('lowercases the value for canonical form (cache-key / invalidation consistency)', () => {
    const upper = VALID_UUID_V4.toUpperCase();
    expect(pariwarId(upper)).toBe(VALID_UUID_V4); // normalised to lowercase
  });

  it.each([
    ['empty string', ''],
    ['not a uuid', 'not-a-uuid'],
    ['too short', '1111-1111'],
    ['sql-ish injection', `' OR 1=1; --`],
    ['uuid with trailing junk', `${VALID_UUID}x`],
  ])('throws InvalidBrandedIdError for %s', (_label, bad) => {
    expect(() => pariwarId(bad)).toThrow(InvalidBrandedIdError);
  });

  it('error carries the brand name + received value for diagnostics', () => {
    try {
      pariwarId('bad');
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(InvalidBrandedIdError);
      const e = err as InvalidBrandedIdError;
      expect(e.brand).toBe('PariwarId');
      expect(e.received).toBe('bad');
      expect(e.message).toContain('PariwarId');
    }
  });

  it('distinct constructors share the validator but tag distinct brands', () => {
    // Runtime values are equal strings; the brands differ only at compile time.
    expect(claimId(VALID_UUID)).toBe(pariwarId(VALID_UUID));
  });

  it('userId (Story 1.9) validates + brands like the others', () => {
    expect(userId(VALID_UUID_V4)).toBe(VALID_UUID_V4);
    expect(() => userId('not-a-uuid')).toThrow(InvalidBrandedIdError);
    try {
      userId('bad');
    } catch (err) {
      expect((err as InvalidBrandedIdError).brand).toBe('UserId');
    }
  });
});
