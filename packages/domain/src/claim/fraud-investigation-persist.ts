// The fraud register's INVESTIGATION — the helpline operator's flag and the District Admin's finding (Story 6.22, Task 2.3;
// DL3, DL4; author-commit `2026-11-01-438` items 3, 4). Transport-free.
//
// `2026-09-21-238` cl. 3: *"operator flags → District Admin verifies and confirms"* · cl. 4: *"TWO OUTCOMES ONLY. An
// investigation finds the member innocent or guilty."* · `2026-09-28-261` D3 A: a living member locked by a wrong claim is
// unlocked ONLY by the investigation's finding — ⛔ a bare staff "alive" mark (that reading was NOT taken).
//
// ⭐ THE FLAG (`flagClaimForFraudInvestigation`) — the helpline operator, on a claim in ANY state, once. It gates NOTHING
// (the built side of the Panel's Q7 — ⛔ no approval gate reads it).
// ⭐ THE FINDING (`recordFraudFinding`) — the District Admin, ONLY on a flagged claim with ⛔ finding, ⛔ by the flagger, with
// a note AND how the member was confirmed alive (`FRAUD_ALIVE_CONFIRMATIONS` — the built side of Q9). In ONE transaction,
// in the closure core's lock order (N4): the finding row (innocent: `recordMemberInnocenceFinding` — the release; guilty:
// `recordMemberGuiltFinding` — the sticky freeze), the `found_*` step, and — when the claim is CLOSABLE — `claim.closed`
// through the closure core (`closeClaimOnFraudFinding`, its live processes ended). An `approved` / `settled` claim is ⛔
// closed (row `6-22c`) — the response says so.
//
// ⚠ THE SOURCE FENCE (TR2): this file ⛔ spells a finding KIND and ⛔ imports `CLAIM_NOMINEE_FINDING_KINDS` — "already found"
// reads the STEP table; every kind-spelling write lives in `nominee-lock.ts`.
//
// ⚠ LOCK ORDER (the closure core's — Trap 8 / 40P01): ONE unlocked read of the claim's deceased member, the death's INTAKE key,
// this claim's `appeal:` → `r9:` → trustee keys (`takeClaimClosureKeys`, built from the DB row's id — TR11), THEN the claim
// row. The writers called below re-take the intake key (re-entrant — TR9) and the row (already held).

import { and, eq, sql } from 'drizzle-orm';
import type pg from 'pg';

import { bindScopedDb, type Db } from '../db.js';
import type { ClaimFraudInvestigationStepId, ClaimId, ClaimNomineeFindingId, MemberId, PariwarId } from '../ids/index.js';
import {
  FRAUD_ALIVE_CONFIRMATIONS,
  type FraudAliveConfirmation,
  type FraudInvestigationStep,
  claimFraudInvestigationSteps,
} from '../schema/claim_fraud_investigation_steps.js';
import { claims, type ClaimRow } from '../schema/claims.js';
import { listStandingDeathReports, type StandingDeathReport } from './death-report.js';
import { ClaimNomineeFindingRefusedError, FraudInvestigationRefusedError } from './errors.js';
import type { ClaimEventActor } from './events.js';
import { intakeAdvisoryLockKey } from './icp-lock.js';
import { recordMemberGuiltFinding, recordMemberInnocenceFinding } from './nominee-lock.js';
import { projectClaimState } from './project.js';
import { closeClaimOnFraudFinding, takeClaimClosureKeys } from './suspicion-refusal-persist.js';

/** The two outcomes (`-238` cl. 4). ⛔ No third. */
export const FRAUD_FINDING_OUTCOMES = ['innocent', 'guilty'] as const;
export type FraudFindingOutcome = (typeof FRAUD_FINDING_OUTCOMES)[number];

const FOUND_STEP: Record<FraudFindingOutcome, FraudInvestigationStep> = { innocent: 'found_innocent', guilty: 'found_guilty' };
const CLOSE_TRIGGER = { innocent: 'fraud_finding_innocent', guilty: 'fraud_finding_guilty' } as const;
const FINDING_ANNOTATION = { innocent: 'claim.nominee_lock_released', guilty: 'claim.member_found_guilty' } as const;

