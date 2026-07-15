// Verifier concealment-linkage assessment persistence — Story 6.15 (Task 2, domain side). Transport-free.
//
// The AUTHORITATIVE-ROW + EVIDENTIARY-EVENT WRITE (D-E): every assessment writes BOTH the
// `claim_concealment_assessments` row (the authoritative current/read model the tri-state producer reads —
// evidence layer 1) AND the `claim.concealment_assessed` IDENTITY annotation event (via projectClaimState —
// the sole claims.current_state writer; the immutable evidentiary timeline — evidence layer 2), in ONE
// scope-tx so they can NEVER diverge (D-E: a forced rollback leaves NEITHER row NOR event — no orphan). The
// audit-sink line (the route) is an ADDITIONAL admin-action record (layer 3), NEVER a substitute for the
// evidentiary event. The event is IDENTITY (`from_state === to_state`) — the reducer has no concealment
// state and gains none, so recording an assessment NEVER changes claim state and NEVER auto-denies (D-D):
// the assessment `flags` and routes; the State Trustee (Story 6.13) alone decides (D-B).
//
// CONCURRENCY: the write path takes a transaction-scoped advisory lock on (pariwarId, claimCaseId) with a
// DISTINCT namespace prefix (`concealment_assessment:`) so concurrent (re)assessments on one claim serialize;
// the atomic conditional-UPDATE supersession (0 rows ⇒ conflict) + the partial-unique `(claim_case_id) WHERE
// superseded_at IS NULL` are the structural backstops (the 6.11 `reviseDecision` pattern).
//
// PII: the `noteCiphertext` is ALREADY ENCRYPTED by the CALLER (the route encrypts before the writer — the
// 6.7/6.8/6.11 posture); the writer takes ciphertext (or null). The `actorDisplay` is ALREADY RESOLVED by
// the caller server-side (R5) — a non-empty snapshot; the writer never resolves it and never falls back.
//
// The write-path guards live here (the reducer stays TOTAL — never encode a business precondition in it).
// NOT surfaced at the top-level barrel (claim namespace only); the route maps these typed errors to 4xx.

import { createHash } from 'node:crypto';

import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import type pg from 'pg';

import { bindScopedDb, type Db } from '../db.js';
import type { ClaimId, PariwarId } from '../ids/index.js';
import { clampLimit } from '../pagination.js';
import {
  type ClaimConcealmentAssessmentRow,
  claimConcealmentAssessments,
} from '../schema/claim_concealment_assessments.js';
import { claims } from '../schema/claims.js';
import type { ClaimConcealmentAssessmentKind } from './concealment-assessment.js';
import { type ClaimEventActor } from './events.js';
import { projectClaimState } from './project.js';

// ── Typed write-path guards (the route maps each to a stable 4xx) ─────────────

/** Thrown when no claim row exists for the id the writer targets (tenant-scoped miss). */
export class ConcealmentAssessmentClaimNotFoundError extends Error {
  public readonly name = 'ConcealmentAssessmentClaimNotFoundError';
  public constructor(public readonly claimCaseId: string) {
    super(`[concealment-assessment] no claim found for id ${claimCaseId} in scope`);
  }
}

/** Thrown when a concurrent revision already superseded the live assessment (0-row conditional UPDATE), or
 *  the partial-unique index rejects a second live row — the loser aborts (409). */
export class ConcealmentAssessmentRevisionConflictError extends Error {
  public readonly name = 'ConcealmentAssessmentRevisionConflictError';
  public constructor(public readonly claimCaseId: string) {
    super(`[concealment-assessment] claim ${claimCaseId} revision lost a concurrent race — assessment already superseded`);
  }
}

/** Story 6.15, D2 (ratified BigDev 2026-07-15) — the claim-lifecycle window a concealment assessment may be
 *  recorded/revised in. BLOCKED: pre-review states (`intake_pending`, `intake_converged`,
 *  `documents_pending` — verification hasn't started, there's nothing to assess yet) and terminal states
 *  (`approved`, `denied`, `denied_no_appeal`, `settled` — the claim is closed; changing the concealment
 *  signal post-closure would have no re-adjudication trigger). PERMITTED: the active
 *  verification/trustee-review window (`verification_in_progress`, `verifier_review`, `verifier_approved`,
 *  `state_trustee_freeze`) — the same window a concealment finding can still reach a live trustee decision.
 *  Mirrors the 6.12 `SHEPHERD_ASSIGNMENT_BLOCKED_STATES` precedent. */
