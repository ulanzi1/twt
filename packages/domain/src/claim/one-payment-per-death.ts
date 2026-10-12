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
  // Code review chunk 1 patch — `aliasOf`'s validation, ⛔ a bare `sql.raw(oc)`: this helper is module-private and
  // today only ever called with the file's own two hardcoded literal aliases (`'op_oc'`, `'op_oe'`), but it still
  // deserves the SAME discipline every exported fragment in this file already applies to its alias parameter.
  const o = aliasOf(oc);
  return sql`${o}.pariwar_id = ${self}.pariwar_id
       AND ${o}.deceased_member_id = ${self}.deceased_member_id
       AND ${o}.claim_case_id <> ${self}.claim_case_id
       AND ${o}.current_state NOT IN (${stateListSql(OPEN_EXCLUDED_TERMINAL_STATES)})
       AND ${o}.current_state NOT IN (${stateListSql(FINALLY_APPROVED_CLAIM_STATES)})
       AND NOT ${standingSuspicionRefusalSql(oc)}`;
}

/**
 * The row cap on `otherOpenClaimsForDeathSql`'s `json_agg` — the SAME 50 as `suspicion-refusal-persist.ts`'s
 * `HELD_CLAIMS_CAP` (the closure walk's own ceiling for "other claims of a death"), ⛔ a shared import: that file
 * already imports FROM this one (`readPaymentCommittedClaim`/`readPaymentCommittedClaimOfDeath`), so importing
 * `HELD_CLAIMS_CAP` back here would be circular. Kept as its own named constant with the matching value instead.
 */
const OTHER_OPEN_CLAIMS_FOR_DEATH_JSON_CAP = clampLimit(50, { default: 50, cap: 50 });

/**
 * ⭐ The other OPEN claims of the death of the outer claim `claimAlias`, as a `json` array of `claim_case_id` text in
 * `claim_case_id` order (capped — a warning-key input, ⛔ never the console's own capped/paginated read) — EMPTY
 * whenever RF1 stands on the outer claim ITSELF (Invariant 3: ⛔ no OP5 key is derived on either claim of a
 * standing-refusal pair). Embedded in the warning readers' column lists (OP5 — ⛔ never a per-claim query).
 */
