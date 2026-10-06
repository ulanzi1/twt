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
// ⭐ IT IS A READ OF THE SAME DERIVED CONDITION, ⛔ NOT A NEW STORE. A claim is listed for one of THREE reasons. Two are
// "under correction" — `resolveClaimCorrectionState`'s answer (AC5): a live `correction_return` row that has not been
// resubmitted, OR a CURRENT check carrying a `does_not_match`. ⭐ The THIRD (Story 6.23b EA10; `-279` A4) is ⛔ not a
// correction: the District Admin APPROVED and a CURRENT nominee-change warning key has ⛔ no District Admin reason — the
// final approval WAITS for theirs (6.23a's late reason), and without this row nobody would tell them (the failure this
// header describes, again). There is ⛔ no new table, ⛔ no new
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
import { readClaimApprovalWarningsBulk, uncoveredKeys } from './approval-warnings.js';
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
/** Exported (with the cap below) so a caller that must scan the WHOLE bounded space before applying an in-memory
 * predicate the DB query doesn't express (e.g. the escalated-only filter) can re-derive the same page size. */
export const CORRECTION_QUEUE_DEFAULT_LIMIT = 50;
export const CORRECTION_QUEUE_MAX_LIMIT = 200;

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
  /**
   * ⭐ Story 6.23b (EA10) — the District Admin's live approval leaves a CURRENT warning key uncovered by any District
   * Admin row: the final approval waits for their late reason. `false` when the late arm could ⛔ not be read (the
   * caller is told through `onLateWarningsUnavailable`).
   */
  readonly lateWarningAwaitingReason: boolean;
  readonly lateWarningUncoveredCount: number;
}

export interface ListClaimsUnderCorrectionOptions {
  readonly limit?: number;
  /**
   * The CALLER's scope test, applied to each qualifying row BEFORE the page limit counts it.
   * ⭐ Code review 2026-09-23b: the route used to drop out-of-scope rows AFTER the domain had cut the
   * page, so a District Admin whose returned claims sat past row N of the whole Pariwar's list got
   * `items: []`. The domain still takes ⛔ no grants — the route passes a predicate over `district`.
   * Omitted ⇒ every row is visible (the whole Pariwar's queue).
   */
  readonly isVisible?: (row: { readonly district: string | null }) => boolean;
  /**
   * ⭐ Story 6.23b (EA10; RD12, invariant 7) — called when the LATE-WARNING arm could ⛔ not be read for a batch (its
   * bulk read runs under a raw SAVEPOINT): the two correction arms still list, the late arm adds nothing, and the
   * caller says so (the response's `late_warnings_unavailable`) — ⛔ never read as "none waiting".
   */
  readonly onLateWarningsUnavailable?: () => void;
}

/**
 * The candidate claims one batch at a time — newest filed first, keyset-paged on
 * `(created_at, claim_case_id)`.
 *
 * ⭐ THE SQL SUPERSET (code review 2026-09-23b). The scan used to take EVERY claim in the five
 * correctable states and cut it to the page limit before asking whether any of them was under
 * correction — so ordinary claims crowded returned ones off the District Admin's only list. It now
 * takes only claims that CAN be under correction: a live `correction_return` row, OR at least one
 * recorded check carrying a `does_not_match` verdict. That is a SUPERSET of the real condition (the
 * check may be stale, or not the latest, and the return may be resubmitted) — the exact answer is
 * still computed per row below, from the same bulk read every other surface uses.
 * ⚠ Raw SQL with explicit `"claims".` qualifiers, ⛔ not a Drizzle column inside the subqueries: an
 * outer Column in a same-named subquery renders unqualified and becomes a tautology
 * ([[project_epic6_drizzle_correlated_subquery_bug]]).
 */
