// Story 6.36c (Task 5; AC2, AC8) — the Super Admin's WORKPLACE LIST page and its nav link.
//   · the list: a staff row has rename + delist / list again; an IMPORTED row is read-only, labelled by its source (RV3);
//     ⛔ a delete control anywhere;
//   · the filters reach the SERVER (the query carries them) and reset the page;
//   · add sends the trimmed fields (a UDISE code only for a school); a step-up-required 403 holds the write, which runs
//     after the code verifies — with the contracts' context, ⛔ a literal;
//   · a refusal shows its own words;
//   · the nav: the Workplaces link ONLY inside a Pariwar AND on the national `workplace.manage`; the Requests link inside
//     any Pariwar (a Pariwar grant is ⛔ in `nationalGrants` — the server's 403 is the gate).

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
const { ApiError } = await import('../src/api/client.js');

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

function mountPage(): void {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <WorkplacesPage pariwarId={P} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  for (const f of [getAdminWorkplaces, addAdminWorkplace, renameAdminWorkplace, setAdminWorkplaceListed, requestStepUp, verifyStepUp]) f.mockReset();
  getAdminWorkplaces.mockResolvedValue(LIST);
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
    expect(await screen.findByTestId('workplaces-saved')).toHaveTextContent(t.saved);
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
    grants = [];
    const a = setup();
    await screen.findByTestId('nav-workplace-requests');
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
