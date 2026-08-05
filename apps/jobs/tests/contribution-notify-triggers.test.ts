// The three contribution-loop triggers — DB-free unit tests (Story 8.8, Task 8; AC1, AC2, AC3).
//
// Runs with NO `DATABASE_URL` (the AI-7-1 convention): the DB reads, the keyed store and the fan-out
// itself are mocked, so what is under test here is exactly the ORCHESTRATION — the batching shape, the
// per-member idempotency, the reminder suppression, the copy assembly, and the throw-so-pg-boss-retries
// contract. The fan-out's own behaviour (the cascade, the composition order, the audit families) is
// covered by `contribution-notify.test.ts`, which drives it with real provider doubles.

import { Alert, deepLinkTargetForAlert, formatDeepLink } from '@twt/contracts';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const listCycleBindingCandidates = vi.fn();
const getCycleFreezeCommittedAt = vi.fn();
const resolvePoolIdentity = vi.fn();
const listActedMemberIdsForPool = vi.fn();
const listPendingMatchMembersForPool = vi.fn();
const claim = vi.fn();
const recordResult = vi.fn();
const release = vi.fn();
const withPariwarScope = vi.fn();

vi.mock('@twt/domain', async (importActual) => {
  const actual = await importActual<typeof import('@twt/domain')>();
  return {
    ...actual,
    // Every read in these workers runs inside `withPariwarScope`; the fake just invokes the callback
    // with a marker handle so the workers' own logic is what is exercised.
    withPariwarScope,
    pool: { ...actual.pool, listCycleBindingCandidates, getCycleFreezeCommittedAt },
    notifications: { ...actual.notifications, resolvePoolIdentity },
    contribution: { ...actual.contribution, listActedMemberIdsForPool, listPendingMatchMembersForPool },
    idempotency: {
      ...actual.idempotency,
      createKeyedStore: () => ({ claim, recordResult, release, getResult: vi.fn() }),
    },
  };
});

const fanOutAlertToMembers = vi.fn();
vi.mock('../src/scheduler/contribution-notify.js', () => ({ fanOutAlertToMembers }));

const {
  buildContributionConfirmedAlert,
  buildContributionMismatchAlert,
  buildCycleOpenAlert,
  buildDeadlineReminderAlert,
  buildPendingMatchRetryAlert,
  enqueueContributionConfirmedNotification,
  enqueueContributionMismatchNotification,
  enqueueContributionNotifyCycleOpen,
  runContributionConfirmedNotify,
  runContributionMismatchNotify,
  runContributionNotifyChild,
  runContributionNotifyParent,
  runContributionNotifyRecoverySweep,
  runDeadlineReminderSweep,
  runPendingMatchRetrySweep,
  DEFAULT_MEMBER_IDEMPOTENCY_TTL_SECONDS,
  PENDING_MATCH_IDEMPOTENCY_TTL_SECONDS,
} = await import('../src/scheduler/contribution-notify-triggers.js');

const PARIWAR = '11111111-1111-1111-1111-111111111111';
const ALERT = '33333333-3333-3333-3333-333333333333';
const CYCLE = '55555555-5555-5555-5555-555555555555';
const POOL_A = '44444444-4444-4444-4444-444444444444';
const POOL_B = '66666666-6666-6666-6666-666666666666';
const CLAIM_CASE = '77777777-7777-7777-7777-777777777777';
const M1 = 'aaaaaaaa-0000-0000-0000-000000000001';
const M2 = 'aaaaaaaa-0000-0000-0000-000000000002';
const M3 = 'aaaaaaaa-0000-0000-0000-000000000003';

const IDENTITY = {
  deceasedFirstName: 'रामेश्वर',
  deceasedLastInitial: 'प्र',
  poolLetterCode: 'A',
  poolName: 'युधिष्ठिर',
  poolCanonicalIdentifier: 'TWT-BIH-2026-07-A',
  fixedAmount: 1100,
};

const NOW = new Date('2026-07-23T00:00:00.000Z');

function deps(overrides: Record<string, unknown> = {}) {
  return {
    pool: {} as never,
    serviceDb: {} as never,
    encryption: {} as never,
    audit: () => Promise.resolve(),
    hashRendered: () => Promise.resolve('a'.repeat(64)),
    now: () => NOW,
    onAlarm: vi.fn(),
    ...overrides,
  } as never;
}

function envelope<T>(payload: T) {
  return { requestId: 'req-1', pariwarId: PARIWAR, actorId: null, traceId: 'trace-1', payload };
}

function candidate(poolId: string, poolIndex: number, memberIds: string[]) {
  return {
    poolId,
    poolIndex,
    poolCanonicalIdentifier: `TWT-BIH-2026-07-${String.fromCharCode(65 + poolIndex)}`,
    fixedAmount: 1100,
    claimCaseId: CLAIM_CASE,
    memberIds,
  };
}

function childPayload(overrides: Record<string, unknown> = {}) {
  return {
    kind: 'cycle_open',
    alertId: ALERT,
    cycleId: CYCLE,
    poolId: POOL_A,
    poolIndex: 0,
    poolCanonicalIdentifier: 'TWT-BIH-2026-07-A',
    claimCaseId: CLAIM_CASE,
    fixedAmount: 1100,
    poolCount: 2,
    memberIds: [M1, M2],
    timeCritical: false,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  withPariwarScope.mockImplementation(
    (_pool: unknown, _pariwarId: string, fn: (db: unknown, client: unknown) => unknown) =>
      Promise.resolve(fn({ marker: 'db' }, { marker: 'client' })),
  );
  resolvePoolIdentity.mockResolvedValue(IDENTITY);
  listActedMemberIdsForPool.mockResolvedValue({ confirmed: [], attested: [] });
  listPendingMatchMembersForPool.mockResolvedValue([]);
  claim.mockResolvedValue('acquired');
  recordResult.mockResolvedValue(undefined);
  release.mockResolvedValue(undefined);
  fanOutAlertToMembers.mockImplementation((_d: unknown, _a: unknown, memberIds: string[]) =>
    Promise.resolve({
      results: memberIds.map((memberId) => ({
        memberId,
        delivered: true,
        deliveredChannel: 'push',
        trail: [{ channel: 'push', attempt: 0, outcome: 'sent' }],
        bridged: false,
        costSuppressedChannels: [],
        telegramMirrored: false,
      })),
      undelivered: [],
    }),
  );
});

