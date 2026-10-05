// Story 6.23a (Task 11; NW17; AC12) — the Super Admin's WARNING-REASON LIST page and its nav link.
//   · the page: the active list (the built-in generic first, ⛔ no replace control on it), the history, the plain
//     "replaced, never edited or deleted" line, ⛔ no edit and ⛔ no delete control; add and replace send the words;
//     a step-up-required 403 opens the verification step and the write re-runs after it;
//   · the nav link: ONLY inside a Pariwar context AND only on the national grant (two gates — advisory).
// The network is the only thing faked (`api/client.js` mocked per function); the real hooks and components run.

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApprovalWarningReasonListResponse } from '@twt/contracts';

let params: Record<string, string> = {};
vi.mock('@tanstack/react-router', () => ({
  Link: (p: { children: ReactNode; to: string; 'data-testid'?: string }) => (
    <a href={p.to} data-testid={p['data-testid']}>
      {p.children}
    </a>
  ),
  Outlet: () => null,
  useNavigate: () => vi.fn(),
  useParams: () => params,
  useRouter: () => ({ invalidate: vi.fn() }),
}));

let grants: string[] = [];
const getApprovalWarningReasons = vi.fn();
const addApprovalWarningReason = vi.fn();
const replaceApprovalWarningReason = vi.fn();
const requestStepUp = vi.fn();
const verifyStepUp = vi.fn();
vi.mock('../src/api/client.js', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    getSession: async () => ({ userId: '11111111-1111-4111-8111-111111111111', nationalGrants: grants }),
    getApprovalWarningReasons: (p: string) => getApprovalWarningReasons(p),
    addApprovalWarningReason: (p: string, b: unknown) => addApprovalWarningReason(p, b),
    replaceApprovalWarningReason: (p: string, id: string, b: unknown) => replaceApprovalWarningReason(p, id, b),
    requestStepUp: (c: string) => requestStepUp(c),
    verifyStepUp: (o: string) => verifyStepUp(o),
  };
});

const { RootLayout } = await import('../src/routes/RootLayout.js');
const { ApprovalWarningReasonsPage, approvalWarningReasonsEn: t } = await import('../src/modules/approval-warning-reasons/index.js');
const { ApiError } = await import('../src/api/client.js');

const P = '44444444-4444-4444-8444-444444444444';
const LIST: ApprovalWarningReasonListResponse = {
  active: [
    {
      code: 'warnings_reviewed',
      reasonId: null,
      label: 'Warnings reviewed — approved despite them',
      whenToUse: 'Use when you have read every warning shown and still approve. Your note must say why.',
      addedByDisplay: null,
      addedAt: null,
      replacesLabel: null,
    },
    {
      code: 'awr_0a1b2c3d',
      reasonId: '55555555-5555-4555-8555-555555555555',
      label: 'Family confirmed in person',
      whenToUse: 'Use when the inspector met the family.',
      addedByDisplay: 'Sunita (Super Admin)',
      addedAt: '2026-09-01T06:00:00.000Z',
      replacesLabel: 'Seen',
    },
  ],
  history: [
    {
      code: 'awr_99999999',
      reasonId: '66666666-6666-4666-8666-666666666666',
      label: 'Seen',
      whenToUse: 'Old note.',
      addedByDisplay: 'Sunita (Super Admin)',
      addedAt: '2026-08-01T06:00:00.000Z',
      replacedAt: '2026-09-01T06:00:00.000Z',
      replacedByLabel: 'Family confirmed in person',
      replacedByDisplay: 'Sunita (Super Admin)',
    },
  ],
};

function mountPage(): void {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
      <ApprovalWarningReasonsPage pariwarId={P} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  for (const f of [getApprovalWarningReasons, addApprovalWarningReason, replaceApprovalWarningReason, requestStepUp, verifyStepUp]) f.mockReset();
  getApprovalWarningReasons.mockResolvedValue(LIST);
});

