// The pool-snapshot cold-storage port — Story 7.1 (Task 6, AC3).
//
// A PURE TS interface — the concrete Google Cloud Storage adapter is injected; tests
// inject an in-memory fake. Mirrors the Story 6.5 `ClaimDocumentStorage` port shape
// (the `[[project_claim_document_storage_port]]` precedent — abstraction-first, port +
// concrete adapter), narrowed to what a snapshot writer needs: a write/read-by-key seam.
//
// ── Scope fence (FIXED — Story 7.1 "Snapshot cold-tier scope") ────────────────
// This port EXPOSES a write/read seam; it does NOT schedule dumps, provision buckets,
// or set Object Retention Lock. Those are OPERATIONAL concerns (a separate infra/jobs
// story implements the daily dump job per Story 1.10's mirror pattern, CALLING THROUGH
// this port). Object Retention Lock + the IAM-isolated GCP project are bucket/IAM config
// committed via infra/ADR (architecture §1.5 audit cold-tier + §5.2 IAM isolation) — the
// app writes through this port and NEVER sets retention at write time.
//
// Bytes are `Uint8Array` (browser-safe, so the port stays in @twt/contracts) — a
// serialized pool snapshot is a small canonical-JSON blob (contentType
// 'application/json'), NOT the multi-MB binary a claim document is.

export interface SnapshotStorage {
  /**
   * Store `bytes` at `key`. `key` is an opaque, non-PII object path the CALLER mints
   * (scoped by pariwar/pool/snapshot-instant). Idempotent per key from the caller's
   * perspective — a re-`put` of the same key overwrites the same object. The adapter
   * NEVER sets retention here (retention is bucket config — AC3).
   */
  put(key: string, bytes: Uint8Array, opts: { contentType: string }): Promise<void>;
  /**
   * Fetch the stored snapshot bytes at `key`. The replay-migration harness reads a cold
   * snapshot THIS way, then parses it through the pool-snapshot migration adapters.
   *
   * @throws SnapshotNotFoundError if no object exists at `key` — every adapter
   * (in-memory fake + the live GCS adapter alike) throws this SAME shape, so a caller
   * written against one adapter never mishandles the other's not-found signal.
   */
  getBytes(key: string): Promise<Uint8Array>;
}

/** Thrown by every `SnapshotStorage` adapter when `getBytes` finds no object at `key`
 *  (a key never written, or GC'd from the bucket) — the one shared not-found shape. */
export class SnapshotNotFoundError extends Error {
  public readonly name = 'SnapshotNotFoundError';
  public constructor(public readonly key: string) {
    super(`[snapshot-storage] no object at key '${key}'`);
  }
}
