// Story 13.1c (Task 5.3; AC10; AD8) — the acts on an opened worker, on the Find page against a mocked client:
//   · the state selector lists workers awaiting approval, active, suspended and ended (the list route's `state`);
//   · each act appears only in a state it is legal in (waiting: Move, End; active: Move, Suspend, End; suspended: Move, Reactivate,
//     End; ended: none);
//   · End's confirm shows the finality line and the FOUR reasons by label; "Died" relabels the date "Date of death" (another reason
//     restores "Last day") and EMPTIES it, so Confirm waits for a date the officer types (`-456` item 1); "Stopped working" alone
//     shows the `-454` Q4 A line;
//   · a reason is required before Confirm enables; ONE Idempotency-Key per submission attempt (a retry after a 5xx reuses it, a new
//     attempt mints a new one);
//   · success refreshes the list and updates the panel from the 200 with NO second identity read; a 403 shows the act's own no-access
//     line; a 409 authorization_stale shows AD8's "moved by someone else" line, refreshes the list and WITHDRAWS the acts (review CR23);
//   · review round 1 (CR22-CR29): the act never pauses offline; re-pressing the open act changes nothing; focus and announcements
//     (checklist family 13); Move's exact-text field when the districts read is truncated; "Show code" only for an active worker;
//   · the Approvals page's one-argument child still renders through the widened `children`.

