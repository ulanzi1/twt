// The correction-closure JOB STEPS — Story 6.19c (Task 3; AC6, AC14, AC17; `2026-10-01-273` §3a, §5, §6;
// `-274` 2). The per-claim work of the day-90 sweep and the closure-notice child, here in the domain so it is testable
// without pg-boss; `apps/jobs` drives it (the scan, the queues, the SMS send, the pushes). Transport-free.
//
// ⛔⛔ INVARIANT 1 — NOTHING HERE DECIDES A CLAIM. The sweep REMINDS and ESCALATES; its ONE write beyond reminder rows is
// the staff case's escalation RECORD (`escalateStaffCase`, `-273` §3a — the D26 day-12 escalation is the precedent).
// ⛔ It never calls the request, the Pariwar Admin's or the Super Admin's decision, D27's approve or the vote.
//
// ── The reminders (`-273` §6) ─────────────────────────────────────────────────────────────────────────────────
// Every row still needs a `run_id` and a `slot_day ≥ 0`: before a closure they key on the live return's LATEST run of
// any kind (open or ended), `slot_day` = that run's day number today (≥ 90 is allowed — a LABEL only, ⛔ the cadence);
// after it, on the closure's recorded `closure_notice_run_id`. ⭐ The cadences count from the FAMILY RUN's day 90 (the
// District Admin: daily on days 90–96; the Pariwar Admin escalated on day 97 — once per family run), the ESCALATION
// date (the Super Admin: every 30 days, held under review or not), the DIRECTION's date (the directee: day 7, then
// weekly, until they respond) and the CLOSURE date (a closure letter owed: day 7, daily to 12, then the Pariwar Admin
// on day 13). Each catches up ONCE (the latest due date, `late` when it is ⛔ today's) — ⛔ never a burst.
// ⭐ Stop rules: the District Admin's closure reminders only while a request COULD pass `escalated`, `request_pending`
// and `claim_corrected` (`-273` §6); the review / direction reminders while the row is HELD and the return live; the
// letter chase until that person's closure letter is DELIVERED.
//
// ── The closure notice (`-273` §5) — an OUTBOX ─────────────────────────────────────────────────────────────────
// The approving transaction recorded it DUE (the recipients' person keys); a child per recipient claims a row under its
// ONCE key `(claim_case_id, recipient_key) WHERE purpose = 'closure_notice'` (an errored send retried on the SAME row —
// `attempt_count`), sends AFTER the commit, and compare-and-sets it final; the closure is DONE when every recipient has a
// final row. D30 at send time (a live agreement, a determined declaration): a failure is written ONCE, FINAL (⛔
// retried). ⛔ Never a text to a known-dead number — that person was owed a closure LETTER at the closure instead.

import { and, desc, eq, sql } from 'drizzle-orm';
import type pg from 'pg';

import { bindScopedDb, type Db } from '../db.js';
import type { ClaimId, MemberId, PariwarId, TrusteeDecisionId } from '../ids/index.js';
import {
  type CorrectionReminderPurpose,
  claimCorrectionReminders,
  claimCorrectionRuns,
} from '../schema/claim_correction_chase.js';
import {
  type ClaimCorrectionClosureRow,
  claimClosureLetters,
  claimCorrectionClosures,
  claimCorrectionDirections,
} from '../schema/claim_correction_closure.js';
import { addCalendarDays, type CalendarDateString } from '../cycle-calendar/holiday-resolver.js';
import { listAdminsByRole } from './admin-directory.js';
import {
  type CorrectionPerson,
  acquireCorrectionChaseLock,
  readCorrectionClaimRow,
  readCorrectionRecipients,
  readCorrectionRun,
  resolveCorrectionChase,
} from './correction-chase.js';
import {
  escalateStaffCase,
  isClosureRequestLapsed,
  isHeldClosureState,
  readLiveClosureRowOfReturn,
} from './correction-closure.js';
import { CORRECTION_SEND_LEASE_MS, insertFinalCorrectionReminder } from './correction-reminder-record.js';
import {
  CORRECTION_RUN_HORIZON_DAYS,
  LETTER_CHASE_ESCALATION_OFFSET,
  LETTER_CHASE_FIRST_OFFSET,
  LETTER_CHASE_LAST_OFFSET,
  calendarDaysBetween,
  correctionRunDay,
  istDateOf,
} from './correction-schedule.js';
import { getLiveShepherd } from './shepherd-read.js';
import { resolveClaimCorrectionState } from './state-trustee-decision-persist.js';

