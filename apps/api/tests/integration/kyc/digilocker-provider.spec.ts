// DigiLocker provider — full-flow live-DB integration (Story 3.3a, Task 6).
//
// Drives the REAL provider (initiate → verifyAndPullProfile → getStatus) against Postgres
// under a tenant scope, with a FAKE transport (the signed-XML fixture — NEVER the live
// government API) + a seeded issuer cert. Proves the seam end-to-end: PKCE state persisted,
// signature verified against the cached cert, eAadhaar mapped to a neutral KycProfile, the
// transaction status transitioned. Plus the AC5 negatives: transaction_not_found,
// transaction_expired, certificate_stale (no cert), signature_invalid (wrong cert).

import { randomUUID } from 'node:crypto';

import { KycProfile, KycProviderError } from '@twt/contracts';
import { ids, kyc } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import { closeScopeTx, openScopeTx } from '../../../src/modules/multi-tenant/scope-tx.js';
import type { KycProviderContext } from '../../../src/modules/kyc/index.js';
import {
  createDigiLockerProvider,
  type DigiLockerProviderConfig,
  type DigiLockerTransport,
} from '../../../src/modules/kyc/index.js';
import { TEST_ISSUER_CERT_PEM, WRONG_CERT_PEM, signedSampleEaadhaar } from '../../fixtures/kyc/sign-eaadhaar.js';
import { buildTestDeps, hasDatabase, type TestDeps } from '../_setup.js';

const NOT_AFTER = new Date('2040-01-01T00:00:00Z');

const CONFIG: DigiLockerProviderConfig = {
  clientId: 'test-client',
  clientSecret: 'test-secret',
  authorizeUrl: 'https://api.digitallocker.gov.in/public/oauth2/1/authorize',
  tokenUrl: 'https://api.digitallocker.gov.in/public/oauth2/1/token',
  eaadhaarUrl: 'https://api.digitallocker.gov.in/public/oauth2/3/xml/eaadhaar',
  redirectUri: 'https://app.twt.local/kyc/callback',
  redirectUriAllowlist: ['https://app.twt.local/kyc/callback'],
  httpTimeoutMs: 8000,
  transactionTtlMs: 15 * 60 * 1000,
};

interface ProviderOverrides {
  transport?: DigiLockerTransport;
  now?: () => Date;
  onStalenessAlarm?: (a: { keyId: string; fetchedAt: Date; ageDays: number }) => void;
}

/** A fake transport returning the signed eAadhaar fixture — never the live API. */
function fakeTransport(xml: string = signedSampleEaadhaar()): DigiLockerTransport {
  return {
    async exchangeCodeForToken() {
      return { accessToken: 'fake-access-token' };
    },
    async fetchEaadhaarXml() {
      return xml;
    },
  };
}

