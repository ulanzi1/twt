// The claim-correction SMS SEND — its fail-closed rules and the provider-result mapping (Story 6.19b, AC3, AC11b "the
// record" / "send safety"; `2026-09-29-269` §4/§5; T13). Mocked deps (⛔ no DB).
//   · a missing DLT template id, an unset helpline number, an unconfigured gateway ⇒ `error` + alarm — ⛔ never a
//     fixture `accepted`, ⛔ never a placeholder number;
//   · a KNOWN Secret Manager config fault (`INVALID_ARGUMENT`, `PERMISSION_DENIED`, `FAILED_PRECONDITION`,
//     `UNIMPLEMENTED`, `UNAUTHENTICATED`) ⇒ FINAL `error` + alarm (`config:secret_manager_<code>`); ANY other fault (an
//     outage, a quota spike, a socket error, a wrapped `cause`, ⛔ no code) ⇒ transient (retry); a send TIMEOUT ⇒
//     transient (`api_unavailable:timeout`);
//   · `invalid_number` → `rejected_invalid_number`; `carrier_reject` → `rejected_unreachable` (letter-eligible, ⛔ no
//     alarm); `dlt_template_not_approved` / `auth` / `unknown` → `error` + alarm, FINAL; `rate_limited` /
//     `api_unavailable` → transient.

import { SmsSendError, type SmsAppClient, type SmsMessagingHandle } from '@twt/channels';
import { describe, expect, it } from 'vitest';

import { correctionStaffPushAlert, sendClaimCorrectionSms } from '../src/scheduler/claim-correction-reminders.js';
import { classifySecretManagerFault } from '../src/scheduler/contribution-providers.js';

const PARIWAR = '11111111-1111-1111-1111-111111111111';
const CLAIM = '3f2a9c1e-0b4d-4e6f-8a1b-2c3d4e5f6a7b';

function client(send: SmsMessagingHandle['send'], configured = true): SmsAppClient & { sent: string[] } {
  const sent: string[] = [];
  return {
    sent,
    isConfigured: () => configured,
    messaging: () => ({
      send: (m) => {
        sent.push(m.body);
        return send(m);
      },
    }),
  };
}

const config = (overrides: Record<string, string | null> = {}) => async (key: string): Promise<string | null> => {
  if (key in overrides) return overrides[key]!;
  if (key.startsWith('sms.dlt.template_id.')) return 'TPL-123';
  if (key === `sms.claim_correction.helpline_number.${PARIWAR}`) return '+911800123456';
  return null;
};

const input = { message: 'reminder' as const, locale: 'en' as const, pariwarId: PARIWAR, claimCaseId: CLAIM, e164: '+919812345678' };

