// Intake Convergence Point (ICP) primitive — Story 6.4 (Tasks 3/4/5).
//
// AR-62 / Cross-Cutting #13: "every channel-merge node specifies dedup key, in-flight
// session visibility across channels, override semantics under race conditions." This
// module is the first-class ICP for death-claim intake — it formalizes the crude
// same-member convergence 6.2/6.3 already do (advisory-lock + getClaimByDeceasedMember
// dedup) into an auditable, override-aware primitive AND owns the `claim.intake_converged`
// emission that unblocks the 6.5 documents chain.
//
// ── THE SINGLE, COHERENT CONVERGENCE MODEL (do not mix pre-merge + post-merge) ──
// · Lone intake → immediately canonical + `intake_converged`. With an exact-
//   deceased_member_id dedup key a lone intake is unambiguously the canonical case;
//   holding it `intake_pending` awaiting a manual step would strand the common path.
// · Later exact cross-channel match → PRESERVE the existing canonical claim + single
//   freeze; record the second attempt as `pending`; expose both channels on the
//   <ConvergenceDecisionStrip>. Do NOT auto-merge.
// · Authorized merge (operator/trustee) → flip the attempt `converged`, UNION the
//   channel, emit the convergence AUDIT line. NO lifecycle event.
// · Authorized override → mint a distinct canonical claim + a convergence_overrides row.
//
// ── `claim.intake_converged` is emitted EXACTLY ONCE per claim ────────────────
// On the `intake_pending → intake_converged` transition of the lone-intake auto-converge,
// and nowhere else. It is a lifecycle transition, not an audit label: a cross-channel
// merge appends NO lifecycle event (the reducer treats `claim.intake_converged` as
// identity from every non-`intake_pending` state; the event vocabulary must not be
// polluted with no-op transitions).
//
// ── Transaction + writer contract (mirror claim/project.ts) ───────────────────
// Every `claims.current_state` write routes through `projectClaimState` (the trigger
// guard + the claim-state-invariant CI gate both hold) — icp.ts NEVER writes
// claims.current_state directly. The merge's `intake_channels` union is a standalone
// NON-state UPDATE (the gate does not flag it). Runs inside the caller's scope tx
// (pariwar scope already set); takes the raw `pg.PoolClient` like the projector.
// Reads/writes `events_log`/`claims` via the client-bound Drizzle Db (domain owns the
// tables; it cannot import @twt/events — the turbo cycle).

import { createHash, randomUUID } from 'node:crypto';

import { and, asc, desc, eq, gte, notInArray, sql } from 'drizzle-orm';
import type pg from 'pg';

import { bindScopedDb, type Db } from '../db.js';
import {
  claimId as toClaimId,
  intakeAttemptId as toIntakeAttemptId,
  type ClaimId,
  type IntakeAttemptId,
  type MemberId,
  type PariwarId,
} from '../ids/index.js';
import { claims, type ClaimIntakeChannel, type ClaimLifecycleState } from '../schema/claims.js';
import { intakeAttempts, type IntakeAttemptRow } from '../schema/intake_attempts.js';
import { convergenceOverrides } from '../schema/convergence_overrides.js';
import type { ClaimEventActor } from './events.js';
import { projectClaimState } from './project.js';
import { CLAIM_TERMINAL_STATES } from './read.js';

/**
 * The dedup-window HALF-WIDTH in days (AC1). A policy knob (architecture-vs-PRD boundary):
 * a single named constant so a later policy change is one edit, not scattered magic numbers.
 * Two intakes for one death within this window are convergence candidates.
 */
export const CONVERGENCE_WINDOW_DAYS = 30;

/** The freeform `trigger` audit note stamped on the `claim.intake_converged` payload of a
 * lone-intake auto-converge (distinct from the intake_initiated trigger the caller passes). */
const AUTO_CONVERGE_TRIGGER = 'icp_lone_intake_auto_converge';