describe.skipIf(!hasDatabase)('DigiLocker provider — full flow (:5433)', () => {
  /** Open a tenant-scoped tx + build the provider ctx; caller closes (rollback). */
  async function withProvider<T>(
    fn: (args: {
      ctx: KycProviderContext;
      td: TestDeps;
      makeProvider: (deps?: ProviderOverrides) => ReturnType<typeof createDigiLockerProvider>;
    }) => Promise<T>,
  ): Promise<T> {
    const td = buildTestDeps();
    const pariwarId = randomUUID();
    const scopeTx = await openScopeTx(td.deps, pariwarId);
    try {
      const ctx: KycProviderContext = { db: scopeTx.tx, pariwarId: ids.pariwarId(pariwarId) };
      const makeProvider = (deps: ProviderOverrides = {}) =>
        createDigiLockerProvider(ctx, {
          config: CONFIG,
          transport: deps.transport ?? fakeTransport(),
          now: deps.now ?? (() => new Date()),
          onStalenessAlarm: deps.onStalenessAlarm,
        });
      return await fn({ ctx, td, makeProvider });
    } finally {
      await closeScopeTx(scopeTx, false); // rollback — nothing persists
      await td.pool.end();
    }
  }

  /** Seed an active issuer cert into the GLOBAL cache on the scoped tx. */
  async function seedCert(
    ctx: KycProviderContext,
    pem = TEST_ISSUER_CERT_PEM,
    fetchedAt = new Date(),
    notAfter = NOT_AFTER,
  ) {
    await kyc.upsertDigiLockerCert(ctx.db, {
      keyId: `key-${randomUUID()}`,
      pem,
      notAfter,
      fetchedAt,
    });
  }

  it('initiate → verifyAndPullProfile → getStatus (happy path)', async () => {
    await withProvider(async ({ ctx, makeProvider }) => {
      await seedCert(ctx);
      const provider = makeProvider();

      const init = await provider.initiate(randomUUID(), 'signup');
      expect(init.transactionId).toBeTruthy();
      expect(init.authorizationUrl).toContain('code_challenge_method=S256');

      // The OAuth state is internal; read it off the persisted transaction to drive the callback.
      const row = await kyc.getKycTransaction(ctx.db, ctx.pariwarId, init.transactionId);
      expect(row?.status).toBe('pending');

      const profile = await provider.verifyAndPullProfile({ state: row!.state, code: 'auth-code' });
      expect(KycProfile.parse(profile)).toMatchObject({
        name: 'Asha Devi',
        verificationStrength: 'aadhaar_kyc',
      });
      expect(profile.aadhaarMaskedId.startsWith('XXXXXXXX')).toBe(true);

      const status = await provider.getStatus(init.transactionId);
      expect(status).toEqual({ transactionId: init.transactionId, status: 'verified' });
    });
  });

  it('verifyAndPullProfile throws transaction_not_found for an unknown state', async () => {
    await withProvider(async ({ ctx, makeProvider }) => {
      await seedCert(ctx);
      const provider = makeProvider();
      await expect(
        provider.verifyAndPullProfile({ state: 'no-such-state', code: 'c' }),
      ).rejects.toMatchObject({ code: 'transaction_not_found' });
    });
  });

  it('verifyAndPullProfile throws transaction_expired past the TTL', async () => {
    await withProvider(async ({ ctx, makeProvider }) => {
      await seedCert(ctx);
      let nowMs = Date.parse('2026-06-25T00:00:00Z');
      const provider = makeProvider({ now: () => new Date(nowMs) });
      const init = await provider.initiate(randomUUID(), 'signup');
      const row = await kyc.getKycTransaction(ctx.db, ctx.pariwarId, init.transactionId);
      nowMs += CONFIG.transactionTtlMs + 60_000; // advance past expiry
      await expect(
        provider.verifyAndPullProfile({ state: row!.state, code: 'c' }),
      ).rejects.toMatchObject({ code: 'transaction_expired' });
    });
  });

  it('verifyAndPullProfile fails closed (certificate_stale) when NO cert is cached', async () => {
    await withProvider(async ({ ctx, makeProvider }) => {
      const provider = makeProvider(); // no seedCert
      const init = await provider.initiate(randomUUID(), 'signup');
      const row = await kyc.getKycTransaction(ctx.db, ctx.pariwarId, init.transactionId);
      await expect(
        provider.verifyAndPullProfile({ state: row!.state, code: 'c' }),
      ).rejects.toMatchObject({ code: 'certificate_stale' });
    });
  });

  it('verifyAndPullProfile throws signature_invalid when verified against the WRONG cert', async () => {
    await withProvider(async ({ ctx, makeProvider }) => {
      await seedCert(ctx, WRONG_CERT_PEM); // active cert is the impostor
      const provider = makeProvider();
      const init = await provider.initiate(randomUUID(), 'signup');
      const row = await kyc.getKycTransaction(ctx.db, ctx.pariwarId, init.transactionId);
      const err = (await provider
        .verifyAndPullProfile({ state: row!.state, code: 'c' })
        .catch((e: unknown) => e)) as KycProviderError;
      expect(KycProviderError.is(err)).toBe(true);
      expect(err.code).toBe('signature_invalid');

      // The transaction was marked failed (non-retriable terminal outcome).
      const reread = await kyc.getKycTransaction(ctx.db, ctx.pariwarId, init.transactionId);
      expect(reread?.status).toBe('failed');
    });
  });

  it('verifyAndPullProfile throws transaction_not_found on replay (P1 — non-pending guard)', async () => {
    await withProvider(async ({ ctx, makeProvider }) => {
      await seedCert(ctx);
      const provider = makeProvider();
      const init = await provider.initiate(randomUUID(), 'signup');
      const row = await kyc.getKycTransaction(ctx.db, ctx.pariwarId, init.transactionId);

      // First call succeeds and transitions the transaction to verified.
      await provider.verifyAndPullProfile({ state: row!.state, code: 'auth-code' });

      // Second call with the same state (replay) must be rejected — the transaction is no
      // longer pending.
      await expect(
        provider.verifyAndPullProfile({ state: row!.state, code: 'auth-code' }),
      ).rejects.toMatchObject({ code: 'transaction_not_found' });
    });
  });

  it('verifyAndPullProfile throws certificate_stale when cert notAfter is in the past (P2)', async () => {
    await withProvider(async ({ ctx, makeProvider }) => {
      // Seed a cert whose X.509 notAfter is already in the past.
      const expiredNotAfter = new Date('2020-01-01T00:00:00Z');
      await seedCert(ctx, TEST_ISSUER_CERT_PEM, new Date(), expiredNotAfter);
      const provider = makeProvider({ now: () => new Date('2026-06-26T12:00:00Z') });
      const init = await provider.initiate(randomUUID(), 'signup');
      const row = await kyc.getKycTransaction(ctx.db, ctx.pariwarId, init.transactionId);
      await expect(
        provider.verifyAndPullProfile({ state: row!.state, code: 'c' }),
      ).rejects.toMatchObject({ code: 'certificate_stale' });
    });
  });

  it('refreshDigiLockerCerts parses the X.509 + upserts into the GLOBAL cache (AC7)', async () => {
    await withProvider(async ({ ctx }) => {
      const fetcher = {
        async fetchIssuerCerts() {
          return [{ keyId: 'uidai-test-key', pem: TEST_ISSUER_CERT_PEM }];
        },
      };
      const result = await kyc.refreshDigiLockerCerts(ctx.db, fetcher, {
        now: () => new Date('2026-06-25T00:00:00Z'),
      });
      expect(result).toEqual({ refreshed: 1, keyIds: ['uidai-test-key'] });

      const cert = await kyc.getActiveCertByKeyId(ctx.db, 'uidai-test-key');
      expect(cert?.pem).toBe(TEST_ISSUER_CERT_PEM);
      expect(cert?.notAfter).not.toBeNull(); // parsed from the X.509
      expect(cert?.subject).toContain('UIDAI Test Issuer');
    });
  });
});
