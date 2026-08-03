// Moderation → `is_valid` — live-DB integration (Story 10.10, Task 3; AC5; :5433).
//
// Decision 8 makes the `deriveIsValid` conjunction the ENTIRE enforcement surface for moderation:
// pool assignability, claim eligibility and the rules engine all inherit a suspension through
// `payload.isValid` with no code change of their own. That concentration buys enormous simplicity
// and creates exactly ONE catastrophic failure mode, which this spec exists to close:
//
//   ⚠ A STALE VALIDITY CACHE WOULD HAND A SUSPENDED MEMBER TO A POOL SPAWN.
//
// `apps/jobs/src/assignable-roster.ts` reads `payload.isValid` and NOTHING else (the frozen AI-7-2
// invariant). If the Story 4.8 cache did not invalidate on a `member.moderation.*` append, a warm
// pre-suspension entry would keep answering `is_valid: true` for the whole TTL, and the roster would
// assign a suspended member. So the cache test below is an AC, not a nicety.
//
// FINDING (recorded in the Dev Agent Record): NO new wiring was needed. Migration 0036's
// `member_validity_cache_invalidate_on_member_event` trigger fires
// `WHEN (NEW.event_type LIKE 'member.%')`, and `member.moderation.suspended` matches that prefix —
// so the three new event types were already covered by construction. This spec PROVES it rather
// than assuming it, and it is what would fail if someone ever narrowed that WHEN clause to an
// explicit event-type list.
//
// Own-committing (NOT setupLiveDb): the cache write + audit writer COMMIT their own tx; assertions
// key on our own rows, NEVER global counts ([[project_live_db_test_gotchas]]).

import { randomUUID } from 'node:crypto';

import { createDb, idempotency, ids, schema, type Db } from '@twt/domain';
import type pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { getValidity, getValidityCached, type ValidityServiceDeps } from '../../src/index.js';
import { R12_PAYLOAD } from '../fixtures/r12-clause.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);

