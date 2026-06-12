// Live-DB integration suite for the audit-log hash chain (Story 1.10, D13-1.2
// slot). Against real Postgres: writer chains rows correctly, append-only
// triggers fire, RLS reads are tenant-isolated, concurrent writers serialize,
// and the SYNTHETIC TAMPER is localizable (AC-5/AC-9).
//
// ⚠ writeAuditEntry COMMITS its own transaction (advisory-lock chain writer) — it
// cannot be rolled back by setupLiveDb's per-test isolation, so committed rows
// accumulate in the GLOBAL chain. Assertions therefore key on rows WE wrote (by
// audit_id) and on the global-chain invariant (the whole chain always verifies),
// never on absolute counts. The synthetic-tamper mutation is injected inside a
// ROLLBACK'd transaction (DISABLE TRIGGER is transactional) so it never pollutes
// the committed chain other tests read.

import { createHash, randomUUID } from 'node:crypto';

import { asc } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { Db } from '../../../src/db.js';
import { audit } from '../../../src/index.js';
import * as schema from '../../../src/schema/index.js';
import type { AuditLogEntryRow } from '../../../src/schema/audit_log_entries.js';
import {
  DATABASE_URL,
  getTx,
  hasDatabase,
  setupLiveDb,
} from '../../../src/test-utils/integration-setup.js';
import { enterAppScope } from '../_helpers.js';

const { writeAuditEntry, verifyChainSegment } = audit;

function sha256Hex(s: string): string {
  return createHash('sha256').update(s, 'utf8').digest('hex');
}

function validInput(
  pariwarId: string,
  over: Partial<Parameters<typeof writeAuditEntry>[1]> = {},
): Parameters<typeof writeAuditEntry>[1] {
  return {
    pariwarId,
    actorId: null,
    actorRole: null,
    action: 'test.audit_write',
    resourceLocator: `res/${randomUUID()}`,
    requestPayloadHash: sha256Hex(randomUUID()),
    responseStatus: 200,
    ...over,
  };
}

