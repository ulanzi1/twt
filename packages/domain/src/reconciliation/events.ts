// Reconciliation event vocabulary + Zod payload schemas — Story 9.3 (Tasks 2/3; Decision D6).
//
// The FIRST `reconciliation.*` events. TWO types, appended on the POOL's `events_log` stream
// (stream_id = pool_id — the same stream `pool.opened_for_contributions` lands on, so the engagement
// read mirrors `resolvePoolOpenAt` exactly):
//
//   · `reconciliation.statement-uploaded`            — a raw bank statement landed (a nominee/staff
//       upload). This ONE event serves THREE purposes (one write, no new table — the 9.1 events_log-
//       direct precedent + the "minimize new schema" Project-Structure guidance): (1) the AUDIT
//       PROVENANCE + the persisted METADATA row (object key + bank + parser version + row counts — NOT
//       the entries, Decision D2); (2) the ENGAGEMENT HEARTBEAT the nominee-console `resolveLastEngagedAt`
//       reads to reset the staff-takeover day-N clock (closes the Story 9.1 seam); (3) the seam the
//       Story 9.4 matcher re-reads to find raw blobs to replay.
//   · `reconciliation.manual_transcription_requested` — the "Hum aapke liye padh lenge" fallback: a
//       staff-mediated manual-entry request (24–48h SLA) carrying attribution, shaped for the Story 9.8
//       review queue / Epic-10 helpdesk to consume (a RESERVED SEAM — no queue render in 9.3, the same
//       discipline as 9.1's takeover flag feeding 9.8).
//
// ── Why `reconciliation.*`, NOT `contribution.*` (Decision D6 — LOCKED) ──────────────────────────────
// The canonical `contribution.*` set is fenced by Story 8.10's exactly-THREE-types executable negative
// (`packages/domain/tests/contribution/no-ingest-path.test.ts`). A `contribution.statement-uploaded`
// would be a fourth `contribution.*` type and trip that fence. A NEW `reconciliation.*` namespace is
// the deliberate choice; the 8.10 fence counts `contribution.*` only, so a `reconciliation.*` addition
// leaves it green (verified, not assumed — see the story's Task-2 note).
//
// ── Why these live in @twt/domain (not @twt/contracts) ──────────────────────────────────────────────
// `@twt/events` depends on @twt/domain; the registry (packages/events/src/registry.ts) imports these
// schemas. Putting them in @twt/contracts would reverse the legal import direction. Same rationale as
// contribution/events.ts + pool/events.ts. `occurred_at` / `pariwar_id` / `actor_id` are `events_log`
// COLUMNS and are NOT duplicated in the payloads (the actor id is the attribution "who").

import { z } from 'zod';

import { BankCode } from '../bank-statement/schema.js';

/** Who performed the upload / raised the fallback — the attribution ROLE (the actor id is the events_log
 *  column). `nominee` = Sunita's Ravi-mode session; `staff` = a District-Admin takeover / fallback operator.
 *  Kept compatible with Story 9.1's staff-takeover attribution shape so a 9.8 consumer can tell a takeover
 *  upload from a fallback request without a schema mismatch. */
export const ReconciliationActorRole = z.enum(['nominee', 'staff']);
export type ReconciliationActorRole = z.output<typeof ReconciliationActorRole>;

/** Why an upload took the human-fallback path (Decision D1 routing). Value-aligned with the contracts
 *  `BankStatementFallbackReason` (contracts cannot import domain — the browser-bundle rule — so the enum
 *  is re-declared there and kept in lockstep by the contracts reconciliation test, the BankCode precedent). */
export const ReconciliationFallbackReason = z.enum(['unsupported_file', 'unknown_bank', 'parse_failed']);
export type ReconciliationFallbackReason = z.output<typeof ReconciliationFallbackReason>;

/**
 * `reconciliation.statement-uploaded` payload. A raw statement landed + was stored; this is the metadata
 * row (Decision D2 — object key + provenance + COUNTS, never the entries) AND the engagement heartbeat.
 * `.strict()`.
 *
 *   · `poolId` / `claimCaseId` — the scope the statement is filed against (poolId is the stream + the
 *       engagement-read key; claimCaseId links the originating claim for attribution).
 *   · `bankCode`      — the declared bank whose parser was selected.
 *   · `objectKey`     — the opaque, non-PII blob key in `BankStatementStorage` (9.4 re-reads by this).
 *   · `parsed`        — did the CSV normalize into ≥1 canonical entry inline? (false ⇒ the file was stored
 *       but routed to the fallback — a PDF/image/unknown-bank/zero-row file; still a genuine "upload").
 *   · `parserVersion` — the `bank@N` version that produced the summary (null when `parsed` is false).
 *   · `rowsParsed` / `rowsRejected` — the summary counts (both 0 when `parsed` is false and nothing ran).
 *   · `uploadedByRole` — nominee vs staff-takeover (the 9.1-compatible attribution role).
 */
export const ReconciliationStatementUploadedPayloadSchema = z
  .object({
    poolId: z.string().uuid(),
    claimCaseId: z.string().uuid(),
    bankCode: BankCode,
    objectKey: z.string().min(1),
    parsed: z.boolean(),
    parserVersion: z.string().min(1).nullable(),
    rowsParsed: z.number().int().nonnegative(),
    rowsRejected: z.number().int().nonnegative(),
    uploadedByRole: ReconciliationActorRole,
  })
  .strict();
export type ReconciliationStatementUploadedPayload = z.infer<
  typeof ReconciliationStatementUploadedPayloadSchema
>;

