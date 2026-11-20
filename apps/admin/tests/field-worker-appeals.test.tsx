// Story 13.1f (AC12, AC15; AD9, AD13, AD14; code review round 2, chunk D: R2D-2, R2D-4, R2D-5, R2D-7..R2D-13, R2D-15, R2D-16, R2D-18, R2D-20)
// — the Appeals page and Find's per-worker appeal panel, as an officer meets them when something GOES WRONG: another officer got there first,
// the ending changed, the account is not the hearer, the read failed. Each leg reads the line AFTER the refresh the refusal triggers (a line
// asserted before it is the one that used to be destroyed), and has the control that the same path succeeds. RTL with the API client mocked
// (the server's rules are the API specs').

import { QueryClientProvider } from '@tanstack/react-query';
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

const listFieldWorkers = vi.fn();
const getFieldWorkerIdentity = vi.fn();
const getFieldWorkerDistricts = vi.fn();
const getFieldWorkerEndingAppealsOf = vi.fn();
const listFieldWorkerEndingAppeals = vi.fn();
const listAppealEligibleFieldWorkers = vi.fn();
const lodgeFieldWorkerEndingAppeal = vi.fn();
const decideFieldWorkerEndingAppeal = vi.fn();
const withdrawFieldWorkerEndingAppeal = vi.fn();
const listFieldWorkerNotices = vi.fn();
const MOCKS = [
  listFieldWorkers,
  getFieldWorkerIdentity,
  getFieldWorkerDistricts,
  getFieldWorkerEndingAppealsOf,
  listFieldWorkerEndingAppeals,
  listAppealEligibleFieldWorkers,
  lodgeFieldWorkerEndingAppeal,
  decideFieldWorkerEndingAppeal,
  withdrawFieldWorkerEndingAppeal,
  listFieldWorkerNotices,
];
vi.mock('../src/api/client.js', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    listFieldWorkers: (...a: unknown[]) => listFieldWorkers(...a),
    getFieldWorkerIdentity: (...a: unknown[]) => getFieldWorkerIdentity(...a),
    getFieldWorkerDistricts: (...a: unknown[]) => getFieldWorkerDistricts(...a),
    getFieldWorkerEndingAppealsOf: (...a: unknown[]) => getFieldWorkerEndingAppealsOf(...a),
    listFieldWorkerEndingAppeals: (...a: unknown[]) => listFieldWorkerEndingAppeals(...a),
    listAppealEligibleFieldWorkers: (...a: unknown[]) => listAppealEligibleFieldWorkers(...a),
    lodgeFieldWorkerEndingAppeal: (...a: unknown[]) => lodgeFieldWorkerEndingAppeal(...a),
    decideFieldWorkerEndingAppeal: (...a: unknown[]) => decideFieldWorkerEndingAppeal(...a),
    withdrawFieldWorkerEndingAppeal: (...a: unknown[]) => withdrawFieldWorkerEndingAppeal(...a),
    listFieldWorkerNotices: (...a: unknown[]) => listFieldWorkerNotices(...a),
  };
});

const { FindWorkerPage, AppealsPage } = await import('../src/modules/field-workers/index.js');
const { resolveEn: t } = await import('../src/modules/field-workers/i18n-en.js');
const { ApiError } = await import('../src/api/client.js');
const { createQueryClient } = await import('../src/api/hooks.js');

const P = '11111111-1111-4111-8111-111111111111';
const W = '00000000-0000-4000-8000-000000000001';
const W2 = '00000000-0000-4000-8000-000000000002';
const A1 = '00000000-0000-4000-8000-0000000000a1';
const A2 = '00000000-0000-4000-8000-0000000000a2';
const DAY = /^\d{4}-\d{2}-\d{2}$/;

const appeal = (o: Record<string, unknown> = {}) => ({
  appeal_id: A1,
  field_worker_id: W,
  ending_event_version: 4,
  state: 'open',
  heard_by: 'trustee_panel',
  received_on: '2026-11-05',
  received_via: 'phone',
  decided_on: null,
  lodged_by: { user_id: A1, display_name: 'Trustee' },
  created_at: '2026-11-05T05:00:00.000Z',
  ...o,
});
const listItem = (o: Record<string, unknown> = {}) => ({ ...appeal(), name: 'Ramesh Kumar', district: 'Patna', ...o });
const cand = (id: string, name: string, o: Record<string, unknown> = {}) => ({
  field_worker_id: id,
  display_name: name,
  district: 'Patna',
  ended_on: '2026-11-01',
  reason_code: 'inactive',
  ending_event_version: 2,
  heard_by: 'pariwar_admin',
  ...o,
});
const page = (items: unknown[], next: string | null = null) => ({ items, next_cursor: next });

beforeEach(() => {
  for (const fn of MOCKS) fn.mockReset();
  getFieldWorkerDistricts.mockResolvedValue({ districts: ['Gaya', 'Patna'], districts_truncated: false });
  listFieldWorkerNotices.mockResolvedValue({ items: [], next_cursor: null });
  getFieldWorkerEndingAppealsOf.mockResolvedValue({ items: [] });
  listFieldWorkerEndingAppeals.mockResolvedValue(page([]));
  listAppealEligibleFieldWorkers.mockResolvedValue(page([]));
});
afterEach(() => vi.useRealTimers());

