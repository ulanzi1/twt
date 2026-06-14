// Audit-log hash-chain primitives — Story 1.10 Task 5 (AC-5, AC-6).
//
// PURE functions (no DB, no I/O). These are the shared verification surface
// Story 1.11a's scheduled integrity-check job consumes (Story 1.10 ships the
// verifiable chain + `verifyChainSegment`; 1.11a builds the job that walks it).
//
// ── The hash construction (DD-2) ──────────────────────────────────────────────
//   audit_hash = SHA-256_hex( prev_hash_feed || canonicalJsonStringify(digest) )
//
// where:
//   - prev_hash_feed = prev_audit_hash ?? GENESIS_PREV_HASH   (the chain LINK)
//   - digest         = auditRowDigestInput(row)               (the row CONTENT)
//   - SHA-256        = architecture §1.5 L888 (Node crypto, no external dep)
//   - canonicalJsonStringify = the SINGLE canonicalizer (AC-6; @twt/domain,
//                      post-DD-1). NO plpgsql hashing.
//
// `prev_audit_hash` participates as the PREFIX (the literal chain link), exactly
// as DD-2's formula states — it is therefore NOT also a key inside `digest`
// (that would double-represent it and invite the "which value — stored NULL vs
// sentinel — goes in the object?" drift bug DD-2 warns about). Writing the
// projection down ONCE here, used by BOTH the writer and the verifier, is the
// whole point.
//
// ── Why `seq` is NOT in the digest (DD-2 exclusion of DB-assigned fields) ──────
// `seq` is `GENERATED ALWAYS AS IDENTITY` — the DB assigns it AT INSERT time and
// the value cannot be predicted before the INSERT (sequence values are consumed
// even by rolled-back transactions, so "tail.seq + 1" is not guaranteed). It is
// therefore a "DB-assigned-after-hash field" that DD-2 explicitly says to exclude
// from the digest. Chain ORDER is enforced cryptographically by the prev→this
// linkage (verifyChainSegment checks `row[i].prevAuditHash === row[i-1].auditHash`)
// and `seq` is the DB-authoritative index used to WALK the rows in order. Any
// `seq` tamper is additionally blocked by the append-only triggers (migration
// 0006) and would break linkage. This reconciles Task 5.1's "include seq" intent
// (seq orders the verified chain) with DD-2's "exclude DB-assigned-after-hash".
//
// ── recordedAt ────────────────────────────────────────────────────────────────
// Projected to its ISO-8601 string (Date is not canonical-JSON-representable).
// The writer supplies `recorded_at` from the DB clock (SELECT now()) so the value
// is known pre-INSERT (hashable) AND database-authoritative (§1.11); the
// millisecond-precision JS Date round-trips byte-stably through timestamptz, so
// the verifier recomputes the identical ISO string.

import { createHash } from 'node:crypto';

import { canonicalJsonStringify } from '../canonical-json.js';
import type { AuditLogEntryRow } from '../schema/audit_log_entries.js';

/**
 * Genesis sentinel: the `prev_hash_feed` used for the FIRST row of the global
 * chain (whose `prev_audit_hash` column is NULL — see audit_log_entries schema
 * header). 64 hex zeros: a fixed, well-known value that is positionally a valid
 * SHA-256-width string but is never the output of `computeAuditHash` for any real
 * row, so genesis is unambiguous. The writer and verifier BOTH resolve the feed
 * as `prev_audit_hash ?? GENESIS_PREV_HASH`.
 */
export const GENESIS_PREV_HASH = '0'.repeat(64);

/**
 * The chained-content fields of an audit row. A structural subset of
 * AuditLogEntryRow (a full row is assignable here), so the writer's pre-insert
 * values and the verifier's DB-read rows feed the SAME projection.
 */
export interface AuditChainContent {
  auditId: string;
  pariwarId: string;
  actorId: string | null;
  actorRole: string | null;
  action: string;
  resourceLocator: string;
  requestPayloadHash: string;
  responseStatus: number;
  recordedAt: Date;
  traceId: string | null;
}

/**
 * The SINGLE canonical projection of an audit row's chained content (DD-2). Keys
 * are camelCase domain field names; canonicalJsonStringify sorts them, so the
 * ORDER here is irrelevant — what matters is the SET of keys and their values.
 * Excludes `audit_hash` (the output), `prev_audit_hash` (folded in as the hash
 * prefix), and `seq` (DB-assigned; see header). `recordedAt` → ISO string.
 */
export function auditRowDigestInput(entry: AuditChainContent): Record<string, unknown> {
  return {
    auditId: entry.auditId,
    pariwarId: entry.pariwarId,
    actorId: entry.actorId,
    actorRole: entry.actorRole,
    action: entry.action,
    resourceLocator: entry.resourceLocator,
    requestPayloadHash: entry.requestPayloadHash,
    responseStatus: entry.responseStatus,
    recordedAt: entry.recordedAt.toISOString(),
    traceId: entry.traceId,
  };
}

/**
 * Compute a row's `audit_hash`. `prevHashOrGenesis` is the resolved feed
 * (caller passes `prev_audit_hash ?? GENESIS_PREV_HASH`). Returns lowercase hex.
 */
export function computeAuditHash(
  prevHashOrGenesis: string,
  entry: AuditChainContent,
): string {
  const digest = canonicalJsonStringify(auditRowDigestInput(entry));
  return createHash('sha256')
    .update(prevHashOrGenesis + digest, 'utf8')
    .digest('hex');
}

/** Result of verifying a contiguous (seq-ordered) chain segment. */
export interface ChainVerificationResult {
  /** True iff every row's recomputed hash matches AND every link is intact. */
  chainValid: boolean;
  /**
   * The `seq` of the FIRST row (in the provided order) where the chain is
   * inconsistent — either its recomputed `audit_hash` mismatches (content tamper)
   * or its `prev_audit_hash` does not link to the preceding row's `audit_hash`
   * (deletion / reorder / insertion). `null` when `chainValid` is true.
   */
  firstBrokenSeq: number | null;
}

/**
 * Verify a contiguous chain SEGMENT, given rows in ascending `seq` order. Works
 * for a segment that does NOT start at genesis (row[0].prevAuditHash is then a
 * real predecessor hash outside the segment — its linkage to a prior row cannot
 * be checked here, only its own hash). The first row's hash is recomputed from
 * its STORED prev_audit_hash; subsequent rows additionally have their linkage to
 * the immediately-preceding row checked.
 *
 * Returns the FIRST break by seq order. Pure — does no I/O; Story 1.11a's job
 * provides the seq-ordered rows (and the global-genesis-anchoring policy).
 */
export function verifyChainSegment(
  rows: readonly AuditLogEntryRow[],
): ChainVerificationResult {
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;

    // (1) Content integrity: recompute this row's hash from its stored prev feed.
    const prevFeed = row.prevAuditHash ?? GENESIS_PREV_HASH;
    if (computeAuditHash(prevFeed, row) !== row.auditHash) {
      return { chainValid: false, firstBrokenSeq: row.seq };
    }

    // (2) Linkage: this row must point at the previous row's hash. (Skipped for
    // the segment's first row — its predecessor may live outside the segment.)
    if (i > 0 && row.prevAuditHash !== rows[i - 1]!.auditHash) {
      return { chainValid: false, firstBrokenSeq: row.seq };
    }
  }
  return { chainValid: true, firstBrokenSeq: null };
}
