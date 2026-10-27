// Live Google Cloud Storage MemorialPhotoStorage adapter — Story 11b.4 (MA8; the Story 10.2 helpdesk-attachment adapter's
// shape, a NEW port instance — each purpose its own port).
//
// The family memorial's optional photo (JPEG/PNG, metadata-stripped at ingest). The bucket is PRIVATE (from
// `MEMORIAL_PHOTO_BUCKET`; ⛔ no Terraform bucket — the helpdesk env-only precedent); read access is a SHORT-LIVED SIGNED URL
// only (5 minutes, audited), never a public ACL — ⛔ nothing in this row serves the bytes publicly (row 11b-4a). The
// `@google-cloud/storage` SDK is dynamically imported so importing this module is side-effect-free.

import type { MemorialPhotoStorage } from '@twt/contracts';

export interface GcsMemorialPhotoStorageOpts {
  /** The private bucket name (asia-south1). */
  readonly bucketName: string;
  /** Optional explicit GCP project; else Application Default Credentials. */
  readonly projectId?: string;
}

/**
 * Construct a live GCS-backed `MemorialPhotoStorage`. The bucket client is lazily constructed
 * (side-effect-free import); a transient init failure is not permanently cached.
 */
export function createGcsMemorialPhotoStorage(
  opts: GcsMemorialPhotoStorageOpts,
): MemorialPhotoStorage {
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

    // Story 11b.4a (MP4) — `download()` REJECTS a missing object with a 404 `ApiError` (`ignoreNotFound` is a DELETE option,
    // ⛔ not a read one) ⇒ caught HERE and answered `null`; any other fault re-throws (the route logs it and 404s).
    async getBytes(key) {
      const bucket = await getBucket();
      try {
        const [buf] = await bucket.file(key).download();
        return new Uint8Array(buf);
      } catch (err) {
        if ((err as { code?: unknown }).code === 404) return null;
        throw err;
      }
    },
  };
}
