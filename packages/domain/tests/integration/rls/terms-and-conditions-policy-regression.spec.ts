// terms_and_conditions_versions + terms_and_conditions_pinned_clauses RLS
// policy-regression — Story 2.6 (Task 3). Mirrors clause-versions-policy-regression:
// positive (allowed query returns expected rows) + negative (forbidden query empty
// / raises) assertions for the tenant-isolation policies, the connection-level
// fail-closed probe, and the FORCE-RLS catalog regression guard. Live DB only.

import { describe, expect, it } from 'vitest';

import type { Db } from '../../../src/db.js';
import {
  clauseVersionId as toClauseVersionId,
  pariwarId as toPariwarId,
  tcVersionId as toTcVersionId,
} from '../../../src/ids/index.js';
import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import {
  PARIWAR_A,
  PARIWAR_B,
  enterAppRoleNoScope,
  enterAppScope,
  seedClauseVersion,
} from '../_helpers.js';

/** Seed one T&C version (+ a pinned-clause link) for a Pariwar as superuser. */
async function seedTcVersion(
  tx: Db,
  pariwar: string,
  opts: { version?: number; clauseSlug?: string } = {},
): Promise<{ tcVersionId: string; clauseVersionId: string }> {
  const clauseVersionId = await seedClauseVersion(tx, pariwar, {
    clauseId: opts.clauseSlug ?? 'niy.tc.rls',
  });
  const [tc] = await tx
    .insert(schema.termsAndConditionsVersions)
    .values({
      pariwarId: toPariwarId(pariwar),
      version: opts.version ?? 1,
      bodyMarkdown: '# T&C',
      bodyHtmlRendered: '<h1>T&C</h1>',
      effectiveFrom: new Date('2025-01-01T00:00:00Z'),
    })
    .returning();
  if (!tc) throw new Error('seedTcVersion: insert returned no row');
  await tx.insert(schema.termsAndConditionsPinnedClauses).values({
    tcVersionId: tc.tcVersionId,
    clauseVersionId: toClauseVersionId(clauseVersionId),
    pariwarId: toPariwarId(pariwar),
  });
  return { tcVersionId: tc.tcVersionId, clauseVersionId };
}

describe.skipIf(!hasDatabase)('terms_and_conditions_versions RLS policy regression', () => {
  setupLiveDb();

  it('positive: SELECT under scope A returns only A T&C versions', async () => {
    const { tx, client } = getTx();
    await seedTcVersion(tx, PARIWAR_A, { clauseSlug: 'niy.a.tc' });
    await seedTcVersion(tx, PARIWAR_B, { clauseSlug: 'niy.b.tc' });
    await enterAppScope(client, PARIWAR_A);

    const rows = await tx.select().from(schema.termsAndConditionsVersions);
    expect(rows).not.toHaveLength(0); // guard: RLS returning empty would pass every() vacuously
    expect(rows.every((r) => r.pariwarId === PARIWAR_A)).toBe(true);
    expect(rows.some((r) => r.pariwarId === PARIWAR_B)).toBe(false);
  });

  it('negative: scope B does NOT see A T&C versions', async () => {
    const { tx, client } = getTx();
    await seedTcVersion(tx, PARIWAR_A, { clauseSlug: 'niy.a.tc' });
    await seedTcVersion(tx, PARIWAR_B, { clauseSlug: 'niy.b.tc' });
    await enterAppScope(client, PARIWAR_B);

    const rows = await tx.select().from(schema.termsAndConditionsVersions);
    expect(rows.every((r) => r.pariwarId === PARIWAR_B)).toBe(true);
    expect(rows.some((r) => r.pariwarId === PARIWAR_A)).toBe(false);
  });

  it('negative: INSERT with a mismatched pariwarId is rejected by withCheck (42501)', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const err = await tx
      .insert(schema.termsAndConditionsVersions)
      .values({
        pariwarId: PARIWAR_B,
        version: 1,
        bodyMarkdown: '# x',
        bodyHtmlRendered: '<h1>x</h1>',
        effectiveFrom: new Date('2025-01-01T00:00:00Z'),
      })
      .catch((e: unknown) => e);
    const cause = (err as { cause?: { code?: string; message?: string } }).cause;
    expect(cause?.code).toBe('42501');
    expect(cause?.message ?? '').toMatch(/row-level security/i);
  });

  it('connection-level fail-closed: app role without scope returns empty', async () => {
    const { tx, client } = getTx();
    await seedTcVersion(tx, PARIWAR_A, { clauseSlug: 'niy.a.tc' });
    await enterAppRoleNoScope(client);

    const rows = await tx.select().from(schema.termsAndConditionsVersions);
    expect(rows).toHaveLength(0);
  });

  it('FORCE RLS: both T&C tables have rowsecurity AND forcerowsecurity', async () => {
    const { client } = getTx();
    const { rows } = await client.query<{
      relname: string;
      relrowsecurity: boolean;
      relforcerowsecurity: boolean;
    }>(
      `SELECT relname, relrowsecurity, relforcerowsecurity FROM pg_class
         WHERE relname IN ('terms_and_conditions_versions','terms_and_conditions_pinned_clauses')`,
    );
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.relrowsecurity && r.relforcerowsecurity)).toBe(true);
  });
});

