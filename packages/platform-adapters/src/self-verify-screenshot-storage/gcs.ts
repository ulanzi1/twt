// Live Google Cloud Storage SelfVerifyScreenshotStorage adapter — Story 9.7 (Task 2, Decision D1).
//
// The concrete object-store adapter for member self-verify payment screenshots (Tier-1 images/PDFs). The
// bucket is PRIVATE (`asia-south1` per architecture §5.2); read access is a SHORT-LIVED SIGNED URL only,
// never a public ACL. Mirrors the 6.5 / 9.3 GCS adapters: the `@google-cloud/storage` SDK is dynamically
// imported so importing this module is side-effect-free and the SDK is never pulled into a fake/test run.
//
// A NEW port instance, NOT a `ClaimDocumentStorage` / `BankStatementStorage` reuse (Decision D1): self-verify
// screenshots get their OWN `SELF_VERIFY_SCREENSHOT_BUCKET`, a separate key namespace, and their own
// retention/lifecycle policy. Object keys are opaque, non-PII paths the CALLER mints (scoped by
// pariwar/pool); this adapter never inspects or logs them beyond the GCS API call.

import type { SelfVerifyScreenshotStorage } from '@twt/contracts';

export interface GcsSelfVerifyScreenshotStorageOpts {
  /** The private bucket name (asia-south1). */
  readonly bucketName: string;
  /** Optional explicit GCP project; else Application Default Credentials. */
  readonly projectId?: string;
}

/**
 * Construct a live GCS-backed `SelfVerifyScreenshotStorage`. The bucket client is lazily constructed
 * (side-effect-free import); a transient init failure is not permanently cached.
 */
export function createGcsSelfVerifyScreenshotStorage(
  opts: GcsSelfVerifyScreenshotStorageOpts,
): SelfVerifyScreenshotStorage {
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
