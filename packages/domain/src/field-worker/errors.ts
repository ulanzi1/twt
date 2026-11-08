// Field-worker typed domain errors — Story 13.1 (QE5, QE13; the "Errors and their HTTP mapping" table). Twin of
// marketplace/errors.ts.
//
// Every failed guard throws ONE of these with no event appended and the row unchanged (AC5). The domain functions carry
// ⛔ HTTP; the API maps them (`apps/api/src/modules/field-worker/errors.ts`). ⛔ A message carries a worker's name or
// mobile (I8) — only ids, states, event types, reason codes and districts.
//
// Only the direct-write set (`FieldWorkerStateDirectWriteError` + its code + its message prefix + its detector) and the two decrypt
// failures (Story 13.1b, AD6 — the API re-exports them by name) are surfaced at the @twt/domain TOP level — the pool / module shape.
// Everything else is reached through `fieldWorker`.
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

// ── The decrypt's two failures (Story 13.1a, moved by Story 13.1b — AD6) ────────────────────────────────

/**
 * Story 13.1a (`-447` item 4, `-449`) — a stored worker identity that cannot be read: an UNPARSEABLE envelope, one whose wrapped key
 * the key service refuses (gRPC INVALID_ARGUMENT, expected for one corrupt or sealed under another Pariwar / class / KEK;
 * ⚠ un-attested against the live service), or one whose key unwraps but which fails local authenticated decryption (AES-GCM — tampered or corrupt). Retry never
 * helps. → 500.
 */
export class FieldWorkerIdentityUnreadableError extends Error {
  public readonly name = 'FieldWorkerIdentityUnreadableError';
  public constructor(public readonly stage: 'envelope' | 'key_rejected' | 'authentication') {
    super(`a stored field-worker value cannot be read (${stage})`);
  }
}

