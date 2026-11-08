// Story 13.1d (Task 6; AC9; AD10 as amended by `-460`) — the Move requests page, the notices, the nav's unseen count and "Ask to move",
// against a mocked client:
//   · a District Admin with a district chosen: "Waiting for your answer" lists the PENDING requests whose other end is that district and
//     that the officer did not open (Accept / Refuse); "Your requests" the officer's own (Withdraw); "All districts" lists the escalated
//     ones with Close; a 403 on the list shows "choose a district you manage";
//   · Refuse needs a reason from the fixed list (labels, never codes); ONE Idempotency-Key per attempt (a retry after a 5xx reuses it);
//     a 409 `move_request_not_open` says the request moved on; the acts never pause offline (`networkMode: 'always'`, 13.1c CR34);
//   · View opens the detail: the worker's work history (dates and districts), "Members brought in: Not counted yet", ⛔ any reason;
//   · notices: newest first, the unseen marked "New" and marked seen once; the accepted one says "Tell the worker."; the nav counts unseen;
//   · Ask to move: for a waiting / active / suspended worker only, the current district excluded, `{ from_district, to_district }`, the
//     "gone to the Pariwar Admin" line on a 201 `escalated`, and its own 403 line.

import { QueryClientProvider, onlineManager } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@tanstack/react-router', () => ({
  Link: (p: { children: ReactNode; to: string; 'data-testid'?: string }) => (
    <a href={p.to} data-testid={p['data-testid']}>
      {p.children}
    </a>
  ),
  Outlet: () => null,
  useNavigate: () => vi.fn(),
  useParams: () => ({}),
  useRouter: () => ({ invalidate: vi.fn() }),
}));

const ME = '99999999-9999-4999-8999-999999999999';
const listFieldWorkerMoveRequests = vi.fn();
const getFieldWorkerMoveRequest = vi.fn();
const listFieldWorkerNotices = vi.fn();
const markFieldWorkerNoticesSeen = vi.fn();
const actOnFieldWorkerMoveRequest = vi.fn();
const openFieldWorkerMoveRequest = vi.fn();
const getFieldWorkerDistricts = vi.fn();
const approveFieldWorker = vi.fn();
vi.mock('../src/api/client.js', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    getSession: async () => ({ userId: ME, nationalGrants: [] }),
    listFieldWorkerMoveRequests: (...a: unknown[]) => listFieldWorkerMoveRequests(...a),
    getFieldWorkerMoveRequest: (...a: unknown[]) => getFieldWorkerMoveRequest(...a),
    listFieldWorkerNotices: (...a: unknown[]) => listFieldWorkerNotices(...a),
    markFieldWorkerNoticesSeen: (...a: unknown[]) => markFieldWorkerNoticesSeen(...a),
    actOnFieldWorkerMoveRequest: (...a: unknown[]) => actOnFieldWorkerMoveRequest(...a),
    openFieldWorkerMoveRequest: (...a: unknown[]) => openFieldWorkerMoveRequest(...a),
    getFieldWorkerDistricts: (...a: unknown[]) => getFieldWorkerDistricts(...a),
    approveFieldWorker: (...a: unknown[]) => approveFieldWorker(...a),
  };
});

const { MoveRequestsPage, AskToMove } = await import('../src/modules/field-workers/index.js');
const { FieldWorkerNav } = await import('../src/modules/field-workers/FieldWorkerNav.js');
const { resolveEn: t } = await import('../src/modules/field-workers/i18n-en.js');
const { ApiError } = await import('../src/api/client.js');
const { createQueryClient, useApproveFieldWorker } = await import('../src/api/hooks.js');

const P = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const req = (o: Partial<Record<string, unknown>> = {}) => ({
  move_request_id: '00000000-0000-4000-8000-0000000000a1',
  field_worker_id: '00000000-0000-4000-8000-000000000001',
  name: 'Ramesh Kumar',
  from_district: 'Patna',
  to_district: 'Gaya',
  opened_at_end: 'from',
  counterpart_district: 'Gaya',
  state: 'pending',
  refusal_reason: null,
  escalation_cause: null,
  supersede_cause: null,
  opened_by: OTHER,
  opened_by_display: 'Ravi Patna',
  opened_at: '2026-11-08T05:00:00.000Z',
  answered_at: null,
  ...o,
});
const result = (o: Partial<Record<string, unknown>> = {}) => ({
  move_request_id: '00000000-0000-4000-8000-0000000000a1',
  field_worker_id: '00000000-0000-4000-8000-000000000001',
  state: 'accepted',
  from_district: 'Patna',
  to_district: 'Gaya',
  counterpart_district: 'Gaya',
  worker_district: 'Gaya',
  ...o,
});
const notice = (o: Partial<Record<string, unknown>> = {}) => ({
  notice_id: '00000000-0000-4000-8000-0000000000n1'.replace('n', 'b'),
  kind: 'move_request_accepted',
  field_worker_id: '00000000-0000-4000-8000-000000000001',
  move_request_id: '00000000-0000-4000-8000-0000000000a1',
  from_district: 'Patna',
  to_district: 'Gaya',
  refusal_reason: null,
  created_at: '2026-11-08T06:00:00.000Z',
  seen_at: null,
  ...o,
});

