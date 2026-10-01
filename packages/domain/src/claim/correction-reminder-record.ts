// The correction REMINDER RECORD — the claim, the re-check and the compare-and-set — Story 6.19b (Task 3; AC2, AC3,
// AC4; the shared spec's D2 as superseded by `2026-09-29-266` §1 / `-267` §3/§4; D3's catch-up; S2).
//
// ⭐ THE DEDUP IS THE TABLE. Every pg-boss queue here uses the `standard` policy, which enforces ⛔ no `singletonKey`
// uniqueness — so a child job may be delivered twice, and two sweeps may race one slot. What makes a send happen at
// most once per (run, slot, person, purpose) is the UNIQUE key + the insert UNDER THE TRUSTEE LOCK, in ONE
// transaction with the child's pre-send re-check (`beginCorrectionFamilySend`). The send happens AFTER that commit;
// the row moves to its final state after the send, compare-and-set `attempting` → final only from `attempting` and
// only by the job that holds it.
// ⭐ A RETRY of the SAME job (same `claimed_by_job`) re-claims its own `attempting` row AT ONCE (`attempt_count + 1`,
// the first transient detail kept in `first_detail`) — ⛔ never a second row. A row held by a DIFFERENT job is
// re-claimed only once its `claimed_at` is older than `CORRECTION_SEND_LEASE_MS` (10 minutes — longer than any
// single attempt), else left alone. ⭐ A child whose re-check FAILS writes — or compare-and-sets its own `attempting`
// row to — `skipped_superseded` with the reason in `detail`, and completes ⛔ without throwing.
// ⚠ AT-LEAST-ONCE: `api_unavailable` includes "no response" and 5xx, which can follow a gateway accept, so a retried
// slot can text a person twice — accepted, and recorded in `attempt_count` / `first_detail`, ⛔ never hidden.
// ⚠ ALL ON ONE CLIENT: the jobs domain pool is `max: 2`; the re-check + claim run on the ONE client of the caller's
// scope tx, and the SEND's decrypt and every config read happen AFTER its commit — ⛔ never a second checkout inside
// the lock. The one crypto call inside it is the re-check's hash of the person's CURRENT number (`-271` §1: a 6.20
// correction resets their state) — KMS / HMAC only, ⛔ no DB checkout, and the plaintext never leaves the helper.
// ⛔ S2 — a record is ⛔ never written for a slot that was ⛔ not attempted, except the two `skipped_superseded`
// markers (the catch-up's older missed slots, and the sweep's marker for a run ended by a mark change on a slot day).

import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import type pg from 'pg';

import { bindScopedDb, type Db } from '../db.js';
import type { FieldCryptoDeps } from '../encryption/field-classes.js';
import type { ClaimId, MemberId, NomineeVersionId, PariwarId } from '../ids/index.js';
import {
  type ClaimCorrectionReminderRow,
  type CorrectionReminderOutcome,
  type CorrectionReminderPurpose,
  claimCorrectionLetters,
  claimCorrectionReminders,
} from '../schema/claim_correction_chase.js';
import {
  type CorrectionPerson,
  type CorrectionRunView,
  type PersonRunState,
  acquireCorrectionChaseLock,
  evaluatePersonRunState,
  isEvidentialReminderRow,
  readCorrectionClaimRow,
  readCorrectionRecipients,
  readCorrectionRun,
  readFamilyPartDoneAt,
  readLatestCorrectionMark,
} from './correction-chase.js';
import { currentCorrectionNumberHash } from './correction-crypto.js';
import { istDateOf, isCorrectionRunExpired } from './correction-schedule.js';
import { getLiveCorrectionReturn, resolveClaimCorrectionState } from './state-trustee-decision-persist.js';

/** A row held by ANOTHER job is re-claimed only after this (longer than any single attempt: a 10-second send). */
export const CORRECTION_SEND_LEASE_MS = 10 * 60 * 1000;