async function candidateBatch(
  db: Db,
  pariwarId: PariwarId,
  limit: number | undefined,
  after: { readonly createdAtExact: string; readonly claimCaseId: string } | null,
) {
  return (
    db
      .select({
        claimCaseId: claims.claimCaseId,
        deceasedMemberId: claims.deceasedMemberId,
        currentState: claims.currentState,
        createdAt: claims.createdAt,
        // ⚠ THE KEYSET CURSOR IS THE EXACT DATABASE VALUE, ⛔ not the JS `Date`: `created_at` is a
        // microsecond `timestamptz` and a `Date` keeps milliseconds, so a `Date` cursor would skip
        // every row filed between the truncated instant and the real one.
        createdAtExact: sql<string>`"claims"."created_at"::text`,
        // ⭐ The set-based district read — ONE correlated subquery for the whole batch, ⛔ never a
        // `getMemberPostingLatest` call per row (the N+1 AR-65 exists to prevent).
        district: sql<string | null>`(
        SELECT p.district
          FROM ${memberPostings} p
         WHERE p.member_id = "claims"."deceased_member_id" AND p.pariwar_id = "claims"."pariwar_id"
         ORDER BY p.created_at DESC, p.posting_id DESC
         LIMIT 1
      )`,
        // Code review 2026-10-06 (decision-needed #1) — the SAME EXISTS the WHERE clause's third arm tests below,
        // exposed as a column: `qualifyingRows` needs to know a candidate matched the (cheap, always-reliable)
        // late-warning arm even when the separate, fallible `readLateWarningArm` enrichment read fails — otherwise a
        // late-warning-only candidate silently drops out of the page on a fault, which is exactly what EA10's
        // "⛔ never none waiting" invariant forbids.
        lateWarningCandidate: sql<boolean>`EXISTS (
          SELECT 1 FROM claim_verifier_decisions v
            JOIN nominee_determinations nd
              ON nd.pariwar_id = v.pariwar_id
             AND nd.claim_case_id = v.claim_case_id
             AND nd.superseded_at IS NULL
             AND nd.decided_at > v.decided_at
           WHERE v.pariwar_id = "claims"."pariwar_id"
             AND v.claim_case_id = "claims"."claim_case_id"
             AND v.outcome = 'approved'
             AND v.superseded_at IS NULL
        )`,
      })
      .from(claims)
      .where(
        and(
          eq(claims.pariwarId, pariwarId),
          inArray(claims.currentState, [...CORRECTABLE_SCAN_STATES]),
          sql`(
          EXISTS (
            SELECT 1 FROM ${claimStateTrusteeDecisions} d
             WHERE d.pariwar_id = "claims"."pariwar_id"
               AND d.claim_case_id = "claims"."claim_case_id"
               AND d.phase = 'correction_return'
               AND d.outcome = 'returned_for_correction'
               AND d.superseded_at IS NULL
          )
          OR EXISTS (
            SELECT 1 FROM events_log e
             WHERE e.pariwar_id = "claims"."pariwar_id"
               AND e.stream_id = "claims"."claim_case_id"
               AND e.event_type = 'claim.nominee_name_checked'
               AND e.payload -> 'accounts' @> '[{"verdict":"does_not_match"}]'::jsonb
          )
          OR EXISTS (
            -- ⭐ Story 6.23b (EA10) — the TIGHT late-warning arm: a live APPROVED verifier decision AND a live
            -- determination decided AFTER it. TODAY a late key can arise ONLY that way (6.23a fact 3) — ⛔ never "every
            -- approved claim" (the crowding the 2026-09-23b review removed). The exact answer is computed per row below.
            SELECT 1 FROM claim_verifier_decisions v
              JOIN nominee_determinations nd
                ON nd.pariwar_id = v.pariwar_id
               AND nd.claim_case_id = v.claim_case_id
               AND nd.superseded_at IS NULL
               AND nd.decided_at > v.decided_at
             WHERE v.pariwar_id = "claims"."pariwar_id"
               AND v.claim_case_id = "claims"."claim_case_id"
               AND v.outcome = 'approved'
               AND v.superseded_at IS NULL
          )
        )`,
          after === null
            ? undefined
            : sql`("claims"."created_at", "claims"."claim_case_id") < (${after.createdAtExact}::timestamptz, ${after.claimCaseId}::uuid)`,
        ),
      )
      .orderBy(desc(claims.createdAt), desc(claims.claimCaseId))
      // ⚠ CLAMPED INLINE, and the `domain-accessor-invariants` gate requires exactly that shape: an
      // unclamped caller-supplied limit drains a connection, and a NEGATIVE one is a Postgres
      // `LIMIT -1` pagination bypass ([[project_domain_limit_clamp_and_savepoint_retry]]).
      .limit(
        clampLimit(limit, {
          default: CORRECTION_QUEUE_DEFAULT_LIMIT,
          cap: CORRECTION_QUEUE_MAX_LIMIT,
        }),
      )
  );
}

