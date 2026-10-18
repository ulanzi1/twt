// claim_contact_calls — migration 0169 + RLS policy regression (Story 6.37c, Task 1; AC7, AC8; LD10). Positive /
// negative tenant RLS, the connection-level fail-closed probe, FORCE RLS, EXACTLY the per-command policies (SELECT /
// INSERT — ⛔ UPDATE, ⛔ DELETE, ⛔ FOR ALL), EXACTLY the grants (SELECT, INSERT — APPEND-ONLY), cross-tenant WITH CHECK,
// both FKs, every CHECK by NAME with a POSITIVE counterpart (⭐ `reached` only when the person or a family member
// answered), and the DB ↔ TS lockstep. Live DB only; per-test ROLLBACK (setupLiveDb).

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { CONTACT_CALL_ANSWERED_BY, CONTACT_CALL_OUTCOMES } from '../../../src/schema/claim_contact_calls.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppRoleNoScope, enterAppScope, seedClaim } from '../_helpers.js';

type Client = ReturnType<typeof getTx>['client'];

const T = 'claim_contact_calls';

const validRow = (claimCaseId: string, pariwarId: string = PARIWAR_A, over: Record<string, unknown> = {}): Record<string, unknown> => ({
  pariwar_id: pariwarId,
  claim_case_id: claimCaseId,
  person_key: 'claimant',
  chase: 'correction',
  called_on: '2026-10-10',
  answered_by: 'the_person',
  outcome: 'reached',
  recorded_by_actor: 'da-actor',
  recorded_by_display: 'District Admin',
  ...over,
});

function insertRow(client: Client, v: Record<string, unknown>) {
  const cols = Object.keys(v);
  return client.query<{ call_id: string }>(
    `INSERT INTO ${T} (${cols.join(', ')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING call_id`,
    Object.values(v),
  );
}

