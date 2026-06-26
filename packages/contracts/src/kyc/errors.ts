// packages/contracts/src/kyc/errors.ts
//
// The provider-NEUTRAL KYC error taxonomy (Story 3.3a, AC5) + the thrown error class.
// Whatever provider is active, EVERY failure path normalizes into one of these codes —
// a consumer (Story 3.3b signup) maps `code` → HTTP / lifecycle effect without ever
// seeing a DigiLocker-specific error. `KycProviderError` is thrown by
// `KycProvider.verifyAndPullProfile`; `KycError` is its data projection.
//
// `KycProviderError` `extends Error` DIRECTLY — there is no base error class in
// contracts (`_common/errors.ts` holds only the `ErrorCode` type + `defineErrorCode`
// factory + the `ErrorResponse` Zod envelope; `errors/index.ts` is a blank barrel).
// It mirrors the domain pattern (`ConsentNotFoundError` / `MemberStateDirectWriteError`
// in packages/domain/src/*/errors.ts): a `readonly name`, a `readonly code`, and a
// `toErrorResponse(requestId)` projector. `ErrorResponseShape` is re-declared LOCALLY
// (same technique as packages/domain/src/errors.ts L44-52) — contracts cannot import
// the domain's `ErrorResponseShape` (that would cycle: contracts → domain → contracts).

import { z } from 'zod';

/**
 * The provider-neutral failure taxonomy (AC5). The three AC-named codes
 * (`provider_unavailable`, `user_consent_denied`, `verification_failed`) PLUS the four
 * additive-refinement codes the DigiLocker signature/transaction paths need
 * (`signature_invalid`, `certificate_stale`, `transaction_expired`,
 * `transaction_not_found`). The extra codes are a recorded variance in the story.
 */
export const KycErrorCode = z.enum([
  // ── the three AC5-named codes ──
  'provider_unavailable', // transport down / timeout (NFR-27 8s p95 budget breach)
  'user_consent_denied', // the member declined consent at the provider
  'verification_failed', // generic verification failure (incl. bad signature)
  // ── additive refinements (DigiLocker signature + transaction paths) ──
  'signature_invalid', // eAadhaar PKI signature did not verify against the cached cert
  'certificate_stale', // issuer cert past the hard-limit staleness budget → fail closed
  'transaction_expired', // the transaction is past its `expires_at` window
  'transaction_not_found', // no transaction row for the supplied state/id
]);
export type KycErrorCode = z.output<typeof KycErrorCode>;

/**
 * The provider-neutral error DATA shape (AC5). The thrown `KycProviderError` projects
 * to this via `toKycError()`. `retriable` tells the consumer whether a transient retry
 * could succeed (true only for `provider_unavailable`).
 */
export const KycError = z
  .object({
    code: KycErrorCode,
    retriable: z.boolean(),
    message: z.string(),
  })
  .strict();
export type KycError = z.output<typeof KycError>;

/**
 * The canonical retriable disposition per code. Only `provider_unavailable` (a
 * transient transport failure) is retriable; every other code is a terminal condition
 * the member cannot resolve by retrying (consent denial, bad signature, a stale cert
 * needing ops action, an expired/absent transaction needing a fresh `initiate`). The
 * provider reads this map rather than re-deriving `retriable` at each throw site.
 */
export const KYC_ERROR_RETRIABLE: Readonly<Record<KycErrorCode, boolean>> = Object.freeze({
  provider_unavailable: true,
  user_consent_denied: false,
  verification_failed: false,
  signature_invalid: false,
  certificate_stale: false,
  transaction_expired: false,
  transaction_not_found: false,
});

/**
 * Domain-local mirror of the transport `ErrorResponse` envelope shape
 * (_common/errors.ts). Re-declared by SHAPE here, NOT imported — same technique as
 * packages/domain/src/errors.ts L44-52. The app boundary (Story 3.3b) maps a thrown
 * `KycProviderError` to this envelope at its HTTP error layer.
 */
interface ErrorResponseShape {
  error: {
    code: string;
    message: string;
    details?: unknown;
    request_id: string;
  };
}

/**
 * Thrown by a `KycProvider` on any failure path (AC5) — the provider NEVER silently
 * accepts an unverified profile (AC7). The consumer route `catch`es this and maps
 * `.code` → HTTP status + lifecycle effect (mirror how the domain typed errors are
 * caught by code, not by class instance). `retriable` defaults from
 * `KYC_ERROR_RETRIABLE[code]` but may be overridden at the throw site.
 */
export class KycProviderError extends Error {
  public readonly name = 'KycProviderError';
  public readonly code: KycErrorCode;
  public readonly retriable: boolean;

  public constructor(code: KycErrorCode, message: string, retriable?: boolean) {
    super(message);
    this.code = code;
    this.retriable = retriable ?? KYC_ERROR_RETRIABLE[code];
  }

  /** Project to the provider-neutral `KycError` data shape (AC5). */
  public toKycError(): KycError {
    return { code: this.code, retriable: this.retriable, message: this.message };
  }

  /** Project to the wire error envelope (architecture §3.2). The consumer route calls this. */
  public toErrorResponse(requestId: string): ErrorResponseShape {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: { retriable: this.retriable },
        request_id: requestId,
      },
    };
  }

  /** Type guard — matches the thrown class regardless of cross-realm `instanceof` quirks. */
  public static is(err: unknown): err is KycProviderError {
    return err instanceof Error && (err as { name?: unknown }).name === 'KycProviderError';
  }
}
