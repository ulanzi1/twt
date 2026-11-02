// "A death is reported and stands" — the ONE predicate (Story 6.38, N1, DL1; `2026-10-31-425`). Transport-free.
//
// `2026-10-30-423` Q1 (a): *"From the moment a claim is filed for the member's death, an erasure request is refused, for
// good — unless the report is closed as false (Q1 (b))."* Its reading 1 (⛔ ratified): *"a death is reported"* = a claim
// FILED; a claim later withdrawn or refused for another reason still counts (DL5). The release is the ONE "alive" fact the
// code has — a `member_found_innocent` finding (`2026-09-21-238` cl.1; DL4 — a READING, ⛔ ratified). Its producer is Story
// 6.22's District Admin finding (`claim/fraud-investigation-persist.ts`).
//
// ⭐ THE PQ1 SWAP POINT (Story 6.22 DL8, N7; `2026-11-01-438` item 6): a GUILTY finding (`member_found_guilty`) releases ⛔
// claim here — a DECLARED narrowing of `-423` Q1 (b) / `-424` Q2 (a), put to the Panel as Q1. If Q1 is ruled A (lift on
// either finding), the release rule changes in SIX hand-written SQL copies of `f.kind = 'member_found_innocent'` — ⛔ one —
// and the sticky-freeze constant goes with them: (1) the fragment below; (2) `approval-warnings.ts` × 3 (the first-filed
// anchor in the single read, in the bulk read, and in `getClaimWarningAnchor`); (3) `peer-mesh-read.ts` × 2 (`standingReportNamesSql`
// and the filing anchor in `resolvePeerMeshFilingCut`); (4) remove the ONE sticky-freeze constant in `member/overlay.ts`
// (`ACCOUNT_STICKY_FREEZE_EVENT_TYPE`) — the leaf and the sticky freeze flip TOGETHER; (5) the source fence's per-file counts.
// `tests/integration/claim/release-rule-agreement.spec.ts` asks all six the same question and goes red if ONE is changed
// alone: change its single `stands()` line first, then make every copy follow it (code review 2026-11-02, RA2).
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
 * THE predicate, ONCE: a claim `c` naming the member as the deceased, in ANY state, that ⛔ no `member_found_innocent`
 * finding has released. Both reads below use it (Story 6.22 — the ONE copy the source fence counts for this file).
 *
 * ⚠ Raw SQL with explicit aliases, ⛔ not a Drizzle correlated subquery: an outer column referenced inside a same-named
 * subquery table collapses to a tautology ([[project_epic6_drizzle_correlated_subquery_bug]]).
 */
function standingReportWhere(pariwarId: PariwarId, memberId: MemberId) {
  return sql`c.pariwar_id = ${pariwarId}
         AND c.deceased_member_id = ${memberId}
         AND NOT EXISTS (
           SELECT 1
             FROM claim_nominee_findings f
            WHERE f.pariwar_id = c.pariwar_id
              AND f.claim_case_id = c.claim_case_id
              AND f.kind = 'member_found_innocent'
         )`;
}

/**
 * Does ANY claim exist for the member as the deceased, in ANY state, that ⛔ no `member_found_innocent` finding has
 * released? Tenant-scoped (RLS + the explicit predicate): a claim in another Pariwar is a miss.
 */
export async function isDeathReportStanding(db: Db, pariwarId: PariwarId, memberId: MemberId): Promise<boolean> {
  const rows = await db.execute<{ standing: boolean }>(sql`
    SELECT EXISTS (
      SELECT 1
        FROM claims c
       WHERE ${standingReportWhere(pariwarId, memberId)}
    ) AS standing
  `);
  return rows.rows?.[0]?.standing === true;
}

/**
 * The bound on {@link listStandingDeathReports}. A FIXED cap, ⛔ `clampLimit`: this leaf may import ⛔ `pagination.js`
 * (the fence's TR1 — `drizzle-orm`, `../db.js`, `../ids/index.js` only). A member has a handful of claims at most.
 */
export const STANDING_DEATH_REPORTS_LIMIT = 20;

/** One claim that keeps the member's death reported — ids, state and the filing date only (⛔ PII). */
export interface StandingDeathReport {
  readonly claimCaseId: string;
  readonly currentState: string;
  readonly filedAt: Date;
}

/**
 * ⭐ Story 6.22 (DL3) — the claims {@link isDeathReportStanding} counts, listed: the finder sees which OTHER claims still
 * keep the member locked after a finding. The SAME predicate (the fragment above) — ⛔ a second copy of the rule. Oldest
 * first, bounded by {@link STANDING_DEATH_REPORTS_LIMIT}; `excludeClaimCaseId` drops the claim just found.
 */
export async function listStandingDeathReports(
  db: Db,
  pariwarId: PariwarId,
  memberId: MemberId,
  opts: { readonly excludeClaimCaseId?: string } = {},
): Promise<readonly StandingDeathReport[]> {
  const exclude = opts.excludeClaimCaseId === undefined ? sql`` : sql` AND c.claim_case_id <> ${opts.excludeClaimCaseId}`;
  const rows = await db.execute<{ claim_case_id: string; current_state: string; created_at: Date | string }>(sql`
    SELECT c.claim_case_id, c.current_state, c.created_at
      FROM claims c
     WHERE ${standingReportWhere(pariwarId, memberId)}${exclude}
     ORDER BY c.created_at ASC, c.claim_case_id ASC
     LIMIT ${STANDING_DEATH_REPORTS_LIMIT}
  `);
  return (rows.rows ?? []).map((r) => ({
    claimCaseId: r.claim_case_id,
    currentState: r.current_state,
    filedAt: r.created_at instanceof Date ? r.created_at : new Date(r.created_at),
  }));
}
