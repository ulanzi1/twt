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
// authorization stale, ended_on) had NO route in Story 13.1. Story 13.1a's approval reached six of them (illegal
// transition, the two KYC rows, not found, stream conflict, authorization stale); Story 13.1c's move, suspend, reactivate and
// terminate routes reach district unchanged and ended_on as well (a wrong reason is refused by the contract, a 400, before the
// command can raise it — that row is defence in depth). They are mapped here once, so every route inherits one mapping, and
// asserted by `field-worker-errors.test.ts`.
//
// Story 13.1a adds three rows of its own (the "Errors" table): the list's malformed cursor (400), and the decrypt's two
// failures kept APART (decision `-447` item 4) — a stored value that cannot be read (500: an integrity fault, retry never
// helps) and a key-service fault (503: retry helps). Neither message names a field, a worker or an id.
//
// ⛔ A worker's name or mobile in any message or detail (I8) — codes and ids only.

import { FieldWorkerDecryptUnavailableError, FieldWorkerIdentityUnreadableError, fieldWorker, FieldWorkerStateDirectWriteError } from '@twt/domain';

import { ApiError } from '../../http-errors.js';
import { AttributionCodeAllocationExhaustedError } from './attribution-code-access.js';

// Story 13.1b (AD6) — the decrypt and its two failures moved to `@twt/domain`. Re-exported BY NAME, so `instanceof`, the mapper below
// and every test that names them as a type are unchanged. ⛔ In `field-worker-crypto.ts` (13.1's handler unit test mocks that module
// with ONE export — TR10).
export { FieldWorkerDecryptUnavailableError, FieldWorkerIdentityUnreadableError };

/** Story 13.1a (AD8) — the 409 for a code asked of a worker who is not `active`; `current_state` rides the details (⛔ PII). */
export function codeNotAvailableError(currentState: string): ApiError {
  return new ApiError(409, 'field_worker.code_not_available', 'This field worker has no code to give out in their current state', {
    current_state: currentState,
  });
}

/**
 * Story 13.1f (AD11; `-454` Q3 A) — the 409 when ENDED records of this Pariwar hold the number being registered: their id, end date and
 * reason, information only ("the officer still decides"). The handler's OWN row (a domain error carries no HTTP, so no `details`). ⛔ A
 * name, a district or an officer.
 */
export function numberPreviouslyEndedError(
  previousEndings: readonly { field_worker_id: string; ended_on: string; reason_code: string }[],
): ApiError {
  return new ApiError(
    409,
    'field_worker.number_previously_ended',
    'This number belonged to a field worker of this Pariwar whose work has ended — review, then register again',
    { previous_endings: previousEndings },
  );
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
  // ── Rows a COMMAND raises (13.1a's approval reached the first six; 13.1c's lifecycle routes reach district unchanged and ended_on) ──
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
  // ── Story 13.1d — the move request (AD3, AD6; the story's "Errors" table) ──
  if (err instanceof fieldWorker.FieldWorkerMoveRequestOpenError) {
    throw new ApiError(409, 'field_worker.move_request_open', 'This field worker already has a move request waiting — answer or withdraw it first');
  }
  if (err instanceof fieldWorker.FieldWorkerMoveRequestNotOpenError) {
    throw new ApiError(409, 'field_worker.move_request_not_open', 'This move request is not waiting for this step — it may already have been answered, withdrawn, closed or moved on; reload the list', { state: err.state });
  }
  if (err instanceof fieldWorker.FieldWorkerMoveRequestSameOfficerError) {
    throw new ApiError(409, 'field_worker.move_request_same_officer', 'The officer who asked cannot answer their own request');
  }
  if (err instanceof fieldWorker.FieldWorkerMoveRequestNotOpenerError) {
    throw new ApiError(409, 'field_worker.move_request_not_opener', 'Only the officer who asked can withdraw this request');
  }
  if (err instanceof fieldWorker.FieldWorkerMoveRequestMissingError) {
    // Unreachable through the gate (a missing request is 403 there) — a lost race only; requests are never deleted.
    throw new ApiError(404, 'field_worker.move_request_not_found', 'This move request was not found');
  }
  if (err instanceof fieldWorker.FieldWorkerMoveRequestStreamConcurrencyError) {
    throw new ApiError(409, 'field_worker.stream_conflict', 'This move request was changed at the same time — reload and try again');
  }
  // ── Story 13.1f — the undo, the appeal, the link (the story's "Errors" table; `-465` Q6 B) ──
  if (err instanceof fieldWorker.FieldWorkerEndingChangedError) {
    throw new ApiError(409, 'field_worker.ending_changed', 'This ending has changed since you opened it — reload and try again');
  }
  if (err instanceof fieldWorker.FieldWorkerNumberRegisteredAgainError) {
    throw new ApiError(
      409,
      'field_worker.number_registered_again',
      'This number now belongs to another registration. End that registration first, if it was made in error, then undo this ending.',
    );
  }
  if (err instanceof fieldWorker.FieldWorkerAppealRefusedByPanelError) {
    throw new ApiError(
      409,
      'field_worker.appeal_refused_by_panel',
      "The Trustee Panel heard this worker's appeal and refused it. Only a new decision of the Panel can restore them.",
    );
  }
  if (err instanceof fieldWorker.FieldWorkerLinkInvalidError) {
    throw new ApiError(422, 'field_worker.link_invalid', 'The record to link is not an ended record of this Pariwar with the same number');
  }
  if (err instanceof fieldWorker.FieldWorkerAppealOpenError) {
    throw new ApiError(409, 'field_worker.appeal_open', 'This worker already has an appeal waiting for a decision');
  }
  if (err instanceof fieldWorker.FieldWorkerAppealAlreadyDecidedError) {
    throw new ApiError(409, 'field_worker.appeal_already_decided', 'An appeal against this ending has already been heard and refused');
  }
  if (err instanceof fieldWorker.FieldWorkerAppealNotOpenError) {
    throw new ApiError(409, 'field_worker.appeal_not_open', 'This appeal is no longer waiting for a decision — reload the list', { state: err.state });
  }
  if (err instanceof fieldWorker.FieldWorkerAppealWrongHearerError) {
    throw new ApiError(409, 'field_worker.appeal_wrong_hearer', 'This appeal is heard by someone else');
  }
  if (err instanceof fieldWorker.FieldWorkerAppealDeciderIsEnderError) {
    throw new ApiError(409, 'field_worker.appeal_decider_is_ender', "The officer who ended this worker cannot decide or withdraw their appeal");
  }
  if (err instanceof fieldWorker.FieldWorkerAppealDateInvalidError) {
    throw new ApiError(422, 'field_worker.appeal_date_invalid', 'The date is not a real date, or is outside the days it may be');
  }
  if (err instanceof fieldWorker.FieldWorkerAppealMissingError) {
    // Unreachable through the gate (a missing appeal is 403 there) — a lost race only; appeals are never deleted.
    throw new ApiError(404, 'field_worker.appeal_not_found', 'This appeal was not found');
  }
  if (err instanceof fieldWorker.FieldWorkerAppealStreamConcurrencyError) {
    throw new ApiError(409, 'field_worker.stream_conflict', 'This appeal was changed at the same time — reload and try again');
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
