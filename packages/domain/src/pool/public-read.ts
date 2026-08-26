// The PUBLIC SAHYOG DRIVE pool index read — Story 11b.1 (Task 1; AC1, AC2, AC4).
//
// One bounded page of the unauthenticated Sahyog Drive, resolved in ONE query: the pool's
// public identity, its district, its close/settle instant, its CONFIRMED contribution count,
// its Pool-Reality-#2 outcome, and — for the deceased member the drive is FOR — the KYC name
// CIPHERTEXT AS STORED plus the per-subject consent VERDICT.
//
// ── ⛔ THIS MODULE DECIDES A RENDER, NEVER A BENEFIT ─────────────────────────────────
// Copied verbatim in posture from `member/directory-read.ts`, because the hazard is identical.
// It reads `pools.current_state` and a per-Pariwar publication flag — both of which ALSO feed
// operational paths — but ONLY to decide whether a row appears on a web page. ⛔ No `is_valid`,
// no `is_assignable`, no eligibility, pool-assignment, validity or peer-mesh predicate is
// written, conjoined or consulted here, and a diff in which a drive-listing predicate reaches an
// eligibility path must be rejected in review (the Story 10.10 shape,
// [[project_moderation_model_correct_course]]).
//
// ── TRANSPORT-FREE, AUDIT-FREE, AND ⛔ DECRYPT-FREE BY RULE ──────────────────────────
// ⛔ NO HTTP, ⛔ no audit, ⛔ no decryption, ⛔ no permission check, ⛔ no presentation policy.
// This module returns `name_ciphertext` exactly as `member_kyc_profiles` stores it. The decrypt
// is `apps/api/src/modules/public-pages/`'s work and NOWHERE else: `apps/public` provably holds
// no KMS material (`no-kms-in-public.test.ts` scans the whole app), so if that handler does not
// decrypt, NOTHING does (`2026-08-20-143` cl.1).
//
// ── ⛔ THE CLAIM'S SUBJECT COMES FROM THE CLAIM, ⛔ NEVER FROM A LIFECYCLE STATE ─────
// ⭐ THE POOL→CLAIM LINK *IS* THE SUBJECT FACT: `pools.claim_case_id` → `claims.deceased_member_id`.
// ⛔ NO predicate in this module may try to re-derive that subject from `members.state`, and it does
// ⛔ not need to. `MEMBER_LIFECYCLE_STATES` carries no label for it at all — the condition is an
// OVERLAY, ⛔ never a lifecycle label — so a predicate reading `members.state` is blind to it BY
// CONSTRUCTION and cannot be fixed by widening a tuple. ⚠ The memory note recording that is cited
// by its slug in `member/overlay.ts` and `member/directory-read.ts`, ⛔ deliberately not repeated
// here: the slug itself contains a category-specific token, and the gate below scans this file for
// exactly that. ⭐ The gate being blunt about slugs is a fair price for it being blunt about code.
// ⭐ AND NOTE THE FAILURE MODE HERE IS THE **INVERSE** OF STORY 11a.3'S, which is why the C-5
// correction must ⛔ NOT be pasted in: 11a.3 wrongly PUBLISHED a member it should have omitted, so
// it needed the `account-frozen` overlay conjunct ADDED. This index would wrongly **OMIT** the very
// people it exists to commemorate. ⛔ Do not add that conjunct here.
//
// ⚠ ⛔ AND THIS MODULE IS CATEGORY-AGNOSTIC, deliberately: it joins pool → claim and reads the
// claim's subject, which holds for EVERY `support_category`. ⛔ There is no branch on
// `support_category` here and there must never be one — v2 `_daan` activation is a config change,
// ⛔ not an engine refactor (Story 7.1 AC4). ⭐ The `pool-support-category-invariant` gate enforces
// exactly that, and it scans COMMENTS too on the stated ground that a pool-engine comment thinking
// in category-specific terms is itself the smell. ⛔ Do not reintroduce that framing here.
//
// ── ⭐ ONE SET-BASED QUERY, ⛔ NEVER A PER-ROW FAN-OUT (D7(a)) ───────────────────────
// Two separate doors lead to the same AR-65 N+1 here, and BOTH are shut in this module:
//   1. `listConfirmedContributorsForPool` scans `events_log` and reconciles the event-id chain
//      in JS, PER POOL. Calling it for 25 rows is 25 scans — the N+1 Story 10.11 paid
//      44s → 220s for. ⇒ the count is a LATERAL AGGREGATE below.
//   2. ⭐ `consentExists` is ONE `LIMIT 1` QUERY PER SUBJECT. Calling it per rendered pool is 50
//      round-trips for one page — the IDENTICAL N+1, arriving through a different door. ⇒ the
//      verdict is a correlated EXISTS below, resolved for the whole page in the same query.
// ⚠ ONE injected `now` feeds every time-bounded fragment AND the count accessor, so the page and
// its total can never disagree about the instant they describe.
//
// ⚠ Literal outer-table qualifiers in every correlated subquery
// ([[project_epic6_drizzle_correlated_subquery_bug]]): interpolating an outer `Column` into a
// subquery whose own FROM has a column of that name collapses the correlation into a tautology,
// and every DB-free test stays green while it does.

