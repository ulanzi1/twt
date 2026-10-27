// The APPROVER EMAIL of a memorial take-down — the domain half (Story 11b.4a, Task 8.1; `2026-10-27-412` MP10 (b) / MP11;
// ADR-0043; the Panel's `-392` item 5 and `-411` item 5). Transport-free; ⛔ nothing here decrypts (the jobs child does, AFTER the
// claiming commit). ⭐ A MIRROR of Story 6.25's `../claim/suspicion-staff-email.ts` — the same lease, park, give-up, compare-and-set
// and transient note — keyed on the take-down REQUEST instead of the claim.
//
// `-392` item 5 (Trustee-ratified, kept by `-395`): the approver is emailed when a memorial is taken down. MP10 (b): every DISTINCT
// approver (`actor_id` of an `approved` / `approved_with_omissions` decision) of every version the take-down withdrew
// (`memorial_withdrawals.takedown_request_id`) — usually one person; each is told only of an approval they made. `-411` item 5
// (PC3 A): an approver who has left is ⛔ not emailed and ⛔ no one else is told in their place.
//
// ⭐ THE TRIGGER is a request whose outcome is `taken_down` — ⛔ no row is written by the take-down itself. ⭐ THE RECIPIENTS are the
// approvers passing Q3 (`memorialApproverEligibleSql`) — the SAME fragment in the selector and the re-check. ⭐ THE GATE IS PER
// (request, recipient): an eligible approver is due while THEIR pair holds ⛔ no row and the request holds ⛔ no `no_target` row, so
// a sweep that stops between two approvers of one request (the pair bound, the budget, a failed enqueue, a crash, a page boundary)
// loses ⛔ neither. When ⛔ none passes, the `(request, NULL)` pair writes ONE request-level `no_target` row (MP11 — 0187's
// `…_no_target_recipient_check`, copied unchanged), and only a request holding ⛔ no row at all gets one. ⭐ A request holding the
// `no_target` row is ⛔ never due again (so ⛔ no late email beside it) and a pair holding a row is ⛔ never due twice; only an
// `attempting` row is re-derived. ⚠ Review R2 (2026-10-27): this read "a request holding ANY outbox row is never due again" —
// written when ONE approver was emailed — and lost every sibling approver the sweep had not yet reached.
// ⭐ THE DEDUP IS THE TABLE + A REQUEST-KEYED LOCK. ⚠ ⛔ Not a row lock: `twt_app` holds ⛔ no UPDATE grant on
// `memorial_takedown_requests` (append-only, 0187), and `FOR UPDATE` needs one ⇒ the claiming transaction takes
// `pg_advisory_xact_lock(hashtext('memorial-takedown-email:' || request_id))` — ⛔ not the memorial POOL lock (the email need not wait
// on a family's Send). ⭐ ONE re-check rule (`-297` §2's): a FRESH pair whose re-check fails writes ⛔ no row (`not_due`); an existing
// `attempting` row whose re-check fails becomes `error` / `exhausted:recheck_<reason>`.
// ⛔ NOTHING here writes a memorial, a withdrawal, an outcome or an identity table.
// ⚠ ⛔ Never a Drizzle correlated subquery — raw SQL with explicit `mt_` aliases ([[project_epic6_drizzle_correlated_subquery_bug]]).

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
import type { PariwarId, UserId } from '../ids/index.js';
import { clampLimit } from '../pagination.js';
import { MEMORIAL_TAKEDOWN_APPROVER_EMAIL_DETAIL_PATTERN } from '../schema/memorial_takedown_approver_emails.js';
import { memorialApproverEligibleSql } from './takedown-approver-email-read.js';

/** The sweep's page size cap. */
export const MEMORIAL_TAKEDOWN_APPROVER_EMAIL_PAGE_CAP = 1000;
/** A row still `attempting` this many IST calendar days after it was created (and past the lease) is given up — 6.25's value. */
export const MEMORIAL_TAKEDOWN_APPROVER_EMAIL_RECLAIM_DAYS = SUSPICION_STAFF_EMAIL_RECLAIM_DAYS;
/** The claiming transaction's wait on the request lock (`SET LOCAL`). */
export const MEMORIAL_TAKEDOWN_APPROVER_EMAIL_LOCK_TIMEOUT = '30s';
/** THE LEASE — 6.25's (30 min). */
export const MEMORIAL_TAKEDOWN_APPROVER_EMAIL_LEASE_MS = STAFF_EMAIL_SEND_LEASE_MS;
/** THE PARKED MARKER — 6.25's value; ⚠ LOCKSTEP with 0187's `…_parked_check` and the trigger (both hard-code `sweep:held`). */
export const MEMORIAL_TAKEDOWN_APPROVER_EMAIL_PARKED_BY = SUSPICION_STAFF_EMAIL_PARKED_BY;

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

