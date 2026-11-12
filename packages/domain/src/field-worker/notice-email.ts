// The EMAIL of a field worker move notice — the domain half (Story 13.1g, Task 2.2; decision `2026-11-12-463` AD2-AD6, AD13; ADR-0045;
// the Panel's `-443` Q1 A: "Both District Admins are told by email and in the admin console, including when the Pariwar Admin moves a
// worker."). Transport-free; ⛔ nothing here decrypts (the jobs child does, AFTER the claiming commit). ⭐ A MIRROR of Story 11b.4a's
// `../memorial/takedown-approver-email.ts` (itself 6.25's `../claim/suspicion-staff-email.ts`) — the same lease, park, give-up,
// compare-and-set and transient note — keyed on the NOTICE: one Story 13.1d `field_worker_notices` row is one email, EVER.
//
// ⭐ THE RECIPIENT is the notice row's `recipient_user_id` — ⛔ re-derived (TR2: 13.1d's helpers would email officers appointed after the
// act). Q4 (`fieldWorkerNoticeEmailEligibleSql`) re-checks it at claim and only REMOVES: ⛔ eligible ⇒ `skipped` / `skipped:not_eligible`
// at a FIRST claim (nothing was tried), or `error` / `exhausted:recheck_not_eligible` on a RE-claim (a prior attempt may have sent).
// ⭐ THE Q-2 RULE (AD6, word for word in `-463`): every eligible notice is emailed, seen in the console or not, its request moved on or
// not — EXCEPT a notice that expires under the held-backlog cutoff (3 IST days, `suspicionStaffEmailReclaimCutoff`): (i) a notice with
// ⛔ email row by the cutoff is NEVER emailed; (ii) a send still `attempting` 3 IST days on (parked time not counted) is given up. So the
// email path ⛔ reads `seen_at` and ⛔ reads the request's state.
// ⭐ THE DEDUP IS THE PRIMARY KEY + A NOTICE-KEYED ADVISORY LOCK — ⛔ `FOR UPDATE` on the notice (TR3: it would block the officer's
// mark-seen; `twt_app` holds UPDATE on `seen_at` only anyway).
// ⚠ DELIBERATE (G18, AD3 (c)): the child runs on the jobs pool inside `withPariwarScope`, which sets `app.pariwar_id` and ⛔ no role — on
// a BYPASSRLS login RLS does ⛔ not separate Pariwars here, so EVERY per-notice statement below carries an explicit `pariwar_id`
// predicate. It also stays inside 0206's `twt_app` column grants, so it is right under `SET LOCAL ROLE twt_app` too (AD13).
// ⛔⛔ NOTHING here writes `field_worker_notices` (⛔ `seen_at`), a move request, `events_log`, `role_grants`, `users` or `admin_credentials`
// (I3; `apps/jobs/tests/field-worker-notice-email-no-decision.test.ts`).
// ⚠ ⛔ Never a Drizzle correlated subquery — raw SQL with explicit `fe_` aliases ([[project_epic6_drizzle_correlated_subquery_bug]]).

import { type SQL, sql } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import type pg from 'pg';

import {
  STAFF_EMAIL_SEND_LEASE_MS,
  SUSPICION_STAFF_EMAIL_PARKED_BY,
  SUSPICION_STAFF_EMAIL_RECLAIM_DAYS,
  sanitizeProviderErrorName,
  suspicionStaffEmailReclaimCutoff,
} from '../claim/suspicion-staff-email.js';
import type { Db } from '../db.js';
import type { FieldWorkerNoticeId, PariwarId, UserId } from '../ids/index.js';
import { clampLimit } from '../pagination.js';
import { FIELD_WORKER_NOTICE_EMAIL_DETAIL_PATTERN } from '../schema/field_worker_notice_emails.js';
import type { FieldWorkerNoticeKind } from '../schema/field_worker_notices.js';
import { fieldWorkerNoticeEmailEligibleSql } from './notice-email-eligibility-read.js';

