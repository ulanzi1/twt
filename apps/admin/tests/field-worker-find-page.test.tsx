// Story 13.1a (Task 9.3; AC11 (c), (d); AD13; review R4; `-448` / CR1) — find a worker and show their code, against a mocked client:
//   · NOTHING loads until a district is chosen; then the `active` list of exactly that district;
//   · CR1 — every row has "Check details", which opens the audited identity panel (ONE identity read: name, FULL mobile, district,
//     state, registered by, approved by); "Show code" exists ONLY inside that panel and ONLY once the identity has loaded — not in a
//     row, not before a panel is open, not while it loads, not after a 403 / 409 / 503 / 500; one panel at a time; Close or another
//     worker removes the identity from the cache (a client that never garbage-collects) and Close gives focus back to the row;
//   · "Show code" is a fresh read per click; the digits are large with a spelled-out label and the read-aloud line; ⛔ a clipboard
//     control; the code is cleared on Hide, when the panel is closed or switched, on `visibilitychange` to hidden, on unmount and
//     after 60 s;
//   · R4 — a DEFERRED response that arrives after each of those invalidations never puts digits back;
//   · no cache holds a code afterwards; a 409 `code_not_available` reads by the worker's state;
//   · the "Field workers" nav link renders in the RootLayout inside a Pariwar.
// Code review round 2 (CR2-CR6, CR10, CR14, CR16): the typed district is committed on blur / Enter; a failed next page keeps the rows
// (and the open panel with its code); a 401 goes to sign-in; the digits are `role="img"` with the spelled name, ONE persistent live
// region announces shown / hidden (never the digits) and focus follows Hide / Show; no `navigator.clipboard` call in the whole flow;
// the unmount leg observes the 60-second timer; the Hide leg really presses Hide; a window focus / reconnect re-reads neither the list
// nor the identity.

import { QueryClient, QueryClientProvider, focusManager, onlineManager } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode } from 'react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let params: Record<string, string> = {};
const navigate = vi.fn();
vi.mock('@tanstack/react-router', () => ({
  Link: (p: { children: ReactNode; to: string; 'data-testid'?: string }) => (
    <a href={p.to} data-testid={p['data-testid']}>
      {p.children}
    </a>
  ),
  Outlet: () => null,
  useNavigate: () => navigate,
  useParams: () => params,
  useRouter: () => ({ invalidate: vi.fn() }),
}));

const listFieldWorkers = vi.fn();
const getFieldWorkerIdentity = vi.fn();
const readFieldWorkerCode = vi.fn();
const getFieldWorkerDistricts = vi.fn();
vi.mock('../src/api/client.js', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    getSession: async () => ({ userId: '11111111-1111-4111-8111-111111111111', nationalGrants: [] }),
    listFieldWorkers: (p: string, o: unknown) => listFieldWorkers(p, o),
    getFieldWorkerIdentity: (p: string, id: string) => getFieldWorkerIdentity(p, id),
    readFieldWorkerCode: (p: string, id: string) => readFieldWorkerCode(p, id),
    getFieldWorkerDistricts: (p: string) => getFieldWorkerDistricts(p),
  };
});

const { FindWorkerPage, CODE_VISIBLE_MS } = await import('../src/modules/field-workers/index.js');
const { resolveEn: t } = await import('../src/modules/field-workers/i18n-en.js');
const { ApiError } = await import('../src/api/client.js');
const { createQueryClient } = await import('../src/api/hooks.js');
const { RootLayout } = await import('../src/routes/RootLayout.js');

const P = '11111111-1111-4111-8111-111111111111';
const W1 = '00000000-0000-4000-8000-000000000001';
const W2 = '00000000-0000-4000-8000-000000000002';
const NAME: Record<string, string> = { [W1]: 'Ramesh Kumar', [W2]: 'Sita Devi' };
const MOBILE: Record<string, string> = { [W1]: '+919876500010', [W2]: '+919876500020' };
const row = (id: string, name: string) => ({
  field_worker_id: id,
  name,
  district: 'Patna',
  current_state: 'active',
  kyc_status: 'completed',
  registered_by_display: 'Asha Verma',
  created_at: '2026-11-04T05:00:00.000Z',
});
const identityOf = (id: string) => ({ ...row(id, NAME[id]!), mobile: MOBILE[id]!, approved_by_display: 'Meera Rao' });

function deferred<T>(): { promise: Promise<T>; resolve: (v: T) => void } {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

function setVisibility(state: 'visible' | 'hidden'): void {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });
  document.dispatchEvent(new Event('visibilitychange'));
}
/** The tab turns hidden WITHOUT the event (nothing bumps the reveal's token) — the state the answer handler must still survive. */
function setVisibilitySilently(state: 'visible' | 'hidden'): void {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });
}

/** A client that NEVER garbage-collects: only an explicit removal can take the identity out of its cache (review CR16 (c)). */
const keepingClient = (): QueryClient => new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
const identityEntries = (qc: QueryClient) => qc.getQueryCache().findAll({ queryKey: ['field-workers', P, 'identity'] });

async function chooseDistrict(name: string): Promise<void> {
  await screen.findByRole('option', { name });
  const select = screen.getByTestId('fw-find-district') as HTMLSelectElement;
  fireEvent.change(select, { target: { value: [...select.options].find((o) => o.textContent === name)!.value } });
}
async function renderWithDistrict(qc: QueryClient = createQueryClient(), strict = false) {
  const tree = (
    <QueryClientProvider client={qc}>
      <FindWorkerPage pariwarId={P} />
    </QueryClientProvider>
  );
  const view = render(strict ? <StrictMode>{tree}</StrictMode> : tree);
  await chooseDistrict('Patna');
  await screen.findByText('Ramesh Kumar');
  return { qc, ...view };
}
const checkName = (name: string): string => `${t('fw.find.check')} ${t('fw.forName', { name })}`;
/** The "Check details" button of ONE worker's row, found the way a screen reader finds it: by its accessible name. */
const checkFor = (id: string): HTMLElement => screen.getByRole('button', { name: checkName(NAME[id]!) });
/** Press "Check details" for a worker and wait until the panel has THEIR identity (and so the Show code button). */
async function openPanel(id: string): Promise<void> {
  fireEvent.click(checkFor(id));
  await waitFor(() => expect(screen.getByTestId('fw-detail-mobile').textContent).toBe(MOBILE[id]));
  await screen.findByTestId('fw-code-show');
}
/** The "Show code" button of ONE worker (a loading reveal keeps its — disabled — button); present only in that worker's open panel. */
const showFor = (id: string): HTMLElement => within(screen.getByTestId(`fw-code-${id}`)).getByTestId('fw-code-show');
/** Press "Show code" the way a keyboard user or a click in Chrome does: the button HOLDS focus when it is activated (`fireEvent` alone moves none). */
const pressShow = (id: string): void => {
  const button = showFor(id);
  button.focus();
  fireEvent.click(button);
};
const showCodeButtons = (): HTMLElement[] => screen.queryAllByRole('button', { name: new RegExp(t('fw.code.show'), 'i') });
const digits = (): string | null => screen.queryByTestId('fw-code-digits')?.textContent ?? null;

const forName = (name: string): string => t('fw.forName', { name });
const showName = (name: string): string => `${t('fw.code.show')} ${forName(name)}`;
const hideName = (name: string): string => `${t('fw.code.hide')} ${forName(name)}`;
const liveOf = (id: string): HTMLElement => within(screen.getByTestId(`fw-code-${id}`)).getByTestId('fw-code-live');

