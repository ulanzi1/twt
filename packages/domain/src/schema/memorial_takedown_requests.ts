// `memorial_takedown_requests` + `memorial_takedown_outcomes` — the helpline's take-down of a family memorial at the nominee's
// request (Story 11b.4a, migration 0187; `#decision-2026-10-27-412` MP7 / MP8 / MP14).
//
//   · `memorial_takedown_requests` — one row per request the operator recorded AFTER calling the nominee back (MP7,
//     `verified_by = 'called_back'`). `submissionId` = the version SHOWN when it was recorded; `handoverNomineeRef` = the
//     nominee recorded on that version (a snapshot). `firstContactAt` is operator-entered (MP14 (b)); `receivedAt` the DB clock;
//     `dueAt = firstContactAt + 7 days` (stored). Openness is ⛔ not a column — a request is open while it has no outcome.
//   · `memorial_takedown_outcomes` — ONE per request (PK): `taken_down` · `kept` · `superseded`.
//
// APPEND-ONLY (⛔ no UPDATE, ⛔ no DELETE grant). ⛔ No Tier-1 column, ⛔ no family text: ids, timestamps, the enum and the
// operator's display snapshot. TENANT-ISOLATED; RLS in policies/memorial-takedown-rls.ts.

import { sql } from 'drizzle-orm';
import { check, foreignKey, index, pgEnum, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';

import type { PariwarId, PoolId, UserId } from '../ids/index.js';
import { MEMORIAL_TAKEDOWN_OUTCOMES } from '../memorial/vocab.js';
import { memorialSubmissions } from './memorial_submissions.js';

export const memorialTakedownOutcomeEnum = pgEnum('memorial_takedown_outcome', MEMORIAL_TAKEDOWN_OUTCOMES);

export const memorialTakedownRequests = pgTable(
  'memorial_takedown_requests',
  {
    requestId: uuid('request_id').defaultRandom().primaryKey(),
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),
    poolId: uuid('pool_id').notNull().$type<PoolId>(),
    submissionId: uuid('submission_id').notNull(),
    handoverNomineeRef: uuid('handover_nominee_ref').notNull(),
    verifiedBy: text('verified_by').notNull().$type<'called_back'>(),
    firstContactAt: timestamp('first_contact_at', { withTimezone: true, mode: 'date' }).notNull(),
    receivedAt: timestamp('received_at', { withTimezone: true, mode: 'date' }).notNull().default(sql`clock_timestamp()`),
    dueAt: timestamp('due_at', { withTimezone: true, mode: 'date' }).notNull(),
    actorId: uuid('actor_id').notNull().$type<UserId>(),
    actorDisplay: text('actor_display').notNull(),
  },
  (t) => [
    unique('memorial_takedown_requests_pariwar_request_uq').on(t.pariwarId, t.requestId),
    foreignKey({
      name: 'memorial_takedown_requests_submission_fk',
      columns: [t.pariwarId, t.submissionId],
      foreignColumns: [memorialSubmissions.pariwarId, memorialSubmissions.submissionId],
    }),
    foreignKey({
      name: 'memorial_takedown_requests_pool_submission_fk',
      columns: [t.poolId, t.submissionId],
      foreignColumns: [memorialSubmissions.poolId, memorialSubmissions.submissionId],
    }),
    check('memorial_takedown_requests_verified_by_check', sql`${t.verifiedBy} = 'called_back'`),
    check(
      'memorial_takedown_requests_first_contact_check',
      sql`${t.firstContactAt} <= ${t.receivedAt} AND ${t.firstContactAt} >= ${t.receivedAt} - interval '7 days'`,
    ),
    check('memorial_takedown_requests_due_check', sql`${t.dueAt} = ${t.firstContactAt} + interval '168 hours'`),
    check('memorial_takedown_requests_actor_display_check', sql`length(btrim(${t.actorDisplay})) > 0`),
    index('memorial_takedown_requests_pool_idx').on(t.pariwarId, t.poolId),
    index('memorial_takedown_requests_received_idx').on(t.pariwarId, t.receivedAt),
  ],
);

export type MemorialTakedownRequestRow = typeof memorialTakedownRequests.$inferSelect;
export type MemorialTakedownRequestInsert = typeof memorialTakedownRequests.$inferInsert;

export const memorialTakedownOutcomes = pgTable(
  'memorial_takedown_outcomes',
  {
    requestId: uuid('request_id').primaryKey(),
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),
    outcome: memorialTakedownOutcomeEnum('outcome').notNull(),
    decidedAt: timestamp('decided_at', { withTimezone: true, mode: 'date' }).notNull().default(sql`clock_timestamp()`),
    actorId: uuid('actor_id').notNull().$type<UserId>(),
    actorDisplay: text('actor_display').notNull(),
  },
  (t) => [
    foreignKey({
      name: 'memorial_takedown_outcomes_request_fk',
      columns: [t.pariwarId, t.requestId],
      foreignColumns: [memorialTakedownRequests.pariwarId, memorialTakedownRequests.requestId],
    }),
    check('memorial_takedown_outcomes_actor_display_check', sql`length(btrim(${t.actorDisplay})) > 0`),
  ],
);

export type MemorialTakedownOutcomeRow = typeof memorialTakedownOutcomes.$inferSelect;
