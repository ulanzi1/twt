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
import { DEFAULT_POOL_CONNECTION_TIMEOUT_MS, schema, smsDelivery } from '@twt/domain';
import ts from 'typescript';
import { describe, expect, it, vi } from 'vitest';

import {
  ALERT_SMS_RETRYABLE_DETAILS,
  ALERT_SMS_RUNG_DETAIL,
  ALERT_SMS_WA_WINDOW_ATTEMPT,
  isFinalFanOutAttempt,
} from '../src/scheduler/alert-sms-details.js';
import { EMITTABLE_MISMATCH_REASONS } from '../src/matcher/matcher-worker.js';
import {
  ALERT_SMS_FINALISE_BACKOFF_MS,
  ALERT_SMS_TEMPLATE_ID_TTL_MS,
  createAlertSmsSender,
  createTtlMemo,
  refusalRungDetail,
  settle,
  settleUndispatched,
} from '../src/scheduler/alert-sms-send.js';
import { CORRECTION_SEND_TIMEOUT_MS, prepareDltSms, sendClaimDltSms, sendPreparedDltSms } from '../src/scheduler/claim-dlt-sms-send.js';
import {
  RECORDED_RUNG_DETAILS,
  serializeFanOutResult,
  shouldRetryFanOut,
  type MemberFanOutContext,
  type MemberFanOutResult,
} from '../src/scheduler/contribution-notify.js';
import { CHILD_RETRY_DELAY_SECONDS, CHILD_RETRY_LIMIT, LIT_KIND_JOB_MEMBER_LIMIT } from '../src/scheduler/contribution-notify-triggers.js';
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
    expect(read).toHaveBeenCalledTimes(3);
    // Review C3-P9: the NOT-FOUND key is re-read too — "an id set by ops is seen within 5 min" is exactly the case where ops provisions a
    // template that was missing. A memo that cached `null` for ever passed the old test (it only re-read the FOUND key).
    expect(await memo('none')).toBeNull();
    expect(read).toHaveBeenCalledTimes(4);
    await expect(memo('boom')).rejects.toThrow();
    await expect(memo('boom')).rejects.toThrow();
    expect(read).toHaveBeenCalledTimes(6);
  });

  it('⭐ the TTL is FIVE MINUTES (a literal — ⛔ the exported constant compared with itself, which passes at 1 ms or 1 h)', () => {
    expect(ALERT_SMS_TEMPLATE_ID_TTL_MS).toBe(300_000);
  });
});

