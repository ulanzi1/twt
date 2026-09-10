// The MEMBER'S DRIVE LIST read — Story 11b.15 (Task 2; AC2, AC3, AC7, AC8b).
//
// One bounded page of every Sahyog Drive in the MEMBER'S OWN Pariwar: the drive's identity, its
// stage, its district, its close/settle instant, its confirmed contribution count, the ruled money
// figure, the nominee's name CIPHERTEXT and — for the deceased member the drive is FOR — the KYC
// name CIPHERTEXT AS STORED.
//
// ── ⛔ THIS MODULE DECIDES A RENDER, NEVER A BENEFIT ─────────────────────────────────
// The posture is `public-read.ts`'s, and for the same reason. It reads `pools.current_state` only
// to decide whether a row appears on a screen. ⛔ No `is_valid`, no `is_assignable`, no
// eligibility, pool-assignment, validity or peer-mesh predicate is written, conjoined or consulted
// here (AI-10-1; Story 11b.15's Policy-meaning block states this explicitly rather than omitting
// it). ⛔ A diff in which a drive-listing predicate reaches an eligibility path must be rejected.
//
// ── ⛔ THE CLAIM'S SUBJECT COMES FROM THE CLAIM, ⛔ NEVER FROM A LIFECYCLE STATE ─────
// `pools.claim_case_id` → `claims.deceased_member_id` IS the subject fact. ⛔ No predicate here may
// re-derive that subject from `members.state`, and it does not need to: the condition is an
// OVERLAY, ⛔ never a lifecycle label, so such a predicate is blind to it BY CONSTRUCTION.
//
// ── TRANSPORT-FREE AND ⛔ DECRYPT-FREE BY RULE ───────────────────────────────────────
// ⛔ NO HTTP, ⛔ no audit, ⛔ no decryption, ⛔ no permission check. This module returns
// `name_ciphertext` exactly as `member_kyc_profiles` stores it; the decrypt — and the FORM decision
// — belong to `apps/api/src/modules/member-pool/`.
//
// ── ⭐ ONE SET-BASED QUERY, ⛔ NEVER A PER-ROW FAN-OUT (11b.1 D7(a), AR-65) ───────────
// ⚠⛔ **AND THIS IS THE ONE PLACE THIS SURFACE DELIBERATELY DOES ⛔ NOT COPY THE YOGDAAN BAHI.**
// `contribution-history` resolves each pool's identity through `resolvePoolIdentity`, memoized per
// DISTINCT pool (`member-pool/handlers.ts:836-864`). ⭐ That is right THERE — a passbook lists a
// member's own contributions, so the distinct-pool count is small and bounded by what one person
// paid. ⛔ It is wrong HERE: this list is a Pariwar's WHOLE drive history, paginated at up to
// `MEMBER_DRIVE_LIST_PAGE_SIZE_CAP` rows, and `resolvePoolIdentity` costs TWO point reads per pool
// (`getClaimCase` + `getMemberKycProfile`) ⇒ a full page would be 100 extra round-trips. That is
// precisely the AR-65 N+1 `public-read.ts`'s D7(a) header exists to shut, arriving through a third
// door.
// ⇒ ⭐ the claim and KYC joins are SET-BASED below, exactly as the public index does them, and the
// FORM decision happens at the boundary through the ⛔ one shared pure resolver.
//
// ⚠⛔ **WHAT THAT COSTS, STATED RATHER THAN GLOSSED.** Story `8-16` **AC2b** reads
// *"`resolvePoolIdentity` stays the ONE join site"*. ⭐ That AC governs `8-16`'s FOUR consumers —
// the My Pool card, the Yogdaan Bahi, the Contribution Note and the outbound push — and this is a
// FIFTH surface, created after it. ⛔ The prohibition it enforces is against **re-deriving a name
// FORM**, and that prohibition is honoured here **exactly**: the form is decided by
// {@link notifications.resolveMemberFacingDeceasedName}, the ⛔ one site where
// `resolvePoolIdentity` itself decides it (`notifications/pool-identity.ts:141`). ⇒ ⛔ there is
// ⛔ no second form rule, and ⛔ no possibility of the two member surfaces disagreeing about a name.
// ⚠ ⛔ What this surface does ⛔ not inherit is the per-pool JOIN, and ⛔ that is a performance
// decision, ⛔ not a policy one. ⭐ Recorded here so a later reader does ⛔ not "restore" the
// per-pool call and reintroduce the N+1 believing AC2b requires it.
//
// ⚠⛔ **AND ⛔ NEVER `resolvePublicMemberName` ON THIS PATH.** The two resolvers share the stored
// mode and the form rule and differ ⛔ only in ABSENCE behaviour — the public omits a mononym under
// `shielded_name`, the member SHOWS it (`8-16` Trap 5). Reusing the public one would omit a
// member's own drive row over a single-token name.

