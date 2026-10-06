// The GROUND-INSPECTION APPROVAL CONJUNCT — Story 6.26a (GI1 / GI2; `2026-10-06-282`, amended by `-283` A2 / A7).
//
// `2026-09-28-263` FQ9 A (Trustee-ratified): *"EVERY CLAIM'S GROUND INSPECTION MUST BE COMPLETE BEFORE THE CLAIM IS
// APPROVED … A refusal never waits for it. If the visit cannot happen … the claim waits and is ⛔ not refused for that
// reason."* `-285` (ratified): that holds the final approval too — the State Trustee's vote and the R9 panel's — where
// the District Admin never approved. `-263` FQ11 A / `-264` FQ13 / `-281` Q2 A: an inspector must have held the
// ORIGINAL of the certificate the claim NOW relies on.
//
// ⭐ ONE predicate (`groundInspectionApprovalState` — pure), over ONE read (`readGroundInspectionApprovalFacts` — one
// statement), used by the gate (`assertGroundInspectionCompleteForApproval`, called ONCE by the outer
// `assertClaimApprovable` — so all six approval call sites and the `-251` waived approve inherit it without an edit)
// AND by the verifier console's "why it waits" section. ⛔ No second copy of "is the inspection complete" anywhere.
//
//   complete ⇔ VISITED ∧ ORIGINAL_SEEN
//   · VISITED       ⇔ ≥1 OWN `completed` assignment whose stage is ⛔ not `certificate_check`, OR the claim INHERITS a
//                     `-239`-refused claim's completed FULL inspection (6.20 AC13; `-283` A2's stage filter lives in
//                     the shared inheritance fragment).
//   · ORIGINAL_SEEN ⇔ ≥1 OWN `completed` assignment (any stage) whose `compared_certificate_upload_id` equals the
//                     claim's CURRENT upload — ⭐ null never matches (`-283` A7).
//   Wait reasons, in this order: `no_completed_inspection` (⛔ not VISITED) · `certificate_check_required` (VISITED,
//   ⛔ not ORIGINAL_SEEN — the refile, FQ13; a certificate replaced after the visit, Q2 A; a pre-6.26 completed row
//   with ⛔ no FQ11 record, ⛔ never backfilled).
//   A refused / unavailable / superseded / still-scheduled assignment counts for ⛔ nothing — the claim waits.
//
// ⚠⚠ IMPORT DISCIPLINE: `nominee-name-check.ts` imports THIS module ⇒ it must ⛔ never reach `claim/events.ts`,
// `claim/nominee-name-check.ts` or `claim/nominee-lock.ts`, TRANSITIVELY (6.23a NW1's source scan covers it), and
// ⛔ never `r9-voting-persist.ts` / `ground-inspection-persist.ts` (both reach `nominee-name-check.ts` — the cycle
// `nominee-name-check → gate → … → nominee-name-check` the typecheck cannot see, [[project_type_only_import_cycle_trap]]).

import { sql } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { ClaimId, PariwarId } from '../ids/index.js';
import { currentDeathCertificateUploadIdSql } from './death-certificate-approval.js';
import { GroundInspectionRequiredError } from './errors.js';
import { inheritedGroundInspectionSourceSql } from './nominee-refusal-read.js';

/** Why an approval waits for the ground inspection (`null` when it is complete). */
export type GroundInspectionWaitReason = 'no_completed_inspection' | 'certificate_check_required';

/** One OWN assignment, as the predicate needs it (non-PII). */
export interface GroundInspectionApprovalAssignment {
  readonly groundInspectionId: string;
  readonly status: string;
  readonly inspectionStage: string;
  readonly comparedCertificateUploadId: string | null;
}

/** Everything the predicate reads, from ONE statement. */
export interface GroundInspectionApprovalFacts {
  readonly ownAssignments: readonly GroundInspectionApprovalAssignment[];
  /** The `-239`-refused claim whose completed FULL inspection this claim inherits, or `null`. */
  readonly inheritedSourceClaimId: ClaimId | null;
  /** The claim's CURRENT death-certificate upload (`currentDeathCertificateUploadIdSql`), or `null`. */
  readonly currentUploadId: string | null;
}

