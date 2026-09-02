// The PER-CLAIM SAHYOG VIVRAN read — Story 11b.3 (Task 2 + Task 5; AC1, AC3, AC5).
//
// ONE drive's own page, bounded by ONE `now` parameter: its public identity, its district, its
// close/settle instant, its CONFIRMED contribution count, its Pool-Reality-#2 outcome, and — when
// the claim reached this drive BY APPEAL — the non-PII reversal lineage.
// ⚠ THE SHARED `now` IS A BOUND, ⛔ NOT A SNAPSHOT: the drive read and the appeal-reversal read
// (below) are two separate round trips, not one transaction — a write landing between them is
// visible to the second query without having been reflected in the first. What `now` guarantees is
// only that NEITHER query considers anything that occurred after it (review finding).
//
// ── ⭐⭐ IT RETURNS ⛔ NO PERSON, AND THAT IS THE SPLIT'S LOAD-BEARING PROPERTY ───────
// ⛔ No name, ⛔ no ciphertext, ⛔ no `member_id`, ⛔ no `deceased_member_id`, ⛔ no `claim_case_id`,
// ⛔ no `pool_id`. The named-identity render layer is **11b.3b**'s and the nominee bank presentation
// is **11b.3a**'s (`2026-09-02-182` cl.1, D6(b)). ⇒ this surface declares ⛔ ZERO `pii_tier: 1`
// fields at `tier: public`, needs ⛔ no `tier1_public_exception` and ⛔ no Panel ruling, so ⛔ nothing
// outside this repository can block it. ⚠ A future key carrying a person must arrive WITH its cited
// ruling and its allowlist entry, in the SAME commit.
//
// ── ⛔ TRANSPORT-FREE, AUDIT-FREE, AND DECRYPT-FREE — ⭐ AND HERE THERE IS NOTHING TO DECRYPT
// ⛔ No HTTP, ⛔ no audit, ⛔ no decryption, ⛔ no permission check, ⛔ no presentation policy.
// `public-read.ts` is decrypt-free BY RULE and hands its boundary a ciphertext to resolve; this
// module hands the boundary ⛔ nothing of the kind, because it selects no Tier-1 column at all.
// ⭐ That is the point of the split, and it is why this read costs ⛔ ZERO KMS round-trips.
//
// ── ⛔ IT DECIDES A RENDER, ⛔ NEVER A BENEFIT ───────────────────────────────────────
// It reads `pools.current_state` ONLY to decide whether a page appears. ⛔ No `is_valid`, no
// `is_assignable`, no eligibility, assignment, validity or peer-mesh predicate is written, conjoined
// or consulted here, and a diff in which a page-visibility predicate reaches an eligibility path must
// be rejected in review (the Story 10.10 shape).
//
// ── ⛔ THE CLAIM'S SUBJECT COMES FROM THE CLAIM, ⛔ NEVER FROM A LIFECYCLE STATE ────
// `pools.claim_case_id` → `claims` IS the subject fact. ⛔ No predicate here may re-derive it from
// `members.state`, and it does ⛔ not need to: `MEMBER_LIFECYCLE_STATES` carries no label for the
// condition at all — it is an OVERLAY, ⛔ never a lifecycle label — so such a predicate is blind BY
// CONSTRUCTION. ⚠ And the C-5 correction must ⛔ NOT be pasted in here: 11a.3 wrongly PUBLISHED a
// member and needed the account-frozen conjunct ADDED; this surface would wrongly OMIT the very
// drive it exists to record. ⛔ Do not add that conjunct.
//
// ⚠ ⛔ CATEGORY-AGNOSTIC, deliberately: it joins pool → claim and reads the claim, which holds for
// EVERY `support_category`. ⛔ There is no branch on `support_category` here and there must never be
// one — v2 `_daan` activation is a config change, ⛔ not an engine refactor (Story 7.1 AC4).
//
// ── ⭐ THE FRAGMENTS ARE IMPORTED, ⛔ NEVER RE-SPELLED ──────────────────────────────
// The confirmed count, the close/settle instant, the district and the assignee count are the SAME
// four correlated fragments `public-read.ts` uses, imported from it. ⛔ Copying them would fork the
// definition of *"how many contributions were confirmed"* into two places that drift silently.
// ⚠ They carry LITERAL outer-table qualifiers, so the query below MUST select from `pools` inner
// joined to `claims` under exactly those aliases ([[project_epic6_drizzle_correlated_subquery_bug]]).

