// ⭐⭐ THE MEMBER'S VIEW OF **ONE** DRIVE — Story 11b.17 (Task 2; AC1, AC2, AC3, AC4, AC8).
//
// ONE drive in the MEMBER'S OWN Pariwar, resolved by its OPAQUE PUBLIC ADDRESS TOKEN: its identity,
// its stage, its district, its close/settle instant, its confirmed count, the ruled money figures,
// the deceased member's KYC name CIPHERTEXT as stored, and — ⭐ **the thing this whole story exists
// for** — the claim's nominee bank accounts, CIPHERTEXT AS STORED, with their Tier-3 plaintext
// `bank_name` / `branch` beside them.
//
// ── ⛔ THIS MODULE DECIDES A RENDER, ⛔ NEVER A BENEFIT ──────────────────────────────────────────
// The posture is `public-read.ts`'s and `member-drive-list.ts`'s, for the same reason. It reads
// `pools.current_state` ⛔ only to decide whether a drive appears on a screen. ⛔ No `is_valid`, ⛔ no
// `is_assignable`, ⛔ no eligibility, pool-assignment, validity or peer-mesh predicate is written,
// conjoined or consulted here (AI-10-1). ⛔ A diff in which a drive-detail predicate reaches an
// eligibility path must be rejected.
//
// ── ⛔ THE CLAIM'S SUBJECT COMES FROM THE CLAIM, ⛔ NEVER FROM A LIFECYCLE STATE ────────────────
// `pools.claim_case_id` → `claims.deceased_member_id` IS the subject fact. ⛔ No predicate here may
// re-derive that subject from `members.state`: the condition is an OVERLAY, ⛔ never a lifecycle
// label, so such a predicate is blind to it BY CONSTRUCTION
// ([[project_death_is_an_overlay_not_a_state]]).
//
// ── TRANSPORT-FREE AND ⛔ DECRYPT-FREE BY RULE ─────────────────────────────────────────────────
// ⛔ NO HTTP, ⛔ no audit, ⛔ no decryption, ⛔ no permission check. This module returns ciphertext
// EXACTLY as the substrate stores it; the decrypt, the FORM decision and the AUDIT LINE belong to
// `apps/api/src/modules/member-pool/`.
//
// ── ⭐ ONE DRIVE, SO ⛔ NO N+1 DOOR IS OPEN — and ⛔ no `clampLimit` is owed ────────────────────
// This read is single-row by a unique key and takes ⛔ NO caller-supplied limit, so the
// `domain-accessor-invariants` gate (which clamps every DYNAMIC `.limit()`) has ⛔ nothing to clamp
// here — the same position `sahyog-vivran-read.ts` states for itself
// ([[project_domain_limit_clamp_and_savepoint_retry]]). ⚠ If a future story ever renders MANY drives
// through this module, the nominee-account read below must become a lateral aggregate BEFORE it is
// called in a loop.

import { and, eq, sql } from 'drizzle-orm';

