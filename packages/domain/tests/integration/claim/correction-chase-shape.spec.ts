// The correction-queue CHASE SUMMARY — its SHAPE against adversarial decoys, live DB (:5433). Story 6.19b (AC8b,
// AC11b "a `*-shape.spec.ts` for the extended queue read model"; the AI-6-3 class, exemplar
// `nominee-declaration-shape.spec.ts`).
//
// ONE claim's summary is read while DECOYS sit beside it that a wrong join would pick up:
//   · a SECOND claim in the same Pariwar with its OWN chase — STAFF-marked by a District Admin's change (its family
//     run ended `mark_changed`), escalated, a dead nominee;
//   · the claim's OWN earlier, SUPERSEDED return — its run, its rows, its escalation (only the LIVE return counts);
//   · another PARIWAR's claim (tenant boundary).
// ⭐ The timeline is the PRODUCTION one (the transaction-clock simulation — see `correction-chase.spec.ts`): the first
// return, then the family's rewrite, then the District Admin's passing check, then the SECOND return — each strictly
// after the last, so the second return is genuinely un-rewritten and un-checked (⛔ a fixture that is already
// "resubmitted" would read a paused chase and prove nothing about the live one).
// ⭐ Every assertion names the claim's OWN ids — ⛔ never a count over a shared table, ⛔ never `every` over a list
// that may be empty. And the summary carries ⛔ no name, ⛔ no number, ⛔ no address.

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
import { addCalendarDays } from '../../../src/cycle-calendar/holiday-resolver.js';
import { claimId as toClaimId, memberId as toMemberId } from '../../../src/ids/index.js';
import type { ClaimId } from '../../../src/ids/index.js';
import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, driveClaimTo, enterAppScope, seedNomineeNameCheck } from '../_helpers.js';

type Client = ReturnType<typeof getTx>['client'];
type Tx = ReturnType<typeof getTx>['tx'];

const HOUR = 3_600_000;

/** Move a return's `decided_at` by `ms` as the superuser, then back into `pariwarId`'s app scope. */
async function shiftReturn(client: Client, pariwarId: typeof PARIWAR_A, returnId: string, ms: number) {
  await client.query('RESET ROLE');
  await client.query(`UPDATE claim_state_trustee_decisions SET decided_at = decided_at + ($2 || ' milliseconds')::interval WHERE decision_id = $1`, [
    returnId,
    String(ms),
  ]);
  await enterAppScope(client, pariwarId);
}

const returnMarkInput = (pariwarId: typeof PARIWAR_A, cid: ClaimId, mustAct: 'family' | 'staff', actorDisplay: string) => ({
  pariwarId, claimCaseId: cid, mustAct, actorId: randomUUID(), actorDisplay, setByRole: 'pariwar_admin' as const, noteCiphertext: null, isReturnMark: true,
});

/** A returned claim; `shiftMs` moves the return's `decided_at` BEFORE its mark is written (day 0 = the return's date). */
async function returned(client: Client, pariwarId: typeof PARIWAR_A, mustAct: 'family' | 'staff', opts: { readonly shiftMs?: number } = {}) {
  const cid = toClaimId(randomUUID());
  await enterAppScope(client, pariwarId);
  await driveClaimTo(client, pariwarId, cid, toMemberId(randomUUID()), 'verifier_approved');
  await seedNomineeNameCheck(client, pariwarId, cid);
  const ret = await returnToDistrictAdmin(client, {
    claimCaseId: cid, pariwarId, reasonCode: 'other', rationaleCiphertext: 'enc:v1:n', actorId: randomUUID(), actorDisplay: 'Pariwar Admin One', actor: 'trustee',
  });
  if (opts.shiftMs !== undefined) await shiftReturn(client, pariwarId, ret.decision.decisionId as string, opts.shiftMs);
  const w = await writeCorrectionMark(client, returnMarkInput(pariwarId, cid, mustAct, 'Pariwar Admin One'));
  return { cid, returnId: ret.decision.decisionId as string, runId: w.openedRun!.runId, day0: w.openedRun!.day0 };
}

async function deadRow(tx: Tx, pariwarId: typeof PARIWAR_A, cid: ClaimId, runId: string, day0: string) {
  const person = (await readCorrectionRecipients(tx, pariwarId, cid)).people[0]!;
  await insertFinalCorrectionReminder(tx, {
    pariwarId, claimCaseId: cid, runId, slotDay: 1, sentOn: addCalendarDays(day0, 1), recipientKey: person.personKey, purpose: 'family_sms', subjectKey: '', outcome: 'rejected_invalid_number',
  });
  return person.personKey;
}

