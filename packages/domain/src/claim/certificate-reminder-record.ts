// The certificate REMINDER RECORD — the claim, the child's re-check and the compare-and-set — Story 6.19d (Task 2/4;
// AC2, AC3; `2026-10-03-276` CR6–CR8). Shaped on 6.19b's `correction-reminder-record.ts`, over THIS story's own table.
//
// ⭐ THE DEDUP IS THE TABLE: UNIQUE `(run_id, slot_day, recipient_key, purpose, subject_key)` + the insert under the
// CLAIM-ROW lock (⛔ never the trustee advisory lock), in ONE transaction with the child's pre-send re-check. The send
// happens AFTER that commit; the row moves to its final state by compare-and-set `attempting` → final, only from
// `attempting` and only by the job that holds it (`moved` is returned — the caller checks it).
// ⭐ A retry of the SAME job re-claims its own `attempting` row at once; another job only after
// `CORRECTION_SEND_LEASE_MS` (6.19b's lease, reused).
// ⭐ CR7's ONE departure from 6.19b: the number hash is written on the `attempting` row (CR6's one-text-per-number rule
// reads it there), and the finalisers KEEP it — so an exhausted `error` row carries the number attempted.
// ⚠ AT-LEAST-ONCE, inherited: a retried `api_unavailable` can text a person twice — recorded in `attempt_count` /
// `first_detail`, ⛔ never hidden.
// ⛔ NO KMS CALL HERE: every hash is computed by the caller BEFORE it takes the claim-row lock (CR7), and passed in.

import { and, eq, sql } from 'drizzle-orm';
import type pg from 'pg';

import { bindScopedDb, type Db } from '../db.js';
import type { ClaimId, NomineeVersionId, PariwarId } from '../ids/index.js';
import {
  type CertificateReminderOutcome,
  type CertificateReminderPurpose,
  type ClaimCertificateReminderRow,
  claimCertificateReminders,
} from '../schema/claim_certificate_reminder.js';
import {
  type CertificateNumberHash,
  type CertificatePerson,
  evaluateCertificatePersonStates,
  lockCertificateClaim,
  planCertificateRun,
  readCertificatePlanFacts,
  readCertificateRecipients,
  readClaimCertificateFamilyRows,
  readClaimCertificateLetters,
  samePersonSource,
} from './certificate-reminder.js';
import { istDateOf } from './correction-schedule.js';
import { CORRECTION_SEND_LEASE_MS } from './correction-reminder-record.js';

/** The identity of one certificate reminder row — the table's UNIQUE key. */
export interface CertificateReminderKey {
  readonly pariwarId: PariwarId;
  readonly claimCaseId: ClaimId;
  readonly runId: string;
  readonly slotDay: number;
  readonly recipientKey: string;
  readonly purpose: CertificateReminderPurpose;
  /** The chased person on a staff row, else `''` (⛔ never null — the UNIQUE would be void). */
  readonly subjectKey: string;
}

function keyWhere(k: CertificateReminderKey) {
  return and(
    eq(claimCertificateReminders.pariwarId, k.pariwarId),
    eq(claimCertificateReminders.runId, k.runId),
    eq(claimCertificateReminders.slotDay, k.slotDay),
    eq(claimCertificateReminders.recipientKey, k.recipientKey),
    eq(claimCertificateReminders.purpose, k.purpose),
    eq(claimCertificateReminders.subjectKey, k.subjectKey),
  );
}

/** Read one row by its key, or `null`. */
export async function readCertificateReminder(db: Db, k: CertificateReminderKey): Promise<ClaimCertificateReminderRow | null> {
  const [row] = await db.select().from(claimCertificateReminders).where(keyWhere(k)).limit(1);
  return row ?? null;
}

/**
 * Write a row that is FINAL at insert — a staff row (`recorded` / `no_target`), a `no_target` family row, a
 * `skipped_superseded` marker, or the final `error` of a hash that never cleared. `ON CONFLICT DO NOTHING` over EVERY
 * unique index (the slot key and the staff day key). Returns whether a row was inserted.
 */
