// The field-worker commands — Story 13.1 (QE5, QE7, QE13, QE14, QE17, QE18, QE20; AC5); Story 13.1f adds the undo of an ending and the
// allowed appeal (`undoFieldWorkerEnding`, `allowFieldWorkerEndingAppeal` — AD2, AD9). The ONLY public writers of the worker's stream.
//
// Copy of the SHIPPED `marketplace/commands.ts` lock / SAVEPOINT shape: the pure guards run first (no SQL); then, inside
// ONE savepoint, the row is locked `FOR UPDATE` (QE13), the guards are judged against the LOCKED row, and the projector
// appends + re-projects. A failed guard rolls the savepoint back — no event, the row unchanged, the caller's transaction
// usable. ⛔ A retry loop (the module's is lead-specific). ⛔ `withCompensatingAudit` (QE14): every command takes the
// caller's REQUIRED `auditId`.
//
// ── Statement order, pinned by `tests/field-worker/commands-guards.test.ts` (I13) ────────────────────
//   SAVEPOINT → LOCK → HEAD → APPEND → UPDATE      (`terminate`: SAVEPOINT → LOCK → NOW → HEAD → APPEND → UPDATE)
//   Story 13.1f — the undo (AD2): SAVEPOINT → LOCK → STREAM → HEAD → UNDONE-EVENT → APPEND → GUARD ON → UNDO ON → UPDATE → UNDO OFF →
//   GUARD OFF → RELEASE, then for a SLIP only: APPEAL LOCK → (an open one) NOW → appeal APPEND → appeal UPDATE. The ALLOWED appeal first
//   takes APPEAL-WORKER (unlocked) → WORKER LOCK → APPEAL LOCK → NOW (TR5), then the undo's sequence (its LOCK re-locks a row already
//   held), then the appeal's APPEND → UPDATE after RELEASE.
// ⚠ The caller's transaction must be READ COMMITTED — under REPEATABLE READ a lock waiter gets an untyped 40001.
//
// ── Guard order, in EVERY command (QE5; pinned by a test) ─────────────────────────────────────────
//   (0)  actor + actorId (QE7) — and, on EVERY one of the seven commands (Story 13.1c AD3 added `suspend`, `reactivate` and `terminate`
//        to the four that already carried one), the authorization's PROVENANCE (a VERIFIED result of the RBAC check), its Pariwar and
//        actor (= the command's), its dimension
//        (`district`) — and its KEY: `field_worker.register` (+ the target) on `register`; `field_worker.approve` on
//        `kyc_completed` / `activated` (Story 13.1a AD3); one of `FIELD_WORKER_MOVE_PERMISSION_KEYS` on `post` (13.1c AD4 —
//        `field_worker.register` is REFUSED); `field_worker.suspend` / `.reactivate` / `.terminate` on their acts (13.1c AD3) —
//        and, on `activated`, a non-blank `approvedByDisplay` (13.1a, decision `-447` item 2), and on `post` a non-blank
//        `expectedFromDistrict` (13.1c AD4) — pure, BEFORE the lock ⇒ `FieldWorkerProjectorInputError`;
//   (0b) `terminate`: `ended_on` present, `YYYY-MM-DD`, a real date — pure ⇒ `FieldWorkerEndedOnInvalidError`;
//   under the lock:
//   (1)  the row exists in this Pariwar ⇒ `FieldWorkerGenesisMissingError`;
//   (2)  the (state, event) pair is legal ⇒ `FieldWorkerIllegalTransitionError` (anything out of `terminated`, and a
//        repeated `kyc_completed` on an `active` worker);
//   (3)  the KYC guard ⇒ `FieldWorkerKycAlreadyCompletedError` / `FieldWorkerKycNotCompletedError`;
//   (3a) `post`: the LOCKED district is the one the admin saw (`expectedFromDistrict` — 13.1 D7, 13.1c AD4) ⇒
//        `FieldWorkerAuthorizationStaleError`;
//   (3b) `post`: the district differs ⇒ `FieldWorkerDistrictUnchangedError`;
//   (3c) `post`: the authorization targets `toDistrict` or the LOCKED district ⇒ `FieldWorkerAuthorizationStaleError`;
//   (3d) `kyc_completed` / `activated` / `suspended` / `reactivated` / `terminated`: the authorization targets the LOCKED district
//        (13.1a AD3, 13.1c AD3 — the gate read the district BEFORE the lock; a concurrent move would write a false target into an
//        append-only log) ⇒ `FieldWorkerAuthorizationStaleError`;
//   (4)  the reason (suspend, terminate, post) ⇒ `FieldWorkerReasonInvalidError`;
//   (5)  `terminate`: the IST bounds — not after today, not before the registration day ⇒ `FieldWorkerEndedOnInvalidError`.
//   Story 13.1f — the undo REPLACES step (2) through `resolveTarget` (TR14): (2′) the row is `terminated` ⇒ `FieldWorkerIllegalTransitionError`;
//   then its guard: (2a) the locked version is the ending the officer saw ⇒ `FieldWorkerEndingChangedError`; (3d) the target; then the
//   target itself — the fold of the stream PREFIX before the latest ending, checked against that ending's `from_state` (a mismatch is a
//   corrupt stream ⇒ `FieldWorkerProjectorInputError`, a 500).
//
// ── Side effects AFTER the transition, on the SAME client (the `activate` code-SMS shape) ─────────
// `activate` records the code SMS as due (13.1b). Story 13.1d (AD3, AD4, AD9): a DIRECT move (`post` under `field_worker.move` ONLY —
// the acceptance's key `field_worker.answer_move_request` has nothing else to supersede) supersedes the worker's open move request and
// tells both districts' District Admins; `terminate` supersedes it and tells its opener and the other end. Each runs after
// `runLockedTransition` returns — the worker's row lock is still held, so the request's lock is taken second (I5) — and a failure there
// fails the CALLER's transaction whole (⛔ inside `runLockedTransition`'s savepoint, ⛔ a swallowed error).

import type pg from 'pg';

