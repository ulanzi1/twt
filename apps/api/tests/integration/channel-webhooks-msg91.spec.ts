// MSG91's SMS delivery-report webhook — Story 6.37b (Task 4; AC2–AC4, AC13; DR1, DR2, DR7, DR9, DR10; I3–I5).
//
// Drives the real Fastify app via `app.inject` (⛔ a listener, ⛔ MSG91 — T1): POST /api/v1/webhooks/msg91/sms-reports
// verifies the static `x-twt-msg91-secret-token` header against the BOOT-resolved tokens (`deps.smsReportWebhook`),
// persists DR2's projection into the GLOBAL inbox and ACKs 200. The request logger is captured (`logStream`) so a planted
// phone number is proven absent from every line (I3). Each test uses fresh request ids; afterAll deletes them.

import { randomUUID } from 'node:crypto';
import { Writable } from 'node:stream';

import type pg from 'pg';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AppDeps } from '../../src/context.js';
import { buildServer } from '../../src/server.js';
import { createTestApp, hasDatabase, teardown, type TestApp } from './_setup.js';

const URL = '/api/v1/webhooks/msg91/sms-reports';
const TOKEN = 'cur-'.padEnd(40, 'a');
const NEXT = 'nxt-'.padEnd(40, 'b');
const NUMBER = '919812345678';
const CRQID = 'cr0f1e2d3c4b5a49788695a4b3c2d1e0f9';

/** A fresh MSG91-shaped request id (24 hex). */
const rid = (): string => randomUUID().replace(/-/g, '').slice(0, 24);

/** MSG91's documented sample (help page "how to receive SMS delivery reports via webhook (new)") — every F3 field. */
const report = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  pluginsource: '1',
  requestedAt: '2025-07-09 11:29:40',
  status: '1',
  deliveryTime: '2025-07-09 11:29:46',
  telNum: NUMBER,
  credit: '0.25',
  senderId: 'TWTRST',
  userId: '789012',
  CRQID,
  requestId: rid(),
  DLT_TE_ID: '1107161234567890123',
  eventName: 'delivered',
  failureReason: '',
  ...over,
});

