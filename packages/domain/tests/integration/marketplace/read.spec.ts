// Story 12.1 (AC8) — the read accessors: tenant isolation, the capped list, and `getModuleStateAt` between
// two transitions. Live DB.
//
// ⚠ `events_log.occurred_at` defaults to `now()` — the TRANSACTION START — so two events in one transaction
// share an instant and no `at` can fall between them. The state-at leg therefore commits each transition in
// its OWN transaction (own pool; cleanup by id) and takes `at` from `clock_timestamp()` between them.

import { randomUUID } from 'node:crypto';

import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { bindScopedDb, setPariwarScope } from '../../../src/db.js';
import { pariwarId as toPariwarId, type ModuleId } from '../../../src/ids/index.js';
import { activateModule, archiveModule, authorModule, submitModuleLead } from '../../../src/marketplace/commands.js';
import {
  LIST_MODULES_DEFAULT_LIMIT,
  LIST_MODULES_MAX_LIMIT,
  getModule,
  getModuleStateAt,
  listModulesForPariwar,
} from '../../../src/marketplace/read.js';
import { DATABASE_URL, getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppScope } from '../_helpers.js';
import { RAW_INSERT_SQL, manifestInput, newLeadId, newMemberId, newModuleId, rawInsertParams, txNow } from './_fixtures.js';

const A = toPariwarId(PARIWAR_A);
const B = toPariwarId(PARIWAR_B);
const base = (pariwarId: typeof A, moduleId: ModuleId) => ({
  pariwarId,
  moduleId,
  auditId: randomUUID(),
  actor: 'operator' as const,
  actorId: randomUUID(),
});