/** The `claim.intake_converged` trigger for an OVERRIDE's own auto-converge — kept distinct
 * from `AUTO_CONVERGE_TRIGGER` so the two `intake_converged` scenarios are never conflated
 * in the audit trail (AC9 unambiguous lineage). */
const OVERRIDE_AUTO_CONVERGE_TRIGGER = 'icp_override_separate_case_converge';

/**
 * The transaction-scoped advisory-lock key for one death's intake — the SHARED key both the
 * ICP and any convergence-resolution writer take, so concurrent dual-channel filings serialize
 * against the identical lock (the candidate read is then race-safe). Postgres advisory locks
 * take a bigint — derive a stable one from the (pariwarId, deceasedMemberId) pair via a
 * truncated SHA-256. Extracted here (was inline in claims.service.ts) so the API caller +
 * the merge/override endpoints all reuse it.
 */
export function intakeAdvisoryLockKey(pariwarId: string, deceasedMemberId: string): bigint {
  const hex = createHash('sha256').update(`${pariwarId}:${deceasedMemberId}`).digest('hex');
  // 15 hex chars (60 bits) → always positive, safely inside Postgres' signed bigint
  // advisory-lock arg (63 usable magnitude bits).
  return BigInt(`0x${hex.slice(0, 15)}`);
}

/** Acquire the tx-scoped advisory lock for a death (released on COMMIT/ROLLBACK). */
async function acquireIntakeLock(
  client: pg.PoolClient,
  pariwarId: PariwarId,
  deceasedMemberId: MemberId,
): Promise<void> {
  await client.query('SELECT pg_advisory_xact_lock($1)', [
    intakeAdvisoryLockKey(pariwarId, deceasedMemberId).toString(),
  ]);
}

// ── Read accessors (Task 4) ────────────────────────────────────────────────────

/**
 * The live canonical claim (if any) this death should converge onto — the windowed,
 * override-aware candidate for `tryConverge`. Reuses `getClaimByDeceasedMember`'s predicate
 * (non-terminal, most-recent) + the ±30-day window (`created_at >= windowStartAt`, AC1) +
 * the override-apart guard (AC4: a claim explicitly overridden apart for this death is NOT a
 * candidate — future intakes never re-attempt convergence with it). Tenant-scoped by RLS +
 * the explicit `pariwar_id` predicate.
 */
export async function getConvergenceCandidate(
  db: Db,
  pariwarId: PariwarId,
  deceasedMemberId: MemberId,
  windowStartAt: Date,
): Promise<typeof claims.$inferSelect | undefined> {
  const rows = await db
    .select()
    .from(claims)
    .where(
      and(
        eq(claims.pariwarId, pariwarId),
        eq(claims.deceasedMemberId, deceasedMemberId),
        gte(claims.createdAt, windowStartAt),
        // non-terminal (a settled/denied claim must not capture a fresh intake)
        notInArray(claims.currentState, [...CLAIM_TERMINAL_STATES]),
        // AC4 override-apart guard: skip any claim explicitly kept separate for this death.
        sql`NOT EXISTS (
          SELECT 1 FROM ${convergenceOverrides} o
          WHERE o.against_claim_case_id = ${claims.claimCaseId}
            AND o.deceased_member_id = ${deceasedMemberId}
            AND o.pariwar_id = ${pariwarId}
        )`,
      ),
    )
    .orderBy(desc(claims.createdAt))
    .limit(1);
  return rows[0];
}

/** A pending intake attempt + the candidate canonical claim(s) it might converge onto —
 * the <ConvergenceDecisionStrip> list row (AC2/AC3). Cross-channel: each candidate carries
 * its channel SET + created_at + state so the strip renders both paths. */
export interface PendingIntakeAttemptView {
  attempt: IntakeAttemptRow;
  candidates: Array<{
    claimCaseId: ClaimId;
    intakeChannels: ClaimIntakeChannel[];
    currentState: ClaimLifecycleState;
    createdAt: Date;
  }>;
}

