// "A SUSPICION REFUSAL STANDS" — the ONE definition, its reads and the 90-day appeal limit (Story 6.24a; `2026-10-07-292`
// RF1, RF3, RF5, RF14, RF15). Transport-free. ⭐ READ-ONLY: this module writes nothing and emits nothing — the closure
// writer (`closeClaimsHeldBySuspicionAppeal`, RF6) lives in `suspicion-refusal-persist.ts` so this module stays outside
// `claim/events.ts`'s import graph (6.23a NW1 — the approval gate imports it).
//
// ⭐ `-261` D4 B / `-262` FQ5 A / `2026-10-07-291` Q1 A, in the system's terms: when a District Admin refuses a claim S
// because the nominee was changed on or after the death (`-239`, reason `post_death_nominee_change`), every OTHER claim of
// the same death is (1) ⛔ never merged into S (RF2 — at the convergence candidate), (2) held at FINAL approval while S's
// refusal can still be appealed — for 90 days from the refusal — or while an appeal filed in that time is undecided (RF5),
// and (3) CLOSED if S's appeal is allowed (RF6). ⭐ The system refuses nothing.
//
// ⭐ INVARIANT 2 — ONE definition (RF1). Convergence, the wait, the closure, the commit re-check, the inheritance and the
// console all read `standingSuspicionRefusalSql` / `readStandingSuspicionRefusals`; ⛔ none re-derives it.
// ⭐ INVARIANT 3 — DERIVED, ⛔ never stored. A `-239` row can be revised onto or off the reason while the claim is
// `denied` (`reviseDecision`), and an allowed appeal leaves the live decision `denied` + `-239` (it moves only the claim
// state and the `claim_appeals` anchor) — so every predicate here re-reads the live decision AND the anchor at the moment
// it acts. ⛔ No link column between a refused claim and the claims it holds.
//
// ⚠ ⛔ Never a Drizzle correlated subquery over a same-named table (the Epic 6 tautology bug) — every fragment is raw SQL
// with explicit `sr_` aliases, and the outer claim is named by the caller.

import { createHash } from 'node:crypto';

import { type SQL, sql } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { ClaimId, MemberId, NomineeVersionId, PariwarId } from '../ids/index.js';
import { clampLimit } from '../pagination.js';
import {
  addCalendarDays,
  type CalendarDateString,
  istDateOf,
  istMidnightAt,
} from '../cycle-calendar/holiday-resolver.js';
import { SuspicionAppealPendingError } from './errors.js';
import { getEffectiveNomineeDeclaration } from './nominee-effective.js';

/**
 * The dedicated `-239` reason code (⛔ never `other` — the inheritance and every rule here must RECOGNISE it). Defined
 * HERE (Story 6.24a) and re-exported unchanged by `nominee-refusal-read.ts`, which now reads RF1's fragment — defining
 * it there would close an import cycle between the two modules.
 */
export const POST_DEATH_NOMINEE_CHANGE_REASON_CODE = 'post_death_nominee_change' as const;

/** `-291` Q1 A — a `-239` refusal can be appealed for 90 days from the refusal (BigDev: *"90 days"*). */
export const SUSPICION_REFUSAL_APPEAL_DAYS = 90;

const IDENTIFIER = /^[a-z_][a-z0-9_]*$/;

// ── RF1 — the fragment ───────────────────────────────────────────────────────────────────────────────

/**
 * ⭐ RF1 — "the suspicion refusal of claim `<alias>` STANDS", as a raw SQL boolean over an OUTER claim row named
 * `claimAlias` (a bare identifier — `claims` for an unaliased Drizzle `.from(claims)`, or a raw alias). It stands iff:
 *   · the claim's LIVE verifier decision is `denied` with the `-239` reason, AND
 *   · ⛔ no `claim_appeals` row of the claim is `reversed` (an allowed appeal leaves the decision row live — F3), AND
 *   · the claim is ⛔ not `closed` (a claim RF6 closed ⛔ never stands — else a closed second refusal's open anchor or
 *     un-appealed `-239` would hold the reversed claim for ever — Trap 17).
 * A stage-3 uphold (`upheld_final`) STANDS. A revision off `-239` ends it; a revision onto `-239` starts it.
 */
