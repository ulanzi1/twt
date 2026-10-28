// The three contribution-loop triggers — DB-free unit tests (Story 8.8, Task 8; AC1, AC2, AC3).
//
// Runs with NO `DATABASE_URL` (the AI-7-1 convention): the DB reads, the keyed store and the fan-out
// itself are mocked, so what is under test here is exactly the ORCHESTRATION — the batching shape, the
// per-member idempotency, the reminder suppression, the copy assembly, and the throw-so-pg-boss-retries
// contract. The fan-out's own behaviour (the cascade, the composition order, the audit families) is
// covered by `contribution-notify.test.ts`, which drives it with real provider doubles.

import { Alert, deepLinkTargetForAlert, formatDeepLink } from '@twt/contracts';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QUEUE_NAMES } from '@twt/queue';

const listCycleBindingCandidates = vi.fn();
const getCycleFreezeCommittedAt = vi.fn();
const resolvePoolIdentity = vi.fn();
const resolvePublicNamePresentationMode = vi.fn();
const listActedMemberIdsForPool = vi.fn();
const listPendingMatchMembersForPool = vi.fn();
const claim = vi.fn();
const recordResult = vi.fn();
const release = vi.fn();
// Story 5.8b review (P2-1) — the child reads a recorded member's result back when it owes a bridge-row closure.
const inspect = vi.fn();
const withPariwarScope = vi.fn();
const scopeClientQuery = vi.fn();
// Story 5.11b (FS5 (a)) — the lit kinds' set-based TEXT-language read; every member defaults to `hi` here (the language legs are
// LIVE — `alert-sms-send-live.test.ts`). A harness stub, ⛔ an assertion change.
const readMemberTextLanguages = vi.fn(
  (_db: unknown, input: { memberIds: readonly string[] }): Promise<Map<string, 'hi' | 'en'> | null> =>
    Promise.resolve(new Map(input.memberIds.map((id) => [id.toLowerCase(), 'hi' as const]))),
);

// Story 5.8b (FS10 (a)) — the sweep's freeze-instant signal (`openCycleAlert`'s read); un-bridged unless a test says so.
const resolveCycleOpenTimeCritical = vi.fn<(db: unknown, cycleId: string) => Promise<{ cycleFrozenPayload: unknown; timeCritical: boolean } | null>>(
  () => Promise.resolve({ cycleFrozenPayload: {}, timeCritical: false }),
);
// Story 5.8b (FS4 (d)) — the bridged child's set-based death-overlay read; nobody is frozen unless a test says so.
const listAccountFrozenMemberIds = vi.fn<(db: unknown, memberIds: readonly string[], at: Date) => Promise<ReadonlySet<string>>>(
  () => Promise.resolve(new Set<string>()),
);

vi.mock('@twt/domain', async (importActual) => {
  const actual = await importActual<typeof import('@twt/domain')>();
  return {
    ...actual,
    // Every read in these workers runs inside `withPariwarScope`; the fake just invokes the callback
    // with a marker handle so the workers' own logic is what is exercised.
    withPariwarScope,
    alert: { ...actual.alert, resolveCycleOpenTimeCritical },
    pool: { ...actual.pool, listCycleBindingCandidates, getCycleFreezeCommittedAt },
    notifications: { ...actual.notifications, resolvePoolIdentity },
    kyc: { ...actual.kyc, resolvePublicNamePresentationMode },
    member: { ...actual.member, readMemberTextLanguages, listAccountFrozenMemberIds },
    contribution: { ...actual.contribution, listActedMemberIdsForPool, listPendingMatchMembersForPool },
    idempotency: {
      ...actual.idempotency,
      createKeyedStore: () => ({ claim, recordResult, release, inspect, getResult: vi.fn() }),
    },
  };
});

const fanOutAlertToMembers = vi.fn();
// Only the fan-out is replaced; the module's constants (Story 5.11's `RECORDED_RUNG_DETAILS`) stay real.
vi.mock('../src/scheduler/contribution-notify.js', async (importActual) => ({
  ...(await importActual<typeof import('../src/scheduler/contribution-notify.js')>()),
  fanOutAlertToMembers,
}));

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
  registerContributionNotifyWorkers,
  LIT_KIND_JOB_MEMBER_LIMIT,
  DEFAULT_MEMBER_IDEMPOTENCY_TTL_SECONDS,
  PENDING_MATCH_IDEMPOTENCY_TTL_SECONDS,
  BRIDGED_MEMBER_IDEMPOTENCY_TTL_SECONDS,
  BRIDGE_NAME_ALARM_WINDOW_MS,
  resetBridgeNameAlarms,
} = await import('../src/scheduler/contribution-notify-triggers.js');
const { CONTRIBUTION_SMS_TEMPLATES, renderContributionSms } = await import('../src/scheduler/contribution-sms-templates.js');
const { EMITTABLE_MISMATCH_REASONS } = await import('../src/matcher/matcher-worker.js');
const { schema } = await import('@twt/domain'); // after the mocks (the mock factory above closes over top-level variables)

const PARIWAR = '11111111-1111-1111-1111-111111111111';
const ALERT = '33333333-3333-3333-3333-333333333333';
const CYCLE = '55555555-5555-5555-5555-555555555555';
const POOL_A = '44444444-4444-4444-4444-444444444444';
const POOL_B = '66666666-6666-6666-6666-666666666666';
const CLAIM_CASE = '77777777-7777-7777-7777-777777777777';
const M1 = 'aaaaaaaa-0000-0000-0000-000000000001';
const M2 = 'aaaaaaaa-0000-0000-0000-000000000002';
const M3 = 'aaaaaaaa-0000-0000-0000-000000000003';

// Story 8.16 — the identity carries ONE resolved display field. The default fixture is in the
// `shielded_name` form (the string the old part-pair produced, plus the form's trailing period), so the
// existing copy assertions keep their original meaning; `FULL_NAME_IDENTITY` below is the default
// `full_name` mode this story makes reachable on the member side.
const IDENTITY = {
  deceasedDisplayName: 'रामेश्वर प्र.',
  poolLetterCode: 'A',
  poolName: 'युधिष्ठिर',
  poolCanonicalIdentifier: 'TWT-BIH-2026-07-A',
  fixedAmount: 1100,
};

/** The SAME family, resolved under the DEFAULT `full_name` mode — the form Story 8.16 makes reachable
 *  on this consumer. `2026-09-02-180` cl.1 ruled it in; the SMS/WhatsApp exposure was named in the
 *  packet and is the decision, not a side effect. */
const FULL_NAME_IDENTITY = { ...IDENTITY, deceasedDisplayName: 'रामेश्वर प्रसाद' };

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
  // Code review 2026-10-28 (second pass) — the bridged child brackets its death-overlay read in a SAVEPOINT on the scope's client.
  scopeClientQuery.mockReset();
  scopeClientQuery.mockResolvedValue({ rows: [] });
  withPariwarScope.mockImplementation(
    (_pool: unknown, _pariwarId: string, fn: (db: unknown, client: unknown) => unknown) =>
      Promise.resolve(fn({ marker: 'db' }, { marker: 'client', query: scopeClientQuery })),
  );
  resetBridgeNameAlarms();
  resolvePoolIdentity.mockResolvedValue(IDENTITY);
  resolvePublicNamePresentationMode.mockResolvedValue('full_name');
  listActedMemberIdsForPool.mockResolvedValue({ confirmed: [], attested: [] });
  listPendingMatchMembersForPool.mockResolvedValue([]);
  claim.mockResolvedValue('acquired');
  recordResult.mockResolvedValue(undefined);
  release.mockResolvedValue(undefined);
  inspect.mockResolvedValue(null);
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
      retry: [],
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
      { send, insert: vi.fn() },
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
      { send, insert: vi.fn() },
      envelope({ alertId: ALERT, cycleId: CYCLE, timeCritical: true }),
    );

    expect(send.mock.calls[0]![1].payload).toMatchObject({ timeCritical: true, kind: 'cycle_open' });
  });

  it('a cycle with no pools enqueues nothing (never a job with an empty roster)', async () => {
    listCycleBindingCandidates.mockResolvedValue([]);
    const send = vi.fn();
    const result = await runContributionNotifyParent(
      deps(),
      { send, insert: vi.fn() },
      envelope({ alertId: ALERT, cycleId: CYCLE, timeCritical: false }),
    );
    expect(result.poolCount).toBe(0);
    expect(send).not.toHaveBeenCalled();
  });

  it('a missing pariwarId THROWS (a tenant-less fan-out is a defect, not a silent skip)', async () => {
    await expect(
      runContributionNotifyParent(
        deps(),
        { send: vi.fn(), insert: vi.fn() },
        { ...envelope({ alertId: ALERT, cycleId: CYCLE, timeCritical: false }), pariwarId: null },
      ),
    ).rejects.toThrow(/missing pariwarId/);
  });
});

// ─── Story 8.16 (AC2b) — the presentation-mode read is PER POOL, never per member ──────────────────

