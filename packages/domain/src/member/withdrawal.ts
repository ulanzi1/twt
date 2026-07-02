// member_withdrawals accessors — Story 3.10 (Task 2).
//
// The voluntary-withdrawal confirm write (INSERT the single-row-per-member withdrawal record) + a thin
// in-scope read. TENANT-scoped (RLS `withCheck` enforces the caller's `app.pariwar_id` matches
// `pariwarId`); runs its statement DIRECTLY on the passed (scoped) `db`, so a scoped caller is already
// inside the `SET LOCAL app.pariwar_id` transaction (the member_addresses write precedent).
//
// ── Encryption is an APP-LAYER concern (the route does it) ─────────────────────────────────────────
// `insertMemberWithdrawal` takes ALREADY-SERIALIZED Tier-1 envelope ciphertext (`reasonTextCiphertext`)
// — it NEVER encrypts. The route encrypts the OPTIONAL free-text reason under the member's real
// `pariwarId` context (withdrawal-crypto.ts) and passes the ciphertext in. The `reasonCode` (non-PII
// bounded enum) + the two timestamps + the NULLABLE `aadhaarHmac` seam are plain values. NO HTTP, NO
// audit, NO event emission here — the route orchestrates (mirror insertMemberAddress).
//
// ── The rejoin-lock READ is NOT here ──────────────────────────────────────────────────────────────
// The 12-month rejoin check at signup runs PRE-scope on the BYPASSRLS servicePool (no `app.pariwar_id`
// yet) — it is folded into `resolveMembersByMobile` (member-auth.repo.ts, Task 6) as a raw cross-tenant
// LEFT JOIN, NOT served by these tenant-scoped accessors. `getMemberWithdrawal` below is the in-scope
// read used by the confirm response build + integration tests only.

import { and, eq } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { MemberId, PariwarId } from '../ids/index.js';
import { type MemberWithdrawalRow, memberWithdrawals } from '../schema/member_withdrawals.js';

/** One withdrawal record to insert. The reason free-text is passed ALREADY Tier-1-encrypted (or omitted). */
export interface InsertMemberWithdrawalInput {
  memberId: MemberId;
  pariwarId: PariwarId;
  /** Bounded dropdown reason (contracts `WithdrawalReasonCode`); NON-PII. Optional. */
  reasonCode?: string | null;
  /** Tier-1 envelope ciphertext (serialized) of the OPTIONAL free-text reason; NULL when omitted. */
  reasonTextCiphertext?: string | null;
  /** When the withdrawal completed (clock-injected). */
  withdrawnAt: Date;
  /** When the 12-month rejoin lock lifts (= withdrawnAt + 12 months; clock-injected). */
  rejoinPermittedAt: Date;
}

/**
 * Insert the member's withdrawal record (ONE row per member; PK = member_id). Runs in the caller's
 * single scope tx (the `member.withdrawal_completed` event append runs in the same tx, so a later
 * throw rolls the whole withdrawal back). Returns the inserted row. Tenant-scoped.
 *
 * A second withdrawal is structurally impossible: the confirm handler's `assertWithdrawable` guard
 * rejects an already-`withdrawn` member BEFORE reaching this insert (so the PK never collides in
 * practice); the PK is the backstop.
 */
export async function insertMemberWithdrawal(
  db: Db,
  input: InsertMemberWithdrawalInput,
): Promise<MemberWithdrawalRow> {
  const inserted = await db
    .insert(memberWithdrawals)
    .values({
      memberId: input.memberId,
      pariwarId: input.pariwarId,
      reasonCode: input.reasonCode ?? null,
      reasonTextCiphertext: input.reasonTextCiphertext ?? null,
      withdrawnAt: input.withdrawnAt,
      rejoinPermittedAt: input.rejoinPermittedAt,
    })
    .returning();
  const row = inserted[0];
  if (!row) {
    throw new Error('[insertMemberWithdrawal] insert returned no row — check session scope');
  }
  return row;
}

/**
 * Resolve a member's withdrawal record within a Pariwar, or `null` when none exists. Tenant-scoped
 * (RLS + the explicit predicate). Returns the row with its ciphertext AS STORED — the caller maps it
 * to a NON-PII shape (never decrypts / echoes the free-text bytes).
 */
export async function getMemberWithdrawal(
  db: Db,
  pariwarId: PariwarId,
  memberId: MemberId,
): Promise<MemberWithdrawalRow | null> {
  const rows = await db
    .select()
    .from(memberWithdrawals)
    .where(and(eq(memberWithdrawals.pariwarId, pariwarId), eq(memberWithdrawals.memberId, memberId)))
    .limit(1);
  return rows[0] ?? null;
}
