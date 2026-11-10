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
//     "gone to the Pariwar Admin" line on a 201 `escalated`, and its own 403 line;
//   · code review 2026-11-09 (CR42-CR50): a 409 that says a request moved on is said by the PAGE, in an alert that outlives the row; one row
//     per request and no request returned by the server shown nowhere; an empty section never says "nothing" while pages remain; loaded rows
//     stay when a later page fails; the notices page and name their worker through a View; an Ask does not refetch the worker lists; each
//     act's own guidance; focus; Ask per worker.

import { QueryClientProvider, onlineManager } from '@tanstack/react-query';
import { FieldWorkerMoveRequestEvent, FieldWorkerMoveRequestItem, FieldWorkerNoticeItem } from '@twt/contracts';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ONE shared navigate: `useSignInRedirect` goes to `/login` through it, and a leg that cannot see the call cannot tell the hook was removed (RP-2).
const navigate = vi.fn();
vi.mock('@tanstack/react-router', () => ({
  Link: (p: { children: ReactNode; to: string; 'data-testid'?: string }) => (
    <a href={p.to} data-testid={p['data-testid']}>
      {p.children}
    </a>
  ),
  Outlet: () => null,
  useNavigate: () => navigate,
  useParams: () => ({}),
  useRouter: () => ({ invalidate: vi.fn() }),
}));

const ME = '99999999-9999-4999-8999-999999999999';
const getSession = vi.fn();
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
    getSession: (...a: unknown[]) => getSession(...a),
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
const { createQueryClient, useApproveFieldWorker, fieldWorkerListsKey, fieldWorkerNoticesKey } = await import('../src/api/hooks.js');

const P = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
// The fixtures are PARSED by the contract (code review R4-10): a mocked client never parses a response, so a fixture the strict DTO
// refuses - a field the contract dropped, a time where `-461` / `-462` send none - would test a shape the server can never send.
const req = (o: Partial<Record<string, unknown>> = {}) => FieldWorkerMoveRequestItem.parse({
  move_request_id: '00000000-0000-4000-8000-0000000000a1',
  field_worker_id: '00000000-0000-4000-8000-000000000001',
  name: 'Ramesh Kumar',
  from_district: 'Patna',
  to_district: 'Gaya',
  opened_at_end: 'from',
  counterpart_district: 'Gaya',
  state: 'pending',
  refusal_reason: null,
  opened_by: OTHER,
  opened_by_display: 'Ravi Patna',
  opened_at: '2026-11-08T05:00:00.000Z',
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
/** One notice; a `move_request_superseded` one carries no time (`-462`) unless the leg says otherwise. */
const notice = (o: Partial<Record<string, unknown>> = {}) => FieldWorkerNoticeItem.parse({
  notice_id: '00000000-0000-4000-8000-0000000000n1'.replace('n', 'b'),
  kind: 'move_request_accepted',
  field_worker_id: '00000000-0000-4000-8000-000000000001',
  move_request_id: '00000000-0000-4000-8000-0000000000a1',
  from_district: 'Patna',
  to_district: 'Gaya',
  refusal_reason: null,
  created_at: o['kind'] === 'move_request_superseded' ? null : '2026-11-08T06:00:00.000Z',
  seen_at: null,
  ...o,
});
const event = (o: Partial<Record<string, unknown>>) => FieldWorkerMoveRequestEvent.parse({ event_version: 1, refusal_reason: null, ...o });

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
  for (const fn of [navigate, getSession, listFieldWorkerMoveRequests, getFieldWorkerMoveRequest, listFieldWorkerNotices, markFieldWorkerNoticesSeen, actOnFieldWorkerMoveRequest, openFieldWorkerMoveRequest, getFieldWorkerDistricts]) fn.mockReset();
  getSession.mockImplementation(async () => ({ userId: ME, nationalGrants: [] }));
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
    // CR42 — said by the PAGE, in an alert that outlives the row (this row is about to leave the list), ⛔ twice.
    await waitFor(() => expect(screen.getByTestId('fw-requests-stale')).toHaveTextContent(t('fw.requests.stale')));
    expect(screen.getByTestId('fw-requests-stale')).toHaveAttribute('role', 'alert');
    expect(screen.queryByTestId('fw-request-error')).toBeNull();
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
      events: [event({ event_type: 'field_worker_move_request.opened', occurred_at: '2026-11-08T05:00:00.000Z' })],
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
    // ⚠ Cannot fail on its own (R4-10): nothing the regex names is seeded - the strict worker DTO (`FieldWorkerMoveRequestWorker`, no reason
    // or officer field) is the real guard; the RP-16 leg below seeds the one reason the payload can carry.
    expect(detail.textContent).not.toMatch(/under_review|review|reason/i);
    expect(getFieldWorkerMoveRequest).toHaveBeenCalledTimes(1);
  });

  // RP-16 — the leg above bans words from a fixture that carries none: the worker block's DTO is `.strict()` and has no reason or officer field
  // (that DTO, not this screen, is the real guard — a mocked client never parses it), and its event has `refusal_reason: null`. The ONE reason
  // the payload can carry is a refused event's `refusal_reason`; the detail shows the event's NAME and time only, so seed one and assert it is
  // printed nowhere, as a code or as its label. That is the SCREEN's choice, stricter than the rulings: `-458` AD9 allows the reason on the
  // request's own timeline, and `-460` item 1 bans it from the WORK HISTORY only (R4-10 - the citation corrected).
  it('RP-16: a refused event that CARRIES a refusal reason prints neither the code nor its label — the detail names the event and its time only', async () => {
    listFieldWorkerMoveRequests.mockResolvedValue({ items: [req()], next_cursor: null });
    getFieldWorkerMoveRequest.mockResolvedValue({
      request: req({ state: 'refused', refusal_reason: 'request_incomplete' }),
      events: [event({ event_version: 2, event_type: 'field_worker_move_request.refused', occurred_at: '2026-11-08T07:00:00.000Z', refusal_reason: 'request_incomplete' })],
      worker: { field_worker_id: req().field_worker_id, name: 'Ramesh Kumar', current_state: 'active', registered_on: null, active_since: null, districts: [], suspensions: [], history_truncated: false, members_onboarded: null },
    });
    renderWith(<MoveRequestsPage pariwarId={P} />);
    await choose('Gaya');
    fireEvent.click(await screen.findByTestId('fw-request-view'));
    const events = await screen.findByTestId('fw-request-detail-events');
    expect(events).toHaveTextContent(/Refused/); // CONTROL: the refused event IS rendered, so an absent reason is the screen's choice
    expect(events.textContent).not.toContain('request_incomplete');
    expect(events.textContent).not.toContain(t('fw.refusal.request_incomplete'));
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
    listFieldWorkerNotices.mockClear();
    const client = createQueryClient();
    render(
      <QueryClientProvider client={client}>
        <FieldWorkerNav pariwarId={P} current="find" />
      </QueryClientProvider>,
    );
    // CR50 / RP-1 — the read must have SETTLED (rejected) before the plain link means anything: the loading state is plain too. ⛔ A mock's
    // `results[0].type` is 'return' the moment it is CALLED (a rejection is a returned promise), so wait on the QUERY's own state, then let the
    // observer's notification (a macrotask) reach the component.
    await waitFor(() => expect(client.getQueryState(fieldWorkerNoticesKey(P))?.status).toBe('error'));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });
    expect(screen.getByTestId('fw-nav-requests')).toHaveTextContent(/^Move requests$/);
    expect(listFieldWorkerNotices).toHaveBeenCalledTimes(1); // no retry, no polling
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

