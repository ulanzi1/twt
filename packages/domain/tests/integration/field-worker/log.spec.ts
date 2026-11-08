// Story 13.1c (AD7; AC8) — `listFieldWorkerEvents`, the worker's log, live. Per-test ROLLBACK (`setupLiveDb`): the commands run on
// the test's own transaction, so every event shares one `occurred_at` (TR4) — the order is `event_version`'s, never the clock's.
// The officers' `users` rows are seeded as the superuser BEFORE the app scope is entered (`users` is global).

import { randomUUID } from 'node:crypto';

import type pg from 'pg';
import { describe, expect, it } from 'vitest';

import { bindScopedDb } from '../../../src/db.js';
import {
  activateFieldWorker,
  postFieldWorker,
  recordFieldWorkerKycCompleted,
  suspendFieldWorker,
  terminateFieldWorker,
} from '../../../src/field-worker/commands.js';
import { LIST_FIELD_WORKER_EVENTS_MAX_LIMIT, listFieldWorkerEvents } from '../../../src/field-worker/read.js';
import { fieldWorkerId as toFieldWorkerId, pariwarId as toPariwarId, type FieldWorkerId } from '../../../src/ids/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppScope } from '../_helpers.js';
import { actAuthorization, approval, moveAuthorization, registerReal } from './_fixtures.js';

const A = toPariwarId(PARIWAR_A);

async function seedOfficer(client: pg.PoolClient, displayName: string | null): Promise<string> {
  const id = randomUUID();
  await client.query("INSERT INTO users (id, identity_type, status, display_name) VALUES ($1, 'admin', 'active', $2)", [id, displayName]);
  return id;
}

async function istToday(client: pg.PoolClient): Promise<string> {
  return (await client.query<{ d: string }>("SELECT (now() AT TIME ZONE 'Asia/Kolkata')::date::text AS d")).rows[0]!.d;
}

const staff = (id: FieldWorkerId, actorId: string) => ({ pariwarId: A, fieldWorkerId: id, auditId: randomUUID(), actor: 'operator' as const, actorId });

