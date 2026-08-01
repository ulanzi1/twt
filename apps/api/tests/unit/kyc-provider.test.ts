// DigiLocker provider — DB-free unit tests (Story 3.3a, Task 6).
//
// Covers the PURE provider cores: eAadhaar XMLDSig signature verification (good /
// tampered / wrong-cert / unsigned), the eAadhaar→KycProfile mapping + Aadhaar masking,
// the two-window staleness budget, the PKCE/OAuth client helpers + redirect allowlist,
// the transport error normalization (access_denied → user_consent_denied; non-2xx /
// timeout → provider_unavailable), the registry FR-58C swap seam, and the fixture
// provider. The full DB-backed flow is the integration spec (digilocker-provider.spec.ts).

import { createHash } from 'node:crypto';

import { KycError, KycProfile, KycProviderError } from '@twt/contracts';
import { featureFlags } from '@twt/domain';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  assertRedirectUriAllowed,
  buildAuthorizeUrl,
  codeChallengeS256,
  createHttpDigiLockerTransport,
  generateCodeVerifier,
  generateState,
  type DigiLockerProviderConfig,
} from '../../src/modules/kyc/providers/digilocker/client.js';
import { mapEaadhaarToKycProfile, maskAadhaar } from '../../src/modules/kyc/providers/digilocker/mapper.js';
import { verifyEaadhaarSignature } from '../../src/modules/kyc/providers/digilocker/signature.js';
import {
  CERT_STALENESS_HARD_LIMIT_MS,
  CERT_STALENESS_WITHIN_BUDGET_MS,
  evaluateCertStaleness,
} from '../../src/modules/kyc/providers/digilocker/staleness-policy.js';
import { createKycProviderRegistry } from '../../src/modules/kyc/provider-registry.js';
import { fixtureKycProvider } from '../../src/modules/kyc/providers/fixture.js';
import {
  TEST_ISSUER_CERT_PEM,
  WRONG_CERT_PEM,
  sampleEaadhaarXml,
  signedSampleEaadhaar,
} from '../fixtures/kyc/sign-eaadhaar.js';

const CONFIG: DigiLockerProviderConfig = {
  clientId: 'test-client',
  clientSecret: 'test-secret',
  authorizeUrl: 'https://api.digitallocker.gov.in/public/oauth2/1/authorize',
  tokenUrl: 'https://api.digitallocker.gov.in/public/oauth2/1/token',
  eaadhaarUrl: 'https://api.digitallocker.gov.in/public/oauth2/3/xml/eaadhaar',
  redirectUri: 'https://app.twt.local/kyc/callback',
  redirectUriAllowlist: ['https://app.twt.local/kyc/callback'],
  httpTimeoutMs: 50,
  transactionTtlMs: 15 * 60 * 1000,
};

// ── AC7: signature verification against the trusted cert ──────────────────────
describe('verifyEaadhaarSignature (AC7 — never silently accept)', () => {
  it('accepts a known-good signed eAadhaar verified against the issuer cert', () => {
    const signed = signedSampleEaadhaar();
    const result = verifyEaadhaarSignature(signed, TEST_ISSUER_CERT_PEM);
    expect(result.valid).toBe(true);
    // P3: doc is the pre-parsed Node so callers avoid re-parsing the same string.
    expect(result.doc).toBeDefined();
  });

  it('REJECTS a tampered payload (reference digest mismatch)', () => {
    const tampered = signedSampleEaadhaar().replace('Asha Devi', 'Mallory Doe');
    const res = verifyEaadhaarSignature(tampered, TEST_ISSUER_CERT_PEM);
    expect(res.valid).toBe(false);
  });

  it('REJECTS a valid signature verified against the WRONG cert (pinning)', () => {
    const signed = signedSampleEaadhaar();
    const res = verifyEaadhaarSignature(signed, WRONG_CERT_PEM);
    expect(res.valid).toBe(false);
    // The signed-info verify against the wrong key fails — xml-crypto may throw
    // (check_failed) or return false (signature_mismatch); both map to signature_invalid.
    expect(['check_failed', 'signature_mismatch']).toContain(res.reason);
  });

  it('REJECTS an unsigned eAadhaar XML (no Signature element)', () => {
    expect(verifyEaadhaarSignature(sampleEaadhaarXml(), TEST_ISSUER_CERT_PEM)).toEqual({
      valid: false,
      reason: 'no_signature',
    });
  });

  it('REJECTS unparseable input', () => {
    const res = verifyEaadhaarSignature('not xml at all <<<', TEST_ISSUER_CERT_PEM);
    expect(res.valid).toBe(false);
  });
});