// ── Code review 2026-11-09 (CR42-CR50) ──────────────────────────────────────────────────────────────────────────────────────

const GAYA = 'Gaya';
/** Choose `district` in the Ask form's select — once its options have LOADED (the districts read is async). */
async function chooseTo(district: string): Promise<void> {
  const select = await screen.findByTestId('fw-ask-to');
  await waitFor(() => expect(within(select).getByText(district)).toBeInTheDocument());
  fireEvent.change(select, { target: { value: district } });
}
const colleague = (o: Partial<Record<string, unknown>> = {}) =>
  req({ move_request_id: '00000000-0000-4000-8000-0000000000c1', name: 'Colleague Worker', from_district: 'Gaya', to_district: 'Patna', counterpart_district: 'Patna', opened_by: OTHER, ...o });

describe('CR42 — a request that moved on is said by the page, not by the row that is about to leave', () => {
  it('Accept meets a 409 not_open and the refreshed list no longer holds the request: the row is GONE and the alert is still there', async () => {
    let reads = 0;
    listFieldWorkerMoveRequests.mockImplementation(async (_p: string, o: { district?: string }) =>
      o.district === GAYA && reads++ === 0 ? { items: [req()], next_cursor: null } : { items: [], next_cursor: null },
    );
    actOnFieldWorkerMoveRequest.mockRejectedValueOnce(new ApiError(409, 'field_worker.move_request_not_open', 'gone'));
    renderWith(<MoveRequestsPage pariwarId={P} />);
    await choose(GAYA);
    fireEvent.click(await screen.findByTestId('fw-request-accept'));
    await waitFor(() => expect(screen.queryByTestId('fw-request')).toBeNull()); // the refetch removed it
    expect(screen.getByTestId('fw-requests-stale')).toHaveTextContent(t('fw.requests.stale'));
    expect(screen.getByTestId('fw-requests-stale')).toHaveAttribute('role', 'alert');
    expect(screen.queryByTestId('fw-request-error')).toBeNull();
  });

  it('the line is cleared when the next act starts', async () => {
    listFieldWorkerMoveRequests.mockResolvedValue({ items: [req(), req({ move_request_id: '00000000-0000-4000-8000-0000000000a2', name: 'Second Worker' })], next_cursor: null });
    // The SECOND act stays in flight: the line must go when it STARTS (a success would clear it too, and prove nothing).
    actOnFieldWorkerMoveRequest.mockRejectedValueOnce(new ApiError(409, 'field_worker.move_request_not_open', 'gone')).mockReturnValueOnce(new Promise(() => undefined));
    renderWith(<MoveRequestsPage pariwarId={P} />);
    await choose(GAYA);
    fireEvent.click((await screen.findAllByTestId('fw-request-accept'))[0]!);
    await waitFor(() => expect(screen.getByTestId('fw-requests-stale')).toHaveTextContent(t('fw.requests.stale')));
    fireEvent.click((await screen.findAllByTestId('fw-request-accept'))[1]!);
    await waitFor(() => expect(actOnFieldWorkerMoveRequest).toHaveBeenCalledTimes(2));
    expect(screen.getByTestId('fw-requests-stale')).toBeEmptyDOMElement();
  });
});

describe('CR43 — one row per request, nothing returned is hidden, an empty section never says "nothing" while pages remain', () => {
  it('"All districts": a Pariwar Admin’s OWN escalated request is ONE row, with Close and Withdraw, and a Find link — ⛔ again under "Your requests"', async () => {
    listFieldWorkerMoveRequests.mockResolvedValue({ items: [req({ state: 'escalated', opened_by: ME })], next_cursor: null });
    renderWith(<MoveRequestsPage pariwarId={P} />);
    const waiting = await screen.findByTestId('fw-requests-waiting');
    await waitFor(() => expect(within(waiting).getAllByTestId('fw-request')).toHaveLength(1));
    expect(screen.getAllByTestId('fw-request')).toHaveLength(1);
    expect(within(waiting).getByTestId('fw-request-close')).toBeInTheDocument();
    expect(within(waiting).getByTestId('fw-request-withdraw')).toBeInTheDocument();
    expect(within(waiting).getByTestId('fw-request-find')).toHaveAttribute('href', '/p/$pariwarId/field-workers');
    expect(within(screen.getByTestId('fw-requests-mine')).queryByTestId('fw-request')).toBeNull();
  });

  it('a request that is neither waiting for me nor mine (a colleague’s) is shown under "Other open requests", View only', async () => {
    listFieldWorkerMoveRequests.mockImplementation(async (_p: string, o: { district?: string }) => (o.district === GAYA ? { items: [colleague()], next_cursor: null } : { items: [], next_cursor: null }));
    renderWith(<MoveRequestsPage pariwarId={P} />);
    await choose(GAYA);
    const other = await screen.findByTestId('fw-requests-other');
    expect(within(other).getByText(/Colleague Worker: Gaya to Patna/)).toBeInTheDocument();
    expect(within(other).getByTestId('fw-request-view')).toBeInTheDocument();
    expect(within(other).queryByTestId('fw-request-accept')).toBeNull();
    expect(within(other).queryByTestId('fw-request-withdraw')).toBeNull();
    expect(within(screen.getByTestId('fw-requests-waiting')).queryByTestId('fw-request')).toBeNull();
  });

  it('an empty "waiting" section says "none LOADED so far" while a page remains; Load more brings the request in and says how many came', async () => {
    listFieldWorkerMoveRequests.mockImplementation(async (_p: string, o: { district?: string; cursor?: string }) => {
      if (o.district !== GAYA) return { items: [], next_cursor: null };
      return o.cursor === undefined ? { items: [colleague()], next_cursor: 'c2' } : { items: [req()], next_cursor: null };
    });
    renderWith(<MoveRequestsPage pariwarId={P} />);
    await choose(GAYA);
    const waiting = await screen.findByTestId('fw-requests-waiting');
    await waitFor(() => expect(within(waiting).getByText(t('fw.requests.waitingMore'))).toBeInTheDocument());
    expect(within(waiting).queryByText(t('fw.requests.waitingEmpty'))).toBeNull();
    fireEvent.click(screen.getByTestId('fw-requests-more'));
    await waitFor(() => expect(within(waiting).getAllByTestId('fw-request')).toHaveLength(1));
    expect(within(waiting).getByText(/Ramesh Kumar: Patna to Gaya/)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId('fw-requests-status')).toHaveTextContent(t('fw.requests.moreShownOne'))); // RP-11 — "1 more request shown."
    expect(screen.queryByTestId('fw-requests-more')).toBeNull(); // no page left
    expect(listFieldWorkerMoveRequests).toHaveBeenLastCalledWith(P, { state: 'open', district: GAYA, cursor: 'c2' });
  });

  it('rows already loaded STAY when a later page fails: the error is said above them and Load more is still there', async () => {
    listFieldWorkerMoveRequests.mockImplementation(async (_p: string, o: { district?: string; cursor?: string }) => {
      if (o.district !== GAYA) return { items: [], next_cursor: null };
      if (o.cursor === undefined) return { items: [req()], next_cursor: 'c2' };
      throw new ApiError(503, 'http.503', 'down');
    });
    renderWith(<MoveRequestsPage pariwarId={P} />);
    await choose(GAYA);
    await screen.findByText(/Ramesh Kumar: Patna to Gaya/);
    fireEvent.click(screen.getByTestId('fw-requests-more'));
    expect(await screen.findByTestId('fw-requests-error')).toBeInTheDocument();
    expect(screen.getByText(/Ramesh Kumar: Patna to Gaya/)).toBeInTheDocument(); // ⛔ blanked
    expect(screen.getByTestId('fw-requests-more')).toBeInTheDocument();
  });
});

