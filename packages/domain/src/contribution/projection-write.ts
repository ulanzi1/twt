// Contribution-fact PROJECTION writers — Story 10.24 (Task 2; D3, AC1, AC7).
//
// Two projections, TWO DIFFERENT maintenance mechanisms, ONE contract (D3):
//
//   · `member_contribution_ledger`  — maintained by an events_log AFTER-INSERT TRIGGER (migration
//     0093). There is deliberately NO incremental writer for it in this file: the whole point of the
//     trigger is that no code path can forget to call one.
//   · `member_pool_assignments`     — maintained by {@link insertMemberPoolAssignments}, called
//     EXPLICITLY beside `db.insert(poolSnapshots)` in `pool/spawn.ts`. A trigger on `pool_snapshots`
//     would expand a JSONB array of up to 4L/N member ids inside the spawn transaction,
//     un-instrumented, inside Story 7.9's <60s envelope.
//
// Plus the REPAIR path for both — the idempotent, set-based backfills.
//
// ── ⚠ The obligation attached to running two mechanisms (D3) ─────────────────────────────────────
// Two projection styles in one story is a real hazard: they drift into subtly different guarantees
// (ordering, idempotency, transactional boundary, what a replay reproduces) and the divergence
// surfaces years later as a fact that disagrees with its own source. THE MECHANISM IS AN
// IMPLEMENTATION DETAIL; THE PROJECTED STATE IS THE CONTRACT. The difference between them must be
// WHERE the write is invoked and nothing else. Four properties hold IDENTICALLY for both, asserted by
// ONE shared invariant test body (never two parallel files that can drift):
//   atomicity · idempotency · replay equivalence · ordering-independence
// — tests/integration/contribution/projection-equivalence.spec.ts.
//
// ── AC7: every write here is SET-BASED ───────────────────────────────────────────────────────────
// The assignment writer is ONE bulk insert of the whole `memberAssignments` array — never a per-member
// INSERT in a `for` loop inside the spawn transaction. The backfills are `INSERT … SELECT` — never
// row-at-a-time across the whole event log.

import { sql } from 'drizzle-orm';

import type { Db } from '../db.js';
import { memberId, type CycleFreezeCommitId, type PariwarId, type PoolId } from '../ids/index.js';
import { memberContributionLedger } from '../schema/member_contribution_ledger.js';
import { memberPoolAssignments } from '../schema/member_pool_assignments.js';
import {
  CONFIRMED_EVENT_TYPE,
  CONFIRMED_PAYLOAD_MEMBER_KEY,
  CONFIRMED_PAYLOAD_POOL_KEY,
  REVERSED_CONFIRMED_EVENT_ID_KEY,
} from './read.js';

/** The reversal event type — imported shape, re-spelled nowhere (mirrors the trigger's WHEN clause). */
const REVERSED_EVENT_TYPE = 'reconciliation.confirmation-reversed';

/** One (member, pool) assignment row to project, as `pool/spawn.ts` already holds it. */
export interface MemberPoolAssignmentInput {
  readonly pariwarId: PariwarId;
  readonly poolId: PoolId;
  readonly cycleId: CycleFreezeCommitId;
  /** The cycle-freeze `committed_at` — the assignment INSTANT, never the spawn wall-clock. */
  readonly assignedAt: Date;
  /** The member ids from the SAME `memberAssignments` value the snapshot serializes (AC4). */
  readonly memberIds: readonly string[];
}

/**
 * Project a pool's freeze-time member assignments (D3's explicit-writer half).
 *
 * ONE bulk insert for the whole roster (AC7) — never a per-member statement. `ON CONFLICT DO NOTHING`
 * on the `(pool_id, member_id)` PK makes a re-spawn of the same frozen cycle a byte-identical no-op,
 * which is the same idempotency-by-construction the ledger gets from its event-id PK.
 *
 * Runs on the CALLER's transaction (the spawn tx), so the projection commits or rolls back WITH the
 * snapshot it mirrors — the atomicity half of the D3 equivalence contract.
 *
 * An empty roster is a legitimate no-op (a cycle with no assignable members), not an error.
 * Returns the number of rows actually projected (0 on a full re-spawn — useful to the caller's log).
 */
