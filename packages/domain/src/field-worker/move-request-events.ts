// The field-worker MOVE REQUEST vocabulary — Story 13.1d (decision `2026-11-08-458` AD2, AD3, AD7, AD8; the Panel's `-443` Q1 A).
//
// A request lives on its OWN `events_log` stream (`stream_id = move_request_id`, caller-minted), ⛔ the worker's: the worker projector's
// head check (project.ts) would refuse every later transition of a worker whose stream carried a request event (G1). Its events are the
// Panel's "full log" of the request. `field_worker_move_requests` is their projection (move-request-project.ts, the only writer).
//
// Every payload is `.strict()` and carries ⛔ name, ⛔ mobile, ⛔ code (I6) — ids, districts, reason and cause codes, and the verified
// authorization snapshot of the human act. `actor: 'system'` appears on `escalated` ONLY (the sweep after 7 days, or the open that finds
// no other District Admin at the other end — AD8), and `escalated` is ONLY `system`; no other event is automated (I1, I3).

import { z } from 'zod';

import {
  FIELD_WORKER_MOVE_ESCALATION_CAUSES,
  FIELD_WORKER_MOVE_OPENED_AT_ENDS,
  FIELD_WORKER_MOVE_REFUSAL_REASONS,
  FIELD_WORKER_MOVE_SUPERSEDE_CAUSES,
} from '../schema/field_worker_move_requests.js';
import { FieldWorkerAuthorizationSnapshotSchema, fieldWorkerDistrictSchema } from './events.js';

/** The four keys of Story 13.1d (AD5) — one per act. */
export const FIELD_WORKER_REQUEST_MOVE_PERMISSION_KEY = 'field_worker.request_move';
export const FIELD_WORKER_ANSWER_MOVE_REQUEST_PERMISSION_KEY = 'field_worker.answer_move_request';
export const FIELD_WORKER_SETTLE_MOVE_REQUEST_PERMISSION_KEY = 'field_worker.settle_move_request';
export const FIELD_WORKER_READ_MOVE_REQUESTS_PERMISSION_KEY = 'field_worker.read_move_requests';

/** The ONE reason a request is opened for (`-443` Q1 A: "When a worker asks to report elsewhere"). */
export const FIELD_WORKER_MOVE_REQUEST_REASON = 'at_worker_request';

const humanActorSchema = z.enum(['operator', 'trustee']);
/** The authorization snapshot of an act, its key PINNED (a snapshot of another key is a schema failure — the R2-D1 shape). */
const snapshotOf = <K extends readonly [string, ...string[]]>(keys: K) =>
  FieldWorkerAuthorizationSnapshotSchema.extend({ permission_key: z.enum(keys) });

const common = { field_worker_id: z.string().uuid() };

/** `(none) → pending` — the opener holds EITHER end (AD3); the counterpart is the other. */
export const FieldWorkerMoveRequestOpenedPayloadSchema = z
  .object({
    from_state: z.null(),
    to_state: z.literal('pending'),
    actor: humanActorSchema,
    ...common,
    authorization: snapshotOf([FIELD_WORKER_REQUEST_MOVE_PERMISSION_KEY]),
    from_district: fieldWorkerDistrictSchema,
    to_district: fieldWorkerDistrictSchema,
    opened_at_end: z.enum(FIELD_WORKER_MOVE_OPENED_AT_ENDS),
    counterpart_district: fieldWorkerDistrictSchema,
    reason_code: z.literal(FIELD_WORKER_MOVE_REQUEST_REASON),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.to_district === v.from_district) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'a move request changes the district', path: ['to_district'] });
    }
    const counterpart = v.opened_at_end === 'from' ? v.to_district : v.from_district;
    if (v.counterpart_district !== counterpart) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'the counterpart is the end the opener does not hold', path: ['counterpart_district'] });
    }
    const openerEnd = v.opened_at_end === 'from' ? v.from_district : v.to_district;
    if (v.authorization.target.value !== openerEnd) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "the authorization targets the opener's end", path: ['authorization', 'target'] });
    }
  });

/** `pending → accepted` — the counterpart's District Admin; the worker was moved FIRST in the same transaction (AD4). */
export const FieldWorkerMoveRequestAcceptedPayloadSchema = z
  .object({
    from_state: z.literal('pending'),
    to_state: z.literal('accepted'),
    actor: humanActorSchema,
    ...common,
    authorization: snapshotOf([FIELD_WORKER_ANSWER_MOVE_REQUEST_PERMISSION_KEY]),
    posted_event_id: z.string().uuid(),
  })
  .strict();

