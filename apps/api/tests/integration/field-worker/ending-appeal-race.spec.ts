// Story 13.1f — the Concurrency matrix's live legs (AC2 (i)-(iii), AC3's race, AC17; TR5, TR15; 13.1d CR27: a sequential "second answer"
// leg proves the state check, ⛔ the lock). Each leg: a HOLDER connection runs the PUBLIC domain command (the fixture) and keeps its row
// lock (or its uncommitted index entry) until COMMIT; the HTTP request passes the gate and the pre-read (both read COMMITTED state), writes
// its intent line, then waits inside `mutate` (`waitForBlockedBy`); once the holder commits, the command judges the LOCKED state. Each leg
// asserts the REASON and a CONTROL (the holder's act did commit). Live DB, OWN-COMMITTING; a fresh Pariwar per leg.

import { ids } from '@twt/domain';
import type { PoolClient } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { closeTestAppeal, lodgeTestAppeal, registerTestFieldWorker, terminateTestFieldWorker, undoTestEnding } from '../_field-worker-fixture.js';
import { hasDatabase } from '../_setup.js';
import { createHarness, errOf, json, releaseHolder, waitForBlockedBy, type Client, type Harness, type Json } from './_registration-harness.js';

type Reply = Awaited<ReturnType<Harness['undoEnding']>>;

