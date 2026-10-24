// Story 5.11b — the alert SMS send's DB-free legs (AC4, AC6, AC7, AC8; `2026-10-25-404` FS6, FS9, FS17, FS19, FS22). The
// end-to-end legs (a real send, at most once, the outcome table, the window) are LIVE in `alert-sms-send-live.test.ts`; this
// file holds what needs ⛔ database: the core split's new entry points, the claim wrapper's kind fence, the template-id memo,
// a config refusal that ⛔ touches the pool, the retry rule per class, the recorded-detail allow-list, and the source pins.

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { SmsAppClient, SmsGatewayMessage } from '@twt/channels';
import type { Alert } from '@twt/contracts';
import ts from 'typescript';
import { describe, expect, it, vi } from 'vitest';

import {
  ALERT_SMS_RETRYABLE_DETAILS,
  ALERT_SMS_RUNG_DETAIL,
  ALERT_SMS_WA_WINDOW_ATTEMPT,
  isFinalFanOutAttempt,
} from '../src/scheduler/alert-sms-details.js';
import { ALERT_SMS_TEMPLATE_ID_TTL_MS, createAlertSmsSender, createTtlMemo } from '../src/scheduler/alert-sms-send.js';
import { prepareDltSms, sendClaimDltSms, sendPreparedDltSms } from '../src/scheduler/claim-dlt-sms-send.js';
import {
  RECORDED_RUNG_DETAILS,
  serializeFanOutResult,
  shouldRetryFanOut,
  type MemberFanOutContext,
  type MemberFanOutResult,
} from '../src/scheduler/contribution-notify.js';
import { CONTRIBUTION_SMS_TEMPLATES } from '../src/scheduler/contribution-sms-templates.js';

const here = dirname(fileURLToPath(import.meta.url));
const repo = (rel: string): string => resolve(here, '../../..', rel);
const read = (rel: string): string => readFileSync(repo(rel), 'utf8');

const TEMPLATE_ID = '64b0c0ffee0123456789abcd';
const ROW = '0f1e2d3c-4b5a-4978-8695-a4b3c2d1e0f9';
const T20 = CONTRIBUTION_SMS_TEMPLATES.payment_not_matched.en;

function gateway(answer: () => Promise<string> = () => Promise.resolve('req1')) {
  const calls: SmsGatewayMessage[] = [];
  const client: SmsAppClient = {
    isConfigured: () => true,
    messaging: () => ({
      send: (m) => {
        calls.push(m);
        return answer();
      },
    }),
  };
  return { client, calls };
}

