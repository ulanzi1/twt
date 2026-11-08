// The field-worker MOVE REQUEST commands — Story 13.1d (decision `2026-11-08-458` AD3, AD4, AD5, AD8, AD9; the Panel's `-443` Q1 A,
// keys confirmed `-459` Q1 A). The ONLY public writers of a request (the projector is not re-exported).
//
// Each takes the CALLER's client and transaction (READ COMMITTED; ⛔ BEGIN / COMMIT here — the field-worker commands' shape) and the
// verified result of ITS act's key, checked at `district` (I1). The LOCK ORDER is the same everywhere: the WORKER row first
// (`lockFieldWorkerRow`), then the request's (I5 — else a direct move and an acceptance deadlock, TR1). Every guard is judged on the
// LOCKED rows. The acceptance moves the worker through `postFieldWorker` under the answer key — the ONLY request act that moves a worker
// (I2) — and then writes `accepted` naming the move's event (event ids are minted by the database, so the move is written FIRST — AD4).
// Notices are written in the same transaction (notices.ts). ⛔ `withCompensatingAudit` here: the caller pairs the audit line and passes
// its id (the escalation sweep writes its own).

import type pg from 'pg';

import type { FieldWorkerId, FieldWorkerMoveRequestId, PariwarId } from '../ids/index.js';
import type { VerifiedAuthorization } from '../rbac/check.js';
import { FIELD_WORKER_MOVE_REFUSAL_REASONS, type FieldWorkerMoveRefusalReason } from '../schema/field_worker_move_requests.js';
import { lockFieldWorkerRow, postFieldWorker, verifiedSnapshot } from './commands.js';
import {
  FieldWorkerAuthorizationStaleError,
  FieldWorkerDistrictUnchangedError,
  FieldWorkerGenesisMissingError,
  FieldWorkerIllegalTransitionError,
  FieldWorkerMoveRequestMissingError,
  FieldWorkerMoveRequestNotOpenError,
  FieldWorkerMoveRequestNotOpenerError,
  FieldWorkerMoveRequestSameOfficerError,
  FieldWorkerProjectorInputError,
  FieldWorkerReasonInvalidError,
} from './errors.js';
import type { FieldWorkerAuthorizationSnapshot } from './events.js';
import {
  FIELD_WORKER_ANSWER_MOVE_REQUEST_PERMISSION_KEY,
  FIELD_WORKER_MOVE_REQUEST_REASON,
  FIELD_WORKER_REQUEST_MOVE_PERMISSION_KEY,
  FIELD_WORKER_SETTLE_MOVE_REQUEST_PERMISSION_KEY,
} from './move-request-events.js';
import { lockMoveRequestRow, moveRequestWorkerOf } from './move-request-lock.js';
import { projectMoveRequestOpened, projectMoveRequestTransition, type MoveRequestLockedRow } from './move-request-project.js';
import { isMoveRequestOpen, type FieldWorkerMoveRequestState } from './move-request-state.js';
import { districtAdminsOf, pariwarAdminsOf, writeFieldWorkerNotices } from './notices.js';

/** What every request command takes. Human only (I1) — the sweep's `escalateStaleMoveRequest` is the one system act. */
export interface MoveRequestCommandBase {
  pariwarId: PariwarId;
  /** REQUIRED — the caller's `withCompensatingAudit` intent id; the row's `audit_id` after this act. */
  auditId: string;
  actor: 'operator' | 'trustee';
  actorId: string;
}

/** The outcome every command returns — enough for the response without a second read. */
export interface MoveRequestActResult {
  moveRequestId: FieldWorkerMoveRequestId;
  fieldWorkerId: FieldWorkerId;
  state: FieldWorkerMoveRequestState;
  fromDistrict: string;
  toDistrict: string;
  counterpartDistrict: string;
  /** The notices written by this act, `[recipient, kind]`. */
  notified: Array<[string, string]>;
}

