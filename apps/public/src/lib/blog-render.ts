// Pure News/Blog render model — Story 11a.1 (Task 4; AC3), mirroring `tc-render.ts`.
//
// ── The defect this closes ───────────────────────────────────────────────────
// `listPublishedPublicPosts` / `getPublishedPublicPost` issued a bare
// `db.select()`, returning EVERY `news_posts` column to the two public pages:
// `author_actor_id`, `reviewer_actor_id`, `tone_signoff_content_hash`,
// `tone_signoff_reviewed_at`, `channels`, `audience_scope_value`, `status`, the
// workflow timestamps. And `blog.astro:6` asserted the opposite — *"returns only
// the member-facing fields"*. None of it reached the rendered page, but all of it
// reached the process, one interpolation away from the template, under a comment
// saying it was not there. ⚠ That combination — an over-fetch plus a comment
// asserting there isn't one — is worse than the over-fetch alone.
//
// Both reads are now narrowed to an explicit column list at the source
// (`packages/domain/src/news-blog/read.ts`), and this module is the pure model
// the pages consume. Two layers, deliberately: the narrowing means the data is
// never fetched, the model means the page cannot reach past what it renders.
//
// ⚠ VERIFIED BEFORE NARROWING (the story asked): `getPublishedPublicPost` and
// `listPublishedPublicPosts` have exactly ONE production consumer each — the two
// `apps/public` blog pages. The story's caution that the detail read is "also
// used by the admin preview path" does not hold in the repo; the admin surface
// uses `listPostsForPariwar` / its own reads. Checked, not assumed.
//
// ── ⛔ NO BEHAVIOURAL CHANGE ─────────────────────────────────────────────────
// Every value the two pages rendered before, they render after, byte-identical —
// including `fmtDate`'s `null → ''`. This narrows the MODEL, not the page.
//
// SERVER-ONLY (imported by `.astro` frontmatter + Node tests, never a client
// island), so importing `@twt/domain` types is allowed.

import type { newsBlog } from '@twt/domain';

import { deriveFieldIds, type FieldIdMapping } from './surface-fields.js';

/**
 * The NARROWED public row — the six columns `listPublishedPublicPosts` /
 * `getPublishedPublicPost` now select (Story 11a.1 AC3). ⛔ Deliberately NOT
 * `schema.NewsPostRow`: typing the builders against the full row would let an
 * authoring column be read here again without anything objecting.
 */
type PostRow = newsBlog.PublicPostRow;

/**
 * The shipped `fmtDate` from both blog pages, moved here verbatim in behaviour:
 * ISO date only, and the empty string for a null instant. ⛔ Preserved exactly —
 * a "nicer" format here would be a render change smuggled in under a refactor.
 */
function fmtDate(d: Date | null): string {
  return d ? d.toISOString().slice(0, 10) : '';
}

// ─────────────────────────────────────────────────────────────────────────────
// /blog — the list surface
// ─────────────────────────────────────────────────────────────────────────────

/** One card on the public news list. Exactly the fields the card renders. */
export interface BlogListItem {
  /** Rendered as the card's `href` (`/blog/{postId}`) — a rendered field, not an internal id. */
  postId: string;
  title: string;
  /** The Hindi title, rendered beneath the English one when present. */
  titleHi: string | null;
  /** ISO `YYYY-MM-DD`, or `''` when unpublished-dated. */
  publishedAt: string;
}

/** The whole-page model for `/blog`. */
export interface BlogListModel {
  posts: BlogListItem[];
  /** False ⇒ the page renders its "No announcements yet." empty state. */
  hasPosts: boolean;
}

/** Build the `/blog` model from the published public rows. Pure. */
export function buildBlogListModel(rows: readonly PostRow[]): BlogListModel {
  return {
    posts: rows.map((p) => ({
      postId: p.postId,
      title: p.title,
      titleHi: p.titleHi,
      publishedAt: fmtDate(p.publishedAt),
    })),
    hasPosts: rows.length > 0,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// /blog/[postId] — the detail surface
// ─────────────────────────────────────────────────────────────────────────────

/** The public news-detail model. Exactly the fields the article renders. */
export interface BlogPostModel {
  title: string;
  titleHi: string | null;
  publishedAt: string;
  /**
   * Rendered as ESCAPED pre-wrapped text by the page (Astro auto-escapes `{...}`),
   * so no authored markup can inject into the render. ⛔ Do not `set:html` this.
   */
  bodyMarkdown: string;
  bodyMarkdownHi: string | null;
}

/** Build the `/blog/[postId]` model from one published public row. Pure. */
export function buildBlogPostModel(row: PostRow): BlogPostModel {
  return {
    title: row.title,
    titleHi: row.titleHi,
    publishedAt: fmtDate(row.publishedAt),
    bodyMarkdown: row.bodyMarkdown,
    bodyMarkdownHi: row.bodyMarkdownHi,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Matrix field ids (AC2, D3(a)) — camelCase model key → snake_case matrix id
// ─────────────────────────────────────────────────────────────────────────────

/** `/blog` per-card classification. Every key mapped, or `deriveFieldIds` throws. */
export const BLOG_LIST_ITEM_FIELD_IDS: FieldIdMapping<BlogListItem> = {
  postId: 'post_id',
  title: 'title',
  titleHi: 'title_hi',
  publishedAt: 'published_at',
};

/** `/blog/[postId]` classification. */
export const BLOG_POST_FIELD_IDS: FieldIdMapping<BlogPostModel> = {
  title: 'title',
  titleHi: 'title_hi',
  publishedAt: 'published_at',
  bodyMarkdown: 'body_markdown',
  bodyMarkdownHi: 'body_markdown_hi',
};

/** Model-level keys on the list: structural, not rendered values. */
const BLOG_LIST_MODEL_FIELD_IDS: FieldIdMapping<BlogListModel> = {
  posts: null, // the cards themselves — classified per-item below
  hasPosts: null, // an empty-state boolean; renders a fixed string, carries no data
};

/**
 * The `/blog` surface's matrix field ids: the union over the rendered cards.
 *
 * ⚠ An EMPTY list yields an empty set — which is correct rather than a gap: a
 * page rendering no cards renders no card fields, and so leaks none. The
 * snapshot fed to the gate is built from fixture posts precisely so the check is
 * exercised against a populated render.
 */
export function blogListSurfaceFieldIds(model: BlogListModel): string[] {
  deriveFieldIds(model, BLOG_LIST_MODEL_FIELD_IDS); // validates the model shape itself
  const ids = model.posts.flatMap((item) => deriveFieldIds(item, BLOG_LIST_ITEM_FIELD_IDS));
  return [...new Set(ids)].sort();
}

/** The `/blog/[postId]` surface's matrix field ids. */
export function blogPostSurfaceFieldIds(model: BlogPostModel): string[] {
  return deriveFieldIds(model, BLOG_POST_FIELD_IDS);
}
