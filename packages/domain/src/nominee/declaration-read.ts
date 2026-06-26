// member_nominees read accessor — Story 3.4 (Task 2).
//
// Backs `GET /member/nominees` (the status read). TENANT-scoped: takes an explicit
// `pariwarId` for defense-in-depth alongside RLS (the member_kyc_profiles read precedent).
// A transport-free PRIMITIVE: NO HTTP, NO audit, NO decryption — the route orchestrates
// those (the accessor returns the rows with ciphertext columns AS STORED; the handler maps
// them to the non-PII summary, decrypting only if a confirmation view ever needs it).

import { and, asc, eq } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { MemberId, PariwarId } from '../ids/index.js';
import { type MemberNomineeRow, memberNominees } from '../schema/member_nominees.js';

/**
 * Resolve a member's current nominee row-set within a Pariwar (rank-ordered: primary first).
 * Returns `[]` when the member has declared no nominees. Tenant-scoped (RLS + the explicit
 * predicate). The "latest" declaration is simply the rows that exist — the write replaces
 * them on every re-declaration (declaration-write.ts), so there is no version filtering here.
 */
export async function getMemberNominees(
  db: Db,
  pariwarId: PariwarId,
  memberId: MemberId,
): Promise<MemberNomineeRow[]> {
  return db
    .select()
    .from(memberNominees)
    .where(and(eq(memberNominees.pariwarId, pariwarId), eq(memberNominees.memberId, memberId)))
    .orderBy(asc(memberNominees.rank));
}