import { and, desc, eq, inArray, sql } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { PariwarId, PoolId } from '../ids/index.js';
import { clampLimit } from '../pagination.js';
import { claims } from '../schema/claims.js';
import { memberKycProfiles } from '../schema/member_kyc_profiles.js';
import { pools } from '../schema/pools.js';
import { classifyCycleOutcome, type CycleFundingOutcome } from '../close-of-cycle/framing.js';
import { resolveDriveTargetVisibility } from './drive-target-policy.js';
import {
  ASSIGNED_MEMBER_COUNT,
  CONFIRMED_CONTRIBUTION_COUNT,
  DECEASED_DISTRICT,
  DRIVE_CLOSED_AT,
  NOMINEE_ACCOUNT_HOLDER_NAME_CIPHERTEXT,
  coerceDriveInstant,
  driveConfirmedPercentage,
  publicStatusForPoolState,
  resolveDriveTargetForMembers,
  type SahyogDriveStatus,
  type SahyogDriveVisiblePoolState,
} from './public-read.js';

/**
 * ⭐⭐ **THIS SURFACE'S OWN VISIBLE-STATE TUPLE — `2026-09-04-196`.**
 *
 * ⛔⛔ **DECLARED HERE EXPLICITLY, AND ⛔ NEVER IMPORTED FROM
 * `SAHYOG_DRIVE_VISIBLE_POOL_STATES`** — the `sahyog-vivran-read.ts:124` precedent, under
 * `public-read.ts:283-284`'s standing rule (*"a consumer needing different semantics needs its OWN
 * fragment with its own name, ⛔ never a parameter bolted onto one of these"*).
 *
 * ⚠⛔⛔ **AND THE TWO TUPLES NOW READ IDENTICALLY, WHICH IS EXACTLY WHY THIS COMMENT EXISTS.**
 * Story 11b.14 (AC1) widened the PUBLIC tuple to `['live','closed','settled']` on 2026-09-07, so a
 * reader diffing the two files finds the same three words twice and concludes one should import the
 * other. ⛔ **That coincidence is a TRAP, ⛔ not a licence.** The two agree *today* by accident of
 * **two separate rulings** — `2026-09-04-189` cl.2(a) for the public index, `2026-09-04-196` for
 * this list — and **either may move alone**. Importing the public constant would make a future
 * public-only widening silently change what a member sees.
 *
 * ⛔ **AND THIS FRAGMENT IS ⛔ NOT ADDED TO `SAHYOG_DRIVE_VISIBLE_POOL_STATES`'s five-artefact
 * fan-out list** (`public-read.ts:119-125`): that list enumerates what must change together when
 * the PUBLIC tuple moves, and this tuple is ⛔ not one of them.
 *
 * ── ⛔ WHY `spawned` IS EXCLUDED, AND THE GROUND IS ⛔ NOT TIDINESS ──────────────────
 * ⭐⭐ A `spawned` pool follows an **APPROVED CLAIM**, before contributions open. ⇒ listing it would
 * disclose **the claim's underlying event, and its approval, to the whole Pariwar — earlier than any
 * surface does today**. ⛔ That is a **DISCLOSURE CHANGE**, ⛔ not a filter widening, and it is why
 * this tuple may ⛔ not be widened "for completeness" by anyone but the Panel.
 *
 * ⚠⛔ **THE SENTENCE ABOVE IS DELIBERATELY CATEGORY-AGNOSTIC, AND THE GATE IS WHY.** Story 11b.15's
 * own Trap 2 states this ground using the vocabulary of ONE `support_category`; ⛔ that wording may
 * ⛔ not be repeated in a pool-engine file. `pool-support-category-invariant` scans **COMMENTS** as
 * well as code, on the stated ground that *"a pool-engine comment thinking in category-specific
 * terms is itself the smell"* (Story 7.1 **AC4**) — ⭐ and it caught this exact line, twice.
 * ⛔ The engine has ⛔ NO category-specific branches, and v2 `_daan` activation is a config change,
 * ⛔ not an engine refactor. ⇒ the DISCLOSURE argument holds for **every** `support_category`, which
 * is precisely what the reworded sentence says and what the story's own phrasing did not.
 * ⭐ In the member's own terms: *"you see every drive your Pariwar has actually collected for; a
 * drive that has only just been approved is not shown to anyone yet."*
 */