interface StepActor {
  readonly actorId: string;
  /** Resolved server-side from `users.display_name` by the caller — ⛔ a fallback, ⛔ email-derived. */
  readonly actorDisplay: string;
  readonly actor: ClaimEventActor;
}

function requireNoteAndDisplay(claimCaseId: string, noteCiphertext: string, actorDisplay: string): void {
  if (noteCiphertext.trim() === '') throw new FraudInvestigationRefusedError(claimCaseId, 'missing_note', 'every step carries a note');
  if (actorDisplay.trim() === '') {
    throw new FraudInvestigationRefusedError(claimCaseId, 'missing_display', 'a step is attributed to a named human');
  }
}

async function lockClaimRow(db: Db, pariwarId: PariwarId, claimCaseId: ClaimId): Promise<ClaimRow | undefined> {
  const [row] = await db
    .select()
    .from(claims)
    .where(and(eq(claims.pariwarId, pariwarId), eq(claims.claimCaseId, claimCaseId)))
    .for('update');
  return row;
}

async function readSteps(db: Db, pariwarId: PariwarId, claimCaseId: ClaimId) {
  return db
    .select()
    .from(claimFraudInvestigationSteps)
    .where(and(eq(claimFraudInvestigationSteps.pariwarId, pariwarId), eq(claimFraudInvestigationSteps.claimCaseId, claimCaseId)));
}

/** The version of the LAST event on the claim's stream of `eventType` whose payload names `key = value`. */
async function eventVersionOf(db: Db, claimCaseId: ClaimId, eventType: string, key: string, value: string): Promise<number | null> {
  const result = await db.execute<{ event_version: string | number }>(sql`
    SELECT e.event_version
      FROM events_log e
     WHERE e.stream_id = ${claimCaseId}
       AND e.event_type = ${eventType}
       AND lower(e.payload ->> ${key}) = lower(${value})
     ORDER BY e.event_version DESC
     LIMIT 1
  `);
  const row = result.rows?.[0];
  return row === undefined ? null : Number(row.event_version);
}

const sameId = (a: string, b: string): boolean => a.toLowerCase() === b.toLowerCase();

/** The steps table's primary key — `step_id` is producer-supplied and the key is global (across claims AND Pariwars). */
const STEPS_PRIMARY_KEY = 'claim_fraud_investigation_steps_pkey';

/**
 * A producer-supplied `step_id` that already exists on ANOTHER claim or Pariwar: the replay lookup is per claim and
 * RLS-scoped, so only the insert meets the global key. Surfaced as a typed `step_conflict`, ⛔ a raw 23505 (a 500). The
 * transaction is already aborted at that point — the caller rolls back, exactly as for any other refusal thrown here.
 */
function isStepIdCollision(err: unknown): boolean {
  const e = err as { code?: string; constraint?: string; cause?: { code?: string; constraint?: string } };
  return (e.code ?? e.cause?.code) === '23505' && (e.constraint ?? e.cause?.constraint) === STEPS_PRIMARY_KEY;
}

// ── The flag (DL4) ──────────────────────────────────────────────────────────────────────────────────

export interface FlagClaimForFraudInvestigationInput extends StepActor {
  readonly claimCaseId: ClaimId;
  readonly pariwarId: PariwarId;
  /** Producer-supplied — a retry with the same id BY THE SAME ACTOR replays; ⛔ by another actor ⇒ `step_conflict` (R2-4). */
  readonly stepId: ClaimFraudInvestigationStepId;
  /** Tier-1 — the operator's note, encrypted by the caller under `CLAIM_FRAUD_INVESTIGATION_FIELD_CLASS`. */
  readonly noteCiphertext: string;
}

export interface FlagClaimForFraudInvestigationResult {
  readonly stepId: ClaimFraudInvestigationStepId;
  readonly claimState: string;
  readonly deceasedMemberId: MemberId;
  /** The `claim.fraud_flagged` event's version. */
  readonly eventVersion: number;
  /** `true` ⇒ this call repeated an earlier flag with the same step id — ⛔ row, ⛔ event written. */
  readonly replayed: boolean;
}

