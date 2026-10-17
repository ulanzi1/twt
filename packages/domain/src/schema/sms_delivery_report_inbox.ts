// `sms_delivery_report_inbox` — Story 6.37b (Task 2; `2026-10-17-347` DR2, DR6, DR7; ADR-0042). Migration 0167
// (hand-authored — the GRANTs, the per-command policies and FORCE RLS live there).
//
// GLOBAL (⛔ `pariwar_id` — MSG91 is one account): one allowlisted projection per report the webhook received (⛔ the
// phone number — DR2), deduplicated on EXACTLY (request id, CRQID, status code) — DR7 — and settled by the jobs
// correlator under a lease (DR6, DR8).

import { sql } from 'drizzle-orm';
import { check, index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

/** DR6 — the inbox's match states. ⚠ LOCKSTEP with `sms_delivery_report_inbox_match_state_check` (0167). */
export const SMS_REPORT_MATCH_STATES = ['pending', 'matched', 'other_attempt', 'unmatched', 'ignored', 'otp'] as const;
export type SmsReportMatchState = (typeof SMS_REPORT_MATCH_STATES)[number];

export const smsDeliveryReportInbox = pgTable(
  'sms_delivery_report_inbox',
  {
    reportId: uuid('report_id').defaultRandom().primaryKey(),
    /** MSG91's `requestId` — `^[A-Za-z0-9]{1,64}$` (a report without one is ⛔ stored — DR2). */
    requestId: text('request_id').notNull(),
    /** MSG91's `CRQID` in DR3's grammar; NULL when absent, `""`, `"0"` or outside the grammar (T7). */
    crqid: text('crqid'),
    statusCode: text('status_code'),
    eventName: text('event_name'),
    /** Trimmed, ≤ 200, control characters stripped, every run of ≥ 7 digits ⇒ `#` (DR2). */
    failureReason: text('failure_reason'),
    /** MSG91's `deliveryTime` as received, ≤ 40 — ⛔ parsed for logic (T8). */
    reportedDeliveryTime: text('reported_delivery_time'),
    /** OUR clock — the correlator's (T8). */
    receivedAt: timestamp('received_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    matchState: text('match_state').notNull().default('pending').$type<SmsReportMatchState>(),
    /** ≤ 64 `[a-z_:]`; present exactly when settled (DR6's `a:b` — `b`). */
    matchDetail: text('match_detail'),
    attempts: integer('attempts').notNull().default(0),
    nextAttemptAt: timestamp('next_attempt_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    leaseUntil: timestamp('lease_until', { withTimezone: true, mode: 'date' }),
    /** Stamped by every settle to a non-`pending` state — the prune's clock (DR7). */
    settledAt: timestamp('settled_at', { withTimezone: true, mode: 'date' }),
  },
  (t) => [
    // ⭐ DR7 — THE dedupe key, EXACTLY (request id, CRQID, status code), blank for an absent one.
    uniqueIndex('sms_delivery_report_inbox_dedupe_uq').on(t.requestId, sql`coalesce(${t.crqid}, '')`, sql`coalesce(${t.statusCode}, '')`),
    index('sms_delivery_report_inbox_due_idx').on(t.matchState, t.nextAttemptAt),
    index('sms_delivery_report_inbox_settled_idx').on(t.settledAt).where(sql`"match_state" <> 'pending'`),
    index('sms_delivery_report_inbox_crqid_idx').on(t.crqid).where(sql`"crqid" IS NOT NULL`),
    check('sms_delivery_report_inbox_request_id_check', sql`${t.requestId} ~ '^[A-Za-z0-9]{1,64}$'`),
    check('sms_delivery_report_inbox_crqid_check', sql`${t.crqid} IS NULL OR ${t.crqid} ~ '^(cr|ce|sn|pm|ot)[0-9a-f]{32}$'`),
    check('sms_delivery_report_inbox_status_code_check', sql`${t.statusCode} IS NULL OR ${t.statusCode} ~ '^[0-9]{1,3}$'`),
    check('sms_delivery_report_inbox_event_name_check', sql`${t.eventName} IS NULL OR ${t.eventName} ~ '^[A-Za-z_]{1,32}$'`),
    check(
      'sms_delivery_report_inbox_failure_reason_check',
      sql`${t.failureReason} IS NULL OR (length(${t.failureReason}) <= 200 AND ${t.failureReason} !~ '[[:cntrl:]]' AND ${t.failureReason} !~ '[0-9]{7}')`,
    ),
    check('sms_delivery_report_inbox_reported_delivery_time_check', sql`${t.reportedDeliveryTime} IS NULL OR length(${t.reportedDeliveryTime}) <= 40`),
    check(
      'sms_delivery_report_inbox_match_state_check',
      sql`${t.matchState} IN ('pending', 'matched', 'other_attempt', 'unmatched', 'ignored', 'otp')`,
    ),
    check('sms_delivery_report_inbox_match_detail_check', sql`${t.matchDetail} IS NULL OR ${t.matchDetail} ~ '^[a-z_:]{1,64}$'`),
    check(
      'sms_delivery_report_inbox_settled_pair_check',
      sql`(${t.matchState} = 'pending') = (${t.settledAt} IS NULL) AND (${t.matchState} = 'pending') = (${t.matchDetail} IS NULL)`,
    ),
    check('sms_delivery_report_inbox_attempts_check', sql`${t.attempts} >= 0`),
  ],
);

export type SmsDeliveryReportInboxRow = typeof smsDeliveryReportInbox.$inferSelect;
