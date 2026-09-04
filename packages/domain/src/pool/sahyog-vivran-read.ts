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
// ── ⚠⭐ AMENDED BY STORY 11b.3a — THIS READ NOW SELECTS TIER-1 CIPHERTEXT ────────────
// ⛔⛔ THE PARAGRAPH BELOW USED TO SAY *"it selects no Tier-1 column at all"* and *"there is nothing
// to decrypt"*. ⭐ TRUE AT 11b.3; ⛔ **FALSE NOW**, and amended rather than deleted because the next
// reader will look for the claim. **11b.3a** adds the four ruled nominee-bank fields
// (`2026-08-28-160` cl.10, `2026-08-28-165` cl.1/cl.3) — so this read now returns **ciphertext AS
// STORED** for up to two accounts, and the **boundary decrypts** it.
//
// ⭐ WHAT IS STILL TRUE, AND IT IS THE HALF THAT MATTERS: ⛔ **THIS MODULE STILL DECRYPTS NOTHING.**
// The ciphertext leaves here exactly as `public-read.ts`'s deceased-member name does — resolved by
// `apps/api`, ⛔ never by `apps/public`, which must ⛔ not gain KMS capability for ONE field class
// when the KEK is shared across EVERY Tier-1 field class (`2026-08-20-143` cl.1, D6(a)).
//
// ⚠ THE COST IS BOUNDED AND SMALL, AND IT IS SAID HERE RATHER THAN LEFT TO BE RE-DERIVED: **at most
// EIGHT values** per page — four fields × at most two EQUAL accounts — against the directory's fifty
// per page. `DIRECTORY_DECRYPT_CONCURRENCY = 8` still bounds it at the boundary. ⭐ And a MASKED
// projection decrypts only **two** per account: the holder name and the VPA are ⛔ not in cl.10(e)'s
// retention list, so they are never decrypted when masked.
//
// ── ⭐⭐ IT STILL RETURNS ⛔ NO PERSON'S NAME IN PLAINTEXT, AND ⛔ NO IDENTIFIER ──────
// ⛔ No `member_id`, ⛔ no `deceased_member_id`, ⛔ no `claim_case_id`, ⛔ no `pool_id`. ⚠ The
// deceased member's name and the contributor list are still **11b.3b**'s (`2026-09-02-173` /
// `-174`) and are ⛔ absent here. ⚠ A future key carrying a person must arrive WITH its cited ruling
// and its allowlist entry, in the SAME commit — which is exactly what 11b.3a did for the four
// nominee-bank fields.
//
// ⚠⛔ AND `account_holder_name` IS ⛔ NOT A NOMINEE'S NAME BY ANY LINKAGE THIS CODE MAY ASSERT.
// 6.8's **D1** removed that linkage deliberately: the accounts are a CLAIM-SCOPED payment channel,
// ⛔ not one row per declared nominee — ⛔ no FK to `member_nominees`, ⛔ no rank, ⛔ no match rule.
// ⛔ Do ⛔ not "fix" this by adding a join ([[project_nominee_bank_disbursement_channel]]).
//
// ── ⛔ TRANSPORT-FREE, AUDIT-FREE, AND STILL DECRYPT-FREE ───────────────────────────
// ⛔ No HTTP, ⛔ no audit, ⛔ no decryption, ⛔ no permission check, ⛔ no presentation policy.
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

import { isNomineeBankMasked } from '../claim/nominee-bank-masking.js';
import { resolveEffectiveNomineeBankMasking } from '../claim/nominee-bank-masking-policy.js';
import { getClaimNomineeBankAccountsCiphertext } from '../claim/nominee-bank-read.js';
import { classifyCycleOutcome, type CycleFundingOutcome } from '../close-of-cycle/framing.js';
import type { Db } from '../db.js';
import type { ClaimId, PariwarId } from '../ids/index.js';
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
  DRIVE_MASKING_FROM,
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

/**
 * ONE of the claim's at-most-two nominee bank accounts, **as the substrate holds it** — Story 11b.3a
 * (AC2, AC4).
 *
 * ⭐ CIPHERTEXT AS STORED. The four Tier-1 fields leave this module encrypted; the `apps/api`
 * boundary decrypts them under `CLAIM_NOMINEE_BANK_FIELD_CLASS` and applies the masking projection.
 * ⛔ This module never decrypts, and ⛔ `apps/public` never may (Trap 6 / `2026-08-20-143` cl.1).
 * ⚠ The `Ciphertext` suffixes are MISUSE RESISTANCE, ⛔ not decoration — the 6.8 naming finding: a
 * shape carrying ciphertext must not be mistakable for the already-masked API view.
 *
 * ⛔⛔ THE TWO ACCOUNTS ARE **EQUAL PAYMENT DESTINATIONS**. `accountRank` is composite-PK IDENTITY —
 * ⛔ **not a priority, ⛔ not a nominee rank, ⛔ not a 75/25 split**, and ⛔ not a routing instruction
 * (Story 9.9's re-scope; [[project_nominee_bank_disbursement_channel]],
 * [[project_disbursement_is_money_in_routing]]). ⛔ Nothing downstream may present one as primary.
 *
 * ⚠ `vpaCiphertext` is **NULL for every nominee today** — Story 8.4 shipped the VPA resolver seam
 * ABSENT and deferred collection to its own story ([[project_nominee_vpa_deferred_seam]]). ⇒ ⛔ a
 * null VPA is ⛔ NOT an error, ⛔ not a gap and ⛔ not a reason to hold the render: the surface renders
 * NOTHING for it — ⛔ no placeholder, ⛔ no *"not provided"* marker, because an omission that
 * announces itself is an enumeration signal.
 */
