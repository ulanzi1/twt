// The correction-queue CHASE SUMMARY — its SHAPE against adversarial decoys, live DB (:5433). Story 6.19b (AC8b,
// AC11b "a `*-shape.spec.ts` for the extended queue read model"; the AI-6-3 class, exemplar
// `nominee-declaration-shape.spec.ts`).
//
// ONE claim's summary is read while DECOYS sit beside it that a wrong join would pick up:
//   · a SECOND claim in the same Pariwar with its OWN chase (a staff mark, an escalation, a dead nominee);
//   · the claim's OWN earlier, SUPERSEDED return — its run, its rows, its escalation (only the LIVE return counts);
//   · another PARIWAR's claim (tenant boundary).
// ⭐ Every assertion names the claim's OWN ids — ⛔ never a count over a shared table. And the summary carries ⛔ no
// name, ⛔ no number, ⛔ no address.

import { randomUUID } from 'node:crypto';

import { and, eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import {
  claimShortReference,
  insertFinalCorrectionReminder,
  readCorrectionChaseSummary,
  readCorrectionRecipients,
  returnToDistrictAdmin,
  writeCorrectionMark,
} from '../../../src/claim/index.js';
import { claimId as toClaimId, memberId as toMemberId } from '../../../src/ids/index.js';
import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, driveClaimTo, enterAppScope, seedNomineeNameCheck } from '../_helpers.js';

type Client = ReturnType<typeof getTx>['client'];
type Tx = ReturnType<typeof getTx>['tx'];

async function returned(client: Client, pariwarId: typeof PARIWAR_A, mustAct: 'family' | 'staff') {
  const cid = toClaimId(randomUUID());
  await enterAppScope(client, pariwarId);
  await driveClaimTo(client, pariwarId, cid, toMemberId(randomUUID()), 'verifier_approved');
  await seedNomineeNameCheck(client, pariwarId, cid);
  const ret = await returnToDistrictAdmin(client, {
    claimCaseId: cid, pariwarId, reasonCode: 'other', rationaleCiphertext: 'enc:v1:n', actorId: randomUUID(), actorDisplay: 'Pariwar Admin One', actor: 'trustee',
  });
  const w = await writeCorrectionMark(client, {
    pariwarId, claimCaseId: cid, mustAct, actorId: randomUUID(), actorDisplay: 'Pariwar Admin One', setByRole: 'pariwar_admin', noteCiphertext: null, isReturnMark: true,
    now: new Date('2026-09-01T06:00:00.000Z'),
  });
  return { cid, returnId: ret.decision.decisionId as string, runId: w.openedRun!.runId };
}

async function deadRow(tx: Tx, pariwarId: typeof PARIWAR_A, cid: ReturnType<typeof toClaimId>, runId: string) {
  const person = (await readCorrectionRecipients(tx, pariwarId, cid)).people[0]!;
  await insertFinalCorrectionReminder(tx, {
    pariwarId, claimCaseId: cid, runId, slotDay: 1, sentOn: '2026-09-02', recipientKey: person.personKey, purpose: 'family_sms', subjectKey: '', outcome: 'rejected_invalid_number',
  });
  return person.personKey;
}

