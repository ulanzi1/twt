// News/Blog transport DTOs — Story 10.5 (Task 3; AC1/AC2/AC5/AC7).
//
// Pure Zod, `.strict()` throughout, snake_case wire (domain camelCase — watch the
// [[project_story_validate_footguns]] drift). NO `@twt/domain` import (the RN Metro bundle
// boundary). The admin `NewsPostResponse` carries the full workflow shape (actor ids, sign-off
// hash, timestamps); the `PublicPostResponse` is the UNAUTHENTICATED apps/public shape — bilingual
// copy only, NEVER actor ids or workflow internals.

import { z } from 'zod';

import { Iso8601Datetime, UuidString } from '../_common/primitives.js';
import { NewsAudienceScope, NewsChannel, NewsPostStatus } from './enums.js';

/** Title/body length bounds — generous but bounded (guards a runaway payload). */
const Title = z.string().min(1).max(300);
const BodyMarkdown = z.string().min(1).max(50_000);
const AudienceScopeValue = z.string().min(1).max(120);

// ── Requests ───────────────────────────────────────────────────────────────────

/** Create a draft (POST …/news). The author is the session actor (never client-supplied). */
export const CreateDraftRequest = z
  .object({
    title: Title,
    body_markdown: BodyMarkdown,
    title_hi: Title.nullish(),
    body_markdown_hi: BodyMarkdown.nullish(),
    audience_scope: NewsAudienceScope,
    audience_scope_value: AudienceScopeValue.nullish(),
    channels: z.array(NewsChannel).max(4),
    scheduled_publish_at: Iso8601Datetime.nullish(),
  })
  .strict();
export type CreateDraftRequest = z.output<typeof CreateDraftRequest>;

/** Edit a draft (PATCH …/news/{postId}). Every field optional; draft-only (server-enforced). */
export const UpdateDraftRequest = z
  .object({
    title: Title.optional(),
    body_markdown: BodyMarkdown.optional(),
    title_hi: Title.nullish(),
    body_markdown_hi: BodyMarkdown.nullish(),
    audience_scope: NewsAudienceScope.optional(),
    audience_scope_value: AudienceScopeValue.nullish(),
    channels: z.array(NewsChannel).max(4).optional(),
    scheduled_publish_at: Iso8601Datetime.nullish(),
  })
  .strict();
export type UpdateDraftRequest = z.output<typeof UpdateDraftRequest>;

/** Submit for review (POST …/news/{postId}/submit). `reviewer_id` must differ from the author. */
export const SubmitRequest = z.object({ reviewer_id: UuidString }).strict();
export type SubmitRequest = z.output<typeof SubmitRequest>;

/** Approve (POST …/news/{postId}/approve). Approver = session actor; no body fields. */
export const ApproveRequest = z.object({}).strict();
export type ApproveRequest = z.output<typeof ApproveRequest>;

/** Schedule (POST …/news/{postId}/schedule). */
export const ScheduleRequest = z.object({ scheduled_publish_at: Iso8601Datetime }).strict();
export type ScheduleRequest = z.output<typeof ScheduleRequest>;

/** Publish immediately (POST …/news/{postId}/publish). No body fields. */
export const PublishRequest = z.object({}).strict();
export type PublishRequest = z.output<typeof PublishRequest>;

// ── Responses ────────────────────────────────────────────────────────────────────

/** The full admin post DTO (the authoring console read). */
export const NewsPostResponse = z
  .object({
    post_id: UuidString,
    pariwar_id: UuidString,
    title: Title,
    body_markdown: BodyMarkdown,
    title_hi: Title.nullable(),
    body_markdown_hi: BodyMarkdown.nullable(),
    audience_scope: NewsAudienceScope,
    audience_scope_value: AudienceScopeValue.nullable(),
    channels: z.array(NewsChannel),
    scheduled_publish_at: Iso8601Datetime.nullable(),
    status: NewsPostStatus,
    author_actor_id: UuidString,
    reviewer_actor_id: UuidString.nullable(),
    tone_signoff_content_hash: z.string().nullable(),
    tone_signoff_reviewed_at: Iso8601Datetime.nullable(),
    published_at: Iso8601Datetime.nullable(),
    created_at: Iso8601Datetime,
    updated_at: Iso8601Datetime,
  })
  .strict();
export type NewsPostResponse = z.output<typeof NewsPostResponse>;

/** The paginated admin list response. `next_offset` is null when the page is the last. */
export const NewsPostListResponse = z
  .object({
    items: z.array(NewsPostResponse),
    next_offset: z.number().int().nonnegative().nullable(),
  })
  .strict();
export type NewsPostListResponse = z.output<typeof NewsPostListResponse>;

/**
 * The UNAUTHENTICATED public post DTO (apps/public). Bilingual copy only — deliberately NO actor
 * ids, no channels, no workflow internals (the public surface must never leak authoring metadata).
 */
export const PublicPostResponse = z
  .object({
    post_id: UuidString,
    title: Title,
    body_markdown: BodyMarkdown,
    title_hi: Title.nullable(),
    body_markdown_hi: BodyMarkdown.nullable(),
    published_at: Iso8601Datetime.nullable(),
  })
  .strict();
export type PublicPostResponse = z.output<typeof PublicPostResponse>;

/** The paginated public list response. */
export const PublicPostListResponse = z
  .object({
    items: z.array(PublicPostResponse),
    next_offset: z.number().int().nonnegative().nullable(),
  })
  .strict();
export type PublicPostListResponse = z.output<typeof PublicPostListResponse>;
