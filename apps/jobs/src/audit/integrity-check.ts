// Audit-log integrity-verification job — Story 1.11a Task 5 (AC-1..AC-5).
//
// Story 1.10 shipped a *verifiable* global hash chain (audit_log_entries) + a
// *pure* `verifyChainSegment`. 1.11a is the JOB that WALKS the chain end-to-end,
// records the verdict to audit_integrity_checks, and publishes/alerts. The three
// invocation paths (daily cron / on-demand endpoint / post-mirror hook) all
// reduce to ONE function — `verifyAuditChain` (DD-4).
//
// ── Verification SOURCE (DD-1) ────────────────────────────────────────────────
// v1 walks the HOT Postgres chain via the SERVICE pool (BYPASSRLS → the true
// GLOBAL chain across all tenants), identical read posture to
// `pushNewAuditLinesToMirror` (mirror.ts). The architecture's ideal — verify the
// COLD GCS mirror from a separate-project read SA — is a recorded graduation
// (the mirror is a CI fake today; live GCS apply is deferred, D1-1.10). The walk
// is written SOURCE-AGNOSTIC: it consumes seq-ordered chunks from a `ChunkReader`,
// so the cold-mirror graduation is a NEW reader, not a rewrite. ⚠ A future
// mirror-JSONL reader must reconstitute `recordedAt` with `new Date(...)` before
// `verifyChainSegment` (CR-D10-1.10); the hot-DB reader here returns a `Date`.
//
// ── The central correctness decision (DD-2 / CR-D2-1.10) ──────────────────────
// `verifyChainSegment` by design does NOT check row[0]'s linkage to its
// predecessor (hash-chain.ts:148-152). So naive per-chunk verification SILENTLY
// MISSES a break landing exactly at a chunk boundary (and a head-truncation). The
// walk closes that two ways:
//   • GENESIS ANCHOR — the lowest-seq row of the whole chain MUST be genesis
//     (`prevAuditHash === null`). A non-null head means rows 1..k were deleted and
//     k+1 fakes the head → broken.
//   • CROSS-CHUNK STITCH — carry the previous chunk's last `auditHash`; for every
//     non-first chunk assert `chunk[0].prevAuditHash === carriedPrevHash` BEFORE
//     calling `verifyChainSegment`. A mismatch (a deleted boundary row) → broken
//     at `chunk[0]`. Neither touches the pure function's signature.
//
// ── Gap-tolerance (CR-D11-1.10) ───────────────────────────────────────────────
// `seq` is GENERATED ALWAYS AS IDENTITY: rolled-back txns BURN values, so gaps in
// `seq` are EXPECTED and benign. The walk NEVER infers "missing rows" from a seq
// gap — it pages with `seq > cursor` and links rows by `auditHash`, not by seq
// contiguity. The hash chain is the only integrity authority.

import { asc, gt } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import type pg from 'pg';

import { audit, schema, type Db } from '@twt/domain';

import type { IntegrityAlerter, IntegrityObservabilitySink } from './integrity-observability.js';

type AuditLogEntryRow = typeof schema.auditLogEntries.$inferSelect;
type AuditIntegrityCheckRow = typeof schema.auditIntegrityChecks.$inferSelect;
type AuditIntegrityCheckInsertRow = typeof schema.auditIntegrityChecks.$inferInsert;

/** The invocation path that triggered a check (DD-4's three triggers). */
export type TriggerSource = 'cron' | 'on_demand' | 'post_mirror';

/** Default chunk size — bounded memory; the chain is walked 1000 rows at a time (AC-1). */
export const DEFAULT_INTEGRITY_CHUNK_SIZE = 1000;

/**
 * A seq-ordered chunk reader: returns up to `limit` rows with `seq > afterSeq`,
 * ascending. The DB reader (service pool) and a future cold-mirror reader both
 * satisfy this — the walk is source-agnostic (DD-1).
 */
export type ChunkReader = (
  afterSeq: number,
  limit: number,
) => Promise<readonly AuditLogEntryRow[]>;

