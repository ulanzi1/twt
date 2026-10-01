// The correction chase's ONE error classifier (Story 6.19b; fourth-pass review 2026-10-01, widened in the fifth pass) —
// the must-act form, the letter forms, the address reveal, the step-up code and the screenshot link all read an error
// the same way.
//
// ⭐ A 403 is the ROLE or the SCOPE — the page cannot see keys (1)/(7) (district-dimension; the session carries only
// the national grants) — so it reads "your access does not cover this claim", ⛔ never "Try again" (a retry that can
// never succeed), and ⛔ never "a District Admin can" (a District Admin of ANOTHER district gets the same 403). ⛔ EXCEPT
// the step-up signal (`auth.step_up_required`, also a 403): that one asks for a fresh code and is handled by its caller.
// ⭐ A 401 is the SESSION, a 429 the rate limit — each its own line (fifth-pass review: both read "Try again").

import { ApiError } from '../../api/client.js';
import { correctionChaseEn as t } from './i18n-en.js';

export const STEP_UP_REQUIRED_CODE = 'auth.step_up_required';

/** True for a 403 that means "your access does not cover this" — ⛔ false for the step-up signal. */
export function isRoleForbidden(err: unknown): boolean {
  return err instanceof ApiError && err.status === 403 && err.code !== STEP_UP_REQUIRED_CODE;
}

/**
 * An error as specific copy. Each `correction_letter.<suffix>` code maps to its own line (keyed by the suffix); then
 * the STATUS — 401 (the session), a role/scope 403, 429 (the rate limit), and a transport 413/415 that carries ⛔ no
 * `correction_letter.*` code (a proxy, the multipart limit — often no JSON body at all, `http.413`). Anything else is
 * `fallback` — the caller's own "could not be saved / shown / sent" line.
 */
export function correctionLetterRefusalText(err: unknown, fallback: string = t.letters.error): string {
  if (err instanceof ApiError) {
    if (err.code.startsWith('correction_letter.')) {
      const copy = t.letters.refusals[err.code.slice('correction_letter.'.length)];
      if (copy !== undefined) return copy;
    }
    if (err.status === 401) return t.letters.sessionExpired;
    if (isRoleForbidden(err)) return t.letters.forbidden;
    if (err.status === 429) return t.letters.rateLimited;
    if (err.status === 413) return t.letters.refusals.too_large ?? fallback;
    if (err.status === 415) return t.letters.refusals.unsupported_media_type ?? fallback;
  }
  return fallback;
}
