// Stage-2 appeal PANEL persistence writers — Story 6.16 (Task 5). Transport-free.
//
// Mirrors `r9-voting-persist.ts` (Story 6.14) MINUS the niyamavali clause registry — an appeal panel votes on
// the APPEAL, not on a clause (no clause_id / clause_version_id / rule_code / voting_requirement snapshot).
// The four verbs:
//   · openAppealPanel     — open the panel (AC3). METADATA-ONLY: capture + validate the IMMUTABLE roster
//     (each member holds claim.appeal_vote @ pariwar; MINIMUM 2, D-B), snapshot quorum, insert the session,
//     emit `claim.appeal_stage2_initiated` (the identity formal-filing marker — the panel convenes). It is the
//     ONLY open-side lifecycle event; the state was already entered by Stage 1's advance.
//   · castAppealVote      — cast/revise a member's reverse|deny vote (AC3). METADATA-ONLY, NO lifecycle event.
//     Atomic supersede-then-insert (revision). Revisable until finalize.
//   · finalizeAppealOutcome — the SOLE lifecycle-changing verb (AC3). Under the advisory lock: re-check the
//     idempotent short-circuit, gate on quorum, apply the FROZEN tie rule (computeAppealOutcome — reverse iff
//     a strict reverse-majority over the panel size, else advance), then write in ONE scope-tx the session
//     outcome + the `claim.appeal_stage2_reviewed` event (+ `claim.reversed` on a reverse) + a
//     claim_appeal_decisions(stage=2) uniform-audit row.
//   · cancelAppealPanel   — the correction path (AC3). METADATA-ONLY: supersede the session + all live votes.
//     NO lifecycle event.
//
// CONCURRENCY (AC9): same advisory-lock (`appeal:` namespace, shared with appeal-persist.ts so Stage-2 verbs
// serialize with an in-flight initiate/stage-1/stage-3 on the same claim) + immutable-roster + supersede-then-
// insert + FOR-UPDATE-tally + quorum + panel-size-denominator discipline. The reducer stays TOTAL.
//
// PII: the per-vote rationale is ALREADY ENCRYPTED + BRANDED by the caller (PreparedAppealCiphertext). The R5
// display snapshots are ALREADY RESOLVED server-side — non-empty; the writer never falls back.

import { and, asc, eq, isNull, sql } from 'drizzle-orm';
import type pg from 'pg';

import { bindScopedDb, type Db } from '../db.js';
import type { ClaimId, PariwarId } from '../ids/index.js';
import { hasPermission, type EffectiveGrant } from '../rbac/index.js';
import { claims } from '../schema/claims.js';
import { claimAppeals } from '../schema/claim_appeals.js';
import { claimAppealDecisions, type ClaimAppealDecisionRow } from '../schema/claim_appeal_decisions.js';
import {
  type ClaimAppealPanelSessionRow,
  claimAppealPanelSessions,
} from '../schema/claim_appeal_panel_sessions.js';
import { type ClaimAppealPanelVoteRow, claimAppealPanelVotes } from '../schema/claim_appeal_panel_votes.js';
import {
  type AppealDispositionCategory,
  APPEAL_PANEL_MAX_MEMBERS,
  APPEAL_PANEL_MIN_MEMBERS,
  appealQuorumFor,
  type AppealPanelVote,
  computeAppealOutcome,
  type PreparedAppealCiphertext,
} from './appeal.js';
import { AppealDispositionCategoryError, appealAdvisoryLockKey } from './appeal-persist.js';
import { type ClaimEventActor } from './events.js';
import { projectClaimState } from './project.js';

/** The RBAC key each panel member must hold @ pariwar (validated at open, AC3). */
const APPEAL_VOTE_PERMISSION_KEY = 'claim.appeal_vote';
/** The Stage-3-tier RBAC key required to cancel a session that already has live votes cast (6.16 review). */
const APPEAL_FINAL_PERMISSION_KEY = 'claim.appeal_final';

// ── Typed write-path guards (the route maps each to a stable 4xx) ─────────────

export class AppealPanelClaimNotFoundError extends Error {
  public readonly name = 'AppealPanelClaimNotFoundError';
  public constructor(public readonly claimCaseId: string) {
    super(`[appeal-panel] no claim found for id ${claimCaseId} in scope`);
  }
}

