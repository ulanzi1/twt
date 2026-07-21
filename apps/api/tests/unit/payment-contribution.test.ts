// Payment (UPI Intent + UTR attest) handler wiring — DB-free unit test (Story 8.4, Task 3/6).
//
// Proves the endpoint wiring without a live DB + KMS: (1) the intent path resolves absent VPA to the
// first-class `{ available: false, reason: 'vpa_not_collected' }` fail-soft (the shipped v1 state, D1);
// (2) the intent lights up (available:true, server-built URL + amount-lock + tr) when the VPA resolver
// returns a VPA — proving the seam is fully wired ahead of the substrate; (3) the attest path recomputes
// `tr` server-side, rejects a client tr-mismatch (R4), and records the yellow claim on a match. Mirrors the
// `pool-contributors.test.ts` mocked-`@twt/domain` pattern.

import type { FastifyRequest } from 'fastify';
import { describe, expect, it, vi } from 'vitest';

import type { AppDeps } from '../../src/context.js';

const getMemberStateAt = vi.fn();
const listLiveAlertsForPariwar = vi.fn();
const getCycleFreezeCommittedAt = vi.fn();
const resolveAssignedPoolWithRosterForMember = vi.fn();
const getClaimNomineeBankAccountsCiphertext = vi.fn();
const resolveNomineeVpa = vi.fn();
const buildContributionUpiUrl = vi.fn();
const deriveContributionReference = vi.fn();
const poolLetterCode = vi.fn();
const attestContributionUtr = vi.fn();
const hasAttestedContribution = vi.fn();

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
      deriveContributionReference,
      poolLetterCode,
    },
    claim: { ...actual.claim, getClaimNomineeBankAccountsCiphertext },
    contribution: {
      ...actual.contribution,
      resolveNomineeVpa,
      buildContributionUpiUrl,
      attestContributionUtr,
      hasAttestedContribution,
    },
  };
});

const openScopeTx = vi.fn();
const closeScopeTx = vi.fn();
vi.mock('../../src/modules/multi-tenant/scope-tx.js', () => ({ openScopeTx, closeScopeTx }));

// The Story 8.13 load-bearing decrypt-in-handler call site — mocked here (not left un-exercised, review
// finding) so the handler's own wiring (which ciphertext it passes, what it does with a decrypt failure)
// is actually under test, distinct from the domain-level `resolveNomineeVpa` unit coverage.
const decryptNomineeBankField = vi.fn();
vi.mock('../../src/modules/claims/nominee-bank-crypto.js', () => ({ decryptNomineeBankField }));

const { createPaymentHandlers } = await import('../../src/modules/payment/handlers.js');

const PARIWAR_ID = '11111111-1111-1111-1111-111111111111';
const MEMBER_ID = '22222222-2222-2222-2222-222222222222';
const CYCLE_ID = '33333333-3333-3333-3333-333333333333';
const ALERT_ID = '44444444-4444-4444-4444-444444444444';
const POOL_ID = '55555555-5555-5555-5555-555555555555';
const CLAIM_CASE_ID = '66666666-6666-6666-6666-666666666666';
const SERVER_TR = 'contrib-v1-serverderived';

