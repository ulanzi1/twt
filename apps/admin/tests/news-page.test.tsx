// NewsPage component/interaction tests (Story 10.5, Task 7). The api-client module is mocked so the
// list renders, the status filter + editor work, and the workflow actions surface server errors with a
// resolution path. Exercises the real hooks + ErrorBanner + derivation.

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { NewsPostResponse } from '@twt/contracts';
import { NewsPage } from '../src/modules/news-blog/NewsPage.js';
import { renderWithClient } from './_helpers.js';

const PARIWAR = '11111111-1111-1111-1111-111111111111';

function post(overrides: Partial<NewsPostResponse>): NewsPostResponse {
  return {
    post_id: '22222222-2222-2222-2222-222222222222',
    pariwar_id: PARIWAR,
    title: 'Hello',
    body_markdown: 'body',
    title_hi: 'श',
    body_markdown_hi: 'ब',
    audience_scope: 'members-all',
    audience_scope_value: null,
    channels: ['push'],
    scheduled_publish_at: null,
    status: 'draft',
    author_actor_id: '33333333-3333-3333-3333-333333333333',
    reviewer_actor_id: null,
    tone_signoff_content_hash: null,
    tone_signoff_reviewed_at: null,
    published_at: null,
    created_at: '2026-08-01T00:00:00.000Z',
    updated_at: '2026-08-01T00:00:00.000Z',
    ...overrides,
  } as NewsPostResponse;
}

const DRAFT = post({ post_id: 'aaaa1111-1111-1111-1111-111111111111', title: 'A draft', status: 'draft' });
const SUBMITTED = post({ post_id: 'bbbb2222-2222-2222-2222-222222222222', title: 'Second post', status: 'submitted' });

vi.mock('../src/api/client.js', () => {
  class ApiError extends Error {
    public constructor(
      public readonly status: number,
      public readonly code: string,
      message: string,
    ) {
      super(message);
      this.name = 'ApiError';
    }
    public get isUnauthorized(): boolean {
      return this.status === 401;
    }
  }
  return {
    ApiError,
    listNewsPosts: vi.fn(async () => ({ items: [DRAFT, SUBMITTED], next_offset: null })),
    getNewsPost: vi.fn(async () => DRAFT),
    createNewsDraft: vi.fn(),
    updateNewsDraft: vi.fn(),
    submitNewsPost: vi.fn(async () => {
      throw new ApiError(403, 'news.author_is_reviewer', 'The author cannot be the reviewer');
    }),
    approveNewsPost: vi.fn(async () => {
      throw new ApiError(409, 'tone_review.required', 'Tone-review sign-off required');
    }),
    scheduleNewsPost: vi.fn(),
    publishNewsPost: vi.fn(),
  };
});

describe('NewsPage', () => {
  it('renders the status-filtered post list', async () => {
    renderWithClient(<NewsPage pariwarId={PARIWAR} />);
    expect(await screen.findByText('A draft')).toBeInTheDocument();
    expect(screen.getByText('Second post')).toBeInTheDocument();
    // the draft shows the Draft status chip
    expect(screen.getByTestId(`news-status-${DRAFT.post_id}`)).toHaveTextContent('Draft');
  });

  it('selecting a draft shows the editor + a submit affordance (author≠reviewer 403 surfaced)', async () => {
    const user = userEvent.setup();
    renderWithClient(<NewsPage pariwarId={PARIWAR} />);
    await user.click(await screen.findByTestId(`news-item-${DRAFT.post_id}`));

    // reviewer input + submit button appear for a draft
    const reviewerInput = await screen.findByPlaceholderText('reviewer user id');
    await user.type(reviewerInput, DRAFT.author_actor_id); // same as author → server 403
    await user.click(screen.getByTestId('news-submit'));

    const banner = await screen.findByTestId('news-error');
    expect(banner).toHaveAttribute('data-code', 'news.author_is_reviewer');
    expect(banner).toHaveTextContent(/different admin/i);
  });

  it('selecting a submitted post surfaces the approve action + the tone-review 409 guidance', async () => {
    const user = userEvent.setup();
    renderWithClient(<NewsPage pariwarId={PARIWAR} />);
    await user.click(await screen.findByTestId(`news-item-${SUBMITTED.post_id}`));

    const approve = await screen.findByTestId('news-approve');
    await user.click(approve);

    await waitFor(() => {
      const banner = screen.getByTestId('news-error');
      expect(banner).toHaveAttribute('data-code', 'tone_review.required');
    });
  });
});