/** Thrown by open when the claim is not at `appeal_stage_2` (the panel convenes only there, AC3 → 409). */
export class AppealPanelClaimNotInStage2Error extends Error {
  public readonly name = 'AppealPanelClaimNotInStage2Error';
  public constructor(
    public readonly claimCaseId: string,
    public readonly currentState: string,
  ) {
    super(`[appeal-panel] claim ${claimCaseId} is '${currentState}' — a Stage-2 panel opens only at 'appeal_stage_2'`);
  }
}

/** Thrown by open when a non-superseded session already exists for the claim (open OR finalized, AC3 → 409). */
export class AppealPanelSessionExistsError extends Error {
  public readonly name = 'AppealPanelSessionExistsError';
  public constructor(public readonly claimCaseId: string) {
    super(`[appeal-panel] claim ${claimCaseId} already has a live (non-superseded) appeal panel session`);
  }
}

/** Thrown by open when the (de-duplicated) roster is below the D-B minimum of 2 (AC3 → 400). */
export class AppealPanelTooSmallError extends Error {
  public readonly name = 'AppealPanelTooSmallError';
  public constructor(public readonly size: number) {
    super(`[appeal-panel] a roster of ${size} is below the ${APPEAL_PANEL_MIN_MEMBERS}-member minimum (D-B)`);
  }
}

/** Thrown by open when the (de-duplicated) roster exceeds the ceiling (AC3 → 400). */
export class AppealPanelTooLargeError extends Error {
  public readonly name = 'AppealPanelTooLargeError';
  public constructor(public readonly size: number) {
    super(`[appeal-panel] roster of ${size} exceeds the ${APPEAL_PANEL_MAX_MEMBERS}-member ceiling`);
  }
}

/** Thrown by open when a designated panel member does NOT hold claim.appeal_vote @ this Pariwar (AC3 → 403). */
export class AppealPanelMemberUnauthorizedError extends Error {
  public readonly name = 'AppealPanelMemberUnauthorizedError';
  public constructor(public readonly actorId: string) {
    super(`[appeal-panel] panel member ${actorId} does not hold ${APPEAL_VOTE_PERMISSION_KEY} in this Pariwar`);
  }
}

/** Thrown by vote/finalize/cancel when the claim has no live session (→ 409). */
export class AppealPanelNoLiveSessionError extends Error {
  public readonly name = 'AppealPanelNoLiveSessionError';
  public constructor(public readonly claimCaseId: string) {
    super(`[appeal-panel] claim ${claimCaseId} has no live appeal panel session`);
  }
}

/** Thrown by vote/cancel when the session is already finalized (→ 409). */
export class AppealPanelSessionFinalizedError extends Error {
  public readonly name = 'AppealPanelSessionFinalizedError';
  public constructor(public readonly claimCaseId: string) {
    super(`[appeal-panel] claim ${claimCaseId}'s appeal panel session is finalized — voting/cancel no longer permitted`);
  }
}

/** Thrown by vote/finalize/cancel when the actor is not a member of the session's immutable panel (→ 403). */
export class AppealPanelActorNotOnPanelError extends Error {
  public readonly name = 'AppealPanelActorNotOnPanelError';
  public constructor(public readonly actorId: string) {
    super(`[appeal-panel] actor ${actorId} is not a member of this appeal panel`);
  }
}

/** Thrown when a concurrent revise already superseded the voter's live vote (0-row UPDATE → 409). */
export class AppealPanelVoteRevisionConflictError extends Error {
  public readonly name = 'AppealPanelVoteRevisionConflictError';
  public constructor(public readonly voterActorId: string) {
    super(`[appeal-panel] vote revision for ${voterActorId} lost a concurrent race — reload and try again`);
  }
}

/** Thrown when a live vote already exists for the (session, voter) — partial-unique 23505 → 409. */
export class AppealPanelVoteConflictError extends Error {
  public readonly name = 'AppealPanelVoteConflictError';
  public constructor(public readonly voterActorId: string) {
    super(`[appeal-panel] a live vote already exists for ${voterActorId} in this session`);
  }
}

