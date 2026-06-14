// Live GCS MirrorTarget — Story 1.10 Task 8 (DD-5, AC-3/AC-4).
//
// Loaded ONLY in MIRROR_MODE=live (dynamically imported by mirror.ts) so the
// @google-cloud/storage SDK is never pulled into fake/test runs. Writes one
// append-only object per segment to the Object-Retention-Locked bucket in the
// SEPARATE twt-audit-mirror project, authenticating with the write-only mirror
// service account (roles/storage.objectCreator — no read/delete/overwrite).
//
// ⚠ No-overwrite is enforced two ways (defense-in-depth): the bucket's Object
// Retention Lock (Terraform) AND the `ifGenerationMatch: 0` precondition here
// (the upload fails with 412 if the object already exists). `resumable: false`
// uses the simple single-shot upload — segments are small (§ latest-tech note).
// `@google-cloud/storage` is v7 (Node 18+, ESM-friendly), pinned to the
// workspace Node (20.x).

import type { MirrorTarget } from './mirror.js';

export function createGcsMirrorTarget(opts: {
  bucketName: string;
  /** Optional explicit project for the mirror (twt-audit-mirror); else ADC default. */
  projectId?: string;
}): MirrorTarget {
  // Lazily construct the client so importing this module is side-effect-free.
  let bucketPromise: Promise<import('@google-cloud/storage').Bucket> | null = null;

  async function getBucket(): Promise<import('@google-cloud/storage').Bucket> {
    if (!bucketPromise) {
      bucketPromise = (async () => {
        const { Storage } = await import('@google-cloud/storage');
        const storage = new Storage(opts.projectId ? { projectId: opts.projectId } : {});
        return storage.bucket(opts.bucketName);
      })();
      // Clear on rejection so a transient init error (bad credentials, import failure)
      // does not permanently cache the rejected promise for all subsequent putObject calls.
      bucketPromise.catch(() => { bucketPromise = null; });
    }
    return bucketPromise;
  }

  return {
    async putObject(objectName: string, body: Buffer): Promise<void> {
      const bucket = await getBucket();
      await bucket.file(objectName).save(body, {
        resumable: false,
        contentType: 'application/x-ndjson',
        // Fail (412) if the object already exists — never overwrite a locked object.
        preconditionOpts: { ifGenerationMatch: 0 },
      });
    },
  };
}