/** HUMAN only (I1): `operator` or `trustee` with a non-empty `actorId` — ⛔ `system` (the sweep's escalation is its own command). */
function assertHumanActor(eventType: string, actor: unknown, actorId: unknown): void {
  if (actor !== 'operator' && actor !== 'trustee') {
    throw new FieldWorkerProjectorInputError(`[${eventType}] actor must be 'operator' or 'trustee' (human only); got '${String(actor)}'`);
  }
  if (typeof actorId !== 'string' || actorId.length === 0) throw new FieldWorkerProjectorInputError(`[${eventType}] a human actor needs a non-null actorId`);
}

function resultOf(row: MoveRequestLockedRow, state: FieldWorkerMoveRequestState, notified: Array<[string, string]>): MoveRequestActResult {
  return {
    moveRequestId: row.moveRequestId,
    fieldWorkerId: row.fieldWorkerId,
    state,
    fromDistrict: row.fromDistrict,
    toDistrict: row.toDistrict,
    counterpartDistrict: row.counterpartDistrict,
    notified,
  };
}

/** Lock the request's WORKER, then the request (I5). The worker id is read first without a lock — the column is immutable. */
async function lockWorkerThenRequest(
  client: pg.PoolClient,
  pariwarId: PariwarId,
  moveRequestId: FieldWorkerMoveRequestId,
): Promise<MoveRequestLockedRow> {
  const workerId = await moveRequestWorkerOf(client, pariwarId, moveRequestId);
  if (workerId === null) throw new FieldWorkerMoveRequestMissingError(moveRequestId);
  const worker = await lockFieldWorkerRow(client, pariwarId, workerId);
  if (worker === null) throw new FieldWorkerGenesisMissingError(workerId);
  const request = await lockMoveRequestRow(client, pariwarId, moveRequestId);
  if (request === null) throw new FieldWorkerMoveRequestMissingError(moveRequestId);
  return request;
}

/** The act's verified authorization must target `district` — the gate read it before the lock (the 13.1a / 13.1c guard 3d shape). */
function assertTarget(snapshot: FieldWorkerAuthorizationSnapshot, district: string, fieldWorkerId: string): void {
  if (snapshot.target.value !== district) throw new FieldWorkerAuthorizationStaleError(fieldWorkerId, snapshot.target.value);
}

// ── Open ───────────────────────────────────────────────────────────────────────────────────────────

export interface OpenMoveRequestInput extends MoveRequestCommandBase {
  /** Caller-minted — the request's id and stream id (AD2). */
  moveRequestId: FieldWorkerMoveRequestId;
  fieldWorkerId: FieldWorkerId;
  /** The district the officer's screen SHOWED as the worker's (13.1 D7) — judged against the LOCKED row. */
  fromDistrict: string;
  /** The district the worker asks to join — the CALLER has checked it is LISTED (`assertDistrictRecorded`, QE17). */
  toDistrict: string;
  /** `field_worker.request_move`, checked at the END the officer holds: `fromDistrict` (the source) or `toDistrict` (the destination). */
  authorization: VerifiedAuthorization;
}

/**
 * Open a move request (AD3): `(none) → pending`, the opener's end being the authorization's target and the counterpart the other end.
 * Under the worker lock: the worker exists, is not `terminated`, is in `fromDistrict` (else stale) and not already in `toDistrict`. Then,
 * if NO District Admin other than the opener holds the counterpart district, it goes to the Pariwar Admin at once (`escalated`, cause
 * `no_counterpart_officer`, AD8 (b)) and the Pariwar Admins are told; otherwise the counterpart's District Admins are told.
 * @throws FieldWorkerProjectorInputError, FieldWorkerGenesisMissingError, FieldWorkerIllegalTransitionError,
 *         FieldWorkerAuthorizationStaleError, FieldWorkerDistrictUnchangedError, FieldWorkerMoveRequestOpenError (pre-read or the 23505).
 */
