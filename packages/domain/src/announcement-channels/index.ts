// The Trust's announcement channels — the domain accessors (Story 5.14, Task 1; `2026-10-29-417` / `-418`). Per Pariwar: the config
// (one "channels live" switch, created OFF), the post record (at most one post per (Pariwar, occasion, subject) — the 0184 lifecycle),
// and the pools-only reads. RAW SQL on a caller-supplied `pg` handle; every statement filters on `pariwar_id` (I6).

export {
  ANNOUNCEMENT_POST_DEFERRED_MAX_AGE_MS,
  ANNOUNCEMENT_POST_LEASE_MS,
  beginAnnouncementPost,
  finaliseAnnouncementPost,
  finaliseStaleAnnouncementPost,
  giveUpDeferredAnnouncementPost,
  isAnnouncementPostDetail,
  lookupAnnouncementPost,
  recordUnattemptedAnnouncementPost,
  type AnnouncementPostKey,
  type AnnouncementPostLookup,
  type AnnouncementPostOutcome,
  type AnnouncementPostRecord,
  type BeginAnnouncementPostResult,
} from './posts.js';
export {
  ANNOUNCEMENT_CHANNELS_DEFAULT_CONFIG,
  findAnnouncementChannelsConfig,
  getAnnouncementChannelsConfig,
  hasBotTokenName,
  memberVisibleAnnouncementLinks,
  readAnnouncementChannelsState,
  upsertAnnouncementChannelsConfig,
  type AnnouncementChannelsConfig,
  type AnnouncementChannelsState,
} from './config.js';
export {
  ANNOUNCEMENT_POSTS_LIST_WINDOW_DAYS,
  countPoolOpenPostGaps,
  getAnnouncementAlert,
  getAnnouncementPool,
  listAnnouncementActivity,
  listCyclePoolsForAnnouncement,
  type AnnouncementActivityCycle,
  type AnnouncementCyclePool,
  type AnnouncementPostView,
} from './reads.js';
