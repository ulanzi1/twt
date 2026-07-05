// `member_validity_cache` table — Story 4.8 (Task 1; AC1, D1-A).
//
// The Postgres cache-aside key/value store in FRONT of Story 4.6's `@twt/validity-service`. Delivers
// the FR-12A `p95 < 200ms @ 4L` budget (4.6 measured-and-budgeted the uncached path; D3-A handed the
// 200ms target here) AND makes stale validity STRUCTURALLY IMPOSSIBLE (the conservative-recompute
// fallback + the invalidation triggers + the 60s TTL do the work; this table is just the store).
//
// ── The AC1 cache key IS the primary key ─────────────────────────────────────────────────────────────
// AC1 commits the key composition `(member_id, member_state_hash, rule_registry_version,
// cohort_invalidation_epoch)`. Modelling those four as the composite PK (rather than hashing them into a
// single opaque string) keeps every component queryable/debuggable AND lets the per-member invalidation
// trigger (D3-A) DELETE by the leading `member_id` alone (the RTBF + member-event purge), while a
// cache-aside READ matches all four. An amendment epoch bump / a member-state change resolves a NEW key
// → guaranteed miss → recompute (D2-A: freshness is synchronous, not merely ≤60s).
//
// ── `computed_at` is LOAD-BEARING, not decorative (the 60s TTL guard — §1.10) ────────────────────────
// The four key components cover only the two EVENTED change vectors (amendment + member-state). The
// payload ALSO drifts by pure time passage with NO event — `daysUntilGraceEnds` counts down daily and
// `projectLockInStatus` flips `in-lock-in → unlocked` by a bare date comparison (payload.ts:61-76). The
// §1.10 60s TTL is the ONLY bound on that third vector: a cache HIT requires `computed_at` within 60s of
// DB-authoritative `now()` (§1.11); an expired row ≡ a miss. See validity-service/src/cache.ts.
//
// ── Full unredacted payload cached; redaction stays per-caller on read (D5-A) ────────────────────────
// The stored `payload` is the FULL, unredacted `MemberValidityPayload` (the `getValidity(..., {
// internal: true })` shape). NEVER cache a redacted payload — redaction + the admin access-audit stay in
// the per-access wrapper (validity-service/src/cache.ts) so a HIT audits + redacts exactly like a miss.
// The `payload` jsonb is typed loosely here (Record) to avoid a @twt/domain → @twt/validity-service
// package cycle; validity-service owns the canonical `MemberValidityPayload` type + casts on read/write.
//
// ── RTBF (why the D3-A member trigger DELETEs, never merely orphans) ──────────────────────────────────
// The full payload embeds medical-disclosure / concealment flags. After `member.rtbf_anonymized` an
// unaddressable-but-present row would be a retention leak — the `member.%` AFTER INSERT trigger DELETEs
// the member's rows for free (migration 0036). Tenant-isolated by `pariwar_id` exactly like the data it
// caches (member-validity-cache-rls.ts). Naming discipline: DB columns snake_case, TS fields camelCase.

import { bigint, index, jsonb, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import type { MemberId, PariwarId } from '../ids/index.js';

export const memberValidityCache = pgTable(
  'member_validity_cache',
  {
    // The member whose validity this row caches (== events_log stream_id). Leading PK column so the
    // D3-A per-member invalidation trigger DELETEs by `member_id` alone (RTBF + member-event purge).
    memberId: uuid('member_id').notNull().$type<MemberId>(),

    // AC1 key component: a SHA-256 over the member's cheap state watermark (the latest member-stream
    // `event_version`), so ANY member.% event advances it → a new key (validity-service/src/cache-key.ts).
    memberStateHash: text('member_state_hash').notNull(),

    // AC1 key component: the resolved Niyamavali ruleset generation for the cohort (cheap; the cohort's
    // `niyamavali_version`). Amendment invalidation is carried synchronously by the epoch below; this
    // component moves when a real per-Pariwar niyamavali version lands (deferred).
    ruleRegistryVersion: text('rule_registry_version').notNull(),

    // AC1 key component: the `(pariwar_id, niyamavali_version)` cohort epoch (cohort_invalidation_epochs).
    // Bumped transactionally on amendment publish + trustee "invalidate all" (D2-A) → a new key here.
    cohortInvalidationEpoch: bigint('cohort_invalidation_epoch', { mode: 'number' }).notNull(),

    // Multi-tenant scope (architecture §1.2). RLS predicate column — the cache is tenant-isolated
    // exactly like the member-validity data it caches. Branded.
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),

    // The FULL, unredacted MemberValidityPayload (jsonb). Typed loosely to avoid the domain→
    // validity-service cycle; validity-service casts to `MemberValidityPayload`.
    payload: jsonb('payload').notNull().$type<Record<string, unknown>>(),

    // The payload's own `validityPayloadHash` (excludes `evaluatedAt`; payload.ts:236-263) — the cheap
    // hit-path self-consistency check (stored column vs. the embedded hash). A disagreement ≡ a poisoned
    // entry → recompute + overwrite + log (never a request failure).
    validityPayloadHash: text('validity_payload_hash').notNull(),

    // LOAD-BEARING freshness anchor. A HIT requires `computed_at` within the §1.10 60s TTL of DB `now()`;
    // the GC sweep (apps/jobs) reclaims rows older than a small multiple of the TTL. DB-authoritative.
    computedAt: timestamp('computed_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    // The AC1 cache key = the composite primary key. A cache-aside read matches all four; the D3-A
    // trigger DELETEs by the leading `member_id` (a PK-index prefix scan — no separate index needed).
    primaryKey({
      columns: [t.memberId, t.memberStateHash, t.ruleRegistryVersion, t.cohortInvalidationEpoch],
    }),
    // Per-tenant scans / RLS-aware planner hint (mirror members_pariwar_id_idx).
    index('member_validity_cache_pariwar_id_idx').on(t.pariwarId),
    // The GC sweep deletes by `computed_at` age — index it so the periodic vacuum is a range scan.
    index('member_validity_cache_computed_at_idx').on(t.computedAt),
  ],
);

export type MemberValidityCacheRow = typeof memberValidityCache.$inferSelect;
export type MemberValidityCacheInsert = typeof memberValidityCache.$inferInsert;
