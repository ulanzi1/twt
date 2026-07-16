// Appeal read accessors — Story 6.16 (Task 7/8). Transport-free, scope-safe, clamped reads.
//
//   · getAppealJourney            — the claim's single appeal-journey anchor (D-F: ≤1), or undefined.
//   · getAppealPanel              — the live Stage-2 panel session + its live votes (the admin panel surface).
//   · getAppealDecisionsByReviewer — the AC6 "reviewer + stage + time_range" audit transcript (bounded,
//     clamped, scope-respecting, indexed on the non-PII (reviewer_actor_id, stage, decided_at) columns).
//
// Claim STATE is ALWAYS derived from event replay (via getClaimCase / the reducer), NEVER these tables.

import { and, desc, eq, gte, isNull } from 'drizzle-orm';

import { type Db } from '../db.js';
import type { ClaimId, PariwarId } from '../ids/index.js';
import { clampLimit } from '../pagination.js';
import { claimAppeals, type ClaimAppealRow } from '../schema/claim_appeals.js';
import { claimAppealDecisions, type ClaimAppealDecisionRow } from '../schema/claim_appeal_decisions.js';
import {
  type ClaimAppealPanelSessionRow,
  claimAppealPanelSessions,
} from '../schema/claim_appeal_panel_sessions.js';
import { type ClaimAppealPanelVoteRow, claimAppealPanelVotes } from '../schema/claim_appeal_panel_votes.js';
import { type AppealStage } from './appeal.js';

/** Default + hard ceiling for the AC6 audit-query page (forced pagination + the domain limit-clamp gate). */
const AUDIT_QUERY_DEFAULT = 50;
const AUDIT_QUERY_CAP = 500;

/** The claim's single appeal-journey anchor (the unconditional-unique guarantees ≤1), or undefined. */
export async function getAppealJourney(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
): Promise<ClaimAppealRow | undefined> {
  const rows = await db
    .select()
    .from(claimAppeals)
    .where(and(eq(claimAppeals.pariwarId, pariwarId), eq(claimAppeals.claimCaseId, claimCaseId)))
    .limit(1);
  return rows[0];
}

export interface AppealPanelModel {
  session: ClaimAppealPanelSessionRow | undefined;
  votes: ClaimAppealPanelVoteRow[];
}

/** The live Stage-2 panel session + its live votes (the admin panel surface). Empty votes when no session. */
export async function getAppealPanel(db: Db, pariwarId: PariwarId, claimCaseId: ClaimId): Promise<AppealPanelModel> {
  const sessions = await db
    .select()
    .from(claimAppealPanelSessions)
    .where(
      and(
        eq(claimAppealPanelSessions.pariwarId, pariwarId),
        eq(claimAppealPanelSessions.claimCaseId, claimCaseId),
        isNull(claimAppealPanelSessions.supersededAt),
      ),
    )
    .limit(1);
  const session = sessions[0];
  if (!session) return { session: undefined, votes: [] };

  const votes = await db
    .select()
    .from(claimAppealPanelVotes)
    .where(and(eq(claimAppealPanelVotes.sessionId, session.sessionId), isNull(claimAppealPanelVotes.supersededAt)))
    .orderBy(desc(claimAppealPanelVotes.castAt))
    .limit(clampLimit(100, { default: 100, cap: 100 }));
  return { session, votes };
}

export interface AppealDecisionsByReviewerOpts {
  stage?: AppealStage;
  sinceDays?: number;
  limit?: number;
  /** The "now" instant to window against — passed in (Date.now() is unavailable in some contexts). */
  now: Date;
}

/**
 * The AC6 audit transcript — every appeal decision by a reviewer, optionally filtered by stage, within a
 * time window, bounded + clamped. Rows carry the rationale ciphertext (the route decrypts AFTER
 * authorization). Uses the (reviewer_actor_id, stage, decided_at) index.
 */
export async function getAppealDecisionsByReviewer(
  db: Db,
  pariwarId: PariwarId,
  reviewerActorId: string,
  opts: AppealDecisionsByReviewerOpts,
): Promise<ClaimAppealDecisionRow[]> {
  const sinceDays = opts.sinceDays ?? 180;
  const since = new Date(opts.now.getTime() - sinceDays * 24 * 60 * 60 * 1000);
  const conditions = [
    eq(claimAppealDecisions.pariwarId, pariwarId),
    eq(claimAppealDecisions.reviewerActorId, reviewerActorId),
    gte(claimAppealDecisions.decidedAt, since),
  ];
  if (opts.stage) conditions.push(eq(claimAppealDecisions.stage, opts.stage));
  return db
    .select()
    .from(claimAppealDecisions)
    .where(and(...conditions))
    .orderBy(desc(claimAppealDecisions.decidedAt))
    .limit(clampLimit(opts.limit ?? AUDIT_QUERY_DEFAULT, { default: AUDIT_QUERY_DEFAULT, cap: AUDIT_QUERY_CAP }));
}