describe.skipIf(!hasDatabase)('Story 13.1f — the undo and the appeal under concurrency (the Concurrency matrix)', { timeout: 120_000 }, () => {
  let h: Harness;
  beforeAll(async () => {
    h = await createHarness();
  });
  afterAll(async () => {
    await h.cleanup();
  });

  const q = <T>(sql: string, params: unknown[]) => h.td.pool.query(sql, params).then((r) => r.rows as T[]);
  const pidOf = async (c: PoolClient): Promise<number> => (await c.query<{ pid: number }>('SELECT pg_backend_pid() AS pid')).rows[0]!.pid;
  const istDay = async () => (await q<{ d: string }>("SELECT (now() AT TIME ZONE 'Asia/Kolkata')::date::text AS d", []))[0]!.d;
  const worker = (id: string) => q<{ current_state: string; v: string; idx: string }>('SELECT current_state, state_event_version::text AS v, mobile_blind_index AS idx FROM field_workers WHERE field_worker_id = $1', [id]).then((r) => r[0]!);
  const appealState = (id: string) => q<{ state: string }>('SELECT state FROM field_worker_ending_appeals WHERE appeal_id = $1', [id]).then((r) => r[0]!.state);
  const actions = (p: string, prefix: string) =>
    q<{ action: string }>('SELECT action FROM audit_log_entries WHERE pariwar_id = $1 AND action LIKE $2 ORDER BY seq', [p, `${prefix}%`]).then((r) => r.map((x) => x.action));

  interface World {
    p: string;
    pa: { client: Client; userId: string };
    tp: { client: Client; userId: string };
    da: { client: Client; userId: string };
    mobile: string;
    id: string;
  }
  /** A Pariwar, its officers, and one ACTIVE worker ended by `ender` (a Pariwar Admin's ending is heard by the Panel; a District Admin's by the Pariwar Admin). */
  async function endedWorker(ender: 'pa' | 'da' = 'pa'): Promise<World> {
    const p = h.freshPariwar();
    await h.listDistrict(p, 'Patna', 'Gaya');
    const pa = await h.actor(p, 'pariwar_admin', 'pariwar', p, 'Meera Pariwar-Admin');
    const tp = await h.actor(p, 'trustee_panel', 'pariwar', p, 'Dev Trustee');
    const da = await h.actor(p, 'district_admin', 'district', 'Patna', 'Asha District-Admin');
    const mobile = `+9198767${String(10000 + Math.floor(Math.random() * 89999)).padStart(5, '0')}`;
    const id = await h.registered(pa.client, p, { name: 'Racer Unusual-Surname', mobile, district: 'Patna' });
    expect((await h.approve(pa.client, p, id)).statusCode).toBe(200);
    const end = await h.terminate((ender === 'pa' ? pa : da).client, p, id, { reason_code: 'inactive', ended_on: await istDay() });
    expect(end.statusCode, end.body).toBe(200);
    return { p, pa, tp, da, mobile, id };
  }
  const versionOf = async (id: string) => Number((await worker(id)).v);
  const lodgeBody = async (id: string): Promise<Json> => ({ expected_ending_version: await versionOf(id), received_on: await istDay(), received_via: 'phone' });
  async function lodgeHttp(w: World, by: Client = w.tp.client): Promise<string> {
    const r = await h.lodgeAppeal(by, w.p, w.id, await lodgeBody(w.id));
    expect(r.statusCode, r.body).toBe(201);
    return String(json(r)['appeal_id']);
  }

  /** Run `hold` on its own connection (scoped to `p`), start `request`, wait until it is blocked by the holder, COMMIT, return its reply. */
  async function race(p: string, hold: (holder: PoolClient) => Promise<void>, request: () => Promise<Reply>): Promise<Reply> {
    const holder = await h.td.pool.connect();
    try {
      await holder.query('BEGIN');
      await holder.query(`SELECT set_config('app.pariwar_id', $1, true)`, [p]);
      await hold(holder);
      const pending = request();
      await waitForBlockedBy(h.td.pool, await pidOf(holder));
      await holder.query('COMMIT');
      return await pending;
    } finally {
      await releaseHolder(holder);
    }
  }
  const W = (id: string) => ids.fieldWorkerId(id);

  describe('slip undo × allowed decision (the worker lock; both orders)', () => {
    it('the UNDO holds the lock: the decision waits, then 409 appeal_not_open (superseded meanwhile) — its intent and twin; CONTROL: the worker restored, the appeal superseded', async () => {
      const w = await endedWorker();
      const appealId = await lodgeHttp(w);
      const r = await race(w.p, (c) => undoTestEnding(c, w.p, W(w.id)), async () => h.decideAppeal(w.tp.client, w.p, appealId, { outcome: 'allowed', decided_on: await istDay() }));
      expect(r.statusCode, r.body).toBe(409);
      expect(errOf(r).code).toBe('field_worker.appeal_not_open');
      expect((await worker(w.id)).current_state).toBe('active');
      expect(await appealState(appealId)).toBe('superseded');
      expect(await actions(w.p, 'field_worker_ending_appeal.allowed')).toEqual(['field_worker_ending_appeal.allowed', 'field_worker_ending_appeal.allowed_rolled_back']);
    });

    it('the ALLOW holds the lock: the slip undo waits, then 409 illegal_transition (already restored) — its intent and twin; CONTROL: the appeal allowed', async () => {
      const w = await endedWorker();
      const appealId = await lodgeHttp(w);
      const v = await versionOf(w.id);
      const r = await race(w.p, (c) => closeTestAppeal(c, w.p, appealId, 'allowed'), () => h.undoEnding(w.pa.client, w.p, w.id, v));
      expect(r.statusCode, r.body).toBe(409);
      expect(errOf(r).code).toBe('field_worker.illegal_transition');
      expect(await appealState(appealId)).toBe('allowed');
      expect((await worker(w.id)).current_state).toBe('active');
      expect(await actions(w.p, 'field_worker.ending_undone')).toEqual(['field_worker.ending_undone', 'field_worker.ending_undone_rolled_back']);
    });
  });

  describe('slip undo × refusal / withdrawal (both orders; `-465` Q6 B)', () => {
    it('the UNDO holds the lock: a refusal waits, then 409 appeal_not_open; CONTROL: restored, superseded', async () => {
      const w = await endedWorker();
      const appealId = await lodgeHttp(w);
      const r = await race(w.p, (c) => undoTestEnding(c, w.p, W(w.id)), async () => h.decideAppeal(w.tp.client, w.p, appealId, { outcome: 'refused', decided_on: await istDay() }));
      expect(errOf(r).code).toBe('field_worker.appeal_not_open');
      expect(await appealState(appealId)).toBe('superseded');
    });

    it('⭐ a PANEL refusal holds the lock: the slip undo waits, then 409 appeal_refused_by_panel UNDER THE LOCK (the pre-read saw it open) — its intent and twin; CONTROL: refused, still ended', async () => {
      const w = await endedWorker();
      const appealId = await lodgeHttp(w);
      const v = await versionOf(w.id);
      const r = await race(w.p, (c) => closeTestAppeal(c, w.p, appealId, 'refused'), () => h.undoEnding(w.pa.client, w.p, w.id, v));
      expect(r.statusCode, r.body).toBe(409);
      expect(errOf(r).code).toBe('field_worker.appeal_refused_by_panel');
      expect(await appealState(appealId)).toBe('refused');
      expect((await worker(w.id)).current_state).toBe('terminated');
      expect(await actions(w.p, 'field_worker.ending_undone')).toEqual(['field_worker.ending_undone', 'field_worker.ending_undone_rolled_back']);
    });

    it('a PARIWAR ADMIN’s refusal holds the lock: the slip undo waits, then 200 (not covered by `-465` — the slip stands)', async () => {
      const w = await endedWorker('da');
      const appealId = await lodgeHttp(w, w.pa.client);
      const v = await versionOf(w.id);
      const r = await race(w.p, (c) => closeTestAppeal(c, w.p, appealId, 'refused', 'pariwar_admin'), () => h.undoEnding(w.pa.client, w.p, w.id, v));
      expect(r.statusCode, r.body).toBe(200);
      expect(await appealState(appealId)).toBe('refused');
      expect((await worker(w.id)).current_state).toBe('active');
    });

    it('a WITHDRAWAL holds the lock: the slip undo waits, then 200; CONTROL: withdrawn', async () => {
      const w = await endedWorker();
      const appealId = await lodgeHttp(w);
      const v = await versionOf(w.id);
      const r = await race(w.p, (c) => closeTestAppeal(c, w.p, appealId, 'withdrawn'), () => h.undoEnding(w.pa.client, w.p, w.id, v));
      expect(r.statusCode, r.body).toBe(200);
      expect(await appealState(appealId)).toBe('withdrawn');
    });
  });

  describe('decide × decide, decide × withdraw (worker lock, then appeal lock)', () => {
    it('a refusal holds the locks: an allowed decision waits, then 409 appeal_not_open; a withdrawal held: a refusal → 409 appeal_not_open', async () => {
      const w = await endedWorker();
      const a = await lodgeHttp(w);
      const r1 = await race(w.p, (c) => closeTestAppeal(c, w.p, a, 'refused'), async () => h.decideAppeal(w.tp.client, w.p, a, { outcome: 'allowed', decided_on: await istDay() }));
      expect(errOf(r1).code).toBe('field_worker.appeal_not_open');
      expect(await appealState(a)).toBe('refused');
      const w2 = await endedWorker();
      const b = await lodgeHttp(w2);
      const r2 = await race(w2.p, (c) => closeTestAppeal(c, w2.p, b, 'withdrawn'), async () => h.decideAppeal(w2.tp.client, w2.p, b, { outcome: 'refused', decided_on: await istDay() }));
      expect(errOf(r2).code).toBe('field_worker.appeal_not_open');
      expect(await appealState(b)).toBe('withdrawn');
    });
  });

  // Code review round 2, R2B-16 and R2C-8: the matrix says "live, both orders" for decide x decide, decide x withdraw and undo x withdraw. This is
  // ONE table of EVERY order - each of the four closing acts (an allowed decision, a refusal, a withdrawal, the slip undo) holds, and each of the
  // three waiting acts (allow, refuse, withdraw) waits, then loses with `appeal_not_open`: 4 x 3 = 12, none filtered out. (R2B-16's first version
  // skipped the four orders the legs above stage, so removing one of those legs left a hole that its own arithmetic could not see; the legs above
  // stay for their narrative, but the matrix no longer DEPENDS on them.)
  describe('every closing act × every other (decide x decide, decide x withdraw, undo x withdraw): the second loses with appeal_not_open — all twelve orders', () => {
    type Hold = (c: PoolClient, w: World, appealId: string) => Promise<void>;
    // `worker` is the CONTROL on the worker: an allowed decision and the slip undo both RESTORE them; a refusal and a withdrawal leave the ending.
    const holds: Record<string, { hold: Hold; state: string; worker: 'active' | 'terminated' }> = {
      allow: { hold: (c, w, a) => closeTestAppeal(c, w.p, a, 'allowed'), state: 'allowed', worker: 'active' },
      refuse: { hold: (c, w, a) => closeTestAppeal(c, w.p, a, 'refused'), state: 'refused', worker: 'terminated' },
      withdraw: { hold: (c, w, a) => closeTestAppeal(c, w.p, a, 'withdrawn'), state: 'withdrawn', worker: 'terminated' },
      'the slip undo': { hold: (c, w) => undoTestEnding(c, w.p, W(w.id)), state: 'superseded', worker: 'active' },
    };
    const waits: Record<string, { request: (w: World, a: string) => Promise<Reply>; action: string }> = {
      allow: { request: async (w, a) => h.decideAppeal(w.tp.client, w.p, a, { outcome: 'allowed', decided_on: await istDay() }), action: 'field_worker_ending_appeal.allowed' },
      refuse: { request: async (w, a) => h.decideAppeal(w.tp.client, w.p, a, { outcome: 'refused', decided_on: await istDay() }), action: 'field_worker_ending_appeal.refused' },
      withdraw: { request: async (w, a) => h.withdrawAppeal(w.tp.client, w.p, a, { decided_on: await istDay() }), action: 'field_worker_ending_appeal.withdrawn' },
    };
    const pairs = Object.keys(holds).flatMap((holder) => Object.keys(waits).map((waiter) => [holder, waiter] as const));

    // Non-vacuity: the table's OWN size, pinned to the matrix (four closing acts x three waiting acts) - a deleted row of either table, or a
    // filter added later, shrinks it and fails here; there is no second list for a leg to hide in.
    it('the pairs: non-vacuity - all twelve orders are in the table, each once', () => {
      expect(Object.keys(holds)).toEqual(['allow', 'refuse', 'withdraw', 'the slip undo']);
      expect(Object.keys(waits)).toEqual(['allow', 'refuse', 'withdraw']);
      expect(pairs).toHaveLength(12);
      expect(new Set(pairs.map(([a, b]) => `${a}>${b}`)).size).toBe(12);
    });

    it.each(pairs)('%s HOLDS the locks; a %s waits, then 409 appeal_not_open — its intent and twin; CONTROL: the holder\'s act is the one recorded', async (holder, waiter) => {
      const w = await endedWorker();
      const appealId = await lodgeHttp(w);
      const { hold, state, worker: workerState } = holds[holder]!;
      const { request, action } = waits[waiter]!;
      const r = await race(w.p, (c) => hold(c, w, appealId), () => request(w, appealId));
      expect(r.statusCode, r.body).toBe(409);
      expect(errOf(r).code).toBe('field_worker.appeal_not_open');
      expect(await appealState(appealId)).toBe(state); // CONTROL — the holder's act stands
      expect((await worker(w.id)).current_state).toBe(workerState); // CONTROL — and the worker is where that act left them
      expect(await actions(w.p, action)).toEqual([action, `${action}_rolled_back`]); // the waiter was ATTEMPTED under the lock, then refused
    });
  });

  describe('lodge × lodge, lodge × undo (worker lock; both orders)', () => {
    it('a lodge holds the lock: a second lodge waits, then 409 appeal_open — its intent and twin; CONTROL: one appeal', async () => {
      const w = await endedWorker();
      const body = await lodgeBody(w.id);
      const r = await race(w.p, async (c) => void (await lodgeTestAppeal(c, w.p, W(w.id))), () => h.lodgeAppeal(w.tp.client, w.p, w.id, body));
      expect(r.statusCode, r.body).toBe(409);
      expect(errOf(r).code).toBe('field_worker.appeal_open');
      expect((await q<{ n: number }>('SELECT count(*)::int AS n FROM field_worker_ending_appeals WHERE field_worker_id = $1', [w.id]))[0]!.n).toBe(1);
      expect(await actions(w.p, 'field_worker_ending_appeal.lodged')).toEqual(['field_worker_ending_appeal.lodged', 'field_worker_ending_appeal.lodged_rolled_back']);
    });

    it('a lodge holds the lock: the slip undo waits, then 200 and SUPERSEDES the appeal just lodged', async () => {
      const w = await endedWorker();
      const v = await versionOf(w.id);
      let appealId = '';
      const r = await race(w.p, async (c) => void (appealId = await lodgeTestAppeal(c, w.p, W(w.id))), () => h.undoEnding(w.pa.client, w.p, w.id, v));
      expect(r.statusCode, r.body).toBe(200);
      expect(await appealState(appealId)).toBe('superseded');
    });

    it('the UNDO holds the lock: a lodge waits, then 409 illegal_transition; CONTROL: restored, no appeal', async () => {
      const w = await endedWorker();
      const body = await lodgeBody(w.id);
      const r = await race(w.p, (c) => undoTestEnding(c, w.p, W(w.id)), () => h.lodgeAppeal(w.tp.client, w.p, w.id, body));
      expect(errOf(r).code).toBe('field_worker.illegal_transition');
      expect((await worker(w.id)).current_state).toBe('active');
      expect((await q<{ n: number }>('SELECT count(*)::int AS n FROM field_worker_ending_appeals WHERE field_worker_id = $1', [w.id]))[0]!.n).toBe(0);
    });
  });

  describe('AC3 — undo × re-end', () => {
    it('another officer undoes and ENDS AGAIN while a stale undo waits: 409 ending_changed under the lock; CONTROL: the new ending stands', async () => {
      const w = await endedWorker();
      const v = await versionOf(w.id);
      const r = await race(
        w.p,
        async (c) => {
          await undoTestEnding(c, w.p, W(w.id));
          await terminateTestFieldWorker(c, w.p, W(w.id));
        },
        () => h.undoEnding(w.pa.client, w.p, w.id, v),
      );
      expect(r.statusCode, r.body).toBe(409);
      expect(errOf(r).code).toBe('field_worker.ending_changed');
      expect(await worker(w.id)).toMatchObject({ current_state: 'terminated', v: String(v + 2) });
    });
  });

  describe('AC2 — the live-number index', () => {
    it('(i) a registration’s UNCOMMITTED insert holds the number: the undo’s UPDATE waits, then its 23505 maps BY NAME to 409 number_registered_again — intent and twin; CONTROL: the newer row committed', async () => {
      const w = await endedWorker();
      const v = await versionOf(w.id);
      const index = (await worker(w.id)).idx;
      let newer = '';
      const r = await race(w.p, async (c) => void (newer = await registerTestFieldWorker(c, w.p, { mobileBlindIndex: index })), () => h.undoEnding(w.pa.client, w.p, w.id, v));
      expect(r.statusCode, r.body).toBe(409);
      expect(errOf(r).code).toBe('field_worker.number_registered_again');
      expect((await worker(w.id)).current_state).toBe('terminated');
      expect((await worker(newer)).current_state).toBe('pending_kyc');
      expect(await actions(w.p, 'field_worker.ending_undone')).toEqual(['field_worker.ending_undone', 'field_worker.ending_undone_rolled_back']);
    });

    it('(iii) the reverse: the undo’s UNCOMMITTED update holds the number; a registration of it waits, then 409 mobile_already_registered; CONTROL: the worker restored', async () => {
      const w = await endedWorker();
      const r = await race(w.p, (c) => undoTestEnding(c, w.p, W(w.id)), () => h.register(w.pa.client, w.p, { name: 'Racer Unusual-Surname', mobile: w.mobile, district: 'Patna', previous_endings_seen: true }));
      expect(r.statusCode, r.body).toBe(409);
      expect(errOf(r).code).toBe('field_worker.mobile_already_registered');
      expect((await worker(w.id)).current_state).toBe('active');
      // Code review round 2, R2B-16: AC2 (iii) names the audit pair and this leg asserted neither - a registration refused under the lock that stopped
      // writing its `_rolled_back` twin would have stayed green. The first line is the worker's own registration (`endedWorker`).
      expect(await actions(w.p, 'field_worker.registered')).toEqual(['field_worker.registered', 'field_worker.registered', 'field_worker.registered_rolled_back']);
    });

    it('(ii) the undo holds the old row: a registration with link_to = that row waits on its FOR SHARE, then 422 link_invalid — ⛔ 40P01; CONTROL: restored', async () => {
      const w = await endedWorker();
      const r = await race(
        w.p,
        (c) => undoTestEnding(c, w.p, W(w.id)),
        () => h.register(w.pa.client, w.p, { name: 'Racer Unusual-Surname', mobile: w.mobile, district: 'Patna', previous_endings_seen: true, link_to: w.id }),
      );
      expect(r.statusCode, r.body).toBe(422);
      expect(errOf(r).code).toBe('field_worker.link_invalid');
      expect((await worker(w.id)).current_state).toBe('active');
      // Code review round 2, R2C-4: the link check is a PRE-READ refusal (AD12: in the scope transaction, BEFORE the audit wrapper opens), so the
      // refused registration writes NO intent line and NO `_rolled_back` twin - unlike the number check of leg (iii) above, which is raised inside
      // `mutate`. The only `field_worker.registered` line is the worker's own registration (`endedWorker`).
      expect(await actions(w.p, 'field_worker.registered')).toEqual(['field_worker.registered']);
    });
  });
});