export function otherOpenClaimsForDeathSql(claimAlias: string): SQL {
  const s = aliasOf(claimAlias);
  return sql`(CASE WHEN ${standingSuspicionRefusalSql(claimAlias)} THEN '[]'::json ELSE COALESCE((
    SELECT json_agg(op_oc_capped.claim_case_id) FROM (
      SELECT op_oc.claim_case_id::text AS claim_case_id FROM claims op_oc
       WHERE ${otherOpenClaimPredicateSql(s, 'op_oc')}
       ORDER BY op_oc.claim_case_id
       LIMIT ${OTHER_OPEN_CLAIMS_FOR_DEATH_JSON_CAP}
    ) op_oc_capped
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

/**
 * The nil uuid — "no self": `readOtherClaimInStates`'s predicate excludes `claim_case_id = selfClaimCaseId`, so
 * passing this value excludes NOTHING and the read becomes death-level (every claim of the death is "other").
 * Safety assumption: `claim_case_id` is always a `randomUUID()`-generated v4 id (never hand-assigned), so no real
 * row can ever collide with the all-zero sentinel. ⚠ A reader of OP1's spec text sees only `readOtherFinallyApprovedClaim`
 * and `readPaymentCommittedClaim` (both taking a real `selfClaimCaseId`) — this is the THIRD reader on the same
 * fragment, added for H(i)/H(iv)'s death-level check.
 */
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
export const OTHER_CLAIM_STAGES = ['open', 'passed_final_vote', 'paid', 'refused', 'under_appeal', 'reversed', 'closed'] as const;
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
  // `reversed` (a panel overturned a refusal/appeal decision) routes back through the freeze/R9 pipeline toward a
  // fresh vote — it is ⛔ never a brand-new, never-touched claim. ⚠ ITS OWN stage (code review chunk 3/4 round 2),
  // ⛔ grouped under `under_appeal`: that label would read to staff as "protected, an appeal is pending" — but
  // `mayCloseForPaidDeath`'s `KEEPS_ITS_APPEAL_STATES` deliberately excludes `reversed` (it is closable the instant
  // another claim of the death is paid), so a staff member reading "under_appeal" would form the WRONG mental
  // model about a claim one step from being closed.
  if (state === 'reversed') return 'reversed';
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
 * The outer claim `outerAlias`'s live accepted death-certificate review — `review_id` (non-null ⇒ "accepted") and
 * `accepted_date_index` — as a `LEFT JOIN LATERAL ... ON true` fragment (the current upload's latest accepted review;
 * the warnings' `cur` chain's own selection, 6.26a). Shared by `readOtherClaimsForDeath` and `readOtherClaimVisits` so
 * "what counts as the live accepted review" has ONE definition.
 */
function liveAcceptedDeathCertificateReviewLateralSql(outerAlias: string): SQL {
  const o = aliasOf(outerAlias);
  return sql`LEFT JOIN LATERAL (
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
           WHERE cd.pariwar_id = ${o}.pariwar_id
             AND cd.claim_case_id = ${o}.claim_case_id
             AND cd.document_type = 'death_certificate'
           ORDER BY r.decided_at DESC, r.review_id DESC
           LIMIT 1
        ) op_rv ON true`;
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
        ${liveAcceptedDeathCertificateReviewLateralSql('cl')}
       WHERE op_self.pariwar_id = ${pariwarId}
         AND op_self.claim_case_id = ${claimCaseId}
    ),
    op_total AS (
      SELECT count(*)::int AS total FROM op_death t WHERE t.claim_case_id <> ${claimCaseId}
    )
    SELECT o.claim_case_id::text AS claim_case_id, o.current_state, o.created_at, o.intake_channels, o.accepted, o.accepted_date_index,
           s.accepted AS self_accepted, s.accepted_date_index AS self_index, op_total.total
      FROM op_death o
      JOIN op_death s ON s.claim_case_id = ${claimCaseId}
      CROSS JOIN op_total
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
 * Code review round 3 — a PAYMENT-COMMITTED claim is preferred over a merely voted one (a legacy pair whose lower id is
 * only voted would otherwise show "passed the final vote" and hide "Close this claim" on a death already paid).
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
         AND op_x.claim_case_id = COALESCE(
               ${otherClaimInStatesSql('op_c', PAYMENT_COMMITTED_CLAIM_STATES)},
               ${otherClaimInStatesSql('op_c', FINALLY_APPROVED_CLAIM_STATES)}
             )::uuid
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

// ── OP14 (d) — the ground inspector sees the other claims ───────────────────────────────────────────────────────────

export interface OtherClaimVisits {
  /** Another claim of the death has a completed FULL visit (`inspection_stage <> 'certificate_check'` — 6.26a VISITED's
   *  own-row arm, ⛔ inheritance). */
  readonly visitedElsewhere: boolean;
  /** The same, AND that visit's `death_date_index` EQUALS this claim's live accepted review's `accepted_date_index` (one
   *  field class; NULL on either side ⇒ `false`). */
  readonly alreadyVisited: boolean;
}

/**
 * ⭐ OP14 (d) — whether another claim of `claimCaseId`'s death was already VISITED (and with this claim's date of death),
 * in ONE statement. Booleans only — ⛔ no date, ⛔ no ciphertext. Information for the inspector, ⛔ never a gate.
 */
export async function readOtherClaimVisits(db: Db, pariwarId: PariwarId, claimCaseId: ClaimId): Promise<OtherClaimVisits> {
  const result = await db.execute<{ visited_elsewhere: boolean; already_visited: boolean }>(sql`
    WITH op_self AS (
      SELECT c.pariwar_id, c.claim_case_id, c.deceased_member_id, op_rv.accepted_date_index
        FROM claims c
        ${liveAcceptedDeathCertificateReviewLateralSql('c')}
       WHERE c.pariwar_id = ${pariwarId}
         AND c.claim_case_id = ${claimCaseId}
    ),
    op_visits AS (
      SELECT gi.death_date_index
        FROM op_self
        JOIN claims o
          ON o.pariwar_id = op_self.pariwar_id
         AND o.deceased_member_id = op_self.deceased_member_id
         AND o.claim_case_id <> op_self.claim_case_id
        JOIN claim_ground_inspections gi
          ON gi.pariwar_id = o.pariwar_id
         AND gi.claim_case_id = o.claim_case_id
         AND gi.status = 'completed'
         AND gi.inspection_stage <> 'certificate_check'
    )
    SELECT EXISTS (SELECT 1 FROM op_visits) AS visited_elsewhere,
           EXISTS (
             SELECT 1 FROM op_visits v, op_self s
              WHERE v.death_date_index IS NOT NULL
                AND s.accepted_date_index IS NOT NULL
                AND v.death_date_index = s.accepted_date_index
           ) AS already_visited
  `);
  const row = result.rows?.[0];
  return { visitedElsewhere: row?.visited_elsewhere === true, alreadyVisited: row?.already_visited === true };
}

// ── OP10 — the staff label of a CLOSED claim follows its HOLDING claim ──────────────────────────────────────────────

const HOLDER_REFUSED_SLICE = 500;

/**
 * ⭐ OP10 (`2026-10-11-318` Q3 A's promise) — of MANY claims, the `closed` ones whose HOLDING claim (`claim.closed`'s
 * `held_by_claim_case_id` — the claim that went ahead) has since been REFUSED or CLOSED, so the staff label reads "the
 * other claim … was later refused; the family may file again" instead of "… goes ahead". ONE statement per ≤ 500 ids;
 * lower-case ids. ⛔ No PII.
 * ⭐ Code review round 3 (`2026-10-12-320` D1 A) — AND ⛔ no OTHER claim of the death is still live (every other claim
 * `denied` or `closed`): a holder CLOSED because the death is already paid (H(iii) right after RF6) or because a third
 * claim went ahead leaves a claim that DOES go ahead, so "the family may file again" would be false (a new filing for a
 * paid death is closed at mint, H(ii)).
 */
export async function readClosedHolderRefusedBulk(db: Db, pariwarId: PariwarId, claimCaseIds: readonly string[]): Promise<Set<string>> {
  const out = new Set<string>();
  const unique = [...new Set(claimCaseIds.map((id) => id.toLowerCase()))];
  for (let i = 0; i < unique.length; i += HOLDER_REFUSED_SLICE) {
    const slice = unique.slice(i, i + HOLDER_REFUSED_SLICE);
    const result = await db.execute<{ claim_case_id: string }>(sql`
      SELECT op_c.claim_case_id::text AS claim_case_id
        FROM claims op_c
       WHERE op_c.pariwar_id = ${pariwarId}
         AND op_c.claim_case_id IN (${sql.join(slice.map((id) => sql`${id}::uuid`), sql`, `)})
         AND op_c.current_state = 'closed'
         AND EXISTS (
           SELECT 1
             FROM events_log op_e
             JOIN claims op_h
               ON op_h.pariwar_id = op_e.pariwar_id
              AND op_h.claim_case_id = (op_e.payload ->> 'held_by_claim_case_id')::uuid
            WHERE op_e.pariwar_id = op_c.pariwar_id
              AND op_e.stream_id = op_c.claim_case_id
              AND op_e.event_type = 'claim.closed'
              AND op_h.current_state IN ('denied', 'closed')
         )
         AND NOT EXISTS (
           SELECT 1
             FROM claims op_l
            WHERE op_l.pariwar_id = op_c.pariwar_id
              AND op_l.deceased_member_id = op_c.deceased_member_id
              AND op_l.claim_case_id <> op_c.claim_case_id
              AND op_l.current_state NOT IN ('denied', 'closed')
         )
    `);
    for (const r of result.rows ?? []) out.add(r.claim_case_id.toLowerCase());
  }
  return out;
}
