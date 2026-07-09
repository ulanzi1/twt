// packages/contracts/src/claims/ocr.ts
//
// The FROZEN OCR provider port (Story 6.5, AC1/AC3) — the death-certificate OCR seam
// every claim-document consumer codes against. Mirrors the `KycProvider` precedent
// (kyc/provider.ts + kyc/errors.ts): a PURE TypeScript interface (a port; no runtime,
// no transport, no vendor-specifics) + `.strict()` Zod DTOs + a provider-neutral error
// taxonomy. The concrete provider (deterministic/manual-entry in v1 — Decision D3) lives
// in ONE apps/api module; a future OCR-vendor swap is a single-module change because
// consumers depend ONLY on this interface + `DeathCertificateOcrResult` / `OcrError`.
//
// ── Decision D3: abstraction-first, NO live vendor, NO boundary gate (yet) ──────────────
// v1 ships the port + a deterministic/manual-entry provider with the transport INJECTED as
// the future swap seam. There is deliberately NO `ocr-provider-boundary` CI gate in 6.5:
// with no real vendor transport to fence off it would be vacuously green and misleading; it
// lands with the vendor-wiring story (contrast the `kyc-provider-boundary` gate, which
// fences a real `xml-crypto`/`@xmldom/xmldom` transport).
//
// ── Contracts discipline ────────────────────────────────────────────────────────────────
// A contracts SOURCE file MUST NOT import `@twt/domain` (the browser-bundle rule — the
// domain barrel re-exports `encryption` → `node:async_hooks`). So `OcrDocumentType` is
// RE-DECLARED here, value-aligned with the `@twt/domain` `claim_document_type` pgEnum (the
// `NomineeRelationship` / `ClaimLifecycleState` precedent). NO `.openapi()` registration —
// 6.5 exposes no HTTP shape carrying the extracted fields (they are Tier-1 PII; the wire
// only ever moves the raw upload + a non-PII parity outcome), so `openapi/v1.yaml` stays
// byte-identical (the KycProvider precedent).
//
// ── PII discipline (AR-12 / Story 1.16b) ────────────────────────────────────────────────
// The six extracted fields (deceased name, DoB, date-of-death, issuing authority,
// certificate number, certificate issue date) are Tier-1 PII. `DeathCertificateOcrResult`
// is an IN-PROCESS hand-off shape (provider → job); it is NEVER logged, echoed on the
// wire, or registered in OpenAPI. The job encrypts each field before persistence and
// never surfaces plaintext.

import { z } from 'zod';

/**
 * The document-type discriminator that drives parser selection (AC3). Value-aligned with
 * the `@twt/domain` `claim_document_type` pgEnum (re-declared, NOT imported, per the
 * contracts browser-bundle rule). v1 ships the `death_certificate` parser ONLY; the
 * other members exist so the chooser + the parser-selection seam accept future types
 * (6.7 ground-inspection photo, later hospital records) WITHOUT a new dispatch path.
 */
export const OcrDocumentType = z.enum([
  'death_certificate',
  'ground_inspection_photo',
  'hospital_record',
]);
export type OcrDocumentType = z.output<typeof OcrDocumentType>;

/**
 * The six identity fields a death-certificate parse extracts (AC1). ALL nullable strings:
 * a partial / failed / low-confidence parse yields `null` for the missing fields — the
 * provider NEVER fabricates a value (a fabricated field could forge a parity match). The
 * strings are AS-EXTRACTED (raw); normalization (trim / case-fold / whitespace-collapse /
 * date-parse — AC1) is a SEPARATE downstream step in the domain parity module, not the
 * provider's job (keeps the provider swap-neutral). `certificateIssueDate` feeds the AC2
 * "death date after certificate issue date is impossible" plausibility check.
 */
export const DeathCertificateFields = z
  .object({
    deceasedName: z.string().nullable(),
    dateOfBirth: z.string().nullable(),
    dateOfDeath: z.string().nullable(),
    issuingAuthority: z.string().nullable(),
    certificateNumber: z.string().nullable(),
    certificateIssueDate: z.string().nullable(),
  })
  .strict();
export type DeathCertificateFields = z.output<typeof DeathCertificateFields>;

/**
 * The result of a successful death-certificate `extract` (AC1). Carries the raw extracted
 * fields + a `confidence` score in [0,1] (the job routes a low-confidence parse to
 * `ambiguous` + manual review — AC6). `documentType` is pinned to `death_certificate`
 * (the only v1 parser); a future parser adds its own result shape without changing this.
 */
export const DeathCertificateOcrResult = z
  .object({
    documentType: z.literal('death_certificate'),
    fields: DeathCertificateFields,
    confidence: z.number().min(0).max(1),
  })
  .strict();