export async function insertFinalCertificateReminder(
  db: Db,
  k: CertificateReminderKey & {
    readonly sentOn: string;
    readonly outcome: Exclude<CertificateReminderOutcome, 'attempting'>;
    readonly late?: boolean;
    readonly detail?: string | null;
    readonly recipientVersionId?: string | null;
    readonly recipientNumberHash?: string | null;
  },
): Promise<boolean> {
  const rows = await db
    .insert(claimCertificateReminders)
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
      recipientVersionId: (k.recipientVersionId ?? null) as NomineeVersionId | null,
      recipientNumberHash: k.recipientNumberHash ?? null,
    })
    .onConflictDoNothing()
    .returning({ reminderId: claimCertificateReminders.reminderId });
  return rows.length > 0;
}

export type CertificateClaimResult =
  | { readonly status: 'claimed'; readonly reminderId: string; readonly attemptCount: number }
  | { readonly status: 'already_final' }
  | { readonly status: 'held_by_other' };

/**
 * Claim a row for a SEND: insert it `attempting` (this job, now, WITH the number hash — CR7), or re-claim an existing
 * `attempting` row — at once when this job holds it, after the lease when another does. ⚠ Under the claim-row lock.
 */
export async function claimCertificateReminder(
  db: Db,
  k: CertificateReminderKey & {
    readonly sentOn: string;
    readonly late: boolean;
    readonly jobId: string;
    readonly now: Date;
    readonly recipientVersionId: string | null;
    readonly recipientNumberHash: string;
  },
): Promise<CertificateClaimResult> {
  const inserted = await db
    .insert(claimCertificateReminders)
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
      recipientVersionId: k.recipientVersionId as NomineeVersionId | null,
      recipientNumberHash: k.recipientNumberHash,
    })
    .onConflictDoNothing()
    .returning({ reminderId: claimCertificateReminders.reminderId, attemptCount: claimCertificateReminders.attemptCount });
  if (inserted[0]) return { status: 'claimed', reminderId: inserted[0].reminderId, attemptCount: inserted[0].attemptCount };

  const existing = await readCertificateReminder(db, k);
  if (existing === null || existing.outcome !== 'attempting') return { status: 'already_final' };
  const ownRetry = existing.claimedByJob === k.jobId;
  const leaseExpired =
    existing.claimedAt !== null && existing.claimedAt.getTime() < k.now.getTime() - CORRECTION_SEND_LEASE_MS;
  if (!ownRetry && !leaseExpired) return { status: 'held_by_other' };
  const reclaimed = await db
    .update(claimCertificateReminders)
    .set({
      claimedAt: k.now,
      claimedByJob: k.jobId,
      recipientVersionId: k.recipientVersionId as NomineeVersionId | null,
      recipientNumberHash: k.recipientNumberHash,
      attemptCount: sql`${claimCertificateReminders.attemptCount} + 1`,
      firstDetail: sql`COALESCE(${claimCertificateReminders.firstDetail}, ${claimCertificateReminders.detail})`,
      updatedAt: sql`clock_timestamp()`,
    })
    .where(
      and(eq(claimCertificateReminders.reminderId, existing.reminderId), eq(claimCertificateReminders.outcome, 'attempting')),
    )
    .returning({ reminderId: claimCertificateReminders.reminderId, attemptCount: claimCertificateReminders.attemptCount });
  return reclaimed[0]
    ? { status: 'claimed', reminderId: reclaimed[0].reminderId, attemptCount: reclaimed[0].attemptCount }
    : { status: 'already_final' };
}

/**
 * A failed re-check: compare-and-set THIS job's own `attempting` row to `skipped_superseded`, else write the marker.
 * ⭐ When this job's own `attempting` row already carries an attempt's `detail` (a transient failure that may have sent),
 * it is EXPIRED `error` (`exhausted:recheck_<reason>`) — ⛔ never `skipped_superseded` (6.19b's K4); the caller alarms.
 */
