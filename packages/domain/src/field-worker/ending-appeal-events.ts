// The appeal against a field worker's ending — its event vocabulary and payload schemas (Story 13.1f; decision `2026-11-16-464` AD7,
// AD9, AD15; the Panel's `-454` Q1 A).
//
// An appeal is its OWN event stream (`events_log.stream_id = appeal_id`, prefix `field_worker_ending_appeal.`) — ⛔ the worker's: the
// worker projector's head check would refuse every later transition of the worker (13.1d AD2's reason). Its projection is
// `field_worker_ending_appeals` (migration 0207), written only by `ending-appeal-project.ts`. Every event is a HUMAN act (QE7) and pins
// its key (AD15): `lodged` / `allowed` / `refused` / `withdrawn` → the hear key matching the appeal's `heard_by` (`pariwar_admin` →
// `field_worker.hear_ending_appeal`; `trustee_panel` → `field_worker.hear_ending_appeal_as_panel`); `superseded` → the slip's undo key
// `field_worker.undo_ending`. ⛔ Name, mobile, code or free text (I6; 13.1 QE12): ids, dates, the hearer and the channel only.

import { z } from 'zod';

import { FIELD_WORKER_ENDING_APPEAL_CHANNELS, FIELD_WORKER_ENDING_APPEAL_HEARERS } from '../schema/field_worker_ending_appeals.js';
import { FIELD_WORKER_HEAR_APPEAL_PERMISSION_KEYS, FieldWorkerAuthorizationSnapshotSchema, isCalendarDateString } from './events.js';

/** The four keys of Story 13.1f (AD10). */
export const FIELD_WORKER_UNDO_ENDING_PERMISSION_KEY = 'field_worker.undo_ending';
export const FIELD_WORKER_HEAR_ENDING_APPEAL_PERMISSION_KEY = 'field_worker.hear_ending_appeal';
export const FIELD_WORKER_HEAR_ENDING_APPEAL_AS_PANEL_PERMISSION_KEY = 'field_worker.hear_ending_appeal_as_panel';
export const FIELD_WORKER_READ_ENDING_APPEALS_PERMISSION_KEY = 'field_worker.read_ending_appeals';

/** The hear key for each hearer (AD9; Q-4 A) — the ONE map every check reads. */
export const FIELD_WORKER_HEAR_KEY_BY_HEARER = {
  pariwar_admin: FIELD_WORKER_HEAR_ENDING_APPEAL_PERMISSION_KEY,
  trustee_panel: FIELD_WORKER_HEAR_ENDING_APPEAL_AS_PANEL_PERMISSION_KEY,
} as const satisfies Record<(typeof FIELD_WORKER_ENDING_APPEAL_HEARERS)[number], (typeof FIELD_WORKER_HEAR_APPEAL_PERMISSION_KEYS)[number]>;

/**
 * ONE appeal per ending (AD7; the Panel note's Q2 suggestion): a REFUSED appeal on the same ending refuses a new one (a withdrawn or
 * superseded one does not count). A constant in the command, ⛔ a database constraint — the Panel's answer changes this line.
 */
export const FIELD_WORKER_APPEALS_PER_ENDING = 1;

const humanActorSchema = z.enum(['operator', 'trustee']);
const dateSchema = z.string().refine(isCalendarDateString, 'a real YYYY-MM-DD date');
const hearSnapshot = FieldWorkerAuthorizationSnapshotSchema.extend({ permission_key: z.enum(FIELD_WORKER_HEAR_APPEAL_PERMISSION_KEYS) });

/** The hear key on a snapshot must be `heard_by`'s (AD9, AD15) — one refinement, four schemas. */
function hearerMatches(v: { heard_by: (typeof FIELD_WORKER_ENDING_APPEAL_HEARERS)[number]; authorization: { permission_key: string } }, ctx: z.RefinementCtx): void {
  if (v.authorization.permission_key !== FIELD_WORKER_HEAR_KEY_BY_HEARER[v.heard_by]) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: `an appeal heard by ${v.heard_by} is signed with ${FIELD_WORKER_HEAR_KEY_BY_HEARER[v.heard_by]}`, path: ['authorization', 'permission_key'] });
  }
}

