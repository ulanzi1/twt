// Story 13.1a (Task 9.3; AC11) — the field-worker screens' pure derivations and their copy, through the REAL resolver
// ([[feedback_stub_must_call_not_transcribe]]): every key resolves with no stray brace; every registration / approval / read code
// maps to its guidance (the field it belongs to, retryable or not); the code's spelled label; an unknown code still names itself.

import { describe, expect, it } from 'vitest';

import { ApiError } from '../src/api/client.js';
import { codeUnavailableText, fieldWorkerGuidance, spellDigits, stateLabel } from '../src/modules/field-workers/derive.js';
import { FIELD_WORKER_EN_KEYS, resolveEn as t } from '../src/modules/field-workers/i18n-en.js';

describe('the copy (i18n-en.ts)', () => {
  it('every key resolves with its parameters and leaves no stray brace', () => {
    expect(FIELD_WORKER_EN_KEYS.length).toBeGreaterThan(40);
    const params = { n: 3, name: 'Asha', id: 'x', date: '4 Nov 2026', code: 'c', spelled: '1 2 3' };
    for (const key of FIELD_WORKER_EN_KEYS) {
      const text = t(key, params);
      expect(text, key).not.toMatch(/[{}]/);
      expect(text.length, key).toBeGreaterThan(0);
    }
  });

  it('an unknown key or a missing parameter THROWS (never a key-as-text page)', () => {
    expect(() => t('fw.nope')).toThrow(/unknown key/);
    expect(() => t('fw.approvals.approved')).toThrow(/needs the parameter 'name'/);
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
