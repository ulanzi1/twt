// State-Trustee cycle-freeze persistence writers — Story 6.13 (Task 3, domain side). Transport-free.
//
// The four atomic write paths the cycle-freeze surface drives, each DB WORK ONLY (the post-commit
// pool-spawn trigger is the HANDLER's job, never here — AC6, other suggestion #1):
//   · voteOnFrozenClaim   — the per-claim approve/deny vote during an open freeze (AC2/AC3). LIFECYCLE-
//     CHANGING: emits claim.state_trustee_frozen (opening the freeze) then claim.state_trustee_approved /
//     claim.state_trustee_denied, + a phase='frozen_vote' metadata row, in one scope-tx (AC0).
//   · routeToR9           — the DURABLE route-to-R9 exclusion (AC4). ROUTING-ONLY: writes a
//     phase='routing', outcome='routed_to_r9' metadata row (reason-code required) + NO lifecycle event
//     (AC0). The commit query filters on this live row (AC4's durable exclusion).
//   · resolveEscalation   — the actionable escalation resolution (AC4b, D-C). LIFECYCLE-CHANGING:
//     ATOMICALLY supersedes the live `escalated` claim_verifier_decisions row (0-row UPDATE ⇒ 409) +
//     emits claim.verifier_approved / claim.verifier_denied (entering review first if still gathering) +
//     a phase='escalation_resolution' metadata row, in one scope-tx.
//   · commitCycleFreeze   — the step-up-gated bulk commit (AC5). DB WORK ONLY: writes the durable
//     cycle_freeze_commits record, then per committed claim (state state_trustee_approved, NOT carrying a
//     live routed_to_r9 row) emits claim.approved + a phase='commit' metadata row, atomically per claim;
//     idempotent on commit_id. It does NOT invoke the pool-spawn trigger (Task 6 handler owns that).
//
// The two-authority WRITE (AC0): every LIFECYCLE-CHANGING verb writes BOTH the lifecycle event (via
// projectClaimState — the sole claims.current_state writer, the LIFECYCLE authority) AND the
// claim_state_trustee_decisions DECISION-METADATA row, in ONE scope-tx so they can never diverge. Claim
// STATE is ALWAYS derived from event replay, NEVER from the decision row. ROUTING-ONLY writes metadata
// and invents no lifecycle event (the reducer stays TOTAL — no precondition is added to state.ts).
//
// CONCURRENCY (AC9): every per-claim verb first takes a transaction-scoped advisory lock on (pariwarId,
// claimCaseId) (a DISTINCT namespace prefix from the 6.11 verifier lock) so concurrent trustee actions on
// one claim serialize; the write-path state guard + the events_log `(stream_id, event_version)` unique
// index + the decision table's partial-unique `(claim_case_id, phase) WHERE superseded_at IS NULL` are the
// structural backstops.
//
// PII: the rationale is ALREADY ENCRYPTED by the CALLER (the route encrypts before the writer — the 6.11
// posture); the writer takes ciphertext (or null). The `actorDisplay` is ALREADY RESOLVED by the caller
// server-side (R5) — a non-empty snapshot; the writer never resolves it and never falls back.
//
// The write-path guards live here (the reducer stays TOTAL). NOT surfaced at the top-level barrel (claim
// namespace only); the route maps these typed errors to stable 4xx codes.

import { createHash } from 'node:crypto';

import { and, eq, inArray, isNull, notInArray, sql } from 'drizzle-orm';
import type pg from 'pg';

import { bindScopedDb, type Db } from '../db.js';
import type { ClaimId, CycleFreezeCommitId, MemberId, PariwarId } from '../ids/index.js';
import { clampLimit } from '../pagination.js';
import { claimNomineeBankAccounts } from '../schema/claim_nominee_bank_accounts.js';
import { claims } from '../schema/claims.js';
import { claimVerifierDecisions } from '../schema/claim_verifier_decisions.js';
import {
  type ClaimStateTrusteeDecisionRow,
  claimStateTrusteeDecisions,
} from '../schema/claim_state_trustee_decisions.js';
import { type CycleFreezeCommitRow, cycleFreezeCommits } from '../schema/cycle_freeze_commits.js';
import { assessClaimConcealment } from './concealment-review.js';
import { type ClaimEventActor } from './events.js';
import {
  NomineeBankAccountsRequiredError,
  NomineeNameCheckRequiredError,
} from './errors.js';
import {
  type NomineeNameCheckSnapshot,
  assertNomineeNameCheckForApproval,
  isClaimUnderCorrection,
  readNomineeNameCheckSnapshot,
} from './nominee-name-check.js';
import { projectClaimState } from './project.js';
import {
  isTrusteeReasonCodeValidForOutcome,
  trusteeReasonCodeRequiredForOutcome,
  type StateTrusteeDecisionOutcome,
  type StateTrusteeDecisionPhase,
  type StateTrusteeReasonCode,
} from './state-trustee-decision.js';

// ── State windows (the write-path allowlists) ─────────────────────────────────

/** The states a per-claim frozen vote is legal from (AC2/AC3). From verifier_approved/reversed the vote
 *  OPENS the freeze first (claim.state_trustee_frozen) then casts, in the SAME call — `voteOnFrozenClaim`
 *  never returns with the claim left at `state_trustee_freeze`. The `state_trustee_freeze` entry itself is
 *  a forward-compatible allowance (not reachable via any call path in this diff today, since freeze-open
 *  and vote-cast are not currently split across two calls) — kept so a future caller that DOES leave a
 *  claim mid-freeze (e.g. an open-only step) is votable without a guard change here. */
export const TRUSTEE_VOTABLE_STATES = ['verifier_approved', 'reversed', 'state_trustee_freeze'] as const;

/** The states a route-to-R9 exclusion may be written from — the pre-commit candidate window (a candidate
 *  in the ready-to-freeze OR escalated bucket, or mid-freeze). Routing writes metadata only (no lifecycle
 *  change), so this guards only that the target is a live pre-adjudication candidate, not a resolved claim. */
export const TRUSTEE_ROUTABLE_STATES = [
  'verification_in_progress',
  'verifier_review',
  'verifier_approved',
  'reversed',
  'state_trustee_freeze',
  'state_trustee_approved',
] as const;

/**
 * Story 6.18 (AC11) — the states the Pariwar Admin may RETURN a claim to the District Admin from
 * (`2026-09-20-227` cl.10).
 *
 * ⛔⛔ `state_trustee_approved` IS NOT HERE, AND THIS STORY REVERSED ITSELF TO TAKE IT OUT
 * (code review 2026-09-20, D1 = option A — BigDev's call; AC11 and Task 4b were amended with it).
 * ⭐ WHY THE REVERSAL, because the original reading was not silly: cl.4 makes the Pariwar Admin's
 * approval final only once the campaign goes live at `commitCycleFreeze`, so the window between the
 * vote and the commit looked like one the Pariwar Admin could still act in. It is not — a return
 * written there COULD NEVER BE CLEARED, which is precisely the dead end AC5 forbids:
 *   · the only code that supersedes a live `correction_return` row is inside `voteOnFrozenClaim`,
 *     which throws `ClaimNotFreezeVotableError` for `state_trustee_approved` BEFORE it reaches the
 *     supersession (`TRUSTEE_VOTABLE_STATES` excludes it);
 *   · `NOMINEE_NAME_CHECK_RECORDABLE_STATES` also excludes it, so the District Admin could not
 *     record the fresh check that resubmission is derived from;
 *   · `commitCycleFreeze` excludes a claim carrying a live return row.
 * ⇒ the claim could be neither committed, nor re-voted, nor re-checked. Fail-closed is the right
 * side, and it is consistent with AC4's *"no bank write is legal once the freeze begins"*.
 * ⚠ THE COST, stated rather than hidden: a discrepancy the Pariwar Admin notices AFTER voting and
 * BEFORE the commit can no longer be returned. `2026-09-20-227` does not name that window — its four
 * clauses say only *"if Pariwar Admin doesn't approve it goes back"* — so nothing ratified is lost.
 * ⛔ NEVER after `claim.approved` either — once the campaign is live, a name correction is a
 * different governed act than a return, and this story rules nothing about it.
 */
