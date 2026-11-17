// Story 13.1f (AC12; AD6, AD11, AD12, AD14; the Panel's `2026-11-17-465`) — the undo on an opened worker, the register page's shown number
// and link, and the Appeals page. RTL with the API client mocked (the server's rules are the API specs').

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
const terminateFieldWorker = vi.fn();
const undoFieldWorkerEnding = vi.fn();
const getFieldWorkerEndingAppealsOf = vi.fn();
const registerFieldWorker = vi.fn();
const listFieldWorkerEndingAppeals = vi.fn();
const listAppealEligibleFieldWorkers = vi.fn();
const lodgeFieldWorkerEndingAppeal = vi.fn();
const decideFieldWorkerEndingAppeal = vi.fn();
const listFieldWorkerNotices = vi.fn();
const getFieldWorkerLog = vi.fn();
vi.mock('../src/api/client.js', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    listFieldWorkers: (...a: unknown[]) => listFieldWorkers(...a),
    getFieldWorkerIdentity: (...a: unknown[]) => getFieldWorkerIdentity(...a),
    getFieldWorkerDistricts: (...a: unknown[]) => getFieldWorkerDistricts(...a),
    terminateFieldWorker: (...a: unknown[]) => terminateFieldWorker(...a),
    undoFieldWorkerEnding: (...a: unknown[]) => undoFieldWorkerEnding(...a),
    getFieldWorkerEndingAppealsOf: (...a: unknown[]) => getFieldWorkerEndingAppealsOf(...a),
    registerFieldWorker: (...a: unknown[]) => registerFieldWorker(...a),
    listFieldWorkerEndingAppeals: (...a: unknown[]) => listFieldWorkerEndingAppeals(...a),
    listAppealEligibleFieldWorkers: (...a: unknown[]) => listAppealEligibleFieldWorkers(...a),
    lodgeFieldWorkerEndingAppeal: (...a: unknown[]) => lodgeFieldWorkerEndingAppeal(...a),
    decideFieldWorkerEndingAppeal: (...a: unknown[]) => decideFieldWorkerEndingAppeal(...a),
    listFieldWorkerNotices: (...a: unknown[]) => listFieldWorkerNotices(...a),
    getFieldWorkerLog: (...a: unknown[]) => getFieldWorkerLog(...a),
  };
});

const { FindWorkerPage, RegisterFieldWorkerPage, AppealsPage } = await import('../src/modules/field-workers/index.js');
const { resolveEn: t } = await import('../src/modules/field-workers/i18n-en.js');
const { ApiError } = await import('../src/api/client.js');
const { createQueryClient } = await import('../src/api/hooks.js');

const P = '11111111-1111-4111-8111-111111111111';
const W = '00000000-0000-4000-8000-000000000001';
const OLD = '00000000-0000-4000-8000-000000000009';
type State = 'pending_kyc' | 'active' | 'suspended' | 'terminated';
let state: State = 'active';
let version = 3;
const row = () => ({
  field_worker_id: W,
  name: 'Ramesh Kumar',
  district: 'Patna',
  current_state: state,
  kyc_status: state === 'pending_kyc' ? 'pending' : 'completed',
  registered_by_display: 'Asha Verma',
  created_at: '2026-11-04T05:00:00.000Z',
  code_sms_status: null,
});
const lifecycle = (o: Record<string, unknown>) => ({ field_worker_id: W, district: 'Patna', current_state: 'active', state_reason_code: null, ended_on: null, state_event_version: 1, ...o });