import type { FieldWorkerEndingAppealId, FieldWorkerId, PariwarId } from '../ids/index.js';
import { rollbackToSavepoint } from '../marketplace/project.js';
import { isVerifiedAuthorization, type VerifiedAuthorization } from '../rbac/check.js';
import type { FieldWorkerEndingAppealHearer } from '../schema/field_worker_ending_appeals.js';
import type { FieldWorkerKycStatus, FieldWorkerReasonCode, FieldWorkerState } from '../schema/field_workers.js';
import { enqueueFieldWorkerCodeSms } from './code-sms.js';
import {
  FIELD_WORKER_ENDING_APPEAL_EVENT_TYPES,
  FIELD_WORKER_UNDO_ENDING_PERMISSION_KEY,
  type FieldWorkerEndingAppealEventType,
} from './ending-appeal-events.js';
import {
  appealWorkerOf,
  lockEndingAppealRow,
  type EndingAppealLockedRow,
} from './ending-appeal-lock.js';
import { projectEndingAppealTransition } from './ending-appeal-project.js';
import { assertAppealActorKind, assertAppealHearer } from './ending-appeal-state.js';
import { supersedeOpenEndingAppeal } from './ending-appeal-supersede.js';
import {
  FieldWorkerAppealDateInvalidError,
  FieldWorkerAppealDeciderIsEnderError,
  FieldWorkerAppealMissingError,
  FieldWorkerAppealNotOpenError,
  FieldWorkerEndedOnInvalidError,
  FieldWorkerEndingChangedError,
  FieldWorkerAuthorizationStaleError,
  FieldWorkerDistrictUnchangedError,
  FieldWorkerGenesisMissingError,
  FieldWorkerIllegalTransitionError,
  FieldWorkerKycAlreadyCompletedError,
  FieldWorkerKycNotCompletedError,
  FieldWorkerProjectorInputError,
  FieldWorkerReasonInvalidError,
} from './errors.js';
import {
  FIELD_WORKER_HEAR_APPEAL_PERMISSION_KEYS,
  FIELD_WORKER_MOVE_PERMISSION_KEYS,
  FIELD_WORKER_POST_REASONS,
  FIELD_WORKER_SUSPEND_REASONS,
  FIELD_WORKER_TERMINATE_REASONS,
  FIELD_WORKER_UNDO_PERMISSION_KEYS,
  fieldWorkerAppealHeardBySchema,
  isCalendarDateString,
  type FieldWorkerAuthorizationSnapshot,
  type FieldWorkerEventType,
  type FieldWorkerUndoCause,
} from './events.js';
import type { FieldWorkerMoveRequestEventType } from './move-request-events.js';
import {
  assertFieldWorkerActor,
  projectFieldWorkerGenesis,
  projectFieldWorkerTransition,
  type FieldWorkerLockedRow,
  type FieldWorkerTransitionEventType,
  type FieldWorkerTransitionResult,
  type ProjectFieldWorkerGenesisResult,
} from './project.js';
import { afterDirectMove, afterEnding } from './move-request-supersede.js';
import { foldFieldWorkerProjection, nextFieldWorkerState, type FieldWorkerReplayEvent } from './state.js';

export type { FieldWorkerTransitionResult, ProjectFieldWorkerGenesisResult } from './project.js';
export type { EndingAppealLockedRow } from './ending-appeal-lock.js';

/** The ONE permission key whose verified result `registerFieldWorker` accepts (QE10). */
export const FIELD_WORKER_REGISTER_PERMISSION_KEY = 'field_worker.register';

/** The ONE permission key whose verified result `recordFieldWorkerKycCompleted` and `activateFieldWorker` accept (Story 13.1a AD3, AD6). */
export const FIELD_WORKER_APPROVE_PERMISSION_KEY = 'field_worker.approve';

/**
 * The keys whose verified result `postFieldWorker` accepts (Story 13.1c AD4; 13.1 C5 / C10): `field_worker.move` (the direct move)
 * and `field_worker.answer_move_request` (Story 13.1d's acceptance — AD4). Defined in `events.ts` (`posted`'s schema pins it, R2-D1);
 * re-exported here. `field_worker.register` is ⛔ here, and refused by a test.
 */
export { FIELD_WORKER_MOVE_PERMISSION_KEYS };

/** Story 13.1f (AD2) — the keys whose verified result may undo an ending; defined in `events.ts` (the event's schema pins it). */
export { FIELD_WORKER_UNDO_PERMISSION_KEYS };

/** The ONE permission key each lifecycle act accepts (Story 13.1c AD3, AD5 — one key per act, 13.1 QE10). */
export const FIELD_WORKER_SUSPEND_PERMISSION_KEY = 'field_worker.suspend';
export const FIELD_WORKER_REACTIVATE_PERMISSION_KEY = 'field_worker.reactivate';
export const FIELD_WORKER_TERMINATE_PERMISSION_KEY = 'field_worker.terminate';

/** What every command takes. Human only: `actor` ∈ {operator, trustee}, `actorId` non-null (QE7). */
export interface FieldWorkerCommandBase {
  pariwarId: PariwarId;
  fieldWorkerId: FieldWorkerId;
  /** REQUIRED — the caller's `withCompensatingAudit` intent id (QE14); the row's `audit_id` after this command. */
  auditId: string;
  actor: 'operator' | 'trustee';
  actorId: string;
}

// ── The locked row (QE13) ──────────────────────────────────────────────────────────────────────────

/**
 * The row columns the lock reads — ONE list (the twin's `MODULE_GUARD_COLUMNS` shape; ⛔ the gate's `GUARDED_COLUMNS`).
 * `ended_on` and the registration DAY are read as TEXT, the day in IST (QE20 — no `pg` date parser is set, and a JS `Date`
 * at local midnight shifts a day in IST).
 */
export const FIELD_WORKER_GUARD_COLUMNS =
  "current_state, state_event_version, kyc_status, state_reason_code, district, ended_on::text AS ended_on, (created_at AT TIME ZONE 'Asia/Kolkata')::date::text AS registered_on";

interface LockedRowRaw {
  current_state: FieldWorkerState;
  state_event_version: string | number;
  kyc_status: FieldWorkerKycStatus;
  state_reason_code: FieldWorkerReasonCode | null;
  district: string;
  ended_on: string | null;
  registered_on: string;
}

/**
 * `SELECT … FOR UPDATE` on the worker row (QE13). Under twt_app this needs the UPDATE grant + policy. Exported for Story 13.1d's
 * request commands, which lock the WORKER first and the request second (AD4, I5).
 */
export async function lockFieldWorkerRow(
  client: pg.PoolClient,
  pariwarId: PariwarId,
  fieldWorkerId: FieldWorkerId,
): Promise<FieldWorkerLockedRow | null> {
  const res = await client.query<LockedRowRaw>(
    `SELECT ${FIELD_WORKER_GUARD_COLUMNS} FROM field_workers WHERE field_worker_id = $1 AND pariwar_id = $2 FOR UPDATE`,
    [fieldWorkerId, pariwarId],
  );
  const r = res.rows[0];
  if (!r) return null;
  return {
    currentState: r.current_state,
    stateEventVersion: Number(r.state_event_version),
    kycStatus: r.kyc_status,
    stateReasonCode: r.state_reason_code,
    district: r.district,
    endedOn: r.ended_on,
    registeredOn: r.registered_on,
  };
}

/**
 * The IST calendar day of the TRANSACTION-START clock (`now()` — the same clock as `occurred_at`; ⛔ `clock_timestamp()`). Exported for
 * Story 13.1f's appeal commands (their date bounds — TR4); it writes nothing (13.1d CR19's rule), and the barrel's header names it.
 */
