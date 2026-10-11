// "ONE PAYMENT PER DEATH" — the ONE definition of "finally approved", "payment committed" and "another open claim for
// the death", its SQL fragments and its reads (Story 6.28 OP1; `2026-10-11-318` Q1 A, `2026-10-11-319`). Transport-free.
// ⭐ READ-ONLY: this module writes nothing and emits nothing — the closure writer (`closeClaimsOfPaidDeath`, OP4) lives in
// `suspicion-refusal-persist.ts`, so this module stays outside `claim/events.ts`'s import graph (6.23a NW1 — the approval
// gate imports it).
//
// ⭐ INVARIANT 1 — ⛔ never are two claims of the same `(pariwar_id, deceased_member_id)` finally approved at once: the
// gate (OP2, `assertNoOtherFinalApprovalForDeath`) and the cycle commit (OP3) read `readOtherFinallyApprovedClaim` /
// `readPaymentCommittedClaim`; the closure, the warning, the queue and the console read the fragments. ⛔ None re-derives
// them (Invariant 4).
//
// ⚠ NW1's leaf fence (Trap 12): `read.ts` imports `state.ts`, which imports `events.ts` — so the state lists below are
// copied BY VALUE (the `death-certificate-approval.ts` precedent) and a unit test outside this module pins them, for EVERY
// state, against `CLAIM_TERMINAL_STATES` / `CLAIM_NOT_CLOSABLE_STATES`.
// ⚠ ⛔ Never a Drizzle correlated subquery over a same-named table (the Epic 6 tautology bug) — every fragment is raw SQL
// with explicit `op_` aliases, and the outer claim is named by the caller.

import { type SQL, sql } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { ClaimId, MemberId, PariwarId } from '../ids/index.js';
import { clampLimit } from '../pagination.js';
import { standingSuspicionRefusalSql } from './suspicion-refusal.js';

/**
 * "Finally approved" — the claim has passed the final vote (`state_trustee_approved`, still reversible by R9), or its
 * payment is committed (`approved`), or it is paid (`settled` — ⛔ no production emitter today, F4; listed so a settled
 * claim still blocks once settlement ships, Trap 6).
 */
export const FINALLY_APPROVED_CLAIM_STATES = ['state_trustee_approved', 'approved', 'settled'] as const;

/** "Payment committed" — the cycle commit (`approved`) or later (`settled`). The point OP4 closes the others (F15). */
export const PAYMENT_COMMITTED_CLAIM_STATES = ['approved', 'settled'] as const;

/**
 * Duplicated BY VALUE from `claim/read.ts`'s `CLAIM_TERMINAL_STATES` (NW1's leaf fence — `read.ts` is ⛔ off limits). A
 * unit test pins the two equal for EVERY state.
 */
export const OPEN_EXCLUDED_TERMINAL_STATES = ['settled', 'denied', 'closed'] as const;

const IDENTIFIER = /^[a-z_][a-z0-9_]*$/;
const STATE_LITERAL = /^[a-z_0-9]+$/;

function aliasOf(claimAlias: string): SQL {
  if (!IDENTIFIER.test(claimAlias)) throw new Error(`[one-payment-per-death] invalid claim alias '${claimAlias}'`);
  return sql.raw(claimAlias);
}

function stateListSql(states: readonly string[]): SQL {
  if (states.length === 0) throw new Error('[one-payment-per-death] an empty state list');
  for (const s of states) {
    if (!STATE_LITERAL.test(s)) throw new Error(`[one-payment-per-death] invalid state literal '${s}'`);
  }
  return sql.raw(states.map((s) => `'${s}'`).join(', '));
}

// ── the fragments ────────────────────────────────────────────────────────────────────────────────────

/**
 * ⭐ The lowest `claim_case_id` (as text) of ANOTHER claim of the same death as the outer claim `claimAlias`, in one of
 * `states` — or NULL. A scalar SQL subquery over an OUTER claim row (a bare identifier — `claims` for an unaliased Drizzle
 * `.from(claims)`, or a raw alias).
 */
export function otherClaimInStatesSql(claimAlias: string, states: readonly string[]): SQL {
  const s = aliasOf(claimAlias);
  return sql`(
    SELECT op_o.claim_case_id::text FROM claims op_o
     WHERE op_o.pariwar_id = ${s}.pariwar_id
       AND op_o.deceased_member_id = ${s}.deceased_member_id
       AND op_o.claim_case_id <> ${s}.claim_case_id
       AND op_o.current_state IN (${stateListSql(states)})
     ORDER BY op_o.claim_case_id
     LIMIT 1
  )`;
}

