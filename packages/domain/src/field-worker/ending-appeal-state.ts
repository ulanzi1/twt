// The appeal's state table and its pure checks (Story 13.1f; decision `2026-11-16-464` AD7, AD9). PURE — no SQL, no clock.
//
// `(none) → open` (lodged); `open → allowed | refused | withdrawn | superseded`; the four final states are frozen (0207's guard backs
// it). The pure AD9 checks every writer of the appeal shares live here — the actor kind, and the hearer — so `commands.ts` (the allowed
// decision and the slip's undo) and `ending-appeal-commands.ts` (lodge, refuse, withdraw) judge them identically without an import cycle.

import type { VerifiedAuthorization } from '../rbac/check.js';
import type { FieldWorkerEndingAppealHearer, FieldWorkerEndingAppealState } from '../schema/field_worker_ending_appeals.js';
import { FieldWorkerAppealWrongHearerError, FieldWorkerProjectorInputError } from './errors.js';
import {
  FIELD_WORKER_HEAR_ENDING_APPEAL_AS_PANEL_PERMISSION_KEY,
  FIELD_WORKER_HEAR_KEY_BY_HEARER,
  type FieldWorkerEndingAppealEventType,
} from './ending-appeal-events.js';

export {
  FIELD_WORKER_ENDING_APPEAL_CHANNELS,
  FIELD_WORKER_ENDING_APPEAL_HEARERS,
  FIELD_WORKER_ENDING_APPEAL_STATES,
  type FieldWorkerEndingAppealChannel,
  type FieldWorkerEndingAppealHearer,
  type FieldWorkerEndingAppealState,
} from '../schema/field_worker_ending_appeals.js';

/** A transition event type (the lodging is the projector's genesis). */
export type FieldWorkerEndingAppealTransitionEventType = Exclude<FieldWorkerEndingAppealEventType, 'field_worker_ending_appeal.lodged'>;

const TRANSITIONS: Record<FieldWorkerEndingAppealTransitionEventType, FieldWorkerEndingAppealState> = {
  'field_worker_ending_appeal.allowed': 'allowed',
  'field_worker_ending_appeal.refused': 'refused',
  'field_worker_ending_appeal.withdrawn': 'withdrawn',
  'field_worker_ending_appeal.superseded': 'superseded',
};

/** The target of `eventType` from `state`, or `null` (only an OPEN appeal moves, and only to a final state). */
export function nextEndingAppealState(state: FieldWorkerEndingAppealState, eventType: string): FieldWorkerEndingAppealState | null {
  if (state !== 'open') return null;
  return (TRANSITIONS as Record<string, FieldWorkerEndingAppealState | undefined>)[eventType] ?? null;
}

/**
 * The actor KIND rule (AD9): an act under the Panel's hear key is the Panel's — `actor: 'trustee'`; every other act in this story is
 * `'operator'`. The handler derives it from the authorization's key; this refuses a mismatch (`_as_panel` with `'operator'`, or
 * `'trustee'` with another key) as the human-actor check does.
 */
export function assertAppealActorKind(eventType: string, actor: 'operator' | 'trustee', permissionKey: string): void {
  const expected = permissionKey === FIELD_WORKER_HEAR_ENDING_APPEAL_AS_PANEL_PERMISSION_KEY ? 'trustee' : 'operator';
  if (actor !== expected) {
    throw new FieldWorkerProjectorInputError(`[${eventType}] an act under '${permissionKey}' is written by actor '${expected}', not '${actor}' (AD9)`);
  }
}

/**
 * AD9's hearer check: the VERIFIED authorization's key is the one `heardBy` names, and a Panel act never comes from a `global` grant
 * (a super admin derives the Panel's key but never acts as the Panel). ⇒ `FieldWorkerAppealWrongHearerError`.
 */
export function assertAppealHearer(fieldWorkerId: string, heardBy: FieldWorkerEndingAppealHearer, authorization: VerifiedAuthorization): void {
  if (authorization.permissionKey !== FIELD_WORKER_HEAR_KEY_BY_HEARER[heardBy]) {
    throw new FieldWorkerAppealWrongHearerError(fieldWorkerId, heardBy);
  }
  if (authorization.permissionKey === FIELD_WORKER_HEAR_ENDING_APPEAL_AS_PANEL_PERMISSION_KEY && authorization.grant.dimension === 'global') {
    throw new FieldWorkerAppealWrongHearerError(fieldWorkerId, heardBy);
  }
}