/**
 * Every claim in this Pariwar that is currently UNDER CORRECTION and VISIBLE to the caller, newest
 * return first — at most `limit` of them.
 *
 * ⛔ NO N+1: per batch, the candidate claims (districts resolved by ONE set-based correlated
 * subquery), the live return rows, and `readNomineeNameCheckFlagsBulk`'s own three queries.
 *
 * ⭐ THE LIMIT COUNTS QUALIFYING, VISIBLE ROWS (code review 2026-09-23b). The candidates are read in
 * batches of `limit`, newest filed first; each batch is filtered to the claims really under
 * correction AND inside the caller's scope (`opts.isVisible`), and reading stops once `limit` rows
 * are collected or the superset is exhausted. So a qualifying claim is never lost to rows that do
 * not qualify, or that the caller cannot see. The page is then ordered newest return first.
 * ⚠ When more than `limit` rows qualify, WHICH ones are returned is decided by filing date (the
 * scan order); the response carries no cursor, so the default page is sized for a District
 * Admin's real queue, and the SQL superset keeps the scan off every ordinary claim.
 */
export async function listClaimsUnderCorrection(
  db: Db,
  pariwarId: PariwarId,
  opts: ListClaimsUnderCorrectionOptions = {},
): Promise<ClaimUnderCorrectionRow[]> {
  const pageSize = clampLimit(opts.limit, {
    default: CORRECTION_QUEUE_DEFAULT_LIMIT,
    cap: CORRECTION_QUEUE_MAX_LIMIT,
  });
  // ⚠ THE SCAN BATCH IS AT LEAST THE DEFAULT PAGE, ⛔ not the caller's page (code review 2026-09-23c).
  // It was the caller's clamped `limit`, so `?limit=1` with mostly-invisible rows walked the whole
  // superset ONE row per batch — about five queries per row, inside the request transaction.
  const scanBatch = Math.max(pageSize, CORRECTION_QUEUE_DEFAULT_LIMIT);
  const out: ClaimUnderCorrectionRow[] = [];
  let after: { createdAtExact: string; claimCaseId: string } | null = null;

  for (;;) {
    const candidates = await candidateBatch(db, pariwarId, scanBatch, after);
    if (candidates.length === 0) break;
    const last = candidates[candidates.length - 1]!;
    after = { createdAtExact: last.createdAtExact, claimCaseId: last.claimCaseId };

    const visibleCandidates = opts.isVisible
      ? candidates.filter((c) => opts.isVisible!({ district: c.district }))
      : candidates;
    if (visibleCandidates.length > 0) {
      out.push(...(await qualifyingRows(db, pariwarId, visibleCandidates, opts.onLateWarningsUnavailable)));
    }
    if (out.length >= pageSize || candidates.length < scanBatch) break;
  }

  // Newest return first, then newest claim — a District Admin works the freshest discrepancy first.
  const page = out.slice(0, pageSize);
  page.sort((a, b) => {
    const at = a.returnedAt?.getTime() ?? a.claimFiledAt.getTime();
    const bt = b.returnedAt?.getTime() ?? b.claimFiledAt.getTime();
    return bt - at;
  });
  return page;
}