export type DeathCertificateOcrResult = z.output<typeof DeathCertificateOcrResult>;

/**
 * The `extract` request. A PURE TS interface (not a Zod DTO — it carries raw `bytes`).
 * `documentType` drives parser selection; `bytes` + `contentType` are the document the
 * job fetched from `ClaimDocumentStorage`. `manualEntry` is the v1 deterministic-provider
 * path (Decision D3): operator/uploader-supplied field values threaded through as the
 * "extraction" until a real OCR vendor reads `bytes` — a future vendor provider ignores it.
 */
export interface OcrExtractionRequest {
  readonly documentType: OcrDocumentType;
  readonly bytes: Uint8Array;
  readonly contentType: string;
  /** v1 deterministic/manual-entry values (Decision D3). Absent → the provider returns a
   *  zero-confidence empty parse (→ `ambiguous` at the parity step, never a false match). */
  readonly manualEntry?: DeathCertificateFields;
}

// ── Provider-neutral error taxonomy (mirror kyc/errors.ts) ──────────────────────────────

/**
 * The provider-neutral OCR failure taxonomy (mirror `KycErrorCode`). Whatever provider is
 * active, EVERY failure normalizes into one of these — the job maps `code` → an
 * `ambiguous` parity outcome + `verifier_review_required` (AC6), never letting a provider
 * exception fail the claim.
 */
export const OcrErrorCode = z.enum([
  'provider_unavailable', // transport down / timeout (the only retriable code)
  'unsupported_document_type', // no parser for the requested documentType (v1: non-death-cert)
  'unreadable_document', // bytes could not be parsed (corrupt / illegible / empty)
  'extraction_failed', // generic parse failure
]);
export type OcrErrorCode = z.output<typeof OcrErrorCode>;

/** The provider-neutral error DATA shape (mirror `KycError`). */
export const OcrError = z
  .object({
    code: OcrErrorCode,
    retriable: z.boolean(),
    message: z.string(),
  })
  .strict();
export type OcrError = z.output<typeof OcrError>;

/**
 * The canonical retriable disposition per code. Only `provider_unavailable` (a transient
 * transport failure) is retriable; every other code is terminal for this document (a
 * missing parser, an illegible scan, a generic parse failure — all route to manual review,
 * never a silent success).
 */
export const OCR_ERROR_RETRIABLE: Readonly<Record<OcrErrorCode, boolean>> = Object.freeze({
  provider_unavailable: true,
  unsupported_document_type: false,
  unreadable_document: false,
  extraction_failed: false,
});

interface ErrorResponseShape {
  error: {
    code: string;
    message: string;
    details?: unknown;
    request_id: string;
  };
}

/**
 * Thrown by an `OcrProvider` on any failure path (mirror `KycProviderError`). The provider
 * NEVER silently returns a partial result — a failed parse throws this so the job can log
 * the audit line + persist an `ambiguous` outcome (AC6). Matched by `.code` (not by class
 * instance), mirroring the domain typed-error discipline.
 */
export class OcrProviderError extends Error {
  public readonly name = 'OcrProviderError';
  public readonly code: OcrErrorCode;
  public readonly retriable: boolean;

  public constructor(code: OcrErrorCode, message: string, retriable?: boolean) {
    super(message);
    this.code = code;
    this.retriable = retriable ?? OCR_ERROR_RETRIABLE[code];
  }

  /** Project to the provider-neutral `OcrError` data shape. */
  public toOcrError(): OcrError {
    return { code: this.code, retriable: this.retriable, message: this.message };
  }

  /** Project to the wire error envelope (architecture §3.2). */
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
  public static is(err: unknown): err is OcrProviderError {
    return err instanceof Error && (err as { name?: unknown }).name === 'OcrProviderError';
  }
}

/**
 * The FROZEN OCR provider port (AC1/AC3) — exactly one method. A PURE interface: no
 * runtime, no transport, no vendor-specifics. The v1 deterministic provider + every future
 * vendor implements THIS and nothing more; consumers import only this type (and
 * `DeathCertificateOcrResult` / `OcrProviderError`). This is the load-bearing
 * single-module-swap seam (the AR-43 / `KycProvider` precedent).
 *
 * `extract` THROWS an `OcrProviderError` on any failure — the normalized, provider-neutral
 * taxonomy. It never silently returns a partial / fabricated result.
 */
export interface OcrProvider {
  /**
   * Select the parser from `request.documentType` and extract the identity fields. v1
   * supports `death_certificate` only; any other type throws `unsupported_document_type`
   * (the seam — a future parser is added here without a new call site).
   */
  extract(request: OcrExtractionRequest): Promise<DeathCertificateOcrResult>;
}
