// Story 6.27d — the inspector's discrepancy: the ORDERING and RACE legs, own-committing (Task 2.6; AC3, AC5; R2).
//
// ⚠ Own-committing (NOT setupLiveDb), the `ground-inspection-concurrency.spec.ts` header pattern: every step COMMITS on its
// own pooled connection, so the DB clock really advances between them ([[project_db_clock_ordering_tests_tie]]) and two
// transactions really contend for the claim row lock. Each test mints a FRESH Pariwar; cleanup deletes every row of those
// Pariwars under `session_replication_role = 'replica'` (the append-only triggers). Assertions key on OUR ids, ⛔ never
// on counts of shared tables.
//   · AC5 — `completed_at` < `shown_at` when the showing is written in its OWN transaction after the completion commits;
//   · AC3 / R2 — an answer writer BLOCKED on the claim lock while completion holds it lands AFTER: ⛔ in the in-tx result
//     and ⛔ in the as-of recompute; a writer whose transaction BEGAN before the completion's but took the lock after it:
//     ⛔ in either; a writer that committed after the completion's transaction began but BEFORE it took the lock: IN both
//     (the leg that diverges if `completed_at` were `now()` — the red-check);
//   · AC5 — two concurrent re-reads record ONE showing and return the same row.

import { randomUUID } from 'node:crypto';

import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { readOrRecomputeInspectionDiscrepancy, recordInspectionDiscrepancyShowing } from '../../../src/claim/index.js';
import { bindScopedDb, setPariwarScope } from '../../../src/db.js';
import { claimId as toClaimId, memberId as toMemberId, pariwarId as toPariwarId, type ClaimId, type GroundInspectionId, type PariwarId } from '../../../src/ids/index.js';
import { driveClaimTo, seedDeathCertificate } from '../_helpers.js';
import { completeWithDate, scheduleWithOriginalPhoto } from './_inspection-discrepancy-fixtures.js';
import { attachTextedPings, savePeerFixtureAnswer, type TextedPing } from './_peer-reply-fixtures.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);
const INSPECTOR = 'c3c3c3c3-0000-4000-8000-000000000003';

