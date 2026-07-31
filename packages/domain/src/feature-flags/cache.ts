// The flag-lookup cache — Story 10.8 (Task 3; AC5c, Decision 4).
//
// Story 4.8's cache POSTURE and INVARIANTS, deliberately WITHOUT its machinery (Decision 4,
// confirmed 2026-07-31). The epic's wording is "deterministic + cached per Story 4.8 pattern"
// (epics.md:3514); the load-bearing part of 4.8 is its invariants, and every one of them is
// inherited here:
//
//   · Cache participation is OPTIONAL; correctness is MANDATORY. The cache sits BESIDE the
//     correctness path, never on it.
//   · Reads are best-effort → any miss/expiry/uncertainty degrades to a direct recompute.
//   · Writes are best-effort and non-blocking → the return value is fixed BEFORE the write.
//   · ⚠ D5-A, and the one this AC turns on: only the COMPUTE CORE is cached. The audit/access layer
//     stays OUTSIDE it (see `resolveFlagAudited`), so an audit fires on a HIT exactly as on a miss.
//
// What is deliberately NOT cloned from 4.8: its `member_validity_cache` table, its
// `cohort_invalidation_epochs`, and its `events_log` AFTER-INSERT trigger. That machinery exists
// because a validity recompute is expensive over a large rule registry. A flag lookup is one indexed
// row from a table with tens of rows — a second cache table + epoch bump + trigger would be a real
// maintenance surface bought for a read that is already sub-millisecond. This is a NARROWING of the
// epic's wording to 4.8's invariants rather than its implementation; the full cache-aside table is
// recorded as a seam to revisit if the NFR-FR58C `< 5 ms` budget is ever measured at risk.
//
// ── The mechanism: a short-TTL in-process snapshot, keyed by (flag_key, pariwar_id) ───────────────
// A plain Map with a monotonic-clock expiry. Per-process, so there is no invalidation broadcast to
// get wrong: a flip becomes visible everywhere within TTL_MS, bounded and predictable. That bound is
// the honest cost of this design and it is why the TTL is SHORT — a flag flip is an operator action
// whose effect an operator watches for.

import type { Db } from '../db.js';
import type { PariwarId } from '../ids/index.js';
import { evaluateFlag } from './evaluate.js';
import { flagVersionInForce, type FlagInForce } from './registry.js';
import type { FlagDecision, MemberFlagContext } from './types.js';

/** Snapshot lifetime. Short by design — it is the upper bound on how long a flip takes to be seen. */
export const FLAG_CACHE_TTL_MS = 5_000;

interface CacheEntry {
  value: FlagInForce | null;
  expiresAt: number;
}

/** Module-level snapshot store. ⚠ This is the ONLY mutable state in the feature-flags module, and it
 *  is deliberately NOT reachable from `evaluateFlag` — the evaluator stays pure (AC2). */
const snapshot = new Map<string, CacheEntry>();

function cacheKey(flagKey: string, pariwarId: PariwarId | null): string {
  return `${flagKey}::${pariwarId ?? '__global__'}`;
}

/** Drop every cached entry. For tests and for an operator-triggered refresh after a flip. */
export function clearFlagCache(): void {
  snapshot.clear();
}

/** Observability sink for cache outcomes (perf-only — never affects correctness). */
export type FlagCacheOutcome = 'hit' | 'miss' | 'bypass' | 'backend_error';

export interface FlagLookupOptions {
  /** Skip the cache entirely (the admin console reads live so an operator sees their own flip). */
  bypassCache?: boolean;
  /** Best-effort observability. Never throws into the caller. */
  observe?: (outcome: FlagCacheOutcome, flagKey: string) => void;
}

/**
 * THE CACHED COMPUTE CORE — resolve the flag version in force, memoized.
 *
 * ⚠ NOTHING BUT THE LOOKUP GOES IN HERE. If you find yourself adding an audit write, an access
 * check, or any other per-read obligation to this function, you have built exactly the thing AC5c
 * exists to prevent: a per-read record that silently stops firing as soon as the cache warms.
 * Per-read obligations belong in `resolveFlagAudited` below, outside the memoization.
 */