/** Thrown by finalize when cast live votes are below the snapshotted quorum (AC3 → 409). */
export class AppealPanelQuorumNotMetError extends Error {
  public readonly name = 'AppealPanelQuorumNotMetError';
  public constructor(
    public readonly castVotes: number,
    public readonly quorumRequired: number,
  ) {
    super(`[appeal-panel] finalize blocked: ${castVotes} cast vote(s) below the required quorum of ${quorumRequired}`);
  }
}

/** Thrown by finalize when the disposition_category is absent on a reversing outcome (D-A → 400). */
export class AppealPanelDispositionRequiredError extends Error {
  public readonly name = 'AppealPanelDispositionRequiredError';
  public constructor() {
    super(`[appeal-panel] a disposition_category is required when the panel tally reverses (D-A)`);
  }
}

/** Thrown by cancel when the session is already superseded (409). */
export class AppealPanelSessionAlreadySupersededError extends Error {
  public readonly name = 'AppealPanelSessionAlreadySupersededError';
  public constructor(public readonly claimCaseId: string) {
    super(`[appeal-panel] claim ${claimCaseId}'s appeal panel session was already cancelled — reload and try again`);
  }
}

/** Thrown by cancel when the session already has live votes cast and the actor is a plain panel member
 *  (not ALSO a Stage-3-tier `claim.appeal_final` holder) — a single ordinary panelist may no longer
 *  unilaterally discard other members' live votes (6.16 review finding; → 403). Cancelling a session with
 *  NO live votes yet (e.g. a wrong roster before any voting begins) remains open to any panel member. */
export class AppealPanelCancelUnauthorizedError extends Error {
  public readonly name = 'AppealPanelCancelUnauthorizedError';
  public constructor(public readonly actorId: string) {
    super(
      `[appeal-panel] actor ${actorId} may not cancel a session with live votes cast — an elevated ` +
        `(${APPEAL_FINAL_PERMISSION_KEY}) actor is required once voting has begun`,
    );
  }
}

/** True iff `err` (or its wrapped cause) is a Postgres unique-violation (23505). */
function isUniqueViolation(err: unknown): boolean {
  const direct = (err as { code?: string }).code;
  const cause = (err as { cause?: { code?: string } }).cause?.code;
  return direct === '23505' || cause === '23505';
}

// ── Advisory lock + row-lock helpers ──────────────────────────────────────────

async function acquireAppealLock(client: pg.PoolClient, pariwarId: PariwarId, claimCaseId: ClaimId): Promise<void> {
  await client.query('SELECT pg_advisory_xact_lock($1)', [appealAdvisoryLockKey(pariwarId, claimCaseId).toString()]);
}

async function lockClaim(db: Db, pariwarId: PariwarId, claimCaseId: ClaimId) {
  const rows = await db
    .select()
    .from(claims)
    .where(and(eq(claims.pariwarId, pariwarId), eq(claims.claimCaseId, claimCaseId)))
    .for('update');
  return rows[0];
}

/** The claim's live (non-superseded) session, or undefined. Read under the caller's advisory lock. */
async function liveSession(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
): Promise<ClaimAppealPanelSessionRow | undefined> {
  const rows = await db
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
  return rows[0];
}

/** True iff `claimCaseId` carries ANY session (live or superseded). Distinguishes "never had one" from
 *  "already cancelled" in cancel's non-race check. */
async function hasAnySession(db: Db, pariwarId: PariwarId, claimCaseId: ClaimId): Promise<boolean> {
  const rows = await db
    .select({ sessionId: claimAppealPanelSessions.sessionId })
    .from(claimAppealPanelSessions)
    .where(
      and(eq(claimAppealPanelSessions.pariwarId, pariwarId), eq(claimAppealPanelSessions.claimCaseId, claimCaseId)),
    )
    .limit(1);
  return rows.length > 0;
}

/** Validate EVERY panel member holds `claim.appeal_vote` @ this Pariwar (AC3) — the assertPanelAuthorized
 *  pattern from r9-voting-persist.ts, re-pointed at the appeal key. Fail-closed on the FIRST unauthorized. */