beforeEach(() => {
  navigate.mockReset();
  for (const fn of [listFieldWorkers, getFieldWorkerIdentity, readFieldWorkerCode, getFieldWorkerDistricts]) fn.mockReset();
  getFieldWorkerDistricts.mockResolvedValue({ districts: ['Gaya', 'Patna'], districts_truncated: false });
  listFieldWorkers.mockResolvedValue({ items: [row(W1, 'Ramesh Kumar'), row(W2, 'Sita Devi')], next_cursor: null });
  getFieldWorkerIdentity.mockImplementation(async (_p: string, id: string) => identityOf(id));
  readFieldWorkerCode.mockImplementation(async (_p: string, id: string) => ({ field_worker_id: id, code: id === W1 ? '042719' : '555123' }));
  setVisibility('visible');
});
afterEach(() => {
  vi.useRealTimers();
  act(() => {
    focusManager.setFocused(undefined);
    onlineManager.setOnline(true);
  });
});

describe('the finder', () => {
  it('NOTHING loads until a district is chosen; then the ACTIVE list of exactly that district', async () => {
    const qc = createQueryClient();
    render(
      <QueryClientProvider client={qc}>
        <FindWorkerPage pariwarId={P} />
      </QueryClientProvider>,
    );
    expect((await screen.findByTestId('fw-find-choose')).textContent).toBe(t('fw.find.chooseFirst'));
    await screen.findByRole('option', { name: 'Patna' });
    expect(listFieldWorkers).not.toHaveBeenCalled();
    await chooseDistrict('Patna');
    await screen.findByText('Ramesh Kumar');
    expect(listFieldWorkers).toHaveBeenCalledWith(P, { state: 'active', district: 'Patna' });
    expect(screen.getByTestId('fw-nav-register')).toBeTruthy();
    expect(screen.getByTestId('fw-nav-approvals')).toBeTruthy();
  });

  it('a 403 on a district ⇒ the finder’s own no-access line (review CR11)', async () => {
    listFieldWorkers.mockRejectedValue(new ApiError(403, 'auth.forbidden', 'no'));
    const qc = createQueryClient();
    render(
      <QueryClientProvider client={qc}>
        <FindWorkerPage pariwarId={P} />
      </QueryClientProvider>,
    );
    await chooseDistrict('Gaya');
    expect((await screen.findByTestId('fw-find-list-error')).textContent).toContain(t('fw.noAccessFind'));
  });

  it('the page shows the intro that says details come first, then the code', () => {
    render(
      <QueryClientProvider client={createQueryClient()}>
        <FindWorkerPage pariwarId={P} />
      </QueryClientProvider>,
    );
    expect(screen.getByText(t('fw.find.intro'))).toBeTruthy();
  });
});

