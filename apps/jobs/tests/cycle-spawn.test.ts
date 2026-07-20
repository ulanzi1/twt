// Cycle-spawn worker — orchestration unit tests (AI-7-1, a Story 7.3 follow-up).
//
// WHY fakes/mocks, not live-DB (contrast the live-DB `claim-shepherd-assign.test.ts` precedent
// for an apps/jobs worker): this suite verifies CONTROL FLOW ONLY — retry/claim-release
// sequencing, breadcrumb-recording glue, boss.work() options — never DB behavior. The DB-backed
// behavior (atomicity, idempotency, concurrency, event-stream shape) is already proven by
// packages/domain/tests/pool/spawn.test.ts (pure functions) + tests/integration/pool/
// pool-spawn-saga.spec.ts (live-DB). No DATABASE_URL, no describe.skipIf — this suite always runs.

import { randomUUID } from 'node:crypto';

import { pool as poolDomain } from '@twt/domain';
import type { QueueClient } from '@twt/queue';
import { QUEUE_NAMES } from '@twt/queue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  planCycleSpawnMock,
  spawnChildPoolMock,
  finalizeCycleIfCompleteMock,
  appendCycleAbortedMock,
  appendCycleSpawnStartedMock,
  isPoolAlreadySpawnedMock,
  withPariwarScopeMock,
  createKeyedStoreMock,
} = vi.hoisted(() => ({
  planCycleSpawnMock: vi.fn(),
  spawnChildPoolMock: vi.fn(),
  finalizeCycleIfCompleteMock: vi.fn(),
  appendCycleAbortedMock: vi.fn(),
  appendCycleSpawnStartedMock: vi.fn(),
  isPoolAlreadySpawnedMock: vi.fn(),
  withPariwarScopeMock: vi.fn(),
  createKeyedStoreMock: vi.fn(),
}));

vi.mock('@twt/domain', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@twt/domain')>();
  return {
    ...actual,
    pool: {
      ...actual.pool,
      planCycleSpawn: planCycleSpawnMock,
      spawnChildPool: spawnChildPoolMock,
      finalizeCycleIfComplete: finalizeCycleIfCompleteMock,
      appendCycleAborted: appendCycleAbortedMock,
      appendCycleSpawnStarted: appendCycleSpawnStartedMock,
      isPoolAlreadySpawned: isPoolAlreadySpawnedMock,
    },
    idempotency: {
      ...actual.idempotency,
      createKeyedStore: createKeyedStoreMock,
    },
    withPariwarScope: withPariwarScopeMock,
  };
});

// Imported AFTER vi.mock (hoisted above these imports by vitest) so the module under test wires
// up against the mocked @twt/domain surface above.
import {
  DEFAULT_CHILD_LOCAL_CONCURRENCY,
  registerCycleSpawnWorkers,
  runCycleSpawnChild,
  runCycleSpawnParent,
  type CycleSpawnChildPayload,
  type CycleSpawnDeps,
  type CycleSpawnParentPayload,
} from '../src/cycle-spawn.js';

interface FakeKeyedStore {
  claim: ReturnType<typeof vi.fn>;
  recordResult: ReturnType<typeof vi.fn>;
  getResult: ReturnType<typeof vi.fn>;
  release: ReturnType<typeof vi.fn>;
}

function makeFakeStore(): FakeKeyedStore {
  return {
    claim: vi.fn(),
    recordResult: vi.fn().mockResolvedValue(undefined),
    getResult: vi.fn(),
    release: vi.fn().mockResolvedValue(undefined),
  };
}

function makeDeps(overrides: Partial<CycleSpawnDeps> = {}): CycleSpawnDeps {
  return {
    // withPariwarScope is mocked — no call ever reaches this pool.
    pool: {} as CycleSpawnDeps['pool'],
    onAlarm: vi.fn(),
    ...overrides,
  };
}

function makeFakeBoss(): { send: ReturnType<typeof vi.fn> } {
  return { send: vi.fn().mockResolvedValue('job-id') };
}

function makeFakeQueueClient(): QueueClient {
  return {
    createQueue: vi.fn().mockResolvedValue(undefined),
    work: vi.fn().mockResolvedValue('sub-id'),
  } as unknown as QueueClient;
}