describe('sendClaimCorrectionSms — fail CLOSED (T13)', () => {
  it('⛔ a missing DLT template id ⇒ error + alarm, ⛔ no send', async () => {
    const c = client(() => Promise.resolve('gw'));
    const r = await sendClaimCorrectionSms(
      { smsAppClient: c, resolveConfig: config({ 'sms.dlt.template_id.claim_correction.reminder.en': null }) },
      input,
    );
    expect(r).toMatchObject({ kind: 'final', outcome: 'error', detail: 'config:dlt_template_id_missing', alarm: true });
    expect(c.sent).toEqual([]);
  });

  it('⛔ an unset helpline number for THIS Pariwar ⇒ error + alarm (⛔ never another Pariwar\'s, ⛔ never a default)', async () => {
    const c = client(() => Promise.resolve('gw'));
    const r = await sendClaimCorrectionSms(
      { smsAppClient: c, resolveConfig: config({ [`sms.claim_correction.helpline_number.${PARIWAR}`]: null }) },
      input,
    );
    expect(r).toMatchObject({ outcome: 'error', detail: 'config:helpline_number_missing' });
    expect(c.sent).toEqual([]);
    // Another Pariwar with its own number sends.
    const other = '22222222-2222-2222-2222-222222222222';
    const ok = await sendClaimCorrectionSms(
      { smsAppClient: c, resolveConfig: config({ [`sms.claim_correction.helpline_number.${other}`]: '+911800999999' }) },
      { ...input, pariwarId: other },
    );
    expect(ok).toMatchObject({ outcome: 'accepted' });
  });

  it('⛔ an unconfigured gateway (isConfigured() false) ⇒ error + alarm — ⛔ never the fixture\'s `accepted`', async () => {
    const c = client(() => Promise.resolve('gw'), false);
    expect(await sendClaimCorrectionSms({ smsAppClient: c, resolveConfig: config() }, input)).toMatchObject({
      outcome: 'error',
      detail: 'config:sms_gateway_unconfigured',
      alarm: true,
    });
  });

  const grpcError = (code: number | string) => Object.assign(new Error('secret manager'), { code });

  it.each([
    ['UNAVAILABLE', 14],
    ['DEADLINE_EXCEEDED', 4],
    ['RESOURCE_EXHAUSTED (a quota spike)', 8],
    ['ABORTED', 10],
    ['INTERNAL', 13],
    ['CANCELLED', 1],
    ['UNKNOWN', 2],
    ['a raw socket reset', 'ECONNRESET'],
    ['a DNS failure', 'ENOTFOUND'],
  ])('a Secret Manager fault that is ⛔ not a config fault (%s) ⇒ transient (retry)', async (_label, code) => {
    const c = client(() => Promise.resolve('gw'));
    const r = await sendClaimCorrectionSms({ smsAppClient: c, resolveConfig: () => Promise.reject(grpcError(code)) }, input);
    expect(r).toEqual({ kind: 'transient', detail: 'config_unavailable:secret_manager' });
    expect(c.sent).toEqual([]);
  });

  it.each([
    [7, 'config:secret_manager_permission_denied'],
    [3, 'config:secret_manager_invalid_argument'],
    [16, 'config:secret_manager_unauthenticated'],
    [9, 'config:secret_manager_failed_precondition'],
    [12, 'config:secret_manager_unimplemented'],
  ])('⛔ a Secret Manager CONFIG fault (gRPC %s) ⇒ FINAL error + alarm, ⛔ never a silent retry', async (code, detail) => {
    const c = client(() => Promise.resolve('gw'));
    const r = await sendClaimCorrectionSms({ smsAppClient: c, resolveConfig: () => Promise.reject(grpcError(code)) }, input);
    expect(r).toEqual({ kind: 'final', outcome: 'error', providerMessageId: null, detail, alarm: true });
    expect(c.sent).toEqual([]);
  });

  it('a Secret Manager failure with ⛔ no code (a missing project, an empty payload) ⇒ transient — ⛔ never a FINAL that cancels the slot (the next sweep\'s finaliser alarms one that never clears)', async () => {
    const c = client(() => Promise.resolve('gw'));
    const r = await sendClaimCorrectionSms(
      { smsAppClient: c, resolveConfig: () => Promise.reject(new Error('GOOGLE_CLOUD_PROJECT is not set')) },
      input,
    );
    expect(r).toEqual({ kind: 'transient', detail: 'config_unavailable:secret_manager' });
    expect(c.sent).toEqual([]);
  });

  it('⛔ a config fault WRAPPED in a `cause` is still a config fault — FINAL error + alarm', async () => {
    const c = client(() => Promise.resolve('gw'));
    const wrapped = new Error('resolve failed', { cause: grpcError(7) });
    const r = await sendClaimCorrectionSms({ smsAppClient: c, resolveConfig: () => Promise.reject(wrapped) }, input);
    expect(r).toEqual({ kind: 'final', outcome: 'error', providerMessageId: null, detail: 'config:secret_manager_permission_denied', alarm: true });
  });

  it('a send TIMEOUT ⇒ transient `api_unavailable:timeout`', async () => {
    const c = client(() => new Promise(() => undefined));
    const r = await sendClaimCorrectionSms({ smsAppClient: c, resolveConfig: config(), sendTimeoutMs: 20 }, input);
    expect(r).toEqual({ kind: 'transient', detail: 'api_unavailable:timeout' });
  });
});

describe('sendClaimCorrectionSms — the provider result mapping (AC3)', () => {
  const rejecting = (code: string, status = 400) => client(() => Promise.reject(new SmsSendError('x', code, status)));

  it('⭐ accepted ⇒ accepted with the provider message id; the body is the name-free reminder', async () => {
    const c = client(() => Promise.resolve('gw-42'));
    expect(await sendClaimCorrectionSms({ smsAppClient: c, resolveConfig: config() }, input)).toEqual({
      kind: 'final',
      outcome: 'accepted',
      providerMessageId: 'gw-42',
      detail: null,
    });
    expect(c.sent[0]).toContain('Claim 3F2A9C1E:');
    expect(c.sent[0]).toContain('+911800123456');
  });

  it.each([
    ['INVALID_NUMBER', 'rejected_invalid_number', false],
    ['CARRIER_REJECT', 'rejected_unreachable', false],
    ['DND_REJECT', 'rejected_unreachable', false],
    ['DLT_TEMPLATE_NOT_APPROVED', 'error', true],
    ['AUTH_FAILED', 'error', true],
    ['SOMETHING_ODD', 'error', true],
  ])('%s ⇒ %s (final, alarm=%s)', async (code, outcome, alarm) => {
    expect(await sendClaimCorrectionSms({ smsAppClient: rejecting(code), resolveConfig: config() }, input)).toMatchObject({
      kind: 'final',
      outcome,
      alarm,
    });
  });

  it.each([
    ['RATE_LIMIT', 400],
    ['X', 503],
  ])('%s (HTTP %s) ⇒ transient', async (code, status) => {
    expect(await sendClaimCorrectionSms({ smsAppClient: rejecting(code, status), resolveConfig: config() }, input)).toMatchObject({
      kind: 'transient',
    });
  });
});