function renderAppeals() {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <AppealsPage pariwarId={P} />
    </QueryClientProvider>,
  );
}
/** The first read lists `items`; every LATER read (the refresh after a refusal or an act) lists none — as the real "waiting" list does once the appeal is closed. */
function listThenEmpty(items: unknown[]) {
  listFieldWorkerEndingAppeals.mockResolvedValueOnce(page(items));
  listFieldWorkerEndingAppeals.mockResolvedValue(page([]));
}
const openAct = async (act: 'allowed' | 'refused' | 'withdrawn') => {
  const item = await screen.findByTestId('fw-appeal-item');
  fireEvent.click(within(item).getByTestId(`fw-appeal-${act}`));
  return item;
};
const confirm = () => fireEvent.click(screen.getByTestId('fw-appeal-confirm'));

describe('R2D-2 / R2D-4 / R2D-7 — a STALE refusal is said where it survives its own refresh', () => {
  it('decide: another officer decided it first (409 appeal_not_open) — the row leaves with the refresh and the line STAYS, on the page', async () => {
    listThenEmpty([listItem()]);
    decideFieldWorkerEndingAppeal.mockRejectedValue(new ApiError(409, 'field_worker.appeal_not_open', 'closed'));
    renderAppeals();
    await openAct('allowed');
    confirm();
    await waitFor(() => expect(screen.queryByTestId('fw-appeal-item')).toBeNull()); // the refresh took the row, and with it a line kept inside it
    const stale = screen.getByTestId('fw-appeals-stale');
    expect(stale).toHaveAttribute('role', 'alert');
    expect(stale).toHaveTextContent(t('fw.err.appealNotOpen'));
    expect(listFieldWorkerEndingAppeals).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId('fw-appeals-outcome')).toBeEmptyDOMElement(); // not mistaken for a success
  });

  it('eligible lodge: the ending changed meanwhile (409 illegal_transition) — the APPEALS line, ⛔ the approvals’ "already approved"; the candidate leaves and the line stays', async () => {
    listAppealEligibleFieldWorkers.mockResolvedValueOnce(page([cand(W2, 'Sita Devi')]));
    listAppealEligibleFieldWorkers.mockResolvedValue(page([]));
    lodgeFieldWorkerEndingAppeal.mockRejectedValue(new ApiError(409, 'field_worker.illegal_transition', 'not ended'));
    renderAppeals();
    fireEvent.click(await screen.findByTestId('fw-appeals-record-open'));
    const c = await screen.findByTestId('fw-appeals-eligible-item');
    fireEvent.change(within(c).getByTestId('fw-appeals-via'), { target: { value: 'phone' } });
    fireEvent.click(within(c).getByTestId('fw-appeals-lodge'));
    await waitFor(() => expect(screen.queryByTestId('fw-appeals-eligible-item')).toBeNull());
    const stale = screen.getByTestId('fw-appeals-stale');
    expect(stale).toHaveTextContent(t('fw.err.appealWorkerChanged'));
    expect(stale.textContent).not.toContain(t('fw.approvals.alreadyDone'));
    expect(screen.getByTestId('fw-appeals-outcome')).toBeEmptyDOMElement();
  });

  it('decide: 409 authorization_stale (the worker’s record moved) is the APPEALS line too — ⛔ the approvals’ "moved" line — and stays on the page', async () => {
    listThenEmpty([listItem()]);
    decideFieldWorkerEndingAppeal.mockRejectedValue(new ApiError(409, 'field_worker.authorization_stale', 'moved'));
    renderAppeals();
    await openAct('allowed');
    confirm();
    await waitFor(() => expect(screen.queryByTestId('fw-appeal-item')).toBeNull());
    const stale = screen.getByTestId('fw-appeals-stale');
    expect(stale).toHaveTextContent(t('fw.err.appealWorkerChanged'));
    expect(stale.textContent).not.toContain(t('fw.approvals.moved'));
  });

  it.each([
    ['field_worker.appeal_open', 'fw.err.appealOpen'],
    ['field_worker.appeal_already_decided', 'fw.err.appealAlreadyDecided'],
  ] as const)('eligible lodge: %s REFRESHES the lists (a retry would answer the same 409) and says so on the page', async (code, line) => {
    listAppealEligibleFieldWorkers.mockResolvedValueOnce(page([cand(W2, 'Sita Devi')]));
    listAppealEligibleFieldWorkers.mockResolvedValue(page([]));
    lodgeFieldWorkerEndingAppeal.mockRejectedValue(new ApiError(409, code, 'x'));
    renderAppeals();
    fireEvent.click(await screen.findByTestId('fw-appeals-record-open'));
    const c = await screen.findByTestId('fw-appeals-eligible-item');
    fireEvent.change(within(c).getByTestId('fw-appeals-via'), { target: { value: 'phone' } });
    fireEvent.click(within(c).getByTestId('fw-appeals-lodge'));
    await waitFor(() => expect(listAppealEligibleFieldWorkers).toHaveBeenCalledTimes(2)); // the refresh
    await waitFor(() => expect(screen.queryByTestId('fw-appeals-eligible-item')).toBeNull());
    expect(screen.getByTestId('fw-appeals-stale')).toHaveTextContent(`${t(line)} ${t('fw.err.listRefreshed')}`);
  });

  it('a new attempt clears the stale line about the last one, and so does a success', async () => {
    listFieldWorkerEndingAppeals.mockResolvedValue(page([listItem()]));
    decideFieldWorkerEndingAppeal.mockRejectedValueOnce(new ApiError(409, 'field_worker.appeal_not_open', 'closed'));
    let finish!: (v: unknown) => void;
    decideFieldWorkerEndingAppeal.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; })); // the second attempt is IN FLIGHT
    renderAppeals();
    await openAct('refused');
    confirm();
    await waitFor(() => expect(screen.getByTestId('fw-appeals-stale')).toHaveTextContent(t('fw.err.appealNotOpen')));
    // The row is still listed here (the refresh kept it): the next attempt clears the old line AT ONCE - while it is still in flight, so it is
    // the attempt that cleared it, ⛔ the success that follows (which also clears it, and would hide a missing clear).
    const item = await screen.findByTestId('fw-appeal-item');
    fireEvent.click(within(item).getByTestId('fw-appeal-refused'));
    confirm();
    await waitFor(() => expect(decideFieldWorkerEndingAppeal).toHaveBeenCalledTimes(2));
    expect(screen.getByTestId('fw-appeals-stale')).toBeEmptyDOMElement();
    expect(screen.getByTestId('fw-appeals-outcome')).toBeEmptyDOMElement(); // nothing has succeeded yet
    await act(async () => finish({ appeal: appeal({ state: 'refused', decided_on: '2026-11-06' }), worker: null }));
    await waitFor(() => expect(screen.getByTestId('fw-appeals-outcome')).toHaveTextContent(t('fw.appeals.done.refused', { name: 'Ramesh Kumar' })));
    expect(screen.getByTestId('fw-appeals-stale')).toBeEmptyDOMElement();
  });
});

