// News/Blog contracts barrel — Story 10.5 (Task 3).
//
// The wire enums (audience/status/channel — sync-guarded against the @twt/domain pgEnum tuples) +
// the transport DTOs (create/update/submit/approve/schedule/publish requests; admin + public
// responses). The admin routes gate on `news.manage`; the public read is unauthenticated (FR-74).

export {
  NEWS_AUDIENCE_SCOPES,
  NewsAudienceScope,
  NEWS_POST_STATUSES,
  NewsPostStatus,
  NEWS_CHANNELS,
  NewsChannel,
} from './enums.js';

export {
  CreateDraftRequest,
  UpdateDraftRequest,
  SubmitRequest,
  ApproveRequest,
  ScheduleRequest,
  PublishRequest,
  NewsPostResponse,
  NewsPostListResponse,
  PublicPostResponse,
  PublicPostListResponse,
} from './dto.js';
