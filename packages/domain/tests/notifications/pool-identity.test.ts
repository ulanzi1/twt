// The shared per-pool identity join — DB-free unit tests (Story 8.6 D6; RELOCATED by Story 8.8 Task 1).
//
// The join answers ONE question for four surfaces (the My Pool card, the Yogdaan Bahi passbook, the
// Contribution Note PDF, and now Story 8.8's cycle-open notification): which family does this pool
// support, and what is the pool called? A divergence between any two of them would read to a member as
// a forgery, so the join has exactly one implementation — and this is where that implementation is
// tested now that it lives in `@twt/domain`.
//
// What matters most here is the ABSENCE behaviour: the resolver reports "unresolvable" the same way to
// every caller (`null`), and each caller decides what absence means (the card omits, the Note 404s, the
// 8.8 fan-out skips the pool). A resolver that threw, or that returned a blank name, would take that
// decision away from them — so the fail-soft paths are asserted individually, not sampled.

import { beforeEach, describe, expect, it, vi } from 'vitest';

const getClaimCase = vi.fn();
vi.mock('../../src/claim/index.js', () => ({ getClaimCase }));

const getMemberKycProfile = vi.fn();
vi.mock('../../src/kyc/index.js', () => ({ getMemberKycProfile }));

const reserveNames = vi.fn();
const poolLetterCode = vi.fn();
class PoolNameListExhaustedError extends Error {}
vi.mock('../../src/pool/index.js', () => ({ reserveNames, poolLetterCode, PoolNameListExhaustedError }));

const decryptKycField = vi.fn();
vi.mock('../../src/encryption/member-fields.js', () => ({ decryptKycField }));

const { resolvePoolIdentity } = await import('../../src/notifications/pool-identity.js');
const { ids } = await import('../../src/index.js');

const PARIWAR = ids.pariwarId('11111111-1111-1111-1111-111111111111');
const CLAIM = ids.claimId('22222222-2222-2222-2222-222222222222');
const DECEASED = '33333333-3333-3333-3333-333333333333';
const DB = {} as never;
const ENC = {} as never;

const INPUT = {
  claimCaseId: CLAIM,
  poolIndex: 0,
  poolCanonicalIdentifier: 'TWT-BIH-2026-07-A',
  fixedAmount: 1100,
  poolCount: 3,
};

const silentLog = { warn: vi.fn(), error: vi.fn() };

function happyPath(): void {
  getClaimCase.mockResolvedValue({ deceasedMemberId: DECEASED });
  getMemberKycProfile.mockResolvedValue({ nameCiphertext: 'enc:v1:name' });
  decryptKycField.mockResolvedValue('रामेश्वर  प्रसाद');
  poolLetterCode.mockReturnValue('A');
  reserveNames.mockResolvedValue([{ displayNameHi: 'युधिष्ठिर' }, { displayNameHi: 'भीम' }]);
}

describe('resolvePoolIdentity — the resolved identity (D6)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    happyPath();
  });

  it('returns the PII-SHIELDED family name — first name + last INITIAL, never the surname', async () => {
    const identity = await resolvePoolIdentity(DB, ENC, PARIWAR, INPUT, silentLog);
    expect(identity).not.toBeNull();
    expect(identity!.deceasedFirstName).toBe('रामेश्वर');
    // ONE GRAPHEME, not one code point: `प्र` is a Devanagari conjunct (प + virama + र) that
    // `Intl.Segmenter` keeps together. Splitting it would render a broken half-letter as someone's
    // initial — which is exactly why the split uses Segmenter rather than `[...token][0]`.
    expect(identity!.deceasedLastInitial).toBe('प्र');
    // The full surname must never survive the join.
    expect(JSON.stringify(identity)).not.toContain('प्रसाद');
  });

  it('prefers the curated Mahabharata name for this pool INDEX, and echoes the snapshotted amount', async () => {
    const identity = await resolvePoolIdentity(DB, ENC, PARIWAR, { ...INPUT, poolIndex: 1 }, silentLog);
    expect(identity!.poolName).toBe('भीम');
    expect(identity!.fixedAmount).toBe(1100);
    expect(identity!.poolCanonicalIdentifier).toBe('TWT-BIH-2026-07-A');
  });

  it('decrypts under the pool-identity caller`s Pariwar scope, from the claim`s DECEASED member', async () => {
    await resolvePoolIdentity(DB, ENC, PARIWAR, INPUT, silentLog);
    expect(getMemberKycProfile).toHaveBeenCalledWith(DB, PARIWAR, DECEASED);
    expect(decryptKycField).toHaveBeenCalledWith('enc:v1:name', PARIWAR, ENC);
  });
});