export const TRUSTEE_RETURNABLE_STATES = ['verifier_approved', 'reversed', 'state_trustee_freeze'] as const;

/** The states an escalated claim is resolvable from (AC4b) — mirrors the 6.11 escalatable window. */
export const TRUSTEE_ESCALATION_RESOLVABLE_STATES = ['verification_in_progress', 'verifier_review'] as const;

// ── Typed write-path guards (the route maps each to a stable 4xx) ─────────────

/** Story 6.15 (AC3) — the trustee reason codes that carry an R14 concealment-clause snapshot. Both the
 *  uphold (→deny) and the override (→approve) resolve `niy.concealment.r14` server-side inside the decision
 *  tx and persist `concealment_clause_version_id`. */
const CONCEALMENT_TRUSTEE_REASON_CODES = ['concealment_upheld', 'concealment_override'] as const;

/** Thrown when a concealment-coded reason code (`concealment_upheld`/`concealment_override`) is applied to
 *  a claim whose LIVE concealment signal (the same claim-scoped producer the 6.10 console/6.13 queue read)
 *  is NOT `flagged` — D1, ratified BigDev 2026-07-15. Covers a never-flagged claim, a formerly-`linked`
 *  assessment since revised off it, and an unresolvable R14 clause (the producer fail-softs an unprovisioned
 *  registry to `not_evaluated`, D10) — all collapse to the SAME rejection, never a silent null-snapshot
 *  concealment decision (AC3's invariant, now enforced by construction: a `flagged` signal always carries a
 *  non-null `clauseVersionId`). Generic reason codes remain available for independent trustee judgment. */
export class ConcealmentNotFlaggedError extends Error {
  public readonly name = 'ConcealmentNotFlaggedError';
  public constructor(
    public readonly claimCaseId: string,
    public readonly reasonCode: string,
    public readonly signalStatus: string,
  ) {
    super(
      `[state-trustee] cannot apply '${reasonCode}' to claim ${claimCaseId} — the live concealment signal is '${signalStatus}', not 'flagged'`,
    );
  }
}

/** Thrown when no claim row exists for the id the writer targets (tenant-scoped miss → 404). */
export class TrusteeClaimNotFoundError extends Error {
  public readonly name = 'TrusteeClaimNotFoundError';
  public constructor(public readonly claimCaseId: string) {
    super(`[state-trustee] no claim found for id ${claimCaseId} in scope`);
  }
}

/** Thrown by the vote path when the claim is not in a votable state (AC2/AC3 → 409). */
export class ClaimNotFreezeVotableError extends Error {
  public readonly name = 'ClaimNotFreezeVotableError';
  public constructor(
    public readonly claimCaseId: string,
    public readonly currentState: string,
  ) {
    super(
      `[state-trustee] claim ${claimCaseId} is '${currentState}' — not votable (must be verifier_approved/reversed/state_trustee_freeze)`,
    );
  }
}

/** Thrown by routeToR9 when the claim is outside the pre-commit candidate window (AC4 → 409). */
export class ClaimNotRoutableError extends Error {
  public readonly name = 'ClaimNotRoutableError';
  public constructor(
    public readonly claimCaseId: string,
    public readonly currentState: string,
  ) {
    super(`[state-trustee] claim ${claimCaseId} is '${currentState}' — not routable to R9 (not a live candidate)`);
  }
}

/** Thrown by resolveEscalation when the claim has no live `escalated` verifier decision, or is outside the
 *  escalatable window (AC4b → 409). */
export class EscalationNotResolvableError extends Error {
  public readonly name = 'EscalationNotResolvableError';
  public constructor(
    public readonly claimCaseId: string,
    public readonly detail: string,
  ) {
    super(`[state-trustee] claim ${claimCaseId} escalation not resolvable: ${detail}`);
  }
}

/** Thrown when a concurrent resolve already superseded the target escalated decision (0-row UPDATE → 409;
 *  the 6.11 reviseDecision atomic-supersession precedent). */
export class EscalationResolutionConflictError extends Error {
  public readonly name = 'EscalationResolutionConflictError';
  public constructor(public readonly claimCaseId: string) {
    super(`[state-trustee] claim ${claimCaseId} escalation resolution lost a concurrent race — already superseded`);
  }
}

/** Thrown when the reason-code is incompatible with the outcome, or a required reason-code is missing
 *  (D-F defense-in-depth behind the contract superRefine → 400). */
export class TrusteeReasonCodeError extends Error {
  public readonly name = 'TrusteeReasonCodeError';
  public constructor(
    public readonly outcome: string,
    public readonly reasonCode: string | null,
    public readonly detail: string,
  ) {
    super(`[state-trustee] reason code '${reasonCode ?? '(absent)'}' invalid for outcome '${outcome}': ${detail}`);
  }
}

/** Thrown when a route/vote row for the (claim, phase) already exists live (partial-unique 23505 → 409). */
export class TrusteeDecisionConflictError extends Error {
  public readonly name = 'TrusteeDecisionConflictError';
  public constructor(
    public readonly claimCaseId: string,
    public readonly phase: string,
  ) {
    super(`[state-trustee] claim ${claimCaseId} already has a live '${phase}' decision — cannot record another`);
  }
}

/** Thrown by the vote path when the claim carries a LIVE route-to-R9 exclusion — voting on a routed claim
 *  would leave it approved yet permanently uncommittable (AC4's durable exclusion → 409). */
export class ClaimAlreadyRoutedError extends Error {
  public readonly name = 'ClaimAlreadyRoutedError';
  public constructor(public readonly claimCaseId: string) {
    super(`[state-trustee] claim ${claimCaseId} carries a live route-to-R9 exclusion — not votable`);
  }
}

/** Thrown when a return is attempted on a claim outside `TRUSTEE_RETURNABLE_STATES` (AC11 → 409). */
export class ClaimNotReturnableError extends Error {
  public readonly name = 'ClaimNotReturnableError';
  public constructor(
    public readonly claimCaseId: string,
    public readonly currentState: string,
  ) {
    super(
      `[state-trustee] claim ${claimCaseId} is '${currentState}' — it cannot be returned to the District Admin in this state`,
    );
  }
}

/**
 * Thrown by the VOTE when the claim carries a LIVE return row and has NOT been resubmitted (AC11 →
 * 409). The `ClaimAlreadyRoutedError` shape, for the same reason: voting a returned claim through
 * would silently discard a correction the Pariwar Admin themselves asked for.
 */
export class ClaimAwaitingCorrectionError extends Error {
  public readonly name = 'ClaimAwaitingCorrectionError';
  public constructor(public readonly claimCaseId: string) {
    super(
      `[state-trustee] claim ${claimCaseId} was returned to the District Admin and has not been resubmitted — not votable`,
    );
  }
}

/**
 * Thrown when a RETURN and a ROUTE-TO-R9 would coexist on one claim (code review 2026-09-20 → 409).
 *
 * ⛔⛔ THE TWO EXCLUSIONS ARE MUTUALLY EXCLUSIVE, and nothing structural enforced it: the
 * partial-unique index is PER PHASE (`(claim_case_id, phase) WHERE superseded_at IS NULL`), so a
 * `routing` row and a `correction_return` row sat side by side happily. That combination is not a
 * harmless overlap — it produces two reachable wrongs:
 *   · R9 APPROVE → `state_trustee_approved` while a return is live. `finalizeR9Outcome` lifts only
 *     the ROUTING row, and after D1 `state_trustee_approved` is not returnable and not votable, so
 *     the return could never be cleared: the dead end AC5 forbids, reached by another door.
 *   · R9 DENY → `denied` while a return is live. The bank writer's row-alone branch has no state
 *     test, so a live return would keep permitting bank rewrites on a TERMINAL claim.
 * ⭐ Which one wins is deliberately NOT decided here — whichever was written FIRST stands, and the
 * second act is refused so a human chooses. Superseding someone else's live governance row to make
 * room for your own is exactly the silent overwrite this table's conventions exist to prevent.
 */
