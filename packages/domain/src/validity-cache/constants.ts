// Validity-cache tunables — Story 4.8.
//
// The two time bounds are the §1.10 committed properties, surfaced as named constants so the read guard
// (validity-service) and the GC sweep (apps/jobs) share ONE authority and cannot drift.

/**
 * The v1 cohort ruleset-generation sentinel. There is no per-Pariwar Niyamavali version counter yet, so
 * every member resolves ONE cohort per Pariwar under this value; the `cohort_invalidation_epochs` epoch
 * carries invalidation. A forward seam — activates unchanged when real niyamavali versioning lands.
 */
export const CURRENT_NIYAMAVALI_VERSION = 'v1';

/**
 * §1.10's committed **60s TTL** — the ONLY bound on the pure-time-passage change vector (`daysUntilGrace
 * Ends` countdowns, `projectLockInStatus` in-lock-in→unlocked date flip — neither fires an event). A
 * cache HIT requires `computed_at` within this many seconds of DB-authoritative `now()`; an expired row
 * ≡ a miss. NOT redundant with the key-based (evented) invalidation — see the "Three change vectors"
 * Dev Note.
 */
export const VALIDITY_CACHE_TTL_SECONDS = 60;

/**
 * GC-sweep age threshold (storage hygiene ONLY — never correctness; an expired row is already unservable
 * via the TTL guard above). A small multiple of the TTL (10× = 10 min): amendment epoch bumps + member
 * -state changes orphan old rows that no read will ever address again; this reclaims them. Overridable in
 * apps/jobs like the cron cadences.
 */
export const VALIDITY_CACHE_GC_MAX_AGE_SECONDS = 600;
