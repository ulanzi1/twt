// The RE-FILE GUARD after a closure for no response — Story 6.19c (Task 5; AC15; the shared spec's D19, T9;
// `2026-09-27-254`: a claim closed for silence may be filed again ONLY through a person — the District Admin or the
// helpline CONFIRMS, with a note; `2026-10-01-273` §9 — the member's routing bit).
//
// ⭐ KEYED ON THE CLOSURE (invariant 8, T9) — ⛔ never on `claim.denied_no_appeal`: a stage-3 uphold emits that too, and
// its family re-files freely. The guard applies when the death's MOST RECENT TERMINAL claim (`settled` / `denied`, by
// filing time) carries a `closed` closures row and ⛔ no UNCONSUMED confirmation exists for it.
// ⭐ BOTH mint paths call it (T9): `tryConverge`'s "no candidate" branch and `overrideIntakeAttempt` — each under the
// intake advisory lock it already holds, and the mint CONSUMES the confirmation in the same transaction.
// ⚠ Row `6-24` (`backlog`, `-261` D4 B, `-262` FQ5) edits the same convergence code: a suspicion refusal's new claim is
// kept apart and waits at final approval for the appeal — and FQ5's *"appeal allowed → the new claim is closed"* must
// ⛔ NEVER write a closures row (this guard keys on it). Leave this guard's key alone when 6-24 lands.
// Transport-free: ⛔ no HTTP, ⛔ no audit, ⛔ no decryption.

import { and, desc, eq, inArray, isNull, notInArray, sql } from 'drizzle-orm';
import type pg from 'pg';

import { bindScopedDb, type Db } from '../db.js';
import type { ClaimId, MemberId, PariwarId } from '../ids/index.js';
import {
  type ClaimRefileConfirmationRow,
  type RefileConfirmationVia,
  claimCorrectionClosures,
  claimRefileConfirmations,
} from '../schema/claim_correction_closure.js';
import { claims } from '../schema/claims.js';
import { intakeAdvisoryLockKey } from './icp-lock.js';
import { CLAIM_TERMINAL_STATES } from './read.js';

/** 409 `claim.refile_requires_confirmation` — mapped (⛔ never a 500) at the member, helpline and override handlers. */
export class RefileRequiresConfirmationError extends Error {
  public readonly name = 'RefileRequiresConfirmationError';
  public constructor(
    public readonly deceasedMemberId: string,
    public readonly closedClaimCaseId: string,
  ) {
    super(`[refile-guard] the death of ${deceasedMemberId} was closed for no response — a re-file needs a recorded confirmation`);
  }
}

/** A confirmation write is refused — the route maps `409 refile_confirmation.<code>` (`not_found` → 404). */
export type RefileConfirmationRefusal = 'not_found' | 'not_closed' | 'not_most_recent' | 'live_claim_exists' | 'already_confirmed';

export class RefileConfirmationRefusedError extends Error {
  public readonly name = 'RefileConfirmationRefusedError';
  public constructor(
    public readonly claimCaseId: string,
    public readonly refusal: RefileConfirmationRefusal,
  ) {
    super(`[refile-guard] claim ${claimCaseId}: ${refusal}`);
  }
}

/** The death's MOST RECENT terminal claim (by filing time), or `null`. */
async function mostRecentTerminalClaim(
  db: Db,
  pariwarId: PariwarId,
  deceasedMemberId: MemberId,
): Promise<{ readonly claimCaseId: ClaimId } | null> {
  const [row] = await db
    .select({ claimCaseId: claims.claimCaseId })
    .from(claims)
    .where(
      and(
        eq(claims.pariwarId, pariwarId),
        eq(claims.deceasedMemberId, deceasedMemberId),
        inArray(claims.currentState, [...CLAIM_TERMINAL_STATES]),
      ),
    )
    .orderBy(desc(claims.createdAt), desc(claims.claimCaseId))
    .limit(1);
  return row ? { claimCaseId: row.claimCaseId as ClaimId } : null;
}