export class TrusteeExclusionConflictError extends Error {
  public readonly name = 'TrusteeExclusionConflictError';
  public constructor(
    public readonly claimCaseId: string,
    /** The exclusion that is ALREADY live and blocks the attempted write. */
    public readonly liveExclusion: 'routing' | 'correction_return',
  ) {
    super(
      `[state-trustee] claim ${claimCaseId} already carries a live '${liveExclusion}' exclusion — the two cannot coexist`,
    );
  }
}

/** Thrown by commitCycleFreeze when a `commit_id` is replayed by a DIFFERENT actor than the one who
 *  originally submitted it (idempotency-ownership guard, review addendum → 409). A genuine retry of the
 *  SAME attempt is always the SAME actor's own browser session resubmitting; a mismatch means the client
 *  reused an id it never minted, not a legitimate retry. */
export class CommitIdOwnershipConflictError extends Error {
  public readonly name = 'CommitIdOwnershipConflictError';
  public constructor(public readonly commitId: string) {
    super(`[state-trustee] commit_id ${commitId} was already recorded by a different actor`);
  }
}

/** Thrown by commitCycleFreeze on the (astronomically unlikely, but not impossible) case where a
 *  client-generated `commit_id` UUID collides with an EXISTING row belonging to a DIFFERENT Pariwar —
 *  `commit_id` is a global primary key, not composite with `pariwar_id`. Fails loud rather than crashing on
 *  an unchecked lookup miss. */
export class CommitIdCollisionError extends Error {
  public readonly name = 'CommitIdCollisionError';
  public constructor(public readonly commitId: string) {
    super(`[state-trustee] commit_id ${commitId} collides with a record outside this Pariwar's scope`);
  }
}

/** True iff `err` (or its wrapped cause) is a Postgres unique-violation (23505). */
function isUniqueViolation(err: unknown): boolean {
  const direct = (err as { code?: string }).code;
  const cause = (err as { cause?: { code?: string } }).cause?.code;
  return direct === '23505' || cause === '23505';
}

/** True iff `claimCaseId` carries a LIVE (non-superseded) `phase='routing'`/`routed_to_r9` decision row —
 *  the durable AC4 exclusion. Read under the caller's tx/lock so it reflects the current state. */
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

// ── Advisory lock + claim row lock helpers ────────────────────────────────────

/**
 * The transaction-scoped advisory-lock key for one claim's trustee action (AC9). A DISTINCT namespace
 * prefix (`state_trustee_decision:`) from the 6.11 verifier lock so the two never collide on one claim.
 */
export function stateTrusteeDecisionAdvisoryLockKey(pariwarId: string, claimCaseId: string): bigint {
  const hex = createHash('sha256').update(`state_trustee_decision:${pariwarId}:${claimCaseId}`).digest('hex');
  return BigInt(`0x${hex.slice(0, 15)}`);
}

