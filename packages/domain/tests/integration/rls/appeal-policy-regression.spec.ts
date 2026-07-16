// Appeal tables migration/RLS policy-regression — Story 6.16 (Task 11). SYMMETRIC coverage on the four
// appeal tables + the config table (the 6.15 review lesson — every sibling table gets one): cross-tenant
// SELECT isolation, the connection-level fail-closed probe, the FORCE-RLS catalog guard, a FK (23503), and
// the D-F unconditional-unique + a partial-unique (23505). Live DB only.

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppRoleNoScope, enterAppScope, seedClaim } from '../_helpers.js';

type Tx = ReturnType<typeof getTx>['tx'];

async function insertAppeal(tx: Tx, claimCaseId: string, pariwarId: string, stage: '1' | '2' | '3' = '1'): Promise<void> {
  await tx.insert(schema.claimAppeals).values({
    claimCaseId: claimCaseId as never,
    pariwarId: pariwarId as never,
    currentStage: stage as never,
    initiatedByActor: randomUUID(),
  });
}

const APPEAL_TABLES = [
  'claim_appeals',
  'claim_appeal_decisions',
  'claim_appeal_panel_sessions',
  'claim_appeal_panel_votes',
  'pariwar_appeal_config',
];

/** A pg error's code, whether surfaced at the top level or wrapped by drizzle under `.cause`. */
function pgCode(err: unknown): string | undefined {
  return (err as { code?: string }).code ?? (err as { cause?: { code?: string } }).cause?.code;
}