function renderWith(ui: ReactNode) {
  return render(<QueryClientProvider client={createQueryClient()}>{ui}</QueryClientProvider>);
}
/** Choose `district` in the page's picker (its options' values are indices). */
async function choose(district: string): Promise<void> {
  const select = await screen.findByTestId('fw-requests-district');
  await waitFor(() => expect(within(select).getByText(district)).toBeInTheDocument());
  const option = within(select).getByText(district) as HTMLOptionElement;
  fireEvent.change(select, { target: { value: option.value } });
}

beforeEach(() => {
  for (const fn of [listFieldWorkerMoveRequests, getFieldWorkerMoveRequest, listFieldWorkerNotices, markFieldWorkerNoticesSeen, actOnFieldWorkerMoveRequest, openFieldWorkerMoveRequest, getFieldWorkerDistricts]) fn.mockReset();
  getFieldWorkerDistricts.mockResolvedValue({ districts: ['Gaya', 'Nalanda', 'Patna'], districts_truncated: false });
  listFieldWorkerNotices.mockResolvedValue({ items: [], next_cursor: null });
  markFieldWorkerNoticesSeen.mockResolvedValue(undefined);
});
afterEach(() => onlineManager.setOnline(true));

describe('Story 13.1d — the Move requests page (AC9)', () => {
  it('a District Admin’s district: "Waiting for your answer" (pending, counterpart = the district, not mine) with Accept / Refuse; "Your requests" with Withdraw', async () => {
    listFieldWorkerMoveRequests.mockImplementation(async (_p: string, o: { district?: string }) =>
      o.district === 'Gaya'
        ? {
            items: [
              req(),
              req({ move_request_id: '00000000-0000-4000-8000-0000000000a2', name: 'Mine Worker', opened_by: ME, from_district: 'Gaya', to_district: 'Patna', counterpart_district: 'Patna' }),
              req({ move_request_id: '00000000-0000-4000-8000-0000000000a3', name: 'Escalated One', state: 'escalated' }),
            ],
            next_cursor: null,
          }
        : { items: [], next_cursor: null },
    );
    renderWith(<MoveRequestsPage pariwarId={P} />);
    await choose('Gaya');
    const waiting = await screen.findByTestId('fw-requests-waiting');
    await waitFor(() => expect(within(waiting).getAllByTestId('fw-request')).toHaveLength(1));
    expect(within(waiting).getByText(/Ramesh Kumar: Patna to Gaya/)).toBeInTheDocument();
    expect(within(waiting).getByText(/Asked by Ravi Patna/)).toBeInTheDocument();
    expect(within(waiting).getByTestId('fw-request-accept')).toBeInTheDocument();
    expect(within(waiting).getByTestId('fw-request-refuse-open')).toBeInTheDocument();
    const mine = screen.getByTestId('fw-requests-mine');
    expect(within(mine).getByText(/Mine Worker: Gaya to Patna/)).toBeInTheDocument();
    expect(within(mine).getByTestId('fw-request-withdraw')).toBeInTheDocument();
    expect(within(mine).queryByTestId('fw-request-accept')).toBeNull();
    expect(listFieldWorkerMoveRequests).toHaveBeenLastCalledWith(P, { state: 'open', district: 'Gaya' });
  });

  it('"All districts" (a Pariwar Admin) lists the escalated requests with Close; a District Admin’s 403 says "choose a district you manage"', async () => {
    listFieldWorkerMoveRequests.mockResolvedValueOnce({ items: [req({ state: 'escalated' }), req({ move_request_id: '00000000-0000-4000-8000-0000000000a4' })], next_cursor: null });
    const view = renderWith(<MoveRequestsPage pariwarId={P} />);
    const waiting = await screen.findByTestId('fw-requests-waiting');
    expect(within(waiting).getByRole('heading', { name: t('fw.requests.escalated') })).toBeInTheDocument();
    expect(within(waiting).getAllByTestId('fw-request')).toHaveLength(1);
    expect(within(waiting).getByTestId('fw-request-close')).toBeInTheDocument();
    view.unmount();
    listFieldWorkerMoveRequests.mockRejectedValueOnce(new ApiError(403, 'authz.forbidden', 'no'));
    renderWith(<MoveRequestsPage pariwarId={P} />);
    expect(await screen.findByTestId('fw-requests-error')).toHaveTextContent(t('fw.requests.noAccess'));
  });

  it('ACCEPT: the act with a fresh key, then "now reports to"; a 409 not_open says the request moved on', async () => {
    listFieldWorkerMoveRequests.mockResolvedValue({ items: [req()], next_cursor: null });
    actOnFieldWorkerMoveRequest.mockResolvedValueOnce(result()).mockRejectedValueOnce(new ApiError(409, 'field_worker.move_request_not_open', 'gone'));
    renderWith(<MoveRequestsPage pariwarId={P} />);
    await choose('Gaya');
    fireEvent.click(await screen.findByTestId('fw-request-accept'));
    await waitFor(() => expect(screen.getByTestId('fw-requests-announce')).toHaveTextContent('Ramesh Kumar now reports to Gaya.'));
    expect(actOnFieldWorkerMoveRequest).toHaveBeenCalledWith(P, req().move_request_id, 'accept', expect.any(String));
    fireEvent.click(await screen.findByTestId('fw-request-accept'));
    expect(await screen.findByTestId('fw-request-error')).toHaveTextContent(t('fw.requests.stale'));
  });

  it('REFUSE: needs a reason from the list (labels only); a retry after a 5xx reuses the attempt’s key; it never pauses offline', async () => {
    listFieldWorkerMoveRequests.mockResolvedValue({ items: [req()], next_cursor: null });
    actOnFieldWorkerMoveRequest.mockRejectedValueOnce(new ApiError(503, 'http.503', 'down')).mockResolvedValueOnce(result({ state: 'refused', worker_district: 'Patna' }));
    renderWith(<MoveRequestsPage pariwarId={P} />);
    await choose('Gaya');
    fireEvent.click(await screen.findByTestId('fw-request-refuse-open'));
    const reason = screen.getByTestId('fw-request-refuse-reason') as HTMLSelectElement;
    expect([...reason.options].map((o) => o.textContent)).toEqual([
      t('fw.requests.refuse.choose'),
      'We cannot take on another worker',
      'There is no work for them here',
      'The request is missing something - talk to me',
      'Another reason - talk to me',
    ]);
    fireEvent.click(screen.getByTestId('fw-request-refuse'));
    expect(actOnFieldWorkerMoveRequest).not.toHaveBeenCalled(); // no reason yet
    fireEvent.change(reason, { target: { value: 'no_capacity' } });
    onlineManager.setOnline(false);
    fireEvent.click(screen.getByTestId('fw-request-refuse'));
    await waitFor(() => expect(actOnFieldWorkerMoveRequest).toHaveBeenCalledTimes(1)); // offline: sent at once, ⛔ paused
    expect(await screen.findByTestId('fw-request-error')).toBeInTheDocument();
    onlineManager.setOnline(true);
    fireEvent.click(screen.getByTestId('fw-request-refuse'));
    await waitFor(() => expect(screen.getByTestId('fw-requests-announce')).toHaveTextContent('You refused the request for Ramesh Kumar.'));
    const [first, second] = actOnFieldWorkerMoveRequest.mock.calls;
    expect(first![2]).toBe('refuse');
    expect(first![4]).toBe('no_capacity');
    expect(second![3]).toBe(first![3]); // the same attempt's key
  });

  it('`-460`: View opens the work history — dates and districts, "Not counted yet" — and ⛔ any reason', async () => {
    listFieldWorkerMoveRequests.mockResolvedValue({ items: [req()], next_cursor: null });
    getFieldWorkerMoveRequest.mockResolvedValue({
      request: req(),
      events: [{ event_version: 1, event_type: 'field_worker_move_request.opened', occurred_at: '2026-11-08T05:00:00.000Z', refusal_reason: null, cause: null }],
      worker: {
        field_worker_id: req().field_worker_id,
        name: 'Ramesh Kumar',
        current_state: 'active',
        registered_on: '2026-01-02',
        active_since: '2026-01-03',
        districts: [{ district: 'Nalanda', from: '2026-01-02', to: '2026-03-10' }, { district: 'Patna', from: '2026-03-10', to: null }],
        suspensions: [{ from: '2026-04-01', to: '2026-04-20' }],
        history_truncated: false,
        members_onboarded: null,
      },
    });
    renderWith(<MoveRequestsPage pariwarId={P} />);
    await choose('Gaya');
    fireEvent.click(await screen.findByTestId('fw-request-view'));
    const detail = await screen.findByTestId('fw-request-detail');
    expect(within(detail).getByTestId('fw-request-detail-districts')).toHaveTextContent(/Nalanda: .* to .*Patna: since/);
    expect(within(detail).getByTestId('fw-request-detail-suspensions').textContent).toMatch(/Apr 2026 to/);
    expect(within(detail).getByTestId('fw-request-detail-members')).toHaveTextContent('Members brought in: Not counted yet');
    expect(detail.textContent).not.toMatch(/under_review|review|reason/i);
    expect(getFieldWorkerMoveRequest).toHaveBeenCalledTimes(1);
  });
});

