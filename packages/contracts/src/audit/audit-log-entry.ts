// packages/contracts/src/audit/audit-log-entry.ts
//
// Transport-layer wire shape for `audit_log_entries` rows — Story 1.10 (AC-1).
// Mirrors the packages/domain audit_log_entries Drizzle schema (Story 1.10); the
// contract-↔-domain type-assignability test (tests/type-assignability.test.ts)
// asserts the two stay aligned.
//
// The tenant-scoped READ endpoints (`/api/v1/p/<pariwar_id>/audit/...`) + the
// trustee cross-Pariwar surface are Story 1.11b — this file authors the
// component SCHEMA only (registered in scripts/emit-openapi.ts as a reusable
// OpenAPI component, no paths), exactly as Stories 1.7/1.8 did for
// passport/rbac.
//
// ── Standalone — NOT a base-type share with EventLogContract (D13-1.4) ─────────
// AuditLogEntryContract deliberately does NOT import or extend
// `_common/event-log-contract.ts`. The column sets are distinct: `seq`,
// `prevAuditHash`, and `auditHash` (the hash-chain linkage) have no analogue in
// events_log, and audit rows are a SEPARATE store with different retention +
// the off-site mirror (D7-1.3). Sharing a base would couple two independently-
// evolving wire shapes. This standalone shape closes D13-1.4's audit leg.
//
// Per architecture §Naming patterns L3719-3723: contracts is the source for
// transport types; domain derives via z.output/z.input; hand-written shadow
// types are forbidden (consume via `@twt/contracts/audit`, no apps/api re-decl).

import { z } from 'zod';

import { Iso8601Datetime, UuidString } from '../_common/primitives.js';

export const AuditLogEntryContract = z
  .object({
    // Surrogate addressable id (gen_random_uuid()).
    auditId: UuidString,
    // DB-authoritative monotonic chain order (bigint mode:'number' → number wire).
    seq: z.number().int().min(1),
    // Tenant scope; the nil-UUID sentinel for cross-tenant / global audit rows.
    pariwarId: UuidString,
    // Actor uuid, or null for system/SIE actions.
    actorId: UuidString.nullable(),
    // Actor's role at action time (human actors), or null.
    actorRole: z.string().min(1).nullable(),
    // Dotted resource.action.
    action: z.string().min(1),
    // What the action targeted.
    resourceLocator: z.string().min(1),
    // SHA-256 hex of the request payload — never the payload itself.
    requestPayloadHash: z.string().min(1),
    // HTTP-equivalent response status.
    responseStatus: z.number().int(),
    // Previous row's audit_hash; null ONLY for the genesis row.
    prevAuditHash: z.string().min(1).nullable(),
    // This row's chain hash (SHA-256 hex).
    auditHash: z.string().min(1),
    // Database-authoritative time, serialized ISO-8601 at the transport boundary.
    recordedAt: Iso8601Datetime,
    // Correlation/trace id, or null.
    traceId: z.string().min(1).nullable(),
  })
  .strict();

export type AuditLogEntryContract = z.output<typeof AuditLogEntryContract>;
