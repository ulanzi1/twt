// feature_flag_versions RLS policy-regression integration tests — Story 10.8 (Task 1/11; AC1/AC9).
//
// This table is tenant-isolated like its ~18 siblings, EXCEPT that `pariwar_id` is NULLABLE and NULL
// means "the GLOBAL flag row" (Decision 3). That makes its policy set ASYMMETRIC, and the asymmetry
// IS the security property — so this spec covers the standard pos/neg/withCheck/fail-closed matrix
// AND the global-row carve-out legs that no sibling table has:
//   (a)  owning Pariwar reads its own override rows;
//   (b)  cross-Pariwar SELECT returns 0 rows (the leak invariant);
//   (c)  cross-Pariwar INSERT is blocked (withCheck → 42501);
//   (c2) cross-Pariwar UPDATE changes zero rows;
//   (d)  ⚠ GLOBAL-ROW READ LEG: BOTH tenants read the pariwar_id IS NULL rows (Decision 3's
//        deliberate `OR pariwar_id IS NULL` carve-out — without it the two-tier registry collapses);
//   (d2) ⚠ GLOBAL-ROW WRITE LEG: a tenant-scoped session can NOT author a global row, and can NOT
//        supersede one (the INSERT/UPDATE policies deliberately omit the null leg);
//   (e)  unset-scope session: reads ONLY globals, zero overrides, and every write blocked;
//   (f)  ENABLE + FORCE RLS are both on;
//   (g)  ⚠ NULLS NOT DISTINCT: a duplicate (NULL, flag_key, version) raises 23505. Under PG's
//        DEFAULT null-distinct semantics this would SILENTLY SUCCEED, and the conflict detection
//        the 409 path depends on would never fire for the global half of the table;
//   (h)  the append-only trigger: only superseded_by_version may be UPDATEd on an existing row.
// (No DELETE case — the table GRANTs SELECT/INSERT/UPDATE only; version history is never row-deleted.)
//
// Live DB only — skips when DATABASE_URL is unset. Per-test BEGIN/ROLLBACK isolation (setupLiveDb).
// Seeds run as the Docker superuser (RLS bypassed) BEFORE entering app scope; enforcement assertions
// `SET LOCAL ROLE twt_app` to shed superuser (see _helpers.ts).

import { and, eq, isNull } from 'drizzle-orm';
import type pg from 'pg';
import { describe, expect, it } from 'vitest';

import type { PariwarId } from '../../../src/ids/index.js';
import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppRoleNoScope, enterAppScope } from '../_helpers.js';

const DEAD_BY = new Date('2027-01-01T00:00:00.000Z');

/**
 * Run `attempt` inside a SAVEPOINT and return the error it raised (or `undefined` if it succeeded).
 *
 * Needed because several cases below assert TWO blocked writes in a row: a rejected statement aborts
 * the enclosing transaction, so a second statement would come back `25P02` (transaction aborted)
 * rather than the RLS `42501` we mean to assert — a false green dressed as a real one. Rolling back
 * to the savepoint restores a usable transaction. (Raw SAVEPOINT rather than `db.transaction()`,
 * which would commit the caller's tx early and break setupLiveDb's per-test rollback isolation.)
 */
async function errorFrom(
  client: pg.PoolClient,
  attempt: () => Promise<unknown>,
): Promise<{ code?: string; message?: string } | undefined> {
  await client.query('SAVEPOINT rls_probe');
  try {
    await attempt();
    await client.query('RELEASE SAVEPOINT rls_probe');
    return undefined;
  } catch (err: unknown) {
    await client.query('ROLLBACK TO SAVEPOINT rls_probe');
    const e = err as { code?: string; message?: string; cause?: { code?: string; message?: string } };
    return e.cause ?? e;
  }
}

/** A flag version row. `pariwarId: null` produces a GLOBAL row (the catalog default). */
function flagValues(
  pariwarId: PariwarId | null,
  flagKey = 'kyc_manual_fallback',
  version = 2,
): typeof schema.featureFlagVersions.$inferInsert {
  return {
    flagKey,
    pariwarId,
    version,
    cohortDefinition: { clauses: [] },
    state: 'off',
    fallbackDefault: true,
    owner: 'platform-desk',
    deadBy: DEAD_BY,
    effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
    rationale: 'rls regression seed',
  };
}

