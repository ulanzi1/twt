// `cohort_invalidation_epochs` table — Story 4.8 (Task 1; AC1a, AC3, D2-A, D4-A).
//
// One monotonically-increasing epoch per `(pariwar_id, niyamavali_version)` cohort. The
// `member_validity_cache` key includes `cohort_invalidation_epoch`, so BUMPING the epoch (in the SAME
// transaction as the triggering write — D2-A) means every subsequent read for that cohort resolves a NEW
// key → guaranteed cache miss → recompute. Invalidation is therefore SYNCHRONOUS the instant the bump
// commits — stale validity is structurally impossible for evented rule changes, with NO pg-boss / message
// -bus delivery-timing dependency (the AC2(a) "broadcast delivery delayed" window is unreachable here).
//
// Two write triggers (validity-cache/epoch.ts):
//   · Amendment publish (AC1a / D4-A) — a conservative WHOLE-cohort bump on ANY publish. Story 2.4's
//     `affectedMemberScope` is read + recorded for the (deferred) narrowing optimization, NEVER gated on
//     for correctness (a narrowing bug under-invalidates = trust corruption; the whole-cohort bump is
//     strictly safer, and AC2(b) "scope confidence insufficient → fall back" endorses it).
//   · Trustee "invalidate all" (AC1c / AC3) — an admin-triggered bump of the affected cohort (or every
//     cohort for a Pariwar). Subsequent calls hit direct recomputation until the cache repopulates
//     organically; the performance dip during that window is acceptable (the alternative — serving stale
//     validity — is not).
//
// ── `niyamavali_version` is a forward seam, not yet a live dimension ──────────────────────────────────
// There is no per-Pariwar Niyamavali version counter today (the engine's `niyamavaliVersionHash` is a
// per-EVALUATION hash over resolved clause_version_ids — not a cheap cohort key). v1 therefore uses ONE
// cohort row per Pariwar under the `CURRENT_NIYAMAVALI_VERSION` sentinel and relies on the EPOCH for
// invalidation. When real per-Pariwar niyamavali versioning lands, this dimension activates with zero
// key-shape change. Naming discipline: DB columns snake_case, TS fields camelCase.

import { bigint, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import type { PariwarId } from '../ids/index.js';

export const cohortInvalidationEpochs = pgTable(
  'cohort_invalidation_epochs',
  {
    // Multi-tenant scope (architecture §1.2) + the cohort's first key dimension. RLS predicate column.
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),

    // The cohort's ruleset-generation dimension. v1 sentinel (CURRENT_NIYAMAVALI_VERSION); a forward
    // seam for real per-Pariwar niyamavali versioning (see header).
    niyamavaliVersion: text('niyamavali_version').notNull(),

    // The invalidation generation. Bumped (+1) transactionally on amendment publish + trustee
    // invalidate-all. An absent row ≡ epoch 0 (a never-invalidated cohort).
    epoch: bigint('epoch', { mode: 'number' }).notNull().default(0),

    // Last-bump instant (observability only — DB-authoritative).
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.pariwarId, t.niyamavaliVersion] })],
);

export type CohortInvalidationEpochRow = typeof cohortInvalidationEpochs.$inferSelect;
export type CohortInvalidationEpochInsert = typeof cohortInvalidationEpochs.$inferInsert;
