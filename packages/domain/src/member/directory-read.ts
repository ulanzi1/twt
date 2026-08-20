// The PUBLIC MEMBER DIRECTORY roster read — Story 11a.3 (Task 2; AC2).
//
// One page of the unauthenticated Member Directory, resolved in ONE query: member id +
// cached lifecycle state + latest posting district + the KYC name CIPHERTEXT AS STORED.
//
// ── TRANSPORT-FREE PRIMITIVE (the `searchMembers` precedent) ─────────────────────────
// ⛔ NO HTTP, ⛔ no audit, ⛔ no decryption, ⛔ no permission check, ⛔ no presentation
// policy. The `apps/api` boundary orchestrates all of those (`2026-08-20-143` cl.1: the
// decrypt lives at `apps/api/src/modules/public-pages/`, because `apps/public` verifiably
// holds no KMS material). This module returns `name_ciphertext` exactly as `member_kyc_
// profiles` stores it — the same posture `getMemberNominees` and `searchMembers` take.
//
// ── ⭐ WHY THIS IS NOT A FOURTH SHAPE ────────────────────────────────────────────────
// Three set-based cohort district reads already exist — `surveys/read.ts`,
// `news-blog/audience.ts`, `banners/audience.ts` — and this ADAPTS them rather than
// inventing a fourth. Two properties are copied deliberately and ⛔ must not be "tidied":
//
//   1. ⭐ The correlated subqueries use LITERAL outer-table qualifiers
//      (`p.member_id = "members"."member_id"`), ⛔ never an interpolated `${members.memberId}`
//      Column — the mitigation for [[project_epic6_drizzle_correlated_subquery_bug]], where
//      Drizzle renders the Column as a BARE `"member_id"`, the subquery's own `FROM` has a
//      column of that name, Postgres binds to the INNER one (nearest scope wins), and the
//      correlation collapses into an always-true tautology.
//
//      ⚠ AND THE HONEST BOUND ON THAT CLAIM, verified rather than inherited: in THIS query
//      the two forms compile to BYTE-IDENTICAL SQL, because the `innerJoin` below puts more
//      than one table in scope and Drizzle therefore emits the full `"members"."member_id"`
//      qualifier by itself. The precedents (`surveys/read.ts`, `news-blog/audience.ts`) are
//      single-table `.from(members)` reads, which is where the bare-column rendering — and
//      the bug — actually occurs. ⛔ So do NOT describe the literal qualifiers as what keeps
//      THIS read correct today; they are kept because the property is ONE EDIT AWAY from
//      mattering (drop the join, or re-scope the projection, and the interpolated form
//      silently becomes a tautology while every DB-free test stays green). ⛔ A negative
//      control that merely swaps the two spellings proves nothing here and must not be
//      recorded as if it did — the control that DOES bite removes the correlation itself.
//   2. ⚠ The latest-posting comparator is `ORDER BY p.created_at DESC, p.posting_id DESC`
//      — the SAME D3 rule `member-geo/resolve.ts`'s `getMemberCurrentDistrict` implements
//      via Drizzle's `.orderBy()`, and that `surveys/read.ts` + `news-blog/audience.ts` +
//      `claim/peer-mesh-read.ts` + `member/posting.ts` each carry. ⛔ `created_at DESC`
//      ALONE IS NOT THE RULE: without the `posting_id` tie-break two postings sharing a
//      `created_at` resolve NON-DETERMINISTICALLY, which would break this module's own
//      paging-stability guarantee from inside the query. **Change one, check the other.**
//
// ── ⛔ THE DISTRICT IS THE RAW POSTING STRING, NOT A LIFTED ONE ──────────────────────
// Every *audience* reader pipes its district through `liftDistrictThroughTree` because it
// is deciding ELIGIBILITY. This surface is deciding a DISPLAY VALUE. Lifting it here would
// be a directory attribute quietly acquiring policy meaning — the `architecture.md`
// §2.13.2 violation (*"Directory attributes are display-only BY DEFAULT … enforced by
// signature"*) recorded at `2026-08-20-143` cl.14. ⛔ Do not add a lift.
//
// ── ⛔ THIS MODULE DECIDES A RENDER, NEVER A BENEFIT ─────────────────────────────────
// It reads `members.state` and the moderation overlay, both of which ALSO feed benefit
// paths — but only to decide whether a row appears on a web page. ⛔ No `is_valid`, no
// `is_assignable`, no eligibility, pool-assignment, validity or peer-mesh predicate is
// written, conjoined or consulted here, and a diff in which a directory-listing predicate
// reaches an eligibility path must be rejected in review (the Story 10.10 shape).

import { and, asc, eq, inArray, sql } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { MemberId, PariwarId } from '../ids/index.js';
import { clampLimit } from '../pagination.js';
import { memberKycProfiles } from '../schema/member_kyc_profiles.js';
import { memberPostings } from '../schema/member_postings.js';
import { members } from '../schema/members.js';
import type { MemberLifecycleState } from './state.js';

