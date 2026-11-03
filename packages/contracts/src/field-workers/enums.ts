// Field-worker wire enums — Story 13.1 (Task 7; QE16, QE8).
//
// RE-DECLARED here (⛔ imported from @twt/domain) for the bundle boundary ([[project_contracts_domain_bundle_boundary]] — a
// domain import leaks `pg` into the browser / Metro bundles). The domain owns the source tuples (`schema/field_workers.ts`);
// a TEST-ONLY sync-guard (tests/field-workers.test.ts) imports both and asserts they never drift.

import { z } from 'zod';

/** The field-worker lifecycle (QE5): `pending_kyc → active ⇄ suspended → terminated`. Underscore labels (QE16). */
export const FIELD_WORKER_STATES = ['pending_kyc', 'active', 'suspended', 'terminated'] as const;
export const FieldWorkerState = z.enum(FIELD_WORKER_STATES);
export type FieldWorkerState = z.output<typeof FieldWorkerState>;

/** The operator-recorded identity attestation (QE8). */
export const FIELD_WORKER_KYC_STATUSES = ['pending', 'completed'] as const;
export const FieldWorkerKycStatus = z.enum(FIELD_WORKER_KYC_STATUSES);
export type FieldWorkerKycStatus = z.output<typeof FieldWorkerKycStatus>;
