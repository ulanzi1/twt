// Verifier-adjudication persistence writers — Story 6.11 (Task 4, domain side). Transport-free.
//
// The two-authority WRITE (AC0): every adjudication writes BOTH the `claim.verifier_*` LIFECYCLE event
// (via projectClaimState — the sole claims.current_state writer, the LIFECYCLE authority) AND the
// `claim_verifier_decisions` DECISION-METADATA row (reason-code, rationale ciphertext, actor_display
// snapshot — the DECISION-METADATA authority), in ONE scope-tx so they can never diverge. Neither is a
// projection of the other. Claim STATE is ALWAYS derived from event replay, NEVER from the decision row.
//
// CONCURRENCY (AC9): every verb first takes a transaction-scoped advisory lock on (pariwarId,
// claimCaseId) (the intake precedent) so concurrent decisions on one claim serialize; the write-path
// state guard then makes a second verdict find the claim no longer in `verifier_review` (natural
// idempotency); the events_log `(stream_id, event_version)` unique index + the decision table's
// partial-unique `(claim_case_id) WHERE superseded_at IS NULL` are the structural backstops.
//
// PII: the rationale is ALREADY ENCRYPTED by the CALLER (the route encrypts before the writer — the
// 6.7/6.8 posture); the writer takes ciphertext (or null). The `actorDisplay` is ALREADY RESOLVED by the
// caller server-side (R5) — a non-empty snapshot; the writer never resolves it and never falls back.
//
// The write-path guards live here (the reducer stays TOTAL — never encode a business precondition in
// it; the ground-inspection/nominee-bank lesson). NOT surfaced at the top-level barrel (claim namespace
// only); the route maps these typed errors to stable 4xx codes.

import { createHash } from 'node:crypto';

import { and, eq, isNull, sql } from 'drizzle-orm';
import type pg from 'pg';

import { bindScopedDb, type Db } from '../db.js';
import type { ClaimId, PariwarId, VerifierDecisionId } from '../ids/index.js';
import { claims } from '../schema/claims.js';
import {
  type ClaimVerifierDecisionRow,
  claimVerifierDecisions,
} from '../schema/claim_verifier_decisions.js';
import { type ClaimEventActor } from './events.js';
import { projectClaimState } from './project.js';
import {
  isReasonCodeValidForOutcome,
  type VerifierDecisionOutcome,
  type VerifierReasonCode,
} from './verifier-decision.js';

// ── State windows (the write-path allowlists) ─────────────────────────────────

/** The pre-verdict states escalation is valid from (D-D, AC3) — an escalate NEVER auto-enters review. */
export const VERIFIER_ESCALATABLE_STATES = ['verification_in_progress', 'verifier_review'] as const;

/** The post-verdict, pre-freeze window a decision may be REVISED in (D-E, AC5). */
export const VERIFIER_DECISION_REVISABLE_STATES = ['verifier_approved', 'denied'] as const;

// ── Typed write-path guards (the route maps each to a stable 4xx) ─────────────

/** Thrown by approve/deny when the claim is not (and cannot enter) `verifier_review` (D-C, AC2). */
export class ClaimNotInVerifierReviewError extends Error {
  public readonly name = 'ClaimNotInVerifierReviewError';
  public constructor(
    public readonly claimCaseId: string,
    public readonly currentState: string,
  ) {
    super(
      `[verifier-decision] claim ${claimCaseId} is '${currentState}' — cannot approve/deny (not in verifier_review)`,
    );
  }
}

/** Thrown by escalate when the claim is outside `{verification_in_progress, verifier_review}` (D-D, AC3). */
export class ClaimNotEscalatableError extends Error {
  public readonly name = 'ClaimNotEscalatableError';
  public constructor(
    public readonly claimCaseId: string,
    public readonly currentState: string,
  ) {
    super(
      `[verifier-decision] claim ${claimCaseId} is '${currentState}' — not escalatable (must be pre-verdict)`,
    );
  }
}

/** Why a revision was rejected — drives the route's clear error message (AC5). */
export type DecisionNotRevisableReason = 'out_of_window' | 'no_live_decision' | 'cross_outcome';

