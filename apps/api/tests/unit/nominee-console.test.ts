// nominee-console handler wiring — DB-free unit test (Story 9.1, Task 5).
//
// Proves the handler COMPOSITION without a live DB/KMS harness (the pool-contributors.test.ts mocked-
// `@twt/domain` precedent): the validated-nominee gate → poolOpenAt resolution → the PURE staff-takeover
// derivation (kept ACTUAL — the config threshold flows into it) → the response shape + every fail-soft
// degrade to `{ isNominee:false }`. The derivation's own boundary/determinism vectors live in the domain
// suite; this proves the handler passes the right inputs and maps the verdict correctly.

import type { FastifyRequest } from 'fastify';
import { describe, expect, it, vi } from 'vitest';

import type { AppDeps } from '../../src/context.js';

const resolveActiveNomineePool = vi.fn();
const resolvePoolOpenAt = vi.fn();

vi.mock('@twt/domain', async (importActual) => {
  const actual = await importActual<typeof import('@twt/domain')>();
  return {
    ...actual,
    // Keep computeStaffTakeover + DEFAULT_STAFF_TAKEOVER_THRESHOLD_DAYS ACTUAL (the pure derivation under
    // real test); mock only the two DB-touching reads.
    nomineeConsole: { ...actual.nomineeConsole, resolveActiveNomineePool, resolvePoolOpenAt },
  };
});

const resolveCuratedPoolName = vi.fn();
vi.mock('../../src/modules/member-pool/pool-identity.js', () => ({ resolveCuratedPoolName }));

const openScopeTx = vi.fn();
const closeScopeTx = vi.fn();
vi.mock('../../src/modules/multi-tenant/scope-tx.js', () => ({ openScopeTx, closeScopeTx }));

const { createNomineeConsoleHandlers } = await import('../../src/modules/nominee-console/handlers.js');

const PARIWAR_ID = '11111111-1111-1111-1111-111111111111';
const MEMBER_ID = '22222222-2222-2222-2222-222222222222';
const POOL_ID = '44444444-4444-4444-4444-444444444444';

const NOW = new Date('2026-07-10T00:00:00.000Z');
const POOL_OPEN = new Date('2026-07-01T00:00:00.000Z'); // 9 days before NOW

/** A minimal PoolRow-shaped stub carrying only the fields the handler reads. */
function poolStub(overrides?: Record<string, unknown>) {
  return {
    poolId: POOL_ID,
    poolIndex: 5, // → letter code "F"
    poolCanonicalIdentifier: 'P-2026-07-001',
    ...overrides,
  };
}

function fakeDeps(thresholdDays: number): AppDeps {
  return {
    clock: () => NOW,
    config: { nomineeTakeoverThresholdDays: thresholdDays },
  } as unknown as AppDeps;
}

function fakeRequest(overrides?: { actorId?: string | null; pariwarId?: string | null }): FastifyRequest {
  return {
    requestContext: {
      traceId: 'trace-1',
      actorId: overrides?.actorId === undefined ? MEMBER_ID : overrides.actorId,
      pariwarId: overrides?.pariwarId === undefined ? PARIWAR_ID : overrides.pariwarId,
    },
    log: { warn: vi.fn(), error: vi.fn() },
  } as unknown as FastifyRequest;
}

function resetMocks() {
  vi.clearAllMocks();
  openScopeTx.mockResolvedValue({ tx: {}, client: {} });
  closeScopeTx.mockResolvedValue(undefined);
  resolveCuratedPoolName.mockResolvedValue(null);
}

