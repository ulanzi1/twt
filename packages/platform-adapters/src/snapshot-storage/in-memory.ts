// In-memory SnapshotStorage — Story 7.1 (Task 6).
//
// The fake cold-store for tests + local dev (no live GCS). Holds bytes in a Map keyed by
// object key. Mirrors the Story 6.5 in-memory claim-document-storage fake — the injectable
// seam discipline every adapter in the stack provides.

import { SnapshotNotFoundError, type SnapshotStorage } from '@twt/contracts';

export interface InMemorySnapshotStorage extends SnapshotStorage {
  /** Test introspection: the raw stored objects (key → bytes + contentType). */
  readonly store: Map<string, { bytes: Uint8Array; contentType: string }>;
}

/**
 * Construct an in-memory `SnapshotStorage`. `put` records a DEFENSIVE COPY of the bytes
 * (not the caller's array by reference) — if the caller mutates the `Uint8Array` it
 * passed in after `put()` returns, the stored snapshot must NOT silently change; that
 * would break the determinism/integrity guarantee snapshot storage exists to provide.
 * `getBytes` returns the stored bytes (or throws `SnapshotNotFoundError` if absent —
 * the same not-found signal the real GCS adapter gives).
 */
export function createInMemorySnapshotStorage(): InMemorySnapshotStorage {
  const store = new Map<string, { bytes: Uint8Array; contentType: string }>();
  return {
    store,
    async put(key, bytes, opts) {
      store.set(key, { bytes: bytes.slice(), contentType: opts.contentType });
    },
    async getBytes(key) {
      const entry = store.get(key);
      if (!entry) {
        throw new SnapshotNotFoundError(key);
      }
      return entry.bytes;
    },
  };
}