/** `-232` I — the District Admin is reminded on the family run's days 90 … 96, then the Pariwar Admin on day 97. */
export const CLOSURE_DUE_LAST_DAY = 96;
export const CLOSURE_ESCALATION_DAY = 97;
/** `-256` cl.2 / `-273` §6 — the Super Admin, every 30 days from the escalation date. */
export const REVIEW_REMINDER_EVERY_DAYS = 30;
/** D18 (ours) — the directee: 7 days after the direction, then weekly. */
export const DIRECTION_FIRST_REMINDER_DAY = 7;
export const DIRECTION_REMINDER_EVERY_DAYS = 7;

/** The staff recipient keys for a list of user ids — or `staff:unassigned` (a `no_target` row) when there is none. */
function staffKeys(userIds: readonly string[]): string[] {
  return userIds.length > 0 ? userIds.map((u) => `staff:${u}`) : ['staff:unassigned'];
}

/**
 * The latest due date of a cadence that starts `firstOffset` days after `anchor` and repeats `every` days, on or before
 * `today` — or `null` before the first one. Pure.
 */
export function latestCadenceDue(
  anchor: CalendarDateString,
  today: CalendarDateString,
  firstOffset: number,
  every: number,
): CalendarDateString | null {
  const d = calendarDaysBetween(anchor, today);
  if (d < firstOffset) return null;
  return addCalendarDays(anchor, firstOffset + every * Math.floor((d - firstOffset) / every));
}

interface AnchorRun {
  readonly runId: string;
  readonly slotDay: number;
}

/** The live return's LATEST run of any kind (open or ended) and its day number today — the pre-closure anchor. */
async function latestRunOfReturn(
  db: Db,
  pariwarId: PariwarId,
  returnDecisionId: string,
  today: CalendarDateString,
): Promise<AnchorRun | null> {
  const [run] = await db
    .select({ runId: claimCorrectionRuns.runId, day0: claimCorrectionRuns.day0 })
    .from(claimCorrectionRuns)
    .where(
      and(
        eq(claimCorrectionRuns.pariwarId, pariwarId),
        eq(claimCorrectionRuns.returnDecisionId, returnDecisionId as TrusteeDecisionId),
      ),
    )
    .orderBy(desc(claimCorrectionRuns.openedAt), desc(claimCorrectionRuns.runId))
    .limit(1);
  return run ? { runId: run.runId, slotDay: Math.max(0, correctionRunDay(run.day0, today)) } : null;
}

/** The claim's rows of a purpose for one subject (the dedup of every 6.19c cadence). */
async function rowsFor(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
  purpose: CorrectionReminderPurpose,
  subjectKey: string,
): Promise<{ readonly sentOn: string; readonly recipientKey: string }[]> {
  return db
    .select({ sentOn: claimCorrectionReminders.sentOn, recipientKey: claimCorrectionReminders.recipientKey })
    .from(claimCorrectionReminders)
    .where(
      and(
        eq(claimCorrectionReminders.pariwarId, pariwarId),
        eq(claimCorrectionReminders.claimCaseId, claimCaseId),
        eq(claimCorrectionReminders.purpose, purpose),
        eq(claimCorrectionReminders.subjectKey, subjectKey),
      ),
    )
    .limit(1000);
}

export interface ClosurePlanResult {
  /** The day-90 job wrote the staff case's escalation RECORD (`-273` §3a). */
  readonly escalatedStaffCase: boolean;
  readonly staffRowsWritten: number;
  /** Staff user ids with a 6.19c reminder written TODAY on this claim (the sweep enqueues their push). */
  readonly pushUserIds: readonly string[];
  /** The anchor the rows were written on (the push claims its own row on it), or `null` (⛔ none written). */
  readonly anchor: AnchorRun | null;
}