describe('CR49 — the first view of a District Admin is quiet; a chosen district gets its own line', () => {
  it('the all-districts 403 is a status (⛔ an alert on every visit); after a district is chosen a 403 names the district and IS an alert', async () => {
    listFieldWorkerMoveRequests.mockRejectedValue(new ApiError(403, 'authz.forbidden', 'no'));
    renderWith(<MoveRequestsPage pariwarId={P} />);
    const first = await screen.findByTestId('fw-requests-error');
    expect(first).toHaveAttribute('role', 'status');
    expect(first).toHaveTextContent(t('fw.requests.noAccess'));
    await choose('Nalanda');
    await waitFor(() => expect(screen.getByTestId('fw-requests-error')).toHaveAttribute('role', 'alert'));
    expect(screen.getByTestId('fw-requests-error')).toHaveTextContent('You do not manage Nalanda. Choose a district you manage.');
  });

  it('the detail of an ENDED worker reads "from", ⛔ "since" (the worker is not there); no districts ⇒ no "Districts worked in" heading', async () => {
    listFieldWorkerMoveRequests.mockResolvedValue({ items: [req()], next_cursor: null });
    const worker = { field_worker_id: req().field_worker_id, name: 'Ramesh Kumar', current_state: 'terminated', registered_on: '2026-01-02', active_since: '2026-01-03', districts: [{ district: 'Patna', from: '2026-01-02', to: null }], suspensions: [{ from: '2026-04-01', to: null }], history_truncated: false, members_onboarded: null };
    getFieldWorkerMoveRequest.mockResolvedValueOnce({ request: req(), events: [], worker });
    renderWith(<MoveRequestsPage pariwarId={P} />);
    await choose(GAYA);
    fireEvent.click(await screen.findByTestId('fw-request-view'));
    const detail = await screen.findByTestId('fw-request-detail');
    expect(within(detail).getByTestId('fw-request-detail-districts')).toHaveTextContent(/Patna: from 2 Jan 2026/);
    expect(within(detail).getByTestId('fw-request-detail-districts')).not.toHaveTextContent(/since/);
    expect(within(detail).getByTestId('fw-request-detail-suspensions')).toHaveTextContent(/^From /);
    fireEvent.click(screen.getByTestId('fw-request-view')); // Hide
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20)); // the detail query is dropped on close (`gcTime: 0`)
    });
    getFieldWorkerMoveRequest.mockResolvedValueOnce({ request: req(), events: [], worker: { ...worker, current_state: 'active', districts: [] } });
    fireEvent.click(screen.getByTestId('fw-request-view'));
    const again = await screen.findByTestId('fw-request-detail');
    expect(within(again).queryByTestId('fw-request-detail-districts')).toBeNull();
    expect(within(again).queryByText(t('fw.requests.detail.districts'))).toBeNull();
  });
});

describe('CR44 — the notices page, say which worker, and the nav says there is more', () => {
  it('Load more notices brings the older page (its cursor sent); the unseen ones on it are marked seen too', async () => {
    listFieldWorkerMoveRequests.mockResolvedValue({ items: [], next_cursor: null });
    const older = notice({ notice_id: '00000000-0000-4000-8000-0000000000d1', kind: 'move_request_escalated', seen_at: null });
    listFieldWorkerNotices.mockImplementation(async (_p: string, o?: { cursor?: string }) =>
      o?.cursor === undefined ? { items: [notice({ seen_at: '2026-11-08T07:00:00.000Z' })], next_cursor: 'n2' } : { items: [older], next_cursor: null },
    );
    renderWith(<MoveRequestsPage pariwarId={P} />);
    await screen.findAllByTestId('fw-notice');
    expect(screen.getAllByTestId('fw-notice')).toHaveLength(1);
    fireEvent.click(screen.getByTestId('fw-notices-more'));
    await waitFor(() => expect(screen.getAllByTestId('fw-notice')).toHaveLength(2));
    expect(listFieldWorkerNotices).toHaveBeenLastCalledWith(P, { cursor: 'n2' });
    await waitFor(() => expect(markFieldWorkerNoticesSeen).toHaveBeenCalledWith(P, [older.notice_id]));
    expect(screen.queryByTestId('fw-notices-more')).toBeNull();
  });

  it('a notice about a request has a View that opens the audited detail — which names the worker; a notice about no request has none', async () => {
    listFieldWorkerMoveRequests.mockResolvedValue({ items: [], next_cursor: null });
    listFieldWorkerNotices.mockResolvedValue({
      items: [notice({ seen_at: '2026-11-08T07:00:00.000Z' }), notice({ notice_id: '00000000-0000-4000-8000-0000000000d2', kind: 'moved_by_pariwar_admin', move_request_id: null, seen_at: '2026-11-08T07:00:00.000Z' })],
      next_cursor: null,
    });
    getFieldWorkerMoveRequest.mockResolvedValue({
      request: req(),
      events: [],
      worker: { field_worker_id: req().field_worker_id, name: 'Ramesh Kumar', current_state: 'active', registered_on: null, active_since: null, districts: [{ district: 'Gaya', from: '2026-03-10', to: null }], suspensions: [], history_truncated: false, members_onboarded: null },
    });
    renderWith(<MoveRequestsPage pariwarId={P} />);
    const items = await screen.findAllByTestId('fw-notice');
    expect(items).toHaveLength(2);
    expect(within(items[1]!).queryByTestId('fw-notice-view')).toBeNull();
    expect(items[0]).not.toHaveTextContent('Ramesh Kumar'); // the notice itself names no one (AD9)
    fireEvent.click(within(items[0]!).getByTestId('fw-notice-view'));
    expect(await within(items[0]!).findByTestId('fw-request-detail')).toHaveTextContent('About Ramesh Kumar');
    expect(getFieldWorkerMoveRequest).toHaveBeenCalledWith(P, notice().move_request_id);
    expect(getFieldWorkerMoveRequest).toHaveBeenCalledTimes(1);
  });

  it('the nav says "N+" when the first page is all unseen and more pages exist', async () => {
    listFieldWorkerNotices.mockResolvedValueOnce({ items: [notice(), notice({ notice_id: '00000000-0000-4000-8000-0000000000c4' })], next_cursor: 'n2' });
    renderWith(<FieldWorkerNav pariwarId={P} current="find" />);
    await waitFor(() => expect(screen.getByTestId('fw-nav-requests')).toHaveTextContent('Move requests (2+ new)'));
  });
});

