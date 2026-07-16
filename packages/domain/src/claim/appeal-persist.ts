// Appeal single-decider persistence writers (Stage 1 + Stage 3) — Story 6.16 (Task 4). Transport-free.
//
// The three single-decider write paths (Stage 2's PANEL lives in appeal-panel-persist.ts):
//   · initiateAppeal      — initiate from `denied` (AC1). Inserts the claim_appeals anchor + emits
//     `claim.appeal_stage1_initiated` → `appeal_stage_1`. Idempotent/guarded: not-denied → AppealNotDenied;
//     prior journey → AppealAlreadyExhausted (D-F; the unconditional UNIQUE is the race backstop).
//   · reviewAppealStage1  — the District-Admin reviewer decision (AC2). Reverse OR do-not-reverse(advance)
//     ONLY (D-C — Stage 1 never terminally upholds in v1). Enforces the D-D reviewer-conflict at the DOMAIN
//     layer (`AppealReviewerConflictError`, the route enforces it too). On reverse → emit reviewed(reversed)
//     THEN claim.reversed (D-A) in the same tx + anchor status='reversed'; on advance → emit reviewed(advance)
//     → appeal_stage_2 + anchor current_stage='2'.
//   · decideAppealStage3  — the Trustee discretion decision, FINAL (AC4). The ONLY stage that may uphold
//     (D-C). On reverse → reviewed(reversed) + claim.reversed(3) + anchor status='reversed'; on uphold →
//     reviewed(upheld) → denied + claim.denied_no_appeal (the freeze-clearing terminal) + anchor
//     status='upheld_final'.
//
// The two-authority WRITE (AC9): every lifecycle-changing verb writes BOTH the `claim.appeal_*` event (via
// projectClaimState — the sole claims.current_state writer) AND the decision-metadata / anchor rows in ONE
// scope-tx so they can never diverge. Claim STATE is ALWAYS derived from event replay, NEVER the tables.
//
// CONCURRENCY (AC9): every verb takes a transaction-scoped advisory lock on (pariwarId, claimCaseId) on a
// DISTINCT namespace prefix `appeal:` (from the verifier/cycle-freeze/r9 locks); the write-path state guards +
// the events_log (stream_id, event_version) unique index + the appeal tables' partial-uniques are the
// structural backstops. The reducer stays TOTAL — every guard lives here, not in state.ts.
//
// PII: the rationale is ALREADY ENCRYPTED + BRANDED by the caller (PreparedAppealCiphertext). The
// reviewerDisplay is ALREADY RESOLVED server-side (R5) — non-empty; the writer never falls back.

import { createHash } from 'node:crypto';

import { and, eq, sql } from 'drizzle-orm';
import type pg from 'pg';

import { bindScopedDb, type Db } from '../db.js';
import type { ClaimId, PariwarId } from '../ids/index.js';
import { claims } from '../schema/claims.js';
import { claimAppeals, type ClaimAppealRow } from '../schema/claim_appeals.js';
import { claimAppealDecisions, type ClaimAppealDecisionRow } from '../schema/claim_appeal_decisions.js';
import {
  type AppealDispositionCategory,
  type AppealStage,
  type PreparedAppealCiphertext,
} from './appeal.js';
import {
  AppealAlreadyExhaustedError,
  assertAppealInitiable,
  getOriginalDeciderActorIds,
  isOriginalDecider,
} from './appeal-eligibility.js';
import { type ClaimEventActor } from './events.js';
import { projectClaimState } from './project.js';

// ── Typed write-path guards (the route maps each to a stable 4xx) ─────────────

/** Thrown when no claim row exists for the id the writer targets (tenant-scoped miss → 404). */
export class AppealClaimNotFoundError extends Error {
  public readonly name = 'AppealClaimNotFoundError';
  public constructor(public readonly claimCaseId: string) {
    super(`[appeal] no claim found for id ${claimCaseId} in scope`);
  }
}