describe('resolvePoolIdentity — absence is reported identically to every caller (fail-soft)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    happyPath();
  });

  it('no claim case → null', async () => {
    getClaimCase.mockResolvedValue(undefined);
    expect(await resolvePoolIdentity(DB, ENC, PARIWAR, INPUT, silentLog)).toBeNull();
  });

  it('no KYC profile → null', async () => {
    getMemberKycProfile.mockResolvedValue(null);
    expect(await resolvePoolIdentity(DB, ENC, PARIWAR, INPUT, silentLog)).toBeNull();
  });

  it('a KYC profile with no name ciphertext → null (never a blank name)', async () => {
    getMemberKycProfile.mockResolvedValue({ nameCiphertext: null });
    expect(await resolvePoolIdentity(DB, ENC, PARIWAR, INPUT, silentLog)).toBeNull();
  });

  it('a DECRYPT FAILURE degrades to null + a warn — it never propagates out', async () => {
    const log = { warn: vi.fn(), error: vi.fn() };
    decryptKycField.mockRejectedValue(new Error('KMS blip'));
    await expect(resolvePoolIdentity(DB, ENC, PARIWAR, INPUT, log)).resolves.toBeNull();
    expect(log.warn).toHaveBeenCalled();
  });

  it('a whitespace-only decrypted name → null (no undignified blank)', async () => {
    decryptKycField.mockResolvedValue('   ');
    expect(await resolvePoolIdentity(DB, ENC, PARIWAR, INPUT, silentLog)).toBeNull();
  });

  it('poolLetterCode throwing degrades to null + a logged error — it never propagates out', async () => {
    // Same fail-soft contract as the decrypt-failure case above: every unresolvable-input path here
    // must skip THIS pool, never crash the caller's whole batch.
    const log = { warn: vi.fn(), error: vi.fn() };
    poolLetterCode.mockImplementation(() => {
      throw new Error('PoolLetterCodeRangeError: poolIndex must be a non-negative integer');
    });
    await expect(resolvePoolIdentity(DB, ENC, PARIWAR, INPUT, log)).resolves.toBeNull();
    expect(log.error).toHaveBeenCalled();
  });
});

describe('resolveCuratedPoolName — the letter-code fallback never suppresses the surface', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    happyPath();
  });

  it('an OPTED-OUT Pariwar (empty registry) → poolName null, letter code still resolved', async () => {
    reserveNames.mockResolvedValue([]);
    const identity = await resolvePoolIdentity(DB, ENC, PARIWAR, INPUT, silentLog);
    expect(identity!.poolName).toBeNull();
    expect(identity!.poolLetterCode).toBe('A');
  });

  it('a registry with fewer names than pools → null for the out-of-range index, not a crash', async () => {
    reserveNames.mockResolvedValue([{ displayNameHi: 'युधिष्ठिर' }]);
    const identity = await resolvePoolIdentity(DB, ENC, PARIWAR, { ...INPUT, poolIndex: 2 }, silentLog);
    expect(identity!.poolName).toBeNull();
  });

  it('an EXHAUSTED registry alarms as a config gap but still resolves the identity', async () => {
    const log = { warn: vi.fn(), error: vi.fn() };
    reserveNames.mockRejectedValue(new PoolNameListExhaustedError('exhausted'));
    const identity = await resolvePoolIdentity(DB, ENC, PARIWAR, INPUT, log);
    expect(identity).not.toBeNull();
    expect(identity!.poolName).toBeNull();
    expect(log.error).toHaveBeenCalled(); // loud: a trustee must extend the curated list
    expect(log.warn).not.toHaveBeenCalled();
  });

  it('any OTHER registry read error warns and falls back — it never sinks the identity', async () => {
    const log = { warn: vi.fn(), error: vi.fn() };
    reserveNames.mockRejectedValue(new Error('transient read error'));
    const identity = await resolvePoolIdentity(DB, ENC, PARIWAR, INPUT, log);
    expect(identity!.poolName).toBeNull();
    expect(log.warn).toHaveBeenCalled();
  });
});
