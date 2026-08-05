// Freeze-time assignable-roster → spawn → resolve — live-DB end-to-end proof (AI-7-2; :5433).
//
// THE loop-closing test. It proves the whole 7.4→7.6 path end-to-end against real Postgres, real member
// event streams, and the REAL Story 4.6 Validity Service — the thing the fakes suites and the domain
// integration spec each prove only one half of:
//   1. seed active + pending members + a cycle-freeze commit,
//   2. run the REAL createAssignableRosterResolver → the assignable roster (is_assignable members
//      ONLY — AI-7-2 as amended by Story 10.17; NOT is_valid, which is the COVERAGE answer), evaluated
//      at committed_at — active members in, pending member out, and DETERMINISTIC on re-run,
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

  /** Seed a member whose event stream replays to `active` (is_assignable = true) at/BEFORE `committedAt`. */
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

  /** Seed a member who replays only to `pending-kyc` (outside VALID_STATES ⇒ is_assignable = false). */
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

  /**
   * Append the `member.moderation.*` chain that folds an ALREADY-SEEDED member to `target` (Story
   * 10.17), every event landing at/before `occurredAt`.
   *
   * ⚠ TERMINATION IS A TWO-EVENT CHAIN, NOT A ONE-EVENT SHORTCUT. `evaluateModerationOverlay` folds
   * via `nextModerationStatus(status, action)` and IGNORES the payload's `moderation_from`/`_to`
   * fields — an illegal transition is skipped as IDENTITY, silently. `none --terminate-->` is
   * illegal by Story 10.10's Decision 2 (the API answers 409), so seeding a lone
   * `member.moderation.terminated` folds to `status: 'none'` and the member stays FULLY UNMODERATED
   * — a green-looking test asserting nothing. It must go through `suspended` first.
   *
   * Lifecycle-identity by construction: `from_state`/`to_state` are both `active`, because moderation
   * is an OVERLAY and `members.state` never moves (Story 10.10, Decision 1). `occurredAt` is an
   * explicit argument — the whole point of the replay pin below is WHERE these land relative to a
   * frozen `committed_at`.
   */
  async function moderateMember(
    pariwarId: string,
    memberId: string,
    firstVersion: number,
    target: 'suspended' | 'terminated',
    occurredAt: Date,
    reasonCode = 'r7-contribution-discipline',
  ): Promise<void> {
    const base = {
      from_state: 'active',
      to_state: 'active',
      trigger: 'test',
      actor: 'trustee',
      reason_code: reasonCode,
    };
    // The suspension leg is required for BOTH targets (it is the only legal predecessor of a
    // termination). Stamped 1s earlier so both legs sit inside a pre-freeze window.
    await seedEvent(pariwarId, memberId, firstVersion, 'member.moderation.suspended', new Date(occurredAt.getTime() - 1000), {
      ...base,
      moderation_from: 'none',
      moderation_to: 'suspended',
    });
    if (target === 'terminated') {
      await seedEvent(pariwarId, memberId, firstVersion + 1, 'member.moderation.terminated', occurredAt, {
        ...base,
        moderation_from: 'suspended',
        moderation_to: 'terminated',
      });
    }
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

  it('resolves is_assignable members only, deterministically, and 7.6 resolves each to the engine-placed pool', async () => {
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

  // ── Story 10.17 AC4 — THE REPLAY-DETERMINISM PIN ───────────────────────────────────────────────

  it('AC4: a moderation event AFTER a frozen committed_at does not change the roster resolved AT it', async () => {
    // WHY THIS PIN EXISTS. Nothing diverges today: Story 10.10 shipped 2026-08-03, so no moderation
    // event predates any frozen cycle, and this test would pass even if the mechanism were wrong.
    // ⇒ THE PIN EXISTS SO THAT STAYS TRUE.
    //
    // THE MECHANISM IT GUARDS: `getValidityAt` resolves the moderation overlay AT the pinned instant,
    // alongside `getMemberStateAt` (`validity-service/src/service.ts` — the overlay read takes the
    // same `at`, never `now()`). If a future refactor ever moved that read to `now()`, a suspension
    // today would RETROACTIVELY change a past cycle's roster — re-spawning a frozen cycle would
    // produce different `member_assignments` than the ones already stamped into its `pool.spawned`
    // event, and the audit trail's `member_state_hash` would no longer reproduce. This test is the
    // tripwire for exactly that, and it is why the assertion below is on the HASH, not just the list.
    const pariwarId = randomUUID();
    const committedAt = new Date('2026-05-01T00:00:00.000Z');
    const joinedAt = new Date('2025-01-01T00:00:00.000Z');

    const members: string[] = [];
    for (let i = 0; i < 3; i++) members.push(await seedActiveMember(pariwarId, joinedAt));
    const cycleId = await seedCycle(pariwarId, committedAt);

    const resolver = createAssignableRosterResolver({ pool });

    // (1)+(2) Resolve at T; fingerprint the roster exactly as spawn does.
    const rosterBefore = await resolver({ pariwarId, cycleId });
    const hashBefore = poolDomain.computeAssignableRosterHash(rosterBefore);
    expect(rosterBefore).toHaveLength(3);

    // (3) A moderation write landing STRICTLY AFTER the frozen instant.
    const afterFreeze = new Date(committedAt.getTime() + 30 * 24 * 60 * 60 * 1000);
    await moderateMember(pariwarId, members[0]!, 5, 'suspended', afterFreeze);
    await moderateMember(pariwarId, members[1]!, 5, 'terminated', afterFreeze);

    // (4) Re-resolve at the SAME frozen instant → byte-identical list AND byte-identical hash.
    const rosterAfter = await resolver({ pariwarId, cycleId });
    expect(rosterAfter).toEqual(rosterBefore);
    expect(poolDomain.computeAssignableRosterHash(rosterAfter)).toBe(hashBefore);
  });

  it('AC4: at the frozen instant, a member suspended BEFORE the freeze is ON the roster and one terminated before it is NOT', async () => {
    // The at-instant half of the pin — the NEW behaviour, resolved historically. Together with the
    // test above this says: moderation is honoured exactly as of `committed_at`, no earlier and no
    // later. A pre-freeze SUSPENSION keeps the member on the roster (Story 10.17's whole point,
    // resolved through the historical path, not just the live one); a pre-freeze TERMINATION removes
    // them. If the predicate were reverted to `payload.isValid`, the suspended member would vanish
    // from this roster and this test goes red (the revert-sanity claim in the Dev Agent Record).
    const pariwarId = randomUUID();
    const committedAt = new Date('2026-05-01T00:00:00.000Z');
    const joinedAt = new Date('2025-01-01T00:00:00.000Z');
    const beforeFreeze = new Date(committedAt.getTime() - 24 * 60 * 60 * 1000);

    const unmoderated = await seedActiveMember(pariwarId, joinedAt);
    const suspended = await seedActiveMember(pariwarId, joinedAt);
    const terminated = await seedActiveMember(pariwarId, joinedAt);
    await moderateMember(pariwarId, suspended, 5, 'suspended', beforeFreeze);
    await moderateMember(pariwarId, terminated, 5, 'terminated', beforeFreeze);
    const cycleId = await seedCycle(pariwarId, committedAt);

    const roster = await createAssignableRosterResolver({ pool })({ pariwarId, cycleId });

    expect([...roster].sort()).toEqual([unmoderated, suspended].sort());
    expect(roster).toContain(suspended); // ← the constitutional correction, at a frozen instant
    expect(roster).not.toContain(terminated);
  });

  // ── Story 10.17 AC6a — REACHABILITY, the roster half ───────────────────────────────────────────

  it('AC6a: a SUSPENDED member reaches pool_snapshots.member_assignments through the real spawn path', async () => {
    // THE PRIMARY PROOF this story owes, roster half: not "the predicate returns true" (that is
    // Task 1's unit test) but "a suspended member actually lands in the artifact the payment surface
    // reads". The chain here is entirely real — real events, the REAL createAssignableRosterResolver,
    // the REAL spawnChildPool + assignment seam, and the snapshot read back out of Postgres.
    //
    // The surface half (GET /api/v1/member/validity → nominee-accounts `available: true`) is proven
    // in `apps/api/tests/integration/payment/suspended-member-reachability.spec.ts`; the two halves
    // join at `pool_snapshots.member_assignments`, which this test produces and that one consumes.
    const pariwarId = randomUUID();
    const committedAt = new Date('2026-05-01T00:00:00.000Z');
    const joinedAt = new Date('2025-01-01T00:00:00.000Z');
    const beforeFreeze = new Date(committedAt.getTime() - 24 * 60 * 60 * 1000);

    const suspended = await seedActiveMember(pariwarId, joinedAt);
    const terminated = await seedActiveMember(pariwarId, joinedAt);
    await moderateMember(pariwarId, suspended, 5, 'suspended', beforeFreeze);
    await moderateMember(pariwarId, terminated, 5, 'terminated', beforeFreeze);
    const cycleId = await seedCycle(pariwarId, committedAt);

    const roster = await createAssignableRosterResolver({ pool })({ pariwarId, cycleId });
    expect(roster).toContain(suspended);
    await spawnPools(pariwarId, cycleId, roster);

    // Read the member ids back out of the SPAWNED snapshots — the durable artifact, not the in-memory
    // roster. Assert MEMBERSHIP, never counts ([[project_live_db_test_gotchas]]).
    const assignedMemberIds = new Set<string>();
    for (let i = 0; i < POOL_COUNT; i++) {
      const res = await pool.query<{ snapshot: { member_assignments: Array<{ member_id: string }> } }>(
        'SELECT snapshot FROM pool_snapshots WHERE pool_id = $1',
        [poolDomain.derivePoolId(cycleId, i)],
      );
      for (const a of res.rows[0]?.snapshot.member_assignments ?? []) assignedMemberIds.add(a.member_id);
    }

    expect(assignedMemberIds.has(suspended)).toBe(true); // ← the unblock, in the durable artifact
    expect(assignedMemberIds.has(terminated)).toBe(false);

    // …and 7.6 resolves the suspended member to a real pool, which is what `/pay` ultimately calls.
    await withPariwarScope(pool, pariwarId, async (db) => {
      const res = await poolDomain.resolveAssignedPoolForMember(
        db,
        ids.pariwarId(pariwarId),
        ids.cycleFreezeCommitId(cycleId),
        ids.memberId(suspended),
      );
      expect(res.assigned).toBe(true);
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
