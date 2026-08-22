// The `<PinnedNotice>` ROW presenter — Story 11a.6 (Task 1; AC2/AC4/AC5/AC6). The `<NoticeboardStrip>`
// sibling, in the module that already owns the row contract (Decision 2026-08-22-153, D2(a)).
//
// STRICTLY PURE — `input → view-model` and nothing else. NO react/react-native/tamagui import, NO JSX, NO
// API call, NO side-effecting i18n lookup (it emits KEYS), NO palette (it emits the category NAME the render
// layer maps), NO opacity, NO numeral formatting. Same input → same output.
//
// ⚠ ⭐ VERIFIED BY READING, ⛔ NOT BY CI. `scripts/` holds nineteen invariant gates and ⛔ none of them bans
// `react` in `packages/ui` — and this story mints none ([[feedback_no_premature_package]]). The purity above
// is a property a reviewer must check with their eyes; the tests pin the behaviour, not the imports.
//
// ── ⛔ NO CLOCK, and ⛔ no window (unlike the strip presenter) ────────────────────────────────────────
// `deriveNoticeboardViewModel` takes `now` because the banner lane has an EXCLUSIVE `validUntil` it must
// honour against an MMKV-persisted read. A row that reaches HERE has already survived that boundary, so this
// presenter takes no `now` at all — one arity, asserted, so a clock cannot quietly re-enter.
//
// ── ⛔ NO VIEWER, AUDIENCE OR TIER (AC5) ─────────────────────────────────────────────────────────────
// The Story 11a.1 matrix-tier rule SHIPPED at 11a.5 (`presenter.ts:63-100`). A descriptor only reaches this
// presenter AFTER `isVisibleToViewer` has passed it, so a row-level filter could only ever DISAGREE with the
// strip's — a second visibility taxonomy is the failure that absence exists to prevent. `PinnedNoticeInput`
// admits no such key, and the shape is asserted (the `presenter.test.ts:245-250` anti-widening precedent).
//
// ── ⛔ THE ROW DESCRIPTOR IS NOT WIDENED (D5(a)) ─────────────────────────────────────────────────────
// This presenter CONSUMES `NoticeboardRowDescriptor`; it does not change it. 10.9's `revision` — the
// dismissal identity the routed 11a.5 code-review finding asked about — stays on the banner lane at the
// render boundary, where the screen already holds `data.banner`. All three `presenter.test.ts` contract
// fences (`:256`, `:294`, `:327`) therefore stay intact, and `bannerDismissalKey` keeps ONE implementation.

import {
  NOTICEBOARD_CATEGORY_LABEL_KEYS,
  NOTICEBOARD_ROW_DISMISSED_A11Y_KEY,
  NOTICEBOARD_ROW_DISMISS_A11Y_KEY,
} from './i18n-keys.js';
import type {
  PinnedNoticeInput,
  PinnedNoticeLabelPart,
  PinnedNoticeViewModel,
} from './view-model.js';

/**
 * What the render layer joins the label parts with.
 *
 * ⭐ It lives HERE rather than in JSX so the whole label — which parts, in what order, and what sits between
 * them — is one pure, tested property (AC6). It is the separator the shipped row already used
 * (`PinnedItem.tsx:36`'s `` `${title}. ${meta}` ``), carried across deliberately: D6(a) changes what the
 * label CONTAINS, ⛔ not how a screen reader has been pausing between its parts on this surface.
 */
export const PINNED_NOTICE_A11Y_SEPARATOR = '. ';

/** Blank/whitespace-only operator copy is ABSENT copy — the `orFallback` convention in `copy.ts:29`. */
function present(value: string | null): string | null {
  return value !== null && value.trim() !== '' ? value : null;
}

/**
 * Derive the `<PinnedNotice>` view-model. Pure + synchronous + dependency-free.
 *
 * ⭐ THE LABEL IS COMPOSED FROM NON-EMPTY PARTS, and that is how the routed empty-title defect closes (AC6;
 * `deferred-work.md`, code review of story-11a.5, item 4). The shipped row built `` `${title}. ${meta}` ``
 * unconditionally, so a legacy banner with an empty title announced itself as *". <meta>"* and rendered a
 * blank line above the meta line. A part that has no content contributes NOTHING here — ⛔ not an empty
 * string, ⛔ not a separator.
 *
 * ⚠ ⛔ It is deliberately NOT closed by tightening `toNoticeboardBannerNotice`'s
 * `title === '' && body === ''` guard: that adapter belongs to the BANNER LANE and this defect belongs to
 * the ROW. A row fed by some future non-banner source would inherit the same defect from the same place.
 */
export function derivePinnedNoticeViewModel(input: PinnedNoticeInput): PinnedNoticeViewModel {
  const { row, acknowledged } = input;

  const title = present(row.title);
  const meta = present(row.meta);

  // Category FIRST: a screen-reader user hears what KIND of notice this is before its content, which is
  // what makes the decorative stub's colour redundant rather than load-bearing (UX `:1820`).
  const labelParts: PinnedNoticeLabelPart[] = [
    { kind: 'key', key: NOTICEBOARD_CATEGORY_LABEL_KEYS[row.category] },
  ];
  if (title !== null) labelParts.push({ kind: 'text', text: title });
  if (meta !== null) labelParts.push({ kind: 'text', text: meta });
  // The `dismissed` state reaches the member through a channel that is not emphasis (AC4).
  if (acknowledged) labelParts.push({ kind: 'key', key: NOTICEBOARD_ROW_DISMISSED_A11Y_KEY });

  return {
    id: row.id,
    category: row.category,
    state: acknowledged ? 'dismissed' : 'default',
    title,
    meta,
    labelParts,
    // Absent for a NON-dismissible notice — a legal, reachable case, not a theoretical branch
    // (`packages/domain/src/banners/errors.ts:84-86`: only a POPUP must be dismissible) — and absent once
    // acknowledged, so the member cannot fire the acknowledgement twice against a row that is already gone
    // as far as the server is concerned.
    dismiss:
      row.dismissible && !acknowledged ? { labelKey: NOTICEBOARD_ROW_DISMISS_A11Y_KEY } : null,
  };
}