export interface SahyogVivranNomineeBankAccount {
  /** `1` | `2` — row IDENTITY, ⛔ never a priority. */
  readonly accountRank: 1 | 2;
  /** Tier-3 PLAINTEXT — public, IFSC-derived, non-identifying. ⛔ Nothing is decrypted for it. */
  readonly bankName: string;
  /** Tier-3 PLAINTEXT. `null` when the filer recorded no branch. */
  readonly branch: string | null;
  /**
   * ⚠⛔ THE COLUMN HOLDS **THE ACCOUNT HOLDER**, AND THIS CODE MAY ⛔ NOT CALL IT A NOMINEE.
   * 6.8's D1 removed the linkage on purpose. ⛔ Do not label it *"Nominee"* anywhere downstream.
   */
  readonly accountHolderNameCiphertext: string;
  readonly accountNumberCiphertext: string;
  readonly ifscCiphertext: string;
  /** ⚠ NULL by design for a nominee without a VPA — a first-class state, ⛔ never an error. */
  readonly vpaCiphertext: string | null;
}

/**
 * The nominee bank block — the accounts plus the ONE masking verdict that governs all of them.
 *
 * ⭐ THE VERDICT IS PER-PARIWAR AND PER-DRIVE, ⛔ never per-account: the schedule is a Pariwar-level
 * record and the offset is measured from THIS drive's close instant, so two accounts on one drive can
 * ⛔ never disagree. ⛔ Do not move `masked` onto the account.
 */
export interface SahyogVivranNomineeBank {
  /**
   * Whether the public projection is MASKED at `now` — `2026-08-28-160` cl.10(c)-(e).
   *
   * ⭐ `false` when the Pariwar has no schedule row: `D8-default` RULED **FAIL-OPEN**
   * (`2026-09-02-179` cl.1). ⛔ Never a masked default — cl.10(b) forbids the code assuming it.
   */
  readonly masked: boolean;
  /**
   * At most TWO, ordered `#1` then `#2` — an ORDER, ⛔ not a ranking. `[]` when the claim's bank
   * details were never collected (the 6.8 AC3 absence signal), and the surface then renders NOTHING.
   */
  readonly accounts: readonly SahyogVivranNomineeBankAccount[];
}

/** One drive's Sahyog Vivran, as the substrate holds it. */
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
  /**
   * ⭐ THE NOMINEE BANK BLOCK — Story 11b.3a (`2026-08-28-160` cl.10, `2026-08-28-165` cl.1/cl.3).
   *
   * ⭐ CIPHERTEXT + ONE MASKING VERDICT. The boundary decrypts and projects; ⛔ this module does
   * neither. `accounts` is `[]` when the claim's bank details were never collected.
   */
  readonly nomineeBank: SahyogVivranNomineeBank;
}

export interface ReadSahyogVivranOptions {
  /** The as-of instant. Injected rather than read from the clock so a test can pin it. */
  now?: Date;
}