const common = {
  actor: humanActorSchema,
  field_worker_id: z.string().uuid(),
  heard_by: z.enum(FIELD_WORKER_ENDING_APPEAL_HEARERS),
};

/** `(none) → open` — the HEARER records the worker's appeal against ONE ending (`ending_event_version`), as the worker gave it. */
export const FieldWorkerEndingAppealLodgedPayloadSchema = z
  .object({
    from_state: z.null(),
    to_state: z.literal('open'),
    ...common,
    authorization: hearSnapshot,
    ending_event_version: z.number().int().min(2),
    received_on: dateSchema,
    received_via: z.enum(FIELD_WORKER_ENDING_APPEAL_CHANNELS),
  })
  .strict()
  .superRefine(hearerMatches);

/** `open → allowed` — the hearer allows it; the worker's `field_worker.ending_undone` (cause `appeal_allowed`) is written FIRST in the same transaction. */
export const FieldWorkerEndingAppealAllowedPayloadSchema = z
  .object({
    from_state: z.literal('open'),
    to_state: z.literal('allowed'),
    ...common,
    authorization: hearSnapshot,
    decided_on: dateSchema,
    undone_event_id: z.string().uuid(),
  })
  .strict()
  .superRefine(hearerMatches);

/** `open → refused` — the worker stays ended. */
export const FieldWorkerEndingAppealRefusedPayloadSchema = z
  .object({
    from_state: z.literal('open'),
    to_state: z.literal('refused'),
    ...common,
    authorization: hearSnapshot,
    decided_on: dateSchema,
  })
  .strict()
  .superRefine(hearerMatches);

/** `open → withdrawn` — the worker withdrew it and the hearer records that; it counts for nothing (a new appeal may be lodged). */
export const FieldWorkerEndingAppealWithdrawnPayloadSchema = z
  .object({
    from_state: z.literal('open'),
    to_state: z.literal('withdrawn'),
    ...common,
    authorization: hearSnapshot,
    decided_on: dateSchema,
  })
  .strict()
  .superRefine(hearerMatches);

/**
 * `open → superseded` — a SLIP's undo (`field_worker.undo_ending`, cause `mistake`) restored the worker, so the appeal is no longer
 * needed (AD6, I4); written by the undo, in its transaction, with the undoer's snapshot. `decided_on` is the undo's IST day (SQL), or the appeal's
 * `received_on` when that is later (an undo begun before IST midnight that locked after a lodge of the next day - R7; review R3-36).
 */
export const FieldWorkerEndingAppealSupersededPayloadSchema = z
  .object({
    from_state: z.literal('open'),
    to_state: z.literal('superseded'),
    ...common,
    authorization: FieldWorkerAuthorizationSnapshotSchema.extend({ permission_key: z.literal(FIELD_WORKER_UNDO_ENDING_PERMISSION_KEY) }),
    decided_on: dateSchema,
    undone_event_id: z.string().uuid(),
  })
  .strict();

export const FIELD_WORKER_ENDING_APPEAL_EVENT_TYPES = [
  'field_worker_ending_appeal.lodged',
  'field_worker_ending_appeal.allowed',
  'field_worker_ending_appeal.refused',
  'field_worker_ending_appeal.withdrawn',
  'field_worker_ending_appeal.superseded',
] as const;
export type FieldWorkerEndingAppealEventType = (typeof FIELD_WORKER_ENDING_APPEAL_EVENT_TYPES)[number];

export const FIELD_WORKER_ENDING_APPEAL_EVENT_PAYLOAD_SCHEMAS = {
  'field_worker_ending_appeal.lodged': FieldWorkerEndingAppealLodgedPayloadSchema,
  'field_worker_ending_appeal.allowed': FieldWorkerEndingAppealAllowedPayloadSchema,
  'field_worker_ending_appeal.refused': FieldWorkerEndingAppealRefusedPayloadSchema,
  'field_worker_ending_appeal.withdrawn': FieldWorkerEndingAppealWithdrawnPayloadSchema,
  'field_worker_ending_appeal.superseded': FieldWorkerEndingAppealSupersededPayloadSchema,
} as const satisfies Record<FieldWorkerEndingAppealEventType, z.ZodTypeAny>;
