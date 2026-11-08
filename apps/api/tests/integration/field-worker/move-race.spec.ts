// Story 13.1c — AC2 (a move that loses a race, 13.1 D7) and AC7's live leg (a worker moved between the gate and the lock), through
// HTTP with the row lock HELD: a holder connection moves the worker through the PUBLIC `postFieldWorker` (the fixture) and keeps
// its `FOR UPDATE` until COMMIT; the request passes the gate and the pre-read (both read the committed district), writes its intent
// line, then waits on the lock inside `mutate` (`waitForBlockedBy`). Once the holder commits, the command judges the LOCKED row
// and refuses: 409 `authorization_stale`, the transaction rolled back, the `_rolled_back` twin written (TR2). Each leg asserts the
// REASON and a CONTROL (TR8 — the holder's move did commit). Live DB, OWN-COMMITTING; a fresh Pariwar per leg.

import { ids } from '@twt/domain';
import type { PoolClient } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { actTestFieldWorker, moveTestFieldWorker } from '../_field-worker-fixture.js';
import { hasDatabase } from '../_setup.js';
import { createHarness, errOf, json, releaseHolder, waitForBlockedBy, type Harness } from './_registration-harness.js';

describe.skipIf(!hasDatabase)('Story 13.1c — a move or an act that loses a race to a move (AC2, AC7)', { timeout: 60_000 }, () => {
  let h: Harness;

  beforeAll(async () => {
    h = await createHarness();
  });
  afterAll(async () => {
    await h.cleanup();
  });

  const pidOf = async (c: PoolClient): Promise<number> => (await c.query<{ pid: number }>('SELECT pg_backend_pid() AS pid')).rows[0]!.pid;
  const lines = (p: string, id: string) =>
    h.td.pool
      .query<{ action: string }>(
        "SELECT action FROM audit_log_entries WHERE pariwar_id = $1 AND resource_locator = $2 AND action NOT LIKE 'field_worker.registered%' AND action NOT LIKE 'field_worker.kyc_completed%' AND action NOT LIKE 'field_worker.activated%' ORDER BY seq",
        [p, `field_worker/${id}`],
      )
      .then((r) => r.rows.map((x) => x.action));
  const types = (id: string) =>
    h.td.pool.query<{ event_type: string }>('SELECT event_type FROM events_log WHERE stream_id = $1 ORDER BY event_version', [id]).then((r) => r.rows.map((x) => x.event_type));
  const district = (id: string) => h.td.pool.query<{ district: string }>('SELECT district FROM field_workers WHERE field_worker_id = $1', [id]).then((r) => r.rows[0]!.district);
  const istToday = () => h.td.pool.query<{ d: string }>("SELECT (now() AT TIME ZONE 'Asia/Kolkata')::date::text AS d").then((r) => r.rows[0]!.d);

  async function activeWorker() {
    const p = h.freshPariwar();
    await h.listDistrict(p, 'Patna', 'Gaya', 'Nalanda');
    const admin = await h.actor(p, 'pariwar_admin', 'pariwar', p, 'Meera Pariwar-Admin');
    const id = await h.registered(admin.client, p, { name: 'Racer Unusual-Surname', mobile: '+919876534567', district: 'Patna' });
    expect((await h.approve(admin.client, p, id)).statusCode).toBe(200);
    return { p, admin, id };
  }

  /** Hold `hold` (a committed-later act, through the PUBLIC command) on its own connection while `request` runs; COMMIT once the request is parked behind it. */
  async function raceAgainst(p: string, hold: (holder: PoolClient) => Promise<void>, request: () => ReturnType<Harness['move']>) {
    const holder = await h.td.pool.connect();
    try {
      await holder.query('BEGIN');
      await holder.query(`SELECT set_config('app.pariwar_id', $1, true)`, [p]);
      await hold(holder); // holds FOR UPDATE until COMMIT
      const pending = request();
      await waitForBlockedBy(h.td.pool, await pidOf(holder));
      await holder.query('COMMIT');
      return await pending;
    } finally {
      await releaseHolder(holder);
    }
  }
  /** Hold a committed-later move Patna → Gaya while `request` runs. */
  const raceAgainstMove = (p: string, id: string, request: () => ReturnType<Harness['move']>) =>
    raceAgainst(p, (holder) => moveTestFieldWorker(holder, p, ids.fieldWorkerId(id), 'Gaya'), request);

  it('AC2: two Pariwar Admins both saw Patna; one moves Patna → Gaya and commits while the other’s Patna → Nalanda waits on the lock ⇒ 409 authorization_stale, the worker stays in Gaya, the loser’s intent and its twin', async () => {
    const { p, id } = await activeWorker();
    const second = await h.actor(p, 'pariwar_admin', 'pariwar', p, 'Kiran Pariwar-Admin');
    const r = await raceAgainstMove(p, id, () => h.move(second.client, p, id, { from_district: 'Patna', to_district: 'Nalanda', reason_code: 'reassigned' }));
    expect(r.statusCode, r.body).toBe(409);
    expect(errOf(r).code).toBe('field_worker.authorization_stale');
    // CONTROL: the holder's move committed — ONE posted event (the holder's), the worker in Gaya.
    expect(await district(id)).toBe('Gaya');
    expect((await types(id)).filter((t) => t === 'field_worker.posted')).toHaveLength(1);
    // The loser's act was attempted under the lock: its intent AND its twin (the holder's fixture move writes no line).
    expect(await lines(p, id)).toEqual(['field_worker.posted', 'field_worker.posted_rolled_back']);
  });

  it.each([
    ['suspend', (h: Harness, c: Parameters<Harness['suspend']>[0], p: string, id: string) => h.suspend(c, p, id, { reason_code: 'under_review' }), 'field_worker.suspended'],
    // A date that is VALID for this worker (today, IST, read from the DB) — so the 409 is the stale target and cannot be a
    // by-product of the guard order (a hard-coded day before the registration would be `ended_on_invalid` if that guard ran first).
    ['terminate', async (h: Harness, c: Parameters<Harness['suspend']>[0], p: string, id: string) => h.terminate(c, p, id, { reason_code: 'inactive', ended_on: await istToday() }), 'field_worker.terminated'],
  ] as const)(
    'AC7: a %s gated at Patna, the worker moved to Gaya before the lock ⇒ 409 authorization_stale under the lock, nothing appended, the intent and its twin',
    async (_label, act, action) => {
      const { p, admin, id } = await activeWorker();
      const before = (await types(id)).length;
      const r = await raceAgainstMove(p, id, () => act(h, admin.client, p, id));
      expect(r.statusCode, r.body).toBe(409);
      expect(errOf(r).code).toBe('field_worker.authorization_stale');
      // CONTROL: the move committed (one event more) and nothing else was appended; the worker is still active.
      expect(await types(id)).toHaveLength(before + 1);
      expect((await types(id)).at(-1)).toBe('field_worker.posted');
      expect(await district(id)).toBe('Gaya');
      expect(await lines(p, id)).toEqual([action, `${action}_rolled_back`]);
    },
  );

  // Review R2-10 — a move whose GATE read Patna, the worker moved Patna → Gaya before the pre-read, and a body that already says
  // `from_district: 'Gaya'` (a screen loaded at Gaya after an ABA, or a hand-built request): the gate's target (Patna) is NEITHER end of
  // the move (Gaya → Nalanda), guard (3c). The pre-read refuses it like the other acts' stale target - 409, ⛔ an audit line (I7) -
  // where it used to reach the lock and write an intent and its twin. The request is parked AFTER the gate on the idempotency claim's
  // advisory lock (`keyed-store.ts`), which a holder takes on the request's exact key, while the move commits.
  it('R2-10: a move gated at Patna, the worker moved to Gaya before the pre-read, a body from Gaya to Nalanda ⇒ 409 authorization_stale at the pre-read, NO audit line', async () => {
    const { p, admin, id } = await activeWorker();
    const key = `r2-10-${id}`;
    const holder = await h.td.pool.connect();
    try {
      await holder.query('BEGIN');
      await holder.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`field_worker.move:${p}:${admin.userId}:${id}:${key}`]);
      const pending = h.move(admin.client, p, id, { from_district: 'Gaya', to_district: 'Nalanda', reason_code: 'reassigned' }, key);
      await waitForBlockedBy(h.td.pool, await pidOf(holder)); // past the gate (it read Patna), waiting on the claim
      const mover = await h.td.pool.connect();
      try {
        await mover.query('BEGIN');
        await mover.query(`SELECT set_config('app.pariwar_id', $1, true)`, [p]);
        await moveTestFieldWorker(mover, p, ids.fieldWorkerId(id), 'Gaya');
        await mover.query('COMMIT');
      } finally {
        mover.release();
      }
      await holder.query('COMMIT');
      const r = await pending;
      expect(r.statusCode, r.body).toBe(409);
      expect(errOf(r).code).toBe('field_worker.authorization_stale');
    } finally {
      await releaseHolder(holder);
    }
    // CONTROL: the fixture's move committed (the worker is in Gaya, one posted event) - and the refused move wrote NO line.
    expect(await district(id)).toBe('Gaya');
    expect((await types(id)).filter((t) => t === 'field_worker.posted')).toHaveLength(1);
    expect(await lines(p, id)).toEqual([]);
  });

  // Review CR10 — a move is legal in every non-terminated state, so a suspend or a reactivate that commits between the move's
  // pre-read and its lock does NOT stop it; the 200 (which the idempotency store replays for a day, and the admin panel renders
  // without a second fetch) must carry the state AND the reason of the row the lock confirmed — ⛔ the pre-read's reason.
  it.each([
    ['a suspend', 'active', 'suspend', { current_state: 'suspended', state_reason_code: 'under_review' }],
    ['a reactivate', 'suspended', 'reactivate', { current_state: 'active', state_reason_code: null }],
  ] as const)('CR10: %s commits while the move waits on the lock ⇒ 200 carrying the LOCKED row’s state and reason, which are the stored ones', async (_label, start, act, expected) => {
    const { p, admin, id } = await activeWorker();
    if (start === 'suspended') expect((await h.suspend(admin.client, p, id, { reason_code: 'under_review' })).statusCode).toBe(200);
    const r = await raceAgainst(p, (holder) => actTestFieldWorker(holder, p, ids.fieldWorkerId(id), act), () =>
      h.move(admin.client, p, id, { from_district: 'Patna', to_district: 'Gaya', reason_code: 'reassigned' }),
    );
    expect(r.statusCode, r.body).toBe(200);
    expect(json(r)).toEqual({ field_worker_id: id, district: 'Gaya', ended_on: null, ...expected });
    // CONTROL — the body equals the stored row (the holder's act committed first; the move kept its state and reason).
    const stored = (await h.td.pool.query<{ current_state: string; state_reason_code: string | null; district: string }>('SELECT current_state, state_reason_code, district FROM field_workers WHERE field_worker_id = $1', [id])).rows[0]!;
    expect(stored).toEqual({ district: 'Gaya', ...expected });
  });
});
