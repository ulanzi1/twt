// Off-site audit-log mirror — Story 1.10 Task 8 (DD-5, AC-3/AC-4).
//
// The 6-hourly replication of new audit_log_entries rows to the
// Object-Retention-Locked GCS bucket in the SEPARATE twt-audit-mirror GCP
// project (Isolation Commitment §2.10a). One-way push: the mirror credential is
// write-only (roles/storage.objectCreator, no read/delete/overwrite), so this
// job never reads the mirror back — the watermark lives on the PRIMARY side.
//
// ── Append-only object naming (§1.5 L876-878) ─────────────────────────────────
// Each run writes ONE object whose name encodes the contiguous seq range it
// carries: `audit/segment-<minSeq>-<maxSeq>.jsonl` (seq zero-padded for lexical
// order). Object Retention Lock + the `ifGenerationMatch:0` precondition forbid
// overwrites, so a re-run for the same range fails closed rather than mutating a
// locked object. Rows are serialized one canonical-JSON line per row (the SINGLE
// @twt/domain canonicalizer) so the mirror is byte-deterministic and Story 1.11a
// / the quarterly attestation can re-verify the chain straight from the mirror.
//
// ── MIRROR_MODE fake|live (mirrors KMS_TEST_MODE) ─────────────────────────────
// Local/CI use an in-memory fake `MirrorTarget`; live uses GCS. The GCS adapter
// is dynamically imported only in live mode so tests never load the SDK / need
// credentials.
//
// ── Watermark ─────────────────────────────────────────────────────────────────
// The last-mirrored `seq` is read/advanced via an injected `WatermarkStore`
// (in-memory fake here). The DURABLE production store (a primary-side
// `audit_mirror_state` row or a readable primary-project marker) is wired with
// the 6-hourly trigger when Story 1.12 (pg-boss) lands — live apply is deferred
// (Story 1.5 D1-1.5 precedent). The mirror BUCKET stays write-only regardless.

import { asc, gt } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import type pg from 'pg';

import { canonicalJsonStringify, schema, type Db } from '@twt/domain';

type AuditLogEntryRow = typeof schema.auditLogEntries.$inferSelect;

/** A one-way append-only sink for serialized audit segments. */
export interface MirrorTarget {
  /**
   * Write an append-only object. MUST reject overwrites of an existing name
   * (Object Retention Lock semantics — §1.5 "no overwrites"). The mirror
   * credential is objectCreator-only, so this never reads or deletes.
   */
  putObject(objectName: string, body: Buffer): Promise<void>;
}

/** Persists the last-mirrored chain position (the watermark). */
export interface WatermarkStore {
  getLastMirroredSeq(): Promise<number>;
  setLastMirroredSeq(seq: number): Promise<void>;
}

export interface MirrorResult {
  /** Number of audit rows pushed this run. */
  pushedCount: number;
  /** Watermark this run started from (exclusive lower bound). */
  fromSeq: number;
  /** New watermark (max seq pushed); equals fromSeq when nothing was pushed. */
  toSeq: number;
  /** The append-only object written, or null when there was nothing to push. */
  objectName: string | null;
}

/** Default per-run batch ceiling (bounded memory; the next run picks up the rest). */
const DEFAULT_BATCH_LIMIT = 5000;

/** Zero-pad a seq for lexically-sortable, fixed-width object names. */
function padSeq(seq: number): string {
  return String(seq).padStart(20, '0');
}

/** Full-row projection for the mirror (recordedAt → ISO; Date is not JSON-canonical). */
function serializeRow(row: AuditLogEntryRow): string {
  return canonicalJsonStringify({
    seq: row.seq,
    auditId: row.auditId,
    pariwarId: row.pariwarId,
    actorId: row.actorId,
    actorRole: row.actorRole,
    action: row.action,
    resourceLocator: row.resourceLocator,
    requestPayloadHash: row.requestPayloadHash,
    responseStatus: row.responseStatus,
    prevAuditHash: row.prevAuditHash,
    auditHash: row.auditHash,
    recordedAt: row.recordedAt.toISOString(),
    traceId: row.traceId,
  });
}

