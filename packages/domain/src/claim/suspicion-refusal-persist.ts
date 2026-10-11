// CLOSED, in the reversal's own transaction — Story 6.24a (`2026-10-07-292` RF6; builds `-262` FQ5 A: *"appeal allowed →
// the new claim is closed"*). Transport-free. The WRITE half of the suspicion refusal (the read half is
// `suspicion-refusal.ts`, which stays outside `claim/events.ts`'s import graph — 6.23a NW1).
//
// ⭐ ONE helper, called by all THREE reversal writers — `reviewAppealStage1`, `finalizeAppealOutcome` (the `reversed` arm)
// and `decideAppealStage3` — AFTER their own `reversed` writes, in their transaction. It acts ONLY when the reversed
// claim's LIVE decision is the `-239` refusal (read here, in the same transaction; RF13's reason lock keeps it `-239`
// while any other claim of the death is ⛔ not closed). For every OTHER claim of the same death (RF3 — ⛔ no ordering by
// `created_at`, ⛔ no "who filed" test), in `claim_case_id` order:
//   · it takes that claim's `appeal:` key, its `r9:` key and its trustee key, THEN its row lock — the order every writer of
//     those keys already uses (each takes its key, then the row); row-then-key would deadlock (40P01);
//   · a claim in a CLOSABLE state (`isClaimClosable`) is CLOSED through `claim.closed` (⛔ never `denied`, ⛔ never a 6.19c
//     closures row, ⛔ never `denied_no_appeal` — invariant 1), and its LIVE PROCESSES are ended so ⛔ nothing keeps
//     running on it (v1.1 / Trap 15): an open appeal journey's anchor → `closed`; an un-finalized appeal panel and R9
//     session → superseded through the actor-free cores; its `routed_to_r9` row → superseded; a live correction return →
//     superseded and its open run ended `decided` — the supersession the 6.19 terminal writers use;
//   · a claim whose payment is committed (`approved`) or paid (`settled`) is ⛔ NOT moved — it is REPORTED in the result
//     (the caller logs it at error level with ids only and writes an audit line). ⚠ REACHABLE — `2026-10-08-294` §2
//     (path (a) after payment — Invariant 3's residual, Q2 A). ⭐ Story 6.28 OP13 (`2026-10-11-319`, Q4 A — supersedes
//     RF4 in part): a claim past ONLY the final vote (`state_trustee_approved`) IS closed (FQ5 A before payment).
//
// ⭐ Story 6.28 OP4 (`2026-10-11-318` Q1 A) — the SAME per-claim core closes the death's other OPEN claims once one claim's
// PAYMENT is committed (`trigger: 'death_already_finally_approved'`, ⛔ never texted — Q3 A), at four sites:
//   · H(i) the cycle commit and H(iv) a final writer stopped by OP2 / "Close this claim" — `closeClaimsOfPaidDeath`, each in
//     its OWN transaction (the intake key FIRST, then each other claim's keys and row — the RF6 order);
//   · H(ii) a mint and H(iii) a reversal — `closeClaimIfDeathPaid`, SELF-MODE inside the writer's transaction (which already
//     holds the intake key and the claim): ⛔ no key is taken for the claim itself (Trap 13), ⛔ no other claim is touched.
// A `denied` or under-appeal claim KEEPS its appeal (Q2 A — it is closed only once a reversal makes it `reversed`, H(iii));
// a claim on which RF1 stands, or which RF5's wait holds, is ⛔ never closed here — FQ5 decides that pair (Invariant 3).
//
// ⚠ DELIBERATE (checklist family 9) — the closure ends another claim's panel and R9 session through the ACTOR-FREE cores
// (`supersedeAppealPanelSession`, `supersedeR9VotingSession`) and emits `claim.closed` as `actor: 'system'`: it is the
// system's consequence of a reversal whose human reviewer already passed the reversal route's own gate in this transaction.
// ⭐ Re-examine when a caller OTHER than the three reversal writers calls `closeClaimsHeldBySuspicionAppeal`, or when the
// public cancel writers gain a check that is ⛔ not about WHO acts (code review round 2, 2026-10-08).
//
// ⚠ LOCK ORDER (Trap 8; `2026-10-08-294` §1): the reversal writer took the death's INTAKE key, then the per-death
// `suspicion-reversal:` key, then the REFUSED claim's `appeal:` key and row; here it takes each HELD claim's keys and row.
// The intake key makes the "other claims" list below COMPLETE: both mint paths (`tryConverge`, `overrideIntakeAttempt`)
// take it, so ⛔ no claim of the death can be minted while it is held. ⛔ No writer takes a held claim's lock and THEN
// waits on the refused claim's: the approval gate (RF5) and the cycle commit (RF7) only READ the refused claim.

