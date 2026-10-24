// Story 5.11b — the REAL alert SMS send, end to end through the fan-out (live DB, own-committing). AC2, AC3, AC4, AC6; I1, I2,
// I4, I5; `2026-10-25-404` FS6 (a), FS9 (a), FS17 (a), FS18 (a).
//
// `fanOutAlert` is driven with the REAL seam (`createAlertSmsSender`) over a pool bound to `role=twt_app` (T19 — the send
// record is FORCE RLS; a superuser pool would prove nothing about the policies), the REAL claim core split (prepare / send), the
// REAL `dispatch`, and a RECORDING gateway double in place of MSG91 (⛔ network; ⛔ assertion on a provider id — T5). Every body
// is checked against the text rendered INDEPENDENTLY here through the real `t()` (⛔ `substituteDltValues` against itself).
// The push rung REJECTS (a reject double), so the ladder reaches the SMS rung; WhatsApp is absent unless a leg says otherwise.

import { randomUUID } from 'node:crypto';

import {
  SmsSendError,
  type Channel,
  type ChannelProvider,
  type SendTarget,
  type SmsAppClient,
  type SmsGatewayMessage,
} from '@twt/channels';
import type { Alert } from '@twt/contracts';
import { t } from '@twt/i18n';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { ALERT_SMS_RUNG_DETAIL } from '../src/scheduler/alert-sms-details.js';
import { createAlertSmsSender } from '../src/scheduler/alert-sms-send.js';
import {
  fanOutAlert,
  serializeFanOutResult,
  shouldRetryFanOut,
  type ContributionNotifyDeps,
  type MemberFanOutContext,
} from '../src/scheduler/contribution-notify.js';
import {
  buildContributionMismatchAlert,
  buildDeadlineReminderAlert,
  buildPendingMatchRetryAlert,
} from '../src/scheduler/contribution-notify-triggers.js';
import { contributionSmsDltConfigKey, type ContributionSmsLocale } from '../src/scheduler/contribution-sms-templates.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);

const TEMPLATE_ID = '64b0c0ffee0123456789abcd';
const IDENTITY = {
  deceasedDisplayName: 'Ramesh K',
  poolLetterCode: 'C',
  poolName: 'अर्जुन',
  poolCanonicalIdentifier: 'pool-c',
  fixedAmount: 100,
} as never;
const NOW = new Date('2026-10-25T04:00:00.000Z');
const DEADLINE = new Date('2026-11-05T00:00:00.000Z');
const SMS_TARGET: SendTarget = { channel: 'sms', address: '+919876543210' };
const WA_TARGET: SendTarget = { channel: 'whatsapp', address: '+919876543210' };

/** A provider that always answers `rejected` (so the ladder advances) — counted. */
function rejecting(channel: Channel, detail = 'unavailable:x'): ChannelProvider & { calls: number } {
  const p = {
    calls: 0,
    id: (channel === 'push' ? 'fcm' : channel === 'whatsapp' ? 'whatsapp-business' : channel === 'sms' ? 'sms-dlt' : 'telegram') as never,
    channel,
    scope: 'global' as const,
    send() {
      p.calls += 1;
      return Promise.resolve({ channel, provider: p.id, status: 'rejected' as const, providerMessageId: null, detail });
    },
    getStatus: (id: string) => Promise.resolve({ providerMessageId: id, state: 'unknown' as const }),
  };
  return p;
}

/** The recording MSG91 double: every message the seam hands the gateway, and a scripted answer. */
function gateway(answer: (m: SmsGatewayMessage, n: number) => Promise<string> = () => Promise.resolve('req0001')) {
  const calls: SmsGatewayMessage[] = [];
  const client: SmsAppClient = {
    isConfigured: () => true,
    messaging: () => ({
      send: (m) => {
        calls.push(m);
        return answer(m, calls.length);
      },
    }),
  };
  return { client, calls };
}

/** The independent expectation: the contribution.json text through the REAL `t()` (⛔ the registry's registered text). */
function expectedBody(key: string, locale: ContributionSmsLocale, params: Record<string, string>): string {
  return t(key, params, { locale, namespace: 'contribution' });
}