async function acquireTrusteeLock(client: pg.PoolClient, pariwarId: PariwarId, claimCaseId: ClaimId): Promise<void> {
  await client.query('SELECT pg_advisory_xact_lock($1)', [
    stateTrusteeDecisionAdvisoryLockKey(pariwarId, claimCaseId).toString(),
  ]);
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

// ── Inputs / results ──────────────────────────────────────────────────────────

interface TrusteeWriteBase {
  claimCaseId: ClaimId;
  pariwarId: PariwarId;
  /** Bounded trustee reason code; null when absent (required-per-outcome enforced below + in the contract). */
  reasonCode: StateTrusteeReasonCode | null;
  /** ALREADY-ENCRYPTED Tier-1 rationale ciphertext (the route encrypts before the writer); null when none. */
  rationaleCiphertext: string | null;
  /** The acting trustee's actor id (audit; non-PII query/join key). */
  actorId: string;
  /** The decision-time SNAPSHOT of the actor's display name (R5/AC8) — ALREADY RESOLVED, non-empty. */
  actorDisplay: string;
  /** Who caused the event (`trustee` for this surface). */
  actor: ClaimEventActor;
  auditId?: string;
}

export interface VoteOnFrozenClaimInput extends TrusteeWriteBase {
  /** `approved` (→ state_trustee_approved) or `denied` (→ denied). */
  outcome: 'approved' | 'denied';
}

export interface RouteToR9Input extends TrusteeWriteBase {
  /** Route-to-R9 always records outcome `routed_to_r9`; reasonCode is required (enforced below). */
  outcome?: 'routed_to_r9';
}

export interface ResolveEscalationInput extends TrusteeWriteBase {
  /** The direction the escalation resolves to: `approved` (→ verifier_approved) or `denied` (→ denied). */
  outcome: 'approved' | 'denied';
}

export interface TrusteeDecisionResult {
  decision: ClaimStateTrusteeDecisionRow;
  eventVersion: number | null;
  /** The claim's lifecycle state AFTER the write (routing leaves it unchanged). */
  claimState: string;
  /** Story 6.15 (AC3) — the resolved R14 clause-version snapshot on a concealment-coded decision (the route
   *  adds it to the non-PII audit-line context); `null`/absent for every non-concealment decision. */
  concealmentClauseVersionId?: string | null;
}

// ── Shared decision-row insert ────────────────────────────────────────────────

async function insertTrusteeDecisionRow(
  db: Db,
  input: TrusteeWriteBase & {
    phase: StateTrusteeDecisionPhase;
    outcome: StateTrusteeDecisionOutcome;
    /** Story 6.15 (AC3) — the R14 clause-version snapshot, resolved server-side; set ONLY on a
     *  concealment-coded decision, null otherwise. */
    concealmentClauseVersionId?: string | null;
  },
): Promise<ClaimStateTrusteeDecisionRow> {
  const rows = await db
    .insert(claimStateTrusteeDecisions)
    .values({
      claimCaseId: input.claimCaseId,
      pariwarId: input.pariwarId,
      phase: input.phase,
      outcome: input.outcome,
      reasonCode: input.reasonCode,
      rationaleCiphertext: input.rationaleCiphertext,
      actorId: input.actorId,
      actorDisplay: input.actorDisplay,
      ...(input.concealmentClauseVersionId != null
        ? { concealmentClauseVersionId: input.concealmentClauseVersionId }
        : {}),
    })
    .returning();
  return rows[0]!;
}

/**
 * Story 6.15 (AC3 + D1, ratified BigDev 2026-07-15) — for a concealment-coded decision (`concealment_upheld`
 * / `concealment_override`), resolve the `niy.concealment.r14` clause version SERVER-SIDE, using the tx's
 * OWN scoped `db` handle, INSIDE the decision transaction (never accepted from the route/client), from the
 * SAME claim-scoped concealment PRODUCER the 6.10 console / 6.13 queue read (`assessClaimConcealment`) — not
 * a second independent clause resolution. D1: the claim's LIVE signal must be `flagged`; `not_flagged`,
 * `not_evaluated` (absent assessment, a revised-off-`linked` assessment, or an unresolvable R14 clause — all
 * fail-soft to `not_evaluated`, D10) are rejected with `ConcealmentNotFlaggedError` (409) BEFORE any write.
 * A `flagged` signal always carries a non-null `clauseVersionId` by construction (the AC3 "never persist a
 * null snapshot" invariant, now structural). Generic reason codes remain available for independent trustee
 * judgment — for every non-concealment reason code this returns `null` (the column stays null).
 */
async function resolveConcealmentSnapshot(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
  reasonCode: StateTrusteeReasonCode | null,
): Promise<string | null> {
  if (reasonCode === null || !(CONCEALMENT_TRUSTEE_REASON_CODES as readonly string[]).includes(reasonCode)) {
    return null;
  }
  const signal = await assessClaimConcealment(db, { pariwarId, claimCaseId });
  if (signal.status !== 'flagged') {
    throw new ConcealmentNotFlaggedError(claimCaseId, reasonCode, signal.status);
  }
  return signal.clauseVersionId;
}

/** Validate the reason-code against the outcome (D-F defense-in-depth): required for denied/routed_to_r9,
 *  and a supplied code must be outcome-compatible. Throws `TrusteeReasonCodeError` (→ 400). */
function assertReasonCode(outcome: StateTrusteeDecisionOutcome, reasonCode: StateTrusteeReasonCode | null): void {
  // ⭐ DELEGATES to `trusteeReasonCodeRequiredForOutcome` rather than restating the outcome list.
  // Story 6.18 (AC11) found this literal had been a SECOND, hand-maintained copy of the presence
  // rule: adding `returned_for_correction` in the vocabulary module alone would have left the write
  // path silently accepting a return with no reason code — and therefore no note, which is the one
  // thing `-227` cl.10 actually requires of it. One source now; the contracts mirror is the other
  // (deliberately, the browser-bundle rule) and the lockstep test pins the two together.
  if (trusteeReasonCodeRequiredForOutcome(outcome) && reasonCode === null) {
    throw new TrusteeReasonCodeError(outcome, reasonCode, 'a reason code is required for this outcome');
  }
  if (reasonCode !== null && !isTrusteeReasonCodeValidForOutcome(outcome, reasonCode)) {
    throw new TrusteeReasonCodeError(outcome, reasonCode, 'reason code is not valid for this outcome');
  }
}

// ── Vote (open-freeze + per-claim approve/deny, AC2/AC3) ──────────────────────

/**
 * Record a per-claim trustee VOTE during the cycle freeze (AC2/AC3). In one scope-tx: advisory-lock the
 * claim, row-lock + read its state, re-check the reason-code (D-F), OPEN the freeze in the write path when
 * the claim is still verifier_approved/reversed (emit claim.state_trustee_frozen → state_trustee_freeze),
 * assert it is now state_trustee_freeze, emit the vote (claim.state_trustee_approved →
 * state_trustee_approved OR claim.state_trustee_denied → denied; auditShape only), and insert the
 * phase='frozen_vote' decision row — the two authorities in ONE tx (AC0). Takes a raw pg.PoolClient.
 */
export async function voteOnFrozenClaim(
  client: pg.PoolClient,
  input: VoteOnFrozenClaimInput,
): Promise<TrusteeDecisionResult> {
  assertReasonCode(input.outcome, input.reasonCode);
  await acquireTrusteeLock(client, input.pariwarId, input.claimCaseId);
  const db = bindScopedDb(client);

  const claimRow = await lockClaim(db, input.pariwarId, input.claimCaseId);
  if (!claimRow) throw new TrusteeClaimNotFoundError(input.claimCaseId);

  if (!(TRUSTEE_VOTABLE_STATES as readonly string[]).includes(claimRow.currentState)) {
    throw new ClaimNotFreezeVotableError(input.claimCaseId, claimRow.currentState);
  }
  // A live route-to-R9 exclusion makes the claim permanently uncommittable (AC4) — voting it through would
  // silently strand it as `state_trustee_approved` with no path to commit. Guard the vote, not just commit.
  if (await hasLiveRoutedRow(db, input.pariwarId, input.claimCaseId)) {
    throw new ClaimAlreadyRoutedError(input.claimCaseId);
  }

  // Story 6.18 (AC11) — a LIVE return blocks the vote until the claim is RESUBMITTED, and when it is,
  // THE SAME TRANSACTION supersedes the return row and proceeds.
  //
  // ⚠⚠ THE SUPERSESSION USES `resolveEscalation`'s CONDITIONAL SHAPE — `UPDATE … WHERE decision_id =
  // $target AND superseded_at IS NULL RETURNING`, 0 rows ⇒ 409 — so two concurrent votes cannot both
  // clear one return. ⭐ Recorded honestly: this is ⛔ NOT the first writer of `superseded_at` on this
  // table (the story's AC11 says it is; `r9-voting-persist.ts` already lifts a routing row). That
  // existing writer is UNCONDITIONAL with no 0-row check, which is safe THERE — an already-lifted
  // exclusion is a harmless no-op — and would ⛔ NOT be safe here, where two voters racing a single
  // return must not both proceed. The conditional shape is a deliberate departure from the nearest
  // same-table precedent, ⛔ not the only option available.
  const liveReturn = await getLiveReturnRow(db, input.pariwarId, input.claimCaseId);
  if (liveReturn) {
    const resubmitted = await isReturnedClaimResubmitted(
      db,
      input.pariwarId,
      input.claimCaseId,
      claimRow.deceasedMemberId,
      liveReturn.decidedAt,
    );
    if (!resubmitted) throw new ClaimAwaitingCorrectionError(input.claimCaseId);
    const superseded = await db
      .update(claimStateTrusteeDecisions)
      .set({ supersededAt: sql`now()` })
      .where(
        and(
          eq(claimStateTrusteeDecisions.decisionId, liveReturn.decisionId),
          isNull(claimStateTrusteeDecisions.supersededAt),
        ),
      )
      .returning({ decisionId: claimStateTrusteeDecisions.decisionId });
    if (superseded.length === 0) throw new ClaimAwaitingCorrectionError(input.claimCaseId);
  }

  // P3 — the nominee NAME CHECK gate (Story 6.18, AC4; `2026-09-19-226` cl.3-cl.5, cl.7).
  // ⭐ THE MOST LOAD-BEARING OF THE THREE GATES. cl.4 makes this vote the FINAL approval, after which
  // the campaign goes live, and it is the ONLY gate that catches two cases P1 cannot:
  //   · an APPEAL REVERSAL, which re-enters the votable set at `reversed` without passing P1 again;
  //   · a D5 POST-APPROVAL CORRECTION (`-227` cl.12) — a helpline operator corrected an account after
  //     the District Admin approved, which moves `updated_at`, makes the recorded check STALE, and
  //     must send the claim back to the District Admin to look again.
  // ⛔ A DENY IS NEVER GATED (cl.6/cl.7 — a claim is never refused over a name or a missing account).
  if (input.outcome === 'approved') {
    await assertNomineeNameCheckForApproval(
      db,
      input.pariwarId,
      input.claimCaseId,
      claimRow.deceasedMemberId,
    );
  }

  // Story 6.15 (AC3) — resolve the R14 clause snapshot server-side INSIDE this tx for a concealment-coded
  // decision (uphold→deny, override→approve), BEFORE any write so a null resolution aborts cleanly (no
  // orphaned events). Non-concealment codes → null (the column stays null). Never from the route/client.
  const concealmentClauseVersionId = await resolveConcealmentSnapshot(
    db,
    input.pariwarId,
    input.claimCaseId,
    input.reasonCode,
  );

  const projectBase = {
    claimCaseId: input.claimCaseId,
    pariwarId: input.pariwarId,
    deceasedMemberId: claimRow.deceasedMemberId,
    intakeChannels: claimRow.intakeChannels,
    claimantActorId: claimRow.claimantActorId,
    actorId: input.actorId,
    ...(input.auditId !== undefined ? { auditId: input.auditId } : {}),
  };

  // (a) Open the freeze in the write path when the claim is a fresh candidate (verifier_approved/reversed).
  if (claimRow.currentState === 'verifier_approved' || claimRow.currentState === 'reversed') {
    await projectClaimState(client, {
      ...projectBase,
      eventType: 'claim.state_trustee_frozen',
      payload: {
        from_state: claimRow.currentState,
        to_state: 'state_trustee_freeze',
        trigger: 'cycle_freeze_open',
        actor: input.actor,
      },
    });
  }

  // (b) Cast the vote (auditShape only — reason/rationale live in the metadata row, D-G).
  const voteEvent = input.outcome === 'approved' ? 'claim.state_trustee_approved' : 'claim.state_trustee_denied';
  const projected = await projectClaimState(client, {
    ...projectBase,
    eventType: voteEvent,
    payload: {
      from_state: 'state_trustee_freeze',
      to_state: input.outcome === 'approved' ? 'state_trustee_approved' : 'denied',
      trigger: input.outcome === 'approved' ? 'cycle_freeze_vote_approve' : 'cycle_freeze_vote_deny',
      actor: input.actor,
    },
  });

  // (c) Insert the DECISION-METADATA row in the SAME tx (AC0), carrying the R14 snapshot for a concealment
  //     decision (AC3). The partial-unique 23505 is the backstop.
  let decision: ClaimStateTrusteeDecisionRow;
  try {
    decision = await insertTrusteeDecisionRow(db, {
      ...input,
      phase: 'frozen_vote',
      outcome: input.outcome,
      concealmentClauseVersionId,
    });
  } catch (err) {
    if (isUniqueViolation(err)) throw new TrusteeDecisionConflictError(input.claimCaseId, 'frozen_vote');
    throw err;
  }
  return {
    decision,
    eventVersion: projected.eventVersion,
    claimState: projected.state,
    concealmentClauseVersionId,
  };
}

// ── Route to R9 (durable exclusion, metadata-only, AC4) ───────────────────────

/**
 * Record a DURABLE route-to-R9 exclusion (AC4/AC0). ROUTING-ONLY: writes a phase='routing',
 * outcome='routed_to_r9' metadata row (reason-code REQUIRED) and NO lifecycle event — the reducer stays
 * TOTAL and the claim's lifecycle state is UNCHANGED. The commit query (commitCycleFreeze) EXCLUDES any
 * claim carrying a live routing row, so the exclusion survives across requests/sessions (a persisted
 * predicate, never an in-memory filter). The actual R9 panel voting is Story 6.14.
 */
export async function routeToR9(client: pg.PoolClient, input: RouteToR9Input): Promise<TrusteeDecisionResult> {
  assertReasonCode('routed_to_r9', input.reasonCode);
  await acquireTrusteeLock(client, input.pariwarId, input.claimCaseId);
  const db = bindScopedDb(client);

  const claimRow = await lockClaim(db, input.pariwarId, input.claimCaseId);
  if (!claimRow) throw new TrusteeClaimNotFoundError(input.claimCaseId);

  if (!(TRUSTEE_ROUTABLE_STATES as readonly string[]).includes(claimRow.currentState)) {
    throw new ClaimNotRoutableError(input.claimCaseId, claimRow.currentState);
  }

  // ⛔ A claim under a live RETURN may not also be routed to R9 — see TrusteeExclusionConflictError.
  // Read under the claim lock this function already holds, so a concurrent return cannot slip past.
  if (await hasLiveReturnRow(db, input.pariwarId, input.claimCaseId)) {
    throw new TrusteeExclusionConflictError(input.claimCaseId, 'correction_return');
  }

  let decision: ClaimStateTrusteeDecisionRow;
  try {
    decision = await insertTrusteeDecisionRow(db, { ...input, phase: 'routing', outcome: 'routed_to_r9' });
  } catch (err) {
    if (isUniqueViolation(err)) throw new TrusteeDecisionConflictError(input.claimCaseId, 'routing');
    throw err;
  }
  // NO lifecycle event (AC0) — the routing row is metadata only; claim state is unchanged.
  return { decision, eventVersion: null, claimState: claimRow.currentState };
}

// ── Return to District Admin (metadata-only, Story 6.18 AC11 / `-227` cl.10) ──

export interface ReturnToDistrictAdminInput extends TrusteeWriteBase {
  /** A return always records outcome `returned_for_correction`; reasonCode is required. */
  outcome?: 'returned_for_correction';
}

/**
 * Record the Pariwar Admin's RETURN of a claim to the District Admin, with a note (AC11).
 *
 * ⭐ EXACTLY THE SHIPPED `routeToR9` SHAPE: insert one `correction_return` metadata row, ⛔ NO
 * `projectClaimState`, return `eventVersion: null`. So the claim's state does ⛔ not move, this is
 * ⛔ not a denial, ⛔ no appeal flow (Story 6.16) starts, and ⛔ NO new claim event is minted — for the
 * return OR for the later resubmission. The vocabulary moves by ZERO here; the only event this story
 * mints is `claim.nominee_name_checked`.
 *
 * ⚠⚠ AND IT MUST ⛔ NOT OPEN THE FREEZE. `voteOnFrozenClaim` emits `claim.state_trustee_frozen` when
 * it acts from `verifier_approved`/`reversed`; this path does ⛔ not go near that code. A return is
 * the Pariwar Admin declining to proceed — treating it as a step INTO the freeze would advance the
 * very claim they just sent back.
 *
 * @throws TrusteeClaimNotFoundError   tenant-scoped miss (→ 404)
 * @throws ClaimNotReturnableError     outside `TRUSTEE_RETURNABLE_STATES` (→ 409)
 * @throws TrusteeReasonCodeError      missing/incompatible reason code (→ 400)
 * @throws TrusteeDecisionConflictError  a live return row already exists (→ 409, the partial-unique)
 */
export async function returnToDistrictAdmin(
  client: pg.PoolClient,
  input: ReturnToDistrictAdminInput,
): Promise<TrusteeDecisionResult> {
  assertReasonCode('returned_for_correction', input.reasonCode);
  await acquireTrusteeLock(client, input.pariwarId, input.claimCaseId);
  const db = bindScopedDb(client);

  const claimRow = await lockClaim(db, input.pariwarId, input.claimCaseId);
  if (!claimRow) throw new TrusteeClaimNotFoundError(input.claimCaseId);

  if (!(TRUSTEE_RETURNABLE_STATES as readonly string[]).includes(claimRow.currentState)) {
    throw new ClaimNotReturnableError(input.claimCaseId, claimRow.currentState);
  }

  // ⛔ A claim already routed to R9 may not also be returned — see TrusteeExclusionConflictError.
  // The R9 panel is now the deciding body; returning underneath it would leave a row only a vote
  // that can no longer happen could clear.
  if (await hasLiveRoutedRow(db, input.pariwarId, input.claimCaseId)) {
    throw new TrusteeExclusionConflictError(input.claimCaseId, 'routing');
  }

  let decision: ClaimStateTrusteeDecisionRow;
  try {
    decision = await insertTrusteeDecisionRow(db, {
      ...input,
      phase: 'correction_return',
      outcome: 'returned_for_correction',
    });
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new TrusteeDecisionConflictError(input.claimCaseId, 'correction_return');
    }
    throw err;
  }
  // ⛔ NO lifecycle event — the return row is metadata only; the claim's state is unchanged.
  return { decision, eventVersion: null, claimState: claimRow.currentState };
}

