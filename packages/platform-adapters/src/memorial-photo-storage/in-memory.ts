// In-memory MemorialPhotoStorage — Story 11b.4 (MA8). Tests only: records the bytes, returns a deterministic non-secret
// `memory://` URL, drops a key on delete.

import type { MemorialPhotoStorage } from '@twt/contracts';

export interface InMemoryMemorialPhotoStorage extends MemorialPhotoStorage {
  /** Test introspection: the raw stored objects (key → bytes + contentType). */
  readonly store: Map<string, { bytes: Uint8Array; contentType: string }>;
}

/**
 * Construct an in-memory `MemorialPhotoStorage`. `put` records the bytes; `signedReadUrl`
 * returns a deterministic non-secret `memory://` URL; `delete` drops the key.
 */
export function createInMemoryMemorialPhotoStorage(): InMemoryMemorialPhotoStorage {
  const store = new Map<string, { bytes: Uint8Array; contentType: string }>();
  return {
    store,
    async put(key, bytes, opts) {
      store.set(key, { bytes, contentType: opts.contentType });
    },
    async signedReadUrl(key, ttlSeconds) {
      return `memory://memorial-photos/${encodeURIComponent(key)}?ttl=${ttlSeconds}`;
    },
    async delete(key) {
      store.delete(key);
    },
  };
}
