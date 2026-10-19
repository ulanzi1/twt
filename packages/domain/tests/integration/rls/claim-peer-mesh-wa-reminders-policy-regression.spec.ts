// claim_peer_mesh_wa_reminders — migration 0171 + RLS policy regression (Story 6.31, Task 1; AC1; WR1). Positive / negative
// tenant RLS, the connection-level fail-closed probe, FORCE RLS, EXACTLY the per-command policies (SELECT / INSERT / UPDATE —
// ⛔ FOR ALL, ⛔ DELETE), EXACTLY the grants (SELECT, INSERT, the DELIVERY UPDATE columns — ⛔ identity, ⛔ DELETE), cross-tenant
// WITH CHECK, the two owner FKs, the indexes. (The CHECKs, the trigger and the grammar are the record spec's —
// `claim/peer-mesh-wa-reminder-record.spec.ts`.) Live DB only; per-test ROLLBACK.

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppRoleNoScope, enterAppScope, seedClaim } from '../_helpers.js';

type Client = ReturnType<typeof getTx>['client'];

const T = 'claim_peer_mesh_wa_reminders';

/** As the superuser: a claim, its selection and ONE ping (the replies spec's `seedPing`). */
async function seedPing(client: Client, pariwarId: string) {
  const { tx } = getTx();
  const claimCaseId = await seedClaim(tx, pariwarId);
  const selectionId = randomUUID();
  const memberId = randomUUID();
  await client.query(
    `INSERT INTO claim_peer_mesh_selections (selection_id, claim_case_id, pariwar_id, deceased_member_id, deceased_created_at, metric_id,
       metric_version, selected_member_ids, candidate_snapshot, response_window_expires_at)
     VALUES ($1, $2, $3, $4, now(), 'm', 1, ARRAY[$5]::uuid[], '[]'::jsonb, now() + interval '72 hours')`,
    [selectionId, claimCaseId, pariwarId, randomUUID(), memberId],
  );
  const pingId = randomUUID();
  await client.query(`INSERT INTO claim_peer_mesh_pings (ping_id, selection_id, pariwar_id, member_id) VALUES ($1, $2, $3, $4)`, [
    pingId,
    selectionId,
    pariwarId,
    memberId,
  ]);
  return { claimCaseId, selectionId, pingId, memberId };
}

type Ping = Awaited<ReturnType<typeof seedPing>>;

const rowOf = (p: Ping, pariwarId: string, over: Record<string, unknown> = {}): Record<string, unknown> => ({
  ping_id: p.pingId,
  pariwar_id: pariwarId,
  claim_case_id: p.claimCaseId,
  selection_id: p.selectionId,
  member_id: p.memberId,
  send_outcome: 'skipped_answered',
  claimed_at: '2026-10-19T05:00:00.000Z',
  claimed_by_job: 'job-1',
  ...over,
});

function insertRow(client: Client, v: Record<string, unknown>) {
  const cols = Object.keys(v);
  return client.query<{ reminder_id: string }>(
    `INSERT INTO ${T} (${cols.join(', ')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING reminder_id`,
    Object.values(v),
  );
}

async function seed(client: Client, pariwarId: string = PARIWAR_A): Promise<{ ping: Ping; reminderId: string }> {
  const ping = await seedPing(client, pariwarId);
  const attempting = { send_outcome: 'attempting', aging_since: '2026-10-19T05:00:00.000Z' };
  const { rows } = await insertRow(client, rowOf(ping, pariwarId, attempting));
  return { ping, reminderId: rows[0]!.reminder_id };
}

async function expectPgError(
  client: Client,
  run: () => Promise<unknown>,
  expected: { readonly code: string; readonly constraint?: string; readonly message?: unknown },
): Promise<void> {
  await client.query('SAVEPOINT expect_pg_error');
  await expect(run()).rejects.toMatchObject(expected);
  await client.query('ROLLBACK TO SAVEPOINT expect_pg_error');
}

const DENIED = { code: '42501', message: expect.stringMatching(/permission denied/) };

