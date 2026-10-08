// CLOSED, in the reversal's own transaction — Story 6.24a (`2026-10-07-292` RF6; builds `-262` FQ5 A: *"appeal allowed →
// the new claim is closed"*). Transport-free. The WRITE half of the suspicion refusal (the read half is
// `suspicion-refusal.ts`, which stays outside `claim/events.ts`'s import graph — 6.23a NW1).
//
// ⭐ ONE helper, called by all THREE reversal writers — `reviewAppealStage1`, `finalizeAppealOutcome` (the `reversed` arm)
// and `decideAppealStage3` — AFTER their own `reversed` writes, in their transaction. It acts ONLY when the reversed
// claim's LIVE decision is the `-239` refusal (read here, in the same transaction; RF13's reason lock keeps it `-239`
// while any other claim of the death is ⛔ not closed). For every OTHER claim of the same death (RF3 — ⛔ no ordering by
// `created_at`, ⛔ no "who filed" test), in `claim_case_id` order:
//   · it takes that claim's `appeal:` key, its `r9:` key and its trustee key, THEN its row lock — the order every writer of
//     those keys already uses (each takes its key, then the row); row-then-key would deadlock (40P01);
//   · a claim in a CLOSABLE state (`isClaimClosable`) is CLOSED through `claim.closed` (⛔ never `denied`, ⛔ never a 6.19c
//     closures row, ⛔ never `denied_no_appeal` — invariant 1), and its LIVE PROCESSES are ended so ⛔ nothing keeps
//     running on it (v1.1 / Trap 15): an open appeal journey's anchor → `closed`; an un-finalized appeal panel and R9
//     session → superseded through the actor-free cores; its `routed_to_r9` row → superseded; a live correction return →
//     superseded and its open run ended `decided` — the supersession the 6.19 terminal writers use;
//   · a claim already `state_trustee_approved` / `approved` / `settled` is ⛔ NOT moved — it is REPORTED in the result
//     (the caller logs it at error level with ids only and writes an audit line). Unreachable under RF5 + RF7 (Trap 9).
//
// ⚠ LOCK ORDER (Trap 8): the reversal writer took the per-death `suspicion-reversal:` key FIRST, then the REFUSED claim's
// `appeal:` key and row; here it takes each HELD claim's keys and row. ⛔ No writer takes a held claim's lock and THEN
// waits on the refused claim's: the approval gate (RF5) and the cycle commit (RF7) only READ the refused claim.

import { and, asc, eq, isNull, ne, sql } from 'drizzle-orm';
import type pg from 'pg';

import { bindScopedDb, type Db } from '../db.js';
import type { ClaimId, MemberId, PariwarId } from '../ids/index.js';
import { clampLimit } from '../pagination.js';
import { claims, type ClaimRow } from '../schema/claims.js';
import { claimAppeals } from '../schema/claim_appeals.js';
import { claimStateTrusteeDecisions } from '../schema/claim_state_trustee_decisions.js';
import { claimVerifierDecisions } from '../schema/claim_verifier_decisions.js';
import { appealAdvisoryLockKey } from './appeal-lock.js';
import { readLiveAppealPanelSession, supersedeAppealPanelSession } from './appeal-panel-session.js';
import { endCorrectionRun, readOpenCorrectionRun } from './correction-chase.js';
import type { ClaimEventActor } from './events.js';
import { projectClaimState } from './project.js';
import {
  r9VotingAdvisoryLockKey,
  readLiveR9VotingSession,
  supersedeLiveR9Routing,
  supersedeR9VotingSession,
} from './r9-voting-persist.js';
import { isClaimClosable } from './state.js';
import { getLiveCorrectionReturn, stateTrusteeDecisionAdvisoryLockKey } from './state-trustee-decision-persist.js';
import { POST_DEATH_NOMINEE_CHANGE_REASON_CODE, acquireSuspicionReversalLock } from './suspicion-refusal.js';

/** The `claim.closed` trigger (the ONE value its payload schema accepts). */
export const SUSPICION_APPEAL_ALLOWED_TRIGGER = 'suspicion_appeal_allowed' as const;

/** The bounded number of other claims of one death the closure walks (a death has a handful). */
const HELD_CLAIMS_CAP = 50;

