// The SMS delivery-report accessors — live (Story 6.37b, Task 3; AC4, AC6 (8a)–(8h), AC7, AC10; DR6–DR8). Per-test
// ROLLBACK (setupLiveDb). ⚠ The inbox is GLOBAL and other suites commit rows into it: every claim here runs at a clock
// in the year 2000 against rows inserted due then, so ⛔ another suite's row is ever due in these legs.

import { randomUUID } from 'node:crypto';

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
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppScope } from '../_helpers.js';

type Client = ReturnType<typeof getTx>['client'];

const T0 = new Date('2000-01-01T00:00:00.000Z');
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
  const { rows } = await client.query(`SELECT * FROM sms_send_deliveries WHERE send_kind = $1 AND send_row_id = $2`, [kind, rowId]);
  return rows;
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
      expect(await persistSmsDeliveryReports(client, [{ ...a, failureReason: 'second', eventName: 'other', reportedDeliveryTime: 'x' }])).toBe(0);
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
      await upsertSmsSendDelivery(client, report({ state: 'undelivered', statusCode: '16', failureReason: 'Rejected', receivedAt: at(5) }));
      expect(await deliveryRow(client)).toEqual([
        expect.objectContaining({ delivery_state: 'undelivered', status_code: '16', failure_reason: 'Rejected', report_count: 2, reported_at: at(5) }),
      ]);
    });

    it('(8c) undelivered then delivered ⇒ STILL undelivered (absorbing), count 2, code / reason the first\'s, reported_at the later', async () => {
      const { client } = getTx();
      await upsertSmsSendDelivery(client, report({ state: 'undelivered', statusCode: '2', failureReason: 'Failed' }));
      await upsertSmsSendDelivery(client, report({ requestId: 'b'.repeat(24), receivedAt: at(9) }));
      expect(await deliveryRow(client)).toEqual([
        expect.objectContaining({ delivery_state: 'undelivered', status_code: '2', failure_reason: 'Failed', report_count: 2, first_reported_at: at(0), reported_at: at(9) }),
      ]);
    });

    it('(8d) undelivered (2) then undelivered (16) ⇒ count 2, code still 2, the first reason', async () => {
      const { client } = getTx();
      await upsertSmsSendDelivery(client, report({ state: 'undelivered', statusCode: '2', failureReason: 'one' }));
      await upsertSmsSendDelivery(client, report({ state: 'undelivered', statusCode: '16', failureReason: 'two', receivedAt: at(1) }));
      expect(await deliveryRow(client)).toEqual([expect.objectContaining({ status_code: '2', failure_reason: 'one', report_count: 2 })]);
    });

    it('(8e) delivered then delivered ⇒ count 2; the request id is the FIRST report\'s in every later-report leg', async () => {
      const { client } = getTx();
      await upsertSmsSendDelivery(client, report());
      await upsertSmsSendDelivery(client, report({ requestId: 'c'.repeat(24), receivedAt: at(1) }));
      await upsertSmsSendDelivery(client, report({ state: 'undelivered', statusCode: '2', requestId: 'd'.repeat(24), receivedAt: at(2) }));
      expect(await deliveryRow(client)).toEqual([expect.objectContaining({ request_id: report().requestId, report_count: 3, delivery_state: 'undelivered' })]);
    });

    it('(8h) the report received LATER settled FIRST ⇒ first_reported_at the earlier, reported_at the later', async () => {
      const { client } = getTx();
      await upsertSmsSendDelivery(client, report({ receivedAt: at(10) }));
      await upsertSmsSendDelivery(client, report({ receivedAt: at(4) }));
      expect(await deliveryRow(client)).toEqual([expect.objectContaining({ first_reported_at: at(4), reported_at: at(10), report_count: 2 })]);
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
      const pending = await seedDue(client, { receivedAt: new Date('1999-01-01T00:00:00.000Z') });
      const settle = (id: string, when: Date) =>
        client.query(`UPDATE sms_delivery_report_inbox SET match_state = 'unmatched', match_detail = 'no_crqid', settled_at = $2 WHERE report_id = $1`, [id, when]);
      await settle(old, new Date('2000-01-01T00:00:00.000Z'));
      await settle(fresh, new Date('2000-01-20T00:00:00.000Z'));
      const deleted = await pruneSettledSmsDeliveryReports(client, { olderThanDays: 30, now: new Date('2000-02-05T00:00:00.000Z') });
      expect(deleted).toBeGreaterThanOrEqual(1);
      expect(await inboxRow(client, old)).toBeUndefined();
      expect(await inboxRow(client, fresh)).toBeDefined();
      expect(await inboxRow(client, pending)).toBeDefined();
    });

    it('⛔ a non-positive day count', async () => {
      const { client } = getTx();
      await expect(pruneSettledSmsDeliveryReports(client, { olderThanDays: 0, now: T0 })).rejects.toThrow(/positive/);
    });
  });
});
