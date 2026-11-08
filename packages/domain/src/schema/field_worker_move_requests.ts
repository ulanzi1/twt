// `field_worker_move_requests` — Story 13.1d (decision `2026-11-08-458` AD2, AD3, AD11; the Panel's `-443` Q1 A). A District Admin
// at EITHER end of a field worker's move asks the other to take on or release the worker; the other accepts or refuses with a reason;
// 7 days unanswered goes to the Pariwar Admin, never accepted by default; a direct move or an ending supersedes it.
//
// The PROJECTION of the request's OWN event stream (`events_log.stream_id = move_request_id`, events `field_worker_move_request.*`) —
// written ONLY by `field-worker/move-request-project.ts` under `app.field_worker_move_request_writer = 'on'` (migration 0205's guard
// trigger refuses every other write, any change to a final row, and an escalation cause changed once written). Hand-authored
// migration 0205; ⛔ `db:generate`. States, reasons and causes are TEXT with CHECKs (⛔ pg enums). ⛔ Name, mobile or code (I6).

import { sql } from 'drizzle-orm';
import { bigint, check, foreignKey, index, pgTable, text, timestamp, unique, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import type { FieldWorkerId, FieldWorkerMoveRequestId, PariwarId } from '../ids/index.js';
import { fieldWorkers } from './field_workers.js';

/** ⚠ LOCKSTEP with 0205's `field_worker_move_requests_state_check`. Open: `pending`, `escalated`; the rest are final (AD3). */
export const FIELD_WORKER_MOVE_REQUEST_STATES = ['pending', 'escalated', 'accepted', 'refused', 'withdrawn', 'closed', 'superseded'] as const;
export type FieldWorkerMoveRequestState = (typeof FIELD_WORKER_MOVE_REQUEST_STATES)[number];

/** The two OPEN states — the partial unique `field_worker_move_requests_one_open_uq` covers exactly these (I4). */
export const FIELD_WORKER_MOVE_REQUEST_OPEN_STATES = ['pending', 'escalated'] as const satisfies readonly FieldWorkerMoveRequestState[];

/**
 * The refusal list (AD7) — never free text. ⚠ LOCKSTEP with 0205's two refusal-reason CHECKs; RE-DECLARED in `@twt/contracts` (the
 * bundle boundary) with a sync test.
 */
export const FIELD_WORKER_MOVE_REFUSAL_REASONS = ['no_capacity', 'work_not_needed_here', 'request_incomplete', 'other'] as const;
export type FieldWorkerMoveRefusalReason = (typeof FIELD_WORKER_MOVE_REFUSAL_REASONS)[number];

/** Why a request went to the Pariwar Admin (AD8). ⚠ LOCKSTEP with 0205's `field_worker_move_requests_escalation_cause_check`. */
export const FIELD_WORKER_MOVE_ESCALATION_CAUSES = ['unanswered_7_days', 'no_counterpart_officer'] as const;
export type FieldWorkerMoveEscalationCause = (typeof FIELD_WORKER_MOVE_ESCALATION_CAUSES)[number];

/** What ended an open request without an answer (AD3). ⚠ LOCKSTEP with 0205's `field_worker_move_requests_supersede_cause_check`. */
export const FIELD_WORKER_MOVE_SUPERSEDE_CAUSES = ['worker_moved', 'worker_ended'] as const;
export type FieldWorkerMoveSupersedeCause = (typeof FIELD_WORKER_MOVE_SUPERSEDE_CAUSES)[number];

/** Which end the opener holds (AD3); the counterpart is the other. */
export const FIELD_WORKER_MOVE_OPENED_AT_ENDS = ['from', 'to'] as const;
export type FieldWorkerMoveOpenedAtEnd = (typeof FIELD_WORKER_MOVE_OPENED_AT_ENDS)[number];

/** The partial unique a second open request hits (AD3) — mapped BY NAME to `FieldWorkerMoveRequestOpenError`. */
export const FIELD_WORKER_MOVE_REQUEST_ONE_OPEN_CONSTRAINT = 'field_worker_move_requests_one_open_uq';

export const fieldWorkerMoveRequests = pgTable(
  'field_worker_move_requests',
  {
    /** Caller-minted; also the request's `events_log` stream id (AD2). */
    moveRequestId: uuid('move_request_id').primaryKey().$type<FieldWorkerMoveRequestId>(),
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),
    fieldWorkerId: uuid('field_worker_id').notNull().$type<FieldWorkerId>(),
    /** The worker's district when the request was opened — the move's source. */
    fromDistrict: text('from_district').notNull(),
    toDistrict: text('to_district').notNull(),
    openedAtEnd: text('opened_at_end').notNull().$type<FieldWorkerMoveOpenedAtEnd>(),
    /** The district whose District Admin answers — the end the opener does NOT hold (CHECK). */
    counterpartDistrict: text('counterpart_district').notNull(),
    state: text('state').notNull().$type<FieldWorkerMoveRequestState>(),
    /** Set IFF `refused`. */
    refusalReason: text('refusal_reason').$type<FieldWorkerMoveRefusalReason>(),
    /** Written once on escalation, never cleared (AD11). */
    escalationCause: text('escalation_cause').$type<FieldWorkerMoveEscalationCause>(),
    /** Set IFF `superseded`. */
    supersedeCause: text('supersede_cause').$type<FieldWorkerMoveSupersedeCause>(),
    /** The opening officer's `users` id — the only one who may withdraw (AD6). */
    openedBy: uuid('opened_by').notNull(),
    openedAt: timestamp('opened_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    /** The officer whose act ENDED the request, and when — both NULL while open (CHECK). */
    answeredBy: uuid('answered_by'),
    answeredAt: timestamp('answered_at', { withTimezone: true, mode: 'date' }),
    /** The `field_worker.posted` event the acceptance wrote (AD4) — set IFF `accepted`. */
    postedEventId: uuid('posted_event_id'),
    stateEventVersion: bigint('state_event_version', { mode: 'number' }).notNull(),
    /** The most recent act's audit line. */
    auditId: uuid('audit_id').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    unique('field_worker_move_requests_pariwar_request_uq').on(t.pariwarId, t.moveRequestId),
    foreignKey({
      name: 'field_worker_move_requests_worker_fk',
      columns: [t.pariwarId, t.fieldWorkerId],
      foreignColumns: [fieldWorkers.pariwarId, fieldWorkers.fieldWorkerId],
    }).onDelete('no action'),
    uniqueIndex(FIELD_WORKER_MOVE_REQUEST_ONE_OPEN_CONSTRAINT)
      .on(t.pariwarId, t.fieldWorkerId)
      .where(sql`"state" IN ('pending', 'escalated')`),
    index('field_worker_move_requests_from_idx').on(t.pariwarId, t.fromDistrict, t.openedAt.desc(), t.moveRequestId.desc()),
    index('field_worker_move_requests_to_idx').on(t.pariwarId, t.toDistrict, t.openedAt.desc(), t.moveRequestId.desc()),
    index('field_worker_move_requests_pariwar_idx').on(t.pariwarId, t.openedAt.desc(), t.moveRequestId.desc()),
    index('field_worker_move_requests_pending_idx').on(t.openedAt, t.moveRequestId).where(sql`"state" = 'pending'`),
    check('field_worker_move_requests_districts_nonblank', sql`length(btrim(${t.fromDistrict})) > 0 AND length(btrim(${t.toDistrict})) > 0`),
    check('field_worker_move_requests_districts_differ', sql`${t.fromDistrict} <> ${t.toDistrict}`),
    check('field_worker_move_requests_opened_at_end_check', sql`${t.openedAtEnd} IN ('from', 'to')`),
    check(
      'field_worker_move_requests_counterpart_check',
      sql`${t.counterpartDistrict} = CASE ${t.openedAtEnd} WHEN 'from' THEN ${t.toDistrict} ELSE ${t.fromDistrict} END`,
    ),
    check(
      'field_worker_move_requests_state_check',
      sql`${t.state} IN ('pending', 'escalated', 'accepted', 'refused', 'withdrawn', 'closed', 'superseded')`,
    ),
    check(
      'field_worker_move_requests_refusal_reason_check',
      sql`${t.refusalReason} IS NULL OR ${t.refusalReason} IN ('no_capacity', 'work_not_needed_here', 'request_incomplete', 'other')`,
    ),
    check('field_worker_move_requests_refusal_pair', sql`(${t.state} = 'refused') = (${t.refusalReason} IS NOT NULL)`),
    check(
      'field_worker_move_requests_escalation_cause_check',
      sql`${t.escalationCause} IS NULL OR ${t.escalationCause} IN ('unanswered_7_days', 'no_counterpart_officer')`,
    ),
    check(
      'field_worker_move_requests_escalation_cause_state',
      sql`(${t.state} NOT IN ('escalated', 'closed') OR ${t.escalationCause} IS NOT NULL) AND (${t.state} NOT IN ('pending', 'accepted', 'refused') OR ${t.escalationCause} IS NULL)`,
    ),
    check(
      'field_worker_move_requests_supersede_cause_check',
      sql`${t.supersedeCause} IS NULL OR ${t.supersedeCause} IN ('worker_moved', 'worker_ended')`,
    ),
    check('field_worker_move_requests_supersede_pair', sql`(${t.state} = 'superseded') = (${t.supersedeCause} IS NOT NULL)`),
    check(
      'field_worker_move_requests_answered_pair',
      sql`(${t.state} IN ('pending', 'escalated')) = (${t.answeredBy} IS NULL) AND (${t.answeredBy} IS NULL) = (${t.answeredAt} IS NULL)`,
    ),
    check('field_worker_move_requests_posted_event_pair', sql`(${t.state} = 'accepted') = (${t.postedEventId} IS NOT NULL)`),
  ],
);

export type FieldWorkerMoveRequestRow = typeof fieldWorkerMoveRequests.$inferSelect;
