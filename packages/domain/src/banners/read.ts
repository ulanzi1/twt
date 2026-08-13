// Banner read-path accessors — Story 10.9 (AC1, AC2, AC3, AC5).
//
// Runs DIRECTLY on the caller's scoped tx (the write.ts contract). Every dynamic `.limit()` routes
// through `clampLimit` (the domain-accessor-invariants CI gate,
// [[project_domain_limit_clamp_and_savepoint_retry]]). The explicit `pariwarId` predicate (alongside
// RLS) is defense-in-depth and matches the `(pariwar_id, status, valid_from)` index. `now` is
// INJECTED into every window-sensitive read — never `new Date()` in here.
//
// ── The member read is an explicit LEFT JOIN, deliberately ───────────────────────────────────
// `listVisibleBannersForMember` suppresses a banner iff a dismissal row exists with
// `dismissed_revision >= banners.revision`. That is expressed as an explicit LEFT JOIN on
// `(pariwar_id, banner_id, member_id)`, NOT as a correlated subquery: interpolating an outer
// `Column` into a subquery over a table with a SAME-NAMED column collapses the correlation into a
// tautology, and a DB-free unit test cannot catch it ([[project_epic6_drizzle_correlated_subquery_
// bug]] — the Epic-6 retro). The live-DB test seeds two members with different dismissal state so a
// regression to a tautology fails loudly.
//
// ── Where each visibility axis is applied, and why ───────────────────────────────────────────
//   · status + window  → SQL (indexed, and it bounds the row count).
//   · dismissal        → SQL (the LEFT JOIN above).
//   · AUDIENCE         → TS, via the single `isMemberInBannerAudience` authority (Decision 4). Not
//     duplicated as a SQL `IN ('public','members-all')` predicate: a second copy of the rule would
//     have drifted the moment the geo selector started consulting member attributes.
//     ⭐ **THE SINGLE-AUTHORITY RULE PAID OFF, AND THIS IS THE RECORD OF IT.** Story 1.19 lit up the
//     `state` arm — the audience predicate now consults the member's RESOLVED geography — and the
//     change landed in ONE file (`audience.ts`) exactly as this note predicted. Had the rule been
//     duplicated in SQL here, a `state` banner would now be visible to everyone the SQL let through
//     and invisible to everyone the TS predicate denied, with no single place to read the truth.
//     ⛔ Do not add a SQL audience predicate now that the arm resolves: the geo answer is not
//     expressible as a constant `IN` list, which is precisely why it is applied in TS.
//   · PRECEDENCE       → NOT here. `resolveVisibleBanners` and `deriveBannerDisplayState` were
//     relocated from `packages/domain` to `packages/contracts` because they are pure, read-time
//     PRESENTATION POLICY shared by both the API/domain layer and the browser-based admin UI.
//     Keeping them in Domain would violate the browser bundle boundary; duplicating them would
//     violate the single-implementation requirement of AC5. So this module returns the
//     audience-filtered CANDIDATE set (`listMemberBannerCandidates`) and `apps/api` — which depends
//     on both packages — applies the resolver on top.

import { and, desc, eq, gt, isNull, lt, lte, or, sql } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { LoadedGeoTree } from '../geo-tree/resolver.js';
import type { BannerId, MemberId, PariwarId } from '../ids/index.js';
import { resolveMemberGeoNode } from '../member-geo/resolve.js';
import { clampLimit } from '../pagination.js';
import { type BannerDisplayState, type BannerRow, bannerDismissals, banners } from '../schema/banners.js';
import { isMemberInBannerAudience, type BannerAudienceLogger } from './audience.js';
import { BannerNotFoundError } from './errors.js';

/**
 * The @twt/contracts `BANNER_SEVERITY_ORDER` rank (`critical` = 0, most severe first), expressed in
 * SQL. Every candidate read that feeds `resolveVisibleBanners` must order by THIS before applying its
 * `clampLimit` — otherwise a high-severity row can be truncated out of the page before the resolver
 * ever sees it, silently losing to a lower-severity row that merely activated more recently.
 */
const bannerSeverityRankSql = sql`CASE ${banners.severity} WHEN 'critical' THEN 0 WHEN 'warning' THEN 1 ELSE 2 END`;

