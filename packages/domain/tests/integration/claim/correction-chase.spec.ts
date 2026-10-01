// The correction-return CHASE — live-DB integration (Story 6.19b; AC2, AC3, AC5, AC16, AC11b "runs", "the mark",
// "pause tiers", "send safety", "retries", "D30", "letters", "`-271`").
//
// Per-test ROLLBACK (`setupLiveDb`). ⚠ THE TRANSACTION-CLOCK SIMULATION (the return-loop spec's, and for the same
// reason): `now()` is the TRANSACTION's instant, so inside one BEGIN a return, a rewrite and a check share a stamp.
// In production they are separate requests. Where ORDER matters this file moves the stamps explicitly — the return's
// `decided_at` back, an account's `updated_at`, and (as the superuser, with the append-only trigger off for that one
// statement) a recorded check's `occurred_at` — reproducing the production fact the test is about.
// ⭐ `returnedClaim(…, { timeline: true })` is the one shape every ordering test starts from: the return is moved back
// BEFORE its mark (and so its run) is written — day 0 is then the return's IST date at ANY hour, ⛔ never a date the
// shift left behind — and the accounts and every check recorded so far sit BEFORE the return, so a rewrite placed after
// the return has ⛔ no check after it until the test records one.
// ⭐ The child's clock is the RUN's: `beginFamily` derives `now` (and so `sentOn`) from day 0 + the slot, 10:00 IST —
// ⛔ never the wall clock.
// The races (two connections) live in `correction-chase-concurrency.spec.ts`, which commits.

import { randomUUID } from 'node:crypto';

