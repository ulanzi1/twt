// R9 special-case voting read models — Story 6.14 (Task 5; AC1/AC8/AC10). Transport-free, scope-safe.
//
// Three reads the R9 voting surface drives, each tenant-scoped (the caller sets app.pariwar_id via RLS AND
// passes pariwarId explicitly — the indexed predicate + cross-tenant defense-in-depth), `clampLimit` on
// every scan (the domain limit-clamp gate — [[project_domain_limit_clamp_and_savepoint_retry]]):
//   · getR9VotingQueue      — the queue: claims carrying a live routed_to_r9 row with NO finalized session
//     (an OPEN session keeps the claim in the queue, flagged; a finalized session already superseded the
//     routing row, so it is gone). Per case: deceased id + the routing trustee's display + reason code + the
//     session-open flag (AC1).
//   · getR9Panel            — the per-claim panel model: the case + (if a live session exists) the session
//     (clause snapshot + immutable panel roster + quorum + outcome/tally) + the LIVE votes (ciphertext AS
//     STORED — the route decrypts AFTER authorization, with the decrypt-FAILURE-distinct sentinel) (AC1).
//   · getR9VotesByTrustee   — the FULL transcript for one actor within a time window: LIVE **and** superseded
//     votes, each JOINED to its session's clause/panel/outcome identity so no vote is shown decontextualized
//     from the rule + panel it was cast under (AC8).
//
// PII (AC10): the per-vote rationale ciphertext is returned AS STORED; NO accessor decrypts it — the route
// decrypts AFTER authorization. Nothing here logs or filters on rationale.

import { and, asc, desc, eq, isNull, sql } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { ClaimId, PariwarId } from '../ids/index.js';
import { clampLimit } from '../pagination.js';
import { claims } from '../schema/claims.js';
import { type ClaimR9VoteRow, claimR9Votes } from '../schema/claim_r9_votes.js';
import { type ClaimR9VotingSessionRow, claimR9VotingSessions } from '../schema/claim_r9_voting_sessions.js';
import { claimStateTrusteeDecisions } from '../schema/claim_state_trustee_decisions.js';

const R9_QUEUE_SCAN_CAP = 200;
const R9_VOTES_BY_TRUSTEE_CAP = 500;
/** Cap for one session's LIVE vote list (`getR9Panel`) — a DEDICATED constant, not `R9_QUEUE_SCAN_CAP`
 *  (a panel's vote count is bounded by its own roster size, an unrelated scale from the queue). */
const R9_PANEL_VOTES_CAP = 50;

// ── The queue (AC1) ────────────────────────────────────────────────────────────

export interface R9QueueItem {
  claimCaseId: string;
  deceasedMemberId: string;
  /** The routing trustee's R5 display snapshot (from the routed_to_r9 decision row). */
  routingActorDisplay: string;
  /** The routing reason code (non-PII; e.g. r9_special_case). */
  routingReasonCode: string | null;
  /** True when a live (non-superseded, not-yet-finalized) R9 voting session is already open. */
  sessionOpen: boolean;
}

/**
 * The R9 voting queue (AC1): every claim carrying a LIVE routed_to_r9 routing row that has NO finalized
 * session. A claim with an OPEN session stays in the queue (flagged `sessionOpen: true`); a finalized session
 * already superseded the routing row (so the claim is gone), and the finalized-session exclusion below is a
 * belt-and-suspenders guard. Scope-safe; ordered by claim id; clamped.
 */
