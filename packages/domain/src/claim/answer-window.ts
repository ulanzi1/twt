// THE ANSWER WINDOW — "an approval of this claim is still to come" — ONE predicate (Story 6.27a PM8, Task 1;
// `2026-10-10-311` item 3, RATIFIED by `2026-10-12-324` A).
//
// ⭐ WHY THIS FILE EXISTS. 6.26a wrote this predicate as the ground-inspection WRITE window
// (`isClaimInGroundInspectionWindow`, `-283` A1): the claim's state is in `CLAIM_REVIEW_WINDOW_STATES`, or it is
// `state_trustee_approved` while the claim carries a live `routed_to_r9` routing row (R9 finalize still runs the approval
// gate there — a final approval is still to come). 6.27a needs the SAME set four more times — a neighbour's answer is
// taken (PM8), a reply is saved (PM7 (b)), a text may go (6.27c PM5 (iv)), the WhatsApp reminder may go (row 6-31) — so
// it moved here under a neutral name, and `ground-inspection-persist.ts` re-exports it under its old name (the SAME
// function — ⛔ never a copy, ⛔ never re-composed).
//
// Exported three ways:
//   · `isStateInAnswerWindow(state, liveRoutedToR9)` — the PURE decision (the parity legs read it);
//   · `isClaimInAnswerWindow(db, pariwarId, claimCaseId, currentState)` — the per-claim read (writers pass a state read
//     from the LOCKED claim row);
//   · `answerWindowSql(claimAlias)` — the set-based twin for a statement over many claims (the member list's "open",
//     the helpline list, 6.27c's sweep); a parity test holds it equal to the per-claim read for every state × routed /
//     not routed (⛔ never a hand-composed SQL copy).
//
// ⛔ IMPORT DISCIPLINE: `review-window.ts` (import-free) and `r9-routing.ts` (a leaf) only — ⛔ never into
// `review-window.ts` itself (its header requires it import-free), ⛔ never anything that reaches `claim/events.ts`.
// ⚠ `closed` (6.28 OP4 / OP13), `denied`, the appeal stages, `approved`, `settled` and `state_trustee_approved` WITHOUT a
// live R9 routing are OUTSIDE the window (F19 — the cycle-freeze commit never re-reads warnings).

import { type SQL, sql } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { ClaimId, PariwarId } from '../ids/index.js';
import { hasLiveRoutedRow, liveRoutedToR9Exists } from './r9-routing.js';
import { CLAIM_REVIEW_WINDOW_STATES } from './review-window.js';

/** The one state that is in the window ONLY while the claim carries a live R9 routing (`-283` A1; `-324` A). */
export const ANSWER_WINDOW_R9_STATE = 'state_trustee_approved' as const;

const IDENTIFIER = /^[a-z_][a-z0-9_]*$/;

/** The PURE decision: is a claim in `state` (with or without a live R9 routing) in the answer window? */
export function isStateInAnswerWindow(state: string, liveRoutedToR9: boolean): boolean {
  if ((CLAIM_REVIEW_WINDOW_STATES as readonly string[]).includes(state)) return true;
  return state === ANSWER_WINDOW_R9_STATE && liveRoutedToR9;
}

/**
 * True iff the claim is in the answer window. Read in the caller's tx; the R9 arm reads `hasLiveRoutedRow` only when
 * the state is `state_trustee_approved` (⛔ takes no lock — the writers hold the claim-row lock).
 */
export async function isClaimInAnswerWindow(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
  currentState: string,
): Promise<boolean> {
  if ((CLAIM_REVIEW_WINDOW_STATES as readonly string[]).includes(currentState)) return true;
  if (currentState === ANSWER_WINDOW_R9_STATE) return hasLiveRoutedRow(db, pariwarId, claimCaseId);
  return false;
}

/**
 * The answer window as a raw-SQL boolean over an OUTER claims row named `claimAlias` (a bare identifier — `claims` for an
 * unaliased `.from(claims)`, or a raw alias). Built from `CLAIM_REVIEW_WINDOW_STATES` and `liveRoutedToR9Exists` — the
 * same two parts as `isClaimInAnswerWindow`.
 */
export function answerWindowSql(claimAlias: string): SQL {
  if (!IDENTIFIER.test(claimAlias)) throw new Error(`[answer-window] invalid claim alias '${claimAlias}'`);
  const c = sql.raw(claimAlias);
  const states = sql.raw(CLAIM_REVIEW_WINDOW_STATES.map((s) => `'${s}'`).join(', '));
  return sql`(${c}.current_state IN (${states}) OR (${c}.current_state = ${sql.raw(`'${ANSWER_WINDOW_R9_STATE}'`)} AND ${liveRoutedToR9Exists(c)}))`;
}