describe('CR1 — "Check details" opens the audited identity panel FIRST; "Show code" lives inside it', () => {
  it('(a) before a panel is open there is NO "Show code" anywhere, and no identity or code has been read; every row has just "Check details"', async () => {
    await renderWithDistrict();
    expect(showCodeButtons()).toHaveLength(0);
    expect(screen.queryByTestId('fw-code-show')).toBeNull();
    expect(screen.queryByTestId('fw-detail')).toBeNull();
    const rows = screen.getAllByTestId('fw-find-list-row');
    expect(rows).toHaveLength(2);
    for (const r of rows) {
      expect(within(r).getAllByRole('button')).toHaveLength(1);
      expect(within(r).getByRole('button').textContent).toContain(t('fw.find.check'));
    }
    expect(getFieldWorkerIdentity).not.toHaveBeenCalled();
    expect(readFieldWorkerCode).not.toHaveBeenCalled();
  });

  it('(h) the button’s accessible name CONTAINS its visible text and names the worker; there is no aria-label', async () => {
    await renderWithDistrict();
    const ramesh = screen.getByRole('button', { name: 'Check details for Ramesh Kumar' });
    const sita = screen.getByRole('button', { name: 'Check details for Sita Devi' });
    for (const b of [ramesh, sita]) {
      expect(b.hasAttribute('aria-label')).toBe(false);
      expect(b.textContent).toContain(t('fw.find.check'));
    }
    expect(ramesh).not.toBe(sita);
  });

  it('(b) "Check details" performs EXACTLY ONE identity read and shows the name, the FULL mobile, the status and the approver', async () => {
    await renderWithDistrict();
    fireEvent.click(checkFor(W1));
    const panel = await screen.findByTestId('fw-detail');
    await within(panel).findByTestId('fw-detail-mobile');
    expect(screen.getByTestId('fw-detail-mobile').textContent).toBe('+919876500010');
    expect(within(panel).getByTestId('fw-detail-name').textContent).toBe('Ramesh Kumar');
    expect(within(panel).getByText(t('fw.state.active'))).toBeTruthy();
    // "Approved by" — unreachable before this screen opened the panel for an ACTIVE worker.
    const approved = within(panel).getByTestId('fw-detail-approved-by');
    expect(approved.textContent).toBe(t('fw.detail.approvedBy', { name: 'Meera Rao' }));
    expect(approved.previousElementSibling?.textContent).toBe(t('fw.detail.approval'));
    expect(within(panel).getByText(t('fw.registeredBy', { name: 'Asha Verma' }), { exact: false })).toBeTruthy();
    await waitFor(() => expect(within(panel).getByTestId('fw-code-show')).toBeTruthy());
    expect(getFieldWorkerIdentity).toHaveBeenCalledTimes(1);
    expect(getFieldWorkerIdentity).toHaveBeenCalledWith(P, W1);
    expect(readFieldWorkerCode).not.toHaveBeenCalled(); // the code is asked for only by its own click
  });

  it('(b) inside <StrictMode> (a simulated unmount and remount) it is still ONE identity read', async () => {
    await renderWithDistrict(createQueryClient(), true);
    await openPanel(W1);
    expect(getFieldWorkerIdentity).toHaveBeenCalledTimes(1);
  });

  it('"Show code" is a CHILD of the open panel, never in a row; the identity is read BEFORE the code', async () => {
    await renderWithDistrict();
    await openPanel(W1);
    const panel = screen.getByTestId('fw-detail');
    expect(within(panel).getByRole('button', { name: showName('Ramesh Kumar') })).toBeTruthy();
    expect(showCodeButtons()).toHaveLength(1);
    for (const r of screen.getAllByTestId('fw-find-list-row')) expect(within(r).queryByTestId('fw-code-show')).toBeNull();
    fireEvent.click(showFor(W1));
    await waitFor(() => expect(digits()).toBe('042719'));
    expect(within(panel).getByTestId('fw-code-digits')).toBeTruthy();
    expect(getFieldWorkerIdentity.mock.invocationCallOrder[0]!).toBeLessThan(readFieldWorkerCode.mock.invocationCallOrder[0]!);
  });

  it('pressing "Check details" again on the worker already open changes nothing (no second identity read, the panel and its identity stay)', async () => {
    const { qc } = await renderWithDistrict(keepingClient());
    await openPanel(W1);
    fireEvent.click(showFor(W1));
    await waitFor(() => expect(digits()).toBe('042719'));
    fireEvent.click(checkFor(W1));
    await act(async () => undefined);
    expect(getFieldWorkerIdentity).toHaveBeenCalledTimes(1);
    expect(screen.getAllByTestId('fw-detail')).toHaveLength(1);
    expect(identityEntries(qc).map((q) => q.queryKey[3])).toEqual([W1]); // still held: the open panel is not "replaced" by itself
    expect(digits()).toBe('042719');
  });

  describe('(c) "Show code" appears only once the identity has loaded', () => {
    it('absent while the identity is loading, present after it arrives', async () => {
      const d = deferred<ReturnType<typeof identityOf>>();
      getFieldWorkerIdentity.mockReturnValueOnce(d.promise);
      await renderWithDistrict();
      fireEvent.click(checkFor(W1));
      expect((await screen.findByTestId('fw-detail')).textContent).toContain(t('fw.loading'));
      expect(showCodeButtons()).toHaveLength(0);
      expect(screen.queryByTestId(`fw-code-${W1}`)).toBeNull();
      expect(screen.queryByTestId('fw-detail-mobile')).toBeNull();
      await act(async () => d.resolve(identityOf(W1)));
      expect(await screen.findByRole('button', { name: showName('Ramesh Kumar') })).toBeTruthy();
      expect(screen.getByTestId('fw-detail-mobile').textContent).toBe('+919876500010');
    });

    it.each<[string, number, string, string]>([
      ['403 (no access)', 403, 'auth.forbidden', t('fw.noAccessFind')],
      ['409 (stale: moved to another district)', 409, 'field_worker.authorization_stale', t('fw.approvals.moved')],
      ['503 (the key service is down)', 503, 'field_worker.decrypt_unavailable', t('fw.list.keyUnavailable')],
      ['500 (stored details unreadable)', 500, 'field_worker.identity_unreadable', t('fw.list.unreadable')],
    ])('absent after a %s identity answer — the refusal is said, nothing is shown and no code is asked for', async (_label, status, code, words) => {
      getFieldWorkerIdentity.mockRejectedValue(new ApiError(status, code, 'server words'));
      await renderWithDistrict();
      fireEvent.click(checkFor(W1));
      const error = await screen.findByTestId('fw-detail-error');
      expect(error.textContent).toBe(words);
      expect(error.closest('[role="alert"]')).not.toBeNull();
      expect(showCodeButtons()).toHaveLength(0);
      expect(screen.queryByTestId(`fw-code-${W1}`)).toBeNull();
      expect(screen.queryByTestId('fw-detail-mobile')).toBeNull();
      expect(readFieldWorkerCode).not.toHaveBeenCalled();
      expect(getFieldWorkerIdentity).toHaveBeenCalledTimes(1);
      // The panel can still be closed, and focus goes back to the row.
      fireEvent.click(screen.getByTestId('fw-detail-close'));
      expect(screen.queryByTestId('fw-detail')).toBeNull();
      expect(document.activeElement).toBe(checkFor(W1));
    });

    it('a 401 on the identity goes to sign-in and shows no "Show code"', async () => {
      getFieldWorkerIdentity.mockRejectedValue(new ApiError(401, 'auth.session_required', 'no'));
      await renderWithDistrict();
      fireEvent.click(checkFor(W1));
      expect((await screen.findByTestId('fw-detail-error')).textContent).toBe(t('fw.signIn'));
      await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: '/login' }));
      expect(showCodeButtons()).toHaveLength(0);
    });
  });

  describe('(e) the identity leaves the client when the panel is closed, replaced or dropped', () => {
    it('Close removes it — from a client that would keep it for ever — and the code with it', async () => {
      const { qc } = await renderWithDistrict(keepingClient());
      await openPanel(W1);
      expect(identityEntries(qc)).toHaveLength(1); // NON-VACUITY: held while the panel is open
      fireEvent.click(showFor(W1));
      await waitFor(() => expect(digits()).toBe('042719'));
      fireEvent.click(screen.getByTestId('fw-detail-close'));
      // In the same tick as the press: the handler's removal, which the hook's `gcTime: 0` timer (review CR48) has not yet run behind.
      expect(identityEntries(qc)).toHaveLength(0);
      await waitFor(() => expect(screen.queryByTestId('fw-detail')).toBeNull());
      expect(digits()).toBeNull();
      expect(screen.queryByTestId(`fw-code-${W1}`)).toBeNull();
      expect(JSON.stringify(qc.getQueryCache().getAll().map((q) => q.state.data))).not.toContain('+919876500010');
      expect(document.body.innerHTML).not.toMatch(/042719|\+919876500010/);
    });

    it('opening ANOTHER worker removes the first one’s identity and keeps only the new one; one panel at a time', async () => {
      const { qc } = await renderWithDistrict(keepingClient());
      await openPanel(W1);
      expect(identityEntries(qc).map((q) => q.queryKey[3])).toEqual([W1]);
      fireEvent.click(checkFor(W2));
      expect(identityEntries(qc).map((q) => q.queryKey[3])).not.toContain(W1); // same tick: the handler, not the gc timer (CR48)
      await waitFor(() => expect(screen.getByTestId('fw-detail-mobile').textContent).toBe(MOBILE[W2]));
      expect(screen.getAllByTestId('fw-detail')).toHaveLength(1);
      expect(identityEntries(qc).map((q) => q.queryKey[3])).toEqual([W2]);
      expect(JSON.stringify(qc.getQueryCache().getAll().map((q) => q.state.data))).not.toContain('+919876500010');
      expect(screen.queryByText('+919876500010')).toBeNull();
    });

    it('choosing another district closes the panel and removes the identity', async () => {
      const { qc } = await renderWithDistrict(keepingClient());
      await openPanel(W1);
      expect(identityEntries(qc)).toHaveLength(1);
      await chooseDistrict('Gaya');
      expect(identityEntries(qc)).toHaveLength(0); // same tick: the handler, not the gc timer (CR48)
      await waitFor(() => expect(screen.queryByTestId('fw-detail')).toBeNull());
      expect(showCodeButtons()).toHaveLength(0);
    });

    it('closing a panel and opening the same worker again reads the identity afresh (one more admin act, one more read) with no code shown', async () => {
      await renderWithDistrict(keepingClient());
      await openPanel(W1);
      fireEvent.click(showFor(W1));
      await waitFor(() => expect(digits()).toBe('042719'));
      fireEvent.click(screen.getByTestId('fw-detail-close'));
      await openPanel(W1);
      expect(getFieldWorkerIdentity).toHaveBeenCalledTimes(2);
      expect(digits()).toBeNull();
      expect(showFor(W1).textContent).toBe(showName('Ramesh Kumar'));
    });
  });

  describe('(f) focus', () => {
    it('opening the panel moves focus to its heading; Close gives it back to THAT row’s "Check details"', async () => {
      await renderWithDistrict();
      await openPanel(W2);
      expect(document.activeElement).toBe(screen.getByRole('heading', { name: t('fw.detail.title') }));
      fireEvent.click(screen.getByTestId('fw-detail-close'));
      await waitFor(() => expect(screen.queryByTestId('fw-detail')).toBeNull());
      expect(document.activeElement).toBe(checkFor(W2));
      expect(document.activeElement).not.toBe(checkFor(W1));
    });

    it('Close by keyboard (Enter on the Close button) restores focus too', async () => {
      const user = userEvent.setup();
      await renderWithDistrict();
      await openPanel(W1);
      screen.getByTestId('fw-detail-close').focus();
      await user.keyboard('{Enter}');
      expect(screen.queryByTestId('fw-detail')).toBeNull();
      expect(document.activeElement).toBe(checkFor(W1));
    });
  });

  describe('(g) CR2 — no audited read without an admin act', () => {
    it('a window focus and a reconnect re-read NEITHER the list NOR the identity, and ask for no second code', async () => {
      await renderWithDistrict();
      await openPanel(W1);
      fireEvent.click(showFor(W1));
      await waitFor(() => expect(digits()).toBe('042719'));
      expect(listFieldWorkers).toHaveBeenCalledTimes(1);
      expect(getFieldWorkerIdentity).toHaveBeenCalledTimes(1);
      expect(readFieldWorkerCode).toHaveBeenCalledTimes(1);
      const districtReads = getFieldWorkerDistricts.mock.calls.length;

      act(() => {
        focusManager.setFocused(false);
        focusManager.setFocused(true);
        onlineManager.setOnline(false);
        onlineManager.setOnline(true);
      });

      // NON-VACUITY: the events really fired — the keyless districts read (TanStack defaults) went again.
      await waitFor(() => expect(getFieldWorkerDistricts.mock.calls.length).toBeGreaterThan(districtReads));
      expect(listFieldWorkers).toHaveBeenCalledTimes(1);
      expect(getFieldWorkerIdentity).toHaveBeenCalledTimes(1);
      expect(readFieldWorkerCode).toHaveBeenCalledTimes(1);
      expect(digits()).toBe('042719');
    });
  });
});