export function standingSuspicionRefusalSql(claimAlias: string): SQL {
  if (!IDENTIFIER.test(claimAlias)) throw new Error(`[suspicion-refusal] invalid claim alias '${claimAlias}'`);
  const s = sql.raw(claimAlias);
  return sql`(
    EXISTS (
      SELECT 1 FROM claim_verifier_decisions sr_d
       WHERE sr_d.pariwar_id = ${s}.pariwar_id
         AND sr_d.claim_case_id = ${s}.claim_case_id
         AND sr_d.superseded_at IS NULL
         AND sr_d.outcome = 'denied'
         AND sr_d.reason_code = ${POST_DEATH_NOMINEE_CHANGE_REASON_CODE}
    )
    AND NOT EXISTS (
      SELECT 1 FROM claim_appeals sr_a
       WHERE sr_a.pariwar_id = ${s}.pariwar_id
         AND sr_a.claim_case_id = ${s}.claim_case_id
         AND sr_a.status = 'reversed'
    )
    AND ${s}.current_state <> 'closed'
  )`;
}

/**
 * ⭐ RF14 — the instant the claim's CURRENT unbroken `-239` chain began, as a scalar SQL subquery (NULL when the claim's
 * live decision is ⛔ not a `-239` refusal). Walks `supersedes_decision_id` back from the LIVE row while the reason stays
 * `post_death_nominee_change` (and the outcome `denied`) and yields the earliest row's `decided_at`: on the normal path it
 * IS the District Admin's refusal; a revision that KEEPS `-239` (a note change) does ⛔ not move it; a revision AWAY and
 * later BACK starts a new chain — and so a NEW 90 days (`-292`'s third amended `-291` reading). ⛔ Never the
 * `claim.verifier_denied` event: a claim refused for another reason can be moved ONTO `-239` long after the denial.
 * ⚠ Relies on ⛔ no writer updating a decision row but its `superseded_at` (a convention, grep-pinned in a test).
 */
export function suspicionChainStartedAtSql(pariwarId: SQL, claimCaseId: SQL): SQL {
  return sql`(
    WITH RECURSIVE sr_chain AS (
      SELECT sr_live.decision_id, sr_live.supersedes_decision_id, sr_live.decided_at
        FROM claim_verifier_decisions sr_live
       WHERE sr_live.pariwar_id = ${pariwarId}
         AND sr_live.claim_case_id = ${claimCaseId}
         AND sr_live.superseded_at IS NULL
         AND sr_live.outcome = 'denied'
         AND sr_live.reason_code = ${POST_DEATH_NOMINEE_CHANGE_REASON_CODE}
      UNION ALL
      SELECT sr_prev.decision_id, sr_prev.supersedes_decision_id, sr_prev.decided_at
        FROM sr_chain
        JOIN claim_verifier_decisions sr_prev
          ON sr_prev.decision_id = sr_chain.supersedes_decision_id
         AND sr_prev.pariwar_id = ${pariwarId}
         AND sr_prev.claim_case_id = ${claimCaseId}
         AND sr_prev.outcome = 'denied'
         AND sr_prev.reason_code = ${POST_DEATH_NOMINEE_CHANGE_REASON_CODE}
    )
    SELECT min(sr_chain.decided_at) FROM sr_chain
  )`;
}

// ── RF14 — the 90-day limit (pure) ───────────────────────────────────────────────────────────────────

/**
 * ⭐ RF14 — the LAST IST date on which a `-239` refusal may be appealed: D + 90, where D = the IST date of the first row
 * of the claim's current `-239` chain. ONE pure helper; every reader and the initiation guard derive from it.
 */
export function suspicionRefusalAppealUntil(firstSuspicionDecidedAtUtc: Date): CalendarDateString {
  return addCalendarDays(istDateOf(firstSuspicionDecidedAtUtc), SUSPICION_REFUSAL_APPEAL_DAYS);
}

/**
 * True iff the appeal limit has PASSED at `clock`: from 00:00 IST on D + 91 (the last instant of D + 90 is still
 * inside). Judged through `suspicionRefusalAppealUntil` — ⛔ never a second derivation.
 */
export function hasSuspicionRefusalAppealLimitPassed(firstSuspicionDecidedAtUtc: Date, clock: Date): boolean {
  const endsAt = istMidnightAt(addCalendarDays(suspicionRefusalAppealUntil(firstSuspicionDecidedAtUtc), 1));
  return clock.getTime() >= endsAt.getTime();
}

// ── RF1 — the read ───────────────────────────────────────────────────────────────────────────────────

/** The four appeal positions as a runtime tuple — the contracts' lockstep test compares its wire enum against it. */
export const SUSPICION_REFUSAL_APPEAL_POSITIONS = ['not_filed', 'time_limit_passed', 'open', 'upheld_final'] as const;
/** Where a standing refusal's appeal is: ⛔ not filed (within 90 days), its time limit passed, open, or upheld at stage 3. */
export type SuspicionRefusalAppealPosition = (typeof SUSPICION_REFUSAL_APPEAL_POSITIONS)[number];

