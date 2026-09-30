// The correction-return CHASE — "who must act", the reminder RUNS, and the ONE resolver — Story 6.19b (Task 2; AC2,
// AC16; `2026-09-28-265` D25/D26 as amended by `2026-09-29-266` §1, `-267` §1–§3/§5, `-268` §1–§2, `-269` §1–§3,
// `-270`, `-271`). Transport-free: ⛔ no HTTP, ⛔ no audit, ⛔ no decryption except through an explicit `crypto`.
//
// ── The mark (D25, `-258`) ──────────────────────────────────────────────────────────────────────────────────────
// ONE exported writer serves every writer of the mark: the Pariwar Admin's return (`must_act` in the return's
// transaction), the District Admin's change (key (7), a required note) and 6.19c's two (`-260` G2's keep, D27's "no
// correction needed"). It runs under the TRUSTEE advisory lock (the lock every return and vote takes) and writes
// against the LIVE return read under it — so a change cannot race a second return onto a superseded `decision_id`.
// ⭐ A SAME-VALUE row is recorded and leaves the run alone (G2's keep RE-STATES the mark); only a CHANGED value ends
// the open run (`mark_changed`) and opens the other kind with day 0 = the change's IST date — also when ⛔ no run is
// open (after day 90, or on an unmarked return): a switch to `family` gives the family a full 90 days (`-258` 1).
// `must_act.unchanged` is the District Admin ROUTE's refusal only (`refuseUnchanged`), ⛔ never the writer's rule.
//
// ── The runs (`-266` §1, `-267` §1/§3/§5) ───────────────────────────────────────────────────────────────────────
// ⭐ At most ONE open run per CLAIM. The opener first ends any open run of the claim (`superseded`), so a second
// return — by either path — leaves one. A `direction` run (6.19c's `restart_family_reminders`) is refused unless the
// latest mark is `family` (⛔ no family chase by direction in a staff case). ⭐ The HOLD HOOK (`-269` §3, `-271` §2):
// while a claim is escalated or under Super Admin review, a switch opens ⛔ no `family` run (only a direction does) and
// a switch to `staff` ends any open `direction` run and opens ⛔ no `staff` run. 6.19c owns the hold (its closures
// table) and FILLS the hook; until it lands ⛔ no claim can be held, so the default answers "not held".
// ⭐ `resubmitted` PAUSES a run — it never ends one (`-267` §3). A run ends only `superseded`, `day_90`,
// `mark_changed`, or `decided` (the exported end-run, which 6.19c's decisions call).
//
// ── The ONE resolver (`-267` §2, `-268` §2, `-271` §1) ──────────────────────────────────────────────────────────
// The latest mark; for the LIVE return the latest `family`/`direction` run and the latest `staff` run — OPEN OR
// ENDED (every run ends at day 90, exactly where 6.19c's gates begin); `familyPartDoneAt`; and, given `crypto`,
// each person's CURRENT number hash. 6.19c's closure gate CALLS it and ⛔ never re-derives a day 0 (a wrong day 0
// here is a wrong closure gate there).
//
// ⛔⛔ This module decides NOTHING about a claim (invariant 1): it writes the INPUTS 6.19c's closure predicate reads.
// ⛔ IMPORT DISCIPLINE: `state-trustee-decision-persist.ts` must ⛔ never import this module (the return's handler
// calls the mark writer in the SAME transaction instead) — a cycle here is the runtime-init trap typecheck cannot see.

import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import type pg from 'pg';

import { bindScopedDb, type Db } from '../db.js';
import type { FieldCryptoDeps } from '../encryption/field-classes.js';
import type { ClaimId, PariwarId, TrusteeDecisionId } from '../ids/index.js';
import { getNomineeVersionsByIds } from '../nominee/declaration-history.js';
import {
  type ClaimCorrectionMarkRow,
  type ClaimCorrectionRunRow,
  type CorrectionMarkRole,
  type CorrectionMustAct,
  type CorrectionReminderOutcome,
  type CorrectionRunEndReason,
  type CorrectionRunKind,
  claimCorrectionMarks,
  claimCorrectionRuns,
} from '../schema/claim_correction_chase.js';
import { claims } from '../schema/claims.js';
import {
  claimantLinkCountsFor,
  correctionChainOf,
  readClaimContact,
  readClaimContactAgreementState,
  readVersionChainIndex,
  type VersionChainIndex,
} from './claim-contact-check.js';
import { currentCorrectionNumberHash, type CorrectionMobileSource } from './correction-crypto.js';
import { istDateOf } from './correction-schedule.js';
import { getEffectiveNomineeDeclaration } from './nominee-effective.js';
import { getLatestNomineeNameCheck } from './nominee-name-check.js';
import {
  getLiveCorrectionReturn,
  readReturnAccountsRewrite,
  stateTrusteeDecisionAdvisoryLockKey,
} from './state-trustee-decision-persist.js';