function childSpec(input: {
  cycleId: string;
  pariwarId: string;
  poolIndex: number;
  claimCaseId: string;
}): poolDomain.ChildSpawnSpec {
  return {
    cycleId: input.cycleId,
    pariwarId: input.pariwarId,
    poolIndex: input.poolIndex,
    poolId: randomUUID(),
    claimCaseId: input.claimCaseId,
    poolCanonicalIdentifier: `P-2026-07-00${String(input.poolIndex + 1)}`,
    supportCategory: poolDomain.V1_SPAWN_SUPPORT_CATEGORY,
    benefitMechanism: poolDomain.V1_SPAWN_BENEFIT_MECHANISM,
    fixedAmount: 500,
    poolCount: 2,
  };
}

function parentEnvelope(input: {
  pariwarId: string;
  cycleId: string;
  frozenClaims: { claimCaseId: string }[];
}) {
  return {
    requestId: randomUUID(),
    pariwarId: input.pariwarId,
    actorId: null,
    traceId: randomUUID(),
    payload: { cycleId: input.cycleId, frozenClaims: input.frozenClaims } satisfies CycleSpawnParentPayload,
  };
}

function childEnvelope(spec: poolDomain.ChildSpawnSpec) {
  return {
    requestId: randomUUID(),
    pariwarId: spec.pariwarId,
    actorId: null,
    traceId: randomUUID(),
    payload: spec satisfies CycleSpawnChildPayload,
  };
}

beforeEach(() => {
  // resetAllMocks (not clearAllMocks) also drops stale mock *implementations*, so a value set with
  // mockResolvedValue/mockReturnValue in one test can never leak into the next; the withPariwarScope
  // default below is re-primed immediately after the reset.
  vi.resetAllMocks();
  // The default fake: every withPariwarScope call just invokes its callback with placeholder
  // db/client — the callee (a mocked pool.* fn) never actually reads them.
  withPariwarScopeMock.mockImplementation(
    async (_pool: unknown, _pariwarId: unknown, fn: (db: unknown, client: unknown) => unknown) =>
      fn({}, {}),
  );
  // Default: not yet spawned (the common case) — tests exercising the already-spawned skip path
  // override this per-test.
  isPoolAlreadySpawnedMock.mockResolvedValue(false);
});

describe('runCycleSpawnParent — successful planning', () => {
  it('emits cycle.spawn.started in the same tx as the plan, records the result once, and enqueues N children', async () => {
    const cycleId = randomUUID();
    const pariwarId = randomUUID();
    const claimA = randomUUID();
    const claimB = randomUUID();
    const children = [
      childSpec({ cycleId, pariwarId, poolIndex: 0, claimCaseId: claimA }),
      childSpec({ cycleId, pariwarId, poolIndex: 1, claimCaseId: claimB }),
    ];
    const store = makeFakeStore();
    store.claim.mockResolvedValue('acquired');
    createKeyedStoreMock.mockReturnValue(store);
    planCycleSpawnMock.mockResolvedValue({ children, names: [] });
    appendCycleSpawnStartedMock.mockResolvedValue(undefined);

    const boss = makeFakeBoss();
    const envelope = parentEnvelope({ pariwarId, cycleId, frozenClaims: [{ claimCaseId: claimA }, { claimCaseId: claimB }] });

    const result = await runCycleSpawnParent(makeDeps(), boss, envelope);

    // One shared tx: withPariwarScope opened exactly once for the whole plan+started pair.
    expect(withPariwarScopeMock).toHaveBeenCalledTimes(1);
    expect(planCycleSpawnMock).toHaveBeenCalledTimes(1);
    // The planner receives the forwarded frozenClaims (not merely "was called"). Story 7.5 retired the
    // fixedAmount dep — the planner resolves the amount internally from the schedule at committed_at.
    expect(planCycleSpawnMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        cycleId,
        pariwarId,
        frozenClaims: envelope.payload.frozenClaims,
      }),
    );
    expect(appendCycleSpawnStartedMock).toHaveBeenCalledTimes(1);
    expect(appendCycleSpawnStartedMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ cycleId, pariwarId, poolCount: 2 }),
    );
    // planCycleSpawn happens BEFORE appendCycleSpawnStarted (same tx, in order).
    expect(planCycleSpawnMock.mock.invocationCallOrder[0]!).toBeLessThan(
      appendCycleSpawnStartedMock.mock.invocationCallOrder[0]!,
    );
    // …and both ran against the SAME tx handle — proves one shared withPariwarScope tx, not two.
    expect(appendCycleSpawnStartedMock.mock.calls[0]![0]).toBe(planCycleSpawnMock.mock.calls[0]![0]);

    expect(store.recordResult).toHaveBeenCalledWith(`cycle.spawn.parent:${cycleId}`, { children });
    expect(store.recordResult).toHaveBeenCalledTimes(1);
    expect(store.release).not.toHaveBeenCalled();

    expect(boss.send).toHaveBeenCalledTimes(2);
    expect(boss.send).toHaveBeenNthCalledWith(
      1,
      QUEUE_NAMES.CYCLE_SPAWN_CHILD,
      expect.objectContaining({ payload: children[0] }),
      { singletonKey: `${cycleId}:0` },
    );
    expect(boss.send).toHaveBeenNthCalledWith(
      2,
      QUEUE_NAMES.CYCLE_SPAWN_CHILD,
      expect.objectContaining({ payload: children[1] }),
      { singletonKey: `${cycleId}:1` },
    );

    expect(result).toEqual({ cycleId, poolCount: 2, planned: true });
  });
});

