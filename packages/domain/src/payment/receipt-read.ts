// vyawastha_shulk_receipts read accessors — Story 3.6b (Task 2).
//
// Back the status read + the idempotent re-confirm path. TENANT-scoped: take an explicit `pariwarId`
// for defense-in-depth alongside RLS (the member_medical_disclosures read precedent). Transport-free
// PRIMITIVES: NO HTTP, NO audit — the handler orchestrates.

import { and, desc, eq, lte } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { MemberId, PariwarId } from '../ids/index.js';
import {
  type VyawasthaShulkReceiptRow,
  vyawasthaShulkReceipts,
} from '../schema/vyawastha_shulk_receipts.js';

/**
 * Resolve a receipt by its `tr` within a Pariwar AND for a specific member — the idempotent
 * re-confirm lookup (AC1). Returns null when no matching receipt exists. The `memberId` filter
 * prevents cross-member receipt exposure: without it, member B submitting member A's `tr` would
 * retrieve A's row (same pariwar, RLS passes) and could enter lock-in on A's behalf. `tr` is
 * UNIQUE so this resolves at most one row.
 */
export async function getReceiptByTr(
  db: Db,
  pariwarId: PariwarId,
  memberId: MemberId,
  tr: string,
): Promise<VyawasthaShulkReceiptRow | null> {
  const rows = await db
    .select()
    .from(vyawasthaShulkReceipts)
    .where(
      and(
        eq(vyawasthaShulkReceipts.pariwarId, pariwarId),
        eq(vyawasthaShulkReceipts.memberId, memberId),
        eq(vyawasthaShulkReceipts.tr, tr),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Resolve a member's LATEST receipt within a Pariwar (newest `paid_at` first) — backs the status
 * read's `paid` / `validThrough`. Returns null when the member has never paid. Tenant-scoped.
 */
export async function getLatestReceipt(
  db: Db,
  pariwarId: PariwarId,
  memberId: MemberId,
): Promise<VyawasthaShulkReceiptRow | null> {
  const rows = await db
    .select()
    .from(vyawasthaShulkReceipts)
    .where(
      and(
        eq(vyawasthaShulkReceipts.pariwarId, pariwarId),
        eq(vyawasthaShulkReceipts.memberId, memberId),
      ),
    )
    .orderBy(desc(vyawasthaShulkReceipts.paidAt))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Resolve a member's LATEST receipt within a Pariwar AS-OF `atTimestamp` (newest `paid_at ≤ atTimestamp`
 * first) — the AC5-correct variant for status reads at a historical point in time. Returns null when the
 * member had no receipt at or before `atTimestamp`. Tenant-scoped.
 */
export async function getLatestReceiptAt(
  db: Db,
  pariwarId: PariwarId,
  memberId: MemberId,
  atTimestamp: Date,
): Promise<VyawasthaShulkReceiptRow | null> {
  const rows = await db
    .select()
    .from(vyawasthaShulkReceipts)
    .where(
      and(
        eq(vyawasthaShulkReceipts.pariwarId, pariwarId),
        eq(vyawasthaShulkReceipts.memberId, memberId),
        lte(vyawasthaShulkReceipts.paidAt, atTimestamp),
      ),
    )
    .orderBy(desc(vyawasthaShulkReceipts.paidAt))
    .limit(1);
  return rows[0] ?? null;
}