/** The sweep's page size cap. */
export const FIELD_WORKER_NOTICE_EMAIL_PAGE_CAP = 1000;
/** The held-backlog cutoff and the give-up — 6.25's 3 IST calendar days (the Q-2 rule's exception). */
export const FIELD_WORKER_NOTICE_EMAIL_RECLAIM_DAYS = SUSPICION_STAFF_EMAIL_RECLAIM_DAYS;
/** The claiming transaction's wait on the notice lock (`SET LOCAL`). */
export const FIELD_WORKER_NOTICE_EMAIL_LOCK_TIMEOUT = '30s';
/** THE LEASE — 6.25's (30 min). */
export const FIELD_WORKER_NOTICE_EMAIL_LEASE_MS = STAFF_EMAIL_SEND_LEASE_MS;
/** THE PARKED MARKER — 6.25's value; ⚠ LOCKSTEP with 0206's `…_parked_check` and the trigger (both hard-code `sweep:held`). */
export const FIELD_WORKER_NOTICE_EMAIL_PARKED_BY = SUSPICION_STAFF_EMAIL_PARKED_BY;

type Queryable = Pick<pg.Pool, 'query'> | Pick<pg.PoolClient, 'query'>;

const dialect = new PgDialect();

async function run<T extends pg.QueryResultRow>(q: Queryable, statement: SQL): Promise<T[]> {
  const { sql: text, params } = dialect.sqlToQuery(statement);
  const { rows } = await q.query<T>(text, params as unknown[]);
  return rows;
}

function toDate(v: Date | string): Date {
  return v instanceof Date ? v : new Date(v);
}

// ── The `detail` vocabulary — ONE builder; ⛔ no free text, ⛔ never provider message text ───────────────────────────────────

/** Why ⛔ address could be used after `begun`. ⚠ LOCKSTEP with 0206's grammar. */
export const FIELD_WORKER_NOTICE_EMAIL_ERROR_REASONS = ['no_address', 'invalid_address'] as const;
export type FieldWorkerNoticeEmailErrorReason = (typeof FIELD_WORKER_NOTICE_EMAIL_ERROR_REASONS)[number];

export type FieldWorkerNoticeEmailDetailInput =
  | { readonly kind: 'not_eligible' }
  | { readonly kind: 'transient'; readonly name: string }
  | { readonly kind: 'held'; readonly name: string }
  | { readonly kind: 'pre_call'; readonly step: 'read_failed' | 'decrypt_failed' | 'render_failed' }
  | { readonly kind: 'rejected'; readonly http: number; readonly name: string }
  | { readonly kind: 'error'; readonly reason: FieldWorkerNoticeEmailErrorReason }
  | { readonly kind: 'exhausted_three_days' }
  | { readonly kind: 'recheck_not_eligible' };

/** ⭐ THE ONLY way a `detail` / `first_detail` is built (0206 CHECKs ≤ 200 chars and the grammar). */
export function fieldWorkerNoticeEmailDetail(d: FieldWorkerNoticeEmailDetailInput): string {
  switch (d.kind) {
    case 'not_eligible':
      return 'skipped:not_eligible';
    case 'transient':
      return `transient:${sanitizeProviderErrorName(d.name)}`;
    case 'held':
      return `held:${sanitizeProviderErrorName(d.name)}`;
    case 'pre_call':
      return `transient:${d.step}`;
    case 'rejected':
      return `rejected:${String(Number.isInteger(d.http) && d.http >= 100 && d.http <= 599 ? d.http : 0)}:${sanitizeProviderErrorName(d.name)}`;
    case 'error':
      return `error:${d.reason}`;
    case 'exhausted_three_days':
      return 'exhausted:attempting_three_days';
    case 'recheck_not_eligible':
      return 'exhausted:recheck_not_eligible';
  }
}

const DETAIL_PATTERN = new RegExp(FIELD_WORKER_NOTICE_EMAIL_DETAIL_PATTERN);