/** Why a locked re-check failed. ⚠ LOCKSTEP with 0187's grammar — the grammar leg iterates THIS array. */
export const MEMORIAL_TAKEDOWN_APPROVER_EMAIL_RECHECK_REASONS = ['not_taken_down', 'recipient_not_eligible', 'recipients_exist', 'request_has_rows'] as const;
export type MemorialTakedownApproverEmailRecheckReason = (typeof MEMORIAL_TAKEDOWN_APPROVER_EMAIL_RECHECK_REASONS)[number];
/** Why ⛔ no address could be used after `begun`. ⚠ LOCKSTEP with 0187's grammar. */
export const MEMORIAL_TAKEDOWN_APPROVER_EMAIL_ERROR_REASONS = ['no_address', 'invalid_address'] as const;
export type MemorialTakedownApproverEmailErrorReason = (typeof MEMORIAL_TAKEDOWN_APPROVER_EMAIL_ERROR_REASONS)[number];

export type MemorialTakedownApproverEmailDetailInput =
  | { readonly kind: 'no_approver' }
  | { readonly kind: 'transient'; readonly name: string }
  | { readonly kind: 'held'; readonly name: string }
  | { readonly kind: 'pre_call'; readonly step: 'read_failed' | 'decrypt_failed' | 'render_failed' }
  | { readonly kind: 'rejected'; readonly http: number; readonly name: string }
  | { readonly kind: 'error'; readonly reason: MemorialTakedownApproverEmailErrorReason }
  | { readonly kind: 'exhausted_three_days' }
  | { readonly kind: 'recheck'; readonly reason: MemorialTakedownApproverEmailRecheckReason };

/** ⭐ THE ONLY way a `detail` / `first_detail` is built (0187 CHECKs ≤ 200 chars and the grammar). */
export function memorialTakedownApproverEmailDetail(d: MemorialTakedownApproverEmailDetailInput): string {
  switch (d.kind) {
    case 'no_approver':
      return 'no_approver';
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
    case 'recheck':
      return `exhausted:recheck_${d.reason}`;
  }
}

const DETAIL_PATTERN = new RegExp(MEMORIAL_TAKEDOWN_APPROVER_EMAIL_DETAIL_PATTERN);

/** Does `detail` match the vocabulary's grammar (0187's CHECK — the SAME pattern)? */
export function isMemorialTakedownApproverEmailDetail(detail: string): boolean {
  return DETAIL_PATTERN.test(detail);
}

function assertDetail(detail: string | null): void {
  if (detail !== null && !isMemorialTakedownApproverEmailDetail(detail)) {
    throw new Error('[memorial-takedown-approver-email] a detail outside the fixed vocabulary — build it with memorialTakedownApproverEmailDetail');
  }
}

/** The approvers of request (`pariwarId`, `requestId`) — raw SQL expressions. `SELECT DISTINCT actor_id` (⛔ not an identity read). */
function approversSql(pariwarId: SQL, requestId: SQL): SQL {
  return sql`(
    SELECT DISTINCT mt_d.actor_id
      FROM memorial_withdrawals mt_w
      JOIN memorial_review_decisions mt_d ON mt_d.pariwar_id = mt_w.pariwar_id AND mt_d.submission_id = mt_w.submission_id
     WHERE mt_w.pariwar_id = ${pariwarId}
       AND mt_w.takedown_request_id = ${requestId}
       AND mt_d.action IN ('approved', 'approved_with_omissions')
  )`;
}

// ── The selector — cross-tenant, BYPASSRLS pool, keyset-paged on (request, recipient NULLS FIRST), clamped ───────────────────

/** One due (request, recipient) pair; `recipientUserId` NULL = the request-level `no_target` pair (MP11). */
export interface DueMemorialTakedownApproverEmail {
  readonly pariwarId: PariwarId;
  readonly requestId: string;
  readonly recipientUserId: UserId | null;
  /** A crash left an `attempting` row for this pair — the predicate was bypassed so its locked re-check finishes it. */
  readonly hasAttemptingRow: boolean;
}

