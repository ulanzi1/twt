// The DISTRICT ADMIN's CORRECTION QUEUE — Story 6.18 (AC11). Transport-free.
//
// ⭐⭐ WHY THIS READ EXISTS AT ALL, stated plainly because the story shipped once without it.
// `2026-09-20-227` cl.10 makes the Pariwar Admin RETURN a claim to the District Admin with a note,
// and asks the District Admin to *"contact claimant regarding discrepancy and get it corrected"*.
// A returned claim does ⛔ not move state — it sits in `verifier_approved` / `reversed` /
// `state_trustee_freeze` looking exactly like every other claim in those states. Before this read
// there was NO list of returned claims anywhere in the API or the admin app, and no District Admin
// queue of any kind: the only admin claim route is the per-claim verification console. So the
// District Admin could act on a return ONLY if somebody told them the claim id out of band.
// ⇒ the return loop `-227` ratified was, end to end, unusable (code review 2026-09-20, D4).
//
// ⭐ IT IS A READ OF THE SAME DERIVED CONDITION, ⛔ NOT A NEW STORE. "Under correction" is
// `resolveClaimCorrectionState`'s answer (AC5): a live `correction_return` row that has not been
// resubmitted, OR a CURRENT check carrying a `does_not_match`. There is ⛔ no new table, ⛔ no new
// event and ⛔ no new state; a claim enters and leaves this list purely by the facts already
// recorded elsewhere. AC11's "⛔ no new route, ⛔ no new key" is about the RESUBMISSION, which stays
// derived — the District Admin's fresh check IS the resubmission, and nothing here writes anything.
//
// ⛔⛔ TRAP 4 — WHAT THIS READ MAY CARRY. Ranks, timestamps, states, reason codes, staff display
// names and the claim/member ids. ⛔ NO holder name, ⛔ NO nominee name, ⛔ NO filer note — those
// stay behind `claim.view_nominee_name_check` on the per-claim route, decrypted ONE CLAIM AT A TIME.
// The Pariwar Admin's RETURN NOTE is returned as CIPHERTEXT-AS-STORED for the route to decrypt after
// authorization, the `cycle-freeze-read` posture for `verifier_rationale`: it is staff-authored text
// about a claim, ⛔ never a data subject's name.

import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { ClaimId, MemberId, PariwarId } from '../ids/index.js';
import { clampLimit } from '../pagination.js';
import { claims } from '../schema/claims.js';
import { claimStateTrusteeDecisions } from '../schema/claim_state_trustee_decisions.js';
import { memberPostings } from '../schema/member_postings.js';
import { readNomineeNameCheckFlagsBulk } from './nominee-name-check-read.js';

/**
 * The states a claim can be UNDER CORRECTION in — the union of the states a return may be written
 * from (`TRUSTEE_RETURNABLE_STATES`) and the states a check may be recorded in
 * (`NOMINEE_NAME_CHECK_RECORDABLE_STATES`).
 *
 * ⚠ It is a QUERY NARROWING, ⛔ not a guard: the authority on whether a given claim is under
 * correction remains `resolveClaimCorrectionState`. This only keeps the scan off the claims that
 * could not possibly qualify — ⛔ never including a terminal claim, so a denied or settled claim can
 * never appear on a District Admin's to-do list.
 */
const CORRECTABLE_SCAN_STATES = [
  'verification_in_progress',
  'verifier_review',
  'verifier_approved',
  'reversed',
  'state_trustee_freeze',
] as const;

/** Page cap — the same bounded posture as every other admin list read. */
const CORRECTION_QUEUE_DEFAULT_LIMIT = 50;
const CORRECTION_QUEUE_MAX_LIMIT = 200;

/** ONE claim awaiting correction, as the District Admin's list needs it. ⛔ Carries no name. */
export interface ClaimUnderCorrectionRow {
  readonly claimCaseId: string;
  readonly deceasedMemberId: string;
  readonly currentState: string;
  /** The deceased member's latest posting district — the authorization scope for this row. */
  readonly district: string | null;
  readonly claimFiledAt: Date;
  /** Present iff the PARIWAR ADMIN returned it (`-227` cl.10); absent for a District Admin `does_not_match`. */
  readonly returnedAt: Date | null;
  readonly returnedByActorDisplay: string | null;
  /** ⛔ Ciphertext AS STORED — this accessor never decrypts (the route does, after authorization). */
  readonly returnNoteCiphertext: string | null;
  /** True when the District Admin's OWN latest check carries a `does_not_match` and is still current. */
  readonly sentBackByCheck: boolean;
  /** `-226` cl.7 — a claim can also be waiting simply for its two accounts. */
  readonly accountsComplete: boolean;
}

export interface ListClaimsUnderCorrectionOptions {
  readonly limit?: number;
}

/**
 * Every claim in this Pariwar that is currently UNDER CORRECTION, newest return first.
 *
 * ⛔ NO N+1: four bounded queries for the whole page — the candidate claims (with their districts
 * resolved by ONE set-based correlated subquery, the `listPublicDirectoryMembers` shape), the live
 * return rows, and `readNomineeNameCheckFlagsBulk`'s own three.
 *
 * ⚠ THE CALLER MUST STILL FILTER BY SCOPE. This returns the whole Pariwar's correction queue with a
 * `district` on every row; it is the ROUTE that drops the rows outside the caller's geo grant, using
 * the same `scopeContains` the per-claim gate uses. Doing the filtering here would mean passing
 * grants into the domain, which no other read in this layer does.
 */