describe('Story 13.1d — the browser pass’s two screen findings (2026-11-09)', () => {
  it('a notice unseen when the page showed it KEEPS its "New" mark after the seen mark’s refresh returns it seen', async () => {
    listFieldWorkerMoveRequests.mockResolvedValue({ items: [], next_cursor: null });
    listFieldWorkerNotices
      .mockResolvedValueOnce({ items: [notice()], next_cursor: null })
      .mockResolvedValue({ items: [notice({ seen_at: '2026-11-09T01:00:00.000Z' })], next_cursor: null });
    renderWith(<MoveRequestsPage pariwarId={P} />);
    await waitFor(() => expect(markFieldWorkerNoticesSeen).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(listFieldWorkerNotices.mock.calls.length).toBeGreaterThanOrEqual(2)); // the refresh after the mark
    const [item] = await screen.findAllByTestId('fw-notice');
    expect(item).toHaveAttribute('data-unseen', 'true');
    expect(item).toHaveTextContent(/^New:/);
  });

  it('an act does NOT re-read an open detail panel (each read decrypts the name and writes an audit line)', async () => {
    const other = req({ move_request_id: '00000000-0000-4000-8000-0000000000a9', name: 'Other Worker' });
    listFieldWorkerMoveRequests.mockResolvedValue({ items: [req(), other], next_cursor: null });
    getFieldWorkerMoveRequest.mockResolvedValue({
      request: req(),
      events: [],
      worker: { field_worker_id: req().field_worker_id, name: 'Ramesh Kumar', current_state: 'active', registered_on: null, active_since: null, districts: [], suspensions: [], history_truncated: false, members_onboarded: null },
    });
    actOnFieldWorkerMoveRequest.mockResolvedValue(result());
    renderWith(<MoveRequestsPage pariwarId={P} />);
    await choose('Gaya');
    fireEvent.click((await screen.findAllByTestId('fw-request-view'))[0]!);
    await screen.findByTestId('fw-request-detail');
    fireEvent.click(screen.getAllByTestId('fw-request-accept')[1]!); // the OTHER request
    await waitFor(() => expect(actOnFieldWorkerMoveRequest).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(listFieldWorkerMoveRequests.mock.calls.length).toBeGreaterThanOrEqual(2)); // the lists refreshed
    expect(getFieldWorkerMoveRequest).toHaveBeenCalledTimes(1);
  });
});

