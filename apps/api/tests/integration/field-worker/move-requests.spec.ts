// Story 13.1d — the move request and the notices through HTTP (AC1–AC4, AC6, AC7; AD5, AD6, AD9, AD10; `-460`). Live DB,
// OWN-COMMITTING: a fresh Pariwar per test, assertions by our own ids, cleanup under replica mode (the harness). The races (AC1 (d),
// AC2 (e)) are `move-request-race.spec.ts`. A refusal on the PRE-READ writes NO audit line (I7) — asserted by the request's / worker's
// own lines, counted BEFORE the send, with the control that a committed act writes exactly one.

import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { getCollectedRoutes } from '../../../src/route-registry.js';
import { hasDatabase } from '../_setup.js';
import { createHarness, errOf, json, type Client, type Harness, type Json } from './_registration-harness.js';

const NAME = 'Moverequest Distinctive-Surname';
const MOBILE_DIGITS = '9876503456';

describe.skipIf(!hasDatabase)('Story 13.1d — move requests and notices through HTTP', { timeout: 120_000 }, () => {
  let h: Harness;
  beforeAll(async () => {
    h = await createHarness();
  });
  afterAll(async () => {
    await h.cleanup();
  });

  const q = <T>(sql: string, params: unknown[]) => h.td.pool.query(sql, params).then((r) => r.rows as T[]);
  const requestRow = (id: string) => q<Json>('SELECT * FROM field_worker_move_requests WHERE move_request_id = $1', [id]).then((r) => r[0]!);
  const noticesOf = (p: string) =>
    q<{ recipient: string; kind: string; request: string | null }>(
      'SELECT recipient_user_id AS recipient, kind, move_request_id AS request FROM field_worker_notices WHERE pariwar_id = $1 ORDER BY created_at',
      [p],
    );
  const linesOf = (p: string, locatorPrefix: string) =>
    q<{ action: string; actor_id: string; resource_locator: string }>(
      `SELECT action, actor_id, resource_locator FROM audit_log_entries WHERE pariwar_id = $1 AND resource_locator LIKE $2 ORDER BY seq`,
      [p, `${locatorPrefix}%`],
    );
  const districtOf = (id: string) => q<{ district: string }>('SELECT district FROM field_workers WHERE field_worker_id = $1', [id]).then((r) => r[0]!.district);
  const sorted = (xs: string[]) => [...xs].sort();

  /** A Pariwar (Patna, Gaya, Nalanda listed), a Pariwar Admin, District Admins of Patna and Gaya (two), and one approved worker in Patna. */
  async function setup() {
    const p = h.freshPariwar();
    await h.listDistrict(p, 'Patna', 'Gaya', 'Nalanda');
    const pa = await h.actor(p, 'pariwar_admin', 'pariwar', p, 'Meera Pariwar-Admin');
    const daP = await h.actor(p, 'district_admin', 'district', 'Patna', 'Ravi Patna');
    const daG = await h.actor(p, 'district_admin', 'district', 'Gaya', 'Sita Gaya');
    const daG2 = await h.actor(p, 'district_admin', 'district', 'Gaya', 'Gopal Gaya');
    const worker = await h.registered(pa.client, p, { name: NAME, mobile: `+91${MOBILE_DIGITS}`, district: 'Patna' });
    expect((await h.approve(pa.client, p, worker)).statusCode).toBe(200);
    return { p, pa, daP, daG, daG2, worker };
  }
  async function opened(c: Client, p: string, worker: string, body: Json = { from_district: 'Patna', to_district: 'Gaya' }): Promise<string> {
    const r = await h.openRequest(c, p, worker, body);
    expect(r.statusCode, r.body).toBe(201);
    return json(r)['move_request_id'] as string;
  }

  describe('AC1 — opening', () => {
    it('from the source: 201 pending, one `opened` event, ONE audit line, both Gaya District Admins told — ⛔ a name, mobile or code in the body', async () => {
      const s = await setup();
      const r = await h.openRequest(s.daP.client, s.p, s.worker, { from_district: 'Patna', to_district: 'Gaya' });
      expect(r.statusCode, r.body).toBe(201);
      const body = json(r);
      expect(body).toMatchObject({ field_worker_id: s.worker, state: 'pending', from_district: 'Patna', to_district: 'Gaya', counterpart_district: 'Gaya', worker_district: 'Patna' });
      for (const secret of [NAME, MOBILE_DIGITS]) expect(r.body).not.toContain(secret);
      const id = body['move_request_id'] as string;
      expect(await linesOf(s.p, `field_worker_move_request/${id}`)).toEqual([
        { action: 'field_worker_move_request.opened', actor_id: s.daP.userId, resource_locator: `field_worker_move_request/${id}` },
      ]);
      expect(sorted((await noticesOf(s.p)).map((n) => n.recipient))).toEqual(sorted([s.daG.userId, s.daG2.userId]));
      expect(await districtOf(s.worker)).toBe('Patna');
    });

    it('(a) from the DESTINATION only (13.1a C2): opened_at_end `to`, counterpart Patna; (b) an officer of neither end and a Pariwar Admin: 403', async () => {
      const s = await setup();
      const id = await opened(s.daG.client, s.p, s.worker);
      expect(await requestRow(id)).toMatchObject({ opened_at_end: 'to', counterpart_district: 'Patna', opened_by: s.daG.userId });
      const daN = await h.actor(s.p, 'district_admin', 'district', 'Nalanda');
      const w2 = await h.registered(s.pa.client, s.p, { name: NAME, mobile: '+919876503457', district: 'Patna' });
      for (const c of [daN.client, s.pa.client]) {
        const r = await h.openRequest(c, s.p, w2, { from_district: 'Patna', to_district: 'Gaya' });
        expect(r.statusCode, r.body).toBe(403);
      }
    });

    it('(c) pre-read refusals — a stale source, the same district, an open request already — each with NO audit line', async () => {
      const s = await setup();
      const before = (await linesOf(s.p, 'field_worker_move_request/')).length;
      const requestEvents = () => q<{ n: number }>("SELECT count(*)::int AS n FROM events_log WHERE pariwar_id = $1 AND event_type LIKE 'field_worker_move_request.%'", [s.p]).then((r) => r[0]!.n);
      const stale = await h.openRequest(s.daG.client, s.p, s.worker, { from_district: 'Gaya', to_district: 'Patna' });
      expect([stale.statusCode, errOf(stale).code]).toEqual([409, 'field_worker.authorization_stale']);
      const same = await h.openRequest(s.daP.client, s.p, s.worker, { from_district: 'Patna', to_district: 'Patna' });
      expect([same.statusCode, errOf(same).code]).toEqual([409, 'field_worker.district_unchanged']);
      expect((await linesOf(s.p, 'field_worker_move_request/')).length).toBe(before);
      expect(await requestEvents()).toBe(0); // AC1 (c) — NO event either
      await opened(s.daP.client, s.p, s.worker);
      const again = await h.openRequest(s.daG.client, s.p, s.worker, { from_district: 'Patna', to_district: 'Gaya' });
      expect([again.statusCode, errOf(again).code]).toEqual([409, 'field_worker.move_request_open']);
      expect((await linesOf(s.p, 'field_worker_move_request/')).length).toBe(before + 1); // CONTROL — the one committed open
      expect(await requestEvents()).toBe(1);
    });

    it('a terminated worker → 409 illegal_transition; an unlisted destination → 422 district_unknown (the opener holds the source) — each with NO audit line', async () => {
      const s = await setup();
      const before = (await linesOf(s.p, 'field_worker_move_request/')).length;
      const unlisted = await h.openRequest(s.daP.client, s.p, s.worker, { from_district: 'Patna', to_district: 'Darbhanga' });
      expect([unlisted.statusCode, errOf(unlisted).code]).toEqual([422, 'field_worker.district_unknown']);
      const today = (await q<{ d: string }>("SELECT (now() AT TIME ZONE 'Asia/Kolkata')::date::text AS d", []))[0]!.d;
      expect((await h.terminate(s.pa.client, s.p, s.worker, { reason_code: 'inactive', ended_on: today })).statusCode).toBe(200);
      const r = await h.openRequest(s.daP.client, s.p, s.worker, { from_district: 'Patna', to_district: 'Gaya' });
      expect([r.statusCode, errOf(r).code]).toEqual([409, 'field_worker.illegal_transition']);
      expect((await linesOf(s.p, 'field_worker_move_request/')).length).toBe(before); // I7 — neither pre-read refusal wrote a line
    });

    // CR24 — the TENANT boundary never says whether a worker exists in ANOTHER Pariwar (the per-worker routes' rule): an unknown id and another
    // Pariwar's worker are the same 403. ⚠ Within the Pariwar the answers differ - (c) above: an existing worker with a stale `from_district` is
    // 409 `authorization_stale`, for an officer who holds the district they name (RP-19: this leg does not claim otherwise).
    it('an unknown worker id and another Pariwar’s worker: 403 for the officer who holds the named district, no audit line, with a CONTROL that the same officer opens for their own worker', async () => {
      const s = await setup();
      const other = await setup(); // another Pariwar, with its own approved worker in Patna
      const before = (await linesOf(s.p, 'field_worker_move_request/')).length;
      for (const worker of [randomUUID(), other.worker]) {
        const r = await h.openRequest(s.daP.client, s.p, worker, { from_district: 'Patna', to_district: 'Gaya' });
        expect(r.statusCode, `${worker}: ${r.body}`).toBe(403);
      }
      expect((await linesOf(s.p, 'field_worker_move_request/')).length).toBe(before);
      expect((await h.openRequest(s.daP.client, s.p, s.worker, { from_district: 'Patna', to_district: 'Gaya' })).statusCode).toBe(201);
    });

    // CR26 — the per-request gate's `opened_at_end === 'to'` branches, through the routes: the opener's end is the DESTINATION, the counterpart the SOURCE.
    it('a request opened from the DESTINATION: its opener withdraws (200); opened again, a Gaya officer who is not the counterpart is 403 and the SOURCE end’s District Admin accepts — the worker lands in Gaya', async () => {
      const s = await setup();
      const first = await opened(s.daG.client, s.p, s.worker); // opened_at_end 'to': Gaya asks for a Patna worker
      expect((await h.requestAct(s.daG.client, s.p, first, 'withdraw')).statusCode).toBe(200);
      const id = await opened(s.daG.client, s.p, s.worker);
      expect(await requestRow(id)).toMatchObject({ opened_at_end: 'to', counterpart_district: 'Patna' });
      expect((await h.requestAct(s.daG2.client, s.p, id, 'accept')).statusCode).toBe(403);
      const r = await h.requestAct(s.daP.client, s.p, id, 'accept');
      expect(r.statusCode, r.body).toBe(200);
      expect(json(r)).toMatchObject({ state: 'accepted', worker_district: 'Gaya' });
      expect(await districtOf(s.worker)).toBe('Gaya');
    });

    it('AD8 (b): toward a district with no other District Admin — 201 `escalated`, the Pariwar Admin told', async () => {
      const s = await setup();
      const r = await h.openRequest(s.daP.client, s.p, s.worker, { from_district: 'Patna', to_district: 'Nalanda' });
      expect([r.statusCode, json(r)['state']]).toEqual([201, 'escalated']);
      expect((await noticesOf(s.p)).map((n) => [n.recipient, n.kind])).toEqual([[s.pa.userId, 'move_request_escalated']]);
    });

    it('idempotency: a replayed key returns the first 201 and opens nothing new; ⛔ a key without the header', async () => {
      const s = await setup();
      const key = randomUUID();
      const a = await h.openRequest(s.daP.client, s.p, s.worker, { from_district: 'Patna', to_district: 'Gaya' }, key);
      const b = await h.openRequest(s.daP.client, s.p, s.worker, { from_district: 'Patna', to_district: 'Gaya' }, key);
      expect([a.statusCode, b.statusCode]).toEqual([201, 201]);
      expect(json(b)['move_request_id']).toBe(json(a)['move_request_id']);
      // "opens nothing new": one request, one event, one audit line (the replay wrote none)
      expect((await q<{ n: number }>('SELECT count(*)::int AS n FROM field_worker_move_requests WHERE field_worker_id = $1', [s.worker]))[0]!.n).toBe(1);
      expect((await q<{ n: number }>("SELECT count(*)::int AS n FROM events_log WHERE pariwar_id = $1 AND event_type LIKE 'field_worker_move_request.%'", [s.p]))[0]!.n).toBe(1);
      expect((await linesOf(s.p, 'field_worker_move_request/')).length).toBe(1);
      const none = await h.openRequest(s.daP.client, s.p, s.worker, { from_district: 'Patna', to_district: 'Gaya' }, null);
      expect([none.statusCode, errOf(none).code]).toEqual([400, 'field_worker.idempotency_key_required']);
    });
  });

  describe('AC2 / AC3 / AC4 / AC5 — answering, withdrawing, closing', () => {
    it('ACCEPT by the counterpart: the worker moves, ONE audit line covers the answer AND the move, the opener told; worker_district Gaya', async () => {
      const s = await setup();
      const id = await opened(s.daP.client, s.p, s.worker);
      const r = await h.requestAct(s.daG.client, s.p, id, 'accept');
      expect(r.statusCode, r.body).toBe(200);
      expect(json(r)).toMatchObject({ state: 'accepted', worker_district: 'Gaya' });
      expect(await districtOf(s.worker)).toBe('Gaya');
      const accepted = await linesOf(s.p, `field_worker_move_request/${id}`);
      expect(accepted.map((l) => l.action)).toEqual(['field_worker_move_request.opened', 'field_worker_move_request.accepted']);
      const auditId = (await q<{ audit_id: string }>('SELECT audit_id FROM field_workers WHERE field_worker_id = $1', [s.worker]))[0]!.audit_id;
      expect((await requestRow(id))['audit_id']).toBe(auditId); // the move's row and the request's share the acceptance's line
      expect((await noticesOf(s.p)).filter((n) => n.kind === 'move_request_accepted').map((n) => n.recipient)).toEqual([s.daP.userId]);
    });

    // CR23 — QE17: a request waits up to 7 days; the acceptance moves the worker, so the destination is judged against the list NOW.
    it('ACCEPT meets a destination that is no longer LISTED: 422 district_unknown, no audit line, the worker stays and the request stays pending; re-listed, the same accept is 200', async () => {
      const s = await setup();
      const id = await opened(s.daP.client, s.p, s.worker);
      const before = (await linesOf(s.p, `field_worker_move_request/${id}`)).length;
      await q("UPDATE workplace_districts SET status = 'retired' WHERE pariwar_id = $1 AND district = 'Gaya'", [s.p]);
      const r = await h.requestAct(s.daG.client, s.p, id, 'accept');
      expect([r.statusCode, errOf(r).code]).toEqual([422, 'field_worker.district_unknown']);
      expect(await districtOf(s.worker)).toBe('Patna');
      expect(await requestRow(id)).toMatchObject({ state: 'pending' });
      expect((await linesOf(s.p, `field_worker_move_request/${id}`)).length).toBe(before); // a pre-read refusal: no line
      await q("UPDATE workplace_districts SET status = 'listed' WHERE pariwar_id = $1 AND district = 'Gaya'", [s.p]); // CONTROL
      expect((await h.requestAct(s.daG.client, s.p, id, 'accept')).statusCode).toBe(200);
      expect(await districtOf(s.worker)).toBe('Gaya');
    });

    it('a District Admin of the opener’s end only → 403; the opener holding both ends → 409 same_officer; a second answer → 409 not_open', async () => {
      const s = await setup();
      const id = await opened(s.daP.client, s.p, s.worker);
      expect((await h.requestAct(s.daP.client, s.p, id, 'accept')).statusCode).toBe(403);
      await h.addGrant(s.daP.userId, s.p, 'district_admin', 'district', 'Gaya');
      const same = await h.requestAct(s.daP.client, s.p, id, 'accept');
      expect([same.statusCode, errOf(same).code]).toEqual([409, 'field_worker.move_request_same_officer']);
      expect((await h.requestAct(s.daG.client, s.p, id, 'refuse', { reason_code: 'no_capacity' })).statusCode).toBe(200);
      const late = await h.requestAct(s.daG2.client, s.p, id, 'accept');
      expect([late.statusCode, errOf(late).code]).toEqual([409, 'field_worker.move_request_not_open']);
      expect(await districtOf(s.worker)).toBe('Patna');
    });

    it('REFUSE: free text → 400; a listed reason → 200, the opener and the Pariwar Admin told', async () => {
      const s = await setup();
      const id = await opened(s.daP.client, s.p, s.worker);
      expect((await h.requestAct(s.daG.client, s.p, id, 'refuse', { reason_code: 'we are full' })).statusCode).toBe(400);
      expect((await h.requestAct(s.daG.client, s.p, id, 'refuse', { reason_code: 'other', note: 'x' })).statusCode).toBe(400);
      expect((await h.requestAct(s.daG.client, s.p, id, 'refuse', { reason_code: 'work_not_needed_here' })).statusCode).toBe(200);
      expect(await requestRow(id)).toMatchObject({ state: 'refused', refusal_reason: 'work_not_needed_here' });
      const refusals = await noticesOf(s.p);
      expect(sorted(refusals.filter((n) => n.kind === 'move_request_refused').map((n) => n.recipient))).toEqual([s.daP.userId]); // the opener: "Tell the worker."
      expect(sorted(refusals.filter((n) => n.kind === 'move_request_refused_admin').map((n) => n.recipient))).toEqual([s.pa.userId]); // the Pariwar Admin: its own kind (CR41 A)
    });

    it('WITHDRAW: another officer of the same end → 409 not_opener (no audit line); the opener → 200; again → 409 not_open', async () => {
      const s = await setup();
      const id = await opened(s.daP.client, s.p, s.worker);
      const daP2 = await h.actor(s.p, 'district_admin', 'district', 'Patna');
      const before = (await linesOf(s.p, `field_worker_move_request/${id}`)).length;
      const other = await h.requestAct(daP2.client, s.p, id, 'withdraw');
      expect([other.statusCode, errOf(other).code]).toEqual([409, 'field_worker.move_request_not_opener']);
      expect((await linesOf(s.p, `field_worker_move_request/${id}`)).length).toBe(before);
      expect((await h.requestAct(s.daP.client, s.p, id, 'withdraw')).statusCode).toBe(200);
      const again = await h.requestAct(s.daP.client, s.p, id, 'withdraw');
      expect([again.statusCode, errOf(again).code]).toEqual([409, 'field_worker.move_request_not_open']);
    });

    it('CLOSE: a Pariwar Admin closes an escalated request; a pending one → 409; a District Admin → 403', async () => {
      const s = await setup();
      const pending = await opened(s.daP.client, s.p, s.worker);
      expect((await h.requestAct(s.pa.client, s.p, pending, 'close')).statusCode).toBe(409);
      expect((await h.requestAct(s.daP.client, s.p, pending, 'withdraw')).statusCode).toBe(200);
      const esc = await opened(s.daP.client, s.p, s.worker, { from_district: 'Patna', to_district: 'Nalanda' });
      expect((await h.requestAct(s.daP.client, s.p, esc, 'close')).statusCode).toBe(403);
      expect((await h.requestAct(s.pa.client, s.p, esc, 'close')).statusCode).toBe(200);
      expect(await requestRow(esc)).toMatchObject({ state: 'closed', escalation_cause: 'no_counterpart_officer' });
    });

    // CR25 — family 3: the loaders and the gate read the request under THIS request's Pariwar; the domain half is CR11's.
    it('another Pariwar’s officers, given this Pariwar’s request id: 403 on every act and on the detail, an empty list, nothing changed; its own Pariwar answers it', async () => {
      const s = await setup();
      const other = await setup();
      const id = await opened(s.daP.client, s.p, s.worker);
      const before = (await linesOf(s.p, `field_worker_move_request/${id}`)).length;
      expect((await h.requestAct(other.daG.client, other.p, id, 'accept')).statusCode).toBe(403);
      expect((await h.requestAct(other.daG.client, other.p, id, 'refuse', { reason_code: 'other' })).statusCode).toBe(403);
      expect((await h.requestAct(other.daP.client, other.p, id, 'withdraw')).statusCode).toBe(403);
      expect((await h.requestAct(other.pa.client, other.p, id, 'close')).statusCode).toBe(403);
      expect((await h.request(other.pa.client, other.p, id)).statusCode).toBe(403);
      expect((json(await h.requests(other.pa.client, other.p, { state: 'open' })) as { items: unknown[] }).items).toEqual([]);
      expect(await requestRow(id)).toMatchObject({ state: 'pending' });
      expect((await linesOf(s.p, `field_worker_move_request/${id}`)).length).toBe(before);
      expect((await h.requestAct(s.daG.client, s.p, id, 'refuse', { reason_code: 'other' })).statusCode).toBe(200); // CONTROL
    });

    it('an unknown request id → 403 for everyone, a Pariwar Admin included (no oracle)', async () => {
      const s = await setup();
      for (const c of [s.pa.client, s.daG.client]) expect((await h.requestAct(c, s.p, randomUUID(), 'accept')).statusCode).toBe(403);
      expect((await h.request(s.pa.client, s.p, randomUUID())).statusCode).toBe(403);
    });
  });

  describe('AC6 — superseding through 13.1c’s routes', () => {
    it('a Pariwar Admin’s direct move supersedes the open request and tells both districts once each; a later accept → 409 not_open', async () => {
      const s = await setup();
      const id = await opened(s.daP.client, s.p, s.worker);
      expect((await h.move(s.pa.client, s.p, s.worker, { from_district: 'Patna', to_district: 'Gaya', reason_code: 'reassigned' })).statusCode).toBe(200);
      expect(await requestRow(id)).toMatchObject({ state: 'superseded', supersede_cause: 'worker_moved' });
      const moved = (await noticesOf(s.p)).filter((n) => n.kind === 'moved_by_pariwar_admin');
      expect(sorted(moved.map((n) => n.recipient))).toEqual(sorted([s.daP.userId, s.daG.userId, s.daG2.userId]));
      expect(new Set(moved.map((n) => n.request))).toEqual(new Set([id]));
      const late = await h.requestAct(s.daG.client, s.p, id, 'accept');
      expect([late.statusCode, errOf(late).code]).toEqual([409, 'field_worker.move_request_not_open']);
    });

    it('`-461` (CR22 A): a superseded request’s detail has NO time and NO cause on its `superseded` event whatever the cause, and its item carries no cause or answered_at', async () => {
      for (const how of ['move', 'end'] as const) {
        const s = await setup();
        const id = await opened(s.daP.client, s.p, s.worker);
        if (how === 'move') {
          expect((await h.move(s.pa.client, s.p, s.worker, { from_district: 'Patna', to_district: 'Gaya', reason_code: 'reassigned' })).statusCode).toBe(200);
        } else {
          const today = (await q<{ d: string }>("SELECT (now() AT TIME ZONE 'Asia/Kolkata')::date::text AS d", []))[0]!.d;
          expect((await h.terminate(s.pa.client, s.p, s.worker, { reason_code: 'inactive', ended_on: today })).statusCode).toBe(200);
        }
        const r = await h.request(s.pa.client, s.p, id);
        expect(r.statusCode, `${how}: ${r.body}`).toBe(200);
        const d = json(r) as { request: Json; events: Json[] };
        const sup = d.events.find((e) => e['event_type'] === 'field_worker_move_request.superseded')!;
        expect(sup, how).toMatchObject({ occurred_at: null });
        expect(d.events.find((e) => e['event_type'] === 'field_worker_move_request.opened')!['occurred_at'], how).toEqual(expect.any(String)); // CONTROL
        for (const banned of ['cause', 'supersede_cause', 'escalation_cause', 'answered_at']) {
          expect(Object.keys(sup), `${how} ${banned}`).not.toContain(banned);
          expect(Object.keys(d.request), `${how} ${banned}`).not.toContain(banned);
        }
        expect(JSON.stringify(d), how).not.toMatch(/worker_ended|worker_moved/);
      }
    });

    it('an ending BY THE OPENER supersedes it and tells the other end — the actor is never told of their own act', async () => {
      const s = await setup();
      const id = await opened(s.daP.client, s.p, s.worker);
      const today = (await q<{ d: string }>("SELECT (now() AT TIME ZONE 'Asia/Kolkata')::date::text AS d", []))[0]!.d;
      expect((await h.terminate(s.daP.client, s.p, s.worker, { reason_code: 'left_voluntarily', ended_on: today })).statusCode).toBe(200);
      expect(await requestRow(id)).toMatchObject({ state: 'superseded', supersede_cause: 'worker_ended' });
      expect(sorted((await noticesOf(s.p)).filter((n) => n.kind === 'move_request_superseded').map((n) => n.recipient))).toEqual(sorted([s.daG.userId, s.daG2.userId]));
    });

    it('an ending BY A PARIWAR ADMIN supersedes it and tells the opener AND the other end', async () => {
      const s = await setup();
      const id = await opened(s.daP.client, s.p, s.worker);
      const today = (await q<{ d: string }>("SELECT (now() AT TIME ZONE 'Asia/Kolkata')::date::text AS d", []))[0]!.d;
      expect((await h.terminate(s.pa.client, s.p, s.worker, { reason_code: 'left_voluntarily', ended_on: today })).statusCode).toBe(200);
      expect(await requestRow(id)).toMatchObject({ state: 'superseded', supersede_cause: 'worker_ended' });
      expect(sorted((await noticesOf(s.p)).filter((n) => n.kind === 'move_request_superseded').map((n) => n.recipient))).toEqual(
        sorted([s.daP.userId, s.daG.userId, s.daG2.userId]),
      );
    });

    // Decision `2026-11-10-462` (R4-13): the notices API sends no time for a "no longer needed" notice - for an ending it is when the
    // ending was recorded, sent to the other end's officers.
    it('`-462`: GET notices carries NO created_at on an ending’s move_request_superseded; the request’s opened notice keeps its time', async () => {
      const s = await setup();
      const id = await opened(s.daP.client, s.p, s.worker);
      const today = (await q<{ d: string }>("SELECT (now() AT TIME ZONE 'Asia/Kolkata')::date::text AS d", []))[0]!.d;
      expect((await h.terminate(s.pa.client, s.p, s.worker, { reason_code: 'inactive', ended_on: today })).statusCode).toBe(200);
      const items = (json(await h.notices(s.daG.client, s.p)) as { items: Json[] }).items.filter((n) => n['move_request_id'] === id);
      expect(items).toHaveLength(2); // one of each - a double notice would hide behind the map below (R5-7)
      const at = Object.fromEntries(items.map((n) => [n['kind'] as string, n['created_at']]));
      expect(Object.keys(at).sort()).toEqual(['move_request_opened', 'move_request_superseded']);
      expect(at['move_request_superseded']).toBeNull();
      expect(at['move_request_opened']).toEqual(expect.any(String)); // CONTROL
    });
  });

  describe('AC7 — the reads', () => {
    it('the list: the NAME decrypted behind ONE audit line naming the page’s workers; either end; 403 for a district the reader does not hold', async () => {
      const s = await setup();
      const id = await opened(s.daP.client, s.p, s.worker);
      const before = (await linesOf(s.p, 'field_workers/')).filter((l) => l.action === 'field_worker.move_requests_viewed').length;
      const r = await h.requests(s.daG.client, s.p, { state: 'open', district: 'Gaya' });
      expect(r.statusCode, r.body).toBe(200);
      const page = json(r) as { items: Json[]; next_cursor: string | null };
      expect(page.items.map((i) => [i['move_request_id'], i['name'], i['opened_by_display']])).toEqual([[id, NAME, 'Ravi Patna']]);
      expect(r.body).not.toContain(MOBILE_DIGITS);
      expect(r.headers['cache-control']).toBe('no-store');
      const lines = (await linesOf(s.p, 'field_workers/')).filter((l) => l.action === 'field_worker.move_requests_viewed');
      expect(lines.length).toBe(before + 1);
      expect(lines.at(-1)).toMatchObject({ actor_id: s.daG.userId, resource_locator: `field_workers/${s.worker}` });
      expect((await h.requests(s.daG.client, s.p, { state: 'open', district: 'Patna' })).statusCode).toBe(403);
      expect((await h.requests(s.daG.client, s.p, { state: 'open' })).statusCode).toBe(403); // the whole Pariwar: a Pariwar grant only
      expect((await h.requests(s.pa.client, s.p, { state: 'open' })).statusCode).toBe(200);
      // An over-cap `limit` is ACCEPTED (not a 400) — the clamp itself is proved by the contracts' parse test and the domain's 26-request walk (CR28 (b)).
      expect((json(await h.requests(s.daG.client, s.p, { state: 'open', district: 'Gaya', limit: '1000' })) as { items: unknown[] }).items).toHaveLength(1);
    });

    it('an EMPTY page: 200, no items, no cursor — and its one audit line names no worker (the locator is `field_workers/`)', async () => {
      const s = await setup();
      const viewed = async () => (await linesOf(s.p, 'field_workers/')).filter((l) => l.action === 'field_worker.move_requests_viewed');
      const before = (await viewed()).length;
      const r = await h.requests(s.pa.client, s.p, { state: 'closed' });
      expect(r.statusCode, r.body).toBe(200);
      expect(json(r)).toEqual({ items: [], next_cursor: null });
      const lines = await viewed();
      expect(lines.length).toBe(before + 1);
      expect(lines.at(-1)).toMatchObject({ actor_id: s.pa.userId, resource_locator: 'field_workers/' });
    });

    it('`-460`: the detail — the request, its events, and the worker’s name and work history behind ONE `move_request_worker_viewed` line; ⛔ a reason, an officer, the mobile', async () => {
      const s = await setup();
      expect((await h.suspend(s.pa.client, s.p, s.worker, { reason_code: 'under_review' })).statusCode).toBe(200);
      expect((await h.reactivate(s.pa.client, s.p, s.worker)).statusCode).toBe(200);
      const id = await opened(s.daP.client, s.p, s.worker);
      const r = await h.request(s.daG.client, s.p, id);
      expect(r.statusCode, r.body).toBe(200);
      const d = json(r) as { request: Json; events: Json[]; worker: Json };
      expect(d.request).toMatchObject({ move_request_id: id, name: NAME, state: 'pending' });
      expect(d.events.map((e) => e['event_type'])).toEqual(['field_worker_move_request.opened']);
      expect(d.worker).toMatchObject({ field_worker_id: s.worker, name: NAME, current_state: 'active', members_onboarded: null, history_truncated: false });
      expect((d.worker['districts'] as Json[]).map((x) => x['district'])).toEqual(['Patna']);
      expect(d.worker['suspensions'] as Json[]).toHaveLength(1);
      for (const banned of ['under_review', MOBILE_DIGITS, 'Meera Pariwar-Admin', 'reason']) expect(JSON.stringify(d.worker), banned).not.toContain(banned);
      // AC7 (b) — no code anywhere in the body (the worker is active: they HAVE one).
      const code = (await q<{ code: string }>('SELECT code FROM field_worker_attribution_codes WHERE field_worker_id = $1', [s.worker]))[0]!.code;
      expect(r.body).not.toContain(code);
      expect(r.body).not.toContain(MOBILE_DIGITS);
      const viewed = (await linesOf(s.p, `field_worker_move_request/${id}/field_worker/`)).map((l) => [l.action, l.actor_id]);
      expect(viewed).toEqual([['field_worker.move_request_worker_viewed', s.daG.userId]]);
      const daN = await h.actor(s.p, 'district_admin', 'district', 'Nalanda');
      expect((await h.request(daN.client, s.p, id)).statusCode).toBe(403);
    });

    it('the notices: only the officer’s own; `seen` marks only the officer’s own — another officer’s id is ignored; no key needed', async () => {
      const s = await setup();
      await opened(s.daP.client, s.p, s.worker);
      const mine = json(await h.notices(s.daG.client, s.p)) as { items: Json[] };
      const theirs = json(await h.notices(s.daG2.client, s.p)) as { items: Json[] };
      expect([mine.items.length, theirs.items.length]).toEqual([1, 1]);
      expect(mine.items[0]).toMatchObject({ kind: 'move_request_opened', seen_at: null });
      expect(JSON.stringify(mine)).not.toContain(NAME);
      const ids = [mine.items[0]!['notice_id'] as string, theirs.items[0]!['notice_id'] as string];
      expect((await h.seen(s.daG.client, s.p, ids)).statusCode).toBe(204);
      expect(((json(await h.notices(s.daG.client, s.p)) as { items: Json[] }).items[0]!['seen_at'])).not.toBeNull();
      expect(((json(await h.notices(s.daG2.client, s.p)) as { items: Json[] }).items[0]!['seen_at'])).toBeNull();
      expect(((json(await h.notices(s.pa.client, s.p)) as { items: Json[] }).items)).toEqual([]);
    });
  });

  describe('AC7 (d) — the route table', () => {
    it('the three GETs declare the module’s ONE shared `read` rate limit (per session); the writes and the seen mark declare none', () => {
      const routes = getCollectedRoutes(h.app);
      expect(routes.length).toBeGreaterThan(0);
      const base = '/api/v1/p/:pariwarId/field-workers';
      const cfg = (method: string, url: string) => {
        const r = routes.find((x) => x.method === method && x.url === url);
        expect(r, `route not found: ${method} ${url}`).toBeDefined();
        return (r!.config as { rateLimit?: { max?: unknown; keyGenerator?: unknown } } | undefined)?.rateLimit;
      };
      const list = cfg('GET', base);
      for (const url of [`${base}/move-requests`, `${base}/move-requests/:moveRequestId`, `${base}/notices`]) expect(cfg('GET', url), url).toBe(list);
      expect(list!.max).toBe(h.deps.config.readRateMax);
      for (const act of ['accept', 'refuse', 'withdraw', 'close']) expect(cfg('POST', `${base}/move-requests/:moveRequestId/${act}`), act).toBeUndefined();
      expect(cfg('POST', `${base}/:fieldWorkerId/move-requests`)).toBeUndefined();
      expect(cfg('POST', `${base}/notices/seen`)).toBeUndefined();
    });
  });
});