import { and, eq, sql } from 'drizzle-orm';

import { classifyCycleOutcome, type CycleFundingOutcome } from '../close-of-cycle/framing.js';
import type { Db } from '../db.js';
import type { PariwarId } from '../ids/index.js';
import { claims } from '../schema/claims.js';
import { eventsLog } from '../schema/events_log.js';
import { pools } from '../schema/pools.js';
import {
  ASSIGNED_MEMBER_COUNT,
  CONFIRMED_CONTRIBUTION_COUNT,
  coerceCount,
  coerceDriveInstant,
  DECEASED_DISTRICT,
  DRIVE_CLOSED_AT,
} from './public-read.js';

/**
 * ⭐⭐ THE VISIBLE-DRIVE PREDICATE — **`live` + `closed` + `settled`** (D4(b), `2026-09-02-176`).
 *
 * ⛔⛔ DECLARED HERE EXPLICITLY, AND ⛔ NEVER IMPORTED FROM `SAHYOG_DRIVE_VISIBLE_POOL_STATES`.
 * That constant is the INDEX's, and it is deliberately NARROWER (`['closed','settled']`): a drive
 * still collecting is not a row on a transparency index, it is an open solicitation. ⭐ TWO SURFACES,
 * TWO PREDICATES, on purpose — this is a per-claim page a visitor reaches by identifier, and Story
 * **11b.3a**'s entire subject is the ACTIVE campaign, so widening the predicate in the story that
 * ADDS the Tier-1 bank fields would have been the worse ordering.
 *
 * ⛔ `spawned` is ABSENT: a pool that has not opened for contributions has no drive to tell. Widening
 * this tuple is a ruling change, ⛔ not a tuning knob.
 *
 * ⚠⛔ `D4-linkage` IS OPEN, AND IT IS RECORDED HERE BECAUSE THIS CONSTANT IS WHAT CREATES IT: a
 * `live` drive's page has ⛔ NO INBOUND LINK today (`/sahyog` lists only `closed` + `settled`), so it
 * is reachable only by constructing the SEQUENTIAL `P-YYYY-MM-###`. ⛔ Do not add a link to a `live`
 * drive without reading that rider. ⭐ Its MIRROR lands on 11b.3a, where the same sequential
 * identifier fronts four DECRYPTED Tier-1 fields — routed to that story's AC2 by name, ⛔ not left
 * as a shared worry.
 */
export const SAHYOG_VIVRAN_VISIBLE_POOL_STATES = ['live', 'closed', 'settled'] as const;
export type SahyogVivranVisiblePoolState = (typeof SAHYOG_VIVRAN_VISIBLE_POOL_STATES)[number];

/**
 * The PUBLIC vocabulary — THREE labels here, ⛔ not the index's two, because D4(b) admits `live`.
 *
 * ⭐ THE WIRE TOKEN IS ⛔ NEVER THE INTERNAL ONE. `2026-08-21-144` cl.8 records `/members` having
 * leaked the internal `lock-in` value onto a public JSON route; `spawned` / `live` / `closed` /
 * `settled` must never cross this boundary.
 */
export const SAHYOG_VIVRAN_STATUSES = ['collecting', 'active', 'archive'] as const;
export type SahyogVivranStatus = (typeof SAHYOG_VIVRAN_STATUSES)[number];

const PUBLIC_STATUS_BY_POOL_STATE: Record<SahyogVivranVisiblePoolState, SahyogVivranStatus> = {
  live: 'collecting',
  closed: 'active',
  settled: 'archive',
};