export const MEMBER_DRIVE_LIST_VISIBLE_POOL_STATES = ['live', 'closed', 'settled'] as const;
export type MemberDriveListVisiblePoolState =
  (typeof MEMBER_DRIVE_LIST_VISIBLE_POOL_STATES)[number];

/**
 * ⭐⭐ A TOTAL WIDENING from THIS surface's tuple into the public one — a **compile-time proof**,
 * ⛔ not a cast and ⛔ not a second stage mapping.
 *
 * ⚠⛔ **TRAP 2 FORBIDS A SECOND STAGE MAPPING, AND THIS IS ⛔ NOT ONE.** It mints ⛔ no stage word:
 * `PUBLIC_STATUS_BY_POOL_STATE` remains the ⛔ ONE place `live`/`closed`/`settled` become
 * `Live`/`Closed`/`Verified`. All this does is carry a member-tuple value into the public tuple's
 * type ⭐ WITH THE COMPILER WATCHING.
 *
 * ⇒ if a later story widens {@link MEMBER_DRIVE_LIST_VISIBLE_POOL_STATES} alone — which this file's
 * own doc-block explicitly contemplates (*"either may move alone"*) — the `never` arm stops
 * compiling and the author is forced to decide what the new state means PUBLICLY, which is exactly
 * what the erased `as` cast let them skip. ⛔ Do ⛔ not replace this with a cast again.
 */
function asPublicVisiblePoolState(
  state: MemberDriveListVisiblePoolState,
): SahyogDriveVisiblePoolState {
  switch (state) {
    case 'live':
      return 'live';
    case 'closed':
      return 'closed';
    case 'settled':
      return 'settled';
    default: {
      const unreachable: never = state;
      throw new Error(
        `member drive list: pool state ${String(unreachable)} is visible to members but has no public counterpart — mint one deliberately`,
      );
    }
  }
}

/**
 * ⭐ The page bounds. ⚠ Deliberately this surface's OWN pair rather than the public index's —
 * ⛔ same reason as the tuple above. ⚠ The cap is what `clampLimit` enforces, and ⛔ a member may
 * ⛔ not exceed it by asking.
 */
export const MEMBER_DRIVE_LIST_PAGE_SIZE_DEFAULT = 20;
export const MEMBER_DRIVE_LIST_PAGE_SIZE_CAP = 50;

/**
 * ⭐ One drive, as the substrate holds it, for the MEMBER'S list.
 * ⛔ Both names on this row are CIPHERTEXT, ⛔ not names — this module never decrypts.
 */
