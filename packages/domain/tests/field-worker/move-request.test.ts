// Story 13.1d — the move request's vocabulary, state table and work-history fold (AD2, AD3, AD8; `-460`). DB-free.

import { describe, expect, it } from 'vitest';

import { foldWorkHistory } from '../../src/field-worker/move-request-read.js';
import {
  FIELD_WORKER_MOVE_REQUEST_EVENT_PAYLOAD_SCHEMAS,
  FIELD_WORKER_MOVE_REQUEST_EVENT_TYPES,
} from '../../src/field-worker/move-request-events.js';
import {
  FIELD_WORKER_MOVE_REQUEST_STATES,
  FIELD_WORKER_MOVE_REQUEST_TRANSITIONS,
  isMoveRequestOpen,
  nextMoveRequestState,
} from '../../src/field-worker/move-request-state.js';

const W = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
const snap = (permission_key: string, value = 'Patna') => ({
  permission_key,
  role: 'district_admin',
  grant: { dimension: 'district', value },
  target: { dimension: 'district', value },
  catalog_version: 62,
});

const VALID = {
  'field_worker_move_request.opened': {
    from_state: null, to_state: 'pending', actor: 'operator', field_worker_id: W, authorization: snap('field_worker.request_move'),
    from_district: 'Patna', to_district: 'Gaya', opened_at_end: 'from', counterpart_district: 'Gaya', reason_code: 'at_worker_request',
  },
  'field_worker_move_request.accepted': {
    from_state: 'pending', to_state: 'accepted', actor: 'operator', field_worker_id: W, authorization: snap('field_worker.answer_move_request', 'Gaya'),
    posted_event_id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
  },
  'field_worker_move_request.refused': {
    from_state: 'pending', to_state: 'refused', actor: 'operator', field_worker_id: W, authorization: snap('field_worker.answer_move_request', 'Gaya'),
    refusal_reason: 'no_capacity',
  },
  'field_worker_move_request.withdrawn': { from_state: 'escalated', to_state: 'withdrawn', actor: 'operator', field_worker_id: W, authorization: snap('field_worker.request_move') },
  'field_worker_move_request.escalated': { from_state: 'pending', to_state: 'escalated', actor: 'system', field_worker_id: W, cause: 'unanswered_7_days' },
  'field_worker_move_request.closed': { from_state: 'escalated', to_state: 'closed', actor: 'trustee', field_worker_id: W, authorization: snap('field_worker.settle_move_request') },
  'field_worker_move_request.superseded': {
    from_state: 'pending', to_state: 'superseded', actor: 'trustee', field_worker_id: W, authorization: snap('field_worker.move'), cause: 'worker_moved',
  },
} as const;

describe('Story 13.1d AD2 — the seven payloads', () => {
  it('each valid payload passes its schema; an unknown key fails (strict); a name-shaped key fails (I6)', () => {
    for (const type of FIELD_WORKER_MOVE_REQUEST_EVENT_TYPES) {
      const schema = FIELD_WORKER_MOVE_REQUEST_EVENT_PAYLOAD_SCHEMAS[type];
      expect(schema.safeParse(VALID[type]).success, type).toBe(true);
      expect(schema.safeParse({ ...VALID[type], worker_name: 'Asha' }).success, type).toBe(false);
    }
  });

  it('I1 / I3: `system` is the actor of `escalated` ONLY, and `escalated` is ONLY `system`', () => {
    for (const type of FIELD_WORKER_MOVE_REQUEST_EVENT_TYPES) {
      const schema = FIELD_WORKER_MOVE_REQUEST_EVENT_PAYLOAD_SCHEMAS[type];
      const asSystem = schema.safeParse({ ...VALID[type], actor: 'system' }).success;
      const asOperator = schema.safeParse({ ...VALID[type], actor: 'operator' }).success;
      if (type === 'field_worker_move_request.escalated') {
        expect([asSystem, asOperator]).toEqual([true, false]);
      } else {
        expect(asSystem, type).toBe(false);
        expect(asOperator, type).toBe(true);
      }
    }
  });

  it('each act carries ITS key only (the R2-D1 shape) — and the supersede key follows its cause', () => {
    const accepted = FIELD_WORKER_MOVE_REQUEST_EVENT_PAYLOAD_SCHEMAS['field_worker_move_request.accepted'];
    expect(accepted.safeParse({ ...VALID['field_worker_move_request.accepted'], authorization: snap('field_worker.move', 'Gaya') }).success).toBe(false);
    const opened = FIELD_WORKER_MOVE_REQUEST_EVENT_PAYLOAD_SCHEMAS['field_worker_move_request.opened'];
    expect(opened.safeParse({ ...VALID['field_worker_move_request.opened'], authorization: snap('field_worker.answer_move_request') }).success).toBe(false);
    const sup = FIELD_WORKER_MOVE_REQUEST_EVENT_PAYLOAD_SCHEMAS['field_worker_move_request.superseded'];
    expect(sup.safeParse({ ...VALID['field_worker_move_request.superseded'], cause: 'worker_ended' }).success).toBe(false);
    expect(sup.safeParse({ ...VALID['field_worker_move_request.superseded'], cause: 'worker_ended', authorization: snap('field_worker.terminate') }).success).toBe(true);
  });

  it('opened: the counterpart is the other end; the authorization targets the opener’s end; the districts differ', () => {
    const opened = FIELD_WORKER_MOVE_REQUEST_EVENT_PAYLOAD_SCHEMAS['field_worker_move_request.opened'];
    const v = VALID['field_worker_move_request.opened'];
    expect(opened.safeParse({ ...v, counterpart_district: 'Patna' }).success).toBe(false);
    expect(opened.safeParse({ ...v, authorization: snap('field_worker.request_move', 'Gaya') }).success).toBe(false);
    expect(opened.safeParse({ ...v, opened_at_end: 'to', counterpart_district: 'Patna', authorization: snap('field_worker.request_move', 'Gaya') }).success).toBe(true);
    expect(opened.safeParse({ ...v, to_district: 'Patna', counterpart_district: 'Patna' }).success).toBe(false);
  });

  it('AD7: a refusal reason outside the fixed list, or free text, fails', () => {
    const refused = FIELD_WORKER_MOVE_REQUEST_EVENT_PAYLOAD_SCHEMAS['field_worker_move_request.refused'];
    for (const r of ['busy', 'We have no room', '', undefined]) {
      expect(refused.safeParse({ ...VALID['field_worker_move_request.refused'], refusal_reason: r }).success, String(r)).toBe(false);
    }
  });
});