import { QueryClientProvider, focusManager, onlineManager } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
    // The words as `-456` item 3 leaves them (the waiting state reads as it does everywhere else: "Awaiting approval") - ⛔ read back
    // through the same keys (that would compare a string with itself).
    expect([...select.options].map((o) => o.textContent)).toEqual(['Awaiting approval', 'Active', 'Suspended', 'Ended']);
    expect(t('fw.find.state.pending_kyc')).toBe(t('fw.state.pending_kyc')); // one word for one state
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
    // AD8's sentence VERBATIM (row 13-1f rewords it when the undo exists - that story changes this literal on purpose).
    expect(screen.getByTestId('fw-act-end-final').textContent).toBe('Ending is final. Their code stops crediting new teachers; to work again they must be registered again.');
    const reasons = [...(screen.getByTestId('fw-act-reason') as HTMLSelectElement).options].map((o) => o.textContent);
    expect(reasons).toEqual([t('fw.actions.reason.choose'), 'Left', 'Stopped working', 'Registered by mistake', 'Died']);
    expect(confirm().disabled).toBe(true);
    expect(screen.getByLabelText('Last day')).toBeTruthy();
    choose('fw-act-reason', 'died');
    expect(screen.getByLabelText('Date of death')).toBeTruthy(); // `-455` clause 1's label, verbatim
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
    // The date defaults to today in India on this browser's clock (the server judges the bounds); the control refuses only a day before
    // the registration (the identity's `created_at`, 2026-11-04T05:00Z = the IST day 2026-11-04) and a year the contract cannot read.
    const date = screen.getByTestId('fw-act-ended-on') as HTMLInputElement;
    expect(date.value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(date.min).toBe('2026-11-04');
    expect(date.max).toBe('9999-12-31');
  });

  // `-456` item 1 (BigDev's answer to review CR-Q1): a death date is a fact the officer supplies, never today by default.
  it('"Died" EMPTIES the date and Confirm waits for one the officer types; leaving "Died" puts today back, another reason keeps a typed date', async () => {
    await openWorker('active');
    fireEvent.click(screen.getByTestId('fw-act-end'));
    const date = (): HTMLInputElement => screen.getByTestId('fw-act-ended-on') as HTMLInputElement;
    const today = date().value;
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    choose('fw-act-reason', 'left_voluntarily');
    fireEvent.change(date(), { target: { value: '2026-11-05' } });
    choose('fw-act-reason', 'inactive');
    expect(date().value).toBe('2026-11-05'); // between the other reasons nothing is reset
    choose('fw-act-reason', 'died');
    expect(date().value).toBe('');
    expect(confirm().disabled).toBe(true);
    fireEvent.change(date(), { target: { value: '2026-11-05' } });
    expect(confirm().disabled).toBe(false);
    choose('fw-act-reason', 'registered_in_error');
    expect(date().value).toBe(today); // a typed date of death is not carried over as a "last day"
    expect(confirm().disabled).toBe(false);
    choose('fw-act-reason', 'died');
    expect(date().value).toBe(''); // entering "Died" again empties the date, however it got there
    expect(confirm().disabled).toBe(true);
  });

  it('a death is sent with the date the officer typed; with the date empty nothing is sent, by click or by submit', async () => {
    await openWorker('active');
    terminateFieldWorker.mockResolvedValue(result({ current_state: 'terminated', state_reason_code: 'died', ended_on: '2026-11-05' }));
    fireEvent.click(screen.getByTestId('fw-act-end'));
    choose('fw-act-reason', 'died');
    fireEvent.click(confirm());
    fireEvent.submit(screen.getByTestId('fw-act-end-form'));
    await act(async () => {});
    expect(terminateFieldWorker).not.toHaveBeenCalled();
    fireEvent.change(screen.getByTestId('fw-act-ended-on'), { target: { value: '2026-11-05' } });
    fireEvent.click(confirm());
    await waitFor(() => expect(terminateFieldWorker).toHaveBeenCalledTimes(1));
    expect(terminateFieldWorker).toHaveBeenCalledWith(P, W, { reason_code: 'died', ended_on: '2026-11-05' }, expect.any(String));
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
    ['reactivate', 'fw.actions.noAccess.reactivate'],
    ['end', 'fw.actions.noAccess.end'],
  ] as const)('a 403 on %s shows that act’s own no-access line', async (act, key) => {
    await openWorker(act === 'reactivate' ? 'suspended' : 'active');
    const forbidden = new ApiError(403, 'authz.forbidden', 'no');
    moveFieldWorker.mockRejectedValue(forbidden);
    suspendFieldWorker.mockRejectedValue(forbidden);
    reactivateFieldWorker.mockRejectedValue(forbidden);
    terminateFieldWorker.mockRejectedValue(forbidden);
    fireEvent.click(screen.getByTestId(`fw-act-${act}`));
    if (act !== 'reactivate') choose('fw-act-reason', act === 'move' ? 'reassigned' : act === 'suspend' ? 'under_review' : 'inactive');
    if (act === 'move') {
      await screen.findByTestId('fw-act-to-district');
      choose('fw-act-to-district', 'Gaya');
    }
    fireEvent.click(confirm());
    expect((await screen.findByTestId('fw-act-error')).textContent).toBe(t(key));
  });

  it('a 409 authorization_stale says AD8’s line VERBATIM, refreshes the list, and WITHDRAWS the acts and the form (a retry would resend the same doomed body) with the way out', async () => {
    await openWorker('active');
    const listCalls = listFieldWorkers.mock.calls.length;
    suspendFieldWorker.mockRejectedValueOnce(new ApiError(409, 'field_worker.authorization_stale', 'moved'));
    fireEvent.click(screen.getByTestId('fw-act-suspend'));
    choose('fw-act-reason', 'under_review');
    fireEvent.click(confirm());
    expect((await screen.findByTestId('fw-actions-stale-text')).textContent).toBe('This worker was moved by someone else while you were working. Reload to see their district.');
    expect(screen.getByTestId('fw-actions-stale').textContent).toContain('Close this panel and open the worker again');
    expect(screen.getByTestId('fw-actions-stale').getAttribute('role')).toBe('alert');
    expect(actButtons()).toEqual([]);
    expect(screen.queryByTestId('fw-act-suspend-form')).toBeNull();
    await waitFor(() => expect(listFieldWorkers.mock.calls.length).toBeGreaterThan(listCalls));
    expect(suspendFieldWorker).toHaveBeenCalledTimes(1); // nothing left to press: the doomed body is not resent
    expect(getFieldWorkerIdentity).toHaveBeenCalledTimes(1); // and no second (audited) identity read behind the officer's back
  });

  it('a 409 illegal_transition says the status HAS CHANGED since the officer opened the worker - ⛔ "by someone else" (it may be their own earlier try whose answer was lost) - and withdraws the acts', async () => {
    await openWorker('active');
    suspendFieldWorker.mockRejectedValueOnce(new ApiError(409, 'field_worker.illegal_transition', 'no'));
    fireEvent.click(screen.getByTestId('fw-act-suspend'));
    choose('fw-act-reason', 'under_review');
    fireEvent.click(confirm());
    expect((await screen.findByTestId('fw-actions-stale-text')).textContent).toBe('This worker’s status has changed since you opened them.');
    expect(screen.getByTestId('fw-actions-stale').textContent).not.toMatch(/someone else/);
    expect(actButtons()).toEqual([]);
  });

  it('review CR22: offline, the act is SENT and fails as a retryable network error - never PAUSED to run on reconnect; the retry reuses the attempt’s key', async () => {
    await openWorker('active');
    onlineManager.setOnline(false);
    try {
      suspendFieldWorker.mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValueOnce(result({ current_state: 'suspended' }));
      fireEvent.click(screen.getByTestId('fw-act-suspend'));
      choose('fw-act-reason', 'under_review');
      fireEvent.click(confirm());
      expect((await screen.findByTestId('fw-act-error')).textContent).toBe(t('fw.unknownError', { code: 'network' }));
      expect(suspendFieldWorker).toHaveBeenCalledTimes(1); // sent, not parked
      expect(confirm().textContent).toBe(t('fw.retry'));
      expect((screen.getByTestId('fw-act-cancel') as HTMLButtonElement).disabled).toBe(false); // the form is not locked
      fireEvent.click(confirm());
      await waitFor(() => expect(suspendFieldWorker).toHaveBeenCalledTimes(2));
      expect(suspendFieldWorker.mock.calls[1]![3]).toBe(suspendFieldWorker.mock.calls[0]![3]);
    } finally {
      onlineManager.setOnline(true);
    }
  });

  it('review CR29 / PR8: re-pressing the OPEN act’s button changes nothing - the form, the chosen reason, the error and the attempt’s key survive - and takes the officer to the form', async () => {
    await openWorker('active');
    suspendFieldWorker.mockRejectedValueOnce(new ApiError(503, 'something.down', 'down')).mockResolvedValueOnce(result({ current_state: 'suspended' }));
    fireEvent.click(screen.getByTestId('fw-act-suspend'));
    choose('fw-act-reason', 'under_review');
    fireEvent.click(confirm());
    await screen.findByTestId('fw-act-error');
    screen.getByTestId('fw-act-suspend').focus();
    fireEvent.click(screen.getByTestId('fw-act-suspend')); // already open
    expect(document.activeElement).toBe(screen.getByTestId('fw-act-reason')); // the press goes to the form it opened
    expect((screen.getByTestId('fw-act-reason') as HTMLSelectElement).value).toBe('under_review');
    expect(screen.getByTestId('fw-act-error')).toBeTruthy();
    fireEvent.click(confirm());
    await waitFor(() => expect(suspendFieldWorker).toHaveBeenCalledTimes(2));
    expect(suspendFieldWorker.mock.calls[1]![3]).toBe(suspendFieldWorker.mock.calls[0]![3]);
  });

  it('review CR29: editing a field clears the error that described the old value', async () => {
    await openWorker('active');
    terminateFieldWorker.mockRejectedValueOnce(new ApiError(422, 'field_worker.ended_on_invalid', 'no'));
    fireEvent.click(screen.getByTestId('fw-act-end'));
    choose('fw-act-reason', 'left_voluntarily');
    fireEvent.click(confirm());
    expect((await screen.findByTestId('fw-act-error')).textContent).toBe(t('fw.err.endedOnInvalid'));
    fireEvent.change(screen.getByTestId('fw-act-ended-on'), { target: { value: '2026-11-05' } });
    expect(screen.queryByTestId('fw-act-error')).toBeNull();
  });

  it('review CR28: the Pariwar has more districts than can be listed - Move offers an exact-text field, and the typed district is sent byte for byte', async () => {
    getFieldWorkerDistricts.mockResolvedValue({ districts: ['Gaya', 'Nalanda', 'Patna'], districts_truncated: true });
    await openWorker('active');
    moveFieldWorker.mockResolvedValue(result({ district: 'Zzz Far  District' }));
    fireEvent.click(screen.getByTestId('fw-act-move'));
    expect((await screen.findByTestId('fw-act-to-district-truncated')).textContent).toBe(t('fw.district.truncated'));
    choose('fw-act-reason', 'reassigned');
    expect(confirm().disabled).toBe(true); // no district yet
    fireEvent.change(screen.getByTestId('fw-act-to-district-typed'), { target: { value: 'Zzz Far  District' } });
    fireEvent.click(confirm());
    await waitFor(() => expect(moveFieldWorker).toHaveBeenCalledTimes(1));
    expect(moveFieldWorker).toHaveBeenCalledWith(P, W, { from_district: 'Patna', to_district: 'Zzz Far  District', reason_code: 'reassigned' }, expect.any(String));
  });
});