export interface MemorialTakedownApproverEmailCursor {
  readonly requestId: string;
  readonly recipientUserId: string | null;
}

export interface DueMemorialTakedownApproverEmailPage {
  readonly due: readonly DueMemorialTakedownApproverEmail[];
  readonly last: MemorialTakedownApproverEmailCursor | null;
  readonly scanned: number;
}

/**
 * ⭐ The due (request, recipient) pairs, one keyset page. Three disjoint branches (so each pair appears ONCE across the pages):
 *   (1) every ELIGIBLE approver of a `taken_down` request whose OWN pair holds ⛔ no row, while the request holds ⛔ no `no_target` row;
 *   (2) the `(request, NULL)` pair when a `taken_down` request holds ⛔ no row at all and has ⛔ no eligible approver (MP11);
 *   (3) every pair with an `attempting` row — the predicate BYPASSED, so its locked re-check finishes it.
 *
 * ── DELIBERATE: a CROSS-TENANT READ on the BYPASSRLS pool (family 9) ──
 * The sweep has ⛔ no tenant to start from. It RETURNS ids only (`pariwar_id`, `request_id`, `recipient_user_id`, a boolean); it
 * READS identity data through Q3 only (ADR-0043 — ⛔ no identity column projected beyond the `user_id` it already holds). ⛔ No PII
 * and ⛔ no value from one tenant reaches another; every write that follows runs in the child's own `withPariwarScope`
 * transaction, under RLS, after a locked re-check. RE-EXAMINE when: the result carries more than ids / flags, the read projects
 * PII, a write is added on this pool, the pool loses BYPASSRLS, or a per-tenant scheduler exists.
 */
export async function selectDueMemorialTakedownApproverEmails(
  q: Queryable,
  input: { readonly after: MemorialTakedownApproverEmailCursor | null; readonly limit: number; readonly allow: readonly string[] | null },
): Promise<DueMemorialTakedownApproverEmailPage> {
  const size = clampLimit(input.limit, { default: MEMORIAL_TAKEDOWN_APPROVER_EMAIL_PAGE_CAP, cap: MEMORIAL_TAKEDOWN_APPROVER_EMAIL_PAGE_CAP });
  // ⚠ `sql.param` — a bare array in a Drizzle template is EXPANDED into one parameter per element.
  const allowR = input.allow === null ? sql`` : sql` AND mt_r.pariwar_id = ANY(${sql.param([...input.allow])}::uuid[])`;
  const allowA = input.allow === null ? sql`` : sql` AND mt_a.pariwar_id = ANY(${sql.param([...input.allow])}::uuid[])`;
  const approvers = approversSql(sql`mt_r.pariwar_id`, sql`mt_r.request_id`);
  const eligible = memorialApproverEligibleSql(sql`mt_ap.actor_id`);
  const after =
    input.after === null
      ? sql``
      : input.after.recipientUserId === null
        ? sql` WHERE (mt_due.request_id > ${input.after.requestId}::uuid
                 OR (mt_due.request_id = ${input.after.requestId}::uuid AND mt_due.recipient_user_id IS NOT NULL))`
        : sql` WHERE (mt_due.request_id > ${input.after.requestId}::uuid
                 OR (mt_due.request_id = ${input.after.requestId}::uuid
                     AND mt_due.recipient_user_id > ${input.after.recipientUserId}::uuid))`;
  const takenDown = sql`
    EXISTS (SELECT 1 FROM memorial_takedown_outcomes mt_o
             WHERE mt_o.pariwar_id = mt_r.pariwar_id AND mt_o.request_id = mt_r.request_id AND mt_o.outcome = 'taken_down')`;
  // (1) PER PAIR — ⛔ no row for THIS (request, approver) and ⛔ no request-level `no_target` row (MP11: ⛔ no late email beside it).
  const pairDue = sql`
    ${takenDown}
    AND NOT EXISTS (SELECT 1 FROM memorial_takedown_approver_emails mt_pair
                     WHERE mt_pair.pariwar_id = mt_r.pariwar_id AND mt_pair.request_id = mt_r.request_id
                       AND (mt_pair.recipient_user_id = mt_ap.actor_id OR mt_pair.outcome = 'no_target'))`;
  // (2) PER REQUEST — the `(request, NULL)` pair is due only while the request holds ⛔ no row at all.
  const noTargetDue = sql`
    ${takenDown}
    AND NOT EXISTS (SELECT 1 FROM memorial_takedown_approver_emails mt_any
                     WHERE mt_any.pariwar_id = mt_r.pariwar_id AND mt_any.request_id = mt_r.request_id)`;
  const rows = await run<{ pariwar_id: string; request_id: string; recipient_user_id: string | null; has_attempting: boolean }>(
    q,
    sql`
      SELECT mt_due.pariwar_id, mt_due.request_id, mt_due.recipient_user_id, mt_due.has_attempting
        FROM (
          SELECT mt_r.pariwar_id, mt_r.request_id, mt_ap.actor_id AS recipient_user_id, false AS has_attempting
            FROM memorial_takedown_requests mt_r
            CROSS JOIN LATERAL ${approvers} mt_ap
           WHERE ${pairDue}${allowR}
             AND ${eligible}
          UNION ALL
          SELECT mt_r.pariwar_id, mt_r.request_id, NULL::uuid AS recipient_user_id, false AS has_attempting
            FROM memorial_takedown_requests mt_r
           WHERE ${noTargetDue}${allowR}
             AND NOT EXISTS (SELECT 1 FROM ${approvers} mt_ap WHERE ${eligible})
          UNION ALL
          SELECT mt_a.pariwar_id, mt_a.request_id, mt_a.recipient_user_id, true AS has_attempting
            FROM memorial_takedown_approver_emails mt_a
           WHERE mt_a.outcome = 'attempting'${allowA}
        ) mt_due${after}
       ORDER BY mt_due.request_id ASC, mt_due.recipient_user_id ASC NULLS FIRST
       LIMIT ${sql.raw(String(size))}
    `,
  );
  const due = rows.map((r) => ({
    pariwarId: r.pariwar_id as PariwarId,
    requestId: r.request_id,
    recipientUserId: (r.recipient_user_id ?? null) as UserId | null,
    hasAttemptingRow: r.has_attempting,
  }));
  const last = rows.at(-1);
  return {
    due,
    last: last ? { requestId: last.request_id, recipientUserId: last.recipient_user_id ?? null } : null,
    scanned: rows.length,
  };
}

