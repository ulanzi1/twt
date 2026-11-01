// Story 12.2 (AC8) — the partner-offer list: newest first, the state filter, and "Load more" over the opaque cursor.

import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { ModuleSummaryResponse } from '@twt/contracts';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithClient } from './_helpers.js';

const PARIWAR = '11111111-1111-4111-8111-111111111111';

const listModules = vi.fn();
vi.mock('../src/api/client.js', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, listModules: (p: string, o: unknown) => listModules(p, o) };
});

const { ModulesPage } = await import('../src/modules/marketplace/ModulesPage.js');
const { resolveEn: t } = await import('../src/modules/marketplace/i18n-en.js');
const { ApiError } = await import('../src/api/client.js');

function row(n: number, over: Partial<ModuleSummaryResponse> = {}): ModuleSummaryResponse {
  return {
    module_id: `6ba7b810-9dad-41d1-80b4-00c04fd430c${n}`,
    partner_id: '0f8fad5b-d9cb-469f-a165-70867728950e',
    name_en: `Offer ${n}`,
    name_hi: `प्रस्ताव ${n}`,
    current_state: 'draft',
    archive_reason: null,
    valid_from: '2026-11-05T05:00:00.000Z',
    valid_until: '2026-12-05T05:00:00.000Z',
    slot_capacity: null,
    slots_remaining: null,
    created_at: '2026-11-01T00:00:00.000Z',
    ...over,
  };
}

// Braces matter: `mockReset()` RETURNS the mock, and Vitest runs a function returned from `beforeEach` as teardown — which would
// call `listModules(...)` after every test, and surface a rejecting mock as an unhandled rejection (review RP35).
beforeEach(() => {
  listModules.mockReset();
});

describe('ModulesPage (AC8)', () => {
  it('"Load more" passes the previous page’s next_cursor; it disappears on the last page', { timeout: 20_000 }, async () => {
    listModules
      .mockResolvedValueOnce({ items: [row(1), row(2)], next_cursor: 'CURSOR-1' })
      .mockResolvedValueOnce({ items: [row(3)], next_cursor: null });
    const onOpen = vi.fn();
    renderWithClient(<ModulesPage pariwarId={PARIWAR} onNew={vi.fn()} onOpen={onOpen} />);
    expect(await screen.findByText('Offer 1')).toBeInTheDocument();
    expect(listModules).toHaveBeenCalledWith(PARIWAR, {});
    fireEvent.click(screen.getByTestId('modules-more'));
    expect(await screen.findByText('Offer 3')).toBeInTheDocument();
    expect(listModules).toHaveBeenLastCalledWith(PARIWAR, { cursor: 'CURSOR-1' });
    expect(screen.queryByTestId('modules-more')).toBeNull();
    expect(screen.getAllByText(/^Offer \d$/)).toHaveLength(3);
    fireEvent.click(screen.getByTestId(`module-open-${row(3).module_id}`));
    expect(onOpen).toHaveBeenCalledWith(row(3).module_id);
  });

  it('the state filter re-reads from the first page with `state`', { timeout: 20_000 }, async () => {
    listModules.mockResolvedValue({ items: [row(1, { current_state: 'active' })], next_cursor: null });
    renderWithClient(<ModulesPage pariwarId={PARIWAR} onNew={vi.fn()} onOpen={vi.fn()} />);
    expect(await screen.findByTestId(`module-state-${row(1).module_id}`)).toHaveTextContent(t('module.state.active'));
    fireEvent.change(screen.getByTestId('modules-state-filter'), { target: { value: 'active' } });
    await waitFor(() => expect(listModules).toHaveBeenLastCalledWith(PARIWAR, { state: 'active' }));
  });

  it('an empty Pariwar says so', { timeout: 20_000 }, async () => {
    listModules.mockResolvedValue({ items: [], next_cursor: null });
    renderWithClient(<ModulesPage pariwarId={PARIWAR} onNew={vi.fn()} onOpen={vi.fn()} />);
    expect(await screen.findByTestId('modules-empty')).toHaveTextContent(t('module.list.empty'));
    // RP32 / PU2: ONE always-mounted status region holds both the loading and the empty text (neither arrives as its own node).
    expect(screen.getByTestId('modules-status')).toHaveAttribute('role', 'status');
    expect(screen.getByTestId('modules-status')).toContainElement(screen.getByTestId('modules-empty'));
  });

  // The list page keys on the 403 STATUS, not the code, so this does not exercise the `authz.forbidden` mapping — that is pinned
  // in marketplace-derive.test.ts and by the detail page’s first-load test (RP22).
  it('RP35: a non-holder (403) is told they lack permission on the list page', { timeout: 20_000 }, async () => {
    listModules.mockRejectedValue(new ApiError(403, 'authz.forbidden', 'no'));
    renderWithClient(<ModulesPage pariwarId={PARIWAR} onNew={vi.fn()} onOpen={vi.fn()} />);
    expect(await screen.findByTestId('modules-error')).toHaveTextContent(t('module.error.forbidden'));
  });

  it('RP35: a failure that is not an API answer gets the list sentence', { timeout: 20_000 }, async () => {
    listModules.mockImplementation(() => Promise.reject(new TypeError('network')));
    renderWithClient(<ModulesPage pariwarId={PARIWAR} onNew={vi.fn()} onOpen={vi.fn()} />);
    expect(await screen.findByTestId('modules-error')).toHaveTextContent(t('module.list.error'));
  });

  it('RP33: each row’s Open button is named for its offer, and the loading text says so', { timeout: 20_000 }, async () => {
    listModules.mockResolvedValue({ items: [row(1), row(2)], next_cursor: null });
    renderWithClient(<ModulesPage pariwarId={PARIWAR} onNew={vi.fn()} onOpen={vi.fn()} />);
    expect(screen.getByRole('status')).toHaveTextContent(t('module.loading'));
    expect(await screen.findByRole('button', { name: 'Open Offer 1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open Offer 2' })).toBeInTheDocument();
  });
});

