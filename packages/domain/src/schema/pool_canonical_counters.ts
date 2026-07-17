// `pool_canonical_counters` table — Story 7.2 (Task 3; AC1).
//
// One monotonic sequence counter per `(pariwar_id, period)`, where `period` is the
// cycle-freeze month `YYYY-MM`. It is the allocation mechanism behind the canonical pool
// identifier `P-YYYY-MM-###`: `pool/naming.ts` bumps this row (atomically, in the
// CALLER's transaction) and formats the reserved sequences into identifiers.
//
// ── Why a counter table (the cohort_invalidation_epochs precedent) ────────────
// AC1 requires allocation to be transactional AND race-safe. A single
// `INSERT … ON CONFLICT DO UPDATE SET next_sequence = next_sequence + $count RETURNING`
// gives both in one statement: a concurrent allocator BLOCKS on this row's lock until the
// first COMMITs, then reads the bumped value, so both walk away with DISJOINT contiguous
// ranges and neither fails.
//
// The considered alternative — deriving the counter from `MAX(sequence)` over the `pools`
// rows of that month — was REJECTED (see pool/naming.ts for the full rationale):
// `SELECT … FOR UPDATE` locks only rows that ALREADY exist, so two allocators racing on a
// fresh month both read NULL and both pick `001`, turning the 7.1 unique index from a
// backstop into the primary failure path; it would also mean parsing the sequence back
// out of a per-Pariwar-CONFIGURABLE format string (coupling the counter to the grammar),
// and it would recycle sequence numbers if a pool row were ever removed. The unique index
// `pools_pariwar_canonical_identifier_uq` stays as the structural backstop.
//
// ── Gaps are acceptable; collisions are not ───────────────────────────────────
// The counter rides the caller's transaction, so a rolled-back spawn releases its
// sequences (no gap). A COMMITTED bump whose pools were later removed would leave a gap —
// deliberately: an identifier is an audit key, and re-issuing one that ever appeared in an
// audit line or a regulator export is strictly worse than a hole in the numbering.
//
// ── period is TEXT `YYYY-MM`, not a date ──────────────────────────────────────
// The counter's partition IS the identifier's month field — the same string the formatter
// renders. Storing it as the rendered text keeps the key and the identifier structurally
// impossible to disagree; a `date` would need a truncation convention on both sides.
//
// Naming discipline per architecture L3663-3677: DB columns snake_case, TS fields
// camelCase, table snake_case-plural.

import { check, integer, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

import type { PariwarId } from '../ids/index.js';

export const poolCanonicalCounters = pgTable(
  'pool_canonical_counters',
  {
    // Multi-tenant scope (architecture §1.2) + the counter's first key dimension. RLS
    // predicate column; unFK'd (the pre-Epic-3 posture — mirrors pools.pariwar_id).
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),

    // The cycle-freeze month, `YYYY-MM` (Latin numerals — Story 1.17: an operational key).
    // The `###` sequence resets per (pariwar, period): the UX example `P-2026-05-001`
    // shows `001` as that month's first pool.
    period: text('period').notNull(),

    // The NEXT free sequence for this partition. `1` = no pool allocated yet this month,
    // so the first allocation hands out `001` and leaves `2` here. An absent row ≡ 1
    // (the UPSERT inserts on the first bump — the bumpCohortEpoch shape).
    nextSequence: integer('next_sequence').notNull().default(1),

    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.pariwarId, t.period] }),
    // `next_sequence` is always >= 1 by construction (the allocator only ever increases it
    // by a positive `count`) — this is defense-in-depth, the `pool_names.position_in_ordered_list
    // >= 0` posture, in case a future write path bypasses the allocator.
    check('pool_canonical_counters_next_sequence_positive_ck', sql`${t.nextSequence} >= 1`),
  ],
);

export type PoolCanonicalCounterRow = typeof poolCanonicalCounters.$inferSelect;
export type PoolCanonicalCounterInsert = typeof poolCanonicalCounters.$inferInsert;
