// Story 6.36c (Task 5; AC2, AC8) — the Super Admin's WORKPLACE LIST page and its nav link.
//   · the list: a staff row has rename + delist / list again; an IMPORTED row is read-only, labelled by its source (RV3);
//     ⛔ a delete control anywhere;
//   · the filters reach the SERVER (the query carries them) and reset the page;
//   · add sends the trimmed fields (a UDISE code only for a school); a step-up-required 403 holds the write, which runs
//     after the code verifies — with the contracts' context, ⛔ a literal;
//   · a refusal shows its own words;
//   · the nav: the Workplaces link ONLY inside a Pariwar AND on the national `workplace.manage`; the Requests link inside
//     any Pariwar (a Pariwar grant is ⛔ in `nationalGrants` — the server's 403 is the gate).
//   · code review round 2: the write controls ONLY on `workplace.manage`; a filter change ⛔ resets an in-flight write and
//     every write control stays disabled until it lands; a held step-up retry names its write, is KEPT by paging and the
//     filters, is dropped by the panel's Cancel and by an edit of its own form, and other writes are disabled meanwhile;
//     an edit made while the write is IN FLIGHT means its 403 raises ⛔ panel; a refused rename keeps the typed text; the
//     typed filters are debounced and reset the page once settled; a timed-out write releases the lock; a verify 429 and
//     a zod 400 have their own lines. `holdKey` / `holdOnce` are defence-in-depth (⛔ reachable through the UI — every
//     write control is locked while a write is in flight or held, and a hold only follows an unmount), so they are
//     tested directly.

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { WORKPLACE_MANAGE_STEP_UP_CONTEXT, type AdminWorkplacesResponse } from '@twt/contracts';

let params: Record<string, string> = {};
vi.mock('@tanstack/react-router', () => ({
  Link: (p: { children: ReactNode; to: string; params?: unknown; 'data-testid'?: string }) => (
    <a href={p.to} data-params={JSON.stringify(p.params ?? null)} data-testid={p['data-testid']}>
      {p.children}
    </a>
  ),
  Outlet: () => null,
  useNavigate: () => vi.fn(),
  useParams: () => params,
  useRouter: () => ({ invalidate: vi.fn() }),
}));

let grants: string[] = [];
const getAdminWorkplaces = vi.fn();
const addAdminWorkplace = vi.fn();
const renameAdminWorkplace = vi.fn();
const setAdminWorkplaceListed = vi.fn();
const requestStepUp = vi.fn();
const verifyStepUp = vi.fn();
vi.mock('../src/api/client.js', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    getSession: async () => ({ userId: '11111111-1111-4111-8111-111111111111', nationalGrants: grants }),
    getAdminWorkplaces: (p: string, q: unknown) => getAdminWorkplaces(p, q),
    addAdminWorkplace: (p: string, b: unknown) => addAdminWorkplace(p, b),
    renameAdminWorkplace: (p: string, id: string, n: string) => renameAdminWorkplace(p, id, n),
    setAdminWorkplaceListed: (p: string, id: string, a: string) => setAdminWorkplaceListed(p, id, a),
    requestStepUp: (c: string) => requestStepUp(c),
    verifyStepUp: (o: string) => verifyStepUp(o),
  };
});

const { RootLayout } = await import('../src/routes/RootLayout.js');
const { WorkplacesPage, workplacesEn: t } = await import('../src/modules/workplaces/index.js');
const { stepUpEn } = await import('../src/modules/workplaces/i18n-en.js');
const { holdKey, holdOnce } = await import('../src/modules/workplaces/StepUpPanel.js');
const { ApiError } = await import('../src/api/client.js');
const { sessionKey } = await import('../src/api/hooks.js');

