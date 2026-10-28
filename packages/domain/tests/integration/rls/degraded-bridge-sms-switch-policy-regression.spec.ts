// The degraded-mode bridge's Super Admin switch — migration 0188 + RLS policy regression (Story 5.8b, Task 2; AC12;
// `2026-10-28-415` FS17 (a); Panel `2026-10-28-414` Q1 A). GLOBAL tables (the audit_integrity_acknowledgements posture): FORCE RLS
// with a `USING (true)` SELECT for `twt_app` (read with AND without a Pariwar scope), ⛔ write grant for `twt_app`, the service
// role's narrow grants, the singleton CHECK, the required-reason and name-snapshot CHECKs, the APPEND-ONLY history and the
// un-removable control row (triggers bind every role), the `last_change_id` FK, created OFF — that last proven by running 0188's OWN
// text into a fresh schema (code review 2026-10-28, P2-5: a shared database's row says what earlier runs left, not what the seed
// wrote). Then the domain accessors' row life: ON → OFF → ON writes three history rows and the last state wins; a same-state change
// writes nothing. Code review 2026-10-28 (second pass): the control row moves only with a NEW, agreeing history row (trigger), the
// history's `audit_id` is NOT NULL, and the writer runs on a BYPASSRLS login inheriting `twt_service`. Code review 2026-10-28 (third
// pass): that history row must exist (fail closed) and be the NEWEST change, and `changed_at` is the DB's. Every leg that reads the
// switch's state first takes the control row's lock — `bridge-switch-concurrency.spec.ts` COMMITS flips in a parallel fork.
// Live DB only; per-test ROLLBACK (setupLiveDb).

import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { readDegradedBridgeSmsSwitch, setDegradedBridgeSmsSwitchInTx } from '../../../src/degraded-mode/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, enterAppRoleNoScope, enterAppScope } from '../_helpers.js';

type Client = ReturnType<typeof getTx>['client'];

const SWITCH = 'degraded_bridge_sms_switch';
const CHANGES = 'degraded_bridge_sms_switch_changes';
const MIGRATION_0188 = resolve(dirname(fileURLToPath(import.meta.url)), '../../../migrations/0188_degraded-bridge-sms.sql');

async function expectPgError(
  client: Client,
  run: () => Promise<unknown>,
  expected: { readonly code: string; readonly constraint?: string; readonly column?: string; readonly message?: unknown },
): Promise<void> {
  await client.query('SAVEPOINT expect_pg_error');
  await expect(run()).rejects.toMatchObject(expected);
  await client.query('ROLLBACK TO SAVEPOINT expect_pg_error');
}

const DENIED = { code: '42501', message: expect.stringMatching(/permission denied/) };
const APPEND_ONLY = { code: 'P0001', message: expect.stringMatching(/append-only/) };
const UNREMOVABLE = { code: 'P0001', message: expect.stringMatching(/cannot be removed/) };
const NEEDS_NEW_CHANGE = { code: 'P0001', message: expect.stringMatching(/must name a NEW history row/) };
const DISAGREES = { code: 'P0001', message: expect.stringMatching(/but history row .* set/) };
const NOT_FOUND = { code: 'P0001', message: expect.stringMatching(/history row .* not found/) };
const NOT_NEWEST = { code: 'P0001', message: expect.stringMatching(/is not the newest change/) };

/** Hold the control row for the rest of this test's transaction, then read the state — no parallel flip can land in between. */
async function lockedState(client: Client): Promise<boolean> {
  const { rows } = await client.query<{ enabled: boolean }>(`SELECT enabled FROM ${SWITCH} WHERE id = 1 FOR UPDATE`);
  return rows[0]!.enabled;
}