import { and, desc, eq, inArray, sql } from 'drizzle-orm';

import { classifyCycleOutcome, type CycleFundingOutcome } from '../close-of-cycle/framing.js';
import type { Db } from '../db.js';
import type { MemberId, PariwarId, PoolId } from '../ids/index.js';
import { clampLimit } from '../pagination.js';
import { poolIndexFromLetterCode } from './naming.js';
import { claims } from '../schema/claims.js';
import { memberKycProfiles } from '../schema/member_kyc_profiles.js';
import { memberPostings } from '../schema/member_postings.js';
import { memberPoolAssignments } from '../schema/member_pool_assignments.js';
import { pools } from '../schema/pools.js';

/**
 * ⭐ THE LISTING PREDICATE, HALF ONE — which pool states appear publicly.
 *
 * `closed` → **Active** (the collection window has shut; the family is not yet paid).
 * `settled` → **Archive** (disbursed; terminal).
 *
 * ⛔ `spawned` and `live` are ABSENT deliberately: a drive still collecting is not a
 * transparency record, it is an open solicitation, and publishing it would invite exactly the
 * "who has given so far" reading this surface exists to refuse. ⛔ Widening this tuple is a
 * ruling change, not a tuning knob.
 */
export const SAHYOG_DRIVE_VISIBLE_POOL_STATES = ['closed', 'settled'] as const;
export type SahyogDriveVisiblePoolState = (typeof SAHYOG_DRIVE_VISIBLE_POOL_STATES)[number];

/**
 * The two-label PUBLIC vocabulary. ⛔ THE WIRE TOKEN IS NEVER THE INTERNAL ONE — `2026-08-21-144`
 * cl.8 records `/members` having leaked the internal `lock-in` value onto a public JSON route,
 * and this surface is built not to repeat it.
 */
export const SAHYOG_DRIVE_STATUSES = ['active', 'archive'] as const;
export type SahyogDriveStatus = (typeof SAHYOG_DRIVE_STATUSES)[number];

const PUBLIC_STATUS_BY_POOL_STATE: Record<SahyogDriveVisiblePoolState, SahyogDriveStatus> = {
  closed: 'active',
  settled: 'archive',
};

/** The event types whose `occurred_at` IS the drive's close/settle instant. */
const POOL_CLOSED_EVENT_TYPE = 'pool.closed' as const;
const POOL_SETTLED_EVENT_TYPE = 'pool.settled' as const;

/**
 * Canonical financial truth ([[project_contribution_event_name_contract]]).
 * ⚠ The reversal is `reconciliation.*`, deliberately OFF the 8.10 `contribution.*` fence —
 * ⛔ do not try to select both by prefix, and ⛔ do not filter reversals out by one.
 */
