// sms_send_deliveries — migration 0167 + RLS policy regression (Story 6.37b, Task 2; AC10; DR5, DR5-G (G-a), DR6).
// Positive / negative tenant RLS, the connection-level fail-closed probe, FORCE RLS, EXACTLY the per-command policies
// DR5-G chose (SELECT / INSERT / UPDATE — ⛔ FOR ALL, ⛔ DELETE), EXACTLY the grants (SELECT, INSERT, the counting
// contract's UPDATE columns — ⛔ identity, ⛔ DELETE), cross-tenant WITH CHECK, the PK, every CHECK by NAME with a
// POSITIVE counterpart, and the DB ↔ TS lockstep. Live DB only; per-test ROLLBACK (setupLiveDb).

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { SMS_DELIVERY_STATES, SMS_SEND_KINDS } from '../../../src/schema/sms_send_deliveries.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppRoleNoScope, enterAppScope } from '../_helpers.js';

type Client = ReturnType<typeof getTx>['client'];

const T = 'sms_send_deliveries';
const REQUEST = '5e1e93cad6fc054d8e759a5b';

const validRow = (pariwarId: string = PARIWAR_A, over: Record<string, unknown> = {}): Record<string, unknown> => ({
  send_kind: 'cr',
  send_row_id: randomUUID(),
  pariwar_id: pariwarId,
  request_id: REQUEST,
  delivery_state: 'delivered',
  status_code: '1',
  failure_reason: null,
  first_reported_at: '2026-10-17T05:00:00.000Z',
  reported_at: '2026-10-17T05:00:00.000Z',
  report_count: 1,
  ...over,
});

function insertRow(client: Client, v: Record<string, unknown>) {
  const cols = Object.keys(v);
  return client.query(`INSERT INTO ${T} (${cols.join(', ')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')})`, Object.values(v));
}

