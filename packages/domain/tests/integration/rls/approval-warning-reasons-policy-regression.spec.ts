// approval_warning_reasons — migration 0142 + RLS policy regression (Story 6.23a, Task 1; NW16, NW17; AC12). The
// claim-certificate-reminder model: positive / negative RLS, the fail-closed probe, FORCE, ⛔ no DELETE for `twt_app`,
// per-command policies, cross-tenant WITH CHECK — PLUS this table's own append-only shape: ⛔ no UPDATE of any column
// but `replaced_at`, `replaced_at` one-way, the DEFERRED replacement checks (⛔ a replaced_at with no replacement; ⛔ a
// replacement of a still-active reason — `-279` A9), the composite self-FK (⛔ across Pariwars), IN SCOPE `FOR SHARE`
// works (the UPDATE policy — Trap 16), the TRUNCATE trigger binding (Trap 17(c)) and the DB ↔ TS lockstep.
// Live DB only; per-test ROLLBACK (setupLiveDb) — the deferred trigger is forced with `SET CONSTRAINTS … IMMEDIATE`.
// ⭐ Fresh Pariwar ids per test (Trap 18) even though nothing commits here.

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
  APPROVAL_WARNING_REASON_CODE_PATTERN,
  APPROVAL_WARNING_REASON_LABEL_MAX,
  APPROVAL_WARNING_REASON_WHEN_TO_USE_MAX,
} from '../../../src/schema/approval_warning_reasons.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { enterAppRoleNoScope, enterAppScope } from '../_helpers.js';

type Client = ReturnType<typeof getTx>['client'];

const code = () => `awr_${randomUUID().replace(/-/g, '').slice(0, 8)}`;

