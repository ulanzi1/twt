// The DELIVERY LADDER's RECORD — its writes and the ladder SMS's pre-send re-check — Story 6.37c (Task 4.1; AC1–AC3, AC6;
// LD2–LD5, LD9; I5, I6, I8). Transport-free: ⛔ no HTTP, ⛔ no send, ⛔ no audit; the only crypto is the correction
// chase's CURRENT number hash under its lock (the chase child's own rule) — the certificate chase's hashes are taken
// BEFORE its claim-row lock and passed in (CR7).
//
// ⭐ EVERY start and state move happens under the CHASE'S lock (`acquireCorrectionChaseLock` / `lockCertificateClaim`) —
// the lock the closure request / decide take, so `ladder_running` at decide is ⛔ a check-then-act race (LD5, LD8).
// ⭐ The record is the dedup: a start is `INSERT … ON CONFLICT DO NOTHING` over the two UNIQUEs (one running ladder per
// person — I5; a row the origin of one ladder, ever); a state move is a compare-and-set `WHERE state = 'running'`; a
// step move `WHERE sms<N>_state = 'pending'`. A ladder SMS is a NEW `ladder_sms` row in the chase's OWN send table,
// claimed through the chase's OWN claim accessor (I2 — ⛔ a send row updated outside its finaliser semantics).
// ⛔⛔ Nothing here decides anything about a claim: ⛔ a decision writer, ⛔ a claim event (the no-decision fences).

import { and, eq, isNull, sql } from 'drizzle-orm';
import type pg from 'pg';

import { bindScopedDb, type Db } from '../db.js';
import type { FieldCryptoDeps } from '../encryption/field-classes.js';
import type { ClaimId, PariwarId } from '../ids/index.js';
import {
  claimContactLadders,
  type ClaimContactLadderRow,
  type ContactLadderChase,
  type ContactLadderState,
  type ContactLadderStepState,
} from '../schema/claim_contact_ladders.js';
import {
  type CertificateNumberHash,
  type CertificatePerson,
  readCertificateRecipients,
  readCertificateRun,
  readClaimCertificateFamilyRows,
  lockCertificateClaim,
  samePersonSource,
} from './certificate-reminder.js';
import {
  CertificateRecipientsMovedError,
  certificateLadderStopReason,
  claimCertificateReminder,
  insertFinalCertificateReminder,
  skipCertificateReminder,
} from './certificate-reminder-record.js';
import { CERTIFICATE_REMINDER_DAYS, certificateRunDay } from './certificate-reminder-schedule.js';
import {
  LADDER_CONCLUDE_AFTER_DAYS,
  LADDER_SMS3_AFTER_DAYS,
  type ContactLadderAsk,
  ladderEndReason,
  ladderStepGate,
  nextLadderStepDate,
} from './contact-ladder.js';
import {
  readClaimCertificateLadderSmsRows,
  readClaimContactCalls,
  readReturnLadderSmsRows,
} from './contact-ladder-read.js';
import { type CorrectionPerson, acquireCorrectionChaseLock, readCorrectionRun } from './correction-chase.js';
import { latestRunOfReturn } from './correction-closure-jobs.js';
import { sameNumberHash } from './correction-crypto.js';
import {
  CorrectionNumberHashUnavailableError,
  type CorrectionReminderKey,
  claimCorrectionReminder,
  correctionFamilyStopReason,
  insertFinalCorrectionReminder,
  readReturnFamilyRows,
  skipCorrectionReminder,
} from './correction-reminder-record.js';
import { correctionReminderSchedule, correctionRunDay } from './correction-schedule.js';

// ── Reads + writes of the ladder row ───────────────────────────────────────────────────────────────────────────

/** One ladder by id (tenant-scoped), or `null`. */
export async function readContactLadder(db: Db, pariwarId: PariwarId, ladderId: string): Promise<ClaimContactLadderRow | null> {
  const [row] = await db
    .select()
    .from(claimContactLadders)
    .where(and(eq(claimContactLadders.pariwarId, pariwarId), eq(claimContactLadders.ladderId, ladderId)))
    .limit(1);
  return row ?? null;
}