import { and, asc, eq, isNull, ne, sql } from 'drizzle-orm';
import type pg from 'pg';

import { bindScopedDb, type Db } from '../db.js';
import type { ClaimId, MemberId, PariwarId } from '../ids/index.js';
import { clampLimit } from '../pagination.js';
import { claims, type ClaimRow } from '../schema/claims.js';
import { claimAppeals } from '../schema/claim_appeals.js';
import { claimStateTrusteeDecisions } from '../schema/claim_state_trustee_decisions.js';
import { claimVerifierDecisions } from '../schema/claim_verifier_decisions.js';
import { appealAdvisoryLockKey } from './appeal-lock.js';
import { readLiveAppealPanelSession, supersedeAppealPanelSession } from './appeal-panel-session.js';
import { endCorrectionRun, readOpenCorrectionRun } from './correction-chase.js';
import { intakeAdvisoryLockKey } from './icp-lock.js';
import type { ClaimClosedTrigger, ClaimEventActor } from './events.js';
import { projectClaimState, type ProjectClaimStateResult } from './project.js';
import {
  r9VotingAdvisoryLockKey,
  readLiveR9VotingSession,
  supersedeLiveR9Routing,
  supersedeR9VotingSession,
} from './r9-voting-persist.js';
import { isClaimClosable } from './state.js';
import { getLiveCorrectionReturn, stateTrusteeDecisionAdvisoryLockKey } from './state-trustee-decision-persist.js';
import { readPaymentCommittedClaim, readPaymentCommittedClaimOfDeath } from './one-payment-per-death.js';
import {
  POST_DEATH_NOMINEE_CHANGE_REASON_CODE,
  type StandingSuspicionRefusal,
  acquireSuspicionReversalLock,
  readStandingSuspicionRefusals,
  suspicionAppealWaitState,
} from './suspicion-refusal.js';

/** RF6's `claim.closed` trigger (one of `CLAIM_CLOSED_TRIGGERS` — Story 6.28 added `death_already_finally_approved`). */
export const SUSPICION_APPEAL_ALLOWED_TRIGGER = 'suspicion_appeal_allowed' as const;

/** The bounded number of other claims of one death the closure walks (a death has a handful). */
const HELD_CLAIMS_CAP = 50;

export interface CloseClaimsHeldBySuspicionAppealInput {
  readonly pariwarId: PariwarId;
  readonly deceasedMemberId: MemberId;
  /** The claim whose `-239` refusal was just REVERSED on appeal (S). */
  readonly reversedClaimCaseId: ClaimId;
  /** Who caused the reversal (the event's `actor` — the closure is the system's consequence of it). */
  readonly actor: ClaimEventActor;
  /** The reversing reviewer's actor id (`events_log.actor_id`). */
  readonly actorId: string;
  readonly auditId?: string;
}

export interface HeldClaimNotClosed {
  readonly claimCaseId: ClaimId;
  readonly state: string;
}

export interface CloseClaimsHeldBySuspicionAppealResult {
  /** The reversed claim's live decision was ⛔ not the `-239` refusal ⇒ nothing was closed (any other refusal). */
  readonly applied: boolean;
  /** The claims CLOSED, in `claim_case_id` order. */
  readonly closed: readonly ClaimId[];
  /** Claims whose payment is committed / paid — ⛔ not moved; the caller logs (error, ids only) and audits each. */
  readonly notClosed: readonly HeldClaimNotClosed[];
}