async function assertPanelAuthorized(
  client: pg.PoolClient,
  pariwarId: PariwarId,
  panelActorIds: readonly string[],
): Promise<void> {
  const res = await client.query<{
    user_id: string;
    pariwar_id: string;
    role: string;
    scope_dimension: EffectiveGrant['scopeDimension'];
    scope_value: string | null;
  }>(`SELECT user_id, pariwar_id, role, scope_dimension, scope_value FROM role_grants WHERE user_id = ANY($1)`, [
    [...panelActorIds],
  ]);
  const grantsByActor = new Map<string, EffectiveGrant[]>();
  for (const r of res.rows) {
    const list = grantsByActor.get(r.user_id) ?? [];
    list.push({ pariwarId: r.pariwar_id, role: r.role, scopeDimension: r.scope_dimension, scopeValue: r.scope_value });
    grantsByActor.set(r.user_id, list);
  }
  for (const actorId of panelActorIds) {
    const grants = grantsByActor.get(actorId) ?? [];
    const ok = hasPermission(grants, APPEAL_VOTE_PERMISSION_KEY, { dimension: 'pariwar', value: pariwarId, pariwarId });
    if (!ok) throw new AppealPanelMemberUnauthorizedError(actorId);
  }
}

/** True iff `actorId` holds the Stage-3-tier `claim.appeal_final` key @ this Pariwar (the "elevated" cancel
 *  authority once a session has live votes, 6.16 review). */
async function holdsAppealFinal(client: pg.PoolClient, pariwarId: PariwarId, actorId: string): Promise<boolean> {
  const res = await client.query<{
    role: string;
    scope_dimension: EffectiveGrant['scopeDimension'];
    scope_value: string | null;
  }>(`SELECT role, scope_dimension, scope_value FROM role_grants WHERE user_id = $1`, [actorId]);
  const grants: EffectiveGrant[] = res.rows.map((r) => ({
    pariwarId,
    role: r.role,
    scopeDimension: r.scope_dimension,
    scopeValue: r.scope_value,
  }));
  return hasPermission(grants, APPEAL_FINAL_PERMISSION_KEY, { dimension: 'pariwar', value: pariwarId, pariwarId });
}

// ── Inputs / results ──────────────────────────────────────────────────────────

interface PanelWriteBase {
  claimCaseId: ClaimId;
  pariwarId: PariwarId;
  actorId: string;
  /** The R5 decision-time display SNAPSHOT — ALREADY RESOLVED server-side, non-empty. */
  actorDisplay: string;
  /** Who caused the event (`trustee` for this surface). */
  actor: ClaimEventActor;
  auditId?: string;
}

export interface OpenAppealPanelInput extends PanelWriteBase {
  /** The immutable panel roster — de-duplicated to MINIMUM 2 members; each holds claim.appeal_vote @ pariwar. */
  panelActorIds: readonly string[];
}

export interface CastAppealVoteInput extends PanelWriteBase {
  vote: AppealPanelVote;
  rationaleCiphertext: PreparedAppealCiphertext;
}

export interface FinalizeAppealPanelInput extends PanelWriteBase {
  /** The mandatory rationale for the finalize decision-metadata row (Tier-1, branded). */
  rationaleCiphertext: PreparedAppealCiphertext;
  /** The disposition tag — required iff the tally reverses; ignored on advance (D-A). */
  dispositionCategory: AppealDispositionCategory | null;
}

export interface CancelAppealPanelInput extends PanelWriteBase {
  reasonCode?: string | null;
}

export interface AppealPanelSessionResult {
  session: ClaimAppealPanelSessionRow;
  /** The appended claim.appeal_stage2_initiated event version (open only; null for cancel). */
  eventVersion: number | null;
}

export interface AppealPanelVoteResult {
  vote: ClaimAppealPanelVoteRow;
  revised: boolean;
}

export interface AppealPanelFinalizeResult {
  session: ClaimAppealPanelSessionRow;
  decision: ClaimAppealDecisionRow;
  /** The claim's lifecycle state AFTER finalize (reversed → reversed; advance → appeal_stage_3). */
  claimState: string;
  /** The appended claim.appeal_stage2_reviewed event version (null on an idempotent replay). */
  eventVersion: number | null;
  /** The appended claim.reversed hook version (only when the panel reverses; null otherwise). */
  reversedEventVersion: number | null;
  /** True when this reflects a re-finalize of an already-finalized session (idempotent short-circuit). */
  idempotentReplay: boolean;
}

