// Story 13.1a (Task 9.3; AC11 (b), (d); AD12; TR5, TR12) — the awaiting-approval page against a mocked client (the real `ApiError`):
//   · the district DEFAULT is "All districts" (the list asks with no district); a District Admin's 403 there reads "choose a district
//     you manage"; choosing one asks for it, exactly;
//   · "Review" opens the audited identity panel (name, full mobile); closing it REMOVES the identity from the cache;
//   · "Approve" mints a key PER CLICK and sends it; a retryable failure keeps the key for "Try again" on THAT worker; success
//     announces, closes the panel and refreshes the list; 409 illegal_transition reads "already approved or no longer awaiting";
//   · "Load more" moves focus to the first new row; the empty state says so; the page links to the other two pages.
// Code review round 2 (CR2-CR6, CR9, CR10, CR12, CR13): no audited read without an admin act (focus / reconnect); the typed district
// is committed on blur / Enter; a failed next page or refresh keeps the rows; a 401 goes to sign-in; an approval that finishes late
// never closes ANOTHER worker's panel; focus returns to Review on close; a district change drops a "Load more" answer in flight.

import { QueryClient, QueryClientProvider, focusManager, onlineManager } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const navigate = vi.fn();
vi.mock('@tanstack/react-router', () => ({
  Link: (p: { children: ReactNode; to: string; 'data-testid'?: string }) => (
    <a href={p.to} data-testid={p['data-testid']}>
      {p.children}
    </a>
  ),
  useNavigate: () => navigate,
}));

const listFieldWorkers = vi.fn();
const getFieldWorkerIdentity = vi.fn();
const approveFieldWorker = vi.fn();
const getFieldWorkerDistricts = vi.fn();
vi.mock('../src/api/client.js', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    listFieldWorkers: (p: string, o: unknown) => listFieldWorkers(p, o),
    getFieldWorkerIdentity: (p: string, id: string) => getFieldWorkerIdentity(p, id),
    approveFieldWorker: (p: string, id: string, k: string) => approveFieldWorker(p, id, k),
    getFieldWorkerDistricts: (p: string) => getFieldWorkerDistricts(p),
  };
});

const { ApprovalsPage } = await import('../src/modules/field-workers/index.js');
const { resolveEn: t } = await import('../src/modules/field-workers/i18n-en.js');
const { ApiError } = await import('../src/api/client.js');
const { createQueryClient } = await import('../src/api/hooks.js');

const P = '11111111-1111-4111-8111-111111111111';
const item = (n: number, name = `Worker ${n}`) => ({
  field_worker_id: `00000000-0000-4000-8000-00000000000${n}`,
  name,
  district: 'Patna',
  current_state: 'pending_kyc',
  kyc_status: 'pending',
  registered_by_display: 'Asha Verma',
  created_at: '2026-11-04T05:00:00.000Z',
});
const NAMES: Record<number, string> = { 1: 'Ramesh Kumar', 2: 'Sita Devi' };
const identityOf = (n: number) => ({ ...item(n, NAMES[n]), mobile: `+9198765000${n}0`, approved_by_display: null });

function deferred<T>(): { promise: Promise<T>; resolve: (v: T) => void; reject: (e: unknown) => void } {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}
const approved = (n: number) => ({ field_worker_id: item(n).field_worker_id, district: 'Patna', current_state: 'active', kyc_status: 'completed' });

function renderPage(qc: QueryClient = createQueryClient()) {
  render(
    <QueryClientProvider client={qc}>
      <ApprovalsPage pariwarId={P} />
    </QueryClientProvider>,
  );
  return qc;
}

/** A client that NEVER garbage-collects: only an explicit removal can take the identity out of its cache (review CR16 (c)). */
const keepingClient = (): QueryClient => new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
const identityEntries = (qc: QueryClient) => qc.getQueryCache().findAll({ queryKey: ['field-workers', P, 'identity'] });

/** Choose a district in the select by its text. */
async function chooseDistrict(name: string): Promise<void> {
  await screen.findByRole('option', { name });
  const select = screen.getByTestId('fw-approvals-district') as HTMLSelectElement;
  fireEvent.change(select, { target: { value: [...select.options].find((o) => o.textContent === name)!.value } });
}
/** Press "Review" on the n-th row and wait for that worker's identity (the mobile is `+9198765000<n>0`). */
async function openReview(index: number, mobile: string): Promise<void> {
  fireEvent.click((await screen.findAllByTestId('fw-approvals-review'))[index]!);
  await waitFor(() => expect(screen.getByTestId('fw-detail-mobile').textContent).toBe(mobile));
}

