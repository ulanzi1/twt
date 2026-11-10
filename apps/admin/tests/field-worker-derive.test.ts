// Story 13.1a (Task 9.3; AC11) — the field-worker screens' pure derivations and their copy, through the REAL resolver
// ([[feedback_stub_must_call_not_transcribe]]): every key resolves with no stray brace; every registration / approval / read code
// maps to its guidance (the field it belongs to, retryable or not); the code's spelled label; an unknown code still names itself.

import { FIELD_WORKER_EVENT_TYPES, FIELD_WORKER_NOTICE_KINDS, FIELD_WORKER_REASON_CODES } from '@twt/contracts';
import { describe, expect, it } from 'vitest';

import { ApiError } from '../src/api/client.js';
import {
  actGuidance,
  codeSmsLine,
  codeUnavailableText,
  fieldWorkerGuidance,
  defaultEndDate,
  istDateOf,
  istTodayInBrowser,
  needsSignIn,
  noticeText,
  noticeViewRequestId,
  reasonLabel,
  refusalLabel,
  requestDetailGuidance,
  requestGuidance,
  requestStateLabel,
  spellDigits,
  stateLabel,
  type Surface,
} from '../src/modules/field-workers/derive.js';
import { FIELD_WORKER_EN_KEYS, resolveEn as t } from '../src/modules/field-workers/i18n-en.js';

describe('the copy (i18n-en.ts)', () => {
  it('every key resolves with its parameters and leaves no stray brace', () => {
    expect(FIELD_WORKER_EN_KEYS.length).toBeGreaterThan(40);
    // Story 13.1c's keys add `district`, `role`, `from` and `to`; Story 13.1d's `count` and `state`.
    const params = { n: 3, name: 'Asha', id: 'x', date: '4 Nov 2026', code: 'c', spelled: '1 2 3', reason: 'because', seconds: 60, district: 'Gaya', role: 'District Admin', from: 'Patna', to: 'Gaya', count: 2, state: 'Active' };
    for (const key of FIELD_WORKER_EN_KEYS) {
      const text = t(key, params);
      expect(text, key).not.toMatch(/[{}]/);
      expect(text.length, key).toBeGreaterThan(0);
    }
  });

  // Story 13.1c (AD8): the finder now lists the workers of the chosen STATUS (Active by default), so the intro names the status choice.
  it('the finder’s copy (CR1, -448; 13.1c AD8): "Check details" is a key of its own; the intro names the status choice, puts the details before the code and says each look is recorded', () => {
    expect(FIELD_WORKER_EN_KEYS).toContain('fw.find.check');
    expect(t('fw.find.check')).toBe('Check details');
    const intro = t('fw.find.intro');
    expect(intro).toMatch(/a status/);
    expect(intro).toMatch(/Active/);
    expect(intro).toMatch(/recorded/);
    expect(intro.indexOf('details')).toBeGreaterThan(-1);
    expect(intro.indexOf('details')).toBeLessThan(intro.indexOf('code'));
    // The old wording sent the officer straight to the code.
    expect(intro).not.toMatch(/^Choose a district to see its active workers\. Show a worker/);
  });

  it('an unknown key or a missing parameter THROWS (never a key-as-text page)', () => {
    expect(() => t('fw.nope')).toThrow(/unknown key/);
    expect(() => t('fw.approvals.approved')).toThrow(/needs the parameter 'name'/);
  });
});