/** Thrown by revise when the claim is out of the post-verdict pre-freeze window, has no live decision,
 *  or the requested outcome differs from the live decision's (cross-outcome reversal is Story 6.16). */
export class ClaimDecisionNotRevisableError extends Error {
  public readonly name = 'ClaimDecisionNotRevisableError';
  public constructor(
    public readonly claimCaseId: string,
    public readonly reason: DecisionNotRevisableReason,
    public readonly detail: string,
  ) {
    super(`[verifier-decision] claim ${claimCaseId} decision not revisable (${reason}): ${detail}`);
  }
}

/** Thrown when the reason-code is incompatible with the outcome (AC8 — domain defense-in-depth behind
 *  the contract superRefine). A mismatched combination must never persist even if the contract is bypassed. */
export class ReasonCodeOutcomeMismatchError extends Error {
  public readonly name = 'ReasonCodeOutcomeMismatchError';
  public constructor(
    public readonly outcome: string,
    public readonly reasonCode: string,
  ) {
    super(`[verifier-decision] reason code '${reasonCode}' is not valid for outcome '${outcome}'`);
  }
}

/** Thrown when a concurrent revision already superseded the target decision (0-row conditional UPDATE)
 *  — the loser aborts (409); the partial-unique index is the second backstop (AC5/AC9). */
export class DecisionRevisionConflictError extends Error {
  public readonly name = 'DecisionRevisionConflictError';
  public constructor(public readonly claimCaseId: string) {
    super(`[verifier-decision] claim ${claimCaseId} revision lost a concurrent race — decision already superseded`);
  }
}

/** Thrown when no claim row exists for the id the writer targets (tenant-scoped miss). */
export class VerifierDecisionClaimNotFoundError extends Error {
  public readonly name = 'VerifierDecisionClaimNotFoundError';
  public constructor(public readonly claimCaseId: string) {
    super(`[verifier-decision] no claim found for id ${claimCaseId} in scope`);
  }
}

/** Thrown by approve/deny/escalate when the claim already carries a LIVE (non-superseded) decision row
 *  — escalating twice, or adjudicating a claim that was already escalated. Escalate is terminal-for-write
 *  (D-D keeps it a standalone identity annotation, not something a later approve/deny supersedes); the
 *  claim state alone does not guard this because escalate never changes it. Only `reviseDecision` may
 *  supersede a live row. Route maps this to 409. */
export class ClaimDecisionConflictError extends Error {
  public readonly name = 'ClaimDecisionConflictError';
  public constructor(
    public readonly claimCaseId: string,
    public readonly existingOutcome: string,
  ) {
    super(
      `[verifier-decision] claim ${claimCaseId} already has a live decision (outcome '${existingOutcome}') — cannot record another without revising`,
    );
  }
}

/** True iff `err` (or its wrapped cause) is a Postgres unique-violation (23505) — the defense-in-depth
 *  backstop behind the app-level live-decision check above (same race class as `receipt-write.ts` /
 *  `niyamavali/write.ts`). */
function isUniqueViolation(err: unknown): boolean {
  const direct = (err as { code?: string }).code;
  const cause = (err as { cause?: { code?: string } }).cause?.code;
  return direct === '23505' || cause === '23505';
}

// ── Advisory lock + claim row lock helpers ────────────────────────────────────

/**
 * The transaction-scoped advisory-lock key for one claim's adjudication (AC9). Postgres advisory locks
 * take a bigint — derive a stable one from the (pariwarId, claimCaseId) pair via a truncated SHA-256
 * (the `intakeAdvisoryLockKey` precedent; a distinct namespace prefix keeps it from colliding with the
 * intake lock, which keys on deceasedMemberId).
 */
export function verifierDecisionAdvisoryLockKey(pariwarId: string, claimCaseId: string): bigint {
  const hex = createHash('sha256').update(`verifier_decision:${pariwarId}:${claimCaseId}`).digest('hex');
  // 15 hex chars (60 bits) → always positive, safely inside Postgres' signed bigint advisory-lock arg.
  return BigInt(`0x${hex.slice(0, 15)}`);
}

