// Per-cohort invalidation epoch — Story 4.8 (Task 4; AC1a, AC1c, AC3, D2-A, D4-A).
//
// The write side of `cohort_invalidation_epochs`. Bumping the epoch in the SAME transaction as the
// triggering write (an amendment publish, or a trustee invalidate-all) means every subsequent
// `member_validity_cache` read for that cohort resolves a NEW key → guaranteed miss → recompute. Freshness
// is therefore SYNCHRONOUS the instant the bump commits — no pg-boss / message-bus delivery dependency,
// so the AC2(a) "broadcast delivery delayed" window is structurally unreachable for evented rule changes.
//
// All functions run on the CALLER's transaction (the scoped `db`): the amendment bump rides the publish
// tx (niyamavali/write.ts amendClause), the trustee bump rides the admin route's scope tx. RLS scopes
// every statement to `app.pariwar_id` — set on those paths already.

import { and, eq, sql } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { PariwarId } from '../ids/index.js';
import { cohortInvalidationEpochs } from '../schema/cohort_invalidation_epochs.js';
import { CURRENT_NIYAMAVALI_VERSION } from './constants.js';

/**
 * Bump one cohort's epoch by 1 (UPSERT: INSERT at epoch 1 on the first bump, `epoch + 1` thereafter),
 * in the caller's transaction. Returns the new epoch. Conservative whole-cohort invalidation (D4-A) —
 * the caller does NOT narrow by `affectedMemberScope` (a narrowing bug under-invalidates = stale validity
 * = trust corruption; the whole-cohort bump is strictly safer, and AC2(b) endorses it).
 */
export async function bumpCohortEpoch(
  db: Db,
  pariwarId: PariwarId,
  niyamavaliVersion: string = CURRENT_NIYAMAVALI_VERSION,
): Promise<number> {
  const rows = await db
    .insert(cohortInvalidationEpochs)
    .values({ pariwarId, niyamavaliVersion, epoch: 1 })
    .onConflictDoUpdate({
      target: [cohortInvalidationEpochs.pariwarId, cohortInvalidationEpochs.niyamavaliVersion],
      set: {
        epoch: sql`${cohortInvalidationEpochs.epoch} + 1`,
        updatedAt: sql`now()`,
      },
    })
    .returning({ epoch: cohortInvalidationEpochs.epoch });
  const epoch = rows[0]?.epoch;
  if (epoch === undefined) {
    // Under RLS a missing scope silently filters the UPSERT to 0 rows — surface it loudly rather than
    // pretend the bump happened (a swallowed bump = stale validity).
    throw new Error(
      '[bumpCohortEpoch] UPSERT returned no row — check the transaction has app.pariwar_id scope set',
    );
  }
  return epoch;
}

/** Read a cohort's current epoch (cheap cache-key component). An absent row ≡ epoch 0 (never invalidated). */
export async function readCohortEpoch(
  db: Db,
  pariwarId: PariwarId,
  niyamavaliVersion: string = CURRENT_NIYAMAVALI_VERSION,
): Promise<number> {
  const rows = await db
    .select({ epoch: cohortInvalidationEpochs.epoch })
    .from(cohortInvalidationEpochs)
    .where(
      and(
        eq(cohortInvalidationEpochs.pariwarId, pariwarId),
        eq(cohortInvalidationEpochs.niyamavaliVersion, niyamavaliVersion),
      ),
    );
  return rows[0]?.epoch ?? 0;
}

/**
 * Trustee "invalidate all" (AC1c / AC3): bump EVERY cohort for the Pariwar so all members' cached validity
 * is invalidated. Bumps every existing cohort row (forward-safe once multiple niyamavali versions exist),
 * then guarantees the CURRENT cohort exists + is bumped even for a never-amended Pariwar (its members all
 * resolve the current cohort, so without this their key would stay at epoch 0 and the invalidate-all would
 * be a no-op). Subsequent calls hit direct recomputation until the cache repopulates organically — the
 * performance dip during that window is the accepted cost of never serving stale validity.
 */
export async function invalidateAllForPariwar(db: Db, pariwarId: PariwarId): Promise<void> {
  await db
    .update(cohortInvalidationEpochs)
    .set({ epoch: sql`${cohortInvalidationEpochs.epoch} + 1`, updatedAt: sql`now()` })
    .where(eq(cohortInvalidationEpochs.pariwarId, pariwarId));
  // Create-and-bump the current cohort iff it had no row (a never-amended Pariwar). If it already
  // existed, the UPDATE above bumped it and this INSERT is a no-op — so no double-bump.
  await db
    .insert(cohortInvalidationEpochs)
    .values({ pariwarId, niyamavaliVersion: CURRENT_NIYAMAVALI_VERSION, epoch: 1 })
    .onConflictDoNothing();
}