export async function skipCertificateReminder(
  db: Db,
  k: CertificateReminderKey & { readonly sentOn: string; readonly late: boolean; readonly jobId: string; readonly reason: string },
): Promise<{ readonly expiredAttempt: boolean }> {
  const existing = await readCertificateReminder(db, k);
  if (existing !== null) {
    if (existing.outcome === 'attempting' && existing.claimedByJob === k.jobId) {
      if (existing.detail !== null) {
        const expired = await expireOwnCertificateReminder(db, {
          pariwarId: k.pariwarId,
          reminderId: existing.reminderId,
          jobId: k.jobId,
          detail: `exhausted:recheck_${k.reason}`,
        });
        return { expiredAttempt: expired };
      }
      const moved = await db
        .update(claimCertificateReminders)
        .set({ outcome: 'skipped_superseded', detail: k.reason, updatedAt: sql`clock_timestamp()` })
        .where(
          and(
            eq(claimCertificateReminders.reminderId, existing.reminderId),
            eq(claimCertificateReminders.outcome, 'attempting'),
            eq(claimCertificateReminders.claimedByJob, k.jobId),
            sql`${claimCertificateReminders.detail} IS NULL`,
          ),
        )
        .returning({ reminderId: claimCertificateReminders.reminderId });
      // Lost the CAS: `detail` went non-null between the read above and this write (a concurrent
      // `noteCertificateReminderTransient`). The row is still ours and still `attempting` — re-check
      // once, the same as the branch above would have, instead of leaving it stuck un-expired.
      if (moved.length === 0) {
        const expired = await expireOwnCertificateReminder(db, {
          pariwarId: k.pariwarId,
          reminderId: existing.reminderId,
          jobId: k.jobId,
          detail: `exhausted:recheck_${k.reason}`,
        });
        return { expiredAttempt: expired };
      }
    }
    return { expiredAttempt: false };
  }
  await insertFinalCertificateReminder(db, { ...k, outcome: 'skipped_superseded', detail: k.reason });
  return { expiredAttempt: false };
}

/**
 * ⭐ THE COMPARE-AND-SET: `attempting` → final, only from `attempting` and only by the job holding the row. ⭐ KEEPS the
 * row's number hash (written at claim). Returns `false` when the row moved on — the caller CHECKS it (6.19c's lost-CAS
 * finding). ⛔ `delivered_at` is ⛔ never written here — an accept is ⛔ not a delivery.
 */
export async function finaliseCertificateReminder(
  db: Db,
  input: {
    readonly pariwarId: PariwarId;
    readonly reminderId: string;
    readonly jobId: string;
    readonly outcome: 'accepted' | 'rejected_invalid_number' | 'rejected_unreachable' | 'error';
    readonly providerMessageId?: string | null;
    readonly detail?: string | null;
  },
): Promise<boolean> {
  const rows = await db
    .update(claimCertificateReminders)
    .set({
      outcome: input.outcome,
      providerMessageId: input.providerMessageId ?? null,
      detail: input.detail ?? null,
      updatedAt: sql`clock_timestamp()`,
    })
    .where(
      and(
        eq(claimCertificateReminders.pariwarId, input.pariwarId),
        eq(claimCertificateReminders.reminderId, input.reminderId),
        eq(claimCertificateReminders.outcome, 'attempting'),
        eq(claimCertificateReminders.claimedByJob, input.jobId),
      ),
    )
    .returning({ reminderId: claimCertificateReminders.reminderId });
  return rows.length > 0;
}

/**
 * EXPIRE THIS JOB'S OWN `attempting` row (a child redelivered after IST midnight, or a failed re-check after an attempt):
 * → `error`, the transient detail kept in `first_detail`, `detail` = the reason; the hash KEPT. ⛔ Never
 * `skipped_superseded`. Returns whether it moved; the caller alarms (ids only).
 */
export async function expireOwnCertificateReminder(
  db: Db,
  input: { readonly pariwarId: PariwarId; readonly reminderId: string; readonly jobId: string; readonly detail: string },
): Promise<boolean> {
  const rows = await db
    .update(claimCertificateReminders)
    .set({
      outcome: 'error',
      firstDetail: sql`COALESCE(${claimCertificateReminders.firstDetail}, ${claimCertificateReminders.detail})`,
      detail: input.detail,
      updatedAt: sql`clock_timestamp()`,
    })
    .where(
      and(
        eq(claimCertificateReminders.pariwarId, input.pariwarId),
        eq(claimCertificateReminders.reminderId, input.reminderId),
        eq(claimCertificateReminders.outcome, 'attempting'),
        eq(claimCertificateReminders.claimedByJob, input.jobId),
      ),
    )
    .returning({ reminderId: claimCertificateReminders.reminderId });
  return rows.length > 0;
}

/** A TRANSIENT failure: keep the row `attempting` (the retry re-claims it) and record the classified detail. */
export async function noteCertificateReminderTransient(
  db: Db,
  input: { readonly pariwarId: PariwarId; readonly reminderId: string; readonly jobId: string; readonly detail: string },
): Promise<void> {
  await db
    .update(claimCertificateReminders)
    .set({ detail: input.detail, updatedAt: sql`clock_timestamp()` })
    .where(
      and(
        eq(claimCertificateReminders.pariwarId, input.pariwarId),
        eq(claimCertificateReminders.reminderId, input.reminderId),
        eq(claimCertificateReminders.outcome, 'attempting'),
        eq(claimCertificateReminders.claimedByJob, input.jobId),
      ),
    );
}

