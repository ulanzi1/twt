// Story 6.36b — the LAST SLOT under TRUE two-connection races (own-committing). AC2 / I6: at most three live named
// people per namer — enforced by the writer under the namer's advisory lock AND by 0162's BEFORE INSERT backstop.
//
//   · the BACKSTOP alone: two raw INSERTs of a namer's third live link, at once — exactly ONE commits; the loser waited
//     on the namer's lock (in its INSERT) and then counted the winner's row;
//   · the WRITER: two `askKnownPerson` calls for the same namer's last slot, at once — exactly ONE link; the other
//     `limit_reached`;
//   · mutual naming: A naming B while B names A — both commit (⛔ 40P01: the lock is an advisory key, ⛔ a row lock on
//     `members`).
//
// ⚠ WHY OWN-COMMITTING: a race needs REAL concurrent transactions on SEPARATE pool clients (the per-test BEGIN/ROLLBACK
// envelope would serialise everything). A FRESH random Pariwar per test; the loser is proven to WAIT on a lock
// (`pg_stat_activity`, ⛔ a fixed sleep); cleanup in replica mode, bounded by `lock_timeout` — fixture cleanup ONLY
// ([[project_live_db_test_gotchas]]).

import { randomUUID } from 'node:crypto';

import pg from 'pg';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { bindScopedDb, setPariwarScope } from '../../../src/db.js';
import { memberId as toMemberId, pariwarId as toPariwarId } from '../../../src/ids/index.js';
import { askKnownPerson } from '../../../src/member/known-people.js';
import type { PariwarId } from '../../../src/ids/index.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);
const TIMEOUT = 60_000;
const WAIT_DEADLINE_MS = 10_000;

