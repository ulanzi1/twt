// The certificate reminder's ONE error classifier (Story 6.19d) — the 6.19c `closureErrorText` shape. The server's
// refusal messages are already plain words, so a known refusal code shows the server's message; then the STATUS — 401
// (the session), a role/scope 403 (⛔ the step-up signal), 429, and a transport 413/415 that carries ⛔ no
// `certificate_letter.*` code (a proxy, the multipart limit — often no JSON body at all, matching the sibling
// `correctionLetterRefusalText`'s convention for the identical delivery-screenshot-upload scenario); anything else is
// the caller's `fallback`.

import { ApiError } from '../../api/client.js';
import { isRoleForbidden } from '../correction-chase/errors.js';
import { certificateRemindersEn as t } from './i18n-en.js';

export function certificateErrorText(err: unknown, fallback: string = t.errors.saveFailed): string {
  if (err instanceof ApiError) {
    if (err.code.startsWith('certificate_letter.') && err.message.trim() !== '') return err.message;
    if (err.status === 401) return t.errors.sessionExpired;
    if (isRoleForbidden(err)) return t.errors.forbidden;
    if (err.status === 429) return t.errors.rateLimited;
    if (err.status === 413) return t.errors.tooLarge;
    if (err.status === 415) return t.errors.unsupportedMediaType;
  }
  return fallback;
}
