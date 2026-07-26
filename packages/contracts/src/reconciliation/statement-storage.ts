// packages/contracts/src/reconciliation/statement-storage.ts
//
// The Story 9.3 bank-statement UPLOAD-TRANSPORT contracts — the wire DTOs + the two injectable
// ports the `<BankStatementUpload>` transport rides on. Story 9.2 authored the pure parser +
// the `ParseResultSummary`; 9.3 authors the transport shapes here (Decisions D1/D3/D4).
//
// Three concerns live in this file (all browser-safe — `Uint8Array` bytes, no `@twt/domain`
// import; the port stays in contracts, its adapters in platform-adapters — the 6.5 precedent):
//
//   1. The upload wire shapes — the non-file fields the two endpoints accept (the bytes ride the
//      multipart body, NOT a JSON field) + the discriminated upload RESPONSE (parse-success carries
//      the `ParseResultSummary`; the human-fallback path is a first-class response, never an error).
//   2. The `BankStatementStorage` port (Decision D3) — a NEW port mirroring 6.5's `ClaimDocumentStorage`
//      SHAPE, NOT a reuse of that instance (bank statements are not claim-scoped documents; own bucket +
//      key namespace). Private bucket; read via short-lived signed URL only; Tier-1 encrypted at rest.
//   3. The `StatementScanner` port (Task 4 / architecture §3.6 "quarantine") — the virus-scan seam,
//      abstraction-first (a no-op/allow-all fake in v1; no real ClamAV vendor exists yet — the 6.5
//      `OcrProvider` "no boundary gate until a real vendor" posture). The scan runs BEFORE store+parse.
//
// ── Contracts discipline ──────────────────────────────────────────────────────────────────────────
// MUST NOT import `@twt/domain` at source (the browser-bundle rule — [[project_contracts_domain_bundle_boundary]]).
// `BankCodeSchema` is re-used from the sibling `parse-result.ts` (same package; already lockstep-tested
// against the domain `BANK_CODES`). NO `.openapi()` — the multipart routes are hand-documented (6.5 precedent).

import { z } from 'zod';

import { BankCodeSchema, ParseResultSummary } from './parse-result.js';

/**
 * The CSV MIME types the transport parses INLINE (Decision D1 — the 5 v1 banks are CSV-only). A file
 * whose MIME is in this set AND whose bank is allowlisted is parsed inline; ANYTHING ELSE (PDF, image,
 * unknown MIME) is routed to the "Hum aapke liye padh lenge" human fallback — NOT crashed, NOT silently
 * accepted. Mobile pickers report CSV inconsistently (`text/csv`, the legacy `application/vnd.ms-excel`,
 * or a bare `application/octet-stream` for a `.csv`), so the set is deliberately forgiving on the MIME —
 * the parser itself is the real gate (an allowlisted-bank CSV that does not actually parse falls through
 * to the same human fallback). `text/plain` covers Android's frequent `.csv` → `text/plain` mislabel.
 */
export const BANK_STATEMENT_CSV_MIME_TYPES = Object.freeze([
  'text/csv',
  'application/csv',
  'application/vnd.ms-excel',
  'application/octet-stream',
  'text/plain',
]) as readonly string[];

/**
 * The hard byte cap for an uploaded bank statement (5 MiB). A bank statement is a small CSV — a month of
 * transactions is a few hundred KiB at most — so this is generous headroom while rejecting an abusive
 * upload before it reaches object storage. Deliberately SMALLER than the 10 MiB claim-document cap (a
 * death-certificate scan is a multi-MB image; a statement is text). Enforced at the multipart-plugin
 * boundary AND exactly before `put` (defense-in-depth).
 */
export const BANK_STATEMENT_MAX_BYTES = 5 * 1024 * 1024;

/**
 * The non-file fields the upload endpoints accept alongside the multipart file (the bytes ride the
 * multipart body). `bank_code` is the nominee's declared bank (drives parser selection + the fallback
 * routing). `claim_case_id` is present ONLY on the STAFF path (the operator names which claim's pool the
 * statement belongs to; the member path resolves the pool server-side from the Ravi-mode session). Ride
 * the querystring (the 6.5 `documentType` precedent). `.strict()`.
 */
export const BankStatementUploadRequest = z
  .object({
    bank_code: BankCodeSchema,
    /** STAFF path only — the claim whose live pool this statement is filed against. */
    claim_case_id: z.string().uuid().optional(),
  })
  .strict();
export type BankStatementUploadRequest = z.output<typeof BankStatementUploadRequest>;

/**
 * Why an upload took the human-fallback path (a NON-PII machine token the surface maps to dignified,
 * Pattern-4 copy — never "Error/Invalid/Failed"). All three routes are "the file could not be parsed
 * inline" (Decision D1 routing) — 9.3's AC2 offers the fallback only after a failed parse, never as a
 * standalone "request help without a file" entry point (that would be a distinct, un-scoped flow).
 */
