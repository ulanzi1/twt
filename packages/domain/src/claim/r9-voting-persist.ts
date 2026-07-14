// R9 special-case voting persistence writers — Story 6.14 (Task 4, domain side). Transport-free.
//
// The four atomic write paths the R9 voting surface drives, each DB WORK ONLY (encryption + audit + the
// step-up gate are the ROUTE's job):
//   · openR9VotingSession  — open the panel (AC2). METADATA-ONLY: snapshots the applicable R9 sub-clause +
//     clause_version_id from the registry, captures + validates the IMMUTABLE panel roster (each member
//     holds claim.r9_vote @ pariwar), snapshots quorum_required, inserts the session row. NO lifecycle event.
//   · castR9Vote           — cast/revise an individual vote (AC3). METADATA-ONLY: voter must be a panel
//     member; atomic supersede-then-insert of the voter's prior live vote (revision); copies the session's
//     clause_version_id. NO lifecycle event. Revisable until finalize (reaching quorum does NOT auto-lock).
//   · finalizeR9Outcome    — the SOLE lifecycle-changing verb (AC0/AC4). Under the per-claim advisory lock:
//     re-checks the outcome short-circuit (idempotent), locks the live vote rows FOR UPDATE (vote_id order),
//     gates on quorum, computes the DATA-driven outcome against the PANEL SIZE, then writes — in ONE
//     scope-tx — the session outcome + the claim.r9_outcome event (via projectClaimState, the LIFECYCLE
//     authority) + the routed_to_r9 supersession + a claim_state_trustee_decisions phase='r9_outcome' row.
//   · cancelR9VotingSession — the correction path (AC5). METADATA-ONLY: supersedes the session AND all its
//     live votes; the routed_to_r9 row STAYS live so a corrected session can re-open. NO lifecycle event.
//
// The two-authority WRITE (AC0): ONLY finalize is lifecycle-changing — it writes BOTH the claim.r9_outcome
// event (via projectClaimState — the sole claims.current_state writer) AND the session/decision metadata in
// ONE scope-tx so they can never diverge. Claim STATE is ALWAYS derived from event replay, NEVER from the
// session/vote rows. open/vote/cancel invent no lifecycle event (the reducer stays TOTAL — no precondition
// lands in state.ts; every "is this votable/finalizable" guard lives here).
//
// CONCURRENCY (AC9): every verb first takes a transaction-scoped advisory lock on (pariwarId, claimCaseId)
// (a DISTINCT namespace prefix `r9_voting:` from the verifier/cycle-freeze locks) so votes + finalize +
// cancel serialize; finalize additionally locks the live vote rows FOR UPDATE (deterministic vote_id order)
// so a tally cannot race a cast/revise; the write-path state guards + the events_log (stream_id,
// event_version) unique index + the two partial-uniques are the structural backstops.
//
// PII: the per-vote rationale is ALREADY ENCRYPTED by the CALLER (the route encrypts before the writer). The
// R5 display snapshots (opened_display / voter_display / finalized_display) are ALREADY RESOLVED by the
// caller server-side — non-empty; the writer never resolves them and never falls back.
//
// The write-path guards live here (the reducer stays TOTAL). NOT surfaced at the top-level barrel (claim
// namespace only); the route maps these typed errors to stable 4xx codes.

import { createHash } from 'node:crypto';

import { and, asc, eq, isNull, sql } from 'drizzle-orm';
import type pg from 'pg';

import { bindScopedDb, type Db } from '../db.js';
import { clauseId as toClauseId, type ClaimId, type PariwarId } from '../ids/index.js';
import { hasPermission, type EffectiveGrant } from '../rbac/index.js';
import { claims } from '../schema/claims.js';
import { type ClaimR9VoteRow, claimR9Votes } from '../schema/claim_r9_votes.js';
import { type ClaimR9VotingSessionRow, claimR9VotingSessions } from '../schema/claim_r9_voting_sessions.js';
import { claimStateTrusteeDecisions } from '../schema/claim_state_trustee_decisions.js';
import { type ClaimEventActor } from './events.js';
import { projectClaimState } from './project.js';
import { R9_OUTCOME_FROM_STATES } from './state.js';
import {
  computeR9Outcome,
  deriveVotingRequirement,
  isR9VotingClauseId,
  type PreparedR9VoteCiphertext,
  R9_PANEL_MAX_MEMBERS,
  r9QuorumFor,
  type R9Vote,
} from './r9-voting.js';
import { resolveByClauseId } from '../niyamavali/read.js';

/** The RBAC key each panel member must hold @ pariwar (validated at open, AC2). */
const R9_VOTE_PERMISSION_KEY = 'claim.r9_vote';

