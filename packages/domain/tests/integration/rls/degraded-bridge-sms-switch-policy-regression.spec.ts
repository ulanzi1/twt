// The degraded-mode bridge's Super Admin switch — migration 0188 + RLS policy regression (Story 5.8b, Task 2; AC12;
// `2026-10-28-415` FS17 (a); Panel `2026-10-28-414` Q1 A). GLOBAL tables (the audit_integrity_acknowledgements posture): FORCE RLS
// with a `USING (true)` SELECT for `twt_app` (read with AND without a Pariwar scope), ⛔ write grant for `twt_app`, the service
// role's narrow grants, the singleton CHECK, the required-reason CHECK, the APPEND-ONLY history and the un-removable control row
// (triggers bind every role), created OFF. Then the domain accessors' row life: ON → OFF → ON writes three history rows and the last
// state wins; a same-state change writes nothing. Live DB only; per-test ROLLBACK (setupLiveDb).

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { readDegradedBridgeSmsSwitch, setDegradedBridgeSmsSwitchInTx } from '../../../src/degraded-mode/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, enterAppRoleNoScope, enterAppScope } from '../_helpers.js';

type Client = ReturnType<typeof getTx>['client'];

const SWITCH = 'degraded_bridge_sms_switch';
const CHANGES = 'degraded_bridge_sms_switch_changes';

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
const APPEND_ONLY = { code: 'P0001', message: expect.stringMatching(/append-only/) };
const UNREMOVABLE = { code: 'P0001', message: expect.stringMatching(/cannot be removed/) };

async function tablePrivileges(client: Client, table: string, grantee: string): Promise<string[]> {
  const { rows } = await client.query<{ privilege_type: string }>(
    `SELECT privilege_type FROM information_schema.role_table_grants WHERE table_name = $1 AND grantee = $2 ORDER BY 1`,
    [table, grantee],
  );
  return rows.map((r) => r.privilege_type);
}