/** Does `detail` match the vocabulary's grammar (0206's CHECK — the SAME pattern)? */
export function isFieldWorkerNoticeEmailDetail(detail: string): boolean {
  return DETAIL_PATTERN.test(detail);
}

function assertDetail(detail: string | null): void {
  if (detail !== null && !isFieldWorkerNoticeEmailDetail(detail)) {
    throw new Error('[field-worker-notice-email] a detail outside the fixed vocabulary — build it with fieldWorkerNoticeEmailDetail');
  }
}

// ── The selector — cross-tenant, BYPASSRLS pool, keyset-paged on `notice_id`, clamped ──────────────────────────────────────────

/** One due notice — ids and a flag ONLY (I7). */
export interface DueFieldWorkerNoticeEmail {
  readonly pariwarId: PariwarId;
  readonly noticeId: FieldWorkerNoticeId;
  /** An `attempting` row exists — the predicate was bypassed so its locked re-check finishes it. */
  readonly hasAttemptingRow: boolean;
}

export interface DueFieldWorkerNoticeEmailPage {
  readonly due: readonly DueFieldWorkerNoticeEmail[];
  /** The keyset cursor: the page's last `notice_id` (⛔ a timestamp — a JS `Date` drops microseconds). */
  readonly last: string | null;
  readonly scanned: number;
}

/**
 * ⭐ The due notices, one keyset page. Two disjoint branches (a notice is in (i) only while it has ⛔ email row, in (ii) only with one):
 *   (i) every notice with ⛔ email row created at or after the held-backlog cutoff (`suspicionStaffEmailReclaimCutoff(now)` — the
 *       give-up's own cutoff, so one clock rules both) — ⛔ a `seen_at` filter (Q-2 B), ⛔ the request's state;
 *   (ii) every `attempting` email row, whatever its notice's age — its locked re-check finishes it (a row parked by a held run is
 *       otherwise never selected again).
 *
 * ── DELIBERATE: a CROSS-TENANT READ on the BYPASSRLS pool (family 9) ──
 * The sweep has ⛔ tenant to start from. It RETURNS ids only (`notice_id`, `pariwar_id`, a boolean) and reads ⛔ identity data (Q4 runs
 * in the child, under the lock). ⛔ PII and ⛔ value from one tenant reaches another; every write that follows runs in the child's own
 * `withPariwarScope` transaction with an explicit `pariwar_id` predicate. RE-EXAMINE when: the result carries more than ids / flags, the
 * read projects a content column, a write is added on this pool, the pool loses BYPASSRLS, or a per-tenant scheduler exists.
 */
export async function selectDueFieldWorkerNoticeEmails(
  q: Queryable,
  input: { readonly after: string | null; readonly limit: number; readonly now: Date; readonly allow: readonly string[] | null },
): Promise<DueFieldWorkerNoticeEmailPage> {
  const size = clampLimit(input.limit, { default: FIELD_WORKER_NOTICE_EMAIL_PAGE_CAP, cap: FIELD_WORKER_NOTICE_EMAIL_PAGE_CAP });
  // ⚠ `sql.param` — a bare array in a Drizzle template is EXPANDED into one parameter per element.
  const allowN = input.allow === null ? sql`` : sql` AND fe_n.pariwar_id = ANY(${sql.param([...input.allow])}::uuid[])`;
  const allowA = input.allow === null ? sql`` : sql` AND fe_a.pariwar_id = ANY(${sql.param([...input.allow])}::uuid[])`;
  const after = input.after === null ? sql`` : sql` WHERE fe_due.notice_id > ${input.after}::uuid`;
  const cutoff = suspicionStaffEmailReclaimCutoff(input.now);
  const rows = await run<{ notice_id: string; pariwar_id: string; has_attempting: boolean }>(
    q,
    sql`
      SELECT fe_due.notice_id, fe_due.pariwar_id, fe_due.has_attempting
        FROM (
          SELECT fe_n.notice_id, fe_n.pariwar_id, false AS has_attempting
            FROM field_worker_notices fe_n
           WHERE fe_n.created_at >= ${cutoff}::timestamptz${allowN}
             AND NOT EXISTS (SELECT 1 FROM field_worker_notice_emails fe_e
                              WHERE fe_e.pariwar_id = fe_n.pariwar_id AND fe_e.notice_id = fe_n.notice_id)
          UNION ALL
          SELECT fe_a.notice_id, fe_a.pariwar_id, true AS has_attempting
            FROM field_worker_notice_emails fe_a
           WHERE fe_a.outcome = 'attempting'${allowA}
        ) fe_due${after}
       ORDER BY fe_due.notice_id ASC
       LIMIT ${sql.raw(String(size))}
    `,
  );
  const due = rows.map((r) => ({
    pariwarId: r.pariwar_id as PariwarId,
    noticeId: r.notice_id as FieldWorkerNoticeId,
    hasAttemptingRow: r.has_attempting,
  }));
  return { due, last: rows.at(-1)?.notice_id ?? null, scanned: rows.length };
}