describe('CR45 — an OPEN moves nobody: the worker lists are not refetched; an ACCEPT moves one: they are', () => {
  it('invalidations, by key', async () => {
    const client = createQueryClient();
    const spy = vi.spyOn(client, 'invalidateQueries');
    const keys = () => spy.mock.calls.map((c) => JSON.stringify((c[0] as { queryKey: unknown }).queryKey));
    openFieldWorkerMoveRequest.mockResolvedValueOnce(result({ state: 'pending', worker_district: 'Patna' }));
    const ask = render(
      <QueryClientProvider client={client}>
        <AskToMove pariwarId={P} fieldWorkerId="w" name="Ramesh Kumar" worker={{ current_state: 'active', district: 'Patna', created_at: '2026-11-04T05:00:00.000Z' }} />
      </QueryClientProvider>,
    );
    fireEvent.click(screen.getByTestId('fw-ask-open'));
    await chooseTo('Gaya');
    fireEvent.click(screen.getByTestId('fw-ask-send'));
    await waitFor(() => expect(screen.getByTestId('fw-ask-announce')).toBeInTheDocument());
    expect(keys()).toContain(JSON.stringify(fieldWorkerNoticesKey(P))); // the notices DO refresh
    expect(keys()).not.toContain(JSON.stringify(fieldWorkerListsKey(P))); // the worker lists do NOT
    ask.unmount();
    spy.mockClear();
    listFieldWorkerMoveRequests.mockResolvedValue({ items: [req()], next_cursor: null });
    actOnFieldWorkerMoveRequest.mockResolvedValueOnce(result());
    render(
      <QueryClientProvider client={client}>
        <MoveRequestsPage pariwarId={P} />
      </QueryClientProvider>,
    );
    await choose(GAYA);
    fireEvent.click(await screen.findByTestId('fw-request-accept'));
    await waitFor(() => expect(keys()).toContain(JSON.stringify(fieldWorkerListsKey(P))));
  });
});

describe('CR46 — an accept that meets a destination no longer on the list says so, and does not pretend it can be corrected', () => {
  it('422 district_unknown on Accept: its own line on the row, not `stale`, the button stays', async () => {
    listFieldWorkerMoveRequests.mockResolvedValue({ items: [req()], next_cursor: null });
    actOnFieldWorkerMoveRequest.mockRejectedValueOnce(new ApiError(422, 'field_worker.district_unknown', 'x'));
    renderWith(<MoveRequestsPage pariwarId={P} />);
    await choose(GAYA);
    fireEvent.click(await screen.findByTestId('fw-request-accept'));
    expect(await screen.findByTestId('fw-request-error')).toHaveTextContent(t('fw.requests.acceptDistrictUnknown'));
    expect(screen.getByTestId('fw-requests-stale')).toBeEmptyDOMElement();
    expect(screen.getByTestId('fw-request-accept')).toBeInTheDocument();
  });

  it('a 5xx on the detail can be tried again', async () => {
    listFieldWorkerMoveRequests.mockResolvedValue({ items: [req()], next_cursor: null });
    getFieldWorkerMoveRequest.mockRejectedValueOnce(new ApiError(503, 'http.503', 'down')).mockResolvedValueOnce({
      request: req(),
      events: [],
      worker: { field_worker_id: req().field_worker_id, name: 'Ramesh Kumar', current_state: 'active', registered_on: null, active_since: null, districts: [], suspensions: [], history_truncated: false, members_onboarded: null },
    });
    renderWith(<MoveRequestsPage pariwarId={P} />);
    await choose(GAYA);
    fireEvent.click(await screen.findByTestId('fw-request-view'));
    const err = await screen.findByTestId('fw-request-detail-error');
    fireEvent.click(within(err).getByRole('button', { name: t('fw.retry') }));
    expect(await screen.findByTestId('fw-request-detail')).toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled(); // CONTROL: a 5xx is not a sign-out
  });

  // RP-2 — each surface that can meet a 401 goes to sign-in (it said "Redirecting" and nothing redirected): the hook's call is what these legs see.
  it('a 401 on the detail signs the officer back in', async () => {
    listFieldWorkerMoveRequests.mockResolvedValue({ items: [req()], next_cursor: null });
    getFieldWorkerMoveRequest.mockRejectedValueOnce(new ApiError(401, 'auth.session_required', 'x'));
    renderWith(<MoveRequestsPage pariwarId={P} />);
    await choose(GAYA);
    fireEvent.click(await screen.findByTestId('fw-request-view'));
    await screen.findByTestId('fw-request-detail-error');
    expect(navigate).toHaveBeenCalledWith({ to: '/login' });
  });

  it('the notices: a 401 signs the officer back in; a 5xx says so and a click on Try again reads them again', async () => {
    listFieldWorkerMoveRequests.mockResolvedValue({ items: [], next_cursor: null });
    listFieldWorkerNotices.mockRejectedValueOnce(new ApiError(503, 'http.503', 'down')).mockResolvedValueOnce({ items: [notice({ seen_at: '2026-11-08T07:00:00.000Z' })], next_cursor: null });
    const view = renderWith(<MoveRequestsPage pariwarId={P} />);
    const err = await screen.findByTestId('fw-notices-error');
    expect(navigate).not.toHaveBeenCalled(); // CONTROL: a 5xx is not a sign-out
    fireEvent.click(within(err).getByRole('button', { name: t('fw.retry') }));
    expect(await screen.findByTestId('fw-notice')).toBeInTheDocument();
    expect(listFieldWorkerNotices).toHaveBeenCalledTimes(2);
    view.unmount();
    listFieldWorkerNotices.mockReset();
    listFieldWorkerNotices.mockRejectedValue(new ApiError(401, 'auth.session_required', 'x'));
    renderWith(<MoveRequestsPage pariwarId={P} />);
    await screen.findByTestId('fw-notices-error');
    expect(navigate).toHaveBeenCalledWith({ to: '/login' });
  });
});

describe('CR47 — focus and the Refuse form', () => {
  it('Refuse takes focus into its reason, is named for the worker, says what is missing, and Cancel / Escape close it with focus back on "Refuse"', async () => {
    listFieldWorkerMoveRequests.mockResolvedValue({ items: [req()], next_cursor: null });
    renderWith(<MoveRequestsPage pariwarId={P} />);
    await choose(GAYA);
    const open = await screen.findByTestId('fw-request-refuse-open');
    fireEvent.click(open);
    expect(screen.getByTestId('fw-request-refuse-reason')).toHaveFocus();
    expect(open).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('form', { name: /Refuse for Ramesh Kumar/ })).toBeInTheDocument();
    expect(screen.getByTestId('fw-request-refuse-reason')).toHaveAttribute('aria-required', 'true');
    fireEvent.click(screen.getByTestId('fw-request-refuse')); // nothing chosen
    expect(screen.getByTestId('fw-request-need-reason')).toHaveTextContent(t('fw.requests.refuse.needReason'));
    expect(actOnFieldWorkerMoveRequest).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('fw-request-refuse-cancel'));
    expect(screen.queryByTestId('fw-request-refuse-form')).toBeNull();
    expect(open).toHaveFocus();
    expect(open).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(open);
    fireEvent.keyDown(screen.getByTestId('fw-request-refuse-form'), { key: 'Escape' });
    expect(screen.queryByTestId('fw-request-refuse-form')).toBeNull();
    expect(open).toHaveFocus();
  });

  it('after an act the row leaves the list: focus goes to the page’s status region, ⛔ the body; "Saving…" is in the row’s status', async () => {
    listFieldWorkerMoveRequests.mockResolvedValue({ items: [req()], next_cursor: null });
    let release: (v: unknown) => void = () => undefined;
    actOnFieldWorkerMoveRequest.mockReturnValueOnce(new Promise((r) => (release = r)));
    renderWith(<MoveRequestsPage pariwarId={P} />);
    await choose(GAYA);
    fireEvent.click(await screen.findByTestId('fw-request-accept'));
    await waitFor(() => expect(screen.getByTestId('fw-request-status')).toHaveTextContent(t('fw.requests.saving')));
    await act(async () => release(result()));
    await waitFor(() => expect(screen.getByTestId('fw-requests-status')).toHaveFocus());
  });

  it('Ask to move: focus goes into the select, and back on "Ask to move" after Cancel and after a send; a press with nothing chosen says so', async () => {
    openFieldWorkerMoveRequest.mockResolvedValue(result({ state: 'pending', worker_district: 'Patna' }));
    renderWith(<AskToMove pariwarId={P} fieldWorkerId="w" name="Ramesh Kumar" worker={{ current_state: 'active', district: 'Patna', created_at: '2026-11-04T05:00:00.000Z' }} />);
    fireEvent.click(screen.getByTestId('fw-ask-open'));
    const select = await screen.findByTestId('fw-ask-to');
    await waitFor(() => expect(select).toHaveFocus());
    fireEvent.click(screen.getByTestId('fw-ask-send')); // nothing chosen
    expect(screen.getByTestId('fw-ask-need-to')).toHaveTextContent(t('fw.ask.needTo'));
    fireEvent.click(screen.getByTestId('fw-ask-cancel'));
    await waitFor(() => expect(screen.getByTestId('fw-ask-open')).toHaveFocus());
    fireEvent.click(screen.getByTestId('fw-ask-open'));
    await chooseTo('Gaya');
    fireEvent.click(screen.getByTestId('fw-ask-send'));
    await waitFor(() => expect(screen.getByTestId('fw-ask-announce')).toBeInTheDocument());
    await waitFor(() => expect(screen.getByTestId('fw-ask-open')).toHaveFocus());
  });
});

