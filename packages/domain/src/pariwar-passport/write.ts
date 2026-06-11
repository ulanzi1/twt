// Pariwar-Passport write path — Story 1.7 (AC-3 invalidate-on-write seam).
//
// Deliberately narrow: just the Drizzle insert/upsert + the cache invalidation.
// NO HTTP layer, NO auth — those land at the Story 1.9+ route surface. A separate
// file (vs co-locating in read.ts) keeps the invalidatePariwarPassport call easy
// to spot: every mutation path in this module ends with an invalidation.
//
// ⚠ Scope contract: the `pariwarPassportTenantIsolationWrite` policy requires
// `pariwar_id = <session scope>` on write, so the CALLER must have set
// `app.pariwar_id` (via setPariwarScope / withPariwarScope, inside a tx) to the
// same Pariwar before calling — a Pariwar A session cannot upsert Pariwar B's
// passport (the withCheck rejects it). In local/CI superuser sessions RLS is
// bypassed; the integration test sheds superuser via `SET LOCAL ROLE twt_app`.
//
// `updated_at` is NOT set here on the conflict→update path — the BEFORE UPDATE
// trigger (migration 0003) bumps it to now() so the AC-3 freshness timestamp is
// authoritative regardless of what the caller passes.

import type { Db } from '../db.js';
import {
  type PariwarPassportInsert,
  type PariwarPassportRow,
  pariwarPassport,
} from '../schema/pariwar_passport.js';

import { invalidatePariwarPassport } from './read.js';

/**
 * Insert-or-update a Pariwar's passport (keyed on the `pariwar_id` PK), then
 * invalidate the in-process cache so the next read reflects the write within
 * "immediately" (rather than waiting out the 60s TTL ceiling). Returns the
 * persisted row. `undefined` fields in `data` are skipped on the update path by
 * Drizzle, so a partial update does not null untouched columns.
 */
export async function upsertPariwarPassport(
  db: Db,
  data: PariwarPassportInsert,
): Promise<PariwarPassportRow> {
  const [row] = await db
    .insert(pariwarPassport)
    .values(data)
    .onConflictDoUpdate({
      target: pariwarPassport.pariwarId,
      set: {
        displayNameEn: data.displayNameEn,
        displayNameHi: data.displayNameHi,
        legalName: data.legalName,
        trustRegistrationId: data.trustRegistrationId,
        brandingBundle: data.brandingBundle,
        localeDefault: data.localeDefault,
        // updated_at intentionally omitted — the BEFORE UPDATE trigger sets it.
      },
    })
    .returning();

  // Invalidate AFTER a successful write so a failed write does not evict a valid
  // cached entry. `data.pariwarId` is the PK; the cache key is the raw string.
  invalidatePariwarPassport(data.pariwarId);

  // `returning()` always yields exactly one row for a single-row upsert.
  return row as PariwarPassportRow;
}