// ── The give-up and the hold park — 6.25's, on this table ─────────────────────────────────────────────────────────────────────

/** The held-backlog cutoff: 00:00 IST of (today − 2) — a notice created before it is ⛔ emailed; an `attempting` row aging from before it is given up. */
export function fieldWorkerNoticeEmailReclaimCutoff(now: Date): Date {
  return suspicionStaffEmailReclaimCutoff(now);
}

/**
 * THE EXHAUSTED-ROW FINALISER (the Q-2 rule's exception (ii)): every `attempting` row whose `aging_since` is before `cutoff`, claimed
 * before the lease and ⛔ parked ⇒ `error` / `exhausted:attempting_three_days`, `may_have_sent`. Run ONLY on an un-held run. Returns
 * the notices, for the caller's ONE alarm.
 *
 * ── DELIBERATE: a CROSS-TENANT WRITE on the BYPASSRLS pool (family 9) ──
 * A time bound over EVERY tenant's rows; its predicate and its effect read and write ⛔ nothing tenant-derived — ⛔ PII, ⛔ cross-row
 * join; `allow` (tests) narrows it. RE-EXAMINE when: it writes a value derived from another row or tenant, the pool loses BYPASSRLS, a
 * per-tenant scheduler exists, or the lease approaches the reclaim horizon.
 */
export async function expireExhaustedFieldWorkerNoticeEmails(
  q: Queryable,
  input: { readonly cutoff: Date; readonly now: Date; readonly allow: readonly string[] | null },
): Promise<{ readonly noticeId: FieldWorkerNoticeId; readonly pariwarId: PariwarId }[]> {
  const { rows } = await q.query<{ notice_id: string; pariwar_id: string }>(
    `UPDATE field_worker_notice_emails
        SET outcome = 'error',
            may_have_sent = true,
            first_detail = COALESCE(first_detail, detail),
            detail = $4,
            updated_at = clock_timestamp()
      WHERE outcome = 'attempting' AND aging_since < $1 AND claimed_at < $3 AND claimed_by_job <> $5
        AND ($2::uuid[] IS NULL OR pariwar_id = ANY($2::uuid[]))
      RETURNING notice_id, pariwar_id`,
    [
      input.cutoff,
      input.allow === null ? null : [...input.allow],
      new Date(input.now.getTime() - FIELD_WORKER_NOTICE_EMAIL_LEASE_MS),
      fieldWorkerNoticeEmailDetail({ kind: 'exhausted_three_days' }),
      FIELD_WORKER_NOTICE_EMAIL_PARKED_BY,
    ],
  );
  return rows.map((r) => ({ noticeId: r.notice_id as FieldWorkerNoticeId, pariwarId: r.pariwar_id as PariwarId }));
}