async function seed(client: Client, pariwarId: string = PARIWAR_A): Promise<{ claimCaseId: string; callId: string }> {
  const { tx } = getTx();
  const claimCaseId = await seedClaim(tx, pariwarId);
  const { rows } = await insertRow(client, validRow(claimCaseId, pariwarId));
  return { claimCaseId, callId: rows[0]!.call_id };
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

describe.skipIf(!hasDatabase)('claim_contact_calls — migration 0169 + RLS policy regression', { timeout: 20000 }, () => {
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

  it('⭐ the policies are EXACTLY SELECT / INSERT to twt_app, tenant-keyed (⛔ UPDATE, ⛔ DELETE, ⛔ FOR ALL)', async () => {
    const { client } = getTx();
    const { rows } = await client.query<{ cmd: string; roles: string; qual: string | null; with_check: string | null }>(
      `SELECT cmd, roles::text AS roles, qual, with_check FROM pg_policies WHERE schemaname = current_schema() AND tablename = $1 ORDER BY cmd`,
      [T],
    );
    expect(rows.map((r) => r.cmd)).toEqual(['INSERT', 'SELECT']);
    expect(rows.every((r) => r.roles === '{twt_app}')).toBe(true);
    for (const r of rows) expect(`${r.qual ?? ''} ${r.with_check ?? ''}`).toMatch(/pariwar_id = \(NULLIF\(current_setting\('app\.pariwar_id'::text, true\), ''::text\)\)::uuid/);
  });

  it('⭐ APPEND-ONLY — the grants are EXACTLY SELECT + INSERT (⛔ a column UPDATE grant either); UPDATE and DELETE are refused (42501)', async () => {
    const { client } = getTx();
    const table = await client.query<{ privilege_type: string }>(
      `SELECT privilege_type FROM information_schema.role_table_grants WHERE grantee = 'twt_app' AND table_name = $1 ORDER BY 1`,
      [T],
    );
    expect(table.rows.map((r) => r.privilege_type)).toEqual(['INSERT', 'SELECT']);
    const cols = await client.query(
      `SELECT 1 FROM information_schema.column_privileges WHERE grantee = 'twt_app' AND table_name = $1 AND privilege_type = 'UPDATE'`,
      [T],
    );
    expect(cols.rows).toHaveLength(0);
    const { callId } = await seed(client);
    await enterAppScope(client, PARIWAR_A);
    await expectPgError(client, () => client.query(`UPDATE ${T} SET outcome = 'not_reached' WHERE call_id = $1`, [callId]), DENIED);
    await expectPgError(client, () => client.query(`DELETE FROM ${T} WHERE call_id = $1`, [callId]), DENIED);
  });

  it('cross-tenant INSERT: under scope A, a row carrying Pariwar B is refused by WITH CHECK (42501); A\'s is accepted', async () => {
    const { client } = getTx();
    const { tx } = getTx();
    const claimCaseId = await seedClaim(tx, PARIWAR_A);
    await enterAppScope(client, PARIWAR_A);
    await expectPgError(client, () => insertRow(client, validRow(claimCaseId, PARIWAR_B)), {
      code: '42501',
      message: expect.stringMatching(/row-level security/),
    });
    expect((await insertRow(client, validRow(claimCaseId, PARIWAR_A))).rowCount).toBe(1);
  });

  it('the claim and ladder FKs refuse a dangling id (23503); a real ladder is accepted', async () => {
    const { client } = getTx();
    const { tx } = getTx();
    const claimCaseId = await seedClaim(tx, PARIWAR_A);
    await expectPgError(client, () => insertRow(client, validRow(randomUUID())), { code: '23503', constraint: 'claim_contact_calls_claim_case_id_fk' });
    await expectPgError(client, () => insertRow(client, validRow(claimCaseId, PARIWAR_A, { ladder_id: randomUUID() })), {
      code: '23503',
      constraint: 'claim_contact_calls_ladder_id_fk',
    });
    const { rows } = await client.query<{ ladder_id: string }>(
      `INSERT INTO claim_contact_ladders (pariwar_id, claim_case_id, chase, run_id, person_key, recipient_number_hash, origin_row_id,
         origin_sent_on, whatsapp_step, sms2_due_on)
       VALUES ($1, $2, 'certificate', gen_random_uuid(), 'claimant', 'h', gen_random_uuid(), '2026-10-01', 'skipped:whatsapp_not_built', '2026-10-03')
       RETURNING ladder_id`,
      [PARIWAR_A, claimCaseId],
    );
    await expectAccepted(client, () => insertRow(client, validRow(claimCaseId, PARIWAR_A, { ladder_id: rows[0]!.ladder_id, chase: 'certificate' })));
  });

  it('⭐ LOCKSTEP — the answered-by and outcome CHECKs name EXACTLY the TS vocabularies', async () => {
    const { client } = getTx();
    expect(await checkValues(client, 'claim_contact_calls_answered_by_check')).toEqual([...CONTACT_CALL_ANSWERED_BY].sort());
    expect(await checkValues(client, 'claim_contact_calls_outcome_check')).toEqual([...CONTACT_CALL_OUTCOMES].sort());
  });

  it.each<[string, Record<string, unknown>, Record<string, unknown>]>([
    ['claim_contact_calls_chase_check', { chase: 'peer_mesh' }, { chase: 'certificate' }],
    ['claim_contact_calls_answered_by_check', { answered_by: 'neighbour' }, { answered_by: 'family_member' }],
    ['claim_contact_calls_outcome_check', { outcome: 'voicemail' }, { outcome: 'not_reached' }],
    // ⭐ `-351` 5 A — a call REACHES the family only when the person or a family member answered.
    ['claim_contact_calls_reached_answered_check', { answered_by: 'nobody' }, { answered_by: 'nobody', outcome: 'not_reached' }],
    ['claim_contact_calls_reached_answered_check', { answered_by: 'someone_else' }, { answered_by: 'someone_else', outcome: 'not_reached' }],
    ['claim_contact_calls_person_key_check', { person_key: ' ' }, { person_key: 'nominee:abc' }],
    ['claim_contact_calls_recorded_by_check', { recorded_by_display: '' }, { recorded_by_display: 'D' }],
    ['claim_contact_calls_recorded_by_check', { recorded_by_actor: ' ' }, { recorded_by_actor: 'a' }],
  ])('%s refuses %j and accepts %j', async (constraint, bad, good) => {
    const { client } = getTx();
    const { tx } = getTx();
    const claimCaseId = await seedClaim(tx, PARIWAR_A);
    await expectPgError(client, () => insertRow(client, validRow(claimCaseId, PARIWAR_A, bad)), CHECK(constraint));
    await expectAccepted(client, () => insertRow(client, validRow(claimCaseId, PARIWAR_A, good)));
  });
});