/** The identity of one reminder row — the table's UNIQUE key. */
export interface CorrectionReminderKey {
  readonly pariwarId: PariwarId;
  readonly claimCaseId: ClaimId;
  readonly runId: string;
  readonly slotDay: number;
  readonly recipientKey: string;
  readonly purpose: CorrectionReminderPurpose;
  /** The chased person for per-person staff items, else `''` (⛔ never null — the UNIQUE would be void). */
  readonly subjectKey: string;
}

function keyWhere(k: CorrectionReminderKey) {
  return and(
    eq(claimCorrectionReminders.pariwarId, k.pariwarId),
    eq(claimCorrectionReminders.runId, k.runId),
    eq(claimCorrectionReminders.slotDay, k.slotDay),
    eq(claimCorrectionReminders.recipientKey, k.recipientKey),
    eq(claimCorrectionReminders.purpose, k.purpose),
    eq(claimCorrectionReminders.subjectKey, k.subjectKey),
  );
}

/** Read one reminder row by its key, or `null`. */
export async function readCorrectionReminder(db: Db, k: CorrectionReminderKey): Promise<ClaimCorrectionReminderRow | null> {
  const [row] = await db.select().from(claimCorrectionReminders).where(keyWhere(k)).limit(1);
  return row ?? null;
}

/**
 * Write a row that is FINAL at insert — a staff row (`recorded` / `no_target`) or a `skipped_superseded` marker.
 * `ON CONFLICT DO NOTHING` over EVERY unique index (the slot key and the two D34 day keys), so a re-run of the sweep is
 * a no-op. Returns whether a row was inserted.
 */
export async function insertFinalCorrectionReminder(
  db: Db,
  k: CorrectionReminderKey & {
    readonly sentOn: string;
    readonly outcome: Exclude<CorrectionReminderOutcome, 'attempting'>;
    readonly late?: boolean;
    readonly detail?: string | null;
  },
): Promise<boolean> {
  const rows = await db
    .insert(claimCorrectionReminders)
    .values({
      runId: k.runId,
      claimCaseId: k.claimCaseId,
      pariwarId: k.pariwarId,
      slotDay: k.slotDay,
      sentOn: k.sentOn,
      recipientKey: k.recipientKey,
      purpose: k.purpose,
      subjectKey: k.subjectKey,
      outcome: k.outcome,
      late: k.late === true,
      detail: k.detail ?? null,
    })
    .onConflictDoNothing()
    .returning({ reminderId: claimCorrectionReminders.reminderId });
  return rows.length > 0;
}

export type CorrectionClaimResult =
  | { readonly status: 'claimed'; readonly reminderId: string; readonly attemptCount: number }
  | { readonly status: 'already_final' }
  | { readonly status: 'held_by_other' };

/**
 * Claim a row for a SEND: insert it `attempting` (this job, now), or re-claim an existing `attempting` row — AT ONCE
 * when this job already holds it, after the lease when another job does. A final row ⇒ `already_final` (⛔ no send).
 * ⚠ Call it under the trustee lock, inside the re-check's transaction.
 */
