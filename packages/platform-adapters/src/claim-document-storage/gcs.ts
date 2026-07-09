// Live Google Cloud Storage ClaimDocumentStorage adapter — Story 6.5 (Task 2, Decision D1).
//
// The concrete object-store adapter for claim documents (death certs — multi-MB PDFs/scans).
// The bucket is PRIVATE (asia-south1 per architecture §5.2); read access is a SHORT-LIVED
// SIGNED URL only, never a public ACL. Mirrors `apps/jobs/src/audit/gcs-mirror-target.ts`
// for client/credential wiring: the `@google-cloud/storage` SDK is dynamically imported so
// importing this module is side-effect-free and the SDK is never pulled into a fake/test run.
//
// Reusable by design (Decision D1): KYC docs / Contribution-Note PDFs / bank statements adopt
// the SAME `ClaimDocumentStorage` port later — this adapter serves any private-bucket blob.
//
// Object keys are opaque, non-PII paths the CALLER mints (scoped by pariwar/claim). This
// adapter never inspects or logs them beyond the GCS API call.

import type { ClaimDocumentStorage } from '@twt/contracts';

export interface GcsClaimDocumentStorageOpts {
  /** The private bucket name (asia-south1). */
  readonly bucketName: string;
  /** Optional explicit GCP project; else Application Default Credentials. */
  readonly projectId?: string;
}

/**
 * Construct a live GCS-backed `ClaimDocumentStorage`. The bucket client is lazily constructed
 * (side-effect-free import); a transient init failure is not permanently cached.
 */
export function createGcsClaimDocumentStorage(
  opts: GcsClaimDocumentStorageOpts,
): ClaimDocumentStorage {
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
      await bucket.file(key).save(Buffer.from(bytes), {
        resumable: false,
        contentType: putOpts.contentType,
      });
    },

    async getBytes(key) {
      const bucket = await getBucket();
      const [buf] = await bucket.file(key).download();
      return new Uint8Array(buf);
    },

    async signedReadUrl(key, ttlSeconds) {
      const bucket = await getBucket();
      const [url] = await bucket.file(key).getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: Date.now() + ttlSeconds * 1000,
      });
      return url;
    },

    async delete(key) {
      const bucket = await getBucket();
      await bucket.file(key).delete({ ignoreNotFound: true });
    },
  };
}