/** A NEW ladder (LD5). `null` when a UNIQUE fired (another sweep started it, or the person already has one running). */
export async function insertContactLadder(
  db: Db,
  v: {
    readonly pariwarId: PariwarId;
    readonly claimCaseId: ClaimId;
    readonly chase: ContactLadderChase;
    readonly runId: string;
    readonly returnDecisionId: string | null;
    readonly personKey: string;
    readonly recipientNumberHash: string;
    readonly originRowId: string;
    readonly originSentOn: string;
    readonly whatsappStep: string;
    readonly sms2DueOn: string;
  },
): Promise<ClaimContactLadderRow | null> {
  const rows = await db.insert(claimContactLadders).values(v).onConflictDoNothing().returning();
  return rows[0] ?? null;
}

/** END a running ladder (compare-and-set on `running`). Returns whether it moved. */
export async function endContactLadder(
  db: Db,
  input: {
    readonly pariwarId: PariwarId;
    readonly ladderId: string;
    readonly state: Exclude<ContactLadderState, 'running' | 'concluded_undelivered'>;
    readonly detail: string;
  },
): Promise<boolean> {
  const rows = await db
    .update(claimContactLadders)
    .set({ state: input.state, endDetail: input.detail, endedAt: sql`clock_timestamp()`, updatedAt: sql`clock_timestamp()` })
    .where(
      and(
        eq(claimContactLadders.pariwarId, input.pariwarId),
        eq(claimContactLadders.ladderId, input.ladderId),
        eq(claimContactLadders.state, 'running'),
      ),
    )
    .returning({ ladderId: claimContactLadders.ladderId });
  return rows.length > 0;
}

/** CONCLUDE a running ladder undelivered on `on` (LD5 — `-350` ruling 1). Compare-and-set on `running`. */
export async function concludeContactLadder(
  db: Db,
  input: { readonly pariwarId: PariwarId; readonly ladderId: string; readonly on: string; readonly detail?: string },
): Promise<boolean> {
  const rows = await db
    .update(claimContactLadders)
    .set({
      state: 'concluded_undelivered',
      concludedOn: input.on,
      endDetail: input.detail ?? null,
      endedAt: sql`clock_timestamp()`,
      updatedAt: sql`clock_timestamp()`,
    })
    .where(
      and(
        eq(claimContactLadders.pariwarId, input.pariwarId),
        eq(claimContactLadders.ladderId, input.ladderId),
        eq(claimContactLadders.state, 'running'),
      ),
    )
    .returning({ ladderId: claimContactLadders.ladderId });
  return rows.length > 0;
}

/**
 * RESOLVE a pending step of a running ladder (LD3): its state, the date it resolved, the row that carried it, and the
 * NEXT date (SMS 2 ⇒ SMS 3's due date; SMS 3 ⇒ the conclusion date). Compare-and-set on `running` + the step `pending`.
 */
export async function resolveContactLadderStep(
  db: Db,
  input: {
    readonly pariwarId: PariwarId;
    readonly ladderId: string;
    readonly step: 2 | 3;
    readonly state: Exclude<ContactLadderStepState, 'pending'>;
    readonly on: string;
    readonly rowId: string | null;
    readonly nextOn: string;
  },
): Promise<boolean> {
  const t = claimContactLadders;
  const set =
    input.step === 2
      ? { sms2State: input.state, sms2On: input.on, sms2RowId: input.rowId, sms3DueOn: input.nextOn }
      : { sms3State: input.state, sms3On: input.on, sms3RowId: input.rowId, concludeOn: input.nextOn };
  const rows = await db
    .update(t)
    .set({ ...set, updatedAt: sql`clock_timestamp()` })
    .where(
      and(
        eq(t.pariwarId, input.pariwarId),
        eq(t.ladderId, input.ladderId),
        eq(t.state, 'running'),
        eq(input.step === 2 ? t.sms2State : t.sms3State, 'pending'),
      ),
    )
    .returning({ ladderId: t.ladderId });
  return rows.length > 0;
}

/**
 * LD4 — the next visit of a `satisfied` step: the scheduled row that carried it is FOUND (`rowId` — its id recorded), or
 * ⛔ (`rowId: null` — it never went: `skipped:scheduled_not_sent`, the clock runs on, ⛔ a resend). Compare-and-set on
 * the step still `satisfied` with ⛔ row (any ladder state — a record correction).
 */