// ── Typed write-path guards (the route maps each to a stable 4xx) ─────────────

/** Thrown when no claim row exists for the id the writer targets (tenant-scoped miss → 404). */
export class R9ClaimNotFoundError extends Error {
  public readonly name = 'R9ClaimNotFoundError';
  public constructor(public readonly claimCaseId: string) {
    super(`[r9-voting] no claim found for id ${claimCaseId} in scope`);
  }
}

/** Thrown by open when the claim carries NO live routed_to_r9 row — it is not in the R9 queue (AC2 → 409). */
export class R9ClaimNotRoutedError extends Error {
  public readonly name = 'R9ClaimNotRoutedError';
  public constructor(public readonly claimCaseId: string) {
    super(`[r9-voting] claim ${claimCaseId} carries no live route-to-R9 row — not in the R9 voting queue`);
  }
}

/** Thrown by open when a non-superseded session already exists for the claim (open OR finalized, AC2 → 409). */
export class R9SessionExistsError extends Error {
  public readonly name = 'R9SessionExistsError';
  public constructor(public readonly claimCaseId: string) {
    super(`[r9-voting] claim ${claimCaseId} already has a live (non-superseded) R9 voting session — cannot open another`);
  }
}

/** Thrown by open when the selected clause is not one of the three R9-voting clauses (AC2 → 400). */
export class R9ClauseNotVotableError extends Error {
  public readonly name = 'R9ClauseNotVotableError';
  public constructor(public readonly clauseId: string) {
    super(`[r9-voting] clause '${clauseId}' is not an R9-voting (route_r9_voting) clause`);
  }
}

/** Thrown by open when the selected clause has no resolvable effective registry version (AC2 → 422). */
export class R9ClauseUnresolvableError extends Error {
  public readonly name = 'R9ClauseUnresolvableError';
  public constructor(public readonly clauseId: string) {
    super(`[r9-voting] clause '${clauseId}' has no effective, non-deprecated version in this Pariwar`);
  }
}

/** Thrown by open when the resolved clause version's payload carries no `rule_code` (a registry data-shape
 *  gap) — never silently falls back to the internal clause id, which would leak an implementation detail
 *  onto the audit-facing `rule_code` display field (AC2 → 422). */
export class R9ClauseRuleCodeMissingError extends Error {
  public readonly name = 'R9ClauseRuleCodeMissingError';
  public constructor(
    public readonly clauseId: string,
    public readonly clauseVersionId: string,
  ) {
    super(`[r9-voting] clause '${clauseId}' version '${clauseVersionId}' payload carries no 'rule_code'`);
  }
}

/** Thrown by open when the panel roster is empty (AC2 → 400). */
export class R9PanelEmptyError extends Error {
  public readonly name = 'R9PanelEmptyError';
  public constructor() {
    super(`[r9-voting] the panel roster must contain at least one actor`);
  }
}

/** Thrown by open when the (de-duplicated) panel roster exceeds `R9_PANEL_MAX_MEMBERS` (AC2 → 400).
 *  Domain-layer defense-in-depth — the same ceiling the `@twt/contracts` schema enforces at the transport
 *  edge, mirrored here so a non-route caller of this write-path cannot bypass it. */
export class R9PanelTooLargeError extends Error {
  public readonly name = 'R9PanelTooLargeError';
  public constructor(public readonly size: number) {
    super(`[r9-voting] panel roster of ${size} actors exceeds the ${R9_PANEL_MAX_MEMBERS}-member ceiling`);
  }
}

/** Thrown by open when a designated panel member does NOT hold claim.r9_vote @ this Pariwar (AC2 → 403). */
export class R9PanelMemberUnauthorizedError extends Error {
  public readonly name = 'R9PanelMemberUnauthorizedError';
  public constructor(public readonly actorId: string) {
    super(`[r9-voting] panel member ${actorId} does not hold ${R9_VOTE_PERMISSION_KEY} in this Pariwar`);
  }
}

/** Thrown by vote/finalize/cancel when the claim has no live (non-superseded) session (→ 409). */
export class R9NoLiveSessionError extends Error {
  public readonly name = 'R9NoLiveSessionError';
  public constructor(public readonly claimCaseId: string) {
    super(`[r9-voting] claim ${claimCaseId} has no live R9 voting session`);
  }
}

/** Thrown by finalize when the claim's `currentState` has drifted outside `R9_OUTCOME_FROM_STATES` since
 *  routing (some OTHER write path moved it without checking for a live routed_to_r9 row, unlike
 *  `voteOnFrozenClaim`/`commitCycleFreeze`) — finalizing anyway would silently no-op the reducer (identity)
 *  while irreversibly persisting the session outcome, a permanent divergence (→ 409). */
