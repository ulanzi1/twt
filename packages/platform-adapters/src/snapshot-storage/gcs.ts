// Live Google Cloud Storage SnapshotStorage adapter — Story 7.1 (Task 6, AC3).
//
// The concrete cold-tier object-store adapter for pool snapshots (small canonical-JSON
// blobs). The bucket is PRIVATE + IAM-isolated (architecture §5.2); Object Retention
// Lock is BUCKET config, committed via infra/ADR — this adapter NEVER sets retention at
// write time (AC3). Mirrors the Story 6.5 `createGcsClaimDocumentStorage` client wiring:
// the `@google-cloud/storage` SDK is dynamically imported so importing this module is
// side-effect-free and the SDK is never pulled into a fake/test run.
//
// Object keys are opaque, non-PII paths the CALLER mints (scoped by pariwar/pool/instant).
// This adapter never inspects or logs them beyond the GCS API call. It exposes ONLY the
// write/read seam — it does NOT schedule dumps or provision buckets (the deferred
// infra/jobs story owns those, calling through this port).

import { SnapshotNotFoundError, type SnapshotStorage } from '@twt/contracts';

/** True iff `err` is the GCS SDK's not-found error (`ApiError` with HTTP 404). */
function isGcsNotFoundError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: unknown }).code === 404;
}

export interface GcsSnapshotStorageOpts {
  /** The private, IAM-isolated bucket name (Object Retention Lock is bucket config). */
  readonly bucketName: string;
  /** Optional explicit GCP project; else Application Default Credentials. */
  readonly projectId?: string;
}

/**
 * Construct a live GCS-backed `SnapshotStorage`. The bucket client is lazily constructed
 * (side-effect-free import); a transient init failure is not permanently cached.
 */
export function createGcsSnapshotStorage(opts: GcsSnapshotStorageOpts): SnapshotStorage {
  let bucketPromise: Promise<import('@google-cloud/storage').Bucket> | null = null;

  async function getBucket(): Promise<import('@google-cloud/storage').Bucket> {
    if (!bucketPromise) {
      bucketPromise = (async () => {
        const { Storage } = await import('@google-cloud/storage');
        const storage = new Storage(opts.projectId ? { projectId: opts.projectId } : {});
        return storage.bucket(opts.bucketName);
      })();
      bucketPromise.catch(() => {
        bucketPromise = null;
      });
    }
    return bucketPromise;
  }

  return {
    async put(key, bytes, putOpts) {
      const bucket = await getBucket();
      // NEVER set retention here — Object Retention Lock is bucket-level config (AC3).
      await bucket.file(key).save(Buffer.from(bytes), {
        resumable: false,
        contentType: putOpts.contentType,
      });
    },

    async getBytes(key) {
      const bucket = await getBucket();
      try {
        const [buf] = await bucket.file(key).download();
        return new Uint8Array(buf);
      } catch (err) {
        if (isGcsNotFoundError(err)) throw new SnapshotNotFoundError(key);
        throw err;
      }
    },
  };
}
