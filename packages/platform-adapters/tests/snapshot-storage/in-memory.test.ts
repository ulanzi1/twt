// In-memory SnapshotStorage — Story 7.1 (Task 6). Proves the port's write/read-by-key
// seam round-trips exact bytes, overwrites on re-put, and signals not-found on a miss —
// the injectable fake the (deferred) dump job + the replay-migration harness stand on.

import { SnapshotNotFoundError } from '@twt/contracts';
import { describe, expect, it } from 'vitest';

import { createInMemorySnapshotStorage } from '../../src/snapshot-storage/in-memory.js';

const bytesOf = (s: string): Uint8Array => new TextEncoder().encode(s);

describe('createInMemorySnapshotStorage', () => {
  it('put → getBytes round-trips the exact bytes', async () => {
    const store = createInMemorySnapshotStorage();
    const key = 'pariwar-a/pool-1/2026-07-17T00:00:00Z.json';
    const payload = bytesOf('{"format_version":1,"pool_id":"x"}');
    await store.put(key, payload, { contentType: 'application/json' });
    expect(await store.getBytes(key)).toEqual(payload);
    expect(store.store.get(key)?.contentType).toBe('application/json');
  });

  it('re-put of the same key overwrites', async () => {
    const store = createInMemorySnapshotStorage();
    const key = 'k';
    await store.put(key, bytesOf('v1'), { contentType: 'application/json' });
    await store.put(key, bytesOf('v2'), { contentType: 'application/json' });
    expect(new TextDecoder().decode(await store.getBytes(key))).toBe('v2');
  });

  it('getBytes on a missing key throws SnapshotNotFoundError (the shared not-found signal)', async () => {
    const store = createInMemorySnapshotStorage();
    await expect(store.getBytes('nope')).rejects.toThrow(SnapshotNotFoundError);
    await expect(store.getBytes('nope')).rejects.toThrow(/no object at key/);
  });

  it('put stores a defensive COPY — caller mutating its array after put() does not change stored bytes', async () => {
    const store = createInMemorySnapshotStorage();
    const key = 'k';
    const mutable = bytesOf('v1');
    await store.put(key, mutable, { contentType: 'application/json' });
    mutable[0] = 0; // mutate the caller's array AFTER put() returns
    expect(new TextDecoder().decode(await store.getBytes(key))).toBe('v1');
  });
});
