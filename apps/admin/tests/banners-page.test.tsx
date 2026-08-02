// BannersPage component/interaction tests (Story 10.9, Task 6). The api-client module is mocked so
// the list renders, the derived-display-state filter works, the AC4 popup-dismissible affordance is
// forced, the AC5 verdict appears, and the publish action surfaces the tone-review 409 with a
// resolution path. Exercises the real hooks + ErrorBanner + derivations.
//
// `now` is INJECTED into the page so the preview + verdict are deterministic across window
// boundaries (the AC2 rule applied to the console, not just the server).

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { BannerResponse } from '@twt/contracts';
import { BannersPage } from '../src/modules/banners/BannersPage.js';
import { renderWithClient } from './_helpers.js';

const PARIWAR = '11111111-1111-1111-1111-111111111111';
const NOW = new Date('2026-08-04T12:00:00.000Z');
const FROM = '2026-08-01T00:00:00.000Z';
const UNTIL = '2026-08-08T00:00:00.000Z';

function banner(over: Partial<BannerResponse>): BannerResponse {
  return {
    banner_id: '22222222-2222-2222-2222-222222222222',
    pariwar_id: PARIWAR,
    title: 'Maintenance window',
    body: 'Down 02:00–03:00.',
    title_hi: 'रखरखाव',
    body_hi: 'बंद',
    audience_scope: 'members-all',
    audience_scope_value: null,
    valid_from: FROM,
    valid_until: UNTIL,
    display_mode: 'banner',
    dismissible: true,
    display_once_per_member: false,
    severity: 'info',
    revision: 1,
    status: 'draft',
    display_state: 'draft',
    created_by_actor_id: '33333333-3333-3333-3333-333333333333',
    tone_signoff_content_hash: null,
    tone_signoff_reviewed_at: null,
    tone_signoff_reviewed_by: null,
    published_at: null,
    retracted_at: null,
    created_at: FROM,
    updated_at: FROM,
    ...over,
  } as BannerResponse;
}

const DRAFT = banner({
  banner_id: 'aaaa1111-1111-1111-1111-111111111111',
  title: 'A draft',
  status: 'draft',
  display_state: 'draft',
  severity: 'warning',
});
const LIVE_CRITICAL = banner({
  banner_id: 'bbbb2222-2222-2222-2222-222222222222',
  title: 'Maintenance window',
  status: 'published',
  display_state: 'live',
  severity: 'critical',
  published_at: FROM,
});

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
    listBanners: vi.fn(async () => ({ items: [DRAFT, LIVE_CRITICAL], next_offset: null })),
    getBanner: vi.fn(async () => DRAFT),
    createBanner: vi.fn(),
    updateBanner: vi.fn(),
    publishBanner: vi.fn(async () => {
      throw new ApiError(409, 'tone_review.required', 'A non-author tone-review sign-off is required');
    }),
    retractBanner: vi.fn(),
  };
});

describe('BannersPage — list', () => {
  it('renders the banners with their DERIVED display state, not their stored status', async () => {
    renderWithClient(<BannersPage pariwarId={PARIWAR} now={NOW} />);
    expect(await screen.findByText('A draft')).toBeInTheDocument();
    expect(screen.getByTestId(`banner-state-${DRAFT.banner_id}`)).toHaveTextContent('Draft');
    // The published-and-in-window banner reads "Live now" — a state that is never stored.
    expect(screen.getByTestId(`banner-state-${LIVE_CRITICAL.banner_id}`)).toHaveTextContent('Live now');
  });

  it('offers the five derived display states as filter options', async () => {
    renderWithClient(<BannersPage pariwarId={PARIWAR} now={NOW} />);
    const filter = await screen.findByTestId('banner-state-filter');
    for (const label of ['Draft', 'Scheduled', 'Live now', 'Expired', 'Retracted']) {
      expect(filter).toHaveTextContent(label);
    }
  });
});