describe('FS17 — the core split (prepare / send)', () => {
  const input = {
    dltTemplateIdConfigKey: T20.dltTemplateIdConfigKey,
    template: { text: T20.registeredText, slots: T20.slots },
    render: () => T20.registeredText,
    values: () => ({}),
    preflightFailOpen: true,
  };

  it('prepare passes a slot-less template (⛔ helpline, ⛔ CRQID, ⛔ row) and the send carries the CRQID `as…`', async () => {
    const gw = gateway();
    const prep = await prepareDltSms({ smsAppClient: gw.client, resolveConfig: () => Promise.resolve(TEMPLATE_ID) }, input);
    expect(prep.kind).toBe('prepared');
    if (prep.kind !== 'prepared') throw new Error('unreachable');
    expect(prep.prepared).toMatchObject({ templateId: TEMPLATE_ID, body: T20.registeredText, values: [] });
    expect(gw.calls).toHaveLength(0);
    const sent = await sendPreparedDltSms({}, prep.prepared, { e164: '+919876543210', correlation: { kind: 'as', rowId: ROW } });
    expect(sent).toEqual({ kind: 'final', outcome: 'accepted', providerMessageId: 'req1', detail: null });
    expect(gw.calls[0]!.correlationId).toBe(`as${ROW.replace(/-/g, '')}`);
  });

  it.each<[string, Parameters<typeof prepareDltSms>[0], string]>([
    ['an unset id', { smsAppClient: gateway().client, resolveConfig: () => Promise.resolve(null) }, 'config:dlt_template_id_missing'],
    ['a malformed id', { smsAppClient: gateway().client, resolveConfig: () => Promise.resolve('1107161234567890123') }, 'dlt_template_not_approved:template_id_malformed'],
    ['an unconfigured gateway', { smsAppClient: { ...gateway().client, isConfigured: () => false }, resolveConfig: () => Promise.resolve(TEMPLATE_ID) }, 'config:sms_gateway_unconfigured'],
    [
      'a messaging handle that throws (the probe)',
      { smsAppClient: { isConfigured: () => true, messaging: () => { throw new Error('half-configured'); } }, resolveConfig: () => Promise.resolve(TEMPLATE_ID) },
      'config:sms_messaging_unavailable',
    ],
  ])('prepare refuses %s — final, alarmed, ⛔ network', async (_l, deps, detail) => {
    expect(await prepareDltSms(deps, input)).toEqual({ kind: 'final', outcome: 'error', providerMessageId: null, detail, alarm: true });
  });

  it('prepare: a Secret Manager blip is a TRANSIENT (`config_unavailable:secret_manager`)', async () => {
    const prep = await prepareDltSms({ smsAppClient: gateway().client, resolveConfig: () => Promise.reject(Object.assign(new Error('x'), { code: 14 })) }, input);
    expect(prep).toEqual({ kind: 'transient', detail: 'config_unavailable:secret_manager' });
  });

  it('⭐ AC7 NEW leg — `sendClaimDltSms` with kind `as` ⇒ `[jobs] sms.bad_correlation:as` + a THROW (the claim wrapper keeps its four kinds)', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const resolveConfig = vi.fn(() => Promise.resolve(TEMPLATE_ID));
    try {
      await expect(
        sendClaimDltSms(
          { smsAppClient: gateway().client, resolveConfig },
          {
            dltTemplateIdConfigKey: T20.dltTemplateIdConfigKey,
            template: { text: T20.registeredText, slots: T20.slots },
            pariwarId: '11111111-1111-1111-1111-111111111111',
            e164: '+919876543210',
            render: () => T20.registeredText,
            values: () => ({}),
            preflightFailOpen: true,
            correlation: { kind: 'as', rowId: ROW },
          },
        ),
      ).rejects.toThrow();
      expect(errors).toHaveBeenCalledWith('[jobs] sms.bad_correlation:as');
      expect(resolveConfig).not.toHaveBeenCalled();
    } finally {
      errors.mockRestore();
    }
  });

  it('the generic send refuses `ot` the same way (a login code is ⛔ a send row)', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      const prep = await prepareDltSms({ smsAppClient: gateway().client, resolveConfig: () => Promise.resolve(TEMPLATE_ID) }, input);
      if (prep.kind !== 'prepared') throw new Error('unreachable');
      await expect(sendPreparedDltSms({}, prep.prepared, { e164: '+919876543210', correlation: { kind: 'ot' as never, rowId: ROW } })).rejects.toThrow();
      expect(errors).toHaveBeenCalledWith('[jobs] sms.bad_correlation:ot');
    } finally {
      errors.mockRestore();
    }
  });
});

describe('FS17 — the template-id memo (5 min, found AND not-found; ⛔ a transient)', () => {
  it('a found and a not-found answer are kept for the TTL; a throw is ⛔ kept; concurrent misses share ONE read', async () => {
    let clock = 0;
    const read = vi.fn((key: string) => (key === 'boom' ? Promise.reject(new Error('blip')) : Promise.resolve(key === 'none' ? null : 'id')));
    const memo = createTtlMemo(read, { ttlMs: ALERT_SMS_TEMPLATE_ID_TTL_MS, nowMs: () => clock });
    await Promise.all([memo('a'), memo('a'), memo('none'), memo('none')]);
    expect(read).toHaveBeenCalledTimes(2);
    clock += ALERT_SMS_TEMPLATE_ID_TTL_MS - 1;
    expect(await memo('a')).toBe('id');
    expect(await memo('none')).toBeNull();
    expect(read).toHaveBeenCalledTimes(2);
    clock += 1;
    await memo('a');
    expect(read).toHaveBeenCalledTimes(3); // an id set by ops is seen within 5 min
    await expect(memo('boom')).rejects.toThrow();
    await expect(memo('boom')).rejects.toThrow();
    expect(read).toHaveBeenCalledTimes(5);
  });
});

