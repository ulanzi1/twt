// contribution-history handler wiring — DB-free unit test (Story 8.6, Task 2).
//
// Four load-bearing checks, mocked `@twt/domain` (the pool-contributors.test.ts pattern — no live-DB/KMS
// harness for handler-wiring assertions):
//   1. Wiring: the handler builds one row per history entry, resolving each row's identity via the SHARED
//      resolver (deceased family name + letter code + curated name), passing the derived status through, and
//      summing `totalInr`.
//   2. Fail-soft OMIT: a row whose pool/claim/KYC is unresolvable is OMITTED (never a blank), not a 500.
//   3. Fail-soft EMPTY: a whole-read throw degrades to `{ rows: [], totalInr: 0 }` (the empty passbook).
//   4. Member-session gate: no actor → 401 (UnauthorizedError), resolved before any tx.
//   5. Card-identical identity (D6): the SAME pool renders the SAME family/letter/name in the My Pool card
//      and the passbook — the shared resolver is genuinely shared (a divergence would look like a bug).

import type { FastifyRequest } from 'fastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AppDeps } from '../../src/context.js';

const listMemberContributionHistory = vi.fn();
const listMemberMissedCycles = vi.fn();
const getPoolContributionContext = vi.fn();
const getCycleFreezeCommittedAt = vi.fn();
const reserveNames = vi.fn();
const getClaimCase = vi.fn();
const getMemberKycProfile = vi.fn();
// Card-path mocks (for the card-identical comparison test).
const getMemberStateAt = vi.fn();
const listLiveAlertsForPariwar = vi.fn();
const resolveAssignedPoolWithRosterForMember = vi.fn();
const resolveUpcomingFixedAmountChange = vi.fn();
const hasAttestedContribution = vi.fn();
const listConfirmedContributorsForPool = vi.fn();

vi.mock('@twt/domain', async (importActual) => {
  const actual = await importActual<typeof import('@twt/domain')>();
  return {
    ...actual,
    member: { ...actual.member, getMemberStateAt },
    alert: { ...actual.alert, listLiveAlertsForPariwar },
    pool: {
      ...actual.pool,
      getPoolContributionContext,
      getCycleFreezeCommittedAt,
      reserveNames,
      resolveAssignedPoolWithRosterForMember,
      resolveUpcomingFixedAmountChange,
    },
    contribution: {
      ...actual.contribution,
      listMemberContributionHistory,
      listMemberMissedCycles,
      hasAttestedContribution,
      listConfirmedContributorsForPool,
    },
    claim: { ...actual.claim, getClaimCase },
    kyc: { ...actual.kyc, getMemberKycProfile },
    // Story 8.8 (Task 1) relocated the shared pool-identity join into @twt/domain, where it reaches
    // its collaborators through domain-internal paths this barrel mock cannot intercept. The double
    // re-composes the join over the SAME mocked collaborators configured above, so check (5) below
    // (card-identical identity, D6) still compares two surfaces driven by ONE shared resolver.
    notifications: {
      ...actual.notifications,
      resolvePoolIdentity: (await import('./_pool-identity-fake.js')).createResolvePoolIdentityFake({
        getClaimCase,
        getMemberKycProfile,
        decryptKycField,
        reserveNames,
        poolLetterCode: actual.pool.poolLetterCode,
        splitFirstNameLastInitial: actual.kyc.splitFirstNameLastInitial,
      }),
    },
  };
});

const decryptKycField = vi.fn();
vi.mock('../../src/modules/kyc/kyc-crypto.js', () => ({ decryptKycField }));

const openScopeTx = vi.fn();
const closeScopeTx = vi.fn();
vi.mock('../../src/modules/multi-tenant/scope-tx.js', () => ({ openScopeTx, closeScopeTx }));

const { createMemberPoolHandlers } = await import('../../src/modules/member-pool/handlers.js');

const PARIWAR_ID = '11111111-1111-1111-1111-111111111111';
const MEMBER_ID = '22222222-2222-2222-2222-222222222222';
const CYCLE_ID = '33333333-3333-3333-3333-333333333333';
const POOL_ID = '44444444-4444-4444-4444-444444444444';
const POOL_ID_2 = '99999999-9999-9999-9999-999999999999';
const CLAIM_CASE_ID = '55555555-5555-5555-5555-555555555555';
const DECEASED_ID = '66666666-6666-6666-6666-666666666666';
const ALERT_ID = '77777777-7777-7777-7777-777777777777';