/**
 * THE HOLD PARK (6.25's `parkHeldSuspicionStaffEmails`, on this table): on a HELD run, every `attempting` row past the lease is marked
 * parked, so the give-up cannot burn it while ⛔ retry runs; the next child re-claims it (crediting the parked time). Returns how many.
 *
 * ── DELIBERATE: a CROSS-TENANT WRITE on the BYPASSRLS pool (family 9) ── the give-up's twin; same bounds, same RE-EXAMINE list.
 */
export async function parkHeldFieldWorkerNoticeEmails(q: Queryable, input: { readonly now: Date; readonly allow: readonly string[] | null }): Promise<number> {
  const { rowCount } = await q.query(
    `UPDATE field_worker_notice_emails
        SET claimed_by_job = $3, parked_at = $4, updated_at = clock_timestamp()
      WHERE outcome = 'attempting' AND claimed_at < $1 AND claimed_by_job <> $3
        AND ($2::uuid[] IS NULL OR pariwar_id = ANY($2::uuid[]))`,
    [new Date(input.now.getTime() - FIELD_WORKER_NOTICE_EMAIL_LEASE_MS), input.allow === null ? null : [...input.allow], FIELD_WORKER_NOTICE_EMAIL_PARKED_BY, input.now],
  );
  return rowCount ?? 0;
}

// ── The claiming transaction ──────────────────────────────────────────────────────────────────────────────────────────────────

export type BeginFieldWorkerNoticeEmailResult =
  | {
      readonly kind: 'begun';
      readonly noticeId: FieldWorkerNoticeId;
      /** The notice row's recipient (I6) — the ONLY person this email may go to. */
      readonly recipientUserId: UserId;
      /** The notice's kind — selects the template; ⛔ other notice column leaves this function (I1). */
      readonly noticeKind: FieldWorkerNoticeKind;
      readonly attemptCount: number;
      /** The row's `detail` BEFORE this claim cleared it — the held-fault alarm's "is this fault new?". */
      readonly previousDetail: string | null;
      readonly mayHaveSent: boolean;
    }
  | { readonly kind: 'already_final' }
  | { readonly kind: 'held_by_other' }
  /** A FIRST claim whose recipient is ⛔ eligible (Q4) — a `skipped` row written; nothing sent. */
  | { readonly kind: 'skipped' }
  /** An existing `attempting` row finished `error` by a failed re-check — the caller ALWAYS alarms "may have sent". */
  | { readonly kind: 'expired'; readonly detail: string };

interface NoticeEmailRow {
  outcome: string;
  detail: string | null;
  claimed_at: Date | string | null;
  claimed_by_job: string | null;
}

/**
 * ⭐ THE CLAIMING TRANSACTION — on the ONE client of the caller's scope transaction: take the notice lock, read the notice and its email
 * row, re-check Q4 under the lock, and claim (or finish) the row. ⛔ KMS, ⛔ decrypt, ⛔ address here — the caller COMMITS, then reads
 * Q2, decrypts and sends. ⛔ Never catch a DB error inside this transaction.
 * @throws Error the notice is missing under this Pariwar — a data fault (notices are ⛔ deleted), ⛔ a `skipped`.
 */