import { getClaimNomineeBankAccountsCiphertext } from '../claim/nominee-bank-read.js';
import { classifyCycleOutcome, type CycleFundingOutcome } from '../close-of-cycle/framing.js';
import type { Db } from '../db.js';
import type { ClaimId, PariwarId, PoolId } from '../ids/index.js';
import { claims } from '../schema/claims.js';
import { memberKycProfiles } from '../schema/member_kyc_profiles.js';
import { pools } from '../schema/pools.js';
import { resolveDriveTargetVisibility } from './drive-target-policy.js';
import {
  ASSIGNED_MEMBER_COUNT,
  CONFIRMED_CONTRIBUTION_COUNT,
  DECEASED_DISTRICT,
  DRIVE_CLOSED_AT,
  coerceCount,
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
 * ⛔⛔ **DECLARED HERE EXPLICITLY, AND ⛔ NEVER IMPORTED FROM `SAHYOG_DRIVE_VISIBLE_POOL_STATES`,
 * `SAHYOG_VIVRAN_VISIBLE_POOL_STATES` OR `MEMBER_DRIVE_LIST_VISIBLE_POOL_STATES`.** `-196`
 * **Consequence 2** (re-applied to this story by `2026-09-10-212` Consequence 2) forbids **sharing or
 * parameterising** the list's tuple, and `sahyog-vivran-read.ts` set the precedent of declaring its
 * own beside three identical ones.
 *
 * ⚠⛔ **THE FOUR TUPLES NOW READ IDENTICALLY, WHICH IS EXACTLY WHY THIS COMMENT EXISTS.** A reader
 * diffing them finds the same three words four times and concludes one should import another.
 * ⛔ **That coincidence is a TRAP, ⛔ not a licence.** They agree *today* by accident of **separate
 * rulings** — `-189` cl.2(a) for the public index, `-196` for the member list, and this one — and
 * **any may move alone**. Importing another surface's constant would make a future widening
 * **somewhere else** silently change what a member sees **here**.
 *
 * ⚠⛔ **A BORROWED PRINCIPLE, ⛔ NOT A LITERAL CITATION.** `-196` Consequence 2 **quotes**
 * `public-read.ts`'s standing sentence (*"a consumer needing different semantics needs its OWN
 * fragment with its own name, ⛔ never a parameter bolted onto one of these"*) and applies it **by
 * analogy** to the pool-state tuple — ⭐ a move the decision log made. ⚠ That sentence is itself the
 * doc-comment of the four correlated **SQL count fragments**, ⛔ not of the tuple. ⇒ ⭐ `-196`
 * Consequence 2 is authority enough on its own; ⛔ do ⛔ not re-cite the code passage as though it
 * were literally about this tuple (corrected 2026-09-13).
 *
 * ── ⛔ WHY `spawned` IS EXCLUDED, AND THE GROUND IS ⛔ NOT TIDINESS ────────────────────────────
 * ⭐⭐ A `spawned` pool follows an **APPROVED CLAIM**, before contributions open. ⇒ showing it would
 * disclose **the claim's underlying event, and its approval, to the whole Pariwar — earlier than any
 * surface does today**, and on THIS surface it would additionally expose a bereaved family's banking
 * coordinates before a single contribution had been asked for. ⛔ That is a **DISCLOSURE CHANGE**,
 * ⛔ not a filter widening, and it is why this tuple may ⛔ not be widened "for completeness" by
 * anyone but the Panel.
 * ⚠⛔ The sentence above is deliberately **CATEGORY-AGNOSTIC**: `pool-support-category-invariant`
 * scans COMMENTS as well as code, on the stated ground that *"a pool-engine comment thinking in
 * category-specific terms is itself the smell"* (Story 7.1 AC4). ⭐ The disclosure argument holds for
 * **every** `support_category`.
 */
export const MEMBER_DRIVE_DETAIL_VISIBLE_POOL_STATES = ['live', 'closed', 'settled'] as const;
export type MemberDriveDetailVisiblePoolState =
  (typeof MEMBER_DRIVE_DETAIL_VISIBLE_POOL_STATES)[number];

/**
 * ⭐⭐ A TOTAL WIDENING from THIS surface's tuple into the public one — a **compile-time proof**,
 * ⛔ not a cast and ⛔ not a second stage mapping.
 *
 * ⚠⛔ **IT MINTS ⛔ NO STAGE WORD.** `PUBLIC_STATUS_BY_POOL_STATE` (`public-read.ts`) remains the
 * ⛔ ONE place `live`/`closed`/`settled` become `Live`/`Closed`/`Verified` (`-193` cl.1). All this
 * does is carry a value from this tuple into the public tuple's type ⭐ WITH THE COMPILER WATCHING.
 *
 * ⇒ if a later story widens {@link MEMBER_DRIVE_DETAIL_VISIBLE_POOL_STATES} alone — which this file's
 * own doc-block explicitly contemplates — the `never` arm stops compiling and the author is forced to
 * decide what the new state means PUBLICLY. ⛔ Do ⛔ not replace this with an `as` cast: the member
 * LIST carried exactly that cast until its third review pass, and it was the ⛔ one call site routing
 * around the gate.
 */
function asPublicVisiblePoolState(
  state: MemberDriveDetailVisiblePoolState,
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
        `member drive detail: pool state ${String(unreachable)} is visible to members but has no public counterpart — mint one deliberately`,
      );
    }
  }
}