describe.skipIf(!hasDatabase)('the degraded-mode bridge switch — migration 0188 + RLS policy regression', { timeout: 20000 }, () => {
  setupLiveDb();

  it('⭐ FORCE RLS on both tables, ONE global SELECT policy each (`USING (true)`, twt_app), ⛔ other policy', async () => {
    const { client } = getTx();
    const { rows } = await client.query<{ relname: string; relrowsecurity: boolean; relforcerowsecurity: boolean }>(
      `SELECT relname, relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname = ANY($1) ORDER BY relname`,
      [[SWITCH, CHANGES]],
    );
    expect(rows).toEqual([
      { relname: SWITCH, relrowsecurity: true, relforcerowsecurity: true },
      { relname: CHANGES, relrowsecurity: true, relforcerowsecurity: true },
    ]);
    const policies = await client.query<{ tablename: string; policyname: string; cmd: string; roles: string[]; qual: string }>(
      `SELECT tablename, policyname, cmd, roles::text[] AS roles, qual FROM pg_policies WHERE tablename = ANY($1) ORDER BY tablename`,
      [[SWITCH, CHANGES]],
    );
    expect(policies.rows).toEqual([
      { tablename: SWITCH, policyname: `${SWITCH}_global_select`, cmd: 'SELECT', roles: ['twt_app'], qual: 'true' },
      { tablename: CHANGES, policyname: `${CHANGES}_global_select`, cmd: 'SELECT', roles: ['twt_app'], qual: 'true' },
    ]);
  });

  it('⭐ grants — twt_app SELECT only on both; twt_service SELECT + column UPDATE on the switch, SELECT + INSERT on the history; ⛔ DELETE anywhere', async () => {
    const { client } = getTx();
    expect(await tablePrivileges(client, SWITCH, 'twt_app')).toEqual(['SELECT']);
    expect(await tablePrivileges(client, CHANGES, 'twt_app')).toEqual(['SELECT']);
    expect(await tablePrivileges(client, SWITCH, 'twt_service')).toEqual(['SELECT']);
    expect(await tablePrivileges(client, CHANGES, 'twt_service')).toEqual(['INSERT', 'SELECT']);
    const cols = await client.query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.column_privileges
        WHERE table_name = $1 AND grantee = 'twt_service' AND privilege_type = 'UPDATE' ORDER BY 1`,
      [SWITCH],
    );
    expect(cols.rows.map((r) => r.column_name)).toEqual(['enabled', 'last_change_id', 'updated_at']);
  });

  it('⭐ created OFF — ONE control row (id 1), never changed', async () => {
    const { client } = getTx();
    // ⚠ A shared DB may have been switched by an earlier COMMITTED run — read the seed row's id and the CHECK, not history.
    const { rows } = await client.query<{ id: number }>(`SELECT id FROM ${SWITCH}`);
    expect(rows).toEqual([{ id: 1 }]);
    const def = await client.query<{ d: string }>(
      `SELECT column_default AS d FROM information_schema.columns WHERE table_name = $1 AND column_name = 'enabled'`,
      [SWITCH],
    );
    expect(def.rows[0]!.d).toBe('false');
  });

  it('⭐ twt_app reads the switch WITH and WITHOUT a Pariwar scope, and ⛔ writes it', async () => {
    const { client } = getTx();
    await client.query('SAVEPOINT s');
    await enterAppRoleNoScope(client);
    expect((await readDegradedBridgeSmsSwitch(client)).enabled).toBeTypeOf('boolean');
    await expectPgError(client, () => client.query(`UPDATE ${SWITCH} SET enabled = true WHERE id = 1`), DENIED);
    await expectPgError(
      client,
      () => client.query(`INSERT INTO ${CHANGES} (enabled, changed_by_actor, reason) VALUES (true, $1, 'r')`, [randomUUID()]),
      DENIED,
    );
    await client.query('ROLLBACK TO SAVEPOINT s');
    await enterAppScope(client, PARIWAR_A);
    expect((await readDegradedBridgeSmsSwitch(client)).enabled).toBeTypeOf('boolean');
    await client.query('ROLLBACK TO SAVEPOINT s');
  });

  it('⭐ the singleton and the required reason are CHECKed; the history is APPEND-ONLY and the control row un-removable (the superuser too)', async () => {
    const { client } = getTx();
    await expectPgError(client, () => client.query(`INSERT INTO ${SWITCH} (id, enabled) VALUES (2, false)`), {
      code: '23514',
      constraint: 'degraded_bridge_sms_switch_singleton_check',
    });
    for (const reason of ['', '   ', 'x'.repeat(501)]) {
      await expectPgError(
        client,
        () => client.query(`INSERT INTO ${CHANGES} (enabled, changed_by_actor, reason) VALUES (true, $1, $2)`, [randomUUID(), reason]),
        { code: '23514', constraint: 'degraded_bridge_sms_switch_changes_reason_check' },
      );
    }
    const { rows } = await client.query<{ change_id: string }>(
      `INSERT INTO ${CHANGES} (enabled, changed_by_actor, reason) VALUES (true, $1, 'go-live') RETURNING change_id`,
      [randomUUID()],
    );
    const id = rows[0]!.change_id;
    await expectPgError(client, () => client.query(`UPDATE ${CHANGES} SET reason = 'rewritten' WHERE change_id = $1`, [id]), APPEND_ONLY);
    await expectPgError(client, () => client.query(`DELETE FROM ${CHANGES} WHERE change_id = $1`, [id]), APPEND_ONLY);
    await expectPgError(client, () => client.query(`TRUNCATE ${CHANGES} CASCADE`), APPEND_ONLY);
    await expectPgError(client, () => client.query(`DELETE FROM ${SWITCH}`), UNREMOVABLE);
    await expectPgError(client, () => client.query(`TRUNCATE ${SWITCH}`), UNREMOVABLE);
  });

  // The writer is the SERVICE POOL: in production a BYPASSRLS `twt_service` login (SERVICE_DATABASE_URL), in dev / CI the superuser
  // login (apps/api/src/deps.ts) — the test's own connection. (`SET ROLE twt_service` would NOT model it: the NOLOGIN group role is
  // NOBYPASSRLS, so FORCE RLS hides the row from it.) Its grants are asserted above.
  it('⭐ AC12 — as the service pool: ON → OFF → ON writes THREE history rows and the last state wins; a same-state change writes NOTHING', async () => {
    const { client } = getTx();
    const actor = randomUUID();
    const before = await client.query<{ n: string }>(`SELECT count(*) AS n FROM ${CHANGES}`);
    // Start from a known state without a history row: force OFF if a committed run left it ON.
    const start = await readDegradedBridgeSmsSwitch(client);
    if (start.enabled) await setDegradedBridgeSmsSwitchInTx(client, { enabled: false, actorId: actor, reason: 'reset', auditId: null });
    const base = Number((await client.query<{ n: string }>(`SELECT count(*) AS n FROM ${CHANGES}`)).rows[0]!.n);
    expect(base).toBeGreaterThanOrEqual(Number(before.rows[0]!.n));

    const on = await setDegradedBridgeSmsSwitchInTx(client, { enabled: true, actorId: actor, reason: 'templates approved', auditId: null });
    expect(on.changed).toBe(true);
    expect(on.state).toMatchObject({ enabled: true, changedByActor: actor, reason: 'templates approved' });
    const again = await setDegradedBridgeSmsSwitchInTx(client, { enabled: true, actorId: actor, reason: 'twice', auditId: null });
    expect(again).toMatchObject({ changed: false, state: { enabled: true, reason: 'templates approved' } });
    expect((await setDegradedBridgeSmsSwitchInTx(client, { enabled: false, actorId: actor, reason: 'cost', auditId: null })).changed).toBe(true);
    const last = await setDegradedBridgeSmsSwitchInTx(client, { enabled: true, actorId: actor, reason: 'back on', auditId: null });
    expect(last.state).toMatchObject({ enabled: true, reason: 'back on' });

    const history = await client.query<{ enabled: boolean; reason: string }>(
      `SELECT enabled, reason FROM ${CHANGES} WHERE changed_by_actor = $1 AND reason <> 'reset' ORDER BY changed_at`,
      [actor],
    );
    expect(history.rows).toEqual([
      { enabled: true, reason: 'templates approved' },
      { enabled: false, reason: 'cost' },
      { enabled: true, reason: 'back on' },
    ]);
    expect((await readDegradedBridgeSmsSwitch(client)).enabled).toBe(true);
  });
});