describe('runCycleSpawnParent — planning failure releases the claim', () => {
  it('releases the claim, alarms, and rethrows without recording a result or enqueuing children', async () => {
    const cycleId = randomUUID();
    const pariwarId = randomUUID();
    const store = makeFakeStore();
    store.claim.mockResolvedValue('acquired');
    createKeyedStoreMock.mockReturnValue(store);
    const planError = new Error('name list exhausted');
    planCycleSpawnMock.mockRejectedValue(planError);

    const onAlarm = vi.fn();
    const boss = makeFakeBoss();
    const envelope = parentEnvelope({ pariwarId, cycleId, frozenClaims: [{ claimCaseId: randomUUID() }] });

    await expect(runCycleSpawnParent(makeDeps({ onAlarm }), boss, envelope)).rejects.toBe(planError);

    expect(store.release).toHaveBeenCalledWith(`cycle.spawn.parent:${cycleId}`);
    expect(onAlarm).toHaveBeenCalledWith(expect.stringContaining('planning failed'));
    // appendCycleSpawnStarted never runs — planCycleSpawn rejected first in the same tx.
    expect(appendCycleSpawnStartedMock).not.toHaveBeenCalled();
    expect(store.recordResult).not.toHaveBeenCalled();
    expect(boss.send).not.toHaveBeenCalled();
  });

  it('alarms (but does not throw) a release failure, while still rethrowing the original planning error', async () => {
    const cycleId = randomUUID();
    const pariwarId = randomUUID();
    const store = makeFakeStore();
    store.claim.mockResolvedValue('acquired');
    store.release.mockRejectedValue(new Error('release failed'));
    createKeyedStoreMock.mockReturnValue(store);
    const planError = new Error('boom');
    planCycleSpawnMock.mockRejectedValue(planError);

    const onAlarm = vi.fn();
    const boss = makeFakeBoss();
    const envelope = parentEnvelope({ pariwarId, cycleId, frozenClaims: [{ claimCaseId: randomUUID() }] });

    await expect(runCycleSpawnParent(makeDeps({ onAlarm }), boss, envelope)).rejects.toBe(planError);

    // BOTH alarms fire: the planning failure AND the release failure — neither is swallowed.
    expect(onAlarm).toHaveBeenCalledWith(expect.stringContaining('planning failed'));
    expect(onAlarm).toHaveBeenCalledWith(expect.stringContaining('failed to release claim'));
  });
});

