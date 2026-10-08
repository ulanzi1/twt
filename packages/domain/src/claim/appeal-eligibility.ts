// Appeal eligibility + reviewer-conflict + SLA-status derivations — Story 6.16 (Task 3; D-D/D-E/D-F/D-H).
// Transport-free, pure DB reads. NO write-path here — these feed the write-paths (appeal-persist.ts /
// appeal-panel-persist.ts) and the read models.
//
//   · getOriginalDeciderActorIds — the D-D reviewer-conflict exclusion set: every actor who already
//     adjudicated this claim (all verifier deciders + all State-Trustee deciders + all R9 panel voters,
//     live+superseded, any outcome). A Stage-1 reviewer must be in NEITHER set.
//   · assertAppealInitiable — the D-E/D-F initiation guard: `current_state === 'denied'` (no elapsed-time
//     gate — D-E removed the claimant-facing deadline) AND no prior appeal journey exists (D-F — exactly one
//     journey per claim, ever). ⚠ Story 6.24a (`2026-10-07-291` Q1 A, RF14): EXCEPT a refusal whose live reason is
//     `post_death_nominee_change` — it can be appealed for 90 days from the refusal (its fourth guard).
//   · getAppealConfig / computeStageSlaStatus — the D-H trust-side per-stage SLA read: derived at query time
//     from the stage-entry event's occurred_at vs the Pariwar-scoped config duration. NEVER a write-path gate.

import { and, desc, eq, inArray } from 'drizzle-orm';

import { type Db } from '../db.js';
import type { ClaimId, MemberId, PariwarId } from '../ids/index.js';
import { clampLimit } from '../pagination.js';
import { claims, type ClaimLifecycleState } from '../schema/claims.js';
import { claimVerifierDecisions } from '../schema/claim_verifier_decisions.js';
import { claimStateTrusteeDecisions } from '../schema/claim_state_trustee_decisions.js';
import { claimR9Votes } from '../schema/claim_r9_votes.js';
import { claimAppeals } from '../schema/claim_appeals.js';
import { claimCorrectionClosures } from '../schema/claim_correction_closure.js';
import { pariwarAppealConfig } from '../schema/pariwar_appeal_config.js';
import { eventsLog } from '../schema/events_log.js';
import type { CalendarDateString } from '../cycle-calendar/holiday-resolver.js';
import {
  hasSuspicionRefusalAppealLimitPassed,
  readSuspicionChainStart,
  suspicionRefusalAppealUntil,
} from './suspicion-refusal.js';
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

/**
 * Story 6.19c (AC7, `2026-09-20-231` A, invariant 6, T3) — the claim was CLOSED FOR NO RESPONSE (a `closed` row in
 * `claim_correction_closures`): the second refusal, ⛔ never appealable. Its OWN 409 code
 * (`appeal.closed_no_response`, ⛔ `appeal.not_denied` — the claim IS denied). Thrown by `assertAppealInitiable`, so
 * every initiation path — the operator's on-behalf initiate (the production one) and the member route — refuses it.
 */