// ── Open (capture the immutable panel, emit the initiated marker, AC3) ─────────

/**
 * Open a Stage-2 appeal panel (AC3). In one scope-tx under the advisory lock: confirm the claim exists + is
 * at `appeal_stage_2` + has NO live session, capture + authorize the IMMUTABLE roster (MINIMUM 2, D-B),
 * snapshot quorum, insert the session, and emit the `claim.appeal_stage2_initiated` IDENTITY marker (the panel
 * formally convenes — the state was already entered by Stage 1's advance).
 */
export async function openAppealPanel(
  client: pg.PoolClient,
  input: OpenAppealPanelInput,
): Promise<AppealPanelSessionResult> {
  await acquireAppealLock(client, input.pariwarId, input.claimCaseId);
  const db = bindScopedDb(client);

  const claimRow = await lockClaim(db, input.pariwarId, input.claimCaseId);
  if (!claimRow) throw new AppealPanelClaimNotFoundError(input.claimCaseId);
  if (claimRow.currentState !== 'appeal_stage_2') {
    throw new AppealPanelClaimNotInStage2Error(input.claimCaseId, claimRow.currentState);
  }
  if (await liveSession(db, input.pariwarId, input.claimCaseId)) {
    throw new AppealPanelSessionExistsError(input.claimCaseId);
  }

  // De-duplicate the roster FIRST (a duplicate would inflate the panel-size denominator N). Enforce the D-B
  // minimum of 2 + the ceiling.
  const panelActorIds = [...new Set(input.panelActorIds)];
  if (panelActorIds.length < APPEAL_PANEL_MIN_MEMBERS) throw new AppealPanelTooSmallError(panelActorIds.length);
  if (panelActorIds.length > APPEAL_PANEL_MAX_MEMBERS) throw new AppealPanelTooLargeError(panelActorIds.length);
  const quorumRequired = appealQuorumFor(panelActorIds.length);

  await assertPanelAuthorized(client, input.pariwarId, panelActorIds);

  let session: ClaimAppealPanelSessionRow;
  try {
    const rows = await db
      .insert(claimAppealPanelSessions)
      .values({
        claimCaseId: input.claimCaseId,
        pariwarId: input.pariwarId,
        panelActorIds,
        quorumRequired,
        openedByActor: input.actorId,
        openedDisplay: input.actorDisplay,
      })
      .returning();
    session = rows[0]!;
  } catch (err) {
    if (isUniqueViolation(err)) throw new AppealPanelSessionExistsError(input.claimCaseId);
    throw err;
  }

  // Emit the identity formal-filing marker (the panel convenes; state unchanged — appeal_stage_2 → appeal_stage_2).
  const projected = await projectClaimState(client, {
    claimCaseId: input.claimCaseId,
    pariwarId: input.pariwarId,
    deceasedMemberId: claimRow.deceasedMemberId,
    intakeChannels: claimRow.intakeChannels,
    claimantActorId: claimRow.claimantActorId,
    eventType: 'claim.appeal_stage2_initiated',
    payload: {
      from_state: 'appeal_stage_2',
      to_state: 'appeal_stage_2',
      trigger: 'appeal_stage2_panel_convene',
      actor: input.actor,
    },
    actorId: input.actorId,
    ...(input.auditId !== undefined ? { auditId: input.auditId } : {}),
  });

  return { session, eventVersion: projected.eventVersion };
}

// ── Cast / revise a vote (panel-member-only, metadata-only, AC3) ──────────────

/**
 * Cast (or revise) an individual Stage-2 vote (AC3). METADATA-ONLY — no lifecycle event. Panel-membership
 * BEFORE finalized-status (a non-panel actor is never told whether the session is finalized). Atomic
 * supersede-then-insert of the voter's prior live vote (revision — 0-row ⇒ 409).
 */