describe('patch-review round (PR1-PR11)', () => {
  it('PR1: editing a field clears the error that described the VALUE - ⛔ a "no access" line, which is not about any value', async () => {
    await openWorker('active');
    suspendFieldWorker.mockRejectedValue(new ApiError(403, 'authz.forbidden', 'no'));
    fireEvent.click(screen.getByTestId('fw-act-suspend'));
    choose('fw-act-reason', 'under_review');
    fireEvent.click(confirm());
    expect((await screen.findByTestId('fw-act-error')).textContent).toBe(t('fw.actions.noAccess.suspend'));
    choose('fw-act-reason', 'at_worker_request');
    expect(screen.getByTestId('fw-act-error').textContent).toBe(t('fw.actions.noAccess.suspend'));
  });

  it('PR3: the way out the stale line names WORKS - Close, then open the worker again: a fresh identity read shows the true state, its acts and no stale lock', async () => {
    await openWorker('active');
    suspendFieldWorker.mockRejectedValueOnce(new ApiError(409, 'field_worker.illegal_transition', 'no'));
    fireEvent.click(screen.getByTestId('fw-act-suspend'));
    choose('fw-act-reason', 'under_review');
    fireEvent.click(confirm());
    await screen.findByTestId('fw-actions-stale');
    // PR11: the stale copy's "Show code" is withdrawn with the acts (it was offered because the copy said "active").
    expect(screen.queryByTestId('fw-code-show')).toBeNull();
    state = 'suspended'; // someone else suspended the worker meanwhile
    fireEvent.click(screen.getByTestId('fw-detail-close'));
    await waitFor(() => expect(screen.queryByTestId('fw-detail')).toBeNull());
    fireEvent.click(await screen.findByTestId('fw-find-check'));
    await screen.findByTestId('fw-actions');
    expect(getFieldWorkerIdentity).toHaveBeenCalledTimes(2);
    expect(actButtons()).toEqual(['fw-act-move', 'fw-act-reactivate', 'fw-act-end']);
    expect(screen.queryByTestId('fw-actions-stale')).toBeNull();
  });

  it('PR9: a blank typed district is no district - Confirm stays disabled', async () => {
    getFieldWorkerDistricts.mockResolvedValue({ districts: ['Gaya', 'Nalanda', 'Patna'], districts_truncated: true });
    await openWorker('active');
    fireEvent.click(screen.getByTestId('fw-act-move'));
    choose('fw-act-reason', 'reassigned');
    fireEvent.change(await screen.findByTestId('fw-act-to-district-typed'), { target: { value: '   ' } });
    expect(confirm().disabled).toBe(true);
    fireEvent.change(screen.getByTestId('fw-act-to-district-typed'), { target: { value: 'Gaya' } });
    expect(confirm().disabled).toBe(false);
  });

  it('PR9: no other listed district but a truncated list - the exact-text field alone is offered (⛔ "no other district")', async () => {
    getFieldWorkerDistricts.mockResolvedValue({ districts: ['Patna'], districts_truncated: true });
    await openWorker('active');
    fireEvent.click(screen.getByTestId('fw-act-move'));
    expect(await screen.findByTestId('fw-act-to-district-typed')).toBeTruthy();
    expect(screen.queryByTestId('fw-act-to-district')).toBeNull();
    expect(screen.queryByText(t('fw.actions.move.noOther'))).toBeNull();
  });

  it('PR9: a failed REFETCH of the districts (the window refocuses) keeps the Move controls and the chosen district - the error replaces them only when there is nothing to show', async () => {
    await openWorker('active');
    fireEvent.click(screen.getByTestId('fw-act-move'));
    await screen.findByTestId('fw-act-to-district');
    choose('fw-act-reason', 'reassigned');
    choose('fw-act-to-district', 'Gaya');
    getFieldWorkerDistricts.mockRejectedValue(new ApiError(500, 'something.down', 'down'));
    const calls = getFieldWorkerDistricts.mock.calls.length;
    act(() => {
      focusManager.setFocused(false);
      focusManager.setFocused(true);
    });
    await waitFor(() => expect(getFieldWorkerDistricts.mock.calls.length).toBeGreaterThan(calls));
    await new Promise((r) => setTimeout(r, 20)); // let the failed refetch settle
    expect((screen.getByTestId('fw-act-to-district') as HTMLSelectElement).value).toBe('Gaya');
    expect(confirm().disabled).toBe(false);
  });
});