export async function istToday(client: pg.PoolClient): Promise<string> {
  const res = await client.query<{ ist_today: string }>("SELECT (now() AT TIME ZONE 'Asia/Kolkata')::date::text AS ist_today");
  const day = res.rows[0]?.ist_today;
  if (typeof day !== 'string') throw new Error('[field-worker] the IST day query returned no row');
  return day;
}

// ── The authorization (QE18) ───────────────────────────────────────────────────────────────────────

/**
 * Guard (0)'s authorization half — PURE. Refuses anything that is not a VERIFIED result of the RBAC check (an object
 * literal with the same fields is refused), one for another Pariwar or actor, one not checked at `district`, and — when
 * `expected` names them — the wrong key or target. Returns the snake_case payload snapshot.
 */
export function verifiedSnapshot(
  // The three vocabularies (Story 13.1d widened it for the request commands, Story 13.1f for the appeal's; code review CR19 — ⛔ a bare
  // `string`, which loses the check).
  eventType: FieldWorkerEventType | FieldWorkerMoveRequestEventType | FieldWorkerEndingAppealEventType,
  authorization: unknown,
  i: { pariwarId: string; actorId: string },
  // ONE of the two is REQUIRED (review R2-13): with neither, any verified district-dimension key would be accepted (the hole `post` had).
  expected: ({ permissionKey: string; permissionKeys?: never } | { permissionKeys: readonly string[]; permissionKey?: never }) & { targetValue?: string },
): FieldWorkerAuthorizationSnapshot {
  if (!isVerifiedAuthorization(authorization)) {
    throw new FieldWorkerProjectorInputError(
      `[${eventType}] the authorization is missing or is not a verified result of the RBAC check (QE18)`,
    );
  }
  const a: VerifiedAuthorization = authorization;
  // The type requires one of the two keys; a cast or a loosely typed `expected` must not slip past it at runtime either (review RP-7).
  if (expected.permissionKey === undefined && expected.permissionKeys === undefined) {
    throw new FieldWorkerProjectorInputError(`[${eventType}] no expected permission key was named for this act (QE18)`);
  }
  if (a.pariwarId !== i.pariwarId || a.actorId !== i.actorId) {
    throw new FieldWorkerProjectorInputError(`[${eventType}] the authorization is for another Pariwar or actor (QE18)`);
  }
  if (a.target.dimension !== 'district' || typeof a.target.value !== 'string') {
    throw new FieldWorkerProjectorInputError(`[${eventType}] the authorization was not checked at the district dimension (QE18)`);
  }
  if (expected.permissionKey !== undefined && a.permissionKey !== expected.permissionKey) {
    throw new FieldWorkerProjectorInputError(`[${eventType}] the authorization is for '${a.permissionKey}', not this act (QE18)`);
  }
  if (expected.permissionKeys !== undefined && !expected.permissionKeys.includes(a.permissionKey)) {
    throw new FieldWorkerProjectorInputError(`[${eventType}] the authorization is for '${a.permissionKey}', not this act (QE18)`);
  }
  if (expected.targetValue !== undefined && a.target.value !== expected.targetValue) {
    throw new FieldWorkerProjectorInputError(`[${eventType}] the authorization targets another district than this act's (QE18)`);
  }
  return {
    permission_key: a.permissionKey,
    role: a.role,
    grant:
      a.grant.grantId === undefined
        ? { dimension: a.grant.dimension, value: a.grant.value }
        : { dimension: a.grant.dimension, value: a.grant.value, grant_id: a.grant.grantId },
    target: { dimension: a.target.dimension, value: a.target.value },
    catalog_version: a.catalogVersion,
  };
}

// ── Genesis ────────────────────────────────────────────────────────────────────────────────────────

export interface RegisterFieldWorkerInput extends FieldWorkerCommandBase {
  /** Sealed in the API layer BEFORE this call (QE4) — opaque strings. */
  nameCiphertext: string;
  mobileCiphertext: string;
  mobileBlindIndex: string;
  /** The admin's `users.display_name` (6.11 R5) — ⛔ a fallback. */
  registeredByDisplay: string;
  /** The REPORTING district (QE17) — LISTED (the caller ran `assertDistrictRecorded`) and byte-equal to the gate's target. */
  district: string;
  /** The VERIFIED result the gate stored on `request.authorizations['field_worker.register']` — ⛔ a recomputation. */
  authorization: VerifiedAuthorization;
  /**
   * Story 13.1f (AD12; `-454` Q2 B) — the earlier ENDED record of this Pariwar the officer linked this registration to. The API
   * validated it (terminated, the same number) under `FOR SHARE` in this transaction; the composite FK re-checks the Pariwar.
   */
  previousFieldWorkerId?: FieldWorkerId;
}

/**
 * Register a field worker: `(none) → pending_kyc`, `kyc_status = pending`. Runs guard (0) — the actor, then the
 * authorization (key `field_worker.register`, dimension `district`, target = `district`, byte-equal) — then
 * `projectFieldWorkerGenesis`. Takes ⛔ row lock: there is no row yet, and a race is decided by the 23505.
 *
 * @throws FieldWorkerProjectorInputError (+ the projector's: GenesisAlreadyExists, MobileAlreadyRegistered, Persist).
 */
export async function registerFieldWorker(
  client: pg.PoolClient,
  i: RegisterFieldWorkerInput,
): Promise<ProjectFieldWorkerGenesisResult> {
  assertFieldWorkerActor('field_worker.registered', i.actor, i.actorId);
  const authorization = verifiedSnapshot('field_worker.registered', i.authorization, i, {
    permissionKey: FIELD_WORKER_REGISTER_PERMISSION_KEY,
    targetValue: i.district,
  });
  return projectFieldWorkerGenesis(client, {
    pariwarId: i.pariwarId,
    fieldWorkerId: i.fieldWorkerId,
    nameCiphertext: i.nameCiphertext,
    mobileCiphertext: i.mobileCiphertext,
    mobileBlindIndex: i.mobileBlindIndex,
    registeredByDisplay: i.registeredByDisplay,
    district: i.district,
    authorization,
    auditId: i.auditId,
    actor: i.actor,
    actorId: i.actorId,
    ...(i.previousFieldWorkerId === undefined ? {} : { previousFieldWorkerId: i.previousFieldWorkerId }),
  });
}

// ── Transitions ────────────────────────────────────────────────────────────────────────────────────

const TRANSITION_SAVEPOINT = 'field_worker_transition';

/**
 * Story 13.1f (AD2, TR14) — the undo's target hook. Given it, the runner's legality step is `row.currentState === 'terminated'` (⛔ the
 * table — it answers `null` for every undo) and the target comes from the hook, AFTER the command's guard: its `toState` and the payload
 * keys it computes (the restored reason). Nothing comes from the caller.
 */