/** Resolve a banner by id within the active Pariwar, or null. */
export async function getBanner(db: Db, pariwarId: PariwarId, bannerId: BannerId): Promise<BannerRow | null> {
  const rows = await db
    .select()
    .from(banners)
    .where(and(eq(banners.pariwarId, pariwarId), eq(banners.bannerId, bannerId)))
    .limit(1);
  return rows[0] ?? null;
}

/** Resolve a banner or throw `BannerNotFoundError` (the route maps it → 404). */
export async function getBannerOrThrow(db: Db, pariwarId: PariwarId, bannerId: BannerId): Promise<BannerRow> {
  const banner = await getBanner(db, pariwarId, bannerId);
  if (!banner) throw new BannerNotFoundError(pariwarId, bannerId);
  return banner;
}

export interface ListBannersOptions {
  /**
   * Filter by DERIVED display state (AC1). `draft`/`retracted` are plain status predicates;
   * `scheduled`/`live`/`expired` are window predicates over `status='published'` evaluated against
   * `now` — the SAME boundary conventions `deriveBannerDisplayState` uses (`valid_from` inclusive,
   * `valid_until` exclusive), expressed in SQL so the filter can be indexed and paginated.
   */
  displayState?: BannerDisplayState;
  /** Forced-pagination ceiling (Story 1.14). */
  limit?: number;
  offset?: number;
}

/**
 * List the Pariwar's banners, newest-first, optionally filtered by DERIVED display state (AC1).
 * Paginated via `clampLimit` + `offset`. Assert-membership-not-counts in tests (own-committing
 * writers accumulate rows — [[project_live_db_test_gotchas]]).
 */
export async function listBannersForPariwar(
  db: Db,
  pariwarId: PariwarId,
  now: Date,
  opts: ListBannersOptions = {},
): Promise<BannerRow[]> {
  const tenant = eq(banners.pariwarId, pariwarId);
  const published = eq(banners.status, 'published');

  // One arm per derived state; `undefined` (no filter) falls through to the tenant predicate alone.
  const predicate = (() => {
    switch (opts.displayState) {
      case 'draft':
        return and(tenant, eq(banners.status, 'draft'));
      case 'retracted':
        return and(tenant, eq(banners.status, 'retracted'));
      case 'scheduled':
        return and(tenant, published, gt(banners.validFrom, now));
      case 'live':
        return and(tenant, published, lte(banners.validFrom, now), gt(banners.validUntil, now));
      case 'expired':
        return and(tenant, published, lte(banners.validUntil, now));
      default:
        return tenant;
    }
  })();

  return db
    .select()
    .from(banners)
    .where(predicate)
    .orderBy(desc(banners.createdAt))
    .limit(clampLimit(opts.limit, { default: 30, cap: 200 }))
    .offset(Math.max(0, opts.offset ?? 0));
}

/**
 * The candidate set for the member surface: published banners inside their window at `now` that the
 * member has NOT already acknowledged at the current revision. Audience + precedence are applied by
 * `resolveMemberBanners` on top of this — this accessor owns only the SQL-expressible axes.
 *
 * Suppression predicate: a banner is suppressed iff a dismissal row exists AND
 * `dismissed_revision >= banners.revision`. Equivalently (the form below), a banner SURVIVES iff no
 * dismissal row exists OR `dismissed_revision < banners.revision` — which is exactly why a copy
 * revision (Decision 5's `revision + 1`) re-surfaces the banner for everyone who had dismissed the
 * prior revision (AC3's "unless updated").
 */
export async function listVisibleBannersForMember(
  db: Db,
  pariwarId: PariwarId,
  memberId: MemberId,
  now: Date,
  opts: { limit?: number } = {},
): Promise<BannerRow[]> {
  const rows = await db
    .select({ banner: banners })
    .from(banners)
    .leftJoin(
      bannerDismissals,
      and(
        eq(bannerDismissals.pariwarId, banners.pariwarId),
        eq(bannerDismissals.bannerId, banners.bannerId),
        eq(bannerDismissals.memberId, memberId),
      ),
    )
    .where(
      and(
        eq(banners.pariwarId, pariwarId),
        eq(banners.status, 'published'),
        lte(banners.validFrom, now),
        gt(banners.validUntil, now),
        // No dismissal row at all, OR one recorded against a SUPERSEDED revision.
        or(isNull(bannerDismissals.memberId), lt(bannerDismissals.dismissedRevision, banners.revision)),
      ),
    )
    // Severity rank FIRST — the same key `resolveVisibleBanners` decides on. A page cut on
    // `valid_from` alone could truncate a high-severity row before the resolver ever sees it.
    .orderBy(bannerSeverityRankSql, desc(banners.validFrom))
    .limit(clampLimit(opts.limit, { default: 50, cap: 200 }));

  return rows.map((r) => r.banner);
}