export async function beginFieldWorkerNoticeEmail(
  client: pg.PoolClient,
  input: { readonly pariwarId: PariwarId; readonly noticeId: string; readonly jobId: string; readonly now: Date },
): Promise<BeginFieldWorkerNoticeEmailResult> {
  const { pariwarId, jobId, now } = input;
  const noticeId = String(input.noticeId).toLowerCase() as FieldWorkerNoticeId;
  await client.query(`SET LOCAL lock_timeout = '${FIELD_WORKER_NOTICE_EMAIL_LOCK_TIMEOUT}'`);
  await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [`field-worker-notice-email:${noticeId}`]);
  // The notice — by id AND Pariwar (I7), ⛔ `FOR UPDATE` (TR3). Only what the re-check and the template need.
  const notice = (
    await client.query<{ recipient_user_id: string; kind: FieldWorkerNoticeKind; from_district: string; to_district: string }>(
      `SELECT recipient_user_id, kind, from_district, to_district FROM field_worker_notices WHERE pariwar_id = $1 AND notice_id = $2`,
      [pariwarId, noticeId],
    )
  ).rows[0];
  if (!notice) throw new Error(`[field-worker-notice-email] notice ${noticeId} is missing under Pariwar ${pariwarId}`);

  const existing = (
    await client.query<NoticeEmailRow>(
      `SELECT outcome, detail, claimed_at, claimed_by_job FROM field_worker_notice_emails WHERE pariwar_id = $1 AND notice_id = $2`,
      [pariwarId, noticeId],
    )
  ).rows[0];
  if (existing && existing.outcome !== 'attempting') return { kind: 'already_final' };
  if (existing) {
    const ownRetry = existing.claimed_by_job === jobId;
    const parked = existing.claimed_by_job === FIELD_WORKER_NOTICE_EMAIL_PARKED_BY;
    const leaseExpired = existing.claimed_at !== null && toDate(existing.claimed_at).getTime() < now.getTime() - FIELD_WORKER_NOTICE_EMAIL_LEASE_MS;
    if (!ownRetry && !parked && !leaseExpired) return { kind: 'held_by_other' };
  }

  // ⭐ Q4 — the ONE re-check (AD5). ⛔ `seen_at`, ⛔ the request's state (the Q-2 rule).
  const [check] = await run<{ eligible: boolean }>(
    client,
    sql`SELECT ${fieldWorkerNoticeEmailEligibleSql(
      sql`${notice.recipient_user_id}::uuid`,
      sql`${pariwarId}::uuid`,
      sql`${notice.from_district}`,
      sql`${notice.to_district}`,
    )} AS eligible`,
  );
  if (!check?.eligible) {
    if (!existing) {
      const skipped = await client.query(
        `INSERT INTO field_worker_notice_emails (notice_id, pariwar_id, outcome, detail)
         VALUES ($1, $2, 'skipped', $3)
         ON CONFLICT (notice_id) DO NOTHING`,
        [noticeId, pariwarId, fieldWorkerNoticeEmailDetail({ kind: 'not_eligible' })],
      );
      return (skipped.rowCount ?? 0) === 0 ? { kind: 'held_by_other' } : { kind: 'skipped' };
    }
    const detail = fieldWorkerNoticeEmailDetail({ kind: 'recheck_not_eligible' });
    const expired = await client.query(
      `UPDATE field_worker_notice_emails
          SET outcome = 'error', may_have_sent = true, first_detail = COALESCE(first_detail, detail), detail = $3,
              claimed_by_job = $4, claimed_at = $5, parked_at = NULL, updated_at = clock_timestamp()
        WHERE pariwar_id = $1 AND notice_id = $2 AND outcome = 'attempting'`,
      [pariwarId, noticeId, detail, jobId, now],
    );
    if ((expired.rowCount ?? 0) === 0) return { kind: 'already_final' };
    return { kind: 'expired', detail };
  }

  let claimed: { attempt_count: number; may_have_sent: boolean } | undefined;
  if (existing) {
    claimed = (
      await client.query<{ attempt_count: number; may_have_sent: boolean }>(
        `UPDATE field_worker_notice_emails
            SET claimed_at = $3, claimed_by_job = $4, attempt_count = attempt_count + 1,
                -- 6.25 / decision -301: a PARKED row is credited ONLY the time it sat parked; never backward (the trigger).
                aging_since = CASE WHEN claimed_by_job = $5
                                   THEN aging_since + GREATEST($3::timestamptz - parked_at, interval '0')
                                   ELSE aging_since END,
                parked_at = NULL,
                may_have_sent = may_have_sent OR detail IS NULL,
                first_detail = COALESCE(first_detail, detail), detail = NULL, updated_at = clock_timestamp()
          WHERE pariwar_id = $1 AND notice_id = $2 AND outcome = 'attempting'
            AND (claimed_by_job = $4 OR claimed_by_job = $5 OR claimed_at < $6)
          RETURNING attempt_count, may_have_sent`,
        [pariwarId, noticeId, now, jobId, FIELD_WORKER_NOTICE_EMAIL_PARKED_BY, new Date(now.getTime() - FIELD_WORKER_NOTICE_EMAIL_LEASE_MS)],
      )
    ).rows[0];
    if (!claimed) {
      const current = (
        await client.query<{ outcome: string }>(`SELECT outcome FROM field_worker_notice_emails WHERE pariwar_id = $1 AND notice_id = $2`, [pariwarId, noticeId])
      ).rows[0];
      return current?.outcome === 'attempting' ? { kind: 'held_by_other' } : { kind: 'already_final' };
    }
  } else {
    claimed = (
      await client.query<{ attempt_count: number; may_have_sent: boolean }>(
        `INSERT INTO field_worker_notice_emails (notice_id, pariwar_id, outcome, claimed_at, claimed_by_job)
         VALUES ($1, $2, 'attempting', $3, $4)
         ON CONFLICT (notice_id) DO NOTHING
         RETURNING attempt_count, may_have_sent`,
        [noticeId, pariwarId, now, jobId],
      )
    ).rows[0];
    if (!claimed) return { kind: 'held_by_other' };
  }
  return {
    kind: 'begun',
    noticeId,
    recipientUserId: notice.recipient_user_id as UserId,
    noticeKind: notice.kind,
    attemptCount: claimed.attempt_count,
    previousDetail: existing?.detail ?? null,
    mayHaveSent: claimed.may_have_sent,
  };
}