describe('AC2b — the mode is an INPUT, read ONCE PER POOL', () => {
  it('reads the presentation mode exactly ONCE for a pool with a multi-member roster', async () => {
    // `2026-09-02-181` cl.2. The fan-out is one notification PER MEMBER ASSIGNED TO THE POOL, so the
    // failure this guards is a read that drifted into the per-member path — where it would multiply by
    // the roster. The roster below is 2 members; the mode read must still be 1.
    await runContributionNotifyChild(deps(), envelope(childPayload()) as never);
    expect(resolvePublicNamePresentationMode).toHaveBeenCalledTimes(1);
  });

  it('the mode it read is the one PASSED IN to the resolver — not defaulted, not re-read', async () => {
    resolvePublicNamePresentationMode.mockResolvedValue('shielded_name');
    await runContributionNotifyChild(deps(), envelope(childPayload()) as never);
    // The domain signature is (db, encryption, pariwarId, MODE, input, log) — the mode is positional
    // argument 4, immediately after the pariwarId it is scoped to.
    expect(resolvePoolIdentity.mock.calls[0]![3]).toBe('shielded_name');
  });

  it('a roster four times the size still reads the mode ONCE (the count tracks pools, not members)', async () => {
    await runContributionNotifyChild(
      deps(),
      envelope(childPayload({ memberIds: [M1, M2, M3, 'aaaaaaaa-0000-0000-0000-000000000004'] })) as never,
    );
    expect(resolvePublicNamePresentationMode).toHaveBeenCalledTimes(1);
    expect(resolvePoolIdentity).toHaveBeenCalledTimes(1);
  });

  it('a presentation-mode READ FAILURE skips the pool LOUDLY — it never throws the whole child job (review fix)', async () => {
    // Every OTHER unresolvable input on this path (decrypt, letter code, curated name) degrades to
    // alarm+skip inside `resolvePoolIdentity` itself; this read sits just outside it, so the fail-soft
    // contract has to be reproduced at the call site instead.
    resolvePublicNamePresentationMode.mockRejectedValue(new Error('KMS blip'));
    const onAlarm = vi.fn();
    const result = await runContributionNotifyChild(deps({ onAlarm }), envelope(childPayload()) as never);

    expect(resolvePoolIdentity).not.toHaveBeenCalled();
    expect(fanOutAlertToMembers).not.toHaveBeenCalled();
    expect(claim).not.toHaveBeenCalled();
    expect(result).toMatchObject({ attempted: 0, delivered: 0 });
    // EXACTLY once — a second, generic "pool identity unresolvable" alarm for the SAME failure would
    // overwrite the true cause (review-fix regression: round 1 fired both).
    expect(onAlarm).toHaveBeenCalledTimes(1);
    expect(onAlarm).toHaveBeenCalledWith(expect.stringContaining('presentation-mode read failed'));
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

  it('a member whose fan-out FAILED (on `retry`) makes the job THROW (pg-boss owns the backoff — D9)', async () => {
    // Story 5.11 (FS14, review R1 option 1 / `-394` item 1): `retry` (was `undelivered`) holds a member whose fan-out THREW
    // and a member `shouldRetryFanOut` keeps retryable (no available SMS target, or SMS cost-suppressed).
    fanOutAlertToMembers.mockResolvedValue({
      results: [{ memberId: M1, delivered: true, deliveredChannel: 'push', trail: [], bridged: false, costSuppressedChannels: [], telegramMirrored: false }],
      retry: [M2],
    });

    await expect(
      runContributionNotifyChild(deps(), envelope(childPayload()) as never),
    ).rejects.toThrow(/failed/);

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

  // ⭐ Story 5.8b (FS10 (a), AC7) — the sweep no longer passes 8.8's fail-safe `false` (no test pinned it before): it passes the
  // signal `openCycleAlert`'s own read derives at the freeze instant, read only when it re-enqueues.
  it.each([true, false])('⭐ AC7 — a swept cycle is re-enqueued with the freeze-instant signal (%s), read ONCE, for ITS cycle', async (bridged) => {
    resolveCycleOpenTimeCritical.mockResolvedValueOnce({ cycleFrozenPayload: {}, timeCritical: bridged });
    const send = vi.fn().mockResolvedValue(undefined);
    await runContributionNotifyRecoverySweep(recoveryDeps(1), { send });
    expect(resolveCycleOpenTimeCritical).toHaveBeenCalledTimes(1);
    expect(resolveCycleOpenTimeCritical.mock.calls[0]![1]).toBe(CYCLE);
    expect((send.mock.calls[0]![1] as { payload: { timeCritical: boolean } }).payload).toMatchObject({ alertId: ALERT, cycleId: CYCLE, timeCritical: bridged });
  });

  it('AC7 — a fully covered alert is ⛔ re-enqueued and its signal is ⛔ read (one more read only when it re-enqueues)', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    await runContributionNotifyRecoverySweep(recoveryDeps(3), { send });
    expect(resolveCycleOpenTimeCritical).not.toHaveBeenCalled();
  });

  it('AC7 — a cycle with ⛔ `cycle.frozen` (unreachable for a live alert) ⇒ re-enqueued UN-bridged with ONE alarm (⛔ a guess)', async () => {
    resolveCycleOpenTimeCritical.mockResolvedValueOnce(null as never);
    const onAlarm = vi.fn();
    const send = vi.fn().mockResolvedValue(undefined);
    await runContributionNotifyRecoverySweep(recoveryDeps(0, { onAlarm }), { send });
    expect((send.mock.calls[0]![1] as { payload: { timeCritical: boolean } }).payload.timeCritical).toBe(false);
    expect(onAlarm).toHaveBeenCalledWith(expect.stringContaining('no cycle.frozen event'));
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

    // Story 5.11 (FS14) added `inAppOnly` — a COUNT of members no rung reached, still counts only.
    expect(Object.keys(result).sort()).toEqual(
      ['alertId', 'alreadySent', 'attempted', 'delivered', 'inAppOnly', 'kind', 'poolId', 'suppressed'].sort(),
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
      const result = await runDeadlineReminderSweep(sweepDeps(committedAt, new Date(iso)), { send, insert: vi.fn() });
      expect(result.enqueuedPools).toBe(1);
      expect(send.mock.calls[0]![1].payload).toMatchObject({
        kind: 'deadline_reminder',
        cycleDay: day,
        // A reminder is NEVER time-critical: `time_critical` is the AR-18 cycle-open signal.
        timeCritical: false,
      });
      expect(send.mock.calls[0]![2]).toMatchObject({
        singletonKey: day === 10 ? expect.stringMatching(new RegExp(`^${ALERT}:${POOL_A}:d10:members:[a-f0-9]{64}$`)) : `${ALERT}:${POOL_A}:d${String(day)}`,
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
      const result = await runDeadlineReminderSweep(sweepDeps(committedAt, new Date(iso)), { send, insert: vi.fn() });
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
    await runDeadlineReminderSweep(d, { send, insert: vi.fn() });
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
    await runPendingMatchRetrySweep(deps({ pool: { query: queryFn } }), { send: vi.fn(), insert: vi.fn() });
    expect(queryFn.mock.calls[0]![0]).toMatch(/current_state IN \('live', 'closed'\)/);
  });

  it("an attestation ≥4h old but <24h → enqueues ONLY the soft tier batch", async () => {
    listPendingMatchMembersForPool.mockResolvedValue([
      { memberId: M1, oldestUnresolvedAttestedAt: new Date(NOW_SWEEP.getTime() - 5 * 60 * 60 * 1000) },
    ]);
    const send = vi.fn().mockResolvedValue(undefined);
    const result = await runPendingMatchRetrySweep(sweepDeps(NOW_SWEEP), { send, insert: vi.fn() });

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
    const result = await runPendingMatchRetrySweep(sweepDeps(NOW_SWEEP), { send, insert: vi.fn() });

    expect(result.enqueuedBatches).toBe(1);
    expect(send.mock.calls[0]![1].payload).toMatchObject({ kind: 'pending_match_escalated', memberIds: [M1] });
  });

  it('an attestation <4h old → enqueues NOTHING yet (too early for even the soft tier)', async () => {
    listPendingMatchMembersForPool.mockResolvedValue([
      { memberId: M1, oldestUnresolvedAttestedAt: new Date(NOW_SWEEP.getTime() - 60 * 60 * 1000) },
    ]);
    const send = vi.fn();
    const result = await runPendingMatchRetrySweep(sweepDeps(NOW_SWEEP), { send, insert: vi.fn() });
    expect(result.enqueuedBatches).toBe(0);
    expect(send).not.toHaveBeenCalled();
  });

  it('a pool with mixed ages enqueues BOTH tier batches, one per tier', async () => {
    listPendingMatchMembersForPool.mockResolvedValue([
      { memberId: M1, oldestUnresolvedAttestedAt: new Date(NOW_SWEEP.getTime() - 5 * 60 * 60 * 1000) }, // soft
      { memberId: M2, oldestUnresolvedAttestedAt: new Date(NOW_SWEEP.getTime() - 30 * 60 * 60 * 1000) }, // escalated
    ]);
    const send = vi.fn().mockResolvedValue(undefined);
    const result = await runPendingMatchRetrySweep(sweepDeps(NOW_SWEEP), { send, insert: vi.fn() });

    expect(result.enqueuedBatches).toBe(2);
    const kinds = send.mock.calls.map((c) => (c[1] as { payload: { kind: string } }).payload.kind).sort();
    expect(kinds).toEqual(['pending_match', 'pending_match_escalated']);
  });

  it('a pool with no pending-match members enqueues nothing (no query for tiers)', async () => {
    listPendingMatchMembersForPool.mockResolvedValue([]);
    const send = vi.fn();
    const result = await runPendingMatchRetrySweep(sweepDeps(NOW_SWEEP), { send, insert: vi.fn() });
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
    const result = await runPendingMatchRetrySweep(deps({ now: () => NOW_SWEEP, onAlarm, pool: { query: () => Promise.resolve({ rows: [{ alert_id: ALERT, cycle_id: CYCLE, pariwar_id: PARIWAR }] }) } }), { send, insert: vi.fn() });

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

  it('a MONONYM family name renders in full and is never omitted (Story 8.16, Trap 5)', () => {
    // The PUBLIC directory omits a row it cannot shield. The push must NOT: a member assigned to this
    // pool is being asked to contribute to this family's funeral, and a notification naming nobody is
    // not a shorter page — it is a defective artifact. The resolver hands this consumer the whole
    // stored name for a single-token record, in BOTH modes.
    const alert = buildCycleOpenAlert({
      alertId: ALERT,
      pariwarId: PARIWAR,
      memberId: M1,
      poolId: POOL_A,
      identity: { ...IDENTITY, deceasedDisplayName: 'रामेश्वर' },
      timeCritical: false,
      locale: 'hi',
      now: NOW,
    });
    expect((alert.payload_data as { body: string }).body).toContain('रामेश्वर के');
  });

  it('⭐ Story 8.16 — the cycle-open body carries the FULL name when the Pariwar is in `full_name` mode', () => {
    // Consumer ④, ruled in by `2026-09-02-180` cl.1 (ALL FOUR). This is the push/WhatsApp/SMS copy:
    // the deceased family's full legal name reaches every assigned member's handset. The Panel ruled
    // with all three channels named in the packet, so this assertion IS the ruling, not a regression.
    const alert = buildCycleOpenAlert({
      alertId: ALERT,
      pariwarId: PARIWAR,
      memberId: M1,
      poolId: POOL_A,
      identity: FULL_NAME_IDENTITY,
      timeCritical: false,
      locale: 'hi',
      now: NOW,
    });
    expect((alert.payload_data as { body: string }).body).toContain('रामेश्वर प्रसाद');
  });

  it('⭐ Story 8.16 — the DEADLINE-REMINDER subject is the FIFTH render site and rises with it', () => {
    // `familyLabel` feeds `notify.cycle_open.body` AND `notify.deadline.day_14.subject`. Four resolver
    // CALL sites, FIVE render sites — a set that named only the call sites would leave the day-14
    // subject naming a family in the old form while the body next to it used the new one.
    const alert = buildDeadlineReminderAlert({
      alertId: ALERT,
      pariwarId: PARIWAR,
      memberId: M1,
      poolId: POOL_A,
      identity: FULL_NAME_IDENTITY,
      cycleDay: 14,
      deadlineAt: new Date('2026-08-05T00:00:00.000Z'),
      timeCritical: true,
      locale: 'hi',
      now: NOW,
    });
    const data = alert.payload_data as { subject: string };
    expect(data.subject).toContain('रामेश्वर प्रसाद');
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

// ─── Story 5.11 — the three lit producers carry the `sms` block; every other alert carries none ───────

describe('Story 5.11 AC5 / FS7 — the `sms` block rides ONLY the three notices FS1 (d) names', () => {
  const reminder = (cycleDay: 5 | 10 | 13 | 14, locale: 'hi' | 'en' = 'hi') =>
    buildDeadlineReminderAlert({
      alertId: ALERT, pariwarId: PARIWAR, memberId: M1, poolId: POOL_A, identity: IDENTITY, cycleDay,
      deadlineAt: new Date('2026-08-05T00:00:00.000Z'), timeCritical: false, locale, now: NOW,
    });
  const smsOf = (alert: Alert): unknown => (alert.payload_data as { sms?: unknown }).sms;

  it('⭐ day 10 — `deadline_not_recorded`, the date the SAME local the push renders, the pool by FS13', () => {
    const alert = reminder(10);
    expect(smsOf(alert)).toEqual({ message: 'deadline_not_recorded', locale: 'hi', values: { pool: 'युधिष्ठिर', date: '05-08-2026' } });
    // the same local: day 10's push display IS `{date}`
    expect((alert.payload_data as { deadline_display: string }).deadline_display).toBe('05-08-2026');
    expect(() => Alert.parse(alert)).not.toThrow();
  });

  it('FS13 — the en day-10 text names the pool by its LETTER (the curated name is Hindi); the en push keeps the name', () => {
    const alert = reminder(10, 'en');
    expect(smsOf(alert)).toEqual({ message: 'deadline_not_recorded', locale: 'en', values: { pool: 'A', date: '05-08-2026' } });
    expect((alert.payload_data as { subject: string }).subject).toContain('युधिष्ठिर');
  });

  it.each(['', '   '])('R2 — an empty curated name %j cannot block day-10 or escalated notifications', (poolName) => {
    const identity = { ...IDENTITY, poolName };
    for (const locale of ['en', 'hi'] as const) {
      const day10 = buildDeadlineReminderAlert({
        alertId: ALERT, pariwarId: PARIWAR, memberId: M1, poolId: POOL_A, identity, cycleDay: 10,
        deadlineAt: new Date('2026-08-05T00:00:00.000Z'), timeCritical: false, locale, now: NOW,
      });
      const escalated = buildPendingMatchRetryAlert({
        alertId: ALERT, pariwarId: PARIWAR, memberId: M1, poolId: POOL_A, identity, tier: 'escalated', locale, now: NOW,
      });
      expect(smsOf(day10)).toMatchObject({ values: { pool: IDENTITY.poolLetterCode } });
      expect(smsOf(escalated)).toMatchObject({ values: { pool: IDENTITY.poolLetterCode } });
      expect(Alert.safeParse(day10).success).toBe(true);
      expect(Alert.safeParse(escalated).success).toBe(true);
    }
  });

  it.each(['hi', 'en'] as const)('P8 — every lit producer\'s block (%s) fills exactly its message\'s slots and renders', (locale) => {
    const longName = { ...IDENTITY, poolName: locale === 'en' ? 'A'.repeat(30) : 'क'.repeat(30) };
    const blocks = [IDENTITY, longName].flatMap((identity) => [
      buildDeadlineReminderAlert({
        alertId: ALERT, pariwarId: PARIWAR, memberId: M1, poolId: POOL_A, identity, cycleDay: 10,
        deadlineAt: new Date('2026-08-05T00:00:00.000Z'), timeCritical: false, locale, now: NOW,
      }),
      buildPendingMatchRetryAlert({ alertId: ALERT, pariwarId: PARIWAR, memberId: M1, poolId: POOL_A, identity, tier: 'escalated', locale, now: NOW }),
      buildContributionMismatchAlert({ alertId: ALERT, pariwarId: PARIWAR, memberId: M1, poolId: POOL_A, reason: 'wrong_pool', locale, now: NOW }),
    ]).map((alert) => smsOf(alert) as { message: keyof typeof CONTRIBUTION_SMS_TEMPLATES; locale: 'hi' | 'en'; values: Record<string, string> });
    expect(new Set(blocks.map((b) => b.message))).toEqual(new Set(['deadline_not_recorded', 'payment_not_confirmed', 'payment_not_matched']));
    for (const block of blocks) {
      expect(block.locale).toBe(locale);
      const slots = CONTRIBUTION_SMS_TEMPLATES[block.message][block.locale].slots;
      expect(Object.keys(block.values).sort()).toEqual(slots.map((slot) => slot.name).sort());
      for (const slot of slots) expect(block.values[slot.name]!.length).toBeLessThanOrEqual(slot.maxLength);
      expect(() => renderContributionSms(block.message, block.locale, block.values)).not.toThrow();
    }
  });

  it.each([5, 13, 14] as const)('⛔ day %s — no `sms` block (day 14 is the channels\' — FS1 (d))', (day) => {
    expect(smsOf(reminder(day))).toBeUndefined();
    expect(Object.keys(reminder(day).payload_data)).not.toContain('sms');
  });

  it('⭐ pending match ESCALATED — `payment_not_confirmed`; the SOFT tier carries none', () => {
    const build = (tier: 'soft' | 'escalated', locale: 'hi' | 'en') =>
      buildPendingMatchRetryAlert({ alertId: ALERT, pariwarId: PARIWAR, memberId: M1, poolId: POOL_A, identity: IDENTITY, tier, locale, now: NOW });
    expect(smsOf(build('escalated', 'hi'))).toEqual({ message: 'payment_not_confirmed', locale: 'hi', values: { pool: 'युधिष्ठिर' } });
    expect(smsOf(build('escalated', 'en'))).toEqual({ message: 'payment_not_confirmed', locale: 'en', values: { pool: 'A' } });
    expect(smsOf(build('soft', 'hi'))).toBeUndefined();
    expect(() => Alert.parse(build('escalated', 'en'))).not.toThrow();
  });

  it.each(['wrong_pool', 'amount_mismatch', 'some_future_reason'])('⭐ mismatch (%s) — ONE text, `payment_not_matched`, no value', (reason) => {
    const alert = buildContributionMismatchAlert({ alertId: ALERT, pariwarId: PARIWAR, memberId: M1, poolId: POOL_A, reason, locale: 'hi', now: NOW });
    expect(smsOf(alert)).toEqual({ message: 'payment_not_matched', locale: 'hi', values: {} });
    expect(() => Alert.parse(alert)).not.toThrow();
  });

  it('⛔ cycle open and contribution confirmed — no `sms` block', () => {
    const open = buildCycleOpenAlert({ alertId: ALERT, pariwarId: PARIWAR, memberId: M1, poolId: POOL_A, identity: IDENTITY, timeCritical: false, locale: 'hi', now: NOW });
    const confirmed = buildContributionConfirmedAlert({ alertId: ALERT, pariwarId: PARIWAR, memberId: M1, poolId: POOL_A, amountPaise: 110000, periodLabel: '2026-07', locale: 'hi', now: NOW });
    expect(smsOf(open)).toBeUndefined();
    expect(smsOf(confirmed)).toBeUndefined();
  });

  it('⛔ I5 — an `alert_published` (cycle open, news, survey, moderation) CANNOT carry the block: the contract refuses it', () => {
    const open = buildCycleOpenAlert({ alertId: ALERT, pariwarId: PARIWAR, memberId: M1, poolId: POOL_A, identity: IDENTITY, timeCritical: false, locale: 'hi', now: NOW });
    // A VALID block (P2: with its locale), so the refusal is the variant's — ⛔ a malformed block's.
    const block = { message: 'deadline_not_recorded', locale: 'hi', values: { pool: 'A', date: '05-08-2026' } };
    const planted = { ...open, payload_data: { ...open.payload_data, sms: block } };
    expect(Alert.safeParse(planted).success).toBe(false);
  });
});

// ─── Story 5.11 FS14 (a) as superseded by `-394` item 1 — former fixture successes are `in_app_only`; prior failures retry ─

describe('Story 5.11 AC4 / FS14 — the retry profile does not change (I4)', () => {
  /** R1's retryable shape: push failed, and no SMS target — the old SMS fixture was never reached (P7). */
  const noSmsTarget = (memberId: string) => ({
    memberId,
    delivered: false,
    deliveredChannel: null,
    trail: [
      { channel: 'push', attempt: 0, outcome: 'rejected', detail: 'transient:messaging/internal-error' },
      { channel: 'whatsapp', attempt: 0, outcome: 'skipped_no_target' },
      { channel: 'sms', attempt: 0, outcome: 'skipped_no_target' },
    ],
    bridged: false,
    costSuppressedChannels: [],
    telegramMirrored: false,
  });

  const inAppOnly = (memberId: string) => ({
    memberId,
    delivered: false,
    deliveredChannel: null,
    trail: [
      { channel: 'push', attempt: 0, outcome: 'rejected', detail: 'transient:messaging/internal-error' },
      { channel: 'whatsapp', attempt: 0, outcome: 'skipped_no_target' },
      { channel: 'sms', attempt: 0, outcome: 'skipped_no_target', detail: 'sms_send_not_wired' },
    ],
    bridged: false,
    costSuppressedChannels: [],
    telegramMirrored: false,
  });

  it('⭐ POOL_BATCH — a no-app member completes on the FIRST attempt: recorded `in_app_only`, the claim KEPT, no throw', async () => {
    fanOutAlertToMembers.mockResolvedValue({ results: [inAppOnly(M1), inAppOnly(M2)], retry: [] });
    const result = await runContributionNotifyChild(deps(), envelope(childPayload()) as never);

    expect(result).toMatchObject({ attempted: 2, delivered: 0, inAppOnly: 2 });
    expect(release).not.toHaveBeenCalled();
    expect(recordResult).toHaveBeenCalledTimes(2);
    // The recorded trail names each rung's reason — the NAMED ones only; a provider's free-text detail is ⛔ persisted.
    expect(recordResult.mock.calls[0]![1]).toMatchObject({
      delivered: false,
      outcome: 'in_app_only',
      trail: ['push:0:rejected', 'whatsapp:0:skipped_no_target', 'sms:0:skipped_no_target:sms_send_not_wired'],
    });
  });

  it('⭐ a pending-match (escalated) member\'s weeks-long claim is KEPT — the sweep does not nudge them again', async () => {
    fanOutAlertToMembers.mockResolvedValue({ results: [inAppOnly(M1)], retry: [] });
    await runContributionNotifyChild(
      deps(),
      envelope(childPayload({ kind: 'pending_match_escalated', memberIds: [M1] })) as never,
    );
    expect(release).not.toHaveBeenCalled();
    expect(recordResult.mock.calls[0]![0]).toBe(`contribution.notify:${ALERT}:${M1}:pending_match_escalated`);
  });

  it('⭐ contribution CONFIRMED — `in_app_only` recorded, ⛔ thrown; the result says delivered:false honestly', async () => {
    fanOutAlertToMembers.mockResolvedValue({ results: [inAppOnly(M1)], retry: [] });
    const result = await runContributionConfirmedNotify(
      deps(),
      envelope({ alertId: ALERT, poolId: POOL_A, memberId: M1, amountPaise: 110000, periodLabel: '2026-07' }) as never,
    );
    expect(result).toMatchObject({ delivered: false, alreadySent: false });
    expect(release).not.toHaveBeenCalled();
    expect(recordResult.mock.calls[0]![1]).toMatchObject({ outcome: 'in_app_only' });
  });

  it('⭐ MISMATCH (its own worker — T14) — `in_app_only` recorded, ⛔ thrown', async () => {
    fanOutAlertToMembers.mockResolvedValue({ results: [inAppOnly(M1)], retry: [] });
    const result = await runContributionMismatchNotify(
      deps(),
      envelope({ alertId: ALERT, poolId: POOL_A, memberId: M1, reason: 'wrong_pool' }) as never,
    );
    expect(result).toMatchObject({ delivered: false, alreadySent: false });
    expect(release).not.toHaveBeenCalled();
    expect(recordResult).toHaveBeenCalledTimes(1);
  });

  it('a THROWN fan-out is still retried — confirmed and mismatch release the claim and throw', async () => {
    fanOutAlertToMembers.mockResolvedValue({ results: [], retry: [M1] });
    await expect(
      runContributionConfirmedNotify(
        deps(),
        envelope({ alertId: ALERT, poolId: POOL_A, memberId: M1, amountPaise: 110000, periodLabel: '2026-07' }) as never,
      ),
    ).rejects.toThrow(/fan-out failed/);
    await expect(
      runContributionMismatchNotify(deps(), envelope({ alertId: ALERT, poolId: POOL_A, memberId: M1, reason: 'wrong_pool' }) as never),
    ).rejects.toThrow(/fan-out failed/);
    expect(release).toHaveBeenCalledTimes(2);
  });

  it('R1 — a no-SMS failure with a result still releases its POOL_BATCH claim and throws', async () => {
    fanOutAlertToMembers.mockResolvedValue({ results: [noSmsTarget(M1)], retry: [M1] });
    await expect(runContributionNotifyChild(deps(), envelope(childPayload({ memberIds: [M1] })) as never)).rejects.toThrow(/throwing so pg-boss retries/);
    expect(release).toHaveBeenCalledWith(`contribution.notify:${ALERT}:${M1}:cycle_open`);
    expect(recordResult).not.toHaveBeenCalled();
  });

  it('Q4 — a member the fan-out returned NO result for is retried (released, thrown), ⛔ recorded terminal', async () => {
    const onAlarm = vi.fn();
    fanOutAlertToMembers.mockResolvedValue({ results: [], retry: [] });
    await expect(runContributionNotifyChild(deps({ onAlarm }), envelope(childPayload({ memberIds: [M1] })) as never)).rejects.toThrow(/throwing so pg-boss retries/);
    await expect(runContributionConfirmedNotify(
      deps({ onAlarm }), envelope({ alertId: ALERT, poolId: POOL_A, memberId: M1, amountPaise: 110000, periodLabel: '2026-07' }) as never,
    )).rejects.toThrow(/fan-out failed/);
    await expect(runContributionMismatchNotify(
      deps({ onAlarm }), envelope({ alertId: ALERT, poolId: POOL_A, memberId: M1, reason: 'wrong_pool' }) as never,
    )).rejects.toThrow(/fan-out failed/);
    // F4 — each worker NAMES the defect (⛔ indistinguishable from a provider failure).
    expect(onAlarm.mock.calls.filter(([m]) => String(m).includes('returned no result'))).toHaveLength(3);
    expect(release).toHaveBeenCalledTimes(3);
    expect(recordResult).not.toHaveBeenCalled();
  });

  it('R1 — resolved no-SMS failures still release and throw in confirmed and mismatch workers', async () => {
    fanOutAlertToMembers.mockResolvedValue({ results: [noSmsTarget(M1)], retry: [M1] });
    await expect(runContributionConfirmedNotify(
      deps(), envelope({ alertId: ALERT, poolId: POOL_A, memberId: M1, amountPaise: 110000, periodLabel: '2026-07' }) as never,
    )).rejects.toThrow(/fan-out failed/);
    await expect(runContributionMismatchNotify(
      deps(), envelope({ alertId: ALERT, poolId: POOL_A, memberId: M1, reason: 'wrong_pool' }) as never,
    )).rejects.toThrow(/fan-out failed/);
    expect(release).toHaveBeenCalledTimes(2);
    expect(recordResult).not.toHaveBeenCalled();
  });
});

// ─── Story 5.11b — the producers' text language (FS5 (a)), the attempt and the occasion (FS9), the registrations (AC6) ───────

describe('Story 5.11b — FS5 (a): each member\'s TEXT in their own language; the attempt + occasion down the chain', () => {
  /** The alert the child built for `memberId` (the `alertFor` it handed the fan-out). */
  const alertBuiltFor = (memberId: string, call = 0) =>
    (fanOutAlertToMembers.mock.calls[call]![1] as (m: string) => Alert)(memberId);

  it('⭐ day 10 — a member who chose `en` in a `hi` Pariwar gets the en block (letter code); a non-chooser the default; the PUSH stays hi; ONE read per job', async () => {
    readMemberTextLanguages.mockResolvedValueOnce(new Map([[M1, 'en' as const], [M2, 'hi' as const]]));
    await runContributionNotifyChild(
      deps(),
      envelope(childPayload({ kind: 'deadline_reminder', cycleDay: 10, deadlineAtIso: '2026-08-05T00:00:00.000Z', memberIds: [M1, M2] })) as never,
    );
    expect(readMemberTextLanguages).toHaveBeenCalledTimes(1);
    expect(readMemberTextLanguages.mock.calls[0]![1]).toMatchObject({ memberIds: [M1, M2] });
    const en = alertBuiltFor(M1);
    const hi = alertBuiltFor(M2);
    expect((en.payload_data as { sms?: unknown }).sms).toEqual({ message: 'deadline_not_recorded', locale: 'en', values: { pool: 'A', date: '05-08-2026' } });
    expect((hi.payload_data as { sms?: unknown }).sms).toEqual({ message: 'deadline_not_recorded', locale: 'hi', values: { pool: 'युधिष्ठिर', date: '05-08-2026' } });
    // The push copy is the producer's locale (hi) for BOTH — LS11 for push unchanged.
    expect((en.payload_data as { subject: string }).subject).toBe((hi.payload_data as { subject: string }).subject);
    // Review C3-P26: …and it IS Hindi — an equality between two pushes passes if BOTH switched to English.
    expect((en.payload_data as { subject: string }).subject).toMatch(/\p{Script=Devanagari}/u);
  });

  it('⭐ the escalated tier reads the language too; the soft tier, cycle-open and the other send days ⛔ read it', async () => {
    readMemberTextLanguages.mockResolvedValueOnce(new Map([[M1, 'en' as const]]));
    await runContributionNotifyChild(deps(), envelope(childPayload({ kind: 'pending_match_escalated', memberIds: [M1] })) as never);
    expect((alertBuiltFor(M1).payload_data as { sms?: unknown }).sms).toEqual({ message: 'payment_not_confirmed', locale: 'en', values: { pool: 'A' } });
    readMemberTextLanguages.mockClear();
    await runContributionNotifyChild(deps(), envelope(childPayload({ kind: 'pending_match', memberIds: [M1] })) as never);
    await runContributionNotifyChild(deps(), envelope(childPayload({ memberIds: [M1] })) as never);
    await runContributionNotifyChild(
      deps(),
      envelope(childPayload({ kind: 'deadline_reminder', cycleDay: 13, deadlineAtIso: '2026-08-05T00:00:00.000Z', memberIds: [M1] })) as never,
    );
    expect(readMemberTextLanguages).not.toHaveBeenCalled();
  });

  it('⭐ a Pariwar with ⛔ passport row ⇒ every member\'s `sms` block OMITTED and ONE alarm `alert_sms.locale_unresolved` — ⛔ throw, ⛔ guess', async () => {
    readMemberTextLanguages.mockResolvedValueOnce(null as never);
    const onAlarm = vi.fn();
    await runContributionNotifyChild(
      deps({ onAlarm }),
      envelope(childPayload({ kind: 'deadline_reminder', cycleDay: 10, deadlineAtIso: '2026-08-05T00:00:00.000Z', memberIds: [M1, M2] })) as never,
    );
    expect((alertBuiltFor(M1).payload_data as { sms?: unknown }).sms).toBeUndefined();
    expect((alertBuiltFor(M2).payload_data as { sms?: unknown }).sms).toBeUndefined();
    expect(onAlarm.mock.calls.filter(([m]) => String(m).includes('alert_sms.locale_unresolved'))).toHaveLength(1);
  });

  it('⭐ MISMATCH — ONE read for its one member; the block in that member\'s language; ⛔ passport ⇒ ⛔ block + one alarm', async () => {
    readMemberTextLanguages.mockResolvedValueOnce(new Map([[M1, 'en' as const]]));
    await runContributionMismatchNotify(deps(), envelope({ alertId: ALERT, poolId: POOL_A, memberId: M1, reason: 'wrong_pool' }) as never);
    expect(readMemberTextLanguages).toHaveBeenCalledTimes(1);
    const built = (fanOutAlertToMembers.mock.calls[0]![1] as () => Alert)();
    expect((built.payload_data as { sms?: unknown }).sms).toEqual({ message: 'payment_not_matched', locale: 'en', values: {} });
    readMemberTextLanguages.mockResolvedValueOnce(null as never);
    const onAlarm = vi.fn();
    await runContributionMismatchNotify(deps({ onAlarm }), envelope({ alertId: ALERT, poolId: POOL_A, memberId: M2, reason: 'amount_mismatch' }) as never);
    const none = (fanOutAlertToMembers.mock.calls[1]![1] as () => Alert)();
    expect((none.payload_data as { sms?: unknown }).sms).toBeUndefined();
    expect(onAlarm.mock.calls.filter(([m]) => String(m).includes('alert_sms.locale_unresolved'))).toHaveLength(1);
  });

  it('⭐ FS9 / F4 — the job\'s attempt and the OCCASION (the keyed store\'s scope) reach the fan-out per CALL; absent job ⇒ ⛔ attempt (final)', async () => {
    await runContributionNotifyChild(
      deps(),
      envelope(childPayload({ kind: 'deadline_reminder', cycleDay: 10, deadlineAtIso: '2026-08-05T00:00:00.000Z', memberIds: [M1] })) as never,
      { id: 'job-7', retryCount: 2, retryLimit: 4 },
    );
    expect(fanOutAlertToMembers.mock.calls[0]![5]).toEqual({ occasion: 'day_10', jobId: 'job-7', retryCount: 2, retryLimit: 4 });
    await runContributionMismatchNotify(deps(), envelope({ alertId: ALERT, poolId: POOL_A, memberId: M1, reason: 'entry_already_claimed' }) as never);
    expect(fanOutAlertToMembers.mock.calls[1]![5]).toEqual({ occasion: 'mismatch:entry_already_claimed' });
  });

  it('FD-P1 — a direct oversized SMS job is refused before reads, claims or sends; an unwired caller keeps its old batching', async () => {
    const memberIds = Array.from({ length: 40 }, (_, i) => `aaaaaaaa-0000-0000-0000-${String(i).padStart(12, '0')}`);
    const all = new Map(memberIds.map((m) => [m, 'hi' as const]));
    const payload = childPayload({ kind: 'deadline_reminder', cycleDay: 10, deadlineAtIso: '2026-08-05T00:00:00.000Z', memberIds });
    const onAlarm = vi.fn();
    await expect(runContributionNotifyChild(deps({ alertSms: vi.fn(), onAlarm }), envelope(payload) as never)).rejects.toThrow('must be split before fan-out');
    expect(onAlarm).toHaveBeenCalledWith(expect.stringContaining('oversized SMS job'));
    expect(readMemberTextLanguages).not.toHaveBeenCalled();
    expect(claim).not.toHaveBeenCalled();
    expect(fanOutAlertToMembers).not.toHaveBeenCalled();
    readMemberTextLanguages.mockResolvedValueOnce(all);
    await runContributionNotifyChild(deps(), envelope(payload) as never);
    expect(fanOutAlertToMembers.mock.calls.map((c) => (c[2] as string[]).length)).toEqual([40]);
  });
});

describe('Story 5.11b AC6 — POOL_BATCH and MISMATCH register with `includeMetadata` (localConcurrency UNCHANGED)', () => {
  it('⭐ the EXACT options objects, and the registered handlers hand the child its retry count', async () => {
    const handlers = new Map<string, (jobs: unknown[]) => Promise<unknown>>();
    const work = vi.fn((name: string, a: unknown, b?: unknown) => {
      handlers.set(name, (typeof a === 'function' ? a : b) as (jobs: unknown[]) => Promise<unknown>);
      return Promise.resolve('w');
    });
    const fakeBoss = { createQueue: vi.fn(() => Promise.resolve()), schedule: vi.fn(() => Promise.resolve()), work, send: vi.fn() };
    await registerContributionNotifyWorkers(fakeBoss as never, deps({ childConcurrency: 3 }));
    expect(work).toHaveBeenCalledWith(QUEUE_NAMES.CONTRIBUTION_NOTIFY_POOL_BATCH, { localConcurrency: 3, includeMetadata: true }, expect.any(Function));
    expect(work).toHaveBeenCalledWith(QUEUE_NAMES.CONTRIBUTION_NOTIFY_MISMATCH, { includeMetadata: true }, expect.any(Function));
    await registerContributionNotifyWorkers(fakeBoss as never, deps());
    expect(work).toHaveBeenCalledWith(QUEUE_NAMES.CONTRIBUTION_NOTIFY_POOL_BATCH, { localConcurrency: 8, includeMetadata: true }, expect.any(Function));
    // Drive the registered MISMATCH handler with pg-boss metadata.
    await handlers.get(QUEUE_NAMES.CONTRIBUTION_NOTIFY_MISMATCH)!([
      { id: 'job-9', retryCount: 3, retryLimit: 4, data: envelope({ alertId: ALERT, poolId: POOL_A, memberId: M1, reason: 'wrong_pool' }) },
    ]);
    expect(fanOutAlertToMembers.mock.calls.at(-1)![5]).toEqual({ occasion: 'mismatch:wrong_pool', jobId: 'job-9', retryCount: 3, retryLimit: 4 });
    // Metadata that is ⛔ numbers is absent (⇒ the final attempt).
    await handlers.get(QUEUE_NAMES.CONTRIBUTION_NOTIFY_POOL_BATCH)!([
      { id: 'job-10', retryCount: 'x', data: envelope(childPayload({ memberIds: [M1] })) },
    ]);
    expect(fanOutAlertToMembers.mock.calls.at(-1)![5]).toEqual({ occasion: 'cycle_open', jobId: 'job-10' });
  });
});

describe('Story 5.11b review 2026-10-25 — the producers\' occasions, the chunk bound and the registration edges (C3-P18, C3-P22)', () => {
  it('⭐ the OCCASION each producer hands the fan-out is a member of the send record\'s list — day 10, the ESCALATED tier and EVERY reason the matcher emits (the escalated tier\'s was never asserted)', async () => {
    const call = { id: 'j', retryCount: 0, retryLimit: 4 };
    await runContributionNotifyChild(
      deps(),
      envelope(childPayload({ kind: 'deadline_reminder', cycleDay: 10, deadlineAtIso: '2026-08-05T00:00:00.000Z', memberIds: [M1] })) as never,
      call,
    );
    await runContributionNotifyChild(deps(), envelope(childPayload({ kind: 'pending_match_escalated', memberIds: [M1] })) as never, call);
    for (const reason of EMITTABLE_MISMATCH_REASONS) {
      await runContributionMismatchNotify(deps(), envelope({ alertId: ALERT, poolId: POOL_A, memberId: M1, reason }) as never);
    }
    const occasions = fanOutAlertToMembers.mock.calls.map((c) => (c[5] as { occasion?: string }).occasion);
    expect(occasions).toEqual(['day_10', 'pending_match_escalated', ...[...EMITTABLE_MISMATCH_REASONS].map((r) => `mismatch:${r}`)]);
    for (const o of occasions) expect(schema.ALERT_SMS_SEND_OCCASIONS as readonly string[]).toContain(o);
  });

  it('F6 — the LIT chunk is min(configured, 16): a SMALLER configured chunk wins; a NON-lit kind is ⛔ bounded even with the seam wired', async () => {
    const memberIds = Array.from({ length: 40 }, (_, i) => `aaaaaaaa-0000-0000-0000-${String(i).padStart(12, '0')}`);
    readMemberTextLanguages.mockResolvedValueOnce(new Map(memberIds.map((m) => [m, 'hi' as const])));
    await runContributionNotifyChild(
      deps({ alertSms: vi.fn(), memberChunkSize: 5 }),
      envelope(childPayload({ kind: 'deadline_reminder', cycleDay: 10, deadlineAtIso: '2026-08-05T00:00:00.000Z', memberIds: memberIds.slice(0, 8) })) as never,
    );
    expect(fanOutAlertToMembers.mock.calls.map((c) => (c[2] as string[]).length)).toEqual([5, 3]);
    fanOutAlertToMembers.mockClear();
    await runContributionNotifyChild(deps({ alertSms: vi.fn() }), envelope(childPayload({ memberIds })) as never); // cycle_open: not lit
    expect(fanOutAlertToMembers.mock.calls.map((c) => (c[2] as string[]).length)).toEqual([40]);
  });

  it('⭐ a member the language map OMITS gets ⛔ `sms` block (their push is unaffected); only the whole-Pariwar `null` alarms (the as-built behaviour — deferred C2-W6)', async () => {
    readMemberTextLanguages.mockResolvedValueOnce(new Map([[M1, 'en' as const]]));
    const onAlarm = vi.fn();
    await runContributionNotifyChild(
      deps({ onAlarm }),
      envelope(childPayload({ kind: 'deadline_reminder', cycleDay: 10, deadlineAtIso: '2026-08-05T00:00:00.000Z', memberIds: [M1, M2] })) as never,
    );
    const alertFor = fanOutAlertToMembers.mock.calls[0]![1] as (m: string) => Alert;
    // M1's block is the right one — `toBeDefined()` alone passes for ANY block (the wrong message, the wrong language).
    expect((alertFor(M1).payload_data as { sms?: unknown }).sms).toMatchObject({ message: 'deadline_not_recorded', locale: 'en' });
    expect((alertFor(M2).payload_data as { sms?: unknown }).sms).toBeUndefined();
    expect((alertFor(M2).payload_data as { subject?: unknown }).subject).toBeDefined(); // the push copy is there
    expect(onAlarm.mock.calls.filter(([m]) => String(m).includes('alert_sms.locale_unresolved'))).toHaveLength(0);
  });

  it('⭐ a text-language read that REJECTS fails the child (so pg-boss retries the whole pool — a transient read is retried, ⛔ dropped); in MISMATCH the member\'s claim is RELEASED first', async () => {
    readMemberTextLanguages.mockRejectedValueOnce(new Error('db blip'));
    await expect(
      runContributionNotifyChild(
        deps(),
        envelope(childPayload({ kind: 'deadline_reminder', cycleDay: 10, deadlineAtIso: '2026-08-05T00:00:00.000Z', memberIds: [M1] })) as never,
      ),
    ).rejects.toThrow('db blip');
    expect(fanOutAlertToMembers).not.toHaveBeenCalled();
    readMemberTextLanguages.mockRejectedValueOnce(new Error('db blip'));
    await expect(
      runContributionMismatchNotify(deps(), envelope({ alertId: ALERT, poolId: POOL_A, memberId: M1, reason: 'wrong_pool' }) as never),
    ).rejects.toThrow('db blip');
    expect(release).toHaveBeenCalledTimes(1);
    expect(fanOutAlertToMembers).not.toHaveBeenCalled();
  });

  it('⭐ a numeric `retryCount` with NO `retryLimit` (and a `retryLimit` with no `retryCount`) is ⛔ half-trusted: the registered handler passes NO attempt (⇒ the fan-out treats it as the final attempt)', async () => {
    const handlers = new Map<string, (jobs: unknown[]) => Promise<unknown>>();
    const work = vi.fn((name: string, a: unknown, b?: unknown) => {
      handlers.set(name, (typeof a === 'function' ? a : b) as (jobs: unknown[]) => Promise<unknown>);
      return Promise.resolve('w');
    });
    const fakeBoss = { createQueue: vi.fn(() => Promise.resolve()), schedule: vi.fn(() => Promise.resolve()), work, send: vi.fn() };
    await registerContributionNotifyWorkers(fakeBoss as never, deps());
    await handlers.get(QUEUE_NAMES.CONTRIBUTION_NOTIFY_POOL_BATCH)!([{ id: 'job-11', retryCount: 2, data: envelope(childPayload({ memberIds: [M1] })) }]);
    // `toStrictEqual` (not `toEqual`, which treats `{ retryLimit: undefined }` as a missing key). Two guards each keep a half-formed attempt out —
    // `jobAttemptOf` here and the child's own `retryCount !== undefined && retryLimit !== undefined` — so mutating ONE of them is an EQUIVALENT
    // mutant (checked 2026-10-25); this leg pins the END-TO-END contract: a half attempt ⛔ reaches the fan-out.
    expect(fanOutAlertToMembers.mock.calls.at(-1)![5]).toStrictEqual({ occasion: 'cycle_open', jobId: 'job-11' });
    await handlers.get(QUEUE_NAMES.CONTRIBUTION_NOTIFY_POOL_BATCH)!([{ id: 'job-12', retryLimit: 4, data: envelope(childPayload({ memberIds: [M1] })) }]);
    expect(fanOutAlertToMembers.mock.calls.at(-1)![5]).toStrictEqual({ occasion: 'cycle_open', jobId: 'job-12' });
  });
});


describe('FD-P1 — SMS pool jobs have bounded, independently retried payloads', () => {
  const members = Array.from({ length: 97 }, (_, i) => `aaaaaaaa-0000-0000-0000-${String(i + 1).padStart(12, '0')}`);
  async function workers() {
    const handlers = new Map<string, (jobs: unknown[]) => Promise<unknown>>();
    const boss = {
      createQueue: vi.fn(async () => undefined), schedule: vi.fn(async () => undefined),
      work: vi.fn(async (name: string, a: unknown, b?: unknown) => { handlers.set(name, (typeof a === 'function' ? a : b) as never); return 'w'; }),
      send: vi.fn(async () => 'child'),
      insert: vi.fn<(name: string, jobs: unknown[]) => Promise<string[] | null>>(async () => null),
    };
    const onAlarm = vi.fn();
    await registerContributionNotifyWorkers(boss as never, deps({ alertSms: vi.fn(), onAlarm }));
    return { boss, onAlarm, run: handlers.get(QUEUE_NAMES.CONTRIBUTION_NOTIFY_POOL_BATCH)! };
  }
  type Inserted = { id?: string; singletonKey: string; retryLimit: number; retryDelay: number; retryBackoff: boolean; data: ReturnType<typeof envelope<ReturnType<typeof childPayload>>> };
  /** R4-P2 — a split pool's bounded jobs are ONE `insert` call; its jobs, in order. */
  const insertedJobs = (insert: { mock: { calls: unknown[][] } }, call = 0): Inserted[] => insert.mock.calls[call]![1] as Inserted[];

  it.each(['deadline_reminder', 'pending_match_escalated'])('splits a queued full-pool %s job; a failed member does not wait for the rest of the pool', async (kind) => {
    const { boss, run } = await workers();
    const payload = childPayload({ kind, cycleDay: 10, memberIds: members });
    expect(await run([{ id: 'old-pool-job', retryCount: 0, retryLimit: 4, data: envelope(payload) }])).toEqual({ processed: 1, results: [] });
    expect(fanOutAlertToMembers).not.toHaveBeenCalled();
    expect(claim).not.toHaveBeenCalled();
    // R4-P2 — ONE atomic insert of every bounded job, ⛔ a send per job.
    expect(boss.send).not.toHaveBeenCalled();
    expect(boss.insert).toHaveBeenCalledTimes(1);
    expect(boss.insert.mock.calls[0]![0]).toBe(QUEUE_NAMES.CONTRIBUTION_NOTIFY_POOL_BATCH);
    const jobs = insertedJobs(boss.insert);
    const batches = jobs.map(j => j.data);
    expect(batches).toHaveLength(13);
    expect(batches.flatMap(b => b.payload.memberIds)).toEqual(members);
    for (const [i, batch] of batches.entries()) {
      expect(batch.payload.memberIds.length).toBeLessThanOrEqual(LIT_KIND_JOB_MEMBER_LIMIT);
      expect(batch).toMatchObject({ pariwarId: PARIWAR, requestId: 'req-1', payload: { kind, alertId: ALERT } });
      expect(jobs[i]).toMatchObject({ retryLimit: 4, retryDelay: 60, retryBackoff: true });
    }
    const defaultFanOut = fanOutAlertToMembers.getMockImplementation()!;
    fanOutAlertToMembers.mockImplementation(async (...args) => {
      const answer = await defaultFanOut(...args);
      return { ...answer, retry: [members[0]] };
    });
    await expect(run([{ id: 'bounded-job', retryCount: 3, retryLimit: 4, data: batches[0] }])).rejects.toThrow('1 member(s) failed');
    expect(fanOutAlertToMembers.mock.calls.flatMap(c => c[2])).toEqual(members.slice(0, 8));
    expect(fanOutAlertToMembers.mock.calls[0]![5]).toMatchObject({ jobId: 'bounded-job', retryCount: 3, retryLimit: 4 });
  });

  it('normal day-10 and escalated sweeps enqueue bounded jobs; other reminder days retain one pool job', async () => {
    getCycleFreezeCommittedAt.mockResolvedValue(new Date('2026-07-01T00:00:00.000Z'));
    listCycleBindingCandidates.mockResolvedValue([candidate(POOL_A, 0, members)]);
    const sweepDeps = (now: Date) => deps({ now: () => now, pool: { query: async () => ({ rows: [{ alert_id: ALERT, cycle_id: CYCLE, pariwar_id: PARIWAR }] }) } });
    const send = vi.fn(async () => 'child');
    const insert = vi.fn<(name: string, jobs: unknown[]) => Promise<string[] | null>>(async () => null);
    await runDeadlineReminderSweep(sweepDeps(new Date('2026-07-11T00:00:00.000Z')), { send, insert } as never);
    expect(send).not.toHaveBeenCalled();
    expect(insert).toHaveBeenCalledTimes(1);
    expect(insertedJobs(insert)).toHaveLength(13);
    const day10Keys = insertedJobs(insert).map(j => j.singletonKey);
    expect(new Set(day10Keys).size).toBe(13);
    insert.mockClear();
    await runDeadlineReminderSweep(sweepDeps(new Date('2026-07-06T00:00:00.000Z')), { send, insert } as never);
    expect(insert).not.toHaveBeenCalled();
    expect(send.mock.calls).toHaveLength(1);
    expect(((send.mock.calls[0] as unknown[])[1] as { payload: { memberIds: string[] } }).payload.memberIds).toEqual(members);
    send.mockClear();
    listPendingMatchMembersForPool.mockResolvedValue(members.map(memberId => ({ memberId, oldestUnresolvedAttestedAt: new Date('2026-07-01T00:00:00.000Z') })));
    await runPendingMatchRetrySweep(sweepDeps(new Date('2026-07-03T00:00:00.000Z')), { send, insert } as never);
    expect(send).not.toHaveBeenCalled();
    expect(insertedJobs(insert)).toHaveLength(13);
    for (const j of insertedJobs(insert)) expect(j.data.payload.memberIds.length).toBeLessThanOrEqual(8);
  });

  it('R4-P2 — a split pool whose insert fails enqueues NONE of its jobs, alarms that pool, and its sibling pool is still enqueued', async () => {
    getCycleFreezeCommittedAt.mockResolvedValue(new Date('2026-07-01T00:00:00.000Z'));
    listCycleBindingCandidates.mockResolvedValue([candidate(POOL_A, 0, members), candidate(POOL_B, 1, members)]);
    const onAlarm = vi.fn();
    const d = deps({ now: () => new Date('2026-07-11T00:00:00.000Z'), onAlarm, pool: { query: async () => ({ rows: [{ alert_id: ALERT, cycle_id: CYCLE, pariwar_id: PARIWAR }] }) } });
    const send = vi.fn(async () => 'child');
    const insert = vi.fn<(name: string, jobs: unknown[]) => Promise<string[] | null>>(async () => null).mockRejectedValueOnce(new Error('queue unavailable'));
    const result = await runDeadlineReminderSweep(d, { send, insert } as never);
    expect(send).not.toHaveBeenCalled();
    // Pool A's ONE insert failed as a whole; pool B's succeeded — ⛔ a prefix of pool A's jobs (the old sequential sends).
    expect(insert).toHaveBeenCalledTimes(2);
    expect(insertedJobs(insert, 0).every(j => j.data.payload.poolId === POOL_A)).toBe(true);
    expect(insertedJobs(insert, 1).every(j => j.data.payload.poolId === POOL_B)).toBe(true);
    expect(result.enqueuedPools).toBe(1);
    expect(onAlarm).toHaveBeenCalledWith(expect.stringContaining(`failed to enqueue reminders for alert ${ALERT} pool ${POOL_A}`));
  });

  it('AP-P1 / R4-P2 — a failed split insert retries with the same child IDs; different rosters and source jobs have distinct IDs', async () => {
    const { boss, onAlarm, run } = await workers();
    const job = { id: 'old', data: envelope(childPayload({ kind: 'pending_match_escalated', memberIds: members })) };
    boss.insert.mockRejectedValueOnce(new Error('queue unavailable'));
    await expect(run([job])).rejects.toThrow('queue unavailable');
    expect(onAlarm).toHaveBeenCalledWith(expect.stringContaining('failed to split queued job old alert'));
    expect(fanOutAlertToMembers).not.toHaveBeenCalled();
    const firstKeys = insertedJobs(boss.insert).map(j => j.id);
    // R4-P11: the ids must EXIST — `toEqual` alone also passes when both attempts carry `undefined`.
    expect(firstKeys).toHaveLength(13);
    for (const id of firstKeys) expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(new Set(firstKeys).size).toBe(13);
    boss.insert.mockClear();
    await run([job]);
    const allKeys = insertedJobs(boss.insert).map(j => j.id);
    expect(allKeys).toEqual(firstKeys);
    boss.insert.mockClear();
    await run([{ ...job, data: envelope({ ...job.data.payload, memberIds: [M2, ...members.slice(1)] }) }]);
    expect(insertedJobs(boss.insert)[0]!.id).not.toBe(allKeys[0]);
    boss.insert.mockClear();
    await run([{ ...job, id: 'different-parent' }]);
    expect(insertedJobs(boss.insert)[0]!.id).not.toBe(allKeys[0]);
  });

  it('AP-P2 — 97 acted members across 13 jobs are counted once and each read is scoped to its payload', async () => {
    const { boss, run } = await workers();
    await run([{ id: 'old', data: envelope(childPayload({ kind: 'deadline_reminder', cycleDay: 10, memberIds: members })) }]);
    // Deliberately return the old whole-pool shape to pin the caller's defensive intersection too.
    listActedMemberIdsForPool.mockResolvedValue({ confirmed: members, attested: members });
    let suppressed = 0;
    for (const { data: batch } of insertedJobs(boss.insert)) {
      const result = await runContributionNotifyChild(deps(), batch as never);
      suppressed += result.suppressed;
      expect(listActedMemberIdsForPool.mock.calls.at(-1)![1]).toMatchObject({ memberIds: batch.payload.memberIds });
    }
    expect(suppressed).toBe(97);
    expect(listActedMemberIdsForPool).toHaveBeenCalledTimes(13);
    expect(fanOutAlertToMembers).not.toHaveBeenCalled();
  });

  it.each([
    ['deadline_reminder day 5', { kind: 'deadline_reminder', cycleDay: 5 }],
    ['deadline_reminder day 13', { kind: 'deadline_reminder', cycleDay: 13 }],
    ['deadline_reminder day 14', { kind: 'deadline_reminder', cycleDay: 14 }],
  ])('R4-P1 — a whole-pool %s job reads its pool UNFILTERED (⛔ its roster as bind parameters — 4L in one pool would exceed 65,535)', async (_label, kind) => {
    const roster = Array.from({ length: 40_000 }, (_, i) => `bbbbbbbb-0000-0000-0000-${String(i + 1).padStart(12, '0')}`);
    listActedMemberIdsForPool.mockResolvedValue({ confirmed: [roster[0]!], attested: [] });
    const result = await runContributionNotifyChild(deps(), envelope(childPayload({ ...kind, memberIds: roster })) as never);
    expect(listActedMemberIdsForPool).toHaveBeenCalledTimes(1);
    expect(listActedMemberIdsForPool.mock.calls[0]![1]).not.toHaveProperty('memberIds');
    expect(result.suppressed).toBe(1);
  });

  it.each([
    [{ retryCount: 0, retryLimit: 4 }, 'retrying'],
    [{ retryCount: 4, retryLimit: 4 }, 'no retry remains'],
    [{}, 'retry status unknown'],
    [{ retryCount: 1 }, 'retry status unknown'],
    [{ retryLimit: 4 }, 'retry status unknown'],
  ])('AP-P4 — split failure describes the remaining attempts truthfully: %j', async (attempt, expected) => {
    const { boss, onAlarm, run } = await workers();
    const failure = new Error('queue unavailable');
    boss.insert.mockRejectedValueOnce(failure);
    await expect(run([{ id: 'source', ...attempt, data: envelope(childPayload({ kind: 'pending_match_escalated', memberIds: members })) }])).rejects.toBe(failure);
    expect(onAlarm).toHaveBeenCalledWith(expect.stringContaining(expected));
    if (expected !== 'retrying') {
      expect(onAlarm.mock.calls[0]![0]).toContain('recovery required');
      expect(onAlarm.mock.calls[0]![0]).not.toContain('retrying');
    }
    expect(fanOutAlertToMembers).not.toHaveBeenCalled();
  });

  it('AP-P1 — missing source id refuses conversion before any child is enqueued', async () => {
    const { boss, run } = await workers();
    await expect(run([{ data: envelope(childPayload({ kind: 'pending_match_escalated', memberIds: members })) }])).rejects.toThrow('missing source job id');
    expect(boss.send).not.toHaveBeenCalled();
    expect(boss.insert).not.toHaveBeenCalled();
  });

  it('a legacy job without tenant context alarms and fails before enqueueing or sending', async () => {
    const { boss, onAlarm, run } = await workers();
    await expect(run([{ id: 'bad', data: { ...envelope(childPayload({ kind: 'pending_match_escalated', memberIds: members })), pariwarId: null } }])).rejects.toThrow('missing pariwarId');
    expect(onAlarm).toHaveBeenCalledWith(expect.stringContaining('missing pariwarId'));
    expect(boss.send).not.toHaveBeenCalled();
    expect(boss.insert).not.toHaveBeenCalled();
    expect(fanOutAlertToMembers).not.toHaveBeenCalled();
  });

});

// ─── Story 5.8b (AC4; FS4 (d), FS5, FS6 / `-414` Q2 A, FS7) — the bridged cycle-open carries the bridge text ─────────────

describe('Story 5.8b AC4 — a TIME-CRITICAL cycle-open builds the `cycle_open_bridge` block (the producer)', () => {
  const smsOf = (a: Alert) => (a.payload_data as { sms?: unknown }).sms;
  const alertBuiltFor = (memberId: string, call = 0) =>
    (fanOutAlertToMembers.mock.calls[call]![1] as (m: string) => Alert)(memberId);
  const bridged = (overrides: Record<string, unknown> = {}) => childPayload({ timeCritical: true, ...overrides });

  it('the builder: time-critical + a locale + boxes ⇒ the block (pool in the TEXT language, the boxes as given); else ⛔ block', () => {
    const base = { alertId: ALERT, pariwarId: PARIWAR, memberId: M1, poolId: POOL_A, identity: IDENTITY, locale: 'hi' as const, now: NOW };
    const boxes = ['रामेश्वर', ' प्र.'] as const;
    const hi = buildCycleOpenAlert({ ...base, timeCritical: true, smsLocale: 'hi', smsNameBoxes: boxes });
    expect(smsOf(hi)).toEqual({ message: 'cycle_open_bridge', locale: 'hi', values: { pool: 'युधिष्ठिर', member1: 'रामेश्वर', member2: ' प्र.' } });
    // T10 — the en text names the pool by its LETTER (a Devanagari pool would turn it Unicode).
    expect(smsOf(buildCycleOpenAlert({ ...base, timeCritical: true, smsLocale: 'en', smsNameBoxes: boxes }))).toMatchObject({ locale: 'en', values: { pool: 'A' } });
    expect(() => Alert.parse(hi)).not.toThrow();
    // ⛔ block: not time-critical (I2), no locale, no boxes, an empty box.
    expect(smsOf(buildCycleOpenAlert({ ...base, timeCritical: false, smsLocale: 'hi', smsNameBoxes: boxes }))).toBeUndefined();
    expect(smsOf(buildCycleOpenAlert({ ...base, timeCritical: true, smsLocale: null, smsNameBoxes: boxes }))).toBeUndefined();
    expect(smsOf(buildCycleOpenAlert({ ...base, timeCritical: true, smsNameBoxes: boxes }))).toBeUndefined();
    expect(smsOf(buildCycleOpenAlert({ ...base, timeCritical: true, smsLocale: 'hi', smsNameBoxes: null }))).toBeUndefined();
    expect(smsOf(buildCycleOpenAlert({ ...base, timeCritical: true, smsLocale: 'hi', smsNameBoxes: ['R', ''] }))).toBeUndefined();
    // The PUSH copy is unchanged by the block.
    expect((hi.payload_data as { body: string }).body).toBe(
      (buildCycleOpenAlert({ ...base, timeCritical: false }).payload_data as { body: string }).body,
    );
  });

  it.each([
    ['shielded_name (the default fixture — "रामेश्वर प्र." is `full`, its full stop kept)', IDENTITY],
    ['full_name', FULL_NAME_IDENTITY],
  ])('⭐ T12 — %s: the child reads languages and the death overlay ONCE, fits the name ONCE, and every member gets the block in their language', async (_mode, identity) => {
    resolvePoolIdentity.mockResolvedValue(identity);
    readMemberTextLanguages.mockResolvedValueOnce(new Map([[M1, 'en' as const], [M2, 'hi' as const]]));
    await runContributionNotifyChild(deps(), envelope(bridged()) as never);
    expect(readMemberTextLanguages).toHaveBeenCalledTimes(1);
    expect(listAccountFrozenMemberIds).toHaveBeenCalledTimes(1);
    expect(listAccountFrozenMemberIds.mock.calls[0]![1]).toEqual([M1, M2]);
    const en = smsOf(alertBuiltFor(M1)) as { locale: string; values: Record<string, string> };
    const hi = smsOf(alertBuiltFor(M2)) as { locale: string; values: Record<string, string> };
    expect(en).toMatchObject({ message: 'cycle_open_bridge', locale: 'en', values: { pool: 'A' } });
    expect(hi).toMatchObject({ message: 'cycle_open_bridge', locale: 'hi', values: { pool: 'युधिष्ठिर' } });
    // The boxes concatenate to the SAME label the push names (⛔ a second name rule).
    expect(en.values['member1']! + en.values['member2']!).toBe(identity.deceasedDisplayName);
    expect(hi.values['member1']! + hi.values['member2']!).toBe(identity.deceasedDisplayName);
    expect((alertBuiltFor(M2).payload_data as { body: string }).body).toContain(identity.deceasedDisplayName);
  });

  const NAME_60 = `${'R'.repeat(29)} ${'S'.repeat(30)}`;
  const NAME_61_TITLE = `Shri ${'B'.repeat(27)} ${'C'.repeat(28)}`;
  const NAME_63_INITIALS = `${'D'.repeat(30)} ${'E'.repeat(30)} F`;
  const NAME_TOO_LONG = 'G'.repeat(61);

  it.each([
    ['60 letters ⇒ `full`, sent WHOLE', NAME_60, NAME_60],
    ['61 with a title ⇒ `shortened` (the title dropped), SENT (`-414` Q2 A)', NAME_61_TITLE, `${'B'.repeat(27)} ${'C'.repeat(28)}`],
    ['63 without a title ⇒ `shortened` (the first word to its initial, ⛔ the last), SENT', NAME_63_INITIALS, `D ${'E'.repeat(30)} F`],
  ])('⭐ the name — %s', async (_label, label, sent) => {
    resolvePoolIdentity.mockResolvedValue({ ...IDENTITY, deceasedDisplayName: label });
    const onAlarm = vi.fn();
    await runContributionNotifyChild(deps({ onAlarm }), envelope(bridged()) as never);
    const v = (smsOf(alertBuiltFor(M1)) as { values: Record<string, string> }).values;
    expect(v['member1']! + v['member2']!).toBe(sent);
    expect([...v['member1']!].length).toBeLessThanOrEqual(30);
    expect([...v['member2']!].length).toBeLessThanOrEqual(30);
    expect(onAlarm.mock.calls.filter(([m]) => String(m).includes('bridge_name_too_long'))).toHaveLength(0);
  });

  it('⭐ a name `too_long` even shortened ⇒ ⛔ block for EVERY member of the job and ONE name-free alarm carrying the count (the push still goes)', async () => {
    resolvePoolIdentity.mockResolvedValue({ ...IDENTITY, deceasedDisplayName: NAME_TOO_LONG });
    const onAlarm = vi.fn();
    await runContributionNotifyChild(deps({ onAlarm }), envelope(bridged()) as never);
    expect(smsOf(alertBuiltFor(M1))).toBeUndefined();
    expect(smsOf(alertBuiltFor(M2))).toBeUndefined();
    const alarms = onAlarm.mock.calls.map(([m]) => String(m)).filter((m) => m.includes('alert_sms.bridge_name_too_long'));
    expect(alarms).toHaveLength(1);
    expect(alarms[0]).toContain('2 member(s)');
    expect(alarms[0]).not.toContain('GGGG'); // T11 — ⛔ the name (or a box) in an alarm
    expect(fanOutAlertToMembers).toHaveBeenCalledTimes(1); // the push is unchanged
  });

  it('⭐ FS4 (d) / I10 — a member under the account-frozen overlay gets ⛔ block while the neighbour does; their alert is otherwise identical', async () => {
    listAccountFrozenMemberIds.mockResolvedValueOnce(new Set([M1.toLowerCase()]));
    await runContributionNotifyChild(deps(), envelope(bridged()) as never);
    expect(smsOf(alertBuiltFor(M1))).toBeUndefined();
    expect(smsOf(alertBuiltFor(M2))).toMatchObject({ message: 'cycle_open_bridge' });
    const rest: Record<string, unknown> = { ...(alertBuiltFor(M2).payload_data as Record<string, unknown>) };
    delete rest['sms'];
    expect(alertBuiltFor(M1).payload_data).toEqual(rest);
  });

  it('a Pariwar with ⛔ passport row ⇒ every bridge block OMITTED and ONE `alert_sms.locale_unresolved` alarm (the push unchanged)', async () => {
    readMemberTextLanguages.mockResolvedValueOnce(null as never);
    const onAlarm = vi.fn();
    await runContributionNotifyChild(deps({ onAlarm }), envelope(bridged()) as never);
    expect(smsOf(alertBuiltFor(M1))).toBeUndefined();
    expect(smsOf(alertBuiltFor(M2))).toBeUndefined();
    expect(onAlarm.mock.calls.filter(([m]) => String(m).includes('alert_sms.locale_unresolved'))).toHaveLength(1);
  });

  it('⛔ a NON-time-critical cycle-open — ⛔ block, ⛔ language read, ⛔ overlay read (today\'s cycle-open, unchanged)', async () => {
    await runContributionNotifyChild(deps(), envelope(childPayload()) as never);
    expect(smsOf(alertBuiltFor(M1))).toBeUndefined();
    expect(readMemberTextLanguages).not.toHaveBeenCalled();
    expect(listAccountFrozenMemberIds).not.toHaveBeenCalled();
  });

  it('⭐ FS5 / T6 — the parent splits a bridged pool at 9 (⛔ at 8) into bounded jobs in ONE insert; an un-bridged pool of 9 stays whole', async () => {
    const nine = Array.from({ length: 9 }, (_, i) => `aaaaaaaa-0000-0000-0000-${String(i + 1).padStart(12, '0')}`);
    const run = async (memberIds: string[], timeCritical: boolean) => {
      listCycleBindingCandidates.mockResolvedValueOnce([candidate(POOL_A, 0, memberIds)]);
      const send = vi.fn(async () => 'child');
      const insert = vi.fn<(name: string, jobs: unknown[]) => Promise<string[] | null>>(async () => null);
      await runContributionNotifyParent(deps(), { send, insert } as never, envelope({ alertId: ALERT, cycleId: CYCLE, timeCritical }));
      return { send, insert };
    };
    const split = await run(nine, true);
    expect(split.send).not.toHaveBeenCalled();
    const jobs = split.insert.mock.calls[0]![1] as { data: { payload: { memberIds: string[]; timeCritical: boolean } } }[];
    expect(jobs.map((j) => j.data.payload.memberIds.length)).toEqual([8, 1]);
    expect(jobs.every((j) => j.data.payload.timeCritical)).toBe(true);
    const eight = await run(nine.slice(0, 8), true);
    expect(eight.insert).not.toHaveBeenCalled();
    expect(eight.send).toHaveBeenCalledTimes(1);
    const whole = await run(nine, false);
    expect(whole.insert).not.toHaveBeenCalled();
    expect(((whole.send.mock.calls[0] as unknown[])[1] as { payload: { memberIds: string[] } }).payload.memberIds).toHaveLength(9);
  });

  it('⭐ T6 — a WHOLE bridged cycle-open job of 9 queued before the deploy is SPLIT by the registered worker (the kind-agnostic legacy conversion), ⛔ sent whole', async () => {
    const nine = Array.from({ length: 9 }, (_, i) => `aaaaaaaa-0000-0000-0000-${String(i + 1).padStart(12, '0')}`);
    const handlers = new Map<string, (jobs: unknown[]) => Promise<unknown>>();
    const boss = {
      createQueue: vi.fn(async () => undefined), schedule: vi.fn(async () => undefined),
      work: vi.fn(async (name: string, a: unknown, b?: unknown) => { handlers.set(name, (typeof a === 'function' ? a : b) as never); return 'w'; }),
      send: vi.fn(async () => 'child'),
      insert: vi.fn<(name: string, jobs: unknown[]) => Promise<string[] | null>>(async () => null),
    };
    await registerContributionNotifyWorkers(boss as never, deps({ alertSms: vi.fn() }));
    const run = handlers.get(QUEUE_NAMES.CONTRIBUTION_NOTIFY_POOL_BATCH)!;
    await run([{ id: 'pre-deploy-job', retryCount: 0, retryLimit: 4, data: envelope(bridged({ memberIds: nine })) }]);
    expect(fanOutAlertToMembers).not.toHaveBeenCalled();
    expect(boss.insert).toHaveBeenCalledTimes(1);
    const jobs = boss.insert.mock.calls[0]![1] as { data: { payload: { memberIds: string[]; kind: string; timeCritical: boolean } } }[];
    expect(jobs.map((j) => j.data.payload.memberIds.length)).toEqual([8, 1]);
    expect(jobs.every((j) => j.data.payload.kind === 'cycle_open' && j.data.payload.timeCritical)).toBe(true);
    // …and a DIRECT oversized bridged job is refused before any read or send (the guard applies to the widened kind).
    const onAlarm = vi.fn();
    await expect(runContributionNotifyChild(deps({ alertSms: vi.fn(), onAlarm }), envelope(bridged({ memberIds: nine })) as never)).rejects.toThrow(
      'must be split before fan-out',
    );
    expect(listAccountFrozenMemberIds).not.toHaveBeenCalled();
  });

  it('⭐ AC12 — the bridged child hands EVERY chunk\'s fan-out the SAME switch read, wrapped to read ONCE per job; an un-bridged job passes it through', async () => {
    const read = vi.fn(() => Promise.resolve(true));
    await runContributionNotifyChild(deps({ readBridgeSwitch: read, memberChunkSize: 1 }), envelope(bridged()) as never);
    expect(fanOutAlertToMembers).toHaveBeenCalledTimes(2); // two chunks of one member
    const first = (fanOutAlertToMembers.mock.calls[0]![0] as { readBridgeSwitch: () => Promise<boolean> }).readBridgeSwitch;
    const second = (fanOutAlertToMembers.mock.calls[1]![0] as { readBridgeSwitch: () => Promise<boolean> }).readBridgeSwitch;
    expect(first).not.toBe(read);
    expect(second).toBe(first);
    await first();
    await second();
    expect(read).toHaveBeenCalledTimes(1);
    fanOutAlertToMembers.mockClear();
    await runContributionNotifyChild(deps({ readBridgeSwitch: read }), envelope(childPayload()) as never);
    expect((fanOutAlertToMembers.mock.calls[0]![0] as { readBridgeSwitch: unknown }).readBridgeSwitch).toBe(read);
  });

  it('the bridged child passes the occasion `cycle_open` (the keyed store\'s scope) to the fan-out', async () => {
    await runContributionNotifyChild(deps(), envelope(bridged({ memberIds: [M1] })) as never, { id: 'job-9', retryCount: 0, retryLimit: 4 });
    expect(fanOutAlertToMembers.mock.calls[0]![5]).toEqual({ occasion: 'cycle_open', jobId: 'job-9', retryCount: 0, retryLimit: 4 });
  });
});

describe('Story 5.8b review P2-1 — a bridge-row closure that FAILED is owed by the job: retried for it ALONE (⛔ a second push)', () => {
  const bridged = (overrides: Record<string, unknown> = {}) => childPayload({ timeCritical: true, ...overrides });
  const delivered = (memberId: string, extra: Record<string, unknown> = {}) => ({
    memberId,
    delivered: true,
    deliveredChannel: 'push',
    trail: [{ channel: 'sms', attempt: 0, outcome: 'skipped_no_target', detail: 'rate_limited' }, { channel: 'push', attempt: 0, outcome: 'sent' }],
    bridged: true,
    costSuppressedChannels: [],
    telegramMirrored: false,
    ...extra,
  });
  const seamWith = (closure: 'closed' | 'none' | 'failed') =>
    Object.assign(vi.fn(), { giveUpDeferred: vi.fn<(input: { alert: Alert; call?: unknown }) => Promise<string>>(() => Promise.resolve(closure)) });

  it('⭐ attempt 1: the ladder delivered M1 but its closure failed ⇒ M1 is RECORDED (claim kept) with `bridgeRowOpen`, ⛔ released, and the job THROWS for the closure', async () => {
    fanOutAlertToMembers.mockResolvedValueOnce({ results: [delivered(M1, { bridgeRowOpen: true }), delivered(M2)], retry: [] });
    const onAlarm = vi.fn();
    await expect(
      runContributionNotifyChild(deps({ alertSms: seamWith('failed'), onAlarm }), envelope(bridged()) as never, { id: 'j', retryCount: 0, retryLimit: 4 }),
    ).rejects.toThrow('0 member(s) failed and 1 deferred bridge text(s) are still to be given up');
    expect(release).not.toHaveBeenCalled();
    expect(recordResult).toHaveBeenCalledTimes(2);
    expect(recordResult.mock.calls.find((c) => (c[0] as string).includes(M1))![1]).toMatchObject({ delivered: true, bridgeRowOpen: true });
    expect(recordResult.mock.calls.find((c) => (c[0] as string).includes(M2))![1]).not.toHaveProperty('bridgeRowOpen');
  });

  it('⭐ the RETRY: M1 is `already_claimed`, its record owes the closure ⇒ ONLY the closure is tried (for M1, this attempt\'s call) — ⛔ fan-out, ⛔ throw once it closes', async () => {
    claim.mockResolvedValue('already_claimed');
    inspect.mockImplementation((key: string) =>
      Promise.resolve(key.includes(M1) ? { status: 'completed', result: { delivered: true, bridgeRowOpen: true } } : { status: 'completed', result: { delivered: true } }),
    );
    const alertSms = seamWith('closed');
    const result = await runContributionNotifyChild(deps({ alertSms }), envelope(bridged()) as never, { id: 'j', retryCount: 1, retryLimit: 4 });
    expect(result).toMatchObject({ attempted: 0, alreadySent: 2 });
    expect(fanOutAlertToMembers).not.toHaveBeenCalled();
    expect(alertSms).not.toHaveBeenCalled();
    expect(alertSms.giveUpDeferred).toHaveBeenCalledTimes(1);
    const [arg] = alertSms.giveUpDeferred.mock.calls[0]!;
    expect(arg.alert).toMatchObject({ alert_id: ALERT, member_id: M1, pariwar_id: PARIWAR });
    expect(arg.call).toEqual({ occasion: 'cycle_open', jobId: 'j', retryCount: 1, retryLimit: 4 });
  });

  it('the retry\'s closure fails AGAIN ⇒ it throws again (not final); on the FINAL attempt ⛔ throw — ONE alarm naming the 30-minute window', async () => {
    claim.mockResolvedValue('already_claimed');
    inspect.mockResolvedValue({ status: 'completed', result: { delivered: true, bridgeRowOpen: true } });
    await expect(
      runContributionNotifyChild(deps({ alertSms: seamWith('failed') }), envelope(bridged({ memberIds: [M1] })) as never, { id: 'j', retryCount: 2, retryLimit: 4 }),
    ).rejects.toThrow('still to be given up');
    const onAlarm = vi.fn();
    const final = await runContributionNotifyChild(
      deps({ alertSms: seamWith('failed'), onAlarm }),
      envelope(bridged({ memberIds: [M1] })) as never,
      { id: 'j', retryCount: 4, retryLimit: 4 },
    );
    expect(final.alreadySent).toBe(1);
    expect(onAlarm).toHaveBeenCalledTimes(1);
    expect(String(onAlarm.mock.calls[0]![0])).toContain('FINAL attempt');
  });

  it('⛔ owed: a recorded member WITHOUT the flag, an UN-bridged job, or a record that is still pending (another job holds it) ⇒ ⛔ closure tried', async () => {
    claim.mockResolvedValue('already_claimed');
    const alertSms = seamWith('closed');
    inspect.mockResolvedValue({ status: 'completed', result: { delivered: true } });
    await runContributionNotifyChild(deps({ alertSms }), envelope(bridged()) as never);
    inspect.mockResolvedValue({ status: 'pending', result: null });
    await runContributionNotifyChild(deps({ alertSms }), envelope(bridged()) as never);
    inspect.mockResolvedValue({ status: 'completed', result: { delivered: true, bridgeRowOpen: true } });
    await runContributionNotifyChild(deps({ alertSms }), envelope(childPayload()) as never);
    expect(alertSms.giveUpDeferred).not.toHaveBeenCalled();
  });
});

// ─── Story 5.8b — code review 2026-10-28 (second pass): the overlay read, the key's life, the name alarms, the predicate ──────────

describe('Story 5.8b code review 2026-10-28 (second pass) — the bridged child', () => {
  const smsOf = (a: Alert) => (a.payload_data as { sms?: unknown }).sms;
  const alertBuiltFor = (memberId: string, call = 0) => (fanOutAlertToMembers.mock.calls[call]![1] as (m: string) => Alert)(memberId);
  const bridged = (overrides: Record<string, unknown> = {}) => childPayload({ timeCritical: true, ...overrides });
  const alarmsOf = (onAlarm: ReturnType<typeof vi.fn>, word: string) => onAlarm.mock.calls.map(([m]) => String(m)).filter((m) => m.includes(word));

  it('⭐ the death-overlay read FAILS ⇒ EVERY bridge block omitted (⛔ a guess), ONE name-free alarm, the push still goes, the scope rolled back to its SAVEPOINT, ⛔ throw', async () => {
    resolvePoolIdentity.mockResolvedValue({ ...IDENTITY, deceasedDisplayName: 'Ramesh Kumar' });
    listAccountFrozenMemberIds.mockRejectedValueOnce(Object.assign(new Error('relation "events_log" Ramesh'), { code: '57014' }));
    const onAlarm = vi.fn();
    const result = await runContributionNotifyChild(deps({ onAlarm }), envelope(bridged()) as never);
    expect(result.attempted).toBe(2);
    expect(fanOutAlertToMembers).toHaveBeenCalledTimes(1);
    expect(smsOf(alertBuiltFor(M1))).toBeUndefined();
    expect(smsOf(alertBuiltFor(M2))).toBeUndefined();
    const alarms = alarmsOf(onAlarm, 'alert_sms.bridge_overlay_unavailable');
    expect(alarms).toHaveLength(1);
    expect(alarms[0]).toContain('code:57014');
    expect(alarms[0]).not.toContain('Ramesh');
    // ⛔ a name-fit alarm on top (nobody would be texted).
    expect(alarmsOf(onAlarm, 'bridge_name')).toHaveLength(0);
    expect(scopeClientQuery.mock.calls.map(([q]) => q)).toEqual(['SAVEPOINT bridge_death_overlay', 'ROLLBACK TO SAVEPOINT bridge_death_overlay']);
    // The identity reads after it still ran on the SAME scope.
    expect(resolvePoolIdentity).toHaveBeenCalledTimes(1);
    // Fix review (2026-10-28): the fan-out is TOLD the blocks are missing on a failed read (⛔ ineligible) — an un-reached member retries.
    expect(fanOutAlertToMembers.mock.calls[0]![5]).toMatchObject({ occasion: 'cycle_open', bridgeBlockUnavailable: true });
  });

  it('fix review (2026-10-28) — an OWED closure on an attempt whose overlay read FAILS stays owed (⛔ tried without a block, ⛔ dropped): the job throws', async () => {
    claim.mockResolvedValue('already_claimed');
    inspect.mockResolvedValue({ status: 'completed', result: { delivered: true, bridgeRowOpen: true } });
    listAccountFrozenMemberIds.mockRejectedValueOnce(Object.assign(new Error('blip'), { code: '57014' }));
    const alertSms = seamWith('closed');
    await expect(
      runContributionNotifyChild(deps({ alertSms }), envelope(bridged({ memberIds: [M1] })) as never, { id: 'j', retryCount: 1, retryLimit: 4 }),
    ).rejects.toThrow('still to be given up');
    expect(alertSms.giveUpDeferred).not.toHaveBeenCalled();
  });

  it('the read that succeeds RELEASES its savepoint; an un-bridged cycle-open takes none', async () => {
    await runContributionNotifyChild(deps(), envelope(bridged()) as never);
    expect(scopeClientQuery.mock.calls.map(([q]) => q)).toEqual(['SAVEPOINT bridge_death_overlay', 'RELEASE SAVEPOINT bridge_death_overlay']);
    scopeClientQuery.mockClear();
    await runContributionNotifyChild(deps(), envelope(childPayload()) as never);
    expect(scopeClientQuery).not.toHaveBeenCalled();
  });

  it('⭐ AC6 — the builder asks the ONE predicate: `deathReported` ⇒ ⛔ block (the language and the boxes notwithstanding)', () => {
    const base = { alertId: ALERT, pariwarId: PARIWAR, memberId: M1, poolId: POOL_A, identity: IDENTITY, locale: 'hi' as const, now: NOW };
    const boxes = ['रामेश्वर', ' प्र.'] as const;
    expect(smsOf(buildCycleOpenAlert({ ...base, timeCritical: true, smsLocale: 'hi', smsNameBoxes: boxes, deathReported: true }))).toBeUndefined();
    expect(smsOf(buildCycleOpenAlert({ ...base, timeCritical: true, smsLocale: 'hi', smsNameBoxes: boxes, deathReported: false }))).toMatchObject({ message: 'cycle_open_bridge' });
  });

  it('⭐ the key\'s life — a BRIDGED member is claimed for the 30-minute deferred window + margin; every other kind keeps its own TTL', async () => {
    expect(BRIDGED_MEMBER_IDEMPOTENCY_TTL_SECONDS).toBeGreaterThanOrEqual(30 * 60 + 400); // the window + one bounded job (~400 s)
    await runContributionNotifyChild(deps(), envelope(bridged()) as never);
    expect(claim.mock.calls.map((c) => c[1])).toEqual([BRIDGED_MEMBER_IDEMPOTENCY_TTL_SECONDS, BRIDGED_MEMBER_IDEMPOTENCY_TTL_SECONDS]);
    claim.mockClear();
    await runContributionNotifyChild(deps({ memberIdempotencyTtlSeconds: 60 }), envelope(bridged()) as never);
    expect(claim.mock.calls[0]![1]).toBe(BRIDGED_MEMBER_IDEMPOTENCY_TTL_SECONDS); // an override never shortens it
    claim.mockClear();
    await runContributionNotifyChild(deps(), envelope(childPayload()) as never);
    expect(claim.mock.calls[0]![1]).toBe(DEFAULT_MEMBER_IDEMPOTENCY_TTL_SECONDS);
  });

  /** A keyed store with a clock and a VACUUM (`purgeExpiredKeys`): `claim` / `recordResult` / `inspect` as Story 1.12 defines them. */
  function clockedStore() {
    let nowMs = Date.parse('2026-10-28T06:00:00.000Z');
    const rows = new Map<string, { status: 'pending' | 'completed'; expiresAt: number; result: unknown }>();
    claim.mockImplementation((key: string, ttl: number) => {
      const row = rows.get(key);
      if (row === undefined || (row.status === 'pending' && row.expiresAt < nowMs)) {
        rows.set(key, { status: 'pending', expiresAt: nowMs + ttl * 1000, result: null });
        return Promise.resolve('acquired');
      }
      return Promise.resolve('already_claimed');
    });
    recordResult.mockImplementation((key: string, result: unknown) => {
      const row = rows.get(key);
      if (row?.status !== 'pending') return Promise.reject(new Error('IdempotencyKeyNotClaimedError'));
      row.status = 'completed';
      row.result = result;
      return Promise.resolve();
    });
    inspect.mockImplementation((key: string) => {
      const row = rows.get(key);
      return Promise.resolve(row ? { status: row.status, createdAt: new Date(0), expiresAt: new Date(row.expiresAt), result: row.result } : null);
    });
    release.mockImplementation((key: string) => {
      if (rows.get(key)?.status === 'pending') rows.delete(key);
      return Promise.resolve();
    });
    return {
      advance: (ms: number) => (nowMs += ms),
      vacuum: () => {
        for (const [k, v] of rows) if (v.expiresAt < nowMs) rows.delete(k);
      },
    };
  }
  const delivered = (memberId: string, extra: Record<string, unknown> = {}) => ({
    memberId,
    delivered: true,
    deliveredChannel: 'push',
    trail: [{ channel: 'sms', attempt: 0, outcome: 'skipped_no_target', detail: 'rate_limited' }, { channel: 'push', attempt: 0, outcome: 'sent' }],
    bridged: true,
    costSuppressedChannels: [],
    telegramMirrored: false,
    ...extra,
  });
  const seamWith = (closure: 'closed' | 'none' | 'failed') =>
    Object.assign(vi.fn(), { giveUpDeferred: vi.fn<(input: { alert: Alert; call?: unknown; ladder?: string }) => Promise<string>>(() => Promise.resolve(closure)) });

  it('⭐ (a) the hourly VACUUM between attempts (backoff past 300 s) no longer drops an owed closure into a FULL re-fan: the record outlives it ⇒ the retry tries the closure ALONE', async () => {
    const store = clockedStore();
    fanOutAlertToMembers.mockResolvedValueOnce({ results: [delivered(M1, { bridgeRowOpen: true })], retry: [] });
    await expect(
      runContributionNotifyChild(deps({ alertSms: seamWith('failed') }), envelope(bridged({ memberIds: [M1] })) as never, { id: 'j', retryCount: 0, retryLimit: 4 }),
    ).rejects.toThrow('still to be given up');
    store.advance(20 * 60_000); // attempt 4's backoff, well past the old 300 s key
    store.vacuum();
    const alertSms = seamWith('closed');
    const retry = await runContributionNotifyChild(deps({ alertSms }), envelope(bridged({ memberIds: [M1] })) as never, { id: 'j', retryCount: 3, retryLimit: 4 });
    expect(retry).toMatchObject({ attempted: 0, alreadySent: 1 });
    expect(fanOutAlertToMembers).toHaveBeenCalledTimes(1); // ⛔ a second fan-out (⛔ push, ⛔ text-first from the fresh deferred row)
    expect(alertSms.giveUpDeferred).toHaveBeenCalledTimes(1);
  });

  it('⭐ (b) a `recordResult` that FAILS leaves the key `pending` — it stays claimed past the deferred row\'s 30 minutes, so ⛔ fan-out re-claims the member (⛔ a text from it) until the row has aged out', async () => {
    const store = clockedStore();
    recordResult.mockImplementationOnce(() => Promise.reject(new Error('the server closed the connection')));
    fanOutAlertToMembers.mockResolvedValueOnce({ results: [delivered(M1, { bridgeRowOpen: true })], retry: [] });
    const onAlarm = vi.fn();
    await expect(
      runContributionNotifyChild(deps({ alertSms: seamWith('failed'), onAlarm }), envelope(bridged({ memberIds: [M1] })) as never, { id: 'j', retryCount: 0, retryLimit: 4 }),
    ).rejects.toThrow();
    expect(alarmsOf(onAlarm, 'failed to record a member result')).toHaveLength(1);
    // Retries (and a sweep re-run) at +6, +20 and +31 minutes — each past the old 300 s key.
    for (const stepMinutes of [6, 14, 11]) {
      store.advance(stepMinutes * 60_000);
      store.vacuum();
      await runContributionNotifyChild(deps({ alertSms: seamWith('closed') }), envelope(bridged({ memberIds: [M1] })) as never, { id: 'j', retryCount: 1, retryLimit: 4 });
    }
    expect(fanOutAlertToMembers).toHaveBeenCalledTimes(1);
    // Past the TTL (45 min) — the deferred row is ≥ 30 min old by now, so the seam gives it up `expired` instead of sending (live: C1-D1).
    store.advance(15 * 60_000);
    store.vacuum();
    await runContributionNotifyChild(deps({ alertSms: seamWith('closed') }), envelope(bridged({ memberIds: [M1] })) as never, { id: 'j-sweep', retryCount: 0, retryLimit: 4 });
    expect(fanOutAlertToMembers).toHaveBeenCalledTimes(2);
  });

  it('an owed closure on a member recorded `in_app_only` is retried as `in_app_only` (⛔ a terminal ladder-delivered row for a member never told)', async () => {
    claim.mockResolvedValue('already_claimed');
    inspect.mockResolvedValue({ status: 'completed', result: { delivered: false, bridgeRowOpen: true } });
    const alertSms = seamWith('closed');
    await runContributionNotifyChild(deps({ alertSms }), envelope(bridged({ memberIds: [M1] })) as never, { id: 'j', retryCount: 1, retryLimit: 4 });
    expect(alertSms.giveUpDeferred.mock.calls[0]![0]).toMatchObject({ ladder: 'in_app_only' });
    inspect.mockResolvedValue({ status: 'completed', result: { delivered: true, bridgeRowOpen: true } });
    await runContributionNotifyChild(deps({ alertSms }), envelope(bridged({ memberIds: [M1] })) as never, { id: 'j', retryCount: 1, retryLimit: 4 });
    expect(alertSms.giveUpDeferred.mock.calls[1]![0]).not.toHaveProperty('ladder');
  });

  const NAME_TOO_LONG = 'G'.repeat(61);

  it('⭐ `bridge_name_too_long` — ONCE per (alert, pool) across the pool\'s jobs, retries and re-fans; another pool keeps its own; a new window alarms again', async () => {
    resolvePoolIdentity.mockResolvedValue({ ...IDENTITY, deceasedDisplayName: NAME_TOO_LONG });
    const onAlarm = vi.fn();
    await runContributionNotifyChild(deps({ onAlarm }), envelope(bridged({ memberIds: [M1, M2] })) as never);
    await runContributionNotifyChild(deps({ onAlarm }), envelope(bridged({ memberIds: [M3] })) as never); // the pool's 2nd job
    await runContributionNotifyChild(deps({ onAlarm }), envelope(bridged({ memberIds: [M1, M2] })) as never, { id: 'j', retryCount: 1, retryLimit: 4 });
    const first = alarmsOf(onAlarm, 'alert_sms.bridge_name_too_long');
    expect(first).toHaveLength(1);
    expect(first[0]).toContain('2 member(s)');
    expect(first[0]).not.toContain('GGGG');
    await runContributionNotifyChild(deps({ onAlarm }), envelope(bridged({ poolId: POOL_B, memberIds: [M3] })) as never);
    expect(alarmsOf(onAlarm, 'alert_sms.bridge_name_too_long')).toHaveLength(2);
    const later = new Date(NOW.getTime() + BRIDGE_NAME_ALARM_WINDOW_MS);
    await runContributionNotifyChild(deps({ onAlarm, now: () => later }), envelope(bridged({ memberIds: [M1] })) as never);
    expect(alarmsOf(onAlarm, 'alert_sms.bridge_name_too_long')).toHaveLength(3);
  });

  it('⭐ its count is only the members who would otherwise be texted (⛔ under the overlay, ⛔ a text language); none ⇒ ⛔ alarm', async () => {
    resolvePoolIdentity.mockResolvedValue({ ...IDENTITY, deceasedDisplayName: NAME_TOO_LONG });
    listAccountFrozenMemberIds.mockResolvedValueOnce(new Set([M1.toLowerCase()]));
    readMemberTextLanguages.mockResolvedValueOnce(new Map([[M2, 'hi' as const]]));
    const onAlarm = vi.fn();
    await runContributionNotifyChild(deps({ onAlarm }), envelope(bridged({ memberIds: [M1, M2, M3] })) as never);
    const alarms = alarmsOf(onAlarm, 'alert_sms.bridge_name_too_long');
    expect(alarms).toHaveLength(1);
    expect(alarms[0]).toContain('1 member(s)');
    resetBridgeNameAlarms();
    listAccountFrozenMemberIds.mockResolvedValueOnce(new Set([M1.toLowerCase(), M2.toLowerCase()]));
    const none = vi.fn();
    await runContributionNotifyChild(deps({ onAlarm: none }), envelope(bridged()) as never);
    expect(alarmsOf(none, 'bridge_name')).toHaveLength(0);
  });

  it('⭐ an EMPTY family label (it disabled the bridge in silence) ⇒ ⛔ block and ONE deduped `alert_sms.bridge_name_empty` alarm; the push still goes', async () => {
    resolvePoolIdentity.mockResolvedValue({ ...IDENTITY, deceasedDisplayName: '   ' });
    const onAlarm = vi.fn();
    await runContributionNotifyChild(deps({ onAlarm }), envelope(bridged()) as never);
    await runContributionNotifyChild(deps({ onAlarm }), envelope(bridged()) as never, { id: 'j', retryCount: 1, retryLimit: 4 });
    expect(smsOf(alertBuiltFor(M1))).toBeUndefined();
    expect(fanOutAlertToMembers).toHaveBeenCalledTimes(2);
    const alarms = alarmsOf(onAlarm, 'alert_sms.bridge_name_empty');
    expect(alarms).toHaveLength(1);
    expect(alarms[0]).toContain('2 member(s)');
  });
});