export async function settleSatisfiedContactLadderStep(
  db: Db,
  input: { readonly pariwarId: PariwarId; readonly ladderId: string; readonly step: 2 | 3; readonly rowId: string | null },
): Promise<boolean> {
  const t = claimContactLadders;
  const stateCol = input.step === 2 ? t.sms2State : t.sms3State;
  const rowCol = input.step === 2 ? t.sms2RowId : t.sms3RowId;
  const set =
    input.rowId !== null
      ? input.step === 2
        ? { sms2RowId: input.rowId }
        : { sms3RowId: input.rowId }
      : input.step === 2
        ? { sms2State: 'skipped:scheduled_not_sent' as const }
        : { sms3State: 'skipped:scheduled_not_sent' as const };
  const rows = await db
    .update(t)
    .set({ ...set, updatedAt: sql`clock_timestamp()` })
    .where(and(eq(t.pariwarId, input.pariwarId), eq(t.ladderId, input.ladderId), eq(stateCol, 'satisfied'), isNull(rowCol)))
    .returning({ ladderId: t.ladderId });
  return rows.length > 0;
}

/** LD9 — the date the concluded ladder's ONE ask was written (compare-and-set on ⛔ date yet). */
export async function markContactLadderEscalated(
  db: Db,
  input: { readonly pariwarId: PariwarId; readonly ladderId: string; readonly on: string },
): Promise<boolean> {
  const t = claimContactLadders;
  const rows = await db
    .update(t)
    .set({ escalatedOn: input.on, updatedAt: sql`clock_timestamp()` })
    .where(
      and(
        eq(t.pariwarId, input.pariwarId),
        eq(t.ladderId, input.ladderId),
        eq(t.state, 'concluded_undelivered'),
        isNull(t.escalatedOn),
      ),
    )
    .returning({ ladderId: t.ladderId });
  return rows.length > 0;
}

// ── The subject keys (LD2) ─────────────────────────────────────────────────────────────────────────────────────

/** A ladder SMS's `subject_key` — ONE row per ladder step (the per-ladder partial UNIQUE). */
export function ladderSmsSubjectKey(ladderId: string, step: 2 | 3): string {
  return `ladder:${ladderId}:${String(step)}`;
}

/** A ladder's ONE ask's `subject_key`. */
export function ladderEscalationSubjectKey(ladderId: string): string {
  return `ladder:${ladderId}`;
}

// ── The ladder SMS's pre-send re-check (the child's begin) ─────────────────────────────────────────────────────

export type BeginLadderSendResult<P> =
  | {
      readonly kind: 'send';
      readonly reminderId: string;
      readonly attemptCount: number;
      readonly person: P;
      readonly contactLocale: 'hi' | 'en';
    }
  /** The step was RECORDED without a send (`satisfied` / a skip — LD3, LD4, PQ3). */
  | { readonly kind: 'resolved'; readonly state: Exclude<ContactLadderStepState, 'pending' | 'sent'> }
  /** The ladder ENDED in the re-check (a delivered message, a reached call, a number change, a stop). */
  | { readonly kind: 'ended'; readonly state: ContactLadderState; readonly detail: string }
  | {
      readonly kind: 'noop';
      readonly reason: 'ladder_not_running' | 'step_not_due' | 'step_resolved' | 'already_final' | 'held_by_other';
      /** K4 — this job's own `attempting` row carried an attempt's detail and was EXPIRED `error`: ALARM (ids only). */
      readonly expiredAttempt?: true;
    };

/** The step's state / row / due date on a ladder row. */
function stepOf(l: ClaimContactLadderRow, step: 2 | 3) {
  return step === 2
    ? { state: l.sms2State, rowId: l.sms2RowId, dueOn: l.sms2DueOn as string | null }
    : { state: l.sms3State, rowId: l.sms3RowId, dueOn: l.sms3DueOn };
}

/** The next date after a step resolved on `on` (LD3's outcome table): `sent` counts from the send, the rest from the due date. */
function nextAfter(step: 2 | 3, anchor: string, on: string): string {
  return nextLadderStepDate(anchor, step === 2 ? LADDER_SMS3_AFTER_DAYS : LADDER_CONCLUDE_AFTER_DAYS, on);
}

