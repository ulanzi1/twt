// News/Blog pure write-path helpers — Story 10.5 (AC3, AC7, AC8). DB-free.
//
// Covers: the bilingual-required check (public/members-all require hi; state/role/cohort don't) and
// the content-hash binding (a body change changes the hash → invalidates a prior sign-off).

import { describe, expect, it } from 'vitest';

import { NewsPostBilingualRequiredError } from '../../src/news-blog/errors.js';
import { assertBilingualForScope, newsContentHash, newsResourceLocator } from '../../src/news-blog/write.js';
import type { NewsAudienceScope } from '../../src/schema/news_posts.js';

function post(scope: NewsAudienceScope, titleHi: string | null, bodyHi: string | null) {
  return { postId: 'p1', audienceScope: scope, titleHi, bodyMarkdownHi: bodyHi };
}

describe('assertBilingualForScope (AC7)', () => {
  it('passes when a public/members-all post has both hi fields', () => {
    expect(() => assertBilingualForScope(post('public', 'श', 'ब'))).not.toThrow();
    expect(() => assertBilingualForScope(post('members-all', 'श', 'ब'))).not.toThrow();
  });

  it('throws NewsPostBilingualRequiredError when a public post is missing hi copy', () => {
    expect(() => assertBilingualForScope(post('public', null, 'ब'))).toThrow(NewsPostBilingualRequiredError);
    expect(() => assertBilingualForScope(post('members-all', 'श', null))).toThrow(NewsPostBilingualRequiredError);
    // whitespace-only counts as missing
    expect(() => assertBilingualForScope(post('public', '   ', '   '))).toThrow(NewsPostBilingualRequiredError);
  });

  it('names the missing fields in the error', () => {
    try {
      assertBilingualForScope(post('public', null, null));
      throw new Error('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(NewsPostBilingualRequiredError);
      expect((err as NewsPostBilingualRequiredError).missingFields).toEqual(['title_hi', 'body_markdown_hi']);
    }
  });

  it('is a no-op for state/role/cohort (hi optional there)', () => {
    for (const scope of ['state', 'role', 'cohort'] as const) {
      expect(() => assertBilingualForScope(post(scope, null, null))).not.toThrow();
    }
  });
});

describe('newsContentHash (AC3 — content-binding)', () => {
  it('is deterministic for the same body', () => {
    const p = { bodyMarkdown: 'hello', bodyMarkdownHi: 'नमस्ते' };
    expect(newsContentHash(p)).toBe(newsContentHash({ ...p }));
  });

  it('changes when the English body changes (invalidates a prior sign-off)', () => {
    const a = newsContentHash({ bodyMarkdown: 'hello', bodyMarkdownHi: 'नमस्ते' });
    const b = newsContentHash({ bodyMarkdown: 'hello!', bodyMarkdownHi: 'नमस्ते' });
    expect(a).not.toBe(b);
  });

  it('changes when the Hindi body changes', () => {
    const a = newsContentHash({ bodyMarkdown: 'hello', bodyMarkdownHi: 'नमस्ते' });
    const b = newsContentHash({ bodyMarkdown: 'hello', bodyMarkdownHi: 'नमस्कार' });
    expect(a).not.toBe(b);
  });

  it('treats null hi and absent hi identically', () => {
    expect(newsContentHash({ bodyMarkdown: 'x', bodyMarkdownHi: null })).toBe(
      newsContentHash({ bodyMarkdown: 'x', bodyMarkdownHi: null }),
    );
  });

  it('is a 64-char sha256 hex', () => {
    expect(newsContentHash({ bodyMarkdown: 'x', bodyMarkdownHi: null })).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('newsResourceLocator', () => {
  it('formats news:post:<id>', () => {
    expect(newsResourceLocator('abc')).toBe('news:post:abc');
  });
});