export async function claimCorrectionReminder(
  db: Db,
  k: CorrectionReminderKey & { readonly sentOn: string; readonly late: boolean; readonly jobId: string; readonly now: Date },
): Promise<CorrectionClaimResult> {
  const inserted = await db
    .insert(claimCorrectionReminders)
    .values({
      runId: k.runId,
      claimCaseId: k.claimCaseId,
      pariwarId: k.pariwarId,
      slotDay: k.slotDay,
      sentOn: k.sentOn,
      recipientKey: k.recipientKey,
      purpose: k.purpose,
      subjectKey: k.subjectKey,
      outcome: 'attempting',
      late: k.late,
      claimedAt: k.now,
      claimedByJob: k.jobId,
    })
    .onConflictDoNothing()
    .returning({ reminderId: claimCorrectionReminders.reminderId, attemptCount: claimCorrectionReminders.attemptCount });
  if (inserted[0]) return { status: 'claimed', reminderId: inserted[0].reminderId, attemptCount: inserted[0].attemptCount };

  const existing = await readCorrectionReminder(db, k);
  // A conflict on a D34 day key (a staff push already sent today on another run) — nothing to claim here.
  if (existing === null) return { status: 'already_final' };
  if (existing.outcome !== 'attempting') return { status: 'already_final' };
  const ownRetry = existing.claimedByJob === k.jobId;
  const leaseExpired =
    existing.claimedAt !== null && existing.claimedAt.getTime() < k.now.getTime() - CORRECTION_SEND_LEASE_MS;
  if (!ownRetry && !leaseExpired) return { status: 'held_by_other' };
  const reclaimed = await db
    .update(claimCorrectionReminders)
    .set({
      claimedAt: k.now,
      claimedByJob: k.jobId,
      attemptCount: sql`${claimCorrectionReminders.attemptCount} + 1`,
      firstDetail: sql`COALESCE(${claimCorrectionReminders.firstDetail}, ${claimCorrectionReminders.detail})`,
      updatedAt: sql`clock_timestamp()`,
    })
    .where(
      and(
        eq(claimCorrectionReminders.reminderId, existing.reminderId),
        eq(claimCorrectionReminders.outcome, 'attempting'),
      ),
    )
    .returning({ reminderId: claimCorrectionReminders.reminderId, attemptCount: claimCorrectionReminders.attemptCount });
  return reclaimed[0]
    ? { status: 'claimed', reminderId: reclaimed[0].reminderId, attemptCount: reclaimed[0].attemptCount }
    : { status: 'already_final' };
}

/**
 * A failed re-check: compare-and-set THIS job's own `attempting` row to `skipped_superseded`, else write the marker
 * (⛔ no conflict raised — a final row, or another live job's row, is left as it is).
 */
export async function skipCorrectionReminder(
  db: Db,
  k: CorrectionReminderKey & { readonly sentOn: string; readonly late: boolean; readonly jobId: string; readonly reason: string },
): Promise<void> {
  const existing = await readCorrectionReminder(db, k);
  if (existing !== null) {
    if (existing.outcome === 'attempting' && existing.claimedByJob === k.jobId) {
      await db
        .update(claimCorrectionReminders)
        .set({ outcome: 'skipped_superseded', detail: k.reason, updatedAt: sql`clock_timestamp()` })
        .where(
          and(
            eq(claimCorrectionReminders.reminderId, existing.reminderId),
            eq(claimCorrectionReminders.outcome, 'attempting'),
            eq(claimCorrectionReminders.claimedByJob, k.jobId),
          ),
        );
    }
    return;
  }
  await insertFinalCorrectionReminder(db, { ...k, outcome: 'skipped_superseded', detail: k.reason });
}

/**
 * ⭐ THE COMPARE-AND-SET: `attempting` → final, only from `attempting` and only by the job holding the row. Returns
 * `false` when the row moved on (the finaliser, or a job that re-claimed it after the lease).
 * ⛔ `delivered_at` is ⛔ never written here — an accept is ⛔ not a delivery (T1).
 */
export async function finaliseCorrectionReminder(
  db: Db,
  input: {
    readonly pariwarId: PariwarId;
    readonly reminderId: string;
    readonly jobId: string;
    readonly outcome: Exclude<CorrectionReminderOutcome, 'attempting' | 'recorded' | 'skipped_superseded'>;
    readonly providerMessageId?: string | null;
    readonly detail?: string | null;
    readonly recipientVersionId?: string | null;
    readonly recipientNumberHash?: string | null;
  },
): Promise<boolean> {
  const rows = await db
    .update(claimCorrectionReminders)
    .set({
      outcome: input.outcome,
      providerMessageId: input.providerMessageId ?? null,
      detail: input.detail ?? null,
      recipientVersionId: (input.recipientVersionId ?? null) as NomineeVersionId | null,
      recipientNumberHash: input.recipientNumberHash ?? null,
      updatedAt: sql`clock_timestamp()`,
    })
    .where(
      and(
        eq(claimCorrectionReminders.pariwarId, input.pariwarId),
        eq(claimCorrectionReminders.reminderId, input.reminderId),
        eq(claimCorrectionReminders.outcome, 'attempting'),
        eq(claimCorrectionReminders.claimedByJob, input.jobId),
      ),
    )
    .returning({ reminderId: claimCorrectionReminders.reminderId });
  return rows.length > 0;
}