export async function listClaimsUnderCorrection(
  db: Db,
  pariwarId: PariwarId,
  opts: ListClaimsUnderCorrectionOptions = {},
): Promise<ClaimUnderCorrectionRow[]> {
  const candidates = await db
    .select({
      claimCaseId: claims.claimCaseId,
      deceasedMemberId: claims.deceasedMemberId,
      currentState: claims.currentState,
      createdAt: claims.createdAt,
      // ⭐ The set-based district read — ONE correlated subquery for the whole page, ⛔ never a
      // `getMemberPostingLatest` call per row (the N+1 AR-65 exists to prevent).
      district: sql<string | null>`(
        SELECT p.district
          FROM ${memberPostings} p
         WHERE p.member_id = "claims"."deceased_member_id" AND p.pariwar_id = "claims"."pariwar_id"
         ORDER BY p.created_at DESC, p.posting_id DESC
         LIMIT 1
      )`,
    })
    .from(claims)
    .where(
      and(
        eq(claims.pariwarId, pariwarId),
        inArray(claims.currentState, [...CORRECTABLE_SCAN_STATES]),
      ),
    )
    .orderBy(desc(claims.createdAt))
    // ⚠ CLAMPED INLINE, and the `domain-accessor-invariants` gate requires exactly that shape: an
    // unclamped caller-supplied limit drains a connection, and a NEGATIVE one is a Postgres
    // `LIMIT -1` pagination bypass ([[project_domain_limit_clamp_and_savepoint_retry]]).
    .limit(
      clampLimit(opts.limit, {
        default: CORRECTION_QUEUE_DEFAULT_LIMIT,
        cap: CORRECTION_QUEUE_MAX_LIMIT,
      }),
    );

  if (candidates.length === 0) return [];

  const claimCaseIds = candidates.map((c) => c.claimCaseId);
  const returnRows = await db
    .select({
      claimCaseId: claimStateTrusteeDecisions.claimCaseId,
      decidedAt: claimStateTrusteeDecisions.decidedAt,
      actorDisplay: claimStateTrusteeDecisions.actorDisplay,
      rationaleCiphertext: claimStateTrusteeDecisions.rationaleCiphertext,
    })
    .from(claimStateTrusteeDecisions)
    .where(
      and(
        eq(claimStateTrusteeDecisions.pariwarId, pariwarId),
        inArray(claimStateTrusteeDecisions.claimCaseId, claimCaseIds),
        eq(claimStateTrusteeDecisions.phase, 'correction_return'),
        eq(claimStateTrusteeDecisions.outcome, 'returned_for_correction'),
        isNull(claimStateTrusteeDecisions.supersededAt),
      ),
    );
  const returnByClaim = new Map(returnRows.map((r) => [r.claimCaseId, r]));

  const flags = await readNomineeNameCheckFlagsBulk(
    db,
    pariwarId,
    candidates.map((c) => ({
      claimCaseId: c.claimCaseId as ClaimId,
      deceasedMemberId: c.deceasedMemberId as MemberId,
    })),
  );

  const out: ClaimUnderCorrectionRow[] = [];
  for (const c of candidates) {
    const f = flags.get(c.claimCaseId);
    const ret = returnByClaim.get(c.claimCaseId);

    // ⭐ THE SAME TWO HALVES `isClaimUnderCorrection` collapses (AC5), applied per row. A returned
    // claim that has since been corrected AND re-checked is RESUBMITTED and drops off this list —
    // the District Admin's work on it is done, even though the return row itself survives until the
    // Pariwar Admin's next vote supersedes it.
    const resubmitted =
      ret !== undefined &&
      f !== undefined &&
      f.accountsComplete &&
      f.currentAndPassing &&
      f.liveAccounts.every((a) => a.updatedAt.getTime() > ret.decidedAt.getTime());
    const hasLiveUnresubmittedReturn = ret !== undefined && !resubmitted;
    const sentBackByCheck = f?.checkSendsBack ?? false;
    if (!hasLiveUnresubmittedReturn && !sentBackByCheck) continue;

    out.push({
      claimCaseId: c.claimCaseId,
      deceasedMemberId: c.deceasedMemberId,
      currentState: c.currentState,
      district: c.district,
      claimFiledAt: c.createdAt,
      returnedAt: hasLiveUnresubmittedReturn ? (ret?.decidedAt ?? null) : null,
      returnedByActorDisplay: hasLiveUnresubmittedReturn ? (ret?.actorDisplay ?? null) : null,
      returnNoteCiphertext: hasLiveUnresubmittedReturn ? (ret?.rationaleCiphertext ?? null) : null,
      sentBackByCheck,
      accountsComplete: f?.accountsComplete ?? false,
    });
  }

  // Newest return first, then newest claim — a District Admin works the freshest discrepancy first.
  out.sort((a, b) => {
    const at = a.returnedAt?.getTime() ?? a.claimFiledAt.getTime();
    const bt = b.returnedAt?.getTime() ?? b.claimFiledAt.getTime();
    return bt - at;
  });
  return out;
}