/**
 * ⭐⭐ **THIS SURFACE'S OWN `live`-ONLY लक्ष्य FRAGMENT — `2026-09-10-212` cl.1 + Consequence 2.**
 *
 * ⛔⛔ **DECLARED HERE, AND ⛔ NEVER SHARED WITH OR PARAMETERISED ONTO THE LIST'S.** `-212`
 * Consequence 2 re-applies `-196` Consequence 2 to exactly this: the list enforces the same rule
 * inline (`status === 'live' ? … : null`) and the two are separately ruled — the list's slot by
 * `-204` cl.12's *"on a LIVE row"*, this one by `-212` cl.1's *"`live` drives ONLY"*. ⚠ They agree
 * today; **either may move alone**.
 *
 * ⚠⛔ **THE ARGUMENT IS IN POOL-STATE VOCABULARY** — `live` | `closed` | **`settled`**. ⛔ The WIRE
 * tokens are `live` | `closed` | **`verified`**, and a comparison written against `settled` on the
 * wire side matches ⛔ **nothing**. ⭐ The two vocabularies are ⛔ never mixed in one assertion (AC1).
 *
 * ⚠⛔⛔ **AND IT IS GATED, FAIL-CLOSED — ⛔ THIS IS ⛔ NOT OPTIONAL POLISH.** The caller must resolve
 * `visibility` through {@link resolveDriveTargetVisibility} and ⛔ **NEVER**
 * `getDriveTargetVisibilityRow` — *"a caller interpreting it is exactly how a fail-closed default
 * becomes fail-open"* (`-211` cl.3). ⚠ A miss is a **DISCLOSURE defect**, ⛔ not a UI defect
 * (`-211` Consequence 4). ⭐ ⛔ No Pariwar has a row ⇒ this returns `null` for **every** Pariwar on the
 * day this ships — ⭐ that is **CORRECT**, ⛔ never a bug to "fix".
 *
 * ⭐ The figure itself is **DERIVED** (`assignedCount × pools.fixed_amount`) by
 * {@link resolveDriveTargetForMembers} — ⛔ there is ⛔ no setter and ⛔ nobody types it (`-204` cl.2
 * supersedes `-190` cl.7(a)). ⛔ Nothing here may read `pariwar_drive_target_schedule` to "check" it.
 */
function resolveDetailDriveTargetInr(
  poolState: MemberDriveDetailVisiblePoolState,
  assignedCount: number,
  fixedAmount: number,
  visibility: Parameters<typeof resolveDriveTargetForMembers>[2],
): number | null {
  if (poolState !== 'live') return null;
  return resolveDriveTargetForMembers(assignedCount, fixedAmount, visibility);
}

/**
 * ⭐⭐ ONE NOMINEE BANK ACCOUNT, AS THE SUBSTRATE HOLDS IT — ⛔ the three Tier-1 values are
 * **CIPHERTEXT**, ⛔ not values. ⚠ The `Ciphertext` suffix is **MISUSE RESISTANCE**, ⛔ not decoration
 * (the 6.8 naming finding): a shape carrying ciphertext must ⛔ not be mistakable for the
 * already-decrypted API view.
 *
 * ⛔⛔ **`accountRank` IS COMPOSITE-PK IDENTITY** — ⛔ not a priority, ⛔ not a nominee rank, ⛔ not a
 * routing instruction. ⚠ `migrations/0056_claim-nominee-bank.sql:3` still calls them *"#1 (primary) /
 * #2"*; ⛔ **that header is STALE** (9.9 D3 / `-213` cl.1 — the two are **EQUAL**) and the schema file
 * is the correct one. ⛔ Do ⛔ not read an ordering out of the migration.
 */