// ── The give-up and the hold park — 6.25's, on this table ─────────────────────────────────────────────────────────────────────

/** Rows whose `aging_since` is before this instant and still `attempting` are given up: 00:00 IST of (today − 2). */
export function memorialTakedownApproverEmailReclaimCutoff(now: Date): Date {
  return suspicionStaffEmailReclaimCutoff(now);
}

/**
 * THE EXHAUSTED-ROW FINALISER (6.25's `expireExhaustedSuspicionStaffEmails`, on this table): every `attempting` row whose
 * `aging_since` is before `cutoff`, claimed before the lease and ⛔ not parked ⇒ `error` / `exhausted:attempting_three_days`. Run
 * ONLY on an un-held run. Returns the pairs, for the caller's ONE alarm.
 *
 * ── DELIBERATE: a CROSS-TENANT WRITE on the BYPASSRLS pool (family 9) ──
 * A time bound over EVERY tenant's rows; its predicate and its effect read and write ⛔ nothing tenant-derived — ⛔ no PII, ⛔ no
 * cross-row join; `allow` (tests) narrows it. RE-EXAMINE when: it writes a value derived from another row or tenant, the pool
 * loses BYPASSRLS, a per-tenant scheduler exists, or the lease approaches the reclaim horizon.
 */
export async function expireExhaustedMemorialTakedownApproverEmails(
  q: Queryable,
  input: { readonly cutoff: Date; readonly now: Date; readonly allow: readonly string[] | null },
): Promise<{ readonly requestId: string; readonly recipientUserId: UserId | null }[]> {
  const { rows } = await q.query<{ request_id: string; recipient_user_id: string | null }>(
    `UPDATE memorial_takedown_approver_emails
        SET outcome = 'error',
            may_have_sent = true,
            first_detail = COALESCE(first_detail, detail),
            detail = $4,
            updated_at = clock_timestamp()
      WHERE outcome = 'attempting' AND aging_since < $1 AND claimed_at < $3 AND claimed_by_job <> $5
        AND ($2::uuid[] IS NULL OR pariwar_id = ANY($2::uuid[]))
      RETURNING request_id, recipient_user_id`,
    [
      input.cutoff,
      input.allow === null ? null : [...input.allow],
      new Date(input.now.getTime() - MEMORIAL_TAKEDOWN_APPROVER_EMAIL_LEASE_MS),
      memorialTakedownApproverEmailDetail({ kind: 'exhausted_three_days' }),
      MEMORIAL_TAKEDOWN_APPROVER_EMAIL_PARKED_BY,
    ],
  );
  return rows.map((r) => ({ requestId: r.request_id, recipientUserId: (r.recipient_user_id ?? null) as UserId | null }));
}

