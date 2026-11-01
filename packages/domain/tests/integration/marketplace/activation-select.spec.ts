// Story 12.2 (`2026-11-01-433` QE7 (A); AC9's select leg; TR20) — `selectDueScheduledModules`: the activation sweep's
// UNSCOPED, CROSS-TENANT due scan on DB `now()` (or the test-only `asOf`). Live DB, own pool, own commits (a module must
// be COMMITTED `scheduled` for another session's scan to see it), cleanup by id.
//
// ⚠ The scan is cross-tenant and spec files run in parallel, so every assertion is on THIS spec's OWN module ids.
// ⚠ `asOf` serves only the "selected / ⛔ selected" legs (QE7): the real-clock leg below sleeps past `valid_from`.

import { randomUUID } from 'node:crypto';

import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { pariwarId as toPariwarId, type ModuleId } from '../../../src/ids/index.js';
import { selectDueScheduledModules } from '../../../src/marketplace/activation-sweep.js';
import { activateModule, authorModule, scheduleModule } from '../../../src/marketplace/commands.js';
import { DATABASE_URL, hasDatabase } from '../../../src/test-utils/integration-setup.js';
import { enterAppScope } from '../_helpers.js';
import { HOUR_MS, manifestInput, newModuleId, seedPartner, txNow } from './_fixtures.js';

const P = toPariwarId(randomUUID());
const LEAD_MS = 2_000;

describe.skipIf(!hasDatabase)('selectDueScheduledModules — the due scan (AC9)', { timeout: 20_000 }, () => {
  let pool: pg.Pool;
  let partnerId: string;
  const created: ModuleId[] = [];
  // Filled in beforeAll, in ONE transaction (so they share a `now()` = T0).
  let t0: Date;
  const opensSoon = newModuleId(); // scheduled, [T0+2s, T0+1h)
  const shortWindow = newModuleId(); // scheduled, [T0+2s, T0+3s) — its window closes 1 s after it opens
  const activeNow = newModuleId(); // active (⛔ scheduled)
  const draftLater = newModuleId(); // draft with a future start (⛔ scheduled)

  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: DATABASE_URL, max: 2, ssl: false });
    pool.on('error', (err) => console.error('[activation-select pool]', err.message));
    const c = await pool.connect();
    try {
      partnerId = await seedPartner(c, P);
      await c.query('BEGIN');
      await enterAppScope(c, P);
      t0 = await txNow(c);
      const iso = (ms: number) => new Date(t0.getTime() + ms).toISOString();
      const base = (id: ModuleId) => ({ pariwarId: P, moduleId: id, auditId: randomUUID(), actor: 'operator' as const, actorId: randomUUID() });
      const author = async (id: ModuleId, from: number, until: number) => {
        created.push(id);
        await authorModule(c, { ...base(id), manifest: manifestInput(t0, { partner_id: partnerId, valid_from: iso(from), valid_until: iso(until) }) });
      };
      await author(opensSoon, LEAD_MS, HOUR_MS);
      await scheduleModule(c, base(opensSoon));
      await author(shortWindow, LEAD_MS, LEAD_MS + 1_000);
      await scheduleModule(c, base(shortWindow));
      await author(activeNow, -HOUR_MS, HOUR_MS);
      await activateModule(c, base(activeNow));
      await author(draftLater, LEAD_MS, HOUR_MS);
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
    try {
      await admin.query('BEGIN');
      await admin.query("SET LOCAL session_replication_role = 'replica'");
      await admin.query('DELETE FROM marketplace_modules WHERE module_id = ANY($1)', [created]);
      await admin.query('DELETE FROM events_log WHERE stream_id = ANY($1)', [created]);
      await admin.query('DELETE FROM marketplace_partners WHERE partner_id = $1', [partnerId]);
      await admin.query('COMMIT');
    } catch (e) {
      await admin.query('ROLLBACK').catch(() => undefined);
      console.error('[activation-select.spec] cleanup:', (e as Error).message);
    } finally {
      admin.release();
      await pool.end();
    }
  });

  const mine = async (asOf?: Date): Promise<string[]> =>
    (await selectDueScheduledModules(pool, asOf ? { asOf } : {})).map((m) => m.moduleId).filter((id) => created.includes(id as ModuleId));

  it('before valid_from: ⛔ selected', async () => {
    expect(await mine(t0)).toEqual([]);
    expect(await mine(new Date(t0.getTime() + LEAD_MS - 1))).toEqual([]);
  });

  it('at valid_from (inclusive): BOTH scheduled modules are selected, oldest start first then module_id; ⛔ active, ⛔ draft', async () => {
    const at = new Date(t0.getTime() + LEAD_MS);
    expect(await mine(at)).toEqual([opensSoon, shortWindow].sort());
    const rows = (await selectDueScheduledModules(pool, { asOf: at })).filter((m) => m.moduleId === opensSoon);
    expect(rows[0]).toMatchObject({ pariwarId: P, moduleId: opensSoon });
    expect(rows[0]!.validFrom.getTime()).toBe(at.getTime());
  });

  it('a scheduled module whose valid_until has passed is ⛔ selected (it stays scheduled for 12.6 — C2 (c))', async () => {
    expect(await mine(new Date(t0.getTime() + LEAD_MS + 1_000))).toEqual([opensSoon]);
    expect(await mine(new Date(t0.getTime() + 2 * HOUR_MS))).toEqual([]);
  });

  it('the real path judges DB now(): after the start time passes, the module is due with NO asOf', async () => {
    // (⛔ a "not yet" pre-assertion: under load the earlier legs may already have taken 2 s — the asOf legs cover it.)
    const sinceStart = Date.now() - t0.getTime();
    await new Promise((r) => setTimeout(r, Math.max(0, LEAD_MS + 300 - sinceStart)));
    expect(await mine()).toContain(opensSoon);
  });

  it('a limit is clamped (⛔ LIMIT 0 = no rows; ⛔ a negative limit = all rows)', async () => {
    const at = new Date(t0.getTime() + LEAD_MS);
    expect((await selectDueScheduledModules(pool, { asOf: at, limit: 0 })).length).toBeLessThanOrEqual(1);
    expect((await selectDueScheduledModules(pool, { asOf: at, limit: -5 })).length).toBeLessThanOrEqual(1);
  });
});
