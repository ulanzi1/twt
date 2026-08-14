// `data_exports` — the member's DPDPA data-portability export request + its envelope-encrypted ZIP
// artifact (Story 3.11, Task 1).
//
// One row per export request (FR-95). A member asks for a copy of all their data; a pg-boss job
// (Story 1.12 substrate) assembles a seven-file human-readable ZIP off the request path and stores it
// HERE — envelope-encrypted at rest (`artifact_ciphertext`) — then serves it through a one-time, 24h,
// session + step-up-gated API download stream. The `members` table stays the PII-FREE lifecycle anchor
// (Story 3.1); the export artifact + its lifecycle land HERE.
//
// TENANT-ISOLATED (mirrors `member_withdrawals` / `member_kyc_profiles`, NOT the global identity-auth
// carve-out). An export belongs to exactly one member in exactly one Pariwar; the job's generation
// write + the API's status/download reads run under that Pariwar's `app.pariwar_id`. RLS in
// policies/data-exports-rls.ts.
//
// ── DEVIATION from the append-only history tables — GRANT SELECT, INSERT, UPDATE ───────────────────
// The row transitions status (`pending → ready|failed → consumed|expired`), the job writes the
// artifact, the download stamps `consumed_at`, and the TTL vacuum zeroes `artifact_ciphertext`. All
// UPDATEs — hence the GRANT widens beyond the append-only Life Events tables (mirror
// member_withdrawals). NO direct DELETE.
// ⛔ CORRECTED at Story 10.21 (AC11). This line previously read "RTBF removal (Story 3.12) is via the
// member FK cascade" — that was NEVER TRUE. Story 3.12 shipped RTBF as a SOFT delete: `member/
// anonymize.ts` performs zero `delete()` calls and the `members` row is RETAINED, so `ON DELETE
// CASCADE` never fires. The claim had asserted a protection that did not exist since 3.11 landed.
// The REAL mechanism is now an explicit block at the end of `anonymizeMember`: it NULLs
// `artifact_ciphertext` on every row of the member and flips `pending`/`ready` → `expired`, in the
// erasure's own transaction. (The `consumed` STATUS is deliberately left alone — Escalation 9.)
//
// ── PII discipline (R1) ────────────────────────────────────────────────────────────────────────────
//   · status / failed_reason  → NON-PII bounded values (contracts `DataExportStatus`; failed_reason is
//     a bounded code like `assemble_error`, never an exception message). Value set constrained in the
//     contract, NOT a DB check-constraint — the kyc_transactions.status / member_addresses.locale
//     app-layer-enum posture.
//   · artifact_ciphertext     → the WHOLE ZIP as a Tier-1 envelope ciphertext (`piiColumn(1,
//     'data_export')`). The plaintext ZIP contains the member's DECRYPTED PII — it NEVER sits at rest.
//     Decrypted only inside the gated download handler; zeroed (→ NULL) by the vacuum once consumed or
//     expired. NEVER logged; NEVER echoed; NEVER in any event / audit payload.
//   · artifact_bytes          → the plaintext ZIP size (non-PII, observability only). NULLABLE.
//
// Naming discipline per architecture L3663-3677: DB columns snake_case, TS camelCase.
// Header style mirrors member_withdrawals.ts / vyawastha_shulk_receipts.ts.

import { index, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { piiColumn } from '../encryption/column.js';
import type { DataExportId, HelpdeskTicketId, MemberId, PariwarId } from '../ids/index.js';

/** The originating channel of an export request (migration 0103 CHECK mirrors this union). */
export type DataExportRequestedVia = 'member_portal' | 'off_portal_admin';
import { members } from './members.js';

export const dataExports = pgTable(
  'data_exports',
  {
    // Per-row address (UUID). Server-side gen_random_uuid() default. Branded.
    exportId: uuid('export_id').defaultRandom().primaryKey().$type<DataExportId>(),

    // The requesting member. FK → members.member_id (RTBF cascade, Story 3.12). NOT the PK.
    memberId: uuid('member_id')
      .$type<MemberId>()
      .notNull()
      .references(() => members.memberId, { onDelete: 'cascade' }),

    // Multi-tenant scope (RLS predicate column; branded).
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),

    // Lifecycle status. `text` (not a pgEnum) — the value set is constrained in the contract
    // (`DataExportStatus`), not the DB. 'pending' | 'ready' | 'failed' | 'consumed' | 'expired'.
    status: text('status').notNull(),

    // When the member requested the export (clock-injected at the request handler).
    requestedAt: timestamp('requested_at', { withTimezone: true, mode: 'date' }).notNull(),

    // When the job finished assembling the artifact. NULLABLE until `ready`.
    readyAt: timestamp('ready_at', { withTimezone: true, mode: 'date' }),

    // When the one-time download window closes (= ready_at + 24h). NULLABLE until `ready`.
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }),

    // When the (single) successful download happened — the one-time flag. NULLABLE until consumed.
    consumedAt: timestamp('consumed_at', { withTimezone: true, mode: 'date' }),

    // A bounded NON-PII failure code (e.g. `assemble_error`, `enqueue_failed`). NULLABLE. NEVER an
    // exception message — that could leak a field value (R1).
    failedReason: text('failed_reason'),

    // The WHOLE ZIP as a Tier-1 envelope ciphertext (serialized `enc:v1:…`). The ONLY at-rest home of
    // the member's decrypted export. NULLABLE — NULL before generation and after the vacuum zeroes it.
    artifactCiphertext: piiColumn(1, 'data_export')('artifact_ciphertext'),

    // Plaintext ZIP size in bytes (non-PII, observability). NULLABLE until generated.
    artifactBytes: integer('artifact_bytes'),

    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),

    // ── Story 10.21 — off-portal DPDPA provenance (migration 0103) ────────────────────────────────
    // ⚠ These three DO carry DB-level constraints, UNLIKE `status` / `failed_reason` above. That is
    // deliberate, not an inconsistency: `status` is a DISPLAY value, while `requested_via` gates a
    // PII-DISCLOSURE PATH. An unconstrained column lets a mis-set 'member_portal' DISGUISE an
    // off-portal build in every audit query that filters on it. See migration 0103's header.

    // The originating channel. NOT NULL DEFAULT 'member_portal' — every pre-0103 row genuinely WAS a
    // member self-service export (that was the only way to create one), so the default states a fact.
    // DB CHECK constrains it to the two-value union.
    requestedVia: text('requested_via').notNull().default('member_portal').$type<DataExportRequestedVia>(),

    // The acting ADMIN for an off-portal build; NULL for every member self-service row. Deliberately
    // un-FK'd to `users` — an attribution snapshot must stay readable if the actor row disappears.
    requestedByActorId: uuid('requested_by_actor_id'),

    // The originating helpdesk ticket for an off-portal build; NULL otherwise. FK → helpdesk_tickets
    // ON DELETE SET NULL. ⛔ PROVENANCE ONLY — it records WHICH REQUEST caused the build, never WHAT
    // the build may see. Every fulfilment read keys on `member_id` (AC4); nothing resolves subject
    // scope through this column, and nothing may start.
    helpdeskTicketId: uuid('helpdesk_ticket_id').$type<HelpdeskTicketId>(),
  },
  (t) => [
    // The active-export / status lookup key (a member's exports).
    index('data_exports_member_id_idx').on(t.memberId),
    // Serves the RLS policy predicate scans.
    index('data_exports_pariwar_id_idx').on(t.pariwarId),
  ],
);

export type DataExportRow = typeof dataExports.$inferSelect;
export type DataExportInsert = typeof dataExports.$inferInsert;