describe('focus and announcements (checklist family 13; review CR25)', () => {
  it('Cancel returns focus to the act that opened the form; a success rests it on the panel’s heading and says so', async () => {
    await openWorker('active');
    fireEvent.click(screen.getByTestId('fw-act-suspend'));
    expect(document.activeElement).toBe(screen.getByTestId('fw-act-reason'));
    fireEvent.click(screen.getByTestId('fw-act-cancel'));
    expect(document.activeElement).toBe(screen.getByTestId('fw-act-suspend'));
    suspendFieldWorker.mockResolvedValue(result({ current_state: 'suspended', state_reason_code: 'under_review' }));
    fireEvent.click(screen.getByTestId('fw-act-suspend'));
    choose('fw-act-reason', 'under_review');
    fireEvent.click(confirm());
    await waitFor(() => expect(screen.queryByTestId('fw-act-suspend-form')).toBeNull());
    expect(document.activeElement).toBe(within(screen.getByTestId('fw-actions')).getByRole('heading', { name: t('fw.actions.title') }));
    expect(screen.getByTestId('fw-actions-status').textContent).toBe(t('fw.actions.done.suspend', { name: 'Ramesh Kumar' }));
  });

  it('while the act is saving, Confirm keeps focus (aria-disabled, ⛔ disabled) and "Saving…" is said in the status region', async () => {
    await openWorker('active');
    let release: (v: ReturnType<typeof result>) => void = () => undefined;
    suspendFieldWorker.mockImplementation(() => new Promise((resolve) => { release = resolve; }));
    fireEvent.click(screen.getByTestId('fw-act-suspend'));
    choose('fw-act-reason', 'under_review');
    confirm().focus();
    fireEvent.click(confirm());
    await waitFor(() => expect(screen.getByTestId('fw-actions-status').textContent).toContain(t('fw.actions.saving')));
    expect(confirm().disabled).toBe(false);
    expect(confirm().getAttribute('aria-disabled')).toBe('true');
    expect(document.activeElement).toBe(confirm());
    fireEvent.click(confirm()); // a second press while busy sends nothing
    expect(suspendFieldWorker).toHaveBeenCalledTimes(1);
    release(result({ current_state: 'suspended' }));
    await waitFor(() => expect(screen.queryByTestId('fw-act-suspend-form')).toBeNull());
  });

  it('the End confirm is a NAMED form; its finality line DESCRIBES the reason select; the "Stopped working" line arrives INTO a status region that was already mounted', async () => {
    await openWorker('active');
    fireEvent.click(screen.getByTestId('fw-act-end'));
    expect(screen.getByRole('form', { name: 'End' })).toBeTruthy();
    const describedBy = screen.getByTestId('fw-act-reason').getAttribute('aria-describedby')!;
    expect(document.getElementById(describedBy)!.textContent).toBe('Ending is final. Their code stops crediting new teachers; to work again they must be registered again.');
    const region = screen.getByTestId('fw-act-hint');
    expect(region.getAttribute('role')).toBe('status');
    expect(region.textContent).toBe('');
    choose('fw-act-reason', 'inactive');
    expect(screen.getByTestId('fw-act-hint')).toBe(region); // the same node: the line came INTO a live region, so it is heard
    expect(region.textContent).toBe('End a worker for this only after you have tried to reach them.');
  });

  it('Reactivate has no field: focus lands on Confirm, which the intro describes', async () => {
    await openWorker('suspended');
    fireEvent.click(screen.getByTestId('fw-act-reactivate'));
    expect(document.activeElement).toBe(confirm());
    expect(document.getElementById(confirm().getAttribute('aria-describedby')!)!.textContent).toBe(t('fw.actions.reactivate.intro'));
  });

  it('the Suspend intro states NO credit rule (`-454` Q6 C holds a signup for a worker suspended under review); it only says the code cannot be given out', async () => {
    await openWorker('active');
    fireEvent.click(screen.getByTestId('fw-act-suspend'));
    const intro = document.getElementById(screen.getByTestId('fw-act-reason').getAttribute('aria-describedby')!)!.textContent!;
    expect(intro).toBe('While suspended, the worker’s code cannot be given out.');
    expect(intro).not.toMatch(/credit/i);
  });
});

describe('"Show code" is offered only for an ACTIVE worker (review CR26)', () => {
  it.each(['pending_kyc', 'suspended', 'terminated'] as const)('a %s worker: no "Show code" - it could only answer 409', async (s) => {
    await openWorker(s);
    expect(screen.queryByTestId('fw-code-show')).toBeNull();
  });

  it('an active worker has it; a Suspend (the 200 updates the panel) takes it away', async () => {
    await openWorker('active');
    expect(screen.getByTestId('fw-code-show')).toBeTruthy();
    suspendFieldWorker.mockResolvedValue(result({ current_state: 'suspended', state_reason_code: 'under_review' }));
    fireEvent.click(screen.getByTestId('fw-act-suspend'));
    choose('fw-act-reason', 'under_review');
    fireEvent.click(confirm());
    await waitFor(() => expect(screen.queryByTestId('fw-code-show')).toBeNull());
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