describe('runCycleSpawnParent — recordResult failure path', () => {
  it('releases the claim, alarms, and rethrows when recordResult fails after a successful plan', async () => {
    const cycleId = randomUUID();
    const pariwarId = randomUUID();
    const children = [childSpec({ cycleId, pariwarId, poolIndex: 0, claimCaseId: randomUUID() })];
    const store = makeFakeStore();
    store.claim.mockResolvedValue('acquired');
    createKeyedStoreMock.mockReturnValue(store);
    planCycleSpawnMock.mockResolvedValue({ children, names: [] });
    appendCycleSpawnStartedMock.mockResolvedValue(undefined);
    const recordError = new Error('recordResult boom');
    store.recordResult.mockRejectedValue(recordError);

    const onAlarm = vi.fn();
    const boss = makeFakeBoss();
    const envelope = parentEnvelope({ pariwarId, cycleId, frozenClaims: [{ claimCaseId: children[0]!.claimCaseId }] });

    await expect(runCycleSpawnParent(makeDeps({ onAlarm }), boss, envelope)).rejects.toBe(recordError);

    // The plan itself (and the started marker) already succeeded inside the tx before recordResult ran.
    expect(planCycleSpawnMock).toHaveBeenCalledTimes(1);
    expect(appendCycleSpawnStartedMock).toHaveBeenCalledTimes(1);
    expect(store.release).toHaveBeenCalledWith(`cycle.spawn.parent:${cycleId}`);
    expect(onAlarm).toHaveBeenCalledWith(expect.stringContaining('planning failed'));
    expect(boss.send).not.toHaveBeenCalled();
  });
});

describe('runCycleSpawnParent — duplicate/retried run (idempotent re-enqueue)', () => {
  it('re-enqueues children from the stored plan without re-planning', async () => {
    const cycleId = randomUUID();
    const pariwarId = randomUUID();
    const children = [
      childSpec({ cycleId, pariwarId, poolIndex: 0, claimCaseId: randomUUID() }),
      childSpec({ cycleId, pariwarId, poolIndex: 1, claimCaseId: randomUUID() }),
    ];
    const store = makeFakeStore();
    store.claim.mockResolvedValue('already_claimed');
    store.getResult.mockResolvedValue({ children });
    createKeyedStoreMock.mockReturnValue(store);

    const boss = makeFakeBoss();
    const envelope = parentEnvelope({
      pariwarId,
      cycleId,
      frozenClaims: children.map((c) => ({ claimCaseId: c.claimCaseId })),
    });

    const result = await runCycleSpawnParent(makeDeps(), boss, envelope);

    expect(planCycleSpawnMock).not.toHaveBeenCalled();
    expect(appendCycleSpawnStartedMock).not.toHaveBeenCalled();
    expect(withPariwarScopeMock).not.toHaveBeenCalled();
    expect(store.recordResult).not.toHaveBeenCalled();
    expect(boss.send).toHaveBeenCalledTimes(children.length);
    // Re-enqueue targets the right queue + payload + dedup singletonKey (not just the right COUNT).
    expect(boss.send).toHaveBeenNthCalledWith(
      1,
      QUEUE_NAMES.CYCLE_SPAWN_CHILD,
      expect.objectContaining({ payload: children[0] }),
      { singletonKey: `${cycleId}:0` },
    );
    expect(boss.send).toHaveBeenNthCalledWith(
      2,
      QUEUE_NAMES.CYCLE_SPAWN_CHILD,
      expect.objectContaining({ payload: children[1] }),
      { singletonKey: `${cycleId}:1` },
    );
    expect(result.planned).toBe(false);
  });
});

describe('runCycleSpawnChild — finalize success', () => {
  it('spawns and finalizes with no cycle.spawn.aborted breadcrumb', async () => {
    const cycleId = randomUUID();
    const pariwarId = randomUUID();
    const spec = childSpec({ cycleId, pariwarId, poolIndex: 0, claimCaseId: randomUUID() });
    spawnChildPoolMock.mockResolvedValue({
      poolId: spec.poolId,
      poolCanonicalIdentifier: spec.poolCanonicalIdentifier,
      spawned: true,
    });
    finalizeCycleIfCompleteMock.mockResolvedValue({ frozen: true, alreadyFrozen: false, committedCount: 2 });

    const result = await runCycleSpawnChild(makeDeps(), childEnvelope(spec));

    // The returned shape isn't derivable from canned mocks alone — pin that spawn + finalize both ran.
    // No resolver injected here → the roster defaults to the empty set, and `rosterWired` is false (not
    // wired) rather than a hardcoded true — see the AI-7-2 review's decision-needed finding.
    expect(spawnChildPoolMock).toHaveBeenCalledWith(expect.anything(), spec, expect.anything(), [], false);
    expect(finalizeCycleIfCompleteMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ poolCount: spec.poolCount }),
    );
    expect(appendCycleAbortedMock).not.toHaveBeenCalled();
    expect(result).toEqual({ poolId: spec.poolId, spawned: true, frozen: true });
  });
});

