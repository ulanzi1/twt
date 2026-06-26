// DigiLocker KycProvider — Story 3.3a (Task 2; AC1/AC2/AC4/AC5/AC7).
//
// The concrete `KycProvider` implementation, bound to a request `KycProviderContext`
// (scoped db + pariwarId). This directory is the SOLE holder of DigiLocker-specifics
// (OAuth2+PKCE transport, eAadhaar-XML signature verification, mapping, error
// normalization) — the `kyc-provider-boundary` CI gate forbids any other code importing
// the DigiLocker transport (`xml-crypto` / `@xmldom/xmldom` / `xpath`). Consumers depend
// ONLY on the `@twt/contracts` `KycProvider` port — that is the AR-43 single-module-swap
// seam.
//
// Every failure path normalizes to `KycProviderError` (AC5) and NEVER silently accepts an
// unverified profile (AC7). A `KycProfile` is returned to the caller (3.3b persists it) —
// this provider stores NO eAadhaar PII (only OAuth/PKCE state in kyc_transactions).

import {
  KycProviderError,
  type KycCallbackPayload,
  type KycInitiation,
  type KycIntent,
  type KycProfile,
  type KycProvider,
  type KycTransactionStatus,
} from '@twt/contracts';
import { kyc, type ids } from '@twt/domain';

import type { KycProviderContext } from '../../context.js';
import {
  assertRedirectUriAllowed,
  buildAuthorizeUrl,
  codeChallengeS256,
  generateCodeVerifier,
  generateState,
  type DigiLockerProviderConfig,
  type DigiLockerTransport,
} from './client.js';
import { mapEaadhaarToKycProfile } from './mapper.js';
import { verifyEaadhaarSignature } from './signature.js';
import { evaluateCertStaleness } from './staleness-policy.js';

// Public re-exports for the kyc module barrel / deps.ts (the factory + the transport
// FACTORY + the cert-refresh function + the staleness policy). NB: importing these is
// importing the provider's PUBLIC API, NOT the DigiLocker transport libs (`xml-crypto` /
// `@xmldom/xmldom` / `xpath`) — those stay imported only inside this directory, which is
// what the `kyc-provider-boundary` CI gate enforces.
export {
  type DigiLockerProviderConfig,
  type DigiLockerTransport,
  createHttpDigiLockerTransport,
} from './client.js';
export {
  type DigiLockerCertFetcher,
  type FetchedIssuerCert,
  type RefreshCertsResult,
  refreshDigiLockerCerts,
} from './cert-refresh.js';
export {
  type CertStaleness,
  CERT_STALENESS_HARD_LIMIT_MS,
  CERT_STALENESS_WITHIN_BUDGET_MS,
  evaluateCertStaleness,
} from './staleness-policy.js';

/** The registry key for the DigiLocker provider (stored on the kyc_transactions row). */
export const DIGILOCKER_PROVIDER_KEY = 'digilocker';

const DAY_MS = 24 * 60 * 60 * 1000;
const VALID_STATUSES = new Set(['pending', 'verified', 'failed', 'expired']);

/** Staleness alarm payload — surfaced to ops when a cached cert is within-budget-but-stale. */
export interface CertStalenessAlarm {
  keyId: string;
  fetchedAt: Date;
  ageDays: number;
}

export interface DigiLockerProviderDeps {
  readonly config: DigiLockerProviderConfig;
  /** The OAuth/eAadhaar transport (injected — a fake in tests; HTTP in prod). */
  readonly transport: DigiLockerTransport;
  /** Clock (injected for deterministic TTL + staleness tests). */
  readonly now: () => Date;
  /** Ops alarm hook fired when a within-budget-but-stale cert is trusted (AC7). */
  readonly onStalenessAlarm?: (alarm: CertStalenessAlarm) => void;
}

/**
 * Build a DigiLocker `KycProvider` bound to `ctx` (scoped db + pariwarId) with the
 * injected transport + clock. The returned object is exactly the frozen 3-method port.
 */
