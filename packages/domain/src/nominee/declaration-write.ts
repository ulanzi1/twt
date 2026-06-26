// member_nominees write accessor — Story 3.4 (Task 2).
//
// The declare write: a member declares 1–2 nominees → LATEST-WINS replace. In ONE tx it
// DELETEs all existing rows for the member then INSERTs the new 1–2 rows (AC5 — a re-
// declaration via Life Events / Story 3.9 replaces the projection; the immutable event
// stream is the timeline, this projection is the current effective row-set, R1). TENANT-
// scoped (RLS `withCheck` enforces the caller's `app.pariwar_id` matches `pariwarId`); runs
// its statements DIRECTLY on the passed (scoped) `db`, so a scoped caller is already inside
// the `SET LOCAL app.pariwar_id` transaction (the member_kyc_profiles write precedent).
//
// ── Encryption is an APP-LAYER concern (the handler does it) ───────────────────────────
// This accessor takes ALREADY-SERIALIZED Tier-1 envelope ciphertext (`*Ciphertext` fields)
// + the Tier-3 plaintext relationship + the SERVER-derived `splitPct` — it NEVER encrypts
// and NEVER derives the split. The route encrypts under the member's real `pariwarId`
// context and computes the split (Task 6), passing both in (the 3.3b identity-write
// precedent). NO HTTP, NO audit, NO event emission here — the route orchestrates.

import { and, eq } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { MemberId, PariwarId } from '../ids/index.js';
import { type MemberNomineeRow, memberNominees } from '../schema/member_nominees.js';

/** One pre-encrypted nominee row to persist (rank/splitPct are server-stamped — R4). */
export interface NomineeRowInput {
  /** 1 = primary, 2 = secondary. */
  rank: number;
  /** Tier-1 envelope ciphertext (serialized) of the nominee name. */
  nameCiphertext: string;
  /** Tier-3 plaintext relationship label (value-constrained in the contracts enum). */
  relationship: string;
  /** Tier-1 envelope ciphertext (serialized) of the nominee mobile. */
  mobileCiphertext: string;
  /** Tier-1 envelope ciphertext (serialized) of the nominee address; null when absent. */
  addressCiphertext?: string | null;
  /** Server-derived split (100 for a sole nominee; 75 rank-1 / 25 rank-2 for two). */
  splitPct: number;
}

export interface ReplaceMemberNomineesInput {
  memberId: MemberId;
  pariwarId: PariwarId;
  /** The 1–2 nominees to declare (the caller validates the count + stamps rank/splitPct). */
  nominees: readonly NomineeRowInput[];
}

/**
 * Replace a member's nominee row-set, latest-wins: DELETE all existing rows for the member,
 * then INSERT the supplied 1–2 rows — in the caller's single scope tx (atomic; a torn view
 * never exists). Returns the inserted rows (rank-ordered). Tenant-scoped.
 */
export async function replaceMemberNominees(
  db: Db,
  input: ReplaceMemberNomineesInput,
): Promise<MemberNomineeRow[]> {
  await db
    .delete(memberNominees)
    .where(
      and(
        eq(memberNominees.pariwarId, input.pariwarId),
        eq(memberNominees.memberId, input.memberId),
      ),
    );

  const values = input.nominees.map((n) => ({
    memberId: input.memberId,
    pariwarId: input.pariwarId,
    rank: n.rank,
    nameCiphertext: n.nameCiphertext,
    relationship: n.relationship,
    mobileCiphertext: n.mobileCiphertext,
    addressCiphertext: n.addressCiphertext ?? null,
    splitPct: n.splitPct,
  }));

  const inserted = await db.insert(memberNominees).values(values).returning();
  if (inserted.length !== values.length) {
    throw new Error('[replaceMemberNominees] insert returned fewer rows than declared — check session scope');
  }
  return inserted;
}
