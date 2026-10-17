// The SMS delivery-report accessors — live (Story 6.37b, Task 3; AC4, AC6 (8a)–(8h), AC7, AC10; DR6–DR8). Per-test
// ROLLBACK (setupLiveDb). ⚠ The inbox is GLOBAL and other suites commit rows into it: every claim and prune here runs at a
// clock in 1990 against rows inserted due then. ⚠ NOT 2000 — the jobs live suite commits inbox rows due at 2000-01-01 until
// its `afterAll` (code review round 2), so a 2000 clock here could claim them; at 1990 ⛔ another suite's row is ever due
// or old enough to prune in these legs (the committed concurrency-test rows are due at the real `now()`).

import { randomUUID } from 'node:crypto';

import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import {
  claimDueSmsDeliveryReports,
  persistSmsDeliveryReports,
  pruneSettledSmsDeliveryReports,
  readSmsSendDeliveries,
  settleSmsDeliveryReport,
  upsertSmsSendDelivery,
  type SmsDeliveryReportProjection,
  type SmsSendDeliveryReport,
} from '../../../src/sms-delivery/index.js';
import { DATABASE_URL, getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppScope } from '../_helpers.js';

type Client = ReturnType<typeof getTx>['client'];

const T0 = new Date('1990-01-01T00:00:00.000Z');
const at = (minutes: number) => new Date(T0.getTime() + minutes * 60_000);
const req = () => randomUUID().replace(/-/g, '').slice(0, 24);

const projection = (over: Partial<SmsDeliveryReportProjection> = {}): SmsDeliveryReportProjection => ({
  requestId: req(),
  crqid: `cr${randomUUID().replace(/-/g, '')}`,
  statusCode: '1',
  eventName: 'delivered',
  failureReason: null,
  reportedDeliveryTime: null,
  ...over,
});

/** A pending inbox row due at T0 (as the owner — the test's own transaction). */
async function seedDue(client: Client, over: { receivedAt?: Date; nextAttemptAt?: Date; leaseUntil?: Date | null } = {}): Promise<string> {
  const p = projection();
  const { rows } = await client.query<{ report_id: string }>(
    `INSERT INTO sms_delivery_report_inbox (request_id, crqid, status_code, received_at, next_attempt_at, lease_until)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING report_id`,
    [p.requestId, p.crqid, p.statusCode, over.receivedAt ?? T0, over.nextAttemptAt ?? T0, over.leaseUntil ?? null],
  );
  return rows[0]!.report_id;
}

async function inboxRow(client: Client, id: string) {
  const { rows } = await client.query<{ match_state: string; match_detail: string | null; attempts: number; lease_until: Date | null; next_attempt_at: Date; settled_at: Date | null }>(
    `SELECT match_state, match_detail, attempts, lease_until, next_attempt_at, settled_at FROM sms_delivery_report_inbox WHERE report_id = $1`,
    [id],
  );
  return rows[0];
}

const report = (over: Partial<SmsSendDeliveryReport> = {}): SmsSendDeliveryReport => ({
  pariwarId: PARIWAR_A,
  kind: 'cr',
  rowId: '7a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d',
  requestId: '5e1e93cad6fc054d8e759a5b',
  state: 'delivered',
  statusCode: '1',
  failureReason: null,
  receivedAt: at(0),
  ...over,
});

async function deliveryRow(client: Client, kind = 'cr', rowId = report().rowId) {
  // AC6: every counting-contract read runs as the send's tenant, and proves cross-tenant invisibility, including
  // after conflict updates and out-of-order reports. Restore role and GUCs before the next owner-side test write.
  await client.query('SAVEPOINT delivery_scope_read');
  try {
    await enterAppScope(client, PARIWAR_A);
    const { rows } = await client.query(`SELECT * FROM sms_send_deliveries WHERE send_kind = $1 AND send_row_id = $2`, [kind, rowId]);
    await enterAppScope(client, PARIWAR_B);
    const other = await client.query(`SELECT * FROM sms_send_deliveries WHERE send_kind = $1 AND send_row_id = $2`, [kind, rowId]);
    expect(other.rows).toEqual([]);
    return rows;
  } finally {
    await client.query('ROLLBACK TO SAVEPOINT delivery_scope_read');
    await client.query('RELEASE SAVEPOINT delivery_scope_read');
  }
}