import { and, eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import {
  CORRECTION_SEND_LEASE_MS,
  CorrectionDirectionRunRefusedError,
  CorrectionMarkNoLiveReturnError,
  CorrectionMarkNoteRequiredError,
  CorrectionMarkUnchangedError,
  CorrectionNumberHashUnavailableError,
  CorrectionNumberUnverifiedError,
  assertCorrectionLetterAllowed,
  beginCorrectionFamilySend,
  claimCorrectionReminder,
  correctionCatchUp,
  correctionReminderSchedule,
  currentCorrectionNumberHash,
  decideNomineeCorrectionAsDistrictAdmin,
  decideNomineeCorrectionAsPariwarAdmin,
  endCorrectionRun,
  expireOwnCorrectionReminder,
  finaliseCorrectionReminder,
  hasLiveReturnRow,
  insertFinalCorrectionReminder,
  isPersonAtLetterCap,
  noteCorrectionReminderTransient,
  openCorrectionRun,
  projectClaimState,
  raiseNomineeCorrection,
  readCorrectionChaseSummary,
  readCorrectionClaimRow,
  readCorrectionLetterAddress,
  readCorrectionRecipients,
  readCorrectionReminder,
  readCorrectionRun,
  readFamilyPartDoneAt,
  readReturnFamilyLetters,
  readReturnPersonStates,
  recordCorrectionLetter,
  recordCorrectionLetterDelivery,
  resolveClaimCorrectionState,
  resolveCorrectionChase,
  returnToDistrictAdmin,
  voteOnFrozenClaim,
  writeCorrectionMark,
  type CorrectionReminderKey,
} from '../../../src/claim/index.js';
import { istDateOf } from '../../../src/claim/correction-schedule.js';
import { addCalendarDays } from '../../../src/cycle-calendar/holiday-resolver.js';
import { bindScopedDb } from '../../../src/db.js';
import {
  CLAIM_CONTACT_FIELD_CLASS,
  MEMBER_NOMINEE_FIELD_CLASS,
  createFakeKmsProvider,
  encryptTier1,
  serializeEnvelope,
  type FieldCryptoDeps,
} from '../../../src/encryption/index.js';
import { claimId as toClaimId, memberId as toMemberId } from '../../../src/ids/index.js';
import type { ClaimId, MemberId } from '../../../src/ids/index.js';
import { projectMemberState } from '../../../src/member/project.js';
import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import {
  PARIWAR_A,
  driveClaimTo,
  enterAppScope,
  seedNomineeDeclaration,
  seedNomineeDetermination,
  seedNomineeNameCheck,
} from '../_helpers.js';

type Client = ReturnType<typeof getTx>['client'];
type Tx = ReturnType<typeof getTx>['tx'];

const TRUSTEE = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1';
const DA = 'b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2';
const HOUR = 3_600_000;

// ⭐ REAL envelopes where a number is hashed (I4/I5): a fake KMS, the SAME deps the child hashes with.
const KMS = createFakeKmsProvider({ kekBytes: new Uint8Array(32).fill(7), hmacKeyBytes: new Uint8Array(32).fill(9) });
const ENC: FieldCryptoDeps = {
  kms: KMS,
  kekRef: { resourceName: 'fake:correction-chase-kek' },
  hmacKeyRef: { resourceName: 'fake:correction-chase-hmac' },
};

/**
 * A KMS that cannot DECRYPT (an outage — gRPC UNAVAILABLE); the HMAC still works. Drives a person's `hashFailed`
 * wherever their current number must be hashed (J1, the child's throw path) — ⛔ a real envelope, a real failure.
 */
const KMS_DOWN: FieldCryptoDeps = {
  ...ENC,
  kms: { ...KMS, decryptDek: () => Promise.reject(Object.assign(new Error('fake kms: unavailable'), { code: 14 })) },
};

async function encryptNomineeMobile(plaintext: string): Promise<string> {
  return serializeEnvelope(
    await encryptTier1(Buffer.from(plaintext, 'utf-8'), { pariwarId: PARIWAR_A, fieldClass: MEMBER_NOMINEE_FIELD_CLASS }, KMS, ENC.kekRef),
  );
}

/** The CLAIMANT block's mobile as a REAL envelope (its own `claim_contact` class) — a claimant's number is ALWAYS hashed. */
async function encryptClaimantMobile(plaintext: string): Promise<string> {
  return serializeEnvelope(
    await encryptTier1(Buffer.from(plaintext, 'utf-8'), { pariwarId: PARIWAR_A, fieldClass: CLAIM_CONTACT_FIELD_CLASS }, KMS, ENC.kekRef),
  );
}

/** 10:00 IST on an IST calendar date — the sweep's hour, far from either IST midnight. */
const tenAmIst = (date: string) => new Date(`${date}T04:30:00.000Z`);

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

const returnMark = (claimCaseId: ClaimId, mustAct: 'family' | 'staff', extra: Record<string, unknown> = {}) =>
  mark(claimCaseId, mustAct, {
    actorId: TRUSTEE,
    actorDisplay: 'Pariwar Admin One',
    setByRole: 'pariwar_admin',
    noteCiphertext: null,
    isReturnMark: true,
    ...extra,
  });

/** A claim at `verifier_approved` with accounts, a passing check, a determination and a contact record, RETURNED. */
async function returnedClaim(
  client: Client,
  opts: {
    readonly mustAct?: 'family' | 'staff' | null;
    readonly contact?: 'seed' | 'skip';
    /** The nominee's PLAINTEXT mobile — stored as a REAL envelope (the I4/I5 tests hash it). */
    readonly nomineeMobile?: string;
    /** The deceased is a member with a REAL event stream (signup) — a 6.20 correction's apply appends to it. */
    readonly projectedMember?: boolean;
    /**
     * ⭐ THE PRODUCTION TIMELINE (`backdateTimeline`), built BEFORE the mark is written: the return moves to T − 3 h
     * and the accounts + every check so far to T − 4 h, so the run's day 0 is the MOVED return's IST date.
     */
    readonly timeline?: boolean;
  } = {},
) {
  const { tx } = getTx();
  const cid = toClaimId(randomUUID());
  const mid = toMemberId(randomUUID());
  await driveClaimTo(client, PARIWAR_A, cid, mid, 'verifier_approved');
  if (opts.projectedMember === true) {
    await projectMemberState(client, {
      memberId: mid,
      pariwarId: PARIWAR_A,
      eventType: 'member.signup_initiated',
      payload: { from_state: null, to_state: 'pending-kyc', trigger: 'signup', actor: 'member' },
      actorId: mid,
    });
  }
  if (opts.nomineeMobile !== undefined || opts.projectedMember === true) {
    await seedNomineeDeclaration(tx, PARIWAR_A, mid, {
      nominees: [opts.nomineeMobile === undefined ? {} : { mobileCiphertext: await encryptNomineeMobile(opts.nomineeMobile) }],
      ensureMember: opts.projectedMember !== true,
    });
  }
  await seedNomineeNameCheck(client, PARIWAR_A, cid, { contact: opts.contact ?? 'seed' });
  const ret = await returnToDistrictAdmin(client, returnInput(cid));
  const returnId = ret.decision.decisionId as string;
  const returnedAt =
    opts.timeline === true ? await backdateTimeline(client, tx, cid, returnId, ret.decision.decidedAt) : ret.decision.decidedAt;
  let runId: string | null = null;
  let day0: string | null = null;
  if (opts.mustAct !== null) {
    const w = await writeCorrectionMark(client, returnMark(cid, opts.mustAct ?? 'family'));
    runId = w.openedRun?.runId ?? null;
    day0 = w.openedRun?.day0 ?? null;
    // ⭐ The fixture's own invariant (I8): the run starts on the return's IST date — the MOVED one when moved.
    if (day0 !== istDateOf(returnedAt)) throw new Error(`[returnedClaim] day 0 ${day0} ≠ the return's IST date ${istDateOf(returnedAt)}`);
  }
  // `rewriteAt` — an hour after the return (T − 2 h on the timeline): a rewrite with ⛔ no check after it yet.
  return { cid, mid, returnId, returnedAt, rewriteAt: new Date(returnedAt.getTime() + HOUR), runId, day0 };
}

async function runsOf(tx: Tx, cid: ClaimId) {
  return tx
    .select()
    .from(schema.claimCorrectionRuns)
    .where(and(eq(schema.claimCorrectionRuns.pariwarId, PARIWAR_A), eq(schema.claimCorrectionRuns.claimCaseId, cid)))
    .orderBy(schema.claimCorrectionRuns.openedAt);
}

/**
 * Run `fn`, then `restore` on EVERY path — ⛔ a later statement must never run in the state `fn` needed. When `fn`
 * threw, ITS error wins (on an aborted transaction the restore itself fails, and must ⛔ not mask the cause).
 */
async function withRestore<T>(fn: () => Promise<T>, restore: () => Promise<unknown>): Promise<T> {
  let out: T;
  try {
    out = await fn();
  } catch (err) {
    await restore().catch(() => undefined);
    throw err;
  }
  await restore();
  return out;
}

/** As the superuser (RLS + grants bypassed), then back into the app scope — for the clock simulation only. */
async function asSuperuser<T>(client: Client, fn: () => Promise<T>): Promise<T> {
  await client.query('RESET ROLE');
  return withRestore(fn, () => enterAppScope(client, PARIWAR_A));
}

/**
 * A `staff` mark row written RAW (as the superuser), past the writer — which now ENDS a mismatched run on every
 * switch, so a family run under a staff mark is reachable only this way (a held switch, 6.19c, is the production
 * path). Proves the child's OWN re-check (and the queue's) is the backstop, ⛔ not the writer alone.
 */
async function staffMarkRaw(client: Client, cid: ClaimId, returnId: string) {
  const r = await asSuperuser(client, () =>
    client.query(
      `INSERT INTO claim_correction_marks (claim_case_id, pariwar_id, return_decision_id, must_act, is_return_mark, set_by_actor, set_by_actor_display, set_by_role, note_ciphertext)
       VALUES ($1, $2, $3, 'staff', false, $4, 'District Admin One', 'district_admin', 'enc:v1:raw')`,
      [cid, PARIWAR_A, returnId, DA],
    ),
  );
  shifted('staffMarkRaw', r.rowCount);
}

/** Fail loudly when a fixture's clock shift reached ⛔ no row — a shift of nothing would leave the timeline unbuilt. */
function shifted(what: string, rowCount: number | null, atLeast = 1): void {
  if ((rowCount ?? 0) < atLeast) throw new Error(`[correction-chase.spec] ${what} moved ${rowCount ?? 0} row(s), expected ≥ ${atLeast}`);
}

async function backdateReturn(client: Client, returnId: string, ms: number) {
  const r = await asSuperuser(client, () =>
    client.query(`UPDATE claim_state_trustee_decisions SET decided_at = decided_at - ($2 || ' milliseconds')::interval WHERE decision_id = $1`, [
      returnId,
      String(ms),
    ]),
  );
  shifted('backdateReturn', r.rowCount);
}

async function setAccountsUpdatedAt(tx: Tx, cid: ClaimId, at: Date) {
  const rows = await tx
    .update(schema.claimNomineeBankAccounts)
    .set({ updatedAt: at })
    .where(and(eq(schema.claimNomineeBankAccounts.pariwarId, PARIWAR_A), eq(schema.claimNomineeBankAccounts.claimCaseId, cid)))
    .returning({ rank: schema.claimNomineeBankAccounts.accountRank });
  shifted('setAccountsUpdatedAt', rows.length, 2); // ⭐ BOTH accounts — "every account rewritten" is the fact under test
}

/**
 * Move the claim's recorded name checks by `ms` (every one, or only the LATEST). `events_log` is append-only by
 * trigger, so this runs as the superuser with `session_replication_role = 'replica'` for the ONE statement — restored
 * on every path — inside a per-test transaction that rolls back; ⛔ never a production shape.
 */
async function shiftNameChecks(client: Client, cid: ClaimId, ms: number, opts: { readonly latestOnly?: boolean } = {}) {
  const r = await asSuperuser(client, async () => {
    await client.query("SET LOCAL session_replication_role = 'replica'");
    return withRestore(
      () =>
        client.query(
          `UPDATE events_log SET occurred_at = occurred_at + ($2 || ' milliseconds')::interval
            WHERE stream_id = $1 AND event_type = 'claim.nominee_name_checked'
              ${opts.latestOnly === true ? `AND event_version = (SELECT max(event_version) FROM events_log WHERE stream_id = $1 AND event_type = 'claim.nominee_name_checked')` : ''}`,
          [cid, String(ms)],
        ),
      () => client.query("SET LOCAL session_replication_role = 'origin'"),
    );
  });
  shifted('shiftNameChecks', r.rowCount);
}

/**
 * ⭐ THE PRODUCTION TIMELINE, rebuilt — called by `returnedClaim` BEFORE the mark: the accounts and every check
 * recorded so far land BEFORE the return (T − 4 h), the return at T − 3 h. A rewrite at `rewriteAt` (T − 2 h) then has
 * ⛔ no check after it, and every check recorded from here on (at the transaction instant T) lands AFTER it. Returns
 * the return's moved `decided_at`.
 */
async function backdateTimeline(client: Client, tx: Tx, cid: ClaimId, returnId: string, returnedAt: Date): Promise<Date> {
  await backdateReturn(client, returnId, 3 * HOUR);
  await setAccountsUpdatedAt(tx, cid, new Date(returnedAt.getTime() - 4 * HOUR));
  await shiftNameChecks(client, cid, -4 * HOUR);
  return new Date(returnedAt.getTime() - 3 * HOUR);
}

/** Is the claim RESUBMITTED (tier (a)) right now — read through the production resolver, from the claim's own row. */
async function resubmittedOf(tx: Tx, c: { readonly cid: ClaimId; readonly mid: string }): Promise<boolean> {
  const row = await readCorrectionClaimRow(tx, PARIWAR_A, c.cid);
  if (row === null) throw new Error(`[correction-chase.spec] no claim row for ${c.cid}`);
  return (await resolveClaimCorrectionState(tx, PARIWAR_A, c.cid, c.mid as MemberId, row.currentState)).resubmitted;
}

/** ⭐ A REAL 6.20 nominee correction of rank 1 (raise → District Admin → Pariwar Admin, which APPLIES it and
 *  supersedes the determination, D7), then the District Admin's redetermination. */
async function applyNomineeCorrection(client: Client, cid: ClaimId, proposedMobileCiphertext: string) {
  const { correctionId } = await raiseNomineeCorrection(client, {
    claimCaseId: cid,
    pariwarId: PARIWAR_A,
    rank: 1,
    proposedNameCiphertext: 'enc:v1:corrected-name',
    proposedRelationship: 'spouse',
    proposedMobileCiphertext,
    proposedAddressCiphertext: null,
    raiseNoteCiphertext: 'enc:v1:raise-note',
    raisedVia: 'helpline',
    raisedByActorId: randomUUID(),
  });
  const step = (actorId: string, actorDisplay: string) => ({
    correctionId,
    claimCaseId: cid,
    pariwarId: PARIWAR_A,
    outcome: 'approve' as const,
    noteCiphertext: 'enc:v1:step-note',
    actorId,
    actorDisplay,
  });
  await decideNomineeCorrectionAsDistrictAdmin(client, step(DA, 'District Admin One'));
  const applied = await decideNomineeCorrectionAsPariwarAdmin(client, step(TRUSTEE, 'Pariwar Admin One'));
  expect(applied.step).toBe('applied');
  await seedNomineeDetermination(client, PARIWAR_A, cid);
}

/**
 * The child's pre-send re-check for one family slot. ⭐ Its clock is the TARGET RUN's: `now` defaults to 10:00 IST on
 * THAT run's day 0 + the slot — read from the run row itself when `runId` names another run of the claim (⛔ the first
 * run's day 0 reused for a later one) — ⛔ never the wall clock; `sentOn` is that instant's IST date.
 */
async function beginFamily(
  client: Client,
  c: { readonly cid: ClaimId; readonly runId: string | null; readonly day0: string | null },
  personKey: string,
  opts: {
    readonly slotDay?: number;
    readonly jobId?: string;
    readonly now?: Date;
    readonly late?: boolean;
    readonly runId?: string;
    readonly crypto?: FieldCryptoDeps;
  } = {},
) {
  const slotDay = opts.slotDay ?? 1;
  const runId = opts.runId ?? c.runId;
  if (runId === null) throw new Error('[beginFamily] the claim has no run — pass `runId`');
  let now = opts.now;
  if (now === undefined) {
    const day0 = runId === c.runId ? c.day0 : ((await readCorrectionRun(bindScopedDb(client), PARIWAR_A, runId))?.day0 ?? null);
    if (day0 === null) throw new Error(`[beginFamily] no day 0 for run ${runId} to derive the clock from — pass \`now\``);
    now = tenAmIst(addCalendarDays(day0, slotDay));
  }
  return beginCorrectionFamilySend(client, {
    pariwarId: PARIWAR_A,
    claimCaseId: c.cid,
    runId,
    slotDay,
    personKey,
    sentOn: istDateOf(now),
    late: opts.late ?? false,
    jobId: opts.jobId ?? 'job-1',
    now,
    crypto: opts.crypto ?? ENC,
  });
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

  it('⭐ I8 — a RETURN mark\'s day 0 is the RETURN\'s IST date (`decided_at`), ⛔ the mark\'s clock — across an IST midnight', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const cid = toClaimId(randomUUID());
    await driveClaimTo(client, PARIWAR_A, cid, toMemberId(randomUUID()), 'verifier_approved');
    await seedNomineeNameCheck(client, PARIWAR_A, cid);
    const ret = await returnToDistrictAdmin(client, returnInput(cid));
    // The return lands at 23:59 IST YESTERDAY; the mark is written now — on a LATER IST day. (K5: a return mark takes
    // ⛔ no `now` at all — the type forbids it — so the mark's clock is the real one.)
    const returnDay = addCalendarDays(istDateOf(new Date()), -1);
    await asSuperuser(client, () =>
      client.query('UPDATE claim_state_trustee_decisions SET decided_at = $2 WHERE decision_id = $1', [
        ret.decision.decisionId,
        new Date(`${returnDay}T18:29:00.000Z`).toISOString(),
      ]),
    );
    expect(istDateOf(new Date(`${returnDay}T18:29:00.000Z`))).toBe(returnDay); // the precondition: 23:59 IST that day
    const w = await writeCorrectionMark(client, returnMark(cid, 'family'));
    expect(istDateOf(w.mark.setAt) > returnDay).toBe(true); // the precondition: the mark's clock IS a later IST day
    expect(w.openedRun).toMatchObject({ kind: 'family', day0: returnDay });
  });

  it('⭐ family → staff → family opens a SECOND family run whose DAY-1 SLOT SENDS (`-266` §1 — the D2 collision is gone), one open at a time', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const c = await returnedClaim(client, { mustAct: 'family' });
    const person = (await readCorrectionRecipients(tx, PARIWAR_A, c.cid)).people[0]!;
    // The FIRST family run's day-1 slot was sent (and accepted) before the switch.
    const first = await beginFamily(client, c, person.personKey, { jobId: 'job-run-1' });
    if (first.kind !== 'send') throw new Error(`expected a send, got ${JSON.stringify(first)}`);
    expect(
      await finaliseCorrectionReminder(tx, { pariwarId: PARIWAR_A, reminderId: first.reminderId, jobId: 'job-run-1', outcome: 'accepted', recipientVersionId: person.versionId, recipientNumberHash: 'hash-A' }),
    ).toBe(true);

    const toStaff = await writeCorrectionMark(client, mark(c.cid, 'staff'));
    expect(toStaff).toMatchObject({ changed: true, endedRun: { kind: 'family', endReason: 'mark_changed' }, openedRun: { kind: 'staff' } });
    const backToFamily = await writeCorrectionMark(client, mark(c.cid, 'family'));
    expect(backToFamily.openedRun?.kind).toBe('family');
    const runs = await runsOf(tx, c.cid);
    expect(runs.map((r) => [r.kind, r.endReason])).toEqual([
      ['family', 'mark_changed'],
      ['staff', 'mark_changed'],
      ['family', null],
    ]);
    expect(runs.filter((r) => r.endedAt === null)).toHaveLength(1);
    expect(runs[0]!.runId).not.toBe(runs[2]!.runId);

    // ⭐ THE PROOF: the second family run's day-1 slot is a NEW row that SENDS — ⛔ never `already_final` against
    // the first run's day-1 record.
    const second = await beginFamily(client, c, person.personKey, { jobId: 'job-run-2', runId: runs[2]!.runId });
    expect(second).toMatchObject({ kind: 'send', attemptCount: 1, person: { personKey: person.personKey } });
    if (second.kind !== 'send') return;
    expect(second.reminderId).not.toBe(first.reminderId);
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
    await driveClaimTo(client, PARIWAR_A, cid, toMemberId(randomUUID()), 'verifier_approved');
    await expect(writeCorrectionMark(client, mark(cid, 'family'))).rejects.toBeInstanceOf(CorrectionMarkNoLiveReturnError);
  });

  // ⚠ The DB backstop (`claim_correction_marks_note_required_check`) is proven — by name, with its positive leg — in
  // `rls/claim-correction-chase-policy-regression.spec.ts`; this test proves only the writer's own guard.
  it('⭐ the note is required on every row after the return\'s own — the WRITER\'s guard refuses before any insert', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const { cid } = await returnedClaim(client, { mustAct: 'family' });
    await expect(writeCorrectionMark(client, mark(cid, 'staff', { noteCiphertext: null }))).rejects.toBeInstanceOf(
      CorrectionMarkNoteRequiredError,
    );
    const marks = await tx.select().from(schema.claimCorrectionMarks).where(eq(schema.claimCorrectionMarks.claimCaseId, cid));
    expect(marks.map((m) => m.isReturnMark)).toEqual([true]);
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

  it('⭐ I10 — during a HOLD a switch ENDS the open run whose kind no longer matches (family → staff, staff → family), opening ⛔ none', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const held = () => Promise.resolve(true);

    const fam = await returnedClaim(client, { mustAct: 'family' });
    const toStaff = await writeCorrectionMark(client, mark(fam.cid, 'staff', { hold: held }));
    expect(toStaff).toMatchObject({ changed: true, openedRun: null, endedRun: { runId: fam.runId, kind: 'family', endReason: 'mark_changed' } });
    expect((await runsOf(tx, fam.cid)).filter((r) => r.endedAt === null)).toHaveLength(0);

    const stf = await returnedClaim(client, { mustAct: 'staff' });
    const toFamily = await writeCorrectionMark(client, mark(stf.cid, 'family', { hold: held }));
    expect(toFamily).toMatchObject({ changed: true, openedRun: null, endedRun: { runId: stf.runId, kind: 'staff', endReason: 'mark_changed' } });
    expect((await runsOf(tx, stf.cid)).filter((r) => r.endedAt === null)).toHaveLength(0);
  });

  it('⭐ I10 — the child refuses a FAMILY run whose return\'s latest mark is ⛔ not `family` (`not_a_family_mark`); a DIRECTION run is exempt', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const fam = await returnedClaim(client, { mustAct: 'family' });
    const famPerson = (await readCorrectionRecipients(tx, PARIWAR_A, fam.cid)).people[0]!;
    await staffMarkRaw(client, fam.cid, fam.returnId);
    expect(await beginFamily(client, fam, famPerson.personKey)).toEqual({ kind: 'skipped', reason: 'not_a_family_mark' });

    const dir = await returnedClaim(client, { mustAct: 'family' });
    const dirPerson = (await readCorrectionRecipients(tx, PARIWAR_A, dir.cid)).people[0]!;
    const direction = await openCorrectionRun(client, {
      pariwarId: PARIWAR_A,
      claimCaseId: dir.cid,
      returnDecisionId: dir.returnId,
      kind: 'direction',
      anchorId: randomUUID(),
      day0: dir.day0!,
    });
    await staffMarkRaw(client, dir.cid, dir.returnId);
    expect(await beginFamily(client, dir, dirPerson.personKey, { runId: direction.runId })).toMatchObject({ kind: 'send' });
  });

  it('⭐ K3 — the queue advertises ⛔ no next reminder for a FAMILY run whose return\'s latest mark is ⛔ not `family` (the child skips it `not_a_family_mark`); a DIRECTION run is exempt', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const fam = await returnedClaim(client, { mustAct: 'family' });
    const person = (await readCorrectionRecipients(tx, PARIWAR_A, fam.cid)).people[0]!;
    const today = addCalendarDays(fam.day0!, 3);
    // ⭐ Positive control — the family run under a `family` mark names its next reminder (day 4).
    expect((await readCorrectionChaseSummary(tx, PARIWAR_A, fam.cid, today)).run).toMatchObject({
      runId: fam.runId, kind: 'family', open: true, nextReminderOn: addCalendarDays(fam.day0!, 4),
    });
    await staffMarkRaw(client, fam.cid, fam.returnId);
    const s = await readCorrectionChaseSummary(tx, PARIWAR_A, fam.cid, today);
    expect(s.mark?.mustAct).toBe('staff');
    expect(s.run).toMatchObject({ runId: fam.runId, kind: 'family', open: true, nextReminderOn: null });
    // …the date it would have advertised is one the child refuses.
    expect(await beginFamily(client, fam, person.personKey, { slotDay: 4, jobId: 'd4' })).toEqual({ kind: 'skipped', reason: 'not_a_family_mark' });

    // A DIRECTION run chases the family whatever the mark (6.19c) — it keeps its date under the same staff mark.
    const dir = await returnedClaim(client, { mustAct: 'family' });
    const direction = await openCorrectionRun(client, {
      pariwarId: PARIWAR_A,
      claimCaseId: dir.cid,
      returnDecisionId: dir.returnId,
      kind: 'direction',
      anchorId: randomUUID(),
      day0: dir.day0!,
    });
    await staffMarkRaw(client, dir.cid, dir.returnId);
    expect((await readCorrectionChaseSummary(tx, PARIWAR_A, dir.cid, addCalendarDays(dir.day0!, 3))).run).toMatchObject({
      runId: direction.runId, kind: 'direction', open: true, nextReminderOn: addCalendarDays(dir.day0!, 4),
    });
  });

  it('⭐ a second return after resubmission supersedes the old run and leaves ONE open run (`-267` §1)', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const first = await returnedClaim(client, { mustAct: 'family', timeline: true });
    // Resubmit: the family rewrites after the return (T − 2 h) and the District Admin re-checks AFTER it (at T).
    await setAccountsUpdatedAt(tx, first.cid, first.rewriteAt);
    expect(await resubmittedOf(tx, first)).toBe(false); // ⛔ the rewrite alone is only tier (b)
    await seedNomineeNameCheck(client, PARIWAR_A, first.cid, { reuseAccounts: true });
    // ⭐ The fixture builds its title's state: the first return IS resubmitted before the second lands.
    expect(await resubmittedOf(tx, first)).toBe(true);
    const second = await returnToDistrictAdmin(client, returnInput(first.cid));
    await writeCorrectionMark(client, returnMark(first.cid, 'staff'));
    const runs = await runsOf(tx, first.cid);
    expect(runs.map((r) => [r.kind, r.endReason, r.returnDecisionId])).toEqual([
      ['family', 'superseded', first.returnId],
      ['staff', null, second.decision.decisionId],
    ]);
  });

  it('⭐ a second return after a VOTE supersession leaves ONE open run (`-267` §1 — the vote supersedes the return but ends ⛔ no run)', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const first = await returnedClaim(client, { mustAct: 'family', timeline: true });
    await setAccountsUpdatedAt(tx, first.cid, first.rewriteAt);
    expect(await resubmittedOf(tx, first)).toBe(false);
    await seedNomineeNameCheck(client, PARIWAR_A, first.cid, { reuseAccounts: true });
    // ⭐ The fixture builds its title's state: the return IS resubmitted before the vote.
    expect(await resubmittedOf(tx, first)).toBe(true);

    // The Pariwar Admin's VOTE (a denial) supersedes the resubmitted return — the OTHER path that does, besides a
    // second return — and moves the claim to `denied`. ⛔ Nothing ends the first return's run here.
    await voteOnFrozenClaim(client, {
      claimCaseId: first.cid,
      pariwarId: PARIWAR_A,
      outcome: 'denied',
      reasonCode: 'standing_not_met',
      rationaleCiphertext: null,
      actorId: TRUSTEE,
      actorDisplay: 'Pariwar Admin One',
      actor: 'trustee',
    });
    expect(await hasLiveReturnRow(tx, PARIWAR_A, first.cid)).toBe(false);
    expect((await runsOf(tx, first.cid)).map((r) => [r.kind, r.endReason])).toEqual([['family', null]]); // the stale run

    // The appeal reverses the denial — `reversed` is returnable again — and the Pariwar Admin returns it once more.
    const emit = (from: string, to: string, eventType: string, extra: Record<string, unknown> = {}) =>
      projectClaimState(client, {
        claimCaseId: first.cid,
        pariwarId: PARIWAR_A,
        deceasedMemberId: first.mid as MemberId,
        intakeChannels: ['member_app'],
        claimantActorId: null,
        eventType: eventType as never,
        payload: { from_state: from, to_state: to, trigger: 'test', actor: 'system', ...extra } as never,
        actorId: null,
      });
    await emit('denied', 'appeal_stage_1', 'claim.appeal_stage1_initiated');
    await emit('appeal_stage_1', 'reversed', 'claim.appeal_stage1_reviewed', { decision: 'reversed' });
    const second = await returnToDistrictAdmin(client, returnInput(first.cid));
    await writeCorrectionMark(client, returnMark(first.cid, 'staff'));

    const runs = await runsOf(tx, first.cid);
    expect(runs.map((r) => [r.kind, r.endReason, r.returnDecisionId])).toEqual([
      ['family', 'superseded', first.returnId],
      ['staff', null, second.decision.decisionId],
    ]);
    expect(runs.filter((r) => r.endedAt === null)).toHaveLength(1);
  });

  it('⭐ end-run records `decided`, and is a NO-OP on an ended run', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const { cid, runId } = await returnedClaim(client, { mustAct: 'family' });
    expect(await endCorrectionRun(client, { pariwarId: PARIWAR_A, claimCaseId: cid, runId: runId!, reason: 'decided' })).toBe(true);
    expect(await endCorrectionRun(client, { pariwarId: PARIWAR_A, claimCaseId: cid, runId: runId!, reason: 'day_90' })).toBe(false);
    expect((await runsOf(tx, cid))[0]!.endReason).toBe('decided');
  });

  it('⭐ end-run ends a run ONLY of the claim it names (⛔ a run id of another claim is ⛔ never ended)', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const a = await returnedClaim(client, { mustAct: 'family' });
    const b = await returnedClaim(client, { mustAct: 'family' });
    expect(await endCorrectionRun(client, { pariwarId: PARIWAR_A, claimCaseId: a.cid, runId: b.runId!, reason: 'decided' })).toBe(false);
    expect((await runsOf(tx, b.cid))[0]!.endedAt).toBeNull();
  });

  it('⭐ the resolver returns an ENDED day-90 run (`-267` §2) — the latest family and the latest staff run, open or ended; the summary names the IST date it ended (`endedOn`)', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const { cid, runId, returnId, day0 } = await returnedClaim(client, { mustAct: 'family' });
    // ⭐ Control — while the run is open the summary carries ⛔ no end date.
    expect((await readCorrectionChaseSummary(tx, PARIWAR_A, cid, addCalendarDays(day0!, 3))).run).toMatchObject({
      runId, open: true, endedOn: null,
    });
    await endCorrectionRun(client, { pariwarId: PARIWAR_A, claimCaseId: cid, runId: runId!, reason: 'day_90' });
    const [ended] = await runsOf(tx, cid);
    expect(ended!.endedAt).not.toBeNull();
    expect((await readCorrectionChaseSummary(tx, PARIWAR_A, cid, addCalendarDays(day0!, 3))).run).toMatchObject({
      runId, open: false, endedOn: istDateOf(ended!.endedAt!), nextReminderOn: null,
    });
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
    const c = await returnedClaim(client, { mustAct: 'family', timeline: true });
    const { returnedAt: decidedAt, rewriteAt } = c;
    expect(await readFamilyPartDoneAt(tx, PARIWAR_A, c.cid, decidedAt)).toBeNull(); // ⛔ not rewritten yet

    // The family rewrites an hour after the return — and ⛔ NO check exists after it (every check sits at T − 4 h).
    await setAccountsUpdatedAt(tx, c.cid, rewriteAt);
    expect((await readFamilyPartDoneAt(tx, PARIWAR_A, c.cid, decidedAt))?.getTime()).toBe(rewriteAt.getTime());

    // Staff record a MISMATCH after the rewrite (at T) ⇒ the family's part is ⛔ not done.
    await seedNomineeNameCheck(client, PARIWAR_A, c.cid, { reuseAccounts: true, verdicts: ['matches', 'does_not_match'] });
    expect(await readFamilyPartDoneAt(tx, PARIWAR_A, c.cid, decidedAt)).toBeNull();

    // The family's NEXT rewrite (T + 1 h — after that check) makes it true again.
    const rewrite2 = new Date(decidedAt.getTime() + 4 * HOUR);
    await setAccountsUpdatedAt(tx, c.cid, rewrite2);
    expect((await readFamilyPartDoneAt(tx, PARIWAR_A, c.cid, decidedAt))?.getTime()).toBe(rewrite2.getTime());
    expect((await resolveCorrectionChase(tx, PARIWAR_A, c.cid)).familyPartDoneAt?.getTime()).toBe(rewrite2.getTime());
  });

  it('⭐ the child\'s re-check: tier (b) (the family\'s part done, ⛔ not resubmitted) SKIPS the family send, ⛔ no throw', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const c = await returnedClaim(client, { mustAct: 'family', timeline: true });
    await setAccountsUpdatedAt(tx, c.cid, c.rewriteAt); // rewritten, ⛔ no check since
    const person = (await readCorrectionRecipients(tx, PARIWAR_A, c.cid)).people[0]!;
    expect(await beginFamily(client, c, person.personKey)).toEqual({ kind: 'skipped', reason: 'family_part_done' });
  });

  it('⭐ tier (a): once RESUBMITTED (a rewrite, then a current passing check AFTER it) the family send is skipped `resubmitted`; the rewrite alone is only tier (b)', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const c = await returnedClaim(client, { mustAct: 'family', timeline: true });
    await setAccountsUpdatedAt(tx, c.cid, c.rewriteAt);
    const person = (await readCorrectionRecipients(tx, PARIWAR_A, c.cid)).people[0]!;
    // ⛔ The negative leg — rewritten, the only checks predate the rewrite ⇒ ⛔ not resubmitted, only paused.
    expect(await beginFamily(client, c, person.personKey, { slotDay: 1, jobId: 'job-1' })).toEqual({ kind: 'skipped', reason: 'family_part_done' });
    // The District Admin's passing check AFTER the rewrite (at T > rewriteAt) ⇒ resubmitted.
    await seedNomineeNameCheck(client, PARIWAR_A, c.cid, { reuseAccounts: true });
    expect(await beginFamily(client, c, person.personKey, { slotDay: 2, jobId: 'job-2' })).toEqual({ kind: 'skipped', reason: 'resubmitted' });
  });

  it('⭐ `-268` — a family that has rewritten is ⛔ not texted; a later 6.20 correction does ⛔ not resume the chase (its rewrite fact is untouched, and the same correction with ⛔ no rewrite SENDS); a later `does_not_match` does — the D3 catch-up PLANNER fed this run\'s recorded slots names ONE `late` slot, ⛔ no burst, and the child SENDS it; the next rewrite pauses it again', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const c = await returnedClaim(client, { mustAct: 'family', projectedMember: true, timeline: true });
    await setAccountsUpdatedAt(tx, c.cid, c.rewriteAt);
    const person = (await readCorrectionRecipients(tx, PARIWAR_A, c.cid)).people[0]!;
    expect(await beginFamily(client, c, person.personKey, { slotDay: 10, jobId: 'd10' })).toEqual({ kind: 'skipped', reason: 'family_part_done' });

    // A 6.20 nominee correction is applied and redetermined — ⛔ it does not resume the family chase.
    await applyNomineeCorrection(client, c.cid, 'enc:v1:corrected-mobile');
    const after = (await readCorrectionRecipients(tx, PARIWAR_A, c.cid)).people[0]!;
    expect(after.personKey).toBe(person.personKey); // D30 — the correction keeps the person's key
    expect(after.versionId).not.toBe(person.versionId);
    // ⭐ The correction is ⛔ neither a rewrite nor a staff check: the family's-part-done fact is EXACTLY the rewrite's.
    expect((await readFamilyPartDoneAt(tx, PARIWAR_A, c.cid, c.returnedAt))?.getTime()).toBe(c.rewriteAt.getTime());
    expect(await beginFamily(client, c, person.personKey, { slotDay: 14, jobId: 'd14' })).toEqual({ kind: 'skipped', reason: 'family_part_done' });
    // ⭐ CONTROL — the SAME correction on a claim whose family has ⛔ not rewritten: the post-correction slot SENDS. So
    // the pause above is tier (b) holding OVER the correction — ⛔ an artefact of the correction itself (a person no
    // longer a recipient, a reset that stops them) that the leg would pass on whatever tier (b) did.
    const ctl = await returnedClaim(client, { mustAct: 'family', projectedMember: true, timeline: true });
    const ctlPerson = (await readCorrectionRecipients(tx, PARIWAR_A, ctl.cid)).people[0]!;
    await applyNomineeCorrection(client, ctl.cid, 'enc:v1:corrected-mobile');
    expect(await beginFamily(client, ctl, ctlPerson.personKey, { slotDay: 14, jobId: 'ctl-d14' })).toMatchObject({
      kind: 'send',
      person: { personKey: ctlPerson.personKey },
    });

    // The District Admin records a `does_not_match` AFTER the rewrite ⇒ the chase resumes. ⚠ What this leg proves: the
    // D3 catch-up PLANNER (`correctionCatchUp` — the function the sweep calls), fed the run's REAL recorded slots on run
    // day 18, names ONE `late` slot — the latest due slot with ⛔ no record is 17 (10 and 14 carry their markers), the
    // gap since 14 empty — and the child SENDS it. ⛔ It does not drive the sweep itself (its own spec, in apps/jobs).
    await seedNomineeNameCheck(client, PARIWAR_A, c.cid, { reuseAccounts: true, verdicts: ['matches', 'does_not_match'] });
    const familyRows = () =>
      tx
        .select()
        .from(schema.claimCorrectionReminders)
        .where(and(eq(schema.claimCorrectionReminders.claimCaseId, c.cid), eq(schema.claimCorrectionReminders.purpose, 'family_sms')))
        .orderBy(schema.claimCorrectionReminders.slotDay);
    const dueDays = correctionReminderSchedule('family', c.day0!).filter((s) => s.kind === 'reminder').map((s) => s.day);
    const cu = correctionCatchUp(dueDays, new Set((await familyRows()).map((r) => r.slotDay)), 18);
    expect(cu).toEqual({ send: { day: 17, late: true }, skip: [] });
    const resumed = await beginFamily(client, c, person.personKey, {
      slotDay: cu.send!.day,
      late: cu.send!.late,
      jobId: 'd18',
      now: tenAmIst(addCalendarDays(c.day0!, 18)),
    });
    expect(resumed).toMatchObject({ kind: 'send', person: { personKey: person.personKey } });
    expect((await familyRows()).map((r) => [r.slotDay, r.outcome, r.late])).toEqual([
      [10, 'skipped_superseded', false],
      [14, 'skipped_superseded', false],
      [17, 'attempting', true],
    ]);

    // The family's NEXT rewrite (T + 1 h — after that check) pauses it again.
    await setAccountsUpdatedAt(tx, c.cid, new Date(c.returnedAt.getTime() + 4 * HOUR));
    expect(await beginFamily(client, c, person.personKey, { slotDay: 21, jobId: 'd21' })).toEqual({ kind: 'skipped', reason: 'family_part_done' });
  });

  it('⭐ `-269` — rewrite (d10) → mismatch (d11) → match (d12) with ⛔ no new rewrite ⇒ RESUBMITTED: everything paused', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const c = await returnedClaim(client, { mustAct: 'family', timeline: true });
    const { returnedAt: decidedAt, rewriteAt } = c;
    const person = (await readCorrectionRecipients(tx, PARIWAR_A, c.cid)).people[0]!;

    // d10 — the family rewrites.
    await setAccountsUpdatedAt(tx, c.cid, rewriteAt);
    // d11 — the District Admin records a mismatch after it (placed between the rewrite and T).
    await seedNomineeNameCheck(client, PARIWAR_A, c.cid, { reuseAccounts: true, verdicts: ['matches', 'does_not_match'] });
    await shiftNameChecks(client, c.cid, -HOUR, { latestOnly: true });
    expect(await readFamilyPartDoneAt(tx, PARIWAR_A, c.cid, decidedAt)).toBeNull();
    expect(await resubmittedOf(tx, c)).toBe(false);
    expect(await beginFamily(client, c, person.personKey, { slotDay: 11, jobId: 'd11' })).toMatchObject({ kind: 'send' });

    // d12 — a MATCH over the SAME rewrite (⛔ no new rewrite) ⇒ resubmitted.
    await seedNomineeNameCheck(client, PARIWAR_A, c.cid, { reuseAccounts: true });
    expect(await resubmittedOf(tx, c)).toBe(true);
    expect(await beginFamily(client, c, person.personKey, { slotDay: 12, jobId: 'd12' })).toEqual({ kind: 'skipped', reason: 'resubmitted' });
    // The queue: ⛔ "awaiting your check" (it was checked), and ⛔ no next reminder while resubmitted.
    const summary = await readCorrectionChaseSummary(tx, PARIWAR_A, c.cid, addCalendarDays(c.day0!, 12));
    expect(summary.awaitingCheck).toBe(false);
    expect(summary.run).toMatchObject({ runId: c.runId, open: true, nextReminderOn: null });
  });

  it('⭐ J7 — tier (b) on a FAMILY run advertises ⛔ no next reminder (a control: before the rewrite it does); a STAFF run keeps its own', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const fam = await returnedClaim(client, { mustAct: 'family', timeline: true });
    const today = addCalendarDays(fam.day0!, 3);
    // ⭐ Positive control — the open family run, ⛔ not paused, names its next reminder (day 4).
    expect((await readCorrectionChaseSummary(tx, PARIWAR_A, fam.cid, today)).run).toMatchObject({
      kind: 'family', open: true, nextReminderOn: addCalendarDays(fam.day0!, 4),
    });
    await setAccountsUpdatedAt(tx, fam.cid, fam.rewriteAt); // the family's part is done, ⛔ not resubmitted
    const paused = await readCorrectionChaseSummary(tx, PARIWAR_A, fam.cid, today);
    expect(paused.awaitingCheck).toBe(true);
    expect(paused.run).toMatchObject({ kind: 'family', open: true, nextReminderOn: null });

    // A STAFF run is the District Admin's own chase — the family's rewrite does ⛔ not pause it. ⭐ CONCRETE dates, from
    // the RETURN's own IST date (the fixture's moved `decided_at` — ⛔ the run's day 0 read back from the code under
    // test) and the Panel's day list: run day 3 ⇒ next on day 4; run day 7 ⇒ next on day 10 (⛔ simply "tomorrow").
    const stf = await returnedClaim(client, { mustAct: 'staff', timeline: true });
    const returnedOn = istDateOf(stf.returnedAt);
    await setAccountsUpdatedAt(tx, stf.cid, stf.rewriteAt);
    const staff = await readCorrectionChaseSummary(tx, PARIWAR_A, stf.cid, addCalendarDays(returnedOn, 3));
    expect(staff.awaitingCheck).toBe(true);
    expect(staff.run).toMatchObject({ kind: 'staff', open: true, dayCount: 3, nextReminderOn: addCalendarDays(returnedOn, 4) });
    expect((await readCorrectionChaseSummary(tx, PARIWAR_A, stf.cid, addCalendarDays(returnedOn, 7))).run).toMatchObject({
      dayCount: 7,
      nextReminderOn: addCalendarDays(returnedOn, 10),
    });
    // …and under D30 (the agreement withdrawn) the STAFF run still names its date — nobody in the family is texted, the
    // District Admin still is.
    const contact = await tx.select().from(schema.claimContacts).where(eq(schema.claimContacts.claimCaseId, stf.cid));
    await tx.update(schema.consentRecords).set({ revokedAt: new Date() }).where(eq(schema.consentRecords.consentId, contact[0]!.agreementConsentId));
    const d30 = await readCorrectionChaseSummary(tx, PARIWAR_A, stf.cid, addCalendarDays(returnedOn, 3));
    expect(d30.cannotRemind).toBe('agreement_not_live');
    expect(d30.run).toMatchObject({ kind: 'staff', open: true, nextReminderOn: addCalendarDays(returnedOn, 4) });
  });
});