/**
 * ⭐ DL4 — the helpline operator FLAGS a claim (any state) as possibly about a member who is ALIVE. Writes the `flagged`
 * step and the `claim.fraud_flagged` annotation in ONE transaction, under the claim's row lock. ⭐ THE REPLAY KEY is the
 * step id AND the actor (case-insensitive — R2-4): a retry with the SAME step id by the SAME actor REPLAYS — it writes
 * nothing and returns the recorded flag's event version, with `claimState` read from the claim's CURRENT row (so a
 * replay after a later close reports `closed`, not the state at the first call); a flag under a DIFFERENT step id on a
 * flagged claim is `already_flagged`. The same step id from ANOTHER actor, or a step id already used on another claim or
 * Pariwar, is `step_conflict`. It changes ⛔ state and gates ⛔ approval (N5).
 */
export async function flagClaimForFraudInvestigation(
  client: pg.PoolClient,
  input: FlagClaimForFraudInvestigationInput,
): Promise<FlagClaimForFraudInvestigationResult> {
  requireNoteAndDisplay(input.claimCaseId, input.noteCiphertext, input.actorDisplay);
  const db = bindScopedDb(client);
  const row = await lockClaimRow(db, input.pariwarId, input.claimCaseId);
  if (!row) throw new FraudInvestigationRefusedError(input.claimCaseId, 'claim_not_found', 'no such claim');

  const steps = await readSteps(db, input.pariwarId, row.claimCaseId);
  const same = steps.find((s) => sameId(s.stepId, input.stepId));
  if (same) {
    if (same.step !== 'flagged') throw new FraudInvestigationRefusedError(input.claimCaseId, 'step_conflict', 'that step id is a finding');
    // ⛔ A replay from ANOTHER actor (R2-4): the step id alone is not the replay key — answered `step_conflict`, ⛔ a 200.
    if (!sameId(same.actorId, input.actorId)) {
      throw new FraudInvestigationRefusedError(input.claimCaseId, 'step_conflict', 'that step id was used by another actor');
    }
    const version = await eventVersionOf(db, row.claimCaseId, 'claim.fraud_flagged', 'step_id', same.stepId);
    if (version === null) throw new Error(`[fraud-investigation] flag ${same.stepId} is recorded but its event is missing`);
    return { stepId: same.stepId, claimState: row.currentState, deceasedMemberId: row.deceasedMemberId, eventVersion: version, replayed: true };
  }
  if (steps.some((s) => s.step === 'flagged')) {
    throw new FraudInvestigationRefusedError(input.claimCaseId, 'already_flagged', 'this claim is already flagged');
  }

  try {
    await db.insert(claimFraudInvestigationSteps).values({
      stepId: input.stepId,
      claimCaseId: row.claimCaseId,
      pariwarId: input.pariwarId,
      deceasedMemberId: row.deceasedMemberId,
      step: 'flagged',
      findingId: null,
      aliveConfirmation: null,
      noteCiphertext: input.noteCiphertext,
      actorId: input.actorId,
      actorDisplay: input.actorDisplay,
    });
  } catch (err) {
    if (isStepIdCollision(err)) throw new FraudInvestigationRefusedError(input.claimCaseId, 'step_conflict', 'that step id is already used');
    throw err;
  }
  const projected = await projectClaimState(client, {
    claimCaseId: row.claimCaseId,
    pariwarId: input.pariwarId,
    deceasedMemberId: row.deceasedMemberId,
    intakeChannels: row.intakeChannels,
    claimantActorId: row.claimantActorId,
    eventType: 'claim.fraud_flagged',
    payload: {
      from_state: row.currentState,
      to_state: row.currentState,
      trigger: 'fraud_investigation_flag',
      actor: input.actor,
      step_id: input.stepId,
    },
    actorId: input.actorId,
  });
  return {
    stepId: input.stepId,
    claimState: row.currentState,
    deceasedMemberId: row.deceasedMemberId,
    eventVersion: projected.eventVersion,
    replayed: false,
  };
}

// ── The finding (DL3) ───────────────────────────────────────────────────────────────────────────────