/**
 * The LIVE (non-superseded) `correction_return` row for a claim, or `undefined`.
 *
 * ⭐ A claim carrying one is UNDER CORRECTION — a DERIVED condition, ⛔ not a new table and ⛔ not a
 * new event (AC5). While it holds: the helpline operator may write corrected accounts WHATEVER the
 * claim's state, the claim is ⛔ not committable, and the vote is refused until it is resubmitted.
 */
async function getLiveReturnRow(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
): Promise<ClaimStateTrusteeDecisionRow | undefined> {
  const rows = await db
    .select()
    .from(claimStateTrusteeDecisions)
    .where(
      and(
        eq(claimStateTrusteeDecisions.pariwarId, pariwarId),
        eq(claimStateTrusteeDecisions.claimCaseId, claimCaseId),
        eq(claimStateTrusteeDecisions.phase, 'correction_return'),
        eq(claimStateTrusteeDecisions.outcome, 'returned_for_correction'),
        isNull(claimStateTrusteeDecisions.supersededAt),
      ),
    )
    .limit(1);
  return rows[0];
}

/**
 * The live return row for a claim, for the DISTRICT ADMIN's own surface (AC11) — the Pariwar Admin's
 * note lives on it as `rationaleCiphertext` and is decrypted by the authorized caller.
 * ⛔ Returns ciphertext AS STORED; this accessor never decrypts.
 */
export async function getLiveCorrectionReturn(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
): Promise<ClaimStateTrusteeDecisionRow | undefined> {
  return getLiveReturnRow(db, pariwarId, claimCaseId);
}

/** True iff the claim carries a live return row (the read-model / guard predicate). */
export async function hasLiveReturnRow(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
): Promise<boolean> {
  return (await getLiveReturnRow(db, pariwarId, claimCaseId)) !== undefined;
}