/**
 * THE HOLD PARK (6.25's `parkHeldSuspicionStaffEmails`, on this table): on a HELD run, every `attempting` row past the lease is
 * marked parked, so the give-up cannot burn it while ⛔ no retry runs; the next child re-claims it. Returns how many it parked.
 *
 * ── DELIBERATE: a CROSS-TENANT WRITE on the BYPASSRLS pool (family 9) ── the give-up's twin; same bounds, same RE-EXAMINE list.
 */
export async function parkHeldMemorialTakedownApproverEmails(
  q: Queryable,
  input: { readonly now: Date; readonly allow: readonly string[] | null },
): Promise<number> {
  const { rowCount } = await q.query(
    `UPDATE memorial_takedown_approver_emails
        SET claimed_by_job = $3, parked_at = $4, updated_at = clock_timestamp()
      WHERE outcome = 'attempting' AND claimed_at < $1 AND claimed_by_job <> $3
        AND ($2::uuid[] IS NULL OR pariwar_id = ANY($2::uuid[]))`,
    [
      new Date(input.now.getTime() - MEMORIAL_TAKEDOWN_APPROVER_EMAIL_LEASE_MS),
      input.allow === null ? null : [...input.allow],
      MEMORIAL_TAKEDOWN_APPROVER_EMAIL_PARKED_BY,
      input.now,
    ],
  );
  return rowCount ?? 0;
}

// ── The claiming transaction ──────────────────────────────────────────────────────────────────────────────────────────────────

export type BeginMemorialTakedownApproverEmailResult =
  | {
      readonly kind: 'begun';
      readonly noticeId: string;
      readonly recipientUserId: UserId;
      readonly attemptCount: number;
      /** The row's `detail` BEFORE this claim cleared it — the held-fault alarm's "is this fault new?". */
      readonly previousDetail: string | null;
      readonly mayHaveSent: boolean;
    }
  | { readonly kind: 'already_final' }
  | { readonly kind: 'held_by_other' }
  /** A FRESH pair whose locked re-check failed — ⛔ no row written. */
  | { readonly kind: 'not_due'; readonly reason: MemorialTakedownApproverEmailRecheckReason }
  /** An existing `attempting` row finished `error` by a failed re-check — the caller ALWAYS alarms "may have sent". */
  | { readonly kind: 'expired'; readonly detail: string }
  /** MP11 — the request-level `no_target` row was written NOW — the caller logs once. */
  | { readonly kind: 'no_target' };

interface ApproverEmailRow {
  notice_id: string;
  outcome: string;
  detail: string | null;
  claimed_at: Date | string | null;
  claimed_by_job: string | null;
}

