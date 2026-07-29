// Live Google Cloud Storage HelpdeskAttachmentStorage adapter — Story 10.2 (Task 2; AC6).
//
// The concrete object-store adapter for helpdesk attachments (member-uploaded photos/PDFs). The
// bucket is PRIVATE (asia-south1 per architecture §5.2); read access is a SHORT-LIVED SIGNED URL
// only, never a public ACL. Mirrors the claim-document GCS adapter's client/credential wiring: the
// `@google-cloud/storage` SDK is dynamically imported so importing this module is side-effect-free
// and the SDK is never pulled into a fake/test run. No `getBytes` (no re-fetch consumer).

import type { HelpdeskAttachmentStorage } from '@twt/contracts';

export interface GcsHelpdeskAttachmentStorageOpts {
  /** The private bucket name (asia-south1). */
  readonly bucketName: string;
  /** Optional explicit GCP project; else Application Default Credentials. */
  readonly projectId?: string;
}

/**
 * Construct a live GCS-backed `HelpdeskAttachmentStorage`. The bucket client is lazily constructed
 * (side-effect-free import); a transient init failure is not permanently cached.
 */
export function createGcsHelpdeskAttachmentStorage(
  opts: GcsHelpdeskAttachmentStorageOpts,
): HelpdeskAttachmentStorage {
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