describe('R2D-2 — a lodge form clears the stale line about its last attempt, too', () => {
  it('eligible list: the next attempt clears it AT ONCE (while in flight), ⛔ only the success that follows', async () => {
    listAppealEligibleFieldWorkers.mockResolvedValue(page([cand(W2, 'Sita Devi')]));
    lodgeFieldWorkerEndingAppeal.mockRejectedValueOnce(new ApiError(409, 'field_worker.ending_changed', 'new ending'));
    let finish!: (v: unknown) => void;
    lodgeFieldWorkerEndingAppeal.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    renderAppeals();
    fireEvent.click(await screen.findByTestId('fw-appeals-record-open'));
    const c = await screen.findByTestId('fw-appeals-eligible-item');
    fireEvent.change(within(c).getByTestId('fw-appeals-via'), { target: { value: 'phone' } });
    fireEvent.click(within(c).getByTestId('fw-appeals-lodge'));
    await waitFor(() => expect(screen.getByTestId('fw-appeals-stale')).toHaveTextContent(t('fw.err.endingChanged')));
    fireEvent.click(within(await screen.findByTestId('fw-appeals-eligible-item')).getByTestId('fw-appeals-lodge'));
    await waitFor(() => expect(lodgeFieldWorkerEndingAppeal).toHaveBeenCalledTimes(2));
    expect(screen.getByTestId('fw-appeals-stale')).toBeEmptyDOMElement();
    expect(screen.getByTestId('fw-appeals-outcome')).toBeEmptyDOMElement();
    await act(async () => finish(appeal()));
    await waitFor(() => expect(screen.getByTestId('fw-appeals-outcome')).toHaveTextContent(t('fw.appeals.lodgedFor', { name: 'Sita Devi' })));
  });
});

// ── Find's worker panel ───────────────────────────────────────────────────────────────────────────────────────────────────────────
type State = 'pending_kyc' | 'active' | 'suspended' | 'terminated';
let version = 4;
const identity = (id: string, name: string) => ({
  field_worker_id: id,
  name,
  mobile: '+919876500010',
  district: 'Patna',
  current_state: 'terminated' as State,
  kyc_status: 'completed',
  registered_by_display: 'Asha Verma',
  approved_by_display: 'Meera Rao',
  created_at: '2026-11-04T05:00:00.000Z',
  code_sms_status: null,
  state_event_version: version,
});
const row = (id: string, name: string) => ({
  field_worker_id: id,
  name,
  district: 'Patna',
  current_state: 'terminated',
  kyc_status: 'completed',
  registered_by_display: 'Asha Verma',
  created_at: '2026-11-04T05:00:00.000Z',
  code_sms_status: null,
});
async function openFind(workers: Array<[string, string]> = [[W, 'Ramesh Kumar']]) {
  version = 4;
  listFieldWorkers.mockImplementation(async () => ({ items: workers.map(([id, n]) => row(id, n)), next_cursor: null }));
  getFieldWorkerIdentity.mockImplementation(async (_p: string, id: string) => identity(id, workers.find(([w]) => w === id)![1]));
  render(
    <QueryClientProvider client={createQueryClient()}>
      <FindWorkerPage pariwarId={P} />
    </QueryClientProvider>,
  );
  fireEvent.change(screen.getByTestId('fw-find-state'), { target: { value: 'terminated' } });
  await screen.findByRole('option', { name: 'Patna' });
  const d = screen.getByTestId('fw-find-district') as HTMLSelectElement;
  fireEvent.change(d, { target: { value: [...d.options].find((o) => o.textContent === 'Patna')!.value } });
  return screen.findAllByTestId('fw-find-check');
}
const startFindLodge = async (via: 'phone' | 'in_person' = 'phone') => {
  const panel = await screen.findByTestId('fw-worker-appeals');
  fireEvent.click(await within(panel).findByTestId('fw-worker-appeals-record'));
  fireEvent.change(within(panel).getByTestId('fw-appeals-via'), { target: { value: via } });
  return panel;
};

