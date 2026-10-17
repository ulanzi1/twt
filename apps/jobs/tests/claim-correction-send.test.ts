// The claim-correction SMS SEND — its fail-closed rules and the provider-result mapping (Story 6.19b, AC3, AC11b "the
// record" / "send safety"; `2026-09-29-269` §4/§5; T13). Mocked deps (⛔ no DB).
//   · a missing DLT template id, an unset helpline number, an unconfigured gateway ⇒ `error` + alarm — ⛔ never a
//     fixture `accepted`, ⛔ never a placeholder number;
//   · a KNOWN Secret Manager config fault (`INVALID_ARGUMENT`, `PERMISSION_DENIED`, `FAILED_PRECONDITION`,
//     `UNIMPLEMENTED`) ⇒ FINAL `error` + alarm (`config:secret_manager_<code>`); ANY other fault (an outage, a quota
//     spike, `UNAUTHENTICATED` — a token-refresh blip, fifth-pass review —, a socket error, a wrapped `cause`, ⛔ no
//     code) ⇒ transient (retry); a send TIMEOUT ⇒ transient (`api_unavailable:timeout`);
//   · `invalid_number` → `rejected_invalid_number`; `carrier_reject` → `rejected_unreachable` (letter-eligible, ⛔ no
//     alarm); `dlt_template_not_approved` / `auth` / `unknown` → `error` + alarm, FINAL; `rate_limited` /
//     `api_unavailable` → transient.
//   · ⭐ Story 6.34 (`2026-10-12-322` C1 / `-323` R1): a helpline set but ⛔ a callback number (`+91…`, a space) is SENT
//     exactly as today — same body, same outcome — and the FINAL result of a provider-handed send carries
//     `helplineNotCallbackNumber: true`; ⛔ on transient, ⛔ on the config finals that send nothing. The default
//     fixture is digits-only (`1800123456`), so every whole-result `toEqual` below stays exact (the flag is absent).
//   · ⭐ Story 6.37 (MSG91): the fixture template id is MSG91's 24 hex (MG4 — `'TPL-123'` is now malformed); the provider
//     legs use MSG91's codes (SYNTHETIC — a synchronous Flow `code` is ⛔ documented; a `carrier_reject` has ⛔ MSG91 code
//     at all, so its leg is a pre-classified synthetic error); every send records its named values and proves they
//     rebuild the body (AC5 (ii)); and the new core legs — the values check, the malformed id, the pre-flight memo, and
//     `beforeSend` — follow.

import {
  SmsSendError,
  substituteDltValues,
  type Msg91PreflightMemo,
  type Msg91PreflightResult,
  type SmsAppClient,
  type SmsGatewayMessage,
  type SmsMessagingHandle,
} from '@twt/channels';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { correctionStaffPushAlert, sendClaimCorrectionSms } from '../src/scheduler/claim-correction-reminders.js';
import { CLAIM_CORRECTION_SMS_TEMPLATES, renderClaimCorrectionSms } from '../src/scheduler/claim-correction-sms-templates.js';
import { sendClaimDltSms, type ClaimDltSmsInput, type ClaimDltSmsPreflight } from '../src/scheduler/claim-dlt-sms-send.js';
import { classifySecretManagerFault } from '../src/scheduler/contribution-providers.js';

const PARIWAR = '11111111-1111-1111-1111-111111111111';
const CLAIM = '3f2a9c1e-0b4d-4e6f-8a1b-2c3d4e5f6a7b';

/** MSG91's template id form (24 hex — MG4). */
const TEMPLATE_ID = '64b0c0ffee0123456789abcd';
const REMINDER_EN = CLAIM_CORRECTION_SMS_TEMPLATES.reminder.en;

/**
 * ⭐ AC5 (ii) — the "values rebuild the body" oracle runs INSIDE the fake `send`, where the core would catch an assertion's throw
 * as an ordinary provider error (review round 2 P14) — so a miss is RECORDED there and asserted after every test, ⛔ thrown.
 */