/**
 * ⭐ RF6 v1.1 — take the per-death REVERSAL key. Each reversal writer calls this FIRST — before its own `appeal:` lock and
 * claim-row lock — reading the claim's immutable `deceased_member_id` UNLOCKED to build it. A missing claim takes ⛔ no
 * key (the writer's own not-found check answers). Two `-239` claims of one death reversed at once then serialise
 * (⛔ no 40P01). ⛔ Never RF15's appeal key.
 * ⭐ `2026-10-08-294` §1 (supersedes `-292` RF6's "⛔ never the intake lock") — the death's INTAKE key is taken FIRST,
 * immediately before the reversal key: a mint racing the reversal then either committed first (the closure's list sees
 * it and CLOSES it) or waits behind the reversal and then runs the ordinary convergence — it JOINS the reversed claim,
 * whatever its age (⭐ Story 6.28 OP11 removed the 30-day window that let `-294` §2 (b)'s later filing MINT beside an
 * older reversed claim). What §1 closes is the race: ⛔ never a claim minted UNSEEN by the reversal's own closure.
 * ⚠ WHY ⛔ NO CYCLE — the property is the REVERSE of "who waits after taking the intake key" (this writer does: on the
 * reversal key, `appeal:` keys and rows): ⛔ nobody holding a claim row, an `appeal:` / `r9:` / trustee key or a
 * `suspicion-*` key then asks for the INTAKE key. Every intake-key taker — `tryConverge`, `convergeIntakeAttempt`,
 * `overrideIntakeAttempt`, `recordRefileConfirmation`, `reviseDecision`, `acquireNomineeDeclarationLock` and the three
 * reversal writers (through this helper) — takes it FIRST, or after ONE unlocked read; none holds a lock on entry.
 */
export async function acquireSuspicionReversalLockForClaim(
  client: pg.PoolClient,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
): Promise<void> {
  const db = bindScopedDb(client);
  const [row] = await db
    .select({ deceasedMemberId: claims.deceasedMemberId })
    .from(claims)
    .where(and(eq(claims.pariwarId, pariwarId), eq(claims.claimCaseId, claimCaseId)))
    .limit(1);
  if (!row) return;
  await takeKey(client, intakeAdvisoryLockKey(pariwarId, row.deceasedMemberId));
  await acquireSuspicionReversalLock(db, pariwarId, row.deceasedMemberId);
}

async function takeKey(client: pg.PoolClient, key: bigint): Promise<void> {
  await client.query('SELECT pg_advisory_xact_lock($1)', [key.toString()]);
}

async function liveDecisionReasonOf(db: Db, pariwarId: PariwarId, claimCaseId: ClaimId): Promise<string | null> {
  const [row] = await db
    .select({ outcome: claimVerifierDecisions.outcome, reasonCode: claimVerifierDecisions.reasonCode })
    .from(claimVerifierDecisions)
    .where(
      and(
        eq(claimVerifierDecisions.pariwarId, pariwarId),
        eq(claimVerifierDecisions.claimCaseId, claimCaseId),
        isNull(claimVerifierDecisions.supersededAt),
      ),
    )
    .limit(1);
  return row && row.outcome === 'denied' ? row.reasonCode : null;
}

/**
 * ⭐ RF6 — close every other claim of the death held by the reversed `-239` refusal. MUST run inside the reversal
 * writer's transaction, AFTER its own `reversed` writes, with the per-death reversal key already held.
 */
