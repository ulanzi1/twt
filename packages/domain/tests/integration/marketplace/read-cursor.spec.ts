// Story 12.2 (`2026-11-01-433` QE16; AC8 domain-live leg; TR10, TR20) — `pageModulesForPariwar` keyset paging on the
// EXACT `created_at::text`. Live DB, own pool, own commits — in a FRESH `randomUUID()` Pariwar (there is ⛔ `pariwars`
// table, so any UUID is a tenant): a page COUNT, unlike a membership check, breaks on foreign rows, and own-committing
// specs write PARIWAR_A / PARIWAR_B in parallel.
//
// Five modules authored in ONE transaction share one `created_at` (`now()` = the transaction start) — so the `module_id`
// tiebreak is what pages them. Two more rows 100 µs apart in the SAME millisecond (a guarded raw insert with an explicit
// `created_at` — `authorModule` cannot set it) prove a JS-`Date` cursor would have skipped one (ms only); the exact text
// keeps both.

import { randomUUID } from 'node:crypto';

import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { bindScopedDb } from '../../../src/db.js';
import { pariwarId as toPariwarId, type ModuleId } from '../../../src/ids/index.js';
import { authorModule } from '../../../src/marketplace/commands.js';
import { decodeModuleCursor, listModulesForPariwar, pageModulesForPariwar } from '../../../src/marketplace/read.js';
import { DATABASE_URL, hasDatabase } from '../../../src/test-utils/integration-setup.js';
import { enterAppScope } from '../_helpers.js';
import { RAW_INSERT_AT_SQL, manifestInput, newModuleId, rawInsertParams, seedPartner, txNow } from './_fixtures.js';

const P = toPariwarId(randomUUID());
// Same millisecond, 100 µs apart — long before the five (which are `now()`), so they sort last.
const PAIR_EARLY = '2026-01-01 00:00:00.000100+00';
const PAIR_LATE = '2026-01-01 00:00:00.000200+00';