/** As the superuser: a history row (`audit_id` NOT NULL — any uuid stands in for the intent line here). */
async function insertChange(client: Client, enabled: boolean, reason: string): Promise<string> {
  const { rows } = await client.query<{ change_id: string }>(
    `INSERT INTO ${CHANGES} (enabled, changed_by_actor, changed_by_display, reason, audit_id) VALUES ($1, $2, 'Spec Admin', $3, $4) RETURNING change_id`,
    [enabled, randomUUID(), reason, randomUUID()],
  );
  return rows[0]!.change_id;
}

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

  it('ONE control row (id 1) here, and the column default is OFF', async () => {
    const { client } = getTx();
    // ⚠ A shared DB may have been switched by an earlier COMMITTED run — its `enabled` is NOT the seed's; the next leg proves that.
    const { rows } = await client.query<{ id: number }>(`SELECT id FROM ${SWITCH}`);
    expect(rows).toEqual([{ id: 1 }]);
    const def = await client.query<{ d: string }>(
      `SELECT column_default AS d FROM information_schema.columns WHERE table_name = $1 AND column_name = 'enabled'`,
      [SWITCH],
    );
    expect(def.rows[0]!.d).toBe('false');
  });

  it('⭐ code review P2-5 — CREATED OFF, by 0188 ITSELF: the migration\'s own statements, run into a FRESH schema, seed exactly ONE row, OFF, never changed', async () => {
    const { client } = getTx();
    // The file's switch half, statement by statement (drizzle's breakpoints), into a scratch schema — ⛔ the four `alert_sms_sends`
    // CHECK swaps (they name a public table) and the FK's explicit `"public".` (so it binds the scratch history table). An explicit
    // seed of `true`, or a missing seed, turns this RED whatever the shared database's row says.
    const statements = readFileSync(MIGRATION_0188, 'utf8')
      .split('--> statement-breakpoint')
      .map((st) => st.trim())
      .filter((st) => st !== '' && !st.includes('"alert_sms_sends"'))
      .map((st) => st.replaceAll('"public".', ''));
    expect(statements.some((st) => /INSERT INTO "degraded_bridge_sms_switch"/.test(st))).toBe(true);
    const scratch = `m0188_${randomUUID().replaceAll('-', '')}`;
    await client.query('SAVEPOINT fresh_0188');
    try {
      await client.query(`CREATE SCHEMA ${scratch}`);
      await client.query(`SET LOCAL search_path TO ${scratch}`);
      for (const st of statements) await client.query(st);
      const seeded = await client.query<{ id: number; enabled: boolean; last_change_id: string | null }>(
        `SELECT id, enabled, last_change_id FROM ${scratch}.${SWITCH}`,
      );
      expect(seeded.rows).toEqual([{ id: 1, enabled: false, last_change_id: null }]);
      expect((await client.query(`SELECT 1 FROM ${scratch}.${CHANGES}`)).rowCount).toBe(0);
    } finally {
      await client.query('ROLLBACK TO SAVEPOINT fresh_0188');
    }
  });

  // Code review 2026-10-28 (third pass): the guard now refuses a dangling id itself (fail closed), BEFORE the FK — the FK stays as
  // the backstop and is asserted by the catalog.
  it('⭐ code review P2-5 — `last_change_id` must name a REAL history row: a dangling id is refused (the superuser too); the FK stands', async () => {
    const { client } = getTx();
    const enabled = await lockedState(client);
    await expectPgError(client, () => client.query(`UPDATE ${SWITCH} SET last_change_id = $1 WHERE id = 1`, [randomUUID()]), NOT_FOUND);
    const fk = await client.query<{ confrelid: string }>(
      `SELECT confrelid::regclass::text AS confrelid FROM pg_constraint WHERE conname = 'degraded_bridge_sms_switch_last_change_id_fk' AND contype = 'f'`,
    );
    expect(fk.rows).toEqual([{ confrelid: CHANGES }]);
    // …and a real one that AGREES with the state is admitted (the missing row, not some other refusal, is what the dangling id hit).
    const id = await insertChange(client, enabled, 'fk leg');
    expect((await client.query(`UPDATE ${SWITCH} SET last_change_id = $1 WHERE id = 1`, [id])).rowCount).toBe(1);
  });

  // Code review 2026-10-28 (second pass) — before the trigger, `twt_service` could flip `enabled` with no history row, or point
  // `last_change_id` at a change that set the OTHER state, and the read would attribute the state to the wrong change.
  it('⭐ the control row moves ONLY with a NEW history row that set the SAME state (trigger; the superuser too)', async () => {
    const { client } = getTx();
    const enabled = await lockedState(client);
    // ⛔ a flip with no new change, ⛔ a touch of `updated_at` alone, ⛔ unsetting the pointer.
    await expectPgError(client, () => client.query(`UPDATE ${SWITCH} SET enabled = NOT enabled WHERE id = 1`), NEEDS_NEW_CHANGE);
    await expectPgError(client, () => client.query(`UPDATE ${SWITCH} SET updated_at = clock_timestamp() WHERE id = 1`), NEEDS_NEW_CHANGE);
    await expectPgError(client, () => client.query(`UPDATE ${SWITCH} SET last_change_id = NULL WHERE id = 1`), NEEDS_NEW_CHANGE);
    // ⛔ a mismatched pairing: a new change that set the OTHER state, with or without flipping the row.
    const other = await insertChange(client, !enabled, 'mismatch leg');
    await expectPgError(client, () => client.query(`UPDATE ${SWITCH} SET last_change_id = $1 WHERE id = 1`, [other]), DISAGREES);
    const same = await insertChange(client, enabled, 'mismatch leg');
    await expectPgError(client, () => client.query(`UPDATE ${SWITCH} SET enabled = $2, last_change_id = $1 WHERE id = 1`, [same, !enabled]), DISAGREES);
    // ⛔ `other` now agrees with the flip but is no longer the newest (`same` came after it — code review 2026-10-28 (third pass)).
    await expectPgError(client, () => client.query(`UPDATE ${SWITCH} SET enabled = $2, last_change_id = $1 WHERE id = 1`, [other, !enabled]), NOT_NEWEST);
    // ✓ the flip WITH its own agreeing, newest change lands; repeating the same pointer is then refused (⛔ a NEW row).
    const flip = await insertChange(client, !enabled, 'flip leg');
    expect((await client.query(`UPDATE ${SWITCH} SET enabled = $2, last_change_id = $1 WHERE id = 1`, [flip, !enabled])).rowCount).toBe(1);
    await expectPgError(client, () => client.query(`UPDATE ${SWITCH} SET last_change_id = $1 WHERE id = 1`, [flip]), NEEDS_NEW_CHANGE);
    const trg = await client.query<{ tgenabled: string }>(
      `SELECT tgenabled FROM pg_trigger WHERE tgname = 'degraded_bridge_sms_switch_guard_update' AND tgrelid = $1::regclass`,
      [SWITCH],
    );
    expect(trg.rows).toEqual([{ tgenabled: 'O' }]);
  });

  // Code review 2026-10-28 (third pass) — with history c1 (one state) then c2 (the other, current), re-pointing at c1 flipped the switch
  // with NO new history row and credited it to c1; and the guard skipped its check (`IF FOUND`) for a row it could not find.
  it('⭐ ⛔ re-pointing to an OLDER change that agrees, ⛔ an id not found, ⛔ a forged `changed_at`; the writer still flips ON → OFF → ON (the superuser too)', async () => {
    const { client } = getTx();
    const start = await lockedState(client);
    const c1 = await insertChange(client, !start, 'c1');
    expect((await client.query(`UPDATE ${SWITCH} SET enabled = $2, last_change_id = $1 WHERE id = 1`, [c1, !start])).rowCount).toBe(1);
    const c2 = await insertChange(client, start, 'c2');
    expect((await client.query(`UPDATE ${SWITCH} SET enabled = $2, last_change_id = $1 WHERE id = 1`, [c2, start])).rowCount).toBe(1);
    await expectPgError(client, () => client.query(`UPDATE ${SWITCH} SET enabled = $2, last_change_id = $1 WHERE id = 1`, [c1, !start]), NOT_NEWEST);
    await expectPgError(client, () => client.query(`UPDATE ${SWITCH} SET enabled = $2, last_change_id = $1 WHERE id = 1`, [randomUUID(), !start]), NOT_FOUND);
    // A written `changed_at` far in the future would make every later change "older" and pin the switch: the DB stamps its own clock.
    const forged = await client.query<{ changed_at: Date }>(
      `INSERT INTO ${CHANGES} (enabled, changed_by_actor, changed_by_display, reason, audit_id, changed_at)
       VALUES ($1, $2, 'Spec Admin', 'forged', $3, '2999-01-01T00:00:00Z') RETURNING changed_at`,
      [start, randomUUID(), randomUUID()],
    );
    expect(forged.rows[0]!.changed_at.getTime()).toBeLessThan(Date.parse('2100-01-01T00:00:00Z'));
    expect((await readDegradedBridgeSmsSwitch(client)).reason).toBe('c2');
    // ✓ the one writer: each of three flips appends its own (newest) change and lands.
    const actor = randomUUID();
    for (const enabled of [!start, start, !start]) {
      const r = await setDegradedBridgeSmsSwitchInTx(client, { enabled, actorId: actor, actorDisplay: 'Asha Verma', reason: `flip to ${String(enabled)}`, auditId: randomUUID() });
      expect(r).toMatchObject({ changed: true, state: { enabled, changedByActor: actor, reason: `flip to ${String(enabled)}` } });
    }
  });

  it('⭐ twt_app reads the switch WITH and WITHOUT a Pariwar scope, and ⛔ writes it', async () => {
    const { client } = getTx();
    await client.query('SAVEPOINT s');
    await enterAppRoleNoScope(client);
    expect((await readDegradedBridgeSmsSwitch(client)).enabled).toBeTypeOf('boolean');
    await expectPgError(client, () => client.query(`UPDATE ${SWITCH} SET enabled = true WHERE id = 1`), DENIED);
    await expectPgError(
      client,
      () =>
        client.query(`INSERT INTO ${CHANGES} (enabled, changed_by_actor, changed_by_display, reason, audit_id) VALUES (true, $1, 'N', 'r', $1)`, [
          randomUUID(),
        ]),
      DENIED,
    );
    await client.query('ROLLBACK TO SAVEPOINT s');
    await enterAppScope(client, PARIWAR_A);
    expect((await readDegradedBridgeSmsSwitch(client)).enabled).toBeTypeOf('boolean');
    await client.query('ROLLBACK TO SAVEPOINT s');
  });

  it('⭐ the singleton, the required reason and the name snapshot are CHECKed; the history is APPEND-ONLY and the control row un-removable (the superuser too)', async () => {
    const { client } = getTx();
    await expectPgError(client, () => client.query(`INSERT INTO ${SWITCH} (id, enabled) VALUES (2, false)`), {
      code: '23514',
      constraint: 'degraded_bridge_sms_switch_singleton_check',
    });
    for (const reason of ['', '   ', 'x'.repeat(501)]) {
      await expectPgError(
        client,
        () =>
          client.query(`INSERT INTO ${CHANGES} (enabled, changed_by_actor, changed_by_display, reason, audit_id) VALUES (true, $1, 'N', $2, $3)`, [
            randomUUID(),
            reason,
            randomUUID(),
          ]),
        { code: '23514', constraint: 'degraded_bridge_sms_switch_changes_reason_check' },
      );
    }
    // Code review P2-2 — WHO by name: ⛔ a NULL or blank snapshot (the handler refuses a nameless account first; this is the backstop).
    await expectPgError(
      client,
      () => client.query(`INSERT INTO ${CHANGES} (enabled, changed_by_actor, reason, audit_id) VALUES (true, $1, 'r', $1)`, [randomUUID()]),
      { code: '23502', column: 'changed_by_display' },
    );
    await expectPgError(
      client,
      () =>
        client.query(`INSERT INTO ${CHANGES} (enabled, changed_by_actor, changed_by_display, reason, audit_id) VALUES (true, $1, '  ', 'r', $1)`, [
          randomUUID(),
        ]),
      { code: '23514', constraint: 'degraded_bridge_sms_switch_changes_display_check' },
    );
    // Code review 2026-10-28 (second pass) — ⛔ a change with no audit intent line (the one writer always has one).
    await expectPgError(
      client,
      () => client.query(`INSERT INTO ${CHANGES} (enabled, changed_by_actor, changed_by_display, reason) VALUES (true, $1, 'N', 'r')`, [randomUUID()]),
      { code: '23502', column: 'audit_id' },
    );
    const { rows } = await client.query<{ change_id: string }>(
      `INSERT INTO ${CHANGES} (enabled, changed_by_actor, changed_by_display, reason, audit_id) VALUES (true, $1, 'Asha Verma', 'go-live', $1) RETURNING change_id`,
      [randomUUID()],
    );
    const id = rows[0]!.change_id;
    await expectPgError(client, () => client.query(`UPDATE ${CHANGES} SET reason = 'rewritten' WHERE change_id = $1`, [id]), APPEND_ONLY);
    await expectPgError(client, () => client.query(`UPDATE ${CHANGES} SET changed_by_display = 'renamed' WHERE change_id = $1`, [id]), APPEND_ONLY);
    await expectPgError(client, () => client.query(`DELETE FROM ${CHANGES} WHERE change_id = $1`, [id]), APPEND_ONLY);
    await expectPgError(client, () => client.query(`TRUNCATE ${CHANGES} CASCADE`), APPEND_ONLY);
    await expectPgError(client, () => client.query(`DELETE FROM ${SWITCH}`), UNREMOVABLE);
    await expectPgError(client, () => client.query(`TRUNCATE ${SWITCH}`), UNREMOVABLE);
  });

  // The writer is the SERVICE POOL: in production a BYPASSRLS `twt_service` login (SERVICE_DATABASE_URL), in dev / CI the superuser
  // login (apps/api/src/deps.ts) — the test's own connection. (`SET ROLE twt_service` would NOT model it: the NOLOGIN group role is
  // NOBYPASSRLS, so FORCE RLS hides the row from it — the service-login leg below proves both.) Its grants are asserted above.
  it('⭐ AC12 — as the service pool: ON → OFF → ON writes THREE history rows and the last state wins; a same-state change writes NOTHING', async () => {
    const { client } = getTx();
    const actor = randomUUID();
    const NAME = 'Asha Verma';
    const write = (enabled: boolean, reason: string) =>
      setDegradedBridgeSmsSwitchInTx(client, { enabled, actorId: actor, actorDisplay: NAME, reason, auditId: randomUUID() });
    // Start from a known state without a history row: force OFF if a committed run left it ON (under the lock — ⛔ a parallel flip).
    if (await lockedState(client)) await write(false, 'reset');
    expect((await readDegradedBridgeSmsSwitch(client)).enabled).toBe(false);

    const on = await write(true, 'templates approved');
    expect(on.changed).toBe(true);
    expect(on.state).toMatchObject({ enabled: true, changedByActor: actor, changedByDisplay: NAME, reason: 'templates approved' });
    const again = await write(true, 'twice');
    expect(again).toMatchObject({ changed: false, state: { enabled: true, reason: 'templates approved' } });
    expect((await write(false, 'cost')).changed).toBe(true);
    const last = await write(true, 'back on');
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

  it('code review P2-2 — the writer REFUSES a blank display name before it locks or writes anything', async () => {
    const { client } = getTx();
    const actor = randomUUID();
    const start = await lockedState(client);
    for (const actorDisplay of ['', '   ']) {
      await expect(
        setDegradedBridgeSmsSwitchInTx(client, { enabled: !start, actorId: actor, actorDisplay, reason: 'no name', auditId: randomUUID() }),
      ).rejects.toThrow(/display name/);
    }
    expect((await client.query(`SELECT 1 FROM ${CHANGES} WHERE changed_by_actor = $1`, [actor])).rowCount).toBe(0);
    expect((await readDegradedBridgeSmsSwitch(client)).enabled).toBe(start);
  });

  // Code review 2026-10-28 (second pass) — the grants exercised AS the production login's shape (0007 DD-3): a BYPASSRLS role that
  // inherits `twt_service`, created inside this test's transaction (rolled back with it — the test login is the dev superuser). The
  // grant listing above says WHAT is granted; this says it is ENOUGH for the writer, and no more than it.
  it('⭐ AC12 — the writer on the service LOGIN\'s privileges (BYPASSRLS, inherits twt_service): it changes the switch; the bare group cannot see the row', async () => {
    const { client } = getTx();
    const start = await lockedState(client);
    const login = `twt_service_login_spec_${randomUUID().replaceAll('-', '')}`;
    await client.query(`CREATE ROLE ${login} NOLOGIN BYPASSRLS IN ROLE twt_service`);
    await client.query('SAVEPOINT svc');
    await client.query(`SET LOCAL ROLE ${login}`);
    const actor = randomUUID();
    const auditId = randomUUID();
    const result = await setDegradedBridgeSmsSwitchInTx(client, { enabled: !start, actorId: actor, actorDisplay: 'Asha Verma', reason: 'service login', auditId });
    expect(result).toMatchObject({ changed: true, state: { enabled: !start, changedByActor: actor, changedByDisplay: 'Asha Verma', reason: 'service login' } });
    const row = await client.query<{ audit_id: string }>(`SELECT audit_id FROM ${CHANGES} WHERE changed_by_actor = $1`, [actor]);
    expect(row.rows).toEqual([{ audit_id: auditId }]);
    // …and no more: ⛔ DELETE of history (the grant refuses before the trigger), ⛔ an UPDATE of the singleton's id.
    await expectPgError(client, () => client.query(`DELETE FROM ${CHANGES} WHERE changed_by_actor = $1`, [actor]), DENIED);
    await expectPgError(client, () => client.query(`UPDATE ${SWITCH} SET id = 1 WHERE id = 1`), DENIED);
    await client.query('ROLLBACK TO SAVEPOINT svc');
    // The NOLOGIN NOBYPASSRLS group alone is NOT the writer: FORCE RLS (⛔ policy for it) hides the control row.
    await client.query(`SET LOCAL ROLE twt_service`);
    await expect(readDegradedBridgeSmsSwitch(client)).rejects.toThrow(/no control row/);
    await client.query('ROLLBACK TO SAVEPOINT svc');
  });
});