describe('CR48 — Ask to move, per worker', () => {
  // RP-15 — "another worker gets a FRESH form" is pinned through the Find page, where it is true (`field-worker-find-page.test.tsx`): the panel's
  // `WorkerDetail` is keyed by the open worker, so a `key` on `AskToMove` itself was a no-op and the two legs that "proved" it (a source-text
  // regex; a harness with its own `key`) could not fail on behaviour. They are gone.
  const w = { current_state: 'active' as const, district: 'Patna', created_at: '2026-11-04T05:00:00.000Z' };

  it('a 409 that says the worker moved or ended meanwhile WITHDRAWS the form, keeps its line, TAKES FOCUS onto it (RP-4) and tells the panel (RP-6)', async () => {
    const onStale = vi.fn();
    openFieldWorkerMoveRequest.mockRejectedValueOnce(new ApiError(409, 'field_worker.illegal_transition', 'x'));
    renderWith(<AskToMove pariwarId={P} fieldWorkerId="w" name="Ramesh Kumar" worker={w} onStale={onStale} />);
    fireEvent.click(screen.getByTestId('fw-ask-open'));
    await chooseTo('Gaya');
    fireEvent.click(screen.getByTestId('fw-ask-send'));
    expect(await screen.findByTestId('fw-ask-stale')).toHaveTextContent(t('fw.ask.workerEnded'));
    expect(screen.queryByTestId('fw-ask-form')).toBeNull();
    expect(screen.queryByTestId('fw-ask-open')).toBeNull();
    expect(openFieldWorkerMoveRequest).toHaveBeenCalledTimes(1);
    // The Send button that held focus has unmounted with the form and "Ask to move" is withdrawn: focus goes to the line, ⛔ the body.
    await waitFor(() => expect(screen.getByTestId('fw-ask-stale')).toHaveFocus());
    expect(onStale).toHaveBeenCalledExactlyOnceWith('state');
  });

  it('R4-3: the form opened while the districts load, which then come back with no other district — focus goes to Cancel, ⛔ the body', async () => {
    let answer: (v: unknown) => void = () => undefined;
    getFieldWorkerDistricts.mockReset().mockReturnValueOnce(new Promise((r) => (answer = r)));
    renderWith(<AskToMove pariwarId={P} fieldWorkerId="w" name="Ramesh Kumar" worker={w} />);
    fireEvent.click(screen.getByTestId('fw-ask-open'));
    await waitFor(() => expect(screen.getByTestId('fw-ask-to')).toHaveFocus()); // the empty select, while the read runs
    await act(async () => answer({ districts: ['Patna'], districts_truncated: false })); // the worker's own district only
    expect(await screen.findByTestId('fw-ask-no-other')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId('fw-ask-cancel')).toHaveFocus());
  });

  it('a 409 `authorization_stale` (the worker was MOVED) tells the panel `moved`', async () => {
    const onStale = vi.fn();
    openFieldWorkerMoveRequest.mockRejectedValueOnce(new ApiError(409, 'field_worker.authorization_stale', 'x'));
    renderWith(<AskToMove pariwarId={P} fieldWorkerId="w" name="Ramesh Kumar" worker={w} onStale={onStale} />);
    fireEvent.click(screen.getByTestId('fw-ask-open'));
    await chooseTo('Gaya');
    fireEvent.click(screen.getByTestId('fw-ask-send'));
    expect(await screen.findByTestId('fw-ask-stale')).toHaveTextContent(t('fw.ask.moved'));
    expect(onStale).toHaveBeenCalledExactlyOnceWith('moved');
  });

  it('a refusal that is NOT stale (a 5xx) tells the panel nothing', async () => {
    const onStale = vi.fn();
    openFieldWorkerMoveRequest.mockRejectedValueOnce(new ApiError(503, 'http.503', 'down'));
    renderWith(<AskToMove pariwarId={P} fieldWorkerId="w" name="Ramesh Kumar" worker={w} onStale={onStale} />);
    fireEvent.click(screen.getByTestId('fw-ask-open'));
    await chooseTo('Gaya');
    fireEvent.click(screen.getByTestId('fw-ask-send'));
    expect(await screen.findByTestId('fw-ask-error')).toBeInTheDocument();
    expect(onStale).not.toHaveBeenCalled();
  });

  it('a failed districts read says so and can be tried again; a TRUNCATED one offers a field to type the district exactly', async () => {
    getFieldWorkerDistricts.mockRejectedValueOnce(new ApiError(503, 'http.503', 'down')).mockResolvedValueOnce({ districts: ['Gaya'], districts_truncated: true });
    openFieldWorkerMoveRequest.mockResolvedValueOnce(result({ state: 'pending', worker_district: 'Patna' }));
    renderWith(<AskToMove pariwarId={P} fieldWorkerId="w" name="Ramesh Kumar" worker={w} />);
    fireEvent.click(screen.getByTestId('fw-ask-open'));
    const err = await screen.findByTestId('fw-ask-districts-error');
    fireEvent.click(within(err).getByRole('button', { name: t('fw.retry') }));
    const typed = await screen.findByTestId('fw-ask-typed');
    fireEvent.change(typed, { target: { value: 'Muzaffarpur' } });
    fireEvent.click(screen.getByTestId('fw-ask-send'));
    await waitFor(() => expect(openFieldWorkerMoveRequest).toHaveBeenCalledWith(P, 'w', { from_district: 'Patna', to_district: 'Muzaffarpur' }, expect.any(String)));
  });
});

describe('CR50 — the acts that were only ever asserted present', () => {
  it('Withdraw (my own request) and Close (an escalated one, "All districts") are CLICKED: the act, the key, the outcome line', async () => {
    listFieldWorkerMoveRequests.mockImplementation(async (_p: string, o: { district?: string }) =>
      o.district === undefined ? { items: [req({ state: 'escalated' })], next_cursor: null } : { items: [req({ opened_by: ME, from_district: 'Gaya', to_district: 'Patna', counterpart_district: 'Patna' })], next_cursor: null },
    );
    actOnFieldWorkerMoveRequest.mockResolvedValueOnce(result({ state: 'closed' })).mockResolvedValueOnce(result({ state: 'withdrawn', worker_district: 'Gaya' }));
    renderWith(<MoveRequestsPage pariwarId={P} />);
    fireEvent.click(await screen.findByTestId('fw-request-close'));
    await waitFor(() => expect(screen.getByTestId('fw-requests-status')).toHaveTextContent('You closed the request for Ramesh Kumar.'));
    expect(actOnFieldWorkerMoveRequest).toHaveBeenLastCalledWith(P, req().move_request_id, 'close', expect.any(String));
    await choose(GAYA);
    fireEvent.click(await screen.findByTestId('fw-request-withdraw'));
    await waitFor(() => expect(screen.getByTestId('fw-requests-status')).toHaveTextContent('You withdrew the request for Ramesh Kumar.'));
    expect(actOnFieldWorkerMoveRequest).toHaveBeenLastCalledWith(P, req().move_request_id, 'withdraw', expect.any(String));
    // Two outcomes are BOTH said (the second did not overwrite the first).
    expect(screen.getByTestId('fw-requests-status')).toHaveTextContent('You closed the request for Ramesh Kumar.');
  });
});