function fakeRequest(overrides?: { actorId?: string | undefined }): FastifyRequest {
  return {
    requestContext: {
      traceId: 'trace-1',
      actorId: overrides && 'actorId' in overrides ? overrides.actorId : MEMBER_ID,
      pariwarId: PARIWAR_ID,
    },
    log: { warn: vi.fn(), error: vi.fn() },
  } as unknown as FastifyRequest;
}

function baseDeps(): AppDeps {
  return { clock: () => new Date('2026-07-05T00:00:00.000Z'), encryption: {} } as unknown as AppDeps;
}

// Clear call history between tests (module-level mocks accumulate calls); each test re-sets its own
// implementations after this runs, so clearing (not resetting) is safe.
beforeEach(() => {
  vi.clearAllMocks();
  // Story 10.27: the DEFAULT for every pre-existing case is "no missed cycles", so those tests keep
  // asserting the attested passbook exactly as they did — and the missed-cycle section is ABSENT
  // (`[]`), never an empty state.
  listMemberMissedCycles.mockResolvedValue([]);
});

function wireScopeTx(): void {
  openScopeTx.mockResolvedValue({ client: {}, tx: {}, pariwarId: PARIWAR_ID, scopeSet: true });
  closeScopeTx.mockResolvedValue(undefined);
}

/** Standard identity wiring for POOL_ID: deceased "Rajesh Sharma", pool index 0 → "Pool A", no curated name. */
function wireStandardPoolIdentity(): void {
  getPoolContributionContext.mockImplementation(async (_tx: unknown, _p: unknown, poolId: string) => {
    if (poolId === POOL_ID || poolId === POOL_ID_2) {
      return {
        cycleId: CYCLE_ID,
        claimCaseId: CLAIM_CASE_ID,
        poolIndex: 0,
        poolCanonicalIdentifier: 'P-2026-06-001',
        fixedAmount: 500,
        poolCount: 1,
      };
    }
    return null;
  });
  getCycleFreezeCommittedAt.mockResolvedValue(new Date('2026-06-10T00:00:00.000Z'));
  getClaimCase.mockResolvedValue({ deceasedMemberId: DECEASED_ID });
  getMemberKycProfile.mockResolvedValue({ nameCiphertext: 'enc:v1:fake' });
  decryptKycField.mockResolvedValue('Rajesh Sharma');
  reserveNames.mockResolvedValue([]); // opted out → letter-code fallback
}