export async function castAppealVote(client: pg.PoolClient, input: CastAppealVoteInput): Promise<AppealPanelVoteResult> {
  await acquireAppealLock(client, input.pariwarId, input.claimCaseId);
  const db = bindScopedDb(client);

  const session = await liveSession(db, input.pariwarId, input.claimCaseId);
  if (!session) throw new AppealPanelNoLiveSessionError(input.claimCaseId);
  if (!session.panelActorIds.includes(input.actorId)) throw new AppealPanelActorNotOnPanelError(input.actorId);
  if (session.outcome !== null) throw new AppealPanelSessionFinalizedError(input.claimCaseId);

  const priorLive = (
    await db
      .select({ voteId: claimAppealPanelVotes.voteId })
      .from(claimAppealPanelVotes)
      .where(
        and(
          eq(claimAppealPanelVotes.sessionId, session.sessionId),
          eq(claimAppealPanelVotes.voterActorId, input.actorId),
          isNull(claimAppealPanelVotes.supersededAt),
        ),
      )
      .limit(1)
  )[0];

  let supersedesVoteId: ClaimAppealPanelVoteRow['voteId'] | null = null;
  if (priorLive) {
    const superseded = await db
      .update(claimAppealPanelVotes)
      .set({ supersededAt: sql`now()` })
      .where(and(eq(claimAppealPanelVotes.voteId, priorLive.voteId), isNull(claimAppealPanelVotes.supersededAt)))
      .returning({ voteId: claimAppealPanelVotes.voteId });
    if (superseded.length === 0) throw new AppealPanelVoteRevisionConflictError(input.actorId);
    supersedesVoteId = priorLive.voteId;
  }

  let vote: ClaimAppealPanelVoteRow;
  try {
    const rows = await db
      .insert(claimAppealPanelVotes)
      .values({
        sessionId: session.sessionId,
        claimCaseId: input.claimCaseId,
        pariwarId: input.pariwarId,
        voterActorId: input.actorId,
        voterDisplay: input.actorDisplay,
        vote: input.vote,
        rationaleCiphertext: input.rationaleCiphertext,
        supersedesVoteId,
      })
      .returning();
    vote = rows[0]!;
  } catch (err) {
    if (isUniqueViolation(err)) throw new AppealPanelVoteConflictError(input.actorId);
    throw err;
  }
  return { vote, revised: supersedesVoteId !== null };
}

// ── Finalize (the sole lifecycle-changing verb, AC3) ──────────────────────────

/**
 * Finalize the Stage-2 panel outcome (AC3). In one scope-tx under the advisory lock: re-check the outcome
 * short-circuit (idempotent replay), reject a missing/finalized session, confirm the finalizer is a panel
 * member, LOCK the live vote rows FOR UPDATE (vote_id order), gate on quorum, apply the FROZEN tie rule
 * (`computeAppealOutcome`), then write — atomically — the session outcome + the `claim.appeal_stage2_reviewed`
 * event (+ `claim.reversed` on a reverse) + a claim_appeal_decisions(stage=2) uniform-audit row. A reverse
 * → `reversed`; a tie / any quorum-met sub-majority → `advance` → `appeal_stage_3` + anchor stage='3'.
 */