// ── Typed errors (the route maps each to a stable 4xx) ─────────────────────────────────────────────────────────

/** 409 `must_act.no_live_return` — ⛔ no live return to mark. */
export class CorrectionMarkNoLiveReturnError extends Error {
  public readonly name = 'CorrectionMarkNoLiveReturnError';
  public constructor(public readonly claimCaseId: string) {
    super(`[correction-chase] claim ${claimCaseId} has no live correction return — the mark cannot be set`);
  }
}

/** 409 `must_act.unchanged` — the District Admin's route refuses a change to the value the mark already has. */
export class CorrectionMarkUnchangedError extends Error {
  public readonly name = 'CorrectionMarkUnchangedError';
  public constructor(
    public readonly claimCaseId: string,
    public readonly mustAct: CorrectionMustAct,
  ) {
    super(`[correction-chase] claim ${claimCaseId} is already marked '${mustAct}'`);
  }
}

/** 409 — a non-return mark change needs a note (the DB's own `claim_correction_marks_note_required_check`). */
export class CorrectionMarkNoteRequiredError extends Error {
  public readonly name = 'CorrectionMarkNoteRequiredError';
  public constructor(public readonly claimCaseId: string) {
    super(`[correction-chase] claim ${claimCaseId}: a note is required for a non-return mark change`);
  }
}

/** 409 — a `direction` run is refused unless the latest mark is `family` (`-267` §5a). */
export class CorrectionDirectionRunRefusedError extends Error {
  public readonly name = 'CorrectionDirectionRunRefusedError';
  public constructor(public readonly claimCaseId: string) {
    super(`[correction-chase] claim ${claimCaseId}: a direction run needs the latest mark to be 'family'`);
  }
}

/** 409 — the caller's `returnDecisionId` is ⛔ not the claim's current LIVE return (it raced a second return). */
export class CorrectionRunReturnNotLiveError extends Error {
  public readonly name = 'CorrectionRunReturnNotLiveError';
  public constructor(public readonly claimCaseId: string) {
    super(`[correction-chase] claim ${claimCaseId}: the given return is ⛔ not the live one`);
  }
}

// ── The trustee lock (the one every return and vote takes) ─────────────────────────────────────────────────────

/** Take the claim's trustee advisory lock (transaction-scoped; re-entrant within the transaction). */
export async function acquireCorrectionChaseLock(
  client: pg.PoolClient,
  pariwarId: string,
  claimCaseId: string,
): Promise<void> {
  await client.query('SELECT pg_advisory_xact_lock($1)', [
    stateTrusteeDecisionAdvisoryLockKey(pariwarId, claimCaseId).toString(),
  ]);
}

// ── The hold hook (`-269` §3, `-271` §2) ───────────────────────────────────────────────────────────────────────

/**
 * Is the claim escalated after a declined closure, or under Super Admin review? ⭐ 6.19c FILLS this (its closures
 * table holds the escalation); until it lands ⛔ no claim can be escalated or held, so the default is "not held".
 * Injectable so the rule is provable today.
 */
export type CorrectionHoldCheck = (db: Db, pariwarId: PariwarId, claimCaseId: ClaimId) => Promise<boolean>;

export const noCorrectionHold: CorrectionHoldCheck = () => Promise.resolve(false);

// ── Views ──────────────────────────────────────────────────────────────────────────────────────────────────────

export interface CorrectionMarkView {
  readonly markId: string;
  readonly returnDecisionId: string;
  readonly mustAct: CorrectionMustAct;
  readonly isReturnMark: boolean;
  readonly setByActor: string;
  readonly setByActorDisplay: string;
  readonly setByRole: CorrectionMarkRole;
  readonly setAt: Date;
  /** ⛔ Ciphertext AS STORED — decrypted only by an authorized caller. */
  readonly noteCiphertext: string | null;
}

export interface CorrectionRunView {
  readonly runId: string;
  readonly claimCaseId: string;
  readonly returnDecisionId: string;
  readonly kind: CorrectionRunKind;
  readonly anchorId: string;
  /** IST calendar date `YYYY-MM-DD`. */
  readonly day0: string;
  readonly openedAt: Date;
  readonly endedAt: Date | null;
  readonly endReason: CorrectionRunEndReason | null;
}

function markView(r: ClaimCorrectionMarkRow): CorrectionMarkView {
  return {
    markId: r.markId,
    returnDecisionId: r.returnDecisionId,
    mustAct: r.mustAct,
    isReturnMark: r.isReturnMark,
    setByActor: r.setByActor,
    setByActorDisplay: r.setByActorDisplay,
    setByRole: r.setByRole,
    setAt: r.setAt,
    noteCiphertext: r.noteCiphertext ?? null,
  };
}