describe.skipIf(!hasDatabase)('the correction chase — the send claim (AC2 send safety, retries)', { timeout: 20000 }, () => {
  setupLiveDb();

  async function familyCase(client: Client, tx: Tx) {
    const c = await returnedClaim(client, { mustAct: 'family' });
    const person = (await readCorrectionRecipients(tx, PARIWAR_A, c.cid)).people[0]!;
    return { ...c, person };
  }

  /** `now` omitted ⇒ the run's own clock (day 0 + 1, 10:00 IST — `beginFamily`'s default). */
  const begin = (
    client: Client,
    c: { cid: ClaimId; runId: string | null; day0: string | null; person: { personKey: string } },
    jobId: string,
    now?: Date,
  ) => beginFamily(client, c, c.person.personKey, { jobId, now });

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
    const retry = await begin(client, c, 'job-1', new Date(tenAmIst(addCalendarDays(c.day0!, 1)).getTime() + 60_000));
    expect(retry).toMatchObject({ kind: 'send', reminderId: first.reminderId, attemptCount: 2 });
    const rows = await tx.select().from(schema.claimCorrectionReminders).where(eq(schema.claimCorrectionReminders.claimCaseId, c.cid));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ firstDetail: 'api_unavailable:HTTP_503', attemptCount: 2 });
  });

  it('⭐ J8 — the stale child EXPIRES its OWN attempting row: `error`, the transient detail kept in first_detail, its reason in detail; ⛔ another job\'s row, ⛔ a final row', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const c = await familyCase(client, tx);
    const key: CorrectionReminderKey = {
      pariwarId: PARIWAR_A, claimCaseId: c.cid, runId: c.runId!, slotDay: 1, recipientKey: c.person.personKey, purpose: 'family_sms', subjectKey: '',
    };
    const res = await begin(client, c, 'job-1');
    if (res.kind !== 'send') throw new Error('expected a send');
    await noteCorrectionReminderTransient(tx, { pariwarId: PARIWAR_A, reminderId: res.reminderId, jobId: 'job-1', detail: 'api_unavailable:HTTP_503' });
    const expire = (jobId: string) =>
      expireOwnCorrectionReminder(tx, { pariwarId: PARIWAR_A, reminderId: res.reminderId, jobId, detail: 'exhausted:crossed_midnight' });
    // ⛔ Another job's row is ⛔ never expired (the compare-and-set holds the claimant).
    expect(await expire('job-2')).toBe(false);
    expect(await readCorrectionReminder(tx, key)).toMatchObject({ outcome: 'attempting', detail: 'api_unavailable:HTTP_503', firstDetail: null });
    expect(await expire('job-1')).toBe(true);
    expect(await readCorrectionReminder(tx, key)).toMatchObject({
      outcome: 'error', firstDetail: 'api_unavailable:HTTP_503', detail: 'exhausted:crossed_midnight', claimedByJob: 'job-1', attemptCount: 1,
    });
    // A FINAL row is ⛔ moved again, and the slot is ⛔ re-claimed (⛔ `skipped_superseded` — an ambiguous send stays on record).
    expect(await expire('job-1')).toBe(false);
    expect(await begin(client, c, 'job-3')).toEqual({ kind: 'noop', reason: 'already_final' });
  });

  it('J8 — an EARLIER transient detail already in first_detail is KEPT (COALESCE), ⛔ overwritten by the latest', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const c = await familyCase(client, tx);
    const first = await begin(client, c, 'job-1');
    if (first.kind !== 'send') throw new Error('expected a send');
    await noteCorrectionReminderTransient(tx, { pariwarId: PARIWAR_A, reminderId: first.reminderId, jobId: 'job-1', detail: 'api_unavailable:HTTP_503' });
    // The job's retry re-claims its row (the first detail moves to first_detail), then fails transiently again.
    const retry = await begin(client, c, 'job-1');
    expect(retry).toMatchObject({ kind: 'send', reminderId: first.reminderId, attemptCount: 2 });
    await noteCorrectionReminderTransient(tx, { pariwarId: PARIWAR_A, reminderId: first.reminderId, jobId: 'job-1', detail: 'api_unavailable:ETIMEDOUT' });
    expect(
      await expireOwnCorrectionReminder(tx, { pariwarId: PARIWAR_A, reminderId: first.reminderId, jobId: 'job-1', detail: 'exhausted:crossed_midnight' }),
    ).toBe(true);
    const rows = await tx.select().from(schema.claimCorrectionReminders).where(eq(schema.claimCorrectionReminders.claimCaseId, c.cid));
    expect(rows.map((r) => [r.outcome, r.firstDetail, r.detail, r.attemptCount])).toEqual([
      ['error', 'api_unavailable:HTTP_503', 'exhausted:crossed_midnight', 2],
    ]);
  });

  // ⭐ A FIXED `t0` (10:00 IST the day after day 0 — ⛔ `new Date()`): the lease boundary is then exact to the
  // millisecond, and ±1 ms can never straddle an IST midnight (the `sentOn` / day-90 inputs stay on one day).
  it('⭐ a row held by a DIFFERENT job is re-claimed only once its lease expires (exact ±1 ms); a younger one is left alone', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const c = await familyCase(client, tx);
    const t0 = tenAmIst(addCalendarDays(c.day0!, 1));
    const held = await begin(client, c, 'job-1', t0);
    expect(held.kind).toBe('send');
    expect(await begin(client, c, 'job-2', new Date(t0.getTime() + CORRECTION_SEND_LEASE_MS - 1))).toEqual({ kind: 'noop', reason: 'held_by_other' });
    expect(await begin(client, c, 'job-2', new Date(t0.getTime() + CORRECTION_SEND_LEASE_MS))).toEqual({ kind: 'noop', reason: 'held_by_other' });
    const taken = await begin(client, c, 'job-2', new Date(t0.getTime() + CORRECTION_SEND_LEASE_MS + 1));
    expect(taken).toMatchObject({ kind: 'send', attemptCount: 2 });
  });

  it('⭐ after a lease TAKEOVER the STALE job\'s finalise is refused (CAS) and the new holder\'s lands', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const c = await familyCase(client, tx);
    const t0 = tenAmIst(addCalendarDays(c.day0!, 1));
    const stale = await begin(client, c, 'job-1', t0);
    if (stale.kind !== 'send') throw new Error('expected a send');
    const taken = await begin(client, c, 'job-2', new Date(t0.getTime() + CORRECTION_SEND_LEASE_MS + 1));
    if (taken.kind !== 'send') throw new Error('expected the takeover to send');
    expect(taken.reminderId).toBe(stale.reminderId);
    // The stale job (job-1) wakes up and tries to record ITS outcome — ⛔ refused, the row is job-2's now.
    expect(await finaliseCorrectionReminder(tx, { pariwarId: PARIWAR_A, reminderId: stale.reminderId, jobId: 'job-1', outcome: 'accepted', providerMessageId: 'gw-stale' })).toBe(false);
    expect(await finaliseCorrectionReminder(tx, { pariwarId: PARIWAR_A, reminderId: taken.reminderId, jobId: 'job-2', outcome: 'accepted', providerMessageId: 'gw-new' })).toBe(true);
    const row = await readCorrectionReminder(tx, {
      pariwarId: PARIWAR_A, claimCaseId: c.cid, runId: c.runId!, slotDay: 1, recipientKey: c.person.personKey, purpose: 'family_sms', subjectKey: '',
    });
    expect(row).toMatchObject({ outcome: 'accepted', providerMessageId: 'gw-new', claimedByJob: 'job-2', attemptCount: 2 });
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

  it('⭐ a re-check that FAILS on a retry compare-and-sets the job\'s OWN attempting row to skipped_superseded when ⛔ no attempt ran (its detail is null — ⛔ no false error)', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const c = await familyCase(client, tx);
    const first = await begin(client, c, 'job-1');
    expect(first.kind).toBe('send');
    await writeCorrectionMark(client, mark(c.cid, 'staff'));
    expect(await begin(client, c, 'job-1')).toEqual({ kind: 'skipped', reason: 'run_ended' }); // ⛔ no `expiredAttempt`
    const rows = await tx.select().from(schema.claimCorrectionReminders).where(eq(schema.claimCorrectionReminders.claimCaseId, c.cid));
    expect(rows.map((r) => [r.outcome, r.detail, r.firstDetail])).toEqual([['skipped_superseded', 'run_ended', null]]);
  });

  it('⭐ K4 — a retry whose re-check now FAILS, on its OWN row that an attempt already ran on (a transient detail), EXPIRES it: `error`, the detail kept in first_detail, `exhausted:recheck_<reason>`, and `expiredAttempt: true` (⛔ never `skipped_superseded` over a possible send)', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const c = await familyCase(client, tx);
    const first = await begin(client, c, 'job-1');
    if (first.kind !== 'send') throw new Error('expected a send');
    // The attempt RAN and failed transiently (a 503 that may have followed a gateway accept).
    await noteCorrectionReminderTransient(tx, { pariwarId: PARIWAR_A, reminderId: first.reminderId, jobId: 'job-1', detail: 'api_unavailable:HTTP_503' });
    // Before the job's retry, the District Admin switches the claim to staff — the retry's re-check fails.
    await writeCorrectionMark(client, mark(c.cid, 'staff'));
    expect(await begin(client, c, 'job-1')).toEqual({ kind: 'skipped', reason: 'run_ended', expiredAttempt: true });
    const rows = await tx.select().from(schema.claimCorrectionReminders).where(eq(schema.claimCorrectionReminders.claimCaseId, c.cid));
    expect(rows.map((r) => [r.reminderId, r.outcome, r.firstDetail, r.detail, r.claimedByJob, r.attemptCount])).toEqual([
      [first.reminderId, 'error', 'api_unavailable:HTTP_503', 'exhausted:recheck_run_ended', 'job-1', 1],
    ]);
    // FINAL — a later job finds nothing to claim.
    expect(await begin(client, c, 'job-2')).toEqual({ kind: 'skipped', reason: 'run_ended' });
    expect((await tx.select().from(schema.claimCorrectionReminders).where(eq(schema.claimCorrectionReminders.claimCaseId, c.cid))).map((r) => r.outcome)).toEqual(['error']);
  });

  it('D30 — ⛔ no contact record ⇒ nobody is reminded, and the child skips with the reason', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const c = await returnedClaim(client, { mustAct: 'family', contact: 'skip' });
    const recipients = await readCorrectionRecipients(tx, PARIWAR_A, c.cid);
    expect(recipients).toMatchObject({ cannotRemind: 'no_contact_record', people: [] });
    expect(await beginFamily(client, c, 'claimant')).toEqual({ kind: 'skipped', reason: 'no_contact_record' });
  });

  it('D30 — an agreement ⛔ not live ⇒ the queue reads agreement_not_live and the CHILD skips with it (⛔ no send); the STAFF rows are unaffected', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const c = await returnedClaim(client, { mustAct: 'family' });
    const person = (await readCorrectionRecipients(tx, PARIWAR_A, c.cid)).people[0]!;
    // ⭐ Positive control — with the agreement live the same slot WOULD send.
    expect(await beginFamily(client, c, person.personKey, { slotDay: 1, jobId: 'live' })).toMatchObject({ kind: 'send' });
    const contact = await tx.select().from(schema.claimContacts).where(eq(schema.claimContacts.claimCaseId, c.cid));
    await tx
      .update(schema.consentRecords)
      .set({ revokedAt: new Date() })
      .where(eq(schema.consentRecords.consentId, contact[0]!.agreementConsentId));
    expect((await readCorrectionRecipients(tx, PARIWAR_A, c.cid)).cannotRemind).toBe('agreement_not_live');
    expect(await beginFamily(client, c, person.personKey, { slotDay: 2, jobId: 'withdrawn' })).toEqual({ kind: 'skipped', reason: 'agreement_not_live' });
    const row = await readCorrectionReminder(tx, {
      pariwarId: PARIWAR_A, claimCaseId: c.cid, runId: c.runId!, slotDay: 2, recipientKey: person.personKey, purpose: 'family_sms', subjectKey: '',
    });
    expect(row).toMatchObject({ outcome: 'skipped_superseded', detail: 'agreement_not_live' });
    // ⭐ D30 stops the FAMILY only — the District Admin is still chased: a staff row of the same claim still inserts
    // (once — its slot key holds).
    const staffKey: CorrectionReminderKey = {
      pariwarId: PARIWAR_A, claimCaseId: c.cid, runId: c.runId!, slotDay: 2, recipientKey: `staff:${DA}`, purpose: 'staff_reminder', subjectKey: '',
    };
    const staffDay = addCalendarDays(c.day0!, 2);
    expect(await insertFinalCorrectionReminder(tx, { ...staffKey, sentOn: staffDay, outcome: 'recorded' })).toBe(true);
    expect(await insertFinalCorrectionReminder(tx, { ...staffKey, sentOn: staffDay, outcome: 'recorded' })).toBe(false);
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

describe.skipIf(!hasDatabase)('the correction chase — letters (AC5, D31) and the number reset', { timeout: 20000 }, () => {
  setupLiveDb();

  /** The person's day-1 attempt finalised `outcome` — found dead on day 0 + 1 (number `hash`, their version). */
  async function deadNominee(
    client: Client,
    tx: Tx,
    outcome: 'rejected_invalid_number' | 'no_target' = 'rejected_invalid_number',
    opts: { readonly nomineeMobile?: string; readonly projectedMember?: boolean } = {},
  ) {
    const c = await returnedClaim(client, { mustAct: 'family', ...opts });
    const person = (await readCorrectionRecipients(tx, PARIWAR_A, c.cid)).people[0]!;
    const deadOn = addCalendarDays(c.day0!, 1);
    const hash =
      outcome === 'no_target'
        ? null
        : opts.nomineeMobile !== undefined
          ? await currentCorrectionNumberHash(person.mobileCiphertext, person.mobileSource, PARIWAR_A, ENC)
          : 'h';
    const k: CorrectionReminderKey = {
      pariwarId: PARIWAR_A, claimCaseId: c.cid, runId: c.runId!, slotDay: 1, recipientKey: person.personKey, purpose: 'family_sms', subjectKey: '',
    };
    const claimed = await claimCorrectionReminder(tx, { ...k, sentOn: deadOn, late: false, jobId: 'j', now: new Date() });
    if (claimed.status !== 'claimed') throw new Error('claim');
    await finaliseCorrectionReminder(tx, {
      pariwarId: PARIWAR_A, reminderId: claimed.reminderId, jobId: 'j', outcome, recipientVersionId: person.versionId, recipientNumberHash: hash,
    });
    return { ...c, person, deadOn, hash };
  }

  /** A letter posted on day 0 + 2 by default — every date relative to the run (⛔ a fixed calendar date is a date bomb). */
  const letterInput = (c: { cid: ClaimId; day0: string | null }, personKey: string, postedOn = addCalendarDays(c.day0!, 2)) => ({
    pariwarId: PARIWAR_A,
    claimCaseId: c.cid,
    personKey,
    postedOn,
    trackingNumberCiphertext: 'enc:v1:tracking',
    actorId: DA,
    actorDisplay: 'District Admin One',
    crypto: ENC,
  });

  const deliver = (client: Client, cid: ClaimId, letterId: string, deliveredOn: string) =>
    recordCorrectionLetterDelivery(client, {
      pariwarId: PARIWAR_A,
      claimCaseId: cid,
      letterId,
      deliveredOn,
      screenshotStorageKey: `claims/${cid}/correction-letter/${letterId}`,
      screenshotContentType: 'image/png',
      screenshotSizeBytes: 1234,
      actorId: DA,
      actorDisplay: 'District Admin One',
    });

  it('⛔ not letter-eligible (only accepted, or ⛔ no row) ⇒ 409 not_letter_eligible', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const c = await returnedClaim(client, { mustAct: 'family' });
    const person = (await readCorrectionRecipients(tx, PARIWAR_A, c.cid)).people[0]!;
    await expect(recordCorrectionLetter(client, letterInput(c, person.personKey))).rejects.toMatchObject({ refusal: 'not_letter_eligible' });
  });

  it('⭐ eligible from `rejected_invalid_number` and from `no_target`; the SECOND only after the first\'s DELIVERY (D1, `-231` D); at most TWO (a third ⇒ limit_reached)', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    for (const outcome of ['rejected_invalid_number', 'no_target'] as const) {
      const c = await deadNominee(client, tx, outcome);
      const l1 = await recordCorrectionLetter(client, letterInput(c, c.person.personKey));
      expect(l1.sequence).toBe(1);
      // ⛔ The first letter has ⛔ no recorded delivery yet ⇒ the second is refused.
      await expect(recordCorrectionLetter(client, letterInput(c, c.person.personKey))).rejects.toMatchObject({ refusal: 'first_not_delivered' });
      await deliver(client, c.cid, l1.letterId, addCalendarDays(c.day0!, 9));
      expect((await recordCorrectionLetter(client, letterInput(c, c.person.personKey, addCalendarDays(c.day0!, 40)))).sequence).toBe(2);
      await expect(recordCorrectionLetter(client, letterInput(c, c.person.personKey, addCalendarDays(c.day0!, 41)))).rejects.toMatchObject({
        refusal: 'limit_reached',
      });
    }
  });

  it('⭐ J5 — a letter posted BEFORE the live return\'s IST date ⇒ posted_before_run; ON that date (the first run\'s day 0) is accepted', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const c = await deadNominee(client, tx);
    expect(c.day0).toBe(istDateOf(c.returnedAt)); // the floor IS the return's date (I8 — the return mark's run)
    await expect(recordCorrectionLetter(client, letterInput(c, c.person.personKey, addCalendarDays(c.day0!, -1)))).rejects.toMatchObject({
      refusal: 'posted_before_run',
    });
    expect((await recordCorrectionLetter(client, letterInput(c, c.person.personKey, c.day0!))).postedOn).toBe(c.day0);
  });

  it('⭐ D31 — ⛔ no address row for that person ⇒ address_missing; the agreement ⛔ live ⇒ agreement_not_live; ⛔ no contact record ⇒ address_missing', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const c = await deadNominee(client, tx);
    await asSuperuser(client, () => client.query('DELETE FROM claim_contact_nominees WHERE claim_case_id = $1', [c.cid]));
    await expect(recordCorrectionLetter(client, letterInput(c, c.person.personKey))).rejects.toMatchObject({ refusal: 'address_missing' });

    const d = await deadNominee(client, tx);
    const contact = await tx.select().from(schema.claimContacts).where(eq(schema.claimContacts.claimCaseId, d.cid));
    // The agreement is withdrawn AFTER the found-dead day — the letter's own check still refuses, by ITS code (I3:
    // the D30 reason is read FIRST, ⛔ never masked as `not_letter_eligible` by the empty `people`).
    await tx.update(schema.consentRecords).set({ revokedAt: new Date() }).where(eq(schema.consentRecords.consentId, contact[0]!.agreementConsentId));
    await expect(recordCorrectionLetter(client, letterInput(d, d.person.personKey))).rejects.toMatchObject({ refusal: 'agreement_not_live' });

    const e = await deadNominee(client, tx);
    // The whole contact record is gone (its nominee rows cascade) — the letter has ⛔ no address to go to.
    await asSuperuser(client, () => client.query('DELETE FROM claim_contacts WHERE claim_case_id = $1', [e.cid]));
    expect((await readCorrectionRecipients(tx, PARIWAR_A, e.cid)).cannotRemind).toBe('no_contact_record');
    await expect(recordCorrectionLetter(client, letterInput(e, e.person.personKey))).rejects.toMatchObject({ refusal: 'address_missing' });
  });

  it('⭐ the nominee\'s letter address is THEIR contact row (⛔ never member_nominee_versions.address_ciphertext)', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const c = await deadNominee(client, tx);
    const rows = await tx
      .select()
      .from(schema.claimContactNominees)
      .where(and(eq(schema.claimContactNominees.claimCaseId, c.cid), eq(schema.claimContactNominees.nomineeVersionId, c.person.versionId as never)));
    expect(rows).toHaveLength(1);
    const addr = await readCorrectionLetterAddress(tx, PARIWAR_A, c.cid, c.person.personKey);
    expect(addr.addressCiphertext).toBe(rows[0]!.addressCiphertext);
  });

  it('⭐ a delivery LATER than 14 days is ACCEPTED (⛔ never refused); one before posting is refused; a second delivery is refused', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const c = await deadNominee(client, tx);
    const postedOn = addCalendarDays(c.day0!, 2);
    const l = await recordCorrectionLetter(client, letterInput(c, c.person.personKey, postedOn));
    await expect(deliver(client, c.cid, l.letterId, addCalendarDays(postedOn, -1))).rejects.toMatchObject({ refusal: 'delivered_before_posted' });
    const lateOn = addCalendarDays(postedOn, 42);
    const late = await deliver(client, c.cid, l.letterId, lateOn);
    expect(late.deliveredOn).toBe(lateOn);
    await expect(deliver(client, c.cid, l.letterId, addCalendarDays(lateOn, 1))).rejects.toMatchObject({ refusal: 'already_delivered' });
  });

  it('⭐ a letter stays recordable after its run ENDED (`-250` #4)', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const c = await deadNominee(client, tx);
    await endCorrectionRun(client, { pariwarId: PARIWAR_A, claimCaseId: c.cid, runId: c.runId!, reason: 'day_90' });
    const l = await recordCorrectionLetter(client, letterInput(c, c.person.personKey));
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
    const before = await readCorrectionRecipients(tx, PARIWAR_A, c.cid);
    const nominee = before.people.find((p) => p.role === 'nominee')!;
    // Point the claimant at a version of ANOTHER member's declaration — it resolves to no effective nominee here.
    const [foreign] = await seedNomineeDeclaration(tx, PARIWAR_A, randomUUID());
    await tx
      .update(schema.claimContacts)
      .set({ claimantNomineeVersionId: foreign!.versionId })
      .where(eq(schema.claimContacts.claimCaseId, c.cid));
    const r = await readCorrectionRecipients(tx, PARIWAR_A, c.cid);
    expect(r.claimantUnresolved).toBe(true);
    expect(r.cannotRemind).toBeNull();
    // EXACTLY the effective nominee (an uncorrected version is its own chain root) — ⛔ no `claimant` row invented.
    expect(r.people.map((p) => [p.personKey, p.role])).toEqual([[`nominee:${nominee.versionId}`, 'nominee']]);
  });

  it('⭐ I4 / `-271` §1 — a letter DELIVERED to number A, then a 6.20 correction to number B ⇒ the child SENDS to B (the reset is detected UNDER THE LOCK)', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const c = await deadNominee(client, tx, 'rejected_invalid_number', { nomineeMobile: '9812345678', projectedMember: true });
    const l = await recordCorrectionLetter(client, letterInput(c, c.person.personKey));
    // ⭐ Delivered ON its posting day (day 0 + 2) — at or before every slot the child runs below (⛔ a delivery dated
    // after the slot that it supposedly stopped).
    await deliver(client, c.cid, l.letterId, addCalendarDays(c.day0!, 2));
    // ⭐ Positive control — while the number is still A, the delivered letter STOPS the person.
    expect(await beginFamily(client, c, c.person.personKey, { slotDay: 2, jobId: 'on-A' })).toEqual({ kind: 'skipped', reason: 'letter_delivered' });

    await applyNomineeCorrection(client, c.cid, await encryptNomineeMobile('9898989898'));
    const after = (await readCorrectionRecipients(tx, PARIWAR_A, c.cid)).people[0]!;
    expect(after.personKey).toBe(c.person.personKey);
    expect(after.versionId).not.toBe(c.person.versionId);
    expect(await currentCorrectionNumberHash(after.mobileCiphertext, after.mobileSource, PARIWAR_A, ENC)).not.toBe(c.hash);

    // ⭐ THE PROOF: a NEW number is reached afresh — ⛔ never silenced by the old number's delivered letter.
    expect(await beginFamily(client, c, c.person.personKey, { slotDay: 3, jobId: 'on-B' })).toMatchObject({
      kind: 'send',
      person: { personKey: c.person.personKey, versionId: after.versionId },
    });
  });

  it('⭐ I4 COMPOSITION CONTROL — a 6.20 correction that KEEPS the number (a new version, the SAME number A) resets ⛔ nothing: the delivered letter still stops the person, and they stay letter-eligible', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const c = await deadNominee(client, tx, 'rejected_invalid_number', { nomineeMobile: '9812345678', projectedMember: true });
    const l = await recordCorrectionLetter(client, letterInput(c, c.person.personKey));
    await deliver(client, c.cid, l.letterId, addCalendarDays(c.day0!, 2));

    // The correction re-enters the SAME number (a fresh envelope — ⛔ the old ciphertext copied).
    await applyNomineeCorrection(client, c.cid, await encryptNomineeMobile('9812345678'));
    const after = (await readCorrectionRecipients(tx, PARIWAR_A, c.cid)).people[0]!;
    expect(after.personKey).toBe(c.person.personKey);
    expect(after.versionId).not.toBe(c.person.versionId); // the version moved ⇒ the number IS hashed…
    expect(await currentCorrectionNumberHash(after.mobileCiphertext, after.mobileSource, PARIWAR_A, ENC)).toBe(c.hash); // …and is A

    // ⭐ THE PROOF (the I4 test's other half): ⛔ a reset — the old epoch stands, so the delivered letter still stops them…
    expect(await beginFamily(client, c, c.person.personKey, { slotDay: 3, jobId: 'same-A' })).toEqual({ kind: 'skipped', reason: 'letter_delivered' });
    // …and their found-dead day still makes them letter-eligible: the SECOND letter (posted on the first's delivery
    // date) records.
    await expect(assertCorrectionLetterAllowed(tx, PARIWAR_A, c.cid, c.person.personKey, { crypto: ENC })).resolves.toMatchObject({
      run: { runId: c.runId },
    });
    expect(await recordCorrectionLetter(client, letterInput(c, c.person.personKey, addCalendarDays(c.day0!, 2)))).toMatchObject({
      sequence: 2,
      runId: c.runId,
    });
    const [st] = await readReturnPersonStates(tx, PARIWAR_A, (await readCorrectionRun(tx, PARIWAR_A, c.runId!))!, [after], { crypto: ENC });
    expect(st!.track).toMatchObject({ foundDeadOn: c.deadOn, letterDelivered: true, reset: false });
  });

  it('⭐ I5 — a hash-less `error` row (the exhausted-row finaliser, a decrypt that never cleared) carries ⛔ no number: found-dead and the delivered letter STAND', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    // A REAL envelope, so the child's hash would run for real if the error row were (wrongly) read as a new number.
    const c = await deadNominee(client, tx, 'rejected_invalid_number', { nomineeMobile: '9812345678' });
    const l = await recordCorrectionLetter(client, letterInput(c, c.person.personKey));
    // ⭐ Delivered ON its posting day (day 0 + 2) — at or before every slot the child runs below (⛔ a delivery dated
    // after the slot that it supposedly stopped).
    await deliver(client, c.cid, l.letterId, addCalendarDays(c.day0!, 2));
    // Day 2 — an attempt that ended `error` with ⛔ no number and ⛔ no version (what the sweep's finaliser writes).
    const k: CorrectionReminderKey = {
      pariwarId: PARIWAR_A, claimCaseId: c.cid, runId: c.runId!, slotDay: 2, recipientKey: c.person.personKey, purpose: 'family_sms', subjectKey: '',
    };
    const claimed = await claimCorrectionReminder(tx, { ...k, sentOn: addCalendarDays(c.day0!, 2), late: false, jobId: 'j2', now: new Date() });
    if (claimed.status !== 'claimed') throw new Error('claim');
    expect(await finaliseCorrectionReminder(tx, { pariwarId: PARIWAR_A, reminderId: claimed.reminderId, jobId: 'j2', outcome: 'error', detail: 'decrypt_failed' })).toBe(true);

    const run = (await readCorrectionRun(tx, PARIWAR_A, c.runId!))!;
    const [st] = await readReturnPersonStates(tx, PARIWAR_A, run, [c.person], { crypto: ENC });
    expect(st!.track).toMatchObject({ foundDeadOn: c.deadOn, deadKind: 'dead', letterDelivered: true, reset: false });
    expect(await beginFamily(client, c, c.person.personKey, { slotDay: 3, jobId: 'j3' })).toEqual({ kind: 'skipped', reason: 'letter_delivered' });
  });

  it('⭐ J4 — `-231` D chronology: a SECOND letter posted before the first\'s delivery date ⇒ posted_before_first_delivery; ON that date is accepted', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const c = await deadNominee(client, tx);
    const l1 = await recordCorrectionLetter(client, letterInput(c, c.person.personKey));
    const deliveredOn = addCalendarDays(c.day0!, 9);
    await deliver(client, c.cid, l1.letterId, deliveredOn);
    await expect(recordCorrectionLetter(client, letterInput(c, c.person.personKey, addCalendarDays(deliveredOn, -1)))).rejects.toMatchObject({
      refusal: 'posted_before_first_delivery',
    });
    expect(await recordCorrectionLetter(client, letterInput(c, c.person.personKey, deliveredOn))).toMatchObject({ sequence: 2, postedOn: deliveredOn });
  });

  it('⭐ J5 — the refusal ORDER after D31: limit_reached → first_not_delivered → posted_before_first_delivery → posted_before_run (each proven with a date that ALSO fails every later check)', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const c = await deadNominee(client, tx);
    const beforeReturn = addCalendarDays(c.day0!, -1);
    const second = () => recordCorrectionLetter(client, letterInput(c, c.person.personKey, beforeReturn));
    const l1 = await recordCorrectionLetter(client, letterInput(c, c.person.personKey));
    // The first is undelivered — and the date is before the return ⇒ the FIRST failing check names it.
    await expect(second()).rejects.toMatchObject({ refusal: 'first_not_delivered' });
    const deliveredOn = addCalendarDays(c.day0!, 9);
    await deliver(client, c.cid, l1.letterId, deliveredOn);
    // Before the first's delivery AND before the return ⇒ the chronology refusal, ⛔ posted_before_run.
    await expect(second()).rejects.toMatchObject({ refusal: 'posted_before_first_delivery' });
    await recordCorrectionLetter(client, letterInput(c, c.person.personKey, deliveredOn));
    // Two letters ⇒ limit_reached, whatever the date.
    await expect(second()).rejects.toMatchObject({ refusal: 'limit_reached' });
  });

  it('⭐ J5 — `posted_before_run` keys on the RETURN: a letter posted during an EARLIER family run of the same return (family → staff → family) is accepted; one before the return is refused', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const c = await returnedClaim(client, { mustAct: 'family' });
    const returnedOn = istDateOf(c.returnedAt);
    const person = (await readCorrectionRecipients(tx, PARIWAR_A, c.cid)).people[0]!;
    // family (day 0) → staff (day 0 + 5) → family (day 0 + 10): the letter's run is the SECOND family run.
    await writeCorrectionMark(client, mark(c.cid, 'staff', { now: tenAmIst(addCalendarDays(c.day0!, 5)) }));
    const back = await writeCorrectionMark(client, mark(c.cid, 'family', { now: tenAmIst(addCalendarDays(c.day0!, 10)) }));
    const run2 = back.openedRun!;
    expect(run2.day0).toBe(addCalendarDays(returnedOn, 10)); // the precondition: the run starts AFTER the posting below
    // The person is found dead in the second run (its day 1).
    const claimed = await claimCorrectionReminder(tx, {
      pariwarId: PARIWAR_A, claimCaseId: c.cid, runId: run2.runId, slotDay: 1, recipientKey: person.personKey, purpose: 'family_sms', subjectKey: '',
      sentOn: addCalendarDays(run2.day0, 1), late: false, jobId: 'j', now: tenAmIst(addCalendarDays(run2.day0, 1)),
    });
    if (claimed.status !== 'claimed') throw new Error('claim');
    await finaliseCorrectionReminder(tx, {
      pariwarId: PARIWAR_A, reminderId: claimed.reminderId, jobId: 'j', outcome: 'rejected_invalid_number', recipientVersionId: person.versionId, recipientNumberHash: 'h',
    });
    await expect(recordCorrectionLetter(client, letterInput(c, person.personKey, addCalendarDays(returnedOn, -1)))).rejects.toMatchObject({
      refusal: 'posted_before_run',
    });
    // ⭐ Posted on day 3 — during the FIRST family run, before the second's day 0 — a real posting: accepted, recorded
    // against the run the letter now targets.
    const postedOn = addCalendarDays(returnedOn, 3);
    expect(await recordCorrectionLetter(client, letterInput(c, person.personKey, postedOn))).toMatchObject({ runId: run2.runId, postedOn });
  });

  it('⭐ AC18 (`-272` §2, `-273` §1/§2) — after family → staff → family the run-1 found-dead fact and letter CARRY into run 3: the queue shows the person dead from run 1, the letter counts toward the RETURN\'s limit, its delivery is recordable, the second letter is the return\'s #2, a third is refused; under D30 too', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const c = await deadNominee(client, tx);
    const key = c.person.personKey;
    const posted1 = addCalendarDays(c.day0!, 2);
    const l1 = await recordCorrectionLetter(client, letterInput(c, key, posted1));
    expect(l1.runId).toBe(c.runId); // the letter belongs to RUN 1
    // family (day 0) → staff (day 0 + 5) → family (day 0 + 10): run 3 is the live return's latest family run.
    await writeCorrectionMark(client, mark(c.cid, 'staff', { now: tenAmIst(addCalendarDays(c.day0!, 5)) }));
    const run3 = (await writeCorrectionMark(client, mark(c.cid, 'family', { now: tenAmIst(addCalendarDays(c.day0!, 10)) }))).openedRun!;
    expect(run3.runId).not.toBe(c.runId);
    const today = addCalendarDays(run3.day0, 3);
    const letter1 = { letterId: l1.letterId, sequence: 1, postedOn: posted1, deliveredOn: null, overdue: false, hasScreenshot: false, countsTowardLimit: true };

    // ⭐ (b) — the found-dead fact of run 1 CARRIES into run 3 for the same number: the queue shows the person DEAD from
    // run 1's day (⛔ "not_yet"), and the run-1 letter (and its delivery form) is listed and counts toward the limit.
    const s1 = await readCorrectionChaseSummary(tx, PARIWAR_A, c.cid, today, { crypto: ENC });
    expect(s1.run).toMatchObject({ runId: run3.runId, kind: 'family', open: true });
    expect(s1.people).toEqual([
      { personKey: key, role: 'nominee', rank: c.person.rank, status: 'dead', foundDeadOn: c.deadOn, remindersAccepted: 0, letters: [letter1] },
    ]);
    // The reader itself: every family run's letters of the return, each carrying its own run.
    expect((await readReturnFamilyLetters(tx, PARIWAR_A, c.cid, c.returnId)).map((l) => [l.letterId, l.runId])).toEqual([[l1.letterId, c.runId]]);
    // `-231` D across runs: the run-1 letter is undelivered ⇒ a run-3 letter is the SECOND and waits for it.
    await expect(recordCorrectionLetter(client, letterInput(c, key, addCalendarDays(run3.day0, 1)))).rejects.toMatchObject({
      refusal: 'first_not_delivered',
    });

    // …its delivery is recordable, and (a) a run-1 delivery stops run 3's texts to that number.
    const delivered1 = addCalendarDays(c.day0!, 11);
    expect((await deliver(client, c.cid, l1.letterId, delivered1)).deliveredOn).toBe(delivered1);
    const letter1Delivered = { ...letter1, deliveredOn: delivered1, hasScreenshot: true };
    const [st] = await readReturnPersonStates(tx, PARIWAR_A, run3, [c.person], { crypto: ENC });
    expect(st).toMatchObject({ track: { foundDeadOn: c.deadOn, letterDelivered: true }, lettersInReturn: 1, firstDeliveredInReturnOn: delivered1 });

    // ⭐ (c) — the second letter, recorded in run 3, is the RETURN's #2 (⛔ "sequence 1 again"); a third is refused.
    const posted3 = addCalendarDays(run3.day0, 2);
    const l3 = await recordCorrectionLetter(client, letterInput(c, key, posted3));
    expect(l3).toMatchObject({ runId: run3.runId, sequence: 2 });
    await expect(recordCorrectionLetter(client, letterInput(c, key, posted3))).rejects.toMatchObject({ refusal: 'limit_reached' });
    const letter3 = { letterId: l3.letterId, sequence: 2, postedOn: posted3, deliveredOn: null, overdue: false, hasScreenshot: false, countsTowardLimit: true };
    const s3 = await readCorrectionChaseSummary(tx, PARIWAR_A, c.cid, today, { crypto: ENC });
    expect(s3.people).toEqual([
      { personKey: key, role: 'nominee', rank: c.person.rank, status: 'dead', foundDeadOn: c.deadOn, remindersAccepted: 0, letters: [letter1Delivered, letter3] },
    ]);

    // ⭐ D30 (the agreement withdrawn): the record-derived line keeps BOTH runs' letters, the rank and run 1's fact.
    const contact = await tx.select().from(schema.claimContacts).where(eq(schema.claimContacts.claimCaseId, c.cid));
    await tx.update(schema.consentRecords).set({ revokedAt: new Date() }).where(eq(schema.consentRecords.consentId, contact[0]!.agreementConsentId));
    const d30 = await readCorrectionChaseSummary(tx, PARIWAR_A, c.cid, today, { crypto: ENC });
    expect(d30.cannotRemind).toBe('agreement_not_live');
    expect(d30.people).toEqual([
      { personKey: key, role: 'nominee', rank: c.person.rank, status: 'dead', foundDeadOn: c.deadOn, remindersAccepted: 0, letters: [letter1Delivered, letter3] },
    ]);
  });

  it('⭐ AC18 — a 6.20 number change between runs resets (a)/(b) for the new number, ⛔ the cap: two letters on the old number keep the person capped', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const c = await deadNominee(client, tx, 'rejected_invalid_number', { nomineeMobile: '9812345678', projectedMember: true });
    const key = c.person.personKey;
    const l1 = await recordCorrectionLetter(client, letterInput(c, key));
    await deliver(client, c.cid, l1.letterId, addCalendarDays(c.day0!, 3));
    await recordCorrectionLetter(client, letterInput(c, key, addCalendarDays(c.day0!, 3)));
    await writeCorrectionMark(client, mark(c.cid, 'staff', { now: tenAmIst(addCalendarDays(c.day0!, 5)) }));
    await applyNomineeCorrection(client, c.cid, await encryptNomineeMobile('9898989898'));
    const run3 = (await writeCorrectionMark(client, mark(c.cid, 'family', { now: tenAmIst(addCalendarDays(c.day0!, 10)) }))).openedRun!;
    const person = (await readCorrectionRecipients(tx, PARIWAR_A, c.cid)).people[0]!;
    const [st] = await readReturnPersonStates(tx, PARIWAR_A, run3, [person], { crypto: ENC });
    // (a)/(b) afresh for the new number …
    expect(st!.track).toMatchObject({ reset: true, foundDeadOn: null, letterDelivered: false });
    // … ⛔ the cap: two letters in the return, whatever the number.
    expect(st).toMatchObject({ lettersInReturn: 2 });
    expect(isPersonAtLetterCap(st!)).toBe(true);
  });

  it('⭐ K1 — a person who LEFT the recipient set (a W6 (b) rewrite of the contact record) keeps their letter on the queue, and its delivery stays recordable', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const c = await returnedClaim(client, { mustAct: 'family' });
    const nominee = (await readCorrectionRecipients(tx, PARIWAR_A, c.cid)).people[0]!;
    // The claimant is a person who is NONE of the nominees (the block side), with a REAL number.
    await tx
      .update(schema.claimContacts)
      .set({
        claimantNomineeVersionId: null,
        claimantNameCiphertext: 'enc:v1:claimant-name',
        claimantMobileCiphertext: await encryptClaimantMobile('9811112222'),
        claimantAddressCiphertext: 'enc:v1:claimant-address',
      })
      .where(eq(schema.claimContacts.claimCaseId, c.cid));
    const claimant = (await readCorrectionRecipients(tx, PARIWAR_A, c.cid)).people.find((p) => p.personKey === 'claimant');
    if (claimant === undefined) throw new Error('[K1] the block-side claimant is not a recipient');
    // Found dead on day 1 — the dead row carries the claimant's REAL number hash (the letter's precondition hashes it).
    const deadOn = addCalendarDays(c.day0!, 1);
    const claimed = await claimCorrectionReminder(tx, {
      pariwarId: PARIWAR_A, claimCaseId: c.cid, runId: c.runId!, slotDay: 1, recipientKey: 'claimant', purpose: 'family_sms', subjectKey: '',
      sentOn: deadOn, late: false, jobId: 'j', now: tenAmIst(deadOn),
    });
    if (claimed.status !== 'claimed') throw new Error('claim');
    await finaliseCorrectionReminder(tx, {
      pariwarId: PARIWAR_A, reminderId: claimed.reminderId, jobId: 'j', outcome: 'rejected_invalid_number', recipientVersionId: null,
      recipientNumberHash: await currentCorrectionNumberHash(claimant.mobileCiphertext, claimant.mobileSource, PARIWAR_A, ENC),
    });
    const postedOn = addCalendarDays(c.day0!, 2);
    const l = await recordCorrectionLetter(client, letterInput(c, 'claimant', postedOn));

    // W6 (b) — the contact record is rewritten: the claimant IS nominee 1 now ⇒ ⛔ a `claimant` recipient any more.
    await tx
      .update(schema.claimContacts)
      .set({ claimantNomineeVersionId: nominee.versionId as never, claimantNameCiphertext: null, claimantMobileCiphertext: null, claimantAddressCiphertext: null })
      .where(eq(schema.claimContacts.claimCaseId, c.cid));
    expect((await readCorrectionRecipients(tx, PARIWAR_A, c.cid)).people.map((p) => p.personKey)).toEqual([nominee.personKey]);

    // ⭐ THE PROOF: the person who left keeps their line — from the records (⛔ no rank: they hold no effective one).
    const letter = { letterId: l.letterId, sequence: 1, postedOn, deliveredOn: null, overdue: false, hasScreenshot: false, countsTowardLimit: true };
    const s = await readCorrectionChaseSummary(tx, PARIWAR_A, c.cid, addCalendarDays(c.day0!, 3), { crypto: ENC });
    expect(s.people.map((p) => p.personKey)).toEqual([nominee.personKey, 'claimant']);
    expect(s.people[1]).toEqual({
      personKey: 'claimant', role: 'claimant', rank: null, status: 'dead', foundDeadOn: deadOn, remindersAccepted: 0, letters: [letter],
    });
    const deliveredOn = addCalendarDays(c.day0!, 3);
    expect((await deliver(client, c.cid, l.letterId, deliveredOn)).deliveredOn).toBe(deliveredOn);
    expect((await readCorrectionChaseSummary(tx, PARIWAR_A, c.cid, addCalendarDays(c.day0!, 3), { crypto: ENC })).people[1]!.letters).toEqual([
      { ...letter, deliveredOn, hasScreenshot: true },
    ]);
  });

  it('⭐ J1 / J2 — the person\'s CURRENT number must be hashed and CANNOT be (a KMS outage) ⇒ the precondition AND the record fail CLOSED (CorrectionNumberUnverifiedError, ⛔ no letter row); the queue flags numberUnverified', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const c = await deadNominee(client, tx, 'rejected_invalid_number', { nomineeMobile: '9812345678', projectedMember: true });
    const today = addCalendarDays(c.day0!, 3);
    // ⭐ Positive control — the number has ⛔ not moved (the dead row's version IS the person's): ⛔ no hash is needed,
    // so the outage changes nothing — the letter is allowed and the queue is ⛔ flagged.
    await expect(assertCorrectionLetterAllowed(tx, PARIWAR_A, c.cid, c.person.personKey, { crypto: KMS_DOWN })).resolves.toMatchObject({
      run: { runId: c.runId },
    });
    expect((await readCorrectionChaseSummary(tx, PARIWAR_A, c.cid, today, { crypto: KMS_DOWN })).numberUnverified).toBe(false);

    // A 6.20 correction moves the person to a NEW version (number B) — eligibility now rests on the current number.
    await applyNomineeCorrection(client, c.cid, await encryptNomineeMobile('9898989898'));
    const unverified = { name: 'CorrectionNumberUnverifiedError', claimCaseId: c.cid, personKey: c.person.personKey };
    const allowed = () => assertCorrectionLetterAllowed(tx, PARIWAR_A, c.cid, c.person.personKey, { crypto: KMS_DOWN });
    await expect(allowed()).rejects.toBeInstanceOf(CorrectionNumberUnverifiedError);
    await expect(allowed()).rejects.toMatchObject(unverified);
    const record = recordCorrectionLetter(client, { ...letterInput(c, c.person.personKey), crypto: KMS_DOWN });
    await expect(record).rejects.toBeInstanceOf(CorrectionNumberUnverifiedError);
    expect(await tx.select().from(schema.claimCorrectionLetters).where(eq(schema.claimCorrectionLetters.claimCaseId, c.cid))).toEqual([]);
    // ⭐ The verdict really rests on the hash: with the KMS UP the new number is a fresh epoch ⇒ ⛔ letter-eligible —
    // the outage path would otherwise have granted the letter on the OLD number's found-dead.
    await expect(recordCorrectionLetter(client, letterInput(c, c.person.personKey))).rejects.toMatchObject({ refusal: 'not_letter_eligible' });

    // J2 — the queue surfaces the outage (⛔ silently judged on the old epoch), and ⛔ flags nothing once it clears.
    expect((await readCorrectionChaseSummary(tx, PARIWAR_A, c.cid, today, { crypto: KMS_DOWN })).numberUnverified).toBe(true);
    expect((await readCorrectionChaseSummary(tx, PARIWAR_A, c.cid, today, { crypto: ENC })).numberUnverified).toBe(false);
  });

  it('⭐ the CHILD throws CorrectionNumberHashUnavailableError when its number hash fails and only a delivered letter would stop the send — ⛔ no row for the slot; the KMS back ⇒ it sends', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const c = await deadNominee(client, tx, 'rejected_invalid_number', { nomineeMobile: '9812345678', projectedMember: true });
    const key = c.person.personKey;
    const l = await recordCorrectionLetter(client, letterInput(c, key));
    // ⭐ Delivered ON its posting day (day 0 + 2) — at or before every slot the child runs below (⛔ a delivery dated
    // after the slot that it supposedly stopped).
    await deliver(client, c.cid, l.letterId, addCalendarDays(c.day0!, 2));
    // ⭐ Control — the number has ⛔ not moved: ⛔ no hash needed, the outage changes nothing, the letter stops them.
    expect(await beginFamily(client, c, key, { slotDay: 2, jobId: 'on-A', crypto: KMS_DOWN })).toEqual({ kind: 'skipped', reason: 'letter_delivered' });

    await applyNomineeCorrection(client, c.cid, await encryptNomineeMobile('9898989898'));
    await expect(beginFamily(client, c, key, { slotDay: 3, jobId: 'kms-down', crypto: KMS_DOWN })).rejects.toBeInstanceOf(
      CorrectionNumberHashUnavailableError,
    );
    // ⛔ Never a silent `skipped_superseded` that would lose the slot over a KMS blip — ⛔ no row at all.
    const slot3: CorrectionReminderKey = {
      pariwarId: PARIWAR_A, claimCaseId: c.cid, runId: c.runId!, slotDay: 3, recipientKey: key, purpose: 'family_sms', subjectKey: '',
    };
    expect(await readCorrectionReminder(tx, slot3)).toBeNull();
    // The job's retry once the KMS is back: the new number is reached afresh (I4).
    expect(await beginFamily(client, c, key, { slotDay: 3, jobId: 'kms-down' })).toMatchObject({ kind: 'send' });
  });

  for (const reason of ['agreement_not_live', 'no_contact_record'] as const) {
    it(`⭐ J6 / J7 — under D30 (${reason}) the queue STILL lists the person and their letters (from the run's own records, ⛔ no crypto) and advertises ⛔ no next reminder`, async () => {
      const { client, tx } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const c = await deadNominee(client, tx);
      const key = c.person.personKey;
      const l1 = await recordCorrectionLetter(client, letterInput(c, key));
      const deliveredOn = addCalendarDays(c.day0!, 9);
      await deliver(client, c.cid, l1.letterId, deliveredOn);
      const today = addCalendarDays(c.day0!, 12);
      const letter = {
        letterId: l1.letterId, sequence: 1, postedOn: addCalendarDays(c.day0!, 2), deliveredOn, overdue: false, hasScreenshot: true, countsTowardLimit: true,
      };
      // ⭐ Positive control — before D30 the same person and letter come from the recipient read.
      const before = await readCorrectionChaseSummary(tx, PARIWAR_A, c.cid, today);
      expect(before.cannotRemind).toBeNull();
      expect(before.people).toEqual([
        { personKey: key, role: 'nominee', rank: c.person.rank, status: 'dead', foundDeadOn: c.deadOn, remindersAccepted: 0, letters: [letter] },
      ]);

      if (reason === 'agreement_not_live') {
        const contact = await tx.select().from(schema.claimContacts).where(eq(schema.claimContacts.claimCaseId, c.cid));
        await tx.update(schema.consentRecords).set({ revokedAt: new Date() }).where(eq(schema.consentRecords.consentId, contact[0]!.agreementConsentId));
      } else {
        await asSuperuser(client, () => client.query('DELETE FROM claim_contacts WHERE claim_case_id = $1', [c.cid]));
      }
      const s = await readCorrectionChaseSummary(tx, PARIWAR_A, c.cid, today);
      expect(s.cannotRemind).toBe(reason);
      // ⭐ The person and their letter survive D30 — role off the key's format; the rank from the EFFECTIVE declaration
      // (it is `effective` here — only D30 `undetermined` leaves it unknown), through the recipients' own mapping.
      expect(s.people).toEqual([
        { personKey: key, role: 'nominee', rank: c.person.rank, status: 'dead', foundDeadOn: c.deadOn, remindersAccepted: 0, letters: [letter] },
      ]);
      expect(c.person.rank).toBe(1); // ⛔ a vacuous match on two nulls
      expect(s.numberUnverified).toBe(false);
      // J7 — the family run is open, but nobody is texted under D30 ⇒ ⛔ no next reminder advertised.
      expect(s.run).toMatchObject({ kind: 'family', open: true, nextReminderOn: null });
    });
  }
});
