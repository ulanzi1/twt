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
