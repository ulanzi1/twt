// The CORRECTION CLOSURE — the request, the Pariwar Admin's decision, the hold, the Super Admin's review, directions and
// decision, and "no correction needed" — Story 6.19c (Tasks 3, 4, 8; AC6, AC14, AC17; the shared spec's D1, D17, D18,
// D22, D27; `2026-09-27-251`, `-256`, `-258`, `-260` G1/G2; `2026-10-01-273` §1, §3–§5, §7, §8, §10; `-274` 1a–1d, 2).
// Transport-free: ⛔ no HTTP, ⛔ no audit, ⛔ no decryption except the number HASH through an explicit `crypto`.
//
// ── Invariant 1 — ⛔ the system never decides ──────────────────────────────────────────────────────────────────
// Every writer here is a HUMAN act's (the District Admin's request, the Pariwar Admin's decision, the Super Admin's
// hold / direction / decision, the District Admin's "no correction needed", the Pariwar Admin's approve / keep). The
// ONE record a job writes — the staff case's escalation row at day 90 (`-273` §3a) — is `escalateStaffCase` below, a
// record ⛔ a decision (the D26 day-12 escalation is the precedent). ⛔ No job may call any other writer here.
//
// ── The lock order (S-T2) ────────────────────────────────────────────────────────────────────────────────────
// The trustee ADVISORY lock first (`acquireCorrectionChaseLock` — the return's, the vote's, the mark writer's), THEN
// the claim ROW lock (`SELECT … FOR UPDATE`) — the bank rewrite and the name-check writer take only the row lock, so a
// family correction serialises against every closing act here, and "under the trustee lock" alone would ⛔ not.
//
// ── The hold (`-273` §3b, §4; `-274` 1b, 1d) ────────────────────────────────────────────────────────────────────
// A claim is HELD while a closures row for its LIVE return (the same `return_decision_id`) is `escalated` or
// `under_review` — EITHER origin. While held: a mark switch opens ⛔ no run (6.19b's mark writer reads
// `isCorrectionClaimHeld` — threaded at every caller); ⭐ only the Super Admin decides it (the cycle-freeze route and
// D27's approve answer `cycle_freeze.escalated`); records stay allowed. A row for an EARLIER return holds ⛔ nothing.
//
// ── The lapse (`-273` §3d, S-T8) ────────────────────────────────────────────────────────────────────────────
// A pending request LAPSES when, after it, a mark ⛔ `family` is recorded, or the live return's latest family run is
// ⛔ its `request_family_run_id`, or its return stops being live — DERIVED here under the lock at every read and act
// (⛔ never written by the mark writer, the hold hook or a superseder — none of them may import this module), and
// materialised as `lapsed` ONLY on a `requested` row, ONLY where nothing is refused after it (a new request).
//
// ⛔ IMPORT DISCIPLINE (S-T1): `correction-chase.ts` and `state-trustee-decision-persist.ts` must ⛔ never import this
// module — a cycle is the runtime-init trap typecheck cannot see. This module imports them; ⛔ never the reverse.

import { timingSafeEqual } from 'node:crypto';

import { and, desc, eq, gt, inArray, isNull, ne, sql } from 'drizzle-orm';
import type pg from 'pg';

import { bindScopedDb, type Db } from '../db.js';
import type { FieldCryptoDeps } from '../encryption/field-classes.js';
import type { ClaimId, MemberId, PariwarId, TrusteeDecisionId } from '../ids/index.js';
import { claimAppeals } from '../schema/claim_appeals.js';
import { claimCorrectionMarks, type CorrectionMarkRole, type CorrectionMustAct } from '../schema/claim_correction_chase.js';
import {
  CLOSURE_HELD_STATES,
  CLOSURE_SUPER_ADMIN_REASONS,
  type ApprovalNameCheckState,
  type ClaimCorrectionClosureRow,
  type ClaimCorrectionDirectionRow,
  type ClaimCorrectionNoCorrectionRecordRow,
  type ClosureSuperAdminDecision,
  type ClosureSuperAdminReason,
  type DirectionKind,
  type DirectionRole,
  claimCorrectionClosures,
  claimCorrectionDirections,
  claimCorrectionNoCorrectionRecords,
} from '../schema/claim_correction_closure.js';
import { claimStateTrusteeDecisions } from '../schema/claim_state_trustee_decisions.js';
import { claims } from '../schema/claims.js';
import { assertClaimContactRecorded } from './claim-contact-check.js';
import { ClaimContactRequiredError } from './errors.js';
import {
  type CorrectionChaseResolution,
  type CorrectionHoldCheck,
  type CorrectionPerson,
  type WriteCorrectionMarkResult,
  CorrectionDirectionRunRefusedError,
  acquireCorrectionChaseLock,
  endCorrectionRun,
  isEvidentialReminderRow,
  openCorrectionRun,
  readCorrectionRecipients,
  resolveCorrectionChase,
  writeCorrectionMark,
} from './correction-chase.js';
import {
  type ReturnFamilyRow,
  type ReturnLetterRow,
  lastEvidentialAttempt,
  readReturnFamilyLetters,
  readReturnFamilyRows,
} from './correction-reminder-record.js';
import { correctionRunDay, istDateOf, isCorrectionRunExpired } from './correction-schedule.js';
import type { ClaimEventActor } from './events.js';
import {
  assertClaimApprovable,
  getLatestNomineeNameCheck,
  readNomineeNameCheckApprovalState,
} from './nominee-name-check.js';
import { projectClaimState } from './project.js';
import { TRUSTEE_VOTABLE_STATES, resolveClaimCorrectionState } from './state-trustee-decision-persist.js';
import { isTrusteeReasonCodeValidForOutcome, type StateTrusteeReasonCode } from './state-trustee-decision.js';

// ── Refusals (the route maps each to a stable 409 / 403 / 404) ──────────────────────────────────────────────────

/**
 * Every refusal of this module, as a stable code. The API maps them to `409 closure.<code>` (AC6's order is the
 * request's), except `not_directee` (403) and `not_found` (404). `cycle_freeze_escalated` is the D27 approve's
 * `409 cycle_freeze.escalated` (`-273` §4).
 */
export type CorrectionClosureRefusal =
  // AC6 — the request, in this order (and re-checked by every closing act from `not_family_action` on)
  | 'no_live_return'
  | 'escalated'
  | 'request_pending'
  | 'not_family_action'
  | 'too_early'
  | 'claim_routed_to_r9'
  | 'claim_corrected'
  | 'not_reached'
  // The Pariwar Admin's decision
  | 'no_pending_request'
  | 'request_lapsed'
  // The Super Admin's acts
  | 'not_escalated'
  | 'already_under_review'
  | 'staff_case_origin'
  | 'reason_invalid'
  | 'refusal_reason_invalid'
  | 'direction_mark_not_family'
  | 'directee_role_invalid'
  | 'not_found'
  | 'not_directee'
  | 'direction_answered'
  // Shared by every closing / approving act
  | 'claim_not_decidable'
  | 'return_not_live'
  // D27 / `-260` G2
  | 'no_record'
  | 'check_required'
  | 'cycle_freeze_escalated';

/** The roles of the people ⛔ yet reached (D22 — the body names ⛔ no person: a count and the roles only). */
export interface NotReachedDetail {
  readonly count: number;
  readonly roles: readonly ('nominee' | 'claimant')[];
}

export class CorrectionClosureRefusedError extends Error {
  public readonly name = 'CorrectionClosureRefusedError';
  public constructor(
    public readonly claimCaseId: string,
    public readonly refusal: CorrectionClosureRefusal,
    /** `not_reached` only — a count and the roles, ⛔ never a person. */
    public readonly notReached?: NotReachedDetail,
  ) {
    super(`[correction-closure] claim ${claimCaseId}: ${refusal}`);
  }
}

// ── Locks and small reads ──────────────────────────────────────────────────────────────────────────────────────

/** The trustee advisory lock, THEN the claim row lock (S-T2). Returns the locked claim row. */
async function lockForClosure(client: pg.PoolClient, pariwarId: PariwarId, claimCaseId: ClaimId) {
  await acquireCorrectionChaseLock(client, pariwarId, claimCaseId);
  const db = bindScopedDb(client);
  const [row] = await db
    .select()
    .from(claims)
    .where(and(eq(claims.pariwarId, pariwarId), eq(claims.claimCaseId, claimCaseId)))
    .for('update');
  if (!row) throw new CorrectionClosureRefusedError(claimCaseId, 'not_found');
  return { db, claimRow: row };
}