/**
 * ⭐ THE CORRECTION LADDER SMS's RE-CHECK, in ONE transaction under the TRUSTEE lock (AC2, AC3): the ladder still runs
 * and the step is due (or THIS job's retry of its own claimed row); the EXTRACTED stops (`correctionFamilyStopReason`,
 * `forLadder` — I6, ⛔ a copy) on the ladder's ORIGIN run; the ends (`ladderEndReason` — a delivered message, a reached
 * call, a number change); then the step gate (`ladderStepGate` — the day-90 horizon, a scheduled day, ⛔ two texts to one
 * number in one chase today — T22, counting an `attempting` row whose hash is still NULL by its person's CURRENT hash);
 * a failed current-number hash ⇒ `skipped:hash_unavailable`. Only then the `ladder_sms` row is claimed `attempting`
 * (the chase's own claim accessor — I2) and the step recorded `sent` (the attempt is made — LD3's outcome table: every
 * outcome of a send counts the next date from its `sent_on`). The caller commits, THEN decrypts and sends.
 */
export async function beginCorrectionLadderSend(
  client: pg.PoolClient,
  input: {
    readonly pariwarId: PariwarId;
    readonly claimCaseId: ClaimId;
    readonly ladderId: string;
    readonly step: 2 | 3;
    readonly sentOn: string;
    readonly jobId: string;
    readonly now: Date;
    readonly crypto: FieldCryptoDeps;
  },
): Promise<BeginLadderSendResult<CorrectionPerson>> {
  await acquireCorrectionChaseLock(client, input.pariwarId, input.claimCaseId);
  const db = bindScopedDb(client);
  const l = await readContactLadder(db, input.pariwarId, input.ladderId);
  if (l === null || l.claimCaseId !== input.claimCaseId || l.chase !== 'correction' || l.returnDecisionId === null) {
    return { kind: 'noop', reason: 'ladder_not_running' };
  }
  const run = await readCorrectionRun(db, input.pariwarId, l.runId);
  if (run === null) return { kind: 'noop', reason: 'ladder_not_running' };
  const key: CorrectionReminderKey = {
    pariwarId: input.pariwarId,
    claimCaseId: input.claimCaseId,
    runId: l.runId,
    slotDay: Math.max(0, correctionRunDay(run.day0, input.sentOn)),
    recipientKey: l.personKey,
    purpose: 'ladder_sms',
    subjectKey: ladderSmsSubjectKey(l.ladderId, input.step),
  };
  /** A failed re-check: THIS job's own `attempting` row (if any) is skipped — or EXPIRED when an attempt ran (K4). */
  const giveUp = async (reason: string): Promise<boolean> =>
    (await skipCorrectionReminder(db, { ...key, sentOn: input.sentOn, late: false, jobId: input.jobId, reason })).expiredAttempt;
  if (l.state !== 'running') {
    const expired = await giveUp('ladder_not_running');
    return expired ? { kind: 'noop', reason: 'ladder_not_running', expiredAttempt: true } : { kind: 'noop', reason: 'ladder_not_running' };
  }
  const s = stepOf(l, input.step);
  const retry = s.state === 'sent' && s.rowId !== null;
  if (!retry) {
    if (s.state !== 'pending') return { kind: 'noop', reason: 'step_resolved' };
    if (input.step === 3 && l.sms2State === 'pending') return { kind: 'noop', reason: 'step_not_due' };
    if (s.dueOn === null || s.dueOn > input.sentOn) return { kind: 'noop', reason: 'step_not_due' };
  }

  // ── The stops (I6) and the ends (LD5) ──
  let hashFailed = false;
  let check: Awaited<ReturnType<typeof correctionFamilyStopReason>> | null = null;
  try {
    check = await correctionFamilyStopReason(db, {
      pariwarId: input.pariwarId,
      claimCaseId: input.claimCaseId,
      runId: l.runId,
      personKey: l.personKey,
      crypto: input.crypto,
      forLadder: true,
    });
  } catch (err) {
    if (!(err instanceof CorrectionNumberHashUnavailableError)) throw err;
    hashFailed = true;
  }
  const stop = check === null ? null : check.stop;
  const personState = check !== null && check.stop === null ? check.personState : undefined;
  if (personState?.hashFailed === true) hashFailed = true;
  const rows = await readReturnFamilyRows(db, input.pariwarId, input.claimCaseId, l.returnDecisionId);
  const ladderRows = await readReturnLadderSmsRows(db, input.pariwarId, input.claimCaseId, l.returnDecisionId);
  const calls = await readClaimContactCalls(db, input.pariwarId, input.claimCaseId, [l.personKey]);
  const origin = rows.find((r) => r.reminderId === l.originRowId);
  const mine = [...rows, ...ladderRows].filter((r) => r.recipientKey === l.personKey);
  const satisfying = [...rows, ...ladderRows].filter(
    (r) => r.reminderId !== undefined && (r.reminderId === l.sms2RowId || r.reminderId === l.sms3RowId),
  );
  const end = ladderEndReason({
    ladder: l,
    originCreatedAt: origin?.createdAt ?? l.createdAt,
    rows: mine,
    satisfyingRows: satisfying,
    calls,
    currentNumberHash: hashFailed ? undefined : personState?.currentNumberHash,
    stop: stop === null ? null : String(stop),
  });
  if (end !== null) {
    await endContactLadder(db, { pariwarId: input.pariwarId, ladderId: l.ladderId, state: end.state, detail: end.detail });
    await giveUp(`ladder_${end.state}`);
    return { kind: 'ended', state: end.state, detail: end.detail };
  }
  // ⛔ An end and ⛔ a stop ⇒ `check` is the passing check — or `null` (the hash failed while a delivered letter was
  // all that could stop the send: the person's state is unknown today).
  const ok = check !== null && check.stop === null ? check : null;
  const resolve = async (
    state: Exclude<ContactLadderStepState, 'pending' | 'sent'>,
  ): Promise<BeginLadderSendResult<CorrectionPerson>> => {
    await resolveContactLadderStep(db, {
      pariwarId: input.pariwarId,
      ladderId: l.ladderId,
      step: input.step,
      state,
      on: input.sentOn,
      rowId: null,
      nextOn: nextAfter(input.step, s.dueOn!, input.sentOn),
    });
    return { kind: 'resolved', state };
  };
  if (ok === null || hashFailed) {
    // LD3 — a failed hash before the send ⇒ `skipped:hash_unavailable` (the clock runs on — ⛔ a hold). A RETRY of an
    // already-claimed row is left to the next morning's exhausted finaliser (`error` ⇒ the step stays `sent`).
    return retry ? { kind: 'noop', reason: 'held_by_other' } : resolve('skipped:hash_unavailable');
  }

  if (!retry) {
    // ── The step gate (LD3, LD4, I8; PQ3 A) ──
    const runDay = correctionRunDay(run.day0, input.sentOn);
    const scheduledToday =
      run.endedAt === null &&
      correctionReminderSchedule(run.kind, run.day0).some((x) => x.kind === 'reminder' && x.day === runDay);
    const myHash = ok.personState.currentNumberHash ?? ok.personState.track.epochRows.at(-1)?.recipientNumberHash ?? null;
    const sentToNumberToday = correctionNumberTextedOn({
      numberHash: l.recipientNumberHash,
      on: input.sentOn,
      exceptSubjectKey: key.subjectKey,
      currentHashOf: (personKey) => (personKey === l.personKey ? myHash : null),
      rows,
      ladderRows,
    });
    const verdict = ladderStepGate({ chase: 'correction', runDay, paused: false, scheduledToday, sentToNumberToday });
    if (verdict !== 'send') return resolve(verdict);
  }

  const claimed = await claimCorrectionReminder(db, { ...key, sentOn: input.sentOn, late: false, jobId: input.jobId, now: input.now });
  if (claimed.status !== 'claimed') return { kind: 'noop', reason: claimed.status };
  if (!retry) {
    await resolveContactLadderStep(db, {
      pariwarId: input.pariwarId,
      ladderId: l.ladderId,
      step: input.step,
      state: 'sent',
      on: input.sentOn,
      rowId: claimed.reminderId,
      nextOn: nextAfter(input.step, input.sentOn, input.sentOn),
    });
  }
  return {
    kind: 'send',
    reminderId: claimed.reminderId,
    attemptCount: claimed.attemptCount,
    person: ok.person,
    contactLocale: ok.contactLocale,
  };
}