beforeEach(() => {
  navigate.mockReset();
  for (const fn of [listFieldWorkers, getFieldWorkerIdentity, approveFieldWorker, getFieldWorkerDistricts]) fn.mockReset();
  getFieldWorkerDistricts.mockResolvedValue({ districts: ['Gaya', 'Patna'], districts_truncated: false });
  listFieldWorkers.mockResolvedValue({ items: [item(1, 'Ramesh Kumar'), item(2, 'Sita Devi')], next_cursor: null });
  getFieldWorkerIdentity.mockImplementation(async (_p: string, id: string) => identityOf(Number(id.slice(-1))));
});

afterEach(() => {
  act(() => {
    focusManager.setFocused(undefined);
    onlineManager.setOnline(true);
  });
});

describe('the list and the district choice', () => {
  it('defaults to ALL districts (no district sent) and lists the pending workers with names; links to the other two pages', async () => {
    renderPage();
    expect(await screen.findByText('Ramesh Kumar')).toBeTruthy();
    expect(listFieldWorkers).toHaveBeenCalledWith(P, { state: 'pending_kyc' });
    expect(screen.getByTestId('fw-nav-register')).toBeTruthy();
    expect(screen.getByTestId('fw-nav-find')).toBeTruthy();
    expect(screen.queryByTestId('fw-nav-approvals')).toBeNull();
  });

  it('a 403 with "All districts" ⇒ "choose a district you manage"; choosing a district asks for it exactly', async () => {
    listFieldWorkers.mockRejectedValueOnce(new ApiError(403, 'auth.forbidden', 'no'));
    renderPage();
    expect((await screen.findByTestId('fw-approvals-list-error')).textContent).toContain(t('fw.noAccessDistrict'));
    const select = screen.getByTestId('fw-approvals-district') as HTMLSelectElement;
    await screen.findByRole('option', { name: 'Patna' });
    fireEvent.change(select, { target: { value: [...select.options].find((o) => o.textContent === 'Patna')!.value } });
    await waitFor(() => expect(listFieldWorkers).toHaveBeenLastCalledWith(P, { state: 'pending_kyc', district: 'Patna' }));
  });

  it('the empty state says so', async () => {
    listFieldWorkers.mockResolvedValue({ items: [], next_cursor: null });
    renderPage();
    expect((await screen.findByTestId('fw-approvals-list-empty')).textContent).toBe(t('fw.approvals.empty'));
  });

  it('"Load more" asks with the cursor and moves focus to the first NEW row’s action, announcing the count', async () => {
    listFieldWorkers.mockResolvedValueOnce({ items: [item(1)], next_cursor: 'c1' }).mockResolvedValueOnce({ items: [item(2), item(3)], next_cursor: null });
    renderPage();
    const more = await screen.findByTestId('fw-approvals-list-more');
    more.focus();
    fireEvent.click(more);
    await waitFor(() => expect(document.activeElement?.getAttribute('aria-label')).toBe(t('fw.approvals.reviewNamed', { name: 'Worker 2' })));
    expect(listFieldWorkers).toHaveBeenLastCalledWith(P, { state: 'pending_kyc', cursor: 'c1' });
    expect(screen.getByText(t('fw.list.moreShown', { n: 2 }))).toBeTruthy();
  });
});