/** Acquire the tx-scoped advisory lock for a claim's adjudication (released on COMMIT/ROLLBACK). */
async function acquireDecisionLock(
  client: pg.PoolClient,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
): Promise<void> {
  await client.query('SELECT pg_advisory_xact_lock($1)', [
    verifierDecisionAdvisoryLockKey(pariwarId, claimCaseId).toString(),
  ]);
}

/** Lock the claim row (`SELECT … FOR UPDATE`) to serialize concurrent edits + read its state. */
async function lockClaim(db: Db, pariwarId: PariwarId, claimCaseId: ClaimId) {
  const rows = await db
    .select()
    .from(claims)
    .where(and(eq(claims.pariwarId, pariwarId), eq(claims.claimCaseId, claimCaseId)))
    .for('update');
  return rows[0];
}

// ── Inputs / results ──────────────────────────────────────────────────────────

interface DecisionWriteBase {
  claimCaseId: ClaimId;
  pariwarId: PariwarId;
  reasonCode: VerifierReasonCode;
  /** ALREADY-ENCRYPTED Tier-1 rationale ciphertext (the route encrypts before the writer); null when
   *  no rationale was given (the writer/contract enforce required-on-other/deny, not the column). */
  rationaleCiphertext: string | null;
  /** The acting verifier's actor id (audit; non-PII query/join key). */
  actorId: string;
  /** The decision-time SNAPSHOT of the actor's display name (R5/AC7) — ALREADY RESOLVED, non-empty. */
  actorDisplay: string;
  /** Who caused the event (`operator` for the admin adjudication path). */
  actor: ClaimEventActor;
  auditId?: string;
}

export interface AdjudicateClaimInput extends DecisionWriteBase {
  /** `approved` or `denied` (escalate has its own writer). */
  outcome: 'approved' | 'denied';
}

export interface EscalateClaimInput extends DecisionWriteBase {
  outcome?: 'escalated';
}

export interface ReviseDecisionInput extends DecisionWriteBase {
  /** The SAME outcome as the live decision (cross-outcome reversal is Story 6.16). */
  outcome: VerifierDecisionOutcome;
  /** Optional client assertion of which decision it believes it is revising (must match the live row). */
  supersedesDecisionId?: VerifierDecisionId;
}

export interface VerifierDecisionResult {
  decision: ClaimVerifierDecisionRow;
  eventVersion: number;
  /** The claim's lifecycle state AFTER the decision (verdict advances it; escalate/revise leave it). */
  claimState: string;
}

// ── Shared decision-row insert ────────────────────────────────────────────────

/** The claim's LIVE (non-superseded) decision row, if any (partial-unique guarantees ≤1). Scope-safe
 *  (RLS + explicit predicate) — shared by the pre-write conflict check and `reviseDecision`. */
async function getLiveDecision(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
): Promise<ClaimVerifierDecisionRow | undefined> {
  const rows = await db
    .select()
    .from(claimVerifierDecisions)
    .where(
      and(
        eq(claimVerifierDecisions.pariwarId, pariwarId),
        eq(claimVerifierDecisions.claimCaseId, claimCaseId),
        isNull(claimVerifierDecisions.supersededAt),
      ),
    );
  return rows[0];
}

async function insertDecisionRow(
  db: Db,
  input: DecisionWriteBase & {
    outcome: VerifierDecisionOutcome;
    supersedesDecisionId?: VerifierDecisionId | null;
  },
): Promise<ClaimVerifierDecisionRow> {
  const rows = await db
    .insert(claimVerifierDecisions)
    .values({
      claimCaseId: input.claimCaseId,
      pariwarId: input.pariwarId,
      outcome: input.outcome,
      reasonCode: input.reasonCode,
      rationaleCiphertext: input.rationaleCiphertext,
      actorId: input.actorId,
      actorDisplay: input.actorDisplay,
      ...(input.supersedesDecisionId != null ? { supersedesDecisionId: input.supersedesDecisionId } : {}),
    })
    .returning();
  return rows[0]!;
}

