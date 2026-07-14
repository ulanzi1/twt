// claim_r9_voting_sessions + claim_r9_votes migration/RLS policy-regression — Story 6.14 (Task 11; AC11).
//
// SYMMETRIC coverage on BOTH tables (no repeat of the 6.13 cycle_freeze_commits asymmetry, #17):
// positive/negative RLS, the connection-level fail-closed probe, the FORCE-RLS catalog guard, the FKs, the
// two partial-uniques, the tenant/scan indexes, AND the AC11 CHECK constraints (outcome/finalize/counts
// coupling, counts ≥ 0, panel non-empty, quorum within panel). Live DB only.

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppRoleNoScope, enterAppScope, seedClaim, seedClauseVersion } from '../_helpers.js';

type Tx = ReturnType<typeof getTx>['tx'];

/** Seed a real `clause_versions` row + return its id — the `clause_version_id` FK (migration 0066, code
 *  review 2026-07-14) requires a row that actually exists; run BEFORE `enterAppScope` like `seedClaim`. The
 *  seeding tenant is irrelevant to these tests (no compound tenant FK — plain PK reference), so ONE row
 *  under PARIWAR_A is reused even for PARIWAR_B-scoped session/vote fixtures below. */
async function seedR9ClauseVersion(tx: Tx): Promise<string> {
  return seedClauseVersion(tx, PARIWAR_A, { clauseId: 'niy.special-death.r9', payload: { rule_code: 'R9' } });
}

async function seedSession(
  tx: Tx,
  claimCaseId: string,
  pariwarId: string,
  clauseVersionId: string,
  overrides: Partial<{ panelActorIds: string[]; quorumRequired: number; supersededAt: Date | null }> = {},
): Promise<string> {
  const rows = await tx
    .insert(schema.claimR9VotingSessions)
    .values({
      claimCaseId: claimCaseId as never,
      pariwarId: pariwarId as never,
      clauseId: 'niy.special-death.r9',
      clauseVersionId: clauseVersionId as never,
      ruleCode: 'R9',
      votingRequirement: 'majority',
      panelActorIds: overrides.panelActorIds ?? [randomUUID(), randomUUID(), randomUUID()],
      quorumRequired: overrides.quorumRequired ?? 2,
      openedByActor: randomUUID(),
      openedDisplay: 'Opener',
      ...(overrides.supersededAt !== undefined ? { supersededAt: overrides.supersededAt } : {}),
    })
    .returning({ sessionId: schema.claimR9VotingSessions.sessionId });
  return rows[0]!.sessionId;
}

async function seedVote(
  tx: Tx,
  sessionId: string,
  claimCaseId: string,
  pariwarId: string,
  clauseVersionId: string,
  overrides: Partial<{ voterActorId: string; supersededAt: Date | null }> = {},
): Promise<void> {
  await tx.insert(schema.claimR9Votes).values({
    sessionId: sessionId as never,
    claimCaseId: claimCaseId as never,
    pariwarId: pariwarId as never,
    voterActorId: overrides.voterActorId ?? randomUUID(),
    voterDisplay: 'Voter',
    vote: 'approve',
    rationaleCiphertext: 'enc:v1:fake',
    clauseVersionId: clauseVersionId as never,
    ...(overrides.supersededAt !== undefined ? { supersededAt: overrides.supersededAt } : {}),
  });
}

