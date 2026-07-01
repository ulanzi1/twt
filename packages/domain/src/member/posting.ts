// member_postings accessors — Story 3.9 (Task 3).
//
// The Life Events posting-update write (APPEND a NEW row — append-only history; AC1 "prior value
// preserved") + the latest-posting read (for the panel summary + Epic 4's retirement anchor).
// TENANT-scoped (RLS `withCheck` enforces the caller's `app.pariwar_id`); runs its statement
// DIRECTLY on the passed (scoped) `db`, so a scoped caller is already inside the `SET LOCAL
// app.pariwar_id` transaction (the member_addresses / member_medical_disclosures precedent).
//
// NO encryption here — the district is plaintext non-PII geographic data (Dev Notes §"Posting PII
// tier"). NO HTTP, NO audit, NO event emission — the route orchestrates.

import { desc, and, eq } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { MemberId, PariwarId } from '../ids/index.js';
import { type MemberPostingRow, memberPostings } from '../schema/member_postings.js';

/** One posting row to append. All fields are server-validated non-PII (district plaintext). */
export interface InsertMemberPostingInput {
  memberId: MemberId;
  pariwarId: PariwarId;
  /** The new posting district (plaintext, non-PII geographic). */
  district: string;
  /** Optional forward-compat destination-Pariwar reference (no tenant move in v1-S). */
  pariwarRef?: string | null;
  /** Epic 4 Story 4.5 retirement anchor. Defaults to false at the DB when omitted. */
  isRetirement?: boolean;
}

/**
 * Append ONE new posting row (append-only history — NO delete of prior rows; AC1). Runs in the
 * caller's single scope tx (the event append runs in the same tx, so a later throw rolls the whole
 * update back). Returns the inserted row. Tenant-scoped.
 */
export async function insertMemberPosting(
  db: Db,
  input: InsertMemberPostingInput,
): Promise<MemberPostingRow> {
  const inserted = await db
    .insert(memberPostings)
    .values({
      memberId: input.memberId,
      pariwarId: input.pariwarId,
      district: input.district,
      pariwarRef: input.pariwarRef ?? null,
      isRetirement: input.isRetirement ?? false,
    })
    .returning();
  const row = inserted[0];
  if (!row) {
    throw new Error('[insertMemberPosting] insert returned no row — check session scope');
  }
  return row;
}

/**
 * Returns `true` if the member has EVER recorded a retirement posting (`is_retirement=true`).
 * Epic 4 Story 4.5 computes `retired_at` from the FIRST such row — once set, retirement is a
 * one-way permanent fact regardless of later district changes. Tenant-scoped.
 */
export async function getMemberPostingRetiredEver(
  db: Db,
  pariwarId: PariwarId,
  memberId: MemberId,
): Promise<boolean> {
  const rows = await db
    .select()
    .from(memberPostings)
    .where(
      and(
        eq(memberPostings.pariwarId, pariwarId),
        eq(memberPostings.memberId, memberId),
        eq(memberPostings.isRetirement, true),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

/**
 * Resolve a member's CURRENT (newest) posting row within a Pariwar, or `null` when none exists.
 * The current posting is the newest row by `created_at` (append-only history). Tenant-scoped.
 */
export async function getMemberPostingLatest(
  db: Db,
  pariwarId: PariwarId,
  memberId: MemberId,
): Promise<MemberPostingRow | null> {
  const rows = await db
    .select()
    .from(memberPostings)
    .where(and(eq(memberPostings.pariwarId, pariwarId), eq(memberPostings.memberId, memberId)))
    .orderBy(desc(memberPostings.createdAt))
    .limit(1);
  return rows[0] ?? null;
}