describe('contributionHistory — wiring (AC1/AC2/AC3)', () => {
  it('builds one row per attested contribution with the resolved identity, status, and running total', async () => {
    wireScopeTx();
    wireStandardPoolIdentity();
    listMemberContributionHistory.mockResolvedValue([
      { contributionId: 'evt-1', alertId: ALERT_ID, poolId: POOL_ID, attestedAt: new Date('2026-06-20T10:15:00.000Z'), utr: '123456789012', status: 'yellow' },
      { contributionId: 'evt-2', alertId: ALERT_ID, poolId: POOL_ID, attestedAt: new Date('2026-06-01T09:00:00.000Z'), utr: '123456789013', status: 'green' },
    ]);

    const handlers = createMemberPoolHandlers(baseDeps());
    const result = await handlers.contributionHistory(fakeRequest());

    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toEqual({
      contributionId: 'evt-1',
      date: '2026-06-20T10:15:00.000Z',
      deceasedFirstName: 'Rajesh',
      deceasedLastInitial: 'S',
      poolLetterCode: 'A',
      poolName: null,
      poolCanonicalIdentifier: 'P-2026-06-001',
      cycleRef: '2026-06',
      amountInr: 500,
      status: 'yellow',
      // Story 8.7 D3(a) flipped this from the 8.6 placeholder `false`: `noteAvailable` is a
      // RESOLVABILITY predicate (own contribution + resolvable pool identity), NOT a status one.
      noteAvailable: true,
    });
    expect(result.rows[1]?.status).toBe('green');
    expect(result.totalInr).toBe(1000);
    // D5 memoization: two rows on the same pool → ONE identity decrypt, ONE pool-context load.
    expect(decryptKycField).toHaveBeenCalledTimes(1);
    expect(getPoolContributionContext).toHaveBeenCalledTimes(1);
  });

  it('empty history → the dignified empty passbook `{ rows: [], totalInr: 0, missedCycles: [] }`', async () => {
    wireScopeTx();
    listMemberContributionHistory.mockResolvedValue([]);
    const handlers = createMemberPoolHandlers(baseDeps());
    const result = await handlers.contributionHistory(fakeRequest());
    expect(result).toEqual({ rows: [], totalInr: 0, missedCycles: [] });
  });

  it('fail-soft OMIT: a row whose pool/claim/KYC is unresolvable is dropped, others render, total excludes it', async () => {
    wireScopeTx();
    wireStandardPoolIdentity();
    // POOL_ID resolves; a second, unknown pool does NOT (getPoolContributionContext → null).
    const UNKNOWN_POOL = '88888888-8888-8888-8888-888888888888';
    listMemberContributionHistory.mockResolvedValue([
      { contributionId: 'evt-ok', alertId: ALERT_ID, poolId: POOL_ID, attestedAt: new Date('2026-06-20T10:15:00.000Z'), utr: '123456789012', status: 'yellow' },
      { contributionId: 'evt-bad', alertId: ALERT_ID, poolId: UNKNOWN_POOL, attestedAt: new Date('2026-06-19T10:15:00.000Z'), utr: '123456789013', status: 'yellow' },
    ]);

    const handlers = createMemberPoolHandlers(baseDeps());
    const result = await handlers.contributionHistory(fakeRequest());
    expect(result.rows.map((r) => r.contributionId)).toEqual(['evt-ok']);
    expect(result.totalInr).toBe(500); // the omitted row does NOT count
  });

  it('fail-soft EMPTY: a whole-read throw degrades to the empty passbook (never a 500)', async () => {
    wireScopeTx();
    listMemberContributionHistory.mockRejectedValue(new Error('db exploded'));
    const handlers = createMemberPoolHandlers(baseDeps());
    const result = await handlers.contributionHistory(fakeRequest());
    expect(result).toEqual({ rows: [], totalInr: 0, missedCycles: [] });
  });

  // ─── Story 10.27 — the missed-cycle collection (AC1/AC4/AC6; D1/D3/D5) ────────────────────────
  //
  // The load-bearing wiring checks. Each one guards a way the surface could be silently defeated
  // rather than loudly broken.

  it('resolves each missed cycle to { cycleId, cycleRef, poolLetterCode, poolCanonicalIdentifier }', async () => {
    wireScopeTx();
    wireStandardPoolIdentity();
    listMemberContributionHistory.mockResolvedValue([]);
    listMemberMissedCycles.mockResolvedValue([
      { cycleId: CYCLE_ID, poolId: POOL_ID, closedAt: new Date('2026-06-25T00:00:00.000Z') },
    ]);

    const handlers = createMemberPoolHandlers(baseDeps());
    const result = await handlers.contributionHistory(fakeRequest());

    expect(result.missedCycles).toEqual([
      {
        // ⛔ D4 — the cycle's UUID, under its own name. The freeze month rides `cycleRef` beside it.
        cycleId: CYCLE_ID,
        cycleRef: '2026-06',
        poolLetterCode: 'A',
        poolCanonicalIdentifier: 'P-2026-06-001',
      },
    ]);
  });

  it('⛔ D1 — the missed-cycle path decrypts NO deceased-family name (no person is paired with an absence)', () => {
    // Asserted as its own case because it is a DESIGN commitment, not an optimisation: naming a
    // bereaved family beside "no matched contribution recorded" is the reading D1 exists to prevent.
    // A future author who "helpfully" adds the family name to match the passbook row fails here.
    return (async () => {
      wireScopeTx();
      wireStandardPoolIdentity();
      listMemberContributionHistory.mockResolvedValue([]);
      listMemberMissedCycles.mockResolvedValue([
        { cycleId: CYCLE_ID, poolId: POOL_ID, closedAt: new Date('2026-06-25T00:00:00.000Z') },
      ]);

      const handlers = createMemberPoolHandlers(baseDeps());
      const result = await handlers.contributionHistory(fakeRequest());

      expect(result.missedCycles).toHaveLength(1);
      expect(decryptKycField).not.toHaveBeenCalled();
      expect(getClaimCase).not.toHaveBeenCalled();
      for (const entry of result.missedCycles) {
        expect(Object.keys(entry).sort()).toEqual([
          'cycleId',
          'cycleRef',
          'poolCanonicalIdentifier',
          'poolLetterCode',
        ]);
      }
    })();
  });

  it('⛔ AC4 — a member with ZERO attested rows but ≥1 missed cycle still gets the section', async () => {
    // THE PRIMARY POPULATION. The 8.6 handler returned the `HISTORY_EMPTY` constant the moment the
    // attested list was empty; under 10.27 that would have silently defeated the whole surface for
    // exactly the members it exists for.
    wireScopeTx();
    wireStandardPoolIdentity();
    listMemberContributionHistory.mockResolvedValue([]);
    listMemberMissedCycles.mockResolvedValue([
      { cycleId: CYCLE_ID, poolId: POOL_ID, closedAt: new Date('2026-06-25T00:00:00.000Z') },
    ]);

    const handlers = createMemberPoolHandlers(baseDeps());
    const result = await handlers.contributionHistory(fakeRequest());

    expect(result.rows).toEqual([]);
    expect(result.totalInr).toBe(0);
    expect(result.missedCycles).toHaveLength(1);
  });

  it('fail-soft ISOLATION: a missed-cycle read failure must NOT empty the attested passbook', async () => {
    wireScopeTx();
    wireStandardPoolIdentity();
    listMemberContributionHistory.mockResolvedValue([
      { contributionId: 'evt-1', alertId: ALERT_ID, poolId: POOL_ID, attestedAt: new Date('2026-06-20T10:15:00.000Z'), utr: '123456789012', status: 'yellow' },
    ]);
    listMemberMissedCycles.mockRejectedValue(new Error('missed-cycle read exploded'));

    const handlers = createMemberPoolHandlers(baseDeps());
    const result = await handlers.contributionHistory(fakeRequest());

    expect(result.rows).toHaveLength(1);
    expect(result.totalInr).toBe(500);
    // Degrades toward SILENCE — `[]` renders as an ABSENT section, never a partial or error state
    // the member would read as being about them.
    expect(result.missedCycles).toEqual([]);
  });

  it('[Review] fail-soft ISOLATION, the OTHER direction: an attested-history failure must NOT empty already-resolved missed cycles', async () => {
    // The mirror of the case above. Confirmed-by-review regression: the attested-history read has its
    // OWN fail-soft boundary now, so a throw here degrades to an empty passbook WITHOUT discarding the
    // missed-cycle section resolved moments earlier in the same call.
    wireScopeTx();
    wireStandardPoolIdentity();
    listMemberMissedCycles.mockResolvedValue([
      { cycleId: CYCLE_ID, poolId: POOL_ID, closedAt: new Date('2026-06-25T00:00:00.000Z') },
    ]);
    listMemberContributionHistory.mockRejectedValue(new Error('attested-history read exploded'));

    const handlers = createMemberPoolHandlers(baseDeps());
    const result = await handlers.contributionHistory(fakeRequest());

    expect(result.rows).toEqual([]);
    expect(result.totalInr).toBe(0);
    expect(result.missedCycles).toHaveLength(1);
  });

  it('fail-soft OMIT: a missed cycle whose pool context is unresolvable is dropped, others render', async () => {
    wireScopeTx();
    wireStandardPoolIdentity();
    const UNKNOWN_POOL = '88888888-8888-8888-8888-888888888888';
    listMemberContributionHistory.mockResolvedValue([]);
    listMemberMissedCycles.mockResolvedValue([
      { cycleId: CYCLE_ID, poolId: POOL_ID, closedAt: new Date('2026-06-25T00:00:00.000Z') },
      { cycleId: CYCLE_ID, poolId: UNKNOWN_POOL, closedAt: new Date('2026-05-25T00:00:00.000Z') },
    ]);

    const handlers = createMemberPoolHandlers(baseDeps());
    const result = await handlers.contributionHistory(fakeRequest());

    expect(result.missedCycles.map((m) => m.poolCanonicalIdentifier)).toEqual(['P-2026-06-001']);
  });

  it('falls back to the canonical identifier when the cycle freeze instant is unresolvable', async () => {
    // The member still has a reference they can read out to Madad — never a blank cycle label.
    wireScopeTx();
    wireStandardPoolIdentity();
    getCycleFreezeCommittedAt.mockResolvedValue(null);
    listMemberContributionHistory.mockResolvedValue([]);
    listMemberMissedCycles.mockResolvedValue([
      { cycleId: CYCLE_ID, poolId: POOL_ID, closedAt: new Date('2026-06-25T00:00:00.000Z') },
    ]);

    const handlers = createMemberPoolHandlers(baseDeps());
    const result = await handlers.contributionHistory(fakeRequest());

    expect(result.missedCycles[0]?.cycleRef).toBe('P-2026-06-001');
  });

  it('the unresolvable-freeze fallback is PER POOL — two pools in one cycle never share a reference', () => {
    // Pools in one cycle share a freeze month, so the resolved value is memoized by CYCLE. The
    // FALLBACK is not: it is derived from the POOL's canonical identifier, and caching it under the
    // cycle id would hand the second pool the first pool's reference — a wrong value on the one
    // field the member reads out to Madad.
    return (async () => {
      wireScopeTx();
      wireStandardPoolIdentity();
      getPoolContributionContext.mockImplementation(async (_tx: unknown, _p: unknown, poolId: string) => ({
        cycleId: CYCLE_ID,
        claimCaseId: CLAIM_CASE_ID,
        poolIndex: poolId === POOL_ID ? 0 : 1,
        poolCanonicalIdentifier: poolId === POOL_ID ? 'P-2026-06-001' : 'P-2026-06-002',
        fixedAmount: 500,
        poolCount: 2,
      }));
      getCycleFreezeCommittedAt.mockResolvedValue(null);
      listMemberContributionHistory.mockResolvedValue([]);
      listMemberMissedCycles.mockResolvedValue([
        { cycleId: CYCLE_ID, poolId: POOL_ID, closedAt: new Date('2026-06-25T00:00:00.000Z') },
        { cycleId: CYCLE_ID, poolId: POOL_ID_2, closedAt: new Date('2026-06-24T00:00:00.000Z') },
      ]);

      const handlers = createMemberPoolHandlers(baseDeps());
      const result = await handlers.contributionHistory(fakeRequest());

      expect(result.missedCycles.map((m) => m.cycleRef)).toEqual(['P-2026-06-001', 'P-2026-06-002']);
      expect(result.missedCycles.map((m) => m.poolLetterCode)).toEqual(['A', 'B']);
      // Still ONE freeze read for the shared cycle — the memo is doing its job.
      expect(getCycleFreezeCommittedAt).toHaveBeenCalledTimes(1);
    })();
  });

  it('reads missed cycles on the CALLER’S scope transaction at the injected clock (never its own tx)', async () => {
    wireScopeTx();
    wireStandardPoolIdentity();
    listMemberContributionHistory.mockResolvedValue([]);
    listMemberMissedCycles.mockResolvedValue([]);

    const handlers = createMemberPoolHandlers(baseDeps());
    await handlers.contributionHistory(fakeRequest());

    // ONE scope tx for the whole response — RLS is fail-closed on `app.pariwar_id`, and a second tx
    // would be a second scope to get wrong.
    expect(openScopeTx).toHaveBeenCalledTimes(1);
    const [, scope, at] = listMemberMissedCycles.mock.calls[0] as [unknown, { pariwarId: string; memberId: string }, Date];
    // Ownership is the AUTHENTICATED member, resolved from the session — never client-supplied.
    expect(scope).toEqual({ pariwarId: PARIWAR_ID, memberId: MEMBER_ID });
    expect(at.toISOString()).toBe('2026-07-05T00:00:00.000Z');
  });

  it('member-session gate: no actor → 401 (resolved before any tx opens)', async () => {
    wireScopeTx();
    const handlers = createMemberPoolHandlers(baseDeps());
    await expect(handlers.contributionHistory(fakeRequest({ actorId: undefined }))).rejects.toMatchObject({
      code: 'auth.session_required',
    });
    expect(openScopeTx).not.toHaveBeenCalled();
  });
});

