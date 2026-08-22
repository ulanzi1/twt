// @twt/ui `<NoticeboardStrip>` shared logic — Story 11a.5 (the Story 9.12 `pool-progress` sibling).
//
// The framework-agnostic Panchayat Noticeboard presenter: the ONE place the strip's composition, section
// ORDER, tier filter and empty/loading rules live, so every surface that needs a notice strip reads them
// from here instead of copying a screen. Consumed by apps/mobile (RN/Tamagui) today; the UX spec's admin-
// home and public-embed variants are routed, not built (Decision 2026-08-22-152, D5(a)).
//
// NO react/react-native/tamagui here — only the pure `(input, now) → view-model` function, its types and
// the i18n KEY catalogue. The banner lane is singular BY SHAPE (Trap 2 / AC2): no array-of-banners field
// can enter, so Story 10.9's at-most-one-per-lane invariant cannot be widened from this side.
//
// Story 11a.6 adds the ROW presenter (`<PinnedNotice>`) to the same module: the strip decides WHICH rows
// exist, the row decides how ONE of them reads, is emphasised and is acknowledged. ⭐ The row presenter
// takes NO viewer/audience/tier input — the tier rule shipped in the strip and a row only ever arrives
// having already passed it (AC5).

export { deriveNoticeboardViewModel } from './presenter.js';
// Story 11a.6 — the ROW presenter, beside the strip's. One component family, one module, one contract
// (Decision 2026-08-22-153, D2(a)): `<PinnedNotice>` consumes the SAME `NoticeboardRowDescriptor` the strip
// emits, so the two can never drift apart across a module boundary.
export { PINNED_NOTICE_A11Y_SEPARATOR, derivePinnedNoticeViewModel } from './pinned-notice.js';
export {
  NOTICEBOARD_CATEGORY_LABEL_KEYS,
  NOTICEBOARD_MASTHEAD_TITLE_KEY,
  NOTICEBOARD_NEXT_MEETING_HEADER_KEY,
  NOTICEBOARD_PINNED_EMPTY_KEY,
  NOTICEBOARD_PINNED_HEADER_KEY,
  NOTICEBOARD_RECENT_CLOSINGS_HEADER_KEY,
  NOTICEBOARD_ROW_DISMISSED_A11Y_KEY,
  NOTICEBOARD_ROW_DISMISS_A11Y_KEY,
} from './i18n-keys.js';
export { NOTICEBOARD_LOADING_SKELETON_ROWS } from './view-model.js';
export type {
  NoticeCategory,
  NoticeboardBannerNoticeInput,
  NoticeboardLoadStatus,
  NoticeboardRowDescriptor,
  NoticeboardSection,
  NoticeboardSectionId,
  NoticeboardSectionRender,
  NoticeboardSkeleton,
  NoticeboardStripInput,
  NoticeboardStripState,
  NoticeboardStripViewModel,
  NoticeboardViewer,
  PinnedNoticeDismissAffordance,
  PinnedNoticeInput,
  PinnedNoticeLabelPart,
  PinnedNoticeState,
  PinnedNoticeViewModel,
} from './view-model.js';
