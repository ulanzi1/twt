// MSG91's SMS delivery reports — the domain accessors (Story 6.37b, Task 3; `2026-10-17-347` DR2, DR5–DR8, DR11, DR12;
// ADR-0042). Migration 0167's two tables, read and written in RAW SQL on a caller-supplied `pg` handle (the api's
// global write tx, jobs' service pool or a transaction on it).
//
// ⭐ What lives here: the SQL. What does ⛔: the decisions — the status mapping (DR4) and the matching rule (DR6) are
// the jobs correlator's, the projection (DR2) the api handler's. Every function takes its clock as an argument (`now`)
// so a test controls DR6's schedule and DR12's windows.
//
// ⚠ I2 — the four send tables are READ here (one per-kind SELECT, and the silence counts), ⛔ ever written.

import { and, eq, inArray } from 'drizzle-orm';
import type pg from 'pg';

import type { Db } from '../db.js';
import { clampLimit } from '../pagination.js';
import { smsSendDeliveries, type SmsDeliveryState, type SmsSendDeliveryRow } from '../schema/sms_send_deliveries.js';
import type { SmsReportMatchState } from '../schema/sms_delivery_report_inbox.js';
import type { SmsSendRowKind } from './correlation.js';

type Queryable = Pick<pg.Pool, 'query'> | Pick<pg.PoolClient, 'query'>;

function toDate(v: Date | string): Date {
  return v instanceof Date ? v : new Date(v);
}

// ── The inbox (DR2, DR7) ─────────────────────────────────────────────────────────────────────────────────────────

/** One report as the webhook keeps it — DR2's allowlisted projection (⛔ the phone number, ⛔ the raw body). */
export interface SmsDeliveryReportProjection {
  readonly requestId: string;
  readonly crqid: string | null;
  readonly statusCode: string | null;
  readonly eventName: string | null;
  readonly failureReason: string | null;
  readonly reportedDeliveryTime: string | null;
}

/** DR2 — at most this many reports in one POST (a defensive array). */
export const SMS_REPORTS_PER_REQUEST_MAX = 100;

/**
 * Persist the reports of ONE request: one row each, `ON CONFLICT DO NOTHING` on DR7's dedupe key (a retry or a
 * duplicate is a no-op). Returns how many rows were NEW. `received_at` is the database's `now()`. ⛔ Rows ⇒ 0, ⛔ a
 * statement. More than {@link SMS_REPORTS_PER_REQUEST_MAX} ⇒ a throw (the handler never passes more).
 */
export async function persistSmsDeliveryReports(q: Queryable, rows: readonly SmsDeliveryReportProjection[]): Promise<number> {
  if (rows.length === 0) return 0;
  if (rows.length > SMS_REPORTS_PER_REQUEST_MAX) throw new Error('persistSmsDeliveryReports: too many reports in one request');
  // All concurrent batches take unique-index locks in the same order, including blank-coalesced keys (DR7).
  // Sort a copy with a stable comparator: equal keys retain the first input's metadata; callers keep their order.
  const key = (r: SmsDeliveryReportProjection): string => `${r.requestId}\0${r.crqid ?? ''}\0${r.statusCode ?? ''}`;
  const ordered = [...rows].sort((a, b) => {
    const ak = key(a);
    const bk = key(b);
    return ak < bk ? -1 : ak > bk ? 1 : 0;
  });
  const values: unknown[] = [];
  const tuples = ordered.map((r, i) => {
    values.push(r.requestId, r.crqid, r.statusCode, r.eventName, r.failureReason, r.reportedDeliveryTime);
    const b = i * 6;
    return `($${b + 1}, $${b + 2}, $${b + 3}, $${b + 4}, $${b + 5}, $${b + 6})`;
  });
  const { rowCount } = await q.query(
    `INSERT INTO sms_delivery_report_inbox (request_id, crqid, status_code, event_name, failure_reason, reported_delivery_time)
     VALUES ${tuples.join(', ')}
     ON CONFLICT DO NOTHING`,
    values,
  );
  return rowCount ?? 0;
}

/** A claimed inbox row — what the correlator needs to decide it (DR6). */
export interface ClaimedSmsDeliveryReport {
  readonly reportId: string;
  readonly requestId: string;
  readonly crqid: string | null;
  readonly statusCode: string | null;
  readonly failureReason: string | null;
  readonly receivedAt: Date;
  /** The attempt count AFTER this claim's increment — the settle's compare-and-set value. */
  readonly attempts: number;
}

/** DR8 — the claim's page size: default 200, cap 500 (the domain limit-clamp gate sees ⛔ raw SQL — clamped by hand). */
export const SMS_REPORT_CLAIM_LIMIT = { default: 200, cap: 500 } as const;

/** DR8 — how long a claim holds a row before another drain may take it. */
export const SMS_REPORT_LEASE_MS = 5 * 60_000;

