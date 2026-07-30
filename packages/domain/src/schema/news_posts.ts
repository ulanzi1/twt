// `news_posts` table — Story 10.5 substrate (the News/Blog `[SURFACE]` data model).
//
// ── NOT event-derived-state — a MUTABLE `status` column (Load-Bearing Decision 1) ──────────
// Every OTHER stateful entity in this codebase (`members`, `claims`, `pools`, `alerts`,
// `helpdesk_tickets`) is event-sourced: a projector + an `app.*_state_writer` DB-trigger guard +
// a CI state-invariant gate. News/Blog posts are DIFFERENT IN KIND — mutable rich content
// (title/body edited across drafts, not an append-only fact stream) with an admin workflow, not a
// legal/audit-critical lifecycle. So `status` is a PLAIN pgEnum column, transitioned in the scoped
// tx, with every transition written to the Story 1.10 audit log. NO projector, NO state-writer
// trigger, NO CI state-invariant gate, NO `events_log` stream, NO `packages/events` registration.
//
// ── post_id = a plain DB-defaulted random UUID (no natural key, not a stream_id) ────────────
// Unlike `member_id`/`alert_id` (event-stream stream_ids) a post has no natural key and no event
// stream — `post_id` is `gen_random_uuid()`. Branded `NewsPostId` (ids/index.ts).
//
// ── The two enum tuples: the pgEnum SOURCE ───────────────────────────────────────────────────
// `NEWS_AUDIENCE_SCOPES` + `NEWS_POST_STATUSES` are each the DB `CREATE TYPE` source AND the
// derived TS union (the members.ts "one spelling authority" discipline). The
// `@twt/contracts/news-blog` wire enums re-declare the SAME tuples (contracts cannot import domain
// — the RN bundle boundary) and a TEST-ONLY sync-guard asserts they never drift.
//
// ── channels = text[] on the REAL delivery set `push | whatsapp | sms | telegram` ────────────
// `packages/domain/src/notifications/delivery.ts:46` is authoritative. The epics' `in_app | wa |
// sms | email` is drift — `in_app`≡`push`, `wa`≡`whatsapp`, there is NO `email` channel and there
// IS a `telegram` channel. Modelled on the real set (the [[project_mmkv_asyncstorage_equivalent]]
// "note-the-substitution" discipline).
//
// Naming discipline (architecture L3663-3677): DB columns snake_case, TS fields camelCase, table
// snake_case-plural.