type ResolveTarget = (row: FieldWorkerLockedRow) => Promise<{ toState: FieldWorkerState; extraPayload: Record<string, unknown> }>;

/**
 * SAVEPOINT → lock → (1) present → (2) legal → `guard(row)` (3…5) → build the payload → project, inside one savepoint.
 * `guard` may run SQL (terminate's NOW step) and returns the payload's extra keys. `trigger` is a constant, or is computed FROM
 * those keys — so a reason reaches the trigger only once its guard has VALIDATED it (review R3-20: ⛔ `String(<raw input>)`).
 * `approvedByDisplay` is `activate`'s row-only snapshot (13.1a, `-447` item 2) — ⛔ a payload key. `resolveTarget` is the undo's
 * (Story 13.1f): it REPLACES step (2) and the target (TR14).
 */
async function runLockedTransition(
  client: pg.PoolClient,
  i: FieldWorkerCommandBase,
  eventType: FieldWorkerTransitionEventType,
  guard: (row: FieldWorkerLockedRow) => Promise<Record<string, unknown>> | Record<string, unknown>,
  trigger: string | ((extraPayload: Record<string, unknown>) => string),
  opts: { approvedByDisplay?: string; resolveTarget?: ResolveTarget } = {},
): Promise<FieldWorkerTransitionResult> {
  const { approvedByDisplay, resolveTarget } = opts;
  await client.query(`SAVEPOINT ${TRANSITION_SAVEPOINT}`);
  try {
    const row = await lockFieldWorkerRow(client, i.pariwarId, i.fieldWorkerId);
    if (row === null) throw new FieldWorkerGenesisMissingError(i.fieldWorkerId);
    let toState: FieldWorkerState | null;
    let extraPayload: Record<string, unknown>;
    if (resolveTarget === undefined) {
      toState = nextFieldWorkerState(row.currentState, eventType);
      if (toState === null) throw new FieldWorkerIllegalTransitionError(i.fieldWorkerId, row.currentState, eventType);
      extraPayload = await guard(row);
    } else {
      if (row.currentState !== 'terminated') throw new FieldWorkerIllegalTransitionError(i.fieldWorkerId, row.currentState, eventType);
      const guarded = await guard(row);
      const target = await resolveTarget(row);
      toState = target.toState;
      extraPayload = { ...guarded, ...target.extraPayload };
    }
    const triggerValue = typeof trigger === 'string' ? trigger : trigger(extraPayload);

    const result = await projectFieldWorkerTransition(client, {
      pariwarId: i.pariwarId,
      fieldWorkerId: i.fieldWorkerId,
      eventType,
      payload: { from_state: row.currentState, to_state: toState, trigger: triggerValue, actor: i.actor, ...extraPayload },
      auditId: i.auditId,
      actor: i.actor,
      actorId: i.actorId,
      lockedRow: row,
      ...(approvedByDisplay === undefined ? {} : { approvedByDisplay }),
    });
    await client.query(`RELEASE SAVEPOINT ${TRANSITION_SAVEPOINT}`);
    return result;
  } catch (err) {
    await rollbackToSavepoint(client, TRANSITION_SAVEPOINT);
    throw err;
  }
}

function assertReason<T extends string>(eventType: FieldWorkerEventType, reason: unknown, list: readonly T[]): T {
  if (typeof reason !== 'string' || !(list as readonly string[]).includes(reason)) {
    throw new FieldWorkerReasonInvalidError(eventType, reason);
  }
  return reason as T;
}

/** What the approval's two commands take (Story 13.1a AD3): the VERIFIED `field_worker.approve` result the gate stored. */
export interface ApproveFieldWorkerCommandInput extends FieldWorkerCommandBase {
  /** `request.authorizations['field_worker.approve']`, passed on unchanged — ⛔ a recomputation. ONE object for both commands. */
  authorization: VerifiedAuthorization;
}

/** (3d) — the act's target must be the LOCKED row's district (13.1a AD3 for the approval; 13.1c AD3 for suspend, reactivate, terminate). */
function assertLockedTarget(i: FieldWorkerCommandBase, authorization: FieldWorkerAuthorizationSnapshot, row: FieldWorkerLockedRow): void {
  if (authorization.target.value !== row.district) throw new FieldWorkerAuthorizationStaleError(i.fieldWorkerId, authorization.target.value);
}

/**
 * `pending_kyc → pending_kyc`, `kyc_status → completed` — the approving officer accepts the identity check done at the interview
 * (QE8; Story 13.1a AD2). Carries the verified `field_worker.approve` authorization (AD3).
 * @throws FieldWorkerKycAlreadyCompletedError, FieldWorkerAuthorizationStaleError (+ the shared guards).
 */
export async function recordFieldWorkerKycCompleted(
  client: pg.PoolClient,
  i: ApproveFieldWorkerCommandInput,
): Promise<FieldWorkerTransitionResult> {
  assertFieldWorkerActor('field_worker.kyc_completed', i.actor, i.actorId);
  const authorization = verifiedSnapshot('field_worker.kyc_completed', i.authorization, i, {
    permissionKey: FIELD_WORKER_APPROVE_PERMISSION_KEY,
  });
  return runLockedTransition(
    client,
    i,
    'field_worker.kyc_completed',
    (row) => {
      if (row.kycStatus === 'completed') throw new FieldWorkerKycAlreadyCompletedError(i.fieldWorkerId);
      assertLockedTarget(i, authorization, row);
      return { authorization };
    },
    'field_worker.kyc_complete',
  );
}

export interface ActivateFieldWorkerInput extends ApproveFieldWorkerCommandInput {
  /** The approving admin's `users.display_name`, read server-side at the act (6.11 R5; 13.1a `-447` item 2) — ⛔ a fallback. */
  approvedByDisplay: string;
}

/**
 * `pending_kyc → active`, only once KYC is recorded (I5). Carries the verified `field_worker.approve` authorization (13.1a AD3)
 * and writes the approver's display-name snapshot to the row (`-447` item 2). ⭐ Story 13.1b (AD1): it also records the worker's
 * code SMS as DUE, on the caller's client AFTER the transition's savepoint, so the row and the event commit or roll back together
 * and no later caller of this command can forget it (the ONE writer of `field_worker.activated`). ⛔ `ON CONFLICT`: this transition
 * happens once in a worker's life, so a second row is a broken invariant and fails the caller's transaction loudly.
 * @throws FieldWorkerKycNotCompletedError, FieldWorkerAuthorizationStaleError (+ the shared guards).
 */