describe.skipIf(!hasDatabase)('MSG91 SMS delivery-report webhook (Story 6.37b)', { timeout: 20000 }, () => {
  let t: TestApp;
  const logLines: string[] = [];
  const logStream = new Writable({
    write(chunk: Buffer | string, _enc, cb) {
      logLines.push(chunk.toString());
      cb();
    },
  });
  const requestIds: string[] = [];
  let consoleSpies: ReturnType<typeof vi.spyOn>[] = [];
  const globalFetch = vi.fn();

  beforeAll(async () => {
    t = await createTestApp({ smsReportWebhook: { current: TOKEN, next: NEXT }, logStream });
  });
  afterAll(async () => {
    if (requestIds.length > 0) await t.pool.query('DELETE FROM sms_delivery_report_inbox WHERE request_id = ANY($1)', [requestIds]);
    await teardown(t);
  });
  beforeEach(() => {
    logLines.length = 0;
    globalFetch.mockReset();
    vi.stubGlobal('fetch', globalFetch);
    consoleSpies = (['log', 'info', 'warn', 'error'] as const).map((m) => vi.spyOn(console, m));
  });
  afterEach(() => {
    // I9 / AC13 — ⛔ an outbound call from the webhook, ever; ⛔ `console.*` (it bypasses the recorder).
    expect(globalFetch).not.toHaveBeenCalled();
    for (const s of consoleSpies) {
      expect(s).not.toHaveBeenCalled();
      s.mockRestore();
    }
    vi.unstubAllGlobals();
  });

  async function post(
    body: unknown,
    headers: Record<string, string | string[]> = { 'x-twt-msg91-secret-token': TOKEN, 'content-type': 'application/json' },
    app = t.app,
  ) {
    const payload = body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body);
    for (const r of [body].flat()) {
      if (r && typeof r === 'object' && typeof (r as { requestId?: unknown }).requestId === 'string') requestIds.push((r as { requestId: string }).requestId);
    }
    return app.inject({ method: 'POST', url: URL, headers, ...(payload !== undefined ? { payload } : {}) });
  }

  async function rowsFor(...ids: string[]) {
    const { rows } = await t.pool.query<Record<string, unknown>>(
      `SELECT row_to_json(i)::text AS j, i.* FROM sms_delivery_report_inbox i WHERE request_id = ANY($1) ORDER BY received_at, report_id`,
      [ids],
    );
    return rows;
  }

  const alarms = (name: string) => logLines.filter((l) => l.includes(`"alarm":"${name}"`));

  describe('AC2 — the header token (DR1, I5)', () => {
    it('the CURRENT token ⇒ 200 {received:true} and ONE row', async () => {
      const r = report();
      const res = await post(r);
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ received: true });
      expect(await rowsFor(r.requestId as string)).toHaveLength(1);
    });

    it('the NEXT token (the rotation window) ⇒ 200 and one row', async () => {
      const r = report();
      expect((await post(r, { 'x-twt-msg91-secret-token': NEXT, 'content-type': 'application/json' })).statusCode).toBe(200);
      expect(await rowsFor(r.requestId as string)).toHaveLength(1);
    });

    it.each<[string, Record<string, string | string[]>]>([
      ['a wrong token', { 'x-twt-msg91-secret-token': 'x'.repeat(40) }],
      ['a token one character short', { 'x-twt-msg91-secret-token': TOKEN.slice(0, -1) }],
      ['⛔ header', {}],
      ['an empty header', { 'x-twt-msg91-secret-token': '' }],
      ['an ARRAY header (repeats — inject only)', { 'x-twt-msg91-secret-token': [TOKEN, TOKEN] }],
      ['a joined repeat', { 'x-twt-msg91-secret-token': `${TOKEN}, ${TOKEN}` }],
      ['the token in another header', { 'x-telegram-bot-api-secret-token': TOKEN }],
    ])('%s ⇒ 403 webhook.signature_rejected, ZERO rows', async (_l, h) => {
      const r = report();
      const res = await post(r, { ...h, 'content-type': 'application/json' });
      expect(res.statusCode).toBe(403);
      expect(res.json<{ error: { code: string } }>().error.code).toBe('webhook.signature_rejected');
      expect(await rowsFor(r.requestId as string)).toHaveLength(0);
    });

    it('a DISABLED webhook (⛔ token configured) ⇒ 403 to everything, the real token included', async () => {
      const off = await buildServer({ ...t.deps, smsReportWebhook: { current: null, next: null } } as AppDeps);
      try {
        const r = report();
        for (const tok of [TOKEN, '', 'null']) {
          expect((await post(r, { 'x-twt-msg91-secret-token': tok, 'content-type': 'application/json' }, off)).statusCode).toBe(403);
        }
        expect(await rowsFor(r.requestId as string)).toHaveLength(0);
      } finally {
        await off.close();
      }
    });

    it('⛔ the token in any log line', async () => {
      await post(report());
      await post(report(), { 'x-twt-msg91-secret-token': 'wrong-token-value', 'content-type': 'application/json' });
      expect(logLines.join('\n')).not.toContain(TOKEN);
      expect(logLines.join('\n')).not.toContain('wrong-token-value');
    });
  });

  describe('AC3 — only the projection is kept (DR2, DR10, I3)', () => {
    it('⭐ every F3 field ⇒ the row holds EXACTLY DR2\'s columns; the number, sender, credit, user and DLT id in ⛔ column and ⛔ log line', async () => {
      const r = report({ failureReason: 'Failed for 9812345678 today' });
      expect((await post(r)).statusCode).toBe(200);
      const [row] = await rowsFor(r.requestId as string);
      expect(row).toMatchObject({
        request_id: r.requestId,
        crqid: CRQID,
        status_code: '1',
        event_name: 'delivered',
        failure_reason: 'Failed for # today',
        reported_delivery_time: '2025-07-09 11:29:46',
        match_state: 'pending',
      });
      const json = row!.j as string;
      for (const leaked of ['9812345678', 'TWTRST', '0.25', '789012', '1107161234567890123']) {
        expect(json).not.toContain(leaked);
        expect(logLines.join('\n')).not.toContain(leaked);
      }
      expect(Object.keys(JSON.parse(json) as object).sort()).toEqual(
        [
          'attempts',
          'crqid',
          'event_name',
          'failure_reason',
          'lease_until',
          'match_detail',
          'match_state',
          'next_attempt_at',
          'received_at',
          'report_id',
          'reported_delivery_time',
          'request_id',
          'settled_at',
          'status_code',
        ].sort(),
      );
    });

    it('⭐ a MALFORMED body carrying the number ⇒ 200, ⛔ row, ONE unusable_body line, and the digits in ⛔ line (the parse error is ⛔ logged)', async () => {
      const id = rid();
      requestIds.push(id);
      const res = await post(`{"requestId":"${id}","telNum":"${NUMBER}","x":}`);
      expect(res.statusCode).toBe(200);
      expect(await rowsFor(id)).toHaveLength(0);
      expect(alarms('sms_report.unusable_body')).toHaveLength(1);
      expect(logLines.join('\n')).not.toContain('9812345678');
    });

    it.each([['"0"', '0'], ['""', '']])('CRQID %s ⇒ NULL', async (_l, CRQID) => {
      const r = report({ CRQID });
      await post(r);
      expect((await rowsFor(r.requestId as string))[0]).toMatchObject({ crqid: null });
    });

    it('an array of 3 ⇒ 3 rows', async () => {
      const rs = [report(), report(), report()];
      expect((await post(rs)).statusCode).toBe(200);
      expect(await rowsFor(...rs.map((r) => r.requestId as string))).toHaveLength(3);
    });

    it('a report with ⛔ usable request id inside an array of 3 ⇒ 2 rows + ONE bad_request_id line (count 1)', async () => {
      const rs = [report(), report({ requestId: 'not-usable!' }), report()];
      expect((await post(rs)).statusCode).toBe(200);
      expect(await rowsFor(...rs.map((r) => r.requestId as string))).toHaveLength(2);
      const lines = alarms('sms_report.bad_request_id');
      expect(lines).toHaveLength(1);
      expect(lines[0]).toContain('"count":1');
    });

    it.each<[string, string | undefined, Record<string, string>]>([
      ['a JSON scalar', '42', { 'content-type': 'application/json' }],
      ['not JSON', 'oops', { 'content-type': 'application/json' }],
      ['an empty body', '', { 'content-type': 'application/json' }],
      ['⛔ body and ⛔ content type', undefined, {}],
      ['a non-JSON body with ⛔ content type', `telNum=${NUMBER}`, {}],
      ['text/plain', JSON.stringify([1]), { 'content-type': 'text/plain' }],
      ['form-urlencoded', `requestId=abc&telNum=${NUMBER}`, { 'content-type': 'application/x-www-form-urlencoded' }],
    ])('%s with a valid token ⇒ 200 (⛔ 415, ⛔ 400), ⛔ row, ONE unusable_body line', async (_l, payload, h) => {
      const before = (await t.pool.query<{ n: string }>('SELECT count(*) AS n FROM sms_delivery_report_inbox')).rows[0]!.n;
      const res = await t.app.inject({ method: 'POST', url: URL, headers: { 'x-twt-msg91-secret-token': TOKEN, ...h }, ...(payload !== undefined ? { payload } : {}) });
      expect(res.statusCode).toBe(200);
      expect(alarms('sms_report.unusable_body')).toHaveLength(1);
      expect((await t.pool.query<{ n: string }>('SELECT count(*) AS n FROM sms_delivery_report_inbox')).rows[0]!.n).toBe(before);
      expect(logLines.join('\n')).not.toContain('9812345678');
    });

    it('`application/json; charset=utf-8` is accepted (T18); a report sent as text/plain or with ⛔ content type is parsed too (DR10 — the BODY decides, ⛔ the type)', async () => {
      const a = report();
      const b = report();
      const c = report();
      expect((await post(a, { 'x-twt-msg91-secret-token': TOKEN, 'content-type': 'application/json; charset=utf-8' })).statusCode).toBe(200);
      expect((await post(b, { 'x-twt-msg91-secret-token': TOKEN, 'content-type': 'text/plain' })).statusCode).toBe(200);
      expect((await post(c, { 'x-twt-msg91-secret-token': TOKEN })).statusCode).toBe(200);
      expect(await rowsFor(a.requestId as string, b.requestId as string, c.requestId as string)).toHaveLength(3);
    });
  });

  describe('AC4 — persist-then-ack and the dedupe (I4, DR7)', () => {
    it('the same report twice ⇒ ONE row, both 200', async () => {
      const r = report();
      expect((await post(r)).statusCode).toBe(200);
      expect((await post(r)).statusCode).toBe(200);
      expect(await rowsFor(r.requestId as string)).toHaveLength(1);
    });

    it('⭐ same request id, CRQID and status but a different reason / event / time ⇒ ONE row holding the FIRST, ⛔ log line for the second', async () => {
      const r = report({ failureReason: 'first', eventName: 'delivered', deliveryTime: 'one' });
      await post(r);
      const lines = logLines.length;
      expect((await post({ ...r, failureReason: 'second', eventName: 'other', deliveryTime: 'two' })).statusCode).toBe(200);
      expect(logLines.slice(lines).filter((l) => l.includes('"alarm"'))).toEqual([]);
      const rows = await rowsFor(r.requestId as string);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ failure_reason: 'first', event_name: 'delivered', reported_delivery_time: 'one' });
    });

    it('two POSTs that differ only in status ⇒ TWO rows; two with ⛔ CRQID and ⛔ status, same request id ⇒ ONE', async () => {
      const r = report();
      await post(r);
      await post({ ...r, status: '2' });
      expect(await rowsFor(r.requestId as string)).toHaveLength(2);
      const blank = report();
      delete blank.CRQID;
      delete blank.status;
      await post(blank);
      await post({ ...blank, eventName: 'x' });
      expect(await rowsFor(blank.requestId as string)).toHaveLength(1);
    });

    it('⛔ KMS, ⛔ Secret Manager, ⛔ an outbound call in the handler (counting fakes)', async () => {
      const resolve = vi.fn(t.deps.resolveChannelSecret);
      const kms = t.deps.encryption.kms;
      const kmsCalls: string[] = [];
      const counted = new Proxy(kms, {
        get(target, prop, receiver) {
          const v = Reflect.get(target, prop, receiver) as unknown;
          return typeof v === 'function' ? (...a: unknown[]) => (kmsCalls.push(String(prop)), (v as (...x: unknown[]) => unknown).apply(target, a)) : v;
        },
      });
      const app = await buildServer({ ...t.deps, resolveChannelSecret: resolve, encryption: { ...t.deps.encryption, kms: counted } } as AppDeps);
      try {
        const r = report();
        expect((await post(r, undefined, app)).statusCode).toBe(200);
        expect(resolve).not.toHaveBeenCalled();
        expect(kmsCalls).toEqual([]);
      } finally {
        await app.close();
      }
    });

    it('⭐ a FAILED COMMIT is RETHROWN ⇒ 5xx (MSG91 retries) — ⛔ a 200 for a lost write', async () => {
      const failing = new Proxy(t.deps.pool, {
        get(target, prop, receiver) {
          if (prop !== 'connect') return Reflect.get(target, prop, receiver) as unknown;
          return async () => {
            const client = (await target.connect()) as pg.PoolClient;
            const query = client.query.bind(client) as (...a: unknown[]) => Promise<unknown>;
            (client as unknown as { query: unknown }).query = (text: unknown, ...rest: unknown[]) =>
              text === 'COMMIT' ? (query('ROLLBACK'), Promise.reject(new Error('commit failed'))) : query(text, ...rest);
            const release = client.release.bind(client);
            (client as unknown as { release: unknown }).release = (err?: unknown) => {
              (client as unknown as { query: unknown }).query = query;
              release(err as Error | boolean | undefined);
            };
            return client;
          };
        },
      });
      const app = await buildServer({ ...t.deps, pool: failing } as AppDeps);
      try {
        const r = report();
        const res = await post(r, undefined, app);
        expect(res.statusCode).toBeGreaterThanOrEqual(500);
        expect(await rowsFor(r.requestId as string)).toHaveLength(0);
      } finally {
        await app.close();
      }
    });
  });
});