describe('Story 13.1b (AD12, Q-7) — the code SMS line, per value', () => {
  it.each([
    ['sending', 'Code SMS: sending'],
    ['sent', 'Code SMS: sent, not yet confirmed'],
    ['delivered', 'Code SMS: delivered'],
    // Story 13.1c AD10 (a) (13.1b C7 / CB9) — a suspended or ended worker's by-hand read answers 409, so the tail is conditional.
    ['not_delivered', 'Code SMS not delivered - if the worker is active, give the code by hand when they ask'],
    ['not_confirmed', 'Code SMS outcome unknown, it may have arrived - if the worker is active, give the code by hand when they ask'],
  ] as const)('%s reads as AD12 writes it (as 13.1c AD10 (a) reworded the last two)', (status, line) => {
    expect(codeSmsLine(status)).toBe(line);
  });

  it('`null` renders nothing', () => {
    expect(codeSmsLine(null)).toBeNull();
  });

  it('⭐ TR13 — `undefined` is REFUSED: a fixture missing the key must fail, not pass as `null`', () => {
    expect(() => codeSmsLine(undefined as unknown as null)).toThrow(/no code_sms_status/);
  });

  it('⭐ `not_confirmed` does not state as fact what nobody knows; `not_delivered` does not say "may have"', () => {
    expect(codeSmsLine('not_confirmed')).toMatch(/may have arrived/);
    expect(codeSmsLine('not_delivered')).not.toMatch(/may have/);
  });

  it('the approval message stays true while the SMS is dark: it names no text as sent', () => {
    expect(t('fw.approvals.approved', { name: 'Asha' })).toBe('Asha is approved and active. Find a worker shows whether their code text arrived.');
  });
});

describe('fieldWorkerGuidance — every code of AC11 (a), (b), (c)', () => {
  const g = (status: number, code: string, details?: unknown) => fieldWorkerGuidance(new ApiError(status, code, 'server words', details));

  it.each<[number, string, string, string | undefined, boolean]>([
    [400, 'field_worker.idempotency_key_required', 'fw.err.keyRequired', undefined, true],
    [409, 'field_worker.idempotency_in_progress', 'fw.err.inProgress', undefined, true],
    [409, 'field_worker.mobile_already_registered', 'fw.err.mobileTaken', 'mobile', false],
    [422, 'field_worker.name_invalid', 'fw.err.nameInvalid', 'name', false],
    [422, 'field_worker.mobile_invalid', 'fw.err.mobileInvalid', 'mobile', false],
    [422, 'field_worker.district_unknown', 'fw.err.districtUnknown', 'district', false],
    [503, 'field_worker.code_allocation_exhausted', 'fw.err.codesExhausted', undefined, true],
    [409, 'admin.display_name_missing', 'fw.err.displayName', undefined, false],
    [409, 'field_worker.illegal_transition', 'fw.approvals.alreadyDone', undefined, false],
    [409, 'field_worker.authorization_stale', 'fw.approvals.moved', undefined, false],
    [503, 'field_worker.decrypt_unavailable', 'fw.list.keyUnavailable', undefined, true],
    [500, 'field_worker.identity_unreadable', 'fw.list.unreadable', undefined, false],
    // Review CR11 — the codes the screens could not name (the server's own words never reach the page).
    [404, 'field_worker.not_found', 'fw.err.notFound', undefined, false],
    [409, 'field_worker.stream_conflict', 'fw.err.changedMeanwhile', undefined, true],
    [409, 'field_worker.kyc_already_completed', 'fw.approvals.alreadyDone', undefined, false],
    [409, 'field_worker.kyc_not_completed', 'fw.err.kycNotDone', undefined, false],
    [400, 'field_worker.cursor_invalid', 'fw.err.cursorInvalid', undefined, false],
    // A 429 carries the rate limiter's own code (or `http.429`): the STATUS decides, and it is retryable.
    [429, 'http.429', 'fw.err.rateLimited', undefined, true],
    [429, 'rate_limit.exceeded', 'fw.err.rateLimited', undefined, true],
  ])('%i %s', (status, code, key, field, retryable) => {
    const out = g(status, code);
    expect(out.text).toBe(t(key));
    expect(out.field).toBe(field);
    expect(out.retryable === true).toBe(retryable);
  });

  it('403 ⇒ the no-access line; 401 ⇒ sign in; an unknown code names itself; a network failure is retryable', () => {
    expect(g(403, 'auth.forbidden')).toMatchObject({ noAccess: true, text: t('fw.noAccess') });
    expect(g(401, 'auth.session_required')).toMatchObject({ signIn: true });
    expect(g(500, 'something.new').text).toContain('something.new');
    expect(g(500, 'something.new').retryable).toBe(true);
    expect(fieldWorkerGuidance(new TypeError('Failed to fetch'))).toMatchObject({ retryable: true });
  });
});