describe('FS17 / T9 — a config refusal writes ⛔ row: the seam never touches the pool', () => {
  it('⭐ an unset id ⇒ `config:dlt_template_id_missing:<locale>` with a pool that throws on ANY use', async () => {
    const pool = { connect: vi.fn(() => Promise.reject(new Error('must not be used'))), query: vi.fn() } as never;
    const alarms: string[] = [];
    const send = createAlertSmsSender({ pool, smsAppClient: gateway().client, resolveConfig: () => Promise.resolve(null), onAlarm: (m) => alarms.push(m) });
    const alert = {
      alert_id: '33333333-3333-3333-3333-333333333333',
      pariwar_id: '11111111-1111-1111-1111-111111111111',
      member_id: '22222222-2222-2222-2222-222222222222',
      alert_category: 'contribution_mismatch',
      payload_data: { pool_id: 'p', body: 'b', sms: { message: 'payment_not_matched', locale: 'en', values: {} } },
    } as unknown as Alert;
    const out = await send({
      alert,
      block: { message: 'payment_not_matched', locale: 'en', values: {} },
      target: { channel: 'sms', address: '+919876543210' },
      call: { occasion: 'mismatch:wrong_pool' },
      whatsappTried: false,
      dispatch: { hashRendered: () => Promise.resolve('h'), audit: () => Promise.resolve() },
    });
    expect(out).toEqual({ outcome: 'skipped_no_target', detail: 'config:dlt_template_id_missing:en' });
    expect((pool as { connect: ReturnType<typeof vi.fn> }).connect).not.toHaveBeenCalled();
    expect(alarms).toHaveLength(1);
  });

  it('an occasion outside the six ⇒ ⛔ sent, ONE alarm, terminal (the CHECK would refuse the row)', async () => {
    const alarms: string[] = [];
    const send = createAlertSmsSender({ pool: {} as never, smsAppClient: gateway().client, resolveConfig: () => Promise.resolve(TEMPLATE_ID), onAlarm: (m) => alarms.push(m) });
    const out = await send({
      alert: { alert_id: 'a', pariwar_id: 'p', member_id: 'm' } as unknown as Alert,
      block: { message: 'payment_not_matched', locale: 'en', values: {} },
      target: { channel: 'sms', address: '+919876543210' },
      call: { occasion: 'mismatch:anything' },
      whatsappTried: false,
      dispatch: { hashRendered: () => Promise.resolve('h'), audit: () => Promise.resolve() },
    });
    expect(out).toEqual({ outcome: 'skipped_no_target', detail: ALERT_SMS_RUNG_DETAIL.outcomeUnknown });
    expect(alarms).toHaveLength(1);
  });
});

describe('FS9 — the attempt and the retry rule per class (AC4, AC6)', () => {
  it('absent / partial metadata ⇒ the FINAL attempt; `retryCount >= retryLimit` ⇒ final; the window opens at attempt 2', () => {
    expect(isFinalFanOutAttempt(undefined)).toBe(true);
    expect(isFinalFanOutAttempt({ occasion: 'day_10' })).toBe(true);
    expect(isFinalFanOutAttempt({ retryCount: 0 })).toBe(true);
    expect(isFinalFanOutAttempt({ retryCount: 0, retryLimit: 4 })).toBe(false);
    expect(isFinalFanOutAttempt({ retryCount: 4, retryLimit: 4 })).toBe(true);
    expect(ALERT_SMS_WA_WINDOW_ATTEMPT).toBe(2);
  });

  const ctx: MemberFanOutContext = {
    targets: { push: [], whatsapp: null, sms: { channel: 'sms', address: '+919876543210' }, telegram: null },
    costToggleEnabled: false,
    lastEngagementAt: null,
  };
  const result = (detail: string | undefined, outcome = 'error'): MemberFanOutResult => ({
    memberId: 'm',
    delivered: false,
    deliveredChannel: null,
    trail: [
      { channel: 'push', attempt: 0, outcome: 'rejected' },
      { channel: 'sms', attempt: 0, outcome: outcome as never, ...(detail !== undefined ? { detail } : {}) },
    ],
    bridged: false,
    costSuppressedChannels: [],
    telegramMirrored: false,
  });
  const mid = { retryCount: 1, retryLimit: 4 };
  const last = { retryCount: 4, retryLimit: 4 };

  it.each([...ALERT_SMS_RETRYABLE_DETAILS])('`%s` ⇒ RETRIED before the final attempt; recorded (⛔ retried) on it; ⛔ attempt passed ⇒ final', (detail) => {
    expect(shouldRetryFanOut(result(detail), ctx, mid)).toBe(true);
    expect(shouldRetryFanOut(result(detail), ctx, last)).toBe(false);
    expect(shouldRetryFanOut(result(detail), ctx)).toBe(false);
  });

  it('the retryable set is EXACTLY the five FS9 classes', () => {
    expect([...ALERT_SMS_RETRYABLE_DETAILS].sort()).toEqual(
      ['config_unavailable:secret_manager', 'rate_limited', 'sms_awaiting_wa_window', 'sms_send_in_flight', 'sms_send_state_unavailable'].sort(),
    );
  });

  it.each(Object.values(ALERT_SMS_RUNG_DETAIL).filter((d) => !ALERT_SMS_RETRYABLE_DETAILS.has(d)))('`%s` ⇒ terminal (5.11\'s rule for a member with an SMS target)', (detail) => {
    expect(shouldRetryFanOut(result(detail), ctx, mid)).toBe(false);
  });

  it('⭐ every new detail is an EXACT allow-listed literal — it reaches the recorded trail; a provider `<class>:<code>` does ⛔', () => {
    for (const detail of Object.values(ALERT_SMS_RUNG_DETAIL)) {
      expect(RECORDED_RUNG_DETAILS.has(detail)).toBe(true);
      expect(serializeFanOutResult(result(detail)).trail).toContain(`sms:0:error:${detail}`);
    }
    expect(serializeFanOutResult(result('auth:401')).trail).toContain('sms:0:error');
    expect(serializeFanOutResult(result('invalid_number:format')).trail).toContain('sms:0:error');
  });
});

