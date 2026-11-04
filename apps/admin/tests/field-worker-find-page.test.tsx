// Story 13.1a (Task 9.3; AC11 (c), (d); AD13; review R4) — find a worker and show their code, against a mocked client:
//   · NOTHING loads until a district is chosen; then the `active` list of exactly that district;
//   · "Show code" is a fresh read per click; the digits are large with a spelled-out label and the read-aloud line; ⛔ a clipboard
//     control; the code is cleared on Hide, on another worker, on `visibilitychange` to hidden, on unmount and after 60 s;
//   · R4 — a DEFERRED response that arrives after each of those invalidations never puts digits back;
//   · no cache holds a code afterwards; a 409 `code_not_available` reads by the worker's state;
//   · the "Field workers" nav link renders in the RootLayout inside a Pariwar.

import { QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let params: Record<string, string> = {};
vi.mock('@tanstack/react-router', () => ({
  Link: (p: { children: ReactNode; to: string; 'data-testid'?: string }) => (
    <a href={p.to} data-testid={p['data-testid']}>
      {p.children}
    </a>
  ),
  Outlet: () => null,
  useNavigate: () => vi.fn(),
  useParams: () => params,
  useRouter: () => ({ invalidate: vi.fn() }),
}));

const listFieldWorkers = vi.fn();
const readFieldWorkerCode = vi.fn();
const getFieldWorkerDistricts = vi.fn();
vi.mock('../src/api/client.js', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    getSession: async () => ({ userId: '11111111-1111-4111-8111-111111111111', nationalGrants: [] }),
    listFieldWorkers: (p: string, o: unknown) => listFieldWorkers(p, o),
    readFieldWorkerCode: (p: string, id: string) => readFieldWorkerCode(p, id),
    getFieldWorkerDistricts: (p: string) => getFieldWorkerDistricts(p),
  };
});

const { FindWorkerPage, CODE_VISIBLE_MS } = await import('../src/modules/field-workers/index.js');
const { resolveEn: t } = await import('../src/modules/field-workers/i18n-en.js');
const { ApiError } = await import('../src/api/client.js');
const { createQueryClient } = await import('../src/api/hooks.js');
const { RootLayout } = await import('../src/routes/RootLayout.js');

const P = '11111111-1111-4111-8111-111111111111';
const W1 = '00000000-0000-4000-8000-000000000001';
const W2 = '00000000-0000-4000-8000-000000000002';
const row = (id: string, name: string) => ({
  field_worker_id: id,
  name,
  district: 'Patna',
  current_state: 'active',
  kyc_status: 'completed',
  registered_by_display: 'Asha Verma',
  created_at: '2026-11-04T05:00:00.000Z',
});

function deferred<T>(): { promise: Promise<T>; resolve: (v: T) => void } {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

function setVisibility(state: 'visible' | 'hidden'): void {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });
  document.dispatchEvent(new Event('visibilitychange'));
}

async function renderWithDistrict() {
  const qc = createQueryClient();
  const view = render(
    <QueryClientProvider client={qc}>
      <FindWorkerPage pariwarId={P} />
    </QueryClientProvider>,
  );
  await screen.findByRole('option', { name: 'Patna' });
  const select = screen.getByTestId('fw-find-district') as HTMLSelectElement;
  fireEvent.change(select, { target: { value: [...select.options].find((o) => o.textContent === 'Patna')!.value } });
  await screen.findByText('Ramesh Kumar');
  return { qc, ...view };
}
const showButtons = (): HTMLElement[] => screen.getAllByTestId('fw-code-show');
/** The "Show code" button of ONE worker's row (a loading reveal keeps its — disabled — button). */
const showFor = (id: string): HTMLElement => within(screen.getByTestId(`fw-code-${id}`)).getByTestId('fw-code-show');
const digits = (): string | null => screen.queryByTestId('fw-code-digits')?.textContent ?? null;