/**
 * I8 / T22 — has THIS NUMBER already had a `family_sms` or `ladder_sms` row of this chase today (any person of the claim —
 * one human can be two person keys)? A row counts when its hash is the number's, or it is still `attempting` with a NULL
 * hash (the correction chase writes the hash at finalise) and its person's CURRENT hash is the number's. A
 * `skipped_superseded` marker sent nothing. ⛔ The step's own row. Pure.
 */
export function correctionNumberTextedOn(input: {
  readonly numberHash: string;
  readonly on: string;
  readonly exceptSubjectKey: string;
  readonly currentHashOf: (personKey: string) => string | null;
  readonly rows: readonly { readonly recipientKey: string; readonly sentOn: string; readonly outcome: string; readonly recipientNumberHash: string | null }[];
  readonly ladderRows: readonly {
    readonly recipientKey: string;
    readonly sentOn: string;
    readonly outcome: string;
    readonly recipientNumberHash: string | null;
    readonly subjectKey: string;
  }[];
}): boolean {
  const counts = (r: { recipientKey: string; sentOn: string; outcome: string; recipientNumberHash: string | null }): boolean => {
    if (r.sentOn !== input.on || r.outcome === 'skipped_superseded') return false;
    if (r.recipientNumberHash !== null) return sameNumberHash(r.recipientNumberHash, input.numberHash);
    if (r.outcome !== 'attempting') return false;
    const h = input.currentHashOf(r.recipientKey);
    return h !== null && sameNumberHash(h, input.numberHash);
  };
  return input.rows.some(counts) || input.ladderRows.some((r) => r.subjectKey !== input.exceptSubjectKey && counts(r));
}