describe.skipIf(!hasDatabase)('Story 6.27d — discrepancy ordering + races (own-committing)', { timeout: 20000 }, () => {
  let pool: pg.Pool;
  const pariwars: string[] = [];

  beforeAll(() => {
    pool = new pg.Pool({ connectionString: DATABASE_URL, max: 8, ssl: false, connectionTimeoutMillis: 5000 });
  });

  afterAll(async () => {
    if (pariwars.length > 0) {
      const c = await pool.connect();
      try {
        await c.query('BEGIN');
        await c.query("SET LOCAL session_replication_role = 'replica'");
        const { rows } = await c.query<{ table_name: string }>(
          `SELECT c.table_name FROM information_schema.columns c
             JOIN information_schema.tables t ON t.table_schema = c.table_schema AND t.table_name = c.table_name
            WHERE c.table_schema = 'public' AND c.column_name = 'pariwar_id' AND t.table_type = 'BASE TABLE'`,
        );
        for (const { table_name } of rows) await c.query(`DELETE FROM "${table_name}" WHERE pariwar_id::text = ANY($1)`, [pariwars]);
        await c.query('COMMIT');
      } catch (e) {
        await c.query('ROLLBACK').catch(() => undefined);
        console.error('[ground-inspection-discrepancy-concurrency.spec] cleanup:', (e as Error).message);
      } finally {
        c.release();
      }
    }
    await pool.end();
  });

  async function asSuperuser<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const out = await fn(client);
      await client.query('COMMIT');
      return out;
    } catch (err) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw err;
    } finally {
      client.release();
    }
  }

  async function openTx(pid: PariwarId) {
    const client = await pool.connect();
    await client.query('BEGIN');
    await client.query('SET LOCAL ROLE twt_app');
    await setPariwarScope(client, pid);
    const { rows } = await client.query<{ pid: number }>('SELECT pg_backend_pid() AS pid');
    return {
      client,
      backendPid: rows[0]!.pid,
      commit: async () => {
        await client.query('COMMIT');
        client.release();
      },
      rollback: async () => {
        await client.query('ROLLBACK').catch(() => undefined);
        client.release();
      },
    };
  }

  async function onOwnTx<T>(pid: PariwarId, fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
    const tx = await openTx(pid);
    try {
      const out = await fn(tx.client);
      await tx.commit();
      return out;
    } catch (err) {
      await tx.rollback();
      throw err;
    }
  }

  async function waitUntilBlocked(backendPid: number): Promise<void> {
    for (let i = 0; i < 200; i += 1) {
      const { rows } = await pool.query<{ n: number }>(`SELECT count(*)::int AS n FROM pg_stat_activity WHERE pid = $1 AND wait_event_type = 'Lock'`, [backendPid]);
      if (rows[0]!.n === 1) return;
      await new Promise((r) => setTimeout(r, 25));
    }
    throw new Error(`backend ${backendPid} never blocked on a lock`);
  }

  interface Seeded {
    readonly pid: PariwarId;
    readonly cid: ClaimId;
    readonly gid: GroundInspectionId;
    readonly ping: TextedPing;
  }

  /** COMMITTED: a fresh Pariwar's claim in the window, a current certificate, ONE texted neighbour, and a scheduled
   *  assignment with its original's photo. */
  async function seed(): Promise<Seeded> {
    const pid = toPariwarId(randomUUID());
    pariwars.push(pid);
    const cid = toClaimId(randomUUID());
    const ping = await asSuperuser(async (c) => {
      const mid = toMemberId(randomUUID());
      await c.query('SET LOCAL ROLE twt_app');
      await setPariwarScope(c, pid);
      await driveClaimTo(c, pid, cid, mid, 'verification_in_progress');
      await seedDeathCertificate(c, { pariwarId: pid, claimCaseId: cid });
      await c.query('RESET ROLE');
      return (await attachTextedPings(c, pid, cid, mid, 1))[0]!;
    });
    const gid = await onOwnTx(pid, (c) => scheduleWithOriginalPhoto(c, pid, cid, { inspector: INSPECTOR }));
    return { pid, cid, gid, ping };
  }

  const recompute = (s: Seeded) => onOwnTx(s.pid, (c) => readOrRecomputeInspectionDiscrepancy(bindScopedDb(c), s.pid, s.gid));

  it('AC5 — `completed_at` < `shown_at`: the showing is written in its OWN transaction after the completion commits', async () => {
    const s = await seed();
    const done = await onOwnTx(s.pid, (c) => completeWithDate(c, s.pid, s.cid, s.gid, { actor: INSPECTOR }));
    expect(done.discrepancy).toEqual({ questionKeys: [] });
    expect(await onOwnTx(s.pid, (c) => recordInspectionDiscrepancyShowing(bindScopedDb(c), { pariwarId: s.pid, groundInspectionId: s.gid, questionKeys: [] }))).toEqual({
      persisted: true,
    });
    const { rows } = await pool.query<{ ordered: boolean; completed: string; shown: string }>(
      `SELECT gi.completed_at < sh.shown_at AS ordered, gi.completed_at::text AS completed, sh.shown_at::text AS shown
         FROM claim_ground_inspections gi
         JOIN claim_ground_inspection_discrepancy_showings sh ON sh.ground_inspection_id = gi.ground_inspection_id
        WHERE gi.ground_inspection_id = $1`,
      [s.gid],
    );
    expect(rows[0]?.ordered, `${rows[0]?.completed} vs ${rows[0]?.shown}`).toBe(true);
  });

  it('R2 — an answer BLOCKED on the claim lock while completion holds it lands AFTER: ⛔ in the in-tx result, ⛔ in the recompute', async () => {
    const s = await seed();
    const completion = await openTx(s.pid);
    const result = await completeWithDate(completion.client, s.pid, s.cid, s.gid, { actor: INSPECTOR });
    const writer = await openTx(s.pid);
    const saving = savePeerFixtureAnswer(writer.client, s.pid, s.ping, 'has_died', { codes: ['not_died'] }).then(
      async (r) => (await writer.commit(), r),
      async (e: unknown) => (await writer.rollback(), Promise.reject(e)),
    );
    await waitUntilBlocked(writer.backendPid);
    expect(result.discrepancy).toEqual({ questionKeys: [] });
    await completion.commit();
    await saving;
    expect((await recompute(s)).questionKeys).toEqual([]);
  });

  it('R2 — a writer whose transaction BEGAN before the completion\'s but took the lock AFTER it: ⛔ in either result', async () => {
    const s = await seed();
    const writer = await openTx(s.pid);
    await writer.client.query('SELECT now()');
    const done = await onOwnTx(s.pid, (c) => completeWithDate(c, s.pid, s.cid, s.gid, { actor: INSPECTOR }));
    await savePeerFixtureAnswer(writer.client, s.pid, s.ping, 'has_died', { codes: ['not_died'] });
    await writer.commit();
    expect(done.discrepancy).toEqual({ questionKeys: [] });
    expect((await recompute(s)).questionKeys).toEqual([]);
  });

  it('R2 — a writer that committed AFTER the completion\'s transaction began but BEFORE it took the lock: IN both (the `now()` red-check leg)', async () => {
    const s = await seed();
    const completion = await openTx(s.pid);
    await completion.client.query('SELECT now()');
    await onOwnTx(s.pid, (c) => savePeerFixtureAnswer(c, s.pid, s.ping, 'has_died', { codes: ['not_died'] }));
    const result = await completeWithDate(completion.client, s.pid, s.cid, s.gid, { actor: INSPECTOR });
    await completion.commit();
    expect(result.discrepancy).toEqual({ questionKeys: ['has_died'] });
    expect((await recompute(s)).questionKeys).toEqual(['has_died']);
  });

  it('AC5 — two CONCURRENT re-reads record ONE showing and return the same row', async () => {
    const s = await seed();
    await onOwnTx(s.pid, (c) => savePeerFixtureAnswer(c, s.pid, s.ping, 'has_died', { codes: ['not_died'] }));
    await onOwnTx(s.pid, (c) => completeWithDate(c, s.pid, s.cid, s.gid, { actor: INSPECTOR }));
    const [a, b] = await Promise.all([recompute(s), recompute(s)]);
    expect(a).toEqual(b);
    expect(a.questionKeys).toEqual(['has_died']);
    const { rows } = await pool.query<{ n: number }>(`SELECT count(*)::int AS n FROM claim_ground_inspection_discrepancy_showings WHERE ground_inspection_id = $1`, [s.gid]);
    expect(rows[0]!.n).toBe(1);
  });
});