beforeEach(() => {
  for (const fn of [listFieldWorkers, readFieldWorkerCode, getFieldWorkerDistricts]) fn.mockReset();
  getFieldWorkerDistricts.mockResolvedValue({ districts: ['Gaya', 'Patna'], districts_truncated: false });
  listFieldWorkers.mockResolvedValue({ items: [row(W1, 'Ramesh Kumar'), row(W2, 'Sita Devi')], next_cursor: null });
  readFieldWorkerCode.mockImplementation(async (_p: string, id: string) => ({ field_worker_id: id, code: id === W1 ? '042719' : '555123' }));
  setVisibility('visible');
});
afterEach(() => {
  vi.useRealTimers();
});

describe('the finder', () => {
  it('NOTHING loads until a district is chosen; then the ACTIVE list of exactly that district', async () => {
    const qc = createQueryClient();
    render(
      <QueryClientProvider client={qc}>
        <FindWorkerPage pariwarId={P} />
      </QueryClientProvider>,
    );
    expect((await screen.findByTestId('fw-find-choose')).textContent).toBe(t('fw.find.chooseFirst'));
    await screen.findByRole('option', { name: 'Patna' });
    expect(listFieldWorkers).not.toHaveBeenCalled();
    const select = screen.getByTestId('fw-find-district') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: [...select.options].find((o) => o.textContent === 'Patna')!.value } });
    await screen.findByText('Ramesh Kumar');
    expect(listFieldWorkers).toHaveBeenCalledWith(P, { state: 'active', district: 'Patna' });
    expect(screen.getByTestId('fw-nav-register')).toBeTruthy();
    expect(screen.getByTestId('fw-nav-approvals')).toBeTruthy();
  });

  it('a 403 on a district ⇒ "choose a district you manage"', async () => {
    listFieldWorkers.mockRejectedValue(new ApiError(403, 'auth.forbidden', 'no'));
    const qc = createQueryClient();
    render(
      <QueryClientProvider client={qc}>
        <FindWorkerPage pariwarId={P} />
      </QueryClientProvider>,
    );
    await screen.findByRole('option', { name: 'Gaya' });
    const select = screen.getByTestId('fw-find-district') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: [...select.options].find((o) => o.textContent === 'Gaya')!.value } });
    expect((await screen.findByTestId('fw-find-list-error')).textContent).toContain(t('fw.noAccessDistrict'));
  });
});

describe('Show code (AD13)', () => {
  it('a fresh read per click; large digits with a spelled label and the read-aloud line; ⛔ a clipboard control; Hide clears', async () => {
    await renderWithDistrict();
    fireEvent.click(showButtons()[0]!);
    await waitFor(() => expect(digits()).toBe('042719'));
    const el = screen.getByTestId('fw-code-digits');
    expect(el.getAttribute('aria-label')).toBe(t('fw.code.label', { spelled: '0 4 2 7 1 9' }));
    expect(screen.getByText(t('fw.code.readAloud'))).toBeTruthy();
    expect(screen.queryByRole('button', { name: /copy/i })).toBeNull();
    expect(document.body.innerHTML).not.toMatch(/clipboard/i);
    fireEvent.click(screen.getByTestId('fw-code-hide'));
    expect(digits()).toBeNull();
    fireEvent.click(showButtons()[0]!);
    await waitFor(() => expect(digits()).toBe('042719'));
    expect(readFieldWorkerCode).toHaveBeenCalledTimes(2);
  });

  it('cleared when ANOTHER worker’s code is asked for, on visibilitychange to hidden, and on unmount; nothing is cached', async () => {
    const { qc, unmount } = await renderWithDistrict();
    fireEvent.click(showButtons()[0]!);
    await waitFor(() => expect(digits()).toBe('042719'));
    fireEvent.click(showButtons()[0]!); // the only "Show code" left is W2's
    await waitFor(() => expect(digits()).toBe('555123'));
    expect(screen.queryByText('042719')).toBeNull();
    act(() => setVisibility('hidden'));
    expect(digits()).toBeNull();
    setVisibility('visible');
    fireEvent.click(showButtons()[0]!);
    await waitFor(() => expect(digits()).not.toBeNull());
    expect(JSON.stringify(qc.getQueryCache().getAll().map((q) => q.state.data))).not.toMatch(/042719|555123/);
    unmount();
    expect(document.body.innerHTML).not.toMatch(/042719|555123/);
  });

  it('cleared after 60 seconds (fake timers)', async () => {
    await renderWithDistrict();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    fireEvent.click(showButtons()[0]!);
    await waitFor(() => expect(digits()).toBe('042719'));
    // A one-second margin each side: `shouldAdvanceTime` also moves the fake clock with real time (the `waitFor` above).
    act(() => {
      vi.advanceTimersByTime(CODE_VISIBLE_MS - 1000);
    });
    expect(digits()).toBe('042719');
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(digits()).toBeNull();
  });

  it('409 code_not_available reads by the worker’s state', async () => {
    readFieldWorkerCode.mockRejectedValueOnce(new ApiError(409, 'field_worker.code_not_available', 'no', { current_state: 'suspended' }));
    await renderWithDistrict();
    fireEvent.click(showButtons()[0]!);
    expect((await screen.findByTestId('fw-code-refused')).textContent).toBe(t('fw.code.suspended'));
    expect(digits()).toBeNull();
  });
});