export async function openFieldWorkerMoveRequest(client: pg.PoolClient, i: OpenMoveRequestInput): Promise<MoveRequestActResult> {
  assertHumanActor('field_worker_move_request.opened', i.actor, i.actorId);
  const authorization = verifiedSnapshot('field_worker_move_request.opened', i.authorization, i, {
    permissionKey: FIELD_WORKER_REQUEST_MOVE_PERMISSION_KEY,
  });
  for (const [label, d] of [
    ['fromDistrict', i.fromDistrict],
    ['toDistrict', i.toDistrict],
  ] as const) {
    if (typeof d !== 'string' || d.trim().length === 0) throw new FieldWorkerProjectorInputError(`[field_worker_move_request.opened] ${label} is missing`);
  }
  const target = authorization.target.value;
  if (target !== i.fromDistrict && target !== i.toDistrict) throw new FieldWorkerAuthorizationStaleError(i.fieldWorkerId, target);
  const openedAtEnd = target === i.fromDistrict ? 'from' : 'to';
  const counterpartDistrict = openedAtEnd === 'from' ? i.toDistrict : i.fromDistrict;

  const worker = await lockFieldWorkerRow(client, i.pariwarId, i.fieldWorkerId);
  if (worker === null) throw new FieldWorkerGenesisMissingError(i.fieldWorkerId);
  if (worker.currentState === 'terminated') {
    throw new FieldWorkerIllegalTransitionError(i.fieldWorkerId, worker.currentState, 'field_worker_move_request.opened');
  }
  if (worker.district !== i.fromDistrict) throw new FieldWorkerAuthorizationStaleError(i.fieldWorkerId, i.fromDistrict);
  if (i.toDistrict === worker.district) throw new FieldWorkerDistrictUnchangedError(i.fieldWorkerId);

  await projectMoveRequestOpened(client, {
    pariwarId: i.pariwarId,
    moveRequestId: i.moveRequestId,
    actorId: i.actorId,
    auditId: i.auditId,
    payload: {
      from_state: null,
      to_state: 'pending',
      actor: i.actor,
      field_worker_id: i.fieldWorkerId,
      authorization,
      from_district: i.fromDistrict,
      to_district: i.toDistrict,
      opened_at_end: openedAtEnd,
      counterpart_district: counterpartDistrict,
      reason_code: FIELD_WORKER_MOVE_REQUEST_REASON,
    },
  });
  const opened: MoveRequestLockedRow = {
    moveRequestId: i.moveRequestId,
    fieldWorkerId: i.fieldWorkerId,
    state: 'pending',
    stateEventVersion: 1,
    fromDistrict: i.fromDistrict,
    toDistrict: i.toDistrict,
    openedAtEnd,
    counterpartDistrict,
    openedBy: i.actorId,
  };
  const facts = { pariwarId: i.pariwarId, fieldWorkerId: i.fieldWorkerId, moveRequestId: i.moveRequestId, fromDistrict: i.fromDistrict, toDistrict: i.toDistrict };

  const counterpartAdmins = (await districtAdminsOf(client, i.pariwarId, counterpartDistrict)).filter((u) => u !== i.actorId);
  if (counterpartAdmins.length > 0) {
    const notified = await writeFieldWorkerNotices(client, facts, [['move_request_opened', counterpartAdmins]], i.actorId);
    return resultOf(opened, 'pending', notified);
  }
  // AD8 (b) — nobody else can answer: it goes to the Pariwar Admin at once (a SYSTEM act, in the opener's transaction).
  await projectMoveRequestTransition(client, {
    pariwarId: i.pariwarId,
    eventType: 'field_worker_move_request.escalated',
    payload: { from_state: 'pending', to_state: 'escalated', actor: 'system', field_worker_id: i.fieldWorkerId, cause: 'no_counterpart_officer' },
    actorId: null,
    auditId: i.auditId,
    lockedRow: opened,
  });
  const notified = await writeFieldWorkerNotices(client, facts, [['move_request_escalated', await pariwarAdminsOf(client, i.pariwarId)]], i.actorId);
  return resultOf(opened, 'escalated', notified);
}

