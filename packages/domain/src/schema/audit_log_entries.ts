// `audit_log_entries` table — Story 1.10 substrate (Tasks 2-4).
//
// The tamper-evident audit log: every privileged action emits one hash-chained,
// append-only row. SEPARATE from `events_log` (D7-1.3): different retention
// (7-year), a 6-hourly off-site Object-Retention-Lock mirror (AR-9/10, §2.10a),
// and the architectural-freeze immutability property (freeze-table row 5). Audit
// rows are NOT double-written as events_log rows (Task 6.3 / D3-1.3 resolution).
//
// Source of truth: epics.md L1154-1171 (Story 1.10 + AC-1); architecture §1.5
// L839-902 (two-tier audit store, SHA-256 L888, single canonical-JSON L898-902);
// §2.10/§2.10a credential separation; freeze-table row 5 (architecture.md L522).
//
// Naming discipline per architecture L3663-3677 (L3664 names `audit_log_entries`
// explicitly as a table example):
//   - DB columns snake_case (audit_id, prev_audit_hash, recorded_at, …)
//   - TS field names camelCase (auditId, prevAuditHash, recordedAt, …)
//
// ── Chain topology (DD-2) ─────────────────────────────────────────────────────
// ONE monotonic GLOBAL chain (not per-tenant), ordered by the DB-authoritative
// `seq` IDENTITY column (independent of `recorded_at` clock skew). Each row's
// `audit_hash` = SHA-256( prev_hash_feed || canonicalJsonStringify(digestInput) ),
// computed in TypeScript via the single `@twt/domain` canonicalizer (AC-6; NO
// plpgsql hashing). The digest projection + hash computation + the shared
// `verifyChainSegment` verifier live in `../audit/hash-chain.ts`; the
// advisory-lock-serialized writer lives in `../audit/write.ts`.
//
// ── Genesis convention (DD-2, Task 2.4) ───────────────────────────────────────
// The genesis row (the first row in the global chain) stores `prev_audit_hash =
// NULL` — NULL is the natural "no predecessor" marker and is unambiguous against
// any real SHA-256 hex digest. For the HASH INPUT, genesis feeds the well-known
// sentinel `GENESIS_PREV_HASH` (64 hex zeros) so `audit_hash` remains a fully
// deterministic SHA-256 with a defined input. Both the writer and
// `verifyChainSegment` resolve the feed as `prev_audit_hash ?? GENESIS_PREV_HASH`
// — see `../audit/hash-chain.ts` (the single place that constant is defined).
//
// ── Append-only + RLS ─────────────────────────────────────────────────────────
// Append-only is structural — migration 0006 installs BEFORE UPDATE/DELETE/
// TRUNCATE triggers that RAISE (AC-2), mirroring events_log migration 0001.
// Tenant SELECTs are RLS-isolated by `pariwar_id` (migration 0007 / AC-8); the
// hash-chain WRITER runs under the BYPASSRLS service role so it can read the
// true global tail across tenants (DD-3). Partitioning is deferred (DD-4 / W16)
// — the chain is over `seq`, not over partitions, so the writer is
// partition-agnostic and deferral is safe.