export async function activateFieldWorker(client: pg.PoolClient, i: ActivateFieldWorkerInput): Promise<FieldWorkerTransitionResult> {
  assertFieldWorkerActor('field_worker.activated', i.actor, i.actorId);
  const authorization = verifiedSnapshot('field_worker.activated', i.authorization, i, {
    permissionKey: FIELD_WORKER_APPROVE_PERMISSION_KEY,
  });
  if (typeof i.approvedByDisplay !== 'string' || i.approvedByDisplay.trim().length === 0) {
    throw new FieldWorkerProjectorInputError("[field_worker.activated] the approving admin's display name is missing (6.11 R5 — no fallback)");
  }
  const result = await runLockedTransition(
    client,
    i,
    'field_worker.activated',
    (row) => {
      if (row.kycStatus !== 'completed') throw new FieldWorkerKycNotCompletedError(i.fieldWorkerId);
      assertLockedTarget(i, authorization, row);
      return { authorization };
    },
    'field_worker.activate',
    { approvedByDisplay: i.approvedByDisplay },
  );
  await enqueueFieldWorkerCodeSms(client, { pariwarId: i.pariwarId, fieldWorkerId: i.fieldWorkerId, activatedAuditId: i.auditId });
  return result;
}

/** What a lifecycle act takes (Story 13.1c AD3): the VERIFIED result of ITS act's key the gate stored — ⛔ a recomputation. */
export interface FieldWorkerLifecycleCommandInput extends FieldWorkerCommandBase {
  /** `request.authorizations['field_worker.<act>']`, passed on unchanged. Its target must be the LOCKED district (3d). */
  authorization: VerifiedAuthorization;
}

export interface SuspendFieldWorkerInput extends FieldWorkerLifecycleCommandInput {
  /** `under_review` | `at_worker_request` (QE12's suspend list). */
  reasonCode: string;
}

export interface TerminateFieldWorkerInput extends FieldWorkerLifecycleCommandInput {
  /** `left_voluntarily` | `inactive` | `registered_in_error` | `died` (QE12's terminate list; `died` — `-455`). */
  reasonCode: string;
  /** The ACTUAL LAST DAY (QE20) — for `died`, the date of death (`-455`); `YYYY-MM-DD`, judged by the IST bounds. */
  endedOn: string;
  /**
   * Story 13.1f (AD8) — who hears an appeal against THIS ending, computed by the terminate route AT THE ACT from the actor's grants
   * (`trustee_panel` if they hold a `pariwar_admin` grant in this Pariwar or are a super admin, else `pariwar_admin`) — never
   * recomputed later, ⛔ read from the snapshot's `role`. REQUIRED: the command refuses a missing one (the SCHEMA keeps it optional so a
   * stored legacy event still parses).
   */
  appealHeardBy: FieldWorkerEndingAppealHearer;
}

/**
 * `active → suspended`, with a suspension reason (QE12). Carries the verified `field_worker.suspend` authorization, its target
 * judged against the LOCKED district (Story 13.1c AD3).
 * @throws FieldWorkerAuthorizationStaleError, FieldWorkerReasonInvalidError (+ the shared guards).
 */
export async function suspendFieldWorker(client: pg.PoolClient, i: SuspendFieldWorkerInput): Promise<FieldWorkerTransitionResult> {
  assertFieldWorkerActor('field_worker.suspended', i.actor, i.actorId);
  const authorization = verifiedSnapshot('field_worker.suspended', i.authorization, i, {
    permissionKey: FIELD_WORKER_SUSPEND_PERMISSION_KEY,
  });
  return runLockedTransition(
    client,
    i,
    'field_worker.suspended',
    (row) => {
      assertLockedTarget(i, authorization, row);
      return { authorization, reason_code: assertReason('field_worker.suspended', i.reasonCode, FIELD_WORKER_SUSPEND_REASONS) };
    },
    (extra) => `field_worker.suspend:${extra['reason_code'] as string}`,
  );
}

/**
 * `suspended → active` — the way back (AI-10-1); the reason is cleared. Carries the verified `field_worker.reactivate`
 * authorization, its target judged against the LOCKED district (Story 13.1c AD3).
 * @throws FieldWorkerAuthorizationStaleError (+ the shared guards).
 */
export async function reactivateFieldWorker(client: pg.PoolClient, i: FieldWorkerLifecycleCommandInput): Promise<FieldWorkerTransitionResult> {
  assertFieldWorkerActor('field_worker.reactivated', i.actor, i.actorId);
  const authorization = verifiedSnapshot('field_worker.reactivated', i.authorization, i, {
    permissionKey: FIELD_WORKER_REACTIVATE_PERMISSION_KEY,
  });
  return runLockedTransition(
    client,
    i,
    'field_worker.reactivated',
    (row) => {
      assertLockedTarget(i, authorization, row);
      return { authorization };
    },
    'field_worker.reactivate',
  );
}

/**
 * `pending_kyc | active | suspended → terminated` — left ONLY by an undo (Story 13.1f — `undoFieldWorkerEnding` /
 * `allowFieldWorkerEndingAppeal`, `-454` Q1 A). Writes the hearer fixed at the ending (`appeal_heard_by`, AD8).
 * `endedOn` is the ACTUAL LAST DAY (QE20) — for `died`, the date of death (`-455`): `YYYY-MM-DD`, a real date, not after today and
 * not before the registration day — BOTH IST days computed in SQL on the transaction-start clock, compared as strings (string
 * order = calendar order); ⛔ a JS `Date`. Carries the verified `field_worker.terminate` authorization, its target judged against
 * the LOCKED district (Story 13.1c AD3).
 * @throws FieldWorkerEndedOnInvalidError, FieldWorkerAuthorizationStaleError, FieldWorkerReasonInvalidError (+ the shared guards).
 */
export async function terminateFieldWorker(client: pg.PoolClient, i: TerminateFieldWorkerInput): Promise<FieldWorkerTransitionResult> {
  assertFieldWorkerActor('field_worker.terminated', i.actor, i.actorId);
  const authorization = verifiedSnapshot('field_worker.terminated', i.authorization, i, {
    permissionKey: FIELD_WORKER_TERMINATE_PERMISSION_KEY,
  });
  // Story 13.1f (AD8) — the hearer is REQUIRED on every new ending (the schema keeps it optional for stored legacy events).
  if (!fieldWorkerAppealHeardBySchema.safeParse(i.appealHeardBy).success) {
    throw new FieldWorkerProjectorInputError('[field_worker.terminated] appealHeardBy (who hears an appeal against this ending) is missing (AD8)');
  }
  // (0b) — pure, BEFORE any SQL: a malformed date is never sent to Postgres.
  if (typeof i.endedOn !== 'string' || !isCalendarDateString(i.endedOn)) {
    throw new FieldWorkerEndedOnInvalidError(i.fieldWorkerId, 'missing_or_malformed');
  }
  const result = await runLockedTransition(
    client,
    i,
    'field_worker.terminated',
    async (row) => {
      assertLockedTarget(i, authorization, row);
      const reasonCode = assertReason('field_worker.terminated', i.reasonCode, FIELD_WORKER_TERMINATE_REASONS);
      const today = await istToday(client);
      if (i.endedOn > today) throw new FieldWorkerEndedOnInvalidError(i.fieldWorkerId, 'in_future');
      if (i.endedOn < row.registeredOn) throw new FieldWorkerEndedOnInvalidError(i.fieldWorkerId, 'before_registration');
      return { authorization, reason_code: reasonCode, ended_on: i.endedOn, appeal_heard_by: i.appealHeardBy };
    },
    (extra) => `field_worker.terminate:${extra['reason_code'] as string}`,
  );
  // Story 13.1d (AD3, AD9) — an ending supersedes the worker's open move request and tells its opener and the other end.
  await afterEnding(client, { pariwarId: i.pariwarId, fieldWorkerId: i.fieldWorkerId, authorization, auditId: i.auditId, actor: i.actor, actorId: i.actorId });
  return result;
}