export interface StandingSuspicionRefusal {
  readonly claimCaseId: ClaimId;
  /** The refused claim's own `created_at` (the inheritance rule's order). */
  readonly createdAt: Date;
  /** The IST date of the first row of the claim's current `-239` chain (D). */
  readonly refusedOn: CalendarDateString;
  /** The last IST date it may be appealed (D + 90 — RF14). */
  readonly appealUntil: CalendarDateString;
  readonly appeal: SuspicionRefusalAppealPosition;
}

const STANDING_READ_CAP = 50;

/**
 * ⭐ RF1 — every claim of the death `(pariwarId, deceasedMemberId)` whose suspicion refusal STANDS, ordered
 * `created_at DESC, claim_case_id DESC`, bounded. ONE statement; the limit is judged against that statement's
 * `clock_timestamp()` — so a caller that took RF15's key first (the final-approval conjunct) judges with a clock read
 * AFTER the key (Trap 16), and every other reader judges with its own statement's clock (a stale clock can only make
 * the cycle commit skip-and-keep a claim one extra run — conservative). Tenant-scoped (RLS + explicit predicate).
 */
export async function readStandingSuspicionRefusals(
  db: Db,
  pariwarId: PariwarId,
  deceasedMemberId: MemberId,
): Promise<StandingSuspicionRefusal[]> {
  const limit = clampLimit(STANDING_READ_CAP, { default: STANDING_READ_CAP, cap: STANDING_READ_CAP });
  const result = await db.execute<{
    claim_case_id: string;
    created_at: Date | string;
    chain_started_at: Date | string | null;
    appeal_status: string | null;
    clock: Date | string;
  }>(sql`
    SELECT sr_s.claim_case_id,
           sr_s.created_at,
           ${suspicionChainStartedAtSql(sql`sr_s.pariwar_id`, sql`sr_s.claim_case_id`)} AS chain_started_at,
           (SELECT sr_anchor.status::text FROM claim_appeals sr_anchor
             WHERE sr_anchor.pariwar_id = sr_s.pariwar_id
               AND sr_anchor.claim_case_id = sr_s.claim_case_id
             LIMIT 1) AS appeal_status,
           clock_timestamp() AS clock
      FROM claims sr_s
     WHERE sr_s.pariwar_id = ${pariwarId}
       AND sr_s.deceased_member_id = ${deceasedMemberId}
       AND ${standingSuspicionRefusalSql('sr_s')}
     ORDER BY sr_s.created_at DESC, sr_s.claim_case_id DESC
     LIMIT ${limit}
  `);
  const rows: StandingSuspicionRefusal[] = [];
  for (const r of result.rows ?? []) {
    // A standing refusal ALWAYS has a live `-239` row, so its chain has a start — a NULL would mean the row changed
    // between the two sub-reads of ONE statement (impossible under one snapshot); refuse to guess.
    if (r.chain_started_at === null) {
      throw new Error(`[suspicion-refusal] standing refusal ${r.claim_case_id} has no -239 chain start`);
    }
    const chainStartedAt = toDate(r.chain_started_at);
    const clock = toDate(r.clock);
    rows.push({
      claimCaseId: r.claim_case_id as ClaimId,
      createdAt: toDate(r.created_at),
      refusedOn: istDateOf(chainStartedAt),
      appealUntil: suspicionRefusalAppealUntil(chainStartedAt),
      appeal: appealPositionOf(r.appeal_status, chainStartedAt, clock),
    });
  }
  return rows;
}

function appealPositionOf(status: string | null, chainStartedAt: Date, clock: Date): SuspicionRefusalAppealPosition {
  if (status === 'open') return 'open';
  if (status === 'upheld_final') return 'upheld_final';
  if (status === null) {
    return hasSuspicionRefusalAppealLimitPassed(chainStartedAt, clock) ? 'time_limit_passed' : 'not_filed';
  }
  // `reversed` ⇒ ⛔ not standing (the fragment excludes it); `closed` ⇒ its claim is `closed` (excluded too).
  throw new Error(`[suspicion-refusal] a standing refusal cannot carry appeal status '${status}'`);
}

/**
 * ⭐ RF1 for ONE claim — does its suspicion refusal STAND right now? (The member app's entry read — RF2 v1.1: a filed
 * claim on which RF1 stands routes like a TERMINAL one, so the wizard is reachable on the device that filed it.)
 */