/**
 * Resolve ONE drive's Sahyog Vivran BY ITS PUBLIC ADDRESS TOKEN, or `null` when there is nothing to
 * show.
 *
 * ⭐⛔ `null` COLLAPSES **FOUR** CASES ON PURPOSE — *"does not exist"*, *"exists but is not visible
 * at this surface's predicate"* (a `spawned` pool), *"the address is malformed"* and — ⭐ Story
 * 11b.10's addition — ***"a REAL drive addressed with a WRONG or ABSENT token"***. The caller
 * renders the SAME 404 for all four. ⛔ A response that distinguishes them is an ENUMERATION ORACLE.
 * ⚠⛔ THE FOURTH IS THE ONE MOST LIKELY TO BE "IMPROVED" INTO A 403 OR A DISTINCT ERROR, and it is
 * the one that must NOT be: *"real drive, wrong token"* answering differently from *"no such drive"*
 * would confirm which addresses name something — i.e. it would hand back exactly the enumeration
 * signal the token was introduced to remove.
 * ⭐ Structurally guaranteed here, ⛔ not remembered: the token is part of the WHERE clause, so a
 * wrong one returns zero rows through the very same path a non-existent drive does.
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
  driveToken: string,
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
      // ⭐ A SECOND, DELIBERATELY DIFFERENT INSTANT — ⛔ not a duplicate of the line above. The one
      // above is the LATEST close/settle event (what the page renders as "closed on"); this is the
      // EARLIEST, and it is the only instant the masking window may be measured from. A late
      // `pool.settled` moves the former forward and would UN-MASK an already-masked drive. See
      // `DRIVE_MASKING_FROM`'s doc-block (second-pass review, 2026-09-03).
      driveMaskingFrom: DRIVE_MASKING_FROM(now),
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
        // ⭐⭐ STORY 11b.10 — THE DRIVE IS RESOLVED BY ITS OPAQUE PUBLIC ADDRESS TOKEN, and by
        // ⛔ NOTHING ELSE. The predicate used to be `pool_canonical_identifier = …`, and because
        // `P-YYYY-MM-###`'s `sequence` is a MONOTONIC per-(pariwar, month) counter, that made the
        // whole surface WALKABLE BY COUNTING — reaching, since 11b.3a, four decrypted Tier-1 bank
        // fields (`2026-09-03-184` (B), Trustee-ratified).
        // ⛔⛔ DO ⛔ NOT ADD AN `OR` ARM FOR THE CANONICAL IDENTIFIER, ⛔ not for old links and
        // ⛔ not "for operators": a read that accepts EITHER form has ⛔ not closed the walk, it has
        // added a lock beside an open door (Trap 3). ⭐ The identifier is still SELECTED and
        // RETURNED below — RETAINED and RENDERED (`-184` cl.2), just ⛔ not addressable.
        // ⚠ A WRONG-OR-ABSENT TOKEN LANDS IN THE SAME `null` AS A NON-EXISTENT DRIVE, by
        // construction rather than by a branch — see this function's doc-block. ⛔ Never split them.
        eq(pools.publicToken, driveToken),
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
  // ⭐ COERCED ONCE and reused — {@link coerceDriveInstant}. The raw `sql` fragment's declared
  // `Date | null` is a claim the runtime does not honour (the value arrives as an ISO STRING), and
  // Story 11b.3a's masking offset is measured FROM this instant, so the coercion is load-bearing.
  // ⚠⭐ CORRECTED 2026-09-04 (11b.3a third code-review pass) — this comment used to say a string here
  // would make *"`getTime()` return NaN and every comparison false — i.e. a FULL ACCOUNT NUMBER
  // staying public"*. ⛔ THAT CONSEQUENCE IS WRONG: a string has no `getTime`, so the call throws
  // `TypeError` and the page 500s — it FAILS CLOSED and publishes NOTHING. ⭐ The coercion is still
  // correct and still required; what changes is the RISK OF REMOVING IT — a reviewer trusting the old
  // comment would rank this as a disclosure hazard when it is an availability one. ⛔ Never re-derive
  // it from `row.driveClosedAt` below.
  const driveClosedAt = coerceDriveInstant(row.driveClosedAt);
  // ⭐ COERCED THE SAME WAY AND FOR THE SAME REASON, but kept SEPARATE from `driveClosedAt` — the two
  // fragments answer different questions and collapsing them re-introduces the un-masking defect.
  const driveMaskingFrom = coerceDriveInstant(row.driveMaskingFrom);

  return {
    poolIndex: row.poolIndex,
    poolCanonicalIdentifier: row.poolCanonicalIdentifier,
    status,
    driveClosedAt,
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
    // ⭐ STORY 11b.3a. ⚠ Reads the SAME `now` as everything above it: the masking verdict and the
    // close instant it is measured from must describe ONE instant, or a page could render a drive as
    // closed-at-T while deciding masking against T'.
    nomineeBank: await readNomineeBank(
      db,
      pariwarId,
      row.claimCaseId,
      driveMaskingFrom,
      // ⭐ THE INTERNAL STATE, ⛔ not the public `status` label computed above — the masking predicate
      // is a domain rule and the public vocabulary is a wire concern (`-144` cl.8).
      row.currentState as SahyogVivranVisiblePoolState,
      now,
    ),
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

/**
 * ⭐ THE NOMINEE BANK BOUNDARY READ — Story 11b.3a (Task 2; AC2, AC4).
 *
 * Resolves the claim's at-most-two accounts (ciphertext AS STORED) plus the ONE masking verdict that
 * governs them, at `now`.
 *
 * ── ⛔ WHAT IT DOES NOT DO, AND EACH IS A RULING RATHER THAN A CHOICE ────────────────────────────
 * ⛔ It does ⛔ **not decrypt**. The four fields stay Tier-1 ciphertext until `apps/api` resolves
 *    them; `apps/public` must ⛔ never gain the capability, because the KEK is shared across EVERY
 *    Tier-1 field class, so granting it for ONE gives it ALL (`2026-08-20-143` cl.1, D6(a)).
 * ⛔ It does ⛔ **not join `member_nominees`**, and ⛔ must never be "fixed" to. 6.8's **D1** removed
 *    the nominee linkage on purpose — the accounts are a CLAIM-SCOPED payment channel, ⛔ not one row
 *    per declared nominee ([[project_nominee_bank_disbursement_channel]]).
 * ⛔ It reads ⛔ **NOTHING about any member.** `2026-08-28-160` **cl.10(f)** rules this a
 *    PUBLIC-PRESENTATION control and ⛔ NOT a member-access control: it must not prevent a
 *    **suspended** member from reaching what they need to contribute and regain active status. ⇒ ⛔ no
 *    `members.state`, ⛔ no `is_valid`, ⛔ no moderation overlay, ⛔ no lifecycle label — here or in the
 *    predicate this calls. A masking check that grows a member-state conjunct is Story 10.10's
 *    `is_valid: false` defect wearing a new costume ([[project_moderation_model_correct_course]]).
 * ⛔ It does ⛔ **not write, delete, overwrite or re-encrypt anything.** cl.10(g): complete bank
 *    details remain available in the protected internal record. Masking is a PROJECTION.
 *
 * ⚠ TWO ROUND TRIPS, both bounded and both `LIMIT`-free by construction: the accounts read is keyed
 * by `(pariwar_id, claim_case_id)` and the table's composite PK caps it at TWO rows; the schedule
 * resolver is `ORDER BY … LIMIT 1` over a per-Pariwar record. ⛔ No dynamic `.limit()` is taken from
 * user input anywhere, so ⛔ no `clampLimit` is owed ([[project_domain_limit_clamp_and_savepoint_retry]]).
 *
 * ⚠ `accounts: []` IS A FIRST-CLASS STATE — the claim's bank details were never collected (6.8's AC3
 * absence signal). ⛔ Never a throw, and the surface renders NOTHING rather than a placeholder.
 */