/** ⭐ The ONE re-check (on the locked transaction's client). `null` = it holds. */
async function recheck(
  client: pg.PoolClient,
  pariwarId: PariwarId,
  requestId: string,
  recipientUserId: UserId | null,
): Promise<MemorialTakedownApproverEmailRecheckReason | null> {
  const [outcome] = await run<{ taken_down: boolean }>(
    client,
    sql`SELECT EXISTS (SELECT 1 FROM memorial_takedown_outcomes mt_o
                        WHERE mt_o.pariwar_id = ${pariwarId}::uuid AND mt_o.request_id = ${requestId}::uuid
                          AND mt_o.outcome = 'taken_down') AS taken_down`,
  );
  if (!outcome?.taken_down) return 'not_taken_down';
  const approvers = approversSql(sql`${pariwarId}::uuid`, sql`${requestId}::uuid`);
  if (recipientUserId !== null) {
    // The selector's per-pair gate again, under the lock: ⛔ a late email beside the request's `no_target` row (MP11).
    const [row] = await run<{ eligible: boolean; no_target: boolean }>(
      client,
      sql`SELECT EXISTS (SELECT 1 FROM ${approvers} mt_ap
                          WHERE mt_ap.actor_id = ${recipientUserId}::uuid AND ${memorialApproverEligibleSql(sql`mt_ap.actor_id`)}) AS eligible,
                 EXISTS (SELECT 1 FROM memorial_takedown_approver_emails mt_nt
                          WHERE mt_nt.pariwar_id = ${pariwarId}::uuid AND mt_nt.request_id = ${requestId}::uuid
                            AND mt_nt.outcome = 'no_target') AS no_target`,
    );
    if (!row?.eligible) return 'recipient_not_eligible';
    return row.no_target ? 'request_has_rows' : null;
  }
  const [row] = await run<{ anyone: boolean; any_row: boolean }>(
    client,
    sql`SELECT EXISTS (SELECT 1 FROM ${approvers} mt_ap WHERE ${memorialApproverEligibleSql(sql`mt_ap.actor_id`)}) AS anyone,
               EXISTS (SELECT 1 FROM memorial_takedown_approver_emails mt_any
                        WHERE mt_any.pariwar_id = ${pariwarId}::uuid AND mt_any.request_id = ${requestId}::uuid) AS any_row`,
  );
  if (row?.anyone) return 'recipients_exist';
  if (row?.any_row) return 'request_has_rows';
  return null;
}

/**
 * ⭐ THE CLAIMING TRANSACTION — on the ONE client of the caller's scope transaction: take the request lock, re-check under it, and
 * claim (or finish) the pair's row. ⛔ No KMS, ⛔ no decrypt, ⛔ no address here — the caller COMMITS, then reads Q2, decrypts and
 * sends. ⛔ Never catch a DB error inside this transaction.
 * @throws Error the request is missing under this Pariwar — a data fault (requests are ⛔ never deleted), ⛔ not a `not_due`.
 */