describe('Story 13.1d — notices and the nav (AC9)', () => {
  it('the unseen marked "New" and marked seen ONCE; the accepted one says "Tell the worker."', async () => {
    listFieldWorkerMoveRequests.mockResolvedValue({ items: [], next_cursor: null });
    listFieldWorkerNotices.mockResolvedValue({
      items: [notice(), notice({ notice_id: '00000000-0000-4000-8000-0000000000c2', kind: 'move_request_opened', seen_at: '2026-11-08T07:00:00.000Z' })],
      next_cursor: null,
    });
    renderWith(<MoveRequestsPage pariwarId={P} />);
    const items = await screen.findAllByTestId('fw-notice');
    expect(items.map((i) => i.getAttribute('data-unseen'))).toEqual(['true', 'false']);
    expect(items[0]).toHaveTextContent(/New:.*Your request was accepted: Patna to Gaya\. Tell the worker\./);
    await waitFor(() => expect(markFieldWorkerNoticesSeen).toHaveBeenCalledWith(P, [notice().notice_id]));
    expect(markFieldWorkerNoticesSeen).toHaveBeenCalledTimes(1);
  });

  it('the nav’s Move requests link carries the unseen count of the first page; none ⇒ the plain link', async () => {
    listFieldWorkerNotices.mockResolvedValueOnce({ items: [notice(), notice({ notice_id: '00000000-0000-4000-8000-0000000000c3' })], next_cursor: null });
    const view = renderWith(<FieldWorkerNav pariwarId={P} current="find" />);
    await waitFor(() => expect(screen.getByTestId('fw-nav-requests')).toHaveTextContent('Move requests (2 new)'));
    view.unmount();
    listFieldWorkerNotices.mockRejectedValueOnce(new ApiError(500, 'x', 'x'));
    renderWith(<FieldWorkerNav pariwarId={P} current="find" />);
    expect(screen.getByTestId('fw-nav-requests')).toHaveTextContent(/^Move requests$/);
  });
});