// ── Accept / refuse (the counterpart) ──────────────────────────────────────────────────────────────

export interface AnswerMoveRequestInput extends MoveRequestCommandBase {
  moveRequestId: FieldWorkerMoveRequestId;
  /** `field_worker.answer_move_request`, checked at the request's COUNTERPART district. */
  authorization: VerifiedAuthorization;
}

/** The answer's shared guards under both locks: `pending` (an escalated request has gone to the Pariwar Admin — AD3), not the opener, the counterpart's key. */
async function lockForAnswer(client: pg.PoolClient, i: AnswerMoveRequestInput, eventType: string): Promise<{ row: MoveRequestLockedRow; authorization: FieldWorkerAuthorizationSnapshot }> {
  assertHumanActor(eventType, i.actor, i.actorId);
  const authorization = verifiedSnapshot(eventType, i.authorization, i, { permissionKey: FIELD_WORKER_ANSWER_MOVE_REQUEST_PERMISSION_KEY });
  const row = await lockWorkerThenRequest(client, i.pariwarId, i.moveRequestId);
  if (row.state !== 'pending') throw new FieldWorkerMoveRequestNotOpenError(row.moveRequestId, row.state);
  if (row.openedBy === i.actorId) throw new FieldWorkerMoveRequestSameOfficerError(row.moveRequestId);
  assertTarget(authorization, row.counterpartDistrict, row.fieldWorkerId);
  return { row, authorization };
}

/**
 * ACCEPT (AD4): under the worker lock, then the request's — `pending`, not the opener — move the worker with `postFieldWorker` (the answer
 * key; `expectedFromDistrict` = the request's source, so a worker moved meanwhile is refused), THEN write `accepted` naming the move's
 * event. The opener is told (`move_request_accepted`). ⛔ A `moved_by_pariwar_admin` notice or a supersede: the answer key has none.
 * @throws FieldWorkerMoveRequestNotOpenError, FieldWorkerMoveRequestSameOfficerError, FieldWorkerAuthorizationStaleError (+ the move's).
 */
export async function acceptFieldWorkerMoveRequest(client: pg.PoolClient, i: AnswerMoveRequestInput): Promise<MoveRequestActResult & { postedEventId: string }> {
  const { row, authorization } = await lockForAnswer(client, i, 'field_worker_move_request.accepted');
  const moved = await postFieldWorker(client, {
    pariwarId: i.pariwarId,
    fieldWorkerId: row.fieldWorkerId,
    auditId: i.auditId,
    actor: i.actor,
    actorId: i.actorId,
    toDistrict: row.toDistrict,
    expectedFromDistrict: row.fromDistrict,
    reasonCode: FIELD_WORKER_MOVE_REQUEST_REASON,
    authorization: i.authorization,
  });
  await projectMoveRequestTransition(client, {
    pariwarId: i.pariwarId,
    eventType: 'field_worker_move_request.accepted',
    payload: { from_state: 'pending', to_state: 'accepted', actor: i.actor, field_worker_id: row.fieldWorkerId, authorization, posted_event_id: moved.eventId },
    actorId: i.actorId,
    auditId: i.auditId,
    lockedRow: row,
  });
  const notified = await writeFieldWorkerNotices(
    client,
    { pariwarId: i.pariwarId, fieldWorkerId: row.fieldWorkerId, moveRequestId: row.moveRequestId, fromDistrict: row.fromDistrict, toDistrict: row.toDistrict },
    [['move_request_accepted', [row.openedBy]]],
    i.actorId,
  );
  return { ...resultOf(row, 'accepted', notified), postedEventId: moved.eventId };
}

export interface RefuseMoveRequestInput extends AnswerMoveRequestInput {
  /** One of `FIELD_WORKER_MOVE_REFUSAL_REASONS` (AD7) — never free text. */
  refusalReason: string;
}

