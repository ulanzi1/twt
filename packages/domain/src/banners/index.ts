// `banners` namespace barrel — Story 10.9.
//
// The Banner/Popup `[SURFACE]` module: a mutable-`status` banner lifecycle (Decision 1 — NOT
// event-derived-state, no projector, no state-writer trigger, no events_log stream) with a pure
// read-time visibility window (Decision 2 — no scheduler, no worker, no queue), a pure total-order
// collision resolver (Decision 3), a read-time audience predicate (Decision 4), and one unified edit
// whose CONTENT HASH decides re-review + the dismissal-invalidating `revision` bump (Decision 5).
//
// Exposes: the pure status-legality reducer, the pure display-state derivation, the pure precedence
// resolver, the write path (create/update/publish/retract/dismiss), the read path (admin list, point
// reads, the member visible-banner read), and the audience predicate.

export { BANNER_ACTIONS, type BannerAction, nextBannerStatus, isLegalBannerTransition } from './status.js';

// ⚠ LOOKING FOR `resolveVisibleBanners` / `deriveBannerDisplayState` / `isBannerInWindow`? They are
// in `@twt/contracts` (`banners/precedence.ts` + `banners/display-state.ts`), NOT here.
//
// They were relocated from `packages/domain` to `packages/contracts` because they are pure,
// read-time PRESENTATION POLICY shared by both the API/domain layer and the browser-based admin UI.
// Keeping them in Domain would violate the browser bundle boundary; duplicating them would violate
// the single-implementation requirement of AC5.
//
// This package therefore owns the DATA and the WRITE invariants (the legality reducer, the tone
// gate, the content-hash revision rule, the accessors) and stops at the CANDIDATE set — see
// `listMemberBannerCandidates` in read.ts; `apps/api` applies the resolver on top. The
// `BANNER_DISPLAY_STATES` spelling authority stays on `schema/banners.ts` for the sync-guard.

export {
  type BannerCopy,
  type CreateBannerDraftInput,
  type UpdateBannerPatch,
  type UpdateBannerResult,
  type PublishBannerResult,
  type RecordDismissalInput,
  bannerResourceLocator,
  bannerContentHash,
  missingBannerCopyFields,
  assertBannerCopyComplete,
  assertPopupDismissible,
  assertWindowValid,
  createDraft,
  updateBanner,
  publish,
  retract,
  recordDismissal,
} from './write.js';

export {
  type ListBannersOptions,
  getBanner,
  getBannerOrThrow,
  listBannersForPariwar,
  listVisibleBannersForMember,
  listMemberBannerCandidates,
  listLiveBannersForPariwar,
  getDismissal,
} from './read.js';

export {
  BANNER_TARGETABLE_AUDIENCE_SCOPES,
  type BannerAudienceLogger,
  isMemberInBannerAudience,
} from './audience.js';

export {
  BANNER_NOT_FOUND_CODE,
  BANNER_INVALID_STATE_CODE,
  BANNER_POPUP_MUST_BE_DISMISSIBLE_CODE,
  BANNER_BILINGUAL_REQUIRED_CODE,
  BANNER_WINDOW_INVALID_CODE,
  BannerNotFoundError,
  BannerStateError,
  BannerPopupMustBeDismissibleError,
  BannerBilingualRequiredError,
  BannerWindowInvalidError,
} from './errors.js';
