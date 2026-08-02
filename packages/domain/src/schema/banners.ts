// `banners` + `banner_dismissals` tables — Story 10.9 substrate (the Banner/Popup `[SURFACE]`).
//
// ── NOT event-derived-state — a MUTABLE `status` column (Load-Bearing Decision 1) ──────────
// The DIRECT inheritance of Story 10.5 Decision 1 (`news_posts`). Every event-derived-state entity
// in this codebase (`members`, `claims`, `pools`, `alerts`, `helpdesk_tickets`) carries a projector
// + an `app.*_state_writer` DB-trigger guard + a CI state-invariant gate. A banner is DIFFERENT IN
// KIND — mutable authored content with an admin workflow, not a legal/audit-critical lifecycle. So
// `status` is a PLAIN pgEnum column transitioned in the caller's scope tx, with every create / edit
// / publish / retract written to the Story 1.10 audit log (FR-58B "Audit-logged (publish, edit,
// retract)"). NO projector, NO state-writer trigger, NO CI state-invariant gate, NO `events_log`
// stream, NO `packages/events` registration.
//
// ── valid_from/valid_until are a READ-TIME window, not a schedule (Decision 2) ───────────────
// There is NO pg-boss job, NO worker and NO transition at activation or expiry. A published banner
// becomes visible when the clock passes `valid_from` and "auto-archives" (FR-58B) when it passes
// `valid_until` — both are computed at READ time by `deriveBannerDisplayState`/`resolveVisibleBanners`.
// `valid_from` is INCLUSIVE, `valid_until` is EXCLUSIVE (`valid_from <= now < valid_until`). Both are
// NOT NULL: a nullable end would silently create the permanent clutter this feature exists to prevent.
//
// ── `revision` is the dismissal-invalidation counter, and it starts at 1 ─────────────────────
// A member's dismissal suppresses a banner iff `dismissed_revision >= banners.revision`. `revision`
// is bumped ONLY when the member-visible copy hash changes (Decision 5) — a pure window extension
// leaves dismissals standing, a copy revision re-surfaces the banner for everyone. It is an INTEGER,
// deliberately not a `dismissed_at >= updated_at` timestamp comparison: `updated_at` moves on every
// write including non-copy ones, and a timestamp comparison is exposed to instance clock skew (the
// Story 10.8 Pass-2 DB-clock-vs-app-clock finding). `NOT NULL DEFAULT 1` — never 0, so a freshly
// seeded row can never make the very first `dismissed_revision >= revision` comparison ambiguous.
//
// ── "No member trapped" is a STRUCTURAL invariant (AC4) ──────────────────────────────────────
// `display_mode = 'popup' ⇒ dismissible` is enforced BOTH as the DB CHECK below (migration 0090) and
// as a typed 422 in the domain write path. An undismissable popup is impossible on every write path.
// A NON-dismissible `banner` IS permitted (ux-design-specification.md:2417 Pattern 9 — a blocking
// system state legitimately has no dismiss affordance).
//
// ── The enum tuples: the pgEnum SOURCE ───────────────────────────────────────────────────────
// `BANNER_DISPLAY_MODES` / `BANNER_SEVERITIES` / `BANNER_STATUSES` / `BANNER_AUDIENCE_SCOPES` are
// each the DB `CREATE TYPE` source AND the derived TS union (the members.ts / news_posts.ts "one
// spelling authority" discipline). The `@twt/contracts/banners` wire enums RE-DECLARE the same
// tuples (contracts cannot import domain — the RN Metro bundle boundary,
// [[project_contracts_domain_bundle_boundary]]) and a TEST-ONLY sync-guard asserts they never drift.
//
// Naming discipline (architecture L3663-3677): DB columns snake_case, TS fields camelCase, table
// snake_case-plural.

import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

import type { BannerId, MemberId, PariwarId, UserId } from '../ids/index.js';

/**
 * How a banner presents on the member surface — the pgEnum source (`CREATE TYPE
 * banner_display_mode`). The two modes are INDEPENDENT LANES in `resolveVisibleBanners` (Decision 3):
 * at most one of each may be on screen, and neither suppresses the other.
 *   · `banner` — a full-width strip at the top of the surface (ux-design-specification.md Pattern 9).
 *   · `popup`  — a modal overlay. ALWAYS dismissible (the AC4 CHECK + the domain 422).
 */
