// events_log RLS policy-regression integration tests — Story 1.6 (AC-6).
//
// Architecture §1.2 line 743-745: every RLS policy ships with positive (allowed
// query returns expected rows) AND negative (forbidden query returns empty /
// raises) assertions. Live DB only — `describe.skipIf(!hasDatabase)` skips when
// DATABASE_URL is unset so local `pnpm test` passes without Docker.
//
// Per-test isolation: setupLiveDb provides a per-test BEGIN/ROLLBACK transaction
// (ctx.tx + ctx.client). All RLS-enforcement assertions drive ctx.client with
// `SET LOCAL ROLE twt_app` (shed Docker superuser) + setPariwarScope — see
// _helpers.ts. The withPariwarScope functional test uses its own committing pool.

import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { assertPariwarScopeSet, withPariwarScope } from '../../../src/db.js';
import { PariwarScopeMissingError } from '../../../src/errors.js';
import * as schema from '../../../src/schema/index.js';
import {
  DATABASE_URL,
  getTx,
  hasDatabase,
  setupLiveDb,
} from '../../../src/test-utils/integration-setup.js';
import {
  PARIWAR_A,
  PARIWAR_B,
  enterAppRoleNoScope,
  enterAppScope,
  seedEvent,
} from '../_helpers.js';

describe.skipIf(!hasDatabase)('events_log RLS policy regression', () => {
  setupLiveDb();

  it('positive: SELECT under app scope A returns only A rows', async () => {
    const { tx, client } = getTx();
    await seedEvent(tx, PARIWAR_A);
    await seedEvent(tx, PARIWAR_B);
    await enterAppScope(client, PARIWAR_A);

    const rows = await tx.select().from(schema.eventsLog);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.pariwarId).toBe(PARIWAR_A);
  });

  it('negative: SELECT under app scope B does NOT see A rows', async () => {
    const { tx, client } = getTx();
    await seedEvent(tx, PARIWAR_A);
    await seedEvent(tx, PARIWAR_B);
    await enterAppScope(client, PARIWAR_B);

    const rows = await tx.select().from(schema.eventsLog);
    expect(rows.every((r) => r.pariwarId === PARIWAR_B)).toBe(true);
    expect(rows.some((r) => r.pariwarId === PARIWAR_A)).toBe(false);
  });

  it('negative: INSERT with mismatched pariwarId is rejected by withCheck', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    // Under A's scope, attempt to INSERT a row owned by B → withCheck violation.
    // drizzle wraps the pg error as `Failed query: …`; the RLS message + the
    // SQLSTATE 42501 (insufficient_privilege) live on `.cause` (same convention
    // the @twt/events tests match on).
    const err = await seedEvent(tx, PARIWAR_B, { eventVersion: 1 }).catch(
      (e: unknown) => e,
    );
    const cause = (err as { cause?: { code?: string; message?: string } }).cause;
    expect(cause?.code).toBe('42501');
    expect(cause?.message ?? '').toMatch(/row-level security/i);
  });

  it('connection-level fail-closed: app role without setPariwarScope returns empty', async () => {
    const { tx, client } = getTx();
    await seedEvent(tx, PARIWAR_A);
    await seedEvent(tx, PARIWAR_B);
    // Shed superuser but DON'T set the scope: nullif(current_setting,'') → NULL
    // → `pariwar_id = NULL` → no match → 0 rows (the QUIET fail-closed).
    await enterAppRoleNoScope(client);

    const rows = await tx.select().from(schema.eventsLog);
    expect(rows).toHaveLength(0);
  });

  it('connection-level fail-closed: assertPariwarScopeSet throws when unset', async () => {
    const { client } = getTx();
    await expect(assertPariwarScopeSet(client)).rejects.toBeInstanceOf(
      PariwarScopeMissingError,
    );
  });

  it('FORCE RLS: events_log has rowsecurity AND forcerowsecurity enabled', async () => {
    // FORCE constrains even the (non-superuser) table owner. The Docker test
    // role is a superuser and structurally bypasses RLS regardless of FORCE, so
    // we assert the catalog posture directly — the regression guard that would
    // catch a future migration silently dropping FORCE.
    const { client } = getTx();
    const { rows } = await client.query<{
      relrowsecurity: boolean;
      relforcerowsecurity: boolean;
    }>(
      `SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname = 'events_log'`,
    );
    expect(rows[0]?.relrowsecurity).toBe(true);
    expect(rows[0]?.relforcerowsecurity).toBe(true);
  });
});

describe.skipIf(!hasDatabase)('setPariwarScope / withPariwarScope helper contract', () => {
  let pool: pg.Pool;

  beforeAll(() => {
    pool = new pg.Pool({ connectionString: DATABASE_URL, max: 2, ssl: false });
    pool.on('error', (err) => console.error('[policy-regression pool]', err.message));
  });
  afterAll(() => pool.end());

  it('withPariwarScope sets app.pariwar_id, readable by assertPariwarScopeSet', async () => {
    const readBack = await withPariwarScope(pool, PARIWAR_A, (_db, client) =>
      assertPariwarScopeSet(client),
    );
    expect(readBack).toBe(PARIWAR_A);
  });

  it('setPariwarScope rejects a non-UUID value (InvalidPariwarScopeError)', async () => {
    await expect(
      withPariwarScope(pool, 'not-a-uuid', async () => undefined),
    ).rejects.toThrow(/Invalid pariwar_id scope value/);
  });
});