export interface PostFieldWorkerInput extends FieldWorkerCommandBase {
  /** The new REPORTING district — the CALLER has checked it is LISTED (`assertDistrictRecorded`, QE17). */
  toDistrict: string;
  /** `at_worker_request` | `reassigned` (QE12's post list). */
  reasonCode: string;
  /**
   * The district the admin's screen SHOWED (13.1 D7; Story 13.1c AD4) — judged under the lock FIRST among the district guards:
   * a worker moved meanwhile ⇒ `FieldWorkerAuthorizationStaleError`. 13.1d's acceptance passes the request's source.
   */
  expectedFromDistrict: string;
  /** The VERIFIED result of the move's gate — a key of `FIELD_WORKER_MOVE_PERMISSION_KEYS`, checked at `district`, targeting EITHER end of the move (AC5). */
  authorization: VerifiedAuthorization;
}

/**
 * Move the worker to another REPORTING district — `field_worker.posted`, a same-state marker legal in `pending_kyc`,
 * `active` and `suspended` (QE17). Accepts ONLY a key of `FIELD_WORKER_MOVE_PERMISSION_KEYS` (Story 13.1c AD4 — 13.1 C5 / C10:
 * `field_worker.register` is refused). Under the lock, the locked district must be `expectedFromDistrict` (13.1 D7 — of two moves
 * from the same screen, the second is refused, ⛔ fulfilled), and the authorization's TARGET must be `toDistrict` or the locked
 * row's district (either end — whichever the gate passed); either failure ⇒ `FieldWorkerAuthorizationStaleError`.
 * @throws FieldWorkerDistrictUnchangedError, FieldWorkerAuthorizationStaleError, FieldWorkerReasonInvalidError (+ shared).
 */
export async function postFieldWorker(client: pg.PoolClient, i: PostFieldWorkerInput): Promise<FieldWorkerTransitionResult> {
  assertFieldWorkerActor('field_worker.posted', i.actor, i.actorId);
  const authorization = verifiedSnapshot('field_worker.posted', i.authorization, i, {
    permissionKeys: FIELD_WORKER_MOVE_PERMISSION_KEYS,
  });
  if (typeof i.expectedFromDistrict !== 'string' || i.expectedFromDistrict.trim().length === 0) {
    throw new FieldWorkerProjectorInputError('[field_worker.posted] the expected source district is missing (13.1 D7)');
  }
  const result = await runLockedTransition(
    client,
    i,
    'field_worker.posted',
    (row) => {
      if (row.district !== i.expectedFromDistrict) throw new FieldWorkerAuthorizationStaleError(i.fieldWorkerId, i.expectedFromDistrict);
      if (i.toDistrict === row.district) throw new FieldWorkerDistrictUnchangedError(i.fieldWorkerId);
      const target = authorization.target.value;
      if (target !== i.toDistrict && target !== row.district) {
        throw new FieldWorkerAuthorizationStaleError(i.fieldWorkerId, target);
      }
      const reasonCode = assertReason('field_worker.posted', i.reasonCode, FIELD_WORKER_POST_REASONS);
      return { authorization, from_district: row.district, to_district: i.toDistrict, reason_code: reasonCode };
    },
    'field_worker.post',
  );
  // Story 13.1d (AD3, AD4, AD9) — a DIRECT move only: supersede the open request and tell both districts. The acceptance's move (the
  // answer key) supersedes nothing: the worker lock is held and the one open request is the one being accepted. (3a) proved the locked
  // district WAS `expectedFromDistrict`.
  if (authorization.permission_key === 'field_worker.move') {
    await afterDirectMove(client, {
      pariwarId: i.pariwarId,
      fieldWorkerId: i.fieldWorkerId,
      authorization,
      auditId: i.auditId,
      actor: i.actor,
      actorId: i.actorId,
      fromDistrict: i.expectedFromDistrict,
      toDistrict: i.toDistrict,
    });
  }
  return result;
}

// ── Story 13.1f — the undo of an ending, and the allowed appeal (decision `2026-11-16-464` AD2, AD5, AD6, AD9) ─────────────────────────

/** The worker's WHOLE stream, read on the client that holds its row lock (the undo's STREAM step). MODULE-PRIVATE (TR17). */
async function readFieldWorkerStreamLocked(
  client: pg.PoolClient,
  pariwarId: PariwarId,
  fieldWorkerId: FieldWorkerId,
): Promise<FieldWorkerReplayEvent[]> {
  const res = await client.query<{ event_type: string; payload: unknown; event_version: string | number }>(
    'SELECT event_type, payload, event_version FROM events_log WHERE pariwar_id = $1 AND stream_id = $2 ORDER BY event_version',
    [pariwarId, fieldWorkerId],
  );
  return res.rows.map((r) => ({ type: r.event_type, payload: r.payload, eventVersion: Number(r.event_version) }));
}

/** What the undo's core takes — every input already checked by its exported caller. */
interface UndoEndingLockedInput extends FieldWorkerCommandBase {
  /** The VERIFIED snapshot of one of `FIELD_WORKER_UNDO_PERMISSION_KEYS` (the caller ran `verifiedSnapshot`). */
  authorization: FieldWorkerAuthorizationSnapshot;
  cause: FieldWorkerUndoCause;
  appealId: FieldWorkerEndingAppealId | null;
  /** The ending the officer saw (the slip), or the appeal's `ending_event_version` (the allowed decision). */
  expectedEndingVersion: number;
}