describe('Show code (AD13) — through the panel', () => {
  it('a fresh read per click; large digits with a spelled label and the read-aloud line; ⛔ a clipboard control; Hide clears', async () => {
    await renderWithDistrict();
    await openPanel(W1);
    fireEvent.click(showFor(W1));
    await waitFor(() => expect(digits()).toBe('042719'));
    // The name sits on a SUPPORTED role (`img`), not on a bare paragraph (review CR6): a screen reader reads it, not the number.
    const el = screen.getByRole('img', { name: t('fw.code.label', { spelled: '0 4 2 7 1 9' }) });
    expect(el).toBe(screen.getByTestId('fw-code-digits'));
    expect(el.textContent).toBe('042719');
    expect(screen.getByText(t('fw.code.readAloud'))).toBeTruthy();
    expect(screen.queryByRole('button', { name: /copy/i })).toBeNull();
    expect(document.body.innerHTML).not.toMatch(/clipboard/i);
    fireEvent.click(screen.getByRole('button', { name: hideName('Ramesh Kumar') }));
    expect(digits()).toBeNull();
    fireEvent.click(showFor(W1));
    await waitFor(() => expect(digits()).toBe('042719'));
    expect(readFieldWorkerCode).toHaveBeenCalledTimes(2);
    expect(getFieldWorkerIdentity).toHaveBeenCalledTimes(1); // Show code does not re-read the identity
  });

  it('the panel switched to ANOTHER worker clears the first code (the new panel starts with none); then cleared on a hidden tab and on unmount; nothing is cached', async () => {
    const { qc, unmount } = await renderWithDistrict();
    await openPanel(W1);
    fireEvent.click(showFor(W1));
    await waitFor(() => expect(digits()).toBe('042719'));
    await openPanel(W2); // replaces the panel: W1’s reveal unmounts
    expect(digits()).toBeNull();
    expect(screen.queryByText('042719')).toBeNull();
    expect(screen.queryByTestId(`fw-code-${W1}`)).toBeNull();
    fireEvent.click(showFor(W2));
    await waitFor(() => expect(digits()).toBe('555123'));
    act(() => setVisibility('hidden'));
    expect(digits()).toBeNull();
    setVisibility('visible');
    fireEvent.click(showFor(W2));
    await waitFor(() => expect(digits()).not.toBeNull());
    expect(JSON.stringify(qc.getQueryCache().getAll().map((q) => q.state.data))).not.toMatch(/042719|555123/);
    expect(JSON.stringify(qc.getMutationCache().getAll().map((m) => [m.state.variables, m.state.data]))).not.toMatch(/042719|555123/);
    expect(qc.getMutationCache().getAll()).toHaveLength(0);
    unmount();
    expect(document.body.innerHTML).not.toMatch(/042719|555123/);
  });

  it('cleared after 60 seconds (fake timers)', async () => {
    await renderWithDistrict();
    await openPanel(W1);
    vi.useFakeTimers({ shouldAdvanceTime: true });
    fireEvent.click(showFor(W1));
    await waitFor(() => expect(digits()).toBe('042719'));
    // A one-second margin each side: `shouldAdvanceTime` also moves the fake clock with real time (the `waitFor` above).
    act(() => {
      vi.advanceTimersByTime(CODE_VISIBLE_MS - 1000);
    });
    expect(digits()).toBe('042719');
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(digits()).toBeNull();
    expect(screen.getByTestId('fw-detail')).toBeTruthy(); // the identity panel stays: only the code expired
  });

  it('409 code_not_available reads by the worker’s state', async () => {
    readFieldWorkerCode.mockRejectedValueOnce(new ApiError(409, 'field_worker.code_not_available', 'no', { current_state: 'suspended' }));
    await renderWithDistrict();
    await openPanel(W1);
    fireEvent.click(showFor(W1));
    expect((await screen.findByTestId('fw-code-refused')).textContent).toBe(t('fw.code.suspended'));
    expect(digits()).toBeNull();
  });
});

