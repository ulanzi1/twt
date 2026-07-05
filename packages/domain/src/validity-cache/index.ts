// @twt/domain `validityCache` namespace — Story 4.8.
//
// The domain-owned substrate for the FR-12A per-cohort validity cache: the cheap key resolution +
// low-level `member_validity_cache` access + the `cohort_invalidation_epochs` bump/read. The cache-aside
// ORCHESTRATION (getValidityCached: fail-open fallback, TTL decision, best-effort write, redaction/audit
// wrapper) lives in @twt/validity-service — this package owns the tables, so it owns their access.

export {
  CURRENT_NIYAMAVALI_VERSION,
  VALIDITY_CACHE_TTL_SECONDS,
  VALIDITY_CACHE_GC_MAX_AGE_SECONDS,
} from './constants.js';

export { bumpCohortEpoch, readCohortEpoch, invalidateAllForPariwar } from './epoch.js';

export {
  computeMemberStateHash,
  resolveMemberWatermark,
  resolveCacheKey,
  readFreshCacheRow,
  writeCacheRow,
  writeCacheRowIsolated,
  deleteMemberCacheRows,
  purgeExpiredValidityCache,
  ValidityCacheKeyUnresolvedError,
  type ValidityCacheKey,
} from './store.js';