/**
 * REFUSE (AD3, AD7): `pending → refused` with a reason from the fixed list; the worker stays. The opener AND the Pariwar Admins are told
 * (BigDev's Q-2 A — a refusal is a possible dispute the Pariwar Admin settles).
 * @throws FieldWorkerReasonInvalidError, FieldWorkerMoveRequestNotOpenError, FieldWorkerMoveRequestSameOfficerError, FieldWorkerAuthorizationStaleError.
 */
export async function refuseFieldWorkerMoveRequest(client: pg.PoolClient, i: RefuseMoveRequestInput): Promise<MoveRequestActResult> {
  if (typeof i.refusalReason !== 'string' || !(FIELD_WORKER_MOVE_REFUSAL_REASONS as readonly string[]).includes(i.refusalReason)) {
    throw new FieldWorkerReasonInvalidError('field_worker_move_request.refused', i.refusalReason);
  }
  const refusalReason = i.refusalReason as FieldWorkerMoveRefusalReason;
  const { row, authorization } = await lockForAnswer(client, i, 'field_worker_move_request.refused');
  await projectMoveRequestTransition(client, {
    pariwarId: i.pariwarId,
    eventType: 'field_worker_move_request.refused',
    payload: { from_state: 'pending', to_state: 'refused', actor: i.actor, field_worker_id: row.fieldWorkerId, authorization, refusal_reason: refusalReason },
    actorId: i.actorId,
    auditId: i.auditId,
    lockedRow: row,
  });
  const notified = await writeFieldWorkerNotices(
    client,
    { pariwarId: i.pariwarId, fieldWorkerId: row.fieldWorkerId, moveRequestId: row.moveRequestId, fromDistrict: row.fromDistrict, toDistrict: row.toDistrict, refusalReason },
    [['move_request_refused', [row.openedBy, ...(await pariwarAdminsOf(client, i.pariwarId))]]],
    i.actorId,
  );
  return resultOf(row, 'refused', notified);
}

// ── Withdraw (the opener) / close (a Pariwar Admin) ───────────────────────────────────────────────

export interface WithdrawMoveRequestInput extends MoveRequestCommandBase {
  moveRequestId: FieldWorkerMoveRequestId;
  /** `field_worker.request_move`, checked at the OPENER's end. */
  authorization: VerifiedAuthorization;
}

/**
 * WITHDRAW (AD3): the opener ends a `pending` or `escalated` request. Nobody is told (the work list shows it).
 * @throws FieldWorkerMoveRequestNotOpenError, FieldWorkerMoveRequestNotOpenerError, FieldWorkerAuthorizationStaleError.
 */
export async function withdrawFieldWorkerMoveRequest(client: pg.PoolClient, i: WithdrawMoveRequestInput): Promise<MoveRequestActResult> {
  assertHumanActor('field_worker_move_request.withdrawn', i.actor, i.actorId);
  const authorization = verifiedSnapshot('field_worker_move_request.withdrawn', i.authorization, i, { permissionKey: FIELD_WORKER_REQUEST_MOVE_PERMISSION_KEY });
  const row = await lockWorkerThenRequest(client, i.pariwarId, i.moveRequestId);
  if (!isMoveRequestOpen(row.state)) throw new FieldWorkerMoveRequestNotOpenError(row.moveRequestId, row.state);
  if (row.openedBy !== i.actorId) throw new FieldWorkerMoveRequestNotOpenerError(row.moveRequestId);
  assertTarget(authorization, row.openedAtEnd === 'from' ? row.fromDistrict : row.toDistrict, row.fieldWorkerId);
  await projectMoveRequestTransition(client, {
    pariwarId: i.pariwarId,
    eventType: 'field_worker_move_request.withdrawn',
    payload: { from_state: row.state, to_state: 'withdrawn', actor: i.actor, field_worker_id: row.fieldWorkerId, authorization },
    actorId: i.actorId,
    auditId: i.auditId,
    lockedRow: row,
  });
  return resultOf(row, 'withdrawn', []);
}

