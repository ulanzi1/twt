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
//   · `listNomineeRefusals` — the Pariwar Admin's READ SURFACE: the console list that PRESENTS the note and
//     reason; the NOTICE is Story 6.25's email (`-261` D2 B, `-262` FQ3 A) — a notification, ⛔ not an
//     approval step (`-239` consequence 3).
//   · `getInheritedGroundInspectionSource` — AC13's DERIVED source (⛔ never stored, ⛔ never client-
//     supplied): the most recent OTHER claim for the same `(pariwar_id, deceased_member_id)` whose LIVE
//     verifier decision is `denied` with the `-239` code. A claim denied for ANY OTHER reason passes ⛔
//     nothing on, and ⛔ nothing but the inspection carries over (a fresh original certificate is
//     required; consents, pings, documents and bank details are ⛔ not inherited — `-239`).
//
// ⭐ T17 — SUPERSEDED by Story 6.24a (`-261` D4 B, `2026-10-07-292` RF2): a refile during the refuser's APPEAL used to
// converge onto the refused claim. Now, while a suspicion refusal STANDS (`claim/suspicion-refusal.ts` — RF1), a new
// filing for that death is ⛔ never merged into it: `getConvergenceCandidate` skips the refused claim, so the refile
// MINTS a distinct claim on every channel and inherits through this read. ⭐ RF8: the inheritance source is a claim on
// which RF1 stands — a refusal REVERSED on appeal is ⛔ no longer a source (its refile is `closed` — RF6).

import { type SQL, sql } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { ClaimId, MemberId, PariwarId } from '../ids/index.js';
import { clampLimit } from '../pagination.js';
import { POST_DEATH_NOMINEE_CHANGE_REASON_CODE, standingSuspicionRefusalSql } from './suspicion-refusal.js';

/** The dedicated `-239` reason code (⛔ never `other` — the inheritance must RECOGNISE it). Story 6.24a moved its
 *  definition to `suspicion-refusal.ts` (this module reads RF1's fragment from there — an import cycle otherwise);
 *  re-exported here unchanged. */
export { POST_DEATH_NOMINEE_CHANGE_REASON_CODE };

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
 * ⭐ THE INHERITANCE RULE, as SQL (Story 6.26a — `-283` A2): a scalar subquery yielding the claim whose COMPLETED
 * ground inspection the claim `(pariwarId, claimCaseId)` INHERITS, or NULL. `getInheritedGroundInspectionSource`
 * reads it through THIS fragment, and so do the approval gate's read (`readGroundInspectionApprovalFacts` — VISITED)
 * and the verifier console's gate section — ⛔ never a second copy. `pariwarId` / `claimCaseId` are SQL (a bound
 * parameter or an outer column reference); the inner aliases are prefixed `inh_` so an enclosing statement's own
 * aliases are never shadowed by surprise.
 *
 * ⚠ `-283` A2: the source's completed assignment must be a FULL one (`inspection_stage <> 'certificate_check'`) — a
 * certificate check is ⛔ never a visit (`-282` GI2), so an office check alone must ⛔ never pass on as one.
 *
 * ⭐ Story 6.24a RF8 (`2026-10-07-292` — discharges, for the APPROVAL input, the deferred item *"`-239` inheritance source:
 * an appeal-overturned refusal is never superseded…"*): the source is a claim on which RF1 STANDS
 * (`standingSuspicionRefusalSql`) — its live decision is the `-239` refusal AND its appeal was ⛔ not allowed AND it is ⛔
 * not `closed`. ⚠ This AMENDS the input of 6.26a GI2's VISITED and the premise of `-290` M1 (*"a source reversed on appeal
 * stays the source"*) — recorded in `-292` as amendments. A standing or `upheld_final` refusal is still a source.
 */
export function inheritedGroundInspectionSourceSql(pariwarId: SQL, claimCaseId: SQL): SQL {
  return sql`(
    SELECT inh_src.claim_case_id
      FROM claims inh_cur
      JOIN claims inh_src
        ON inh_src.pariwar_id = inh_cur.pariwar_id
       AND inh_src.deceased_member_id = inh_cur.deceased_member_id
       AND inh_src.claim_case_id <> inh_cur.claim_case_id
       AND inh_src.created_at <= inh_cur.created_at
     WHERE inh_cur.pariwar_id = ${pariwarId}
       AND inh_cur.claim_case_id = ${claimCaseId}
       AND ${standingSuspicionRefusalSql('inh_src')}
       AND EXISTS (
         SELECT 1 FROM claim_ground_inspections inh_gi
          WHERE inh_gi.pariwar_id = inh_src.pariwar_id
            AND inh_gi.claim_case_id = inh_src.claim_case_id
            AND inh_gi.status = 'completed'
            AND inh_gi.inspection_stage <> 'certificate_check'
       )
     ORDER BY inh_src.created_at DESC, inh_src.claim_case_id DESC
     LIMIT 1
  )`;
}

/**
 * AC13 — the claim whose COMPLETED ground inspection this claim INHERITS, or `null`. ONE query. Derived:
 * the most recent EARLIER claim for the same deceased, in this Pariwar, whose live verifier decision is a
 * `-239` refusal AND which has at least one COMPLETED FULL inspection (Story 6.26a, `-283` A2 — ⛔ a
 * `certificate_check` alone is never a visit). ⛔ Never another reason's denial. The rule itself is
 * `inheritedGroundInspectionSourceSql` (shared with the approval gate and the verifier console).
 * ⭐ A TIE on `created_at` is broken by the claim id (code review 2026-09-24): `LIMIT 1` over a tie used to
 * pick whichever row the database returned first. ⚠ Two claims share a `created_at` only when minted in ONE
 * transaction — a test fixture; in production a refile is a later request, so a later claim can never be
 * the source (`<=` excludes it) and mutual inheritance is not constructible.
 */
export async function getInheritedGroundInspectionSource(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
): Promise<ClaimId | null> {
  const result = await db.execute<{ claim_case_id: string | null }>(sql`
    SELECT ${inheritedGroundInspectionSourceSql(sql`${pariwarId}::uuid`, sql`${claimCaseId}::uuid`)} AS claim_case_id
  `);
  const row = result.rows?.[0];
  return row?.claim_case_id ? (row.claim_case_id as ClaimId) : null;
}
