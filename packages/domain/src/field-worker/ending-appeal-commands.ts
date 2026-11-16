// The appeal's lodge, refusal and withdrawal — Story 13.1f (decision `2026-11-16-464` AD7, AD9; the Panel's `-454` Q1 A: "recorded by the
// officer who hears it"). The ALLOWED decision is `allowFieldWorkerEndingAppeal` in `commands.ts` (it undoes the ending through the private
// core — AD2, TR17); the refusal and the withdrawal share its preamble (`lockAppealForDecision`). This file imports from `commands.ts`
// (`lockFieldWorkerRow`, `verifiedSnapshot`, `istToday`, `lockAppealForDecision` — none writes, 13.1d CR19) and `commands.ts` imports
// nothing from it.
//
// LODGE, under the worker lock, in this order (AC5 (i); unit-pinned): (0) pure — the actor (QE7), the hear-key authorization, the actor
// kind (AD9), the version and the dates well-formed, the channel; then WORKER LOCK → CURRENT ENDING → (1) `terminated` ⇒ illegal
// transition; (2) the ending is the one the officer saw ⇒ `FieldWorkerEndingChangedError`; (3) the key is the IN-LOCK ending's hearer's
// (never the gate's pre-read — a re-end between gate and lock makes it stale), never a Panel act from a `global` grant ⇒
// `FieldWorkerAppealWrongHearerError`, and the target is the locked district; (4) no open appeal ⇒ `FieldWorkerAppealOpenError`; (5) fewer
// REFUSED appeals on this ending than `FIELD_WORKER_APPEALS_PER_ENDING` ⇒ `FieldWorkerAppealAlreadyDecidedError`; (6) `received_on` not
// after today and not before the registration day (IST, SQL — TR4) ⇒ `FieldWorkerAppealDateInvalidError` — NOT bounded by `ended_on` (a
// worker told of an ending can appeal before it is recorded). The command takes NO `heardBy` input (AC5 (j)).

import type pg from 'pg';

import type { FieldWorkerEndingAppealId, FieldWorkerId, PariwarId } from '../ids/index.js';
import type { VerifiedAuthorization } from '../rbac/check.js';
import { FIELD_WORKER_ENDING_APPEAL_CHANNELS } from '../schema/field_worker_ending_appeals.js';
import {
  istToday,
  lockAppealForDecision,
  lockFieldWorkerRow,
  verifiedSnapshot,
  type FieldWorkerAppealDecisionInput,
} from './commands.js';
import { FIELD_WORKER_APPEALS_PER_ENDING } from './ending-appeal-events.js';
import { countRefusedAppealsOfEnding, lockOpenEndingAppealOfWorker } from './ending-appeal-lock.js';
import { projectEndingAppealLodged, projectEndingAppealTransition } from './ending-appeal-project.js';
import { assertAppealActorKind, assertAppealHearer } from './ending-appeal-state.js';
import {
  FieldWorkerAppealAlreadyDecidedError,
  FieldWorkerAppealDateInvalidError,
  FieldWorkerAppealOpenError,
  FieldWorkerAuthorizationStaleError,
  FieldWorkerEndingChangedError,
  FieldWorkerGenesisMissingError,
  FieldWorkerIllegalTransitionError,
  FieldWorkerProjectorInputError,
} from './errors.js';
import { FIELD_WORKER_HEAR_APPEAL_PERMISSION_KEYS, isCalendarDateString } from './events.js';
import { assertFieldWorkerActor } from './project.js';
import { getCurrentFieldWorkerEndingLocked } from './read.js';

export { FIELD_WORKER_APPEALS_PER_ENDING };
export type { FieldWorkerAppealDecisionInput };