describe.skipIf(!hasDatabase)('moderation folds into is_valid (live DB) (:5433)', () => {
  let db: Db;
  let pool: pg.Pool;
  let deps: ValidityServiceDeps;
  const pariwars: string[] = [];

  beforeAll(async () => {
    if (!hasDatabase) return;
    const created = createDb(DATABASE_URL as string);
    db = created.db;
    pool = created.pool;
    deps = { db, keyedStore: idempotency.createKeyedStore(pool), servicePool: pool };
  });

  afterAll(async () => {
    if (!hasDatabase) return;
    if (pariwars.length > 0) {
      // WARNING: `events_log` is APPEND-ONLY (AR-8 — a DELETE trips its own trigger), so seeded
      // events are deliberately left in place. Every test uses a fresh random pariwarId + memberId,
      // so the residue is unaddressable by any other test (assert membership, not counts).
      for (const t of ['member_validity_cache', 'cohort_invalidation_epochs', 'clause_versions', 'members']) {
        await pool.query(`DELETE FROM ${t} WHERE pariwar_id = ANY($1)`, [pariwars]);
      }
    }
    await pool.end();
  });

  async function seedEvent(
    pariwarId: ids.PariwarId,
    memberId: ids.MemberId,
    version: number,
    eventType: string,
    occurredAt: Date,
    payload: Record<string, unknown> = {},
  ): Promise<void> {
    await db.insert(schema.eventsLog).values({
      streamId: memberId,
      eventType,
      payload,
      eventVersion: version,
      actorId: null,
      pariwarId,
      occurredAt,
    });
  }

  /** A fresh tenant + an ACTIVE member (the chain that replays to `active`). */
  async function scenario(): Promise<{ pariwarId: ids.PariwarId; memberId: ids.MemberId; joinedAt: Date }> {
    const pariwarId = ids.pariwarId(randomUUID());
    const memberId = ids.memberId(randomUUID());
    pariwars.push(pariwarId);
    const joinedAt = new Date(Date.now() - 400 * 24 * 60 * 60 * 1000);
    const at = (n: number): Date => new Date(joinedAt.getTime() + n * 1000);
    await seedEvent(pariwarId, memberId, 1, 'member.signup_initiated', joinedAt);
    await seedEvent(pariwarId, memberId, 2, 'member.kyc_completed', at(2));
    await seedEvent(pariwarId, memberId, 3, 'member.vyawastha_shulk_paid', at(3));
    await seedEvent(pariwarId, memberId, 4, 'member.lock_in_expired', at(4), { kyc_verified: true });
    return { pariwarId, memberId, joinedAt };
  }

  /**
   * Append a moderation event.
   *
   * WARNING: stamped in the recent PAST, not at `new Date()`. `getValidity` bounds the replay window
   * at the DB's `now()`, and the Node clock (in Docker, on macOS) can run a few ms AHEAD of
   * Postgres — an event stamped with the Node clock can land outside the window and be silently
   * skipped. The fold orders by `event_version` regardless, so back-dating changes nothing about the
   * outcome under test; it only removes the skew flake.
   */
  async function moderate(
    pariwarId: ids.PariwarId,
    memberId: ids.MemberId,
    version: number,
    eventType: string,
    reasonCode: string,
    from: string,
    to: string,
  ): Promise<void> {
    const occurredAt = new Date(Date.now() - 60_000 + version * 1000);
    await seedEvent(pariwarId, memberId, version, eventType, occurredAt, {
      from_state: 'active',
      to_state: 'active',
      trigger: 'test',
      actor: 'trustee',
      moderation_from: from,
      moderation_to: to,
      reason_code: reasonCode,
    });
  }

  async function cacheRowCount(memberId: ids.MemberId): Promise<number> {
    const res = await pool.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM member_validity_cache WHERE member_id = $1`,
      [memberId],
    );
    return res.rows[0]?.n ?? 0;
  }

  it('AC5: is_valid flips FALSE on suspend and TRUE again on restore', async () => {
    const { pariwarId, memberId } = await scenario();
    const ctx = { pariwarId, memberId };

    const before = await getValidity(deps, ctx, { internal: true });
    expect(before.isValid).toBe(true);
    expect(before.isActive).toBe(true);
    expect(before.specialFlags.some((f) => f.startsWith('suspended_per_'))).toBe(false);

    await moderate(pariwarId, memberId, 5, 'member.moderation.suspended', 'r14-forgery', 'none', 'suspended');
    const suspended = await getValidity(deps, ctx, { internal: true });
    expect(suspended.isValid).toBe(false);
    expect(suspended.isActive).toBe(false);
    // The `prd.md:411` flag form, MEMBER-VISIBLE so the member can be told why.
    expect(suspended.specialFlags).toContain('suspended_per_r14-forgery');

    await moderate(pariwarId, memberId, 6, 'member.moderation.restored', 'moderation-error', 'suspended', 'none');
    const restored = await getValidity(deps, ctx, { internal: true });
    expect(restored.isValid).toBe(true);
    expect(restored.isActive).toBe(true);
    expect(restored.specialFlags.some((f) => f.startsWith('suspended_per_'))).toBe(false);
  });

  it('AC5: a TERMINATION also flips is_valid false, with the terminated_per_ flag', async () => {
    const { pariwarId, memberId } = await scenario();
    await moderate(pariwarId, memberId, 5, 'member.moderation.suspended', 'r14-forgery', 'none', 'suspended');
    await moderate(pariwarId, memberId, 6, 'member.moderation.terminated', 'r14-forgery', 'suspended', 'terminated');

    const p = await getValidity(deps, { pariwarId, memberId }, { internal: true });
    expect(p.isValid).toBe(false);
    expect(p.specialFlags).toContain('terminated_per_r14-forgery');
  });

  it('AC5: is_valid falls ONLY because of the moderation conjunction — every lifecycle-derived field is byte-identical', async () => {
    // The orthogonality Decision 1 buys, asserted at the composition level: suspend a member, and
    // EVERY lifecycle-derived sub-object of the payload must come back unchanged. Only `isValid`,
    // `isActive` and the one added special flag may move. If a future edit ever routed moderation
    // through `members.state` instead of the overlay, the lock-in / renewal / retirement projections
    // would shift with it and this test would fail.
    //
    // The stronger end-to-end claim — that the `members.state` COLUMN never moves — is proven where
    // it can actually be observed: the apps/api integration spec drives the REAL projector and reads
    // the column back, and the domain unit test pins the reducer identity structurally. This spec
    // seeds raw events (no projector), so there is no `members` row here to inspect.
    const { pariwarId, memberId } = await scenario();
    const ctx = { pariwarId, memberId };

    const before = await getValidity(deps, ctx, { internal: true });
    await moderate(pariwarId, memberId, 5, 'member.moderation.suspended', 'r14-forgery', 'none', 'suspended');
    const after = await getValidity(deps, ctx, { internal: true });

    expect(before.isValid).toBe(true);
    expect(after.isValid).toBe(false);

    // Everything lifecycle-derived is untouched.
    expect(after.lockInStatus).toEqual(before.lockInStatus);
    expect(after.vyawasthaShulkStatus).toEqual(before.vyawasthaShulkStatus);
    expect(after.retirementCoverage).toEqual(before.retirementCoverage);
    expect(after.medicalDisclosureFlags).toEqual(before.medicalDisclosureFlags);
    expect(after.applicableNiyamavaliClauses).toEqual(before.applicableNiyamavaliClauses);
    // The ONLY special-flag delta is the moderation entry.
    expect(after.specialFlags.filter((f) => !f.startsWith('suspended_per_'))).toEqual(before.specialFlags);
  });

  // ── ⚠ THE WORST FAILURE MODE — the stale-cache test (AC5) ────────────────────────────────────

  it('AC5: a WARM cache does NOT survive a suspension — a stale is_valid:true is impossible', async () => {
    const { pariwarId, memberId } = await scenario();
    const ctx = { pariwarId, memberId };

    // (1) Warm the cache with a pre-suspension read. This is the dangerous state: a live entry
    //     saying `is_valid: true`, well inside its TTL.
    const warm = await getValidityCached(deps, ctx, { internal: true });
    expect(warm.isValid).toBe(true);
    expect(await cacheRowCount(memberId)).toBeGreaterThan(0);

    // (2) Suspend. The migration-0036 AFTER-INSERT trigger on events_log fires
    //     `WHEN (NEW.event_type LIKE 'member.%')` — which `member.moderation.suspended` matches —
    //     and DELETEs this member's cache rows in the SAME tx as the append.
    await moderate(pariwarId, memberId, 5, 'member.moderation.suspended', 'r7-contribution-discipline', 'none', 'suspended');
    expect(await cacheRowCount(memberId)).toBe(0);

    // (3) The next CACHED read must recompute and answer FALSE. If this ever returns true, the
    //     assignable roster would hand a suspended member a pool slot.
    const afterSuspend = await getValidityCached(deps, ctx, { internal: true });
    expect(afterSuspend.isValid).toBe(false);
    expect(afterSuspend.specialFlags).toContain('suspended_per_r7-contribution-discipline');

    // (4) …and a restore invalidates again, so the member is not stuck invalid either.
    await moderate(pariwarId, memberId, 6, 'member.moderation.restored', 'rule-clearance', 'suspended', 'none');
    expect(await cacheRowCount(memberId)).toBe(0);
    expect((await getValidityCached(deps, ctx, { internal: true })).isValid).toBe(true);
  });

  it('AC5: the cached answer is IDENTICAL to a fresh recompute (hit ≡ recompute, under moderation)', async () => {
    const { pariwarId, memberId } = await scenario();
    const ctx = { pariwarId, memberId };
    await moderate(pariwarId, memberId, 5, 'member.moderation.suspended', 'regulator-action', 'none', 'suspended');

    const cached = await getValidityCached(deps, ctx, { internal: true });
    const fresh = await getValidity(deps, ctx, { internal: true });
    expect(cached.isValid).toBe(fresh.isValid);
    expect(cached.specialFlags).toEqual(fresh.specialFlags);
    expect(cached.validityPayloadHash).toBe(fresh.validityPayloadHash);
  });

  // ── AC5: the no-downstream-change property ───────────────────────────────────────────────────

  it('AC5: a suspended member drops out of assignability through `is_valid` ALONE', async () => {
    // `apps/jobs/src/assignable-roster.ts` computes assignability as EXACTLY
    // `payload.isValid` — never `is_active`, never a lock-in/grace/suspension subfield (the frozen
    // AI-7-2 invariant, [[project_assignability_predicate_is_isvalid_only]]). This test replicates
    // that ONE predicate here rather than importing apps/jobs (a package cannot depend on an app),
    // proving the exclusion needs NO roster-side change — `apps/jobs` is untouched by this story.
    const assignable = (p: { isValid: boolean }): boolean => p.isValid;

    const { pariwarId, memberId } = await scenario();
    const ctx = { pariwarId, memberId };

    expect(assignable(await getValidity(deps, ctx, { internal: true }))).toBe(true);

    await moderate(pariwarId, memberId, 5, 'member.moderation.suspended', 'r14-forgery', 'none', 'suspended');
    expect(assignable(await getValidity(deps, ctx, { internal: true }))).toBe(false);

    await moderate(pariwarId, memberId, 6, 'member.moderation.restored', 'trustee-discretion', 'suspended', 'none');
    expect(assignable(await getValidity(deps, ctx, { internal: true }))).toBe(true);
  });

  void R12_PAYLOAD; // the R12 clause is not seeded here — validity resolves without it (clause_unavailable).
});