/**
 * ⭐ THE CERTIFICATE LADDER SMS's RE-CHECK, under the CLAIM-ROW lock (the caller set `lock_timeout` first and hashed EVERY
 * person's current number BEFORE it — CR7, ⛔ KMS here): the ladder still runs and the step is due (or this job's own
 * retry); the recipients ⛔ moved since the hashes (else `CertificateRecipientsMovedError` — the job retries); the
 * COMPOSED stops over the ORIGIN run (`certificateLadderStopReason`); the ends; the step gate (the 180-day horizon, a
 * non-ending PAUSE ⇒ `skipped:paused`, a scheduled day, ⛔ two texts to one number today); then the `ladder_sms` row is
 * claimed `attempting` WITH the number hash (CR7) and the step recorded `sent`.
 */
export async function beginCertificateLadderSend(
  client: pg.PoolClient,
  input: {
    readonly pariwarId: PariwarId;
    readonly claimCaseId: ClaimId;
    readonly ladderId: string;
    readonly step: 2 | 3;
    readonly sentOn: string;
    readonly jobId: string;
    readonly now: Date;
    readonly prelock: {
      readonly people: readonly CertificatePerson[];
      readonly hashes: ReadonlyMap<string, CertificateNumberHash>;
    };
  },
): Promise<BeginLadderSendResult<CertificatePerson>> {
  const db = bindScopedDb(client);
  if ((await lockCertificateClaim(db, input.pariwarId, input.claimCaseId)) === null) return { kind: 'noop', reason: 'ladder_not_running' };
  const l = await readContactLadder(db, input.pariwarId, input.ladderId);
  if (l === null || l.claimCaseId !== input.claimCaseId || l.chase !== 'certificate') return { kind: 'noop', reason: 'ladder_not_running' };
  const run = await readCertificateRun(db, input.pariwarId, l.runId);
  if (run === null) return { kind: 'noop', reason: 'ladder_not_running' };
  const key = {
    pariwarId: input.pariwarId,
    claimCaseId: input.claimCaseId,
    runId: l.runId,
    slotDay: Math.max(0, certificateRunDay(run.day0, input.sentOn)),
    recipientKey: l.personKey,
    purpose: 'ladder_sms' as const,
    subjectKey: ladderSmsSubjectKey(l.ladderId, input.step),
  };
  const giveUp = async (reason: string): Promise<boolean> =>
    (await skipCertificateReminder(db, { ...key, sentOn: input.sentOn, late: false, jobId: input.jobId, reason })).expiredAttempt;
  if (l.state !== 'running') {
    const expired = await giveUp('ladder_not_running');
    return expired ? { kind: 'noop', reason: 'ladder_not_running', expiredAttempt: true } : { kind: 'noop', reason: 'ladder_not_running' };
  }
  const s = stepOf(l, input.step);
  const retry = s.state === 'sent' && s.rowId !== null;
  if (!retry) {
    if (s.state !== 'pending') return { kind: 'noop', reason: 'step_resolved' };
    if (input.step === 3 && l.sms2State === 'pending') return { kind: 'noop', reason: 'step_not_due' };
    if (s.dueOn === null || s.dueOn > input.sentOn) return { kind: 'noop', reason: 'step_not_due' };
  }
  const recipients = await readCertificateRecipients(db, input.pariwarId, input.claimCaseId);
  const pre = new Map(input.prelock.people.map((p) => [p.personKey, p]));
  if (
    recipients.cannotRemind === null &&
    (recipients.people.length !== pre.size || recipients.people.some((p) => !samePersonSource(p, pre.get(p.personKey))))
  ) {
    throw new CertificateRecipientsMovedError(input.claimCaseId);
  }

  const check = await certificateLadderStopReason(db, {
    pariwarId: input.pariwarId,
    claimCaseId: input.claimCaseId,
    runId: l.runId,
    personKey: l.personKey,
    today: input.sentOn,
    hashes: input.prelock.hashes,
  });
  const h = input.prelock.hashes.get(l.personKey);
  const hashFailed = h === undefined || 'failed' in h;
  const current = hashFailed ? undefined : (h as { readonly hash: string | null }).hash;
  const rows = await readClaimCertificateFamilyRows(db, input.pariwarId, input.claimCaseId);
  const ladderRows = await readClaimCertificateLadderSmsRows(db, input.pariwarId, input.claimCaseId);
  const calls = await readClaimContactCalls(db, input.pariwarId, input.claimCaseId, [l.personKey]);
  const origin = rows.find((r) => r.reminderId === l.originRowId);
  const mine = [...rows, ...ladderRows].filter((r) => r.recipientKey === l.personKey);
  const satisfying = [...rows, ...ladderRows].filter(
    (r) => r.reminderId !== undefined && (r.reminderId === l.sms2RowId || r.reminderId === l.sms3RowId),
  );
  const end = ladderEndReason({
    ladder: l,
    originCreatedAt: origin?.createdAt ?? l.createdAt,
    rows: mine,
    satisfyingRows: satisfying,
    calls,
    currentNumberHash: current,
    stop: check.stop,
  });
  if (end !== null) {
    await endContactLadder(db, { pariwarId: input.pariwarId, ladderId: l.ladderId, state: end.state, detail: end.detail });
    await giveUp(`ladder_${end.state}`);
    return { kind: 'ended', state: end.state, detail: end.detail };
  }
  if (check.stop !== null) return { kind: 'noop', reason: 'ladder_not_running' }; // unreachable — a stop is an end
  if (!retry) {
    const resolve = async (state: Exclude<ContactLadderStepState, 'pending' | 'sent'>): Promise<BeginLadderSendResult<CertificatePerson>> => {
      await resolveContactLadderStep(db, {
        pariwarId: input.pariwarId,
        ladderId: l.ladderId,
        step: input.step,
        state,
        on: input.sentOn,
        rowId: null,
        nextOn: nextAfter(input.step, s.dueOn!, input.sentOn),
      });
      return { kind: 'resolved', state };
    };
    if (hashFailed || current === null || current === undefined) return resolve('skipped:hash_unavailable');
    const scheduledToday =
      run.endedAt === null && !check.paused && CERTIFICATE_REMINDER_DAYS.includes(check.runDay);
    const sentToNumberToday = [...rows, ...ladderRows].some(
      (r) =>
        r.sentOn === input.sentOn &&
        r.outcome !== 'skipped_superseded' &&
        !('subjectKey' in r && r.subjectKey === key.subjectKey) &&
        r.recipientNumberHash !== null &&
        sameNumberHash(r.recipientNumberHash, l.recipientNumberHash),
    );
    const verdict = ladderStepGate({ chase: 'certificate', runDay: check.runDay, paused: check.paused, scheduledToday, sentToNumberToday });
    if (verdict !== 'send') return resolve(verdict);
  }
  if (current === null || current === undefined) return { kind: 'noop', reason: 'held_by_other' };
  const claimed = await claimCertificateReminder(db, {
    ...key,
    sentOn: input.sentOn,
    late: false,
    jobId: input.jobId,
    now: input.now,
    recipientVersionId: check.person.versionId,
    recipientNumberHash: current,
  });
  if (claimed.status !== 'claimed') return { kind: 'noop', reason: claimed.status };
  if (!retry) {
    await resolveContactLadderStep(db, {
      pariwarId: input.pariwarId,
      ladderId: l.ladderId,
      step: input.step,
      state: 'sent',
      on: input.sentOn,
      rowId: claimed.reminderId,
      nextOn: nextAfter(input.step, input.sentOn, input.sentOn),
    });
  }
  return {
    kind: 'send',
    reminderId: claimed.reminderId,
    attemptCount: claimed.attemptCount,
    person: check.person,
    contactLocale: check.recipients.contactLocale,
  };
}

