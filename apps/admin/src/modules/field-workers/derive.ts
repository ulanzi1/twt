// Pure derivations for the field-worker screens — Story 13.1a (Task 9.2; AC11). An API error code → the guidance the screen shows,
// and where a field error belongs; the code spelled digit by digit for a screen reader (AD13). No React, no fetch.

import type { FieldWorkerCodeSmsStatus } from '@twt/contracts';

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
  /** The same request can never work; loading the list from its first page can (a cursor the server refused). */
  readonly reload?: boolean;
  /** An act's 409 that says the panel's own copy of the worker is out of date (moved, or the status changed): reopen the worker (review CR23). */
  readonly stale?: boolean;
  /** What was asked for is gone: there is nothing to try again (a request read that finds no request). */
  readonly gone?: boolean;
}

/** Where the admin was when the server refused — the 403 line says what THAT action needs (review CR11). */
export type Surface = 'register' | 'approvals' | 'find' | 'code' | 'history' | 'requests' | 'appeals';

const NO_ACCESS_KEY: Record<Surface, string> = {
  register: 'fw.noAccessRegister',
  approvals: 'fw.noAccess',
  find: 'fw.noAccessFind',
  code: 'fw.noAccessCode',
  history: 'fw.history.noAccess',
  requests: 'fw.requests.detail.noAccess',
  appeals: 'fw.appeals.noAccess', // Story 13.1f
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
  'field_worker.cursor_invalid': () => ({ text: t('fw.err.cursorInvalid'), reload: true }),
  // Story 13.1c — reachable from the acts (a move to the same district; an ending date outside the IST bounds).
  'field_worker.district_unchanged': () => ({ text: t('fw.err.districtUnchanged') }),
  'field_worker.ended_on_invalid': () => ({ text: t('fw.err.endedOnInvalid') }),
  // Story 13.1d — the move requests (AD6).
  'field_worker.move_request_open': () => ({ text: t('fw.ask.open') }),
  'field_worker.move_request_not_open': () => ({ text: t('fw.requests.stale'), stale: true }),
  'field_worker.move_request_same_officer': () => ({ text: t('fw.requests.sameOfficer') }),
  'field_worker.move_request_not_opener': () => ({ text: t('fw.requests.notOpener') }),
  // A lost race (the request is gone): the list is refreshed and the line says so (code review CR46).
  'field_worker.move_request_not_found': () => ({ text: t('fw.requests.gone'), stale: true }),
  // No grant for this Pariwar, or no such Pariwar (a 404) — in every route's contract; the shared fallback read "Something went wrong
  // (pariwar.not_found)". ⛔ NOT `noAccess`: that flag means a 403, and its consumers print a ROLE sentence for it — "choose a district you
  // manage" on the requests page, `noAccessText` on `WorkerList` (code review RP-3). It says what it is, in its own words.
  'pariwar.not_found': () => ({ text: t('fw.err.noPariwar') }),
  // Story 13.1f — the undo, the appeal and the link (AD14; `-465` Q6 B).
  'field_worker.ending_changed': () => ({ text: t('fw.err.endingChanged'), retryable: true }),
  // Code review round 2, R2A-2 — an End from a screen that is out of date: the acts are withdrawn and the panel re-read, as after a
  // `illegal_transition`; the line is the same existing one ("This worker's status has changed since you opened them").
  'field_worker.state_changed': () => ({ text: t('fw.actions.stateChanged'), stale: true }),
  'field_worker.number_registered_again': () => ({ text: t('fw.err.numberRegisteredAgain') }),
  'field_worker.appeal_refused_by_panel': () => ({ text: t('fw.err.appealRefusedByPanel') }),
  'field_worker.appeal_open': () => ({ text: t('fw.err.appealOpen') }),
  'field_worker.appeal_already_decided': () => ({ text: t('fw.err.appealAlreadyDecided') }),
  'field_worker.appeal_not_open': () => ({ text: t('fw.err.appealNotOpen'), stale: true }),
  'field_worker.appeal_wrong_hearer': () => ({ text: t('fw.err.appealWrongHearer') }),
  'field_worker.appeal_decider_is_ender': () => ({ text: t('fw.err.appealDeciderIsEnder') }),
  'field_worker.appeal_date_invalid': () => ({ text: t('fw.err.appealDateInvalid') }),
  'field_worker.appeal_not_found': () => ({ text: t('fw.err.appealNotFound'), stale: true }),
  'field_worker.link_invalid': () => ({ text: t('fw.err.linkInvalid') }),
};

