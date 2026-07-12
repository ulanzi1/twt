// Shepherd-assignment persistence writers — Story 6.12 (Task 3, domain side). Transport-free.
//
// The two-authority WRITE (AC0): every assignment writes BOTH the `claim.shepherd_assigned` IDENTITY
// annotation event (via projectClaimState — the sole claims.current_state writer, the LIFECYCLE-TIMELINE
// authority; the event carries NON-PII routing coordinates only) AND the `claim_shepherd_assignments`
// ASSIGNMENT-METADATA row (shepherd_actor_id + the display/contact SNAPSHOT — the ASSIGNMENT-METADATA
// authority), in ONE scope-tx so they can never diverge. Neither is a projection of the other. Claim
// STATE is ALWAYS derived from event replay, NEVER from the assignment row (the event is IDENTITY —
// `from_state === to_state`; the reducer has no shepherd state, exactly like `claim.verifier_escalated`).
//
// CONCURRENCY (AC9): every verb first takes a transaction-scoped advisory lock on (pariwarId,
// claimCaseId) with a DISTINCT namespace prefix (`shepherd_assign:`) so concurrent assignment attempts on
// one claim serialize; the pre-write live-assignment check makes an auto redelivery a no-op; the
// `claim_shepherd_assignments` partial-unique `(claim_case_id) WHERE superseded_at IS NULL` is the
// structural backstop.
//
// PII: the shepherd's `shepherdDisplay` + contact are ALREADY RESOLVED by the caller (the auto path
// resolves them from the candidate pool here; the manual/fallback path passes a caller-resolved,
// contactability-validated snapshot — the 6.11 actorDisplay posture). The writers NEVER put a name/phone/
// WhatsApp into the event payload or the audit sink (AC8) — those columns live only in the row.
//
// The write-path guards live here (the reducer stays TOTAL — never encode a business precondition in it,
// the ground-inspection/nominee-bank lesson). NOT surfaced at the top-level barrel (claim namespace only);
// the route/worker maps these typed errors to stable codes.

import { createHash } from 'node:crypto';

import { and, asc, eq, isNotNull, isNull, notInArray, or, sql } from 'drizzle-orm';
import type pg from 'pg';

import { bindScopedDb, type Db } from '../db.js';
import type { ClaimId, PariwarId, ShepherdAssignmentId, UserId } from '../ids/index.js';
import {
  type ClaimShepherdAssignmentRow,
  claimShepherdAssignments,
  type ShepherdAssignmentReason,
} from '../schema/claim_shepherd_assignments.js';
import { claims } from '../schema/claims.js';
import { roleGrants } from '../schema/role_grants.js';
import { users } from '../schema/users.js';
import { type ClaimEventActor } from './events.js';
import { projectClaimState } from './project.js';
import { CLAIM_TERMINAL_STATES } from './read.js';

// A bounded window on the candidate pull (never an unbounded scan). The SQL ORDER BY (live-count ASC,
// actor-id ASC) already ranks the pool, so the head is always the pick regardless of window size; the
// window just caps the returned roster for the caller/tests. Passed as an INTEGER LITERAL at the `.limit()`
// call site (the domain-accessor-invariants forced-pagination-clamp gate requires a literal or clampLimit
// for a fixed, non-caller-supplied bound).

// ── Typed write-path guards (the route/worker maps each to a stable code) ─────

/** Thrown by `assignShepherd` when NO eligible/contactable in-scope District Admin exists (empty pool, or
 *  all skipped per the AC2 contactability filter) — the worker routes this to the AR-61 fallback (AC4). */
export class NoEligibleShepherdError extends Error {
  public readonly name = 'NoEligibleShepherdError';
  public constructor(
    public readonly claimCaseId: string,
    public readonly district: string,
  ) {
    super(`[shepherd-assign] no eligible contactable district_admin for claim ${claimCaseId} in district '${district}'`);
  }
}

/** Thrown when a concurrent reassignment already superseded the live assignment (0-row conditional UPDATE),
 *  or the partial-unique index rejects a second live row — the loser aborts (409, AC5/AC9). */
export class ShepherdReassignmentConflictError extends Error {
  public readonly name = 'ShepherdReassignmentConflictError';
  public constructor(public readonly claimCaseId: string) {
    super(`[shepherd-assign] claim ${claimCaseId} reassignment lost a concurrent race — a live shepherd already changed`);
  }
}