export async function insertMemberPoolAssignments(
  db: Db,
  input: MemberPoolAssignmentInput,
): Promise<number> {
  if (input.memberIds.length === 0) return 0;
  const rows = input.memberIds.map((id) => ({
    poolId: input.poolId,
    memberId: memberId(id),
    pariwarId: input.pariwarId,
    cycleId: input.cycleId,
    assignedAt: input.assignedAt,
  }));
  const result = await db.insert(memberPoolAssignments).values(rows).onConflictDoNothing();
  return result.rowCount ?? 0;
}

// ── The REPAIR path — idempotent, set-based backfills (D3 replay equivalence) ────────────────────

/** The shape a projected `::uuid` cast requires. Checked BEFORE casting in both the trigger (migration
 *  0093) and this backfill — a present-but-malformed value must be SKIPPED like a missing one, never
 *  cast blindly: an invalid cast inside the trigger would abort the whole event append, and inside this
 *  backfill would fail the whole set-based statement instead of skipping the one bad historical row
 *  (code review, 2026-08-05). Kept in lockstep with the trigger's regex by inspection — both are the
 *  standard 8-4-4-4-12 hex form. */
const UUID_SHAPE_SQL = sql`'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'`;

/**
 * Rebuild `member_contribution_ledger` for a Pariwar from `events_log` — the ledger's repair path AND
 * the "replay equivalence" arm of the D3 contract: rebuilding from scratch over the same source data
 * must produce state BYTE-IDENTICAL to the incrementally (trigger-)maintained state. That is what makes
 * this a genuine repair path rather than a second, differently-wrong producer.
 *
 * Deliberately mirrors the trigger's logic statement-for-statement:
 *   · the confirmed arm INSERTs from `payload->>'memberId'` / `payload->>'poolId'`, skipping malformed
 *     events exactly as the trigger does — missing OR not UUID-shaped, never a blind cast that could
 *     fail the whole set-based statement on one bad historical row;
 *   · the reversal arm UPDATEs `reversed_at` by `payload->>'reversedConfirmedEventId'`, first-reversal-
 *     wins (`reversed_at IS NULL`), which is ALSO what converges the ordering-independence case the
 *     trigger cannot resolve alone (a reversal that arrived before its confirmation).
 *
 * SET-BASED (`INSERT … SELECT` / `UPDATE … FROM`), never row-at-a-time (AC7). Idempotent: re-running it
 * over unchanged data is a no-op. RLS-scoped by the caller; the explicit `pariwar_id` predicate is both
 * the tenant guard for a BYPASSRLS caller and the index driver.
 */
