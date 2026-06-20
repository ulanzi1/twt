// packages/i18n/src/currency.ts
//
// Rupee currency formatting with Indian (lakh/crore) digit grouping (Story 2.1, AC6).
//
// Indian grouping clusters the LAST three digits, then in twos: 4588000 → "45,88,000",
// 100000 → "1,00,000". The grouping is hand-rolled (not Intl.NumberFormat) so the
// output is deterministic and identical across Node / Hermes (RN) / edge, where Intl
// data availability varies.
//
// ── Amendment-A2 contract ─────────────────────────────────────────────────────────
// `formatCurrency` is locale-PARAMETRIC (it can emit Devanagari numerals), but currency
// amounts are OPERATIONAL data: per amendment-A2 they MUST render Latin. So callers
// format operational amounts with `formatCurrency(amount, 'en')` even inside a Hindi
// UI ("₹ 45,88,000"). The `'hi'` (Devanagari) form exists only for the narrow
// ceremonial-prose case; do not use it for ledgers, stat-strips, or pool figures.

import type { Locale } from './locale.js';
import { toHindiNumeral } from './number.js';

/** Group an integer-digit string with Indian (lakh/crore) separators. */
function groupIndian(intDigits: string): string {
  if (intDigits.length <= 3) return intDigits;
  const last3 = intDigits.slice(-3);
  const rest = intDigits.slice(0, -3);
  return `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${last3}`;
}

/**
 * Format `amount` as `₹` with Indian lakh/crore grouping and locale-aware numerals.
 * Whole amounts drop the decimal ("₹ 110"); fractional amounts keep two places
 * ("₹ 99.50"). Negative amounts prefix a minus ("-₹ 110").
 *
 * Per amendment-A2, pass `'en'` for operational figures (Latin numerals); `'hi'`
 * (Devanagari) is for ceremonial prose only.
 */
export function formatCurrency(amount: number, locale: Locale): string {
  if (!Number.isFinite(amount)) {
    throw new Error(`[i18n] formatCurrency requires a finite amount, received ${String(amount)}`);
  }
  if (Math.abs(amount) >= 1e15) {
    throw new Error(`[i18n] formatCurrency: amount exceeds supported range (±1e15), received ${String(amount)}`);
  }

  const negative = amount < 0;
  const rounded = Math.round(Math.abs(amount) * 100) / 100;
  const [intPart = '0', fracPart = '00'] = rounded.toFixed(2).split('.');

  const grouped = groupIndian(intPart);
  const body = fracPart === '00' ? grouped : `${grouped}.${fracPart}`;
  const digits = locale === 'hi' ? toHindiNumeral(body) : body;

  return `${negative ? '-' : ''}₹ ${digits}`;
}