/** Thrown by an actor-initiated (manual) reassignment when `actor_id === target_shepherd_actor_id` — a
 *  District Admin cannot route a claim to themselves (AC5/FR-41). The automatic + fallback paths are
 *  `actor: 'system'` and satisfy this by construction. */
export class ShepherdSelfAssignmentError extends Error {
  public readonly name = 'ShepherdSelfAssignmentError';
  public constructor(
    public readonly claimCaseId: string,
    public readonly actorId: string,
  ) {
    super(`[shepherd-assign] actor ${actorId} cannot self-assign as shepherd for claim ${claimCaseId}`);
  }
}

/** Thrown when no claim row exists for the id the writer targets (tenant-scoped miss). */
export class ShepherdAssignmentClaimNotFoundError extends Error {
  public readonly name = 'ShepherdAssignmentClaimNotFoundError';
  public constructor(public readonly claimCaseId: string) {
    super(`[shepherd-assign] no claim found for id ${claimCaseId} in scope`);
  }
}

/** Claim states where a shepherd (re)assignment makes no sense: pre-verification (no verification signals
 *  gathering has started yet, AC1) or `settled` (fully terminal — disbursed, nothing left to shepherd). A
 *  live shepherd may still be (re)assigned through the entire verification/appeal window. */
const SHEPHERD_ASSIGNMENT_BLOCKED_STATES = [
  'intake_pending',
  'intake_converged',
  'documents_pending',
  'settled',
] as const;

/** Thrown when an assign/reassign is attempted on a claim outside the valid window (pre-verification or
 *  `settled`, Review Finding). */
export class ShepherdAssignmentInvalidClaimStateError extends Error {
  public readonly name = 'ShepherdAssignmentInvalidClaimStateError';
  public constructor(
    public readonly claimCaseId: string,
    public readonly currentState: string,
  ) {
    super(`[shepherd-assign] claim ${claimCaseId} is in state '${currentState}' — not a valid shepherd (re)assignment window`);
  }
}

function assertShepherdAssignableState(claimCaseId: string, currentState: string): void {
  if ((SHEPHERD_ASSIGNMENT_BLOCKED_STATES as readonly string[]).includes(currentState)) {
    throw new ShepherdAssignmentInvalidClaimStateError(claimCaseId, currentState);
  }
}

/** True iff `err` (or its wrapped cause) is a Postgres unique-violation (23505) — the defense-in-depth
 *  backstop behind the app-level live-assignment check (the 6.11 `isUniqueViolation` helper). */
function isUniqueViolation(err: unknown): boolean {
  const direct = (err as { code?: string }).code;
  const cause = (err as { cause?: { code?: string } }).cause?.code;
  return direct === '23505' || cause === '23505';
}

// ── Advisory lock + claim row lock helpers ────────────────────────────────────

/**
 * The transaction-scoped advisory-lock key for one claim's shepherd assignment (AC9). Derived from the
 * (pariwarId, claimCaseId) pair via a truncated SHA-256 with a DISTINCT namespace prefix
 * (`shepherd_assign:`) so it never collides with the intake (`deceasedMemberId`) or verifier-decision
 * (`verifier_decision:`) locks.
 */
export function shepherdAssignmentAdvisoryLockKey(pariwarId: string, claimCaseId: string): bigint {
  const hex = createHash('sha256').update(`shepherd_assign:${pariwarId}:${claimCaseId}`).digest('hex');
  // 15 hex chars (60 bits) → always positive, safely inside Postgres' signed bigint advisory-lock arg.
  return BigInt(`0x${hex.slice(0, 15)}`);
}

