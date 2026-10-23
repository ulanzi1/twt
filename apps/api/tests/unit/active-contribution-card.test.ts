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

import { readFileSync } from 'node:fs';

import { ActiveContributionCardResponse } from '@twt/contracts';
import type { FastifyRequest } from 'fastify';
import { describe, expect, it, vi } from 'vitest';

import type { AppDeps } from '../../src/context.js';

const getMemberStateAt = vi.fn();
const listLiveAlertsForPariwar = vi.fn();
const getCycleFreezeCommittedAt = vi.fn();
const resolveAssignedPoolWithRosterForMember = vi.fn();
const reserveNames = vi.fn();
const resolveUpcomingFixedAmountChange = vi.fn();
// Story 8.15 — ⚠ MUST be mocked: the `...actual.pool` spread would otherwise run the REAL read against
// `tx: {}`, throw a TypeError, and the D8 fail-soft would turn every stage leg into a silent `null`.
const resolveFirstCycleUnderAmount = vi.fn();
// Review D1 — the amount IN FORCE at `now`; decides `next_cycle`. ⚠ Same trap as above: unmocked, the
// `...actual.pool` spread runs the REAL read against `tx: {}`, throws, and every stage leg passes as null.
const resolveEffectiveFixedAmountRow = vi.fn();
const deriveContributionReference = vi.fn();
const poolLetterCode = vi.fn();
const getClaimCase = vi.fn();
const getMemberKycProfile = vi.fn();
const resolvePublicNamePresentationMode = vi.fn().mockResolvedValue('full_name');
const hasAttestedContribution = vi.fn();
const listConfirmedContributorsForPool = vi.fn();
// Story 11b.10 — the drive's PUBLIC ADDRESS, read server-side (AC4). ⛔ Never client-derived.
const readPoolPublicToken = vi.fn();

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
      resolveFirstCycleUnderAmount,
      resolveEffectiveFixedAmountRow,
      deriveContributionReference,
      poolLetterCode,
      readPoolPublicToken,
    },
    claim: { ...actual.claim, getClaimCase },
    // Story 8.16 — the presentation-mode accessor is a real DB read; these suites drive a mocked `tx`,
    // so it is stubbed here. `full_name` is the RULED default an absent config row resolves to, which
    // is what the launch tenant has, so the suites exercise the shipping form.
    kyc: { ...actual.kyc, getMemberKycProfile, resolvePublicNamePresentationMode },
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
        resolveMemberFacingDeceasedName: actual.notifications.resolveMemberFacingDeceasedName,
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
  resolveFirstCycleUnderAmount.mockResolvedValue(false);
  // The amount in force at `now` equals the pool's snapshot: nothing has changed since it spawned.
  resolveEffectiveFixedAmountRow.mockResolvedValue({ fixedAmount: 310 });
  poolLetterCode.mockReturnValue('F');
  deriveContributionReference.mockReturnValue(DERIVED_TR);
  getClaimCase.mockResolvedValue({ deceasedMemberId: DECEASED_MEMBER_ID });
  getMemberKycProfile.mockResolvedValue({ nameCiphertext: 'ct' });
  decryptKycField.mockResolvedValue('Rajesh Sharma');
  // Default: no confirmed contributions yet (the pre-9.4 baseline). Individual tests override to prove
  // the meter now REFLECTS the live confirmed count rather than a hardcoded zero (Story 9.5 Task 1a).
  listConfirmedContributorsForPool.mockResolvedValue([]);
  // Story 11b.10 — a live pool ALWAYS has a public address (`NOT NULL`, backfilled by 0114).
  readPoolPublicToken.mockResolvedValue('OPAQUE-DRIVE-TOKEN-1');
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

  it('[Review] AC2b — reads the presentation mode ONCE PER REQUEST (`2026-09-02-181` cl.2)', async () => {
    vi.clearAllMocks();
    wireScopeTx();
    wireAssignedLivePoolWithName();
    hasAttestedContribution.mockResolvedValue(false);

    const h = createMemberPoolHandlers(deps());
    await h.activeContribution(fakeRequest());
    expect(resolvePublicNamePresentationMode).toHaveBeenCalledTimes(1);
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

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// ⭐⭐ STORY 11b.10 (AC4, D4) — THE DRIVE'S PUBLIC ADDRESS ON THE CARD'S RESPONSE
// ═══════════════════════════════════════════════════════════════════════════════════════════════
describe('activeContribution card — the Sahyog Vivran address (Story 11b.10, AC4)', () => {
  it('⭐ the SERVER-RETURNED token rides the response — ⛔ the client derives nothing', async () => {
    // ⭐ ONE new field on a query that already runs — that is the whole API change D4 costs. The
    // member app builds `/sahyog-vivran/[driveToken]` from THIS value and from ⛔ nothing else;
    // deriving an address from `poolId` or `poolCanonicalIdentifier` in the client would re-create
    // D2's guessability where nothing server-side could bound it.
    hasAttestedContribution.mockResolvedValue(false);
    const handlers = createMemberPoolHandlers(deps());
    const card = await handlers.activeContribution(fakeRequest());
    if (!card.assigned) throw new Error('expected an assigned card');
    expect(card.sahyogVivranToken).toBe('OPAQUE-DRIVE-TOKEN-1');
    // ⛔ AND IT IS NOT THE IDENTIFIER. A regression that shipped the canonical identifier under
    // this field name would still produce a "working" URL shape and would re-open the walk.
    expect(card.sahyogVivranToken).not.toBe(card.poolCanonicalIdentifier);
    expect(card.sahyogVivranToken).not.toBe(card.poolId);
  });

  it('⛔⛔ NO ADDRESS ⇒ the WHOLE card fail-softs to `{ assigned: false }` — LOCK-STEP (D4)', async () => {
    // ⭐⭐ THIS IS THE LOCK-STEP PROPERTY, ASSERTED RATHER THAN DOCUMENTED. The My Pool entry
    // self-suppresses on `!data.assigned`, so the ONLY way an entry can outlive its card — a DEAD
    // LINK on the member's home screen — is if the handler returned an assigned card without an
    // address. ⛔ It must not: `pools.public_token` is NOT NULL with every row backfilled (0114), so
    // a null here means the pool row is gone, which is the same class of unresolvable state the
    // `identity === null` arm already answers this way.
    readPoolPublicToken.mockResolvedValue(null);
    const handlers = createMemberPoolHandlers(deps());
    const card = await handlers.activeContribution(fakeRequest());
    expect(card.assigned).toBe(false);
    // ⛔ And it is a fail-soft, ⛔ never a 500: a transient read must not break the home screen.
    expect(Object.keys(card)).toEqual(['assigned']);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// ⭐ STORY 8.15 (AC1, AC7, D3, D8) — THE STAGED FIXED-AMOUNT TRANSITION
// ═══════════════════════════════════════════════════════════════════════════════════════════════
// Clock 2026-07-21T00:00Z (05:30 IST); the live pool committed 2026-07-15T00:00Z at ₹310.
describe('activeContribution card — the staged fixed-amount transition (Story 8.15)', () => {
  const COMMITTED_AT = new Date('2026-07-15T00:00:00Z');
  const ist = (local: string): Date => new Date(`${local}+05:30`);
  const row = (effectiveFrom: Date, fixedAmount = 400, changeType: 'standard' | 'emergency' = 'standard') => ({
    version: 2,
    fixedAmount,
    effectiveFrom,
    effectiveUntil: null,
    changeType,
  });

  async function card(): Promise<Record<string, unknown>> {
    const h = createMemberPoolHandlers(deps());
    const res = await h.activeContribution(fakeRequest());
    // The wire shape is the `.strict()` contract — a stray key in the explicit map would fail here.
    ActiveContributionCardResponse.parse(res);
    if (!res.assigned) throw new Error('expected an assigned card');
    return res as unknown as Record<string, unknown>;
  }

  function wire(): void {
    vi.clearAllMocks();
    wireScopeTx();
    wireAssignedLivePoolWithName();
    hasAttestedContribution.mockResolvedValue(false);
  }

  it('scheduled — ≥ 2 IST months away: the IST calendar date + the new amount', async () => {
    wire();
    resolveUpcomingFixedAmountChange.mockResolvedValue(row(ist('2026-10-05T00:00:00')));
    const c = await card();
    expect(c.amountTransition).toEqual({ stage: 'scheduled', effectiveOn: '2026-10-05', newAmount: 400 });
    expect(c.fixedAmount).toBe(310); // the ask stays the snapshot (8.2 D3), never the announced ₹400
  });

  it('next_month — the change falls in the next IST calendar month', async () => {
    wire();
    resolveUpcomingFixedAmountChange.mockResolvedValue(row(ist('2026-08-10T00:00:00')));
    const c = await card();
    expect(c.amountTransition).toEqual({ stage: 'next_month', effectiveOn: '2026-08-10', newAmount: 400 });
    expect(c.fixedAmount).toBe(310);
  });

  // The upcoming read is anchored at max(C, now) (Review round 2 RD1), so it never returns a row at or
  // before now — the mocks below return only what that read can return.
  it('next_cycle — the change took effect after this pool was committed (inside the live window)', async () => {
    wire();
    resolveEffectiveFixedAmountRow.mockResolvedValue(row(ist('2026-07-18T00:00:00')));
    const c = await card();
    expect(c.amountTransition).toEqual({ stage: 'next_cycle', newAmount: 400 });
    expect(c.fixedAmount).toBe(310);
  });

  // ── Review D1 (Option A): `next_cycle` names the amount IN FORCE at `now`, ⛔ not the nearest row ──
  it('D1: TWO changes inside the live window → the line names the LATER (in-force) amount, ⛔ not the nearest row', async () => {
    wire();
    // ₹400 from 07-17, ₹500 from 07-19 — both after C (07-15) and before now (07-21). The next cycle
    // will carry the ₹500 in force now.
    resolveEffectiveFixedAmountRow.mockResolvedValue(row(ist('2026-07-19T00:00:00'), 500));
    const c = await card();
    expect(c.amountTransition).toEqual({ stage: 'next_cycle', newAmount: 500 });
    expect(c.fixedAmount).toBe(310);
  });

  it('D1: a later change that REVERTS to the pool\'s own amount → nothing is announced', async () => {
    wire();
    // ₹400 from 07-17, back to ₹310 from 07-19: the next cycle is unchanged for this member.
    resolveEffectiveFixedAmountRow.mockResolvedValue(row(ist('2026-07-19T00:00:00'), 310));
    expect((await card()).amountTransition).toBeNull();
  });

  it('RD1: a reverted in-window change does NOT hide a real FUTURE change — it is announced dated', async () => {
    wire();
    // ₹400 from 07-17, back to ₹310 from 07-19, ₹700 from 08-10. The mock answers like the real LIMIT-1
    // read (excludeAmount 310): as of C (07-15) the nearest row is the past ₹400 one, which the selector
    // drops — hiding the ₹700; as of now (07-21) it is the ₹700 row. ⛔ Anchored at C, this leg is RED.
    resolveUpcomingFixedAmountChange.mockImplementation(async (_tx: unknown, _p: unknown, asOf: Date) =>
      asOf.getTime() < ist('2026-07-17T00:00:00').getTime()
        ? row(ist('2026-07-17T00:00:00'), 400)
        : row(ist('2026-08-10T00:00:00'), 700),
    );
    resolveEffectiveFixedAmountRow.mockResolvedValue(row(ist('2026-07-19T00:00:00'), 310));
    expect((await card()).amountTransition).toEqual({ stage: 'next_month', effectiveOn: '2026-08-10', newAmount: 700 });
  });

  it('D1: a BACKDATED emergency the as-of-C read cannot see → next_cycle from the in-force amount', async () => {
    wire();
    // Nothing is upcoming; an emergency effective BEFORE C is in force now.
    resolveUpcomingFixedAmountChange.mockResolvedValue(null);
    resolveEffectiveFixedAmountRow.mockResolvedValue(row(ist('2026-07-10T00:00:00'), 400, 'emergency'));
    expect((await card()).amountTransition).toEqual({ stage: 'next_cycle', newAmount: 400 });
  });

  it('RD1: BOTH reads are anchored at max(C, now) — `now` once the pool is committed', async () => {
    wire();
    await card();
    const NOW = new Date('2026-07-21T00:00:00Z');
    expect(resolveEffectiveFixedAmountRow).toHaveBeenCalledTimes(1);
    expect(resolveEffectiveFixedAmountRow).toHaveBeenCalledWith(expect.anything(), PARIWAR_ID, NOW);
    expect(resolveUpcomingFixedAmountChange).toHaveBeenCalledWith(expect.anything(), PARIWAR_ID, NOW, {
      excludeAmount: 310,
    });
  });

  it('RD1: an app clock BEHIND the DB commit anchors both reads at C — ⛔ never the previous row', async () => {
    wire();
    // The freeze commit (DB clock) is 5 s AFTER the request clock: reading at `now` could resolve the
    // row before the pool's own and announce the OLD amount "from the next cycle".
    const C_AHEAD = new Date('2026-07-21T00:00:05Z');
    getCycleFreezeCommittedAt.mockResolvedValue(C_AHEAD);
    await card();
    expect(resolveEffectiveFixedAmountRow).toHaveBeenCalledWith(expect.anything(), PARIWAR_ID, C_AHEAD);
    expect(resolveUpcomingFixedAmountChange).toHaveBeenCalledWith(expect.anything(), PARIWAR_ID, C_AHEAD, {
      excludeAmount: 310,
    });
  });

  // ── Review rounds 2–3 (RD2/RD3): a LATER live cycle the member is IN is their next cycle — the line names
  //    THAT pool's amount (iff it differs), never the in-force amount ──
  // ⚠ The LATER cycle id sorts AFTER CYCLE_ID ('3…' < '8…'), so the tie leg also exercises the D7 order.
  const LATER_CYCLE_ID = '88888888-8888-8888-8888-888888888888';
  const LATER_POOL_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  function wireTwoLiveCycles(opts: {
    readonly inEarlier: boolean;
    readonly inLater: boolean;
    readonly laterAmount?: number;
    readonly laterCommittedAt?: Date;
    readonly laterThrows?: boolean;
  }): void {
    listLiveAlertsForPariwar.mockResolvedValue([
      { alertId: ALERT_ID, cycleId: CYCLE_ID, poolCount: 1 },
      { alertId: '99999999-9999-9999-9999-999999999999', cycleId: LATER_CYCLE_ID, poolCount: 1 },
    ]);
    getCycleFreezeCommittedAt.mockImplementation(async (_tx: unknown, cycleId: string) =>
      cycleId === CYCLE_ID ? COMMITTED_AT : (opts.laterCommittedAt ?? new Date('2026-07-19T00:00:00Z')),
    );
    // A DISTINCT pool per cycle (and its own amount), so a leg can see WHICH pool the card chose.
    resolveAssignedPoolWithRosterForMember.mockImplementation(async (_tx: unknown, _p: unknown, cycleId: string) => {
      const isLater = cycleId !== CYCLE_ID;
      if (isLater && opts.laterThrows) throw new Error('binding integrity');
      if (!(isLater ? opts.inLater : opts.inEarlier)) return { assigned: false };
      return {
        assigned: true,
        poolId: isLater ? LATER_POOL_ID : POOL_ID,
        claimCaseId: CLAIM_CASE_ID,
        poolIndex: 0,
        poolCanonicalIdentifier: 'P-2026-07-042',
        fixedAmount: isLater ? (opts.laterAmount ?? 310) : 310,
        rosterSize: 48,
      };
    });
  }

  it('RD3: the member\'s next pool is at a NEW amount → "from the next cycle" names THAT amount', async () => {
    // ₹400 took effect, a cycle the member is NOT in may have committed at it, then their next pool (₹400).
    // The older card is the ONLY place left to tell them: the later card has no change, and the first-cycle
    // note counts other members' pools.
    wire();
    wireTwoLiveCycles({ inEarlier: true, inLater: true, laterAmount: 400 });
    resolveEffectiveFixedAmountRow.mockResolvedValue(row(ist('2026-07-17T00:00:00'), 400));
    const c = await card();
    expect(c.poolId).toBe(POOL_ID); // the SOONEST-CLOSING pool (D7) — the later one has a different id
    expect(c.amountTransition).toEqual({ stage: 'next_cycle', newAmount: 400 });
  });

  it('RD3: the next pool\'s amount wins over the in-force amount (a further change after it was committed)', async () => {
    wire();
    wireTwoLiveCycles({ inEarlier: true, inLater: true, laterAmount: 400 });
    resolveEffectiveFixedAmountRow.mockResolvedValue(row(ist('2026-07-20T00:00:00'), 500));
    expect((await card()).amountTransition).toEqual({ stage: 'next_cycle', newAmount: 400 });
    // The reverse: the change was reverted (in force = ₹310), but the next pool was committed at ₹400.
    wire();
    wireTwoLiveCycles({ inEarlier: true, inLater: true, laterAmount: 400 });
    expect((await card()).amountTransition).toEqual({ stage: 'next_cycle', newAmount: 400 });
  });

  it('RD2: the member\'s next pool is at THIS pool\'s amount → no "from the next cycle" (it would be false)', async () => {
    wire();
    wireTwoLiveCycles({ inEarlier: true, inLater: true });
    resolveEffectiveFixedAmountRow.mockResolvedValue(row(ist('2026-07-20T00:00:00'), 400));
    const c = await card();
    expect(c.poolId).toBe(POOL_ID);
    expect(c.amountTransition).toBeNull();
    // Control: the same in-force change with ONE live cycle IS announced.
    wire();
    resolveEffectiveFixedAmountRow.mockResolvedValue(row(ist('2026-07-20T00:00:00'), 400));
    expect((await card()).amountTransition).toEqual({ stage: 'next_cycle', newAmount: 400 });
  });

  it('RD2: a later live cycle the member is NOT in never counts — their next cycle is still to come', async () => {
    wire();
    wireTwoLiveCycles({ inEarlier: true, inLater: false, laterAmount: 999 });
    resolveEffectiveFixedAmountRow.mockResolvedValue(row(ist('2026-07-20T00:00:00'), 400));
    const c = await card();
    expect(c.poolId).toBe(POOL_ID);
    expect(c.amountTransition).toEqual({ stage: 'next_cycle', newAmount: 400 });
  });

  it('RD2: the member is only in the LATER cycle → that is the card, and nothing later changes its line', async () => {
    wire();
    wireTwoLiveCycles({ inEarlier: false, inLater: true });
    resolveEffectiveFixedAmountRow.mockResolvedValue(row(ist('2026-07-20T00:00:00'), 400));
    const c = await card();
    expect(c.poolId).toBe(LATER_POOL_ID);
    expect(c.amountTransition).toEqual({ stage: 'next_cycle', newAmount: 400 });
  });

  it('RD2: two cycles committed at the SAME instant → the one sorting after (cycle_id, D7) is the next one', async () => {
    wire();
    wireTwoLiveCycles({ inEarlier: true, inLater: true, laterCommittedAt: COMMITTED_AT });
    resolveEffectiveFixedAmountRow.mockResolvedValue(row(ist('2026-07-20T00:00:00'), 400));
    const c = await card();
    expect(c.poolId).toBe(POOL_ID);
    expect(c.amountTransition).toBeNull(); // the tied sibling holds ₹310 — the member's next cycle asks ₹310
  });

  it('RD2: with the next pool at this pool\'s amount, a future change is still announced dated', async () => {
    wire();
    wireTwoLiveCycles({ inEarlier: true, inLater: true });
    resolveEffectiveFixedAmountRow.mockResolvedValue(row(ist('2026-07-20T00:00:00'), 400));
    resolveUpcomingFixedAmountChange.mockResolvedValue(row(ist('2026-10-05T00:00:00'), 500));
    expect((await card()).amountTransition).toEqual({ stage: 'scheduled', effectiveOn: '2026-10-05', newAmount: 500 });
  });

  it('RD3: a later cycle whose binding THROWS drops only "from the next cycle" — a dated line stands, the card is intact', async () => {
    wire();
    wireTwoLiveCycles({ inEarlier: true, inLater: true, laterThrows: true });
    resolveEffectiveFixedAmountRow.mockResolvedValue(row(ist('2026-07-20T00:00:00'), 400));
    resolveUpcomingFixedAmountChange.mockResolvedValue(row(ist('2026-10-05T00:00:00'), 500));
    const h = createMemberPoolHandlers(deps());
    const req = fakeRequest();
    const res = await h.activeContribution(req);
    expect(res).toMatchObject({
      assigned: true,
      poolId: POOL_ID,
      amountTransition: { stage: 'scheduled', effectiveOn: '2026-10-05', newAmount: 500 },
    });
    expect(req.log.warn).toHaveBeenCalledWith(
      expect.objectContaining({ err: expect.any(Error), cycleId: LATER_CYCLE_ID }),
      expect.stringContaining('later cycle binding unresolved'),
    );
    // …and with nothing dated, no line at all — ⛔ never a guessed "from the next cycle".
    wire();
    wireTwoLiveCycles({ inEarlier: true, inLater: true, laterThrows: true });
    resolveEffectiveFixedAmountRow.mockResolvedValue(row(ist('2026-07-20T00:00:00'), 400));
    expect((await card()).amountTransition).toBeNull();
  });

  it('RD2/RD3: the later-cycle assignment is read only when a later live cycle exists', async () => {
    wire();
    resolveEffectiveFixedAmountRow.mockResolvedValue(row(ist('2026-07-20T00:00:00'), 400));
    await card(); // one live cycle → step (5) only
    expect(resolveAssignedPoolWithRosterForMember).toHaveBeenCalledTimes(1);
    wire();
    wireTwoLiveCycles({ inEarlier: true, inLater: true });
    await card(); // a later live cycle → its assignment is read (even with no change in force: RD3's reverse case)
    expect(resolveAssignedPoolWithRosterForMember).toHaveBeenCalledTimes(2);
    expect(resolveAssignedPoolWithRosterForMember).toHaveBeenLastCalledWith(
      expect.anything(),
      PARIWAR_ID,
      LATER_CYCLE_ID,
      MEMBER_ID,
    );
  });

  it('P3: the first-cycle read is SKIPPED whenever an upcoming stage already wins (D7) — and runs when none does', async () => {
    wire();
    resolveUpcomingFixedAmountChange.mockResolvedValue(row(ist('2026-10-05T00:00:00'))); // scheduled wins
    await card();
    expect(resolveFirstCycleUnderAmount).not.toHaveBeenCalled();

    wire();
    resolveEffectiveFixedAmountRow.mockResolvedValue(row(ist('2026-07-18T00:00:00'), 400)); // next_cycle wins
    await card();
    expect(resolveFirstCycleUnderAmount).not.toHaveBeenCalled();

    wire(); // nothing upcoming, nothing in force differs → the first-cycle read is needed
    await card();
    expect(resolveFirstCycleUnderAmount).toHaveBeenCalledTimes(1);
  });

  it('first_cycle — nothing upcoming and this pool is the first at the new amount', async () => {
    wire();
    resolveFirstCycleUnderAmount.mockResolvedValue(true);
    const c = await card();
    expect(c.amountTransition).toEqual({ stage: 'first_cycle' });
    expect(c.fixedAmount).toBe(310); // the amount renders unchanged — the snapshot (8.2 D3)
  });

  it('PQ1 = B: a future-dated EMERGENCY next month is dated (scheduled), ⛔ never next_month', async () => {
    wire();
    resolveUpcomingFixedAmountChange.mockResolvedValue(row(ist('2026-08-10T00:00:00'), 400, 'emergency'));
    expect((await card()).amountTransition).toEqual({ stage: 'scheduled', effectiveOn: '2026-08-10', newAmount: 400 });
  });

  it('null when nothing is upcoming and the pool is not a first cycle', async () => {
    wire();
    expect((await card()).amountTransition).toBeNull();
  });

  it('D6: upcoming is read once, excluding the pool\'s own amount; the first-cycle read keeps C (D5)', async () => {
    // D3's as-of-C anchor for `upcoming` is superseded by Review round 2 RD1 (max(C, now)) — pinned above.
    wire();
    await card();
    expect(resolveUpcomingFixedAmountChange).toHaveBeenCalledTimes(1);
    expect(resolveUpcomingFixedAmountChange).toHaveBeenCalledWith(expect.anything(), PARIWAR_ID, expect.any(Date), {
      excludeAmount: 310,
    });
    expect(resolveFirstCycleUnderAmount).toHaveBeenCalledWith(expect.anything(), PARIWAR_ID, {
      committedAt: COMMITTED_AT,
      poolFixedAmount: 310,
    });
  });

  it('D8: a throw in the transition reads → amountTransition null + a warn, ⛔ NOT { assigned: false }', async () => {
    wire();
    resolveFirstCycleUnderAmount.mockRejectedValue(new Error('boom'));
    const h = createMemberPoolHandlers(deps());
    const req = fakeRequest();
    const res = await h.activeContribution(req);
    expect(res).toMatchObject({ assigned: true, amountTransition: null, myContribution: 'none' });
    expect(req.log.warn).toHaveBeenCalledWith(
      expect.objectContaining({ err: expect.any(Error) }),
      expect.stringContaining('amount-transition'),
    );
  });

  it('D8: a throw in the IN-FORCE read (Review D1) → amountTransition null + a warn, ⛔ NOT { assigned: false }', async () => {
    wire();
    resolveEffectiveFixedAmountRow.mockRejectedValue(new Error('boom'));
    const h = createMemberPoolHandlers(deps());
    const req = fakeRequest();
    const res = await h.activeContribution(req);
    expect(res).toMatchObject({ assigned: true, amountTransition: null, myContribution: 'none' });
    expect(req.log.warn).toHaveBeenCalledWith(
      expect.objectContaining({ err: expect.any(Error) }),
      expect.stringContaining('amount-transition'),
    );
  });

  it('D8: the transition reads run LAST — after every other mocked read in the scope tx', async () => {
    // A SQL error aborts the scope tx; any read AFTER the transition reads would then fail with 25P02
    // and blank the whole card. This leg mocks `tx`, so it cannot prove the abort — it proves the ORDER
    // the abort-safety rests on. The self-verify read (unmocked here) is pinned by the source scan below.
    wire();
    await card();
    const firstTransitionRead = Math.min(
      resolveUpcomingFixedAmountChange.mock.invocationCallOrder[0]!,
      resolveEffectiveFixedAmountRow.mock.invocationCallOrder[0]!,
      resolveFirstCycleUnderAmount.mock.invocationCallOrder[0]!,
    );
    for (const earlier of [
      listConfirmedContributorsForPool,
      resolvePublicNamePresentationMode,
      readPoolPublicToken,
      hasAttestedContribution,
    ]) {
      expect(earlier.mock.invocationCallOrder[0]!).toBeLessThan(firstTransitionRead);
    }
  });

  it('D8 source scan: resolveAmountTransition is called after the self-verify read and is the last await before the return', () => {
    const src = readFileSync(new URL('../../src/modules/member-pool/handlers.ts', import.meta.url), 'utf8');
    const body = src.slice(src.indexOf('async function resolveCard('));
    const end = body.indexOf('\n}\n');
    const fn = body.slice(0, end);
    const selfVerify = fn.indexOf('resolveMemberSelfVerifyState(');
    const transition = fn.indexOf('await resolveAmountTransition(');
    const ret = fn.lastIndexOf('return {');
    expect(selfVerify).toBeGreaterThan(-1);
    expect(transition).toBeGreaterThan(selfVerify);
    expect(ret).toBeGreaterThan(transition);
    // No other `await` between the transition reads and the card's return.
    const between = fn.slice(transition + 'await resolveAmountTransition('.length, ret);
    expect(between).not.toMatch(/\bawait\b/);
  });
});