// ── Review of the round-1 patches (RP-3 … RP-14; 2026-11-10) ────────────────────────────────────────────────────────────────

const detailOf = () => ({
  request: req(),
  events: [],
  worker: { field_worker_id: req().field_worker_id, name: 'Ramesh Kumar', current_state: 'active', registered_on: null, active_since: null, districts: [], suspensions: [], history_truncated: false, members_onboarded: null },
});
const SEEN = '2026-11-08T07:00:00.000Z';

describe('RP-3 — a 404 `pariwar.not_found` says the Pariwar is not found, ⛔ the role sentence of a 403', () => {
  it('the requests page: an alert with the Pariwar line and Try again — with all districts and with a district chosen', async () => {
    listFieldWorkerMoveRequests.mockRejectedValue(new ApiError(404, 'pariwar.not_found', 'x'));
    renderWith(<MoveRequestsPage pariwarId={P} />);
    const first = await screen.findByTestId('fw-requests-error');
    expect(first).toHaveTextContent(t('fw.err.noPariwar'));
    expect(first).toHaveAttribute('role', 'alert'); // ⛔ the quiet status a District Admin's first view gets for a 403
    expect(first.textContent).not.toMatch(/district you manage/);
    expect(within(first).getByRole('button', { name: t('fw.retry') })).toBeInTheDocument();
    await choose('Nalanda');
    await waitFor(() => expect(screen.getByTestId('fw-requests-error')).toHaveTextContent(t('fw.err.noPariwar')));
    expect(screen.getByTestId('fw-requests-error').textContent).not.toMatch(/do not manage/);
  });
});

describe('RP-5 — a request that is no longer there', () => {
  it('Accept meets a 404: the lists REFRESH (so "the list has been refreshed" is true), the row leaves, and the page says it', async () => {
    let reads = 0;
    listFieldWorkerMoveRequests.mockImplementation(async (_p: string, o: { district?: string }) =>
      o.district === GAYA && reads++ === 0 ? { items: [req()], next_cursor: null } : { items: [], next_cursor: null },
    );
    actOnFieldWorkerMoveRequest.mockRejectedValueOnce(new ApiError(404, 'field_worker.move_request_not_found', 'gone'));
    renderWith(<MoveRequestsPage pariwarId={P} />);
    await choose(GAYA);
    fireEvent.click(await screen.findByTestId('fw-request-accept'));
    await waitFor(() => expect(screen.queryByTestId('fw-request')).toBeNull()); // the refetch removed it
    expect(screen.getByTestId('fw-requests-stale')).toHaveTextContent(t('fw.requests.gone'));
    expect(screen.getByTestId('fw-requests-stale')).toHaveAttribute('role', 'alert');
  });

  it('a detail read that finds no request says only that — ⛔ "the list has been refreshed", nothing refreshes — and offers no retry', async () => {
    listFieldWorkerMoveRequests.mockResolvedValue({ items: [req()], next_cursor: null });
    getFieldWorkerMoveRequest.mockRejectedValue(new ApiError(404, 'field_worker.move_request_not_found', 'gone'));
    renderWith(<MoveRequestsPage pariwarId={P} />);
    await choose(GAYA);
    fireEvent.click(await screen.findByTestId('fw-request-view'));
    const err = await screen.findByTestId('fw-request-detail-error');
    expect(err).toHaveTextContent(t('fw.requests.detail.gone'));
    expect(err.textContent).not.toMatch(/refreshed/i);
    expect(within(err).queryByRole('button')).toBeNull();
  });
});

describe('RP-7 — a notice offers "View" only where its recipient can read the request', () => {
  it('a `moved_by_pariwar_admin` notice that names the request it superseded has NO View (its recipients need not be an end); the kinds that go to an end do', async () => {
    listFieldWorkerMoveRequests.mockResolvedValue({ items: [], next_cursor: null });
    listFieldWorkerNotices.mockResolvedValue({
      items: [
        notice({ seen_at: SEEN }), // accepted
        notice({ notice_id: '00000000-0000-4000-8000-0000000000d3', kind: 'moved_by_pariwar_admin', seen_at: SEEN }), // the default move_request_id: the superseded request
        notice({ notice_id: '00000000-0000-4000-8000-0000000000d4', kind: 'move_request_superseded', seen_at: SEEN }),
      ],
      next_cursor: null,
    });
    renderWith(<MoveRequestsPage pariwarId={P} />);
    const items = await screen.findAllByTestId('fw-notice');
    expect(items).toHaveLength(3);
    expect(within(items[0]!).getByTestId('fw-notice-view')).toBeInTheDocument();
    expect(within(items[1]!).queryByTestId('fw-notice-view')).toBeNull();
    expect(within(items[2]!).getByTestId('fw-notice-view')).toBeInTheDocument();
  });
});

describe('RP-9 — "Refuse" pressed while a refusal is in flight', () => {
  it('does not close the form or clear the reason; a failure then still has the form to retry from', async () => {
    listFieldWorkerMoveRequests.mockResolvedValue({ items: [req()], next_cursor: null });
    let fail: (e: unknown) => void = () => undefined;
    actOnFieldWorkerMoveRequest.mockReturnValueOnce(new Promise((_resolve, reject) => (fail = reject)));
    renderWith(<MoveRequestsPage pariwarId={P} />);
    await choose(GAYA);
    const open = await screen.findByTestId('fw-request-refuse-open');
    fireEvent.click(open);
    fireEvent.change(screen.getByTestId('fw-request-refuse-reason'), { target: { value: 'no_capacity' } });
    fireEvent.click(screen.getByTestId('fw-request-refuse'));
    await waitFor(() => expect(screen.getByTestId('fw-request-status')).toHaveTextContent(t('fw.requests.saving')));
    fireEvent.click(open); // the opener, with the act in flight
    expect(screen.getByTestId('fw-request-refuse-form')).toBeInTheDocument();
    expect((screen.getByTestId('fw-request-refuse-reason') as HTMLSelectElement).value).toBe('no_capacity');
    await act(async () => fail(new ApiError(503, 'http.503', 'down')));
    expect(await screen.findByTestId('fw-request-error')).toBeInTheDocument();
    expect(screen.getByTestId('fw-request-refuse-form')).toBeInTheDocument();
  });
});

