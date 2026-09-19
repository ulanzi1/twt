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
//
// ⚠ SUPERSEDED 2026-09-19 by Story 11b.21 / `-222` (`#decision-2026-09-19-224`): an unresolvable
// contributor is no longer OMITTED — the row is KEPT as `{ name: null }` in position. The pending
// invariant above is unchanged (`-169` cl.6); it now also proves the row count equals the confirmed set.

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
const resolvePublicNamePresentationMode = vi.fn();

vi.mock('@twt/domain', async (importActual) => {
  const actual = await importActual<typeof import('@twt/domain')>();
  return {
    ...actual,
    member: { ...actual.member, getMemberStateAt, getCurrentMemberStates, getCurrentMemberState },
    alert: { ...actual.alert, listLiveAlertsForPariwar },
    pool: { ...actual.pool, getCycleFreezeCommittedAt, resolveAssignedPoolWithRosterForMember, reserveNames },
    contribution: { ...actual.contribution, listConfirmedContributorsForPool },
    kyc: { ...actual.kyc, getMemberKycProfile, resolvePublicNamePresentationMode },
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
  // Was: "…is omitted from `confirmed` rows but still counted for `pending`" — inverted by `-222` cl.1
  // (Story 11b.21): the unresolvable row is KEPT as a placeholder, in position.
  it('a confirmed contributor with an unresolvable KYC name is KEPT as `{ name: null }` in position and still counted for `pending`', async () => {
    getMemberStateAt.mockResolvedValue('active');
    resolvePublicNamePresentationMode.mockResolvedValue('full_name');
    // Story 11b.21 (`-224` D7): the batched state read is GONE from this path. The stub stays wired
    // and is asserted UNUSED below, so a re-introduced pre-filter fails here.
    getCurrentMemberStates.mockImplementation(
      async (_tx: unknown, ids: readonly string[]) => new Map(ids.map((id) => [id, 'active'])),
    );
    // ⛔ The per-row `getCurrentMemberState` re-check was REMOVED by the second review pass — it was
    //    Trap 1's rejected construction (one full event-stream replay per row) AND it did not close
    //    the window it named. The stub stays wired but is asserted UNUSED below, so a silent
    //    re-introduction fails here rather than passing unnoticed on a constant 'active'.
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
    // Was: `[{ firstName: 'Rajesh', lastInitial: 'S' }]` — the shielded form, the unresolvable row
    // dropped. Now (`-224` D2/D3): the mode-resolved name (`full_name` ⇒ the full name) and the
    // unresolvable row KEPT, in producer order.
    expect(result.confirmed).toEqual([{ name: 'Rajesh Sharma' }, { name: null }]);
    // The load-bearing assertion: pending is `rosterSize(3) − confirmedCount(2)` = 1. A regression
    // that computes it from anything but `confirmed.length` must fail this test.
    expect(result.pending).toEqual({ count: 1, percentage: 33 });
    // The mode is read ONCE per request (`-181` cl.2), ⛔ never per row.
    expect(resolvePublicNamePresentationMode).toHaveBeenCalledTimes(1);

    // Was: `expect(getCurrentMemberStates).toHaveBeenCalledTimes(1)` (Story 11b.2a's ONE batched read).
    // Inverted by `-224` D7: ⛔ no lifecycle read on this path at all — erasure is caught at the
    // decrypted plaintext, so every withheld cause with a profile costs the same one decrypt.
    expect(getCurrentMemberStates).not.toHaveBeenCalled();
    expect(getCurrentMemberState).not.toHaveBeenCalled();
  });

  it('under `shielded_name` a mononym is SHOWN and a dirty name is cleaned to the public form (`-224` D3)', async () => {
    resolvePublicNamePresentationMode.mockResolvedValue('shielded_name');
    listConfirmedContributorsForPool.mockResolvedValue([
      { memberId: CONFIRMED_MEMBER_OK },
      { memberId: CONFIRMED_MEMBER_UNRESOLVABLE },
    ]);
    getMemberKycProfile.mockResolvedValue({ nameCiphertext: 'enc:v1:fake' });
    decryptKycField
      .mockResolvedValueOnce('Ravi')
      .mockResolvedValueOnce('Rajesh \u200bSharma');

    const deps = { clock: () => new Date('2026-07-05T00:00:00.000Z'), encryption: {} } as unknown as AppDeps;
    const result = await createMemberPoolHandlers(deps).poolContributors(fakeRequest());
    if (!result.assigned) throw new Error('expected an assigned result');
    expect(result.confirmed).toEqual([{ name: 'Ravi' }, { name: 'Rajesh S.' }]);
  });

  it('a KMS OUTAGE self-suppresses the list — ⛔ never N placeholders (`-224` D4)', async () => {
    resolvePublicNamePresentationMode.mockResolvedValue('full_name');
    getMemberKycProfile.mockResolvedValue({ nameCiphertext: 'enc:v1:fake' });
    const { KmsOutageError } = await import('../../src/modules/kyc/name-render.js');
    decryptKycField.mockReset();
    decryptKycField.mockResolvedValueOnce('Rajesh Sharma').mockRejectedValueOnce(new KmsOutageError(new Error('14')));
    const deps = { clock: () => new Date('2026-07-05T00:00:00.000Z'), encryption: {} } as unknown as AppDeps;
    const result = await createMemberPoolHandlers(deps).poolContributors(fakeRequest());
    expect(result).toEqual({ assigned: false });
  });

  it('a PROFILE-READ failure (status-less) self-suppresses the list — ⛔ never a null row (`-224` D4)', async () => {
    resolvePublicNamePresentationMode.mockResolvedValue('full_name');
    getMemberKycProfile.mockReset();
    getMemberKycProfile
      .mockResolvedValueOnce({ nameCiphertext: 'enc:v1:fake' })
      .mockRejectedValueOnce(new Error('Connection terminated unexpectedly'));
    decryptKycField.mockReset();
    decryptKycField.mockResolvedValue('Rajesh Sharma');
    const deps = { clock: () => new Date('2026-07-05T00:00:00.000Z'), encryption: {} } as unknown as AppDeps;
    const result = await createMemberPoolHandlers(deps).poolContributors(fakeRequest());
    expect(result).toEqual({ assigned: false });
  });
});