describe.skipIf(!hasDatabase)('feature_flag_versions RLS policy regression (scoped table + global-row carve-out)', () => {
  setupLiveDb();

  it('(a) positive: owning Pariwar A reads its OWN override rows', async () => {
    const { tx, client } = getTx();
    await tx.insert(schema.featureFlagVersions).values(flagValues(PARIWAR_A, 'flag_a'));
    await tx.insert(schema.featureFlagVersions).values(flagValues(PARIWAR_B, 'flag_b'));
    await enterAppScope(client, PARIWAR_A);

    const rows = await tx
      .select()
      .from(schema.featureFlagVersions)
      .where(eq(schema.featureFlagVersions.pariwarId, PARIWAR_A));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.flagKey).toBe('flag_a');
  });

  it('(b) LEAK INVARIANT: Pariwar A scope sees ZERO of Pariwar B’s override rows', async () => {
    const { tx, client } = getTx();
    await tx.insert(schema.featureFlagVersions).values(flagValues(PARIWAR_A));
    await tx.insert(schema.featureFlagVersions).values(flagValues(PARIWAR_B));
    await enterAppScope(client, PARIWAR_A);

    // A leak would expose one tenant's rollout posture (and its cohort definition) to another.
    const bRows = await tx
      .select()
      .from(schema.featureFlagVersions)
      .where(eq(schema.featureFlagVersions.pariwarId, PARIWAR_B));
    expect(bRows).toHaveLength(0);
  });

  it('(c) write-isolation: an A session INSERT for Pariwar B is blocked (withCheck → 42501)', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const err = await tx
      .insert(schema.featureFlagVersions)
      .values(flagValues(PARIWAR_B))
      .catch((e: unknown) => e);
    const cause = (err as { cause?: { code?: string; message?: string } }).cause;
    expect(cause?.code).toBe('42501');
    expect(cause?.message ?? '').toMatch(/row-level security/i);
  });

  it('(c2) write-isolation: an A session UPDATE of a B row changes zero rows', async () => {
    const { tx, client } = getTx();
    await tx.insert(schema.featureFlagVersions).values(flagValues(PARIWAR_B));
    await enterAppScope(client, PARIWAR_A);

    const updated = await tx
      .update(schema.featureFlagVersions)
      .set({ supersededByVersion: 3 })
      .where(eq(schema.featureFlagVersions.pariwarId, PARIWAR_B))
      .returning();
    expect(updated).toHaveLength(0); // B's row is not visible-for-update under A's scope
  });

  it('(d) GLOBAL-ROW READ CARVE-OUT: BOTH tenants read the pariwar_id IS NULL rows', async () => {
    const { tx, client } = getTx();
    await tx.insert(schema.featureFlagVersions).values(flagValues(null, 'global_flag'));
    await tx.insert(schema.featureFlagVersions).values(flagValues(PARIWAR_B, 'global_flag'));

    // Tenant A: sees the global row (via `OR pariwar_id IS NULL`) but NOT B's override.
    await enterAppScope(client, PARIWAR_A);
    const aVisible = await tx
      .select()
      .from(schema.featureFlagVersions)
      .where(eq(schema.featureFlagVersions.flagKey, 'global_flag'));
    expect(aVisible).toHaveLength(1);
    expect(aVisible[0]?.pariwarId).toBeNull();

    // Tenant B: sees the SAME global row PLUS its own override — the two-tier registry's read shape.
    await enterAppScope(client, PARIWAR_B);
    const bVisible = await tx
      .select()
      .from(schema.featureFlagVersions)
      .where(eq(schema.featureFlagVersions.flagKey, 'global_flag'));
    expect(bVisible).toHaveLength(2);
    expect(bVisible.filter((r) => r.pariwarId === null)).toHaveLength(1);
    expect(bVisible.filter((r) => r.pariwarId === PARIWAR_B)).toHaveLength(1);
  });

  it('(d2) GLOBAL-ROW WRITE LEG: a tenant session can neither AUTHOR nor SUPERSEDE a global row', async () => {
    const { tx, client } = getTx();
    await tx.insert(schema.featureFlagVersions).values(flagValues(null, 'global_flag'));
    await enterAppScope(client, PARIWAR_A);

    // INSERT of a global row: the withCheck has NO null leg → blocked. Global rows are a
    // service-pool/seed path, never a tenant-scoped write.
    const err = await errorFrom(client, () =>
      tx.insert(schema.featureFlagVersions).values(flagValues(null, 'sneaky_global')),
    );
    expect(err?.code).toBe('42501');

    // UPDATE of a global row: readable (leg d) but NOT updatable — `using` has no null leg either.
    // Readable-but-not-writable is exactly the intended asymmetry.
    const updated = await tx
      .update(schema.featureFlagVersions)
      .set({ supersededByVersion: 3 })
      .where(isNull(schema.featureFlagVersions.pariwarId))
      .returning();
    expect(updated).toHaveLength(0);
  });

  it('(e) unset-scope session: reads ONLY globals, zero overrides, and every write is blocked', async () => {
    const { tx, client } = getTx();
    await tx.insert(schema.featureFlagVersions).values(flagValues(null, 'unset_probe'));
    await tx.insert(schema.featureFlagVersions).values(flagValues(PARIWAR_A, 'unset_probe'));
    await tx.insert(schema.featureFlagVersions).values(flagValues(PARIWAR_B, 'unset_probe'));
    // Shed superuser, do NOT set scope: nullif('','') → NULL → `pariwar_id = NULL` never matches,
    // so ONLY the `OR pariwar_id IS NULL` leg survives (closed-failure holds for every override).
    await enterAppRoleNoScope(client);

    const rows = await tx
      .select()
      .from(schema.featureFlagVersions)
      .where(eq(schema.featureFlagVersions.flagKey, 'unset_probe'));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.pariwarId).toBeNull();

    // Every write is blocked with no scope — including a global-row write.
    const overrideErr = await errorFrom(client, () =>
      tx.insert(schema.featureFlagVersions).values(flagValues(PARIWAR_A, 'unset_write')),
    );
    expect(overrideErr?.code).toBe('42501');

    const globalErr = await errorFrom(client, () =>
      tx.insert(schema.featureFlagVersions).values(flagValues(null, 'unset_write')),
    );
    expect(globalErr?.code).toBe('42501');
  });

  it('(f) FORCE RLS: feature_flag_versions has rowsecurity AND forcerowsecurity enabled', async () => {
    const { client } = getTx();
    const { rows } = await client.query<{
      relrowsecurity: boolean;
      relforcerowsecurity: boolean;
    }>(`SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname = 'feature_flag_versions'`);
    expect(rows[0]?.relrowsecurity).toBe(true);
    expect(rows[0]?.relforcerowsecurity).toBe(true);
  });

  it('(g) NULLS NOT DISTINCT: a duplicate GLOBAL (NULL, flag_key, version) raises 23505', async () => {
    const { tx } = getTx();
    await tx.insert(schema.featureFlagVersions).values(flagValues(null, 'dup_global', 2));

    // ⚠ The load-bearing assertion for the nullable-tenant-column carve-out. Under PG's DEFAULT
    // null-distinct semantics this second INSERT would SUCCEED silently — two "version 2" rows for
    // the same global flag, and `createFlagVersion`'s 23505 → FlagVersionConflictError → 409 path
    // would never fire for globals. If this test ever starts failing, check the constraint really
    // still carries NULLS NOT DISTINCT before touching anything else.
    const err = await tx
      .insert(schema.featureFlagVersions)
      .values(flagValues(null, 'dup_global', 2))
      .catch((e: unknown) => e);
    const code =
      (err as { code?: string }).code ?? (err as { cause?: { code?: string } }).cause?.code;
    expect(code).toBe('23505');
  });

  it('(h) append-only trigger: only superseded_by_version may be UPDATEd on an existing row', async () => {
    const { tx } = getTx();
    await tx.insert(schema.featureFlagVersions).values(flagValues(PARIWAR_A, 'immutable_probe'));

    // The forward-pointer is the ONE legitimately-mutable column — this must succeed.
    const pointed = await tx
      .update(schema.featureFlagVersions)
      .set({ supersededByVersion: 3 })
      .where(
        and(
          eq(schema.featureFlagVersions.pariwarId, PARIWAR_A),
          eq(schema.featureFlagVersions.flagKey, 'immutable_probe'),
        ),
      )
      .returning();
    expect(pointed).toHaveLength(1);

    // Rewriting history is rejected at the DB — "historical flag states are queryable for past
    // evaluations" is only true if history cannot be rewritten (architecture.md:214-216).
    const err = await tx
      .update(schema.featureFlagVersions)
      .set({ state: 'full' })
      .where(
        and(
          eq(schema.featureFlagVersions.pariwarId, PARIWAR_A),
          eq(schema.featureFlagVersions.flagKey, 'immutable_probe'),
        ),
      )
      .catch((e: unknown) => e);
    const cause = (err as { cause?: { code?: string; message?: string } }).cause;
    expect(cause?.code).toBe('P0001');
    expect(cause?.message ?? '').toMatch(/immutable-column write rejected/i);
  });
});