describe('AC8 — nothing else moves (I6) and the boot wiring (FS19)', () => {
  /** The sha256 of a top-level function's AST text. */
  const fnHash = (src: string, name: string): string => {
    const sf = ts.createSourceFile('probe.ts', src, ts.ScriptTarget.Latest, true);
    const fn = sf.statements.find((s): s is ts.FunctionDeclaration => ts.isFunctionDeclaration(s) && s.name?.text === name);
    if (!fn) throw new Error(`${name} not found`);
    return createHash('sha256').update(fn.getText(sf)).digest('hex');
  };
  // ⭐ Taken FROM `git show 0e9b261d:apps/jobs/src/scheduler/contribution-notify.ts` (the story's pin, = origin/main when written),
  // ⛔ from the edited HEAD — a pin, so the test needs ⛔ git history in CI.
  const AT_PIN = {
    isAlertSmsFallbackEligible: '449aa8be5d39ffb399cfbc58902fdd43de3ad677991b16853be759de750c171c',
    alertSmsBlock: 'ce346897b87bfa2af08a670a8be9063178cdcb24a9afb3895cf91e21337ec3aa',
  } as const;

  it.each(Object.entries(AT_PIN))('⭐ `%s` is byte-unchanged (its AST text, hashed)', (name, sha) => {
    expect(fnHash(read('apps/jobs/src/scheduler/contribution-notify.ts'), name)).toBe(sha);
  });

  it('revert-sanity: a one-character change to the predicate is caught', () => {
    const src = read('apps/jobs/src/scheduler/contribution-notify.ts').replace("input.pushOutcome === 'sent'", "input.pushOutcome !== 'sent'");
    expect(fnHash(src, 'isAlertSmsFallbackEligible')).not.toBe(AT_PIN.isAlertSmsFallbackEligible);
  });

  it('⭐ boot builds the pre-flight BEFORE the contribution deps and passes the seam (`alertSms:`) in them', () => {
    const boot = read('apps/jobs/src/boot.ts');
    const preflight = boot.indexOf('const smsPreflight =');
    const contribution = boot.indexOf('const contributionNotifyDeps = {');
    expect(preflight).toBeGreaterThan(0);
    expect(contribution).toBeGreaterThan(preflight);
    expect(boot.slice(contribution)).toMatch(
      /^const contributionNotifyDeps = \{[\s\S]{0,900}alertSms: createAlertSmsSender\(\{[\s\S]{0,200}smsAppClient: contributionProviders\.smsAppClient,[\s\S]{0,80}resolveConfig: resolveSmsDltConfig,[\s\S]{0,120}smsPreflight/,
    );
  });

  it('T18 — the seam, its details and the core never SPELL the template-id prefix (it lives in the registry only)', () => {
    for (const rel of ['apps/jobs/src/scheduler/alert-sms-send.ts', 'apps/jobs/src/scheduler/alert-sms-details.ts', 'apps/jobs/src/scheduler/claim-dlt-sms-send.ts']) {
      expect(read(rel).includes(['sms', 'dlt', 'template_id', ''].join('.'))).toBe(false);
    }
  });
});
