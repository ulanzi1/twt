// Local-filesystem HelpdeskAttachmentStorage — Story 10.2 (Task 2; AC6).
//
// The dev/CI fallback when `HELPDESK_ATTACHMENT_BUCKET` is unset. Persists bytes to a SHARED
// directory on disk (the same cross-process reasoning as claim-document-storage/local-fs: apps/api
// and any future worker are separate OS processes, so an in-process Map would be invisible across
// them). `signedReadUrl` returns a deterministic non-secret `file://` URL. Dev/CI only — production
// always sets `HELPDESK_ATTACHMENT_BUCKET` (the live GCS adapter). No `getBytes` (no re-fetch consumer).

import { randomUUID } from 'node:crypto';
import { mkdir, rename, rm, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, normalize, resolve } from 'node:path';

import type { HelpdeskAttachmentStorage } from '@twt/contracts';

export interface LocalFsHelpdeskAttachmentStorageOpts {
  /** The shared root directory. Defaults to a fixed path under the OS temp dir so separate local
   *  processes resolve to the SAME location without extra config. */
  readonly rootDir?: string;
}

const DEFAULT_ROOT_DIR = join(tmpdir(), 'twt-helpdesk-attachments-dev');

function metaPath(objectPath: string): string {
  return `${objectPath}.meta.json`;
}

/**
 * Construct a filesystem-backed `HelpdeskAttachmentStorage`. Object keys (always caller-minted,
 * opaque `pariwar/.../ticket/.../<uuid>` paths — never raw user input) map to a nested file path
 * under `rootDir`; a `.meta.json` sidecar carries the content type. Writes are atomic (temp file +
 * rename).
 */
export function createLocalFsHelpdeskAttachmentStorage(
  opts: LocalFsHelpdeskAttachmentStorageOpts = {},
): HelpdeskAttachmentStorage {
  const rootDir = resolve(opts.rootDir ?? DEFAULT_ROOT_DIR);

  function resolveObjectPath(key: string): string {
    const p = normalize(join(rootDir, key));
    if (p !== rootDir && !p.startsWith(rootDir + '/')) {
      // Defense-in-depth: keys are always caller-minted opaque paths, never raw user input, but
      // never resolve outside rootDir regardless.
      throw new Error(`[local-fs-helpdesk-attachment-storage] key escapes root: '${key}'`);
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
  };
}