export interface MemberDriveListEntry {
  /** The pool's canonical id. ⚠ INTERNAL — ⛔ never serialized onto the member wire. */
  poolId: PoolId;
  /** The 0-based index within the cycle; `poolLetterCode()` is a pure function of it. */
  poolIndex: number;
  /** `P-YYYY-MM-###` (Story 7.2). */
  poolCanonicalIdentifier: string;
  /**
   * ⭐ THE DRIVE'S OPAQUE PUBLIC ADDRESS TOKEN — Story 11b.10.
   * ⚠ It rides here because **AC3's floor includes `drive_href`**: the public index links every row
   * to `/sahyog-vivran/[driveToken]`, so a member row without it would show **LESS** than the
   * public one — the `2026-09-04-189` cl.3 inversion this story exists to prevent.
   * ⛔ The client ⛔ NEVER derives an address from `poolCanonicalIdentifier`.
   */
  publicToken: string;
  /**
   * **Live · Closed · Verified** — story B's ruled vocabulary, via
   * {@link publicStatusForPoolState}.
   * ⭐⭐ **THE MAPPING IS REUSED ON PURPOSE, AND THAT IS ⛔ NOT THE SAME MISTAKE AS IMPORTING THE
   * TUPLE ABOVE.** Trap 2 says in terms: *"THE STAGE MAPPING IS ALREADY TOTAL — ⛔ do ⛔ not invent
   * a second one"*, and **AC4** requires this surface's words to **AGREE** with
   * `PUBLIC_STATUS_BY_POOL_STATE`. ⇒ calling its totality-asserting accessor is what MAKES them
   * agree; a private copy is what would let them drift. ⚠ The **tuple** decides *which drives a
   * member sees* (a disclosure question, ruled separately); the **mapping** decides *what a stage is
   * called* (ruled ONCE, by `-193` cl.1). ⛔ Different questions.
   */
  status: SahyogDriveStatus;
  /** The close/settle instant. `null` while the pool's stream carries no such event. */
  driveClosedAt: Date | null;
  /** The deceased member's latest posting district, RAW. `null` = no posting row. */
  district: string | null;
  /** Confirmed contributions, reversals compensated (Story 9.5's canonical financial truth). */
  confirmedContributionCount: number;
  /**
   * The meter's fill, 0-100.
   * ⚠⛔ **`null` UNLESS THE DRIVE IS `live` — MIRRORING THE PUBLIC WIRE, DELIBERATELY.**
   * Trustee-ratified `2026-09-08-207` cl.1 closed the roster-size-by-division channel for ARCHIVED
   * public rows. ⭐ AC3 is a **FLOOR**: the public is `null` off-Live, so `null` here satisfies
   * *member ≥ public* exactly. ⛔ Carrying a number here instead would be showing a member MORE than
   * the Panel ruled — Trap 5: cl.3 is a floor, ⛔ **not a licence**.
   */
  confirmedPercentage: number | null;
  /**
   * ⭐⭐ **लक्ष्य — GATED ON `revealToMembers`** (`#decision-2026-09-09-211`).
   * See {@link resolveDriveTargetForMembers}. ⛔ `null` for every Pariwar at launch (fail-closed).
   * ⚠ Live rows only — the same ruled slot the public figure occupies (`-204` cl.2), so the floor is
   * met without inventing a new one.
   */
  driveTargetInr: number | null;
  /** Pool-Reality #2 as an OPAQUE ENUM. `null` ⇒ no expectation was ever set — SILENCE. */
  fundingOutcome: CycleFundingOutcome | null;
  /** `confirmedContributionCount × pools.fixed_amount` — 9.12 D3's canonical identity, computed ONCE. */
  amountRaisedInr: number;
  /** The nominee's name, CIPHERTEXT. `null` when bank details were never collected. */
  nomineeAccountHolderNameCiphertext: string | null;
  /** Tier-1 `member_kyc_profiles.name_ciphertext` AS STORED, or `null` when there is no profile. */
  deceasedNameCiphertext: string | null;
}

export interface ListMemberDriveOptions {
  /** Page size. ⛔ Routed through `clampLimit` — the `domain-accessor-invariants` invariant. */
  limit?: number;
  /** Row offset. Bounded at 0 below. */
  offset?: number;
  /** The as-of instant. Injected rather than read from the clock so a test can pin it. */
  now?: Date;
}