describe.skipIf(!hasDatabase)('MSG91 SMS delivery-report webhook — the per-route limit (DR9; AC13)', () => {
  let t: TestApp;
  const requestIds: string[] = [];
  beforeAll(async () => {
    t = await createTestApp({ smsReportWebhook: { current: TOKEN, next: null }, env: { ...process.env, SMS_REPORT_WEBHOOK_RATE_MAX: '3' } });
  });
  afterAll(async () => {
    await t.pool.query('DELETE FROM sms_delivery_report_inbox WHERE request_id = ANY($1)', [requestIds]);
    await teardown(t);
  });

  it('answers 429 past SMS_REPORT_WEBHOOK_RATE_MAX (its OWN limit — ⛔ the global 300)', async () => {
    expect(t.deps.config.smsReportWebhook.rateMax).toBe(3);
    const codes: number[] = [];
    for (let i = 0; i < 4; i += 1) {
      const r = report();
      requestIds.push(r.requestId as string);
      const res = await t.app.inject({
        method: 'POST',
        url: URL,
        headers: { 'x-twt-msg91-secret-token': TOKEN, 'content-type': 'application/json' },
        payload: JSON.stringify(r),
      });
      codes.push(res.statusCode);
    }
    expect(codes).toEqual([200, 200, 200, 429]);
  });
});