/** The seq+id verdict the chain walk returns (pre-persistence). */
export interface ChainWalkVerdict {
  chainValid: boolean;
  /** Rows confirmed valid before the first break (the whole chain on success). */
  rowsVerified: number;
  /** The chain head (lowest-seq row) — null only for an empty chain. */
  startSeq: number | null;
  startAuditId: string | null;
  /** The last row confirmed valid — the tail on success, null if none verified. */
  endSeq: number | null;
  endAuditId: string | null;
  /** The first row where the chain broke — null on success. */
  firstBrokenSeq: number | null;
  firstBrokenAuditId: string | null;
}

/**
 * Walk a seq-ordered chain in chunks, enforcing the genesis anchor + cross-chunk
 * stitch (DD-2) on top of the pure per-chunk `verifyChainSegment`. Pure
 * orchestration over a `ChunkReader` — no persistence, no I/O of its own — so it
 * is exhaustively unit-testable (mid-chunk tamper, boundary deletion,
 * head-truncation, seq gaps) with an in-memory reader.
 */
export async function verifyChainWalk(
  readChunkAfter: ChunkReader,
  chunkSize: number = DEFAULT_INTEGRITY_CHUNK_SIZE,
): Promise<ChainWalkVerdict> {
  if (!Number.isInteger(chunkSize) || chunkSize <= 0) {
    throw new Error(`verifyChainWalk: chunkSize must be a positive integer, got ${chunkSize}`);
  }

  let cursor = 0; // exclusive lower bound; seq >= 1, so 0 starts at the head
  let firstChunk = true;
  let prevTailHash: string | null = null; // the prior chunk's last auditHash
  let rowsVerified = 0;
  let start: AuditLogEntryRow | null = null;
  let lastGood: AuditLogEntryRow | null = null;

  const brokenAt = (brokenRow: AuditLogEntryRow): ChainWalkVerdict => ({
    chainValid: false,
    rowsVerified,
    startSeq: start?.seq ?? null,
    startAuditId: start?.auditId ?? null,
    endSeq: lastGood?.seq ?? null,
    endAuditId: lastGood?.auditId ?? null,
    firstBrokenSeq: brokenRow.seq,
    firstBrokenAuditId: brokenRow.auditId,
  });

  for (;;) {
    const chunk = await readChunkAfter(cursor, chunkSize);
    if (chunk.length === 0) break;
    const head = chunk[0]!;

    if (firstChunk) {
      start = head;
      // GENESIS ANCHOR (DD-2): the lowest-seq row of the whole chain must be
      // genesis. A non-null prev means the head was truncated (fake genesis).
      if (head.prevAuditHash !== null) return brokenAt(head);
    } else {
      // CROSS-CHUNK STITCH (DD-2 / CR-D2-1.10): this chunk's first row must link
      // to the previous chunk's last row. A mismatch = a deleted boundary row.
      if (head.prevAuditHash !== prevTailHash) return brokenAt(head);
    }

    const seg = audit.verifyChainSegment(chunk);
    if (!seg.chainValid) {
      const brokenSeq = seg.firstBrokenSeq!;
      // Count + remember the rows in THIS chunk that verified before the break.
      const goodBefore = chunk.filter((r) => r.seq < brokenSeq);
      rowsVerified += goodBefore.length;
      if (goodBefore.length > 0) lastGood = goodBefore[goodBefore.length - 1]!;
      const brokenRow = chunk.find((r) => r.seq === brokenSeq) ?? head;
      return brokenAt(brokenRow);
    }

    // Whole chunk verified.
    rowsVerified += chunk.length;
    lastGood = chunk[chunk.length - 1]!;
    prevTailHash = lastGood.auditHash;
    cursor = lastGood.seq;
    firstChunk = false;

    // A short read means we reached the tail — no need for an extra empty read.
    if (chunk.length < chunkSize) break;
  }

  return {
    chainValid: true,
    rowsVerified,
    startSeq: start?.seq ?? null,
    startAuditId: start?.auditId ?? null,
    endSeq: lastGood?.seq ?? null,
    endAuditId: lastGood?.auditId ?? null,
    firstBrokenSeq: null,
    firstBrokenAuditId: null,
  };
}

