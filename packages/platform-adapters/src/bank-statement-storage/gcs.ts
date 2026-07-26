// Live Google Cloud Storage BankStatementStorage adapter — Story 9.3 (Task 1, Decision D3).
//
// The concrete object-store adapter for bank statements (small Tier-1 CSVs). The bucket is PRIVATE
// (`asia-south1` per architecture §5.2); read access is a SHORT-LIVED SIGNED URL only, never a public
// ACL. Mirrors the 6.5 GCS `ClaimDocumentStorage` adapter: the `@google-cloud/storage` SDK is dynamically
// imported so importing this module is side-effect-free and the SDK is never pulled into a fake/test run.
//
// A NEW port instance, NOT a `ClaimDocumentStorage` reuse (Decision D3): bank statements get their OWN
// `BANK_STATEMENT_BUCKET`, a separate key namespace, and their own retention/lifecycle policy (ADR-0034).
// Object keys are opaque, non-PII paths the CALLER mints (scoped by pariwar/pool); this adapter never
// inspects or logs them beyond the GCS API call.

import type { BankStatementStorage } from '@twt/contracts';

export interface GcsBankStatementStorageOpts {
  /** The private bucket name (asia-south1). */
  readonly bucketName: string;
  /** Optional explicit GCP project; else Application Default Credentials. */
  readonly projectId?: string;
}

/**
 * Construct a live GCS-backed `BankStatementStorage`. The bucket client is lazily constructed
 * (side-effect-free import); a transient init failure is not permanently cached.
 */
export function createGcsBankStatementStorage(
  opts: GcsBankStatementStorageOpts,
): BankStatementStorage {
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
