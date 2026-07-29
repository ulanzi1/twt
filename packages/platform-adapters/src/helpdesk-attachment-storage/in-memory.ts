// In-memory HelpdeskAttachmentStorage — Story 10.2 (Task 2; AC6).
//
// The fake object store for tests + local dev (no live GCS). Holds bytes in a Map keyed by object
// key; `signedReadUrl` returns a deterministic `memory://` URL (never a real signed URL). Mirrors
// the claim-document-storage in-memory fake, minus `getBytes` (no helpdesk re-fetch consumer).

import type { HelpdeskAttachmentStorage } from '@twt/contracts';

export interface InMemoryHelpdeskAttachmentStorage extends HelpdeskAttachmentStorage {
  /** Test introspection: the raw stored objects (key → bytes + contentType). */
  readonly store: Map<string, { bytes: Uint8Array; contentType: string }>;
}

/**
 * Construct an in-memory `HelpdeskAttachmentStorage`. `put` records the bytes; `signedReadUrl`
 * returns a deterministic non-secret `memory://` URL; `delete` drops the key.
 */
export function createInMemoryHelpdeskAttachmentStorage(): InMemoryHelpdeskAttachmentStorage {
  const store = new Map<string, { bytes: Uint8Array; contentType: string }>();
  return {
    store,
    async put(key, bytes, opts) {
      store.set(key, { bytes, contentType: opts.contentType });
    },
    async signedReadUrl(key, ttlSeconds) {
      return `memory://helpdesk-attachments/${encodeURIComponent(key)}?ttl=${ttlSeconds}`;
    },
    async delete(key) {
      store.delete(key);
    },
  };
}