export async function closeClaimsHeldBySuspicionAppeal(
  client: pg.PoolClient,
  input: CloseClaimsHeldBySuspicionAppealInput,
): Promise<CloseClaimsHeldBySuspicionAppealResult> {
  const db = bindScopedDb(client);
  if ((await liveDecisionReasonOf(db, input.pariwarId, input.reversedClaimCaseId)) !== POST_DEATH_NOMINEE_CHANGE_REASON_CODE) {
    return { applied: false, closed: [], notClosed: [] };
  }
  const walked = await closeOtherClaimsOfDeath(client, {
    pariwarId: input.pariwarId,
    deceasedMemberId: input.deceasedMemberId,
    causeClaimCaseId: input.reversedClaimCaseId,
    trigger: SUSPICION_APPEAL_ALLOWED_TRIGGER,
    actor: input.actor,
    actorId: input.actorId,
    ...(input.auditId !== undefined ? { auditId: input.auditId } : {}),
  });
  return { applied: true, closed: walked.closed, notClosed: walked.notClosed };
}

// ── the closure core (Story 6.28 OP4 — extracted from RF6) ───────────────────────────────────────────

interface CloseOtherClaimsOfDeathInput {
  readonly pariwarId: PariwarId;
  readonly deceasedMemberId: MemberId;
  /** The claim the closure is ABOUT (`held_by_claim_case_id`) — ⛔ never walked itself. */
  readonly causeClaimCaseId: ClaimId;
  readonly trigger: ClaimClosedTrigger;
  readonly actor: ClaimEventActor;
  readonly actorId: string | null;
  readonly auditId?: string;
  /** OP4 (b)–(d) — `false` ⇒ the claim is HELD (⛔ closed, ⛔ reported not-closable). Read under the claim's row lock. */
  readonly mayClose?: (held: ClaimRow) => Promise<boolean>;
}

interface CloseOtherClaimsOfDeathResult {
  readonly closed: readonly ClaimId[];
  readonly notClosed: readonly HeldClaimNotClosed[];
  /** Closable, but kept open by `mayClose` (OP4 (b)–(d)). */
  readonly held: readonly ClaimId[];
}

/**
 * The per-death walk: every OTHER claim of the death that is ⛔ not already `closed` (filtered BEFORE the cap — piled-up
 * closed claims can ⛔ never push an open one out), in `claim_case_id` order: its `appeal:` → `r9:` → trustee key, THEN its
 * row (the order every writer of those keys uses — Trap 8 / 40P01); a CLOSABLE claim `mayClose` admits is closed with its
 * live processes ended. ⚠ The caller holds the death's INTAKE key (so the list is complete — ⛔ no mint can race it).
 */
async function closeOtherClaimsOfDeath(client: pg.PoolClient, input: CloseOtherClaimsOfDeathInput): Promise<CloseOtherClaimsOfDeathResult> {
  const db = bindScopedDb(client);
  // The other claims of the death — ids only, UNLOCKED (each is re-read under its own row lock below). Fetched at
  // CAP+1 so the cap check below can tell "exactly at cap" (nothing truncated) from a real overflow.
  const fetched = await db
    .select({ claimCaseId: claims.claimCaseId })
    .from(claims)
    .where(
      and(
        eq(claims.pariwarId, input.pariwarId),
        eq(claims.deceasedMemberId, input.deceasedMemberId),
        ne(claims.claimCaseId, input.causeClaimCaseId),
        ne(claims.currentState, 'closed'),
      ),
    )
    .orderBy(asc(claims.claimCaseId))
    .limit(clampLimit(HELD_CLAIMS_CAP + 1, { default: HELD_CLAIMS_CAP + 1, cap: HELD_CLAIMS_CAP + 1 }));
  const others = fetched.slice(0, HELD_CLAIMS_CAP);
  if (fetched.length > HELD_CLAIMS_CAP) {
    console.error(
      `[suspicion-refusal-persist] closure walk reached its cap (${HELD_CLAIMS_CAP}) and truncated the remainder — pariwar ${input.pariwarId}, cause claim ${input.causeClaimCaseId}`,
    );
  }

  const closed: ClaimId[] = [];
  const notClosed: HeldClaimNotClosed[] = [];
  const held: ClaimId[] = [];
  for (const { claimCaseId } of others) {
    // Key-then-row, in the order every writer of these keys uses (Trap 8 / 40P01).
    await takeKey(client, appealAdvisoryLockKey(input.pariwarId, claimCaseId));
    await takeKey(client, r9VotingAdvisoryLockKey(input.pariwarId, claimCaseId));
    await takeKey(client, stateTrusteeDecisionAdvisoryLockKey(input.pariwarId, claimCaseId));
    const [row] = await db
      .select()
      .from(claims)
      .where(and(eq(claims.pariwarId, input.pariwarId), eq(claims.claimCaseId, claimCaseId)))
      .for('update');
    if (!row) continue;
    if (row.currentState === 'closed') continue;
    if (!isClaimClosable(row.currentState)) {
      notClosed.push({ claimCaseId, state: row.currentState });
      continue;
    }
    if (input.mayClose && !(await input.mayClose(row))) {
      held.push(claimCaseId);
      continue;
    }
    await closeLockedClaim(client, db, input, row);
    closed.push(claimCaseId);
  }
  return { closed, notClosed, held };
}

