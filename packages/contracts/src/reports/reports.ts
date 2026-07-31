// packages/contracts/src/reports/reports.ts
//
// The reports-&-exports library transport DTOs (Story 10.7, Task 4) — the admin analog of the 3.11
// data-export DTOs. The request/poll-status route shapes; the download route streams the artifact bytes
// (never JSON-embedded), so it carries NO response DTO.
//
// ── Contracts discipline ──────────────────────────────────────────────────────────────────────────
// A contracts SOURCE file MUST NOT import `@twt/domain` (the browser-bundle rule — the domain barrel
// re-exports pg-touching namespaces). Plain Zod primitives only. snake_case wire (the 10.x convention;
// domain camelCase — watch the drift, [[project_story_validate_footguns]]). `.strict()` throughout.
//
// ── PII discipline (R1, the 3.11 rule) ──────────────────────────────────────────────────────────────
// NO `artifact*` field EVER crosses the contract — the CSV/JSON bytes are streamed as
// `text/csv` / `application/json`, never JSON-embedded or base64'd into a response body. The status
// response exposes only lifecycle metadata (status + timestamps + row count + a NON-PII failure code).

import { z } from 'zod';

import { Iso8601Datetime } from '../_common/primitives.js';

/** The output format (mirrors the domain `REPORT_FORMATS`). */
export const ReportFormat = z.enum(['csv', 'json']);
export type ReportFormat = z.output<typeof ReportFormat>;

/** The export lifecycle status (mirrors the domain `REPORT_EXPORT_STATUSES` / `report_exports.status`;
 *  a test-only sync-guard pins the two equal). */
export const ReportExportStatus = z.enum(['pending', 'ready', 'failed', 'consumed', 'expired']);
export type ReportExportStatus = z.output<typeof ReportExportStatus>;

/** A bounded NON-PII failure code (never an exception message; mirrors the domain
 *  `REPORT_FAILURE_REASONS` tuple — a test-only sync-guard pins them equal). */
export const ReportFailureReason = z.enum(['enqueue_failed', 'assemble_error', 'stale_pending_timeout']);
export type ReportFailureReason = z.output<typeof ReportFailureReason>;

/**
 * `POST …/admin/reports` — request a report export. `report_type` selects a registered template;
 * `params` is a bounded NON-PII record (v1 seed templates are parameterless — the scope comes from the
 * actor's grants, not the request). The idempotency key on the server is
 * `(requested_by_actor_id, report_type, sha256(params))`.
 */
export const ReportRequest = z
  .object({
    report_type: z.string().min(1).max(128),
    format: ReportFormat,
    params: z
      .record(
        z.string().min(1).max(64),
        z.union([z.string().max(256), z.number(), z.boolean()]),
      )
      .optional(),
  })
  .strict();
export type ReportRequest = z.output<typeof ReportRequest>;

/**
 * `POST …/admin/reports` response — the export handle + its current status (`pending` for a fresh
 * request, or the existing status when idempotently returning an in-flight export). The client polls
 * `GET :id` from here.
 */
export const ReportRequestResponse = z
  .object({
    report_export_id: z.string(),
    status: ReportExportStatus,
  })
  .strict();
export type ReportRequestResponse = z.output<typeof ReportRequestResponse>;

/**
 * `GET …/admin/reports/:id` — the poll-status response. Lets the admin console watch
 * `pending → ready|failed`. `failed_reason` is a bounded NON-PII code. NO `artifact*` field — the bytes
 * are streamed only.
 */
export const ReportStatusResponse = z
  .object({
    report_export_id: z.string(),
    status: ReportExportStatus,
    report_type: z.string(),
    format: ReportFormat,
    requested_at: Iso8601Datetime,
    ready_at: Iso8601Datetime.optional(),
    expires_at: Iso8601Datetime.optional(),
    row_count: z.number().int().nonnegative().optional(),
    failed_reason: ReportFailureReason.optional(),
  })
  .strict();
export type ReportStatusResponse = z.output<typeof ReportStatusResponse>;

/**
 * `GET …/admin/reports` — list THIS actor's own report exports, newest-first, bounded (the admin
 * console's "your export list", review finding: a page refresh must not lose in-flight/ready exports).
 * Same per-item shape as the poll-status response.
 */
export const ReportExportListResponse = z
  .object({
    exports: z.array(ReportStatusResponse),
  })
  .strict();
export type ReportExportListResponse = z.output<typeof ReportExportListResponse>;
