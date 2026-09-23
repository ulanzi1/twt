// The `-239` REFUSAL on suspicion — its two reads (Story 6.20, Task 4; D14; AC4, AC13). Transport-free.
//
// `2026-09-21-239` (Trustee-ratified): a nominee version dated on or after the certificate date is by
// itself enough to raise SUSPICION; the District Admin — ⛔ never the system — may REFUSE the claim,
// NOTIFY the Pariwar Admin with a note and reason, and the refusal is APPEALABLE ONCE. The member's true
// nominee REFILES with a fresh original certificate and INHERITS THE GROUND INSPECTION.
//
// ⭐ THE REFUSAL ITSELF IS THE SHIPPED VERIFIER DENIAL — `adjudicateClaim(outcome: 'denied')` with the
// dedicated reason code `post_death_nominee_change` (migration 0120). ⛔ There is no parallel path: the
// rationale is required, the refuser is (correctly) disqualified from reviewing the appeal of their own
// refusal, and 6.16 makes it appealable once. This module only READS those rows:
//   · `listNomineeRefusals` — the Pariwar Admin's READ SURFACE. A NOTIFICATION, ⛔ not an approval step
//     (`-239` consequence 3). ⛔ No staff-notification primitive exists and ⛔ none is invented here.
//   · `getInheritedGroundInspectionSource` — AC13's DERIVED source (⛔ never stored, ⛔ never client-
//     supplied): the most recent OTHER claim for the same `(pariwar_id, deceased_member_id)` whose LIVE
//     verifier decision is `denied` with the `-239` code. A claim denied for ANY OTHER reason passes ⛔
//     nothing on, and ⛔ nothing but the inspection carries over (a fresh original certificate is
//     required; consents, pings, documents and bank details are ⛔ not inherited — `-239`).
//
// ⚠ T17 — a refile during the refuser's APPEAL converges onto the refused claim (`getConvergenceCandidate`
// excludes only `settled` / `denied`), so the true nominee's intake merges into it. That is TODAY's
// behaviour, ⛔ not changed here: the remedy is the shipped authorized convergence OVERRIDE, and an
// overridden refile still inherits through this read (it is a distinct claim for the same death).

import { sql } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { ClaimId, MemberId, PariwarId } from '../ids/index.js';
import { clampLimit } from '../pagination.js';

/** The dedicated `-239` reason code (⛔ never `other` — the inheritance must RECOGNISE it). */
export const POST_DEATH_NOMINEE_CHANGE_REASON_CODE = 'post_death_nominee_change' as const;

export interface NomineeRefusalRow {
  readonly claimCaseId: ClaimId;
  readonly deceasedMemberId: MemberId;
  readonly claimState: string;
  readonly refusedAt: Date;
  readonly refusedByDisplay: string | null;
  /** Tier-1 rationale AS STORED — the handler decrypts after authorization. */
  readonly rationaleCiphertext: string | null;
}

const REFUSAL_LIST_DEFAULT = 50;
const REFUSAL_LIST_CAP = 200;

/**
 * The Pariwar's `-239` refusals, newest first — every LIVE verifier decision with the dedicated reason
 * code. Tenant-scoped (RLS + the explicit predicate). Bounded (forced pagination).
 */
export async function listNomineeRefusals(
  db: Db,
  pariwarId: PariwarId,
  opts: { limit?: number } = {},
): Promise<NomineeRefusalRow[]> {
  const limit = clampLimit(opts.limit ?? REFUSAL_LIST_DEFAULT, { default: REFUSAL_LIST_DEFAULT, cap: REFUSAL_LIST_CAP });
  const result = await db.execute<{
    claim_case_id: string;
    deceased_member_id: string;
    current_state: string;
    decided_at: Date | string;
    actor_display: string | null;
    rationale_ciphertext: string | null;
  }>(sql`
    SELECT c.claim_case_id, c.deceased_member_id, c.current_state,
           d.decided_at, d.actor_display, d.rationale_ciphertext
      FROM claim_verifier_decisions d
      JOIN claims c
        ON c.pariwar_id = d.pariwar_id
       AND c.claim_case_id = d.claim_case_id
     WHERE d.pariwar_id = ${pariwarId}
       AND d.superseded_at IS NULL
       AND d.outcome = 'denied'
       AND d.reason_code = ${POST_DEATH_NOMINEE_CHANGE_REASON_CODE}
     ORDER BY d.decided_at DESC
     LIMIT ${limit}
  `);
  return (result.rows ?? []).map((r) => ({
    claimCaseId: r.claim_case_id as ClaimId,
    deceasedMemberId: r.deceased_member_id as MemberId,
    claimState: r.current_state,
    refusedAt: r.decided_at instanceof Date ? r.decided_at : new Date(r.decided_at),
    refusedByDisplay: r.actor_display,
    rationaleCiphertext: r.rationale_ciphertext,
  }));
}

/**
 * AC13 — the claim whose COMPLETED ground inspection this claim INHERITS, or `null`. ONE query. Derived:
 * the most recent EARLIER claim for the same deceased, in this Pariwar, whose live verifier decision is a
 * `-239` refusal AND which has at least one COMPLETED inspection. ⛔ Never another reason's denial.
 */
export async function getInheritedGroundInspectionSource(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
): Promise<ClaimId | null> {
  const result = await db.execute<{ claim_case_id: string }>(sql`
    SELECT src.claim_case_id
      FROM claims cur
      JOIN claims src
        ON src.pariwar_id = cur.pariwar_id
       AND src.deceased_member_id = cur.deceased_member_id
       AND src.claim_case_id <> cur.claim_case_id
       AND src.created_at <= cur.created_at
      JOIN claim_verifier_decisions d
        ON d.pariwar_id = src.pariwar_id
       AND d.claim_case_id = src.claim_case_id
       AND d.superseded_at IS NULL
       AND d.outcome = 'denied'
       AND d.reason_code = ${POST_DEATH_NOMINEE_CHANGE_REASON_CODE}
     WHERE cur.pariwar_id = ${pariwarId}
       AND cur.claim_case_id = ${claimCaseId}
       AND EXISTS (
         SELECT 1 FROM claim_ground_inspections gi
          WHERE gi.pariwar_id = src.pariwar_id
            AND gi.claim_case_id = src.claim_case_id
            AND gi.status = 'completed'
       )
     ORDER BY src.created_at DESC
     LIMIT 1
  `);
  const row = result.rows?.[0];
  return row ? (row.claim_case_id as ClaimId) : null;
}
