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
