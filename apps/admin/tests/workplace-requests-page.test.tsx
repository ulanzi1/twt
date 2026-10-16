// Story 6.36c (Task 5; AC3, AC7, AC8) — the Pariwar Admin's *"isn't listed"* QUEUE page and the campaign control.
//   · a request shows what the member TYPED, the district, the date, the same-name count — ⛔ who they are;
//   · the two tabs fetch `pending` / `suggested`;
//   · the suggest picker searches the LISTED workplaces of the REQUEST's district (the list GET); picking one suggests it;
//     a step-up 403 holds it (the contracts' review context); a 409 shows its words;
//   · close; ⛔ an ADD control on this page (ONLY the Super Admin adds);
//   · the campaign: start sends the two dates; an overlap shows its words; end; the page says nothing is sent to a phone.

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { WORKPLACE_REVIEW_STEP_UP_CONTEXT, type KnownPeopleCampaignListResponse, type WorkplaceRequestQueueResponse } from '@twt/contracts';

vi.mock('@tanstack/react-router', () => ({ useNavigate: () => vi.fn(), useParams: () => ({}) }));

const getWorkplaceRequests = vi.fn();
const getAdminWorkplaces = vi.fn();
const suggestWorkplaceForRequest = vi.fn();
const closeWorkplaceRequest = vi.fn();
const getKnownPeopleCampaigns = vi.fn();
const startKnownPeopleCampaign = vi.fn();
const endKnownPeopleCampaign = vi.fn();
const requestStepUp = vi.fn();
const verifyStepUp = vi.fn();
vi.mock('../src/api/client.js', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    getWorkplaceRequests: (p: string, q: unknown) => getWorkplaceRequests(p, q),
    getAdminWorkplaces: (p: string, q: unknown) => getAdminWorkplaces(p, q),
    suggestWorkplaceForRequest: (p: string, r: string, w: string) => suggestWorkplaceForRequest(p, r, w),
    closeWorkplaceRequest: (p: string, r: string) => closeWorkplaceRequest(p, r),
    getKnownPeopleCampaigns: (p: string) => getKnownPeopleCampaigns(p),
    startKnownPeopleCampaign: (p: string, b: unknown) => startKnownPeopleCampaign(p, b),
    endKnownPeopleCampaign: (p: string, c: string) => endKnownPeopleCampaign(p, c),
    requestStepUp: (c: string) => requestStepUp(c),
    verifyStepUp: (o: string) => verifyStepUp(o),
  };
});

const { WorkplaceRequestsPage, workplaceRequestsEn: t, workplacesEn, campaignEn } = await import('../src/modules/workplaces/index.js');
const { ApiError } = await import('../src/api/client.js');

const P = '44444444-4444-4444-8444-444444444444';
const REQ = '77777777-7777-4777-8777-777777777777';
const SCHOOL = '66666666-6666-4666-8666-666666666666';
const CAMPAIGN = '88888888-8888-4888-8888-888888888888';
const QUEUE: WorkplaceRequestQueueResponse = {
  items: [
    {
      requestId: REQ,
      typedName: 'Primary School Rampur',
      typedPlace: 'Rampur',
      district: 'Patna',
      startedOn: '2020-06-01',
      createdAt: '2026-10-15T06:00:00.000000Z',
      state: 'pending',
      sameNameCount: 2,
      suggested: null,
    },
  ],
  nextCursor: null,
  hasMore: false,
};
const CAMPAIGNS: KnownPeopleCampaignListResponse = {
  items: [{ campaignId: CAMPAIGN, startsOn: '2026-10-16', endsOn: '2026-10-20', status: 'live', endedAt: null, createdAt: '2026-10-16T00:00:00.000000Z' }],
  nextCursor: null,
  hasMore: false,
};

function mountPage(): void {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <WorkplaceRequestsPage pariwarId={P} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  for (const f of [
    getWorkplaceRequests,
    getAdminWorkplaces,
    suggestWorkplaceForRequest,
    closeWorkplaceRequest,
    getKnownPeopleCampaigns,
    startKnownPeopleCampaign,
    endKnownPeopleCampaign,
    requestStepUp,
    verifyStepUp,
  ])
    f.mockReset();
  getWorkplaceRequests.mockResolvedValue(QUEUE);
  getKnownPeopleCampaigns.mockResolvedValue(CAMPAIGNS);
  getAdminWorkplaces.mockResolvedValue({
    items: [{ workplaceId: SCHOOL, kind: 'school', name: 'GMS RAMPUR', district: 'Patna', villageName: 'Rampur', blockCode: null, udiseSchoolCode: null, source: 'import', status: 'listed' }],
    nextCursor: null,
    hasMore: false,
  });
});

