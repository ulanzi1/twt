// `news-blog` namespace barrel — Story 10.5.
//
// The News/Blog `[SURFACE]` workflow module: a mutable-`status` post lifecycle (Decision 1) wired to
// the shipped tone-review gate (approve), the Story 1.10 audit (consumer-side), and — via the caller
// — the `alert_published` dispatch fan-out (publish). Exposes: the pure status-legality helper, the
// write path (create/edit + submit/approve/schedule/publish), the read path (list/get + the public
// read), and the audience resolver.

export {
  NEWS_POST_ACTIONS,
  type NewsPostAction,
  nextPostStatus,
  isLegalPostTransition,
} from './status.js';

export {
  type CreateDraftInput,
  type UpdateDraftPatch,
  type ApproveResult,
  newsResourceLocator,
  newsContentHash,
  assertBilingualForScope,
  createDraft,
  updateDraft,
  submitForReview,
  approve,
  schedule,
  publish,
} from './write.js';

export {
  type ListPostsOptions,
  type ListPublicPostsOptions,
  type PublicPostRow,
  getPost,
  getPostOrThrow,
  listPostsForPariwar,
  listPublishedPublicPosts,
  getPublishedPublicPost,
} from './read.js';

export {
  NEWS_DISPATCH_MEMBER_STATES,
  type AudienceResolveLogger,
  resolveAudienceMemberIds,
} from './audience.js';

export {
  NEWS_POST_NOT_FOUND_CODE,
  NEWS_POST_INVALID_STATE_CODE,
  NEWS_POST_AUTHOR_REVIEWER_CODE,
  NEWS_POST_BILINGUAL_REQUIRED_CODE,
  NewsPostNotFoundError,
  NewsPostStateError,
  NewsPostAuthorReviewerError,
  NewsPostBilingualRequiredError,
} from './errors.js';
