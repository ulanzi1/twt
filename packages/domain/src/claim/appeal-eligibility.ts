// Appeal eligibility + reviewer-conflict + SLA-status derivations — Story 6.16 (Task 3; D-D/D-E/D-F/D-H).
// Transport-free, pure DB reads. NO write-path here — these feed the write-paths (appeal-persist.ts /
// appeal-panel-persist.ts) and the read models.
//
//   · getOriginalDeciderActorIds — the D-D reviewer-conflict exclusion set: every actor who already
//     adjudicated this claim (all verifier deciders + all State-Trustee deciders + all R9 panel voters,
//     live+superseded, any outcome). A Stage-1 reviewer must be in NEITHER set.
//   · assertAppealInitiable — the D-E/D-F initiation guard: `current_state === 'denied'` (no elapsed-time
//     gate — D-E removed the claimant-facing deadline) AND no prior appeal journey exists (D-F — exactly one
//     journey per claim, ever).
//   · getAppealConfig / computeStageSlaStatus — the D-H trust-side per-stage SLA read: derived at query time
//     from the stage-entry event's occurred_at vs the Pariwar-scoped config duration. NEVER a write-path gate.

import { and, desc, eq, inArray } from 'drizzle-orm';

import { type Db } from '../db.js';
import type { ClaimId, PariwarId } from '../ids/index.js';
import { clampLimit } from '../pagination.js';
import { claims } from '../schema/claims.js';
import { claimVerifierDecisions } from '../schema/claim_verifier_decisions.js';
import { claimStateTrusteeDecisions } from '../schema/claim_state_trustee_decisions.js';
import { claimR9Votes } from '../schema/claim_r9_votes.js';
import { claimAppeals } from '../schema/claim_appeals.js';
import { pariwarAppealConfig } from '../schema/pariwar_appeal_config.js';
import { eventsLog } from '../schema/events_log.js';
import {
  type AppealStage,
  type AppealStageSlaDays,
  DEFAULT_APPEAL_STAGE_SLA_DAYS,
  type AppealLegalReviewStatus,
} from './appeal.js';

/** A per-Pariwar bounded cap on the decider-actor scans (clamped through the domain limit-clamp gate). A
 *  claim accrues a handful of decisions over its life; this is a defensive non-caller ceiling. */
const DECIDER_SCAN_CAP = 500;

// ── Typed guards (the route maps each to a stable 4xx) ─────────────────────────

/** Thrown by initiate when the claim's live state is not `denied` (AC1 → 409). */
export class AppealNotDeniedError extends Error {
  public readonly name = 'AppealNotDeniedError';
  public constructor(
    public readonly claimCaseId: string,
    public readonly currentState: string,
  ) {
    super(`[appeal] claim ${claimCaseId} is '${currentState}' — an appeal can only be initiated from 'denied'`);
  }
}

/** Thrown by initiate when the claim ALREADY has an appeal journey — exactly one per claim, ever (D-F → 409).
 *  The write-path guard + the unconditional `UNIQUE (claim_case_id)` on claim_appeals together enforce this
 *  (a guard-bypass race hits 23505). */
export class AppealAlreadyExhaustedError extends Error {
  public readonly name = 'AppealAlreadyExhaustedError';
  public constructor(
    public readonly claimCaseId: string,
    public readonly status: string,
  ) {
    super(
      `[appeal] claim ${claimCaseId} already has an appeal journey (status '${status}') — exactly one appeal ` +
        `journey per claim is permitted, ever (D-F)`,
    );
  }
}

// ── D-D reviewer-conflict exclusion set ────────────────────────────────────────

export interface OriginalDeciderActorIds {
  /** Every actor who filed a verifier decision on this claim (any outcome, live+superseded). */
  verifierIds: Set<string>;
  /** Every actor who acted as a State-Trustee decider OR an R9 panel voter on this claim (D-D — the R9-voter
   *  inclusion deliberately strengthens separation-of-duties beyond the literal two-party list). */
  trusteeIds: Set<string>;
}

