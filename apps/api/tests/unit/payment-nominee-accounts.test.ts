// Story 9.9 — the donor-facing nominee-accounts read handler wiring (DB-free unit test).
//
// Proves the endpoint wiring without a live DB + KMS:
//   1. unassigned (no live pool) → the first-class { available:false, reason:'unassigned' } absence;
//   2. accounts_not_collected (live pool, [] accounts) → the other first-class absence;
//   3. the lit-up path: decrypts each account's Tier-1 holder/number/IFSC at the boundary, passes bankName
//      (Tier-3) through, computes vpaPresent from ciphertext PRESENCE (never decrypting the VPA), and returns
//      a STABLE list ordered by rank with NO priority field (EQUAL accounts);
//   4. a decrypt FAILURE degrades that ONE field to the distinct sentinel — never a 500;
//   5. myContribution:'attested' is carried (the already-attested routing shortcut);
//   6. the audit line carries the account COUNT only — NEVER the decrypted PII (AC6).
//
// Mirrors payment-contribution.test.ts's mocked-`@twt/domain` pattern.

import type { FastifyRequest } from 'fastify';
import { describe, expect, it, vi } from 'vitest';

import type { AppDeps } from '../../src/context.js';

const getMemberStateAt = vi.fn();
const listLiveAlertsForPariwar = vi.fn();
const getCycleFreezeCommittedAt = vi.fn();
const resolveAssignedPoolWithRosterForMember = vi.fn();
const getClaimNomineeBankAccountsCiphertext = vi.fn();
const deriveContributionReference = vi.fn();
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
    },
    claim: { ...actual.claim, getClaimNomineeBankAccountsCiphertext },
    contribution: { ...actual.contribution, hasAttestedContribution },
  };
});

const openScopeTx = vi.fn();
const closeScopeTx = vi.fn();
vi.mock('../../src/modules/multi-tenant/scope-tx.js', () => ({ openScopeTx, closeScopeTx }));

// The load-bearing decrypt call site — mocked so the handler's own wiring is under test (which ciphertext it
// passes, what it does with a decrypt failure). `decryptNomineeBankFieldSoft` is the fail-soft sentinel path.
const decryptNomineeBankField = vi.fn();
const decryptNomineeBankFieldSoft = vi.fn();
const NOMINEE_BANK_DECRYPT_FAILED_SENTINEL = '[unavailable — could not be shown]';
vi.mock('../../src/modules/claims/nominee-bank-crypto.js', () => ({
  decryptNomineeBankField,
  decryptNomineeBankFieldSoft,
  NOMINEE_BANK_DECRYPT_FAILED_SENTINEL,
}));

const { createPaymentHandlers } = await import('../../src/modules/payment/handlers.js');

const PARIWAR_ID = '11111111-1111-1111-1111-111111111111';
const MEMBER_ID = '22222222-2222-2222-2222-222222222222';
const CYCLE_ID = '33333333-3333-3333-3333-333333333333';
const ALERT_ID = '44444444-4444-4444-4444-444444444444';
const POOL_ID = '55555555-5555-5555-5555-555555555555';
const CLAIM_CASE_ID = '66666666-6666-6666-6666-666666666666';
const SERVER_TR = 'contrib-v1-serverderived';

function fakeRequest(): FastifyRequest {
  return {
    body: {},
    requestContext: { actorId: MEMBER_ID, pariwarId: PARIWAR_ID, traceId: 't' },
    log: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
  } as unknown as FastifyRequest;
}

function deps(overrides?: Partial<AppDeps>): AppDeps {
  return {
    clock: () => new Date('2026-07-21T00:00:00Z'),
    auditSink: { emit: vi.fn() },
    encryption: {},
    ...overrides,
  } as unknown as AppDeps;
}

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
  deriveContributionReference.mockReturnValue(SERVER_TR);
  hasAttestedContribution.mockResolvedValue(false);
}

function wireScopeTx(): void {
  openScopeTx.mockResolvedValue({ tx: {}, client: {}, pariwarId: PARIWAR_ID });
  closeScopeTx.mockResolvedValue(undefined);
}