/**
 * ⭐ THE PUBLISH SIGNAL — Story 6.16's 31st claim event, the *"ONE clean subscription point Epic 11b
 * consumes"*.
 *
 * ⛔⛔ AND THERE IS ⛔ NO CONSUMER, ⛔ NO QUEUE AND ⛔ NO PUBLICATION RECORD — **D12(a)**,
 * `2026-09-02-176`. This is a RENDER-TIME DERIVATION: the read joins the event and the narrative is
 * derived at request time. ⭐ Story 6.16's publish-hook obligation is DISCHARGED BY THIS READ —
 * recorded *"Closed by [edit]"*, ⛔ not *"deferred"* ([[feedback_closure_language_precision]]).
 * ⭐ Ground: this surface holds ⛔ NO publication STATE for a queue to advance, so a queue here would
 * be a consumer with ⛔ no effect — the shape 11b.2a's D6(a) deleted (*"a render arm that never fires
 * is dead code"*).
 *
 * ⚠ THE *"Sahyog Vivran publication queue"* PROSE IN `packages/events/src/registry.ts` AND
 * `packages/domain/src/claim/events.ts` IS NOW **STALE**. ⛔ Routed with a trigger, ⛔ NOT swept in
 * passing ([[project_epic9_confirmed_producer_is_live]]).
 */
const CLAIM_REVERSED_EVENT_TYPE = 'claim.reversed' as const;

/** The `claim.reversed` payload keys. ⛔ Both are NON-PII by ruling; ⛔ nothing else is read. */
const REVERSED_AT_STAGE_KEY = 'reversed_at_stage' as const;
const DISPOSITION_CATEGORY_KEY = 'disposition_category' as const;

/**
 * The BOUNDED disposition tags — value-aligned with `claim/events.ts`'s
 * `appealDispositionCategorySchema` and the `appeal_disposition_category` pgEnum.
 *
 * ⚠⛔ DECLARED LOCALLY RATHER THAN IMPORTED, and the reason is a known footgun, ⛔ not laziness:
 * pulling a VALUE out of `claim/events.ts` from a `pool/` read materializes a module-init cycle
 * that breaks CONSUMING packages at runtime while typecheck, lint and local tests all stay green
 * ([[project_type_only_import_cycle_trap]]). `claim/events.ts` itself declares this list inline for
 * the identical reason (*"to avoid an events.ts → appeal.ts import edge"*).
 * ⭐ THE LOCKSTEP IS A TEST, ⛔ not an import — `tests/pool/sahyog-vivran-read.test.ts` pins this
 * tuple against the claim schema, so the two cannot drift silently.
 *
 * ⛔ AND THE BOUND IS LOAD-BEARING, ⛔ not defensive typing: an unrecognised value means the payload
 * is not what the ruling authorised, and this surface is PUBLIC. A tag that is not on this list
 * drops the WHOLE lineage (see {@link readAppealReversal}) — ⛔ it is never rendered raw, which is
 * how free text would reach a public page through a bounded field.
 */
export const SAHYOG_VIVRAN_DISPOSITION_CATEGORIES = [
  'new_evidence_presented',
  'procedural_correction',
  'reconsideration_on_merits',
] as const;
export type SahyogVivranDispositionCategory =
  (typeof SAHYOG_VIVRAN_DISPOSITION_CATEGORIES)[number];

/**
 * The non-PII appeal-reversal lineage.
 *
 * ⛔⛔ THIS SHAPE IS A FENCE, ⛔ NOT A CONVENIENCE. `claim.reversed` is the PUBLISH SIGNAL, ⛔ not the
 * decision: the rationale TEXT and the REVIEWER IDENTITY live on the `claim.appeal_stageN_reviewed`
 * decision event's Tier-1 metadata row and are ⛔ NEVER public. ⛔ Do not widen this interface to
 * carry either, under any name — and ⛔ do not add the reviewing actor, the stage's outcome text, or
 * anything read from the decision event.
 */
export interface SahyogVivranAppealReversal {
  /** `1` | `2` | `3` — which appeal stage reversed the denial. */
  readonly reversedAtStage: 1 | 2 | 3;
  /** The BOUNDED, non-PII disposition tag. ⛔ Never free text, ⛔ never rendered raw. */
  readonly dispositionCategory: SahyogVivranDispositionCategory;
  /** The reversal instant — the `claim.reversed` event's own `occurred_at`. */
  readonly reversedAt: Date;
}

