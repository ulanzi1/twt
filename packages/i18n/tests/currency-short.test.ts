// ⭐⭐ THE SHORT (lakh / crore) MONEY FORM — Story 11b.14, Trustee-ratified 2026-09-07 (DR + KB).
//
// ⚠⛔ IT DID ⛔ NOT EXIST BEFORE THIS STORY. `"lakh"`, `"लाख"` and `"crore"` appeared in ⛔ ZERO copy
// or code files in this repository, and `formatCurrency` emits only the grouped form
// (`"₹ 19,45,000"`). ⇒ the word-form and its rounding rule are BOTH new, and both are ruled.
//
// ⭐ THE RULE, verbatim (routing note §12.1 answer 3, §13.4, §13.5):
//   · *"Cut off at **Exactly** ten lakh"* ⇒ TRUNCATE, ⛔ never round up.
//   · Trailing zeros trimmed — *"₹50 lakh"*, ⛔ not *"₹50.00 lakh"*.
//   · lakh becomes crore at ₹1 crore — ⭐ the natural join.

import { describe, expect, it } from 'vitest';

import { formatCount, formatCurrencyShort } from '../src/currency.js';

describe('formatCurrencyShort — ⭐ always lakh or crore', () => {
  it('⭐ renders lakh with the ₹ sign, in the house spacing', () => {
    expect(formatCurrencyShort(1_945_000, 'en')).toBe('₹ 19.45 lakh');
  });

  it('⛔⛔ TRUNCATES — ⛔ never rounds up (*"cut off"*, ⛔ never 19.46)', () => {
    expect(formatCurrencyShort(1_945_678, 'en')).toBe('₹ 19.45 lakh');
    expect(formatCurrencyShort(1_945_999, 'en')).toBe('₹ 19.45 lakh');
  });

  it('⭐ trims trailing zeros — ₹50 lakh, ⛔ never ₹50.00 lakh', () => {
    expect(formatCurrencyShort(5_000_000, 'en')).toBe('₹ 50 lakh');
    expect(formatCurrencyShort(5_010_000, 'en')).toBe('₹ 50.1 lakh');
    expect(formatCurrencyShort(800_000, 'en')).toBe('₹ 8 lakh');
  });

  it('⭐ lakh becomes crore at EXACTLY ₹1 crore — ⭐ the natural join', () => {
    expect(formatCurrencyShort(9_999_000, 'en')).toBe('₹ 99.99 lakh');
    expect(formatCurrencyShort(10_000_000, 'en')).toBe('₹ 1 crore');
    expect(formatCurrencyShort(25_000_000, 'en')).toBe('₹ 2.5 crore');
    // `MAX_DRIVE_TARGET_INR` is ₹10 crore, so crore is reachable.
    expect(formatCurrencyShort(100_000_000, 'en')).toBe('₹ 10 crore');
  });

  it('⭐⭐ HINDI TAKES THE HINDI WORD AND ⛔ LATIN DIGITS — the amendment-A2 contract', () => {
    // ⛔⛔ ⛔ NOT `toHindiNumeral`. Money is OPERATIONAL data and renders LATIN
    // (`currency.ts`'s own header); the `'hi'` Devanagari arm is for ceremonial prose only.
    // ⭐ The Panel's own ratified string writes `19.45 लाख` — Latin digits, Hindi word.
    expect(formatCurrencyShort(1_945_000, 'hi')).toBe('₹ 19.45 लाख');
    expect(formatCurrencyShort(25_000_000, 'hi')).toBe('₹ 2.5 करोड़');
  });

  it('⛔ refuses a non-finite or out-of-range amount, like its sibling', () => {
    expect(() => formatCurrencyShort(Number.NaN, 'en')).toThrow(/finite/);
    expect(() => formatCurrencyShort(-1, 'en')).toThrow(/negative/);
  });
});

describe('formatCount — ⭐ counts are ALWAYS exact, at every size', () => {
  it('⭐ Indian grouping, Latin digits, ⛔ no ₹ and ⛔ no short form', () => {
    // ⚠⛔ THE PANEL DROPPED THE *"43 हज़ार"* WORD-FORM: *"For colleagues shows exact number"*
    // (§12.1 answer 3) ⇒ ⭐ the EN/HI language asymmetry in the ratified strings is RESOLVED.
    // ⭐⭐ AND THE FUNCTION TAKES ⛔ NO LOCALE — the contract made structural: a count renders LATIN
    // in BOTH locales (amendment-A2), so a locale parameter would imply a difference that does
    // ⛔ not exist. ⛔ Do ⛔ not add one back "for symmetry" with `formatCurrencyShort`.
    expect(formatCount(6_485)).toBe('6,485');
    expect(formatCount(43_000)).toBe('43,000');
    expect(formatCount(1_670_000)).toBe('16,70,000');
    expect(formatCount(0)).toBe('0');
  });

  // ⭐⭐ THE FLOAT-TRUNCATION REGRESSION — Review finding 2026-09-07. ⛔ EVERY value asserted above
  // is float-exact, so the whole suite stayed GREEN while `formatCurrencyShort` under-stated 570
  // reachable amounts. ⭐ These are the values that FAILED before the scale-first fix; ⛔ do ⛔ not
  // remove them, and ⛔ do ⛔ not "simplify" the implementation back to dividing first.
  describe('⛔ the scaled quotient must not eat a hundredth (scale FIRST, divide second)', () => {
    it.each([
      [1_003_000, '₹ 10.03 lakh'],
      [1_020_000, '₹ 10.2 lakh'],
      [201_000, '₹ 2.01 lakh'],
      [1_160_000, '₹ 11.6 lakh'],
      [11_300_000, '₹ 1.13 crore'],
    ])('%d renders %s', (amount, expected) => {
      expect(formatCurrencyShort(amount, 'en')).toBe(expected);
    });

    // ⭐ THE PROPERTY, ⛔ not a sample: truncation to hundredths must equal the INTEGER computation
    // for every reachable rupee amount. ⚠ Callers pass integers and the ceiling is ₹10 crore.
    it('⭐ agrees with integer arithmetic across the whole reachable range', () => {
      const mismatches: number[] = [];
      for (let v = 100_000; v <= 100_000_000; v += 500) {
        const divisor = v >= 10_000_000 ? 10_000_000 : 100_000;
        const exact = Math.floor((v * 100) / divisor);
        const whole = Math.floor(exact / 100);
        const hundredths = exact % 100;
        const fraction =
          hundredths === 0 ? '' : `.${String(hundredths).padStart(2, '0').replace(/0$/, '')}`;
        const unit = v >= 10_000_000 ? 'crore' : 'lakh';
        const expected = `₹ ${groupIndianForTest(String(whole))}${fraction} ${unit}`;
        if (formatCurrencyShort(v, 'en') !== expected) mismatches.push(v);
      }
      expect(mismatches).toEqual([]);
    });
  });

  // ⚠ Mirrors the module's own Indian grouping so the property test asserts the FIGURE, ⛔ not the
  // grouping (which `currency.test.ts` already pins).
  function groupIndianForTest(intDigits: string): string {
    if (intDigits.length <= 3) return intDigits;
    const last3 = intDigits.slice(-3);
    const rest = intDigits.slice(0, -3);
    return `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${last3}`;
  }
});
