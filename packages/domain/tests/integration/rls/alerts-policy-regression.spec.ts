// alerts RLS policy-regression — Story 8.1 (Task 1; architecture line 745 — every RLS
// policy ships with a test). Mirrors pools-policy-regression: positive (allowed query
// returns expected rows) + negative (forbidden query empty / raises) assertions for the
// tenant-isolation policies, the connection-level fail-closed probe, and the FORCE-RLS
// catalog regression guard. Live DB only.

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppRoleNoScope, enterAppScope, seedAlert } from '../_helpers.js';

describe.skipIf(!hasDatabase)('alerts RLS policy regression', () => {
  setupLiveDb();

  it('positive: SELECT under scope A returns only A alert rows', async () => {
    const { tx, client } = getTx();
    await seedAlert(tx, PARIWAR_A);
    await seedAlert(tx, PARIWAR_B);
    await enterAppScope(client, PARIWAR_A);

    const rows = await tx.select().from(schema.alerts);
    expect(rows).not.toHaveLength(0); // guard: empty would pass every() vacuously
    expect(rows.every((r) => r.pariwarId === PARIWAR_A)).toBe(true);
    expect(rows.some((r) => r.pariwarId === PARIWAR_B)).toBe(false);
  });

  it('negative: scope B does NOT see A alert rows (symmetric: B sees its own)', async () => {
    const { tx, client } = getTx();
    await seedAlert(tx, PARIWAR_A);
    await seedAlert(tx, PARIWAR_B);
    await enterAppScope(client, PARIWAR_B);

    const rows = await tx.select().from(schema.alerts);
    expect(rows).not.toHaveLength(0);
    expect(rows.every((r) => r.pariwarId === PARIWAR_B)).toBe(true);
    expect(rows.some((r) => r.pariwarId === PARIWAR_A)).toBe(false);
  });

  it('negative: INSERT with a mismatched pariwarId is rejected by withCheck (42501)', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    // Isolate the RLS withCheck policy, which is orthogonal to the AC5 alerts.current_state
    // write-rejection trigger (that trigger also fires BEFORE INSERT, and Postgres runs BEFORE
    // ROW triggers ahead of WITH CHECK — an unguarded insert would hit P0001 first and never
    // reach the RLS check). Set the projector's session guard so the trigger steps aside.
    await client.query("SET LOCAL app.alert_state_writer = 'on'");
    const err = await tx
      .insert(schema.alerts)
      .values({
        alertId: randomUUID() as never,
        cycleId: randomUUID() as never,
        pariwarId: PARIWAR_B, // ← MISMATCH under scope A
        poolCount: 1,
        currentState: 'live',
        stateEventVersion: 3,
        createdByActor: 'trustee-actor-1',
      })
      .catch((e: unknown) => e);
    const cause = (err as { cause?: { code?: string; message?: string } }).cause;
    expect(cause?.code).toBe('42501');
    expect(cause?.message ?? '').toMatch(/row-level security/i);
  });

  it('connection-level fail-closed: app role without scope returns empty', async () => {
    const { tx, client } = getTx();
    await seedAlert(tx, PARIWAR_A);
    await enterAppRoleNoScope(client);

    const rows = await tx.select().from(schema.alerts);
    expect(rows).toHaveLength(0);
  });

  it('FORCE RLS: alerts has rowsecurity AND forcerowsecurity', async () => {
    const { client } = getTx();
    const { rows } = await client.query<{
      relname: string;
      relrowsecurity: boolean;
      relforcerowsecurity: boolean;
    }>(
      `SELECT relname, relrowsecurity, relforcerowsecurity FROM pg_class
         WHERE relname = 'alerts'`,
    );
    expect(rows).toHaveLength(1);
    expect(rows.every((r) => r.relrowsecurity && r.relforcerowsecurity)).toBe(true);
  });
});