const IDLE: ClosurePlanResult = { escalatedStaffCase: false, staffRowsWritten: 0, pushUserIds: [], anchor: null };

/** The writer of one plan's staff rows — `recorded`, or `no_target` for `staff:unassigned`. Collects push targets. */
function staffWriter(db: Db, pariwarId: PariwarId, claimCaseId: ClaimId, anchor: AnchorRun, today: CalendarDateString) {
  const pushUserIds = new Set<string>();
  let written = 0;
  const write = async (recipientKeys: readonly string[], purpose: CorrectionReminderPurpose, subjectKey: string, late: boolean) => {
    for (const recipientKey of recipientKeys) {
      const unassigned = recipientKey === 'staff:unassigned';
      const inserted = await insertFinalCorrectionReminder(db, {
        pariwarId,
        claimCaseId,
        runId: anchor.runId,
        slotDay: anchor.slotDay,
        sentOn: today,
        recipientKey,
        purpose,
        subjectKey,
        outcome: unassigned ? 'no_target' : 'recorded',
        late,
        detail: unassigned ? 'no_target:no_staff_recipient' : null,
      });
      if (inserted) {
        written += 1;
        if (!unassigned) pushUserIds.add(recipientKey.slice('staff:'.length));
      }
    }
  };
  return { write, result: () => ({ written, pushUserIds: [...pushUserIds] }) };
}

/**
 * ⭐ PLAN ONE LIVE RETURN for today (the sweep's per-claim step), under the trustee lock: the staff case's day-90
 * escalation RECORD (+ its Super Admin reminder); the District Admin's closure reminders (days 90–96) and the day-97
 * escalation to every Pariwar Admin — ONLY while a request could pass `escalated`, `request_pending` and
 * `claim_corrected`; and, while HELD, the Super Admin's 30-day reminder and each unanswered direction's reminder.
 * `superAdminUserIds`: read by the CALLER on the BYPASSRLS pool (`listSuperAdmins` — global grants live under another
 * Pariwar). ⛔ Decides nothing.
 */
