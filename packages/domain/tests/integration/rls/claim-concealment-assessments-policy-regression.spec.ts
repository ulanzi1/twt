// claim_concealment_assessments migration/RLS policy-regression — Story 6.15 code-review follow-up
// (migration integrity was flagged as reviewed-only-at-the-precedent-level, not independently proven at the
// DB layer). Mirrors claim-shepherd-assignments-policy-regression.spec.ts: positive/negative RLS assertions,
// the connection-level fail-closed probe, the FORCE-RLS catalog regression guard, both FKs, the partial-unique
// one-live-per-claim invariant, and the tenant-scoped indexes migration 0068 claims to have created. Live DB only.

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppRoleNoScope, enterAppScope, seedClaim } from '../_helpers.js';

describe.skipIf(!hasDatabase)('claim_concealment_assessments migration + RLS policy regression', () => {
  setupLiveDb();

  async function seedAssessment(
    tx: ReturnType<typeof getTx>['tx'],
    claimCaseId: string,
    pariwarId: string,
    overrides: Partial<{ supersededAt: Date | null }> = {},
  ): Promise<void> {
    await tx.insert(schema.claimConcealmentAssessments).values({
      claimCaseId: claimCaseId as never,
      pariwarId: pariwarId as never,
      kind: 'linked',
      noteCiphertext: null,
      actorId: randomUUID(),
      actorDisplay: 'Test Verifier',
      ...(overrides.supersededAt !== undefined ? { supersededAt: overrides.supersededAt } : {}),
    });
  }

  it('positive: SELECT under scope A returns only A assessment rows', async () => {
    const { tx, client } = getTx();
    const claimA = await seedClaim(tx, PARIWAR_A);
    const claimB = await seedClaim(tx, PARIWAR_B);
    await seedAssessment(tx, claimA, PARIWAR_A);
    await seedAssessment(tx, claimB, PARIWAR_B);
    await enterAppScope(client, PARIWAR_A);

    const rows = await tx.select().from(schema.claimConcealmentAssessments);
    expect(rows).not.toHaveLength(0);
    expect(rows.every((r) => r.pariwarId === PARIWAR_A)).toBe(true);
    expect(rows.some((r) => r.pariwarId === PARIWAR_B)).toBe(false);
  });

  it('negative: scope B does NOT see A assessment rows (symmetric: B sees its own)', async () => {
    const { tx, client } = getTx();
    const claimA = await seedClaim(tx, PARIWAR_A);
    const claimB = await seedClaim(tx, PARIWAR_B);
    await seedAssessment(tx, claimA, PARIWAR_A);
    await seedAssessment(tx, claimB, PARIWAR_B);
    await enterAppScope(client, PARIWAR_B);

    const rows = await tx.select().from(schema.claimConcealmentAssessments);
    expect(rows).not.toHaveLength(0);
    expect(rows.every((r) => r.pariwarId === PARIWAR_B)).toBe(true);
    expect(rows.some((r) => r.pariwarId === PARIWAR_A)).toBe(false);
  });

  it('negative: INSERT with a mismatched pariwarId is rejected by withCheck (42501)', async () => {
    const { tx, client } = getTx();
    const claimA = await seedClaim(tx, PARIWAR_A);
    await enterAppScope(client, PARIWAR_A);

    const err = await tx
      .insert(schema.claimConcealmentAssessments)
      .values({
        claimCaseId: claimA as never,
        pariwarId: PARIWAR_B as never, // ← MISMATCH under scope A
        kind: 'linked',
        noteCiphertext: null,
        actorId: randomUUID(),
        actorDisplay: 'Test Verifier',
      })
      .catch((e: unknown) => e);
    const cause = (err as { cause?: { code?: string; message?: string } }).cause;
    expect(cause?.code).toBe('42501');
    expect(cause?.message ?? '').toMatch(/row-level security/i);
  });

  it('connection-level fail-closed: app role without scope returns empty', async () => {
    const { tx, client } = getTx();
    const claimA = await seedClaim(tx, PARIWAR_A);
    await seedAssessment(tx, claimA, PARIWAR_A);
    await enterAppRoleNoScope(client);

    const rows = await tx.select().from(schema.claimConcealmentAssessments);
    expect(rows).toHaveLength(0);
  });

  it('FORCE RLS: claim_concealment_assessments has rowsecurity AND forcerowsecurity', async () => {
    const { client } = getTx();
    const { rows } = await client.query<{
      relname: string;
      relrowsecurity: boolean;
      relforcerowsecurity: boolean;
    }>(`SELECT relname, relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname = 'claim_concealment_assessments'`);
    expect(rows).toHaveLength(1);
    expect(rows.every((r) => r.relrowsecurity && r.relforcerowsecurity)).toBe(true);
  });

  it('FK integrity: claim_case_id referencing a non-existent claim is rejected (23503)', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    await expect(
      client.query(
        `INSERT INTO claim_concealment_assessments
           (claim_case_id, pariwar_id, kind, actor_id, actor_display)
         VALUES ($1, $2, 'linked', $3, 'Nobody')`,
        [randomUUID(), PARIWAR_A, randomUUID()],
      ),
    ).rejects.toMatchObject({ code: '23503' });
  });

  it('FK integrity: supersedes_assessment_id referencing a non-existent assessment is rejected (23503)', async () => {
    const { tx, client } = getTx();
    const claimA = await seedClaim(tx, PARIWAR_A);
    await enterAppScope(client, PARIWAR_A);
    await expect(
      client.query(
        `INSERT INTO claim_concealment_assessments
           (claim_case_id, pariwar_id, kind, actor_id, actor_display, supersedes_assessment_id)
         VALUES ($1, $2, 'not_linked', $3, 'Nobody', $4)`,
        [claimA, PARIWAR_A, randomUUID(), randomUUID()],
      ),
    ).rejects.toMatchObject({ code: '23503' });
  });

  it('partial-unique: a SECOND live (superseded_at IS NULL) row for the same claim is rejected (23505)', async () => {
    const { tx, client } = getTx();
    const claimA = await seedClaim(tx, PARIWAR_A);
    await enterAppScope(client, PARIWAR_A);
    await seedAssessment(tx, claimA, PARIWAR_A);

    await expect(
      client.query(
        `INSERT INTO claim_concealment_assessments
           (claim_case_id, pariwar_id, kind, actor_id, actor_display)
         VALUES ($1, $2, 'not_linked', $3, 'Second Live Assessment')`,
        [claimA, PARIWAR_A, randomUUID()],
      ),
    ).rejects.toMatchObject({ code: '23505' });
  });

  it('partial-unique: a SUPERSEDED row for the same claim does NOT conflict (superseded_at IS NOT NULL is outside the index)', async () => {
    const { tx, client } = getTx();
    const claimA = await seedClaim(tx, PARIWAR_A);
    await enterAppScope(client, PARIWAR_A);
    await seedAssessment(tx, claimA, PARIWAR_A, { supersededAt: new Date() });

    // A second row for the SAME claim is fine as long as the first is already superseded.
    await expect(seedAssessment(tx, claimA, PARIWAR_A)).resolves.toBeUndefined();
  });

  it('tenant-scoped indexes exist: pariwar_id, claim_case_id, one-live-per-claim partial-unique', async () => {
    const { client } = getTx();
    const { rows } = await client.query<{ indexname: string }>(
      `SELECT indexname FROM pg_indexes WHERE tablename = 'claim_concealment_assessments'`,
    );
    const names = rows.map((r) => r.indexname);
    expect(names).toContain('claim_concealment_assessments_pariwar_id_idx');
    expect(names).toContain('claim_concealment_assessments_claim_case_id_idx');
    expect(names).toContain('claim_concealment_assessments_one_live_per_claim_uq');
  });
});
