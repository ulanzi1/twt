// Field-worker typed domain errors — Story 13.1 (QE5, QE13; the "Errors and their HTTP mapping" table). Twin of
// marketplace/errors.ts.
//
// Every failed guard throws ONE of these with no event appended and the row unchanged (AC5). The domain functions carry
// ⛔ HTTP; the API maps them (`apps/api/src/modules/field-worker/errors.ts`). ⛔ A message carries a worker's name or
// mobile (I8) — only ids, states, event types, reason codes and districts.
//
// Only the direct-write set (`FieldWorkerStateDirectWriteError` + its code + its message prefix + its detector) is
// surfaced at the @twt/domain TOP level — the pool / module shape. Everything else is reached through `fieldWorker`.
// The pg walkers are IMPORTED from marketplace/errors.ts (⛔ a sixth copy of `findPgError` — Task 6).

import type { ErrorResponseShape } from '../errors.js';
import { pgMessageOf, pgSqlstateOf, uniqueViolationConstraint } from '../marketplace/errors.js';

// ── The DB trigger's direct-write rejection (I1 / I2 / I3 / I6 / I10) ───────────────────────────────

/** Namespaced error code for a rejected direct write to `field_workers`. */
export const FIELD_WORKER_STATE_DIRECT_WRITE_CODE = 'field_worker.state_direct_write_rejected';

/**
 * The trigger's RAISE message prefix (migration 0200). The triggers use SQLSTATE `P0001`, which is generic, so the
 * prefix is the discriminator. Keep IN SYNC with the trigger DDL — every RAISE in
 * `field_workers_reject_unguarded_state_write()` and `field_workers_reject_delete()` starts with it.
 */
export const FIELD_WORKER_STATE_DIRECT_WRITE_MESSAGE_PREFIX = 'field_workers direct write rejected';

/** The SQLSTATE the triggers RAISE with. */
const FIELD_WORKER_STATE_DIRECT_WRITE_SQLSTATE = 'P0001';

/**
 * A write to `field_workers` was rejected by the DB trigger: an unguarded INSERT / UPDATE, a guarded write that changed an
 * identity column or broke I3, any update of a terminated row, or a DELETE / TRUNCATE. Reachable from the projector only
 * if the guard was not set — a bug.
 */
export class FieldWorkerStateDirectWriteError extends Error {
  public readonly name = 'FieldWorkerStateDirectWriteError';
  public readonly code = FIELD_WORKER_STATE_DIRECT_WRITE_CODE;

  public constructor(public readonly detail: string) {
    super(
      `${FIELD_WORKER_STATE_DIRECT_WRITE_MESSAGE_PREFIX}: ${
        detail.startsWith(FIELD_WORKER_STATE_DIRECT_WRITE_MESSAGE_PREFIX)
          ? detail.slice(FIELD_WORKER_STATE_DIRECT_WRITE_MESSAGE_PREFIX.length).replace(/^[\s—:-]+/, '')
          : detail
      }`,
    );
  }

  public toErrorResponse(requestId: string): ErrorResponseShape {
    return { error: { code: this.code, message: this.message, details: {}, request_id: requestId } };
  }
}

/** True iff `err` is the `field_workers` trigger rejection (SQLSTATE `P0001` + the prefix) anywhere on the cause chain. */
export function isFieldWorkerStateDirectWriteError(err: unknown): boolean {
  return (
    pgSqlstateOf(err) === FIELD_WORKER_STATE_DIRECT_WRITE_SQLSTATE &&
    pgMessageOf(err).startsWith(FIELD_WORKER_STATE_DIRECT_WRITE_MESSAGE_PREFIX)
  );
}

// ── Constraint names the genesis maps BY NAME (⛔ by any 23505). Keep IN SYNC with migration 0200. ──

/**
 * The `field_workers` primary key — a genesis on an already-registered id. Like the stream-version unique, it ignores RLS,
 * so a genesis under one Pariwar with an id that exists under ANOTHER is `FieldWorkerGenesisAlreadyExistsError` — an
 * existence signal across tenants. Accepted because the id is minted by the caller's own server code (QE3), never chosen
 * by a client. ⭐ RE-EXAMINE if a route ever lets a CLIENT choose the `field_worker_id` (the `MODULE_PKEY_CONSTRAINT` note).
 */