export class R9ClaimNoLongerRoutableError extends Error {
  public readonly name = 'R9ClaimNoLongerRoutableError';
  public constructor(
    public readonly claimCaseId: string,
    public readonly currentState: string,
  ) {
    super(
      `[r9-voting] claim ${claimCaseId} is no longer in a routable state (currentState='${currentState}') — ` +
        `finalizing now would silently diverge the session outcome from the claim's actual lifecycle state`,
    );
  }
}

/** Thrown by vote when the session is already finalized (voting is illegal post-finalize, AC3 → 409). */
export class R9SessionFinalizedError extends Error {
  public readonly name = 'R9SessionFinalizedError';
  public constructor(public readonly claimCaseId: string) {
    super(`[r9-voting] claim ${claimCaseId}'s R9 session is finalized — voting/cancel is no longer permitted`);
  }
}

/** Thrown by vote/finalize when the actor is not a member of the session's immutable panel (AC3/AC4 → 403). */
export class R9ActorNotOnPanelError extends Error {
  public readonly name = 'R9ActorNotOnPanelError';
  public constructor(public readonly actorId: string) {
    super(`[r9-voting] actor ${actorId} is not a member of this R9 voting panel`);
  }
}

/** Thrown by vote when the rationale ciphertext is absent (AC3 defense-in-depth behind the contract → 400). */
export class R9RationaleRequiredError extends Error {
  public readonly name = 'R9RationaleRequiredError';
  public constructor() {
    super(`[r9-voting] a rationale is required for every vote`);
  }
}

/** Thrown when a concurrent revise already superseded the voter's live vote (0-row UPDATE → 409). */
export class R9VoteRevisionConflictError extends Error {
  public readonly name = 'R9VoteRevisionConflictError';
  public constructor(public readonly voterActorId: string) {
    super(`[r9-voting] vote revision for ${voterActorId} lost a concurrent race — reload and try again`);
  }
}

/** Thrown when a live vote already exists for the (session, voter) — partial-unique 23505 → 409. */
export class R9VoteConflictError extends Error {
  public readonly name = 'R9VoteConflictError';
  public constructor(public readonly voterActorId: string) {
    super(`[r9-voting] a live vote already exists for ${voterActorId} in this session`);
  }
}

/** Thrown by finalize when the number of cast live votes is below the snapshotted quorum (AC4 → 409). */
export class R9QuorumNotMetError extends Error {
  public readonly name = 'R9QuorumNotMetError';
  public constructor(
    public readonly castVotes: number,
    public readonly quorumRequired: number,
  ) {
    super(`[r9-voting] finalize blocked: ${castVotes} cast vote(s) below the required quorum of ${quorumRequired}`);
  }
}

/** Thrown by cancel when the session is already superseded (409). */
export class R9SessionAlreadySupersededError extends Error {
  public readonly name = 'R9SessionAlreadySupersededError';
  public constructor(public readonly claimCaseId: string) {
    super(`[r9-voting] claim ${claimCaseId}'s R9 session was already cancelled — reload and try again`);
  }
}

/** True iff `err` (or its wrapped cause) is a Postgres unique-violation (23505). */
function isUniqueViolation(err: unknown): boolean {
  const direct = (err as { code?: string }).code;
  const cause = (err as { cause?: { code?: string } }).cause?.code;
  return direct === '23505' || cause === '23505';
}

// ── Advisory lock + row-lock helpers ──────────────────────────────────────────

/**
 * The transaction-scoped advisory-lock key for one claim's R9 voting action (AC9). A DISTINCT namespace
 * prefix (`r9_voting:`) from the verifier / cycle-freeze locks so the three never collide on one claim.
 */
export function r9VotingAdvisoryLockKey(pariwarId: string, claimCaseId: string): bigint {
  const hex = createHash('sha256').update(`r9_voting:${pariwarId}:${claimCaseId}`).digest('hex');
  return BigInt(`0x${hex.slice(0, 15)}`);
}

async function acquireR9Lock(client: pg.PoolClient, pariwarId: PariwarId, claimCaseId: ClaimId): Promise<void> {
  await client.query('SELECT pg_advisory_xact_lock($1)', [r9VotingAdvisoryLockKey(pariwarId, claimCaseId).toString()]);
}

/** Lock the claim row (`SELECT … FOR UPDATE`) to serialize concurrent edits + read its state/provenance. */
async function lockClaim(db: Db, pariwarId: PariwarId, claimCaseId: ClaimId) {
  const rows = await db
    .select()
    .from(claims)
    .where(and(eq(claims.pariwarId, pariwarId), eq(claims.claimCaseId, claimCaseId)))
    .for('update');
  return rows[0];
}

