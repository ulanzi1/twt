// packages/contracts/src/data-export/data-export.ts
//
// The DPDPA data-export transport DTOs + the ZIP section-shape schemas (Story 3.11, Task 3).
//   · The API route DTOs: the POST request response + the poll-status response.
//   · The seven ZIP section shapes + the manifest — so the job's assembled output is
//     contract-validated BEFORE zipping (catch drift; a shape change fails the build, not the member).
//
// ── Contracts discipline ──────────────────────────────────────────────────────────────────────────
// A contracts SOURCE file MUST NOT import `@twt/domain` (the browser-bundle rule — the domain barrel
// re-exports `encryption` → `node:async_hooks`). So this uses plain primitives + `Iso8601Datetime`.
// Match the nominee/medical/life-events/withdrawal openapi posture: NO `.openapi()` (keeps `v1.yaml`
// byte-stable + dodges the barrel import) — the data-export routes are NOT added to v1.yaml.
//
// ── PII discipline (R1) ───────────────────────────────────────────────────────────────────────────
// NO `artifact*` field EVER crosses the contract — the ZIP is streamed as `application/zip`, never
// JSON-embedded or base64'd into a response body. `DataExportStatusResponse` exposes only the lifecycle
// metadata (status + timestamps + a NON-PII failure code). The section shapes describe the ZIP's
// INTERNAL files (decrypted, member-audience) — those are validated in the job, never sent as JSON.

import { z } from 'zod';

import { Iso8601Datetime } from '../_common/primitives.js';

/** The export lifecycle status (mirrors the `data_exports.status` value set; validated app-layer). */
export const DataExportStatus = z.enum(['pending', 'ready', 'failed', 'consumed', 'expired']);
export type DataExportStatus = z.output<typeof DataExportStatus>;

/**
 * `POST /api/v1/member/data-export` — the response to a request. Returns the export handle + its
 * current status (`pending` for a fresh request, or the existing status when idempotently returning an
 * in-flight export). The client polls `GET :id` from here.
 */
export const DataExportRequestResponse = z
  .object({
    exportId: z.string(),
    status: DataExportStatus,
  })
  .strict();
export type DataExportRequestResponse = z.output<typeof DataExportRequestResponse>;

/**
 * `GET /api/v1/member/data-export/:id` — the poll-status response (session only, NO step-up). Lets the
 * client watch `pending → ready|failed`. `failedReason` is a bounded NON-PII code, never an exception
 * message. NO `artifact*` field — the ZIP is streamed only.
 */
export const DataExportStatusResponse = z
  .object({
    exportId: z.string(),
    status: DataExportStatus,
    requestedAt: Iso8601Datetime,
    readyAt: Iso8601Datetime.optional(),
    expiresAt: Iso8601Datetime.optional(),
    failedReason: z.enum(['enqueue_failed', 'assemble_error']).optional(),
  })
  .strict();
export type DataExportStatusResponse = z.output<typeof DataExportStatusResponse>;

// ── ZIP section shapes (validated in the job before zipping) ────────────────────────────────────────

/** The schema-stable EMPTY placeholder for a not-yet-sourced section (contribution / claim). */
export const EmptyExportSection = z
  .object({
    records: z.array(z.never()),
    _status: z.literal('no_source_system_at_this_epic'),
    _wired_by: z.string(),
  })
  .strict();
export type EmptyExportSection = z.output<typeof EmptyExportSection>;

/**
 * `contribution_history.json` — schema-stable EMPTY at Epic 3 (source = Epic 8 pools/contributions).
 * Named alias so the Epic 8 swap-in is one targeted type change here, not a grep-and-replace.
 * The `_wired_by` literal is locked to 'Epic 8' so a wrong-file substitution fails contract-validation.
 */
export const ContributionHistorySection = EmptyExportSection.extend({
  _wired_by: z.literal('Epic 8'),
});
export type ContributionHistorySection = z.output<typeof ContributionHistorySection>;

/**
 * `claim_history.json` — schema-stable EMPTY at Epic 3 (source = Epic 6 claims).
 * Named alias so the Epic 6 swap-in is one targeted type change here, not a grep-and-replace.
 * The `_wired_by` literal is locked to 'Epic 6' so a wrong-file substitution fails contract-validation.
 */
export const ClaimHistorySection = EmptyExportSection.extend({
  _wired_by: z.literal('Epic 6'),
});
export type ClaimHistorySection = z.output<typeof ClaimHistorySection>;

