// The partner-module ACTIVATION sweep — Story 12.2 (`2026-11-01-433` QE7 (A), QE19; AC9).
//
// Unit: the registration (queue, 5-minute cron, IST, `localConcurrency: 1`) and boot.ts's dedicated `max: 3` pool.
// Live (the story container): a `scheduled` module whose start has passed goes `active` on the next tick (actor `system`,
// audit intent `actorId: null`); a module withdrawn BETWEEN selection and activation is `skipped` (its intent +
// `module.activated_rolled_back` lines exist — accepted); under an RLS-bound role the tick raises ONE
// `module_activation.rls_bound_role` alarm and activates nothing; a second tick is a no-op for the test's own ids.
// ⚠ The scan is CROSS-TENANT and spec files run in parallel — every assertion is on this file's OWN module ids (TR20).

import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { createDb, ids, marketplace, withPariwarScope } from '@twt/domain';
import { QUEUE_NAMES } from '@twt/queue';
import type pg from 'pg';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_MODULE_ACTIVATION_CRON,
  MODULE_ACTIVATION_TZ,
  activateDueModule,
  registerModuleActivationCron,
  runModuleActivationTick,
} from '../src/scheduler/module-activation.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);

describe('module-activation — registration and pool (unit)', () => {
  it('creates the queue, works it ONE tick at a time, and schedules every 5 minutes in IST', async () => {
    const createQueue = vi.fn(async () => undefined);
    const work = vi.fn(async () => 'worker-id');
    const schedule = vi.fn(async () => undefined);
    const boss = { createQueue, work, schedule } as unknown as Parameters<typeof registerModuleActivationCron>[0];
    await registerModuleActivationCron(boss, { pool: {} as pg.Pool });
    expect(DEFAULT_MODULE_ACTIVATION_CRON).toBe('*/5 * * * *');
    expect(MODULE_ACTIVATION_TZ).toBe('Asia/Kolkata');
    expect(createQueue).toHaveBeenCalledWith(QUEUE_NAMES.MODULE_ACTIVATION);
    expect(work).toHaveBeenCalledWith(QUEUE_NAMES.MODULE_ACTIVATION, { localConcurrency: 1 }, expect.any(Function));
    expect(schedule).toHaveBeenCalledWith(QUEUE_NAMES.MODULE_ACTIVATION, '*/5 * * * *', {}, { tz: 'Asia/Kolkata' });
    expect(QUEUE_NAMES.MODULE_ACTIVATION).toBe('module.activation');
  });

  it('boot.ts gives the sweep its OWN max:3 pool (⛔ the shared max:2 pool), ends it twice, and checks the cron shape', () => {
    const boot = readFileSync(new URL('../src/boot.ts', import.meta.url), 'utf-8');
    expect(boot).toMatch(/const \{ pool: moduleActivationPool \} = createDb\(connectionString, \{ max: 3, logger: false \}\)/);
    expect(boot).toMatch(/registerModuleActivationCron\(\s*boss,\s*\{ pool: moduleActivationPool \}/);
    expect(boot.match(/moduleActivationPool\.end\(\)/g)).toHaveLength(2);
    expect(boot).toMatch(/MODULE_ACTIVATION_CRON must be a 5-field cron expression/);
  });

  it('⛔ BYPASSRLS ⇒ ONE `module_activation.rls_bound_role` alarm and ⛔ scan (the scan would see ⛔ row, silently)', async () => {
    const statements: string[] = [];
    const pool = {
      query: vi.fn(async (text: string) => {
        statements.push(text);
        return { rows: [{ ok: false }], rowCount: 1 };
      }),
      connect: vi.fn(),
    } as unknown as pg.Pool;
    const alarms: string[] = [];
    expect(await runModuleActivationTick({ pool, onAlarm: (m) => alarms.push(m) })).toEqual({
      refused: true,
      selected: 0,
      activated: 0,
      skipped: 0,
      failed: 0,
    });
    expect(alarms).toHaveLength(1);
    expect(alarms[0]).toContain('module_activation.rls_bound_role');
    expect(statements).toHaveLength(1);
    expect(statements[0]).toContain('rolbypassrls');
  });
});

// 12.2 review RB6: the `failed` branch, STUBBED (no DB). A pg error's own `name` is `"error"`, so the log carries the
// Pariwar and the SQLSTATE found by walking `cause` (`marketplace.pgSqlstateOf`) — and one failure never ends the tick.
describe('module-activation — a failed candidate (unit, stubbed pool)', () => {
  const P1 = '0f8fad5b-d9cb-469f-a165-70867728950e';
  const M1 = '6ba7b810-9dad-41d1-80b4-00c04fd430c8';
  const P2 = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
  const M2 = '9b2f1c3e-5d4a-4b6c-8e7f-0a1b2c3d4e5f';

  it('logs pariwarId + moduleId + the SQLSTATE under `cause`, and the loop runs the next candidate', async () => {
    // The drizzle shape: a wrapper whose `cause` is pg's DatabaseError (`name` "error", a SQLSTATE, a severity).
    const pgError = Object.assign(new Error('terminating connection due to administrator command'), {
      name: 'error',
      code: '57P01',
      severity: 'FATAL',
    });
    const failures: unknown[] = [Object.assign(new Error('Failed query: BEGIN'), { cause: pgError }), new Error('not a pg error')];
    const connect = vi.fn(async () => {
      throw failures.shift();
    });
    const pool = {
      query: vi.fn(async (text: string) =>
        text.includes('rolbypassrls')
          ? { rows: [{ ok: true }], rowCount: 1 }
          : {
              rows: [
                { pariwar_id: P1, module_id: M1, valid_from: new Date(0), valid_until: new Date(8.64e15) },
                { pariwar_id: P2, module_id: M2, valid_from: new Date(0), valid_until: new Date(8.64e15) },
              ],
              rowCount: 2,
            },
      ),
      connect,
    } as unknown as pg.Pool;
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    try {
      expect(await runModuleActivationTick({ pool })).toEqual({ refused: false, selected: 2, activated: 0, skipped: 0, failed: 2 });
      expect(connect).toHaveBeenCalledTimes(2); // the SECOND candidate ran after the first failed
      const lines = error.mock.calls.filter((c) => String(c[0]).includes('module-activation: activation failed'));
      expect(lines.map((c) => JSON.parse(String(c[1])) as unknown)).toEqual([
        { pariwarId: P1, moduleId: M1, error: 'Error', sqlstate: '57P01' },
        { pariwarId: P2, moduleId: M2, error: 'Error', sqlstate: null },
      ]);
    } finally {
      error.mockRestore();
      info.mockRestore();
    }
  });
});

describe.skipIf(!hasDatabase)('module-activation — live ticks (own pool, own commits)', { timeout: 30_000 }, () => {
  let created: ReturnType<typeof createDb>;
  let pool: pg.Pool;
  const pariwar = ids.pariwarId(randomUUID());
  let partnerId: string;
  const mine: string[] = [];

  beforeAll(async () => {
    created = createDb(DATABASE_URL as string, { max: 3, logger: false });
    pool = created.pool;
    partnerId = randomUUID();
    await pool.query(
      `INSERT INTO marketplace_partners (partner_id, pariwar_id, display_name_en, display_name_hi, created_by_actor_id, audit_id)
       VALUES ($1, $2, $3, 'एचडीएफसी', $4, $5)`,
      [partnerId, pariwar, `HDFC ${randomUUID()}`, randomUUID(), randomUUID()],
    );
  });

  afterAll(async () => {
    if (!pool) return;
    const admin = await pool.connect();
    try {
      await admin.query('BEGIN');
      await admin.query("SET LOCAL session_replication_role = 'replica'");
      await admin.query('DELETE FROM marketplace_modules WHERE module_id = ANY($1)', [mine]);
      await admin.query('DELETE FROM events_log WHERE stream_id = ANY($1)', [mine]);
      await admin.query('DELETE FROM marketplace_partners WHERE partner_id = $1', [partnerId]);
      await admin.query('COMMIT');
    } catch (e) {
      await admin.query('ROLLBACK').catch(() => undefined);
      console.error('[module-activation.test] cleanup:', (e as Error).message);
    } finally {
      admin.release();
      await pool.end();
    }
  });

  /** Author + schedule a module starting `startInMs` from the transaction's `now()`; committed. */
  async function scheduled(startInMs: number): Promise<string> {
    const moduleId = ids.moduleId(randomUUID());
    mine.push(moduleId);
    await withPariwarScope(pool, pariwar, async (_db, client) => {
      const now = (await client.query<{ now: Date }>('SELECT now() AS now')).rows[0]!.now;
      const base = { pariwarId: pariwar, moduleId, actor: 'operator' as const, actorId: randomUUID() };
      await marketplace.authorModule(client, {
        ...base,
        auditId: randomUUID(),
        manifest: {
          partner_id: partnerId,
          name_en: 'Health camp',
          name_hi: 'स्वास्थ्य शिविर',
          description_en: 'A free health camp.',
          description_hi: 'निःशुल्क स्वास्थ्य शिविर।',
          eligibility_filter: { version: 1, clauses: [] },
          scope_filter: { version: 1, scope: 'members-all' },
          valid_from: new Date(now.getTime() + startInMs).toISOString(),
          valid_until: new Date(now.getTime() + 3_600_000).toISOString(),
          slot_capacity: null,
          lead_handoff_url: 'https://leads.partner.example/camp',
          lead_handoff_signing_key_secret_name: 'marketplace-camp-key',
          branding_bundle: { version: 1, logo_object_key: null, accent_color_hex: null },
        },
      });
      await marketplace.scheduleModule(client, { ...base, auditId: randomUUID() });
    });
    return moduleId;
  }

  async function stateOf(moduleId: string): Promise<string> {
    const r = await pool.query<{ current_state: string }>('SELECT current_state FROM marketplace_modules WHERE module_id = $1', [
      moduleId,
    ]);
    return r.rows[0]!.current_state;
  }

  async function auditActions(moduleId: string): Promise<{ action: string; actor_id: string | null }[]> {
    const r = await pool.query<{ action: string; actor_id: string | null }>(
      'SELECT action, actor_id FROM audit_log_entries WHERE resource_locator = $1 ORDER BY seq',
      [`module/${moduleId}`],
    );
    return r.rows;
  }

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  it('a scheduled module whose start has passed goes ACTIVE on the next tick (actor system, audit actorId null); a second tick is a no-op', async () => {
    const id = await scheduled(1_500);
    expect(await stateOf(id)).toBe('scheduled');
    await sleep(2_000);
    const first = await runModuleActivationTick({ pool });
    expect(first.refused).toBe(false);
    expect(await stateOf(id)).toBe('active');
    const ev = await pool.query<{ actor_id: string | null; payload: { actor: string } }>(
      "SELECT actor_id, payload FROM events_log WHERE stream_id = $1 AND event_type = 'module.activated'",
      [id],
    );
    expect(ev.rows).toHaveLength(1);
    expect(ev.rows[0]!.actor_id).toBeNull();
    expect(ev.rows[0]!.payload.actor).toBe('system');
    expect(await auditActions(id)).toEqual([{ action: 'module.activated', actor_id: null }]);

    await runModuleActivationTick({ pool });
    const again = await pool.query("SELECT 1 FROM events_log WHERE stream_id = $1 AND event_type = 'module.activated'", [id]);
    expect(again.rows).toHaveLength(1);
    expect(await auditActions(id)).toHaveLength(1);
  });

  it('a module withdrawn BETWEEN selection and activation is `skipped` — intent + `module.activated_rolled_back`, still archived', async () => {
    const id = await scheduled(1_500);
    await sleep(2_000);
    const due = await marketplace.selectDueScheduledModules(pool);
    const candidate = due.find((d) => d.moduleId === id);
    expect(candidate).toBeDefined();
    await withPariwarScope(pool, pariwar, async (_db, client) => {
      await marketplace.archiveModule(client, {
        pariwarId: pariwar,
        moduleId: ids.moduleId(id),
        auditId: randomUUID(),
        actor: 'operator',
        actorId: randomUUID(),
        reason: 'trustee_archived',
      });
    });
    expect(await activateDueModule({ pool }, candidate!)).toBe('skipped');
    expect(await stateOf(id)).toBe('archived');
    expect((await auditActions(id)).map((a) => a.action)).toEqual(['module.activated', 'module.activated_rolled_back']);
  });

  it('a module whose start has NOT come is not activated; under an RLS-bound role the tick activates nothing', async () => {
    const later = await scheduled(3_600_000 - 60_000);
    await runModuleActivationTick({ pool });
    expect(await stateOf(later)).toBe('scheduled');

    const due = await scheduled(1_000);
    await sleep(1_500);
    const bound = Object.create(pool) as pg.Pool;
    bound.query = ((text: unknown, params?: unknown) =>
      typeof text === 'string' && text.includes('rolbypassrls')
        ? Promise.resolve({ rows: [{ ok: false }] })
        : (pool.query as (t: unknown, p?: unknown) => Promise<unknown>)(text, params)) as typeof pool.query;
    const alarms: string[] = [];
    const out = await runModuleActivationTick({ pool: bound, onAlarm: (m) => alarms.push(m) });
    expect(out.refused).toBe(true);
    expect(alarms.filter((a) => a.includes('module_activation.rls_bound_role'))).toHaveLength(1);
    expect(await stateOf(due)).toBe('scheduled');
  });
});
