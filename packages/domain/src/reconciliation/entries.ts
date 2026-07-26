// Bank-statement entry persistence + matcher read — Story 9.4 (Task 2; Decision D4).
//
// The domain accessors over `bank_statement_entries`: the idempotent persist the matcher worker calls after
// re-parsing a stored blob, and the per-cycle read the pure `matchPool` engine consumes. The FETCH + parse
// orchestration lives in the apps/jobs matcher worker (it owns the AR-45 storage call + the parser slug);
// this module is transport-free + parser-free — it maps the Story 9.2 `BankStatementEntry` shape to rows
// and reads them back as the pure-matcher `MatcherEntry` projection.
//
// ── Idempotent on the deterministic entry_id (AC4) ────────────────────────────
// `persistStatementEntries` is an `ON CONFLICT (entry_id) DO NOTHING` upsert. A re-parse of the same blob
// reproduces identical `entry_id`s (Story 9.2 `deriveBankStatementEntryId`), so a re-run — a redelivered
// cron/enqueue, an overlapping-statement re-upload — never duplicates a row. The entries are IMMUTABLE
// derivations (no UPDATE path); the durable authority is the encrypted blob + the statement-uploaded event.
//
// ── Minimal Tier-1-adjacent footprint (ADR-0034) ─────────────────────────────
// The map deliberately DROPS the high-cardinality free-text PII the parser also produces (`sender_name`,
// `description`, the verbatim `raw_row`, `running_balance`): those stay only in the encrypted blob,
// re-derivable on demand. Only the matcher-load-bearing + provenance columns persist here (see the table
// header + the matcher-mechanism ADR).

import { and, eq, inArray } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { ClaimId, PariwarId, PoolId } from '../ids/index.js';
import type { BankStatementEntry } from '../bank-statement/schema.js';
import {
  bankStatementEntries,
  type BankStatementEntryInsertRow,
} from '../schema/bank_statement_entries.js';
import type { MatcherEntry } from './matcher.js';

/** The provenance context a batch of parsed entries is persisted under (from the statement-uploaded event). */
export interface StatementEntryProvenance {
  readonly pariwarId: PariwarId;
  /** The DENORMALIZED provenance pool — the pool the statement was uploaded against (the wrong-pool spine). */
  readonly poolId: PoolId;
  /** The reconciliation.statement-uploaded events_log event id this batch was parsed from (audit). */
  readonly statementEventId: string;
  /** The originating claim (from the statement-uploaded event) — a stable scope link for triage. */
  readonly claimCaseId: ClaimId;
}

/**
 * Map Story-9.2 `BankStatementEntry` rows to `bank_statement_entries` insert rows under a statement's
 * provenance (PURE — no DB). Drops the free-text PII (`sender_name`/`description`/`raw_row`/`running_balance`)
 * to the minimal matcher-read footprint (ADR-0034). Deterministic: identical inputs → identical rows.
 */
export function mapParsedEntriesToRows(
  provenance: StatementEntryProvenance,
  entries: readonly BankStatementEntry[],
): BankStatementEntryInsertRow[] {
  return entries.map((e) => ({
    entryId: e.entry_id as BankStatementEntryInsertRow['entryId'],
    pariwarId: provenance.pariwarId,
    poolId: provenance.poolId,
    statementEventId: provenance.statementEventId,
    claimCaseId: provenance.claimCaseId,
    bankCode: e.bank_code,
    transactionIdUtr: e.transaction_id_utr,
    senderVpa: e.sender_vpa,
    amount: e.amount,
    transactionDate: e.transaction_date,
    entryType: e.entry_type,
    sourceAccount: e.source_account,
    parserVersion: e.parser_version,
  }));
}

/**
 * Idempotently persist a batch of normalized entries (AC4/D4) — `ON CONFLICT (entry_id) DO NOTHING`, so a
 * re-parse of the same blob is a no-op re-insert (never a duplicate). MUST run inside the caller's already-
 * open pariwar-scoped transaction (the scope-tx contract). Returns the number of rows the insert reported.
 * An empty batch is a no-op.
 */
export async function persistStatementEntries(
  db: Db,
  rows: readonly BankStatementEntryInsertRow[],
): Promise<number> {
  if (rows.length === 0) return 0;
  const inserted = await db
    .insert(bankStatementEntries)
    .values([...rows])
    .onConflictDoNothing({ target: bankStatementEntries.entryId })
    .returning({ entryId: bankStatementEntries.entryId });
  return inserted.length;
}

/**
 * Load the persisted entries for a set of pools (the matcher's per-cycle candidate set), projected to the
 * pure-matcher `MatcherEntry` shape. The worker passes the WHOLE cycle's pool ids so wrong-pool detection
 * sees cross-pool deposits (AC6). Ordered by `entry_id` for a stable, replay-deterministic set (the matcher
 * re-sorts regardless, but a deterministic read keeps logs/debugging sane). Tenant-scoped (RLS + the explicit
 * `pariwar_id` predicate). No user-controlled `.limit()` (bounded by the cycle's uploaded statements).
 */
export async function listEntriesForPools(
  db: Db,
  { pariwarId, poolIds }: { readonly pariwarId: PariwarId; readonly poolIds: readonly PoolId[] },
): Promise<MatcherEntry[]> {
  if (poolIds.length === 0) return [];
  const rows = await db
    .select({
      entryId: bankStatementEntries.entryId,
      poolId: bankStatementEntries.poolId,
      transactionIdUtr: bankStatementEntries.transactionIdUtr,
      amount: bankStatementEntries.amount,
      transactionDate: bankStatementEntries.transactionDate,
      senderVpa: bankStatementEntries.senderVpa,
      entryType: bankStatementEntries.entryType,
    })
    .from(bankStatementEntries)
    .where(
      and(
        eq(bankStatementEntries.pariwarId, pariwarId),
        inArray(bankStatementEntries.poolId, [...poolIds]),
      ),
    )
    .orderBy(bankStatementEntries.entryId);
  return rows.map((r) => ({
    entryId: r.entryId,
    poolId: r.poolId,
    transactionIdUtr: r.transactionIdUtr,
    amount: r.amount,
    transactionDate: r.transactionDate,
    senderVpa: r.senderVpa,
    entryType: r.entryType,
  }));
}