describe.skipIf(!hasDatabase)('listFieldWorkerEvents — the worker’s log (Story 13.1c AD7, AC8)', () => {
  setupLiveDb();

  it('the whole stream in event_version order, each event with its actor (CURRENT name), key, grant, target, reason, districts and ended_on — and the events from BEFORE a move', async () => {
    const { client } = getTx();
    const asha = await seedOfficer(client, 'Asha Officer');
    await enterAppScope(client, PARIWAR_A);
    const id = await registerReal(client, PARIWAR_A, { actorId: asha, district: 'Patna' });
    await recordFieldWorkerKycCompleted(client, { ...staff(id, asha), ...approval(PARIWAR_A, 'Patna', asha) });
    await activateFieldWorker(client, { ...staff(id, asha), ...approval(PARIWAR_A, 'Patna', asha) });
    await suspendFieldWorker(client, { ...staff(id, asha), authorization: actAuthorization('field_worker.suspend', PARIWAR_A, 'Patna', asha), reasonCode: 'under_review' });
    await postFieldWorker(client, { ...staff(id, asha), toDistrict: 'Gaya', expectedFromDistrict: 'Patna', authorization: moveAuthorization(PARIWAR_A, 'Gaya', asha), reasonCode: 'reassigned' });
    const today = await istToday(client);
    await terminateFieldWorker(client, { ...staff(id, asha), authorization: actAuthorization('field_worker.terminate', PARIWAR_A, 'Gaya', asha), reasonCode: 'died', endedOn: today });

    const page = await listFieldWorkerEvents(bindScopedDb(client), A, id);
    expect(page).not.toBeNull();
    expect(page!.nextAfter).toBeNull();
    expect(page!.items.map((e) => [e.eventVersion, e.eventType, e.permissionKey, e.targetDistrict, e.reasonCode, e.fromDistrict, e.toDistrict, e.endedOn])).toEqual([
      [1, 'field_worker.registered', 'field_worker.register', 'Patna', null, null, null, null],
      [2, 'field_worker.kyc_completed', 'field_worker.approve', 'Patna', null, null, null, null],
      [3, 'field_worker.activated', 'field_worker.approve', 'Patna', null, null, null, null],
      [4, 'field_worker.suspended', 'field_worker.suspend', 'Patna', 'under_review', null, null, null],
      [5, 'field_worker.posted', 'field_worker.move', 'Gaya', 'reassigned', 'Patna', 'Gaya', null],
      [6, 'field_worker.terminated', 'field_worker.terminate', 'Gaya', 'died', null, null, today],
    ]);
    for (const e of page!.items) {
      expect(e).toMatchObject({ actorUserId: asha, actorDisplayName: 'Asha Officer', role: 'pariwar_admin', grant: { dimension: 'pariwar', value: PARIWAR_A } });
      expect(e.occurredAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    }
    // No ciphertext, blind index or code of the worker in any field (the payloads hold none — 13.1 QE4).
    expect(JSON.stringify(page)).not.toMatch(/enc:v1|idx-/);
    // The CURRENT name: renamed after the acts, the log shows the new one (AD7's variance from 6.11 R5's snapshot).
    await client.query('RESET ROLE');
    await client.query("UPDATE users SET display_name = 'Asha Renamed' WHERE id = $1", [asha]);
    await enterAppScope(client, PARIWAR_A);
    expect((await listFieldWorkerEvents(bindScopedDb(client), A, id))!.items[0]!.actorDisplayName).toBe('Asha Renamed');
  });

  it('an officer with NO display name, a blank one, or no users row at all ⇒ null — never an email or a fallback (AC8 (d))', async () => {
    const { client } = getTx();
    const blank = await seedOfficer(client, '   ');
    const none = await seedOfficer(client, null);
    await enterAppScope(client, PARIWAR_A);
    const ghost = randomUUID(); // no users row
    const ids = [
      await registerReal(client, PARIWAR_A, { actorId: blank }),
      await registerReal(client, PARIWAR_A, { actorId: none }),
      await registerReal(client, PARIWAR_A, { actorId: ghost }),
    ];
    for (const [i, id] of ids.entries()) {
      const item = (await listFieldWorkerEvents(bindScopedDb(client), A, id))!.items[0]!;
      expect(item.actorUserId, String(i)).toBe([blank, none, ghost][i]);
      expect(item.actorDisplayName, String(i)).toBeNull();
    }
  });

  it('pages by event_version: `limit` + `afterVersion` walk the stream with no gap or repeat; the default is 50; an over-cap limit is CLAMPED to 100, never an error', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const actor = randomUUID();
    const id = await registerReal(client, PARIWAR_A, { actorId: actor });
    // 104 moves back and forth ⇒ 105 events.
    let at = 'Patna';
    for (let i = 0; i < 104; i += 1) {
      const to = at === 'Patna' ? 'Gaya' : 'Patna';
      await postFieldWorker(client, { ...staff(id, actor), toDistrict: to, expectedFromDistrict: at, authorization: moveAuthorization(PARIWAR_A, to, actor), reasonCode: 'reassigned' });
      at = to;
    }
    const db = bindScopedDb(client);
    const seen: number[] = [];
    let after: number | null = 0;
    while (after !== null) {
      const page: Awaited<ReturnType<typeof listFieldWorkerEvents>> = await listFieldWorkerEvents(db, A, id, { afterVersion: after, limit: 40 });
      seen.push(...page!.items.map((e) => e.eventVersion));
      after = page!.nextAfter;
    }
    expect(seen).toEqual(Array.from({ length: 105 }, (_v, i) => i + 1));
    const byDefault = (await listFieldWorkerEvents(db, A, id))!;
    expect(byDefault.items).toHaveLength(50);
    expect(byDefault.nextAfter).toBe(50);
    const clamped = (await listFieldWorkerEvents(db, A, id, { limit: 1000 }))!;
    expect(clamped.items).toHaveLength(LIST_FIELD_WORKER_EVENTS_MAX_LIMIT);
    expect(clamped.nextAfter).toBe(100);
    const tail = (await listFieldWorkerEvents(db, A, id, { afterVersion: 100, limit: 1000 }))!;
    expect(tail.items.map((e) => e.eventVersion)).toEqual([101, 102, 103, 104, 105]);
    expect(tail.nextAfter).toBeNull();
  });

  it('an unknown worker, or another Pariwar’s — even as the OWNER (RLS bypassed) — ⇒ null; a bad afterVersion or limit ⇒ RangeError before any statement', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_B);
    const inB = await registerReal(client, PARIWAR_B, { actorId: randomUUID() });
    await enterAppScope(client, PARIWAR_A);
    const db = bindScopedDb(client);
    expect(await listFieldWorkerEvents(db, A, toFieldWorkerId(randomUUID()))).toBeNull();
    expect(await listFieldWorkerEvents(db, A, inB)).toBeNull();
    await client.query('RESET ROLE'); // the owner — only the explicit pariwar_id predicate keeps A's read off B's stream
    expect(await listFieldWorkerEvents(bindScopedDb(client), A, inB)).toBeNull();
    // CONTROL — B's own read finds it.
    expect((await listFieldWorkerEvents(bindScopedDb(client), toPariwarId(PARIWAR_B), inB))!.items.map((e) => e.eventType)).toEqual(['field_worker.registered']);
    // The guards throw BEFORE any statement: a db that throws on first touch is never touched (review CR1 — `limit` joined `afterVersion`).
    const untouched = new Proxy({}, { get: () => { throw new Error('a statement was sent'); } }) as unknown as typeof db;
    for (const afterVersion of [-1, 1.5, Number.NaN, 2 ** 53]) {
      await expect(listFieldWorkerEvents(untouched, A, inB, { afterVersion }), String(afterVersion)).rejects.toBeInstanceOf(RangeError);
    }
    for (const limit of [1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      await expect(listFieldWorkerEvents(untouched, A, inB, { limit }), String(limit)).rejects.toBeInstanceOf(RangeError);
    }
    // CONTROL — an integer limit (even one over the cap) is clamped, never refused.
    expect((await listFieldWorkerEvents(bindScopedDb(client), toPariwarId(PARIWAR_B), inB, { limit: 1000 }))!.items).toHaveLength(1);
  });
});