export const FIELD_WORKER_PKEY_CONSTRAINT = 'field_workers_pkey';
/** `(pariwar_id, field_worker_id)` — 13.2's FK target; a same-id race may trip it before the pkey. */
export const FIELD_WORKER_PARIWAR_WORKER_CONSTRAINT = 'field_workers_pariwar_worker_uq';
/** One LIVE worker per mobile per Pariwar (QE4) — the partial unique index. */
export const FIELD_WORKER_MOBILE_LIVE_CONSTRAINT = 'field_workers_pariwar_mobile_live_uq';

/** The violated constraint name of a 23505 on `err`'s cause chain, or null (re-exported for the projector). */
export { uniqueViolationConstraint };

// ── Lifecycle + projector ──────────────────────────────────────────────────────────────────────────

/**
 * The (state, event) pair is not in QE5's table — including anything out of `terminated` and a repeated `kyc_completed`
 * on an `active` worker. ⚠ `kyc_completed` and `posted` are LEGAL same-state events, so legality is
 * `nextFieldWorkerState(...) !== null`, ⛔ `toState !== fromState` (TR1).
 */
export class FieldWorkerIllegalTransitionError extends Error {
  public readonly name = 'FieldWorkerIllegalTransitionError';
  public constructor(
    public readonly fieldWorkerId: string,
    public readonly fromState: string,
    public readonly eventType: string,
  ) {
    super(`event '${eventType}' does not apply to field worker ${fieldWorkerId} in state '${fromState}' — refusing to append`);
  }
}

/** `kyc_completed` when the worker's `kyc_status` is already `completed` (reachable only from `pending_kyc`). */
export class FieldWorkerKycAlreadyCompletedError extends Error {
  public readonly name = 'FieldWorkerKycAlreadyCompletedError';
  public constructor(public readonly fieldWorkerId: string) {
    super(`field worker ${fieldWorkerId}: identity verification is already recorded`);
  }
}

/** `activated` while `kyc_status` is still `pending` (I5). */
export class FieldWorkerKycNotCompletedError extends Error {
  public readonly name = 'FieldWorkerKycNotCompletedError';
  public constructor(public readonly fieldWorkerId: string) {
    super(`field worker ${fieldWorkerId}: cannot be activated before identity verification is recorded`);
  }
}

/** A reason missing, unknown, or from the wrong list for the event (suspend, terminate or post — QE12). */
export class FieldWorkerReasonInvalidError extends Error {
  public readonly name = 'FieldWorkerReasonInvalidError';
  public constructor(
    public readonly eventType: string,
    public readonly reasonCode: unknown,
  ) {
    super(`reason ${JSON.stringify(reasonCode ?? null)} is not a valid reason for '${eventType}'`);
  }
}

/** A command on an id with no row in this Pariwar (never registered, or another tenant's). */
export class FieldWorkerGenesisMissingError extends Error {
  public readonly name = 'FieldWorkerGenesisMissingError';
  public constructor(public readonly fieldWorkerId: string) {
    super(`field worker ${fieldWorkerId} has no row in this Pariwar`);
  }
}

/** A genesis on a non-empty stream / an already-registered id — the pkey, the `(pariwar_id, field_worker_id)` unique or
 *  the stream-version unique. Also what `projectFieldWorkerTransition` throws for `field_worker.registered`. */
export class FieldWorkerGenesisAlreadyExistsError extends Error {
  public readonly name = 'FieldWorkerGenesisAlreadyExistsError';
  public constructor(public readonly fieldWorkerId: string) {
    super(`field worker ${fieldWorkerId} already has a genesis — field_worker.registered is first-and-only`);
  }
}

/** A LIVE worker with this mobile already exists in this Pariwar (the pre-check, or the partial unique by name — QE4).
 *  ⛔ The mobile, its index or the other worker's id in the message. */
export class FieldWorkerMobileAlreadyRegisteredError extends Error {
  public readonly name = 'FieldWorkerMobileAlreadyRegisteredError';
  public constructor(public readonly pariwarId: string) {
    super(`a live field worker with this mobile number is already registered in Pariwar ${pariwarId}`);
  }
}

