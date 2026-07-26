// packages/domain/src/reconciliation/read.ts
//
// The DB-scoped reads the Story 9.3 upload transport needs — over data that ALREADY EXISTS (pools +
// events_log). NO write path here (the API handler appends events via @twt/events); NO new schema.
//
//   resolveLivePoolByClaim — the STAFF upload path resolves the target pool from a `claim_case_id`
//   (the operator names which claim's statement they are transcribing). The member path uses
//   `resolveActiveNomineePool` instead (the Ravi-mode session-as-deceased identity). A `live` pool
//   whose originating claim matches; deterministic lowest-`pool_index`-in-most-recent-cycle choice
//   (the `resolveActiveNomineePool` tiebreak).
//
// Tenant-scoped (every query leads with `pariwar_id`, RLS-aware). DB-touching, so it lives in @twt/domain
// (NEVER imported by @twt/contracts — the bundle boundary, [[project_contracts_domain_bundle_boundary]]).

import { and, eq } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { ClaimId, PariwarId } from '../ids/index.js';
import { claims } from '../schema/claims.js';
import { pools, type PoolRow } from '../schema/pools.js';

/**
 * Resolve the `live` pool a `claim_case_id` belongs to (the STAFF upload path), or `null`. Tenant-scoped
 * join pools→claims on `(pariwar_id, claim_case_id)` + the pool is `live`. If more than one live pool
 * matches (not expected in v1 — one death → one claim → one pool), the most-recent cycle's lowest
 * `pool_index` is chosen deterministically (the `resolveActiveNomineePool` tiebreak) so the transport is stable.
 */
export async function resolveLivePoolByClaim(
  db: Db,
  { pariwarId, claimCaseId }: { readonly pariwarId: PariwarId; readonly claimCaseId: ClaimId },
): Promise<PoolRow | null> {
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
        eq(pools.claimCaseId, claimCaseId),
        eq(pools.currentState, 'live'),
      ),
    );
  if (rows.length === 0) return null;
  return [...rows]
    .map((r) => r.pool)
    .sort((a, b) => {
      const byCreated = b.createdAt.getTime() - a.createdAt.getTime();
      return byCreated !== 0 ? byCreated : a.poolIndex - b.poolIndex;
    })[0]!;
}