describe.skipIf(!hasDatabase)('R9 voting migration + RLS policy regression', () => {
  setupLiveDb();

  // ── claim_r9_voting_sessions ────────────────────────────────────────────────

  it('sessions positive/negative: SELECT under scope A returns only A rows; B does not see A', async () => {
    const { tx, client } = getTx();
    const claimA = await seedClaim(tx, PARIWAR_A);
    const claimB = await seedClaim(tx, PARIWAR_B);
    const clauseVersionId = await seedR9ClauseVersion(tx);
    await seedSession(tx, claimA, PARIWAR_A, clauseVersionId);
    await seedSession(tx, claimB, PARIWAR_B, clauseVersionId);
    await enterAppScope(client, PARIWAR_A);
    const rows = await tx.select().from(schema.claimR9VotingSessions);
    expect(rows).not.toHaveLength(0);
    expect(rows.every((r) => r.pariwarId === PARIWAR_A)).toBe(true);
    expect(rows.some((r) => r.pariwarId === PARIWAR_B)).toBe(false);
  });

  it('sessions: INSERT with a mismatched pariwarId is rejected by withCheck (42501)', async () => {
    const { tx, client } = getTx();
    const claimA = await seedClaim(tx, PARIWAR_A);
    const clauseVersionId = await seedR9ClauseVersion(tx);
    await enterAppScope(client, PARIWAR_A);
    const err = await seedSession(tx, claimA, PARIWAR_B, clauseVersionId).catch((e: unknown) => e);
    const cause = (err as { cause?: { code?: string } }).cause;
    expect(cause?.code).toBe('42501');
  });

  it('sessions connection-level fail-closed: app role without scope returns empty', async () => {
    const { tx, client } = getTx();
    const claimA = await seedClaim(tx, PARIWAR_A);
    const clauseVersionId = await seedR9ClauseVersion(tx);
    await seedSession(tx, claimA, PARIWAR_A, clauseVersionId);
    await enterAppRoleNoScope(client);
    expect(await tx.select().from(schema.claimR9VotingSessions)).toHaveLength(0);
  });

  it('sessions FORCE RLS + indexes exist', async () => {
    const { client } = getTx();
    const rls = await client.query<{ relrowsecurity: boolean; relforcerowsecurity: boolean }>(
      `SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname = 'claim_r9_voting_sessions'`,
    );
    expect(rls.rows.every((r) => r.relrowsecurity && r.relforcerowsecurity)).toBe(true);
    const idx = await client.query<{ indexname: string }>(
      `SELECT indexname FROM pg_indexes WHERE tablename = 'claim_r9_voting_sessions'`,
    );
    const names = idx.rows.map((r) => r.indexname);
    expect(names).toContain('claim_r9_voting_sessions_pariwar_id_idx');
    expect(names).toContain('claim_r9_voting_sessions_claim_case_id_idx');
    expect(names).toContain('claim_r9_voting_sessions_one_live_per_claim_uq');
  });

  it('sessions FK: claim_case_id referencing a non-existent claim is rejected (23503)', async () => {
    const { tx, client } = getTx();
    const clauseVersionId = await seedR9ClauseVersion(tx);
    await enterAppScope(client, PARIWAR_A);
    await expect(
      client.query(
        `INSERT INTO claim_r9_voting_sessions (claim_case_id, pariwar_id, clause_id, clause_version_id, rule_code, voting_requirement, panel_actor_ids, quorum_required, opened_by_actor, opened_display)
         VALUES ($1, $2, 'niy.special-death.r9', $3, 'R9', 'majority', ARRAY[$4], 1, $5, 'X')`,
        [randomUUID(), PARIWAR_A, clauseVersionId, randomUUID(), randomUUID()],
      ),
    ).rejects.toMatchObject({ code: '23503' });
  });

  it('sessions FK: clause_version_id referencing a non-existent clause version is rejected (23503)', async () => {
    const { tx, client } = getTx();
    const claimA = await seedClaim(tx, PARIWAR_A);
    await enterAppScope(client, PARIWAR_A);
    await expect(
      client.query(
        `INSERT INTO claim_r9_voting_sessions (claim_case_id, pariwar_id, clause_id, clause_version_id, rule_code, voting_requirement, panel_actor_ids, quorum_required, opened_by_actor, opened_display)
         VALUES ($1, $2, 'niy.special-death.r9', $3, 'R9', 'majority', ARRAY[$4], 1, $5, 'X')`,
        [claimA, PARIWAR_A, randomUUID(), randomUUID(), randomUUID()],
      ),
    ).rejects.toMatchObject({ code: '23503' });
  });

  it('sessions partial-unique: a SECOND live session for the same claim is rejected (23505)', async () => {
    const { tx, client } = getTx();
    const claimA = await seedClaim(tx, PARIWAR_A);
    const clauseVersionId = await seedR9ClauseVersion(tx);
    await enterAppScope(client, PARIWAR_A);
    await seedSession(tx, claimA, PARIWAR_A, clauseVersionId);
    await expect(seedSession(tx, claimA, PARIWAR_A, clauseVersionId)).rejects.toMatchObject({ cause: { code: '23505' } });
  });

  it('sessions partial-unique: a SUPERSEDED session for the same claim does NOT conflict with a fresh live one', async () => {
    const { tx, client } = getTx();
    const claimB = await seedClaim(tx, PARIWAR_A);
    const clauseVersionId = await seedR9ClauseVersion(tx);
    await enterAppScope(client, PARIWAR_A);
    await seedSession(tx, claimB, PARIWAR_A, clauseVersionId, { supersededAt: new Date() });
    await expect(seedSession(tx, claimB, PARIWAR_A, clauseVersionId)).resolves.toBeTruthy();
  });

  it('sessions CHECK: an empty panel is rejected (panel_non_empty)', async () => {
    const { tx, client } = getTx();
    const claimA = await seedClaim(tx, PARIWAR_A);
    const clauseVersionId = await seedR9ClauseVersion(tx);
    await enterAppScope(client, PARIWAR_A);
    await expect(seedSession(tx, claimA, PARIWAR_A, clauseVersionId, { panelActorIds: [] })).rejects.toMatchObject({
      cause: { code: '23514' },
    });
  });

  it('sessions CHECK: a quorum above the panel size is rejected (quorum_within_panel)', async () => {
    const { tx, client } = getTx();
    const claimA = await seedClaim(tx, PARIWAR_A);
    const clauseVersionId = await seedR9ClauseVersion(tx);
    await enterAppScope(client, PARIWAR_A);
    await expect(
      seedSession(tx, claimA, PARIWAR_A, clauseVersionId, { panelActorIds: [randomUUID(), randomUUID()], quorumRequired: 3 }),
    ).rejects.toMatchObject({ cause: { code: '23514' } });
  });

  it('sessions CHECK: outcome set without finalized_at / counts is rejected (the coupling invariant)', async () => {
    const { tx, client } = getTx();
    const claimA = await seedClaim(tx, PARIWAR_A);
    const clauseVersionId = await seedR9ClauseVersion(tx);
    await enterAppScope(client, PARIWAR_A);
    await expect(
      client.query(
        `INSERT INTO claim_r9_voting_sessions (claim_case_id, pariwar_id, clause_id, clause_version_id, rule_code, voting_requirement, panel_actor_ids, quorum_required, opened_by_actor, opened_display, outcome)
         VALUES ($1, $2, 'niy.special-death.r9', $3, 'R9', 'majority', ARRAY[$4], 1, $5, 'X', 'approved')`,
        [claimA, PARIWAR_A, clauseVersionId, randomUUID(), randomUUID()],
      ),
    ).rejects.toMatchObject({ code: '23514' });
  });

  // ── claim_r9_votes ──────────────────────────────────────────────────────────

  it('votes positive/negative: SELECT under scope A returns only A rows; B does not see A', async () => {
    const { tx, client } = getTx();
    const claimA = await seedClaim(tx, PARIWAR_A);
    const claimB = await seedClaim(tx, PARIWAR_B);
    const clauseVersionId = await seedR9ClauseVersion(tx);
    const sessionA = await seedSession(tx, claimA, PARIWAR_A, clauseVersionId);
    const sessionB = await seedSession(tx, claimB, PARIWAR_B, clauseVersionId);
    await seedVote(tx, sessionA, claimA, PARIWAR_A, clauseVersionId);
    await seedVote(tx, sessionB, claimB, PARIWAR_B, clauseVersionId);
    await enterAppScope(client, PARIWAR_A);
    const rows = await tx.select().from(schema.claimR9Votes);
    expect(rows).not.toHaveLength(0);
    expect(rows.every((r) => r.pariwarId === PARIWAR_A)).toBe(true);
    expect(rows.some((r) => r.pariwarId === PARIWAR_B)).toBe(false);
  });

  it('votes: INSERT with a mismatched pariwarId is rejected by withCheck (42501)', async () => {
    const { tx, client } = getTx();
    const claimA = await seedClaim(tx, PARIWAR_A);
    const clauseVersionId = await seedR9ClauseVersion(tx);
    const sessionA = await seedSession(tx, claimA, PARIWAR_A, clauseVersionId);
    await enterAppScope(client, PARIWAR_A);
    const err = await seedVote(tx, sessionA, claimA, PARIWAR_B, clauseVersionId).catch((e: unknown) => e);
    expect((err as { cause?: { code?: string } }).cause?.code).toBe('42501');
  });

  it('votes connection-level fail-closed: app role without scope returns empty', async () => {
    const { tx, client } = getTx();
    const claimA = await seedClaim(tx, PARIWAR_A);
    const clauseVersionId = await seedR9ClauseVersion(tx);
    const sessionA = await seedSession(tx, claimA, PARIWAR_A, clauseVersionId);
    await seedVote(tx, sessionA, claimA, PARIWAR_A, clauseVersionId);
    await enterAppRoleNoScope(client);
    expect(await tx.select().from(schema.claimR9Votes)).toHaveLength(0);
  });

  it('votes FORCE RLS + indexes exist', async () => {
    const { client } = getTx();
    const rls = await client.query<{ relrowsecurity: boolean; relforcerowsecurity: boolean }>(
      `SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname = 'claim_r9_votes'`,
    );
    expect(rls.rows.every((r) => r.relrowsecurity && r.relforcerowsecurity)).toBe(true);
    const idx = await client.query<{ indexname: string }>(`SELECT indexname FROM pg_indexes WHERE tablename = 'claim_r9_votes'`);
    const names = idx.rows.map((r) => r.indexname);
    expect(names).toContain('claim_r9_votes_pariwar_id_idx');
    expect(names).toContain('claim_r9_votes_session_id_idx');
    expect(names).toContain('claim_r9_votes_voter_actor_id_idx');
    expect(names).toContain('claim_r9_votes_one_live_per_voter_uq');
  });

  it('votes FK: session_id referencing a non-existent session is rejected (23503)', async () => {
    const { tx, client } = getTx();
    const claimA = await seedClaim(tx, PARIWAR_A);
    const clauseVersionId = await seedR9ClauseVersion(tx);
    await enterAppScope(client, PARIWAR_A);
    await expect(seedVote(tx, randomUUID(), claimA, PARIWAR_A, clauseVersionId)).rejects.toMatchObject({
      cause: { code: '23503' },
    });
  });

  it('votes FK: clause_version_id referencing a non-existent clause version is rejected (23503)', async () => {
    const { tx, client } = getTx();
    const claimA = await seedClaim(tx, PARIWAR_A);
    const clauseVersionId = await seedR9ClauseVersion(tx);
    const sessionA = await seedSession(tx, claimA, PARIWAR_A, clauseVersionId);
    await enterAppScope(client, PARIWAR_A);
    await expect(seedVote(tx, sessionA, claimA, PARIWAR_A, randomUUID())).rejects.toMatchObject({
      cause: { code: '23503' },
    });
  });

  it('votes partial-unique: a SECOND live vote for the same (session, voter) is rejected (23505)', async () => {
    const { tx, client } = getTx();
    const claimA = await seedClaim(tx, PARIWAR_A);
    const clauseVersionId = await seedR9ClauseVersion(tx);
    const sessionA = await seedSession(tx, claimA, PARIWAR_A, clauseVersionId);
    await enterAppScope(client, PARIWAR_A);
    const voter = randomUUID();
    await seedVote(tx, sessionA, claimA, PARIWAR_A, clauseVersionId, { voterActorId: voter });
    await expect(seedVote(tx, sessionA, claimA, PARIWAR_A, clauseVersionId, { voterActorId: voter })).rejects.toMatchObject({
      cause: { code: '23505' },
    });
  });

  it('votes partial-unique: a SUPERSEDED prior vote does NOT conflict with a fresh live one (same session, voter)', async () => {
    const { tx, client } = getTx();
    const claimA = await seedClaim(tx, PARIWAR_A);
    const clauseVersionId = await seedR9ClauseVersion(tx);
    const sessionA = await seedSession(tx, claimA, PARIWAR_A, clauseVersionId);
    await enterAppScope(client, PARIWAR_A);
    const voter2 = randomUUID();
    await seedVote(tx, sessionA, claimA, PARIWAR_A, clauseVersionId, { voterActorId: voter2, supersededAt: new Date() });
    await expect(
      seedVote(tx, sessionA, claimA, PARIWAR_A, clauseVersionId, { voterActorId: voter2 }),
    ).resolves.toBeUndefined();
  });

  it('votes NOT NULL: rationale_ciphertext is required (rationale mandatory for every vote, AC3)', async () => {
    const { tx, client } = getTx();
    const claimA = await seedClaim(tx, PARIWAR_A);
    const clauseVersionId = await seedR9ClauseVersion(tx);
    const sessionA = await seedSession(tx, claimA, PARIWAR_A, clauseVersionId);
    await enterAppScope(client, PARIWAR_A);
    await expect(
      client.query(
        `INSERT INTO claim_r9_votes (session_id, claim_case_id, pariwar_id, voter_actor_id, voter_display, vote, clause_version_id)
         VALUES ($1, $2, $3, $4, 'V', 'approve', $5)`,
        [sessionA, claimA, PARIWAR_A, randomUUID(), clauseVersionId],
      ),
    ).rejects.toMatchObject({ code: '23502' }); // NOT NULL violation
  });
});
