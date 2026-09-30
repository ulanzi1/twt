// The correction-return CHASE — live-DB integration (Story 6.19b; AC2, AC3, AC5, AC16, AC11b "runs", "the mark",
// "pause tiers", "send safety", "retries", "D30", "letters", "`-271`").
//
// Per-test ROLLBACK (`setupLiveDb`). ⚠ THE TRANSACTION-CLOCK SIMULATION (the return-loop spec's, and for the same
// reason): `now()` is the TRANSACTION's instant, so inside one BEGIN a return, a rewrite and a check share a stamp.
// In production they are separate requests. Where ORDER matters this file moves the stamps explicitly (the return's
// `decided_at` back, an account's `updated_at` forward) — reproducing the production fact the test is about.
// The races (two connections) live in `correction-chase-concurrency.spec.ts`, which commits.

import { randomUUID } from 'node:crypto';

import { and, eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import {
  CORRECTION_SEND_LEASE_MS,
  CorrectionDirectionRunRefusedError,
  CorrectionLetterRefusedError,
  CorrectionMarkNoLiveReturnError,
  CorrectionMarkNoteRequiredError,
  CorrectionMarkUnchangedError,
  beginCorrectionFamilySend,
  claimCorrectionReminder,
  endCorrectionRun,
  finaliseCorrectionReminder,
  insertFinalCorrectionReminder,
  noteCorrectionReminderTransient,
  openCorrectionRun,
  readCorrectionLetterAddress,
  readCorrectionRecipients,
  readCorrectionReminder,
  readFamilyPartDoneAt,
  recordCorrectionLetter,
  recordCorrectionLetterDelivery,
  resolveCorrectionChase,
  returnToDistrictAdmin,
  writeCorrectionMark,
  type CorrectionReminderKey,
} from '../../../src/claim/index.js';
import { istDateOf } from '../../../src/claim/correction-schedule.js';
import { claimId as toClaimId, memberId as toMemberId } from '../../../src/ids/index.js';
import type { ClaimId } from '../../../src/ids/index.js';
import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, driveClaimTo, enterAppScope, seedNomineeDeclaration, seedNomineeNameCheck } from '../_helpers.js';

type Client = ReturnType<typeof getTx>['client'];
type Tx = ReturnType<typeof getTx>['tx'];

const TRUSTEE = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1';
const DA = 'b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2';

const returnInput = (claimCaseId: ClaimId) => ({
  claimCaseId,
  pariwarId: PARIWAR_A,
  reasonCode: 'other' as const,
  rationaleCiphertext: 'enc:v1:the-holder-name-is-not-the-nominee',
  actorId: TRUSTEE,
  actorDisplay: 'Pariwar Admin One',
  actor: 'trustee' as const,
});

const mark = (claimCaseId: ClaimId, mustAct: 'family' | 'staff', extra: Record<string, unknown> = {}) => ({
  pariwarId: PARIWAR_A,
  claimCaseId,
  mustAct,
  actorId: DA,
  actorDisplay: 'District Admin One',
  setByRole: 'district_admin' as const,
  noteCiphertext: 'enc:v1:note',
  ...extra,
});

/** A claim at `verifier_approved` with accounts, a passing check, a determination and a contact record, RETURNED. */
async function returnedClaim(
  client: Client,
  opts: { readonly mustAct?: 'family' | 'staff' | null; readonly contact?: 'seed' | 'skip' } = {},
) {
  const cid = toClaimId(randomUUID());
  const mid = toMemberId(randomUUID());
  await driveClaimTo(client, PARIWAR_A, cid, mid, 'verifier_approved');
  await seedNomineeNameCheck(client, PARIWAR_A, cid, { contact: opts.contact ?? 'seed' });
  const ret = await returnToDistrictAdmin(client, returnInput(cid));
  let runId: string | null = null;
  if (opts.mustAct !== null) {
    const w = await writeCorrectionMark(client, {
      ...mark(cid, opts.mustAct ?? 'family'),
      actorId: TRUSTEE,
      actorDisplay: 'Pariwar Admin One',
      setByRole: 'pariwar_admin',
      noteCiphertext: null,
      isReturnMark: true,
    });
    runId = w.openedRun?.runId ?? null;
  }
  return { cid, mid, returnId: ret.decision.decisionId as string, returnedAt: ret.decision.decidedAt, runId };
}

async function runsOf(tx: Tx, cid: ClaimId) {
  return tx
    .select()
    .from(schema.claimCorrectionRuns)
    .where(and(eq(schema.claimCorrectionRuns.pariwarId, PARIWAR_A), eq(schema.claimCorrectionRuns.claimCaseId, cid)))
    .orderBy(schema.claimCorrectionRuns.openedAt);
}