/**
 * Has a RETURNED claim been RESUBMITTED?
 *
 * ⭐⭐ THE RESUBMISSION IS DERIVED, AND THAT IS THE LOAD-BEARING DESIGN CHOICE (AC11). A returned
 * claim counts as resubmitted when there are two live accounts AND a CURRENT, PASSING name check —
 * i.e. when the District Admin has looked again at the corrected details. There is ⛔ no resubmit
 * route, ⛔ no new key, and ⛔ no District Admin write to `claim_state_trustee_decisions`: ⛔ no
 * precedent exists for a District Admin writing to the trustee table, and RLS would ⛔ not stop one,
 * so deriving the condition removes the question instead of answering it badly.
 *
 * ⚠ It reuses the AC4 approval gate verbatim, which is what keeps "resubmitted" and "approvable"
 * from ever drifting apart — PLUS the ordering constraint below, which the gate alone cannot express.
 *
 * ⚠⚠ THE ORDERING COMPARISON DEPENDS ON THE ACTS BEING SEPARATE TRANSACTIONS, which production
 * guarantees (the return and the correction are two different HTTP requests) — `decided_at` and
 * `updated_at` are both `now()`, i.e. the TRANSACTION timestamp, so two acts inside ONE transaction
 * would share an instant and `>` would not separate them. That cannot happen on any real path; a
 * live-DB test running inside one BEGIN/ROLLBACK must simulate the boundary, and the return-loop
 * spec does, with a comment saying why.
 */
export async function isReturnedClaimResubmitted(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
  deceasedMemberId: MemberId,
  returnedAt: Date,
): Promise<boolean> {
  // ⭐⭐ THE CORRECTION MUST HAVE ACTUALLY HAPPENED, and this ordering check is load-bearing.
  // Omitting it silently defeats the whole loop: the check that was ALREADY on the claim when the
  // Pariwar Admin returned it is still current, so the very next vote would sail straight through
  // and the return would have achieved nothing. (Caught by the end-to-end test, ⛔ not by reasoning
  // — step (2) of the loop passed a vote it should have refused.)
  //
  // ⭐ WHY THE ACCOUNTS' `updated_at`, AND ⛔ NOT THE CHECK'S OWN TIMESTAMP. `-227` cl.10 asks the
  // District Admin to *"contact claimant regarding discrepancy and GET IT CORRECTED"* — the
  // correction is the point, ⛔ not a second look at unchanged details. Anchoring on the bank
  // rewrite means a District Admin cannot clear a return by simply re-recording the same verdict
  // over the same data. And it composes: the AC4 gate below then requires a check that is CURRENT
  // with respect to those corrected rows, which by construction was recorded after the correction.
  const accounts = await db
    .select({ updatedAt: claimNomineeBankAccounts.updatedAt })
    .from(claimNomineeBankAccounts)
    .where(
      and(
        eq(claimNomineeBankAccounts.pariwarId, pariwarId),
        eq(claimNomineeBankAccounts.claimCaseId, claimCaseId),
      ),
    );
  if (accounts.length === 0) return false;
  const correctedSinceReturn = accounts.every((a) => a.updatedAt.getTime() > returnedAt.getTime());
  if (!correctedSinceReturn) return false;

  try {
    await assertNomineeNameCheckForApproval(db, pariwarId, claimCaseId, deceasedMemberId);
    return true;
  } catch (err) {
    // ⛔⛔ ONLY THE TWO TYPED "NOT YET" ANSWERS ARE SWALLOWED, and the narrowness is the point.
    // A bare `catch { return false }` here reported a DB error, a timeout or a bug as "not
    // resubmitted" — i.e. as a 409 `ClaimAwaitingCorrectionError` blaming the family for a fault
    // that was ours. Worse, this runs INSIDE the caller's transaction: swallowing a Postgres error
    // leaves the transaction ABORTED (25P02), so the next statement fails with an unrelated message
    // and the real cause is gone. Anything that is not one of these two propagates.
    if (
      err instanceof NomineeBankAccountsRequiredError ||
      err instanceof NomineeNameCheckRequiredError
    ) {
      // No accounts / never checked / stale / does_not_match — all mean "not yet resubmitted".
      return false;
    }
    throw err;
  }
}

/** The one answer to *"is this claim under correction?"*, with the parts that produced it. */
export interface ClaimCorrectionState {
  /** AC5 — the bank details need correcting, from EITHER half. */
  readonly underCorrection: boolean;
  /** A live `correction_return` row exists (the Pariwar Admin sent it back). */
  readonly hasLiveReturn: boolean;
  /** … and it has since been corrected + re-checked, so the next vote may proceed. */
  readonly resubmitted: boolean;
  /** The District Admin's half — a CURRENT check carrying a `does_not_match`. */
  readonly checkSendsBack: boolean;
  readonly snapshot: NomineeNameCheckSnapshot;
}

/**
 * Resolve a claim's correction state — ⭐ THE SINGLE DEFINITION every surface must use (AC5).
 *
 * ⚠ It lives here rather than in `nominee-name-check.ts` only because of the dependency direction:
 * the return row is this module's, and this module already depends on that one. The MEANING is
 * documented on `isClaimUnderCorrection`, which is what this function ultimately calls.
 *
 * Consumers: the bank writer's third branch, the helpline handler's `editable` pre-check, the
 * filer-facing bank status, and the cycle-freeze pending read. Before the 2026-09-20 review each of
 * those computed its own answer and three of the four were wrong in a different way.
 *
 * ⚠ Call inside the caller's transaction whenever the answer gates a write.
 */
export async function resolveClaimCorrectionState(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
  deceasedMemberId: MemberId,
): Promise<ClaimCorrectionState> {
  const snapshot = await readNomineeNameCheckSnapshot(db, pariwarId, claimCaseId, deceasedMemberId);
  const returnRow = await getLiveReturnRow(db, pariwarId, claimCaseId);

  let resubmitted = false;
  if (returnRow) {
    resubmitted = await isReturnedClaimResubmitted(
      db,
      pariwarId,
      claimCaseId,
      deceasedMemberId,
      returnRow.decidedAt,
    );
  }

  const hasLiveReturn = returnRow !== undefined;
  const checkSendsBack = snapshot.sendsBack;
  return {
    underCorrection: isClaimUnderCorrection(hasLiveReturn && !resubmitted, checkSendsBack),
    hasLiveReturn,
    resubmitted,
    checkSendsBack,
    snapshot,
  };
}

// ── Resolve escalation (atomic supersession + verifier verdict, AC4b/D-C) ─────

/**
 * Resolve a verifier ESCALATION (AC4b/D-C). In one scope-tx: advisory-lock + row-lock the claim, confirm a
 * live `escalated` claim_verifier_decisions row exists and the claim is in the escalatable window, ATOMICALLY
 * supersede that escalated row (conditional `UPDATE … WHERE decision_id = $target AND superseded_at IS NULL
 * RETURNING` — 0 rows ⇒ EscalationResolutionConflictError 409, the 6.11 reviseDecision precedent), enter
 * review first when the claim is still verification_in_progress (D-C, the adjudicateClaim pattern), emit
 * claim.verifier_approved (→ verifier_approved, joining the freeze-ready bucket) or claim.verifier_denied
 * (→ denied), and insert a phase='escalation_resolution' trustee metadata row. Minimal by design — an
 * approved escalation then flows through the ordinary freeze/vote/commit path; a denied one is appeal-eligible.
 */
