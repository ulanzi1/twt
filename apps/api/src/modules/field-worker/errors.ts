// The field-worker surface's error mapper — Story 13.1 (Task 7; the story's "Errors and their HTTP mapping" table, API half).
//
// The domain errors carry ⛔ HTTP; this maps the table's DOMAIN rows. The handler raises its own rows as `ApiError`s (the
// 422 name / mobile, the 400 key, the 409 in-progress) and `AdminDisplayNameMissingError` is already an `ApiError` (409
// `admin.display_name_missing`) — both pass THROUGH unchanged. `withCompensatingAudit` RETHROWS after writing its
// `_rolled_back` line, so mapping here (the handler's outer `catch`) keeps the compensating line. Anything not in the
// table — a `FieldWorkerProjectorInputError`, a `FieldWorkerPersistError`, the door's programming-error classes, a KMS
// failure, a bug — is rethrown UNCHANGED for the central mapper to answer 500.
//
// The rows ONLY A COMMAND can raise (illegal transition, KYC, reason, not found, stream conflict, district unchanged,
// authorization stale, ended_on) had NO route in Story 13.1. Story 13.1a's approval now reaches six of them (illegal
// transition, the two KYC rows, not found, stream conflict, authorization stale); the rest wait for 13.1c / 13.1d. They are
// mapped here once, so every route inherits one mapping, and asserted by `field-worker-errors.test.ts`.
//
// Story 13.1a adds three rows of its own (the "Errors" table): the list's malformed cursor (400), and the decrypt's two
// failures kept APART (decision `-447` item 4) — a stored value that cannot be read (500: an integrity fault, retry never
// helps) and a key-service fault (503: retry helps). Neither message names a field, a worker or an id.
//
// ⛔ A worker's name or mobile in any message or detail (I8) — codes and ids only.

import { fieldWorker, FieldWorkerStateDirectWriteError } from '@twt/domain';

import { ApiError } from '../../http-errors.js';
import { AttributionCodeAllocationExhaustedError } from './attribution-code-access.js';

/**
 * Story 13.1a (`-447` item 4, `-449`) — a stored worker identity that cannot be read: an UNPARSEABLE envelope, one whose wrapped key
 * the key service refuses (gRPC INVALID_ARGUMENT, expected for one corrupt or sealed under another Pariwar / class / KEK;
 * ⚠ un-attested against the live service), or one whose key unwraps but which fails local authenticated decryption (AES-GCM — tampered or corrupt). Retry never
 * helps. → 500.
 * Lives HERE, ⛔ in `field-worker-crypto.ts` (13.1's handler unit test mocks that module with ONE export — TR10).
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

/** Story 13.1a (AD8) — the 409 for a code asked of a worker who is not `active`; `current_state` rides the details (⛔ PII). */
export function codeNotAvailableError(currentState: string): ApiError {
  return new ApiError(409, 'field_worker.code_not_available', 'This field worker has no code to give out in their current state', {
    current_state: currentState,
  });
}

/**
 * Map a domain error to its transport error and THROW it; rethrow anything else unchanged. ⛔ Returns.
 */
export function mapFieldWorkerError(err: unknown): never {
  if (err instanceof ApiError) throw err;
  if (err instanceof fieldWorker.FieldWorkerMobileAlreadyRegisteredError) {
    throw new ApiError(409, 'field_worker.mobile_already_registered', 'A field worker with this mobile number is already registered in this Pariwar');
  }
  if (err instanceof fieldWorker.FieldWorkerDistrictUnknownError) {
    throw new ApiError(422, 'field_worker.district_unknown', 'That district is not a listed district of this Pariwar');
  }
  if (err instanceof AttributionCodeAllocationExhaustedError) {
    // The flag was attempted first (QE9); a failing flag write never replaces this answer.
    throw new ApiError(503, 'field_worker.code_allocation_exhausted', 'No attribution code could be allocated just now — please try again later');
  }
  // ── Story 13.1a's own rows ──
  if (err instanceof fieldWorker.FieldWorkerCursorInvalidError) {
    throw new ApiError(400, 'field_worker.cursor_invalid', 'The list position is not valid — start the list again');
  }
  if (err instanceof FieldWorkerIdentityUnreadableError) {
    // An integrity incident, meant to be loud (AD9): logged by class and stage only.
    console.error('[field-worker] a stored identity could not be read', JSON.stringify({ stage: err.stage }));
    throw new ApiError(500, 'field_worker.identity_unreadable', "This field worker's stored details cannot be read. Do not approve; tell the maintainer.");
  }
  if (err instanceof FieldWorkerDecryptUnavailableError) {
    throw new ApiError(503, 'field_worker.decrypt_unavailable', 'The key service is unavailable just now — please try again shortly');
  }
  // ── Rows a COMMAND raises (the approval route — 13.1a — reaches the first six; the others wait for 13.1c / 13.1d) ──
  if (err instanceof fieldWorker.FieldWorkerIllegalTransitionError) {
    throw new ApiError(409, 'field_worker.illegal_transition', 'This field worker cannot be changed from their current state');
  }
  if (err instanceof fieldWorker.FieldWorkerKycAlreadyCompletedError) {
    throw new ApiError(409, 'field_worker.kyc_already_completed', 'Identity verification is already recorded for this field worker');
  }
  if (err instanceof fieldWorker.FieldWorkerKycNotCompletedError) {
    throw new ApiError(409, 'field_worker.kyc_not_completed', 'Identity verification must be recorded before the field worker is activated');
  }
  if (err instanceof fieldWorker.FieldWorkerReasonInvalidError) {
    throw new ApiError(422, 'field_worker.reason_invalid', 'That reason is not valid for this change');
  }
  if (err instanceof fieldWorker.FieldWorkerGenesisMissingError) {
    throw new ApiError(404, 'field_worker.not_found', 'This field worker was not found');
  }
  if (err instanceof fieldWorker.FieldWorkerGenesisAlreadyExistsError) {
    // Unreachable with server-minted ids — mapped so a same-id race never surfaces as a PersistError 500.
    throw new ApiError(409, 'field_worker.already_exists', 'This field worker already exists');
  }
  if (err instanceof fieldWorker.FieldWorkerStreamConcurrencyError) {
    throw new ApiError(409, 'field_worker.stream_conflict', 'This field worker was changed at the same time — reload and try again');
  }
  if (err instanceof fieldWorker.FieldWorkerDistrictUnchangedError) {
    throw new ApiError(409, 'field_worker.district_unchanged', 'The field worker already reports to that district');
  }
  if (err instanceof fieldWorker.FieldWorkerAuthorizationStaleError) {
    // A business race (a concurrent move), ⛔ the 500 of a programming error (QE5 guard 3c).
    throw new ApiError(409, 'field_worker.authorization_stale', 'The field worker was moved meanwhile — reload and try again');
  }
  if (err instanceof fieldWorker.FieldWorkerEndedOnInvalidError) {
    throw new ApiError(422, 'field_worker.ended_on_invalid', 'The last day must be a real date, not in the future and not before the registration day');
  }
  if (err instanceof FieldWorkerStateDirectWriteError) {
    // The 0200 trigger — a BUG (the projector writes under the guard). The detail carries ids and states only.
    console.error('[field-worker] field_workers direct write rejected', JSON.stringify({ code: err.code }));
    throw new ApiError(500, err.code, 'The field worker could not be saved');
  }
  // FieldWorkerProjectorInputError, FieldWorkerPersistError, FieldWorkerCaptureNotFoundError, the door's programming errors,
  // a KMS failure, anything else: unchanged (500 through the central mapper).
  throw err;
}