/** `profile.json` — the member's decrypted identity + declared data (member is the legitimate audience). */
export const ProfileSection = z
  .object({
    memberId: z.string(),
    pariwarId: z.string(),
    state: z.string().nullable(),
    lockInDaysAtJoin: z.number().int().nullable(),
    createdAt: Iso8601Datetime.nullable(),
    identity: z.object({ mobile: z.string() }).strict().nullable(),
    kyc: z
      .object({
        name: z.string(),
        dob: z.string(),
        aadhaarMaskedId: z.string().nullable(),
        verificationStrength: z.string(),
        source: z.string(),
        trusteeVerified: z.boolean(),
        photoPresent: z.boolean(),
      })
      .strict()
      .nullable(),
    address: z
      .object({ addressLine: z.string(), locale: z.string(), recordedAt: Iso8601Datetime })
      .strict()
      .nullable(),
    nominees: z.array(
      z
        .object({
          rank: z.number().int().positive(),
          name: z.string(),
          relationship: z.string(),
          mobile: z.string(),
          address: z.string().nullable(),
          splitPct: z.number().int().min(0).max(100),
        })
        .strict(),
    ),
    medicalDisclosures: z.array(
      z
        .object({
          imaListVersion: z.string(),
          disclosedConditions: z.string(),
          additionalContext: z.string().nullable(),
          conditionCount: z.number().int().nonnegative(),
          acknowledgedAt: Iso8601Datetime,
        })
        .strict(),
    ),
    postings: z.array(
      z
        .object({
          district: z.string(),
          pariwarRef: z.string().nullable(),
          isRetirement: z.boolean(),
          recordedAt: Iso8601Datetime,
        })
        .strict(),
    ),
    attribution: z.array(
      z.object({ attributionSource: z.string(), capturedAt: Iso8601Datetime }).strict(),
    ),
  })
  .strict();
export type ProfileSection = z.output<typeof ProfileSection>;

/** `consent_records.json` — all consent grants/revocations (Story 2.7). */
export const ConsentRecordsSection = z
  .object({
    records: z.array(
      z
        .object({
          consentId: z.string(),
          consentType: z.string(),
          grantedAt: Iso8601Datetime,
          revokedAt: Iso8601Datetime.nullable(),
          revocationReason: z.string().nullable(),
          consentArtifactRef: z.string().nullable(),
        })
        .strict(),
    ),
  })
  .strict();
export type ConsentRecordsSection = z.output<typeof ConsentRecordsSection>;

/** `payment_receipts.json` — all Vyawastha Shulk receipts (Story 3.6b). */
export const PaymentReceiptsSection = z
  .object({
    records: z.array(
      z
        .object({
          receiptId: z.string(),
          tr: z.string(),
          utr: z.string(),
          amountInr: z.number().int().positive(),
          paymentMethod: z.string(),
          paidAt: Iso8601Datetime,
          validThrough: Iso8601Datetime,
        })
        .strict(),
    ),
  })
  .strict();
export type PaymentReceiptsSection = z.output<typeof PaymentReceiptsSection>;

/** `event_stream.json` — the member's full events_log history (Story 3.1; the canonical record). */
export const EventStreamSection = z
  .object({
    records: z.array(
      z
        .object({
          eventId: z.string(),
          eventType: z.string(),
          eventVersion: z.number().int().positive(),
          occurredAt: Iso8601Datetime,
          actorId: z.string().nullable(),
          payload: z.unknown(),
        })
        .strict(),
    ),
  })
  .strict();
export type EventStreamSection = z.output<typeof EventStreamSection>;

/** `audit_history.json` — audit lines where this member is the actor (Story 1.10). */
export const AuditHistorySection = z
  .object({
    records: z.array(
      z
        .object({
          auditId: z.string(),
          action: z.string(),
          resourceLocator: z.string(),
          responseStatus: z.number().int().min(100).max(599),
          recordedAt: Iso8601Datetime,
          actorRole: z.string().nullable(),
        })
        .strict(),
    ),
  })
  .strict();
export type AuditHistorySection = z.output<typeof AuditHistorySection>;

/** `manifest.json` — the export descriptor. */
export const ManifestSection = z
  .object({
    exportId: z.string(),
    memberId: z.string(),
    pariwarId: z.string(),
    generatedAt: Iso8601Datetime,
    schemaVersion: z.literal(1),
    files: z.array(z.string()),
  })
  .strict();
export type ManifestSection = z.output<typeof ManifestSection>;
