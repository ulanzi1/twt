// Story 13.1d — the move request's races through HTTP (AC1 (d), AC2 (e); AD3, AD4; I4, I5), with the WORKER's row lock HELD on a holder
// connection: every request writer takes the worker's lock FIRST (I5), so a request parks there after its gate, its pre-read and its
// intent line, and judges the LOCKED rows once the holder commits. Each leg asserts the REASON and a CONTROL (the holder's act did
// commit), and that nothing deadlocks in either order (TR1). Live DB, OWN-COMMITTING; a fresh Pariwar per leg.

import { ids } from '@twt/domain';
import type { PoolClient } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { acceptTestMoveRequest, moveTestFieldWorker } from '../_field-worker-fixture.js';
import { hasDatabase } from '../_setup.js';
import { createHarness, errOf, json, releaseHolder, waitForBlockedBy, type Harness } from './_registration-harness.js';

describe.skipIf(!hasDatabase)('Story 13.1d — move-request races (AC1 (d), AC2 (e))', { timeout: 90_000 }, () => {
  let h: Harness;
  beforeAll(async () => {
    h = await createHarness();
  });
  afterAll(async () => {
    await h.cleanup();
  });

  const pidOf = async (c: PoolClient): Promise<number> => (await c.query<{ pid: number }>('SELECT pg_backend_pid() AS pid')).rows[0]!.pid;
  const row = (id: string) =>
    h.td.pool.query<{ state: string; supersede_cause: string | null }>('SELECT state, supersede_cause FROM field_worker_move_requests WHERE move_request_id = $1', [id]).then((r) => r.rows[0]!);
  const district = (id: string) => h.td.pool.query<{ district: string }>('SELECT district FROM field_workers WHERE field_worker_id = $1', [id]).then((r) => r.rows[0]!.district);
  const actionsOn = (p: string, locator: string) =>
    h.td.pool.query<{ action: string }>('SELECT action FROM audit_log_entries WHERE pariwar_id = $1 AND resource_locator = $2 ORDER BY seq', [p, locator]).then((r) => r.rows.map((x) => x.action));

  async function setup() {
    const p = h.freshPariwar();
    await h.listDistrict(p, 'Patna', 'Gaya', 'Nalanda');
    const pa = await h.actor(p, 'pariwar_admin', 'pariwar', p, 'Meera Pariwar-Admin');
    const daP = await h.actor(p, 'district_admin', 'district', 'Patna', 'Ravi Patna');
    const daG = await h.actor(p, 'district_admin', 'district', 'Gaya', 'Sita Gaya');
    const daG2 = await h.actor(p, 'district_admin', 'district', 'Gaya', 'Gopal Gaya');
    const worker = await h.registered(pa.client, p, { name: 'Racer Unusual-Surname', mobile: '+919876545678', district: 'Patna' });
    expect((await h.approve(pa.client, p, worker)).statusCode).toBe(200);
    return { p, pa, daP, daG, daG2, worker };
  }

  /** Run `hold` on its own connection (it takes the worker's lock), start `requests`, wait until `n` backends are parked behind it, COMMIT. */
  async function race<T>(p: string, hold: (holder: PoolClient) => Promise<void>, requests: () => Promise<T>, n = 1): Promise<T> {
    const holder = await h.td.pool.connect();
    try {
      await holder.query('BEGIN');
      await holder.query(`SELECT set_config('app.pariwar_id', $1, true)`, [p]);
      await hold(holder);
      const pending = requests();
      const pid = await pidOf(holder);
      await waitForBlockedBy(h.td.pool, pid);
      let parked = 0;
      for (let i = 0; i < 100; i += 1) {
        // Parked behind the holder directly, or behind a request that is (a lock queue: the second waiter is blocked by the first).
        const r = await h.td.pool.query<{ n: number }>(
          `SELECT count(*)::int AS n FROM pg_stat_activity a
            WHERE $1 = ANY(pg_blocking_pids(a.pid))
               OR EXISTS (SELECT 1 FROM pg_stat_activity b WHERE $1 = ANY(pg_blocking_pids(b.pid)) AND b.pid = ANY(pg_blocking_pids(a.pid)))`,
          [pid],
        );
        parked = r.rows[0]!.n;
        if (parked >= n) break;
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      if (parked < n) {
        // Committing now would run the leg SEQUENTIALLY, and its reason codes would still pass: fail instead (code review CR28 (d)).
        pending.catch(() => undefined); // the holder rolls back in `finally`; the stranded requests then settle on their own
        throw new Error(`[race] only ${String(parked)} of ${String(n)} backends parked behind the worker lock — the leg would prove nothing`);
      }
      await holder.query('COMMIT');
      return await pending;
    } finally {
      await releaseHolder(holder);
    }
  }
  const lockWorker = (id: string) => async (holder: PoolClient) => {
    await holder.query('SELECT 1 FROM field_workers WHERE field_worker_id = $1 FOR UPDATE', [id]);
  };

  it('AC1 (d): two opens for one worker from the two ends, parked on the worker lock — one 201, one 409 move_request_open (the partial unique), ONE open request', async () => {
    const s = await setup();
    const [a, b] = await race(
      s.p,
      lockWorker(s.worker),
      () =>
        Promise.all([
          h.openRequest(s.daP.client, s.p, s.worker, { from_district: 'Patna', to_district: 'Gaya' }),
          h.openRequest(s.daG.client, s.p, s.worker, { from_district: 'Patna', to_district: 'Gaya' }),
        ]),
      2,
    );
    const codes = [a, b].map((r) => (r.statusCode === 201 ? 201 : `${r.statusCode} ${errOf(r).code}`)).sort();
    expect(codes).toEqual([201, '409 field_worker.move_request_open']);
    const open = await h.td.pool.query<{ n: number }>(
      "SELECT count(*)::int AS n FROM field_worker_move_requests WHERE field_worker_id = $1 AND state IN ('pending', 'escalated')",
      [s.worker],
    );
    expect(open.rows[0]!.n).toBe(1);
    // The loser reached the LOCK (the partial unique decided it, inside `mutate`): its intent line and its twin — ⛔ a pre-read refusal.
    const twins = await h.td.pool.query<{ n: number }>(
      "SELECT count(*)::int AS n FROM audit_log_entries WHERE pariwar_id = $1 AND action = 'field_worker_move_request.opened_rolled_back'",
      [s.p],
    );
    expect(twins.rows[0]!.n).toBe(1);
  });

  it('AC2 (e) — a direct move commits while the acceptance waits on the worker lock ⇒ 409 move_request_not_open; the worker where the Pariwar Admin put them; the request superseded', async () => {
    const s = await setup();
    const opened = await h.openRequest(s.daP.client, s.p, s.worker, { from_district: 'Patna', to_district: 'Gaya' });
    const id = json(opened)['move_request_id'] as string;
    const r = await race(s.p, (holder) => moveTestFieldWorker(holder, s.p, ids.fieldWorkerId(s.worker), 'Nalanda'), () => h.requestAct(s.daG.client, s.p, id, 'accept'));
    expect(r.statusCode, r.body).toBe(409);
    expect(errOf(r).code).toBe('field_worker.move_request_not_open');
    expect(await district(s.worker)).toBe('Nalanda'); // CONTROL — the holder's direct move committed
    expect(await row(id)).toEqual({ state: 'superseded', supersede_cause: 'worker_moved' });
    // Refused under the lock: the acceptance's intent line and its twin.
    expect(await actionsOn(s.p, `field_worker_move_request/${id}`)).toEqual([
      'field_worker_move_request.opened',
      'field_worker_move_request.accepted',
      'field_worker_move_request.accepted_rolled_back',
    ]);
  });

  it('AC2 (e) — the reverse: the acceptance commits while a direct move from Patna waits ⇒ the move answers 409 authorization_stale; the worker in Gaya; the request accepted', async () => {
    const s = await setup();
    const opened = await h.openRequest(s.daP.client, s.p, s.worker, { from_district: 'Patna', to_district: 'Gaya' });
    const id = json(opened)['move_request_id'] as string;
    const r = await race(
      s.p,
      (holder) => acceptTestMoveRequest(holder, s.p, id, 'Gaya'),
      () => h.move(s.pa.client, s.p, s.worker, { from_district: 'Patna', to_district: 'Nalanda', reason_code: 'reassigned' }),
    );
    expect(r.statusCode, r.body).toBe(409);
    expect(errOf(r).code).toBe('field_worker.authorization_stale');
    expect(await district(s.worker)).toBe('Gaya'); // CONTROL — the holder's acceptance committed
    expect((await row(id)).state).toBe('accepted');
  });

  /** Two writers of ONE open request, parked on the worker's lock: exactly one commits; the other is judged under the lock and answers 409. */
  async function answerRace(
    first: (s: Awaited<ReturnType<typeof setup>>, id: string) => ReturnType<Harness['requestAct']>,
    second: (s: Awaited<ReturnType<typeof setup>>, id: string) => ReturnType<Harness['requestAct']>,
    outcomes: { firstWins: [string, string, string]; secondWins: [string, string, string] },
  ): Promise<void> {
    const s = await setup();
    const id = json(await h.openRequest(s.daP.client, s.p, s.worker, { from_district: 'Patna', to_district: 'Gaya' }))['move_request_id'] as string;
    const [a, b] = await race(s.p, lockWorker(s.worker), () => Promise.all([first(s, id), second(s, id)]), 2);
    const codes = [a, b].map((r) => (r.statusCode === 200 ? 200 : `${r.statusCode} ${errOf(r).code}`)).sort();
    expect(codes).toEqual([200, '409 field_worker.move_request_not_open']);
    const [state, workerDistrict, loserAction] = a.statusCode === 200 ? outcomes.firstWins : outcomes.secondWins;
    expect((await row(id)).state).toBe(state);
    expect(await district(s.worker)).toBe(workerDistrict); // CONTROL — the winner's act is the one that took effect
    // The WHOLE ledger of the request (code review RP-18): the opener's line, the winner's own line, and the loser's INTENT line with its
    // `_rolled_back` twin (a refusal found only under the lock) - nothing else, so a missing winner line or intent line fails here.
    const actions = await actionsOn(s.p, `field_worker_move_request/${id}`);
    expect([...actions].sort()).toEqual(
      [
        'field_worker_move_request.opened',
        `field_worker_move_request.${state}`,
        `field_worker_move_request.${loserAction}`,
        `field_worker_move_request.${loserAction}_rolled_back`,
      ].sort(),
    );
  }

  it('AC2 (e) — two answerers, accept x refuse by the two Gaya District Admins: exactly one commits, the other is 409 move_request_not_open (CR27)', async () => {
    await answerRace(
      (s, id) => h.requestAct(s.daG.client, s.p, id, 'accept'),
      (s, id) => h.requestAct(s.daG2.client, s.p, id, 'refuse', { reason_code: 'other' }),
      { firstWins: ['accepted', 'Gaya', 'refused'], secondWins: ['refused', 'Patna', 'accepted'] },
    );
  });

  it('AC2 / AC4 — accept by the counterpart x withdraw by the opener: exactly one commits, the other is 409 move_request_not_open (CR27)', async () => {
    await answerRace(
      (s, id) => h.requestAct(s.daG.client, s.p, id, 'accept'),
      (s, id) => h.requestAct(s.daP.client, s.p, id, 'withdraw'),
      { firstWins: ['accepted', 'Gaya', 'withdrawn'], secondWins: ['withdrawn', 'Patna', 'accepted'] },
    );
  });
});