export interface LodgeFieldWorkerEndingAppealInput {
  pariwarId: PariwarId;
  fieldWorkerId: FieldWorkerId;
  /** Caller-minted — the appeal's id and stream id. */
  appealId: FieldWorkerEndingAppealId;
  /** REQUIRED — the caller's `withCompensatingAudit` intent id (QE14). */
  auditId: string;
  /** `'trustee'` under the Panel's key, `'operator'` under the Pariwar Admin's (AD9). */
  actor: 'operator' | 'trustee';
  actorId: string;
  /** `request.authorizations[<the hear key the gate matched>]`, passed on unchanged. */
  authorization: VerifiedAuthorization;
  /** The worker's `state_event_version` as the officer's screen showed it — the ending appealed (AD7's D7 guard). */
  expectedEndingVersion: number;
  /** The day the worker appealed (`YYYY-MM-DD`, IST), on the officer's word. */
  receivedOn: string;
  /** `phone` | `in_person` (`-454`). */
  receivedVia: string;
}

/** What a lodge returns. */
export interface LodgeFieldWorkerEndingAppealResult {
  appealId: FieldWorkerEndingAppealId;
  eventId: string;
}

/**
 * Lodge an appeal against the worker's CURRENT ending (AD7, AD9) — heard by the hearer fixed at that ending (AD8, read in-lock through
 * AD17). One open appeal per worker; one appeal per ending (a refused one bars another). The ender MAY lodge (recorded as the lodger).
 * @throws FieldWorkerIllegalTransitionError, FieldWorkerEndingChangedError, FieldWorkerAppealWrongHearerError, FieldWorkerAppealOpenError,
 *         FieldWorkerAppealAlreadyDecidedError, FieldWorkerAppealDateInvalidError (+ the shared guards).
 */
export async function lodgeFieldWorkerEndingAppeal(
  client: pg.PoolClient,
  i: LodgeFieldWorkerEndingAppealInput,
): Promise<LodgeFieldWorkerEndingAppealResult> {
  const eventType = 'field_worker_ending_appeal.lodged' as const;
  assertFieldWorkerActor(eventType, i.actor, i.actorId);
  const authorization = verifiedSnapshot(eventType, i.authorization, i, { permissionKeys: FIELD_WORKER_HEAR_APPEAL_PERMISSION_KEYS });
  assertAppealActorKind(eventType, i.actor, authorization.permission_key);
  if (!Number.isSafeInteger(i.expectedEndingVersion) || i.expectedEndingVersion < 2) {
    throw new FieldWorkerProjectorInputError(`[${eventType}] the expected ending version is missing or malformed (AD7)`);
  }
  if (typeof i.receivedOn !== 'string' || !isCalendarDateString(i.receivedOn)) {
    throw new FieldWorkerAppealDateInvalidError('received_on', 'missing_or_malformed');
  }
  if (!(FIELD_WORKER_ENDING_APPEAL_CHANNELS as readonly string[]).includes(i.receivedVia)) {
    throw new FieldWorkerProjectorInputError(`[${eventType}] received_via must be one of ${FIELD_WORKER_ENDING_APPEAL_CHANNELS.join(', ')}`);
  }

  const row = await lockFieldWorkerRow(client, i.pariwarId, i.fieldWorkerId);
  if (row === null) throw new FieldWorkerGenesisMissingError(i.fieldWorkerId);
  // (1)
  if (row.currentState !== 'terminated') throw new FieldWorkerIllegalTransitionError(i.fieldWorkerId, row.currentState, eventType);
  // (2)
  if (row.stateEventVersion !== i.expectedEndingVersion) throw new FieldWorkerEndingChangedError(i.fieldWorkerId, i.expectedEndingVersion);
  // (3) — the IN-LOCK hearer (AD17), never the gate's.
  const ending = await getCurrentFieldWorkerEndingLocked(client, i.pariwarId, i.fieldWorkerId);
  if (ending === null || ending.endingVersion !== row.stateEventVersion) {
    throw new FieldWorkerProjectorInputError(`[${eventType}] field worker ${i.fieldWorkerId}: the terminated row has no current ending event`);
  }
  assertAppealHearer(i.fieldWorkerId, ending.heardBy, i.authorization);
  if (authorization.target.value !== row.district) throw new FieldWorkerAuthorizationStaleError(i.fieldWorkerId, authorization.target.value);
  // (4)
  if ((await lockOpenEndingAppealOfWorker(client, i.pariwarId, i.fieldWorkerId)) !== null) throw new FieldWorkerAppealOpenError(i.fieldWorkerId);
  // (5)
  if ((await countRefusedAppealsOfEnding(client, i.pariwarId, i.fieldWorkerId, row.stateEventVersion)) >= FIELD_WORKER_APPEALS_PER_ENDING) {
    throw new FieldWorkerAppealAlreadyDecidedError(i.fieldWorkerId, row.stateEventVersion);
  }
  // (6) — IST, on the transaction clock (TR4). The registration day is the row's `created_at` IST day = the genesis event's (one transaction).
  const today = await istToday(client);
  if (i.receivedOn > today) throw new FieldWorkerAppealDateInvalidError('received_on', 'in_future');
  if (i.receivedOn < row.registeredOn) throw new FieldWorkerAppealDateInvalidError('received_on', 'before_registration');

  const { eventId } = await projectEndingAppealLodged(client, {
    pariwarId: i.pariwarId,
    appealId: i.appealId,
    payload: {
      from_state: null,
      to_state: 'open',
      actor: i.actor,
      field_worker_id: i.fieldWorkerId,
      heard_by: ending.heardBy,
      authorization,
      ending_event_version: row.stateEventVersion,
      received_on: i.receivedOn,
      received_via: i.receivedVia,
    },
    actorId: i.actorId,
    endedByUserId: ending.endedByUserId,
    auditId: i.auditId,
  });
  return { appealId: i.appealId, eventId };
}