// ─── Task 5 — the cycle-open parent (AC1) ──────────────────────────────────────────────────────────

describe('AC1 — the cycle-open parent fans out ONE child per pool (D6 batching)', () => {
  it('pages the cycle`s pools from the persisted snapshot and enqueues a child each', async () => {
    listCycleBindingCandidates.mockResolvedValue([
      candidate(POOL_A, 0, [M1, M2]),
      candidate(POOL_B, 1, [M3]),
    ]);
    const send = vi.fn().mockResolvedValue(undefined);

    const result = await runContributionNotifyParent(
      deps(),
      { send },
      envelope({ alertId: ALERT, cycleId: CYCLE, timeCritical: false }),
    );

    expect(result).toEqual({ alertId: ALERT, poolCount: 2, membersQueued: 3 });
    expect(send).toHaveBeenCalledTimes(2);
    // singletonKey = alert:pool so a re-enqueued parent cannot double-fan a pool.
    expect(send.mock.calls[0]![2]).toMatchObject({ singletonKey: `${ALERT}:${POOL_A}` });
    expect(send.mock.calls[1]![2]).toMatchObject({ singletonKey: `${ALERT}:${POOL_B}` });
    // The retry policy is STATED at the enqueue site (D9), never inherited.
    expect(send.mock.calls[0]![2]).toMatchObject({ retryLimit: 4, retryBackoff: true });
  });

  it('threads `time_critical` VERBATIM to every child (never re-derived — invariant 6)', async () => {
    listCycleBindingCandidates.mockResolvedValue([candidate(POOL_A, 0, [M1])]);
    const send = vi.fn().mockResolvedValue(undefined);

    await runContributionNotifyParent(
      deps(),
      { send },
      envelope({ alertId: ALERT, cycleId: CYCLE, timeCritical: true }),
    );

    expect(send.mock.calls[0]![1].payload).toMatchObject({ timeCritical: true, kind: 'cycle_open' });
  });

  it('a cycle with no pools enqueues nothing (never a job with an empty roster)', async () => {
    listCycleBindingCandidates.mockResolvedValue([]);
    const send = vi.fn();
    const result = await runContributionNotifyParent(
      deps(),
      { send },
      envelope({ alertId: ALERT, cycleId: CYCLE, timeCritical: false }),
    );
    expect(result.poolCount).toBe(0);
    expect(send).not.toHaveBeenCalled();
  });

  it('a missing pariwarId THROWS (a tenant-less fan-out is a defect, not a silent skip)', async () => {
    await expect(
      runContributionNotifyParent(
        deps(),
        { send: vi.fn() },
        { ...envelope({ alertId: ALERT, cycleId: CYCLE, timeCritical: false }), pariwarId: null },
      ),
    ).rejects.toThrow(/missing pariwarId/);
  });
});

// ─── The shared child worker (AC1) ─────────────────────────────────────────────────────────────────

describe('AC1 — the child worker: idempotency, batching, and the retry contract', () => {
  it('claims every member BEFORE sending and records each delivered member', async () => {
    const result = await runContributionNotifyChild(deps(), envelope(childPayload()) as never);

    expect(claim).toHaveBeenCalledTimes(2);
    expect(claim.mock.calls[0]![0]).toBe(`contribution.notify:${ALERT}:${M1}:cycle_open`);
    expect(result).toMatchObject({ attempted: 2, delivered: 2, alreadySent: 0, suppressed: 0 });
    expect(recordResult).toHaveBeenCalledTimes(2);
  });

  it('a SECOND run sends nothing — every member is already claimed (AC1 idempotency)', async () => {
    claim.mockResolvedValue('already_claimed');
    const result = await runContributionNotifyChild(deps(), envelope(childPayload()) as never);

    expect(fanOutAlertToMembers).not.toHaveBeenCalled();
    expect(result).toMatchObject({ attempted: 0, delivered: 0, alreadySent: 2 });
  });

  it('the deadline-reminder scope is keyed on the CYCLE DAY — day 5 and day 13 are distinct sends', async () => {
    await runContributionNotifyChild(
      deps(),
      envelope(
        childPayload({
          kind: 'deadline_reminder',
          cycleDay: 13,
          deadlineAtIso: '2026-08-05T00:00:00.000Z',
          memberIds: [M1],
        }),
      ) as never,
    );
    expect(claim.mock.calls[0]![0]).toBe(`contribution.notify:${ALERT}:${M1}:day_13`);
  });

  it('an UNDELIVERED member makes the job THROW (pg-boss owns the backoff — D9)', async () => {
    fanOutAlertToMembers.mockResolvedValue({
      results: [{ memberId: M1, delivered: true, deliveredChannel: 'push', trail: [], bridged: false, costSuppressedChannels: [], telegramMirrored: false }],
      undelivered: [M2],
    });

    await expect(
      runContributionNotifyChild(deps(), envelope(childPayload()) as never),
    ).rejects.toThrow(/undelivered/);

    // The member who DID deliver is recorded, so the retry re-sends nothing to them…
    expect(recordResult).toHaveBeenCalledTimes(1);
    expect(recordResult.mock.calls[0]![0]).toContain(M1);
    // …and the one who did NOT is released, so the retry can re-claim immediately.
    expect(release).toHaveBeenCalledTimes(1);
    expect(release.mock.calls[0]![0]).toContain(M2);
  });

  it('chunks the roster — a large pool is processed in bounded batches, not one query', async () => {
    const members = Array.from({ length: 5 }, (_, i) => `aaaaaaaa-0000-0000-0000-00000000000${String(i)}`);
    await runContributionNotifyChild(
      deps({ memberChunkSize: 2 }),
      envelope(childPayload({ memberIds: members })) as never,
    );
    expect(fanOutAlertToMembers).toHaveBeenCalledTimes(3); // 2 + 2 + 1
  });

  it('an UNRESOLVABLE pool identity skips the pool LOUDLY — never a push naming no family', async () => {
    resolvePoolIdentity.mockResolvedValue(null);
    const onAlarm = vi.fn();
    const result = await runContributionNotifyChild(
      deps({ onAlarm }),
      envelope(childPayload()) as never,
    );

    expect(fanOutAlertToMembers).not.toHaveBeenCalled();
    expect(claim).not.toHaveBeenCalled();
    expect(result).toMatchObject({ attempted: 0, delivered: 0 });
    expect(onAlarm).toHaveBeenCalledWith(expect.stringContaining('pool identity unresolvable'));
  });

  it('nothing persisted to the idempotency store carries PII', async () => {
    await runContributionNotifyChild(deps(), envelope(childPayload({ memberIds: [M1] })) as never);
    const stored = JSON.stringify(recordResult.mock.calls[0]![1]);
    expect(stored).not.toContain('device');
    expect(stored).not.toContain('+91');
    expect(stored).toContain('push');
  });
});