/** As the superuser (RLS + grants bypassed), then back into the app scope — for the clock simulation only. */
async function asSuperuser(client: Client, fn: () => Promise<unknown>) {
  await client.query('RESET ROLE');
  await fn();
  await enterAppScope(client, PARIWAR_A);
}

async function backdateReturn(client: Client, returnId: string, ms: number) {
  await asSuperuser(client, () =>
    client.query(`UPDATE claim_state_trustee_decisions SET decided_at = decided_at - ($2 || ' milliseconds')::interval WHERE decision_id = $1`, [
      returnId,
      String(ms),
    ]),
  );
}

async function setAccountsUpdatedAt(tx: Tx, cid: ClaimId, at: Date) {
  await tx
    .update(schema.claimNomineeBankAccounts)
    .set({ updatedAt: at })
    .where(and(eq(schema.claimNomineeBankAccounts.pariwarId, PARIWAR_A), eq(schema.claimNomineeBankAccounts.claimCaseId, cid)));
}

describe.skipIf(!hasDatabase)('the correction chase — marks, runs, the resolver', { timeout: 20000 }, () => {
  setupLiveDb();

  it('⭐ a family-marked return opens a FAMILY run with day 0 = the return\'s IST date; a staff mark a STAFF run', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const fam = await returnedClaim(client, { mustAct: 'family' });
    const [run] = await runsOf(tx, fam.cid);
    expect(run).toMatchObject({ kind: 'family', day0: istDateOf(fam.returnedAt), endedAt: null, returnDecisionId: fam.returnId });
    const stf = await returnedClaim(client, { mustAct: 'staff' });
    expect((await runsOf(tx, stf.cid))[0]).toMatchObject({ kind: 'staff', endedAt: null });
  });

  it('⭐ family → staff → family opens a SECOND family run (`-266` §1 — the D2 collision is gone), one open at a time', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const { cid } = await returnedClaim(client, { mustAct: 'family' });
    const toStaff = await writeCorrectionMark(client, mark(cid, 'staff'));
    expect(toStaff).toMatchObject({ changed: true, endedRun: { kind: 'family', endReason: 'mark_changed' }, openedRun: { kind: 'staff' } });
    const backToFamily = await writeCorrectionMark(client, mark(cid, 'family'));
    expect(backToFamily.openedRun?.kind).toBe('family');
    const runs = await runsOf(tx, cid);
    expect(runs.map((r) => [r.kind, r.endReason])).toEqual([
      ['family', 'mark_changed'],
      ['staff', 'mark_changed'],
      ['family', null],
    ]);
    expect(runs.filter((r) => r.endedAt === null)).toHaveLength(1);
    // Two family runs of ONE return have DISTINCT ids — a slot-1 record of the second cannot collide with the first's.
    expect(runs[0]!.runId).not.toBe(runs[2]!.runId);
  });

  it('a SAME-VALUE row is recorded and leaves the run untouched (G2\'s keep); the District Admin route refuses it', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const { cid } = await returnedClaim(client, { mustAct: 'family' });
    const same = await writeCorrectionMark(client, mark(cid, 'family'));
    expect(same).toMatchObject({ changed: false, endedRun: null, openedRun: null });
    expect(await runsOf(tx, cid)).toHaveLength(1);
    await expect(writeCorrectionMark(client, mark(cid, 'family', { refuseUnchanged: true }))).rejects.toBeInstanceOf(
      CorrectionMarkUnchangedError,
    );
    const marks = await tx
      .select()
      .from(schema.claimCorrectionMarks)
      .where(eq(schema.claimCorrectionMarks.claimCaseId, cid));
    expect(marks).toHaveLength(2);
  });

  it('⛔ no live return ⇒ the mark is refused (409 must_act.no_live_return)', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const cid = toClaimId(randomUUID());
    await driveClaimTo(client, PARIWAR_A, cid, randomUUID(), 'verifier_approved');
    await expect(writeCorrectionMark(client, mark(cid, 'family'))).rejects.toBeInstanceOf(CorrectionMarkNoLiveReturnError);
  });

  it('⭐ the note is required on every row after the return\'s own (the app-level guard, backstopped by the DB CHECK)', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const { cid } = await returnedClaim(client, { mustAct: 'family' });
    await expect(writeCorrectionMark(client, mark(cid, 'staff', { noteCiphertext: null }))).rejects.toBeInstanceOf(
      CorrectionMarkNoteRequiredError,
    );
  });

  it('⭐ a Super Admin\'s mark records set_by_role super_admin (`-270`)', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const { cid } = await returnedClaim(client, { mustAct: 'family' });
    const w = await writeCorrectionMark(client, mark(cid, 'staff', { setByRole: 'super_admin' }));
    expect(w.mark.setByRole).toBe('super_admin');
  });

  it('⭐ an UNMARKED return opens ⛔ no run; the first mark (a District Admin change) opens one with day 0 = that day', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const { cid } = await returnedClaim(client, { mustAct: null });
    expect(await runsOf(tx, cid)).toHaveLength(0);
    const chase = await resolveCorrectionChase(tx, PARIWAR_A, cid);
    expect(chase.mark).toBeNull();
    const now = new Date('2026-11-05T12:00:00.000Z');
    const w = await writeCorrectionMark(client, mark(cid, 'family', { now }));
    expect(w.openedRun).toMatchObject({ kind: 'family', day0: '2026-11-05' });
  });

  it('⭐ a switch to family AFTER day 90 (⛔ no open run) gives the family a full 90 days from that day (`-258` 1)', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const { cid, runId } = await returnedClaim(client, { mustAct: 'staff' });
    await endCorrectionRun(client, { pariwarId: PARIWAR_A, claimCaseId: cid, runId: runId!, reason: 'day_90' });
    const w = await writeCorrectionMark(client, mark(cid, 'family', { now: new Date('2027-02-01T06:00:00.000Z') }));
    expect(w.openedRun).toMatchObject({ kind: 'family', day0: '2027-02-01' });
    expect((await runsOf(tx, cid)).filter((r) => r.endedAt === null)).toHaveLength(1);
  });

  it('⭐ a direction run is REFUSED while the mark is staff; allowed while family (ends the family run, superseded)', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const staffCase = await returnedClaim(client, { mustAct: 'staff' });
    await expect(
      openCorrectionRun(client, {
        pariwarId: PARIWAR_A,
        claimCaseId: staffCase.cid,
        returnDecisionId: staffCase.returnId,
        kind: 'direction',
        anchorId: randomUUID(),
        day0: '2026-11-01',
      }),
    ).rejects.toBeInstanceOf(CorrectionDirectionRunRefusedError);

    const famCase = await returnedClaim(client, { mustAct: 'family' });
    const dir = await openCorrectionRun(client, {
      pariwarId: PARIWAR_A,
      claimCaseId: famCase.cid,
      returnDecisionId: famCase.returnId,
      kind: 'direction',
      anchorId: randomUUID(),
      day0: '2026-11-01',
    });
    const runs = await runsOf(tx, famCase.cid);
    expect(runs.map((r) => [r.kind, r.endReason])).toEqual([
      ['family', 'superseded'],
      ['direction', null],
    ]);
    expect(dir.kind).toBe('direction');
  });

  it('⭐ `-271` §2 / `-269` §3 — during a HOLD a switch to staff ends a direction run and opens ⛔ no staff run; a switch to family opens ⛔ none', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const { cid, returnId } = await returnedClaim(client, { mustAct: 'family' });
    await openCorrectionRun(client, {
      pariwarId: PARIWAR_A,
      claimCaseId: cid,
      returnDecisionId: returnId,
      kind: 'direction',
      anchorId: randomUUID(),
      day0: '2026-11-01',
    });
    const held = () => Promise.resolve(true);
    const toStaff = await writeCorrectionMark(client, mark(cid, 'staff', { hold: held }));
    expect(toStaff).toMatchObject({ changed: true, openedRun: null, endedRun: { kind: 'direction', endReason: 'mark_changed' } });
    const toFamily = await writeCorrectionMark(client, mark(cid, 'family', { hold: held }));
    expect(toFamily.openedRun).toBeNull();
    expect((await runsOf(tx, cid)).filter((r) => r.endedAt === null)).toHaveLength(0);
  });

  it('⭐ a second return after resubmission supersedes the old run and leaves ONE open run (`-267` §1)', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const first = await returnedClaim(client, { mustAct: 'family' });
    // Resubmit: the family rewrites (a later stamp — the clock simulation) and the District Admin re-checks.
    await setAccountsUpdatedAt(tx, first.cid, new Date(Date.now() + 60_000));
    await seedNomineeNameCheck(client, PARIWAR_A, first.cid, { reuseAccounts: true });
    const second = await returnToDistrictAdmin(client, returnInput(first.cid));
    await writeCorrectionMark(client, {
      ...mark(first.cid, 'staff'),
      noteCiphertext: null,
      isReturnMark: true,
      setByRole: 'pariwar_admin',
    });
    const runs = await runsOf(tx, first.cid);
    expect(runs.map((r) => [r.kind, r.endReason, r.returnDecisionId])).toEqual([
      ['family', 'superseded', first.returnId],
      ['staff', null, second.decision.decisionId],
    ]);
  });

  it('⭐ end-run records `decided`, and is a NO-OP on an ended run', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const { cid, runId } = await returnedClaim(client, { mustAct: 'family' });
    expect(await endCorrectionRun(client, { pariwarId: PARIWAR_A, claimCaseId: cid, runId: runId!, reason: 'decided' })).toBe(true);
    expect(await endCorrectionRun(client, { pariwarId: PARIWAR_A, claimCaseId: cid, runId: runId!, reason: 'day_90' })).toBe(false);
    expect((await runsOf(tx, cid))[0]!.endReason).toBe('decided');
  });

  it('⭐ the resolver returns an ENDED day-90 run (`-267` §2) — the latest family and the latest staff run, open or ended', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const { cid, runId, returnId } = await returnedClaim(client, { mustAct: 'family' });
    await endCorrectionRun(client, { pariwarId: PARIWAR_A, claimCaseId: cid, runId: runId!, reason: 'day_90' });
    const chase = await resolveCorrectionChase(tx, PARIWAR_A, cid);
    expect(chase.liveReturn?.decisionId).toBe(returnId);
    expect(chase.mark?.mustAct).toBe('family');
    expect(chase.familyRun).toMatchObject({ runId, endReason: 'day_90' });
    expect(chase.staffRun).toBeNull();
    expect(chase.openRun).toBeNull();
    expect(chase.currentNumberHashes).toBeNull();
  });
});