export interface MemberDriveDetailNomineeAccount {
  /** `1` | `2` — row IDENTITY, ⛔ never a priority. */
  accountRank: 1 | 2;
  /** Tier-1 `account_holder_name_ciphertext` AS STORED. */
  accountHolderNameCiphertext: string;
  /** Tier-1 `account_number_ciphertext` AS STORED — ⭐ the FULL number; ⛔ never a last-4. */
  accountNumberCiphertext: string;
  /** Tier-1 `ifsc_ciphertext` AS STORED. ⚠ DIFFERS per account — see the contract's doc-block. */
  ifscCiphertext: string;
  /**
   * ⭐ Tier-3 PLAINTEXT, IFSC-derived, non-identifying — ⛔ never encrypted, ⛔ nothing to decrypt.
   * ⚠⛔ **`text NOT NULL` with ⛔ NO non-empty CHECK** ⇒ `''` is **REACHABLE**, and `''` is the exact
   * value that once **500'd the whole public transparency page** against a `z.string().min(1)`.
   * ⇒ the BOUNDARY degrades it ROW-LOCALLY; ⛔ this module passes it through AS STORED.
   */
  bankName: string;
  /**
   * ⭐ Tier-3 PLAINTEXT branch. ⚠⛔ **GENUINELY NULLABLE, AND ⛔ NOT SYMMETRIC WITH `bankName` —
   * ⛔ DO ⛔ NOT WRITE ONE GUARD FOR BOTH.** A `null` here is an **ORDINARY ABSENT OPTIONAL**, ⛔ not a
   * fault ⇒ the surface **OMITS THE ROW**, ⛔ never a placeholder.
   */
  branch: string | null;
  /**
   * ⛔⛔ **`vpaCiphertext` IS DELIBERATELY ⛔ NOT PROJECTED.** `2026-09-10-212` **cl.2**
   * (Trustee-ratified, DR + KB) ruled the nominee's UPI ID onto the **PAYMENT screen** — option
   * **(D)** — and ⛔ **NOT** onto this surface, on ⛔ any drive, in ⛔ any stage. ⭐ **THE PROJECTION IS
   * THE EXCLUSION**: what is not copied out here ⛔ cannot be decrypted, rendered, logged or
   * serialized from this path — the same structural move story A made on the public page. ⛔ Do
   * ⛔ not "restore" it.
   */
}

