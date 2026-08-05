// `member_pool_assignments` table — Story 10.24 substrate (Task 2; D1, AC4).
//
// ONE ROW PER (member, pool) AT FREEZE — the member↔pool assignment index that makes
// `skips_current_year` answerable as a bounded aggregate instead of a JSONB scan over every
// `pool_snapshots` row in the Pariwar.
//
// ── The source of truth is the SNAPSHOT, never a recompute (AC4) ─────────────────────────────────
// Rows are written from the SAME `memberAssignments` value that `serializePoolSnapshot` receives in
// `pool/spawn.ts` — the persisted truth Story 7.6 already reads for VPA resolution. NEVER a naive
// re-run of `assignMembersToPools`: that would re-derive the assignment algorithm outside its version
// pin and could silently disagree with the frozen snapshot the money actually followed.
//
// ── Written by an EXPLICIT domain writer, NOT a trigger — the deliberate asymmetry (D3) ──────────
// Its sibling `member_contribution_ledger` is trigger-maintained. This one is not, and the difference
// is intentional: a trigger on `pool_snapshots` would expand a JSONB array of up to 4L/N member ids
// inside the spawn transaction, un-instrumented, inside Story 7.9's <60s envelope. So the write lives
// beside `db.insert(poolSnapshots)` in the code that already owns that budget — ONE bulk insert,
// measurable, never a per-member INSERT in a loop (AC7).
//
// ⚠ The mechanism is an implementation detail; the PROJECTED STATE is the contract. The difference
// between the two mechanisms must be WHERE the write is invoked and nothing else — atomicity,
// idempotency, replay equivalence and ordering-independence are asserted IDENTICALLY for both by ONE
// shared invariant test body (tests/integration/contribution/projection-equivalence.spec.ts). A future
// author adding a third projection inherits that obligation, not merely the precedent.
//
// A PLAIN append projection — no write-rejection trigger (mirrors `pool_snapshots`).

import { index, pgTable, primaryKey, timestamp, uuid } from 'drizzle-orm/pg-core';

import type { CycleFreezeCommitId, MemberId, PariwarId, PoolId } from '../ids/index.js';

export const memberPoolAssignments = pgTable(
  'member_pool_assignments',
  {
    // The pool the member was assigned to at freeze. unFK'd (cold-tier archival, as with the ledger).
    poolId: uuid('pool_id').notNull().$type<PoolId>(),

    // The assigned member.
    memberId: uuid('member_id').notNull().$type<MemberId>(),

    // Multi-tenant scope (architecture §1.2). RLS predicate column; branded.
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),

    // The cycle the pool belongs to — `CycleFreezeCommitId`, unFK'd (the pool substrate's posture,
    // [[project_pool_primitive_substrate]]). Joined to `alerts.cycle_id` (UNIQUE, migration 0078) to
    // reach the cycle's alert stream for the "closed by `at`" test (AC4).
    cycleId: uuid('cycle_id').notNull().$type<CycleFreezeCommitId>(),

    // The cycle-freeze `committed_at` — the assignment INSTANT, never the spawn wall-clock. This is
    // what makes the current-year window replay-correct at a historical `at`.
    assignedAt: timestamp('assigned_at', { withTimezone: true, mode: 'date' }).notNull(),
  },
  (t) => [
    // A member is assigned to a pool at most once — idempotency BY CONSTRUCTION under a re-spawn.
    //
    // ⚠ NOT the pool-spawn idempotency key. That is `(alert_id, claim_id)` (Story 7.3), and
    // `(cycle_id, pool_index)` is the spawn UNIQUE — this PK governs THIS projection only.
    primaryKey({ name: 'member_pool_assignments_pkey', columns: [t.poolId, t.memberId] }),
    // The `skips_current_year` driving index: the member's assignments inside the IST calendar year.
    index('member_pool_assignments_member_idx').on(t.pariwarId, t.memberId, t.assignedAt.desc()),
    // The backfill / per-cycle repair key.
    index('member_pool_assignments_cycle_idx').on(t.pariwarId, t.cycleId),
  ],
);

export type MemberPoolAssignmentRow = typeof memberPoolAssignments.$inferSelect;