export const BANNER_DISPLAY_MODES = ['banner', 'popup'] as const;
export const bannerDisplayModeEnum = pgEnum('banner_display_mode', BANNER_DISPLAY_MODES);
export type BannerDisplayMode = (typeof BANNER_DISPLAY_MODES)[number];

/**
 * The operator's urgency intent — the pgEnum source (`CREATE TYPE banner_severity`). Doubles as the
 * FIRST key of the Decision 3 collision comparator (`critical ≻ warning ≻ info`), which is why no
 * separate authored `priority` integer exists: severity already carries the intent, and an extra
 * field would be left at its default and re-create the tie the total order exists to break.
 *
 * ⚠ This is an ELIGIBILITY/SELECTION order — NOT the niyamavali `precedence` field, which is
 * PROVENANCE ([[project_niyamavali_precedence_is_provenance]]). Different concept, same word.
 */
export const BANNER_SEVERITIES = ['info', 'warning', 'critical'] as const;
export const bannerSeverityEnum = pgEnum('banner_severity', BANNER_SEVERITIES);
export type BannerSeverity = (typeof BANNER_SEVERITIES)[number];

/**
 * The banner-lifecycle status tuple — the pgEnum source (`CREATE TYPE banner_status`). A PLAIN
 * mutable column (Decision 1), NOT event-derived-state. Legal transitions are the pure
 * `nextBannerStatus` helper (banners/status.ts); the DB enum only constrains the VALUE domain.
 *   · `draft`     — authored, freely editable, invisible to members.
 *   · `published` — inside the read-time window it is member-visible; outside it, it is not.
 *   · `retracted` — terminal; never member-visible again regardless of the window.
 *
 * ⚠ `scheduled` / `live` / `expired` are DELIBERATELY ABSENT: they are DERIVED display states
 * (`deriveBannerDisplayState`), never stored (the 8.6 [[project_yogdaan_status_derivation_convention]]
 * discipline). A stored `expired` would be wrong for exactly as long as a sweep lagged — and there
 * is no sweep (Decision 2).
 */
export const BANNER_STATUSES = ['draft', 'published', 'retracted'] as const;
export const bannerStatusEnum = pgEnum('banner_status', BANNER_STATUSES);
export type BannerStatus = (typeof BANNER_STATUSES)[number];

/**
 * The five DERIVED display states (AC2) — NOT a pgEnum and NOT a column: a derivation over `status`
 * plus the window at a given `now`. Declared here anyway because this file is the "one spelling
 * authority" for the banner vocabulary, and the contracts sync-guard pins its own copy against this
 * tuple exactly as it does for the four real pgEnums.
 *
 * ⚠ The DERIVATION FUNCTION itself lives in `@twt/contracts` (`banners/display-state.ts`), not here:
 * `apps/admin` is a browser bundle that cannot import @twt/domain, and @twt/domain cannot import
 * @twt/contracts (a cycle). Keeping the pure read-time policy in contracts gives every consumer ONE
 * implementation. This package owns the DATA and the WRITE invariants.
 */
export const BANNER_DISPLAY_STATES = ['draft', 'scheduled', 'live', 'expired', 'retracted'] as const;
export type BannerDisplayState = (typeof BANNER_DISPLAY_STATES)[number];

/**
 * The audience-scope tuple (FR-51's vocabulary, shared by value with `news_audience_scope`) — the
 * pgEnum source (`CREATE TYPE banner_audience_scope`). A SEPARATE DB type from `news_audience_scope`
 * on purpose: two independently-evolving tables must not share one `CREATE TYPE` (adding a scope for
 * one would silently widen the other's value domain).
 *
 * Resolution is a read-time PREDICATE, not a dispatch list (Decision 4 — `isMemberInBannerAudience`):
 * `members-all` → true; `public` → **true** (a `public` banner widens who ELSE may see it — Story
 * 11a.5's `<NoticeboardStrip>` — it never narrows it away from members); `state`/`role`/`cohort` →
 * false + a logged seam note (the `members` table carries no district/designation/cohort attribute).
 */
