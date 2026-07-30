// News/Blog wire enums — Story 10.5 (Task 3; AC1/AC5/AC7).
//
// The audience-scope, post-status, and channel tuples. Re-declared here (NOT imported from
// @twt/domain) for the RN Metro bundle boundary ([[project_contracts_domain_bundle_boundary]]) —
// `packages/domain/src/schema/news_posts.ts` owns the pgEnum-source tuples, and a TEST-ONLY
// sync-guard (tests/news-blog.test.ts) imports both and asserts they never drift.
//
// ⚠ The channel set is the REAL delivery set `push | whatsapp | sms | telegram`
// (packages/domain/src/notifications/delivery.ts:46) — NOT the epics' wrong `in_app | wa | sms |
// email`. There is no `email` channel; there IS a `telegram` channel.

import { z } from 'zod';

/** The audience-scope tuple (FR-51). Only `members-all` + `public` dispatch fully today (Decision 4). */
export const NEWS_AUDIENCE_SCOPES = ['public', 'members-all', 'state', 'role', 'cohort'] as const;
export const NewsAudienceScope = z.enum(NEWS_AUDIENCE_SCOPES);
export type NewsAudienceScope = z.output<typeof NewsAudienceScope>;

/** The post-lifecycle status tuple (a PLAIN mutable column — Decision 1). */
export const NEWS_POST_STATUSES = ['draft', 'submitted', 'approved', 'scheduled', 'published'] as const;
export const NewsPostStatus = z.enum(NEWS_POST_STATUSES);
export type NewsPostStatus = z.output<typeof NewsPostStatus>;

/** The per-post channel set — the AUTHORITATIVE delivery channels (delivery.ts). */
export const NEWS_CHANNELS = ['push', 'whatsapp', 'sms', 'telegram'] as const;
export const NewsChannel = z.enum(NEWS_CHANNELS);
export type NewsChannel = z.output<typeof NewsChannel>;
