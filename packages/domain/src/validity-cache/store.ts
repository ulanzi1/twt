// Validity-cache store — Story 4.8 (Task 2 + Task 3 substrate; AC1, AC2, D1-A).
//
// The cheap cache-KEY resolution + the low-level `member_validity_cache` read/write/delete/GC. The
// orchestration (cache-aside flow, TTL decision, fail-open fallback, best-effort write) lives in
// @twt/validity-service `getValidityCached`; THIS module owns only the table access + the key derivation,
// so the SQL stays in the table's home package and the GC job (apps/jobs) reuses it.
//
// ── The crux: the key is resolved from CHEAP metadata reads only (never the full payload) ─────────────
// A cache that had to compute the payload to derive its key would save nothing. So:
//   · member_state_hash  ← a SHA-256 over the member's cheap **state watermark** = the latest member-stream
//     `event_version` (one index-only `max` on events_log). It advances on EVERY member.% event (incl.
//     identity-transition events like member.medical_disclosed that do NOT change members.state), so the
//     key shifts synchronously on any member-fact change. Paired with the D3-A trigger DELETE, this makes
//     member-vector staleness structurally impossible (see the ordering note on resolveCacheKey).
//   · rule_registry_version ← the cohort's niyamavali-version sentinel (CURRENT_NIYAMAVALI_VERSION); cheap
//     + stable. Amendment invalidation is carried by the epoch, not this component (v1).
//   · cohort_invalidation_epoch ← one `SELECT epoch` on cohort_invalidation_epochs (readCohortEpoch).
// Reuses `canonicalJsonStringify` (RFC 8785) for the hash input — never a bespoke JSON.stringify.

import { createHash } from 'node:crypto';

import { and, eq, max, sql } from 'drizzle-orm';
import type pg from 'pg';

import { canonicalJsonStringify, type CanonicalJsonValue } from '../canonical-json.js';
import { bindScopedDb, type Db } from '../db.js';
import type { MemberId, PariwarId } from '../ids/index.js';
import { eventsLog } from '../schema/events_log.js';
import { memberValidityCache, type MemberValidityCacheRow } from '../schema/member_validity_cache.js';
import { CURRENT_NIYAMAVALI_VERSION, VALIDITY_CACHE_GC_MAX_AGE_SECONDS } from './constants.js';
import { readCohortEpoch } from './epoch.js';

/** The AC1 composite cache key `(member_id, member_state_hash, rule_registry_version, cohort_epoch)`. */
export interface ValidityCacheKey {
  memberId: MemberId;
  memberStateHash: string;
  ruleRegistryVersion: string;
  cohortInvalidationEpoch: number;
}

/** Thrown when the cheap key cannot be resolved with confidence → the caller must fall back to recompute. */
export class ValidityCacheKeyUnresolvedError extends Error {
  constructor(message: string) {
    super(`[validity-cache] key unresolved — ${message}`);
    this.name = 'ValidityCacheKeyUnresolvedError';
  }
}

function sha256Hex(canonicalInput: string): string {
  return createHash('sha256').update(canonicalInput, 'utf8').digest('hex');
}

/** SHA-256 over the member's cheap state watermark — the member-level key component (per AC1). */
export function computeMemberStateHash(memberId: MemberId, watermark: number): string {
  return sha256Hex(canonicalJsonStringify({ memberId, watermark } as unknown as CanonicalJsonValue));
}

/**
 * The member's cheap state watermark = the latest `event_version` on the member's stream (index-only
 * `max` over `events_log_pariwar_stream_idx`). `null` when the member has NO events — a member row always
 * has ≥1 event (signup_initiated), so `null` signals an anomalous / uncertain read → the caller falls
 * back to recompute rather than cache under an untrustworthy key.
 */
export async function resolveMemberWatermark(
  db: Db,
  pariwarId: PariwarId,
  memberId: MemberId,
): Promise<number | null> {
  const rows = await db
    .select({ w: max(eventsLog.eventVersion) })
    .from(eventsLog)
    .where(and(eq(eventsLog.pariwarId, pariwarId), eq(eventsLog.streamId, memberId)));
  return rows[0]?.w ?? null;
}

/**
 * Resolve the four-part cache key from cheap reads. Resolve the watermark + epoch BEFORE the caller
 * recomputes, so the cached payload can only be ≥ as fresh as the key it is written under (the recompute
 * reads state as-of `now()` ≥ the watermark instant) — i.e. a currently-resolvable key never addresses an
 * OLDER payload. That ordering, plus the D3-A trigger DELETE, is what forecloses the read-through
 * stale-write race for the member change vector.
 */
export async function resolveCacheKey(
  db: Db,
  pariwarId: PariwarId,
  memberId: MemberId,
): Promise<ValidityCacheKey> {
  const watermark = await resolveMemberWatermark(db, pariwarId, memberId);
  if (watermark === null) {
    throw new ValidityCacheKeyUnresolvedError(`no member-stream events for ${memberId}`);
  }
  const cohortInvalidationEpoch = await readCohortEpoch(db, pariwarId);
  return {
    memberId,
    memberStateHash: computeMemberStateHash(memberId, watermark),
    ruleRegistryVersion: CURRENT_NIYAMAVALI_VERSION,
    cohortInvalidationEpoch,
  };
}

