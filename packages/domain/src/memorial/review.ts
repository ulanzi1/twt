// The Trust's review of a memorial version (Story 11b.4, MA6 / MA7 / MA16 / Trap 8 — `#decision-2026-10-24-398`).
//
// ⛔ There is ⛔ no edit: the decision row holds an act, spans `{ field, start, end, reason }` into the VERBATIM text, the
// photo's reason and an optional Tier-1 note — ⛔ never the family's words (AC5/AC6). Every write runs under
// `lockMemorialPool` and re-reads the chain AFTER the lock (MA9).
//
// Trap 8 — refusals must ⛔ never become an oracle: each route answers ONE neutral 404 (`memorial_review.not_found`) for
// every refusal in its set, checked scope-first. The set is PER ROUTE (AC9):
//   · decision          — unknown / out of scope / superseded / withdrawn / already decided;
//   · withdraw-approval — unknown / out of scope / ⛔ the chain's latest approved, un-withdrawn version (a SUPERSEDED
//                         approval is allowed — MA16);
//   · detail            — unknown / out of scope only (decided, superseded and withdrawn versions are readable — it is the
//                         history view).

import { and, eq, sql } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { MemberId, PariwarId, PoolId } from '../ids/index.js';
import {
  memorialReviewDecisions,
  type MemorialReviewDecisionInsert,
  type MemorialReviewDecisionRow,
} from '../schema/memorial_review_decisions.js';
import { memorialSubmissions } from '../schema/memorial_submissions.js';
import { latestApprovedIndex } from './status.js';
import type { MemorialChainLink } from './submission.js';
import type { MemorialReviewAction, MemorialWithdrawalActor } from './vocab.js';

export type MemorialReviewRoute = 'decision' | 'withdraw_approval' | 'detail';

/**
 * PURE — is `submissionId` a valid target of `route` within its pool's chain (read under the lock for the writes)?
 * Returns the version's index, or `null` (the caller answers the one neutral 404).
 */
export function memorialReviewTargetIndex(
  chain: readonly MemorialChainLink[],
  submissionId: string,
  route: MemorialReviewRoute,
): number | null {
  const index = chain.findIndex((l) => l.submission.submissionId === submissionId);
  if (index < 0) return null;
  switch (route) {
    case 'detail':
      return index;
    case 'decision': {
      const link = chain[index]!;
      const isHead = index === chain.length - 1;
      return isHead && link.decision === null && link.withdrawal === null ? index : null;
    }
    case 'withdraw_approval':
      return latestApprovedIndex(chain) === index ? index : null;
    default: {
      const exhaustive: never = route;
      throw new Error(`memorialReviewTargetIndex: unknown route ${String(exhaustive)}`);
    }
  }
}

/** The pool a submission belongs to, in THIS Pariwar (RLS + an explicit predicate), or `null`. */
export async function readMemorialSubmissionPool(
  db: Db,
  { pariwarId, submissionId }: { readonly pariwarId: PariwarId; readonly submissionId: string },
): Promise<{ readonly poolId: PoolId; readonly deceasedMemberId: MemberId } | null> {
  const [row] = await db
    .select({ poolId: memorialSubmissions.poolId, deceasedMemberId: memorialSubmissions.deceasedMemberId })
    .from(memorialSubmissions)
    .where(and(eq(memorialSubmissions.pariwarId, pariwarId), eq(memorialSubmissions.submissionId, submissionId)));
  return row ?? null;
}

/** Insert the ONE decision (the PK makes a second one a 23505 — reachable only without the lock). */
export async function insertMemorialDecision(
  db: Db,
  values: Omit<MemorialReviewDecisionInsert, 'decidedAt'>,
): Promise<MemorialReviewDecisionRow> {
  const [row] = await db.insert(memorialReviewDecisions).values(values).returning();
  return row!;
}

export type MemorialReviewQueueView = 'pending' | 'decided';

export interface MemorialReviewQueueRow {
  readonly submissionId: string;
  readonly poolId: PoolId;
  readonly deceasedMemberId: MemberId;
  readonly createdAt: Date;
  /** The head's state inputs (⛔ content) — so the list shows its derived state. */
  readonly action: MemorialReviewAction | null;
  readonly withdrawnBy: MemorialWithdrawalActor | null;
}

/**
 * The review queue — chain HEADS only (a superseded version is reached through its chain), oldest first:
 *   · `pending` — the head carries ⛔ no decision and ⛔ no withdrawal (`with_the_trust`);
 *   · `decided` — the head carries a decision or a withdrawal.
 * ⛔ No body in the list (the caller decrypts only the deceased's name). Raw SQL with explicit aliases — ⛔ a correlated
 * subquery through the builder ([[project_epic6_drizzle_correlated_subquery_bug]]).
 */
export async function listMemorialReviewQueue(
  db: Db,
  { pariwarId, view, limit }: { readonly pariwarId: PariwarId; readonly view: MemorialReviewQueueView; readonly limit: number },
): Promise<MemorialReviewQueueRow[]> {
  const state =
    view === 'pending'
      ? sql`d.submission_id IS NULL AND w.submission_id IS NULL`
      : sql`(d.submission_id IS NOT NULL OR w.submission_id IS NOT NULL)`;
  const r = await db.execute<{
    submission_id: string;
    pool_id: string;
    deceased_member_id: string;
    created_at: Date | string;
    action: MemorialReviewAction | null;
    withdrawn_by: MemorialWithdrawalActor | null;
  }>(sql`
    SELECT s.submission_id, s.pool_id, s.deceased_member_id, s.created_at, d.action, w.withdrawn_by
      FROM memorial_submissions s
      LEFT JOIN memorial_review_decisions d ON d.pariwar_id = s.pariwar_id AND d.submission_id = s.submission_id
      LEFT JOIN memorial_withdrawals w ON w.pariwar_id = s.pariwar_id AND w.submission_id = s.submission_id
     WHERE s.pariwar_id = ${pariwarId}
       AND NOT EXISTS (
             SELECT 1 FROM memorial_submissions nxt
              WHERE nxt.pariwar_id = s.pariwar_id AND nxt.supersedes_submission_id = s.submission_id)
       AND ${state}
     ORDER BY s.created_at ASC, s.submission_id ASC
     LIMIT ${limit}`);
  return r.rows.map((row) => ({
    submissionId: row.submission_id,
    poolId: row.pool_id as PoolId,
    deceasedMemberId: row.deceased_member_id as MemberId,
    createdAt: row.created_at instanceof Date ? row.created_at : new Date(row.created_at),
    action: row.action,
    withdrawnBy: row.withdrawn_by,
  }));
}

