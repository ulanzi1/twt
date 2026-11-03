// The field-worker domain-error → HTTP mapping — Story 13.1 (AC8 (j); the "Errors and their HTTP mapping" table, API half).
//
// Row by row over EVERY row `mapFieldWorkerError` owns. The registration route's own rows (the 409 mobile / display-name /
// in-progress, the 400 key and validation, the 422s, the 503) are ALSO pinned over HTTP in
// `tests/integration/field-worker/registration*.spec.ts`; the rows ONLY A COMMAND can raise have "no route yet — 13.1a / 13.1c
// / 13.1d" and are pinned HERE. Anything outside the table — a `FieldWorkerProjectorInputError`, a `FieldWorkerPersistError`,
// the door's programming errors, a plain Error, an `ApiError` — is rethrown UNCHANGED (the SAME instance). ⛔ PII in any message.

import { fieldWorker, FieldWorkerStateDirectWriteError } from '@twt/domain';
import { describe, expect, it, vi } from 'vitest';

import { AdminDisplayNameMissingError, ApiError } from '../../src/http-errors.js';
import {
  AttributionCodeAllocationExhaustedError,
  AttributionCodeRequiresTransactionError,
  AttributionPariwarScopeMismatchError,
  FieldWorkerAlreadyHasAttributionCodeError,
} from '../../src/modules/field-worker/attribution-code-access.js';
import { mapFieldWorkerError } from '../../src/modules/field-worker/errors.js';

const FW = '6ba7b810-9dad-41d1-80b4-00c04fd430c8';
const PID = '0f8fad5b-d9cb-469f-a165-70867728950e';

function thrown(err: unknown): unknown {
  try {
    mapFieldWorkerError(err);
  } catch (e) {
    return e;
  }
  throw new Error('mapFieldWorkerError returned');
}

const mapped = (err: unknown): ApiError => {
  const e = thrown(err);
  expect(e).toBeInstanceOf(ApiError);
  return e as ApiError;
};

describe('mapFieldWorkerError — the registration route’s rows', () => {
  it.each([
    ['FieldWorkerMobileAlreadyRegisteredError', new fieldWorker.FieldWorkerMobileAlreadyRegisteredError(PID), 409, 'field_worker.mobile_already_registered'],
    ['FieldWorkerDistrictUnknownError', new fieldWorker.FieldWorkerDistrictUnknownError(PID), 422, 'field_worker.district_unknown'],
    ['AttributionCodeAllocationExhaustedError (the door’s class)', new AttributionCodeAllocationExhaustedError(PID, 8), 503, 'field_worker.code_allocation_exhausted'],
  ])('%s ⇒ %i %s', (_n, err, status, code) => {
    const e = mapped(err);
    expect([e.statusCode, e.code]).toEqual([status, code]);
  });

  it('an ApiError passes THROUGH unchanged — AdminDisplayNameMissingError stays 409 admin.display_name_missing', () => {
    const err = new AdminDisplayNameMissingError(FW);
    expect(thrown(err)).toBe(err);
    expect([err.statusCode, err.code]).toEqual([409, 'admin.display_name_missing']);
  });
});

describe('mapFieldWorkerError — the rows only a COMMAND can raise (no route yet — 13.1a / 13.1c / 13.1d)', () => {
  it.each([
    ['FieldWorkerIllegalTransitionError', new fieldWorker.FieldWorkerIllegalTransitionError(FW, 'terminated', 'field_worker.activated'), 409, 'field_worker.illegal_transition'],
    ['FieldWorkerKycAlreadyCompletedError', new fieldWorker.FieldWorkerKycAlreadyCompletedError(FW), 409, 'field_worker.kyc_already_completed'],
    ['FieldWorkerKycNotCompletedError', new fieldWorker.FieldWorkerKycNotCompletedError(FW), 409, 'field_worker.kyc_not_completed'],
    ['FieldWorkerReasonInvalidError', new fieldWorker.FieldWorkerReasonInvalidError('field_worker.suspended', 'bogus'), 422, 'field_worker.reason_invalid'],
    ['FieldWorkerGenesisMissingError', new fieldWorker.FieldWorkerGenesisMissingError(FW), 404, 'field_worker.not_found'],
    ['FieldWorkerGenesisAlreadyExistsError', new fieldWorker.FieldWorkerGenesisAlreadyExistsError(FW), 409, 'field_worker.already_exists'],
    ['FieldWorkerStreamConcurrencyError', new fieldWorker.FieldWorkerStreamConcurrencyError(FW, 4), 409, 'field_worker.stream_conflict'],
    ['FieldWorkerDistrictUnchangedError', new fieldWorker.FieldWorkerDistrictUnchangedError(FW), 409, 'field_worker.district_unchanged'],
    ['FieldWorkerAuthorizationStaleError', new fieldWorker.FieldWorkerAuthorizationStaleError(FW, 'Patna'), 409, 'field_worker.authorization_stale'],
    ['FieldWorkerEndedOnInvalidError', new fieldWorker.FieldWorkerEndedOnInvalidError(FW, 'in_future'), 422, 'field_worker.ended_on_invalid'],
  ])('%s ⇒ %i %s', (_n, err, status, code) => {
    const e = mapped(err);
    expect([e.statusCode, e.code]).toEqual([status, code]);
  });

  it('FieldWorkerStateDirectWriteError ⇒ 500 with its code, logged by code only', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      const e = mapped(new FieldWorkerStateDirectWriteError('field_workers direct write rejected — attempted UPDATE of field worker x'));
      expect([e.statusCode, e.code]).toEqual([500, 'field_worker.state_direct_write_rejected']);
      expect(log).toHaveBeenCalledTimes(1);
    } finally {
      log.mockRestore();
    }
  });
});

describe('mapFieldWorkerError — everything else is rethrown UNCHANGED (500 through the central mapper)', () => {
  it.each([
    ['FieldWorkerProjectorInputError', new fieldWorker.FieldWorkerProjectorInputError('[x] bad')],
    ['FieldWorkerPersistError', new fieldWorker.FieldWorkerPersistError(FW, new Error('boom'))],
    ['FieldWorkerCaptureNotFoundError', new fieldWorker.FieldWorkerCaptureNotFoundError(PID, FW)],
    ['FieldWorkerAlreadyHasAttributionCodeError (door)', new FieldWorkerAlreadyHasAttributionCodeError(PID, FW as never)],
    ['AttributionPariwarScopeMismatchError (door)', new AttributionPariwarScopeMismatchError(PID, FW)],
    ['AttributionCodeRequiresTransactionError (door)', new AttributionCodeRequiresTransactionError('a Pool')],
    ['a plain Error (a KMS failure)', new Error('KMS unavailable')],
  ])('%s', (_n, err) => {
    expect(thrown(err)).toBe(err);
  });
});