function fakeRequest(body: unknown): FastifyRequest {
  return {
    body,
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

/** Wire the shared resolveMemberLivePool happy path (member active × one live alert × assigned pool). */
function wireAssignedLivePool(): void {
  getMemberStateAt.mockResolvedValue('active');
  listLiveAlertsForPariwar.mockResolvedValue([{ alertId: ALERT_ID, cycleId: CYCLE_ID, poolCount: 1 }]);
  getCycleFreezeCommittedAt.mockResolvedValue(new Date('2026-07-15T00:00:00Z'));
  resolveAssignedPoolWithRosterForMember.mockResolvedValue({
    assigned: true,
    poolId: POOL_ID,
    claimCaseId: CLAIM_CASE_ID,
    poolIndex: 5,
    poolCanonicalIdentifier: 'P-2026-07-042',
    fixedAmount: 310,
    rosterSize: 48,
  });
  poolLetterCode.mockReturnValue('F');
  deriveContributionReference.mockReturnValue(SERVER_TR);
  hasAttestedContribution.mockResolvedValue(false);
}

function wireScopeTx(): void {
  openScopeTx.mockResolvedValue({ tx: {}, client: {}, pariwarId: PARIWAR_ID });
  closeScopeTx.mockResolvedValue(undefined);
}

describe('payment intent — the nominee-VPA fail-soft + the lit-up path (AC1/AC2/D1)', () => {
  it('resolves absent VPA to the first-class { available:false, reason:vpa_not_collected } (shipped v1)', async () => {
    vi.clearAllMocks();
    wireScopeTx();
    wireAssignedLivePool();
    getClaimNomineeBankAccountsCiphertext.mockResolvedValue([{ accountRank: 1 }, { accountRank: 2 }]);
    resolveNomineeVpa.mockReturnValue({ available: false, reason: 'vpa_not_collected' });

    const h = createPaymentHandlers(deps());
    const res = await h.intent(fakeRequest({}));
    expect(res).toEqual({ available: false, reason: 'vpa_not_collected', myContribution: 'none' });
    expect(buildContributionUpiUrl).not.toHaveBeenCalled();
  });

  it('unassigned → { available:false, reason:unassigned, myContribution:none } (no live pool)', async () => {
    vi.clearAllMocks();
    wireScopeTx();
    getMemberStateAt.mockResolvedValue('active');
    listLiveAlertsForPariwar.mockResolvedValue([]); // no live alert ⇒ resolveMemberLivePool null

    const h = createPaymentHandlers(deps());
    expect(await h.intent(fakeRequest({}))).toEqual({
      available: false,
      reason: 'unassigned',
      myContribution: 'none',
    });
    // No alert to have attested against — the read is never even called.
    expect(hasAttestedContribution).not.toHaveBeenCalled();
  });

  it('lights up (available:true) when the VPA resolver returns a VPA — the seam is fully wired', async () => {
    vi.clearAllMocks();
    wireScopeTx();
    wireAssignedLivePool();
    getClaimNomineeBankAccountsCiphertext.mockResolvedValue([{ accountRank: 1 }]);
    // First call = the preferred account resolves; second call (the canSwitchAccount probe on the OTHER
    // account) is absent → canSwitchAccount:false (only one account carries a VPA).
    resolveNomineeVpa
      .mockReturnValueOnce({ available: true, vpa: 'nominee@okhdfc', account: 1 })
      .mockReturnValueOnce({ available: false, reason: 'account_not_found' });
    buildContributionUpiUrl.mockReturnValue('upi://pay?pa=nominee%40okhdfc&am=310&cu=INR&tn=Pool%20F&tr=' + SERVER_TR);

    const h = createPaymentHandlers(deps());
    const res = await h.intent(fakeRequest({}));
    expect(res).toEqual({
      available: true,
      upiUrl: 'upi://pay?pa=nominee%40okhdfc&am=310&cu=INR&tn=Pool%20F&tr=' + SERVER_TR,
      tr: SERVER_TR,
      amountInr: 310, // the amount-lock = the snapshotted fixed_amount
      vpa: 'nominee@okhdfc',
      account: 1,
      canSwitchAccount: false,
      myContribution: 'none',
    });
    // The amount was NOT client-named — it came from the pool snapshot (R4 / amount-lock).
    expect(buildContributionUpiUrl).toHaveBeenCalledWith(
      expect.objectContaining({ vpa: 'nominee@okhdfc', amountInr: 310, tr: SERVER_TR }),
    );
  });

  it('Story 8.13: canSwitchAccount is true when the OTHER account also resolves a VPA (FR-27 switch)', async () => {
    vi.clearAllMocks();
    wireScopeTx();
    wireAssignedLivePool();
    getClaimNomineeBankAccountsCiphertext.mockResolvedValue([{ accountRank: 1 }, { accountRank: 2 }]);
    // Preferred (#1) resolves; the switch-probe (#2) also resolves → canSwitchAccount:true.
    resolveNomineeVpa
      .mockReturnValueOnce({ available: true, vpa: 'nominee@okhdfc', account: 1 })
      .mockReturnValueOnce({ available: true, vpa: 'nominee2@okaxis', account: 2 });
    buildContributionUpiUrl.mockReturnValue('upi://pay?pa=x&am=310&cu=INR&tn=t&tr=' + SERVER_TR);

    const h = createPaymentHandlers(deps());
    const res = await h.intent(fakeRequest({}));
    expect(res).toMatchObject({ available: true, account: 1, canSwitchAccount: true });
    // The switch probe asked the OTHER account (rank 2).
    expect(resolveNomineeVpa).toHaveBeenLastCalledWith(
      expect.objectContaining({ preferredAccount: 2 }),
    );
  });

  it('Story 8.13 review finding — the handler actually DECRYPTS a stored vpaCiphertext and feeds the plaintext to resolveNomineeVpa (the load-bearing wiring, previously untested end-to-end)', async () => {
    vi.clearAllMocks();
    wireScopeTx();
    wireAssignedLivePool();
    getClaimNomineeBankAccountsCiphertext.mockResolvedValue([
      { accountRank: 1, vpaCiphertext: 'CIPHERTEXT_ACCOUNT_1' },
      { accountRank: 2, vpaCiphertext: null },
    ]);
    decryptNomineeBankField.mockResolvedValue('nominee@okhdfc');
    resolveNomineeVpa
      .mockReturnValueOnce({ available: true, vpa: 'nominee@okhdfc', account: 1 })
      .mockReturnValueOnce({ available: false, reason: 'vpa_not_collected' });
    buildContributionUpiUrl.mockReturnValue('upi://pay?pa=nominee%40okhdfc&am=310&cu=INR&tn=Pool%20F&tr=' + SERVER_TR);

    const h = createPaymentHandlers(deps());
    const res = await h.intent(fakeRequest({}));

    expect(res).toMatchObject({ available: true, vpa: 'nominee@okhdfc', canSwitchAccount: false });
    // The ciphertext row, the pariwarId, and the encryption deps — the exact args the handler must pass.
    expect(decryptNomineeBankField).toHaveBeenCalledWith('CIPHERTEXT_ACCOUNT_1', PARIWAR_ID, expect.anything());
    // Account #2 has NO ciphertext — decrypt is never called for it (the null short-circuit).
    expect(decryptNomineeBankField).toHaveBeenCalledTimes(1);
    // The resolver received the DECRYPTED plaintext, never the ciphertext or an `undefined` vpa.
    expect(resolveNomineeVpa).toHaveBeenCalledWith(
      expect.objectContaining({
        collectionAccounts: [
          expect.objectContaining({ accountRank: 1, vpa: 'nominee@okhdfc' }),
          expect.objectContaining({ accountRank: 2, vpa: null }),
        ],
      }),
    );
    // The augmented row never carries the LIVE ciphertext alongside the decrypted plaintext — it's zeroed
    // to null once decrypted, limiting this Tier-1 field's in-memory exposure window (review finding).
    const [{ collectionAccounts }] = resolveNomineeVpa.mock.calls[0] as [
      { collectionAccounts: Array<{ vpaCiphertext: unknown }> },
    ];
    for (const acc of collectionAccounts) {
      expect(acc.vpaCiphertext).toBeNull();
    }
  });

  it('Story 8.13 review finding — a VPA decrypt failure degrades that account to fail-soft vpa:null instead of 500ing the endpoint', async () => {
    vi.clearAllMocks();
    wireScopeTx();
    wireAssignedLivePool();
    getClaimNomineeBankAccountsCiphertext.mockResolvedValue([
      { accountRank: 1, vpaCiphertext: 'CORRUPT_CIPHERTEXT' },
      { accountRank: 2, vpaCiphertext: null },
    ]);
    decryptNomineeBankField.mockRejectedValue(new Error('KMS unavailable'));
    resolveNomineeVpa.mockReturnValue({ available: false, reason: 'vpa_not_collected' });

    const h = createPaymentHandlers(deps());
    const request = fakeRequest({});
    const res = await h.intent(request);

    // Fail-soft, never a thrown error / 500 — the endpoint's central guarantee.
    expect(res).toEqual({ available: false, reason: 'vpa_not_collected', myContribution: 'none' });
    expect(resolveNomineeVpa).toHaveBeenCalledWith(
      expect.objectContaining({
        collectionAccounts: expect.arrayContaining([expect.objectContaining({ accountRank: 1, vpa: null })]),
      }),
    );
    expect(request.log.error).toHaveBeenCalledWith(
      expect.objectContaining({ account_rank: 1 }),
      expect.stringContaining('decrypt failed'),
    );
  });

  it('review finding — myContribution:attested is carried even when the VPA fails to resolve (an out-of-band payer, 8.10)', async () => {
    vi.clearAllMocks();
    wireScopeTx();
    wireAssignedLivePool();
    hasAttestedContribution.mockResolvedValue(true);
    getClaimNomineeBankAccountsCiphertext.mockResolvedValue([{ accountRank: 1 }, { accountRank: 2 }]);
    resolveNomineeVpa.mockReturnValue({ available: false, reason: 'vpa_not_collected' });

    const h = createPaymentHandlers(deps());
    const res = await h.intent(fakeRequest({}));
    expect(res).toEqual({ available: false, reason: 'vpa_not_collected', myContribution: 'attested' });
    expect(hasAttestedContribution).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ pariwarId: PARIWAR_ID, alertId: ALERT_ID, tr: SERVER_TR }),
    );
  });

  it('review finding — myContribution:attested is carried on the available:true branch too', async () => {
    vi.clearAllMocks();
    wireScopeTx();
    wireAssignedLivePool();
    hasAttestedContribution.mockResolvedValue(true);
    getClaimNomineeBankAccountsCiphertext.mockResolvedValue([{ accountRank: 1 }]);
    resolveNomineeVpa
      .mockReturnValueOnce({ available: true, vpa: 'nominee@okhdfc', account: 1 })
      .mockReturnValueOnce({ available: false, reason: 'account_not_found' });
    buildContributionUpiUrl.mockReturnValue('upi://pay?pa=nominee%40okhdfc&am=310&cu=INR&tn=Pool%20F&tr=' + SERVER_TR);

    const h = createPaymentHandlers(deps());
    const res = await h.intent(fakeRequest({}));
    expect(res).toMatchObject({ available: true, myContribution: 'attested' });
  });
});

