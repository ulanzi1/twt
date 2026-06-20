import { describe, expect, it } from 'vitest';

import { formatCurrency } from '../src/currency.js';

describe('formatCurrency — Indian (lakh/crore) grouping', () => {
  it('groups last three digits then in twos', () => {
    expect(formatCurrency(110, 'en')).toBe('₹ 110');
    expect(formatCurrency(1000, 'en')).toBe('₹ 1,000');
    expect(formatCurrency(100000, 'en')).toBe('₹ 1,00,000'); // 1 lakh
    expect(formatCurrency(4588000, 'en')).toBe('₹ 45,88,000');
    expect(formatCurrency(10000000, 'en')).toBe('₹ 1,00,00,000'); // 1 crore
  });

  it('drops .00 for whole amounts, keeps two places otherwise', () => {
    expect(formatCurrency(99, 'en')).toBe('₹ 99');
    expect(formatCurrency(99.5, 'en')).toBe('₹ 99.50');
    expect(formatCurrency(99.99, 'en')).toBe('₹ 99.99');
  });

  it('prefixes a minus for negative amounts', () => {
    expect(formatCurrency(-110, 'en')).toBe('-₹ 110');
  });

  it('renders Devanagari numerals for the ceremonial hi form (A2)', () => {
    expect(formatCurrency(4588000, 'hi')).toBe('₹ ४५,८८,०००');
  });

  it('throws on a non-finite amount', () => {
    expect(() => formatCurrency(Number.NaN, 'en')).toThrow(/finite amount/);
    expect(() => formatCurrency(Number.POSITIVE_INFINITY, 'en')).toThrow(/finite amount/);
  });
});