/** Story 13.1d — the acts on a move request (AD10). */
export type RequestAct = 'ask' | 'accept' | 'refuse' | 'withdraw' | 'close';

/** A move-request act's refusal: its OWN no-access line (403), else the shared rows (a stale request: `stale`, the list refreshed). */
export function requestGuidance(error: unknown, act: RequestAct): Guidance {
  if (error instanceof ApiError) {
    if (error.status === 403) return { text: t(act === 'ask' ? 'fw.ask.noAccess' : `fw.requests.noAccess.${act}`), noAccess: true };
    // The shared rows are the register form's and the approvals page's: an act here says what happened in ITS words (code review CR46).
    // An acceptance moves the worker, so the destination is judged against the list NOW (CR23): nothing changed, and the officer can refuse.
    if (act === 'accept' && error.code === 'field_worker.district_unknown') return { text: t('fw.requests.acceptDistrictUnknown') };
    // "Ask to move" on a worker whose work ended, or who moved, meanwhile: the panel's own copy is out of date.
    if (act === 'ask' && error.code === 'field_worker.illegal_transition') return { text: t('fw.ask.workerEnded'), stale: true };
    if (act === 'ask' && error.code === 'field_worker.authorization_stale') return { text: t('fw.ask.moved'), stale: true };
  }
  return fieldWorkerGuidance(error);
}

/**
 * One request's DETAIL read. A request that is gone says only that: `fw.requests.gone` ("The list has been refreshed") is the ACT's line,
 * where the hook refreshes the lists, and nothing refreshes a list from a detail panel (code review RP-5); there is nothing to retry.
 */
export function requestDetailGuidance(error: unknown): Guidance {
  if (error instanceof ApiError && error.status !== 401 && error.status !== 403 && error.code === 'field_worker.move_request_not_found') {
    return { text: t('fw.requests.detail.gone'), gone: true };
  }
  return fieldWorkerGuidance(error, 'requests');
}

/** A refusal reason's label (never the code). */
export function refusalLabel(code: string): string {
  return t(`fw.refusal.${code}`);
}

/** A move request's state, as the lists show it. */
export function requestStateLabel(state: string): string {
  return t(`fw.requests.state.${state}`);
}

/**
 * One notice's sentence — districts and codes only (a notice carries no name). The reason is worded for the OPENER and the Pariwar Admins
 * who read it: the refuser's own labels ("talk to me") name no one here (code review CR49).
 */
export function noticeText(n: { kind: string; from_district: string; to_district: string; refusal_reason: string | null }): string {
  const base = { from: n.from_district, to: n.to_district };
  return n.kind === 'move_request_refused' || n.kind === 'move_request_refused_admin'
    ? t(`fw.notices.kind.${n.kind}`, { ...base, reason: n.refusal_reason === null ? t('fw.unknownError', { code: 'reason' }) : t(`fw.notices.reason.${n.refusal_reason}`) })
    : t(`fw.notices.kind.${n.kind}`, base);
}

/**
 * The request a notice's "View" opens, or `null` when it has none to open: a notice about no request, and `moved_by_pariwar_admin` — it goes
 * to the District Admins of the MOVE's two districts and names the request the move superseded, whose ends they need not hold (a move to a
 * third district): the detail's gate answers 403, so the button would promise what it cannot give (code review RP-7). Every other kind goes to
 * an end of its request or to a Pariwar Admin, who may read it.
 */