describe('R2D-2 / R2D-5 — Find’s lodging panel', () => {
  it('the ending changed (409): the form is re-keyed for the NEW ending, and the officer is TOLD, in the panel, after the form was rebuilt', async () => {
    lodgeFieldWorkerEndingAppeal.mockRejectedValueOnce(new ApiError(409, 'field_worker.ending_changed', 'new ending'));
    fireEvent.click((await openFind())[0]!);
    const panel = await startFindLodge('in_person');
    version = 6; // the re-read of the identity names the new ending
    fireEvent.click(within(panel).getByTestId('fw-appeals-lodge'));
    await waitFor(() => expect(within(panel).getByTestId('fw-appeals-via')).toHaveValue('')); // a fresh form for ending 6
    const line = within(panel).getByTestId('fw-worker-appeals-stale');
    expect(line).toHaveAttribute('role', 'alert');
    expect(line).toHaveTextContent(t('fw.err.endingChanged')); // the line outlived the form it was raised in
  });

  it('a new attempt clears the stale line about the last one (while in flight)', async () => {
    lodgeFieldWorkerEndingAppeal.mockRejectedValueOnce(new ApiError(409, 'field_worker.ending_changed', 'new ending'));
    let finish!: (v: unknown) => void;
    lodgeFieldWorkerEndingAppeal.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    fireEvent.click((await openFind())[0]!);
    const panel = await startFindLodge('in_person');
    version = 6;
    fireEvent.click(within(panel).getByTestId('fw-appeals-lodge'));
    await waitFor(() => expect(within(panel).getByTestId('fw-appeals-via')).toHaveValue('')); // the form for ending 6
    expect(within(panel).getByTestId('fw-worker-appeals-stale')).toHaveTextContent(t('fw.err.endingChanged'));
    fireEvent.change(within(panel).getByTestId('fw-appeals-via'), { target: { value: 'phone' } });
    fireEvent.click(within(panel).getByTestId('fw-appeals-lodge'));
    await waitFor(() => expect(lodgeFieldWorkerEndingAppeal).toHaveBeenCalledTimes(2));
    expect(within(panel).getByTestId('fw-worker-appeals-stale')).toBeEmptyDOMElement();
    await act(async () => finish(appeal({ ending_event_version: 6 })));
  });

  it('403: Find does not know who hears this ending, so the line is true of BOTH hearers — ⛔ "ask a Pariwar Admin"', async () => {
    lodgeFieldWorkerEndingAppeal.mockRejectedValueOnce(new ApiError(403, 'authz.forbidden', 'no'));
    fireEvent.click((await openFind())[0]!);
    const panel = await startFindLodge();
    fireEvent.click(within(panel).getByTestId('fw-appeals-lodge'));
    const err = await within(panel).findByTestId('fw-appeals-lodge-error');
    expect(err).toHaveTextContent(t('fw.appeals.noAccess.lodge.unknown'));
    expect(err.textContent).not.toMatch(/ask a Pariwar Admin/);
  });

  // R2D-13 — the lower bound is in hand on Find (the registration day, as India reads it); the eligible list has none to offer.
  it('the date control offers no day before the worker was registered', async () => {
    fireEvent.click((await openFind())[0]!);
    const panel = await startFindLodge();
    expect(within(panel).getByTestId('fw-appeals-received-on')).toHaveAttribute('min', '2026-11-04');
  });

  // R2D-18 (AC12) — "a lodge form's retry key resets when worker B opens".
  it('worker B after worker A starts fresh: A’s failed attempt’s Idempotency-Key is never B’s, and A’s retry still reuses its own', async () => {
    lodgeFieldWorkerEndingAppeal.mockRejectedValue(new TypeError('network')); // retryable: the attempt's key is KEPT
    const checks = await openFind([
      [W, 'Ramesh Kumar'],
      [W2, 'Sita Devi'],
    ]);
    fireEvent.click(checks[0]!);
    let panel = await startFindLodge('phone');
    fireEvent.click(within(panel).getByTestId('fw-appeals-lodge'));
    await within(panel).findByTestId('fw-appeals-lodge-error');
    fireEvent.click(within(panel).getByTestId('fw-appeals-lodge')); // A's retry
    await waitFor(() => expect(lodgeFieldWorkerEndingAppeal).toHaveBeenCalledTimes(2));
    expect(lodgeFieldWorkerEndingAppeal.mock.calls[1]![3]).toBe(lodgeFieldWorkerEndingAppeal.mock.calls[0]![3]); // CONTROL — the same attempt, the same key
    fireEvent.click(screen.getAllByTestId('fw-find-check')[1]!);
    await waitFor(() => expect(getFieldWorkerIdentity).toHaveBeenLastCalledWith(P, W2));
    panel = await startFindLodge('phone');
    expect(within(panel).queryByTestId('fw-appeals-lodge-error')).toBeNull(); // B's form does not inherit A's line either
    fireEvent.click(within(panel).getByTestId('fw-appeals-lodge'));
    await waitFor(() => expect(lodgeFieldWorkerEndingAppeal).toHaveBeenCalledTimes(3));
    expect(lodgeFieldWorkerEndingAppeal.mock.calls[2]![1]).toBe(W2);
    expect(lodgeFieldWorkerEndingAppeal.mock.calls[2]![3]).not.toBe(lodgeFieldWorkerEndingAppeal.mock.calls[0]![3]);
  });
});