/**
 * A TRANSIENT failure: keep the row `attempting` (the retry re-claims it at once) and record the classified detail —
 * the re-claim moves it to `first_detail`.
 */
export async function noteCorrectionReminderTransient(
  db: Db,
  input: { readonly pariwarId: PariwarId; readonly reminderId: string; readonly jobId: string; readonly detail: string },
): Promise<void> {
  await db
    .update(claimCorrectionReminders)
    .set({ detail: input.detail, updatedAt: sql`clock_timestamp()` })
    .where(
      and(
        eq(claimCorrectionReminders.pariwarId, input.pariwarId),
        eq(claimCorrectionReminders.reminderId, input.reminderId),
        eq(claimCorrectionReminders.outcome, 'attempting'),
        eq(claimCorrectionReminders.claimedByJob, input.jobId),
      ),
    );
}

// ── The child's pre-send re-check (AC2) ────────────────────────────────────────────────────────────────────────

/** Why a family send was ⛔ not made (the `detail` of its `skipped_superseded` row). */
export type CorrectionSkipReason =
  | 'run_ended'
  | 'return_superseded'
  | 'day_90'
  | 'not_a_family_run'
  /** A `family` run whose live return's LATEST mark is ⛔ not `family` (a held switch, 6.19c). ⛔ Not for `direction`. */
  | 'not_a_family_mark'
  | 'resubmitted'
  | 'family_part_done'
  | 'undetermined'
  | 'no_contact_record'
  | 'agreement_not_live'
  | 'not_a_recipient'
  | 'letter_delivered';

export type BeginCorrectionFamilySendResult =
  | {
      readonly kind: 'send';
      readonly reminderId: string;
      readonly attemptCount: number;
      readonly person: CorrectionPerson;
      readonly contactLocale: 'hi' | 'en';
    }
  | { readonly kind: 'skipped'; readonly reason: CorrectionSkipReason }
  | { readonly kind: 'noop'; readonly reason: 'already_final' | 'held_by_other' };

/**
 * The child's re-check could ⛔ not hash the person's CURRENT number while the only thing stopping the send is a
 * delivered letter of an EARLIER epoch — so it cannot tell "a letter reached this number" from "the number changed
 * since". ⛔ Never a silent `skipped_superseded` (that would lose the slot over a KMS blip): it throws, the
 * transaction rolls back, and the job retries. ⛔ Carries no number.
 */
export class CorrectionNumberHashUnavailableError extends Error {
  public readonly name = 'CorrectionNumberHashUnavailableError';
  public constructor(
    public readonly claimCaseId: string,
    public readonly runId: string,
  ) {
    super(`[correction-reminder] claim ${claimCaseId} run ${runId}: the current number could not be hashed`);
  }
}

/**
 * ⭐ THE CHILD'S PRE-SEND RE-CHECK, in ONE transaction under the trustee lock (AC2): the run is still open and its
 * return still the live one, day < 90; a `family` run's return is still MARKED `family` (a `direction` run is exempt —
 * 6.19c's direction chases the family whatever the mark); ⭐ BY PURPOSE — tier (a) `resubmitted` stops any row; tier
 * (b) (the family's part is done) and D30 stop the family's rows; the person is still a recipient and their letter has
 * ⛔ no recorded delivery IN THE CURRENT NUMBER'S EPOCH. Only then the row is claimed `attempting`. ⇒ a switch to
 * `staff` at 10:01 stops a job queued at 10:00. A failed re-check writes `skipped_superseded` (the reason in `detail`)
 * and returns ⛔ without throwing.
 * ⭐ The person's state is computed with the SWEEP's own logic (`readRunPersonStates` with `crypto`): it hashes the
 * CURRENT number when the version moved (`-271` §1), so a letter delivered to an OLD number ⛔ never silences a
 * 6.20-corrected one. ⚠ The caller commits, THEN decrypts for the send — the only crypto here is that hash.
 * @throws CorrectionNumberHashUnavailableError  the hash failed AND a delivered letter would otherwise skip the send
 */
