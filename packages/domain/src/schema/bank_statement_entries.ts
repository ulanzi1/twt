// `bank_statement_entries` table — Story 9.4 substrate (Task 2; Decision D4).
//
// The persisted, normalized bank-statement rows the UTR matcher reads. Story 9.3 Decision D2 LOCKED the
// split: 9.3 stores the raw blob (Tier-1 object store) + the `reconciliation.statement-uploaded` metadata
// event; Story 9.4 RE-PARSES that blob (byte-identical replay via the Story 9.2 `parseStatement` — the
// deterministic `deriveBankStatementEntryId` reproduces every id) and PERSISTS the entries HERE. Decision
// D4 chose a real table (over derive-on-the-fly) for auditability + a stable set the matcher reads + the
// `entry_id` being the `bank_statement_entry_id` idempotency-key component.
//
// ── Idempotent on the deterministic entry_id (D4) ─────────────────────────────
// `entry_id` is a UUIDv5 of the row's identifying content (Story 9.2 `deriveBankStatementEntryId`), so a
// re-parse of the same blob reproduces identical ids: the persist path is an `ON CONFLICT (entry_id) DO
// NOTHING` upsert — a re-run / overlapping-statement re-upload never duplicates a row (the replay-identity
// spine, AC4). The entries are therefore IMMUTABLE derivations (no UPDATE path); DELETE is granted for
// RTBF / hygiene only.
//
// ── Tier-1-adjacent PII posture (ADR-0034) — minimize the plaintext footprint ─
// The source blob is Tier-1 (encrypted at rest in the private object store). These normalized rows are
// re-derivable from that blob, so this table is a matcher-read CACHE, protected by tenant-isolation RLS
// (ENABLE + FORCE) — the same isolation boundary every domain table rides — and NEVER logged (the matcher
// worker logs ids/counts, never row contents). Deliberately MINIMAL columns: only the fields the matcher +
// its verdicts read (utr / amount / date / provenance pool / bank / entry_type + the D3 sender_vpa seam).
// The high-cardinality free-text PII the parser also produces (`sender_name`, `description`, the verbatim
// `raw_row`) is NOT persisted here — it stays exclusively in the encrypted blob, re-derivable on demand,
// keeping the plaintext footprint small. `transaction_id_utr` is a bank reference number, `amount` a
// number — the matcher-load-bearing, low-sensitivity fields. (See the matcher-mechanism ADR, Story 9.4.)
//
// ── pool_id is the DENORMALIZED provenance (the wrong-pool spine, AC6) ────────
// A `BankStatementEntry` itself carries no pool reference (only a nullable `source_account`), so the ONLY
// way the matcher resolves which pool an entry's statement was filed against is this denormalized `pool_id`,
// copied from the triggering `reconciliation.statement-uploaded` event's `poolId`. It is what
// `classifyContributionDestination` compares against the attestation's assigned pool for wrong-pool
// detection — a wrong-pool deposit is preserved as invalid + routed to review, NEVER silently remapped.
//
// Naming discipline (architecture L3663-3677): DB columns snake_case, TS fields camelCase.

import { bigint, index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import type { BankStatementEntryId, ClaimId, PariwarId, PoolId } from '../ids/index.js';

export const bankStatementEntries = pgTable(
  'bank_statement_entries',
  {
    // The deterministic UUIDv5 entry id (Story 9.2 `deriveBankStatementEntryId`) — NOT DB-defaulted, so a
    // re-parse reproduces it and the upsert is idempotent. The `bank_statement_entry_id` idempotency-key
    // component (Story 9.4 keyed-store claim).
    entryId: uuid('entry_id').primaryKey().$type<BankStatementEntryId>(),

    // Multi-tenant scope (architecture §1.2). RLS predicate column; branded. unFK'd (pools/alerts posture).
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),

    // The DENORMALIZED provenance pool — the pool the entry's statement was uploaded against (copied from
    // the triggering reconciliation.statement-uploaded event's poolId). The wrong-pool detection spine (AC6).
    poolId: uuid('pool_id').notNull().$type<PoolId>(),

    // The reconciliation.statement-uploaded events_log event id this row was parsed from (audit provenance).
    statementEventId: uuid('statement_event_id').notNull(),

    // The originating claim (from the statement-uploaded event) — a stable scope link for audit/triage.
    claimCaseId: uuid('claim_case_id').notNull().$type<ClaimId>(),

    // Which of the 5 v1 banks produced the source statement (BankCode string; the parser authority).
    bankCode: text('bank_code').notNull(),

    // The UTR / bank reference — the matcher's PRIMARY key. NULLABLE (a null-UTR row is never matchable).
    transactionIdUtr: text('transaction_id_utr'),

    // The payer VPA if the narration carried one — the Decision-D3 sender-VPA arm's FUTURE input (unused in
    // v1; the arm ships {available:false}). Nullable.
    senderVpa: text('sender_vpa'),

    // The deposit amount in INTEGER PAISE (Story 9.2). `mode: 'number'` (the alerts.state_event_version
    // precedent) so the matcher's integer arithmetic sees a JS number, not a BigInt.
    amount: bigint('amount', { mode: 'number' }).notNull(),

    // The transaction date (ISO-8601 YYYY-MM-DD, optionally with a time) — the window check reads it.
    transactionDate: text('transaction_date').notNull(),

    // The derived transaction classification (credit/debit/charge/reversal — BankEntryType string).
    entryType: text('entry_type').notNull(),

    // The source account the statement belongs to (nullable — some CSVs carry no account column).
    sourceAccount: text('source_account'),

    // Which parser + version produced this row (e.g. `sbi@1`) — makes a re-parse auditable.
    parserVersion: text('parser_version').notNull(),

    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    // The matcher's per-cycle load: entries by (pariwar, pool). pariwar_id leads (RLS-aware planner hint).
    index('bank_statement_entries_pariwar_pool_idx').on(t.pariwarId, t.poolId),
    // The primary-match probe surface: (pariwar, utr). Partial-friendly (a null-UTR row never matches).
    index('bank_statement_entries_pariwar_utr_idx').on(t.pariwarId, t.transactionIdUtr),
  ],
);

// Inferred row types for the persist/read accessors.
export type BankStatementEntryRow = typeof bankStatementEntries.$inferSelect;
export type BankStatementEntryInsertRow = typeof bankStatementEntries.$inferInsert;