describe('classifySecretManagerFault — FINAL only for a known CONFIG fault', () => {
  it.each([
    [3, false, 'invalid_argument'],
    [7, false, 'permission_denied'],
    [9, false, 'failed_precondition'],
    [12, false, 'unimplemented'],
    [16, false, 'unauthenticated'],
    [14, true, 'unavailable'],
    [4, true, 'deadline_exceeded'],
    [8, true, 'resource_exhausted'],
    [10, true, 'aborted'],
    [13, true, 'internal'],
    [1, true, 'cancelled'],
    [2, true, 'unknown'],
    [99, true, 'grpc_99'],
    ['ETIMEDOUT', true, 'etimedout'],
    ['ENETUNREACH', true, 'enetunreach'],
    ['EWHATEVER', true, 'ewhatever'],
    ['not a code: +91 98…', true, 'unknown'], // a non-label string is ⛔ never echoed into `detail`
    [undefined, true, 'unknown'],
  ])('code %s ⇒ transient=%s (%s)', (code, transient, label) => {
    expect(classifySecretManagerFault(Object.assign(new Error('x'), { code }))).toEqual({ transient, code: label });
  });

  it('reads a WRAPPED error\'s `cause.code` when the error itself carries none', () => {
    expect(classifySecretManagerFault(new Error('x', { cause: Object.assign(new Error('y'), { code: 16 }) }))).toEqual({
      transient: false,
      code: 'unauthenticated',
    });
    expect(classifySecretManagerFault(new Error('x', { cause: Object.assign(new Error('y'), { code: 'ECONNRESET' }) }))).toEqual({
      transient: true,
      code: 'econnreset',
    });
  });

  it('a non-object rejection is transient, ⛔ never a crash', () => {
    expect(classifySecretManagerFault(null)).toEqual({ transient: true, code: 'unknown' });
    expect(classifySecretManagerFault('boom')).toEqual({ transient: true, code: 'unknown' });
  });
});

describe('the staff push Alert (AC4, D11) — pure', () => {
  const base = {
    pariwarId: PARIWAR,
    claimCaseId: CLAIM,
    userId: '44444444-4444-4444-8444-444444444444',
    sentOn: '2026-10-01',
    deceasedMemberId: '55555555-5555-4555-8555-555555555555',
    items: [{ purpose: 'staff_reminder' }, { purpose: 'escalation' }],
    now: new Date('2026-10-01T04:30:00.000Z'),
  };

  it('⭐ ⛔ never time-critical; the deceased member is the SUBJECT; `alert_published`; name-free copy naming the queue', () => {
    const a = correctionStaffPushAlert(base);
    expect(a).toMatchObject({
      pariwar_id: PARIWAR,
      member_id: base.deceasedMemberId,
      time_critical: false,
      alert_category: 'alert_published',
      created_by_actor: 'system',
    });
    expect(a.payload_data).toEqual({
      title: 'Claim 3F2A9C1E: a correction chase needs you',
      body: '2 items due today on claim 3F2A9C1E. Open the correction queue in the admin app.',
    });
  });

  it('⭐ the alert id is deterministic per (claim, staff member, IST date) — and differs on any of the three', () => {
    const id = correctionStaffPushAlert(base).alert_id;
    expect(correctionStaffPushAlert({ ...base, now: new Date('2026-10-01T09:00:00.000Z') }).alert_id).toBe(id);
    expect(correctionStaffPushAlert({ ...base, sentOn: '2026-10-02' }).alert_id).not.toBe(id);
    expect(correctionStaffPushAlert({ ...base, userId: '66666666-6666-4666-8666-666666666666' }).alert_id).not.toBe(id);
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});