// ── AC4: eAadhaar → KycProfile mapping + masking ──────────────────────────────
describe('mapEaadhaarToKycProfile (AC4)', () => {
  it('maps the demographic fields + masks the Aadhaar to last 4', () => {
    const profile = mapEaadhaarToKycProfile(sampleEaadhaarXml({ referenceId: '123456789012' }));
    expect(KycProfile.parse(profile)).toMatchObject({
      name: 'Asha Devi',
      dob: '1990-01-01',
      verificationStrength: 'aadhaar_kyc',
    });
    expect(profile.aadhaarMaskedId).toBe('XXXXXXXX9012');
    expect(profile.photoUrl.startsWith('data:image/jpeg;base64,')).toBe(true);
  });

  it('throws verification_failed when the XML carries no demographic name', () => {
    const noName = '<OfflinePaperlessKyc referenceId="1"><UidData><Poi dob="x"/></UidData></OfflinePaperlessKyc>';
    expect(() => mapEaadhaarToKycProfile(noName)).toThrow(KycProviderError);
  });

  it('throws verification_failed when the XML carries no date of birth (P7)', () => {
    const noDob = '<OfflinePaperlessKyc referenceId="1"><UidData><Poi name="Test User"/></UidData></OfflinePaperlessKyc>';
    expect(() => mapEaadhaarToKycProfile(noDob)).toThrowError(
      expect.objectContaining({ code: 'verification_failed' }),
    );
  });

  it('accepts a pre-parsed Node to avoid a second DOMParser round-trip (P3)', () => {
    const signed = signedSampleEaadhaar({ referenceId: '111122223333' });
    const sigResult = verifyEaadhaarSignature(signed, TEST_ISSUER_CERT_PEM);
    expect(sigResult.valid).toBe(true);
    // Pass the verified doc — should produce the same profile as passing the string.
    const fromNode = mapEaadhaarToKycProfile(sigResult.doc!);
    const fromString = mapEaadhaarToKycProfile(signed);
    expect(fromNode).toEqual(fromString);
  });

  it('maskAadhaar reveals only the last 4 digits', () => {
    expect(maskAadhaar('999988887777')).toBe('XXXXXXXX7777');
    expect(maskAadhaar('')).toBe('XXXX');
    // P4: a reference with 1–3 digits is masked to 'XXXX' (not XXXXXXXX<short>).
    expect(maskAadhaar('123')).toBe('XXXX');
  });
});

// ── AC7: two-window staleness budget ──────────────────────────────────────────
describe('evaluateCertStaleness (AC7 two-window budget — ADR-0026 values)', () => {
  const now = new Date('2026-06-25T00:00:00Z');
  const ago = (ms: number) => new Date(now.getTime() - ms);

  it('fresh within the within-budget window', () => {
    expect(evaluateCertStaleness(ago(0), now)).toBe('fresh');
    expect(evaluateCertStaleness(ago(CERT_STALENESS_WITHIN_BUDGET_MS), now)).toBe('fresh');
  });

  it('within-budget past the soft window but before the hard limit (trust + alarm)', () => {
    expect(evaluateCertStaleness(ago(CERT_STALENESS_WITHIN_BUDGET_MS + 1), now)).toBe('within-budget');
    expect(evaluateCertStaleness(ago(CERT_STALENESS_HARD_LIMIT_MS), now)).toBe('within-budget');
  });

  it('past-hard-limit → fail closed', () => {
    expect(evaluateCertStaleness(ago(CERT_STALENESS_HARD_LIMIT_MS + 1), now)).toBe('past-hard-limit');
  });

  it('treats a future fetched_at (clock skew) as fresh', () => {
    expect(evaluateCertStaleness(new Date(now.getTime() + 60_000), now)).toBe('fresh');
  });
});