export async function beginCorrectionFamilySend(
  client: pg.PoolClient,
  input: {
    readonly pariwarId: PariwarId;
    readonly claimCaseId: ClaimId;
    readonly runId: string;
    readonly slotDay: number;
    readonly personKey: string;
    readonly sentOn: string;
    readonly late: boolean;
    readonly jobId: string;
    readonly now: Date;
    /** REQUIRED — the reset check hashes the person's current number (jobs passes `deps.encryption`). */
    readonly crypto: FieldCryptoDeps;
  },
): Promise<BeginCorrectionFamilySendResult> {
  await acquireCorrectionChaseLock(client, input.pariwarId, input.claimCaseId);
  const db = bindScopedDb(client);
  const key: CorrectionReminderKey = {
    pariwarId: input.pariwarId,
    claimCaseId: input.claimCaseId,
    runId: input.runId,
    slotDay: input.slotDay,
    recipientKey: input.personKey,
    purpose: 'family_sms',
    subjectKey: '',
  };
  const skip = async (reason: CorrectionSkipReason): Promise<BeginCorrectionFamilySendResult> => {
    await skipCorrectionReminder(db, { ...key, sentOn: input.sentOn, late: input.late, jobId: input.jobId, reason });
    return { kind: 'skipped', reason };
  };

  const run = await readCorrectionRun(db, input.pariwarId, input.runId);
  if (run === null || run.endedAt !== null) return skip('run_ended');
  if (run.kind !== 'family' && run.kind !== 'direction') return skip('not_a_family_run');
  const ret = await getLiveCorrectionReturn(db, input.pariwarId, input.claimCaseId);
  if (!ret || ret.decisionId !== run.returnDecisionId) return skip('return_superseded');
  if (run.kind === 'family') {
    // A held switch to `staff` (6.19c) can leave ⛔ no run to end before this job runs — the MARK is the truth.
    const mark = await readLatestCorrectionMark(db, input.pariwarId, ret.decisionId);
    if (mark?.mustAct !== 'family') return skip('not_a_family_mark');
  }
  if (isCorrectionRunExpired(run.day0, istDateOf(input.now))) return skip('day_90');

  const claimRow = await readCorrectionClaimRow(db, input.pariwarId, input.claimCaseId);
  if (claimRow === null) return skip('run_ended');
  const correction = await resolveClaimCorrectionState(
    db,
    input.pariwarId,
    input.claimCaseId,
    claimRow.deceasedMemberId as MemberId,
    claimRow.currentState,
  );
  if (correction.resubmitted) return skip('resubmitted');
  if ((await readFamilyPartDoneAt(db, input.pariwarId, input.claimCaseId, ret.decidedAt)) !== null) {
    return skip('family_part_done');
  }
  const recipients = await readCorrectionRecipients(db, input.pariwarId, input.claimCaseId);
  if (recipients.cannotRemind !== null) return skip(recipients.cannotRemind);
  const person = recipients.people.find((p) => p.personKey === input.personKey);
  if (person === undefined) return skip('not_a_recipient');
  const [personState] = await readRunPersonStates(db, input.pariwarId, run, [person], { crypto: input.crypto });
  if (personState === undefined) return skip('not_a_recipient');
  if (personState.state.letterDelivered) {
    if (personState.hashFailed === true) throw new CorrectionNumberHashUnavailableError(input.claimCaseId, input.runId);
    return skip('letter_delivered');
  }

  const claimed = await claimCorrectionReminder(db, {
    ...key,
    sentOn: input.sentOn,
    late: input.late,
    jobId: input.jobId,
    now: input.now,
  });
  if (claimed.status !== 'claimed') return { kind: 'noop', reason: claimed.status };
  return {
    kind: 'send',
    reminderId: claimed.reminderId,
    attemptCount: claimed.attemptCount,
    person,
    contactLocale: recipients.contactLocale,
  };
}

// ── Run reads + per-person state (the sweep, the letter precondition, the queue) ───────────────────────────────