/**
 * ⭐ THE RULED ROSTER PREDICATE, HALF ONE — the lifecycle states that appear publicly.
 *
 * `2026-08-20-143` cl.3 (D3(a)). ⇒ every `pending-kyc` / `pending-fee` / `pending-valid` /
 * `lapsed-unpaid` / `withdrawn` / `anonymized` member is OMITTED. ⛔ Widening this tuple is
 * a ruling change, not a tuning knob: `lock-in` is here because the epic's own field row
 * declares the status pill *"active / lock-in only"*, and its presence is exactly what
 * publishes a member's lock-in standing to the internet — the consequence raised to the
 * Trustee Panel as an OPEN finding at `2026-08-20-143` cl.8.
 */
export const DIRECTORY_VISIBLE_MEMBER_STATES = [
  'active',
  'active-in-grace',
  'lock-in',
] as const satisfies readonly MemberLifecycleState[];

export type DirectoryVisibleMemberState = (typeof DIRECTORY_VISIBLE_MEMBER_STATES)[number];

/**
 * ⭐ THE RULED ROSTER PREDICATE, HALF TWO — moderation standing excludes the sanctioned.
 *
 * `2026-08-20-143` cl.3 (D3(a)): moderation status ∉ `{suspended, terminated}`.
 *
 * ⚠ Its cost is recorded, ⛔ not absorbed: a suspension SILENTLY REMOVES a member from the
 * public directory, and ⛔ no Niyamavali clause describes that consequence. That is an OPEN
 * finding raised to the Trustee Panel (`2026-08-20-143` cl.8) — ⛔ not something this module
 * closes, and ⛔ not a reason to quietly change the predicate.
 */
export const DIRECTORY_EXCLUDED_MODERATION_ACTIONS = ['suspend', 'terminate'] as const;

/** One public-directory row, as the substrate holds it. ⛔ The name is CIPHERTEXT, not a name. */
export interface DirectoryRosterEntry {
  memberId: MemberId;
  /** The cached lifecycle state — always one of {@link DIRECTORY_VISIBLE_MEMBER_STATES}. */
  state: DirectoryVisibleMemberState;
  /** Latest posting district, RAW (⛔ never lifted through the geo tree). `null` = no posting row. */
  district: string | null;
  /** Tier-1 `member_kyc_profiles.name_ciphertext` AS STORED. ⛔ The boundary decrypts, not this. */
  nameCiphertext: string;
}

export interface ListDirectoryMembersOptions {
  /** Page size. ⛔ Routed through `clampLimit` — the `domain-accessor-invariants` invariant. */
  limit?: number;
  /** Row offset. Bounded at 0 below; the CALLER owns the deep-pagination horizon. */
  offset?: number;
  /**
   * The as-of instant for the latest-posting resolution, matching the precedents'
   * `created_at <= <now>` bound. Injected rather than read from the clock so a test can pin it.
   */
  now?: Date;
}

/**
 * Page size served when the caller asks for nothing, and the hard ceiling.
 *
 * ⚠ The cap is the SECOND of two independent bounds and that is deliberate, ⛔ not redundancy
 * to tidy away: `apps/public` REJECTS an over-cap request at the parse (no silent clamp), and
 * this clamps at the accessor so a future caller that skips the parse still cannot pull a
 * table. ⛔ Raising either is an FR-91 change needing its own ruling.
 */
export const DIRECTORY_PAGE_SIZE_DEFAULT = 25;
export const DIRECTORY_PAGE_SIZE_CAP = 50;

/**
 * The moderation half of the roster predicate, as a correlated SQL fragment.
 *
 * "The member's LATEST moderation action is not a live sanction" — where a member with no
 * moderation history at all `COALESCE`s to `'restore'` (the unmoderated default). The
 * `DISTINCT ON`-equivalent ordering is `moderation/read.ts:258`'s COMPLETE tie-break chain
 * (`acted_at DESC, created_at DESC, moderation_action_id DESC`), ⛔ not a truncated copy of
 * it: `acted_at` is the injected APP clock and can tie, `created_at` is the DB clock, and the
 * PK breaks the last tie. Mirroring the rigour is the point, not mirroring the keyword.
 *
 * ⭐ Literal outer qualifiers, for the reason argued in the module header.
 */
const NOT_UNDER_SANCTION = sql`COALESCE((
    SELECT a.action
      FROM member_moderation_actions a
     WHERE a.member_id = "members"."member_id" AND a.pariwar_id = "members"."pariwar_id"
     ORDER BY a.acted_at DESC, a.created_at DESC, a.moderation_action_id DESC
     LIMIT 1
  ), 'restore') = 'restore'`;