/** End the claim's live processes and emit `claim.closed`. The caller holds the claim's row (and, ⛔ in self-mode, its keys). */
async function closeLockedClaim(
  client: pg.PoolClient,
  db: Db,
  input: Pick<CloseOtherClaimsOfDeathInput, 'pariwarId' | 'causeClaimCaseId' | 'trigger' | 'actor' | 'actorId' | 'auditId'>,
  row: ClaimRow,
): Promise<ProjectClaimStateResult> {
  await endLiveProcesses(client, db, input.pariwarId, row);
  return projectClaimState(client, {
    claimCaseId: row.claimCaseId,
    pariwarId: input.pariwarId,
    deceasedMemberId: row.deceasedMemberId,
    intakeChannels: row.intakeChannels,
    claimantActorId: row.claimantActorId,
    eventType: 'claim.closed',
    payload: {
      from_state: row.currentState,
      to_state: 'closed',
      trigger: input.trigger,
      actor: input.actor,
      held_by_claim_case_id: input.causeClaimCaseId,
      deceased_member_id: row.deceasedMemberId,
    },
    actorId: input.actorId,
    ...(input.auditId !== undefined ? { auditId: input.auditId } : {}),
  });
}

// ── Story 6.28 OP4 — the other open claims of a PAID death ───────────────────────────────────────────

/** `claim.closed`'s trigger for OP4's closure (⛔ never texted — Q3 A). */
export const DEATH_ALREADY_FINALLY_APPROVED_TRIGGER = 'death_already_finally_approved' as const;

/**
 * The states that KEEP their appeal (OP4 (b); Q2 A) — closed only once a reversal makes them `reversed` (H(iii)).
 * `reversed` itself is ⛔ deliberately NOT in this list: a claim already in `reversed` (routed back through the
 * freeze/R9 pipeline toward a fresh vote by an EARLIER transaction) is closable like any other open claim here — if
 * left alone it would only be blocked again by OP2's gate at its next vote, so closing it now is conservative, not
 * surprising. The other-claims console (`otherClaimStageOf`) still displays it distinctly (`under_appeal`).
 */
const KEEPS_ITS_APPEAL_STATES: readonly string[] = ['denied', 'appeal_stage_1', 'appeal_stage_2', 'appeal_stage_3'];

/**
 * OP4 (b)–(d) for ONE claim of a paid death: ⛔ never a `denied` / under-appeal claim, ⛔ never one on which RF1 stands,
 * ⛔ never one RF5's wait holds. `standing` = the death's standing suspicion refusals (read ONCE per death — the
 * RF1-standing check below reads it rather than issuing its own fresh per-row query, so a death with many other
 * claims costs ONE extra round-trip for the whole walk, ⛔ not one per candidate).
 */