/**
 * The listing predicate, shared by the page read and the count so the two cannot drift into two
 * different lists. ⛔ Never re-spell either half at a call site.
 *
 * ⚠⛔ **IT TAKES ⛔ NO `now`, AND THAT IS ⛔ NOT AN OVERSIGHT.** The public index's twin does,
 * because its three ruled SEARCH FILTERS are time-bounded. ⭐ This list has ⛔ no filters at all
 * (`-196` gives it three states and nothing else), so its predicate is time-INDEPENDENT — the only
 * time-bounded fragments here are the SELECTED values, which both callers already resolve from one
 * injected instant. ⛔ Do ⛔ not add a `now` parameter "for symmetry"; an unused one would read as a
 * filter that had been dropped.
 *
 * ⭐⭐ **`pariwar_id` IS AN EXPLICIT PREDICATE, ⛔ NOT ONLY RLS — AND HERE IT IS AC2's TEETH.**
 * `2026-09-04-196` scopes this list to the member's OWN Pariwar, and **family 12** forbids scoping
 * a member read by a client-supplied id. ⇒ the caller resolves `pariwarId` **from the session** and
 * passes it here; this predicate then holds even if a caller ever hands over a BYPASSRLS handle.
 */
function memberDrivePredicate(pariwarId: PariwarId) {
  return and(
    eq(pools.pariwarId, pariwarId),
    inArray(pools.currentState, [...MEMBER_DRIVE_LIST_VISIBLE_POOL_STATES]),
  );
}

/**
 * Resolve ONE page of the member's drive list in ONE query.
 *
 * ⭐ THE ORDER IS live-first, then the close/settle instant DESCENDING, with a primary-key
 * tie-break — the public index's order, and every part of it is load-bearing:
 *   · **live first** — a live row's `driveClosedAt` is structurally NULL, so without the first key
 *     the drive collecting NOW sorts dead last, behind every archived one. Story 11b.14 paid for
 *     that discovery on the public index; ⛔ do ⛔ not re-discover it here.
 *   · **a deterministic tail** — offset paging over a non-deterministic order silently duplicates
 *     rows onto one page and drops them from another.
 * ⛔ **AND THE ORDER IS ⛔ NOT A RANKING** — ⛔ never by contribution count, ⛔ never by amount, and
 * ⛔ no *"most-supported"* view at any tier. 11b.1 **AC5** forbids ordering drives against each
 * other, and it binds this surface exactly as it binds the public one.
 *
 * ⚠ THE JOIN TO `claims` IS AN INNER JOIN ON PURPOSE — a pool with no claim has no subject and no
 * drive to list. THE JOIN TO `member_kyc_profiles` IS A **LEFT** JOIN, equally on purpose: a
 * missing profile omits the NAME and ⛔ keeps the ROW. ⭐ That is AC3's floor in the query shape —
 * the public index keeps a nameless row, so this list may ⛔ never drop one.
 */