describe('<ApprovalWarningReasonsPage> (AC12)', () => {
  it('⭐ shows the active list (the generic first, ⛔ not replaceable), the history, and the "never edited or deleted" line — ⛔ no edit or delete control', async () => {
    mountPage();
    expect(await screen.findByTestId('reasons-never-edited')).toHaveTextContent(t.neverEdited);
    expect(screen.getByTestId('reason-warnings_reviewed')).toHaveTextContent(t.builtIn);
    expect(screen.queryByTestId('reason-replace-warnings_reviewed')).toBeNull();
    expect(screen.getByTestId('reason-awr_0a1b2c3d')).toHaveTextContent('Replaces “Seen”');
    expect(screen.getByTestId('reason-history-awr_99999999')).toHaveTextContent('Replaced by “Family confirmed in person” (Sunita (Super Admin))');
    // ⛔ No CONTROL edits or deletes (the "never edited or deleted" sentence itself is the page's own words).
    expect(screen.queryByRole('button', { name: /delete|remove|edit/i })).toBeNull();
  });

  it('add sends the words; both fields are needed', async () => {
    addApprovalWarningReason.mockResolvedValue({ reason: LIST.active[1], replacedReasonId: null });
    mountPage();
    await screen.findByTestId('reason-add-form');
    fireEvent.click(screen.getByTestId('reason-add-form-submit'));
    expect(screen.getByTestId('reason-add-form-missing')).toHaveTextContent(t.required);
    fireEvent.change(screen.getByTestId('reason-add-form-label'), { target: { value: 'New reason' } });
    fireEvent.change(screen.getByTestId('reason-add-form-when-to-use'), { target: { value: 'Use when new.' } });
    fireEvent.click(screen.getByTestId('reason-add-form-submit'));
    await waitFor(() => expect(addApprovalWarningReason).toHaveBeenCalledWith(P, { label: 'New reason', when_to_use: 'Use when new.' }));
    expect(await screen.findByTestId('reasons-saved')).toHaveTextContent(t.saved);
  });

  it('⭐ a step-up-required 403 opens the verification step; after verify the replace RE-RUNS', async () => {
    replaceApprovalWarningReason
      .mockRejectedValueOnce(new ApiError(403, 'auth.step_up_required', 'x'))
      .mockResolvedValueOnce({ reason: LIST.active[1], replacedReasonId: LIST.active[1]!.reasonId });
    requestStepUp.mockResolvedValue({ sent: true });
    verifyStepUp.mockResolvedValue({ verified: true });
    mountPage();
    fireEvent.click(await screen.findByTestId('reason-replace-awr_0a1b2c3d'));
    fireEvent.change(screen.getByTestId('reason-replace-form-label'), { target: { value: 'Newer words' } });
    fireEvent.change(screen.getByTestId('reason-replace-form-when-to-use'), { target: { value: 'Newer note.' } });
    fireEvent.click(screen.getByTestId('reason-replace-form-submit'));
    expect(await screen.findByTestId('reasons-step-up')).toBeInTheDocument();
    fireEvent.click(screen.getByText(t.stepUpSend));
    await waitFor(() => expect(requestStepUp).toHaveBeenCalledWith('approval_warning_reason_manage'));
    fireEvent.change(await screen.findByLabelText(t.stepUpCode), { target: { value: '123456' } });
    fireEvent.click(screen.getByText(t.stepUpVerify));
    await waitFor(() => expect(replaceApprovalWarningReason).toHaveBeenCalledTimes(2));
    expect(replaceApprovalWarningReason).toHaveBeenLastCalledWith(P, LIST.active[1]!.reasonId, { label: 'Newer words', when_to_use: 'Newer note.' });
  });

  it('a vocabulary refusal is shown in words', async () => {
    addApprovalWarningReason.mockRejectedValue(new ApiError(400, 'approval_warning_reason.invalid_text', 'x'));
    mountPage();
    await screen.findByTestId('reason-add-form');
    fireEvent.change(screen.getByTestId('reason-add-form-label'), { target: { value: 'x' } });
    fireEvent.change(screen.getByTestId('reason-add-form-when-to-use'), { target: { value: 'y' } });
    fireEvent.click(screen.getByTestId('reason-add-form-submit'));
    expect(await screen.findByTestId('reasons-write-error')).toHaveTextContent(t.errors.invalid_text!);
  });
});

describe('the warning-reasons nav link — TWO gates (NW17)', () => {
  const setup = () =>
    render(
      <QueryClientProvider client={new QueryClient()}>
        <RootLayout />
      </QueryClientProvider>,
    );

  it('⭐ inside a Pariwar AND on the national grant ⇒ shown', async () => {
    params = { pariwarId: P };
    grants = ['approval_warning_reason.manage'];
    setup();
    expect(await screen.findByTestId('nav-approval-warning-reasons')).toHaveAttribute('href', '/p/$pariwarId/approval-warning-reasons');
  });

  it('⛔ without the grant ⇒ hidden; ⛔ outside a Pariwar ⇒ hidden', async () => {
    params = { pariwarId: P };
    grants = [];
    const a = setup();
    await screen.findByTestId('nav-certificate-reminders');
    expect(screen.queryByTestId('nav-approval-warning-reasons')).toBeNull();
    a.unmount();
    params = {};
    grants = ['approval_warning_reason.manage'];
    setup();
    await waitFor(() => expect(screen.queryByTestId('nav-approval-warning-reasons')).toBeNull());
  });
});
