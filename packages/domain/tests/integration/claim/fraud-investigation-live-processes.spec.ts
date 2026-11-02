// Story 6.22 — a fraud finding that CLOSES a claim ENDS everything still running on it (AC5 (a); code review 2026-11-02, RA3).
//
// The finding closes through the closure core (`closeClaimOnFraudFinding`), whose `endLiveProcesses` ends four things: an open
// appeal journey, an un-finalized Stage-2 panel, an un-finalized R9 session with its `routed_to_r9` routing row, and a live
// correction return with its open run. `fraud-investigation.spec.ts` covers the first; this spec covers the other three, through
// the REAL flag-and-finding path — so a fraud close that stopped ending them would go red here, not only the 6.24a closers' own
// specs. (The fixtures are the 6.24a ones: `suspicion-refusal.spec.ts` builds the same processes for a held claim.)

import { randomUUID } from 'node:crypto';

import { and, eq, isNull } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import {
  flagClaimForFraudInvestigation,
  noCorrectionHold,
  openAppealPanel,
  openR9VotingSession,
  recordFraudFinding,
  returnToDistrictAdmin,
  writeCorrectionMark,
} from '../../../src/claim/index.js';
import {
  claimFraudInvestigationStepId as toStepId,
  claimId as toClaimId,
  claimNomineeFindingId as toFindingId,
  type ClaimId,
  type PariwarId,
} from '../../../src/ids/index.js';
import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, driveClaimTo, enterAppScope, seedClauseVersion, seedNomineeNameCheck, seedRoleGrant } from '../_helpers.js';
import { openAppeal, refusedClaim, seedAppealPanel, stateOf, toStage2 } from './_suspicion-refusal-fixtures.js';

type Client = ReturnType<typeof getTx>['client'];

const PID = PARIWAR_A as PariwarId;
const OPERATOR = 'a7a7a7a7-0000-4000-8000-000000000001';
const DA = 'd7d7d7d7-0000-4000-8000-000000000002';
const PA = 'a2a2a2a2-0000-4000-8000-000000000004';
const R9_CLAUSE = 'niy.special-death.r9';

/** Flag the claim, then record an INNOCENT finding — the fraud close under test. */
async function flagAndFind(client: Client, cid: ClaimId) {
  await flagClaimForFraudInvestigation(client, {
    claimCaseId: cid, pariwarId: PID, stepId: toStepId(randomUUID()), noteCiphertext: 'enc:v1:flag', actorId: OPERATOR, actorDisplay: 'Helpline Operator', actor: 'operator',
  });
  return recordFraudFinding(client, {
    claimCaseId: cid, pariwarId: PID, outcome: 'innocent', aliveConfirmation: 'in_person', stepId: toStepId(randomUUID()),
    findingId: toFindingId(randomUUID()), noteCiphertext: 'enc:v1:find', actorId: DA, actorDisplay: 'District Admin', actor: 'operator',
  });
}

/** A claim of `mid` in `verifier_approved` — closable, and approvable-shaped like the 6.24a held claims. */
async function openHeldClaim(client: Client, mid: string): Promise<ClaimId> {
  const cid = toClaimId(randomUUID());
  await driveClaimTo(client, PID, cid, mid, 'verifier_approved');
  await seedNomineeNameCheck(client, PID, cid);
  return cid;
}

