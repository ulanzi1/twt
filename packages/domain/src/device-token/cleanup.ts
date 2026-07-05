// member_device_tokens stale/invalid cleanup — Story 5.2 (Task 5; AC5).
//
// The Class C pg-boss cleanup job (apps/jobs) prunes `stale` + `invalid` tokens on a cadence, reclaiming
// dead Tier-1 ciphertext. Runs on the BYPASSRLS service `pool` cross-tenant (member_device_tokens is
// FORCE-RLS), a single idempotent DELETE — mirrors validityCache.purgeExpiredValidityCache. Ages off
// `last_seen_at` (the last registration/activity marker).
//
// ── Provisional operational defaults (NOT policy- or legal-derived) ────────────────────────────────────
// architecture.md §3.3 + epics.md name NO concrete retention number for device tokens. These defaults are
// chosen by analogy with the nearest existing cleanup cadence (digilocker-cert-refresh's 7d/30d staleness
// budget shape) and MAY be revised in the retention-matrix review — provisional, not committed product
// policy (recorded as such in the Story 5.2 Dev Agent Record).

import type pg from 'pg';

/** Prune `stale` device tokens older than this many seconds (provisional: 7 days). */
export const DEVICE_TOKEN_STALE_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;
/** Prune `invalid` device tokens older than this many seconds (provisional: 30 days). */
export const DEVICE_TOKEN_INVALID_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

/**
 * DELETE `stale` tokens older than `staleMaxAgeSeconds` and `invalid` tokens older than
 * `invalidMaxAgeSeconds` (both aged off `last_seen_at`). Idempotent; runs on the BYPASSRLS service pool
 * so it sweeps across all tenants. Returns the number of rows pruned.
 */
export async function purgeExpiredDeviceTokens(
  pool: pg.Pool,
  staleMaxAgeSeconds: number = DEVICE_TOKEN_STALE_MAX_AGE_SECONDS,
  invalidMaxAgeSeconds: number = DEVICE_TOKEN_INVALID_MAX_AGE_SECONDS,
): Promise<number> {
  const result = await pool.query(
    `DELETE FROM member_device_tokens
       WHERE (status = 'stale'   AND last_seen_at < now() - make_interval(secs => $1))
          OR (status = 'invalid' AND last_seen_at < now() - make_interval(secs => $2))`,
    [staleMaxAgeSeconds, invalidMaxAgeSeconds],
  );
  return result.rowCount ?? 0;
}
