// The seven field-worker commands — Story 13.1 (QE5, QE7, QE13, QE14, QE17, QE18, QE20; AC5). The ONLY public writers.
//
// Copy of the SHIPPED `marketplace/commands.ts` lock / SAVEPOINT shape: the pure guards run first (no SQL); then, inside
// ONE savepoint, the row is locked `FOR UPDATE` (QE13), the guards are judged against the LOCKED row, and the projector
// appends + re-projects. A failed guard rolls the savepoint back — no event, the row unchanged, the caller's transaction
// usable. ⛔ A retry loop (the module's is lead-specific). ⛔ `withCompensatingAudit` (QE14): every command takes the
// caller's REQUIRED `auditId`.
//
// ── Statement order, pinned by `tests/field-worker/commands-guards.test.ts` (I13) ────────────────────
//   SAVEPOINT → LOCK → HEAD → APPEND → UPDATE      (`terminate`: SAVEPOINT → LOCK → NOW → HEAD → APPEND → UPDATE)
// ⚠ The caller's transaction must be READ COMMITTED — under REPEATABLE READ a lock waiter gets an untyped 40001.
//
// ── Guard order, in EVERY command (QE5; pinned by a test) ─────────────────────────────────────────
//   (0)  actor + actorId (QE7) — and, on `register`, `kyc_completed`, `activated` and `post`, the authorization's PROVENANCE
//        (a VERIFIED result of the RBAC check), its Pariwar and actor (= the command's), its dimension (`district`) — and its
//        KEY on `register` (`field_worker.register`, + the target) and on `kyc_completed` / `activated` (`field_worker.approve`,
//        Story 13.1a AD3) — and, on `activated`, a non-blank `approvedByDisplay` (13.1a, decision `-447` item 2) — pure,
//        BEFORE the lock ⇒ `FieldWorkerProjectorInputError`;
//   (0b) `terminate`: `ended_on` present, `YYYY-MM-DD`, a real date — pure ⇒ `FieldWorkerEndedOnInvalidError`;
//   under the lock:
//   (1)  the row exists in this Pariwar ⇒ `FieldWorkerGenesisMissingError`;
//   (2)  the (state, event) pair is legal ⇒ `FieldWorkerIllegalTransitionError` (anything out of `terminated`, and a
//        repeated `kyc_completed` on an `active` worker);
//   (3)  the KYC guard ⇒ `FieldWorkerKycAlreadyCompletedError` / `FieldWorkerKycNotCompletedError`;
//   (3b) `post`: the district differs ⇒ `FieldWorkerDistrictUnchangedError`;
//   (3c) `post`: the authorization targets `toDistrict` or the LOCKED district ⇒ `FieldWorkerAuthorizationStaleError`;
//   (3d) `kyc_completed` / `activated`: the authorization targets the LOCKED district (13.1a AD3 — the gate read the district
//        BEFORE the lock; a concurrent move would write a false target into an append-only log) ⇒ `FieldWorkerAuthorizationStaleError`;
//   (4)  the reason (suspend, terminate, post) ⇒ `FieldWorkerReasonInvalidError`;
//   (5)  `terminate`: the IST bounds — not after today, not before the registration day ⇒ `FieldWorkerEndedOnInvalidError`.

import type pg from 'pg';

import type { FieldWorkerId, PariwarId } from '../ids/index.js';
import { rollbackToSavepoint } from '../marketplace/project.js';
import { isVerifiedAuthorization, type VerifiedAuthorization } from '../rbac/check.js';
import type { FieldWorkerKycStatus, FieldWorkerReasonCode, FieldWorkerState } from '../schema/field_workers.js';
import {
  FieldWorkerEndedOnInvalidError,
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
  FIELD_WORKER_POST_REASONS,
  FIELD_WORKER_SUSPEND_REASONS,
  FIELD_WORKER_TERMINATE_REASONS,
  isCalendarDateString,
  type FieldWorkerAuthorizationSnapshot,
  type FieldWorkerEventType,
} from './events.js';
import {
  assertFieldWorkerActor,
  projectFieldWorkerGenesis,
  projectFieldWorkerTransition,
  type FieldWorkerLockedRow,
  type FieldWorkerTransitionEventType,
  type FieldWorkerTransitionResult,
  type ProjectFieldWorkerGenesisResult,
} from './project.js';
import { nextFieldWorkerState } from './state.js';

export type { FieldWorkerTransitionResult, ProjectFieldWorkerGenesisResult } from './project.js';

