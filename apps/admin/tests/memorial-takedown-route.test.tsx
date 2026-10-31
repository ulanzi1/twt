// Story 11b.4a, code review R9 (b) — the drive route MOUNTED. The page's state (the ticked "I called the nominee back", the
// first-contact time, the OTP, the confirm step, the Idempotency-Keys) belongs to ONE drive; a history jump between two drive
// URLs re-renders the SAME page with a new `poolId`, so without `key={poolId}` it all carried into the other drive.
// The router is faked and the network is faked; the route, the gate, the hooks and the page are the real ones.

import { QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { MemorialTakedownDriveResponse } from '@twt/contracts';
import type { ReactElement, ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const PARIWAR = '44444444-4444-4444-8444-444444444444';
const PARIWAR_B = '99999999-9999-4999-8999-999999999999';
const POOL_A = '55555555-5555-4555-8555-55555555555a';
const POOL_B = '55555555-5555-4555-8555-55555555555b';

const routeParams = vi.hoisted(() => ({ pariwarId: '44444444-4444-4444-8444-444444444444', poolId: '55555555-5555-4555-8555-55555555555a' }));
vi.mock('@tanstack/react-router', () => ({
  Link: (p: { children: ReactNode; to: string }) => <a href={p.to}>{p.children}</a>,
  useNavigate: () => vi.fn(),
  useParams: () => ({ pariwarId: routeParams.pariwarId, poolId: routeParams.poolId }),
}));

vi.mock('../src/api/client.js', async () => {
  const actual = await vi.importActual<typeof import('../src/api/client.js')>('../src/api/client.js');
  return { ...actual, getSession: vi.fn(), getMemorialTakedownDrive: vi.fn(), listOpenMemorialTakedownRequests: vi.fn() };
});

import * as api from '../src/api/client.js';
import { createQueryClient } from '../src/api/hooks.js';
import { MemorialTakedownDriveRoute, MemorialTakedownRoute } from '../src/routes/MemorialTakedownRoute.js';

function drive(poolId: string, identifier: string): MemorialTakedownDriveResponse {
  return {
    poolId,
    poolCanonicalIdentifier: identifier,
    memorialState: 'approved_with_omissions',
    shown: {
      submissionId: '77777777-7777-4777-8777-777777777777',
      sentAt: '2026-10-20T10:00:00.000Z',
      words: ['माँ हमेशा मुस्कुराती थीं।'],
      hasPhoto: false,
      photoUrl: null,
      altText: null,
      kinship: [],
    },
    nomineeToCallBack: { name: 'Asha Devi', mobile: '+919876543210' },
    smallerFix: 'send_now',
    currentNominee: { name: 'Asha Devi', isNomineeToCallBack: true },
    requests: [],
  };
}

afterEach(() => cleanup());
beforeEach(() => {
  vi.mocked(api.getSession).mockReset();
  vi.mocked(api.getMemorialTakedownDrive).mockReset();
  vi.mocked(api.listOpenMemorialTakedownRequests).mockReset();
  routeParams.pariwarId = PARIWAR;
  vi.mocked(api.listOpenMemorialTakedownRequests).mockResolvedValue({ requests: [] });
  vi.mocked(api.getSession).mockResolvedValue({ userId: '33333333-3333-4333-8333-333333333333', nationalGrants: [] } as never);
  vi.mocked(api.getMemorialTakedownDrive).mockImplementation(async (_pariwar, poolId) =>
    poolId === POOL_A ? drive(POOL_A, 'P-2026-10-001') : drive(POOL_B, 'P-2026-10-002'),
  );
});

describe('R9 (b) — the drive route keys the page on the drive', () => {
  it('moving from one drive to another starts from a clean page: the ticked attestation and the first-contact time do not travel', async () => {
    routeParams.poolId = POOL_A;
    const client = createQueryClient();
    const tree = (): ReactElement => (
      <QueryClientProvider client={client}>
        <MemorialTakedownDriveRoute />
      </QueryClientProvider>
    );
    const { rerender } = render(tree());

    const formA = await screen.findByTestId('takedown-record');
    expect(await screen.findByRole('heading', { name: 'P-2026-10-001' })).toBeInTheDocument();
    fireEvent.click(within(formA).getByRole('checkbox'));
    fireEvent.change(within(formA).getByLabelText(/When the nominee first asked/), { target: { value: '2020-01-02T03:04' } });
    expect(within(formA).getByRole('checkbox')).toBeChecked();

    routeParams.poolId = POOL_B;
    rerender(tree());

    expect(await screen.findByRole('heading', { name: 'P-2026-10-002' })).toBeInTheDocument();
    await waitFor(() => expect(api.getMemorialTakedownDrive).toHaveBeenCalledWith(PARIWAR, POOL_B));
    const formB = screen.getByTestId('takedown-record');
    expect(within(formB).getByRole('checkbox')).not.toBeChecked();
    expect(within(formB).getByLabelText(/When the nominee first asked/)).not.toHaveValue('2020-01-02T03:04');
  });
});

describe('RR7 — the pages are scoped to the Pariwar they were opened in', () => {
  it('moving to another Pariwar starts the member lookup clean: the typed mobile does not travel', async () => {
    routeParams.pariwarId = PARIWAR;
    const client = createQueryClient();
    const tree = (): ReactElement => (
      <QueryClientProvider client={client}>
        <MemorialTakedownRoute />
      </QueryClientProvider>
    );
    const { rerender } = render(tree());
    const mobile = await screen.findByTestId('takedown-lookup-mobile');
    fireEvent.change(mobile, { target: { value: '9876543210' } });
    expect(mobile).toHaveValue('9876543210');

    routeParams.pariwarId = PARIWAR_B;
    rerender(tree());

    await waitFor(() => expect(api.listOpenMemorialTakedownRequests).toHaveBeenCalledWith(PARIWAR_B));
    expect(await screen.findByTestId('takedown-lookup-mobile')).toHaveValue('');
  });

  it('the same pool id under another Pariwar is a DIFFERENT drive page: the ticked attestation does not travel', async () => {
    routeParams.poolId = POOL_A;
    routeParams.pariwarId = PARIWAR;
    const client = createQueryClient();
    const tree = (): ReactElement => (
      <QueryClientProvider client={client}>
        <MemorialTakedownDriveRoute />
      </QueryClientProvider>
    );
    const { rerender } = render(tree());
    const form = await screen.findByTestId('takedown-record');
    fireEvent.click(within(form).getByRole('checkbox'));
    expect(within(form).getByRole('checkbox')).toBeChecked();

    routeParams.pariwarId = PARIWAR_B;
    rerender(tree());

    await waitFor(() => expect(api.getMemorialTakedownDrive).toHaveBeenCalledWith(PARIWAR_B, POOL_A));
    expect(within(await screen.findByTestId('takedown-record')).getByRole('checkbox')).not.toBeChecked();
  });
});
