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
    contribution: { ...actual.contribution, listMemberContributionHistory, hasAttestedContribution },
    claim: { ...actual.claim, getClaimCase },
    kyc: { ...actual.kyc, getMemberKycProfile },
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
      noteAvailable: false,
    });
    expect(result.rows[1]?.status).toBe('green');
    expect(result.totalInr).toBe(1000);
    // D5 memoization: two rows on the same pool → ONE identity decrypt, ONE pool-context load.
    expect(decryptKycField).toHaveBeenCalledTimes(1);
    expect(getPoolContributionContext).toHaveBeenCalledTimes(1);
  });

  it('empty history → the dignified empty passbook `{ rows: [], totalInr: 0 }`', async () => {
    wireScopeTx();
    listMemberContributionHistory.mockResolvedValue([]);
    const handlers = createMemberPoolHandlers(baseDeps());
    const result = await handlers.contributionHistory(fakeRequest());
    expect(result).toEqual({ rows: [], totalInr: 0 });
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
    expect(result).toEqual({ rows: [], totalInr: 0 });
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