describe('R2D-5 — a 403 on an appeal act names WHO hears it, ⛔ sends a Pariwar Admin to "ask a Pariwar Admin"', () => {
  it.each([
    ['trustee_panel', 'fw.appeals.noAccess.hear.trustee_panel'],
    ['pariwar_admin', 'fw.appeals.noAccess.hear.pariwar_admin'],
  ] as const)('decide on an appeal %s hears: the line says so', async (heardBy, key) => {
    listFieldWorkerEndingAppeals.mockResolvedValue(page([listItem({ heard_by: heardBy })]));
    decideFieldWorkerEndingAppeal.mockRejectedValue(new ApiError(403, 'authz.forbidden', 'no'));
    renderAppeals();
    await openAct('allowed');
    confirm();
    const err = await screen.findByTestId('fw-appeal-error');
    expect(err).toHaveTextContent(t(key));
    expect(err.textContent).not.toMatch(/ask a Pariwar Admin/);
  });

  it('withdraw on a Panel-heard appeal: the same line', async () => {
    listFieldWorkerEndingAppeals.mockResolvedValue(page([listItem()]));
    withdrawFieldWorkerEndingAppeal.mockRejectedValue(new ApiError(403, 'authz.forbidden', 'no'));
    renderAppeals();
    await openAct('withdrawn');
    confirm();
    expect(await screen.findByTestId('fw-appeal-error')).toHaveTextContent(t('fw.appeals.noAccess.hear.trustee_panel'));
  });

  it('eligible lodge: the candidate carries its hearer, and the line names it', async () => {
    listAppealEligibleFieldWorkers.mockResolvedValue(page([cand(W2, 'Sita Devi', { heard_by: 'trustee_panel' })]));
    lodgeFieldWorkerEndingAppeal.mockRejectedValue(new ApiError(403, 'authz.forbidden', 'no'));
    renderAppeals();
    fireEvent.click(await screen.findByTestId('fw-appeals-record-open'));
    const c = await screen.findByTestId('fw-appeals-eligible-item');
    fireEvent.change(within(c).getByTestId('fw-appeals-via'), { target: { value: 'phone' } });
    fireEvent.click(within(c).getByTestId('fw-appeals-lodge'));
    expect(await within(c).findByTestId('fw-appeals-lodge-error')).toHaveTextContent(t('fw.appeals.noAccess.lodge.trustee_panel'));
  });

  it('CONTROL — the READ page keeps its own line ("choose a district you manage"): that line is true there', async () => {
    listFieldWorkerEndingAppeals.mockRejectedValue(new ApiError(403, 'authz.forbidden', 'no'));
    renderAppeals();
    expect(await screen.findByTestId('fw-appeals-error')).toHaveTextContent(t('fw.appeals.noAccess'));
  });
});

describe('R2D-8 — a number registered again, on an appeal decision', () => {
  it('tells the hearer to decide again once that registration is ended — ⛔ "undo this ending"', async () => {
    listFieldWorkerEndingAppeals.mockResolvedValue(page([listItem()]));
    decideFieldWorkerEndingAppeal.mockRejectedValue(new ApiError(409, 'field_worker.number_registered_again', 'taken'));
    renderAppeals();
    await openAct('allowed');
    confirm();
    const err = await screen.findByTestId('fw-appeal-error');
    expect(err).toHaveTextContent(t('fw.err.appealNumberRegisteredAgain'));
    expect(err.textContent).toMatch(/decide this appeal again/);
    expect(err.textContent).not.toMatch(/undo/i);
  });
});

describe('R2D-9 — an error line describes ITS value, and goes when the value or the act changes', () => {
  it('decide: a date error clears when the date is edited; a no-access line does not', async () => {
    listFieldWorkerEndingAppeals.mockResolvedValue(page([listItem()]));
    decideFieldWorkerEndingAppeal.mockRejectedValueOnce(new ApiError(422, 'field_worker.appeal_date_invalid', 'bad'));
    renderAppeals();
    await openAct('allowed');
    confirm();
    expect(await screen.findByTestId('fw-appeal-error')).toHaveTextContent(t('fw.err.appealDateInvalid'));
    fireEvent.change(screen.getByTestId('fw-appeal-decided-on'), { target: { value: '2026-11-06' } });
    expect(screen.queryByTestId('fw-appeal-error')).toBeNull();
    decideFieldWorkerEndingAppeal.mockRejectedValueOnce(new ApiError(403, 'authz.forbidden', 'no'));
    confirm();
    expect(await screen.findByTestId('fw-appeal-error')).toHaveTextContent(t('fw.appeals.noAccess.hear.trustee_panel'));
    fireEvent.change(screen.getByTestId('fw-appeal-decided-on'), { target: { value: '2026-11-07' } });
    expect(screen.getByTestId('fw-appeal-error')).toHaveTextContent(t('fw.appeals.noAccess.hear.trustee_panel')); // not about the value: it stays
  });

  it('decide: choosing another act clears the old act’s date error', async () => {
    listFieldWorkerEndingAppeals.mockResolvedValue(page([listItem()]));
    decideFieldWorkerEndingAppeal.mockRejectedValueOnce(new ApiError(422, 'field_worker.appeal_date_invalid', 'bad'));
    renderAppeals();
    const item = await openAct('allowed');
    confirm();
    await screen.findByTestId('fw-appeal-error');
    fireEvent.click(within(item).getByTestId('fw-appeal-refused'));
    expect(screen.queryByTestId('fw-appeal-error')).toBeNull();
  });

  it('lodge: a date error clears when the date is edited', async () => {
    listAppealEligibleFieldWorkers.mockResolvedValue(page([cand(W2, 'Sita Devi')]));
    lodgeFieldWorkerEndingAppeal.mockRejectedValueOnce(new ApiError(422, 'field_worker.appeal_date_invalid', 'bad'));
    renderAppeals();
    fireEvent.click(await screen.findByTestId('fw-appeals-record-open'));
    const c = await screen.findByTestId('fw-appeals-eligible-item');
    fireEvent.change(within(c).getByTestId('fw-appeals-via'), { target: { value: 'phone' } });
    fireEvent.click(within(c).getByTestId('fw-appeals-lodge'));
    expect(await within(c).findByTestId('fw-appeals-lodge-error')).toHaveTextContent(t('fw.err.appealDateInvalid'));
    fireEvent.change(within(c).getByTestId('fw-appeals-received-on'), { target: { value: '2026-11-06' } });
    expect(within(c).queryByTestId('fw-appeals-lodge-error')).toBeNull();
  });
});