function twoCipherRows() {
  return [
    {
      accountRank: 1,
      bankName: 'State Bank of India',
      accountHolderNameCiphertext: 'CT_HOLDER_1',
      accountNumberCiphertext: 'CT_NUM_1',
      ifscCiphertext: 'CT_IFSC_1',
      vpaCiphertext: null,
    },
    {
      accountRank: 2,
      bankName: 'ICICI Bank',
      accountHolderNameCiphertext: 'CT_HOLDER_2',
      accountNumberCiphertext: 'CT_NUM_2',
      ifscCiphertext: 'CT_IFSC_2',
      vpaCiphertext: 'CT_VPA_2',
    },
  ];
}

describe('nominee-accounts read — the absence branches (AC1)', () => {
  it('unassigned (no live pool) → { available:false, reason:unassigned, myContribution:none }', async () => {
    vi.clearAllMocks();
    wireScopeTx();
    getMemberStateAt.mockResolvedValue('active');
    listLiveAlertsForPariwar.mockResolvedValue([]);

    const h = createPaymentHandlers(deps());
    expect(await h.nomineeAccounts(fakeRequest())).toEqual({
      available: false,
      reason: 'unassigned',
      myContribution: 'none',
    });
    // No live pool ⇒ no accounts read, no decrypt.
    expect(getClaimNomineeBankAccountsCiphertext).not.toHaveBeenCalled();
    expect(decryptNomineeBankFieldSoft).not.toHaveBeenCalled();
  });

  it('live pool but no accounts collected → { available:false, reason:accounts_not_collected }', async () => {
    vi.clearAllMocks();
    wireScopeTx();
    wireAssignedLivePool();
    getClaimNomineeBankAccountsCiphertext.mockResolvedValue([]);

    const h = createPaymentHandlers(deps());
    expect(await h.nomineeAccounts(fakeRequest())).toEqual({
      available: false,
      reason: 'accounts_not_collected',
      myContribution: 'none',
    });
    expect(decryptNomineeBankFieldSoft).not.toHaveBeenCalled();
  });
});