/**
 * DR8 — claim up to `limit` DUE `pending` rows under a LEASE (⛔ `processed_at` in the claim — T2): each claimed row's
 * `lease_until` = `now + leaseMs` and `attempts` + 1, oldest `received_at` first, `FOR UPDATE SKIP LOCKED` so two drains
 * never take one row. A row whose lease lapsed (a crashed worker) is due again. At-least-once: the settle is the
 * compare-and-set ({@link settleSmsDeliveryReport}).
 */
export async function claimDueSmsDeliveryReports(
  q: Queryable,
  opts: { readonly limit?: number; readonly leaseMs?: number; readonly now: Date },
): Promise<ClaimedSmsDeliveryReport[]> {
  const limit = clampLimit(opts.limit, SMS_REPORT_CLAIM_LIMIT);
  const leaseMs = opts.leaseMs ?? SMS_REPORT_LEASE_MS;
  if (!(leaseMs > 0)) throw new Error('claimDueSmsDeliveryReports: leaseMs must be positive');
  const { rows } = await q.query<{
    report_id: string;
    request_id: string;
    crqid: string | null;
    status_code: string | null;
    failure_reason: string | null;
    received_at: Date | string;
    attempts: number;
  }>(
    `UPDATE sms_delivery_report_inbox i
        SET lease_until = $1::timestamptz + ($2::double precision * interval '1 millisecond'), attempts = i.attempts + 1
      WHERE i.report_id IN (
              SELECT report_id FROM sms_delivery_report_inbox
               WHERE match_state = 'pending' AND next_attempt_at <= $1::timestamptz
                 AND (lease_until IS NULL OR lease_until < $1::timestamptz)
               ORDER BY received_at, report_id
               LIMIT $3
               FOR UPDATE SKIP LOCKED)
      RETURNING i.report_id, i.request_id, i.crqid, i.status_code, i.failure_reason, i.received_at, i.attempts`,
    [opts.now, leaseMs, limit],
  );
  return rows
    .map((r) => ({
      reportId: r.report_id,
      requestId: r.request_id,
      crqid: r.crqid,
      statusCode: r.status_code,
      failureReason: r.failure_reason,
      receivedAt: toDate(r.received_at),
      attempts: r.attempts,
    }))
    .sort((a, b) => a.receivedAt.getTime() - b.receivedAt.getTime() || a.reportId.localeCompare(b.reportId));
}

/** How a claimed row ends this attempt (DR6): settled to a final `(match_state, match_detail)`, or retried later. */
export type SmsReportSettlement =
  | { readonly kind: 'settle'; readonly matchState: Exclude<SmsReportMatchState, 'pending'>; readonly matchDetail: string }
  | { readonly kind: 'retry'; readonly nextAttemptAt: Date };

/**
 * DR8 — end a claimed row's attempt as a COMPARE-AND-SET on `(match_state = 'pending', attempts = <claimed>)`: a settle
 * stamps `settled_at = now` (the prune's clock); a retry stays `pending` with the next due time and CLEARS the lease
 * (else the backoff would really be the lease). `false` ⇒ the row moved on (a lapsed lease re-claimed it) — the caller
 * ROLLS BACK whatever it wrote with it, so a report is ⛔ counted twice (AC7).
 */
export async function settleSmsDeliveryReport(
  q: Queryable,
  input: { readonly reportId: string; readonly claimedAttempts: number; readonly settlement: SmsReportSettlement; readonly now: Date },
): Promise<boolean> {
  const s = input.settlement;
  const { rowCount } =
    s.kind === 'settle'
      ? await q.query(
          `UPDATE sms_delivery_report_inbox SET match_state = $3, match_detail = $4, settled_at = $5::timestamptz, lease_until = NULL
            WHERE report_id = $1 AND match_state = 'pending' AND attempts = $2`,
          [input.reportId, input.claimedAttempts, s.matchState, s.matchDetail, input.now],
        )
      : await q.query(
          `UPDATE sms_delivery_report_inbox SET next_attempt_at = $3::timestamptz, lease_until = NULL
            WHERE report_id = $1 AND match_state = 'pending' AND attempts = $2`,
          [input.reportId, input.claimedAttempts, s.nextAttemptAt],
        );
  return rowCount === 1;
}

/** DR7 — delete settled rows whose `settled_at` is more than `olderThanDays` before `now`. `pending` rows stay. */
export async function pruneSettledSmsDeliveryReports(
  q: Queryable,
  opts: { readonly olderThanDays: number; readonly now: Date },
): Promise<number> {
  if (!(Number.isInteger(opts.olderThanDays) && opts.olderThanDays >= 1)) {
    throw new Error('pruneSettledSmsDeliveryReports: olderThanDays must be a positive integer');
  }
  const { rowCount } = await q.query(
    `DELETE FROM sms_delivery_report_inbox
      WHERE match_state <> 'pending' AND settled_at < $1::timestamptz - ($2::int * interval '1 day')`,
    [opts.now, opts.olderThanDays],
  );
  return rowCount ?? 0;
}