describe('R2D-10 — the decision date is HELD while the decision is in flight', () => {
  it('an edit during the flight is ignored, and the retry after a lost response is the SAME attempt: the same key, the same date', async () => {
    listFieldWorkerEndingAppeals.mockResolvedValue(page([listItem()]));
    let lose!: (e: unknown) => void;
    decideFieldWorkerEndingAppeal.mockImplementationOnce(() => new Promise((_ok, no) => { lose = no; }));
    decideFieldWorkerEndingAppeal.mockResolvedValueOnce({ appeal: appeal({ state: 'allowed', decided_on: '2026-11-05' }), worker: null });
    renderAppeals();
    await openAct('allowed');
    const date = screen.getByTestId('fw-appeal-decided-on') as HTMLInputElement;
    fireEvent.change(date, { target: { value: '2026-11-05' } });
    confirm();
    await waitFor(() => expect(decideFieldWorkerEndingAppeal).toHaveBeenCalledTimes(1));
    expect(date.readOnly).toBe(true);
    expect(screen.getByTestId('fw-appeal-confirm')).toHaveAttribute('aria-disabled', 'true');
    fireEvent.change(date, { target: { value: '2026-11-01' } }); // ⛔ not what was sent
    expect(date.value).toBe('2026-11-05');
    await act(async () => lose(new TypeError('network'))); // the response is lost: retryable, the attempt's key is kept
    await screen.findByTestId('fw-appeal-error');
    expect(date.readOnly).toBe(false);
    confirm();
    await waitFor(() => expect(decideFieldWorkerEndingAppeal).toHaveBeenCalledTimes(2));
    expect(decideFieldWorkerEndingAppeal.mock.calls[1]![2]).toEqual({ outcome: 'allowed', decided_on: '2026-11-05' });
    expect(decideFieldWorkerEndingAppeal.mock.calls[1]![3]).toBe(decideFieldWorkerEndingAppeal.mock.calls[0]![3]);
  });
});

describe('R2D-11 — focus stays where the module keeps it', () => {
  it('opening an act takes focus into its form; Cancel gives it back to the act that opened it', async () => {
    listFieldWorkerEndingAppeals.mockResolvedValue(page([listItem()]));
    renderAppeals();
    const item = await openAct('refused');
    const form = within(item).getByTestId('fw-appeal-form');
    await waitFor(() => expect(document.activeElement).toBe(form));
    fireEvent.click(within(form).getByRole('button', { name: t('fw.actions.cancel') }));
    expect(document.activeElement).toBe(within(item).getByTestId('fw-appeal-refused'));
    expect(within(item).queryByTestId('fw-appeal-form')).toBeNull();
  });

  it('while it saves, Confirm and Cancel are `aria-disabled`, ⛔ `disabled` (a disabled focused control loses focus)', async () => {
    listFieldWorkerEndingAppeals.mockResolvedValue(page([listItem()]));
    decideFieldWorkerEndingAppeal.mockImplementation(() => new Promise(() => undefined));
    renderAppeals();
    const item = await openAct('allowed');
    confirm();
    await waitFor(() => expect(screen.getByTestId('fw-appeal-confirm')).toHaveAttribute('aria-disabled', 'true'));
    expect(screen.getByTestId('fw-appeal-confirm')).not.toBeDisabled();
    const cancel = within(item).getByRole('button', { name: t('fw.actions.cancel') });
    expect(cancel).toHaveAttribute('aria-disabled', 'true');
    expect(cancel).not.toBeDisabled();
    for (const act of ['allowed', 'refused', 'withdrawn'] as const) expect(within(item).getByTestId(`fw-appeal-${act}`)).not.toBeDisabled();
    // A press while it saves does nothing (jsdom keeps focus on a disabled control, so the ATTRIBUTE is what is proved, not the focus).
    fireEvent.click(within(item).getByTestId('fw-appeal-refused'));
    fireEvent.click(cancel);
    expect(within(item).getByTestId('fw-appeal-form')).toHaveAttribute('aria-label', t('fw.appeals.actFor', { act: t('fw.appeals.act.allowed'), name: 'Ramesh Kumar' }));
    expect(decideFieldWorkerEndingAppeal).toHaveBeenCalledTimes(1);
  });

  it('a finished decision takes focus to the page, ⛔ the body (the pressed control left with its row)', async () => {
    listThenEmpty([listItem()]);
    decideFieldWorkerEndingAppeal.mockResolvedValue({ appeal: appeal({ state: 'refused', decided_on: '2026-11-06' }), worker: null });
    renderAppeals();
    await openAct('refused');
    confirm();
    await waitFor(() => expect(screen.getByTestId('fw-appeals-outcome')).toHaveTextContent(t('fw.appeals.done.refused', { name: 'Ramesh Kumar' })));
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('heading', { level: 1 })));
  });

  it('"Load more" says what arrived, is `aria-disabled` while it loads, and hands focus to the page on the last page', async () => {
    let finishPage!: (v: unknown) => void;
    listFieldWorkerEndingAppeals.mockImplementation(async (_p: string, q: { cursor?: string }) => {
      if (q.cursor === undefined) return page([listItem()], 'p2');
      return new Promise((resolve) => { finishPage = resolve; });
    });
    renderAppeals();
    const more = await screen.findByTestId('fw-appeals-more');
    expect(more).not.toHaveAttribute('aria-disabled');
    fireEvent.click(more);
    await waitFor(() => expect(screen.getByTestId('fw-appeals-more')).toHaveAttribute('aria-disabled', 'true'));
    expect(screen.getByTestId('fw-appeals-more')).not.toBeDisabled();
    fireEvent.click(screen.getByTestId('fw-appeals-more')); // pressed again while loading: no second read
    expect(listFieldWorkerEndingAppeals).toHaveBeenCalledTimes(2);
    await act(async () => finishPage(page([listItem({ appeal_id: A2, name: 'Sita Devi' })], null)));
    await waitFor(() => expect(screen.getByTestId('fw-appeals-more-status')).toHaveTextContent(t('fw.appeals.moreOne')));
    expect(screen.getByTestId('fw-appeals-more-status')).toHaveAttribute('role', 'status');
    expect(screen.queryByTestId('fw-appeals-more')).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('heading', { level: 1 })));
  });
});