describe('D6 — the passbook and the My Pool card render a pool IDENTICALLY (shared resolver)', () => {
  it('the SAME pool yields the SAME deceased family + letter code + curated name in both surfaces', async () => {
    wireScopeTx();
    wireStandardPoolIdentity();

    // History path.
    listMemberContributionHistory.mockResolvedValue([
      { contributionId: 'evt-1', alertId: ALERT_ID, poolId: POOL_ID, attestedAt: new Date('2026-06-20T10:15:00.000Z'), utr: '123456789012', status: 'yellow' },
    ]);
    const handlers = createMemberPoolHandlers(baseDeps());
    const history = await handlers.contributionHistory(fakeRequest());
    const historyRow = history.rows[0];
    if (!historyRow) throw new Error('expected a history row');

    // Card path — same pool identity feeds `resolveCard` via the assigned-live-pool resolution.
    getMemberStateAt.mockResolvedValue('active');
    listLiveAlertsForPariwar.mockResolvedValue([{ cycleId: CYCLE_ID, poolCount: 1, alertId: ALERT_ID }]);
    resolveAssignedPoolWithRosterForMember.mockResolvedValue({
      assigned: true,
      poolId: POOL_ID,
      claimCaseId: CLAIM_CASE_ID,
      poolIndex: 0,
      poolCanonicalIdentifier: 'P-2026-06-001',
      fixedAmount: 500,
      rosterSize: 48,
    });
    resolveUpcomingFixedAmountChange.mockResolvedValue(null);
    hasAttestedContribution.mockResolvedValue(false);
    // resolveCard now sources the confirmed-count meter from this read (Story 9.5 Task 1a); the D6
    // identity comparison does not depend on the count, so an empty confirmed list keeps the card assigned.
    listConfirmedContributorsForPool.mockResolvedValue([]);

    const card = await handlers.activeContribution(fakeRequest());
    if (!card.assigned) throw new Error('expected an assigned card');

    expect(card.deceasedFirstName).toBe(historyRow.deceasedFirstName);
    expect(card.deceasedLastInitial).toBe(historyRow.deceasedLastInitial);
    expect(card.poolLetterCode).toBe(historyRow.poolLetterCode);
    expect(card.poolName).toBe(historyRow.poolName);
    expect(card.poolCanonicalIdentifier).toBe(historyRow.poolCanonicalIdentifier);
    expect(card.fixedAmount).toBe(historyRow.amountInr);
  });
});

