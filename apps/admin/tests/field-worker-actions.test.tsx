// Story 13.1c (Task 5.3; AC10; AD8) — the acts on an opened worker, on the Find page against a mocked client:
//   · the state selector lists workers waiting for approval, active, suspended and ended (the list route's `state`);
//   · each act appears only in a state it is legal in (waiting: Move, End; active: Move, Suspend, End; suspended: Move, Reactivate,
//     End; ended: none);
//   · End's confirm shows the finality line and the FOUR reasons by label; "Died" relabels the date "Date of death" (another reason
//     restores "Last day"); "Stopped working" alone shows the `-454` Q4 A line;
//   · a reason is required before Confirm enables; ONE Idempotency-Key per submission attempt (a retry after a 5xx reuses it, a new
//     attempt mints a new one);
//   · success refreshes the list and updates the panel from the 200 with NO second identity read; a 403 shows the act's own no-access
//     line; a 409 authorization_stale shows AD8's "moved by someone else" line and refreshes the list;
//   · the Approvals page's one-argument child still renders through the widened `children`.

import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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

const listFieldWorkers = vi.fn();
const getFieldWorkerIdentity = vi.fn();
const getFieldWorkerDistricts = vi.fn();
const moveFieldWorker = vi.fn();
const suspendFieldWorker = vi.fn();
const reactivateFieldWorker = vi.fn();
const terminateFieldWorker = vi.fn();
const getFieldWorkerLog = vi.fn();
vi.mock('../src/api/client.js', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    listFieldWorkers: (p: string, o: unknown) => listFieldWorkers(p, o),
    getFieldWorkerIdentity: (p: string, id: string) => getFieldWorkerIdentity(p, id),
    getFieldWorkerDistricts: (p: string) => getFieldWorkerDistricts(p),
    moveFieldWorker: (...a: unknown[]) => moveFieldWorker(...a),
    suspendFieldWorker: (...a: unknown[]) => suspendFieldWorker(...a),
    reactivateFieldWorker: (...a: unknown[]) => reactivateFieldWorker(...a),
    terminateFieldWorker: (...a: unknown[]) => terminateFieldWorker(...a),
    getFieldWorkerLog: (...a: unknown[]) => getFieldWorkerLog(...a),
  };
});

const { FindWorkerPage, ApprovalsPage } = await import('../src/modules/field-workers/index.js');
const { resolveEn: t } = await import('../src/modules/field-workers/i18n-en.js');
const { ApiError } = await import('../src/api/client.js');
const { createQueryClient } = await import('../src/api/hooks.js');

const P = '11111111-1111-4111-8111-111111111111';
const W = '00000000-0000-4000-8000-000000000001';
type State = 'pending_kyc' | 'active' | 'suspended' | 'terminated';
const row = (state: State = 'active') => ({
  field_worker_id: W,
  name: 'Ramesh Kumar',
  district: 'Patna',
  current_state: state,
  kyc_status: state === 'pending_kyc' ? 'pending' : 'completed',
  registered_by_display: 'Asha Verma',
  created_at: '2026-11-04T05:00:00.000Z',
  code_sms_status: null,
});
const identity = (state: State = 'active') => ({ ...row(state), mobile: '+919876500010', approved_by_display: state === 'pending_kyc' ? null : 'Meera Rao' });
const result = (o: Partial<{ district: string; current_state: State; state_reason_code: string | null; ended_on: string | null }> = {}) => ({
  field_worker_id: W,
  district: 'Patna',
  current_state: 'active' as State,
  state_reason_code: null,
  ended_on: null,
  ...o,
});

let state: State = 'active';
beforeEach(() => {
  for (const fn of [listFieldWorkers, getFieldWorkerIdentity, getFieldWorkerDistricts, moveFieldWorker, suspendFieldWorker, reactivateFieldWorker, terminateFieldWorker, getFieldWorkerLog]) fn.mockReset();
  state = 'active';
  getFieldWorkerDistricts.mockResolvedValue({ districts: ['Gaya', 'Nalanda', 'Patna'], districts_truncated: false });
  listFieldWorkers.mockImplementation(async () => ({ items: [row(state)], next_cursor: null }));
  getFieldWorkerIdentity.mockImplementation(async () => identity(state));
});