describe('<WorkplaceRequestsPage> (AC3, AC8)', () => {
  it('a request shows what was TYPED, the district, the date and the same-name count — ⛔ who; ⛔ an add control', async () => {
    mountPage();
    const card = await screen.findByTestId(`request-${REQ}`);
    expect(card).toHaveTextContent(t.typed('Primary School Rampur'));
    expect(card).toHaveTextContent(t.place('Rampur'));
    expect(card).toHaveTextContent(t.district('Patna'));
    expect(card).toHaveTextContent(t.started('2020-06-01'));
    expect(within(card).getByTestId(`request-same-${REQ}`)).toHaveTextContent(t.sameName(2));
    expect(screen.queryByTestId('workplace-add-form')).toBeNull();
    expect(getWorkplaceRequests).toHaveBeenCalledWith(P, { state: 'pending' });
  });

  it('the suggested tab fetches `suggested`', async () => {
    mountPage();
    await screen.findByTestId(`request-${REQ}`);
    fireEvent.click(screen.getByTestId('requests-tab-suggested'));
    await waitFor(() => expect(getWorkplaceRequests).toHaveBeenLastCalledWith(P, { state: 'suggested' }));
  });

  it('the picker searches the REQUEST’s district (listed only); a step-up 403 holds the suggestion, then it runs', async () => {
    suggestWorkplaceForRequest.mockRejectedValueOnce(new ApiError(403, 'auth.step_up_required', 'x')).mockResolvedValueOnce({ requestId: REQ, state: 'suggested' });
    requestStepUp.mockResolvedValue({});
    verifyStepUp.mockResolvedValue({});
    mountPage();
    fireEvent.click(await screen.findByTestId(`request-suggest-${REQ}`));
    await waitFor(() => expect(getAdminWorkplaces).toHaveBeenLastCalledWith(P, { district: 'Patna', status: 'listed', limit: 20 }));
    fireEvent.change(screen.getByTestId('suggest-picker-q'), { target: { value: 'gms' } });
    await waitFor(() => expect(getAdminWorkplaces).toHaveBeenLastCalledWith(P, { district: 'Patna', status: 'listed', q: 'gms', limit: 20 }));
    fireEvent.click(await screen.findByTestId(`suggest-pick-${SCHOOL}`));
    const panel = await screen.findByTestId('requests-step-up');
    fireEvent.click(within(panel).getByText('Send the code'));
    await waitFor(() => expect(requestStepUp).toHaveBeenCalledWith(WORKPLACE_REVIEW_STEP_UP_CONTEXT));
    fireEvent.change(await screen.findByTestId('requests-step-up-code'), { target: { value: '123456' } });
    fireEvent.click(screen.getByTestId('requests-step-up-verify'));
    await waitFor(() => expect(suggestWorkplaceForRequest).toHaveBeenCalledTimes(2));
    expect(suggestWorkplaceForRequest).toHaveBeenLastCalledWith(P, REQ, SCHOOL);
    expect(await screen.findByTestId('requests-saved')).toHaveTextContent(t.saved);
  });

  it('a 409 shows its words; close sends the request id', async () => {
    closeWorkplaceRequest.mockRejectedValue(new ApiError(409, 'workplace.request_closed', 'x'));
    mountPage();
    fireEvent.click(await screen.findByTestId(`request-close-${REQ}`));
    await waitFor(() => expect(closeWorkplaceRequest).toHaveBeenCalledWith(P, REQ));
    expect(await screen.findByTestId('requests-write-error')).toHaveTextContent(workplacesEn.errors['workplace.request_closed']);
  });
});

describe('<CampaignControl> (AC7)', () => {
  it('says nothing is sent to a phone; start sends the two dates; an overlap shows its words; end a running one', async () => {
    startKnownPeopleCampaign.mockRejectedValue(new ApiError(409, 'known_people_campaign.overlap', 'x'));
    endKnownPeopleCampaign.mockResolvedValue({ campaign: { ...CAMPAIGNS.items[0]!, status: 'ended' } });
    mountPage();
    const control = await screen.findByTestId('campaign-control');
    expect(control).toHaveTextContent(campaignEn.intro);
    fireEvent.change(within(control).getByTestId('campaign-starts-on'), { target: { value: '2026-10-21' } });
    fireEvent.change(within(control).getByTestId('campaign-ends-on'), { target: { value: '2026-10-25' } });
    fireEvent.click(within(control).getByTestId('campaign-start'));
    await waitFor(() => expect(startKnownPeopleCampaign).toHaveBeenCalledWith(P, { startsOn: '2026-10-21', endsOn: '2026-10-25' }));
    expect(await screen.findByTestId('campaign-write-error')).toHaveTextContent(campaignEn.errors['known_people_campaign.overlap']);
    expect(await screen.findByTestId(`campaign-${CAMPAIGN}`)).toHaveTextContent(campaignEn.status.live);
    fireEvent.click(screen.getByTestId(`campaign-end-${CAMPAIGN}`));
    await waitFor(() => expect(endKnownPeopleCampaign).toHaveBeenCalledWith(P, CAMPAIGN));
  });
});