/** Does the death have a LIVE (non-terminal) claim? */
async function hasLiveClaim(db: Db, pariwarId: PariwarId, deceasedMemberId: MemberId): Promise<boolean> {
  const rows = await db
    .select({ id: claims.claimCaseId })
    .from(claims)
    .where(
      and(
        eq(claims.pariwarId, pariwarId),
        eq(claims.deceasedMemberId, deceasedMemberId),
        notInArray(claims.currentState, [...CLAIM_TERMINAL_STATES]),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

/** The claim's `closed` closures row id, or `null`. */
async function closedClosureIdOf(db: Db, pariwarId: PariwarId, claimCaseId: ClaimId): Promise<string | null> {
  const [row] = await db
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
  return row?.id ?? null;
}

/** The UNCONSUMED confirmation for a closed claim, or `null`. */
async function openConfirmationOf(
  db: Db,
  pariwarId: PariwarId,
  closedClaimCaseId: ClaimId,
): Promise<ClaimRefileConfirmationRow | null> {
  const [row] = await db
    .select()
    .from(claimRefileConfirmations)
    .where(
      and(
        eq(claimRefileConfirmations.pariwarId, pariwarId),
        eq(claimRefileConfirmations.closedClaimCaseId, closedClaimCaseId),
        isNull(claimRefileConfirmations.consumedAt),
      ),
    )
    .limit(1);
  return row ?? null;
}

export interface RefileGuardState {
  /** The death's most recent terminal claim was CLOSED for no response. */
  readonly guarded: boolean;
  readonly closedClaimCaseId: ClaimId | null;
  /** The unconsumed confirmation that lets ONE mint through, else `null`. */
  readonly confirmationId: string | null;
}

/** ⭐ D19's guard, read-only: is the death guarded, and is a confirmation waiting? */
export async function readRefileGuard(
  db: Db,
  pariwarId: PariwarId,
  deceasedMemberId: MemberId,
): Promise<RefileGuardState> {
  const terminal = await mostRecentTerminalClaim(db, pariwarId, deceasedMemberId);
  if (terminal === null) return { guarded: false, closedClaimCaseId: null, confirmationId: null };
  if ((await closedClosureIdOf(db, pariwarId, terminal.claimCaseId)) === null) {
    return { guarded: false, closedClaimCaseId: null, confirmationId: null };
  }
  const confirmation = await openConfirmationOf(db, pariwarId, terminal.claimCaseId);
  return { guarded: true, closedClaimCaseId: terminal.claimCaseId, confirmationId: confirmation?.confirmationId ?? null };
}

/**
 * ⭐ `-273` §9 — the member's ROUTING BIT, exactly D19's guard: the death has ⛔ no live claim, its most recent terminal
 * claim was closed for no response, and ⛔ no unconsumed confirmation exists. ⛔ Never shown — it routes the claim-entry
 * gate to the calm "please call the helpline" state; once a confirmation is recorded (or consumed by a live new
 * claim) it is false, so the old pointer ⛔ never traps the family.
 */
export async function readRefileRequiresConfirmation(
  db: Db,
  pariwarId: PariwarId,
  deceasedMemberId: MemberId,
): Promise<boolean> {
  if (await hasLiveClaim(db, pariwarId, deceasedMemberId)) return false;
  const guard = await readRefileGuard(db, pariwarId, deceasedMemberId);
  return guard.guarded && guard.confirmationId === null;
}

/**
 * ⭐ THE MINT GUARD — call it INSIDE a mint path, under its intake advisory lock, BEFORE minting. A guarded death with
 * ⛔ no unconsumed confirmation ⇒ `RefileRequiresConfirmationError`; else returns the confirmation to CONSUME (or
 * `null` — the death is ⛔ guarded).
 */
export async function assertRefileAllowed(
  db: Db,
  pariwarId: PariwarId,
  deceasedMemberId: MemberId,
): Promise<string | null> {
  const guard = await readRefileGuard(db, pariwarId, deceasedMemberId);
  if (!guard.guarded) return null;
  if (guard.confirmationId === null) {
    throw new RefileRequiresConfirmationError(deceasedMemberId, guard.closedClaimCaseId!);
  }
  return guard.confirmationId;
}

/** CONSUME a confirmation by the claim the mint just created — in the mint's own transaction. */
export async function consumeRefileConfirmation(
  db: Db,
  pariwarId: PariwarId,
  confirmationId: string,
  newClaimCaseId: ClaimId,
): Promise<void> {
  const rows = await db
    .update(claimRefileConfirmations)
    .set({ consumedByClaimCaseId: newClaimCaseId, consumedAt: sql`clock_timestamp()` })
    .where(
      and(
        eq(claimRefileConfirmations.pariwarId, pariwarId),
        eq(claimRefileConfirmations.confirmationId, confirmationId),
        isNull(claimRefileConfirmations.consumedAt),
      ),
    )
    .returning({ id: claimRefileConfirmations.confirmationId });
  // ⛔ Two mints of one death are serialised by the intake lock, so a lost race here is a defect, ⛔ a 409.
  if (rows.length === 0) throw new Error(`[refile-guard] confirmation ${confirmationId} was already consumed`);
}

/**
 * ⭐ RECORD A RE-FILE CONFIRMATION (key (6), `-254`) — a person's confirmation, with a REQUIRED note, that the death of
 * a claim closed for no response may be filed again. Under the death's intake advisory lock (the mints'): the claim
 * must exist here (`not_found`), carry a `closed` closures row (`not_closed`), be the death's MOST RECENT terminal claim
 * (`not_most_recent`), the death must have ⛔ no live claim (`live_claim_exists`), and ⛔ no unconsumed confirmation may
 * already wait (`already_confirmed` — the partial UNIQUE is the backstop).
 */
export async function recordRefileConfirmation(
  client: pg.PoolClient,
  input: {
    readonly pariwarId: PariwarId;
    readonly closedClaimCaseId: ClaimId;
    readonly via: RefileConfirmationVia;
    readonly actorId: string;
    readonly actorDisplay: string;
    /** Tier-1 ciphertext of the REQUIRED note. */
    readonly noteCiphertext: string;
  },
): Promise<ClaimRefileConfirmationRow> {
  const db = bindScopedDb(client);
  const [claim] = await db
    .select({ deceasedMemberId: claims.deceasedMemberId })
    .from(claims)
    .where(and(eq(claims.pariwarId, input.pariwarId), eq(claims.claimCaseId, input.closedClaimCaseId)))
    .limit(1);
  if (!claim) throw new RefileConfirmationRefusedError(input.closedClaimCaseId, 'not_found');
  const deceasedMemberId = claim.deceasedMemberId as MemberId;
  await client.query('SELECT pg_advisory_xact_lock($1)', [intakeAdvisoryLockKey(input.pariwarId, deceasedMemberId).toString()]);
  const closureId = await closedClosureIdOf(db, input.pariwarId, input.closedClaimCaseId);
  if (closureId === null) throw new RefileConfirmationRefusedError(input.closedClaimCaseId, 'not_closed');
  const terminal = await mostRecentTerminalClaim(db, input.pariwarId, deceasedMemberId);
  if (terminal?.claimCaseId !== input.closedClaimCaseId) {
    throw new RefileConfirmationRefusedError(input.closedClaimCaseId, 'not_most_recent');
  }
  if (await hasLiveClaim(db, input.pariwarId, deceasedMemberId)) {
    throw new RefileConfirmationRefusedError(input.closedClaimCaseId, 'live_claim_exists');
  }
  if ((await openConfirmationOf(db, input.pariwarId, input.closedClaimCaseId)) !== null) {
    throw new RefileConfirmationRefusedError(input.closedClaimCaseId, 'already_confirmed');
  }
  const [row] = await db
    .insert(claimRefileConfirmations)
    .values({
      pariwarId: input.pariwarId,
      deceasedMemberId,
      closedClaimCaseId: input.closedClaimCaseId,
      closureId,
      via: input.via,
      confirmedByActor: input.actorId,
      confirmedByDisplay: input.actorDisplay,
      noteCiphertext: input.noteCiphertext,
    })
    .returning();
  return row!;
}