/**
 * THE member-surface CANDIDATE read (AC2/AC3): every banner this member is both eligible for and
 * has not already acknowledged, at `now`.
 *
 * Pipeline: SQL (status ∧ window ∧ not-suppressed-by-dismissal) → the `isMemberInBannerAudience`
 * predicate (Decision 4). PRECEDENCE is deliberately NOT applied here — `apps/api` applies
 * `resolveVisibleBanners` from `@twt/contracts` (the one implementation the admin console also
 * calls; see the file header). Returning the candidate set rather than a resolved pair also keeps
 * this accessor honest about what it knows: it is a data read, not a presentation decision.
 */
export async function listMemberBannerCandidates(
  db: Db,
  pariwarId: PariwarId,
  memberId: MemberId,
  now: Date,
  logger?: BannerAudienceLogger,
  tree?: LoadedGeoTree | null,
): Promise<BannerRow[]> {
  const candidates = await listVisibleBannersForMember(db, pariwarId, memberId, now);

  // ⭐ RESOLVE THE MEMBER'S GEO **ONCE**, BEFORE FILTERING (Story 1.19, D4). ⛔ Never inside the
  // `.filter()` below: `isMemberInBannerAudience` is pure + synchronous, and loading geo per
  // candidate would make it async AND issue one query per banner — the N+1 AC7 forbids in the
  // news-blog consumer, acquired here by accident. This is the same load-once-and-close-over shape
  // as `apps/api/src/middleware/scope-resolution/index.ts:64-71`.
  //
  // Skipped entirely when no candidate is `state`-scoped, so the common request path pays NOTHING.
  // ⚠ `tree` is OPTIONAL: an existing caller that passes none resolves geo against a `null` tree,
  // whose `state` is typed-absent, so `state` banners deny — today's behaviour, unchanged.
  const needsGeo = candidates.some((b) => b.audienceScope === 'state');
  const memberGeo = needsGeo
    ? await resolveMemberGeoNode(db, pariwarId, memberId, tree ?? null, now)
    : null;

  return candidates.filter((b) =>
    isMemberInBannerAudience(b.audienceScope, b.audienceScopeValue, memberGeo, logger),
  );
}

/**
 * The PUBLISHED banners of a Pariwar that are live at `now` — the candidate set the admin console
 * splices a draft into for the AC5 visibility verdict. Deliberately NOT member-scoped: the verdict
 * answers "would ANYONE see this draft", which is a per-Pariwar question, not a per-member one.
 */
export async function listLiveBannersForPariwar(
  db: Db,
  pariwarId: PariwarId,
  now: Date,
  opts: { limit?: number } = {},
): Promise<BannerRow[]> {
  return db
    .select()
    .from(banners)
    .where(
      and(
        eq(banners.pariwarId, pariwarId),
        eq(banners.status, 'published'),
        lte(banners.validFrom, now),
        gt(banners.validUntil, now),
      ),
    )
    // Severity rank FIRST — see `bannerSeverityRankSql`'s header; the admin verdict splices a draft
    // into this same candidate set and calls the same resolver.
    .orderBy(bannerSeverityRankSql, desc(banners.validFrom))
    .limit(clampLimit(opts.limit, { default: 50, cap: 200 }));
}

/** A member's dismissal row for one banner, or null. Used by the live-DB tests + the dismiss replay. */
export async function getDismissal(
  db: Db,
  pariwarId: PariwarId,
  bannerId: BannerId,
  memberId: MemberId,
): Promise<typeof bannerDismissals.$inferSelect | null> {
  const rows = await db
    .select()
    .from(bannerDismissals)
    .where(
      and(
        eq(bannerDismissals.pariwarId, pariwarId),
        eq(bannerDismissals.bannerId, bannerId),
        eq(bannerDismissals.memberId, memberId),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}