describe.skipIf(!hasDatabase)('the correction chase — "the family\'s part is done" and the pause tiers', { timeout: 20000 }, () => {
  setupLiveDb();

  it('⭐ `-268` / `-269` §1 — rewrite ⇒ done (⛔ no check yet); a later mismatch ⇒ ⛔ not done; the next rewrite ⇒ done again', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const { cid, returnId, returnedAt } = await returnedClaim(client, { mustAct: 'family' });
    await backdateReturn(client, returnId, 2 * 3_600_000);
    const decidedAt = new Date(returnedAt.getTime() - 2 * 3_600_000);
    // The accounts as they stood BEFORE the return (they were seeded at the tx instant, now after the back-dated return).
    await setAccountsUpdatedAt(tx, cid, new Date(decidedAt.getTime() - 3_600_000));
    expect(await readFamilyPartDoneAt(tx, PARIWAR_A, cid, decidedAt)).toBeNull(); // ⛔ not rewritten yet

    // The family rewrites an hour after the return (the checks recorded so far all sit at the tx instant, i.e. the
    // latest check "after the rewrite" is the earlier PASSING one ⇒ ⛔ not a mismatch).
    const rewrite1 = new Date(returnedAt.getTime() - 3_600_000);
    await setAccountsUpdatedAt(tx, cid, rewrite1);
    expect((await readFamilyPartDoneAt(tx, PARIWAR_A, cid, decidedAt))?.getTime()).toBe(rewrite1.getTime());

    // Staff record a MISMATCH after the rewrite ⇒ the family's part is ⛔ not done.
    await seedNomineeNameCheck(client, PARIWAR_A, cid, { reuseAccounts: true, verdicts: ['matches', 'does_not_match'] });
    expect(await readFamilyPartDoneAt(tx, PARIWAR_A, cid, decidedAt)).toBeNull();

    // The family's NEXT rewrite makes it true again.
    const rewrite2 = new Date(Date.now() + 60_000);
    await setAccountsUpdatedAt(tx, cid, rewrite2);
    expect((await readFamilyPartDoneAt(tx, PARIWAR_A, cid, decidedAt))?.getTime()).toBe(rewrite2.getTime());
    expect((await resolveCorrectionChase(tx, PARIWAR_A, cid)).familyPartDoneAt?.getTime()).toBe(rewrite2.getTime());
  });

  it('⭐ the child\'s re-check: tier (b) (the family\'s part done, ⛔ not resubmitted) SKIPS the family send, ⛔ no throw', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const { cid, runId } = await returnedClaim(client, { mustAct: 'family' });
    await setAccountsUpdatedAt(tx, cid, new Date(Date.now() + 60_000)); // rewritten, ⛔ no check since
    const person = (await readCorrectionRecipients(tx, PARIWAR_A, cid)).people[0]!;
    const res = await beginCorrectionFamilySend(client, {
      pariwarId: PARIWAR_A,
      claimCaseId: cid,
      runId: runId!,
      slotDay: 1,
      personKey: person.personKey,
      sentOn: '2026-11-02',
      late: false,
      jobId: 'job-1',
      now: new Date(),
    });
    expect(res).toEqual({ kind: 'skipped', reason: 'family_part_done' });
  });

  it('⭐ tier (a): once RESUBMITTED (rewrite + a current passing check) the family send is skipped `resubmitted`', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const { cid, runId } = await returnedClaim(client, { mustAct: 'family' });
    await setAccountsUpdatedAt(tx, cid, new Date(Date.now() + 60_000));
    await seedNomineeNameCheck(client, PARIWAR_A, cid, { reuseAccounts: true });
    const person = (await readCorrectionRecipients(tx, PARIWAR_A, cid)).people[0]!;
    const res = await beginCorrectionFamilySend(client, {
      pariwarId: PARIWAR_A,
      claimCaseId: cid,
      runId: runId!,
      slotDay: 1,
      personKey: person.personKey,
      sentOn: '2026-11-02',
      late: false,
      jobId: 'job-1',
      now: new Date(),
    });
    expect(res).toEqual({ kind: 'skipped', reason: 'resubmitted' });
  });
});

