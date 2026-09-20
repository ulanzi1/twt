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

import { and, asc, eq, inArray } from 'drizzle-orm';

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

/**
 * The same refs for MANY members in ONE query, keyed by member id — the bulk shape a list page
 * needs (code review 2026-09-20: the cycle-freeze pending read has to derive a declaration token per
 * card to tell a CURRENT check from a stale one, and a per-card call would be an N+1 on the
 * Pariwar Admin's main screen).
 *
 * ⚠ A member with no declared nominees is ABSENT from the map, ⛔ not mapped to `[]`. Callers must
 * default to `[]` — which is correct and load-bearing: an empty declaration has its own stable
 * token, and "declared nobody" is a real state a check can have been made about.
 * ⛔ Same projection, same prohibition: two harmless columns, ⛔ never a name.
 */
export async function getMemberNomineeDeclarationRefsBulk(
  db: Db,
  pariwarId: PariwarId,
  memberIds: readonly MemberId[],
): Promise<Map<string, NomineeDeclarationRowRef[]>> {
  const byMember = new Map<string, NomineeDeclarationRowRef[]>();
  if (memberIds.length === 0) return byMember;

  const rows = await db
    .select({
      memberId: memberNominees.memberId,
      rank: memberNominees.rank,
      createdAt: memberNominees.createdAt,
    })
    .from(memberNominees)
    .where(
      and(eq(memberNominees.pariwarId, pariwarId), inArray(memberNominees.memberId, [...memberIds])),
    )
    .orderBy(asc(memberNominees.rank));

  for (const row of rows) {
    const list = byMember.get(row.memberId) ?? [];
    list.push({ rank: row.rank, createdAt: row.createdAt });
    byMember.set(row.memberId, list);
  }
  return byMember;
}