export interface RunFamilyRow {
  readonly recipientKey: string;
  readonly slotDay: number;
  readonly sentOn: string;
  readonly outcome: CorrectionReminderOutcome;
  readonly recipientVersionId: string | null;
  readonly recipientNumberHash: string | null;
  readonly createdAt: Date;
  readonly late: boolean;
}

/** Every `family_sms` row of a run, oldest slot first. */
export async function readRunFamilyRows(db: Db, pariwarId: PariwarId, runId: string): Promise<RunFamilyRow[]> {
  const rows = await db
    .select({
      recipientKey: claimCorrectionReminders.recipientKey,
      slotDay: claimCorrectionReminders.slotDay,
      sentOn: claimCorrectionReminders.sentOn,
      outcome: claimCorrectionReminders.outcome,
      recipientVersionId: claimCorrectionReminders.recipientVersionId,
      recipientNumberHash: claimCorrectionReminders.recipientNumberHash,
      createdAt: claimCorrectionReminders.createdAt,
      late: claimCorrectionReminders.late,
    })
    .from(claimCorrectionReminders)
    .where(
      and(
        eq(claimCorrectionReminders.pariwarId, pariwarId),
        eq(claimCorrectionReminders.runId, runId),
        eq(claimCorrectionReminders.purpose, 'family_sms'),
      ),
    )
    .orderBy(asc(claimCorrectionReminders.slotDay), asc(claimCorrectionReminders.createdAt));
  return rows.map((r) => ({ ...r, recipientVersionId: (r.recipientVersionId as string | null) ?? null }));
}

export interface RunLetterRow {
  readonly letterId: string;
  readonly personKey: string;
  readonly sequence: number;
  readonly postedOn: string;
  readonly deliveredOn: string | null;
  readonly createdAt: Date;
  readonly hasScreenshot: boolean;
}

/** Every letter of a run. */
export async function readRunLetters(db: Db, pariwarId: PariwarId, runId: string): Promise<RunLetterRow[]> {
  const rows = await db
    .select({
      letterId: claimCorrectionLetters.letterId,
      personKey: claimCorrectionLetters.personKey,
      sequence: claimCorrectionLetters.sequence,
      postedOn: claimCorrectionLetters.postedOn,
      deliveredOn: claimCorrectionLetters.deliveredOn,
      createdAt: claimCorrectionLetters.createdAt,
      screenshotStorageKey: claimCorrectionLetters.screenshotStorageKey,
    })
    .from(claimCorrectionLetters)
    .where(and(eq(claimCorrectionLetters.pariwarId, pariwarId), eq(claimCorrectionLetters.runId, runId)))
    .orderBy(asc(claimCorrectionLetters.personKey), asc(claimCorrectionLetters.sequence));
  return rows.map(({ screenshotStorageKey, ...r }) => ({ ...r, hasScreenshot: screenshotStorageKey !== null }));
}

/** Every staff-side row of a run (for the catch-up's "is this slot recorded" and the queue). */
export async function readRunStaffRows(
  db: Db,
  pariwarId: PariwarId,
  runId: string,
): Promise<Pick<ClaimCorrectionReminderRow, 'slotDay' | 'recipientKey' | 'purpose' | 'subjectKey' | 'outcome' | 'sentOn'>[]> {
  return db
    .select({
      slotDay: claimCorrectionReminders.slotDay,
      recipientKey: claimCorrectionReminders.recipientKey,
      purpose: claimCorrectionReminders.purpose,
      subjectKey: claimCorrectionReminders.subjectKey,
      outcome: claimCorrectionReminders.outcome,
      sentOn: claimCorrectionReminders.sentOn,
    })
    .from(claimCorrectionReminders)
    .where(
      and(
        eq(claimCorrectionReminders.pariwarId, pariwarId),
        eq(claimCorrectionReminders.runId, runId),
        inArray(claimCorrectionReminders.purpose, [
          'staff_reminder',
          'staff_push',
          'letter_chase',
          'letter_second_due',
          'escalation',
        ]),
      ),
    )
    .orderBy(asc(claimCorrectionReminders.slotDay));
}