// ── The send a report names (DR6 rows 3–8) ──────────────────────────────────────────────────────────────────────

/** What the correlator reads of ONE send row (F12's columns) — ⛔ a number, ⛔ a hash. */
export interface SmsSendRowFacts {
  readonly pariwarId: string;
  /** `outcome` (pings: `send_outcome`, NULL ⇒ ⛔ begun). */
  readonly outcome: string | null;
  readonly providerMessageId: string | null;
  /** `claim_correction_reminders.purpose`; null for the other kinds (all of their rows are SMS). */
  readonly purpose: string | null;
}

const LOOKUP: Record<SmsSendRowKind, string> = {
  cr: `SELECT pariwar_id, outcome, provider_message_id, purpose FROM claim_correction_reminders WHERE reminder_id = $1`,
  ce: `SELECT pariwar_id, outcome, provider_message_id, NULL::text AS purpose FROM claim_certificate_reminders WHERE reminder_id = $1`,
  sn: `SELECT pariwar_id, outcome, provider_message_id, NULL::text AS purpose FROM claim_suspicion_notices WHERE notice_id = $1`,
  pm: `SELECT pariwar_id, send_outcome AS outcome, provider_message_id, NULL::text AS purpose FROM claim_peer_mesh_pings WHERE ping_id = $1`,
};

/** DR6 — one PRIMARY-KEY lookup of the send a CRQID names; null when ⛔ such row (yet). Reads ONLY (I2). */
export async function lookupSendForCorrelation(q: Queryable, kind: SmsSendRowKind, rowId: string): Promise<SmsSendRowFacts | null> {
  const statement = LOOKUP[kind];
  if (statement === undefined) throw new Error('lookupSendForCorrelation: unknown kind');
  const { rows } = await q.query<{ pariwar_id: string; outcome: string | null; provider_message_id: string | null; purpose: string | null }>(
    statement,
    [rowId],
  );
  const r = rows[0];
  if (r === undefined) return null;
  return { pariwarId: r.pariwar_id, outcome: r.outcome, providerMessageId: r.provider_message_id, purpose: r.purpose };
}

// ── The per-send delivery record (DR5, DR6 row 8) ───────────────────────────────────────────────────────────────

/** One matching report, as DR6 row 8 applies it. */
export interface SmsSendDeliveryReport {
  readonly pariwarId: string;
  readonly kind: SmsSendRowKind;
  readonly rowId: string;
  readonly requestId: string;
  readonly state: SmsDeliveryState;
  readonly statusCode: string;
  readonly failureReason: string | null;
  /** The report's `received_at` (OUR clock). */
  readonly receivedAt: Date;
}

/**
 * ⭐ DR6's COUNTING CONTRACT, in ONE statement — `INSERT … ON CONFLICT (send_kind, send_row_id) DO UPDATE SET …`, with
 * ⛔ `WHERE` on the update and ⛔ read-then-write here:
 * - `delivery_state` — `undelivered` if either the stored or this report's state is `undelivered`, else `delivered`
 *   (absorbing — a later `delivered` never replaces `undelivered`; ⛔ latest-wins, T3);
 * - `status_code` / `failure_reason` — this report's ONLY when it moves the state `delivered` → `undelivered`, so they
 *   always belong to the report that set the current state;
 * - `request_id` — the first report's, unchanged;
 * - `report_count` — + 1 for EVERY matching report, one that changes nothing included;
 * - `first_reported_at` / `reported_at` — the earlier / the later `received_at` (reports can settle out of order).
 */
export async function upsertSmsSendDelivery(q: Queryable, r: SmsSendDeliveryReport): Promise<void> {
  await q.query(
    `INSERT INTO sms_send_deliveries AS d
       (send_kind, send_row_id, pariwar_id, request_id, delivery_state, status_code, failure_reason, first_reported_at, reported_at, report_count)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8::timestamptz, $8::timestamptz, 1)
     ON CONFLICT (send_kind, send_row_id) DO UPDATE SET
       delivery_state = CASE WHEN d.delivery_state = 'undelivered' OR EXCLUDED.delivery_state = 'undelivered'
                             THEN 'undelivered' ELSE 'delivered' END,
       status_code = CASE WHEN d.delivery_state = 'delivered' AND EXCLUDED.delivery_state = 'undelivered'
                          THEN EXCLUDED.status_code ELSE d.status_code END,
       failure_reason = CASE WHEN d.delivery_state = 'delivered' AND EXCLUDED.delivery_state = 'undelivered'
                             THEN EXCLUDED.failure_reason ELSE d.failure_reason END,
       report_count = d.report_count + 1,
       first_reported_at = LEAST(d.first_reported_at, EXCLUDED.first_reported_at),
       reported_at = GREATEST(d.reported_at, EXCLUDED.reported_at)`,
    [r.kind, r.rowId, r.pariwarId, r.requestId, r.state, r.statusCode, r.failureReason, r.receivedAt],
  );
}