// ── Approve / Deny (the verdict path, D-C) ────────────────────────────────────

/**
 * Record a verifier APPROVE or DENY decision (AC2). In one scope-tx (the caller owns BEGIN +
 * setPariwarScope): advisory-lock the claim, row-lock + read its state, re-check reason↔outcome compat
 * (AC8 defense-in-depth), auto-emit `claim.verifier_reviewing` when the claim is still
 * `verification_in_progress` (D-C — enter review in the write path, not a separate step), assert it is
 * now `verifier_review` (else `ClaimNotInVerifierReviewError`), emit the verdict event
 * (`claim.verifier_approved`/`denied`, auditShape only), and insert the decision row — the two
 * authorities in ONE tx (AC0). Takes a raw `pg.PoolClient` (projectClaimState needs `SET LOCAL`).
 */
export async function adjudicateClaim(
  client: pg.PoolClient,
  input: AdjudicateClaimInput,
): Promise<VerifierDecisionResult> {
  if (!isReasonCodeValidForOutcome(input.outcome, input.reasonCode)) {
    throw new ReasonCodeOutcomeMismatchError(input.outcome, input.reasonCode);
  }
  await acquireDecisionLock(client, input.pariwarId, input.claimCaseId);
  const db = bindScopedDb(client);

  const claimRow = await lockClaim(db, input.pariwarId, input.claimCaseId);
  if (!claimRow) throw new VerifierDecisionClaimNotFoundError(input.claimCaseId);

  // A live decision already exists (e.g. the claim was escalated) — state alone doesn't guard this
  // because escalate never changes claim state. Fail fast, before any write (only revise may supersede).
  const existingLive = await getLiveDecision(db, input.pariwarId, input.claimCaseId);
  if (existingLive) {
    throw new ClaimDecisionConflictError(input.claimCaseId, existingLive.outcome);
  }

  // (a) Enter review in the write path when still gathering signals (D-C) — approve/deny ONLY.
  if (claimRow.currentState === 'verification_in_progress') {
    await projectClaimState(client, {
      claimCaseId: input.claimCaseId,
      pariwarId: input.pariwarId,
      deceasedMemberId: claimRow.deceasedMemberId,
      intakeChannels: claimRow.intakeChannels,
      claimantActorId: claimRow.claimantActorId,
      eventType: 'claim.verifier_reviewing',
      payload: {
        from_state: 'verification_in_progress',
        to_state: 'verifier_review',
        trigger: 'verifier_console_enter_review',
        actor: input.actor,
      },
      actorId: input.actorId,
      ...(input.auditId !== undefined ? { auditId: input.auditId } : {}),
    });
  } else if (claimRow.currentState !== 'verifier_review') {
    // Any state that is neither the gathering window nor review — reject (the natural idempotency for
    // a re-submitted verdict: after the first approve the claim is `verifier_approved`, not review).
    throw new ClaimNotInVerifierReviewError(input.claimCaseId, claimRow.currentState);
  }

  // (b) Emit the verdict event (auditShape only — reason/rationale live in the decision row, D-G).
  const verdictEvent = input.outcome === 'approved' ? 'claim.verifier_approved' : 'claim.verifier_denied';
  const projected = await projectClaimState(client, {
    claimCaseId: input.claimCaseId,
    pariwarId: input.pariwarId,
    deceasedMemberId: claimRow.deceasedMemberId,
    intakeChannels: claimRow.intakeChannels,
    claimantActorId: claimRow.claimantActorId,
    eventType: verdictEvent,
    payload: {
      from_state: 'verifier_review',
      to_state: input.outcome === 'approved' ? 'verifier_approved' : 'denied',
      trigger: input.outcome === 'approved' ? 'verifier_console_approve' : 'verifier_console_deny',
      actor: input.actor,
    },
    actorId: input.actorId,
    ...(input.auditId !== undefined ? { auditId: input.auditId } : {}),
  });

  // (c) Insert the DECISION-METADATA row in the SAME tx (AC0 — two authorities, never diverge). The
  // pre-check above handles the normal case; catching 23505 here is the defense-in-depth backstop.
  let decision: ClaimVerifierDecisionRow;
  try {
    decision = await insertDecisionRow(db, { ...input, outcome: input.outcome });
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new ClaimDecisionConflictError(input.claimCaseId, 'unknown');
    }
    throw err;
  }
  return { decision, eventVersion: projected.eventVersion, claimState: projected.state };
}