/** A promise the test settles by hand — a write held IN FLIGHT. */
function deferred<T>(): { promise: Promise<T>; resolve: (v: T) => void } {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

/** Fill the add form with an office and submit it. */
function submitOffice(name = 'BEO Office'): void {
  fireEvent.change(screen.getByTestId('workplace-add-name'), { target: { value: name } });
  fireEvent.change(screen.getByTestId('workplace-add-district'), { target: { value: 'Patna' } });
  fireEvent.click(screen.getByTestId('workplace-add-submit'));
}

const P = '44444444-4444-4444-8444-444444444444';
const OFFICE = '55555555-5555-4555-8555-555555555555';
const SCHOOL = '66666666-6666-4666-8666-666666666666';
const LIST: AdminWorkplacesResponse = {
  items: [
    { workplaceId: OFFICE, kind: 'office', name: 'DEO OFFICE PATNA', district: 'Patna', villageName: null, blockCode: null, udiseSchoolCode: null, source: 'staff', status: 'listed' },
    { workplaceId: SCHOOL, kind: 'school', name: 'GMS RAMPUR', district: 'Patna', villageName: 'Rampur', blockCode: '102801', udiseSchoolCode: '10280100101', source: 'import', status: 'listed' },
  ],
  nextCursor: 'next-page',
  hasMore: true,
};
const WRITE = { workplace: LIST.items[0]! };

function mountPage(): QueryClient {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <WorkplacesPage pariwarId={P} />
    </QueryClientProvider>,
  );
  return qc;
}

beforeEach(() => {
  for (const f of [getAdminWorkplaces, addAdminWorkplace, renameAdminWorkplace, setAdminWorkplaceListed, requestStepUp, verifyStepUp]) f.mockReset();
  getAdminWorkplaces.mockResolvedValue(LIST);
  // The page's write controls show on the national grant (code review round 2) — the nav legs below set their own.
  grants = ['workplace.manage'];
});