describe('runCycleSpawnChild — cycle-open alert enqueue seam (Story 8.1, D4)', () => {
  it('fires enqueueCycleOpenAlert with the cycle coordinates when finalize emits cycle.frozen', async () => {
    const cycleId = randomUUID();
    const pariwarId = randomUUID();
    const spec = childSpec({ cycleId, pariwarId, poolIndex: 0, claimCaseId: randomUUID() });
    spawnChildPoolMock.mockResolvedValue({
      poolId: spec.poolId,
      poolCanonicalIdentifier: spec.poolCanonicalIdentifier,
      spawned: true,
    });
    finalizeCycleIfCompleteMock.mockResolvedValue({ frozen: true, alreadyFrozen: false, committedCount: 2 });
    const enqueueCycleOpenAlert = vi.fn().mockResolvedValue(undefined);
    const envelope = childEnvelope(spec);

    await runCycleSpawnChild(makeDeps({ enqueueCycleOpenAlert }), envelope);

    expect(enqueueCycleOpenAlert).toHaveBeenCalledTimes(1);
    expect(enqueueCycleOpenAlert).toHaveBeenCalledWith({
      cycleId,
      pariwarId,
      requestId: envelope.requestId,
      actorId: envelope.actorId,
      traceId: envelope.traceId,
    });
  });

  it('does NOT enqueue when this child was not the finalizer (frozen: false)', async () => {
    const spec = childSpec({ cycleId: randomUUID(), pariwarId: randomUUID(), poolIndex: 0, claimCaseId: randomUUID() });
    spawnChildPoolMock.mockResolvedValue({ poolId: spec.poolId, poolCanonicalIdentifier: spec.poolCanonicalIdentifier, spawned: true });
    finalizeCycleIfCompleteMock.mockResolvedValue({ frozen: false, alreadyFrozen: false, committedCount: 1 });
    const enqueueCycleOpenAlert = vi.fn().mockResolvedValue(undefined);

    await runCycleSpawnChild(makeDeps({ enqueueCycleOpenAlert }), childEnvelope(spec));

    expect(enqueueCycleOpenAlert).not.toHaveBeenCalled();
  });

  it('swallows an enqueue failure (best-effort) — the committed freeze is never failed', async () => {
    const spec = childSpec({ cycleId: randomUUID(), pariwarId: randomUUID(), poolIndex: 0, claimCaseId: randomUUID() });
    spawnChildPoolMock.mockResolvedValue({ poolId: spec.poolId, poolCanonicalIdentifier: spec.poolCanonicalIdentifier, spawned: true });
    finalizeCycleIfCompleteMock.mockResolvedValue({ frozen: true, alreadyFrozen: false, committedCount: 2 });
    const enqueueCycleOpenAlert = vi.fn().mockRejectedValue(new Error('boss down'));
    const onAlarm = vi.fn();

    // Resolves normally (does not reject) even though the enqueue threw.
    const result = await runCycleSpawnChild(makeDeps({ enqueueCycleOpenAlert, onAlarm }), childEnvelope(spec));

    expect(result).toEqual({ poolId: spec.poolId, spawned: true, frozen: true });
    expect(onAlarm).toHaveBeenCalledWith(expect.stringContaining('failed to enqueue cycle-open alert'));
  });
});