/** Story 13.1a (`-447` item 4) — the key service failed (or could not be reached) while unwrapping a worker's key. → 503. */
export class FieldWorkerDecryptUnavailableError extends Error {
  public readonly name = 'FieldWorkerDecryptUnavailableError';
  public constructor() {
    super('the key service could not decrypt a field-worker value');
  }
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

/**
 * A reason missing, unknown, or from the wrong list for the event (suspend, terminate or post — QE12). ⛔ The value itself — in
 * the message OR a field (review R3-20): an INVALID reason is by definition not a reason code but whatever the caller sent (free
 * text — a name, a number), and this class promises ids, states, event types, codes and districts only (I8). `received` says what
 * KIND of value arrived; building it never throws (⛔ `JSON.stringify` / `String` of the value).
 */
export class FieldWorkerReasonInvalidError extends Error {
  public readonly name = 'FieldWorkerReasonInvalidError';
  public readonly received: 'missing' | 'not_a_string' | 'not_in_the_list';
  public constructor(
    public readonly eventType: string,
    reasonCode: unknown,
  ) {
    const received = reasonCode === undefined || reasonCode === null ? 'missing' : typeof reasonCode !== 'string' ? 'not_a_string' : 'not_in_the_list';
    super(`the reason (${received}) is not a valid reason for '${eventType}'`);
    this.received = received;
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

/** A VERIFIED authorization whose target district no longer matches the worker's LOCKED row — a concurrent move changed it
 *  after the gate, or a caller bug (the command cannot tell which). Thrown by `posted` (the target is neither `toDistrict` nor
 *  the row's `district`; QE5 guard 3c, QE17; and guard 3a, Story 13.1c AD4 — the source district the admin's screen showed is not
 *  the locked one), by the approval commands (13.1a guard 3d), by `suspended` / `reactivated` / `terminated` (13.1c AD3, guard 3d)
 *  and by the API's identity and by-hand code reads and its log read (13.1a `-447` items 1 and 3; 13.1c AD7).
 *
 *  `targetDistrict` is the district the CALLER named that no longer matches: the authorization's target (guards 3c and 3d) or, on
 *  guard 3a, the move's `expectedFromDistrict`. It is ⛔ the worker's present district. No code reads it today. */
export class FieldWorkerAuthorizationStaleError extends Error {
  public readonly name = 'FieldWorkerAuthorizationStaleError';
  public constructor(
    public readonly fieldWorkerId: string,
    public readonly targetDistrict: string | null,
  ) {
    super(`field worker ${fieldWorkerId}: the authorization targets a district the worker is not in at the moment of the write`);
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

/**
 * Story 13.1a (AD10) — a field-worker list cursor that is forged, malformed, truncated or of the wrong shape, refused BEFORE
 * any SQL (`decodeFieldWorkerCursor` — a failed cast would abort the read transaction). `reason` names the failed check, ⛔ the
 * cursor's text. → 400 `field_worker.cursor_invalid`.
 */
export class FieldWorkerCursorInvalidError extends Error {
  public readonly name = 'FieldWorkerCursorInvalidError';
  public constructor(public readonly reason: string) {
    super(`field-worker list cursor is invalid: ${reason}`);
  }
}

// ── Story 13.1d — the move request (decision `2026-11-08-458` AD3, AD4, AD6) ───────────────────────────────────────────────────

/** The P0001 message prefix every 0205 request-trigger raise carries. */
export const FIELD_WORKER_MOVE_REQUEST_DIRECT_WRITE_MESSAGE_PREFIX = 'field_worker_move_requests direct write rejected';

/** A request is already OPEN (`pending` / `escalated`) for this worker — the pre-read, or the partial unique BY NAME (I4). → 409. */
export class FieldWorkerMoveRequestOpenError extends Error {
  public readonly name = 'FieldWorkerMoveRequestOpenError';
  public constructor(public readonly fieldWorkerId: string) {
    super(`field worker ${fieldWorkerId} already has an open move request`);
  }
}

/** The act needs a state the request is not in: accept / refuse a non-`pending`, withdraw a final one, close a non-`escalated`. → 409. */
export class FieldWorkerMoveRequestNotOpenError extends Error {
  public readonly name = 'FieldWorkerMoveRequestNotOpenError';
  public constructor(
    public readonly moveRequestId: string,
    public readonly state: string,
  ) {
    super(`move request ${moveRequestId} is '${state}' — this act does not apply`);
  }
}

/** The opener tried to answer their own request (a District Admin holding both ends — AD3, I3). → 409. */
export class FieldWorkerMoveRequestSameOfficerError extends Error {
  public readonly name = 'FieldWorkerMoveRequestSameOfficerError';
  public constructor(public readonly moveRequestId: string) {
    super(`move request ${moveRequestId}: the officer who opened it cannot answer it`);
  }
}

/** Someone other than the opener tried to withdraw the request (AD6). → 409. */
export class FieldWorkerMoveRequestNotOpenerError extends Error {
  public readonly name = 'FieldWorkerMoveRequestNotOpenerError';
  public constructor(public readonly moveRequestId: string) {
    super(`move request ${moveRequestId}: only the officer who opened it may withdraw it`);
  }
}

/** A command on a request id with no row in this Pariwar (the API's loader refuses first — 403; this is the domain's own check). */
export class FieldWorkerMoveRequestMissingError extends Error {
  public readonly name = 'FieldWorkerMoveRequestMissingError';
  public constructor(public readonly moveRequestId: string) {
    super(`move request ${moveRequestId} has no row in this Pariwar`);
  }
}

/** The request's stream head ≠ its locked row's version (drift — never expected under the row lock), or a 23505 on the version slot. */
export class FieldWorkerMoveRequestStreamConcurrencyError extends Error {
  public readonly name = 'FieldWorkerMoveRequestStreamConcurrencyError';
  public constructor(
    public readonly moveRequestId: string,
    public readonly attemptedVersion: number,
  ) {
    super(`move request stream ${moveRequestId} concurrency conflict at event_version ${String(attemptedVersion)}`);
  }
}

/** The request row write failed or matched no row. The message carries the pg text only. */
export class FieldWorkerMoveRequestPersistError extends Error {
  public readonly name = 'FieldWorkerMoveRequestPersistError';
  public readonly sqlstate: string | null;
  public constructor(
    public readonly moveRequestId: string,
    public readonly cause: unknown,
  ) {
    super(`failed to persist move request ${moveRequestId}: ${pgMessageOf(cause)}`);
    this.sqlstate = pgSqlstateOf(cause);
  }
}
