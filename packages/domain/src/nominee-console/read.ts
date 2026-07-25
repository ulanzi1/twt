// packages/domain/src/nominee-console/read.ts
//
// The server-authoritative reads that back the Nominee Console (Story 9.1, Task 1/3). Two DB-scoped
// reads over data that ALREADY EXISTS — NO write path, NO new event, NO schema change:
//
//   (1) resolveActiveNomineePool — "is this member a validated nominee with an ACTIVE pool?" The gate.
//       The nominee-mid-pool identity EXTENDS the claim_handover / Ravi-mode session model (§2.3 has no
//       nominee-self primitive — decision #3): after handover the acting member session IS the deceased
//       member's, so a "validated nominee with an active pool" = a `live` pool whose originating claim's
//       `deceased_member_id` equals the acting member. No new nominee-role primitive, no new identity
//       column (cf. [[project_membership_number_deferred_feature]]) — the pool↔claim↔deceased links
//       already exist. WRITE actions (the Story 9.3 upload) will additionally be
//       `requireMemberStepUp('claim_handover')`-gated; this READ (console render) needs only the member
//       session, the 8.2/8.3 read posture (reads are not step-up-gated in this app).
//
//   (2) resolvePoolOpenAt — the `pool.opened_for_contributions` event timestamp for a pool. `poolOpenAt`
//       is NOT a ready column (the `pools` table, migration 0071, has no such field — verified during
//       validation); the only signal is the event's `events_log.occurred_at`. The domain OWNS events_log
//       and reads it DIRECTLY (it cannot import @twt/events — the turbo cycle; the member/contribution
//       read precedent, [[project_member_lifecycle_domain_substrate]]). This is the minimal read the
//       staff-takeover derivation's `poolOpenAt` clock-origin needs — NO new column/migration for it.
//
// Tenant-scoped (every query leads with `pariwar_id`, RLS-aware). DB-touching, so it lives in @twt/domain
// (NEVER imported by @twt/contracts — the bundle boundary, [[project_contracts_domain_bundle_boundary]]).

import { and, asc, eq } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { MemberId, PariwarId, PoolId } from '../ids/index.js';
import { claims } from '../schema/claims.js';
import { eventsLog } from '../schema/events_log.js';
import { pools, type PoolRow } from '../schema/pools.js';

/**
 * The `pool.opened_for_contributions` event type — the one whose `occurred_at` is the pool-open instant.
 * Kept in lockstep with `POOL_EVENT_TYPES[1]` (pool/events.ts) via the local literal so a rename there is
 * a compile-visible edit here, not a silently-stale string.
 */
export const POOL_OPENED_FOR_CONTRIBUTIONS_EVENT_TYPE = 'pool.opened_for_contributions' as const;

/** The resolved active-nominee pool + the pool-count context the identity resolvers need. */
export interface ActiveNomineePool {
  /** The `live` pool row whose originating claim's deceased member is the acting nominee. */
  readonly pool: PoolRow;
  /** The number of pools spawned in this pool's cycle (the curated-name registry position context). */
  readonly poolCount: number;
  /**
   * How many `live` pools matched this nominee before the deterministic choice was applied. Expected to be
   * 1 in v1 (one death → one claim → one pool); the caller should log when this is `> 1` (Review fix) so a
   * multi-pool nominee — whose OTHER live pool(s) get no console today — is not silently invisible.
   */
  readonly liveCount: number;
}

/**
 * Resolve the acting member's ACTIVE-pool nominee context, or `null` (AC1 — the console self-suppresses on
 * null). "Validated nominee with an active pool" = a `live` pool whose originating claim's
 * `deceased_member_id` is the acting member (the Ravi-mode session-as-deceased identity, decision #3).
 *
 * If more than one `live` pool matches (a deceased member with multiple concurrent active pools — not
 * expected in v1: one death → one claim → one pool), the LOWEST `pool_index` in the most-recent cycle is
 * chosen deterministically (ordered by `created_at` desc, then `pool_index` asc) so the console is stable.
 * `poolCount` is the number of pools in the CHOSEN pool's cycle (the curated-name position context).
 */
export async function resolveActiveNomineePool(
  db: Db,
  { pariwarId, memberId }: { readonly pariwarId: PariwarId; readonly memberId: MemberId },
): Promise<ActiveNomineePool | null> {
  // (1) The live pool(s) whose originating claim names this member as the deceased. A join pools→claims on
  //     (pariwar_id, claim_case_id) + claims.deceased_member_id == memberId + pool is `live`. Tenant-scoped.
  const rows = await db
    .select({ pool: pools })
    .from(pools)
    .innerJoin(
      claims,
      and(eq(claims.pariwarId, pools.pariwarId), eq(claims.claimCaseId, pools.claimCaseId)),
    )
    .where(
      and(
        eq(pools.pariwarId, pariwarId),
        eq(claims.deceasedMemberId, memberId),
        eq(pools.currentState, 'live'),
      ),
    );
  if (rows.length === 0) return null;

  // Deterministic choice: most-recent cycle first (created_at desc), then lowest pool_index. Done in JS
  // over the (small) matched set rather than an ORDER BY + LIMIT so the poolCount computation below sees
  // every sibling in the chosen cycle.
  const chosen = [...rows]
    .map((r) => r.pool)
    .sort((a, b) => {
      const byCreated = b.createdAt.getTime() - a.createdAt.getTime();
      return byCreated !== 0 ? byCreated : a.poolIndex - b.poolIndex;
    })[0]!;

  // (2) The pool-count for the chosen pool's cycle (the curated-name registry position context). Counts
  //     ALL pools in the cycle (not just live ones) — the naming registry reserves N names at spawn.
  const cycleRows = await db
    .select({ poolId: pools.poolId })
    .from(pools)
    .where(and(eq(pools.pariwarId, pariwarId), eq(pools.cycleId, chosen.cycleId)));
  const poolCount = cycleRows.length;

  return { pool: chosen, poolCount, liveCount: rows.length };
}

/**
 * Resolve a pool's `pool.opened_for_contributions` timestamp (AC3 — the day-N clock origin), or `null` if
 * the pool has no such event yet. Reads `events_log` directly (stream_id = pool_id, event_type =
 * pool.opened_for_contributions), earliest-first (the open is a one-time transition; the earliest is
 * authoritative if a replay ever appended more than one). Tenant-scoped.
 */
export async function resolvePoolOpenAt(
  db: Db,
  { pariwarId, poolId }: { readonly pariwarId: PariwarId; readonly poolId: PoolId },
): Promise<Date | null> {
  const [row] = await db
    .select({ occurredAt: eventsLog.occurredAt })
    .from(eventsLog)
    .where(
      and(
        eq(eventsLog.pariwarId, pariwarId),
        eq(eventsLog.streamId, poolId),
        eq(eventsLog.eventType, POOL_OPENED_FOR_CONTRIBUTIONS_EVENT_TYPE),
      ),
    )
    .orderBy(asc(eventsLog.occurredAt))
    .limit(1);
  return row?.occurredAt ?? null;
}