export function noticeViewRequestId(n: { kind: string; move_request_id: string | null }): string | null {
  return n.kind === 'moved_by_pariwar_admin' ? null : n.move_request_id;
}

/** Story 13.1c (AD8) — the four acts on an opened worker. */
export type WorkerAct = 'move' | 'suspend' | 'reactivate' | 'end' | 'undo';

/**
 * An act's refusal: its OWN no-access line (403), the AD8 "moved by someone else" line (409 `authorization_stale`), a "status
 * changed meanwhile" line (409 `illegal_transition` — the approvals' "already approved" copy would be wrong here); else the shared rows.
 */
export function actGuidance(error: unknown, act: WorkerAct): Guidance {
  if (error instanceof ApiError) {
    if (error.status === 403) return { text: t(`fw.actions.noAccess.${act}`), noAccess: true };
    if (error.code === 'field_worker.authorization_stale') return { text: t('fw.actions.moved'), stale: true };
    if (error.code === 'field_worker.illegal_transition') return { text: t('fw.actions.stateChanged'), stale: true };
  }
  return fieldWorkerGuidance(error);
}

/** Story 13.1f — the three writes of the appeal record. */
export type AppealAct = 'lodge' | 'decide' | 'withdraw';

/**
 * An appeal ACT's refusal (code review round 2, chunk D: R2D-4, R2D-5, R2D-8). The shared rows are wrong here, each for its own reason:
 * `illegal_transition` is the APPROVALS' "already approved" line; the read page's 403 line sends a Pariwar Admin to "ask a Pariwar Admin"
 * on an appeal the Panel hears; `number_registered_again` tells a hearer to "undo this ending", which an appeal's hearer may not (the
 * Panel cannot) and which would close the appeal instead of allowing it. `heardBy` is what the ROW knows (an appeal's `heard_by`, an
 * eligible candidate's `heard_by`); Find knows neither, so its lodge says something true of both hearers.
 *
 * `stale` is set for EXACTLY the codes whose refusal also refreshes the appeals (`fieldWorkerListIsStale`): the refresh unmounts or re-keys
 * the row or form that raised the line, so the SCREEN must say it somewhere that stays mounted (R2D-2).
 */
export function appealGuidance(error: unknown, ctx: { act: AppealAct; heardBy?: 'pariwar_admin' | 'trustee_panel' | null; fromList?: boolean }): Guidance {
  if (error instanceof ApiError) {
    if (error.status === 403) {
      const hearer = ctx.heardBy ?? null;
      if (ctx.act === 'lodge') return { text: t(`fw.appeals.noAccess.lodge.${hearer ?? 'unknown'}`), noAccess: true };
      return { text: t(hearer === null ? 'fw.appeals.noAccess' : `fw.appeals.noAccess.hear.${hearer}`), noAccess: true };
    }
    switch (error.code) {
      case 'field_worker.illegal_transition':
      case 'field_worker.authorization_stale':
        return { text: t('fw.err.appealWorkerChanged'), stale: true };
      case 'field_worker.ending_changed':
        // Only a lodge meets it (decide and withdraw name no ending version). Retryable: the ending's version is re-read - Find's identity, or the
        // eligible list, which re-keys the candidate's form - so the next attempt's body differs and `attemptKey` mints a NEW key. The eligible
        // list (`fromList`) shows no worker details, so its line says the LIST was refreshed (review R3-8).
        return { text: t(ctx.fromList === true ? 'fw.err.endingChangedList' : 'fw.err.endingChanged'), retryable: true, stale: true };
      case 'field_worker.appeal_open':
        return { text: `${t('fw.err.appealOpen')} ${t('fw.err.listRefreshed')}`, stale: true };
      case 'field_worker.appeal_already_decided':
        return { text: `${t('fw.err.appealAlreadyDecided')} ${t('fw.err.listRefreshed')}`, stale: true };
      case 'field_worker.number_registered_again':
        return { text: t('fw.err.appealNumberRegisteredAgain') };
    }
  }
  return fieldWorkerGuidance(error, 'appeals');
}

