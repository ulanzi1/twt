// packages/contracts/src/memorial/photo-storage.ts
//
// The family memorial's PHOTO object-store port (Story 11b.4, MA8 — `#decision-2026-10-24-398`). Each purpose its own
// port (the `HelpdeskAttachmentStorage` precedent): the browser-safe interface lives here, the in-memory / local-fs / gcs
// adapters in `platform-adapters/src/memorial-photo-storage/`. Bytes are `Uint8Array`.
//
// The bucket is PRIVATE: the family (their own photo) and the reviewer read it ONLY through a short-lived (5-minute)
// signed URL, each issue audited (`memorial.photo.url`). ⚠ ⛔ Nothing in this row serves the bytes publicly — the public
// image pipeline is row 11b-4a's. The object key is opaque, non-PII, server-minted and ⛔ never on the wire. The bytes
// written are already METADATA-STRIPPED (`apps/api/src/modules/memorial/photo-metadata.ts` runs before `put`).

export interface MemorialPhotoStorage {
  /** Store `bytes` at `key` with the given content type (overwrite-safe — the key is a fresh UUID per Send). */
  put(key: string, bytes: Uint8Array, opts: { contentType: string }): Promise<void>;
  /** A time-limited signed read URL for `key` (the private bucket's only read path). */
  signedReadUrl(key: string, ttlSeconds: number): Promise<string>;
  /** Delete `key` — failure cleanup of THIS request's own `put`, and the erasure (MA15). Best-effort by the caller. */
  delete(key: string): Promise<void>;
}

/** The signed URL's lifetime (MA8 — 5 minutes). */
export const MEMORIAL_PHOTO_URL_TTL_SECONDS = 300;