/** A ChunkReader backed by a drizzle handle (the service pool, or a tx in tests). */
export function createDbChunkReader(db: Db): ChunkReader {
  return (afterSeq, limit) =>
    db
      .select()
      .from(schema.auditLogEntries)
      .where(gt(schema.auditLogEntries.seq, afterSeq))
      .orderBy(asc(schema.auditLogEntries.seq))
      .limit(limit);
}

/** An in-memory ChunkReader over a fixed row set — for pure unit tests. */
export function createInMemoryChunkReader(rows: readonly AuditLogEntryRow[]): ChunkReader {
  const sorted = [...rows].sort((a, b) => a.seq - b.seq);
  return (afterSeq, limit) =>
    Promise.resolve(sorted.filter((r) => r.seq > afterSeq).slice(0, limit));
}

export interface VerifyAuditChainOptions {
  /** The BYPASSRLS service pool (production/CLI path). Provide this OR `db`. */
  servicePool?: pg.Pool;
  /**
   * A drizzle handle for reads + the verdict INSERT. The test seam: pass a
   * tx-bound handle so a synthetic tamper (and the verdict write) roll back.
   * Exactly one of `servicePool` / `db` must be provided.
   */
  db?: Db;
  /** Rows per chunk (AC-1). Default 1000; tests use a small value to force boundaries. */
  chunkSize?: number;
  sink: IntegrityObservabilitySink;
  alerter: IntegrityAlerter;
  /** Who/what triggered the check: `cron` | `on-demand:<userId>` | `post-mirror`. */
  verifierActor: string;
  triggerSource: TriggerSource;
  /** Injectable clock for `verified_at` (tests); defaults to the DB clock (now()). */
  now?: () => Date;
}

/**
 * Walk the global audit chain, persist ONE `audit_integrity_checks` verdict, then
 * publish it to the observability sink (AC-4) and — on a broken chain — fire the
 * alert (AC-5). Returns the persisted verdict row. This is the single function
 * the three triggers (cron / on-demand endpoint / post-mirror) all call (DD-4).
 */
export async function verifyAuditChain(
  opts: VerifyAuditChainOptions,
): Promise<AuditIntegrityCheckRow> {
  const chunkSize = opts.chunkSize ?? DEFAULT_INTEGRITY_CHUNK_SIZE;
  if (!opts.db === !opts.servicePool) {
    throw new Error('verifyAuditChain: provide exactly one of `servicePool` or `db`');
  }
  const db = opts.db ?? (drizzle(opts.servicePool!, { schema }) as unknown as Db);

  const verdict = await verifyChainWalk(createDbChunkReader(db), chunkSize);

  const insertRow: AuditIntegrityCheckInsertRow = {
    chainValid: verdict.chainValid,
    startSeq: verdict.startSeq,
    startAuditId: verdict.startAuditId,
    endSeq: verdict.endSeq,
    endAuditId: verdict.endAuditId,
    firstBrokenSeq: verdict.firstBrokenSeq,
    firstBrokenAuditId: verdict.firstBrokenAuditId,
    rowsVerified: verdict.rowsVerified,
    verifierActor: opts.verifierActor,
    triggerSource: opts.triggerSource,
    ...(opts.now ? { verifiedAt: opts.now() } : {}),
  };

  const [persisted] = await db
    .insert(schema.auditIntegrityChecks)
    .values(insertRow)
    .returning();
  if (!persisted) throw new Error('verifyAuditChain: verdict insert returned no row');

  // AC-5: alert FIRST — if publish throws on a live adapter, the alert must
  // still fire (a chain break is the highest-priority event).
  if (!persisted.chainValid) {
    await opts.alerter.alertChainBroken(persisted);
  }
  // AC-4: every completion is published to the observability sink.
  await opts.sink.publish(persisted);

  return persisted;
}
