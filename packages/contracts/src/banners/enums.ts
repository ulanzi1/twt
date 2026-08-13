// Banner/Popup wire enums — Story 10.9 (Task 3; AC1/AC3/AC8).
//
// The display-mode, severity, status, audience-scope and dismissal-kind tuples. RE-DECLARED here
// (NOT imported from @twt/domain) for the RN Metro bundle boundary
// ([[project_contracts_domain_bundle_boundary]] — a domain import leaks `pg` into the mobile
// bundle). `packages/domain/src/schema/banners.ts` owns the pgEnum-source tuples, and a TEST-ONLY
// sync-guard (tests/banners.test.ts) imports both and asserts they never drift.
//
// ⚠ The DERIVED display states (`draft | scheduled | live | expired | retracted`) are ALSO declared
// here, but they are NOT a DB enum and are deliberately NOT sync-guarded against a pgEnum — there is
// no `banner_display_state` type to guard against, because the state is a DERIVATION over stored
// fields and never a column (AC2). The sync-guard pins them against the domain's
// `BANNER_DISPLAY_STATES` TS tuple instead.

import { z } from 'zod';

/** How a banner presents. The two modes resolve in INDEPENDENT lanes (Decision 3). */
export const BANNER_DISPLAY_MODES = ['banner', 'popup'] as const;
export const BannerDisplayMode = z.enum(BANNER_DISPLAY_MODES);
export type BannerDisplayMode = z.output<typeof BannerDisplayMode>;

/** The operator's urgency intent — also the FIRST key of the collision comparator (Decision 3). */
export const BANNER_SEVERITIES = ['info', 'warning', 'critical'] as const;
export const BannerSeverity = z.enum(BANNER_SEVERITIES);
export type BannerSeverity = z.output<typeof BannerSeverity>;

/** The STORED lifecycle status (a PLAIN mutable column — Decision 1). Three values, not five. */
export const BANNER_STATUSES = ['draft', 'published', 'retracted'] as const;
export const BannerStatus = z.enum(BANNER_STATUSES);
export type BannerStatus = z.output<typeof BannerStatus>;

/**
 * The DERIVED display state (AC2) — a derivation over `status` + the window at a given `now`, NEVER
 * a stored column. Carried on the admin DTO so the console renders and filters on the same five
 * states the domain derives, without re-implementing the boundary conventions client-side.
 */
export const BANNER_DISPLAY_STATES = ['draft', 'scheduled', 'live', 'expired', 'retracted'] as const;
export const BannerDisplayState = z.enum(BANNER_DISPLAY_STATES);
export type BannerDisplayState = z.output<typeof BannerDisplayState>;

/**
 * The audience-scope tuple. Shares its VALUES with `news_audience_scope` but is a separate DB type
 * (two independently-evolving tables must not share one `CREATE TYPE`). Resolution is a read-time
 * PREDICATE (Decision 4): `members-all`/`public` → visible; `state`/`role`/`cohort` → a documented
 * seam, stored and listed but visible to nobody until **Story 1.19**'s member→geo attribution
 * primitive lands (its AC3/AC4). ⛔ NOT Story 1.18: that story shipped the geo-tree scope RESOLVER,
 * which answers "is Patna in Bihar" — audience selection needs a per-MEMBER geo attribute, which is
 * a different capability that merely shares the word "geo".
 */
export const BANNER_AUDIENCE_SCOPES = ['public', 'members-all', 'state', 'role', 'cohort'] as const;
export const BannerAudienceScope = z.enum(BANNER_AUDIENCE_SCOPES);
export type BannerAudienceScope = z.output<typeof BannerAudienceScope>;

/**
 * The audience scopes that resolve to a real audience TODAY (Decision 4). The admin console renders
 * an explicit "not yet targetable" indicator for everything NOT in this list, so an admin is never
 * left publishing into a void.
 *
 * The PREDICATE (`isMemberInBannerAudience`) remains @twt/domain's — this list is the browser-side
 * mirror the console needs, and the sync-guard test asserts the two agree scope-for-scope, so the
 * indicator can never drift from the rule the member read actually applies.
 */
export const BANNER_TARGETABLE_AUDIENCE_SCOPES: readonly BannerAudienceScope[] = ['public', 'members-all'];

/**
 * What a dismissal row records. `dismissed` = the member acted; `shown` = the automatic
 * acknowledgement that enforces `display_once_per_member`. Both suppress identically — the kind is
 * provenance only.
 */
export const BANNER_DISMISSAL_KINDS = ['dismissed', 'shown'] as const;
export const BannerDismissalKind = z.enum(BANNER_DISMISSAL_KINDS);
export type BannerDismissalKind = z.output<typeof BannerDismissalKind>;