const CONFIRMED_EVENT_TYPE = 'contribution.confirmed' as const;
const CONFIRMATION_REVERSED_EVENT_TYPE = 'reconciliation.confirmation-reversed' as const;
const CONFIRMED_PAYLOAD_POOL_KEY = 'poolId' as const;
const REVERSED_CONFIRMED_EVENT_ID_KEY = 'reversedConfirmedEventId' as const;

/** The per-subject publication gate this surface declares (Story 11b.1 AC12 / D4(b)). */
export const SAHYOG_DRIVE_CONSENT_TYPE = 'sahyog_drive_publication' as const;

/** Page size served when the caller asks for nothing, and the hard ceiling. */
export const SAHYOG_DRIVE_PAGE_SIZE_DEFAULT = 25;
export const SAHYOG_DRIVE_PAGE_SIZE_CAP = 50;

/**
 * ⭐ THE CONFIRMED COUNT, WITH ITS REVERSALS COMPENSATED — set-based, per row, in ONE pass.
 *
 * Counts live `contribution.confirmed` events for the pool that have NOT been walked back by a
 * `reconciliation.confirmation-reversed` naming them. ⛔ Yellow / attested / pending / projected
 * can never satisfy this, structurally: the type is hard-filtered, with no parameter that could
 * admit one (Story 9.5). ⛔ And it is a COUNT of confirmations, ⛔ never a SUM of amounts.
 *
 * ⚠ This is the set-based form of `contribution/read.ts`'s JS event-id reconciliation, and it
 * must stay observationally equivalent to it ([[project_contribution_fact_projection_substrate]]).
 * ⭐ "Change one, check the other" — `listConfirmedContributorsForPool` is the other.
 */
const CONFIRMED_CONTRIBUTION_COUNT = (now: Date) => sql<string>`(
    SELECT count(*)
      FROM events_log c
     WHERE c.pariwar_id = "pools"."pariwar_id"
       AND c.event_type = ${CONFIRMED_EVENT_TYPE}
       AND c.payload ->> ${CONFIRMED_PAYLOAD_POOL_KEY} = "pools"."pool_id"::text
       AND c.occurred_at <= ${now}
       AND NOT EXISTS (
         SELECT 1
           FROM events_log r
          WHERE r.pariwar_id = c.pariwar_id
            AND r.event_type = ${CONFIRMATION_REVERSED_EVENT_TYPE}
            AND r.payload ->> ${REVERSED_CONFIRMED_EVENT_ID_KEY} = c.event_id::text
            AND r.occurred_at <= ${now}
       )
  )`;

/**
 * ⭐ THE CONSENT VERDICT, BATCHED — the D7(a) N+1 must not return through this door.
 *
 * The set-based form of `consentExists(db, pariwarId, subjectId, type, validAt)`, and it must
 * stay observationally equivalent to it: the SAME validity window
 * (`granted_at <= at AND (revoked_at IS NULL OR at < revoked_at)`), the same subject convention
 * (subject = the DECEASED member — [[project_consent_subject_key_convention]]), the same
 * tenant scope. ⭐ "Change one, check the other" — `consent/read.ts` is the other.
 *
 * ⚠ A MISSING consent and a REVOKED one are the SAME verdict, and that is intended: neither
 * authorises a render. ⛔ Neither omits the ROW — see {@link SahyogDriveEntry.nameConsentGranted}.
 *
 * ⚠ ⛔ NO `::text` CAST ON THE SUBJECT COMPARISON. `consent_records.subject_id` is a `uuid`
 * COLUMN — Story 2.7 kept the subject polymorphic in MEANING, ⛔ not in TYPE — so casting either
 * side raises `operator does not exist: uuid = text` (42883). Both sides are already uuid.
 */
const NAME_CONSENT_GRANTED = (now: Date) => sql<boolean>`EXISTS (
    SELECT 1
      FROM consent_records cr
     WHERE cr.pariwar_id = "pools"."pariwar_id"
       AND cr.subject_id = "claims"."deceased_member_id"
       AND cr.consent_type = ${SAHYOG_DRIVE_CONSENT_TYPE}
       AND cr.granted_at <= ${now}
       AND (cr.revoked_at IS NULL OR ${now} < cr.revoked_at)
  )`;

