// The FR-12A validity CACHE-ASIDE wrapper — Story 4.8 (Task 3; AC2, AC3, D1-A, D5-A).
//
// `getValidityCached` sits in FRONT of Story 4.6's `getValidity` and delivers the p95<200ms@4L budget
// while making stale validity STRUCTURALLY IMPOSSIBLE. It is the framework-agnostic composition every
// surface shares (apps/api handlers today) — same D1-A rationale as 4.6, so the redaction + audit contract
// stays HERE, not per-app.
//
// ── THE load-bearing invariant: cache participation is OPTIONAL; correctness is MANDATORY ─────────────
// The cache is a latency optimization layered BESIDE the correctness path, never ON it. If the cache
// table / the epoch lookup / the key resolution / the integrity check / the cache write path fails or is
// uncertain for ANY reason, the request MUST still succeed by direct recomputation through `getValidity`,
// and MUST NEVER serve a value whose freshness cannot be guaranteed (AC2). Concretely:
//   · Reads are best-effort → a failed/absent/uncertain read degrades to recompute (conservative-recompute
//     fallback). Two of the four AC2 examples (cohort ambiguous, broadcast delayed) and AC2d (clock
//     anomaly) are structurally foreclosed by this story's chosen mechanism (D2-A/D4-A/DB-side TTL) — see
//     `ValidityCacheFallbackReason` — leaving `backend_error` (AC2c) + `scope_low_confidence` as the two
//     reachable reasons. This IS the AC2 rule, not a narrowing of it: freshness-uncertain always recomputes.
//   · Writes are best-effort AND non-blocking to success → the return value is FIXED to the recomputed
//     payload BEFORE the write is attempted; a write throw is swallowed + observed, never surfaced.
//   · A poisoned hit (stored hash ≠ embedded hash) → recompute + overwrite + observe, never a failure.
//
// ── D5-A: compute-core is cached; ACCESS (audit + redaction) stays in this wrapper ───────────────────
// The cache stores ONLY the FULL, unredacted payload (`getValidity(..., { internal: true })`). The admin
// `validity.evaluate` access-audit is a per-READ record — it MUST fire on a HIT exactly as on a miss — and
// redaction is per-caller on the returned full payload. Both live here, OUTSIDE the cached core. The
// engine's lower-level per-clause compute-audit correctly does NOT fire on a hit (nothing was computed).

import { validityCache, type ids } from '@twt/domain';

import {
  NOOP_CACHE_OBSERVER,
  type ValidityCacheFallbackReason,
  type ValidityCacheObserver,
  type ValidityCacheOutcome,
} from './cache-observability.js';
import { assertCanReadValidity, redactForCaller } from './redaction.js';
import { auditValidityRead, getValidity, type ValidityServiceDeps, type ValidityServiceOptions } from './service.js';
import type { MemberValidityPayload } from './types.js';

/** getValidityCached options = the service options + an optional observability sink (Task 5). */
export type ValidityCachedOptions = ValidityServiceOptions & { observer?: ValidityCacheObserver };

/** Classify a cache-path failure into an AC2 fallback reason (the only two this mechanism can produce). */
function classifyFallback(err: unknown): ValidityCacheFallbackReason {
  if (err instanceof validityCache.ValidityCacheKeyUnresolvedError) return 'scope_low_confidence';
  return 'backend_error';
}

/**
 * Live validity through the per-cohort cache (AC1/AC2). Mirrors `getValidity`'s signature + access
 * semantics (caller XOR internal; access-check; audit admin non-self reads; redact per caller) but serves
 * from `member_validity_cache` when a fresh entry exists, and falls back to direct recomputation whenever
 * freshness cannot be guaranteed. Only the DEFAULT-options, live-`now()` path is cacheable — a supplied
 * `lapseNetting`/`concealmentAssessment` changes the payload but is NOT in the cache key, so it bypasses
 * the cache entirely (read AND write); historical `getValidityAt` reads are never cached.
 */