describe('R4 — a late answer never restores a cleared code', () => {
  it('a deferred answer after visibilitychange to hidden is dropped', async () => {
    await renderWithDistrict();
    await openPanel(W1);
    fireEvent.click(showFor(W1));
    await waitFor(() => expect(digits()).toBe('042719'));
    fireEvent.click(screen.getByTestId('fw-code-hide'));
    const d = deferred<{ field_worker_id: string; code: string }>();
    readFieldWorkerCode.mockReturnValueOnce(d.promise);
    fireEvent.click(showFor(W1));
    expect(screen.getAllByText(t('fw.code.loading')).length).toBeGreaterThan(0);
    act(() => setVisibility('hidden'));
    setVisibility('visible');
    await act(async () => d.resolve({ field_worker_id: W1, code: '999999' }));
    expect(screen.queryByText('999999')).toBeNull();
    expect(digits()).toBeNull();
  });

  it('a deferred answer for the first worker, arriving after the panel was switched to another worker, is dropped', async () => {
    await renderWithDistrict();
    await openPanel(W1);
    const d1 = deferred<{ field_worker_id: string; code: string }>();
    readFieldWorkerCode.mockReturnValueOnce(d1.promise);
    fireEvent.click(showFor(W1)); // W1 in flight
    await openPanel(W2); // the panel is replaced: W1’s reveal is gone
    const started = vi.spyOn(globalThis, 'setTimeout');
    await act(async () => d1.resolve({ field_worker_id: W1, code: '111111' }));
    // The reveal is unmounted, so its digits could not show either way: the token is observed by the timer it stops (review CR50).
    expect(started.mock.calls.filter((c) => c[1] === CODE_VISIBLE_MS)).toHaveLength(0);
    started.mockRestore();
    expect(screen.queryByText('111111')).toBeNull();
    expect(document.body.innerHTML).not.toContain('111111');
    expect(digits()).toBeNull();
    // W2’s panel is unharmed: its own code still comes through.
    fireEvent.click(showFor(W2));
    await waitFor(() => expect(digits()).toBe('555123'));
  });

  it('a deferred answer arriving after the panel was CLOSED is dropped', async () => {
    await renderWithDistrict();
    await openPanel(W1);
    const d = deferred<{ field_worker_id: string; code: string }>();
    readFieldWorkerCode.mockReturnValueOnce(d.promise);
    fireEvent.click(showFor(W1));
    fireEvent.click(screen.getByTestId('fw-detail-close'));
    const started = vi.spyOn(globalThis, 'setTimeout');
    await act(async () => d.resolve({ field_worker_id: W1, code: '333333' }));
    expect(started.mock.calls.filter((c) => c[1] === CODE_VISIBLE_MS)).toHaveLength(0); // review CR50, as above
    started.mockRestore();
    expect(document.body.innerHTML).not.toContain('333333');
    expect(screen.queryByTestId('fw-detail')).toBeNull();
  });

  it('CR16 (a) — a deferred answer after UNMOUNT never starts the 60-second timer (observed, not inferred from an empty body)', async () => {
    const { unmount } = await renderWithDistrict();
    await openPanel(W1);
    vi.useFakeTimers();
    const started = vi.spyOn(globalThis, 'setTimeout');
    const sixty = (): number => started.mock.calls.filter((c) => c[1] === CODE_VISIBLE_MS).length;
    const d = deferred<{ field_worker_id: string; code: string }>();
    readFieldWorkerCode.mockReturnValueOnce(d.promise);
    fireEvent.click(showFor(W1));
    unmount(); // the queries’ own gc timers start here — count AFTER it
    const timersAfterUnmount = vi.getTimerCount();
    await act(async () => d.resolve({ field_worker_id: W1, code: '222222' }));
    expect(sixty()).toBe(0);
    expect(vi.getTimerCount()).toBe(timersAfterUnmount);
    expect(document.body.innerHTML).not.toContain('222222');
    started.mockRestore();
  });

  it('CR16 (a) NON-VACUITY — the same flow WITHOUT unmounting starts exactly one 60-second timer', async () => {
    await renderWithDistrict();
    await openPanel(W1);
    vi.useFakeTimers();
    const started = vi.spyOn(globalThis, 'setTimeout');
    const d = deferred<{ field_worker_id: string; code: string }>();
    readFieldWorkerCode.mockReturnValueOnce(d.promise);
    fireEvent.click(showFor(W1));
    const timersWhileLoading = vi.getTimerCount();
    await act(async () => d.resolve({ field_worker_id: W1, code: '222222' }));
    expect(started.mock.calls.filter((c) => c[1] === CODE_VISIBLE_MS)).toHaveLength(1);
    expect(vi.getTimerCount()).toBeGreaterThan(timersWhileLoading);
    expect(digits()).toBe('222222');
    started.mockRestore();
  });

  it('CR16 (b) — Hide, really pressed while the code is shown, clears it and CANCELS its 60-second timer: a later show gets its own full minute', async () => {
    await renderWithDistrict();
    await openPanel(W1);
    vi.useFakeTimers({ shouldAdvanceTime: true });
    fireEvent.click(showFor(W1));
    await waitFor(() => expect(digits()).toBe('042719'));
    fireEvent.click(screen.getByRole('button', { name: hideName('Ramesh Kumar') })); // the Hide button IS on screen
    expect(digits()).toBeNull();
    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    fireEvent.click(showFor(W1));
    await waitFor(() => expect(digits()).toBe('042719'));
    // 75 seconds after the FIRST show: its timer (60 s) would have cleared this second reveal had Hide not cancelled it.
    act(() => {
      vi.advanceTimersByTime(45_000);
    });
    expect(digits()).toBe('042719');
    act(() => {
      vi.advanceTimersByTime(20_000); // 65 s after the second show: its own minute is over
    });
    expect(digits()).toBeNull();
  });

  it('CR14 — the tab turns hidden with this very read in flight and nothing bumped the token: the view returns to idle, never stuck "Fetching…"', async () => {
    await renderWithDistrict();
    await openPanel(W1);
    const d = deferred<{ field_worker_id: string; code: string }>();
    readFieldWorkerCode.mockReturnValueOnce(d.promise);
    fireEvent.click(showFor(W1));
    expect(showFor(W1).hasAttribute('disabled')).toBe(true);
    setVisibilitySilently('hidden');
    await act(async () => d.resolve({ field_worker_id: W1, code: '777777' }));
    expect(digits()).toBeNull();
    expect(document.body.innerHTML).not.toContain('777777');
    const button = showFor(W1);
    expect(button.hasAttribute('disabled')).toBe(false);
    expect(button.textContent).toBe(showName('Ramesh Kumar'));
    expect(liveOf(W1).textContent).toBe('');
  });
});

describe('the nav (AC11 (d))', () => {
  it('a "Field workers" link renders in the TopBar inside a Pariwar', async () => {
    params = { pariwarId: P };
    const qc = createQueryClient();
    render(
      <QueryClientProvider client={qc}>
        <RootLayout />
      </QueryClientProvider>,
    );
    const link = await screen.findByTestId('nav-field-workers');
    expect(link.textContent).toBe(t('fw.nav'));
    expect(link.getAttribute('href')).toBe('/p/$pariwarId/field-workers');
    params = {};
  });
});

describe('CR3 — the typed district on the finder', () => {
  beforeEach(() => {
    getFieldWorkerDistricts.mockResolvedValue({ districts: ['Nagpur', 'Patna'], districts_truncated: true });
  });
  const renderBare = () => {
    const qc = createQueryClient();
    render(
      <QueryClientProvider client={qc}>
        <FindWorkerPage pariwarId={P} />
      </QueryClientProvider>,
    );
  };

  it('typing "Nagpur Rural" (Nagpur is LISTED) keeps every character; NOTHING is asked until blur; then exactly ONE request with the byte-exact text', async () => {
    const user = userEvent.setup();
    renderBare();
    const typed = (await screen.findByTestId('fw-find-district-typed')) as HTMLInputElement;
    await user.type(typed, 'Nagpur Rural');
    expect(typed.value).toBe('Nagpur Rural');
    expect(listFieldWorkers).not.toHaveBeenCalled(); // "N", "Na", ... "Nagpur" (a listed district) — none of them was asked for
    expect(screen.getByTestId('fw-find-choose')).toBeTruthy();
    await user.tab();
    await screen.findByText('Ramesh Kumar');
    expect(listFieldWorkers).toHaveBeenCalledTimes(1);
    expect(listFieldWorkers).toHaveBeenCalledWith(P, { state: 'active', district: 'Nagpur Rural' });
    expect(typed.value).toBe('Nagpur Rural');
  });

  it('Enter commits too', async () => {
    const user = userEvent.setup();
    renderBare();
    await user.type(await screen.findByTestId('fw-find-district-typed'), 'Nagpur Rural{Enter}');
    await screen.findByText('Ramesh Kumar');
    expect(listFieldWorkers).toHaveBeenCalledTimes(1);
    expect(listFieldWorkers).toHaveBeenCalledWith(P, { state: 'active', district: 'Nagpur Rural' });
  });

  it('committing another typed district closes the open panel and removes its identity', async () => {
    const qc = keepingClient();
    render(
      <QueryClientProvider client={qc}>
        <FindWorkerPage pariwarId={P} />
      </QueryClientProvider>,
    );
    const typed = (await screen.findByTestId('fw-find-district-typed')) as HTMLInputElement;
    const commit = (text: string): void => {
      fireEvent.change(typed, { target: { value: text } });
      fireEvent.keyDown(typed, { key: 'Enter' });
    };
    commit('Nagpur Rural');
    await screen.findByText('Ramesh Kumar');
    await openPanel(W1);
    expect(identityEntries(qc)).toHaveLength(1);
    commit('Nagpur Urban');
    await waitFor(() => expect(screen.queryByTestId('fw-detail')).toBeNull());
    expect(identityEntries(qc)).toHaveLength(0);
    expect(listFieldWorkers).toHaveBeenLastCalledWith(P, { state: 'active', district: 'Nagpur Urban' });
  });
});

