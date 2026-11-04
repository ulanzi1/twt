// Story 13.1a (Task 9.3; AC11 (b), (d); AD12; TR5, TR12) — the awaiting-approval page against a mocked client (the real `ApiError`):
//   · the district DEFAULT is "All districts" (the list asks with no district); a District Admin's 403 there reads "choose a district
//     you manage"; choosing one asks for it, exactly;
//   · "Review" opens the audited identity panel (name, full mobile); closing it REMOVES the identity from the cache;
//   · "Approve" mints a key PER CLICK and sends it; a retryable failure keeps the key for "Try again" on THAT worker; success
//     announces, closes the panel and refreshes the list; 409 illegal_transition reads "already approved or no longer awaiting";
//   · "Load more" moves focus to the first new row; the empty state says so; the page links to the other two pages.

import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@tanstack/react-router', () => ({
  Link: (p: { children: ReactNode; to: string; 'data-testid'?: string }) => (
    <a href={p.to} data-testid={p['data-testid']}>
      {p.children}
    </a>
  ),
  useNavigate: () => vi.fn(),
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

function renderPage() {
  const qc = createQueryClient();
  render(
    <QueryClientProvider client={qc}>
      <ApprovalsPage pariwarId={P} />
    </QueryClientProvider>,
  );
  return qc;
}

beforeEach(() => {
  for (const fn of [listFieldWorkers, getFieldWorkerIdentity, approveFieldWorker, getFieldWorkerDistricts]) fn.mockReset();
  getFieldWorkerDistricts.mockResolvedValue({ districts: ['Gaya', 'Patna'], districts_truncated: false });
  listFieldWorkers.mockResolvedValue({ items: [item(1, 'Ramesh Kumar'), item(2, 'Sita Devi')], next_cursor: null });
  getFieldWorkerIdentity.mockImplementation(async (_p: string, id: string) => identityOf(Number(id.slice(-1))));
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
    const qc = renderPage();
    fireEvent.click((await screen.findAllByTestId('fw-approvals-review'))[0]!);
    expect((await screen.findByTestId('fw-detail-mobile')).textContent).toBe('+919876500010');
    expect(getFieldWorkerIdentity).toHaveBeenCalledWith(P, item(1).field_worker_id);
    fireEvent.click(screen.getByTestId('fw-detail-close'));
    await waitFor(() => expect(qc.getQueryCache().findAll({ queryKey: ['field-workers', P, 'identity'] })).toHaveLength(0));
    expect(JSON.stringify(qc.getQueryCache().getAll().map((q) => q.state.data))).not.toContain('+919876500010');
  });

  it('Approve mints a key PER CLICK; a retryable failure keeps it for "Try again"; success announces, closes and refreshes the list', async () => {
    renderPage();
    fireEvent.click((await screen.findAllByTestId('fw-approvals-review'))[0]!);
    await screen.findByTestId('fw-detail-mobile');
    approveFieldWorker.mockRejectedValueOnce(new ApiError(409, 'field_worker.idempotency_in_progress', 'busy'));
    fireEvent.click(screen.getByTestId('fw-approvals-approve'));
    expect((await screen.findByTestId('fw-approvals-error')).textContent).toBe(t('fw.err.inProgress'));
    expect(screen.getByTestId('fw-approvals-approve').textContent).toBe(t('fw.retry'));
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
