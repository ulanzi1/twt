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
import { degradedMode, schema } from '@twt/domain';
import { t } from '@twt/i18n';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { ALERT_SMS_RUNG_DETAIL } from '../src/scheduler/alert-sms-details.js';
import { createAlertSmsSender } from '../src/scheduler/alert-sms-send.js';
import type { ClaimDltSmsPreflight } from '../src/scheduler/claim-dlt-sms-send.js';
import {
  fanOutAlert,
  serializeFanOutResult,
  shouldRetryFanOut,
  type ContributionNotifyDeps,
  type MemberFanOutContext,
} from '../src/scheduler/contribution-notify.js';
import {
  buildContributionMismatchAlert,
  buildCycleOpenAlert,
  buildDeadlineReminderAlert,
  buildPendingMatchRetryAlert,
} from '../src/scheduler/contribution-notify-triggers.js';
import { CONTRIBUTION_SMS_TEMPLATES, contributionSmsDltConfigKey, type ContributionSmsLocale } from '../src/scheduler/contribution-sms-templates.js';

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

/** Story 5.8b — a provider that always ACCEPTS — counted (the ladder delivers on it). */
function accepting(channel: Channel): ChannelProvider & { calls: number } {
  const p = {
    id: (channel === 'push' ? 'fcm' : channel) as never,
    channel,
    scope: 'global' as const,
    calls: 0,
    send() {
      p.calls += 1;
      return Promise.resolve({ channel, provider: p.id, status: 'accepted' as const, providerMessageId: `${channel}-ok` });
    },
    getStatus: (messageId: string) => Promise.resolve({ providerMessageId: messageId, state: 'unknown' as const }),
  };
  return p;
}

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

/** A scripted `connect()` step: succeed, fail like a refused socket, or HOLD until released (and say when it was reached). */
type ConnectStep = 'ok' | 'fail' | { readonly hold: Promise<void>; readonly reached?: () => void };

/**
 * A pool whose n-th `connect()` follows `plan` (then `ok`) — so a leg can drive the seam's scopes ONE AT A TIME: #1 is the read-only
 * lookup, #2 the begin, #3… the finalise tries / the re-lookup after `taken`. (Code review 2026-10-25, C3-P1 / C3-P6: the interleavings
 * the sequential legs could not reach.)
 */
function plannedPool(base: pg.Pool, plan: readonly ConnectStep[]): pg.Pool & { readonly connects: () => number } {
  let n = 0;
  return new Proxy(base, {
    get(target, prop) {
      // How many scopes the seam OPENED — a retry loop is proved by its count, ⛔ by the final state alone.
      if (prop === 'connects') return () => n;
      if (prop === 'connect') {
        return async (...args: unknown[]) => {
          const step = plan[n] ?? 'ok';
          n += 1;
          if (step === 'fail') throw Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' });
          if (step !== 'ok') {
            step.reached?.();
            await step.hold;
          }
          return (target.connect as (...a: unknown[]) => Promise<pg.PoolClient>).apply(target, args);
        };
      }
      const v = Reflect.get(target, prop) as unknown;
      return typeof v === 'function' ? (v as (...a: unknown[]) => unknown).bind(target) : v;
    },
  }) as pg.Pool & { readonly connects: () => number };
}

