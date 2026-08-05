// `member_contribution_ledger` table — Story 10.24 substrate (Task 2; D1, AC1).
//
// ONE ROW PER `contribution.confirmed` EVENT, with its reversal folded in. This is the projection the
// `contribution.*` fact producer reads — the thing Story 4.2 deferred to "Epic 8/9" and neither epic
// built ([[project_r7_fact_producer_unbuilt]]).
//
// ── Why a projection at all, rather than reading events_log per evaluation (AC1) ─────────────────
// FR-12A commits p95 < 200ms @ 4L. No existing read is a viable source, verified rather than assumed:
//   · `listMemberContributionHistory` anchors on `contribution.utr-attested` (YELLOW — a member's
//     CLAIM, not a confirmation) and caps BOTH its queries at 500 rows; a lifetime `total_count` from
//     it would be wrong for a high-count member and blind to any confirmation without an attestation.
//   · `listConfirmedContributorsForPool` / `hasConfirmedContribution` are POOL-scoped — the wrong axis.
//   · The only JSONB payload index that exists is `contribution_utr_attested_member_idx` (migration
//     0081), PARTIAL on `event_type = 'contribution.utr-attested'` — it does not serve a
//     `contribution.confirmed` member-scoped lookup, which is today a full-tenant sequential scan.
//
// ── AS-OF correctness is the load-bearing property, not an optimization (D1) ─────────────────────
// `reversed_at` is NULLABLE AND TIME-BEARING, never a boolean flag: a reversal that happened AFTER
// `at` must not apply AT `at`. `apps/jobs/src/assignable-roster.ts` calls `getValidityAt(..., committedAt)`
// for every member of every spawning cycle, and Epic 4 commits "Replayable for audit" (prd.md:425) —
// a now-only aggregate would make every R7 finding non-reproducible on the surface that feeds a
// SUSPENSION decision. Hence row-level + indexed aggregate, never one aggregate row per member.
//
// ── Maintenance: an events_log AFTER-INSERT trigger (D3; migration 0093) ─────────────────────────
// The projection rides the SAME tx as the event append, covers ANY future writer (including the
// backfill and any replay/repair path), and cannot be forgotten — which matters more here than
// elsewhere, since the failure this story exists to fix is "a producer nobody owned". The PK is the
// confirmation's own event id, so the whole thing is idempotent by construction.
//
// A PLAIN append projection — NOT an event-derived state cache, so there is NO write-rejection trigger
// (contrast `pools.current_state` / `members.state`). Mirrors `pool_snapshots`'s posture.
//
// Naming discipline (architecture line 3663-3677): DB columns snake_case, TS fields camelCase, table
// snake_case-plural.

import { index, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';

import type { MemberId, PariwarId, PoolId } from '../ids/index.js';

export const memberContributionLedger = pgTable(
  'member_contribution_ledger',
  {
    // The `contribution.confirmed` event id — the PK. Idempotency BY CONSTRUCTION: a replayed append,
    // a retried trigger, and a re-run backfill all collide here and no-op (ON CONFLICT DO NOTHING).
    confirmedEventId: uuid('confirmed_event_id').primaryKey(),

    // Multi-tenant scope (architecture §1.2). RLS predicate column; branded. unFK'd (pool-substrate posture).
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),

    // The CONTRIBUTING member, from `payload->>'memberId'` (`CONFIRMED_PAYLOAD_MEMBER_KEY`).
    memberId: uuid('member_id').notNull().$type<MemberId>(),

    // The pool the confirmation belongs to, from `payload->>'poolId'` (`CONFIRMED_PAYLOAD_POOL_KEY`).
    // unFK'd — the ledger must keep projecting an event even if the pool is archived to the cold tier.
    poolId: uuid('pool_id').notNull().$type<PoolId>(),

    // The confirmation's `occurred_at` — the as-of anchor (`confirmed_at <= at`).
    confirmedAt: timestamp('confirmed_at', { withTimezone: true, mode: 'date' }).notNull(),

    // The `reconciliation.confirmation-reversed` `occurred_at`, or NULL. TIME-BEARING by design (see
    // the header): live-at-`at` is `reversed_at IS NULL OR reversed_at > at`, never `NOT reversed`.
    reversedAt: timestamp('reversed_at', { withTimezone: true, mode: 'date' }),

    // Which reversal event walked this confirmation back — provenance only.
    reversedByEventId: uuid('reversed_by_event_id'),
  },
  (t) => [
    // `total_count(at)` (COUNT) + `months_since_last(at)` (MAX) are both member-scoped aggregates over
    // `confirmed_at`; DESC matches the MAX probe.
    index('member_contribution_ledger_member_idx').on(t.pariwarId, t.memberId, t.confirmedAt.desc()),
    // The `skips_current_year` join key — "a live confirmation for THIS pool at `at`?".
    index('member_contribution_ledger_member_pool_idx').on(t.pariwarId, t.memberId, t.poolId),
  ],
);

export type MemberContributionLedgerRow = typeof memberContributionLedger.$inferSelect;