export async function isSuspicionRefusalStanding(db: Db, pariwarId: PariwarId, claimCaseId: ClaimId): Promise<boolean> {
  const result = await db.execute<{ standing: boolean }>(sql`
    SELECT EXISTS (
      SELECT 1 FROM claims sr_one
       WHERE sr_one.pariwar_id = ${pariwarId}
         AND sr_one.claim_case_id = ${claimCaseId}
         AND ${standingSuspicionRefusalSql('sr_one')}
    ) AS standing
  `);
  return result.rows?.[0]?.standing === true;
}

/**
 * The live `-239` chain start of ONE claim and the statement's `clock_timestamp()`, or `null` when the claim's live
 * decision is ⛔ not a `-239` refusal. Feeds the appeal-initiation guard (RF14) and the helpline appeal screen.
 */
export async function readSuspicionChainStart(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
): Promise<{ chainStartedAt: Date; clock: Date } | null> {
  const p = sql`${pariwarId}::uuid`;
  const c = sql`${claimCaseId}::uuid`;
  const result = await db.execute<{ chain_started_at: Date | string | null; clock: Date | string }>(sql`
    SELECT ${suspicionChainStartedAtSql(p, c)} AS chain_started_at, clock_timestamp() AS clock
  `);
  const row = result.rows?.[0];
  if (!row || row.chain_started_at === null) return null;
  return { chainStartedAt: toDate(row.chain_started_at), clock: toDate(row.clock) };
}

// ── RF9 — who the filing code goes to (Story 6.24b) ──────────────────────────────────────────────────

/**
 * Who the app's filing code goes to while a suspicion refusal stands for the death (RF9; `-262` FQ6 B):
 *   · `null` — ⛔ no refusal stands ⇒ today's path, unchanged (the latest nominee);
 *   · `at_death` — the rank-1 version of the refused claim's EFFECTIVE determination (the nominee the District Admin
 *     found in place at the death);
 *   · `none` — a refusal stands but its determination is ⛔ not `effective` ⇒ the existence-defended no-op.
 * ⛔ Never the latest nominee once a refusal stands (invariant 5).
 */
export type SuspicionRefusalRecipient =
  | { readonly kind: 'at_death'; readonly versionId: NomineeVersionId }
  | { readonly kind: 'none' };

/**
 * ⭐ RF9 — the MOST RECENT standing refusal of the death (RF1's order — the most recently CREATED refused claim), its
 * `getEffectiveNomineeDeclaration`, and the `versionId` of the entry with `rank === 1` (after any re-rank) when
 * `effective`. Ref-only: a version id, ⛔ never a number or a name — the caller reads the ciphertext BY VERSION ID.
 * ⚠ A data fault in RF1's read (a null chain start) THROWS — a 500 for the whole death (RB9).
 */
export async function readSuspicionRefusalRecipient(
  db: Db,
  pariwarId: PariwarId,
  deceasedMemberId: MemberId,
): Promise<SuspicionRefusalRecipient | null> {
  const standing = await readStandingSuspicionRefusals(db, pariwarId, deceasedMemberId);
  const refused = standing[0];
  if (!refused) return null;
  const declaration = await getEffectiveNomineeDeclaration(db, pariwarId, refused.claimCaseId);
  if (declaration.status !== 'effective') return { kind: 'none' };
  const rankOne = declaration.entries.find((e) => e.rank === 1);
  return rankOne ? { kind: 'at_death', versionId: rankOne.versionId } : { kind: 'none' };
}

// ── RF5 — the wait (pure + the conjunct) ─────────────────────────────────────────────────────────────

export type SuspicionAppealWaitReason = 'appeal_open' | 'appeal_not_filed';

export type SuspicionAppealWaitState =
  | { readonly waits: false }
  | { readonly waits: true; readonly reason: SuspicionAppealWaitReason; readonly heldByClaimCaseId: ClaimId };

/**
 * ⭐ RF5 — does a FINAL approval of `selfClaimId` wait? It waits iff ANY OTHER claim of the death (RF3 — ⛔ no ordering,
 * ⛔ no "who filed" test) has a standing refusal whose appeal is `open`, or `not_filed` with its 90 days ⛔ not yet
 * passed. `upheld_final` / `time_limit_passed` ⇒ decided ⇒ ⛔ no wait. An open appeal is reported before a not-filed
 * one (it is the longer wait). ONE pure helper — the gate, the cycle commit and the console all call it.
 */
