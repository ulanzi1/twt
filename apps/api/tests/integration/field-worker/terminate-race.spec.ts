// Story 13.1c — AC6 (b): two terminations of one worker at once. The FIRST runs on a holder connection through the PUBLIC
// `terminateFieldWorker` and keeps the row's `FOR UPDATE` until COMMIT; the SECOND is an HTTP request that passes the gate and the
// pre-read (both read the committed, still-active row), writes its intent line, then waits on the lock inside `mutate`
// (`waitForBlockedBy`). Once the first commits, the second's command finds a TERMINATED row and refuses (409 illegal_transition):
// its transaction rolls back and its `_rolled_back` twin is written (TR2). Asserted with the REASON and a CONTROL (TR8): the first
// ending is the one recorded. Live DB, OWN-COMMITTING; a fresh Pariwar.

import { randomUUID } from 'node:crypto';

import { fieldWorker, ids } from '@twt/domain';
import type { PoolClient } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { actAuthorization } from '../_field-worker-fixture.js';
import { hasDatabase } from '../_setup.js';
import { createHarness, errOf, releaseHolder, waitForBlockedBy, type Harness } from './_registration-harness.js';

describe.skipIf(!hasDatabase)('Story 13.1c — two terminations of one worker at once (AC6 (b))', { timeout: 60_000 }, () => {
  let h: Harness;

  beforeAll(async () => {
    h = await createHarness();
  });
  afterAll(async () => {
    await h.cleanup();
  });

  const pidOf = async (c: PoolClient): Promise<number> => (await c.query<{ pid: number }>('SELECT pg_backend_pid() AS pid')).rows[0]!.pid;

  it('the first commits; the second answers 409 illegal_transition from inside `mutate` and writes the field_worker.terminated_rolled_back twin; ONE terminated event, the first’s reason', async () => {
    const p = h.freshPariwar();
    await h.listDistrict(p, 'Patna');
    const admin = await h.actor(p, 'pariwar_admin', 'pariwar', p, 'Meera Pariwar-Admin');
    const id = await h.registered(admin.client, p, { name: 'Ender Unusual-Surname', mobile: '+919876545678', district: 'Patna' });
    expect((await h.approve(admin.client, p, id)).statusCode).toBe(200);
    const today = (await h.td.pool.query<{ d: string }>("SELECT (now() AT TIME ZONE 'Asia/Kolkata')::date::text AS d")).rows[0]!.d;

    const holder = await h.td.pool.connect();
    let second: Awaited<ReturnType<Harness['terminate']>>;
    try {
      await holder.query('BEGIN');
      await holder.query(`SELECT set_config('app.pariwar_id', $1, true)`, [p]);
      const actorId = randomUUID();
      await fieldWorker.terminateFieldWorker(holder, {
        pariwarId: ids.pariwarId(p),
        fieldWorkerId: ids.fieldWorkerId(id),
        auditId: randomUUID(),
        actor: 'operator',
        actorId,
        authorization: actAuthorization('field_worker.terminate', p, 'Patna', actorId),
        reasonCode: 'left_voluntarily',
        endedOn: today,
      }); // holds FOR UPDATE until COMMIT
      const pending = h.terminate(admin.client, p, id, { reason_code: 'inactive', ended_on: today });
      await waitForBlockedBy(h.td.pool, await pidOf(holder));
      await holder.query('COMMIT');
      second = await pending;
    } finally {
      await releaseHolder(holder);
    }

    expect(second.statusCode, second.body).toBe(409);
    expect(errOf(second).code).toBe('field_worker.illegal_transition');
    // CONTROL: the FIRST ending is the one recorded.
    const row = (await h.td.pool.query('SELECT current_state, state_reason_code FROM field_workers WHERE field_worker_id = $1', [id])).rows[0];
    expect(row).toEqual({ current_state: 'terminated', state_reason_code: 'left_voluntarily' });
    const ended = (await h.td.pool.query("SELECT 1 FROM events_log WHERE stream_id = $1 AND event_type = 'field_worker.terminated'", [id])).rowCount;
    expect(ended).toBe(1);
    // The second was ATTEMPTED under the lock: its intent and its twin, both naming the admin.
    const lines = (
      await h.td.pool.query<{ action: string; actor_id: string }>(
        "SELECT action, actor_id FROM audit_log_entries WHERE pariwar_id = $1 AND resource_locator = $2 AND action LIKE 'field_worker.terminated%' ORDER BY seq",
        [p, `field_worker/${id}`],
      )
    ).rows;
    expect(lines).toEqual([
      { action: 'field_worker.terminated', actor_id: admin.userId },
      { action: 'field_worker.terminated_rolled_back', actor_id: admin.userId },
    ]);
  });
});