describe('RP-10 — "Load more notices" says how many came', () => {
  it('"1 more notice shown." and "2 more notices shown.", in a status region mounted with the list and empty until then', async () => {
    listFieldWorkerMoveRequests.mockResolvedValue({ items: [], next_cursor: null });
    listFieldWorkerNotices.mockImplementation(async (_p: string, o?: { cursor?: string }) => {
      if (o?.cursor === undefined) return { items: [notice({ seen_at: SEEN })], next_cursor: 'n2' };
      if (o.cursor === 'n2') return { items: [notice({ notice_id: '00000000-0000-4000-8000-0000000000e1', seen_at: SEEN })], next_cursor: 'n3' };
      return { items: [notice({ notice_id: '00000000-0000-4000-8000-0000000000e2', seen_at: SEEN }), notice({ notice_id: '00000000-0000-4000-8000-0000000000e3', seen_at: SEEN })], next_cursor: null };
    });
    renderWith(<MoveRequestsPage pariwarId={P} />);
    await screen.findAllByTestId('fw-notice');
    const status = screen.getByTestId('fw-notices-status');
    expect(status).toHaveAttribute('role', 'status');
    expect(status).toBeEmptyDOMElement();
    fireEvent.click(screen.getByTestId('fw-notices-more'));
    await waitFor(() => expect(status).toHaveTextContent(t('fw.notices.moreShownOne')));
    fireEvent.click(await screen.findByTestId('fw-notices-more'));
    await waitFor(() => expect(status).toHaveTextContent(t('fw.notices.moreShown', { count: 2 })));
  });
});

describe('RP-11 / RP-12 — "Load more" on the requests page', () => {
  it('a page of two says "2 more requests shown." (the plural keeps its form)', async () => {
    listFieldWorkerMoveRequests.mockImplementation(async (_p: string, o: { district?: string; cursor?: string }) => {
      if (o.district !== GAYA) return { items: [], next_cursor: null };
      return o.cursor === undefined ? { items: [colleague()], next_cursor: 'c2' } : { items: [req(), req({ move_request_id: '00000000-0000-4000-8000-0000000000a5', name: 'Second Worker' })], next_cursor: null };
    });
    renderWith(<MoveRequestsPage pariwarId={P} />);
    await choose(GAYA);
    fireEvent.click(await screen.findByTestId('fw-requests-more'));
    await waitFor(() => expect(screen.getByTestId('fw-requests-status')).toHaveTextContent(t('fw.requests.moreShown', { count: 2 })));
  });

  it('a "Load more" still in flight when another district is chosen says nothing for the list it was counting', async () => {
    let release: (v: unknown) => void = () => undefined;
    listFieldWorkerMoveRequests.mockImplementation(async (_p: string, o: { district?: string; cursor?: string }) => {
      if (o.district === GAYA && o.cursor === 'c2') return new Promise((r) => (release = r));
      return o.district === GAYA ? { items: [colleague()], next_cursor: 'c2' } : { items: [], next_cursor: null };
    });
    renderWith(<MoveRequestsPage pariwarId={P} />);
    await choose(GAYA);
    fireEvent.click(await screen.findByTestId('fw-requests-more'));
    await waitFor(() => expect(listFieldWorkerMoveRequests).toHaveBeenLastCalledWith(P, { state: 'open', district: GAYA, cursor: 'c2' }));
    await choose('Nalanda'); // the officer moves on
    await act(async () => release({ items: [req()], next_cursor: null }));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });
    expect(screen.getByTestId('fw-requests-status')).toBeEmptyDOMElement();
  });

  // R4-1 — TanStack v5: an invalidation cancels a "Load more" in flight and resolves it with the refetched list; a "Load more" cancels a
  // refetch in flight and extends the OLD pages.
  it('R4-1: an act’s refresh landing during a "Load more" says no count — no page came', async () => {
    const page = (id: string) => req({ move_request_id: id, opened_by: ME, name: `W ${id.slice(-2)}` });
    listFieldWorkerMoveRequests.mockImplementation(async (_p: string, o: { district?: string; cursor?: string }) => {
      if (o.district !== GAYA) return { items: [], next_cursor: null };
      if (o.cursor === 'c2') return new Promise(() => undefined); // never answers: the refresh cancels it
      return { items: [page('00000000-0000-4000-8000-0000000001a1')], next_cursor: 'c2' };
    });
    actOnFieldWorkerMoveRequest.mockResolvedValueOnce(result({ state: 'withdrawn', worker_district: 'Patna' }));
    renderWith(<MoveRequestsPage pariwarId={P} />);
    await choose(GAYA);
    fireEvent.click(await screen.findByTestId('fw-requests-more'));
    await waitFor(() => expect(listFieldWorkerMoveRequests).toHaveBeenLastCalledWith(P, { state: 'open', district: GAYA, cursor: 'c2' }));
    fireEvent.click(screen.getByTestId('fw-request-withdraw'));
    await waitFor(() => expect(screen.getByTestId('fw-requests-status')).toHaveTextContent(/./)); // the act's own line
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });
    expect(screen.getByTestId('fw-requests-status').textContent).not.toMatch(/more request/);
  });

  it('R4-1: "Load more" pressed while an act’s refresh is in flight does nothing (it would cancel the refresh and extend the stale pages)', async () => {
    let firstPages = 0;
    listFieldWorkerMoveRequests.mockImplementation(async (_p: string, o: { district?: string; cursor?: string }) => {
      if (o.district !== GAYA) return { items: [], next_cursor: null };
      if (o.cursor === undefined && firstPages++ > 0) return new Promise(() => undefined); // the refresh hangs
      return { items: [req({ opened_by: ME })], next_cursor: 'c2' };
    });
    actOnFieldWorkerMoveRequest.mockResolvedValueOnce(result({ state: 'withdrawn', worker_district: 'Patna' }));
    renderWith(<MoveRequestsPage pariwarId={P} />);
    await choose(GAYA);
    fireEvent.click(await screen.findByTestId('fw-request-withdraw'));
    await waitFor(() => expect(firstPages).toBe(2)); // the refresh is in flight
    const more = screen.getByTestId('fw-requests-more');
    expect(more).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(more);
    expect(listFieldWorkerMoveRequests).not.toHaveBeenCalledWith(P, expect.objectContaining({ cursor: 'c2' }));
  });

  // R4-2 — a key by position shifts when the oldest of five lines drops: every line remounts and the status region re-reads them.
  it('R4-2: the sixth status line does not remount the lines before it', async () => {
    const id = (n: number) => `00000000-0000-4000-8000-0000000002${String(n).padStart(2, '0')}`;
    // Pages of one and two items in turn, so the lines' texts alternate and a key by position would change at every place.
    listFieldWorkerMoveRequests.mockImplementation(async (_p: string, o: { district?: string; cursor?: string }) => {
      if (o.district !== GAYA) return { items: [], next_cursor: null };
      const n = o.cursor === undefined ? 0 : Number(o.cursor.slice(1));
      const items = n % 2 === 1 ? [colleague({ move_request_id: id(n * 2) })] : [colleague({ move_request_id: id(n * 2) }), colleague({ move_request_id: id(n * 2 + 1) })];
      return { items, next_cursor: n < 7 ? `c${String(n + 1)}` : null };
    });
    renderWith(<MoveRequestsPage pariwarId={P} />);
    await choose(GAYA);
    const press = async (k: number) => {
      fireEvent.click(await screen.findByTestId('fw-requests-more'));
      await waitFor(() => expect(screen.getAllByTestId('fw-requests-announce')).toHaveLength(Math.min(k, 5)));
      await waitFor(() => expect(screen.getByTestId('fw-requests-more')).toHaveAttribute('aria-disabled', 'false'));
    };
    for (let k = 1; k <= 5; k++) await press(k);
    const before = screen.getAllByTestId('fw-requests-announce');
    await press(6);
    const after = screen.getAllByTestId('fw-requests-announce');
    for (let i = 0; i < 4; i++) expect(after[i], `line ${String(i)}`).toBe(before[i + 1]); // the SAME nodes, moved up
  });
});