describe('ModulesPage — code review round 2 (chunk C)', () => {
  it('RC12: after "Load more", focus moves to the first new row and the new rows are announced', { timeout: 20_000 }, async () => {
    listModules
      .mockResolvedValueOnce({ items: [row(1), row(2)], next_cursor: 'CURSOR-1' })
      .mockResolvedValueOnce({ items: [row(3), row(4)], next_cursor: null });
    renderWithClient(<ModulesPage pariwarId={PARIWAR} onNew={vi.fn()} onOpen={vi.fn()} />);
    const more = await screen.findByTestId('modules-more');
    more.focus();
    fireEvent.click(more);
    await waitFor(() => expect(screen.getByTestId(`module-open-${row(3).module_id}`)).toHaveFocus()); // the button unmounted
    expect(screen.getByTestId('modules-status')).toHaveTextContent(t('module.list.moreShown', { n: 2 }));
    expect(t('module.list.moreShown', { n: 2 })).toBe('2 more offers shown.');
  });

  it('RC12: one new row is "1 more offer shown."', { timeout: 20_000 }, async () => {
    listModules
      .mockResolvedValueOnce({ items: [row(1)], next_cursor: 'CURSOR-1' })
      .mockResolvedValueOnce({ items: [row(2)], next_cursor: 'CURSOR-2' });
    renderWithClient(<ModulesPage pariwarId={PARIWAR} onNew={vi.fn()} onOpen={vi.fn()} />);
    fireEvent.click(await screen.findByTestId('modules-more'));
    await waitFor(() => expect(screen.getByTestId('modules-status')).toHaveTextContent(t('module.list.moreShownOne')));
    expect(t('module.list.moreShownOne')).toBe('1 more offer shown.');
  });

  it('RC12: a failed next page keeps the rows and says so beside "Load more" — not the whole-list error', { timeout: 20_000 }, async () => {
    listModules
      .mockResolvedValueOnce({ items: [row(1), row(2)], next_cursor: 'CURSOR-1' })
      .mockRejectedValueOnce(new ApiError(500, 'internal.error', 'down'));
    renderWithClient(<ModulesPage pariwarId={PARIWAR} onNew={vi.fn()} onOpen={vi.fn()} />);
    fireEvent.click(await screen.findByTestId('modules-more'));
    expect(await screen.findByTestId('modules-more-error')).toHaveTextContent(t('module.list.moreError'));
    expect(screen.getByTestId('modules-more-error')).toHaveAttribute('role', 'alert');
    expect(screen.queryByTestId('modules-error')).toBeNull();
    expect(screen.getAllByText(/^Offer \d$/)).toHaveLength(2);
    expect(screen.getByTestId('modules-more')).toBeEnabled(); // the admin can try again
  });

  it('RC13: an empty result under a state filter says "No offers in this state."', { timeout: 20_000 }, async () => {
    listModules.mockImplementation((_p: string, o: { state?: string }) =>
      Promise.resolve(o.state === undefined ? { items: [row(1)], next_cursor: null } : { items: [], next_cursor: null }),
    );
    renderWithClient(<ModulesPage pariwarId={PARIWAR} onNew={vi.fn()} onOpen={vi.fn()} />);
    await screen.findByText('Offer 1');
    fireEvent.change(screen.getByTestId('modules-state-filter'), { target: { value: 'archived' } });
    expect(await screen.findByTestId('modules-empty')).toHaveTextContent(t('module.list.emptyFiltered'));
    expect(t('module.list.emptyFiltered')).toBe('No offers in this state.');
  });
});