describe('R2D-12 — a failed first page offers "Try again", and focus stays in the page', () => {
  it('the appeal list: a 503 is retryable — the button refetches and the list appears; a 403 offers none', async () => {
    listFieldWorkerEndingAppeals.mockRejectedValueOnce(new ApiError(503, 'server.error', 'down'));
    listFieldWorkerEndingAppeals.mockResolvedValue(page([listItem()]));
    renderAppeals();
    const retry = await screen.findByTestId('fw-appeals-retry');
    retry.focus(); // as a keyboard press would have it (jsdom's `click` does not move focus)
    fireEvent.click(retry);
    expect(document.activeElement).toBe(screen.getByRole('heading', { level: 1 })); // before the refetch unmounts the alert and the button
    expect(await screen.findByTestId('fw-appeal-item')).toBeInTheDocument();
    expect(screen.queryByTestId('fw-appeals-error')).toBeNull();
  });

  it('a 403 is not retryable: the line, no button', async () => {
    listFieldWorkerEndingAppeals.mockRejectedValue(new ApiError(403, 'authz.forbidden', 'no'));
    renderAppeals();
    await screen.findByTestId('fw-appeals-error');
    expect(screen.queryByTestId('fw-appeals-retry')).toBeNull();
  });

  it('the eligible list: a 429 is retryable — "Record an appeal" is hidden meanwhile, so the button is the way back', async () => {
    listAppealEligibleFieldWorkers.mockRejectedValueOnce(new ApiError(429, 'rate_limited', 'slow'));
    listAppealEligibleFieldWorkers.mockResolvedValue(page([cand(W2, 'Sita Devi')]));
    renderAppeals();
    fireEvent.click(await screen.findByTestId('fw-appeals-record-open'));
    const retry = await screen.findByTestId('fw-appeals-eligible-retry');
    expect(screen.queryByTestId('fw-appeals-record-open')).toBeNull();
    retry.focus();
    fireEvent.click(retry);
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: t('fw.appeals.record') })); // the section's heading, before the alert unmounts
    expect(await screen.findByTestId('fw-appeals-eligible-item')).toBeInTheDocument();
  });

  it('Find’s per-worker panel: a failed read offers "Try again" and keeps focus on the panel’s heading', async () => {
    getFieldWorkerEndingAppealsOf.mockRejectedValueOnce(new ApiError(503, 'server.error', 'down'));
    getFieldWorkerEndingAppealsOf.mockResolvedValue({ items: [appeal({ state: 'withdrawn', decided_on: '2026-11-06' })] });
    fireEvent.click((await openFind())[0]!);
    const panel = await screen.findByTestId('fw-worker-appeals');
    const retry = await within(panel).findByRole('button', { name: t('fw.retry') });
    retry.focus();
    fireEvent.click(retry);
    expect(document.activeElement).toBe(within(panel).getByRole('heading', { name: t('fw.appeals.title') }));
    await within(panel).findByText(/Withdrawn/);
  });
});

describe('R2D-13 — the decision date offers no day before the worker appealed', () => {
  it('`min` is the appeal’s own received day; `max` is today in India', async () => {
    listFieldWorkerEndingAppeals.mockResolvedValue(page([listItem({ received_on: '2026-10-28' })]));
    renderAppeals();
    await openAct('allowed');
    const date = screen.getByTestId('fw-appeal-decided-on');
    expect(date).toHaveAttribute('min', '2026-10-28');
    expect(date.getAttribute('max')).toMatch(DAY);
  });
});

