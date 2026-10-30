// questionnaire_versions + questionnaire_version_steps — migration 0192 + RLS policy regression (Story 6.33, Task 2; AC2,
// AC12). Positive / negative RLS as `twt_app`: versions readable by every tenant, INSERT only for the current Pariwar AND
// ⛔ `direct` (a direct version as `twt_app` REFUSED); steps keyed on `scope_pariwar_id` — a Pariwar Admin's own
// propose / approve / return / withdraw INSERTs pass, `made_live` / `pariwar_reverted` / a NULL scope are REFUSED, another
// Pariwar's steps invisible, a global (NULL-scope) step visible; FORCE + per-command policies; append-only for EVERY role
// (UPDATE / DELETE / TRUNCATE); every AC2 CHECK; `seq` an identity; the DB ↔ TS lockstep (steps, floor).
// Live DB only; per-test ROLLBACK (setupLiveDb).

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { CHAIN_STEPS, DB_VERSION_FLOOR } from '../../../src/questionnaires/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { enterAppRoleNoScope, enterAppScope } from '../_helpers.js';

type Client = ReturnType<typeof getTx>['client'];

const CHECK = (constraint: string) => ({ code: '23514', constraint });
const RLS = { code: '42501', message: expect.stringMatching(/row-level security/) };
const DENIED = { code: '42501', message: expect.stringMatching(/permission denied/) };
const APPEND_ONLY = { code: '23000', message: expect.stringMatching(/append-only/) };

async function expectPgError(client: Client, run: () => Promise<unknown>, expected: Record<string, unknown>): Promise<void> {
  await client.query('SAVEPOINT expect_pg_error');
  await expect(run()).rejects.toMatchObject(expected);
  await client.query('ROLLBACK TO SAVEPOINT expect_pg_error');
}

/** A random DB version number (well above anything a committing spec takes). */
const freshVersion = () => 500_000 + Math.floor(Math.random() * 499_999);

interface VersionOver {
  id?: string;
  kind?: string;
  version?: number;
  versionId?: string;
  origin?: string | null;
  direct?: boolean;
  reason?: string | null;
  definition?: unknown;
  base?: string;
  ruledBase?: string;
}

async function insertVersion(client: Client, over: VersionOver = {}): Promise<{ id: string; versionId: string }> {
  const kind = over.kind ?? 'peer_mesh';
  const version = over.version ?? freshVersion();
  const versionId = over.versionId ?? `${kind}.v${version}`;
  const id = over.id ?? randomUUID();
  const definition = over.definition ?? { kind, versionId, version };
  await client.query(
    `INSERT INTO questionnaire_versions (id, kind, version, version_id, base_version_id, ruled_base_code_version_id, origin_pariwar_id, definition, authored_by_actor, authored_by_display, direct, reason)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pa', 'Pariwar Admin', $9, $10)`,
    [
      id,
      kind,
      version,
      versionId,
      over.base ?? `${kind}.v4`,
      over.ruledBase ?? `${kind}.v4`,
      over.origin === undefined ? randomUUID() : over.origin,
      JSON.stringify(definition),
      over.direct ?? false,
      over.reason ?? null,
    ],
  );
  return { id, versionId };
}

interface StepOver {
  step?: string;
  target?: string | null;
  scope?: string | null;
  note?: string | null;
  hindi?: boolean | null;
  classification?: boolean | null;
}

async function insertStep(client: Client, versionId: string, over: StepOver = {}): Promise<number> {
  const step = over.step ?? 'proposed';
  const ticks = step === 'approved' ? true : null;
  const r = await client.query<{ seq: string }>(
    `INSERT INTO questionnaire_version_steps (version_id, step, target_pariwar_id, scope_pariwar_id, actor, actor_display, note, hindi_reviewed, classification_attested)
     VALUES ($1, $2, $3, $4, 'pa', 'Pariwar Admin', $5, $6, $7) RETURNING seq`,
    [
      versionId,
      step,
      over.target ?? null,
      over.scope === undefined ? null : over.scope,
      over.note === undefined ? (step === 'returned' ? 'please reword' : null) : over.note,
      over.hindi === undefined ? ticks : over.hindi,
      over.classification === undefined ? ticks : over.classification,
    ],
  );
  return Number(r.rows[0]!.seq);
}

