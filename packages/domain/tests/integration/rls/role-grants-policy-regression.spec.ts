// role_grants RLS policy-regression integration tests — Story 1.8 (Task 7.2, AC-2).
//
// role_grants is a SCOPED table — tenant-isolated on BOTH read and write (the
// inverse of the pariwar_passport carve-out). These assertions are the
// positive/negative pairs the policies/README "Test discipline" requires:
//   (a) owning Pariwar reads its own grants;
//   (b) cross-Pariwar SELECT returns 0 rows (the leak invariant — contrast
//       passport, whose cross-read is the carve-out);
//   (c) cross-Pariwar / unset-scope writes are blocked (withCheck → 42501);
//   (d) DELETE of an own grant succeeds (grants are mutable/revocable — DELETE is
//       granted, unlike the passport singleton);
//   (e) ENABLE + FORCE RLS are both on.
//
// Live DB only — skips when DATABASE_URL is unset. Per-test BEGIN/ROLLBACK
// isolation (setupLiveDb). Seeds run as the Docker superuser (RLS bypassed) BEFORE
// entering app scope; enforcement assertions `SET LOCAL ROLE twt_app` to shed
// superuser (see _helpers.ts).

import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import * as schema from '../../../src/schema/index.js';
import {
  getTx,
  hasDatabase,
  setupLiveDb,
} from '../../../src/test-utils/integration-setup.js';
import {
  PARIWAR_A,
  PARIWAR_B,
  enterAppRoleNoScope,
  enterAppScope,
  seedRoleGrant,
} from '../_helpers.js';

describe.skipIf(!hasDatabase)('role_grants RLS policy regression (scoped table)', () => {
  setupLiveDb();

  it('(a) positive: owning Pariwar A reads its OWN grants', async () => {
    const { tx, client } = getTx();
    await seedRoleGrant(tx, PARIWAR_A, { role: 'district_admin' });
    await seedRoleGrant(tx, PARIWAR_B, { role: 'state_trustee' });
    await enterAppScope(client, PARIWAR_A);

    const rows = await tx.select().from(schema.roleGrants);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.pariwarId).toBe(PARIWAR_A);
    expect(rows[0]?.role).toBe('district_admin');
  });

  it('(b) LEAK INVARIANT: Pariwar A scope sees ZERO of Pariwar B’s grants', async () => {
    const { tx, client } = getTx();
    await seedRoleGrant(tx, PARIWAR_A);
    await seedRoleGrant(tx, PARIWAR_B);
    await enterAppScope(client, PARIWAR_A);

    // Explicit WHERE pariwar_id = B must still return 0 rows (RLS-filtered) — the
    // inverse of the passport carve-out. A grant read leak would expose who holds
    // what role in another Pariwar.
    const bRows = await tx
      .select()
      .from(schema.roleGrants)
      .where(eq(schema.roleGrants.pariwarId, PARIWAR_B));
    expect(bRows).toHaveLength(0);
  });

  it('(c) write-isolation: A session INSERT for Pariwar B is blocked (withCheck → 42501)', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const err = await seedRoleGrant(tx, PARIWAR_B).catch((e: unknown) => e);
    const cause = (err as { cause?: { code?: string; message?: string } }).cause;
    expect(cause?.code).toBe('42501');
    expect(cause?.message ?? '').toMatch(/row-level security/i);
  });

  it('(c2) write-isolation: A session UPDATE of B grant changes zero rows', async () => {
    const { tx, client } = getTx();
    await seedRoleGrant(tx, PARIWAR_B, { role: 'state_trustee' });
    await enterAppScope(client, PARIWAR_A);

    const updated = await tx
      .update(schema.roleGrants)
      .set({ role: 'super_admin' })
      .where(eq(schema.roleGrants.pariwarId, PARIWAR_B))
      .returning();
    expect(updated).toHaveLength(0);
  });

  it('(d) DELETE: A session revokes its OWN grant (grants are mutable — DELETE granted)', async () => {
    const { tx, client } = getTx();
    await seedRoleGrant(tx, PARIWAR_A, { role: 'verifier' });
    await enterAppScope(client, PARIWAR_A);

    const deleted = await tx
      .delete(schema.roleGrants)
      .where(eq(schema.roleGrants.pariwarId, PARIWAR_A))
      .returning();
    expect(deleted).toHaveLength(1);
    const remaining = await tx.select().from(schema.roleGrants);
    expect(remaining).toHaveLength(0);
  });

  it('(d2) DELETE cannot reach a cross-Pariwar grant (B grant survives A’s delete)', async () => {
    const { tx, client } = getTx();
    await seedRoleGrant(tx, PARIWAR_B, { role: 'auditor' });
    await enterAppScope(client, PARIWAR_A);

    const deleted = await tx
      .delete(schema.roleGrants)
      .where(eq(schema.roleGrants.pariwarId, PARIWAR_B))
      .returning();
    expect(deleted).toHaveLength(0); // not visible-for-delete under A's scope
  });

  it('(e) unset-scope session: SELECT returns 0 rows AND write is blocked (fail-closed)', async () => {
    const { tx, client } = getTx();
    await seedRoleGrant(tx, PARIWAR_A);
    await seedRoleGrant(tx, PARIWAR_B);
    // Shed superuser, do NOT set scope. Unlike the passport carve-out, a scoped
    // table returns 0 rows with no scope (nullif → NULL → no match).
    await enterAppRoleNoScope(client);

    const rows = await tx.select().from(schema.roleGrants);
    expect(rows).toHaveLength(0);

    const err = await seedRoleGrant(tx, PARIWAR_A).catch((e: unknown) => e);
    const cause = (err as { cause?: { code?: string } }).cause;
    expect(cause?.code).toBe('42501');
  });

  it('FORCE RLS: role_grants has rowsecurity AND forcerowsecurity enabled', async () => {
    const { client } = getTx();
    const { rows } = await client.query<{
      relrowsecurity: boolean;
      relforcerowsecurity: boolean;
    }>(`SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname = 'role_grants'`);
    expect(rows[0]?.relrowsecurity).toBe(true);
    expect(rows[0]?.relforcerowsecurity).toBe(true);
  });
});
