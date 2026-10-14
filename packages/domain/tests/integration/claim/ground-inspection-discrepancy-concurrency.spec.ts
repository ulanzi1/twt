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
//   · AC5 — two concurrent re-reads record ONE showing and return the same row (a real barrier: the second waits on the
//     first's uncommitted showing);
//   · ⭐ code review round 2 — R2-1: a note writer holding the claim lock and a re-read recording the ABSENT showing take
//     the locks in ONE order (claim → showing), ⛔ 40P01; R2-8: two note writers on one question serialize on the claim
//     lock — ONE note, the second refused by the pre-check. Every opened transaction is rolled back after a failing test
//     (a leaked claim lock would hang the cleanup).

import { randomUUID } from 'node:crypto';

import pg from 'pg';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import {
  InspectionDiscrepancyNoteExistsError,
  readOrRecomputeInspectionDiscrepancy,
  recordInspectionDiscrepancyNote,
  recordInspectionDiscrepancyShowing,
  type RecordInspectionDiscrepancyNoteInput,
} from '../../../src/claim/index.js';
import { bindScopedDb, setPariwarScope } from '../../../src/db.js';
import { claimId as toClaimId, memberId as toMemberId, pariwarId as toPariwarId, type ClaimId, type GroundInspectionId, type PariwarId } from '../../../src/ids/index.js';
import { driveClaimTo, seedDeathCertificate } from '../_helpers.js';
import { completeWithDate, forceLegacyCompletedNullSource, scheduleWithOriginalPhoto } from './_inspection-discrepancy-fixtures.js';
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

  /** ⭐ R2-8 — every transaction a test opens, in opening order; `afterEach` rolls back whatever a failing test left open.
   *  Commit / rollback are idempotent. ⭐ Round 3 (R3-17): a transaction may carry an IN-FLIGHT call (`track`) — a blocked,
   *  multi-statement domain call. Its rollback must wait for that call to settle (rolled back under it, the call's later
   *  statements would run AFTER the ROLLBACK, autocommitted, on a released client) — so the lock HOLDERS (⛔ in-flight call)
   *  roll back first, which lets every blocked call finish; then the calls settle; then the rest roll back. */
  const open: { pending: Promise<void> | null; rollback: () => Promise<void> }[] = [];

  afterEach(async () => {
    const txs = open.splice(0);
    for (const tx of txs) if (tx.pending === null) await tx.rollback();
    await Promise.allSettled(txs.map((tx) => tx.pending));
    for (const tx of txs) await tx.rollback();
  });

  async function openTx(pid: PariwarId) {
    const client = await pool.connect();
    await client.query('BEGIN');
    await client.query('SET LOCAL ROLE twt_app');
    await setPariwarScope(client, pid);
    const { rows } = await client.query<{ pid: number }>('SELECT pg_backend_pid() AS pid');
    let done = false;
    const tx = {
      client,
      backendPid: rows[0]!.pid,
      pending: null as Promise<void> | null,
      /** R3-17 — mark `p` as this transaction's in-flight call (returned unchanged). */
      track<T>(p: Promise<T>): Promise<T> {
        tx.pending = p.then(
          () => undefined,
          () => undefined,
        );
        return p;
      },
      commit: async () => {
        if (done) return;
        done = true;
        try {
          await client.query('COMMIT');
        } finally {
          client.release();
        }
      },
      rollback: async () => {
        if (done) return;
        done = true;
        await client.query('ROLLBACK').catch(() => undefined);
        client.release();
      },
    };
    open.push(tx);
    return tx;
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

  it('CR6 — concurrent historical fixtures never upgrade their shared inspection-table locks', async () => {
    const a = await seed();
    const b = await seed();
    const left = await openTx(a.pid);
    const right = await openTx(b.pid);
    try {
      // Exactly the table-lock mode held by each caller's preceding fixture INSERT.
      for (const tx of [left, right]) {
        await tx.client.query('RESET ROLE');
        await tx.client.query('LOCK TABLE public.claim_ground_inspections IN ROW EXCLUSIVE MODE');
      }
      await Promise.all([
        forceLegacyCompletedNullSource(left.client, a.pid, a.gid),
        forceLegacyCompletedNullSource(right.client, b.pid, b.gid),
      ]);
      for (const [tx, s] of [[left, a], [right, b]] as const) {
        const own = await tx.client.query('SELECT status, death_date_source FROM claim_ground_inspections WHERE ground_inspection_id = $1', [s.gid]);
        expect(own.rows).toEqual([{ status: 'completed', death_date_source: null }]);
        const publicRow = await tx.client.query('SELECT status FROM public.claim_ground_inspections WHERE ground_inspection_id = $1', [s.gid]);
        expect(publicRow.rows).toEqual([{ status: 'scheduled' }]);
      }
    } finally {
      await Promise.all([left.rollback(), right.rollback()]);
    }
  });

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
    const saving = writer.track(savePeerFixtureAnswer(writer.client, s.pid, s.ping, 'has_died', { codes: ['not_died'] })).then(
      async (r) => (await writer.commit(), r),
      async (e: unknown) => (await writer.rollback(), Promise.reject(e)),
    );
    void saving.catch(() => undefined); // awaited below; ⛔ an unhandled rejection if an assertion fails first
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
    // ⭐ R2-8 — a REAL overlap: A records the showing and holds it uncommitted; B recomputes, reaches the same INSERT and
    // WAITS on A's row; A commits; B's `ON CONFLICT DO NOTHING` then returns A's row — the winner, ⛔ its own keys.
    const a = await openTx(s.pid);
    const first = await readOrRecomputeInspectionDiscrepancy(bindScopedDb(a.client), s.pid, s.gid);
    const b = await openTx(s.pid);
    const second = b.track(readOrRecomputeInspectionDiscrepancy(bindScopedDb(b.client), s.pid, s.gid));
    void second.catch(() => undefined);
    await waitUntilBlocked(b.backendPid);
    await a.commit();
    const winner = await second;
    await b.commit();
    expect(winner).toEqual(first);
    expect(first.questionKeys).toEqual(['has_died']);
    const { rows } = await pool.query<{ n: number }>(`SELECT count(*)::int AS n FROM claim_ground_inspection_discrepancy_showings WHERE ground_inspection_id = $1`, [s.gid]);
    expect(rows[0]!.n).toBe(1);
  });

  const noteInput = (s: Seeded, noteCiphertext: string): RecordInspectionDiscrepancyNoteInput => ({
    pariwarId: s.pid,
    groundInspectionId: s.gid,
    actingActorId: INSPECTOR,
    questionKey: 'has_died',
    noteCiphertext,
    authorDisplay: 'Inspector One',
  });

  it('R2-1 — a note writer holding the claim lock and a re-read recording the ABSENT showing: claim → showing on both, ⛔ 40P01', async () => {
    const s = await seed();
    await onOwnTx(s.pid, (c) => savePeerFixtureAnswer(c, s.pid, s.ping, 'has_died', { codes: ['not_died'] }));
    await onOwnTx(s.pid, (c) => completeWithDate(c, s.pid, s.cid, s.gid, { actor: INSPECTOR }));
    // The note writer's step 2 — the claim row `FOR UPDATE`, held (the showing was never delivered: it is ABSENT).
    const writer = await openTx(s.pid);
    await writer.client.query('SELECT 1 FROM claims WHERE pariwar_id = $1 AND claim_case_id = $2 FOR UPDATE', [s.pid, s.cid]);
    // A re-read must wait on the claim row BEFORE it inserts the showing (red-check: drop `FOR KEY SHARE OF c` from the
    // showing writer — the re-read then inserts first, waits in its FK check, and the note writer's showing INSERT waits
    // on it: deadlock detected).
    const reader = await openTx(s.pid);
    const reading = reader.track(readOrRecomputeInspectionDiscrepancy(bindScopedDb(reader.client), s.pid, s.gid));
    void reading.catch(() => undefined);
    await waitUntilBlocked(reader.backendPid);
    const written = await recordInspectionDiscrepancyNote(writer.client, noteInput(s, 'enc:v1:first'));
    await writer.commit();
    const read = await reading;
    await reader.commit();
    expect(written.questionKey).toBe('has_died');
    expect(read.questionKeys).toEqual(['has_died']);
    const counts = await pool.query<{ showings: number; notes: number }>(
      `SELECT (SELECT count(*)::int FROM claim_ground_inspection_discrepancy_showings WHERE ground_inspection_id = $1) AS showings,
              (SELECT count(*)::int FROM claim_ground_inspection_discrepancy_notes WHERE ground_inspection_id = $1) AS notes`,
      [s.gid],
    );
    expect(counts.rows[0]).toEqual({ showings: 1, notes: 1 });
  });

  it('R2-8 — two note writers on ONE question serialize on the claim lock: ONE note; the second ⇒ `discrepancy_note_exists`', async () => {
    const s = await seed();
    await onOwnTx(s.pid, (c) => savePeerFixtureAnswer(c, s.pid, s.ping, 'has_died', { codes: ['not_died'] }));
    await onOwnTx(s.pid, (c) => completeWithDate(c, s.pid, s.cid, s.gid, { actor: INSPECTOR }));
    // ⭐ Round 3 (R3-7) — the showing is recorded FIRST (committed), so the claim lock is the ONLY thing the second writer
    // can wait on before its exists pre-check; ⛔ the showing's `ON CONFLICT` and ⛔ the note's UNIQUE.
    await recompute(s);
    const first = await openTx(s.pid);
    await recordInspectionDiscrepancyNote(first.client, noteInput(s, 'enc:v1:first'));
    const second = await openTx(s.pid);
    let secondNoteInserts = 0;
    const counted = new Proxy(second.client, {
      get(target, prop, receiver) {
        if (prop !== 'query') return Reflect.get(target, prop, receiver);
        return (q: unknown, ...rest: unknown[]) => {
          const text = typeof q === 'string' ? q : ((q as { text?: string } | null)?.text ?? '');
          if (/^insert into "claim_ground_inspection_discrepancy_notes"/i.test(text)) secondNoteInserts += 1;
          return (target.query as (...a: unknown[]) => unknown).call(target, q, ...rest);
        };
      },
    }) as pg.PoolClient;
    const writing = second.track(recordInspectionDiscrepancyNote(counted, noteInput(s, 'enc:v1:second')));
    void writing.catch(() => undefined);
    // The second writer waits on the CLAIM row the first holds (its blocked statement IS the claim lock) — its exists
    // pre-check runs only after the first commits. (Red-check: drop `lockClaimCase`'s `FOR UPDATE` — the second then blocks
    // on the first's note in its INSERT and is refused by the 23505 mapping: both assertions below go red.)
    await waitUntilBlocked(second.backendPid);
    const blocked = await pool.query<{ query: string }>(`SELECT query FROM pg_stat_activity WHERE pid = $1`, [second.backendPid]);
    expect(blocked.rows[0]?.query).toMatch(/from "claims".*for update/is);
    await first.commit();
    await expect(writing).rejects.toBeInstanceOf(InspectionDiscrepancyNoteExistsError);
    expect(secondNoteInserts).toBe(0);
    await second.rollback();
    const { rows } = await pool.query(`SELECT note_ciphertext FROM claim_ground_inspection_discrepancy_notes WHERE ground_inspection_id = $1`, [s.gid]);
    expect(rows).toEqual([{ note_ciphertext: 'enc:v1:first' }]);
  });
});