describe('runCycleSpawnChild — finalize failure records the breadcrumb', () => {
  it('records cycle.spawn.aborted with the finalize error reason, then rethrows', async () => {
    const cycleId = randomUUID();
    const pariwarId = randomUUID();
    const spec = childSpec({ cycleId, pariwarId, poolIndex: 0, claimCaseId: randomUUID() });
    spawnChildPoolMock.mockResolvedValue({
      poolId: spec.poolId,
      poolCanonicalIdentifier: spec.poolCanonicalIdentifier,
      spawned: true,
    });
    const finalizeError = new Error('finalize boom');
    finalizeCycleIfCompleteMock.mockRejectedValue(finalizeError);
    appendCycleAbortedMock.mockResolvedValue(undefined);

    await expect(runCycleSpawnChild(makeDeps(), childEnvelope(spec))).rejects.toBe(finalizeError);

    expect(appendCycleAbortedMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ cycleId, pariwarId, reason: 'finalize boom' }),
    );
  });
});

describe('runCycleSpawnChild — assignable-roster wiring (AI-7-2)', () => {
  it('resolves the freeze-time roster and threads the member set into spawnChildPool', async () => {
    const cycleId = randomUUID();
    const pariwarId = randomUUID();
    const spec = childSpec({ cycleId, pariwarId, poolIndex: 0, claimCaseId: randomUUID() });
    const roster = [randomUUID(), randomUUID()];
    const resolveAssignableRoster = vi.fn().mockResolvedValue(roster);
    spawnChildPoolMock.mockResolvedValue({
      poolId: spec.poolId,
      poolCanonicalIdentifier: spec.poolCanonicalIdentifier,
      spawned: true,
    });
    finalizeCycleIfCompleteMock.mockResolvedValue({ frozen: true, alreadyFrozen: false, committedCount: 2 });

    await runCycleSpawnChild(makeDeps({ resolveAssignableRoster }), childEnvelope(spec));

    // The resolver is called with THIS child's (pariwarId, cycleId) — the per-child (D2) resolution site.
    expect(resolveAssignableRoster).toHaveBeenCalledWith({ pariwarId, cycleId });
    // …and its output is threaded into spawnChildPool as the 4th arg (the real memberSet), with
    // `rosterWired: true` (5th arg) since a real resolver was actually supplied.
    expect(spawnChildPoolMock).toHaveBeenCalledWith(expect.anything(), spec, expect.anything(), roster, true);
  });

  it('SKIPS roster resolution on a retry of an already-spawned pool (AI-7-2 review finding)', async () => {
    const cycleId = randomUUID();
    const pariwarId = randomUUID();
    const spec = childSpec({ cycleId, pariwarId, poolIndex: 0, claimCaseId: randomUUID() });
    const resolveAssignableRoster = vi.fn().mockResolvedValue([randomUUID()]);
    isPoolAlreadySpawnedMock.mockResolvedValue(true);
    spawnChildPoolMock.mockResolvedValue({
      poolId: spec.poolId,
      poolCanonicalIdentifier: spec.poolCanonicalIdentifier,
      spawned: false,
    });
    finalizeCycleIfCompleteMock.mockResolvedValue({ frozen: true, alreadyFrozen: true, committedCount: 2 });

    await runCycleSpawnChild(makeDeps({ resolveAssignableRoster }), childEnvelope(spec));

    // The expensive O(M) roster resolution never ran — spawnChildPool's own fast path would have
    // discarded it anyway. `rosterWired` is still `true` (a real resolver dependency IS present —
    // it just wasn't called this time); it's moot either way since spawnChildPool's fast path
    // returns before ever reading memberSet/rosterWired for an already-spawned pool.
    expect(resolveAssignableRoster).not.toHaveBeenCalled();
    expect(spawnChildPoolMock).toHaveBeenCalledWith(expect.anything(), spec, expect.anything(), [], true);
  });

  it('FAILS LOUD on a roster-resolution error: records the breadcrumb, rethrows, never spawns', async () => {
    const cycleId = randomUUID();
    const pariwarId = randomUUID();
    const spec = childSpec({ cycleId, pariwarId, poolIndex: 0, claimCaseId: randomUUID() });
    const rosterErr = new Error('validity read failed mid-enumeration');
    const resolveAssignableRoster = vi.fn().mockRejectedValue(rosterErr);
    appendCycleAbortedMock.mockResolvedValue(undefined);

    await expect(
      runCycleSpawnChild(makeDeps({ resolveAssignableRoster }), childEnvelope(spec)),
    ).rejects.toBe(rosterErr);

    // A resolution failure is a cycle failure — breadcrumb recorded, and the spawn never ran (no
    // partial/empty-roster pool written).
    expect(appendCycleAbortedMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ cycleId, pariwarId, reason: 'validity read failed mid-enumeration' }),
    );
    expect(spawnChildPoolMock).not.toHaveBeenCalled();
  });

  it('alarms DISTINCTLY (P0) + records the breadcrumb + rethrows on a balancing-invariant throw (deferred-work.md:2099)', async () => {
    const cycleId = randomUUID();
    const pariwarId = randomUUID();
    const spec = childSpec({ cycleId, pariwarId, poolIndex: 1, claimCaseId: randomUUID() });
    const resolveAssignableRoster = vi.fn().mockResolvedValue([randomUUID(), randomUUID()]);
    // The now-reachable (m>0) post-balancing corruption signal, thrown by assignMembersToPools via the seam.
    const balancingErr = new poolDomain.PoolAssignmentBalancingError(10, 3, 5, 2);
    spawnChildPoolMock.mockRejectedValue(balancingErr);
    appendCycleAbortedMock.mockResolvedValue(undefined);

    const onAlarm = vi.fn();
    await expect(
      runCycleSpawnChild(makeDeps({ onAlarm, resolveAssignableRoster }), childEnvelope(spec)),
    ).rejects.toBe(balancingErr);

    // The P0 corruption alarm fires (distinct from an ordinary transient spawn failure), pinning the
    // ACTUAL cycle id, pool index, and the error's own m/max/min values — not just a generic substring,
    // so a field-swap bug (e.g. poolIndex/cycleId transposed, or the error's own m=/n=/max=/min=
    // mis-threaded) would fail this test.
    expect(onAlarm).toHaveBeenCalledWith(
      `[jobs] cycle-spawn-child: P0 assignment-balancing invariant violated for cycle ${cycleId} pool 1 — ` +
        `roster corruption, failing loud (NOT spawning a silently-unbalanced pool) — ` +
        `PoolAssignmentBalancingError: [assignMembersToPools] post-balancing invariant violated: ` +
        `max(5) - min(2) > 1 (m=10, n=3)`,
    );
    // …AND the breadcrumb is still recorded AND the error still rethrows (no silent unbalanced spawn).
    expect(appendCycleAbortedMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ cycleId, pariwarId }),
    );
  });
});