/** ⭐ ONE drive, as the substrate holds it, for the MEMBER'S DETAIL. */
export interface MemberDriveDetailEntry {
  /** The pool's canonical id. ⚠ INTERNAL — ⛔ never serialized onto the member wire. */
  poolId: PoolId;
  /** The 0-based index within the cycle; `poolLetterCode()` is a pure function of it. */
  poolIndex: number;
  /** `P-YYYY-MM-###` (Story 7.2) — RETAINED and RENDERED (`-184` cl.2), ⛔ but ⛔ not addressable. */
  poolCanonicalIdentifier: string;
  /** ⭐ The drive's OPAQUE PUBLIC ADDRESS TOKEN — Story 11b.10. ⭐ AC8 renders it. */
  publicToken: string;
  /**
   * **Live · Closed · Verified** — story B's ruled WIRE vocabulary, via
   * {@link publicStatusForPoolState}. ⭐⭐ **THE MAPPING IS REUSED ON PURPOSE, AND THAT IS ⛔ NOT THE
   * SAME MISTAKE AS IMPORTING THE TUPLE ABOVE.** The **tuple** decides *which drives a member sees*
   * (a disclosure question, ruled separately per surface); the **mapping** decides *what a stage is
   * called* (ruled ONCE, by `-193` cl.1). ⛔ Different questions — a private copy is what would let
   * the words drift.
   */
  status: SahyogDriveStatus;
  /** The close/settle instant. `null` while the pool's stream carries no such event. */
  driveClosedAt: Date | null;
  /** The deceased member's latest posting district, RAW. `null` = no posting row. */
  district: string | null;
  /** Confirmed contributions, reversals compensated (Story 9.5's canonical financial truth). */
  confirmedContributionCount: number;
  /**
   * The meter's fill, 0-100. ⚠⛔ `null` UNLESS the drive is `live` — Trustee-ratified
   * `2026-09-08-207` cl.1 closed the roster-size-by-division channel for ARCHIVED rows.
   * ⚠⛔ ⛔ **NOT suppressed at zero** — the public meter renders at 0 too.
   */
  confirmedPercentage: number | null;
  /**
   * ⭐⭐ **लक्ष्य** — see {@link resolveDetailDriveTargetInr}. ⛔ `null` for every Pariwar at launch
   * (fail-closed), and ⛔ `null` on every non-`live` POOL STATE (`-212` cl.1).
   */
  driveTargetInr: number | null;
  /** Pool-Reality #2 as an OPAQUE ENUM. `null` ⇒ ⛔ no expectation was ever set — **SILENCE**. */
  fundingOutcome: CycleFundingOutcome | null;
  /** `confirmedContributionCount × pools.fixed_amount` — 9.12 D3's canonical identity, computed ONCE. */
  amountRaisedInr: number;
  /** Tier-1 `member_kyc_profiles.name_ciphertext` AS STORED, or `null` when there is no profile. */
  deceasedNameCiphertext: string | null;
  /**
   * ⭐⭐ **THE CLAIM'S NOMINEE BANK ACCOUNTS — at most TWO, ordered `#1` then `#2`.** ⚠ An ORDER (for
   * determinism), ⛔ **not** a ranking.
   * ⚠ `[]` is a **FIRST-CLASS STATE** — the claim's bank details were ⛔ never collected (6.8 AC3's
   * absence signal) — ⛔ never a throw, and the surface then renders **NOTHING**.
   */
  nomineeAccounts: MemberDriveDetailNomineeAccount[];
}

export interface ReadMemberDriveDetailOptions {
  /** The as-of instant. Injected rather than read from the clock so a test can pin it. */
  now?: Date;
}

/**
 * Resolve ONE drive's member-facing detail **BY ITS OPAQUE PUBLIC ADDRESS TOKEN**, or `null` when
 * there is nothing to show.
 *
 * ⭐⛔ **`null` COLLAPSES FOUR CASES ON PURPOSE** — *"does not exist"*, *"exists but is not visible at
 * this surface's predicate"* (a `spawned` pool), *"the address is malformed"*, and *"a REAL drive
 * addressed with a WRONG or ABSENT token"*. ⭐ The caller renders the SAME **404** for all four.
 * ⛔⛔ **A RESPONSE THAT DISTINGUISHES THEM IS AN ENUMERATION ORACLE.** ⚠⛔ The fourth is the one most
 * likely to be "improved" into a 403 or a distinct error, and it is the one that must ⛔ NOT be:
 * *"real drive, wrong token"* answering differently from *"no such drive"* would confirm which
 * addresses name something. ⭐ Structurally guaranteed here, ⛔ not remembered: the token is part of
 * the WHERE clause, so a wrong one returns zero rows through the very same path.
 *
 * ⭐⭐ **AND A FIFTH CASE COLLAPSES INTO IT — THE CROSS-PARIWAR ONE, WHICH IS THIS STORY'S ⛔ ONLY
 * REMAINING BOUNDARY (AC3).** `-199` confirmed scope **(i)**: the member's **OWN** Pariwar, and
 * ⛔ cross-tenant **(ii)** was ⛔ NOT meant. ⇒ `pariwarId` is an **EXPLICIT PREDICATE** here, riding
 * ALONGSIDE RLS, and it comes from the **SESSION** — ⛔ never from a client-supplied id (family 12).
 * ⇒ another Pariwar's drive is ⛔ **not addressable** and resolves to this same `null` ⇒ a **404**,
 * ⛔ not a 200 with absent keys ([[feedback_trace_reachability_before_escalating]]).
 *
 * ⚠ ONE `now` FEEDS EVERY TIME-BOUNDED FRAGMENT. A second clock would let a confirmation land between
 * two queries so the page described two different instants.
 *
 * ⚠ THE JOIN TO `claims` IS PART OF THE PREDICATE and it is the SUBJECT FACT, ⛔ not a convenience —
 * an INNER join on purpose: a pool with no claim has no subject and no drive to show. THE JOIN TO
 * `member_kyc_profiles` IS A **LEFT** join, equally on purpose: a missing profile omits the **NAME**
 * and ⛔ keeps the **DRIVE**.
 */