/**
 * Derive the D-D reviewer-conflict exclusion set for a claim (AC2). Pure DB reads: the union of every
 * `claim_verifier_decisions.actor_id` (any outcome, live+superseded), every
 * `claim_state_trustee_decisions.actor_id`, and every `claim_r9_votes.voter_actor_id` for the claim. A
 * Stage-1 appeal reviewer must be in NEITHER set (`reviewer_actor_id ∉ verifierIds ∪ trusteeIds`). Every
 * dynamic scan is clamped (the domain limit-clamp gate).
 */
export async function getOriginalDeciderActorIds(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
): Promise<OriginalDeciderActorIds> {
  const cap = { default: DECIDER_SCAN_CAP, cap: DECIDER_SCAN_CAP };

  const verifierRows = await db
    .select({ actorId: claimVerifierDecisions.actorId })
    .from(claimVerifierDecisions)
    .where(and(eq(claimVerifierDecisions.pariwarId, pariwarId), eq(claimVerifierDecisions.claimCaseId, claimCaseId)))
    .limit(clampLimit(DECIDER_SCAN_CAP, cap));

  const trusteeRows = await db
    .select({ actorId: claimStateTrusteeDecisions.actorId })
    .from(claimStateTrusteeDecisions)
    .where(
      and(
        eq(claimStateTrusteeDecisions.pariwarId, pariwarId),
        eq(claimStateTrusteeDecisions.claimCaseId, claimCaseId),
      ),
    )
    .limit(clampLimit(DECIDER_SCAN_CAP, cap));

  const r9VoterRows = await db
    .select({ actorId: claimR9Votes.voterActorId })
    .from(claimR9Votes)
    .where(and(eq(claimR9Votes.pariwarId, pariwarId), eq(claimR9Votes.claimCaseId, claimCaseId)))
    .limit(clampLimit(DECIDER_SCAN_CAP, cap));

  const verifierIds = new Set(verifierRows.map((r) => r.actorId));
  const trusteeIds = new Set<string>();
  for (const r of trusteeRows) trusteeIds.add(r.actorId);
  for (const r of r9VoterRows) trusteeIds.add(r.actorId);
  return { verifierIds, trusteeIds };
}

/** True iff `actorId` already adjudicated this claim in ANY role (the D-D exclusion predicate). */
export function isOriginalDecider(set: OriginalDeciderActorIds, actorId: string): boolean {
  return set.verifierIds.has(actorId) || set.trusteeIds.has(actorId);
}

// ── D-E/D-F initiation guard ───────────────────────────────────────────────────

/**
 * Assert an appeal may be initiated on this claim (AC1). Throws `AppealNotDeniedError` when the claim's live
 * state is not `denied`, or `AppealAlreadyExhaustedError` when a prior appeal journey already exists (D-F —
 * exactly one journey per claim, ever). There is deliberately NO window/deadline check (D-E removed the
 * claimant-facing deadline — do NOT reintroduce an elapsed-time gate here). Reads the claim row + the
 * claim_appeals anchor; the caller (initiateAppeal) holds the claim row lock.
 */
export async function assertAppealInitiable(db: Db, pariwarId: PariwarId, claimCaseId: ClaimId): Promise<void> {
  const claimRows = await db
    .select({ currentState: claims.currentState })
    .from(claims)
    .where(and(eq(claims.pariwarId, pariwarId), eq(claims.claimCaseId, claimCaseId)))
    .limit(1);
  const claimRow = claimRows[0];
  // A missing claim surfaces as not-denied — the initiate write-path re-checks existence under its lock.
  if (!claimRow || claimRow.currentState !== 'denied') {
    throw new AppealNotDeniedError(claimCaseId, claimRow?.currentState ?? 'not_found');
  }

  // D-F — any existing journey (open OR terminal) blocks a new one (the unconditional unique is the backstop).
  const existing = await db
    .select({ status: claimAppeals.status })
    .from(claimAppeals)
    .where(and(eq(claimAppeals.pariwarId, pariwarId), eq(claimAppeals.claimCaseId, claimCaseId)))
    .limit(1);
  if (existing[0]) throw new AppealAlreadyExhaustedError(claimCaseId, existing[0].status);
}

