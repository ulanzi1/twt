// pool-contributors handler wiring — DB-free unit test (Story 8.3 code review gap-closure).
//
// The load-bearing invariant this closes: `computePendingAggregate` MUST be called with
// `confirmed.length` (the CONFIRMED-SET size — the truth) and NOT `rows.length` (the count of
// rows that survived KYC decrypt). A confirmed contributor whose KYC name is unresolvable is
// omitted from the visible `confirmed` rows but must still count toward `confirmedCount`, so the
// pending aggregate never overstates "not yet confirmed" for someone who genuinely IS confirmed.
// This wiring can't be proven by the pure `computePendingAggregate` unit tests (read.test.ts)
// alone — those only prove the math given numbers; this proves `resolveContributorList` PASSES
// the right number. Mirrors the `dpdpa-consent-record-atomicity.test.ts` mocked-`@twt/domain`
// pattern rather than standing up a live-DB + KMS harness for a single handler-wiring assertion.

import type { FastifyRequest } from 'fastify';
import { describe, expect, it, vi } from 'vitest';

import type { AppDeps } from '../../src/context.js';

const getMemberStateAt = vi.fn();
const getCurrentMemberStates = vi.fn();
const getCurrentMemberState = vi.fn();
const listLiveAlertsForPariwar = vi.fn();
const getCycleFreezeCommittedAt = vi.fn();
const resolveAssignedPoolWithRosterForMember = vi.fn();
const reserveNames = vi.fn();
const listConfirmedContributorsForPool = vi.fn();
const getMemberKycProfile = vi.fn();

vi.mock('@twt/domain', async (importActual) => {
  const actual = await importActual<typeof import('@twt/domain')>();
  return {
    ...actual,
    member: { ...actual.member, getMemberStateAt, getCurrentMemberStates, getCurrentMemberState },
    alert: { ...actual.alert, listLiveAlertsForPariwar },
    pool: { ...actual.pool, getCycleFreezeCommittedAt, resolveAssignedPoolWithRosterForMember, reserveNames },
    contribution: { ...actual.contribution, listConfirmedContributorsForPool },
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
const CLAIM_CASE_ID = '55555555-5555-5555-5555-555555555555';
const CONFIRMED_MEMBER_OK = '66666666-6666-6666-6666-666666666666';
const CONFIRMED_MEMBER_UNRESOLVABLE = '77777777-7777-7777-7777-777777777777';

function fakeRequest(): FastifyRequest {
  return {
    requestContext: { traceId: 'trace-1', actorId: MEMBER_ID, pariwarId: PARIWAR_ID },
    log: { warn: vi.fn(), error: vi.fn() },
  } as unknown as FastifyRequest;
}

describe('poolContributors — pending aggregate uses the CONFIRMED-SET size, not the visible-row count', () => {
  it('a confirmed contributor with an unresolvable KYC name is omitted from `confirmed` rows but still counted for `pending`', async () => {
    getMemberStateAt.mockResolvedValue('active');
    // Story 11b.2a: the handler batches contributor lifecycle state to decide whom to OMIT (AC1/AC2).
    // Neither contributor here is `anonymized`, so this case is unchanged by the RTBF fix — which is
    // the point: the three INTEGRITY skips still behave exactly as Story 8.3 shipped them.
    getCurrentMemberStates.mockImplementation(
      async (_tx: unknown, ids: readonly string[]) => new Map(ids.map((id) => [id, 'active'])),
    );
    // Review fix (TOCTOU re-check): the handler re-confirms each representable contributor's state
    // immediately before decrypt. Neither contributor here is `anonymized`, so this is a no-op for
    // this scenario's assertions.
    getCurrentMemberState.mockResolvedValue('active');
    listLiveAlertsForPariwar.mockResolvedValue([{ cycleId: CYCLE_ID, poolCount: 1 }]);
    getCycleFreezeCommittedAt.mockResolvedValue(new Date('2026-07-01T00:00:00.000Z'));
    resolveAssignedPoolWithRosterForMember.mockResolvedValue({
      assigned: true,
      poolId: POOL_ID,
      claimCaseId: CLAIM_CASE_ID,
      poolIndex: 0,
      poolCanonicalIdentifier: 'P-2026-07-001',
      fixedAmount: 500,
      rosterSize: 3,
    });
    // Two confirmed contributors — one whose KYC name resolves, one whose profile is unresolvable.
    listConfirmedContributorsForPool.mockResolvedValue([
      { memberId: CONFIRMED_MEMBER_OK },
      { memberId: CONFIRMED_MEMBER_UNRESOLVABLE },
    ]);
    getMemberKycProfile.mockImplementation(async (_tx: unknown, _pariwarId: unknown, memberId: string) => {
      if (memberId === CONFIRMED_MEMBER_OK) return { nameCiphertext: 'enc:v1:fake' };
      return { nameCiphertext: null }; // unresolvable
    });
    decryptKycField.mockResolvedValue('Rajesh Sharma');
    reserveNames.mockResolvedValue([]); // opted out — letter-code fallback

    const deps = { clock: () => new Date('2026-07-05T00:00:00.000Z'), encryption: {} } as unknown as AppDeps;
    openScopeTx.mockResolvedValue({ client: {}, tx: {}, pariwarId: PARIWAR_ID, scopeSet: true });
    closeScopeTx.mockResolvedValue(undefined);

    const handlers = createMemberPoolHandlers(deps);
    const result = await handlers.poolContributors(fakeRequest());

    if (!result.assigned) throw new Error('expected an assigned result');
    // Only the resolvable contributor is a visible row.
    expect(result.confirmed).toEqual([{ firstName: 'Rajesh', lastInitial: 'S' }]);
    // The load-bearing assertion: pending is `rosterSize(3) − confirmedCount(2)` = 1, NOT
    // `rosterSize(3) − visibleRows(1)` = 2. A regression that swaps `confirmed.length` for
    // `rows.length` in the handler would understate confirmation and must fail this test.
    expect(result.pending).toEqual({ count: 1, percentage: 33 });
  });
});
