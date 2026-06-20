// packages/i18n/src/number.ts
//
// Devanagari ↔ Latin numeral conversion (Story 2.1, AC6). The Story 1.17 microcopy
// gate ships the numeral DISCIPLINE (the lint); these are the sanctioned runtime
// conversions it forward-referenced — `packages/i18n` is now their home.
//
// ── Amendment-A2 contract (operational vs ceremonial) ─────────────────────────────
// Devanagari digits (०-९) are reserved EXCLUSIVELY for ceremonial/memorial Devanagari
// PROSE (e.g. "३४ वर्षों की सेवा" on the Shradhanjali surface). OPERATIONAL data —
// every count, amount, date, UTR, ledger column, stat-strip value, even on memorial
// pages — renders in Latin numerals. Never mix the two systems at the same hierarchy
// level (one numeral system per row/label/stat-value). `toHindiNumeral` therefore
// exists to render ceremonial prose, NOT to "translate" operational figures.

// Devanagari digits indexed 0-9.
const HINDI_DIGITS = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'] as const;

/**
 * Convert Latin digits in `value` to Devanagari (०-९). Non-digit characters
 * (`,` `.` `-` `₹`, letters, spaces) pass through unchanged. Use ONLY for ceremonial
 * Devanagari prose per the amendment-A2 contract above — never for operational figures.
 */
export function toHindiNumeral(value: number | string): string {
  return String(value).replace(/[0-9]/g, (d) => HINDI_DIGITS[Number(d)] ?? d);
}

/**
 * Convert Devanagari digits (०-९) in `value` back to Latin (0-9). Non-digit
 * characters pass through unchanged. Use to normalise ceremonial input back to the
 * operational (Latin) register.
 */
export function toGregorianNumeral(value: string): string {
  return value.replace(/[०-९]/g, (d) => String(HINDI_DIGITS.indexOf(d as (typeof HINDI_DIGITS)[number])));
}
