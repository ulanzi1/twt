// Story 13.1d — the move request's commands, supersede, notices and reads against the live DB (AC1–AC7; AD3, AD4, AD8, AD9; `-460`).
// Per-test ROLLBACK, as twt_app under a FRESH Pariwar's scope each test (RLS is live; recipients are read from that Pariwar's grants, so
// no other spec's committed grant can join them). Users and grants are seeded as the owner first. Every refusal: its typed error, and
// the CONTROL that the caller's transaction is still usable. The concurrent legs (two opens, the acceptance against a direct move in both
// lock orders) need committed rows on two connections — they are the API's race spec (Task 4), ⛔ here.

import { randomUUID } from 'node:crypto';

import type pg from 'pg';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  activateFieldWorker,
  postFieldWorker,
  recordFieldWorkerKycCompleted,
  suspendFieldWorker,
  terminateFieldWorker,
} from '../../../src/field-worker/commands.js';
import {
  FieldWorkerAuthorizationStaleError,
  FieldWorkerDistrictUnchangedError,
  FieldWorkerIllegalTransitionError,
  FieldWorkerMoveRequestNotOpenError,
  FieldWorkerMoveRequestNotOpenerError,
  FieldWorkerMoveRequestOpenError,
  FieldWorkerMoveRequestSameOfficerError,
  FieldWorkerProjectorInputError,
  FieldWorkerReasonInvalidError,
} from '../../../src/field-worker/errors.js';
import {
  acceptFieldWorkerMoveRequest,
  closeFieldWorkerMoveRequest,
  escalateStaleMoveRequest,
  openFieldWorkerMoveRequest,
  refuseFieldWorkerMoveRequest,
  withdrawFieldWorkerMoveRequest,
} from '../../../src/field-worker/move-request-commands.js';
import {
  decodeMoveRequestCursor,
  getFieldWorkerMoveRequest,
  getMoveRequestWorkerHistory,
  markFieldWorkerNoticesSeen,
  pageFieldWorkerMoveRequests,
  pageFieldWorkerNotices,
} from '../../../src/field-worker/move-request-read.js';
import {
  fieldWorkerMoveRequestId as toRequestId,
  pariwarId as toPariwarId,
  type FieldWorkerId,
  type FieldWorkerMoveRequestId,
  type FieldWorkerNoticeId,
  type PariwarId,
} from '../../../src/ids/index.js';
import { bindScopedDb } from '../../../src/db.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { enterAppScope, seedRoleGrant, seedUser } from '../_helpers.js';
import { actAuthorization, approval, caught, expectRowMatchesStream, grantAuthorization, registerReal, streamTypes } from './_fixtures.js';

/** The officers of one test's fresh Pariwar. */
interface Cast {
  P: PariwarId;
  daPatna: string;
  daGaya: string;
  daGaya2: string;
  pa: string;
}

async function seedCast(): Promise<Cast> {
  const { tx } = getTx();
  const P = toPariwarId(randomUUID());
  const daPatna = await seedRoleGrant(tx, P, { role: 'district_admin', scopeDimension: 'district', scopeValue: 'Patna' });
  const daGaya = await seedRoleGrant(tx, P, { role: 'district_admin', scopeDimension: 'district', scopeValue: 'Gaya' });
  const daGaya2 = await seedRoleGrant(tx, P, { role: 'district_admin', scopeDimension: 'district', scopeValue: 'Gaya' });
  const pa = await seedRoleGrant(tx, P, { role: 'pariwar_admin', scopeDimension: 'pariwar', scopeValue: P });
  return { P, daPatna, daGaya, daGaya2, pa };
}

const da = (district: string) => ({ role: 'district_admin' as const, district });
const PA = { role: 'pariwar_admin' as const };
const auth = (key: string, grant: Parameters<typeof grantAuthorization>[1], P: string, district: string, actorId: string) => {
  const a = grantAuthorization(key, grant, P, district, actorId);
  if (a === null) throw new Error(`the real check refused ${key} at ${district}`);
  return a;
};
const base = (P: PariwarId, actorId: string) => ({ pariwarId: P, auditId: randomUUID(), actor: 'operator' as const, actorId });