describe('BannersPage — AC4 "no member trapped"', () => {
  it('forces + disables the dismissible toggle when display mode is popup', async () => {
    const user = userEvent.setup();
    renderWithClient(<BannersPage pariwarId={PARIWAR} now={NOW} />);

    const dismissible = await screen.findByTestId('banner-dismissible');
    // A plain banner may be made non-dismissible.
    expect(dismissible).toBeEnabled();
    await user.click(dismissible);
    expect(dismissible).not.toBeChecked();

    await user.selectOptions(screen.getByTestId('banner-display-mode-select'), 'popup');
    // Switching to a popup forces it back ON and locks it.
    expect(screen.getByTestId('banner-dismissible')).toBeChecked();
    expect(screen.getByTestId('banner-dismissible')).toBeDisabled();
    expect(screen.getByTestId('banner-dismissible-hint')).toHaveTextContent(/always dismissible/i);
  });

  it('explains that a non-dismissible BANNER is legitimate', async () => {
    renderWithClient(<BannersPage pariwarId={PARIWAR} now={NOW} />);
    expect(await screen.findByTestId('banner-dismissible-hint')).toHaveTextContent(/blocking system state/i);
  });
});

describe('BannersPage — Decision 4 seam indicator', () => {
  it('warns that a cohort audience reaches nobody yet', async () => {
    const user = userEvent.setup();
    renderWithClient(<BannersPage pariwarId={PARIWAR} now={NOW} />);
    expect(screen.queryByTestId('banner-not-targetable')).not.toBeInTheDocument();

    await user.selectOptions(await screen.findByTestId('banner-audience-select'), 'cohort');
    expect(screen.getByTestId('banner-not-targetable')).toHaveTextContent(/no member will see it/i);
  });
});

describe('BannersPage — the live preview (AC1)', () => {
  it('renders the authored copy and marks the derived state on the surface', async () => {
    const user = userEvent.setup();
    renderWithClient(<BannersPage pariwarId={PARIWAR} now={NOW} />);
    await user.click(await screen.findByTestId(`banner-item-${LIVE_CRITICAL.banner_id}`));

    const surface = screen.getByTestId('banner-preview-surface');
    expect(surface).toHaveAttribute('data-display-state', 'live');
    expect(surface).toHaveAttribute('data-severity', 'critical');
    expect(surface).toHaveTextContent('Maintenance window');
    // Dismissible → the affordance is previewed.
    expect(screen.getByTestId('banner-preview-dismiss')).toBeInTheDocument();
  });

  it('distinguishes a SCHEDULED draft from a live one and says when it goes live', async () => {
    const user = userEvent.setup();
    renderWithClient(<BannersPage pariwarId={PARIWAR} now={NOW} />);

    // A window that has not opened yet at the injected `now`.
    const from = await screen.findByTestId('banner-valid-from-input');
    const until = screen.getByTestId('banner-valid-until-input');
    await user.type(from, '2026-09-01T00:00');
    await user.type(until, '2026-09-08T00:00');

    await waitFor(() => {
      expect(screen.getByTestId('banner-preview-surface')).toHaveAttribute('data-display-state', 'scheduled');
    });
    expect(screen.getByTestId('banner-preview-scheduled-note')).toHaveTextContent(/Not visible yet/i);
  });
});

describe('BannersPage — AC5 the visibility verdict', () => {
  it('shows a two-row Visible/Hidden comparison naming the current winner and the consequence', async () => {
    const user = userEvent.setup();
    renderWithClient(<BannersPage pariwarId={PARIWAR} now={NOW} />);

    // Select the WARNING draft; the live CRITICAL banner is its competitor in the same lane.
    await user.click(await screen.findByTestId(`banner-item-${DRAFT.banner_id}`));

    const verdict = await screen.findByTestId('banner-verdict');
    expect(verdict).toBeInTheDocument();
    expect(screen.getByTestId('banner-verdict-winner')).toHaveTextContent('Visible');
    expect(screen.getByTestId('banner-verdict-draft')).toHaveTextContent('Hidden');
    expect(screen.getByTestId('banner-verdict-warning')).toHaveTextContent(
      /will never be seen while “Maintenance window” is live/i,
    );
    expect(screen.getByTestId('banner-verdict-warning')).toHaveTextContent(/severity decides first/i);
  });

  it('is read-only — it never disables the publish action (overlapping windows are legitimate)', async () => {
    const user = userEvent.setup();
    renderWithClient(<BannersPage pariwarId={PARIWAR} now={NOW} />);
    await user.click(await screen.findByTestId(`banner-item-${DRAFT.banner_id}`));
    await screen.findByTestId('banner-verdict-warning');
    expect(screen.getByTestId('banner-publish')).toBeEnabled();
  });
});

