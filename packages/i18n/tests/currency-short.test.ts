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
});