export async function getR9VotingQueue(
  db: Db,
  pariwarId: PariwarId,
  opts: { limit?: number } = {},
): Promise<R9QueueItem[]> {
  // ONE query (LEFT JOIN), not two separate reads joined in-memory — a finalize/cancel committing between
  // two separate reads could otherwise produce a transiently inconsistent queue view. The partial-unique on
  // claim_r9_voting_sessions (at most one non-superseded session per claim) guarantees no fan-out here.
  const rows = await db
    .select({
      claimCaseId: claimStateTrusteeDecisions.claimCaseId,
      deceasedMemberId: claims.deceasedMemberId,
      routingActorDisplay: claimStateTrusteeDecisions.actorDisplay,
      routingReasonCode: claimStateTrusteeDecisions.reasonCode,
      sessionId: claimR9VotingSessions.sessionId,
      sessionOutcome: claimR9VotingSessions.outcome,
    })
    .from(claimStateTrusteeDecisions)
    .innerJoin(
      claims,
      and(
        eq(claims.claimCaseId, claimStateTrusteeDecisions.claimCaseId),
        eq(claims.pariwarId, claimStateTrusteeDecisions.pariwarId),
      ),
    )
    .leftJoin(
      claimR9VotingSessions,
      and(
        eq(claimR9VotingSessions.claimCaseId, claimStateTrusteeDecisions.claimCaseId),
        eq(claimR9VotingSessions.pariwarId, claimStateTrusteeDecisions.pariwarId),
        isNull(claimR9VotingSessions.supersededAt),
      ),
    )
    .where(
      and(
        eq(claimStateTrusteeDecisions.pariwarId, pariwarId),
        eq(claimStateTrusteeDecisions.phase, 'routing'),
        eq(claimStateTrusteeDecisions.outcome, 'routed_to_r9'),
        isNull(claimStateTrusteeDecisions.supersededAt),
      ),
    )
    .orderBy(asc(claimStateTrusteeDecisions.claimCaseId))
    .limit(clampLimit(opts.limit, { default: R9_QUEUE_SCAN_CAP, cap: R9_QUEUE_SCAN_CAP }));

  const out: R9QueueItem[] = [];
  for (const r of rows) {
    const hasLiveSession = r.sessionId !== null;
    if (hasLiveSession && r.sessionOutcome !== null) continue; // finalized → excluded (defensive)
    out.push({
      claimCaseId: r.claimCaseId,
      deceasedMemberId: r.deceasedMemberId,
      routingActorDisplay: r.routingActorDisplay,
      routingReasonCode: r.routingReasonCode,
      sessionOpen: hasLiveSession,
    });
  }
  return out;
}

// ── The per-claim panel model (AC1) ────────────────────────────────────────────

export interface R9PanelModel {
  claimCaseId: string;
  deceasedMemberId: string;
  currentState: string;
  /** The live (non-superseded) session, or null when none is open (e.g. after a cancel). */
  session: ClaimR9VotingSessionRow | null;
  /** The session's LIVE votes (rationale ciphertext AS STORED — the route decrypts). Empty when no session. */
  votes: ClaimR9VoteRow[];
}

/**
 * The per-claim R9 panel model (AC1). Returns the case + (if a live session exists) the session row + its
 * LIVE votes (cast-time ordered). Returns null when the claim does not exist in scope. Rationale ciphertext
 * is returned AS STORED — the route decrypts AFTER authorization with the decrypt-failure-distinct sentinel.
 */
export async function getR9Panel(db: Db, pariwarId: PariwarId, claimCaseId: ClaimId): Promise<R9PanelModel | null> {
  const claimRow = (
    await db
      .select({
        claimCaseId: claims.claimCaseId,
        deceasedMemberId: claims.deceasedMemberId,
        currentState: claims.currentState,
      })
      .from(claims)
      .where(and(eq(claims.pariwarId, pariwarId), eq(claims.claimCaseId, claimCaseId)))
      .limit(1)
  )[0];
  if (!claimRow) return null;

  const session = (
    await db
      .select()
      .from(claimR9VotingSessions)
      .where(
        and(
          eq(claimR9VotingSessions.pariwarId, pariwarId),
          eq(claimR9VotingSessions.claimCaseId, claimCaseId),
          isNull(claimR9VotingSessions.supersededAt),
        ),
      )
      .limit(1)
  )[0];

  let votes: ClaimR9VoteRow[] = [];
  if (session) {
    votes = await db
      .select()
      .from(claimR9Votes)
      .where(and(eq(claimR9Votes.sessionId, session.sessionId), isNull(claimR9Votes.supersededAt)))
      .orderBy(asc(claimR9Votes.castAt))
      .limit(clampLimit(undefined, { default: R9_PANEL_VOTES_CAP, cap: R9_PANEL_VOTES_CAP }));
  }
  return {
    claimCaseId: claimRow.claimCaseId,
    deceasedMemberId: claimRow.deceasedMemberId,
    currentState: claimRow.currentState,
    session: session ?? null,
    votes,
  };
}

