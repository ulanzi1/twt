// sms_delivery_report_inbox — migration 0167 + RLS policy regression (Story 6.37b, Task 2; AC4, AC10; DR2, DR5-G
// (G-a), DR6, DR7). The inbox is GLOBAL (⛔ `pariwar_id`): FORCE RLS, EXACTLY one `USING (true)` policy per GRANTED
// command (SELECT / INSERT / UPDATE / DELETE — ⛔ FOR ALL), EXACTLY the grants (SELECT, INSERT, DELETE, and UPDATE on the
// drain's lease / settle columns — ⛔ the projection), DR7's dedupe index on EXACTLY (request id, CRQID, status code),
// the defaults the drain relies on, and every CHECK by NAME with a POSITIVE counterpart. Live DB only; per-test ROLLBACK.

import { describe, expect, it } from 'vitest';

import { SMS_REPORT_MATCH_STATES } from '../../../src/schema/sms_delivery_report_inbox.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, enterAppRoleNoScope, enterAppScope } from '../_helpers.js';

type Client = ReturnType<typeof getTx>['client'];

const T = 'sms_delivery_report_inbox';
const REQUEST = '5e1e93cad6fc054d8e759a5b';
const CRQID = 'cr0f1e2d3c4b5a49788695a4b3c2d1e0f9';

const validRow = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  request_id: REQUEST,
  crqid: CRQID,
  status_code: '1',
  event_name: 'delivered',
  failure_reason: null,
  reported_delivery_time: '2025-07-09 11:29:46',
  ...over,
});

function insertRow(client: Client, v: Record<string, unknown>) {
  const cols = Object.keys(v);
  return client.query<{ report_id: string }>(
    `INSERT INTO ${T} (${cols.join(', ')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING report_id`,
    Object.values(v),
  );
}

async function expectPgError(
  client: Client,
  run: () => Promise<unknown>,
  expected: string | { readonly code: string; readonly constraint?: string; readonly message?: unknown },
): Promise<void> {
  await client.query('SAVEPOINT expect_pg_error');
  await expect(run()).rejects.toMatchObject(typeof expected === 'string' ? { code: expected } : expected);
  await client.query('ROLLBACK TO SAVEPOINT expect_pg_error');
}

async function expectAccepted(client: Client, run: () => Promise<{ rowCount: number | null }>): Promise<void> {
  await client.query('SAVEPOINT expect_ok');
  expect((await run()).rowCount).toBe(1);
  await client.query('ROLLBACK TO SAVEPOINT expect_ok');
}

const CHECK = (constraint: string) => ({ code: '23514', constraint });
const DEDUPE = { code: '23505', constraint: 'sms_delivery_report_inbox_dedupe_uq' };
const DENIED = { code: '42501', message: expect.stringMatching(/permission denied/) };

