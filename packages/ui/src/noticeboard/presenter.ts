// The `<NoticeboardStrip>` presenter — Story 11a.5 (Task 1; AC1/AC2/AC5/AC6). The `pool-progress` (9.12)
// sibling: STRICTLY PURE — `(input, now) → view-model` and nothing else. NO react/react-native/tamagui
// import, NO API call, NO DB read, NO side-effecting i18n lookup (it emits KEYS), NO palette (it emits
// category NAMES the render layer maps), NO numeral formatting. Same input → same output.
//
// ── `now` is INJECTED — never `new Date()` in this module ────────────────────────────────────────────
// The Story 10.9 convention, stated at `display-state.ts:38` and `precedence.ts:44`: every boundary is then
// unit-testable and the derivation is replay-deterministic.
//
// ── This presenter RE-DERIVES NO PRECEDENCE (Trap 2 / AC2) ───────────────────────────────────────────
// It consumes the server's already-resolved winner. It never calls, re-implements or re-orders
// `compareBannerPrecedence` / `resolveVisibleBanners`, and it never asks a source to widen. Merging happens
// across SOURCES; ordering WITHIN a source is the source's own business.
//
// ⚠ The one thing it DOES read `now` for is the WINDOW END, and that is not the same thing as re-deriving
// display state: `deriveBannerDisplayState` needs `status` and `valid_from`, and the member DTO
// deliberately carries NEITHER (the server already applied both). What survives client-side is
// `valid_until` — carried on `MemberBannerResponse` precisely so a client can reason about it — and the
// member banner query is auto-persisted to MMKV, so a cached banner CAN outlive its window on the device.
// Dropping it here uses 10.9's own ratified boundary convention (`display-state.ts:35-36`: `valid_from` is
// INCLUSIVE, `valid_until` is EXCLUSIVE — at exactly `valid_until` the banner is already expired).

import type { BannerAudienceScope, BannerSeverity } from '@twt/contracts';

import {
  NOTICEBOARD_MASTHEAD_TITLE_KEY,
  NOTICEBOARD_NEXT_MEETING_HEADER_KEY,
  NOTICEBOARD_PINNED_EMPTY_KEY,
  NOTICEBOARD_PINNED_HEADER_KEY,
  NOTICEBOARD_RECENT_CLOSINGS_HEADER_KEY,
} from './i18n-keys.js';
import { NOTICEBOARD_LOADING_SKELETON_ROWS } from './view-model.js';
import type {
  NoticeCategory,
  NoticeboardBannerNoticeInput,
  NoticeboardRowDescriptor,
  NoticeboardSection,
  NoticeboardStripInput,
  NoticeboardStripState,
  NoticeboardStripViewModel,
  NoticeboardViewer,
} from './view-model.js';

/**
 * ⭐ THE TIER FILTER (AC5) — a pure predicate over the notice's DECLARED AUDIENCE, in Story 10.9's EXISTING
 * `audience_scope` vocabulary. ⛔ Never a new parallel visibility taxonomy.
 *
 * The axis this presenter judges is PUBLIC vs AUTHENTICATED and nothing else. It does NOT re-resolve
 * geography: `state` audiences are resolved against the member's `member_postings` district by the source
 * (Story 1.19), and a notice that reached this presenter has already passed that predicate.
 *
 * ⛔ FAIL CLOSED, in both directions the rule can fail:
 *   · `role` / `cohort` are the DOCUMENTED UN-TARGETABLE SEAM (`enums.ts:52-55`) — there is no member
 *     `role` or `cohort` attribute at any layer and no story owns one. A notice aimed at an audience
 *     nothing can resolve is shown to NO ONE, never to everyone.
 *   · An audience value outside the vocabulary entirely (a drifted wire value, a hand-built fixture) is
 *     not in this map and resolves to `undefined` → hidden. The `enums.ts` rule stated for geography — "a
 *     member with no posting row is in NO state audience — fail-closed, never 'in all'" — generalized.
 *
 * `satisfies Record<BannerAudienceScope, …>` makes the map EXHAUSTIVE BY TYPE: a scope added to the 10.9
 * vocabulary cannot compile without a stated visibility, so it can never silently default to visible.
 */
const AUDIENCE_VISIBILITY = {
  public: { toSignedOut: true, toMember: true },
  'members-all': { toSignedOut: false, toMember: true },
  state: { toSignedOut: false, toMember: true },
  role: { toSignedOut: false, toMember: false },
  cohort: { toSignedOut: false, toMember: false },
} as const satisfies Record<BannerAudienceScope, { toSignedOut: boolean; toMember: boolean }>;

/**
 * The 10.9 SEVERITY → D2(a) CATEGORY mapping. Severity is the banner lane's OWN axis (operator urgency);
 * `NoticeCategory` is the noticeboard's (notice KIND). D2(a) rules that severity MAPS INTO the category
 * vocabulary rather than being emitted beside it — conflating operator urgency with notice kind is
 * precisely what D2(c) refused.
 *
 * ⚠ All three severities map to `ink` (generic), and that is a decision, not a stub. The §1819 vocabulary
 * names three SPECIFIC kinds — close-of-cycle celebration, milestone, scheduled meeting — and a banner is
 * none of them: it is an operator announcement, which is exactly what `ink = generic` denotes. Mapping
 * `critical` onto, say, `terracotta` would tell a member "close-of-cycle celebration" about an outage
 * notice. The urgency itself still reaches the member through the banner's OWN copy and through the
 * ambient `<BannerHost>` strip on every other tab, where `SEVERITY_TOKENS` colours it.
 *
 * `satisfies Record<BannerSeverity, NoticeCategory>` keeps it exhaustive: a new severity cannot compile
 * without a stated category.
 */