/**
 * The FULL ruled roster predicate, shared by the page read and the count so the two cannot
 * drift into two different rosters. ⛔ Never re-spell either half at a call site.
 *
 * `pariwar_id` rides ALONGSIDE RLS as an explicit predicate — defense-in-depth, and what keeps
 * the read correct if a caller ever passes a BYPASSRLS pool (the member-nominees-read precedent).
 */
function directoryRosterPredicate(pariwarId: PariwarId) {
  return and(
    eq(members.pariwarId, pariwarId),
    inArray(members.state, [...DIRECTORY_VISIBLE_MEMBER_STATES]),
    NOT_UNDER_SANCTION,
  );
}

/**
 * Resolve ONE page of the public Member Directory in ONE query.
 *
 * ⭐ ONE QUERY, ⛔ NEVER A PER-MEMBER FAN-OUT. Calling `getMemberPostingLatest` per row is the
 * exact N+1 AR-65 exists to prevent, and the one Story 10.11 already paid 44s → 220s for.
 *
 * ⭐ THE ORDER IS `member_id` ASCENDING, AND THAT IS LOAD-BEARING, ⛔ not a default. Offset
 * paging over a NON-deterministic order silently duplicates rows onto one page and drops them
 * from another; "page N is the same page N on every request" is a property of this ORDER BY.
 *
 * ⚠ THE INNER JOIN ON `member_kyc_profiles` IS PART OF THE PREDICATE. A member with no KYC
 * profile row has no name to publish, and a public directory row where a person's name belongs
 * must ⛔ never be blank — so they are omitted here. (A member WITH a profile whose decrypted
 * name is unresolvable is omitted one layer up, where `resolvePublicMemberName` returns `''`;
 * the two omissions are deliberate and independent.)
 */
export async function listPublicDirectoryMembers(
  db: Db,
  pariwarId: PariwarId,
  opts: ListDirectoryMembersOptions = {},
): Promise<DirectoryRosterEntry[]> {
  const now = opts.now ?? new Date();
  const offset = Math.max(0, opts.offset ?? 0);

  const rows = await db
    .select({
      memberId: members.memberId,
      state: members.state,
      nameCiphertext: memberKycProfiles.nameCiphertext,
      // ⭐ The set-based cohort district read — ONE correlated subquery for the whole page, the
      // shape `surveys/read.ts:303-316` and `news-blog/audience.ts:163-171` already prove.
      // ⛔ The literal `"members"."member_id"` qualifiers and the `posting_id` tie-break are both
      // load-bearing; see the module header.
      district: sql<string | null>`(
        SELECT p.district
          FROM ${memberPostings} p
         WHERE p.member_id = "members"."member_id" AND p.pariwar_id = "members"."pariwar_id"
           AND p.created_at <= ${now}
         ORDER BY p.created_at DESC, p.posting_id DESC
         LIMIT 1
      )`,
    })
    .from(members)
    .innerJoin(memberKycProfiles, eq(memberKycProfiles.memberId, members.memberId))
    .where(directoryRosterPredicate(pariwarId))
    .orderBy(asc(members.memberId))
    .limit(clampLimit(opts.limit, { default: DIRECTORY_PAGE_SIZE_DEFAULT, cap: DIRECTORY_PAGE_SIZE_CAP }))
    .offset(offset);

  return rows.map((r) => ({
    memberId: r.memberId,
    // The predicate admits only these three; the cast records that rather than re-checking it.
    state: r.state as DirectoryVisibleMemberState,
    district: r.district,
    nameCiphertext: r.nameCiphertext,
  }));
}

/**
 * Count the members the public directory would list, under the SAME predicate.
 *
 * ⭐ WHY THIS EXISTS AT ALL: the honest "next" link and the deep-pagination horizon both need a
 * real total. ⛔ Deriving *"there is a next page"* from a full-page result is the lie this
 * replaces — a directory with exactly `limit` members would advertise a page-2 that is empty.
 *
 * ⚠ AND ITS HONEST LIMIT, stated rather than discovered: this counts rows the ROSTER admits. It
 * cannot know that a row's decrypted name will resolve to `''` one layer up and be dropped, so
 * the rendered page may be SHORTER than this number implies. That asymmetry is accepted — a
 * shorter page is strictly better than a blank name cell — ⛔ but it must not be described as an
 * exact rendered-row count.
 */
export async function countPublicDirectoryMembers(db: Db, pariwarId: PariwarId): Promise<number> {
  const rows = await db
    .select({ total: sql<string>`count(*)` })
    .from(members)
    .innerJoin(memberKycProfiles, eq(memberKycProfiles.memberId, members.memberId))
    .where(directoryRosterPredicate(pariwarId));

  // ⚠ Postgres `count(*)` is `bigint`, which the driver hands back as a STRING (the same
  // representation hazard `moderation/read.ts` normalizes for `timestamptz`). Coercing is this
  // accessor's job — ⛔ a raw-SQL representation must not leak past the domain boundary.
  return Number(rows[0]?.total ?? 0);
}
