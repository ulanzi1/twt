// Story 6.36c (Task 5; AC3, AC7, AC8) — the Pariwar Admin's *"isn't listed"* QUEUE page and the campaign control.
//   · a request shows what the member TYPED, the district, the date, the same-name count — ⛔ who they are;
//   · the two tabs fetch `pending` / `suggested`;
//   · the suggest picker searches the LISTED workplaces of the REQUEST's district (the list GET); picking one suggests it;
//     a step-up 403 holds it (the contracts' review context); a 409 shows its words;
//   · close; ⛔ an ADD control on this page (ONLY the Super Admin adds);
//   · the campaign: start sends the two dates; an overlap shows its words; end; the page says nothing is sent to a phone.
//   · code review round 2: a STALE suggestion reads as pending with its line and is suggestable; a filter change ⛔
//     resets an in-flight suggestion and every write control (the campaign's too) stays disabled until it lands; a held
//     suggestion names its write and is dropped by the picker's Cancel and by a tab switch — and a picker Cancel made while
//     the suggestion is still IN FLIGHT means its 403 raises ⛔ panel; the picker's states sit in ONE persistent
//     status region; the tabs are pressed buttons; a successful Start goes back to page 1; a 403 list hides Start.

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
    getKnownPeopleCampaigns: (p: string, q: unknown) => getKnownPeopleCampaigns(p, q),
    startKnownPeopleCampaign: (p: string, b: unknown) => startKnownPeopleCampaign(p, b),
    endKnownPeopleCampaign: (p: string, c: string) => endKnownPeopleCampaign(p, c),
    requestStepUp: (c: string) => requestStepUp(c),
    verifyStepUp: (o: string) => verifyStepUp(o),
  };
});

const { WorkplaceRequestsPage, workplaceRequestsEn: t, workplacesEn, campaignEn } = await import('../src/modules/workplaces/index.js');
const { ApiError } = await import('../src/api/client.js');
const { stepUpEn } = await import('../src/modules/workplaces/i18n-en.js');

/** A promise the test settles by hand — a write held IN FLIGHT. */
function deferred<T>(): { promise: Promise<T>; resolve: (v: T) => void } {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

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
      staleSuggestion: false,
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
    await waitFor(() => expect(screen.getByTestId('requests-saved')).toHaveTextContent(t.saved));
  });

  it('a 409 shows its words; close sends the request id', async () => {
    closeWorkplaceRequest.mockRejectedValue(new ApiError(409, 'workplace.request_closed', 'x'));
    mountPage();
    fireEvent.click(await screen.findByTestId(`request-close-${REQ}`));
    await waitFor(() => expect(closeWorkplaceRequest).toHaveBeenCalledWith(P, REQ));
    expect(await screen.findByTestId('requests-write-error')).toHaveTextContent(workplacesEn.errors['workplace.request_closed']);
  });
});