describe('R2D-15 — every row’s controls say whose they are', () => {
  it('two appeals: the same three acts, four DISTINCT-per-row accessible names that still contain the visible label', async () => {
    listFieldWorkerEndingAppeals.mockResolvedValue(page([listItem(), listItem({ appeal_id: A2, field_worker_id: W2, name: 'Sita Devi' })]));
    renderAppeals();
    await screen.findAllByTestId('fw-appeal-item');
    const names = screen.getAllByTestId('fw-appeal-allowed').map((b) => b.getAttribute('aria-label'));
    expect(names).toEqual(['Allow: Ramesh Kumar', 'Allow: Sita Devi']);
    expect(screen.getByRole('button', { name: 'Refuse: Sita Devi' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'The worker withdrew: Ramesh Kumar' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Allow: Sita Devi' }));
    expect(screen.getByRole('form', { name: 'Allow: Sita Devi' })).toBeInTheDocument();
  });

  it('two candidates: each lodging form and its button are named by the worker', async () => {
    listAppealEligibleFieldWorkers.mockResolvedValue(page([cand(W, 'Ramesh Kumar'), cand(W2, 'Sita Devi')]));
    renderAppeals();
    fireEvent.click(await screen.findByTestId('fw-appeals-record-open'));
    await screen.findAllByTestId('fw-appeals-eligible-item');
    expect(screen.getByRole('form', { name: 'Record an appeal: Ramesh Kumar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Record the appeal: Sita Devi' })).toBeInTheDocument();
  });
});

describe('R2D-16 — the count a screen reader hears is grammatical', () => {
  it.each([
    [0, 'No appeals shown.'],
    [1, '1 appeal shown.'],
    [2, '2 appeals shown.'],
  ] as const)('%i appeals → "%s"', async (n, line) => {
    listFieldWorkerEndingAppeals.mockResolvedValue(page(Array.from({ length: n }, (_, i) => listItem({ appeal_id: `00000000-0000-4000-8000-0000000000b${String(i)}` }))));
    renderAppeals();
    expect(await screen.findByText(line)).toBeInTheDocument();
  });
});

describe('R2D-18 — the legs AC12 lists that nothing exercised', () => {
  it('the state filter reaches the read: the default is "waiting", a choice is sent by its state, "All" sends none', async () => {
    renderAppeals();
    await waitFor(() => expect(listFieldWorkerEndingAppeals).toHaveBeenCalledWith(P, { state: 'open' }));
    fireEvent.change(screen.getByTestId('fw-appeals-filter'), { target: { value: 'refused' } });
    await waitFor(() => expect(listFieldWorkerEndingAppeals).toHaveBeenLastCalledWith(P, { state: 'refused' }));
    fireEvent.change(screen.getByTestId('fw-appeals-filter'), { target: { value: '' } });
    await waitFor(() => expect(listFieldWorkerEndingAppeals).toHaveBeenLastCalledWith(P, {}));
  });

  it('a REFUSAL reminds the officer to tell the worker, and sends `refused` with the day', async () => {
    listThenEmpty([listItem()]);
    decideFieldWorkerEndingAppeal.mockResolvedValue({ appeal: appeal({ state: 'refused', decided_on: '2026-11-06' }), worker: null });
    renderAppeals();
    await openAct('refused');
    confirm();
    await waitFor(() => expect(screen.getByTestId('fw-appeals-outcome')).toHaveTextContent(`${t('fw.appeals.done.refused', { name: 'Ramesh Kumar' })} ${t('fw.actions.tell')}`));
    expect(decideFieldWorkerEndingAppeal).toHaveBeenCalledWith(P, A1, { outcome: 'refused', decided_on: expect.stringMatching(DAY) }, expect.any(String));
  });

  it('a WITHDRAWAL reminds the officer too, and runs the withdraw route (the hook’s third branch)', async () => {
    listThenEmpty([listItem()]);
    withdrawFieldWorkerEndingAppeal.mockResolvedValue(appeal({ state: 'withdrawn', decided_on: '2026-11-06' }));
    renderAppeals();
    await openAct('withdrawn');
    confirm();
    await waitFor(() => expect(screen.getByTestId('fw-appeals-outcome')).toHaveTextContent(`${t('fw.appeals.done.withdrawn', { name: 'Ramesh Kumar' })} ${t('fw.actions.tell')}`));
    expect(withdrawFieldWorkerEndingAppeal).toHaveBeenCalledWith(P, A1, expect.stringMatching(DAY), expect.any(String));
    expect(decideFieldWorkerEndingAppeal).not.toHaveBeenCalled();
  });
});

describe('R2D-20 — "today" is India’s day, pinned across the UTC / IST boundary', () => {
  // 20:00 UTC on 18 Nov is 01:30 IST on 19 Nov. A UTC date here sends the day BEFORE; `expect.any(String)` could not tell.
  const pinClock = () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-18T20:00:00.000Z'));
  };

  it('decide sends 19 Nov, and the control defaults to it', async () => {
    pinClock();
    listFieldWorkerEndingAppeals.mockResolvedValue(page([listItem()]));
    decideFieldWorkerEndingAppeal.mockResolvedValue({ appeal: appeal({ state: 'refused', decided_on: '2026-11-19' }), worker: null });
    renderAppeals();
    await openAct('refused');
    const date = screen.getByTestId('fw-appeal-decided-on') as HTMLInputElement;
    expect(date.value).toBe('2026-11-19');
    expect(date.max).toBe('2026-11-19');
    confirm();
    await waitFor(() => expect(decideFieldWorkerEndingAppeal).toHaveBeenCalledWith(P, A1, { outcome: 'refused', decided_on: '2026-11-19' }, expect.any(String)));
  });

  it('lodge sends 19 Nov', async () => {
    pinClock();
    listAppealEligibleFieldWorkers.mockResolvedValue(page([cand(W2, 'Sita Devi')]));
    lodgeFieldWorkerEndingAppeal.mockResolvedValue(appeal());
    renderAppeals();
    fireEvent.click(await screen.findByTestId('fw-appeals-record-open'));
    const c = await screen.findByTestId('fw-appeals-eligible-item');
    expect(within(c).getByTestId('fw-appeals-received-on')).toHaveValue('2026-11-19');
    fireEvent.change(within(c).getByTestId('fw-appeals-via'), { target: { value: 'phone' } });
    fireEvent.click(within(c).getByTestId('fw-appeals-lodge'));
    await waitFor(() => expect(lodgeFieldWorkerEndingAppeal).toHaveBeenCalledWith(P, W2, { expected_ending_version: 2, received_on: '2026-11-19', received_via: 'phone' }, expect.any(String)));
  });
});