export async function resolveEscalation(
  client: pg.PoolClient,
  input: ResolveEscalationInput,
): Promise<TrusteeDecisionResult> {
  assertReasonCode(input.outcome, input.reasonCode);
  await acquireTrusteeLock(client, input.pariwarId, input.claimCaseId);
  const db = bindScopedDb(client);

  const claimRow = await lockClaim(db, input.pariwarId, input.claimCaseId);
  if (!claimRow) throw new TrusteeClaimNotFoundError(input.claimCaseId);

  if (!(TRUSTEE_ESCALATION_RESOLVABLE_STATES as readonly string[]).includes(claimRow.currentState)) {
    throw new EscalationNotResolvableError(
      input.claimCaseId,
      `claim is '${claimRow.currentState}', not in {verification_in_progress, verifier_review}`,
    );
  }

  // Story 6.15 (AC3) — resolve the R14 clause snapshot server-side INSIDE this tx for a concealment-coded
  // decision (uphold→deny, override→approve), BEFORE any write so a rejection aborts cleanly (no orphaned
  // events/supersession). Escalation resolution is a Story 6.13 concealment-deciding path exactly like
  // `voteOnFrozenClaim` — omitting this call here would silently persist a null snapshot on a
  // concealment-coded escalation decision (the bug this mirrors `voteOnFrozenClaim` to close).
  const concealmentClauseVersionId = await resolveConcealmentSnapshot(
    db,
    input.pariwarId,
    input.claimCaseId,
    input.reasonCode,
  );

  // The live `escalated` verifier decision (partial-unique guarantees ≤1 live per claim).
  const liveEscalated = (
    await db
      .select()
      .from(claimVerifierDecisions)
      .where(
        and(
          eq(claimVerifierDecisions.pariwarId, input.pariwarId),
          eq(claimVerifierDecisions.claimCaseId, input.claimCaseId),
          eq(claimVerifierDecisions.outcome, 'escalated'),
          isNull(claimVerifierDecisions.supersededAt),
        ),
      )
  )[0];
  if (!liveEscalated) {
    throw new EscalationNotResolvableError(input.claimCaseId, 'no live escalated verifier decision to resolve');
  }

  // Atomic supersession — 0 rows ⇒ a concurrent resolve already won ⇒ conflict (409).
  const superseded = await db
    .update(claimVerifierDecisions)
    .set({ supersededAt: sql`now()` })
    .where(
      and(eq(claimVerifierDecisions.decisionId, liveEscalated.decisionId), isNull(claimVerifierDecisions.supersededAt)),
    )
    .returning({ decisionId: claimVerifierDecisions.decisionId });
  if (superseded.length === 0) throw new EscalationResolutionConflictError(input.claimCaseId);

  const projectBase = {
    claimCaseId: input.claimCaseId,
    pariwarId: input.pariwarId,
    deceasedMemberId: claimRow.deceasedMemberId,
    intakeChannels: claimRow.intakeChannels,
    claimantActorId: claimRow.claimantActorId,
    actorId: input.actorId,
    ...(input.auditId !== undefined ? { auditId: input.auditId } : {}),
  };

  // Enter review first when the claim is still gathering signals (D-C — the reducer only advances
  // verifier_review → verifier_approved/denied; from verification_in_progress the verdict would be identity).
  if (claimRow.currentState === 'verification_in_progress') {
    await projectClaimState(client, {
      ...projectBase,
      eventType: 'claim.verifier_reviewing',
      payload: {
        from_state: 'verification_in_progress',
        to_state: 'verifier_review',
        trigger: 'cycle_freeze_escalation_enter_review',
        actor: input.actor,
      },
    });
  }

  const verdictEvent = input.outcome === 'approved' ? 'claim.verifier_approved' : 'claim.verifier_denied';
  const projected = await projectClaimState(client, {
    ...projectBase,
    eventType: verdictEvent,
    payload: {
      from_state: 'verifier_review',
      to_state: input.outcome === 'approved' ? 'verifier_approved' : 'denied',
      trigger: input.outcome === 'approved' ? 'cycle_freeze_escalation_approve' : 'cycle_freeze_escalation_deny',
      actor: input.actor,
    },
  });

  const decision = await insertTrusteeDecisionRow(db, {
    ...input,
    phase: 'escalation_resolution',
    outcome: input.outcome,
    concealmentClauseVersionId,
  });
  return { decision, eventVersion: projected.eventVersion, claimState: projected.state, concealmentClauseVersionId };
}

// ── Commit (bulk claim.approved milestone, DB-only, AC5) ──────────────────────

export interface CommitCycleFreezeInput {
  pariwarId: PariwarId;
  /** The CLIENT-GENERATED idempotency key (AC5). */
  commitId: CycleFreezeCommitId;
  actorId: string;
  /** R5 commit-time display snapshot — ALREADY RESOLVED, non-empty. */
  actorDisplay: string;
  actor: ClaimEventActor;
  auditId?: string;
}

export interface CommitCycleFreezeResult {
  commit: CycleFreezeCommitRow;
  committedClaimIds: string[];
  /** True when this reflects a re-submitted (idempotent) commit rather than a fresh one. */
  idempotentReplay: boolean;
}

/** A per-Pariwar bounded cap on one commit's candidate batch (clamped through the domain limit-clamp gate —
 *  mirrors `PENDING_SCAN_CAP`; an unusually large freeze cycle needs multiple commit calls, not one huge tx). */
const COMMIT_BATCH_CAP = 500;

/**
 * COMMIT the cycle freeze (AC5) — DB WORK ONLY. In one scope-tx: idempotency-check the client-generated
 * commit_id (an existing record ⇒ a natural no-op replay, advances nothing, re-fires nothing); else select
 * the committable set (claims in state_trustee_approved NOT carrying a live routed_to_r9 routing row —
 * AC4's durable exclusion), and per claim (advisory-locked, state + routing re-checked under the lock)
 * emit claim.approved (→ approved) + insert a phase='commit' metadata row, then write the durable
 * cycle_freeze_commits record. A claim already `approved` is a natural no-op (the write-path state guard).
 * It does NOT invoke the pool-spawn trigger — that is the HANDLER's post-commit job (AC6, other suggestion #1).
 */