/** A latch: `await it.promise`, `it.open()` from elsewhere. */
function latch(): { promise: Promise<void>; open: () => void } {
  let open!: () => void;
  const promise = new Promise<void>((res) => {
    open = res;
  });
  return { promise, open };
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

  /** Story 5.8b — the BRIDGED cycle-open as the producer builds it (time-critical, the family's name in the two boxes). */
  const bridgedOpen = (k: { pariwarId: string; alertId: string; memberId: string }, smsLocale: ContributionSmsLocale = 'hi'): Alert =>
    buildCycleOpenAlert({
      alertId: k.alertId,
      pariwarId: k.pariwarId,
      memberId: k.memberId,
      poolId: randomUUID(),
      identity: IDENTITY,
      timeCritical: true,
      locale: 'hi',
      smsLocale,
      smsNameBoxes: ['Rame', 'sh K'],
      now: NOW,
    });

  interface Rig {
    readonly deps: ContributionNotifyDeps;
    readonly calls: SmsGatewayMessage[];
    readonly audit: { action: string; resourceLocator: string }[];
    readonly alarms: string[];
    readonly push: ReturnType<typeof rejecting>;
    /** The `body` of every message handed to `hashRendered` (what the audit HMAC covers). */
    readonly hashed: string[];
  }

  function rig(
    o: {
      answer?: (m: SmsGatewayMessage, n: number) => Promise<string>;
      ids?: Partial<Record<string, string | null>>;
      suppress?: boolean;
      pool?: pg.Pool;
      sendTimeoutMs?: number;
      whatsapp?: ChannelProvider;
      /** A gateway CLIENT of the test's own (an unconfigured / half-configured one). */
      client?: SmsAppClient;
      /** The pauses between finalise tries (default `[0, 0]` — ⛔ real sleeps in a test). */
      finaliseBackoffMs?: readonly number[];
      smsPreflight?: ClaimDltSmsPreflight;
      /** Replaces the Secret Manager read (default: a map over `ids`, else `TEMPLATE_ID`). */
      resolveConfig?: (configKey: string) => Promise<string | null>;
      /** Story 5.8b — the push rung ACCEPTS (default: rejecting, so the ladder advances). */
      pushAccepts?: boolean;
      /** Story 5.8b — the bridge's Super Admin switch read (default: ON — the tests that drive the bridge). */
      readBridgeSwitch?: () => Promise<boolean>;
    } = {},
  ): Rig {
    const gw = gateway(o.answer);
    const audit: { action: string; resourceLocator: string }[] = [];
    const alarms: string[] = [];
    const hashed: string[] = [];
    const push = o.pushAccepts ? accepting('push') : rejecting('push');
    const resolveConfig =
      o.resolveConfig ?? ((key: string): Promise<string | null> => Promise.resolve(o.ids && key in o.ids ? (o.ids[key] ?? null) : TEMPLATE_ID));
    const deps: ContributionNotifyDeps = {
      pool: {} as never,
      serviceDb: {} as never,
      encryption: {} as never,
      audit: (input) => {
        audit.push({ action: input.action, resourceLocator: input.resourceLocator });
        return Promise.resolve();
      },
      hashRendered: (rendered) => {
        hashed.push(rendered.body);
        return Promise.resolve('a'.repeat(64));
      },
      resolveProviders: () =>
        Promise.resolve({ push: [push, { ...push, id: 'apns' as never }], whatsapp: [o.whatsapp ?? rejecting('whatsapp')], sms: [rejecting('sms')], telegram: [] }),
      now: () => NOW,
      onAlarm: (m) => alarms.push(m),
      readBridgeSwitch: o.readBridgeSwitch ?? (() => Promise.resolve(true)),
      ...(o.suppress ? { suppression: () => Promise.resolve({ suppressed: true as const, reason: 'frozen', channels: 'all' as const }) } : {}),
      alertSms: createAlertSmsSender({
        pool: o.pool ?? appPool,
        smsAppClient: o.client ?? gw.client,
        resolveConfig,
        onAlarm: (m) => alarms.push(m),
        finaliseBackoffMs: o.finaliseBackoffMs ?? [0, 0],
        ...(o.sendTimeoutMs !== undefined ? { sendTimeoutMs: o.sendTimeoutMs } : {}),
        ...(o.smsPreflight !== undefined ? { smsPreflight: o.smsPreflight } : {}),
      }),
    };
    return { deps, calls: gw.calls, audit, alarms, push, hashed };
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
  /** EVERY column a reader could disturb, from a DIFFERENT connection (the owner pool) — for snapshots. */
  async function fullRow(alertId: string, memberId?: string) {
    const { rows } = await ownerPool.query<{
      send_id: string;
      member_id: string;
      outcome: string;
      detail: string | null;
      attempt_count: number;
      claim_token: string;
      provider_message_id: string | null;
      message: string;
      locale: string;
      updated_at: Date;
    }>(
      `SELECT send_id, member_id, outcome, detail, attempt_count, claim_token, provider_message_id, message, locale, updated_at
         FROM alert_sms_sends WHERE alert_id = $1 ${memberId !== undefined ? 'AND member_id = $2' : ''} ORDER BY occasion, member_id`,
      memberId !== undefined ? [alertId, memberId] : [alertId],
    );
    return rows[0];
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

    it('⭐ C3-P20 — a PLANTED BODY drift (the catalogue renders text the registered DLT text cannot rebuild) ⇒ refused `values_mismatch`, ⛔ call, ⛔ row, ONE alarm', async () => {
      const k = await freshAlert();
      const r = rig();
      // The slot NAMES are right; only the registered wording differs from what `t()` renders — the arm the extra-slot leg below cannot reach.
      const entry = CONTRIBUTION_SMS_TEMPLATES['deadline_not_recorded']['en'] as { registeredText: string };
      const original = entry.registeredText;
      entry.registeredText = `${original} (drifted)`;
      try {
        const result = await fanOutAlert(r.deps, day10(k, 'en'), ctx(), { occasion: 'day_10' });
        expect(sms(result)).toMatchObject({ outcome: 'skipped_no_target', detail: ALERT_SMS_RUNG_DETAIL.valuesMismatch });
      } finally {
        entry.registeredText = original;
      }
      expect(r.calls).toHaveLength(0);
      expect(await rowsOf(k.alertId)).toEqual([]);
      const warned = r.alarms.filter((a) => a.includes('values_mismatch'));
      expect(warned).toHaveLength(1);
      // The wording must not claim a single member (a catalogue drift hits EVERY member of this message × locale) nor "no text to any" — it names both.
      expect(warned[0]).toContain('catalogue drifted');
      expect(warned[0]).toContain('only this one block');
      expect(warned[0]).toContain(k.alertId);
    });

    it('⭐ a PLANTED slot-name drift (an extra value the registered text has no slot for) ⇒ refused `values_mismatch`, ⛔ call, ⛔ row, ONE alarm', async () => {
      const k = await freshAlert();
      const r = rig();
      const alert = day10(k, 'en');
      // A value that renders but the registered text cannot rebuild (an extra slot name) — the names-length arm of the runtime guard.
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
      // Review C3-P26: SEPARATE texts — day 10, the escalated notice and the (shared) not-matched text are three DIFFERENT bodies; four identical
      // bodies would have passed the old count-only assertion.
      // Precisely which: day 10, escalated and the not-matched text each differ from the other two; the two mismatch reasons share ONE text.
      const [dayTen, escalated, mismatchA, mismatchB] = r.calls.map((c) => c.body);
      expect(new Set([dayTen, escalated, mismatchA]).size).toBe(3);
      expect(mismatchB).toBe(mismatchA);
      expect(new Set(r.calls.map((c) => c.body)).size).toBe(3);
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
      const seeded = await fullRow(k.alertId);
      expect(seeded).toMatchObject({ outcome: 'attempting', detail: null, claim_token: 'other:0', attempt_count: 1 });
      const inFlight = await fanOutAlert(r.deps, day10(k), c, call);
      expect(sms(inFlight)?.detail).toBe(ALERT_SMS_RUNG_DETAIL.inFlight);
      expect(shouldRetryFanOut(inFlight, c, call)).toBe(true);
      expect(shouldRetryFanOut(inFlight, c, { ...call, retryCount: 4 })).toBe(false); // the final attempt: recorded in_app_only
      expect(r.calls).toHaveLength(0);
      // Review C3-P21: ⛔ write to it — EVERY column (a reader that bumped `updated_at` would extend the lease; one that bumped
      // `attempt_count` / `claim_token` would steal the row) is byte-identical.
      expect(await fullRow(k.alertId)).toEqual(seeded);
      // 100 s old is STILL inside the 2-minute lease (any lease below that would call it stale).
      await ownerPool.query(`UPDATE alert_sms_sends SET updated_at = clock_timestamp() - interval '100 seconds' WHERE alert_id = $1`, [k.alertId]);
      const aged = await fullRow(k.alertId);
      expect(sms(await fanOutAlert(r.deps, day10(k), c, call))?.detail).toBe(ALERT_SMS_RUNG_DETAIL.inFlight);
      expect(await fullRow(k.alertId)).toEqual(aged);
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
      // Review C3-P3: the re-run FINDS the frozen row — the SAME rung, terminal, ⛔ a call, ⛔ a second alarm (the result was discarded).
      const again = await fanOutAlert(r.deps, day10(k), c, { ...call, retryCount: 1 });
      expect(sms(again)).toMatchObject({ outcome: 'error', detail: ALERT_SMS_RUNG_DETAIL.outcomeUnknown });
      expect(shouldRetryFanOut(again, c, { ...call, retryCount: 1 })).toBe(false);
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
      // A later re-enqueue sends ⛔ stale text — and (review C2-P1 / C3-P3) the FROZEN row must read TERMINAL: the old rung reported the
      // retryable word `rate_limited`, which put the member back on the retry set (up to 4 job retries re-dispatching push + WhatsApp).
      const sweepCall = { occasion: 'day_10', jobId: 'sweep', retryCount: 0, retryLimit: 4 };
      const sweep = await fanOutAlert(r.deps, day10(k), c, sweepCall);
      expect(r.calls).toHaveLength(2);
      expect(sms(sweep)).toMatchObject({ outcome: 'rejected', detail: ALERT_SMS_RUNG_DETAIL.rateLimitedFinal });
      expect(shouldRetryFanOut(sweep, c, sweepCall)).toBe(false);
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
        // Review C3-P1: it must SEND. A seam that needed a SECOND connection at once would starve for the 3 s connect timeout and land on
        // `error / sms_send_state_unavailable` — the old assertion ACCEPTED that, so it could not fail on the very bug it names.
        expect(sms(result)).toMatchObject({ outcome: 'sent' });
        expect(r.calls).toHaveLength(1);
        expect(await rowsOf(k.alertId)).toEqual([expect.objectContaining({ outcome: 'accepted', attempt_count: 1 })]);
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
    interface Want {
      /** The trail (rung) outcome + detail. */
      readonly outcome: string;
      readonly detail: string | undefined;
      /** The STORED row (review C3-P4): its outcome, and its detail grammar. */
      readonly rowOutcome: string;
      readonly row: RegExp | null;
      /** The ONE alarm word, or `null` ⇒ no alarm at all. */
      readonly alarm: string | null;
      readonly retry: boolean;
      /** A fragment of the gateway's own code that must NEVER reach the trail, an alarm or an audit line. */
      readonly leak: string | null;
      /** What a re-run that FINDS the row reports, when it differs from the first run. */
      readonly rerun?: { readonly outcome: string; readonly detail: string | undefined };
    }
    const cases: readonly [string, () => Promise<string>, Want][] = [
      ['accepted', () => Promise.resolve('reqabc'), { outcome: 'sent', detail: undefined, rowOutcome: 'accepted', row: null, alarm: null, retry: false, leak: null }],
      ['invalid_number (local format)', () => Promise.reject(new SmsSendError('l', null, -1, { errorClass: 'invalid_number', code: 'format' })), { outcome: 'rejected', detail: 'rejected_invalid_number', rowOutcome: 'rejected_invalid_number', row: /^invalid_number:format$/, alarm: null, retry: false, leak: 'format' }],
      ['carrier_reject', () => Promise.reject(new SmsSendError('c', null, -1, { errorClass: 'carrier_reject', code: 'E003' })), { outcome: 'rejected', detail: 'rejected_unreachable', rowOutcome: 'rejected_unreachable', row: /^carrier_reject:/, alarm: null, retry: false, leak: 'E003' }],
      ['auth (401)', () => Promise.reject(new SmsSendError('a', null, 401)), { outcome: 'rejected', detail: 'auth:gateway', rowOutcome: 'error', row: /^auth:/, alarm: 'auth:gateway', retry: false, leak: '401' }],
      ['dlt_template_not_approved (gateway)', () => Promise.reject(new SmsSendError('d', null, -1, { errorClass: 'dlt_template_not_approved', code: '211' })), { outcome: 'rejected', detail: 'dlt_template_not_approved:gateway', rowOutcome: 'error', row: /^dlt_template_not_approved:211$/, alarm: 'dlt_template_not_approved:gateway', retry: false, leak: '211' }],
      ['unknown:no_request_id', () => Promise.reject(new SmsSendError('u', null, 200, { errorClass: 'unknown', code: 'no_request_id' })), { outcome: 'error', detail: 'exhausted:outcome_unknown', rowOutcome: 'error', row: /^exhausted:outcome_unknown:unknown:no_request_id$/, alarm: 'exhausted:outcome_unknown:unknown', retry: false, leak: 'no_request_id' }],
      ['rate_limited', () => Promise.reject(new SmsSendError('r', null, 429)), { outcome: 'rejected', detail: 'rate_limited', rowOutcome: 'deferred', row: /^rate_limited:/, alarm: null, retry: true, leak: null }],
    ];
    // Review C3-P4: the table runs at a NON-final AND at the FINAL attempt (retryLimit 4) — the final attempt turns the ONE re-sendable
    // class into a frozen `error` row, and nothing else changes.
    describe.each([
      ['non-final', 0],
      ['FINAL', 4],
    ] as const)('%s attempt (retryCount %i of 4)', (_name, retryCount) => {
      it.each(cases)('%s', async (_l, answer, base) => {
        const final = retryCount >= 4;
        const want: Want =
          final && base.rowOutcome === 'deferred'
            ? { ...base, rowOutcome: 'error', row: /^exhausted:rate_limited:/, retry: false, rerun: { outcome: 'rejected', detail: ALERT_SMS_RUNG_DETAIL.rateLimitedFinal } }
            : base;
        const k = await freshAlert();
        const r = rig({ answer });
        const c = ctx();
        const call = { occasion: 'day_10', jobId: 'j', retryCount, retryLimit: 4 };
        const result = await fanOutAlert(r.deps, day10(k), c, call);
        expect(sms(result)?.outcome).toBe(want.outcome);
        expect(sms(result)?.detail).toBe(want.detail);
        expect(shouldRetryFanOut(result, c, call)).toBe(want.retry);
        // The STORED row, not only the trail: its outcome is what the lookup, the correlator and the freeze trigger key on.
        const [row] = await rowsOf(k.alertId);
        expect(row).toMatchObject({ outcome: want.rowOutcome, attempt_count: 1 });
        if (want.row === null) expect(row).toMatchObject({ provider_message_id: 'reqabc' });
        else {
          expect(row!.detail).toMatch(want.row);
          expect(row!.provider_message_id).toBeNull();
        }
        // The ONE alarm — and it names the class (any unrelated alarm used to satisfy a boolean).
        if (want.alarm === null) expect(r.alarms).toEqual([]);
        else expect(r.alarms.filter((a) => a.includes(want.alarm!))).toHaveLength(1);
        const recorded = serializeFanOutResult(result).trail as string[];
        expect(recorded.find((e) => e.startsWith('sms:'))).toBe(`sms:0:${want.outcome}${want.detail !== undefined ? `:${want.detail}` : ''}`);
        // PII / provider text (review C3-P16, C3-P4): the number never reaches the trail, an alarm, an audit line; nor the gateway's code.
        const surfaces = JSON.stringify({ trail: recorded, alarms: r.alarms, audit: r.audit });
        expect(surfaces).not.toContain('9876543210');
        // A WHOLE-token match: the surfaces carry UUIDs, and a bare `401` / `211` is a substring of hex ids (a flaky false failure).
        if (want.leak !== null) expect(surfaces).not.toMatch(new RegExp(`(?<![0-9A-Za-z_-])${want.leak}(?![0-9A-Za-z_-])`));
        // A re-run FINDS a frozen row (review C3-P3 / C2-P1): the SAME rung (or the stated one), TERMINAL, ⛔ a call, ⛔ a second alarm.
        if (!want.retry) {
          const sweep = { occasion: 'day_10', jobId: 'sweep', retryCount: 0, retryLimit: 4 };
          const alarmsBefore = r.alarms.length;
          const again = await fanOutAlert(r.deps, day10(k), c, sweep);
          expect(sms(again)).toMatchObject(want.rerun ?? { outcome: want.outcome, ...(want.detail !== undefined ? { detail: want.detail } : {}) });
          expect(shouldRetryFanOut(again, c, sweep)).toBe(false);
          expect(r.calls).toHaveLength(1);
          expect(r.alarms).toHaveLength(alarmsBefore);
        }
      });
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
      // Review C3-P11: `dispatch` writes `alert:<id>;channel=sms;provider=…` — the old `/sms:/` filter could never match, so it was empty whatever happened.
      expect(r.audit.filter((a) => a.action === 'alert.channel_send' && a.resourceLocator.includes('channel=sms'))).toEqual([]);
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

  // ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  // Code review 2026-10-25 — the legs the first pass could not fail on (chunk 3 of the review; C3-P1 … C3-P26).
  // ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  describe('review 2026-10-25 — AC3: the ORDER and the RACE, through the seam (C3-P1)', () => {
    it('⭐ begin COMMITS before the gateway call: from ANOTHER connection the row is `attempting` with THIS attempt\'s claim token while the call is in flight', async () => {
      const k = await freshAlert();
      let seen: Awaited<ReturnType<typeof fullRow>>;
      const r = rig({
        answer: async () => {
          seen = await fullRow(k.alertId); // a different connection (the owner pool): only a COMMITTED row is visible
          return 'req0001';
        },
      });
      await fanOutAlert(r.deps, day10(k), ctx(), { occasion: 'day_10', jobId: 'job-A', retryCount: 0, retryLimit: 4 });
      expect(seen!).toMatchObject({ outcome: 'attempting', claim_token: 'job-A:0', attempt_count: 1, provider_message_id: null });
      expect(await fullRow(k.alertId)).toMatchObject({ outcome: 'accepted', claim_token: 'job-A:0', provider_message_id: 'req0001' });
    });

    /** Worker A is inside its gateway call (its row committed `attempting`); worker B has passed its read-only lookup and is HELD at its begin. */
    async function raceScaffold(plan: (bAtBegin: () => void, holdB: Promise<void>) => readonly ConnectStep[]) {
      const k = await freshAlert();
      const holdA = latch();
      const aInside = latch();
      const bAtBegin = latch();
      const holdB = latch();
      const rA = rig({
        answer: async () => {
          aInside.open();
          await holdA.promise;
          return 'reqA0001';
        },
      });
      const rB = rig({ pool: plannedPool(appPool, plan(bAtBegin.open, holdB.promise)) });
      const c = ctx();
      const bRun = fanOutAlert(rB.deps, day10(k), c, { occasion: 'day_10', jobId: 'job-B', retryCount: 0, retryLimit: 4 });
      await bAtBegin.promise; // B's lookup found NOTHING; it is about to begin
      const aRun = fanOutAlert(rA.deps, day10(k), c, { occasion: 'day_10', jobId: 'job-A', retryCount: 0, retryLimit: 4 });
      await aInside.promise; // A has begun (COMMITTED) and is in the gateway call
      return { k, c, rA, rB, aRun, bRun, holdA, holdB };
    }

    it('⭐ TWO workers (two seams, two gateway doubles) on the SAME key: B passed its lookup BEFORE A began, then its begin LOSES (`taken`) ⇒ ONE gateway call in total, A `sent`, B `sms_send_in_flight` (retried), ONE row `accepted`, attempt_count 1', async () => {
      const x = await raceScaffold((reached, hold) => ['ok', { hold, reached }]);
      x.holdB.open();
      const resB = await x.bRun;
      expect(sms(resB)).toMatchObject({ outcome: 'skipped_no_target', detail: ALERT_SMS_RUNG_DETAIL.inFlight });
      expect(shouldRetryFanOut(resB, x.c, { occasion: 'day_10', jobId: 'job-B', retryCount: 0, retryLimit: 4 })).toBe(true);
      expect(x.rB.calls).toHaveLength(0);
      x.holdA.open();
      const resA = await x.aRun;
      expect(sms(resA)).toMatchObject({ outcome: 'sent' });
      expect(x.rA.calls).toHaveLength(1);
      expect(await fullRow(x.k.alertId)).toMatchObject({ outcome: 'accepted', attempt_count: 1, claim_token: 'job-A:0', provider_message_id: 'reqA0001' });
      // ⛔ a second row, ⛔ a second text
      expect((await ownerPool.query('SELECT count(*)::int AS n FROM alert_sms_sends WHERE alert_id = $1', [x.k.alertId])).rows[0].n).toBe(1);
    });

    it('⭐ …and when B\'s re-read after `taken` FAILS ⇒ `sms_send_state_unavailable` (retried), ⛔ call, the alarm names the fault CLASS (C2-P9)', async () => {
      const x = await raceScaffold((reached, hold) => ['ok', { hold, reached }, 'fail']);
      x.holdB.open();
      const resB = await x.bRun;
      expect(sms(resB)).toMatchObject({ outcome: 'error', detail: ALERT_SMS_RUNG_DETAIL.stateUnavailable });
      expect(x.rB.calls).toHaveLength(0);
      expect(x.rB.alarms.some((a) => a.includes('code:ECONNREFUSED'))).toBe(true);
      x.holdA.open();
      await x.aRun;
      expect(x.rA.calls).toHaveLength(1);
    });
  });

  describe('review 2026-10-25 — the seam when the record misbehaves AFTER or around the gateway (C3-P6; C2-P2, C2-P3, C2-P9, C2-P10)', () => {
    const SEND_ID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/;

    it('⭐ begin THROWS ⇒ `sms_send_state_unavailable` (retried), ⛔ call, ⛔ row; the alarm carries the fault CLASS and ⛔ its message', async () => {
      const k = await freshAlert();
      const r = rig({ pool: plannedPool(appPool, ['ok', 'fail']) });
      const c = ctx();
      const call = { occasion: 'day_10', jobId: 'j', retryCount: 0, retryLimit: 4 };
      const result = await fanOutAlert(r.deps, day10(k), c, call);
      expect(sms(result)).toMatchObject({ outcome: 'error', detail: ALERT_SMS_RUNG_DETAIL.stateUnavailable });
      expect(shouldRetryFanOut(result, c, call)).toBe(true);
      expect(r.calls).toHaveLength(0);
      expect(await rowsOf(k.alertId)).toEqual([]);
      const alarm = r.alarms.find((a) => a.includes(ALERT_SMS_RUNG_DETAIL.stateUnavailable));
      expect(alarm).toContain('code:ECONNREFUSED');
      expect(alarm).not.toContain('connect ECONNREFUSED'); // the class, never the message (it can carry a value)
    });

    it('⭐ the gateway ACCEPTS, then EVERY finalise try fails ⇒ the rung is still `sent`, the row stays `attempting`, ONE alarm with the SEND ID and the fault class (C2-P3: ops can reconcile)', async () => {
      const k = await freshAlert();
      const pool = plannedPool(appPool, ['ok', 'ok', 'fail', 'fail', 'fail']); // lookup, begin, then the 3 finalise tries
      const r = rig({ pool });
      const result = await fanOutAlert(r.deps, day10(k), ctx(), { occasion: 'day_10', jobId: 'j', retryCount: 0, retryLimit: 4 });
      expect(sms(result)).toMatchObject({ outcome: 'sent' });
      expect(r.calls).toHaveLength(1);
      expect(pool.connects()).toBe(5); // exactly pauses + 1 finalise tries — ⛔ a fourth
      expect(await fullRow(k.alertId)).toMatchObject({ outcome: 'attempting', provider_message_id: null });
      const alarm = r.alarms.filter((a) => a.includes('could not be finalised'));
      expect(alarm).toHaveLength(1);
      expect(alarm[0]).toMatch(SEND_ID);
      expect(alarm[0]).toContain('code:ECONNREFUSED');
      expect(alarm[0]).toContain('gateway request req0001'); // the only handle ops has on an accepted text whose row never took the write
    });

    it('⭐ …and a finalise that FAILS TWICE then succeeds is retried (not alarmed) AFTER REAL PAUSES — the backoff is a wait between tries, not back-to-back tries (patch-diff #8)', async () => {
      const k = await freshAlert();
      const pool = plannedPool(appPool, ['ok', 'ok', 'fail', 'fail']);
      const r = rig({ pool, finaliseBackoffMs: [120, 120] });
      const started = Date.now();
      const result = await fanOutAlert(r.deps, day10(k), ctx(), { occasion: 'day_10', jobId: 'j', retryCount: 0, retryLimit: 4 });
      const elapsed = Date.now() - started;
      expect(sms(result)).toMatchObject({ outcome: 'sent' });
      expect(pool.connects()).toBe(5); // lookup, begin, fail, fail, ok
      expect(elapsed).toBeGreaterThanOrEqual(230); // two 120 ms pauses (timer slack 10 ms) — a loop that drops the wait finishes in tens of ms
      expect(await fullRow(k.alertId)).toMatchObject({ outcome: 'accepted', provider_message_id: 'req0001' });
      expect(r.alarms.filter((a) => a.includes('could not be finalised'))).toEqual([]);
    });

    it('⭐ …a try that THREW, then a later try finds the record already moved on (`false`) ⇒ the alarm says the write is UNCONFIRMED, ⛔ "finalise lost" (the first try may have committed — patch-diff #7)', async () => {
      const k = await freshAlert();
      const atRetry = latch();
      const release = latch();
      const r = rig({ pool: plannedPool(appPool, ['ok', 'ok', 'fail', { hold: release.promise, reached: atRetry.open }]), finaliseBackoffMs: [0, 0] });
      const run = fanOutAlert(r.deps, day10(k), ctx(), { occasion: 'day_10', jobId: 'j', retryCount: 0, retryLimit: 4 });
      await atRetry.promise; // try 1 threw; try 2 is about to run the CAS
      await ownerPool.query(`UPDATE alert_sms_sends SET claim_token = 'someone-else' WHERE alert_id = $1`, [k.alertId]);
      release.open();
      expect(sms(await run)).toMatchObject({ outcome: 'sent' });
      const alarms = r.alarms.filter((a) => a.includes('unconfirmed'));
      expect(alarms).toHaveLength(1);
      expect(alarms[0]).toMatch(SEND_ID);
      expect(alarms[0]).toContain('gateway request req0001');
      expect(r.alarms.filter((a) => a.includes('finalise lost'))).toEqual([]);
    });

    it('⭐ a STALL past the lease: another worker STALE-finalises the row while this one is in the gateway call ⇒ this finalise is LOST: ALARM with the send id, the rung STILL says what the gateway said (`sent`), the row stays frozen `exhausted:outcome_unknown` (C2-P2)', async () => {
      const k = await freshAlert();
      const c = ctx();
      const rB = rig();
      let resB: Awaited<ReturnType<typeof fanOutAlert>> | undefined;
      const rA = rig({
        answer: async () => {
          await ownerPool.query(`UPDATE alert_sms_sends SET updated_at = clock_timestamp() - interval '3 minutes' WHERE alert_id = $1`, [k.alertId]);
          resB = await fanOutAlert(rB.deps, day10(k), c, { occasion: 'day_10', jobId: 'job-B', retryCount: 0, retryLimit: 4 });
          return 'reqA0001';
        },
      });
      const resA = await fanOutAlert(rA.deps, day10(k), c, { occasion: 'day_10', jobId: 'job-A', retryCount: 0, retryLimit: 4 });
      expect(sms(resB!)).toMatchObject({ outcome: 'error', detail: ALERT_SMS_RUNG_DETAIL.outcomeUnknown });
      expect(rB.calls).toHaveLength(0);
      expect(sms(resA)).toMatchObject({ outcome: 'sent' });
      expect(await fullRow(k.alertId)).toMatchObject({ outcome: 'error', detail: 'exhausted:outcome_unknown', provider_message_id: null });
      const lost = rA.alarms.filter((a) => a.includes('finalise lost'));
      expect(lost).toHaveLength(1);
      expect(lost[0]).toMatch(SEND_ID);
      expect(lost[0]).toContain('gateway request reqA0001');
    });

    it('⭐ …and the OTHER order: B reads `stale`, A finalises `accepted` FIRST, then B\'s stale-finalise finds the row moved on ⇒ B reports the ROW\'S truth (`sent`), ⛔ an "outcome unknown" alarm, ⛔ a second text (C2-P2)', async () => {
      const k = await freshAlert();
      const c = ctx();
      const holdA = latch();
      const aInside = latch();
      const bAtStaleFinalise = latch();
      const holdB = latch();
      const rA = rig({
        answer: async () => {
          aInside.open();
          await holdA.promise;
          return 'reqA0001';
        },
      });
      const rB = rig({ pool: plannedPool(appPool, ['ok', { hold: holdB.promise, reached: bAtStaleFinalise.open }]) });
      const aRun = fanOutAlert(rA.deps, day10(k), c, { occasion: 'day_10', jobId: 'job-A', retryCount: 0, retryLimit: 4 });
      await aInside.promise;
      await ownerPool.query(`UPDATE alert_sms_sends SET updated_at = clock_timestamp() - interval '3 minutes' WHERE alert_id = $1`, [k.alertId]);
      const bRun = fanOutAlert(rB.deps, day10(k), c, { occasion: 'day_10', jobId: 'job-B', retryCount: 0, retryLimit: 4 });
      await bAtStaleFinalise.promise; // B's lookup said `stale`; it is about to finalise it
      holdA.open();
      expect(sms(await aRun)).toMatchObject({ outcome: 'sent' }); // A's finalise wins the row
      holdB.open();
      const resB = await bRun;
      expect(sms(resB)).toMatchObject({ outcome: 'sent' });
      expect(rB.alarms.filter((a) => a.includes('past its lease'))).toEqual([]);
      expect(rA.calls.length + rB.calls.length).toBe(1);
      expect(await fullRow(k.alertId)).toMatchObject({ outcome: 'accepted', provider_message_id: 'reqA0001' });
    });

    describe('patch-diff #5/#6 — the lookup-driven exits when the record misbehaves (a scope that fails mid-flow is `sms_send_state_unavailable`, RETRIED, ⛔ a text, ⛔ a throw)', () => {
      const seed = async (k: { pariwarId: string; alertId: string; memberId: string }, row: 'stale' | 'expired'): Promise<void> => {
        await ownerPool.query(
          row === 'stale'
            ? `INSERT INTO alert_sms_sends (pariwar_id, alert_id, member_id, occasion, message, locale, outcome, claim_token, updated_at)
               VALUES ($1, $2, $3, 'day_10', 'deadline_not_recorded', 'hi', 'attempting', 'other:0', clock_timestamp() - interval '3 minutes')`
            : `INSERT INTO alert_sms_sends (pariwar_id, alert_id, member_id, occasion, message, locale, outcome, detail, claim_token, updated_at)
               VALUES ($1, $2, $3, 'day_10', 'deadline_not_recorded', 'hi', 'deferred', 'rate_limited:429', 'other:0', clock_timestamp() - interval '31 minutes')`,
          [k.pariwarId, k.alertId, k.memberId],
        );
      };
      const call = { occasion: 'day_10', jobId: 'j', retryCount: 0, retryLimit: 4 };

      it.each<['stale' | 'expired', string]>([
        ['stale', 'the stale-finalise scope THROWS'],
        ['expired', 'the expired give-up scope THROWS'],
      ])('⭐ %s row: %s ⇒ `sms_send_state_unavailable`, the row is left as it was, ⛔ a call', async (row) => {
        const k = await freshAlert();
        await seed(k, row);
        const before = await fullRow(k.alertId);
        const r = rig({ pool: plannedPool(appPool, ['ok', 'fail']) }); // #1 the lookup, #2 the move that fails
        const c = ctx();
        const result = await fanOutAlert(r.deps, day10(k), c, call);
        expect(sms(result)).toMatchObject({ outcome: 'error', detail: ALERT_SMS_RUNG_DETAIL.stateUnavailable });
        expect(shouldRetryFanOut(result, c, call)).toBe(true);
        expect(r.calls).toHaveLength(0);
        expect(await fullRow(k.alertId)).toEqual(before);
      });

      it.each<['stale' | 'expired', string]>([
        ['stale', 'UPDATE alert_sms_sends SET outcome = \'error\', detail = \'exhausted:outcome_unknown\', claim_token = \'x\', updated_at = clock_timestamp() WHERE alert_id = $1'],
        ['expired', 'UPDATE alert_sms_sends SET outcome = \'error\', detail = \'exhausted:rate_limited:expired\', claim_token = \'x\', updated_at = clock_timestamp() WHERE alert_id = $1'],
      ])('⭐ %s row: the move finds the row already moved on (`false`) and the RE-READ fails ⇒ `sms_send_state_unavailable` (⛔ the answer of a row the seam never saw — patch-diff #6)', async (row, moveOn) => {
        const k = await freshAlert();
        await seed(k, row);
        const atMove = latch();
        const release = latch();
        const r = rig({ pool: plannedPool(appPool, ['ok', { hold: release.promise, reached: atMove.open }, 'fail']) }); // #1 lookup, #2 held move, #3 the re-read
        const c = ctx();
        const run = fanOutAlert(r.deps, day10(k), c, call);
        await atMove.promise;
        await ownerPool.query(moveOn, [k.alertId]);
        release.open();
        const result = await run;
        expect(sms(result)).toMatchObject({ outcome: 'error', detail: ALERT_SMS_RUNG_DETAIL.stateUnavailable });
        expect(shouldRetryFanOut(result, c, call)).toBe(true);
        expect(r.calls).toHaveLength(0);
      });
    });

    it('⭐ C2-P10 — a fault AFTER the gateway answered (the alarm SINK throws while the seam reports a provider-final `auth` answer) does NOT throw the answer away: the rung is the gateway\'s (`rejected / auth:gateway`, terminal), ⛔ the retryable `sms_send_state_unavailable`, and the seam ⛔ throws', async () => {
      const k = await freshAlert();
      const c = ctx();
      const gw = gateway(() => Promise.reject(new SmsSendError('a', null, 401)));
      const deps: ContributionNotifyDeps = {
        ...rig().deps,
        alertSms: createAlertSmsSender({
          pool: appPool,
          smsAppClient: gw.client,
          resolveConfig: () => Promise.resolve(TEMPLATE_ID),
          finaliseBackoffMs: [0, 0],
          onAlarm: () => {
            throw new Error('alarm sink down');
          },
        }),
      };
      const call = { occasion: 'day_10', jobId: 'j', retryCount: 0, retryLimit: 4 };
      const result = await fanOutAlert(deps, day10(k), c, call);
      expect(sms(result)).toMatchObject({ outcome: 'rejected', detail: ALERT_SMS_RUNG_DETAIL.gatewayAuth });
      expect(shouldRetryFanOut(result, c, call)).toBe(false);
      expect(gw.calls).toHaveLength(1);
      expect(await fullRow(k.alertId)).toMatchObject({ outcome: 'error' });
    });
  });

  describe('review 2026-10-25 — the FINAL attempt and the exits that never reach the gateway (C3-P5, C3-P7, C3-P8; C2-P6, C2-P7, C2-P8, C2-P14)', () => {
    const down = (alarms: string[]): ContributionNotifyDeps['alertSms'] =>
      createAlertSmsSender({
        pool: appPool,
        smsAppClient: gateway().client,
        resolveConfig: () => Promise.reject(Object.assign(new Error('blip'), { code: 14 })),
        onAlarm: (m) => alarms.push(m),
      });

    it('⭐ attempt 0 is rate-limited (row `deferred`); the FINAL attempt finds the Secret Manager down ⇒ the deferred row is GIVEN UP `error / exhausted:config_unavailable:secret_manager`, ONE alarm, and a later sweep sends ⛔ a stale text (C3-P5, C2-P6)', async () => {
      const k = await freshAlert();
      const c = ctx();
      const r1 = rig({ answer: () => Promise.reject(new SmsSendError('r', null, 429)) });
      await fanOutAlert(r1.deps, day10(k), c, { occasion: 'day_10', jobId: 'job-1', retryCount: 0, retryLimit: 1 });
      expect(await rowsOf(k.alertId)).toEqual([expect.objectContaining({ outcome: 'deferred' })]);
      const alarms: string[] = [];
      const lastCall = { occasion: 'day_10', jobId: 'job-1', retryCount: 1, retryLimit: 1 };
      const last = await fanOutAlert({ ...r1.deps, alertSms: down(alarms) }, day10(k), c, lastCall);
      expect(sms(last)).toMatchObject({ outcome: 'skipped_no_target', detail: ALERT_SMS_RUNG_DETAIL.configUnavailable });
      expect(shouldRetryFanOut(last, c, lastCall)).toBe(false);
      expect(await rowsOf(k.alertId)).toEqual([expect.objectContaining({ outcome: 'error', detail: 'exhausted:config_unavailable:secret_manager' })]);
      expect(alarms.filter((a) => a.includes('FINAL attempt'))).toHaveLength(1);
      // the config is back; a sweep re-enqueue (a new job id) finds the FROZEN row — ⛔ a text
      const r2 = rig();
      const sweep = await fanOutAlert(r2.deps, day10(k), c, { occasion: 'day_10', jobId: 'sweep', retryCount: 0, retryLimit: 4 });
      expect(r2.calls).toHaveLength(0);
      // The gateway NEVER took it, so the found row reads `rate_limited_final` ("definitely not sent") — ⛔ `outcome_unknown` ("may have
      // been"): the patch-diff review's #5 (the SM give-up row fell through `foundFinalRung` to the wrong word).
      expect(sms(sweep)).toMatchObject({ outcome: 'rejected', detail: ALERT_SMS_RUNG_DETAIL.rateLimitedFinal });
    });

    it('the Secret Manager down through the FINAL attempt, N members ⇒ ONE alarm (⛔ N), each ends `config_unavailable:secret_manager`, ⛔ call, ⛔ row; on a NON-final attempt there is ⛔ alarm (it will be retried)', async () => {
      const alarms: string[] = [];
      const base = rig().deps;
      const deps = { ...base, alertSms: down(alarms) };
      const keys = await Promise.all([freshAlert(), freshAlert(), freshAlert()]);
      const c = ctx();
      for (const k of keys) {
        const res = await fanOutAlert(deps, day10(k), c, { occasion: 'day_10', jobId: 'j', retryCount: 4, retryLimit: 4 });
        expect(sms(res)?.detail).toBe(ALERT_SMS_RUNG_DETAIL.configUnavailable);
        expect(await rowsOf(k.alertId)).toEqual([]);
      }
      expect(alarms.filter((a) => a.includes('FINAL attempt'))).toHaveLength(1);
      const quiet: string[] = [];
      const k2 = await freshAlert();
      await fanOutAlert({ ...base, alertSms: down(quiet) }, day10(k2), c, { occasion: 'day_10', jobId: 'j', retryCount: 0, retryLimit: 4 });
      expect(quiet).toEqual([]);
    });

    it.each<[string, () => Parameters<typeof rig>[0], (k: { pariwarId: string; alertId: string; memberId: string }) => Alert, { outcome: string; detail: string; alarm: string }]>([
      ['the gateway UNCONFIGURED', () => ({ client: { isConfigured: () => false, messaging: () => ({ send: () => Promise.resolve('x') }) } }), (k) => day10(k), { outcome: 'skipped_no_target', detail: 'config:sms_gateway_unconfigured', alarm: 'config:sms_gateway_unconfigured' }],
      ['`messaging()` THROWS (a half-configured client)', () => ({ client: { isConfigured: () => true, messaging: () => { throw new Error('half-configured'); } } }), (k) => day10(k), { outcome: 'skipped_no_target', detail: 'config:sms_messaging_unavailable', alarm: 'config:sms_messaging_unavailable' }],
      ['a Secret Manager PERMISSION fault (code 7, not a transient)', () => ({ resolveConfig: () => Promise.reject(Object.assign(new Error('denied'), { code: 7 })) }), (k) => day10(k), { outcome: 'skipped_no_target', detail: 'config:secret_manager', alarm: 'config:secret_manager' }],
      ['a pool value over its 30-character slot', () => ({}), (k) => {
        const a = day10(k);
        return { ...a, payload_data: { ...a.payload_data, sms: { message: 'deadline_not_recorded', locale: 'hi', values: { pool: 'अ'.repeat(31), date: '05-11-2026' } } } } as Alert;
      }, { outcome: 'skipped_no_target', detail: 'dlt_template_not_approved:value_too_long', alarm: 'value_too_long' }],
      ['a value the template needs is MISSING (the render THROWS — `-394` item 3\'s residual)', () => ({}), (k) => {
        const a = day10(k);
        return { ...a, payload_data: { ...a.payload_data, sms: { message: 'deadline_not_recorded', locale: 'hi', values: { pool: 'अर्जुन' } } } } as Alert;
      }, { outcome: 'error', detail: 'exhausted:outcome_unknown', alarm: 'could not be rendered' }],
      ['ANY other throw inside prepare (not the render) — nothing was attempted', () => ({ client: { isConfigured: () => { throw new Error('boom'); }, messaging: () => ({ send: () => Promise.resolve('x') }) } }), (k) => day10(k), { outcome: 'error', detail: 'sms_not_attempted', alarm: 'the prepare step threw' }],
      ['a PROVEN pre-flight fault (the memo refuses with the SEND key)', () => ({ smsPreflight: { memo: { get: () => Promise.resolve({ ok: false, transient: false, reason: 'auth' }) } as never, readsWithSendKey: true } }), (k) => day10(k), { outcome: 'skipped_no_target', detail: 'auth:preflight', alarm: 'auth:preflight' }],
    ])('⭐ %s ⇒ ⛔ call, ⛔ row, ⛔ dispatch line, terminal, ONE alarm', async (_l, opts, alertFor, want) => {
      const k = await freshAlert();
      const r = rig(opts());
      const c = ctx();
      const call = { occasion: 'day_10', jobId: 'j', retryCount: 0, retryLimit: 4 };
      const result = await fanOutAlert(r.deps, alertFor(k), c, call);
      expect(sms(result)).toEqual({ channel: 'sms', attempt: 0, outcome: want.outcome, detail: want.detail });
      expect(shouldRetryFanOut(result, c, call)).toBe(false);
      expect(r.calls).toHaveLength(0);
      expect(await rowsOf(k.alertId)).toEqual([]);
      expect(r.audit.filter((a) => a.action === 'alert.channel_send' && a.resourceLocator.includes('channel=sms'))).toEqual([]);
      expect(r.alarms.filter((a) => a.includes(want.alarm))).toHaveLength(1);
      expect(JSON.stringify(r.alarms)).not.toContain('9876543210');
    });

    it('⭐ an UNPROVEN pre-flight fault (the memo\'s key is not the send key) and a TRANSIENT one are SENT (fail open) with ONE prospective pre-flight warning, the row `accepted` (MG5 extended; C3-P7)', async () => {
      for (const verdict of [{ ok: false, transient: false, reason: 'auth' }, { ok: false, transient: true }]) {
        const k = await freshAlert();
        const readsWithSendKey = verdict.transient === true; // for the non-transient verdict the key is NOT the send key ⇒ unproven
        const r = rig({ smsPreflight: { memo: { get: () => Promise.resolve(verdict) } as never, readsWithSendKey } });
        const result = await fanOutAlert(r.deps, day10(k), ctx(), { occasion: 'day_10', jobId: 'j', retryCount: 0, retryLimit: 4 });
        expect(sms(result)).toMatchObject({ outcome: 'sent' });
        expect(r.calls).toHaveLength(1);
        expect(await rowsOf(k.alertId)).toEqual([expect.objectContaining({ outcome: 'accepted' })]);
        const warned = r.alarms.filter((a) => a.includes('pre-flight unproven'));
        expect(warned).toHaveLength(1);
        // Review C2-P7: the warning must not claim that NO text is sent — one WAS.
        expect(warned[0]).not.toContain('no text is sent to any member');
      }
    });

    it.each(['waiting', 'suppressed', 'sent'] as const)('FD-P4 — an unproven preflight warning is prospective when the text is %s', async (mode) => {
      const k = await freshAlert();
      const r = rig({ suppress: mode === 'suppressed', smsPreflight: { memo: { get: () => Promise.resolve({ ok: false, transient: true }) } as never, readsWithSendKey: true } });
      const result = await fanOutAlert(r.deps, day10(k), ctx({ whatsapp: mode === 'waiting' }), { occasion: 'day_10', jobId: 'j', retryCount: 0, retryLimit: 4 });
      expect(r.calls).toHaveLength(mode === 'sent' ? 1 : 0);
      expect(sms(result)?.outcome).toBe(mode === 'sent' ? 'sent' : mode === 'suppressed' ? 'suppressed' : 'skipped_no_target');
      const warnings = r.alarms.filter(a => a.includes('pre-flight unproven'));
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain('sending is permitted');
      expect(warnings[0]).not.toMatch(/WAS sent|SENT despite/);
      expect(await rowsOf(k.alertId)).toHaveLength(mode === 'sent' ? 1 : 0);
    });

    it('⭐ C2-P7 — a per-member VALUE refusal does not claim that "no text is sent to any member"; a config refusal does', async () => {
      const k = await freshAlert();
      const r = rig();
      const a = day10(k);
      const long = { ...a, payload_data: { ...a.payload_data, sms: { message: 'deadline_not_recorded', locale: 'hi', values: { pool: 'अ'.repeat(31), date: '05-11-2026' } } } } as Alert;
      await fanOutAlert(r.deps, long, ctx(), { occasion: 'day_10' });
      const tooLong = r.alarms.filter((x) => x.includes('value_too_long'))[0];
      expect(tooLong).not.toContain('no text is sent to any member');
      expect(tooLong).toContain('other members are unaffected');
      expect(tooLong).toContain(k.alertId); // the alarm is the only place ops learns WHICH one tripped it
      const k2 = await freshAlert();
      const r2 = rig({ ids: { [contributionSmsDltConfigKey('deadline_not_recorded', 'hi')]: null } });
      await fanOutAlert(r2.deps, day10(k2), ctx(), { occasion: 'day_10' });
      expect(r2.alarms.filter((x) => x.includes('config:dlt_template_id_missing:hi'))[0]).toContain('no text is sent to any member');
    });

    it('⭐ C2-P8 — a gateway-WIDE refusal (a 401 for every member) is ONE alarm per window, ⛔ one per member; each member\'s row is still its own `error` row', async () => {
      const r = rig({ answer: () => Promise.reject(new SmsSendError('a', null, 401)) });
      const keys = await Promise.all([freshAlert(), freshAlert(), freshAlert()]);
      for (const k of keys) {
        const res = await fanOutAlert(r.deps, day10(k), ctx(), { occasion: 'day_10', jobId: 'j', retryCount: 0, retryLimit: 4 });
        expect(sms(res)).toMatchObject({ outcome: 'rejected', detail: ALERT_SMS_RUNG_DETAIL.gatewayAuth });
        expect(await rowsOf(k.alertId)).toEqual([expect.objectContaining({ outcome: 'error' })]);
      }
      expect(r.calls).toHaveLength(3);
      expect(r.alarms.filter((a) => a.includes('auth:gateway'))).toHaveLength(1);
      expect(r.alarms.filter((a) => a.includes('auth:gateway'))[0]).toContain(keys[0]!.alertId); // the alarm names the FIRST one seen
    });

    it('⭐ patch-diff #4 — a gateway `dlt_template_not_approved` is ONE alarm per TEMPLATE: three members of one template ⇒ 1; the same refusal on ANOTHER template ⇒ its own alarm (⛔ hidden under the first)', async () => {
      const r = rig({ answer: () => Promise.reject(new SmsSendError('d', null, -1, { errorClass: 'dlt_template_not_approved', code: '211' })) });
      const keys = await Promise.all([freshAlert(), freshAlert(), freshAlert()]);
      for (const k of keys) await fanOutAlert(r.deps, day10(k), ctx(), { occasion: 'day_10', jobId: 'j', retryCount: 0, retryLimit: 4 });
      const k4 = await freshAlert();
      const other = buildContributionMismatchAlert({ alertId: k4.alertId, pariwarId: k4.pariwarId, memberId: k4.memberId, poolId: randomUUID(), reason: 'wrong_pool', locale: 'hi', smsLocale: 'hi', now: NOW });
      await fanOutAlert(r.deps, other, ctx(), { occasion: 'mismatch:wrong_pool', jobId: 'j', retryCount: 0, retryLimit: 4 });
      expect(r.calls).toHaveLength(4);
      const warned = r.alarms.filter((a) => a.includes('dlt_template_not_approved:gateway'));
      expect(warned).toHaveLength(2);
      expect(warned[0]).toContain(contributionSmsDltConfigKey('deadline_not_recorded', 'hi'));
      expect(warned[1]).toContain(contributionSmsDltConfigKey('payment_not_matched', 'hi'));
    });

    it('⭐ patch-diff (Edge) — an alarm SINK that throws on the FIRST refusal must not swallow the next member\'s alarm for the whole window: the window is armed only AFTER the sink took it', async () => {
      const landed: string[] = [];
      let thrown = false;
      const sender = createAlertSmsSender({
        pool: appPool,
        smsAppClient: gateway().client,
        resolveConfig: () => Promise.resolve(null), // every template id unset ⇒ `config:dlt_template_id_missing:hi`
        onAlarm: (m) => {
          if (!thrown) {
            thrown = true;
            throw new Error('sink down');
          }
          landed.push(m);
        },
      });
      const deps = { ...rig().deps, alertSms: sender };
      const [k1, k2] = await Promise.all([freshAlert(), freshAlert()]);
      const call = { occasion: 'day_10', jobId: 'j', retryCount: 0, retryLimit: 4 };
      for (const k of [k1!, k2!]) expect(sms(await fanOutAlert(deps, day10(k), ctx(), call))).toMatchObject({ outcome: expect.stringMatching(/error|skipped_no_target/) }); // the seam NEVER throws
      expect(landed.filter((m) => m.includes('config:dlt_template_id_missing:hi'))).toHaveLength(1);
    });

    // ⚠ There is NO live leg for `config:sms_messaging_unavailable` AFTER begin: the provider wraps every `messaging.send` fault into an
    // `unknown:*` answer (a plain throw ends `exhausted:outcome_unknown` — exercised above), so the claim core's own post-send
    // `config:sms_messaging_unavailable` is unreachable through a real client. The settle branch is pinned in `alert-sms-send.test.ts`.
  });

  describe('review 2026-10-25 — scoping, tokens, timeouts and the wait/lookup order (C3-P10, C3-P12, C3-P13, C3-P14, C3-P22)', () => {
    it('⭐ C3-P10 — TWO members on ONE alert, the SAME occasion: each is texted once and neither reads the other\'s row (checklist 12(b): a `member_id` dropped from lookup / re-claim turns this red)', async () => {
      const k1 = await freshAlert();
      const k2 = { ...k1, memberId: randomUUID() }; // the SAME alert and Pariwar, another member
      const r = rig();
      const call = { occasion: 'day_10', jobId: 'j', retryCount: 0, retryLimit: 4 };
      expect((await fanOutAlert(r.deps, day10(k1), ctx(), call)).delivered).toBe(true);
      expect((await fanOutAlert(r.deps, day10(k2), ctx(), call)).delivered).toBe(true);
      expect(r.calls).toHaveLength(2); // member 2 did NOT find member 1's `accepted` row and record `sent` with no text
      expect(new Set(r.calls.map((c) => c.correlationId)).size).toBe(2);
      // re-runs find each member's OWN row
      await fanOutAlert(r.deps, day10(k1), ctx(), { ...call, retryCount: 1 });
      await fanOutAlert(r.deps, day10(k2), ctx(), { ...call, retryCount: 1 });
      expect(r.calls).toHaveLength(2);
      expect((await ownerPool.query('SELECT count(DISTINCT member_id)::int AS n FROM alert_sms_sends WHERE alert_id = $1', [k1.alertId])).rows[0].n).toBe(2);
    });

    it('⭐ C3-P10 — …and the RE-CLAIM is scoped to the member too: BOTH members are `deferred`; member 1\'s retry re-sends member 1 only and member 2\'s row is UNTOUCHED (a re-claim that drops `member_id` flips both rows — patch-diff #11: with member 2 `accepted` the mutant had nothing to flip)', async () => {
      const k1 = await freshAlert();
      const k2 = { ...k1, memberId: randomUUID() };
      const r = rig({ answer: (_m, n) => (n <= 2 ? Promise.reject(new SmsSendError('r', null, 429)) : Promise.resolve(`req${n}`)) });
      const call = { occasion: 'day_10', jobId: 'j', retryCount: 0, retryLimit: 4 };
      await fanOutAlert(r.deps, day10(k1), ctx(), call); // member 1: 429 ⇒ deferred
      await fanOutAlert(r.deps, day10(k2), ctx(), call); // member 2: 429 ⇒ deferred
      expect((await fullRow(k1.alertId, k1.memberId))?.outcome).toBe('deferred');
      expect((await fullRow(k2.alertId, k2.memberId))?.outcome).toBe('deferred');
      await fanOutAlert(r.deps, day10(k1), ctx(), { ...call, retryCount: 1 });
      expect(r.calls).toHaveLength(3);
      expect((await fullRow(k1.alertId, k1.memberId))).toMatchObject({ outcome: 'accepted', attempt_count: 2 });
      expect((await fullRow(k2.alertId, k2.memberId))).toMatchObject({ outcome: 'deferred', attempt_count: 1, claim_token: 'j:0' });
    });

    it('C3-P12 — the claim token is `${jobId}:${retryCount}` (⛔ the bare job id — pg-boss keeps it across retries); missing metadata ⇒ a uuid, DISTINCT per send (⛔ `undefined:undefined`)', async () => {
      const a = await freshAlert();
      const b = await freshAlert();
      const c2 = await freshAlert();
      const r = rig();
      await fanOutAlert(r.deps, day10(a), ctx(), { occasion: 'day_10', jobId: 'job-1', retryCount: 0, retryLimit: 4 });
      await fanOutAlert(r.deps, day10(b), ctx(), { occasion: 'day_10' });
      await fanOutAlert(r.deps, day10(c2), ctx(), { occasion: 'day_10' });
      expect((await fullRow(a.alertId))?.claim_token).toBe('job-1:0');
      const tokens = [(await fullRow(b.alertId))!.claim_token, (await fullRow(c2.alertId))!.claim_token];
      for (const tok of tokens) expect(tok).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      expect(new Set(tokens).size).toBe(2);
    });

    it('⭐ C3-P13 — a gateway that NEVER answers: the seam\'s own 10 s race (here 50 ms) ends it `error / exhausted:outcome_unknown:api_unavailable:timeout`, ONE alarm, terminal, ⛔ re-sent', async () => {
      const k = await freshAlert();
      const r = rig({ answer: () => new Promise<string>(() => undefined), sendTimeoutMs: 50 });
      const c = ctx();
      const call = { occasion: 'day_10', jobId: 'j', retryCount: 0, retryLimit: 4 };
      const result = await fanOutAlert(r.deps, day10(k), c, call);
      expect(sms(result)).toMatchObject({ outcome: 'error', detail: ALERT_SMS_RUNG_DETAIL.outcomeUnknown });
      expect(shouldRetryFanOut(result, c, call)).toBe(false);
      expect((await rowsOf(k.alertId))[0]).toMatchObject({ outcome: 'error', detail: 'exhausted:outcome_unknown:api_unavailable:timeout' });
      expect(r.alarms.filter((a) => a.includes('exhausted:outcome_unknown:api_unavailable'))).toHaveLength(1);
      await fanOutAlert(r.deps, day10(k), c, { ...call, retryCount: 1 });
      expect(r.calls).toHaveLength(1);
    });

    it('⭐ C3-P14 — the WhatsApp WAIT comes AFTER the lookup: a WhatsApp-target member whose text already WENT is `sent` on attempt 0 (⛔ `sms_awaiting_wa_window`), and one whose row is FINAL reports it', async () => {
      const k = await freshAlert();
      const r = rig();
      const c = ctx({ whatsapp: true });
      await fanOutAlert(r.deps, day10(k), c, { occasion: 'day_10', jobId: 'j', retryCount: 2, retryLimit: 4 }); // the third attempt sends
      const again = await fanOutAlert(r.deps, day10(k), c, { occasion: 'day_10', jobId: 'j2', retryCount: 0, retryLimit: 4 });
      expect(sms(again)).toMatchObject({ outcome: 'sent' });
      expect(again.delivered).toBe(true);
      expect(r.calls).toHaveLength(1);
      const k2 = await freshAlert();
      const r2 = rig({ answer: () => Promise.reject(new SmsSendError('t', null, 0, { errorClass: 'api_unavailable', code: 'timeout' })) });
      await fanOutAlert(r2.deps, day10(k2), c, { occasion: 'day_10', jobId: 'j', retryCount: 2, retryLimit: 4 });
      const fin = await fanOutAlert(r2.deps, day10(k2), c, { occasion: 'day_10', jobId: 'j2', retryCount: 0, retryLimit: 4 });
      expect(sms(fin)).toMatchObject({ outcome: 'error', detail: ALERT_SMS_RUNG_DETAIL.outcomeUnknown });
      expect(r2.calls).toHaveLength(1);
    });

    it('C3-P22 — a member with NO SMS target under a WIRED seam: the seam is ⛔ called, ⛔ alarmed, ⛔ a row', async () => {
      const k = await freshAlert();
      const r = rig();
      const seam = vi.fn(r.deps.alertSms!); // the gateway call count alone cannot tell "never called" from "called and refused"
      const result = await fanOutAlert({ ...r.deps, alertSms: seam }, day10(k), ctx({ sms: false }), { occasion: 'day_10', jobId: 'j', retryCount: 0, retryLimit: 4 });
      expect(sms(result)).toMatchObject({ outcome: 'skipped_no_target' });
      expect(seam).not.toHaveBeenCalled();
      expect(r.calls).toHaveLength(0);
      expect(r.alarms).toEqual([]);
      expect(await rowsOf(k.alertId)).toEqual([]);
    });
  });

  describe('review 2026-10-25 — AC2 / AC5 matrices, the six occasions, the re-claim language (C3-P15, C3-P18, C3-P19)', () => {
    const mismatch = (k: { alertId: string; pariwarId: string; memberId: string }, reason: string, smsLocale: ContributionSmsLocale): Alert =>
      buildContributionMismatchAlert({ alertId: k.alertId, pariwarId: k.pariwarId, memberId: k.memberId, poolId: randomUUID(), reason, locale: 'hi', smsLocale, now: NOW });
    const escalated = (k: { alertId: string; pariwarId: string; memberId: string }, smsLocale: ContributionSmsLocale): Alert =>
      buildPendingMatchRetryAlert({ alertId: k.alertId, pariwarId: k.pariwarId, memberId: k.memberId, poolId: randomUUID(), identity: IDENTITY, tier: 'escalated', locale: 'hi', smsLocale, now: NOW });
    const poolOf = (l: ContributionSmsLocale): string => (l === 'hi' ? 'अर्जुन' : 'C');

    const MESSAGES = [
      { message: 'deadline_not_recorded', occasion: 'day_10', key: 'sms.deadline_not_recorded', build: (k: { alertId: string; pariwarId: string; memberId: string }, l: ContributionSmsLocale) => day10(k, l), params: (l: ContributionSmsLocale) => ({ pool: poolOf(l), date: '05-11-2026' }), values: (l: ContributionSmsLocale) => [{ name: 'pool', value: poolOf(l) }, { name: 'date', value: '05-11-2026' }] },
      { message: 'payment_not_matched', occasion: 'mismatch:wrong_pool', key: 'sms.payment_not_matched', build: (k: { alertId: string; pariwarId: string; memberId: string }, l: ContributionSmsLocale) => mismatch(k, 'wrong_pool', l), params: () => ({}), values: () => [] },
      { message: 'payment_not_confirmed', occasion: 'pending_match_escalated', key: 'sms.payment_not_confirmed', build: (k: { alertId: string; pariwarId: string; memberId: string }, l: ContributionSmsLocale) => escalated(k, l), params: (l: ContributionSmsLocale) => ({ pool: poolOf(l) }), values: (l: ContributionSmsLocale) => [{ name: 'pool', value: poolOf(l) }] },
    ] as const;
    const COMBOS = MESSAGES.flatMap((m, mi) => (['hi', 'en'] as const).map((locale, li) => [m, locale, `64b0c0ffee0123456789${mi}${li}ab`] as const));

    it.each(COMBOS)('⭐ C3-P15 — %o × %s: the LOCALE\'S OWN template id (a distinct id per message × locale), the values in slot order, the body = the real `t()`, the row\'s locale = the language sent', async (m, locale, wantId) => {
      const k = await freshAlert();
      // EVERY (message, locale) key gets its OWN id, so a mix-up of keys or locales shows as the wrong id on the wire.
      const ids: Record<string, string> = {};
      for (const [mm, ll, id] of COMBOS) ids[contributionSmsDltConfigKey(mm.message, ll)] = id;
      const r = rig({ ids, answer: (_m, n) => Promise.resolve(`req${n}x`) });
      const result = await fanOutAlert(r.deps, m.build(k, locale), ctx(), { occasion: m.occasion });
      expect(result.delivered).toBe(true);
      expect(r.calls).toHaveLength(1);
      expect(r.calls[0]).toMatchObject({ templateId: wantId, values: m.values(locale), body: expectedBody(m.key, locale, m.params(locale)) });
      expect(r.calls[0]!.body).not.toBe(m.key); // a missing translation would make `t()` and the oracle agree on the KEY
      expect((await rowsOf(k.alertId))[0]).toMatchObject({ outcome: 'accepted', locale, occasion: m.occasion });
    });

    // Story 5.8b (FS8 (a); migration 0188) replaced "EVERY one of the SIX occasions": the bridge's `cycle_open` is the seventh — the
    // FIRST live proof that a cycle-open alert row satisfies the `alerts` FK of a send row (F5).
    it('⭐ C3-P18 / 5.8b — EVERY one of the SEVEN occasions reaches the REAL table through the seam (the CHECK and the seam\'s list agree)', async () => {
      const k = await freshAlert();
      const r = rig();
      const alerts: [string, Alert][] = [
        ['day_10', day10(k)],
        ['pending_match_escalated', escalated(k, 'hi')],
        ...['wrong_pool', 'amount_mismatch', 'entry_already_claimed', 'sender_vpa_mismatch'].map((reason): [string, Alert] => [`mismatch:${reason}`, mismatch(k, reason, 'hi')]),
        ['cycle_open', bridgedOpen(k, 'hi')],
      ];
      for (const [occasion, alert] of alerts) {
        expect((await fanOutAlert(r.deps, alert, ctx(), { occasion })).delivered).toBe(true);
      }
      expect(r.calls).toHaveLength(7);
      expect((await rowsOf(k.alertId)).map((x) => x.occasion).sort()).toEqual([...schema.ALERT_SMS_SEND_OCCASIONS].sort());
      expect(r.alarms).toEqual([]);
    });

    it('⭐ C3-P18 / C2-P14 — an occasion that is NOT emittable (`mismatch:no_statement_entry`) and an ABSENT `call` each end `sms_not_attempted`: ONE alarm, ⛔ call, ⛔ row, terminal (⛔ "the gateway MAY have taken it")', async () => {
      for (const call of [{ occasion: 'mismatch:no_statement_entry' }, undefined]) {
        const k = await freshAlert();
        const r = rig();
        const c = ctx();
        const result = await fanOutAlert(r.deps, mismatch(k, 'no_statement_entry', 'en'), c, call);
        expect(sms(result)).toMatchObject({ outcome: 'skipped_no_target', detail: ALERT_SMS_RUNG_DETAIL.notAttempted });
        expect(shouldRetryFanOut(result, c, call)).toBe(false);
        expect(r.calls).toHaveLength(0);
        expect(await rowsOf(k.alertId)).toEqual([]);
        expect(r.alarms.filter((a) => a.includes('known occasion'))).toHaveLength(1);
      }
    });

    it('⭐ C3-P19 (C1-P1) — attempt 1 in `hi` is rate-limited; the member switches to `en`; attempt 2 sends the `en` text with the `en` template id and the ROW says `en` (it used to say `hi`)', async () => {
      const k = await freshAlert();
      const enId = '64b0c0ffee0123456789e001'; // a valid 24-hex MSG91 template id (MG4)
      const r = rig({
        ids: { [contributionSmsDltConfigKey('deadline_not_recorded', 'en')]: enId },
        answer: (_m, n) => (n === 1 ? Promise.reject(new SmsSendError('r', null, 429)) : Promise.resolve('req0002')),
      });
      const c = ctx();
      await fanOutAlert(r.deps, day10(k, 'hi'), c, { occasion: 'day_10', jobId: 'j', retryCount: 0, retryLimit: 4 });
      expect((await rowsOf(k.alertId))[0]).toMatchObject({ outcome: 'deferred', locale: 'hi' });
      await fanOutAlert(r.deps, day10(k, 'en'), c, { occasion: 'day_10', jobId: 'j', retryCount: 1, retryLimit: 4 });
      expect(r.calls).toHaveLength(2);
      expect(r.calls[1]).toMatchObject({ templateId: enId, body: expectedBody('sms.deadline_not_recorded', 'en', { pool: 'C', date: '05-11-2026' }) });
      expect((await rowsOf(k.alertId))[0]).toMatchObject({ outcome: 'accepted', locale: 'en', attempt_count: 2 });
    });
  });

  describe('review 2026-10-25 — decision C1-D1 (b): a `deferred` row is re-sendable only while YOUNG (30 min)', () => {
    it('⭐ after a `rate_limited` answer, a sweep 29 min later STILL re-sends; one 31 min later finds the row EXPIRED — given up `error / exhausted:rate_limited:expired`, ⛔ a second text, the rung reads TERMINAL', async () => {
      const young = await freshAlert();
      const old = await freshAlert();
      const r = rig({ answer: (_m, n) => (n <= 2 ? Promise.reject(new SmsSendError('r', null, 429)) : Promise.resolve(`req${n}x`)) });
      const c = ctx();
      await fanOutAlert(r.deps, day10(young), c, { occasion: 'day_10', jobId: 'j1', retryCount: 0, retryLimit: 4 });
      await fanOutAlert(r.deps, day10(old), c, { occasion: 'day_10', jobId: 'j2', retryCount: 0, retryLimit: 4 });
      expect(r.calls).toHaveLength(2); // both rate-limited ⇒ both `deferred`
      expect((await fullRow(young.alertId))?.outcome).toBe('deferred');
      await ownerPool.query(`UPDATE alert_sms_sends SET updated_at = clock_timestamp() - interval '29 minutes' WHERE alert_id = $1`, [young.alertId]);
      await ownerPool.query(`UPDATE alert_sms_sends SET updated_at = clock_timestamp() - interval '31 minutes' WHERE alert_id = $1`, [old.alertId]);
      const sweep = { occasion: 'day_10', jobId: 'sweep', retryCount: 0, retryLimit: 4 };
      const rYoung = await fanOutAlert(r.deps, day10(young), c, sweep);
      expect(sms(rYoung)).toMatchObject({ outcome: 'sent' });
      expect(r.calls).toHaveLength(3);
      expect(await fullRow(young.alertId)).toMatchObject({ outcome: 'accepted', attempt_count: 2 });
      const rOld = await fanOutAlert(r.deps, day10(old), c, sweep);
      expect(sms(rOld)).toMatchObject({ outcome: 'rejected', detail: ALERT_SMS_RUNG_DETAIL.rateLimitedFinal });
      expect(shouldRetryFanOut(rOld, c, sweep)).toBe(false);
      expect(r.calls).toHaveLength(3); // ⛔ a text for the expired row
      expect(await fullRow(old.alertId)).toMatchObject({ outcome: 'error', detail: 'exhausted:rate_limited:expired', attempt_count: 1 });
      // The bound DROPPED a text, so it is ALARMED (patch-diff #15) — naming the one it dropped; the young re-send raised none.
      const dropped = r.alarms.filter((a) => a.includes('exhausted:rate_limited:expired'));
      expect(dropped).toHaveLength(1);
      expect(dropped[0]).toContain(old.alertId);
      // a further sweep finds the FROZEN row — the same terminal rung, ⛔ a call, ⛔ a second alarm
      const again = await fanOutAlert(r.deps, day10(old), c, { ...sweep, jobId: 'sweep-2' });
      expect(sms(again)).toMatchObject({ outcome: 'rejected', detail: ALERT_SMS_RUNG_DETAIL.rateLimitedFinal });
      expect(r.calls).toHaveLength(3);
      expect(r.alarms.filter((a) => a.includes('exhausted:rate_limited:expired'))).toHaveLength(1);
    });

    it('⭐ …and the FINAL attempt with the Secret Manager down gives an EXPIRED deferred row up too (the give-up covers both ages)', async () => {
      const k = await freshAlert();
      const c = ctx();
      const r1 = rig({ answer: () => Promise.reject(new SmsSendError('r', null, 429)) });
      await fanOutAlert(r1.deps, day10(k), c, { occasion: 'day_10', jobId: 'j', retryCount: 0, retryLimit: 1 });
      await ownerPool.query(`UPDATE alert_sms_sends SET updated_at = clock_timestamp() - interval '31 minutes' WHERE alert_id = $1`, [k.alertId]);
      const down = createAlertSmsSender({
        pool: appPool,
        smsAppClient: gateway().client,
        resolveConfig: () => Promise.reject(Object.assign(new Error('blip'), { code: 14 })),
        onAlarm: () => undefined,
      });
      await fanOutAlert({ ...r1.deps, alertSms: down }, day10(k), c, { occasion: 'day_10', jobId: 'j', retryCount: 1, retryLimit: 1 });
      expect(await fullRow(k.alertId)).toMatchObject({ outcome: 'error', detail: 'exhausted:config_unavailable:secret_manager' });
    });
  });

  describe('review 2026-10-25 — what the audit HMAC covers, and the template id\'s trim (C3-P26, C4-P14)', () => {
    it('⭐ the audit HMAC of the SMS dispatch covers the DLT BODY the gateway got (the `render:` override feeds it) — ⛔ the push copy or a blank', async () => {
      const k = await freshAlert();
      const r = rig();
      await fanOutAlert(r.deps, day10(k), ctx(), { occasion: 'day_10', jobId: 'j', retryCount: 0, retryLimit: 4 });
      expect(r.calls).toHaveLength(1);
      expect(r.hashed).toContain(r.calls[0]!.body);
    });

    it('⭐ FS12 (1) — a PADDED template id is TRIMMED by the core before its 24-hex check (trim-then-check), ⛔ refused: the wire carries the trimmed id', async () => {
      const k = await freshAlert();
      const r = rig({ ids: { [contributionSmsDltConfigKey('deadline_not_recorded', 'hi')]: `  ${TEMPLATE_ID}\n` } });
      const result = await fanOutAlert(r.deps, day10(k), ctx(), { occasion: 'day_10', jobId: 'j', retryCount: 0, retryLimit: 4 });
      expect(sms(result)).toMatchObject({ outcome: 'sent' });
      expect(r.calls[0]!.templateId).toBe(TEMPLATE_ID);
    });
  });

  // ─── Story 5.8b (AC3, AC5, AC12; FS3 (a), FS3.1 (a), FS8 (a), FS17 (a)) — the bridge text through the REAL seam and record ─────

  describe('Story 5.8b — the degraded-mode bridge text, live (T18)', () => {
    const CALL = { occasion: 'cycle_open', jobId: 'job-b', retryCount: 0, retryLimit: 4 } as const;

    it.each<[ContributionSmsLocale]>([['hi'], ['en']])(
      '⭐ %s — ONE gateway call FIRST (the bridge template id, the values in slot order, the real `t()` body); the row `cycle_open` / `cycle_open_bridge` `accepted`; push ⛔ run',
      async (locale) => {
        const k = await freshAlert();
        const r = rig();
        const result = await fanOutAlert(r.deps, bridgedOpen(k, locale), ctx(), CALL);
        expect(result).toMatchObject({ delivered: true, deliveredChannel: 'sms', bridged: true });
        expect(result.trail.map((e) => `${e.channel}:${e.outcome}`)).toEqual(['sms:sent']);
        expect(r.push.calls).toBe(0);
        expect(r.calls).toHaveLength(1);
        const pool = locale === 'hi' ? 'अर्जुन' : 'C';
        expect(r.calls[0]).toMatchObject({
          to: SMS_TARGET.address,
          templateId: TEMPLATE_ID,
          values: [
            { name: 'pool', value: pool },
            { name: 'member1', value: 'Rame' },
            { name: 'member2', value: 'sh K' },
          ],
          body: expectedBody('sms.cycle_open_bridge', locale, { pool, member1: 'Rame', member2: 'sh K' }),
        });
        expect(r.calls[0]!.body).toContain('Ramesh K');
        const { rows } = await ownerPool.query<{ occasion: string; message: string; outcome: string; locale: string }>(
          `SELECT occasion, message, outcome, locale FROM alert_sms_sends WHERE alert_id = $1`,
          [k.alertId],
        );
        expect(rows).toEqual([{ occasion: 'cycle_open', message: 'cycle_open_bridge', outcome: 'accepted', locale }]);
      },
    );

    it('⭐ AC3 / I3 — a re-run (a job retry, a sweep re-run, a second declaration) finds `accepted`: `sent`, ⛔ second text AND ⛔ push', async () => {
      const k = await freshAlert();
      const r = rig();
      await fanOutAlert(r.deps, bridgedOpen(k), ctx(), CALL);
      const again = await fanOutAlert(r.deps, bridgedOpen(k), ctx(), { ...CALL, retryCount: 1 });
      expect(again).toMatchObject({ delivered: true, deliveredChannel: 'sms' });
      expect(r.calls).toHaveLength(1);
      expect(r.push.calls).toBe(0);
    });

    it('⭐ day one — ⛔ template id ⇒ the terminal named refusal (⛔ row, ⛔ the other language) and the ladder runs as before', async () => {
      const k = await freshAlert();
      const r = rig({ ids: { [contributionSmsDltConfigKey('cycle_open_bridge', 'hi')]: null } });
      const result = await fanOutAlert(r.deps, bridgedOpen(k, 'hi'), ctx(), CALL);
      expect(r.calls).toHaveLength(0);
      expect(result.trail[0]).toMatchObject({ channel: 'sms', detail: ALERT_SMS_RUNG_DETAIL.templateIdMissingHi });
      expect(result.trail.at(-1)).toMatchObject({ channel: 'sms', detail: 'sms_bridge_already_tried' });
      expect(r.push.calls).toBe(1); // the ladder ran (the one device)
      expect(await rowsOf(k.alertId)).toEqual([]);
      expect(shouldRetryFanOut(result, ctx(), CALL)).toBe(false);
    });

    it('⭐ FS3.1 (a) — a RATE-LIMITED bridge text, then the ladder DELIVERS by push ⇒ the row is given up (⛔ `deferred`), and a later re-run sends NOTHING', async () => {
      const k = await freshAlert();
      const r = rig({ pushAccepts: true, answer: () => Promise.reject(new SmsSendError('r', null, 429)) });
      const result = await fanOutAlert(r.deps, bridgedOpen(k), ctx(), CALL);
      expect(result).toMatchObject({ delivered: true, deliveredChannel: 'push' });
      expect(result.trail[0]).toMatchObject({ channel: 'sms', detail: ALERT_SMS_RUNG_DETAIL.rateLimited });
      expect(await fullRow(k.alertId)).toMatchObject({ outcome: 'error', detail: 'exhausted:rate_limited:ladder_delivered' });
      const later = rig({ pushAccepts: true });
      const rerun = await fanOutAlert(later.deps, bridgedOpen(k), ctx(), { ...CALL, retryCount: 1 });
      expect(later.calls).toHaveLength(0);
      expect(rerun.trail[0]).toMatchObject({ channel: 'sms', detail: ALERT_SMS_RUNG_DETAIL.rateLimitedFinal });
    });

    it('FS3.1 — a rate-limited bridge text whose ladder does NOT deliver keeps its row `deferred` and the member is RETRIED (re-sent on the next attempt)', async () => {
      const k = await freshAlert();
      let n = 0;
      const r = rig({ answer: () => (n++ === 0 ? Promise.reject(new SmsSendError('r', null, 429)) : Promise.resolve('req0002')) });
      const first = await fanOutAlert(r.deps, bridgedOpen(k), ctx(), CALL);
      expect(first.delivered).toBe(false);
      expect(shouldRetryFanOut(first, ctx(), CALL)).toBe(true);
      expect(await fullRow(k.alertId)).toMatchObject({ outcome: 'deferred' });
      const second = await fanOutAlert(r.deps, bridgedOpen(k), ctx(), { ...CALL, retryCount: 1 });
      expect(second).toMatchObject({ delivered: true, deliveredChannel: 'sms' });
      expect(await fullRow(k.alertId)).toMatchObject({ outcome: 'accepted', attempt_count: 2 });
    });

    it('⭐ AC12 — the REAL switch, read through the jobs pool (`twt_app`): OFF ⇒ ⛔ text, the ladder\'s trail names it; ON ⇒ the text goes (the state found is restored)', async () => {
      const read = async (): Promise<boolean> => (await degradedMode.readDegradedBridgeSmsSwitch(appPool)).enabled;
      const found = await read();
      const actor = randomUUID();
      const set = (enabled: boolean, reason: string) => degradedMode.setDegradedBridgeSmsSwitch(ownerPool, { enabled, actorId: actor, reason, auditId: null });
      try {
        await set(false, 'live test 5.8b AC12 — OFF');
        const off = rig({ readBridgeSwitch: read });
        const k1 = await freshAlert();
        const r1 = await fanOutAlert(off.deps, bridgedOpen(k1), ctx(), CALL);
        expect(off.calls).toHaveLength(0);
        expect(r1.trail.map((e) => `${e.channel}:${e.outcome}${e.detail ? `:${e.detail}` : ''}`).at(-1)).toBe('sms:skipped_no_target:sms_bridge_switched_off');
        expect(await rowsOf(k1.alertId)).toEqual([]);
        await set(true, 'live test 5.8b AC12 — ON');
        const on = rig({ readBridgeSwitch: read });
        const k2 = await freshAlert();
        const r2 = await fanOutAlert(on.deps, bridgedOpen(k2), ctx(), CALL);
        expect(on.calls).toHaveLength(1);
        expect(r2.deliveredChannel).toBe('sms');
      } finally {
        await set(found, 'live test 5.8b AC12 — restore the state found');
      }
    });
  });
});