const CONCEALMENT_ASSESSMENT_BLOCKED_STATES = [
  'intake_pending',
  'intake_converged',
  'documents_pending',
  'approved',
  'denied',
  'denied_no_appeal',
  'settled',
] as const;

/** Thrown when a concealment assessment is recorded/revised on a claim outside the valid window (D2 → 409).
 *  Re-checked against the LOCKED current state inside the transaction (never a stale pre-lock read). */
export class ConcealmentAssessmentBlockedStateError extends Error {
  public readonly name = 'ConcealmentAssessmentBlockedStateError';
  public constructor(
    public readonly claimCaseId: string,
    public readonly currentState: string,
  ) {
    super(`[concealment-assessment] claim ${claimCaseId} is in state '${currentState}' — not a valid concealment-assessment window`);
  }
}

function assertConcealmentAssessableState(claimCaseId: string, currentState: string): void {
  if ((CONCEALMENT_ASSESSMENT_BLOCKED_STATES as readonly string[]).includes(currentState)) {
    throw new ConcealmentAssessmentBlockedStateError(claimCaseId, currentState);
  }
}

/** True iff `err` (or its wrapped cause) is a Postgres unique-violation (23505) — the defense-in-depth
 *  backstop behind the app-level live-assessment check (the 6.11/6.12 `isUniqueViolation` helper). */
function isUniqueViolation(err: unknown): boolean {
  const direct = (err as { code?: string }).code;
  const cause = (err as { cause?: { code?: string } }).cause?.code;
  return direct === '23505' || cause === '23505';
}

// ── Advisory lock + claim row lock helpers ────────────────────────────────────

/**
 * The transaction-scoped advisory-lock key for one claim's concealment assessment. Derived from the
 * (pariwarId, claimCaseId) pair via a truncated SHA-256 with a DISTINCT namespace prefix
 * (`concealment_assessment:`) so it never collides with the intake / verifier-decision / shepherd-assign locks.
 */
export function concealmentAssessmentAdvisoryLockKey(pariwarId: string, claimCaseId: string): bigint {
  const hex = createHash('sha256').update(`concealment_assessment:${pariwarId}:${claimCaseId}`).digest('hex');
  // 15 hex chars (60 bits) → always positive, safely inside Postgres' signed bigint advisory-lock arg.
  return BigInt(`0x${hex.slice(0, 15)}`);
}

async function acquireAssessmentLock(
  client: pg.PoolClient,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
): Promise<void> {
  await client.query('SELECT pg_advisory_xact_lock($1)', [
    concealmentAssessmentAdvisoryLockKey(pariwarId, claimCaseId).toString(),
  ]);
}

/** Lock the claim row (`SELECT … FOR UPDATE`) to serialize concurrent edits + read its identity/state. */
async function lockClaim(db: Db, pariwarId: PariwarId, claimCaseId: ClaimId) {
  const rows = await db
    .select()
    .from(claims)
    .where(and(eq(claims.pariwarId, pariwarId), eq(claims.claimCaseId, claimCaseId)))
    .for('update');
  return rows[0];
}

// ── Read accessors (the single-row producer read + the bulk queue read) ───────

/** The claim's LIVE (non-superseded) concealment assessment, if any (partial-unique guarantees ≤1).
 *  Scope-safe (RLS + explicit predicate) — the tri-state producer's single-row read. */
export async function getLiveConcealmentAssessment(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
): Promise<ClaimConcealmentAssessmentRow | undefined> {
  const rows = await db
    .select()
    .from(claimConcealmentAssessments)
    .where(
      and(
        eq(claimConcealmentAssessments.pariwarId, pariwarId),
        eq(claimConcealmentAssessments.claimCaseId, claimCaseId),
        isNull(claimConcealmentAssessments.supersededAt),
      ),
    );
  return rows[0];
}

