// `sms_send_deliveries` — Story 6.37b (Task 2; `2026-10-17-347` DR5, DR6; ADR-0042). Migration 0167 (hand-authored —
// the GRANTs, the per-command policies and FORCE RLS live there).
//
// TENANT-scoped: one row per send a matching report reached (DR5), written ONLY by the jobs correlator's single upsert
// (DR6's counting contract — `undelivered` is absorbing). ⛔ A send table is touched (I2).

import { sql } from 'drizzle-orm';
import { check, index, integer, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import type { PariwarId } from '../ids/index.js';

/** DR5 — the send kinds a delivery record names. ⚠ LOCKSTEP with `sms_send_deliveries_send_kind_check` (0167). */
export const SMS_SEND_KINDS = ['cr', 'ce', 'sn', 'pm'] as const;

/** DR4 / DR5 — a send's recorded delivery state. ⚠ LOCKSTEP with `sms_send_deliveries_delivery_state_check` (0167). */
export const SMS_DELIVERY_STATES = ['delivered', 'undelivered'] as const;
export type SmsDeliveryState = (typeof SMS_DELIVERY_STATES)[number];

export const smsSendDeliveries = pgTable(
  'sms_send_deliveries',
  {
    /** `cr` | `ce` | `sn` | `pm` — the send table, by KIND (DR3). */
    sendKind: text('send_kind').notNull().$type<(typeof SMS_SEND_KINDS)[number]>(),
    /** The send row's uuid (⛔ FK — a kind-discriminated id across four tables; DR5). */
    sendRowId: uuid('send_row_id').notNull(),
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),
    /** The request id of the FIRST matching report (= the row's recorded `provider_message_id` — DR6 row 8). */
    requestId: text('request_id').notNull(),
    deliveryState: text('delivery_state').notNull().$type<SmsDeliveryState>(),
    /** The code of the report that SET the current state. */
    statusCode: text('status_code').notNull(),
    failureReason: text('failure_reason'),
    firstReportedAt: timestamp('first_reported_at', { withTimezone: true, mode: 'date' }).notNull(),
    reportedAt: timestamp('reported_at', { withTimezone: true, mode: 'date' }).notNull(),
    /** The number of distinct inbox rows that reached DR6 row 8 for this send. */
    reportCount: integer('report_count').notNull().default(1),
  },
  (t) => [
    primaryKey({ name: 'sms_send_deliveries_pk', columns: [t.sendKind, t.sendRowId] }),
    index('sms_send_deliveries_pariwar_idx').on(t.pariwarId),
    check('sms_send_deliveries_send_kind_check', sql`${t.sendKind} IN ('cr', 'ce', 'sn', 'pm')`),
    check('sms_send_deliveries_delivery_state_check', sql`${t.deliveryState} IN ('delivered', 'undelivered')`),
    check('sms_send_deliveries_request_id_check', sql`${t.requestId} ~ '^[A-Za-z0-9]{1,64}$'`),
    check('sms_send_deliveries_status_code_check', sql`${t.statusCode} ~ '^[0-9]{1,3}$'`),
    check(
      'sms_send_deliveries_failure_reason_check',
      sql`${t.failureReason} IS NULL OR (length(${t.failureReason}) <= 200 AND ${t.failureReason} !~ '[[:cntrl:]]' AND ${t.failureReason} !~ '[0-9]{7}')`,
    ),
    check('sms_send_deliveries_report_count_check', sql`${t.reportCount} >= 1`),
    check('sms_send_deliveries_reported_order_check', sql`${t.firstReportedAt} <= ${t.reportedAt}`),
  ],
);

export type SmsSendDeliveryRow = typeof smsSendDeliveries.$inferSelect;