// ─── Story 9.10 — the pending-match retry kinds ride the SAME child worker ─────────────────────────

describe('Story 9.10 AC3 — the pending-match tiers use the LONG-LIVED idempotency TTL, never the 300s default', () => {
  it('a `pending_match` (soft) send claims with PENDING_MATCH_IDEMPOTENCY_TTL_SECONDS', async () => {
    await runContributionNotifyChild(
      deps(),
      envelope(childPayload({ kind: 'pending_match', memberIds: [M1] })) as never,
    );
    expect(claim).toHaveBeenCalledWith(expect.stringContaining(':pending_match'), PENDING_MATCH_IDEMPOTENCY_TTL_SECONDS);
    expect(PENDING_MATCH_IDEMPOTENCY_TTL_SECONDS).toBeGreaterThan(DEFAULT_MEMBER_IDEMPOTENCY_TTL_SECONDS);
  });

  it('a `pending_match_escalated` send claims with the SAME long-lived TTL, under a DISTINCT scope', async () => {
    await runContributionNotifyChild(
      deps(),
      envelope(childPayload({ kind: 'pending_match_escalated', memberIds: [M1] })) as never,
    );
    expect(claim.mock.calls[0]![0]).toBe(`contribution.notify:${ALERT}:${M1}:pending_match_escalated`);
    expect(claim.mock.calls[0]![1]).toBe(PENDING_MATCH_IDEMPOTENCY_TTL_SECONDS);
  });

  it('a caller-supplied pendingMatchIdempotencyTtlSeconds override is honored', async () => {
    await runContributionNotifyChild(
      deps({ pendingMatchIdempotencyTtlSeconds: 999 }),
      envelope(childPayload({ kind: 'pending_match', memberIds: [M1] })) as never,
    );
    expect(claim.mock.calls[0]![1]).toBe(999);
  });

  it('a SECOND run for the SAME (alert, member, tier) sends nothing — the once-ever guard', async () => {
    claim.mockResolvedValue('already_claimed');
    const result = await runContributionNotifyChild(
      deps(),
      envelope(childPayload({ kind: 'pending_match', memberIds: [M1] })) as never,
    );
    expect(fanOutAlertToMembers).not.toHaveBeenCalled();
    expect(result).toMatchObject({ attempted: 0, delivered: 0, alreadySent: 1 });
  });

  it('the soft and escalated tiers do NOT run reminder suppression — the sweep already scoped to unresolved members (AC7)', async () => {
    await runContributionNotifyChild(
      deps(),
      envelope(childPayload({ kind: 'pending_match', memberIds: [M1] })) as never,
    );
    expect(listActedMemberIdsForPool).not.toHaveBeenCalled();
  });

  it('the alert built for a pending_match send is NEVER time_critical (AC6)', async () => {
    await runContributionNotifyChild(
      deps(),
      envelope(childPayload({ kind: 'pending_match', memberIds: [M1], timeCritical: true })) as never,
    );
    const alertArg = fanOutAlertToMembers.mock.calls[0]![1] as (memberId: string) => { time_critical: boolean };
    expect(alertArg(M1).time_critical).toBe(false);
  });
});

// ─── Task 6 — reminder suppression (AC2 / D3 / ratified Decision 2) ────────────────────────────────

// ─── Task 5 — the cycle-open RECOVERY sweep (D4: enqueue primary, sweep recovery) ─────────────────────

describe('the cycle-open notification RECOVERY sweep — per-pool coverage, not just "any trace"', () => {
  function recoveryDeps(notifiedMembers: number, overrides: Record<string, unknown> = {}) {
    listCycleBindingCandidates.mockResolvedValue([candidate(POOL_A, 0, [M1, M2, M3])]);
    return deps({
      pool: {
        query: () =>
          Promise.resolve({
            rows: [
              {
                alert_id: ALERT,
                cycle_id: CYCLE,
                pariwar_id: PARIWAR,
                notified_members: String(notifiedMembers),
              },
            ],
          }),
      },
      ...overrides,
    });
  }

  it('re-enqueues an alert with ZERO notified members (the old "no trace" case)', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const reEnqueued = await runContributionNotifyRecoverySweep(recoveryDeps(0), { send });

    expect(reEnqueued).toBe(1);
    expect(send.mock.calls[0]![0]).toBe('contribution.notify.cycle_open');
  });

  it('re-enqueues an alert with SOME but not all members notified — a partial parent-enqueue failure', async () => {
    // The bug the "any key exists" probe missed: pool has 3 members, only 1 was ever notified (e.g. the
    // parent enqueued this pool's child before crashing on a sibling pool). A single key existing must
    // not be read as "the whole fan-out ran".
    const send = vi.fn().mockResolvedValue(undefined);
    const reEnqueued = await runContributionNotifyRecoverySweep(recoveryDeps(1), { send });

    expect(reEnqueued).toBe(1);
  });

  it('does NOT re-enqueue an alert whose notified-member count already covers every expected member', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const reEnqueued = await runContributionNotifyRecoverySweep(recoveryDeps(3), { send });

    expect(reEnqueued).toBe(0);
    expect(send).not.toHaveBeenCalled();
  });

  it('skips a cycle whose pools are all empty (zero expected members) without re-enqueueing', async () => {
    listCycleBindingCandidates.mockResolvedValue([]);
    const send = vi.fn().mockResolvedValue(undefined);
    const d = deps({
      pool: {
        query: () =>
          Promise.resolve({
            rows: [{ alert_id: ALERT, cycle_id: CYCLE, pariwar_id: PARIWAR, notified_members: '0' }],
          }),
      },
    });
    const reEnqueued = await runContributionNotifyRecoverySweep(d, { send });

    expect(reEnqueued).toBe(0);
    expect(send).not.toHaveBeenCalled();
  });

  it('gives each re-enqueue a per-attempt requestId/traceId so repeated ticks are distinguishable', async () => {
    const runAt = new Date('2026-08-01T09:40:00.000Z');
    const send = vi.fn().mockResolvedValue(undefined);
    const d = recoveryDeps(0, { now: () => runAt });
    await runContributionNotifyRecoverySweep(d, { send });

    const ctx = send.mock.calls[0]![1] as { requestId: string; traceId: string };
    expect(ctx.requestId).toBe(`contribution.notify.sweep:${ALERT}:${String(runAt.getTime())}`);
    expect(ctx.traceId).toBe(`contribution.notify.sweep:${ALERT}:${String(runAt.getTime())}`);
  });
});