/** A real, independent ceiling for the bulk live-assessment read — NOT a self-referential clamp (a
 *  `cap: ids.length` enforces nothing; safety would depend entirely on the caller already bounding the id
 *  array). Sized with headroom above the 6.13 trustee-queue's own `PENDING_SCAN_CAP` (500) × its 3 pending
 *  buckets — the one caller today — so it's never the practical bottleneck, while still forcing pagination
 *  on any future/alternate caller that passes an unbounded id array. */
const CONCEALMENT_ASSESSMENT_BULK_CAP = 2000;

/**
 * The LIVE (non-superseded) concealment assessments for a SET of claims — ONE clamped query keyed by the
 * id set (the bulk primitive the trustee-queue accessor uses; the explicit no-N+1 requirement, AC6). The
 * partial-unique guarantees ≤1 live row per claim, so the result maps claim → its single live assessment.
 * Scope-safe (RLS + explicit pariwar predicate). An empty id set short-circuits to an empty map (never an
 * unbounded scan). The `.limit()` is clamped against a FIXED independent cap (`CONCEALMENT_ASSESSMENT_BULK_CAP`),
 * not the id-set size itself.
 */
export async function getLiveConcealmentAssessmentsBulk(
  db: Db,
  pariwarId: PariwarId,
  claimCaseIds: readonly ClaimId[],
): Promise<Map<string, ClaimConcealmentAssessmentRow>> {
  const out = new Map<string, ClaimConcealmentAssessmentRow>();
  if (claimCaseIds.length === 0) return out;
  // De-dup the id set so the clamp bound tracks distinct claims, not caller repetition.
  const ids = [...new Set(claimCaseIds)];
  const rows = await db
    .select()
    .from(claimConcealmentAssessments)
    .where(
      and(
        eq(claimConcealmentAssessments.pariwarId, pariwarId),
        inArray(claimConcealmentAssessments.claimCaseId, ids),
        isNull(claimConcealmentAssessments.supersededAt),
      ),
    )
    .limit(clampLimit(ids.length, { default: ids.length, cap: CONCEALMENT_ASSESSMENT_BULK_CAP }));
  for (const row of rows) out.set(row.claimCaseId, row);
  return out;
}

/** The full assessment history for one claim (newest first) — the transcript read (audit/tests). Bounded.
 *  Story 6.15, D3 (ratified BigDev 2026-07-15): no route in this story calls this — canonical groundwork
 *  for a future authorized evidence/history consumer (an evidence timeline, appeal transcript, or trustee
 *  detail surface), not premature plumbing to remove. See deferred-work.md for the re-trigger condition. */
export async function getConcealmentAssessmentHistory(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
  limit?: number,
): Promise<ClaimConcealmentAssessmentRow[]> {
  return db
    .select()
    .from(claimConcealmentAssessments)
    .where(
      and(
        eq(claimConcealmentAssessments.pariwarId, pariwarId),
        eq(claimConcealmentAssessments.claimCaseId, claimCaseId),
      ),
    )
    .orderBy(desc(claimConcealmentAssessments.createdAt))
    .limit(clampLimit(limit, { default: 50, cap: 200 }));
}

// ── Inputs / result ───────────────────────────────────────────────────────────

export interface RecordConcealmentAssessmentInput {
  claimCaseId: ClaimId;
  pariwarId: PariwarId;
  /** The tri-state verifier judgement (AC7). */
  kind: ClaimConcealmentAssessmentKind;
  /** ALREADY-ENCRYPTED Tier-1 note ciphertext (the route encrypts before the writer); null when no note. */
  noteCiphertext: string | null;
  /** The acting verifier's actor id (audit; non-PII query/join key). */
  actorId: string;
  /** The decision-time SNAPSHOT of the actor's display name (R5) — ALREADY RESOLVED, non-empty. */
  actorDisplay: string;
  /** Who caused the event (`operator` for the admin verifier path). */
  actor: ClaimEventActor;
  auditId?: string;
}

export interface RecordConcealmentAssessmentResult {
  assessment: ClaimConcealmentAssessmentRow;
  /** The assessment this one superseded on a revision (null on a first assessment). */
  supersededAssessmentId: string | null;
  eventVersion: number;
  /** The claim's lifecycle state AFTER the assessment (UNCHANGED — the event is IDENTITY). */
  claimState: string;
}

// ── Record / revise (annotation + atomic supersession, D-E) ───────────────────

