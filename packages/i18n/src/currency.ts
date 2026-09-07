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

/**
 * ⭐⭐ THE SHORT MONEY FORM — `₹ 19.45 lakh` / `₹ 19.45 लाख`. Story 11b.14, Trustee-ratified
 * 2026-09-07 (DR + KB); recorded at `2026-09-07-204`.
 *
 * ⚠⛔ **IT DID ⛔ NOT EXIST BEFORE.** `"lakh"`, `"लाख"`, `"हज़ार"` and `"crore"` appeared in ⛔ ZERO
 * copy or code files in this repository, and {@link formatCurrency} emits only the grouped form.
 * ⇒ ⛔ the word-form and its rounding rule are BOTH new, and both are RULED — ⛔ neither is a
 * developer's choice.
 *
 * ⭐ **THE RULE, verbatim:**
 *  · *"Cut off at **Exactly** ten lakh"* ⇒ ⛔⛔ **TRUNCATE, ⛔ NEVER round up.** `₹19,45,678` is
 *    `19.45 lakh`, ⛔ never `19.46` — the figure must ⛔ never overstate what has been contributed.
 *  · **Trailing zeros trimmed** — `₹ 50 lakh`, ⛔ never `₹ 50.00 lakh`.
 *  · **lakh becomes crore at ₹1 crore** — the natural join. `MAX_DRIVE_TARGET_INR` is ₹10 crore,
 *    so crore is reachable.
 *
 * ⭐⭐ **THE HINDI ARM TAKES THE HINDI WORD AND ⛔ LATIN DIGITS**, and that is the **amendment-A2**
 * contract stated at the top of this file: money is OPERATIONAL data. ⛔ It does ⛔ NOT call
 * `toHindiNumeral`, and it is ⛔ NOT the `'hi'` arm of {@link formatCurrency} — which exists only for
 * ceremonial prose and would emit `₹ १९.४५`. ⭐ The Panel's own ratified string writes `19.45 लाख`.
 *
 * ⚠ **THE SPACING MATCHES {@link formatCurrency} DELIBERATELY** (`₹ ` with a space). The routing note
 * writes `₹19.45 lakh` in shorthand prose, ⛔ but the two forms appear on the SAME page — Closed rows
 * carry the exact form and Live rows the short one — and two rupee spacings on one page is the
 * *"two money formats"* defect the follow-up warned of. ⇒ ⭐ ONE house form.
 *
 * ⛔ Refuses a negative amount: there is no ruled short form for one, and every caller is a total.
 */
export function formatCurrencyShort(amount: number, locale: Locale): string {
  if (!Number.isFinite(amount)) {
    throw new Error(
      `[i18n] formatCurrencyShort requires a finite amount, received ${String(amount)}`,
    );
  }
  if (amount < 0) {
    throw new Error(
      `[i18n] formatCurrencyShort refuses a negative amount, received ${String(amount)}`,
    );
  }

  const CRORE = 10_000_000;
  const LAKH = 100_000;
  const useCrore = amount >= CRORE;
  const divisor = useCrore ? CRORE : LAKH;
  const unit = useCrore
    ? locale === 'hi'
      ? 'करोड़'
      : 'crore'
    : locale === 'hi'
      ? 'लाख'
      : 'lakh';

  // ⛔ TRUNCATION, ⛔ not rounding — see the rule above. `Math.floor` on the scaled value is what
  // makes `19,45,999` render `19.45`; `toFixed(2)` alone would round it UP to `19.46`.
  //
  // ⚠⛔⛔ **SCALE FIRST, DIVIDE SECOND — ⛔ AND THE ORDER IS THE WHOLE FIX** (Review finding,
  // 2026-09-07). ⛔ The prior text of this line was `Math.floor((amount / divisor) * 100)`, which
  // divides in IEEE-754 **before** scaling: the quotient lands a hair below the true value and
  // `Math.floor` then eats a whole hundredth. ⭐ **Executed, ⛔ not reasoned — 570 mismatches in a
  // ₹10L–₹10Cr sweep:** `₹10,03,000` rendered `₹ 10.02 lakh`, `₹10,20,000` rendered `₹ 10.19 lakh`,
  // `₹2,01,000` rendered `₹ 2 lakh` (⛔ the fraction vanished), and `₹1,13,00,000` rendered
  // `₹ 1.12 crore` — ⚠ an error of **₹1,00,000** in the crore band.
  // ⭐ `amount * 100` is EXACT for every reachable input: callers pass integer paise-free rupees and
  // `MAX_DRIVE_TARGET_INR` is ₹10 crore ⇒ ⛔ the product cannot exceed 1e9 × 100 = 1e11, far inside
  // `Number.MAX_SAFE_INTEGER`. ⛔ Do ⛔ not "simplify" this back to dividing first.
  // ⚠ Every value in `currency-short.test.ts` was float-exact, so the suite was **GREEN on a broken
  // function** — ⭐ the mismatching values are now pinned there by name.
  const truncatedHundredths = Math.floor((amount * 100) / divisor);
  const whole = Math.floor(truncatedHundredths / 100);
  const hundredths = truncatedHundredths % 100;
  // Trailing zeros trimmed: `50` → "50", `50.10` → "50.1", `19.45` → "19.45".
  const fraction =
    hundredths === 0 ? '' : `.${String(hundredths).padStart(2, '0').replace(/0$/, '')}`;

  return `₹ ${groupIndian(String(whole))}${fraction} ${unit}`;
}

/**
 * ⭐ A COUNT — Indian grouping, ⛔ no `₹`, ⛔ no short form, in BOTH locales.
 *
 * ⚠⛔ **COUNTS ARE ALWAYS EXACT, AT EVERY SIZE** — *"For colleagues shows exact number"*
 * (Trustee-ratified 2026-09-07). ⇒ ⭐ the Panel's earlier Hindi *"43 हज़ार"* word-form is **DROPPED**,
 * and the EN/HI asymmetry in the two ratified strings is resolved: both render `43,000`.
 *
 * ⭐⭐ **IT TAKES ⛔ NO LOCALE, AND THAT IS THE CONTRACT MADE STRUCTURAL.** A count is OPERATIONAL
 * data and renders **LATIN in both locales** (amendment-A2, this file's header) — ⇒ a `locale`
 * parameter would imply a per-locale difference that does ⛔ not exist and must ⛔ not be introduced.
 * ⛔ Do ⛔ not reach for `toHindiNumeral`, and ⛔ do ⛔ not add the parameter back "for symmetry" with
 * {@link formatCurrencyShort}, which needs it only for the WORD (lakh / लाख).
 */
export function formatCount(value: number): string {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`[i18n] formatCount requires a non-negative integer, received ${String(value)}`);
  }
  return groupIndian(String(value));
}