function runView(r: ClaimCorrectionRunRow): CorrectionRunView {
  return {
    runId: r.runId,
    claimCaseId: r.claimCaseId,
    returnDecisionId: r.returnDecisionId,
    kind: r.kind,
    anchorId: r.anchorId,
    day0: r.day0,
    openedAt: r.openedAt,
    endedAt: r.endedAt ?? null,
    endReason: r.endReason ?? null,
  };
}

// ── Reads ──────────────────────────────────────────────────────────────────────────────────────────────────────

/** The LATEST mark of a return (the latest row wins, D25), or `null`. */
export async function readLatestCorrectionMark(
  db: Db,
  pariwarId: PariwarId,
  returnDecisionId: string,
): Promise<CorrectionMarkView | null> {
  const [row] = await db
    .select()
    .from(claimCorrectionMarks)
    .where(
      and(
        eq(claimCorrectionMarks.pariwarId, pariwarId),
        eq(claimCorrectionMarks.returnDecisionId, returnDecisionId as TrusteeDecisionId),
      ),
    )
    .orderBy(desc(claimCorrectionMarks.setAt), desc(claimCorrectionMarks.markId))
    .limit(1);
  return row ? markView(row) : null;
}

/** The claim's OPEN run (⭐ at most one, `-267` §1), or `null`. */
export async function readOpenCorrectionRun(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
): Promise<CorrectionRunView | null> {
  const [row] = await db
    .select()
    .from(claimCorrectionRuns)
    .where(
      and(
        eq(claimCorrectionRuns.pariwarId, pariwarId),
        eq(claimCorrectionRuns.claimCaseId, claimCaseId),
        isNull(claimCorrectionRuns.endedAt),
      ),
    )
    .limit(1);
  return row ? runView(row) : null;
}

/** One run by id, in this Pariwar, or `null`. */
export async function readCorrectionRun(db: Db, pariwarId: PariwarId, runId: string): Promise<CorrectionRunView | null> {
  const [row] = await db
    .select()
    .from(claimCorrectionRuns)
    .where(and(eq(claimCorrectionRuns.pariwarId, pariwarId), eq(claimCorrectionRuns.runId, runId)))
    .limit(1);
  return row ? runView(row) : null;
}

/** The latest run of each of `kinds` for one RETURN, open or ended (by `opened_at`). */
async function readLatestRunOfKinds(
  db: Db,
  pariwarId: PariwarId,
  returnDecisionId: string,
  kinds: readonly CorrectionRunKind[],
): Promise<CorrectionRunView | null> {
  const [row] = await db
    .select()
    .from(claimCorrectionRuns)
    .where(
      and(
        eq(claimCorrectionRuns.pariwarId, pariwarId),
        eq(claimCorrectionRuns.returnDecisionId, returnDecisionId as TrusteeDecisionId),
        inArray(claimCorrectionRuns.kind, [...kinds]),
      ),
    )
    .orderBy(desc(claimCorrectionRuns.openedAt), desc(claimCorrectionRuns.runId))
    .limit(1);
  return row ? runView(row) : null;
}

// ── The run opener and end-run (exported: 6.19c calls both) ────────────────────────────────────────────────────

/** End the claim's open run, if any, with `reason`. Returns the ended run, or `null` when none was open. */
async function endOpenRunOfClaim(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
  reason: CorrectionRunEndReason,
): Promise<CorrectionRunView | null> {
  const rows = await db
    .update(claimCorrectionRuns)
    .set({ endedAt: sql`clock_timestamp()`, endReason: reason })
    .where(
      and(
        eq(claimCorrectionRuns.pariwarId, pariwarId),
        eq(claimCorrectionRuns.claimCaseId, claimCaseId),
        isNull(claimCorrectionRuns.endedAt),
      ),
    )
    .returning();
  return rows[0] ? runView(rows[0]) : null;
}

export interface OpenCorrectionRunInput {
  readonly pariwarId: PariwarId;
  readonly claimCaseId: ClaimId;
  readonly returnDecisionId: string;
  readonly kind: CorrectionRunKind;
  /** The mark (family / staff) or the direction (6.19c) that opens it. */
  readonly anchorId: string;
  /** IST calendar date. ⛔ Nothing is sent on it (G4). */
  readonly day0: string;
}

/**
 * ⭐ THE RUN OPENER (exported — 6.19c's `restart_family_reminders` direction calls it). Under the trustee lock:
 * re-derives the LIVE return (⛔ never trusts the caller's `returnDecisionId` — mirrors `writeCorrectionMark`'s own
 * discipline, so a change cannot race a second return onto a superseded `decision_id`); a `direction` run is refused
 * unless the latest mark of the return is `family` (`-267` §5a); any open run of the claim is ended `superseded`
 * FIRST (`-267` §1 — so a second return, by either path, leaves one run); then the new run.
 * @throws CorrectionRunReturnNotLiveError    the given return is ⛔ not the claim's live one (→ 409)
 * @throws CorrectionDirectionRunRefusedError a `direction` run while the mark is ⛔ not `family` (→ 409)
 */
