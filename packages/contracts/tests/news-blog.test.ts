// News/Blog contracts — Story 10.5 (Task 3).
//
// TWO jobs: (1) the test-only sync-guard binding the contract enum tuples to the @twt/domain
// pgEnum-source tuples (contracts cannot import domain in SHIPPED files — the RN bundle boundary —
// so this test, which never ships, is the mechanical drift guard, per
// [[project_contracts_domain_bundle_boundary]]); (2) the `.strict()` behaviour + snake_case wire
// shape of the DTOs (a live wire-shape drift, e.g. `bodyMarkdown` vs `body_markdown`, must fail).

import { schema, newsBlog } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import {
  CreateDraftRequest,
  NEWS_AUDIENCE_SCOPES,
  NEWS_CHANNELS,
  NEWS_POST_STATUSES,
  NewsPostResponse,
  PublicPostResponse,
  ScheduleRequest,
  SubmitRequest,
} from '../src/news-blog/index.js';

describe('news-blog contract ↔ domain sync-guard', () => {
  it('NEWS_AUDIENCE_SCOPES matches the domain pgEnum-source tuple', () => {
    expect([...NEWS_AUDIENCE_SCOPES]).toEqual([...schema.NEWS_AUDIENCE_SCOPES]);
  });

  it('NEWS_POST_STATUSES matches the domain pgEnum-source tuple', () => {
    expect([...NEWS_POST_STATUSES]).toEqual([...schema.NEWS_POST_STATUSES]);
  });

  it('NEWS_CHANNELS matches the domain channel tuple (the real delivery set — no email, has telegram)', () => {
    expect([...NEWS_CHANNELS]).toEqual([...schema.NEWS_CHANNELS]);
    expect(NEWS_CHANNELS).not.toContain('email');
    expect(NEWS_CHANNELS).toContain('telegram');
  });

  it('the domain status-action helper is reachable (nextPostStatus barrel)', () => {
    // A trivial cross-package smoke that the domain module is importable + wired.
    expect(newsBlog.nextPostStatus('draft', 'submit')).toBe('submitted');
  });
});

describe('news-blog DTO strictness + wire shape', () => {
  it('CreateDraftRequest accepts a valid snake_case body', () => {
    const parsed = CreateDraftRequest.parse({
      title: 'Hi',
      body_markdown: '# hi',
      title_hi: 'श',
      body_markdown_hi: '# न',
      audience_scope: 'members-all',
      channels: ['push', 'sms'],
    });
    expect(parsed.audience_scope).toBe('members-all');
  });

  it('CreateDraftRequest rejects an unknown key (.strict)', () => {
    expect(() =>
      CreateDraftRequest.parse({
        title: 'Hi',
        body_markdown: '# hi',
        audience_scope: 'public',
        channels: [],
        bodyMarkdown: 'camelCase-leak', // wrong casing → unknown key
      }),
    ).toThrow();
  });

  it('CreateDraftRequest rejects an unknown channel', () => {
    expect(() =>
      CreateDraftRequest.parse({
        title: 'Hi',
        body_markdown: '# hi',
        audience_scope: 'public',
        channels: ['email'], // not a real channel
      }),
    ).toThrow();
  });

  it('SubmitRequest requires reviewer_id (uuid)', () => {
    expect(() => SubmitRequest.parse({})).toThrow();
    expect(SubmitRequest.parse({ reviewer_id: '11111111-1111-1111-1111-111111111111' }).reviewer_id).toBe(
      '11111111-1111-1111-1111-111111111111',
    );
  });

  it('ScheduleRequest requires an iso datetime', () => {
    expect(() => ScheduleRequest.parse({ scheduled_publish_at: 'not-a-date' })).toThrow();
    expect(ScheduleRequest.parse({ scheduled_publish_at: '2026-08-01T00:00:00Z' })).toBeTruthy();
  });

  it('PublicPostResponse never carries actor ids (unauthenticated shape)', () => {
    expect(() =>
      PublicPostResponse.parse({
        post_id: '11111111-1111-1111-1111-111111111111',
        title: 't',
        body_markdown: 'b',
        title_hi: null,
        body_markdown_hi: null,
        published_at: '2026-08-01T00:00:00Z',
        author_actor_id: '22222222-2222-2222-2222-222222222222', // must be rejected
      }),
    ).toThrow();
  });

  it('NewsPostResponse round-trips the full admin shape', () => {
    const dto = {
      post_id: '11111111-1111-1111-1111-111111111111',
      pariwar_id: '22222222-2222-2222-2222-222222222222',
      title: 't',
      body_markdown: 'b',
      title_hi: null,
      body_markdown_hi: null,
      audience_scope: 'members-all' as const,
      audience_scope_value: null,
      channels: ['push' as const],
      scheduled_publish_at: null,
      status: 'draft' as const,
      author_actor_id: '33333333-3333-3333-3333-333333333333',
      reviewer_actor_id: null,
      tone_signoff_content_hash: null,
      tone_signoff_reviewed_at: null,
      published_at: null,
      created_at: '2026-08-01T00:00:00Z',
      updated_at: '2026-08-01T00:00:00Z',
    };
    expect(NewsPostResponse.parse(dto).status).toBe('draft');
  });
});