describe.skipIf(!hasDatabase)('claim_peer_mesh_wa_reminders — migration 0171 + RLS policy regression', { timeout: 20000 }, () => {
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

  it('the policies are EXACTLY SELECT / INSERT / UPDATE to twt_app, tenant-keyed (⛔ FOR ALL, ⛔ DELETE)', async () => {
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

  it('the grants are EXACTLY SELECT + INSERT, and UPDATE on the delivery columns only', async () => {
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
      [
        'aging_since',
        'attempt_count',
        'claimed_at',
        'claimed_by_job',
        'detail',
        'first_detail',
        'locale',
        'locale_source',
        'parked_at',
        'provider_message_id',
        'recipient_number_hash',
        'send_outcome',
        'send_started_at',
        'send_updated_at',
        'template_name',
      ].sort(),
    );
  });

  it('⛔ DELETE for twt_app; ⛔ an identity column rewritten (42501); a delivery column IS writable', async () => {
    const { client } = getTx();
    const { reminderId } = await seed(client);
    await enterAppScope(client, PARIWAR_A);
    await expectPgError(client, () => client.query(`DELETE FROM ${T} WHERE reminder_id = $1`, [reminderId]), DENIED);
    for (const set of [
      'ping_id = ping_id',
      'pariwar_id = pariwar_id',
      'claim_case_id = claim_case_id',
      'selection_id = selection_id',
      'member_id = member_id',
      'reminder_id = reminder_id',
      'created_at = now()',
    ]) {
      await expectPgError(client, () => client.query(`UPDATE ${T} SET ${set} WHERE reminder_id = $1`, [reminderId]), DENIED);
    }
    const ok = await client.query(`UPDATE ${T} SET send_updated_at = clock_timestamp() WHERE reminder_id = $1`, [reminderId]);
    expect(ok.rowCount).toBe(1);
  });

  it("cross-tenant INSERT: under scope A, a row carrying Pariwar B is refused by WITH CHECK (42501); A's is accepted", async () => {
    const { client } = getTx();
    const a = await seedPing(client, PARIWAR_A);
    const b = await seedPing(client, PARIWAR_B);
    await enterAppScope(client, PARIWAR_A);
    await expectPgError(client, () => insertRow(client, rowOf(b, PARIWAR_B)), { code: '42501', message: expect.stringMatching(/row-level security/) });
    expect((await insertRow(client, rowOf(a, PARIWAR_A))).rowCount).toBe(1);
  });

  it("cross-tenant UPDATE: B's row is INVISIBLE under scope A", async () => {
    const { client } = getTx();
    const a = await seed(client, PARIWAR_A);
    const b = await seed(client, PARIWAR_B);
    await enterAppScope(client, PARIWAR_A);
    expect((await client.query(`UPDATE ${T} SET send_updated_at = clock_timestamp() WHERE reminder_id = $1`, [b.reminderId])).rowCount).toBe(0);
    expect((await client.query(`UPDATE ${T} SET send_updated_at = clock_timestamp() WHERE reminder_id = $1`, [a.reminderId])).rowCount).toBe(1);
  });

  it('the owner FKs: ⛔ a reminder on another Pariwar\'s ping, another neighbour, or a claim that is ⛔ its selection\'s (23503)', async () => {
    const { client } = getTx();
    const a = await seedPing(client, PARIWAR_A);
    const other = await seedPing(client, PARIWAR_A);
    await expectPgError(client, () => insertRow(client, rowOf(a, PARIWAR_B)), { code: '23503' });
    await expectPgError(client, () => insertRow(client, rowOf(a, PARIWAR_A, { member_id: randomUUID() })), {
      code: '23503',
      constraint: 'claim_peer_mesh_wa_reminders_ping_owner_fk',
    });
    await expectPgError(client, () => insertRow(client, rowOf(a, PARIWAR_A, { claim_case_id: other.claimCaseId })), {
      code: '23503',
      constraint: 'claim_peer_mesh_wa_reminders_selection_owner_fk',
    });
    expect((await insertRow(client, rowOf(a, PARIWAR_A))).rowCount).toBe(1);
  });

  it('the indexes: (pariwar_id, claim_case_id) leads the tenant read; the partial (claimed_at) the sweep\'s attempting scans', async () => {
    const { client } = getTx();
    const { rows } = await client.query<{ indexname: string; indexdef: string }>(
      `SELECT indexname, indexdef FROM pg_indexes WHERE tablename = $1 AND indexname IN ($2, $3) ORDER BY indexname`,
      [T, 'claim_peer_mesh_wa_reminders_attempting_idx', 'claim_peer_mesh_wa_reminders_claim_idx'],
    );
    expect(rows.map((r) => r.indexname)).toEqual(['claim_peer_mesh_wa_reminders_attempting_idx', 'claim_peer_mesh_wa_reminders_claim_idx']);
    expect(rows[0]!.indexdef).toMatch(/\(claimed_at\) WHERE \(send_outcome = 'attempting'::text\)$/);
    expect(rows[1]!.indexdef).toMatch(/\(pariwar_id, claim_case_id\)$/);
  });
});