// ── The child's pre-send re-check (CR5–CR8) ─────────────────────────────────────────────────────────────────────

/** Why a certificate SMS was ⛔ not sent (the `detail` of its `skipped_superseded` row). */
export type CertificateSkipReason =
  | 'run_ended'
  | 'not_due'
  | 'not_a_recipient'
  | 'letter_delivered'
  | 'same_number_in_slot';

export type BeginCertificateFamilySendResult =
  | {
      readonly kind: 'send';
      readonly reminderId: string;
      readonly attemptCount: number;
      readonly person: CertificatePerson;
      readonly contactLocale: 'hi' | 'en';
    }
  /** The person has ⛔ no sendable number — a FINAL `no_target` row was written (⛔ no send). */
  | { readonly kind: 'no_target' }
  | { readonly kind: 'skipped'; readonly reason: CertificateSkipReason; readonly expiredAttempt?: true }
  /**
   * ⛔ No send and ⛔ no record (the catch-up sends the latest missed slot later): the run is PAUSED (CR5), or the family
   * cannot be reminded (CR6 — ⛔ no contact record / an agreement ⛔ live), or the row is final / held by another job.
   */
  | { readonly kind: 'noop'; readonly reason: 'paused' | 'no_contact_record' | 'agreement_not_live' | 'already_final' | 'held_by_other' };

/**
 * The person's version (or the claimant's ciphertext) moved between the pre-lock hash and the lock — the hash is about
 * another number. ⛔ No write; the job retries (it re-reads and re-hashes). ⛔ Carries no number.
 */
export class CertificateRecipientsMovedError extends Error {
  public readonly name = 'CertificateRecipientsMovedError';
  public constructor(public readonly claimCaseId: string) {
    super(`[certificate-reminder] claim ${claimCaseId}: the contact record moved since the numbers were hashed`);
  }
}

/**
 * ⭐ THE CHILD'S PRE-SEND RE-CHECK, in ONE transaction under the CLAIM-ROW lock (the caller set `lock_timeout` first and
 * hashed EVERY person's current number BEFORE this — `prelock`): the run is still the claim's open run and its plan is
 * still `continue` with this slot due (CR5); the family can still be reminded and the person is still on the record
 * (CR6), with the SAME version / ciphertext the hashes were taken from (else `CertificateRecipientsMovedError`); ⛔ no
 * letter was delivered to ANY person at this number (CR6/CR8); one text per NUMBER per slot — the LOWEST person key
 * sharing the hash sends, and a row of this run and slot already carrying the hash (any outcome but
 * `skipped_superseded`, a dead-number row included) blocks it. Only then is the row claimed `attempting` WITH its hash.
 * A person with ⛔ no sendable number gets a final `no_target` row (⛔ no send). ⛔ No KMS call here.
 */