describe('FS17 / T9 — a config refusal writes ⛔ row: the seam never touches the pool', () => {
  it('⭐ an unset id ⇒ `config:dlt_template_id_missing:<locale>` with a pool that throws on ANY use', async () => {
    const pool = { connect: vi.fn(() => Promise.reject(new Error('must not be used'))), query: vi.fn(() => Promise.reject(new Error('must not be used'))) } as never;
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
    expect((pool as { query: ReturnType<typeof vi.fn> }).query).not.toHaveBeenCalled(); // review C3-P21: a `pool.query` write would have been invisible
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
    // Review C2-P14: NOTHING was attempted, so ⛔ `exhausted:outcome_unknown` ("the gateway MAY have taken it").
    expect(out).toEqual({ outcome: 'skipped_no_target', detail: ALERT_SMS_RUNG_DETAIL.notAttempted });
    expect(ALERT_SMS_RETRYABLE_DETAILS.has(ALERT_SMS_RUNG_DETAIL.notAttempted)).toBe(false); // terminal
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
  // ⭐ Story 5.8b (FS7 (a), `2026-10-28-415`) re-pinned `alertSmsBlock` DELIBERATELY: it gains the `alert_published` case, guarded by
  // `time_critical` (the bridged cycle-open). Replaced: 'ce346897b87bfa2af08a670a8be9063178cdcb24a9afb3895cf91e21337ec3aa' (5.11b's,
  // the two lit variants only). The predicate's pin is unchanged — 5.8b does ⛔ touch it.
  const AT_PIN = {
    isAlertSmsFallbackEligible: '449aa8be5d39ffb399cfbc58902fdd43de3ad677991b16853be759de750c171c',
    alertSmsBlock: '0ec8271d5facc8d261d4c1cd528c559414fe49a0a740217f1f3b8be2d5138d31',
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
    // Comment lines are stripped first: this pin is about the WIRING, so a dated explanatory comment must not move it (code review
    // 2026-10-25 — a four-line trigger comment on the `suppression` hook broke the old 900-character window).
    const code = boot.slice(contribution).replace(/^[ \t]*\/\/.*$/gm, '');
    expect(code).toMatch(
      /^const contributionNotifyDeps = \{[\s\S]{0,900}alertSms: createAlertSmsSender\(\{[\s\S]{0,200}smsAppClient: contributionProviders\.smsAppClient,[\s\S]{0,80}resolveConfig: resolveSmsDltConfig,[\s\S]{0,120}smsPreflight/,
    );
  });

  it('T18 — the seam, its details and the core never SPELL the template-id prefix (it lives in the registry only)', () => {
    for (const rel of ['apps/jobs/src/scheduler/alert-sms-send.ts', 'apps/jobs/src/scheduler/alert-sms-details.ts', 'apps/jobs/src/scheduler/claim-dlt-sms-send.ts']) {
      expect(read(rel).includes(['sms', 'dlt', 'template_id', ''].join('.'))).toBe(false);
    }
  });
});

describe('review 2026-10-25 — the template-id memo AT THE SEAM (C3-P9; FS17 / T9)', () => {
  const throwingPool = (): never =>
    ({ connect: vi.fn(() => Promise.reject(new Error('must not be used'))), query: vi.fn(() => Promise.reject(new Error('must not be used'))) }) as never;
  const refused = {
    alert: {
      alert_id: '33333333-3333-3333-3333-333333333333',
      pariwar_id: '11111111-1111-1111-1111-111111111111',
      member_id: '22222222-2222-2222-2222-222222222222',
      alert_category: 'contribution_mismatch',
    } as unknown as Alert,
    block: { message: 'payment_not_matched', locale: 'en', values: {} } as const,
    target: { channel: 'sms', address: '+919876543210' } as const,
    call: { occasion: 'mismatch:wrong_pool' },
    whatsappTried: false,
    dispatch: { hashRendered: () => Promise.resolve('h'), audit: () => Promise.resolve() },
  };

  it('⭐ three members and two attempts read the template id ONCE; after the TTL a SECOND read and a SECOND alarm; a THROWING read is ⛔ memoised', async () => {
    let clock = 1_000_000;
    let reads = 0;
    const alarms: string[] = [];
    const send = createAlertSmsSender({
      pool: throwingPool(),
      smsAppClient: gateway().client,
      resolveConfig: () => {
        reads += 1;
        return Promise.resolve(null); // not provisioned: a terminal refusal, ⛔ row, ⛔ pool
      },
      onAlarm: (m) => alarms.push(m),
      nowMs: () => clock,
    });
    for (let i = 0; i < 6; i += 1) await send(refused); // 3 members × 2 attempts
    expect(reads).toBe(1);
    expect(alarms).toHaveLength(1);
    clock += ALERT_SMS_TEMPLATE_ID_TTL_MS; // an id ops set meanwhile is seen within the TTL
    await send(refused);
    expect(reads).toBe(2);
    expect(alarms).toHaveLength(2);

    let throwingReads = 0;
    const flaky = createAlertSmsSender({
      pool: throwingPool(),
      smsAppClient: gateway().client,
      resolveConfig: () => {
        throwingReads += 1;
        return Promise.reject(Object.assign(new Error('blip'), { code: 14 }));
      },
      onAlarm: () => undefined,
      nowMs: () => clock,
    });
    for (let i = 0; i < 3; i += 1) await flaky(refused);
    expect(throwingReads).toBe(3); // a transient is read again for the next member
  });
});

describe('Story 5.8b review P2-1 — `giveUpDeferred` REPORTS what it did (⛔ a swallowed failure)', () => {
  const ALERT = {
    alert_id: '33333333-3333-3333-3333-333333333333',
    pariwar_id: '11111111-1111-1111-1111-111111111111',
    member_id: '22222222-2222-2222-2222-222222222222',
    alert_category: 'alert_published',
  } as unknown as Alert;

  it('⭐ a record that throws through EVERY try ⇒ `failed`, the read tried once per try, ONE alarm naming the fault class (⛔ an unhandled rejection)', async () => {
    const connect = vi.fn(() => Promise.reject(Object.assign(new Error('the server closed the connection'), { code: '57P01' })));
    const alarms: string[] = [];
    const send = createAlertSmsSender({
      pool: { connect, query: connect } as never,
      smsAppClient: gateway().client,
      resolveConfig: () => Promise.resolve(TEMPLATE_ID),
      onAlarm: (m) => alarms.push(m),
      finaliseBackoffMs: [0, 0],
    });
    await expect(send.giveUpDeferred!({ alert: ALERT, call: { occasion: 'cycle_open' } })).resolves.toBe('failed');
    expect(connect).toHaveBeenCalledTimes(3); // the first try + one per pause
    expect(alarms).toHaveLength(1);
    // Code review 2026-10-28 (second pass) replaced "could not be given up after the ladder delivered": the closure may now WRITE the
    // terminal row instead of giving one up.
    expect(alarms[0]).toContain('could not be closed after the ladder delivered');
    expect(alarms[0]).toContain('the push is ⛔ repeated');
  });

  it('an occasion the record does not admit ⇒ `none`, the pool ⛔ touched', async () => {
    const connect = vi.fn(() => Promise.reject(new Error('must not be used')));
    const send = createAlertSmsSender({ pool: { connect, query: connect } as never, smsAppClient: gateway().client, resolveConfig: () => Promise.resolve(TEMPLATE_ID) });
    await expect(send.giveUpDeferred!({ alert: ALERT, call: { occasion: 'day_7' } })).resolves.toBe('none');
    await expect(send.giveUpDeferred!({ alert: ALERT })).resolves.toBe('none');
    expect(connect).not.toHaveBeenCalled();
  });
});

describe('Story 5.8b code review 2026-10-28 (second pass) — `giveUpDeferred` with ⛔ row writes the TERMINAL row (was Decision 2 (a))', () => {
  const BRIDGED = {
    alert_id: '33333333-3333-3333-3333-333333333333',
    pariwar_id: '11111111-1111-1111-1111-111111111111',
    member_id: '22222222-2222-2222-2222-222222222222',
    alert_category: 'alert_published',
    time_critical: true,
    payload_data: { title: 't', body: 'b', sms: { message: 'cycle_open_bridge', locale: 'en', values: { pool: 'A', member1: 'Rame', member2: 'sh K' } } },
  } as unknown as Alert;
  const CALL = { occasion: 'cycle_open', jobId: 'job-7', retryCount: 2, retryLimit: 4 };

  /** A pool whose statements are answered by what they are (the lookup reads `found` in turn; the insert conflicts if told to). */
  function sqlPool(o: { found: readonly (string | null)[]; insertConflicts?: boolean }) {
    const statements: { sql: string; params: unknown[] }[] = [];
    let lookups = 0;
    const query = (sql: string, params: unknown[] = []) => {
      statements.push({ sql, params });
      if (sql.includes('SELECT send_id, outcome, detail')) {
        const outcome = o.found[Math.min(lookups, o.found.length - 1)] ?? null;
        lookups += 1;
        const row = outcome === null ? [] : [{ send_id: 'row-1', outcome, detail: outcome === 'error' ? 'exhausted:ladder_delivered' : 'rate_limited:x', inside_lease: true, deferred_fresh: true }];
        return Promise.resolve({ rows: row, rowCount: row.length });
      }
      if (sql.includes('INSERT INTO alert_sms_sends')) {
        return Promise.resolve(o.insertConflicts ? { rows: [], rowCount: 0 } : { rows: [{ send_id: 'row-new' }], rowCount: 1 });
      }
      if (sql.includes('UPDATE alert_sms_sends')) return Promise.resolve({ rows: [], rowCount: 1 });
      return Promise.resolve({ rows: [], rowCount: 0 });
    };
    const pool = { connect: () => Promise.resolve({ query, release: () => undefined }), query } as never;
    return { pool, statements, writes: () => statements.filter((x) => /^\s*(INSERT|UPDATE)/.test(x.sql)) };
  }
  const seam = (pool: never) => createAlertSmsSender({ pool, smsAppClient: gateway().client, resolveConfig: () => Promise.resolve(TEMPLATE_ID), finaliseBackoffMs: [0, 0] });

  it('⭐ ⛔ row + the ladder delivered ⇒ ONE insert (`attempting`, THIS attempt\'s claim token, the block\'s message and language) then its CAS to `error / exhausted:ladder_delivered` ⇒ `closed`', async () => {
    const db = sqlPool({ found: [null] });
    await expect(seam(db.pool).giveUpDeferred!({ alert: BRIDGED, call: CALL })).resolves.toBe('closed');
    const [insert, update] = db.writes();
    expect(insert!.sql).toContain("'attempting'");
    expect(insert!.params).toEqual([BRIDGED.pariwar_id, BRIDGED.alert_id, BRIDGED.member_id, 'cycle_open', 'cycle_open_bridge', 'en', 'job-7:2']);
    expect(update!.sql).toContain("outcome = 'error'");
    expect(update!.params).toEqual([BRIDGED.pariwar_id, 'row-new', 'job-7:2', 'exhausted:ladder_delivered']);
    expect(db.writes()).toHaveLength(2);
  });

  it('code review 2026-10-28 (third pass) — ⛔ row and an alert with ⛔ bridge block ⇒ `no_block` (⛔ `none`), ⛔ write; a FINAL or in-flight row ⇒ `none`', async () => {
    const b = sqlPool({ found: [null] });
    const noBlock = { ...BRIDGED, payload_data: { title: 't', body: 'b' } } as unknown as Alert;
    await expect(seam(b.pool).giveUpDeferred!({ alert: noBlock, call: CALL })).resolves.toBe('no_block');
    expect(b.writes()).toEqual([]);
    // A row that needs no closing is `none` — with a block or without (an F9 re-fan finds every such row final).
    for (const outcome of ['error', 'accepted', 'attempting']) {
      const withBlock = sqlPool({ found: [outcome] });
      await expect(seam(withBlock.pool).giveUpDeferred!({ alert: BRIDGED, call: CALL })).resolves.toBe('none');
      const without = sqlPool({ found: [outcome] });
      await expect(seam(without.pool).giveUpDeferred!({ alert: noBlock, call: CALL })).resolves.toBe('none');
      expect([...withBlock.writes(), ...without.writes()]).toEqual([]);
    }
  });

  it('the insert CONFLICTS (another attempt wrote it) ⇒ the row is re-read: FINAL ⇒ `none`; `deferred` ⇒ given up `ladder_delivered`', async () => {
    const final = sqlPool({ found: [null, 'error'], insertConflicts: true });
    await expect(seam(final.pool).giveUpDeferred!({ alert: BRIDGED, call: CALL })).resolves.toBe('none');
    expect(final.writes().map((w) => w.sql.trim().split(/\s+/)[0])).toEqual(['INSERT']);
    const deferred = sqlPool({ found: [null, 'deferred'], insertConflicts: true });
    await expect(seam(deferred.pool).giveUpDeferred!({ alert: BRIDGED, call: CALL })).resolves.toBe('closed');
    expect(deferred.writes().at(-1)!.params).toContain('exhausted:rate_limited:ladder_delivered');
  });

  it('code review 2026-10-28 (third pass) — the `in_app_only` mode is gone: a `deferred` row is given up only as `ladder_delivered`', async () => {
    const db = sqlPool({ found: ['deferred'] });
    await expect(seam(db.pool).giveUpDeferred!({ alert: BRIDGED, call: CALL })).resolves.toBe('closed');
    expect(db.writes()).toHaveLength(1);
    expect(db.writes()[0]!.params).toContain('exhausted:rate_limited:ladder_delivered');
    expect(JSON.stringify(db.statements)).not.toContain('in_app_only');
  });
});

describe('review 2026-10-25 — the 2-minute LEASE is pinned to the in-flight bound it is derived from (C2-P4)', () => {
  it('⭐ lease > the send timeout + every finalise try at the pool\'s REAL connect timeout + the finalise pauses — with 2× margin (a longer timeout, one more try or a longer pause would otherwise let a STALE finalise freeze a row its live attempt still holds)', () => {
    const tries = ALERT_SMS_FINALISE_BACKOFF_MS.length + 1;
    const pauses = ALERT_SMS_FINALISE_BACKOFF_MS.reduce((a, b) => a + b, 0);
    // From the begin COMMIT to the end of the last finalise try: the gateway call (≤ its timeout) + each try's connection wait + the pauses.
    const inFlight = CORRECTION_SEND_TIMEOUT_MS + tries * DEFAULT_POOL_CONNECTION_TIMEOUT_MS + pauses;
    expect(smsDelivery.ALERT_SMS_SEND_LEASE_MS).toBeGreaterThan(inFlight);
    expect(smsDelivery.ALERT_SMS_SEND_LEASE_MS).toBeGreaterThanOrEqual(2 * inFlight);
  });

  it('FD-P1 — the 30-minute limit budgets the ACTUAL eight-member retry job, including SMS finalise retries', () => {
    // pg-boss 12 (`plans.js`, retryBackoff): delay = retryDelay × (2^(rc+1)/2 + 2^(rc+1)/2 × random()) with rc = 0 … limit−1 — i.e. the delay
    // DOUBLES per retry AND is jittered ×1…×2, so the LAST gap is base × 2^(limit−1) × 2 (⛔ the 8 min "base × 2^(limit−1)" the first cut pinned).
    const longestBackoffMs = CHILD_RETRY_DELAY_SECONDS * 1000 * 2 ** (CHILD_RETRY_LIMIT - 1) * 2;
    expect(longestBackoffMs).toBe(16 * 60_000);
    // Bounded SMS work only: query execution, other providers and queue delays are not guaranteed latencies.
    // Scheduling tests separately prove the whole job, rather than just an internal claim chunk, has this member bound.
    const memberMs = CORRECTION_SEND_TIMEOUT_MS + (2 + ALERT_SMS_FINALISE_BACKOFF_MS.length + 1) * DEFAULT_POOL_CONNECTION_TIMEOUT_MS
      + ALERT_SMS_FINALISE_BACKOFF_MS.reduce((a, b) => a + b, 0);
    expect(LIT_KIND_JOB_MEMBER_LIMIT).toBe(8);
    expect(smsDelivery.ALERT_SMS_DEFERRED_MAX_AGE_MS).toBeGreaterThan(longestBackoffMs + LIT_KIND_JOB_MEMBER_LIMIT * memberMs);
    expect(smsDelivery.ALERT_SMS_DEFERRED_MAX_AGE_MS).toBe(30 * 60_000);
  });
});

describe('patch-diff review — the two seam branches no real client can reach, pinned directly (#5, #13, #14)', () => {
  type Core = Parameters<typeof settle>[0];
  const final = (outcome: string, detail: string | null, providerMessageId: string | null = null): Core =>
    ({ kind: 'final', outcome, providerMessageId, detail, alarm: true }) as unknown as Core;

  it('⭐ a post-send `config:sms_messaging_unavailable` is `error / messaging_unavailable`, the row says so, and its alarm is the PROCESS-wide one (the vocabulary\'s own word, ⛔ a hand-typed copy)', () => {
    const s = settle(final('error', 'config:sms_messaging_unavailable'), false);
    expect(s.row).toEqual({ outcome: 'error', detail: 'config:sms_messaging_unavailable' });
    expect(s.rung).toEqual({ outcome: 'error', detail: ALERT_SMS_RUNG_DETAIL.messagingUnavailable });
    expect(s.alarm).toBe(ALERT_SMS_RUNG_DETAIL.messagingUnavailable);
  });

  it('⭐ the alarm words of the three gateway-wide answers ARE the rung words (a template, a credential, the client) — `alarmRefusalOnce` keys on them', () => {
    expect(settle(final('error', 'auth:401'), false).alarm).toBe(ALERT_SMS_RUNG_DETAIL.gatewayAuth);
    expect(settle(final('error', 'dlt_template_not_approved:211'), false).alarm).toBe(ALERT_SMS_RUNG_DETAIL.gatewayTemplate);
  });

  it('⭐ a `rate_limited:<code>` whose code the row grammar cannot hold (65+ characters) degrades to a FINAL `exhausted:rate_limited:code_unrecorded` — the rate-limited FINAL rung (the gateway DEFINITELY did not take it), ⛔ `outcome_unknown`, ⛔ the re-sendable `deferred`', () => {
    const s = settle({ kind: 'transient', detail: `rate_limited:${'x'.repeat(65)}` } as unknown as Core, false);
    expect(s.row).toEqual({ outcome: 'error', detail: 'exhausted:rate_limited:code_unrecorded' });
    expect(s.rung).toEqual({ outcome: 'rejected', detail: ALERT_SMS_RUNG_DETAIL.rateLimitedFinal });
    expect(s.alarm).toBeDefined();
    // …and the ordinary non-final `rate_limited:<code>` is still the ONE re-sendable row
    expect(settle({ kind: 'transient', detail: 'rate_limited:429' } as unknown as Core, false).row).toEqual({ outcome: 'deferred', detail: 'rate_limited:429' });
  });

  it('⭐ a prepare refusal the seam has no word for is `sms_not_attempted` (⛔ `outcome_unknown`); the known words pass through; a Secret Manager fault is one word; a missing id carries the LOCALE', () => {
    expect(refusalRungDetail('config:something_new', 'hi')).toBe(ALERT_SMS_RUNG_DETAIL.notAttempted);
    expect(refusalRungDetail('dlt_template_not_approved:value_too_long', 'hi')).toBe(ALERT_SMS_RUNG_DETAIL.valueTooLong);
    expect(refusalRungDetail('config:secret_manager_permission_denied', 'en')).toBe(ALERT_SMS_RUNG_DETAIL.secretManagerFault);
    expect(refusalRungDetail('config:dlt_template_id_missing', 'en')).toBe(ALERT_SMS_RUNG_DETAIL.templateIdMissingEn);
    expect(refusalRungDetail('config:dlt_template_id_missing', 'hi')).toBe(ALERT_SMS_RUNG_DETAIL.templateIdMissingHi);
  });
});

describe('review 2026-10-25 — the occasion list has ONE source (C2-P5, C3-P18)', () => {
  // Story 5.8b (FS8 (a), `2026-10-28-415`) replaced: the list WITHOUT `cycle_open` — the degraded-mode bridge's occasion (the
  // cycle-open child's scope) is the seventh.
  it('⭐ the send record\'s OCCASIONS are EXACTLY `day_10`, `pending_match_escalated`, one `mismatch:<reason>` per reason the matcher EMITS, and the bridge\'s `cycle_open`', () => {
    const expected = ['day_10', 'pending_match_escalated', ...[...EMITTABLE_MISMATCH_REASONS].map((r) => `mismatch:${r}`), 'cycle_open'].sort();
    expect([...schema.ALERT_SMS_SEND_OCCASIONS].sort()).toEqual(expected);
  });

  it('⭐ the seam keeps ⛔ a hand-typed copy of them (it reads the domain\'s list)', () => {
    const code = read('apps/jobs/src/scheduler/alert-sms-send.ts');
    expect(code).toContain('schema.ALERT_SMS_SEND_OCCASIONS');
    expect(code).not.toMatch(/'mismatch:(wrong_pool|amount_mismatch|entry_already_claimed|sender_vpa_mismatch)'/);
  });
});

describe('review 2026-10-25 — AC4\'s recorded literals, pinned INDEPENDENTLY of the object that holds them (C3-P8)', () => {
  // Story 5.8b, code review 2026-10-28 (second pass) — the 22nd: `exhausted:ladder_delivered` (the terminal bridge row, read back).
  it('⭐ the rung vocabulary is exactly these 22 words (19 from AC4 + `exhausted:rate_limited` (C2-P1) + `sms_not_attempted` (C2-P14) + `exhausted:ladder_delivered` (5.8b))', () => {
    expect(Object.values(ALERT_SMS_RUNG_DETAIL).sort()).toEqual(
      [
        'config:dlt_template_id_missing:hi',
        'config:dlt_template_id_missing:en',
        'dlt_template_not_approved:template_id_malformed',
        'config:sms_gateway_unconfigured',
        'config:sms_messaging_unavailable',
        'config:secret_manager',
        'dlt_template_not_approved:values_mismatch',
        'dlt_template_not_approved:value_too_long',
        'auth:preflight',
        'rejected_invalid_number',
        'rejected_unreachable',
        'auth:gateway',
        'dlt_template_not_approved:gateway',
        'exhausted:outcome_unknown',
        'exhausted:rate_limited',
        'exhausted:ladder_delivered',
        'sms_not_attempted',
        'sms_awaiting_wa_window',
        'rate_limited',
        'sms_send_in_flight',
        'sms_send_state_unavailable',
        'config_unavailable:secret_manager',
      ].sort(),
    );
  });

  it('a FROZEN rate-limited row (`exhausted:rate_limited`) and `sms_not_attempted` are TERMINAL — the retry set is still exactly the five', () => {
    expect(ALERT_SMS_RETRYABLE_DETAILS.has(ALERT_SMS_RUNG_DETAIL.rateLimitedFinal)).toBe(false);
    expect(ALERT_SMS_RETRYABLE_DETAILS.has(ALERT_SMS_RUNG_DETAIL.notAttempted)).toBe(false);
    expect([...ALERT_SMS_RETRYABLE_DETAILS].sort()).toEqual(
      ['config_unavailable:secret_manager', 'rate_limited', 'sms_awaiting_wa_window', 'sms_send_in_flight', 'sms_send_state_unavailable'].sort(),
    );
  });
});

describe('R4-P7 — dispatch that never reached the one-send provider', () => {
  it('a suppressed attempt passes through, unalarmed (the lifecycle boundary — I4)', () => {
    expect(settleUndispatched({ outcome: 'suppressed', reason: 'frozen' })).toEqual({ rung: { outcome: 'suppressed' } });
  });

  it.each([
    [{ outcome: 'error', reason: 'immutability_violation: Cannot assign to read only property' }, 'error:immutability_violation'],
    [{ outcome: 'error', reason: 'provider: no sms provider for +91…' }, 'error:provider'],
    [{ outcome: 'skipped_no_target' }, 'skipped_no_target'],
    [undefined, 'no sms attempt'],
  ])('%j is a named, terminal `sms_not_attempted` with a fault CLASS to alarm on — ⛔ a detail-less rung recorded `in_app_only` in silence', (attempt, fault) => {
    const settled = settleUndispatched(attempt);
    expect(settled.rung).toEqual({ outcome: 'error', detail: ALERT_SMS_RUNG_DETAIL.notAttempted });
    // The CLASS only — ⛔ the reason's free text (it can carry a value), the C2-P9 rule.
    expect(settled.fault).toBe(fault);
    expect(ALERT_SMS_RETRYABLE_DETAILS.has(settled.rung.detail!)).toBe(false);
  });
});

describe('R4-P9 — an unavailable send record alarms ONCE per fault class per window, ⛔ per member', () => {
  it('two members on a dead pool ⇒ both `sms_send_state_unavailable` (retried), ONE alarm naming the fault class; a new window alarms again', async () => {
    let clock = 0;
    const refused = Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:1'), { code: 'ECONNREFUSED' });
    const pool = { connect: vi.fn(() => Promise.reject(refused)), query: vi.fn(() => Promise.reject(refused)) } as never;
    const alarms: string[] = [];
    const send = createAlertSmsSender({
      pool, smsAppClient: gateway().client, resolveConfig: () => Promise.resolve(TEMPLATE_ID), onAlarm: (m) => alarms.push(m), nowMs: () => clock,
    });
    const member = (memberId: string) => send({
      alert: {
        alert_id: '33333333-3333-3333-3333-333333333333', pariwar_id: '11111111-1111-1111-1111-111111111111', member_id: memberId,
        alert_category: 'contribution_mismatch',
      } as unknown as Alert,
      block: { message: 'payment_not_matched', locale: 'en', values: {} },
      target: { channel: 'sms', address: '+919876543210' },
      call: { occasion: 'mismatch:wrong_pool' },
      whatsappTried: false,
      dispatch: { hashRendered: () => Promise.resolve('h'), audit: () => Promise.resolve() },
    });
    for (const m of ['22222222-2222-2222-2222-222222222222', '44444444-4444-4444-4444-444444444444']) {
      expect(await member(m)).toEqual({ outcome: 'error', detail: ALERT_SMS_RUNG_DETAIL.stateUnavailable });
    }
    const stateAlarms = () => alarms.filter((a) => a.includes(ALERT_SMS_RUNG_DETAIL.stateUnavailable));
    expect(stateAlarms()).toHaveLength(1);
    expect(stateAlarms()[0]).toContain('code:ECONNREFUSED');
    expect(stateAlarms()[0]).not.toContain('connect ECONNREFUSED');
    clock += ALERT_SMS_TEMPLATE_ID_TTL_MS;
    await member('55555555-5555-5555-5555-555555555555');
    expect(stateAlarms()).toHaveLength(2);
    // Keyed per Pariwar (narrow review of R4): another Pariwar's fault inside the same window is ⛔ masked.
    await send({
      alert: { alert_id: '66666666-6666-6666-6666-666666666666', pariwar_id: '77777777-7777-7777-7777-777777777777', member_id: '22222222-2222-2222-2222-222222222222', alert_category: 'contribution_mismatch' } as unknown as Alert,
      block: { message: 'payment_not_matched', locale: 'en', values: {} },
      target: { channel: 'sms', address: '+919876543210' },
      call: { occasion: 'mismatch:wrong_pool' },
      whatsappTried: false,
      dispatch: { hashRendered: () => Promise.resolve('h'), audit: () => Promise.resolve() },
    });
    expect(stateAlarms()).toHaveLength(3);
    expect(stateAlarms()[2]).toContain('77777777-7777-7777-7777-777777777777');
  });
});