export const BankStatementFallbackReason = z.enum([
  'unsupported_file', // a non-CSV upload (PDF / image) — no v1 OCR engine
  'unknown_bank', // a file from a bank outside the 5-bank allowlist
  'parse_failed', // an allowlisted-bank CSV the parser could not normalize (0 rows / a parse throw)
]);
export type BankStatementFallbackReason = z.output<typeof BankStatementFallbackReason>;

/**
 * The human-fallback acknowledgement (AC2/AC3) — a FIRST-CLASS response, never a 4xx error. The upload
 * SUCCEEDED as a request for help: staff will transcribe the statement within the SLA. Carries the SLA
 * marker the surface renders ("we'll read it for you within 24–48 hours") + optionally the parse summary
 * (so a `parse_failed` fallback can still show "0 of N rows read"). `.strict()`.
 */
export const BankStatementFallbackAck = z
  .object({
    reason: BankStatementFallbackReason,
    /** The staff-transcription SLA in hours (the 24–48h AC2 window; the surface renders the range). */
    slaHours: z.number().int().positive(),
    /** Present when a file WAS parsed but yielded nothing usable — the surface can still explain why. */
    summary: ParseResultSummary.optional(),
  })
  .strict();
export type BankStatementFallbackAck = z.output<typeof BankStatementFallbackAck>;

/**
 * The upload endpoint response (HTTP 200 — the parse is SYNCHRONOUS, ~5s; contrast 6.5's async 202 OCR).
 * A discriminated union on `outcome`:
 *   · `parsed`   — an allowlisted-bank CSV normalized inline → the `ParseResultSummary` the surface renders.
 *   · `fallback` — the file could not be parsed (or the nominee asked for help) → the human path is engaged,
 *                  the raw file (if any) is stored, and a staff transcription task was raised. NOT an error.
 * A genuinely REJECTED upload (too large, empty, virus-flagged, bad bank code) is a dignified 4xx, never
 * this body. `.strict()` on each arm.
 */
export const BankStatementUploadResponse = z.discriminatedUnion('outcome', [
  z.object({ outcome: z.literal('parsed'), summary: ParseResultSummary }).strict(),
  z.object({ outcome: z.literal('fallback'), fallback: BankStatementFallbackAck }).strict(),
]);
export type BankStatementUploadResponse = z.output<typeof BankStatementUploadResponse>;

/**
 * The reusable bank-statement object-store port (Decision D3 — a NEW port, NOT a `ClaimDocumentStorage`
 * reuse). A PURE TS interface; the concrete Google Cloud Storage adapter (`asia-south1`, own
 * `BANK_STATEMENT_BUCKET`) is injected, tests inject an in-memory fake. Bytes are `Uint8Array`
 * (browser-safe, so this port stays in contracts). The bucket is PRIVATE — read access is a short-lived
 * signed URL ONLY, never a public ACL. Bank statements are Tier-1 PII (ADR-0034) — encrypted at rest.
 */
export interface BankStatementStorage {
  /**
   * Store `bytes` at `key` with the given content type. `key` is an opaque, non-PII object path the
   * CALLER mints, scoped by pariwar/pool (never PII in the key). Idempotent per key — a re-`put` of the
   * same key overwrites the same object.
   */
  put(key: string, bytes: Uint8Array, opts: { contentType: string }): Promise<void>;
  /**
   * Fetch the stored object bytes at `key`. The Story 9.4 matcher reads the raw statement THIS way to
   * re-parse it deterministically (Decision D2 — 9.3 stores the blob, 9.4 replays it; the bytes are never
   * carried in an event/job payload).
   */
  getBytes(key: string): Promise<Uint8Array>;
  /**
   * Mint a short-lived signed READ URL for `key` (the data-export/6.5 signed-URL precedent). `ttlSeconds`
   * is small — the URL is handed to a staff transcriber and must expire quickly. NEVER long-lived/public.
   */
  signedReadUrl(key: string, ttlSeconds: number): Promise<string>;
  /** Delete the object at `key` (compensation on a failed enqueue / RTBF / hygiene). Optional. */
  delete?(key: string): Promise<void>;
}

/**
 * A virus/malware scan verdict (Task 4). `clean` gates whether the upload proceeds to store+parse; an
 * unclean verdict QUARANTINES (a dignified rejection + an audit line), never stores or parses. `reason`
 * is a NON-PII machine token for the audit trail (`eicar`, `signature:<name>`, …).
 */
export type StatementScanVerdict = { readonly clean: true } | { readonly clean: false; readonly reason: string };

/**
 * The injectable virus-scan port (Task 4 / architecture §3.6 "quarantine"). Abstraction-first — the v1
 * adapter is a no-op/allow-all fake (no real ClamAV/vendor exists yet; the 6.5 `OcrProvider` "no boundary
 * gate until a real vendor" posture). The scan runs BEFORE the `put`/parse in the upload core. When a real
 * vendor lands, only the adapter changes — the port + the upload core + the AR-45 wrapping are already here.
 */
export interface StatementScanner {
  /** Scan `bytes` for malware. Resolves a verdict; an unclean verdict quarantines the upload. */
  scan(bytes: Uint8Array): Promise<StatementScanVerdict>;
}