// ── D-H trust-side per-stage SLA read ──────────────────────────────────────────

export interface AppealConfig {
  legalReviewStatus: AppealLegalReviewStatus;
  slaDays: AppealStageSlaDays;
}

/**
 * Read the Pariwar's appeal config (D-G legal-review status + D-H per-stage SLA durations). Falls back to
 * DEFAULT_APPEAL_STAGE_SLA_DAYS + the fail-closed `pending_legal_review` when no row exists (or is not
 * readable under the scope — RLS fail-closed). Pure read.
 */
export async function getAppealConfig(db: Db, pariwarId: PariwarId): Promise<AppealConfig> {
  const rows = await db
    .select({
      legalReviewStatus: pariwarAppealConfig.legalReviewStatus,
      slaStage1Days: pariwarAppealConfig.slaStage1Days,
      slaStage2Days: pariwarAppealConfig.slaStage2Days,
      slaStage3Days: pariwarAppealConfig.slaStage3Days,
    })
    .from(pariwarAppealConfig)
    .where(eq(pariwarAppealConfig.pariwarId, pariwarId))
    .limit(1);
  const row = rows[0];
  if (!row) {
    return { legalReviewStatus: 'pending_legal_review', slaDays: { ...DEFAULT_APPEAL_STAGE_SLA_DAYS } };
  }
  return {
    legalReviewStatus: row.legalReviewStatus,
    slaDays: { stage1: row.slaStage1Days, stage2: row.slaStage2Days, stage3: row.slaStage3Days },
  };
}

/** The events_log event type whose occurred_at marks the claim's ENTRY into each appeal stage (D-H clock
 *  start — derived from event replay, no new event/column needed). Stage 1: the initiate event. Stage 2/3:
 *  the prior stage's `advance` reviewed event (which moved the claim into this stage). */
const STAGE_ENTRY_EVENT_TYPE: Record<AppealStage, string> = {
  '1': 'claim.appeal_stage1_initiated',
  '2': 'claim.appeal_stage1_reviewed',
  '3': 'claim.appeal_stage2_reviewed',
};

export interface StageSlaStatus {
  /** When the claim entered this stage (the stage-entry event's occurred_at), or null if not yet entered. */
  stageEnteredAt: Date | null;
  /** The Pariwar-scoped SLA duration for this stage, in days. */
  slaDays: number;
  /** Whole days elapsed since stage entry (null when not yet entered). */
  elapsedDays: number | null;
  /** True iff `elapsedDays > slaDays` (D-H). Read-only signal — NEVER blocks a write-path (D-E/D-H). */
  breached: boolean;
}

/**
 * Compute the trust-side SLA status for a claim's appeal stage (AC11, D-H). Reads the stage-entry transition
 * event's `occurred_at` from `events_log` (event replay is the source — no new event/column), compares
 * against the Pariwar-scoped `sla_stage{N}_days` config duration (Task 1), at instant `at`. Pure read,
 * computed at query time — NEVER a cron/new event, NEVER used to block/expire anything (D-H). Feeds the AC6
 * audit query + the admin "overdue appeals" indicator. When the stage has not been entered, `breached` is
 * false and the elapsed/entered fields are null.
 */
