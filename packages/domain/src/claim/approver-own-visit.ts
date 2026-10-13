// A HIDDEN ACTOR CANNOT APPROVE — Story 6.27b BD4 (`2026-10-13-327` decision 2, unconditional; P3 of the story's policy
// meaning). Implements `-310` CF2's *"the inspector ⛔ nothing before completing their own record"* on the approval path.
//
// ⭐ ONE predicate, 6.27a's PM25 (c) — "hidden" ⇔ the actor holds a `scheduled` ground-inspection assignment on the claim
// AND has completed ⛔ no FULL visit on it (a `certificate_check` alone does ⛔ not count). ONE SQL fragment
// (`peerSectionHiddenFromActorSql`) used by: the console's hide (`isPeerSectionHiddenFromActor`), the correction queue and
// the four later-approver hosts (which filter a hidden actor's warnings summary — PM25 (c)), and THIS guard.
// ⭐ The guard is an ACTOR precondition, ⛔ a claim precondition: it reads ⛔ no neighbour answer (⛔ a breach of 6.27a
// Invariant 1), is ⛔ never a conjunct of `assertClaimApprovable`, the wait or the coverage, and is called FIRST — before the
// gate and before any warnings read — on every APPROVING act only (⛔ a denial, a refusal, a return, an escalation, an R9
// deny vote, a finalize that computes "denied", an appeal reversal).
// ⚠ A LEAF: drizzle, the `db` type, ids and `errors.ts` ONLY — the approving writers (verifier, trustee, R9, closure,
// late reason) import it, so it must ⛔ never reach any of them (a runtime init cycle typecheck cannot see).

import { type SQL, sql } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { ClaimId, PariwarId } from '../ids/index.js';
import { OwnGroundVisitPendingError } from './errors.js';

/** A list read's slice — one statement per ≤ 500 ids (the bulk readers' bound). */
const SLICE = 500;

/**
 * THE predicate as a boolean SQL expression over `pariwarRef` / `claimRef` (raw SQL with its OWN aliases `ohv_s` /
 * `ohv_c` — ⛔ never a Drizzle correlated subquery, [[project_epic6_drizzle_correlated_subquery_bug]]).
 */
export function peerSectionHiddenFromActorSql(pariwarRef: SQL, claimRef: SQL, actorId: string): SQL {
  return sql`(EXISTS (
             SELECT 1 FROM claim_ground_inspections ohv_s
              WHERE ohv_s.pariwar_id = ${pariwarRef} AND ohv_s.claim_case_id = ${claimRef}
                AND ohv_s.inspector_actor_id = ${actorId} AND ohv_s.status = 'scheduled')
       AND NOT EXISTS (
             SELECT 1 FROM claim_ground_inspections ohv_c
              WHERE ohv_c.pariwar_id = ${pariwarRef} AND ohv_c.claim_case_id = ${claimRef}
                AND ohv_c.inspector_actor_id = ${actorId} AND ohv_c.status = 'completed'
                AND ohv_c.inspection_stage <> 'certificate_check'))`;
}

/** Is the neighbours' section hidden from `actorId` on this claim (their own ground visit pending)? ONE statement. */
export async function isActorOwnVisitPending(db: Db, pariwarId: PariwarId, claimCaseId: ClaimId, actorId: string): Promise<boolean> {
  const { rows } = await db.execute<{ hidden: boolean }>(
    sql`SELECT ${peerSectionHiddenFromActorSql(sql`${pariwarId}::uuid`, sql`${claimCaseId}::uuid`, actorId)} AS hidden`,
  );
  return rows[0]?.hidden === true;
}

/**
 * The claims of `claimCaseIds` (in this Pariwar) whose section is hidden from `actorId` — lower-case ids. ONE statement
 * per ≤ 500 ids (⛔ per claim): the queue's batch and each later-approver host's page.
 */
export async function readOwnVisitPendingClaimIds(
  db: Db,
  pariwarId: PariwarId,
  claimCaseIds: readonly string[],
  actorId: string,
): Promise<Set<string>> {
  const out = new Set<string>();
  const ids = [...new Set(claimCaseIds.map((id) => id.toLowerCase()))];
  for (let i = 0; i < ids.length; i += SLICE) {
    const slice = ids.slice(i, i + SLICE);
    const { rows } = await db.execute<{ claim_case_id: string }>(sql`
      SELECT ohv.claim_case_id
        FROM claims ohv
       WHERE ohv.pariwar_id = ${pariwarId}::uuid
         AND ohv.claim_case_id IN (${sql.join(slice.map((id) => sql`${id}::uuid`), sql`, `)})
         AND ${peerSectionHiddenFromActorSql(sql`ohv.pariwar_id`, sql`ohv.claim_case_id`, actorId)}`);
    for (const r of rows) out.add(r.claim_case_id.toLowerCase());
  }
  return out;
}

/**
 * ⭐ BD4's ONE guard — throw `OwnGroundVisitPendingError` when the approving actor's own ground visit on this claim is
 * pending. UNCONDITIONAL (⛔ "only while a neighbour key is current" — that branch IS the leak). Call it FIRST in each
 * approving writer, on the APPROVE outcome only.
 * @throws OwnGroundVisitPendingError
 */
export async function assertActorMayApprove(db: Db, pariwarId: PariwarId, claimCaseId: ClaimId, actorId: string): Promise<void> {
  if (await isActorOwnVisitPending(db, pariwarId, claimCaseId, actorId)) throw new OwnGroundVisitPendingError(claimCaseId);
}