export async function openCorrectionRun(client: pg.PoolClient, input: OpenCorrectionRunInput): Promise<CorrectionRunView> {
  await acquireCorrectionChaseLock(client, input.pariwarId, input.claimCaseId);
  const db = bindScopedDb(client);
  const liveReturn = await getLiveCorrectionReturn(db, input.pariwarId, input.claimCaseId);
  if (!liveReturn || liveReturn.decisionId !== input.returnDecisionId) {
    throw new CorrectionRunReturnNotLiveError(input.claimCaseId);
  }
  if (input.kind === 'direction') {
    const mark = await readLatestCorrectionMark(db, input.pariwarId, input.returnDecisionId);
    if (mark?.mustAct !== 'family') throw new CorrectionDirectionRunRefusedError(input.claimCaseId);
  }
  return openRunLocked(db, input);
}

async function openRunLocked(db: Db, input: OpenCorrectionRunInput): Promise<CorrectionRunView> {
  await endOpenRunOfClaim(db, input.pariwarId, input.claimCaseId, 'superseded');
  const [row] = await db
    .insert(claimCorrectionRuns)
    .values({
      claimCaseId: input.claimCaseId,
      pariwarId: input.pariwarId,
      returnDecisionId: input.returnDecisionId as TrusteeDecisionId,
      kind: input.kind,
      anchorId: input.anchorId,
      day0: input.day0,
    })
    .returning();
  return runView(row!);
}

/**
 * ⭐ END-RUN (exported — 6.19c's decisions call it with `decided`; the sweep with `day_90` / `superseded`). On an
 * already-ended run it is a NO-OP (returns `false`). ⛔ Never re-opens a run.
 */
export async function endCorrectionRun(
  client: pg.PoolClient,
  input: {
    readonly pariwarId: PariwarId;
    readonly claimCaseId: ClaimId;
    readonly runId: string;
    readonly reason: CorrectionRunEndReason;
  },
): Promise<boolean> {
  await acquireCorrectionChaseLock(client, input.pariwarId, input.claimCaseId);
  const db = bindScopedDb(client);
  const rows = await db
    .update(claimCorrectionRuns)
    .set({ endedAt: sql`clock_timestamp()`, endReason: input.reason })
    .where(
      and(
        eq(claimCorrectionRuns.pariwarId, input.pariwarId),
        eq(claimCorrectionRuns.runId, input.runId),
        isNull(claimCorrectionRuns.endedAt),
      ),
    )
    .returning({ runId: claimCorrectionRuns.runId });
  return rows.length > 0;
}

// ── The mark writer (exported — the return, the District Admin's change, 6.19c's two) ─────────────────────────

export interface WriteCorrectionMarkInput {
  readonly pariwarId: PariwarId;
  readonly claimCaseId: ClaimId;
  readonly mustAct: CorrectionMustAct;
  readonly actorId: string;
  /** The acting staff member's display name, snapshotted ([[project_admin_display_name_attribution]]). */
  readonly actorDisplay: string;
  /** The role whose grant authorised the act (`matchingGrantRole`, `-270`). */
  readonly setByRole: CorrectionMarkRole;
  /** ⛔ Ciphertext — required on every row except the return's own. */
  readonly noteCiphertext: string | null;
  /** The return's own mark, written in the return's transaction (its note is the return's rationale). */
  readonly isReturnMark?: boolean;
  /** The District Admin's ROUTE only: refuse a change to the value the mark already has (409 `must_act.unchanged`). */
  readonly refuseUnchanged?: boolean;
  /** The instant the day 0 of a newly opened run is taken from (the mark's own time by default). */
  readonly now?: Date;
  /** 6.19c's hold (`-269` §3, `-271` §2). Default: ⛔ not held. */
  readonly hold?: CorrectionHoldCheck;
}

export interface WriteCorrectionMarkResult {
  readonly mark: CorrectionMarkView;
  /** True when the value differs from the previous latest mark (or there was none). */
  readonly changed: boolean;
  readonly endedRun: CorrectionRunView | null;
  readonly openedRun: CorrectionRunView | null;
}