describe('nomineeConsole handler — the validated-nominee gate + takeover verdict', () => {
  it('returns { isNominee:false } (self-suppress) when there is no active nominee pool', async () => {
    resetMocks();
    resolveActiveNomineePool.mockResolvedValue(null);

    const h = createNomineeConsoleHandlers(fakeDeps(7));
    const res = await h.nomineeConsole(fakeRequest());
    expect(res).toEqual({ isNominee: false });
    // The gate short-circuited BEFORE resolving poolOpenAt.
    expect(resolvePoolOpenAt).not.toHaveBeenCalled();
  });

  it('returns the resolved console (takeover NOT eligible at 9 days, threshold 30)', async () => {
    resetMocks();
    resolveActiveNomineePool.mockResolvedValue({ pool: poolStub(), poolCount: 3, liveCount: 1 });
    resolvePoolOpenAt.mockResolvedValue(POOL_OPEN);

    const h = createNomineeConsoleHandlers(fakeDeps(30));
    const res = await h.nomineeConsole(fakeRequest());
    expect(res).toMatchObject({
      isNominee: true,
      pool: { letterCode: 'F', name: null, canonicalIdentifier: 'P-2026-07-001' },
      takeover: { eligible: false, daysSinceEngagement: 9 },
      poolOpenAtIso: '2026-07-01T00:00:00.000Z',
      lastUpdatedIso: '2026-07-10T00:00:00.000Z',
    });
  });

  it('flags takeover eligible at 9 days when the config threshold is 7 (config, not a literal)', async () => {
    resetMocks();
    resolveActiveNomineePool.mockResolvedValue({ pool: poolStub(), poolCount: 1, liveCount: 1 });
    resolvePoolOpenAt.mockResolvedValue(POOL_OPEN);

    const h = createNomineeConsoleHandlers(fakeDeps(7));
    const res = await h.nomineeConsole(fakeRequest());
    expect(res).toMatchObject({ isNominee: true, takeover: { eligible: true, daysSinceEngagement: 9 } });
  });

  it('passes the curated pool name through when the registry resolves one', async () => {
    resetMocks();
    resolveActiveNomineePool.mockResolvedValue({ pool: poolStub(), poolCount: 2, liveCount: 1 });
    resolvePoolOpenAt.mockResolvedValue(POOL_OPEN);
    resolveCuratedPoolName.mockResolvedValue('Yudhishthira');

    const h = createNomineeConsoleHandlers(fakeDeps(7));
    const res = await h.nomineeConsole(fakeRequest());
    expect(res).toMatchObject({ isNominee: true, pool: { name: 'Yudhishthira' } });
  });

  it('fail-soft to { isNominee:false } when a live pool has no pool-open event', async () => {
    resetMocks();
    resolveActiveNomineePool.mockResolvedValue({ pool: poolStub(), poolCount: 1, liveCount: 1 });
    resolvePoolOpenAt.mockResolvedValue(null);

    const h = createNomineeConsoleHandlers(fakeDeps(7));
    const res = await h.nomineeConsole(fakeRequest());
    expect(res).toEqual({ isNominee: false });
  });

  it('fail-soft to { isNominee:false } on any thrown error in the pipeline (never a 500)', async () => {
    resetMocks();
    resolveActiveNomineePool.mockRejectedValue(new Error('db exploded'));

    const h = createNomineeConsoleHandlers(fakeDeps(7));
    const res = await h.nomineeConsole(fakeRequest());
    expect(res).toEqual({ isNominee: false });
  });

  it('throws 401 (the only propagating error) when there is no member session', async () => {
    resetMocks();
    const h = createNomineeConsoleHandlers(fakeDeps(7));
    await expect(h.nomineeConsole(fakeRequest({ actorId: null }))).rejects.toThrow();
    // The tx never opened — auth is resolved before the scope tx.
    expect(openScopeTx).not.toHaveBeenCalled();
  });

  it('fail-soft to { isNominee:false } (never a 500) when openScopeTx itself throws (Review fix)', async () => {
    resetMocks();
    openScopeTx.mockRejectedValue(new Error('pool exhausted'));

    const h = createNomineeConsoleHandlers(fakeDeps(7));
    const res = await h.nomineeConsole(fakeRequest());
    expect(res).toEqual({ isNominee: false });
    // scopeTx was never assigned — closeScopeTx must not be called on it.
    expect(closeScopeTx).not.toHaveBeenCalled();
  });

  it('logs a warning (does not silently drop) when a nominee has more than one live pool (Review fix)', async () => {
    resetMocks();
    resolveActiveNomineePool.mockResolvedValue({ pool: poolStub(), poolCount: 1, liveCount: 2 });
    resolvePoolOpenAt.mockResolvedValue(POOL_OPEN);

    const h = createNomineeConsoleHandlers(fakeDeps(7));
    const request = fakeRequest();
    const res = await h.nomineeConsole(request);
    expect(res).toMatchObject({ isNominee: true });
    expect(request.log.warn).toHaveBeenCalledWith(
      expect.objectContaining({ liveCount: 2 }),
      expect.stringContaining('multiple live nominee pools'),
    );
  });
});
