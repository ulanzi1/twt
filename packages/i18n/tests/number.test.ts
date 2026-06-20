import { describe, expect, it } from 'vitest';

import { toGregorianNumeral, toHindiNumeral } from '../src/number.js';

describe('toHindiNumeral', () => {
  it('converts Latin digits to Devanagari', () => {
    expect(toHindiNumeral(2026)).toBe('२०२६');
    expect(toHindiNumeral('0123456789')).toBe('०१२३४५६७८९');
  });

  it('passes non-digit characters through unchanged', () => {
    expect(toHindiNumeral('₹ 45,88,000')).toBe('₹ ४५,८८,०००');
    expect(toHindiNumeral('३४ वर्ष')).toBe('३४ वर्ष');
  });
});

describe('toGregorianNumeral', () => {
  it('converts Devanagari digits back to Latin', () => {
    expect(toGregorianNumeral('२०२६')).toBe('2026');
    expect(toGregorianNumeral('०१२३४५६७८९')).toBe('0123456789');
  });

  it('passes non-digit characters through unchanged', () => {
    expect(toGregorianNumeral('₹ ४५,८८,०००')).toBe('₹ 45,88,000');
  });
});

describe('round-trip', () => {
  it('toGregorianNumeral(toHindiNumeral(n)) === String(n)', () => {
    for (const n of [0, 7, 110, 4588000, 99]) {
      expect(toGregorianNumeral(toHindiNumeral(n))).toBe(String(n));
    }
  });
});