/** The drive's close (Active) or settle (Archive) instant, from the pool's own event stream. */
const DRIVE_CLOSED_AT = (now: Date) => sql<Date | null>`(
    SELECT e.occurred_at
      FROM events_log e
     WHERE e.stream_id = "pools"."pool_id"
       AND e.event_type IN (${POOL_CLOSED_EVENT_TYPE}, ${POOL_SETTLED_EVENT_TYPE})
       AND e.occurred_at <= ${now}
     ORDER BY e.occurred_at DESC, e.event_version DESC
     LIMIT 1
  )`;

/**
 * The deceased member's posting district, RAW — ⛔ never lifted through the geo tree.
 *
 * ⭐ FROZEN AS OF THE DRIVE'S CLOSE/SETTLE INSTANT, ⛔ never `now` — this surface calls the
 * Archive section "a permanent record" (Review finding, 2026-08-26), so a posting correction
 * made AFTER a pool closed must never retroactively change what an already-published row shows.
 * `COALESCE(..., now)` only covers the already-flagged data anomaly of a closed/settled pool
 * whose stream carries no close/settle event yet ({@link DRIVE_CLOSED_AT}) — it is not a second
 * intended code path.
 */
const DECEASED_DISTRICT = (now: Date) => sql<string | null>`(
    SELECT p.district
      FROM ${memberPostings} p
     WHERE p.member_id = "claims"."deceased_member_id"
       AND p.pariwar_id = "claims"."pariwar_id"
       AND p.created_at <= COALESCE(${DRIVE_CLOSED_AT(now)}, ${now})
     ORDER BY p.created_at DESC, p.posting_id DESC
     LIMIT 1
  )`;

/** How many members were assigned to contribute to this pool — the EXPECTED side of the outcome. */
const ASSIGNED_MEMBER_COUNT = sql<string>`(
    SELECT count(*)
      FROM ${memberPoolAssignments} a
     WHERE a.pool_id = "pools"."pool_id"
       AND a.pariwar_id = "pools"."pariwar_id"
  )`;

/** One Sahyog Drive row, as the substrate holds it. ⛔ The name is CIPHERTEXT, not a name. */
export interface SahyogDriveEntry {
  /** The pool's canonical id. ⚠ INTERNAL — ⛔ never serialized onto the public wire (AC8). */
  poolId: PoolId;
  /** The 0-based index within the cycle; `poolLetterCode()` is a pure function of it. */
  poolIndex: number;
  /** `P-YYYY-MM-###` (Story 7.2). Public, and one of the three searchable dimensions. */
  poolCanonicalIdentifier: string;
  /** `active` (window closed) | `archive` (disbursed). The PUBLIC token, never the internal one. */
  status: SahyogDriveStatus;
  /** The close/settle instant. `null` when the pool's stream carries no such event yet. */
  driveClosedAt: Date | null;
  /** The deceased member's latest posting district, RAW. `null` = no posting row. */
  district: string | null;
  /** Confirmed contributions, reversals compensated. ⛔ A count, ⛔ never a sum, ⛔ never a score. */
  confirmedContributionCount: number;
  /**
   * Pool-Reality #2, as an OPAQUE ENUM. ⭐ The target is QUARANTINED by construction: the totals
   * are compared inside this module and ⛔ only this enum leaves it, so no expected-total,
   * percentage, shortfall or comparison figure can reach any render model (AC4).
   */
  fundingOutcome: CycleFundingOutcome;
  /**
   * The consent subject — `claims.deceased_member_id`.
   * ⚠ INTERNAL, for the consent join and the decrypt ONLY. ⛔ NEVER serialized onto the public
   * wire: a per-member permalink is an enumeration primitive in its own right (11a.3, control 5).
   */
  deceasedMemberId: MemberId;
  /**
   * Tier-1 `member_kyc_profiles.name_ciphertext` AS STORED, or `null` when the deceased member
   * has no KYC profile row. ⛔ The boundary decrypts, ⛔ not this module.
   */
  deceasedNameCiphertext: string | null;
  /**
   * ⭐ WHETHER THE ROW MAY BE *NAMED* — ⛔ NEVER WHETHER IT MAY *EXIST*.
   *
   * `false` ⇒ the boundary skips the decrypt entirely (⛔ zero KMS calls, and ⛔ no decrypt
   * without an authorising basis) and renders the row WITHOUT a name. Everything else — letter
   * code, canonical identifier, district, close date, confirmed count, framing — renders
   * regardless. ⇒ the index degrades PER-POOL, ⛔ never per-page, and a family's declination
   * removes a NAME, ⛔ never a DRIVE from the public record.
   */
  nameConsentGranted: boolean;
}