describe('nominee-accounts read — the lit-up EQUAL list (AC1/AC6)', () => {
  it('decrypts each Tier-1 field, passes bankName through, computes vpaPresent from ciphertext presence, stable rank order, NO priority field', async () => {
    vi.clearAllMocks();
    wireScopeTx();
    wireAssignedLivePool();
    getClaimNomineeBankAccountsCiphertext.mockResolvedValue(twoCipherRows());
    // Decrypt returns a value keyed off the ciphertext token so we can assert the correct field mapping.
    decryptNomineeBankFieldSoft.mockImplementation((ct: string) => Promise.resolve(`PLAIN(${ct})`));

    const h = createPaymentHandlers(deps());
    const res = await h.nomineeAccounts(fakeRequest());

    expect(res).toEqual({
      available: true,
      myContribution: 'none',
      accounts: [
        {
          rank: 1,
          bankName: 'State Bank of India',
          accountHolderName: 'PLAIN(CT_HOLDER_1)',
          accountNumber: 'PLAIN(CT_NUM_1)',
          ifsc: 'PLAIN(CT_IFSC_1)',
          vpaPresent: false, // account #1 has no VPA ciphertext
        },
        {
          rank: 2,
          bankName: 'ICICI Bank',
          accountHolderName: 'PLAIN(CT_HOLDER_2)',
          accountNumber: 'PLAIN(CT_NUM_2)',
          ifsc: 'PLAIN(CT_IFSC_2)',
          vpaPresent: true, // account #2 HAS a VPA ciphertext
        },
      ],
    });
    // The VPA ciphertext is NEVER decrypted — vpaPresent is a presence check only (6 field decrypts, not 7).
    expect(decryptNomineeBankFieldSoft).toHaveBeenCalledTimes(6);
    const decryptedTokens = decryptNomineeBankFieldSoft.mock.calls.map((c) => c[0]);
    expect(decryptedTokens).not.toContain('CT_VPA_2');
    // No priority/primary field leaked onto any account.
    for (const acc of res.available ? res.accounts : []) {
      expect(acc).not.toHaveProperty('primary');
      expect(acc).not.toHaveProperty('vpa');
    }
  });

  it('one account → a single-entry list (no needless second choice)', async () => {
    vi.clearAllMocks();
    wireScopeTx();
    wireAssignedLivePool();
    getClaimNomineeBankAccountsCiphertext.mockResolvedValue([twoCipherRows()[0]]);
    decryptNomineeBankFieldSoft.mockImplementation((ct: string) => Promise.resolve(`PLAIN(${ct})`));

    const h = createPaymentHandlers(deps());
    const res = await h.nomineeAccounts(fakeRequest());
    expect(res.available).toBe(true);
    expect(res.available && res.accounts).toHaveLength(1);
  });

  it('a decrypt FAILURE degrades to the distinct sentinel (via decryptNomineeBankFieldSoft), never a 500', async () => {
    vi.clearAllMocks();
    wireScopeTx();
    wireAssignedLivePool();
    getClaimNomineeBankAccountsCiphertext.mockResolvedValue([twoCipherRows()[0]]);
    // The account-number field can't be decrypted → the soft helper returns its sentinel; the others resolve.
    decryptNomineeBankFieldSoft.mockImplementation((ct: string) =>
      Promise.resolve(ct === 'CT_NUM_1' ? '[unavailable — could not be shown]' : `PLAIN(${ct})`),
    );

    const h = createPaymentHandlers(deps());
    const res = await h.nomineeAccounts(fakeRequest());
    expect(res.available).toBe(true);
    expect(res.available && res.accounts[0]?.accountNumber).toBe('[unavailable — could not be shown]');
    // The other fields still decrypted fine — one bad field never fails the whole read.
    expect(res.available && res.accounts[0]?.accountHolderName).toBe('PLAIN(CT_HOLDER_1)');
  });

  it('an unexpected account_rank (not 1 or 2) is refused, not silently coerced to rank 1 (review finding)', async () => {
    vi.clearAllMocks();
    wireScopeTx();
    wireAssignedLivePool();
    getClaimNomineeBankAccountsCiphertext.mockResolvedValue([{ ...twoCipherRows()[0], accountRank: 3 }]);
    decryptNomineeBankFieldSoft.mockImplementation((ct: string) => Promise.resolve(`PLAIN(${ct})`));

    const h = createPaymentHandlers(deps());
    await expect(h.nomineeAccounts(fakeRequest())).rejects.toThrow(/account_rank/);
  });

  it('an empty bank_name degrades to the distinct sentinel rather than a blank label (review finding)', async () => {
    vi.clearAllMocks();
    wireScopeTx();
    wireAssignedLivePool();
    getClaimNomineeBankAccountsCiphertext.mockResolvedValue([{ ...twoCipherRows()[0], bankName: '' }]);
    decryptNomineeBankFieldSoft.mockImplementation((ct: string) => Promise.resolve(`PLAIN(${ct})`));

    const h = createPaymentHandlers(deps());
    const res = await h.nomineeAccounts(fakeRequest());
    expect(res.available && res.accounts[0]?.bankName).toBe(NOMINEE_BANK_DECRYPT_FAILED_SENTINEL);
  });

  it('carries myContribution:attested (the already-attested routing shortcut)', async () => {
    vi.clearAllMocks();
    wireScopeTx();
    wireAssignedLivePool();
    hasAttestedContribution.mockResolvedValue(true);
    getClaimNomineeBankAccountsCiphertext.mockResolvedValue([twoCipherRows()[0]]);
    decryptNomineeBankFieldSoft.mockImplementation((ct: string) => Promise.resolve(`PLAIN(${ct})`));

    const h = createPaymentHandlers(deps());
    const res = await h.nomineeAccounts(fakeRequest());
    expect(res.myContribution).toBe('attested');
  });

  it('AC6: audits the READ with the account COUNT only — never the decrypted PII', async () => {
    vi.clearAllMocks();
    wireScopeTx();
    wireAssignedLivePool();
    getClaimNomineeBankAccountsCiphertext.mockResolvedValue(twoCipherRows());
    decryptNomineeBankFieldSoft.mockImplementation((ct: string) => Promise.resolve(`PLAIN(${ct})`));
    const emit = vi.fn();

    const h = createPaymentHandlers(deps({ auditSink: { emit } } as unknown as Partial<AppDeps>));
    await h.nomineeAccounts(fakeRequest());

    expect(emit).toHaveBeenCalledTimes(1);
    const call = emit.mock.calls[0]![0] as { context?: Record<string, unknown> };
    expect(call.context).toEqual({ nominee_accounts: 2 });
    // No decrypted PII anywhere in the audit payload.
    const serialized = JSON.stringify(emit.mock.calls[0]![0]);
    expect(serialized).not.toContain('PLAIN(');
    expect(serialized).not.toContain('State Bank of India');
  });
});
