// `field_worker_notices` — Story 13.1d (decision `2026-11-08-458` AD9; the Panel's `-443` Q1 A: "Both District Admins are told by
// email and in the admin console, including when the Pariwar Admin moves a worker."). ONE row per notice and recipient, written in the
// deciding transaction by `field-worker/notices.ts`. CHANNEL-NEUTRAL: the in-app list reads it now; row `13-1g`'s email sends it later.
//
// ⛔ Name, mobile or code (I6) — ids, districts and a refusal reason only. `twt_app` INSERTs the identity columns and UPDATEs `seen_at`
// ONLY (column grants, migration 0205); a trigger refuses any other change and a second `seen_at`. RLS is by Pariwar ONLY: the read and
// the seen mark filter `recipient_user_id = <actor>` in SQL (the scope transaction carries no actor setting).

import { sql } from 'drizzle-orm';
import { check, foreignKey, index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import type { FieldWorkerId, FieldWorkerMoveRequestId, FieldWorkerNoticeId, PariwarId } from '../ids/index.js';
import { fieldWorkerMoveRequests, type FieldWorkerMoveRefusalReason } from './field_worker_move_requests.js';
import { fieldWorkers } from './field_workers.js';

/**
 * What an officer is told (AD9). ⚠ LOCKSTEP with 0205's `field_worker_notices_kind_check`; RE-DECLARED in `@twt/contracts` with a sync
 * test. Withdraw and close write none (the work list shows the state).
 */
export const FIELD_WORKER_NOTICE_KINDS = [
  'move_request_opened',
  'move_request_accepted',
  'move_request_refused',
  'move_request_refused_admin',
  'move_request_escalated',
  'move_request_superseded',
  'moved_by_pariwar_admin',
] as const;
export type FieldWorkerNoticeKind = (typeof FIELD_WORKER_NOTICE_KINDS)[number];

export const fieldWorkerNotices = pgTable(
  'field_worker_notices',
  {
    noticeId: uuid('notice_id').defaultRandom().primaryKey().$type<FieldWorkerNoticeId>(),
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),
    /** The officer told — a `users` id (⛔ FK: a notice outlives a revoked grant). */
    recipientUserId: uuid('recipient_user_id').notNull(),
    kind: text('kind').notNull().$type<FieldWorkerNoticeKind>(),
    fieldWorkerId: uuid('field_worker_id').notNull().$type<FieldWorkerId>(),
    /** The request it is about; NULL only for a direct move that superseded none. */
    moveRequestId: uuid('move_request_id').$type<FieldWorkerMoveRequestId>(),
    fromDistrict: text('from_district').notNull(),
    toDistrict: text('to_district').notNull(),
    /** Set IFF `move_request_refused` or `move_request_refused_admin` (the Pariwar Admins read the reason too; decision `2026-11-10-461` item 2). */
    refusalReason: text('refusal_reason').$type<FieldWorkerMoveRefusalReason>(),
    /** `clock_timestamp()` — two notices of one transaction do not tie on the keyset ([[project_db_clock_ordering_tests_tie]]). */
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().default(sql`clock_timestamp()`),
    /** Set once, when the officer's screen showed it. */
    seenAt: timestamp('seen_at', { withTimezone: true, mode: 'date' }),
  },
  (t) => [
    foreignKey({
      name: 'field_worker_notices_worker_fk',
      columns: [t.pariwarId, t.fieldWorkerId],
      foreignColumns: [fieldWorkers.pariwarId, fieldWorkers.fieldWorkerId],
    }).onDelete('no action'),
    foreignKey({
      name: 'field_worker_notices_request_fk',
      columns: [t.pariwarId, t.moveRequestId],
      foreignColumns: [fieldWorkerMoveRequests.pariwarId, fieldWorkerMoveRequests.moveRequestId],
    }).onDelete('no action'),
    index('field_worker_notices_recipient_idx').on(t.pariwarId, t.recipientUserId, t.createdAt.desc(), t.noticeId.desc()),
    // One notice per request, kind and recipient — the writer merges recipients in memory, this is the DB's backstop (code review CR7). A direct
    // move that superseded no request names none, so it is not covered.
    uniqueIndex('field_worker_notices_once_per_act_uq')
      .on(t.pariwarId, t.moveRequestId, t.kind, t.recipientUserId)
      .where(sql`"move_request_id" IS NOT NULL`),
    check(
      'field_worker_notices_kind_check',
      sql`${t.kind} IN ('move_request_opened', 'move_request_accepted', 'move_request_refused', 'move_request_refused_admin', 'move_request_escalated', 'move_request_superseded', 'moved_by_pariwar_admin')`,
    ),
    check('field_worker_notices_request_pair', sql`${t.kind} = 'moved_by_pariwar_admin' OR ${t.moveRequestId} IS NOT NULL`),
    check(
      'field_worker_notices_refusal_reason_check',
      sql`${t.refusalReason} IS NULL OR ${t.refusalReason} IN ('no_capacity', 'work_not_needed_here', 'request_incomplete', 'other')`,
    ),
    check('field_worker_notices_refusal_pair', sql`(${t.kind} IN ('move_request_refused', 'move_request_refused_admin')) = (${t.refusalReason} IS NOT NULL)`),
    check(
      'field_worker_notices_districts_check',
      sql`length(btrim(${t.fromDistrict})) > 0 AND length(btrim(${t.toDistrict})) > 0 AND ${t.fromDistrict} <> ${t.toDistrict}`,
    ),
  ],
);

export type FieldWorkerNoticeRow = typeof fieldWorkerNotices.$inferSelect;
