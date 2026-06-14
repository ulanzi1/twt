// packages/contracts/src/audit/integrity-check.ts
//
// Transport-layer wire shapes for the on-demand audit-integrity verification
// endpoint — Story 1.11a (AC-2b). The endpoint is GLOBAL (not tenant-scoped — the
// audit chain is one global chain): POST /api/v1/audit/verify-integrity. The
// trustee-facing READ surface that consumes these verdicts is Story 1.11b.
//
// Mirrors the packages/domain audit_integrity_checks Drizzle schema (Story 1.11a);
// the contract-↔-domain type-assignability test (tests/type-assignability.test.ts)
// asserts the response shape stays assignable from the inferred Drizzle row.
//
// Per architecture §Naming patterns L3719-3723: contracts is the source for
// transport types; domain derives via z.output/z.input; hand-written shadow types
// are forbidden (consume via `@twt/contracts`, no apps/api re-declaration).

import { z } from 'zod';

import { Iso8601Datetime, UuidString } from '../_common/primitives.js';

/**
 * Trigger an on-demand verification of the whole global audit chain. No
 * parameters — the walk always covers the entire chain; `.strict()` rejects any
 * unexpected key. The client POSTs `{}`. (A future bounded-range variant would
 * add optional fields here.)
 */
export const AuditIntegrityCheckRequest = z.object({}).strict();
export type AuditIntegrityCheckRequest = z.output<typeof AuditIntegrityCheckRequest>;

/**
 * The verdict of one integrity check — the wire shape of an
 * `audit_integrity_checks` row. `*_seq` / `rows_verified` are bigint(mode:number)
 * / integer → number on the wire; `verified_at` is serialized ISO-8601. The
 * boundary + first-broken fields are null when not applicable (empty chain /
 * intact chain). `verifierActor` and `triggerSource` are kept as `string` (not a
 * Zod enum) so the inferred Drizzle row's `text` type stays assignable — matching
 * the AuditLogEntryContract `action` precedent; allowed `triggerSource` values are
 * `cron` | `on_demand` | `post_mirror`.
 */
export const AuditIntegrityCheckResult = z
  .object({
    // Surrogate addressable id of the verdict row (gen_random_uuid()).
    checkId: UuidString,
    // DB-authoritative time the check ran, ISO-8601 at the transport boundary.
    verifiedAt: Iso8601Datetime,
    // The verdict: true iff the whole walked range recomputed + linked correctly.
    chainValid: z.boolean(),
    // The chain head (lowest-seq row) walked; null only for an empty chain.
    startSeq: z.number().int().min(1).nullable(),
    startAuditId: UuidString.nullable(),
    // The last row confirmed valid; null if none verified.
    endSeq: z.number().int().min(1).nullable(),
    endAuditId: UuidString.nullable(),
    // The first row where the chain broke (the AC's first_broken_row_id); null when valid.
    firstBrokenSeq: z.number().int().min(1).nullable(),
    firstBrokenAuditId: UuidString.nullable(),
    // How many rows this run verified (0 for an empty chain).
    rowsVerified: z.number().int().min(0),
    // Who/what triggered: `cron` | `on-demand:<userId>` | `post-mirror`.
    verifierActor: z.string().min(1),
    // Normalized invocation path: `cron` | `on_demand` | `post_mirror`.
    triggerSource: z.string().min(1),
  })
  .strict();
export type AuditIntegrityCheckResult = z.output<typeof AuditIntegrityCheckResult>;

// ── Story 1.11b — acknowledgement (DD-5) ──────────────────────────────────────
//
// The red audit-failure banner persists "until manually acknowledged and an
// investigation ticket is opened" (AC-5). There is no helpdesk/ticketing system
// yet (FR-52, not built), so v1 captures a free-text external ticket reference the
// trustee pastes — recording it IS the "ticket opened" artifact. The ack is stored
// in a SEPARATE append-only table (`audit_integrity_acknowledgements`, migration
// 0011) so `audit_integrity_checks` stays strictly immutable.

/**
 * Acknowledge a (failed) integrity check. `ticketRef` is a non-empty external
 * ticket id/URL — recording it is the v1 "investigation ticket opened" artifact
 * (graduates to the helpdesk module, FR-52, when it lands).
 */
export const AuditIntegrityAcknowledgeRequest = z
  .object({
    ticketRef: z.string().trim().min(1).max(512),
  })
  .strict();
export type AuditIntegrityAcknowledgeRequest = z.output<
  typeof AuditIntegrityAcknowledgeRequest
>;

/**
 * The wire shape of one `audit_integrity_acknowledgements` row — a controlled,
 * append-only record that a specific check was acknowledged by an admin with an
 * external ticket reference. `acknowledgedAt` is serialized ISO-8601.
 */
export const AuditIntegrityAcknowledgement = z
  .object({
    // Surrogate addressable id of the acknowledgement row (gen_random_uuid()).
    acknowledgementId: UuidString,
    // The check this acknowledgement refers to (FK → audit_integrity_checks).
    checkId: UuidString,
    // DB-authoritative time the acknowledgement was recorded, ISO-8601 on the wire.
    acknowledgedAt: Iso8601Datetime,
    // The admin (session userId) who acknowledged.
    acknowledgedBy: UuidString,
    // The external investigation-ticket reference the trustee provided.
    ticketRef: z.string().min(1).max(512),
  })
  .strict();
export type AuditIntegrityAcknowledgement = z.output<
  typeof AuditIntegrityAcknowledgement
>;

// ── Story 1.11b — history / list (DD-3) ───────────────────────────────────────
//
// The trustee UI reads recent verdicts (AC-2: "last automated check" + "history of
// the last 30 checks"). Each list item is a verdict PLUS its most-recent
// acknowledgement (or null) so the client can derive banner persistence in one
// read (DD-5: "latest check has chainValid=false AND no acknowledgement" → banner
// shown). Additive: `AuditIntegrityCheckResult` is unchanged — the list item
// EXTENDS it (the 1.11a verdict contract + its type-assignability test stay green).

/**
 * One row of the integrity-check history: the verdict plus the most-recent
 * acknowledgement (`null` when never acknowledged).
 */
export const AuditIntegrityCheckListItem = AuditIntegrityCheckResult.extend({
  acknowledgement: AuditIntegrityAcknowledgement.nullable(),
}).strict();
export type AuditIntegrityCheckListItem = z.output<
  typeof AuditIntegrityCheckListItem
>;

/** The history response: most-recent-first list of check+acknowledgement items. */
export const AuditIntegrityCheckList = z.array(AuditIntegrityCheckListItem);
export type AuditIntegrityCheckList = z.output<typeof AuditIntegrityCheckList>;