/**
 * ⭐ THE MARK WRITER. Under the trustee lock, against the LIVE return read under it: records the mark, and — only when
 * the value CHANGES (or this is the return's first mark) — ends the claim's open run (`mark_changed`; a first mark on
 * a new return supersedes the previous return's run) and opens the run the mark calls for, day 0 = the mark's IST
 * date, unless the hold hook says the claim is held (then a switch opens ⛔ no family and ⛔ no staff run, and a
 * switch to `staff` ends an open `direction` run).
 * @throws CorrectionMarkNoLiveReturnError  ⛔ no live return (→ 409 `must_act.no_live_return`)
 * @throws CorrectionMarkUnchangedError     `refuseUnchanged` and the value is the same (→ 409 `must_act.unchanged`)
 * @throws CorrectionMarkNoteRequiredError  a non-return mark with ⛔ no note (→ 409 `must_act.note_required`)
 */
export async function writeCorrectionMark(
  client: pg.PoolClient,
  input: WriteCorrectionMarkInput,
): Promise<WriteCorrectionMarkResult> {
  await acquireCorrectionChaseLock(client, input.pariwarId, input.claimCaseId);
  const db = bindScopedDb(client);

  const liveReturn = await getLiveCorrectionReturn(db, input.pariwarId, input.claimCaseId);
  if (!liveReturn) throw new CorrectionMarkNoLiveReturnError(input.claimCaseId);

  const previous = await readLatestCorrectionMark(db, input.pariwarId, liveReturn.decisionId);
  if (input.refuseUnchanged === true && previous?.mustAct === input.mustAct) {
    throw new CorrectionMarkUnchangedError(input.claimCaseId, input.mustAct);
  }
  if (input.isReturnMark !== true && input.noteCiphertext === null) {
    throw new CorrectionMarkNoteRequiredError(input.claimCaseId);
  }

  const [row] = await db
    .insert(claimCorrectionMarks)
    .values({
      claimCaseId: input.claimCaseId,
      pariwarId: input.pariwarId,
      returnDecisionId: liveReturn.decisionId,
      mustAct: input.mustAct,
      isReturnMark: input.isReturnMark === true,
      setByActor: input.actorId,
      setByActorDisplay: input.actorDisplay,
      setByRole: input.setByRole,
      noteCiphertext: input.noteCiphertext,
    })
    .returning();
  const mark = markView(row!);

  // ⭐ A same-value row is RECORDED and leaves the open run untouched (G2's keep re-states the mark).
  const changed = previous === null || previous.mustAct !== input.mustAct;
  if (!changed) return { mark, changed, endedRun: null, openedRun: null };

  const held = await (input.hold ?? noCorrectionHold)(db, input.pariwarId, input.claimCaseId);
  const open = await readOpenCorrectionRun(db, input.pariwarId, input.claimCaseId);
  const day0 = istDateOf(input.now ?? mark.setAt);

  if (held) {
    // `-269` §3 / `-271` §2 — the claim is with the Super Admin: ⛔ no family run on a switch (only a direction
    // opens one), and a switch to `staff` ends an open direction run and opens ⛔ no staff run.
    // ⭐ Whatever the switch, an open run from an EARLIER return is stale (a second return landed while held) and
    // must still close — "at most one open run per claim" holds regardless of hold state.
    let endedRun: CorrectionRunView | null = null;
    if (open !== null && open.returnDecisionId !== liveReturn.decisionId) {
      endedRun = await endOpenRunOfClaim(db, input.pariwarId, input.claimCaseId, 'superseded');
    } else if (input.mustAct === 'staff' && open?.kind === 'direction') {
      endedRun = await endOpenRunOfClaim(db, input.pariwarId, input.claimCaseId, 'mark_changed');
    }
    return { mark, changed, endedRun, openedRun: null };
  }

  // A run of the SAME return ends `mark_changed`; one of an EARLIER return is `superseded`. Ended HERE (⛔ not left
  // to `openRunLocked`'s own unconditional close) so the reported `endedRun` matches what actually happened —
  // `openRunLocked`'s internal end-call becomes a harmless no-op once this has already closed it.
  const endedRun =
    open === null
      ? null
      : await endOpenRunOfClaim(
          db,
          input.pariwarId,
          input.claimCaseId,
          open.returnDecisionId === liveReturn.decisionId ? 'mark_changed' : 'superseded',
        );
  const openedRun = await openRunLocked(db, {
    pariwarId: input.pariwarId,
    claimCaseId: input.claimCaseId,
    returnDecisionId: liveReturn.decisionId,
    kind: input.mustAct,
    anchorId: mark.markId,
    day0,
  });
  return { mark, changed, endedRun, openedRun };
}

// ── "The family's part is done" (`-268` §1 as superseded by `-269` §1) ─────────────────────────────────────────