describe('AC2/D3 — a member who has already ACTED is not nudged, with DISTINCT reasons', () => {
  it('suppresses BOTH the confirmed (green) and the attested (yellow) members', async () => {
    listActedMemberIdsForPool.mockResolvedValue({ confirmed: [M1], attested: [M2] });
    const result = await runContributionNotifyChild(
      deps(),
      envelope(
        childPayload({
          kind: 'deadline_reminder',
          cycleDay: 5,
          deadlineAtIso: '2026-08-05T00:00:00.000Z',
          memberIds: [M1, M2, M3],
        }),
      ) as never,
    );

    expect(result.suppressed).toBe(2);
    // Only the member who has NOT acted is sent to — and no claim is even taken for the others.
    expect(fanOutAlertToMembers.mock.calls[0]![2]).toEqual([M3]);
    expect(claim).toHaveBeenCalledTimes(1);
  });

  it('the two sets are read SEPARATELY — the read returns them unmerged so they cannot be conflated', async () => {
    listActedMemberIdsForPool.mockResolvedValue({ confirmed: [M1], attested: [M2] });
    await runContributionNotifyChild(
      deps(),
      envelope(
        childPayload({ kind: 'deadline_reminder', cycleDay: 5, deadlineAtIso: '2026-08-05T00:00:00.000Z' }),
      ) as never,
    );
    const call = listActedMemberIdsForPool.mock.calls[0]![1] as Record<string, string>;
    expect(call).toMatchObject({ alertId: ALERT, poolId: POOL_A });
  });

  it('suppression is a NUDGE decision only — the cycle-open trigger never consults it', async () => {
    // The load-bearing half of the yellow-never-green invariant: an attested member still receives the
    // cycle-open announcement, and no counting/promotion read is involved on that path at all.
    listActedMemberIdsForPool.mockResolvedValue({ confirmed: [M1], attested: [M2] });
    const result = await runContributionNotifyChild(deps(), envelope(childPayload()) as never);

    expect(listActedMemberIdsForPool).not.toHaveBeenCalled();
    expect(result.suppressed).toBe(0);
    expect(fanOutAlertToMembers.mock.calls[0]![2]).toEqual([M1, M2]);
  });

  it('suppression never surfaces a confirmed-count, contributor list, or any "raised so far" figure — result is COUNTS ONLY', async () => {
    // The load-bearing half of epics.md:2935-2941: a suppression decision is a courtesy count only — it
    // must never surface as a confirmed-contributor list or a "raised so far" figure anywhere the child
    // worker returns.
    listActedMemberIdsForPool.mockResolvedValue({ confirmed: [M1], attested: [M2] });
    const result = await runContributionNotifyChild(
      deps(),
      envelope(
        childPayload({
          kind: 'deadline_reminder',
          cycleDay: 5,
          deadlineAtIso: '2026-08-05T00:00:00.000Z',
          memberIds: [M1, M2, M3],
        }),
      ) as never,
    );

    expect(Object.keys(result).sort()).toEqual(
      ['alertId', 'alreadySent', 'attempted', 'delivered', 'kind', 'poolId', 'suppressed'].sort(),
    );
    expect(result).not.toHaveProperty('confirmedCount');
    expect(result).not.toHaveProperty('confirmedMembers');
    expect(result).not.toHaveProperty('raisedSoFar');
  });
});

// ─── Task 6 — the cadence sweep (AC2) ──────────────────────────────────────────────────────────────

describe('AC2 — the daily sweep fires ONLY on cycle-days 5 / 10 / 13 / 14', () => {
  function sweepDeps(committedAt: Date, now: Date) {
    getCycleFreezeCommittedAt.mockResolvedValue(committedAt);
    listCycleBindingCandidates.mockResolvedValue([candidate(POOL_A, 0, [M1])]);
    return deps({
      now: () => now,
      pool: {
        query: () =>
          Promise.resolve({ rows: [{ alert_id: ALERT, cycle_id: CYCLE, pariwar_id: PARIWAR }] }),
      },
    });
  }

  const committedAt = new Date('2026-07-01T00:00:00.000Z');

  for (const [day, iso] of [
    [5, '2026-07-06T00:00:00.000Z'],
    [10, '2026-07-11T00:00:00.000Z'],
    [13, '2026-07-14T00:00:00.000Z'],
    [14, '2026-07-15T00:00:00.000Z'],
  ] as const) {
    it(`cycle-day ${String(day)} → enqueues the pool batch`, async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const result = await runDeadlineReminderSweep(sweepDeps(committedAt, new Date(iso)), { send });
      expect(result.enqueuedPools).toBe(1);
      expect(send.mock.calls[0]![1].payload).toMatchObject({
        kind: 'deadline_reminder',
        cycleDay: day,
        // A reminder is NEVER time-critical: `time_critical` is the AR-18 cycle-open signal.
        timeCritical: false,
      });
      expect(send.mock.calls[0]![2]).toMatchObject({
        singletonKey: `${ALERT}:${POOL_A}:d${String(day)}`,
      });
    });
  }

  for (const [day, iso] of [
    [0, '2026-07-01T00:00:00.000Z'],
    [4, '2026-07-05T00:00:00.000Z'],
    [11, '2026-07-12T00:00:00.000Z'],
    [15, '2026-07-16T00:00:00.000Z'],
  ] as const) {
    it(`cycle-day ${String(day)} → enqueues NOTHING (a non-cadence day is silent)`, async () => {
      const send = vi.fn();
      const result = await runDeadlineReminderSweep(sweepDeps(committedAt, new Date(iso)), { send });
      expect(result.enqueuedPools).toBe(0);
      expect(send).not.toHaveBeenCalled();
    });
  }

  it('a live alert with NO cycle-freeze commit is skipped with an alarm, not sent blind', async () => {
    getCycleFreezeCommittedAt.mockResolvedValue(null);
    const onAlarm = vi.fn();
    const send = vi.fn();
    const d = deps({
      now: () => new Date('2026-07-06T00:00:00.000Z'),
      onAlarm,
      pool: {
        query: () =>
          Promise.resolve({ rows: [{ alert_id: ALERT, cycle_id: CYCLE, pariwar_id: PARIWAR }] }),
      },
    });
    await runDeadlineReminderSweep(d, { send });
    expect(send).not.toHaveBeenCalled();
    expect(onAlarm).toHaveBeenCalledWith(expect.stringContaining('no cycle-freeze commit'));
  });
});