export interface RecordFraudFindingInput extends StepActor {
  readonly claimCaseId: ClaimId;
  readonly pariwarId: PariwarId;
  readonly outcome: FraudFindingOutcome;
  /** HOW the member was confirmed alive — required (N1; the Panel's Q9 decides which suffice). */
  readonly aliveConfirmation: FraudAliveConfirmation;
  /** Producer-supplied — a retry with the same step id, outcome, finding id AND actor REPLAYS; else `step_conflict` (R2-4). */
  readonly stepId: ClaimFraudInvestigationStepId;
  /** Producer-supplied — the member finding's own id. */
  readonly findingId: ClaimNomineeFindingId;
  /** Tier-1 — the District Admin's note, encrypted by the caller under `CLAIM_FRAUD_INVESTIGATION_FIELD_CLASS`. */
  readonly noteCiphertext: string;
  readonly auditId?: string;
}

export interface RecordFraudFindingResult {
  readonly stepId: ClaimFraudInvestigationStepId;
  readonly findingId: ClaimNomineeFindingId;
  readonly outcome: FraudFindingOutcome;
  readonly deceasedMemberId: MemberId;
  /**
   * `closed: true` — the claim is now `closed` (`fraud_finding_*`). `closed: false` — `committed` (`approved` / `settled`:
   * the finding stands, the claim is ⛔ stopped — row `6-22c`) or `already_closed` (closed earlier; ⛔ closed again).
   */
  readonly close: { readonly closed: true } | { readonly closed: false; readonly reason: 'committed' | 'already_closed' };
  /** The LAST event the finding wrote — `claim.closed` when it closed the claim, else its annotation. */
  readonly eventVersion: number;
  /** The member's OTHER claims that still keep their death reported (ids, states, dates — ⛔ PII). */
  readonly otherStandingClaims: readonly StandingDeathReport[];
  /** `true` ⇒ this call repeated an earlier finding with the same step id — ⛔ row, ⛔ event written. */
  readonly replayed: boolean;
}

/**
 * ⭐ DL3 — the District Admin's finding on a FLAGGED claim: innocent (the member is released at once) or guilty (the
 * locks are kept and the account stays frozen — a declared narrowing pending the Panel's Q1). Steps:
 *   1. ONE unlocked read of the claim's deceased member; the intake key; this claim's closure keys; the claim row;
 *   2. REPLAY first — ⭐ THE REPLAY KEY is the step id, the outcome, the finding id AND the actor (ids case-insensitive —
 *      R2-4): all four match ⇒ the recorded finding, ⛔ write (`close.reason` and `otherStandingClaims` are re-derived
 *      from the claim's CURRENT row, so a replay after a later change reports the state now); the same step id with any
 *      of the other three different ⇒ `step_conflict`, ⛔ a replay; then a flag must exist, ⛔ found step yet, and the
 *      finder ⛔ the flagger;
 *   3. the proof of life is required;
 *   4. the member finding (`nominee-lock.ts` — innocent or guilty);
 *   5. the `found_*` step;
 *   6. a CLOSABLE claim is closed through the closure core; an `approved` / `settled` one is ⛔ closed.
 * ⛔ It moves no money and no pool (N5).
 */