// ── Escalate (its own annotation + guard, D-D) ────────────────────────────────

/**
 * Record a verifier ESCALATION to the State Trustee (AC3). Its OWN state-window guard
 * (`{verification_in_progress, verifier_review}`) — it does NOT auto-emit `verifier_reviewing`
 * (escalating is not "entering review"; contrast approve/deny). Emits the `claim.verifier_escalated`
 * identity annotation + inserts a decision row with outcome `escalated` (excluded from resolved
 * precedents, AC6). No lifecycle-state change, no queue mutation (6.12/6.13 own the State queue).
 */
export async function escalateClaim(
  client: pg.PoolClient,
  input: EscalateClaimInput,
): Promise<VerifierDecisionResult> {
  if (!isReasonCodeValidForOutcome('escalated', input.reasonCode)) {
    throw new ReasonCodeOutcomeMismatchError('escalated', input.reasonCode);
  }
  await acquireDecisionLock(client, input.pariwarId, input.claimCaseId);
  const db = bindScopedDb(client);

  const claimRow = await lockClaim(db, input.pariwarId, input.claimCaseId);
  if (!claimRow) throw new VerifierDecisionClaimNotFoundError(input.claimCaseId);

  if (!(VERIFIER_ESCALATABLE_STATES as readonly string[]).includes(claimRow.currentState)) {
    throw new ClaimNotEscalatableError(input.claimCaseId, claimRow.currentState);
  }

  // A live decision already exists (e.g. a prior escalate, or approve/deny — state alone doesn't guard
  // this since escalate never changes claim state). Fail fast, before any write.
  const existingLive = await getLiveDecision(db, input.pariwarId, input.claimCaseId);
  if (existingLive) {
    throw new ClaimDecisionConflictError(input.claimCaseId, existingLive.outcome);
  }

  const projected = await projectClaimState(client, {
    claimCaseId: input.claimCaseId,
    pariwarId: input.pariwarId,
    deceasedMemberId: claimRow.deceasedMemberId,
    intakeChannels: claimRow.intakeChannels,
    claimantActorId: claimRow.claimantActorId,
    eventType: 'claim.verifier_escalated',
    payload: {
      // Identity — no state change (the reducer has no `escalated` state).
      from_state: claimRow.currentState,
      to_state: claimRow.currentState,
      trigger: 'verifier_console_escalate',
      actor: input.actor,
    },
    actorId: input.actorId,
    ...(input.auditId !== undefined ? { auditId: input.auditId } : {}),
  });

  // The pre-check above handles the normal case; catching 23505 here is the defense-in-depth backstop.
  let decision: ClaimVerifierDecisionRow;
  try {
    decision = await insertDecisionRow(db, { ...input, outcome: 'escalated' });
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new ClaimDecisionConflictError(input.claimCaseId, 'unknown');
    }
    throw err;
  }
  return { decision, eventVersion: projected.eventVersion, claimState: projected.state };
}

// ── Revise (same-outcome correction + atomic supersession, D-E) ───────────────

/**
 * REVISE a prior SAME-outcome decision's reason-code/rationale (AC5). Guards the post-verdict pre-freeze
 * window (`{verifier_approved, denied}`), resolves the claim's LIVE decision (partial-unique — at most
 * one), requires the requested outcome to equal the live decision's (cross-outcome reversal is Story
 * 6.16), then ATOMICALLY supersedes it: a conditional `UPDATE … SET superseded_at = now() WHERE
 * decision_id = $target AND superseded_at IS NULL RETURNING` (0 rows ⇒ a concurrent revise already won ⇒
 * `DecisionRevisionConflictError` 409), inserts the new row (`supersedes_decision_id = $target`; the
 * partial-unique index is the backstop), and emits the `claim.verifier_decision_revised` identity
 * annotation (NOT a verdict re-emit — claim state is unchanged). The route adds requireStepUp.
 */
