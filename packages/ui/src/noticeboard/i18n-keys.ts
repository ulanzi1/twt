// The `<NoticeboardStrip>` i18n KEY catalogue — Story 11a.5 (Task 1). The presenter emits KEYS, never
// resolved copy; each has a bilingual (hi-primary + en parity) entry in `@twt/i18n` under the `noticeboard`
// namespace. Kept in sync BY VALUE with `packages/i18n/locales/{hi,en}/noticeboard.json`.
//
// ⚠ The `noticeboard` namespace is NEW, which means it must be registered in BOTH literals in
// `packages/i18n/src/catalog.ts` — the `catalogs` map AND `KNOWN_NAMESPACES`. `t()` THROWS on an
// unregistered namespace at RUNTIME, on a live tab, while the `locales/`-walking parity gate stays green.
// Registration and parity are two different gates (`packages/i18n/tests/catalog-registration.test.ts`).
//
// ⛔ NOTICE CONTENT IS NOT CATALOG COPY. Operator-authored titles and bodies arrive as DATA on the row
// descriptor and are rendered as-is. Only CHROME is translated, and no key is minted for notice text.
//
// Per the Story 9.12 Task-2 discipline: REUSE an existing key where the copy is identical; mint a new one
// only for genuinely new strings. Every key below is genuinely new — no other namespace carries the
// Panchayat noticeboard's chrome.

import type { NoticeCategory } from './view-model.js';

/** The masthead title — `परिवार की नब्ज़` (UX `:488`). Rendered beside the Pariwar seal. */
export const NOTICEBOARD_MASTHEAD_TITLE_KEY = 'masthead_title';

/** The pinned section header — `सूचना पट्ट` (UX `:491`). */
export const NOTICEBOARD_PINNED_HEADER_KEY = 'pinned_header';

/**
 * ⭐ The RATIFIED empty copy for the pinned section — `ux-design-specification.md:1808`'s
 * *"empty (rare; \"No pinned notices\")"*. This is the `empty-with-copy` case: a REAL source that is
 * currently EMPTY is INFORMATION a member is owed, and silence would be a different (and wrong) statement.
 * ⛔ A section with NO PRODUCER never inherits this key — it renders `silent` instead.
 */
export const NOTICEBOARD_PINNED_EMPTY_KEY = 'pinned_empty';

/** The recent-closings section header — `हाल की आहुति` (UX `:493`). */
export const NOTICEBOARD_RECENT_CLOSINGS_HEADER_KEY = 'recent_closings_header';

/** The footer section header — `अगली मासिक बैठक` (UX `:495`). */
export const NOTICEBOARD_NEXT_MEETING_HEADER_KEY = 'next_meeting_header';

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// `<PinnedNotice>` — the ROW's keys (Story 11a.6; Decision 2026-08-22-153, D6(a)).
//
// ⚠ ⭐ THE `open_detail_*` KEYS ARE RETIRED, ⛔ NOT RENAMED. The shipped row announced
// `accessibilityRole="button"` + *"Tap to open … notice detail"* over an EMPTY `onPress` body: there is
// no detail screen and the descriptor carries no link CTA, so a screen-reader user was told there was a
// destination, activated the control, and nothing happened. D6(a) removes the LIE rather than inventing
// a destination — the row becomes NON-INTERACTIVE CONTENT and the category moves from the HINT into the
// LABEL, which is what `ux-design-specification.md:1820` asked for in the first place.
//
// ⚠ The `black ≠ memorial` correction Story 11a.5 won SURVIVES here: §491 `black` meant BEREAVEMENT and
// §1819 `black` means SCHEDULED MEETING, so any copy inherited from the §491 reading is WRONG rather than
// merely re-keyed. That half is not negotiable and is re-asserted on the successor keys.
//
// ⚠ The 9.12 Task-2 reuse discipline was RUN, and the answer is recorded rather than re-asked:
// `packages/i18n/locales/{hi,en}/banners.json` holds `dismiss` / `dismiss_a11y` / `close` / `close_a11y`,
// which are reusable IN WORDING but ⛔ NOT AS KEYS — the row resolves through the namespace-bound
// `useNoticeboardT()` and `panchayat-noticeboard-render.test.ts` bans a second resolver in the row. So the
// dismiss key below is minted in `noticeboard` and its copy MATCHES `banners.json` word for word, so the
// ambient strip and the noticeboard row say the same thing to the same member about the same banner.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * The category → accessibility-LABEL key map (UX `:1820` — *"category conveyed in screen-reader label
 * too"*). `as const satisfies Record<NoticeCategory, string>` keeps it EXHAUSTIVE BY TYPE: a category
 * added to the §1819 vocabulary cannot compile without a label, so no row can ever announce itself with
 * its kind missing.
 *
 * ⛔ The stub COLOUR is decorative and lives in the render layer (`CATEGORY_TOKENS`); this map is the
 * redundant, non-visual channel that keeps the treatment from being colour-only.
 */
export const NOTICEBOARD_CATEGORY_LABEL_KEYS = {
  terracotta: 'category_terracotta',
  green: 'category_green',
  black: 'category_black',
  ink: 'category_ink',
} as const satisfies Record<NoticeCategory, string>;

/**
 * The dismiss control's `accessibilityLabel`. ⚠ Its COPY deliberately matches `banners.json`'s
 * `dismiss_a11y` word for word — the same member may meet the same banner as an ambient `<BannerHost>`
 * strip on one tab and as a noticeboard row on another, and the two must not describe the same action
 * differently.
 */
export const NOTICEBOARD_ROW_DISMISS_A11Y_KEY = 'dismiss_a11y';

/**
 * The `dismissed` state's announcement (AC4). ⭐ UX `:1818` ratifies a FADED row, and fading is an
 * emphasis change — so the state needs a non-visual channel or it would be conveyed by opacity alone,
 * which the `BannerHost.tsx:62-64` / `tokens.ts:35-36` rule forbids.
 */
export const NOTICEBOARD_ROW_DISMISSED_A11Y_KEY = 'dismissed_a11y';