describe('Review and Approve', () => {
  it('Review opens the identity (name, FULL mobile); closing it REMOVES the identity from the cache', async () => {
    // A client with an infinite gcTime: the removal is the page's own act (with `gcTime: 0` this would pass without it).
    const qc = keepingClient();
    renderPage(qc);
    fireEvent.click((await screen.findAllByTestId('fw-approvals-review'))[0]!);
    expect((await screen.findByTestId('fw-detail-mobile')).textContent).toBe('+919876500010');
    expect(getFieldWorkerIdentity).toHaveBeenCalledWith(P, item(1).field_worker_id);
    expect(identityEntries(qc)).toHaveLength(1); // NON-VACUITY: held while the panel is open
    fireEvent.click(screen.getByTestId('fw-detail-close'));
    await waitFor(() => expect(screen.queryByTestId('fw-detail')).toBeNull());
    expect(identityEntries(qc)).toHaveLength(0);
    expect(JSON.stringify(qc.getQueryCache().getAll().map((q) => q.state.data))).not.toContain('+919876500010');
  });

  // Found while rebuilding the Find screen (CR1): "Review" pressed on the worker whose panel is ALREADY open ran the explicit
  // removal on that worker's identity and left the panel mounted — the next render rebuilt the query and read it again (a second
  // audited, decrypting read nobody asked for). The Find page has had the guard from the start; this is the same proof.
  it('Review pressed again on the worker whose panel is already open changes nothing: still ONE identity read, the panel keeps its data and the cache keeps the identity', async () => {
    const qc = keepingClient();
    renderPage(qc);
    await openReview(0, '+919876500010');
    expect(getFieldWorkerIdentity).toHaveBeenCalledTimes(1);
    expect(identityEntries(qc)).toHaveLength(1);
    fireEvent.click(screen.getAllByTestId('fw-approvals-review')[0]!);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 30));
    });
    expect(getFieldWorkerIdentity).toHaveBeenCalledTimes(1); // NON-VACUITY lives in the first assertion: the read happened once before
    expect(screen.getByTestId('fw-detail-mobile').textContent).toBe('+919876500010');
    expect(identityEntries(qc)).toHaveLength(1);
  });

  it('a successful approval REMOVES the identity too, and so does choosing another worker or another district', async () => {
    const qc = keepingClient();
    renderPage(qc);
    await openReview(0, '+919876500010');
    approveFieldWorker.mockResolvedValueOnce(approved(1));
    fireEvent.click(screen.getByTestId('fw-approvals-approve'));
    await waitFor(() => expect(screen.queryByTestId('fw-detail')).toBeNull());
    expect(identityEntries(qc)).toHaveLength(0);
    // Another worker: the previous identity goes, the new one is held.
    listFieldWorkers.mockResolvedValue({ items: [item(1, 'Ramesh Kumar'), item(2, 'Sita Devi')], next_cursor: null });
    await openReview(0, '+919876500010');
    expect(identityEntries(qc)).toHaveLength(1);
    fireEvent.click(screen.getAllByTestId('fw-approvals-review')[1]!);
    await waitFor(() => expect(screen.getByTestId('fw-detail-mobile').textContent).toBe('+919876500020'));
    expect(identityEntries(qc).map((q) => q.queryKey[3])).toEqual([item(2).field_worker_id]);
    // Another district: the panel closes and its identity goes.
    await chooseDistrict('Patna');
    await waitFor(() => expect(screen.queryByTestId('fw-detail')).toBeNull());
    expect(identityEntries(qc)).toHaveLength(0);
  });

  it('Approve mints a key PER CLICK; a retryable failure keeps it for "Try again"; success announces, closes and refreshes the list', async () => {
    renderPage();
    fireEvent.click((await screen.findAllByTestId('fw-approvals-review'))[0]!);
    await screen.findByTestId('fw-detail-mobile');
    approveFieldWorker.mockRejectedValueOnce(new ApiError(409, 'field_worker.idempotency_in_progress', 'busy'));
    fireEvent.click(screen.getByTestId('fw-approvals-approve'));
    expect((await screen.findByTestId('fw-approvals-error')).textContent).toBe(t('fw.err.inProgress'));
    // The name CONTAINS the visible text (label-in-name, review CR6): "Try again" + the hidden suffix.
    expect(screen.getByRole('button', { name: `${t('fw.retry')} ${t('fw.forName', { name: 'Ramesh Kumar' })}` })).toBe(screen.getByTestId('fw-approvals-approve'));
    expect(screen.getByTestId('fw-approvals-approve').textContent).toBe(`${t('fw.retry')} ${t('fw.forName', { name: 'Ramesh Kumar' })}`);
    approveFieldWorker.mockResolvedValueOnce({ field_worker_id: item(1).field_worker_id, district: 'Patna', current_state: 'active', kyc_status: 'completed' });
    listFieldWorkers.mockResolvedValue({ items: [item(2, 'Sita Devi')], next_cursor: null });
    fireEvent.click(screen.getByTestId('fw-approvals-approve'));
    expect((await screen.findByTestId('fw-approvals-announce')).textContent).toBe(t('fw.approvals.approved', { name: 'Ramesh Kumar' }));
    const [k1, k2] = approveFieldWorker.mock.calls.map((c) => c[2] as string);
    expect(k2).toBe(k1); // the retry of the SAME click
    expect(approveFieldWorker.mock.calls[0]!.slice(0, 2)).toEqual([P, item(1).field_worker_id]);
    expect(screen.queryByTestId('fw-detail')).toBeNull();
    await waitFor(() => expect(screen.queryByText('Ramesh Kumar')).toBeNull());
    // A NEW click (another worker) mints a NEW key.
    fireEvent.click((await screen.findAllByTestId('fw-approvals-review'))[0]!);
    await screen.findByTestId('fw-detail-mobile');
    approveFieldWorker.mockResolvedValueOnce({ field_worker_id: item(2).field_worker_id, district: 'Patna', current_state: 'active', kyc_status: 'completed' });
    fireEvent.click(screen.getByTestId('fw-approvals-approve'));
    await waitFor(() => expect(approveFieldWorker).toHaveBeenCalledTimes(3));
    expect(approveFieldWorker.mock.calls[2]![2]).not.toBe(k1);
  });

  it('409 illegal_transition ⇒ "already approved or no longer awaiting"; a non-retryable failure drops the key (the next click is a new one)', async () => {
    renderPage();
    fireEvent.click((await screen.findAllByTestId('fw-approvals-review'))[0]!);
    await screen.findByTestId('fw-detail-mobile');
    approveFieldWorker.mockRejectedValueOnce(new ApiError(409, 'field_worker.illegal_transition', 'no'));
    fireEvent.click(screen.getByTestId('fw-approvals-approve'));
    expect((await screen.findByTestId('fw-approvals-error')).textContent).toBe(t('fw.approvals.alreadyDone'));
    approveFieldWorker.mockRejectedValueOnce(new ApiError(403, 'auth.forbidden', 'no'));
    fireEvent.click(screen.getByTestId('fw-approvals-approve'));
    expect((await screen.findByTestId('fw-approvals-error')).textContent).toBe(t('fw.noAccess'));
    expect(approveFieldWorker.mock.calls[1]![2]).not.toBe(approveFieldWorker.mock.calls[0]![2]);
  });
});