function mayCloseForPaidDeath(row: ClaimRow, standing: readonly StandingSuspicionRefusal[]): boolean {
  if (KEEPS_ITS_APPEAL_STATES.includes(row.currentState)) return false;
  const standingIds = new Set(standing.map((r) => String(r.claimCaseId).toLowerCase()));
  if (standingIds.has(String(row.claimCaseId).toLowerCase())) return false;
  return !suspicionAppealWaitState(standing, row.claimCaseId).waits;
}

export interface CloseClaimsOfPaidDeathInput {
  readonly pariwarId: PariwarId;
  readonly deceasedMemberId: MemberId;
  /** `'system'` at the commit (H(i)) and a stopped final writer (H(iv)); `'trustee'` for "Close this claim" (OP14 (b)). */
  readonly actor: ClaimEventActor;
  /** The committing trustee (H(i)), the stopped actor (H(iv)), the human (OP14 (b)). */
  readonly actorId: string;
  readonly auditId?: string;
}

export interface CloseClaimsOfPaidDeathResult {
  /** The death's payment-committed claim, or `null` — ⇒ nothing was closed (a vote alone closes ⛔ nothing — F15). */
  readonly paidClaimCaseId: ClaimId | null;
  readonly closed: readonly ClaimId[];
  /** Kept open by OP4 (b)–(d) — a refusal keeps its appeal; FQ5 decides a suspicion pair. */
  readonly held: readonly ClaimId[];
  /** Another claim whose payment is committed too (legacy only) — ⛔ never moved. */
  readonly notClosed: readonly HeldClaimNotClosed[];
}

/**
 * ⭐ Story 6.28 OP4 H(i) / H(iv) — close every other OPEN claim of a death whose payment is committed. MUST run in its OWN
 * transaction (⛔ never inside a request transaction that holds the intake key — Fact 5, Trap 2; ⛔ never from inside a
 * domain final writer, which holds a claim row): it takes the death's INTAKE key FIRST, then each other claim's keys and
 * row (RF6's order). Idempotent — a second run finds ⛔ nothing open. A no-op while ⛔ no claim's payment is committed.
 */
export async function closeClaimsOfPaidDeath(client: pg.PoolClient, input: CloseClaimsOfPaidDeathInput): Promise<CloseClaimsOfPaidDeathResult> {
  const db = bindScopedDb(client);
  await takeKey(client, intakeAdvisoryLockKey(input.pariwarId, input.deceasedMemberId));
  const paid = await readPaymentCommittedClaimOfDeath(db, input.pariwarId, input.deceasedMemberId);
  if (paid === null) return { paidClaimCaseId: null, closed: [], held: [], notClosed: [] };
  const standing = await readStandingSuspicionRefusals(db, input.pariwarId, input.deceasedMemberId);
  const walked = await closeOtherClaimsOfDeath(client, {
    pariwarId: input.pariwarId,
    deceasedMemberId: input.deceasedMemberId,
    causeClaimCaseId: paid,
    trigger: DEATH_ALREADY_FINALLY_APPROVED_TRIGGER,
    actor: input.actor,
    actorId: input.actorId,
    ...(input.auditId !== undefined ? { auditId: input.auditId } : {}),
    mayClose: async (row) => mayCloseForPaidDeath(row, standing),
  });
  return { paidClaimCaseId: paid, closed: walked.closed, held: walked.held, notClosed: walked.notClosed };
}

export interface CloseClaimIfDeathPaidInput {
  readonly pariwarId: PariwarId;
  readonly claimCaseId: ClaimId;
  readonly actor: ClaimEventActor;
  readonly actorId: string | null;
  readonly auditId?: string;
}

export type CloseClaimIfDeathPaidResult = { readonly closed: false } | { readonly closed: true; readonly eventVersion: number };

