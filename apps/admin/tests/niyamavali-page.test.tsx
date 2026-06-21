// NiyamavaliPage 409-surfacing test (Story 2.4, AC4 UI). The api-client module is
// mocked so publish rejects with the tone-review 409; the page must surface the clear
// resolution path. Exercises the real hooks + ErrorBanner + derivation.

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { ClauseDraftResponse } from '@twt/contracts';
import * as api from '../src/api/client.js';
import { NiyamavaliPage } from '../src/modules/niyamavali-admin/NiyamavaliPage.js';
import { renderWithClient } from './_helpers.js';

const SIGNED_OFF_DRAFT = {
  draftId: '44444444-4444-4444-4444-444444444444',
  pariwarId: '11111111-1111-1111-1111-111111111111',
  clauseId: 'niy.flow.r1',
  operation: 'create',
  payload: { rule_code: 'R1', title_en: 'Title' },
  effectiveDate: '2026-08-01T00:00:00.000Z',
  benefitMechanism: 'pool',
  affectedMemberScope: null,
  status: 'signed_off',
  authoredByActor: '22222222-2222-2222-2222-222222222222',
  toneReviewedBy: '33333333-3333-3333-3333-333333333333',
  toneReviewedAt: '2026-08-01T00:00:00.000Z',
  toneReviewContentHash: 'a'.repeat(64),
  publishedClauseVersionId: null,
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
  auditId: null,
} as unknown as ClauseDraftResponse;

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
    listClauses: vi.fn(async () => []),
    listDrafts: vi.fn(async () => [SIGNED_OFF_DRAFT]),
    getDraftDiff: vi.fn(async () => ({
      structuredDiff: { added: {}, removed: {}, changed: {} },
      renderedDiff: [],
    })),
    createDraft: vi.fn(),
    updateDraft: vi.fn(async () => ({ ...SIGNED_OFF_DRAFT, status: 'draft' })),
    submitForReview: vi.fn(),
    signoffDraft: vi.fn(),
    publishDraft: vi.fn(async () => {
      throw new ApiError(409, 'tone_review.required', 'Tone-review sign-off required');
    }),
  };
});

describe('NiyamavaliPage — publish 409 surfacing (AC4)', () => {
  it('shows the tone-review resolution path when publish is rejected 409', async () => {
    const user = userEvent.setup();
    renderWithClient(<NiyamavaliPage pariwarId="11111111-1111-1111-1111-111111111111" />);

    // The signed_off draft renders with an enabled Publish button.
    const publishBtn = await screen.findByRole('button', { name: /^Publish$/ });
    await user.click(publishBtn);

    const banner = await screen.findByTestId('workflow-error');
    await waitFor(() => expect(banner).toHaveAttribute('data-code', 'tone_review.required'));
    expect(banner).toHaveTextContent(/non-author/i);
    expect(banner).toHaveTextContent(/sign off/i);
  });

  it('lets a trustee edit an existing draft and saves a patch', async () => {
    const user = userEvent.setup();
    renderWithClient(<NiyamavaliPage pariwarId="11111111-1111-1111-1111-111111111111" />);

    await user.click(await screen.findByRole('button', { name: /^Edit$/ }));
    const title = screen.getByLabelText('Title (English)');
    await user.clear(title);
    await user.type(title, 'Revised title');
    await user.click(screen.getByRole('button', { name: /^Save changes$/ }));

    await waitFor(() =>
      expect(api.updateDraft).toHaveBeenCalledWith(
        '11111111-1111-1111-1111-111111111111',
        SIGNED_OFF_DRAFT.draftId,
        expect.objectContaining({
          payload: expect.objectContaining({ title_en: 'Revised title' }),
          effectiveDate: '2026-08-01T00:00:00.000Z',
          benefitMechanism: 'pool',
        }),
      ),
    );
  });
});
