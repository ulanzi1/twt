// Freeze-time assignable-roster → spawn → resolve — live-DB end-to-end proof (AI-7-2; :5433).
//
// THE loop-closing test. It proves the whole 7.4→7.6 path end-to-end against real Postgres, real member
// event streams, and the REAL Story 4.6 Validity Service — the thing the fakes suites and the domain
// integration spec each prove only one half of:
//   1. seed active + pending members + a cycle-freeze commit,
//   2. run the REAL createAssignableRosterResolver → the assignable roster (is_valid members ONLY,
//      evaluated at committed_at) — active members in, pending member out, and DETERMINISTIC on re-run,
//   3. spawn N pools threading that roster through the real spawnChildPool + createPoolAssignmentSeam,
//   4. resolveAssignedPoolForMember (Story 7.6) returns { assigned: true } for the EXACT pool the
//      assignment engine placed a real member in — and { assigned: false } for the non-assignable member.
//
// Before AI-7-2 this was impossible: spawnChildPool hardcoded memberSet:[], so every snapshot was empty
// and 7.6's resolver had to be proven against directly-seeded snapshots. This suite is the resolver
// running against SPAWN-PRODUCED snapshots — the gap closed. Own-committing (the validity idempotency
// store + the spawn writers COMMIT their own tx); assertions key on our own rows, never global counts
// ([[project_live_db_test_gotchas]]). Real CI `test (unit)` runs with DATABASE_URL UNSET → this skips.

import { randomUUID } from 'node:crypto';

import { createDb, ids, pool as poolDomain, withPariwarScope, type CreatedDb } from '@twt/domain';
import type pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createAssignableRosterResolver } from '../src/assignable-roster.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);

const POOL_COUNT = 3;
const FIXED_AMOUNT = 500;