describe.skipIf(!hasDatabase)('sms_delivery_report_inbox — migration 0167 + RLS policy regression', { timeout: 20000 }, () => {
  setupLiveDb();

  it('GLOBAL: the app role sees the inbox under ANY scope and under none (⛔ pariwar_id column)', async () => {
    const { client } = getTx();
    const { rows } = await insertRow(client, validRow());
    const id = rows[0]!.report_id;
    await enterAppRoleNoScope(client);
    expect((await client.query(`SELECT 1 FROM ${T} WHERE report_id = $1`, [id])).rows).toHaveLength(1);
    await enterAppScope(client, PARIWAR_A);
    expect((await client.query(`SELECT 1 FROM ${T} WHERE report_id = $1`, [id])).rows).toHaveLength(1);
    const cols = await client.query(`SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = 'pariwar_id'`, [T]);
    expect(cols.rows).toHaveLength(0);
  });

  it('FORCE RLS: rowsecurity AND forcerowsecurity', async () => {
    const { client } = getTx();
    const { rows } = await client.query<{ relrowsecurity: boolean; relforcerowsecurity: boolean }>(
      `SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname = $1 AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = current_schema())`,
      [T],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]!.relrowsecurity && rows[0]!.relforcerowsecurity).toBe(true);
  });

  it('⭐ DR5-G (G-a) / DR7 — EXACTLY one `true` policy per granted command, to twt_app (⛔ FOR ALL)', async () => {
    const { client } = getTx();
    const { rows } = await client.query<{ cmd: string; roles: string; qual: string | null; with_check: string | null }>(
      `SELECT cmd, roles::text AS roles, qual, with_check FROM pg_policies WHERE schemaname = current_schema() AND tablename = $1 ORDER BY cmd`,
      [T],
    );
    expect(rows.map((r) => [r.cmd, r.qual, r.with_check])).toEqual([
      ['DELETE', 'true', null],
      ['INSERT', null, 'true'],
      ['SELECT', 'true', null],
      ['UPDATE', 'true', 'true'],
    ]);
    expect(rows.every((r) => r.roles === '{twt_app}')).toBe(true);
  });

  it('⭐ DR5-G (G-a) — the grants are EXACTLY SELECT, INSERT, DELETE, and UPDATE on the lease / settle columns only', async () => {
    const { client } = getTx();
    const table = await client.query<{ privilege_type: string }>(
      `SELECT privilege_type FROM information_schema.role_table_grants WHERE grantee = 'twt_app' AND table_name = $1 ORDER BY 1`,
      [T],
    );
    expect(table.rows.map((r) => r.privilege_type)).toEqual(['DELETE', 'INSERT', 'SELECT']);
    const cols = await client.query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.column_privileges WHERE grantee = 'twt_app' AND table_name = $1 AND privilege_type = 'UPDATE' ORDER BY 1`,
      [T],
    );
    expect(cols.rows.map((r) => r.column_name)).toEqual(['attempts', 'lease_until', 'match_detail', 'match_state', 'next_attempt_at', 'settled_at']);
  });

  it('as twt_app: INSERT, a settle UPDATE and DELETE are accepted; ⛔ a projection column is ever rewritten', async () => {
    const { client } = getTx();
    await enterAppRoleNoScope(client);
    const { rows } = await insertRow(client, validRow());
    const id = rows[0]!.report_id;
    for (const set of [`request_id = 'x'`, `crqid = NULL`, `status_code = '2'`, `failure_reason = 'x'`, `received_at = now()`, `event_name = 'x'`]) {
      await expectPgError(client, () => client.query(`UPDATE ${T} SET ${set} WHERE report_id = $1`, [id]), DENIED);
    }
    await expectAccepted(client, () =>
      client.query(
        `UPDATE ${T} SET match_state = 'matched', match_detail = 'delivered', attempts = attempts + 1, lease_until = NULL,
           next_attempt_at = now(), settled_at = now() WHERE report_id = $1`,
        [id],
      ),
    );
    await expectAccepted(client, () => client.query(`DELETE FROM ${T} WHERE report_id = $1`, [id]));
  });

  it('the drain\'s defaults: pending, 0 attempts, due NOW (⛔ NULL — a NULL never matches `<= now()`), unleased, unsettled', async () => {
    const { client } = getTx();
    const { rows } = await client.query<{ match_state: string; attempts: number; due: boolean; lease_until: Date | null; settled_at: Date | null; match_detail: string | null; fresh: boolean }>(
      `INSERT INTO ${T} (request_id) VALUES ($1)
       RETURNING match_state, attempts, next_attempt_at = now() AS due, lease_until, settled_at, match_detail, received_at = now() AS fresh`,
      [REQUEST],
    );
    expect(rows[0]).toEqual({ match_state: 'pending', attempts: 0, due: true, lease_until: null, settled_at: null, match_detail: null, fresh: true });
  });

  describe('⭐ DR7 — the dedupe rule: EXACTLY (request id, CRQID, status code), blank for an absent one', () => {
    it('the index is EXACTLY that expression', async () => {
      const { client } = getTx();
      const { rows } = await client.query<{ def: string }>(`SELECT indexdef AS def FROM pg_indexes WHERE indexname = 'sms_delivery_report_inbox_dedupe_uq'`);
      expect(rows).toHaveLength(1);
      expect(rows[0]!.def).toBe(
        "CREATE UNIQUE INDEX sms_delivery_report_inbox_dedupe_uq ON public.sms_delivery_report_inbox USING btree (request_id, COALESCE(crqid, ''::text), COALESCE(status_code, ''::text))",
      );
    });

    it('the same three values with a different failure reason, event name and delivery time ⇒ a duplicate (23505)', async () => {
      const { client } = getTx();
      await insertRow(client, validRow());
      await expectPgError(
        client,
        () => insertRow(client, validRow({ failure_reason: 'other', event_name: 'other', reported_delivery_time: 'later' })),
        DEDUPE,
      );
    });

    it('a different status code, CRQID or request id ⇒ another report', async () => {
      const { client } = getTx();
      await insertRow(client, validRow());
      await expectAccepted(client, () => insertRow(client, validRow({ status_code: '2' })));
      await expectAccepted(client, () => insertRow(client, validRow({ crqid: `pm${CRQID.slice(2)}` })));
      await expectAccepted(client, () => insertRow(client, validRow({ request_id: 'abc' })));
    });

    it('the BLANK-key case: two reports with ⛔ CRQID and ⛔ status but the same request id ⇒ ONE row', async () => {
      const { client } = getTx();
      await insertRow(client, validRow({ crqid: null, status_code: null }));
      await expectPgError(client, () => insertRow(client, validRow({ crqid: null, status_code: null, event_name: 'x' })), DEDUPE);
      // `ON CONFLICT DO NOTHING` (the handler's insert) swallows it.
      const r = await client.query(
        `INSERT INTO ${T} (request_id, crqid, status_code) VALUES ($1, NULL, NULL) ON CONFLICT DO NOTHING`,
        [REQUEST],
      );
      expect(r.rowCount).toBe(0);
    });
  });

  it('⭐ LOCKSTEP — the match-state CHECK names EXACTLY the TS vocabulary', async () => {
    const { client } = getTx();
    const { rows } = await client.query<{ def: string }>(
      `SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conname = 'sms_delivery_report_inbox_match_state_check'`,
    );
    expect([...rows[0]!.def.matchAll(/'([a-z_]+)'::text/g)].map((m) => m[1]!).sort()).toEqual([...SMS_REPORT_MATCH_STATES].sort());
  });

  const SETTLED = { match_state: 'matched', match_detail: 'delivered', settled_at: '2026-10-17T05:00:00.000Z' };
  it.each<[string, Record<string, unknown>, Record<string, unknown>]>([
    ['sms_delivery_report_inbox_request_id_check', { request_id: 'a-b' }, { request_id: 'A'.repeat(64) }],
    ['sms_delivery_report_inbox_request_id_check', { request_id: '' }, { request_id: 'a' }],
    ['sms_delivery_report_inbox_crqid_check', { crqid: '0' }, { crqid: null }],
    ['sms_delivery_report_inbox_crqid_check', { crqid: `CR${CRQID.slice(2)}` }, { crqid: `ot${CRQID.slice(2)}` }],
    ['sms_delivery_report_inbox_status_code_check', { status_code: 'x' }, { status_code: '25' }],
    ['sms_delivery_report_inbox_event_name_check', { event_name: 'a b' }, { event_name: 'On_Report' }],
    ['sms_delivery_report_inbox_failure_reason_check', { failure_reason: 'x'.repeat(201) }, { failure_reason: 'x'.repeat(200) }],
    ['sms_delivery_report_inbox_failure_reason_check', { failure_reason: 'to 919812345678' }, { failure_reason: 'to #' }],
    ['sms_delivery_report_inbox_failure_reason_check', { failure_reason: 'a\tb' }, { failure_reason: 'Template not matched on DLT' }],
    ['sms_delivery_report_inbox_reported_delivery_time_check', { reported_delivery_time: 'x'.repeat(41) }, { reported_delivery_time: 'x'.repeat(40) }],
    ['sms_delivery_report_inbox_match_state_check', { ...SETTLED, match_state: 'delivered' }, SETTLED],
    ['sms_delivery_report_inbox_match_detail_check', { ...SETTLED, match_detail: 'Delivered' }, { ...SETTLED, match_detail: 'unknown_status' }],
    ['sms_delivery_report_inbox_match_detail_check', { ...SETTLED, match_detail: 'a'.repeat(65) }, { ...SETTLED, match_detail: 'other_attempt:cr' }],
    ['sms_delivery_report_inbox_settled_pair_check', { match_state: 'matched', match_detail: 'delivered' }, SETTLED],
    ['sms_delivery_report_inbox_settled_pair_check', { match_state: 'pending', match_detail: 'x' }, { match_state: 'pending' }],
    ['sms_delivery_report_inbox_settled_pair_check', { match_state: 'pending', settled_at: '2026-10-17T05:00:00.000Z' }, { match_state: 'pending' }],
    ['sms_delivery_report_inbox_attempts_check', { attempts: -1 }, { attempts: 7 }],
  ])('%s refuses %j and accepts %j', async (constraint, bad, good) => {
    const { client } = getTx();
    await expectPgError(client, () => insertRow(client, validRow(bad)), CHECK(constraint));
    await expectAccepted(client, () => insertRow(client, validRow(good)));
  });
});