/** The ONE permission key whose verified result `registerFieldWorker` accepts (QE10). */
export const FIELD_WORKER_REGISTER_PERMISSION_KEY = 'field_worker.register';

/** The ONE permission key whose verified result `recordFieldWorkerKycCompleted` and `activateFieldWorker` accept (Story 13.1a AD3, AD6). */
export const FIELD_WORKER_APPROVE_PERMISSION_KEY = 'field_worker.approve';

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

/** `SELECT … FOR UPDATE` on the worker row (QE13). Under twt_app this needs the UPDATE grant + policy. */
async function lockFieldWorkerRow(
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

/** The IST calendar day of the TRANSACTION-START clock (`now()` — the same clock as `occurred_at`; ⛔ `clock_timestamp()`). */
async function istToday(client: pg.PoolClient): Promise<string> {
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
function verifiedSnapshot(
  eventType: FieldWorkerEventType,
  authorization: unknown,
  i: { pariwarId: string; actorId: string },
  expected: { permissionKey?: string; targetValue?: string },
): FieldWorkerAuthorizationSnapshot {
  if (!isVerifiedAuthorization(authorization)) {
    throw new FieldWorkerProjectorInputError(
      `[${eventType}] the authorization is missing or is not a verified result of the RBAC check (QE18)`,
    );
  }
  const a: VerifiedAuthorization = authorization;
  if (a.pariwarId !== i.pariwarId || a.actorId !== i.actorId) {
    throw new FieldWorkerProjectorInputError(`[${eventType}] the authorization is for another Pariwar or actor (QE18)`);
  }
  if (a.target.dimension !== 'district' || typeof a.target.value !== 'string') {
    throw new FieldWorkerProjectorInputError(`[${eventType}] the authorization was not checked at the district dimension (QE18)`);
  }
  if (expected.permissionKey !== undefined && a.permissionKey !== expected.permissionKey) {
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
  });
}

// ── Transitions ────────────────────────────────────────────────────────────────────────────────────

const TRANSITION_SAVEPOINT = 'field_worker_transition';

/**
 * SAVEPOINT → lock → (1) present → (2) legal → `guard(row)` (3…5) → build the payload → project, inside one savepoint.
 * `guard` may run SQL (terminate's NOW step) and returns the payload's extra keys. `trigger` is a constant, or is computed FROM
 * those keys — so a reason reaches the trigger only once its guard has VALIDATED it (review R3-20: ⛔ `String(<raw input>)`).
 * `approvedByDisplay` is `activate`'s row-only snapshot (13.1a, `-447` item 2) — ⛔ a payload key.
 */
async function runLockedTransition(
  client: pg.PoolClient,
  i: FieldWorkerCommandBase,
  eventType: FieldWorkerTransitionEventType,
  guard: (row: FieldWorkerLockedRow) => Promise<Record<string, unknown>> | Record<string, unknown>,
  trigger: string | ((extraPayload: Record<string, unknown>) => string),
  approvedByDisplay?: string,
): Promise<FieldWorkerTransitionResult> {
  await client.query(`SAVEPOINT ${TRANSITION_SAVEPOINT}`);
  try {
    const row = await lockFieldWorkerRow(client, i.pariwarId, i.fieldWorkerId);
    if (row === null) throw new FieldWorkerGenesisMissingError(i.fieldWorkerId);
    const toState = nextFieldWorkerState(row.currentState, eventType);
    if (toState === null) throw new FieldWorkerIllegalTransitionError(i.fieldWorkerId, row.currentState, eventType);
    const extraPayload = await guard(row);
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

/** (3d) — the approval's target must be the LOCKED row's district (13.1a AD3). */
function assertApprovalTarget(i: FieldWorkerCommandBase, authorization: FieldWorkerAuthorizationSnapshot, row: FieldWorkerLockedRow): void {
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
      assertApprovalTarget(i, authorization, row);
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
 * and writes the approver's display-name snapshot to the row (`-447` item 2).
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
  return runLockedTransition(
    client,
    i,
    'field_worker.activated',
    (row) => {
      if (row.kycStatus !== 'completed') throw new FieldWorkerKycNotCompletedError(i.fieldWorkerId);
      assertApprovalTarget(i, authorization, row);
      return { authorization };
    },
    'field_worker.activate',
    i.approvedByDisplay,
  );
}

/** `active → suspended`, with a suspension reason (QE12). @throws FieldWorkerReasonInvalidError. */
export async function suspendFieldWorker(
  client: pg.PoolClient,
  i: FieldWorkerCommandBase & { reasonCode: string },
): Promise<FieldWorkerTransitionResult> {
  assertFieldWorkerActor('field_worker.suspended', i.actor, i.actorId);
  return runLockedTransition(
    client,
    i,
    'field_worker.suspended',
    () => ({ reason_code: assertReason('field_worker.suspended', i.reasonCode, FIELD_WORKER_SUSPEND_REASONS) }),
    (extra) => `field_worker.suspend:${extra['reason_code'] as string}`,
  );
}

/** `suspended → active` — the way back (AI-10-1); the reason is cleared. */
export async function reactivateFieldWorker(client: pg.PoolClient, i: FieldWorkerCommandBase): Promise<FieldWorkerTransitionResult> {
  assertFieldWorkerActor('field_worker.reactivated', i.actor, i.actorId);
  return runLockedTransition(client, i, 'field_worker.reactivated', () => ({}), 'field_worker.reactivate');
}

/**
 * `pending_kyc | active | suspended → terminated` — TERMINAL (QE5). `endedOn` is the ACTUAL LAST DAY (QE20): `YYYY-MM-DD`,
 * a real date, not after today and not before the registration day — BOTH IST days computed in SQL on the
 * transaction-start clock, compared as strings (string order = calendar order); ⛔ a JS `Date`.
 * @throws FieldWorkerEndedOnInvalidError, FieldWorkerReasonInvalidError (+ the shared guards).
 */
export async function terminateFieldWorker(
  client: pg.PoolClient,
  i: FieldWorkerCommandBase & { reasonCode: string; endedOn: string },
): Promise<FieldWorkerTransitionResult> {
  assertFieldWorkerActor('field_worker.terminated', i.actor, i.actorId);
  // (0b) — pure, BEFORE any SQL: a malformed date is never sent to Postgres.
  if (typeof i.endedOn !== 'string' || !isCalendarDateString(i.endedOn)) {
    throw new FieldWorkerEndedOnInvalidError(i.fieldWorkerId, 'missing_or_malformed');
  }
  return runLockedTransition(
    client,
    i,
    'field_worker.terminated',
    async (row) => {
      const reasonCode = assertReason('field_worker.terminated', i.reasonCode, FIELD_WORKER_TERMINATE_REASONS);
      const today = await istToday(client);
      if (i.endedOn > today) throw new FieldWorkerEndedOnInvalidError(i.fieldWorkerId, 'in_future');
      if (i.endedOn < row.registeredOn) throw new FieldWorkerEndedOnInvalidError(i.fieldWorkerId, 'before_registration');
      return { reason_code: reasonCode, ended_on: i.endedOn };
    },
    (extra) => `field_worker.terminate:${extra['reason_code'] as string}`,
  );
}

export interface PostFieldWorkerInput extends FieldWorkerCommandBase {
  /** The new REPORTING district — the CALLER has checked it is LISTED (`assertDistrictRecorded`, QE17). */
  toDistrict: string;
  /** `at_worker_request` | `reassigned` (QE12's post list). */
  reasonCode: string;
  /** The VERIFIED result of the move's gate — checked at `district`, targeting EITHER end of the move (AC5). */
  authorization: VerifiedAuthorization;
}

/**
 * Move the worker to another REPORTING district — `field_worker.posted`, a same-state marker legal in `pending_kyc`,
 * `active` and `suspended` (QE17). The authorization's TARGET is judged ONLY under the lock: `toDistrict` or the locked
 * row's district (either end — whichever the gate passed); any other ⇒ `FieldWorkerAuthorizationStaleError`.
 * ⚠ Until Story 13.1c / 13.1d mint the move keys, any verified DISTRICT-dimension key is accepted (its tests use
 * `field_worker.register`); the minting story makes this REFUSE every key outside the move-key list — `field_worker.register`
 * explicitly — in the same commit (C5, C10).
 * @throws FieldWorkerDistrictUnchangedError, FieldWorkerAuthorizationStaleError, FieldWorkerReasonInvalidError (+ shared).
 */
export async function postFieldWorker(client: pg.PoolClient, i: PostFieldWorkerInput): Promise<FieldWorkerTransitionResult> {
  assertFieldWorkerActor('field_worker.posted', i.actor, i.actorId);
  const authorization = verifiedSnapshot('field_worker.posted', i.authorization, i, {});
  return runLockedTransition(
    client,
    i,
    'field_worker.posted',
    (row) => {
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
}