describe('CR2 — no audited read without an admin act', () => {
  it('a window focus and a reconnect re-read NEITHER the list NOR the identity (each read is decrypted and audited)', async () => {
    renderPage();
    await openReview(0, '+919876500010');
    expect(listFieldWorkers).toHaveBeenCalledTimes(1);
    expect(getFieldWorkerIdentity).toHaveBeenCalledTimes(1);
    const districtReads = getFieldWorkerDistricts.mock.calls.length;

    act(() => {
      focusManager.setFocused(false);
      focusManager.setFocused(true);
      onlineManager.setOnline(false);
      onlineManager.setOnline(true);
    });

    // NON-VACUITY: the events really fired — the keyless districts read (TanStack defaults) went again.
    await waitFor(() => expect(getFieldWorkerDistricts.mock.calls.length).toBeGreaterThan(districtReads));
    expect(listFieldWorkers).toHaveBeenCalledTimes(1);
    expect(getFieldWorkerIdentity).toHaveBeenCalledTimes(1);
  });
});

describe('CR3 — the typed district on the awaiting-approval page', () => {
  beforeEach(() => {
    getFieldWorkerDistricts.mockResolvedValue({ districts: ['Nagpur', 'Patna'], districts_truncated: true });
  });
  const districtsAsked = (): (string | undefined)[] => listFieldWorkers.mock.calls.map((c) => (c[1] as { district?: string }).district);

  it('typing "Nagpur Rural" (Nagpur is LISTED) keeps every character; nothing is asked until blur; then exactly ONE request with the byte-exact text', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Ramesh Kumar');
    const typed = (await screen.findByTestId('fw-approvals-district-typed')) as HTMLInputElement;
    await user.type(typed, 'Nagpur Rural');
    expect(typed.value).toBe('Nagpur Rural');
    expect(districtsAsked()).toEqual([undefined]); // only the initial all-districts read
    await user.tab();
    await waitFor(() => expect(listFieldWorkers).toHaveBeenCalledTimes(2));
    expect(listFieldWorkers).toHaveBeenLastCalledWith(P, { state: 'pending_kyc', district: 'Nagpur Rural' });
    expect(typed.value).toBe('Nagpur Rural');
    expect(districtsAsked()).toEqual([undefined, 'Nagpur Rural']); // no "N", "Na", "Nag" ... in between
  });

  it('Enter commits too; a later blur with nothing new typed asks nothing more', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Ramesh Kumar');
    await user.type(await screen.findByTestId('fw-approvals-district-typed'), 'Nagpur Rural{Enter}');
    await waitFor(() => expect(listFieldWorkers).toHaveBeenCalledTimes(2));
    expect(districtsAsked()).toEqual([undefined, 'Nagpur Rural']);
    await user.tab();
    expect(listFieldWorkers).toHaveBeenCalledTimes(2);
  });

  it('CR13 — a typed district "*" is its own list, never the all-districts entry', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Ramesh Kumar');
    listFieldWorkers.mockResolvedValueOnce({ items: [item(3, 'Star Worker')], next_cursor: null });
    await user.type(await screen.findByTestId('fw-approvals-district-typed'), '*{Enter}');
    expect(await screen.findByText('Star Worker')).toBeTruthy();
    expect(listFieldWorkers).toHaveBeenLastCalledWith(P, { state: 'pending_kyc', district: '*' });
    expect(screen.queryByText('Ramesh Kumar')).toBeNull();
  });
});

