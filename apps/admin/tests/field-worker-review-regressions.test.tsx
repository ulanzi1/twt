// Story 13.1f (AC12; AD6, AD11, AD12, AD14; the Panel's `2026-11-17-465`) — the undo on an opened worker, the register page's shown number
// and link, and the Appeals page. RTL with the API client mocked (the server's rules are the API specs').

import { QueryClientProvider } from '@tanstack/react-query';
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

const { WorkerHistory } = await import('../src/modules/field-workers/WorkerHistory.js');

const appeal = (o: Record<string, unknown> = {}) => ({
  appeal_id: OLD, field_worker_id: W, ending_event_version: 4, state: 'open', heard_by: 'trustee_panel',
  received_on: '2026-11-05', received_via: 'phone', decided_on: null,
  lodged_by: { user_id: OLD, display_name: 'Trustee' }, created_at: '2026-11-05T05:00:00.000Z', ...o,
});
const candidate = (n: number) => ({
  field_worker_id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`, display_name: `Worker ${n}`,
  district: 'Patna', ended_on: '2026-11-01', reason_code: 'inactive', ending_event_version: 2, heard_by: 'trustee_panel',
});
async function chooseDistrict(testId: string, name: string) {
  await screen.findByRole('option', { name });
  const picker = screen.getByTestId(testId) as HTMLSelectElement;
  fireEvent.change(picker, { target: { value: [...picker.options].find((o) => o.textContent === name)!.value } });
}
function renderAppeals() {
  return render(<QueryClientProvider client={createQueryClient()}><AppealsPage pariwarId={P} /></QueryClientProvider>);
}

describe('13.1f review regressions', () => {
  it('R1: a delayed ending warning for A cannot acknowledge B; B must show its own endings before acknowledgment', async () => {
    let rejectA!: (reason: unknown) => void;
    const bRecord = '00000000-0000-4000-8000-000000000008';
    registerFieldWorker.mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectA = reject; }));
    registerFieldWorker.mockRejectedValueOnce(new ApiError(409, 'field_worker.number_previously_ended', 'B ended', {
      previous_endings: [{ field_worker_id: bRecord, ended_on: '2026-10-02', reason_code: 'inactive' }],
    }));
    registerFieldWorker.mockResolvedValueOnce({ field_worker_id: W, district: 'Patna', current_state: 'pending_kyc', kyc_status: 'pending' });
    render(<QueryClientProvider client={createQueryClient()}><RegisterFieldWorkerPage pariwarId={P} /></QueryClientProvider>);
    fireEvent.change(screen.getByTestId('fw-register-name'), { target: { value: 'Ramesh Kumar' } });
    fireEvent.change(screen.getByTestId('fw-register-mobile'), { target: { value: '9876500010' } });
    await chooseDistrict('fw-register-district', 'Patna');
    fireEvent.click(screen.getByTestId('fw-register-submit'));
    await waitFor(() => expect(registerFieldWorker).toHaveBeenCalledTimes(1));
    fireEvent.change(screen.getByTestId('fw-register-mobile'), { target: { value: '9876500020' } });
    await act(async () => rejectA(new ApiError(409, 'field_worker.number_previously_ended', 'A ended', {
      previous_endings: [{ field_worker_id: OLD, ended_on: '2026-10-01', reason_code: 'left_voluntarily' }],
    })));
    expect(screen.queryByTestId('fw-register-previous')).toBeNull();
    fireEvent.click(screen.getByTestId('fw-register-submit'));
    await screen.findByTestId(`fw-register-link-${bRecord}`);
    expect(registerFieldWorker.mock.calls[1]![1]).toEqual({ name: 'Ramesh Kumar', mobile: '9876500020', district: 'Patna' });
    expect(screen.queryByTestId(`fw-register-link-${OLD}`)).toBeNull();
    fireEvent.click(screen.getByTestId('fw-register-submit'));
    await screen.findByTestId('fw-register-done');
    expect(registerFieldWorker.mock.calls[2]![1]).toEqual({ name: 'Ramesh Kumar', mobile: '9876500020', district: 'Patna', previous_endings_seen: true });
    expect(new Set(registerFieldWorker.mock.calls.map((c) => c[2])).size).toBe(3);
  });

  it('R2: a District Admin can recover from the all-districts 403, and both list queries follow the selected district', async () => {
    listFieldWorkerEndingAppeals.mockImplementation(async (_p: string, q: { district?: string }) => {
      if (q.district === undefined) throw new ApiError(403, 'authz.forbidden', 'choose district');
      return { items: [{ ...appeal(), name: `${q.district} Worker`, district: q.district }], next_cursor: null };
    });
    listAppealEligibleFieldWorkers.mockResolvedValue({ items: [], next_cursor: null });
    renderAppeals();
    await screen.findByTestId('fw-appeals-error');
    await chooseDistrict('fw-appeals-district', 'Patna');
    await screen.findByText('Patna Worker · Patna');
    expect(listFieldWorkerEndingAppeals).toHaveBeenLastCalledWith(P, { state: 'open', district: 'Patna' });
    fireEvent.click(screen.getByTestId('fw-appeals-record-open'));
    await waitFor(() => expect(listAppealEligibleFieldWorkers).toHaveBeenLastCalledWith(P, { district: 'Patna' }));
    await chooseDistrict('fw-appeals-district', 'Gaya');
    await screen.findByText('Gaya Worker · Gaya');
    expect(screen.queryByText('Patna Worker · Patna')).toBeNull();
    fireEvent.click(screen.getByTestId('fw-appeals-record-open'));
    await waitFor(() => expect(listAppealEligibleFieldWorkers).toHaveBeenLastCalledWith(P, { district: 'Gaya' }));
    fireEvent.change(screen.getByTestId('fw-appeals-district'), { target: { value: '' } });
    await screen.findByTestId('fw-appeals-error');
    expect(screen.queryByText('Gaya Worker · Gaya')).toBeNull();
  });

  it('R3: loads eligible worker 21 with the cursor and district, announces it, and can record their appeal', async () => {
    listFieldWorkerEndingAppeals.mockResolvedValue({ items: [], next_cursor: null });
    listAppealEligibleFieldWorkers.mockImplementation(async (_p: string, q: { cursor?: string }) => q.cursor === undefined
      ? { items: Array.from({ length: 20 }, (_, i) => candidate(i + 1)), next_cursor: 'page-two' }
      : { items: [candidate(21)], next_cursor: null });
    lodgeFieldWorkerEndingAppeal.mockResolvedValue(appeal({ field_worker_id: candidate(21).field_worker_id }));
    renderAppeals();
    await chooseDistrict('fw-appeals-district', 'Patna');
    fireEvent.click(screen.getByTestId('fw-appeals-record-open'));
    await waitFor(() => expect(screen.getAllByTestId('fw-appeals-eligible-item')).toHaveLength(20));
    fireEvent.click(screen.getByTestId('fw-appeals-eligible-more'));
    await waitFor(() => expect(screen.getAllByTestId('fw-appeals-eligible-item')).toHaveLength(21));
    expect(listAppealEligibleFieldWorkers).toHaveBeenLastCalledWith(P, { district: 'Patna', cursor: 'page-two' });
    expect(screen.getByTestId('fw-appeals-eligible-status')).toHaveTextContent('1 more worker shown.');
    const last = screen.getAllByTestId('fw-appeals-eligible-item')[20]!;
    fireEvent.change(within(last).getByTestId('fw-appeals-via'), { target: { value: 'phone' } });
    fireEvent.click(within(last).getByTestId('fw-appeals-lodge'));
    await waitFor(() => expect(lodgeFieldWorkerEndingAppeal).toHaveBeenCalledWith(P, candidate(21).field_worker_id, { expected_ending_version: 2, received_on: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/), received_via: 'phone' }, expect.any(String)));
  });

  it('R4: follows C -> B -> A with C as the authorization anchor and stops exposing links at the tenth hop', async () => {
    const recordAt = (depth: number) => `00000000-0000-4000-8000-${String(depth + 30).padStart(12, '0')}`;
    getFieldWorkerLog.mockImplementation(async (_p: string, _id: string, q?: { record?: string }) => {
      const depth = q?.record === undefined ? 0 : Number(q.record.slice(-12)) - 30;
      return { items: [{
        event_version: 1, event_type: 'field_worker.registered', occurred_at: '2026-11-05T05:00:00.000Z',
        actor: { user_id: OLD, display_name: 'Officer', role: 'pariwar_admin' }, permission_key: null, grant: null, target_district: 'Patna',
        reason_code: null, from_district: null, to_district: null, ended_on: null, to_state: 'pending_kyc', cause: null, appeal_id: null,
        previous_field_worker_id: recordAt(depth + 1),
      }], next_after: null };
    });
    render(<QueryClientProvider client={createQueryClient()}><WorkerHistory pariwarId={P} fieldWorkerId={W} /></QueryClientProvider>);
    fireEvent.click(screen.getByTestId('fw-history-show'));
    for (let depth = 1; depth <= 10; depth += 1) {
      const histories = screen.getAllByTestId('fw-history');
      const parent = histories[histories.length - 1]!;
      fireEvent.click(await within(parent).findByTestId('fw-history-show-earlier'));
      const all = screen.getAllByTestId('fw-history');
      const child = all[all.length - 1]!;
      fireEvent.click(within(child).getByTestId('fw-history-show'));
      await within(child).findByTestId('fw-history-list');
      expect(getFieldWorkerLog).toHaveBeenLastCalledWith(P, W, { record: recordAt(depth) });
    }
    const all = screen.getAllByTestId('fw-history');
    expect(within(all[all.length - 1]!).queryByTestId('fw-history-show-earlier')).toBeNull();
    expect(getFieldWorkerLog).toHaveBeenCalledTimes(11);
  });

  it('R5: Find displays prior appeals and records a new one against the displayed ending version without another identity fetch', async () => {
    version = 4;
    getFieldWorkerEndingAppealsOf.mockResolvedValue({ items: [appeal({ state: 'withdrawn', decided_on: '2026-11-06' })] });
    lodgeFieldWorkerEndingAppeal.mockImplementation(async () => {
      getFieldWorkerEndingAppealsOf.mockResolvedValue({ items: [appeal()] });
      return appeal();
    });
    await openWorker('terminated');
    const panel = screen.getByTestId('fw-worker-appeals');
    await within(panel).findByText(/Withdrawn/);
    fireEvent.click(within(panel).getByTestId('fw-worker-appeals-record'));
    fireEvent.change(within(panel).getByTestId('fw-appeals-via'), { target: { value: 'in_person' } });
    fireEvent.click(within(panel).getByTestId('fw-appeals-lodge'));
    await waitFor(() => expect(lodgeFieldWorkerEndingAppeal).toHaveBeenCalledWith(P, W, { expected_ending_version: 4, received_on: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/), received_via: 'in_person' }, expect.any(String)));
    await within(panel).findByText(/Waiting for a decision/);
    expect(getFieldWorkerIdentity).toHaveBeenCalledTimes(1);
    expect(within(panel).queryByTestId('fw-worker-appeals-record')).toBeNull();
  });

  it('R5: a stale Find lodge refreshes the identity and starts a fresh form for the new ending', async () => {
    version = 4;
    lodgeFieldWorkerEndingAppeal.mockRejectedValueOnce(new ApiError(409, 'field_worker.ending_changed', 'new ending'));
    lodgeFieldWorkerEndingAppeal.mockResolvedValueOnce(appeal({ ending_event_version: 6 }));
    await openWorker('terminated');
    const panel = screen.getByTestId('fw-worker-appeals');
    fireEvent.click(await within(panel).findByTestId('fw-worker-appeals-record'));
    fireEvent.change(within(panel).getByTestId('fw-appeals-via'), { target: { value: 'phone' } });
    version = 6;
    fireEvent.click(within(panel).getByTestId('fw-appeals-lodge'));
    await waitFor(() => expect(getFieldWorkerIdentity).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(within(panel).getByTestId('fw-appeals-via')).toHaveValue(''));
    // Code review round 2, chunk D (R2D-2): the form was rebuilt - and the officer is TOLD why, in the panel that outlived it.
    expect(within(panel).getByTestId('fw-worker-appeals-stale')).toHaveTextContent(t('fw.err.endingChanged'));
    fireEvent.change(within(panel).getByTestId('fw-appeals-via'), { target: { value: 'in_person' } });
    fireEvent.click(within(panel).getByTestId('fw-appeals-lodge'));
    await waitFor(() => expect(lodgeFieldWorkerEndingAppeal).toHaveBeenLastCalledWith(P, W, { expected_ending_version: 6, received_on: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/), received_via: 'in_person' }, expect.any(String)));
    expect(lodgeFieldWorkerEndingAppeal.mock.calls[0]![3]).not.toBe(lodgeFieldWorkerEndingAppeal.mock.calls[1]![3]);
  });

  // Review R3-2 — the R1 guard covered `number_previously_ended` only: A's other refusals about its number were shown on the field holding B.
  it.each([
    ['field_worker.mobile_already_registered'],
    ['field_worker.mobile_invalid'],
    ['field_worker.link_invalid'],
  ] as const)('R3-2: a delayed %s for number A is NOT shown once the mobile holds B; CONTROL: the same refusal for the number on screen is', async (code) => {
    let rejectA!: (reason: unknown) => void;
    registerFieldWorker.mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectA = reject; }));
    registerFieldWorker.mockRejectedValueOnce(new ApiError(409, code, 'about B'));
    render(<QueryClientProvider client={createQueryClient()}><RegisterFieldWorkerPage pariwarId={P} /></QueryClientProvider>);
    fireEvent.change(screen.getByTestId('fw-register-name'), { target: { value: 'Ramesh Kumar' } });
    fireEvent.change(screen.getByTestId('fw-register-mobile'), { target: { value: '9876500010' } });
    await chooseDistrict('fw-register-district', 'Patna');
    fireEvent.click(screen.getByTestId('fw-register-submit'));
    await waitFor(() => expect(registerFieldWorker).toHaveBeenCalledTimes(1));
    fireEvent.change(screen.getByTestId('fw-register-mobile'), { target: { value: '9876500020' } });
    await act(async () => rejectA(new ApiError(409, code, 'about A')));
    expect(screen.queryByTestId('fw-register-error')).toBeNull();
    expect(screen.getByTestId('fw-register-mobile')).not.toHaveAttribute('aria-invalid', 'true');
    fireEvent.click(screen.getByTestId('fw-register-submit')); // CONTROL - B's own refusal IS shown
    expect(await screen.findByTestId('fw-register-error')).toBeInTheDocument();
    expect(registerFieldWorker.mock.calls[1]![2]).not.toBe(registerFieldWorker.mock.calls[0]![2]); // a NEW attempt for B
  });

  it('R6: Undo stays blocked while the appeal check is pending and announces the closure warning before confirmation', async () => {
    version = 4;
    let resolveAppeals!: (v: unknown) => void;
    getFieldWorkerEndingAppealsOf.mockImplementation(() => new Promise((resolve) => { resolveAppeals = resolve; }));
    undoFieldWorkerEnding.mockResolvedValue(lifecycle({ state_event_version: 5 }));
    await openWorker('terminated');
    fireEvent.click(screen.getByTestId('fw-act-undo'));
    expect(screen.getByTestId('fw-act-confirm')).toBeDisabled();
    fireEvent.submit(screen.getByTestId('fw-act-undo-form'));
    // Review R3-11: a TanStack v5 mutation calls its `mutationFn` asynchronously, so "not sent" read at once passed with the guard deleted. A
    // macrotask first: a submit the guard let through has reached the client by then.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(undoFieldWorkerEnding).not.toHaveBeenCalled();
    await act(async () => resolveAppeals({ items: [appeal()] }));
    await waitFor(() => expect(screen.getByTestId('fw-act-confirm')).toBeEnabled());
    expect(screen.getByTestId('fw-act-undo-check')).toHaveAttribute('role', 'status');
    expect(screen.getByTestId('fw-act-undo-check')).toHaveTextContent(t('fw.actions.undo.openAppeal'));
    fireEvent.click(screen.getByTestId('fw-act-confirm'));
    await waitFor(() => expect(undoFieldWorkerEnding).toHaveBeenCalledWith(P, W, 4, expect.any(String)));
  });

  it('R6: a failed appeal check keeps Undo blocked and exposes a working retry', async () => {
    version = 4;
    getFieldWorkerEndingAppealsOf.mockRejectedValue(new ApiError(503, 'server.error', 'unavailable'));
    await openWorker('terminated');
    fireEvent.click(screen.getByTestId('fw-act-undo'));
    const form = screen.getByTestId('fw-act-undo-form');
    const retry = await within(form).findByRole('button', { name: t('fw.retry') });
    expect(screen.getByTestId('fw-act-confirm')).toBeDisabled();
    getFieldWorkerEndingAppealsOf.mockResolvedValue({ items: [appeal()] });
    retry.focus();
    fireEvent.click(retry);
    // Code review round 2, chunk D (R2D-11): the refetch unmounts the alert and the button that held focus - it goes to the form first, ⛔ the body.
    expect(document.activeElement).toBe(form);
    await waitFor(() => expect(screen.getByTestId('fw-act-confirm')).toBeEnabled());
    expect(screen.getByTestId('fw-act-undo-open-appeal')).toBeInTheDocument();
  });
});