export async function recordFraudFinding(client: pg.PoolClient, input: RecordFraudFindingInput): Promise<RecordFraudFindingResult> {
  // ⚠ FIRST, before any write: anything but the two outcomes would take the guilty writer below and write the finding row
  // and the sticky annotation before the step insert failed — a programmer error (the contract enum stops it at the API).
  if (!(FRAUD_FINDING_OUTCOMES as readonly string[]).includes(input.outcome)) {
    throw new Error(`[fraud-investigation] unknown outcome ${String(input.outcome)} — ${FRAUD_FINDING_OUTCOMES.join(' | ')} only`);
  }
  requireNoteAndDisplay(input.claimCaseId, input.noteCiphertext, input.actorDisplay);
  if (!(FRAUD_ALIVE_CONFIRMATIONS as readonly string[]).includes(input.aliveConfirmation)) {
    throw new FraudInvestigationRefusedError(input.claimCaseId, 'missing_alive_confirmation', 'how the member was confirmed alive');
  }
  const db = bindScopedDb(client);

  // (1) ONE unlocked read, then the closure core's keys in ITS order, then the row.
  const [pre] = await db
    .select({ claimCaseId: claims.claimCaseId, deceasedMemberId: claims.deceasedMemberId })
    .from(claims)
    .where(and(eq(claims.pariwarId, input.pariwarId), eq(claims.claimCaseId, input.claimCaseId)))
    .limit(1);
  if (!pre) throw new FraudInvestigationRefusedError(input.claimCaseId, 'claim_not_found', 'no such claim');
  await client.query('SELECT pg_advisory_xact_lock($1)', [intakeAdvisoryLockKey(input.pariwarId, pre.deceasedMemberId).toString()]);
  await takeClaimClosureKeys(client, input.pariwarId, pre.claimCaseId);
  const row = await lockClaimRow(db, input.pariwarId, pre.claimCaseId);
  if (!row || !sameId(row.deceasedMemberId, pre.deceasedMemberId)) {
    throw new FraudInvestigationRefusedError(input.claimCaseId, 'claim_not_found', 'no such claim');
  }

  // (2) Replay first, then the chain.
  const steps = await readSteps(db, input.pariwarId, row.claimCaseId);
  const same = steps.find((s) => sameId(s.stepId, input.stepId));
  if (same) {
    if (same.step !== FOUND_STEP[input.outcome] || same.findingId === null) {
      throw new FraudInvestigationRefusedError(input.claimCaseId, 'step_conflict', 'that step id was used for a different step');
    }
    // ⛔ The step id alone is not the replay key (R2-4): a different finding id would return the ORIGINAL finding and drop
    // the request's id, note and proof; a different actor would be answered 200 before `finder_is_flagger`, unaudited.
    if (!sameId(same.findingId, input.findingId)) {
      throw new FraudInvestigationRefusedError(input.claimCaseId, 'step_conflict', 'that step id was used for a different finding');
    }
    if (!sameId(same.actorId, input.actorId)) {
      throw new FraudInvestigationRefusedError(input.claimCaseId, 'step_conflict', 'that step id was used by another actor');
    }
    return replayFinding(db, input, row, same.stepId, same.findingId);
  }
  const flag = steps.find((s) => s.step === 'flagged');
  if (!flag) throw new FraudInvestigationRefusedError(input.claimCaseId, 'not_flagged', 'a finding needs a flag first');
  if (steps.some((s) => s.step === 'found_innocent' || s.step === 'found_guilty')) {
    throw new FraudInvestigationRefusedError(input.claimCaseId, 'already_found', 'one investigation per claim, ever');
  }
  if (sameId(flag.actorId, input.actorId)) {
    throw new FraudInvestigationRefusedError(input.claimCaseId, 'finder_is_flagger', 'the person who flagged cannot record the finding');
  }

  // (4) The member finding — the kind-spelling writers live in `nominee-lock.ts` (the fence, TR2).
  const findingInput = {
    claimCaseId: row.claimCaseId,
    pariwarId: input.pariwarId,
    findingId: input.findingId,
    actorId: input.actorId,
    actorDisplay: input.actorDisplay,
    actor: input.actor,
  };
  let annotation: { eventVersion: number; replayed: boolean };
  try {
    annotation =
      input.outcome === 'innocent'
        ? await recordMemberInnocenceFinding(client, findingInput)
        : await recordMemberGuiltFinding(client, findingInput);
  } catch (err) {
    // A member finding recorded OUTSIDE this investigation (a seeded row) — the claim is found already.
    if (err instanceof ClaimNomineeFindingRefusedError && err.reason === 'duplicate') {
      throw new FraudInvestigationRefusedError(input.claimCaseId, 'already_found', 'this claim already carries a member finding');
    }
    throw err;
  }
  if (annotation.replayed) {
    throw new FraudInvestigationRefusedError(input.claimCaseId, 'already_found', 'this finding id is already recorded on this claim');
  }

  // (5) The found step.
  try {
    await db.insert(claimFraudInvestigationSteps).values({
      stepId: input.stepId,
      claimCaseId: row.claimCaseId,
      pariwarId: input.pariwarId,
      deceasedMemberId: row.deceasedMemberId,
      step: FOUND_STEP[input.outcome],
      findingId: input.findingId,
      aliveConfirmation: input.aliveConfirmation,
      noteCiphertext: input.noteCiphertext,
      actorId: input.actorId,
      actorDisplay: input.actorDisplay,
    });
  } catch (err) {
    if (isStepIdCollision(err)) throw new FraudInvestigationRefusedError(input.claimCaseId, 'step_conflict', 'that step id is already used');
    throw err;
  }

  // (6) Close a closable claim through the closure core.
  const closed = await closeClaimOnFraudFinding(client, {
    pariwarId: input.pariwarId,
    claimCaseId: row.claimCaseId,
    trigger: CLOSE_TRIGGER[input.outcome],
    findingId: input.findingId,
    actor: input.actor,
    actorId: input.actorId,
    ...(input.auditId !== undefined ? { auditId: input.auditId } : {}),
  });
  const otherStandingClaims = await listStandingDeathReports(db, input.pariwarId, row.deceasedMemberId, {
    excludeClaimCaseId: row.claimCaseId,
  });
  return {
    stepId: input.stepId,
    findingId: input.findingId,
    outcome: input.outcome,
    deceasedMemberId: row.deceasedMemberId,
    close: closed.closed ? { closed: true } : { closed: false, reason: closed.reason },
    eventVersion: closed.closed ? closed.eventVersion : annotation.eventVersion,
    otherStandingClaims,
    replayed: false,
  };
}