describe.skipIf(!hasDatabase)('the correction chase — the send claim (AC2 send safety, retries)', { timeout: 20000 }, () => {
  setupLiveDb();

  async function familyCase(client: Client, tx: Tx) {
    const c = await returnedClaim(client, { mustAct: 'family' });
    const person = (await readCorrectionRecipients(tx, PARIWAR_A, c.cid)).people[0]!;
    return { ...c, person };
  }

  const begin = (client: Client, c: { cid: ClaimId; runId: string | null; person: { personKey: string } }, jobId: string, now = new Date()) =>
    beginCorrectionFamilySend(client, {
      pariwarId: PARIWAR_A,
      claimCaseId: c.cid,
      runId: c.runId!,
      slotDay: 1,
      personKey: c.person.personKey,
      sentOn: istDateOf(now),
      late: false,
      jobId,
      now,
    });

  it('⭐ a claim, then a finalise (CAS), and ⛔ never `delivered_at` for an accepted send', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const c = await familyCase(client, tx);
    const res = await begin(client, c, 'job-1');
    expect(res.kind).toBe('send');
    if (res.kind !== 'send') return;
    expect(res.contactLocale).toBe('hi');
    expect(
      await finaliseCorrectionReminder(tx, {
        pariwarId: PARIWAR_A,
        reminderId: res.reminderId,
        jobId: 'job-1',
        outcome: 'accepted',
        providerMessageId: 'gw-1',
        recipientVersionId: c.person.versionId,
        recipientNumberHash: 'hash-A',
      }),
    ).toBe(true);
    const row = await readCorrectionReminder(tx, {
      pariwarId: PARIWAR_A, claimCaseId: c.cid, runId: c.runId!, slotDay: 1, recipientKey: c.person.personKey, purpose: 'family_sms', subjectKey: '',
    });
    expect(row).toMatchObject({ outcome: 'accepted', providerMessageId: 'gw-1', deliveredAt: null, attemptCount: 1 });
    // A second begin of the same slot is a no-op (already final); a second finalise is refused (CAS).
    expect(await begin(client, c, 'job-2')).toEqual({ kind: 'noop', reason: 'already_final' });
    expect(await finaliseCorrectionReminder(tx, { pariwarId: PARIWAR_A, reminderId: res.reminderId, jobId: 'job-1', outcome: 'error' })).toBe(false);
  });

  it('⭐ a transient failure then a retry of the SAME job ⇒ re-claimed AT ONCE (attempt_count 2, first_detail kept) — ⛔ never a second row', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const c = await familyCase(client, tx);
    const first = await begin(client, c, 'job-1');
    if (first.kind !== 'send') throw new Error('expected a send');
    await noteCorrectionReminderTransient(tx, { pariwarId: PARIWAR_A, reminderId: first.reminderId, jobId: 'job-1', detail: 'api_unavailable:HTTP_503' });
    const retry = await begin(client, c, 'job-1', new Date(Date.now() + 60_000));
    expect(retry).toMatchObject({ kind: 'send', reminderId: first.reminderId, attemptCount: 2 });
    const rows = await tx.select().from(schema.claimCorrectionReminders).where(eq(schema.claimCorrectionReminders.claimCaseId, c.cid));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ firstDetail: 'api_unavailable:HTTP_503', attemptCount: 2 });
  });

  it('⭐ a row held by a DIFFERENT job is re-claimed only once its lease expires; a younger one is left alone', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const c = await familyCase(client, tx);
    const t0 = new Date();
    const held = await begin(client, c, 'job-1', t0);
    expect(held.kind).toBe('send');
    expect(await begin(client, c, 'job-2', new Date(t0.getTime() + CORRECTION_SEND_LEASE_MS - 1_000))).toEqual({ kind: 'noop', reason: 'held_by_other' });
    const taken = await begin(client, c, 'job-2', new Date(t0.getTime() + CORRECTION_SEND_LEASE_MS + 1_000));
    expect(taken).toMatchObject({ kind: 'send', attemptCount: 2 });
  });

  it('⭐ a switch to staff between enqueue and send ⇒ ⛔ no send: the re-check writes skipped_superseded, ⛔ no throw', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const c = await familyCase(client, tx);
    await writeCorrectionMark(client, mark(c.cid, 'staff'));
    expect(await begin(client, c, 'job-1')).toEqual({ kind: 'skipped', reason: 'run_ended' });
    const row = await readCorrectionReminder(tx, {
      pariwarId: PARIWAR_A, claimCaseId: c.cid, runId: c.runId!, slotDay: 1, recipientKey: c.person.personKey, purpose: 'family_sms', subjectKey: '',
    });
    expect(row).toMatchObject({ outcome: 'skipped_superseded', detail: 'run_ended' });
  });

  it('⭐ a re-check that FAILS on a retry compare-and-sets the job\'s OWN attempting row to skipped_superseded (⛔ no false error)', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const c = await familyCase(client, tx);
    const first = await begin(client, c, 'job-1');
    expect(first.kind).toBe('send');
    await writeCorrectionMark(client, mark(c.cid, 'staff'));
    expect(await begin(client, c, 'job-1')).toEqual({ kind: 'skipped', reason: 'run_ended' });
    const rows = await tx.select().from(schema.claimCorrectionReminders).where(eq(schema.claimCorrectionReminders.claimCaseId, c.cid));
    expect(rows.map((r) => r.outcome)).toEqual(['skipped_superseded']);
  });

  it('D30 — ⛔ no contact record ⇒ nobody is reminded, and the child skips with the reason', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const c = await returnedClaim(client, { mustAct: 'family', contact: 'skip' });
    const recipients = await readCorrectionRecipients(tx, PARIWAR_A, c.cid);
    expect(recipients).toMatchObject({ cannotRemind: 'no_contact_record', people: [] });
    const res = await beginCorrectionFamilySend(client, {
      pariwarId: PARIWAR_A, claimCaseId: c.cid, runId: c.runId!, slotDay: 1, personKey: 'claimant', sentOn: '2026-11-02', late: false, jobId: 'j', now: new Date(),
    });
    expect(res).toEqual({ kind: 'skipped', reason: 'no_contact_record' });
  });

  it('D30 — an agreement ⛔ not live ⇒ agreement_not_live; the staff rows are unaffected (a staff row inserts)', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const c = await returnedClaim(client, { mustAct: 'family' });
    const contact = await tx.select().from(schema.claimContacts).where(eq(schema.claimContacts.claimCaseId, c.cid));
    await tx
      .update(schema.consentRecords)
      .set({ revokedAt: new Date() })
      .where(eq(schema.consentRecords.consentId, contact[0]!.agreementConsentId));
    expect((await readCorrectionRecipients(tx, PARIWAR_A, c.cid)).cannotRemind).toBe('agreement_not_live');
    const staffKey: CorrectionReminderKey = {
      pariwarId: PARIWAR_A, claimCaseId: c.cid, runId: c.runId!, slotDay: 1, recipientKey: `staff:${DA}`, purpose: 'staff_reminder', subjectKey: '',
    };
    expect(await insertFinalCorrectionReminder(tx, { ...staffKey, sentOn: '2026-11-02', outcome: 'recorded' })).toBe(true);
    expect(await insertFinalCorrectionReminder(tx, { ...staffKey, sentOn: '2026-11-02', outcome: 'recorded' })).toBe(false);
  });

  it('⭐ D34 — ONE scheduled District Admin reminder per claim per IST day, whichever run it was keyed on', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const c = await returnedClaim(client, { mustAct: 'family' });
    const other = await writeCorrectionMark(client, mark(c.cid, 'staff'));
    const base = { pariwarId: PARIWAR_A, claimCaseId: c.cid, recipientKey: `staff:${DA}`, purpose: 'staff_reminder' as const, subjectKey: '', sentOn: '2026-11-02', outcome: 'recorded' as const };
    expect(await insertFinalCorrectionReminder(tx, { ...base, runId: c.runId!, slotDay: 1 })).toBe(true);
    expect(await insertFinalCorrectionReminder(tx, { ...base, runId: other.openedRun!.runId, slotDay: 1 })).toBe(false);
  });

  it('⭐ `-267` §4 — two people\'s letter chases for one District Admin on one day BOTH record (subject_key)', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const c = await returnedClaim(client, { mustAct: 'family' });
    const base = { pariwarId: PARIWAR_A, claimCaseId: c.cid, runId: c.runId!, slotDay: 9, recipientKey: `staff:${DA}`, purpose: 'letter_chase' as const, sentOn: '2026-11-10', outcome: 'recorded' as const };
    expect(await insertFinalCorrectionReminder(tx, { ...base, subjectKey: 'nominee:a' })).toBe(true);
    expect(await insertFinalCorrectionReminder(tx, { ...base, subjectKey: 'claimant' })).toBe(true);
  });

  it('the lease constant is longer than any single attempt (10 minutes)', () => {
    expect(CORRECTION_SEND_LEASE_MS).toBe(600_000);
  });

  it('claimCorrectionReminder on a staff push: a second push for the same user, claim and day ⇒ already_final (the partial UNIQUE)', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const c = await returnedClaim(client, { mustAct: 'family' });
    const other = await writeCorrectionMark(client, mark(c.cid, 'staff'));
    const k = { pariwarId: PARIWAR_A, claimCaseId: c.cid, recipientKey: `staff:${DA}`, purpose: 'staff_push' as const, subjectKey: '', sentOn: '2026-11-02', late: false, now: new Date() };
    expect((await claimCorrectionReminder(tx, { ...k, runId: c.runId!, slotDay: 1, jobId: 'p1' })).status).toBe('claimed');
    expect((await claimCorrectionReminder(tx, { ...k, runId: other.openedRun!.runId, slotDay: 0, jobId: 'p2' })).status).toBe('already_final');
  });
});

