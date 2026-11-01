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

beforeEach(() => listModules.mockReset());

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
  });
});