async function open(c: pg.PoolClient, cast: Cast, worker: FieldWorkerId, o: { by?: string; end?: 'from' | 'to'; to?: string } = {}) {
  const to = o.to ?? 'Gaya';
  const by = o.by ?? cast.daPatna;
  const end = o.end ?? 'from';
  const district = end === 'from' ? 'Patna' : to;
  const id = toRequestId(randomUUID());
  const r = await openFieldWorkerMoveRequest(c, {
    ...base(cast.P, by),
    moveRequestId: id,
    fieldWorkerId: worker,
    fromDistrict: 'Patna',
    toDistrict: to,
    authorization: auth('field_worker.request_move', da(district), cast.P, district, by),
  });
  return { id, r };
}

const answer = (cast: Cast, id: FieldWorkerMoveRequestId, by: string, district = 'Gaya') => ({
  ...base(cast.P, by),
  moveRequestId: id,
  authorization: auth('field_worker.answer_move_request', da(district), cast.P, district, by),
});

async function notices(c: pg.PoolClient, P: string): Promise<Array<{ recipient: string; kind: string; request: string | null; reason: string | null }>> {
  return (
    await c.query<{ recipient: string; kind: string; request: string | null; reason: string | null }>(
      `SELECT recipient_user_id AS recipient, kind, move_request_id AS request, refusal_reason AS reason
         FROM field_worker_notices WHERE pariwar_id = $1 ORDER BY created_at, notice_id`,
      [P],
    )
  ).rows;
}
async function requestRow(c: pg.PoolClient, id: string): Promise<Record<string, unknown>> {
  return (await c.query('SELECT * FROM field_worker_move_requests WHERE move_request_id = $1', [id])).rows[0] as Record<string, unknown>;
}
const sorted = (xs: string[]) => [...xs].sort();
/** Today in IST, from the DATABASE clock — an ending's last day is judged there ([[project_ist_vs_utc_test_date_window]]). */
async function istToday(c: pg.PoolClient): Promise<string> {
  return (await c.query<{ d: string }>("SELECT ((now() AT TIME ZONE 'Asia/Kolkata')::date)::text AS d")).rows[0]!.d;
}