// ── Story 8.7 D3(a) — `noteAvailable` is a RESOLVABILITY predicate, with NO status term ────────────
//
// The specific mistake this ratification forecloses is conflating availability with status. Gating on
// `green` would ship 8.7 dark (green is unreachable until Epic 9's producer lands), so a yellow / red /
// grey row with resolvable identity gets `noteAvailable: true`, while an unresolvable row gets no row
// at all. Availability decides WHETHER a Note exists; `deriveContributionStatus` decides what it SAYS.

describe('Story 8.7 D3(a) — noteAvailable is resolvability, not status', () => {
  it('every one of the four statuses gets noteAvailable: true when its identity resolves', async () => {
    wireScopeTx();
    wireStandardPoolIdentity();
    listMemberContributionHistory.mockResolvedValue(
      (['yellow', 'green', 'red', 'grey'] as const).map((status, i) => ({
        contributionId: `evt-${status}`,
        alertId: ALERT_ID,
        poolId: POOL_ID,
        attestedAt: new Date(`2026-06-${10 + i}T10:15:00.000Z`),
        utr: '123456789012',
        status,
      })),
    );

    const handlers = createMemberPoolHandlers(baseDeps());
    const result = await handlers.contributionHistory(fakeRequest());

    expect(result.rows).toHaveLength(4);
    for (const row of result.rows) {
      expect(row.noteAvailable, `${row.status} row must be Note-generatable`).toBe(true);
    }
  });

  it('an UNRESOLVABLE row is omitted entirely — so no row ever carries noteAvailable for a Note that would 404', async () => {
    wireScopeTx();
    wireStandardPoolIdentity();
    const UNKNOWN_POOL = '88888888-8888-8888-8888-888888888888';
    listMemberContributionHistory.mockResolvedValue([
      { contributionId: 'evt-ok', alertId: ALERT_ID, poolId: POOL_ID, attestedAt: new Date('2026-06-20T10:15:00.000Z'), utr: '123456789012', status: 'green' },
      { contributionId: 'evt-bad', alertId: ALERT_ID, poolId: UNKNOWN_POOL, attestedAt: new Date('2026-06-19T10:15:00.000Z'), utr: '123456789013', status: 'green' },
    ]);

    const handlers = createMemberPoolHandlers(baseDeps());
    const result = await handlers.contributionHistory(fakeRequest());
    // Both rows are GREEN — the difference is purely resolvability, which is exactly the point.
    expect(result.rows.map((r) => r.contributionId)).toEqual(['evt-ok']);
    expect(result.rows[0]?.noteAvailable).toBe(true);
  });
});