export interface GroundInspectionApprovalState {
  readonly complete: boolean;
  readonly waitReason: GroundInspectionWaitReason | null;
}

/** The ONE definition of "complete" (GI2 + `-283` A2 / A7). Pure. */
export function groundInspectionApprovalState(facts: GroundInspectionApprovalFacts): GroundInspectionApprovalState {
  const completed = facts.ownAssignments.filter((a) => a.status === 'completed');
  const visited =
    completed.some((a) => a.inspectionStage !== 'certificate_check') || facts.inheritedSourceClaimId !== null;
  if (!visited) return { complete: false, waitReason: 'no_completed_inspection' };
  const current = facts.currentUploadId?.toLowerCase() ?? null;
  // ⭐ Null never matches (`-283` A7): both sides must be non-null and equal.
  const originalSeen =
    current !== null &&
    completed.some(
      (a) => a.comparedCertificateUploadId !== null && a.comparedCertificateUploadId.toLowerCase() === current,
    );
  if (!originalSeen) return { complete: false, waitReason: 'certificate_check_required' };
  return { complete: true, waitReason: null };
}

/**
 * The predicate's ONE read: the claim's own assignments (status, stage, compared upload — ⛔ no ciphertext), the
 * inherited source (the shared inheritance fragment) and the current upload (the shared current-upload rule), in ONE
 * statement. RLS-scoped, with the explicit `pariwar_id` predicate. Read in the caller's tx — the approval writers
 * call it under their claim-row lock.
 */
export async function readGroundInspectionApprovalFacts(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
): Promise<GroundInspectionApprovalFacts> {
  const p = sql`${pariwarId}::uuid`;
  const c = sql`${claimCaseId}::uuid`;
  const result = await db.execute<{
    current_upload_id: string | null;
    inherited_source_claim_id: string | null;
    assignments: { id: string; status: string; stage: string; compared: string | null }[] | null;
  }>(sql`
    SELECT ${currentDeathCertificateUploadIdSql(p, c)} AS current_upload_id,
           ${inheritedGroundInspectionSourceSql(p, c)} AS inherited_source_claim_id,
           (SELECT json_agg(json_build_object(
                     'id', own_gi.ground_inspection_id,
                     'status', own_gi.status,
                     'stage', own_gi.inspection_stage,
                     'compared', own_gi.compared_certificate_upload_id)
                   ORDER BY own_gi.created_at, own_gi.ground_inspection_id)
              FROM claim_ground_inspections own_gi
             WHERE own_gi.pariwar_id = ${p}
               AND own_gi.claim_case_id = ${c}) AS assignments
  `);
  const row = result.rows?.[0];
  return {
    ownAssignments: (row?.assignments ?? []).map((a) => ({
      groundInspectionId: a.id,
      status: a.status,
      inspectionStage: a.stage,
      comparedCertificateUploadId: a.compared,
    })),
    inheritedSourceClaimId: (row?.inherited_source_claim_id ?? null) as ClaimId | null,
    currentUploadId: row?.current_upload_id ?? null,
  };
}

/**
 * ⭐ THE CONJUNCT (GI1). Called ONCE, by the outer `assertClaimApprovable` — after the name-check helper (or the
 * `-251` waiver) and before `assertLateWarningsCovered` (6.23b EA2 stays LAST). Throws `GroundInspectionRequiredError`
 * → every approval handler answers 409 `<prefix>.ground_inspection_required` `{ reason }`. It writes NOTHING and
 * refuses nothing: a deny, an escalation, a route to R9 and a return for correction ⛔ never call it.
 */
export async function assertGroundInspectionCompleteForApproval(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
): Promise<void> {
  const state = groundInspectionApprovalState(await readGroundInspectionApprovalFacts(db, pariwarId, claimCaseId));
  if (!state.complete) throw new GroundInspectionRequiredError(claimCaseId, state.waitReason!);
}