/** True iff `claimCaseId` carries a LIVE (non-superseded) routed_to_r9 decision row — the R9 queue predicate. */
async function hasLiveRoutedRow(db: Db, pariwarId: PariwarId, claimCaseId: ClaimId): Promise<boolean> {
  const rows = await db
    .select({ claimCaseId: claimStateTrusteeDecisions.claimCaseId })
    .from(claimStateTrusteeDecisions)
    .where(
      and(
        eq(claimStateTrusteeDecisions.pariwarId, pariwarId),
        eq(claimStateTrusteeDecisions.claimCaseId, claimCaseId),
        eq(claimStateTrusteeDecisions.phase, 'routing'),
        eq(claimStateTrusteeDecisions.outcome, 'routed_to_r9'),
        isNull(claimStateTrusteeDecisions.supersededAt),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

/** The claim's live (non-superseded) session, or undefined. Read under the caller's advisory lock. */
async function liveSession(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
): Promise<ClaimR9VotingSessionRow | undefined> {
  const rows = await db
    .select()
    .from(claimR9VotingSessions)
    .where(
      and(
        eq(claimR9VotingSessions.pariwarId, pariwarId),
        eq(claimR9VotingSessions.claimCaseId, claimCaseId),
        isNull(claimR9VotingSessions.supersededAt),
      ),
    )
    .limit(1);
  return rows[0];
}

/** True iff `claimCaseId` carries ANY session (live or superseded) — used to distinguish "never had a
 *  session" (`R9NoLiveSessionError`) from "had one, already cancelled" (`R9SessionAlreadySupersededError`)
 *  in cancel's up-front, non-race check. */
async function hasAnySession(db: Db, pariwarId: PariwarId, claimCaseId: ClaimId): Promise<boolean> {
  const rows = await db
    .select({ sessionId: claimR9VotingSessions.sessionId })
    .from(claimR9VotingSessions)
    .where(and(eq(claimR9VotingSessions.pariwarId, pariwarId), eq(claimR9VotingSessions.claimCaseId, claimCaseId)))
    .limit(1);
  return rows.length > 0;
}

/**
 * Validate EVERY panel member holds `claim.r9_vote` @ this Pariwar (AC2). Loads each actor's grants from
 * `role_grants` on the SCOPED client (RLS returns only this Pariwar's grants — same source as the route's
 * `loadActorGrants`) and runs the PURE domain `hasPermission` predicate over the seeded bundles (matching
 * the route gate's authorization semantics). Fail-closed on the FIRST unauthorized member.
 */
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
  }>(
    `SELECT user_id, pariwar_id, role, scope_dimension, scope_value FROM role_grants WHERE user_id = ANY($1)`,
    [[...panelActorIds]],
  );
  const grantsByActor = new Map<string, EffectiveGrant[]>();
  for (const r of res.rows) {
    const list = grantsByActor.get(r.user_id) ?? [];
    list.push({ pariwarId: r.pariwar_id, role: r.role, scopeDimension: r.scope_dimension, scopeValue: r.scope_value });
    grantsByActor.set(r.user_id, list);
  }
  for (const actorId of panelActorIds) {
    const grants = grantsByActor.get(actorId) ?? [];
    const ok = hasPermission(grants, R9_VOTE_PERMISSION_KEY, {
      dimension: 'pariwar',
      value: pariwarId,
      pariwarId,
    });
    if (!ok) throw new R9PanelMemberUnauthorizedError(actorId);
  }
}

// ── Inputs / results ──────────────────────────────────────────────────────────

interface R9WriteBase {
  claimCaseId: ClaimId;
  pariwarId: PariwarId;
  /** The acting trustee's actor id (audit; non-PII query/join key). */
  actorId: string;
  /** The R5 decision-time display SNAPSHOT — ALREADY RESOLVED server-side, non-empty. */
  actorDisplay: string;
  /** Who caused the event (`trustee` for this surface). */
  actor: ClaimEventActor;
  auditId?: string;
}

export interface OpenR9VotingSessionInput extends R9WriteBase {
  /** The applicable R9 sub-clause id (manual v1 selection — must be one of the three route_r9_voting clauses). */
  clauseId: string;
  /** The immutable panel roster — non-empty; each member validated to hold claim.r9_vote @ pariwar (AC2). */
  panelActorIds: readonly string[];
}

export interface CastR9VoteInput extends R9WriteBase {
  /** The voter's vote. The voter is `actorId` (must be a panel member). */
  vote: R9Vote;
  /**
   * ALREADY-ENCRYPTED Tier-1 rationale ciphertext, branded via `prepareR9VoteCiphertext` (AC3). The brand is
   * a compile-time guarantee the caller validated the ≤500-char plaintext bound at the trusted
   * pre-encryption boundary (the contract superRefine) BEFORE encrypting — the domain layer never re-checks
   * that bound (structurally impossible post-encryption); it only enforces the SEPARATE storage-safety
   * ceiling inside `prepareR9VoteCiphertext`.
   */
  rationaleCiphertext: PreparedR9VoteCiphertext;
}

export interface CancelR9VotingSessionInput extends R9WriteBase {
  /** The cancel reason code (non-PII; audited by the route). v1 stores no cancel column — audit-retained only. */
  reasonCode?: string | null;
}

export interface R9SessionResult {
  session: ClaimR9VotingSessionRow;
}

export interface R9VoteResult {
  vote: ClaimR9VoteRow;
  /** True when this replaced the voter's prior live vote (a revision), false for a first vote. */
  revised: boolean;
}

export interface R9FinalizeResult {
  session: ClaimR9VotingSessionRow;
  /** The claim's lifecycle state AFTER the finalize (approved → state_trustee_approved; denied → denied). */
  claimState: string;
  /** The appended claim.r9_outcome event version (null on an idempotent replay — nothing re-emitted). */
  eventVersion: number | null;
  /** True when this reflects a re-finalize of an already-finalized session (idempotent short-circuit). */
  idempotentReplay: boolean;
}

// ── Open (snapshot the clause + capture the immutable panel, metadata-only, AC2) ──

/**
 * Open an R9 voting session (AC2). In one scope-tx: advisory-lock the claim, confirm it exists + carries a
 * live routed_to_r9 row (it is in the queue) + has NO non-superseded session, validate the clause is an
 * R9-voting clause + resolvable, capture + authorize the IMMUTABLE panel roster, snapshot the clause
 * version + rule_code + derived voting_requirement + quorum_required, and insert the session row.
 * METADATA-ONLY — no lifecycle event (AC0). Takes a raw pg.PoolClient.
 */
export async function openR9VotingSession(
  client: pg.PoolClient,
  input: OpenR9VotingSessionInput,
): Promise<R9SessionResult> {
  if (!isR9VotingClauseId(input.clauseId)) throw new R9ClauseNotVotableError(input.clauseId);
  if (input.panelActorIds.length === 0) throw new R9PanelEmptyError();

  await acquireR9Lock(client, input.pariwarId, input.claimCaseId);
  const db = bindScopedDb(client);

  const claimRow = await lockClaim(db, input.pariwarId, input.claimCaseId);
  if (!claimRow) throw new R9ClaimNotFoundError(input.claimCaseId);

  if (!(await hasLiveRoutedRow(db, input.pariwarId, input.claimCaseId))) {
    throw new R9ClaimNotRoutedError(input.claimCaseId);
  }
  if (await liveSession(db, input.pariwarId, input.claimCaseId)) {
    throw new R9SessionExistsError(input.claimCaseId);
  }

  // Resolve the registry snapshot (DB-authoritative effective/non-deprecated latest version).
  const clauseVersion = await resolveByClauseId(db, input.pariwarId, toClauseId(input.clauseId));
  if (!clauseVersion) throw new R9ClauseUnresolvableError(input.clauseId);
  const votingRequirement = deriveVotingRequirement(clauseVersion.payload);
  if (typeof clauseVersion.payload['rule_code'] !== 'string') {
    throw new R9ClauseRuleCodeMissingError(input.clauseId, clauseVersion.clauseVersionId);
  }
  const ruleCode = clauseVersion.payload['rule_code'];

  // De-duplicate the roster FIRST (AC2) — a duplicate actor id would inflate the panel-size denominator N
  // used for quorum/threshold math while only one live vote per actor is structurally possible (the
  // partial-unique on (session_id, voter_actor_id)), making the true threshold unreachable or skewed.
  const panelActorIds = [...new Set(input.panelActorIds)];
  if (panelActorIds.length > R9_PANEL_MAX_MEMBERS) throw new R9PanelTooLargeError(panelActorIds.length);
  const quorumRequired = r9QuorumFor(panelActorIds.length);

  // Validate the immutable panel (every member holds claim.r9_vote @ pariwar) BEFORE the insert.
  await assertPanelAuthorized(client, input.pariwarId, panelActorIds);

  let session: ClaimR9VotingSessionRow;
  try {
    const rows = await db
      .insert(claimR9VotingSessions)
      .values({
        claimCaseId: input.claimCaseId,
        pariwarId: input.pariwarId,
        clauseId: input.clauseId,
        clauseVersionId: clauseVersion.clauseVersionId,
        ruleCode,
        votingRequirement,
        panelActorIds,
        quorumRequired,
        openedByActor: input.actorId,
        openedDisplay: input.actorDisplay,
      })
      .returning();
    session = rows[0]!;
  } catch (err) {
    if (isUniqueViolation(err)) throw new R9SessionExistsError(input.claimCaseId);
    throw err;
  }
  return { session };
}

// ── Cast / revise a vote (panel-member-only, metadata-only, AC3) ──────────────

/**
 * Cast (or revise) an individual R9 vote (AC3). In one scope-tx: advisory-lock the claim, load the live
 * session (reject if none / finalized), assert the voter is a panel member, atomically supersede the
 * voter's prior live vote (revision — 0-row conditional UPDATE ⇒ 409) then insert the new vote copying the
 * session's clause_version_id snapshot. METADATA-ONLY — no lifecycle event. Revisable until finalize.
 */
export async function castR9Vote(client: pg.PoolClient, input: CastR9VoteInput): Promise<R9VoteResult> {
  if (!input.rationaleCiphertext || input.rationaleCiphertext.trim() === '') throw new R9RationaleRequiredError();

  await acquireR9Lock(client, input.pariwarId, input.claimCaseId);
  const db = bindScopedDb(client);

  const session = await liveSession(db, input.pariwarId, input.claimCaseId);
  if (!session) throw new R9NoLiveSessionError(input.claimCaseId);
  // Panel-membership BEFORE finalized-status (an actor not on the panel is never told whether the session is
  // finalized — that would leak session state to someone not yet established as an eligible voter).
  if (!session.panelActorIds.includes(input.actorId)) throw new R9ActorNotOnPanelError(input.actorId);
  if (session.outcome !== null) throw new R9SessionFinalizedError(input.claimCaseId);

  // Atomic supersede-then-insert. Find the voter's prior live vote; if present, supersede it (0-row ⇒ a
  // concurrent revise already won ⇒ 409, the 6.11 reviseDecision precedent) and back-reference it.
  const priorLive = (
    await db
      .select({ voteId: claimR9Votes.voteId })
      .from(claimR9Votes)
      .where(
        and(
          eq(claimR9Votes.sessionId, session.sessionId),
          eq(claimR9Votes.voterActorId, input.actorId),
          isNull(claimR9Votes.supersededAt),
        ),
      )
      .limit(1)
  )[0];

  let supersedesVoteId: ClaimR9VoteRow['voteId'] | null = null;
  if (priorLive) {
    const superseded = await db
      .update(claimR9Votes)
      .set({ supersededAt: sql`now()` })
      .where(and(eq(claimR9Votes.voteId, priorLive.voteId), isNull(claimR9Votes.supersededAt)))
      .returning({ voteId: claimR9Votes.voteId });
    if (superseded.length === 0) throw new R9VoteRevisionConflictError(input.actorId);
    supersedesVoteId = priorLive.voteId;
  }

  let vote: ClaimR9VoteRow;
  try {
    const rows = await db
      .insert(claimR9Votes)
      .values({
        sessionId: session.sessionId,
        claimCaseId: input.claimCaseId,
        pariwarId: input.pariwarId,
        voterActorId: input.actorId,
        voterDisplay: input.actorDisplay,
        vote: input.vote,
        rationaleCiphertext: input.rationaleCiphertext,
        clauseVersionId: session.clauseVersionId,
        supersedesVoteId,
      })
      .returning();
    vote = rows[0]!;
  } catch (err) {
    if (isUniqueViolation(err)) throw new R9VoteConflictError(input.actorId);
    throw err;
  }
  return { vote, revised: supersedesVoteId !== null };
}

// ── Finalize (the sole lifecycle-changing verb, AC0/AC4) ──────────────────────

/**
 * Finalize the R9 panel outcome (AC0/AC4). In one scope-tx under the advisory lock: re-check the outcome
 * short-circuit (an already-finalized session returns the recorded outcome WITHOUT re-emitting — the
 * strengthened idempotency #7), reject a missing/superseded session (4xx), confirm the finalizer is a panel
 * member, LOCK the live vote rows FOR UPDATE in vote_id order (so a concurrent cast/revise cannot change
 * the count), gate on quorum, compute the DATA-driven outcome against the PANEL SIZE, then write — atomically
 * — the session outcome + the claim.r9_outcome event (via projectClaimState) + the routed_to_r9 supersession
 * + a claim_state_trustee_decisions phase='r9_outcome' row.
 */
export async function finalizeR9Outcome(client: pg.PoolClient, input: R9WriteBase): Promise<R9FinalizeResult> {
  await acquireR9Lock(client, input.pariwarId, input.claimCaseId);
  const db = bindScopedDb(client);

  const claimRow = await lockClaim(db, input.pariwarId, input.claimCaseId);
  if (!claimRow) throw new R9ClaimNotFoundError(input.claimCaseId);

  const session = await liveSession(db, input.pariwarId, input.claimCaseId);
  // A superseded (cancelled) session is excluded by liveSession → typed 4xx, NOT an idempotent success (AC4).
  if (!session) throw new R9NoLiveSessionError(input.claimCaseId);

  // Panel-membership BEFORE the idempotency short-circuit (the same ordering castR9Vote already applies) —
  // otherwise a non-panel actor calling finalize on an already-finalized session would get the full replay
  // result back (and a misleading `finalize` audit line attributed to them) without ever being checked
  // against the panel.
  if (!session.panelActorIds.includes(input.actorId)) throw new R9ActorNotOnPanelError(input.actorId);

  // Strengthened idempotency (#7): re-check the outcome short-circuit UNDER the advisory lock.
  if (session.outcome !== null) {
    return { session, claimState: claimRow.currentState, eventVersion: null, idempotentReplay: true };
  }

  // The claim must STILL be in a routable state (mirrors voteOnFrozenClaim's hasLiveRoutedRow guard /
  // commitCycleFreeze's exclusion) — if some OTHER path moved it out from under a live session, finalizing
  // now would silently no-op the reducer (identity) while irreversibly persisting the session outcome.
  if (!(R9_OUTCOME_FROM_STATES as readonly string[]).includes(claimRow.currentState)) {
    throw new R9ClaimNoLongerRoutableError(input.claimCaseId, claimRow.currentState);
  }

  // Lock the live vote rows FOR UPDATE in a DETERMINISTIC order (by vote_id) BEFORE tallying (#6).
  const liveVotes = await db
    .select({ voteId: claimR9Votes.voteId, vote: claimR9Votes.vote })
    .from(claimR9Votes)
    .where(and(eq(claimR9Votes.sessionId, session.sessionId), isNull(claimR9Votes.supersededAt)))
    .orderBy(asc(claimR9Votes.voteId))
    .for('update');

  if (liveVotes.length < session.quorumRequired) {
    throw new R9QuorumNotMetError(liveVotes.length, session.quorumRequired);
  }

  const panelSize = session.panelActorIds.length;
  const { outcome, approve_count, deny_count } = computeR9Outcome(liveVotes, panelSize, session.votingRequirement);
  const toState = outcome === 'approved' ? 'state_trustee_approved' : 'denied';

  // (a) Persist the outcome onto the session row.
  const updatedRows = await db
    .update(claimR9VotingSessions)
    .set({
      outcome,
      approveCount: approve_count,
      denyCount: deny_count,
      finalizedByActor: input.actorId,
      finalizedDisplay: input.actorDisplay,
      finalizedAt: sql`now()`,
    })
    .where(and(eq(claimR9VotingSessions.sessionId, session.sessionId), isNull(claimR9VotingSessions.outcome)))
    .returning();
  // 0 rows ⇒ a concurrent finalize already won the race under a DIFFERENT advisory-lock holder window (the
  // re-check at the top of this function ran before this UPDATE) ⇒ typed 4xx, never an uncaught assertion.
  if (updatedRows.length === 0) throw new R9SessionFinalizedError(input.claimCaseId);
  const finalizedSession = updatedRows[0]!;

  // (b) Supersede the live routed_to_r9 routing row (an approved claim rejoins the 6.13 commit set; a denied
  //     one is out — either way the durable exclusion is lifted now the R9 outcome exists).
  await db
    .update(claimStateTrusteeDecisions)
    .set({ supersededAt: sql`now()` })
    .where(
      and(
        eq(claimStateTrusteeDecisions.pariwarId, input.pariwarId),
        eq(claimStateTrusteeDecisions.claimCaseId, input.claimCaseId),
        eq(claimStateTrusteeDecisions.phase, 'routing'),
        eq(claimStateTrusteeDecisions.outcome, 'routed_to_r9'),
        isNull(claimStateTrusteeDecisions.supersededAt),
      ),
    );

  // (c) Emit the claim.r9_outcome lifecycle event (the LIFECYCLE authority) — non-PII tally/rule snapshot only.
  const projected = await projectClaimState(client, {
    claimCaseId: input.claimCaseId,
    pariwarId: input.pariwarId,
    deceasedMemberId: claimRow.deceasedMemberId,
    intakeChannels: claimRow.intakeChannels,
    claimantActorId: claimRow.claimantActorId,
    eventType: 'claim.r9_outcome',
    payload: {
      from_state: claimRow.currentState,
      to_state: toState,
      trigger: outcome === 'approved' ? 'r9_panel_finalize_approve' : 'r9_panel_finalize_deny',
      actor: input.actor,
      outcome,
      clause_id: session.clauseId,
      clause_version_id: session.clauseVersionId,
      voting_requirement: session.votingRequirement,
      approve_count,
      deny_count,
    },
    actorId: input.actorId,
    ...(input.auditId !== undefined ? { auditId: input.auditId } : {}),
  });

  // (d) Insert the r9_outcome trustee decision metadata row (the transcript slot; NON-PII — no rationale
  //     here, that lives on each claim_r9_votes row, AC3). D-F requires a reason code for a denied outcome
  //     (the rule every other trustee-decision writer enforces via assertReasonCode) — `r9_panel_denied` is
  //     the dedicated code for a PANEL VOTE denial (migration 0065), distinct from the deny-family
  //     administrative-review codes. `approved` takes no reason code, matching the D-F presence rule.
  await db.insert(claimStateTrusteeDecisions).values({
    claimCaseId: input.claimCaseId,
    pariwarId: input.pariwarId,
    phase: 'r9_outcome',
    outcome,
    reasonCode: outcome === 'denied' ? 'r9_panel_denied' : null,
    rationaleCiphertext: null,
    actorId: input.actorId,
    actorDisplay: input.actorDisplay,
  });

  return { session: finalizedSession, claimState: projected.state, eventVersion: projected.eventVersion, idempotentReplay: false };
}

// ── Cancel (correction path, metadata-only, AC5) ──────────────────────────────

/**
 * Cancel an R9 voting session (AC5). In one scope-tx: advisory-lock the claim, load the live session
 * (reject if none / already finalized — a finalized outcome cannot be un-done here), atomically supersede
 * the session AND all its live votes. The routed_to_r9 routing row STAYS live so a corrected session can
 * re-open. METADATA-ONLY — no lifecycle event (AC0). The reason code + rationale are contract-required for
 * accountability and audited by the route (v1 has no cancel-retention column — audit-retained only).
 */
export async function cancelR9VotingSession(
  client: pg.PoolClient,
  input: CancelR9VotingSessionInput,
): Promise<R9SessionResult> {
  await acquireR9Lock(client, input.pariwarId, input.claimCaseId);
  const db = bindScopedDb(client);

  const session = await liveSession(db, input.pariwarId, input.claimCaseId);
  if (!session) {
    // Distinguish "never had a session" from "had one, already cancelled" (a straightforward, non-race
    // re-cancel attempt) — both fall through liveSession's isNull(supersededAt) filter, but only the latter
    // is the specific R9SessionAlreadySupersededError the race-window branch below also throws.
    if (await hasAnySession(db, input.pariwarId, input.claimCaseId)) {
      throw new R9SessionAlreadySupersededError(input.claimCaseId);
    }
    throw new R9NoLiveSessionError(input.claimCaseId);
  }
  // Panel-membership BEFORE finalized-status (the castR9Vote/finalizeR9Outcome precedent) — AC5 frames
  // cancellation as done by "an authorized panel trustee," not any pariwar-wide claim.r9_vote holder.
  if (!session.panelActorIds.includes(input.actorId)) throw new R9ActorNotOnPanelError(input.actorId);
  // Fail-closed on an already-finalized session (its outcome already advanced the lifecycle — AC5).
  if (session.outcome !== null) throw new R9SessionFinalizedError(input.claimCaseId);

  // Atomic supersession — 0 rows ⇒ a concurrent cancel already won ⇒ conflict (409).
  const superseded = await db
    .update(claimR9VotingSessions)
    .set({ supersededAt: sql`now()` })
    .where(and(eq(claimR9VotingSessions.sessionId, session.sessionId), isNull(claimR9VotingSessions.supersededAt)))
    .returning();
  if (superseded.length === 0) throw new R9SessionAlreadySupersededError(input.claimCaseId);

  // Supersede every LIVE vote under the session (retained in the transcript — the supersession IS the audit).
  await db
    .update(claimR9Votes)
    .set({ supersededAt: sql`now()` })
    .where(and(eq(claimR9Votes.sessionId, session.sessionId), isNull(claimR9Votes.supersededAt)));

  return { session: superseded[0]! };
}