describe.skipIf(!hasDatabase)('Story 5.11b — the real alert SMS send (live DB, role=twt_app)', { timeout: 60_000 }, () => {
  let appPool: pg.Pool;
  let ownerPool: pg.Pool;
  const alertIds: string[] = [];

  beforeAll(() => {
    appPool = new pg.Pool({ connectionString: DATABASE_URL, options: '-c role=twt_app', max: 4 });
    ownerPool = new pg.Pool({ connectionString: DATABASE_URL, max: 2 });
  });

  afterAll(async () => {
    try {
      if (alertIds.length > 0) {
        await ownerPool.query('DELETE FROM alert_sms_sends WHERE alert_id = ANY($1)', [alertIds]);
        await ownerPool.query('DELETE FROM alerts WHERE alert_id = ANY($1)', [alertIds]);
      }
    } finally {
      await appPool.end();
      await ownerPool.end();
    }
  });

  /** A fresh Pariwar + a committed alert row (as the projector would leave it — FS6's FK). */
  async function freshAlert(): Promise<{ pariwarId: string; alertId: string; memberId: string }> {
    const pariwarId = randomUUID();
    const alertId = randomUUID();
    const c = await ownerPool.connect();
    try {
      await c.query('BEGIN');
      await c.query("SET LOCAL app.alert_state_writer = 'on'");
      await c.query(
        `INSERT INTO alerts (alert_id, cycle_id, pariwar_id, pool_count, current_state, state_event_version, created_by_actor)
         VALUES ($1, $2, $3, 1, 'live', 3, 'system')`,
        [alertId, randomUUID(), pariwarId],
      );
      await c.query('COMMIT');
    } finally {
      c.release();
    }
    alertIds.push(alertId);
    return { pariwarId, alertId, memberId: randomUUID() };
  }

  const day10 = (k: { pariwarId: string; alertId: string; memberId: string }, smsLocale: ContributionSmsLocale = 'hi'): Alert =>
    buildDeadlineReminderAlert({
      alertId: k.alertId,
      pariwarId: k.pariwarId,
      memberId: k.memberId,
      poolId: randomUUID(),
      identity: IDENTITY,
      cycleDay: 10,
      deadlineAt: DEADLINE,
      timeCritical: false,
      locale: 'hi',
      smsLocale,
      now: NOW,
    });

  interface Rig {
    readonly deps: ContributionNotifyDeps;
    readonly calls: SmsGatewayMessage[];
    readonly audit: { action: string; resourceLocator: string }[];
    readonly alarms: string[];
    readonly push: ReturnType<typeof rejecting>;
  }

  function rig(
    o: {
      answer?: (m: SmsGatewayMessage, n: number) => Promise<string>;
      ids?: Partial<Record<string, string | null>>;
      suppress?: boolean;
      pool?: pg.Pool;
      sendTimeoutMs?: number;
      whatsapp?: ChannelProvider;
    } = {},
  ): Rig {
    const gw = gateway(o.answer);
    const audit: { action: string; resourceLocator: string }[] = [];
    const alarms: string[] = [];
    const push = rejecting('push');
    const resolveConfig = (key: string): Promise<string | null> =>
      Promise.resolve(o.ids && key in o.ids ? (o.ids[key] ?? null) : TEMPLATE_ID);
    const deps: ContributionNotifyDeps = {
      pool: {} as never,
      serviceDb: {} as never,
      encryption: {} as never,
      audit: (input) => {
        audit.push({ action: input.action, resourceLocator: input.resourceLocator });
        return Promise.resolve();
      },
      hashRendered: () => Promise.resolve('a'.repeat(64)),
      resolveProviders: () =>
        Promise.resolve({ push: [push, { ...push, id: 'apns' as never }], whatsapp: [o.whatsapp ?? rejecting('whatsapp')], sms: [rejecting('sms')], telegram: [] }),
      now: () => NOW,
      onAlarm: (m) => alarms.push(m),
      ...(o.suppress ? { suppression: () => Promise.resolve({ suppressed: true as const, reason: 'frozen', channels: 'all' as const }) } : {}),
      alertSms: createAlertSmsSender({
        pool: o.pool ?? appPool,
        smsAppClient: gw.client,
        resolveConfig,
        onAlarm: (m) => alarms.push(m),
        ...(o.sendTimeoutMs !== undefined ? { sendTimeoutMs: o.sendTimeoutMs } : {}),
      }),
    };
    return { deps, calls: gw.calls, audit, alarms, push };
  }

  const ctx = (o: { whatsapp?: boolean; sms?: boolean } = {}): MemberFanOutContext => ({
    targets: {
      push: [{ channel: 'push', address: 'tok', platform: 'android' } as SendTarget],
      whatsapp: o.whatsapp ? WA_TARGET : null,
      sms: o.sms === false ? null : SMS_TARGET,
      telegram: null,
    },
    costToggleEnabled: false,
    lastEngagementAt: null,
  });

  async function rowsOf(alertId: string) {
    const { rows } = await ownerPool.query<{ outcome: string; detail: string | null; attempt_count: number; provider_message_id: string | null; locale: string; occasion: string }>(
      `SELECT outcome, detail, attempt_count, provider_message_id, locale, occasion FROM alert_sms_sends WHERE alert_id = $1 ORDER BY occasion`,
      [alertId],
    );
    return rows;
  }
  const sms = (r: Awaited<ReturnType<typeof fanOutAlert>>) => r.trail.find((e) => e.channel === 'sms');

  describe('AC2 — the real send (I2, I4)', () => {
    it.each<[string, ContributionSmsLocale]>([['hi', 'hi'], ['en', 'en']])(
      '⭐ day 10 (%s): ONE gateway call — the locale\'s template id, the values in slot order, the E.164, a CRQID `as<send_id>`; the body = the real `t()`; the row `accepted`; ONE dispatch + ONE sms channel_send line',
      async (_l, locale) => {
        const k = await freshAlert();
        const r = rig({ ids: { [contributionSmsDltConfigKey('deadline_not_recorded', locale === 'hi' ? 'en' : 'hi')]: null } });
        const alert = day10(k, locale);
        const result = await fanOutAlert(r.deps, alert, ctx(), { occasion: 'day_10', jobId: 'job-1', retryCount: 0, retryLimit: 4 });
        expect(result.delivered).toBe(true);
        expect(result.deliveredChannel).toBe('sms');
        expect(r.calls).toHaveLength(1);
        const pool = locale === 'hi' ? 'अर्जुन' : 'C';
        const body = expectedBody('sms.deadline_not_recorded', locale, { pool, date: '05-11-2026' });
        const [rows] = [await rowsOf(k.alertId)];
        expect(rows).toEqual([{ outcome: 'accepted', detail: null, attempt_count: 1, provider_message_id: 'req0001', locale, occasion: 'day_10' }]);
        const sendId = (await ownerPool.query<{ send_id: string }>(`SELECT send_id FROM alert_sms_sends WHERE alert_id = $1`, [k.alertId])).rows[0]!.send_id;
        expect(r.calls[0]).toEqual({
          to: SMS_TARGET.address,
          templateId: TEMPLATE_ID,
          values: [
            { name: 'pool', value: pool },
            { name: 'date', value: '05-11-2026' },
          ],
          body,
          correlationId: `as${sendId.replace(/-/g, '')}`,
        });
        const smsLines = r.audit.filter((a) => a.action === 'alert.channel_send' && a.resourceLocator.includes('channel=sms'));
        expect(smsLines).toHaveLength(1);
        // ONE dispatch line for the SMS send (beside the push rung's two device dispatches).
        expect(r.audit.filter((a) => a.action === 'alert.dispatch' && /sms:sent/.test(a.resourceLocator))).toHaveLength(1);
      },
    );

    it('⭐ a re-run finding the `accepted` row ⇒ `sent` with ⛔ call and ⛔ second channel_send line', async () => {
      const k = await freshAlert();
      const r = rig();
      const call = { occasion: 'day_10', jobId: 'job-1', retryCount: 0, retryLimit: 4 };
      await fanOutAlert(r.deps, day10(k), ctx(), call);
      const again = await fanOutAlert(r.deps, day10(k), ctx(), { ...call, retryCount: 1 });
      expect(again.delivered).toBe(true);
      expect(r.calls).toHaveLength(1);
      expect(r.audit.filter((a) => a.action === 'alert.channel_send' && a.resourceLocator.includes('channel=sms'))).toHaveLength(1);
    });

    it('⭐ I4 — ONE suppressing hook on the deps ⇒ push AND sms `suppressed`, ⛔ row, ⛔ call', async () => {
      const k = await freshAlert();
      const r = rig({ suppress: true });
      const result = await fanOutAlert(r.deps, day10(k), ctx(), { occasion: 'day_10', jobId: 'j', retryCount: 0, retryLimit: 4 });
      expect(result.trail.find((e) => e.channel === 'push')?.outcome).toBe('suppressed');
      expect(sms(result)?.outcome).toBe('suppressed');
      expect(r.push.calls).toBe(0);
      expect(r.calls).toHaveLength(0);
      expect(await rowsOf(k.alertId)).toEqual([]);
    });

    it('⭐ `payment_not_matched` (ZERO slots) SENDS — `values: []` (MG12 superseded in part)', async () => {
      const k = await freshAlert();
      const r = rig();
      const alert = buildContributionMismatchAlert({ alertId: k.alertId, pariwarId: k.pariwarId, memberId: k.memberId, poolId: randomUUID(), reason: 'wrong_pool', locale: 'hi', smsLocale: 'en', now: NOW });
      const result = await fanOutAlert(r.deps, alert, ctx(), { occasion: 'mismatch:wrong_pool' });
      expect(result.delivered).toBe(true);
      expect(r.calls).toHaveLength(1);
      expect(r.calls[0]!.values).toEqual([]);
      expect(r.calls[0]!.body).toBe(expectedBody('sms.payment_not_matched', 'en', {}));
      expect((await rowsOf(k.alertId))[0]).toMatchObject({ outcome: 'accepted', occasion: 'mismatch:wrong_pool', locale: 'en' });
    });

    it('⭐ the escalated pending match sends `payment_not_confirmed` with the pool value', async () => {
      const k = await freshAlert();
      const r = rig();
      const alert = buildPendingMatchRetryAlert({ alertId: k.alertId, pariwarId: k.pariwarId, memberId: k.memberId, poolId: randomUUID(), identity: IDENTITY, tier: 'escalated', locale: 'hi', smsLocale: 'hi', now: NOW });
      const result = await fanOutAlert(r.deps, alert, ctx(), { occasion: 'pending_match_escalated' });
      expect(result.delivered).toBe(true);
      expect(r.calls[0]!.values).toEqual([{ name: 'pool', value: 'अर्जुन' }]);
      expect(r.calls[0]!.body).toBe(expectedBody('sms.payment_not_confirmed', 'hi', { pool: 'अर्जुन' }));
    });

    it('⭐ a PLANTED catalogue drift (the rendered body ≠ the registered text) ⇒ refused `values_mismatch`, ⛔ call, ⛔ row, ONE alarm', async () => {
      const k = await freshAlert();
      const r = rig();
      const alert = day10(k, 'en');
      // A value that renders but the registered text cannot rebuild (an extra slot name) — the drift the runtime guard exists for.
      const drifted = { ...alert, payload_data: { ...alert.payload_data, sms: { message: 'deadline_not_recorded', locale: 'en', values: { pool: 'C', date: '05-11-2026', extra: 'x' } } } } as Alert;
      const result = await fanOutAlert(r.deps, drifted, ctx(), { occasion: 'day_10' });
      expect(sms(result)).toMatchObject({ outcome: 'skipped_no_target', detail: ALERT_SMS_RUNG_DETAIL.valuesMismatch });
      expect(r.calls).toHaveLength(0);
      expect(await rowsOf(k.alertId)).toEqual([]);
      expect(r.alarms.filter((a) => a.includes('values_mismatch'))).toHaveLength(1);
    });
  });

  describe('AC3 — at most once (I1)', () => {
    it('⭐ three attempts of the same (alert, member, occasion) — retry, a sweep re-run (a new job id), the final attempt — ONE gateway call', async () => {
      const k = await freshAlert();
      const r = rig();
      for (const call of [
        { occasion: 'day_10', jobId: 'job-1', retryCount: 0, retryLimit: 4 },
        { occasion: 'day_10', jobId: 'job-1', retryCount: 1, retryLimit: 4 },
        { occasion: 'day_10', jobId: 'sweep-job-2', retryCount: 4, retryLimit: 4 },
      ]) {
        expect((await fanOutAlert(r.deps, day10(k), ctx(), call)).delivered).toBe(true);
      }
      expect(r.calls).toHaveLength(1);
      expect(await rowsOf(k.alertId)).toHaveLength(1);
    });

    it('day 10, the escalated tier and each mismatch reason for the same member and cycle are DIFFERENT occasions (separate texts)', async () => {
      const k = await freshAlert();
      const r = rig();
      await fanOutAlert(r.deps, day10(k), ctx(), { occasion: 'day_10' });
      await fanOutAlert(
        r.deps,
        buildPendingMatchRetryAlert({ alertId: k.alertId, pariwarId: k.pariwarId, memberId: k.memberId, poolId: randomUUID(), identity: IDENTITY, tier: 'escalated', locale: 'hi', now: NOW }),
        ctx(),
        { occasion: 'pending_match_escalated' },
      );
      for (const reason of ['wrong_pool', 'amount_mismatch']) {
        await fanOutAlert(
          r.deps,
          buildContributionMismatchAlert({ alertId: k.alertId, pariwarId: k.pariwarId, memberId: k.memberId, poolId: randomUUID(), reason, locale: 'hi', now: NOW }),
          ctx(),
          { occasion: `mismatch:${reason}` },
        );
      }
      expect(r.calls).toHaveLength(4);
      expect((await rowsOf(k.alertId)).map((x) => x.occasion)).toEqual(['day_10', 'mismatch:amount_mismatch', 'mismatch:wrong_pool', 'pending_match_escalated']);
    });

    it('⭐ a found `attempting` row inside the lease ⇒ `sms_send_in_flight`, ⛔ call, ⛔ write to it, RETRIED; past the lease ⇒ `exhausted:outcome_unknown`, ⛔ call, ONE alarm', async () => {
      const k = await freshAlert();
      await ownerPool.query(
        `INSERT INTO alert_sms_sends (pariwar_id, alert_id, member_id, occasion, message, locale, outcome, claim_token)
         VALUES ($1, $2, $3, 'day_10', 'deadline_not_recorded', 'hi', 'attempting', 'other:0')`,
        [k.pariwarId, k.alertId, k.memberId],
      );
      const r = rig();
      const c = ctx();
      const call = { occasion: 'day_10', jobId: 'job-1', retryCount: 0, retryLimit: 4 };
      const inFlight = await fanOutAlert(r.deps, day10(k), c, call);
      expect(sms(inFlight)?.detail).toBe(ALERT_SMS_RUNG_DETAIL.inFlight);
      expect(shouldRetryFanOut(inFlight, c, call)).toBe(true);
      expect(shouldRetryFanOut(inFlight, c, { ...call, retryCount: 4 })).toBe(false); // the final attempt: recorded in_app_only
      expect(r.calls).toHaveLength(0);
      expect(await rowsOf(k.alertId)).toEqual([expect.objectContaining({ outcome: 'attempting', detail: null })]);
      await ownerPool.query(`UPDATE alert_sms_sends SET updated_at = clock_timestamp() - interval '3 minutes' WHERE alert_id = $1`, [k.alertId]);
      const stale = await fanOutAlert(r.deps, day10(k), c, call);
      expect(sms(stale)).toMatchObject({ outcome: 'error', detail: ALERT_SMS_RUNG_DETAIL.outcomeUnknown });
      expect(shouldRetryFanOut(stale, c, call)).toBe(false);
      expect(r.calls).toHaveLength(0);
      expect(await rowsOf(k.alertId)).toEqual([expect.objectContaining({ outcome: 'error', detail: 'exhausted:outcome_unknown' })]);
      expect(r.alarms.filter((a) => a.includes('past its lease'))).toHaveLength(1);
    });

    it.each<[string, () => Error]>([
      ['a timeout', () => new SmsSendError('t', null, 0, { errorClass: 'api_unavailable', code: 'timeout' })],
      ['a broken 2xx body', () => new SmsSendError('b', null, 200, { errorClass: 'api_unavailable', code: 'body_read' })],
      ['a transport failure (httpStatus 0)', () => new SmsSendError('x', null, 0)],
      ['a 5xx', () => new SmsSendError('5', null, 503)],
    ])('⭐ %s ⇒ FINAL `error` / `exhausted:outcome_unknown:…` + ALARM; ⛔ re-sent on retry (G14)', async (_l, fault) => {
      const k = await freshAlert();
      const r = rig({ answer: () => Promise.reject(fault()) });
      const c = ctx();
      const call = { occasion: 'day_10', jobId: 'job-1', retryCount: 0, retryLimit: 4 };
      const first = await fanOutAlert(r.deps, day10(k), c, call);
      expect(sms(first)).toMatchObject({ outcome: 'error', detail: ALERT_SMS_RUNG_DETAIL.outcomeUnknown });
      expect(shouldRetryFanOut(first, c, call)).toBe(false);
      const [row] = await rowsOf(k.alertId);
      expect(row).toMatchObject({ outcome: 'error' });
      expect(row!.detail).toMatch(/^exhausted:outcome_unknown:api_unavailable:[A-Za-z0-9_.-]+$/);
      await fanOutAlert(r.deps, day10(k), c, { ...call, retryCount: 1 });
      expect(r.calls).toHaveLength(1);
      expect(r.alarms.filter((a) => a.includes('exhausted:outcome_unknown:api_unavailable'))).toHaveLength(1);
    });

    it('⭐ `rate_limited` ⇒ `deferred`, RE-SENT on retry (attempt 2, the same row); on the FINAL attempt finalised `exhausted:rate_limited:…`', async () => {
      const k = await freshAlert();
      const r = rig({ answer: () => Promise.reject(new SmsSendError('r', null, 429)) });
      const c = ctx();
      const first = await fanOutAlert(r.deps, day10(k), c, { occasion: 'day_10', jobId: 'job-1', retryCount: 0, retryLimit: 1 });
      expect(sms(first)).toMatchObject({ outcome: 'rejected', detail: ALERT_SMS_RUNG_DETAIL.rateLimited });
      expect(shouldRetryFanOut(first, c, { occasion: 'day_10', jobId: 'job-1', retryCount: 0, retryLimit: 1 })).toBe(true);
      expect(await rowsOf(k.alertId)).toEqual([expect.objectContaining({ outcome: 'deferred', attempt_count: 1 })]);
      const last = await fanOutAlert(r.deps, day10(k), c, { occasion: 'day_10', jobId: 'job-1', retryCount: 1, retryLimit: 1 });
      expect(r.calls).toHaveLength(2);
      expect(sms(last)?.detail).toBe(ALERT_SMS_RUNG_DETAIL.rateLimited);
      expect(shouldRetryFanOut(last, c, { occasion: 'day_10', jobId: 'job-1', retryCount: 1, retryLimit: 1 })).toBe(false);
      const [row] = await rowsOf(k.alertId);
      expect(row).toMatchObject({ outcome: 'error', attempt_count: 2 });
      expect(row!.detail).toMatch(/^exhausted:rate_limited:/);
      // A later re-enqueue sends ⛔ stale text.
      await fanOutAlert(r.deps, day10(k), c, { occasion: 'day_10', jobId: 'sweep', retryCount: 0, retryLimit: 4 });
      expect(r.calls).toHaveLength(2);
    });

    it('an HMAC failure AFTER an accept ⇒ the row stays `accepted`, the rung `sent`, ⛔ re-send (T6)', async () => {
      const k = await freshAlert();
      const r = rig();
      const deps: ContributionNotifyDeps = { ...r.deps, hashRendered: () => Promise.reject(new Error('kms down')) };
      const result = await fanOutAlert(deps, day10(k), ctx(), { occasion: 'day_10', jobId: 'j', retryCount: 0, retryLimit: 4 });
      expect(sms(result)?.outcome).toBe('sent');
      expect(await rowsOf(k.alertId)).toEqual([expect.objectContaining({ outcome: 'accepted' })]);
      await fanOutAlert(deps, day10(k), ctx(), { occasion: 'day_10', jobId: 'j', retryCount: 1, retryLimit: 4 });
      expect(r.calls).toHaveLength(1);
    });

    it('⭐ the seam holding ONE connection of a `max: 2` pool ⇒ ⛔ deadlock, ⛔ throw (the send completes or `sms_send_state_unavailable`)', async () => {
      const k = await freshAlert();
      const small = new pg.Pool({ connectionString: DATABASE_URL, options: '-c role=twt_app', max: 2, connectionTimeoutMillis: 3000 });
      const held = await small.connect();
      try {
        const r = rig({ pool: small });
        const result = await fanOutAlert(r.deps, day10(k), ctx(), { occasion: 'day_10', jobId: 'j', retryCount: 0, retryLimit: 4 });
        expect(['sent', 'error']).toContain(sms(result)?.outcome);
        if (sms(result)?.outcome === 'error') expect(sms(result)?.detail).toBe(ALERT_SMS_RUNG_DETAIL.stateUnavailable);
      } finally {
        held.release();
        await small.end();
      }
    });

    it('⭐ F3 — the seam NEVER throws: a lifecycle hook that REJECTS inside the SMS dispatch ⇒ `sms_send_state_unavailable`, RETRIED, ALARMED, ⛔ call', async () => {
      const k = await freshAlert();
      const r = rig();
      const deps: ContributionNotifyDeps = { ...r.deps, suppression: () => Promise.reject(new Error('member-state read failed')) };
      const c = ctx();
      const call = { occasion: 'day_10', jobId: 'j', retryCount: 0, retryLimit: 4 };
      const result = await fanOutAlert(deps, day10(k), c, call);
      expect(sms(result)).toMatchObject({ outcome: 'error', detail: ALERT_SMS_RUNG_DETAIL.stateUnavailable });
      expect(shouldRetryFanOut(result, c, call)).toBe(true);
      expect(r.calls).toHaveLength(0);
      expect(await rowsOf(k.alertId)).toEqual([]);
      expect(r.alarms.some((a) => a.includes(ALERT_SMS_RUNG_DETAIL.stateUnavailable))).toBe(true);
    });

    it('⭐ the send state UNAVAILABLE (the pool refuses every connection) ⇒ `sms_send_state_unavailable`, RETRIED, ALARMED, ⛔ call — the seam never throws', async () => {
      const k = await freshAlert();
      const dead = new pg.Pool({ connectionString: 'postgresql://nobody:x@127.0.0.1:1/none', connectionTimeoutMillis: 200, max: 1 });
      try {
        const r = rig({ pool: dead });
        const c = ctx();
        const call = { occasion: 'day_10', jobId: 'j', retryCount: 0, retryLimit: 4 };
        const result = await fanOutAlert(r.deps, day10(k), c, call);
        expect(sms(result)).toMatchObject({ outcome: 'error', detail: ALERT_SMS_RUNG_DETAIL.stateUnavailable });
        expect(shouldRetryFanOut(result, c, call)).toBe(true);
        expect(r.calls).toHaveLength(0);
        expect(r.alarms.some((a) => a.includes(ALERT_SMS_RUNG_DETAIL.stateUnavailable))).toBe(true);
      } finally {
        await dead.end();
      }
    });
  });

  describe('AC4 — every gateway answer names its outcome (table-driven; I5)', () => {
    const cases: readonly [string, () => Promise<string>, { outcome: string; detail: string | undefined; row: RegExp | null; alarm: boolean; retry: boolean }][] = [
      ['accepted', () => Promise.resolve('reqabc'), { outcome: 'sent', detail: undefined, row: null, alarm: false, retry: false }],
      ['invalid_number (local format)', () => Promise.reject(new SmsSendError('l', null, -1, { errorClass: 'invalid_number', code: 'format' })), { outcome: 'rejected', detail: 'rejected_invalid_number', row: /^invalid_number:format$/, alarm: false, retry: false }],
      ['carrier_reject', () => Promise.reject(new SmsSendError('c', null, -1, { errorClass: 'carrier_reject', code: 'E003' })), { outcome: 'rejected', detail: 'rejected_unreachable', row: /^carrier_reject:/, alarm: false, retry: false }],
      ['auth (401)', () => Promise.reject(new SmsSendError('a', null, 401)), { outcome: 'rejected', detail: 'auth:gateway', row: /^auth:/, alarm: true, retry: false }],
      ['dlt_template_not_approved (gateway)', () => Promise.reject(new SmsSendError('d', null, -1, { errorClass: 'dlt_template_not_approved', code: '211' })), { outcome: 'rejected', detail: 'dlt_template_not_approved:gateway', row: /^dlt_template_not_approved:211$/, alarm: true, retry: false }],
      ['unknown:no_request_id', () => Promise.reject(new SmsSendError('u', null, 200, { errorClass: 'unknown', code: 'no_request_id' })), { outcome: 'error', detail: 'exhausted:outcome_unknown', row: /^exhausted:outcome_unknown:unknown:no_request_id$/, alarm: true, retry: false }],
      ['rate_limited', () => Promise.reject(new SmsSendError('r', null, 429)), { outcome: 'rejected', detail: 'rate_limited', row: /^rate_limited:/, alarm: false, retry: true }],
    ];
    it.each(cases)('%s', async (_l, answer, want) => {
      const k = await freshAlert();
      const r = rig({ answer });
      const c = ctx();
      const call = { occasion: 'day_10', jobId: 'j', retryCount: 0, retryLimit: 4 };
      const result = await fanOutAlert(r.deps, day10(k), c, call);
      expect(sms(result)?.outcome).toBe(want.outcome);
      expect(sms(result)?.detail).toBe(want.detail);
      expect(shouldRetryFanOut(result, c, call)).toBe(want.retry);
      const [row] = await rowsOf(k.alertId);
      if (want.row === null) expect(row).toMatchObject({ outcome: 'accepted', provider_message_id: 'reqabc' });
      else expect(row!.detail).toMatch(want.row);
      expect(r.alarms.length > 0).toBe(want.alarm);
      // The recorded trail keeps ONLY the allow-listed literal — ⛔ the gateway's code.
      const recorded = serializeFanOutResult(result).trail as string[];
      const smsEntry = recorded.find((e) => e.startsWith('sms:'))!;
      expect(smsEntry).toBe(`sms:0:${want.outcome}${want.detail !== undefined ? `:${want.detail}` : ''}`);
    });

    it.each<[string, Partial<Record<string, string | null>>, string]>([
      ['the hi id unset', { [contributionSmsDltConfigKey('deadline_not_recorded', 'hi')]: null }, 'config:dlt_template_id_missing:hi'],
      ['the hi id blank', { [contributionSmsDltConfigKey('deadline_not_recorded', 'hi')]: '  ' }, 'config:dlt_template_id_missing:hi'],
      ['the hi id malformed (a 19-digit DLT TE id)', { [contributionSmsDltConfigKey('deadline_not_recorded', 'hi')]: '1107161234567890123' }, 'dlt_template_not_approved:template_id_malformed'],
    ])('⭐ a config refusal (%s) ⇒ ⛔ row, ⛔ dispatch, ⛔ call, terminal; ONE alarm for N members (⛔ N)', async (_l, ids, detail) => {
      const r = rig({ ids });
      const keys = await Promise.all([freshAlert(), freshAlert(), freshAlert()]);
      for (const k of keys) {
        const result = await fanOutAlert(r.deps, day10(k), ctx(), { occasion: 'day_10', jobId: 'j', retryCount: 0, retryLimit: 4 });
        expect(sms(result)).toEqual({ channel: 'sms', attempt: 0, outcome: 'skipped_no_target', detail });
        expect(shouldRetryFanOut(result, ctx(), { occasion: 'day_10', jobId: 'j', retryCount: 0, retryLimit: 4 })).toBe(false);
        expect(await rowsOf(k.alertId)).toEqual([]);
      }
      expect(r.calls).toHaveLength(0);
      expect(r.alarms.filter((a) => a.includes(detail))).toHaveLength(1);
      expect(r.audit.filter((a) => /sms:/.test(a.resourceLocator) && a.action === 'alert.channel_send')).toEqual([]);
    });

    it('⭐ AC5 (I3) — with the en id unset, a member who chose `en` ends `config:dlt_template_id_missing:en` — ⛔ the hi template', async () => {
      const k = await freshAlert();
      const r = rig({ ids: { [contributionSmsDltConfigKey('deadline_not_recorded', 'en')]: null } });
      const result = await fanOutAlert(r.deps, day10(k, 'en'), ctx(), { occasion: 'day_10' });
      expect(sms(result)?.detail).toBe('config:dlt_template_id_missing:en');
      expect(r.calls).toHaveLength(0);
    });

    it('a Secret Manager TRANSIENT before any row ⇒ `config_unavailable:secret_manager`, RETRIED, ⛔ row; on the final attempt recorded in_app_only', async () => {
      const k = await freshAlert();
      const gw = gateway();
      const r = rig();
      const deps: ContributionNotifyDeps = {
        ...r.deps,
        alertSms: createAlertSmsSender({
          pool: appPool,
          smsAppClient: gw.client,
          resolveConfig: () => Promise.reject(Object.assign(new Error('blip'), { code: 14 })),
        }),
      };
      const c = ctx();
      const call = { occasion: 'day_10', jobId: 'j', retryCount: 0, retryLimit: 4 };
      const result = await fanOutAlert(deps, day10(k), c, call);
      expect(sms(result)?.detail).toBe(ALERT_SMS_RUNG_DETAIL.configUnavailable);
      expect(shouldRetryFanOut(result, c, call)).toBe(true);
      expect(shouldRetryFanOut(result, c, { ...call, retryCount: 4 })).toBe(false);
      expect(await rowsOf(k.alertId)).toEqual([]);
      expect(gw.calls).toHaveLength(0);
    });
  });

  describe('AC6 — §3.4\'s window (FS9 (a))', () => {
    it('⭐ a WhatsApp-target member whose WhatsApp did not end `sent`: attempts 0–1 wait (⛔ call, ⛔ row, retried); attempt 2 SENDS', async () => {
      const k = await freshAlert();
      const r = rig();
      const c = ctx({ whatsapp: true });
      for (const retryCount of [0, 1]) {
        const call = { occasion: 'day_10', jobId: 'j', retryCount, retryLimit: 4 };
        const result = await fanOutAlert(r.deps, day10(k), c, call);
        expect(sms(result)?.detail).toBe(ALERT_SMS_RUNG_DETAIL.awaitingWaWindow);
        expect(shouldRetryFanOut(result, c, call)).toBe(true);
      }
      expect(r.calls).toHaveLength(0);
      expect(await rowsOf(k.alertId)).toEqual([]);
      const third = await fanOutAlert(r.deps, day10(k), c, { occasion: 'day_10', jobId: 'j', retryCount: 2, retryLimit: 4 });
      expect(third.delivered).toBe(true);
      expect(r.calls).toHaveLength(1);
    });

    it('⭐ the FINAL attempt sends even before attempt 2 (`retryLimit: 1, retryCount: 1`); missing metadata ⇒ sent', async () => {
      const a = await freshAlert();
      const b = await freshAlert();
      const r = rig();
      const c = ctx({ whatsapp: true });
      expect((await fanOutAlert(r.deps, day10(a), c, { occasion: 'day_10', jobId: 'j', retryCount: 1, retryLimit: 1 })).delivered).toBe(true);
      expect((await fanOutAlert(r.deps, day10(b), c, { occasion: 'day_10' })).delivered).toBe(true);
      expect(r.calls).toHaveLength(2);
    });

    it('a member with NO WhatsApp target is texted on attempt 0; an FS3 REFUSAL (WhatsApp target, refusing provider) waits (FS9 (a), ⛔ (a′))', async () => {
      const a = await freshAlert();
      const b = await freshAlert();
      const r = rig({ whatsapp: rejecting('whatsapp', 'whatsapp_template_not_approved') });
      const call = { occasion: 'day_10', jobId: 'j', retryCount: 0, retryLimit: 4 };
      expect((await fanOutAlert(r.deps, day10(a), ctx(), call)).delivered).toBe(true);
      const refused = await fanOutAlert(r.deps, day10(b), ctx({ whatsapp: true }), call);
      expect(sms(refused)?.detail).toBe(ALERT_SMS_RUNG_DETAIL.awaitingWaWindow);
      expect(r.calls).toHaveLength(1);
    });

    it('an unprovisioned id ⇒ terminal on attempt 0 (⛔ wait)', async () => {
      const k = await freshAlert();
      const r = rig({ ids: { [contributionSmsDltConfigKey('deadline_not_recorded', 'hi')]: null } });
      const c = ctx({ whatsapp: true });
      const call = { occasion: 'day_10', jobId: 'j', retryCount: 0, retryLimit: 4 };
      const result = await fanOutAlert(r.deps, day10(k), c, call);
      expect(sms(result)?.detail).toBe('config:dlt_template_id_missing:hi');
      expect(shouldRetryFanOut(result, c, call)).toBe(false);
    });

    it('⭐ T7 — two concurrent fan-outs on ONE deps object at attempts 0 and 2 ⇒ only the attempt-2 member is sent', async () => {
      const a = await freshAlert();
      const b = await freshAlert();
      const r = rig();
      const c = ctx({ whatsapp: true });
      const [ra, rb] = await Promise.all([
        fanOutAlert(r.deps, day10(a), c, { occasion: 'day_10', jobId: 'ja', retryCount: 0, retryLimit: 4 }),
        fanOutAlert(r.deps, day10(b), c, { occasion: 'day_10', jobId: 'jb', retryCount: 2, retryLimit: 4 }),
      ]);
      expect(ra.delivered).toBe(false);
      expect(rb.delivered).toBe(true);
      expect(r.calls).toHaveLength(1);
      expect(await rowsOf(a.alertId)).toEqual([]);
    });
  });
});