export interface CloseClaimsHeldBySuspicionAppealInput {
  readonly pariwarId: PariwarId;
  readonly deceasedMemberId: MemberId;
  /** The claim whose `-239` refusal was just REVERSED on appeal (S). */
  readonly reversedClaimCaseId: ClaimId;
  /** Who caused the reversal (the event's `actor` — the closure is the system's consequence of it). */
  readonly actor: ClaimEventActor;
  /** The reversing reviewer's actor id (`events_log.actor_id`). */
  readonly actorId: string;
  readonly auditId?: string;
}

export interface HeldClaimNotClosed {
  readonly claimCaseId: ClaimId;
  readonly state: string;
}

export interface CloseClaimsHeldBySuspicionAppealResult {
  /** The reversed claim's live decision was ⛔ not the `-239` refusal ⇒ nothing was closed (any other refusal). */
  readonly applied: boolean;
  /** The claims CLOSED, in `claim_case_id` order. */
  readonly closed: readonly ClaimId[];
  /** Claims already finally approved / paid — ⛔ not moved; the caller logs (error, ids only) and audits each. */
  readonly notClosed: readonly HeldClaimNotClosed[];
}

/**
 * ⭐ RF6 v1.1 — take the per-death REVERSAL key. Each reversal writer calls this FIRST — before its own `appeal:` lock and
 * claim-row lock — reading the claim's immutable `deceased_member_id` UNLOCKED to build it. A missing claim takes ⛔ no
 * key (the writer's own not-found check answers). Two `-239` claims of one death reversed at once then serialise
 * (⛔ no 40P01). ⛔ Never the intake lock, ⛔ never RF15's appeal key.
 */
export async function acquireSuspicionReversalLockForClaim(
  client: pg.PoolClient,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
): Promise<void> {
  const db = bindScopedDb(client);
  const [row] = await db
    .select({ deceasedMemberId: claims.deceasedMemberId })
    .from(claims)
    .where(and(eq(claims.pariwarId, pariwarId), eq(claims.claimCaseId, claimCaseId)))
    .limit(1);
  if (row) await acquireSuspicionReversalLock(db, pariwarId, row.deceasedMemberId);
}

async function takeKey(client: pg.PoolClient, key: bigint): Promise<void> {
  await client.query('SELECT pg_advisory_xact_lock($1)', [key.toString()]);
}

async function liveDecisionReasonOf(db: Db, pariwarId: PariwarId, claimCaseId: ClaimId): Promise<string | null> {
  const [row] = await db
    .select({ outcome: claimVerifierDecisions.outcome, reasonCode: claimVerifierDecisions.reasonCode })
    .from(claimVerifierDecisions)
    .where(
      and(
        eq(claimVerifierDecisions.pariwarId, pariwarId),
        eq(claimVerifierDecisions.claimCaseId, claimCaseId),
        isNull(claimVerifierDecisions.supersededAt),
      ),
    )
    .limit(1);
  return row && row.outcome === 'denied' ? row.reasonCode : null;
}

/**
 * ⭐ RF6 — close every other claim of the death held by the reversed `-239` refusal. MUST run inside the reversal
 * writer's transaction, AFTER its own `reversed` writes, with the per-death reversal key already held.
 */
