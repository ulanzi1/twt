// "A death is reported and stands" — the ONE predicate (Story 6.38, N1, DL1; `2026-10-31-425`). Transport-free.
//
// `2026-10-30-423` Q1 (a): *"From the moment a claim is filed for the member's death, an erasure request is refused, for
// good — unless the report is closed as false (Q1 (b))."* Its reading 1 (⛔ ratified): *"a death is reported"* = a claim
// FILED; a claim later withdrawn or refused for another reason still counts (DL5). The release is the ONE "alive" fact the
// code has — a `member_found_innocent` finding (`2026-09-21-238` cl.1; DL4 — a READING, ⛔ ratified; ⛔ producer until row
// `6-22` lands).
//
// ⭐ Every gate that asks "has this member's death been reported?" calls THIS function — the nominee-declaration lock
// (Story 6.20), the erasure lock (`member/rtbf-legality.ts`), the claim door (`tryConverge`), withdrawal and the member's own
// Life Events writes (`-424` Q2 (a) / (b)). ⛔ A second copy of the SQL anywhere (the source fence in
// `apps/api/tests/unit/erasure-and-death-report-fence.test.ts` names the read-only copies it allows).
//
// ⚠⚠ A LEAF: this file imports ONLY `drizzle-orm`, `../db.js` and `../ids/index.js` — ⛔ anything from `claim/`. `member/`
// imports it, and `claim/` already imports `member/`; one `claim/` import here (even a type re-export through `icp.ts`)
// would give `@twt/domain` a runtime init cycle that typecheck cannot see ([[project_type_only_import_cycle_trap]]).

import { sql } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { MemberId, PariwarId } from '../ids/index.js';

/**
 * Does ANY claim exist for the member as the deceased, in ANY state, that ⛔ no `member_found_innocent` finding has
 * released? Tenant-scoped (RLS + the explicit predicate): a claim in another Pariwar is a miss.
 *
 * ⚠ Raw SQL with explicit aliases, ⛔ not a Drizzle correlated subquery: an outer column referenced inside a same-named
 * subquery table collapses to a tautology ([[project_epic6_drizzle_correlated_subquery_bug]]).
 */
export async function isDeathReportStanding(db: Db, pariwarId: PariwarId, memberId: MemberId): Promise<boolean> {
  const rows = await db.execute<{ standing: boolean }>(sql`
    SELECT EXISTS (
      SELECT 1
        FROM claims c
       WHERE c.pariwar_id = ${pariwarId}
         AND c.deceased_member_id = ${memberId}
         AND NOT EXISTS (
           SELECT 1
             FROM claim_nominee_findings f
            WHERE f.pariwar_id = c.pariwar_id
              AND f.claim_case_id = c.claim_case_id
              AND f.kind = 'member_found_innocent'
         )
    ) AS standing
  `);
  return rows.rows?.[0]?.standing === true;
}