import { sql } from 'drizzle-orm';
import { index, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import type { NewsPostId, PariwarId, UserId } from '../ids/index.js';

/**
 * The audience-scope tuple (FR-51 `public | members-all | state | role | cohort`) — the pgEnum
 * source (`CREATE TYPE news_audience_scope`). `members-all` + `public` dispatch fully; `state` /
 * `role` / `cohort` are stored + rendered but their DISPATCH selector is a documented seam (Story
 * 10.5 Decision 4 — the `members` table has no district/designation/cohort attribute).
 */
export const NEWS_AUDIENCE_SCOPES = ['public', 'members-all', 'state', 'role', 'cohort'] as const;
export const newsAudienceScopeEnum = pgEnum('news_audience_scope', NEWS_AUDIENCE_SCOPES);
export type NewsAudienceScope = (typeof NEWS_AUDIENCE_SCOPES)[number];

/**
 * The post-lifecycle status tuple — the pgEnum source (`CREATE TYPE news_post_status`). A PLAIN
 * mutable column (Decision 1), NOT event-derived-state. Legal transitions are the pure
 * `nextPostStatus` helper (news-blog/status.ts); the DB enum only constrains the VALUE domain.
 *   · `draft`     — authored, editable (draft edits allowed ONLY in this state).
 *   · `submitted` — sent for review; `reviewer_actor_id` recorded; edit-locked.
 *   · `approved`  — a non-author reviewer's tone-review sign-off recorded + gate passed.
 *   · `scheduled` — a pg-boss delayed publish job is enqueued.
 *   · `published` — dispatched to the audience; visible on the public/member surface.
 */
export const NEWS_POST_STATUSES = ['draft', 'submitted', 'approved', 'scheduled', 'published'] as const;
export const newsPostStatusEnum = pgEnum('news_post_status', NEWS_POST_STATUSES);
export type NewsPostStatus = (typeof NEWS_POST_STATUSES)[number];

/**
 * The per-post channel set — the AUTHORITATIVE delivery channels (delivery.ts:46). Stored as a
 * Postgres `text[]` (`channels`); each element is one of these. Re-declared (not imported) by the
 * contract; the sync-guard asserts parity. NOT a pgEnum array (a `text[]` keeps the migration
 * simple + matches how `channels` is validated at the Zod boundary).
 */
export const NEWS_CHANNELS = ['push', 'whatsapp', 'sms', 'telegram'] as const;
export type NewsChannel = (typeof NEWS_CHANNELS)[number];

export const newsPosts = pgTable(
  'news_posts',
  {
    // The post's canonical id. Plain DB-defaulted random UUID (no natural key, not a stream id).
    postId: uuid('post_id').defaultRandom().primaryKey().$type<NewsPostId>(),

    // Multi-tenant scope (architecture §1.2). RLS predicate column; branded. unFK'd.
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),

    // The English copy (always required). `title_hi`/`body_markdown_hi` are the Hindi copy —
    // REQUIRED for `public`/`members-all` (AC7, enforced at submit/approve in the domain), optional
    // for `state`/`role`/`cohort`. Nullable at the column level; the requirement is a workflow rule.
    title: text('title').notNull(),
    bodyMarkdown: text('body_markdown').notNull(),
    titleHi: text('title_hi'),
    bodyMarkdownHi: text('body_markdown_hi'),

    // The audience scope + its optional selector value (the state/role/cohort discriminator; null
    // for public/members-all). Decision 4: only members-all + public dispatch today.
    audienceScope: newsAudienceScopeEnum('audience_scope').notNull(),
    audienceScopeValue: text('audience_scope_value'),

    // The per-post channel selection (delivery.ts set). Defaults to the empty array.
    channels: text('channels').array().notNull().$type<NewsChannel[]>().default(sql`'{}'::text[]`),

    // Optional scheduled-publish instant (AC4). Null for an immediate/unscheduled post; set when
    // the post is `scheduled` (a pg-boss delayed job fires at this time).
    scheduledPublishAt: timestamp('scheduled_publish_at', { withTimezone: true, mode: 'date' }),

    // The PLAIN mutable lifecycle status (Decision 1). No DB default: `createDraft` writes `draft`.
    status: newsPostStatusEnum('status').notNull(),

    // Attribution: the author (NOT NULL — a post is always human-authored) + the non-author
    // reviewer (nullable until submitted/approved). Both are `users.user_id` actor ids (branded).
    authorActorId: uuid('author_actor_id').notNull().$type<UserId>(),
    reviewerActorId: uuid('reviewer_actor_id').$type<UserId>(),

    // Tone-review sign-off (Decision 3, folded onto the row — the lighter of the two accepted
    // options). `tone_signoff_content_hash` is the SHA-256 hex of the reviewed copy: it BINDS the
    // sign-off to the exact reviewed body, so an edit-after-approval invalidates it (a fresh
    // sign-off is required). Both null until `approve` records the sign-off. NEVER the raw copy.
    toneSignoffContentHash: text('tone_signoff_content_hash'),
    toneSignoffReviewedAt: timestamp('tone_signoff_reviewed_at', { withTimezone: true, mode: 'date' }),

    // The publish instant (AC4/AC5). Null until published.
    publishedAt: timestamp('published_at', { withTimezone: true, mode: 'date' }),

    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    // The admin list reads per-(tenant, status), newest-first — a composite serves it (AC1). Point
    // lookups use the PK.
    index('news_posts_pariwar_status_idx').on(t.pariwarId, t.status),
  ],
);

// Inferred row types for the accessor read/write paths (helpdesk/pools precedent).
export type NewsPostRow = typeof newsPosts.$inferSelect;
export type NewsPostInsert = typeof newsPosts.$inferInsert;
