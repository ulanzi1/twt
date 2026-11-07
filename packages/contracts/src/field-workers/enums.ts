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

/** Story 13.1b (AD12) — what an officer reads about the worker's code text: five words; `null` on the wire is a worker with no row. */
export const FIELD_WORKER_CODE_SMS_STATUSES = ['sending', 'sent', 'delivered', 'not_delivered', 'not_confirmed'] as const;
export const FieldWorkerCodeSmsStatus = z.enum(FIELD_WORKER_CODE_SMS_STATUSES);
export type FieldWorkerCodeSmsStatus = z.output<typeof FieldWorkerCodeSmsStatus>;

// ── Story 13.1c — the lifecycle acts' reasons and the log's event types (AD6, AD7) ─────────────────────────────────────────
// Re-declared like the tuples above; the sync-guard (tests/field-workers.test.ts) binds each to its @twt/domain source.

/** Every reason a worker's row or stream can carry (`schema.FIELD_WORKER_REASON_CODES`, in its order — `died` LAST, migration 0203). */
export const FIELD_WORKER_REASON_CODES = [
  'under_review',
  'at_worker_request',
  'left_voluntarily',
  'inactive',
  'registered_in_error',
  'reassigned',
  'died',
] as const;
export const FieldWorkerReasonCode = z.enum(FIELD_WORKER_REASON_CODES);
export type FieldWorkerReasonCode = z.output<typeof FieldWorkerReasonCode>;

/** A suspension's reasons (`fieldWorker.FIELD_WORKER_SUSPEND_REASONS`). */
export const FIELD_WORKER_SUSPEND_REASONS = ['under_review', 'at_worker_request'] as const;
export const FieldWorkerSuspendReason = z.enum(FIELD_WORKER_SUSPEND_REASONS);
export type FieldWorkerSuspendReason = z.output<typeof FieldWorkerSuspendReason>;

/** An ending's reasons (`fieldWorker.FIELD_WORKER_TERMINATE_REASONS`; `died` — decision `2026-11-07-455`). ⛔ A labelling reason (13.6). */
export const FIELD_WORKER_TERMINATE_REASONS = ['left_voluntarily', 'inactive', 'registered_in_error', 'died'] as const;
export const FieldWorkerTerminateReason = z.enum(FIELD_WORKER_TERMINATE_REASONS);
export type FieldWorkerTerminateReason = z.output<typeof FieldWorkerTerminateReason>;

/** A move's reasons (`fieldWorker.FIELD_WORKER_POST_REASONS`). */
export const FIELD_WORKER_POST_REASONS = ['at_worker_request', 'reassigned'] as const;
export const FieldWorkerPostReason = z.enum(FIELD_WORKER_POST_REASONS);
export type FieldWorkerPostReason = z.output<typeof FieldWorkerPostReason>;

/** The seven event types of a worker's stream (`fieldWorker.FIELD_WORKER_EVENT_TYPES`). ⚠ Row 13-1f adds the undo's (13.1c C2 (iii)). */
export const FIELD_WORKER_EVENT_TYPES = [
  'field_worker.registered',
  'field_worker.kyc_completed',
  'field_worker.activated',
  'field_worker.suspended',
  'field_worker.reactivated',
  'field_worker.terminated',
  'field_worker.posted',
] as const;
export const FieldWorkerEventType = z.enum(FIELD_WORKER_EVENT_TYPES);
export type FieldWorkerEventType = z.output<typeof FieldWorkerEventType>;