export async function beginMemorialTakedownApproverEmail(
  client: pg.PoolClient,
  input: {
    readonly pariwarId: PariwarId;
    readonly requestId: string;
    readonly recipientUserId: UserId | null;
    readonly jobId: string;
    readonly now: Date;
  },
): Promise<BeginMemorialTakedownApproverEmailResult> {
  const { pariwarId, jobId, now } = input;
  const requestId = String(input.requestId).toLowerCase();
  const recipientUserId = input.recipientUserId === null ? null : (String(input.recipientUserId).toLowerCase() as UserId);
  await client.query(`SET LOCAL lock_timeout = '${MEMORIAL_TAKEDOWN_APPROVER_EMAIL_LOCK_TIMEOUT}'`);
  await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [`memorial-takedown-email:${requestId}`]);
  const found = await client.query(`SELECT 1 FROM memorial_takedown_requests WHERE pariwar_id = $1 AND request_id = $2`, [pariwarId, requestId]);
  if (found.rows.length === 0) throw new Error(`[memorial-takedown-approver-email] request ${requestId} is missing under Pariwar ${pariwarId}`);

  const existing = (
    await client.query<ApproverEmailRow>(
      `SELECT notice_id, outcome, detail, claimed_at, claimed_by_job FROM memorial_takedown_approver_emails
        WHERE pariwar_id = $1 AND request_id = $2 AND recipient_user_id IS NOT DISTINCT FROM $3::uuid`,
      [pariwarId, requestId, recipientUserId],
    )
  ).rows[0];
  if (existing && existing.outcome !== 'attempting') return { kind: 'already_final' };
  if (existing) {
    const ownRetry = existing.claimed_by_job === jobId;
    const parked = existing.claimed_by_job === MEMORIAL_TAKEDOWN_APPROVER_EMAIL_PARKED_BY;
    const leaseExpired =
      existing.claimed_at !== null && toDate(existing.claimed_at).getTime() < now.getTime() - MEMORIAL_TAKEDOWN_APPROVER_EMAIL_LEASE_MS;
    if (!ownRetry && !parked && !leaseExpired) return { kind: 'held_by_other' };
  }

  const failed = await recheck(client, pariwarId, requestId, recipientUserId);
  if (failed !== null) {
    if (!existing) return { kind: 'not_due', reason: failed };
    const detail = memorialTakedownApproverEmailDetail({ kind: 'recheck', reason: failed });
    const expired = await client.query(
      `UPDATE memorial_takedown_approver_emails
          SET outcome = 'error', may_have_sent = true, first_detail = COALESCE(first_detail, detail), detail = $2,
              claimed_by_job = $3, claimed_at = $4, updated_at = clock_timestamp()
        WHERE notice_id = $1 AND outcome = 'attempting'`,
      [existing.notice_id, detail, jobId, now],
    );
    if ((expired.rowCount ?? 0) === 0) return { kind: 'already_final' };
    return { kind: 'expired', detail };
  }

  if (recipientUserId === null) {
    // MP11 — a FRESH final row (⛔ never via `attempting`: 0187's CHECK forbids a NULL-recipient `attempting` row).
    const inserted = await client.query(
      `INSERT INTO memorial_takedown_approver_emails (pariwar_id, request_id, recipient_user_id, outcome, detail)
       VALUES ($1, $2, NULL, 'no_target', $3)
       ON CONFLICT ON CONSTRAINT memorial_takedown_approver_emails_request_recipient_uq DO NOTHING`,
      [pariwarId, requestId, memorialTakedownApproverEmailDetail({ kind: 'no_approver' })],
    );
    return (inserted.rowCount ?? 0) === 0 ? { kind: 'already_final' } : { kind: 'no_target' };
  }

  let claimed: { notice_id: string; attempt_count: number; may_have_sent: boolean } | undefined;
  if (existing) {
    claimed = (
      await client.query<{ notice_id: string; attempt_count: number; may_have_sent: boolean }>(
        `UPDATE memorial_takedown_approver_emails
            SET claimed_at = $2, claimed_by_job = $3, attempt_count = attempt_count + 1,
                -- 6.25 / decision -301: a PARKED row is credited ONLY the time it sat parked; never backward (the trigger).
                aging_since = CASE WHEN claimed_by_job = $4
                                   THEN aging_since + GREATEST($2::timestamptz - parked_at, interval '0')
                                   ELSE aging_since END,
                parked_at = NULL,
                may_have_sent = may_have_sent OR detail IS NULL,
                first_detail = COALESCE(first_detail, detail), detail = NULL, updated_at = clock_timestamp()
          WHERE notice_id = $1 AND outcome = 'attempting'
            AND (claimed_by_job = $3 OR claimed_by_job = $4 OR claimed_at < $5)
          RETURNING notice_id, attempt_count, may_have_sent`,
        [existing.notice_id, now, jobId, MEMORIAL_TAKEDOWN_APPROVER_EMAIL_PARKED_BY, new Date(now.getTime() - MEMORIAL_TAKEDOWN_APPROVER_EMAIL_LEASE_MS)],
      )
    ).rows[0];
    if (!claimed) {
      const current = (
        await client.query<{ outcome: string }>(`SELECT outcome FROM memorial_takedown_approver_emails WHERE notice_id = $1`, [existing.notice_id])
      ).rows[0];
      return current?.outcome === 'attempting' ? { kind: 'held_by_other' } : { kind: 'already_final' };
    }
  } else {
    claimed = (
      await client.query<{ notice_id: string; attempt_count: number; may_have_sent: boolean }>(
        `INSERT INTO memorial_takedown_approver_emails (pariwar_id, request_id, recipient_user_id, outcome, claimed_at, claimed_by_job)
         VALUES ($1, $2, $3, 'attempting', $4, $5)
         ON CONFLICT ON CONSTRAINT memorial_takedown_approver_emails_request_recipient_uq DO NOTHING
         RETURNING notice_id, attempt_count, may_have_sent`,
        [pariwarId, requestId, recipientUserId, now, jobId],
      )
    ).rows[0];
  }
  if (!claimed) return { kind: 'already_final' };
  return {
    kind: 'begun',
    noticeId: claimed.notice_id,
    recipientUserId,
    attemptCount: claimed.attempt_count,
    previousDetail: existing?.detail ?? null,
    mayHaveSent: claimed.may_have_sent,
  };
}

// ── The compare-and-set and the transient note ────────────────────────────────────────────────────────────────────────────────

/** ⭐ `attempting` → final, only by the job holding the row. `null` ⇒ the row moved on (the caller alarms). */
export async function finaliseMemorialTakedownApproverEmail(
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
    UPDATE memorial_takedown_approver_emails
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
export async function noteMemorialTakedownApproverEmailTransient(
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
    UPDATE memorial_takedown_approver_emails
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