describe('the 403 line depends on the screen (review CR11)', () => {
  const forbidden = new ApiError(403, 'auth.forbidden', 'no');
  const KEYS: Record<Surface, string> = {
    register: 'fw.noAccessRegister',
    approvals: 'fw.noAccess',
    find: 'fw.noAccessFind',
    code: 'fw.noAccessCode',
    history: 'fw.history.noAccess',
    requests: 'fw.requests.detail.noAccess',
  };

  it.each(Object.entries(KEYS))('%s ⇒ %s, and it is a no-access guidance', (surface, key) => {
    expect(fieldWorkerGuidance(forbidden, surface as Surface)).toMatchObject({ noAccess: true, text: t(key) });
  });

  it('the six lines are six different sentences, and none of the non-approval ones sends the admin to "approving"', () => {
    const texts = Object.values(KEYS).map((k) => t(k));
    expect(new Set(texts).size).toBe(6);
    for (const key of ['fw.noAccessRegister', 'fw.noAccessFind', 'fw.noAccessCode', 'fw.history.noAccess', 'fw.requests.detail.noAccess']) expect(t(key)).not.toMatch(/approv/i);
  });

  it('"Press Register again" never reaches an approve: the key-required line names no screen', () => {
    expect(t('fw.err.keyRequired')).not.toMatch(/register/i);
  });
});

describe('needsSignIn', () => {
  it('is true for a 401 only', () => {
    expect(needsSignIn(new ApiError(401, 'auth.session_required', 'x'))).toBe(true);
    expect(needsSignIn(new ApiError(403, 'auth.forbidden', 'x'))).toBe(false);
    expect(needsSignIn(new TypeError('Failed to fetch'))).toBe(false);
    expect(needsSignIn(null)).toBe(false);
  });
});

describe('the code', () => {
  it('codeUnavailableText — by the worker’s state; null for any other error', () => {
    const e = (state: string) => new ApiError(409, 'field_worker.code_not_available', 'x', { current_state: state });
    expect(codeUnavailableText(e('pending_kyc'))).toBe(t('fw.code.notApproved'));
    expect(codeUnavailableText(e('suspended'))).toBe(t('fw.code.suspended'));
    expect(codeUnavailableText(e('terminated'))).toBe(t('fw.code.ended'));
    expect(codeUnavailableText(e('weird'))).toBe(t('fw.code.unavailable'));
    expect(codeUnavailableText(new ApiError(403, 'auth.forbidden', 'x'))).toBeNull();
  });

  it('spellDigits reads a code one digit at a time; stateLabel names each state', () => {
    expect(spellDigits('042719')).toBe('0 4 2 7 1 9');
    expect(['pending_kyc', 'active', 'suspended', 'terminated'].map(stateLabel)).toEqual(['Awaiting approval', 'Active', 'Suspended', 'Ended']);
  });
});

// ── Story 13.1c, review round 1 ──

describe('the India day (AD8: the End date defaults to the IST day of the browser) - review CR24', () => {
  it('istTodayInBrowser is the IST calendar day, ⛔ the browser’s own or UTC: the day turns over at 18:30 UTC', () => {
    expect(istTodayInBrowser(new Date('2026-11-06T18:29:59.000Z'))).toBe('2026-11-06');
    expect(istTodayInBrowser(new Date('2026-11-06T18:30:00.000Z'))).toBe('2026-11-07');
    expect(istTodayInBrowser(new Date('2026-12-31T20:00:00.000Z'))).toBe('2027-01-01');
  });

  it('PR7: the End date defaults to today in India, but never before the registration day (a browser clock behind the server’s)', () => {
    const now = new Date('2026-11-06T10:00:00.000Z'); // 6 Nov, India
    expect(defaultEndDate('2026-11-04T05:00:00.000Z', now)).toBe('2026-11-06');
    expect(defaultEndDate('2026-11-06T04:00:00.000Z', now)).toBe('2026-11-06'); // registered today
    expect(defaultEndDate('2026-11-06T20:00:00.000Z', now)).toBe('2026-11-07'); // registered "tomorrow" by this clock: the floor wins
  });

  it('istDateOf reads an instant (the registration instant bounds the End date from below)', () => {
    expect(istDateOf('2026-11-04T05:00:00.000Z')).toBe('2026-11-04');
    expect(istDateOf('2026-11-04T19:00:00.000Z')).toBe('2026-11-05');
  });
});