describe('BannersPage — the workflow actions', () => {
  it('offers publish + retract on a draft, and surfaces the tone-review 409 guidance', async () => {
    const user = userEvent.setup();
    renderWithClient(<BannersPage pariwarId={PARIWAR} now={NOW} />);
    await user.click(await screen.findByTestId(`banner-item-${DRAFT.banner_id}`));

    expect(screen.getByTestId('banner-publish')).toBeInTheDocument();
    expect(screen.getByTestId('banner-retract')).toBeInTheDocument();

    await user.click(screen.getByTestId('banner-publish'));
    await waitFor(() => {
      const err = screen.getByTestId('banner-error');
      expect(err).toHaveAttribute('data-code', 'tone_review.required');
      expect(err).toHaveTextContent(/another admin/i);
    });
  });

  it('does NOT offer publish on an already-published banner (mirrors the server legality reducer)', async () => {
    const user = userEvent.setup();
    renderWithClient(<BannersPage pariwarId={PARIWAR} now={NOW} />);
    await user.click(await screen.findByTestId(`banner-item-${LIVE_CRITICAL.banner_id}`));

    expect(screen.queryByTestId('banner-publish')).not.toBeInTheDocument();
    // …but retract IS offered (published → retracted is legal).
    expect(screen.getByTestId('banner-retract')).toBeInTheDocument();
  });

  it('warns that a copy change re-surfaces the banner, but only on a PUBLISHED one', async () => {
    const user = userEvent.setup();
    renderWithClient(<BannersPage pariwarId={PARIWAR} now={NOW} />);

    await user.click(await screen.findByTestId(`banner-item-${DRAFT.banner_id}`));
    expect(screen.queryByTestId('banner-revision-hint')).not.toBeInTheDocument();

    await user.click(screen.getByTestId(`banner-item-${LIVE_CRITICAL.banner_id}`));
    expect(screen.getByTestId('banner-revision-hint')).toHaveTextContent(/re-surfaces this banner/i);
  });

  it('Cancel clears the editor and the surfaced error (the 10.5-reviewed footgun)', async () => {
    const user = userEvent.setup();
    renderWithClient(<BannersPage pariwarId={PARIWAR} now={NOW} />);
    await user.click(await screen.findByTestId(`banner-item-${DRAFT.banner_id}`));
    await user.click(screen.getByTestId('banner-publish'));
    await screen.findByTestId('banner-error');

    await user.click(screen.getByTestId('banner-cancel'));
    expect(screen.queryByTestId('banner-error')).not.toBeInTheDocument();
    expect(screen.queryByTestId('banner-selected-state')).not.toBeInTheDocument();
  });

  it('blocks Create until the window is well-formed (never reaching new Date(""))', async () => {
    const user = userEvent.setup();
    renderWithClient(<BannersPage pariwarId={PARIWAR} now={NOW} />);
    // No dates entered yet → Create is disabled and nothing has thrown.
    expect(await screen.findByTestId('banner-create')).toBeDisabled();

    const from = screen.getByTestId('banner-valid-from-input');
    const until = screen.getByTestId('banner-valid-until-input');
    await user.type(from, '2026-08-10T00:00');
    await user.type(until, '2026-08-01T00:00'); // inverted
    await waitFor(() => expect(screen.getByTestId('banner-window-invalid')).toBeInTheDocument());
    expect(screen.getByTestId('banner-create')).toBeDisabled();

    await user.clear(until);
    await user.type(until, '2026-08-20T00:00');
    await waitFor(() => expect(screen.getByTestId('banner-create')).toBeEnabled());
  });
});
