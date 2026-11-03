// The attribution-code FORMAT and its generator — Story 13.2 (Task 3; AC3; AT5).
//
// A code is exactly six ASCII digits, `000000`–`999999`, kept as a STRING (leading zeros are real — FR-82 and the shipped
// `referenceCode` contract say *6-digit numeric*). Twenty guessable codes are ⛔ ever issued: a teacher who types `123456` as a
// placeholder must credit no real worker. The deny-list lives TWICE — here and in migration 0199's
// `field_worker_attribution_codes_code_denylist_check` — ⚠ LOCKSTEP (a unit test reads the migration, TR6).
//
// ── Entropy discipline ─────────────────────────────────────────────────────────────────────────────────
// `crypto.randomInt` — NEVER Math.random. Node rejection-samples `randomInt`, so the draw is uniform over 10⁶ (no modulo
// bias); a deny-listed draw is redrawn.

import { randomInt } from 'node:crypto';

/** A code is this many digits. */
export const ATTRIBUTION_CODE_LENGTH = 6;

/** Exactly six ASCII digits. `[0-9]`, ⛔ `\d` (the SQL CHECK uses the same class — TR5). */
export const ATTRIBUTION_CODE_PATTERN = /^[0-9]{6}$/;

/**
 * The guessable codes ⛔ ever issued: the ten repdigits, the five ascending straight runs and their five reverses (AT5).
 * ⚠ LOCKSTEP with migration 0199's `field_worker_attribution_codes_code_denylist_check`.
 */
export const ATTRIBUTION_CODE_DENYLIST: readonly string[] = Object.freeze([
  '000000',
  '111111',
  '222222',
  '333333',
  '444444',
  '555555',
  '666666',
  '777777',
  '888888',
  '999999',
  '012345',
  '123456',
  '234567',
  '345678',
  '456789',
  '543210',
  '654321',
  '765432',
  '876543',
  '987654',
]);

const DENYLIST = new Set(ATTRIBUTION_CODE_DENYLIST);

/** True iff `code` is one of the twenty guessable codes. */
export function isDenylistedAttributionCode(code: string): boolean {
  return DENYLIST.has(code);
}

/** A fresh, uniformly drawn, never deny-listed six-digit code (leading zeros kept). */
export function generateAttributionCode(): string {
  for (;;) {
    const code = String(randomInt(0, 10 ** ATTRIBUTION_CODE_LENGTH)).padStart(ATTRIBUTION_CODE_LENGTH, '0');
    if (!DENYLIST.has(code)) return code;
  }
}