/** The stream head ≠ the locked row's version (drift) — never expected under the row lock (QE13). */
export class FieldWorkerStreamConcurrencyError extends Error {
  public readonly name = 'FieldWorkerStreamConcurrencyError';
  public constructor(
    public readonly fieldWorkerId: string,
    public readonly attemptedVersion: number,
  ) {
    super(`field worker stream ${fieldWorkerId} concurrency conflict at event_version ${String(attemptedVersion)}`);
  }
}

/** The `field_workers` row write itself failed or matched no row. The message carries the pg text only (`pgMessageOf` —
 *  ⛔ drizzle's "params", which would hold the bound ciphertext); `sqlstate` keeps the SQLSTATE readable. */
export class FieldWorkerPersistError extends Error {
  public readonly name = 'FieldWorkerPersistError';
  public readonly sqlstate: string | null;
  public constructor(
    public readonly fieldWorkerId: string,
    public readonly cause: unknown,
  ) {
    super(`failed to persist field worker row ${fieldWorkerId}: ${pgMessageOf(cause)}`);
    this.sqlstate = pgSqlstateOf(cause);
  }
}

/**
 * The caller's inputs are inconsistent — a programming error (the route never builds one): a `system` / `member` actor or
 * a null `actorId` (QE7); a payload that fails its schema; an `authorization` that is missing, not a VERIFIED result of the
 * RBAC check, for another Pariwar or actor, or for the wrong key / dimension / (register) target (QE18); a `posted` whose
 * `from_district` ≠ the locked row's.
 */
export class FieldWorkerProjectorInputError extends Error {
  public readonly name = 'FieldWorkerProjectorInputError';
  public constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
  }
}

/** A `posted` whose VERIFIED authorization targets neither `toDistrict` nor the LOCKED row's `district` — a concurrent
 *  move changed it after the gate, or a caller bug (the command cannot tell which) (QE5 guard 3c, QE17). */
export class FieldWorkerAuthorizationStaleError extends Error {
  public readonly name = 'FieldWorkerAuthorizationStaleError';
  public constructor(
    public readonly fieldWorkerId: string,
    public readonly targetDistrict: string | null,
  ) {
    super(`field worker ${fieldWorkerId}: the authorization targets a district that is neither end of this move`);
  }
}

/** `posted` to the district the worker already reports to (QE5 guard 3b). */
export class FieldWorkerDistrictUnchangedError extends Error {
  public readonly name = 'FieldWorkerDistrictUnchangedError';
  public constructor(public readonly fieldWorkerId: string) {
    super(`field worker ${fieldWorkerId} already reports to that district`);
  }
}

/** `assertDistrictRecorded`: the district is not a LISTED district of the Pariwar (QE17). */
export class FieldWorkerDistrictUnknownError extends Error {
  public readonly name = 'FieldWorkerDistrictUnknownError';
  public constructor(public readonly pariwarId: string) {
    super(`the district is not a listed district of Pariwar ${pariwarId}`);
  }
}

/** `terminated` with an `ended_on` that is missing, malformed, in the future, or before the registration day — IST days,
 *  in SQL (QE20). Command-only. */
export class FieldWorkerEndedOnInvalidError extends Error {
  public readonly name = 'FieldWorkerEndedOnInvalidError';
  public constructor(
    public readonly fieldWorkerId: string,
    public readonly reason: 'missing_or_malformed' | 'in_future' | 'before_registration',
  ) {
    super(`field worker ${fieldWorkerId}: the last day of the engagement is ${reason.replace(/_/g, ' ')}`);
  }
}

/** `getFieldWorkerStateAt` given an unknown `captureId`, or another Pariwar's (AC10). ⛔ `null` — that means "unknown worker". */
export class FieldWorkerCaptureNotFoundError extends Error {
  public readonly name = 'FieldWorkerCaptureNotFoundError';
  public constructor(
    public readonly pariwarId: string,
    public readonly captureId: string,
  ) {
    super(`capture ${captureId} is not a member_attribution row of Pariwar ${pariwarId}`);
  }
}