describe('CR4 — a failed page never replaces the rows (or the panel and the code shown in it)', () => {
  it('a failed "Load more" keeps the rows AND the open panel with the code already shown, and says so beside the button', async () => {
    listFieldWorkers.mockResolvedValueOnce({ items: [row(W1, 'Ramesh Kumar')], next_cursor: 'c1' });
    await renderWithDistrict();
    await openPanel(W1);
    fireEvent.click(showFor(W1));
    await waitFor(() => expect(digits()).toBe('042719'));
    listFieldWorkers.mockRejectedValueOnce(new ApiError(503, 'field_worker.decrypt_unavailable', 'down'));
    fireEvent.click(screen.getByTestId('fw-find-list-more'));
    expect((await screen.findByTestId('fw-find-list-more-error')).textContent).toBe(t('fw.list.moreError'));
    expect(screen.queryByTestId('fw-find-list-error')).toBeNull();
    expect(digits()).toBe('042719'); // the reveal was NOT unmounted
    expect(screen.getByTestId('fw-detail-mobile').textContent).toBe('+919876500010');
    expect(screen.getByTestId('fw-find-list-row').textContent).toContain('Ramesh Kumar');
    expect(screen.getByTestId('fw-find-list-more')).toBeTruthy();
  });
});

describe('CR5 — a 401 goes to sign-in', () => {
  const expired = () => new ApiError(401, 'auth.session_required', 'no');

  it('the list', async () => {
    listFieldWorkers.mockRejectedValue(expired());
    const qc = createQueryClient();
    render(
      <QueryClientProvider client={qc}>
        <FindWorkerPage pariwarId={P} />
      </QueryClientProvider>,
    );
    await chooseDistrict('Patna');
    expect((await screen.findByTestId('fw-find-list-error')).textContent).toContain(t('fw.signIn'));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: '/login' }));
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it('Show code', async () => {
    await renderWithDistrict();
    await openPanel(W1);
    readFieldWorkerCode.mockRejectedValueOnce(expired());
    fireEvent.click(showFor(W1));
    expect((await screen.findByTestId('fw-code-refused')).textContent).toBe(t('fw.signIn'));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: '/login' }));
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it('NON-VACUITY: a 403 on Show code says the code screen’s own no-access line and does not navigate', async () => {
    await renderWithDistrict();
    await openPanel(W1);
    readFieldWorkerCode.mockRejectedValueOnce(new ApiError(403, 'auth.forbidden', 'no'));
    fireEvent.click(showFor(W1));
    expect((await screen.findByTestId('fw-code-refused')).textContent).toBe(t('fw.noAccessCode'));
    expect(navigate).not.toHaveBeenCalled();
  });
});

describe('CR6 — the digits, the live region, the focus and the names', () => {
  it('the live region is mounted EMPTY and persists; it says shown / hidden by name, never the digits; focus goes Hide → Show', async () => {
    const user = userEvent.setup();
    await renderWithDistrict();
    await openPanel(W1);
    const live = liveOf(W1);
    expect(live.getAttribute('role')).toBe('status');
    expect(live.getAttribute('aria-live')).toBe('polite');
    expect(live.textContent).toBe(''); // mounted before anything is said

    await user.click(screen.getByRole('button', { name: showName('Ramesh Kumar') }));
    await waitFor(() => expect(digits()).toBe('042719'));
    expect(liveOf(W1)).toBe(live); // the SAME node — a region that is replaced is announced unreliably
    expect(live.textContent).toBe(t('fw.code.liveShown', { name: 'Ramesh Kumar', seconds: 60 }));
    expect(live.textContent).not.toMatch(/0\D*4\D*2\D*7\D*1\D*9/);
    const hide = screen.getByRole('button', { name: hideName('Ramesh Kumar') });
    expect(document.activeElement).toBe(hide); // focus moved to Hide when the code appeared

    await user.click(hide);
    expect(digits()).toBeNull();
    expect(liveOf(W1)).toBe(live);
    expect(live.textContent).toBe(t('fw.code.liveHidden'));
    expect(document.activeElement).toBe(screen.getByRole('button', { name: showName('Ramesh Kumar') })); // and back to Show
  });

  it('the 60-second expiry announces "hidden" and returns focus to Show when focus was on the reveal — but leaves it alone when the admin went elsewhere', async () => {
    await renderWithDistrict();
    await openPanel(W1);
    vi.useFakeTimers({ shouldAdvanceTime: true });
    pressShow(W1);
    await waitFor(() => expect(digits()).toBe('042719'));
    // In a `waitFor`: the digits commit first and the focus move is an effect after them, which a loaded machine runs later (ci:local).
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: hideName('Ramesh Kumar') })));
    act(() => {
      vi.advanceTimersByTime(CODE_VISIBLE_MS + 1000);
    });
    expect(digits()).toBeNull();
    expect(liveOf(W1).textContent).toBe(t('fw.code.liveHidden'));
    expect(document.activeElement).toBe(screen.getByRole('button', { name: showName('Ramesh Kumar') }));

    // Again, but the admin has moved on to the district select meanwhile.
    pressShow(W1);
    await waitFor(() => expect(digits()).toBe('042719'));
    const select = screen.getByTestId('fw-find-district');
    select.focus();
    act(() => {
      vi.advanceTimersByTime(CODE_VISIBLE_MS + 1000);
    });
    expect(digits()).toBeNull();
    expect(document.activeElement).toBe(select);
  });

  it('a hidden tab clears the code and puts focus back on Show; switching the panel to ANOTHER worker leaves focus on the NEW panel, not the old row', async () => {
    await renderWithDistrict();
    await openPanel(W1);
    pressShow(W1);
    await waitFor(() => expect(digits()).toBe('042719'));
    act(() => setVisibility('hidden'));
    expect(liveOf(W1).textContent).toBe(t('fw.code.liveHidden'));
    expect(document.activeElement).toBe(screen.getByRole('button', { name: showName('Ramesh Kumar') }));
    setVisibility('visible');

    pressShow(W1);
    await waitFor(() => expect(digits()).toBe('042719'));
    await openPanel(W2); // W1’s panel and code go; W2’s panel takes focus
    expect(screen.queryByTestId(`fw-code-${W1}`)).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: t('fw.detail.title') }));
    pressShow(W2);
    await waitFor(() => expect(digits()).toBe('555123'));
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: hideName('Sita Devi') }))); // as above
  });

  it('a refused read says so with role=alert and leaves the live region empty', async () => {
    readFieldWorkerCode.mockRejectedValueOnce(new ApiError(409, 'field_worker.code_not_available', 'no', { current_state: 'pending_kyc' }));
    await renderWithDistrict();
    await openPanel(W1);
    fireEvent.click(showFor(W1));
    const refused = await screen.findByTestId('fw-code-refused');
    expect(refused.getAttribute('role')).toBe('alert');
    expect(liveOf(W1).textContent).toBe('');
  });

  it('the Show button’s name CONTAINS its visible text; there is no aria-label on Show or Hide', async () => {
    await renderWithDistrict();
    await openPanel(W1);
    const show = screen.getByRole('button', { name: showName('Ramesh Kumar') });
    expect(show.hasAttribute('aria-label')).toBe(false);
    expect(show.textContent).toContain(t('fw.code.show'));
    fireEvent.click(show);
    await waitFor(() => expect(digits()).toBe('042719'));
    const hide = screen.getByRole('button', { name: hideName('Ramesh Kumar') });
    expect(hide.hasAttribute('aria-label')).toBe(false);
    expect(hide.textContent).toContain(t('fw.code.hide'));
  });

  it('while the read is in flight the button’s name still contains its visible text ("Fetching the code…")', async () => {
    await renderWithDistrict();
    await openPanel(W1);
    const d = deferred<{ field_worker_id: string; code: string }>();
    readFieldWorkerCode.mockReturnValueOnce(d.promise);
    fireEvent.click(showFor(W1));
    expect(screen.getByRole('button', { name: `${t('fw.code.loading')} ${forName('Ramesh Kumar')}` })).toBeTruthy();
    expect(liveOf(W1).textContent).toBe(t('fw.code.loading'));
    await act(async () => d.resolve({ field_worker_id: W1, code: '042719' }));
  });
});