// ─── Story 9.10, Task 3 — the pending-match retry cadence sweep ────────────────────────────────────

describe('Story 9.10 AC2/AC5/AC6 — the pending-match retry sweep buckets by tier', () => {
  function sweepDeps(now: Date, overrides: Record<string, unknown> = {}) {
    listCycleBindingCandidates.mockResolvedValue([candidate(POOL_A, 0, [M1, M2, M3])]);
    return deps({
      now: () => now,
      pool: {
        query: () =>
          Promise.resolve({ rows: [{ alert_id: ALERT, cycle_id: CYCLE, pariwar_id: PARIWAR }] }),
      },
      ...overrides,
    });
  }

  const NOW_SWEEP = new Date('2026-08-01T00:00:00.000Z');

  it('scans BOTH live and closed alerts (the reconciliation-tail bound, unlike the live-only deadline sweep)', async () => {
    const queryFn = vi.fn().mockResolvedValue({ rows: [] });
    await runPendingMatchRetrySweep(deps({ pool: { query: queryFn } }), { send: vi.fn() });
    expect(queryFn.mock.calls[0]![0]).toMatch(/current_state IN \('live', 'closed'\)/);
  });

  it("an attestation ≥4h old but <24h → enqueues ONLY the soft tier batch", async () => {
    listPendingMatchMembersForPool.mockResolvedValue([
      { memberId: M1, oldestUnresolvedAttestedAt: new Date(NOW_SWEEP.getTime() - 5 * 60 * 60 * 1000) },
    ]);
    const send = vi.fn().mockResolvedValue(undefined);
    const result = await runPendingMatchRetrySweep(sweepDeps(NOW_SWEEP), { send });

    expect(result.enqueuedBatches).toBe(1);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0]![1].payload).toMatchObject({
      kind: 'pending_match',
      memberIds: [M1],
      timeCritical: false,
    });
  });

  it('an attestation ≥24h old → enqueues ONLY the escalated tier batch (not both)', async () => {
    listPendingMatchMembersForPool.mockResolvedValue([
      { memberId: M1, oldestUnresolvedAttestedAt: new Date(NOW_SWEEP.getTime() - 30 * 60 * 60 * 1000) },
    ]);
    const send = vi.fn().mockResolvedValue(undefined);
    const result = await runPendingMatchRetrySweep(sweepDeps(NOW_SWEEP), { send });

    expect(result.enqueuedBatches).toBe(1);
    expect(send.mock.calls[0]![1].payload).toMatchObject({ kind: 'pending_match_escalated', memberIds: [M1] });
  });

  it('an attestation <4h old → enqueues NOTHING yet (too early for even the soft tier)', async () => {
    listPendingMatchMembersForPool.mockResolvedValue([
      { memberId: M1, oldestUnresolvedAttestedAt: new Date(NOW_SWEEP.getTime() - 60 * 60 * 1000) },
    ]);
    const send = vi.fn();
    const result = await runPendingMatchRetrySweep(sweepDeps(NOW_SWEEP), { send });
    expect(result.enqueuedBatches).toBe(0);
    expect(send).not.toHaveBeenCalled();
  });

  it('a pool with mixed ages enqueues BOTH tier batches, one per tier', async () => {
    listPendingMatchMembersForPool.mockResolvedValue([
      { memberId: M1, oldestUnresolvedAttestedAt: new Date(NOW_SWEEP.getTime() - 5 * 60 * 60 * 1000) }, // soft
      { memberId: M2, oldestUnresolvedAttestedAt: new Date(NOW_SWEEP.getTime() - 30 * 60 * 60 * 1000) }, // escalated
    ]);
    const send = vi.fn().mockResolvedValue(undefined);
    const result = await runPendingMatchRetrySweep(sweepDeps(NOW_SWEEP), { send });

    expect(result.enqueuedBatches).toBe(2);
    const kinds = send.mock.calls.map((c) => (c[1] as { payload: { kind: string } }).payload.kind).sort();
    expect(kinds).toEqual(['pending_match', 'pending_match_escalated']);
  });

  it('a pool with no pending-match members enqueues nothing (no query for tiers)', async () => {
    listPendingMatchMembersForPool.mockResolvedValue([]);
    const send = vi.fn();
    const result = await runPendingMatchRetrySweep(sweepDeps(NOW_SWEEP), { send });
    expect(result.enqueuedBatches).toBe(0);
    expect(send).not.toHaveBeenCalled();
  });

  it("ONE pool's failure never costs its SIBLING pool's reminder", async () => {
    listCycleBindingCandidates.mockResolvedValue([candidate(POOL_A, 0, [M1]), candidate(POOL_B, 1, [M2])]);
    listPendingMatchMembersForPool.mockImplementation((_db: unknown, { poolId }: { poolId: string }) => {
      if (poolId === POOL_A) throw new Error('boom');
      return Promise.resolve([
        { memberId: M2, oldestUnresolvedAttestedAt: new Date(NOW_SWEEP.getTime() - 5 * 60 * 60 * 1000) },
      ]);
    });
    const onAlarm = vi.fn();
    const send = vi.fn().mockResolvedValue(undefined);
    const result = await runPendingMatchRetrySweep(deps({ now: () => NOW_SWEEP, onAlarm, pool: { query: () => Promise.resolve({ rows: [{ alert_id: ALERT, cycle_id: CYCLE, pariwar_id: PARIWAR }] }) } }), { send });

    expect(result.enqueuedBatches).toBe(1);
    expect(send.mock.calls[0]![1].payload).toMatchObject({ poolId: POOL_B });
    expect(onAlarm).toHaveBeenCalledWith(expect.stringContaining('boom'));
  });
});

