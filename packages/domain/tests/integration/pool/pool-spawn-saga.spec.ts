// Pool spawn saga — live-DB integration (Story 7.3, Task 7; AC1/AC2/AC4).
//
// Drives the domain orchestration (planCycleSpawn → spawnChildPool ×N → finalizeCycleIfComplete)
// against real Postgres under PARIWAR_A, inside the per-test BEGIN/ROLLBACK envelope (nothing
// persists). Asserts MEMBERSHIP / explicit values, never counts of shared tables; per
// [[project_live_db_test_gotchas]]. The load-bearing proofs:
//   · happy path — parent plan → N children → exactly one cycle.frozen; N pools spawned +
//     snapshotted, canonical identifiers contiguous.
//   · atomicity (AC2) — a missing child leaves the cycle UNFROZEN (no cycle.frozen, count < N);
//     a cycle.spawn.aborted breadcrumb records the reason; a forward re-run completes to the same
//     fully-spawned state with NO duplicate pools and exactly one cycle.frozen.
//   · idempotency — re-running a committed child is a no-op (same pool_id, one pool.spawned, one
//     snapshot); re-running finalize after a freeze is a no-op (still exactly one cycle.frozen).
//   · retryable-not-terminal — a cycle stream may carry multiple cycle.spawn.aborted events
//     followed by a successful cycle.frozen; an abort never locks the spawn.
//
// Because the per-test harness is a single transaction, the children + finalize run on ONE client
// (the finalize count sees the in-tx pools — the same set production's second tx sees once the
// child txs commit). The cross-tx commit race is guaranteed by the design (the cycle advisory lock
// + the events_log (stream_id, event_version) unique index); the exactly-once re-run assertions are
// the in-tx evidence of it.

import { randomUUID } from 'node:crypto';

import { and, asc, eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import type { Db } from '../../../src/db.js';
import {
  cycleFreezeCommitId as toCycleId,
  pariwarId as toPariwarId,
  poolId as toPoolId,
} from '../../../src/ids/index.js';
import {
  appendCycleAborted,
  derivePoolId,
  finalizeCycleIfComplete,
  planCycleSpawn,
  spawnChildPool,
} from '../../../src/pool/index.js';
import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, enterAppScope } from '../_helpers.js';

const FIXED_AMOUNT = 500;

/** Seed a cycle_freeze_commits row (before entering app scope — superuser, RLS bypassed). */
async function seedCommit(
  tx: Db,
  pariwarId: string,
  commitId: string,
  claimIds: string[],
): Promise<void> {
  await tx.insert(schema.cycleFreezeCommits).values({
    commitId: toCycleId(commitId),
    pariwarId: toPariwarId(pariwarId),
    actorId: 'trustee-actor-1',
    actorDisplay: 'Trustee One',
    committedClaimIds: claimIds,
    committedAt: new Date('2026-07-15T06:00:00Z'),
  });
}

async function poolsForCycle(tx: Db, cycleId: string) {
  return tx
    .select({
      poolId: schema.pools.poolId,
      poolIndex: schema.pools.poolIndex,
      ident: schema.pools.poolCanonicalIdentifier,
      state: schema.pools.currentState,
    })
    .from(schema.pools)
    .where(eq(schema.pools.cycleId, toCycleId(cycleId)))
    .orderBy(asc(schema.pools.poolIndex));
}

async function cycleStreamEvents(tx: Db, cycleId: string) {
  return tx
    .select({ type: schema.eventsLog.eventType, version: schema.eventsLog.eventVersion, payload: schema.eventsLog.payload })
    .from(schema.eventsLog)
    .where(eq(schema.eventsLog.streamId, cycleId))
    .orderBy(asc(schema.eventsLog.eventVersion));
}