describe('CR13 — the list key cannot collide', () => {
  it('"all districts" and a district called "*" are different keys', async () => {
    const { fieldWorkersListKey } = await import('../src/api/hooks.js');
    const all = fieldWorkersListKey(P, 'pending_kyc', null);
    const star = fieldWorkersListKey(P, 'pending_kyc', '*');
    expect(JSON.stringify(all)).not.toBe(JSON.stringify(star));
    expect(JSON.stringify(fieldWorkersListKey(P, 'pending_kyc', 'all'))).not.toBe(JSON.stringify(all));
    expect(JSON.stringify(fieldWorkersListKey(P, 'pending_kyc', 'Patna'))).not.toBe(JSON.stringify(fieldWorkersListKey(P, 'active', 'Patna')));
  });
});

describe('CR4 — a failed page never replaces the rows the admin already has', () => {
  it('a failed "Load more" keeps the rows and the button, says so beside it, and the next click appends', async () => {
    listFieldWorkers.mockResolvedValueOnce({ items: [item(1, 'Ramesh Kumar')], next_cursor: 'c1' });
    renderPage();
    const more = await screen.findByTestId('fw-approvals-list-more');
    listFieldWorkers.mockRejectedValueOnce(new ApiError(503, 'field_worker.decrypt_unavailable', 'down'));
    fireEvent.click(more);
    expect((await screen.findByTestId('fw-approvals-list-more-error')).textContent).toBe(t('fw.list.moreError'));
    expect(screen.getByText('Ramesh Kumar')).toBeTruthy();
    expect(screen.queryByTestId('fw-approvals-list-error')).toBeNull(); // not the whole-list error block
    expect(screen.getByTestId('fw-approvals-list-more')).toBeTruthy();
    listFieldWorkers.mockResolvedValueOnce({ items: [item(2, 'Sita Devi')], next_cursor: null });
    fireEvent.click(screen.getByTestId('fw-approvals-list-more'));
    expect(await screen.findByText('Sita Devi')).toBeTruthy();
    expect(screen.getByText('Ramesh Kumar')).toBeTruthy();
    expect(screen.queryByTestId('fw-approvals-list-more-error')).toBeNull();
    expect(listFieldWorkers).toHaveBeenLastCalledWith(P, { state: 'pending_kyc', cursor: 'c1' });
  });

  it('a failed REFRESH keeps the rows, says the list may be out of date and offers Try again', async () => {
    renderPage();
    await openReview(0, '+919876500010');
    approveFieldWorker.mockResolvedValueOnce(approved(1));
    listFieldWorkers.mockRejectedValueOnce(new ApiError(503, 'field_worker.decrypt_unavailable', 'down')); // the refresh after the approval
    fireEvent.click(screen.getByTestId('fw-approvals-approve'));
    const alert = await screen.findByTestId('fw-approvals-list-refresh-error');
    expect(within(alert).getByText(t('fw.list.refreshError'))).toBeTruthy();
    expect(screen.getByText('Ramesh Kumar')).toBeTruthy(); // the rows are still there
    expect(screen.getByText('Sita Devi')).toBeTruthy();
    listFieldWorkers.mockResolvedValueOnce({ items: [item(2, 'Sita Devi')], next_cursor: null });
    fireEvent.click(within(alert).getByRole('button', { name: t('fw.retry') }));
    await waitFor(() => expect(screen.queryByTestId('fw-approvals-list-refresh-error')).toBeNull());
    expect(screen.queryByText('Ramesh Kumar')).toBeNull();
  });

  it('a FIRST read that fails (no rows to keep) shows the error block with Try again', async () => {
    listFieldWorkers.mockRejectedValueOnce(new ApiError(429, 'http.429', 'slow down'));
    renderPage();
    const block = await screen.findByTestId('fw-approvals-list-error');
    expect(block.textContent).toContain(t('fw.err.rateLimited'));
    fireEvent.click(within(block).getByRole('button', { name: t('fw.retry') }));
    expect(await screen.findByText('Ramesh Kumar')).toBeTruthy();
    expect(screen.queryByTestId('fw-approvals-list-error')).toBeNull();
  });
});