/**
 * Record (or REVISE) a verifier concealment-linkage assessment on a claim (AC7). In one scope-tx (the
 * caller owns BEGIN + setPariwarScope): advisory-lock the claim, row-lock + read it, resolve any LIVE
 * assessment and — if present — ATOMICALLY supersede it (conditional `UPDATE … SET superseded_at = now()
 * WHERE assessment_id = $live AND superseded_at IS NULL RETURNING`; 0 rows ⇒ a concurrent revise already
 * won ⇒ `ConcealmentAssessmentRevisionConflictError` 409), INSERT the new live row
 * (`supersedes_assessment_id` = the superseded id, or `null` on a first assessment; the partial-unique is
 * the backstop), and APPEND the `claim.concealment_assessed` IDENTITY event via projectClaimState — the
 * two authorities in ONE tx (D-E: table write + evidentiary event are atomic together). NO approval/denial
 * event, EVER; claim state is unchanged. Takes a raw `pg.PoolClient` (projectClaimState needs `SET LOCAL`).
 */
export async function recordConcealmentAssessment(
  client: pg.PoolClient,
  input: RecordConcealmentAssessmentInput,
): Promise<RecordConcealmentAssessmentResult> {
  await acquireAssessmentLock(client, input.pariwarId, input.claimCaseId);
  const db = bindScopedDb(client);

  const claimRow = await lockClaim(db, input.pariwarId, input.claimCaseId);
  if (!claimRow) throw new ConcealmentAssessmentClaimNotFoundError(input.claimCaseId);
  // D2 — re-check the LOCKED current state before any write (never a stale pre-lock read).
  assertConcealmentAssessableState(input.claimCaseId, claimRow.currentState);

  // Resolve + atomically supersede any live assessment (revise). 0 rows ⇒ a concurrent revise won ⇒ 409.
  const live = await getLiveConcealmentAssessment(db, input.pariwarId, input.claimCaseId);
  let supersededAssessmentId: string | null = null;
  if (live) {
    const superseded = await db
      .update(claimConcealmentAssessments)
      .set({ supersededAt: sql`now()` })
      .where(
        and(
          eq(claimConcealmentAssessments.assessmentId, live.assessmentId),
          isNull(claimConcealmentAssessments.supersededAt),
        ),
      )
      .returning({ assessmentId: claimConcealmentAssessments.assessmentId });
    if (superseded.length === 0) throw new ConcealmentAssessmentRevisionConflictError(input.claimCaseId);
    supersededAssessmentId = live.assessmentId;
  }

  // Insert the new LIVE row (the partial-unique index is the second backstop behind the advisory lock).
  let assessment: ClaimConcealmentAssessmentRow;
  try {
    const rows = await db
      .insert(claimConcealmentAssessments)
      .values({
        claimCaseId: input.claimCaseId,
        pariwarId: input.pariwarId,
        kind: input.kind,
        noteCiphertext: input.noteCiphertext,
        actorId: input.actorId,
        actorDisplay: input.actorDisplay,
        ...(supersededAssessmentId != null ? { supersedesAssessmentId: live!.assessmentId } : {}),
      })
      .returning();
    assessment = rows[0]!;
  } catch (err) {
    if (isUniqueViolation(err)) throw new ConcealmentAssessmentRevisionConflictError(input.claimCaseId);
    throw err;
  }

  // Append the IDENTITY evidentiary event in the SAME tx (D-E) — NOT a verdict; claim state is unchanged.
  // auditShape only: the tri-state kind + the note NEVER enter events_log (the row is the source of record).
  const projected = await projectClaimState(client, {
    claimCaseId: input.claimCaseId,
    pariwarId: input.pariwarId,
    deceasedMemberId: claimRow.deceasedMemberId,
    intakeChannels: claimRow.intakeChannels,
    claimantActorId: claimRow.claimantActorId,
    eventType: 'claim.concealment_assessed',
    payload: {
      from_state: claimRow.currentState,
      to_state: claimRow.currentState,
      trigger: 'verifier_console_concealment_assess',
      actor: input.actor,
    },
    actorId: input.actorId,
    ...(input.auditId !== undefined ? { auditId: input.auditId } : {}),
  });

  return {
    assessment,
    supersededAssessmentId,
    eventVersion: projected.eventVersion,
    claimState: projected.state,
  };
}