/**
 * All `pending` intake attempts in the Pariwar + their candidate canonical claims (AC2/AC3).
 * Feeds the <ConvergenceDecisionStrip>. Tenant-scoped by RLS + the explicit predicate.
 *
 * Candidate filters mirror `getConvergenceCandidate` EXACTLY (non-terminal, ±30-day window,
 * AC4 override-apart guard) — Edge Case Hunter: these had drifted apart, letting the strip
 * show (and `confirmMerge` merge into) out-of-window or explicitly-overridden-apart claims.
 * The window is anchored to EACH attempt's own `created_at`, not to "now" at query time, so
 * re-querying the strip later never silently shrinks a pending attempt's candidate set
 * (Review: a rolling now-relative window would drift).
 *
 * Single LEFT JOIN (not a per-attempt loop) — avoids the N+1 the prior loop-based read had.
 */
export async function getPendingIntakeAttempts(
  db: Db,
  pariwarId: PariwarId,
): Promise<PendingIntakeAttemptView[]> {
  const windowInterval = sql.raw(`interval '${CONVERGENCE_WINDOW_DAYS} days'`);
  const rows = await db
    .select({
      attempt: intakeAttempts,
      candidateClaimCaseId: claims.claimCaseId,
      candidateIntakeChannels: claims.intakeChannels,
      candidateCurrentState: claims.currentState,
      candidateCreatedAt: claims.createdAt,
    })
    .from(intakeAttempts)
    .leftJoin(
      claims,
      and(
        eq(claims.pariwarId, intakeAttempts.pariwarId),
        eq(claims.deceasedMemberId, intakeAttempts.deceasedMemberId),
        gte(claims.createdAt, sql`${intakeAttempts.createdAt} - ${windowInterval}`),
        notInArray(claims.currentState, [...CLAIM_TERMINAL_STATES]),
        sql`NOT EXISTS (
          SELECT 1 FROM ${convergenceOverrides} o
          WHERE o.against_claim_case_id = ${claims.claimCaseId}
            AND o.deceased_member_id = ${intakeAttempts.deceasedMemberId}
            AND o.pariwar_id = ${intakeAttempts.pariwarId}
        )`,
      ),
    )
    .where(and(eq(intakeAttempts.pariwarId, pariwarId), eq(intakeAttempts.attemptStatus, 'pending')))
    .orderBy(asc(intakeAttempts.createdAt), desc(claims.createdAt));

  const views = new Map<string, PendingIntakeAttemptView>();
  for (const row of rows) {
    const key = String(row.attempt.intakeAttemptId);
    let view = views.get(key);
    if (!view) {
      view = { attempt: row.attempt, candidates: [] };
      views.set(key, view);
    }
    if (row.candidateClaimCaseId) {
      view.candidates.push({
        claimCaseId: row.candidateClaimCaseId,
        intakeChannels: row.candidateIntakeChannels ?? [],
        currentState: row.candidateCurrentState as ClaimLifecycleState,
        createdAt: row.candidateCreatedAt as Date,
      });
    }
  }
  return Array.from(views.values());
}

/** Point read of one intake attempt (tenant-scoped like `getClaimCase`). */
export async function getIntakeAttempt(
  db: Db,
  pariwarId: PariwarId,
  attemptId: IntakeAttemptId,
): Promise<IntakeAttemptRow | undefined> {
  const rows = await db
    .select()
    .from(intakeAttempts)
    .where(
      and(eq(intakeAttempts.pariwarId, pariwarId), eq(intakeAttempts.intakeAttemptId, attemptId)),
    )
    .limit(1);
  return rows[0];
}

// ── The ICP primitive (Task 3) ──────────────────────────────────────────────────

export interface TryConvergeInput {
  pariwarId: PariwarId;
  deceasedMemberId: MemberId;
  /** The SINGLE originating channel of THIS attempt. */
  intakeChannel: ClaimIntakeChannel;
  /** The event actor (`claim.*` payload `actor`): 'member' | 'operator' | 'trustee' | 'system'. */
  actor: ClaimEventActor;
  /** The `claims.claimant_actor_id` (v1 null-claimant policy → typically null). */
  claimantActorId: string | null;
  /** The freeform `trigger` audit note on the `claim.intake_initiated` payload. */
  trigger: string;
  /** The `events_log.actor_id`. */
  actorId: string | null;
  /** Caller-supplied audit id (threaded to the projector; the caller owns the audit line). */
  auditId: string;
}

