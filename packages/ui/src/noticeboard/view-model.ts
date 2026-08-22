// The `<NoticeboardStrip>` view-model — Story 11a.5 (Task 1; AC1/AC2/AC6). The `pool-progress` (9.12)
// sibling: the framework-agnostic render contract for the Panchayat Noticeboard, produced by the strictly-
// pure presenter (presenter.ts). NO react/react-native/tamagui, NO JSX, NO colour hex, NO resolved copy, NO
// numeral formatting — only structured values, `@twt/tokens` role NAMES and i18n KEYS the render layer
// resolves at the display boundary.
//
// ── What this module OWNS, and where the boundary is ─────────────────────────────────────────────────
// Story 11a.5 owns the STRIP: which sections exist, their ORDER, which sources feed them, the tier filter,
// and the empty/loading behaviour. Story 11a.6 owns the ROW: the 4pt stub, the title, the meta line and
// dismiss-with-ack. So this module emits a LIST OF ROW DESCRIPTORS and deliberately does not decide how a
// row looks or behaves.
//
// ── The banner lane is SINGULAR BY SHAPE (Trap 2 / AC2 — load-bearing) ───────────────────────────────
// Story 10.9 yields AT MOST ONE banner per lane (`MemberBannerListResponse = { banner, popup }`), resolved
// SERVER-side by `resolveVisibleBanners`. A strip renders a list, and the obvious reconciliation — widening
// the member read to return an array — would break FR-58B ("one at a time per surface"), load-bearing
// Decision 3 in `precedence.ts`, the total comparator, the shuffled-input determinism CI test, and 10.9's
// AC5 single-implementation rule. So the INPUT below carries `bannerNotice: … | null` and there is
// DELIBERATELY NO array-of-banners field: a list cannot enter even by mistake. The banner lane is ONE
// SOURCE among several contributing at most one row — never the notice list itself (Decision
// 2026-08-22-152, D1(a)). The anti-widening unit test is the regression net.
//
// ── The noticeboard NEVER carries a coverage-bearing deadline (D4(a), standing constraint) ───────────
// This strip carries ANNOUNCEMENTS ONLY. Deadlines a member's coverage turns on (contribution windows,
// restoration expiries) ride the Story 8.8 notification family, NOT this surface. That is what keeps the
// tier filter a "what a member SEES" predicate rather than a "what a member GETS" one — and therefore what
// keeps it outside the Niyamavali. A future notice source that carries such a deadline invalidates that
// answer and owes a Niyamavali check before it ships.

import type { BannerSeverity } from '@twt/contracts';

/**
 * The pinned-notice CATEGORY vocabulary — `ux-design-specification.md:1819` (§11 `<PinnedNotice>` Variants),
 * ruled CANONICAL by Decision 2026-08-22-152 D2(a):
 *   · `terracotta` — close-of-cycle celebration
 *   · `green`      — milestone
 *   · `black`      — SCHEDULED MEETING
 *   · `ink`        — generic
 *
 * ⚠ `ux-design-specification.md:491` (`saffron` / `green` / `black`, the §5/§8 Panchayat screen grammar) is
 * SUPERSEDED by that ruling — one ratified artifact disagreeing with itself, not a prototype drift. `saffron`
 * is retired: not deprecated, not aliased, not kept for legacy fixtures.
 *
 * ⚠ `black` CHANGED MEANING across the supersession — §491 bereavement → §1819 scheduled meeting. Any
 * screen-reader copy inherited from the §491 reading is now WRONG, not merely re-keyed.
 *
 * ⛔ These are CATEGORY names, not colours. The render layer maps each to its own palette (on RN, the one
 * named semantic→Tamagui-scale map — D6(a)); this package holds no hex (Trap 1).
 */
export type NoticeCategory = 'terracotta' | 'green' | 'black' | 'ink';

/**
 * The FOUR states `ux-design-specification.md:1808` ratifies — all four, not the one a naive implementation
 * would notice. Collapsing them into a `hasContent: boolean` is the failure this type exists to prevent.
 *   · `default`    — content on screen.
 *   · `loading`    — a REAL state with ratified anatomy ("top + first 2 notices skeleton"): NOT a blank
 *                    screen and NOT a spinner. See `NoticeboardSkeleton`.
 *   · `empty`      — the read completed and no section this presenter can see yields a row.
 *   · `refreshing` — DISTINCT from `loading`: content is already on screen and STAYS there.
 */
export type NoticeboardStripState = 'default' | 'loading' | 'empty' | 'refreshing';

/**
 * What the render layer knows about its own read, before the presenter turns it into a ratified state.
 * `refreshing` means "content is already on screen and a background re-read is in flight".
 */
export type NoticeboardLoadStatus = 'ready' | 'loading' | 'refreshing';

