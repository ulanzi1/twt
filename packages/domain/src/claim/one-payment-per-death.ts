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
import { DeathAlreadyFinallyApprovedError } from './errors.js';
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

/** The nil uuid — "no self": a death-level read, ⛔ never a real claim id. */
const NO_SELF = '00000000-0000-0000-0000-000000000000' as ClaimId;

/** ANY claim of the death whose PAYMENT is committed (the lowest id), or `null` — OP4's closure (H(i), H(iv)). */
export function readPaymentCommittedClaimOfDeath(db: Db, pariwarId: PariwarId, deceasedMemberId: MemberId): Promise<ClaimId | null> {
  return readOtherClaimInStates(db, pariwarId, deceasedMemberId, NO_SELF, PAYMENT_COMMITTED_CLAIM_STATES);
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

// ── OP2 — the guard ──────────────────────────────────────────────────────────────────────────────────

/**
 * ⭐ OP2 — THE GUARD, the approval gate's second FINAL-only conjunct (`assertClaimApprovable` with `step: 'final'`),
 * IMMEDIATELY AFTER RF5's `assertSuspicionAppealDecidedForFinalApproval` — which has taken RF15's per-death key — and
 * BEFORE the late-warning wait (EA2 stays LAST). ⚠ It takes ⛔ no lock of its own: every final writer of the death already
 * serialises on RF15's key, and every writer runs at READ COMMITTED with `current_state` projected in its own transaction,
 * so this FRESH statement sees the other writer's commit (Fact 3). ⛔ Never move it before RF5's call (Trap 1 — two
 * concurrent final writers would both pass).
 */
export async function assertNoOtherFinalApprovalForDeath(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
  deceasedMemberId: MemberId,
): Promise<void> {
  const other = await readOtherFinallyApprovedClaim(db, pariwarId, deceasedMemberId, claimCaseId);
  if (other !== null) throw new DeathAlreadyFinallyApprovedError(claimCaseId, other);
}

// ── OP14 (a) — the other claims of the death, for the approver (staff only) ─────────────────────────────────────────

/** How the console names another claim's stage — staff words, from its state (⛔ a judgement). */
export const OTHER_CLAIM_STAGES = ['open', 'passed_final_vote', 'paid', 'refused', 'under_appeal', 'closed'] as const;
export type OtherClaimStage = (typeof OTHER_CLAIM_STAGES)[number];

/** The other claim's date of death against THIS claim's, by EQUALITY of the live accepted reviews' keyed index. */
export const OTHER_CLAIM_DEATH_DATE_COMPARISONS = ['same', 'different', 'not_accepted', 'not_comparable'] as const;
export type OtherClaimDeathDate = (typeof OTHER_CLAIM_DEATH_DATE_COMPARISONS)[number];

export interface OtherClaimForDeath {
  readonly claimCaseId: ClaimId;
  readonly stage: OtherClaimStage;
  readonly filedAt: Date;
  readonly intakeChannels: readonly string[];
  readonly deathDate: OtherClaimDeathDate;
}

export interface OtherClaimsForDeath {
  /** Every other claim of the death (the list may be shorter — capped). */
  readonly total: number;
  readonly claims: readonly OtherClaimForDeath[];
}

/** The console lists at most this many (then "and N more"). */
export const OTHER_CLAIMS_FOR_DEATH_CAP = 20;

/** A claim state in the console's staff words. Pure. */
export function otherClaimStageOf(state: string): OtherClaimStage {
  if (state === 'closed') return 'closed';
  if (state === 'denied') return 'refused';
  if (state === 'appeal_stage_1' || state === 'appeal_stage_2' || state === 'appeal_stage_3') return 'under_appeal';
  if ((PAYMENT_COMMITTED_CLAIM_STATES as readonly string[]).includes(state)) return 'paid';
  if (state === 'state_trustee_approved') return 'passed_final_vote';
  return 'open';
}

/**
 * The date-of-death comparison. ⚠ ONE field class on both sides (the reviews' `accepted_date_index` — 6.26a Trap 2: a
 * second class would make every pair "differs"). ⛔ No accepted review on either side ⇒ `not_accepted`; an accepted review
 * with a NULL index (pre-6.26b) ⇒ `not_comparable`. Pure.
 */
export function compareDeathDates(
  self: { readonly accepted: boolean; readonly index: string | null },
  other: { readonly accepted: boolean; readonly index: string | null },
): OtherClaimDeathDate {
  if (!self.accepted || !other.accepted) return 'not_accepted';
  if (self.index === null || other.index === null) return 'not_comparable';
  return self.index === other.index ? 'same' : 'different';
}

/**
 * ⭐ OP14 (a) — every OTHER claim of `claimCaseId`'s death (cap `OTHER_CLAIMS_FOR_DEATH_CAP`, oldest filed first), in ONE
 * statement: its state, filed instant and channels, and its live accepted review's keyed date index against THIS claim's
 * (the live review selected as the warnings' `cur` chain does — the current upload's latest accepted review). ⛔ No
 * ciphertext is selected; ⛔ no decrypt; ⛔ no name. Tenant-scoped (RLS + explicit `pariwar_id`).
 */
export async function readOtherClaimsForDeath(db: Db, pariwarId: PariwarId, claimCaseId: ClaimId): Promise<OtherClaimsForDeath> {
  const cap = clampLimit(OTHER_CLAIMS_FOR_DEATH_CAP, { default: OTHER_CLAIMS_FOR_DEATH_CAP, cap: OTHER_CLAIMS_FOR_DEATH_CAP });
  const result = await db.execute<{
    claim_case_id: string;
    current_state: string;
    created_at: Date | string;
    intake_channels: string[] | string;
    accepted: boolean;
    accepted_date_index: string | null;
    self_accepted: boolean;
    self_index: string | null;
    total: number;
  }>(sql`
    WITH op_death AS (
      SELECT cl.claim_case_id, cl.current_state::text AS current_state, cl.created_at, cl.intake_channels::text[] AS intake_channels,
             op_rv.review_id IS NOT NULL AS accepted, op_rv.accepted_date_index
        FROM claims op_self
        JOIN claims cl
          ON cl.pariwar_id = op_self.pariwar_id
         AND cl.deceased_member_id = op_self.deceased_member_id
        LEFT JOIN LATERAL (
          SELECT r.review_id, r.accepted_date_index
            FROM claim_documents cd
            JOIN claim_death_certificate_uploads u
              ON u.pariwar_id = cd.pariwar_id
             AND u.claim_case_id = cd.claim_case_id
             AND u.storage_object_key = cd.storage_object_key
            JOIN claim_death_certificate_reviews r
              ON r.pariwar_id = cd.pariwar_id
             AND r.claim_case_id = cd.claim_case_id
             AND r.superseded_at IS NULL
             AND r.upload_id = u.upload_id
             AND r.verdict = 'accepted'
           WHERE cd.pariwar_id = cl.pariwar_id
             AND cd.claim_case_id = cl.claim_case_id
             AND cd.document_type = 'death_certificate'
           ORDER BY r.decided_at DESC, r.review_id DESC
           LIMIT 1
        ) op_rv ON true
       WHERE op_self.pariwar_id = ${pariwarId}
         AND op_self.claim_case_id = ${claimCaseId}
    )
    SELECT o.claim_case_id::text AS claim_case_id, o.current_state, o.created_at, o.intake_channels, o.accepted, o.accepted_date_index,
           s.accepted AS self_accepted, s.accepted_date_index AS self_index,
           (SELECT count(*)::int FROM op_death t WHERE t.claim_case_id <> ${claimCaseId}) AS total
      FROM op_death o
      JOIN op_death s ON s.claim_case_id = ${claimCaseId}
     WHERE o.claim_case_id <> ${claimCaseId}
     ORDER BY o.created_at, o.claim_case_id
     LIMIT ${cap}
  `);
  const rows = result.rows ?? [];
  const channelsOf = (v: string[] | string): string[] =>
    Array.isArray(v) ? v : v.replace(/^\{|\}$/g, '').split(',').filter((x) => x.length > 0);
  return {
    total: rows[0]?.total ?? 0,
    claims: rows.map((r) => ({
      claimCaseId: r.claim_case_id.toLowerCase() as ClaimId,
      stage: otherClaimStageOf(r.current_state),
      filedAt: r.created_at instanceof Date ? r.created_at : new Date(r.created_at),
      intakeChannels: channelsOf(r.intake_channels),
      deathDate: compareDeathDates(
        { accepted: r.self_accepted, index: r.self_index },
        { accepted: r.accepted, index: r.accepted_date_index },
      ),
    })),
  };
}

// ── OP14 (b) — "finally approved elsewhere", for the approval surfaces (bulk) ───────────────────────────────────────

export interface FinallyApprovedElsewhere {
  readonly claimCaseId: ClaimId;
  /** `passed_final_vote` ⇒ this claim cannot be finally approved; `paid` ⇒ it should be closed ("Close this claim"). */
  readonly stage: 'passed_final_vote' | 'paid';
}

const ELSEWHERE_SLICE = 500;

/**
 * ⭐ OP14 (b) — for MANY claims, the other claim of each one's death that is FINALLY approved (OP1's
 * `otherClaimInStatesSql` — the lowest id), and its stage, in ONE statement per slice of ≤ 500 ids (⛔ never a per-claim
 * query — the bulk-read rule of OP5). Keys are lower-case claim ids; a claim with ⛔ none maps to `null`; a claim ⛔ in
 * this Pariwar is absent. Decision SUPPORT only — OP2's gate is the control (a forced request still meets the 409).
 */
export async function readFinallyApprovedElsewhereBulk(
  db: Db,
  pariwarId: PariwarId,
  claimCaseIds: readonly string[],
): Promise<Map<string, FinallyApprovedElsewhere | null>> {
  const out = new Map<string, FinallyApprovedElsewhere | null>();
  const unique = [...new Set(claimCaseIds.map((id) => id.toLowerCase()))];
  for (let i = 0; i < unique.length; i += ELSEWHERE_SLICE) {
    const slice = unique.slice(i, i + ELSEWHERE_SLICE);
    const result = await db.execute<{ claim_case_id: string; other: string | null; other_state: string | null }>(sql`
      SELECT op_c.claim_case_id::text AS claim_case_id, op_x.claim_case_id::text AS other, op_x.current_state::text AS other_state
        FROM claims op_c
        LEFT JOIN claims op_x
          ON op_x.pariwar_id = op_c.pariwar_id
         AND op_x.claim_case_id = (${otherClaimInStatesSql('op_c', FINALLY_APPROVED_CLAIM_STATES)})::uuid
       WHERE op_c.pariwar_id = ${pariwarId}
         AND op_c.claim_case_id IN (${sql.join(slice.map((id) => sql`${id}::uuid`), sql`, `)})
    `);
    for (const r of result.rows ?? []) {
      out.set(
        r.claim_case_id.toLowerCase(),
        r.other === null
          ? null
          : {
              claimCaseId: r.other.toLowerCase() as ClaimId,
              stage: (PAYMENT_COMMITTED_CLAIM_STATES as readonly string[]).includes(r.other_state ?? '') ? 'paid' : 'passed_final_vote',
            },
      );
    }
  }
  return out;
}
