// claim_state_trustee_decisions + cycle_freeze_commits migration/RLS policy-regression — Story 6.13
// (Task 9). Mirrors claim-shepherd-assignments-policy-regression: positive/negative RLS assertions, the
// connection-level fail-closed probe, the FORCE-RLS catalog guard, PLUS the migration-0062-specific
// integrity — the claim FK, the PER-PHASE partial-unique invariant (one live row per (claim, phase)), and
// the tenant-scoped indexes on BOTH tables. Live DB only.

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppRoleNoScope, enterAppScope, seedClaim } from '../_helpers.js';

describe.skipIf(!hasDatabase)('state-trustee cycle-freeze migration + RLS policy regression', () => {
  setupLiveDb();

  async function seedDecision(
    tx: ReturnType<typeof getTx>['tx'],
    claimCaseId: string,
    pariwarId: string,
    overrides: Partial<{ phase: 'frozen_vote' | 'commit' | 'escalation_resolution' | 'routing'; supersededAt: Date | null }> = {},
  ): Promise<void> {
    await tx.insert(schema.claimStateTrusteeDecisions).values({
      claimCaseId: claimCaseId as never,
      pariwarId: pariwarId as never,
      phase: overrides.phase ?? 'frozen_vote',
      outcome: 'approved',
      actorId: randomUUID(),
      actorDisplay: 'Test Trustee',
      ...(overrides.supersededAt !== undefined ? { supersededAt: overrides.supersededAt } : {}),
    });
  }

  async function seedCommit(tx: ReturnType<typeof getTx>['tx'], pariwarId: string): Promise<void> {
    await tx.insert(schema.cycleFreezeCommits).values({
      pariwarId: pariwarId as never,
      actorId: randomUUID(),
      actorDisplay: 'Test Trustee',
      committedClaimIds: [randomUUID()],
    });
  }

  // ── claim_state_trustee_decisions ──────────────────────────────────────────

  it('decisions positive/negative: SELECT under scope A returns only A rows; B does not see A', async () => {
    const { tx, client } = getTx();
    const claimA = await seedClaim(tx, PARIWAR_A);
    const claimB = await seedClaim(tx, PARIWAR_B);
    await seedDecision(tx, claimA, PARIWAR_A);
    await seedDecision(tx, claimB, PARIWAR_B);
    await enterAppScope(client, PARIWAR_A);

    const rows = await tx.select().from(schema.claimStateTrusteeDecisions);
    expect(rows).not.toHaveLength(0);
    expect(rows.every((r) => r.pariwarId === PARIWAR_A)).toBe(true);
    expect(rows.some((r) => r.pariwarId === PARIWAR_B)).toBe(false);
  });

  it('decisions: INSERT with a mismatched pariwarId is rejected by withCheck (42501)', async () => {
    const { tx, client } = getTx();
    const claimA = await seedClaim(tx, PARIWAR_A);
    await enterAppScope(client, PARIWAR_A);
    const err = await tx
      .insert(schema.claimStateTrusteeDecisions)
      .values({
        claimCaseId: claimA as never,
        pariwarId: PARIWAR_B as never, // ← MISMATCH under scope A
        phase: 'frozen_vote',
        outcome: 'approved',
        actorId: randomUUID(),
        actorDisplay: 'X',
      })
      .catch((e: unknown) => e);
    const cause = (err as { cause?: { code?: string; message?: string } }).cause;
    expect(cause?.code).toBe('42501');
    expect(cause?.message ?? '').toMatch(/row-level security/i);
  });

  it('decisions connection-level fail-closed: app role without scope returns empty', async () => {
    const { tx, client } = getTx();
    const claimA = await seedClaim(tx, PARIWAR_A);
    await seedDecision(tx, claimA, PARIWAR_A);
    await enterAppRoleNoScope(client);
    const rows = await tx.select().from(schema.claimStateTrusteeDecisions);
    expect(rows).toHaveLength(0);
  });

  it('decisions FORCE RLS: claim_state_trustee_decisions has rowsecurity AND forcerowsecurity', async () => {
    const { client } = getTx();
    const { rows } = await client.query<{ relrowsecurity: boolean; relforcerowsecurity: boolean }>(
      `SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname = 'claim_state_trustee_decisions'`,
    );
    expect(rows).toHaveLength(1);
    expect(rows.every((r) => r.relrowsecurity && r.relforcerowsecurity)).toBe(true);
  });

  it('decisions FK: claim_case_id referencing a non-existent claim is rejected (23503)', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    await expect(
      client.query(
        `INSERT INTO claim_state_trustee_decisions (claim_case_id, pariwar_id, phase, outcome, actor_id, actor_display)
         VALUES ($1, $2, 'frozen_vote', 'approved', $3, 'Nobody')`,
        [randomUUID(), PARIWAR_A, randomUUID()],
      ),
    ).rejects.toMatchObject({ code: '23503' });
  });

  it('decisions per-phase partial-unique: a SECOND live row for the same (claim, phase) is rejected (23505)', async () => {
    const { tx, client } = getTx();
    const claimA = await seedClaim(tx, PARIWAR_A);
    await enterAppScope(client, PARIWAR_A);
    await seedDecision(tx, claimA, PARIWAR_A, { phase: 'frozen_vote' });
    // Raw INSERT so the pg unique-violation code surfaces directly (drizzle wraps it under `.cause`).
    await expect(
      client.query(
        `INSERT INTO claim_state_trustee_decisions (claim_case_id, pariwar_id, phase, outcome, actor_id, actor_display)
         VALUES ($1, $2, 'frozen_vote', 'approved', $3, 'Second Live')`,
        [claimA, PARIWAR_A, randomUUID()],
      ),
    ).rejects.toMatchObject({ code: '23505' });
  });

  it('decisions per-phase partial-unique: a live row in a DIFFERENT phase for the same claim is allowed', async () => {
    const { tx, client } = getTx();
    const claimA = await seedClaim(tx, PARIWAR_A);
    await enterAppScope(client, PARIWAR_A);
    await seedDecision(tx, claimA, PARIWAR_A, { phase: 'frozen_vote' });
    // A routing-phase live row for the same claim does NOT conflict (uniqueness is PER-PHASE, D-F).
    await expect(seedDecision(tx, claimA, PARIWAR_A, { phase: 'routing' })).resolves.toBeUndefined();
  });

  it('decisions per-phase partial-unique: a SUPERSEDED row does NOT conflict with a new live row (same phase)', async () => {
    const { tx, client } = getTx();
    const claimA = await seedClaim(tx, PARIWAR_A);
    await enterAppScope(client, PARIWAR_A);
    await seedDecision(tx, claimA, PARIWAR_A, { phase: 'escalation_resolution', supersededAt: new Date() });
    await expect(seedDecision(tx, claimA, PARIWAR_A, { phase: 'escalation_resolution' })).resolves.toBeUndefined();
  });

  it('decisions indexes exist: pariwar_id, claim_case_id, one-live-per-phase partial-unique', async () => {
    const { client } = getTx();
    const { rows } = await client.query<{ indexname: string }>(
      `SELECT indexname FROM pg_indexes WHERE tablename = 'claim_state_trustee_decisions'`,
    );
    const names = rows.map((r) => r.indexname);
    expect(names).toContain('claim_state_trustee_decisions_pariwar_id_idx');
    expect(names).toContain('claim_state_trustee_decisions_claim_case_id_idx');
    expect(names).toContain('claim_state_trustee_decisions_one_live_per_phase_uq');
  });

  // ── cycle_freeze_commits ───────────────────────────────────────────────────

  it('commits positive/negative: SELECT under scope A returns only A rows; B does not see A', async () => {
    const { tx, client } = getTx();
    await seedCommit(tx, PARIWAR_A);
    await seedCommit(tx, PARIWAR_B);
    await enterAppScope(client, PARIWAR_A);
    const rows = await tx.select().from(schema.cycleFreezeCommits);
    expect(rows).not.toHaveLength(0);
    expect(rows.every((r) => r.pariwarId === PARIWAR_A)).toBe(true);
    expect(rows.some((r) => r.pariwarId === PARIWAR_B)).toBe(false);
  });

  it('commits connection-level fail-closed: app role without scope returns empty', async () => {
    const { tx, client } = getTx();
    await seedCommit(tx, PARIWAR_A);
    await enterAppRoleNoScope(client);
    const rows = await tx.select().from(schema.cycleFreezeCommits);
    expect(rows).toHaveLength(0);
  });

  it('commits FORCE RLS: cycle_freeze_commits has rowsecurity AND forcerowsecurity', async () => {
    const { client } = getTx();
    const { rows } = await client.query<{ relrowsecurity: boolean; relforcerowsecurity: boolean }>(
      `SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname = 'cycle_freeze_commits'`,
    );
    expect(rows).toHaveLength(1);
    expect(rows.every((r) => r.relrowsecurity && r.relforcerowsecurity)).toBe(true);
  });
});