export async function reviseDecision(
  client: pg.PoolClient,
  input: ReviseDecisionInput,
): Promise<VerifierDecisionResult> {
  if (!isReasonCodeValidForOutcome(input.outcome, input.reasonCode)) {
    throw new ReasonCodeOutcomeMismatchError(input.outcome, input.reasonCode);
  }
  await acquireDecisionLock(client, input.pariwarId, input.claimCaseId);
  const db = bindScopedDb(client);

  const claimRow = await lockClaim(db, input.pariwarId, input.claimCaseId);
  if (!claimRow) throw new VerifierDecisionClaimNotFoundError(input.claimCaseId);

  if (!(VERIFIER_DECISION_REVISABLE_STATES as readonly string[]).includes(claimRow.currentState)) {
    throw new ClaimDecisionNotRevisableError(
      input.claimCaseId,
      'out_of_window',
      `claim is '${claimRow.currentState}', not in {verifier_approved, denied}`,
    );
  }

  // The LIVE decision for this claim (partial-unique guarantees ≤1).
  const live = await getLiveDecision(db, input.pariwarId, input.claimCaseId);
  if (!live) {
    throw new ClaimDecisionNotRevisableError(
      input.claimCaseId,
      'no_live_decision',
      'no live decision exists to revise',
    );
  }
  // Same-outcome only — cross-outcome reversal (e.g. denied → approved) stays Story 6.16 (appeal).
  if (live.outcome !== input.outcome) {
    throw new ClaimDecisionNotRevisableError(
      input.claimCaseId,
      'cross_outcome',
      `revision must keep the same outcome '${live.outcome}' — cross-outcome reversal is Story 6.16 (appeal)`,
    );
  }
  // Optional client optimistic assertion: the decision it thinks it is revising must be the live one.
  if (input.supersedesDecisionId != null && input.supersedesDecisionId !== live.decisionId) {
    throw new DecisionRevisionConflictError(input.claimCaseId);
  }

  // Atomic supersession — 0 rows ⇒ a concurrent revise already superseded the target ⇒ conflict (409).
  const superseded = await db
    .update(claimVerifierDecisions)
    .set({ supersededAt: sql`now()` })
    .where(
      and(
        eq(claimVerifierDecisions.decisionId, live.decisionId),
        isNull(claimVerifierDecisions.supersededAt),
      ),
    )
    .returning({ decisionId: claimVerifierDecisions.decisionId });
  if (superseded.length === 0) {
    throw new DecisionRevisionConflictError(input.claimCaseId);
  }

  // Insert the new live row linked to its predecessor (the partial-unique index is the second backstop).
  // A revise submitted with NO rationale means "this correction doesn't touch it" — carry the prior
  // rationale forward rather than silently nulling it out (a reason-code-only correction must not erase
  // a previously recorded rationale).
  const decision = await insertDecisionRow(db, {
    ...input,
    outcome: input.outcome,
    rationaleCiphertext: input.rationaleCiphertext ?? live.rationaleCiphertext,
    supersedesDecisionId: live.decisionId,
  });

  // The dedicated identity annotation — NOT a re-emit of the verdict; claim state is unchanged (D-E).
  const projected = await projectClaimState(client, {
    claimCaseId: input.claimCaseId,
    pariwarId: input.pariwarId,
    deceasedMemberId: claimRow.deceasedMemberId,
    intakeChannels: claimRow.intakeChannels,
    claimantActorId: claimRow.claimantActorId,
    eventType: 'claim.verifier_decision_revised',
    payload: {
      from_state: claimRow.currentState,
      to_state: claimRow.currentState,
      trigger: 'verifier_console_revise_decision',
      actor: input.actor,
    },
    actorId: input.actorId,
    ...(input.auditId !== undefined ? { auditId: input.auditId } : {}),
  });

  return { decision, eventVersion: projected.eventVersion, claimState: projected.state };
}
