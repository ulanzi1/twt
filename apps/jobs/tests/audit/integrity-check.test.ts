// Audit-log integrity-verification tests — Story 1.11a Task 11 (AC-1/4/5/6).
//
// Two layers:
//   1. PURE walk tests (no DB) — forge chains with the real @twt/domain hash
//      primitives and drive `verifyChainWalk` through an in-memory reader. These
//      deterministically prove the DD-2 landmines are closed: mid-chunk tamper,
//      a chunk-BOUNDARY deletion (the CR-D2-1.10 stitch), HEAD-TRUNCATION (the
//      genesis anchor), and seq-GAP tolerance (CR-D11-1.10). DB-free → they run
//      in the unit `test` job.
//   2. LIVE-DB tests — write real rows via @twt/domain.writeAuditEntry, then run
//      `verifyAuditChain` against a tx-bound handle: an intact chain persists a
//      verdict + publishes to the sink (AC-4); a synthetic out-of-band tamper
//      (DISABLE TRIGGER + UPDATE inside a ROLLBACK'd tx) is detected, localized,
//      published, AND fires the alerter (AC-5). The verdict INSERT rides the same
//      tx so nothing accumulates.
//
// ⚠ writeAuditEntry COMMITS its own tx and the global chain accumulates rows —
// assertions key on OUR rows / on the returned verdict, never on absolute counts
// (live-DB gotcha). The tamper mutation lives inside a ROLLBACK'd tx so no other
// test sees it.

import { createHash, randomUUID } from 'node:crypto';

import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { audit, schema, type Db } from '@twt/domain';

import {
  createInMemoryChunkReader,
  verifyAuditChain,
  verifyChainWalk,
} from '../../src/audit/integrity-check.js';
import {
  createCapturingIntegrityAlerter,
  createCapturingIntegritySink,
} from '../../src/audit/integrity-observability.js';

type AuditLogEntryRow = typeof schema.auditLogEntries.$inferSelect;

const { computeAuditHash, GENESIS_PREV_HASH, verifyChainSegment } = audit;

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);

function sha256Hex(s: string): string {
  return createHash('sha256').update(s, 'utf8').digest('hex');
}

// ── Pure forging helpers ──────────────────────────────────────────────────────

/** Forge ONE valid row: its audit_hash is computed from the resolved prev feed. */
function forgeRow(
  seq: number,
  prevAuditHash: string | null,
  pariwarId: string,
  over: Partial<AuditLogEntryRow> = {},
): AuditLogEntryRow {
  const base = {
    auditId: randomUUID(),
    seq,
    pariwarId,
    actorId: null,
    actorRole: null,
    action: 'test.forged',
    resourceLocator: `res/${randomUUID()}`,
    requestPayloadHash: sha256Hex(randomUUID()),
    responseStatus: 200,
    recordedAt: new Date(1_780_000_000_000 + seq * 1000),
    traceId: null,
    ...over,
  };
  const auditHash = computeAuditHash(prevAuditHash ?? GENESIS_PREV_HASH, base);
  // `pariwar_id` is a branded PariwarId at the type layer; a forged UUID string is
  // structurally fine for these pure-walk tests — cast to the inferred row type.
  return { ...base, prevAuditHash, auditHash } as AuditLogEntryRow;
}

/** Forge a valid chain over the given seq values (gaps allowed) — row[0] is genesis. */
function forgeChain(seqs: readonly number[]): AuditLogEntryRow[] {
  const pariwarId = randomUUID();
  const rows: AuditLogEntryRow[] = [];
  let prev: string | null = null;
  for (const seq of seqs) {
    const row = forgeRow(seq, prev, pariwarId);
    rows.push(row);
    prev = row.auditHash;
  }
  return rows;
}