describe('<WorkplacesPage> (AC2, AC8)', () => {
  it('a STAFF row has rename + delist; an IMPORTED row is read-only, labelled; ⛔ a delete control', async () => {
    mountPage();
    const office = await screen.findByTestId(`workplace-row-${OFFICE}`);
    expect(within(office).getByTestId(`workplace-rename-${OFFICE}`)).toBeInTheDocument();
    expect(within(office).getByTestId(`workplace-toggle-${OFFICE}`)).toHaveTextContent(t.delist);
    const school = screen.getByTestId(`workplace-row-${SCHOOL}`);
    expect(within(school).getByTestId(`workplace-readonly-${SCHOOL}`)).toHaveTextContent(t.importNote);
    expect(within(school).queryByTestId(`workplace-rename-${SCHOOL}`)).toBeNull();
    expect(school).toHaveTextContent(t.source.import);
    expect(screen.queryByRole('button', { name: /delete/i })).toBeNull();
    expect(screen.getByText(t.neverDeleted)).toBeInTheDocument();
  });

  it('the filters reach the server (listed by default); the next page sends the cursor', async () => {
    mountPage();
    await screen.findByTestId('workplaces-table');
    expect(getAdminWorkplaces).toHaveBeenLastCalledWith(P, { status: 'listed' });
    fireEvent.change(screen.getByTestId('filter-district'), { target: { value: ' Patna ' } });
    fireEvent.change(screen.getByTestId('filter-kind'), { target: { value: 'office' } });
    fireEvent.change(screen.getByTestId('filter-q'), { target: { value: 'deo' } });
    await waitFor(() => expect(getAdminWorkplaces).toHaveBeenLastCalledWith(P, { status: 'listed', district: 'Patna', kind: 'office', q: 'deo' }));
    fireEvent.click(await screen.findByTestId('workplaces-next'));
    await waitFor(() => expect(getAdminWorkplaces).toHaveBeenLastCalledWith(P, { status: 'listed', district: 'Patna', kind: 'office', q: 'deo', cursor: 'next-page' }));
  });

  it('add: trimmed fields; a step-up 403 holds the write, which runs after the code verifies (the contracts’ context)', async () => {
    addAdminWorkplace.mockRejectedValueOnce(new ApiError(403, 'auth.step_up_required', 'x')).mockResolvedValueOnce(WRITE);
    requestStepUp.mockResolvedValue({});
    verifyStepUp.mockResolvedValue({});
    mountPage();
    await screen.findByTestId('workplace-add-form');
    fireEvent.change(screen.getByTestId('workplace-add-kind'), { target: { value: 'school' } });
    fireEvent.change(screen.getByTestId('workplace-add-name'), { target: { value: '  Missing School  ' } });
    fireEvent.change(screen.getByTestId('workplace-add-district'), { target: { value: 'Patna' } });
    fireEvent.change(screen.getByTestId('workplace-add-udise'), { target: { value: '10289999999' } });
    fireEvent.click(screen.getByTestId('workplace-add-submit'));
    const panel = await screen.findByTestId('workplaces-step-up');
    fireEvent.click(within(panel).getByText('Send the code'));
    await waitFor(() => expect(requestStepUp).toHaveBeenCalledWith(WORKPLACE_MANAGE_STEP_UP_CONTEXT));
    fireEvent.change(await screen.findByTestId('workplaces-step-up-code'), { target: { value: '123456' } });
    fireEvent.click(screen.getByTestId('workplaces-step-up-verify'));
    await waitFor(() => expect(addAdminWorkplace).toHaveBeenCalledTimes(2));
    expect(addAdminWorkplace).toHaveBeenLastCalledWith(P, { kind: 'school', name: 'Missing School', district: 'Patna', udiseSchoolCode: '10289999999' });
    await waitFor(() => expect(screen.getByTestId('workplaces-saved')).toHaveTextContent(t.saved));
  });

  it('an office never sends a UDISE code; a refusal shows its own words', async () => {
    addAdminWorkplace.mockRejectedValue(new ApiError(422, 'workplace.district_not_found', 'x'));
    mountPage();
    await screen.findByTestId('workplace-add-form');
    expect(screen.queryByTestId('workplace-add-udise')).toBeNull();
    fireEvent.change(screen.getByTestId('workplace-add-name'), { target: { value: 'BEO Office' } });
    fireEvent.change(screen.getByTestId('workplace-add-district'), { target: { value: 'Nalanda' } });
    fireEvent.click(screen.getByTestId('workplace-add-submit'));
    expect(await screen.findByTestId('workplaces-write-error')).toHaveTextContent(t.errors['workplace.district_not_found']);
    expect(addAdminWorkplace).toHaveBeenCalledWith(P, { kind: 'office', name: 'BEO Office', district: 'Nalanda' });
  });

  it('code review round 2 — ⛔ without `workplace.manage` (the session’s national grant) ⇒ the list, but ⛔ add / rename / delist', async () => {
    grants = [];
    const qc = mountPage();
    const office = await screen.findByTestId(`workplace-row-${OFFICE}`);
    // ⛔ An absence asserted before the session answered proves nothing — wait for the session query itself.
    await waitFor(() => expect(qc.getQueryState(sessionKey)?.status).toBe('success'));
    expect(within(office).queryByTestId(`workplace-rename-${OFFICE}`)).toBeNull();
    expect(within(office).queryByTestId(`workplace-toggle-${OFFICE}`)).toBeNull();
    expect(screen.queryByTestId('workplace-add-form')).toBeNull();
  });

  it('code review round 2 — a filter change ⛔ resets an IN-FLIGHT add; every write control stays disabled until it lands, then “Saved.”', async () => {
    const write = deferred<typeof WRITE>();
    addAdminWorkplace.mockReturnValueOnce(write.promise);
    mountPage();
    await screen.findByTestId(`workplace-row-${OFFICE}`);
    submitOffice();
    await waitFor(() => expect(addAdminWorkplace).toHaveBeenCalledTimes(1));
    fireEvent.change(screen.getByTestId('filter-q'), { target: { value: 'deo' } });
    // ⛔ A second Add (a duplicate staff row), ⛔ a rename or delist, while the first write is in flight.
    expect(screen.getByTestId('workplace-add-submit')).toBeDisabled();
    expect(screen.getByTestId(`workplace-toggle-${OFFICE}`)).toBeDisabled();
    expect(screen.getByTestId(`workplace-rename-${OFFICE}`)).toBeDisabled();
    fireEvent.click(screen.getByTestId('workplace-add-submit'));
    expect(addAdminWorkplace).toHaveBeenCalledTimes(1);
    write.resolve(WRITE);
    // The per-call `onSuccess` survived (⛔ detached by a reset): the form remounted empty and "Saved." shows.
    await waitFor(() => expect(screen.getByTestId('workplaces-saved')).toHaveTextContent(t.saved));
    await waitFor(() => expect(screen.getByTestId('workplace-add-name')).toHaveValue(''));
    expect(screen.getByTestId('workplace-add-submit')).toBeEnabled();
  });

  it('code review round 2 — a held step-up retry names its write; other writes are disabled; a filter change and paging KEEP it; the panel’s Cancel drops it (⛔ re-sent)', async () => {
    addAdminWorkplace.mockRejectedValue(new ApiError(403, 'auth.step_up_required', 'x'));
    requestStepUp.mockResolvedValue({});
    mountPage();
    await screen.findByTestId(`workplace-row-${OFFICE}`);
    submitOffice();
    const panel = await screen.findByTestId('workplaces-step-up');
    expect(within(panel).getByTestId('workplaces-step-up-held')).toHaveTextContent(stepUpEn.waiting(stepUpEn.held.add('BEO Office')));
    expect(screen.getByTestId(`workplace-toggle-${OFFICE}`)).toBeDisabled();
    expect(screen.getByTestId('workplace-add-submit')).toBeDisabled();
    fireEvent.click(within(panel).getByText(stepUpEn.send));
    expect(await screen.findByTestId('workplaces-step-up-code')).toBeInTheDocument();
    // ⛔ Neither changes what the retry would send — the code already sent stays usable.
    fireEvent.change(screen.getByTestId('filter-district'), { target: { value: 'Nalanda' } });
    fireEvent.click(screen.getByTestId('workplaces-next'));
    await waitFor(() => expect(getAdminWorkplaces).toHaveBeenLastCalledWith(P, expect.objectContaining({ district: 'Nalanda' })));
    expect(screen.getByTestId('workplaces-step-up')).toBeInTheDocument();
    expect(screen.getByTestId('workplaces-step-up-code')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('workplaces-step-up-cancel'));
    await waitFor(() => expect(screen.queryByTestId('workplaces-step-up')).toBeNull());
    expect(screen.getByTestId(`workplace-toggle-${OFFICE}`)).toBeEnabled();
    expect(verifyStepUp).not.toHaveBeenCalled();
    expect(addAdminWorkplace).toHaveBeenCalledTimes(1);
  });

  it('code review round 2 — after a Cancel, the next hold starts again from “Send the code” (the panel unmounts between holds)', async () => {
    addAdminWorkplace.mockRejectedValue(new ApiError(403, 'auth.step_up_required', 'x'));
    requestStepUp.mockResolvedValue({});
    mountPage();
    await screen.findByTestId(`workplace-row-${OFFICE}`);
    submitOffice();
    fireEvent.click(within(await screen.findByTestId('workplaces-step-up')).getByText(stepUpEn.send));
    expect(await screen.findByTestId('workplaces-step-up-code')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('workplaces-step-up-cancel'));
    await waitFor(() => expect(screen.queryByTestId('workplaces-step-up')).toBeNull());
    fireEvent.click(screen.getByTestId('workplace-add-submit'));
    await screen.findByTestId('workplaces-step-up');
    expect(screen.queryByTestId('workplaces-step-up-code')).toBeNull();
  });

  it('code review round 2 — `holdKey` is unique per hold and `holdOnce` refuses a second hold (defence-in-depth, ⛔ reachable through the UI)', () => {
    const a = { owner: 'add', id: 1, label: 'add “A”', retry: () => undefined };
    const b = { owner: 'add', id: 2, label: 'add “B”', retry: () => undefined };
    expect(holdKey(a)).not.toBe(holdKey(b));
    expect(holdKey({ ...a, target: OFFICE })).not.toBe(holdKey(a));
    expect(holdOnce(b)(a)).toBe(a);
    expect(holdOnce(b)(null)).toBe(b);
  });

  it('code review round 2 — an add-form edit made while the add is IN FLIGHT: its 403 raises ⛔ panel (⛔ the old body re-sent) and the edit stays', async () => {
    let refuse!: (e: unknown) => void;
    addAdminWorkplace.mockReturnValueOnce(new Promise((_, r) => (refuse = r)));
    mountPage();
    await screen.findByTestId(`workplace-row-${OFFICE}`);
    submitOffice('BEO Ofice');
    await waitFor(() => expect(addAdminWorkplace).toHaveBeenCalledTimes(1));
    fireEvent.change(screen.getByTestId('workplace-add-name'), { target: { value: 'BEO Office' } });
    refuse(new ApiError(403, 'auth.step_up_required', 'x'));
    await waitFor(() => expect(screen.getByTestId('workplace-add-submit')).toBeEnabled());
    expect(screen.queryByTestId('workplaces-step-up')).toBeNull();
    expect(screen.getByTestId('workplace-add-name')).toHaveValue('BEO Office');
    expect(addAdminWorkplace).toHaveBeenCalledTimes(1);
  });

  it('code review round 2 — an add-form edit made while the add is IN FLIGHT survives its success (⛔ the form wiped)', async () => {
    const write = deferred<typeof WRITE>();
    addAdminWorkplace.mockReturnValueOnce(write.promise);
    mountPage();
    await screen.findByTestId(`workplace-row-${OFFICE}`);
    submitOffice('BEO Office');
    await waitFor(() => expect(addAdminWorkplace).toHaveBeenCalledTimes(1));
    fireEvent.change(screen.getByTestId('workplace-add-name'), { target: { value: 'CEO Office' } });
    write.resolve(WRITE);
    await waitFor(() => expect(screen.getByTestId('workplaces-saved')).toHaveTextContent(t.saved));
    expect(screen.getByTestId('workplace-add-name')).toHaveValue('CEO Office');
  });

  it('code review round 2 — a write that times out settles as “could not be saved” and releases the lock', async () => {
    addAdminWorkplace.mockRejectedValue(new DOMException('The operation timed out.', 'TimeoutError'));
    mountPage();
    await screen.findByTestId(`workplace-row-${OFFICE}`);
    submitOffice();
    expect(await screen.findByTestId('workplaces-write-error')).toHaveTextContent(t.generic);
    expect(screen.getByTestId('workplace-add-submit')).toBeEnabled();
    expect(screen.getByTestId(`workplace-toggle-${OFFICE}`)).toBeEnabled();
  });

  it('code review round 2 — the page resets once the typed filter SETTLES: ⛔ an extra page-1 GET of the OLD filter', async () => {
    mountPage();
    fireEvent.click(await screen.findByTestId('workplaces-next'));
    await waitFor(() => expect(getAdminWorkplaces).toHaveBeenLastCalledWith(P, { status: 'listed', cursor: 'next-page' }));
    fireEvent.change(screen.getByTestId('filter-district'), { target: { value: 'Nalanda' } });
    await waitFor(() => expect(getAdminWorkplaces).toHaveBeenLastCalledWith(P, { status: 'listed', district: 'Nalanda' }));
    const oldPageOne = getAdminWorkplaces.mock.calls.filter((c) => JSON.stringify(c[1]) === JSON.stringify({ status: 'listed' }));
    expect(oldPageOne).toHaveLength(1);
  });

  it('code review round 2 — editing an add-form field drops a held add', async () => {
    addAdminWorkplace.mockRejectedValue(new ApiError(403, 'auth.step_up_required', 'x'));
    mountPage();
    await screen.findByTestId(`workplace-row-${OFFICE}`);
    submitOffice();
    await screen.findByTestId('workplaces-step-up');
    fireEvent.change(screen.getByTestId('workplace-add-kind'), { target: { value: 'school' } });
    await waitFor(() => expect(screen.queryByTestId('workplaces-step-up')).toBeNull());
  });

  it('code review round 2 — a verify answered 429 says “too many attempts”, ⛔ “not accepted”', async () => {
    addAdminWorkplace.mockRejectedValue(new ApiError(403, 'auth.step_up_required', 'x'));
    requestStepUp.mockResolvedValue({});
    verifyStepUp.mockRejectedValue(new ApiError(429, 'auth.rate_limited', 'x'));
    mountPage();
    await screen.findByTestId(`workplace-row-${OFFICE}`);
    submitOffice();
    fireEvent.click(within(await screen.findByTestId('workplaces-step-up')).getByText(stepUpEn.send));
    fireEvent.change(await screen.findByTestId('workplaces-step-up-code'), { target: { value: '123456' } });
    fireEvent.click(screen.getByTestId('workplaces-step-up-verify'));
    expect(await screen.findByTestId('workplaces-step-up-verify-error')).toHaveTextContent(stepUpEn.verifyRateLimited);
    expect(stepUpEn.verifyRateLimited).not.toBe(stepUpEn.verifyError);
  });

  it('code review round 2 — a zod 400 `request.validation` says “check the fields”, ⛔ “could not be saved”', async () => {
    addAdminWorkplace.mockRejectedValue(new ApiError(400, 'request.validation', 'x'));
    mountPage();
    await screen.findByTestId(`workplace-row-${OFFICE}`);
    submitOffice();
    expect(await screen.findByTestId('workplaces-write-error')).toHaveTextContent(t.validation);
  });

  it('code review round 2 — the inputs carry the contracts’ bounds (q 100, district 200, block code 6, UDISE 11)', async () => {
    mountPage();
    await screen.findByTestId('workplace-add-form');
    expect(screen.getByTestId('filter-q')).toHaveAttribute('maxLength', '100');
    expect(screen.getByTestId('filter-district')).toHaveAttribute('maxLength', '200');
    expect(screen.getByTestId('workplace-add-district')).toHaveAttribute('maxLength', '200');
    expect(screen.getByTestId('workplace-add-block')).toHaveAttribute('maxLength', '6');
    fireEvent.change(screen.getByTestId('workplace-add-kind'), { target: { value: 'school' } });
    expect(screen.getByTestId('workplace-add-udise')).toHaveAttribute('maxLength', '11');
  });

  it('code review round 2 — the name search is debounced: quick keystrokes send ONE search, for the settled text', async () => {
    mountPage();
    await screen.findByTestId('workplaces-table');
    fireEvent.change(screen.getByTestId('filter-q'), { target: { value: 'd' } });
    fireEvent.change(screen.getByTestId('filter-q'), { target: { value: 'de' } });
    fireEvent.change(screen.getByTestId('filter-q'), { target: { value: 'deo' } });
    await waitFor(() => expect(getAdminWorkplaces).toHaveBeenLastCalledWith(P, { status: 'listed', q: 'deo' }));
    const qs = getAdminWorkplaces.mock.calls.map((c) => (c[1] as { q?: string }).q);
    expect(qs).not.toContain('d');
    expect(qs).not.toContain('de');
    // The rows stay on screen while the new search loads (`keepPreviousData`).
    expect(screen.getByTestId('workplaces-table')).toBeInTheDocument();
  });

  it('code review round 2 — a REFUSED rename keeps the typed text and shows its words; a successful one leaves edit mode', async () => {
    renameAdminWorkplace.mockRejectedValueOnce(new ApiError(404, 'workplace.not_found', 'x')).mockResolvedValueOnce(WRITE);
    mountPage();
    fireEvent.click(await screen.findByTestId(`workplace-rename-${OFFICE}`));
    fireEvent.change(screen.getByTestId(`workplace-rename-input-${OFFICE}`), { target: { value: 'DEO Office, Patna' } });
    fireEvent.click(screen.getByTestId(`workplace-rename-save-${OFFICE}`));
    expect(await screen.findByTestId('workplaces-write-error')).toHaveTextContent(t.errors['workplace.not_found']);
    expect(screen.getByTestId(`workplace-rename-input-${OFFICE}`)).toHaveValue('DEO Office, Patna');
    fireEvent.click(screen.getByTestId(`workplace-rename-save-${OFFICE}`));
    await waitFor(() => expect(screen.queryByTestId(`workplace-rename-input-${OFFICE}`)).toBeNull());
    expect(renameAdminWorkplace).toHaveBeenCalledTimes(2);
  });

  it('code review round 2 — the rename Cancel drops a held rename', async () => {
    renameAdminWorkplace.mockRejectedValue(new ApiError(403, 'auth.step_up_required', 'x'));
    mountPage();
    fireEvent.click(await screen.findByTestId(`workplace-rename-${OFFICE}`));
    fireEvent.change(screen.getByTestId(`workplace-rename-input-${OFFICE}`), { target: { value: 'DEO Office, Patna' } });
    fireEvent.click(screen.getByTestId(`workplace-rename-save-${OFFICE}`));
    await screen.findByTestId('workplaces-step-up');
    // Held, ⛔ succeeded ⇒ still in edit mode.
    expect(screen.getByTestId(`workplace-rename-input-${OFFICE}`)).toHaveValue('DEO Office, Patna');
    fireEvent.click(screen.getByTestId(`workplace-rename-cancel-${OFFICE}`));
    await waitFor(() => expect(screen.queryByTestId('workplaces-step-up')).toBeNull());
  });

  it('code review round 2 — a refused RELIST (its district left the list) says so — ⛔ the add form’s “spell the district” line', async () => {
    getAdminWorkplaces.mockResolvedValue({ ...LIST, items: [{ ...LIST.items[0]!, status: 'delisted' }] });
    setAdminWorkplaceListed.mockRejectedValue(new ApiError(422, 'workplace.district_not_found', 'x'));
    mountPage();
    const toggle = await screen.findByTestId(`workplace-toggle-${OFFICE}`);
    expect(toggle).toHaveTextContent(t.relist);
    fireEvent.click(toggle);
    await waitFor(() => expect(screen.getByTestId('workplaces-write-error')).toHaveTextContent(t.relistDistrictGone));
    expect(screen.getByTestId('workplaces-write-error')).not.toHaveTextContent(t.errors['workplace.district_not_found']);
    expect(setAdminWorkplaceListed).toHaveBeenCalledWith(P, OFFICE, 'relist');
  });

  it('code review round 2 — going back to an earlier filter opens its FIRST page (⛔ the page it was on)', async () => {
    mountPage();
    fireEvent.click(await screen.findByTestId('workplaces-next'));
    await waitFor(() => expect(getAdminWorkplaces).toHaveBeenLastCalledWith(P, { status: 'listed', cursor: 'next-page' }));
    fireEvent.change(screen.getByTestId('filter-kind'), { target: { value: 'office' } });
    await waitFor(() => expect(getAdminWorkplaces).toHaveBeenLastCalledWith(P, { status: 'listed', kind: 'office' }));
    getAdminWorkplaces.mockClear();
    fireEvent.change(screen.getByTestId('filter-kind'), { target: { value: '' } });
    await waitFor(() => expect(getAdminWorkplaces).toHaveBeenCalledWith(P, { status: 'listed' }));
    expect(getAdminWorkplaces).not.toHaveBeenCalledWith(P, { status: 'listed', cursor: 'next-page' });
  });

  it('rename and delist a staff row', async () => {
    renameAdminWorkplace.mockResolvedValue(WRITE);
    setAdminWorkplaceListed.mockResolvedValue(WRITE);
    mountPage();
    fireEvent.click(await screen.findByTestId(`workplace-rename-${OFFICE}`));
    fireEvent.change(screen.getByTestId(`workplace-rename-input-${OFFICE}`), { target: { value: ' DEO Office, Patna ' } });
    fireEvent.click(screen.getByText(t.renameSave));
    await waitFor(() => expect(renameAdminWorkplace).toHaveBeenCalledWith(P, OFFICE, 'DEO Office, Patna'));
    fireEvent.click(screen.getByTestId(`workplace-toggle-${OFFICE}`));
    await waitFor(() => expect(setAdminWorkplaceListed).toHaveBeenCalledWith(P, OFFICE, 'delist'));
  });
});

