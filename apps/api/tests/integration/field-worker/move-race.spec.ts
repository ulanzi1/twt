// Story 13.1c — AC2 (a move that loses a race, 13.1 D7) and AC7's live leg (a worker moved between the gate and the lock), through
// HTTP with the row lock HELD: a holder connection moves the worker through the PUBLIC `postFieldWorker` (the fixture) and keeps
// its `FOR UPDATE` until COMMIT; the request passes the gate and the pre-read (both read the committed district), writes its intent
// line, then waits on the lock inside `mutate` (`waitForBlockedBy`). Once the holder commits, the command judges the LOCKED row
// and refuses: 409 `authorization_stale`, the transaction rolled back, the `_rolled_back` twin written (TR2). Each leg asserts the
// REASON and a CONTROL (TR8 — the holder's move did commit). Live DB, OWN-COMMITTING; a fresh Pariwar per leg.

import { ids } from '@twt/domain';
import type { PoolClient } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { moveTestFieldWorker } from '../_field-worker-fixture.js';
import { hasDatabase } from '../_setup.js';
import { createHarness, errOf, releaseHolder, waitForBlockedBy, type Harness } from './_registration-harness.js';

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

  async function activeWorker() {
    const p = h.freshPariwar();
    await h.listDistrict(p, 'Patna', 'Gaya', 'Nalanda');
    const admin = await h.actor(p, 'pariwar_admin', 'pariwar', p, 'Meera Pariwar-Admin');
    const id = await h.registered(admin.client, p, { name: 'Racer Unusual-Surname', mobile: '+919876534567', district: 'Patna' });
    expect((await h.approve(admin.client, p, id)).statusCode).toBe(200);
    return { p, admin, id };
  }

  /** Hold a committed-later move Patna → Gaya on its own connection while `request` runs; COMMIT once the request is parked behind it. */
  async function raceAgainstMove(p: string, id: string, request: () => ReturnType<Harness['move']>) {
    const holder = await h.td.pool.connect();
    try {
      await holder.query('BEGIN');
      await holder.query(`SELECT set_config('app.pariwar_id', $1, true)`, [p]);
      await moveTestFieldWorker(holder, p, ids.fieldWorkerId(id), 'Gaya'); // holds FOR UPDATE until COMMIT
      const pending = request();
      await waitForBlockedBy(h.td.pool, await pidOf(holder));
      await holder.query('COMMIT');
      return await pending;
    } finally {
      await releaseHolder(holder);
    }
  }

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
    ['terminate', (h: Harness, c: Parameters<Harness['suspend']>[0], p: string, id: string) => h.terminate(c, p, id, { reason_code: 'inactive', ended_on: '2026-11-01' }), 'field_worker.terminated'],
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
});
