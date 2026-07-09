// packages/contracts/src/claims/documents.ts
//
// Claim-document upload wire DTOs + the reusable `ClaimDocumentStorage` port (Story 6.5,
// AC4/AC5 — Decision D1). Two concerns live here:
//
//   1. The upload transport shape — the non-file fields the member-app / helpline upload
//      endpoints accept alongside the multipart file (the bytes ride the multipart body,
//      NOT a JSON field). `.strict()` per the contracts directory discipline.
//   2. The `ClaimDocumentStorage` port — a minimal, reusable object-store seam (Decision
//      D1: death certs are multi-MB PDFs; the KYC base64-in-Postgres path does not scale).
//      A PURE TS interface (browser-safe `Uint8Array` bytes, so it stays in contracts, not
//      platform-adapters). The concrete GCS adapter (asia-south1) is injected; tests use a
//      fake/in-memory double. Reusable by design — KYC docs / Contribution-Note PDFs / bank
//      statements are future consumers (architecture line 235).
//
// ── Contracts discipline ────────────────────────────────────────────────────────────────
// MUST NOT import `@twt/domain`. `OcrDocumentType` is imported from the sibling `ocr.ts`
// (same package). NO `.openapi()` registration — the multipart upload route is documented
// by hand, and nothing here carries the Tier-1 extracted fields (those never touch the wire).

import { z } from 'zod';

import { OcrDocumentType } from './ocr.js';

/**
 * The parity outcome (AC2). A NON-PII metadata verdict safe to surface to the verifier:
 * `match` (OCR agrees with the member record), `mismatch` (a discrepancy beyond tolerance —
 * flags a human review; 6.5 NEVER auto-rejects), `ambiguous` (OCR failed / low confidence /
 * no comparison source on file — AR-61 routes to manual review). Value-aligned with the
 * `@twt/domain` `claim_document_parity_outcome` pgEnum (re-declared per the browser-bundle rule).
 */
export const ClaimDocumentParityOutcome = z.enum(['match', 'mismatch', 'ambiguous']);
export type ClaimDocumentParityOutcome = z.output<typeof ClaimDocumentParityOutcome>;

/**
 * The MIME allowlist enforced at the upload boundary AND defensively before the adapter
 * `put` (AC-Task2). A death certificate is a scan (JPEG/PNG) or a PDF — nothing else.
 */
export const CLAIM_DOCUMENT_ALLOWED_MIME_TYPES = Object.freeze([
  'image/jpeg',
  'image/png',
  'application/pdf',
]) as readonly string[];

/**
 * The hard byte cap for an uploaded claim document (10 MiB). A concrete, documented limit
 * (Decision D1): comfortably covers a multi-page scanned death certificate while rejecting
 * an abusive upload before it reaches object storage. Enforced at the boundary + before `put`.
 */
export const CLAIM_DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;

/**
 * The non-file fields the upload endpoint accepts (the file bytes ride the multipart body).
 * `documentType` drives OCR parser selection (`<DocumentTypeChooser>`, AC3); `claimCaseId`
 * is the claim the document is filed against. `.strict()`.
 */
export const ClaimDocumentUploadRequest = z
  .object({
    claimCaseId: z.string().uuid(),
    documentType: OcrDocumentType,
  })
  .strict();
export type ClaimDocumentUploadRequest = z.output<typeof ClaimDocumentUploadRequest>;

/**
 * The upload response (HTTP 202 — accepted). The document bytes are stored and an OCR +
 * parity job is enqueued; extraction + the parity verdict complete asynchronously (AC4 —
 * OCR is a background job). The client polls / receives the verdict later. `documentId` is
 * the caller-facing handle (the storage object key is never exposed). `status` is
 * `processing` — the parity outcome is NOT known synchronously.
 */
export const ClaimDocumentUploadResponse = z
  .object({
    documentId: z.string().uuid(),
    status: z.literal('processing'),
  })
  .strict();
export type ClaimDocumentUploadResponse = z.output<typeof ClaimDocumentUploadResponse>;

/**
 * The reusable claim-document object-store port (Decision D1). A PURE TS interface — the
 * concrete Google Cloud Storage adapter (asia-south1) is injected; tests inject an
 * in-memory fake. Bytes are `Uint8Array` (browser-safe, so this port stays in contracts).
 * The bucket is PRIVATE — read access is a short-lived signed URL ONLY, never a public ACL.
 */
export interface ClaimDocumentStorage {
  /**
   * Store `bytes` at `key` with the given content type. `key` is an opaque, non-PII object
   * path scoped by pariwar/claim (the caller mints it). Idempotent per key from the caller's
   * perspective — a re-`put` of the same key overwrites the same object.
   */
  put(key: string, bytes: Uint8Array, opts: { contentType: string }): Promise<void>;
  /**
   * Fetch the stored object bytes at `key`. The OCR parity job reads the document THIS way
   * (Decision D1 — the bytes are multi-MB, so they are NEVER carried in the pg-boss job
   * payload, which is itself Postgres-backed; the job re-fetches from object storage by key).
   */
  getBytes(key: string): Promise<Uint8Array>;
  /**
   * Mint a short-lived signed READ URL for `key` (arch line 1741 data-export precedent).
   * `ttlSeconds` is small — the URL is handed to the verifier's `<DocumentPreview>` and must
   * expire quickly. NEVER a long-lived or public link.
   */
  signedReadUrl(key: string, ttlSeconds: number): Promise<string>;
  /** Delete the object at `key` (RTBF / hygiene). Optional — not every adapter supports it. */
  delete?(key: string): Promise<void>;
}