/** The number of skeleton notice rows the ratified `loading` anatomy calls for (UX `:1808`). */
export const NOTICEBOARD_LOADING_SKELETON_ROWS = 2;

/**
 * The ratified `loading` anatomy, expressed structurally so the render layer does not invent it: the
 * masthead section (always the first section, always `chrome`) plus `noticeRows` skeleton rows. Non-null
 * IFF `state === 'loading'`.
 */
export interface NoticeboardSkeleton {
  noticeRows: number;
}

/**
 * The strip's sections, in the order `ux-design-specification.md:1806` + `:491` ratify. The ID set is the
 * anatomy; the ORDER is a property of the presenter's output array, never of a screen's JSX ordering (AC1).
 *   · `masthead`        — Pariwar seal + title strip.
 *   · `stats`           — the single quiet operational stat line.
 *   · `pinned`          — the pinned notices list (सूचना पट्ट).
 *   · `polls`           — Story 10.15's `<PollsEntry>` slot (see `NoticeboardSectionRender.delegated`).
 *   · `recent-closings` — the last closed pools (हाल की आहुति).
 *   · `next-meeting`    — the footer's next monthly Pariwar meeting.
 */
export type NoticeboardSectionId =
  | 'masthead'
  | 'stats'
  | 'pinned'
  | 'polls'
  | 'recent-closings'
  | 'next-meeting';

/**
 * What a section renders — and, crucially, WHY it renders nothing when it renders nothing.
 *
 * ⭐ `empty-with-copy` and `silent` are DELIBERATELY DIFFERENT CASES and must never be merged (AC1):
 *   · `empty-with-copy` — the source is REAL and currently EMPTY. That is INFORMATION a member is owed, and
 *                         `ux-design-specification.md:1808` ratifies the copy for it ("No pinned notices").
 *   · `silent`          — the section has NO PRODUCER AT ALL. "This project has not built the read model"
 *                         is not something to tell a member, so the section renders nothing and says
 *                         nothing (the `<PollsEntry>` posture: a quiet noticeboard stays quiet). A silent
 *                         section does NOT inherit the empty case's copy.
 *
 * The other three arms:
 *   · `rows`      — the section has content.
 *   · `chrome`    — the section is chrome, not data (the masthead); it renders whether or not data exists.
 *   · `delegated` — the section's CONTENT and its own emptiness belong to another component (Story 10.15's
 *                   `<PollsEntry>`, which renders nothing when there is nothing to answer). This presenter
 *                   owns only its POSITION — which is what keeps section order a presenter property (AC1)
 *                   without restructuring a shipped story.
 */
export type NoticeboardSectionRender =
  | { kind: 'rows'; rows: readonly NoticeboardRowDescriptor[] }
  | { kind: 'chrome' }
  | { kind: 'delegated' }
  | { kind: 'empty-with-copy'; copyKey: string }
  | { kind: 'silent' };

/** One section of the strip. `headerKey` is null for sections the ratified anatomy gives no header. */
export interface NoticeboardSection {
  id: NoticeboardSectionId;
  headerKey: string | null;
  render: NoticeboardSectionRender;
}

/**
 * ⭐ THE ROW DESCRIPTOR — the contract Story 11a.6 builds `<PinnedNotice>` against (AC6).
 *
 * ── The two sources are reconciled EXPLICITLY here, naming both ──────────────────────────────────────
 * The epic's 11a.5 AC names *"title, body, severity (info / warning / critical), dismissible state, link
 * CTA"*. `ux-design-specification.md:1817` names a different anatomy: *"4pt colored left-stub · title ·
 * meta line"* — it has NEITHER a body NOR a link CTA. Neither list is silently picked and neither is
 * silently emitted whole; each field below is reconciled by name:
 *
 *   · `title`       — in BOTH lists. Carried.
 *   · `body` (epic) / `meta line` (§1817) — ONE field, `meta`. §1817's row anatomy has exactly one
 *                     secondary line, and it is the line the shipped prototype already renders. A
 *                     banner-sourced row fills it from the operator's body copy. ⛔ NOT two fields.
 *   · `category`    — §1817's "4pt colored left-stub", using the D2(a)-ruled `NoticeCategory` vocabulary.
 *   · `severity` (epic) — ⛔ NOT carried as its own field. D2(a) records `info|warning|critical` as the
 *                     BANNER LANE'S OWN axis, not the noticeboard's category vocabulary; severity MAPS INTO
 *                     `category` in the presenter. Emitting both would re-introduce the second axis D2
 *                     refused, on a row anatomy with exactly one colour slot.
 *   · `dismissible` — a FLAG, and NOTHING ELSE (AC6). It declares THAT a notice can be dismissed.
 *                     ⛔ Dismiss-with-ack — the interaction, the mutation, the persistence — is Story
 *                     11a.6's, and this story wires no dismiss call and reuses none of 10.9's
 *                     `DismissBannerResponse` path.
 *   · `link CTA` (epic) — ⛔ NOT carried. §1817 has no CTA slot, and nothing renders one today (the
 *                     prototype's row press handler is an unwired stub). Per AC6, a field whose consumer is
 *                     unclear is LEFT OUT and ROUTED rather than speculatively emitted — an unused field in
 *                     a shared presenter is the widening Trap 2 forbids, in a second place. Routed in
 *                     `deferred-work.md` with its re-trigger.
 *
 * Every field is STRUCTURED (Trap 1): a raw value or an i18n KEY, never resolved chrome copy, never a hex,
 * never a formatted numeral, never an href with copy baked in. `title`/`meta` carry OPERATOR-AUTHORED
 * CONTENT as data — notice content is not catalog copy and no keys are minted for it.
 */