describe('R4-1 — "Load more notices" and the seen mark’s refresh', () => {
  it('the seen mark’s refresh landing during a "Load more notices" says no count — no page came', async () => {
    listFieldWorkerMoveRequests.mockResolvedValue({ items: [], next_cursor: null });
    let seen: (v: unknown) => void = () => undefined;
    markFieldWorkerNoticesSeen.mockReturnValueOnce(new Promise((r) => (seen = r)));
    listFieldWorkerNotices.mockImplementation(async (_p: string, o?: { cursor?: string }) =>
      o?.cursor === undefined ? { items: [notice()], next_cursor: 'n2' } : new Promise(() => undefined),
    );
    renderWith(<MoveRequestsPage pariwarId={P} />);
    await waitFor(() => expect(markFieldWorkerNoticesSeen).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByTestId('fw-notices-more'));
    await waitFor(() => expect(listFieldWorkerNotices).toHaveBeenLastCalledWith(P, { cursor: 'n2' }));
    await act(async () => seen(undefined)); // the seen mark succeeds: the notices refresh, cancelling the page in flight
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });
    expect(screen.getByTestId('fw-notices-status')).toBeEmptyDOMElement();
  });
});

describe('RP-13 — the same request open from a row and from a notice', () => {
  it('each mount has its OWN DOM id, `aria-controls` points at its own, and the notice View is named by a copy key', async () => {
    listFieldWorkerMoveRequests.mockImplementation(async (_p: string, o: { district?: string }) => (o.district === GAYA ? { items: [req()], next_cursor: null } : { items: [], next_cursor: null }));
    listFieldWorkerNotices.mockResolvedValue({ items: [notice({ seen_at: SEEN })], next_cursor: null });
    getFieldWorkerMoveRequest.mockResolvedValue(detailOf());
    renderWith(<MoveRequestsPage pariwarId={P} />);
    await choose(GAYA);
    fireEvent.click(await screen.findByTestId('fw-request-view'));
    fireEvent.click(await screen.findByTestId('fw-notice-view'));
    await waitFor(() => expect(screen.getAllByTestId('fw-request-detail')).toHaveLength(2));
    const ids = screen.getAllByTestId('fw-request-detail').map((e) => e.id);
    expect(new Set(ids).size).toBe(2); // ⛔ a duplicate id
    expect(screen.getByTestId('fw-request-view')).toHaveAttribute('aria-controls', ids.find((id) => id.startsWith('fw-request-detail-')));
    expect(screen.getByTestId('fw-notice-view')).toHaveAttribute('aria-controls', ids.find((id) => id.startsWith('fw-notice-detail-')));
    expect(screen.getByTestId('fw-notice-view')).toHaveTextContent(t('fw.notices.viewFor', { from: 'Patna', to: 'Gaya' }));
  });
});

describe('RP-14 — the sections wait for the session', () => {
  it('until the officer is known no request is offered an Accept (their OWN would read as waiting); then their own sits under "Your requests"', async () => {
    let release: (v: unknown) => void = () => undefined;
    getSession.mockReturnValueOnce(new Promise((r) => (release = r)));
    listFieldWorkerMoveRequests.mockImplementation(async (_p: string, o: { district?: string }) => (o.district === GAYA ? { items: [req({ opened_by: ME })], next_cursor: null } : { items: [], next_cursor: null }));
    renderWith(<MoveRequestsPage pariwarId={P} />);
    await choose(GAYA);
    await waitFor(() => expect(listFieldWorkerMoveRequests).toHaveBeenLastCalledWith(P, { state: 'open', district: GAYA }));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20)); // the list has answered; the session has not
    });
    expect(screen.queryByTestId('fw-requests-waiting')).toBeNull();
    expect(screen.queryByTestId('fw-request-accept')).toBeNull();
    await act(async () => release({ userId: ME, nationalGrants: [] }));
    const mine = await screen.findByTestId('fw-requests-mine');
    expect(within(mine).getByTestId('fw-request-withdraw')).toBeInTheDocument();
    expect(screen.queryByTestId('fw-request-accept')).toBeNull();
  });

  it('a failed session read says so and can be tried again; a 401 signs the officer back in', async () => {
    listFieldWorkerMoveRequests.mockResolvedValue({ items: [], next_cursor: null });
    getSession.mockRejectedValueOnce(new ApiError(503, 'http.503', 'down'));
    const view = renderWith(<MoveRequestsPage pariwarId={P} />);
    const err = await screen.findByTestId('fw-requests-session-error');
    expect(screen.queryByTestId('fw-requests-waiting')).toBeNull();
    expect(navigate).not.toHaveBeenCalled(); // CONTROL: a 5xx is not a sign-out
    fireEvent.click(within(err).getByRole('button', { name: t('fw.retry') }));
    expect(await screen.findByTestId('fw-requests-waiting')).toBeInTheDocument();
    view.unmount();
    getSession.mockRejectedValueOnce(new ApiError(401, 'auth.session_required', 'x'));
    renderWith(<MoveRequestsPage pariwarId={P} />);
    await screen.findByTestId('fw-requests-session-error');
    expect(navigate).toHaveBeenCalledWith({ to: '/login' });
  });
});

describe('RP-20 — CR22 A: nothing says when a worker’s work ended (decision `2026-11-10-461` item 1)', () => {
  it('a `superseded` event reads "No longer needed" with no time (and no cause); the events that are dated keep theirs', async () => {
    listFieldWorkerMoveRequests.mockResolvedValue({ items: [req()], next_cursor: null });
    getFieldWorkerMoveRequest.mockResolvedValue({
      ...detailOf(),
      events: [
        event({ event_type: 'field_worker_move_request.opened', occurred_at: '2026-11-08T05:00:00.000Z' }),
        event({ event_version: 2, event_type: 'field_worker_move_request.superseded', occurred_at: null }),
      ],
    });
    renderWith(<MoveRequestsPage pariwarId={P} />);
    await choose(GAYA);
    fireEvent.click(await screen.findByTestId('fw-request-view'));
    const lines = within(await screen.findByTestId('fw-request-detail-events')).getAllByRole('listitem');
    expect(lines[0]).toHaveTextContent(/^Asked — .*2026/); // CONTROL: a dated event still shows its time
    expect(lines[1]!.textContent).toBe(t('fw.requests.event.field_worker_move_request.superseded'));
    expect(lines[1]!.textContent).not.toMatch(/—|\d{4}/);
  });

  it('the superseded NOTICE says only that the request is no longer needed — ⛔ "engagement ended" — and shows no stamp; another kind keeps its stamp', async () => {
    listFieldWorkerMoveRequests.mockResolvedValue({ items: [], next_cursor: null });
    listFieldWorkerNotices.mockResolvedValue({
      items: [
        notice({ kind: 'move_request_superseded', seen_at: SEEN }),
        notice({ notice_id: '00000000-0000-4000-8000-0000000000f2', kind: 'move_request_opened', seen_at: SEEN }),
      ],
      next_cursor: null,
    });
    renderWith(<MoveRequestsPage pariwarId={P} />);
    const items = await screen.findAllByTestId('fw-notice');
    expect(items[0]).toHaveTextContent('A request is no longer needed: Patna to Gaya.');
    expect(items[0]!.textContent).not.toMatch(/engagement|ended|\d{4}/i);
    expect(items[1]!.textContent).toMatch(/2026/); // CONTROL: the stamp is withheld for THIS kind only
  });
});
