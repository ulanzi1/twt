// member_nominees DECLARATION-REF accessor — Story 6.18 (AC2, AC3). Transport-free.
//
// Returns ONLY the `(rank, created_at)` pairs of a member's declared nominees — the two fields the
// nominee-declaration STALENESS TOKEN is built from (`claim/nominee-name-check.ts`).
//
// ⭐ WHY THIS EXISTS BESIDE `getMemberNominees`, WHICH ALREADY RETURNS THESE ROWS. It is a
// MISUSE-RESISTANCE accessor, the `getClaimNomineeBankAccountsCiphertext` naming-guard idea taken
// one step further. The name-check WRITE PATH must record a human's judgement about two names
// without ever being able to reach a name itself — Trap 1 (⛔ the system never compares) and Trap 4
// (⛔ no name, and no hash of a name, in any event, log or audit line). Handing that path the full
// row shape, `name_ciphertext` included, would make "it does not touch a name" a matter of the
// author's discipline that a later edit could quietly undo. Selecting the two harmless columns HERE
// makes it a property of the TYPE: `NomineeDeclarationRowRef` has no name field to reach for.
//
// ⛔ Never widen this projection. If a caller needs a nominee's name, it needs the read path, the
// `claim.view_nominee_name_check` key and an encryption context — not this.

import { and, asc, eq } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { MemberId, PariwarId } from '../ids/index.js';
import { memberNominees } from '../schema/member_nominees.js';

/** A declared nominee reduced to the two fields the declaration token is derived from. */
export interface NomineeDeclarationRowRef {
  readonly rank: number;
  readonly createdAt: Date;
}

/**
 * The `(rank, created_at)` refs of a member's declared nominees, rank-ordered. Returns `[]` when the
 * member declared nobody — a first-class state the District Admin is shown explicitly (AC2), never
 * an error. Tenant-scoped (RLS + the explicit predicate).
 *
 * ⚠ Re-declaration is delete-then-insert (`declaration-write.ts`), so every re-declaration mints new
 * `created_at` values and therefore a new token. That is the mechanism by which a nominee change
 * invalidates a District Admin's recorded check — deliberate, and relied on by AC3/D5.
 */
export async function getMemberNomineeDeclarationRefs(
  db: Db,
  pariwarId: PariwarId,
  memberId: MemberId,
): Promise<NomineeDeclarationRowRef[]> {
  return db
    .select({ rank: memberNominees.rank, createdAt: memberNominees.createdAt })
    .from(memberNominees)
    .where(and(eq(memberNominees.pariwarId, pariwarId), eq(memberNominees.memberId, memberId)))
    .orderBy(asc(memberNominees.rank));
}