/** Thrown by a stage review when the claim is not in the expected `appeal_stage_N` (→ 409). */
export class AppealStageMismatchError extends Error {
  public readonly name = 'AppealStageMismatchError';
  public constructor(
    public readonly claimCaseId: string,
    public readonly expectedStage: AppealStage,
    public readonly currentState: string,
  ) {
    super(
      `[appeal] claim ${claimCaseId} is '${currentState}' — cannot review at stage ${expectedStage} ` +
        `(claim not in 'appeal_stage_${expectedStage}')`,
    );
  }
}

/** Thrown by a stage review when the claim carries no live appeal-journey anchor (→ 409). */
export class AppealNoJourneyError extends Error {
  public readonly name = 'AppealNoJourneyError';
  public constructor(public readonly claimCaseId: string) {
    super(`[appeal] claim ${claimCaseId} has no appeal journey anchor — initiate the appeal first`);
  }
}

/** Thrown by Stage-1 review when the reviewer already adjudicated this claim (verifier / state-trustee /
 *  R9 voter — D-D). The Stage-1 reviewer must be independent of the original decision. Route → 409. */
export class AppealReviewerConflictError extends Error {
  public readonly name = 'AppealReviewerConflictError';
  public constructor(
    public readonly claimCaseId: string,
    public readonly reviewerActorId: string,
  ) {
    super(
      `[appeal] reviewer ${reviewerActorId} already adjudicated claim ${claimCaseId} (original verifier / ` +
        `state-trustee decider / R9 panel voter) — a Stage-1 appeal reviewer must be independent (D-D)`,
    );
  }
}

/** Thrown when the disposition_category presence rule is violated (D-A defense-in-depth behind the contract):
 *  it MUST be set on a `reversed` decision and MUST be absent on `advance`/`upheld`. Route → 400. */
export class AppealDispositionCategoryError extends Error {
  public readonly name = 'AppealDispositionCategoryError';
  public constructor(
    public readonly reason: 'required_on_reversed' | 'unexpected_on_non_reversed',
    public readonly decision: string,
  ) {
    super(
      reason === 'required_on_reversed'
        ? `[appeal] a disposition_category is required on a 'reversed' decision (D-A)`
        : `[appeal] a disposition_category must not be set on a '${decision}' decision (D-A — reversed only)`,
    );
  }
}

/** True iff `err` (or its wrapped cause) is a Postgres unique-violation (23505). */
function isUniqueViolation(err: unknown): boolean {
  const direct = (err as { code?: string }).code;
  const cause = (err as { cause?: { code?: string } }).cause?.code;
  return direct === '23505' || cause === '23505';
}

// ── Advisory lock + claim row lock helpers ────────────────────────────────────

/** The transaction-scoped advisory-lock key for one claim's appeal action (AC9). A DISTINCT namespace prefix
 *  (`appeal:`) from the verifier / cycle-freeze / r9 locks so the four never collide on one claim. */
export function appealAdvisoryLockKey(pariwarId: string, claimCaseId: string): bigint {
  const hex = createHash('sha256').update(`appeal:${pariwarId}:${claimCaseId}`).digest('hex');
  return BigInt(`0x${hex.slice(0, 15)}`);
}