const SEVERITY_CATEGORY = {
  info: 'ink',
  warning: 'ink',
  critical: 'ink',
} as const satisfies Record<BannerSeverity, NoticeCategory>;

/** The tier predicate. Unknown/unresolvable audience → `false` (AC5, fail-closed). */
function isVisibleToViewer(audience: string, viewer: NoticeboardViewer): boolean {
  const rule = (AUDIENCE_VISIBILITY as Record<string, { toSignedOut: boolean; toMember: boolean }>)[
    audience
  ];
  if (rule === undefined) return false;
  return viewer.isAuthenticated ? rule.toMember : rule.toSignedOut;
}

/**
 * The banner lane's at-most-one contribution, as a row — or `null` when the lane yields nothing at this
 * `now` for this viewer. Three independent reasons to yield nothing, all fail-closed:
 * no banner at all · outside its window · filtered out by the tier predicate.
 */
function bannerRow(
  notice: NoticeboardBannerNoticeInput | null,
  viewer: NoticeboardViewer,
  now: Date,
): NoticeboardRowDescriptor | null {
  if (notice === null) return null;
  // `valid_until` is EXCLUSIVE (`display-state.ts:35-36`): at exactly `validUntil` the banner has expired.
  if (now.getTime() >= notice.validUntil.getTime()) return null;
  if (!isVisibleToViewer(notice.audience, viewer)) return null;

  return {
    id: notice.id,
    category: SEVERITY_CATEGORY[notice.severity],
    title: notice.title,
    // The epic's `body` and §1817's `meta line` are ONE field (see the row descriptor's doc comment).
    meta: notice.body,
    dismissible: notice.dismissible,
  };
}

/**
 * Derive the `<NoticeboardStrip>` view-model. Pure + synchronous + dependency-free — same `(input, now)` in
 * → same view-model out.
 *
 * Section ORDER is the order of the returned array, and it is the ratified anatomy (UX `:1806` + `:491`):
 * masthead → stats → pinned → polls → recent closings → next meeting. A screen renders the array; it does
 * not choose the order (AC1).
 *
 * ⚠ Three of those six sections render `silent` UNCONDITIONALLY, and that is the honest state of this
 * project rather than an oversight (AC4 / D3(a)): there is no close-of-cycle (FR-19) read model and no
 * aggregate member/district stat read model, and no story owns either. The P0-5 prototype filled them with
 * fabricated rows — including five invented deceased-member names — and those are deleted. A section with
 * no producer says NOTHING; it does not borrow the pinned section's "No pinned notices" copy, because
 * "the Pariwar has pinned nothing this month" is information and "this project has not built the read
 * model" is not something to tell a member.
 */
export function deriveNoticeboardViewModel(
  input: NoticeboardStripInput,
  now: Date,
): NoticeboardStripViewModel {
  const { status, viewer, bannerNotice } = input;

  const isLoading = status === 'loading';
  // While the first read is in flight nothing is KNOWN yet, so the pinned section must not assert its
  // ratified "No pinned notices" copy — that would tell a member the Pariwar has pinned nothing when the
  // truth is that we have not looked yet. `refreshing` is the opposite case: content is on screen and stays.
  const rows = isLoading ? [] : [bannerRow(bannerNotice, viewer, now)].filter(isRow);

  const state: NoticeboardStripState = isLoading
    ? 'loading'
    : rows.length > 0
      ? status === 'refreshing'
        ? 'refreshing'
        : 'default'
      : 'empty';

  const pinnedRender: NoticeboardSection['render'] = isLoading
    ? { kind: 'silent' }
    : rows.length > 0
      ? { kind: 'rows', rows }
      : { kind: 'empty-with-copy', copyKey: NOTICEBOARD_PINNED_EMPTY_KEY };

  const sections: readonly NoticeboardSection[] = [
    // Chrome, not data — the seal + title strip renders whether or not any source has anything to say.
    { id: 'masthead', headerKey: NOTICEBOARD_MASTHEAD_TITLE_KEY, render: { kind: 'chrome' } },
    // No aggregate member/district stat read model exists, and no story owns one. Routed, not invented.
    { id: 'stats', headerKey: null, render: { kind: 'silent' } },
    { id: 'pinned', headerKey: NOTICEBOARD_PINNED_HEADER_KEY, render: pinnedRender },
    // Story 10.15 owns `<PollsEntry>`'s content AND its own render-nothing-when-empty behaviour. This
    // presenter owns only its POSITION — an ADDITION to the noticeboard, never a restructuring of it.
    { id: 'polls', headerKey: null, render: { kind: 'delegated' } },
    // No close-of-cycle (FR-19) read model exists, and no story owns one. The five invented
    // deceased-member names the prototype published here are DELETED (AC4).
    {
      id: 'recent-closings',
      headerKey: NOTICEBOARD_RECENT_CLOSINGS_HEADER_KEY,
      render: { kind: 'silent' },
    },
    // No meeting-schedule producer exists either; the prototype's date and venue were invented.
    { id: 'next-meeting', headerKey: NOTICEBOARD_NEXT_MEETING_HEADER_KEY, render: { kind: 'silent' } },
  ];

  return {
    state,
    skeleton: isLoading ? { noticeRows: NOTICEBOARD_LOADING_SKELETON_ROWS } : null,
    sections,
  };
}

/** Narrowing helper for `.filter()` — keeps `rows` typed as descriptors rather than nullable ones. */
function isRow(row: NoticeboardRowDescriptor | null): row is NoticeboardRowDescriptor {
  return row !== null;
}
