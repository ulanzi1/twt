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
// authorization stale, ended_on) have NO route in Story 13.1 — "no route yet — 13.1a / 13.1c / 13.1d". They are mapped
// here once, so the routes that call those commands inherit one mapping, and asserted by `field-worker-errors.test.ts`.
//
// ⛔ A worker's name or mobile in any message or detail (I8) — codes and ids only.

import { fieldWorker, FieldWorkerStateDirectWriteError } from '@twt/domain';

import { ApiError } from '../../http-errors.js';
import { AttributionCodeAllocationExhaustedError } from './attribution-code-access.js';

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
  // ── No route yet — 13.1a / 13.1c / 13.1d ──
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
