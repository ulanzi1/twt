// The STAFF EMAIL of a `-239` suspicion refusal — the domain half (Story 6.25, Task 3; AC1, AC2, AC4, AC5; `2026-10-09-299`
// RE1–RE5, RE5-bis, RE11). Transport-free; ⛔ nothing here decrypts (the jobs child does, AFTER the claiming commit).
//
// `-262` FQ3 A (Trustee-ratified): every Pariwar Admin of the claim's Pariwar is emailed *"a claim was refused on suspicion of a
// nominee change — open the list"* — ⛔ no names, ⛔ no note. ONE row per (claim, recipient), EVER (0152's UNIQUE NULLS NOT
// DISTINCT); ONE claim-level `no_target` row when ⛔ admin is eligible (RE4).
//
// ⭐ THE TRIGGER (RE1) is a refusal that STANDS (6.24a RF1's ONE fragment) when the sweep runs, re-checked under the claim-row
// lock — ⛔ never the `claim.verifier_denied` event. ⭐ THE RECIPIENTS (RE3) are Q1 (`staffEmailRecipientsSql`) — the SAME fragment
// in the selector and the re-check.
// ⭐ THE DEDUP IS THE TABLE + THE CLAIM-ROW LOCK (a pg-boss `singletonKey` is a label only). `beginSuspicionStaffEmail` locks the
// claim row, RE-CHECKS under it and claims (or finishes) the row — ONE transaction; the decrypt and the send happen after that
// commit. ⭐ ONE re-check rule (`-297` §2's): a FRESH pair whose re-check fails writes ⛔ row (`not_due`); ANY existing
// `attempting` row whose re-check fails becomes `error` / `exhausted:recheck_<reason>` and the caller alarms that a prior attempt
// MAY have sent; another job's row within the lease ⇒ `held_by_other`.
// ⭐ THE LEASE (RE11) is `STAFF_EMAIL_SEND_LEASE_MS` = 30 min — ⛔ `CORRECTION_SEND_LEASE_MS` (10 min, tuned for a DAILY sweep): at
// a 15-minute cadence it would hand a still-retrying row to the next tick. The own-retry re-claim AND the transient note both
// refresh `claimed_at`, so a live, retrying child keeps its row; a CRASHED child's row goes stale 30 min after its last touch.
// The take-over UPDATE re-checks the lease itself (round 3). ⭐ A HELD sweep PARKS a stale row (`SUSPICION_STAFF_EMAIL_PARKED_BY`)
// instead of letting the give-up age it out while ⛔ retry can run; the first child after the hold re-claims it at once.
// ⭐ `may_have_sent` (RE5, RE5-bis) — set TRUE, never back: by a transient note whose result says so (a timeout, a dropped
// connection, a provider 5xx / 408), and by a re-claim that finds `detail` NULL on an `attempting` row (the previous attempt
// ended with ⛔ note — a crash after its claiming commit). The re-claim then CLEARS `detail` (its value moves to `first_detail`
// once), so the NEXT re-claim can see whether THIS attempt ended with a note. Any finish on such a row is alarmed by the caller.
// ⚠ AT-LEAST-ONCE: "once ever" holds for FINISHED rows; a possible double is RECORDED (`may_have_sent`, `attempt_count`,
// `first_detail`), ⛔ never hidden.
// ⭐ LOCKS: ONLY the claim row (`FOR UPDATE`, `SET LOCAL lock_timeout`) — ⛔ advisory key, ⛔ a second claim's row.
// ⛔ NOTHING here writes a claim decision, event or state, or any identity table (invariant 4, AC9).
//
// ⚠ ⛔ Never a Drizzle correlated subquery — raw SQL with explicit `se_` aliases ([[project_epic6_drizzle_correlated_subquery_bug]]).

import { type SQL, sql } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import type pg from 'pg';

import { addCalendarDays, istDateOf, istMidnightAt } from '../cycle-calendar/holiday-resolver.js';
import { bindScopedDb, type Db } from '../db.js';
import type { ClaimId, PariwarId, UserId } from '../ids/index.js';
import { clampLimit } from '../pagination.js';
import { SUSPICION_STAFF_EMAIL_DETAIL_PATTERN } from '../schema/claim_suspicion_staff_emails.js';
import { staffEmailRecipientsSql } from './staff-email-identity-read.js';
import { isSuspicionRefusalStanding, standingSuspicionRefusalSql } from './suspicion-refusal.js';