export const BANNER_AUDIENCE_SCOPES = ['public', 'members-all', 'state', 'role', 'cohort'] as const;
export const bannerAudienceScopeEnum = pgEnum('banner_audience_scope', BANNER_AUDIENCE_SCOPES);
export type BannerAudienceScope = (typeof BANNER_AUDIENCE_SCOPES)[number];

/**
 * What a `banner_dismissals` row RECORDS. Deliberately NOT a pgEnum (the fourth `CREATE TYPE` budget
 * is spent on the four value domains above): a plain `text` column + a DB CHECK, because unlike the
 * four tuples above this one is never surfaced as an admin-authored choice and never sync-guarded.
 *   · `dismissed` — the member acted (tapped the dismiss affordance).
 *   · `shown`     — an automatic acknowledgement written on first render to enforce
 *     `display_once_per_member`.
 * BOTH kinds share IDENTICAL suppression semantics — the kind is PROVENANCE only, which is exactly
 * why they live in one table under one predicate (`dismissed_revision >= revision`).
 */
export const BANNER_DISMISSAL_KINDS = ['dismissed', 'shown'] as const;
export type BannerDismissalKind = (typeof BANNER_DISMISSAL_KINDS)[number];

export const banners = pgTable(
  'banners',
  {
    // The banner's canonical id. Plain DB-defaulted random UUID — no natural key, NOT a stream id
    // (there is no banner event stream; Decision 1). Branded `BannerId` (ids/index.ts).
    bannerId: uuid('banner_id').defaultRandom().primaryKey().$type<BannerId>(),

    // Multi-tenant scope (architecture §1.2). RLS predicate column; branded. unFK'd.
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),

    // The bilingual copy. Nullable at the COLUMN level (a draft is authored incrementally); ALL FOUR
    // are required at PUBLISH (FR-58B/FR-68 — a missing Hindi field is a typed 422 in the domain
    // write path). These four fields — and only these four — are what the content hash covers, so a
    // change to any of them bumps `revision` and re-binds the tone-review sign-off (Decision 5).
    title: text('title'),
    body: text('body'),
    titleHi: text('title_hi'),
    bodyHi: text('body_hi'),

    // The audience scope + its optional selector value (the state/role/cohort discriminator; null
    // for public/members-all). Decision 4: only members-all + public resolve today.
    audienceScope: bannerAudienceScopeEnum('audience_scope').notNull(),
    audienceScopeValue: text('audience_scope_value'),

    // The read-time visibility window. BOTH NOT NULL; `valid_from` INCLUSIVE, `valid_until`
    // EXCLUSIVE. `CHECK (valid_until > valid_from)` in migration 0090 (mirrored as a domain 422).
    validFrom: timestamp('valid_from', { withTimezone: true, mode: 'date' }).notNull(),
    validUntil: timestamp('valid_until', { withTimezone: true, mode: 'date' }).notNull(),

    // Presentation. `display_mode = 'popup' ⇒ dismissible` is the AC4 structural invariant (the DB
    // CHECK in 0090 + the domain 422). `display_once_per_member` suppresses after the first render
    // via a `dismissal_kind='shown'` row.
    displayMode: bannerDisplayModeEnum('display_mode').notNull(),
    dismissible: boolean('dismissible').notNull(),
    displayOncePerMember: boolean('display_once_per_member').notNull().default(false),

    // The operator's urgency intent + the first key of the Decision 3 collision comparator.
    severity: bannerSeverityEnum('severity').notNull(),

    // The dismissal-invalidation counter. Starts at 1 (never 0 — see the header) and is bumped ONLY
    // when the member-visible copy hash changes (Decision 5).
    revision: integer('revision').notNull().default(1),

    // The PLAIN mutable lifecycle status (Decision 1). No DB default: `createDraft` writes `draft`.
    status: bannerStatusEnum('status').notNull(),

    // Attribution: the authoring actor (NOT NULL — a banner is always human-authored). This is the
    // `authoredBy` the tone-review gate's non-author invariant is evaluated against.
    createdByActorId: uuid('created_by_actor_id').notNull().$type<UserId>(),

    // Tone-review sign-off (AC6), folded onto the row (the news_posts precedent).
    // `tone_signoff_content_hash` is the SHA-256 hex of the RFC-8785 canonical JSON of the four copy
    // fields: it BINDS the sign-off to the exact reviewed copy, so a copy edit invalidates it and a
    // fresh non-author sign-off is required (Decision 5). NEVER the raw copy.
    toneSignoffContentHash: text('tone_signoff_content_hash'),
    toneSignoffReviewedAt: timestamp('tone_signoff_reviewed_at', { withTimezone: true, mode: 'date' }),
    toneSignoffReviewedBy: uuid('tone_signoff_reviewed_by').$type<UserId>(),

    // Lifecycle instants. Null until the corresponding transition.
    publishedAt: timestamp('published_at', { withTimezone: true, mode: 'date' }),
    retractedAt: timestamp('retracted_at', { withTimezone: true, mode: 'date' }),

    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    // Both hot reads are per-(tenant, status) with a window predicate on `valid_from` — the member
    // visible-banner read and the admin list (AC1).
    index('banners_pariwar_status_valid_from_idx').on(t.pariwarId, t.status, t.validFrom),
    // AC2 — the window must be non-empty. A zero/negative window would be a banner that can never be
    // visible, which is authoring nonsense rather than a legitimate state.
    check('banners_window_non_empty', sql`${t.validUntil} > ${t.validFrom}`),
    // AC4 — "no member trapped". The structural half of the invariant (the domain 422 is the other).
    check('banners_popup_must_be_dismissible', sql`${t.displayMode} <> 'popup' OR ${t.dismissible}`),
    // `revision` starts at 1 and is never 0 (see the header) — the same structural floor
    // `banner_dismissals_revision_positive` puts on its own `dismissed_revision` column.
    check('banners_revision_positive', sql`${t.revision} >= 1`),
  ],
);