// ─── Task 7 — the Epic-9 contribution-confirmed seam (AC3) ─────────────────────────────────────────

describe('AC3 — the contribution-confirmed seam Epic 9 calls', () => {
  it('the exported enqueue targets the confirmed queue, singleton per (alert, member)', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    await enqueueContributionConfirmedNotification(
      { send },
      { pariwarId: PARIWAR, requestId: 'r', actorId: null, traceId: 't' },
      { alertId: ALERT, poolId: POOL_A, memberId: M1, amountPaise: 110000, periodLabel: '2026-07' },
    );
    expect(send.mock.calls[0]![0]).toBe('contribution.notify.confirmed');
    expect(send.mock.calls[0]![2]).toMatchObject({ singletonKey: `${ALERT}:${M1}:confirmed` });
  });

  it('the worker builds a `contribution_confirmed` alert and fans it out — driven by a synthesized event', async () => {
    // Epic 9's producer is unbuilt, so the seam is proven by driving it with a hand-built event shape.
    // When Epic 9 lands its `contribution.confirmed` emitter, this fires with ZERO changes here.
    const result = await runContributionConfirmedNotify(
      deps(),
      envelope({
        alertId: ALERT,
        poolId: POOL_A,
        memberId: M1,
        amountPaise: 110000,
        periodLabel: '2026-07',
      }) as never,
    );

    expect(result).toMatchObject({ delivered: true, alreadySent: false });
    const alert = fanOutAlertToMembers.mock.calls[0]![1]() as Alert;
    expect(alert.alert_category).toBe('contribution_confirmed');
    expect(alert.time_critical).toBe(false);
    expect(() => Alert.parse(alert)).not.toThrow();
  });

  it('the confirmed push deep-links to the member`s own contribution surface (contributions/:pool_id)', async () => {
    const alert = buildContributionConfirmedAlert({
      alertId: ALERT,
      pariwarId: PARIWAR,
      memberId: M1,
      poolId: POOL_A,
      amountPaise: 110000,
      periodLabel: '2026-07',
      locale: 'hi',
      now: NOW,
    });
    const target = deepLinkTargetForAlert(alert);
    expect(target).toEqual({ pariwarId: PARIWAR, resource: 'contributions', resourceId: POOL_A });
    expect(formatDeepLink(target!)).toBe(`twt://p/${PARIWAR}/contributions/${POOL_A}`);
  });

  it('a redelivery no-ops (idempotent per (alert, member, confirmed))', async () => {
    claim.mockResolvedValue('already_claimed');
    const result = await runContributionConfirmedNotify(
      deps(),
      envelope({
        alertId: ALERT,
        poolId: POOL_A,
        memberId: M1,
        amountPaise: 110000,
        periodLabel: '2026-07',
      }) as never,
    );
    expect(result).toMatchObject({ alreadySent: true, delivered: false });
    expect(fanOutAlertToMembers).not.toHaveBeenCalled();
  });
});

describe('Story 9.7 (FR-30/FR-32) — the contribution-MISMATCH seam the matcher calls', () => {
  it('the exported enqueue targets the mismatch queue, singleton per (alert, member, reason)', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    await enqueueContributionMismatchNotification(
      { send },
      { pariwarId: PARIWAR, requestId: 'r', actorId: null, traceId: 't' },
      { alertId: ALERT, poolId: POOL_A, memberId: M1, reason: 'wrong_pool' },
    );
    expect(send.mock.calls[0]![0]).toBe('contribution.notify.mismatch');
    // The reason is in the key so a NEW reason re-notifies (mirrors the matcher's (pool,member,reason) dedup).
    expect(send.mock.calls[0]![2]).toMatchObject({ singletonKey: `${ALERT}:${M1}:mismatch:wrong_pool` });
  });

  it('the worker builds a `contribution_mismatch` alert (time_critical:false) and fans it out', async () => {
    const result = await runContributionMismatchNotify(
      deps(),
      envelope({ alertId: ALERT, poolId: POOL_A, memberId: M1, reason: 'wrong_pool' }) as never,
    );
    expect(result).toMatchObject({ delivered: true, alreadySent: false });
    const alert = fanOutAlertToMembers.mock.calls[0]![1]() as Alert;
    expect(alert.alert_category).toBe('contribution_mismatch');
    expect(alert.time_critical).toBe(false);
    expect(() => Alert.parse(alert)).not.toThrow();
  });

  it('the mismatch body is DIGNIFIED, resolved from the reason-code — never the raw enum, never alarming', () => {
    const alert = buildContributionMismatchAlert({
      alertId: ALERT,
      pariwarId: PARIWAR,
      memberId: M1,
      poolId: POOL_A,
      reason: 'wrong_pool',
      locale: 'en',
      now: NOW,
    });
    const body = (alert.payload_data as { body?: string }).body ?? '';
    expect(body.length).toBeGreaterThan(0);
    // Pattern-4: no raw enum, no alarming vocabulary.
    expect(body).not.toContain('wrong_pool');
    expect(body).not.toMatch(/error|failed|invalid|mismatch/i);
  });

  it('the mismatch push deep-links to the member`s own contribution surface (contributions/:pool_id)', () => {
    const alert = buildContributionMismatchAlert({
      alertId: ALERT,
      pariwarId: PARIWAR,
      memberId: M1,
      poolId: POOL_A,
      reason: 'amount_mismatch',
      locale: 'hi',
      now: NOW,
    });
    const target = deepLinkTargetForAlert(alert);
    expect(target).toEqual({ pariwarId: PARIWAR, resource: 'contributions', resourceId: POOL_A });
    expect(formatDeepLink(target!)).toBe(`twt://p/${PARIWAR}/contributions/${POOL_A}`);
  });

  it('an unknown reason falls back to the generic dignified body (never a blank push)', () => {
    const alert = buildContributionMismatchAlert({
      alertId: ALERT,
      pariwarId: PARIWAR,
      memberId: M1,
      poolId: POOL_A,
      reason: 'some_future_reason',
      locale: 'en',
      now: NOW,
    });
    expect(((alert.payload_data as { body?: string }).body ?? '').length).toBeGreaterThan(0);
  });

  it('a redelivery of the same reason no-ops (idempotent per (alert, member, mismatch:<reason>))', async () => {
    claim.mockResolvedValue('already_claimed');
    const result = await runContributionMismatchNotify(
      deps(),
      envelope({ alertId: ALERT, poolId: POOL_A, memberId: M1, reason: 'wrong_pool' }) as never,
    );
    expect(result).toMatchObject({ alreadySent: true, delivered: false });
    expect(fanOutAlertToMembers).not.toHaveBeenCalled();
  });
});

