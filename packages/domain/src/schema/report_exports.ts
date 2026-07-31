// `report_exports` — the ADMIN/trustee reports-&-exports library request + its envelope-encrypted
// CSV/JSON artifact (Story 10.7, Task 1).
//
// The ADMIN analog of `data_exports` (Story 3.11). One row per report-export request: an admin/trustee
// asks for a standard report (member roster, contribution-rate-by-district, audit-log query, …); a
// pg-boss job assembles it OFF the request path — SCOPE-RESPECTING (only rows within the actor's RBAC
// scope) and PII-MASKED (Tier-1 is NEVER decrypted into a v1 report) — serializes it (CSV via the reused
// `toCsv` / canonical JSON), stores it HERE envelope-encrypted at rest (`artifact_ciphertext`), then
// serves it through a one-time, 24h, admin-session-gated API download stream. The hygiene vacuum zeroes
// the artifact once consumed/expired.
//
// ── The ONE load-bearing difference from `data_exports`: ACTOR-SCOPED, NOT member-scoped ────────────
// In 3.11 the requestor is a MEMBER exporting their OWN data → the ownership/FK key is `member_id` with
// an RTBF cascade. In 10.7 the requestor is an ADMIN exporting OTHER members' data → the ownership/
// idempotency key is `requested_by_actor_id` (the admin's user id). ⚠ There is NO member FK / NO cascade
// (an admin is not a member row). The tenant column stays `pariwar_id` (RLS predicate).
//
// TENANT-ISOLATED (mirrors `data_exports` / `member_withdrawals`, NOT the global identity-auth carve-out).
// A report export belongs to exactly one Pariwar; the job's generation write + the API's status/download
// reads run under that Pariwar's `app.pariwar_id`. RLS in policies/report-exports-rls.ts.
//
// ── DEVIATION from the append-only history tables — GRANT SELECT, INSERT, UPDATE ────────────────────
// The row transitions status (`pending → ready|failed → consumed|expired`), the job writes the artifact,
// the download stamps `consumed_at`, and the TTL vacuum zeroes `artifact_ciphertext` — all UPDATEs (the
// exact `data_exports` posture). NO direct DELETE.
//
// ── PII discipline (R1) ────────────────────────────────────────────────────────────────────────────
//   · status / failed_reason  → NON-PII bounded values (contracts `ReportExportStatus` / a bounded code
//     like `assemble_error`; value set constrained in the contract, not a DB check-constraint — the
//     data_exports posture).
//   · params_hash             → a sha256 hex digest of the canonical request params (NEVER the raw
//     params — the audit `requestPayloadHash` boundary; also the idempotency key component).
//   · artifact_ciphertext     → the serialized CSV/JSON bytes as a Tier-1 envelope ciphertext
//     (`piiColumn(1, 'report_export')`). Encrypt-at-rest even though v1 rows are masked — a scope-
//     restricted admin aggregate is sensitive, and the DEFERRED Tier-1 decrypt path will put real PII
//     here. NEVER logged; NEVER echoed; NEVER in any event / audit payload. Zeroed (→ NULL) by the vacuum.
//   · artifact_bytes / row_count → NON-PII plaintext observability. NULLABLE until generated.
//
// Naming discipline per architecture L3663-3677: DB columns snake_case, TS camelCase.
// Header style mirrors data_exports.ts / member_withdrawals.ts.

import { index, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { piiColumn } from '../encryption/column.js';
import type { PariwarId, ReportExportId } from '../ids/index.js';

export const reportExports = pgTable(
  'report_exports',
  {
    // Per-row address (UUID). Server-side gen_random_uuid() default. Branded.
    reportExportId: uuid('report_export_id').defaultRandom().primaryKey().$type<ReportExportId>(),

    // Multi-tenant scope (RLS predicate column; branded).
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),

    // The requesting ADMIN's user id — the ownership + idempotency key. NOT a member FK (an admin is
    // not a member row; NO cascade — the ⚠ deliberate deviation from data_exports.member_id).
    requestedByActorId: uuid('requested_by_actor_id').notNull(),

    // The registered report template id (e.g. `member_roster`). NON-PII bounded value (the registry
    // is the authority; value set is app-layer, not a DB enum — the data_exports.status posture).
    reportType: text('report_type').notNull(),

    // Output format — `csv` | `json`. NON-PII bounded value (contracts `ReportFormat`).
    format: text('format').notNull(),

    // sha256 hex of the canonical request params — the idempotency key component + NEVER the raw params.
    paramsHash: text('params_hash').notNull(),

    // Lifecycle status. `text` (not a pgEnum) — value set constrained in the contract
    // (`ReportExportStatus`). 'pending' | 'ready' | 'failed' | 'consumed' | 'expired'.
    status: text('status').notNull(),

    // When the admin requested the export (clock-injected at the request handler).
    requestedAt: timestamp('requested_at', { withTimezone: true, mode: 'date' }).notNull(),

    // When the job finished assembling the artifact. NULLABLE until `ready`.
    readyAt: timestamp('ready_at', { withTimezone: true, mode: 'date' }),

    // When the one-time download window closes (= ready_at + 24h). NULLABLE until `ready`.
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }),

    // When the (single) successful download happened — the one-time flag. NULLABLE until consumed.
    consumedAt: timestamp('consumed_at', { withTimezone: true, mode: 'date' }),

    // A bounded NON-PII failure code (e.g. `assemble_error`, `enqueue_failed`). NULLABLE. NEVER an
    // exception message — that could leak a row value (R1).
    failedReason: text('failed_reason'),

    // The serialized CSV/JSON artifact as a Tier-1 envelope ciphertext (serialized `enc:v1:…`). The ONLY
    // at-rest home of the report bytes. NULLABLE — NULL before generation and after the vacuum zeroes it.
    artifactCiphertext: piiColumn(1, 'report_export')('artifact_ciphertext'),

    // Plaintext artifact size in bytes (non-PII, observability). NULLABLE until generated.
    artifactBytes: integer('artifact_bytes'),

    // The assembled row count (non-PII, observability + the poll-status surface). NULLABLE until ready.
    rowCount: integer('row_count'),

    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    // Serves the RLS policy predicate scans.
    index('report_exports_pariwar_id_idx').on(t.pariwarId),
    // The active-export / idempotency lookup key (an actor's exports).
    index('report_exports_requested_by_actor_id_idx').on(t.requestedByActorId),
  ],
);

export type ReportExportRow = typeof reportExports.$inferSelect;
export type ReportExportInsert = typeof reportExports.$inferInsert;