/**
 * The FIRST durable per-member acknowledgement table in this codebase (the pool-onboarding tutorial
 * outcome is audit-only + client-local, not a durable row). Deliberately banner-SPECIFIC, not a
 * generic "member acknowledgements" primitive — no premature generalisation until a second consumer
 * exists ([[project_no_premature_package]]).
 *
 * Persisted SERVER-side, never in MMKV (AC3): a reinstall or a second device must not resurrect a
 * dismissed banner. Keyed `(pariwar_id, banner_id, member_id)` so the dismiss write is a clean
 * idempotent upsert on the composite PK.
 */
export const bannerDismissals = pgTable(
  'banner_dismissals',
  {
    // Multi-tenant scope (RLS predicate column) — also the first PK component.
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),

    // The dismissed banner. unFK'd (the house convention for cross-table references).
    bannerId: uuid('banner_id').notNull().$type<BannerId>(),

    // The acting member. unFK'd; branded.
    memberId: uuid('member_id').notNull().$type<MemberId>(),

    // The `banners.revision` the member acted on. The suppression predicate is
    // `dismissed_revision >= banners.revision`, so a later copy revision re-surfaces the banner
    // (AC3's "unless updated"). Monotone: the upsert takes GREATEST so a replayed stale write can
    // never un-suppress a newer acknowledgement.
    dismissedRevision: integer('dismissed_revision').notNull(),

    // Provenance only — both kinds suppress identically (see BANNER_DISMISSAL_KINDS). A plain text
    // column + a DB CHECK rather than a fifth pgEnum.
    dismissalKind: text('dismissal_kind').notNull().$type<BannerDismissalKind>(),

    dismissedAt: timestamp('dismissed_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.pariwarId, t.bannerId, t.memberId] }),
    check('banner_dismissals_kind_valid', sql`${t.dismissalKind} IN ('dismissed', 'shown')`),
    check('banner_dismissals_revision_positive', sql`${t.dismissedRevision} >= 1`),
  ],
);

// Inferred row types for the accessor read/write paths (news_posts / helpdesk precedent).
export type BannerRow = typeof banners.$inferSelect;
export type BannerInsert = typeof banners.$inferInsert;
export type BannerDismissalRow = typeof bannerDismissals.$inferSelect;
export type BannerDismissalInsert = typeof bannerDismissals.$inferInsert;