describe.skipIf(!hasDatabase)('appeal tables — RLS + constraints', () => {
  setupLiveDb();

  it('FORCE ROW LEVEL SECURITY is enabled on all five tables (the catalog guard)', async () => {
    const { client } = getTx();
    for (const t of APPEAL_TABLES) {
      const rls = await client.query<{ relrowsecurity: boolean; relforcerowsecurity: boolean }>(
        `SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname = $1`,
        [t],
      );
      expect(rls.rows.every((r) => r.relrowsecurity && r.relforcerowsecurity)).toBe(true);
    }
  });

  it('cross-tenant SELECT isolation — a PARIWAR_B reader sees NONE of PARIWAR_A’s appeals', async () => {
    const { client, tx } = getTx();
    const claimCaseId = randomUUID();
    await seedClaim(tx, PARIWAR_A, { claimCaseId });
    await enterAppScope(client, PARIWAR_A);
    await insertAppeal(tx, claimCaseId, PARIWAR_A);
    const mine = await tx.select().from(schema.claimAppeals);
    expect(mine.some((r) => r.claimCaseId === claimCaseId)).toBe(true);

    // Switch to PARIWAR_B scope — the PARIWAR_A row is invisible.
    await enterAppScope(client, PARIWAR_B);
    const theirs = await tx.select().from(schema.claimAppeals);
    expect(theirs.some((r) => r.claimCaseId === claimCaseId)).toBe(false);
  });

  it('connection-level fail-closed — an unset scope returns 0 rows', async () => {
    const { client, tx } = getTx();
    const claimCaseId = randomUUID();
    await seedClaim(tx, PARIWAR_A, { claimCaseId });
    await enterAppScope(client, PARIWAR_A);
    await insertAppeal(tx, claimCaseId, PARIWAR_A);
    // Shed the scope AND clear the pariwar setting (enterAppRoleNoScope only sheds superuser) → fail-closed.
    await enterAppRoleNoScope(client);
    await client.query("SET LOCAL app.pariwar_id = ''");
    const rows = await tx.select().from(schema.claimAppeals);
    expect(rows).toHaveLength(0);
  });

  it('D-F — the unconditional UNIQUE (claim_case_id) rejects a second journey (23505)', async () => {
    const { client, tx } = getTx();
    const claimCaseId = randomUUID();
    await seedClaim(tx, PARIWAR_A, { claimCaseId });
    await enterAppScope(client, PARIWAR_A);
    await insertAppeal(tx, claimCaseId, PARIWAR_A);
    await insertAppeal(tx, claimCaseId, PARIWAR_A).then(
      () => expect.fail('expected a unique violation'),
      (err) => expect(pgCode(err)).toBe('23505'),
    );
  });

  it('a decision FK to a non-existent claim is rejected (23503)', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    await tx
      .insert(schema.claimAppealDecisions)
      .values({
        claimCaseId: randomUUID() as never,
        pariwarId: PARIWAR_A as never,
        stage: '1' as never,
        decision: 'advance' as never,
        rationaleCiphertext: 'enc:v1:x',
        reviewerActorId: randomUUID(),
        reviewerDisplay: 'R',
      })
      .then(
        () => expect.fail('expected a FK violation'),
        (err) => expect(pgCode(err)).toBe('23503'),
      );
  });

  // ── Dedicated cross-tenant + fail-closed coverage for the remaining three tables (6.16 review finding —
  //    the 6.15-review lesson is "every sibling table gets one", not just the catalog-wide FORCE-RLS loop). ──

  it('claim_appeal_panel_sessions — cross-tenant SELECT isolation — a PARIWAR_B reader sees NONE of PARIWAR_A’s sessions', async () => {
    const { client, tx } = getTx();
    const claimCaseId = randomUUID();
    await seedClaim(tx, PARIWAR_A, { claimCaseId });
    await enterAppScope(client, PARIWAR_A);
    await tx.insert(schema.claimAppealPanelSessions).values({
      claimCaseId: claimCaseId as never,
      pariwarId: PARIWAR_A as never,
      panelActorIds: [randomUUID(), randomUUID()],
      quorumRequired: 2,
      openedByActor: randomUUID(),
      openedDisplay: 'Opener',
    });
    const mine = await tx.select().from(schema.claimAppealPanelSessions);
    expect(mine.some((r) => r.claimCaseId === claimCaseId)).toBe(true);

    await enterAppScope(client, PARIWAR_B);
    const theirs = await tx.select().from(schema.claimAppealPanelSessions);
    expect(theirs.some((r) => r.claimCaseId === claimCaseId)).toBe(false);
  });

  it('claim_appeal_panel_sessions — connection-level fail-closed — an unset scope returns 0 rows', async () => {
    const { client, tx } = getTx();
    const claimCaseId = randomUUID();
    await seedClaim(tx, PARIWAR_A, { claimCaseId });
    await enterAppScope(client, PARIWAR_A);
    await tx.insert(schema.claimAppealPanelSessions).values({
      claimCaseId: claimCaseId as never,
      pariwarId: PARIWAR_A as never,
      panelActorIds: [randomUUID(), randomUUID()],
      quorumRequired: 2,
      openedByActor: randomUUID(),
      openedDisplay: 'Opener',
    });
    await enterAppRoleNoScope(client);
    await client.query("SET LOCAL app.pariwar_id = ''");
    const rows = await tx.select().from(schema.claimAppealPanelSessions);
    expect(rows).toHaveLength(0);
  });

  it('claim_appeal_panel_votes — cross-tenant SELECT isolation — a PARIWAR_B reader sees NONE of PARIWAR_A’s votes', async () => {
    const { client, tx } = getTx();
    const claimCaseId = randomUUID();
    await seedClaim(tx, PARIWAR_A, { claimCaseId });
    await enterAppScope(client, PARIWAR_A);
    const sessionRows = await tx
      .insert(schema.claimAppealPanelSessions)
      .values({
        claimCaseId: claimCaseId as never,
        pariwarId: PARIWAR_A as never,
        panelActorIds: [randomUUID(), randomUUID()],
        quorumRequired: 2,
        openedByActor: randomUUID(),
        openedDisplay: 'Opener',
      })
      .returning({ sessionId: schema.claimAppealPanelSessions.sessionId });
    const sessionId = sessionRows[0]!.sessionId;
    await tx.insert(schema.claimAppealPanelVotes).values({
      sessionId: sessionId as never,
      claimCaseId: claimCaseId as never,
      pariwarId: PARIWAR_A as never,
      voterActorId: randomUUID(),
      voterDisplay: 'Voter',
      vote: 'reverse' as never,
      rationaleCiphertext: 'enc:v1:x',
    });
    const mine = await tx.select().from(schema.claimAppealPanelVotes);
    expect(mine.some((r) => r.claimCaseId === claimCaseId)).toBe(true);

    await enterAppScope(client, PARIWAR_B);
    const theirs = await tx.select().from(schema.claimAppealPanelVotes);
    expect(theirs.some((r) => r.claimCaseId === claimCaseId)).toBe(false);
  });

  it('claim_appeal_panel_votes — connection-level fail-closed — an unset scope returns 0 rows', async () => {
    const { client, tx } = getTx();
    const claimCaseId = randomUUID();
    await seedClaim(tx, PARIWAR_A, { claimCaseId });
    await enterAppScope(client, PARIWAR_A);
    const sessionRows = await tx
      .insert(schema.claimAppealPanelSessions)
      .values({
        claimCaseId: claimCaseId as never,
        pariwarId: PARIWAR_A as never,
        panelActorIds: [randomUUID(), randomUUID()],
        quorumRequired: 2,
        openedByActor: randomUUID(),
        openedDisplay: 'Opener',
      })
      .returning({ sessionId: schema.claimAppealPanelSessions.sessionId });
    const sessionId = sessionRows[0]!.sessionId;
    await tx.insert(schema.claimAppealPanelVotes).values({
      sessionId: sessionId as never,
      claimCaseId: claimCaseId as never,
      pariwarId: PARIWAR_A as never,
      voterActorId: randomUUID(),
      voterDisplay: 'Voter',
      vote: 'reverse' as never,
      rationaleCiphertext: 'enc:v1:x',
    });
    await enterAppRoleNoScope(client);
    await client.query("SET LOCAL app.pariwar_id = ''");
    const rows = await tx.select().from(schema.claimAppealPanelVotes);
    expect(rows).toHaveLength(0);
  });

  it('pariwar_appeal_config — cross-tenant SELECT isolation — a PARIWAR_B reader sees NONE of PARIWAR_A’s config', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    await tx.insert(schema.pariwarAppealConfig).values({ pariwarId: PARIWAR_A as never });
    const mine = await tx.select().from(schema.pariwarAppealConfig);
    expect(mine.some((r) => r.pariwarId === PARIWAR_A)).toBe(true);

    await enterAppScope(client, PARIWAR_B);
    const theirs = await tx.select().from(schema.pariwarAppealConfig);
    expect(theirs.some((r) => r.pariwarId === PARIWAR_A)).toBe(false);
  });

  it('pariwar_appeal_config — connection-level fail-closed — an unset scope returns 0 rows', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    await tx.insert(schema.pariwarAppealConfig).values({ pariwarId: PARIWAR_A as never });
    await enterAppRoleNoScope(client);
    await client.query("SET LOCAL app.pariwar_id = ''");
    const rows = await tx.select().from(schema.pariwarAppealConfig);
    expect(rows).toHaveLength(0);
  });

  it('the decision partial-unique rejects two live rows for the same (claim, stage) (23505)', async () => {
    const { client, tx } = getTx();
    const claimCaseId = randomUUID();
    await seedClaim(tx, PARIWAR_A, { claimCaseId });
    await enterAppScope(client, PARIWAR_A);
    const row = () => ({
      claimCaseId: claimCaseId as never,
      pariwarId: PARIWAR_A as never,
      stage: '1' as never,
      decision: 'advance' as never,
      rationaleCiphertext: 'enc:v1:x',
      reviewerActorId: randomUUID(),
      reviewerDisplay: 'R',
    });
    await tx.insert(schema.claimAppealDecisions).values(row());
    await tx.insert(schema.claimAppealDecisions).values(row()).then(
      () => expect.fail('expected a unique violation'),
      (err) => expect(pgCode(err)).toBe('23505'),
    );
  });
});