export async function beginCertificateFamilySend(
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
    readonly prelock: {
      readonly people: readonly CertificatePerson[];
      readonly hashes: ReadonlyMap<string, CertificateNumberHash>;
    };
  },
): Promise<BeginCertificateFamilySendResult> {
  const db = bindScopedDb(client);
  const key: CertificateReminderKey = {
    pariwarId: input.pariwarId,
    claimCaseId: input.claimCaseId,
    runId: input.runId,
    slotDay: input.slotDay,
    recipientKey: input.personKey,
    purpose: 'family_sms',
    subjectKey: '',
  };
  const skip = async (reason: CertificateSkipReason): Promise<BeginCertificateFamilySendResult> => {
    const { expiredAttempt } = await skipCertificateReminder(db, {
      ...key,
      sentOn: input.sentOn,
      late: input.late,
      jobId: input.jobId,
      reason,
    });
    return expiredAttempt ? { kind: 'skipped', reason, expiredAttempt: true } : { kind: 'skipped', reason };
  };

  if ((await lockCertificateClaim(db, input.pariwarId, input.claimCaseId)) === null) return skip('run_ended');
  const facts = await readCertificatePlanFacts(db, input.pariwarId, input.claimCaseId);
  if (facts === null) return skip('run_ended');
  const plan = planCertificateRun(facts, istDateOf(input.now));
  if (plan.kind === 'pause' && plan.runId === input.runId) return { kind: 'noop', reason: 'paused' };
  if (plan.kind !== 'continue' || plan.runId !== input.runId) return skip('run_ended');
  if (input.slotDay > plan.runDay || input.slotDay < 1) return skip('not_due');

  const recipients = await readCertificateRecipients(db, input.pariwarId, input.claimCaseId);
  if (recipients.cannotRemind !== null) return { kind: 'noop', reason: recipients.cannotRemind };
  const person = recipients.people.find((p) => p.personKey === input.personKey);
  if (person === undefined) return skip('not_a_recipient');
  const pre = new Map(input.prelock.people.map((p) => [p.personKey, p]));
  if (recipients.people.length !== pre.size || recipients.people.some((p) => !samePersonSource(p, pre.get(p.personKey)))) {
    throw new CertificateRecipientsMovedError(input.claimCaseId);
  }

  const rows = await readClaimCertificateFamilyRows(db, input.pariwarId, input.claimCaseId);
  const letters = await readClaimCertificateLetters(db, input.pariwarId, input.claimCaseId);
  const states = evaluateCertificatePersonStates(recipients.people, rows, letters, input.prelock.hashes);
  const mine = states.find((s) => s.personKey === input.personKey)!;
  if (mine.numberLetterDelivered) return skip('letter_delivered');

  const myHash = input.prelock.hashes.get(input.personKey);
  if (myHash === undefined || 'failed' in myHash) throw new CertificateRecipientsMovedError(input.claimCaseId);
  if (myHash.hash === null) {
    // A vacated head, the erasure sentinel or a malformed number ⇒ `no_target` WITHOUT a send (AC8).
    await insertFinalCertificateReminder(db, {
      ...key,
      sentOn: input.sentOn,
      late: input.late,
      outcome: 'no_target',
      detail: 'no_target:no_sendable_number',
      recipientVersionId: person.versionId,
      recipientNumberHash: null,
    });
    return { kind: 'no_target' };
  }
  const hash = myHash.hash;
  // ⭐ CR6 — one human, one text per slot, decided by NUMBER: (i) the LOWEST person key sharing the hash sends;
  const lower = recipients.people.some((p) => {
    if (p.personKey >= input.personKey) return false;
    const h = input.prelock.hashes.get(p.personKey);
    return h !== undefined && !('failed' in h) && h.hash === hash;
  });
  // (ii) a row of this run and slot already carrying the hash — a dead-number row included — blocks it.
  const taken = rows.some(
    (r) =>
      r.runId === input.runId &&
      r.slotDay === input.slotDay &&
      r.recipientKey !== input.personKey &&
      r.recipientNumberHash === hash &&
      r.outcome !== 'skipped_superseded',
  );
  if (lower || taken) return skip('same_number_in_slot');

  const claimed = await claimCertificateReminder(db, {
    ...key,
    sentOn: input.sentOn,
    late: input.late,
    jobId: input.jobId,
    now: input.now,
    recipientVersionId: person.versionId,
    recipientNumberHash: hash,
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

/**
 * ⭐ CR8 — the FINAL attempt's hash failure: the person's number could ⛔ not be hashed on any try. Under the claim-row
 * lock, write a FINAL `error` row (`recipient_number_hash` NULL, `exhausted:hash_failed`) — non-evidential under
 * `isEvidentialReminderRow`, and a RECORDED day, so it is ⛔ never caught up `late` tomorrow. Returns whether it was
 * written (⛔ over an existing row it is a no-op). The caller alarms (ids only).
 */
export async function recordCertificateHashFailure(
  client: pg.PoolClient,
  input: {
    readonly pariwarId: PariwarId;
    readonly claimCaseId: ClaimId;
    readonly runId: string;
    readonly slotDay: number;
    readonly personKey: string;
    readonly sentOn: string;
    readonly late: boolean;
  },
): Promise<boolean> {
  const db = bindScopedDb(client);
  if ((await lockCertificateClaim(db, input.pariwarId, input.claimCaseId)) === null) return false;
  return insertFinalCertificateReminder(db, {
    pariwarId: input.pariwarId,
    claimCaseId: input.claimCaseId,
    runId: input.runId,
    slotDay: input.slotDay,
    recipientKey: input.personKey,
    purpose: 'family_sms',
    subjectKey: '',
    sentOn: input.sentOn,
    late: input.late,
    outcome: 'error',
    detail: 'exhausted:hash_failed',
    recipientNumberHash: null,
  });
}