/**
 * The undo's CORE (AD2) — MODULE-PRIVATE: the barrel is `export * from './commands.js'`, so an export would be public and a caller could
 * pass an unchecked `appeal_id` (TR17). Runs `runLockedTransition` with `resolveTarget`: (2′) terminated; the guard — (2a) the version is
 * the expected ending ⇒ `FieldWorkerEndingChangedError`, (3d) the target; then the target — the fold of the stream PREFIX before the
 * latest `field_worker.terminated` event (G2; an earlier undo in the prefix folds through AD3's arm), which must equal that event's
 * `from_state` read RAW (TR18) ⇒ else `FieldWorkerProjectorInputError` (a corrupt stream, a 500). Restores the suspension reason iff
 * suspended. The projector re-checks the undone event (AD3) and maps the live-number 23505 (AD5).
 */
async function undoEndingLocked(client: pg.PoolClient, i: UndoEndingLockedInput): Promise<FieldWorkerTransitionResult> {
  return runLockedTransition(
    client,
    i,
    'field_worker.ending_undone',
    (row) => {
      if (row.stateEventVersion !== i.expectedEndingVersion) throw new FieldWorkerEndingChangedError(i.fieldWorkerId, i.expectedEndingVersion);
      assertLockedTarget(i, i.authorization, row);
      return {
        authorization: i.authorization,
        cause: i.cause,
        appeal_id: i.appealId,
        undone_ending_version: row.stateEventVersion,
      };
    },
    (extra) => `field_worker.undo_ending:${extra['cause'] as string}`,
    {
      resolveTarget: async (row) => {
        const stream = await readFieldWorkerStreamLocked(client, i.pariwarId, i.fieldWorkerId);
        let lastEnding = -1;
        for (let k = stream.length - 1; k >= 0; k -= 1) {
          if (stream[k]!.type === 'field_worker.terminated') {
            lastEnding = k;
            break;
          }
        }
        const ending = lastEnding === -1 ? undefined : stream[lastEnding];
        if (ending === undefined || ending.eventVersion !== row.stateEventVersion) {
          throw new FieldWorkerProjectorInputError(`[field_worker.ending_undone] field worker ${i.fieldWorkerId}: the row's version is not its latest ending`);
        }
        const before = foldFieldWorkerProjection(stream.slice(0, lastEnding));
        const raw = (typeof ending.payload === 'object' && ending.payload !== null ? ending.payload : {}) as Record<string, unknown>;
        if (before.state === 'terminated' || raw['from_state'] !== before.state) {
          throw new FieldWorkerProjectorInputError(
            `[field_worker.ending_undone] field worker ${i.fieldWorkerId}: the stream before the ending folds to '${before.state}', the ending says '${String(raw['from_state'])}'`,
          );
        }
        return {
          toState: before.state,
          extraPayload: { reason_code: before.state === 'suspended' ? before.reasonCode : null },
        };
      },
    },
  );
}

/** What an undo returns: the transition, the restored reason and no last day — the handler's 200 is built from THIS (G24). */
export interface FieldWorkerUndoResult extends FieldWorkerTransitionResult {
  reasonCode: FieldWorkerReasonCode | null;
  endedOn: null;
}

/** The restored reason, read back from the row the undo just wrote (the same transaction). */
async function restoredReason(client: pg.PoolClient, pariwarId: PariwarId, fieldWorkerId: FieldWorkerId): Promise<FieldWorkerReasonCode | null> {
  const res = await client.query<{ state_reason_code: FieldWorkerReasonCode | null }>(
    'SELECT state_reason_code FROM field_workers WHERE pariwar_id = $1 AND field_worker_id = $2',
    [pariwarId, fieldWorkerId],
  );
  return res.rows[0]?.state_reason_code ?? null;
}

export interface UndoFieldWorkerEndingInput extends FieldWorkerCommandBase {
  /** `request.authorizations['field_worker.undo_ending']`, passed on unchanged — ⛔ a recomputation. */
  authorization: VerifiedAuthorization;
  /** The worker's `state_event_version` as the officer's screen showed it (AD6 — 13.1 D7's guard). */
  expectedEndingVersion: number;
}

/**
 * Story 13.1f (AD6; the Panel's `-454` Q1 A) — the Pariwar Admin undoes an ending made BY MISTAKE: the worker returns as they were (the
 * state the ending left, its suspension reason, the same district and code), both acts stay in the history. Any ending — any reason,
 * `died` included, any from-state, at any time, after a REFUSED appeal too (note Q6, as ruled). A SLIP's undo SUPERSEDES the worker's
 * open appeal in the same transaction (I4). ⛔ It reopens no move request (13.1d C3) and re-sends no code text (C7).
 * Guard (0), pure: the actor (QE7, and `'operator'` — AD9), the `field_worker.undo_ending` authorization, the expected version.
 * @throws FieldWorkerIllegalTransitionError, FieldWorkerEndingChangedError, FieldWorkerAuthorizationStaleError,
 *         FieldWorkerNumberRegisteredAgainError (+ the shared guards).
 */
export async function undoFieldWorkerEnding(client: pg.PoolClient, i: UndoFieldWorkerEndingInput): Promise<FieldWorkerUndoResult> {
  assertFieldWorkerActor('field_worker.ending_undone', i.actor, i.actorId);
  const authorization = verifiedSnapshot('field_worker.ending_undone', i.authorization, i, {
    permissionKey: FIELD_WORKER_UNDO_ENDING_PERMISSION_KEY,
  });
  assertAppealActorKind('field_worker.ending_undone', i.actor, authorization.permission_key);
  if (!Number.isSafeInteger(i.expectedEndingVersion) || i.expectedEndingVersion < 2) {
    throw new FieldWorkerProjectorInputError('[field_worker.ending_undone] the expected ending version is missing or malformed (AD6)');
  }
  const result = await undoEndingLocked(client, {
    ...i,
    authorization,
    cause: 'mistake',
    appealId: null,
    expectedEndingVersion: i.expectedEndingVersion,
  });
  // The slip supersedes the open appeal (AD6, I4) — the worker's row lock is still held, so the appeal's is taken second (TR5).
  await supersedeOpenEndingAppeal(client, {
    pariwarId: i.pariwarId,
    fieldWorkerId: i.fieldWorkerId,
    authorization,
    undoneEventId: result.eventId,
    auditId: i.auditId,
    actor: i.actor,
    actorId: i.actorId,
  });
  return { ...result, reasonCode: await restoredReason(client, i.pariwarId, i.fieldWorkerId), endedOn: null };
}

/** What a decision on an appeal takes (AD9): the VERIFIED result of the HEAR key the gate matched to the appeal's `heard_by`. */
export interface FieldWorkerAppealDecisionInput {
  pariwarId: PariwarId;
  appealId: FieldWorkerEndingAppealId;
  /** REQUIRED — the caller's `withCompensatingAudit` intent id (QE14). ONE line for the decision (an allowed one: both events carry it). */
  auditId: string;
  /** `'trustee'` under the Panel's key, `'operator'` under the Pariwar Admin's (AD9) — a mismatch is refused. */
  actor: 'operator' | 'trustee';
  actorId: string;
  /** `request.authorizations[<the hear key>]`, passed on unchanged. */
  authorization: VerifiedAuthorization;
  /** `YYYY-MM-DD` — between the appeal's `received_on` and today (IST); judged by the command (AD7). */
  decidedOn: string;
}