describe.skipIf(!hasDatabase)('Story 6.36b — the last slot (two connections, own-committing)', { timeout: TIMEOUT }, () => {
  let pool: pg.Pool;
  const pariwars: string[] = [];
  const open = new Set<{ rollback: () => Promise<void> }>();

  beforeAll(() => {
    pool = new pg.Pool({ connectionString: DATABASE_URL, max: 6, ssl: false, connectionTimeoutMillis: 5000 });
  });

  afterAll(async () => {
    const c = await pool.connect();
    try {
      if (pariwars.length > 0) {
        await c.query('BEGIN');
        await c.query("SET LOCAL lock_timeout = '5s'");
        await c.query("SET LOCAL session_replication_role = 'replica'");
        for (const t of ['member_known_people', 'member_daily_counters', 'pariwar_daily_counters', 'member_identities', 'members']) {
          await c.query(`DELETE FROM "${t}" WHERE pariwar_id::text = ANY($1)`, [pariwars]);
        }
        await c.query('COMMIT');
        const { rows } = await c.query<{ n: string }>(
          `SELECT (SELECT count(*) FROM members WHERE pariwar_id::text = ANY($1))
                + (SELECT count(*) FROM member_identities WHERE pariwar_id::text = ANY($1))
                + (SELECT count(*) FROM member_known_people WHERE pariwar_id::text = ANY($1)) AS n`,
          [pariwars],
        );
        if (Number(rows[0]!.n) !== 0) throw new Error(`cleanup left ${rows[0]!.n} row(s) of this spec's Pariwars`);
      }
    } catch (e) {
      await c.query('ROLLBACK').catch(() => undefined);
      throw new Error(`[known-people-concurrency.spec] cleanup failed: ${(e as Error).message}`);
    } finally {
      c.release();
      await pool.end();
    }
  });

  afterEach(async () => {
    for (const tx of [...open]) await tx.rollback();
    open.clear();
  });

  function freshPariwar(): PariwarId {
    const pid = toPariwarId(randomUUID());
    pariwars.push(pid);
    return pid;
  }

  /** `n` active members of `pid`, committed (as the superuser — `members`' state trigger guards UPDATE only). */
  async function seedActive(pid: string, n: number): Promise<string[]> {
    const ids: string[] = [];
    for (let i = 0; i < n; i += 1) {
      const id = randomUUID();
      await pool.query(`INSERT INTO members (member_id, pariwar_id, state, state_event_version) VALUES ($1, $2, 'active', 1)`, [id, pid]);
      ids.push(id);
    }
    return ids;
  }

  async function seedLinks(pid: string, namer: string, named: string[]): Promise<void> {
    for (const m of named) {
      await pool.query(`INSERT INTO member_known_people (pariwar_id, namer_member_id, named_member_id, found_by) VALUES ($1, $2, $3, 'contacts')`, [pid, namer, m]);
    }
  }

  async function openTx(pid: PariwarId) {
    const client = await pool.connect();
    let done = false;
    const finish = async (sql: 'COMMIT' | 'ROLLBACK') => {
      if (done) return;
      done = true;
      open.delete(tx);
      try {
        await client.query(sql);
      } finally {
        client.release();
      }
    };
    const tx = {
      client,
      backendPid: 0,
      commit: () => finish('COMMIT'),
      rollback: () => finish('ROLLBACK').catch(() => undefined),
    };
    open.add(tx);
    await client.query('BEGIN');
    await client.query('SET LOCAL ROLE twt_app');
    await setPariwarScope(client, pid);
    tx.backendPid = (await client.query<{ p: number }>('SELECT pg_backend_pid() AS p')).rows[0]!.p;
    return tx;
  }

  async function waitingOn(backendPid: number): Promise<string> {
    const deadline = Date.now() + WAIT_DEADLINE_MS;
    for (;;) {
      const { rows } = await pool.query<{ query: string }>(
        `SELECT query FROM pg_stat_activity WHERE pid = $1 AND wait_event_type = 'Lock'`,
        [backendPid],
      );
      if (rows[0]) return rows[0].query.replace(/\s+/g, ' ').trim();
      if (Date.now() > deadline) throw new Error(`backend ${String(backendPid)} never reached a lock wait`);
      await new Promise((r) => setTimeout(r, 25));
    }
  }

  function track<T>(p: Promise<T>) {
    return p.then(
      (v) => ({ ok: true as const, value: v }),
      (e: unknown) => ({ ok: false as const, error: e as { code?: string; message?: string } }),
    );
  }

  const liveCount = async (pid: string, namer: string) =>
    Number(
      (
        await pool.query<{ n: string }>(
          `SELECT count(*) AS n FROM member_known_people WHERE pariwar_id = $1 AND namer_member_id = $2 AND state IN ('asked', 'accepted')`,
          [pid, namer],
        )
      ).rows[0]!.n,
    );

  it('the BACKSTOP alone: two raw INSERTs of the third live link — exactly ONE commits', async () => {
    const pid = freshPariwar();
    const [namer, b, c, d, e] = await seedActive(pid, 5);
    await seedLinks(pid, namer!, [b!, c!]);
    const insert = `INSERT INTO member_known_people (pariwar_id, namer_member_id, named_member_id, found_by) VALUES ($1, $2, $3, 'typed')`;
    const t1 = await openTx(pid);
    const t2 = await openTx(pid);
    await t1.client.query(insert, [pid, namer, d]);
    const loser = track(t2.client.query(insert, [pid, namer, e]));
    expect(await waitingOn(t2.backendPid)).toMatch(/^INSERT INTO member_known_people/);
    await t1.commit();
    const r = await loser;
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe('23514');
      expect(r.error.message).toMatch(/at most three live named people/);
    }
    await t2.rollback();
    expect(await liveCount(pid, namer!)).toBe(3);
  });

  it('the WRITER: two askKnownPerson calls for the namer\'s last slot at once — exactly ONE link; the other limit_reached', async () => {
    const pid = freshPariwar();
    const [namer, b, c, d, e] = await seedActive(pid, 5);
    for (const [m, i] of [[d!, 'idx-d'], [e!, 'idx-e']] as const) {
      await pool.query(`INSERT INTO member_identities (member_id, pariwar_id, mobile_ciphertext, mobile_blind_index) VALUES ($1, $2, 'enc:v1:x', $3)`, [m, pid, `${i}-${pid}`]);
    }
    await seedLinks(pid, namer!, [b!, c!]);
    const t1 = await openTx(pid);
    const t2 = await openTx(pid);
    const ask = (client: pg.PoolClient, index: string) =>
      askKnownPerson(bindScopedDb(client), { pariwarId: pid, namerMemberId: toMemberId(namer!), namedIndex: `${index}-${pid}`, foundBy: 'contacts' });
    const first = await ask(t1.client, 'idx-d');
    expect(first.kind).toBe('created');
    const second = track(ask(t2.client, 'idx-e'));
    // the loser waits on the namer's lock — ⛔ a row lock on `members`
    expect(await waitingOn(t2.backendPid)).toMatch(/member_known_people_lock_namer/);
    await t1.commit();
    const r = await second;
    expect(r.ok && r.value).toEqual({ kind: 'refused', reason: 'limit_reached' });
    await t2.commit();
    expect(await liveCount(pid, namer!)).toBe(3);
  });

  it('mutual naming: A names B while B names A — both commit (⛔ a deadlock)', async () => {
    const pid = freshPariwar();
    const [a, b] = await seedActive(pid, 2);
    const insert = `INSERT INTO member_known_people (pariwar_id, namer_member_id, named_member_id, found_by) VALUES ($1, $2, $3, 'contacts')`;
    const t1 = await openTx(pid);
    const t2 = await openTx(pid);
    await t1.client.query('SELECT member_known_people_lock_namer($1)', [a]);
    await t2.client.query('SELECT member_known_people_lock_namer($1)', [b]);
    const [r1, r2] = await Promise.all([track(t1.client.query(insert, [pid, a, b])), track(t2.client.query(insert, [pid, b, a]))]);
    expect(r1.ok && r2.ok).toBe(true);
    await t1.commit();
    await t2.commit();
    expect(await liveCount(pid, a!)).toBe(1);
    expect(await liveCount(pid, b!)).toBe(1);
  });
});