export async function closeClaimsHeldBySuspicionAppeal(
  client: pg.PoolClient,
  input: CloseClaimsHeldBySuspicionAppealInput,
): Promise<CloseClaimsHeldBySuspicionAppealResult> {
  const db = bindScopedDb(client);
  if ((await liveDecisionReasonOf(db, input.pariwarId, input.reversedClaimCaseId)) !== POST_DEATH_NOMINEE_CHANGE_REASON_CODE) {
    return { applied: false, closed: [], notClosed: [] };
  }

  // The other claims of the death — ids only, UNLOCKED (each is re-read under its own row lock below).
  const others = await db
    .select({ claimCaseId: claims.claimCaseId })
    .from(claims)
    .where(
      and(
        eq(claims.pariwarId, input.pariwarId),
        eq(claims.deceasedMemberId, input.deceasedMemberId),
        ne(claims.claimCaseId, input.reversedClaimCaseId),
      ),
    )
    .orderBy(asc(claims.claimCaseId))
    .limit(clampLimit(HELD_CLAIMS_CAP, { default: HELD_CLAIMS_CAP, cap: HELD_CLAIMS_CAP }));

  const closed: ClaimId[] = [];
  const notClosed: HeldClaimNotClosed[] = [];
  for (const { claimCaseId } of others) {
    // Key-then-row, in the order every writer of these keys uses (Trap 8 / 40P01).
    await takeKey(client, appealAdvisoryLockKey(input.pariwarId, claimCaseId));
    await takeKey(client, r9VotingAdvisoryLockKey(input.pariwarId, claimCaseId));
    await takeKey(client, stateTrusteeDecisionAdvisoryLockKey(input.pariwarId, claimCaseId));
    const [held] = await db
      .select()
      .from(claims)
      .where(and(eq(claims.pariwarId, input.pariwarId), eq(claims.claimCaseId, claimCaseId)))
      .for('update');
    if (!held) continue;
    if (held.currentState === 'closed') continue;
    if (!isClaimClosable(held.currentState)) {
      notClosed.push({ claimCaseId, state: held.currentState });
      continue;
    }
    await endLiveProcesses(client, db, input.pariwarId, held);
    await projectClaimState(client, {
      claimCaseId,
      pariwarId: input.pariwarId,
      deceasedMemberId: held.deceasedMemberId,
      intakeChannels: held.intakeChannels,
      claimantActorId: held.claimantActorId,
      eventType: 'claim.closed',
      payload: {
        from_state: held.currentState,
        to_state: 'closed',
        trigger: SUSPICION_APPEAL_ALLOWED_TRIGGER,
        actor: input.actor,
        held_by_claim_case_id: input.reversedClaimCaseId,
        deceased_member_id: held.deceasedMemberId,
      },
      actorId: input.actorId,
      ...(input.auditId !== undefined ? { auditId: input.auditId } : {}),
    });
    closed.push(claimCaseId);
  }
  return { applied: true, closed, notClosed };
}

/** End everything still running on a claim about to be closed (Task 3.0's enumeration — the rows a writer must END). */
async function endLiveProcesses(client: pg.PoolClient, db: Db, pariwarId: PariwarId, held: ClaimRow): Promise<void> {
  const claimCaseId = held.claimCaseId;
  // (1) An open appeal journey → `closed` (⛔ no open journey outlives its claim; ⛔ nothing reopens it).
  await db
    .update(claimAppeals)
    .set({ status: 'closed', updatedAt: sql`now()` })
    .where(and(eq(claimAppeals.pariwarId, pariwarId), eq(claimAppeals.claimCaseId, claimCaseId), eq(claimAppeals.status, 'open')));
  // (2) An un-finalized Stage-2 panel — the actor-free core (a finalized session is history, ⛔ no live work).
  const panel = await readLiveAppealPanelSession(db, pariwarId, claimCaseId);
  if (panel && panel.outcome === null) await supersedeAppealPanelSession(db, claimCaseId, panel.sessionId);
  // (3) An un-finalized R9 session — the actor-free core — and the claim's live `routed_to_r9` row.
  const r9 = await readLiveR9VotingSession(db, pariwarId, claimCaseId);
  if (r9 && r9.outcome === null) await supersedeR9VotingSession(db, claimCaseId, r9.sessionId);
  await supersedeLiveR9Routing(db, pariwarId, claimCaseId);
  // (4) A live correction return — superseded (the 6.19 terminal writers' supersession, `supersedeReturn`'s shape) — and
  //     its open run ended `decided`, so ⛔ no family text and ⛔ no day-90 escalation follows a closed claim.
  const ret = await getLiveCorrectionReturn(db, pariwarId, claimCaseId);
  if (ret) {
    await db
      .update(claimStateTrusteeDecisions)
      .set({ supersededAt: sql`now()` })
      .where(and(eq(claimStateTrusteeDecisions.decisionId, ret.decisionId), isNull(claimStateTrusteeDecisions.supersededAt)));
  }
  const run = await readOpenCorrectionRun(db, pariwarId, claimCaseId);
  if (run) await endCorrectionRun(client, { pariwarId, claimCaseId, runId: run.runId, reason: 'decided' });
}
