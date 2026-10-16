// Story 6.36c (Task 3.4) — the suggestion, the answer and the campaign under TRUE two-connection races (own-committing).
//   · a concurrent POSTING withdraws the request while the member answers *"Yes"* ⇒ the answer waits on the member's posting
//     lock, then answers `request_closed` — ⛔ a second posting;
//   · *"Yes"* vs `renameWorkplaceDistrict` of the workplace's district, BOTH orders — both finish, ⛔ 40P01: the rename first
//     ⇒ the answer confirms with the NEW spelling; the answer first ⇒ it confirms with the old one (a posting keeps the
//     spelling it was written under — I2) and the rename then moves only OPEN requests;
//   · a suggestion vs the same rename, both orders — both finish, ⛔ 40P01;
//   · two campaign starts with overlapping windows at once — the second waits on the Pariwar's lock, then `overlap`.
//
// ⚠ WHY OWN-COMMITTING: a race needs REAL concurrent transactions on SEPARATE pool clients. A FRESH random Pariwar per test;
// the waiter is proven to WAIT on a lock (`pg_stat_activity`, ⛔ a fixed sleep); cleanup in replica mode, bounded by
// `lock_timeout` — fixture cleanup ONLY ([[project_live_db_test_gotchas]]).

import { randomUUID } from 'node:crypto';

import pg from 'pg';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { bindScopedDb, setPariwarScope } from '../../../src/db.js';
import { memberId as toMemberId, pariwarId as toPariwarId } from '../../../src/ids/index.js';
import type { PariwarId } from '../../../src/ids/index.js';
import { startCampaign } from '../../../src/member/known-people-campaigns.js';
import { insertMemberPosting } from '../../../src/member/posting.js';
import { answerWorkplaceSuggestion, suggestWorkplaceForRequest } from '../../../src/member/workplace-admin.js';
import { renameWorkplaceDistrict } from '../../../src/member/workplace-import.js';
import { lockMemberPostingWrites } from '../../../src/member/workplace.js';
import { seedWorkplaceList } from './_workplace-fixtures.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);
const TIMEOUT = 60_000;
const WAIT_DEADLINE_MS = 10_000;
const ACTOR = '0a0a0a0a-0000-4000-8000-000000000004';