export class AppealClosedNoResponseError extends Error {
  public readonly name = 'AppealClosedNoResponseError';
  public constructor(public readonly claimCaseId: string) {
    super(`[appeal] claim ${claimCaseId} was closed for no response — a closure is not appealable`);
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

/**
 * ⭐ Story 6.24a RF14 (`2026-10-07-291` Q1 A) — a refusal on suspicion of a post-death nominee change (live reason
 * `post_death_nominee_change`) can be appealed for 90 days from the refusal; from 00:00 IST on D + 91 it can ⛔ no longer
 * be. `appealUntil` is the last IST date it could be (D + 90). → 409 `appeal.suspicion_refusal_time_limit_passed`
 * `{ appeal_until }` — ⛔ never a 500. Every other reason: ⛔ no time limit (6.16 D-E unchanged for it).
 */
export class AppealTimeLimitPassedError extends Error {
  public readonly name = 'AppealTimeLimitPassedError';
  public constructor(
    public readonly claimCaseId: string,
    public readonly appealUntil: CalendarDateString,
  ) {
    super(`[appeal] claim ${claimCaseId}'s refusal could be appealed until ${appealUntil} — the time to appeal has ended`);
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
 * claimant-facing deadline — do NOT reintroduce an elapsed-time gate here) — except for a `-239` refusal
 * (`2026-10-07-291` Q1 A): Story 6.24a's FOURTH guard, AFTER the three above, refuses a claim whose LIVE decision is
 * the `-239` refusal once its 90 days have passed (`AppealTimeLimitPassedError`). Reads the claim row + the
 * claim_appeals anchor; the caller (initiateAppeal) holds the claim row lock.
 *
 * `opts.clock` — the instant the limit is judged at: `initiateAppeal` passes the `clock_timestamp()` it read AFTER RF15's
 * per-death key (Trap 16 — ⛔ never the transaction's `now()`); absent ⇒ the guard's own statement clock.
 * `opts.chain` — the chain-start read, when the caller already took it (`initiateAppeal`, under this claim's row
 * lock — stable for the rest of that transaction): reused here instead of a second identical query. Omitted ⇒ read
 * it here (the helpline screen's lock-free read has no earlier read to reuse).
 */
export async function assertAppealInitiable(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
  opts: { readonly clock?: Date; readonly chain?: { readonly chainStartedAt: Date; readonly clock: Date } | null } = {},
): Promise<void> {
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

  // Story 6.19c (AC7) — a closure for no response is ⛔ never appealable (`-231` A). Keyed on the CLOSURE ROW (D1:
  // "the table is the marker for the 409 code"), ⛔ on `denied_no_appeal` (a stage-3 uphold emits that too).
  const closed = await db
    .select({ id: claimCorrectionClosures.closureId })
    .from(claimCorrectionClosures)
    .where(
      and(
        eq(claimCorrectionClosures.pariwarId, pariwarId),
        eq(claimCorrectionClosures.claimCaseId, claimCaseId),
        eq(claimCorrectionClosures.state, 'closed'),
      ),
    )
    .limit(1);
  if (closed[0]) throw new AppealClosedNoResponseError(claimCaseId);

  // D-F — any existing journey (open OR terminal) blocks a new one (the unconditional unique is the backstop).
  const existing = await db
    .select({ status: claimAppeals.status })
    .from(claimAppeals)
    .where(and(eq(claimAppeals.pariwarId, pariwarId), eq(claimAppeals.claimCaseId, claimCaseId)))
    .limit(1);
  if (existing[0]) throw new AppealAlreadyExhaustedError(claimCaseId, existing[0].status);

  // ⭐ Story 6.24a RF14 — the FOURTH guard: a `-239` refusal past its 90 days (the first row of its CURRENT `-239` chain).
  const chain = opts.chain !== undefined ? opts.chain : await readSuspicionChainStart(db, pariwarId, claimCaseId);
  if (chain && hasSuspicionRefusalAppealLimitPassed(chain.chainStartedAt, opts.clock ?? chain.clock)) {
    throw new AppealTimeLimitPassedError(claimCaseId, suspicionRefusalAppealUntil(chain.chainStartedAt));
  }
}

// ── Story 6.24a RF14 (b) — the helpline appeal screen's read ───────────────────────────────────────────────────

/**
 * Where a refused claim stands for an appeal the helpline could file for the family (AR-61): `can_appeal`;
 * `under_appeal` (a journey is open); `time_limit_passed` (a `-239` refusal past its 90 days — RF14);
 * `already_appealed` (a journey reached its end — D-F); `not_appealable` (⛔ not `denied`, or closed for no response).
 * A runtime tuple (the `APPEAL_JOURNEY_STATUSES` precedent) so the contracts lockstep test can compare against it
 * directly, instead of a hand-maintained literal.
 */
export const HELPLINE_APPEAL_ELIGIBILITY_VALUES = ['can_appeal', 'under_appeal', 'time_limit_passed', 'already_appealed', 'not_appealable'] as const;
export type HelplineAppealEligibility = (typeof HELPLINE_APPEAL_ELIGIBILITY_VALUES)[number];

export interface HelplineAppealEligibilityRow {
  readonly claimCaseId: ClaimId;
  readonly currentState: ClaimLifecycleState;
  readonly createdAt: Date;
  readonly eligibility: HelplineAppealEligibility;
  /** For a `-239` refusal: the last IST date it can be appealed (D + 90); `null` for any other refusal (⛔ no limit). */
  readonly appealUntil: CalendarDateString | null;
}

/** The claim states the helpline appeal screen lists: a refusal, or an appeal in progress. */
const HELPLINE_APPEAL_LISTED_STATES = ['denied', 'appeal_stage_1', 'appeal_stage_2', 'appeal_stage_3'] as const;
const HELPLINE_APPEAL_LIST_CAP = 10;

/**
 * ⭐ Story 6.24a RF14 (b) (`-292` — "is told" = a helpline appeal screen): a deceased member's REFUSED claims and, for
 * each, whether the family can appeal it now — judged by `assertAppealInitiable` ITSELF (⛔ not a second copy of its rules:
 * the screen and the initiation route can ⛔ never disagree) at this statement's clock. Read-only (the guard writes
 * nothing). Bounded. ⛔ No PII — ids, states, a date.
 */
export async function listHelplineAppealEligibility(
  db: Db,
  pariwarId: PariwarId,
  deceasedMemberId: MemberId,
): Promise<HelplineAppealEligibilityRow[]> {
  const rows = await db
    .select({ claimCaseId: claims.claimCaseId, currentState: claims.currentState, createdAt: claims.createdAt })
    .from(claims)
    .where(
      and(
        eq(claims.pariwarId, pariwarId),
        eq(claims.deceasedMemberId, deceasedMemberId),
        inArray(claims.currentState, [...HELPLINE_APPEAL_LISTED_STATES]),
      ),
    )
    .orderBy(desc(claims.createdAt), desc(claims.claimCaseId))
    .limit(clampLimit(HELPLINE_APPEAL_LIST_CAP, { default: HELPLINE_APPEAL_LIST_CAP, cap: HELPLINE_APPEAL_LIST_CAP }));
  const out: HelplineAppealEligibilityRow[] = [];
  for (const row of rows) {
    const chain = await readSuspicionChainStart(db, pariwarId, row.claimCaseId);
    out.push({
      claimCaseId: row.claimCaseId,
      currentState: row.currentState,
      createdAt: row.createdAt,
      eligibility: await eligibilityOf(db, pariwarId, row.claimCaseId),
      appealUntil: chain ? suspicionRefusalAppealUntil(chain.chainStartedAt) : null,
    });
  }
  return out;
}

async function eligibilityOf(db: Db, pariwarId: PariwarId, claimCaseId: ClaimId): Promise<HelplineAppealEligibility> {
  try {
    await assertAppealInitiable(db, pariwarId, claimCaseId);
    return 'can_appeal';
  } catch (err) {
    if (err instanceof AppealTimeLimitPassedError) return 'time_limit_passed';
    if (err instanceof AppealAlreadyExhaustedError) return err.status === 'open' ? 'under_appeal' : 'already_appealed';
    if (err instanceof AppealNotDeniedError) {
      // An appeal stage with its journey open reads as under appeal (the guard's first refusal is "not denied").
      const [anchor] = await db
        .select({ status: claimAppeals.status })
        .from(claimAppeals)
        .where(and(eq(claimAppeals.pariwarId, pariwarId), eq(claimAppeals.claimCaseId, claimCaseId)))
        .limit(1);
      return anchor?.status === 'open' ? 'under_appeal' : 'not_appealable';
    }
    if (err instanceof AppealClosedNoResponseError) return 'not_appealable';
    throw err;
  }
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