describe('every label the history and the acts can show exists (the resolver throws on a missing key) - review CR31', () => {
  it('a label for every reason code and for every event type of the contract', () => {
    for (const code of FIELD_WORKER_REASON_CODES) expect(() => reasonLabel(code), code).not.toThrow();
    for (const type of FIELD_WORKER_EVENT_TYPES) expect(() => t(`fw.history.event.${type}`), type).not.toThrow();
  });

  it('the labels are the words the Panel and AD8 chose, never a code (by code - the order of the contract list is not pinned)', () => {
    expect(Object.fromEntries(FIELD_WORKER_REASON_CODES.map((c) => [c, reasonLabel(c)]))).toEqual({
      under_review: 'Under review',
      at_worker_request: 'At the worker’s request',
      left_voluntarily: 'Left',
      inactive: 'Stopped working',
      registered_in_error: 'Registered by mistake',
      reassigned: 'Reassigned by the Trust',
      died: 'Died',
    });
  });
});

describe('an act’s 409s that say the panel is out of date are marked `stale` (the acts are withdrawn)', () => {
  it.each([
    ['field_worker.authorization_stale', 'This worker was moved by someone else while you were working. Reload to see their district.'],
    ['field_worker.illegal_transition', 'This worker’s status has changed since you opened them.'],
  ])('%s', (code, text) => {
    expect(actGuidance(new ApiError(409, code, 'x'), 'suspend')).toEqual({ text, stale: true });
  });

  it('a 403, a 5xx and a network failure are not', () => {
    expect(actGuidance(new ApiError(403, 'authz.forbidden', 'x'), 'end').stale).toBeUndefined();
    expect(actGuidance(new ApiError(503, 'down', 'x'), 'end').stale).toBeUndefined();
    expect(actGuidance(new TypeError('Failed to fetch'), 'end').stale).toBeUndefined();
  });
});

