// Validity-cache SUBSTRATE — live-DB integration (Story 4.8, Task 6; :5433).
//
// Exercises the domain-owned pieces against real Postgres (per-test tx rollback): the per-cohort epoch
// bump/read/invalidate-all, the cheap key/watermark resolution, the D3-A `member.%` AFTER INSERT trigger
// DELETE (incl. RTBF purge + WHEN-scope), and RLS tenant isolation of the cache table. The getValidityCached
// ORCHESTRATION (hit/miss/fallback/TTL/audit) lives in @twt/validity-service's own spec.

import { randomUUID } from 'node:crypto';

import { and, eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { memberId as toMemberId, pariwarId as toPariwarId } from '../../../src/ids/index.js';
import * as schema from '../../../src/schema/index.js';
import { hasDatabase, getTx, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import {
  bumpCohortEpoch,
  computeMemberStateHash,
  invalidateAllForPariwar,
  readCohortEpoch,
  resolveCacheKey,
  resolveMemberWatermark,
  ValidityCacheKeyUnresolvedError,
  CURRENT_NIYAMAVALI_VERSION,
} from '../../../src/validity-cache/index.js';
import { enterAppScope, PARIWAR_A, PARIWAR_B } from '../_helpers.js';

describe.skipIf(!hasDatabase)('validity-cache substrate (live DB, tx-rollback) (:5433)', () => {
  setupLiveDb();

  /** Insert a member-stream event directly (superuser — RLS bypassed; the AFTER INSERT trigger fires). */
  async function seedMemberEvent(
    pariwarId: string,
    streamId: string,
    version: number,
    eventType: string,
  ): Promise<void> {
    const { tx } = getTx();
    await tx.insert(schema.eventsLog).values({
      streamId,
      eventType,
      payload: {},
      eventVersion: version,
      actorId: null,
      pariwarId,
    });
  }

  /** Insert one cache row directly (superuser) under a trivially-resolvable key. */
  async function seedCacheRow(pariwarId: string, memberId: string, epoch = 0): Promise<void> {
    const { tx } = getTx();
    await tx.insert(schema.memberValidityCache).values({
      memberId: toMemberId(memberId),
      memberStateHash: 'seed-hash',
      ruleRegistryVersion: CURRENT_NIYAMAVALI_VERSION,
      cohortInvalidationEpoch: epoch,
      pariwarId: toPariwarId(pariwarId),
      payload: { validityPayloadHash: 'seed' },
      validityPayloadHash: 'seed',
    });
  }

  async function cacheRowCount(memberId: string): Promise<number> {
    const { tx } = getTx();
    const rows = await tx
      .select()
      .from(schema.memberValidityCache)
      .where(eq(schema.memberValidityCache.memberId, toMemberId(memberId)));
    return rows.length;
  }

  // ── Epoch bump / read / invalidate-all (D2-A, D4-A, AC1a/AC1c) ─────────────────────────────────────
  it('bumpCohortEpoch increments (absent ≡ 0 → 1 → 2); readCohortEpoch reflects it', async () => {
    const { tx } = getTx();
    const p = toPariwarId(randomUUID());
    expect(await readCohortEpoch(tx, p)).toBe(0); // absent cohort ≡ epoch 0
    expect(await bumpCohortEpoch(tx, p)).toBe(1);
    expect(await bumpCohortEpoch(tx, p)).toBe(2);
    expect(await readCohortEpoch(tx, p)).toBe(2);
    // A different Pariwar is unaffected.
    expect(await readCohortEpoch(tx, toPariwarId(randomUUID()))).toBe(0);
  });

  it('invalidateAllForPariwar bumps a never-amended Pariwar (0 → 1) and an existing one (2 → 3)', async () => {
    const { tx } = getTx();
    const fresh = toPariwarId(randomUUID());
    await invalidateAllForPariwar(tx, fresh); // create-and-bump the current cohort
    expect(await readCohortEpoch(tx, fresh)).toBe(1);

    const existing = toPariwarId(randomUUID());
    await bumpCohortEpoch(tx, existing);
    await bumpCohortEpoch(tx, existing); // epoch = 2
    await invalidateAllForPariwar(tx, existing); // UPDATE bumps → 3 (no double-bump from the INSERT)
    expect(await readCohortEpoch(tx, existing)).toBe(3);
  });

  // ── Cheap key resolution (Task 2; AC1) ────────────────────────────────────────────────────────────
  it('resolveMemberWatermark = max member-stream event_version; key advances with every member event', async () => {
    const { tx } = getTx();
    const p = toPariwarId(randomUUID());
    const m = toMemberId(randomUUID());
    await seedMemberEvent(p, m, 1, 'member.signup_initiated');
    await seedMemberEvent(p, m, 2, 'member.kyc_completed');
    expect(await resolveMemberWatermark(tx, p, m)).toBe(2);

    const keyBefore = await resolveCacheKey(tx, p, m);
    expect(keyBefore.cohortInvalidationEpoch).toBe(0);
    expect(keyBefore.ruleRegistryVersion).toBe(CURRENT_NIYAMAVALI_VERSION);
    expect(keyBefore.memberStateHash).toBe(computeMemberStateHash(m, 2));

    // A new member event advances the watermark → a different member_state_hash (evented freshness).
    await seedMemberEvent(p, m, 3, 'member.medical_disclosed');
    const keyAfter = await resolveCacheKey(tx, p, m);
    expect(keyAfter.memberStateHash).toBe(computeMemberStateHash(m, 3));
    expect(keyAfter.memberStateHash).not.toBe(keyBefore.memberStateHash);
  });

  it('resolveCacheKey throws (→ caller falls back) for a member with no stream events', async () => {
    const { tx } = getTx();
    await expect(
      resolveCacheKey(tx, toPariwarId(randomUUID()), toMemberId(randomUUID())),
    ).rejects.toBeInstanceOf(ValidityCacheKeyUnresolvedError);
  });

  // ── D3-A trigger DELETE + RTBF purge (Task 4; AC1b) ───────────────────────────────────────────────
  it('a member.% event DELETEs that member’s cache rows (RTBF purge; D3-A trigger)', async () => {
    const p = randomUUID();
    const m = randomUUID();
    await seedCacheRow(p, m);
    expect(await cacheRowCount(m)).toBe(1);
    // The RTBF terminal event fires the trigger → the full-payload rows (medical/concealment flags) purge.
    await seedMemberEvent(p, m, 1, 'member.rtbf_anonymized');
    expect(await cacheRowCount(m)).toBe(0);
  });

  it('the trigger is scoped to member.% — a non-member event on the stream does NOT purge', async () => {
    const p = randomUUID();
    const m = randomUUID();
    await seedCacheRow(p, m);
    // A non-`member.%` event (WHEN clause is false) must not delete the cache row.
    await seedMemberEvent(p, m, 1, 'test.created');
    expect(await cacheRowCount(m)).toBe(1);
  });

  it('the trigger purges only the CHANGED member, not other members in the Pariwar', async () => {
    const p = randomUUID();
    const m1 = randomUUID();
    const m2 = randomUUID();
    await seedCacheRow(p, m1);
    await seedCacheRow(p, m2);
    await seedMemberEvent(p, m1, 1, 'member.suspend');
    expect(await cacheRowCount(m1)).toBe(0);
    expect(await cacheRowCount(m2)).toBe(1); // untouched
  });

  // ── twt_service GRANT verification (migration 0036; code-review 2026-07-05) ──────────────────────
  // The migration calls the twt_service GRANT "LOAD-BEARING" for the D3-A trigger firing under
  // background SIE writes, but NO test exercises an actual twt_service-role session — because (mirroring
  // 0013_idempotency-keys-rls.sql's own documented limitation) dev/CI has no distinct `twt_service_login`;
  // the service pool falls back to the superuser `twt_dev_app`, which already bypasses RLS + privilege
  // checks, and `SET ROLE twt_service` (the NOBYPASSRLS group role) would exercise a DIFFERENT, weaker
  // path than production's BYPASSRLS login — not a faithful simulation. What IS testable without that
  // infra: that the GRANT statements actually landed (a missing/misspelled GRANT is a real regression a
  // migration typo could reintroduce silently, since ENABLE/FORCE RLS + the policies are drizzle-checked
  // but the hand-supplemented GRANTs are not).
  it('twt_service actually holds the GRANTed privileges on member_validity_cache + cohort_invalidation_epochs', async () => {
    const { client } = getTx();
    const { rows } = await client.query<{
      cache_select: boolean;
      cache_insert: boolean;
      cache_update: boolean;
      cache_delete: boolean;
      epoch_select: boolean;
      epoch_insert: boolean;
      epoch_update: boolean;
    }>(
      `SELECT
         has_table_privilege('twt_service', 'member_validity_cache', 'SELECT') AS cache_select,
         has_table_privilege('twt_service', 'member_validity_cache', 'INSERT') AS cache_insert,
         has_table_privilege('twt_service', 'member_validity_cache', 'UPDATE') AS cache_update,
         has_table_privilege('twt_service', 'member_validity_cache', 'DELETE') AS cache_delete,
         has_table_privilege('twt_service', 'cohort_invalidation_epochs', 'SELECT') AS epoch_select,
         has_table_privilege('twt_service', 'cohort_invalidation_epochs', 'INSERT') AS epoch_insert,
         has_table_privilege('twt_service', 'cohort_invalidation_epochs', 'UPDATE') AS epoch_update`,
    );
    const row = rows[0];
    expect(row?.cache_select).toBe(true);
    expect(row?.cache_insert).toBe(true);
    expect(row?.cache_update).toBe(true);
    expect(row?.cache_delete).toBe(true); // the D3-A trigger's DELETE + the GC sweep depend on this
    expect(row?.epoch_select).toBe(true);
    expect(row?.epoch_insert).toBe(true);
    expect(row?.epoch_update).toBe(true);
  });

  // ── RLS tenant isolation (Task 6; the cache is scoped exactly like the data it caches) ─────────────
  it('a caller in Pariwar A can never read Pariwar B cache rows (RLS)', async () => {
    const { tx, client } = getTx();
    const mA = randomUUID();
    const mB = randomUUID();
    // Seed both tenants' rows as the Docker superuser (RLS bypassed), THEN shed to twt_app + scope A.
    await seedCacheRow(PARIWAR_A, mA);
    await seedCacheRow(PARIWAR_B, mB);
    await enterAppScope(client, PARIWAR_A);

    const all = await tx.select().from(schema.memberValidityCache);
    expect(all.every((r) => r.pariwarId === PARIWAR_A)).toBe(true);
    expect(all.some((r) => r.memberId === mA)).toBe(true);
    expect(all.some((r) => r.memberId === mB)).toBe(false);

    // Even an explicit WHERE pariwar_id = B returns zero rows under scope A.
    const bRows = await tx
      .select()
      .from(schema.memberValidityCache)
      .where(
        and(
          eq(schema.memberValidityCache.pariwarId, toPariwarId(PARIWAR_B)),
          eq(schema.memberValidityCache.memberId, toMemberId(mB)),
        ),
      );
    expect(bRows).toHaveLength(0);
  });
});
