// `attribution_code_allocation_flags` — the durable "flagged for trustee review" record of an attribution-code allocation that
// found no free code (Story 13.2, AC2; AT7). Migration 0199 (hand-authored — GRANT, policies, FORCE RLS, CHECKs, triggers).
//
// Written by `attributionCode.flagAllocationExhausted` in its OWN committed transaction (the API door's
// `flagAllocationExhaustedForRequest` — the registration that failed rolled back, so a flag inside it would vanish). ⛔
// `field_worker_id`: the worker row rolled back too, so that id names nothing. `actor_id` is the authenticated admin who pressed
// "Add Field Worker"; `actor_display` is the Story 6.11 R5 snapshot of their `users.display_name`, resolved server-side at
// write (⛔ fallback to email / id / role) — in from the start, because an append-only table can never backfill it. Story 13.4
// renders `actor_display` to trustees (C3). APPEND-ONLY for every role. TENANT-ISOLATED; RLS in
// policies/attribution-code-allocation-flags-rls.ts.

import { sql } from 'drizzle-orm';
import { index, pgTable, smallint, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import type { AttributionCodeFlagId, PariwarId, UserId } from '../ids/index.js';

export const attributionCodeAllocationFlags = pgTable(
  'attribution_code_allocation_flags',
  {
    flagId: uuid('flag_id').defaultRandom().primaryKey().$type<AttributionCodeFlagId>(),
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),
    // How many draws were tried, 1..32 (0199 CHECK).
    attempts: smallint('attempts').notNull(),
    // The authenticated admin. ⛔ FK (the 12.2 `created_by_actor_id` posture).
    actorId: uuid('actor_id').notNull().$type<UserId>(),
    // Story 6.11 R5 display-name snapshot; non-blank (0199 CHECK).
    actorDisplay: text('actor_display').notNull(),
    flaggedAt: timestamp('flagged_at', { withTimezone: true, mode: 'date' }).notNull().default(sql`clock_timestamp()`),
  },
  (t) => [
    index('attribution_code_allocation_flags_pariwar_flagged_idx').on(t.pariwarId, t.flaggedAt),
    // + the SQL-only CHECKs `…_attempts_check` / `…_actor_display_check` and the triggers `…_no_update_delete` /
    // `…_no_truncate` (0199).
  ],
);

export type AttributionCodeAllocationFlagRow = typeof attributionCodeAllocationFlags.$inferSelect;