// ── The votes-by-trustee transcript (AC8) ──────────────────────────────────────

export interface R9VoteByTrusteeItem {
  voteId: string;
  sessionId: string;
  claimCaseId: string;
  vote: string;
  /** The per-vote rule-version snapshot (copied from the session at cast time). */
  clauseVersionId: string;
  rationaleCiphertext: string;
  castAt: Date;
  /** Null on a LIVE vote; set on a revised/cancelled (superseded) one — the full transcript keeps both. */
  supersededAt: Date | null;
  // ── The session/panel/rule identity this vote belongs to (#13 — no vote shown decontextualized) ──
  clauseId: string;
  ruleCode: string;
  votingRequirement: string;
  panelActorIds: string[];
  /** The session's final outcome (null while the session is still open). */
  sessionOutcome: string | null;
}

/**
 * The votes-by-trustee transcript (AC8): one actor's FULL R9 voting history within a time window — LIVE
 * **and** superseded/revised votes (each individual vote separately), newest-first, each JOINED to its
 * session's clause/panel/outcome identity so no vote is decontextualized from the rule + panel it was cast
 * under (#13). Scope-safe; clamped. Rationale ciphertext AS STORED (the route decrypts).
 */
export async function getR9VotesByTrustee(
  db: Db,
  pariwarId: PariwarId,
  actorId: string,
  opts: { sinceDays?: number; limit?: number } = {},
): Promise<R9VoteByTrusteeItem[]> {
  // Clamp to a positive value — a 0 or negative sinceDays would shift make_interval's cutoff into the
  // future, silently returning an empty transcript instead of erroring.
  const sinceDays = Math.max(1, opts.sinceDays ?? 180);
  const rows = await db
    .select({
      voteId: claimR9Votes.voteId,
      sessionId: claimR9Votes.sessionId,
      claimCaseId: claimR9Votes.claimCaseId,
      vote: claimR9Votes.vote,
      clauseVersionId: claimR9Votes.clauseVersionId,
      rationaleCiphertext: claimR9Votes.rationaleCiphertext,
      castAt: claimR9Votes.castAt,
      supersededAt: claimR9Votes.supersededAt,
      clauseId: claimR9VotingSessions.clauseId,
      ruleCode: claimR9VotingSessions.ruleCode,
      votingRequirement: claimR9VotingSessions.votingRequirement,
      panelActorIds: claimR9VotingSessions.panelActorIds,
      sessionOutcome: claimR9VotingSessions.outcome,
    })
    .from(claimR9Votes)
    .innerJoin(claimR9VotingSessions, eq(claimR9VotingSessions.sessionId, claimR9Votes.sessionId))
    .where(
      and(
        eq(claimR9Votes.pariwarId, pariwarId),
        eq(claimR9Votes.voterActorId, actorId),
        sql`${claimR9Votes.castAt} >= now() - make_interval(days => ${sinceDays})`,
      ),
    )
    .orderBy(desc(claimR9Votes.castAt))
    .limit(clampLimit(opts.limit, { default: R9_VOTES_BY_TRUSTEE_CAP, cap: R9_VOTES_BY_TRUSTEE_CAP }));
  return rows.map((r) => ({
    voteId: r.voteId,
    sessionId: r.sessionId,
    claimCaseId: r.claimCaseId,
    vote: r.vote,
    clauseVersionId: r.clauseVersionId,
    rationaleCiphertext: r.rationaleCiphertext,
    castAt: r.castAt,
    supersededAt: r.supersededAt,
    clauseId: r.clauseId,
    ruleCode: r.ruleCode,
    votingRequirement: r.votingRequirement,
    panelActorIds: r.panelActorIds,
    sessionOutcome: r.sessionOutcome,
  }));
}