describe('R4 — a late answer never restores a cleared code', () => {
  it.each([
    ['Hide', () => fireEvent.click(screen.getByTestId('fw-code-hide'))],
    ['visibilitychange to hidden', () => setVisibility('hidden')],
  ])('a deferred answer after %s is dropped', async (_label, invalidate) => {
    await renderWithDistrict();
    // First show and hide-able state: an answer is shown, then a SECOND read is held in flight.
    fireEvent.click(showButtons()[0]!);
    await waitFor(() => expect(digits()).toBe('042719'));
    fireEvent.click(screen.getByTestId('fw-code-hide'));
    const d = deferred<{ field_worker_id: string; code: string }>();
    readFieldWorkerCode.mockReturnValueOnce(d.promise);
    fireEvent.click(showFor(W1));
    expect(screen.getAllByText(t('fw.code.loading')).length).toBeGreaterThan(0);
    if (_label === 'Hide') {
      // While loading there is no Hide button — "Hide" here is another clear: asking for the other worker.
      fireEvent.click(showFor(W2));
      await waitFor(() => expect(digits()).toBe('555123'));
      fireEvent.click(screen.getByTestId('fw-code-hide'));
    } else {
      act(() => invalidate());
      setVisibility('visible');
    }
    await act(async () => d.resolve({ field_worker_id: W1, code: '999999' }));
    expect(screen.queryByText('999999')).toBeNull();
    expect(digits()).toBeNull();
  });

  it('a deferred answer after the worker is switched, and after unmount, is dropped', async () => {
    const { unmount } = await renderWithDistrict();
    const d1 = deferred<{ field_worker_id: string; code: string }>();
    readFieldWorkerCode.mockReturnValueOnce(d1.promise);
    fireEvent.click(showFor(W1)); // W1 in flight
    fireEvent.click(showFor(W2)); // W2 — W1's reveal is no longer current
    await waitFor(() => expect(digits()).toBe('555123'));
    await act(async () => d1.resolve({ field_worker_id: W1, code: '111111' }));
    expect(screen.queryByText('111111')).toBeNull();
    expect(digits()).toBe('555123');
    // Unmount with a read in flight: the answer lands nowhere (no state update on an unmounted reveal).
    fireEvent.click(screen.getByTestId('fw-code-hide'));
    const d2 = deferred<{ field_worker_id: string; code: string }>();
    readFieldWorkerCode.mockReturnValueOnce(d2.promise);
    fireEvent.click(showFor(W2));
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    unmount();
    await act(async () => d2.resolve({ field_worker_id: W2, code: '222222' }));
    expect(document.body.innerHTML).not.toContain('222222');
    expect(error).not.toHaveBeenCalled();
    error.mockRestore();
  });
});

describe('the nav (AC11 (d))', () => {
  it('a "Field workers" link renders in the TopBar inside a Pariwar', async () => {
    params = { pariwarId: P };
    const qc = createQueryClient();
    render(
      <QueryClientProvider client={qc}>
        <RootLayout />
      </QueryClientProvider>,
    );
    const link = await screen.findByTestId('nav-field-workers');
    expect(link.textContent).toBe(t('fw.nav'));
    expect(link.getAttribute('href')).toBe('/p/$pariwarId/field-workers');
    params = {};
  });
});