// ── The ask (LD9) ──────────────────────────────────────────────────────────────────────────────────────────────

/** Where a written `ladder_escalation` row landed (the push routing reads it — LD9 (iii)). */
export interface LadderEscalationWritten {
  readonly written: boolean;
  readonly runId: string;
  readonly slotDay: number;
  /** The row's run is still OPEN (the chase sweep's own push carries it) — else the ladder sweep enqueues the push. */
  readonly runOpen: boolean;
  readonly recipientKey: string;
}

/**
 * ⭐ LD9 — the CORRECTION ladder's ONE ask to the District Admin on conclusion: a `ladder_escalation` row (`recorded`, or
 * `no_target` for `staff:unassigned`), the ask in `detail` (`ask:<ask>` — the push copy reads it), on the live return's
 * LATEST run even if ended (the pre-closure anchor — ⛔ a new one); then `escalated_on`. Under the trustee lock.
 */
export async function writeCorrectionLadderEscalation(
  db: Db,
  input: {
    readonly pariwarId: PariwarId;
    readonly claimCaseId: ClaimId;
    readonly ladder: Pick<ClaimContactLadderRow, 'ladderId' | 'returnDecisionId' | 'runId'>;
    readonly today: string;
    readonly districtAdminKey: string;
    readonly ask: ContactLadderAsk;
  },
): Promise<LadderEscalationWritten> {
  const anchor = (await latestRunOfReturn(db, input.pariwarId, input.ladder.returnDecisionId!, input.today)) ?? {
    runId: input.ladder.runId,
    slotDay: 0,
  };
  const run = await readCorrectionRun(db, input.pariwarId, anchor.runId);
  const unassigned = input.districtAdminKey === 'staff:unassigned';
  const written = await insertFinalCorrectionReminder(db, {
    pariwarId: input.pariwarId,
    claimCaseId: input.claimCaseId,
    runId: anchor.runId,
    slotDay: anchor.slotDay,
    sentOn: input.today,
    recipientKey: input.districtAdminKey,
    purpose: 'ladder_escalation',
    subjectKey: ladderEscalationSubjectKey(input.ladder.ladderId),
    outcome: unassigned ? 'no_target' : 'recorded',
    detail: unassigned ? 'no_target:no_staff_recipient' : `ask:${input.ask}`,
  });
  await markContactLadderEscalated(db, { pariwarId: input.pariwarId, ladderId: input.ladder.ladderId, on: input.today });
  return { written, runId: anchor.runId, slotDay: anchor.slotDay, runOpen: run?.endedAt === null, recipientKey: input.districtAdminKey };
}

