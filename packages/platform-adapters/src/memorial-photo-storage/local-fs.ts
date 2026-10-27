// Filesystem-backed MemorialPhotoStorage — Story 11b.4 (MA8). The dev / CI fallback when `MEMORIAL_PHOTO_BUCKET` is unset
// (the helpdesk-attachment precedent): a shared root under the OS temp dir, atomic writes, a `.meta.json` sidecar.

import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, normalize, resolve } from 'node:path';

import type { MemorialPhotoStorage } from '@twt/contracts';

export interface LocalFsMemorialPhotoStorageOpts {
  /** The shared root directory. Defaults to a fixed path under the OS temp dir so separate local
   *  processes resolve to the SAME location without extra config. */
  readonly rootDir?: string;
}

const DEFAULT_ROOT_DIR = join(tmpdir(), 'twt-memorial-photos-dev');

function metaPath(objectPath: string): string {
  return `${objectPath}.meta.json`;
}

/**
 * Construct a filesystem-backed `MemorialPhotoStorage`. Object keys (always caller-minted,
 * opaque `pariwar/.../memorial/<uuid>` paths — never raw user input) map to a nested file path
 * under `rootDir`; a `.meta.json` sidecar carries the content type. Writes are atomic (temp file +
 * rename).
 */
export function createLocalFsMemorialPhotoStorage(
  opts: LocalFsMemorialPhotoStorageOpts = {},
): MemorialPhotoStorage {
  const rootDir = resolve(opts.rootDir ?? DEFAULT_ROOT_DIR);

  function resolveObjectPath(key: string): string {
    const p = normalize(join(rootDir, key));
    if (p !== rootDir && !p.startsWith(rootDir + '/')) {
      // Defense-in-depth: keys are always caller-minted opaque paths, never raw user input, but
      // never resolve outside rootDir regardless.
      throw new Error(`[local-fs-memorial-photo-storage] key escapes root: '${key}'`);
    }
    return p;
  }

  return {
    async put(key, bytes, putOpts) {
      const objectPath = resolveObjectPath(key);
      await mkdir(dirname(objectPath), { recursive: true });
      const tmpPath = `${objectPath}.${randomUUID()}.tmp`;
      await writeFile(tmpPath, bytes);
      await rename(tmpPath, objectPath);
      await writeFile(metaPath(objectPath), JSON.stringify({ contentType: putOpts.contentType }));
    },

    async signedReadUrl(key, ttlSeconds) {
      const objectPath = resolveObjectPath(key);
      return `file://${objectPath}?ttl=${ttlSeconds}`;
    },

    async delete(key) {
      const objectPath = resolveObjectPath(key);
      await unlink(objectPath).catch((err: unknown) => {
        if ((err as { code?: string }).code !== 'ENOENT') throw err;
      });
      await rm(metaPath(objectPath), { force: true });
    },

    // Story 11b.4a (MP4) — `null` on ENOENT; any other fault re-throws.
    async getBytes(key) {
      const objectPath = resolveObjectPath(key);
      try {
        return new Uint8Array(await readFile(objectPath));
      } catch (err) {
        if ((err as { code?: string }).code === 'ENOENT') return null;
        throw err;
      }
    },
  };
}
