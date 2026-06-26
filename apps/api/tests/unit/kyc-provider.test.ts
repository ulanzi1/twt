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
describe('KYC provider registry — FR-58C swap seam (AC2/AC6)', () => {
  const dummyCtx = { db: {}, pariwarId: 'p' } as never;

  it('returns the single active provider (today: fixture)', () => {
    const registry = createKycProviderRegistry({
      activeProviderKey: 'fixture',
      builders: { fixture: () => fixtureKycProvider },
    });
    expect(registry.getActiveKycProvider(dummyCtx)).toBe(fixtureKycProvider);
    expect(registry.activeProviderKey).toBe('fixture');
  });

  it('selecting a different active key swaps the provider with NO consumer change (AC6)', () => {
    const providerA = fixtureKycProvider;
    const providerB = { ...fixtureKycProvider };
    const builders = { a: () => providerA, b: () => providerB };
    expect(createKycProviderRegistry({ activeProviderKey: 'a', builders }).getActiveKycProvider(dummyCtx)).toBe(
      providerA,
    );
    expect(createKycProviderRegistry({ activeProviderKey: 'b', builders }).getActiveKycProvider(dummyCtx)).toBe(
      providerB,
    );
  });

  it('throws when the active key has no registered builder', () => {
    const registry = createKycProviderRegistry({ activeProviderKey: 'ghost', builders: {} });
    expect(() => registry.getActiveKycProvider(dummyCtx)).toThrow(/no KYC provider registered/);
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
