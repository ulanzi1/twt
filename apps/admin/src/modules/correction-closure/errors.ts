// The correction closure's ONE error classifier (Story 6.19c) — the 6.19b `correctionLetterRefusalText` shape. The
// server's refusal messages are already the plain words AC8c asks for, so a known refusal code shows the server's
// message; then the STATUS — 401 (the session), a role/scope 403 (⛔ the step-up signal), 429; anything else is the
// caller's `fallback`.

import { ApiError } from '../../api/client.js';
import { isRoleForbidden } from '../correction-chase/errors.js';
import { correctionClosureEn as t } from './i18n-en.js';

const REFUSAL_PREFIXES = ['closure.', 'closure_letter.', 'direction.', 'cycle_freeze.escalated', 'refile_confirmation.', 'must_act.'];

export function closureErrorText(err: unknown, fallback: string = t.errors.saveFailed): string {
  if (err instanceof ApiError) {
    if (REFUSAL_PREFIXES.some((p) => err.code.startsWith(p)) && err.message.trim() !== '') return err.message;
    if (err.status === 401) return t.errors.sessionExpired;
    if (isRoleForbidden(err)) return t.errors.forbidden;
    if (err.status === 429) return t.errors.rateLimited;
  }
  return fallback;
}