async function readNomineeBank(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: string,
  /** ⭐ `DRIVE_MASKING_FROM` — the EARLIEST close/settle instant. ⛔ NEVER `driveClosedAt`. */
  driveMaskingFrom: Date | null,
  /** ⭐ The drive's own INTERNAL state — a CAMPAIGN fact, ⛔ never a member handle (cl.10(f)). */
  driveState: SahyogVivranVisiblePoolState,
  now: Date,
): Promise<SahyogVivranNomineeBank> {
  const [rows, setting] = await Promise.all([
    getClaimNomineeBankAccountsCiphertext(db, pariwarId, claimCaseId as ClaimId),
    // ⭐ `null` ⇒ FAIL-OPEN (`D8-default`, `2026-09-02-179` cl.1) — ⛔ never a masked default.
    resolveEffectiveNomineeBankMasking(db, pariwarId, now),
  ]);

  const accounts = rows.flatMap((r): SahyogVivranNomineeBankAccount[] => {
    // ⛔ VALIDATED AGAINST THE LITERAL SET, ⛔ never coerced. The `{1, 2}` CHECK is app-enforced plus
    // DB-backstopped, so a third rank means the row is not what 6.8 authorised — and DROPPING it is
    // the only safe answer on a public page: rendering an unexpected account is worse than rendering
    // one fewer, and throwing would 500 a whole transparency page over one malformed row.
    if (r.accountRank !== 1 && r.accountRank !== 2) return [];
    return [
      {
        accountRank: r.accountRank,
        bankName: r.bankName,
        // ⚠ `.trim() || null`, ⛔ not a raw passthrough (review 2026-09-03). `branch` is Tier-3
        // plaintext resolved from an IFSC lookup whose response contract has no `.min(1)`, and empty
        // BRANCH strings are common in real RBI datasets — an `''` here survives to the wire as a
        // "present" branch, fails the contract's `.min(1).nullable()` at response serialization and
        // 500s the WHOLE transparency page. The render already omits the cell for `null`; this makes
        // a blank branch that same first-class absence. (The `bank_name` column is `NOT NULL` and
        // has no such nullable projection — a truly empty `bank_name` is a data-integrity fault.)
        branch: r.branch?.trim() ? r.branch.trim() : null,
        accountHolderNameCiphertext: r.accountHolderNameCiphertext,
        accountNumberCiphertext: r.accountNumberCiphertext,
        ifscCiphertext: r.ifscCiphertext,
        vpaCiphertext: r.vpaCiphertext,
      },
    ];
  });

  return {
    masked: isNomineeBankMasked({ setting, driveClosedAt: driveMaskingFrom, driveState, now }),
    accounts,
  };
}