describe('payment attest — server-authoritative tr + the yellow claim (AC3/R4)', () => {
  it('records the yellow claim when the client tr matches the server-recomputed tr', async () => {
    vi.clearAllMocks();
    wireScopeTx();
    wireAssignedLivePool();
    attestContributionUtr.mockResolvedValue({ eventId: 'evt-1', idempotent: false, duplicateUtrAcrossMembers: false });

    const h = createPaymentHandlers(deps());
    const res = await h.attest(fakeRequest({ tr: SERVER_TR, utr: '123456789012' }));
    expect(res).toEqual({ myContribution: 'attested', tr: SERVER_TR, idempotent: false });
    expect(attestContributionUtr).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ tr: SERVER_TR, utr: '123456789012', alertId: ALERT_ID, poolId: POOL_ID }),
    );
  });

  it('R4: rejects a client tr that does not match the server-recomputed tr (never writes)', async () => {
    vi.clearAllMocks();
    wireScopeTx();
    wireAssignedLivePool();

    const h = createPaymentHandlers(deps());
    await expect(h.attest(fakeRequest({ tr: 'contrib-v1-TAMPERED', utr: '123456789012' }))).rejects.toMatchObject({
      code: 'contribution.tr_mismatch',
    });
    expect(attestContributionUtr).not.toHaveBeenCalled();
  });

  it('unassigned attest → typed 409 (contribution.unassigned), never a 500', async () => {
    vi.clearAllMocks();
    wireScopeTx();
    getMemberStateAt.mockResolvedValue('active');
    listLiveAlertsForPariwar.mockResolvedValue([]);

    const h = createPaymentHandlers(deps());
    await expect(h.attest(fakeRequest({ tr: SERVER_TR, utr: '123456789012' }))).rejects.toMatchObject({
      code: 'contribution.unassigned',
    });
  });

  it('review finding — a missing/empty body surfaces the typed 400 tr-mismatch, never an unguarded TypeError', async () => {
    vi.clearAllMocks();
    wireScopeTx();
    wireAssignedLivePool();

    const h = createPaymentHandlers(deps());
    // request.body is undefined (no Content-Type / empty POST) — the same null-fallback intent() already had.
    await expect(h.attest(fakeRequest(undefined))).rejects.toMatchObject({ code: 'contribution.tr_mismatch' });
    expect(attestContributionUtr).not.toHaveBeenCalled();
  });

  it('review finding — a cross-member duplicate UTR is recorded on the audit line, never rejected', async () => {
    vi.clearAllMocks();
    wireScopeTx();
    wireAssignedLivePool();
    attestContributionUtr.mockResolvedValue({ eventId: 'evt-1', idempotent: false, duplicateUtrAcrossMembers: true });
    const emit = vi.fn();

    const h = createPaymentHandlers({ ...deps(), auditSink: { emit } } as unknown as AppDeps);
    const res = await h.attest(fakeRequest({ tr: SERVER_TR, utr: '123456789012' }));

    // Non-blocking: the write still succeeds and returns the yellow-pill view.
    expect(res).toEqual({ myContribution: 'attested', tr: SERVER_TR, idempotent: false });
    // But the anomaly is visible in the audit trail.
    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'member_contribution.attested',
        context: expect.objectContaining({ duplicate_utr_across_members: true }),
      }),
    );
  });
});