export interface TryConvergeResult {
  /** The canonical claim id all downstream flows reference (AC5/AC6). */
  claimCaseId: string;
  /** The recorded intake attempt (the mint case's `converged` attempt, or the cross-channel
   * `pending` attempt). NULL for a same-channel double-tap (no new attempt recorded). */
  intakeAttemptId: IntakeAttemptId | null;
  /** The canonical claim's current lifecycle state (the second filer is not held on a pending
   * resolution). */
  state: ClaimLifecycleState;
  /** True iff THIS call minted a NEW canonical claim (freeze fired). Maps to `created`. */
  minted: boolean;
  /** True iff a genuine cross-channel second attempt was recorded `pending` awaiting resolution. */
  convergencePending: boolean;
}

/**
 * The ICP entry point (AC1/AC3/AC5/AC7/AC9). Deduplicates an intake attempt against the live
 * canonical claim for the death within the ±30-day window and resolves it per the single
 * convergence model above. MUST run inside the caller's scope tx (pariwar scope already set).
 *
 * @throws ZodError / ClaimStreamConcurrencyError propagated from `projectClaimState`.
 */
export async function tryConverge(
  client: pg.PoolClient,
  input: TryConvergeInput,
): Promise<TryConvergeResult> {
  const db = bindScopedDb(client);

  // (1) Serialize concurrent intakes for THIS death so the candidate read is race-safe.
  await acquireIntakeLock(client, input.pariwarId, input.deceasedMemberId);

  // (2) Windowed, override-aware candidate lookup.
  const windowStartAt = new Date(Date.now() - CONVERGENCE_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const candidate = await getConvergenceCandidate(
    db,
    input.pariwarId,
    input.deceasedMemberId,
    windowStartAt,
  );

  // (3a) NO CANDIDATE → this attempt IS the canonical claim. Mint + intake_initiated (freeze)
  //      + immediately intake_converged. The attempt row is `converged` from birth.
  if (!candidate) {
    const claimCaseId = toClaimId(randomUUID());
    const deceasedMemberIdStr = String(input.deceasedMemberId);

    // intake_initiated → intake_pending (fires the single account freeze).
    await projectClaimState(client, {
      claimCaseId,
      pariwarId: input.pariwarId,
      deceasedMemberId: input.deceasedMemberId,
      intakeChannels: [input.intakeChannel],
      claimantActorId: input.claimantActorId,
      eventType: 'claim.intake_initiated',
      payload: {
        from_state: null,
        to_state: 'intake_pending',
        trigger: input.trigger,
        actor: input.actor,
        deceased_member_id: deceasedMemberIdStr,
        intake_channel: input.intakeChannel,
        claimant_actor_id: input.claimantActorId,
      },
      actorId: input.actorId,
      auditId: input.auditId,
    });

    // intake_pending → intake_converged (emitted EXACTLY ONCE, here and nowhere else).
    const converged = await projectClaimState(client, {
      claimCaseId,
      pariwarId: input.pariwarId,
      deceasedMemberId: input.deceasedMemberId,
      intakeChannels: [input.intakeChannel],
      claimantActorId: input.claimantActorId,
      eventType: 'claim.intake_converged',
      payload: {
        from_state: 'intake_pending',
        to_state: 'intake_converged',
        trigger: AUTO_CONVERGE_TRIGGER,
        actor: input.actor,
      },
      actorId: input.actorId,
      auditId: input.auditId,
    });

    const attemptId = toIntakeAttemptId(randomUUID());
    await db.insert(intakeAttempts).values({
      intakeAttemptId: attemptId,
      pariwarId: input.pariwarId,
      deceasedMemberId: input.deceasedMemberId,
      intakeChannel: input.intakeChannel,
      claimantActorId: input.claimantActorId,
      attemptStatus: 'converged',
      supersededByClaimCaseId: claimCaseId,
      createdByActor: input.actorId,
      resolvedAt: new Date(),
    });

    return {
      claimCaseId: String(claimCaseId),
      intakeAttemptId: attemptId,
      state: converged.state,
      minted: true,
      convergencePending: false,
    };
  }

  // (3b) ONE CANDIDATE, channel ALREADY associated → a trivial same-channel retry (double-tap).
  //      Idempotent no-op: no new attempt, no event, return the existing claim.
  if (candidate.intakeChannels.includes(input.intakeChannel)) {
    return {
      claimCaseId: candidate.claimCaseId,
      intakeAttemptId: null,
      state: candidate.currentState,
      minted: false,
      convergencePending: false,
    };
  }

  // (3c) ONE CANDIDATE, channel NOT yet associated → the genuine cross-channel case. Do NOT
  //      mint / freeze / union / emit. Record a `pending` attempt (deduped) awaiting operator/
  //      trustee resolution; return the EXISTING canonical claim (second filer not blocked).
  const existingPending = await db
    .select()
    .from(intakeAttempts)
    .where(
      and(
        eq(intakeAttempts.pariwarId, input.pariwarId),
        eq(intakeAttempts.deceasedMemberId, input.deceasedMemberId),
        eq(intakeAttempts.intakeChannel, input.intakeChannel),
        eq(intakeAttempts.attemptStatus, 'pending'),
      ),
    )
    .limit(1);

  let pendingAttemptId: IntakeAttemptId;
  if (existingPending[0]) {
    pendingAttemptId = existingPending[0].intakeAttemptId;
  } else {
    pendingAttemptId = toIntakeAttemptId(randomUUID());
    await db.insert(intakeAttempts).values({
      intakeAttemptId: pendingAttemptId,
      pariwarId: input.pariwarId,
      deceasedMemberId: input.deceasedMemberId,
      intakeChannel: input.intakeChannel,
      claimantActorId: input.claimantActorId,
      attemptStatus: 'pending',
      supersededByClaimCaseId: null,
      createdByActor: input.actorId,
      resolvedAt: null,
    });
  }

  return {
    claimCaseId: candidate.claimCaseId,
    intakeAttemptId: pendingAttemptId,
    state: candidate.currentState,
    minted: false,
    convergencePending: true,
  };
}

// ── The authorized-merge writer (Task 5) ────────────────────────────────────────

export interface ConvergeIntakeAttemptInput {
  intakeAttemptId: IntakeAttemptId;
  pariwarId: PariwarId;
  deceasedMemberId: MemberId;
  canonicalClaimCaseId: ClaimId;
  intakeChannel: ClaimIntakeChannel;
  resolvedByActor: string;
  auditId: string;
}

export interface ConvergeIntakeAttemptResult {
  /** The canonical claim's channel set AFTER the union (order-insensitive assertion target). */
  intakeChannels: ClaimIntakeChannel[];
  /** True iff this call performed the merge; false on an idempotent no-op (already converged). */
  merged: boolean;
}

/**
 * The channel-union on an AUTHORIZED merge (invoked ONLY by the Task 7 merge endpoint; AC3/AC5).
 * In one tx: (a) UNION `intakeChannel` into `claims.intake_channels` via a plain non-state
 * UPDATE (the claim-state-invariant gate does not flag it — `current_state` is untouched); (b)
 * flip the attempt `pending → converged`, set `superseded_by_claim_case_id`, stamp `resolved_at`.
 * Appends NO lifecycle event (the reducer treats `claim.intake_converged` as identity from every
 * non-`intake_pending` state); the CALLER emits the `*.convergence_merged` audit line.
 *
 * Idempotent: merging an already-`converged` attempt is a no-op (returns the current channel set,
 * `merged: false`).
 */
export async function convergeIntakeAttempt(
  client: pg.PoolClient,
  input: ConvergeIntakeAttemptInput,
): Promise<ConvergeIntakeAttemptResult> {
  const db = bindScopedDb(client);

  // Serialize against concurrent resolution (merge/override) of the SAME death's attempts —
  // the identical lock `tryConverge`/`overrideIntakeAttempt` take, so a re-fetch after
  // acquiring it is race-safe (Blind Hunter: merge previously ran lock-free).
  await acquireIntakeLock(client, input.pariwarId, input.deceasedMemberId);

  const attemptRows = await db
    .select()
    .from(intakeAttempts)
    .where(eq(intakeAttempts.intakeAttemptId, input.intakeAttemptId))
    .limit(1);
  const attempt = attemptRows[0];
  if (!attempt) {
    throw new Error(`convergeIntakeAttempt: intake attempt not found: ${input.intakeAttemptId}`);
  }
  if (attempt.attemptStatus === 'overridden_separate') {
    throw new Error(
      `convergeIntakeAttempt: attempt ${input.intakeAttemptId} was concurrently overridden separate`,
    );
  }

  // Read the canonical claim's current channel set (RLS-scoped point read).
  const claimRows = await db
    .select({ intakeChannels: claims.intakeChannels })
    .from(claims)
    .where(eq(claims.claimCaseId, input.canonicalClaimCaseId))
    .limit(1);
  const currentChannels = claimRows[0]?.intakeChannels ?? [];

  // Idempotent no-op: the attempt is already converged (a re-submitted merge).
  if (attempt.attemptStatus === 'converged') {
    return { intakeChannels: currentChannels, merged: false };
  }

  // (a) UNION the channel into claims.intake_channels — a standalone NON-state UPDATE (raw SQL
  //     so it can never be mistaken for a current_state write; the projector is NOT the merge's
  //     writer in the corrected model, so the projector's conflict path stays untouched).
  await client.query(
    `UPDATE claims
        SET intake_channels = (
              SELECT array_agg(DISTINCT c ORDER BY c)
              FROM unnest(array_append(intake_channels, $1::claim_intake_channel)) AS c
            ),
            updated_at = now()
      WHERE claim_case_id = $2`,
    [input.intakeChannel, String(input.canonicalClaimCaseId)],
  );
  // Re-read the unioned set via Drizzle (which parses the enum-array column type; a raw pg
  // RETURNING would hand back the unparsed '{a,b}' string).
  const afterRows = await db
    .select({ intakeChannels: claims.intakeChannels })
    .from(claims)
    .where(eq(claims.claimCaseId, input.canonicalClaimCaseId))
    .limit(1);
  const unionedChannels = afterRows[0]?.intakeChannels ?? currentChannels;

  // (b) Flip the attempt pending → converged + record its canonical supersession.
  await db
    .update(intakeAttempts)
    .set({
      attemptStatus: 'converged',
      supersededByClaimCaseId: input.canonicalClaimCaseId,
      resolvedByActor: input.resolvedByActor,
      resolvedAt: new Date(),
    })
    .where(eq(intakeAttempts.intakeAttemptId, input.intakeAttemptId));

  return { intakeChannels: unionedChannels, merged: true };
}

// ── The authorized-override writer (Task 7 support) ─────────────────────────────

export interface OverrideIntakeAttemptInput {
  intakeAttemptId: IntakeAttemptId;
  pariwarId: PariwarId;
  deceasedMemberId: MemberId;
  intakeChannel: ClaimIntakeChannel;
  /** The canonical claim the attempt was NOT merged into (the override ledger's `against`). */
  againstClaimCaseId: ClaimId;
  reason: string;
  actor: ClaimEventActor;
  claimantActorId: string | null;
  decidedByActor: string;
  auditId: string;
}

export interface OverrideIntakeAttemptResult {
  /** The NEW distinct canonical claim minted for the separated attempt. */
  newClaimCaseId: string;
  /** The new claim's lifecycle state (intake_converged — its own lone-intake auto-converge). */
  state: ClaimLifecycleState;
}

/**
 * The authorized OVERRIDE writer (invoked ONLY by the Task 7 override endpoint; AC4). Treats the
 * pending attempt as a SEPARATE case: (a) record the `convergence_overrides` ledger row; (b) mint
 * a DISTINCT canonical claim (its own intake_initiated → intake_converged); (c) flip the attempt
 * `overridden_separate`, `superseded_by_claim_case_id` = the NEW claim. The CALLER emits the
 * `*.convergence_overridden` audit line. MUST run inside the caller's scope tx.
 *
 * ⚠ Ships ONLY behind the Task-7 aggregate-overlay gate (override must never weaken the account
 * freeze — see the route). This writer is the mutation half; the route decides whether to call it.
 */
export async function overrideIntakeAttempt(
  client: pg.PoolClient,
  input: OverrideIntakeAttemptInput,
): Promise<OverrideIntakeAttemptResult> {
  const db = bindScopedDb(client);

  await acquireIntakeLock(client, input.pariwarId, input.deceasedMemberId);

  // Re-check status AFTER the lock — the handler's pre-check ran before the lock was held,
  // so a concurrent merge/override on the same attempt could have already resolved it
  // (Edge Case Hunter: TOCTOU between the handler's read and this writer's execution).
  const freshRows = await db
    .select({ attemptStatus: intakeAttempts.attemptStatus })
    .from(intakeAttempts)
    .where(eq(intakeAttempts.intakeAttemptId, input.intakeAttemptId))
    .limit(1);
  if (freshRows[0]?.attemptStatus !== 'pending') {
    throw new Error(
      `overrideIntakeAttempt: attempt ${input.intakeAttemptId} is no longer pending (concurrent resolution)`,
    );
  }

  // (a) Append the AC4 override ledger row (reason + actor + against-claim).
  await db.insert(convergenceOverrides).values({
    pariwarId: input.pariwarId,
    deceasedMemberId: input.deceasedMemberId,
    intakeAttemptId: input.intakeAttemptId,
    againstClaimCaseId: input.againstClaimCaseId,
    reason: input.reason,
    decidedByActor: input.decidedByActor,
  });

  // (b) Mint a DISTINCT canonical claim for the separated attempt (its own auto-converge).
  const newClaimCaseId = toClaimId(randomUUID());
  const deceasedMemberIdStr = String(input.deceasedMemberId);
  await projectClaimState(client, {
    claimCaseId: newClaimCaseId,
    pariwarId: input.pariwarId,
    deceasedMemberId: input.deceasedMemberId,
    intakeChannels: [input.intakeChannel],
    claimantActorId: input.claimantActorId,
    eventType: 'claim.intake_initiated',
    payload: {
      from_state: null,
      to_state: 'intake_pending',
      trigger: 'icp_override_separate_case',
      actor: input.actor,
      deceased_member_id: deceasedMemberIdStr,
      intake_channel: input.intakeChannel,
      claimant_actor_id: input.claimantActorId,
    },
    actorId: input.decidedByActor,
    auditId: input.auditId,
  });
  const converged = await projectClaimState(client, {
    claimCaseId: newClaimCaseId,
    pariwarId: input.pariwarId,
    deceasedMemberId: input.deceasedMemberId,
    intakeChannels: [input.intakeChannel],
    claimantActorId: input.claimantActorId,
    eventType: 'claim.intake_converged',
    payload: {
      from_state: 'intake_pending',
      to_state: 'intake_converged',
      trigger: OVERRIDE_AUTO_CONVERGE_TRIGGER,
      actor: input.actor,
    },
    actorId: input.decidedByActor,
    auditId: input.auditId,
  });

  // (c) Flip the attempt overridden_separate → superseded by the NEW distinct claim.
  await db
    .update(intakeAttempts)
    .set({
      attemptStatus: 'overridden_separate',
      supersededByClaimCaseId: newClaimCaseId,
      resolvedByActor: input.decidedByActor,
      resolvedAt: new Date(),
    })
    .where(eq(intakeAttempts.intakeAttemptId, input.intakeAttemptId));

  return { newClaimCaseId: String(newClaimCaseId), state: converged.state };
}
