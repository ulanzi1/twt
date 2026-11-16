// `field_worker_ending_appeals` — Story 13.1f (decision `2026-11-16-464` AD7, AD8, AD9; the Panel's `-454` Q1 A). A worker who says an
// ending was unfair appeals by phone or in person; the officer who HEARS it records the appeal and its outcome — the Pariwar Admin, or
// the Trustee Panel when a Pariwar Admin ended the worker (the hearer is fixed AT THE ENDING, AD8). An allowed appeal undoes the
// ending in the same transaction (the epic text).
//
// The PROJECTION of the appeal's OWN event stream (`events_log.stream_id = appeal_id`, events `field_worker_ending_appeal.*`) — written
// ONLY by `field-worker/ending-appeal-project.ts` under `app.field_worker_ending_appeal_writer = 'on'` (migration 0207's guard trigger
// refuses every other write, any change to a final row, a write that leaves the row open, and an identity change). Hand-authored
// migration 0207; ⛔ `db:generate`. States, the hearer and the channel are TEXT with CHECKs (⛔ pg enums). ⛔ Name, mobile, code or
// free text (I6; 13.1 QE12).

import { sql } from 'drizzle-orm';
import { bigint, check, date, foreignKey, index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import type { FieldWorkerEndingAppealId, FieldWorkerId, PariwarId } from '../ids/index.js';
import { fieldWorkers } from './field_workers.js';

/** ⚠ LOCKSTEP with 0207's `field_worker_ending_appeals_state_check`. Open: `open`; the rest are final (AD7). */
export const FIELD_WORKER_ENDING_APPEAL_STATES = ['open', 'allowed', 'refused', 'withdrawn', 'superseded'] as const;
export type FieldWorkerEndingAppealState = (typeof FIELD_WORKER_ENDING_APPEAL_STATES)[number];

/** Who hears an appeal — fixed at the ending (AD8). ⚠ LOCKSTEP with 0207's `field_worker_ending_appeals_heard_by_check`. */
export const FIELD_WORKER_ENDING_APPEAL_HEARERS = ['pariwar_admin', 'trustee_panel'] as const;
export type FieldWorkerEndingAppealHearer = (typeof FIELD_WORKER_ENDING_APPEAL_HEARERS)[number];

/** How the worker appealed — `-454`: "by phone or in person". ⚠ LOCKSTEP with 0207's `field_worker_ending_appeals_received_via_check`. */
export const FIELD_WORKER_ENDING_APPEAL_CHANNELS = ['phone', 'in_person'] as const;
export type FieldWorkerEndingAppealChannel = (typeof FIELD_WORKER_ENDING_APPEAL_CHANNELS)[number];

/** The partial unique a second open appeal hits (I4) — mapped BY NAME to `FieldWorkerAppealOpenError`. */
export const FIELD_WORKER_ENDING_APPEAL_ONE_OPEN_CONSTRAINT = 'field_worker_ending_appeals_one_open_uq';

export const fieldWorkerEndingAppeals = pgTable(
  'field_worker_ending_appeals',
  {
    /** Caller-minted; also the appeal's `events_log` stream id (AD7). */
    appealId: uuid('appeal_id').primaryKey().$type<FieldWorkerEndingAppealId>(),
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),
    fieldWorkerId: uuid('field_worker_id').notNull().$type<FieldWorkerId>(),
    /** The `event_version` of the `field_worker.terminated` event appealed — ONE ending per appeal. */
    endingEventVersion: bigint('ending_event_version', { mode: 'number' }).notNull(),
    state: text('state').notNull().$type<FieldWorkerEndingAppealState>(),
    /** Copied from the ending's `appeal_heard_by` at lodging (AD8, AD17) — never recomputed. */
    heardBy: text('heard_by').notNull().$type<FieldWorkerEndingAppealHearer>(),
    /** The day the worker appealed, on the officer's word (`YYYY-MM-DD`, IST). */
    receivedOn: date('received_on', { mode: 'string' }).notNull(),
    receivedVia: text('received_via').notNull().$type<FieldWorkerEndingAppealChannel>(),
    /** The officer who recorded the lodging. */
    lodgedByUserId: uuid('lodged_by_user_id').notNull(),
    /** The officer who ENDED the worker — the terminated event's `events_log.actor_id`, copied at lodging (AD17). Never decides. */
    endedByUserId: uuid('ended_by_user_id').notNull(),
    /** The officer whose act closed the appeal (for `superseded`, the officer who undid the ending) — NULL iff open (CHECK). */
    decidedByUserId: uuid('decided_by_user_id'),
    /** The day it was decided / withdrawn / superseded (IST) — NULL iff open (CHECK). */
    decidedOn: date('decided_on', { mode: 'string' }),
    stateEventVersion: bigint('state_event_version', { mode: 'number' }).notNull(),
    /** The most recent act's audit line. */
    auditId: uuid('audit_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    foreignKey({
      name: 'field_worker_ending_appeals_worker_fk',
      columns: [t.pariwarId, t.fieldWorkerId],
      foreignColumns: [fieldWorkers.pariwarId, fieldWorkers.fieldWorkerId],
    }).onDelete('no action'),
    uniqueIndex(FIELD_WORKER_ENDING_APPEAL_ONE_OPEN_CONSTRAINT).on(t.pariwarId, t.fieldWorkerId).where(sql`"state" = 'open'`),
    index('field_worker_ending_appeals_pariwar_idx').on(t.pariwarId, t.createdAt.desc(), t.appealId.desc()),
    index('field_worker_ending_appeals_worker_idx').on(t.pariwarId, t.fieldWorkerId, t.createdAt.desc(), t.appealId.desc()),
    check('field_worker_ending_appeals_state_check', sql`${t.state} IN ('open', 'allowed', 'refused', 'withdrawn', 'superseded')`),
    check('field_worker_ending_appeals_heard_by_check', sql`${t.heardBy} IN ('pariwar_admin', 'trustee_panel')`),
    check('field_worker_ending_appeals_received_via_check', sql`${t.receivedVia} IN ('phone', 'in_person')`),
    check('field_worker_ending_appeals_ending_version_positive', sql`${t.endingEventVersion} > 1`),
    check('field_worker_ending_appeals_open_decided_on', sql`(${t.state} = 'open') = (${t.decidedOn} IS NULL)`),
    check('field_worker_ending_appeals_open_decided_by', sql`(${t.state} = 'open') = (${t.decidedByUserId} IS NULL)`),
    check('field_worker_ending_appeals_decided_after_received', sql`${t.decidedOn} IS NULL OR ${t.decidedOn} >= ${t.receivedOn}`),
    check(
      'field_worker_ending_appeals_decider_not_ender',
      sql`${t.state} NOT IN ('allowed', 'refused', 'withdrawn') OR ${t.decidedByUserId} <> ${t.endedByUserId}`,
    ),
  ],
);

export type FieldWorkerEndingAppealRow = typeof fieldWorkerEndingAppeals.$inferSelect;