async function seed(client: Client, pariwarId: string = PARIWAR_A): Promise<string> {
  const row = validRow(pariwarId);
  await insertRow(client, row);
  return row.send_row_id as string;
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
const DENIED = { code: '42501', message: expect.stringMatching(/permission denied/) };

async function checkValues(client: Client, conname: string): Promise<string[]> {
  const { rows } = await client.query<{ def: string }>(`SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conname = $1`, [conname]);
  expect(rows).toHaveLength(1);
  return [...rows[0]!.def.matchAll(/'([a-z_]+)'::text/g)].map((m) => m[1]!).sort();
}

describe.skipIf(!hasDatabase)('sms_send_deliveries — migration 0167 + RLS policy regression', { timeout: 20000 }, () => {
  setupLiveDb();

  it('positive + negative: under scope A only A rows, under scope B only B rows', async () => {
    const { client } = getTx();
    await seed(client, PARIWAR_A);
    await seed(client, PARIWAR_B);
    await enterAppScope(client, PARIWAR_A);
    const a = await client.query<{ pariwar_id: string }>(`SELECT pariwar_id FROM ${T}`);
    expect(a.rows.length).toBeGreaterThan(0);
    expect(a.rows.every((r) => r.pariwar_id === PARIWAR_A)).toBe(true);
    await enterAppScope(client, PARIWAR_B);
    const b = await client.query<{ pariwar_id: string }>(`SELECT pariwar_id FROM ${T}`);
    expect(b.rows.length).toBeGreaterThan(0);
    expect(b.rows.some((r) => r.pariwar_id === PARIWAR_A)).toBe(false);
  });

  it('connection-level fail-closed: the app role with no scope sees ⛔ no row', async () => {
    const { client } = getTx();
    await seed(client);
    await enterAppRoleNoScope(client);
    expect((await client.query(`SELECT 1 FROM ${T}`)).rows).toHaveLength(0);
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

  it('⭐ DR5-G (G-a) — the policies are EXACTLY SELECT / INSERT / UPDATE to twt_app, tenant-keyed (⛔ FOR ALL, ⛔ DELETE)', async () => {
    const { client } = getTx();
    const { rows } = await client.query<{ cmd: string; roles: string; qual: string | null; with_check: string | null }>(
      `SELECT cmd, roles::text AS roles, qual, with_check FROM pg_policies WHERE schemaname = current_schema() AND tablename = $1 ORDER BY cmd`,
      [T],
    );
    expect(rows.map((r) => r.cmd)).toEqual(['INSERT', 'SELECT', 'UPDATE']);
    expect(rows.every((r) => r.roles === '{twt_app}')).toBe(true);
    for (const r of rows) expect(`${r.qual ?? ''} ${r.with_check ?? ''}`).toMatch(/pariwar_id = \(NULLIF\(current_setting\('app\.pariwar_id'::text, true\), ''::text\)\)::uuid/);
    const update = rows.find((r) => r.cmd === 'UPDATE')!;
    expect(update.with_check).toBe(update.qual);
  });

  it('⭐ DR5-G (G-a) — the grants are EXACTLY SELECT + INSERT, and UPDATE on the counting contract\'s columns only', async () => {
    const { client } = getTx();
    const table = await client.query<{ privilege_type: string }>(
      `SELECT privilege_type FROM information_schema.role_table_grants WHERE grantee = 'twt_app' AND table_name = $1 ORDER BY 1`,
      [T],
    );
    expect(table.rows.map((r) => r.privilege_type)).toEqual(['INSERT', 'SELECT']);
    const cols = await client.query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.column_privileges WHERE grantee = 'twt_app' AND table_name = $1 AND privilege_type = 'UPDATE' ORDER BY 1`,
      [T],
    );
    expect(cols.rows.map((r) => r.column_name)).toEqual(
      ['delivery_state', 'failure_reason', 'first_reported_at', 'report_count', 'reported_at', 'status_code'].sort(),
    );
  });

  it('⛔ DELETE for twt_app; ⛔ an identity column rewritten; the contract columns ARE writable', async () => {
    const { client } = getTx();
    const id = await seed(client);
    await enterAppScope(client, PARIWAR_A);
    await expectPgError(client, () => client.query(`DELETE FROM ${T} WHERE send_row_id = $1`, [id]), DENIED);
    for (const set of [`send_kind = 'ce'`, `send_row_id = gen_random_uuid()`, `request_id = 'x'`, `pariwar_id = pariwar_id`]) {
      await expectPgError(client, () => client.query(`UPDATE ${T} SET ${set} WHERE send_row_id = $1`, [id]), DENIED);
    }
    await expectAccepted(client, () =>
      client.query(
        `UPDATE ${T} SET delivery_state = 'undelivered', status_code = '2', failure_reason = 'x', first_reported_at = first_reported_at,
           reported_at = reported_at + interval '1 minute', report_count = report_count + 1 WHERE send_row_id = $1`,
        [id],
      ),
    );
  });

  it('cross-tenant INSERT: under scope A, a row carrying Pariwar B is refused by WITH CHECK (42501); A\'s is accepted', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    await expectPgError(client, () => insertRow(client, validRow(PARIWAR_B)), { code: '42501', message: expect.stringMatching(/row-level security/) });
    expect((await insertRow(client, validRow(PARIWAR_A))).rowCount).toBe(1);
  });

  it('cross-tenant UPDATE: B\'s row is INVISIBLE under scope A', async () => {
    const { client } = getTx();
    const a = await seed(client, PARIWAR_A);
    const b = await seed(client, PARIWAR_B);
    await enterAppScope(client, PARIWAR_A);
    expect((await client.query(`UPDATE ${T} SET report_count = report_count + 1 WHERE send_row_id = $1`, [b])).rowCount).toBe(0);
    expect((await client.query(`UPDATE ${T} SET report_count = report_count + 1 WHERE send_row_id = $1`, [a])).rowCount).toBe(1);
  });

  it('the PK is (send_kind, send_row_id) — one record per send; the same row id under another kind is another send', async () => {
    const { client } = getTx();
    const id = await seed(client);
    await expectPgError(client, () => insertRow(client, validRow(PARIWAR_A, { send_row_id: id })), { code: '23505', constraint: 'sms_send_deliveries_pk' });
    expect((await insertRow(client, validRow(PARIWAR_A, { send_row_id: id, send_kind: 'pm' }))).rowCount).toBe(1);
  });

  it('⭐ LOCKSTEP — the kind and state CHECKs name EXACTLY the TS vocabularies', async () => {
    const { client } = getTx();
    expect(await checkValues(client, 'sms_send_deliveries_send_kind_check')).toEqual([...SMS_SEND_KINDS].sort());
    expect(await checkValues(client, 'sms_send_deliveries_delivery_state_check')).toEqual([...SMS_DELIVERY_STATES].sort());
  });

  it.each<[string, Record<string, unknown>, Record<string, unknown>]>([
    ['sms_send_deliveries_send_kind_check', { send_kind: 'ot' }, { send_kind: 'sn' }],
    // Story 5.11b (0184) — an alert SMS send's record.
    ['sms_send_deliveries_send_kind_check', { send_kind: 'xx' }, { send_kind: 'as' }],
    ['sms_send_deliveries_delivery_state_check', { delivery_state: 'intermediate' }, { delivery_state: 'undelivered' }],
    ['sms_send_deliveries_request_id_check', { request_id: 'a-b' }, { request_id: 'A'.repeat(64) }],
    ['sms_send_deliveries_status_code_check', { status_code: '1000' }, { status_code: '25' }],
    ['sms_send_deliveries_failure_reason_check', { failure_reason: 'x'.repeat(201) }, { failure_reason: 'x'.repeat(200) }],
    ['sms_send_deliveries_failure_reason_check', { failure_reason: 'to 9812345678' }, { failure_reason: 'to #' }],
    ['sms_send_deliveries_failure_reason_check', { failure_reason: 'a\nb' }, { failure_reason: 'DLT Scrubbing Failed' }],
    // 0168 (code review round 2): the separated-number backstop, as on the inbox.
    ['sms_send_deliveries_failure_reason_check', { failure_reason: 'Failed for +91 98123 45678' }, { failure_reason: 'Failed for #' }],
    ['sms_send_deliveries_failure_reason_check', { failure_reason: '981 234 5678' }, { failure_reason: 'op 123456 error 25' }],
    ['sms_send_deliveries_report_count_check', { report_count: 0 }, { report_count: 3 }],
    [
      'sms_send_deliveries_reported_order_check',
      { first_reported_at: '2026-10-17T06:00:00.000Z', reported_at: '2026-10-17T05:00:00.000Z' },
      { first_reported_at: '2026-10-17T05:00:00.000Z', reported_at: '2026-10-17T06:00:00.000Z' },
    ],
  ])('%s refuses %j and accepts %j', async (constraint, bad, good) => {
    const { client } = getTx();
    await expectPgError(client, () => insertRow(client, validRow(PARIWAR_A, bad)), CHECK(constraint));
    await expectAccepted(client, () => insertRow(client, validRow(PARIWAR_A, good)));
  });
});