describe.skipIf(!hasDatabase)('pageModulesForPariwar — keyset paging on the exact created_at (AC8)', () => {
  let pool: pg.Pool;
  let partnerId: string;
  const five: ModuleId[] = [];
  const pairEarly = newModuleId();
  const pairLate = newModuleId();

  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: DATABASE_URL, max: 2, ssl: false });
    pool.on('error', (err) => console.error('[read-cursor pool]', err.message));
    const c = await pool.connect();
    try {
      partnerId = await seedPartner(c, P);
      await c.query('BEGIN');
      await enterAppScope(c, P);
      const now = await txNow(c);
      for (let n = 0; n < 5; n += 1) {
        const id = newModuleId();
        five.push(id);
        await authorModule(c, {
          pariwarId: P,
          moduleId: id,
          auditId: randomUUID(),
          actor: 'operator',
          actorId: randomUUID(),
          manifest: manifestInput(now, { partner_id: partnerId }),
        });
      }
      await c.query("SET LOCAL app.marketplace_module_state_writer = 'on'");
      await c.query(RAW_INSERT_AT_SQL, [...rawInsertParams(pairEarly, P, { partnerId }), PAIR_EARLY]);
      await c.query(RAW_INSERT_AT_SQL, [...rawInsertParams(pairLate, P, { partnerId }), PAIR_LATE]);
      await c.query('COMMIT');
    } catch (e) {
      await c.query('ROLLBACK').catch(() => undefined);
      throw e;
    } finally {
      c.release();
    }
  });

  afterAll(async () => {
    if (!pool) return;
    const admin = await pool.connect();
    const ids = [...five, pairEarly, pairLate];
    try {
      await admin.query('BEGIN');
      await admin.query("SET LOCAL session_replication_role = 'replica'");
      await admin.query('DELETE FROM marketplace_modules WHERE module_id = ANY($1)', [ids]);
      await admin.query('DELETE FROM events_log WHERE stream_id = ANY($1)', [ids]);
      await admin.query('DELETE FROM marketplace_partners WHERE partner_id = $1', [partnerId]);
      await admin.query('COMMIT');
    } catch (e) {
      await admin.query('ROLLBACK').catch(() => undefined);
      console.error('[read-cursor.spec] cleanup:', (e as Error).message);
    } finally {
      admin.release();
      await pool.end();
    }
  });

  /** Read every page with `limit`, under P's app scope, in one read transaction. */
  async function pages(limit: number, state?: 'draft'): Promise<{ ids: string[][]; cursors: (string | null)[] }> {
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      await enterAppScope(c, P);
      const db = bindScopedDb(c);
      const ids: string[][] = [];
      const cursors: (string | null)[] = [];
      let after: ReturnType<typeof decodeModuleCursor> | undefined;
      for (let guard = 0; guard < 20; guard += 1) {
        const page = await pageModulesForPariwar(db, P, { limit, ...(state ? { state } : {}), ...(after ? { after } : {}) });
        ids.push(page.items.map((r) => r.moduleId));
        cursors.push(page.nextCursor);
        if (page.nextCursor === null) break;
        after = decodeModuleCursor(page.nextCursor); // the strict decode accepts every server-built cursor
      }
      await c.query('COMMIT');
      return { ids, cursors };
    } finally {
      c.release();
    }
  }

  const expectedOrder = (): string[] => [...[...five].sort().reverse(), pairLate, pairEarly];

  it('limit 2 pages the seven rows over FOUR pages — no duplicate, no gap, next_cursor null only on the last', async () => {
    const { ids, cursors } = await pages(2);
    expect(ids.map((p) => p.length)).toEqual([2, 2, 2, 1]);
    expect(ids.flat()).toEqual(expectedOrder());
    expect(new Set(ids.flat()).size).toBe(7);
    expect(cursors.slice(0, -1).every((c) => typeof c === 'string')).toBe(true);
    expect(cursors[cursors.length - 1]).toBeNull();
  });

  it('the five same-transaction modules (one created_at) page over three pages by the module_id tiebreak', async () => {
    const { ids } = await pages(2, 'draft');
    const fiveOnly = ids.flat().filter((id) => five.includes(id as ModuleId));
    expect(fiveOnly).toEqual([...five].sort().reverse());
    expect(ids[0]!.every((id) => five.includes(id as ModuleId))).toBe(true);
    expect(ids[1]!.every((id) => five.includes(id as ModuleId))).toBe(true);
    // page 3 = the fifth module + the first of the pair
    expect(ids[2]).toEqual([[...five].sort()[0], pairLate]);
  });

  it('the 100 µs pair in ONE millisecond: a page boundary BETWEEN them keeps both (limit 1)', async () => {
    const { ids, cursors } = await pages(1);
    expect(ids.flat()).toEqual(expectedOrder());
    // The cursor that ends at pairLate carries its exact µs text (⛔ a ms-truncated Date).
    const idx = ids.findIndex((p) => p[0] === pairLate);
    expect(decodeModuleCursor(cursors[idx]!).createdAtExact).toMatch(/:00\.0002[+-]\d{2}(:\d{2})?$/) // µs kept, in whatever session zone;
    expect(decodeModuleCursor(cursors[idx]!).moduleId).toBe(pairLate);
  });

  it('a limit above the cap is clamped; a non-positive limit is clamped up to 1', async () => {
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      await enterAppScope(c, P);
      const db = bindScopedDb(c);
      expect((await pageModulesForPariwar(db, P, { limit: 10_000 })).items).toHaveLength(7);
      const zero = await pageModulesForPariwar(db, P, { limit: 0 });
      expect(zero.items).toHaveLength(1);
      expect(zero.nextCursor).not.toBeNull();
      await c.query('COMMIT');
    } finally {
      c.release();
    }
  });

  it('listModulesForPariwar is UNCHANGED — an array of at most `limit` rows, same order', async () => {
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      await enterAppScope(c, P);
      const rows = await listModulesForPariwar(bindScopedDb(c), P, { limit: 200 });
      expect(Array.isArray(rows)).toBe(true);
      expect(rows.map((r) => r.moduleId)).toEqual(expectedOrder());
      expect(await listModulesForPariwar(bindScopedDb(c), P, { limit: 2 })).toHaveLength(2);
      await c.query('COMMIT');
    } finally {
      c.release();
    }
  });
});