/** The sweep's page size cap. */
export const SUSPICION_STAFF_EMAIL_PAGE_CAP = 1000;
/** RE11 — a row still `attempting` this many IST calendar days after it was created (and past the lease) is given up. */
export const SUSPICION_STAFF_EMAIL_RECLAIM_DAYS = 3;
/** The claiming transaction's wait on the claim-row lock (`SET LOCAL`). */
export const SUSPICION_STAFF_EMAIL_LOCK_TIMEOUT = '30s';
/**
 * ⭐ RE11 — THE LEASE: another job's `attempting` row claimed (or noted) within this is `held_by_other`; past it, taken over.
 * Longer than the child's longest single backoff gap (pg-boss 12.19.1: ≤ 960 s at `CHILD_RETRY_DELAY_SECONDS` 60 × 4 retries)
 * plus the send timeout — ⛔ `CORRECTION_SEND_LEASE_MS` (10 min).
 */
export const STAFF_EMAIL_SEND_LEASE_MS = 30 * 60 * 1000;
/**
 * ⭐ THE PARKED MARKER (code review rounds 3–4, `-300` §2 (i)) — `claimed_by_job` of an `attempting` row a HELD sweep parked: it
 * was past the lease, i.e. ⛔ live child holds it (a live child's claim or note keeps its row inside the lease). The held sweep
 * enqueues ⛔ new child for it; the give-up SKIPS it; the next child RE-CLAIMS it (⛔ lease wait — defensive, a parked row is
 * already past the lease barring clock skew) and restarts its `aging_since`. ⛔ A pg-boss job id (a UUID).
 */
export const SUSPICION_STAFF_EMAIL_PARKED_BY = 'sweep:held';

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

// ── The `detail` vocabulary (RE5) — ONE builder; ⛔ free text, ⛔ ever provider message text ─────────────────────────────

/** Why a locked re-check failed (RE11). ⚠ LOCKSTEP with 0153's grammar — the grammar leg iterates THIS array (round 4). */
export const SUSPICION_STAFF_EMAIL_RECHECK_REASONS = ['refusal_not_standing', 'recipient_not_eligible', 'recipients_exist', 'claim_has_rows'] as const;
export type SuspicionStaffEmailRecheckReason = (typeof SUSPICION_STAFF_EMAIL_RECHECK_REASONS)[number];
/** Why ⛔ address could be used after `begun` (RE11). ⚠ LOCKSTEP with 0153's grammar, as above. */
export const SUSPICION_STAFF_EMAIL_ERROR_REASONS = ['no_address', 'invalid_address'] as const;
export type SuspicionStaffEmailErrorReason = (typeof SUSPICION_STAFF_EMAIL_ERROR_REASONS)[number];
/** The pre-call steps (RE5). */
export const SUSPICION_STAFF_EMAIL_PRE_CALL_STEPS = ['read_failed', 'decrypt_failed', 'render_failed'] as const;

/** What a `detail` can say. `name` is a provider error NAME (or `network` / `timeout` / `http_<status>`) — sanitised here. */
export type SuspicionStaffEmailDetailInput =
  | { readonly kind: 'no_pariwar_admin' }
  | { readonly kind: 'transient'; readonly name: string }
  | { readonly kind: 'held'; readonly name: string }
  | { readonly kind: 'pre_call'; readonly step: (typeof SUSPICION_STAFF_EMAIL_PRE_CALL_STEPS)[number] }
  | { readonly kind: 'rejected'; readonly http: number; readonly name: string }
  | { readonly kind: 'error'; readonly reason: SuspicionStaffEmailErrorReason }
  | { readonly kind: 'exhausted_three_days' }
  | { readonly kind: 'recheck'; readonly reason: SuspicionStaffEmailRecheckReason };

const ERROR_NAME = /^[A-Za-z0-9_.]{1,64}$/;

/** A provider error NAME as stored — `unknown` unless it matches `^[A-Za-z0-9_.]{1,64}$` (⛔ message text can echo an address). */
export function sanitizeProviderErrorName(name: string): string {
  return ERROR_NAME.test(name) ? name : 'unknown';
}