describe('<WorkplaceRequestsPage> — code review round 2', () => {
  it('a STALE suggestion (its workplace taken off the list) reads as pending, says so, and can be suggested again', async () => {
    getWorkplaceRequests.mockResolvedValue({ ...QUEUE, items: [{ ...QUEUE.items[0]!, state: 'pending', suggested: null, staleSuggestion: true }] });
    suggestWorkplaceForRequest.mockResolvedValue({ requestId: REQ, state: 'suggested' });
    mountPage();
    const card = await screen.findByTestId(`request-${REQ}`);
    expect(within(card).getByTestId(`request-stale-${REQ}`)).toHaveTextContent(t.staleSuggestion);
    fireEvent.click(within(card).getByTestId(`request-suggest-${REQ}`));
    fireEvent.click(await screen.findByTestId(`suggest-pick-${SCHOOL}`));
    await waitFor(() => expect(suggestWorkplaceForRequest).toHaveBeenCalledWith(P, REQ, SCHOOL));
  });

  it('⛔ the stale line on a request whose suggestion is still good (`staleSuggestion: false`)', async () => {
    mountPage();
    await screen.findByTestId(`request-${REQ}`);
    expect(screen.queryByTestId(`request-stale-${REQ}`)).toBeNull();
  });

  it('a filter change ⛔ resets an IN-FLIGHT suggestion; close, the picker and the campaign’s Start / End stay disabled until it lands', async () => {
    const write = deferred<{ requestId: string; state: 'suggested' }>();
    suggestWorkplaceForRequest.mockReturnValueOnce(write.promise);
    mountPage();
    fireEvent.click(await screen.findByTestId(`request-suggest-${REQ}`));
    fireEvent.click(await screen.findByTestId(`suggest-pick-${SCHOOL}`));
    await waitFor(() => expect(suggestWorkplaceForRequest).toHaveBeenCalledTimes(1));
    fireEvent.change(screen.getByTestId('requests-filter-district'), { target: { value: 'Patna' } });
    expect(screen.getByTestId(`request-close-${REQ}`)).toBeDisabled();
    expect(screen.getByTestId(`suggest-pick-${SCHOOL}`)).toBeDisabled();
    expect(screen.getByTestId('campaign-start')).toBeDisabled();
    expect(await screen.findByTestId(`campaign-end-${CAMPAIGN}`)).toBeDisabled();
    write.resolve({ requestId: REQ, state: 'suggested' });
    // The per-call `onSuccess` survived (⛔ detached by a reset): the picker closed and "Saved." shows.
    await waitFor(() => expect(screen.getByTestId('requests-saved')).toHaveTextContent(t.saved));
    await waitFor(() => expect(screen.queryByTestId('suggest-picker')).toBeNull());
    expect(screen.getByTestId('campaign-start')).toBeEnabled();
  });

  it('a held suggestion: other writes disabled; the picker’s Cancel drops it (⛔ re-sent after a verify)', async () => {
    suggestWorkplaceForRequest.mockRejectedValue(new ApiError(403, 'auth.step_up_required', 'x'));
    mountPage();
    fireEvent.click(await screen.findByTestId(`request-suggest-${REQ}`));
    fireEvent.click(await screen.findByTestId(`suggest-pick-${SCHOOL}`));
    expect(await screen.findByTestId('requests-step-up-held')).toHaveTextContent(stepUpEn.waiting(stepUpEn.held.suggest('GMS RAMPUR')));
    expect(screen.getByTestId(`request-close-${REQ}`)).toBeDisabled();
    expect(screen.getByTestId('campaign-start')).toBeDisabled();
    fireEvent.click(screen.getByTestId('suggest-picker-cancel'));
    await waitFor(() => expect(screen.queryByTestId('requests-step-up')).toBeNull());
    expect(screen.getByTestId(`request-close-${REQ}`)).toBeEnabled();
    expect(suggestWorkplaceForRequest).toHaveBeenCalledTimes(1);
  });

  it('a picker Cancel made while the suggestion is IN FLIGHT: its 403 raises ⛔ panel for the backed-out suggestion', async () => {
    let refuse!: (e: unknown) => void;
    suggestWorkplaceForRequest.mockReturnValueOnce(new Promise((_, r) => (refuse = r)));
    mountPage();
    fireEvent.click(await screen.findByTestId(`request-suggest-${REQ}`));
    fireEvent.click(await screen.findByTestId(`suggest-pick-${SCHOOL}`));
    await waitFor(() => expect(suggestWorkplaceForRequest).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByTestId('suggest-picker-cancel'));
    refuse(new ApiError(403, 'auth.step_up_required', 'x'));
    await waitFor(() => expect(screen.getByTestId(`request-close-${REQ}`)).toBeEnabled());
    expect(screen.queryByTestId('requests-step-up')).toBeNull();
  });

  it('a tab switch made while a close is IN FLIGHT: its 403 raises ⛔ panel', async () => {
    let refuse!: (e: unknown) => void;
    closeWorkplaceRequest.mockReturnValueOnce(new Promise((_, r) => (refuse = r)));
    mountPage();
    fireEvent.click(await screen.findByTestId(`request-close-${REQ}`));
    await waitFor(() => expect(closeWorkplaceRequest).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByTestId('requests-tab-suggested'));
    refuse(new ApiError(403, 'auth.step_up_required', 'x'));
    await waitFor(() => expect(screen.getByTestId('campaign-start')).toBeEnabled());
    expect(screen.queryByTestId('requests-step-up')).toBeNull();
  });

  it('a held close is dropped by a tab switch, and by the panel’s own Cancel', async () => {
    closeWorkplaceRequest.mockRejectedValue(new ApiError(403, 'auth.step_up_required', 'x'));
    mountPage();
    fireEvent.click(await screen.findByTestId(`request-close-${REQ}`));
    await screen.findByTestId('requests-step-up');
    fireEvent.click(screen.getByTestId('requests-step-up-cancel'));
    await waitFor(() => expect(screen.queryByTestId('requests-step-up')).toBeNull());
    fireEvent.click(screen.getByTestId(`request-close-${REQ}`));
    await screen.findByTestId('requests-step-up');
    fireEvent.click(screen.getByTestId('requests-tab-suggested'));
    await waitFor(() => expect(screen.queryByTestId('requests-step-up')).toBeNull());
    expect(closeWorkplaceRequest).toHaveBeenCalledTimes(2);
  });

  it('the picker’s states are ONE persistent status region (its text changes); the search is debounced and bounded', async () => {
    getAdminWorkplaces.mockResolvedValueOnce({
      items: [{ workplaceId: SCHOOL, kind: 'school', name: 'GMS RAMPUR', district: 'Patna', villageName: 'Rampur', blockCode: null, udiseSchoolCode: null, source: 'import', status: 'listed' }],
      nextCursor: 'more',
      hasMore: true,
    });
    getAdminWorkplaces.mockResolvedValue({ items: [], nextCursor: null, hasMore: false });
    mountPage();
    fireEvent.click(await screen.findByTestId(`request-suggest-${REQ}`));
    const region = await screen.findByTestId('suggest-picker-status');
    expect(region).toHaveAttribute('role', 'status');
    await waitFor(() => expect(region).toHaveTextContent(`${t.pickerResults(1)} ${t.pickerMore}`));
    const q = screen.getByTestId('suggest-picker-q');
    expect(q).toHaveAttribute('maxLength', '100');
    fireEvent.change(q, { target: { value: 'z' } });
    fireEvent.change(q, { target: { value: 'zz' } });
    // The SAME node (⛔ remounted) now says nothing matches.
    await waitFor(() => expect(screen.getByTestId('suggest-picker-status')).toHaveTextContent(t.pickerEmpty));
    expect(screen.getByTestId('suggest-picker-status')).toBe(region);
    const qs = getAdminWorkplaces.mock.calls.map((c) => (c[1] as { q?: string }).q);
    expect(qs).not.toContain('z');
    expect(screen.getByTestId('requests-filter-district')).toHaveAttribute('maxLength', '200');
  });

  it('page 2 → the other tab → back ⇒ the FIRST page’s request (⛔ the old cursor)', async () => {
    getWorkplaceRequests.mockResolvedValue({ ...QUEUE, nextCursor: 'page-2', hasMore: true });
    mountPage();
    fireEvent.click(await screen.findByTestId('requests-next'));
    await waitFor(() => expect(getWorkplaceRequests).toHaveBeenLastCalledWith(P, { state: 'pending', cursor: 'page-2' }));
    fireEvent.click(screen.getByTestId('requests-tab-suggested'));
    await waitFor(() => expect(getWorkplaceRequests).toHaveBeenLastCalledWith(P, { state: 'suggested' }));
    getWorkplaceRequests.mockClear();
    fireEvent.click(screen.getByTestId('requests-tab-pending'));
    await waitFor(() => expect(getWorkplaceRequests).toHaveBeenCalledWith(P, { state: 'pending' }));
    expect(getWorkplaceRequests).not.toHaveBeenCalledWith(P, { state: 'pending', cursor: 'page-2' });
  });

  it('the tabs are pressed buttons (`aria-pressed`), ⛔ half a tab widget', async () => {
    mountPage();
    await screen.findByTestId(`request-${REQ}`);
    expect(screen.queryByRole('tab')).toBeNull();
    expect(screen.getByTestId('requests-tab-pending')).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByTestId('requests-tab-suggested'));
    expect(screen.getByTestId('requests-tab-suggested')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('requests-tab-pending')).toHaveAttribute('aria-pressed', 'false');
  });
});

