// Blog render model — Story 11a.1 (Task 4, AC3).
//
// AC3's finding: `blog.astro:6` claimed *"`listPublishedPublicPosts` returns only
// the member-facing fields"* — ⛔ FALSE. Both public blog reads issued a bare
// `db.select()`, returning EVERY column of `news_posts`: `author_actor_id`,
// `reviewer_actor_id`, `tone_signoff_content_hash`, `tone_signoff_reviewed_at`,
// `channels`, `audience_scope_value`, `status`, the workflow timestamps. None of
// it reached the page — but all of it reached the PROCESS, one interpolation away
// from the render, with a comment asserting it was not there.
//
// This closes it at the source: a pure render model exposing ONLY the rendered
// fields, mirroring `tc-render.ts` / `niyamavali-render.ts`. The model is also
// the field-id source for the tier-leak snapshot (D3(a)) — so the same narrowing
// that removes the over-fetch is what arms the gate.
//
// ⛔ NO BEHAVIOURAL CHANGE: this narrows the MODEL, not the page. Every value the
// two blog pages rendered before, they render after, byte-identical.

import { describe, expect, it } from 'vitest';
import type { schema } from '@twt/domain';

import {
  BLOG_LIST_ITEM_FIELD_IDS,
  BLOG_POST_FIELD_IDS,
  blogListSurfaceFieldIds,
  blogPostSurfaceFieldIds,
  buildBlogListModel,
  buildBlogPostModel,
} from '../src/lib/blog-render.js';

/** The internal-attribution values we assert can NEVER reach a render model. */
const AUTHOR_SENTINEL = '11111111-2222-4333-8444-555555555555';
const REVIEWER_SENTINEL = '99999999-8888-4777-8666-555555555555';
const TONE_HASH_SENTINEL = 'a'.repeat(64);

function postRow(partial: Partial<schema.NewsPostRow> = {}): schema.NewsPostRow {
  return {
    postId: '0e1c0001-0000-4000-8000-000000000001',
    pariwarId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    title: 'Annual general meeting',
    bodyMarkdown: 'The AGM will be held at the community hall.',
    titleHi: 'वार्षिक आम बैठक',
    bodyMarkdownHi: 'एजीएम सामुदायिक हॉल में आयोजित की जाएगी।',
    audienceScope: 'public',
    audienceScopeValue: null,
    channels: ['push'],
    scheduledPublishAt: null,
    status: 'published',
    authorActorId: AUTHOR_SENTINEL,
    reviewerActorId: REVIEWER_SENTINEL,
    toneSignoffContentHash: TONE_HASH_SENTINEL,
    toneSignoffReviewedAt: new Date('2026-02-01T00:00:00Z'),
    publishedAt: new Date('2026-02-02T00:00:00Z'),
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-02-02T00:00:00Z'),
    ...partial,
  } as unknown as schema.NewsPostRow;
}

describe('buildBlogListModel (AC3)', () => {
  it('exposes exactly the four rendered fields per item', () => {
    const model = buildBlogListModel([postRow()]);
    expect(Object.keys(model.posts[0]!).sort()).toEqual(['postId', 'publishedAt', 'title', 'titleHi']);
  });

  it('renders the same values the page rendered before (⛔ no behavioural change)', () => {
    const item = buildBlogListModel([postRow()]).posts[0]!;
    expect(item.title).toBe('Annual general meeting');
    expect(item.titleHi).toBe('वार्षिक आम बैठक');
    // `fmtDate` in blog.astro was `d.toISOString().slice(0, 10)`; null → ''.
    expect(item.publishedAt).toBe('2026-02-02');
    expect(item.postId).toBe('0e1c0001-0000-4000-8000-000000000001');
  });

  it('formats a null publishedAt as the empty string (the shipped fmtDate behaviour)', () => {
    expect(buildBlogListModel([postRow({ publishedAt: null })]).posts[0]!.publishedAt).toBe('');
  });

  it('carries hasPosts=false for an empty list (the "No announcements yet" branch)', () => {
    const model = buildBlogListModel([]);
    expect(model.hasPosts).toBe(false);
    expect(model.posts).toEqual([]);
  });

  it('⛔ NEVER carries authoring metadata — the false comment at blog.astro:6 made real', () => {
    const serialized = JSON.stringify(buildBlogListModel([postRow()]));
    expect(serialized).not.toContain(AUTHOR_SENTINEL);
    expect(serialized).not.toContain(REVIEWER_SENTINEL);
    expect(serialized).not.toContain(TONE_HASH_SENTINEL);
    expect(serialized).not.toContain('audienceScope');
    expect(serialized).not.toContain('channels');
    expect(serialized).not.toContain('status');
  });
});

describe('buildBlogPostModel (AC3)', () => {
  it('exposes exactly the five rendered fields', () => {
    const model = buildBlogPostModel(postRow());
    expect(Object.keys(model).sort()).toEqual([
      'bodyMarkdown',
      'bodyMarkdownHi',
      'publishedAt',
      'title',
      'titleHi',
    ]);
  });

  it('renders the same values the detail page rendered before', () => {
    const model = buildBlogPostModel(postRow());
    expect(model.title).toBe('Annual general meeting');
    expect(model.bodyMarkdown).toBe('The AGM will be held at the community hall.');
    expect(model.bodyMarkdownHi).toBe('एजीएम सामुदायिक हॉल में आयोजित की जाएगी।');
    expect(model.publishedAt).toBe('2026-02-02');
  });

  it('⛔ NEVER carries authoring metadata', () => {
    const serialized = JSON.stringify(buildBlogPostModel(postRow()));
    expect(serialized).not.toContain(AUTHOR_SENTINEL);
    expect(serialized).not.toContain(REVIEWER_SENTINEL);
    expect(serialized).not.toContain(TONE_HASH_SENTINEL);
  });
});

describe('field-id derivation for the blog surfaces (AC2, D3(a))', () => {
  it('the list surface derives its snake_case matrix field ids from the model', () => {
    expect(blogListSurfaceFieldIds(buildBlogListModel([postRow()]))).toEqual([
      'post_id',
      'published_at',
      'title',
      'title_hi',
    ]);
  });

  it('the detail surface derives its snake_case matrix field ids from the model', () => {
    expect(blogPostSurfaceFieldIds(buildBlogPostModel(postRow()))).toEqual([
      'body_markdown',
      'body_markdown_hi',
      'published_at',
      'title',
      'title_hi',
    ]);
  });

  it('an EMPTY list derives no item field ids (an empty render leaks nothing)', () => {
    expect(blogListSurfaceFieldIds(buildBlogListModel([]))).toEqual([]);
  });

  it('the mappings cover the model shapes EXACTLY (a new model key must be classified)', () => {
    // The mapping key-sets are the classification. If a field is added to a render
    // model without a mapping entry, `deriveFieldIds` throws — this asserts the
    // mapping is not merely present but exhaustive over today's shape.
    expect(Object.keys(BLOG_LIST_ITEM_FIELD_IDS).sort()).toEqual(
      Object.keys(buildBlogListModel([postRow()]).posts[0]!).sort(),
    );
    expect(Object.keys(BLOG_POST_FIELD_IDS).sort()).toEqual(
      Object.keys(buildBlogPostModel(postRow())).sort(),
    );
  });
});