describe('Story 13.1d — Ask to move (AC9)', () => {
  const worker = (state: 'pending_kyc' | 'active' | 'suspended' | 'terminated') => ({ current_state: state, district: 'Patna', created_at: '2026-11-04T05:00:00.000Z' });

  it('offered for a waiting, active or suspended worker; ⛔ an ended one', () => {
    for (const s of ['pending_kyc', 'active', 'suspended'] as const) {
      const v = renderWith(<AskToMove pariwarId={P} fieldWorkerId="w" name="Ramesh Kumar" worker={worker(s)} />);
      expect(screen.getByTestId('fw-ask-open'), s).toBeInTheDocument();
      v.unmount();
    }
    renderWith(<AskToMove pariwarId={P} fieldWorkerId="w" name="Ramesh Kumar" worker={worker('terminated')} />);
    expect(screen.queryByTestId('fw-ask')).toBeNull();
  });

  it('the select excludes the current district; it sends { from_district, to_district }; a 201 `escalated` says it went to the Pariwar Admin; a 403 its own line', async () => {
    openFieldWorkerMoveRequest.mockRejectedValueOnce(new ApiError(403, 'authz.forbidden', 'no')).mockResolvedValueOnce(result({ state: 'escalated', worker_district: 'Patna' }));
    renderWith(<AskToMove pariwarId={P} fieldWorkerId="w" name="Ramesh Kumar" worker={worker('active')} />);
    fireEvent.click(screen.getByTestId('fw-ask-open'));
    const select = (await screen.findByTestId('fw-ask-to')) as HTMLSelectElement;
    await waitFor(() => expect([...select.options].map((o) => o.value)).toEqual(['', 'Gaya', 'Nalanda']));
    fireEvent.change(select, { target: { value: 'Nalanda' } });
    fireEvent.click(screen.getByTestId('fw-ask-send'));
    expect(await screen.findByTestId('fw-ask-error')).toHaveTextContent(t('fw.ask.noAccess'));
    await act(async () => {
      fireEvent.click(screen.getByTestId('fw-ask-send'));
    });
    await waitFor(() => expect(screen.getByTestId('fw-ask-announce')).toHaveTextContent(t('fw.ask.escalated')));
    expect(openFieldWorkerMoveRequest).toHaveBeenLastCalledWith(P, 'w', { from_district: 'Patna', to_district: 'Nalanda' }, expect.any(String));
  });
});

// 13.1c CR34 (its patch review's `networkMode` finding — this story's): the approval never pauses offline either.
describe('13.1c CR34 — the approval’s networkMode', () => {
  it('offline, an approval is SENT at once (and fails as a retryable network error), ⛔ paused until reconnect', async () => {
    approveFieldWorker.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    let run: (() => Promise<unknown>) | null = null;
    function Probe() {
      const m = useApproveFieldWorker(P);
      run = () => m.mutateAsync({ fieldWorkerId: 'w', idempotencyKey: 'k' });
      return null;
    }
    renderWith(<Probe />);
    onlineManager.setOnline(false);
    let failed: unknown = null;
    await act(async () => {
      await run!().catch((e: unknown) => {
        failed = e;
      });
    });
    expect(failed).toBeInstanceOf(TypeError);
    expect(approveFieldWorker).toHaveBeenCalledTimes(1);
  });
});