beforeEach(() => {
  for (const fn of [
    listFieldWorkers,
    getFieldWorkerIdentity,
    getFieldWorkerDistricts,
    terminateFieldWorker,
    undoFieldWorkerEnding,
    getFieldWorkerEndingAppealsOf,
    registerFieldWorker,
    listFieldWorkerEndingAppeals,
    listAppealEligibleFieldWorkers,
    lodgeFieldWorkerEndingAppeal,
    decideFieldWorkerEndingAppeal,
    listFieldWorkerNotices,
    getFieldWorkerLog,
  ])
    fn.mockReset();
  state = 'active';
  version = 3;
  getFieldWorkerDistricts.mockResolvedValue({ districts: ['Gaya', 'Patna'], districts_truncated: false });
  listFieldWorkers.mockImplementation(async (_p: string, o?: { state?: State }) => ({ items: o?.state === undefined || o.state === state ? [row()] : [], next_cursor: null }));
  getFieldWorkerIdentity.mockImplementation(async () => ({ ...row(), mobile: '+919876500010', approved_by_display: 'Meera Rao', state_event_version: version }));
  getFieldWorkerEndingAppealsOf.mockResolvedValue({ items: [] });
  listFieldWorkerNotices.mockResolvedValue({ items: [], next_cursor: null });
});

async function openWorker(s: State = 'active') {
  state = s;
  const qc = createQueryClient();
  render(
    <QueryClientProvider client={qc}>
      <FindWorkerPage pariwarId={P} />
    </QueryClientProvider>,
  );
  if (s !== 'active') fireEvent.change(screen.getByTestId('fw-find-state'), { target: { value: s } });
  await screen.findByRole('option', { name: 'Patna' });
  const select = screen.getByTestId('fw-find-district') as HTMLSelectElement;
  fireEvent.change(select, { target: { value: [...select.options].find((o) => o.textContent === 'Patna')!.value } });
  fireEvent.click(await screen.findByTestId('fw-find-check'));
  await screen.findByTestId('fw-actions');
}

describe('Story 13.1f — the undo on an opened worker (AC12)', () => {
  it('⭐ End then Undo in the SAME panel, no refetch between: the undo names the version the End’s 200 returned; the reminders follow each act', async () => {
    await openWorker('active');
    terminateFieldWorker.mockResolvedValue(lifecycle({ current_state: 'terminated', state_reason_code: 'inactive', ended_on: '2026-11-05', state_event_version: 4 }));
    fireEvent.click(screen.getByTestId('fw-act-end'));
    expect(screen.getByTestId('fw-act-end-final').textContent).toBe(t('fw.actions.end.final'));
    fireEvent.change(screen.getByTestId('fw-act-reason'), { target: { value: 'inactive' } });
    fireEvent.click(screen.getByTestId('fw-act-confirm'));
    await waitFor(() => expect(screen.getByTestId('fw-actions-status').textContent).toContain(t('fw.actions.tell.end')));
    undoFieldWorkerEnding.mockResolvedValue(lifecycle({ state_event_version: 5 }));
    fireEvent.click(await screen.findByTestId('fw-act-undo'));
    expect(screen.getByTestId('fw-act-undo-intro').textContent).toBe(t('fw.actions.undo.intro'));
    fireEvent.click(screen.getByTestId('fw-act-confirm'));
    await waitFor(() => expect(undoFieldWorkerEnding).toHaveBeenCalledWith(P, W, 4, expect.any(String)));
    await waitFor(() => expect(screen.getByTestId('fw-actions-status').textContent).toBe(`${t('fw.actions.done.undo', { name: 'Ramesh Kumar' })} ${t('fw.actions.tell')}`));
    expect(getFieldWorkerIdentity).toHaveBeenCalledTimes(1); // the panel was updated from the 200s, ⛔ re-read (an audited decrypt)
  });

  it('the undo confirm says an open appeal will close; `-465` Q6 B — a Panel refusal shows its line', async () => {
    version = 4;
    getFieldWorkerEndingAppealsOf.mockResolvedValue({
      items: [{ appeal_id: OLD, field_worker_id: W, ending_event_version: 4, state: 'open', heard_by: 'trustee_panel', received_on: '2026-11-05', received_via: 'phone', decided_on: null, lodged_by: { user_id: OLD, display_name: 'T' }, created_at: '2026-11-05T05:00:00.000Z' }],
    });
    await openWorker('terminated');
    fireEvent.click(screen.getByTestId('fw-act-undo'));
    expect(await screen.findByTestId('fw-act-undo-open-appeal')).toHaveTextContent(t('fw.actions.undo.openAppeal'));
    undoFieldWorkerEnding.mockRejectedValue(new ApiError(409, 'field_worker.appeal_refused_by_panel', 'refused'));
    fireEvent.click(screen.getByTestId('fw-act-confirm'));
    expect(await screen.findByTestId('fw-act-error')).toHaveTextContent(t('fw.err.appealRefusedByPanel'));
  });

  it('a 409 ending_changed re-reads the IDENTITY, so a retry names the current version', async () => {
    version = 4;
    await openWorker('terminated');
    undoFieldWorkerEnding.mockRejectedValueOnce(new ApiError(409, 'field_worker.ending_changed', 'changed'));
    fireEvent.click(screen.getByTestId('fw-act-undo'));
    version = 6;
    fireEvent.click(screen.getByTestId('fw-act-confirm'));
    expect(await screen.findByTestId('fw-act-error')).toHaveTextContent(t('fw.err.endingChanged'));
    await waitFor(() => expect(getFieldWorkerIdentity).toHaveBeenCalledTimes(2));
    undoFieldWorkerEnding.mockResolvedValue(lifecycle({ state_event_version: 7 }));
    fireEvent.click(screen.getByTestId('fw-act-confirm'));
    await waitFor(() => expect(undoFieldWorkerEnding).toHaveBeenLastCalledWith(P, W, 6, expect.any(String)));
  });
});