describe.skipIf(!hasDatabase)('Story 6.37b — the delivery-report accessors (live)', { timeout: 20000 }, () => {
  setupLiveDb();
  // I9 / AC13 — the accessors make ⛔ network call: a global-fetch RECORDER at zero.
  const globalFetch = vi.fn();
  beforeAll(() => vi.stubGlobal('fetch', globalFetch));
  afterAll(() => {
    vi.unstubAllGlobals();
    expect(globalFetch).not.toHaveBeenCalled();
  });

  describe('persistSmsDeliveryReports (DR2, DR7; AC4)', () => {
    it('one row per report; a duplicate by KEY (same request id, CRQID, status) is a no-op, whatever else differs', async () => {
      const { client } = getTx();
      const a = projection({ failureReason: 'first', eventName: 'delivered' });
      expect(await persistSmsDeliveryReports(client, [a])).toBe(1);
      expect(await persistSmsDeliveryReports(client, [{ ...a, failureReason: 'second', eventName: 'other', reportedDeliveryTime: '2025-07-09T11:30:00Z' }])).toBe(0);
      const { rows } = await client.query(`SELECT failure_reason, event_name FROM sms_delivery_report_inbox WHERE request_id = $1`, [a.requestId]);
      expect(rows).toEqual([{ failure_reason: 'first', event_name: 'delivered' }]);
      // ⭐ only the status differs ⇒ ANOTHER report
      expect(await persistSmsDeliveryReports(client, [{ ...a, statusCode: '2' }])).toBe(1);
    });

    it('an array: each new row counted; a duplicate INSIDE one request is stored once', async () => {
      const { client } = getTx();
      const a = projection();
      expect(await persistSmsDeliveryReports(client, [a, projection(), a])).toBe(2);
    });

    it('equal keys keep the FIRST input metadata, including blank-coalesced keys; the input is unchanged', async () => {
      const { client } = getTx();
      const first = projection({ crqid: null, statusCode: null, failureReason: 'first' });
      const rows = [projection(), first, { ...first, failureReason: 'second' }];
      const original = [...rows];
      expect(await persistSmsDeliveryReports(client, rows)).toBe(2);
      expect(rows).toEqual(original);
      expect((await client.query('SELECT failure_reason FROM sms_delivery_report_inbox WHERE request_id = $1', [first.requestId])).rows)
        .toEqual([{ failure_reason: 'first' }]);
    });

    it('reversed overlapping batches both commit under forced two-connection contention', async () => {
      // The gate is held on its OWN pool client (⛔ the shared fixture transaction — an aborted fixture tx would fail the
      // unlock and skip the cleanup). Every acquisition happens inside the `try`, so the `finally` always ends the pool.
      const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 3, connectionTimeoutMillis: 5000 });
      const gate = String(BigInt(`0x${randomUUID().replace(/-/g, '').slice(0, 12)}`));
      const rows = [projection(), projection()];
      const ids = rows.map((r) => r.requestId);
      const clients: pg.PoolClient[] = [];
      let control: pg.PoolClient | undefined;
      let locked = false;
      let pending: Promise<PromiseSettledResult<number>[]> | undefined;

      const write = async (c: pg.PoolClient, batch: SmsDeliveryReportProjection[]) => {
        await c.query('BEGIN');
        try {
          await c.query('SET LOCAL ROLE twt_app');
          await c.query(`SET LOCAL statement_timeout = '10s'`);
          // Pause the second tuple AFTER this transaction has inserted its first key. With opposite lock orders,
          // each transaction owns a different key and this schedule deterministically produces a deadlock. With
          // consistent ordering, the second writer waits on the first key and both safely finish after release.
          const gated = {
            query: (statement: string, values: unknown[]) => {
              const replacement = `(SELECT $7::text FROM pg_advisory_xact_lock($${values.length + 1}::bigint)),`;
              const sql = statement.replace('$7,', replacement);
              expect(sql).not.toBe(statement);
              return c.query(sql, [...values, gate]);
            },
          } as unknown as pg.PoolClient;
          const n = await persistSmsDeliveryReports(gated, batch);
          await c.query('COMMIT');
          return n;
        } catch (err) {
          await c.query('ROLLBACK');
          throw err;
        }
      };
      try {
        control = await pool.connect();
        clients.push(await pool.connect(), await pool.connect());
        const pids = await Promise.all(clients.map(async (c) => (await c.query<{ pid: number }>('SELECT pg_backend_pid() AS pid')).rows[0]!.pid));
        await control.query('SELECT pg_advisory_lock($1::bigint)', [gate]);
        locked = true;
        pending = Promise.allSettled([write(clients[0]!, rows), write(clients[1]!, [...rows].reverse())]);
        const deadline = Date.now() + 5000;
        let blocked = 0;
        while (blocked !== 2 && Date.now() < deadline) {
          const r = await control.query<{ n: number }>(
            `SELECT count(DISTINCT pid)::int AS n FROM pg_locks WHERE pid = ANY($1::int[]) AND NOT granted`, [pids],
          );
          blocked = r.rows[0]!.n;
          if (blocked !== 2) await new Promise((resolve) => setTimeout(resolve, 10));
        }
        expect(blocked).toBe(2);
        await control.query('SELECT pg_advisory_unlock($1::bigint)', [gate]);
        locked = false;
        const results = await pending;
        expect(results.map((r) => r.status)).toEqual(['fulfilled', 'fulfilled']);
        expect(results.reduce((n, r) => n + (r.status === 'fulfilled' ? r.value : 0), 0)).toBe(2);
        expect((await control.query('SELECT request_id FROM sms_delivery_report_inbox WHERE request_id = ANY($1)', [ids])).rows).toHaveLength(2);
      } finally {
        try {
          if (locked) await control!.query('SELECT pg_advisory_unlock($1::bigint)', [gate]);
          await pending;
          // These two writers commit independently of the test fixture, so cleanup must commit independently too —
          // on the gate's client (the pool is at `max`: a `pool.query` here would wait for a fourth connection).
          if (control) await control.query('DELETE FROM sms_delivery_report_inbox WHERE request_id = ANY($1)', [ids]);
        } finally {
          // Releasing / ending closes the gate's session too, so the advisory lock can never outlive the test.
          control?.release();
          clients.forEach((c) => c.release());
          await pool.end();
        }
      }
    });

    it('the blank-key case: ⛔ CRQID and ⛔ status, the same request id ⇒ ONE row', async () => {
      const { client } = getTx();
      const a = projection({ crqid: null, statusCode: null });
      expect(await persistSmsDeliveryReports(client, [a])).toBe(1);
      expect(await persistSmsDeliveryReports(client, [{ ...a, eventName: 'x' }])).toBe(0);
    });

    it('⛔ rows ⇒ 0 and ⛔ a statement; more than 100 ⇒ a throw', async () => {
      let calls = 0;
      const q = { query: () => ((calls += 1), Promise.resolve({ rowCount: 0, rows: [] })) } as never;
      expect(await persistSmsDeliveryReports(q, [])).toBe(0);
      expect(calls).toBe(0);
      await expect(persistSmsDeliveryReports(q, Array.from({ length: 101 }, () => projection()))).rejects.toThrow(/too many/);
    });
  });

  describe('claimDueSmsDeliveryReports (DR8, T2; AC7)', () => {
    it('claims a due pending row under a lease: attempts + 1, lease_until = now + lease; a leased row is ⛔ claimed again', async () => {
      const { client } = getTx();
      const id = await seedDue(client);
      const claimed = await claimDueSmsDeliveryReports(client, { now: at(1), leaseMs: 5 * 60_000 });
      expect(claimed.map((c) => c.reportId)).toEqual([id]);
      expect(claimed[0]!.attempts).toBe(1);
      expect((await inboxRow(client, id))!.lease_until).toEqual(at(6));
      expect(await claimDueSmsDeliveryReports(client, { now: at(2) })).toEqual([]);
    });

    it('⭐ a crashed worker: the lease LAPSES and the row is re-claimed (attempts 2) — at-least-once', async () => {
      const { client } = getTx();
      const id = await seedDue(client);
      await claimDueSmsDeliveryReports(client, { now: at(1), leaseMs: 5 * 60_000 });
      const again = await claimDueSmsDeliveryReports(client, { now: at(7) });
      expect(again.map((c) => [c.reportId, c.attempts])).toEqual([[id, 2]]);
    });

    it('⛔ a row not yet due (next_attempt_at in the future), ⛔ a settled row', async () => {
      const { client } = getTx();
      await seedDue(client, { nextAttemptAt: at(10) });
      const settled = await seedDue(client);
      await client.query(`UPDATE sms_delivery_report_inbox SET match_state = 'unmatched', match_detail = 'no_crqid', settled_at = $2 WHERE report_id = $1`, [settled, T0]);
      expect(await claimDueSmsDeliveryReports(client, { now: at(5) })).toEqual([]);
    });

    it('oldest received first; the limit is CLAMPED (a negative limit is 1, ⛔ "no limit")', async () => {
      const { client } = getTx();
      const late = await seedDue(client, { receivedAt: at(-1) });
      const early = await seedDue(client, { receivedAt: at(-3) });
      await seedDue(client, { receivedAt: at(-2) });
      expect((await claimDueSmsDeliveryReports(client, { now: at(1), limit: -1 })).map((c) => c.reportId)).toEqual([early]);
      const rest = await claimDueSmsDeliveryReports(client, { now: at(1), limit: 2 });
      expect(rest).toHaveLength(2);
      expect(rest[1]!.reportId).toBe(late);
    });

    it('AC7 — the default is 200, the cap 500, a non-finite limit takes the default, a fraction its floor (⛔ NaN / 2.5 into SQL)', async () => {
      const { client } = getTx();
      await client.query(
        `INSERT INTO sms_delivery_report_inbox (request_id, received_at, next_attempt_at)
         SELECT 'clamp' || g, $1::timestamptz - g * interval '1 second', $1::timestamptz FROM generate_series(1, 701) g`,
        [T0],
      );
      expect(await claimDueSmsDeliveryReports(client, { now: at(1) })).toHaveLength(200);
      expect(await claimDueSmsDeliveryReports(client, { now: at(1), limit: Number.NaN })).toHaveLength(200);
      expect(await claimDueSmsDeliveryReports(client, { now: at(1), limit: 10_000 })).toHaveLength(301);
      await client.query(`UPDATE sms_delivery_report_inbox SET lease_until = NULL WHERE request_id LIKE 'clamp%'`);
      expect(await claimDueSmsDeliveryReports(client, { now: at(1), limit: 10_000 })).toHaveLength(500);
      await client.query(`UPDATE sms_delivery_report_inbox SET lease_until = NULL WHERE request_id LIKE 'clamp%'`);
      expect(await claimDueSmsDeliveryReports(client, { now: at(1), limit: 2.5 })).toHaveLength(2); // a fraction ⇒ its floor
    });

    it('⭐ the limit is a HARD bound under a Nested Loop Semi Join plan (code review round 2 — the IN-subquery over-claim)', async (ctx) => {
      // The pre-review claim `UPDATE … WHERE id IN (SELECT … LIMIT n FOR UPDATE SKIP LOCKED)` re-ran its subquery per outer
      // row under a Nested Loop Semi Join: LockRows skipped each row this statement had just updated (self-modified) and
      // LIMIT yielded the next — LIMIT 2 leased all 40 due rows. That plan appears when the inbox's stats say "tiny"
      // (other suites keep emptying the GLOBAL inbox), so the stats are FORCED here, inside the fixture's transaction
      // (rolled back with it). Rows inserted oldest-first: physical order = age order, the production case.
      const { client } = getTx();
      // Forcing the stats writes `pg_class` — a superuser's right (CI's `twt_dev_app` and :5433's are). SKIPPED, ⛔ passed, else.
      const su = await client.query<{ su: boolean }>(`SELECT rolsuper AS su FROM pg_roles WHERE rolname = current_user`);
      if (su.rows[0]?.su !== true) ctx.skip();
      for (let m = 40; m >= 1; m -= 1) await seedDue(client, { receivedAt: at(-m) });
      await client.query(`UPDATE pg_class SET reltuples = 1, relpages = 1 WHERE oid = 'sms_delivery_report_inbox'::regclass`);
      const claimed = await claimDueSmsDeliveryReports(client, { now: at(1), limit: 2 });
      expect(claimed).toHaveLength(2);
      expect(claimed.map((c) => c.receivedAt.getTime())).toEqual([at(-40).getTime(), at(-39).getTime()]);
      const { rows } = await client.query<{ n: number }>(
        `SELECT count(*)::int AS n FROM sms_delivery_report_inbox WHERE lease_until IS NOT NULL AND received_at < $1`, [at(0)],
      );
      expect(rows[0]!.n).toBe(2);
    });
  });

  describe('settleSmsDeliveryReport — the compare-and-set (DR8; AC7)', () => {
    it('a settle stamps settled_at, the detail, clears the lease; a second settle with the SAME claim ⇒ false', async () => {
      const { client } = getTx();
      const id = await seedDue(client);
      const [c] = await claimDueSmsDeliveryReports(client, { now: at(1) });
      const settle = { kind: 'settle', matchState: 'matched', matchDetail: 'delivered' } as const;
      expect(await settleSmsDeliveryReport(client, { reportId: id, claimedAttempts: c!.attempts, settlement: settle, now: at(2) })).toBe(true);
      expect(await inboxRow(client, id)).toMatchObject({ match_state: 'matched', match_detail: 'delivered', settled_at: at(2), lease_until: null });
      expect(await settleSmsDeliveryReport(client, { reportId: id, claimedAttempts: c!.attempts, settlement: settle, now: at(3) })).toBe(false);
    });

    it('⭐ a STALE claim (the lease lapsed and another drain re-claimed) ⇒ false, the row unchanged', async () => {
      const { client } = getTx();
      const id = await seedDue(client);
      const [first] = await claimDueSmsDeliveryReports(client, { now: at(1) });
      await claimDueSmsDeliveryReports(client, { now: at(7) });
      expect(
        await settleSmsDeliveryReport(client, { reportId: id, claimedAttempts: first!.attempts, settlement: { kind: 'settle', matchState: 'ignored', matchDetail: 'intermediate' }, now: at(8) }),
      ).toBe(false);
      expect(await inboxRow(client, id)).toMatchObject({ match_state: 'pending', attempts: 2 });
    });

    it('⭐ a RETRY stays pending, sets the next due time and CLEARS the lease (⛔ the backoff is really the lease)', async () => {
      const { client } = getTx();
      const id = await seedDue(client);
      const [c] = await claimDueSmsDeliveryReports(client, { now: at(1) });
      expect(await settleSmsDeliveryReport(client, { reportId: id, claimedAttempts: c!.attempts, settlement: { kind: 'retry', nextAttemptAt: at(2) }, now: at(1) })).toBe(true);
      expect(await inboxRow(client, id)).toMatchObject({ match_state: 'pending', lease_until: null, next_attempt_at: at(2), settled_at: null });
      // due again at the BACKOFF (1 min), ⛔ after the 5-minute lease
      expect((await claimDueSmsDeliveryReports(client, { now: at(2) })).map((r) => r.reportId)).toEqual([id]);
    });
  });

  describe('⭐ upsertSmsSendDelivery — DR6\'s counting contract (AC6 (8a)–(8e), (8h))', () => {
    it('(8a) the first report creates ONE row: count 1, first = last = its received_at, its state / code / reason / request id', async () => {
      const { client } = getTx();
      await upsertSmsSendDelivery(client, report({ state: 'undelivered', statusCode: '2', failureReason: 'DLT Scrubbing Failed' }));
      expect(await deliveryRow(client)).toEqual([
        {
          send_kind: 'cr',
          send_row_id: report().rowId,
          pariwar_id: PARIWAR_A,
          request_id: report().requestId,
          delivery_state: 'undelivered',
          status_code: '2',
          failure_reason: 'DLT Scrubbing Failed',
          first_reported_at: at(0),
          reported_at: at(0),
          report_count: 1,
        },
      ]);
    });

    it('(8b) delivered then undelivered ⇒ undelivered, count 2, the undelivered report\'s code and reason', async () => {
      const { client } = getTx();
      await upsertSmsSendDelivery(client, report());
      await upsertSmsSendDelivery(client, report({ state: 'undelivered', statusCode: '16', failureReason: 'Rejected', requestId: 'e'.repeat(24), receivedAt: at(5) }));
      expect(await deliveryRow(client)).toEqual([
        expect.objectContaining({ request_id: report().requestId, delivery_state: 'undelivered', status_code: '16', failure_reason: 'Rejected', report_count: 2, reported_at: at(5) }),
      ]);
    });

    it('(8c) undelivered then delivered ⇒ STILL undelivered (absorbing), count 2, code / reason the first\'s, reported_at the later', async () => {
      const { client } = getTx();
      await upsertSmsSendDelivery(client, report({ state: 'undelivered', statusCode: '2', failureReason: 'Failed' }));
      await upsertSmsSendDelivery(client, report({ requestId: 'b'.repeat(24), receivedAt: at(9) }));
      expect(await deliveryRow(client)).toEqual([
        expect.objectContaining({ request_id: report().requestId, delivery_state: 'undelivered', status_code: '2', failure_reason: 'Failed', report_count: 2, first_reported_at: at(0), reported_at: at(9) }),
      ]);
    });

    it('(8d) undelivered (2) then undelivered (16) ⇒ count 2, code still 2, the first reason', async () => {
      const { client } = getTx();
      await upsertSmsSendDelivery(client, report({ state: 'undelivered', statusCode: '2', failureReason: 'one' }));
      await upsertSmsSendDelivery(client, report({ state: 'undelivered', statusCode: '16', failureReason: 'two', requestId: 'f'.repeat(24), receivedAt: at(1) }));
      expect(await deliveryRow(client)).toEqual([expect.objectContaining({ request_id: report().requestId, status_code: '2', failure_reason: 'one', report_count: 2 })]);
    });

    it('(8e) delivered then delivered ⇒ count 2; the request id is the FIRST report\'s in every later-report leg', async () => {
      const { client } = getTx();
      await upsertSmsSendDelivery(client, report());
      await upsertSmsSendDelivery(client, report({ requestId: 'c'.repeat(24), receivedAt: at(1) }));
      await upsertSmsSendDelivery(client, report({ state: 'undelivered', statusCode: '2', requestId: 'd'.repeat(24), receivedAt: at(2) }));
      expect(await deliveryRow(client)).toEqual([expect.objectContaining({ request_id: report().requestId, report_count: 3, delivery_state: 'undelivered' })]);
    });

    it('(8h) the report received LATER settled FIRST ⇒ first_reported_at the earlier, reported_at the later; request id the first SETTLED', async () => {
      const { client } = getTx();
      await upsertSmsSendDelivery(client, report({ receivedAt: at(10) }));
      await upsertSmsSendDelivery(client, report({ requestId: 'a1'.repeat(12), receivedAt: at(4) }));
      // DR6: the request id is the FIRST MATCHING (settled) report's — ⛔ in the SET — even when a later settle was received earlier.
      expect(await deliveryRow(client)).toEqual([
        expect.objectContaining({ request_id: report().requestId, first_reported_at: at(4), reported_at: at(10), report_count: 2 }),
      ]);
    });

    it('one record per (kind, row): the same row id under another kind is another send', async () => {
      const { client } = getTx();
      await upsertSmsSendDelivery(client, report());
      await upsertSmsSendDelivery(client, report({ kind: 'pm' }));
      expect(await deliveryRow(client, 'cr')).toHaveLength(1);
      expect(await deliveryRow(client, 'pm')).toHaveLength(1);
    });
  });

  it('readSmsSendDeliveries reads under the caller\'s scope — B\'s record is ⛔ visible under A; ⛔ ids ⇒ []', async () => {
    const { client, tx } = getTx();
    const a = randomUUID();
    const b = randomUUID();
    await upsertSmsSendDelivery(client, report({ rowId: a }));
    await upsertSmsSendDelivery(client, report({ rowId: b, pariwarId: PARIWAR_B }));
    await enterAppScope(client, PARIWAR_A);
    expect((await readSmsSendDeliveries(tx, 'cr', [a, b])).map((r) => r.sendRowId)).toEqual([a]);
    expect(await readSmsSendDeliveries(tx, 'cr', [])).toEqual([]);
  });

  describe('pruneSettledSmsDeliveryReports (DR7; AC10)', () => {
    it('deletes a row settled more than 30 days ago; keeps a newer one and every PENDING row', async () => {
      const { client } = getTx();
      const old = await seedDue(client);
      const fresh = await seedDue(client);
      const pending = await seedDue(client, { receivedAt: at(-365 * 24 * 60) });
      const settle = (id: string, when: Date) =>
        client.query(`UPDATE sms_delivery_report_inbox SET match_state = 'unmatched', match_detail = 'no_crqid', settled_at = $2 WHERE report_id = $1`, [id, when]);
      const DAY = 24 * 60;
      await settle(old, at(0));
      await settle(fresh, at(19 * DAY));
      const deleted = await pruneSettledSmsDeliveryReports(client, { olderThanDays: 30, now: at(35 * DAY) });
      expect(deleted).toBeGreaterThanOrEqual(1);
      expect(await inboxRow(client, old)).toBeUndefined();
      expect(await inboxRow(client, fresh)).toBeDefined();
      expect(await inboxRow(client, pending)).toBeDefined();
    });

    it('AC10 — the 30-day boundary: settled 30 days + 1 minute ago ⇒ pruned; exactly 30 days ago ⇒ kept', async () => {
      const { client } = getTx();
      const DAY = 24 * 60;
      const over = await seedDue(client);
      const edge = await seedDue(client);
      const settle = (id: string, when: Date) =>
        client.query(`UPDATE sms_delivery_report_inbox SET match_state = 'unmatched', match_detail = 'no_crqid', settled_at = $2 WHERE report_id = $1`, [id, when]);
      await settle(over, at(-1));
      await settle(edge, at(0));
      await pruneSettledSmsDeliveryReports(client, { olderThanDays: 30, now: at(30 * DAY) });
      expect(await inboxRow(client, over)).toBeUndefined();
      expect(await inboxRow(client, edge)).toBeDefined();
    });

    it('⛔ a non-positive day count', async () => {
      const { client } = getTx();
      await expect(pruneSettledSmsDeliveryReports(client, { olderThanDays: 0, now: T0 })).rejects.toThrow(/positive/);
    });
  });
});