/** What a refusal or a withdrawal returns. */
export interface FieldWorkerAppealClosedResult {
  appealId: FieldWorkerEndingAppealId;
  fieldWorkerId: FieldWorkerId;
  eventVersion: number;
  state: 'refused' | 'withdrawn';
}

async function closeAppeal(
  client: pg.PoolClient,
  eventType: 'field_worker_ending_appeal.refused' | 'field_worker_ending_appeal.withdrawn',
  i: FieldWorkerAppealDecisionInput,
): Promise<FieldWorkerAppealClosedResult> {
  const { appeal, authorization } = await lockAppealForDecision(client, eventType, i);
  const toState = eventType === 'field_worker_ending_appeal.refused' ? 'refused' : 'withdrawn';
  const t = await projectEndingAppealTransition(client, {
    pariwarId: i.pariwarId,
    eventType,
    payload: {
      from_state: 'open',
      to_state: toState,
      actor: i.actor,
      field_worker_id: appeal.fieldWorkerId,
      heard_by: appeal.heardBy,
      authorization,
      decided_on: i.decidedOn,
    },
    actorId: i.actorId,
    auditId: i.auditId,
    lockedRow: appeal,
  });
  return { appealId: i.appealId, fieldWorkerId: appeal.fieldWorkerId, eventVersion: t.eventVersion, state: toState };
}

/**
 * The hearer REFUSES an appeal (AD9): the worker stays ended; under `FIELD_WORKER_APPEALS_PER_ENDING` no new appeal on this ending.
 * @throws FieldWorkerAppealMissingError, FieldWorkerAppealWrongHearerError, FieldWorkerAppealNotOpenError, FieldWorkerAppealDeciderIsEnderError,
 *         FieldWorkerAppealDateInvalidError (+ the shared guards).
 */
export async function refuseFieldWorkerEndingAppeal(client: pg.PoolClient, i: FieldWorkerAppealDecisionInput): Promise<FieldWorkerAppealClosedResult> {
  return closeAppeal(client, 'field_worker_ending_appeal.refused', i);
}

/**
 * The worker WITHDRAWS their appeal and the hearer records it (AD9): closed, it counts for nothing — a new appeal may be lodged.
 * @throws as `refuseFieldWorkerEndingAppeal`.
 */
export async function withdrawFieldWorkerEndingAppeal(client: pg.PoolClient, i: FieldWorkerAppealDecisionInput): Promise<FieldWorkerAppealClosedResult> {
  return closeAppeal(client, 'field_worker_ending_appeal.withdrawn', i);
}