/** The ORIGINAL result of a finding already recorded under this step id — read back, ⛔ written. */
async function replayFinding(
  db: Db,
  input: RecordFraudFindingInput,
  row: ClaimRow,
  stepId: ClaimFraudInvestigationStepId,
  findingId: ClaimNomineeFindingId,
): Promise<RecordFraudFindingResult> {
  const closedVersion = await eventVersionOf(db, row.claimCaseId, 'claim.closed', 'finding_id', findingId);
  const annotationVersion = await eventVersionOf(db, row.claimCaseId, FINDING_ANNOTATION[input.outcome], 'finding_id', findingId);
  const eventVersion = closedVersion ?? annotationVersion;
  if (eventVersion === null) throw new Error(`[fraud-investigation] finding ${findingId} is recorded but its events are missing`);
  const otherStandingClaims = await listStandingDeathReports(db, input.pariwarId, row.deceasedMemberId, {
    excludeClaimCaseId: row.claimCaseId,
  });
  return {
    stepId,
    findingId,
    outcome: input.outcome,
    deceasedMemberId: row.deceasedMemberId,
    close:
      closedVersion !== null
        ? { closed: true }
        : { closed: false, reason: row.currentState === 'closed' ? 'already_closed' : 'committed' },
    eventVersion,
    otherStandingClaims,
    replayed: true,
  };
}

// ── The console read (DL7) ──────────────────────────────────────────────────────────────────────────

/** One step of a claim's investigation as stored — the note is CIPHERTEXT (the boundary decrypts, or withholds). */
export interface FraudInvestigationStepRecord {
  readonly stepId: ClaimFraudInvestigationStepId;
  readonly step: FraudInvestigationStep;
  readonly aliveConfirmation: FraudAliveConfirmation | null;
  readonly noteCiphertext: string;
  readonly actorId: string;
  readonly actorDisplay: string;
  readonly actedAt: Date;
}

/** ⭐ DL7 — the claim's investigation steps, in order (flag first). At most two rows exist per claim: the flag, then ONE found step (the two unique indexes). */
export async function listFraudInvestigationSteps(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
): Promise<readonly FraudInvestigationStepRecord[]> {
  const rows = await readSteps(db, pariwarId, claimCaseId);
  const order: Record<FraudInvestigationStep, number> = { flagged: 0, found_innocent: 1, found_guilty: 1 };
  return [...rows]
    .sort((a, b) => order[a.step] - order[b.step])
    .map((r) => ({
      stepId: r.stepId,
      step: r.step,
      aliveConfirmation: r.aliveConfirmation,
      noteCiphertext: r.noteCiphertext,
      actorId: r.actorId,
      actorDisplay: r.actorDisplay,
      actedAt: r.actedAt,
    }));
}