export async function listMemberPariwarDrives(
  db: Db,
  pariwarId: PariwarId,
  opts: ListMemberDriveOptions = {},
): Promise<MemberDriveListEntry[]> {
  const now = opts.now ?? new Date();
  const offset = Math.max(0, opts.offset ?? 0);

  // ⭐⭐ THE REVEAL GATE, RESOLVED ONCE PER PAGE — ⛔ never per row (it is a Pariwar-level posture,
  // and a per-row read would be an N+1 on a constant). ⭐ This call is the FIRST production consumer
  // `2026-09-04-190` cl.7(c)'s MEMBER arm has ever had (`#decision-2026-09-09-211`).
  // ⚠⛔ ⛔ `resolveEffectiveDriveTargetInr` is ⛔ NOT called — लक्ष्य is DERIVED and there is ⛔ no
  // setter (`-204` cl.2). ⭐ The absent-row default is FAIL-CLOSED, so an RLS scope failure lands on
  // non-disclosure.
  const targetVisibility = await resolveDriveTargetVisibility(db, pariwarId);

  const rows = await db
    .select({
      poolId: pools.poolId,
      poolIndex: pools.poolIndex,
      poolCanonicalIdentifier: pools.poolCanonicalIdentifier,
      publicToken: pools.publicToken,
      currentState: pools.currentState,
      fixedAmount: pools.fixedAmount,
      deceasedNameCiphertext: memberKycProfiles.nameCiphertext,
      district: DECEASED_DISTRICT(now),
      driveClosedAt: DRIVE_CLOSED_AT(now),
      // ⚠ `count(*)` is `bigint` ⇒ the driver hands back a STRING. Coerced at this boundary.
      confirmedCount: CONFIRMED_CONTRIBUTION_COUNT(now),
      assignedCount: ASSIGNED_MEMBER_COUNT,
      nomineeAccountHolderNameCiphertext: NOMINEE_ACCOUNT_HOLDER_NAME_CIPHERTEXT,
    })
    .from(pools)
    .innerJoin(claims, eq(claims.claimCaseId, pools.claimCaseId))
    .leftJoin(memberKycProfiles, eq(memberKycProfiles.memberId, claims.deceasedMemberId))
    .where(memberDrivePredicate(pariwarId))
    .orderBy(
      sql`(${DRIVE_CLOSED_AT(now)} IS NULL) DESC`,
      sql`${DRIVE_CLOSED_AT(now)} DESC NULLS LAST`,
      desc(pools.poolId),
    )
    .limit(
      // ⛔⛔ `clampLimit` IS MANDATORY — the `domain-accessor-invariants` CI gate fails any dynamic
      // `.limit()` without it, and `Math.min(limit, cap)` does ⛔ NOT satisfy it
      // ([[project_domain_limit_clamp_and_savepoint_retry]]).
      clampLimit(opts.limit, {
        default: MEMBER_DRIVE_LIST_PAGE_SIZE_DEFAULT,
        cap: MEMBER_DRIVE_LIST_PAGE_SIZE_CAP,
      }),
    )
    .offset(offset);

  return rows.map((r) => {
    const confirmedContributionCount = Number(r.confirmedCount ?? 0);
    const assignedCount = Number(r.assignedCount ?? 0);
    // ⭐⭐ HOISTED, ⛔ NOT DUPLICATED — the SAME binding feeds `classifyCycleOutcome`'s
    // `deliveredTotal` and the ruled money figure. ⛔⛔ A second `× fixedAmount` anywhere would be
    // the defect (11b.3 D1(c); [[project_amount_raised_canonical_producer]]).
    // ⚠⛔ CLAMPED AT 0 for a non-positive `fixed_amount` — `pools.fixed_amount` carries ⛔ no DB
    // positivity CHECK, and a negative product would fail the contract's `.nonnegative()` and 500
    // the whole page.
    // [Review][Patch] — code review of 11b-15-member-drive-list-fourth-tab, FOURTH pass
    // (2026-09-10): the clamp used to fire silently. `console.warn`, ⛔ not a logger param — this
    // accessor is pure and takes none, matching `notifications/pool-identity.ts`'s existing
    // `[module-tag]` idiom for a domain-layer anomaly that should be visible without one.
    const rawDeliveredTotal = confirmedContributionCount * r.fixedAmount;
    if (rawDeliveredTotal < 0) {
      console.warn(
        `[member-drive-list] negative deliveredTotal clamped to 0 (pool=${r.poolId}, fixedAmount=${r.fixedAmount}, confirmedCount=${confirmedContributionCount})`,
      );
    }
    const deliveredTotal = Math.max(0, rawDeliveredTotal);
    const currentState = r.currentState as MemberDriveListVisiblePoolState;
    const isLive = currentState === 'live';
    return {
      poolId: r.poolId,
      poolIndex: r.poolIndex,
      poolCanonicalIdentifier: r.poolCanonicalIdentifier,
      publicToken: r.publicToken,
      // [Review][Patch] — code review of 11b-15-member-drive-list-fourth-tab (2026-09-09), THIRD
      // pass. ⚠⛔ THIS USED TO BE `currentState as SahyogDriveVisiblePoolState`, justified as *"the
      // two tuples are structurally identical, so this cast is safe by construction"* — ⛔ a claim
      // about TODAY'S VALUES, ⛔ not about the invariant. ⚠ This file's own doc-block says the two
      // tuples *"may move alone"*, and `PUBLIC_STATUS_BY_POOL_STATE` is deliberately typed
      // `Record<SahyogDriveVisiblePoolState, …>` *"precisely so that widening the visible set
      // without minting a public word FAILS TO COMPILE"* — a gate that ⭐ actually FIRED at 11b.14.
      // ⇒ the cast was the ⛔ one call site routing around it: widen the MEMBER tuple alone and the
      // lookup silently yields `undefined`, `status: undefined` fails response serialization, and
      // ⛔ EVERY page of the list 5xxs for that Pariwar — ⛔ not just the new rows.
      status: publicStatusForPoolState(asPublicVisiblePoolState(currentState)),
      // ⭐ COERCED — the raw `sql` fragment hands back an ISO STRING despite its declared type.
      driveClosedAt: coerceDriveInstant(r.driveClosedAt),
      district: r.district,
      confirmedContributionCount,
      confirmedPercentage: isLive
        ? driveConfirmedPercentage(confirmedContributionCount, assignedCount)
        : null,
      // ⭐ लक्ष्य on the MEMBER axis, gated. ⛔ `null` for every Pariwar until a `super_admin` acts.
      driveTargetInr: isLive
        ? resolveDriveTargetForMembers(assignedCount, r.fixedAmount, targetVisibility)
        : null,
      // ⭐⛔ ZERO ASSIGNEES ⇒ ⛔ NO CLASSIFICATION AT ALL, ⛔ never a vacuous one: `expectedTotal`
      // would be 0 and `0 >= 0` is TRUE, so the classifier returns `fully_funded` for a drive that
      // collected nothing. ⚠ A non-positive `fixed_amount` takes the same branch, for the same
      // reason. ⛔ `classifyCycleOutcome` is NOT patched — it is shared with three other surfaces.
      fundingOutcome:
        assignedCount === 0 || r.fixedAmount <= 0
          ? null
          : classifyCycleOutcome({
              expectedTotal: assignedCount * r.fixedAmount,
              deliveredTotal,
            }),
      amountRaisedInr: deliveredTotal,
      nomineeAccountHolderNameCiphertext: r.nomineeAccountHolderNameCiphertext,
      deceasedNameCiphertext: r.deceasedNameCiphertext,
    };
  });
}