export async function planClosureReturn(
  client: pg.PoolClient,
  input: {
    readonly pariwarId: PariwarId;
    readonly claimCaseId: ClaimId;
    readonly now: Date;
    readonly superAdminUserIds: readonly string[];
  },
): Promise<ClosurePlanResult> {
  await acquireCorrectionChaseLock(client, input.pariwarId, input.claimCaseId);
  const db = bindScopedDb(client);
  const today = istDateOf(input.now);
  const chase = await resolveCorrectionChase(db, input.pariwarId, input.claimCaseId);
  if (chase.liveReturn === null) return IDLE;
  const anchor = await latestRunOfReturn(db, input.pariwarId, chase.liveReturn.decisionId, today);
  if (anchor === null) return IDLE;
  const w = staffWriter(db, input.pariwarId, input.claimCaseId, anchor, today);
  const superAdmins = staffKeys(input.superAdminUserIds);

  // (1) The staff case at day 90 of its staff run — the escalation RECORD (`-273` §3a), and its reminder.
  let escalatedStaffCase = false;
  const escalation = await escalateStaffCase(client, { pariwarId: input.pariwarId, claimCaseId: input.claimCaseId, now: input.now });
  if (escalation !== null) {
    escalatedStaffCase = true;
    await w.write(superAdmins, 'staff_case_escalation', `closure:${escalation.closureId}`, false);
  }

  const row = await readLiveClosureRowOfReturn(db, input.pariwarId, chase.liveReturn.decisionId);

  if (row !== null && isHeldClosureState(row.state)) {
    // (2) HELD — the Super Admin every 30 days from the escalation date (under review or not — `-273` §6, ours).
    const reviewDue = latestCadenceDue(istDateOf(row.escalatedAt!), today, REVIEW_REMINDER_EVERY_DAYS, REVIEW_REMINDER_EVERY_DAYS);
    const reviewSubject = `closure:${row.closureId}`;
    if (reviewDue !== null) {
      const covered = (await rowsFor(db, input.pariwarId, input.claimCaseId, 'review_reminder', reviewSubject)).some((r) => r.sentOn >= reviewDue);
      if (!covered) await w.write(superAdmins, 'review_reminder', reviewSubject, reviewDue < today);
    }
    // (3) Each UNANSWERED direction's directee — day 7 after it, then weekly.
    const directions = await db
      .select()
      .from(claimCorrectionDirections)
      .where(
        and(
          eq(claimCorrectionDirections.pariwarId, input.pariwarId),
          eq(claimCorrectionDirections.closureId, row.closureId),
          sql`${claimCorrectionDirections.respondedAt} IS NULL`,
        ),
      )
      .limit(200);
    for (const d of directions) {
      const due = latestCadenceDue(istDateOf(d.createdAt), today, DIRECTION_FIRST_REMINDER_DAY, DIRECTION_REMINDER_EVERY_DAYS);
      if (due === null) continue;
      const subject = `direction:${d.directionId}`;
      const covered = (await rowsFor(db, input.pariwarId, input.claimCaseId, 'direction_reminder', subject)).some((r) => r.sentOn >= due);
      if (!covered) await w.write([`staff:${d.directedToActor}`], 'direction_reminder', subject, due < today);
    }
    const r = w.result();
    return { escalatedStaffCase, staffRowsWritten: r.written, pushUserIds: r.pushUserIds, anchor };
  }

  // (4) The District Admin's closure reminders — only while a request COULD pass `escalated` (above), `request_pending`
  // and `claim_corrected` (`-273` §6); only on a family-must-act return whose family run reached day 90.
  if (chase.mark?.mustAct === 'family' && chase.familyRun !== null) {
    const d = correctionRunDay(chase.familyRun.day0, today);
    const pending = row !== null && row.state === 'requested' && !(await isClosureRequestLapsed(db, input.pariwarId, row, chase));
    if (d >= CORRECTION_RUN_HORIZON_DAYS && !pending) {
      const claimRow = await readCorrectionClaimRow(db, input.pariwarId, input.claimCaseId);
      const corrected =
        chase.familyPartDoneAt !== null ||
        (claimRow !== null &&
          (
            await resolveClaimCorrectionState(
              db,
              input.pariwarId,
              input.claimCaseId,
              claimRow.deceasedMemberId as MemberId,
              claimRow.currentState,
            )
          ).resubmitted);
      if (!corrected) {
        const subject = `run:${chase.familyRun.runId}`;
        if (d <= CLOSURE_DUE_LAST_DAY) {
          const shepherd = await getLiveShepherd(db, input.pariwarId, input.claimCaseId);
          await w.write([shepherd ? `staff:${shepherd.shepherdActorId}` : 'staff:unassigned'], 'closure_due', subject, false);
        } else {
          const done = (await rowsFor(db, input.pariwarId, input.claimCaseId, 'closure_escalation', subject)).length > 0;
          if (!done) {
            const admins = await listAdminsByRole(db, input.pariwarId, 'pariwar_admin');
            await w.write(staffKeys(admins.entries.map((a) => a.userId)), 'closure_escalation', subject, d > CLOSURE_ESCALATION_DAY);
          }
        }
      }
    }
  }
  const r = w.result();
  return { escalatedStaffCase, staffRowsWritten: r.written, pushUserIds: r.pushUserIds, anchor };
}

// ── After the closure ──────────────────────────────────────────────────────────────────────────────────────────