describe('ModulesPage — patch-diff review of round 2 (PT)', () => {
  it('PT2: a page that arrives after the admin moved focus elsewhere does not take it back', { timeout: 20_000 }, async () => {
    let resolveNext: (v: unknown) => void = () => undefined;
    listModules
      .mockResolvedValueOnce({ items: [row(1)], next_cursor: 'CURSOR-1' })
      .mockReturnValueOnce(new Promise((r) => { resolveNext = r; }));
    renderWithClient(<ModulesPage pariwarId={PARIWAR} onNew={vi.fn()} onOpen={vi.fn()} />);
    const more = await screen.findByTestId('modules-more');
    more.focus();
    fireEvent.click(more);
    const filter = screen.getByTestId('modules-state-filter');
    filter.focus(); // the admin moved on while the page loaded
    resolveNext({ items: [row(2)], next_cursor: null });
    await waitFor(() => expect(screen.getByTestId('modules-status')).toHaveTextContent(t('module.list.moreShownOne')));
    expect(filter).toHaveFocus();
  });

  it('PT2: when "Load more" stays (more pages) and still holds focus, focus moves on to the first new row', { timeout: 20_000 }, async () => {
    listModules
      .mockResolvedValueOnce({ items: [row(1)], next_cursor: 'CURSOR-1' })
      .mockResolvedValueOnce({ items: [row(2)], next_cursor: 'CURSOR-2' });
    renderWithClient(<ModulesPage pariwarId={PARIWAR} onNew={vi.fn()} onOpen={vi.fn()} />);
    const more = await screen.findByTestId('modules-more');
    more.focus();
    fireEvent.click(more);
    await waitFor(() => expect(screen.getByTestId(`module-open-${row(2).module_id}`)).toHaveFocus());
    expect(screen.getByTestId('modules-more')).toBeInTheDocument(); // the button did not unmount — it started the action
  });

  it('PT9: an EMPTY last page says "No more offers." and moves focus to the page heading', { timeout: 20_000 }, async () => {
    listModules
      .mockResolvedValueOnce({ items: [row(1)], next_cursor: 'CURSOR-1' })
      .mockResolvedValueOnce({ items: [], next_cursor: null });
    renderWithClient(<ModulesPage pariwarId={PARIWAR} onNew={vi.fn()} onOpen={vi.fn()} />);
    const more = await screen.findByTestId('modules-more');
    more.focus();
    fireEvent.click(more);
    await waitFor(() => expect(screen.getByTestId('modules-status')).toHaveTextContent(t('module.list.noMore')));
    expect(screen.queryByTestId('modules-more')).toBeNull();
    expect(screen.getByRole('heading', { level: 1 })).toHaveFocus();
    expect(t('module.list.noMore')).toBe('No more offers.');
  });
});
