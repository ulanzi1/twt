// `member_daily_counters` + `pariwar_daily_counters` — the IST-day counters that bound contact matching and naming
// (Story 6.36b, migration 0162; 6.36a SW12: *"limits stop anyone using it to test numbers in bulk"*, `-310` CF5 A).
//
// The `sms_rate_buckets` atomic-upsert shape (0049): `INSERT … ON CONFLICT … DO UPDATE SET count = count + $n WHERE
// count + $n <= $cap RETURNING count` — ⛔ no row returned ⇒ refused. Keyed by the IST DAY (`Asia/Kolkata`). The member's
// rolling 30-day numbers cap SUMS `contact_match_numbers` over the last 30 IST days under the namer's advisory lock.
// Charged in a short transaction BEFORE any HMAC (a refused request costs ⛔ no KMS call). Counts only — ⛔ no number.
// RLS in `policies/member-daily-counters-rls.ts`.

import { date, integer, pgTable, primaryKey, text, uuid } from 'drizzle-orm/pg-core';

import type { MemberId, PariwarId } from '../ids/index.js';
import { members } from './members.js';

/** The member's counters. ⚠ LOCKSTEP with 0162's `member_daily_counters_counter_check`. */
export const MEMBER_DAILY_COUNTERS = ['contact_match_requests', 'contact_match_numbers', 'known_people_ask'] as const;
export type MemberDailyCounter = (typeof MEMBER_DAILY_COUNTERS)[number];

/** The Pariwar's counters. ⚠ LOCKSTEP with 0162's `pariwar_daily_counters_counter_check`. */
export const PARIWAR_DAILY_COUNTERS = ['contact_match_numbers'] as const;
export type PariwarDailyCounter = (typeof PARIWAR_DAILY_COUNTERS)[number];

export const memberDailyCounters = pgTable(
  'member_daily_counters',
  {
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),
    memberId: uuid('member_id')
      .notNull()
      .$type<MemberId>()
      .references(() => members.memberId, { onDelete: 'cascade' }),
    counter: text('counter').notNull().$type<MemberDailyCounter>(),
    /** The IST day (`Asia/Kolkata`) — ⛔ never the UTC date. */
    day: date('day', { mode: 'string' }).notNull(),
    count: integer('count').notNull(),
  },
  (t) => [primaryKey({ name: 'member_daily_counters_pk', columns: [t.pariwarId, t.memberId, t.counter, t.day] })],
);

export const pariwarDailyCounters = pgTable(
  'pariwar_daily_counters',
  {
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),
    counter: text('counter').notNull().$type<PariwarDailyCounter>(),
    day: date('day', { mode: 'string' }).notNull(),
    count: integer('count').notNull(),
  },
  (t) => [primaryKey({ name: 'pariwar_daily_counters_pk', columns: [t.pariwarId, t.counter, t.day] })],
);

export type MemberDailyCounterRow = typeof memberDailyCounters.$inferSelect;
export type PariwarDailyCounterRow = typeof pariwarDailyCounters.$inferSelect;