/** The people still owed a FINAL closure-notice row (an `attempting` row is ⛔ final). */
async function noticePendingKeys(db: Db, row: ClaimCorrectionClosureRow): Promise<string[]> {
  const rows = await db
    .select({ recipientKey: claimCorrectionReminders.recipientKey, outcome: claimCorrectionReminders.outcome })
    .from(claimCorrectionReminders)
    .where(
      and(
        eq(claimCorrectionReminders.pariwarId, row.pariwarId),
        eq(claimCorrectionReminders.claimCaseId, row.claimCaseId),
        eq(claimCorrectionReminders.purpose, 'closure_notice'),
      ),
    )
    .limit(100);
  const final = new Set(rows.filter((r) => r.outcome !== 'attempting').map((r) => r.recipientKey));
  return row.closureNoticePersonKeys.filter((k) => !final.has(k));
}

/** Mark the closure's notice DONE once every recipient has a final row (`-273` §5). Returns whether it is done. */
export async function completeClosureNoticeIfDone(db: Db, pariwarId: PariwarId, closureId: string): Promise<boolean> {
  const [row] = await db
    .select()
    .from(claimCorrectionClosures)
    .where(and(eq(claimCorrectionClosures.pariwarId, pariwarId), eq(claimCorrectionClosures.closureId, closureId)))
    .limit(1);
  if (!row || row.state !== 'closed') return false;
  if (row.closureNoticeDoneAt !== null) return true;
  if ((await noticePendingKeys(db, row)).length > 0) return false;
  await db
    .update(claimCorrectionClosures)
    .set({ closureNoticeDoneAt: sql`clock_timestamp()`, updatedAt: sql`clock_timestamp()` })
    .where(and(eq(claimCorrectionClosures.closureId, closureId), sql`${claimCorrectionClosures.closureNoticeDoneAt} IS NULL`));
  return true;
}

export interface ClosedClosurePlanResult extends ClosurePlanResult {
  /** Person keys whose closure notice still needs a send (the sweep enqueues one child each). */
  readonly noticeRecipients: readonly string[];
  readonly noticeDone: boolean;
}

/**
 * ⭐ PLAN ONE CLOSED CLOSURE for today, under the trustee lock: the closure notice's outbox (the recipients still owed a
 * final row — or DONE), and the closure-letter chase for each person owed a letter not yet DELIVERED (`-274` 2: the
 * District Admin on closure day 7, daily to 12; every Pariwar Admin once on day 13). ⛔ Decides nothing.
 */
export async function planClosedClosure(
  client: pg.PoolClient,
  input: { readonly pariwarId: PariwarId; readonly claimCaseId: ClaimId; readonly closureId: string; readonly now: Date },
): Promise<ClosedClosurePlanResult> {
  await acquireCorrectionChaseLock(client, input.pariwarId, input.claimCaseId);
  const db = bindScopedDb(client);
  const today = istDateOf(input.now);
  const [row] = await db
    .select()
    .from(claimCorrectionClosures)
    .where(and(eq(claimCorrectionClosures.pariwarId, input.pariwarId), eq(claimCorrectionClosures.closureId, input.closureId)))
    .limit(1);
  const idle: ClosedClosurePlanResult = { ...IDLE, noticeRecipients: [], noticeDone: true };
  if (!row || row.state !== 'closed' || row.closureNoticeRunId === null) return idle;
  const run = await readCorrectionRun(db, input.pariwarId, row.closureNoticeRunId);
  if (run === null) return idle;
  const anchor: AnchorRun = { runId: run.runId, slotDay: Math.max(0, correctionRunDay(run.day0, today)) };

  const noticeDone = await completeClosureNoticeIfDone(db, input.pariwarId, row.closureId);
  const noticeRecipients = noticeDone ? [] : await noticePendingKeys(db, row);

  const w = staffWriter(db, input.pariwarId, input.claimCaseId, anchor, today);
  const closedOn = istDateOf(row.closedAt!);
  const d = calendarDaysBetween(closedOn, today);
  if (row.closureLetterPersonKeys.length > 0 && d >= LETTER_CHASE_FIRST_OFFSET) {
    const delivered = new Set(
      (
        await db
          .select({ personKey: claimClosureLetters.personKey })
          .from(claimClosureLetters)
          .where(
            and(
              eq(claimClosureLetters.closureId, row.closureId),
              sql`${claimClosureLetters.deliveredOn} IS NOT NULL`,
            ),
          )
          .limit(100)
      ).map((l) => l.personKey),
    );
    const shepherd = await getLiveShepherd(db, input.pariwarId, input.claimCaseId);
    const daKey = shepherd ? `staff:${shepherd.shepherdActorId}` : 'staff:unassigned';
    for (const personKey of row.closureLetterPersonKeys.filter((k) => !delivered.has(k))) {
      // The chase: closure day 7, daily to 12 — the latest due day sent ONCE (catch-up, `late` when ⛔ today's).
      const latestDue = addCalendarDays(closedOn, Math.min(d, LETTER_CHASE_LAST_OFFSET));
      const covered = (await rowsFor(db, input.pariwarId, input.claimCaseId, 'closure_letter_chase', personKey)).some(
        (r) => r.sentOn >= latestDue,
      );
      if (!covered) await w.write([daKey], 'closure_letter_chase', personKey, latestDue < today);
      if (d >= LETTER_CHASE_ESCALATION_OFFSET) {
        const done = (await rowsFor(db, input.pariwarId, input.claimCaseId, 'closure_letter_escalation', personKey)).length > 0;
        if (!done) {
          const admins = await listAdminsByRole(db, input.pariwarId, 'pariwar_admin');
          await w.write(
            staffKeys(admins.entries.map((a) => a.userId)),
            'closure_letter_escalation',
            personKey,
            d > LETTER_CHASE_ESCALATION_OFFSET,
          );
        }
      }
    }
  }
  const r = w.result();
  return { escalatedStaffCase: false, staffRowsWritten: r.written, pushUserIds: r.pushUserIds, anchor, noticeRecipients, noticeDone };
}