/** `pending → refused`, with a reason from the fixed list (AD7) — never free text. */
export const FieldWorkerMoveRequestRefusedPayloadSchema = z
  .object({
    from_state: z.literal('pending'),
    to_state: z.literal('refused'),
    actor: humanActorSchema,
    ...common,
    authorization: snapshotOf([FIELD_WORKER_ANSWER_MOVE_REQUEST_PERMISSION_KEY]),
    refusal_reason: z.enum(FIELD_WORKER_MOVE_REFUSAL_REASONS),
  })
  .strict();

/** `pending | escalated → withdrawn` — the opener only. */
export const FieldWorkerMoveRequestWithdrawnPayloadSchema = z
  .object({
    from_state: z.enum(['pending', 'escalated']),
    to_state: z.literal('withdrawn'),
    actor: humanActorSchema,
    ...common,
    authorization: snapshotOf([FIELD_WORKER_REQUEST_MOVE_PERMISSION_KEY]),
  })
  .strict();

/** `pending → escalated` — SYSTEM only, never accepts (I3). ⛔ Authorization: no human acted. */
export const FieldWorkerMoveRequestEscalatedPayloadSchema = z
  .object({
    from_state: z.literal('pending'),
    to_state: z.literal('escalated'),
    actor: z.literal('system'),
    ...common,
    cause: z.enum(FIELD_WORKER_MOVE_ESCALATION_CAUSES),
  })
  .strict();

/** `escalated → closed` — a Pariwar Admin settles it without a move (a move would supersede it). */
export const FieldWorkerMoveRequestClosedPayloadSchema = z
  .object({
    from_state: z.literal('escalated'),
    to_state: z.literal('closed'),
    actor: humanActorSchema,
    ...common,
    authorization: snapshotOf([FIELD_WORKER_SETTLE_MOVE_REQUEST_PERMISSION_KEY]),
  })
  .strict();

/**
 * `pending | escalated → superseded` — a DIRECT move (`worker_moved`, key `field_worker.move`) or an ending (`worker_ended`, key
 * `field_worker.terminate`) made the request moot, in the SAME transaction (AD3, AD4). Carries the acting officer's snapshot of THAT act.
 */
export const FieldWorkerMoveRequestSupersededPayloadSchema = z
  .object({
    from_state: z.enum(['pending', 'escalated']),
    to_state: z.literal('superseded'),
    actor: humanActorSchema,
    ...common,
    authorization: snapshotOf(['field_worker.move', 'field_worker.terminate']),
    cause: z.enum(FIELD_WORKER_MOVE_SUPERSEDE_CAUSES),
  })
  .strict()
  .superRefine((v, ctx) => {
    const key = v.cause === 'worker_moved' ? 'field_worker.move' : 'field_worker.terminate';
    if (v.authorization.permission_key !== key) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `a ${v.cause} supersede carries the ${key} snapshot`, path: ['authorization'] });
    }
  });

export const FIELD_WORKER_MOVE_REQUEST_EVENT_TYPES = [
  'field_worker_move_request.opened',
  'field_worker_move_request.accepted',
  'field_worker_move_request.refused',
  'field_worker_move_request.withdrawn',
  'field_worker_move_request.escalated',
  'field_worker_move_request.closed',
  'field_worker_move_request.superseded',
] as const;
export type FieldWorkerMoveRequestEventType = (typeof FIELD_WORKER_MOVE_REQUEST_EVENT_TYPES)[number];

export const FIELD_WORKER_MOVE_REQUEST_EVENT_PAYLOAD_SCHEMAS = {
  'field_worker_move_request.opened': FieldWorkerMoveRequestOpenedPayloadSchema,
  'field_worker_move_request.accepted': FieldWorkerMoveRequestAcceptedPayloadSchema,
  'field_worker_move_request.refused': FieldWorkerMoveRequestRefusedPayloadSchema,
  'field_worker_move_request.withdrawn': FieldWorkerMoveRequestWithdrawnPayloadSchema,
  'field_worker_move_request.escalated': FieldWorkerMoveRequestEscalatedPayloadSchema,
  'field_worker_move_request.closed': FieldWorkerMoveRequestClosedPayloadSchema,
  'field_worker_move_request.superseded': FieldWorkerMoveRequestSupersededPayloadSchema,
} as const satisfies Record<FieldWorkerMoveRequestEventType, z.ZodTypeAny>;