describe('Story 13.1d AD3 — the state table', () => {
  it('exactly the legal arms; every other (state × event) pair is null; the final states admit nothing', () => {
    const legal = new Set(FIELD_WORKER_MOVE_REQUEST_TRANSITIONS.map((t) => `${t.from}|${t.event}`));
    expect(legal.size).toBe(8);
    for (const s of FIELD_WORKER_MOVE_REQUEST_STATES) {
      for (const e of FIELD_WORKER_MOVE_REQUEST_EVENT_TYPES) {
        const next = nextMoveRequestState(s, e);
        expect(next !== null, `${s} + ${e}`).toBe(legal.has(`${s}|${e}`));
      }
    }
    for (const s of ['accepted', 'refused', 'withdrawn', 'closed', 'superseded'] as const) expect(isMoveRequestOpen(s)).toBe(false);
    expect(isMoveRequestOpen('pending') && isMoveRequestOpen('escalated')).toBe(true);
  });

  it('once escalated, the counterpart can no longer answer (accept / refuse are pending-only); the sweep escalates pending only', () => {
    expect(nextMoveRequestState('escalated', 'field_worker_move_request.accepted')).toBeNull();
    expect(nextMoveRequestState('escalated', 'field_worker_move_request.refused')).toBeNull();
    expect(nextMoveRequestState('escalated', 'field_worker_move_request.escalated')).toBeNull();
    expect(nextMoveRequestState('pending', 'field_worker_move_request.closed')).toBeNull();
  });
});

describe('`-460` — the work-history fold', () => {
  it('registered, activated, a move, a suspension and its end: dates and districts only', () => {
    expect(
      foldWorkHistory([
        { eventType: 'field_worker.registered', day: '2026-01-02', district: 'Patna' },
        { eventType: 'field_worker.kyc_completed', day: '2026-01-03', district: null },
        { eventType: 'field_worker.activated', day: '2026-01-03', district: null },
        { eventType: 'field_worker.posted', day: '2026-03-10', district: 'Gaya' },
        { eventType: 'field_worker.suspended', day: '2026-04-01', district: null },
        { eventType: 'field_worker.reactivated', day: '2026-04-20', district: null },
        { eventType: 'field_worker.suspended', day: '2026-05-05', district: null },
      ]),
    ).toEqual({
      registeredOn: '2026-01-02',
      activeSince: '2026-01-03',
      districts: [
        { district: 'Patna', from: '2026-01-02', to: '2026-03-10' },
        { district: 'Gaya', from: '2026-03-10', to: null },
      ],
      suspensions: [
        { from: '2026-04-01', to: '2026-04-20' },
        { from: '2026-05-05', to: null },
      ],
    });
  });

  it('a worker never approved: no "active since"; an empty stream folds to nothing', () => {
    expect(foldWorkHistory([{ eventType: 'field_worker.registered', day: '2026-01-02', district: 'Patna' }]).activeSince).toBeNull();
    expect(foldWorkHistory([])).toEqual({ registeredOn: null, activeSince: null, districts: [], suspensions: [] });
  });
});