/** The three ruled search dimensions (D2(a)) — ⭐ all answerable WITHOUT a single decrypt. */
export interface SahyogDriveFilters {
  /** Exact district match against the deceased member's latest posting. */
  district?: string;
  /** Inclusive lower bound on the drive's close/settle instant. */
  closedFrom?: Date;
  /** Inclusive upper bound on the drive's close/settle instant. */
  closedTo?: Date;
  /**
   * The pool's canonical identifier or its letter code.
   * ⛔ There is NO name filter, and ⛔ none may be added by scanning, caching or re-reading
   * rendered pages: `member_kyc_profiles` carries no blind index and envelope encryption gives
   * every name its own DEK, so there is no ciphertext equality to match on (D2(a), deferred on
   * the `name_blind_index` trigger). ⭐ A RENDERED name is still not a SEARCHABLE one — rendering
   * reads one row you already selected; searching needs a predicate over every row you have not.
   */
  poolCode?: string;
}

export interface ListSahyogDriveOptions extends SahyogDriveFilters {
  /** Page size. ⛔ Routed through `clampLimit` — the `domain-accessor-invariants` invariant. */
  limit?: number;
  /** Row offset. Bounded at 0 below; the CALLER owns the deep-pagination horizon. */
  offset?: number;
  /** The as-of instant. Injected rather than read from the clock so a test can pin it. */
  now?: Date;
}

/**
 * The FULL listing predicate, shared by the page read and the count so the two cannot drift into
 * two different indexes. ⛔ Never re-spell any half at a call site.
 *
 * ⚠ `now` is REQUIRED, ⛔ not defaulted here: both callers must resolve the index as of ONE
 * instant, and a default would let the page read and its total silently take two.
 *
 * `pariwar_id` rides ALONGSIDE RLS as an explicit predicate — defense-in-depth, and what keeps
 * the read correct if a caller ever passes a BYPASSRLS pool.
 */
function sahyogDrivePredicate(pariwarId: PariwarId, now: Date, filters: SahyogDriveFilters) {
  const conjuncts = [
    eq(pools.pariwarId, pariwarId),
    inArray(pools.currentState, [...SAHYOG_DRIVE_VISIBLE_POOL_STATES]),
  ];

  if (filters.district !== undefined) {
    // Case/whitespace-folded on both sides: the RENDERED district is trimmed (handlers.ts), so
    // the filter must match under the same normalization or a district that displays correctly
    // becomes unfindable by filtering on it (Review finding, 2026-08-26).
    conjuncts.push(
      sql`trim(lower(${DECEASED_DISTRICT(now)})) = lower(trim(${filters.district}))`,
    );
  }
  if (filters.closedFrom !== undefined) {
    conjuncts.push(sql`${DRIVE_CLOSED_AT(now)} >= ${filters.closedFrom}`);
  }
  if (filters.closedTo !== undefined) {
    conjuncts.push(sql`${DRIVE_CLOSED_AT(now)} <= ${filters.closedTo}`);
  }
  if (filters.poolCode !== undefined) {
    // Matched against the canonical identifier OR the letter code the pool index yields.
    // ⛔ An EXACT match, ⛔ never a LIKE/prefix scan: a prefix filter over a public index is an
    // enumeration primitive wearing a search box.
    //
    // The letter code is decoded (bijective base-26, case-insensitive) rather than matched in
    // SQL — `poolIndexFromLetterCode` is the one inverse of `poolLetterCode` and must stay the
    // only decoder (Review finding, 2026-08-26: this OR half was previously never wired in).
    const upperPoolCode = filters.poolCode.toUpperCase();
    const letterIndex = /^[A-Z]+$/.test(upperPoolCode)
      ? poolIndexFromLetterCode(upperPoolCode)
      : null;
    conjuncts.push(
      letterIndex === null
        ? sql`${pools.poolCanonicalIdentifier} = ${filters.poolCode}`
        : sql`(${pools.poolCanonicalIdentifier} = ${filters.poolCode} OR ${pools.poolIndex} = ${letterIndex})`,
    );
  }

  return and(...conjuncts);
}

