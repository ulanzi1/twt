// report_exports RLS policy-regression integration tests — Story 10.7 (Task 1/8, AC5/AC6; review finding).
//
// report_exports is a SCOPED table — tenant-isolated on BOTH read and write, mirroring 0033_data-exports.
// Every sibling tenant-isolated table ships a dedicated policy-regression spec (the leak invariant every
// admin surface rests on); the code review flagged that 10.7 shipped the correct policy
// (`policies/report-exports-rls.ts`, migration 0086 ENABLE+FORCE+closed-failure) but no regression on the
// table's OWN policy. These are the positive/negative pairs the policies/README "Test discipline" requires:
//   (a) owning Pariwar reads its own export rows;
//   (b) cross-Pariwar SELECT returns 0 rows (the leak invariant);
//   (c) cross-Pariwar INSERT is blocked (withCheck → 42501);
//   (c2) cross-Pariwar UPDATE changes zero rows (the lifecycle transitions cannot reach another tenant);
//   (e) unset-scope session: SELECT returns 0 rows AND write is blocked (fail-closed);
//   (f) ENABLE + FORCE RLS are both on.
// (No DELETE case — report_exports GRANTs SELECT/INSERT/UPDATE only; the vacuum zeroes, never deletes.)
//
// Live DB only — skips when DATABASE_URL is unset. Per-test BEGIN/ROLLBACK isolation (setupLiveDb). Seeds
// run as the Docker superuser (RLS bypassed) BEFORE entering app scope; enforcement assertions
// `SET LOCAL ROLE twt_app` to shed superuser (see _helpers.ts).

import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import type { PariwarId } from '../../../src/ids/index.js';
import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppRoleNoScope, enterAppScope } from '../_helpers.js';

const ACTOR = '99999999-9999-9999-9999-999999999999';

/** Insert a report_exports row for `pariwarId` (superuser context — RLS bypassed — unless run in scope). */
function reportExportValues(pariwarId: PariwarId, paramsHash = 'hash-rls'): typeof schema.reportExports.$inferInsert {
  return {
    pariwarId,
    requestedByActorId: ACTOR,
    reportType: 'member_roster',
    format: 'csv',
    paramsHash,
    status: 'pending',
    requestedAt: new Date(),
  };
}

describe.skipIf(!hasDatabase)('report_exports RLS policy regression (scoped table)', () => {
  setupLiveDb();

  it('(a) positive: owning Pariwar A reads its OWN export rows', async () => {
    const { tx, client } = getTx();
    await tx.insert(schema.reportExports).values(reportExportValues(PARIWAR_A, 'hash-a'));
    await tx.insert(schema.reportExports).values(reportExportValues(PARIWAR_B, 'hash-b'));
    await enterAppScope(client, PARIWAR_A);

    const rows = await tx.select().from(schema.reportExports);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.pariwarId).toBe(PARIWAR_A);
  });

  it('(b) LEAK INVARIANT: Pariwar A scope sees ZERO of Pariwar B’s export rows', async () => {
    const { tx, client } = getTx();
    await tx.insert(schema.reportExports).values(reportExportValues(PARIWAR_A));
    await tx.insert(schema.reportExports).values(reportExportValues(PARIWAR_B));
    await enterAppScope(client, PARIWAR_A);

    // Explicit WHERE pariwar_id = B must still return 0 rows (RLS-filtered) — a leak would expose one
    // tenant's report activity (and, in the deferred Tier-1 path, its artifact) to another.
    const bRows = await tx
      .select()
      .from(schema.reportExports)
      .where(eq(schema.reportExports.pariwarId, PARIWAR_B));
    expect(bRows).toHaveLength(0);
  });

  it('(c) write-isolation: an A session INSERT for Pariwar B is blocked (withCheck → 42501)', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const err = await tx
      .insert(schema.reportExports)
      .values(reportExportValues(PARIWAR_B))
      .catch((e: unknown) => e);
    const cause = (err as { cause?: { code?: string; message?: string } }).cause;
    expect(cause?.code).toBe('42501');
    expect(cause?.message ?? '').toMatch(/row-level security/i);
  });

  it('(c2) write-isolation: an A session UPDATE of a B row changes zero rows', async () => {
    const { tx, client } = getTx();
    await tx.insert(schema.reportExports).values(reportExportValues(PARIWAR_B));
    await enterAppScope(client, PARIWAR_A);

    const updated = await tx
      .update(schema.reportExports)
      .set({ status: 'failed', failedReason: 'assemble_error' })
      .where(eq(schema.reportExports.pariwarId, PARIWAR_B))
      .returning();
    expect(updated).toHaveLength(0); // B's row is not visible-for-update under A's scope
  });

  it('(e) unset-scope session: SELECT returns 0 rows AND write is blocked (fail-closed)', async () => {
    const { tx, client } = getTx();
    await tx.insert(schema.reportExports).values(reportExportValues(PARIWAR_A));
    await tx.insert(schema.reportExports).values(reportExportValues(PARIWAR_B));
    // Shed superuser, do NOT set scope: nullif('' ,'') → NULL → no match → 0 rows (closed-failure).
    await enterAppRoleNoScope(client);

    const rows = await tx.select().from(schema.reportExports);
    expect(rows).toHaveLength(0);

    const err = await tx
      .insert(schema.reportExports)
      .values(reportExportValues(PARIWAR_A))
      .catch((e: unknown) => e);
    const cause = (err as { cause?: { code?: string } }).cause;
    expect(cause?.code).toBe('42501');
  });

  it('(f) FORCE RLS: report_exports has rowsecurity AND forcerowsecurity enabled', async () => {
    const { client } = getTx();
    const { rows } = await client.query<{
      relrowsecurity: boolean;
      relforcerowsecurity: boolean;
    }>(`SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname = 'report_exports'`);
    expect(rows[0]?.relrowsecurity).toBe(true);
    expect(rows[0]?.relforcerowsecurity).toBe(true);
  });
});
