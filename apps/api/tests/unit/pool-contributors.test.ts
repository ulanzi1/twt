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
// Delegates to the REAL cleaner; a test overrides it with `mockImplementation` (and restores it) to force a throw.
const publicNameTokens = vi.fn();

vi.mock('@twt/domain', async (importActual) => {
  const actual = await importActual<typeof import('@twt/domain')>();
  return {
    ...actual,
    member: { ...actual.member, getMemberStateAt, getCurrentMemberStates, getCurrentMemberState },
    alert: { ...actual.alert, listLiveAlertsForPariwar },
    pool: { ...actual.pool, getCycleFreezeCommittedAt, resolveAssignedPoolWithRosterForMember, reserveNames },
    contribution: { ...actual.contribution, listConfirmedContributorsForPool },
    kyc: {
      ...actual.kyc,
      getMemberKycProfile,
      resolvePublicNamePresentationMode,
      publicNameTokens: publicNameTokens.mockImplementation(actual.kyc.publicNameTokens),
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
const CLAIM_CASE_ID = '55555555-5555-5555-5555-555555555555';
const CONFIRMED_MEMBER_OK = '66666666-6666-6666-6666-666666666666';
const CONFIRMED_MEMBER_UNRESOLVABLE = '77777777-7777-7777-7777-777777777777';

function fakeRequest(): FastifyRequest {
  return {
    requestContext: { traceId: 'trace-1', actorId: MEMBER_ID, pariwarId: PARIWAR_ID },
    log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
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

  // ⭐ Review 2026-09-19 — the resolver is INSIDE a per-row `try` (the public route's second-pass rule):
  // a throw on ONE pathological name is a fault of THAT name ⇒ its row is `{ name: null }`, the rest are
  // named, and the list is ⛔ never blanked to `{ assigned:false }` (that is an OUTAGE's outcome).
  it('a throw in the NAME RESOLVER is that row\'s `{ name: null }` — ⛔ never a whole-list `assigned:false`', async () => {
    resolvePublicNamePresentationMode.mockResolvedValue('full_name');
    listConfirmedContributorsForPool.mockResolvedValue([
      { memberId: CONFIRMED_MEMBER_OK },
      { memberId: CONFIRMED_MEMBER_UNRESOLVABLE },
    ]);
    // Deterministic per row (⛔ not call-order dependent — the decrypt runs under bounded concurrency):
    // the ciphertext identifies the member, the decrypt maps it to that member's stored name.
    getMemberKycProfile.mockReset();
    getMemberKycProfile.mockImplementation(async (_tx: unknown, _pariwarId: unknown, memberId: string) => ({
      nameCiphertext: `enc:${memberId}`,
    }));
    decryptKycField.mockReset();
    decryptKycField.mockImplementation(async (ciphertext: string) =>
      ciphertext === `enc:${CONFIRMED_MEMBER_OK}` ? 'Rajesh Sharma' : 'Pathological Name',
    );
    const actual = await vi.importActual<typeof import('@twt/domain')>('@twt/domain');
    publicNameTokens.mockImplementation((name: string) => {
      // The thrown MESSAGE echoes the decrypted name on purpose: a fault log that carried `err` (under ANY
      // key) would leak it, so the assertions below have teeth.
      if (name === 'Rajesh Sharma') throw new Error(`resolver bug on ${name}`);
      return actual.kyc.publicNameTokens(name);
    });
    const req = fakeRequest();
    const deps = { clock: () => new Date('2026-07-05T00:00:00.000Z'), encryption: {} } as unknown as AppDeps;
    let result;
    try {
      result = await createMemberPoolHandlers(deps).poolContributors(req);
    } finally {
      publicNameTokens.mockImplementation(actual.kyc.publicNameTokens); // never leak the throw to later tests
    }
    if (!result.assigned) throw new Error('expected an assigned result — a resolver fault is ⛔ not an outage');
    // Row 1's resolver threw ⇒ null. Row 2 goes through the real cleaner and is named — the fault stayed
    // per-row and the row order is intact.
    expect(result.confirmed).toEqual([{ name: null }, { name: 'Pathological Name' }]);
    expect(result.pending).toEqual({ count: 1, percentage: 33 });
    // The fault is logged by ACTION at `warn` — it IS a fault, unlike the lawful withheld arms, which are
    // COUNTED (one `info` line per request, below).
    const warnCalls = (req.log.warn as ReturnType<typeof vi.fn>).mock.calls;
    const faultCalls = warnCalls.filter((c) => String(c[1]).includes('name resolution failed'));
    expect(faultCalls).toHaveLength(1);
    // Review round 2: the fault log carries the error's NAME only — ⛔ never `err` (its message could echo
    // the decrypted stored name), and ⛔ never the name itself.
    const faultPayload = faultCalls[0]![0] as Record<string, unknown>;
    expect(faultPayload['errorName']).toBe('Error');
    // The payload's KEYS are pinned, so the error cannot be re-added under another key (round 3).
    expect(Object.keys(faultPayload).sort()).toEqual(['errorName', 'memberId']);
    // ⛔ The decrypted name appears in NO log call on this request (the thrown message echoes it).
    const allLogs = JSON.stringify([
      (req.log.info as ReturnType<typeof vi.fn>).mock.calls,
      warnCalls,
      (req.log.error as ReturnType<typeof vi.fn>).mock.calls,
    ]);
    expect(allLogs).not.toContain('Rajesh');
  });

  // ⭐ Review round 2 — the LAWFUL withheld arms are logged ONCE per request, as counts by cause, with ⛔ no
  // member id, at `info`; ⛔ never a per-row line (the logger defaults to `info`, every member polls every
  // 60 s, and a per-row line names an erased member each time). Faults stay a per-row `warn`. Reverting to
  // a per-row line (with OR without a member id, at `info` OR `warn`), or re-adding `memberId`, fails HERE.
  it('the lawful withheld arms log ONE `info` line of counts by cause — ⛔ no member id, ⛔ never per row', async () => {
    resolvePublicNamePresentationMode.mockResolvedValue('full_name');
    const M_NO_PROFILE = CONFIRMED_MEMBER_OK;
    const M_ERASED = CONFIRMED_MEMBER_UNRESOLVABLE;
    const M_EMPTY = '88888888-8888-8888-8888-888888888888';
    listConfirmedContributorsForPool.mockResolvedValue([
      { memberId: M_NO_PROFILE },
      { memberId: M_ERASED },
      { memberId: M_EMPTY },
    ]);
    const actual = await vi.importActual<typeof import('@twt/domain')>('@twt/domain');
    getMemberKycProfile.mockReset();
    getMemberKycProfile.mockImplementation(async (_tx: unknown, _pariwarId: unknown, memberId: string) =>
      memberId === M_NO_PROFILE ? null : { nameCiphertext: `enc:${memberId}` },
    );
    decryptKycField.mockReset();
    decryptKycField.mockImplementation(async (ciphertext: string) =>
      ciphertext === `enc:${M_ERASED}` ? actual.member.ANONYMIZED_SENTINEL : '\u200b\u2060\ufeff',
    );
    const req = fakeRequest();
    const deps = { clock: () => new Date('2026-07-05T00:00:00.000Z'), encryption: {} } as unknown as AppDeps;
    const result = await createMemberPoolHandlers(deps).poolContributors(req);
    if (!result.assigned) throw new Error('expected an assigned result');
    // Every cause is byte-identical on the wire and the rows are all KEPT, in order.
    expect(result.confirmed).toEqual([{ name: null }, { name: null }, { name: null }]);

    // Round 3: a message that concerns a withheld row, at ANY level. The counts line is the ONLY one allowed.
    const ABOUT_A_WITHHELD_ROW = /erasure|resolvable name|empty after|unnamed|withheld/i;
    const infoAbout = (req.log.info as ReturnType<typeof vi.fn>).mock.calls.filter((c) =>
      ABOUT_A_WITHHELD_ROW.test(String(c[1])),
    );
    expect(infoAbout).toHaveLength(1);
    expect(String(infoAbout[0]![1])).toContain('counts by cause');
    expect(infoAbout[0]![0]).toEqual({
      withheld: { noProfile: 1, erased: 1, emptyAfterNormalise: 1 },
      confirmedCount: 3,
    });
    // ⛔ A lawful arm is never a `warn` — at any wording.
    const warnAbout = (req.log.warn as ReturnType<typeof vi.fn>).mock.calls.filter((c) =>
      ABOUT_A_WITHHELD_ROW.test(String(c[1])),
    );
    expect(warnAbout).toHaveLength(0);
    // ⛔ No member id anywhere in ANY log call on this request.
    const everything = JSON.stringify([
      (req.log.info as ReturnType<typeof vi.fn>).mock.calls,
      (req.log.warn as ReturnType<typeof vi.fn>).mock.calls,
    ]);
    for (const id of [M_NO_PROFILE, M_ERASED, M_EMPTY]) expect(everything).not.toContain(id);
  });

  // ⭐ Round 3 — the `> 0` guard: a HEALTHY pool (every contributor named) logs no counts line at all.
  // Removing the guard would emit an all-zero line on every poll of every member.
  it('a pool with NO withheld row logs NO counts line', async () => {
    resolvePublicNamePresentationMode.mockResolvedValue('full_name');
    const M_A = CONFIRMED_MEMBER_OK;
    const M_B = CONFIRMED_MEMBER_UNRESOLVABLE;
    listConfirmedContributorsForPool.mockResolvedValue([{ memberId: M_A }, { memberId: M_B }]);
    getMemberKycProfile.mockReset();
    getMemberKycProfile.mockImplementation(async (_tx: unknown, _pariwarId: unknown, memberId: string) => ({
      nameCiphertext: `enc:${memberId}`,
    }));
    decryptKycField.mockReset();
    decryptKycField.mockImplementation(async (ciphertext: string) =>
      ciphertext === `enc:${M_A}` ? 'Rajesh Sharma' : 'Amit Verma',
    );
    const req = fakeRequest();
    const deps = { clock: () => new Date('2026-07-05T00:00:00.000Z'), encryption: {} } as unknown as AppDeps;
    const result = await createMemberPoolHandlers(deps).poolContributors(req);
    if (!result.assigned) throw new Error('expected an assigned result');
    expect(result.confirmed).toEqual([{ name: 'Rajesh Sharma' }, { name: 'Amit Verma' }]);
    const counts = (req.log.info as ReturnType<typeof vi.fn>).mock.calls.filter((c) =>
      String(c[1]).includes('counts by cause'),
    );
    expect(counts).toHaveLength(0);
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