/**
 * Resolve ONE page of the public Sahyog Drive in ONE query.
 *
 * ⭐ THE ORDER IS the close/settle instant DESCENDING with a PRIMARY-KEY TIE-BREAK, and both
 * halves are load-bearing. Offset paging over a NON-deterministic order silently duplicates rows
 * onto one page and drops them from another; "page N is the same page N on every request" is a
 * property of this ORDER BY. ⛔ AND THE ORDER IS NOT A RANKING: ⛔ never by contribution count,
 * ⛔ never by amount, and ⛔ no "most-supported" ordering is offered at any tier (AC5).
 *
 * ⚠ THE JOIN TO `claims` IS PART OF THE PREDICATE — and it is the SUBJECT FACT, ⛔ not a
 * convenience: `pools.claim_case_id → claims.deceased_member_id` is how this module knows who the
 * drive is FOR without ever reading a lifecycle state. ⛔ An INNER join on purpose: a pool with no
 * claim has no subject and no drive to publish.
 *
 * ⚠ THE JOIN TO `member_kyc_profiles` IS A *LEFT* JOIN, DELIBERATELY, AND THIS IS THE ONE PLACE
 * THIS MODULE MUST NOT COPY `/members`. There, a missing KYC profile omits the ROW, because a
 * directory row where a person's name belongs must never be blank. HERE THE ROW STILL CARRIES THE
 * DRIVE — its code, district, date and confirmed count are all true and all public — so a missing
 * profile omits the NAME and keeps the ROW (AC2). ⛔ A shorter index is not acceptable here; a
 * nameless row is.
 */