export async function getValidityCached(
  deps: ValidityServiceDeps,
  memberCtx: { pariwarId: ids.PariwarId; memberId: ids.MemberId },
  opts: ValidityCachedOptions = {},
): Promise<MemberValidityPayload> {
  // (0) Every call is an explicit caller (RBAC-checked) or an explicit internal marker — mirror
  //     getValidityAt step 0 (a forgotten caller fails LOUD, never silently gets unaudited full access).
  if (!opts.caller && !opts.internal) {
    throw new Error(
      '[getValidityCached] opts.caller or opts.internal must be supplied — pass { internal: true } for a genuine trusted internal/system call.',
    );
  }
  if (opts.caller) assertCanReadValidity(opts.caller);

  // (1) Non-cacheable options → delegate to getValidity (it does its OWN audit + redact). lapseNetting /
  //     concealmentAssessment change the payload but are not covered by the cache key, so caching them
  //     would risk serving one caller's assessment-bearing payload to another. Bypass read AND write.
  const cacheable = opts.lapseNetting === undefined && opts.concealmentAssessment === undefined;
  if (!cacheable) {
    return getValidity(deps, memberCtx, opts);
  }

  const observer = opts.observer ?? NOOP_CACHE_OBSERVER;
  const t0 = Date.now();

  // (2) Cache-aside for the FULL unredacted payload, FULLY fail-open. Phase A (key resolve + fresh read)
  //     never throws out — any failure/uncertainty is classified to an outcome and degrades to recompute.
  let cachedHit: MemberValidityPayload | null = null;
  let key: validityCache.ValidityCacheKey | undefined;
  let outcome: ValidityCacheOutcome;
  try {
    key = await validityCache.resolveCacheKey(deps.db, memberCtx.pariwarId, memberCtx.memberId);
    const row = await validityCache.readFreshCacheRow(deps.db, key, validityCache.VALIDITY_CACHE_TTL_SECONDS);
    if (row) {
      const cached = row.payload as unknown as MemberValidityPayload;
      // Cheap hit-path self-consistency check ONLY (embedded hash vs. the stored column) — NEVER a
      // recompute-per-hit. A disagreement ≡ a poisoned entry → recompute + overwrite below.
      if (cached.validityPayloadHash === row.validityPayloadHash) {
        cachedHit = cached;
        outcome = { kind: 'hit' };
      } else {
        outcome = { kind: 'poisoned' };
      }
    } else {
      outcome = { kind: 'miss' };
    }
  } catch (err) {
    // AC2 conservative-recompute fallback: recompute, return fresh, never serve stale, never fail.
    outcome = { kind: 'fallback', reason: classifyFallback(err) };
    key = undefined; // key untrustworthy → do NOT write under it.
  }

  // (3) Resolve the full payload. A HIT uses the cached value; otherwise RECOMPUTE (the correctness path —
  //     an error HERE is a genuine validity-computation failure and MUST propagate, unlike a cache error).
  let full: MemberValidityPayload;
  if (cachedHit) {
    full = cachedHit;
  } else {
    full = await getValidity(deps, memberCtx, { internal: true });
    // Best-effort populate — ONLY when the key is trustworthy (miss / poisoned; NOT a key-resolve
    // fallback). The write runs in its OWN try/catch AFTER `full` is fixed: a write throw is swallowed +
    // observed, NEVER able to turn this successful computation into a failed request. Runs on an ISOLATED
    // connection (its own BEGIN/COMMIT via `deps.servicePool`, mirroring `auditValidityRead`), NOT the
    // caller's own `deps.db` — so a genuine Postgres-level write failure can never poison the request's
    // own scoped transaction (code review 2026-07-05).
    if (key) {
      try {
        await validityCache.writeCacheRowIsolated(
          deps.servicePool,
          key,
          memberCtx.pariwarId,
          full as unknown as Record<string, unknown>,
          full.validityPayloadHash,
        );
      } catch (writeErr) {
        observer.onCacheWriteError?.(writeErr, String(memberCtx.pariwarId));
      }
    }
  }

  observer.onCacheEvent({ outcome, pariwarId: String(memberCtx.pariwarId), durationMs: Date.now() - t0 });

  // (4) D5-A ACCESS wrapper (outside the cached core): audit admin non-self reads on HIT AND miss (a
  //     per-READ access record), then redact per caller. An internal call → full unredacted, unaudited.
  if (opts.caller && !opts.caller.isSelf) {
    await auditValidityRead(deps, memberCtx, full, opts.caller);
  }
  return opts.caller ? redactForCaller(full, opts.caller) : full;
}