/**
 * ⭐ LD9 — the CERTIFICATE ladder's ONE ask: a `ladder_escalation` RECORD on the ladder's ORIGIN run (CR10 — ⛔ push in
 * v1), written on conclusion WHETHER OR NOT the run is paused (a staff record, ⛔ a family text). Under the claim lock.
 */
export async function writeCertificateLadderEscalation(
  db: Db,
  input: {
    readonly pariwarId: PariwarId;
    readonly claimCaseId: ClaimId;
    readonly ladder: Pick<ClaimContactLadderRow, 'ladderId' | 'runId'>;
    readonly today: string;
    readonly districtAdminKey: string;
    readonly ask: ContactLadderAsk;
  },
): Promise<LadderEscalationWritten> {
  const run = await readCertificateRun(db, input.pariwarId, input.ladder.runId);
  const slotDay = run === null ? 0 : Math.max(0, certificateRunDay(run.day0, input.today));
  const unassigned = input.districtAdminKey === 'staff:unassigned';
  const written = await insertFinalCertificateReminder(db, {
    pariwarId: input.pariwarId,
    claimCaseId: input.claimCaseId,
    runId: input.ladder.runId,
    slotDay,
    sentOn: input.today,
    recipientKey: input.districtAdminKey,
    purpose: 'ladder_escalation',
    subjectKey: ladderEscalationSubjectKey(input.ladder.ladderId),
    outcome: unassigned ? 'no_target' : 'recorded',
    detail: unassigned ? 'no_target:no_staff_recipient' : `ask:${input.ask}`,
  });
  await markContactLadderEscalated(db, { pariwarId: input.pariwarId, ladderId: input.ladder.ladderId, on: input.today });
  return { written, runId: input.ladder.runId, slotDay, runOpen: run?.endedAt === null, recipientKey: input.districtAdminKey };
}
