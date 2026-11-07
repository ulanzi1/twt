// Story 13.1a (Task 9.3; AC11) — the field-worker screens' pure derivations and their copy, through the REAL resolver
// ([[feedback_stub_must_call_not_transcribe]]): every key resolves with no stray brace; every registration / approval / read code
// maps to its guidance (the field it belongs to, retryable or not); the code's spelled label; an unknown code still names itself.

import { describe, expect, it } from 'vitest';

import { ApiError } from '../src/api/client.js';
import { codeSmsLine, codeUnavailableText, fieldWorkerGuidance, needsSignIn, spellDigits, stateLabel, type Surface } from '../src/modules/field-workers/derive.js';
import { FIELD_WORKER_EN_KEYS, resolveEn as t } from '../src/modules/field-workers/i18n-en.js';

describe('the copy (i18n-en.ts)', () => {
  it('every key resolves with its parameters and leaves no stray brace', () => {
    expect(FIELD_WORKER_EN_KEYS.length).toBeGreaterThan(40);
    // Story 13.1c's keys add `district`, `act`, `role`, `from` and `to`.
    const params = { n: 3, name: 'Asha', id: 'x', date: '4 Nov 2026', code: 'c', spelled: '1 2 3', reason: 'because', seconds: 60, district: 'Gaya', act: 'suspend', role: 'District Admin', from: 'Patna', to: 'Gaya' };
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
  };

  it.each(Object.entries(KEYS))('%s ⇒ %s, and it is a no-access guidance', (surface, key) => {
    expect(fieldWorkerGuidance(forbidden, surface as Surface)).toMatchObject({ noAccess: true, text: t(key) });
  });

  it('the five lines are five different sentences, and none of the non-approval ones sends the admin to "approving"', () => {
    const texts = Object.values(KEYS).map((k) => t(k));
    expect(new Set(texts).size).toBe(5);
    for (const key of ['fw.noAccessRegister', 'fw.noAccessFind', 'fw.noAccessCode', 'fw.history.noAccess']) expect(t(key)).not.toMatch(/approv/i);
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