const oracleMisses: string[] = [];
afterEach(() => {
  const misses = oracleMisses.splice(0);
  expect(misses, 'the named values rebuild the body').toEqual([]);
});

function client(send: SmsMessagingHandle['send'], configured = true): SmsAppClient & { sent: string[]; messages: SmsGatewayMessage[] } {
  const sent: string[] = [];
  const messages: SmsGatewayMessage[] = [];
  return {
    sent,
    messages,
    isConfigured: () => configured,
    messaging: () => ({
      send: (m) => {
        sent.push(m.body);
        messages.push(m);
        // ⭐ AC5 (ii) — every send's named values rebuild its body through the registered text (recorded — P14).
        if (substituteDltValues(REMINDER_EN.registeredText, REMINDER_EN.slots, m.values) !== m.body) oracleMisses.push(m.body);
        return send(m);
      },
    }),
  };
}

const config = (overrides: Record<string, string | null> = {}) => async (key: string): Promise<string | null> => {
  if (key in overrides) return overrides[key]!;
  if (key.startsWith('sms.dlt.template_id.')) return TEMPLATE_ID;
  if (key === `sms.claim_correction.helpline_number.${PARIWAR}`) return '1800123456';
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
      { smsAppClient: c, resolveConfig: config({ [`sms.claim_correction.helpline_number.${other}`]: '1800999999' }) },
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
    ['UNAUTHENTICATED (a metadata-server / token-refresh blip)', 16],
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

/** A SYNTHETIC gateway rejection: a MSG91 code, or — for `carrier_reject`, which MSG91 never answers synchronously — pre-classified. */
const gatewayError = (code: string, status: number): SmsSendError =>
  code === 'CARRIER_REJECT'
    ? new SmsSendError('x', null, status, { errorClass: 'carrier_reject', code: 'synthetic' })
    : new SmsSendError('x', code, status);

describe('sendClaimCorrectionSms — the provider result mapping (AC3)', () => {
  const rejecting = (code: string, status = 400) => client(() => Promise.reject(gatewayError(code, status)));

  it('⭐ accepted ⇒ accepted with the provider message id; the body is the name-free reminder', async () => {
    const c = client(() => Promise.resolve('gw-42'));
    expect(await sendClaimCorrectionSms({ smsAppClient: c, resolveConfig: config() }, input)).toEqual({
      kind: 'final',
      outcome: 'accepted',
      providerMessageId: 'gw-42',
      detail: null,
    });
    expect(c.sent[0]).toContain('Claim 3F2A9C1E:');
    expect(c.sent[0]).toContain('1800123456');
    // ⭐ 6.37 MG3 — MSG91's id and the NAMED values, in slot order (the body stays the oracle, ⛔ sent).
    expect(c.messages[0]).toMatchObject({
      to: '+919812345678',
      templateId: TEMPLATE_ID,
      values: [
        { name: 'reference', value: '3F2A9C1E' },
        { name: 'helpline', value: '1800123456' },
      ],
    });
  });

  // SYNTHETIC MSG91 codes (MG7): 202 invalid mobile, 400 template, 201 auth, 311 a may-have-sent `unknown`.
  it.each([
    ['202', 'rejected_invalid_number', false],
    ['CARRIER_REJECT', 'rejected_unreachable', false],
    ['400', 'error', true],
    ['201', 'error', true],
    ['311', 'error', true],
    ['SOMETHING_ODD', 'error', true],
  ])('%s ⇒ %s (final, alarm=%s)', async (code, outcome, alarm) => {
    expect(await sendClaimCorrectionSms({ smsAppClient: rejecting(code), resolveConfig: config() }, input)).toMatchObject({
      kind: 'final',
      outcome,
      alarm,
    });
  });

  it.each([
    ['306', 200],
    ['601', 200],
  ])('%s (HTTP %s) ⇒ transient', async (code, status) => {
    expect(await sendClaimCorrectionSms({ smsAppClient: rejecting(code, status), resolveConfig: config() }, input)).toMatchObject({
      kind: 'transient',
    });
  });

  it('HTTP 429 / 503 with ⛔ code ⇒ transient', async () => {
    for (const status of [429, 503]) {
      const c = client(() => Promise.reject(new SmsSendError('x', null, status)));
      expect(await sendClaimCorrectionSms({ smsAppClient: c, resolveConfig: config() }, input)).toMatchObject({ kind: 'transient' });
    }
  });
});

describe('⭐ Story 6.34 — a helpline that is ⛔ a callback number is SENT and FLAGGED, ⛔ held, ⛔ refused (AC4; `-322` C1)', () => {
  const HELPLINE_KEY = `sms.claim_correction.helpline_number.${PARIWAR}`;
  const rejecting = (code: string, status = 400) => client(() => Promise.reject(gatewayError(code, status)));
  const malformed = (helpline = '+911800123456') => config({ [HELPLINE_KEY]: helpline });

  it.each(['+911800123456', '1800 123456'])('`%s` ⇒ accepted, the SAME body, flag set', async (helpline) => {
    const c = client(() => Promise.resolve('gw-7'));
    expect(await sendClaimCorrectionSms({ smsAppClient: c, resolveConfig: malformed(helpline) }, input)).toEqual({
      kind: 'final',
      outcome: 'accepted',
      providerMessageId: 'gw-7',
      detail: null,
      helplineNotCallbackNumber: true,
    });
    // ⛔ normalised — the body is exactly today's, with the number as written.
    expect(c.sent).toEqual([renderClaimCorrectionSms('reminder', 'en', { reference: '3F2A9C1E', helpline })]);
  });

  it.each([
    ['202', 'rejected_invalid_number', false],
    ['CARRIER_REJECT', 'rejected_unreachable', false],
    ['400', 'error', true],
  ])('a provider reject %s ⇒ %s, unchanged, flag set', async (code, outcome, alarm) => {
    const r = await sendClaimCorrectionSms({ smsAppClient: rejecting(code), resolveConfig: malformed() }, input);
    expect(r).toMatchObject({ kind: 'final', outcome, alarm, helplineNotCallbackNumber: true });
  });

  it('a TIMEOUT ⇒ exactly the transient — ⛔ flag (a pg-boss retry would warn on every attempt)', async () => {
    const c = client(() => new Promise(() => undefined));
    const r = await sendClaimCorrectionSms({ smsAppClient: c, resolveConfig: malformed(), sendTimeoutMs: 20 }, input);
    expect(r).toEqual({ kind: 'transient', detail: 'api_unavailable:timeout' });
  });

  it('a rate limit ⇒ transient, ⛔ flag', async () => {
    const c = client(() => Promise.reject(new SmsSendError('x', null, 429)));
    const r = await sendClaimCorrectionSms({ smsAppClient: c, resolveConfig: malformed() }, input);
    expect(r.kind).toBe('transient');
    expect(r).not.toHaveProperty('helplineNotCallbackNumber');
  });

  it('an unconfigured gateway ⇒ `config:sms_gateway_unconfigured`, ⛔ flag (⛔ send)', async () => {
    const c = client(() => Promise.resolve('gw'), false);
    expect(await sendClaimCorrectionSms({ smsAppClient: c, resolveConfig: malformed() }, input)).toEqual({
      kind: 'final',
      outcome: 'error',
      providerMessageId: null,
      detail: 'config:sms_gateway_unconfigured',
      alarm: true,
    });
  });

  it('a half-configured client (messaging() throws) ⇒ `config:sms_messaging_unavailable`, ⛔ flag', async () => {
    const c: SmsAppClient = {
      isConfigured: () => true,
      messaging: () => {
        throw new Error('no handle');
      },
    };
    expect(await sendClaimCorrectionSms({ smsAppClient: c, resolveConfig: malformed() }, input)).toEqual({
      kind: 'final',
      outcome: 'error',
      providerMessageId: null,
      detail: 'config:sms_messaging_unavailable',
      alarm: true,
    });
  });

  it('a digits-only number (`1800123456`) ⇒ ⛔ flag; an UNSET one fails closed exactly as before', async () => {
    const c = client(() => Promise.resolve('gw'));
    expect(await sendClaimCorrectionSms({ smsAppClient: c, resolveConfig: config() }, input)).not.toHaveProperty(
      'helplineNotCallbackNumber',
    );
    expect(
      await sendClaimCorrectionSms({ smsAppClient: c, resolveConfig: config({ [HELPLINE_KEY]: '  ' }) }, input),
    ).toEqual({ kind: 'final', outcome: 'error', providerMessageId: null, detail: 'config:helpline_number_missing', alarm: true });
  });
});

describe('classifySecretManagerFault — FINAL only for a known CONFIG fault', () => {
  it.each([
    [3, false, 'invalid_argument'],
    [7, false, 'permission_denied'],
    [9, false, 'failed_precondition'],
    [12, false, 'unimplemented'],
    [16, true, 'unauthenticated'], // ⚠ TRANSIENT (fifth-pass review) — a token-refresh blip ⛔ must not end the day's sends
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
    expect(classifySecretManagerFault(new Error('x', { cause: Object.assign(new Error('y'), { code: 7 }) }))).toEqual({
      transient: false,
      code: 'permission_denied',
    });
    expect(classifySecretManagerFault(new Error('x', { cause: Object.assign(new Error('y'), { code: 16 }) }))).toEqual({
      transient: true,
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

// ── Story 6.37 — the core's new legs (MG3, MG4, MG5, MG16 (i)) ─────────────────────────────────────────────────────

/** A memo answering one fixed verdict, counting its reads. */
function memoAnswering(verdict: Msg91PreflightResult): Msg91PreflightMemo & { calls: number } {
  const m = {
    calls: 0,
    get() {
      m.calls += 1;
      return Promise.resolve(verdict);
    },
  };
  return m;
}
const preflight = (verdict: Msg91PreflightResult, readsWithSendKey = true): ClaimDltSmsPreflight & { memo: { calls: number } } => ({
  memo: memoAnswering(verdict),
  readsWithSendKey,
});
const PASS: Msg91PreflightResult = { ok: true, notes: [] };
const fault = (reason: Exclude<Msg91PreflightResult, { ok: true }>['reason']): Msg91PreflightResult =>
  reason === 'transient' ? { ok: false, transient: true, reason } : { ok: false, transient: false, reason };

/** The reminder's core input, built the way the wrapper builds it — overridable per leg. */
function coreInput<T extends Partial<ClaimDltSmsInput>>(over: T = {} as T) {
  return {
    dltTemplateIdConfigKey: REMINDER_EN.dltTemplateIdConfigKey,
    template: { text: REMINDER_EN.registeredText, slots: REMINDER_EN.slots },
    pariwarId: PARIWAR,
    e164: '+919812345678',
    render: (helpline: string) => renderClaimCorrectionSms('reminder', 'en', { reference: '3F2A9C1E', helpline }),
    values: (helpline: string) => ({ reference: '3F2A9C1E', helpline }),
    preflightFailOpen: false,
    ...over,
  };
}

describe('⭐ Story 6.37 — MG3: the named values are proved against the body BEFORE the network (AC5)', () => {
  it.each<[string, (h: string) => Record<string, string>, string]>([
    ['a value that disagrees with the render', (h) => ({ reference: 'FFFFFFFF', helpline: h }), 'dlt_template_not_approved:values_mismatch'],
    ['a missing name', (h) => ({ helpline: h }), 'dlt_template_not_approved:values_mismatch'],
    ['an extra name', (h) => ({ reference: '3F2A9C1E', helpline: h, x: '1' }), 'dlt_template_not_approved:values_mismatch'],
    ['a misnamed slot', (h) => ({ ref: '3F2A9C1E', helpline: h }), 'dlt_template_not_approved:values_mismatch'],
    ['a value longer than its slot (8)', (h) => ({ reference: '3F2A9C1E0', helpline: h }), 'dlt_template_not_approved:value_too_long'],
  ])('%s ⇒ final error + alarm, ⛔ fetch', async (_l, values, detail) => {
    const c = client(() => Promise.resolve('gw'));
    const render = _l.includes('longer')
      ? (helpline: string) => renderClaimCorrectionSms('reminder', 'en', { reference: '3F2A9C1E0', helpline })
      : coreInput().render;
    const r = await sendClaimDltSms({ smsAppClient: c, resolveConfig: config() }, coreInput({ values, render }));
    expect(r).toEqual({ kind: 'final', outcome: 'error', providerMessageId: null, detail, alarm: true });
    expect(c.messages).toEqual([]);
  });

  it('the wrapper\'s values ARE the render\'s — sent in slot order (the reminder, closure and certificate, both locales)', async () => {
    for (const message of ['reminder', 'closure_notice', 'certificate_reminder'] as const) {
      for (const locale of ['hi', 'en'] as const) {
        const entry = CLAIM_CORRECTION_SMS_TEMPLATES[message][locale];
        const messages: SmsGatewayMessage[] = [];
        const c: SmsAppClient = {
          isConfigured: () => true,
          messaging: () => ({ send: (m) => (messages.push(m), Promise.resolve('gw')) }),
        };
        const r = await sendClaimCorrectionSms({ smsAppClient: c, resolveConfig: config() }, { ...input, message, locale });
        expect(r).toMatchObject({ outcome: 'accepted' });
        const m = messages[0]!;
        expect(m.values.map((v) => v.name)).toEqual(entry.slots.map((s) => s.name));
        expect(substituteDltValues(entry.registeredText, entry.slots, m.values)).toBe(m.body);
        expect(m.body).toBe(renderClaimCorrectionSms(message, locale, { reference: '3F2A9C1E', helpline: '1800123456' }));
      }
    }
  });
});

describe('⭐ Story 6.37 — a helpline over 14 characters is SENT with the warning, ⛔ refused (BigDev 2026-10-17; `-322` C1 holds)', () => {
  const HELPLINE_KEY = `sms.claim_correction.helpline_number.${PARIWAR}`;

  it.each(['+91 1800 123 456', '18001234567890123'])('`%s` ⇒ accepted, the SAME body, the named value as set, flag set (⛔ value_too_long)', async (helpline) => {
    const c = client(() => Promise.resolve('gw-long'));
    const r = await sendClaimCorrectionSms({ smsAppClient: c, resolveConfig: config({ [HELPLINE_KEY]: helpline }) }, input);
    expect(r).toEqual({ kind: 'final', outcome: 'accepted', providerMessageId: 'gw-long', detail: null, helplineNotCallbackNumber: true });
    expect(c.sent).toEqual([renderClaimCorrectionSms('reminder', 'en', { reference: '3F2A9C1E', helpline })]);
    expect(c.messages[0]!.values).toEqual([
      { name: 'reference', value: '3F2A9C1E' },
      { name: 'helpline', value: helpline },
    ]);
  });

  it('the warning names the 14-character limit (⛔ the number itself)', async () => {
    const { helplineNotCallbackNumberWarning } = await import('../src/scheduler/claim-dlt-sms-send.js');
    const w = helplineNotCallbackNumberWarning(PARIWAR, 'correction reminder');
    expect(w).toContain('at most 14 characters');
    expect(w).toContain('not a callback number');
  });

  it('every OTHER slot keeps its length check (the reference, 8)', async () => {
    const c = client(() => Promise.resolve('gw'));
    const r = await sendClaimDltSms(
      { smsAppClient: c, resolveConfig: config() },
      coreInput({
        render: (h: string) => renderClaimCorrectionSms('reminder', 'en', { reference: '3F2A9C1E0', helpline: h }),
        values: (h: string) => ({ reference: '3F2A9C1E0', helpline: h }),
      }),
    );
    expect(r).toMatchObject({ outcome: 'error', detail: 'dlt_template_not_approved:value_too_long' });
  });
});

describe('⭐ Story 6.37 — MG4: a template id that is ⛔ MSG91\'s 24 hex', () => {
  it.each(['TPL-123', '1107161234567890123', '64b0c0ffee0123456789abc'])('`%s` ⇒ final `template_id_malformed` + alarm, ⛔ memo, ⛔ fetch', async (id) => {
    const c = client(() => Promise.resolve('gw'));
    const p = preflight(PASS);
    const r = await sendClaimCorrectionSms(
      { smsAppClient: c, resolveConfig: config({ [REMINDER_EN.dltTemplateIdConfigKey]: id }), smsPreflight: p },
      input,
    );
    expect(r).toEqual({ kind: 'final', outcome: 'error', providerMessageId: null, detail: 'dlt_template_not_approved:template_id_malformed', alarm: true });
    expect(p.memo.calls).toBe(0);
    expect(c.messages).toEqual([]);
  });

  it('⭐ the SAME kind of final a missing template id gives today (side by side — AC9 (b))', async () => {
    const c = client(() => Promise.resolve('gw'));
    const missing = await sendClaimCorrectionSms({ smsAppClient: c, resolveConfig: config({ [REMINDER_EN.dltTemplateIdConfigKey]: null }) }, input);
    const malformed = await sendClaimCorrectionSms({ smsAppClient: c, resolveConfig: config({ [REMINDER_EN.dltTemplateIdConfigKey]: 'TPL-1' }) }, input);
    expect({ ...missing, detail: 'x' }).toEqual({ ...malformed, detail: 'x' });
  });
});

describe('⭐ Story 6.37 — MG5: the pre-flight memo inside the core (AC9)', () => {
  it('a PASS (or a stale pass) ⇒ sent; ⛔ warning', async () => {
    for (const verdict of [PASS, { ok: true, notes: [], stale: true } as const]) {
      const c = client(() => Promise.resolve('gw'));
      const p = preflight(verdict);
      const r = await sendClaimCorrectionSms({ smsAppClient: c, resolveConfig: config(), smsPreflight: p }, input);
      expect(r).toEqual({ kind: 'final', outcome: 'accepted', providerMessageId: 'gw', detail: null });
      expect(p.memo.calls).toBe(1);
    }
  });

  it.each(['auth', 'auth_or_not_found'] as const)('a PROVEN fault (%s from the SEND key — MG17 (a)) ⇒ final `auth:preflight` + alarm on 6.19b/c/d too, ⛔ fetch', async (reason) => {
    const c = client(() => Promise.resolve('gw'));
    const r = await sendClaimCorrectionSms({ smsAppClient: c, resolveConfig: config(), smsPreflight: preflight(fault(reason)) }, input);
    expect(r).toEqual({ kind: 'final', outcome: 'error', providerMessageId: null, detail: 'auth:preflight', alarm: true });
    expect(c.messages).toEqual([]);
  });

  it.each(['content_mismatch', 'dlt_id_missing', 'sms_type_needs_unicode'] as const)(
    '⭐ 6.19b/c/d FAIL OPEN on an UNPROVEN fault (%s) — SENT, accepted + `preflightWarning`',
    async (reason) => {
      const c = client(() => Promise.resolve('gw'));
      const r = await sendClaimCorrectionSms({ smsAppClient: c, resolveConfig: config(), smsPreflight: preflight(fault(reason)) }, input);
      expect(r).toEqual({
        kind: 'final',
        outcome: 'accepted',
        providerMessageId: 'gw',
        detail: null,
        preflightWarning: `dlt_template_not_approved:preflight_${reason}`,
      });
      expect(c.messages).toHaveLength(1);
    },
  );

  it.each(['auth', 'auth_or_not_found'] as const)('MG17 (b) — %s read with a SEPARATE key is unproven ⇒ 6.19b/c/d SEND with a warning', async (reason) => {
    const c = client(() => Promise.resolve('gw'));
    const r = await sendClaimCorrectionSms({ smsAppClient: c, resolveConfig: config(), smsPreflight: preflight(fault(reason), false) }, input);
    expect(r).toMatchObject({ outcome: 'accepted', preflightWarning: `dlt_template_not_approved:preflight_${reason}` });
  });

  it('⭐ 6.19b/c/d FAIL OPEN on a TRANSIENT with ⛔ usable pass — SENT with `api_unavailable:preflight`', async () => {
    const c = client(() => Promise.resolve('gw'));
    const r = await sendClaimCorrectionSms({ smsAppClient: c, resolveConfig: config(), smsPreflight: preflight(fault('transient')) }, input);
    expect(r).toMatchObject({ kind: 'final', outcome: 'accepted', preflightWarning: 'api_unavailable:preflight' });
  });

  it('the warning rides a fail-open REJECTION too (beside the helpline flag), ⛔ an outcome change', async () => {
    const c = client(() => Promise.reject(new SmsSendError('x', '202', 200)));
    const r = await sendClaimCorrectionSms(
      { smsAppClient: c, resolveConfig: config({ [`sms.claim_correction.helpline_number.${PARIWAR}`]: '+911800123456' }), smsPreflight: preflight(fault('content_mismatch')) },
      input,
    );
    expect(r).toMatchObject({
      outcome: 'rejected_invalid_number',
      helplineNotCallbackNumber: true,
      preflightWarning: 'dlt_template_not_approved:preflight_content_mismatch',
    });
  });

  it.each(['content_mismatch', 'dlt_id_missing', 'sms_type_needs_unicode'] as const)(
    'a HOLDING child (⛔ fail open) — an unproven fault (%s) first seen in the CORE ⇒ final `preflight_<reason>` + alarm, ⛔ fetch (AC9 (a2))',
    async (reason) => {
      const c = client(() => Promise.resolve('gw'));
      const r = await sendClaimDltSms({ smsAppClient: c, resolveConfig: config(), smsPreflight: preflight(fault(reason)) }, coreInput());
      expect(r).toEqual({ kind: 'final', outcome: 'error', providerMessageId: null, detail: `dlt_template_not_approved:preflight_${reason}`, alarm: true });
      expect(c.messages).toEqual([]);
    },
  );

  it('a HOLDING child — a transient with ⛔ usable pass ⇒ `transient api_unavailable:preflight` (pg-boss retries), ⛔ sent', async () => {
    const c = client(() => Promise.resolve('gw'));
    const r = await sendClaimDltSms({ smsAppClient: c, resolveConfig: config(), smsPreflight: preflight(fault('transient')) }, coreInput());
    expect(r).toEqual({ kind: 'transient', detail: 'api_unavailable:preflight' });
    expect(c.messages).toEqual([]);
  });

  it('⛔ memo (dev, every existing fake) ⇒ ⛔ pre-flight — the send proceeds as before', async () => {
    const c = client(() => Promise.resolve('gw'));
    expect(await sendClaimDltSms({ smsAppClient: c, resolveConfig: config() }, coreInput())).toMatchObject({ outcome: 'accepted' });
  });
});

describe('⭐ Story 6.37 — MG16 (i): `beforeSend`, synchronously, immediately before the send (AC9 (e))', () => {
  it.each([
    ['defer_window', 'window'],
    ['defer_lease', 'lease'],
  ] as const)('%s ⇒ `{kind:"deferred", reason:"%s"}` and ⛔ send — AFTER the pre-flight read', async (answer, reason) => {
    const c = client(() => Promise.resolve('gw'));
    const order: string[] = [];
    const p: ClaimDltSmsPreflight = {
      memo: { get: () => (order.push('preflight'), Promise.resolve(PASS)) },
      readsWithSendKey: true,
    };
    const beforeSend = vi.fn((): 'go' | 'defer_window' | 'defer_lease' => (order.push('beforeSend'), answer));
    const r = await sendClaimDltSms({ smsAppClient: c, resolveConfig: config(), smsPreflight: p }, coreInput({ beforeSend }));
    expect(r).toEqual({ kind: 'deferred', reason });
    expect(order).toEqual(['preflight', 'beforeSend']);
    expect(c.messages).toEqual([]);
  });

  it('`go` ⇒ sent', async () => {
    const c = client(() => Promise.resolve('gw'));
    const r = await sendClaimDltSms({ smsAppClient: c, resolveConfig: config() }, coreInput({ beforeSend: () => 'go' as const }));
    expect(r).toMatchObject({ kind: 'final', outcome: 'accepted' });
  });
});
