// Story 6.32 (second review S19; load-bearing checklist family 2) — the family's answers at the inspection: the RACE legs,
// own-committing, on TWO real connections.
//
// ⚠ Own-committing (NOT setupLiveDb), the `ground-inspection-discrepancy-concurrency.spec.ts` header pattern: every step
// COMMITS on its own pooled connection, so two transactions really contend for the assignment row lock
// (`lockActiveAssignment` FOR UPDATE — the save and the completion both take it FIRST, then the claim lock). Each test mints a
// FRESH Pariwar; cleanup deletes every row of those Pariwars under `session_replication_role = 'replica'` (the append-only
// triggers). Assertions key on OUR ids, ⛔ never on counts of shared tables.
//   · a save BLOCKED behind an in-flight completion is refused `not_active` once it commits — ⛔ an answer written after the
//     visit closed;
//   · a completion BLOCKED behind an in-flight save completes once the save commits — the answer is IN the visit's record;
//   · two saves of ONE key serialize — ONE live row (the later value), the earlier superseded, ⛔ 23505.

import { randomUUID } from 'node:crypto';

import pg from 'pg';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { readLiveGroundInspectionAnswers, saveGroundInspectionAnswer } from '../../../src/claim/index.js';
import { GroundInspectionNotActiveError } from '../../../src/claim/errors.js';
import { bindScopedDb, setPariwarScope } from '../../../src/db.js';
import { claimId as toClaimId, memberId as toMemberId, pariwarId as toPariwarId, type ClaimId, type GroundInspectionId, type PariwarId } from '../../../src/ids/index.js';
import { driveClaimTo, seedDeathCertificate } from '../_helpers.js';
import { completeWithDate, scheduleWithOriginalPhoto } from './_inspection-discrepancy-fixtures.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);
const INSPECTOR = 'd4d4d4d4-0000-4000-8000-000000000004';
const TODAY = '2026-10-29';

describe.skipIf(!hasDatabase)('Story 6.32 — the family\'s answers: save / complete races (own-committing)', { timeout: 20000 }, () => {
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
        console.error('[ground-inspection-questionnaire-concurrency.spec] cleanup:', (e as Error).message);
      } finally {
        c.release();
      }
    }
    await pool.end();
  });

  /** Every transaction a test opens; `afterEach` rolls back whatever a failing test left open — the lock HOLDERS first
   *  (⛔ in-flight call), so every blocked call can finish; then the calls settle; then the rest (6.27d R3-17's order). */
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
  }

  /** COMMITTED: a fresh Pariwar's claim in the window, a current certificate, a scheduled assignment with its original's photo. */
  async function seed(): Promise<Seeded> {
    const pid = toPariwarId(randomUUID());
    pariwars.push(pid);
    const cid = toClaimId(randomUUID());
    await onOwnTx(pid, async (c) => {
      await driveClaimTo(c, pid, cid, toMemberId(randomUUID()), 'verification_in_progress');
      await seedDeathCertificate(c, { pariwarId: pid, claimCaseId: cid });
    });
    const gid = await onOwnTx(pid, (c) => scheduleWithOriginalPhoto(c, pid, cid, { inspector: INSPECTOR }));
    return { pid, cid, gid };
  }

  /** The letter (codes — ⛔ KMS, ⛔ decrypted live answers to pass) through the REAL writer and the SHIPPED v1. */
  const saveLetter = (client: pg.PoolClient, s: Seeded, code: 'collected' | 'not_collected') =>
    saveGroundInspectionAnswer(client, {
      pariwarId: s.pid,
      groundInspectionId: s.gid,
      actingActorId: INSPECTOR,
      questionKey: 'head_letter',
      codes: [code],
      prepared: { form: 'codes', codes: [code] },
      decryptedLive: new Map(),
      unreadableLive: new Map(),
      todayIst: TODAY,
    });

  /** Every row of the visit's letter (live and superseded), as the superuser. */
  const letterRows = async (s: Seeded) =>
    (
      await pool.query<{ codes: string[]; live: boolean }>(
        `SELECT value_codes AS codes, superseded_at IS NULL AS live FROM claim_ground_inspection_answers
          WHERE ground_inspection_id = $1 AND question_key = 'head_letter' ORDER BY saved_at`,
        [s.gid],
      )
    ).rows;

  it('a save BLOCKED behind an in-flight completion is refused `not_active` once it commits — ⛔ an answer written after the visit closed', async () => {
    const s = await seed();
    const completion = await openTx(s.pid);
    await completeWithDate(completion.client, s.pid, s.cid, s.gid, { actor: INSPECTOR });
    const writer = await openTx(s.pid);
    const saving = writer.track(saveLetter(writer.client, s, 'collected')).then(
      async (r) => (await writer.commit(), r),
      async (e: unknown) => (await writer.rollback(), Promise.reject(e)),
    );
    await waitUntilBlocked(writer.backendPid);
    await completion.commit();
    await expect(saving).rejects.toBeInstanceOf(GroundInspectionNotActiveError);
    expect(await letterRows(s)).toEqual([]);
  });

  it('a completion BLOCKED behind an in-flight save completes once the save commits — the answer is IN the visit\'s record', async () => {
    const s = await seed();
    const writer = await openTx(s.pid);
    expect((await saveLetter(writer.client, s, 'not_collected')).written).toBe(true);
    const completion = await openTx(s.pid);
    const completing = completion.track(completeWithDate(completion.client, s.pid, s.cid, s.gid, { actor: INSPECTOR })).then(
      async (r) => (await completion.commit(), r),
      async (e: unknown) => (await completion.rollback(), Promise.reject(e)),
    );
    await waitUntilBlocked(completion.backendPid);
    await writer.commit();
    expect((await completing).groundInspection.status).toBe('completed');
    expect(await letterRows(s)).toEqual([{ codes: ['not_collected'], live: true }]);
    // and the answer was saved BEFORE the completion (the as-of recompute's precondition)
    const { rows } = await pool.query<{ before: boolean }>(
      `SELECT a.saved_at <= gi.completed_at AS before FROM claim_ground_inspection_answers a
         JOIN claim_ground_inspections gi ON gi.ground_inspection_id = a.ground_inspection_id WHERE a.ground_inspection_id = $1`,
      [s.gid],
    );
    expect(rows).toEqual([{ before: true }]);
  });

  it('two saves of ONE key serialize — ONE live row (the later value), the earlier superseded, ⛔ 23505', async () => {
    const s = await seed();
    const first = await openTx(s.pid);
    expect((await saveLetter(first.client, s, 'collected')).written).toBe(true);
    const second = await openTx(s.pid);
    const saving = second.track(saveLetter(second.client, s, 'not_collected')).then(
      async (r) => (await second.commit(), r),
      async (e: unknown) => (await second.rollback(), Promise.reject(e)),
    );
    await waitUntilBlocked(second.backendPid);
    await first.commit();
    expect(await saving).toMatchObject({ written: true });
    expect(await letterRows(s)).toEqual([
      { codes: ['collected'], live: false },
      { codes: ['not_collected'], live: true },
    ]);
    const live = await onOwnTx(s.pid, (c) => readLiveGroundInspectionAnswers(bindScopedDb(c), s.pid, s.gid));
    expect(live.map((r) => [r.questionKey, r.valueCodes])).toEqual([['head_letter', ['not_collected']]]);
  });
});