export async function computeStageSlaStatus(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
  stage: AppealStage,
  at: Date,
  config?: AppealConfig,
): Promise<StageSlaStatus> {
  const cfg = config ?? (await getAppealConfig(db, pariwarId));
  const slaDays = stage === '1' ? cfg.slaDays.stage1 : stage === '2' ? cfg.slaDays.stage2 : cfg.slaDays.stage3;

  const entryRows = await db
    .select({ occurredAt: eventsLog.occurredAt })
    .from(eventsLog)
    .where(and(eq(eventsLog.streamId, claimCaseId), eq(eventsLog.eventType, STAGE_ENTRY_EVENT_TYPE[stage])))
    .orderBy(desc(eventsLog.occurredAt))
    .limit(1);
  const stageEnteredAt = entryRows[0]?.occurredAt ?? null;

  if (!stageEnteredAt) {
    return { stageEnteredAt: null, slaDays, elapsedDays: null, breached: false };
  }
  const elapsedMs = at.getTime() - stageEnteredAt.getTime();
  const elapsedDays = Math.floor(elapsedMs / (24 * 60 * 60 * 1000));
  return { stageEnteredAt, slaDays, elapsedDays, breached: elapsedDays > slaDays };
}

/** Key a batch SLA-status lookup by (claimCaseId, stage) — one status per pair. */
export function stageSlaBatchKey(claimCaseId: string, stage: AppealStage): string {
  return `${claimCaseId}:${stage}`;
}

/**
 * The batched sibling of `computeStageSlaStatus` — for read surfaces that need SLA status across MANY
 * (claimCaseId, stage) pairs at once (the AC6 audit endpoint, D-H). Issues ONE `events_log` query per
 * DISTINCT stage present in `items` (not one per row — avoids the N+1 the single-item version would cause
 * under a `.map()`), then computes each item's status locally against its own `at` instant.
 */
export async function computeStageSlaStatusBatch(
  db: Db,
  pariwarId: PariwarId,
  items: readonly { claimCaseId: ClaimId; stage: AppealStage; at: Date }[],
  config?: AppealConfig,
): Promise<Map<string, StageSlaStatus>> {
  const cfg = config ?? (await getAppealConfig(db, pariwarId));

  const claimIdsByStage = new Map<AppealStage, Set<ClaimId>>();
  for (const item of items) {
    const set = claimIdsByStage.get(item.stage) ?? new Set<ClaimId>();
    set.add(item.claimCaseId);
    claimIdsByStage.set(item.stage, set);
  }

  // stageEnteredAt per (claimCaseId, stage), populated with ONE query per distinct stage.
  const enteredAtByKey = new Map<string, Date>();
  for (const [stage, claimIds] of claimIdsByStage) {
    const rows = await db
      .select({ streamId: eventsLog.streamId, occurredAt: eventsLog.occurredAt })
      .from(eventsLog)
      .where(and(inArray(eventsLog.streamId, [...claimIds]), eq(eventsLog.eventType, STAGE_ENTRY_EVENT_TYPE[stage])))
      .orderBy(desc(eventsLog.occurredAt));
    // Rows arrive latest-first per streamId — keep only the first (latest) occurrence for each.
    const seen = new Set<string>();
    for (const r of rows) {
      if (seen.has(r.streamId)) continue;
      seen.add(r.streamId);
      enteredAtByKey.set(stageSlaBatchKey(r.streamId, stage), r.occurredAt);
    }
  }

  const result = new Map<string, StageSlaStatus>();
  for (const item of items) {
    const slaDays = item.stage === '1' ? cfg.slaDays.stage1 : item.stage === '2' ? cfg.slaDays.stage2 : cfg.slaDays.stage3;
    const key = stageSlaBatchKey(item.claimCaseId, item.stage);
    const stageEnteredAt = enteredAtByKey.get(key) ?? null;
    if (!stageEnteredAt) {
      result.set(key, { stageEnteredAt: null, slaDays, elapsedDays: null, breached: false });
      continue;
    }
    const elapsedMs = item.at.getTime() - stageEnteredAt.getTime();
    const elapsedDays = Math.floor(elapsedMs / (24 * 60 * 60 * 1000));
    result.set(key, { stageEnteredAt, slaDays, elapsedDays, breached: elapsedDays > slaDays });
  }
  return result;
}