describe.skipIf(!hasDatabase)('marketplace reads — isolation and the capped list (AC8)', () => {
  setupLiveDb();

  it('getModule and listModulesForPariwar never return another tenant’s module', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_B);
    const bId = newModuleId();
    await authorModule(client, { ...base(B, bId), manifest: manifestInput(await txNow(client)) });
    await enterAppScope(client, PARIWAR_A);
    const aId = newModuleId();
    await authorModule(client, { ...base(A, aId), manifest: manifestInput(await txNow(client)) });
    const db = bindScopedDb(client);

    expect((await getModule(db, A, aId))?.moduleId).toBe(aId);
    // Under scope A: B's module is invisible by RLS, and asking for it under pariwarId B returns nothing.
    expect(await getModule(db, A, bId)).toBeNull();
    expect(await getModule(db, B, bId)).toBeNull();
    const listA = await listModulesForPariwar(db, A);
    expect(listA.some((m) => m.moduleId === aId)).toBe(true);
    expect(listA.every((m) => m.pariwarId === PARIWAR_A)).toBe(true);
    expect(await listModulesForPariwar(db, B)).toEqual([]);

    // Under scope B, symmetric.
    await enterAppScope(client, PARIWAR_B);
    expect((await getModule(db, B, bId))?.moduleId).toBe(bId);
    expect(await getModule(db, B, aId)).toBeNull();
    expect((await listModulesForPariwar(db, B)).some((m) => m.moduleId === aId)).toBe(false);
  });

  it('the list filters by state, orders created_at DESC then module_id DESC, and is clamped', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const ids: ModuleId[] = [];
    for (let n = 0; n < 3; n += 1) {
      const id = newModuleId();
      ids.push(id);
      await authorModule(client, { ...base(A, id), manifest: manifestInput(await txNow(client)) });
    }
    await activateModule(client, base(A, ids[0]!));
    const db = bindScopedDb(client);

    const mine = (rows: { moduleId: string }[]) => rows.map((r) => r.moduleId).filter((x) => ids.includes(x as ModuleId));
    // One transaction ⇒ one created_at ⇒ the module_id DESC tie-break decides.
    expect(mine(await listModulesForPariwar(db, A))).toEqual([...ids].sort().reverse());
    expect(mine(await listModulesForPariwar(db, A, { state: 'active' }))).toEqual([ids[0]]);
    expect(mine(await listModulesForPariwar(db, A, { state: 'draft' }))).toEqual([ids[2], ids[1]].sort().reverse());
    expect(await listModulesForPariwar(db, A, { limit: 2 })).toHaveLength(2);
    // A negative / zero limit is clamped UP to 1 (⛔ Postgres `LIMIT -1` = all rows).
    expect(await listModulesForPariwar(db, A, { limit: -1 })).toHaveLength(1);
    expect(await listModulesForPariwar(db, A, { limit: 0 })).toHaveLength(1);
  });

  it('a limit above the cap returns at most LIST_MODULES_MAX_LIMIT (200) rows', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    await client.query("SET LOCAL app.marketplace_module_state_writer = 'on'");
    for (let n = 0; n < LIST_MODULES_MAX_LIMIT + 5; n += 1) {
      await client.query(RAW_INSERT_SQL, rawInsertParams(randomUUID(), PARIWAR_A));
    }
    const rows = await listModulesForPariwar(bindScopedDb(client), A, { limit: 10_000 });
    expect(rows).toHaveLength(LIST_MODULES_MAX_LIMIT);
    // RP10 (d): with NO limit the page is QE12's default of 50 — the LITERAL, not the constant (a test that reads the
    // constant it is testing moves with a mutation of it).
    expect(LIST_MODULES_DEFAULT_LIMIT).toBe(50);
    expect(await listModulesForPariwar(bindScopedDb(client), A)).toHaveLength(50);
  });

  // RP10 (e) — every other cross-tenant leg here runs under twt_app, so RLS alone returns nothing and the explicit
  // `pariwar_id` predicate (defence in depth) could be deleted with the suite still green. Here RLS is BYPASSED
  // (the test's own superuser): only the predicate is left to refuse.
  it('RP10 (e): the explicit pariwar_id predicate holds with RLS bypassed — getModule, the list and getModuleStateAt', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_B);
    const bId = newModuleId();
    await authorModule(client, { ...base(B, bId), manifest: manifestInput(await txNow(client)) });
    await enterAppScope(client, PARIWAR_A);
    const aId = newModuleId();
    await authorModule(client, { ...base(A, aId), manifest: manifestInput(await txNow(client)) });
    await activateModule(client, base(A, aId));

    await client.query('RESET ROLE');
    const bypass = await client.query<{ bypass: boolean }>(
      'SELECT (rolsuper OR rolbypassrls) AS bypass FROM pg_roles WHERE rolname = current_user',
    );
    expect(bypass.rows[0]!.bypass, 'the test role must bypass RLS, or this leg isolates nothing').toBe(true);

    const db = bindScopedDb(client);
    expect((await getModule(db, A, aId))?.moduleId).toBe(aId);
    expect(await getModule(db, A, bId)).toBeNull(); // B's module, asked for under A
    expect(await getModule(db, B, aId)).toBeNull(); // A's module, asked for under B
    expect((await listModulesForPariwar(db, A)).every((m) => m.pariwarId === PARIWAR_A)).toBe(true);
    const later = new Date(Date.now() + 60_000);
    expect(await getModuleStateAt(db, A, aId, later)).toBe('active');
    expect(await getModuleStateAt(db, B, aId, later)).toBe('draft'); // A's stream seen from B: the empty fold
  });
});