async function acquireAppealLock(client: pg.PoolClient, pariwarId: PariwarId, claimCaseId: ClaimId): Promise<void> {
  await client.query('SELECT pg_advisory_xact_lock($1)', [appealAdvisoryLockKey(pariwarId, claimCaseId).toString()]);
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

/** The claim's appeal-journey anchor (the unconditional-unique guarantees ≤1), or undefined. */
async function getAnchor(db: Db, pariwarId: PariwarId, claimCaseId: ClaimId): Promise<ClaimAppealRow | undefined> {
  const rows = await db
    .select()
    .from(claimAppeals)
    .where(and(eq(claimAppeals.pariwarId, pariwarId), eq(claimAppeals.claimCaseId, claimCaseId)))
    .limit(1);
  return rows[0];
}

/** Assert the disposition_category presence rule (D-A): set iff `reversed`. */
function assertDisposition(decision: string, dispositionCategory: AppealDispositionCategory | null): void {
  if (decision === 'reversed') {
    if (dispositionCategory == null) throw new AppealDispositionCategoryError('required_on_reversed', decision);
  } else if (dispositionCategory != null) {
    throw new AppealDispositionCategoryError('unexpected_on_non_reversed', decision);
  }
}

// ── Inputs / results ──────────────────────────────────────────────────────────

export interface InitiateAppealInput {
  claimCaseId: ClaimId;
  pariwarId: PariwarId;
  /** The claimant actor, or the operator initiating on their behalf (AR-61). */
  initiatedByActor: string;
  /** True when an operator initiated on the claimant's behalf (AR-61 helpline fallback). */
  initiatedOnBehalf: boolean;
  /** Who caused the event (`member` self-initiate, or `operator` on-behalf). */
  actor: ClaimEventActor;
  auditId?: string;
}

export interface InitiateAppealResult {
  appeal: ClaimAppealRow;
  eventVersion: number;
  claimState: string;
}

interface AppealDecisionWriteBase {
  claimCaseId: ClaimId;
  pariwarId: PariwarId;
  /** The acting reviewer's actor id (audit; non-PII query/join key). */
  reviewerActorId: string;
  /** The R5 decision-time display SNAPSHOT — ALREADY RESOLVED server-side, non-empty. */
  reviewerDisplay: string;
  /** ALREADY-ENCRYPTED + BRANDED Tier-1 rationale ciphertext (mandatory). */
  rationaleCiphertext: PreparedAppealCiphertext;
  /** The bounded NON-PII disposition tag — required iff `decision === 'reversed'`, else null (D-A). */
  dispositionCategory: AppealDispositionCategory | null;
  /** Who caused the event (`operator` Stage 1 / `trustee` Stage 3). */
  actor: ClaimEventActor;
  auditId?: string;
}

export interface ReviewAppealStage1Input extends AppealDecisionWriteBase {
  /** Stage 1 outcome — reverse OR do-not-reverse(advance) ONLY (D-C — never `upheld` in v1). */
  decision: 'reversed' | 'advance';
}

export interface DecideAppealStage3Input extends AppealDecisionWriteBase {
  /** Stage 3 outcome — reverse OR uphold-final ONLY (the appealFinalDecisionSchema; no `advance`, D-C). */
  decision: 'reversed' | 'upheld';
}

export interface AppealDecisionResult {
  decision: ClaimAppealDecisionRow;
  /** The claim's lifecycle state AFTER the decision. */
  claimState: string;
  /** The appended reviewed-transition event version. */
  eventVersion: number;
  /** The appended claim.reversed publish-hook event version (only on a reversal; null otherwise). */
  reversedEventVersion: number | null;
}

// ── Shared writes ──────────────────────────────────────────────────────────────

/** Insert a claim_appeal_decisions row (the DECISION-METADATA authority). */
async function insertDecisionRow(
  db: Db,
  input: AppealDecisionWriteBase & { stage: AppealStage; decision: string },
): Promise<ClaimAppealDecisionRow> {
  const rows = await db
    .insert(claimAppealDecisions)
    .values({
      claimCaseId: input.claimCaseId,
      pariwarId: input.pariwarId,
      stage: input.stage,
      decision: input.decision as ClaimAppealDecisionRow['decision'],
      dispositionCategory: input.dispositionCategory,
      rationaleCiphertext: input.rationaleCiphertext,
      reviewerActorId: input.reviewerActorId,
      reviewerDisplay: input.reviewerDisplay,
    })
    .returning();
  return rows[0]!;
}

/** Emit the `claim.reversed` publish-hook event (D-A) in the SAME tx as the reviewed(reversed) transition —
 *  identity at `reversed`, non-PII (audit shape + reversed_at_stage + disposition_category ONLY). */
async function emitReversedHook(
  client: pg.PoolClient,
  claimRow: typeof claims.$inferSelect,
  base: { claimCaseId: ClaimId; pariwarId: PariwarId; actor: ClaimEventActor; actorId: string; auditId?: string },
  stage: 1 | 2 | 3,
  dispositionCategory: AppealDispositionCategory,
): Promise<number> {
  const projected = await projectClaimState(client, {
    claimCaseId: base.claimCaseId,
    pariwarId: base.pariwarId,
    deceasedMemberId: claimRow.deceasedMemberId,
    intakeChannels: claimRow.intakeChannels,
    claimantActorId: claimRow.claimantActorId,
    eventType: 'claim.reversed',
    payload: {
      from_state: 'reversed',
      to_state: 'reversed',
      trigger: `appeal_stage${stage}_reverse_publish_hook`,
      actor: base.actor,
      reversed_at_stage: stage,
      disposition_category: dispositionCategory,
    },
    actorId: base.actorId,
    ...(base.auditId !== undefined ? { auditId: base.auditId } : {}),
  });
  return projected.eventVersion;
}

// ── Initiate (AC1) ──────────────────────────────────────────────────────────────

/**
 * Initiate an appeal on a `denied` claim (AC1). In one scope-tx under the advisory lock: assert initiable
 * (denied + no prior journey, D-E/D-F), row-lock + read the claim, insert the claim_appeals anchor, emit
 * `claim.appeal_stage1_initiated` → `appeal_stage_1`. Records who initiated (+ on-behalf for AR-61). The
 * unconditional UNIQUE (claim_case_id) is the guard-bypass-race backstop (→ AppealAlreadyExhaustedError).
 */
export async function initiateAppeal(
  client: pg.PoolClient,
  input: InitiateAppealInput,
): Promise<InitiateAppealResult> {
  await acquireAppealLock(client, input.pariwarId, input.claimCaseId);
  const db = bindScopedDb(client);

  const claimRow = await lockClaim(db, input.pariwarId, input.claimCaseId);
  if (!claimRow) throw new AppealClaimNotFoundError(input.claimCaseId);

  // Guards: denied + no prior journey (D-E has NO elapsed-time gate; D-F exactly one journey).
  await assertAppealInitiable(db, input.pariwarId, input.claimCaseId);

  // Emit the initiate transition (denied → appeal_stage_1).
  const projected = await projectClaimState(client, {
    claimCaseId: input.claimCaseId,
    pariwarId: input.pariwarId,
    deceasedMemberId: claimRow.deceasedMemberId,
    intakeChannels: claimRow.intakeChannels,
    claimantActorId: claimRow.claimantActorId,
    eventType: 'claim.appeal_stage1_initiated',
    payload: {
      from_state: 'denied',
      to_state: 'appeal_stage_1',
      trigger: input.initiatedOnBehalf ? 'appeal_initiate_on_behalf' : 'appeal_initiate_self',
      actor: input.actor,
    },
    actorId: input.initiatedByActor,
    ...(input.auditId !== undefined ? { auditId: input.auditId } : {}),
  });

  // Insert the journey anchor (denial_event_version = the pre-appeal state event version — SLA/audit
  // context ONLY, D-E; NOT a gate). The unconditional UNIQUE catches a guard-bypassing race.
  let appeal: ClaimAppealRow;
  try {
    const rows = await db
      .insert(claimAppeals)
      .values({
        claimCaseId: input.claimCaseId,
        pariwarId: input.pariwarId,
        currentStage: '1',
        initiatedByActor: input.initiatedByActor,
        initiatedOnBehalf: input.initiatedOnBehalf,
        denialEventVersion: claimRow.stateEventVersion,
        status: 'open',
      })
      .returning();
    appeal = rows[0]!;
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new AppealAlreadyExhaustedError(input.claimCaseId, 'exists');
    }
    throw err;
  }

  return { appeal, eventVersion: projected.eventVersion, claimState: projected.state };
}