describe('Story 13.1f — the register page’s shown number and link (AD11, AD12)', () => {
  it('a 409 number_previously_ended shows each ending’s date and reason; the second submit carries previous_endings_seen (and link_to when chosen) under a NEW key', async () => {
    registerFieldWorker.mockRejectedValueOnce(
      new ApiError(409, 'field_worker.number_previously_ended', 'ended', { previous_endings: [{ field_worker_id: OLD, ended_on: '2026-10-01', reason_code: 'left_voluntarily' }] }),
    );
    registerFieldWorker.mockResolvedValueOnce({ field_worker_id: W, district: 'Patna', current_state: 'pending_kyc', kyc_status: 'pending' });
    render(
      <QueryClientProvider client={createQueryClient()}>
        <RegisterFieldWorkerPage pariwarId={P} />
      </QueryClientProvider>,
    );
    fireEvent.change(screen.getByTestId('fw-register-name'), { target: { value: 'Ramesh Kumar' } });
    fireEvent.change(screen.getByTestId('fw-register-mobile'), { target: { value: '9876500010' } });
    await screen.findByRole('option', { name: 'Patna' });
    const d = screen.getByTestId('fw-register-district') as HTMLSelectElement;
    fireEvent.change(d, { target: { value: [...d.options].find((o) => o.textContent === 'Patna')!.value } });
    fireEvent.click(screen.getByTestId('fw-register-submit'));
    const shown = await screen.findByTestId('fw-register-previous');
    expect(within(shown).getByText(/whose work ended on/)).toBeInTheDocument();
    expect(shown.textContent).toContain(t('fw.reason.left_voluntarily'));
    expect(registerFieldWorker.mock.calls[0]![1]).toEqual({ name: 'Ramesh Kumar', mobile: '9876500010', district: 'Patna' });
    fireEvent.click(screen.getByTestId(`fw-register-link-${OLD}`));
    fireEvent.click(screen.getByTestId('fw-register-submit'));
    await screen.findByTestId('fw-register-done');
    expect(registerFieldWorker.mock.calls[1]![1]).toEqual({ name: 'Ramesh Kumar', mobile: '9876500010', district: 'Patna', previous_endings_seen: true, link_to: OLD });
    expect(registerFieldWorker.mock.calls[1]![2]).not.toBe(registerFieldWorker.mock.calls[0]![2]); // a NEW key (TR9)
  });
});

