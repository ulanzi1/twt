// News/Blog read-path accessors — Story 10.5 (AC1, AC5, AC7).
//
// Runs DIRECTLY on the caller's scoped tx (the write.ts / drafts.ts contract). Every dynamic
// `.limit()` routes through `clampLimit` (the domain-accessor-invariants CI gate). The explicit
// `pariwarId` predicate (alongside RLS) is defense-in-depth + matches the `(pariwar_id, status)`
// index. `listPublishedPublicPosts` is the UNAUTHENTICATED public-surface read (apps/public).

import { and, desc, eq } from 'drizzle-orm';

import { clampLimit } from '../pagination.js';
import type { Db } from '../db.js';
import type { NewsPostId, PariwarId } from '../ids/index.js';
import { type NewsPostRow, type NewsPostStatus, newsPosts } from '../schema/news_posts.js';
import { NewsPostNotFoundError } from './errors.js';

/** Resolve a post by id within the active Pariwar, or null. */
export async function getPost(
  db: Db,
  pariwarId: PariwarId,
  postId: NewsPostId,
): Promise<NewsPostRow | null> {
  const rows = await db
    .select()
    .from(newsPosts)
    .where(and(eq(newsPosts.pariwarId, pariwarId), eq(newsPosts.postId, postId)))
    .limit(1);
  return rows[0] ?? null;
}

/** Resolve a post or throw `NewsPostNotFoundError` (the route maps it → 404). */
export async function getPostOrThrow(
  db: Db,
  pariwarId: PariwarId,
  postId: NewsPostId,
): Promise<NewsPostRow> {
  const post = await getPost(db, pariwarId, postId);
  if (!post) throw new NewsPostNotFoundError(pariwarId, postId);
  return post;
}

export interface ListPostsOptions {
  status?: NewsPostStatus;
  /** Forced-pagination ceiling (Story 1.14). */
  limit?: number;
  offset?: number;
}

/**
 * List the Pariwar's posts, newest-first, optionally filtered by status (AC1). Paginated via
 * `clampLimit` + `offset`. Assert-membership-not-counts in tests (own-committing writers accumulate
 * rows — [[project_live_db_test_gotchas]]).
 */
export async function listPostsForPariwar(
  db: Db,
  pariwarId: PariwarId,
  opts: ListPostsOptions = {},
): Promise<NewsPostRow[]> {
  const predicate =
    opts.status === undefined
      ? eq(newsPosts.pariwarId, pariwarId)
      : and(eq(newsPosts.pariwarId, pariwarId), eq(newsPosts.status, opts.status));
  return db
    .select()
    .from(newsPosts)
    .where(predicate)
    .orderBy(desc(newsPosts.createdAt))
    .limit(clampLimit(opts.limit, { default: 30, cap: 200 }))
    .offset(Math.max(0, opts.offset ?? 0));
}

export interface ListPublicPostsOptions {
  limit?: number;
  offset?: number;
}

/**
 * List the Pariwar's PUBLISHED, `public`-audience posts, newest-published-first — the apps/public
 * (Astro, unauthenticated) blog read (AC7). Only `status='published' ∧ audience_scope='public'`
 * rows are ever exposed on the public surface. Bilingual copy is carried on the row; the caller
 * renders both languages.
 */
export async function listPublishedPublicPosts(
  db: Db,
  pariwarId: PariwarId,
  opts: ListPublicPostsOptions = {},
): Promise<NewsPostRow[]> {
  return db
    .select()
    .from(newsPosts)
    .where(
      and(
        eq(newsPosts.pariwarId, pariwarId),
        eq(newsPosts.status, 'published'),
        eq(newsPosts.audienceScope, 'public'),
      ),
    )
    .orderBy(desc(newsPosts.publishedAt))
    .limit(clampLimit(opts.limit, { default: 30, cap: 200 }))
    .offset(Math.max(0, opts.offset ?? 0));
}

/** Resolve a single PUBLISHED public post by id (the apps/public detail page). */
export async function getPublishedPublicPost(
  db: Db,
  pariwarId: PariwarId,
  postId: NewsPostId,
): Promise<NewsPostRow | null> {
  const rows = await db
    .select()
    .from(newsPosts)
    .where(
      and(
        eq(newsPosts.pariwarId, pariwarId),
        eq(newsPosts.postId, postId),
        eq(newsPosts.status, 'published'),
        eq(newsPosts.audienceScope, 'public'),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}