describe.skipIf(!hasDatabase)('Story 6.36c — races (two connections, own-committing)', { timeout: TIMEOUT }, () => {
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
        for (const t of [
          'member_postings',
          'workplace_requests',
          'workplaces',
          'workplace_districts',
          'workplace_import_batches',
          'known_people_campaigns',
          'members',
        ]) {
          await c.query(`DELETE FROM "${t}" WHERE pariwar_id::text = ANY($1)`, [pariwars]);
        }
        await c.query('COMMIT');
        const { rows } = await c.query<{ n: string }>(
          `SELECT (SELECT count(*) FROM members WHERE pariwar_id::text = ANY($1))
                + (SELECT count(*) FROM workplaces WHERE pariwar_id::text = ANY($1))
                + (SELECT count(*) FROM workplace_requests WHERE pariwar_id::text = ANY($1))
                + (SELECT count(*) FROM known_people_campaigns WHERE pariwar_id::text = ANY($1)) AS n`,
          [pariwars],
        );
        if (Number(rows[0]!.n) !== 0) throw new Error(`cleanup left ${rows[0]!.n} row(s) of this spec's Pariwars`);
      }
    } catch (e) {
      await c.query('ROLLBACK').catch(() => undefined);
      throw new Error(`[workplace-admin-concurrency.spec] cleanup failed: ${(e as Error).message}`);
    } finally {
      c.release();
      await pool.end();
    }
  });

  afterEach(async () => {
    for (const tx of [...open]) await tx.rollback();
    open.clear();
  });

  async function freshList() {
    const pid = randomUUID();
    pariwars.push(pid);
    const c = await pool.connect();
    try {
      const list = await seedWorkplaceList(c, {
        pariwarId: pid,
        districts: ['Patna'],
        workplaces: [
          { name: 'GMS RAMPUR', district: 'Patna' },
          { name: 'UPS TOLA', district: 'Patna' },
        ],
      });
      return { ...list, p: toPariwarId(pid) };
    } finally {
      c.release();
    }
  }

  async function seedMemberRow(pid: string): Promise<string> {
    const id = randomUUID();
    await pool.query(`INSERT INTO members (member_id, pariwar_id, state, state_event_version) VALUES ($1, $2, 'active', 1)`, [id, pid]);
    return id;
  }

  async function seedRequest(pid: string, memberId: string, suggestedWorkplaceId?: string): Promise<string> {
    const id = randomUUID();
    await pool.query(`INSERT INTO workplace_requests (request_id, pariwar_id, member_id, district, typed_name, started_on) VALUES ($1, $2, $3, 'Patna', 'A School', '2020-01-01')`, [
      id,
      pid,
      memberId,
    ]);
    if (suggestedWorkplaceId) {
      await pool.query(`UPDATE workplace_requests SET state = 'suggested', suggested_workplace_id = $2, suggested_by_actor_id = $3, suggested_at = now() WHERE request_id = $1`, [
        id,
        suggestedWorkplaceId,
        ACTOR,
      ]);
    }
    return id;
  }

  async function openTx(pid: PariwarId) {
    const client = await pool.connect();
    let done = false;
    const finish = async (q: 'COMMIT' | 'ROLLBACK') => {
      if (done) return;
      done = true;
      open.delete(tx);
      try {
        await client.query(q);
      } finally {
        client.release();
      }
    };
    const tx = {
      client,
      db: bindScopedDb(client),
      backendPid: 0,
      commit: () => finish('COMMIT'),
      rollback: () => finish('ROLLBACK').catch(() => undefined),
    };
    open.add(tx);
    await client.query('BEGIN');
    await client.query("SET LOCAL lock_timeout = '20s'");
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

  function track<T>(p: Promise<T>) {
    return p.then(
      (v) => ({ ok: true as const, value: v }),
      (e: unknown) => ({ ok: false as const, error: e as { code?: string; message?: string } }),
    );
  }

  const state = async (requestId: string) =>
    (await pool.query<{ state: string; district: string }>(`SELECT state, district FROM workplace_requests WHERE request_id = $1`, [requestId])).rows[0]!;
  const postings = async (memberId: string) =>
    (await pool.query<{ district: string; workplace_id: string | null }>(`SELECT district, workplace_id FROM member_postings WHERE member_id = $1`, [memberId])).rows;

  it('a concurrent posting withdraws the request ⇒ "Yes" waits on the posting lock, then request_closed — ⛔ a second posting', async () => {
    const l = await freshList();
    const m = await seedMemberRow(l.pariwarId);
    const r = await seedRequest(l.pariwarId, m, l.ids['GMS RAMPUR']);
    const t1 = await openTx(l.p);
    const t2 = await openTx(l.p);
    await lockMemberPostingWrites(t1.db, toMemberId(m));
    await insertMemberPosting(t1.db, { memberId: toMemberId(m), pariwarId: l.p, district: 'Patna', workplaceId: l.ids['UPS TOLA'] as never, startedOn: '2021-01-01' });
    const answer = track(answerWorkplaceSuggestion(t2.db, { pariwarId: l.p, memberId: toMemberId(m), requestId: r, answer: 'yes', now: new Date() }));
    expect(await waitingOn(t2.backendPid)).toMatch(/pg_advisory_xact_lock/);
    await t1.commit();
    const out = await answer;
    expect(out.ok).toBe(false);
    if (!out.ok) expect((out.error as { code?: string }).code).toBe('workplace.request_closed');
    await t2.rollback();
    expect((await state(r)).state).toBe('withdrawn');
    expect(await postings(m)).toEqual([{ district: 'Patna', workplace_id: l.ids['UPS TOLA'] }]);
  });

  it('"Yes" vs the district rename — the rename FIRST: the answer waits, then confirms with the NEW spelling (⛔ 40P01)', async () => {
    const l = await freshList();
    const m = await seedMemberRow(l.pariwarId);
    const r = await seedRequest(l.pariwarId, m, l.ids['GMS RAMPUR']);
    const t1 = await openTx(l.p);
    const t2 = await openTx(l.p);
    await renameWorkplaceDistrict(t1.db, { pariwarId: l.p, from: 'Patna', to: 'Patna City' });
    const answer = track(answerWorkplaceSuggestion(t2.db, { pariwarId: l.p, memberId: toMemberId(m), requestId: r, answer: 'yes', now: new Date() }));
    await waitingOn(t2.backendPid);
    await t1.commit();
    const out = await answer;
    expect(out.ok && out.value).toEqual({
      kind: 'confirmed',
      posting: { workplaceId: l.ids['GMS RAMPUR'], workplaceKind: 'school', district: 'Patna City', startedOn: '2020-01-01' },
    });
    await t2.commit();
    expect(await state(r)).toEqual({ state: 'confirmed', district: 'Patna City' });
    expect(await postings(m)).toEqual([{ district: 'Patna City', workplace_id: l.ids['GMS RAMPUR'] }]);
  });

  it('"Yes" vs the district rename — the answer FIRST: the rename waits; the posting keeps the old spelling (⛔ 40P01)', async () => {
    const l = await freshList();
    const m = await seedMemberRow(l.pariwarId);
    const r = await seedRequest(l.pariwarId, m, l.ids['GMS RAMPUR']);
    const t1 = await openTx(l.p);
    const t2 = await openTx(l.p);
    const out = await answerWorkplaceSuggestion(t1.db, { pariwarId: l.p, memberId: toMemberId(m), requestId: r, answer: 'yes', now: new Date() });
    expect(out.kind).toBe('confirmed');
    const rename = track(renameWorkplaceDistrict(t2.db, { pariwarId: l.p, from: 'Patna', to: 'Patna City' }));
    await waitingOn(t2.backendPid);
    await t1.commit();
    const rn = await rename;
    expect(rn.ok).toBe(true);
    await t2.commit();
    // A confirmed request keeps the spelling it was made under; so does the posting (I2).
    expect(await state(r)).toEqual({ state: 'confirmed', district: 'Patna' });
    expect(await postings(m)).toEqual([{ district: 'Patna', workplace_id: l.ids['GMS RAMPUR'] }]);
  });

  it('a suggestion vs the district rename, both orders — both finish (⛔ 40P01); the request and the workplace share a district', async () => {
    for (const renameFirst of [true, false]) {
      const l = await freshList();
      const m = await seedMemberRow(l.pariwarId);
      const r = await seedRequest(l.pariwarId, m);
      const t1 = await openTx(l.p);
      const t2 = await openTx(l.p);
      const suggest = (db: typeof t1.db) => suggestWorkplaceForRequest(db, { pariwarId: l.p, requestId: r, workplaceId: l.ids['GMS RAMPUR']!, actorId: ACTOR });
      const rename = (db: typeof t1.db) => renameWorkplaceDistrict(db, { pariwarId: l.p, from: 'Patna', to: 'Patna City' });
      if (renameFirst) {
        await rename(t1.db);
        const s = track(suggest(t2.db));
        await waitingOn(t2.backendPid);
        await t1.commit();
        const out = await s;
        expect(out.ok && out.value).toMatchObject({ district: 'Patna City' });
      } else {
        await suggest(t1.db);
        const rn = track(rename(t2.db));
        await waitingOn(t2.backendPid);
        await t1.commit();
        expect((await rn).ok).toBe(true);
      }
      await t2.commit();
      const row = await state(r);
      expect(row, `renameFirst=${String(renameFirst)}`).toEqual({ state: 'suggested', district: 'Patna City' });
      const w = await pool.query<{ district: string }>(`SELECT district FROM workplaces WHERE workplace_id = $1`, [l.ids['GMS RAMPUR']]);
      expect(w.rows[0]!.district).toBe('Patna City');
    }
  });

  it('two campaign starts with overlapping windows at once — the second waits on the Pariwar lock, then overlap', async () => {
    const l = await freshList();
    const today = (await pool.query<{ d: string }>(`SELECT to_char((clock_timestamp() AT TIME ZONE 'Asia/Kolkata')::date, 'YYYY-MM-DD') AS d`)).rows[0]!.d;
    const t1 = await openTx(l.p);
    const t2 = await openTx(l.p);
    await startCampaign(t1.db, { pariwarId: l.p, actorId: ACTOR, startsOn: today, endsOn: today });
    const second = track(startCampaign(t2.db, { pariwarId: l.p, actorId: ACTOR, startsOn: today, endsOn: today }));
    expect(await waitingOn(t2.backendPid)).toMatch(/pg_advisory_xact_lock/);
    await t1.commit();
    const out = await second;
    expect(out.ok).toBe(false);
    if (!out.ok) expect((out.error as { code?: string }).code).toBe('known_people_campaign.overlap');
    await t2.rollback();
    const n = await pool.query<{ n: string }>(`SELECT count(*) AS n FROM known_people_campaigns WHERE pariwar_id = $1`, [l.pariwarId]);
    expect(Number(n.rows[0]!.n)).toBe(1);
  });
});