/**
 * ⭐ THE ONE READER of *"the family's part is done"* for a live return: (a) ≥ 1 bank account and EVERY account
 * rewritten after the return (the SAME accounts leg `isReturnedClaimResubmitted` uses), AND (b) the LATEST name check
 * recorded after the latest of those rewrites is ⛔ not `does_not_match` (⛔ no check yet counts as ⛔ not). Returns the
 * latest rewrite's time, or `null`. DERIVED — ⛔ no table. 6.19c's closure guard calls it too.
 * ⚠ It moves one way within a return except by (b): only a staff-recorded `does_not_match` after the rewrite makes
 * it false again, and the family's next rewrite makes it true again.
 */
export async function readFamilyPartDoneAt(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
  returnedAt: Date,
): Promise<Date | null> {
  const rewrite = await readReturnAccountsRewrite(db, pariwarId, claimCaseId, returnedAt);
  if (!rewrite.allRewritten || rewrite.latestRewriteAt === null) return null;
  const latestCheck = await getLatestNomineeNameCheck(db, pariwarId, claimCaseId);
  if (latestCheck !== null && latestCheck.checkedAt.getTime() > rewrite.latestRewriteAt.getTime()) {
    if (latestCheck.accounts.some((a) => a.verdict === 'does_not_match')) return null;
  }
  return rewrite.latestRewriteAt;
}

// ── The recipients (AC3, D30, T12) ─────────────────────────────────────────────────────────────────────────────

/** D30 — why the family cannot be reminded (the queue's "cannot remind" reason). */
export type CorrectionCannotRemindReason = 'undetermined' | 'no_contact_record' | 'agreement_not_live';

/** One person the family run must reach. ⛔ No name. */
export interface CorrectionPerson {
  /** `nominee:<correction-chain ROOT of the version>` | `claimant` — stable across a 6.20 correction. */
  readonly personKey: string;
  readonly role: 'nominee' | 'claimant';
  /** The effective rank (nominees only). */
  readonly rank: 1 | 2 | null;
  /** The EFFECTIVE version (nominees), or `null` (the claimant block). */
  readonly versionId: string | null;
  /** ⛔ Ciphertext AS STORED (null = a vacated version: ⛔ no sendable number). */
  readonly mobileCiphertext: string | null;
  readonly mobileSource: CorrectionMobileSource;
}

export interface CorrectionRecipients {
  /** `null` when the family can be reminded; else D30's reason (⛔ no family send at all). */
  readonly cannotRemind: CorrectionCannotRemindReason | null;
  /** `-267` §5c — the claimant is linked to a version that resolves to ⛔ no effective nominee: flags the claimant ALONE. */
  readonly claimantUnresolved: boolean;
  /** Empty when `cannotRemind` is set. */
  readonly people: readonly CorrectionPerson[];
  /** `hi` | `en` — the SMS language (W9); `hi` when there is ⛔ no record. */
  readonly contactLocale: 'hi' | 'en';
}

/** The stable key of a nominee version: the ROOT of its correction chain (the version it was first declared as). */
export function nomineePersonKey(versionId: string, index: VersionChainIndex): string {
  const chain = correctionChainOf(versionId, index);
  return `nominee:${chain[chain.length - 1]!}`;
}

/**
 * ⭐ WHO MUST BE REACHED (AC3, T12): each EFFECTIVE nominee (resolved per `versionId` — the as-at-death declaration,
 * ⛔ never the current rows) and the claimant when the contact record's claimant side is the BLOCK. D30 first: an
 * effective declaration that is ⛔ not `effective`, ⛔ no contact record, or an agreement ⛔ not `live` ⇒ nobody.
 * Reads only; ⛔ nothing decrypted.
 */
export async function readCorrectionRecipients(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
): Promise<CorrectionRecipients> {
  const effective = await getEffectiveNomineeDeclaration(db, pariwarId, claimCaseId);
  const snapshot = await readClaimContact(db, pariwarId, claimCaseId);
  const locale = snapshot.contact?.contactLocale ?? 'hi';
  const none = (reason: CorrectionCannotRemindReason): CorrectionRecipients => ({
    cannotRemind: reason,
    claimantUnresolved: false,
    people: [],
    contactLocale: locale,
  });
  if (effective.status !== 'effective') return none('undetermined');
  if (snapshot.contact === null) return none('no_contact_record');
  const agreement = await readClaimContactAgreementState(db, pariwarId, snapshot.contact.agreementConsentId);
  if (agreement !== 'live') return none('agreement_not_live');

  const index = await readVersionChainIndex(db, pariwarId, effective.deceasedMemberId);
  const versions = await getNomineeVersionsByIds(
    db,
    pariwarId,
    effective.entries.map((e) => e.versionId as string),
  );
  const byId = new Map(versions.map((v) => [v.versionId as string, v]));
  const people: CorrectionPerson[] = effective.entries.map((e) => ({
    personKey: nomineePersonKey(e.versionId as string, index),
    role: 'nominee' as const,
    rank: e.rank,
    versionId: e.versionId as string,
    mobileCiphertext: byId.get(e.versionId as string)?.mobileCiphertext ?? null,
    mobileSource: 'member_nominee' as const,
  }));

  let claimantUnresolved = false;
  const claimantVersion = snapshot.contact.claimantNomineeVersionId as string | null;
  if (claimantVersion === null) {
    // The claimant is none of the nominees — the block is their own recipient.
    people.push({
      personKey: 'claimant',
      role: 'claimant',
      rank: null,
      versionId: null,
      mobileCiphertext: snapshot.contact.claimantMobileCiphertext ?? null,
      mobileSource: 'claim_contact',
    });
  } else {
    claimantUnresolved = !effective.entries.some((e) =>
      claimantLinkCountsFor(claimantVersion, e.versionId as string, index),
    );
  }
  return { cannotRemind: null, claimantUnresolved, people, contactLocale: locale };
}