/** One drive's Sahyog Vivran, as the substrate holds it. ⛔ It names nobody. */
export interface SahyogVivranEntry {
  /** The 0-based index within the cycle; `poolLetterCode()` is a pure function of it. */
  readonly poolIndex: number;
  /** `P-YYYY-MM-###` (Story 7.2) — and on this surface also the route parameter. */
  readonly poolCanonicalIdentifier: string;
  /** `collecting` | `active` | `archive`. The PUBLIC token, ⛔ never the internal one. */
  readonly status: SahyogVivranStatus;
  /**
   * The close/settle instant, from the `pool.closed` / `pool.settled` event stream — AC3's
   * settlement-state source. `null` while the drive is still collecting, and `null` for the already-
   * flagged data anomaly of a closed/settled pool whose stream carries no such event yet.
   */
  readonly driveClosedAt: Date | null;
  /** The claim subject's latest posting district, RAW. `null` = no posting row. */
  readonly district: string | null;
  /**
   * ⭐⭐ CANONICAL FINANCIAL TRUTH (AC3) — a COUNT of live `contribution.confirmed` events with their
   * `reconciliation.confirmation-reversed` compensations applied, and ⛔ NOTHING ELSE.
   * ⛔ NEVER yellow / attested / pending / projected / estimated, and ⛔ never a SUM.
   *
   * ⭐⛔ IT IS THE **EVENT** COUNT, ⛔ NEVER A ROW COUNT, AND THE TWO ARE DESIGNED TO DISAGREE. An
   * RTBF invocation removes a contributor from any rendered list ENTIRELY — ⛔ no anonymized row,
   * ⛔ no marker, ⛔ no placeholder key — while the omitted contributor STILL COUNTS toward every
   * confirmed aggregate (`2026-08-30-169`). ⇒ ⛔ never derive this from the LENGTH of a contributor
   * list, here or at 11b.3b, where the page will read *"N confirmed"* beside FEWER than N named rows
   * BY DESIGN. A list length silently UNDER-reports the aggregate and breaks `-169`.
   */
  readonly confirmedContributionCount: number;
  /**
   * Pool-Reality #2, as an OPAQUE ENUM. ⭐ The target is QUARANTINED by construction: the totals are
   * compared inside this module and ⛔ only this enum leaves it, so ⛔ no expected-total, percentage,
   * shortfall or comparison figure can reach any render model (AC3).
   *
   * ⭐⛔ `null` IN TWO CASES, and the surface then says NOTHING rather than saying something false:
   *   (a) the drive is still COLLECTING — there is ⛔ no close to frame, and AC3 rules the honest
   *       copy is *"final outcome will appear after reconciliation settles"*, ⛔ never an estimate;
   *   (b) ZERO members were assigned — ⛔ no expectation was ever set. `classifyCycleOutcome`
   *       compares `deliveredTotal >= expectedTotal`, which at `0 >= 0` is VACUOUSLY TRUE ⇒ it
   *       returned `fully_funded` for a drive that collected nothing, and the sibling index published
   *       *"the cycle closed with the support it needed"* beside *"0 confirmed"* (the 11b.1 review
   *       finding). ⛔ The classifier is NOT patched — it is SHARED with the Panchayat Noticeboard
   *       and `/sahyog` and its union's ordering is provenance-stable. ⛔ `partial` is NOT reused
   *       either: *"Reconciliation is still in progress"* is not true of a drive nobody was assigned
   *       to — that trades a false statement for a misleading one.
   */
  readonly fundingOutcome: CycleFundingOutcome | null;
  /**
   * ⭐ THE APPEAL LINEAGE, DERIVED AT REQUEST TIME (D12(a)). `null` when the claim was never
   * reversed — and the surface then renders NOTHING, ⛔ no "not reversed" marker.
   */
  readonly appealReversal: SahyogVivranAppealReversal | null;
}

export interface ReadSahyogVivranOptions {
  /** The as-of instant. Injected rather than read from the clock so a test can pin it. */
  now?: Date;
}