async function acquireAssignLock(
  client: pg.PoolClient,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
): Promise<void> {
  await client.query('SELECT pg_advisory_xact_lock($1)', [
    shepherdAssignmentAdvisoryLockKey(pariwarId, claimCaseId).toString(),
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

// ── Candidate resolution (the scope-respecting, workload-balanced, contactable pool) ──

/** One eligible shepherd candidate — a CONTACTABLE, in-scope District Admin (AC1/AC2). */
export interface ShepherdCandidate {
  /** The candidate's `users.id` (== the shepherd_actor_id we store; non-PII join key). */
  shepherdActorId: string;
  /** The candidate's controlled staff-attribution display name (non-null by the eligibility filter). */
  displayName: string;
  /** The candidate's E.164 contact channels (≥1 non-null by the AC2 contactability filter). */
  contactPhone: string | null;
  contactWhatsapp: string | null;
  /** How many LIVE (`superseded_at IS NULL`) shepherd assignments this candidate currently holds (in tenant). */
  liveCount: number;
}

/**
 * The scope-respecting, workload-balanced, CONTACTABLE candidate pool (AC1/AC2). Joins `role_grants`
 * (role `district_admin`, `scope_dimension='district'`, `scope_value=<district>`, tenant) × `users`
 * (status `active`, non-null `display_name` AND ≥1 non-null contact channel — the AC2 contactability
 * invariant; a name-only or channel-less admin is SKIPPED here, never assigned), left-joined to each
 * candidate's LIVE-assignment count. Ordered by (live count ASC, `shepherd_actor_id`/`users.id` ASC) —
 * deterministic, replayable, no `Math.random()`. The LEFT JOIN restricts to `superseded_at IS NULL` in
 * the ON, so `count(assignment_id)` is the live count (a candidate with none → 0). Tenant-scoped (RLS +
 * the explicit pariwar predicate on role_grants).
 */
export async function resolveShepherdCandidates(
  db: Db,
  pariwarId: PariwarId,
  district: string,
): Promise<ShepherdCandidate[]> {
  // count(DISTINCT assignment_id) (not a plain count) — a candidate holding more than one district_admin
  // role_grant row at this (pariwarId, district) would otherwise multiply-match in the LEFT JOIN before
  // GROUP BY, inflating the workload count and skewing the least-loaded tiebreak (Review Finding).
  //
  // FILTER excludes a live assignment (superseded_at IS NULL) whose OWN claim has since reached a
  // CLAIM_TERMINAL_STATES state (settled/denied, Review Finding) — otherwise a shepherd's workload count
  // inflates forever for claims that are long closed, since nothing supersedes the assignment row on claim
  // closure (only a REASSIGNMENT supersedes; a state guard now blocks reassignment on settled claims
  // entirely). This ONLY narrows what workload counts — the row itself, and every member/console read of
  // it, is untouched. `claims.currentState IS NULL` can only happen when the LEFT JOIN found no assignment
  // at all for this candidate (assignmentId is then also NULL, already excluded by DISTINCT/count).
  const liveCountExpr = sql<number>`count(DISTINCT ${claimShepherdAssignments.assignmentId}) FILTER (WHERE ${claims.currentState} IS NULL OR ${notInArray(claims.currentState, [...CLAIM_TERMINAL_STATES])})::int`;
  const rows = await db
    .select({
      shepherdActorId: users.id,
      displayName: users.displayName,
      contactPhone: users.contactPhone,
      contactWhatsapp: users.contactWhatsapp,
      liveCount: liveCountExpr,
    })
    .from(roleGrants)
    .innerJoin(users, eq(users.id, roleGrants.userId))
    .leftJoin(
      claimShepherdAssignments,
      and(
        sql`${claimShepherdAssignments.shepherdActorId} = ${users.id}::text`,
        eq(claimShepherdAssignments.pariwarId, pariwarId),
        isNull(claimShepherdAssignments.supersededAt),
      ),
    )
    .leftJoin(claims, eq(claims.claimCaseId, claimShepherdAssignments.claimCaseId))
    .where(
      and(
        eq(roleGrants.role, 'district_admin'),
        eq(roleGrants.scopeDimension, 'district'),
        eq(roleGrants.scopeValue, district),
        eq(roleGrants.pariwarId, pariwarId),
        eq(users.status, 'active'),
        isNotNull(users.displayName),
        sql`btrim(${users.displayName}) <> ''`,
        or(isNotNull(users.contactPhone), isNotNull(users.contactWhatsapp)),
      ),
    )
    .groupBy(users.id, users.displayName, users.contactPhone, users.contactWhatsapp)
    .orderBy(asc(liveCountExpr), asc(users.id))
    .limit(100); // fixed bounded window (integer literal — the forced-pagination-clamp gate)

  return rows.map((r) => ({
    shepherdActorId: r.shepherdActorId,
    displayName: r.displayName!,
    contactPhone: r.contactPhone,
    contactWhatsapp: r.contactWhatsapp,
    liveCount: Number(r.liveCount),
  }));
}

/** The claim's LIVE (non-superseded) assignment row, if any (partial-unique guarantees ≤1). Scope-safe
 *  (RLS + explicit predicate) — shared by the pre-write idempotency check + reassignment. */
export async function getLiveAssignment(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
): Promise<ClaimShepherdAssignmentRow | undefined> {
  const rows = await db
    .select()
    .from(claimShepherdAssignments)
    .where(
      and(
        eq(claimShepherdAssignments.pariwarId, pariwarId),
        eq(claimShepherdAssignments.claimCaseId, claimCaseId),
        isNull(claimShepherdAssignments.supersededAt),
      ),
    );
  return rows[0];
}

/** Resolve a candidate admin's contactability snapshot for the MANUAL reassignment path (the route calls
 *  this, then fails closed on a missing name / both-channel-absent BEFORE invoking `reassignShepherd`).
 *  SCOPE-VALIDATED (Review Finding): the target must be an `active` `district_admin` at the claim's
 *  server-derived `(pariwarId, district)` — a user who exists but holds no such grant resolves to `null`,
 *  exactly like a nonexistent user (the caller fails closed with `ShepherdTargetNotEligibleError`,
 *  distinct from a missing display name / contact channel). A whitespace-only display name reads as
 *  absent (mirrors `getDisplayName`). */
export async function getShepherdContactability(
  db: Db,
  pariwarId: PariwarId,
  district: string,
  actorId: string,
): Promise<{ displayName: string | null; contactPhone: string | null; contactWhatsapp: string | null } | null> {
  const rows = await db
    .select({
      displayName: users.displayName,
      contactPhone: users.contactPhone,
      contactWhatsapp: users.contactWhatsapp,
    })
    .from(roleGrants)
    .innerJoin(users, eq(users.id, roleGrants.userId))
    .where(
      and(
        eq(users.id, actorId as UserId),
        eq(roleGrants.role, 'district_admin'),
        eq(roleGrants.scopeDimension, 'district'),
        eq(roleGrants.scopeValue, district),
        eq(roleGrants.pariwarId, pariwarId),
        eq(users.status, 'active'),
      ),
    )
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  const name = row.displayName !== null && row.displayName.trim() !== '' ? row.displayName : null;
  return { displayName: name, contactPhone: row.contactPhone, contactWhatsapp: row.contactWhatsapp };
}

// ── Shared row insert ─────────────────────────────────────────────────────────

async function insertAssignmentRow(
  db: Db,
  input: {
    claimCaseId: ClaimId;
    pariwarId: PariwarId;
    shepherdActorId: string;
    shepherdDisplay: string;
    shepherdContactPhone: string | null;
    shepherdContactWhatsapp: string | null;
    assignmentReason: ShepherdAssignmentReason;
    supersedesAssignmentId?: ShepherdAssignmentId | null;
  },
): Promise<ClaimShepherdAssignmentRow> {
  const rows = await db
    .insert(claimShepherdAssignments)
    .values({
      claimCaseId: input.claimCaseId,
      pariwarId: input.pariwarId,
      shepherdActorId: input.shepherdActorId,
      shepherdDisplay: input.shepherdDisplay,
      shepherdContactPhone: input.shepherdContactPhone,
      shepherdContactWhatsapp: input.shepherdContactWhatsapp,
      assignmentReason: input.assignmentReason,
      ...(input.supersedesAssignmentId != null ? { supersedesAssignmentId: input.supersedesAssignmentId } : {}),
    })
    .returning();
  return rows[0]!;
}

// ── Inputs / results ──────────────────────────────────────────────────────────

export interface AssignShepherdInput {
  claimCaseId: ClaimId;
  pariwarId: PariwarId;
  /** The deceased's server-derived posting district (the candidate-pool scope + the event payload field). */
  district: string;
  /** The event actor id (NULL for the automatic system path). */
  actorId?: string | null;
  auditId?: string;
}

export interface ReassignShepherdInput {
  claimCaseId: ClaimId;
  pariwarId: PariwarId;
  district: string;
  /** The NEW shepherd (an already-resolved, contactability-validated target — the caller owns the
   *  fail-closed check for the manual path; the fallback resolver returns a trusted target). */
  targetShepherdActorId: string;
  targetDisplay: string;
  targetContactPhone: string | null;
  targetContactWhatsapp: string | null;
  /** `reassignment` (admin-initiated, R6) or `fallback` (AR-61, AC4). */
  assignmentReason: Extract<ShepherdAssignmentReason, 'reassignment' | 'fallback'>;
  /** `operator` for a manual reassignment; `system` for the fallback path. */
  actor: ClaimEventActor;
  actorId: string | null;
  auditId?: string;
}

export interface ShepherdAssignmentResult {
  assignment: ClaimShepherdAssignmentRow;
  /** The shepherd this assignment replaced (null on a fresh `initial`/first assignment). Matches the
   *  `previous_shepherd_actor_id` on the emitted event — the row itself stores only the supersession id. */
  previousShepherdActorId: string | null;
  /** The appended event's version — `null` on an idempotent no-op (a live shepherd already existed). */
  eventVersion: number | null;
  /** The claim's lifecycle state AFTER the assignment (unchanged — the event is IDENTITY). */
  claimState: string;
  /** True when a live shepherd already existed and the auto assign was a no-op (AC9). */
  idempotentNoop: boolean;
}

// ── Assign (the automatic first-assignment path, AC1) ─────────────────────────

/**
 * AUTO-assign a shepherd when the claim enters `verification_in_progress` (AC1). In one scope-tx (the
 * caller owns BEGIN + setPariwarScope): advisory-lock the claim, row-lock + read it, a PRE-WRITE
 * live-assignment check (a live row already exists ⇒ idempotent no-op, AC9 — no event, no row), resolve
 * the CONTACTABLE workload-balanced candidate pool, pick the least-loaded (`candidates[0]`), emit
 * `claim.shepherd_assigned` (`actor: 'system'`, reason `initial`, previous/supersedes `null`) AND insert
 * the LIVE row — the two authorities in ONE tx (AC0). Empty/ineligible pool ⇒ `NoEligibleShepherdError`
 * (the worker routes to the AR-61 fallback). Takes a raw `pg.PoolClient` (projectClaimState needs `SET LOCAL`).
 */
export async function assignShepherd(
  client: pg.PoolClient,
  input: AssignShepherdInput,
): Promise<ShepherdAssignmentResult> {
  await acquireAssignLock(client, input.pariwarId, input.claimCaseId);
  const db = bindScopedDb(client);

  const claimRow = await lockClaim(db, input.pariwarId, input.claimCaseId);
  if (!claimRow) throw new ShepherdAssignmentClaimNotFoundError(input.claimCaseId);
  assertShepherdAssignableState(input.claimCaseId, claimRow.currentState);

  // Idempotency (AC9): a redelivered trigger for a claim that already has a live shepherd is a no-op.
  const existingLive = await getLiveAssignment(db, input.pariwarId, input.claimCaseId);
  if (existingLive) {
    return {
      assignment: existingLive,
      previousShepherdActorId: null,
      eventVersion: null,
      claimState: claimRow.currentState,
      idempotentNoop: true,
    };
  }

  const candidates = await resolveShepherdCandidates(db, input.pariwarId, input.district);
  const pick = candidates[0];
  if (!pick) throw new NoEligibleShepherdError(input.claimCaseId, input.district);

  const projected = await projectClaimState(client, {
    claimCaseId: input.claimCaseId,
    pariwarId: input.pariwarId,
    deceasedMemberId: claimRow.deceasedMemberId,
    intakeChannels: claimRow.intakeChannels,
    claimantActorId: claimRow.claimantActorId,
    eventType: 'claim.shepherd_assigned',
    payload: {
      from_state: claimRow.currentState,
      to_state: claimRow.currentState,
      trigger: 'claim_verification_shepherd_auto_assign',
      actor: 'system',
      shepherd_actor_id: pick.shepherdActorId,
      previous_shepherd_actor_id: null,
      assignment_reason: 'initial',
      supersedes_assignment_id: null,
      district: input.district,
    },
    actorId: input.actorId ?? null,
    ...(input.auditId !== undefined ? { auditId: input.auditId } : {}),
  });

  let assignment: ClaimShepherdAssignmentRow;
  try {
    assignment = await insertAssignmentRow(db, {
      claimCaseId: input.claimCaseId,
      pariwarId: input.pariwarId,
      shepherdActorId: pick.shepherdActorId,
      shepherdDisplay: pick.displayName,
      shepherdContactPhone: pick.contactPhone,
      shepherdContactWhatsapp: pick.contactWhatsapp,
      assignmentReason: 'initial',
    });
  } catch (err) {
    // A concurrent assign slipped past the advisory lock (should not happen) — the partial-unique index
    // rejected the second live row. Throw so the caller rolls back; pg-boss redelivery self-heals via the
    // pre-write check above.
    if (isUniqueViolation(err)) throw new ShepherdReassignmentConflictError(input.claimCaseId);
    throw err;
  }
  return {
    assignment,
    previousShepherdActorId: null,
    eventVersion: projected.eventVersion,
    claimState: projected.state,
    idempotentNoop: false,
  };
}

// ── Reassign (manual R6 + fallback AC4; re-emit + atomic supersession, D-E) ───

/**
 * REASSIGN the shepherd to an explicit target (AC5). Used by BOTH the manual admin route (R6, reason
 * `reassignment`, `actor: 'operator'`) and the AR-61 fallback path (AC4, reason `fallback`,
 * `actor: 'system'`). In one scope-tx: advisory-lock + row-lock the claim, the self-assignment guard
 * (`actor_id === target` on an actor-initiated call ⇒ `ShepherdSelfAssignmentError`), resolve the live
 * assignment, ATOMICALLY supersede it (conditional `UPDATE … WHERE superseded_at IS NULL RETURNING`,
 * 0 rows ⇒ `ShepherdReassignmentConflictError` 409 — the partial-unique is the backstop), insert the new
 * LIVE row (`supersedes_assignment_id` = the superseded id, or `null` when there was no prior shepherd —
 * a fresh fallback), and re-emit the SAME `claim.shepherd_assigned` event carrying
 * `previous_shepherd_actor_id` + `supersedes_assignment_id` (AC5). The caller passes a resolved,
 * contactability-validated target snapshot (the 6.11 actorDisplay posture).
 */
export async function reassignShepherd(
  client: pg.PoolClient,
  input: ReassignShepherdInput,
): Promise<ShepherdAssignmentResult> {
  await acquireAssignLock(client, input.pariwarId, input.claimCaseId);
  const db = bindScopedDb(client);

  const claimRow = await lockClaim(db, input.pariwarId, input.claimCaseId);
  if (!claimRow) throw new ShepherdAssignmentClaimNotFoundError(input.claimCaseId);
  assertShepherdAssignableState(input.claimCaseId, claimRow.currentState);

  // Self-assignment guard (AC5) — actor-initiated only; the fallback path is `actor: 'system'` and exempt.
  if (input.actor !== 'system' && input.actorId === input.targetShepherdActorId) {
    throw new ShepherdSelfAssignmentError(input.claimCaseId, input.actorId ?? input.targetShepherdActorId);
  }

  const live = await getLiveAssignment(db, input.pariwarId, input.claimCaseId);
  if (live) {
    // Atomic supersession — 0 rows ⇒ a concurrent reassignment already superseded it ⇒ conflict (409).
    const superseded = await db
      .update(claimShepherdAssignments)
      .set({ supersededAt: sql`now()` })
      .where(
        and(
          eq(claimShepherdAssignments.assignmentId, live.assignmentId),
          isNull(claimShepherdAssignments.supersededAt),
        ),
      )
      .returning({ assignmentId: claimShepherdAssignments.assignmentId });
    if (superseded.length === 0) throw new ShepherdReassignmentConflictError(input.claimCaseId);
  }

  const previousShepherdActorId = live?.shepherdActorId ?? null;
  const supersedesAssignmentId = live?.assignmentId ?? null;

  let assignment: ClaimShepherdAssignmentRow;
  try {
    assignment = await insertAssignmentRow(db, {
      claimCaseId: input.claimCaseId,
      pariwarId: input.pariwarId,
      shepherdActorId: input.targetShepherdActorId,
      shepherdDisplay: input.targetDisplay,
      shepherdContactPhone: input.targetContactPhone,
      shepherdContactWhatsapp: input.targetContactWhatsapp,
      assignmentReason: input.assignmentReason,
      supersedesAssignmentId,
    });
  } catch (err) {
    if (isUniqueViolation(err)) throw new ShepherdReassignmentConflictError(input.claimCaseId);
    throw err;
  }

  const projected = await projectClaimState(client, {
    claimCaseId: input.claimCaseId,
    pariwarId: input.pariwarId,
    deceasedMemberId: claimRow.deceasedMemberId,
    intakeChannels: claimRow.intakeChannels,
    claimantActorId: claimRow.claimantActorId,
    eventType: 'claim.shepherd_assigned',
    payload: {
      from_state: claimRow.currentState,
      to_state: claimRow.currentState,
      trigger: input.assignmentReason === 'fallback' ? 'claim_shepherd_fallback_assign' : 'claim_shepherd_manual_reassign',
      actor: input.actor,
      shepherd_actor_id: input.targetShepherdActorId,
      previous_shepherd_actor_id: previousShepherdActorId,
      assignment_reason: input.assignmentReason,
      supersedes_assignment_id: supersedesAssignmentId,
      district: input.district,
    },
    actorId: input.actorId,
    ...(input.auditId !== undefined ? { auditId: input.auditId } : {}),
  });

  return {
    assignment,
    previousShepherdActorId,
    eventVersion: projected.eventVersion,
    claimState: projected.state,
    idempotentNoop: false,
  };
}