/**
 * Read the cache row for `key` IF it is fresh within `ttlSeconds` of DB-authoritative `now()` (§1.10 60s
 * TTL + §1.11 DB time). The TTL predicate is evaluated in the DB, which also neutralizes the AC2(d)
 * clock-skew case for this check. An expired row ≡ a miss (`null`).
 */
export async function readFreshCacheRow(
  db: Db,
  key: ValidityCacheKey,
  ttlSeconds: number,
): Promise<MemberValidityCacheRow | null> {
  const rows = await db
    .select()
    .from(memberValidityCache)
    .where(
      and(
        eq(memberValidityCache.memberId, key.memberId),
        eq(memberValidityCache.memberStateHash, key.memberStateHash),
        eq(memberValidityCache.ruleRegistryVersion, key.ruleRegistryVersion),
        eq(memberValidityCache.cohortInvalidationEpoch, key.cohortInvalidationEpoch),
        sql`${memberValidityCache.computedAt} > now() - make_interval(secs => ${ttlSeconds})`,
      ),
    );
  return rows[0] ?? null;
}

/**
 * Best-effort UPSERT of a recomputed payload under `key` (INSERT, or overwrite an existing/poisoned row).
 * `computed_at` is stamped to DB `now()`. The CALLER wraps this in its own try/catch — a write failure
 * must NEVER turn a successful recomputation into a failed request (the "cache writes are non-blocking to
 * success" invariant).
 */
export async function writeCacheRow(
  db: Db,
  key: ValidityCacheKey,
  pariwarId: PariwarId,
  payload: Record<string, unknown>,
  validityPayloadHash: string,
): Promise<void> {
  await db
    .insert(memberValidityCache)
    .values({
      memberId: key.memberId,
      memberStateHash: key.memberStateHash,
      ruleRegistryVersion: key.ruleRegistryVersion,
      cohortInvalidationEpoch: key.cohortInvalidationEpoch,
      pariwarId,
      payload,
      validityPayloadHash,
    })
    .onConflictDoUpdate({
      target: [
        memberValidityCache.memberId,
        memberValidityCache.memberStateHash,
        memberValidityCache.ruleRegistryVersion,
        memberValidityCache.cohortInvalidationEpoch,
      ],
      set: { payload, validityPayloadHash, computedAt: sql`now()` },
    });
}

/**
 * Best-effort UPSERT on an ISOLATED connection — its OWN `BEGIN`/`COMMIT`, never the caller's own
 * transaction. Code review 2026-07-05: `getValidityCached` previously called `writeCacheRow` on the
 * caller's own scoped `db`; a genuine Postgres-level failure there (constraint violation, connection
 * reset, deadlock — as opposed to a JS-level mock throw) would abort the WHOLE enclosing transaction, and
 * a later `COMMIT` on an already-aborted transaction silently downgrades to a no-op `ROLLBACK` — so a
 * best-effort cache-write failure could silently discard unrelated work sharing that request's scoped tx.
 * Running on a dedicated connection (mirrors `audit.writeAuditEntry`'s pattern) means a failure here can
 * NEVER affect the caller's transaction, by construction — no reliance on savepoint/transaction-nesting
 * assumptions that don't hold for every caller (e.g. a non-transactional `db` in tests).
 */
export async function writeCacheRowIsolated(
  pool: pg.Pool,
  key: ValidityCacheKey,
  pariwarId: PariwarId,
  payload: Record<string, unknown>,
  validityPayloadHash: string,
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await writeCacheRow(bindScopedDb(client), key, pariwarId, payload, validityPayloadHash);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}

/**
 * DELETE all of a member's cache rows (the poisoned-entry purge + a manual RTBF backstop). The D3-A
 * `member.%` trigger is the automatic path; this is the imperative equivalent for the read-side handling.
 */
export async function deleteMemberCacheRows(db: Db, memberId: MemberId): Promise<void> {
  await db.delete(memberValidityCache).where(eq(memberValidityCache.memberId, memberId));
}

/**
 * GC sweep — DELETE rows older than `maxAgeSeconds` (storage hygiene ONLY; expired rows are already
 * unservable via the TTL guard). Runs on the BYPASSRLS service pool (apps/jobs) so it reclaims across all
 * tenants — mirrors `idempotency.purgeExpiredKeys`. Returns the number of rows reclaimed.
 */
export async function purgeExpiredValidityCache(
  pool: pg.Pool,
  maxAgeSeconds: number = VALIDITY_CACHE_GC_MAX_AGE_SECONDS,
): Promise<number> {
  const result = await pool.query(
    'DELETE FROM member_validity_cache WHERE computed_at < now() - make_interval(secs => $1)',
    [maxAgeSeconds],
  );
  return result.rowCount ?? 0;
}