export interface NoticeboardRowDescriptor {
  /** Stable identity for list rendering and dismissal correlation. */
  id: string;
  /** The D2(a) §1819 category — the row's 4pt left-stub. */
  category: NoticeCategory;
  /** Operator-authored title, as DATA. Never a catalog key. */
  title: string;
  /** The single secondary line (epic `body` ≡ §1817 `meta line`), as DATA. `null` when there is none. */
  meta: string | null;
  /** A FLAG ONLY — Story 11a.6 owns the dismiss interaction. */
  dismissible: boolean;
}

/**
 * The banner lane's contribution — AT MOST ONE, and singular BY SHAPE (see the module header, AC2).
 *
 * Shaped as the ALREADY-RESOLVED, ALREADY-LOCALE-SELECTED notice the render layer hands over, so this
 * package holds no bilingual copy-selection logic (that is `components/banners/copy.ts`'s, at the display
 * boundary) and re-derives NO precedence: the server picked the winner and this presenter renders it.
 *
 *   · `id`         — the banner id, carried through as the row's identity.
 *   · `title`      — locale-selected title copy (data, not a key).
 *   · `body`       — locale-selected body copy, or null. Becomes the row's `meta` line.
 *   · `severity`   — the 10.9 `BannerSeverity`. Maps INTO `NoticeCategory` (D2(a)); never emitted as a
 *                    second axis on the row.
 *   · `dismissible`— echoed onto the row descriptor as a flag.
 *   · `audience`   — the notice's declared audience, in Story 10.9's `audience_scope` vocabulary. Typed
 *                    `string`, deliberately: a wire value that drifted from the vocabulary must FAIL
 *                    CLOSED at runtime rather than fail to compile at some unrelated boundary (AC5). The
 *                    vocabulary itself is pinned by an exhaustive `satisfies Record<BannerAudienceScope,…>`
 *                    map in the presenter, so a scope added upstream cannot silently go unhandled.
 *   · `validUntil` — the banner's EXCLUSIVE window end. Read against the injected `now` so a banner
 *                    persisted in the client's MMKV cache (the member banner query is auto-persisted) does
 *                    not outlive its own window on a quiet surface.
 */
export interface NoticeboardBannerNoticeInput {
  id: string;
  title: string;
  body: string | null;
  severity: BannerSeverity;
  dismissible: boolean;
  audience: string;
  validUntil: Date;
}

/** What the tier filter reads about the viewer — the ONLY viewer fact this presenter knows (AC5). */
export interface NoticeboardViewer {
  isAuthenticated: boolean;
}

/**
 * The presenter INPUT — EXACTLY these three keys.
 *
 * ⭐ There is NO `bannerNotices` array (AC2), and there is NO `stats` / `recentClosings` / `nextMeeting`
 * field — those sections have NO PRODUCER in this project (no close-of-cycle (FR-19) read model and no
 * aggregate member/district stat read model exist, and no story owns either). Their absence is
 * STRUCTURAL, not a `null` someone might one day fill with a fixture: the fabricated rows the P0-5
 * prototype shipped are deleted, and a producer arriving is what adds the field (Decision 2026-08-22-152,
 * D3(a); AC4).
 */
export interface NoticeboardStripInput {
  status: NoticeboardLoadStatus;
  viewer: NoticeboardViewer;
  /** ⭐ AT MOST ONE banner-sourced notice. ⛔ There is DELIBERATELY no array field here (Trap 2 / AC2). */
  bannerNotice: NoticeboardBannerNoticeInput | null;
}

/**
 * The complete render contract. Sections are ordered; the render layer walks the array and renders each
 * section's `render` arm — it never decides order, and it never decides whether an empty section speaks.
 */
export interface NoticeboardStripViewModel {
  state: NoticeboardStripState;
  /** Non-null IFF `state === 'loading'` — the ratified skeleton anatomy (UX `:1808`). */
  skeleton: NoticeboardSkeleton | null;
  /** The strip's sections IN RENDER ORDER (AC1). */
  sections: readonly NoticeboardSection[];
}
