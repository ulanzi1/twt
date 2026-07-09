// Local-filesystem ClaimDocumentStorage — Story 6.5 (Task 2; post-review fix).
//
// The dev/CI fallback when `CLAIM_DOCUMENT_BUCKET` is unset. `apps/api` and `apps/jobs` are
// SEPARATE OS processes, so the earlier in-memory (`Map`-backed) fallback was invisible across
// them: bytes `put` by the upload endpoint lived in the api process's Map, and the jobs worker's
// own empty Map threw "no object at key" on every real local upload. This adapter persists bytes
// to a SHARED directory on disk instead, so both processes see the same object. `signedReadUrl`
// returns a deterministic non-secret `file://` URL (never a real signed URL) — the same
// disclosure discipline as the in-memory fake's `memory://` URL. Intended for local dev / CI
// only; production always sets `CLAIM_DOCUMENT_BUCKET` (the live GCS adapter).

import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, normalize, resolve } from 'node:path';

import type { ClaimDocumentStorage } from '@twt/contracts';

export interface LocalFsClaimDocumentStorageOpts {
  /** The shared root directory. Defaults to a fixed path under the OS temp dir so separate
   *  local processes (api + jobs) resolve to the SAME location without extra config. */
  readonly rootDir?: string;
}

const DEFAULT_ROOT_DIR = join(tmpdir(), 'twt-claim-documents-dev');

function metaPath(objectPath: string): string {
  return `${objectPath}.meta.json`;
}

/**
 * Construct a filesystem-backed `ClaimDocumentStorage`. Object keys (always caller-minted,
 * opaque `pariwar/.../claim/.../<uuid>` paths — never user input) map directly to a nested
 * file path under `rootDir`; a `.meta.json` sidecar carries the content type. Writes are
 * atomic (write to a temp file, then rename) so a concurrent `getBytes` never observes a
 * partial write.
 */
export function createLocalFsClaimDocumentStorage(
  opts: LocalFsClaimDocumentStorageOpts = {},
): ClaimDocumentStorage {
  const rootDir = resolve(opts.rootDir ?? DEFAULT_ROOT_DIR);

  function resolveObjectPath(key: string): string {
    const p = normalize(join(rootDir, key));
    if (p !== rootDir && !p.startsWith(rootDir + '/')) {
      // Defense-in-depth: keys are always caller-minted opaque paths, never raw user input,
      // but never resolve outside rootDir regardless.
      throw new Error(`[local-fs-claim-document-storage] key escapes root: '${key}'`);
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

    async getBytes(key) {
      const objectPath = resolveObjectPath(key);
      try {
        return new Uint8Array(await readFile(objectPath));
      } catch (err) {
        const code = (err as { code?: string }).code;
        if (code === 'ENOENT') {
          throw new Error(`[local-fs-claim-document-storage] no object at key '${key}'`);
        }
        throw err;
      }
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
  };
}