describe('the workplace nav links', () => {
  const setup = () =>
    render(
      <QueryClientProvider client={new QueryClient()}>
        <RootLayout />
      </QueryClientProvider>,
    );

  it('inside a Pariwar AND on the national grant ⇒ Workplaces; Requests inside any Pariwar', async () => {
    params = { pariwarId: P };
    grants = ['workplace.manage'];
    setup();
    const link = await screen.findByTestId('nav-workplaces');
    expect(link).toHaveAttribute('href', '/p/$pariwarId/workplaces');
    expect(link).toHaveAttribute('data-params', JSON.stringify({ pariwarId: P }));
    expect(screen.getByTestId('nav-workplace-requests')).toHaveAttribute('href', '/p/$pariwarId/workplace-requests');
  });

  it('⛔ without the grant ⇒ no Workplaces link (Requests stays); ⛔ outside a Pariwar ⇒ neither', async () => {
    params = { pariwarId: P };
    // Code review round 2: the Requests link is UNGATED, so its appearance proves ⛔ the session has loaded — wait for a
    // SESSION-dependent link (the escalations one, on its own national grant) before asserting the absence.
    grants = ['claim.review_escalated_closure'];
    const a = setup();
    await screen.findByTestId('nav-escalations');
    expect(screen.getByTestId('nav-workplace-requests')).toBeInTheDocument();
    expect(screen.queryByTestId('nav-workplaces')).toBeNull();
    a.unmount();
    params = {};
    grants = ['workplace.manage', 'claim.review_escalated_closure'];
    setup();
    await screen.findByTestId('nav-escalations-top');
    expect(screen.queryByTestId('nav-workplaces')).toBeNull();
    expect(screen.queryByTestId('nav-workplace-requests')).toBeNull();
  });
});
