// Story 13.1c (Task 5.3; AC10; AD7, AD8) — a worker's history in the opened panel, against a mocked client: nothing is read until
// "Show history" is pressed; the entries read by label with the time in India, the officer's name (or "an officer (name not
// recorded)", ⛔ an email), their role and the reason / districts / date; "Load more" pages with `after`; a 403 shows the history's own
// line; a successful act refreshes the history.

import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getFieldWorkerIdentity = vi.fn();
const getFieldWorkerLog = vi.fn();
const suspendFieldWorker = vi.fn();
vi.mock('../src/api/client.js', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    getFieldWorkerIdentity: (p: string, id: string) => getFieldWorkerIdentity(p, id),
    getFieldWorkerLog: (...a: unknown[]) => getFieldWorkerLog(...a),
    suspendFieldWorker: (...a: unknown[]) => suspendFieldWorker(...a),
    getFieldWorkerDistricts: async () => ({ districts: ['Patna'], districts_truncated: false }),
  };
});
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => vi.fn() }));

const { WorkerDetail, WorkerHistory, WorkerActions } = await import('../src/modules/field-workers/index.js');
const { resolveEn: t } = await import('../src/modules/field-workers/i18n-en.js');
const { ApiError } = await import('../src/api/client.js');
const { createQueryClient, fieldWorkerLogKey } = await import('../src/api/hooks.js');

const P = '11111111-1111-4111-8111-111111111111';
const W = '00000000-0000-4000-8000-000000000001';
const U1 = '22222222-2222-4222-8222-222222222222';
const item = (v: number, over: Record<string, unknown> = {}) => ({
  event_version: v,
  event_type: 'field_worker.registered',
  occurred_at: '2026-11-07T10:35:00.000Z',
  actor: { user_id: U1, display_name: 'Asha Verma', role: 'district_admin' },
  permission_key: 'field_worker.register',
  grant: { dimension: 'district', value: 'Patna' },
  target_district: 'Patna',
  reason_code: null,
  from_district: null,
  to_district: null,
  ended_on: null,
  ...over,
});

beforeEach(() => {
  for (const fn of [getFieldWorkerIdentity, getFieldWorkerLog, suspendFieldWorker]) fn.mockReset();
  getFieldWorkerIdentity.mockResolvedValue({
    field_worker_id: W,
    name: 'Ramesh Kumar',
    district: 'Patna',
    current_state: 'active',
    kyc_status: 'completed',
    registered_by_display: 'Asha Verma',
    created_at: '2026-11-04T05:00:00.000Z',
    code_sms_status: null,
    mobile: '+919876500010',
    approved_by_display: 'Meera Rao',
  });
});

function renderHistory() {
  const qc = createQueryClient();
  render(
    <QueryClientProvider client={qc}>
      <WorkerHistory pariwarId={P} fieldWorkerId={W} />
    </QueryClientProvider>,
  );
  return qc;
}