/** ⭐ RE5 — THE ONLY way a `detail` / `first_detail` is built (0152 CHECKs ≤ 200 chars; every value here is far below). */
export function suspicionStaffEmailDetail(d: SuspicionStaffEmailDetailInput): string {
  switch (d.kind) {
    case 'no_pariwar_admin':
      return 'no_pariwar_admin';
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

const DETAIL_PATTERN = new RegExp(SUSPICION_STAFF_EMAIL_DETAIL_PATTERN);

/** Does `detail` match the vocabulary's grammar (0153's CHECK — the SAME pattern)? */
export function isSuspicionStaffEmailDetail(detail: string): boolean {
  return DETAIL_PATTERN.test(detail);
}

/** ⛔ A writer stores a `detail` outside the vocabulary (0153 would refuse it too — this fails BEFORE the statement, ⛔ value echoed). */
function assertDetail(detail: string | null): void {
  if (detail !== null && !isSuspicionStaffEmailDetail(detail)) {
    throw new Error('[suspicion-staff-email] a detail outside the fixed vocabulary — build it with suspicionStaffEmailDetail');
  }
}

// ── The selector (RE11) — cross-tenant, BYPASSRLS pool, keyset-paged on (claim, recipient NULLS FIRST), clamped ────────────

/** One due (claim, recipient) pair; `recipientUserId` NULL = the claim-level `no_target` pair (RE4). */
export interface DueSuspicionStaffEmail {
  readonly pariwarId: PariwarId;
  readonly claimCaseId: ClaimId;
  readonly recipientUserId: UserId | null;
  /** A crash left an `attempting` row for this pair — the predicate was bypassed so its locked re-check finishes it. */
  readonly hasAttemptingRow: boolean;
}

/** The keyset cursor — the last pair of the previous page. */
export interface SuspicionStaffEmailCursor {
  readonly claimCaseId: string;
  readonly recipientUserId: string | null;
}

export interface DueSuspicionStaffEmailPage {
  readonly due: readonly DueSuspicionStaffEmail[];
  /** The page's last pair — the next page's cursor (`null` ⇒ an empty page). */
  readonly last: SuspicionStaffEmailCursor | null;
  readonly scanned: number;
}

/** A row of claim `se_c` for recipient `recipient` (NULL-safe) — ANY outcome. */
const pairRowSql = (recipient: SQL) => sql`EXISTS (
  SELECT 1 FROM claim_suspicion_staff_emails se_n
   WHERE se_n.pariwar_id = se_c.pariwar_id
     AND se_n.claim_case_id = se_c.claim_case_id
     AND se_n.recipient_user_id IS NOT DISTINCT FROM ${recipient}
)`;

/**
 * ⭐ RE11 — the due (claim, recipient) pairs, one keyset page (cross-tenant — the BYPASSRLS pool only; `allow` (tests) narrows it
 * to some Pariwars). Three disjoint branches:
 *   (1) every Q1 recipient of a claim whose refusal STANDS, with ⛔ row for the pair (a pair with a FINISHED row is done; one with
 *       an `attempting` row comes from (3));
 *   (2) the `(claim, NULL)` pair when the claim STANDS, Q1 yields ⛔ nobody and the claim has ⛔ row at all (RE4);
 *   (3) every pair with an `attempting` row — the predicate BYPASSED, so its locked re-check finishes it.
 *
 * ── DELIBERATE: a CROSS-TENANT READ on the BYPASSRLS pool (family 9) ──
 * The sweep has ⛔ tenant to start from: it must find every Pariwar's due pairs, and a per-tenant loop would first need a
 * cross-tenant read to enumerate the Pariwars (the same bypass). It RETURNS ids only (`pariwar_id`, `claim_case_id`,
 * `recipient_user_id`, a boolean); it READS identity data through Q1 only (ADR-0040 — ⛔ identity column projected beyond the
 * `user_id`). ⛔ PII and ⛔ value from one tenant reaches another; every write that follows runs in the child's own
 * `withPariwarScope` transaction, under RLS, after a locked re-check. RE-EXAMINE when: the result ever carries more than ids /
 * flags, the read projects PII, a write is added on this pool, the pool loses BYPASSRLS, or a per-tenant scheduler exists.
 */
export async function selectDueSuspicionStaffEmails(
  q: Queryable,
  input: {
    readonly after: SuspicionStaffEmailCursor | null;
    readonly limit: number;
    readonly allow: readonly string[] | null;
  },
): Promise<DueSuspicionStaffEmailPage> {
  const size = clampLimit(input.limit, { default: SUSPICION_STAFF_EMAIL_PAGE_CAP, cap: SUSPICION_STAFF_EMAIL_PAGE_CAP });
  const recipients = staffEmailRecipientsSql(sql`se_c.pariwar_id`, sql`se_c.claim_case_id`);
  // ⚠ `sql.param` — a bare array in a Drizzle template is EXPANDED into one parameter per element.
  const allowC = input.allow === null ? sql`` : sql` AND se_c.pariwar_id = ANY(${sql.param([...input.allow])}::uuid[])`;
  const allowA = input.allow === null ? sql`` : sql` AND se_a.pariwar_id = ANY(${sql.param([...input.allow])}::uuid[])`;
  const after =
    input.after === null
      ? sql``
      : input.after.recipientUserId === null
        ? sql` WHERE (se_due.claim_case_id > ${input.after.claimCaseId}::uuid
                 OR (se_due.claim_case_id = ${input.after.claimCaseId}::uuid AND se_due.recipient_user_id IS NOT NULL))`
        : sql` WHERE (se_due.claim_case_id > ${input.after.claimCaseId}::uuid
                 OR (se_due.claim_case_id = ${input.after.claimCaseId}::uuid
                     AND se_due.recipient_user_id > ${input.after.recipientUserId}::uuid))`;
  const rows = await run<{ pariwar_id: string; claim_case_id: string; recipient_user_id: string | null; has_attempting: boolean }>(
    q,
    sql`
      SELECT se_due.pariwar_id, se_due.claim_case_id, se_due.recipient_user_id, se_due.has_attempting
        FROM (
          SELECT se_c.pariwar_id, se_c.claim_case_id, se_r.user_id AS recipient_user_id, false AS has_attempting
            FROM claims se_c
            CROSS JOIN LATERAL ${recipients} se_r
           WHERE ${standingSuspicionRefusalSql('se_c')}${allowC}
             AND NOT ${pairRowSql(sql`se_r.user_id`)}
          UNION ALL
          SELECT se_c.pariwar_id, se_c.claim_case_id, NULL::uuid AS recipient_user_id, false AS has_attempting
            FROM claims se_c
           WHERE ${standingSuspicionRefusalSql('se_c')}${allowC}
             AND NOT EXISTS (SELECT 1 FROM claim_suspicion_staff_emails se_any
                              WHERE se_any.pariwar_id = se_c.pariwar_id AND se_any.claim_case_id = se_c.claim_case_id)
             AND NOT EXISTS (SELECT 1 FROM ${recipients} se_r0)
          UNION ALL
          SELECT se_a.pariwar_id, se_a.claim_case_id, se_a.recipient_user_id, true AS has_attempting
            FROM claim_suspicion_staff_emails se_a
           WHERE se_a.outcome = 'attempting'${allowA}
        ) se_due${after}
       ORDER BY se_due.claim_case_id ASC, se_due.recipient_user_id ASC NULLS FIRST
       LIMIT ${sql.raw(String(size))}
    `,
  );
  const due = rows.map((r) => ({
    pariwarId: r.pariwar_id as PariwarId,
    claimCaseId: r.claim_case_id as ClaimId,
    recipientUserId: (r.recipient_user_id ?? null) as UserId | null,
    hasAttemptingRow: r.has_attempting,
  }));
  const last = rows.at(-1);
  return {
    due,
    last: last ? { claimCaseId: last.claim_case_id, recipientUserId: last.recipient_user_id ?? null } : null,
    scanned: rows.length,
  };
}

// ── The give-up (RE11) ───────────────────────────────────────────────────────────────────────────────────────────────────

/** Rows whose `aging_since` is before this instant and still `attempting` are given up: 00:00 IST of (today − 2). */
export function suspicionStaffEmailReclaimCutoff(now: Date): Date {
  return istMidnightAt(addCalendarDays(istDateOf(now), -(SUSPICION_STAFF_EMAIL_RECLAIM_DAYS - 1)));
}

/**
 * ⭐ RE11 (AMENDED by `-300`) — THE EXHAUSTED-ROW FINALISER: every row still `attempting` whose `aging_since` (its creation, or
 * its re-claim after a hold) is before `cutoff` AND whose LAST claim (or
 * note) is older than `STAFF_EMAIL_SEND_LEASE_MS` becomes `error` / `exhausted:attempting_three_days` (its detail kept in
 * `first_detail`) — ⛔ a PARKED row (a held sweep parked it; the first child after the hold retries it — round 3 Decision 1 A).
 * The caller runs this ONLY on an un-held run. Returns the pairs finalised, for the caller's ONE alarm — which ALWAYS says a prior attempt may have sent
 * (every given-up row had a claiming commit — `-298`'s principle).
 *
 * ── DELIBERATE: a CROSS-TENANT WRITE on the BYPASSRLS pool (family 9) ──
 * A time bound over EVERY tenant's rows; its predicate (`attempting`, created before the cutoff, claimed before the lease) and
 * its effect (→ `error`) read and write ⛔ nothing tenant-derived — ⛔ PII, ⛔ cross-row join; `allow` (tests) narrows it. A live
 * child's row is inside the lease (its re-claim and its transient note both refresh `claimed_at`) ⇒ left to its own
 * compare-and-set. It takes ⛔ claim-row lock: a child past its claim loses `finaliseSuspicionStaffEmail`'s compare-and-set and
 * ALARMS; a child still in `beginSuspicionStaffEmail` loses its UPDATE and returns `already_final` silently — this statement's
 * own alarm covers the row. RE-EXAMINE when: the statement ever writes a value derived from another row or tenant, the pool
 * loses BYPASSRLS, a per-tenant scheduler exists, or the lease approaches the reclaim horizon.
 */
export async function expireExhaustedSuspicionStaffEmails(
  q: Queryable,
  input: { readonly cutoff: Date; readonly now: Date; readonly allow: readonly string[] | null },
): Promise<{ readonly claimCaseId: ClaimId; readonly recipientUserId: UserId | null }[]> {
  const { rows } = await q.query<{ claim_case_id: string; recipient_user_id: string | null }>(
    `UPDATE claim_suspicion_staff_emails
        SET outcome = 'error',
            may_have_sent = true,
            first_detail = COALESCE(first_detail, detail),
            detail = $4,
            updated_at = clock_timestamp()
      WHERE outcome = 'attempting' AND aging_since < $1 AND claimed_at < $3 AND claimed_by_job <> $5
        AND ($2::uuid[] IS NULL OR pariwar_id = ANY($2::uuid[]))
      RETURNING claim_case_id, recipient_user_id`,
    [
      input.cutoff,
      input.allow === null ? null : [...input.allow],
      new Date(input.now.getTime() - STAFF_EMAIL_SEND_LEASE_MS),
      suspicionStaffEmailDetail({ kind: 'exhausted_three_days' }),
      SUSPICION_STAFF_EMAIL_PARKED_BY,
    ],
  );
  return rows.map((r) => ({ claimCaseId: r.claim_case_id as ClaimId, recipientUserId: (r.recipient_user_id ?? null) as UserId | null }));
}

/**
 * ⭐ THE HOLD PARK (code review rounds 3–4, `-300` §2 (i)): on a run the config check / provider pre-flight HOLDS, every
 * `attempting` row past the lease (⛔ live child holds it — a live child's claim or note keeps it inside) is marked
 * `claimed_by_job` = `SUSPICION_STAFF_EMAIL_PARKED_BY`, so the give-up cannot burn it while the sweep enqueues ⛔ retry, and the
 * next child re-claims it (restarting its `aging_since`). ⚠ A held run does ⛔ stop children ALREADY queued or retrying: their
 * race guard checks the config gap only (⛔ the pre-flight), so during a `preflight:*` hold they still run and may send — safe
 * here, since their rows stay inside the lease (⛔ parked) and a parked row is re-claimed by whichever child comes next. ⛔ `claimed_at`, ⛔ `detail`, ⛔ `may_have_sent` are touched (the re-claim still sees a NULL detail).
 * Returns how many rows it parked (for the caller's ONE end-of-run alarm).
 *
 * ── DELIBERATE: a CROSS-TENANT WRITE on the BYPASSRLS pool (family 9) ──
 * The give-up's twin: a time bound over EVERY tenant's rows; its predicate (`attempting`, claimed before the lease, ⛔ parked) and
 * its effect (one marker value) read and write ⛔ nothing tenant-derived — ⛔ PII, ⛔ cross-row join; `allow` (tests) narrows it.
 * It takes ⛔ claim-row lock: a child re-claiming the row concurrently is re-evaluated by its own UPDATE's lease predicate.
 * RE-EXAMINE when: the statement ever writes a value derived from another row or tenant, the pool loses BYPASSRLS, a
 * per-tenant scheduler exists, or the lease stops bounding a live child's silence (the park relies on "past the lease ⇒ ⛔ live
 * child").
 */
export async function parkHeldSuspicionStaffEmails(
  q: Queryable,
  input: { readonly now: Date; readonly allow: readonly string[] | null },
): Promise<number> {
  const { rowCount } = await q.query(
    `UPDATE claim_suspicion_staff_emails
        SET claimed_by_job = $3, updated_at = clock_timestamp()
      WHERE outcome = 'attempting' AND claimed_at < $1 AND claimed_by_job <> $3
        AND ($2::uuid[] IS NULL OR pariwar_id = ANY($2::uuid[]))`,
    [new Date(input.now.getTime() - STAFF_EMAIL_SEND_LEASE_MS), input.allow === null ? null : [...input.allow], SUSPICION_STAFF_EMAIL_PARKED_BY],
  );
  return rowCount ?? 0;
}

// ── The claiming transaction (RE11) ──────────────────────────────────────────────────────────────────────────────────────

export type BeginSuspicionStaffEmailResult =
  | {
      readonly kind: 'begun';
      readonly noticeId: string;
      readonly recipientUserId: UserId;
      readonly attemptCount: number;
      /** The row's `detail` BEFORE this claim cleared it — the held-fault alarm's "is this fault new?" (RE6). */
      readonly previousDetail: string | null;
      /** The row already says a prior attempt MAY have sent (incl. this re-claim's own finding). */
      readonly mayHaveSent: boolean;
    }
  | { readonly kind: 'already_final' }
  | { readonly kind: 'held_by_other' }
  /** A FRESH pair whose locked re-check failed — ⛔ row written. */
  | { readonly kind: 'not_due'; readonly reason: SuspicionStaffEmailRecheckReason }
  /** An existing `attempting` row finished `error` by a failed re-check (`-297` §2) — the caller ALWAYS alarms "may have sent". */
  | { readonly kind: 'expired'; readonly detail: string }
  /** RE4 — the claim-level `no_target` row was written NOW — the caller alarms once. */
  | { readonly kind: 'no_target' };

interface StaffEmailRow {
  notice_id: string;
  outcome: string;
  detail: string | null;
  claimed_at: Date | string | null;
  claimed_by_job: string | null;
}

/** ⭐ The ONE re-check (on the locked transaction's client — the statement clock is AFTER the lock). `null` = it holds. */
async function recheck(
  db: Db,
  client: pg.PoolClient,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
  recipientUserId: UserId | null,
): Promise<SuspicionStaffEmailRecheckReason | null> {
  if (!(await isSuspicionRefusalStanding(db, pariwarId, claimCaseId))) return 'refusal_not_standing';
  const recipients = staffEmailRecipientsSql(sql`${pariwarId}::uuid`, sql`${claimCaseId}::uuid`);
  if (recipientUserId !== null) {
    const [row] = await run<{ eligible: boolean }>(
      client,
      sql`SELECT EXISTS (SELECT 1 FROM ${recipients} se_r WHERE se_r.user_id = ${recipientUserId}::uuid) AS eligible`,
    );
    return row?.eligible ? null : 'recipient_not_eligible';
  }
  const [row] = await run<{ anyone: boolean; any_row: boolean }>(
    client,
    sql`SELECT EXISTS (SELECT 1 FROM ${recipients} se_r) AS anyone,
               EXISTS (SELECT 1 FROM claim_suspicion_staff_emails se_any
                        WHERE se_any.pariwar_id = ${pariwarId}::uuid AND se_any.claim_case_id = ${claimCaseId}::uuid) AS any_row`,
  );
  if (row?.anyone) return 'recipients_exist';
  if (row?.any_row) return 'claim_has_rows';
  return null;
}

/**
 * ⭐ THE CLAIMING TRANSACTION (RE11) — on the ONE client of the caller's scope transaction: lock the claim row, re-check under
 * it, and claim (or finish) the pair's row. ⛔ No KMS, ⛔ no decrypt, ⛔ no address here — the caller COMMITS, then reads Q2,
 * decrypts and sends. ⛔ Never catch a DB error inside this transaction (⛔ SAVEPOINT ⇒ a failed statement aborts it and the
 * COMMIT would silently roll the claim back — then a send on an unheld row).
 * @throws Error the claim row is missing under this Pariwar — a data fault (the selector read it moments ago; claims are ⛔
 *   deleted), ⛔ a `not_due`.
 */
export async function beginSuspicionStaffEmail(
  client: pg.PoolClient,
  input: {
    readonly pariwarId: PariwarId;
    readonly claimCaseId: ClaimId;
    readonly recipientUserId: UserId | null;
    readonly jobId: string;
    readonly now: Date;
  },
): Promise<BeginSuspicionStaffEmailResult> {
  const db = bindScopedDb(client);
  const { pariwarId, jobId, now } = input;
  const claimCaseId = String(input.claimCaseId).toLowerCase() as ClaimId;
  const recipientUserId = input.recipientUserId === null ? null : (String(input.recipientUserId).toLowerCase() as UserId);
  await client.query(`SET LOCAL lock_timeout = '${SUSPICION_STAFF_EMAIL_LOCK_TIMEOUT}'`);
  const locked = await client.query(`SELECT 1 FROM claims WHERE pariwar_id = $1 AND claim_case_id = $2 FOR UPDATE`, [pariwarId, claimCaseId]);
  if (locked.rows.length === 0) throw new Error(`[suspicion-staff-email] claim ${claimCaseId} is missing under Pariwar ${pariwarId}`);

  const existing = (
    await client.query<StaffEmailRow>(
      `SELECT notice_id, outcome, detail, claimed_at, claimed_by_job FROM claim_suspicion_staff_emails
        WHERE pariwar_id = $1 AND claim_case_id = $2 AND recipient_user_id IS NOT DISTINCT FROM $3::uuid`,
      [pariwarId, claimCaseId, recipientUserId],
    )
  ).rows[0];
  if (existing && existing.outcome !== 'attempting') return { kind: 'already_final' };
  if (existing) {
    const ownRetry = existing.claimed_by_job === jobId;
    const parked = existing.claimed_by_job === SUSPICION_STAFF_EMAIL_PARKED_BY;
    const leaseExpired =
      existing.claimed_at !== null && toDate(existing.claimed_at).getTime() < now.getTime() - STAFF_EMAIL_SEND_LEASE_MS;
    if (!ownRetry && !parked && !leaseExpired) return { kind: 'held_by_other' };
  }

  const failed = await recheck(db, client, pariwarId, claimCaseId, recipientUserId);
  if (failed !== null) {
    if (!existing) return { kind: 'not_due', reason: failed };
    // `-297` §2 — an existing `attempting` row means a claiming commit happened, so an email MAY have gone: ALWAYS `error`.
    const detail = suspicionStaffEmailDetail({ kind: 'recheck', reason: failed });
    const expired = await client.query(
      `UPDATE claim_suspicion_staff_emails
          SET outcome = 'error', may_have_sent = true, first_detail = COALESCE(first_detail, detail), detail = $2,
              claimed_by_job = $3, claimed_at = $4, updated_at = clock_timestamp()
        WHERE notice_id = $1 AND outcome = 'attempting'`,
      [existing.notice_id, detail, jobId, now],
    );
    // The give-up takes ⛔ claim-row lock, so it can finish the row between the SELECT above and this UPDATE.
    if ((expired.rowCount ?? 0) === 0) return { kind: 'already_final' };
    return { kind: 'expired', detail };
  }

  if (recipientUserId === null) {
    // RE4 — a FRESH final row (⛔ via `attempting`: 0152's CHECK forbids a NULL-recipient `attempting` row). An existing NULL row
    // is always final (above), so this is always an INSERT.
    const inserted = await client.query(
      `INSERT INTO claim_suspicion_staff_emails (pariwar_id, claim_case_id, recipient_user_id, outcome, detail)
       VALUES ($1, $2, NULL, 'no_target', $3)
       ON CONFLICT ON CONSTRAINT claim_suspicion_staff_emails_claim_recipient_uq DO NOTHING`,
      [pariwarId, claimCaseId, suspicionStaffEmailDetail({ kind: 'no_pariwar_admin' })],
    );
    return (inserted.rowCount ?? 0) === 0 ? { kind: 'already_final' } : { kind: 'no_target' };
  }

  // Claim the row — INSERT `attempting`, or re-claim the existing one (own retry at once; another job's past the lease).
  let claimed: { notice_id: string; attempt_count: number; may_have_sent: boolean } | undefined;
  if (existing) {
    claimed = (
      await client.query<{ notice_id: string; attempt_count: number; may_have_sent: boolean }>(
        `UPDATE claim_suspicion_staff_emails
            SET claimed_at = $2, claimed_by_job = $3, attempt_count = attempt_count + 1,
                -- decision -300 §2 (ii): a PARKED row (it sat out a hold) restarts its three IST days now (SET reads the OLD holder).
                aging_since = CASE WHEN claimed_by_job = $4 THEN $2 ELSE aging_since END,
                may_have_sent = may_have_sent OR detail IS NULL,
                first_detail = COALESCE(first_detail, detail), detail = NULL, updated_at = clock_timestamp()
          WHERE notice_id = $1 AND outcome = 'attempting'
            AND (claimed_by_job = $3 OR claimed_by_job = $4 OR claimed_at < $5)
          RETURNING notice_id, attempt_count, may_have_sent`,
        [existing.notice_id, now, jobId, SUSPICION_STAFF_EMAIL_PARKED_BY, new Date(now.getTime() - STAFF_EMAIL_SEND_LEASE_MS)],
      )
    ).rows[0];
    if (!claimed) {
      // ⭐ Round 3 — the lease is RE-CHECKED by the UPDATE itself (the SELECT above took ⛔ row lock, and a live holder's note /
      // re-claim takes ⛔ claim lock): a holder that refreshed the lease meanwhile keeps its row; a row finished meanwhile is final.
      const current = (
        await client.query<{ outcome: string }>(`SELECT outcome FROM claim_suspicion_staff_emails WHERE notice_id = $1`, [existing.notice_id])
      ).rows[0];
      return current?.outcome === 'attempting' ? { kind: 'held_by_other' } : { kind: 'already_final' };
    }
  } else {
    claimed = (
      await client.query<{ notice_id: string; attempt_count: number; may_have_sent: boolean }>(
        `INSERT INTO claim_suspicion_staff_emails (pariwar_id, claim_case_id, recipient_user_id, outcome, claimed_at, claimed_by_job)
         VALUES ($1, $2, $3, 'attempting', $4, $5)
         ON CONFLICT ON CONSTRAINT claim_suspicion_staff_emails_claim_recipient_uq DO NOTHING
         RETURNING notice_id, attempt_count, may_have_sent`,
        [pariwarId, claimCaseId, recipientUserId, now, jobId],
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

// ── The compare-and-set and the transient note ───────────────────────────────────────────────────────────────────────────

/**
 * ⭐ THE COMPARE-AND-SET: `attempting` → final, only from `attempting` and only by the job holding the row. Returns `null` when
 * the row moved on (the give-up, or a job that took it over past the lease) — the caller alarms; else the row's
 * `may_have_sent`, which the caller alarms on for ANY finish (`accepted` included — RE5-bis / `-298`'s principle).
 */
export async function finaliseSuspicionStaffEmail(
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
    UPDATE claim_suspicion_staff_emails
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

/**
 * A TRANSIENT failure (incl. the HELD account / config class — RE6): keep the row `attempting`, record the classified detail,
 * set `may_have_sent` when the failure may have followed an accept (RE5-bis), and REFRESH `claimed_at` (the lease — so the next
 * sweep tick's child for this pair is `held_by_other` while this job is still retrying). Returns the `rowCount` (0 ⇒ the row
 * moved on — the caller alarms).
 */
export async function noteSuspicionStaffEmailTransient(
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
    UPDATE claim_suspicion_staff_emails
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