/**
 * Resolve ONE drive's Sahyog Vivran, or `null` when there is nothing to show.
 *
 * ⭐⛔ `null` COLLAPSES **THREE** CASES ON PURPOSE — *"does not exist"*, *"exists but is not visible
 * at this surface's predicate"* (a `spawned` pool) and *"the identifier is malformed"*. The caller
 * renders the SAME 404 for all three. ⛔ A response that distinguishes them is an ENUMERATION
 * ORACLE, and this surface is fronted by a SEQUENTIAL identifier, which is exactly when that matters
 * (AC1).
 *
 * ⚠ ⛔ NO `.limit()` FROM USER INPUT anywhere in this module, so ⛔ no `clampLimit` is owed — the
 * `domain-accessor-invariants` gate clamps every DYNAMIC limit, and there is none here: this read is
 * single-row by its unique key ([[project_domain_limit_clamp_and_savepoint_retry]]).
 *
 * ⚠ ONE `now` FEEDS EVERY TIME-BOUNDED FRAGMENT, including the appeal read below. A second clock
 * would let a confirmation land between the two queries so the page and its lineage described
 * different instants.
 *
 * ⚠ THE JOIN TO `claims` IS PART OF THE PREDICATE and it is the SUBJECT FACT, ⛔ not a convenience.
 * ⛔ An INNER join on purpose: a pool with no claim has no subject and no drive to publish.
 * ⛔ There is NO join to `member_kyc_profiles` — ⛔ deliberately, and ⛔ do not add one: this surface
 * renders no name, so it must not so much as SELECT a ciphertext column.
 *
 * `pariwar_id` rides ALONGSIDE RLS as an explicit predicate — defense-in-depth, and what keeps the
 * read correct if a caller ever passes a BYPASSRLS pool.
 */
export async function readPublicSahyogVivran(
  db: Db,
  pariwarId: PariwarId,
  poolCanonicalIdentifier: string,
  opts: ReadSahyogVivranOptions = {},
): Promise<SahyogVivranEntry | null> {
  const now = opts.now ?? new Date();

  const rows = await db
    .select({
      poolIndex: pools.poolIndex,
      poolCanonicalIdentifier: pools.poolCanonicalIdentifier,
      currentState: pools.currentState,
      fixedAmount: pools.fixedAmount,
      // ⚠ INTERNAL ONLY — the stream key for the appeal read below. ⛔ It is never returned and
      // ⛔ never serialized: a per-entity claim identifier on a public wire is an enumeration
      // primitive in its own right (11a.3, control 5).
      claimCaseId: pools.claimCaseId,
      district: DECEASED_DISTRICT(now),
      driveClosedAt: DRIVE_CLOSED_AT(now),
      // ⚠ `count(*)` is `bigint` ⇒ the driver hands back a STRING, ⛔ not a number. Coerced at this
      // accessor's boundary below — ⛔ never left to an implicit `+` somewhere downstream.
      confirmedCount: CONFIRMED_CONTRIBUTION_COUNT(now),
      assignedCount: ASSIGNED_MEMBER_COUNT,
    })
    .from(pools)
    .innerJoin(claims, eq(claims.claimCaseId, pools.claimCaseId))
    .where(
      and(
        eq(pools.pariwarId, pariwarId),
        eq(pools.poolCanonicalIdentifier, poolCanonicalIdentifier),
        // ⭐ The visible-drive predicate, declared on THIS surface — ⛔ never the index's constant.
        sql`${pools.currentState} IN (${sql.join(
          SAHYOG_VIVRAN_VISIBLE_POOL_STATES.map((s) => sql`${s}`),
          sql`, `,
        )})`,
      ),
    )
    .limit(1);

  const row = rows[0];
  if (row === undefined) return null;

  const confirmedContributionCount = coerceCount(row.confirmedCount);
  const assignedCount = coerceCount(row.assignedCount);
  const status = PUBLIC_STATUS_BY_POOL_STATE[row.currentState as SahyogVivranVisiblePoolState];

  return {
    poolIndex: row.poolIndex,
    poolCanonicalIdentifier: row.poolCanonicalIdentifier,
    status,
    // ⭐ COERCED — {@link coerceDriveInstant}. The raw `sql` fragment's declared `Date | null` is a
    // claim the runtime does not honour; the value arrives as an ISO STRING, and a `.toISOString()`
    // downstream throws. ⛔ The same defect 500'd the shipped `/sahyog` route until Story 11b.3.
    driveClosedAt: coerceDriveInstant(row.driveClosedAt),
    district: row.district,
    confirmedContributionCount,
    // ⭐ THE TARGET DIES ON THIS LINE. Both totals are whole INR — the unit `classifyCycleOutcome`
    // documents — and ⛔ only the opaque enum is returned. ⛔ Do not widen `SahyogVivranEntry` to
    // carry either of them, under any name.
    // ⭐⛔ AND BOTH `null` ARMS ARE LOAD-BEARING — see `fundingOutcome`'s own doc-block.
    fundingOutcome:
      status === 'collecting' || assignedCount === 0
        ? null
        : classifyCycleOutcome({
            expectedTotal: assignedCount * row.fixedAmount,
            deliveredTotal: confirmedContributionCount * row.fixedAmount,
          }),
    appealReversal: await readAppealReversal(db, pariwarId, row.claimCaseId, now),
  };
}