describe.skipIf(!hasDatabase)('the correction chase summary — shape against decoys', { timeout: 20000 }, () => {
  setupLiveDb();

  it('⭐ reads ITS OWN claim\'s live return only: the mark, the run, the people, the flags — ⛔ never a decoy\'s', async () => {
    const { client, tx } = getTx();

    // Decoy 1 — another Pariwar's claim, staff-marked.
    await returned(client, PARIWAR_B, 'staff');

    // Decoy 2 — a sibling claim in the SAME Pariwar: staff-marked, escalated, a dead nominee.
    const sibling = await returned(client, PARIWAR_A, 'family');
    await deadRow(tx, PARIWAR_A, sibling.cid, sibling.runId);
    await insertFinalCorrectionReminder(tx, {
      pariwarId: PARIWAR_A, claimCaseId: sibling.cid, runId: sibling.runId, slotDay: 12, sentOn: '2026-09-13', recipientKey: 'staff:x', purpose: 'escalation', subjectKey: '', outcome: 'recorded',
    });

    // The claim under test — a FIRST return (escalated, a dead nominee), resubmitted, then a SECOND return (family).
    const first = await returned(client, PARIWAR_A, 'family');
    await deadRow(tx, PARIWAR_A, first.cid, first.runId);
    await insertFinalCorrectionReminder(tx, {
      pariwarId: PARIWAR_A, claimCaseId: first.cid, runId: first.runId, slotDay: 14, sentOn: '2026-09-15', recipientKey: 'staff:y', purpose: 'escalation', subjectKey: 'nominee:z', outcome: 'recorded',
    });
    await tx
      .update(schema.claimNomineeBankAccounts)
      .set({ updatedAt: new Date(Date.now() + 60_000) })
      .where(and(eq(schema.claimNomineeBankAccounts.pariwarId, PARIWAR_A), eq(schema.claimNomineeBankAccounts.claimCaseId, first.cid)));
    await seedNomineeNameCheck(client, PARIWAR_A, first.cid, { reuseAccounts: true });
    const second = await returnToDistrictAdmin(client, {
      claimCaseId: first.cid, pariwarId: PARIWAR_A, reasonCode: 'other', rationaleCiphertext: 'enc:v1:n2', actorId: randomUUID(), actorDisplay: 'Pariwar Admin Two', actor: 'trustee',
    });
    await writeCorrectionMark(client, {
      pariwarId: PARIWAR_A, claimCaseId: first.cid, mustAct: 'family', actorId: randomUUID(), actorDisplay: 'Pariwar Admin Two', setByRole: 'pariwar_admin', noteCiphertext: null, isReturnMark: true,
      now: new Date('2026-09-20T06:00:00.000Z'),
    });

    const summary = await readCorrectionChaseSummary(tx, PARIWAR_A, first.cid, '2026-09-23');
    expect(summary.shortReference).toBe(claimShortReference(first.cid));
    expect(summary.returnDecisionId).toBe(second.decision.decisionId);
    expect(summary.mark).toMatchObject({ mustAct: 'family', setByActorDisplay: 'Pariwar Admin Two' });
    // The run is the SECOND return's (day 0 = 2026-09-20), ⛔ the first's (2026-09-01).
    expect(summary.run).toMatchObject({ kind: 'family', day0: '2026-09-20', dayCount: 3, open: true, nextReminderOn: '2026-09-24' });
    // ⛔ The first return's dead nominee and its escalation belong to a SUPERSEDED return — ⛔ not this chase.
    expect(summary.escalated).toBe(false);
    expect(summary.people.every((p) => p.status === 'not_yet' && p.letters.length === 0)).toBe(true);
    // ⛔ No name, ⛔ no number, ⛔ no address anywhere in it.
    expect(JSON.stringify(summary)).not.toMatch(/enc:v1|nominee-name|nominee-mobile|address/);

    // …and the SIBLING reads its OWN state (escalated, a dead nominee) — the two never bleed.
    const sib = await readCorrectionChaseSummary(tx, PARIWAR_A, sibling.cid, '2026-09-23');
    expect(sib.escalated).toBe(true);
    expect(sib.people.map((p) => p.status)).toEqual(['dead']);
  });

  it('a claim with ⛔ no live return reads an EMPTY chase (the District Admin\'s own `does_not_match` half)', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const cid = toClaimId(randomUUID());
    await driveClaimTo(client, PARIWAR_A, cid, toMemberId(randomUUID()), 'verifier_approved');
    await seedNomineeNameCheck(client, PARIWAR_A, cid, { verdicts: ['matches', 'does_not_match'] });
    const s = await readCorrectionChaseSummary(tx, PARIWAR_A, cid, '2026-09-23');
    expect(s).toMatchObject({ returnDecisionId: null, mark: null, run: null, people: [], escalated: false, awaitingCheck: false });
  });
});
