// `audit_integrity_checks` table — Story 1.11a substrate (Tasks 2-4).
//
// The verdict ledger for the audit-log integrity-verification job: every run of
// `verifyAuditChain` (apps/jobs/src/audit/integrity-check.ts) records ONE row
// here describing the chain range it walked and whether the hash chain held. The
// job WALKS the global chain Story 1.10 built (audit_log_entries); this table
// stores what it FOUND. The trustee-facing UI (Story 1.11b) reads these rows.
//
// Source of truth: epics.md L1173-1193 (Story 1.11a + AC-3); the story file's
// DD-3 (GLOBAL table, append-only, RLS USING(true) carve-out); architecture §1.5
// L865-874 (chain-integrity check as the detection mechanism).
//
// ── GLOBAL, not tenant-scoped (DD-3) ──────────────────────────────────────────
// The audit chain is ONE monotonic GLOBAL chain (audit_log_entries.seq is global,
// not per-tenant — see that schema's header). A verification verdict is therefore
// a statement about the WHOLE chain, with no `pariwar_id` dimension → this is a
// GLOBAL table (same class as the identity/auth carve-out family, Reconciliation
// R2). RLS is still ENABLE+FORCE'd for regime-consistency (Story 1.6 invariant:
// every twt_app table is FORCE-RLS) with a `USING(true)` SELECT carve-out — the
// visible, auditable line that says "nothing to tenant-scope here" (migration
// 0009 / policies/audit-integrity-checks-rls.ts).
//
// ── Append-only (DD-3) ────────────────────────────────────────────────────────
// A verification verdict is itself tamper-evident: you cannot un-record a failed
// check. Migration 0008 installs BEFORE UPDATE/DELETE/TRUNCATE triggers that
// RAISE, exactly like audit_log_entries (migration 0006) / events_log
// (migration 0001). INSERT-only.
//
// ── Naming discipline (architecture L3663-3677) ───────────────────────────────
//   - DB columns snake_case (check_id, chain_valid, first_broken_seq, …)
//   - TS field names camelCase (checkId, chainValid, firstBrokenSeq, …)

import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

export const auditIntegrityChecks = pgTable(
  'audit_integrity_checks',
  {
    // Surrogate addressable PK (server-side gen_random_uuid()).
    checkId: uuid('check_id').defaultRandom().primaryKey(),

    // When the verification ran. DB-authoritative (default now()), consistent with
    // recorded_at on audit_log_entries (architecture §1.11). (AC-3)
    verifiedAt: timestamp('verified_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),

    // The verdict: true iff every row in the walked range recomputed + linked
    // correctly AND the genesis anchor + cross-chunk stitches held. (AC-3/AC-4/AC-5)
    chainValid: boolean('chain_valid').notNull(),

    // ── The chain range walked ────────────────────────────────────────────────
    // `*_seq` are the chain-native ordering values the walk returns; `*_audit_id`
    // are the AC-named addressable ids (resolved from the boundary rows' audit_id),
    // for the 1.11b UI to deep-link. Both NULLABLE: a run against an EMPTY chain
    // (no audit rows yet) has no boundary rows — it records chain_valid=true,
    // rows_verified=0, and NULL boundaries. This is a deliberate refinement of
    // DD-3's "notNull" (which assumed a non-empty post-1.10 chain); recorded in
    // the decision log. For every non-empty run these are populated.
    startSeq: bigint('start_seq', { mode: 'number' }),
    startAuditId: uuid('start_audit_id'),
    endSeq: bigint('end_seq', { mode: 'number' }),
    endAuditId: uuid('end_audit_id'),

    // The FIRST row (by seq order) where the chain broke — content tamper, broken
    // linkage, a cross-chunk-boundary deletion, or a head-truncation fake genesis.
    // NULL when chain_valid=true. `first_broken_seq` is what the verifier returns;
    // `first_broken_audit_id` resolves it to the offending row. (AC-3/AC-5 —
    // the AC's `first_broken_row_id`.)
    firstBrokenSeq: bigint('first_broken_seq', { mode: 'number' }),
    firstBrokenAuditId: uuid('first_broken_audit_id'),

    // How many audit rows this run verified (observability). 0 for an empty chain.
    rowsVerified: integer('rows_verified').notNull(),

    // Who/what triggered the check: `cron` | `on-demand:<userId>` | `post-mirror`.
    // (AC-3 verifier_actor.)
    verifierActor: text('verifier_actor').notNull(),

    // The invocation path, normalized for grouping/observability:
    // `cron` | `on_demand` | `post_mirror` (DD-4's three triggers).
    triggerSource: text('trigger_source').notNull(),
  },
  (t) => [
    // "Recent checks first" — the 1.11b UI's primary read path, and the
    // post-mirror/cron "did the last run pass?" lookup.
    index('audit_integrity_checks_verified_at_idx').on(t.verifiedAt),
    // Surface failed verdicts quickly (partial index — failures are rare).
    index('audit_integrity_checks_failures_idx')
      .on(t.verifiedAt)
      .where(sql`${t.chainValid} = false`),
  ],
);

// Inferred row types for the writer (verifyAuditChain) + the 1.11b read path.
export type AuditIntegrityCheckRow = typeof auditIntegrityChecks.$inferSelect;
export type AuditIntegrityCheckInsertRow = typeof auditIntegrityChecks.$inferInsert;