/** A LIVE route-to-R9 exclusion (re-queried — the persist module's own helper is private). */
async function hasLiveRoutedRow(db: Db, pariwarId: PariwarId, claimCaseId: ClaimId): Promise<boolean> {
  const rows = await db
    .select({ id: claimStateTrusteeDecisions.decisionId })
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

/** The closures row of a RETURN that is ⛔ `lapsed` (⭐ at most one — `-273` §3b's partial UNIQUE), or `null`. */
export async function readLiveClosureRowOfReturn(
  db: Db,
  pariwarId: PariwarId,
  returnDecisionId: string,
): Promise<ClaimCorrectionClosureRow | null> {
  const [row] = await db
    .select()
    .from(claimCorrectionClosures)
    .where(
      and(
        eq(claimCorrectionClosures.pariwarId, pariwarId),
        eq(claimCorrectionClosures.returnDecisionId, returnDecisionId as TrusteeDecisionId),
        ne(claimCorrectionClosures.state, 'lapsed'),
      ),
    )
    .limit(1);
  return row ?? null;
}

/** The claim's closures row in a `closed` state (the appeal sites and the re-file guard read it), or `null`. */
export async function readClosedClosureRow(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
): Promise<ClaimCorrectionClosureRow | null> {
  const [row] = await db
    .select()
    .from(claimCorrectionClosures)
    .where(
      and(
        eq(claimCorrectionClosures.pariwarId, pariwarId),
        eq(claimCorrectionClosures.claimCaseId, claimCaseId),
        eq(claimCorrectionClosures.state, 'closed'),
      ),
    )
    .limit(1);
  return row ?? null;
}

/** Is `state` one that HOLDS the claim (`-273` §3b)? Pure. */
export function isHeldClosureState(state: string): boolean {
  return (CLOSURE_HELD_STATES as readonly string[]).includes(state);
}

/**
 * ⭐ THE HOLD HOOK (`-273` §3b, `-269` §3, `-271` §2) — the `CorrectionHoldCheck` 6.19b's mark writer calls: held ⇔ a
 * closures row for the claim's LIVE return is `escalated` or `under_review`, EITHER origin. A row for an EARLIER
 * return ⛔ never holds a later one (S-T9). Read inside the caller's transaction (the mark writer holds the lock).
 */
export const isCorrectionClaimHeld: CorrectionHoldCheck = async (db, pariwarId, claimCaseId) => {
  const rows = await db
    .select({ id: claimCorrectionClosures.closureId })
    .from(claimCorrectionClosures)
    .innerJoin(
      claimStateTrusteeDecisions,
      and(
        eq(claimStateTrusteeDecisions.decisionId, claimCorrectionClosures.returnDecisionId),
        eq(claimStateTrusteeDecisions.pariwarId, claimCorrectionClosures.pariwarId),
      ),
    )
    .where(
      and(
        eq(claimCorrectionClosures.pariwarId, pariwarId),
        eq(claimCorrectionClosures.claimCaseId, claimCaseId),
        inArray(claimCorrectionClosures.state, [...CLOSURE_HELD_STATES]),
        isNull(claimStateTrusteeDecisions.supersededAt),
      ),
    )
    .limit(1);
  return rows.length > 0;
};

/**
 * ⭐ `-273` §4 / `-274` 1d — the cycle-freeze ROUTE's guard: while the claim is HELD, every Pariwar Admin DECISION on
 * it (the ordinary vote, approve or deny, and a new return) is refused — `cycle_freeze_escalated` → 409
 * `cycle_freeze.escalated` — for EVERY actor (the route also accepts `super_admin`; the Super Admin decides through
 * `decideEscalatedClosure`, with a reason and a note). Takes the trustee advisory lock FIRST (inside the route's
 * scope-tx, re-entrant for the writer it guards). `voteOnFrozenClaim` itself is ⛔ not changed (AC10).
 */
export async function assertCorrectionClaimNotHeld(
  client: pg.PoolClient,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
): Promise<void> {
  await acquireCorrectionChaseLock(client, pariwarId, claimCaseId);
  if (await isCorrectionClaimHeld(bindScopedDb(client), pariwarId, claimCaseId)) {
    throw new CorrectionClosureRefusedError(claimCaseId, 'cycle_freeze_escalated');
  }
}

/**
 * ⭐ `-273` §3d — has a `requested` row LAPSED? Derived (S-T8): its return is ⛔ the live one; or the live return's
 * latest family / direction run is ⛔ its `request_family_run_id`; or a mark ⛔ `family` was recorded on its return
 * after the request. ⛔ Any other state never lapses.
 */
export async function isClosureRequestLapsed(
  db: Db,
  pariwarId: PariwarId,
  row: ClaimCorrectionClosureRow,
  chase: CorrectionChaseResolution,
): Promise<boolean> {
  if (row.state !== 'requested') return false;
  if (chase.liveReturn === null || chase.liveReturn.decisionId !== row.returnDecisionId) return true;
  if (chase.familyRun === null || chase.familyRun.runId !== row.requestFamilyRunId) return true;
  const later = await db
    .select({ id: claimCorrectionMarks.markId })
    .from(claimCorrectionMarks)
    .where(
      and(
        eq(claimCorrectionMarks.pariwarId, pariwarId),
        eq(claimCorrectionMarks.returnDecisionId, row.returnDecisionId),
        ne(claimCorrectionMarks.mustAct, 'family'),
        gt(claimCorrectionMarks.setAt, row.requestedAt!),
      ),
    )
    .limit(1);
  return later.length > 0;
}

// ── D22 — "reached", across the whole RETURN (`-252` cl.1, `-271` §1, `-273` §1) ─────────────────────────────────

/**
 * Constant-time string comparison (UTF-8 bytes) — the API's `timingSafeEqualString` idiom (length, then
 * `timingSafeEqual`), declared here because the domain must ⛔ import the API.
 */
function timingSafeEqualString(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/** Timing-safe equality of two keyed hashes (`null` = "⛔ no sendable number"). ⛔ Never `===` on an HMAC (inv. (f)). */
export function sameNumberHash(a: string | null, b: string | null): boolean {
  if (a === null || b === null) return a === null && b === null;
  return timingSafeEqualString(a, b);
}

const DEAD_OUTCOMES = new Set(['rejected_invalid_number', 'rejected_unreachable', 'no_target']);

/** One person's D22 verdict. ⛔ No name, ⛔ no number. */
export interface ClosurePersonReach {
  readonly personKey: string;
  readonly role: 'nominee' | 'claimant';
  readonly rank: 1 | 2 | null;
  readonly reachedBySms: boolean;
  readonly reachedByLetter: boolean;
  readonly reached: boolean;
  /** `-273` §5 — their CURRENT number's latest evidential outcome is dead / unreachable / ⛔ no target. */
  readonly numberKnownDead: boolean;
}

export interface ClosureReach {
  /** D30 — nobody nameable ⇒ ⛔ nobody can be judged reached (the request is `not_reached`). */
  readonly cannotRemind: boolean;
  readonly people: readonly ClosurePersonReach[];
  readonly allReached: boolean;
  readonly notReached: NotReachedDetail;
}

/**
 * D22 for ONE person, PURE — across the return's family / direction runs (`-273` §1): ≥ 1 reminder `accepted` to
 * the number that is theirs NOW (`-271` §1 — the hash compared timing-safe), OR a letter to them with a recorded
 * delivery date (a letter goes to an ADDRESS — any number's). `numberKnownDead`: their latest evidential row is about
 * their CURRENT number and its outcome is dead / unreachable / ⛔ target (`-273` §5).
 */
export function evaluateClosurePersonReach(
  person: Pick<CorrectionPerson, 'personKey' | 'role' | 'rank'>,
  currentNumberHash: string | null | undefined,
  rows: readonly ReturnFamilyRow[],
  letters: readonly Pick<ReturnLetterRow, 'personKey' | 'deliveredOn'>[],
): ClosurePersonReach {
  const mine = rows.filter((r) => r.recipientKey === person.personKey);
  const current = currentNumberHash === undefined ? null : currentNumberHash;
  const reachedBySms =
    currentNumberHash !== undefined &&
    mine.some((r) => r.outcome === 'accepted' && r.recipientNumberHash !== null && sameNumberHash(r.recipientNumberHash, current));
  const reachedByLetter = letters.some((l) => l.personKey === person.personKey && l.deliveredOn !== null);
  const last = lastEvidentialAttempt(mine.filter(isEvidentialReminderRow));
  const numberKnownDead =
    last !== undefined &&
    DEAD_OUTCOMES.has(last.outcome) &&
    currentNumberHash !== undefined &&
    sameNumberHash(last.recipientNumberHash, current);
  return {
    personKey: person.personKey,
    role: person.role,
    rank: person.rank,
    reachedBySms,
    reachedByLetter,
    reached: reachedBySms || reachedByLetter,
    numberKnownDead,
  };
}

/**
 * ⭐ D22 — is EACH person who must be reached (each effective nominee, and the claimant when none of them) reached,
 * across the live return? Needs `crypto` (each person's CURRENT number hash, `resolveCorrectionChase`'s
 * `currentNumberHashes`). Reads only.
 */
export async function readClosureReach(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
  chase: CorrectionChaseResolution,
): Promise<ClosureReach> {
  const recipients = await readCorrectionRecipients(db, pariwarId, claimCaseId);
  if (recipients.cannotRemind !== null || chase.liveReturn === null) {
    return { cannotRemind: true, people: [], allReached: false, notReached: { count: 0, roles: [] } };
  }
  const rows = await readReturnFamilyRows(db, pariwarId, claimCaseId, chase.liveReturn.decisionId);
  const letters = await readReturnFamilyLetters(db, pariwarId, claimCaseId, chase.liveReturn.decisionId);
  const people = recipients.people.map((p) =>
    evaluateClosurePersonReach(p, chase.currentNumberHashes?.get(p.personKey), rows, letters),
  );
  const unreached = people.filter((p) => !p.reached);
  return {
    cannotRemind: false,
    people,
    allReached: people.length > 0 && unreached.length === 0,
    notReached: { count: unreached.length, roles: [...new Set(unreached.map((p) => p.role))].sort() },
  };
}

/**
 * `-273` §5 / `-274` 2 — who the closure tells, and how: each REACHED person whose current number is ⛔ known dead
 * gets the closure-notice SMS; each reached person whose number IS known dead is owed a closure LETTER instead
 * (⛔ we never text a number we know is dead). Pure.
 */
export function closureNoticeRecipients(reach: Pick<ClosureReach, 'people'>): {
  readonly noticePersonKeys: readonly string[];
  readonly letterPersonKeys: readonly string[];
} {
  const reached = reach.people.filter((p) => p.reached);
  return {
    noticePersonKeys: reached.filter((p) => !p.numberKnownDead).map((p) => p.personKey),
    letterPersonKeys: reached.filter((p) => p.numberKnownDead).map((p) => p.personKey),
  };
}

// ── The request's refusals (AC6) — ONE function, every closing act re-runs it from `not_family_action` on ────────

interface ClosureGateInput {
  readonly db: Db;
  readonly pariwarId: PariwarId;
  readonly claimCaseId: ClaimId;
  readonly deceasedMemberId: MemberId;
  readonly currentState: string;
  readonly chase: CorrectionChaseResolution;
  readonly today: string;
}

/**
 * AC6's refusals from `not_family_action` on, in order — `not_family_action` (AC17: the latest mark is `family`),
 * `too_early` (day ≥ 90 of the CURRENT family run, open or ended), `claim_routed_to_r9` (defensive),
 * `claim_corrected` (`isReturnedClaimResubmitted` OR "the family's part is done" — invariant 2 as `-268` §3 widens
 * it), `not_reached` (D22 across the return), then D14 (`ClaimContactRequiredError`). Returns the reach on success.
 */
async function assertClosureGround(input: ClosureGateInput): Promise<ClosureReach> {
  const { db, pariwarId, claimCaseId, chase } = input;
  if (chase.mark?.mustAct !== 'family') throw new CorrectionClosureRefusedError(claimCaseId, 'not_family_action');
  if (chase.familyRun === null || !isCorrectionRunExpired(chase.familyRun.day0, input.today)) {
    throw new CorrectionClosureRefusedError(claimCaseId, 'too_early');
  }
  if (await hasLiveRoutedRow(db, pariwarId, claimCaseId)) {
    throw new CorrectionClosureRefusedError(claimCaseId, 'claim_routed_to_r9');
  }
  const correction = await resolveClaimCorrectionState(db, pariwarId, claimCaseId, input.deceasedMemberId, input.currentState);
  if (correction.resubmitted || chase.familyPartDoneAt !== null) {
    throw new CorrectionClosureRefusedError(claimCaseId, 'claim_corrected');
  }
  const reach = await readClosureReach(db, pariwarId, claimCaseId, chase);
  if (!reach.allReached) throw new CorrectionClosureRefusedError(claimCaseId, 'not_reached', reach.notReached);
  await assertClaimContactRecorded(db, pariwarId, claimCaseId);
  return reach;
}

/** The claim must still be in a state the trustee writers act from (a live return implies one — defensive). */
function assertDecidable(claimCaseId: ClaimId, currentState: string): void {
  if (!(TRUSTEE_VOTABLE_STATES as readonly string[]).includes(currentState)) {
    throw new CorrectionClosureRefusedError(claimCaseId, 'claim_not_decidable');
  }
}

// ── The shared lifecycle chains (D1, D17 — mirroring `voteOnFrozenClaim`'s events and decision row, T10) ──────────

interface ChainInput {
  readonly client: pg.PoolClient;
  readonly db: Db;
  readonly claimRow: typeof claims.$inferSelect;
  readonly pariwarId: PariwarId;
  readonly claimCaseId: ClaimId;
  readonly returnDecisionId: string;
  readonly actorId: string;
  readonly actorDisplay: string;
  readonly actor: ClaimEventActor;
  /** The decision row's Tier-1 rationale (the trustee-decision field class — the caller encrypts). */
  readonly decisionRationaleCiphertext: string;
  readonly auditId?: string;
}

/** Supersede the live return with the vote's CONDITIONAL shape — 0 rows ⇒ a racing act already did (→ 409). */
async function supersedeReturn(input: ChainInput): Promise<void> {
  const rows = await input.db
    .update(claimStateTrusteeDecisions)
    .set({ supersededAt: sql`now()` })
    .where(
      and(
        eq(claimStateTrusteeDecisions.decisionId, input.returnDecisionId as TrusteeDecisionId),
        isNull(claimStateTrusteeDecisions.supersededAt),
      ),
    )
    .returning({ id: claimStateTrusteeDecisions.decisionId });
  if (rows.length === 0) throw new CorrectionClosureRefusedError(input.claimCaseId, 'return_not_live');
}

function projectBase(input: ChainInput) {
  return {
    claimCaseId: input.claimCaseId,
    pariwarId: input.pariwarId,
    deceasedMemberId: input.claimRow.deceasedMemberId,
    intakeChannels: input.claimRow.intakeChannels,
    claimantActorId: input.claimRow.claimantActorId,
    actorId: input.actorId,
    ...(input.auditId !== undefined ? { auditId: input.auditId } : {}),
  };
}

/** Open the freeze in the write path when the claim is a fresh candidate (the vote's step (a)). */
async function openFreezeIfNeeded(input: ChainInput): Promise<void> {
  const state = input.claimRow.currentState;
  if (state === 'verifier_approved' || state === 'reversed') {
    await projectClaimState(input.client, {
      ...projectBase(input),
      eventType: 'claim.state_trustee_frozen',
      payload: { from_state: state, to_state: 'state_trustee_freeze', trigger: 'cycle_freeze_open', actor: input.actor },
    });
  }
}

/** The decision-metadata row (phase `frozen_vote`, the vote's own shape — T10). 23505 ⇒ a racing act (→ 409). */
async function insertDecisionRow(
  input: ChainInput,
  outcome: 'approved' | 'denied',
  reasonCode: StateTrusteeReasonCode | null,
): Promise<string> {
  try {
    const [row] = await input.db
      .insert(claimStateTrusteeDecisions)
      .values({
        claimCaseId: input.claimCaseId,
        pariwarId: input.pariwarId,
        phase: 'frozen_vote',
        outcome,
        reasonCode,
        rationaleCiphertext: input.decisionRationaleCiphertext,
        actorId: input.actorId,
        actorDisplay: input.actorDisplay,
      })
      .returning({ decisionId: claimStateTrusteeDecisions.decisionId });
    return row!.decisionId as string;
  } catch (err) {
    const code = (err as { code?: string }).code ?? (err as { cause?: { code?: string } }).cause?.code;
    if (code === '23505') throw new CorrectionClosureRefusedError(input.claimCaseId, 'return_not_live');
    throw err;
  }
}

/** End the claim's open run `decided` — a NO-OP when it already ended (`day_90` — S-T5). */
async function endOpenRunDecided(input: ChainInput, chase: CorrectionChaseResolution): Promise<boolean> {
  if (chase.openRun === null) return false;
  return endCorrectionRun(input.client, {
    pariwarId: input.pariwarId,
    claimCaseId: input.claimCaseId,
    runId: chase.openRun.runId,
    reason: 'decided',
  });
}

export interface ClosureChainResult {
  readonly claimState: string;
  readonly decisionId: string;
  readonly deniedNoAppeal: boolean;
}

/**
 * ⭐ D1 — the CLOSURE: the second refusal, terminal, ⛔ appealable. In the caller's transaction, under its locks:
 * supersede the return, open the freeze if needed, `claim.state_trustee_denied` (reason `other` + the fixed
 * rationale — ⛔ no new reason code), the decision row, then `claim.denied_no_appeal` (T4 — the account-frozen overlay
 * clears; it carries `deceased_member_id`).
 */
async function writeClosureChain(input: ChainInput, trigger: string): Promise<ClosureChainResult> {
  await supersedeReturn(input);
  await openFreezeIfNeeded(input);
  await projectClaimState(input.client, {
    ...projectBase(input),
    eventType: 'claim.state_trustee_denied',
    payload: { from_state: 'state_trustee_freeze', to_state: 'denied', trigger, actor: input.actor },
  });
  const decisionId = await insertDecisionRow(input, 'denied', 'other');
  const projected = await projectClaimState(input.client, {
    ...projectBase(input),
    eventType: 'claim.denied_no_appeal',
    payload: {
      from_state: 'denied',
      to_state: 'denied',
      trigger,
      actor: input.actor,
      deceased_member_id: input.claimRow.deceasedMemberId,
    },
  });
  return { claimState: projected.state, decisionId, deniedNoAppeal: true };
}

/**
 * D17 — a REFUSAL for another reason: `claim.state_trustee_denied` with the actor's chosen trustee reason code, and
 * `claim.denied_no_appeal` ONLY when the claim already used its one appeal (T4, `-255` F2 — an appealable refusal
 * emits ⛔ none, exactly as an ordinary refusal).
 */
async function writeRefusalChain(input: ChainInput, reasonCode: StateTrusteeReasonCode): Promise<ClosureChainResult> {
  await supersedeReturn(input);
  await openFreezeIfNeeded(input);
  const denied = await projectClaimState(input.client, {
    ...projectBase(input),
    eventType: 'claim.state_trustee_denied',
    payload: { from_state: 'state_trustee_freeze', to_state: 'denied', trigger: 'correction_super_admin_refusal', actor: input.actor },
  });
  const decisionId = await insertDecisionRow(input, 'denied', reasonCode);
  const appeals = await input.db
    .select({ id: claimAppeals.appealId })
    .from(claimAppeals)
    .where(and(eq(claimAppeals.pariwarId, input.pariwarId), eq(claimAppeals.claimCaseId, input.claimCaseId)))
    .limit(1);
  if (appeals.length === 0) return { claimState: denied.state, decisionId, deniedNoAppeal: false };
  const projected = await projectClaimState(input.client, {
    ...projectBase(input),
    eventType: 'claim.denied_no_appeal',
    payload: {
      from_state: 'denied',
      to_state: 'denied',
      trigger: 'correction_super_admin_refusal_after_appeal',
      actor: input.actor,
      deceased_member_id: input.claimRow.deceasedMemberId,
    },
  });
  return { claimState: projected.state, decisionId, deniedNoAppeal: true };
}

/** An APPROVAL through the vote's events (`state_trustee_approved`) and a `frozen_vote` / `approved` row (T10). */
async function writeApprovalChain(input: ChainInput, trigger: string): Promise<ClosureChainResult> {
  await supersedeReturn(input);
  await openFreezeIfNeeded(input);
  const projected = await projectClaimState(input.client, {
    ...projectBase(input),
    eventType: 'claim.state_trustee_approved',
    payload: { from_state: 'state_trustee_freeze', to_state: 'state_trustee_approved', trigger, actor: input.actor },
  });
  const decisionId = await insertDecisionRow(input, 'approved', null);
  return { claimState: projected.state, decisionId, deniedNoAppeal: false };
}

// ── Common inputs ──────────────────────────────────────────────────────────────────────────────────────────────

interface ActorInput {
  readonly pariwarId: PariwarId;
  readonly claimCaseId: ClaimId;
  readonly actorId: string;
  /** The acting staff member's display name, snapshotted ([[project_admin_display_name_attribution]]). */
  readonly actorDisplay: string;
  /** The instant of the act (the API passes its clock) — "today" is its IST date. */
  readonly now: Date;
  readonly auditId?: string;
}

// ── The closure READINESS (AC8c — the District Admin's queue: the closure state, and why a request would refuse) ──

/** Why a request would refuse right now — `closure_contact_required` is D14's (`ClaimContactRequiredError`). */
export type ClosureRequestBlocker = CorrectionClosureRefusal | 'claim_contact_required';

export interface ClosureReadiness {
  /** The live return's closures row state (a lapsed request reads `lapsed`), or `null` (⛔ none). */
  readonly state: ClaimCorrectionClosureRow['state'] | null;
  readonly origin: ClaimCorrectionClosureRow['origin'] | null;
  readonly requestedAt: Date | null;
  readonly requestedByDisplay: string | null;
  /** `null` ⇔ a request would be ACCEPTED now; else the FIRST refusal in AC6's order. */
  readonly blocker: ClosureRequestBlocker | null;
  readonly notReached: NotReachedDetail | null;
  /** The latest family / direction run's day number on `now` (open or ended), or `null`. */
  readonly familyRunDay: number | null;
}

/**
 * ⭐ READ-ONLY — what a closure REQUEST would answer now, through the SAME checks the writer runs (⛔ a second copy that
 * could drift): the live return's row and its derived lapse, then `assertClosureGround`. ⛔ Takes no lock and writes
 * nothing (a lapsed request is REPORTED `lapsed`, ⛔ materialised). `crypto` hashes each person's current number (D22).
 */
export async function readClosureReadiness(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
  now: Date,
  opts: { readonly crypto: FieldCryptoDeps },
): Promise<ClosureReadiness> {
  const [claimRow] = await db
    .select()
    .from(claims)
    .where(and(eq(claims.pariwarId, pariwarId), eq(claims.claimCaseId, claimCaseId)))
    .limit(1);
  const chase = await resolveCorrectionChase(db, pariwarId, claimCaseId, { crypto: opts.crypto });
  const today = istDateOf(now);
  const familyRunDay = chase.familyRun === null ? null : correctionRunDay(chase.familyRun.day0, today);
  const none: ClosureReadiness = {
    state: null,
    origin: null,
    requestedAt: null,
    requestedByDisplay: null,
    blocker: 'no_live_return',
    notReached: null,
    familyRunDay,
  };
  if (!claimRow || chase.liveReturn === null) return none;
  const row = await readLiveClosureRowOfReturn(db, pariwarId, chase.liveReturn.decisionId);
  const lapsed = row !== null && (await isClosureRequestLapsed(db, pariwarId, row, chase));
  const base = {
    state: row === null ? null : lapsed ? ('lapsed' as const) : row.state,
    origin: row?.origin ?? null,
    requestedAt: row?.requestedAt ?? null,
    requestedByDisplay: row?.requestedByDisplay ?? null,
    familyRunDay,
  };
  if (row !== null && isHeldClosureState(row.state)) return { ...base, blocker: 'escalated', notReached: null };
  if (row !== null && row.state === 'requested' && !lapsed) return { ...base, blocker: 'request_pending', notReached: null };
  try {
    await assertClosureGround({
      db,
      pariwarId,
      claimCaseId,
      deceasedMemberId: claimRow.deceasedMemberId,
      currentState: claimRow.currentState,
      chase,
      today,
    });
    return { ...base, blocker: null, notReached: null };
  } catch (err) {
    if (err instanceof CorrectionClosureRefusedError) {
      return { ...base, blocker: err.refusal, notReached: err.notReached ?? null };
    }
    if (err instanceof ClaimContactRequiredError) return { ...base, blocker: 'claim_contact_required', notReached: null };
    throw err;
  }
}

// ── (2) THE REQUEST — the District Admin (AC6) ─────────────────────────────────────────────────────────────────

/**
 * ⭐ REQUEST A CLOSURE for no response (key (2), AC6). Under the trustee lock then the claim row lock, refused — the
 * FIRST that applies, in AC6's order — `no_live_return` (a certificate wait alone ⛔ never qualifies — invariant 10;
 * 6.19d relies on it) · `escalated` · `request_pending` · `not_family_action` · `too_early` · `claim_routed_to_r9` ·
 * `claim_corrected` · `not_reached` · D14. A LAPSED earlier request is materialised `lapsed` first (it ⛔ blocks
 * nothing). Records the request against the CURRENT family run. ⛔ Decides nothing.
 * @throws CorrectionClosureRefusedError | ClaimContactRequiredError
 */
export async function requestCorrectionClosure(
  client: pg.PoolClient,
  input: ActorInput & {
    /** Tier-1 ciphertext of the District Admin's note (the closure field class). */
    readonly noteCiphertext: string;
    readonly crypto: FieldCryptoDeps;
  },
): Promise<ClaimCorrectionClosureRow> {
  const { db, claimRow } = await lockForClosure(client, input.pariwarId, input.claimCaseId);
  const chase = await resolveCorrectionChase(db, input.pariwarId, input.claimCaseId, { crypto: input.crypto });
  if (chase.liveReturn === null) throw new CorrectionClosureRefusedError(input.claimCaseId, 'no_live_return');
  const existing = await readLiveClosureRowOfReturn(db, input.pariwarId, chase.liveReturn.decisionId);
  if (existing !== null) {
    if (isHeldClosureState(existing.state)) throw new CorrectionClosureRefusedError(input.claimCaseId, 'escalated');
    if (existing.state === 'requested' && !(await isClosureRequestLapsed(db, input.pariwarId, existing, chase))) {
      throw new CorrectionClosureRefusedError(input.claimCaseId, 'request_pending');
    }
  }
  const today = istDateOf(input.now);
  await assertClosureGround({
    db,
    pariwarId: input.pariwarId,
    claimCaseId: input.claimCaseId,
    deceasedMemberId: claimRow.deceasedMemberId,
    currentState: claimRow.currentState,
    chase,
    today,
  });
  if (existing !== null && existing.state === 'requested') {
    // ⭐ `-273` §3d — the earlier request LAPSED (derived above): materialise it, ONLY now that nothing after it can
    // refuse (it must leave the partial UNIQUE before the new row takes the return's one live slot).
    await db
      .update(claimCorrectionClosures)
      .set({ state: 'lapsed', lapsedAt: sql`clock_timestamp()`, updatedAt: sql`clock_timestamp()` })
      .where(and(eq(claimCorrectionClosures.closureId, existing.closureId), eq(claimCorrectionClosures.state, 'requested')));
  }
  const [row] = await db
    .insert(claimCorrectionClosures)
    .values({
      claimCaseId: input.claimCaseId,
      pariwarId: input.pariwarId,
      returnDecisionId: chase.liveReturn.decisionId as TrusteeDecisionId,
      origin: 'declined_closure',
      state: 'requested',
      requestFamilyRunId: chase.familyRun!.runId,
      requestedByActor: input.actorId,
      requestedByDisplay: input.actorDisplay,
      requestNoteCiphertext: input.noteCiphertext,
      // ⚠ The DB clock, ⛔ `input.now`: the lapse compares it with the marks' `set_at` (`clock_timestamp()`) — one
      // clock, or a mark written after the request could read as before it (`-273` §3d).
      requestedAt: sql`clock_timestamp()`,
    })
    .returning();
  return row!;
}

// ── (3) THE PARIWAR ADMIN'S DECISION (AC6, `-232` H) ────────────────────────────────────────────────────────────

/** The pending request the Pariwar Admin decides — refused `no_pending_request` / `escalated` / `request_lapsed`. */
async function pendingRequestOf(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
  chase: CorrectionChaseResolution,
): Promise<ClaimCorrectionClosureRow> {
  if (chase.liveReturn === null) {
    // The request's return stopped being live — any requested row of the claim LAPSED with it.
    const [stale] = await db
      .select({ id: claimCorrectionClosures.closureId })
      .from(claimCorrectionClosures)
      .where(
        and(
          eq(claimCorrectionClosures.pariwarId, pariwarId),
          eq(claimCorrectionClosures.claimCaseId, claimCaseId),
          eq(claimCorrectionClosures.state, 'requested'),
        ),
      )
      .limit(1);
    throw new CorrectionClosureRefusedError(claimCaseId, stale ? 'request_lapsed' : 'no_pending_request');
  }
  const row = await readLiveClosureRowOfReturn(db, pariwarId, chase.liveReturn.decisionId);
  if (row === null) {
    const [stale] = await db
      .select({ id: claimCorrectionClosures.closureId })
      .from(claimCorrectionClosures)
      .where(
        and(
          eq(claimCorrectionClosures.pariwarId, pariwarId),
          eq(claimCorrectionClosures.claimCaseId, claimCaseId),
          eq(claimCorrectionClosures.state, 'requested'),
        ),
      )
      .limit(1);
    throw new CorrectionClosureRefusedError(claimCaseId, stale ? 'request_lapsed' : 'no_pending_request');
  }
  if (isHeldClosureState(row.state)) throw new CorrectionClosureRefusedError(claimCaseId, 'escalated');
  if (row.state !== 'requested') throw new CorrectionClosureRefusedError(claimCaseId, 'no_pending_request');
  if (await isClosureRequestLapsed(db, pariwarId, row, chase)) {
    throw new CorrectionClosureRefusedError(claimCaseId, 'request_lapsed');
  }
  return row;
}

export interface CorrectionClosureDecisionResult {
  readonly closure: ClaimCorrectionClosureRow;
  /** The lifecycle chain's result — `null` on a decline (⛔ no claim event). */
  readonly chain: ClosureChainResult | null;
  /** The run ended `decided` (⛔ when it had already ended `day_90`). */
  readonly endedRun: boolean;
}

/** Record the closure on its row: `closed`, the closure date, the notice OUTBOX (`-273` §5) and the letters owed. */
async function markClosed(
  db: Db,
  row: ClaimCorrectionClosureRow,
  chase: CorrectionChaseResolution,
  reach: ClosureReach,
  extra: Partial<typeof claimCorrectionClosures.$inferInsert>,
): Promise<ClaimCorrectionClosureRow> {
  const { noticePersonKeys, letterPersonKeys } = closureNoticeRecipients(reach);
  const [updated] = await db
    .update(claimCorrectionClosures)
    .set({
      ...extra,
      state: 'closed',
      closedAt: sql`clock_timestamp()`,
      // The run being closed — the closure notice's provenance (and its reminder rows' anchor).
      closureNoticeRunId: chase.familyRun!.runId,
      closureNoticeDueAt: sql`clock_timestamp()`,
      // ⛔ No recipient at all ⇒ the outbox is done at once (nothing to send).
      closureNoticeDoneAt: noticePersonKeys.length === 0 ? sql`clock_timestamp()` : null,
      closureNoticePersonKeys: [...noticePersonKeys],
      closureLetterPersonKeys: [...letterPersonKeys],
      updatedAt: sql`clock_timestamp()`,
    })
    .where(eq(claimCorrectionClosures.closureId, row.closureId))
    .returning();
  return updated!;
}

/**
 * ⭐ THE PARIWAR ADMIN DECIDES a closure request (key (3)). Under the trustee lock then the claim row lock:
 *   · a LAPSED request ⇒ `request_lapsed` (approve AND decline — `-273` §3d: else a staff case is declined into
 *     `-251`'s waiver);
 *   · APPROVE — re-checks EVERY request refusal from `not_family_action` on (⭐ `too_early` against the CURRENT family
 *     run; `not_reached`, which a 6.20 number change can turn false), then D1 in this ONE transaction; the open run
 *     ends `decided`; the closure notice is recorded DUE (an outbox) and the letters owed;
 *   · DECLINE (a REQUIRED note) — re-checks `not_family_action`, then ESCALATES to the Super Admin (`-232` H) — ⛔ no
 *     claim event; the claim is HELD from here.
 * @throws CorrectionClosureRefusedError | ClaimContactRequiredError
 */
export async function decideCorrectionClosure(
  client: pg.PoolClient,
  input: ActorInput &
    (
      | {
          readonly decision: 'approve';
          readonly noteCiphertext: string | null;
          /** The D1 decision row's rationale (the trustee-decision field class — a FIXED text the route encrypts). */
          readonly decisionRationaleCiphertext: string;
          readonly crypto: FieldCryptoDeps;
        }
      | { readonly decision: 'decline'; readonly noteCiphertext: string }
    ),
): Promise<CorrectionClosureDecisionResult> {
  const { db, claimRow } = await lockForClosure(client, input.pariwarId, input.claimCaseId);
  const chase = await resolveCorrectionChase(
    db,
    input.pariwarId,
    input.claimCaseId,
    input.decision === 'approve' ? { crypto: input.crypto } : {},
  );
  const row = await pendingRequestOf(db, input.pariwarId, input.claimCaseId, chase);
  const decided = {
    pariwarDecidedByActor: input.actorId,
    pariwarDecidedByDisplay: input.actorDisplay,
    pariwarDecisionNoteCiphertext: input.noteCiphertext,
    pariwarDecidedAt: input.now,
  };

  if (input.decision === 'decline') {
    // `-273` §3d — the decline re-checks `not_family_action` (a staff case is ⛔ never declined into the waiver).
    if (chase.mark?.mustAct !== 'family') throw new CorrectionClosureRefusedError(input.claimCaseId, 'not_family_action');
    const [updated] = await db
      .update(claimCorrectionClosures)
      .set({ ...decided, pariwarDecision: 'declined', state: 'escalated', escalatedAt: input.now, updatedAt: sql`clock_timestamp()` })
      .where(and(eq(claimCorrectionClosures.closureId, row.closureId), eq(claimCorrectionClosures.state, 'requested')))
      .returning();
    if (!updated) throw new CorrectionClosureRefusedError(input.claimCaseId, 'no_pending_request');
    return { closure: updated, chain: null, endedRun: false };
  }

  assertDecidable(input.claimCaseId, claimRow.currentState);
  const reach = await assertClosureGround({
    db,
    pariwarId: input.pariwarId,
    claimCaseId: input.claimCaseId,
    deceasedMemberId: claimRow.deceasedMemberId,
    currentState: claimRow.currentState,
    chase,
    today: istDateOf(input.now),
  });
  const chainInput: ChainInput = {
    client,
    db,
    claimRow,
    pariwarId: input.pariwarId,
    claimCaseId: input.claimCaseId,
    returnDecisionId: chase.liveReturn!.decisionId,
    actorId: input.actorId,
    actorDisplay: input.actorDisplay,
    actor: 'trustee',
    decisionRationaleCiphertext: input.decisionRationaleCiphertext,
    ...(input.auditId !== undefined ? { auditId: input.auditId } : {}),
  };
  const chain = await writeClosureChain(chainInput, 'correction_closure_approved');
  const endedRun = await endOpenRunDecided(chainInput, chase);
  const closure = await markClosed(db, row, chase, reach, { ...decided, pariwarDecision: 'approved' });
  return { closure, chain, endedRun };
}

// ── The staff case's day-90 escalation — a RECORD the day-90 job writes (`-273` §3a, AC17) ──────────────────────

/**
 * ⭐ ESCALATE A STAFF CASE to the Super Admin at day 90 of its staff run (`-258` detail 2, `-273` §3a) — a closures
 * row of origin `staff_case`, ⛔ no request, ⛔ no Pariwar Admin decision; the claim is HELD from it. A RECORD, ⛔ a
 * decision (invariant 1; the D26 day-12 escalation is the precedent) — the ONE writer here a job may call. Idempotent:
 * returns `null` (writes nothing) unless the live return's latest mark is `staff`, its latest staff run reached day
 * 90, the claim is ⛔ resubmitted, and the return has ⛔ no live closures row.
 */
export async function escalateStaffCase(
  client: pg.PoolClient,
  input: { readonly pariwarId: PariwarId; readonly claimCaseId: ClaimId; readonly now: Date },
): Promise<ClaimCorrectionClosureRow | null> {
  const { db, claimRow } = await lockForClosure(client, input.pariwarId, input.claimCaseId);
  const chase = await resolveCorrectionChase(db, input.pariwarId, input.claimCaseId);
  if (chase.liveReturn === null || chase.mark?.mustAct !== 'staff' || chase.staffRun === null) return null;
  if (!isCorrectionRunExpired(chase.staffRun.day0, istDateOf(input.now))) return null;
  if ((await readLiveClosureRowOfReturn(db, input.pariwarId, chase.liveReturn.decisionId)) !== null) return null;
  const correction = await resolveClaimCorrectionState(
    db,
    input.pariwarId,
    input.claimCaseId,
    claimRow.deceasedMemberId,
    claimRow.currentState,
  );
  if (correction.resubmitted) return null;
  const [row] = await db
    .insert(claimCorrectionClosures)
    .values({
      claimCaseId: input.claimCaseId,
      pariwarId: input.pariwarId,
      returnDecisionId: chase.liveReturn.decisionId as TrusteeDecisionId,
      origin: 'staff_case',
      state: 'escalated',
      escalatedAt: input.now,
    })
    .onConflictDoNothing()
    .returning();
  return row ?? null;
}

// ── (5) THE SUPER ADMIN'S HOLD UNDER REVIEW AND DIRECTIONS (AC14, `-256`, D18) ──────────────────────────────────

/** The live return's HELD closures row — else `not_escalated` (`-256`: the power is confined to escalated claims). */
async function heldRowOf(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
  chase: CorrectionChaseResolution,
): Promise<ClaimCorrectionClosureRow> {
  if (chase.liveReturn === null) throw new CorrectionClosureRefusedError(claimCaseId, 'not_escalated');
  const row = await readLiveClosureRowOfReturn(db, pariwarId, chase.liveReturn.decisionId);
  if (row === null || !isHeldClosureState(row.state)) throw new CorrectionClosureRefusedError(claimCaseId, 'not_escalated');
  return row;
}

/**
 * HOLD AN ESCALATED CLAIM UNDER REVIEW (key (5), `-256` cl.1), with a note. ⛔ Nothing is paid, closed or refused
 * meanwhile — the claim is already held. Refused `not_escalated` / `already_under_review`.
 */
export async function placeClosureUnderReview(
  client: pg.PoolClient,
  input: ActorInput & { readonly noteCiphertext: string },
): Promise<ClaimCorrectionClosureRow> {
  const { db } = await lockForClosure(client, input.pariwarId, input.claimCaseId);
  const chase = await resolveCorrectionChase(db, input.pariwarId, input.claimCaseId);
  const row = await heldRowOf(db, input.pariwarId, input.claimCaseId, chase);
  if (row.state === 'under_review') throw new CorrectionClosureRefusedError(input.claimCaseId, 'already_under_review');
  const [updated] = await db
    .update(claimCorrectionClosures)
    .set({
      state: 'under_review',
      underReviewSince: input.now,
      underReviewByActor: input.actorId,
      underReviewByDisplay: input.actorDisplay,
      underReviewNoteCiphertext: input.noteCiphertext,
      updatedAt: sql`clock_timestamp()`,
    })
    .where(and(eq(claimCorrectionClosures.closureId, row.closureId), eq(claimCorrectionClosures.state, 'escalated')))
    .returning();
  if (!updated) throw new CorrectionClosureRefusedError(input.claimCaseId, 'already_under_review');
  return updated;
}

export interface ClosureDirectionResult {
  readonly direction: ClaimCorrectionDirectionRow;
  /** The `direction` run a `restart_family_reminders` opened, else `null`. */
  readonly openedRunId: string | null;
}

/**
 * DIRECT the named Pariwar Admin or District Admin (key (5), `-256` cl.3, D18) on a HELD claim. ⭐ Only
 * `restart_family_reminders` has a system effect: it opens a `direction` run (day 0 = the direction's IST date)
 * through 6.19b's opener, whose `CorrectionDirectionRunRefusedError` (the mark is ⛔ `family`, `-267` §5a) is
 * `direction_mark_not_family`. A direction asks for a RECORD — ⛔ never a decision (`-273` §4). The API verifies the
 * directee holds `role` in this Pariwar.
 */
export async function recordClosureDirection(
  client: pg.PoolClient,
  input: ActorInput & {
    readonly directedToActor: string;
    readonly directedToRole: DirectionRole;
    readonly kind: DirectionKind;
    readonly textCiphertext: string;
  },
): Promise<ClosureDirectionResult> {
  const { db } = await lockForClosure(client, input.pariwarId, input.claimCaseId);
  const chase = await resolveCorrectionChase(db, input.pariwarId, input.claimCaseId);
  const row = await heldRowOf(db, input.pariwarId, input.claimCaseId, chase);
  const [direction] = await db
    .insert(claimCorrectionDirections)
    .values({
      closureId: row.closureId,
      claimCaseId: input.claimCaseId,
      pariwarId: input.pariwarId,
      directedToActor: input.directedToActor,
      directedToRole: input.directedToRole,
      kind: input.kind,
      textCiphertext: input.textCiphertext,
      createdByActor: input.actorId,
      createdByDisplay: input.actorDisplay,
    })
    .returning();
  if (input.kind !== 'restart_family_reminders') return { direction: direction!, openedRunId: null };
  let runId: string;
  try {
    const run = await openCorrectionRun(client, {
      pariwarId: input.pariwarId,
      claimCaseId: input.claimCaseId,
      returnDecisionId: chase.liveReturn!.decisionId,
      kind: 'direction',
      anchorId: direction!.directionId,
      day0: istDateOf(input.now),
    });
    runId = run.runId;
  } catch (err) {
    if (err instanceof CorrectionDirectionRunRefusedError) {
      throw new CorrectionClosureRefusedError(input.claimCaseId, 'direction_mark_not_family');
    }
    throw err;
  }
  const [updated] = await db
    .update(claimCorrectionDirections)
    .set({ openedRunId: runId, updatedAt: sql`clock_timestamp()` })
    .where(eq(claimCorrectionDirections.directionId, direction!.directionId))
    .returning();
  return { direction: updated!, openedRunId: runId };
}

/**
 * The NAMED directee RECORDS what they did (D18) — an identity check (the actor IS `directed_to_actor`; the route also
 * requires `claim.view_nominee_name_check`), ⛔ a key. Once; ⛔ never overwritten. Stays open after the claim's
 * decision (a record only — `-273` §6).
 */
export async function respondToClosureDirection(
  client: pg.PoolClient,
  input: ActorInput & { readonly directionId: string; readonly responseCiphertext: string },
): Promise<ClaimCorrectionDirectionRow> {
  const { db } = await lockForClosure(client, input.pariwarId, input.claimCaseId);
  const [direction] = await db
    .select()
    .from(claimCorrectionDirections)
    .where(
      and(
        eq(claimCorrectionDirections.pariwarId, input.pariwarId),
        eq(claimCorrectionDirections.claimCaseId, input.claimCaseId),
        eq(claimCorrectionDirections.directionId, input.directionId),
      ),
    )
    .limit(1);
  if (!direction) throw new CorrectionClosureRefusedError(input.claimCaseId, 'not_found');
  if (direction.directedToActor !== input.actorId) throw new CorrectionClosureRefusedError(input.claimCaseId, 'not_directee');
  if (direction.respondedAt !== null) throw new CorrectionClosureRefusedError(input.claimCaseId, 'direction_answered');
  const [updated] = await db
    .update(claimCorrectionDirections)
    .set({
      responseCiphertext: input.responseCiphertext,
      respondedAt: input.now,
      respondedByActor: input.actorId,
      respondedByDisplay: input.actorDisplay,
      updatedAt: sql`clock_timestamp()`,
    })
    .where(and(eq(claimCorrectionDirections.directionId, input.directionId), isNull(claimCorrectionDirections.respondedAt)))
    .returning();
  if (!updated) throw new CorrectionClosureRefusedError(input.claimCaseId, 'direction_answered');
  return updated;
}

// ── (4) THE SUPER ADMIN'S DECISION (AC14, D17, `-251`, `-260` G1, `-273` §4/§8/§10, `-274` 1a/1c) ────────────────

/** `-273` §10 — is `reason` from the closure-scoped set FOR `decision`? Pure. */
export function isClosureReasonValidFor(decision: ClosureSuperAdminDecision, reason: string): reason is ClosureSuperAdminReason {
  return (CLOSURE_SUPER_ADMIN_REASONS[decision] as readonly string[]).includes(reason);
}

/**
 * The trustee reason codes a Super Admin REFUSAL may carry: those valid for `denied`, minus the two that belong to
 * other acts — `r9_panel_denied` (a panel VOTE's outcome) and `concealment_upheld` (needs the live concealment signal
 * the vote resolves — ⛔ this surface's). Pure.
 */
export function isSuperAdminRefusalReasonCode(code: string): code is StateTrusteeReasonCode {
  return (
    code !== 'r9_panel_denied' &&
    code !== 'concealment_upheld' &&
    isTrusteeReasonCodeValidForOutcome('denied', code as StateTrusteeReasonCode)
  );
}

export type EscalatedClosureDecisionInput = ActorInput & {
  readonly reason: string;
  /** Tier-1 ciphertext of the Super Admin's REQUIRED note (the closure field class). */
  readonly noteCiphertext: string;
  /** The decision row's rationale (the trustee-decision field class — the same note, encrypted for that row). */
  readonly decisionRationaleCiphertext: string;
} & (
    | { readonly decision: 'close'; readonly crypto: FieldCryptoDeps }
    | { readonly decision: 'refuse'; readonly refusalReasonCode: string }
    | { readonly decision: 'approve' }
  );

export interface EscalatedClosureDecisionResult extends CorrectionClosureDecisionResult {
  /** `approve` only — the `-251` waiver ran (a declined-closure origin, ⛔ resubmitted). */
  readonly nameCheckWaived: boolean | null;
  readonly approvalNameCheckState: ApprovalNameCheckState | null;
}

/**
 * ⭐ THE SUPER ADMIN DECIDES AN ESCALATED CLAIM (key (4)) — close, refuse for another reason, or approve — each with
 * a REQUIRED note and a REQUIRED closure-scoped reason (`-273` §10), under the trustee lock then the claim row lock,
 * each superseding the live return (0 rows ⇒ 409) and ending an open run `decided`:
 *   · CLOSE — ⛔ a staff origin, checked FIRST and keyed on the ORIGIN (`staff_case_origin`, `-274` 1a — ⛔ the mark);
 *     then every request refusal from `not_family_action` on; then D1 (trigger `correction_closure_super_admin`);
 *   · REFUSE — a chosen trustee reason code (`isSuperAdminRefusalReasonCode`); `denied_no_appeal` only after a used
 *     appeal (T4);
 *   · APPROVE — on a DECLINED-CLOSURE origin ⛔ resubmitted: the `-251` path — the FULL gate minus the name check BY
 *     CONSTRUCTION (`assertClaimApprovable(…, { nameCheck: 'waived_251' })`) then D14, recording the check's state
 *     (`-273` §7, §8; `-274` 1c — whatever the mark says now); otherwise (a staff origin — `-260` G1; or a RESUBMITTED
 *     claim — `-273` §4) the FULL gate, ⛔ nothing waived. Which runs is decided HERE, under the locks.
 * ⛔ No text goes to the family after a refusal or an approval (`-260` G3) — only the closure sends one.
 * @throws CorrectionClosureRefusedError | ClaimContactRequiredError | the approval gate's typed errors
 */
export async function decideEscalatedClosure(
  client: pg.PoolClient,
  input: EscalatedClosureDecisionInput,
): Promise<EscalatedClosureDecisionResult> {
  const { db, claimRow } = await lockForClosure(client, input.pariwarId, input.claimCaseId);
  const chase = await resolveCorrectionChase(
    db,
    input.pariwarId,
    input.claimCaseId,
    input.decision === 'close' ? { crypto: input.crypto } : {},
  );
  const row = await heldRowOf(db, input.pariwarId, input.claimCaseId, chase);
  const terminal: ClosureSuperAdminDecision =
    input.decision === 'close' ? 'closed' : input.decision === 'refuse' ? 'refused' : 'approved';
  // `-274` 1a — a staff-origin escalation is ⛔ never closable: checked FIRST, keyed on the ORIGIN.
  if (input.decision === 'close' && row.origin === 'staff_case') {
    throw new CorrectionClosureRefusedError(input.claimCaseId, 'staff_case_origin');
  }
  if (!isClosureReasonValidFor(terminal, input.reason)) {
    throw new CorrectionClosureRefusedError(input.claimCaseId, 'reason_invalid');
  }
  if (input.decision === 'refuse' && !isSuperAdminRefusalReasonCode(input.refusalReasonCode)) {
    throw new CorrectionClosureRefusedError(input.claimCaseId, 'refusal_reason_invalid');
  }
  assertDecidable(input.claimCaseId, claimRow.currentState);

  const chainInput: ChainInput = {
    client,
    db,
    claimRow,
    pariwarId: input.pariwarId,
    claimCaseId: input.claimCaseId,
    returnDecisionId: chase.liveReturn!.decisionId,
    actorId: input.actorId,
    actorDisplay: input.actorDisplay,
    actor: 'trustee',
    decisionRationaleCiphertext: input.decisionRationaleCiphertext,
    ...(input.auditId !== undefined ? { auditId: input.auditId } : {}),
  };
  const decided = {
    superAdminDecision: terminal,
    superAdminReason: input.reason as ClosureSuperAdminReason,
    superAdminDecidedByActor: input.actorId,
    superAdminDecidedByDisplay: input.actorDisplay,
    superAdminNoteCiphertext: input.noteCiphertext,
    superAdminDecidedAt: input.now,
  };

  if (input.decision === 'close') {
    const reach = await assertClosureGround({
      db,
      pariwarId: input.pariwarId,
      claimCaseId: input.claimCaseId,
      deceasedMemberId: claimRow.deceasedMemberId,
      currentState: claimRow.currentState,
      chase,
      today: istDateOf(input.now),
    });
    const chain = await writeClosureChain(chainInput, 'correction_closure_super_admin');
    const endedRun = await endOpenRunDecided(chainInput, chase);
    const closure = await markClosed(db, row, chase, reach, decided);
    return { closure, chain, endedRun, nameCheckWaived: null, approvalNameCheckState: null };
  }

  if (input.decision === 'refuse') {
    const chain = await writeRefusalChain(chainInput, input.refusalReasonCode as StateTrusteeReasonCode);
    const endedRun = await endOpenRunDecided(chainInput, chase);
    const [closure] = await db
      .update(claimCorrectionClosures)
      .set({ ...decided, state: 'refused', updatedAt: sql`clock_timestamp()` })
      .where(eq(claimCorrectionClosures.closureId, row.closureId))
      .returning();
    return { closure: closure!, chain, endedRun, nameCheckWaived: null, approvalNameCheckState: null };
  }

  // APPROVE — which writer runs is decided here, under the locks (`-273` §8).
  const correction = await resolveClaimCorrectionState(
    db,
    input.pariwarId,
    input.claimCaseId,
    claimRow.deceasedMemberId,
    claimRow.currentState,
  );
  const waive = row.origin === 'declined_closure' && !correction.resubmitted;
  let approvalNameCheckState: ApprovalNameCheckState;
  if (waive) {
    await assertClaimApprovable(db, input.pariwarId, input.claimCaseId, claimRow.deceasedMemberId, {
      nameCheck: 'waived_251',
    });
    approvalNameCheckState = await readNomineeNameCheckApprovalState(
      db,
      input.pariwarId,
      input.claimCaseId,
      claimRow.deceasedMemberId,
    );
  } else {
    await assertClaimApprovable(db, input.pariwarId, input.claimCaseId, claimRow.deceasedMemberId);
    approvalNameCheckState = 'passing';
  }
  await assertClaimContactRecorded(db, input.pariwarId, input.claimCaseId);
  const chain = await writeApprovalChain(
    chainInput,
    waive ? 'correction_super_admin_approve_251' : 'correction_super_admin_approve',
  );
  const endedRun = await endOpenRunDecided(chainInput, chase);
  const [closure] = await db
    .update(claimCorrectionClosures)
    .set({
      ...decided,
      state: 'approved',
      nameCheckWaived: waive,
      approvalNameCheckState,
      updatedAt: sql`clock_timestamp()`,
    })
    .where(eq(claimCorrectionClosures.closureId, row.closureId))
    .returning();
  return { closure: closure!, chain, endedRun, nameCheckWaived: waive, approvalNameCheckState };
}

// ── (8) "NO CORRECTION NEEDED" — the District Admin's record, the Pariwar Admin's approve / keep (D27, `-260` G2) ───

/** The live return's LIVE "no correction needed" record — its own mark is still the latest — else `null`. */
export async function readLiveNoCorrectionRecord(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
): Promise<ClaimCorrectionNoCorrectionRecordRow | null> {
  const chase = await resolveCorrectionChase(db, pariwarId, claimCaseId);
  if (chase.liveReturn === null || chase.mark === null) return null;
  const [record] = await db
    .select()
    .from(claimCorrectionNoCorrectionRecords)
    .where(
      and(
        eq(claimCorrectionNoCorrectionRecords.pariwarId, pariwarId),
        eq(claimCorrectionNoCorrectionRecords.returnDecisionId, chase.liveReturn.decisionId as TrusteeDecisionId),
      ),
    )
    .orderBy(desc(claimCorrectionNoCorrectionRecords.recordedAt))
    .limit(1);
  return record !== undefined && record.markId === chase.mark.markId ? record : null;
}

export interface NoCorrectionRecordResult {
  readonly record: ClaimCorrectionNoCorrectionRecordRow;
  readonly mark: WriteCorrectionMarkResult;
}

/**
 * RECORD "NO CORRECTION NEEDED" (key (8), D27) — a RECORD, allowed while held (`-273` §4): the mark is set to `staff`
 * through 6.19b's writer (with the HOLD — a held claim opens ⛔ no run), and the record names that mark. It takes
 * effect only with a current passing name check recorded AFTER it (the approve's check). ⛔ Decides nothing.
 * @throws CorrectionClosureRefusedError `no_live_return`
 */
export async function recordNoCorrectionNeeded(
  client: pg.PoolClient,
  input: ActorInput & {
    /** Tier-1 ciphertext of the note under the MARK field class (the mark row's note). */
    readonly markNoteCiphertext: string;
    /** Tier-1 ciphertext of the same note under the closure field class (the record's). */
    readonly noteCiphertext: string;
    readonly setByRole: CorrectionMarkRole;
    readonly hold: CorrectionHoldCheck;
  },
): Promise<NoCorrectionRecordResult> {
  const { db } = await lockForClosure(client, input.pariwarId, input.claimCaseId);
  const chase = await resolveCorrectionChase(db, input.pariwarId, input.claimCaseId);
  if (chase.liveReturn === null) throw new CorrectionClosureRefusedError(input.claimCaseId, 'no_live_return');
  const mark = await writeCorrectionMark(client, {
    pariwarId: input.pariwarId,
    claimCaseId: input.claimCaseId,
    mustAct: 'staff',
    actorId: input.actorId,
    actorDisplay: input.actorDisplay,
    setByRole: input.setByRole,
    noteCiphertext: input.markNoteCiphertext,
    now: input.now,
    hold: input.hold,
  });
  const [record] = await db
    .insert(claimCorrectionNoCorrectionRecords)
    .values({
      claimCaseId: input.claimCaseId,
      pariwarId: input.pariwarId,
      returnDecisionId: chase.liveReturn.decisionId as TrusteeDecisionId,
      markId: mark.mark.markId,
      noteCiphertext: input.noteCiphertext,
      recordedByActor: input.actorId,
      recordedByDisplay: input.actorDisplay,
    })
    .returning();
  return { record: record!, mark };
}

/**
 * ⭐ THE PARIWAR ADMIN APPROVES a "no correction needed" claim (D27 — a NEW writer, ⛔ `voteOnFrozenClaim`, T2):
 * under the trustee lock then the claim row lock — refused while HELD (`cycle_freeze_escalated`, `-273` §4); a LIVE
 * record (its mark still the latest — `no_record`); a name check recorded AFTER it (`check_required`); then the FULL
 * gate (⛔ nothing waived) and D14; the conditional supersede of the return; the ordinary approval events; the open
 * run ends `decided`.
 * @throws CorrectionClosureRefusedError | ClaimContactRequiredError | the approval gate's typed errors
 */
export async function approveNoCorrectionNeeded(
  client: pg.PoolClient,
  input: ActorInput & { readonly decisionRationaleCiphertext: string },
): Promise<{ readonly chain: ClosureChainResult; readonly endedRun: boolean }> {
  const { db, claimRow } = await lockForClosure(client, input.pariwarId, input.claimCaseId);
  if (await isCorrectionClaimHeld(db, input.pariwarId, input.claimCaseId)) {
    throw new CorrectionClosureRefusedError(input.claimCaseId, 'cycle_freeze_escalated');
  }
  const chase = await resolveCorrectionChase(db, input.pariwarId, input.claimCaseId);
  if (chase.liveReturn === null) throw new CorrectionClosureRefusedError(input.claimCaseId, 'no_live_return');
  const record = await readLiveNoCorrectionRecord(db, input.pariwarId, input.claimCaseId);
  if (record === null) throw new CorrectionClosureRefusedError(input.claimCaseId, 'no_record');
  const check = await getLatestNomineeNameCheck(db, input.pariwarId, input.claimCaseId);
  if (check === null || check.checkedAt.getTime() <= record.recordedAt.getTime()) {
    throw new CorrectionClosureRefusedError(input.claimCaseId, 'check_required');
  }
  assertDecidable(input.claimCaseId, claimRow.currentState);
  if (await hasLiveRoutedRow(db, input.pariwarId, input.claimCaseId)) {
    throw new CorrectionClosureRefusedError(input.claimCaseId, 'claim_routed_to_r9');
  }
  await assertClaimApprovable(db, input.pariwarId, input.claimCaseId, claimRow.deceasedMemberId);
  await assertClaimContactRecorded(db, input.pariwarId, input.claimCaseId);
  const chainInput: ChainInput = {
    client,
    db,
    claimRow,
    pariwarId: input.pariwarId,
    claimCaseId: input.claimCaseId,
    returnDecisionId: chase.liveReturn.decisionId,
    actorId: input.actorId,
    actorDisplay: input.actorDisplay,
    actor: 'trustee',
    decisionRationaleCiphertext: input.decisionRationaleCiphertext,
    ...(input.auditId !== undefined ? { auditId: input.auditId } : {}),
  };
  const chain = await writeApprovalChain(chainInput, 'no_correction_needed_approve');
  const endedRun = await endOpenRunDecided(chainInput, chase);
  return { chain, endedRun };
}

/**
 * The Pariwar Admin KEEPS a "no correction needed" claim sent back, STATING who must act, with a note (`-260` G2) —
 * a mark write through 6.19b's writer (a same-value keep is RECORDED; a switch to `family` opens a new family run,
 * day 0 = that day — unless HELD, `-274` 1b). Requires a LIVE record (`no_record`); the keep's mark supersedes it.
 * Allowed while held (a record, `-273` §4).
 */
export async function keepNoCorrectionNeeded(
  client: pg.PoolClient,
  input: ActorInput & {
    readonly mustAct: CorrectionMustAct;
    readonly noteCiphertext: string;
    readonly setByRole: CorrectionMarkRole;
    readonly hold: CorrectionHoldCheck;
  },
): Promise<WriteCorrectionMarkResult> {
  const { db } = await lockForClosure(client, input.pariwarId, input.claimCaseId);
  if ((await readLiveNoCorrectionRecord(db, input.pariwarId, input.claimCaseId)) === null) {
    throw new CorrectionClosureRefusedError(input.claimCaseId, 'no_record');
  }
  return writeCorrectionMark(client, {
    pariwarId: input.pariwarId,
    claimCaseId: input.claimCaseId,
    mustAct: input.mustAct,
    actorId: input.actorId,
    actorDisplay: input.actorDisplay,
    setByRole: input.setByRole,
    noteCiphertext: input.noteCiphertext,
    now: input.now,
    hold: input.hold,
  });
}