describe('<CampaignControl> — code review round 2', () => {
  it('a successful Start goes back to the FIRST page of the list', async () => {
    getKnownPeopleCampaigns.mockResolvedValue({ ...CAMPAIGNS, nextCursor: 'page-2', hasMore: true });
    startKnownPeopleCampaign.mockResolvedValue({ campaign: { ...CAMPAIGNS.items[0]!, campaignId: '99999999-9999-4999-8999-999999999999', status: 'scheduled' } });
    mountPage();
    fireEvent.click(await screen.findByTestId('campaign-next'));
    await waitFor(() => expect(getKnownPeopleCampaigns).toHaveBeenLastCalledWith(P, { cursor: 'page-2' }));
    const control = screen.getByTestId('campaign-control');
    fireEvent.change(within(control).getByTestId('campaign-starts-on'), { target: { value: '2026-10-21' } });
    fireEvent.change(within(control).getByTestId('campaign-ends-on'), { target: { value: '2026-10-25' } });
    fireEvent.click(within(control).getByTestId('campaign-start'));
    await waitFor(() => expect(startKnownPeopleCampaign).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(getKnownPeopleCampaigns).toHaveBeenLastCalledWith(P, {}));
    await waitFor(() => expect(screen.getByTestId('campaign-saved')).toHaveTextContent(campaignEn.saved));
  });

  it('a list answered 403 hides the Start form (a Start could only 403 too)', async () => {
    getKnownPeopleCampaigns.mockRejectedValue(new ApiError(403, 'auth.forbidden', 'x'));
    mountPage();
    expect(await screen.findByTestId('campaign-load-error')).toHaveTextContent(campaignEn.forbidden);
    expect(screen.queryByTestId('campaign-start')).toBeNull();
  });

  it('the intro describes `-342` call 1’s audience (a free slot; asked nobody since it began)', async () => {
    mountPage();
    const control = await screen.findByTestId('campaign-control');
    expect(control).toHaveTextContent(/room for one more person/);
    expect(control).toHaveTextContent(/asked nobody since the campaign began/);
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