// ── AC1/AC2: OAuth + PKCE client helpers ──────────────────────────────────────
describe('OAuth2 + PKCE client helpers (AC1/AC2 §2.8)', () => {
  it('codeChallengeS256 is the base64url SHA-256 of the verifier', () => {
    const verifier = 'a-known-verifier-value';
    const expected = createHash('sha256')
      .update(verifier)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    expect(codeChallengeS256(verifier)).toBe(expected);
  });

  it('generateCodeVerifier + generateState produce distinct base64url nonces', () => {
    expect(generateCodeVerifier()).not.toBe(generateCodeVerifier());
    expect(generateState()).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('buildAuthorizeUrl carries response_type, client_id, S256 challenge, state, redirect_uri', () => {
    const url = new URL(
      buildAuthorizeUrl(CONFIG, {
        state: 'st',
        codeChallenge: 'ch',
        redirectUri: CONFIG.redirectUri,
      }),
    );
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('client_id')).toBe('test-client');
    expect(url.searchParams.get('code_challenge')).toBe('ch');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('state')).toBe('st');
    expect(url.searchParams.get('redirect_uri')).toBe(CONFIG.redirectUri);
  });

  it('assertRedirectUriAllowed passes an allowlisted uri, rejects others (§2.8)', () => {
    expect(assertRedirectUriAllowed(CONFIG, CONFIG.redirectUri)).toBe(CONFIG.redirectUri);
    try {
      assertRedirectUriAllowed(CONFIG, 'https://evil.example/callback');
      throw new Error('expected throw');
    } catch (err) {
      expect(KycProviderError.is(err)).toBe(true);
      expect((err as KycProviderError).code).toBe('provider_unavailable');
    }
  });
});

// ── AC5: transport error normalization ────────────────────────────────────────
describe('HTTP transport error normalization (AC5)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('maps OAuth access_denied → user_consent_denied', async () => {
    vi.stubGlobal('fetch', async () => new Response(JSON.stringify({ error: 'access_denied' }), { status: 200 }));
    const transport = createHttpDigiLockerTransport(CONFIG);
    await expect(
      transport.exchangeCodeForToken({ code: 'c', codeVerifier: 'v', redirectUri: CONFIG.redirectUri }),
    ).rejects.toMatchObject({ code: 'user_consent_denied' });
  });

  it('maps a non-2xx token response → provider_unavailable', async () => {
    vi.stubGlobal('fetch', async () => new Response('{}', { status: 503 }));
    const transport = createHttpDigiLockerTransport(CONFIG);
    await expect(
      transport.exchangeCodeForToken({ code: 'c', codeVerifier: 'v', redirectUri: CONFIG.redirectUri }),
    ).rejects.toMatchObject({ code: 'provider_unavailable' });
  });

  it('maps an aborted (timed-out) request → provider_unavailable', async () => {
    vi.stubGlobal('fetch', (_url: string, init?: { signal?: AbortSignal }) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          const e = new Error('aborted');
          e.name = 'AbortError';
          reject(e);
        });
      });
    });
    const transport = createHttpDigiLockerTransport({ ...CONFIG, httpTimeoutMs: 10 });
    await expect(transport.fetchEaadhaarXml({ accessToken: 'tok' })).rejects.toMatchObject({
      code: 'provider_unavailable',
    });
  });
});