// ── The compare-and-set and the transient note ────────────────────────────────────────────────────────────────────────────────

/** ⭐ `attempting` → final, only by the job holding the row. `null` ⇒ the row moved on (the caller alarms). */
export async function finaliseFieldWorkerNoticeEmail(
  db: Db,
  input: {
    readonly pariwarId: PariwarId;
    readonly noticeId: string;
    readonly jobId: string;
    readonly outcome: 'accepted' | 'rejected' | 'error';
    readonly providerMessageId?: string | null;
    readonly detail?: string | null;
  },
): Promise<{ readonly mayHaveSent: boolean } | null> {
  assertDetail(input.detail ?? null);
  const result = await db.execute<{ may_have_sent: boolean }>(sql`
    UPDATE field_worker_notice_emails
       SET outcome = ${input.outcome},
           provider_message_id = ${input.providerMessageId ?? null},
           detail = ${input.detail ?? null},
           updated_at = clock_timestamp()
     WHERE pariwar_id = ${input.pariwarId}
       AND notice_id = ${input.noticeId}::uuid
       AND outcome = 'attempting'
       AND claimed_by_job = ${input.jobId}
    RETURNING may_have_sent
  `);
  const row = result.rows?.[0];
  return row ? { mayHaveSent: row.may_have_sent } : null;
}

/** A TRANSIENT failure (incl. the HELD class): keep `attempting`, record the detail, refresh the lease. Returns the row count. */
export async function noteFieldWorkerNoticeEmailTransient(
  db: Db,
  input: {
    readonly pariwarId: PariwarId;
    readonly noticeId: string;
    readonly jobId: string;
    readonly detail: string;
    readonly mayHaveSent: boolean;
    readonly now: Date;
  },
): Promise<number> {
  assertDetail(input.detail);
  const result = await db.execute<{ notice_id: string }>(sql`
    UPDATE field_worker_notice_emails
       SET detail = ${input.detail},
           may_have_sent = may_have_sent OR ${input.mayHaveSent},
           claimed_at = ${input.now},
           updated_at = clock_timestamp()
     WHERE pariwar_id = ${input.pariwarId}
       AND notice_id = ${input.noticeId}::uuid
       AND outcome = 'attempting'
       AND claimed_by_job = ${input.jobId}
     RETURNING notice_id
  `);
  return result.rows?.length ?? 0;
}
