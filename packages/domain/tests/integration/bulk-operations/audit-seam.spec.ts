// Live-DB integration test — Story 10.6 (Task 6; AC4, AC8). Wires the `auditItem` seam to the
// REAL `writeAuditEntry` and asserts one row per executed item sharing a `traceId`.
//
// ⚠ writeAuditEntry COMMITS its own transaction (advisory-lock global chain writer) — it cannot be
// rolled back by setupLiveDb's per-test isolation, so committed rows accumulate in the GLOBAL
// chain. Assertions therefore key on rows WE wrote (filtered by `traceId`), never on absolute
// counts ([[project_live_db_test_gotchas]] — the audit-log integrity-check.spec.ts precedent).

import { randomUUID } from 'node:crypto';

import { asc, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { Db } from '../../../src/db.js';
import { audit, bulkOperations } from '../../../src/index.js';
import * as schema from '../../../src/schema/index.js';
import { DATABASE_URL, hasDatabase } from '../../../src/test-utils/integration-setup.js';
import {
  DISTRICT_ADMIN_PATNA_GRANT,
  actorContext,
  createFixtureContextA,
  fixtureItemsA,
  fixtureOperationA,
} from '../../bulk-operations/fixtures.js';

const { writeAuditEntry } = audit;
const { bulkExecute, createBulkOperationRegistry } = bulkOperations;

describe.skipIf(!hasDatabase)('bulk-operations audit seam (live DB)', () => {
  let pool: pg.Pool;
  let dbAll: Db;

  beforeAll(() => {
    // Own pool for the own-committing writer — the audit chain writer needs its own
    // BEGIN/advisory-lock/COMMIT, distinct from any per-test rollback transaction.
    pool = new pg.Pool({ connectionString: DATABASE_URL, max: 4, ssl: false });
    dbAll = drizzle(pool, { schema }) as unknown as Db;
  });

  afterAll(() => pool.end());

  it('writes exactly one audit row per executed item, all sharing the batch traceId', async () => {
    const registry = createBulkOperationRegistry();
    registry.register(fixtureOperationA);

    const batchId = randomUUID();
    const items = fixtureItemsA(5);
    const ctx = createFixtureContextA();

    const result = await bulkExecute(
      registry,
      'test.fixture_a',
      items,
      actorContext([DISTRICT_ADMIN_PATNA_GRANT]),
      ctx,
      {
        dryRun: false,
        batchId,
        auditItem: (input) => writeAuditEntry(pool, input).then(() => undefined),
      },
    );

    expect(result.batchId).toBe(batchId);

    const rows = await dbAll
      .select()
      .from(schema.auditLogEntries)
      .where(eq(schema.auditLogEntries.traceId, batchId))
      .orderBy(asc(schema.auditLogEntries.seq));

    // Membership / grouping, NOT an absolute count assertion against the whole (accumulating)
    // global chain — but WE wrote exactly 5 rows under this specific batchId.
    expect(rows).toHaveLength(5);
    for (const row of rows) {
      expect(row.traceId).toBe(batchId);
      expect(row.action).toBe('test.fixture_a_processed');
      expect(row.requestPayloadHash).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it('writes NO audit rows for a dry-run batch (AC2 zero side effects, live-DB confirmation)', async () => {
    const registry = createBulkOperationRegistry();
    registry.register(fixtureOperationA);

    const batchId = randomUUID();
    const items = fixtureItemsA(3);
    const ctx = createFixtureContextA();

    await bulkExecute(registry, 'test.fixture_a', items, actorContext([DISTRICT_ADMIN_PATNA_GRANT]), ctx, {
      dryRun: true,
      batchId,
      auditItem: (input) => writeAuditEntry(pool, input).then(() => undefined),
    });

    const rows = await dbAll
      .select()
      .from(schema.auditLogEntries)
      .where(eq(schema.auditLogEntries.traceId, batchId));
    expect(rows).toHaveLength(0);
  });
});
