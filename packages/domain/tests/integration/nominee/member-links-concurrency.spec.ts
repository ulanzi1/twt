// Story 6.36e (Task 2.1; AC3 — "a nominee's answer committed DURING a carry is ⛔ lost"; `2026-10-24-397` NE2, V4) — the
// marked member's ANSWER racing the declarer's re-save that KEEPS the mark, on TWO connections (own-committing):
//   · the carry locks first (`lockLiveNomineeLinks` — `FOR UPDATE`): the answer WAITS on the row lock, then finds the row
//     ended ⇒ `request_closed`; the carried row is unanswered and answerable — ⛔ an answer silently dropped;
//   · the answer commits first: the carry copies it — the carried row is `confirmed`.
//
// ⚠ WHY OWN-COMMITTING: a race needs REAL concurrent transactions on SEPARATE pool clients. A FRESH random Pariwar per test;
// the waiter is proven to WAIT on a lock (`pg_stat_activity`, ⛔ a fixed sleep); cleanup in replica mode (the 0119 delete
// guard and 0181's guard are ordinary triggers), bounded by `lock_timeout` — fixture cleanup ONLY.

import { randomUUID } from 'node:crypto';

import pg from 'pg';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { bindScopedDb, setPariwarScope } from '../../../src/db.js';
import { memberId as toMemberId, nomineeLinkId, pariwarId as toPariwarId, type PariwarId } from '../../../src/ids/index.js';
import {
  answerNomineeLinkRequest,
  applyNomineeLinkPlan,
  lockLiveNomineeLinks,
  planNomineeLinks,
} from '../../../src/nominee/member-links.js';
import type { MemberNomineeVersionRow } from '../../../src/schema/member_nominee_versions.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);
const TIMEOUT = 60_000;
const WAIT_DEADLINE_MS = 10_000;

