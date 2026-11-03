// Field-worker contracts barrel — Story 13.1 (Task 7).
//
// The wire enums (re-declared, sync-guarded against the @twt/domain tuples by tests/field-workers.test.ts) and the DTOs of
// the ONE route this story builds: `POST /api/v1/p/:pariwarId/field-workers` (register a worker; `field_worker.register`,
// district dimension). ⛔ A code in any response (QE22). The other lifecycle routes are Stories 13.1a / 13.1c / 13.1d.

export { FIELD_WORKER_STATES, FieldWorkerState, FIELD_WORKER_KYC_STATUSES, FieldWorkerKycStatus } from './enums.js';

export { RegisterFieldWorkerRequest, RegisterFieldWorkerResponse } from './dto.js';
