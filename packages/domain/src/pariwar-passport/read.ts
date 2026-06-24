// Pariwar-Passport read accessor + 60s freshness contract — Story 1.7 (AC-2, AC-3).
//
// AC-2 (cross-Pariwar consumable): the read accessors below are PLAIN
// `db.select()` — NOT wrapped in `withPariwarScope` or `runAsCrossTenant`. They
// rely on the `pariwarPassportCrossReadableSelect` carve-out policy (`USING true`),
// so a `twt_app` session reads any Pariwar's passport without setting scope and
// without the row-security-off escape hatch. That is the whole point of the
// carve-out: the public Astro shell + admin chrome (Story 1.9+) read branding for
// any Pariwar through the typed accessor.
//
// AC-3 (60s freshness): architecture §1.10 line 1047-1048 — "Static reference data
// cache — Pariwar config, 60s TTL with cache-aside, invalidated on trustee write."
// At this primitive layer that means:
//   (1) the DB row is the source of truth — getPariwarPassport / getBrandingBundle
//       are fresh-from-DB by default;
//   (2) BRANDING_BUNDLE_MAX_STALENESS_MS = 60_000 is the exported staleness ceiling
//       every downstream cache MUST honour;
//   (3) a minimal in-process cache-aside wrapper + invalidatePariwarPassport seam
//       the write path calls so a trustee write reflects immediately (the TTL is
//       only the upper bound for paths that never invalidate);
//   (4) the `updated_at` column (bumped by the BEFORE UPDATE trigger) is the
//       stale-while-revalidate marker (§1.10 line 1068-1070).
// NO Redis — the distributed cache is a future trigger per §1.10 line 1077. This
// is deliberately an in-process Map, not gold-plated for consumers that don't
// exist yet.

import { desc, eq } from 'drizzle-orm';

import { clampLimit } from '../pagination.js';
import type { Db } from '../db.js';
import type { PariwarId } from '../ids/index.js';
import {
  type BrandingBundle,
  type PariwarPassportRow,
  pariwarPassport,
} from '../schema/pariwar_passport.js';

/**
 * Staleness ceiling for the Pariwar branding/config cache (architecture §1.10
 * line 1047-1048). Any cache layer between a rendering surface and the DB MUST
 * serve data no older than this. 60 seconds.
 */
export const BRANDING_BUNDLE_MAX_STALENESS_MS = 60_000;

/**
 * Fresh-from-DB read of a single Pariwar's passport. Cross-Pariwar readable via
 * the carve-out SELECT policy — no scope required. Returns null when no passport
 * exists for `id`.
 */
export async function getPariwarPassport(
  db: Db,
  id: PariwarId,
): Promise<PariwarPassportRow | null> {
  const rows = await db
    .select()
    .from(pariwarPassport)
    .where(eq(pariwarPassport.pariwarId, id))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Fresh-from-DB read of just the branding bundle (the most common chrome read).
 * Returns null when no passport exists for `id`.
 */
export async function getBrandingBundle(
  db: Db,
  id: PariwarId,
): Promise<BrandingBundle | null> {
  const row = await getPariwarPassport(db, id);
  return row?.brandingBundle ?? null;
}

/**
 * List passports across ALL Pariwars — the provisioning-status view (Story 1.15).
 * Cross-Pariwar readable via the carve-out SELECT policy (`USING true`), so NO
 * scope is required (same posture as `getPariwarPassport`). `limit` is the
 * forced-pagination bound (Story 1.14) — the caller passes a `.max()`-capped value.
 * Ordered newest-first (created_at DESC, then pariwar_id) for a stable page.
 */
export async function listPariwarPassports(
  db: Db,
  opts: { limit: number },
): Promise<PariwarPassportRow[]> {
  return db
    .select()
    .from(pariwarPassport)
    .orderBy(desc(pariwarPassport.createdAt), pariwarPassport.pariwarId)
    .limit(clampLimit(opts.limit, { default: 50, cap: 200 }));
}

// ── Cache-aside layer (the 60s-freshness primitive) ──────────────────────────
// In-process only. Keyed by pariwar_id string. The write path
// (./write.ts → upsertPariwarPassport) calls invalidatePariwarPassport after
// every successful mutation so trustee writes reflect immediately; the TTL is the
// fallback ceiling for any read path that never receives an invalidation.

interface CacheEntry {
  value: PariwarPassportRow | null;
  fetchedAt: number;
}

const cache = new Map<string, CacheEntry>();

/**
 * Evict a Pariwar's cached passport. Called by the write path after INSERT/UPDATE
 * so the next read is fresh-from-DB. Idempotent (no-op when absent). This is the
 * "invalidated on trustee write" seam from architecture §1.10 line 1047-1048.
 */
export function invalidatePariwarPassport(id: string): void {
  cache.delete(id);
}

/** Drop every cached entry — for tests + a future global-flush admin path. */
export function clearPariwarPassportCache(): void {
  cache.clear();
}

/**
 * Generic read-through against the in-process cache, honouring
 * BRANDING_BUNDLE_MAX_STALENESS_MS. Exposed (and `now` injectable) so the AC-3
 * freshness contract is unit-testable without a live DB. A cached entry younger
 * than the TTL is returned as-is; otherwise `fetch` is invoked and the result
 * cached. `invalidatePariwarPassport(id)` forces the next call to re-fetch.
 */
export async function readThroughBrandingCache(
  id: PariwarId,
  fetch: () => Promise<PariwarPassportRow | null>,
  now: () => number = Date.now,
): Promise<PariwarPassportRow | null> {
  const entry = cache.get(id);
  if (entry && now() - entry.fetchedAt < BRANDING_BUNDLE_MAX_STALENESS_MS) {
    return entry.value;
  }
  const value = await fetch();
  cache.set(id, { value, fetchedAt: now() });
  return value;
}

/**
 * Cache-aside read: serves a cached passport within the 60s ceiling, otherwise
 * reads fresh-from-DB and caches. Most chrome reads should go through here; a
 * path that needs guaranteed freshness calls getPariwarPassport directly.
 */
export function getPariwarPassportCached(
  db: Db,
  id: PariwarId,
  now: () => number = Date.now,
): Promise<PariwarPassportRow | null> {
  return readThroughBrandingCache(id, () => getPariwarPassport(db, id), now);
}

/**
 * Cache-aside read of just the branding bundle, honouring the 60s staleness
 * ceiling. Use this instead of getBrandingBundle for chrome renders — it avoids
 * a DB hit on every request. A path that needs guaranteed freshness should call
 * getBrandingBundle directly.
 */
export async function getBrandingBundleCached(
  db: Db,
  id: PariwarId,
  now: () => number = Date.now,
): Promise<BrandingBundle | null> {
  const row = await getPariwarPassportCached(db, id, now);
  return row?.brandingBundle ?? null;
}
