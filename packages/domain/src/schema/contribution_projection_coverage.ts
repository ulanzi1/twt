// `contribution_projection_coverage` table — Story 10.24 round-2 review substrate (Decision 2).
//
// ONE ROW PER PARIWAR, written by the BACKFILL. Its EXISTENCE is the claim "this Pariwar's contribution
// history has been projected"; `coveredFrom` is the instant from which that claim holds.
//
// ── Why this table exists: the sentinel was dead code without it ─────────────────────────────────
// Migration 0093 shipped the projections and a producer that reads them, but the producer could not
// distinguish "no rows because nothing happened" from "no rows because nothing was projected". Every
// `null` branch in `deriveContributionFacts` was structurally unreachable given the SQL feeding it, so
// `producer_unavailable` — the entire point of D6 and of [[CR-4.4-D3]]'s "an absent fact must be
// distinguishable from a clean-record member" — could never fire. An un-run backfill therefore rendered
// as an affirmative CLEAN RECORD for every member, on the surface that feeds suspension decisions.
//
// ⚖ Ratified 2026-08-05 by BigDev: "Unknown projection state must never fabricate a clean member."
//
// The consequence worth stating plainly: this makes the backfill a PRECONDITION for supplying
// contribution facts at all, not an optional repair path. Forgetting to run it degrades honestly (the
// whole trustee section darkens to `detection_unavailable`, per 10.11's deliberate strictness) instead
// of quietly reporting a clean membership.
//
// ── Why coverage is a LOWER bound only ───────────────────────────────────────────────────────────
// 0093's AFTER-INSERT trigger maintains the ledger live from the moment it was created; the backfill,
// which runs after, closes everything before it. The two meet with no hole, so there is nothing for an
// upper bound to express. `coveredFrom` is set to the Pariwar's earliest `events_log.occurred_at` (its
// genesis) precisely so historical replay — `getValidityAt(..., an already-frozen committed_at)` on the
// assignable-roster path — keeps working rather than degrading every past cycle to the sentinel.
//
// NOT an event-derived-state primitive and NOT a cache: operational provenance about a projection, with
// a single writer and no lifecycle. A plain row, mirroring the 0093 tables' posture.

import { pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';

import type { PariwarId } from '../ids/index.js';

export const contributionProjectionCoverage = pgTable('contribution_projection_coverage', {
  /** One row per tenant; the PK IS the scope. Branded. */
  pariwarId: uuid('pariwar_id').primaryKey().notNull().$type<PariwarId>(),
  /** The instant from which the projection is AUTHORITATIVE — the Pariwar's genesis after a full
   *  backfill, or the backfill instant when the Pariwar has no events at all. An `at` before this
   *  yields the sentinel: the projection makes no claim about that instant. */
  coveredFrom: timestamp('covered_from', { withTimezone: true, mode: 'date' }).notNull(),
  /** Provenance only — never read by the derivation. Lets an operator tell a fresh backfill from one
   *  that ran months ago. */
  backfilledAt: timestamp('backfilled_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});