// ── Stage 1 review (District Admin reviewer, AC2) ────────────────────────────────

/**
 * Record the Stage-1 District-Admin reviewer decision (AC2). Reverse OR do-not-reverse(advance) ONLY (D-C).
 * Under the advisory lock: row-lock + re-check `current_state === 'appeal_stage_1'`, enforce the D-D
 * reviewer-conflict (`AppealReviewerConflictError`), then — in ONE tx — emit the reviewed transition (+ the
 * claim.reversed hook on reverse), advance/close the anchor, and insert the decision-metadata row.
 */
export async function reviewAppealStage1(
  client: pg.PoolClient,
  input: ReviewAppealStage1Input,
): Promise<AppealDecisionResult> {
  assertDisposition(input.decision, input.dispositionCategory);
  await acquireAppealLock(client, input.pariwarId, input.claimCaseId);
  const db = bindScopedDb(client);

  const claimRow = await lockClaim(db, input.pariwarId, input.claimCaseId);
  if (!claimRow) throw new AppealClaimNotFoundError(input.claimCaseId);
  if (claimRow.currentState !== 'appeal_stage_1') {
    throw new AppealStageMismatchError(input.claimCaseId, '1', claimRow.currentState);
  }
  const anchor = await getAnchor(db, input.pariwarId, input.claimCaseId);
  if (!anchor) throw new AppealNoJourneyError(input.claimCaseId);

  // D-D reviewer-conflict — the reviewer must not be an original decider (verifier / state-trustee / R9 voter).
  const deciders = await getOriginalDeciderActorIds(db, input.pariwarId, input.claimCaseId);
  if (isOriginalDecider(deciders, input.reviewerActorId)) {
    throw new AppealReviewerConflictError(input.claimCaseId, input.reviewerActorId);
  }

  const toState = input.decision === 'reversed' ? 'reversed' : 'appeal_stage_2';
  const projected = await projectClaimState(client, {
    claimCaseId: input.claimCaseId,
    pariwarId: input.pariwarId,
    deceasedMemberId: claimRow.deceasedMemberId,
    intakeChannels: claimRow.intakeChannels,
    claimantActorId: claimRow.claimantActorId,
    eventType: 'claim.appeal_stage1_reviewed',
    payload: {
      from_state: 'appeal_stage_1',
      to_state: toState,
      trigger: input.decision === 'reversed' ? 'appeal_stage1_reverse' : 'appeal_stage1_advance',
      actor: input.actor,
      decision: input.decision,
    },
    actorId: input.reviewerActorId,
    ...(input.auditId !== undefined ? { auditId: input.auditId } : {}),
  });

  let reversedEventVersion: number | null = null;
  if (input.decision === 'reversed') {
    reversedEventVersion = await emitReversedHook(
      client,
      claimRow,
      { claimCaseId: input.claimCaseId, pariwarId: input.pariwarId, actor: input.actor, actorId: input.reviewerActorId, ...(input.auditId !== undefined ? { auditId: input.auditId } : {}) },
      1,
      input.dispositionCategory!,
    );
    await db
      .update(claimAppeals)
      .set({ status: 'reversed', updatedAt: sql`now()` })
      .where(eq(claimAppeals.appealId, anchor.appealId));
  } else {
    await db
      .update(claimAppeals)
      .set({ currentStage: '2', updatedAt: sql`now()` })
      .where(eq(claimAppeals.appealId, anchor.appealId));
  }

  const decision = await insertDecisionRow(db, { ...input, stage: '1', decision: input.decision });
  return { decision, claimState: projected.state, eventVersion: projected.eventVersion, reversedEventVersion };
}