// ── A person's per-run state (D4, D20, D21, `-271` §1) — PURE ──────────────────────────────────────────────────

/** A person's `family_sms` rows in one run, as the state evaluator needs them. */
export interface PersonReminderRow {
  readonly slotDay: number;
  readonly sentOn: string;
  readonly outcome: CorrectionReminderOutcome;
  readonly recipientVersionId: string | null;
  readonly recipientNumberHash: string | null;
  readonly createdAt: Date;
}

/** A person's letters in one run. */
export interface PersonLetterRow {
  readonly sequence: number;
  readonly postedOn: string;
  readonly deliveredOn: string | null;
  readonly createdAt: Date;
}

export interface PersonRunState {
  /** The found-dead day (IST date) — the first dead / unreachable / no-target outcome of the CURRENT number. */
  readonly foundDeadOn: string | null;
  /** `dead` (`rejected_invalid_number`) or `unreachable` (`rejected_unreachable`, `no_target`). */
  readonly deadKind: 'dead' | 'unreachable' | null;
  /** A letter to them has a recorded delivery (in the current number's epoch) ⇒ their reminders stop (`-250` #1). */
  readonly letterDelivered: boolean;
  /** The first delivered letter's delivery date (D21's second-letter anchor), in the current epoch. */
  readonly firstDeliveredOn: string | null;
  /** True when the person's number changed since their last row (their per-run state was RESET). */
  readonly reset: boolean;
  /** The rows of the current number's epoch (for "reached" and the catch-up's recorded-day set). */
  readonly epochRows: readonly PersonReminderRow[];
}

const DEAD_OUTCOMES: ReadonlySet<CorrectionReminderOutcome> = new Set([
  'rejected_invalid_number',
  'rejected_unreachable',
  'no_target',
]);

/**
 * ⭐ A person's per-run state, from their rows and letters. The state is PER NUMBER (AC3): whenever a 6.20
 * correction changes the number behind the person's key, their found-dead marker and their "a delivered letter stops
 * reminders" stop RESET — a new number is reached afresh, ⛔ never silenced by the old number's history.
 * `currentNumberHash`: `undefined` = unknown (the version did ⛔ not change, so the latest row's hash stands);
 * a value (or `null` for "⛔ no sendable number") = the person's current number, compared with the latest row's.
 * ⚠ A correction that keeps the SAME number changes ⛔ nothing. Pure.
 */
export function evaluatePersonRunState(
  rows: readonly PersonReminderRow[],
  letters: readonly PersonLetterRow[],
  currentNumberHash?: string | null,
): PersonRunState {
  const attempted = [...rows]
    .filter((r) => r.outcome !== 'skipped_superseded' && r.outcome !== 'attempting')
    .sort((a, b) => a.slotDay - b.slotDay || a.createdAt.getTime() - b.createdAt.getTime());
  // The current epoch: the rows since the last change of number hash.
  let start = 0;
  for (let i = 1; i < attempted.length; i += 1) {
    if (attempted[i]!.recipientNumberHash !== attempted[i - 1]!.recipientNumberHash) start = i;
  }
  const last = attempted[attempted.length - 1];
  const reset = currentNumberHash !== undefined && last !== undefined && last.recipientNumberHash !== currentNumberHash;
  const epoch = reset ? [] : attempted.slice(start);
  // A letter counts for the epoch it was recorded in: ⛔ none after a reset, else those recorded since the epoch's
  // first row (a letter about an OLD number never silences the new one).
  const epochStart = epoch[0]?.createdAt ?? null;
  const epochLetters = reset
    ? []
    : letters.filter((l) => epochStart === null || l.createdAt.getTime() >= epochStart.getTime());

  const dead = epoch.find((r) => DEAD_OUTCOMES.has(r.outcome));
  const delivered = epochLetters
    .filter((l) => l.deliveredOn !== null)
    .sort((a, b) => a.sequence - b.sequence);
  return {
    foundDeadOn: dead?.sentOn ?? null,
    deadKind: dead === undefined ? null : dead.outcome === 'rejected_invalid_number' ? 'dead' : 'unreachable',
    letterDelivered: delivered.length > 0,
    firstDeliveredOn: delivered[0]?.deliveredOn ?? null,
    reset,
    epochRows: epoch,
  };
}