describe('Story 13.1f — the Appeals page (AD13, AD14)', () => {
  const appeal = { appeal_id: OLD, field_worker_id: W, ending_event_version: 4, state: 'open', heard_by: 'trustee_panel', received_on: '2026-11-05', received_via: 'phone', decided_on: null, lodged_by: { user_id: OLD, display_name: 'T' }, created_at: '2026-11-05T05:00:00.000Z' };
  it('lists the appeals with their state and hearer; Allow decides and reminds "Tell the worker."; "Record an appeal" lodges from the eligible list', async () => {
    listFieldWorkerEndingAppeals.mockResolvedValue({ items: [{ ...appeal, name: 'Ramesh Kumar', district: 'Patna' }], next_cursor: null });
    decideFieldWorkerEndingAppeal.mockResolvedValue({ appeal: { ...appeal, state: 'allowed', decided_on: '2026-11-06' }, worker: lifecycle({ state_event_version: 5 }) });
    listAppealEligibleFieldWorkers.mockResolvedValue({
      items: [{ field_worker_id: OLD, display_name: 'Sita Devi', district: 'Gaya', ended_on: '2026-11-01', reason_code: 'inactive', ending_event_version: 2, heard_by: 'pariwar_admin' }],
      next_cursor: null,
    });
    lodgeFieldWorkerEndingAppeal.mockResolvedValue({ ...appeal, appeal_id: W, field_worker_id: OLD, heard_by: 'pariwar_admin', ending_event_version: 2 });
    render(
      <QueryClientProvider client={createQueryClient()}>
        <AppealsPage pariwarId={P} />
      </QueryClientProvider>,
    );
    const item = await screen.findByTestId('fw-appeal-item');
    expect(item.textContent).toContain(t('fw.appeals.state.open'));
    expect(item.textContent).toContain(t('fw.appeals.heardBy.trustee_panel'));
    fireEvent.click(within(item).getByTestId('fw-appeal-allowed'));
    fireEvent.click(within(item).getByTestId('fw-appeal-confirm'));
    expect(await within(item).findByTestId('fw-appeal-done')).toHaveTextContent(t('fw.actions.tell'));
    expect(decideFieldWorkerEndingAppeal).toHaveBeenCalledWith(P, OLD, { outcome: 'allowed', decided_on: expect.any(String) }, expect.any(String));
    fireEvent.click(screen.getByTestId('fw-appeals-record-open'));
    const candidate = await screen.findByTestId('fw-appeals-eligible-item');
    fireEvent.change(within(candidate).getByTestId('fw-appeals-via'), { target: { value: 'in_person' } });
    fireEvent.click(within(candidate).getByTestId('fw-appeals-lodge'));
    expect(await within(candidate).findByTestId('fw-appeals-lodged')).toBeInTheDocument();
    expect(lodgeFieldWorkerEndingAppeal).toHaveBeenCalledWith(P, OLD, { expected_ending_version: 2, received_on: expect.any(String), received_via: 'in_person' }, expect.any(String));
  });
});