describe.skipIf(!hasDatabase)('assignable-roster → spawn → resolve — end-to-end (live DB :5433)', () => {
  let created: CreatedDb;
  let pool: pg.Pool;
  const memberIds: string[] = [];
  const cycleIds: string[] = [];
  const poolIds: string[] = [];

  beforeAll(() => {
    created = createDb(DATABASE_URL!, { max: 4, ssl: false });
    pool = created.pool;
  });

  /** Best-effort cleanup step: never let a teardown failure crash the suite, but never swallow it
   *  silently either — a failed delete here leaves residue for the NEXT run to trip over. */
  async function cleanupStep(label: string, run: () => Promise<unknown>): Promise<void> {
    try {
      await run();
    } catch (err) {
      console.warn(`[assignable-roster-live.test] cleanup step "${label}" failed (residue may remain): ${String(err)}`);
    }
  }

  afterAll(async () => {
    // Pools + snapshots first (poolId FK-free but scoped by our tracked ids), then member/pool event
    // streams (session_replication_role=replica to bypass the projector triggers), then base rows.
    if (poolIds.length > 0) {
      await cleanupStep('delete pool_snapshots', () =>
        pool.query('DELETE FROM pool_snapshots WHERE pool_id = ANY($1)', [poolIds]),
      );
      await cleanupStep('delete pools', () => pool.query('DELETE FROM pools WHERE pool_id = ANY($1)', [poolIds]));
    }
    const streams = [...memberIds, ...poolIds, ...cycleIds];
    if (streams.length > 0) {
      const c = await pool.connect();
      try {
        await c.query('BEGIN');
        await c.query("SET LOCAL session_replication_role = 'replica'");
        await c.query('DELETE FROM events_log WHERE stream_id = ANY($1)', [streams]);
        await c.query('COMMIT');
      } catch (err) {
        console.warn(`[assignable-roster-live.test] cleanup step "delete events_log" failed (residue may remain): ${String(err)}`);
        await cleanupStep('rollback events_log delete', () => c.query('ROLLBACK'));
      } finally {
        c.release();
      }
    }
    if (memberIds.length > 0) {
      await cleanupStep('delete members', () =>
        pool.query('DELETE FROM members WHERE member_id = ANY($1)', [memberIds]),
      );
    }
    if (cycleIds.length > 0) {
      await cleanupStep('delete cycle_freeze_commits', () =>
        pool.query('DELETE FROM cycle_freeze_commits WHERE commit_id = ANY($1)', [cycleIds]),
      );
    }
    await pool.end();
  });

  /** Insert one events_log row (raw SQL — the seed bypasses @twt/events, which domain can't import). */
  async function seedEvent(
    pariwarId: string,
    memberId: string,
    version: number,
    eventType: string,
    occurredAt: Date,
    payload: Record<string, unknown> = {},
  ): Promise<void> {
    await pool.query(
      `INSERT INTO events_log (stream_id, event_type, payload, event_version, actor_id, pariwar_id, occurred_at)
       VALUES ($1, $2, $3::jsonb, $4, NULL, $5, $6)`,
      [memberId, eventType, JSON.stringify(payload), version, pariwarId, occurredAt.toISOString()],
    );
  }

  /** Seed a member whose event stream replays to `active` (is_valid = true) at/BEFORE `committedAt`. */
  async function seedActiveMember(pariwarId: string, joinedAt: Date): Promise<string> {
    const memberId = randomUUID();
    memberIds.push(memberId);
    const at = (n: number): Date => new Date(joinedAt.getTime() + n * 1000);
    await seedEvent(pariwarId, memberId, 1, 'member.signup_initiated', joinedAt);
    await seedEvent(pariwarId, memberId, 2, 'member.kyc_completed', at(2));
    await seedEvent(pariwarId, memberId, 3, 'member.vyawastha_shulk_paid', at(3));
    await seedEvent(pariwarId, memberId, 4, 'member.lock_in_expired', at(4), { kyc_verified: true });
    await pool.query(
      `INSERT INTO members (member_id, pariwar_id, state, state_event_version, created_at, updated_at)
       VALUES ($1, $2, 'active', 4, now(), now())`,
      [memberId, pariwarId],
    );
    return memberId;
  }

  /** Seed a member who replays only to `pending-kyc` (is_valid = false — NOT assignable). */
  async function seedPendingMember(pariwarId: string, joinedAt: Date): Promise<string> {
    const memberId = randomUUID();
    memberIds.push(memberId);
    await seedEvent(pariwarId, memberId, 1, 'member.signup_initiated', joinedAt);
    await pool.query(
      `INSERT INTO members (member_id, pariwar_id, state, state_event_version, created_at, updated_at)
       VALUES ($1, $2, 'pending-kyc', 1, now(), now())`,
      [memberId, pariwarId],
    );
    return memberId;
  }

  /** Seed the cycle-freeze commit whose `committed_at` validity is evaluated at. */
  async function seedCycle(pariwarId: string, committedAt: Date): Promise<string> {
    const cycleId = randomUUID();
    cycleIds.push(cycleId);
    await pool.query(
      `INSERT INTO cycle_freeze_commits
         (commit_id, pariwar_id, actor_id, actor_display, committed_claim_ids, committed_at, created_at)
       VALUES ($1, $2, 'system', 'System', ARRAY[]::uuid[], $3, now())`,
      [cycleId, pariwarId, committedAt.toISOString()],
    );
    return cycleId;
  }

  /** Spawn N pools for the cycle, threading `roster` through the REAL seam (mirrors runCycleSpawnChild). */
  async function spawnPools(pariwarId: string, cycleId: string, roster: readonly string[]): Promise<void> {
    const seam = poolDomain.createPoolAssignmentSeam();
    for (let i = 0; i < POOL_COUNT; i++) {
      const spec: poolDomain.ChildSpawnSpec = {
        cycleId,
        pariwarId,
        poolIndex: i,
        poolId: poolDomain.derivePoolId(cycleId, i),
        claimCaseId: randomUUID(), // DISTINCT per pool (WrongPoolBindingAmbiguousError guards shared claims)
        poolCanonicalIdentifier: `P-2026-05-00${String(i + 1)}`,
        supportCategory: poolDomain.V1_SPAWN_SUPPORT_CATEGORY,
        benefitMechanism: poolDomain.V1_SPAWN_BENEFIT_MECHANISM,
        fixedAmount: FIXED_AMOUNT,
        poolCount: POOL_COUNT,
      };
      poolIds.push(spec.poolId);
      // rosterWired: true — this suite's `roster` came from the REAL createAssignableRosterResolver,
      // mirroring runCycleSpawnChild's actual production call shape.
      await withPariwarScope(pool, pariwarId, (_db, client) =>
        poolDomain.spawnChildPool(client, spec, seam, roster, true),
      );
    }
  }

  it('resolves is_valid members only, deterministically, and 7.6 resolves each to the engine-placed pool', async () => {
    const pariwarId = randomUUID();
    const committedAt = new Date('2026-05-01T00:00:00.000Z');
    const joinedAt = new Date('2025-01-01T00:00:00.000Z');

    // 5 assignable (active) + 1 non-assignable (pending-kyc).
    const active: string[] = [];
    for (let i = 0; i < 5; i++) active.push(await seedActiveMember(pariwarId, joinedAt));
    const pending = await seedPendingMember(pariwarId, joinedAt);
    const cycleId = await seedCycle(pariwarId, committedAt);

    const resolver = createAssignableRosterResolver({ pool });

    // (2) The roster is exactly the active members (is_valid at committed_at) — pending excluded.
    const roster = await resolver({ pariwarId, cycleId });
    expect([...roster].sort()).toEqual([...active].sort());
    expect(roster).not.toContain(pending);

    // Determinism / re-derivability: the same frozen cycle re-resolves to the identical roster.
    const rosterAgain = await resolver({ pariwarId, cycleId });
    expect(rosterAgain).toEqual(roster);

    // (3) Spawn the pools with the real roster threaded in.
    await spawnPools(pariwarId, cycleId, roster);

    // (4) The engine's authoritative placement (what the snapshots must encode).
    const placement = poolDomain.assignMembersToPools(roster, cycleId, POOL_COUNT);

    await withPariwarScope(pool, pariwarId, async (db) => {
      const brandedPariwar = ids.pariwarId(pariwarId);
      const brandedCycle = ids.cycleFreezeCommitId(cycleId);

      // Every assignable member resolves to the EXACT pool the engine placed them in (loop closed).
      for (const memberId of active) {
        const expectedPoolIndex = placement.get(memberId)!;
        const expectedPoolId = poolDomain.derivePoolId(cycleId, expectedPoolIndex);
        const res = await poolDomain.resolveAssignedPoolForMember(
          db,
          brandedPariwar,
          brandedCycle,
          ids.memberId(memberId),
        );
        expect(res.assigned).toBe(true);
        if (res.assigned) expect(res.poolId).toBe(expectedPoolId);
      }

      // The non-assignable member is in NO pool → { assigned: false }.
      const pendingRes = await poolDomain.resolveAssignedPoolForMember(
        db,
        brandedPariwar,
        brandedCycle,
        ids.memberId(pending),
      );
      expect(pendingRes.assigned).toBe(false);
    });
  });

  it('cross-tenant isolation: a member under Pariwar B never appears in Pariwar A\'s roster (AI-7-2 review AC)', async () => {
    const pariwarA = randomUUID();
    const pariwarB = randomUUID();
    const committedAt = new Date('2026-05-01T00:00:00.000Z');
    const joinedAt = new Date('2025-01-01T00:00:00.000Z');

    const memberA = await seedActiveMember(pariwarA, joinedAt);
    const memberB = await seedActiveMember(pariwarB, joinedAt);
    const cycleA = await seedCycle(pariwarA, committedAt);

    const resolver = createAssignableRosterResolver({ pool });
    const rosterA = await resolver({ pariwarId: pariwarA, cycleId: cycleA });

    // Exercises BOTH new read surfaces end-to-end: the bulk `listMemberIdsForPariwar` enumeration
    // (RLS + explicit pariwar_id predicate) and the resolver built on top of it. Pariwar B's member
    // is active/assignable in every other respect — the ONLY thing keeping them out is tenant scope.
    expect(rosterA).toEqual([memberA]);
    expect(rosterA).not.toContain(memberB);
  });
});