describe.skipIf(!hasDatabase)('questionnaire chain — migration 0192 + RLS policy regression', { timeout: 20000 }, () => {
  setupLiveDb();

  it('FORCE RLS + per-command policies on both tables (SELECT / INSERT — ⛔ UPDATE, ⛔ DELETE, ⛔ FOR ALL); ⛔ UPDATE / DELETE grant', async () => {
    const { client } = getTx();
    for (const table of ['questionnaire_versions', 'questionnaire_version_steps']) {
      const cls = await client.query(`SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname = $1`, [table]);
      expect(cls.rows[0]).toEqual({ relrowsecurity: true, relforcerowsecurity: true });
      const pol = await client.query<{ cmd: string }>(`SELECT cmd FROM pg_policies WHERE tablename = $1`, [table]);
      expect(pol.rows.map((r) => r.cmd).sort()).toEqual(['INSERT', 'SELECT']);
      const grants = await client.query<{ privilege_type: string }>(
        `SELECT privilege_type FROM information_schema.role_table_grants WHERE table_name = $1 AND grantee = 'twt_app'`,
        [table],
      );
      expect(grants.rows.map((r) => r.privilege_type).sort()).toEqual(['INSERT', 'SELECT']);
    }
  });

  it('versions: readable by EVERY tenant (reference data — a version made live for all resolves in any Pariwar)', async () => {
    const { client } = getTx();
    const [a, b] = [randomUUID(), randomUUID()];
    const v = await insertVersion(client, { origin: a });
    await enterAppScope(client, b);
    expect((await client.query('SELECT 1 FROM questionnaire_versions WHERE version_id = $1', [v.versionId])).rows).toHaveLength(1);
  });

  it('versions INSERT as twt_app: own origin passes; another origin, a NULL origin, and a DIRECT version are REFUSED', async () => {
    const { client } = getTx();
    const [a, b] = [randomUUID(), randomUUID()];
    await enterAppScope(client, a);
    await insertVersion(client, { origin: a });
    await expectPgError(client, () => insertVersion(client, { origin: b }), RLS);
    await expectPgError(client, () => insertVersion(client, { origin: null, direct: true, reason: 'direct' }), RLS);
    await expectPgError(client, () => insertVersion(client, { origin: a, direct: true, reason: 'direct' }), RLS);
  });

  it("steps as twt_app: a Pariwar Admin's own propose / approve / return / withdraw INSERT; made_live, pariwar_reverted and a NULL scope are REFUSED", async () => {
    const { client } = getTx();
    const a = randomUUID();
    const v = await insertVersion(client, { origin: a });
    await enterAppScope(client, a);
    for (const step of ['proposed', 'approved', 'returned', 'withdrawn']) await insertStep(client, v.versionId, { step, scope: a });
    await expectPgError(client, () => insertStep(client, v.versionId, { step: 'made_live', target: a, scope: a }), RLS);
    await expectPgError(client, () => insertStep(client, v.versionId, { step: 'pariwar_reverted', target: a, scope: a }), RLS);
    await expectPgError(client, () => insertStep(client, v.versionId, { step: 'proposed', scope: null }), RLS);
    await expectPgError(client, () => insertStep(client, v.versionId, { step: 'proposed', scope: randomUUID() }), RLS);
  });

  it("steps SELECT: own scope, the global (NULL-scope) rows and ANY step of a version the Pariwar ORIGINATED (review RV2) — ⛔ another Pariwar's step on a version it did not originate; the fail-closed probe sees only global rows", async () => {
    const { client } = getTx();
    const [a, b] = [randomUUID(), randomUUID()];
    const v = await insertVersion(client, { origin: a });
    await insertStep(client, v.versionId, { scope: a });
    await insertStep(client, v.versionId, { step: 'approved', scope: a });
    await insertStep(client, v.versionId, { step: 'made_live', target: null, scope: null });
    await insertStep(client, v.versionId, { step: 'made_live', target: b, scope: b });
    const steps = async () =>
      (await client.query<{ step: string; scope_pariwar_id: string | null }>('SELECT step, scope_pariwar_id FROM questionnaire_version_steps WHERE version_id = $1 ORDER BY seq', [v.versionId])).rows;
    await enterAppScope(client, a);
    // Review RV2 — the ORIGIN also reads the `made_live` scoped to ANOTHER Pariwar (b): the state machine needs it (a version live
    // elsewhere is no longer withdrawable). The API still DISPLAYS only the steps scoped to the viewer or to all.
    expect(await steps()).toEqual([
      { step: 'proposed', scope_pariwar_id: a },
      { step: 'approved', scope_pariwar_id: a },
      { step: 'made_live', scope_pariwar_id: null },
      { step: 'made_live', scope_pariwar_id: b },
    ]);
    // The TARGET (b) did not originate the version: its own scope and the global row — ⛔ a's proposed / approved.
    await enterAppScope(client, b);
    expect(await steps()).toEqual([
      { step: 'made_live', scope_pariwar_id: null },
      { step: 'made_live', scope_pariwar_id: b },
    ]);
    // A Pariwar that neither originated the version nor is its target sees ONLY the global row.
    await enterAppScope(client, randomUUID());
    expect(await steps()).toEqual([{ step: 'made_live', scope_pariwar_id: null }]);
    await client.query(`SELECT set_config('app.pariwar_id', '', true)`);
    await enterAppRoleNoScope(client);
    expect(await steps()).toEqual([{ step: 'made_live', scope_pariwar_id: null }]);
  });

  it('append-only for EVERY role: ⛔ UPDATE / DELETE (the trigger, the superuser included); twt_app has ⛔ grant', async () => {
    const { client } = getTx();
    const a = randomUUID();
    const v = await insertVersion(client, { origin: a });
    await insertStep(client, v.versionId, { scope: a });
    await expectPgError(client, () => client.query(`UPDATE questionnaire_versions SET reason = 'x' WHERE id = $1`, [v.id]), APPEND_ONLY);
    await expectPgError(client, () => client.query(`DELETE FROM questionnaire_versions WHERE id = $1`, [v.id]), APPEND_ONLY);
    await expectPgError(client, () => client.query(`UPDATE questionnaire_version_steps SET note = 'x' WHERE version_id = $1`, [v.versionId]), APPEND_ONLY);
    await expectPgError(client, () => client.query(`DELETE FROM questionnaire_version_steps WHERE version_id = $1`, [v.versionId]), APPEND_ONLY);
    await enterAppScope(client, a);
    await expectPgError(client, () => client.query(`UPDATE questionnaire_versions SET reason = 'x' WHERE id = $1`, [v.id]), DENIED);
    await expectPgError(client, () => client.query(`DELETE FROM questionnaire_version_steps WHERE version_id = $1`, [v.versionId]), DENIED);
  });

  it('⛔ TRUNCATE — both triggers are bound', async () => {
    const { client } = getTx();
    const t = await client.query<{ tgname: string }>(
      `SELECT tgname FROM pg_trigger WHERE tgrelid IN ('questionnaire_versions'::regclass, 'questionnaire_version_steps'::regclass) AND NOT tgisinternal ORDER BY tgname`,
    );
    expect(t.rows.map((r) => r.tgname)).toEqual([
      'questionnaire_version_steps_no_truncate',
      'questionnaire_version_steps_no_update_delete',
      'questionnaire_versions_no_truncate',
      'questionnaire_versions_no_update_delete',
    ]);
    await expectPgError(client, () => client.query('TRUNCATE questionnaire_version_steps'), APPEND_ONLY);
  });

  it('versions CHECKs: the floor (⚠ LOCKSTEP with DB_VERSION_FLOOR), the id shape, the definition names the row, direct ⇒ reason, NULL origin ⇒ direct', async () => {
    const { client } = getTx();
    expect(DB_VERSION_FLOOR).toBe(1000);
    await expectPgError(client, () => insertVersion(client, { version: 999 }), CHECK('questionnaire_versions_floor_check'));
    // Review RV31 — the BOUNDARY both ways, from the constant (a DB `>= 1001` or `>= 999` would pass the `999` leg alone):
    await expectPgError(client, () => insertVersion(client, { kind: 'ground_inspection', version: DB_VERSION_FLOOR - 1 }), CHECK('questionnaire_versions_floor_check'));
    await client.query('SAVEPOINT floor_ok');
    await insertVersion(client, { kind: 'ground_inspection', version: DB_VERSION_FLOOR }); // exactly the floor is ADMITTED
    await client.query('ROLLBACK TO SAVEPOINT floor_ok');
    await expectPgError(client, () => insertVersion(client, { version: 1001, versionId: 'peer_mesh.v1002' }), CHECK('questionnaire_versions_version_id_check'));
    await expectPgError(client, () => insertVersion(client, { kind: 'other' }), CHECK('questionnaire_versions_kind_check'));
    await expectPgError(client, () => insertVersion(client, { kind: 'ground_inspection', base: 'peer_mesh.v4' }), CHECK('questionnaire_versions_base_check'));
    const n = freshVersion();
    await expectPgError(client, () => insertVersion(client, { version: n, definition: { kind: 'peer_mesh', versionId: 'peer_mesh.v1', version: n } }), CHECK('questionnaire_versions_definition_check'));
    await expectPgError(client, () => insertVersion(client, { version: n, definition: { kind: 'peer_mesh', versionId: `peer_mesh.v${n}`, version: String(n) } }), CHECK('questionnaire_versions_definition_check'));
    await expectPgError(client, () => insertVersion(client, { direct: true, reason: null }), CHECK('questionnaire_versions_reason_check'));
    await expectPgError(client, () => insertVersion(client, { direct: true, reason: '   ' }), CHECK('questionnaire_versions_reason_check'));
    await expectPgError(client, () => insertVersion(client, { direct: true, reason: 'x'.repeat(501) }), CHECK('questionnaire_versions_reason_check'));
    await expectPgError(client, () => insertVersion(client, { origin: null, direct: false }), CHECK('questionnaire_versions_origin_check'));
    await insertVersion(client, { origin: null, direct: true, reason: 'x'.repeat(500) });
    const v = freshVersion();
    await insertVersion(client, { version: v });
    await expectPgError(client, () => insertVersion(client, { version: v }), { code: '23505' });
  });

  it('steps CHECKs: the enum (⚠ LOCKSTEP with CHAIN_STEPS), target only on resolution steps, revert ⇒ target, scope = target there, the ticks only and always on approved, a return needs a note', async () => {
    const { client } = getTx();
    const a = randomUUID();
    const v = await insertVersion(client, { origin: a });
    const def = await client.query<{ def: string }>(
      `SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conname = 'questionnaire_version_steps_step_check'`,
    );
    for (const s of CHAIN_STEPS) expect(def.rows[0]!.def).toContain(`'${s}'`);
    expect(def.rows[0]!.def.match(/'[a-z_]+'/g)).toHaveLength(CHAIN_STEPS.length);
    await expectPgError(client, () => insertStep(client, v.versionId, { step: 'published' }), CHECK('questionnaire_version_steps_step_check'));
    await expectPgError(client, () => insertStep(client, v.versionId, { step: 'proposed', target: a, scope: a }), CHECK('questionnaire_version_steps_target_check'));
    await expectPgError(client, () => insertStep(client, v.versionId, { step: 'pariwar_reverted', target: null, scope: null }), CHECK('questionnaire_version_steps_target_check'));
    await expectPgError(client, () => insertStep(client, v.versionId, { step: 'made_live', target: a, scope: null }), CHECK('questionnaire_version_steps_scope_check'));
    await expectPgError(client, () => insertStep(client, v.versionId, { step: 'approved', scope: a, hindi: false }), CHECK('questionnaire_version_steps_ticks_check'));
    await expectPgError(client, () => insertStep(client, v.versionId, { step: 'approved', scope: a, classification: null }), CHECK('questionnaire_version_steps_ticks_check'));
    await expectPgError(client, () => insertStep(client, v.versionId, { step: 'made_live', target: a, scope: a, hindi: true }), CHECK('questionnaire_version_steps_ticks_check'));
    await expectPgError(client, () => insertStep(client, v.versionId, { step: 'returned', scope: a, note: null }), CHECK('questionnaire_version_steps_note_check'));
    await expectPgError(client, () => insertStep(client, v.versionId, { step: 'proposed', scope: a, note: 'x'.repeat(501) }), CHECK('questionnaire_version_steps_note_check'));
    await expectPgError(client, () => insertStep(client, 'peer_mesh.v999999999', { scope: a }), { code: '23503' });
  });

  it('`seq` is a GENERATED ALWAYS identity (a supplied value is refused) and increases in insert order within ONE transaction', async () => {
    const { client } = getTx();
    const a = randomUUID();
    const v = await insertVersion(client, { origin: a });
    const s1 = await insertStep(client, v.versionId, { scope: a });
    const s2 = await insertStep(client, v.versionId, { step: 'approved', scope: a });
    const s3 = await insertStep(client, v.versionId, { step: 'made_live', target: a, scope: a });
    expect(s1 < s2 && s2 < s3).toBe(true);
    await expectPgError(
      client,
      () => client.query(`INSERT INTO questionnaire_version_steps (version_id, step, scope_pariwar_id, actor, actor_display, seq) VALUES ($1, 'proposed', $2, 'pa', 'PA', 1)`, [v.versionId, a]),
      { code: '428C9' },
    );
    // twt_app needs ⛔ sequence grant to insert (an identity column).
    await enterAppScope(client, a);
    await insertStep(client, v.versionId, { step: 'withdrawn', scope: a });
  });
});