export function createDigiLockerProvider(
  ctx: KycProviderContext,
  deps: DigiLockerProviderDeps,
): KycProvider {
  const { db, pariwarId } = ctx;
  const { config, transport, now } = deps;

  return {
    async initiate(memberId: string, intent: KycIntent): Promise<KycInitiation> {
      // PKCE + state (CSRF) + the allowlisted redirect_uri (§2.8).
      const redirectUri = assertRedirectUriAllowed(config, config.redirectUri);
      const state = generateState();
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = codeChallengeS256(codeVerifier);
      const authorizationUrl = buildAuthorizeUrl(config, { state, codeChallenge, redirectUri });
      const expiresAt = new Date(now().getTime() + config.transactionTtlMs);

      const row = await kyc.insertKycTransaction(db, {
        memberId: memberId as ids.MemberId,
        pariwarId,
        provider: DIGILOCKER_PROVIDER_KEY,
        intent,
        state,
        codeVerifier,
        redirectUri,
        expiresAt,
      });

      return { transactionId: row.transactionId, authorizationUrl, expiresAt: expiresAt.toISOString() };
    },

    async verifyAndPullProfile(callback: KycCallbackPayload): Promise<KycProfile> {
      // 1. Resolve the transaction by its OAuth state (within the tenant scope).
      const txn = await kyc.getKycTransactionByState(db, pariwarId, callback.state);
      if (!txn) {
        throw new KycProviderError('transaction_not_found', 'no KYC transaction for the supplied state');
      }
      if (txn.status !== 'pending') {
        // Replay guard: a callback that arrives after the transaction already reached a
        // terminal state (verified / failed / expired) is rejected rather than re-processed.
        throw new KycProviderError('transaction_not_found', `KYC transaction is not in pending status (${txn.status})`);
      }

      // 2. TTL is application-enforced (§PKCE window) — past expiry → expired.
      if (now().getTime() > txn.expiresAt.getTime()) {
        await kyc.updateKycTransactionStatus(db, pariwarId, txn.transactionId, 'expired');
        throw new KycProviderError('transaction_expired', 'KYC transaction has expired');
      }

      try {
        // 3. Exchange the code (transport failure → provider_unavailable; consent denied
        //    → user_consent_denied, both normalized in the transport).
        const { accessToken } = await transport.exchangeCodeForToken({
          code: callback.code,
          codeVerifier: txn.codeVerifier,
          redirectUri: txn.redirectUri,
        });

        // 4. Pull the PKI-signed eAadhaar XML.
        const xml = await transport.fetchEaadhaarXml({ accessToken });

        // 5. Resolve the trusted cached cert + evaluate the two-window staleness budget.
        const certs = await kyc.listActiveCerts(db, { limit: 1 });
        const cert = certs[0];
        if (!cert) {
          // No trust anchor cached → cannot verify → fail closed (AC7).
          throw new KycProviderError('certificate_stale', 'no active issuer certificate cached');
        }
        if (cert.notAfter && now() >= cert.notAfter) {
          throw new KycProviderError(
            'certificate_stale',
            'issuer certificate has expired (X.509 notAfter)',
          );
        }
        const staleness = evaluateCertStaleness(cert.fetchedAt, now());
        if (staleness === 'past-hard-limit') {
          throw new KycProviderError(
            'certificate_stale',
            'cached issuer certificate is past the hard-limit staleness budget (fail closed)',
          );
        }
        if (staleness === 'within-budget') {
          deps.onStalenessAlarm?.({
            keyId: cert.keyId,
            fetchedAt: cert.fetchedAt,
            ageDays: Math.floor((now().getTime() - cert.fetchedAt.getTime()) / DAY_MS),
          });
        }

        // 6. Verify the eAadhaar signature against the cached cert — NEVER silently accept.
        const result = verifyEaadhaarSignature(xml, cert.pem);
        if (!result.valid) {
          const code =
            result.reason === 'no_signature' ||
            result.reason === 'xml_parse_failed' ||
            result.reason === 'multiple_signatures'
              ? 'verification_failed'
              : 'signature_invalid';
          throw new KycProviderError(code, `eAadhaar signature verification failed (${result.reason})`);
        }

        // 7. Map to the neutral profile (masks Aadhaar to last 4).
        // Pass the pre-parsed doc from signature verification to avoid a second DOMParser
        // round-trip and guarantee the verified and mapped documents are identical.
        const profile = mapEaadhaarToKycProfile(result.doc ?? xml);

        // 8. Record success + return the profile (the caller, 3.3b, persists it).
        await kyc.updateKycTransactionStatus(db, pariwarId, txn.transactionId, 'verified');
        return profile;
      } catch (err) {
        const provErr = KycProviderError.is(err)
          ? err
          : new KycProviderError('provider_unavailable', `DigiLocker verification failed: ${String(err)}`);
        // Mark terminal failures (non-retriable) as failed; leave retriable transport
        // failures `pending` so the member can retry the same transaction within its TTL.
        if (!provErr.retriable) {
          await kyc
            .updateKycTransactionStatus(db, pariwarId, txn.transactionId, 'failed')
            .catch(() => undefined);
        }
        throw provErr;
      }
    },

    async getStatus(transactionId: string): Promise<KycTransactionStatus> {
      const txn = await kyc.getKycTransaction(db, pariwarId, transactionId);
      if (!txn) {
        throw new KycProviderError('transaction_not_found', `no KYC transaction ${transactionId}`);
      }
      if (!VALID_STATUSES.has(txn.status)) {
        throw new KycProviderError(
          'verification_failed',
          `KYC transaction has unrecognized status: ${txn.status}`,
        );
      }
      const status = txn.status as 'pending' | 'verified' | 'failed' | 'expired';
      return { transactionId, status };
    },
  };
}