/** The appeal and its worker, both locked — worker FIRST (TR5). */
export interface LockedAppealForDecision {
  appeal: EndingAppealLockedRow;
  worker: FieldWorkerLockedRow;
  today: string;
  authorization: FieldWorkerAuthorizationSnapshot;
}

/**
 * AD9's decide / withdraw preamble — ONE implementation for the allowed decision (here) and the refusal and withdrawal
 * (`ending-appeal-commands.ts` imports it — it writes nothing, 13.1d CR19's rule; the barrel's header names it). Guard (0), pure: the
 * actor (QE7), the hear-key authorization, the actor kind, `decidedOn` well-formed. Then APPEAL-WORKER (unlocked) → WORKER LOCK →
 * APPEAL LOCK → NOW, and in order: (0′) the appeal exists and names the locked worker ⇒ `FieldWorkerAppealMissingError`; (1) the key is
 * the appeal's hearer's, never a Panel act from a `global` grant ⇒ `FieldWorkerAppealWrongHearerError`; (1′) the target is the locked
 * district; (2) the appeal is open ⇒ `FieldWorkerAppealNotOpenError`; (3) the actor did not end the worker ⇒
 * `FieldWorkerAppealDeciderIsEnderError`; (4) `decidedOn` between `received_on` and today ⇒ `FieldWorkerAppealDateInvalidError`.
 */
export async function lockAppealForDecision(
  client: pg.PoolClient,
  eventType: FieldWorkerEndingAppealEventType,
  i: FieldWorkerAppealDecisionInput,
): Promise<LockedAppealForDecision> {
  assertFieldWorkerActor(eventType, i.actor, i.actorId);
  const authorization = verifiedSnapshot(eventType, i.authorization, i, { permissionKeys: FIELD_WORKER_HEAR_APPEAL_PERMISSION_KEYS });
  assertAppealActorKind(eventType, i.actor, authorization.permission_key);
  if (typeof i.decidedOn !== 'string' || !isCalendarDateString(i.decidedOn)) {
    throw new FieldWorkerAppealDateInvalidError('decided_on', 'missing_or_malformed');
  }
  const fieldWorkerId = await appealWorkerOf(client, i.pariwarId, i.appealId);
  if (fieldWorkerId === null) throw new FieldWorkerAppealMissingError(i.appealId);
  const worker = await lockFieldWorkerRow(client, i.pariwarId, fieldWorkerId);
  if (worker === null) throw new FieldWorkerAppealMissingError(i.appealId);
  const appeal = await lockEndingAppealRow(client, i.pariwarId, i.appealId);
  if (appeal === null || appeal.fieldWorkerId !== fieldWorkerId) throw new FieldWorkerAppealMissingError(i.appealId);
  const today = await istToday(client);
  assertAppealHearer(fieldWorkerId, appeal.heardBy, i.authorization);
  if (authorization.target.value !== worker.district) throw new FieldWorkerAuthorizationStaleError(fieldWorkerId, authorization.target.value);
  if (appeal.state !== 'open') throw new FieldWorkerAppealNotOpenError(i.appealId, appeal.state);
  if (i.actorId === appeal.endedByUserId) throw new FieldWorkerAppealDeciderIsEnderError(i.appealId);
  if (i.decidedOn > today) throw new FieldWorkerAppealDateInvalidError('decided_on', 'in_future');
  if (i.decidedOn < appeal.receivedOn) throw new FieldWorkerAppealDateInvalidError('decided_on', 'before_received');
  return { appeal, worker, today, authorization };
}

/** What an allowed decision returns: the appeal's transition and the restored worker (the 200 is `{ appeal, worker }`). */
export interface FieldWorkerAppealAllowedResult {
  appealId: FieldWorkerEndingAppealId;
  appealEventVersion: number;
  worker: FieldWorkerUndoResult & { fieldWorkerId: FieldWorkerId };
}

/**
 * Story 13.1f (AD9; the epic text "An appeal allowed undoes the ending as above") — the HEARER allows an appeal, and the ending is undone
 * in the SAME transaction: `lockAppealForDecision`, then the worker must be `terminated` at the appeal's `ending_event_version` (else an
 * open appeal on a changed ending — corrupt, since a slip supersedes it ⇒ `FieldWorkerProjectorInputError`), then the private core with
 * cause `appeal_allowed`, then `field_worker_ending_appeal.allowed`. ONE audit id for both events. If the number is live again the whole
 * decision fails (`FieldWorkerNumberRegisteredAgainError`) and the appeal stays OPEN (note Q7). It supersedes nothing — the open appeal
 * IS the one being allowed.
 */
export async function allowFieldWorkerEndingAppeal(
  client: pg.PoolClient,
  i: FieldWorkerAppealDecisionInput,
): Promise<FieldWorkerAppealAllowedResult> {
  const { appeal, worker, authorization } = await lockAppealForDecision(client, 'field_worker_ending_appeal.allowed', i);
  if (worker.currentState !== 'terminated' || worker.stateEventVersion !== appeal.endingEventVersion) {
    throw new FieldWorkerProjectorInputError(
      `[field_worker_ending_appeal.allowed] appeal ${i.appealId} is open on an ending that is not the worker's current one`,
    );
  }
  const undone = await undoEndingLocked(client, {
    pariwarId: i.pariwarId,
    fieldWorkerId: appeal.fieldWorkerId,
    auditId: i.auditId,
    actor: i.actor,
    actorId: i.actorId,
    authorization,
    cause: 'appeal_allowed',
    appealId: i.appealId,
    expectedEndingVersion: appeal.endingEventVersion,
  });
  const t = await projectEndingAppealTransition(client, {
    pariwarId: i.pariwarId,
    eventType: 'field_worker_ending_appeal.allowed',
    payload: {
      from_state: 'open',
      to_state: 'allowed',
      actor: i.actor,
      field_worker_id: appeal.fieldWorkerId,
      heard_by: appeal.heardBy,
      authorization,
      decided_on: i.decidedOn,
      undone_event_id: undone.eventId,
    },
    actorId: i.actorId,
    auditId: i.auditId,
    lockedRow: appeal,
  });
  return {
    appealId: i.appealId,
    appealEventVersion: t.eventVersion,
    worker: {
      ...undone,
      fieldWorkerId: appeal.fieldWorkerId,
      reasonCode: await restoredReason(client, i.pariwarId, appeal.fieldWorkerId),
      endedOn: null,
    },
  };
}

/** The appeal vocabulary, re-exported for the API's audit action names (a constant, no write). */
export { FIELD_WORKER_ENDING_APPEAL_EVENT_TYPES };