/** One person's evaluated state in one run. */
export interface RunPersonState {
  readonly person: CorrectionPerson;
  readonly state: PersonRunState;
  /** The person's current number hash, when it was computed (only when their version changed, or on request). */
  readonly currentNumberHash?: string | null;
  /**
   * The current number's hash was NEEDED but its decrypt / hash THREW (an unreadable envelope, a KMS blip): the
   * state was evaluated as if the number were unknown (the latest row's hash stands). ⚠ The caller ALARMS — it is
   * ⛔ never silent, and it never stops the other people's states (one person's fault is theirs alone).
   */
  readonly hashFailed?: boolean;
}

/**
 * The person's LAST evidential attempt (`isEvidentialReminderRow` — a hash-less `error` is ⛔ not one), from rows in
 * any order (latest slot, then latest insert), or `undefined`. Pure.
 */
export function lastEvidentialAttempt<R extends RunFamilyRow>(rows: readonly R[]): R | undefined {
  return [...rows]
    .filter(isEvidentialReminderRow)
    .sort((a, b) => a.slotDay - b.slotDay || a.createdAt.getTime() - b.createdAt.getTime())
    .at(-1);
}

/**
 * Must the person's CURRENT number be hashed to see a 6.20 reset? Only when they have an evidential attempt AND its
 * version is ⛔ not the person's current one — or always for the CLAIMANT: the block carries ⛔ no version
 * (`person.versionId` and `recipientVersionId` are always null for them), so the version-compare short-circuit could
 * never see a correction to their own `claim_contacts` mobile. Pure.
 */
export function personNumberMayHaveMoved(
  person: Pick<CorrectionPerson, 'role' | 'versionId'>,
  lastAttempt: Pick<RunFamilyRow, 'recipientVersionId'> | undefined,
): boolean {
  return lastAttempt !== undefined && (person.role === 'claimant' || lastAttempt.recipientVersionId !== person.versionId);
}

/**
 * Each person's per-run state. ⭐ The reset (a 6.20 correction changed the NUMBER): the latest evidential row's
 * `recipient_version_id` is compared FIRST, and the number is hashed only when it differs (⛔ a stopped person writes
 * no rows — so the sweep must detect their change, and the child re-checks it the same way); a correction that keeps
 * the same number changes ⛔ nothing. Without `crypto` the latest row's hash stands.
 * ⭐ A hash that THROWS is caught PER PERSON: that person is evaluated with the number unknown and `hashFailed: true`
 * (the caller alarms); ⛔ it never throws out of the whole run.
 */
export async function readRunPersonStates(
  db: Db,
  pariwarId: PariwarId,
  run: CorrectionRunView,
  people: readonly CorrectionPerson[],
  opts: { readonly crypto?: FieldCryptoDeps; readonly alwaysHash?: boolean } = {},
): Promise<RunPersonState[]> {
  const rows = await readRunFamilyRows(db, pariwarId, run.runId);
  const letters = await readRunLetters(db, pariwarId, run.runId);
  const out: RunPersonState[] = [];
  for (const person of people) {
    const mine = rows.filter((r) => r.recipientKey === person.personKey);
    let currentNumberHash: string | null | undefined;
    let hashFailed = false;
    if (
      opts.crypto !== undefined &&
      (opts.alwaysHash === true || personNumberMayHaveMoved(person, lastEvidentialAttempt(mine)))
    ) {
      try {
        currentNumberHash = await currentCorrectionNumberHash(
          person.mobileCiphertext,
          person.mobileSource,
          pariwarId,
          opts.crypto,
        );
      } catch {
        // ⛔ The error is NOT logged here (it may carry envelope detail) — the caller alarms on `hashFailed` by ids.
        currentNumberHash = undefined;
        hashFailed = true;
      }
    }
    const state = evaluatePersonRunState(
      mine,
      letters.filter((l) => l.personKey === person.personKey),
      currentNumberHash,
    );
    out.push({
      person,
      state,
      ...(currentNumberHash === undefined ? {} : { currentNumberHash }),
      ...(hashFailed ? { hashFailed: true } : {}),
    });
  }
  return out;
}
