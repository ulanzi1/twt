// clause_versions + niyamavali_amendments RLS policy-regression — Story 2.3 (Task 9).
//
// Mirrors events-log / role-grants policy-regression specs: positive (allowed
// query returns expected rows) + negative (forbidden query empty / raises)
// assertions for the tenant-isolation policies, plus the per-Pariwar clause_id
// uniqueness guard and the FORCE-RLS catalog regression guard. Live DB only.

import { describe, expect, it } from 'vitest';

import * as schema from '../../../src/schema/index.js';
import { hasDatabase, getTx, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import {
  PARIWAR_A,
  PARIWAR_B,
  enterAppRoleNoScope,
  enterAppScope,
  seedClauseVersion,
} from '../_helpers.js';

describe.skipIf(!hasDatabase)('clause_versions RLS policy regression', () => {
  setupLiveDb();

  it('positive: SELECT under scope A returns only A clauses', async () => {
    const { tx, client } = getTx();
    await seedClauseVersion(tx, PARIWAR_A, { clauseId: 'niy.a.one' });
    await seedClauseVersion(tx, PARIWAR_B, { clauseId: 'niy.b.one' });
    await enterAppScope(client, PARIWAR_A);

    const rows = await tx.select().from(schema.clauseVersions);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.pariwarId).toBe(PARIWAR_A);
  });

  it('negative: scope B does NOT see A clauses', async () => {
    const { tx, client } = getTx();
    await seedClauseVersion(tx, PARIWAR_A, { clauseId: 'niy.a.one' });
    await seedClauseVersion(tx, PARIWAR_B, { clauseId: 'niy.b.one' });
    await enterAppScope(client, PARIWAR_B);

    const rows = await tx.select().from(schema.clauseVersions);
    expect(rows.every((r) => r.pariwarId === PARIWAR_B)).toBe(true);
    expect(rows.some((r) => r.pariwarId === PARIWAR_A)).toBe(false);
  });

  it('negative: INSERT with a mismatched pariwarId is rejected by withCheck', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    // Under A's scope, attempt to INSERT a row owned by B → withCheck violation (42501).
    const err = await seedClauseVersion(tx, PARIWAR_B, { clauseId: 'niy.b.x' }).catch(
      (e: unknown) => e,
    );
    const cause = (err as { cause?: { code?: string; message?: string } }).cause;
    expect(cause?.code).toBe('42501');
    expect(cause?.message ?? '').toMatch(/row-level security/i);
  });

  it('connection-level fail-closed: app role without scope returns empty', async () => {
    const { tx, client } = getTx();
    await seedClauseVersion(tx, PARIWAR_A, { clauseId: 'niy.a.one' });
    await seedClauseVersion(tx, PARIWAR_B, { clauseId: 'niy.b.one' });
    await enterAppRoleNoScope(client);

    const rows = await tx.select().from(schema.clauseVersions);
    expect(rows).toHaveLength(0);
  });

  it('per-Pariwar uniqueness: a duplicate (pariwar_id, clause_id, version) is rejected (23505)', async () => {
    const { tx } = getTx();
    await seedClauseVersion(tx, PARIWAR_A, { clauseId: 'niy.dup.one', version: 1 });
    const err = await seedClauseVersion(tx, PARIWAR_A, { clauseId: 'niy.dup.one', version: 1 }).catch(
      (e: unknown) => e,
    );
    const code =
      (err as { code?: string }).code ?? (err as { cause?: { code?: string } }).cause?.code;
    expect(code).toBe('23505');
  });

  it('the SAME clause_id is allowed across DIFFERENT Pariwars (tenant-scoped uniqueness)', async () => {
    const { tx } = getTx();
    await seedClauseVersion(tx, PARIWAR_A, { clauseId: 'niy.shared.one' });
    // Same clause_id under a different Pariwar → no conflict.
    await expect(
      seedClauseVersion(tx, PARIWAR_B, { clauseId: 'niy.shared.one' }),
    ).resolves.toBeDefined();
  });

  it('FORCE RLS: clause_versions + niyamavali_amendments have rowsecurity AND forcerowsecurity', async () => {
    const { client } = getTx();
    const { rows } = await client.query<{
      relname: string;
      relrowsecurity: boolean;
      relforcerowsecurity: boolean;
    }>(
      `SELECT relname, relrowsecurity, relforcerowsecurity FROM pg_class
         WHERE relname IN ('clause_versions','niyamavali_amendments')`,
    );
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.relrowsecurity && r.relforcerowsecurity)).toBe(true);
  });
});
