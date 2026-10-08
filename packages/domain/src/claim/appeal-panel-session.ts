// The Stage-2 appeal PANEL SESSION's actor-free core — a LEAF (Story 6.24a, `2026-10-07-292` RF6 v1.3). Extracted from
// `cancelAppealPanel` so the suspicion-appeal closure writer (`suspicion-refusal-persist.ts`) can end a CLOSED claim's
// un-finalized panel with the system actor (the public writer's actor checks — on the panel, `appeal_final` once votes
// exist — would throw on the reversal and roll it back). `appeal-panel-persist.ts` re-exports all three; the public
// writer keeps its behaviour. Imports schema tables and types only (⛔ no runtime cycle).

import { and, eq, isNull, sql } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { ClaimId, PariwarId } from '../ids/index.js';
import {
  type ClaimAppealPanelSessionRow,
  claimAppealPanelSessions,
} from '../schema/claim_appeal_panel_sessions.js';
import { claimAppealPanelVotes } from '../schema/claim_appeal_panel_votes.js';

/** Thrown by cancel when the session is already superseded (409). */
export class AppealPanelSessionAlreadySupersededError extends Error {
  public readonly name = 'AppealPanelSessionAlreadySupersededError';
  public constructor(public readonly claimCaseId: string) {
    super(`[appeal-panel] claim ${claimCaseId}'s appeal panel session was already cancelled — reload and try again`);
  }
}

/** The claim's live (non-superseded) panel session, or undefined. Read under the caller's `appeal:` advisory lock. */
export async function readLiveAppealPanelSession(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
): Promise<ClaimAppealPanelSessionRow | undefined> {
  const rows = await db
    .select()
    .from(claimAppealPanelSessions)
    .where(
      and(
        eq(claimAppealPanelSessions.pariwarId, pariwarId),
        eq(claimAppealPanelSessions.claimCaseId, claimCaseId),
        isNull(claimAppealPanelSessions.supersededAt),
      ),
    )
    .limit(1);
  return rows[0];
}

/**
 * ⭐ Story 6.24a (`2026-10-07-292` RF6 v1.3) — the ACTOR-FREE CORE of `cancelAppealPanel`: supersede the session + all its
 * live votes (the supersession IS the audit trail). ⛔ No actor check here — those stay in the public writer, which keeps
 * its behaviour. The closure writer (`closeClaimsHeldBySuspicionAppeal`) calls it with the system actor, so a claim closed
 * mid-appeal leaves ⛔ no live panel behind. MUST run under the claim's `appeal:` advisory lock. 0 rows ⇒ a concurrent
 * cancel already won (→ `AppealPanelSessionAlreadySupersededError`).
 * ⚠ DELIBERATE (checklist family 9) — bypassing the public writer's actor checks is confined to a caller that already passed
 * its OWN human-actor gate in the same transaction (today ONE: the RF6 closure, inside a reversal writer behind its route's
 * appeal key). ⭐ Re-examine when a second caller is added, or when `cancelAppealPanel` gains a check that is ⛔ not about
 * WHO acts (code review round 2, 2026-10-08).
 */
export async function supersedeAppealPanelSession(
  db: Db,
  claimCaseId: ClaimId,
  sessionId: ClaimAppealPanelSessionRow['sessionId'],
): Promise<ClaimAppealPanelSessionRow> {
  const superseded = await db
    .update(claimAppealPanelSessions)
    .set({ supersededAt: sql`now()` })
    .where(and(eq(claimAppealPanelSessions.sessionId, sessionId), isNull(claimAppealPanelSessions.supersededAt)))
    .returning();
  if (superseded.length === 0) throw new AppealPanelSessionAlreadySupersededError(claimCaseId);

  await db
    .update(claimAppealPanelVotes)
    .set({ supersededAt: sql`now()` })
    .where(and(eq(claimAppealPanelVotes.sessionId, sessionId), isNull(claimAppealPanelVotes.supersededAt)));

  return superseded[0]!;
}