describe('CR16 (d) — no clipboard call in the whole check / show / hide / expire / switch flow', () => {
  const writeText = vi.fn();
  const readText = vi.fn();
  const execCommand = vi.fn();
  let savedClipboard: PropertyDescriptor | undefined;
  let savedExec: PropertyDescriptor | undefined;

  beforeEach(() => {
    writeText.mockReset();
    readText.mockReset();
    execCommand.mockReset();
    savedClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
    savedExec = Object.getOwnPropertyDescriptor(document, 'execCommand');
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText, readText, write: writeText, read: readText } });
    Object.defineProperty(document, 'execCommand', { configurable: true, writable: true, value: execCommand });
  });
  afterEach(() => {
    if (savedClipboard === undefined) Reflect.deleteProperty(navigator, 'clipboard');
    else Object.defineProperty(navigator, 'clipboard', savedClipboard);
    if (savedExec === undefined) Reflect.deleteProperty(document, 'execCommand');
    else Object.defineProperty(document, 'execCommand', savedExec);
  });

  it('check, show, hide, show again, a switch to another worker, expiry, a refused read and Close never touch navigator.clipboard or execCommand', async () => {
    await renderWithDistrict();
    await openPanel(W1);
    vi.useFakeTimers({ shouldAdvanceTime: true });
    fireEvent.click(showFor(W1));
    await waitFor(() => expect(digits()).toBe('042719'));
    fireEvent.click(screen.getByTestId('fw-code-hide'));
    fireEvent.click(showFor(W1));
    await waitFor(() => expect(digits()).toBe('042719'));
    fireEvent.click(checkFor(W2)); // the panel is replaced
    await waitFor(() => expect(screen.getByTestId('fw-detail-mobile').textContent).toBe(MOBILE[W2]));
    fireEvent.click(showFor(W2));
    await waitFor(() => expect(digits()).toBe('555123'));
    act(() => {
      vi.advanceTimersByTime(CODE_VISIBLE_MS + 1000);
    });
    expect(digits()).toBeNull();
    readFieldWorkerCode.mockRejectedValueOnce(new ApiError(409, 'field_worker.code_not_available', 'no', { current_state: 'suspended' }));
    fireEvent.click(showFor(W2));
    await screen.findByTestId('fw-code-refused');
    fireEvent.click(screen.getByTestId('fw-detail-close'));
    // NON-VACUITY: the stubs are what the page would reach — installed, callable, and still untouched.
    expect(navigator.clipboard.writeText).toBe(writeText);
    expect(writeText).not.toHaveBeenCalled();
    expect(readText).not.toHaveBeenCalled();
    expect(execCommand).not.toHaveBeenCalled();
    // A copy gesture at the digits would be a call: prove the stub records one.
    void navigator.clipboard.writeText('x');
    expect(writeText).toHaveBeenCalledTimes(1);
  });
});

describe('CR10 — the finder announces and focuses by name', () => {
  it('one status region is mounted before any district is chosen and survives the choice', async () => {
    const qc = createQueryClient();
    render(
      <QueryClientProvider client={qc}>
        <FindWorkerPage pariwarId={P} />
      </QueryClientProvider>,
    );
    const region = screen.getByTestId('fw-find-list-status');
    expect(region.getAttribute('role')).toBe('status');
    expect(region.textContent).toBe('');
    listFieldWorkers.mockResolvedValue({ items: [], next_cursor: null });
    await chooseDistrict('Patna');
    expect((await within(region).findByTestId('fw-find-list-empty')).textContent).toBe(t('fw.find.empty'));
    expect(screen.getByTestId('fw-find-list-status')).toBe(region);
  });

  it('(f) "Load more" moves focus to the first new row’s NAMED "Check details" button', async () => {
    listFieldWorkers.mockResolvedValueOnce({ items: [row(W1, 'Ramesh Kumar')], next_cursor: 'c1' }).mockResolvedValueOnce({ items: [row(W2, 'Sita Devi')], next_cursor: null });
    await renderWithDistrict();
    const more = screen.getByTestId('fw-find-list-more');
    more.focus();
    fireEvent.click(more);
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: checkName('Sita Devi') })));
    expect(screen.getByText(t('fw.list.moreShownOne'))).toBeTruthy();
    expect(showCodeButtons()).toHaveLength(0); // the new rows carry no "Show code" either
  });

  it('the page heading is not a hidden focus target (no tabindex without a ref)', async () => {
    const qc = createQueryClient();
    render(
      <QueryClientProvider client={qc}>
        <FindWorkerPage pariwarId={P} />
      </QueryClientProvider>,
    );
    expect(screen.getByRole('heading', { level: 1 }).hasAttribute('tabindex')).toBe(false);
  });
});