/**
 * The predicate "claim `oc` is ANOTHER OPEN claim of the death of `self`": same death, ⛔ not `self`, ⛔ not terminal,
 * ⛔ not finally approved (OP2's 409 covers that one), and RF1 does ⛔ not stand on it (Invariant 3 — FQ5 decides that pair).
 */
function otherOpenClaimPredicateSql(self: SQL, oc: string): SQL {
  const o = sql.raw(oc);
  return sql`${o}.pariwar_id = ${self}.pariwar_id
       AND ${o}.deceased_member_id = ${self}.deceased_member_id
       AND ${o}.claim_case_id <> ${self}.claim_case_id
       AND ${o}.current_state NOT IN (${stateListSql(OPEN_EXCLUDED_TERMINAL_STATES)})
       AND ${o}.current_state NOT IN (${stateListSql(FINALLY_APPROVED_CLAIM_STATES)})
       AND NOT ${standingSuspicionRefusalSql(oc)}`;
}

/**
 * ⭐ The other OPEN claims of the death of the outer claim `claimAlias`, as a `json` array of `claim_case_id` text in
 * `claim_case_id` order — EMPTY whenever RF1 stands on the outer claim ITSELF (Invariant 3: ⛔ no OP5 key is derived on
 * either claim of a standing-refusal pair). Embedded in the warning readers' column lists (OP5 — ⛔ never a per-claim query).
 */
export function otherOpenClaimsForDeathSql(claimAlias: string): SQL {
  const s = aliasOf(claimAlias);
  return sql`(CASE WHEN ${standingSuspicionRefusalSql(claimAlias)} THEN '[]'::json ELSE COALESCE((
    SELECT json_agg(op_oc.claim_case_id::text ORDER BY op_oc.claim_case_id) FROM claims op_oc
     WHERE ${otherOpenClaimPredicateSql(s, 'op_oc')}
  ), '[]'::json) END)`;
}

/** The same predicate as `otherOpenClaimsForDeathSql`, as a boolean (OP5 (b) — the correction queue's `lateArm`). */
export function otherOpenClaimForDeathExistsSql(claimAlias: string): SQL {
  const s = aliasOf(claimAlias);
  return sql`(NOT ${standingSuspicionRefusalSql(claimAlias)} AND EXISTS (
    SELECT 1 FROM claims op_oe
     WHERE ${otherOpenClaimPredicateSql(s, 'op_oe')}
  ))`;
}

// ── the thin reads ───────────────────────────────────────────────────────────────────────────────────

const ONE = clampLimit(1, { default: 1, cap: 1 });

async function readOtherClaimInStates(
  db: Db,
  pariwarId: PariwarId,
  deceasedMemberId: MemberId,
  selfClaimCaseId: ClaimId,
  states: readonly string[],
): Promise<ClaimId | null> {
  // The fragment over a one-row VALUES "self" — the ONE definition, ⛔ never a re-derived WHERE.
  const result = await db.execute<{ other: string | null }>(sql`
    SELECT ${otherClaimInStatesSql('op_self', states)} AS other
      FROM (SELECT ${pariwarId}::uuid AS pariwar_id,
                   ${deceasedMemberId}::uuid AS deceased_member_id,
                   ${selfClaimCaseId}::uuid AS claim_case_id) op_self
     LIMIT ${ONE}
  `);
  const other = result.rows?.[0]?.other ?? null;
  return other === null ? null : (other.toLowerCase() as ClaimId);
}

/** Another claim of the death that is FINALLY approved (the lowest id when — legacy only — two are), or `null`. */
export function readOtherFinallyApprovedClaim(
  db: Db,
  pariwarId: PariwarId,
  deceasedMemberId: MemberId,
  selfClaimCaseId: ClaimId,
): Promise<ClaimId | null> {
  return readOtherClaimInStates(db, pariwarId, deceasedMemberId, selfClaimCaseId, FINALLY_APPROVED_CLAIM_STATES);
}

/** Another claim of the death whose PAYMENT is committed (`approved` / `settled`), or `null`. */
export function readPaymentCommittedClaim(
  db: Db,
  pariwarId: PariwarId,
  deceasedMemberId: MemberId,
  selfClaimCaseId: ClaimId,
): Promise<ClaimId | null> {
  return readOtherClaimInStates(db, pariwarId, deceasedMemberId, selfClaimCaseId, PAYMENT_COMMITTED_CLAIM_STATES);
}