// ── The closure-notice CHILD's claim (`-273` §5) ─────────────────────────────────────────────────────────────────

export type BeginClosureNoticeResult =
  | {
      readonly kind: 'send';
      readonly reminderId: string;
      readonly attemptCount: number;
      readonly person: CorrectionPerson;
      readonly contactLocale: 'hi' | 'en';
    }
  | { readonly kind: 'skipped'; readonly reason: string }
  | { readonly kind: 'noop'; readonly reason: 'already_done' | 'not_a_notice_recipient' | 'already_final' | 'held_by_other' };

/**
 * ⭐ THE CLOSURE-NOTICE CHILD's claim, in ONE transaction under the trustee lock: the closure is `closed` and its notice
 * ⛔ done; the person is one of its recipients; D30 holds NOW (else a FINAL `skipped_superseded` row, written ONCE —
 * `-273` §5: ⛔ retried); then the person's ONE notice row is claimed `attempting` — inserted, or RE-CLAIMED on the SAME
 * row (this job's retry at once, another job's after the lease: `attempt_count + 1`). The caller commits, THEN
 * decrypts and sends, then compare-and-sets the row final (`finaliseCorrectionReminder`).
 */
export async function beginClosureNoticeSend(
  client: pg.PoolClient,
  input: {
    readonly pariwarId: PariwarId;
    readonly claimCaseId: ClaimId;
    readonly closureId: string;
    readonly personKey: string;
    readonly jobId: string;
    readonly now: Date;
  },
): Promise<BeginClosureNoticeResult> {
  await acquireCorrectionChaseLock(client, input.pariwarId, input.claimCaseId);
  const db = bindScopedDb(client);
  const [row] = await db
    .select()
    .from(claimCorrectionClosures)
    .where(and(eq(claimCorrectionClosures.pariwarId, input.pariwarId), eq(claimCorrectionClosures.closureId, input.closureId)))
    .limit(1);
  if (!row || row.state !== 'closed' || row.closureNoticeDoneAt !== null || row.closureNoticeRunId === null) {
    return { kind: 'noop', reason: 'already_done' };
  }
  if (!row.closureNoticePersonKeys.includes(input.personKey)) return { kind: 'noop', reason: 'not_a_notice_recipient' };
  const run = await readCorrectionRun(db, input.pariwarId, row.closureNoticeRunId);
  if (run === null) return { kind: 'noop', reason: 'already_done' };
  const today = istDateOf(input.now);
  const key = {
    runId: run.runId,
    claimCaseId: input.claimCaseId,
    pariwarId: input.pariwarId,
    slotDay: Math.max(0, correctionRunDay(run.day0, today)),
    sentOn: today,
    recipientKey: input.personKey,
    purpose: 'closure_notice' as const,
    subjectKey: '',
  };
  const finalSkip = async (reason: string): Promise<BeginClosureNoticeResult> => {
    await insertFinalCorrectionReminder(db, { ...key, pariwarId: input.pariwarId, outcome: 'skipped_superseded', detail: reason });
    return { kind: 'skipped', reason };
  };
  const recipients = await readCorrectionRecipients(db, input.pariwarId, input.claimCaseId);
  if (recipients.cannotRemind !== null) return finalSkip(`cannot_remind:${recipients.cannotRemind}`);
  const person = recipients.people.find((p) => p.personKey === input.personKey);
  if (person === undefined) return finalSkip('not_a_recipient');

  const inserted = await db
    .insert(claimCorrectionReminders)
    .values({ ...key, outcome: 'attempting', claimedAt: input.now, claimedByJob: input.jobId })
    .onConflictDoNothing()
    .returning({ reminderId: claimCorrectionReminders.reminderId, attemptCount: claimCorrectionReminders.attemptCount });
  if (inserted[0]) {
    return { kind: 'send', reminderId: inserted[0].reminderId, attemptCount: inserted[0].attemptCount, person, contactLocale: recipients.contactLocale };
  }
  // The person's ONE row exists (the ONCE key): final ⇒ nothing; `attempting` ⇒ re-claim it on the SAME row.
  const [existing] = await db
    .select()
    .from(claimCorrectionReminders)
    .where(
      and(
        eq(claimCorrectionReminders.pariwarId, input.pariwarId),
        eq(claimCorrectionReminders.claimCaseId, input.claimCaseId),
        eq(claimCorrectionReminders.purpose, 'closure_notice'),
        eq(claimCorrectionReminders.recipientKey, input.personKey),
      ),
    )
    .limit(1);
  if (!existing || existing.outcome !== 'attempting') return { kind: 'noop', reason: 'already_final' };
  const ownRetry = existing.claimedByJob === input.jobId;
  const leaseExpired = existing.claimedAt !== null && existing.claimedAt.getTime() < input.now.getTime() - CORRECTION_SEND_LEASE_MS;
  if (!ownRetry && !leaseExpired) return { kind: 'noop', reason: 'held_by_other' };
  const reclaimed = await db
    .update(claimCorrectionReminders)
    .set({
      claimedAt: input.now,
      claimedByJob: input.jobId,
      attemptCount: sql`${claimCorrectionReminders.attemptCount} + 1`,
      firstDetail: sql`COALESCE(${claimCorrectionReminders.firstDetail}, ${claimCorrectionReminders.detail})`,
      updatedAt: sql`clock_timestamp()`,
    })
    .where(and(eq(claimCorrectionReminders.reminderId, existing.reminderId), eq(claimCorrectionReminders.outcome, 'attempting')))
    .returning({ reminderId: claimCorrectionReminders.reminderId, attemptCount: claimCorrectionReminders.attemptCount });
  if (!reclaimed[0]) return { kind: 'noop', reason: 'already_final' };
  return { kind: 'send', reminderId: reclaimed[0].reminderId, attemptCount: reclaimed[0].attemptCount, person, contactLocale: recipients.contactLocale };
}

/** The purposes 6.19c writes as STAFF items (the staff push lists them with 6.19b's). */
export const CLOSURE_STAFF_PURPOSES = [
  'closure_due',
  'closure_escalation',
  'staff_case_escalation',
  'review_reminder',
  'direction_reminder',
  'closure_letter_chase',
  'closure_letter_escalation',
] as const satisfies readonly CorrectionReminderPurpose[];