describe.skipIf(!hasDatabase)('audit-log hash chain (live DB)', () => {
  setupLiveDb();

  let pool: pg.Pool;
  let dbAll: Db;

  beforeAll(() => {
    // Own pool for the own-committing writer + the global (cross-tenant) reads
    // the verifier needs. In dev/CI this superuser pool plays the BYPASSRLS
    // service role (DD-3).
    pool = new pg.Pool({ connectionString: DATABASE_URL, max: 6, ssl: false });
    dbAll = drizzle(pool, { schema }) as unknown as Db;
  });

  afterAll(() => pool.end());

  /** Read the ENTIRE global chain in seq order (superuser → all tenants). */
  async function readWholeChain(): Promise<AuditLogEntryRow[]> {
    return dbAll
      .select()
      .from(schema.auditLogEntries)
      .orderBy(asc(schema.auditLogEntries.seq));
  }

  it('writeAuditEntry links rows into a valid global chain (AC-1/AC-6)', async () => {
    const pariwar = randomUUID();
    const written = [];
    for (let i = 0; i < 3; i++) {
      written.push(await writeAuditEntry(pool, validInput(pariwar)));
    }

    // Each returned row is fully populated (DB-assigned seq + recordedAt + hash).
    for (const row of written) {
      expect(row.seq).toBeGreaterThanOrEqual(1);
      expect(row.auditHash).toMatch(/^[0-9a-f]{64}$/);
      expect(row.recordedAt).toBeInstanceOf(Date);
    }
    // seqs are strictly increasing in write order.
    expect(written[1]!.seq).toBeGreaterThan(written[0]!.seq);
    expect(written[2]!.seq).toBeGreaterThan(written[1]!.seq);

    // The whole global chain verifies, and our rows are part of it.
    const chain = await readWholeChain();
    expect(verifyChainSegment(chain)).toEqual({
      chainValid: true,
      firstBrokenSeq: null,
    });
    const ids = new Set(chain.map((r) => r.auditId));
    for (const row of written) expect(ids.has(row.auditId)).toBe(true);

    // The first row of the whole chain is genesis: prev_audit_hash IS NULL.
    expect(chain[0]!.prevAuditHash).toBeNull();
  });

  it('rejects payloads that are not a SHA-256 digest (W6-CR1.6 audit-poisoning)', async () => {
    await expect(
      writeAuditEntry(pool, validInput(randomUUID(), { requestPayloadHash: 'not-a-hash' })),
    ).rejects.toThrow();
    // And a non-dotted action is rejected.
    await expect(
      writeAuditEntry(pool, validInput(randomUUID(), { action: 'notdotted' })),
    ).rejects.toThrow();
  });

  describe('append-only triggers (AC-2)', () => {
    it('UPDATE on an existing audit row is rejected', async () => {
      const row = await writeAuditEntry(pool, validInput(randomUUID()));
      const { client } = getTx();
      await expect(
        client.query('UPDATE audit_log_entries SET action = $1 WHERE audit_id = $2', [
          'tampered',
          row.auditId,
        ]),
      ).rejects.toThrow(/append-only/);
    });

    it('DELETE on an existing audit row is rejected', async () => {
      const row = await writeAuditEntry(pool, validInput(randomUUID()));
      const { client } = getTx();
      await expect(
        client.query('DELETE FROM audit_log_entries WHERE audit_id = $1', [row.auditId]),
      ).rejects.toThrow(/append-only/);
    });

    it('TRUNCATE is rejected (statement-level trigger)', async () => {
      const { client } = getTx();
      await expect(client.query('TRUNCATE audit_log_entries')).rejects.toThrow(
        /append-only/,
      );
    });
  });

  it('RLS isolates tenant reads by pariwar_id (AC-8)', async () => {
    const pariwarA = randomUUID();
    const pariwarB = randomUUID();
    const rowA = await writeAuditEntry(pool, validInput(pariwarA));
    const rowB = await writeAuditEntry(pool, validInput(pariwarB));

    // Per-test client: shed superuser → twt_app, scope to A.
    const { client, tx } = getTx();
    await enterAppScope(client, pariwarA);
    const visible = await tx.select().from(schema.auditLogEntries);
    const visibleIds = new Set(visible.map((r) => r.auditId));

    // Every visible row is tenant A; A's row is present, B's row is NOT.
    expect(visible.every((r) => r.pariwarId === pariwarA)).toBe(true);
    expect(visibleIds.has(rowA.auditId)).toBe(true);
    expect(visibleIds.has(rowB.auditId)).toBe(false);
  });

  it('concurrent writers serialize into one valid chain (advisory lock)', async () => {
    const pariwar = randomUUID();
    const results = await Promise.all(
      Array.from({ length: 6 }, () => writeAuditEntry(pool, validInput(pariwar))),
    );
    // All succeeded with distinct seqs and distinct hashes (no fork, no dup).
    expect(new Set(results.map((r) => r.seq)).size).toBe(6);
    expect(new Set(results.map((r) => r.auditHash)).size).toBe(6);

    // The global chain still verifies — serialization held (no forked prev links).
    expect(verifyChainSegment(await readWholeChain()).chainValid).toBe(true);
  });

  it('synthetic tamper is detected and localized (AC-5/AC-9)', async () => {
    const pariwar = randomUUID();
    const rows = [];
    for (let i = 0; i < 4; i++) rows.push(await writeAuditEntry(pool, validInput(pariwar)));
    const victim = rows[1]!; // tamper the 2nd of our rows

    // Inject an out-of-band mutation the append-only trigger would normally block,
    // simulating an attacker who circumvented the DB guard (raw disk / backup /
    // dropped trigger). DISABLE TRIGGER + UPDATE are transactional → ROLLBACK
    // restores the committed chain, so no other test sees the tamper.
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('ALTER TABLE audit_log_entries DISABLE TRIGGER audit_log_entries_no_update');
      await client.query('UPDATE audit_log_entries SET action = $1 WHERE audit_id = $2', [
        'tampered.after_the_fact',
        victim.auditId,
      ]);
      const tx = drizzle(client, { schema }) as unknown as Db;
      const tampered = await tx
        .select()
        .from(schema.auditLogEntries)
        .orderBy(asc(schema.auditLogEntries.seq));

      const result = verifyChainSegment(tampered);
      expect(result.chainValid).toBe(false);
      expect(result.firstBrokenSeq).toBe(victim.seq); // the offending row identified
    } finally {
      await client.query('ROLLBACK').catch(() => undefined);
      client.release();
    }

    // After rollback, the committed chain is intact again.
    expect(verifyChainSegment(await readWholeChain()).chainValid).toBe(true);
  });
});
