// Pure derivations for the field-worker screens — Story 13.1a (Task 9.2; AC11). An API error code → the guidance the screen shows,
// and where a field error belongs; the code spelled digit by digit for a screen reader (AD13). No React, no fetch.

import { ApiError } from '../../api/client.js';
import { resolveEn as t } from './i18n-en.js';

/** The register form's fields an error can point at. */
export type RegisterField = 'name' | 'mobile' | 'district';

export interface Guidance {
  /** The sentence to show. */
  readonly text: string;
  /** The field it belongs to, when it belongs to one (`aria-invalid` + `aria-describedby`). */
  readonly field?: RegisterField;
  /** A 403 — the page shows its "no access" line. */
  readonly noAccess?: boolean;
  /** A 401 — the page goes to sign-in. */
  readonly signIn?: boolean;
  /** Retrying the SAME attempt can help (keep the key). */
  readonly retryable?: boolean;
}

/** Where the admin was when the server refused — the 403 line says what THAT action needs (review CR11). */
export type Surface = 'register' | 'approvals' | 'find' | 'code';

const NO_ACCESS_KEY: Record<Surface, string> = {
  register: 'fw.noAccessRegister',
  approvals: 'fw.noAccess',
  find: 'fw.noAccessFind',
  code: 'fw.noAccessCode',
};

const BY_CODE: Record<string, () => Guidance> = {
  'field_worker.idempotency_key_required': () => ({ text: t('fw.err.keyRequired'), retryable: true }),
  'field_worker.idempotency_in_progress': () => ({ text: t('fw.err.inProgress'), retryable: true }),
  'field_worker.mobile_already_registered': () => ({ text: t('fw.err.mobileTaken'), field: 'mobile' }),
  'field_worker.name_invalid': () => ({ text: t('fw.err.nameInvalid'), field: 'name' }),
  'field_worker.mobile_invalid': () => ({ text: t('fw.err.mobileInvalid'), field: 'mobile' }),
  'field_worker.district_unknown': () => ({ text: t('fw.err.districtUnknown'), field: 'district' }),
  'field_worker.code_allocation_exhausted': () => ({ text: t('fw.err.codesExhausted'), retryable: true }),
  'admin.display_name_missing': () => ({ text: t('fw.err.displayName') }),
  'request.validation': () => ({ text: t('fw.err.validation') }),
  'field_worker.illegal_transition': () => ({ text: t('fw.approvals.alreadyDone') }),
  'field_worker.authorization_stale': () => ({ text: t('fw.approvals.moved') }),
  'field_worker.decrypt_unavailable': () => ({ text: t('fw.list.keyUnavailable'), retryable: true }),
  'field_worker.identity_unreadable': () => ({ text: t('fw.list.unreadable') }),
  'field_worker.not_found': () => ({ text: t('fw.err.notFound') }),
  'field_worker.stream_conflict': () => ({ text: t('fw.err.changedMeanwhile'), retryable: true }),
  'field_worker.kyc_already_completed': () => ({ text: t('fw.approvals.alreadyDone') }),
  'field_worker.kyc_not_completed': () => ({ text: t('fw.err.kycNotDone') }),
  'field_worker.cursor_invalid': () => ({ text: t('fw.err.cursorInvalid'), retryable: true }),
};

/** The guidance for any caught error. An unknown code still says something useful and names the code. */
export function fieldWorkerGuidance(error: unknown, surface: Surface = 'approvals'): Guidance {
  if (error instanceof ApiError) {
    if (error.status === 401) return { text: t('fw.signIn'), signIn: true };
    if (error.status === 403) return { text: t(NO_ACCESS_KEY[surface]), noAccess: true };
    // A 429 carries the rate limiter's own code, not ours: the status decides, and waiting is the cure.
    if (error.status === 429) return { text: t('fw.err.rateLimited'), retryable: true };
    const known = BY_CODE[error.code];
    if (known !== undefined) return known();
    return { text: t('fw.unknownError', { code: error.code }), retryable: error.status >= 500 };
  }
  // A network failure (no status) — the same attempt may be retried with the same key.
  return { text: t('fw.unknownError', { code: 'network' }), retryable: true };
}

/** True when the error is a 401 — the screen then goes to sign-in (`useSignInRedirect`). */
export function needsSignIn(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}

/** The 409 `code_not_available` copy, by the worker's state (AD13). */
export function codeUnavailableText(error: unknown): string | null {
  if (!(error instanceof ApiError) || error.code !== 'field_worker.code_not_available') return null;
  const state = (error.details as { current_state?: unknown } | undefined)?.current_state;
  if (state === 'pending_kyc') return t('fw.code.notApproved');
  if (state === 'suspended') return t('fw.code.suspended');
  if (state === 'terminated') return t('fw.code.ended');
  return t('fw.code.unavailable');
}

/** "4 2 7 1 9 0" — the accessible label reads the code one digit at a time (AD13). */
export function spellDigits(code: string): string {
  return [...code].join(' ');
}

/** A worker state's label. */
export function stateLabel(state: string): string {
  return t(`fw.state.${state}`);
}

/** A server instant as an India date (the console's convention), e.g. "4 Nov 2026". */
export function formatIstDate(iso: string): string {
  return new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso));
}