export function suspicionAppealWaitState(
  rows: readonly StandingSuspicionRefusal[],
  selfClaimId: ClaimId | string,
): SuspicionAppealWaitState {
  const self = String(selfClaimId).toLowerCase();
  const others = rows.filter((r) => String(r.claimCaseId).toLowerCase() !== self);
  const open = others.find((r) => r.appeal === 'open');
  if (open) return { waits: true, reason: 'appeal_open', heldByClaimCaseId: open.claimCaseId };
  const notFiled = others.find((r) => r.appeal === 'not_filed');
  if (notFiled) return { waits: true, reason: 'appeal_not_filed', heldByClaimCaseId: notFiled.claimCaseId };
  return { waits: false };
}

/** The OTHER claims of the death whose suspicion refusal stands (the console's "kept apart" line). */
export function otherStandingSuspicionRefusals(
  rows: readonly StandingSuspicionRefusal[],
  selfClaimId: ClaimId | string,
): StandingSuspicionRefusal[] {
  const self = String(selfClaimId).toLowerCase();
  return rows.filter((r) => String(r.claimCaseId).toLowerCase() !== self);
}

// ── RF15 / RF6 — the per-death keys ──────────────────────────────────────────────────────────────────

function perDeathKey(prefix: string, pariwarId: string, deceasedMemberId: string): bigint {
  const hex = createHash('sha256').update(`${prefix}:${pariwarId}:${deceasedMemberId}`).digest('hex');
  return BigInt(`0x${hex.slice(0, 15)}`);
}

/**
 * ⭐ RF15 — the per-death APPEAL key (`suspicion-appeal:`). Taken by the final-approval conjunct UNCONDITIONALLY (first in
 * the conjunct, after the caller's own locks) and by `initiateAppeal` (after its `appeal:` lock and claim-row lock, when
 * the live reason is `-239`), so an initiation and a final approval racing at the limit's boundary resolve one way only.
 * Its holder ⛔ never then waits on a claim lock. ⛔ Never the intake lock, ⛔ never RF6's reversal key.
 */
export function suspicionAppealAdvisoryLockKey(pariwarId: string, deceasedMemberId: string): bigint {
  return perDeathKey('suspicion-appeal', pariwarId, deceasedMemberId);
}

/**
 * ⭐ RF6 (v1.1) — the per-death REVERSAL key (`suspicion-reversal:`), taken FIRST by all three reversal writers so two
 * `-239` claims of one death reversed at once serialise (⛔ no 40P01). ⛔ Never the intake lock, ⛔ never RF15's key.
 */
export function suspicionReversalAdvisoryLockKey(pariwarId: string, deceasedMemberId: string): bigint {
  return perDeathKey('suspicion-reversal', pariwarId, deceasedMemberId);
}

async function takeXactLock(db: Db, key: bigint): Promise<void> {
  await db.execute(sql`SELECT pg_advisory_xact_lock(${key.toString()}::bigint)`);
}

/** Take RF15's per-death appeal key (transaction-scoped; released on COMMIT / ROLLBACK). */
export async function acquireSuspicionAppealLock(db: Db, pariwarId: PariwarId, deceasedMemberId: MemberId): Promise<void> {
  await takeXactLock(db, suspicionAppealAdvisoryLockKey(pariwarId, deceasedMemberId));
}

/** Take RF6's per-death reversal key (transaction-scoped). */
export async function acquireSuspicionReversalLock(db: Db, pariwarId: PariwarId, deceasedMemberId: MemberId): Promise<void> {
  await takeXactLock(db, suspicionReversalAdvisoryLockKey(pariwarId, deceasedMemberId));
}

/**
 * ⭐ RF5 — THE WAIT, the approval gate's FINAL-only conjunct (`assertClaimApprovable` with `step: 'final'`, after the
 * ground inspection and before the late-warning wait). Takes RF15's key UNCONDITIONALLY, FIRST — a read before the key
 * could miss an anchor an initiation committed while holding it — then reads RF1 (whose statement clock is read after the
 * key) and refuses with `SuspicionAppealPendingError` while another claim of the death's refusal can still be appealed or
 * is under appeal. ⛔ Never a denial. ⚠ READS the refused claim's decision and anchor with ⛔ no lock (Trap 8): the
 * caller holds the HELD claim's locks; ⛔ nothing here waits on the refused claim's.
 */
export async function assertSuspicionAppealDecidedForFinalApproval(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
  deceasedMemberId: MemberId,
): Promise<void> {
  await acquireSuspicionAppealLock(db, pariwarId, deceasedMemberId);
  const state = suspicionAppealWaitState(await readStandingSuspicionRefusals(db, pariwarId, deceasedMemberId), claimCaseId);
  if (state.waits) throw new SuspicionAppealPendingError(claimCaseId, state.reason, state.heldByClaimCaseId);
}

function toDate(v: Date | string): Date {
  return v instanceof Date ? v : new Date(v);
}