export async function flagVersionInForceCached(
  db: Db,
  flagKey: string,
  pariwarId: PariwarId | null,
  at: Date,
  options: FlagLookupOptions = {},
): Promise<FlagInForce | null> {
  const observe = options.observe ?? (() => undefined);

  if (options.bypassCache === true) {
    observe('bypass', flagKey);
    return flagVersionInForce(db, flagKey, pariwarId, at);
  }

  const key = cacheKey(flagKey, pariwarId);
  const now = Date.now();
  const cached = snapshot.get(key);
  if (cached && cached.expiresAt > now) {
    observe('hit', flagKey);
    return cached.value;
  }

  let resolved: FlagInForce | null;
  try {
    resolved = await flagVersionInForce(db, flagKey, pariwarId, at);
  } catch (err) {
    // Correctness is mandatory, caching is optional — but a LOOKUP failure is not a cache failure,
    // so it propagates. The caller's seam (Task 9) is what decides the fail-safe default.
    observe('backend_error', flagKey);
    throw err;
  }
  observe('miss', flagKey);

  // Best-effort, non-blocking write: the return value is already fixed above.
  try {
    snapshot.set(key, { value: resolved, expiresAt: now + FLAG_CACHE_TTL_MS });
  } catch {
    // A snapshot write can never be allowed to fail a request.
  }
  return resolved;
}

/** A per-read observation the CALLER performs — the "access layer" in D5-A terms. */
export type FlagAccessObserver = (decision: FlagDecision, source: FlagInForce['source'] | null) => void;

export interface ResolveFlagOptions extends FlagLookupOptions {
  /**
   * ⚠ Fires on EVERY resolution — cache HIT and miss alike — because it is invoked OUTSIDE
   * `flagVersionInForceCached`. That placement is the whole point of AC5c / epics.md:3522
   * ("flag-evaluation code paths cannot disable surrounding audit logging"): a flag evaluation must
   * never be able to suppress the observation that surrounds it, and a caching layer that swallowed
   * the audit would do exactly that without anyone noticing, since the behaviour would look correct
   * until the cache warmed.
   */
  onAccess?: FlagAccessObserver;
}

/**
 * Resolve + evaluate a flag for a member, with the access observation OUTSIDE the cached core.
 *
 * The structure — read it as the AC5c proof:
 *   1. `flagVersionInForceCached(...)`  ← the cached compute core, and ONLY the lookup
 *   2. `evaluateFlag(...)`              ← pure, uncached, cheap
 *   3. `onAccess(...)`                  ← the per-read obligation, outside 1, so it always fires
 */
export async function resolveFlagAudited(
  db: Db,
  flagKey: string,
  pariwarId: PariwarId | null,
  memberContext: MemberFlagContext,
  at: Date,
  callerDefault: boolean,
  options: ResolveFlagOptions = {},
): Promise<FlagDecision> {
  let inForce: FlagInForce | null;
  try {
    inForce = await flagVersionInForceCached(db, flagKey, pariwarId, at, options);
  } catch (err) {
    // The lookup itself failed — AC5c's "fires on every resolution" guarantee is about the ACCESS
    // observation, not about there being a real decision to report. Firing it here, before the
    // rethrow, means a backend failure can never silently skip the audit the way a caching layer
    // that swallowed it would (the exact failure mode AC5c/epics.md:3522 exists to prevent). The
    // caller's own catch (Task 9's seams) still decides the fail-safe behaviour; this only ensures
    // the access layer sees the attempt.
    options.onAccess?.(
      { flagKey, flagVersion: null, enabled: callerDefault, matchedClauseIndex: null, reason: 'lookup_error' },
      null,
    );
    throw err;
  }

  const decision: FlagDecision = inForce
    ? evaluateFlag(inForce.document, memberContext)
    : {
        flagKey,
        flagVersion: null,
        enabled: callerDefault,
        matchedClauseIndex: null,
        reason: 'no_version_in_force',
      };

  options.onAccess?.(decision, inForce?.source ?? null);
  return decision;
}