export async function backfillContributionLedger(db: Db, pariwarId: PariwarId): Promise<void> {
  await db.execute(sql`
    INSERT INTO ${memberContributionLedger}
      (confirmed_event_id, pariwar_id, member_id, pool_id, confirmed_at)
    SELECT e.event_id,
           e.pariwar_id,
           (e.payload ->> ${CONFIRMED_PAYLOAD_MEMBER_KEY})::uuid,
           (e.payload ->> ${CONFIRMED_PAYLOAD_POOL_KEY})::uuid,
           e.occurred_at
      FROM events_log e
     WHERE e.pariwar_id = ${pariwarId}
       AND e.event_type = ${CONFIRMED_EVENT_TYPE}
       AND e.payload ->> ${CONFIRMED_PAYLOAD_MEMBER_KEY} IS NOT NULL
       AND e.payload ->> ${CONFIRMED_PAYLOAD_POOL_KEY} IS NOT NULL
       AND (e.payload ->> ${CONFIRMED_PAYLOAD_MEMBER_KEY}) ~* ${UUID_SHAPE_SQL}
       AND (e.payload ->> ${CONFIRMED_PAYLOAD_POOL_KEY}) ~* ${UUID_SHAPE_SQL}
    ON CONFLICT (confirmed_event_id) DO NOTHING
  `);

  // The reversal arm. `DISTINCT ON (reversed id) … ORDER BY occurred_at, event_id` picks the FIRST
  // reversal for a confirmation, matching the trigger's `reversed_at IS NULL` first-wins rule (the
  // event_id tiebreak keeps two reversals sharing an instant deterministic).
  // NOTE the two-level shape: the reversal key is projected to a NAMED COLUMN first, and only then is
  // `DISTINCT ON` applied to it. Postgres compares DISTINCT ON against ORDER BY *syntactically*, and a
  // repeated `payload ->> $n` is a DIFFERENT parameter placeholder on each mention — so the single-level
  // form raises 42P10 ("DISTINCT ON expressions must match initial ORDER BY expressions").
  await db.execute(sql`
    WITH reversals AS (
      SELECT (e.payload ->> ${REVERSED_CONFIRMED_EVENT_ID_KEY})::uuid AS confirmed_event_id,
             e.occurred_at,
             e.event_id,
             e.pariwar_id
        FROM events_log e
       WHERE e.pariwar_id = ${pariwarId}
         AND e.event_type = ${REVERSED_EVENT_TYPE}
         AND e.payload ->> ${REVERSED_CONFIRMED_EVENT_ID_KEY} IS NOT NULL
         AND (e.payload ->> ${REVERSED_CONFIRMED_EVENT_ID_KEY}) ~* ${UUID_SHAPE_SQL}
    ), first_reversal AS (
      SELECT DISTINCT ON (confirmed_event_id) confirmed_event_id, occurred_at, event_id, pariwar_id
        FROM reversals
       ORDER BY confirmed_event_id, occurred_at, event_id
    )
    UPDATE ${memberContributionLedger} AS l
       SET reversed_at = r.occurred_at,
           reversed_by_event_id = r.event_id
      FROM first_reversal r
     WHERE l.confirmed_event_id = r.confirmed_event_id
       AND l.pariwar_id = r.pariwar_id
       AND l.reversed_at IS NULL
  `);
}

/**
 * Rebuild `member_pool_assignments` for a Pariwar from `pool_snapshots` — the assignment projection's
 * repair path and the other half of the D3 replay-equivalence contract.
 *
 * The source is the PERSISTED SNAPSHOT (`snapshot -> 'member_assignments'`), never a recompute of
 * `assignMembersToPools` (AC4): the snapshot is the truth the money followed, and re-deriving it here
 * would re-run the assignment algorithm outside its Story 7.4 version pin.
 *
 * `assigned_at` comes from `cycle_freeze_commits.committed_at` — the same durable instant the live
 * writer uses, so a backfilled row is indistinguishable from an incrementally-written one.
 *
 * One pool accrues MANY snapshot rows over its life (an append table); `DISTINCT ON (pool_id) … ORDER BY
 * created_at` takes the SPAWN snapshot — the freeze-time assignment, which is what this projection
 * records. `snapshot_id` is the tiebreak: `created_at` defaults to `now()`, which is TRANSACTION-stable,
 * so two snapshots written in one tx share an instant and the pick would otherwise be nondeterministic —
 * and a nondeterministic backfill cannot satisfy the D3 replay-equivalence property. Set-based +
 * `ON CONFLICT DO NOTHING`, so re-running is a no-op.
 */
export async function backfillMemberPoolAssignments(db: Db, pariwarId: PariwarId): Promise<void> {
  await db.execute(sql`
    INSERT INTO ${memberPoolAssignments}
      (pool_id, member_id, pariwar_id, cycle_id, assigned_at)
    SELECT s.pool_id,
           (a ->> 'member_id')::uuid,
           s.pariwar_id,
           p.cycle_id,
           c.committed_at
      FROM (
        SELECT DISTINCT ON (ps.pool_id) ps.pool_id, ps.pariwar_id, ps.snapshot
          FROM pool_snapshots ps
         WHERE ps.pariwar_id = ${pariwarId}
         ORDER BY ps.pool_id, ps.created_at ASC, ps.snapshot_id ASC
      ) AS s
      JOIN pools p              ON p.pool_id = s.pool_id AND p.pariwar_id = s.pariwar_id
      JOIN cycle_freeze_commits c ON c.commit_id = p.cycle_id
      CROSS JOIN LATERAL jsonb_array_elements(s.snapshot -> 'member_assignments') AS a
     WHERE a ->> 'member_id' IS NOT NULL
    ON CONFLICT (pool_id, member_id) DO NOTHING
  `);
}