describe('WorkerHistory', () => {
  it('reads NOTHING until "Show history" is pressed; then each entry by label, India time, officer and role, and its details', async () => {
    getFieldWorkerLog.mockResolvedValue({
      items: [
        item(1),
        item(2, { event_type: 'field_worker.suspended', reason_code: 'under_review', actor: { user_id: U1, display_name: null, role: 'pariwar_admin' } }),
        item(3, { event_type: 'field_worker.posted', reason_code: 'reassigned', from_district: 'Patna', to_district: 'Gaya' }),
        item(4, { event_type: 'field_worker.terminated', reason_code: 'died', ended_on: '2026-11-06', target_district: 'Gaya' }),
      ],
      next_after: null,
    });
    renderHistory();
    expect(getFieldWorkerLog).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('fw-history-show'));
    const entries = await screen.findAllByTestId('fw-history-item');
    expect(getFieldWorkerLog).toHaveBeenCalledTimes(1);
    expect(getFieldWorkerLog).toHaveBeenCalledWith(P, W, {});
    expect(entries.map((e) => e.querySelector('p')!.textContent)).toEqual(['Registered', 'Suspended', 'Moved', 'Ended']);
    // 10:35 UTC is 4:05 pm in India.
    expect(entries[0]!.textContent).toContain('4:05');
    expect(entries[0]!.textContent).toContain(t('fw.history.by', { name: 'Asha Verma', role: 'District Admin' }));
    expect(entries[0]!.textContent).toContain(t('fw.history.district', { district: 'Patna' }));
    // AD7 — a missing display name: "an officer (name not recorded)", ⛔ an email or a user id.
    expect(entries[1]!.textContent).toContain(t('fw.history.by', { name: t('fw.history.unknownOfficer'), role: 'Pariwar Admin' }));
    expect(entries[1]!.textContent).not.toContain(U1);
    expect(entries[1]!.textContent).toContain(t('fw.history.reason', { reason: 'Under review' }));
    expect(entries[2]!.textContent).toContain(t('fw.history.move', { from: 'Patna', to: 'Gaya' }));
    expect(entries[2]!.textContent).toContain(t('fw.history.reason', { reason: 'Reassigned by the Trust' }));
    // A date reads like every other date on the screen (review CR30) - ⛔ raw ISO; `-455` clause 1's words "Date of death".
    expect(entries[3]!.textContent).toContain('Date of death: 6 Nov 2026');
    expect(entries[3]!.textContent).toContain(t('fw.history.reason', { reason: 'Died' }));
    // Never a reason CODE on screen.
    expect(screen.getByTestId('fw-history-list').textContent).not.toMatch(/under_review|reassigned|died\b/);
    expect(screen.queryByTestId('fw-history-more')).toBeNull();
    // The load is said in the status region, and the pressed "Show history" took focus to the heading with it (review CR25).
    expect(screen.getByTestId('fw-history-status').textContent).toContain('History loaded.');
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'History' }));
  });

  it('"Load more" pages with the previous page’s next_after, SAYS how many entries arrived, and moves focus to the first new one (review CR25)', async () => {
    getFieldWorkerLog.mockResolvedValueOnce({ items: [item(1), item(2, { event_type: 'field_worker.kyc_completed' })], next_after: 2 });
    getFieldWorkerLog.mockResolvedValueOnce({ items: [item(3, { event_type: 'field_worker.activated' })], next_after: null });
    renderHistory();
    fireEvent.click(screen.getByTestId('fw-history-show'));
    await waitFor(() => expect(screen.getAllByTestId('fw-history-item')).toHaveLength(2));
    screen.getByTestId('fw-history-more').focus(); // a real press focuses the button; the page may then move focus
    fireEvent.click(screen.getByTestId('fw-history-more'));
    await waitFor(() => expect(screen.getAllByTestId('fw-history-item')).toHaveLength(3));
    expect(getFieldWorkerLog).toHaveBeenLastCalledWith(P, W, { after: 2 });
    expect(screen.queryByTestId('fw-history-more')).toBeNull();
    expect((await screen.findByTestId('fw-history-revealed')).textContent).toBe('1 more entry shown.');
    await waitFor(() => expect(document.activeElement).toBe(screen.getAllByTestId('fw-history-item')[2]));
  });

  it('PR10: "Load more" is not pressable while ANY fetch runs (an act’s refresh of the pages shown would be cancelled by a next page)', async () => {
    const page1 = { items: [item(1), item(2)], next_after: 2 };
    let release: (v: typeof page1) => void = () => undefined;
    getFieldWorkerLog.mockResolvedValueOnce(page1).mockImplementationOnce(() => new Promise<typeof page1>((resolve) => { release = resolve; }));
    const qc = renderHistory();
    fireEvent.click(screen.getByTestId('fw-history-show'));
    await waitFor(() => expect(screen.getAllByTestId('fw-history-item')).toHaveLength(2));
    expect((screen.getByTestId('fw-history-more') as HTMLButtonElement).disabled).toBe(false);
    void qc.invalidateQueries({ queryKey: fieldWorkerLogKey(P, W) }); // what a successful act does
    await waitFor(() => expect((screen.getByTestId('fw-history-more') as HTMLButtonElement).disabled).toBe(true));
    release(page1);
    await waitFor(() => expect((screen.getByTestId('fw-history-more') as HTMLButtonElement).disabled).toBe(false));
  });

  it('"Load more" does NOT pull focus back when the officer has moved on meanwhile', async () => {
    getFieldWorkerLog.mockResolvedValueOnce({ items: [item(1), item(2)], next_after: 2 });
    getFieldWorkerLog.mockResolvedValueOnce({ items: [item(3), item(4)], next_after: null });
    render(
      <QueryClientProvider client={createQueryClient()}>
        <button type="button" data-testid="elsewhere">elsewhere</button>
        <WorkerHistory pariwarId={P} fieldWorkerId={W} />
      </QueryClientProvider>,
    );
    fireEvent.click(screen.getByTestId('fw-history-show'));
    await waitFor(() => expect(screen.getAllByTestId('fw-history-item')).toHaveLength(2));
    screen.getByTestId('fw-history-more').focus();
    fireEvent.click(screen.getByTestId('fw-history-more'));
    screen.getByTestId('elsewhere').focus();
    await waitFor(() => expect(screen.getAllByTestId('fw-history-item')).toHaveLength(4));
    expect((await screen.findByTestId('fw-history-revealed')).textContent).toBe(t('fw.history.moreShown', { n: 2 }));
    expect(document.activeElement).toBe(screen.getByTestId('elsewhere'));
  });

  it('a page that fails keeps the rows and says so beside "Load more", which can be pressed again', async () => {
    getFieldWorkerLog.mockResolvedValueOnce({ items: [item(1), item(2)], next_after: 2 });
    getFieldWorkerLog.mockRejectedValueOnce(new ApiError(500, 'something.down', 'down'));
    getFieldWorkerLog.mockResolvedValueOnce({ items: [item(3)], next_after: null });
    renderHistory();
    fireEvent.click(screen.getByTestId('fw-history-show'));
    await waitFor(() => expect(screen.getAllByTestId('fw-history-item')).toHaveLength(2));
    fireEvent.click(screen.getByTestId('fw-history-more'));
    expect((await screen.findByTestId('fw-history-more-error')).textContent).toBe(t('fw.history.moreError'));
    expect(screen.getAllByTestId('fw-history-item')).toHaveLength(2); // the rows the officer had are still there
    fireEvent.click(screen.getByTestId('fw-history-more'));
    await waitFor(() => expect(screen.getAllByTestId('fw-history-item')).toHaveLength(3));
    expect(screen.queryByTestId('fw-history-more-error')).toBeNull();
  });

  it('a first load that fails with a 5xx offers Retry, which reads it again - and focus stays in the panel (the pressed Retry unmounts)', async () => {
    getFieldWorkerLog.mockRejectedValueOnce(new ApiError(500, 'something.down', 'down')).mockResolvedValueOnce({ items: [item(1)], next_after: null });
    renderHistory();
    fireEvent.click(screen.getByTestId('fw-history-show'));
    await screen.findByTestId('fw-history-error');
    screen.getByTestId('fw-history-retry').focus();
    fireEvent.click(screen.getByTestId('fw-history-retry'));
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'History' }));
    await waitFor(() => expect(screen.getAllByTestId('fw-history-item')).toHaveLength(1));
    expect(screen.queryByTestId('fw-history-error')).toBeNull();
  });

  it('a 403 shows the history’s own no-access line', async () => {
    getFieldWorkerLog.mockRejectedValue(new ApiError(403, 'authz.forbidden', 'no'));
    renderHistory();
    fireEvent.click(screen.getByTestId('fw-history-show'));
    expect((await screen.findByTestId('fw-history-error')).textContent).toBe(t('fw.history.noAccess'));
  });

  it('a successful act refreshes the history shown beside it', async () => {
    getFieldWorkerLog.mockResolvedValueOnce({ items: [item(1)], next_after: null });
    getFieldWorkerLog.mockResolvedValue({ items: [item(1), item(2, { event_type: 'field_worker.suspended', reason_code: 'under_review' })], next_after: null });
    suspendFieldWorker.mockResolvedValue({ field_worker_id: W, district: 'Patna', current_state: 'suspended', state_reason_code: 'under_review', ended_on: null });
    const qc = createQueryClient();
    render(
      <QueryClientProvider client={qc}>
        <WorkerDetail pariwarId={P} fieldWorkerId={W} onClose={() => undefined} surface="find">
          {(name, worker) => (
            <>
              <WorkerActions pariwarId={P} fieldWorkerId={W} name={name} worker={worker} />
              <WorkerHistory pariwarId={P} fieldWorkerId={W} />
            </>
          )}
        </WorkerDetail>
      </QueryClientProvider>,
    );
    fireEvent.click(await screen.findByTestId('fw-history-show'));
    await waitFor(() => expect(screen.getAllByTestId('fw-history-item')).toHaveLength(1));
    fireEvent.click(screen.getByTestId('fw-act-suspend'));
    fireEvent.change(screen.getByTestId('fw-act-reason'), { target: { value: 'under_review' } });
    fireEvent.click(screen.getByTestId('fw-act-confirm'));
    await waitFor(() => expect(screen.getAllByTestId('fw-history-item')).toHaveLength(2));
    expect(within(screen.getByTestId('fw-history-list')).getByText('Suspended')).toBeTruthy();
    expect(getFieldWorkerIdentity).toHaveBeenCalledTimes(1);
  });
});