describe('registerCycleSpawnWorkers — child worker concurrency', () => {
  it('passes the configured childConcurrency as pg-boss localConcurrency for CYCLE_SPAWN_CHILD', async () => {
    const boss = makeFakeQueueClient();
    await registerCycleSpawnWorkers(boss, makeDeps({ childConcurrency: 20 }));

    expect(boss.work).toHaveBeenCalledWith(
      QUEUE_NAMES.CYCLE_SPAWN_CHILD,
      { localConcurrency: 20 },
      expect.any(Function),
    );
  });

  it('defaults to DEFAULT_CHILD_LOCAL_CONCURRENCY when childConcurrency is omitted', async () => {
    const boss = makeFakeQueueClient();
    await registerCycleSpawnWorkers(boss, makeDeps());

    expect(boss.work).toHaveBeenCalledWith(
      QUEUE_NAMES.CYCLE_SPAWN_CHILD,
      { localConcurrency: DEFAULT_CHILD_LOCAL_CONCURRENCY },
      expect.any(Function),
    );
  });

  it('registers CYCLE_SPAWN_PARENT unaffected by childConcurrency (no options object)', async () => {
    const boss = makeFakeQueueClient();
    await registerCycleSpawnWorkers(boss, makeDeps({ childConcurrency: 20 }));

    expect(boss.work).toHaveBeenCalledWith(QUEUE_NAMES.CYCLE_SPAWN_PARENT, expect.any(Function));
  });
});