/** Read the delivery records of some sends of ONE kind — under the caller's tenant scope (RLS). ⛔ Ids ⇒ []. */
export async function readSmsSendDeliveries(db: Db, kind: SmsSendRowKind, rowIds: readonly string[]): Promise<SmsSendDeliveryRow[]> {
  if (rowIds.length === 0) return [];
  return db
    .select()
    .from(smsSendDeliveries)
    .where(and(eq(smsSendDeliveries.sendKind, kind), inArray(smsSendDeliveries.sendRowId, [...rowIds])));
}

// ── Silence and the OTP line (DR11, DR12) ───────────────────────────────────────────────────────────────────────

/** DR12 — the window an accepted SMS send must have been finalised in to be expected to have a report by now. */
export const SMS_SILENCE_WINDOW = { olderThanHours: 48, newerThanDays: 7 } as const;

/**
 * DR12 — per send kind, the ACCEPTED SMS sends finalised between 7 days and 48 h before `now` that have ⛔ delivery
 * record AND ⛔ inbox row carrying their CRQID (a report that never matched still proves the webhook is alive).
 * `claim_correction_reminders` counts only its SMS purposes (`family_sms`, `closure_notice` — a `staff_push` holds an FCM
 * id and ⛔ CRQID); pings by `send_outcome` / `send_updated_at`. Reads ONLY (I2).
 */
export async function countSilentSmsSends(q: Queryable, opts: { readonly now: Date }): Promise<Record<SmsSendRowKind, number>> {
  const window = `BETWEEN $1::timestamptz - interval '${SMS_SILENCE_WINDOW.newerThanDays} days'
                      AND $1::timestamptz - interval '${SMS_SILENCE_WINDOW.olderThanHours} hours'`;
  const silent = (kind: SmsSendRowKind, idCol: string) => `
      NOT EXISTS (SELECT 1 FROM sms_send_deliveries d WHERE d.send_kind = '${kind}' AND d.send_row_id = s.${idCol})
      AND NOT EXISTS (SELECT 1 FROM sms_delivery_report_inbox i WHERE i.crqid = '${kind}' || replace(s.${idCol}::text, '-', ''))`;
  const { rows } = await q.query<{ cr: string; ce: string; sn: string; pm: string }>(
    `SELECT
       (SELECT count(*) FROM claim_correction_reminders s
         WHERE s.purpose IN ('family_sms', 'closure_notice') AND s.outcome = 'accepted' AND s.updated_at ${window}
           AND ${silent('cr', 'reminder_id')}) AS cr,
       (SELECT count(*) FROM claim_certificate_reminders s
         WHERE s.outcome = 'accepted' AND s.updated_at ${window} AND ${silent('ce', 'reminder_id')}) AS ce,
       (SELECT count(*) FROM claim_suspicion_notices s
         WHERE s.outcome = 'accepted' AND s.updated_at ${window} AND ${silent('sn', 'notice_id')}) AS sn,
       (SELECT count(*) FROM claim_peer_mesh_pings s
         WHERE s.send_outcome = 'accepted' AND s.send_updated_at ${window} AND ${silent('pm', 'ping_id')}) AS pm`,
    [opts.now],
  );
  const r = rows[0]!;
  return { cr: Number(r.cr), ce: Number(r.ce), sn: Number(r.sn), pm: Number(r.pm) };
}

/** DR11 — the login / step-up code reports settled in `[from, to)`, counted by result (⛔ an id). */
export interface OtpDeliveryCounts {
  readonly delivered: number;
  readonly undelivered: number;
  readonly intermediate: number;
  readonly unknown: number;
}

export async function countOtpDeliveryReports(q: Queryable, opts: { readonly from: Date; readonly to: Date }): Promise<OtpDeliveryCounts> {
  const { rows } = await q.query<{ match_detail: string; n: string }>(
    `SELECT match_detail, count(*) AS n FROM sms_delivery_report_inbox
      WHERE match_state = 'otp' AND settled_at >= $1::timestamptz AND settled_at < $2::timestamptz
      GROUP BY match_detail`,
    [opts.from, opts.to],
  );
  const by = new Map(rows.map((r) => [r.match_detail, Number(r.n)]));
  return {
    delivered: by.get('delivered') ?? 0,
    undelivered: by.get('undelivered') ?? 0,
    intermediate: by.get('intermediate') ?? 0,
    unknown: by.get('unknown_status') ?? 0,
  };
}
