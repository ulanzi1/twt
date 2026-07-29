// Helpdesk attachment hardening + object-store port — Story 10.2 (Task 1; AC6).
//
// 10.1 shipped `HelpdeskAttachment` as an object-key REFERENCE with a FREE-STRING content_type,
// a free-string filename, and NO size field (the chunk-3 deferred finding). 10.2 closes that gap:
// a bounded, allowlist-validated, path-safe attachment reference + the reusable storage PORT the
// member upload/signed-URL transport is built on (mirrors the Story 6.5 `ClaimDocumentStorage`
// split -- the PURE interface lives here in contracts, the adapters live in platform-adapters).
//
// -- Bundle boundary -----------------------------------------------------------------------------
// Pure Zod + a pure TS interface -- NO `@twt/domain` import ([[project_contracts_domain_bundle_boundary]]).
// The domain event/row shape re-declares the allowlist + count cap (`schema/helpdesk_tickets.ts`);
// the tests/helpdesk.test.ts sync-guard asserts they never drift (the category/state-tuple precedent).

import { z } from 'zod';

/**
 * The attachment MIME allowlist (AC6) -- modeled on `CLAIM_DOCUMENT_ALLOWED_MIME_TYPES`: a helpdesk
 * attachment is a photo (JPEG/PNG) or a PDF, nothing else. Replaces 10.1's free-string content_type.
 * A `const` tuple so it drives BOTH the `z.enum` below and the domain sync-guard.
 */
export const HELPDESK_ATTACHMENT_ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'application/pdf'] as const;
export type HelpdeskAttachmentMimeType = (typeof HELPDESK_ATTACHMENT_ALLOWED_MIME_TYPES)[number];

/** The per-file hard byte cap (10 MiB) -- the `CLAIM_DOCUMENT_MAX_BYTES` model. Enforced at the wire
 *  schema AND (defense-in-depth) at the multipart boundary + before the storage `put`. */
export const HELPDESK_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;

/**
 * The max attachment count per ticket (AC6). LOWERS 10.1's `CreateTicketRequest.attachments.max(10)`
 * to 5 -- a member support ticket needs a handful of photos/PDFs, not ten -- and, unlike 10.1, is
 * applied CONSISTENTLY on the persisted `HelpdeskTicketDto.attachments` too (which 10.1 left uncapped).
 */
export const HELPDESK_ATTACHMENT_MAX_COUNT = 5;

/** The allowlist-validated content-type (AC6) -- replaces 10.1's free `.max(255)` string. */
export const HelpdeskAttachmentContentType = z.enum(HELPDESK_ATTACHMENT_ALLOWED_MIME_TYPES);
export type HelpdeskAttachmentContentType = z.output<typeof HelpdeskAttachmentContentType>;

// ASCII control chars (0x00-0x1F + 0x7F) -- never part of a legitimate filename. Built via the
// RegExp constructor from an escaped string so the source file stays free of literal control bytes.
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = new RegExp('[\\u0000-\\u001F\\u007F]', 'g');
const PATH_SEPARATORS = /[/\\]/;
const WHITESPACE_RUN = /\s+/g;

/**
 * Sanitize an uploaded filename before it reaches object storage or a signed URL (AC6). PURE +
 * deterministic. Strips any path component (keeps only the basename), removes control characters,
 * collapses whitespace, and bounds the length. A name that sanitizes to empty falls back to a safe
 * default. NEVER throws -- a hostile filename yields a safe one, so the upload proceeds with a
 * harmless name rather than being rejected on a cosmetic field.
 *
 * Examples: `../../etc/passwd` -> `passwd`; `a/b\c.png` -> `c.png`; a control-char name -> sanitized.
 */
export function sanitizeAttachmentFilename(raw: string): string {
  // Keep only the final path segment (defeats `../`, absolute paths, and Windows `\` separators).
  const basename = raw.split(PATH_SEPARATORS).pop() ?? '';
  const cleaned = basename.replace(CONTROL_CHARS, '').replace(WHITESPACE_RUN, ' ').trim();
  const bounded = cleaned.slice(0, 255);
  return bounded.length > 0 ? bounded : 'attachment';
}

/**
 * The reusable helpdesk-attachment object-store port (AC6) -- the PURE interface, mirroring the
 * `ClaimDocumentStorage` split (Story 6.5): the browser-safe interface lives in contracts, the
 * in-memory/local-fs/gcs adapters live in `platform-adapters`. Bytes are `Uint8Array` (browser-safe).
 * The bucket is PRIVATE -- member read access is a SHORT-LIVED signed URL only, never a public ACL.
 *
 * `getBytes` is deliberately OMITTED (unlike `ClaimDocumentStorage`): a helpdesk attachment has no
 * server-side re-fetch consumer (no OCR/parity re-read) -- it is only ever handed to the OWNING member
 * as a signed URL. Add it on the first story that needs a byte re-fetch, not speculatively.
 */
export interface HelpdeskAttachmentStorage {
  /**
   * Store `bytes` at `key` with the given content type. `key` is an opaque, non-PII object path the
   * caller mints (scoped by pariwar/ticket). Idempotent per key -- a re-`put` overwrites the object.
   */
  put(key: string, bytes: Uint8Array, opts: { contentType: string }): Promise<void>;
  /**
   * Mint a short-lived signed READ URL for `key`. `ttlSeconds` is small -- the URL is handed to the
   * owning member's ticket-detail screen and must expire quickly. NEVER long-lived or public.
   */
  signedReadUrl(key: string, ttlSeconds: number): Promise<string>;
  /** Delete the object at `key` (best-effort orphan cleanup on a failed create). Optional. */
  delete?(key: string): Promise<void>;
}
