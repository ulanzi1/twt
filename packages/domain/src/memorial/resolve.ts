// Which drive is the family writing about? (Story 11b.4, MA14 — `#decision-2026-10-24-398`.)
//
// ⛔ NOT `nomineeConsole.resolveActiveNomineePool`: that resolver matches ONLY `live` pools, and authorship begins
// AFTER the collection closes (Trap 2). Widening it would change Story 9.1's console for closed drives. This is a NEW
// resolver over its OWN states, with the same deterministic tie-break; it returns the match count and the HANDLER
// logs `> 1`, as the console does.

import { and, eq, inArray } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { ClaimId, MemberId, PariwarId, PoolId } from '../ids/index.js';
import { claims } from '../schema/claims.js';
import { pools } from '../schema/pools.js';

/**
 * The pool states in which a family may write the memorial — AFTER the collection closes (the UX places authorship
 * *"post-close"* three times; during a live collection the family is asked for nothing else).
 *   · `spawned` is excluded — no collection has begun; there is nothing to remember it by yet;
 *   · `live` is excluded — it would ask a grieving family to write while the Trust is still collecting (MA14 (b),
 *     rejected), against the UX's grief pacing.
 * ⛔ NEVER imported from, and never exported to, another surface's tuple (`-196` Consequence 2 — each surface declares
 * its own visible-state tuple; any may move alone). ⚠ Keyed on the POOL's own `closed`, ⛔ the cycle close (BigDev,
 * `-398` MA14). ⚠ INERT IN PRODUCTION TODAY: ⛔ no production code appends `pool.closed` (the Epic 7 window scheduler is
 * unbuilt), so this surface opens nowhere until a close producer ships (launch-gate Row 41).
 */
export const MEMORIAL_DRIVE_POOL_STATES = ['closed', 'settled'] as const;

export interface MemorialDrive {
  readonly pariwarId: PariwarId;
  readonly poolId: PoolId;
  readonly claimCaseId: ClaimId;
}

export interface ResolvedMemorialDrive {
  readonly drive: MemorialDrive;
  /** How many pools matched — v1 expects one (one death → one claim → one pool); the handler logs `> 1`. */
  readonly matchCount: number;
}

/**
 * The drive for THIS member's death (the session member IS the deceased — Ravi-mode), in a memorial state, or `null`.
 * Tie-break: newest `created_at` first, then the lowest `pool_index` (the console's). Tenant-scoped (run it inside the
 * scope tx — moving it to the service pool is green in CI and dead in production).
 */
export async function resolveMemorialDrive(
  db: Db,
  { pariwarId, memberId }: { readonly pariwarId: PariwarId; readonly memberId: MemberId },
): Promise<ResolvedMemorialDrive | null> {
  const rows = await db
    .select({
      poolId: pools.poolId,
      claimCaseId: pools.claimCaseId,
      createdAt: pools.createdAt,
      poolIndex: pools.poolIndex,
    })
    .from(pools)
    .innerJoin(claims, and(eq(claims.pariwarId, pools.pariwarId), eq(claims.claimCaseId, pools.claimCaseId)))
    .where(
      and(
        eq(pools.pariwarId, pariwarId),
        eq(claims.deceasedMemberId, memberId),
        inArray(pools.currentState, [...MEMORIAL_DRIVE_POOL_STATES]),
      ),
    );
  if (rows.length === 0) return null;
  const chosen = [...rows].sort((a, b) => {
    const byCreated = b.createdAt.getTime() - a.createdAt.getTime();
    return byCreated !== 0 ? byCreated : a.poolIndex - b.poolIndex;
  })[0]!;
  return { drive: { pariwarId, poolId: chosen.poolId, claimCaseId: chosen.claimCaseId }, matchCount: rows.length };
}
