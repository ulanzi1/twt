// `cycle_freeze_commits` — the durable cycle-freeze COMMIT record (Story 6.13, Task 2; D-D/AC5/AC6).
//
// The lightweight durable record the freeze-commit (AC5) writes: it is (1) the commit's IDEMPOTENCY KEY
// (a re-submitted commit for an existing `commit_id` never double-advances a claim nor re-fires the
// trigger), (2) the AUDIT anchor, and (3) the Epic-7 pool-spawn HANDOFF anchor — the durable payload the
// post-commit `PoolSpawnTrigger` (AC6) reads. v1's "cycle" = the set of pending candidates a Pariwar
// commits together; the freeze-commit DEFINES the cycle boundary by emitting `claim.approved` for the
// selected set. This is NOT a cycle-scheduling object (that is Epic 7).
//
// ── `commit_id` is CLIENT-GENERATED (AC5) ───────────────────────────────────────────────────
// The client mints the `commit_id` UUID and submits it; the server echoes it. That is what lets a client
// safely RETRY a commit call that failed/timed out before a response arrived — a second commit with the
// same id is a natural no-op (the writer reads-back an existing record and re-fires nothing). `defaultRandom`
// is only a fallback for a bare insert; the writer always supplies the client id.
//
// ── PII discipline ──────────────────────────────────────────────────────────────────────────
// NON-PII only: pariwar_id + actor_id + committed claim-id set + the `actor_display` snapshot (R5/AC8, a
// controlled staff-attribution DISPLAY string, plaintext-by-decision, NEVER email-derived) + the
// `trigger_delivered` flag. No deceased/nominee PII (the frozen `{claim_case_id, deceased_member_id}` set
// the trigger payload carries is assembled at fire time from the claims read, not stored here).
//
// TENANT-ISOLATED (RLS in policies/cycle-freeze-commits-rls.ts). There is NO `pariwars` base table to FK
// against pre-Epic-3 (the geo tree is Epic 3; `claims.pariwar_id` itself carries no FK for the same
// reason), so tenant integrity is the RLS predicate, not a literal FK — the exact `claims` posture.
//
// Naming discipline per architecture L3663-3677: DB columns snake_case, TS camelCase.

import { boolean, index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import type { CycleFreezeCommitId, PariwarId } from '../ids/index.js';

export const cycleFreezeCommits = pgTable(
  'cycle_freeze_commits',
  {
    // The CLIENT-GENERATED commit id (AC5 idempotency key). PK; defaultRandom is only a bare-insert
    // fallback (the writer always supplies the client-submitted id). Branded CycleFreezeCommitId.
    commitId: uuid('commit_id').defaultRandom().primaryKey().$type<CycleFreezeCommitId>(),

    // Multi-tenant scope (RLS predicate column; branded).
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),

    // The committing trustee (an actor id, not a name → non-PII). The query/join key.
    actorId: text('actor_id').notNull(),

    // The commit-time SNAPSHOT of the actor's `users.display_name` (R5/AC8). REQUIRED (NOT NULL) — the
    // writer resolves it server-side FIRST and blocks the commit with AdminDisplayNameMissingError when
    // absent (no fallback). Plaintext controlled staff-attribution personal data, NEVER email-derived.
    actorDisplay: text('actor_display').notNull(),

    // The committed claim-id SET — the claims advanced to `approved` in this commit (the Epic-7 handoff
    // payload + the audit record). A uuid[] (no per-element FK; the claims FK lives on the decision table).
    committedClaimIds: uuid('committed_claim_ids').array().notNull().$type<string[]>(),

    // AC6 — flipped true AFTER the post-commit PoolSpawnTrigger fires successfully (best-effort, self-
    // healing on redelivery). Makes the trigger fire idempotent + redelivery-safe. Default false.
    triggerDelivered: boolean('trigger_delivered').notNull().default(false),

    committedAt: timestamp('committed_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),

    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    // Per-tenant scans / RLS-aware planner hint (pariwar_id leads, mirroring claims).
    index('cycle_freeze_commits_pariwar_id_idx').on(t.pariwarId),
    // Undelivered-trigger sweep (the self-healing redelivery scan reads WHERE trigger_delivered = false).
    index('cycle_freeze_commits_trigger_delivered_idx').on(t.triggerDelivered),
    // Story 8.14 (Review Finding) — the close-of-cycle sweep's prefilter both filters
    // (`committed_at <= $1`) AND orders (`ORDER BY committed_at ASC`) on this column every hourly
    // tick, cross-tenant. The sweep's own header comment calls it "an indexed prefilter" — this makes
    // that true.
    index('cycle_freeze_commits_committed_at_idx').on(t.committedAt),
  ],
);

export type CycleFreezeCommitRow = typeof cycleFreezeCommits.$inferSelect;
export type CycleFreezeCommitInsert = typeof cycleFreezeCommits.$inferInsert;
