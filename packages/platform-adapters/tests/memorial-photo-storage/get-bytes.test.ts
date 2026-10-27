// Story 11b.4a (MP4, AC4) — `MemorialPhotoStorage.getBytes` in ALL THREE adapters: the stored bytes, or `null` for a missing
// object (⚠ a departure from `ClaimDocumentStorage.getBytes`, which throws); any OTHER storage fault still throws.

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { createInMemoryMemorialPhotoStorage } from '../../src/memorial-photo-storage/in-memory.js';
import { createLocalFsMemorialPhotoStorage } from '../../src/memorial-photo-storage/local-fs.js';

const BYTES = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);
const KEY = 'pariwar/p/memorial/s/photo';

describe('getBytes — in-memory and local-fs', () => {
  let dir: string | null = null;
  afterEach(async () => {
    if (dir) await rm(dir, { recursive: true, force: true });
    dir = null;
  });

  it('in-memory: the bytes put, `null` for a missing key and after delete', async () => {
    const s = createInMemoryMemorialPhotoStorage();
    expect(await s.getBytes(KEY)).toBeNull();
    await s.put(KEY, BYTES, { contentType: 'image/jpeg' });
    expect(await s.getBytes(KEY)).toEqual(BYTES);
    await s.delete(KEY);
    expect(await s.getBytes(KEY)).toBeNull();
  });

  it('local-fs: the bytes put, `null` (⛔ a throw) for a missing object and after delete; a key escaping the root still throws', async () => {
    dir = await mkdtemp(join(tmpdir(), 'memorial-photo-'));
    const s = createLocalFsMemorialPhotoStorage({ rootDir: dir });
    expect(await s.getBytes(KEY)).toBeNull();
    await s.put(KEY, BYTES, { contentType: 'image/jpeg' });
    expect(new Uint8Array(await s.getBytes(KEY) ?? [])).toEqual(BYTES);
    await s.delete(KEY);
    expect(await s.getBytes(KEY)).toBeNull();
    await expect(s.getBytes('../../etc/passwd')).rejects.toThrow(/escapes root/);
  });
});

describe('getBytes — GCS (the SDK mocked)', () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock('@google-cloud/storage');
  });

  async function gcsWith(download: () => Promise<[Buffer]>) {
    vi.doMock('@google-cloud/storage', () => ({
      Storage: class {
        bucket() {
          return { file: () => ({ download }) };
        }
      },
    }));
    const { createGcsMemorialPhotoStorage } = await import('../../src/memorial-photo-storage/gcs.js');
    return createGcsMemorialPhotoStorage({ bucketName: 'b' });
  }

  it('the downloaded bytes', async () => {
    const s = await gcsWith(async () => [Buffer.from(BYTES)]);
    expect(await s.getBytes(KEY)).toEqual(BYTES);
  });

  it('a 404 from `download()` ⇒ `null` (⛔ `ignoreNotFound` — that is a delete option)', async () => {
    const s = await gcsWith(async () => {
      throw Object.assign(new Error('No such object'), { code: 404 });
    });
    expect(await s.getBytes(KEY)).toBeNull();
  });

  it('any other fault RE-THROWS (the route logs it and answers its empty 404)', async () => {
    const s = await gcsWith(async () => {
      throw Object.assign(new Error('forbidden'), { code: 403 });
    });
    await expect(s.getBytes(KEY)).rejects.toThrow('forbidden');
  });
});