/**
 * Count the drives this list would show, under the SAME predicate.
 *
 * ⭐ WHY IT EXISTS: the honest *"next page"* affordance needs a real total. ⛔ Deriving *"there is a
 * next page"* from a full-page result is a lie — a list with exactly `limit` drives would advertise
 * an empty page 2.
 *
 * ⚠ `total` IS LIST SIZE, ⛔ NOT RENDERED-ROW COUNT — and here the two actually agree, because an
 * unresolvable name omits the NAME and ⛔ never the ROW (AC3). ⛔ Never add an omission count: a
 * per-row *"name withheld"* tally is an enumeration signal in its own right.
 *
 * ⚠⛔ **IT TAKES ⛔ NO `now`, AND ITS PUBLIC TWIN DOES — ⭐ that asymmetry is CORRECT, ⛔ not an
 * oversight.** `countPublicSahyogDrivePools` needs one because its predicate embeds three
 * time-bounded SEARCH FILTERS; {@link memberDrivePredicate} has ⛔ none, so this count is
 * time-INDEPENDENT and an injected instant could ⛔ not change its answer. ⛔ Do ⛔ not add a `now`
 * parameter "to match the sibling" — an unused one reads as a filter someone dropped, and the next
 * author would go looking for it.
 */
export async function countMemberPariwarDrives(db: Db, pariwarId: PariwarId): Promise<number> {
  const rows = await db
    .select({ total: sql<string>`count(*)` })
    .from(pools)
    .innerJoin(claims, eq(claims.claimCaseId, pools.claimCaseId))
    .where(memberDrivePredicate(pariwarId));

  // ⚠ `count(*)` is bigint ⇒ a STRING from the driver.
  return Number(rows[0]?.total ?? 0);
}