describe.skipIf(!hasDatabase)('the correction chase summary — shape against decoys', { timeout: 20000 }, () => {
  setupLiveDb();

  it('⭐ reads ITS OWN claim\'s live return only: the mark, the run, the people, the flags — ⛔ never a decoy\'s', async () => {
    const { client, tx } = getTx();

    // Decoy 1 — another Pariwar's claim, staff-marked.
    await returned(client, PARIWAR_B, 'staff');

    // Decoy 2 — a sibling claim in the SAME Pariwar: a dead nominee on its family run, then a District Admin's change
    // to STAFF (the family run ends `mark_changed`, a staff run opens), and the staff run's day-12 escalation.
    const sibling = await returned(client, PARIWAR_A, 'family');
    const siblingDeadKey = await deadRow(tx, PARIWAR_A, sibling.cid, sibling.runId, sibling.day0);
    const toStaff = await writeCorrectionMark(client, {
      pariwarId: PARIWAR_A, claimCaseId: sibling.cid, mustAct: 'staff', actorId: randomUUID(), actorDisplay: 'District Admin One', setByRole: 'district_admin', noteCiphertext: 'enc:v1:change',
    });
    expect(toStaff).toMatchObject({ endedRun: { runId: sibling.runId, endReason: 'mark_changed' }, openedRun: { kind: 'staff' } });
    await insertFinalCorrectionReminder(tx, {
      pariwarId: PARIWAR_A, claimCaseId: sibling.cid, runId: toStaff.openedRun!.runId, slotDay: 12, sentOn: addCalendarDays(toStaff.openedRun!.day0, 12), recipientKey: 'staff:x', purpose: 'escalation', subjectKey: '', outcome: 'recorded',
    });

    // The claim under test. (1) A FIRST return at T − 3 h (family), with a dead nominee and an escalation.
    const first = await returned(client, PARIWAR_A, 'family', { shiftMs: -3 * HOUR });
    await deadRow(tx, PARIWAR_A, first.cid, first.runId, first.day0);
    await insertFinalCorrectionReminder(tx, {
      pariwarId: PARIWAR_A, claimCaseId: first.cid, runId: first.runId, slotDay: 14, sentOn: addCalendarDays(first.day0, 14), recipientKey: 'staff:y', purpose: 'escalation', subjectKey: 'nominee:z', outcome: 'recorded',
    });
    // (2) The family's rewrite at T − 2 h. (3) The District Admin's passing check at T (after the rewrite) — the
    // first return is RESUBMITTED. (4) The SECOND return at T + 1 min (after the check) — un-rewritten, un-checked.
    const anchor = (await tx
      .select({ decidedAt: schema.claimStateTrusteeDecisions.decidedAt })
      .from(schema.claimStateTrusteeDecisions)
      .where(eq(schema.claimStateTrusteeDecisions.decisionId, first.returnId as never)))[0]!.decidedAt;
    const rewriteAt = new Date(anchor.getTime() + HOUR); // = T − 2 h
    await tx
      .update(schema.claimNomineeBankAccounts)
      .set({ updatedAt: rewriteAt })
      .where(and(eq(schema.claimNomineeBankAccounts.pariwarId, PARIWAR_A), eq(schema.claimNomineeBankAccounts.claimCaseId, first.cid)));
    await seedNomineeNameCheck(client, PARIWAR_A, first.cid, { reuseAccounts: true });
    const second = await returnToDistrictAdmin(client, {
      claimCaseId: first.cid, pariwarId: PARIWAR_A, reasonCode: 'other', rationaleCiphertext: 'enc:v1:n2', actorId: randomUUID(), actorDisplay: 'Pariwar Admin Two', actor: 'trustee',
    });
    await shiftReturn(client, PARIWAR_A, second.decision.decisionId as string, 60_000);
    const secondMark = await writeCorrectionMark(client, returnMarkInput(PARIWAR_A, first.cid, 'family', 'Pariwar Admin Two'));
    const secondRun = secondMark.openedRun!;
    expect(secondMark.endedRun).toMatchObject({ runId: first.runId, endReason: 'superseded' });

    const today = addCalendarDays(secondRun.day0, 3);
    const recipients = await readCorrectionRecipients(tx, PARIWAR_A, first.cid);
    const summary = await readCorrectionChaseSummary(tx, PARIWAR_A, first.cid, today);
    expect(summary.shortReference).toBe(claimShortReference(first.cid));
    expect(summary.returnDecisionId).toBe(second.decision.decisionId);
    expect(summary.mark).toMatchObject({ mustAct: 'family', setByActorDisplay: 'Pariwar Admin Two' });
    // The run is the SECOND return's — by its id, ⛔ the first return's (ended `superseded`).
    expect(summary.run).toMatchObject({
      runId: secondRun.runId, kind: 'family', day0: secondRun.day0, dayCount: 3, open: true, nextReminderOn: addCalendarDays(secondRun.day0, 4),
    });
    // ⛔ The first return's dead nominee and its escalation belong to a SUPERSEDED return — ⛔ not this chase; and the
    // rewrite predates the second return ⇒ ⛔ "awaiting your check".
    expect(summary.escalated).toBe(false);
    expect(summary.awaitingCheck).toBe(false);
    // EXACTLY the claim's own people, by key — ⛔ `every` over a list that could be empty.
    expect(recipients.people).toHaveLength(1);
    expect(summary.people).toHaveLength(1);
    expect(summary.people.map((p) => [p.personKey, p.role, p.rank])).toEqual(recipients.people.map((p) => [p.personKey, p.role, p.rank]));
    expect(summary.people[0]).toMatchObject({ status: 'not_yet', foundDeadOn: null, remindersAccepted: 0, letters: [] });
    // ⛔ No name, ⛔ no number, ⛔ no address anywhere in it.
    expect(JSON.stringify(summary)).not.toMatch(/enc:v1|nominee-name|nominee-mobile|address/);

    // …and the SIBLING reads its OWN state — staff-marked, its staff run open, escalated, the dead nominee of its
    // (ended) family run — the two never bleed.
    const sib = await readCorrectionChaseSummary(tx, PARIWAR_A, sibling.cid, today);
    expect(sib.mark?.mustAct).toBe('staff');
    expect(sib.run).toMatchObject({ runId: toStaff.openedRun!.runId, kind: 'staff', open: true });
    expect(sib.escalated).toBe(true);
    expect(sib.people.map((p) => [p.personKey, p.status])).toEqual([[siblingDeadKey, 'dead']]);
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