// ─── Story 10.17 D4 — the alert builders stay MODERATION-BLIND ─────────────────────────────────────

describe('Story 10.17 D4 — a suspended member receives the SAME contribution alert, byte for byte', () => {
  // ── The epic line this answers ────────────────────────────────────────────────────────────────
  // `epics.md:3705` says *"a suspended member receiving a contribution alert is the cure working, and
  // the copy must say so."* Read literally that could mean branching the alert copy on moderation
  // status. Story 10.17 D4 RATIFIES NOT DOING THAT, for three reasons, and this test is where the
  // decision is recorded executably rather than left as an unanswered epic line:
  //
  //   1. PRIVACY. A push notification renders on a LOCK SCREEN, in front of whoever is holding the
  //      phone. A sanction reaching a member-AUTHENTICATED surface (the 10.10/10.16 precedent) is not
  //      a licence to put it on a lock screen.
  //   2. ARCHITECTURE. These builders take pool identity, locale and clock — nothing member-status-
  //      shaped. Threading a moderation read in would add a per-member validity read to a 4L-scale
  //      fan-out hot path, for a copy variant.
  //   3. IT IS ALREADY SAID, IN THE RIGHT PLACE. The member-facing explanation of "why am I being
  //      asked to contribute while suspended" is the Story 10.16 disclosure, rendered ON THE PAYMENT
  //      SURFACE, before they can act (10.16 AC1). Not the push.
  //
  // So "reconciled" here means: the builders take no moderation input, and this pins that they can't
  // acquire one silently. If suspension-aware alert copy is ever wanted, it is a separate, deliberate
  // decision — flag it, do not build it.

  it('takes NO moderation input — the input shape has no member-standing-shaped slot', () => {
    // The structural half. Two members differing ONLY in moderation standing are indistinguishable to
    // these builders because there is nowhere to express the difference: the input carries member
    // IDENTITY (`memberId`) but never member STANDING.
    const input = {
      alertId: ALERT,
      pariwarId: PARIWAR,
      memberId: M1,
      poolId: POOL_A,
      identity: IDENTITY,
      timeCritical: false,
      locale: 'hi' as const,
      now: NOW,
    };
    expect(Object.keys(input).sort()).toEqual([
      'alertId', 'identity', 'locale', 'memberId', 'now', 'pariwarId', 'poolId', 'timeCritical',
    ]);
  });

  it('produces byte-identical cycle-open + deadline alerts for two arbitrary member ids', () => {
    // The behavioural half. M1 and M2 are just two distinct member ids here — the test above already
    // proves the input shape has no member-standing slot, so no payload value COULD encode "suspended"
    // vs "unmoderated" either way. What this test adds is the empirical confirmation that varying only
    // `memberId` never leaks into `payload_data`, closing the gap a lookup keyed by memberId could open.
    const openFor = (memberId: string) =>
      buildCycleOpenAlert({
        alertId: ALERT, pariwarId: PARIWAR, memberId, poolId: POOL_A,
        identity: IDENTITY, timeCritical: false, locale: 'hi', now: NOW,
      });
    const deadlineFor = (memberId: string) =>
      buildDeadlineReminderAlert({
        alertId: ALERT, pariwarId: PARIWAR, memberId, poolId: POOL_A,
        identity: IDENTITY, cycleDay: 10, deadlineAt: new Date('2026-08-05T00:00:00.000Z'),
        timeCritical: true, locale: 'hi', now: NOW,
      });

    // `payload_data` is the entire member-facing surface — if moderation ever leaked into the copy,
    // it would leak HERE.
    expect(openFor(M2).payload_data).toEqual(openFor(M1).payload_data);
    expect(deadlineFor(M2).payload_data).toEqual(deadlineFor(M1).payload_data);
  });
});

// ─── Copy assembly (AC4, AC5) ──────────────────────────────────────────────────────────────────────

