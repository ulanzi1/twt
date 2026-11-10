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

// ── Story 13.1d — the move request and the officers' notices (decision `2026-11-08-458` AD3, AD7, AD8, AD9) ──────────────────
// Re-declared like the tuples above; the sync-guard (tests/field-workers.test.ts) binds each to its @twt/domain source.

/** A move request's states (`schema.FIELD_WORKER_MOVE_REQUEST_STATES`) — open: `pending`, `escalated`; the rest final. */
export const FIELD_WORKER_MOVE_REQUEST_STATES = ['pending', 'escalated', 'accepted', 'refused', 'withdrawn', 'closed', 'superseded'] as const;
export const FieldWorkerMoveRequestState = z.enum(FIELD_WORKER_MOVE_REQUEST_STATES);
export type FieldWorkerMoveRequestState = z.output<typeof FieldWorkerMoveRequestState>;

/** The refusal list (AD7) — never free text. */
export const FIELD_WORKER_MOVE_REFUSAL_REASONS = ['no_capacity', 'work_not_needed_here', 'request_incomplete', 'other'] as const;
export const FieldWorkerMoveRefusalReason = z.enum(FIELD_WORKER_MOVE_REFUSAL_REASONS);
export type FieldWorkerMoveRefusalReason = z.output<typeof FieldWorkerMoveRefusalReason>;

/** Why a request went to the Pariwar Admin (AD8). */
export const FIELD_WORKER_MOVE_ESCALATION_CAUSES = ['unanswered_7_days', 'no_counterpart_officer'] as const;
export const FieldWorkerMoveEscalationCause = z.enum(FIELD_WORKER_MOVE_ESCALATION_CAUSES);
export type FieldWorkerMoveEscalationCause = z.output<typeof FieldWorkerMoveEscalationCause>;

/** What ended an open request without an answer (AD3). */
export const FIELD_WORKER_MOVE_SUPERSEDE_CAUSES = ['worker_moved', 'worker_ended'] as const;
export const FieldWorkerMoveSupersedeCause = z.enum(FIELD_WORKER_MOVE_SUPERSEDE_CAUSES);
export type FieldWorkerMoveSupersedeCause = z.output<typeof FieldWorkerMoveSupersedeCause>;

/** Which end the opener holds (AD3). */
export const FIELD_WORKER_MOVE_OPENED_AT_ENDS = ['from', 'to'] as const;
export const FieldWorkerMoveOpenedAtEnd = z.enum(FIELD_WORKER_MOVE_OPENED_AT_ENDS);
export type FieldWorkerMoveOpenedAtEnd = z.output<typeof FieldWorkerMoveOpenedAtEnd>;

/** What an officer is told (AD9; `schema.FIELD_WORKER_NOTICE_KINDS`). */
export const FIELD_WORKER_NOTICE_KINDS = [
  'move_request_opened',
  'move_request_accepted',
  'move_request_refused',
  'move_request_refused_admin',
  'move_request_escalated',
  'move_request_superseded',
  'moved_by_pariwar_admin',
] as const;
export const FieldWorkerNoticeKind = z.enum(FIELD_WORKER_NOTICE_KINDS);
export type FieldWorkerNoticeKind = z.output<typeof FieldWorkerNoticeKind>;

/** The seven event types of a request's stream (`fieldWorker.FIELD_WORKER_MOVE_REQUEST_EVENT_TYPES`). */
export const FIELD_WORKER_MOVE_REQUEST_EVENT_TYPES = [
  'field_worker_move_request.opened',
  'field_worker_move_request.accepted',
  'field_worker_move_request.refused',
  'field_worker_move_request.withdrawn',
  'field_worker_move_request.escalated',
  'field_worker_move_request.closed',
  'field_worker_move_request.superseded',
] as const;
export const FieldWorkerMoveRequestEventType = z.enum(FIELD_WORKER_MOVE_REQUEST_EVENT_TYPES);
export type FieldWorkerMoveRequestEventType = z.output<typeof FieldWorkerMoveRequestEventType>;
