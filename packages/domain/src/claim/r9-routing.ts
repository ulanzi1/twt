// The R9 QUEUE PREDICATE, once — Story 6.26a (Task 2.1; `2026-10-06-283` A1).
//
// "This claim carries a LIVE (non-superseded) `phase = 'routing'` / `outcome = 'routed_to_r9'` decision row" is the
// R9 queue predicate. It used to exist as THREE private per-claim copies (`r9-voting-persist.ts`,
// `state-trustee-decision-persist.ts`, `correction-closure.ts` — all semantically identical, ⛔ none takes a lock) and
// 6.26a needs it a fourth time: the ground-inspection writers admit `state_trustee_approved` WHILE the claim is
// R9-routed (`-283` A1 — R9 finalize runs the approval gate there, so an inspection must be writable there). ⇒ ONE
// condition, here, exported two ways:
//   · `liveRoutedToR9Exists(claimRef)` — a raw-SQL `EXISTS (…)` against an outer `claims` row, for a statement that
//     needs it inside its own WHERE (Story 6.26b's correction queue — a per-claim call there would be an N+1);
//   · `hasLiveRoutedRow(db, pariwarId, claimCaseId)` — the per-claim read the three writers use.
// ⚠ The bulk inline twins (`cycle-freeze-read.ts`, `r9-voting-read.ts`, `commitCycleFreeze`'s exclusion) select ROWS
// over many claims (or a wider phase/outcome set) and are ⛔ not folded here — recorded in `deferred-work.md`.
//
// ⛔ IMPORT DISCIPLINE: a LEAF — `drizzle-orm`'s `sql`, the `Db` type and id types only (⛔ never `review-window.ts`,
// which `death-certificate-approval.ts` relies on staying import-free, and ⛔ never anything that reaches
// `nominee-name-check.ts`). `ground-inspection-approval.ts` must ⛔ never import a module that imports this one
// through `r9-voting-persist.ts` (that closes `nominee-name-check → gate → r9 → nominee-name-check`).

import { type SQL, sql } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { ClaimId, PariwarId } from '../ids/index.js';

/** The ONE condition, over a (pariwar, claim) pair given as SQL (a column reference or a bound parameter). */
function liveRoutedToR9Condition(pariwarId: SQL, claimCaseId: SQL): SQL {
  return sql`EXISTS (
    SELECT 1 FROM claim_state_trustee_decisions r9_route
     WHERE r9_route.pariwar_id = ${pariwarId}
       AND r9_route.claim_case_id = ${claimCaseId}
       AND r9_route.phase = 'routing'
       AND r9_route.outcome = 'routed_to_r9'
       AND r9_route.superseded_at IS NULL
  )`;
}

/**
 * The R9 queue predicate as a raw-SQL `EXISTS (…)` fragment, correlated to an outer claims row. `claimRef` is the
 * outer table or alias (default `"claims"`); the fragment reads its `pariwar_id` and `claim_case_id` with explicit
 * qualifiers, so it is safe inside a statement that joins other tables carrying the same column names.
 */
export function liveRoutedToR9Exists(claimRef: SQL = sql.raw('"claims"')): SQL {
  return liveRoutedToR9Condition(sql`${claimRef}.pariwar_id`, sql`${claimRef}.claim_case_id`);
}

/** True iff `claimCaseId` carries a LIVE (non-superseded) `routed_to_r9` routing row — the R9 queue predicate.
 *  Read in the caller's tx; ⛔ takes no lock (the callers read it under their own claim-row lock). */
export async function hasLiveRoutedRow(db: Db, pariwarId: PariwarId, claimCaseId: ClaimId): Promise<boolean> {
  const result = await db.execute<{ live: boolean }>(
    sql`SELECT ${liveRoutedToR9Condition(sql`${pariwarId}::uuid`, sql`${claimCaseId}::uuid`)} AS live`,
  );
  return result.rows[0]?.live === true;
}