// ── AC2/AC6: registry swap seam + fixture provider ────────────────────────────
// ASYNC since Story 10.8: `getActiveKycProvider` now resolves the FR-58C `kyc_provider_selection`
// flag before choosing a builder. With NO `alternateProviderKey` configured (the v1 state) the flag
// has nothing to switch to, so the lookup is skipped entirely and the config default always wins —
// which is why `dummyCtx.db` is never touched in the first three cases below.
describe('KYC provider registry — FR-58C swap seam (AC2/AC6)', () => {
  const dummyCtx = { db: {}, pariwarId: 'p' } as never;

  it('returns the single active provider (today: fixture)', async () => {
    const registry = createKycProviderRegistry({
      activeProviderKey: 'fixture',
      builders: { fixture: () => fixtureKycProvider },
    });
    await expect(registry.getActiveKycProvider(dummyCtx)).resolves.toBe(fixtureKycProvider);
    expect(registry.activeProviderKey).toBe('fixture');
  });

  it('selecting a different active key swaps the provider with NO consumer change (AC6)', async () => {
    const providerA = fixtureKycProvider;
    const providerB = { ...fixtureKycProvider };
    const builders = { a: () => providerA, b: () => providerB };
    await expect(
      createKycProviderRegistry({ activeProviderKey: 'a', builders }).getActiveKycProvider(dummyCtx),
    ).resolves.toBe(providerA);
    await expect(
      createKycProviderRegistry({ activeProviderKey: 'b', builders }).getActiveKycProvider(dummyCtx),
    ).resolves.toBe(providerB);
  });

  it('throws when the active key has no registered builder', async () => {
    const registry = createKycProviderRegistry({ activeProviderKey: 'ghost', builders: {} });
    await expect(registry.getActiveKycProvider(dummyCtx)).rejects.toThrow(/no KYC provider registered/);
  });

  it('Story 10.8: with an alternate configured, a flag-subsystem failure keeps the DEFAULT provider', async () => {
    // Fail-safe posture: a broken flag lookup must never fail KYC nor silently swap the provider.
    const providerA = fixtureKycProvider;
    const providerB = { ...fixtureKycProvider };
    const registry = createKycProviderRegistry({
      activeProviderKey: 'a',
      alternateProviderKey: 'b',
      builders: { a: () => providerA, b: () => providerB },
    });
    // ⚠ The `onError` spy is what distinguishes this test's hypothesis from its alternatives
    // (Review Pass 4): `resolves.toBe(providerA)` is ALSO what a clean resolution returning
    // `enabled: false` produces, and what a `try` block that never ran produces. Without the spy,
    // deleting the catch entirely left this green.
    const onError = vi.fn();
    const brokenCtx = {
      db: {
        select: () => {
          throw new Error('flag store unavailable');
        },
      },
      pariwarId: '11111111-1111-1111-1111-111111111111',
      onError,
    } as never;
    featureFlags.clearFlagCache();
    await expect(registry.getActiveKycProvider(brokenCtx)).resolves.toBe(providerA);
    expect(onError, 'the broken-store path must be observed, not silently swallowed').toHaveBeenCalledOnce();
  });

  it('⚠ Story 10.8: an ENABLED flag actually selects the alternate provider', async () => {
    // The enabled arm had NO test anywhere — only the failure path was covered, so the selection
    // this seam exists to perform was never proven to work at all.
    const providerA = fixtureKycProvider;
    const providerB = { ...fixtureKycProvider };
    const registry = createKycProviderRegistry({
      activeProviderKey: 'a',
      alternateProviderKey: 'b',
      builders: { a: () => providerA, b: () => providerB },
    });
    const PARIWAR = '11111111-1111-1111-1111-111111111111';
    const row = {
      flagKey: 'kyc_provider_selection',
      pariwarId: PARIWAR,
      version: 2,
      state: 'full',
      cohortDefinition: { clauses: [] },
      fallbackDefault: false,
      owner: 'kyc-desk',
      deadBy: new Date('2027-06-30T00:00:00.000Z'),
      auditId: null,
      effectiveFrom: new Date('2020-01-01T00:00:00.000Z'),
      effectiveUntil: null,
      actorWhoFlipped: null,
      actorDisplay: null,
      rationale: 'seed',
      supersededByVersion: null,
      createdAt: new Date('2020-01-01T00:00:00.000Z'),
    };
    const chain: Record<string, unknown> = {};
    Object.assign(chain, {
      from: () => chain,
      where: () => chain,
      orderBy: () => chain,
      limit: () => Promise.resolve([row]),
    });
    featureFlags.clearFlagCache();
    const enabledCtx = { db: { select: () => chain }, pariwarId: PARIWAR } as never;
    await expect(registry.getActiveKycProvider(enabledCtx)).resolves.toBe(providerB);
  });

  it('⚠ an alternate key with NO registered builder fails at CONSTRUCTION, not on a member request', async () => {
    // The throw used to live inside `getActiveKycProvider`, OUTSIDE its try/catch — so a data-only
    // flag flip to an unregistered key 500-ed every KYC initiate and callback for the whole cohort,
    // with `onError` never firing. A misconfiguration belongs at startup where an operator sees it.
    expect(() =>
      createKycProviderRegistry({
        activeProviderKey: 'a',
        alternateProviderKey: 'not-registered',
        builders: { a: () => fixtureKycProvider },
      }),
    ).toThrow(/alternateProviderKey 'not-registered' has no registered builder/);
  });
});

describe('fixtureKycProvider (the config-absent seam)', () => {
  it('returns deterministic, contract-valid responses', async () => {
    const init = await fixtureKycProvider.initiate('m', 'signup');
    expect(init.transactionId).toBe('fixture-txn-00000000-0000-0000-0000-000000000001');
    const profile = await fixtureKycProvider.verifyAndPullProfile({ state: 's', code: 'c' });
    expect(KycProfile.parse(profile).name).toBe('Fixture Member');
    expect(await fixtureKycProvider.getStatus('t')).toEqual({ transactionId: 't', status: 'verified' });
  });
});

// ── KycProviderError taxonomy projection (AC5) ────────────────────────────────
describe('KycProviderError taxonomy (AC5)', () => {
  it('projects to a parseable provider-neutral KycError', () => {
    const err = new KycProviderError('certificate_stale', 'past hard limit');
    expect(KycError.parse(err.toKycError())).toEqual({
      code: 'certificate_stale',
      retriable: false,
      message: 'past hard limit',
    });
  });
});