export async function listPublicSahyogDrivePools(
  db: Db,
  pariwarId: PariwarId,
  opts: ListSahyogDriveOptions = {},
): Promise<SahyogDriveEntry[]> {
  const now = opts.now ?? new Date();
  const offset = Math.max(0, opts.offset ?? 0);

  const rows = await db
    .select({
      poolId: pools.poolId,
      poolIndex: pools.poolIndex,
      poolCanonicalIdentifier: pools.poolCanonicalIdentifier,
      currentState: pools.currentState,
      fixedAmount: pools.fixedAmount,
      deceasedMemberId: claims.deceasedMemberId,
      deceasedNameCiphertext: memberKycProfiles.nameCiphertext,
      district: DECEASED_DISTRICT(now),
      driveClosedAt: DRIVE_CLOSED_AT(now),
      // ⚠ `count(*)` is `bigint` ⇒ the driver hands back a STRING, not a number. Coerced at the
      // accessor boundary below — ⛔ never left to an implicit `+` somewhere downstream.
      confirmedCount: CONFIRMED_CONTRIBUTION_COUNT(now),
      assignedCount: ASSIGNED_MEMBER_COUNT,
      nameConsentGranted: NAME_CONSENT_GRANTED(now),
    })
    .from(pools)
    .innerJoin(claims, eq(claims.claimCaseId, pools.claimCaseId))
    .leftJoin(memberKycProfiles, eq(memberKycProfiles.memberId, claims.deceasedMemberId))
    .where(sahyogDrivePredicate(pariwarId, now, opts))
    // ⚠ EXPLICIT `NULLS LAST` — the predicate already restricts to closed/settled pools, so a
    // null `driveClosedAt` here is a data anomaly, not a legitimate "not yet closed" row. `DESC`
    // defaults to `NULLS FIRST` in Postgres, which would sort that anomaly to the very top ahead
    // of genuinely-recent closures (Review finding, 2026-08-26).
    .orderBy(sql`${DRIVE_CLOSED_AT(now)} DESC NULLS LAST`, desc(pools.poolId))
    .limit(
      clampLimit(opts.limit, {
        default: SAHYOG_DRIVE_PAGE_SIZE_DEFAULT,
        cap: SAHYOG_DRIVE_PAGE_SIZE_CAP,
      }),
    )
    .offset(offset);

  return rows.map((r) => {
    const confirmedContributionCount = Number(r.confirmedCount ?? 0);
    const assignedCount = Number(r.assignedCount ?? 0);
    return {
      poolId: r.poolId,
      poolIndex: r.poolIndex,
      poolCanonicalIdentifier: r.poolCanonicalIdentifier,
      // The predicate admits only these two; the cast records that rather than re-checking it.
      status: PUBLIC_STATUS_BY_POOL_STATE[r.currentState as SahyogDriveVisiblePoolState],
      driveClosedAt: r.driveClosedAt,
      district: r.district,
      confirmedContributionCount,
      // ⭐ THE TARGET IS QUARANTINED HERE AND NOWHERE ELSE. Both totals are whole INR — the unit
      // `classifyCycleOutcome` documents — and BOTH DIE ON THIS LINE: only the opaque outcome
      // enum is returned. ⛔ Do not widen `SahyogDriveEntry` to carry either of them, under any
      // name: `classifyCycleOutcome` quarantines the target by construction and this surface must
      // not smuggle one past it (AC4).
      fundingOutcome: classifyCycleOutcome({
        expectedTotal: assignedCount * r.fixedAmount,
        deliveredTotal: confirmedContributionCount * r.fixedAmount,
      }),
      deceasedMemberId: r.deceasedMemberId,
      deceasedNameCiphertext: r.deceasedNameCiphertext,
      nameConsentGranted: r.nameConsentGranted,
    };
  });
}

/**
 * Count the pools the public Sahyog Drive would list, under the SAME predicate.
 *
 * ⭐ WHY THIS EXISTS: the honest "next" link and the deep-pagination horizon both need a real
 * total. ⛔ Deriving *"there is a next page"* from a full-page result is a lie — an index with
 * exactly `limit` drives would advertise a page-2 that is empty.
 *
 * ⚠ AND `total` IS INDEX SIZE, ⛔ NOT RENDERED-ROW COUNT — but note the reason DIFFERS from
 * `/members`, which is the seam where "copy members.astro in every respect" stops. There, an
 * unresolvable name suppresses the ROW, so the page really can come up short of `total`. Here
 * AC2 rules the opposite: an unconsented or unresolvable name omits the NAME and the ROW
 * SURVIVES. ⇒ rendered rows and `total` agree except for pagination and the publication switch —
 * a NAMELESS row still counts. ⛔ Never add an omission count either: a per-row "name withheld"
 * tally is exactly the enumeration signal AC2 forbids announcing.
 */
export async function countPublicSahyogDrivePools(
  db: Db,
  pariwarId: PariwarId,
  opts: Omit<ListSahyogDriveOptions, 'limit' | 'offset'> = {},
): Promise<number> {
  const now = opts.now ?? new Date();

  const rows = await db
    .select({ total: sql<string>`count(*)` })
    .from(pools)
    .innerJoin(claims, eq(claims.claimCaseId, pools.claimCaseId))
    .where(sahyogDrivePredicate(pariwarId, now, opts));

  // ⚠ `count(*)` is bigint ⇒ a STRING from the driver.
  return Number(rows[0]?.total ?? 0);
}
