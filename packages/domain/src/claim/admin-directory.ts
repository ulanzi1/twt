// The ADMIN DIRECTORY accessor — Story 6.19b (Task 6; AC4; the shared spec's D11). Transport-free, read-only.
//
// ⭐ WHO IS REMINDED. The District Admin of a claim is its LIVE SHEPHERD (`getLiveShepherd`), ⛔ never a guess. The
// escalations (`-231` C's letter chase on found-dead + 13; `-258` detail 2's staff run on day 12) go to EVERY Pariwar
// Admin of the claim's Pariwar — each gets their own row and their own daily push. This is the lookup for them:
// `role_grants ⋈ users`, by role and scope, active users with a display name only (the precedent is
// `resolveShepherdCandidates`). ⛔ No contact detail is returned — a staff reminder's channel is the admin queue and
// admin push, never an SMS to a staff phone.

import { and, asc, eq, isNotNull, sql } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { PariwarId } from '../ids/index.js';
import { roleGrants } from '../schema/role_grants.js';
import { users } from '../schema/users.js';

export interface AdminDirectoryEntry {
  readonly userId: string;
  readonly displayName: string;
}

export interface AdminDirectoryResult {
  readonly entries: readonly AdminDirectoryEntry[];
  /** MORE than 50 active holders exist — only the first 50 (by user id) were returned. The caller should alarm; a
   * silent drop from "every Pariwar Admin" is a real miss, not a cosmetic one. */
  readonly truncated: boolean;
}

/**
 * The most holders RETURNED. ⭐ The query fetches ONE MORE (`.limit(51)` — an integer literal, as the domain-invariants
 * `.limit()` gate requires, so it cannot name this constant) and `truncated` is set only when that extra row came back:
 * exactly 50 holders is ⛔ not truncated. `tests/claim/admin-directory-limit.test.ts` pins the behaviour at 50 / 51
 * holders through a fake `Db` (the fetched bound included).
 */
export const ADMIN_DIRECTORY_LIMIT = 50 as const;

/**
 * The active staff holding `role` in this Pariwar, at `scope` when given (e.g. `{ dimension: 'district', value }`;
 * a `null` value = any node of that dimension), else ⭐ at a PARIWAR-WIDE grant only (`scope_dimension = 'pariwar'`)
 * — ⛔ never any-scope: a `pariwar_admin` granted at a single state is ⛔ not "every Pariwar Admin of the claim's
 * Pariwar". Bounded, ordered; `truncated` signals when the bound was hit.
 */
export async function listAdminsByRole(
  db: Db,
  pariwarId: PariwarId,
  role: 'pariwar_admin' | 'district_admin',
  scope?: { readonly dimension: 'pariwar' | 'district'; readonly value: string | null },
): Promise<AdminDirectoryResult> {
  const rows = await db
    .selectDistinct({ userId: users.id, displayName: users.displayName })
    .from(roleGrants)
    .innerJoin(users, eq(users.id, roleGrants.userId))
    .where(
      and(
        eq(roleGrants.pariwarId, pariwarId),
        eq(roleGrants.role, role),
        eq(roleGrants.scopeDimension, scope?.dimension ?? 'pariwar'),
        scope === undefined || scope.value === null ? undefined : eq(roleGrants.scopeValue, scope.value),
        eq(users.status, 'active'),
        isNotNull(users.displayName),
        sql`btrim(${users.displayName}) <> ''`,
      ),
    )
    .orderBy(asc(users.id))
    // ⚠ `ADMIN_DIRECTORY_LIMIT + 1` as an integer literal (the domain-invariants gate) — the extra row only PROVES
    // there are more holders than are returned; it is ⛔ never returned itself.
    .limit(51);
  return {
    entries: rows
      .slice(0, ADMIN_DIRECTORY_LIMIT)
      .map((r) => ({ userId: r.userId as string, displayName: r.displayName! })),
    truncated: rows.length > ADMIN_DIRECTORY_LIMIT,
  };
}