export interface CloseMoveRequestInput extends MoveRequestCommandBase {
  moveRequestId: FieldWorkerMoveRequestId;
  /** `field_worker.settle_move_request`, checked at the request's SOURCE district (a Pariwar grant covers it). */
  authorization: VerifiedAuthorization;
}

/**
 * CLOSE (AD3): a Pariwar Admin settles an `escalated` request without a move (moving the worker directly supersedes it instead). Nobody
 * is told.
 * @throws FieldWorkerMoveRequestNotOpenError, FieldWorkerAuthorizationStaleError.
 */
export async function closeFieldWorkerMoveRequest(client: pg.PoolClient, i: CloseMoveRequestInput): Promise<MoveRequestActResult> {
  assertHumanActor('field_worker_move_request.closed', i.actor, i.actorId);
  const authorization = verifiedSnapshot('field_worker_move_request.closed', i.authorization, i, { permissionKey: FIELD_WORKER_SETTLE_MOVE_REQUEST_PERMISSION_KEY });
  const row = await lockWorkerThenRequest(client, i.pariwarId, i.moveRequestId);
  if (row.state !== 'escalated') throw new FieldWorkerMoveRequestNotOpenError(row.moveRequestId, row.state);
  assertTarget(authorization, row.fromDistrict, row.fieldWorkerId);
  await projectMoveRequestTransition(client, {
    pariwarId: i.pariwarId,
    eventType: 'field_worker_move_request.closed',
    payload: { from_state: 'escalated', to_state: 'closed', actor: i.actor, field_worker_id: row.fieldWorkerId, authorization },
    actorId: i.actorId,
    auditId: i.auditId,
    lockedRow: row,
  });
  return resultOf(row, 'closed', []);
}

// ── Escalate (the system — the sweep) ──────────────────────────────────────────────────────────────

/**
 * ESCALATE one request that has waited 7 × 24 h (AD8 (a)) — the SWEEP's act (actor `system`, no authorization); it NEVER accepts (I3).
 * Locks the worker, then the request, and RE-CHECKS under the locks that it is still `pending` and still old enough by the DATABASE clock
 * (TR3); anything else returns null and writes nothing (a second tick is a no-op). The Pariwar Admins and the opener are told.
 */
export async function escalateStaleMoveRequest(
  client: pg.PoolClient,
  i: { pariwarId: PariwarId; moveRequestId: FieldWorkerMoveRequestId; auditId: string },
): Promise<MoveRequestActResult | null> {
  const row = await lockWorkerThenRequest(client, i.pariwarId, i.moveRequestId);
  if (row.state !== 'pending') return null;
  const aged = await client.query<{ aged: boolean }>(
    "SELECT opened_at <= now() - interval '7 days' AS aged FROM field_worker_move_requests WHERE move_request_id = $1 AND pariwar_id = $2",
    [i.moveRequestId, i.pariwarId],
  );
  if (aged.rows[0]?.aged !== true) return null;
  await projectMoveRequestTransition(client, {
    pariwarId: i.pariwarId,
    eventType: 'field_worker_move_request.escalated',
    payload: { from_state: 'pending', to_state: 'escalated', actor: 'system', field_worker_id: row.fieldWorkerId, cause: 'unanswered_7_days' },
    actorId: null,
    auditId: i.auditId,
    lockedRow: row,
  });
  const notified = await writeFieldWorkerNotices(
    client,
    { pariwarId: i.pariwarId, fieldWorkerId: row.fieldWorkerId, moveRequestId: row.moveRequestId, fromDistrict: row.fromDistrict, toDistrict: row.toDistrict },
    [['move_request_escalated', [...(await pariwarAdminsOf(client, i.pariwarId)), row.openedBy]]],
    null,
  );
  return resultOf(row, 'escalated', notified);
}