// ── Stage 3 decision (Trustee discretion — final, AC4) ───────────────────────────

/**
 * Record the Stage-3 Trustee discretion decision — FINAL (AC4). Reverse OR uphold ONLY (D-C — the only stage
 * that may terminally uphold). Under the advisory lock: row-lock + re-check `current_state ===
 * 'appeal_stage_3'`, then — in ONE tx — emit the reviewed transition; on reverse the claim.reversed hook +
 * anchor status='reversed'; on uphold emit ALSO `claim.denied_no_appeal` (carrying deceased_member_id — the
 * freeze-clearing terminal, else the account stays frozen forever) + anchor status='upheld_final'.
 */
export async function decideAppealStage3(
  client: pg.PoolClient,
  input: DecideAppealStage3Input,
): Promise<AppealDecisionResult> {
  assertDisposition(input.decision, input.dispositionCategory);
  await acquireAppealLock(client, input.pariwarId, input.claimCaseId);
  const db = bindScopedDb(client);

  const claimRow = await lockClaim(db, input.pariwarId, input.claimCaseId);
  if (!claimRow) throw new AppealClaimNotFoundError(input.claimCaseId);
  if (claimRow.currentState !== 'appeal_stage_3') {
    throw new AppealStageMismatchError(input.claimCaseId, '3', claimRow.currentState);
  }
  const anchor = await getAnchor(db, input.pariwarId, input.claimCaseId);
  if (!anchor) throw new AppealNoJourneyError(input.claimCaseId);

  const toState = input.decision === 'reversed' ? 'reversed' : 'denied';
  const projected = await projectClaimState(client, {
    claimCaseId: input.claimCaseId,
    pariwarId: input.pariwarId,
    deceasedMemberId: claimRow.deceasedMemberId,
    intakeChannels: claimRow.intakeChannels,
    claimantActorId: claimRow.claimantActorId,
    eventType: 'claim.appeal_stage3_reviewed',
    payload: {
      from_state: 'appeal_stage_3',
      to_state: toState,
      trigger: input.decision === 'reversed' ? 'appeal_stage3_reverse' : 'appeal_stage3_uphold',
      actor: input.actor,
      decision: input.decision,
    },
    actorId: input.reviewerActorId,
    ...(input.auditId !== undefined ? { auditId: input.auditId } : {}),
  });

  let reversedEventVersion: number | null = null;
  if (input.decision === 'reversed') {
    reversedEventVersion = await emitReversedHook(
      client,
      claimRow,
      { claimCaseId: input.claimCaseId, pariwarId: input.pariwarId, actor: input.actor, actorId: input.reviewerActorId, ...(input.auditId !== undefined ? { auditId: input.auditId } : {}) },
      3,
      input.dispositionCategory!,
    );
    await db
      .update(claimAppeals)
      .set({ status: 'reversed', updatedAt: sql`now()` })
      .where(eq(claimAppeals.appealId, anchor.appealId));
  } else {
    // Uphold — the appeal ladder is exhausted. Emit claim.denied_no_appeal (the freeze-clearing terminal;
    // carries deceased_member_id so the account-frozen overlay's payload->>'deceased_member_id' query
    // matches it and clears the freeze — else a terminally-denied deceased member's account stays frozen).
    await projectClaimState(client, {
      claimCaseId: input.claimCaseId,
      pariwarId: input.pariwarId,
      deceasedMemberId: claimRow.deceasedMemberId,
      intakeChannels: claimRow.intakeChannels,
      claimantActorId: claimRow.claimantActorId,
      eventType: 'claim.denied_no_appeal',
      payload: {
        from_state: 'denied',
        to_state: 'denied',
        trigger: 'appeal_exhausted_stage3_uphold',
        actor: input.actor,
        deceased_member_id: claimRow.deceasedMemberId,
      },
      actorId: input.reviewerActorId,
      ...(input.auditId !== undefined ? { auditId: input.auditId } : {}),
    });
    await db
      .update(claimAppeals)
      .set({ status: 'upheld_final', updatedAt: sql`now()` })
      .where(eq(claimAppeals.appealId, anchor.appealId));
  }

  const decision = await insertDecisionRow(db, { ...input, stage: '3', decision: input.decision });
  return { decision, claimState: projected.state, eventVersion: projected.eventVersion, reversedEventVersion };
}