// Story 13.1d (AD10) — the move requests' guidance and labels, through the REAL resolver.
describe('Story 13.1d — move requests', () => {
  it('every refusal reason, request state, notice kind and request event has its label (the contract tuples, walked)', async () => {
    const c = await import('@twt/contracts');
    for (const r of c.FIELD_WORKER_MOVE_REFUSAL_REASONS) expect(refusalLabel(r), r).not.toBe(r);
    for (const s of c.FIELD_WORKER_MOVE_REQUEST_STATES) expect(requestStateLabel(s), s).toBeTruthy();
    for (const k of c.FIELD_WORKER_NOTICE_KINDS) {
      expect(noticeText({ kind: k, from_district: 'Patna', to_district: 'Gaya', refusal_reason: k === 'move_request_refused' || k === 'move_request_refused_admin' ? 'no_capacity' : null }), k).toContain('Patna');
    }
    for (const e of c.FIELD_WORKER_MOVE_REQUEST_EVENT_TYPES) expect(t(`fw.requests.event.${e}`), e).toBeTruthy();
  });

  it('the accepted notice reminds the opener "Tell the worker." (-459 Q3 A); a refused one names the reason’s LABEL, never its code', () => {
    expect(noticeText({ kind: 'move_request_accepted', from_district: 'Patna', to_district: 'Gaya', refusal_reason: null })).toMatch(/Tell the worker\.$/);
    const refused = noticeText({ kind: 'move_request_refused', from_district: 'Patna', to_district: 'Gaya', refusal_reason: 'work_not_needed_here' });
    expect(refused).toContain('There is no work for them in the district asked');
    expect(refused).not.toContain('work_not_needed_here');
  });

  // CR41 A (decision `2026-11-10-461` item 2) — the opener is reminded on a REFUSAL too (-459 Q3 A); the Pariwar Admins' own kind is not.
  it('the OPENER’s refused notice ends "Tell the worker."; the Pariwar Admins’ refused notice carries the reason and ⛔ the reminder', () => {
    const facts = { from_district: 'Patna', to_district: 'Gaya', refusal_reason: 'no_capacity' };
    const opener = noticeText({ kind: 'move_request_refused', ...facts });
    const admin = noticeText({ kind: 'move_request_refused_admin', ...facts });
    expect(opener).toMatch(/Tell the worker\.$/);
    expect(opener).toContain(t('fw.notices.reason.no_capacity'));
    expect(admin).toContain(t('fw.notices.reason.no_capacity'));
    expect(admin).not.toMatch(/Tell the worker/);
    expect(admin).toMatch(/^A request was refused: Patna to Gaya\./);
  });

  // CR49 — the refuser's own labels read "talk to me", which names no one to the OPENER and the Pariwar Admins who read the notice.
  it('a refusal NOTICE words every reason for its readers — ⛔ the refuser’s first-person labels — and has one for each reason of the contract', async () => {
    const c = await import('@twt/contracts');
    for (const kind of ['move_request_refused', 'move_request_refused_admin']) {
      for (const r of c.FIELD_WORKER_MOVE_REFUSAL_REASONS) {
        const text = noticeText({ kind, from_district: 'Patna', to_district: 'Gaya', refusal_reason: r });
        expect(text, `${kind} ${r}`).not.toMatch(/talk to me/);
        expect(text, `${kind} ${r}`).not.toMatch(new RegExp(`\\b${r}\\b`)); // never the CODE (as a word: "Another" is not "other")
        expect(text, `${kind} ${r}`).toContain(t(`fw.notices.reason.${r}`));
      }
    }
    expect(refusalLabel('other')).toMatch(/talk to me/); // the REFUSER's own form keeps its wording
  });

  // CR46 — the shared rows are the register form's and the approvals page's; an act here says what happened in ITS words.
  it('an accept answered 422 district_unknown says nothing changed and offers refusing; "Ask" on a worker ended or moved meanwhile is `stale` in its own words; a lost race is `stale`', () => {
    const accept = requestGuidance(new ApiError(422, 'field_worker.district_unknown', 'x'), 'accept');
    expect(accept.text).toBe(t('fw.requests.acceptDistrictUnknown'));
    expect(accept.text).toMatch(/Nothing has changed/);
    expect(accept.text).toMatch(/refuse/i);
    expect(accept.field).toBeUndefined(); // there is no field to correct
    // The register form's line is unchanged where it belongs.
    expect(fieldWorkerGuidance(new ApiError(422, 'field_worker.district_unknown', 'x'))).toMatchObject({ text: t('fw.err.districtUnknown'), field: 'district' });
    expect(requestGuidance(new ApiError(409, 'field_worker.illegal_transition', 'x'), 'ask')).toMatchObject({ text: t('fw.ask.workerEnded'), stale: true });
    expect(requestGuidance(new ApiError(409, 'field_worker.authorization_stale', 'x'), 'ask')).toMatchObject({ text: t('fw.ask.moved'), stale: true });
    expect(requestGuidance(new ApiError(404, 'field_worker.move_request_not_found', 'x'), 'accept')).toMatchObject({ text: t('fw.requests.gone'), stale: true });
    // RP-3 — a 404 is NOT a 403: `noAccess` is the flag its consumers read as "a role sentence" (the requests page, `WorkerList`).
    const noPariwar = requestGuidance(new ApiError(404, 'pariwar.not_found', 'x'), 'accept');
    expect(noPariwar.text).toBe(t('fw.err.noPariwar'));
    expect(noPariwar.noAccess).toBeUndefined();
    expect(fieldWorkerGuidance(new ApiError(404, 'pariwar.not_found', 'x'), 'find').noAccess).toBeUndefined();
    expect(fieldWorkerGuidance(new ApiError(403, 'authz.forbidden', 'x'), 'find').noAccess).toBe(true); // CONTROL: a 403 still is
    expect(t('fw.ask.workerEnded')).not.toMatch(/approv/i);
  });

  // RP-5 — the ACT's line says "the list has been refreshed" (the hook refreshes on it); a DETAIL read that finds no request says only that.
  it('a detail read that finds no request is `gone` and claims no refresh; every other detail error is the requests surface’s', () => {
    const gone = requestDetailGuidance(new ApiError(404, 'field_worker.move_request_not_found', 'x'));
    expect(gone).toMatchObject({ text: t('fw.requests.detail.gone'), gone: true });
    expect(gone.text).not.toMatch(/refreshed/i);
    expect(requestGuidance(new ApiError(404, 'field_worker.move_request_not_found', 'x'), 'accept').text).toMatch(/refreshed/); // CONTROL: the act's line does
    expect(requestDetailGuidance(new ApiError(403, 'authz.forbidden', 'x'))).toMatchObject({ text: t('fw.requests.detail.noAccess'), noAccess: true });
    expect(requestDetailGuidance(new ApiError(401, 'auth.session_required', 'x'))).toMatchObject({ signIn: true });
    expect(requestDetailGuidance(new ApiError(503, 'http.503', 'x'))).toMatchObject({ retryable: true });
    expect(requestDetailGuidance(new ApiError(503, 'http.503', 'x')).gone).toBeUndefined();
  });

  // RP-7 — the one notice kind whose recipients need not be an end of the request it names has no request to open.
  it('`noticeViewRequestId`: no request ⇒ none; `moved_by_pariwar_admin` ⇒ none; every other kind opens its request', () => {
    expect(noticeViewRequestId({ kind: 'move_request_accepted', move_request_id: null })).toBeNull();
    for (const kind of FIELD_WORKER_NOTICE_KINDS) {
      expect(noticeViewRequestId({ kind, move_request_id: 'r1' }), kind).toBe(kind === 'moved_by_pariwar_admin' ? null : 'r1');
    }
  });

  it('the detail and notices read with the REQUESTS surface: a 403 does not send the officer to "approving"', () => {
    const g = fieldWorkerGuidance(new ApiError(403, 'authz.forbidden', 'x'), 'requests');
    expect(g).toMatchObject({ text: t('fw.requests.detail.noAccess'), noAccess: true });
    expect(g.text).not.toMatch(/approv/i);
    expect(fieldWorkerGuidance(new ApiError(401, 'auth.session_required', 'x'), 'requests')).toMatchObject({ signIn: true });
  });

  it('a 403 gives each act its own line; the 409s map to their guidance (a request moved on is `stale`)', () => {
    expect(requestGuidance(new ApiError(403, 'authz.forbidden', 'x'), 'ask')).toMatchObject({ text: t('fw.ask.noAccess'), noAccess: true });
    for (const act of ['accept', 'refuse', 'withdraw', 'close'] as const) {
      expect(requestGuidance(new ApiError(403, 'authz.forbidden', 'x'), act).text).toBe(t(`fw.requests.noAccess.${act}`));
    }
    expect(requestGuidance(new ApiError(409, 'field_worker.move_request_not_open', 'x'), 'accept')).toMatchObject({ text: t('fw.requests.stale'), stale: true });
    expect(requestGuidance(new ApiError(409, 'field_worker.move_request_same_officer', 'x'), 'accept').text).toBe(t('fw.requests.sameOfficer'));
    expect(requestGuidance(new ApiError(409, 'field_worker.move_request_not_opener', 'x'), 'withdraw').text).toBe(t('fw.requests.notOpener'));
    expect(requestGuidance(new ApiError(409, 'field_worker.move_request_open', 'x'), 'ask').text).toBe(t('fw.ask.open'));
  });
});
