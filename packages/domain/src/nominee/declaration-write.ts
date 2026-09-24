// member_nominees write accessor — Story 3.4 (Task 2); re-scoped by Story 6.20 (D1, D16).
//
// The declare write: a member declares 1–2 nominees → LATEST-WINS replace of the CURRENT PROJECTION.
// In ONE tx it DELETEs all existing rows for the member then INSERTs the new 1–2 rows.
// ⭐ Story 6.20: this is ⛔ NO LONGER the whole write. The projection's delete-then-insert used to
// DESTROY the earlier declaration; the history now lives in `member_nominee_versions`
// (`declaration-history.ts`), appended in the SAME transaction by the handler. `member_nominees` is
// always the LATEST version by `version_no` per rank (D16) — ⛔ never the effective (as-at-death) set,
// which is `claim/nominee-effective.ts`'s. ⚠ `epics.md` Story 3.4's *"the latest event is the effective
// declaration"* is CONTRADICTED BY `2026-09-20-235` consequence 1 (annotated there, ⛔ not rewritten). TENANT-
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

export interface ApplyCorrectionToProjectionInput {
  memberId: MemberId;
  pariwarId: PariwarId;
  rank: 1 | 2;
  nameCiphertext: string;
  relationship: string;
  mobileCiphertext: string;
  addressCiphertext: string | null;
}

/**
 * Story 6.20 (D7, D16) — apply an APPROVED correction to ONE rank of the current projection.
 *
 * ⚠ The CALLER decides whether to call this: only when the corrected version was the rank's HEAD before the
 * correction (BigDev 2026-09-24b, option (a)). Then this row IS the corrected declaration, so its
 * `split_pct` is already the corrected version's (D17(b): a correction inherits it) and is ⛔ not touched.
 * When the member declared again after the death, the rank's row holds THAT declaration — overwriting it
 * would mix two declarations in one row — and a rank the member VACATED has ⛔ no row, which is ⛔ never
 * re-inserted (2026-09-24, option (b): re-inserting it produced splits summing to 125%). In both cases the
 * correction lives in the version history and the claim's effective set, and `member_nominees` keeps the
 * member's own last declaration — so the projection can LAG a correction (D16, amended by that ruling).
 *
 * @returns whether a projection row was updated.
 */
export async function applyCorrectionToProjection(
  db: Db,
  input: ApplyCorrectionToProjectionInput,
): Promise<boolean> {
  const updated = await db
    .update(memberNominees)
    .set({
      nameCiphertext: input.nameCiphertext,
      relationship: input.relationship,
      mobileCiphertext: input.mobileCiphertext,
      addressCiphertext: input.addressCiphertext,
    })
    .where(
      and(
        eq(memberNominees.pariwarId, input.pariwarId),
        eq(memberNominees.memberId, input.memberId),
        eq(memberNominees.rank, input.rank),
      ),
    )
    .returning({ rank: memberNominees.rank });
  return updated.length > 0;
}