describe('review round 3 — the fix diff', () => {
  const unreadable = () => new ApiError(500, 'field_worker.identity_unreadable', 'no');

  it('CR38 — a failed "Load more" says what the server said when retrying cannot help: no "Try again", Load more refused', async () => {
    listFieldWorkers.mockResolvedValueOnce({ items: [row(W1, 'Ramesh Kumar')], next_cursor: 'c1' });
    await renderWithDistrict();
    listFieldWorkers.mockRejectedValueOnce(unreadable());
    fireEvent.click(screen.getByTestId('fw-find-list-more'));
    const alert = await screen.findByTestId('fw-find-list-more-error');
    expect(alert.textContent).toBe(t('fw.list.unreadable'));
    expect(within(alert).queryByRole('button')).toBeNull();
    expect((screen.getByTestId('fw-find-list-more') as HTMLButtonElement).disabled).toBe(true);
  });

  it('CR38 — a 403 on a later page uses the page’s own no-access words', async () => {
    listFieldWorkers.mockResolvedValueOnce({ items: [row(W1, 'Ramesh Kumar')], next_cursor: 'c1' });
    await renderWithDistrict();
    listFieldWorkers.mockRejectedValueOnce(new ApiError(403, 'auth.forbidden', 'no'));
    fireEvent.click(screen.getByTestId('fw-find-list-more'));
    expect((await screen.findByTestId('fw-find-list-more-error')).textContent).toBe(t('fw.noAccessFind'));
  });

  it('CR38, CR55 — a cursor the server refused is never re-sent: Try again re-walks the loaded pages, focus stays on the list, one alert at a time', async () => {
    listFieldWorkers
      .mockResolvedValueOnce({ items: [row(W1, 'Ramesh Kumar')], next_cursor: 'c1' })
      .mockResolvedValueOnce({ items: [row(W2, 'Sita Devi')], next_cursor: 'c2' });
    await renderWithDistrict();
    fireEvent.click(screen.getByTestId('fw-find-list-more'));
    await screen.findByText('Sita Devi');
    await waitFor(() => expect((screen.getByTestId('fw-find-list-more') as HTMLButtonElement).disabled).toBe(false));
    listFieldWorkers.mockRejectedValueOnce(new ApiError(400, 'field_worker.cursor_invalid', 'no'));
    fireEvent.click(screen.getByTestId('fw-find-list-more'));
    const alert = await screen.findByTestId('fw-find-list-more-error');
    expect(alert.textContent).toContain(t('fw.err.cursorInvalid'));
    expect((screen.getByTestId('fw-find-list-more') as HTMLButtonElement).disabled).toBe(true);
    expect(listFieldWorkers).toHaveBeenLastCalledWith(P, { state: 'active', district: 'Patna', cursor: 'c2' });

    const firstPage = deferred<{ items: ReturnType<typeof row>[]; next_cursor: string }>();
    listFieldWorkers.mockReturnValueOnce(firstPage.promise).mockResolvedValueOnce({ items: [row(W2, 'Sita Devi')], next_cursor: 'c9' });
    const retry = within(alert).getByRole('button', { name: t('fw.retry') });
    retry.focus();
    fireEvent.click(retry);
    expect(document.activeElement).toBe(screen.getByRole('heading', { level: 2, name: t('fw.find.title') }));
    await waitFor(() => expect(screen.queryByTestId('fw-find-list-more-error')).toBeNull()); // the re-walk has started
    expect(screen.queryByTestId('fw-find-list-refresh-error')).toBeNull(); // and no second alert while it runs
    await act(async () => firstPage.resolve({ items: [row(W1, 'Ramesh Kumar')], next_cursor: 'c8' }));
    await waitFor(() => expect((screen.getByTestId('fw-find-list-more') as HTMLButtonElement).disabled).toBe(false));
    expect(screen.queryByTestId('fw-find-list-refresh-error')).toBeNull();
    expect(listFieldWorkers.mock.calls.slice(3).map((c) => (c[1] as { cursor?: string }).cursor)).toEqual([undefined, 'c8']); // fresh cursors, never `c2`
  });

  it('CR53 — a re-walk refused again still has a way out: words, Try again, and "Load more" refused', async () => {
    listFieldWorkers.mockResolvedValueOnce({ items: [row(W1, 'Ramesh Kumar')], next_cursor: 'c1' });
    await renderWithDistrict();
    listFieldWorkers.mockRejectedValueOnce(new ApiError(400, 'field_worker.cursor_invalid', 'no'));
    fireEvent.click(screen.getByTestId('fw-find-list-more'));
    const first = await screen.findByTestId('fw-find-list-more-error');
    listFieldWorkers.mockRejectedValueOnce(new ApiError(400, 'field_worker.cursor_invalid', 'no'));
    fireEvent.click(within(first).getByRole('button', { name: t('fw.retry') }));
    const alert = await screen.findByTestId('fw-find-list-refresh-error');
    expect(alert.textContent).toContain(t('fw.err.cursorInvalid'));
    expect((screen.getByTestId('fw-find-list-more') as HTMLButtonElement).disabled).toBe(true);
    listFieldWorkers.mockResolvedValueOnce({ items: [row(W1, 'Ramesh Kumar')], next_cursor: 'c7' });
    fireEvent.click(within(alert).getByRole('button', { name: t('fw.retry') }));
    await waitFor(() => expect((screen.getByTestId('fw-find-list-more') as HTMLButtonElement).disabled).toBe(false));
    expect(screen.queryByTestId('fw-find-list-refresh-error')).toBeNull();
  });

  it('CR46 — Close when the row has left the list puts focus on the list heading, not on the body', async () => {
    const { qc } = await renderWithDistrict();
    await openPanel(W1);
    listFieldWorkers.mockResolvedValue({ items: [row(W2, 'Sita Devi')], next_cursor: null });
    await act(async () => {
      await qc.invalidateQueries({ queryKey: ['field-workers', P, 'list'] });
    });
    await waitFor(() => expect(screen.queryByRole('button', { name: checkName('Ramesh Kumar') })).toBeNull());
    fireEvent.click(screen.getByTestId('fw-detail-close'));
    expect(document.activeElement).toBe(screen.getByRole('heading', { level: 2, name: t('fw.find.title') }));
  });

  it('CR47 — a 409 authorization_stale on the code read refreshes the list; a 409 for another reason does not', async () => {
    await renderWithDistrict();
    await openPanel(W1);
    expect(listFieldWorkers).toHaveBeenCalledTimes(1);
    readFieldWorkerCode.mockRejectedValueOnce(new ApiError(409, 'field_worker.code_not_available', 'no', { current_state: 'suspended' }));
    fireEvent.click(showFor(W1));
    await screen.findByTestId('fw-code-refused');
    expect(listFieldWorkers).toHaveBeenCalledTimes(1);
    readFieldWorkerCode.mockRejectedValueOnce(new ApiError(409, 'field_worker.authorization_stale', 'moved'));
    fireEvent.click(showFor(W1));
    await waitFor(() => expect(listFieldWorkers).toHaveBeenCalledTimes(2));
  });

  describe('the typed district (CR44) and the districts read (CR45)', () => {
    const renderTruncated = () => {
      getFieldWorkerDistricts.mockResolvedValue({ districts: ['Nagpur', 'Patna'], districts_truncated: true });
      const qc = createQueryClient();
      render(
        <QueryClientProvider client={qc}>
          <FindWorkerPage pariwarId={P} />
        </QueryClientProvider>,
      );
      return qc;
    };

    it('the window losing focus commits nothing; really leaving the field does', async () => {
      const user = userEvent.setup();
      renderTruncated();
      const typed = (await screen.findByTestId('fw-find-district-typed')) as HTMLInputElement;
      await user.type(typed, 'Nagp');
      expect(document.activeElement).toBe(typed);
      fireEvent.blur(typed); // what a window blur does: the event fires and `activeElement` stays
      expect(listFieldWorkers).not.toHaveBeenCalled();
      await user.tab();
      await waitFor(() => expect(listFieldWorkers).toHaveBeenCalledWith(P, { state: 'active', district: 'Nagp' }));
    });

    it('an Enter that confirms IME composition commits nothing; the next Enter does', async () => {
      renderTruncated();
      const typed = (await screen.findByTestId('fw-find-district-typed')) as HTMLInputElement;
      fireEvent.change(typed, { target: { value: 'नागपुर' } });
      fireEvent.keyDown(typed, { key: 'Enter', isComposing: true });
      fireEvent.keyDown(typed, { key: 'Enter', keyCode: 229 }); // Safari: the composition has ended, the key code says what this Enter was
      expect(listFieldWorkers).not.toHaveBeenCalled();
      fireEvent.keyDown(typed, { key: 'Enter' });
      await waitFor(() => expect(listFieldWorkers).toHaveBeenCalledWith(P, { state: 'active', district: 'नागपुर' }));
    });

    it('a background refresh that fails leaves the working select alone', async () => {
      const qc = renderTruncated();
      await screen.findByRole('option', { name: 'Patna' });
      getFieldWorkerDistricts.mockRejectedValueOnce(new ApiError(503, 'x', 'down'));
      await act(async () => {
        await qc.refetchQueries({ queryKey: ['field-workers', P, 'districts'] });
        await new Promise((resolve) => setTimeout(resolve, 20)); // the observers are told on a later tick
      });
      expect(qc.getQueryState(['field-workers', P, 'districts'])?.status).toBe('error'); // NON-VACUITY: the refresh really failed
      expect(screen.queryByTestId('fw-find-district-retry')).toBeNull();
      expect(screen.getByRole('option', { name: 'Patna' })).toBeTruthy();
    });

    it('a 401 on the districts read goes to sign-in', async () => {
      getFieldWorkerDistricts.mockRejectedValue(new ApiError(401, 'auth.session_required', 'no'));
      render(
        <QueryClientProvider client={createQueryClient()}>
          <FindWorkerPage pariwarId={P} />
        </QueryClientProvider>,
      );
      await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: '/login' }));
    });
  });
});