import { sql } from 'drizzle-orm';
import {
  bigint,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import type { PariwarId } from '../ids/index.js';

export const auditLogEntries = pgTable(
  'audit_log_entries',
  {
    // Surrogate addressable PK (server-side gen_random_uuid(), events_log
    // precedent). Distinct from `seq`: `audit_id` addresses a row; `seq` orders
    // the chain.
    auditId: uuid('audit_id').defaultRandom().primaryKey(),

    // DB-authoritative monotonic chain order (DD-2). GENERATED ALWAYS AS IDENTITY
    // so no caller can supply or reuse a value — the sequence is the single
    // ordering authority, immune to `recorded_at` clock skew. mode:'number' is
    // safe to 2^53 (events_log.event_version precedent). The chain is ordered by
    // `seq`; `verifyChainSegment` walks rows in `seq` order.
    seq: bigint('seq', { mode: 'number' }).generatedAlwaysAsIdentity().notNull(),

    // Tenant key AND the column RLS scopes SELECT on (AC-8). Branded `PariwarId`
    // at the TS layer (compile-time only; the column is a plain pg uuid).
    // Cross-tenant audit rows (runAsCrossTenant) carry the
    // CROSS_TENANT_SENTINEL_UUID here (Task 7.3).
    pariwarId: uuid('pariwar_id').$type<PariwarId>().notNull(),

    // The actor performing the action. NULL = system / SIE (events_log.actor_id
    // precedent, architecture §1.14). Plain uuid (NOT branded UserId) — audit
    // actors include non-user system actors.
    actorId: uuid('actor_id'),

    // The actor's role at action time (Story 1.8 role keys), for human actors.
    // Nullable: system actors have no role.
    actorRole: text('actor_role'),

    // Dotted resource.action (architecture L3830-3833): `claim.approve`,
    // `member.suspend`, `kms.decrypt`, `auth.login`, … Constrained at the writer
    // boundary by a Zod schema (Task 6.1, closes W6-CR1.6 audit-poisoning).
    action: text('action').notNull(),

    // What the action targeted (a resource id / URI / addressable locator).
    resourceLocator: text('resource_locator').notNull(),

    // SHA-256 hex of the request payload — NEVER the payload itself (PII
    // discipline, §1.5 + the audit-sink header). The payload is hashed by the
    // producer; only the digest is stored.
    requestPayloadHash: text('request_payload_hash').notNull(),

    // The HTTP-equivalent response status of the action (200/403/409/500/…).
    responseStatus: integer('response_status').notNull(),

    // The previous row's `audit_hash` (chain linkage). NULL ONLY for the genesis
    // row — see the genesis convention above. Never NULL for any non-genesis row.
    prevAuditHash: text('prev_audit_hash'),

    // This row's chain hash: SHA-256 hex of
    // (prev_hash_feed || canonicalJsonStringify(auditRowDigestInput(row))).
    // Computed in TS (AC-6). NOT NULL always.
    auditHash: text('audit_hash').notNull(),

    // Database-authoritative time (architecture §1.11 + L3809). Default now() so
    // producers don't pass a clock. Ordering authority is `seq`, not this column.
    recordedAt: timestamp('recorded_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),

    // Correlation id linking an audit row to its originating request/trace
    // (architecture §3.2 observability). Nullable — system actors may have none.
    traceId: text('trace_id'),
  },
  (t) => [
    // `seq` is the chain-order authority — unique by construction (IDENTITY), but
    // the explicit unique index documents the invariant AND serves the writer's
    // tail read (`ORDER BY seq DESC LIMIT 1`).
    uniqueIndex('audit_log_entries_seq_uq').on(t.seq),

    // A duplicate audit_hash is a tamper / bug signal — make it a hard DB error,
    // not a silent collision. (SHA-256 collisions are infeasible; a duplicate
    // means a re-inserted or forged row.)
    uniqueIndex('audit_log_entries_audit_hash_uq').on(t.auditHash),

    // Tenant read paths (AC-8 RLS-scoped): "this tenant's audit lines, recent
    // first" and "this tenant's lines by chain order". pariwar_id leads (the RLS
    // predicate column).
    index('audit_log_entries_pariwar_recorded_at_idx').on(
      t.pariwarId,
      t.recordedAt,
    ),
    index('audit_log_entries_pariwar_seq_idx').on(t.pariwarId, t.seq),

    // seq starts at 1 and monotonically increases (IDENTITY default). Documents
    // the floor the genesis row sits at.
    check('audit_log_entries_seq_positive', sql`${t.seq} >= 1`),
  ],
);

// Inferred row types for the writer / verifier / mirror read paths.
export type AuditLogEntryRow = typeof auditLogEntries.$inferSelect;
export type AuditLogEntryInsertRow = typeof auditLogEntries.$inferInsert;
