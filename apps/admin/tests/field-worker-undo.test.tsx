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
const { resolveEn: t, FIELD_WORKER_EN_KEYS } = await import('../src/modules/field-workers/i18n-en.js');
const { ApiError } = await import('../src/api/client.js');
const { createQueryClient, fieldWorkerEndingAppealsRoot, fieldWorkerIdentityKey } = await import('../src/api/hooks.js');
/** The client of the last `openWorker` — a test that needs to refresh a query from outside (a background refetch) reaches it here. */
let client: ReturnType<typeof createQueryClient>;

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
  const qc = (client = createQueryClient());
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
    await waitFor(() => expect(screen.getByTestId('fw-act-confirm')).toBeEnabled());
    fireEvent.click(screen.getByTestId('fw-act-confirm'));
    await waitFor(() => expect(screen.getByTestId('fw-actions-status').textContent).toContain(t('fw.actions.tell.end')));
    undoFieldWorkerEnding.mockResolvedValue(lifecycle({ state_event_version: 5 }));
    fireEvent.click(await screen.findByTestId('fw-act-undo'));
    expect(screen.getByTestId('fw-act-undo-intro').textContent).toBe(t('fw.actions.undo.intro'));
    await waitFor(() => expect(screen.getByTestId('fw-act-confirm')).toBeEnabled());
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
    await waitFor(() => expect(screen.getByTestId('fw-act-confirm')).toBeEnabled());
    fireEvent.click(screen.getByTestId('fw-act-confirm'));
    expect(await screen.findByTestId('fw-act-error')).toHaveTextContent(t('fw.err.appealRefusedByPanel'));
  });

  // Code review round 2, chunk D (R2D-21): the first version waited for the identity to be CALLED twice and then for Confirm to be enabled -
  // which it already was - so "the retry names version 6" held only if the refetch happened to land and render before the click. Here the
  // re-read is held until the test releases it, so the version the panel shows is exactly what the test says it is.
  it('a 409 ending_changed re-reads the IDENTITY, so a retry names the current version - and one pressed BEFORE the re-read lands names the old one', async () => {
    version = 4;
    await openWorker('terminated');
    undoFieldWorkerEnding.mockRejectedValueOnce(new ApiError(409, 'field_worker.ending_changed', 'changed'));
    fireEvent.click(screen.getByTestId('fw-act-undo'));
    await waitFor(() => expect(screen.getByTestId('fw-act-confirm')).toBeEnabled());
    let release!: () => void;
    getFieldWorkerIdentity.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = () => resolve({ ...row(), mobile: '+919876500010', approved_by_display: 'Meera Rao', state_event_version: 6 });
        }),
    );
    fireEvent.click(screen.getByTestId('fw-act-confirm'));
    expect(await screen.findByTestId('fw-act-error')).toHaveTextContent(t('fw.err.endingChanged'));
    await waitFor(() => expect(getFieldWorkerIdentity).toHaveBeenCalledTimes(2)); // the re-read STARTED: the panel still shows version 4
    undoFieldWorkerEnding.mockResolvedValue(lifecycle({ state_event_version: 7 }));
    await act(async () => release()); // the re-read LANDS in the cache ...
    await waitFor(() => expect((client.getQueryData(fieldWorkerIdentityKey(P, W)) as { state_event_version: number }).state_event_version).toBe(6));
    // ... and the observers (the panel) are told a macrotask LATER (TanStack's notifyManager): this timer was queued after the cache write, so it fires
    // after that notification, and `act` has rendered it. Without BOTH waits the click raced the render and named version 4 (the RED proof removes both;
    // removing this timer alone stays green, because Testing Library's `waitFor` also drains a macrotask once it passes - this one is belt and braces).
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    fireEvent.click(screen.getByTestId('fw-act-confirm'));
    await waitFor(() => expect(undoFieldWorkerEnding).toHaveBeenCalledTimes(2));
    expect(undoFieldWorkerEnding).toHaveBeenLastCalledWith(P, W, 6, expect.any(String));
    expect(undoFieldWorkerEnding.mock.calls[0]![2]).toBe(4); // CONTROL - the first attempt named the version the panel showed then
  });

  // R2D-18 (AC12) — "the act answers 403's line for a District Admin": the line is pinned by its TEXT, because `actGuidance` builds the key
  // by template and a deleted key falls back to the key itself - which `toHaveTextContent(t(key))` would then match.
  it('R2D-18 — a 403 on Undo shows ITS no-access line, pinned by its words', async () => {
    expect(FIELD_WORKER_EN_KEYS).toContain('fw.actions.noAccess.undo');
    expect(t('fw.actions.noAccess.undo')).toBe('Only a Pariwar Admin can undo an ending.');
    version = 4;
    await openWorker('terminated');
    undoFieldWorkerEnding.mockRejectedValue(new ApiError(403, 'authz.forbidden', 'no'));
    fireEvent.click(screen.getByTestId('fw-act-undo'));
    await waitFor(() => expect(screen.getByTestId('fw-act-confirm')).toBeEnabled());
    fireEvent.click(screen.getByTestId('fw-act-confirm'));
    expect(await screen.findByTestId('fw-act-error')).toHaveTextContent('Only a Pariwar Admin can undo an ending.');
  });

  // R2D-6 — Undo's Confirm took focus every time its appeals check went not-ready and ready again. A refetch while the officer sat on Cancel
  // moved focus to Confirm, so Enter or Space meant for Cancel CONFIRMED an undo of an ending.
  describe('R2D-6 — focus on the undo form', () => {
    /**
     * Refresh the appeals check from outside (as an act elsewhere would) and HOLD the read open until the returned function is called. A mock that
     * resolves at once never lets React see the form go not-ready - the observers are told once, with the final state - so a leg built on it
     * passes with the focus rule deleted (found by the RED proof of round 2, chunk D). Held, Confirm is seen DISABLED, then enabled again.
     */
    const refreshHeld = async (): Promise<() => Promise<void>> => {
      let release!: () => void;
      getFieldWorkerEndingAppealsOf.mockImplementationOnce(() => new Promise((resolve) => { release = () => resolve({ items: [] }); }));
      await act(async () => {
        void client.invalidateQueries({ queryKey: fieldWorkerEndingAppealsRoot(P) });
      });
      await waitFor(() => expect(screen.getByTestId('fw-act-confirm')).toBeDisabled()); // not ready: the check is being read again
      return async () => {
        await act(async () => release());
        await waitFor(() => expect(screen.getByTestId('fw-act-confirm')).toBeEnabled()); // ready again - the effect has run
      };
    };

    it('Confirm takes focus when the check FIRST completes (from the form the officer was put in)', async () => {
      version = 4;
      await openWorker('terminated');
      fireEvent.click(screen.getByTestId('fw-act-undo'));
      await waitFor(() => expect(screen.getByTestId('fw-act-confirm')).toBeEnabled());
      await waitFor(() => expect(document.activeElement).toBe(screen.getByTestId('fw-act-confirm')));
    });

    it('a REFETCH of the check while the officer is on Cancel leaves focus on Cancel (Enter there must never confirm)', async () => {
      version = 4;
      await openWorker('terminated');
      fireEvent.click(screen.getByTestId('fw-act-undo'));
      await waitFor(() => expect(document.activeElement).toBe(screen.getByTestId('fw-act-confirm')));
      const cancel = screen.getByTestId('fw-act-cancel');
      cancel.focus();
      expect(document.activeElement).toBe(cancel);
      const done = await refreshHeld(); // the check goes not-ready ...
      expect(document.activeElement).toBe(cancel);
      await done(); // ... and ready again: the old code took focus here
      expect(document.activeElement).toBe(cancel);
    });

    it('the check is NOT re-read when the officer returns to the tab (the hook opts out, as every sibling)', async () => {
      version = 4;
      await openWorker('terminated');
      fireEvent.click(screen.getByTestId('fw-act-undo'));
      await waitFor(() => expect(screen.getByTestId('fw-act-confirm')).toBeEnabled());
      const reads = getFieldWorkerEndingAppealsOf.mock.calls.length;
      // TanStack Query v5 listens for `visibilitychange` on `window` (jsdom reports the document visible); this is its "back to the tab".
      await act(async () => {
        window.dispatchEvent(new Event('visibilitychange'));
      });
      expect(getFieldWorkerEndingAppealsOf.mock.calls.length).toBe(reads);
    });

    // The two guards in the effect each have ONE case only they catch. (1) "Not from a control the officer moved to": Cancel is inside the form,
    // so the old "inside the form is unclaimed" rule took focus from it on the FIRST ready too, when the read was slow.
    it('the officer reaches Cancel BEFORE a slow check completes: Confirm does not take focus from them', async () => {
      version = 4;
      let finish!: (v: unknown) => void;
      getFieldWorkerEndingAppealsOf.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
      await openWorker('terminated');
      fireEvent.click(screen.getByTestId('fw-act-undo'));
      const cancel = screen.getByTestId('fw-act-cancel');
      cancel.focus();
      await act(async () => finish({ items: [] }));
      await waitFor(() => expect(screen.getByTestId('fw-act-confirm')).toBeEnabled());
      expect(document.activeElement).toBe(cancel);
    });

    // (2) "Once per opening": focus the officer parks on the FORM ITSELF (a click on its blank area) after Confirm took it once is the form's own
    // focus, so (1) alone would pass it - only the once-per-opening rule keeps a later refetch from taking it again.
    it('focus parked on the form after Confirm took it once is not taken again by a refetch', async () => {
      version = 4;
      await openWorker('terminated');
      fireEvent.click(screen.getByTestId('fw-act-undo'));
      await waitFor(() => expect(document.activeElement).toBe(screen.getByTestId('fw-act-confirm')));
      const form = screen.getByTestId('fw-act-undo-form');
      form.focus();
      expect(document.activeElement).toBe(form);
      const done = await refreshHeld();
      await done();
      expect(document.activeElement).toBe(form);
    });

    it('reopening Undo after Cancel gives Confirm its one focus again', async () => {
      version = 4;
      await openWorker('terminated');
      fireEvent.click(screen.getByTestId('fw-act-undo'));
      await waitFor(() => expect(document.activeElement).toBe(screen.getByTestId('fw-act-confirm')));
      fireEvent.click(screen.getByTestId('fw-act-cancel'));
      fireEvent.click(screen.getByTestId('fw-act-undo'));
      await waitFor(() => expect(screen.getByTestId('fw-act-confirm')).toBeEnabled());
      await waitFor(() => expect(document.activeElement).toBe(screen.getByTestId('fw-act-confirm')));
    });
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
    // The first read lists the open appeal; every later read (the refresh after the decision) does NOT — as the real "waiting" list.
    listFieldWorkerEndingAppeals.mockResolvedValueOnce({ items: [{ ...appeal, name: 'Ramesh Kumar', district: 'Patna' }], next_cursor: null });
    listFieldWorkerEndingAppeals.mockResolvedValue({ items: [], next_cursor: null });
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
    // The outcome is said at PAGE level: the decided appeal leaves the "waiting" list on the refresh (browser pass 2026-11-17).
    await waitFor(() => expect(screen.getByTestId('fw-appeals-outcome')).toHaveTextContent(`${t('fw.appeals.done.allowed', { name: 'Ramesh Kumar' })} ${t('fw.actions.tell')}`));
    expect(decideFieldWorkerEndingAppeal).toHaveBeenCalledWith(P, OLD, { outcome: 'allowed', decided_on: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) }, expect.any(String)); // the day itself is pinned in field-worker-appeals.test.tsx (R2D-20)
    fireEvent.click(screen.getByTestId('fw-appeals-record-open'));
    const candidate = await screen.findByTestId('fw-appeals-eligible-item');
    fireEvent.change(within(candidate).getByTestId('fw-appeals-via'), { target: { value: 'in_person' } });
    fireEvent.click(within(candidate).getByTestId('fw-appeals-lodge'));
    await waitFor(() => expect(screen.getByTestId('fw-appeals-outcome')).toHaveTextContent(t('fw.appeals.lodgedFor', { name: 'Sita Devi' })));
    expect(lodgeFieldWorkerEndingAppeal).toHaveBeenCalledWith(P, OLD, { expected_ending_version: 2, received_on: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/), received_via: 'in_person' }, expect.any(String));
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
    await waitFor(() => expect(screen.getByTestId('fw-act-confirm')).toBeEnabled());
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