describe('CR5 — a 401 goes to sign-in, on every surface', () => {
  const expired = () => new ApiError(401, 'auth.session_required', 'no');

  it('the list', async () => {
    listFieldWorkers.mockRejectedValue(expired());
    renderPage();
    expect((await screen.findByTestId('fw-approvals-list-error')).textContent).toContain(t('fw.signIn'));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: '/login' }));
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it('the identity panel', async () => {
    getFieldWorkerIdentity.mockRejectedValue(expired());
    renderPage();
    fireEvent.click((await screen.findAllByTestId('fw-approvals-review'))[0]!);
    expect((await screen.findByTestId('fw-detail-error')).textContent).toBe(t('fw.signIn'));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: '/login' }));
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it('Approve', async () => {
    renderPage();
    await openReview(0, '+919876500010');
    approveFieldWorker.mockRejectedValueOnce(expired());
    fireEvent.click(screen.getByTestId('fw-approvals-approve'));
    expect((await screen.findByTestId('fw-approvals-error')).textContent).toBe(t('fw.signIn'));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: '/login' }));
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it('NON-VACUITY: a 403 on the same surfaces does not navigate', async () => {
    renderPage();
    await openReview(0, '+919876500010');
    approveFieldWorker.mockRejectedValueOnce(new ApiError(403, 'auth.forbidden', 'no'));
    fireEvent.click(screen.getByTestId('fw-approvals-approve'));
    await screen.findByTestId('fw-approvals-error');
    expect(navigate).not.toHaveBeenCalled();
  });
});