describe('verifyChainWalk (pure — closes the DD-2 landmines)', () => {
  it('an intact chain verifies across multiple chunks (AC-1)', async () => {
    const rows = forgeChain([1, 2, 3, 4, 5]);
    const verdict = await verifyChainWalk(createInMemoryChunkReader(rows), 2);
    expect(verdict).toMatchObject({
      chainValid: true,
      rowsVerified: 5,
      startSeq: 1,
      endSeq: 5,
      firstBrokenSeq: null,
    });
  });

  it('an empty chain is trivially valid (null boundaries, 0 rows)', async () => {
    const verdict = await verifyChainWalk(createInMemoryChunkReader([]), 2);
    expect(verdict).toMatchObject({
      chainValid: true,
      rowsVerified: 0,
      startSeq: null,
      endSeq: null,
      firstBrokenSeq: null,
    });
  });

  it('tolerates seq GAPS — burned IDENTITY values are benign (CR-D11-1.10)', async () => {
    const rows = forgeChain([1, 5, 9, 100]); // big gaps, valid linkage
    const verdict = await verifyChainWalk(createInMemoryChunkReader(rows), 2);
    expect(verdict.chainValid).toBe(true);
    expect(verdict.rowsVerified).toBe(4);
  });

  it('detects + localizes a MID-CHUNK content tamper', async () => {
    const rows = forgeChain([1, 2, 3, 4, 5]);
    // Tamper seq 3's content WITHOUT recomputing its hash → recompute mismatch.
    const tampered = rows.map((r) => (r.seq === 3 ? { ...r, action: 'tampered' } : r));
    const verdict = await verifyChainWalk(createInMemoryChunkReader(tampered), 2);
    expect(verdict.chainValid).toBe(false);
    expect(verdict.firstBrokenSeq).toBe(3);
  });

  it('catches a CHUNK-BOUNDARY deletion the per-chunk verifier would MISS (CR-D2-1.10 stitch)', async () => {
    const rows = forgeChain([1, 2, 3, 4]);
    // Delete seq 3 — with chunkSize 2 it is chunk[0] of the 2nd chunk.
    const deleted = rows.filter((r) => r.seq !== 3);
    const verdict = await verifyChainWalk(createInMemoryChunkReader(deleted), 2);
    expect(verdict.chainValid).toBe(false);
    expect(verdict.firstBrokenSeq).toBe(4); // the row after the deleted boundary

    // Prove the MISS the stitch closes: the orphaned tail row passes the pure
    // per-segment verifier on its own (row[0] linkage is skipped by design).
    const tail = rows.find((r) => r.seq === 4)!;
    expect(verifyChainSegment([tail]).chainValid).toBe(true);
  });

  it('catches HEAD-TRUNCATION via the genesis anchor (DD-2)', async () => {
    const rows = forgeChain([1, 2, 3, 4]);
    const truncated = rows.filter((r) => r.seq !== 1); // drop genesis → fake head
    const verdict = await verifyChainWalk(createInMemoryChunkReader(truncated), 2);
    expect(verdict.chainValid).toBe(false);
    expect(verdict.firstBrokenSeq).toBe(2); // new head has a non-null prev_audit_hash
    // Boundary-pair coherence: nothing verified before the break → start AND end
    // are both null (Story 1.11a defect fix — the migration 0010 CHECK rejects a
    // start-without-end verdict, which would make verifyAuditChain throw instead
    // of persisting the failed verdict).
    expect(verdict.startSeq).toBeNull();
    expect(verdict.endSeq).toBeNull();
  });

  it('rejects a non-positive chunkSize', async () => {
    await expect(verifyChainWalk(createInMemoryChunkReader([]), 0)).rejects.toThrow(/chunkSize/);
  });
});

// ── Live-DB tests ─────────────────────────────────────────────────────────────

function validInput(
  pariwarId: string,
): Parameters<typeof audit.writeAuditEntry>[1] {
  return {
    pariwarId,
    actorId: null,
    actorRole: null,
    action: 'test.integrity_write',
    resourceLocator: `res/${randomUUID()}`,
    requestPayloadHash: sha256Hex(randomUUID()),
    responseStatus: 200,
  };
}