export async function commitCycleFreeze(
  client: pg.PoolClient,
  input: CommitCycleFreezeInput,
): Promise<CommitCycleFreezeResult> {
  const db = bindScopedDb(client);

  // Idempotency: an existing record for this commit_id ⇒ replay (advance nothing, re-fire nothing). This
  // check-then-insert is NOT atomic on its own — a concurrent identical retry is resolved below via
  // `onConflictDoNothing` on the final insert rather than relying on this read alone.
  const existing = (
    await db
      .select()
      .from(cycleFreezeCommits)
      .where(and(eq(cycleFreezeCommits.pariwarId, input.pariwarId), eq(cycleFreezeCommits.commitId, input.commitId)))
  )[0];
  if (existing) {
    // Idempotency-ownership guard (review addendum): a genuine retry of the SAME attempt is always the
    // SAME actor's own session resubmitting; an actor mismatch means this commit_id was never this
    // caller's to reuse — reject rather than silently handing back someone else's committed result.
    if (existing.actorId !== input.actorId) {
      throw new CommitIdOwnershipConflictError(input.commitId);
    }
    return { commit: existing, committedClaimIds: existing.committedClaimIds, idempotentReplay: true };
  }

  // The committable set: state_trustee_approved claims, EXCLUDING any carrying a live routed_to_r9 row
  // (AC4's durable persisted exclusion — a subquery predicate, never an in-memory filter). Ordered +
  // capped: a stable claim-id order avoids a lock-order deadlock against a concurrent commit, and the cap
  // (clamped through the domain limit-clamp gate) bounds one commit's batch size.
  // Story 6.18 (AC11) — the exclusion set is now TWO phases, not one: a claim routed to R9 OR a claim
  // UNDER CORRECTION is uncommittable. ⭐ This is ⛔ NOT an attestation backstop (AC4 stays per-path);
  // it says *"do ⛔ not commit a claim that is under correction"*, and it is precisely what closes the
  // vote→commit window AC5 opens — a helpline correction is legal while a return is live, so without
  // this a claim could be corrected out from under a completed vote and then committed on a check
  // that no longer describes its accounts.
  const liveExcluded = db
    .select({ claimCaseId: claimStateTrusteeDecisions.claimCaseId })
    .from(claimStateTrusteeDecisions)
    .where(
      and(
        eq(claimStateTrusteeDecisions.pariwarId, input.pariwarId),
        inArray(claimStateTrusteeDecisions.phase, ['routing', 'correction_return']),
        inArray(claimStateTrusteeDecisions.outcome, ['routed_to_r9', 'returned_for_correction']),
        isNull(claimStateTrusteeDecisions.supersededAt),
      ),
    );
  const candidates = await db
    .select({
      claimCaseId: claims.claimCaseId,
      deceasedMemberId: claims.deceasedMemberId,
      intakeChannels: claims.intakeChannels,
      claimantActorId: claims.claimantActorId,
    })
    .from(claims)
    .where(
      and(
        eq(claims.pariwarId, input.pariwarId),
        eq(claims.currentState, 'state_trustee_approved'),
        notInArray(claims.claimCaseId, liveExcluded),
      ),
    )
    .orderBy(claims.claimCaseId)
    .limit(clampLimit(COMMIT_BATCH_CAP, { default: COMMIT_BATCH_CAP, cap: COMMIT_BATCH_CAP }));

  const committedClaimIds: string[] = [];
  for (const candidate of candidates) {
    await acquireTrusteeLock(client, input.pariwarId, candidate.claimCaseId);
    // Re-read under the lock — a concurrent action may have moved it since the set was selected.
    const locked = await lockClaim(db, input.pariwarId, candidate.claimCaseId);
    if (!locked || locked.currentState !== 'state_trustee_approved') continue;
    // Re-check the durable routing exclusion under the lock too — a concurrent route-to-R9 may have landed
    // after the candidate set was selected but before this claim's lock was acquired (AC4 must hold at
    // commit time, not just at select time).
    if (await hasLiveRoutedRow(db, input.pariwarId, candidate.claimCaseId)) continue;
    // Story 6.18 (AC11) — the same re-check for a claim under correction: a Pariwar Admin may have
    // returned it after the candidate set was selected but before this claim's lock was acquired.
    if (await hasLiveReturnRow(db, input.pariwarId, candidate.claimCaseId)) continue;

    await projectClaimState(client, {
      claimCaseId: candidate.claimCaseId,
      pariwarId: input.pariwarId,
      deceasedMemberId: candidate.deceasedMemberId,
      intakeChannels: candidate.intakeChannels,
      claimantActorId: candidate.claimantActorId,
      eventType: 'claim.approved',
      payload: {
        from_state: 'state_trustee_approved',
        to_state: 'approved',
        trigger: 'cycle_freeze_commit',
        actor: input.actor,
      },
      actorId: input.actorId,
      ...(input.auditId !== undefined ? { auditId: input.auditId } : {}),
    });
    try {
      await insertTrusteeDecisionRow(db, {
        claimCaseId: candidate.claimCaseId,
        pariwarId: input.pariwarId,
        reasonCode: null,
        rationaleCiphertext: null,
        actorId: input.actorId,
        actorDisplay: input.actorDisplay,
        actor: input.actor,
        phase: 'commit',
        outcome: 'approved',
        ...(input.auditId !== undefined ? { auditId: input.auditId } : {}),
      });
    } catch (err) {
      // A conflicting live 'commit' row already exists for this claim (partial-unique 23505) — the
      // lifecycle event above already fired (the claim IS now approved); treat the metadata row as
      // already recorded rather than aborting the whole batch (matches the sibling writers' catch-and-map
      // posture, and keeps this loop's per-claim work from being all-or-nothing).
      if (!isUniqueViolation(err)) throw err;
    }
    committedClaimIds.push(candidate.claimCaseId);
  }

  // Insert the durable commit record. `onConflictDoNothing` resolves a concurrent identical `commit_id`
  // retry racing past the idempotency check above: the loser re-selects the winner's row instead of
  // raw-failing on the primary-key 23505.
  const commitRows = await db
    .insert(cycleFreezeCommits)
    .values({
      commitId: input.commitId,
      pariwarId: input.pariwarId,
      actorId: input.actorId,
      actorDisplay: input.actorDisplay,
      committedClaimIds,
      triggerDelivered: false,
    })
    .onConflictDoNothing({ target: cycleFreezeCommits.commitId })
    .returning();
  if (commitRows.length > 0) {
    return { commit: commitRows[0]!, committedClaimIds, idempotentReplay: false };
  }
  // We lost the insert race — either a genuine concurrent same-Pariwar retry (the common case: re-select
  // finds it, apply the same ownership guard as the up-front replay check), or the global commit_id PK
  // collided with a row OUTSIDE this Pariwar's scope (the re-select finds nothing under our own scope —
  // fail loud instead of a raw non-null-assertion crash).
  const winner = (
    await db
      .select()
      .from(cycleFreezeCommits)
      .where(and(eq(cycleFreezeCommits.pariwarId, input.pariwarId), eq(cycleFreezeCommits.commitId, input.commitId)))
  )[0];
  if (!winner) {
    throw new CommitIdCollisionError(input.commitId);
  }
  if (winner.actorId !== input.actorId) {
    throw new CommitIdOwnershipConflictError(input.commitId);
  }
  return { commit: winner, committedClaimIds: winner.committedClaimIds, idempotentReplay: true };
}

// ── Read-back helpers the commit handler + post-commit trigger need ────────────

/**
 * The trigger-fire critical section's lock key (a DISTINCT namespace prefix from the per-claim
 * `state_trustee_decision:` lock). `pg_try_advisory_lock`/`pg_advisory_unlock` are SESSION-scoped (not
 * `_xact_`) — deliberately, because the caller holds this across the injected `PoolSpawnTrigger`'s external
 * call, which outlives any single DB transaction (review addendum, 2026-07-13, fixing a race the redelivery
 * fix above introduced: without this lock, two concurrent requests for the SAME commit_id could both read
 * `trigger_delivered = false` and both invoke the trigger).
 */
function cycleFreezeTriggerLockKey(commitId: string): bigint {
  const hex = createHash('sha256').update(`cycle_freeze_commit_trigger:${commitId}`).digest('hex');
  return BigInt(`0x${hex.slice(0, 15)}`);
}

/** Non-blocking: true iff the lock was acquired on `client`. The caller MUST release it on the SAME client
 *  via `releaseCommitTriggerLock` when done (success or failure) — a session lock, not tied to a transaction. */
export async function tryAcquireCommitTriggerLock(client: pg.PoolClient, commitId: string): Promise<boolean> {
  const rows = await client.query<{ locked: boolean }>(
    'SELECT pg_try_advisory_lock($1) AS locked',
    [cycleFreezeTriggerLockKey(commitId).toString()],
  );
  return rows.rows[0]?.locked === true;
}

/** Release a lock acquired by `tryAcquireCommitTriggerLock` on the SAME client. */
export async function releaseCommitTriggerLock(client: pg.PoolClient, commitId: string): Promise<void> {
  await client.query('SELECT pg_advisory_unlock($1)', [cycleFreezeTriggerLockKey(commitId).toString()]);
}

/** A FRESH (non-cached) read of one commit's `trigger_delivered` flag — used inside the trigger lock, since
 *  the caller's own `commitCycleFreeze` result may be stale by the time it reaches that critical section. */
export async function getCycleFreezeCommitTriggerDelivered(
  db: Db,
  pariwarId: PariwarId,
  commitId: CycleFreezeCommitId,
): Promise<boolean | null> {
  const rows = await db
    .select({ triggerDelivered: cycleFreezeCommits.triggerDelivered })
    .from(cycleFreezeCommits)
    .where(and(eq(cycleFreezeCommits.pariwarId, pariwarId), eq(cycleFreezeCommits.commitId, commitId)));
  return rows[0]?.triggerDelivered ?? null;
}

/** The frozen `{claimCaseId, deceasedMemberId}` refs the pool-spawn trigger payload needs (AC6). Scope-safe. */
export async function getFrozenClaimRefs(
  db: Db,
  pariwarId: PariwarId,
  claimCaseIds: readonly string[],
): Promise<Array<{ claimCaseId: string; deceasedMemberId: string }>> {
  if (claimCaseIds.length === 0) return [];
  const rows = await db
    .select({ claimCaseId: claims.claimCaseId, deceasedMemberId: claims.deceasedMemberId })
    .from(claims)
    .where(and(eq(claims.pariwarId, pariwarId), inArray(claims.claimCaseId, [...claimCaseIds] as ClaimId[])));
  return rows.map((r) => ({ claimCaseId: r.claimCaseId, deceasedMemberId: r.deceasedMemberId }));
}

/** Flip `cycle_freeze_commits.trigger_delivered = true` after the post-commit trigger fires (AC6). Best-
 *  effort + idempotent: a redelivery re-runs harmlessly. Takes a raw client (its own scope-tx). */
export async function markCycleFreezeTriggerDelivered(
  client: pg.PoolClient,
  pariwarId: PariwarId,
  commitId: CycleFreezeCommitId,
): Promise<void> {
  const db = bindScopedDb(client);
  await db
    .update(cycleFreezeCommits)
    .set({ triggerDelivered: true })
    .where(and(eq(cycleFreezeCommits.pariwarId, pariwarId), eq(cycleFreezeCommits.commitId, commitId)));
}