type Candidate = Awaited<ReturnType<typeof candidateBatch>>[number];

/** The candidates of one batch that are REALLY under correction (AC5's two halves), as rows. */
async function qualifyingRows(
  db: Db,
  pariwarId: PariwarId,
  candidates: readonly Candidate[],
  onLateWarningsUnavailable: (() => void) | undefined,
): Promise<ClaimUnderCorrectionRow[]> {
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

  // ⭐ Story 6.23b (EA10) — the late-warning arm, ONE bulk statement for the batch (⛔ no per-claim loop), under a raw
  // SAVEPOINT (the in-package shape of `contribution/write.ts`'s): a SQL error rolls back ONLY this read, the two
  // correction arms still list, and the caller is told. Coverage is the District Admin's own — ⛔ no actor exclusion:
  // the queue asks whether ANY District Admin answer exists.
  const lateWarnings = await readLateWarningArm(db, pariwarId, claimCaseIds);
  if (lateWarnings === null) onLateWarningsUnavailable?.();

  const out: ClaimUnderCorrectionRow[] = [];
  for (const c of candidates) {
    const f = flags.get(c.claimCaseId);
    const ret = returnByClaim.get(c.claimCaseId);

    // ⭐ THE SAME TWO HALVES `isClaimUnderCorrection` collapses (AC5), applied per row. A returned
    // claim that has since been corrected AND re-checked is RESUBMITTED and drops off this list —
    // the District Admin's work on it is done, even though the return row itself survives until the
    // Pariwar Admin's next vote (or next return) supersedes it.
    const resubmitted =
      ret !== undefined &&
      f !== undefined &&
      f.accountsComplete &&
      f.currentAndPassing &&
      f.liveAccounts.every((a) => a.updatedAt.getTime() > ret.decidedAt.getTime());
    const hasLiveUnresubmittedReturn = ret !== undefined && !resubmitted;
    const sentBackByCheck = f?.checkSendsBack ?? false;
    // Code review 2026-10-06 (decision-needed #1): `lateWarnings === null` means the enrichment read FAILED, not
    // "checked, no warning" — `lateWarnings?.get(...)` must not be allowed to produce the same `undefined` as a
    // genuine miss would. On a fault, trust the cheap `lateWarningCandidate` flag (computed independently, in the
    // same statement as every other candidate arm) instead of silently defaulting to "no warning".
    const w = lateWarnings === null ? undefined : lateWarnings.get(c.claimCaseId.toLowerCase());
    const lateWarningUncoveredCount = w === undefined ? 0 : uncoveredKeys(w).length;
    const lateWarningAwaitingReason =
      lateWarningUncoveredCount > 0 || (lateWarnings === null && c.lateWarningCandidate);
    if (!hasLiveUnresubmittedReturn && !sentBackByCheck && !lateWarningAwaitingReason) continue;

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
      lateWarningAwaitingReason,
      lateWarningUncoveredCount,
    });
  }
  return out;
}

/** EA10's late arm under a raw SAVEPOINT — `null` when it could ⛔ not be read (the transaction stays usable). */
async function readLateWarningArm(db: Db, pariwarId: PariwarId, claimCaseIds: readonly string[]) {
  await db.execute(sql`SAVEPOINT late_warning_arm`);
  try {
    const byClaim = await readClaimApprovalWarningsBulk(db, pariwarId, claimCaseIds as readonly ClaimId[]);
    await db.execute(sql`RELEASE SAVEPOINT late_warning_arm`);
    return byClaim;
  } catch (err) {
    // Code review 2026-10-06: this `catch` is the ONLY signal a real bug (vs. a genuine, expected unavailability)
    // ever gets — the caller only sees `onLateWarningsUnavailable`'s zero-argument callback. Log before swallowing.
    console.warn(`[correction-queue-read] readLateWarningArm failed for pariwar ${pariwarId}:`, err);
    await db.execute(sql`ROLLBACK TO SAVEPOINT late_warning_arm`);
    return null;
  }
}
