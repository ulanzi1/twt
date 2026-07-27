// active-contribution card handler wiring — DB-free unit test (Story 8.4 review gap-closure).
//
// Review finding: `hasAttestedContribution`'s ONLY call site until this diff was `resolveCard`
// (`member-pool/handlers.ts:390`, wiring the card's `myContribution` field, AC4) — and it had ZERO
// test coverage anywhere in the repo. The story's own Debug Log References claimed
// `active-contribution-read.spec.ts` covered this "real path," but that file only exercises
// `alert`/`pool` domain reads and never imports the `contribution` namespace or calls `resolveCard`.
// This closes that gap directly: mirrors `pool-contributors.test.ts`'s mocked-`@twt/domain` pattern
// (the sibling handler in the same module) rather than standing up a live-DB + KMS harness for a
// single handler-wiring assertion.

import type { FastifyRequest } from 'fastify';
import { describe, expect, it, vi } from 'vitest';

import type { AppDeps } from '../../src/context.js';

const getMemberStateAt = vi.fn();
const listLiveAlertsForPariwar = vi.fn();
const getCycleFreezeCommittedAt = vi.fn();
const resolveAssignedPoolWithRosterForMember = vi.fn();
const reserveNames = vi.fn();
const resolveUpcomingFixedAmountChange = vi.fn();
const deriveContributionReference = vi.fn();
const poolLetterCode = vi.fn();
const getClaimCase = vi.fn();
const getMemberKycProfile = vi.fn();
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
      getCycleFreezeCommittedAt,
      resolveAssignedPoolWithRosterForMember,
      reserveNames,
      resolveUpcomingFixedAmountChange,
      deriveContributionReference,
      poolLetterCode,
    },
    claim: { ...actual.claim, getClaimCase },
    kyc: { ...actual.kyc, getMemberKycProfile },
    contribution: { ...actual.contribution, hasAttestedContribution, listConfirmedContributorsForPool },
    // Story 8.8 (Task 1) relocated the shared pool-identity join into @twt/domain, where it reaches
    // its collaborators through domain-internal paths this barrel mock cannot intercept. The double
    // re-composes the join over the SAME mocked collaborators configured above, so every assertion
    // below keeps its original meaning. See tests/unit/_pool-identity-fake.ts.
    notifications: {
      ...actual.notifications,
      resolvePoolIdentity: (await import('./_pool-identity-fake.js')).createResolvePoolIdentityFake({
        getClaimCase,
        getMemberKycProfile,
        decryptKycField,
        reserveNames,
        poolLetterCode,
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
const ALERT_ID = '44444444-4444-4444-4444-444444444444';
const POOL_ID = '55555555-5555-5555-5555-555555555555';
const CLAIM_CASE_ID = '66666666-6666-6666-6666-666666666666';
const DECEASED_MEMBER_ID = '77777777-7777-7777-7777-777777777777';
const DERIVED_TR = 'contrib-v1-derived';

function fakeRequest(): FastifyRequest {
  return {
    requestContext: { actorId: MEMBER_ID, pariwarId: PARIWAR_ID, traceId: 't' },
    log: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
  } as unknown as FastifyRequest;
}

function deps(): AppDeps {
  return {
    clock: () => new Date('2026-07-21T00:00:00Z'),
    auditSink: { emit: vi.fn() },
    encryption: {},
  } as unknown as AppDeps;
}

function wireAssignedLivePoolWithName(): void {
  getMemberStateAt.mockResolvedValue('active');
  listLiveAlertsForPariwar.mockResolvedValue([{ alertId: ALERT_ID, cycleId: CYCLE_ID, poolCount: 1 }]);
  getCycleFreezeCommittedAt.mockResolvedValue(new Date('2026-07-15T00:00:00Z'));
  resolveAssignedPoolWithRosterForMember.mockResolvedValue({
    assigned: true,
    poolId: POOL_ID,
    claimCaseId: CLAIM_CASE_ID,
    poolIndex: 0,
    poolCanonicalIdentifier: 'P-2026-07-042',
    fixedAmount: 310,
    rosterSize: 48,
  });
  reserveNames.mockResolvedValue([]); // opted out of curated names → letter-code fallback
  resolveUpcomingFixedAmountChange.mockResolvedValue(null);
  poolLetterCode.mockReturnValue('F');
  deriveContributionReference.mockReturnValue(DERIVED_TR);
  getClaimCase.mockResolvedValue({ deceasedMemberId: DECEASED_MEMBER_ID });
  getMemberKycProfile.mockResolvedValue({ nameCiphertext: 'ct' });
  decryptKycField.mockResolvedValue('Rajesh Sharma');
  // Default: no confirmed contributions yet (the pre-9.4 baseline). Individual tests override to prove
  // the meter now REFLECTS the live confirmed count rather than a hardcoded zero (Story 9.5 Task 1a).
  listConfirmedContributorsForPool.mockResolvedValue([]);
}

function wireScopeTx(): void {
  openScopeTx.mockResolvedValue({ tx: {}, client: {}, pariwarId: PARIWAR_ID });
  closeScopeTx.mockResolvedValue(undefined);
}

describe('activeContribution card — myContribution wiring from hasAttestedContribution (AC4, review finding)', () => {
  it('myContribution: none when the member has NOT self-attested for this cycle', async () => {
    vi.clearAllMocks();
    wireScopeTx();
    wireAssignedLivePoolWithName();
    hasAttestedContribution.mockResolvedValue(false);

    const h = createMemberPoolHandlers(deps());
    const res = await h.activeContribution(fakeRequest());
    expect(res).toMatchObject({ assigned: true, myContribution: 'none' });
    expect(hasAttestedContribution).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ pariwarId: PARIWAR_ID, alertId: ALERT_ID, tr: DERIVED_TR }),
    );
  });

  it('myContribution: attested when the member HAS self-attested — the yellow-pill state (AC4)', async () => {
    vi.clearAllMocks();
    wireScopeTx();
    wireAssignedLivePoolWithName();
    hasAttestedContribution.mockResolvedValue(true);

    const h = createMemberPoolHandlers(deps());
    const res = await h.activeContribution(fakeRequest());
    expect(res).toMatchObject({ assigned: true, myContribution: 'attested' });
  });

  it('the confirmed-only meter REFLECTS the live confirmed count — wired to listConfirmedContributorsForPool (Story 9.5 Task 1a)', async () => {
    // The pre-9.5 bug: resolveCard hardcoded `confirmedCount: 0` and never called the confirmed read, so
    // the home-screen meter read "0 of N" forever even as contributions confirmed. Mock a NON-EMPTY
    // confirmed list and assert the meter reflects it — a hardcoded zero can no longer pass.
    vi.clearAllMocks();
    wireScopeTx();
    wireAssignedLivePoolWithName();
    hasAttestedContribution.mockResolvedValue(true);
    listConfirmedContributorsForPool.mockResolvedValue([
      { memberId: MEMBER_ID },
      { memberId: DECEASED_MEMBER_ID },
      { memberId: '88888888-8888-8888-8888-888888888888' },
    ]);

    const h = createMemberPoolHandlers(deps());
    const res = await h.activeContribution(fakeRequest());
    expect(res).toMatchObject({ progress: { confirmedCount: 3, rosterSize: 48 } });
    // It sourced the count from the confirmed read (confirmed-only + reversal backing-out), scoped to the pool.
    expect(listConfirmedContributorsForPool).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ pariwarId: PARIWAR_ID, cycleId: CYCLE_ID, poolId: POOL_ID }),
    );
  });

  it('the meter is a HONEST zero when nothing is confirmed yet — and yellow never pollutes it (regression)', async () => {
    vi.clearAllMocks();
    wireScopeTx();
    wireAssignedLivePoolWithName();
    hasAttestedContribution.mockResolvedValue(true); // the member self-attested (yellow)…
    listConfirmedContributorsForPool.mockResolvedValue([]); // …but nothing is confirmed → meter stays 0.

    const h = createMemberPoolHandlers(deps());
    const res = await h.activeContribution(fakeRequest());
    expect(res).toMatchObject({ progress: { confirmedCount: 0, rosterSize: 48 } });
  });
});