describe.skipIf(!hasDatabase)('marketplace reads — getModuleStateAt between transitions (AC8, own-committing)', () => {
  let pool: pg.Pool;
  const created: ModuleId[] = [];

  beforeAll(() => {
    pool = new pg.Pool({ connectionString: DATABASE_URL, max: 2, ssl: false });
  });
  afterAll(async () => {
    if (!pool) return; // beforeAll failed before it could create one (RP11)
    const admin = await pool.connect();
    try {
      await admin.query('BEGIN');
      await admin.query("SET LOCAL session_replication_role = 'replica'");
      await admin.query('DELETE FROM marketplace_modules WHERE module_id = ANY($1)', [created]);
      await admin.query('DELETE FROM events_log WHERE stream_id = ANY($1)', [created]);
      await admin.query('COMMIT');
    } catch (e) {
      await admin.query('ROLLBACK').catch(() => undefined);
      console.error('[marketplace read.spec] cleanup:', (e as Error).message);
    } finally {
      admin.release();
      await pool.end();
    }
  });

  async function inTx<T>(fn: (c: pg.PoolClient) => Promise<T>): Promise<T> {
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      await c.query('SET LOCAL ROLE twt_app');
      await setPariwarScope(c, PARIWAR_A);
      const out = await fn(c);
      await c.query('COMMIT');
      return out;
    } catch (e) {
      await c.query('ROLLBACK').catch(() => undefined);
      throw e;
    } finally {
      c.release();
    }
  }

  const clock = async (): Promise<Date> =>
    (await pool.query<{ t: Date }>('SELECT clock_timestamp() AS t')).rows[0]!.t;

  // RP10 (a): `clock_timestamp()` comes back through a ms-floored `Date`, while `occurred_at` carries microseconds, so a
  // capture taken within a millisecond of a transaction would land on the wrong side of it. 5 ms of padding on BOTH sides
  // of every capture. ⚠ NOT `+1 ms`: the next transition can start less than 1 ms later, which swings the flake the other way.
  const pad = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 5));

  it('returns the state as of each instant, and is tenant-scoped', async () => {
    const id = newModuleId();
    created.push(id);
    const beforeGenesis = await clock();
    await pad();
    await inTx(async (c) => authorModule(c, { ...base(A, id), manifest: manifestInput(await txNow(c)) }));
    await pad();
    const afterAuthor = await clock();
    await pad();
    await inTx(async (c) => activateModule(c, base(A, id)));
    await pad();
    const afterActivate = await clock();
    await pad();
    await inTx(async (c) => archiveModule(c, { ...base(A, id), reason: 'trustee_archived' }));
    await pad();
    const afterArchive = await clock();

    await inTx(async (c) => {
      const db = bindScopedDb(c);
      // RP10 (b): these two legs answer `draft` WITH OR WITHOUT the genesis (the fold of nothing is `draft`, by design — the
      // non-nullable getMemberStateAt shape), so they pin that SHAPE, not the genesis cut. Only the next two discriminate.
      expect(await getModuleStateAt(db, A, id, beforeGenesis)).toBe('draft');
      expect(await getModuleStateAt(db, A, id, afterAuthor)).toBe('draft');
      expect(await getModuleStateAt(db, A, id, afterActivate)).toBe('active');
      expect(await getModuleStateAt(db, A, id, afterArchive)).toBe('archived');
      // Another Pariwar's id predicate sees no events ⇒ the empty fold.
      expect(await getModuleStateAt(db, B, id, afterArchive)).toBe('draft');
    });
  });

  // RP10 (c): the other list leg runs in ONE transaction (one created_at), so only the module_id tie-break was ever
  // exercised — an `asc(createdAt)` or a missing created_at ordering survived. Two transactions, the OLDER module with the
  // HIGHER id: created_at DESC puts the newer first; module_id DESC alone would put the older first.
  it('RP10 (c): the list is newest-first by created_at, ahead of the module_id tie-break', async () => {
    const [lo, hi] = [newModuleId(), newModuleId()].sort() as [ModuleId, ModuleId];
    created.push(lo, hi);
    await inTx(async (c) => authorModule(c, { ...base(A, hi), manifest: manifestInput(await txNow(c)) })); // OLDER, higher id
    await pad();
    await inTx(async (c) => authorModule(c, { ...base(A, lo), manifest: manifestInput(await txNow(c)) })); // NEWER, lower id
    await inTx(async (c) => {
      const page = await listModulesForPariwar(bindScopedDb(c), A, { limit: 200 });
      expect(page.map((m) => m.moduleId).filter((x) => x === lo || x === hi)).toEqual([lo, hi]);
    });
  });

  it('replays the longest PREFIX when occurred_at runs against event_version (RV1)', async () => {
    const id = newModuleId();
    created.push(id);
    await inTx(async (c) => authorModule(c, { ...base(A, id), manifest: manifestInput(await txNow(c)) }));

    // `occurred_at` is the TRANSACTION START (TR4): `slow` begins FIRST — the earlier instant — but takes the
    // module lock SECOND, so its event gets the HIGHER version and the LOWER timestamp.
    const slow = await pool.connect();
    try {
      await slow.query('BEGIN');
      await slow.query('SET LOCAL ROLE twt_app');
      await setPariwarScope(slow, PARIWAR_A);
      await new Promise((resolve) => setTimeout(resolve, 60));
      await inTx(async (c) => activateModule(c, base(A, id))); // v2 — the LATER instant
      await archiveModule(slow, { ...base(A, id), reason: 'trustee_archived' }); // v3 — the EARLIER instant
      await slow.query('COMMIT');
    } catch (e) {
      await slow.query('ROLLBACK').catch(() => undefined);
      throw e;
    } finally {
      slow.release();
    }

    const stamps = await pool.query<{ event_version: string; occurred_at: Date }>(
      'SELECT event_version, occurred_at FROM events_log WHERE stream_id = $1 ORDER BY event_version',
      [id],
    );
    const stamp = (version: number): Date => stamps.rows.find((r) => Number(r.event_version) === version)!.occurred_at;
    // `occurred_at` carries microseconds and a JS Date milliseconds, so `at` is taken 1 ms past the event's own instant.
    const at = (version: number): Date => new Date(stamp(version).getTime() + 1);
    expect(stamp(3).getTime(), 'precondition: v3 carries the EARLIER instant').toBeLessThan(stamp(2).getTime() - 20);

    await inTx(async (c) => {
      const db = bindScopedDb(c);
      // `at` = just past v3's own instant: v2 (the later instant) is not yet true; v3 (earlier, higher version) is. The
      // prefix {v1} is a state the module HAD (draft). The old timestamp filter replayed {v1, v3} — a state it
      // never had — and answered 'archived'.
      expect(await getModuleStateAt(db, A, id, at(3))).toBe('draft');
      expect(await getModuleStateAt(db, A, id, at(2))).toBe('archived');
    });
  });

  it('reads no module.lead_submitted rows, and a stream holding a lead still replays to its transition state (RV1)', async () => {
    const id = newModuleId();
    created.push(id);
    await inTx(async (c) => authorModule(c, { ...base(A, id), manifest: manifestInput(await txNow(c)) }));
    await inTx(async (c) => activateModule(c, base(A, id)));
    const member = newMemberId();
    await inTx(async (c) =>
      submitModuleLead(c, { ...base(A, id), actor: 'member', actorId: member, memberId: member, leadId: newLeadId() }),
    );
    await pad();
    const afterLead = await clock();

    await inTx(async (c) => {
      const spy = vi.spyOn(c, 'query');
      let state: string;
      let sent: string;
      try {
        state = await getModuleStateAt(bindScopedDb(c), A, id, afterLead);
        sent = spy.mock.calls.map(([q]) => (typeof q === 'string' ? q : (q as { text: string }).text)).join('\n');
      } finally {
        spy.mockRestore(); // RP10 (f): also when the call throws
      }
      expect(state).toBe('active');
      expect(sent).toContain('"events_log"');
      // A lead is a same-state event, so the read excludes it: an uncapped module's stream is one row per lead.
      expect(sent).toMatch(/"event_type" <> \$\d/);
    });
  });
});
