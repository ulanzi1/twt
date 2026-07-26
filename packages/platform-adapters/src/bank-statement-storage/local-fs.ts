// Local-filesystem BankStatementStorage — Story 9.3 (Task 1, Decision D3).
//
// The dev/CI fallback when `BANK_STATEMENT_BUCKET` is unset. Persists bytes to a SHARED directory on disk
// so separate local processes (apps/api's upload + a future apps/jobs matcher re-reading the blob per
// Decision D2) resolve to the SAME object — the same reasoning as the 6.5 local-fs claim-document adapter
// (an in-process Map is invisible across processes). `signedReadUrl` returns a deterministic non-secret
// `file://` URL. Local dev / CI only; production always sets `BANK_STATEMENT_BUCKET` (the live GCS adapter).

import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, normalize, resolve } from 'node:path';

import type { BankStatementStorage } from '@twt/contracts';

export interface LocalFsBankStatementStorageOpts {
  /** The shared root directory. Defaults to a fixed path under the OS temp dir so separate local
   *  processes resolve to the SAME location without extra config. */
  readonly rootDir?: string;
}

const DEFAULT_ROOT_DIR = join(tmpdir(), 'twt-bank-statements-dev');

function metaPath(objectPath: string): string {
  return `${objectPath}.meta.json`;
}

/**
 * Construct a filesystem-backed `BankStatementStorage`. Object keys (always caller-minted, opaque
 * `pariwar/.../pool/.../<uuid>` paths — never user input) map to a nested file path under `rootDir`; a
 * `.meta.json` sidecar carries the content type. Writes are atomic (temp file + rename) so a concurrent
 * `getBytes` never observes a partial write.
 */
export function createLocalFsBankStatementStorage(
  opts: LocalFsBankStatementStorageOpts = {},
): BankStatementStorage {
  const rootDir = resolve(opts.rootDir ?? DEFAULT_ROOT_DIR);

  function resolveObjectPath(key: string): string {
    const p = normalize(join(rootDir, key));
    if (p !== rootDir && !p.startsWith(rootDir + '/')) {
      // Defense-in-depth: keys are always caller-minted opaque paths, never raw user input, but never
      // resolve outside rootDir regardless.
      throw new Error(`[local-fs-bank-statement-storage] key escapes root: '${key}'`);
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
          throw new Error(`[local-fs-bank-statement-storage] no object at key '${key}'`);
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