describe.skipIf(!hasDatabase)('Story 13.1d — move requests (live DB)', () => {
  setupLiveDb();
  let cast: Cast;
  let c: pg.PoolClient;
  let worker: FieldWorkerId;

  beforeEach(async () => {
    cast = await seedCast();
    c = getTx().client;
    await enterAppScope(c, cast.P);
    worker = await registerReal(c, cast.P, { district: 'Patna' });
  });

  describe('AC1 — opening', () => {
    it('from the SOURCE: pending, counterpart Gaya, one `opened` event on its OWN stream, both Gaya District Admins told — the worker untouched', async () => {
      const { id, r } = await open(c, cast, worker);
      expect(r).toMatchObject({ state: 'pending', counterpartDistrict: 'Gaya' });
      expect(await requestRow(c, id)).toMatchObject({ state: 'pending', opened_at_end: 'from', counterpart_district: 'Gaya', opened_by: cast.daPatna });
      expect(await streamTypes(c, id)).toEqual(['field_worker_move_request.opened']);
      expect(await streamTypes(c, worker)).toEqual(['field_worker.registered']); // AC1 (e): the worker's stream unchanged
      const n = await notices(c, cast.P);
      expect(sorted(n.map((x) => x.recipient))).toEqual(sorted([cast.daGaya, cast.daGaya2]));
      expect(new Set(n.map((x) => x.kind))).toEqual(new Set(['move_request_opened']));
      await expectRowMatchesStream(c, worker);
    });

    it('(a) from the DESTINATION (13.1a C2): opened_at_end `to`, the counterpart is the source, its District Admin told', async () => {
      const { id } = await open(c, cast, worker, { by: cast.daGaya, end: 'to' });
      expect(await requestRow(c, id)).toMatchObject({ opened_at_end: 'to', counterpart_district: 'Patna' });
      expect((await notices(c, cast.P)).map((x) => [x.recipient, x.kind])).toEqual([[cast.daPatna, 'move_request_opened']]);
    });

    it('(c) refusals under the worker lock — terminated, a stale source, the same district, a target at neither end, the wrong key — and the tx stays usable', async () => {
      const req = (o: Partial<Parameters<typeof openFieldWorkerMoveRequest>[1]>) =>
        openFieldWorkerMoveRequest(c, {
          ...base(cast.P, cast.daPatna),
          moveRequestId: toRequestId(randomUUID()),
          fieldWorkerId: worker,
          fromDistrict: 'Patna',
          toDistrict: 'Gaya',
          authorization: auth('field_worker.request_move', da('Patna'), cast.P, 'Patna', cast.daPatna),
          ...o,
        });
      expect(await caught(() => req({ fromDistrict: 'Gaya', toDistrict: 'Nalanda', authorization: auth('field_worker.request_move', da('Gaya'), cast.P, 'Gaya', cast.daPatna) }))).toBeInstanceOf(
        FieldWorkerAuthorizationStaleError,
      );
      expect(await caught(() => req({ toDistrict: 'Patna' }))).toBeInstanceOf(FieldWorkerDistrictUnchangedError);
      expect(await caught(() => req({ toDistrict: 'Nalanda', authorization: auth('field_worker.request_move', da('Gaya'), cast.P, 'Gaya', cast.daPatna) }))).toBeInstanceOf(
        FieldWorkerAuthorizationStaleError,
      );
      expect(await caught(() => req({ authorization: auth('field_worker.answer_move_request', da('Patna'), cast.P, 'Patna', cast.daPatna) }))).toBeInstanceOf(
        FieldWorkerProjectorInputError,
      );
      expect((await c.query('SELECT count(*)::int AS n FROM field_worker_move_requests WHERE field_worker_id = $1', [worker])).rows[0]).toEqual({ n: 0 });
      // Terminated: ended first (by a Pariwar Admin), then the open is refused.
      await terminateFieldWorker(c, { ...base(cast.P, cast.pa), fieldWorkerId: worker, reasonCode: 'left_voluntarily', endedOn: await istToday(c), authorization: actAuthorization('field_worker.terminate', cast.P, 'Patna', cast.pa) });
      expect(await caught(() => req({}))).toBeInstanceOf(FieldWorkerIllegalTransitionError);
      expect((await c.query('SELECT 1 AS ok')).rows).toEqual([{ ok: 1 }]); // CONTROL — the transaction is usable
    });

    it('I4: a second OPEN request for the worker hits the partial unique BY NAME → FieldWorkerMoveRequestOpenError, and the tx stays usable', async () => {
      await open(c, cast, worker);
      expect(await caught(() => open(c, cast, worker, { by: cast.daGaya, end: 'to' }))).toBeInstanceOf(FieldWorkerMoveRequestOpenError);
      expect((await c.query('SELECT count(*)::int AS n FROM field_worker_move_requests WHERE field_worker_id = $1', [worker])).rows[0]).toEqual({ n: 1 });
    });

    it('AD8 (b): toward a district where NO OTHER District Admin works — escalated at once (system, cause no_counterpart_officer); only the Pariwar Admins told', async () => {
      const { id, r } = await open(c, cast, worker, { to: 'Nalanda' });
      expect(r.state).toBe('escalated');
      expect(await requestRow(c, id)).toMatchObject({ state: 'escalated', escalation_cause: 'no_counterpart_officer', answered_by: null });
      const events = (await c.query<{ event_type: string; actor_id: string | null }>('SELECT event_type, actor_id FROM events_log WHERE stream_id = $1 ORDER BY event_version', [id])).rows;
      expect(events).toEqual([
        { event_type: 'field_worker_move_request.opened', actor_id: cast.daPatna },
        { event_type: 'field_worker_move_request.escalated', actor_id: null },
      ]);
      expect((await notices(c, cast.P)).map((x) => [x.recipient, x.kind])).toEqual([[cast.pa, 'move_request_escalated']]);
    });

    it('AD8 (b): an opener who holds BOTH ends, with nobody else at the other end — escalated at once, ⛔ told of their own act', async () => {
      const { tx } = getTx();
      await c.query('RESET ROLE');
      await seedRoleGrant(tx, cast.P, { userId: cast.daPatna, role: 'district_admin', scopeDimension: 'district', scopeValue: 'Nalanda' });
      await enterAppScope(c, cast.P);
      const { r } = await open(c, cast, worker, { to: 'Nalanda' });
      expect(r.state).toBe('escalated');
      expect((await notices(c, cast.P)).map((x) => x.recipient)).toEqual([cast.pa]);
    });
  });

  describe('AC2 / AC3 — answering', () => {
    it('ACCEPT: the worker moves FIRST (posted under the answer key), then `accepted` names that event; the opener alone told; no supersede, no direct-move notice', async () => {
      const { id } = await open(c, cast, worker);
      const r = await acceptFieldWorkerMoveRequest(c, answer(cast, id, cast.daGaya));
      expect(r.state).toBe('accepted');
      const posted = (await c.query<{ event_id: string; payload: { authorization: { permission_key: string }; from_district: string; reason_code: string } }>(
        "SELECT event_id, payload FROM events_log WHERE stream_id = $1 AND event_type = 'field_worker.posted'",
        [worker],
      )).rows;
      expect(posted).toHaveLength(1);
      expect(posted[0]!.payload).toMatchObject({ authorization: { permission_key: 'field_worker.answer_move_request' }, from_district: 'Patna', reason_code: 'at_worker_request' });
      expect(r.postedEventId).toBe(posted[0]!.event_id);
      expect(await requestRow(c, id)).toMatchObject({ state: 'accepted', posted_event_id: posted[0]!.event_id, answered_by: cast.daGaya });
      expect((await c.query('SELECT district FROM field_workers WHERE field_worker_id = $1', [worker])).rows[0]).toEqual({ district: 'Gaya' });
      const told = (await notices(c, cast.P)).filter((x) => x.kind !== 'move_request_opened');
      expect(told.map((x) => [x.recipient, x.kind])).toEqual([[cast.daPatna, 'move_request_accepted']]);
      await expectRowMatchesStream(c, worker);
    });

    it('(b) the opener holding both ends cannot answer → SameOfficer; (d) an escalated request cannot be answered → NotOpen; the wrong end → stale', async () => {
      const { tx } = getTx();
      await c.query('RESET ROLE');
      await seedRoleGrant(tx, cast.P, { userId: cast.daPatna, role: 'district_admin', scopeDimension: 'district', scopeValue: 'Gaya' });
      await enterAppScope(c, cast.P);
      const { id } = await open(c, cast, worker);
      expect(await caught(() => acceptFieldWorkerMoveRequest(c, answer(cast, id, cast.daPatna)))).toBeInstanceOf(FieldWorkerMoveRequestSameOfficerError);
      expect(await caught(() => refuseFieldWorkerMoveRequest(c, { ...answer(cast, id, cast.daPatna), refusalReason: 'other' }))).toBeInstanceOf(FieldWorkerMoveRequestSameOfficerError);
      expect(await caught(() => acceptFieldWorkerMoveRequest(c, answer(cast, id, cast.daPatna, 'Patna')))).toBeInstanceOf(FieldWorkerMoveRequestSameOfficerError);
      expect(await caught(() => acceptFieldWorkerMoveRequest(c, { ...answer(cast, id, cast.daGaya), authorization: auth('field_worker.answer_move_request', da('Patna'), cast.P, 'Patna', cast.daGaya) }))).toBeInstanceOf(
        FieldWorkerAuthorizationStaleError,
      );
      const other = await registerReal(c, cast.P, { district: 'Patna' });
      const { id: esc } = await open(c, cast, other, { to: 'Nalanda' });
      expect(await caught(() => acceptFieldWorkerMoveRequest(c, answer(cast, esc, cast.daGaya, 'Nalanda')))).toBeInstanceOf(FieldWorkerMoveRequestNotOpenError);
      expect((await c.query('SELECT district FROM field_workers WHERE field_worker_id = $1', [worker])).rows[0]).toEqual({ district: 'Patna' });
    });

    it('REFUSE: a reason from the list; the worker stays; the opener AND the Pariwar Admin told (Q-2 A), never the actor; free text refused', async () => {
      const { id } = await open(c, cast, worker);
      expect(await caught(() => refuseFieldWorkerMoveRequest(c, { ...answer(cast, id, cast.daGaya), refusalReason: 'we are full' }))).toBeInstanceOf(FieldWorkerReasonInvalidError);
      await refuseFieldWorkerMoveRequest(c, { ...answer(cast, id, cast.daGaya), refusalReason: 'no_capacity' });
      expect(await requestRow(c, id)).toMatchObject({ state: 'refused', refusal_reason: 'no_capacity', answered_by: cast.daGaya });
      const told = (await notices(c, cast.P)).filter((x) => x.kind === 'move_request_refused');
      expect(sorted(told.map((x) => x.recipient))).toEqual(sorted([cast.daPatna, cast.pa]));
      expect(new Set(told.map((x) => x.reason))).toEqual(new Set(['no_capacity']));
      expect((await c.query('SELECT district FROM field_workers WHERE field_worker_id = $1', [worker])).rows[0]).toEqual({ district: 'Patna' });
      expect(await caught(() => acceptFieldWorkerMoveRequest(c, answer(cast, id, cast.daGaya2)))).toBeInstanceOf(FieldWorkerMoveRequestNotOpenError);
    });
  });

  describe('AC4 / AC5 — withdraw, escalate, close', () => {
    it('WITHDRAW by the opener (pending, and escalated keeping its cause); another officer → NotOpener; a final one → NotOpen; nobody told', async () => {
      const withdraw = (id: FieldWorkerMoveRequestId, by: string) =>
        withdrawFieldWorkerMoveRequest(c, { ...base(cast.P, by), moveRequestId: id, authorization: auth('field_worker.request_move', da('Patna'), cast.P, 'Patna', by) });
      const { id } = await open(c, cast, worker);
      const { tx } = getTx();
      await c.query('RESET ROLE');
      const daPatna2 = await seedRoleGrant(tx, cast.P, { role: 'district_admin', scopeDimension: 'district', scopeValue: 'Patna' });
      await enterAppScope(c, cast.P);
      expect(await caught(() => withdraw(id, daPatna2))).toBeInstanceOf(FieldWorkerMoveRequestNotOpenerError);
      const before = (await notices(c, cast.P)).length;
      await withdraw(id, cast.daPatna);
      expect(await requestRow(c, id)).toMatchObject({ state: 'withdrawn', answered_by: cast.daPatna });
      expect(await caught(() => withdraw(id, cast.daPatna))).toBeInstanceOf(FieldWorkerMoveRequestNotOpenError);
      expect((await notices(c, cast.P)).length).toBe(before);
      const { id: esc } = await open(c, cast, worker, { to: 'Nalanda' });
      await withdraw(esc, cast.daPatna);
      expect(await requestRow(c, esc)).toMatchObject({ state: 'withdrawn', escalation_cause: 'no_counterpart_officer' });
    });

    it('the SWEEP: 7 days + 1 minute old → escalated (system), the Pariwar Admin and the opener told; a second tick nothing; 6 days 23 h → nothing', async () => {
      const { id } = await open(c, cast, worker);
      const other = await registerReal(c, cast.P, { district: 'Patna' });
      const { id: young } = await open(c, cast, other);
      // Backdate `opened_at` — an IMMUTABLE column (0205 (b)): in this test's own transaction only, with replica mode for this session.
      await c.query('RESET ROLE');
      await c.query("SET LOCAL session_replication_role = 'replica'");
      await c.query("UPDATE field_worker_move_requests SET opened_at = now() - interval '7 days 1 minute' WHERE move_request_id = $1", [id]);
      await c.query("UPDATE field_worker_move_requests SET opened_at = now() - interval '6 days 23 hours' WHERE move_request_id = $1", [young]);
      await c.query("SET LOCAL session_replication_role = 'origin'");
      await enterAppScope(c, cast.P);
      const r = await escalateStaleMoveRequest(c, { pariwarId: cast.P, moveRequestId: id, auditId: randomUUID() });
      expect(r?.state).toBe('escalated');
      expect(await requestRow(c, id)).toMatchObject({ state: 'escalated', escalation_cause: 'unanswered_7_days', answered_by: null });
      const esc = (await notices(c, cast.P)).filter((x) => x.kind === 'move_request_escalated');
      expect(sorted(esc.map((x) => x.recipient))).toEqual(sorted([cast.pa, cast.daPatna]));
      expect(await escalateStaleMoveRequest(c, { pariwarId: cast.P, moveRequestId: id, auditId: randomUUID() })).toBeNull();
      expect(await escalateStaleMoveRequest(c, { pariwarId: cast.P, moveRequestId: young, auditId: randomUUID() })).toBeNull();
      expect(await requestRow(c, young)).toMatchObject({ state: 'pending' });
      expect((await c.query('SELECT district FROM field_workers WHERE field_worker_id = $1', [worker])).rows[0]).toEqual({ district: 'Patna' }); // never accepts
    });

    it('CLOSE: a Pariwar Admin closes an escalated request; a pending one → NotOpen; a District Admin does not hold the key', async () => {
      const { id: pending } = await open(c, cast, worker);
      const close = (id: FieldWorkerMoveRequestId) =>
        closeFieldWorkerMoveRequest(c, { ...base(cast.P, cast.pa), moveRequestId: id, authorization: auth('field_worker.settle_move_request', PA, cast.P, 'Patna', cast.pa) });
      expect(await caught(() => close(pending))).toBeInstanceOf(FieldWorkerMoveRequestNotOpenError);
      expect(grantAuthorization('field_worker.settle_move_request', da('Patna'), cast.P, 'Patna', cast.daPatna)).toBeNull();
      const other = await registerReal(c, cast.P, { district: 'Patna' });
      const { id: esc } = await open(c, cast, other, { to: 'Nalanda' });
      await close(esc);
      expect(await requestRow(c, esc)).toMatchObject({ state: 'closed', escalation_cause: 'no_counterpart_officer', answered_by: cast.pa });
    });
  });

  describe('AC6 — superseding (13.1c C1)', () => {
    const directMove = (to: string) =>
      postFieldWorker(c, { ...base(cast.P, cast.pa), fieldWorkerId: worker, toDistrict: to, expectedFromDistrict: 'Patna', reasonCode: 'reassigned', authorization: actAuthorization('field_worker.move', cast.P, to, cast.pa) });

    it('a DIRECT move supersedes the open request (worker_moved) and tells BOTH districts once each, naming the request; ⛔ move_request_superseded; a later accept → NotOpen', async () => {
      const { id } = await open(c, cast, worker);
      await c.query('SELECT 1');
      await directMove('Gaya');
      expect(await requestRow(c, id)).toMatchObject({ state: 'superseded', supersede_cause: 'worker_moved', answered_by: cast.pa });
      const moved = (await notices(c, cast.P)).filter((x) => x.kind !== 'move_request_opened');
      expect(moved.every((x) => x.kind === 'moved_by_pariwar_admin' && x.request === id)).toBe(true);
      expect(sorted(moved.map((x) => x.recipient))).toEqual(sorted([cast.daPatna, cast.daGaya, cast.daGaya2]));
      expect(await caught(() => acceptFieldWorkerMoveRequest(c, answer(cast, id, cast.daGaya)))).toBeInstanceOf(FieldWorkerMoveRequestNotOpenError);
    });

    it('a direct move with NO request open still tells both districts (no request named); a suspension supersedes nothing', async () => {
      const { id } = await open(c, cast, worker);
      await recordFieldWorkerKycCompleted(c, { ...base(cast.P, cast.pa), fieldWorkerId: worker, ...approval(cast.P, 'Patna', cast.pa) });
      await activateFieldWorker(c, { ...base(cast.P, cast.pa), fieldWorkerId: worker, ...approval(cast.P, 'Patna', cast.pa) });
      await suspendFieldWorker(c, { ...base(cast.P, cast.pa), fieldWorkerId: worker, reasonCode: 'under_review', authorization: actAuthorization('field_worker.suspend', cast.P, 'Patna', cast.pa) });
      expect(await requestRow(c, id)).toMatchObject({ state: 'pending' });
      const lone = await registerReal(c, cast.P, { district: 'Patna' });
      await postFieldWorker(c, { ...base(cast.P, cast.pa), fieldWorkerId: lone, toDistrict: 'Gaya', expectedFromDistrict: 'Patna', reasonCode: 'reassigned', authorization: actAuthorization('field_worker.move', cast.P, 'Gaya', cast.pa) });
      const lonely = (await c.query<{ request: string | null; n: number }>(
        "SELECT move_request_id AS request, count(*)::int AS n FROM field_worker_notices WHERE field_worker_id = $1 GROUP BY 1",
        [lone],
      )).rows;
      expect(lonely).toEqual([{ request: null, n: 3 }]);
    });

    it('an ENDING supersedes it (worker_ended) and tells the opener and the counterpart’s District Admins (move_request_superseded)', async () => {
      const { id } = await open(c, cast, worker);
      await terminateFieldWorker(c, { ...base(cast.P, cast.pa), fieldWorkerId: worker, reasonCode: 'inactive', endedOn: await istToday(c), authorization: actAuthorization('field_worker.terminate', cast.P, 'Patna', cast.pa) });
      expect(await requestRow(c, id)).toMatchObject({ state: 'superseded', supersede_cause: 'worker_ended' });
      const sup = (await notices(c, cast.P)).filter((x) => x.kind === 'move_request_superseded');
      expect(sorted(sup.map((x) => x.recipient))).toEqual(sorted([cast.daPatna, cast.daGaya, cast.daGaya2]));
    });

    it('an escalated request superseded keeps its escalation cause; a ROLLED-BACK move leaves the request pending and tells nobody', async () => {
      const { id } = await open(c, cast, worker);
      const before = (await notices(c, cast.P)).length;
      await c.query('SAVEPOINT rb');
      await directMove('Gaya');
      await c.query('ROLLBACK TO SAVEPOINT rb');
      expect(await requestRow(c, id)).toMatchObject({ state: 'pending' });
      expect((await notices(c, cast.P)).length).toBe(before);
      const other = await registerReal(c, cast.P, { district: 'Patna' });
      const { id: esc } = await open(c, cast, other, { to: 'Nalanda' });
      await terminateFieldWorker(c, { ...base(cast.P, cast.pa), fieldWorkerId: other, reasonCode: 'inactive', endedOn: await istToday(c), authorization: actAuthorization('field_worker.terminate', cast.P, 'Patna', cast.pa) });
      expect(await requestRow(c, esc)).toMatchObject({ state: 'superseded', escalation_cause: 'no_counterpart_officer', supersede_cause: 'worker_ended' });
    });
  });

  describe('AD9 — recipients', () => {
    it('the ACTOR is never told of their own act — a Pariwar Admin who also holds a Gaya District Admin grant moves a worker directly', async () => {
      const { tx } = getTx();
      await c.query('RESET ROLE');
      await seedRoleGrant(tx, cast.P, { userId: cast.pa, role: 'district_admin', scopeDimension: 'district', scopeValue: 'Gaya' });
      await enterAppScope(c, cast.P);
      await postFieldWorker(c, { ...base(cast.P, cast.pa), fieldWorkerId: worker, toDistrict: 'Gaya', expectedFromDistrict: 'Patna', reasonCode: 'reassigned', authorization: actAuthorization('field_worker.move', cast.P, 'Gaya', cast.pa) });
      expect(sorted((await notices(c, cast.P)).map((x) => x.recipient))).toEqual(sorted([cast.daPatna, cast.daGaya, cast.daGaya2]));
    });

    it('ONE notice per recipient per act — an opener who is also a Pariwar Admin, refused, is told once', async () => {
      const { tx } = getTx();
      await c.query('RESET ROLE');
      await seedRoleGrant(tx, cast.P, { userId: cast.daPatna, role: 'pariwar_admin', scopeDimension: 'pariwar', scopeValue: cast.P });
      await enterAppScope(c, cast.P);
      const { id } = await open(c, cast, worker);
      await refuseFieldWorkerMoveRequest(c, { ...answer(cast, id, cast.daGaya), refusalReason: 'request_incomplete' });
      const refused = (await notices(c, cast.P)).filter((x) => x.kind === 'move_request_refused');
      expect(sorted(refused.map((x) => x.recipient))).toEqual(sorted([cast.daPatna, cast.pa]));
    });

    it('TR9: a District Admin holding only a pariwar-dimension grant, and a SUSPENDED user, are not told; no recipient ⇒ no row', async () => {
      const { tx } = getTx();
      await c.query('RESET ROLE');
      await seedRoleGrant(tx, cast.P, { role: 'district_admin', scopeDimension: 'pariwar', scopeValue: cast.P });
      const suspended = await seedUser(tx, randomUUID(), { status: 'suspended' });
      await seedRoleGrant(tx, cast.P, { userId: suspended, role: 'district_admin', scopeDimension: 'district', scopeValue: 'Gaya' });
      await enterAppScope(c, cast.P);
      await open(c, cast, worker);
      expect(sorted((await notices(c, cast.P)).map((x) => x.recipient))).toEqual(sorted([cast.daGaya, cast.daGaya2]));
    });
  });

  describe('AC7 — the reads', () => {
    it('the list: either end, open / closed, keyset; the Pariwar-wide page; the opener’s current name; one request with its events in order', async () => {
      const db = bindScopedDb(c);
      const { id: a } = await open(c, cast, worker);
      const w2 = await registerReal(c, cast.P, { district: 'Gaya' });
      const b = toRequestId(randomUUID());
      await openFieldWorkerMoveRequest(c, {
        ...base(cast.P, cast.daGaya),
        moveRequestId: b,
        fieldWorkerId: w2,
        fromDistrict: 'Gaya',
        toDistrict: 'Patna',
        authorization: auth('field_worker.request_move', da('Gaya'), cast.P, 'Gaya', cast.daGaya),
      });
      const patna = await pageFieldWorkerMoveRequests(db, cast.P, { district: 'Patna', state: 'open' });
      expect(sorted(patna.items.map((x) => x.moveRequestId))).toEqual(sorted([a, b]));
      expect(patna.items[0]!.nameCiphertext).toBe('enc:v1:name');
      const first = await pageFieldWorkerMoveRequests(db, cast.P, { state: 'open', limit: 1 });
      expect(first.items).toHaveLength(1);
      const second = await pageFieldWorkerMoveRequests(db, cast.P, { state: 'open', limit: 1, after: decodeMoveRequestCursor(first.nextCursor) });
      expect(sorted([first.items[0]!.moveRequestId, second.items[0]!.moveRequestId])).toEqual(sorted([a, b]));
      expect((await pageFieldWorkerMoveRequests(db, cast.P, { district: 'Patna', state: 'closed' })).items).toEqual([]);
      expect((await pageFieldWorkerMoveRequests(db, cast.P, { district: 'Nalanda', state: 'open' })).items).toEqual([]);
      await refuseFieldWorkerMoveRequest(c, { ...answer(cast, a, cast.daGaya), refusalReason: 'other' });
      const detail = await getFieldWorkerMoveRequest(db, cast.P, a);
      expect(detail!.request).toMatchObject({ state: 'refused', refusalReason: 'other', openedBy: cast.daPatna });
      expect(detail!.events.map((e) => [e.eventVersion, e.eventType, e.refusalReason])).toEqual([
        [1, 'field_worker_move_request.opened', null],
        [2, 'field_worker_move_request.refused', 'other'],
      ]);
      expect(await getFieldWorkerMoveRequest(db, cast.P, toRequestId(randomUUID()))).toBeNull();
    });

    it('`-460`: the worker’s history — registered, active since, the districts with dates, the suspensions’ dates — and ⛔ any reason or officer in it', async () => {
      const db = bindScopedDb(c);
      await postFieldWorker(c, { ...base(cast.P, cast.pa), fieldWorkerId: worker, toDistrict: 'Gaya', expectedFromDistrict: 'Patna', reasonCode: 'reassigned', authorization: actAuthorization('field_worker.move', cast.P, 'Gaya', cast.pa) });
      await postFieldWorker(c, { ...base(cast.P, cast.pa), fieldWorkerId: worker, toDistrict: 'Patna', expectedFromDistrict: 'Gaya', reasonCode: 'reassigned', authorization: actAuthorization('field_worker.move', cast.P, 'Patna', cast.pa) });
      const { id } = await open(c, cast, worker);
      const h = await getMoveRequestWorkerHistory(db, cast.P, id);
      expect(h).toMatchObject({ fieldWorkerId: worker, currentState: 'pending_kyc', activeSince: null, suspensions: [], truncated: false });
      expect(h!.districts.map((d) => d.district)).toEqual(['Patna', 'Gaya', 'Patna']);
      expect(h!.districts.at(-1)!.to).toBeNull();
      expect(h!.registeredOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      const text = JSON.stringify(h);
      for (const banned of ['reassigned', 'at_worker_request', 'under_review', 'Asha Verma', cast.pa, 'enc:v1:mobile']) expect(text, banned).not.toContain(banned);
      expect(await getMoveRequestWorkerHistory(db, cast.P, toRequestId(randomUUID()))).toBeNull();
    });

    it('the notices: only the officer’s own, newest first; `seen` marks only the officer’s own unseen rows, once — another officer’s ids are ignored', async () => {
      const db = bindScopedDb(c);
      await open(c, cast, worker);
      const mine = await pageFieldWorkerNotices(db, cast.P, cast.daGaya);
      const theirs = await pageFieldWorkerNotices(db, cast.P, cast.daGaya2);
      expect(mine.items).toHaveLength(1);
      expect(theirs.items).toHaveLength(1);
      expect(mine.items[0]).toMatchObject({ kind: 'move_request_opened', seenAt: null, fromDistrict: 'Patna', toDistrict: 'Gaya' });
      const ids = [mine.items[0]!.noticeId, theirs.items[0]!.noticeId] as FieldWorkerNoticeId[];
      expect(await markFieldWorkerNoticesSeen(db, cast.P, cast.daGaya, ids)).toBe(1);
      expect(await markFieldWorkerNoticesSeen(db, cast.P, cast.daGaya, ids)).toBe(0); // once
      expect((await pageFieldWorkerNotices(db, cast.P, cast.daGaya2)).items[0]!.seenAt).toBeNull();
      expect((await pageFieldWorkerNotices(db, cast.P, cast.daGaya)).items[0]!.seenAt).not.toBeNull();
      expect((await pageFieldWorkerNotices(db, cast.P, cast.pa)).items).toEqual([]);
    });
  });
});
