// In-memory SelfVerifyScreenshotStorage — Story 9.7 (Task 2, Decision D1).
//
// The fake object store for tests + local dev (no live GCS). Holds bytes in a Map keyed by object key;
// `signedReadUrl` returns a deterministic `memory://` URL (never a real signed URL). Mirrors the 6.5 / 9.3
// in-memory fakes exactly — the injectable-seam discipline every store in the stack provides. NOTE: an
// in-process Map is invisible ACROSS processes (apps/api vs a future apps/jobs / Story 9.8 reviewer), so
// production/local-dev use the GCS / local-fs adapters; this fake is for single-process test runs.

import type { SelfVerifyScreenshotStorage } from '@twt/contracts';

export interface InMemorySelfVerifyScreenshotStorage extends SelfVerifyScreenshotStorage {
  /** Test introspection: the raw stored objects (key → bytes + contentType). */
  readonly store: Map<string, { bytes: Uint8Array; contentType: string }>;
}

/**
 * Construct an in-memory `SelfVerifyScreenshotStorage`. `put` records the bytes; `getBytes` returns them
 * (or throws if absent — the same not-found signal a real adapter gives); `signedReadUrl` returns a
 * deterministic non-secret `memory://` URL; `delete` drops the key.
 */
export function createInMemorySelfVerifyScreenshotStorage(): InMemorySelfVerifyScreenshotStorage {
  const store = new Map<string, { bytes: Uint8Array; contentType: string }>();
  return {
    store,
    async put(key, bytes, opts) {
      store.set(key, { bytes, contentType: opts.contentType });
    },
    async getBytes(key) {
      const entry = store.get(key);
      if (!entry) {
        throw new Error(`[in-memory-self-verify-screenshot-storage] no object at key '${key}'`);
      }
      return entry.bytes;
    },
    async signedReadUrl(key, ttlSeconds) {
      return `memory://self-verify-screenshots/${encodeURIComponent(key)}?ttl=${ttlSeconds}`;
    },
    async delete(key) {
      store.delete(key);
    },
  };
}