describe('runCycleSpawnParent — retry before the plan is recorded', () => {
  it('rethrows "plan not yet recorded — retry" when the claim is held but getResult is still null', async () => {
    const cycleId = randomUUID();
    const pariwarId = randomUUID();
    const store = makeFakeStore();
    store.claim.mockResolvedValue('already_claimed');
    store.getResult.mockResolvedValue(null); // concurrent claimant in-flight, or the result was vacuumed
    createKeyedStoreMock.mockReturnValue(store);

    const boss = makeFakeBoss();
    const envelope = parentEnvelope({ pariwarId, cycleId, frozenClaims: [{ claimCaseId: randomUUID() }] });

    await expect(runCycleSpawnParent(makeDeps(), boss, envelope)).rejects.toThrow('plan not yet recorded');

    // Must NOT silently report success: no re-plan, no fan-out — pg-boss has to retry.
    expect(planCycleSpawnMock).not.toHaveBeenCalled();
    expect(boss.send).not.toHaveBeenCalled();
  });
});

describe('registerCycleSpawnWorkers — registered handlers dispatch to the run-functions', () => {
  // The concurrency tests above prove boss.work was CALLED with a function; these invoke that
  // captured function to prove the job→run-function glue itself — a child queue wired to the parent
  // runner (a copy-paste swap) is caught here, not by the localConcurrency assertions.
  const workCalls = (boss: QueueClient): unknown[][] =>
    (boss.work as unknown as ReturnType<typeof vi.fn>).mock.calls;

  it('CYCLE_SPAWN_CHILD handler routes each job to runCycleSpawnChild and aggregates', async () => {
    const cycleId = randomUUID();
    const pariwarId = randomUUID();
    const spec = childSpec({ cycleId, pariwarId, poolIndex: 0, claimCaseId: randomUUID() });
    spawnChildPoolMock.mockResolvedValue({
      poolId: spec.poolId,
      poolCanonicalIdentifier: spec.poolCanonicalIdentifier,
      spawned: true,
    });
    finalizeCycleIfCompleteMock.mockResolvedValue({ frozen: false, alreadyFrozen: false, committedCount: 1 });

    const boss = makeFakeQueueClient();
    await registerCycleSpawnWorkers(boss, makeDeps());
    const childCall = workCalls(boss).find((c) => c[0] === QUEUE_NAMES.CYCLE_SPAWN_CHILD)!;
    const handler = childCall[2] as (jobs: { data: unknown }[]) => Promise<unknown>;

    const result = await handler([{ data: childEnvelope(spec) }]);

    // Routed to the CHILD runner (spawnChildPool ran), NOT the parent runner (planCycleSpawn did not).
    expect(spawnChildPoolMock).toHaveBeenCalledTimes(1);
    expect(planCycleSpawnMock).not.toHaveBeenCalled();
    expect(result).toEqual({
      processed: 1,
      results: [{ poolId: spec.poolId, spawned: true, frozen: false }],
    });
  });

  it('CYCLE_SPAWN_PARENT handler routes each job to runCycleSpawnParent and aggregates', async () => {
    const cycleId = randomUUID();
    const pariwarId = randomUUID();
    const store = makeFakeStore();
    store.claim.mockResolvedValue('acquired');
    createKeyedStoreMock.mockReturnValue(store);
    planCycleSpawnMock.mockResolvedValue({ children: [], names: [] });
    appendCycleSpawnStartedMock.mockResolvedValue(undefined);

    const boss = makeFakeQueueClient();
    await registerCycleSpawnWorkers(boss, makeDeps());
    const parentCall = workCalls(boss).find((c) => c[0] === QUEUE_NAMES.CYCLE_SPAWN_PARENT)!;
    // Parent registration uses the 2-arg boss.work form → the handler is the second arg.
    const handler = parentCall[1] as (jobs: { data: unknown }[]) => Promise<unknown>;

    const envelope = parentEnvelope({ pariwarId, cycleId, frozenClaims: [] });
    const result = await handler([{ data: envelope }]);

    // Routed to the PARENT runner (planCycleSpawn ran), NOT the child runner (spawnChildPool did not).
    expect(planCycleSpawnMock).toHaveBeenCalledTimes(1);
    expect(spawnChildPoolMock).not.toHaveBeenCalled();
    expect(result).toEqual({ processed: 1, results: [{ cycleId, poolCount: 0, planned: true }] });
  });
});
