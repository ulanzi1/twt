// Concrete OcrProvider — Story 6.5 (Task 1; AC1/AC3, Decision D3).
//
// The v1 death-certificate OCR provider. Lives in `apps/jobs` because the OCR + parity
// BACKGROUND JOB (claim-ocr-parity.ts) is the ONLY consumer that calls `extract()` — the
// API upload endpoint merely stores the bytes + enqueues the job (it never runs OCR). Per
// Decision D3 this is a DETERMINISTIC / MANUAL-ENTRY provider ONLY — there is NO live OCR
// vendor wired in 6.5. The provider selects the death-certificate parser from `documentType`
// (the parser-selection seam, AC3); a future real-vendor swap is a single-module change
// because every consumer depends only on the `@twt/contracts` `OcrProvider` port.
//
// ┌─ Decision D3 — SOLE INTENDED FUTURE-TRANSPORT HOLDER ────────────────────────────────┐
// │ This module (`apps/jobs/src/ocr/`) is the ONE place a future OCR-vendor transport (an  │
// │ HTTP client to a cloud OCR API, an on-prem OCR binary, …) will be imported. The        │
// │ transport is INJECTED (`OcrTransport`) so the swap never moves code. There is           │
// │ deliberately NO `ocr-provider-boundary` CI gate in 6.5: with no real vendor transport  │
// │ to fence off, the gate would be vacuously green + misleading. The gate lands with the   │
// │ vendor-wiring story, fencing this directory — mirroring how the `kyc-provider-boundary` │
// │ gate fences the DigiLocker `xml-crypto`/`@xmldom/xmldom` transport in apps/api.          │
// └────────────────────────────────────────────────────────────────────────────────────────┘
//
// Every failure normalizes to an `OcrProviderError` (the KycProviderError taxonomy
// precedent) — the provider NEVER silently returns a partial / fabricated result. The job
// catches it and persists an `ambiguous` parity outcome (AC6).

import {
  DeathCertificateOcrResult,
  OcrProviderError,
  type DeathCertificateFields,
  type OcrExtractionRequest,
  type OcrProvider,
} from '@twt/contracts';

/**
 * The injected future-vendor seam (Decision D3). A real OCR vendor transport implements
 * THIS — reading `request.bytes` and returning extracted fields. In v1 it is left
 * `undefined`; the provider falls back to the manual-entry / empty path. This type is the
 * ONLY place a vendor transport is referenced, so the vendor-wiring story swaps it in
 * without touching any consumer.
 */
export type OcrTransport = (request: OcrExtractionRequest) => Promise<DeathCertificateOcrResult>;

const EMPTY_DEATH_CERT_FIELDS: DeathCertificateFields = Object.freeze({
  deceasedName: null,
  dateOfBirth: null,
  dateOfDeath: null,
  issuingAuthority: null,
  certificateNumber: null,
  certificateIssueDate: null,
});

export interface DeterministicOcrProviderOpts {
  /** The future real-vendor transport (Decision D3). Absent in v1 → empty/manual-entry path. */
  readonly transport?: OcrTransport;
}

/**
 * Construct the v1 deterministic / manual-entry `OcrProvider` (Decision D3).
 *
 * Parser selection (AC3): only `death_certificate` is supported in v1; any other
 * `documentType` throws `unsupported_document_type` — the seam a future parser plugs into
 * without a new call site.
 *
 * Extraction:
 *   · if a real-vendor `transport` is injected → delegate to it (the future path);
 *   · else if `manualEntry` fields are supplied → return them at full confidence
 *     (the operator/uploader typed the values — the v1 manual-entry path);
 *   · else → return a zero-confidence EMPTY parse (all fields null). This is NOT a failure —
 *     it is a valid low-confidence result the parity step maps to `ambiguous` + manual
 *     review (AC6), never a fabricated match. In v1 (no live vendor, no manual entry in the
 *     queue payload) this is the production path, so a real upload routes to manual review
 *     (AR-61) until the vendor-wiring story lands.
 */
export function createDeterministicOcrProvider(
  opts: DeterministicOcrProviderOpts = {},
): OcrProvider {
  return {
    async extract(request: OcrExtractionRequest): Promise<DeathCertificateOcrResult> {
      // Parser selection (AC3) — v1 death-certificate only.
      if (request.documentType !== 'death_certificate') {
        throw new OcrProviderError(
          'unsupported_document_type',
          `no v1 parser for document type '${request.documentType}' (death_certificate only)`,
        );
      }
      // An empty document cannot be parsed — normalize to a provider error (AC6 → ambiguous).
      if (request.bytes.byteLength === 0) {
        throw new OcrProviderError('unreadable_document', 'empty document (0 bytes)');
      }

      // Future real-vendor path (Decision D3 swap seam).
      if (opts.transport) {
        const result = await opts.transport(request);
        // Defense-in-depth: a vendor transport MUST return a valid result shape.
        return DeathCertificateOcrResult.parse(result);
      }

      // v1 manual-entry path: the operator/uploader-supplied fields ARE the extraction.
      if (request.manualEntry) {
        return DeathCertificateOcrResult.parse({
          documentType: 'death_certificate',
          fields: request.manualEntry,
          confidence: 1,
        });
      }

      // No transport, no manual entry → an explicit zero-confidence empty parse. Routes to
      // `ambiguous` at the parity step (AC6) — deterministic, never a fabricated field.
      return {
        documentType: 'death_certificate',
        fields: EMPTY_DEATH_CERT_FIELDS,
        confidence: 0,
      };
    },
  };
}