async function chooseDistrict(name: string): Promise<void> {
  await screen.findByRole('option', { name });
  const select = screen.getByTestId('fw-find-district') as HTMLSelectElement;
  fireEvent.change(select, { target: { value: [...select.options].find((o) => o.textContent === name)!.value } });
}

/** The Find page, Patna chosen, the list in `s`, the worker's panel open and loaded. */
async function openWorker(s: State = 'active') {
  state = s;
  const qc = createQueryClient();
  render(
    <QueryClientProvider client={qc}>
      <FindWorkerPage pariwarId={P} />
    </QueryClientProvider>,
  );
  await chooseDistrict('Patna');
  if (s !== 'active') fireEvent.change(screen.getByTestId('fw-find-state'), { target: { value: s } });
  fireEvent.click(await screen.findByTestId('fw-find-check'));
  await screen.findByTestId('fw-actions');
  return qc;
}

const actButtons = (): string[] => within(screen.getByTestId('fw-actions')).queryAllByRole('button').map((b) => b.getAttribute('data-testid') ?? '');
const choose = (testId: string, value: string): void => {
  fireEvent.change(screen.getByTestId(testId), { target: { value } });
};
const confirm = (): HTMLButtonElement => screen.getByTestId('fw-act-confirm') as HTMLButtonElement;

describe('the state selector (AD8)', () => {
  it('lists the four states by label, default Active; choosing one reads the list in THAT state', async () => {
    const qc = createQueryClient();
    render(
      <QueryClientProvider client={qc}>
        <FindWorkerPage pariwarId={P} />
      </QueryClientProvider>,
    );
    const select = screen.getByTestId('fw-find-state') as HTMLSelectElement;
    expect([...select.options].map((o) => o.textContent)).toEqual([
      t('fw.find.state.pending_kyc'),
      t('fw.find.state.active'),
      t('fw.find.state.suspended'),
      t('fw.find.state.terminated'),
    ]);
    expect(select.value).toBe('active');
    await chooseDistrict('Patna');
    await screen.findByText('Ramesh Kumar');
    for (const s of ['pending_kyc', 'suspended', 'terminated'] as const) {
      fireEvent.change(select, { target: { value: s } });
      await waitFor(() => expect(listFieldWorkers).toHaveBeenLastCalledWith(P, { state: s, district: 'Patna' }));
    }
  });
});

describe('the acts by state (AD8)', () => {
  it.each([
    ['pending_kyc', ['fw-act-move', 'fw-act-end']],
    ['active', ['fw-act-move', 'fw-act-suspend', 'fw-act-end']],
    ['suspended', ['fw-act-move', 'fw-act-reactivate', 'fw-act-end']],
    ['terminated', []],
  ] as const)('a %s worker shows exactly %j', async (s, expected) => {
    await openWorker(s);
    expect(actButtons()).toEqual(expected);
    if (s === 'terminated') expect(screen.getByTestId('fw-actions-none').textContent).toBe(t('fw.actions.none'));
  });
});