describe.skipIf(!hasDatabase)('Story 6.36e — an answer racing a carry (two connections, own-committing)', { timeout: TIMEOUT }, () => {
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
        for (const t of ['member_nominee_links', 'member_nominee_versions', 'members']) {
          await c.query(`DELETE FROM "${t}" WHERE pariwar_id::text = ANY($1)`, [pariwars]);
        }
        await c.query('COMMIT');
        const { rows } = await c.query<{ n: string }>(
          `SELECT (SELECT count(*) FROM members WHERE pariwar_id::text = ANY($1))
                + (SELECT count(*) FROM member_nominee_versions WHERE pariwar_id::text = ANY($1))
                + (SELECT count(*) FROM member_nominee_links WHERE pariwar_id::text = ANY($1)) AS n`,
          [pariwars],
        );
        if (Number(rows[0]!.n) !== 0) throw new Error(`cleanup left ${rows[0]!.n} row(s) of this spec's Pariwars`);
      }
    } catch (e) {
      await c.query('ROLLBACK').catch(() => undefined);
      throw new Error(`[member-links-concurrency.spec] cleanup failed: ${(e as Error).message}`);
    } finally {
      c.release();
      await pool.end();
    }
  });

  afterEach(async () => {
    for (const tx of [...open]) await tx.rollback();
    open.clear();
  });

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
    const tx = { client, backendPid: 0, commit: () => finish('COMMIT'), rollback: () => finish('ROLLBACK').catch(() => undefined) };
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
      const { rows } = await pool.query<{ query: string }>(`SELECT query FROM pg_stat_activity WHERE pid = $1 AND wait_event_type = 'Lock'`, [backendPid]);
      if (rows[0]) return rows[0].query.replace(/\s+/g, ' ').trim();
      if (Date.now() > deadline) throw new Error(`backend ${String(backendPid)} never reached a lock wait`);
      await new Promise((r) => setTimeout(r, 25));
    }
  }

  /** A declarer A with a rank-1 version and a LIVE link to B, all committed. */
  async function seed() {
    const pid = toPariwarId(randomUUID());
    pariwars.push(pid);
    const [a, b] = [randomUUID(), randomUUID()];
    for (const m of [a, b]) {
      await pool.query(`INSERT INTO members (member_id, pariwar_id, state, state_event_version) VALUES ($1, $2, 'active', 1)`, [m, pid]);
    }
    const v1 = await version(pool, pid, a, 1);
    const link = (
      await pool.query<{ link_id: string }>(
        `INSERT INTO member_nominee_links (pariwar_id, declarer_member_id, version_id, rank, nominee_member_id, found_by, asked_at)
         VALUES ($1, $2, $3, 1, $4, 'contacts', clock_timestamp()) RETURNING link_id`,
        [pid, a, v1.versionId, b],
      )
    ).rows[0]!.link_id;
    return { pid, a: toMemberId(a), b: toMemberId(b), linkId: nomineeLinkId(link) };
  }

  async function version(q: pg.Pool | pg.PoolClient, pid: string, member: string, versionNo: number): Promise<MemberNomineeVersionRow> {
    const r = await q.query<{ version_id: string }>(
      `INSERT INTO member_nominee_versions (member_id, pariwar_id, rank, version_no, declaration_id, kind, source, name_ciphertext,
                                            relationship, mobile_ciphertext, split_pct, recorded_at, effective_at)
       -- ONE clock read for both: 0119 requires effective_at = recorded_at, and two reads can differ by a microsecond
       SELECT $1, $2, 1, $3, gen_random_uuid(), 'declared', 'member', 'enc:v1:n', 'spouse', 'enc:v1:m', 100, c.at, c.at
         FROM (SELECT clock_timestamp() AS at) c
       RETURNING version_id`,
      [member, pid, versionNo],
    );
    return { versionId: r.rows[0]!.version_id, rank: 1, kind: 'declared' } as MemberNomineeVersionRow;
  }

  /** The declarer's re-save that KEEPS the mark, up to (⛔ incl.) the commit. Returns the carried link id. */
  async function keepSave(client: pg.PoolClient, s: Awaited<ReturnType<typeof seed>>, afterLock: () => Promise<void>): Promise<string> {
    const db = bindScopedDb(client);
    const live = await lockLiveNomineeLinks(db, { pariwarId: s.pid, declarerMemberId: s.a });
    await afterLock();
    const plan = planNomineeLinks(live, [{ rank: 1, link: { kind: 'keep', linkId: s.linkId } }]);
    if (plan.kind !== 'plan') throw new Error(plan.reason);
    const v2 = await version(client, s.pid, s.a, 2);
    const applied = await applyNomineeLinkPlan(db, { pariwarId: s.pid, declarerMemberId: s.a, plan, versions: [v2], recordedAt: new Date() });
    return applied.carried[0]!.linkId;
  }

  it('the CARRY locks first: the answer WAITS, then finds the row ended ⇒ `request_closed`; the carried row is unanswered and answerable', async () => {
    const s = await seed();
    const t1 = await openTx(s.pid);
    const t2 = await openTx(s.pid);
    let answer!: Promise<unknown>;
    const carried = await keepSave(t1.client, s, async () => {
      answer = answerNomineeLinkRequest(bindScopedDb(t2.client), { pariwarId: s.pid, nomineeMemberId: s.b, linkId: s.linkId, answer: 'confirmed' });
      expect(await waitingOn(t2.backendPid)).toMatch(/^UPDATE member_nominee_links SET answer/);
    });
    await t1.commit();
    expect(await answer).toEqual({ kind: 'refused', reason: 'request_closed' });
    await t2.commit();
    const { rows } = await pool.query(`SELECT answer FROM member_nominee_links WHERE link_id = $1`, [carried]);
    expect(rows[0]).toEqual({ answer: null });
    // ⛔ lost: the member answers the carried link
    const t3 = await openTx(s.pid);
    expect(await answerNomineeLinkRequest(bindScopedDb(t3.client), { pariwarId: s.pid, nomineeMemberId: s.b, linkId: nomineeLinkId(carried), answer: 'confirmed' })).toMatchObject({
      kind: 'done',
    });
    await t3.commit();
  });

  it('the ANSWER commits first: the carry copies it — the carried row is `confirmed`', async () => {
    const s = await seed();
    const t2 = await openTx(s.pid);
    expect(await answerNomineeLinkRequest(bindScopedDb(t2.client), { pariwarId: s.pid, nomineeMemberId: s.b, linkId: s.linkId, answer: 'confirmed' })).toMatchObject({
      kind: 'done',
    });
    const t1 = await openTx(s.pid);
    // the carry's FOR UPDATE waits on the uncommitted answer, then reads it
    const carried = keepSave(t1.client, s, async () => undefined);
    expect(await waitingOn(t1.backendPid)).toMatch(/FOR UPDATE OF l/);
    await t2.commit();
    const id = await carried;
    await t1.commit();
    const { rows } = await pool.query(`SELECT answer, responded_at IS NOT NULL AS dated FROM member_nominee_links WHERE link_id = $1`, [id]);
    expect(rows[0]).toEqual({ answer: 'confirmed', dated: true });
  });
});