describe.skipIf(!hasDatabase)('Story 6.22 — a fraud close ends the claim\'s live processes (AC5 (a), RA3)', { timeout: 30000 }, () => {
  setupLiveDb();

  it('⭐ an un-finalized R9 session and its `routed_to_r9` routing row are superseded', async () => {
    const { client, tx } = getTx();
    await client.query('RESET ROLE');
    await seedClauseVersion(tx, PID, { clauseId: R9_CLAUSE, payload: { rule_code: 'R9', voting_required: true, majority_required: true, on_pass: 'route_r9_voting' } });
    const panel = [randomUUID(), randomUUID()];
    for (const uid of panel) await seedRoleGrant(tx, PID, { userId: uid, role: 'pariwar_admin', scopeDimension: 'pariwar', scopeValue: PID });
    await enterAppScope(client, PID);
    const cid = await openHeldClaim(client, randomUUID());
    await tx.insert(schema.claimStateTrusteeDecisions).values({
      claimCaseId: cid, pariwarId: PID, phase: 'routing', outcome: 'routed_to_r9', reasonCode: 'r9_special_case', rationaleCiphertext: null, actorId: PA, actorDisplay: 'Pariwar Admin',
    });
    await openR9VotingSession(client, { claimCaseId: cid, pariwarId: PID, clauseId: R9_CLAUSE, panelActorIds: panel, actorId: PA, actorDisplay: 'Pariwar Admin', actor: 'trustee' });

    // The CONTROL: before the finding the session and the routing are LIVE — else "superseded" below proves nothing.
    const liveSessions = () => tx.select().from(schema.claimR9VotingSessions).where(and(eq(schema.claimR9VotingSessions.claimCaseId, cid), isNull(schema.claimR9VotingSessions.supersededAt)));
    const liveRouting = () =>
      tx.select().from(schema.claimStateTrusteeDecisions).where(
        and(eq(schema.claimStateTrusteeDecisions.claimCaseId, cid), eq(schema.claimStateTrusteeDecisions.phase, 'routing'), isNull(schema.claimStateTrusteeDecisions.supersededAt)),
      );
    expect(await liveSessions()).toHaveLength(1);
    expect(await liveRouting()).toHaveLength(1);

    expect((await flagAndFind(client, cid)).close).toEqual({ closed: true });
    expect(await stateOf(client, cid)).toBe('closed');
    expect(await liveSessions()).toEqual([]);
    expect(await liveRouting()).toEqual([]);
  });

  it('⭐ a live correction return is superseded and its open run is ended `decided` (⛔ no family text follows a closed claim)', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PID);
    const cid = await openHeldClaim(client, randomUUID());
    await returnToDistrictAdmin(client, { claimCaseId: cid, pariwarId: PID, reasonCode: 'other', rationaleCiphertext: 'enc:v1:n', actorId: PA, actorDisplay: 'Pariwar Admin', actor: 'trustee' });
    const mark = await writeCorrectionMark(client, {
      pariwarId: PID, claimCaseId: cid, mustAct: 'family', actorId: PA, actorDisplay: 'Pariwar Admin', setByRole: 'pariwar_admin', noteCiphertext: null, isReturnMark: true, hold: noCorrectionHold,
    });
    expect(mark.openedRun).not.toBeNull(); // the CONTROL: a run is open before the finding

    const liveReturns = () =>
      tx.select().from(schema.claimStateTrusteeDecisions).where(
        and(eq(schema.claimStateTrusteeDecisions.claimCaseId, cid), eq(schema.claimStateTrusteeDecisions.phase, 'correction_return'), isNull(schema.claimStateTrusteeDecisions.supersededAt)),
      );
    expect(await liveReturns()).toHaveLength(1);

    expect((await flagAndFind(client, cid)).close).toEqual({ closed: true });
    expect(await stateOf(client, cid)).toBe('closed');
    expect(await liveReturns()).toEqual([]);
    const runs = await tx.select().from(schema.claimCorrectionRuns).where(eq(schema.claimCorrectionRuns.claimCaseId, cid));
    expect(runs.map((r) => [r.endReason, r.endedAt !== null])).toEqual([['decided', true]]);
  });

  it('⭐ an un-finalized Stage-2 appeal panel (the claim at `appeal_stage_2`) is superseded', async () => {
    const { client, tx } = getTx();
    const panel = await seedAppealPanel(client, PID);
    const cid = await refusedClaim(client, PID, randomUUID(), { reason: 'other' });
    await openAppeal(client, PID, cid);
    await toStage2(client, PID, cid);
    await openAppealPanel(client, { claimCaseId: cid, pariwarId: PID, panelActorIds: panel, actorId: panel[0]!, actorDisplay: 'P1', actor: 'trustee' });
    expect(await stateOf(client, cid)).toBe('appeal_stage_2');

    const sessions = () => tx.select().from(schema.claimAppealPanelSessions).where(eq(schema.claimAppealPanelSessions.claimCaseId, cid));
    expect((await sessions()).map((s) => s.supersededAt)).toEqual([null]); // the CONTROL: one live, un-superseded session

    expect((await flagAndFind(client, cid)).close).toEqual({ closed: true });
    expect(await stateOf(client, cid)).toBe('closed');
    const after = await sessions();
    expect(after).toHaveLength(1);
    expect(after[0]!.supersededAt).not.toBeNull();
  });
});