/**
 * ⭐ Story 6.28 OP4 H(ii) / H(iii) — SELF-MODE: close THIS claim if another claim of its death has its payment committed.
 * MUST run inside the minting / reversing writer's transaction, which already holds the death's intake key and this claim
 * (Trap 13): ⛔ no key is taken here (taking `appeal:` / `r9:` / trustee keys AFTER the claim's row would invert the
 * order), ⛔ no other claim is touched. OP4 (b)–(d) still apply. `closed: true` carries the `claim.closed` event's OWN
 * `eventVersion` — a caller that also projected an earlier event for this same claim in this transaction (e.g. a
 * `claim.reversed` publish hook) MUST use this version, ⛔ not that earlier one, when the claim closed.
 */
export async function closeClaimIfDeathPaid(client: pg.PoolClient, input: CloseClaimIfDeathPaidInput): Promise<CloseClaimIfDeathPaidResult> {
  const db = bindScopedDb(client);
  const [row] = await db
    .select()
    .from(claims)
    .where(and(eq(claims.pariwarId, input.pariwarId), eq(claims.claimCaseId, input.claimCaseId)))
    .limit(1);
  if (!row || !isClaimClosable(row.currentState)) return { closed: false };
  const paid = await readPaymentCommittedClaim(db, input.pariwarId, row.deceasedMemberId, input.claimCaseId);
  if (paid === null) return { closed: false };
  const standing = await readStandingSuspicionRefusals(db, input.pariwarId, row.deceasedMemberId);
  if (!mayCloseForPaidDeath(row, standing)) return { closed: false };
  const closedEvent = await closeLockedClaim(
    client,
    db,
    {
      pariwarId: input.pariwarId,
      causeClaimCaseId: paid,
      trigger: DEATH_ALREADY_FINALLY_APPROVED_TRIGGER,
      actor: input.actor,
      actorId: input.actorId,
      ...(input.auditId !== undefined ? { auditId: input.auditId } : {}),
    },
    row,
  );
  return { closed: true, eventVersion: closedEvent.eventVersion };
}

/** End everything still running on a claim about to be closed (Task 3.0's enumeration — the rows a writer must END). */
async function endLiveProcesses(client: pg.PoolClient, db: Db, pariwarId: PariwarId, held: ClaimRow): Promise<void> {
  const claimCaseId = held.claimCaseId;
  // (1) An open appeal journey → `closed` (⛔ no open journey outlives its claim; ⛔ nothing reopens it).
  await db
    .update(claimAppeals)
    .set({ status: 'closed', updatedAt: sql`now()` })
    .where(and(eq(claimAppeals.pariwarId, pariwarId), eq(claimAppeals.claimCaseId, claimCaseId), eq(claimAppeals.status, 'open')));
  // (2) An un-finalized Stage-2 panel — the actor-free core (a finalized session is history, ⛔ no live work).
  const panel = await readLiveAppealPanelSession(db, pariwarId, claimCaseId);
  if (panel && panel.outcome === null) await supersedeAppealPanelSession(db, claimCaseId, panel.sessionId);
  // (3) An un-finalized R9 session — the actor-free core — and the claim's live `routed_to_r9` row.
  const r9 = await readLiveR9VotingSession(db, pariwarId, claimCaseId);
  if (r9 && r9.outcome === null) await supersedeR9VotingSession(db, claimCaseId, r9.sessionId);
  await supersedeLiveR9Routing(db, pariwarId, claimCaseId);
  // (4) A live correction return — superseded (the 6.19 terminal writers' supersession, `supersedeReturn`'s shape) — and
  //     its open run ended `decided`, so ⛔ no family text and ⛔ no day-90 escalation follows a closed claim.
  const ret = await getLiveCorrectionReturn(db, pariwarId, claimCaseId);
  if (ret) {
    await db
      .update(claimStateTrusteeDecisions)
      .set({ supersededAt: sql`now()` })
      .where(and(eq(claimStateTrusteeDecisions.decisionId, ret.decisionId), isNull(claimStateTrusteeDecisions.supersededAt)));
  }
  const run = await readOpenCorrectionRun(db, pariwarId, claimCaseId);
  if (run) await endCorrectionRun(client, { pariwarId, claimCaseId, runId: run.runId, reason: 'decided' });
}