/**
 * Replicate audit rows after the watermark to the off-site mirror, one
 * append-only object per run, then advance the watermark. Reads via the SERVICE
 * pool (BYPASSRLS → the true global chain across all tenants). Idempotent
 * against re-runs: once the watermark advances, a re-run with no new rows pushes
 * nothing (and never overwrites a prior object).
 */
export async function pushNewAuditLinesToMirror(opts: {
  servicePool: pg.Pool;
  target: MirrorTarget;
  watermark: WatermarkStore;
  batchLimit?: number;
}): Promise<MirrorResult> {
  const sinceSeq = await opts.watermark.getLastMirroredSeq();
  const db = drizzle(opts.servicePool, { schema }) as unknown as Db;

  const rows = await db
    .select()
    .from(schema.auditLogEntries)
    .where(gt(schema.auditLogEntries.seq, sinceSeq))
    .orderBy(asc(schema.auditLogEntries.seq))
    .limit(opts.batchLimit ?? DEFAULT_BATCH_LIMIT);

  if (rows.length === 0) {
    return { pushedCount: 0, fromSeq: sinceSeq, toSeq: sinceSeq, objectName: null };
  }

  const minSeq = rows[0]!.seq;
  const maxSeq = rows[rows.length - 1]!.seq;
  const objectName = `audit/segment-${padSeq(minSeq)}-${padSeq(maxSeq)}.jsonl`;
  const body = Buffer.from(rows.map(serializeRow).join('\n') + '\n', 'utf-8');

  await opts.target.putObject(objectName, body);
  await opts.watermark.setLastMirroredSeq(maxSeq);

  return { pushedCount: rows.length, fromSeq: sinceSeq, toSeq: maxSeq, objectName };
}

// ── Fakes for local/CI (MIRROR_MODE=fake) ─────────────────────────────────────

export interface InMemoryMirrorTarget extends MirrorTarget {
  /** Inspect written objects (tests). */
  readonly objects: ReadonlyMap<string, Buffer>;
}

/** In-memory MirrorTarget that rejects overwrites (models Object Retention Lock). */
export function createInMemoryMirrorTarget(): InMemoryMirrorTarget {
  const objects = new Map<string, Buffer>();
  return {
    objects,
    async putObject(objectName: string, body: Buffer): Promise<void> {
      if (objects.has(objectName)) {
        throw new Error(
          `mirror: object ${objectName} already exists — overwrites are forbidden (Object Retention Lock)`,
        );
      }
      objects.set(objectName, body);
    },
  };
}

/** In-memory WatermarkStore for local/CI + tests. */
export function createInMemoryWatermarkStore(initial = 0): WatermarkStore {
  let seq = initial;
  return {
    getLastMirroredSeq: () => Promise.resolve(seq),
    setLastMirroredSeq: (next: number) => {
      seq = next;
      return Promise.resolve();
    },
  };
}

/**
 * Resolve the MirrorTarget from MIRROR_MODE (fake|live), mirroring the
 * KMS_TEST_MODE convention. `live` dynamically imports the GCS adapter so the
 * SDK is never loaded (or credentialed) in fake/test mode.
 */
export async function resolveMirrorTargetFromEnv(): Promise<MirrorTarget> {
  const mode = process.env['MIRROR_MODE'] ?? 'fake';
  if (mode === 'fake') return createInMemoryMirrorTarget();
  if (mode === 'live') {
    const bucketName = process.env['AUDIT_MIRROR_BUCKET'];
    if (!bucketName) {
      throw new Error('[mirror] MIRROR_MODE=live requires AUDIT_MIRROR_BUCKET');
    }
    const { createGcsMirrorTarget } = await import('./gcs-mirror-target.js');
    return createGcsMirrorTarget({ bucketName });
  }
  throw new Error(`[mirror] MIRROR_MODE must be 'fake' or 'live', got ${JSON.stringify(mode)}`);
}