describe('End’s confirm (AD8; -454 Q4 A, Q5 A)', () => {
  it('shows the finality line and the FOUR reasons by label; "Died" relabels the date, another reason restores it; only "Stopped working" shows the try-to-reach line; Confirm waits for a reason', async () => {
    await openWorker('active');
    fireEvent.click(screen.getByTestId('fw-act-end'));
    expect(screen.getByTestId('fw-act-end-final').textContent).toBe(t('fw.actions.end.final'));
    const reasons = [...(screen.getByTestId('fw-act-reason') as HTMLSelectElement).options].map((o) => o.textContent);
    expect(reasons).toEqual([t('fw.actions.reason.choose'), 'Left', 'Stopped working', 'Registered by mistake', 'Died']);
    expect(confirm().disabled).toBe(true);
    expect(screen.getByLabelText(t('fw.actions.end.lastDay'))).toBeTruthy();
    choose('fw-act-reason', 'died');
    expect(screen.getByLabelText(t('fw.actions.end.dateOfDeath'))).toBeTruthy();
    expect(screen.queryByLabelText(t('fw.actions.end.lastDay'))).toBeNull();
    expect(screen.queryByTestId('fw-act-end-inactive-hint')).toBeNull();
    choose('fw-act-reason', 'left_voluntarily');
    expect(screen.getByLabelText(t('fw.actions.end.lastDay'))).toBeTruthy();
    for (const r of ['left_voluntarily', 'registered_in_error', 'died']) {
      choose('fw-act-reason', r);
      expect(screen.queryByTestId('fw-act-end-inactive-hint'), r).toBeNull();
    }
    choose('fw-act-reason', 'inactive');
    expect(screen.getByTestId('fw-act-end-inactive-hint').textContent).toBe('End a worker for this only after you have tried to reach them.');
    expect(confirm().disabled).toBe(false);
    // The date defaults to today in India on this browser's clock (the server judges the bounds).
    expect((screen.getByTestId('fw-act-ended-on') as HTMLInputElement).value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('submitting an act', () => {
  it('suspend: Confirm sends the reason; success updates the panel from the 200 with NO second identity read, refreshes the list, and says so', async () => {
    await openWorker('active');
    expect(getFieldWorkerIdentity).toHaveBeenCalledTimes(1);
    const listCalls = listFieldWorkers.mock.calls.length;
    suspendFieldWorker.mockResolvedValue(result({ current_state: 'suspended', state_reason_code: 'under_review' }));
    fireEvent.click(screen.getByTestId('fw-act-suspend'));
    expect(confirm().disabled).toBe(true);
    choose('fw-act-reason', 'under_review');
    fireEvent.click(confirm());
    await waitFor(() => expect(screen.getByTestId('fw-actions-status').textContent).toBe(t('fw.actions.done.suspend', { name: 'Ramesh Kumar' })));
    expect(suspendFieldWorker).toHaveBeenCalledWith(P, W, { reason_code: 'under_review' }, expect.any(String));
    // The panel now shows the 200's state, and offers the suspended worker's acts — from the SAME identity read.
    await waitFor(() => expect(actButtons()).toEqual(['fw-act-move', 'fw-act-reactivate', 'fw-act-end']));
    expect(within(screen.getByTestId('fw-detail')).getByText(t('fw.state.suspended'))).toBeTruthy();
    expect(getFieldWorkerIdentity).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(listFieldWorkers.mock.calls.length).toBeGreaterThan(listCalls));
  });

  it('move: the district select excludes the current district; the body carries from_district = the panel’s district', async () => {
    await openWorker('active');
    moveFieldWorker.mockResolvedValue(result({ district: 'Gaya' }));
    fireEvent.click(screen.getByTestId('fw-act-move'));
    const select = (await screen.findByTestId('fw-act-to-district')) as HTMLSelectElement;
    expect([...select.options].map((o) => o.value)).toEqual(['', 'Gaya', 'Nalanda']);
    choose('fw-act-reason', 'reassigned');
    expect(confirm().disabled).toBe(true); // no district yet
    choose('fw-act-to-district', 'Gaya');
    fireEvent.click(confirm());
    await waitFor(() => expect(screen.getByTestId('fw-actions-status').textContent).toBe(t('fw.actions.done.move', { name: 'Ramesh Kumar', district: 'Gaya' })));
    expect(moveFieldWorker).toHaveBeenCalledWith(P, W, { from_district: 'Patna', to_district: 'Gaya', reason_code: 'reassigned' }, expect.any(String));
  });

  it('ONE key per submission attempt: a retry after a 5xx reuses it; after a success a new attempt mints a new one', async () => {
    await openWorker('suspended');
    reactivateFieldWorker.mockRejectedValueOnce(new ApiError(503, 'something.down', 'down')).mockResolvedValueOnce(result()).mockResolvedValueOnce(result());
    fireEvent.click(screen.getByTestId('fw-act-reactivate'));
    fireEvent.click(confirm());
    await screen.findByTestId('fw-act-error');
    expect(confirm().textContent).toBe(t('fw.retry'));
    fireEvent.click(confirm());
    await waitFor(() => expect(reactivateFieldWorker).toHaveBeenCalledTimes(2));
    const [first, retry] = reactivateFieldWorker.mock.calls.map((c) => c[2]);
    expect(retry).toBe(first);
    // The 200 made the panel's worker active; a NEW attempt (End, opened afresh) mints a new key.
    await waitFor(() => expect(screen.queryByTestId('fw-act-reactivate-form')).toBeNull());
    terminateFieldWorker.mockResolvedValue(result({ current_state: 'terminated', state_reason_code: 'left_voluntarily', ended_on: '2026-11-07' }));
    fireEvent.click(screen.getByTestId('fw-act-end'));
    choose('fw-act-reason', 'left_voluntarily');
    fireEvent.click(confirm());
    await waitFor(() => expect(terminateFieldWorker).toHaveBeenCalledTimes(1));
    expect(terminateFieldWorker.mock.calls[0]![3]).not.toBe(first);
  });

  it('a non-retryable failure ends the attempt: the next Confirm mints a NEW key', async () => {
    await openWorker('active');
    suspendFieldWorker.mockRejectedValueOnce(new ApiError(422, 'field_worker.reason_invalid', 'no')).mockResolvedValueOnce(result({ current_state: 'suspended' }));
    fireEvent.click(screen.getByTestId('fw-act-suspend'));
    choose('fw-act-reason', 'under_review');
    fireEvent.click(confirm());
    await screen.findByTestId('fw-act-error');
    fireEvent.click(confirm());
    await waitFor(() => expect(suspendFieldWorker).toHaveBeenCalledTimes(2));
    expect(suspendFieldWorker.mock.calls[1]![3]).not.toBe(suspendFieldWorker.mock.calls[0]![3]);
  });

  it.each([
    ['move', 'fw.actions.noAccess.move'],
    ['suspend', 'fw.actions.noAccess.suspend'],
    ['end', 'fw.actions.noAccess.end'],
  ] as const)('a 403 on %s shows that act’s own no-access line', async (act, key) => {
    await openWorker('active');
    const forbidden = new ApiError(403, 'authz.forbidden', 'no');
    moveFieldWorker.mockRejectedValue(forbidden);
    suspendFieldWorker.mockRejectedValue(forbidden);
    terminateFieldWorker.mockRejectedValue(forbidden);
    fireEvent.click(screen.getByTestId(`fw-act-${act}`));
    choose('fw-act-reason', act === 'move' ? 'reassigned' : act === 'suspend' ? 'under_review' : 'inactive');
    if (act === 'move') {
      await screen.findByTestId('fw-act-to-district');
      choose('fw-act-to-district', 'Gaya');
    }
    fireEvent.click(confirm());
    expect((await screen.findByTestId('fw-act-error')).textContent).toBe(t(key));
  });

  it('a 409 authorization_stale shows AD8’s "moved by someone else" line and refreshes the list; illegal_transition says the status changed', async () => {
    await openWorker('active');
    const listCalls = listFieldWorkers.mock.calls.length;
    suspendFieldWorker.mockRejectedValueOnce(new ApiError(409, 'field_worker.authorization_stale', 'moved'));
    fireEvent.click(screen.getByTestId('fw-act-suspend'));
    choose('fw-act-reason', 'under_review');
    fireEvent.click(confirm());
    expect((await screen.findByTestId('fw-act-error')).textContent).toBe('This worker was moved by someone else while you were working. Reload to see their district.');
    await waitFor(() => expect(listFieldWorkers.mock.calls.length).toBeGreaterThan(listCalls));
    suspendFieldWorker.mockRejectedValueOnce(new ApiError(409, 'field_worker.illegal_transition', 'no'));
    fireEvent.click(confirm());
    await waitFor(() => expect(screen.getByTestId('fw-act-error').textContent).toBe(t('fw.actions.stateChanged')));
  });
});

describe('the Approvals page through the widened `children` (AD8)', () => {
  it('its one-argument child still renders the approve button once the identity has loaded', async () => {
    state = 'pending_kyc';
    const qc = createQueryClient();
    render(
      <QueryClientProvider client={qc}>
        <ApprovalsPage pariwarId={P} />
      </QueryClientProvider>,
    );
    fireEvent.click(await screen.findByTestId('fw-approvals-review'));
    expect(await screen.findByTestId('fw-approvals-approve')).toBeTruthy();
    expect(screen.queryByTestId('fw-actions')).toBeNull(); // the acts are the finder's
  });
});