describe('Story 13.1f — the remaining screen legs (AC12; 13.1d CR48)', () => {
  const W2 = '00000000-0000-4000-8000-000000000002';
  const logItem = (o: Record<string, unknown>) => ({
    event_version: 1,
    event_type: 'field_worker.registered',
    occurred_at: '2026-11-05T05:00:00.000Z',
    actor: { user_id: OLD, display_name: 'Dev Trustee', role: 'pariwar_admin' },
    permission_key: null,
    grant: null,
    target_district: 'Patna',
    reason_code: null,
    from_district: null,
    to_district: null,
    ended_on: null,
    to_state: null,
    cause: null,
    appeal_id: null,
    previous_field_worker_id: null,
    ...o,
  });

  it('opening worker B after worker A starts B’s panel fresh — A’s open undo form does not carry over (`key` per worker)', async () => {
    version = 4;
    listFieldWorkers.mockImplementation(async () => ({ items: [row(), { ...row(), field_worker_id: W2, name: 'Sita Devi' }], next_cursor: null }));
    getFieldWorkerIdentity.mockImplementation(async (_p: string, id: string) => ({ ...row(), field_worker_id: id, name: id === W ? 'Ramesh Kumar' : 'Sita Devi', mobile: '+919876500010', approved_by_display: 'Meera Rao', state_event_version: version }));
    state = 'terminated';
    render(
      <QueryClientProvider client={createQueryClient()}>
        <FindWorkerPage pariwarId={P} />
      </QueryClientProvider>,
    );
    fireEvent.change(screen.getByTestId('fw-find-state'), { target: { value: 'terminated' } });
    await screen.findByRole('option', { name: 'Patna' });
    const d = screen.getByTestId('fw-find-district') as HTMLSelectElement;
    fireEvent.change(d, { target: { value: [...d.options].find((o) => o.textContent === 'Patna')!.value } });
    const checks = await screen.findAllByTestId('fw-find-check');
    fireEvent.click(checks[0]!);
    fireEvent.click(await screen.findByTestId('fw-act-undo'));
    expect(screen.getByTestId('fw-act-undo-intro')).toBeInTheDocument();
    fireEvent.click(screen.getAllByTestId('fw-find-check')[1]!);
    await waitFor(() => expect(getFieldWorkerIdentity).toHaveBeenLastCalledWith(P, W2));
    await screen.findByTestId('fw-act-undo');
    expect(screen.queryByTestId('fw-act-undo-intro')).toBeNull();
    expect(screen.getByTestId('fw-act-undo').getAttribute('aria-expanded')).toBe('false');
  });

  it('a 409 number_registered_again shows its line', async () => {
    version = 4;
    await openWorker('terminated');
    undoFieldWorkerEnding.mockRejectedValue(new ApiError(409, 'field_worker.number_registered_again', 'taken'));
    fireEvent.click(screen.getByTestId('fw-act-undo'));
    fireEvent.click(screen.getByTestId('fw-act-confirm'));
    expect(await screen.findByTestId('fw-act-error')).toHaveTextContent(t('fw.err.numberRegisteredAgain'));
  });

  it('the history: an undo after an appeal, signed by the Trustee Panel, reads "Ending undone after an appeal" with the Trustee Panel label (never "role not recorded"); a linked registration offers the earlier record’s history, read with `record`', async () => {
    version = 2;
    getFieldWorkerLog.mockImplementation(async (_p: string, _id: string, o?: { record?: string }) =>
      o?.record === undefined
        ? {
            items: [
              logItem({ previous_field_worker_id: OLD }),
              logItem({ event_version: 2, event_type: 'field_worker.ending_undone', to_state: 'active', cause: 'appeal_allowed', appeal_id: OLD, actor: { user_id: OLD, display_name: 'Dev Trustee', role: 'trustee_panel' } }),
            ],
            next_after: null,
          }
        : { items: [logItem({ event_type: 'field_worker.terminated', reason_code: 'inactive', ended_on: '2026-10-01' })], next_after: null },
    );
    await openWorker('active');
    fireEvent.click(screen.getByTestId('fw-history-show'));
    const list = await screen.findByTestId('fw-history-list');
    expect(list.textContent).toContain(`${t('fw.history.event.field_worker.ending_undone')} ${t('fw.history.afterAppeal')}`);
    expect(list.textContent).toContain(t('fw.role.trustee_panel'));
    expect(list.textContent).not.toContain(t('fw.role.unknown'));
    const linked = within(list).getByTestId('fw-history-linked');
    expect(linked.textContent).toContain(t('fw.history.linked'));
    fireEvent.click(within(linked).getByTestId('fw-history-show-earlier'));
    fireEvent.click(within(linked).getByTestId('fw-history-show'));
    await waitFor(() => expect(getFieldWorkerLog).toHaveBeenCalledWith(P, W, { record: OLD }));
    expect(await within(linked).findByText(t('fw.history.event.field_worker.terminated'))).toBeInTheDocument();
  });
});