describe('CR9 — an approval that finishes late', () => {
  it('A finishes late while B’s panel is open: B’s panel stays, A is announced, focus is NOT stolen to the heading', async () => {
    renderPage();
    await openReview(0, '+919876500010');
    const d = deferred<ReturnType<typeof approved>>();
    approveFieldWorker.mockReturnValueOnce(d.promise);
    fireEvent.click(screen.getByTestId('fw-approvals-approve'));
    expect(screen.getByRole('button', { name: `${t('fw.approvals.approving')} ${t('fw.forName', { name: 'Ramesh Kumar' })}` })).toBeTruthy();
    fireEvent.click(screen.getAllByTestId('fw-approvals-review')[1]!); // the admin moves on to B
    await waitFor(() => expect(screen.getByTestId('fw-detail-mobile').textContent).toBe('+919876500020'));
    listFieldWorkers.mockResolvedValue({ items: [item(2, 'Sita Devi')], next_cursor: null });

    await act(async () => d.resolve(approved(1)));

    expect((await screen.findByTestId('fw-approvals-announce')).textContent).toBe(t('fw.approvals.approved', { name: 'Ramesh Kumar' }));
    expect(screen.getByTestId('fw-detail-mobile').textContent).toBe('+919876500020'); // B’s panel is still open
    expect(document.activeElement).not.toBe(screen.getByRole('heading', { level: 1 }));
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: t('fw.detail.title') })); // where B’s panel put it
    expect((screen.getByTestId('fw-approvals-approve') as HTMLButtonElement).disabled).toBe(false);
    // The identity of the approved worker left the cache (the explicit removal), and the list was refreshed.
    await waitFor(() => expect(screen.queryByText('Ramesh Kumar')).toBeNull());
  });

  it('A fails late while B’s panel is open: the failure is said in a banner by the list, B’s panel shows no problem, focus stays', async () => {
    renderPage();
    await openReview(0, '+919876500010');
    const d = deferred<never>();
    approveFieldWorker.mockReturnValueOnce(d.promise);
    fireEvent.click(screen.getByTestId('fw-approvals-approve'));
    fireEvent.click(screen.getAllByTestId('fw-approvals-review')[1]!);
    await waitFor(() => expect(screen.getByTestId('fw-detail-mobile').textContent).toBe('+919876500020'));

    await act(async () => d.reject(new ApiError(503, 'field_worker.decrypt_unavailable', 'down')));

    const banner = await screen.findByTestId('fw-approvals-banner-error');
    expect(banner.getAttribute('role')).toBe('alert');
    expect(banner.textContent).toBe(t('fw.approvals.failedNamed', { name: 'Ramesh Kumar', reason: t('fw.list.keyUnavailable') }));
    expect(screen.queryByTestId('fw-approvals-error')).toBeNull(); // nothing in B’s panel
    expect(screen.getByTestId('fw-detail-mobile').textContent).toBe('+919876500020');
    expect(document.activeElement).not.toBe(screen.getByRole('heading', { level: 1 }));
  });

  it('the open worker’s failure moves focus to the heading (AC11 (d)) and is said IN the panel, not in a banner', async () => {
    renderPage();
    await openReview(0, '+919876500010');
    approveFieldWorker.mockRejectedValueOnce(new ApiError(503, 'field_worker.decrypt_unavailable', 'down'));
    fireEvent.click(screen.getByTestId('fw-approvals-approve'));
    expect((await screen.findByTestId('fw-approvals-error')).textContent).toBe(t('fw.list.keyUnavailable'));
    expect(screen.queryByTestId('fw-approvals-banner-error')).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('heading', { level: 1 }));
  });

  it('the button leaves "Approving…" and the approval is announced when it COMMITS — even if the list refresh never finishes', async () => {
    renderPage();
    await openReview(0, '+919876500010');
    const hung = deferred<{ items: never[]; next_cursor: null }>();
    listFieldWorkers.mockReturnValueOnce(hung.promise); // the refresh after the approval
    approveFieldWorker.mockResolvedValueOnce(approved(1));
    fireEvent.click(screen.getByTestId('fw-approvals-approve'));
    expect((await screen.findByTestId('fw-approvals-announce')).textContent).toBe(t('fw.approvals.approved', { name: 'Ramesh Kumar' }));
    expect(screen.queryByTestId('fw-detail')).toBeNull();
    await act(async () => hung.resolve({ items: [], next_cursor: null }));
  });

  it.each([
    ['field_worker.illegal_transition', 'fw.approvals.alreadyDone'],
    ['field_worker.authorization_stale', 'fw.approvals.moved'],
  ])('a 409 %s refreshes the stale list', async (code, key) => {
    renderPage();
    await openReview(0, '+919876500010');
    expect(listFieldWorkers).toHaveBeenCalledTimes(1);
    approveFieldWorker.mockRejectedValueOnce(new ApiError(409, code, 'no'));
    listFieldWorkers.mockResolvedValue({ items: [item(2, 'Sita Devi')], next_cursor: null });
    fireEvent.click(screen.getByTestId('fw-approvals-approve'));
    expect((await screen.findByTestId('fw-approvals-error')).textContent).toBe(t(key));
    await waitFor(() => expect(listFieldWorkers).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByTestId('fw-approvals-list-row')).not.toBeNull());
    expect(within(screen.getByTestId('fw-approvals-list')).queryByText('Ramesh Kumar')).toBeNull();
  });

  it('a retryable failure for a worker whose panel was not open keeps the key for that worker’s "Try again"', async () => {
    renderPage();
    await openReview(0, '+919876500010');
    const d = deferred<never>();
    approveFieldWorker.mockReturnValueOnce(d.promise);
    fireEvent.click(screen.getByTestId('fw-approvals-approve'));
    fireEvent.click(screen.getAllByTestId('fw-approvals-review')[1]!);
    await waitFor(() => expect(screen.getByTestId('fw-detail-mobile').textContent).toBe('+919876500020'));
    await act(async () => d.reject(new ApiError(503, 'field_worker.decrypt_unavailable', 'down')));
    await screen.findByTestId('fw-approvals-banner-error');
    // Back to A: the button says "Try again" and re-sends the SAME key.
    fireEvent.click(screen.getAllByTestId('fw-approvals-review')[0]!);
    await waitFor(() => expect(screen.getByTestId('fw-detail-mobile').textContent).toBe('+919876500010'));
    approveFieldWorker.mockResolvedValueOnce(approved(1));
    fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${t('fw.retry')}`) }));
    await waitFor(() => expect(approveFieldWorker).toHaveBeenCalledTimes(2));
    expect(approveFieldWorker.mock.calls[1]![2]).toBe(approveFieldWorker.mock.calls[0]![2]);
  });
});

describe('CR10 — announcements and focus', () => {
  it('closing the identity panel puts focus back on THAT worker’s Review button', async () => {
    const user = userEvent.setup();
    renderPage();
    const reviews = await screen.findAllByTestId('fw-approvals-review');
    await user.click(reviews[1]!);
    await waitFor(() => expect(screen.getByTestId('fw-detail-mobile').textContent).toBe('+919876500020'));
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: t('fw.detail.title') }));
    await user.click(screen.getByTestId('fw-detail-close'));
    expect(screen.queryByTestId('fw-detail')).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: t('fw.approvals.reviewNamed', { name: 'Sita Devi' }) }));
  });

  it('one status region is mounted from the start and holds "Loading…", then the empty line — the node is never replaced', async () => {
    const d = deferred<{ items: never[]; next_cursor: null }>();
    listFieldWorkers.mockReturnValueOnce(d.promise);
    renderPage();
    const region = await screen.findByTestId('fw-approvals-list-status');
    expect(region.getAttribute('role')).toBe('status');
    expect(region.textContent).toBe(t('fw.loading'));
    await act(async () => d.resolve({ items: [], next_cursor: null }));
    expect((await within(region).findByTestId('fw-approvals-list-empty')).textContent).toBe(t('fw.approvals.empty'));
    expect(screen.getByTestId('fw-approvals-list-status')).toBe(region);
  });
});

describe('CR12 — a district change while "Load more" is in flight', () => {
  const pageFor = (district: string | undefined) => {
    if (district === 'Patna') return { items: [item(3, 'Patna Worker')], next_cursor: null };
    return { items: [item(1, 'Ramesh Kumar')], next_cursor: 'c1' };
  };

  it('the old answer is dropped: no "No more workers." for the new list, no focus move', async () => {
    listFieldWorkers.mockImplementation(async (_p: string, o: { district?: string; cursor?: string }) => pageFor(o.district));
    renderPage();
    const more = await screen.findByTestId('fw-approvals-list-more');
    const late = deferred<{ items: ReturnType<typeof item>[]; next_cursor: null }>();
    listFieldWorkers.mockImplementationOnce(() => late.promise); // the "Load more" of the all-districts list
    more.focus();
    fireEvent.click(more);
    await chooseDistrict('Patna');
    expect(await screen.findByText('Patna Worker')).toBeTruthy();
    const review = screen.getByTestId('fw-approvals-review');
    await act(async () => late.resolve({ items: [item(2, 'Late Worker')], next_cursor: null }));
    expect(screen.queryByText(t('fw.list.noMore'))).toBeNull();
    expect(screen.queryByText('Late Worker')).toBeNull();
    expect(document.activeElement).not.toBe(review);
  });

  it('the "n more workers shown" line belongs to the list it was shown for: a district change clears it', async () => {
    listFieldWorkers.mockResolvedValueOnce({ items: [item(1, 'Ramesh Kumar')], next_cursor: 'c1' }).mockResolvedValueOnce({ items: [item(2, 'Sita Devi')], next_cursor: null });
    renderPage();
    fireEvent.click(await screen.findByTestId('fw-approvals-list-more'));
    expect(await screen.findByText(t('fw.list.moreShownOne'))).toBeTruthy();
    listFieldWorkers.mockResolvedValue({ items: [item(3, 'Patna Worker')], next_cursor: null });
    await chooseDistrict('Patna');
    expect(await screen.findByText('Patna Worker')).toBeTruthy();
    expect(screen.queryByText(t('fw.list.moreShownOne'))).toBeNull();
  });
});

describe('CR6 — the buttons’ names contain their visible text', () => {
  it('Approve: "Approve" + the hidden suffix; no aria-label', async () => {
    renderPage();
    await openReview(1, '+919876500020');
    const button = screen.getByRole('button', { name: `${t('fw.approvals.approve')} ${t('fw.forName', { name: 'Sita Devi' })}` });
    expect(button.hasAttribute('aria-label')).toBe(false);
    expect(button.textContent).toContain(t('fw.approvals.approve'));
  });
});