// ── THE ONE RESOLVER (AC16's export; `-267` §2, `-268` §2, `-271` §1) ──────────────────────────────────────────

export interface CorrectionChaseResolution {
  /** The claim's LIVE return, or `null` (⛔ no chase then). */
  readonly liveReturn: { readonly decisionId: string; readonly decidedAt: Date; readonly actorDisplay: string } | null;
  /** The latest mark of the live return, or `null` (an unmarked return — "who must act: not set"). */
  readonly mark: CorrectionMarkView | null;
  /** The latest `family` / `direction` run of the live return — OPEN OR ENDED. */
  readonly familyRun: CorrectionRunView | null;
  /** The latest `staff` run of the live return — OPEN OR ENDED. */
  readonly staffRun: CorrectionRunView | null;
  /** The claim's one open run (of any return), or `null`. */
  readonly openRun: CorrectionRunView | null;
  /** `-268` §2 — the latest rewrite's time while the family's part is done, else `null`. */
  readonly familyPartDoneAt: Date | null;
  /**
   * `-271` §1 — each person's CURRENT number hash (`null` = ⛔ no sendable number), by `personKey`. Present only when
   * the caller passed `crypto`; empty when the family cannot be reminded (D30).
   */
  readonly currentNumberHashes: ReadonlyMap<string, string | null> | null;
}

/**
 * ⭐ THE ONE RESOLVER. 6.19c's closure gate CALLS it — ⛔ never re-derives a day 0, a mark or "the family's part is
 * done". Reads only. With `crypto`, decrypts each person's mobile to hash it (⛔ the plaintext never leaves).
 */
export async function resolveCorrectionChase(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
  opts: { readonly crypto?: FieldCryptoDeps } = {},
): Promise<CorrectionChaseResolution> {
  const openRun = await readOpenCorrectionRun(db, pariwarId, claimCaseId);
  const ret = await getLiveCorrectionReturn(db, pariwarId, claimCaseId);
  if (!ret) {
    return {
      liveReturn: null,
      mark: null,
      familyRun: null,
      staffRun: null,
      openRun,
      familyPartDoneAt: null,
      currentNumberHashes: null,
    };
  }
  const mark = await readLatestCorrectionMark(db, pariwarId, ret.decisionId);
  const familyRun = await readLatestRunOfKinds(db, pariwarId, ret.decisionId, ['family', 'direction']);
  const staffRun = await readLatestRunOfKinds(db, pariwarId, ret.decisionId, ['staff']);
  const familyPartDoneAt = await readFamilyPartDoneAt(db, pariwarId, claimCaseId, ret.decidedAt);

  let currentNumberHashes: Map<string, string | null> | null = null;
  if (opts.crypto !== undefined) {
    currentNumberHashes = new Map();
    const recipients = await readCorrectionRecipients(db, pariwarId, claimCaseId);
    for (const p of recipients.people) {
      currentNumberHashes.set(
        p.personKey,
        await currentCorrectionNumberHash(p.mobileCiphertext, p.mobileSource, pariwarId, opts.crypto),
      );
    }
  }
  return {
    liveReturn: { decisionId: ret.decisionId, decidedAt: ret.decidedAt, actorDisplay: ret.actorDisplay },
    mark,
    familyRun,
    staffRun,
    openRun,
    familyPartDoneAt,
    currentNumberHashes,
  };
}

/** The claim row's deceased member and state (the sweep / child need both for `resolveClaimCorrectionState`). */
export async function readCorrectionClaimRow(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
): Promise<{ readonly deceasedMemberId: string; readonly currentState: string } | null> {
  const [row] = await db
    .select({ deceasedMemberId: claims.deceasedMemberId, currentState: claims.currentState })
    .from(claims)
    .where(and(eq(claims.pariwarId, pariwarId), eq(claims.claimCaseId, claimCaseId)))
    .limit(1);
  return row ?? null;
}

/**
 * D33 — the claim's SHORT REFERENCE: the first 8 hex characters of the lower-case claim id, upper-cased. The SAME
 * string the District Admin's queue shows and the family SMS carries (`-230` cl.1: *"use anything for reference if
 * name cannot be used"*) — ⛔ no name, ⛔ no member number. Pure.
 */
export function claimShortReference(claimCaseId: string): string {
  return claimCaseId.toLowerCase().replace(/-/g, '').slice(0, 8).toUpperCase();
}