/**
 * `reconciliation.manual_transcription_requested` payload (the "padh lenge" fallback task). Carries the
 * 24–48h SLA marker + attribution, shaped for the Story 9.8 review queue / Epic-10 helpdesk (a reserved
 * seam — no live consumer in 9.3). `bankCode`/`objectKey` are nullable: an `unknown_bank` fallback may
 * have no recognized bank, and a pure `requested` fallback (the nominee asks for help without a parseable
 * file) may have no stored blob. `.strict()`.
 */
export const ReconciliationManualTranscriptionRequestedPayloadSchema = z
  .object({
    poolId: z.string().uuid(),
    claimCaseId: z.string().uuid(),
    bankCode: BankCode.nullable(),
    /** The stored raw-statement blob key if a file was uploaded; null for a no-file `requested` fallback. */
    objectKey: z.string().min(1).nullable(),
    reason: ReconciliationFallbackReason,
    /** The staff-transcription SLA in whole hours (the 24–48h AC2 window). */
    slaHours: z.number().int().positive(),
    requestedByRole: ReconciliationActorRole,
  })
  .strict();
export type ReconciliationManualTranscriptionRequestedPayload = z.infer<
  typeof ReconciliationManualTranscriptionRequestedPayloadSchema
>;

/**
 * `reconciliation.confirmation-reversed` payload (Story 9.4, Decision D1) — the ONLY un-confirm path. The
 * COMPENSATING event a trustee-attested review-and-reverse (Story 9.8: step-up OTP via 5.9 + reason-code +
 * State-Trustee attestation à la 6.14) emits to explicitly walk back a prior `contribution.confirmed`. It
 * lives in the `reconciliation.*` namespace DELIBERATELY (NOT `contribution.confirmation.reversed`): the
 * `contribution.*` vocabulary is fenced at exactly three by Story 8.10, and a fourth `contribution.*` type
 * would trip it — the 9.3 D6 precedent that opened this namespace exactly to stay off the fence (AC7).
 *
 * Story 9.4 REGISTERS this type + its schema and PROVES the matcher never emits it (the monotonic-
 * confirmation invariant, AC5); Story 9.8 is the PRODUCER. The `reversedConfirmedEventId` links the exact
 * confirmation being reversed; `attestedByActorIds` is the trustee attestation (≥1, NON-PII actor ids);
 * `reasonCode` is a machine token (no free-text PII). Cross-story name contract: Story 9.5's reversal-
 * consumer read + Story 9.6's held-pill MUST key on this exact string. `.strict()`.
 */
export const ReconciliationConfirmationReversedPayloadSchema = z
  .object({
    poolId: z.string().uuid(),
    memberId: z.string().uuid(),
    /** The alert stream the reversed confirmation rode (verdicts are alert-stream events, Decision D2). */
    alertId: z.string().uuid(),
    /** The `contribution.confirmed` event id this compensating event reverses (the monotonic link). */
    reversedConfirmedEventId: z.string().uuid(),
    /** A machine reason token for the reversal (no free-text PII). */
    reasonCode: z.string().min(1),
    /** The attesting State-Trustee actor id(s) — ≥1, NON-PII controlled-staff attribution (à la 6.14). */
    attestedByActorIds: z.array(z.string().min(1)).min(1),
    reversedAt: z.string().datetime(),
  })
  .strict();
export type ReconciliationConfirmationReversedPayload = z.infer<
  typeof ReconciliationConfirmationReversedPayloadSchema
>;

// ── The reconciliation-event vocabulary + the type→schema map (single source) ─────────────────────────

export const RECONCILIATION_STATEMENT_UPLOADED_EVENT_TYPE = 'reconciliation.statement-uploaded' as const;
export const RECONCILIATION_MANUAL_TRANSCRIPTION_REQUESTED_EVENT_TYPE =
  'reconciliation.manual_transcription_requested' as const;
/** Story 9.4 (Decision D1) — the compensating reversal event type (the ONLY un-confirm path; 9.8 produces it). */
export const RECONCILIATION_CONFIRMATION_REVERSED_EVENT_TYPE =
  'reconciliation.confirmation-reversed' as const;

export const RECONCILIATION_EVENT_TYPES = [
  RECONCILIATION_STATEMENT_UPLOADED_EVENT_TYPE,
  RECONCILIATION_MANUAL_TRANSCRIPTION_REQUESTED_EVENT_TYPE,
  RECONCILIATION_CONFIRMATION_REVERSED_EVENT_TYPE,
] as const;

/** The dotted `reconciliation.*` event-type literal union (Story 9.3 lands the first two). */
export type ReconciliationEventType = (typeof RECONCILIATION_EVENT_TYPES)[number];

/**
 * type → payload-schema map. The ONE place the reconciliation events bind to their schemas;
 * `EVENT_TYPE_REGISTRY` (packages/events) + the API upload handler consume it. The `satisfies` keeps it
 * exhaustive — adding a `ReconciliationEventType` without a schema is a compile error.
 */
export const RECONCILIATION_EVENT_PAYLOAD_SCHEMAS = {
  [RECONCILIATION_STATEMENT_UPLOADED_EVENT_TYPE]: ReconciliationStatementUploadedPayloadSchema,
  [RECONCILIATION_MANUAL_TRANSCRIPTION_REQUESTED_EVENT_TYPE]:
    ReconciliationManualTranscriptionRequestedPayloadSchema,
  [RECONCILIATION_CONFIRMATION_REVERSED_EVENT_TYPE]: ReconciliationConfirmationReversedPayloadSchema,
} as const satisfies Record<ReconciliationEventType, z.ZodTypeAny>;