describe('AC4/AC5 — the producer resolves every member-facing string INTO the payload', () => {
  it('cycle-open copy is Hindi-primary at send time and names the pool + the shielded family', () => {
    const alert = buildCycleOpenAlert({
      alertId: ALERT,
      pariwarId: PARIWAR,
      memberId: M1,
      poolId: POOL_A,
      identity: IDENTITY,
      timeCritical: false,
      locale: 'hi',
      now: NOW,
    });
    expect(() => Alert.parse(alert)).not.toThrow();
    const data = alert.payload_data as { title: string; body: string };
    expect(data.title).toContain('युधिष्ठिर'); // the curated pool name
    expect(data.body).toContain('रामेश्वर प्र'); // first name + last INITIAL only
    expect(data.body).toContain('₹ 1,100'); // Latin operational numerals (amendment-A2)
    // Devanagari digits are banned on operational surfaces (UX-DR73).
    expect(data.title + data.body).not.toMatch(/[०-९]/);
  });

  it('falls back to the LETTER CODE when the Pariwar opted out of curated names', () => {
    const alert = buildCycleOpenAlert({
      alertId: ALERT,
      pariwarId: PARIWAR,
      memberId: M1,
      poolId: POOL_A,
      identity: { ...IDENTITY, poolName: null },
      timeCritical: false,
      locale: 'hi',
      now: NOW,
    });
    expect((alert.payload_data as { title: string }).title).toContain('A');
  });

  it('a single-token family name yields no trailing initial (never "Rameshwar .")', () => {
    const alert = buildCycleOpenAlert({
      alertId: ALERT,
      pariwarId: PARIWAR,
      memberId: M1,
      poolId: POOL_A,
      identity: { ...IDENTITY, deceasedLastInitial: '' },
      timeCritical: false,
      locale: 'hi',
      now: NOW,
    });
    expect((alert.payload_data as { body: string }).body).toContain('रामेश्वर के');
  });

  it('each send day resolves its OWN subject + display, and the payload carries the machine instant', () => {
    const deadlineAt = new Date('2026-08-05T00:00:00.000Z');
    const subjects = new Set<string>();
    for (const day of [5, 10, 13, 14] as const) {
      const alert = buildDeadlineReminderAlert({
        alertId: ALERT,
        pariwarId: PARIWAR,
        memberId: M1,
        poolId: POOL_A,
        identity: IDENTITY,
        cycleDay: day,
        deadlineAt,
        timeCritical: false,
        locale: 'hi',
        now: NOW,
      });
      expect(() => Alert.parse(alert)).not.toThrow();
      const data = alert.payload_data as { subject: string; deadline_at: string; deadline_display: string };
      subjects.add(data.subject);
      // The renderers never format a date — `deadline_display` exists so the PRODUCER owns the wording.
      expect(data.deadline_at).toBe(deadlineAt.toISOString());
      expect(data.deadline_display).not.toBe(data.deadline_at);
      expect(data.deadline_display).toMatch(/05-08-2026/);
    }
    expect(subjects.size).toBe(4); // four sends, four messages (the epic's intent, preserved)
  });

  it('the day-13 reminder counts the REMAINING days, not the elapsed ones', () => {
    const alert = buildDeadlineReminderAlert({
      alertId: ALERT,
      pariwarId: PARIWAR,
      memberId: M1,
      poolId: POOL_A,
      identity: IDENTITY,
      cycleDay: 13,
      deadlineAt: new Date('2026-08-05T00:00:00.000Z'),
      timeCritical: false,
      locale: 'en',
      now: NOW,
    });
    expect((alert.payload_data as { subject: string }).subject).toContain('2 days remaining');
  });

  it('English parity resolves for every template (the i18n:check-parity contract, exercised)', () => {
    const alert = buildCycleOpenAlert({
      alertId: ALERT,
      pariwarId: PARIWAR,
      memberId: M1,
      poolId: POOL_A,
      identity: IDENTITY,
      timeCritical: false,
      locale: 'en',
      now: NOW,
    });
    expect((alert.payload_data as { title: string }).title).toContain('Your pool is open');
  });
});

describe('Story 9.10 AC2/AC4 — the pending-match retry copy is DISTINCT per tier, never a deadline nudge', () => {
  it('builds a `deadline_reminder`-category alert carrying `pool_id` for the deep link', () => {
    const alert = buildPendingMatchRetryAlert({
      alertId: ALERT,
      pariwarId: PARIWAR,
      memberId: M1,
      poolId: POOL_A,
      identity: IDENTITY,
      tier: 'soft',
      locale: 'hi',
      now: NOW,
    });
    expect(alert.alert_category).toBe('deadline_reminder');
    expect((alert.payload_data as { pool_id: string }).pool_id).toBe(POOL_A);
    expect(() => Alert.parse(alert)).not.toThrow();
  });

  it('the soft and escalated tiers resolve to DISTINCT subjects', () => {
    const soft = buildPendingMatchRetryAlert({
      alertId: ALERT, pariwarId: PARIWAR, memberId: M1, poolId: POOL_A, identity: IDENTITY,
      tier: 'soft', locale: 'hi', now: NOW,
    });
    const escalated = buildPendingMatchRetryAlert({
      alertId: ALERT, pariwarId: PARIWAR, memberId: M1, poolId: POOL_A, identity: IDENTITY,
      tier: 'escalated', locale: 'hi', now: NOW,
    });
    const softSubject = (soft.payload_data as { subject: string }).subject;
    const escalatedSubject = (escalated.payload_data as { subject: string }).subject;
    expect(softSubject).not.toBe(escalatedSubject);
  });

  it('never carries the day-N "please contribute" copy — this is a courtesy about a payment already made', () => {
    const alert = buildPendingMatchRetryAlert({
      alertId: ALERT, pariwarId: PARIWAR, memberId: M1, poolId: POOL_A, identity: IDENTITY,
      tier: 'escalated', locale: 'en', now: NOW,
    });
    const data = alert.payload_data as { subject: string; deadline_display: string };
    expect(`${data.subject} ${data.deadline_display}`).not.toMatch(/contribute before|please contribute/i);
  });

  it('deep-link resolution routes to the member\'s own contribution surface, not the day-N renewals fallback', () => {
    const alert = buildPendingMatchRetryAlert({
      alertId: ALERT, pariwarId: PARIWAR, memberId: M1, poolId: POOL_A, identity: IDENTITY,
      tier: 'soft', locale: 'hi', now: NOW,
    });
    expect(deepLinkTargetForAlert(alert)).toMatchObject({ resource: 'contributions', resourceId: POOL_A });
  });

  it('English parity resolves for both tiers', () => {
    const alert = buildPendingMatchRetryAlert({
      alertId: ALERT, pariwarId: PARIWAR, memberId: M1, poolId: POOL_A, identity: IDENTITY,
      tier: 'soft', locale: 'en', now: NOW,
    });
    expect((alert.payload_data as { subject: string }).subject.length).toBeGreaterThan(0);
  });
});

// ─── The enqueue seam shapes ───────────────────────────────────────────────────────────────────────

describe('the cycle-open parent enqueue is singleton-keyed on the alert', () => {
  it('collapses a duplicate enqueue for the same cycle', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    await enqueueContributionNotifyCycleOpen(
      { send },
      { pariwarId: PARIWAR, requestId: 'r', actorId: null, traceId: 't' },
      { alertId: ALERT, cycleId: CYCLE, timeCritical: true },
    );
    expect(send.mock.calls[0]![0]).toBe('contribution.notify.cycle_open');
    expect(send.mock.calls[0]![2]).toMatchObject({ singletonKey: ALERT });
  });
});