/**
 * ⭐ THE RENDER-TIME DERIVATION OF THE *"Reversed by appeal"* LINEAGE (D12(a), AC5, Task 5).
 *
 * ⛔ NOT a consumer, ⛔ not a queue, ⛔ not a publication record — this joins the claim's own
 * `claim.reversed` event at REQUEST TIME. ⭐ It is what DISCHARGES Story 6.16's publish-hook
 * obligation.
 *
 * ⚠ A SEPARATE, SINGLE-ROW QUERY rather than a fourth correlated fragment, and that is a real choice
 * with a real bound: this surface renders exactly ONE drive, so there is ⛔ no N+1 to open — the
 * D7(a) door the index had to shut does not exist here. ⭐ If a future story ever renders MANY
 * drives through this module, this must become a lateral aggregate BEFORE it is called in a loop.
 *
 * ⚠ THE LATEST reversal by `event_version` — a claim CAN be reversed, re-denied and reversed again
 * (a reversed claim re-enters approval), and the lineage the page tells is the one that BROUGHT IT
 * HERE. ⛔ `event_version` (per-stream monotonic), ⛔ never `occurred_at`, which is wall-clock and
 * ⛔ not the append order.
 *
 * ⛔ AND IT DOES NOT UNFREEZE ANYTHING. `claim.reversed` is deliberately ABSENT from
 * `member/overlay.ts`'s `ACCOUNT_UNFREEZE_EVENT_TYPES` — a reversed claim re-enters approval, so the
 * freeze persists to `settled` / `denied_no_appeal` ([[project_claim_overlay_unfreeze_seam]]).
 * ⛔ Do not add it there to "make the lineage consistent": this module only READS.
 *
 * ⚠ A malformed payload yields `null` — ⛔ never a partially-rendered lineage. The stage is
 * validated against the literal set rather than coerced: an out-of-range value is an upstream defect
 * and rendering *"reversed at stage 7"* would be worse than rendering nothing.
 */
async function readAppealReversal(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: string,
  now: Date,
): Promise<SahyogVivranAppealReversal | null> {
  const rows = await db
    .select({
      occurredAt: eventsLog.occurredAt,
      reversedAtStage: sql<string | null>`${eventsLog.payload} ->> ${REVERSED_AT_STAGE_KEY}`,
      dispositionCategory: sql<string | null>`${eventsLog.payload} ->> ${DISPOSITION_CATEGORY_KEY}`,
    })
    .from(eventsLog)
    .where(
      and(
        eq(eventsLog.pariwarId, pariwarId),
        // The claim's own stream (`stream_id` == `claim_case_id`).
        eq(eventsLog.streamId, claimCaseId),
        eq(eventsLog.eventType, CLAIM_REVERSED_EVENT_TYPE),
        sql`${eventsLog.occurredAt} <= ${now}`,
      ),
    )
    .orderBy(sql`${eventsLog.eventVersion} DESC`)
    .limit(1);

  const row = rows[0];
  if (row === undefined) return null;

  // ⛔ BOTH FIELDS VALIDATED AGAINST THEIR LITERAL SETS, ⛔ never coerced. An out-of-range stage or an
  // unrecognised tag means the payload is not what the ruling authorised — and rendering *"reversed at
  // stage 7"*, or echoing an unknown string onto a PUBLIC page, is worse than rendering nothing.
  // ⚠ A partial lineage is ⛔ not an option: the whole block is dropped, so the page shows no reversal
  // rather than half of one.
  const stage = Number(row.reversedAtStage);
  if (stage !== 1 && stage !== 2 && stage !== 3) return null;
  const category = SAHYOG_VIVRAN_DISPOSITION_CATEGORIES.find((c) => c === row.dispositionCategory);
  if (category === undefined) return null;

  return {
    reversedAtStage: stage,
    dispositionCategory: category,
    reversedAt: row.occurredAt,
  };
}