export async function finalizeAppealOutcome(
  client: pg.PoolClient,
  input: FinalizeAppealPanelInput,
): Promise<AppealPanelFinalizeResult> {
  await acquireAppealLock(client, input.pariwarId, input.claimCaseId);
  const db = bindScopedDb(client);

  const claimRow = await lockClaim(db, input.pariwarId, input.claimCaseId);
  if (!claimRow) throw new AppealPanelClaimNotFoundError(input.claimCaseId);

  const session = await liveSession(db, input.pariwarId, input.claimCaseId);
  if (!session) throw new AppealPanelNoLiveSessionError(input.claimCaseId);
  // Panel-membership BEFORE the idempotency short-circuit (the r9 finalize ordering lesson).
  if (!session.panelActorIds.includes(input.actorId)) throw new AppealPanelActorNotOnPanelError(input.actorId);

  // Idempotent short-circuit — an already-finalized session returns its recorded state WITHOUT re-emitting.
  if (session.outcome !== null) {
    // Return the existing stage-2 decision row for the uniform result shape.
    const existing = await db
      .select()
      .from(claimAppealDecisions)
      .where(
        and(
          eq(claimAppealDecisions.pariwarId, input.pariwarId),
          eq(claimAppealDecisions.claimCaseId, input.claimCaseId),
          eq(claimAppealDecisions.stage, '2'),
          isNull(claimAppealDecisions.supersededAt),
        ),
      )
      .limit(1);
    return {
      session,
      decision: existing[0]!,
      claimState: claimRow.currentState,
      eventVersion: null,
      reversedEventVersion: null,
      idempotentReplay: true,
    };
  }

  // The claim must STILL be at appeal_stage_2 (some other path could have moved it — finalizing anyway would
  // silently no-op the reducer while irreversibly persisting the outcome).
  if (claimRow.currentState !== 'appeal_stage_2') {
    throw new AppealPanelClaimNotInStage2Error(input.claimCaseId, claimRow.currentState);
  }

  // Lock the live votes FOR UPDATE in a deterministic order BEFORE tallying.
  const liveVotes = await db
    .select({ voteId: claimAppealPanelVotes.voteId, vote: claimAppealPanelVotes.vote })
    .from(claimAppealPanelVotes)
    .where(and(eq(claimAppealPanelVotes.sessionId, session.sessionId), isNull(claimAppealPanelVotes.supersededAt)))
    .orderBy(asc(claimAppealPanelVotes.voteId))
    .for('update');

  if (liveVotes.length < session.quorumRequired) {
    throw new AppealPanelQuorumNotMetError(liveVotes.length, session.quorumRequired);
  }

  const panelSize = session.panelActorIds.length;
  const { outcome, reverse_count, deny_count } = computeAppealOutcome(liveVotes, panelSize);
  const reverses = outcome === 'reversed';
  if (reverses && input.dispositionCategory == null) throw new AppealPanelDispositionRequiredError();
  // Defense-in-depth symmetric with Stage-1/3's assertDisposition (D-A): a disposition_category must NOT be
  // supplied on a non-reversing outcome either — reject rather than silently discard it (6.16 review finding).
  if (!reverses && input.dispositionCategory != null) {
    throw new AppealDispositionCategoryError('unexpected_on_non_reversed', outcome);
  }

  // (a) Persist the outcome onto the session row (0 rows ⇒ a concurrent finalize won ⇒ typed 409).
  const updatedRows = await db
    .update(claimAppealPanelSessions)
    .set({
      outcome,
      reverseCount: reverse_count,
      denyCount: deny_count,
      finalizedByActor: input.actorId,
      finalizedDisplay: input.actorDisplay,
      finalizedAt: sql`now()`,
    })
    .where(and(eq(claimAppealPanelSessions.sessionId, session.sessionId), isNull(claimAppealPanelSessions.outcome)))
    .returning();
  if (updatedRows.length === 0) throw new AppealPanelSessionFinalizedError(input.claimCaseId);
  const finalizedSession = updatedRows[0]!;

  // (b) Emit the reviewed transition (reversed → reversed; advance → appeal_stage_3).
  const toState = reverses ? 'reversed' : 'appeal_stage_3';
  const reviewDecision = reverses ? 'reversed' : 'advance';
  const projected = await projectClaimState(client, {
    claimCaseId: input.claimCaseId,
    pariwarId: input.pariwarId,
    deceasedMemberId: claimRow.deceasedMemberId,
    intakeChannels: claimRow.intakeChannels,
    claimantActorId: claimRow.claimantActorId,
    eventType: 'claim.appeal_stage2_reviewed',
    payload: {
      from_state: 'appeal_stage_2',
      to_state: toState,
      trigger: reverses ? 'appeal_stage2_panel_reverse' : 'appeal_stage2_panel_advance',
      actor: input.actor,
      decision: reviewDecision,
    },
    actorId: input.actorId,
    ...(input.auditId !== undefined ? { auditId: input.auditId } : {}),
  });

  // (c) On a reverse, emit the claim.reversed publish hook (D-A) + close the anchor; on advance, advance the
  //     anchor stage.
  let reversedEventVersion: number | null = null;
  if (reverses) {
    const rev = await projectClaimState(client, {
      claimCaseId: input.claimCaseId,
      pariwarId: input.pariwarId,
      deceasedMemberId: claimRow.deceasedMemberId,
      intakeChannels: claimRow.intakeChannels,
      claimantActorId: claimRow.claimantActorId,
      eventType: 'claim.reversed',
      payload: {
        from_state: 'reversed',
        to_state: 'reversed',
        trigger: 'appeal_stage2_reverse_publish_hook',
        actor: input.actor,
        reversed_at_stage: 2,
        disposition_category: input.dispositionCategory!,
      },
      actorId: input.actorId,
      ...(input.auditId !== undefined ? { auditId: input.auditId } : {}),
    });
    reversedEventVersion = rev.eventVersion;
    await db
      .update(claimAppeals)
      .set({ status: 'reversed', updatedAt: sql`now()` })
      .where(and(eq(claimAppeals.pariwarId, input.pariwarId), eq(claimAppeals.claimCaseId, input.claimCaseId)));
  } else {
    await db
      .update(claimAppeals)
      .set({ currentStage: '3', updatedAt: sql`now()` })
      .where(and(eq(claimAppeals.pariwarId, input.pariwarId), eq(claimAppeals.claimCaseId, input.claimCaseId)));
  }

  // (d) Insert the stage-2 decision-metadata row (uniform audit alongside the panel session).
  const decisionRows = await db
    .insert(claimAppealDecisions)
    .values({
      claimCaseId: input.claimCaseId,
      pariwarId: input.pariwarId,
      stage: '2',
      decision: reverses ? 'reversed' : 'advance',
      dispositionCategory: reverses ? input.dispositionCategory : null,
      rationaleCiphertext: input.rationaleCiphertext,
      reviewerActorId: input.actorId,
      reviewerDisplay: input.actorDisplay,
    })
    .returning();

  return {
    session: finalizedSession,
    decision: decisionRows[0]!,
    claimState: projected.state,
    eventVersion: projected.eventVersion,
    reversedEventVersion,
    idempotentReplay: false,
  };
}