/**
 * The history's refusal. A 409 `authorization_stale` there is the log handler's re-read losing a race with a move (`log-handlers.ts`):
 * the gate re-reads the district on the next try, so it is RETRIED, ⛔ the Approvals page's "Reload and try again" (review R2-6).
 */
export function historyGuidance(error: unknown): Guidance {
  if (error instanceof ApiError && error.code === 'field_worker.authorization_stale') return { text: t('fw.history.moved'), retryable: true };
  return fieldWorkerGuidance(error, 'history');
}

/** A reason code's label (never the code itself). */
export function reasonLabel(code: string): string {
  return t(`fw.reason.${code}`);
}

/** An officer's role, as the history shows it. */
export function roleLabel(role: string | null): string {
  // Story 13.1f — an appeal decided by the Panel is signed `trustee_panel`: shown, never "role not recorded".
  return role === 'district_admin' || role === 'pariwar_admin' || role === 'super_admin' || role === 'trustee_panel' ? t(`fw.role.${role}`) : t('fw.role.unknown');
}

/** The India calendar day (`YYYY-MM-DD`) of an instant. */
export function istDateOf(at: Date | string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(at));
}

/** Today's date in India (`YYYY-MM-DD`) on THIS browser's clock — the End form's default; the server judges the bounds. */
export function istTodayInBrowser(now: Date = new Date()): string {
  return istDateOf(now);
}

/**
 * The End date's default: today in India on this browser's clock, but never before the registration day (the control's `min`) — a
 * browser clock behind the server's would otherwise pre-fill a day the control itself refuses (review PR7).
 */
export function defaultEndDate(registeredAt: string, now: Date = new Date()): string {
  return istTodayNotBefore(istDateOf(registeredAt), now);
}

/**
 * Today in India on this browser's clock, but never before `floor` (a server day: the day an appeal was received, a registration day).
 * Code review round 3, R3-7: a browser clock behind the server's across IST midnight read "today" as a day BEFORE that server day, so a
 * date control defaulted below its own `min`, and its `max` (today) sat below the `min` too - no day could be chosen. Used for both the
 * default and the `max`, as `defaultEndDate` does for the End form; the server judges the real bounds.
 */
export function istTodayNotBefore(floor: string | undefined, now: Date = new Date()): string {
  const today = istTodayInBrowser(now);
  return floor !== undefined && today < floor ? floor : today;
}

/** A server instant as an India date and time, e.g. "7 Nov 2026, 4:05 pm". */
export function formatIstDateTime(iso: string): string {
  return new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(iso));
}

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

const CODE_SMS_KEY = {
  sending: 'fw.codeSms.sending',
  sent: 'fw.codeSms.sent',
  delivered: 'fw.codeSms.delivered',
  not_delivered: 'fw.codeSms.not_delivered',
  not_confirmed: 'fw.codeSms.not_confirmed',
} as const satisfies Record<FieldWorkerCodeSmsStatus, string>;

/**
 * What an officer reads about the worker's code text (Story 13.1b AD12); `null` renders nothing: a worker with no send row. TOTAL over the
 * enum (`satisfies`). ⛔ `undefined`: the admin tests mock the client, so a fixture missing the key would otherwise pass as `null` (TR13).
 */
export function codeSmsLine(status: FieldWorkerCodeSmsStatus | null): string | null {
  if (status === undefined) throw new Error('codeSmsLine: the list item has no code_sms_status');
  return status === null ? null : t(CODE_SMS_KEY[status]);
}

/** A server instant as an India date (the console's convention), e.g. "4 Nov 2026". */
export function formatIstDate(iso: string): string {
  return new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso));
}