async function insertReason(
  client: Client,
  pariwarId: string,
  over: Partial<Record<'reason_id' | 'code' | 'label_en' | 'when_to_use' | 'replaces_reason_id' | 'replaced_at', unknown>> = {},
): Promise<string> {
  const reasonId = (over.reason_id as string | undefined) ?? randomUUID();
  await client.query(
    `INSERT INTO approval_warning_reasons (reason_id, pariwar_id, code, label_en, when_to_use, replaces_reason_id, replaced_at, created_by_actor, created_by_display)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'sa', 'Super Admin')`,
    [
      reasonId,
      pariwarId,
      over.code ?? code(),
      over.label_en ?? 'Family confirmed the change in person',
      over.when_to_use ?? 'Use when the inspector met the family and they confirmed the change.',
      over.replaces_reason_id ?? null,
      over.replaced_at ?? null,
    ],
  );
  return reasonId;
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

/** Fire the DEFERRED replacement trigger now (the test's transaction never commits). */
const checkNow = (client: Client) => client.query('SET CONSTRAINTS approval_warning_reasons_replacement_coherence IMMEDIATE');

const CHECK = (constraint: string) => ({ code: '23514', constraint });
const DENIED = { code: '42501', message: expect.stringMatching(/permission denied/) };
const APPEND_ONLY = { code: '23000' };

describe.skipIf(!hasDatabase)('approval_warning_reasons — migration 0142 + RLS policy regression', { timeout: 20000 }, () => {
  setupLiveDb();

  it('positive + negative: scope A shows only A rows, scope B only B rows', async () => {
    const { client } = getTx();
    const [a, b] = [randomUUID(), randomUUID()];
    await insertReason(client, a);
    await insertReason(client, b);
    await enterAppScope(client, a);
    const ra = await client.query<{ pariwar_id: string }>('SELECT pariwar_id FROM approval_warning_reasons');
    expect(ra.rows.map((r) => r.pariwar_id)).toEqual([a]);
    await enterAppScope(client, b);
    const rb = await client.query<{ pariwar_id: string }>('SELECT pariwar_id FROM approval_warning_reasons');
    expect(rb.rows.map((r) => r.pariwar_id)).toEqual([b]);
  });

  it('connection-level fail-closed: the app role with no scope sees ⛔ no row', async () => {
    const { client } = getTx();
    const a = randomUUID();
    await insertReason(client, a);
    await enterAppRoleNoScope(client);
    expect((await client.query('SELECT 1 FROM approval_warning_reasons WHERE pariwar_id = $1', [a])).rows).toHaveLength(0);
  });

  it('FORCE RLS + per-command policies (SELECT / INSERT / UPDATE — ⛔ no DELETE, ⛔ no FOR ALL)', async () => {
    const { client } = getTx();
    const cls = await client.query<{ relrowsecurity: boolean; relforcerowsecurity: boolean }>(
      `SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname = 'approval_warning_reasons'`,
    );
    expect(cls.rows[0]).toEqual({ relrowsecurity: true, relforcerowsecurity: true });
    const pol = await client.query<{ cmd: string; qual: string | null; with_check: string | null }>(
      `SELECT cmd, qual, with_check FROM pg_policies WHERE tablename = 'approval_warning_reasons'`,
    );
    expect(pol.rows.map((r) => r.cmd).sort()).toEqual(['INSERT', 'SELECT', 'UPDATE']);
    const upd = pol.rows.find((r) => r.cmd === 'UPDATE')!;
    expect(upd.with_check).toBe(upd.qual);
  });

  it('⛔ no DELETE for twt_app; and ⛔ a direct DELETE for ANY role (the trigger)', async () => {
    const { client } = getTx();
    const a = randomUUID();
    const id = await insertReason(client, a);
    await expectPgError(client, () => client.query('DELETE FROM approval_warning_reasons WHERE reason_id = $1', [id]), APPEND_ONLY);
    await enterAppScope(client, a);
    await expectPgError(client, () => client.query('DELETE FROM approval_warning_reasons WHERE reason_id = $1', [id]), DENIED);
  });

  it('cross-tenant INSERT is refused by WITH CHECK; an in-scope INSERT passes', async () => {
    const { client } = getTx();
    const [a, b] = [randomUUID(), randomUUID()];
    await enterAppScope(client, a);
    await expectPgError(client, () => insertReason(client, b), { code: '42501', message: expect.stringMatching(/row-level security/) });
    await insertReason(client, a);
  });

  it('twt_app can UPDATE `replaced_at` ONLY — every other column is denied by the grant', async () => {
    const { client } = getTx();
    const a = randomUUID();
    const id = await insertReason(client, a);
    await enterAppScope(client, a);
    for (const col of ['label_en', 'when_to_use', 'code', 'created_by_display', 'replaces_reason_id', 'pariwar_id']) {
      await expectPgError(client, () => client.query(`UPDATE approval_warning_reasons SET ${col} = ${col} WHERE reason_id = $1`, [id]), DENIED);
    }
  });

  it('⭐ IN SCOPE, `SELECT … FOR SHARE` on an active reason returns it (the UPDATE policy + grant exist — Trap 16); out of scope it returns ⛔ nothing', async () => {
    const { client } = getTx();
    const [a, b] = [randomUUID(), randomUUID()];
    const id = await insertReason(client, a);
    await enterAppScope(client, a);
    const own = await client.query('SELECT reason_id FROM approval_warning_reasons WHERE reason_id = $1 AND replaced_at IS NULL FOR SHARE', [id]);
    expect(own.rows).toHaveLength(1);
    await enterAppScope(client, b);
    const other = await client.query('SELECT reason_id FROM approval_warning_reasons WHERE reason_id = $1 FOR SHARE', [id]);
    expect(other.rows).toHaveLength(0);
  });

  it('a REPLACEMENT in one transaction passes the deferred checks: the old row stamped, the new row naming it', async () => {
    const { client } = getTx();
    const a = randomUUID();
    const oldId = await insertReason(client, a);
    await enterAppScope(client, a);
    await client.query('SAVEPOINT ok');
    const upd = await client.query('UPDATE approval_warning_reasons SET replaced_at = clock_timestamp() WHERE reason_id = $1 AND replaced_at IS NULL', [oldId]);
    expect(upd.rowCount).toBe(1);
    await insertReason(client, a, { replaces_reason_id: oldId });
    await checkNow(client);
    await client.query('RELEASE SAVEPOINT ok');
    const rows = await client.query<{ reason_id: string; replaced: boolean }>(
      'SELECT reason_id, replaced_at IS NOT NULL AS replaced FROM approval_warning_reasons WHERE pariwar_id = $1',
      [a],
    );
    expect(rows.rows.find((r) => r.reason_id === oldId)?.replaced).toBe(true);
    expect(rows.rows.filter((r) => !r.replaced)).toHaveLength(1);
  });

  it('⛔ `replaced_at` is one-way — ⛔ set twice, ⛔ back to NULL', async () => {
    const { client } = getTx();
    const a = randomUUID();
    const oldId = await insertReason(client, a);
    await client.query('UPDATE approval_warning_reasons SET replaced_at = clock_timestamp() WHERE reason_id = $1', [oldId]);
    await insertReason(client, a, { replaces_reason_id: oldId });
    await enterAppScope(client, a);
    await expectPgError(client, () => client.query('UPDATE approval_warning_reasons SET replaced_at = NULL WHERE reason_id = $1', [oldId]), APPEND_ONLY);
    await expectPgError(
      client,
      () => client.query("UPDATE approval_warning_reasons SET replaced_at = replaced_at + interval '1 second' WHERE reason_id = $1", [oldId]),
      APPEND_ONLY,
    );
  });

  it('⛔ an UPDATE of any column but `replaced_at` — for EVERY role (the jsonb compare)', async () => {
    const { client } = getTx();
    const a = randomUUID();
    const id = await insertReason(client, a);
    await expectPgError(client, () => client.query("UPDATE approval_warning_reasons SET label_en = 'edited' WHERE reason_id = $1", [id]), APPEND_ONLY);
    await expectPgError(client, () => client.query("UPDATE approval_warning_reasons SET when_to_use = 'edited' WHERE reason_id = $1", [id]), APPEND_ONLY);
  });

  it('⛔ COMMIT a `replaced_at` with ⛔ no replacement row (the deferred check — never a disguised delete)', async () => {
    const { client } = getTx();
    const a = randomUUID();
    const id = await insertReason(client, a);
    await enterAppScope(client, a);
    await client.query('SAVEPOINT s');
    await client.query('UPDATE approval_warning_reasons SET replaced_at = clock_timestamp() WHERE reason_id = $1', [id]);
    await expect(checkNow(client)).rejects.toMatchObject({ code: '23000', message: expect.stringMatching(/no replacement row/) });
    await client.query('ROLLBACK TO SAVEPOINT s');
  });

  it('⛔ COMMIT a replacement whose target is still ACTIVE (`-279` A9)', async () => {
    const { client } = getTx();
    const a = randomUUID();
    const id = await insertReason(client, a);
    await enterAppScope(client, a);
    await client.query('SAVEPOINT s');
    await insertReason(client, a, { replaces_reason_id: id });
    await expect(checkNow(client)).rejects.toMatchObject({ code: '23000', message: expect.stringMatching(/still active/) });
    await client.query('ROLLBACK TO SAVEPOINT s');
  });

  it('⛔ a replacement pointing at ANOTHER Pariwar\'s reason (the composite self-FK — `-279` A9)', async () => {
    const { client } = getTx();
    const [a, b] = [randomUUID(), randomUUID()];
    const other = await insertReason(client, b);
    await expectPgError(client, () => insertReason(client, a, { replaces_reason_id: other }), {
      code: '23503',
      constraint: 'approval_warning_reasons_replaces_fk',
    });
  });

  it('a reason is replaced at most once (UNIQUE replaces_reason_id) and never by itself', async () => {
    const { client } = getTx();
    const a = randomUUID();
    const oldId = await insertReason(client, a);
    await client.query('UPDATE approval_warning_reasons SET replaced_at = clock_timestamp() WHERE reason_id = $1', [oldId]);
    await insertReason(client, a, { replaces_reason_id: oldId });
    await expectPgError(client, () => insertReason(client, a, { replaces_reason_id: oldId }), {
      code: '23505',
      constraint: 'approval_warning_reasons_replaces_uq',
    });
    const self = randomUUID();
    await expectPgError(client, () => insertReason(client, a, { reason_id: self, replaces_reason_id: self }), CHECK('approval_warning_reasons_not_self_check'));
  });

  it('the CHECKs: code shape (⛔ the generic\'s code), label and note bounds, a blank author', async () => {
    const { client } = getTx();
    const a = randomUUID();
    await expectPgError(client, () => insertReason(client, a, { code: 'warnings_reviewed' }), CHECK('approval_warning_reasons_code_check'));
    await expectPgError(client, () => insertReason(client, a, { code: 'awr_ABCDEF12' }), CHECK('approval_warning_reasons_code_check'));
    await expectPgError(client, () => insertReason(client, a, { label_en: '   ' }), CHECK('approval_warning_reasons_label_check'));
    await expectPgError(client, () => insertReason(client, a, { label_en: 'x'.repeat(APPROVAL_WARNING_REASON_LABEL_MAX + 1) }), CHECK('approval_warning_reasons_label_check'));
    await expectPgError(client, () => insertReason(client, a, { when_to_use: '' }), CHECK('approval_warning_reasons_when_to_use_check'));
    await expectPgError(
      client,
      () => insertReason(client, a, { when_to_use: 'x'.repeat(APPROVAL_WARNING_REASON_WHEN_TO_USE_MAX + 1) }),
      CHECK('approval_warning_reasons_when_to_use_check'),
    );
    await insertReason(client, a, { label_en: 'x'.repeat(APPROVAL_WARNING_REASON_LABEL_MAX), when_to_use: 'y'.repeat(APPROVAL_WARNING_REASON_WHEN_TO_USE_MAX) });
    const dup = code();
    await insertReason(client, a, { code: dup });
    await expectPgError(client, () => insertReason(client, a, { code: dup }), { code: '23505', constraint: 'approval_warning_reasons_pariwar_code_uq' });
  });

  it('DB ↔ TS lockstep: the code pattern', async () => {
    const { client } = getTx();
    const { rows } = await client.query<{ def: string }>(
      `SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conname = 'approval_warning_reasons_code_check'`,
    );
    expect(rows[0]!.def).toContain(APPROVAL_WARNING_REASON_CODE_PATTERN.source);
  });

  it('⛔ TRUNCATE — the trigger binding, and the function refuses on a temp twin (Trap 17(c))', async () => {
    const { client } = getTx();
    const { rows } = await client.query<{ tgenabled: string; tgtype: number; fn: string }>(
      `SELECT t.tgenabled, t.tgtype, p.proname AS fn FROM pg_trigger t JOIN pg_proc p ON p.oid = t.tgfoid
        WHERE t.tgrelid = 'approval_warning_reasons'::regclass AND t.tgname = 'approval_warning_reasons_no_truncate'`,
    );
    expect(rows).toEqual([{ tgenabled: 'O', tgtype: 34, fn: 'approval_warning_reasons_reject_mutation' }]);
    await client.query('CREATE TEMP TABLE awr_truncate_twin (id int) ON COMMIT DROP');
    await client.query('TRUNCATE awr_truncate_twin');
    await client.query(
      'CREATE TRIGGER awr_truncate_twin_no_truncate BEFORE TRUNCATE ON awr_truncate_twin EXECUTE FUNCTION approval_warning_reasons_reject_mutation()',
    );
    await expect(client.query('TRUNCATE awr_truncate_twin')).rejects.toMatchObject(APPEND_ONLY);
  });
});