describe.skipIf(!hasDatabase)('pool spawn saga (PARIWAR_A scope)', () => {
  setupLiveDb();

  it('AC1/AC2 happy path: parent plan → N children → exactly one cycle.frozen', async () => {
    const { client, tx } = getTx();
    const cycleId = randomUUID();
    const claimIds = [randomUUID(), randomUUID(), randomUUID()];
    await seedCommit(tx, PARIWAR_A, cycleId, claimIds);
    await enterAppScope(client, PARIWAR_A);

    const plan = await planCycleSpawn(tx, {
      pariwarId: PARIWAR_A,
      cycleId: toCycleId(cycleId),
      frozenClaims: claimIds.map((c) => ({ claimCaseId: c })),
      fixedAmount: FIXED_AMOUNT,
    });
    expect(plan.children).toHaveLength(3);
    // Opt-out Pariwar → no reserved names (letter codes).
    expect(plan.names).toEqual([]);
    // Deterministic pool ids + contiguous identifiers.
    plan.children.forEach((spec, i) => {
      expect(spec.poolId).toBe(derivePoolId(cycleId, i));
      expect(spec.poolIndex).toBe(i);
      expect(spec.poolCount).toBe(3);
    });
    const idents = plan.children.map((c) => c.poolCanonicalIdentifier);
    expect(new Set(idents).size).toBe(3); // distinct
    expect(idents.every((s) => /^P-2026-07-\d{3,}$/.test(s))).toBe(true);

    // Spawn every child; the last one finalizes.
    let frozenCount = 0;
    for (const spec of plan.children) {
      const r = await spawnChildPool(client, spec);
      expect(r.spawned).toBe(true);
      const fin = await finalizeCycleIfComplete(client, {
        pariwarId: PARIWAR_A,
        cycleId: toCycleId(cycleId),
        poolCount: 3,
      });
      if (fin.frozen) frozenCount++;
    }
    expect(frozenCount).toBe(1); // exactly one child finalized

    const pools = await poolsForCycle(tx, cycleId);
    expect(pools).toHaveLength(3);
    expect(pools.every((p) => p.state === 'spawned')).toBe(true);
    expect(pools.map((p) => p.ident)).toEqual(idents);

    // Exactly one cycle.frozen on the cycle stream, with the full pool set + attestation.
    const events = await cycleStreamEvents(tx, cycleId);
    const frozen = events.filter((e) => e.type === 'cycle.frozen');
    expect(frozen).toHaveLength(1);
    const fp = frozen[0]!.payload as { pool_count: number; pool_ids: string[]; attestation: { actor_display: string } };
    expect(fp.pool_count).toBe(3);
    expect(fp.pool_ids).toEqual(plan.children.map((c) => c.poolId));
    expect(fp.attestation.actor_display).toBe('Trustee One');

    // One snapshot per pool.
    const snaps = await tx
      .select({ poolId: schema.poolSnapshots.poolId })
      .from(schema.poolSnapshots)
      .where(eq(schema.poolSnapshots.pariwarId, PARIWAR_A));
    expect(snaps.filter((s) => plan.children.some((c) => c.poolId === s.poolId))).toHaveLength(3);
  });

  it('AC2 atomicity: a missing child leaves the cycle UNFROZEN + aborted breadcrumb; forward re-run completes with no duplicates', async () => {
    const { client, tx } = getTx();
    const cycleId = randomUUID();
    const claimIds = [randomUUID(), randomUUID(), randomUUID()];
    await seedCommit(tx, PARIWAR_A, cycleId, claimIds);
    await enterAppScope(client, PARIWAR_A);

    const plan = await planCycleSpawn(tx, {
      pariwarId: PARIWAR_A,
      cycleId: toCycleId(cycleId),
      frozenClaims: claimIds.map((c) => ({ claimCaseId: c })),
      fixedAmount: FIXED_AMOUNT,
    });

    // Spawn children 0 and 1 only — child 2 "fails".
    await spawnChildPool(client, plan.children[0]!);
    await spawnChildPool(client, plan.children[1]!);
    // The worker records the retryable breadcrumb on the failure.
    await appendCycleAborted(client, {
      pariwarId: PARIWAR_A,
      cycleId: toCycleId(cycleId),
      reason: 'child 2 crashed (simulated)',
    });

    // (a)/(b) Finalize sees only 2 of 3 → NOT frozen, no cycle.frozen event.
    const finPartial = await finalizeCycleIfComplete(client, {
      pariwarId: PARIWAR_A,
      cycleId: toCycleId(cycleId),
      poolCount: 3,
    });
    expect(finPartial.frozen).toBe(false);
    expect(finPartial.committedCount).toBe(2);
    let events = await cycleStreamEvents(tx, cycleId);
    expect(events.filter((e) => e.type === 'cycle.frozen')).toHaveLength(0);
    // (d) the aborted breadcrumb is recorded with its reason.
    const aborts = events.filter((e) => e.type === 'cycle.spawn.aborted');
    expect(aborts).toHaveLength(1);
    expect((aborts[0]!.payload as { reason: string }).reason).toContain('child 2 crashed');

    // (c) Forward recovery: re-run children 0 and 1 (idempotent no-op) + the missing child 2.
    expect((await spawnChildPool(client, plan.children[0]!)).spawned).toBe(false);
    expect((await spawnChildPool(client, plan.children[1]!)).spawned).toBe(false);
    expect((await spawnChildPool(client, plan.children[2]!)).spawned).toBe(true);
    const finComplete = await finalizeCycleIfComplete(client, {
      pariwarId: PARIWAR_A,
      cycleId: toCycleId(cycleId),
      poolCount: 3,
    });
    expect(finComplete.frozen).toBe(true);

    // Exactly 3 pools (no duplicates) + exactly one cycle.frozen, after an abort.
    const pools = await poolsForCycle(tx, cycleId);
    expect(pools).toHaveLength(3);
    events = await cycleStreamEvents(tx, cycleId);
    expect(events.filter((e) => e.type === 'cycle.frozen')).toHaveLength(1);
    // The healthy shape: [aborted, frozen] — the abort did NOT lock the spawn.
    expect(events.map((e) => e.type)).toEqual(['cycle.spawn.aborted', 'cycle.frozen']);
  });

  it('idempotency: re-running a committed child is a no-op; re-running finalize keeps exactly one cycle.frozen', async () => {
    const { client, tx } = getTx();
    const cycleId = randomUUID();
    const claimIds = [randomUUID()];
    await seedCommit(tx, PARIWAR_A, cycleId, claimIds);
    await enterAppScope(client, PARIWAR_A);

    const plan = await planCycleSpawn(tx, {
      pariwarId: PARIWAR_A,
      cycleId: toCycleId(cycleId),
      frozenClaims: claimIds.map((c) => ({ claimCaseId: c })),
      fixedAmount: FIXED_AMOUNT,
    });
    const spec = plan.children[0]!;

    const first = await spawnChildPool(client, spec);
    expect(first.spawned).toBe(true);
    const second = await spawnChildPool(client, spec);
    expect(second.spawned).toBe(false); // idempotent no-op
    expect(second.poolId).toBe(first.poolId); // same deterministic id

    // Exactly one pool row + one pool.spawned event + one snapshot.
    const pools = await poolsForCycle(tx, cycleId);
    expect(pools).toHaveLength(1);
    const poolEvents = await tx
      .select({ type: schema.eventsLog.eventType, payload: schema.eventsLog.payload })
      .from(schema.eventsLog)
      .where(and(eq(schema.eventsLog.streamId, spec.poolId), eq(schema.eventsLog.eventType, 'pool.spawned')));
    expect(poolEvents).toHaveLength(1);
    // AC5 — the assignment audit-reproducibility fields land on the persisted event. `spawnChildPool`
    // is called here with no seam argument (the default `emptyAssignmentSeam`), so this pins the
    // current empty-roster values; the `assignment_roster_wired: false` marker is what future-proofs
    // an auditor's ability to tell "no roster query wired yet" apart from a later, genuinely-empty
    // roster once the Story 7.4 roster-wiring follow-up ships.
    expect(poolEvents[0]!.payload).toMatchObject({
      member_state_hash: '4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945',
      assignment_hash_version: 'v1',
      assignment_roster_wired: false,
    });
    const snaps = await tx
      .select({ id: schema.poolSnapshots.snapshotId })
      .from(schema.poolSnapshots)
      .where(eq(schema.poolSnapshots.poolId, toPoolId(spec.poolId)));
    expect(snaps).toHaveLength(1);

    // Finalize twice — the second sees the cycle already frozen (no double-freeze).
    const f1 = await finalizeCycleIfComplete(client, { pariwarId: PARIWAR_A, cycleId: toCycleId(cycleId), poolCount: 1 });
    expect(f1.frozen).toBe(true);
    const f2 = await finalizeCycleIfComplete(client, { pariwarId: PARIWAR_A, cycleId: toCycleId(cycleId), poolCount: 1 });
    expect(f2.frozen).toBe(false);
    expect(f2.alreadyFrozen).toBe(true);
    const events = await cycleStreamEvents(tx, cycleId);
    expect(events.filter((e) => e.type === 'cycle.frozen')).toHaveLength(1);
  });

  it('retryable-not-terminal: multiple cycle.spawn.aborted then a successful cycle.frozen', async () => {
    const { client, tx } = getTx();
    const cycleId = randomUUID();
    const claimIds = [randomUUID(), randomUUID()];
    await seedCommit(tx, PARIWAR_A, cycleId, claimIds);
    await enterAppScope(client, PARIWAR_A);

    const plan = await planCycleSpawn(tx, {
      pariwarId: PARIWAR_A,
      cycleId: toCycleId(cycleId),
      frozenClaims: claimIds.map((c) => ({ claimCaseId: c })),
      fixedAmount: FIXED_AMOUNT,
    });

    // Two failed attempts, each leaving a breadcrumb — the cycle stays spawnable.
    await appendCycleAborted(client, { pariwarId: PARIWAR_A, cycleId: toCycleId(cycleId), reason: 'attempt 1 failed' });
    await appendCycleAborted(client, { pariwarId: PARIWAR_A, cycleId: toCycleId(cycleId), reason: 'attempt 2 failed' });

    // A later run spawns all pools + freezes — the aborts never blocked it.
    for (const spec of plan.children) await spawnChildPool(client, spec);
    const fin = await finalizeCycleIfComplete(client, { pariwarId: PARIWAR_A, cycleId: toCycleId(cycleId), poolCount: 2 });
    expect(fin.frozen).toBe(true);

    const events = await cycleStreamEvents(tx, cycleId);
    expect(events.map((e) => e.type)).toEqual(['cycle.spawn.aborted', 'cycle.spawn.aborted', 'cycle.frozen']);
  });

  it('planCycleSpawn throws when the cycle-freeze commit record is missing', async () => {
    const { client, tx } = getTx();
    const cycleId = randomUUID();
    await enterAppScope(client, PARIWAR_A);
    await expect(
      planCycleSpawn(tx, {
        pariwarId: PARIWAR_A,
        cycleId: toCycleId(cycleId),
        frozenClaims: [{ claimCaseId: randomUUID() }],
        fixedAmount: FIXED_AMOUNT,
      }),
    ).rejects.toThrow(/cycle_freeze_commits row not found/);
  });
});
