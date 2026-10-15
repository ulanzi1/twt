// The PHONE-SIDE mobile normaliser (Story 6.36b, Task 4; 6.36a SW11 / SF9).
//
// A COPY of the server's `normalizeMobile` (`packages/domain/src/encryption/member-fields.ts` — the app ⛔ cannot import
// `@twt/domain`) that ALSO takes what a phone book holds and the server refuses: `0091…`, `+91 (0)…`, `+910…`, and
// non-ASCII digits (Devanagari and the other Indic scripts, full-width) folded to ASCII after NFKD. Output: `+91XXXXXXXXXX`
// (a 10-digit Indian mobile, first digit 6–9) or `null`. The server re-normalises what the phone sends.
// ⭐ PARITY: `packages/contracts/tests/fixtures/mobile-normalize-cases.json` lists the cases; the domain test proves the
// server's answers, `tests/unit/phone-normalize.test.ts` proves this copy gives the SAME answer on every case the server
// accepts and the wider answer on the phone-only ones.

/** The zero of each Unicode decimal-digit block an Indian phone book may hold (NFKD already folds full-width). */
const DIGIT_ZEROS = [
  0x0660, // Arabic-Indic
  0x06f0, // Extended Arabic-Indic
  0x0966, // Devanagari
  0x09e6, // Bengali
  0x0a66, // Gurmukhi
  0x0ae6, // Gujarati
  0x0b66, // Oriya
  0x0be6, // Tamil
  0x0c66, // Telugu
  0x0ce6, // Kannada
  0x0d66, // Malayalam
] as const

/** NFKD, then every Indic / Arabic-Indic decimal digit → its ASCII digit. Other characters are left as they are. */
export function foldDigits(raw: string): string {
  let out = ''
  for (const ch of raw.normalize('NFKD')) {
    const cp = ch.codePointAt(0)!
    const zero = DIGIT_ZEROS.find((z) => cp >= z && cp <= z + 9)
    out += zero === undefined ? ch : String(cp - zero)
  }
  return out
}

const INDIAN_MOBILE_CORE = /^[6-9]\d{9}$/

/** `+91XXXXXXXXXX`, or `null` when the entry is not an Indian mobile. */
export function normalizeMobileOnPhone(raw: string): string | null {
  let digits = foldDigits(raw).replace(/\D/g, '')
  if (digits.length === 14 && digits.startsWith('0091')) digits = digits.slice(4) // 0091 98765 43210
  else if (digits.length === 13 && digits.startsWith('910')) digits = digits.slice(3) // +91 (0) 98765… / +910 98765…
  else if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2) // the server's two peels
  else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1)
  if (!INDIAN_MOBILE_CORE.test(digits)) return null
  return `+91${digits}`
}
