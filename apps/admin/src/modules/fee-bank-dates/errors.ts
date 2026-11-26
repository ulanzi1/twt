// Story 6.39a (DL11) — the words of a failed bank-date write. ⛔ A raw code on screen: each `fee_bank_date.<reason>` has its
// approved line; a 400 / 401 / 403 theirs. The step-up 403 never reaches here (the page holds the write first).

import { feeBankDateRefusalReasonOf } from '@twt/contracts';

import { ApiError } from '../../api/client.js';
import { feeBankDatesEn as t } from './i18n-en.js';

export function feeBankDateErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const reason = feeBankDateRefusalReasonOf(err.code);
    if (reason !== null && t.refused[reason]) return t.refused[reason]!;
    if (err.code === 'admin.display_name_missing') return t.refused.missing_display!;
    if (err.status === 401) return t.sessionExpired;
    if (err.status === 403) return t.forbidden;
    if (err.status === 400) return t.invalid;
  }
  return t.refusedGeneric;
}