describe.skipIf(!hasDatabase)('the correction chase — letters (AC5, D31)', { timeout: 20000 }, () => {
  setupLiveDb();

  async function deadNominee(client: Client, tx: Tx, outcome: 'rejected_invalid_number' | 'no_target' = 'rejected_invalid_number') {
    const c = await returnedClaim(client, { mustAct: 'family' });
    const person = (await readCorrectionRecipients(tx, PARIWAR_A, c.cid)).people[0]!;
    const k: CorrectionReminderKey = {
      pariwarId: PARIWAR_A, claimCaseId: c.cid, runId: c.runId!, slotDay: 1, recipientKey: person.personKey, purpose: 'family_sms', subjectKey: '',
    };
    const claimed = await claimCorrectionReminder(tx, { ...k, sentOn: '2026-11-02', late: false, jobId: 'j', now: new Date() });
    if (claimed.status !== 'claimed') throw new Error('claim');
    await finaliseCorrectionReminder(tx, { pariwarId: PARIWAR_A, reminderId: claimed.reminderId, jobId: 'j', outcome, recipientNumberHash: outcome === 'no_target' ? null : 'h' });
    return { ...c, person };
  }

  const letterInput = (cid: ClaimId, personKey: string, postedOn = '2026-11-03') => ({
    pariwarId: PARIWAR_A,
    claimCaseId: cid,
    personKey,
    postedOn,
    trackingNumberCiphertext: 'enc:v1:tracking',
    actorId: DA,
    actorDisplay: 'District Admin One',
  });

  it('⛔ not letter-eligible (only accepted, or ⛔ no row) ⇒ 409 not_letter_eligible', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const c = await returnedClaim(client, { mustAct: 'family' });
    const person = (await readCorrectionRecipients(tx, PARIWAR_A, c.cid)).people[0]!;
    await expect(recordCorrectionLetter(client, letterInput(c.cid, person.personKey))).rejects.toMatchObject({ refusal: 'not_letter_eligible' });
  });

  it('⭐ eligible from `rejected_invalid_number` and from `no_target`; at most TWO per person per run (a third ⇒ limit_reached)', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    for (const outcome of ['rejected_invalid_number', 'no_target'] as const) {
      const c = await deadNominee(client, tx, outcome);
      const l1 = await recordCorrectionLetter(client, letterInput(c.cid, c.person.personKey));
      expect(l1.sequence).toBe(1);
      expect((await recordCorrectionLetter(client, letterInput(c.cid, c.person.personKey))).sequence).toBe(2);
      await expect(recordCorrectionLetter(client, letterInput(c.cid, c.person.personKey))).rejects.toMatchObject({ refusal: 'limit_reached' });
    }
  });

  it('⭐ D31 — ⛔ no address row for that person ⇒ address_missing; the agreement ⛔ live ⇒ agreement_not_live', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const c = await deadNominee(client, tx);
    await asSuperuser(client, () => client.query('DELETE FROM claim_contact_nominees WHERE claim_case_id = $1', [c.cid]));
    await expect(recordCorrectionLetter(client, letterInput(c.cid, c.person.personKey))).rejects.toMatchObject({ refusal: 'address_missing' });

    const d = await deadNominee(client, tx);
    const contact = await tx.select().from(schema.claimContacts).where(eq(schema.claimContacts.claimCaseId, d.cid));
    // The agreement is withdrawn AFTER the found-dead day — the letter's own check still refuses.
    await tx.update(schema.consentRecords).set({ revokedAt: new Date() }).where(eq(schema.consentRecords.consentId, contact[0]!.agreementConsentId));
    await expect(recordCorrectionLetter(client, letterInput(d.cid, d.person.personKey))).rejects.toBeInstanceOf(CorrectionLetterRefusedError);
  });

  it('⭐ the nominee\'s letter address is THEIR contact row (⛔ never member_nominee_versions.address_ciphertext)', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const c = await deadNominee(client, tx);
    const row = await tx.select().from(schema.claimContactNominees).where(eq(schema.claimContactNominees.claimCaseId, c.cid));
    const addr = await readCorrectionLetterAddress(tx, PARIWAR_A, c.cid, c.person.personKey);
    expect(addr.addressCiphertext).toBe(row[0]!.addressCiphertext);
  });

  it('⭐ a delivery LATER than 14 days is ACCEPTED (⛔ never refused); one before posting is refused; a second delivery is refused', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const c = await deadNominee(client, tx);
    const l = await recordCorrectionLetter(client, letterInput(c.cid, c.person.personKey, '2026-11-03'));
    const deliver = (deliveredOn: string) =>
      recordCorrectionLetterDelivery(client, {
        pariwarId: PARIWAR_A,
        claimCaseId: c.cid,
        letterId: l.letterId,
        deliveredOn,
        screenshotStorageKey: `claims/${c.cid}/correction-letter/${l.letterId}`,
        screenshotContentType: 'image/png',
        screenshotSizeBytes: 1234,
        actorId: DA,
        actorDisplay: 'District Admin One',
      });
    await expect(deliver('2026-11-01')).rejects.toMatchObject({ refusal: 'delivered_before_posted' });
    const late = await deliver('2026-12-15');
    expect(late.deliveredOn).toBe('2026-12-15');
    await expect(deliver('2026-12-16')).rejects.toMatchObject({ refusal: 'already_delivered' });
  });

  it('⭐ a letter stays recordable after its run ENDED (`-250` #4)', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const c = await deadNominee(client, tx);
    await endCorrectionRun(client, { pariwarId: PARIWAR_A, claimCaseId: c.cid, runId: c.runId!, reason: 'day_90' });
    const l = await recordCorrectionLetter(client, letterInput(c.cid, c.person.personKey));
    expect(l.runId).toBe(c.runId);
  });

  it('⭐ the CLAIMANT\'s letter reads the claimant block\'s own address (`-267` §5b)', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const c = await returnedClaim(client, { mustAct: 'family' });
    // Make the claimant a person who is NONE of the nominees — the block side.
    await tx
      .update(schema.claimContacts)
      .set({
        claimantNomineeVersionId: null,
        claimantNameCiphertext: 'enc:v1:claimant-name',
        claimantMobileCiphertext: 'enc:v1:claimant-mobile',
        claimantAddressCiphertext: 'enc:v1:claimant-address',
      })
      .where(eq(schema.claimContacts.claimCaseId, c.cid));
    const people = (await readCorrectionRecipients(tx, PARIWAR_A, c.cid)).people;
    expect(people.map((p) => p.personKey)).toContain('claimant');
    expect((await readCorrectionLetterAddress(tx, PARIWAR_A, c.cid, 'claimant')).addressCiphertext).toBe('enc:v1:claimant-address');
  });

  it('⭐ `-267` §5c — a claimant linked to a version that is ⛔ no effective nominee flags the claimant ALONE; the nominees stay', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const c = await returnedClaim(client, { mustAct: 'family' });
    // Point the claimant at a version of ANOTHER member's declaration — it resolves to no effective nominee here.
    const [foreign] = await seedNomineeDeclaration(tx, PARIWAR_A, randomUUID());
    await tx
      .update(schema.claimContacts)
      .set({ claimantNomineeVersionId: foreign!.versionId })
      .where(eq(schema.claimContacts.claimCaseId, c.cid));
    const r = await readCorrectionRecipients(tx, PARIWAR_A, c.cid);
    expect(r.claimantUnresolved).toBe(true);
    expect(r.cannotRemind).toBeNull();
    expect(r.people.length).toBeGreaterThan(0);
  });
});
