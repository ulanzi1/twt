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

export { deriveNoticeboardViewModel } from './presenter.js';
export {
  NOTICEBOARD_MASTHEAD_TITLE_KEY,
  NOTICEBOARD_NEXT_MEETING_HEADER_KEY,
  NOTICEBOARD_PINNED_EMPTY_KEY,
  NOTICEBOARD_PINNED_HEADER_KEY,
  NOTICEBOARD_RECENT_CLOSINGS_HEADER_KEY,
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
} from './view-model.js';