describe.skipIf(!hasDatabase)('verifyAuditChain (live DB)', () => {
  let pool: pg.Pool;

  beforeAll(() => {
    pool = new pg.Pool({ connectionString: DATABASE_URL, max: 4, ssl: false });
    pool.on('error', (err) => console.error('[integrity-test pool]', err.message));
  });
  afterAll(() => pool.end());

  async function writeRows(pariwar: string, n: number): Promise<AuditLogEntryRow[]> {
    const rows: AuditLogEntryRow[] = [];
    for (let i = 0; i < n; i++) rows.push(await audit.writeAuditEntry(pool, validInput(pariwar)));
    return rows;
  }

  it('intact chain → chain_valid=true, verdict persisted, published, no alert (AC-3/AC-4)', async () => {
    await writeRows(randomUUID(), 3);
    const sink = createCapturingIntegritySink();
    const alerter = createCapturingIntegrityAlerter();

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const db = drizzle(client, { schema }) as unknown as Db;
      const verdict = await verifyAuditChain({
        db,
        sink,
        alerter,
        verifierActor: 'on-demand:test',
        triggerSource: 'on_demand',
      });

      expect(verdict.chainValid).toBe(true);
      expect(verdict.firstBrokenSeq).toBeNull();
      expect(verdict.rowsVerified).toBeGreaterThanOrEqual(3);
      expect(verdict.verifierActor).toBe('on-demand:test');
      expect(verdict.triggerSource).toBe('on_demand');
      // The genesis of the WHOLE chain anchored (start populated, not null).
      expect(verdict.startSeq).not.toBeNull();

      // Verdict row persisted (within the tx).
      const found = await db
        .select()
        .from(schema.auditIntegrityChecks)
        .where(eq(schema.auditIntegrityChecks.checkId, verdict.checkId));
      expect(found).toHaveLength(1);

      // Published once (AC-4); no alert on a healthy chain.
      expect(sink.published).toHaveLength(1);
      expect(sink.published[0]!.checkId).toBe(verdict.checkId);
      expect(alerter.alerts).toHaveLength(0);
    } finally {
      await client.query('ROLLBACK').catch(() => undefined);
      client.release();
    }
  });

  it('synthetic out-of-band tamper → detected, localized, published AND alerted (AC-5)', async () => {
    const rows = await writeRows(randomUUID(), 4);
    const victim = rows[1]!; // tamper the 2nd of our rows
    const sink = createCapturingIntegritySink();
    const alerter = createCapturingIntegrityAlerter();

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // Simulate an attacker who circumvented the append-only trigger (raw disk /
      // backup / dropped trigger). DISABLE TRIGGER + UPDATE are transactional →
      // ROLLBACK restores the chain, so no other test sees the tamper.
      await client.query(
        'ALTER TABLE audit_log_entries DISABLE TRIGGER audit_log_entries_no_update',
      );
      await client.query('UPDATE audit_log_entries SET action = $1 WHERE audit_id = $2', [
        'tampered.after_the_fact',
        victim.auditId,
      ]);
      const db = drizzle(client, { schema }) as unknown as Db;

      const verdict = await verifyAuditChain({
        db,
        sink,
        alerter,
        verifierActor: 'cron',
        triggerSource: 'cron',
      });

      expect(verdict.chainValid).toBe(false);
      expect(verdict.firstBrokenSeq).toBe(victim.seq); // the offending row, localized
      expect(verdict.firstBrokenAuditId).toBe(victim.auditId);

      // AC-5: an alert fired (and the verdict was still published).
      expect(alerter.alerts).toHaveLength(1);
      expect(alerter.alerts[0]!.checkId).toBe(verdict.checkId);
      expect(sink.published).toHaveLength(1);

      // The failed verdict was persisted (append-only ledger).
      const found = await db
        .select()
        .from(schema.auditIntegrityChecks)
        .where(eq(schema.auditIntegrityChecks.checkId, verdict.checkId));
      expect(found).toHaveLength(1);
      expect(found[0]!.chainValid).toBe(false);
      expect(found[0]!.firstBrokenSeq).toBe(victim.seq);
    } finally {
      await client.query('ROLLBACK').catch(() => undefined);
      client.release();
    }

    // After rollback the committed chain is intact again.
    const client2 = await pool.connect();
    try {
      await client2.query('BEGIN');
      const db2 = drizzle(client2, { schema }) as unknown as Db;
      const after = await verifyAuditChain({
        db: db2,
        sink: createCapturingIntegritySink(),
        alerter: createCapturingIntegrityAlerter(),
        verifierActor: 'cron',
        triggerSource: 'cron',
      });
      expect(after.chainValid).toBe(true);
    } finally {
      await client2.query('ROLLBACK').catch(() => undefined);
      client2.release();
    }
  });

  it('chunk-boundary deletion → caught by cross-chunk stitch, verdict persisted + alerted (AC-6)', async () => {
    // Write 3 rows. With chunkSize=1 every row is its own chunk, so the row
    // after the deleted one becomes chunk[0] of the next chunk. verifyChainSegment
    // skips row[0] linkage by design — only the cross-chunk STITCH catches it.
    const rows = await writeRows(randomUUID(), 3);
    const victim = rows[1]!;
    const sink = createCapturingIntegritySink();
    const alerter = createCapturingIntegrityAlerter();

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        'ALTER TABLE audit_log_entries DISABLE TRIGGER audit_log_entries_no_delete',
      );
      await client.query('DELETE FROM audit_log_entries WHERE audit_id = $1', [victim.auditId]);
      const db = drizzle(client, { schema }) as unknown as Db;

      const verdict = await verifyAuditChain({
        db,
        sink,
        alerter,
        chunkSize: 1,
        verifierActor: 'cron',
        triggerSource: 'cron',
      });

      expect(verdict.chainValid).toBe(false);
      // The row AFTER the deleted boundary row is where the stitch fails. Resolve that row FROM THE
      // DB rather than assuming it is `rows[2]`.
      //
      // ⚠ WHY (2026-08-04): `verifyAuditChain` walks the ONE GLOBAL chain, and `writeRows` commits its
      // rows one at a time on a shared pool — so any concurrently-running suite that appends an audit
      // row lands BETWEEN our rows and legitimately becomes the first-broken row once the victim is
      // deleted. Asserting `rows[2]` silently encodes "nothing else in the repo wrote an audit row
      // while I ran", which is not a property this test controls. apps/jobs' `fileParallelism: false`
      // guarantees it only WITHIN this package; a sibling package running in parallel defeats it from
      // outside (fixed at the CI level by `--concurrency=1`, but the assertion should not depend on
      // that). Assert the invariant — "the break is reported at the first surviving row after the
      // gap" — not an absolute seq ([[project_live_db_test_gotchas]]: assert membership, not counts).
      const { rows: afterGap } = await client.query<{ seq: string; audit_id: string }>(
        'SELECT seq, audit_id FROM audit_log_entries WHERE seq > $1 ORDER BY seq LIMIT 1',
        [victim.seq],
      );
      const firstAfterGap = afterGap[0];
      expect(firstAfterGap).toBeDefined();
      // `seq` is bigint → node-postgres returns it as a string; the drizzle mapping is `mode: 'number'`.
      expect(verdict.firstBrokenSeq).toBe(Number(firstAfterGap!.seq));
      expect(verdict.firstBrokenAuditId).toBe(firstAfterGap!.audit_id);
      expect(alerter.alerts).toHaveLength(1);
      expect(sink.published).toHaveLength(1);

      const found = await db
        .select()
        .from(schema.auditIntegrityChecks)
        .where(eq(schema.auditIntegrityChecks.checkId, verdict.checkId));
      expect(found).toHaveLength(1);
      expect(found[0]!.chainValid).toBe(false);
      expect(found[0]!.firstBrokenSeq).toBe(rows[2]!.seq);
    } finally {
      await client.query('ROLLBACK').catch(() => undefined);
      client.release();
    }
  });

  it('head-truncation → caught by genesis anchor, verdict persisted + alerted (AC-6)', async () => {
    const sink = createCapturingIntegritySink();
    const alerter = createCapturingIntegrityAlerter();

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // Find the true genesis row — the lowest-seq row with prevAuditHash IS NULL.
      const genesisResult = await client.query<{ audit_id: string; seq: string }>(
        'SELECT audit_id, seq FROM audit_log_entries WHERE prev_audit_hash IS NULL ORDER BY seq ASC LIMIT 1',
      );
      expect(genesisResult.rows.length).toBeGreaterThan(0);
      const genesis = genesisResult.rows[0]!;

      await client.query(
        'ALTER TABLE audit_log_entries DISABLE TRIGGER audit_log_entries_no_delete',
      );
      await client.query('DELETE FROM audit_log_entries WHERE audit_id = $1', [genesis.audit_id]);
      const db = drizzle(client, { schema }) as unknown as Db;

      const verdict = await verifyAuditChain({
        db,
        sink,
        alerter,
        verifierActor: 'cron',
        triggerSource: 'cron',
      });

      // The new head has prevAuditHash != null → genesis anchor fires.
      expect(verdict.chainValid).toBe(false);
      expect(verdict.firstBrokenSeq).not.toBeNull();
      expect(verdict.rowsVerified).toBe(0);
      expect(alerter.alerts).toHaveLength(1);
      expect(sink.published).toHaveLength(1);

      const found = await db
        .select()
        .from(schema.auditIntegrityChecks)
        .where(eq(schema.auditIntegrityChecks.checkId, verdict.checkId));
      expect(found).toHaveLength(1);
      expect(found[0]!.chainValid).toBe(false);
    } finally {
      await client.query('ROLLBACK').catch(() => undefined);
      client.release();
    }
  });
  // Live-DB suite timeout: these tests write real rows + walk the chain against a shared :5433
  // container; under concurrent `turbo`/`ci:local` load they can exceed the 5s vitest default
  // (the chunk-boundary stitch is the heaviest). 20s removes the contention flake without masking
  // a real hang. (Standalone each runs in ~1s.)
}, { timeout: 20000 });