// ── Cancel (correction path, metadata-only, AC3) ──────────────────────────────

/**
 * Cancel a Stage-2 appeal panel session (AC3). METADATA-ONLY — no lifecycle event. Supersede the session +
 * all its live votes. Fail-closed on a missing / already-finalized session.
 */
export async function cancelAppealPanel(
  client: pg.PoolClient,
  input: CancelAppealPanelInput,
): Promise<AppealPanelSessionResult> {
  await acquireAppealLock(client, input.pariwarId, input.claimCaseId);
  const db = bindScopedDb(client);

  const session = await liveSession(db, input.pariwarId, input.claimCaseId);
  if (!session) {
    if (await hasAnySession(db, input.pariwarId, input.claimCaseId)) {
      throw new AppealPanelSessionAlreadySupersededError(input.claimCaseId);
    }
    throw new AppealPanelNoLiveSessionError(input.claimCaseId);
  }
  if (!session.panelActorIds.includes(input.actorId)) throw new AppealPanelActorNotOnPanelError(input.actorId);
  if (session.outcome !== null) throw new AppealPanelSessionFinalizedError(input.claimCaseId);

  // Once votes have been cast, an ordinary panel member may no longer unilaterally discard them — cancelling
  // requires the elevated (Stage-3-tier) claim.appeal_final key. A session with NO live votes yet (e.g. a
  // wrong roster caught before voting begins) stays open to any panel member (6.16 review finding).
  const liveVoteCountRows = await db
    .select({ voteId: claimAppealPanelVotes.voteId })
    .from(claimAppealPanelVotes)
    .where(and(eq(claimAppealPanelVotes.sessionId, session.sessionId), isNull(claimAppealPanelVotes.supersededAt)));
  if (liveVoteCountRows.length > 0 && !(await holdsAppealFinal(client, input.pariwarId, input.actorId))) {
    throw new AppealPanelCancelUnauthorizedError(input.actorId);
  }

  const superseded = await db
    .update(claimAppealPanelSessions)
    .set({ supersededAt: sql`now()` })
    .where(and(eq(claimAppealPanelSessions.sessionId, session.sessionId), isNull(claimAppealPanelSessions.supersededAt)))
    .returning();
  if (superseded.length === 0) throw new AppealPanelSessionAlreadySupersededError(input.claimCaseId);

  await db
    .update(claimAppealPanelVotes)
    .set({ supersededAt: sql`now()` })
    .where(and(eq(claimAppealPanelVotes.sessionId, session.sessionId), isNull(claimAppealPanelVotes.supersededAt)));

  return { session: superseded[0]!, eventVersion: null };
}