describe.skipIf(!hasDatabase)('terms_and_conditions_pinned_clauses RLS policy regression', () => {
  setupLiveDb();

  it('positive: SELECT under scope A returns only A pin rows', async () => {
    const { tx, client } = getTx();
    await seedTcVersion(tx, PARIWAR_A, { clauseSlug: 'niy.a.tc' });
    await seedTcVersion(tx, PARIWAR_B, { clauseSlug: 'niy.b.tc' });
    await enterAppScope(client, PARIWAR_A);

    const rows = await tx.select().from(schema.termsAndConditionsPinnedClauses);
    expect(rows).not.toHaveLength(0); // guard: RLS returning empty would pass every() vacuously
    expect(rows.every((r) => r.pariwarId === PARIWAR_A)).toBe(true);
    expect(rows.some((r) => r.pariwarId === PARIWAR_B)).toBe(false);
  });

  it('negative: scope B does NOT see A pin rows', async () => {
    const { tx, client } = getTx();
    await seedTcVersion(tx, PARIWAR_A, { clauseSlug: 'niy.a.tc' });
    await seedTcVersion(tx, PARIWAR_B, { clauseSlug: 'niy.b.tc' });
    await enterAppScope(client, PARIWAR_B);

    const rows = await tx.select().from(schema.termsAndConditionsPinnedClauses);
    expect(rows.some((r) => r.pariwarId === PARIWAR_A)).toBe(false);
    expect(rows.every((r) => r.pariwarId === PARIWAR_B)).toBe(true); // symmetric: B's own rows ARE visible
  });

  it('negative: INSERT into pinned_clauses with mismatched pariwarId is rejected (42501)', async () => {
    const { tx, client } = getTx();
    // Seed the parent TC version + clause version for PARIWAR_A as superuser (valid FKs).
    const { tcVersionId, clauseVersionId } = await seedTcVersion(tx, PARIWAR_A, {
      clauseSlug: 'niy.a.pin.chk',
    });
    await enterAppScope(client, PARIWAR_A);

    // Attempt to insert a link row where pariwarId mismatches the active scope — withCheck must reject.
    const err = await tx
      .insert(schema.termsAndConditionsPinnedClauses)
      .values({
        tcVersionId: toTcVersionId(tcVersionId),
        clauseVersionId: toClauseVersionId(clauseVersionId),
        pariwarId: toPariwarId(PARIWAR_B), // ← MISMATCH under scope A
      })
      .catch((e: unknown) => e);
    const cause = (err as { cause?: { code?: string } }).cause;
    expect(cause?.code).toBe('42501');
  });
});
