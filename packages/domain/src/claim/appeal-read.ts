// Appeal read accessors — Story 6.16 (Task 7/8). Transport-free, scope-safe, clamped reads.
//
//   · getAppealJourney            — the claim's single appeal-journey anchor (D-F: ≤1), or undefined.
//   · getAppealPanel              — the live Stage-2 panel session + its live votes (the admin panel surface).
//   · getAppealDecisionsByReviewer — the AC6 "reviewer + stage + time_range" audit transcript (bounded,
//     clamped, scope-respecting, indexed on the non-PII (reviewer_actor_id, stage, decided_at) columns).
//   · listOpenAppealCasesForPariwar — Story 10.11 (D5): the Pariwar-WIDE open-journey list the Trustee-Lite
//     aggregator reads. The three 6.16 reads are all narrow (per-claim, per-claim, per-reviewer); none
//     aggregates open cases at a trustee's scope, which is why 10.11 adds exactly one read and adds it HERE
//     rather than in a new `appeal-queue.ts` module.
//
// Claim STATE is ALWAYS derived from event replay (via getClaimCase / the reducer), NEVER these tables.

import { and, asc, desc, eq, gte, isNull } from 'drizzle-orm';

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
import { claims } from '../schema/claims.js';
import { type AppealStage } from './appeal.js';

/** Default + hard ceiling for the AC6 audit-query page (forced pagination + the domain limit-clamp gate). */
const AUDIT_QUERY_DEFAULT = 50;
const AUDIT_QUERY_CAP = 500;

/** Default/cap for the Story 10.11 Pariwar-wide open-appeal scan (mirrors the r9-voting queue ceiling). */
const OPEN_APPEALS_DEFAULT = 50;
const OPEN_APPEALS_CAP = 200;

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

// ── The Pariwar-wide open-journey list (Story 10.11, D5) ──────────────────────────────────────

/**
 * ONE open appeal journey, as the Trustee-Lite aggregator reads it (Story 10.11, D5). NON-PII: ids,
 * the current stage, and the stage-entry instant — no rationale, no ciphertext, no identity.
 */
export interface OpenAppealCase {
  readonly appealId: string;
  readonly claimCaseId: string;
  readonly deceasedMemberId: string;
  /** The journey's current stage — selects which `DEFAULT_APPEAL_STAGE_SLA_DAYS` entry applies. */
  readonly stage: AppealStage;
  /**
   * When the journey ENTERED its current stage — the anchor the 10.11 AC2 deadline derives from
   * (`stageEnteredAt + SLA_DAYS[stage]`).
   *
   * This is `updated_at`, and that is exact rather than approximate: both stage-advance write-paths
   * set `current_stage` and `updated_at: now()` in the SAME statement (`appeal-persist.ts:406`
   * 1→2, `appeal-panel-persist.ts:633` 2→3), and at creation `updated_at` defaults equal to
   * `created_at` with `current_stage: '1'`. So the column always names the instant the CURRENT
   * stage began. No other write-path touches this table.
   */
  readonly stageEnteredAt: Date;
  /** When the journey was first initiated (Stage-1 entry) — context, not the SLA anchor. */
  readonly initiatedAt: Date;
  readonly initiatedOnBehalf: boolean;
}

/**
 * Every OPEN appeal journey in the Pariwar (Story 10.11, D5) — `status = 'open'`, oldest-stage-entry
 * first, scope-safe (RLS + an explicit `pariwar_id` predicate) and `clampLimit`ed.
 *
 * Terminal journeys (`reversed` / `upheld_final`) are excluded: they need no trustee attention, which
 * is the whole selection criterion of the aggregator this feeds. Uses `claim_appeals_pariwar_id_idx`;
 * it does NOT perturb `getAppealDecisionsByReviewer`'s `(reviewer_actor_id, stage, decided_at)` index
 * usage — that read is over a different table (`claim_appeal_decisions`).
 */
export async function listOpenAppealCasesForPariwar(
  db: Db,
  pariwarId: PariwarId,
  opts: { limit?: number } = {},
): Promise<OpenAppealCase[]> {
  const rows = await db
    .select({
      appealId: claimAppeals.appealId,
      claimCaseId: claimAppeals.claimCaseId,
      deceasedMemberId: claims.deceasedMemberId,
      stage: claimAppeals.currentStage,
      stageEnteredAt: claimAppeals.updatedAt,
      initiatedAt: claimAppeals.createdAt,
      initiatedOnBehalf: claimAppeals.initiatedOnBehalf,
    })
    .from(claimAppeals)
    .innerJoin(
      claims,
      and(eq(claims.claimCaseId, claimAppeals.claimCaseId), eq(claims.pariwarId, claimAppeals.pariwarId)),
    )
    .where(and(eq(claimAppeals.pariwarId, pariwarId), eq(claimAppeals.status, 'open')))
    .orderBy(asc(claimAppeals.updatedAt), asc(claimAppeals.appealId))
    .limit(clampLimit(opts.limit, { default: OPEN_APPEALS_DEFAULT, cap: OPEN_APPEALS_CAP }));

  return rows.map((r) => ({
    appealId: r.appealId,
    claimCaseId: r.claimCaseId,
    deceasedMemberId: r.deceasedMemberId,
    stage: r.stage,
    stageEnteredAt: r.stageEnteredAt,
    initiatedAt: r.initiatedAt,
    initiatedOnBehalf: r.initiatedOnBehalf,
  }));
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