export async function readMemberDriveDetail(
  db: Db,
  pariwarId: PariwarId,
  driveToken: string,
  opts: ReadMemberDriveDetailOptions = {},
): Promise<MemberDriveDetailEntry | null> {
  const now = opts.now ?? new Date();

  // ⭐⭐ THE REVEAL GATE, RESOLVED ONCE — ⛔ never interpreted by this caller. `resolveDriveTargetVisibility`
  // resolves an ABSENT row to the ruled FAIL-CLOSED default; ⛔ `getDriveTargetVisibilityRow` hands
  // back a `null` for a caller to interpret, *"which is exactly how a fail-closed default becomes
  // fail-open"* (`-211` cl.3). ⚠⛔ A miss here is a DISCLOSURE defect (`-211` Consequence 4).
  // ⚠⛔ ⛔ `resolveEffectiveDriveTargetInr` is ⛔ NOT called — लक्ष्य is DERIVED and there is ⛔ no
  // setter (`-204` cl.2).
  const targetVisibility = await resolveDriveTargetVisibility(db, pariwarId);

  const rows = await db
    .select({
      poolId: pools.poolId,
      poolIndex: pools.poolIndex,
      poolCanonicalIdentifier: pools.poolCanonicalIdentifier,
      publicToken: pools.publicToken,
      currentState: pools.currentState,
      fixedAmount: pools.fixedAmount,
      // ⚠ INTERNAL ONLY — the key for the nominee-account read below. ⛔ It is never returned and
      // ⛔ never serialized: a per-entity claim identifier on a member wire is an enumeration
      // primitive in its own right (11a.3, control 5).
      claimCaseId: pools.claimCaseId,
      deceasedNameCiphertext: memberKycProfiles.nameCiphertext,
      district: DECEASED_DISTRICT(now),
      driveClosedAt: DRIVE_CLOSED_AT(now),
      // ⚠ `count(*)` is `bigint` ⇒ the driver hands back a STRING. Coerced at this boundary.
      confirmedCount: CONFIRMED_CONTRIBUTION_COUNT(now),
      assignedCount: ASSIGNED_MEMBER_COUNT,
    })
    .from(pools)
    .innerJoin(claims, eq(claims.claimCaseId, pools.claimCaseId))
    .leftJoin(memberKycProfiles, eq(memberKycProfiles.memberId, claims.deceasedMemberId))
    .where(
      and(
        // ⭐⭐ `pariwar_id` IS AN EXPLICIT PREDICATE, ⛔ NOT ONLY RLS — AC3's teeth. It holds even if a
        // caller ever hands over a BYPASSRLS handle, and it is resolved from the SESSION (family 12).
        eq(pools.pariwarId, pariwarId),
        // ⭐⭐ ADDRESSED BY THE OPAQUE TOKEN AND BY ⛔ NOTHING ELSE (`-184` (B)). ⛔⛔ DO ⛔ NOT ADD AN
        // `OR` ARM FOR `pool_canonical_identifier` — that counter is MONOTONIC per (pariwar, month),
        // and a read accepting EITHER form has ⛔ not closed the walk, it has added a lock beside an
        // open door. ⚠ On THIS surface the walk reaches FIVE decrypted Tier-1 fields × TWO accounts.
        eq(pools.publicToken, driveToken),
        // ⭐ This surface's OWN visible-drive tuple — ⛔ never another surface's constant.
        sql`${pools.currentState} IN (${sql.join(
          MEMBER_DRIVE_DETAIL_VISIBLE_POOL_STATES.map((s) => sql`${s}`),
          sql`, `,
        )})`,
      ),
    )
    .limit(1);

  const row = rows[0];
  if (row === undefined) return null;

  // ⭐⭐ `coerceCount`, ⛔ NOT `Number(… ?? 0)` — the SAME family as `coerceDriveInstant` imported
  // above, and what the other single-drive read (`sahyog-vivran-read.ts:470-471`) already uses.
  // ⚠⛔⛔ **`??` CATCHES ⛔ ONLY `null`/`undefined`.** A non-numeric value yields `NaN`, and `NaN`
  // defeats EVERY guard below it: `NaN < 0` is `false` (the clamp's warn never fires),
  // `Math.max(0, NaN)` is **`NaN`** (the clamp passes it through), `assignedCount === 0` is `false`
  // (the `fundingOutcome` guard is bypassed and `classifyCycleOutcome` THROWS), and
  // `assignedCount <= 0` is `false` (`driveConfirmedPercentage` returns `NaN`, which the contract's
  // `.int()` rejects) ⇒ a 500 on the whole drive page instead of a row-local degrade.
  // ⚠ Reachability, stated honestly: both fragments are `count(*)`, which always renders as a digit
  // string, so ⛔ no live `NaN` was demonstrated — ⭐ this is the ruled coercion being used where the
  // module family says it must be, ⛔ not a fix for an observed break.
  // ⚠⛔ A prior review pass closed this finding on the ground that *"no such function exists anywhere
  // in the repo"* — ⛔ that negative claim was FALSE (`public-read.ts:436`)
  // ([[feedback_negative_claims_checkable_in_repo]]).
  const confirmedContributionCount = coerceCount(row.confirmedCount);
  const assignedCount = coerceCount(row.assignedCount);
  const currentState = row.currentState as MemberDriveDetailVisiblePoolState;
  const isLive = currentState === 'live';

  // ⭐⭐ HOISTED, ⛔ NOT DUPLICATED — the SAME binding feeds `classifyCycleOutcome`'s `deliveredTotal`
  // and the ruled money figure. ⛔⛔ A second `× fixedAmount` anywhere would be the defect (11b.3
  // D1(c); [[project_amount_raised_canonical_producer]]).
  // ⚠⛔ CLAMPED AT 0 for a non-positive `fixed_amount` — `pools.fixed_amount` carries ⛔ no DB
  // positivity CHECK, and a negative product would fail the contract's `.nonnegative()` and 500 this
  // whole page. ⭐ The clamp WARNS rather than firing silently — the member list's own fourth-pass
  // patch, and this accessor is pure and takes no logger, matching the `[module-tag]` idiom.
  const rawDeliveredTotal = confirmedContributionCount * row.fixedAmount;
  if (rawDeliveredTotal < 0) {
    console.warn(
      `[member-drive-detail] negative deliveredTotal clamped to 0 (pool=${row.poolId}, fixedAmount=${row.fixedAmount}, confirmedCount=${confirmedContributionCount})`,
    );
  }
  const deliveredTotal = Math.max(0, rawDeliveredTotal);

  // ⭐ The claim's nominee accounts, CIPHERTEXT AS STORED, ordered #1 → #2.
  // ⚠⛔ **THE SHARED ACCESSOR IS ⛔ NOT NARROWED** — `getClaimNomineeBankAccountsCiphertext` also
  // serves the Story 9.9 member donor path. ⭐ The PROJECTION below is this surface's, and it is
  // where `vpaCiphertext` is excluded (`-212` cl.2) — the same structural move story A made publicly.
  // ⚠⛔ ⛔ **DO ⛔ NOT REUSE `sahyog-vivran-read.ts`'s `readNomineeBank`**: that projection was
  // narrowed to `{ accountRank, accountHolderNameCiphertext }` — *"Closed HERE by deletion"* — so it
  // yields ⛔ **NEITHER `bankName` NOR `branch`** and AC4's five-field render would come up **TWO
  // FIELDS SHORT**. ⭐ This surface owes its own projection, and this is it.
  const accountRows = await getClaimNomineeBankAccountsCiphertext(
    db,
    pariwarId,
    row.claimCaseId as ClaimId,
  );

  const nomineeAccounts = accountRows.flatMap((r): MemberDriveDetailNomineeAccount[] => {
    // ⛔ VALIDATED AGAINST THE LITERAL SET, ⛔ never coerced. The `{1, 2}` CHECK is app-enforced plus
    // DB-backstopped, so a third rank means the row is ⛔ not what 6.8 authorised — and DROPPING it is
    // the right answer here: rendering an unexpected account is worse than rendering one fewer, and
    // throwing would 500 a whole drive page over one malformed row. ⭐ The `accountRank` check twelve
    // lines up in `sahyog-vivran-read.ts` is the precedent, and its own lesson is stated there:
    // degrade **ROW-LOCAL**, ⛔ never page-wide.
    // ⚠⛔ A `?? 1`-style fallback would be the DEFECT — it risks two accounts both claiming identity 1.
    if (r.accountRank !== 1 && r.accountRank !== 2) return [];
    return [
      {
        accountRank: r.accountRank,
        accountHolderNameCiphertext: r.accountHolderNameCiphertext,
        accountNumberCiphertext: r.accountNumberCiphertext,
        ifscCiphertext: r.ifscCiphertext,
        bankName: r.bankName,
        branch: r.branch,
        // ⛔⛔ `vpaCiphertext` IS ⛔ NOT COPIED — see the interface's doc-block. `-212` cl.2 put the
        // UPI ID on the PAYMENT screen (`8-17`, `done`), ⛔ not here, on ⛔ any drive, in ⛔ any stage.
      },
    ];
  });

  return {
    poolId: row.poolId,
    poolIndex: row.poolIndex,
    poolCanonicalIdentifier: row.poolCanonicalIdentifier,
    publicToken: row.publicToken,
    // ⭐ The totality-asserting accessor, through this surface's own widening — ⛔ never an `as` cast.
    status: publicStatusForPoolState(asPublicVisiblePoolState(currentState)),
    // ⭐ COERCED — the raw `sql` fragment hands back an ISO STRING despite its declared type.
    driveClosedAt: coerceDriveInstant(row.driveClosedAt),
    district: row.district,
    confirmedContributionCount,
    // ⚠⛔ `null` off-`live` (`-207` cl.1) — ⛔ and ⛔ NOT suppressed at zero ON `live`.
    confirmedPercentage: isLive
      ? driveConfirmedPercentage(confirmedContributionCount, assignedCount)
      : null,
    driveTargetInr: resolveDetailDriveTargetInr(
      currentState,
      assignedCount,
      row.fixedAmount,
      targetVisibility,
    ),
    // ⭐⛔ ZERO ASSIGNEES ⇒ ⛔ NO CLASSIFICATION AT ALL, ⛔ never a vacuous one: `expectedTotal` would
    // be 0 and `0 >= 0` is TRUE, so the classifier returns `fully_funded` for a drive that collected
    // nothing. ⚠ A non-positive `fixed_amount` takes the same branch, for the same reason. ⛔ And a
    // STILL-COLLECTING drive gets none either — *"the cycle closed"* would be false mid-window.
    // ⛔ `classifyCycleOutcome` is NOT patched — it is shared with three other surfaces.
    fundingOutcome:
      isLive || assignedCount === 0 || row.fixedAmount <= 0
        ? null
        : classifyCycleOutcome({
            expectedTotal: assignedCount * row.fixedAmount,
            deliveredTotal,
          }),
    amountRaisedInr: deliveredTotal,
    deceasedNameCiphertext: row.deceasedNameCiphertext,
    nomineeAccounts,
  };
}
