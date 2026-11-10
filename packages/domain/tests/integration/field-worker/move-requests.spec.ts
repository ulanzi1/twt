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
  reactivateFieldWorker,
  recordFieldWorkerKycCompleted,
  suspendFieldWorker,
  terminateFieldWorker,
} from '../../../src/field-worker/commands.js';
import {
  FieldWorkerAuthorizationStaleError,
  FieldWorkerDistrictUnchangedError,
  FieldWorkerIllegalTransitionError,
  FieldWorkerMoveRequestMissingError,
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
  getMoveRequestGateRow,
  getMoveRequestWorkerHistory,
  markFieldWorkerNoticesSeen,
  MOVE_REQUEST_HISTORY_EVENT_CAP,
  PAGE_MOVE_REQUESTS_MAX_LIMIT,
  PAGE_NOTICES_MAX_LIMIT,
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
/** One raw notice INSERT — the identity columns `twt_app` is granted (0205). */
const NOTICE_INSERT = `INSERT INTO field_worker_notices
  (pariwar_id, recipient_user_id, kind, field_worker_id, move_request_id, from_district, to_district)
  VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING notice_id`;
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

    // The mirror of the test above (code review CR9): the request is opened at the DESTINATION, so its counterpart is the SOURCE — the
    // worker's CURRENT district, which `postFieldWorker`'s target check admits as the locked row's district (either end of the move).
    it('ACCEPT of a request opened at the DESTINATION: the source end\'s District Admin answers, the worker lands at the destination, the opener alone is told', async () => {
      const { id } = await open(c, cast, worker, { by: cast.daGaya, end: 'to' });
      const r = await acceptFieldWorkerMoveRequest(c, answer(cast, id, cast.daPatna, 'Patna'));
      expect(r.state).toBe('accepted');
      expect(await requestRow(c, id)).toMatchObject({ state: 'accepted', opened_at_end: 'to', counterpart_district: 'Patna', answered_by: cast.daPatna });
      expect((await c.query('SELECT district FROM field_workers WHERE field_worker_id = $1', [worker])).rows[0]).toEqual({ district: 'Gaya' });
      const told = (await notices(c, cast.P)).filter((x) => x.kind !== 'move_request_opened');
      expect(told.map((x) => [x.recipient, x.kind])).toEqual([[cast.daGaya, 'move_request_accepted']]);
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
      // CR41 A (decision `2026-11-10-461` item 2): the opener's kind carries the "Tell the worker." reminder; the Pariwar Admins have their own kind.
      const all = await notices(c, cast.P);
      const told = all.filter((x) => x.kind === 'move_request_refused');
      const admins = all.filter((x) => x.kind === 'move_request_refused_admin');
      expect(told.map((x) => x.recipient)).toEqual([cast.daPatna]);
      expect(admins.map((x) => x.recipient)).toEqual([cast.pa]);
      expect(new Set([...told, ...admins].map((x) => x.reason))).toEqual(new Set(['no_capacity'])); // both carry the reason
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
      await directMove('Gaya');
      expect(await requestRow(c, id)).toMatchObject({ state: 'superseded', supersede_cause: 'worker_moved', answered_by: cast.pa });
      const moved = (await notices(c, cast.P)).filter((x) => x.kind !== 'move_request_opened');
      expect(moved.every((x) => x.kind === 'moved_by_pariwar_admin' && x.request === id)).toBe(true);
      expect(sorted(moved.map((x) => x.recipient))).toEqual(sorted([cast.daPatna, cast.daGaya, cast.daGaya2]));
      expect(await caught(() => acceptFieldWorkerMoveRequest(c, answer(cast, id, cast.daGaya)))).toBeInstanceOf(FieldWorkerMoveRequestNotOpenError);
    });

    // CR22 A (decision `2026-11-10-461` item 1) — the withholding is ONE rule at the source: every `superseded` event is undated, whatever its cause.
    it('CR22 A: the detail’s `superseded` event has NO time whatever the cause (a move or an ending), the other events keep theirs, and no read hands on a cause', async () => {
      const db = bindScopedDb(c);
      for (const how of ['move', 'end'] as const) {
        const w = await registerReal(c, cast.P, { district: 'Patna' });
        const { id } = await open(c, cast, w);
        if (how === 'move') {
          await postFieldWorker(c, { ...base(cast.P, cast.pa), fieldWorkerId: w, toDistrict: 'Nalanda', expectedFromDistrict: 'Patna', reasonCode: 'reassigned', authorization: actAuthorization('field_worker.move', cast.P, 'Nalanda', cast.pa) });
        } else {
          await terminateFieldWorker(c, { ...base(cast.P, cast.pa), fieldWorkerId: w, reasonCode: 'inactive', endedOn: await istToday(c), authorization: actAuthorization('field_worker.terminate', cast.P, 'Patna', cast.pa) });
        }
        const detail = await getFieldWorkerMoveRequest(db, cast.P, id);
        const at = Object.fromEntries(detail!.events.map((e) => [e.eventType, e.occurredAt]));
        expect(at['field_worker_move_request.superseded'], how).toBeNull();
        expect(typeof at['field_worker_move_request.opened'], how).toBe('string'); // CONTROL: an event that is not undated keeps its time
        expect(Object.keys(detail!.events[0]!), how).not.toContain('cause');
        for (const banned of ['supersedeCause', 'escalationCause', 'answeredAt']) expect(Object.keys(detail!.request), `${how} ${banned}`).not.toContain(banned);
        expect(await requestRow(c, id), how).toMatchObject({ state: 'superseded' }); // the table still records it: the read does not hand it on
      }
    });

    // Decision `2026-11-10-462` (R4-13) — the NOTICE read too: a "no longer needed" notice carries no time, whatever its cause.
    it('`-462`: the notices read hands on NO time for move_request_superseded whatever the cause (a move to a third district, an ending); the request’s other notice keeps its time', async () => {
      const db = bindScopedDb(c);
      for (const how of ['move', 'end'] as const) {
        const w = await registerReal(c, cast.P, { district: 'Patna' });
        const { id } = await open(c, cast, w); // Patna -> Gaya: Gaya's officers are told it opened
        if (how === 'move') {
          await postFieldWorker(c, { ...base(cast.P, cast.pa), fieldWorkerId: w, toDistrict: 'Nalanda', expectedFromDistrict: 'Patna', reasonCode: 'reassigned', authorization: actAuthorization('field_worker.move', cast.P, 'Nalanda', cast.pa) });
        } else {
          await terminateFieldWorker(c, { ...base(cast.P, cast.pa), fieldWorkerId: w, reasonCode: 'inactive', endedOn: await istToday(c), authorization: actAuthorization('field_worker.terminate', cast.P, 'Patna', cast.pa) });
        }
        const mine = (await pageFieldWorkerNotices(db, cast.P, cast.daGaya)).items.filter((n) => n.moveRequestId === id);
        expect(mine, how).toHaveLength(2); // one of each - a double notice would hide behind the map below (R5-7)
        const at = Object.fromEntries(mine.map((n) => [n.kind, n.createdAt]));
        expect(Object.keys(at).sort(), how).toEqual(['move_request_opened', 'move_request_superseded']);
        expect(at['move_request_superseded'], how).toBeNull();
        expect(typeof at['move_request_opened'], how).toBe('string'); // CONTROL: another kind keeps its time
      }
    });

    // B2 (decision `2026-11-10-461` item 3; amends `-458` AD9) — the move's two districts are not always the request's two: the request's
    // OTHER district was told it was opened and, before this, was then told nothing.
    it('B2: request Patna→Gaya, the worker moved Patna→Nalanda: Gaya’s District Admins are told it is no longer needed (the REQUEST’s districts), Patna’s that a worker was moved; nobody twice', async () => {
      const { id } = await open(c, cast, worker); // Patna -> Gaya
      await directMove('Nalanda');
      expect(await requestRow(c, id)).toMatchObject({ state: 'superseded', supersede_cause: 'worker_moved' });
      const after = (await notices(c, cast.P)).filter((x) => x.kind !== 'move_request_opened');
      const sup = after.filter((x) => x.kind === 'move_request_superseded');
      expect(sorted(sup.map((x) => x.recipient))).toEqual(sorted([cast.daGaya, cast.daGaya2]));
      expect(sup.every((x) => x.request === id)).toBe(true);
      const facts = (await c.query<{ f: string; t: string }>("SELECT DISTINCT from_district AS f, to_district AS t FROM field_worker_notices WHERE pariwar_id = $1 AND kind = 'move_request_superseded'", [cast.P])).rows;
      expect(facts).toEqual([{ f: 'Patna', t: 'Gaya' }]); // the REQUEST's own districts, ⛔ the move's
      const moved = after.filter((x) => x.kind === 'moved_by_pariwar_admin');
      expect(moved.map((x) => x.recipient)).toEqual([cast.daPatna]); // nobody holds Nalanda; the actor is excluded
      expect(sorted(after.map((x) => x.recipient))).toEqual(sorted([...new Set(after.map((x) => x.recipient))])); // nobody twice for the act
    });

    it('B2: a District Admin who holds BOTH the request’s other district and the move’s destination is told ONCE (the move’s notice), not twice — the writer’s rule, not the unique index’s', async () => {
      const { tx } = getTx();
      await seedRoleGrant(tx, cast.P, { userId: cast.daGaya, role: 'district_admin', scopeDimension: 'district', scopeValue: 'Nalanda' });
      const { id } = await open(c, cast, worker); // Patna -> Gaya
      await directMove('Nalanda');
      const after = (await notices(c, cast.P)).filter((x) => x.kind !== 'move_request_opened');
      expect(after.filter((x) => x.recipient === cast.daGaya).map((x) => x.kind)).toEqual(['moved_by_pariwar_admin']);
      expect(after.filter((x) => x.recipient === cast.daGaya2).map((x) => x.kind)).toEqual(['move_request_superseded']); // CONTROL: the other Gaya officer is still told
      expect(after.every((x) => x.request === id)).toBe(true);
    });

    // R4-8: what this leg can and cannot prove. With the move covering both of the request's districts, every officer of those districts is
    // told by the MOVE's notice and skipped by `alreadyTold`, so `afterDirectMove`'s district filter is redundant with it - removing the
    // filter writes nothing either way, and no leg can see it. This proves the outcome: each officer told ONCE, by the move's notice.
    it('B2: a move covering BOTH of the request’s districts tells each of their officers once, by the move’s notice (no `move_request_superseded`); a request’s other district nobody holds gets no row', async () => {
      await open(c, cast, worker, { to: 'Nalanda' }); // nobody holds Nalanda
      await directMove('Gaya'); // the request's other district (Nalanda) is not the move's: its admins are nobody
      expect((await notices(c, cast.P)).filter((x) => x.kind === 'move_request_superseded')).toEqual([]);
      const other = await registerReal(c, cast.P, { district: 'Patna' });
      const { id: both } = await open(c, cast, other); // Patna -> Gaya
      await postFieldWorker(c, { ...base(cast.P, cast.pa), fieldWorkerId: other, toDistrict: 'Gaya', expectedFromDistrict: 'Patna', reasonCode: 'reassigned', authorization: actAuthorization('field_worker.move', cast.P, 'Gaya', cast.pa) });
      const bothRows = (await notices(c, cast.P)).filter((x) => x.request === both && x.kind !== 'move_request_opened');
      expect(sorted(bothRows.map((x) => x.recipient))).toEqual(sorted([cast.daPatna, cast.daGaya, cast.daGaya2])); // non-empty, each ONCE
      expect(bothRows.every((x) => x.kind === 'moved_by_pariwar_admin')).toBe(true); // both of the request's districts were the move's
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

    it('an escalated request superseded by an ENDING keeps its escalation cause', async () => {
      const other = await registerReal(c, cast.P, { district: 'Patna' });
      const { id: esc } = await open(c, cast, other, { to: 'Nalanda' });
      await terminateFieldWorker(c, { ...base(cast.P, cast.pa), fieldWorkerId: other, reasonCode: 'inactive', endedOn: await istToday(c), authorization: actAuthorization('field_worker.terminate', cast.P, 'Patna', cast.pa) });
      expect(await requestRow(c, esc)).toMatchObject({ state: 'superseded', escalation_cause: 'no_counterpart_officer', supersede_cause: 'worker_ended' });
    });

    // CR16 — AD3: "a Pariwar Admin settles by moving the worker directly (which supersedes it, cause `worker_moved`)": the main way an ESCALATED request ends.
    it('a Pariwar Admin’s direct move supersedes an ESCALATED request (worker_moved), keeps its escalation cause, and tells the district — never the Pariwar Admin who moved', async () => {
      const { id } = await open(c, cast, worker, { to: 'Nalanda' }); // nobody holds Nalanda: escalated at once
      expect(await requestRow(c, id)).toMatchObject({ state: 'escalated', escalation_cause: 'no_counterpart_officer' });
      await directMove('Nalanda');
      expect(await requestRow(c, id)).toMatchObject({ state: 'superseded', supersede_cause: 'worker_moved', escalation_cause: 'no_counterpart_officer', answered_by: cast.pa });
      const moved = (await notices(c, cast.P)).filter((x) => x.kind === 'moved_by_pariwar_admin');
      expect(moved.map((x) => [x.recipient, x.request])).toEqual([[cast.daPatna, id]]); // Patna's District Admin; nobody holds Nalanda; the actor is excluded
      expect((await c.query('SELECT district FROM field_workers WHERE field_worker_id = $1', [worker])).rows[0]).toEqual({ district: 'Nalanda' });
    });

    // CR14 — the leg that stood here moved, rolled back and asserted `pending`: Postgres guarantees that whatever the code did (the
    // assertion-after-savepoint-rollback trap). The contract is `commands.ts`'s header: "a failure there fails the CALLER's transaction whole
    // (⛔ a swallowed error)" — so a failure is FORCED, and the move must REJECT.
    it('a move whose supersede FAILS fails whole: a notice planted where the move must write one makes it REJECT (23505, the once-per-act unique) and nothing of it survives; the same move succeeds once the plant is gone', async () => {
      const { id } = await open(c, cast, worker);
      const before = (await notices(c, cast.P)).length;
      // The plant: the notice the move writes to a Gaya District Admin, already there. It is the move's NOTICE write that fails — after the
      // worker's `posted` event, the request's supersede and the other recipients' notices were written.
      const plant = (await c.query<{ notice_id: string }>(NOTICE_INSERT, [cast.P, cast.daGaya, 'moved_by_pariwar_admin', worker, id, 'Patna', 'Gaya'])).rows[0]!.notice_id;
      await c.query('SAVEPOINT failing_move');
      const failure = await caught(() => directMove('Gaya')); // a move that SWALLOWED the failure would resolve, and `caught` would throw
      await c.query('ROLLBACK TO SAVEPOINT failing_move');
      expect(failure).toMatchObject({ code: '23505', constraint: 'field_worker_notices_once_per_act_uq' });
      expect(await requestRow(c, id)).toMatchObject({ state: 'pending' });
      expect((await c.query('SELECT district FROM field_workers WHERE field_worker_id = $1', [worker])).rows[0]).toEqual({ district: 'Patna' });
      expect(await streamTypes(c, worker)).toEqual(['field_worker.registered']);
      expect((await notices(c, cast.P)).length).toBe(before + 1); // the plant only
      // CONTROL — the same move with the plant gone supersedes and tells all three.
      await c.query('RESET ROLE');
      await c.query('DELETE FROM field_worker_notices WHERE notice_id = $1', [plant]);
      await enterAppScope(c, cast.P);
      await directMove('Gaya');
      expect(await requestRow(c, id)).toMatchObject({ state: 'superseded', supersede_cause: 'worker_moved' });
      expect((await notices(c, cast.P)).length).toBe(before + 3);
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
      const refused = (await notices(c, cast.P)).filter((x) => x.kind === 'move_request_refused' || x.kind === 'move_request_refused_admin');
      expect(sorted(refused.map((x) => x.recipient))).toEqual(sorted([cast.daPatna, cast.pa])); // once each: the opener is also a Pariwar Admin
      expect(refused.find((x) => x.recipient === cast.daPatna)!.kind).toBe('move_request_refused'); // the opener's kind: the first group wins
      expect(refused.find((x) => x.recipient === cast.pa)!.kind).toBe('move_request_refused_admin');
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

    // CR17 — AD9 "No recipient ⇒ no row": the TR9 title said it and no leg asserted it.
    it('no recipient ⇒ no row: a direct move between two districts nobody administers writes no notice — a CONTROL that a move between districts that have District Admins does', async () => {
      const move = (fieldWorkerId: FieldWorkerId, from: string, to: string) =>
        postFieldWorker(c, { ...base(cast.P, cast.pa), fieldWorkerId, toDistrict: to, expectedFromDistrict: from, reasonCode: 'reassigned', authorization: actAuthorization('field_worker.move', cast.P, to, cast.pa) });
      const lone = await registerReal(c, cast.P, { district: 'Nalanda' });
      await move(lone, 'Nalanda', 'Muzaffarpur');
      const count = async (w: FieldWorkerId) => (await c.query('SELECT count(*)::int AS n FROM field_worker_notices WHERE field_worker_id = $1', [w])).rows[0];
      expect(await count(lone)).toEqual({ n: 0 });
      const covered = await registerReal(c, cast.P, { district: 'Patna' });
      await move(covered, 'Patna', 'Gaya');
      expect(await count(covered)).toEqual({ n: 3 }); // daPatna, daGaya, daGaya2 — the acting Pariwar Admin is not told
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

    // CR28 (b) — the API leg that sent `limit=1000` seeded ONE request and so could not show a clamp; the cap is shown here.
    it('the request list’s keyset and clamp: 26 open requests — an over-cap limit returns the cap and a cursor; a walk at limit 10 has no gap and no repeat; a non-integer limit is a RangeError', async () => {
      const db = bindScopedDb(c);
      await open(c, cast, worker);
      for (let i = 0; i < PAGE_MOVE_REQUESTS_MAX_LIMIT; i += 1) await open(c, cast, await registerReal(c, cast.P, { district: 'Patna' }));
      const big = await pageFieldWorkerMoveRequests(db, cast.P, { state: 'open', limit: 1000 });
      expect(big.items).toHaveLength(PAGE_MOVE_REQUESTS_MAX_LIMIT);
      expect(big.nextCursor).not.toBeNull();
      const seen: string[] = [];
      const sizes: number[] = [];
      let after: ReturnType<typeof decodeMoveRequestCursor> | undefined;
      for (let guard = 0; guard < 10; guard += 1) {
        const page = await pageFieldWorkerMoveRequests(db, cast.P, { state: 'open', limit: 10, ...(after === undefined ? {} : { after }) });
        sizes.push(page.items.length);
        seen.push(...page.items.map((x) => x.moveRequestId));
        if (page.nextCursor === null) break;
        after = decodeMoveRequestCursor(page.nextCursor);
      }
      expect(sizes).toEqual([10, 10, 6]);
      expect(new Set(seen).size).toBe(PAGE_MOVE_REQUESTS_MAX_LIMIT + 1);
      await expect(pageFieldWorkerMoveRequests(db, cast.P, { state: 'open', limit: 1.5 })).rejects.toBeInstanceOf(RangeError);
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
      for (const banned of ['reassigned', cast.pa, 'enc:v1:mobile']) expect(text, banned).not.toContain(banned); // seeded here; the fuller list is the next test's
      expect(await getMoveRequestWorkerHistory(db, cast.P, toRequestId(randomUUID()))).toBeNull();
    });

    it('`-460`: a worker who moved, was approved, suspended, reactivated, suspended again and then ENDED — dates, districts and the state NAME; ⛔ the ending, a reason, an officer, an approver’s name (CR13)', async () => {
      const db = bindScopedDb(c);
      const { id } = await open(c, cast, worker); // the request the history is read through (the move below supersedes it; its id still reads the worker)
      const at = (key: Parameters<typeof actAuthorization>[0], district: string) => actAuthorization(key, cast.P, district, cast.pa);
      await recordFieldWorkerKycCompleted(c, { ...base(cast.P, cast.pa), fieldWorkerId: worker, ...approval(cast.P, 'Patna', cast.pa) });
      await activateFieldWorker(c, { ...base(cast.P, cast.pa), fieldWorkerId: worker, ...approval(cast.P, 'Patna', cast.pa) });
      await postFieldWorker(c, { ...base(cast.P, cast.pa), fieldWorkerId: worker, toDistrict: 'Gaya', expectedFromDistrict: 'Patna', reasonCode: 'reassigned', authorization: at('field_worker.move', 'Gaya') });
      const suspend = () => suspendFieldWorker(c, { ...base(cast.P, cast.pa), fieldWorkerId: worker, reasonCode: 'under_review', authorization: at('field_worker.suspend', 'Gaya') });
      await suspend();
      await reactivateFieldWorker(c, { ...base(cast.P, cast.pa), fieldWorkerId: worker, authorization: at('field_worker.reactivate', 'Gaya') });
      await suspend();
      const today = await istToday(c);
      await terminateFieldWorker(c, { ...base(cast.P, cast.pa), fieldWorkerId: worker, reasonCode: 'inactive', endedOn: today, authorization: at('field_worker.terminate', 'Gaya') });
      const h = await getMoveRequestWorkerHistory(db, cast.P, id);
      expect(h).toMatchObject({ currentState: 'terminated', registeredOn: today, activeSince: today, truncated: false });
      // OPEN-ENDED, not closed: the last district and the suspension open at the ending carry `to: null` — the ending's date is withheld.
      expect(h!.districts).toEqual([
        { district: 'Patna', from: today, to: today },
        { district: 'Gaya', from: today, to: null },
      ]);
      expect(h!.suspensions).toEqual([
        { from: today, to: today },
        { from: today, to: null },
      ]);
      expect(Object.keys(h!).sort()).toEqual(['activeSince', 'currentState', 'districts', 'fieldWorkerId', 'nameCiphertext', 'registeredOn', 'suspensions', 'truncated']);
      // Every banned string is SEEDED where it lives — the reasons and the actor in the worker's stream, the approver's name and the mobile on
      // its row — so its absence from the history is not vacuous (the 2026-11-09 review found three that were never seeded).
      const stream = JSON.stringify((await c.query('SELECT payload, actor_id FROM events_log WHERE stream_id = $1', [worker])).rows);
      const row = JSON.stringify((await c.query('SELECT to_jsonb(f) AS r FROM field_workers f WHERE field_worker_id = $1', [worker])).rows);
      const text = JSON.stringify(h);
      const banned: Array<[string, string]> = [
        ['reassigned', stream],
        ['under_review', stream],
        ['inactive', stream],
        [cast.pa, stream],
        ['Meera Pariwar-Admin', row],
        ['enc:v1:mobile', row],
      ];
      for (const [needle, where] of banned) {
        expect(where, `seeded: ${needle}`).toContain(needle);
        expect(text, `absent: ${needle}`).not.toContain(needle);
      }
    });

    it('the history cap: past 500 events the read keeps the OLDEST 500, says `truncated`, and ends on an OLD district — a CONTROL that exactly the cap is not truncated (CR13)', async () => {
      const db = bindScopedDb(c);
      // Generated `posted` events on the worker's stream — the history reads the stream, ⛔ the projection, so no 500 real moves are needed.
      const generate = (stream: FieldWorkerId, n: number) =>
        c.query(
          `INSERT INTO events_log (stream_id, event_type, payload, event_version, actor_id, pariwar_id)
           SELECT $1::uuid, 'field_worker.posted', jsonb_build_object('to_district', 'D' || g), g + 1, $3::uuid, $2::uuid FROM generate_series(1, $4::int) g`,
          [stream, cast.P, cast.pa, n],
        );
      const { id } = await open(c, cast, worker);
      await generate(worker, 505);
      const h = await getMoveRequestWorkerHistory(db, cast.P, id);
      expect(h!.truncated).toBe(true);
      expect(h!.districts).toHaveLength(MOVE_REQUEST_HISTORY_EVENT_CAP);
      expect(h!.districts.at(-1)).toMatchObject({ district: `D${String(MOVE_REQUEST_HISTORY_EVENT_CAP - 1)}`, to: null }); // an old stint — the real last move was to D505
      const exact = await registerReal(c, cast.P, { district: 'Patna' });
      const { id: exactId } = await open(c, cast, exact);
      await generate(exact, MOVE_REQUEST_HISTORY_EVENT_CAP - 1); // `registered` + 499 = exactly the cap
      const e = await getMoveRequestWorkerHistory(db, cast.P, exactId);
      expect(e!.truncated).toBe(false);
      expect(e!.districts).toHaveLength(MOVE_REQUEST_HISTORY_EVENT_CAP);
    });

    // CR18 — AC7 (c): the notices' keyset and clamp at the domain level.
    it('the notices’ keyset: a cursor walk of 105 notices at limit 40 has no gap and no repeat; an over-cap limit is clamped; a non-integer limit is a RangeError', async () => {
      const db = bindScopedDb(c);
      const officer = cast.daGaya;
      // `created_at` is `clock_timestamp()` — rows of one statement may tie, so the walk also exercises the `notice_id` tie-break.
      await c.query(
        `INSERT INTO field_worker_notices (pariwar_id, recipient_user_id, kind, field_worker_id, move_request_id, from_district, to_district)
         SELECT $1::uuid, $2::uuid, 'moved_by_pariwar_admin', $3::uuid, NULL::uuid, 'Patna', 'Gaya' FROM generate_series(1, 105)`,
        [cast.P, officer, worker],
      );
      const seen: string[] = [];
      let after: ReturnType<typeof decodeMoveRequestCursor> | undefined;
      const sizes: number[] = [];
      for (let guard = 0; guard < 10; guard++) {
        const page = await pageFieldWorkerNotices(db, cast.P, officer, { limit: 40, ...(after === undefined ? {} : { after }) });
        sizes.push(page.items.length);
        seen.push(...page.items.map((n) => n.noticeId));
        if (page.nextCursor === null) break;
        after = decodeMoveRequestCursor(page.nextCursor);
      }
      expect(sizes).toEqual([40, 40, 25]);
      expect(new Set(seen).size).toBe(105);
      const big = await pageFieldWorkerNotices(db, cast.P, officer, { limit: 1000 });
      expect(big.items).toHaveLength(PAGE_NOTICES_MAX_LIMIT);
      expect(big.nextCursor).not.toBeNull();
      await expect(pageFieldWorkerNotices(db, cast.P, officer, { limit: 1.5 })).rejects.toBeInstanceOf(RangeError);
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

  // CR11 — checklist family 3 / AD6 "null for a missing / foreign request": the legs above seed ONE Pariwar per test and use a random uuid for
  // "unknown". These run as the OWNER (RLS bypassed), so only the explicit `pariwar_id = $n` predicates separate the tenants — a dropped
  // predicate cannot hide behind a policy.
  describe('AD6 / checklist 3 — another Pariwar’s request is neither readable nor actable (CR11)', () => {
    it('every command, read, notice read and seen mark given ANOTHER Pariwar’s id finds nothing; the same calls in its own Pariwar find it', async () => {
      const { id } = await open(c, cast, worker);
      const db = bindScopedDb(c);
      const noticeIds = (await pageFieldWorkerNotices(db, cast.P, cast.daGaya)).items.map((n) => n.noticeId);
      expect(noticeIds).toHaveLength(1);
      await c.query('RESET ROLE'); // RLS is bypassed from here
      const other = await seedCast(); // another Pariwar's officers and grants
      const missing = async (label: string, run: () => Promise<unknown>) => expect(await caught(run), label).toBeInstanceOf(FieldWorkerMoveRequestMissingError);
      await missing('accept', () => acceptFieldWorkerMoveRequest(c, answer(other, id, other.daGaya)));
      await missing('refuse', () => refuseFieldWorkerMoveRequest(c, { ...answer(other, id, other.daGaya), refusalReason: 'other' }));
      await missing('withdraw', () =>
        withdrawFieldWorkerMoveRequest(c, { ...base(other.P, other.daPatna), moveRequestId: id, authorization: auth('field_worker.request_move', da('Patna'), other.P, 'Patna', other.daPatna) }),
      );
      await missing('close', () =>
        closeFieldWorkerMoveRequest(c, { ...base(other.P, other.pa), moveRequestId: id, authorization: auth('field_worker.settle_move_request', PA, other.P, 'Patna', other.pa) }),
      );
      await missing('escalate', () => escalateStaleMoveRequest(c, { pariwarId: other.P, moveRequestId: id, auditId: randomUUID() }));
      expect(await getFieldWorkerMoveRequest(db, other.P, id)).toBeNull();
      expect(await getMoveRequestWorkerHistory(db, other.P, id)).toBeNull();
      expect(await getMoveRequestGateRow(db, other.P, id)).toBeNull();
      expect((await pageFieldWorkerMoveRequests(db, other.P, { state: 'open' })).items).toEqual([]);
      expect((await pageFieldWorkerNotices(db, other.P, cast.daGaya)).items).toEqual([]);
      expect(await markFieldWorkerNoticesSeen(db, other.P, cast.daGaya, noticeIds)).toBe(0);
      // CONTROL — in its OWN Pariwar the request is there, and the foreign calls changed nothing.
      expect(await requestRow(c, id)).toMatchObject({ state: 'pending' });
      expect(await getFieldWorkerMoveRequest(db, cast.P, id)).not.toBeNull();
      expect(await getMoveRequestWorkerHistory(db, cast.P, id)).not.toBeNull();
      expect(await getMoveRequestGateRow(db, cast.P, id)).not.toBeNull();
      expect((await pageFieldWorkerMoveRequests(db, cast.P, { state: 'open' })).items).toHaveLength(1);
      const mine = await pageFieldWorkerNotices(db, cast.P, cast.daGaya);
      expect(mine.items).toHaveLength(1);
      expect(mine.items[0]!.seenAt).toBeNull();
      expect(await markFieldWorkerNoticesSeen(db, cast.P, cast.daGaya, noticeIds)).toBe(1);
    });
  });
});
