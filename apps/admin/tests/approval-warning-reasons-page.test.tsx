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
  // `data-params` — the mock used to DROP `params`, so no test proved the Pariwar id was wired in (code review round 3).
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
const { verifierConsoleKey } = await import('../src/api/hooks.js');

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

function mountPage(): QueryClient {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <ApprovalWarningReasonsPage pariwarId={P} />
    </QueryClientProvider>,
  );
  return qc;
}

/** Fill a form and submit it. */
function submitForm(form: 'reason-add-form' | 'reason-replace-form', label: string, whenToUse: string): void {
  fireEvent.change(screen.getByTestId(`${form}-label`), { target: { value: label } });
  fireEvent.change(screen.getByTestId(`${form}-when-to-use`), { target: { value: whenToUse } });
  fireEvent.click(screen.getByTestId(`${form}-submit`));
}

const STEP_UP = () => new ApiError(403, 'auth.step_up_required', 'x');

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
    // Re-review 2026-10-05's fix, first tested in round 3: the Add form CLEARS after a success.
    expect((screen.getByTestId('reason-add-form-label') as HTMLInputElement).value).toBe('');
  });

  it('code review round 3 — a saved reason (ADD and REPLACE — round 4) also REFRESHES the Pariwar\'s cached consoles — ⛔ never another Pariwar\'s', async () => {
    addApprovalWarningReason.mockResolvedValue({ reason: LIST.active[1], replacedReasonId: null });
    replaceApprovalWarningReason.mockResolvedValue({ reason: LIST.active[1], replacedReasonId: LIST.active[1]!.reasonId });
    const qc = mountPage();
    // The REAL key builder (round 4 — round 3 hand-built the key, so a changed key shape would have stayed green).
    const own = verifierConsoleKey(P, 'claim-a');
    const other = verifierConsoleKey('77777777-7777-4777-8777-777777777777', 'claim-b');
    const seed = () => {
      qc.setQueryData(own, { packet: {} });
      qc.setQueryData(other, { packet: {} });
    };
    seed();
    await screen.findByTestId('reason-add-form');
    submitForm('reason-add-form', 'New reason', 'Use when new.');
    await waitFor(() => expect(qc.getQueryState(own)?.isInvalidated).toBe(true));
    expect(qc.getQueryState(other)?.isInvalidated).toBe(false);
    seed(); // fresh, un-invalidated entries — now through REPLACE (its `onSettled`)
    fireEvent.click(screen.getByTestId('reason-replace-awr_0a1b2c3d'));
    submitForm('reason-replace-form', 'Newer words', 'Newer note.');
    await waitFor(() => expect(qc.getQueryState(own)?.isInvalidated).toBe(true));
    expect(qc.getQueryState(other)?.isInvalidated).toBe(false);
  });

  it('⭐ family 13(d) (code review round 3) — "Saved." is ANNOUNCED: the status region is mounted EMPTY, and its TEXT changes', async () => {
    addApprovalWarningReason.mockResolvedValue({ reason: LIST.active[1], replacedReasonId: null });
    mountPage();
    await screen.findByTestId('reason-add-form');
    const region = screen.getByTestId('reasons-saved');
    expect(region.getAttribute('role')).toBe('status');
    expect(region.textContent).toBe('');
    submitForm('reason-add-form', 'New reason', 'Use when new.');
    await waitFor(() => expect(region.textContent).toBe(t.saved));
    expect(screen.getByTestId('reasons-saved')).toBe(region);
  });

  it('code review round 3 — the limit counts CODE POINTS: 120 emoji are accepted (⛔ never cut by a UTF-16 `maxLength`), 121 are refused in words', async () => {
    addApprovalWarningReason.mockResolvedValue({ reason: LIST.active[1], replacedReasonId: null });
    mountPage();
    await screen.findByTestId('reason-add-form');
    // BOTH fields (round 4 — round 3 pinned only the label's).
    expect(screen.getByTestId('reason-add-form-label').hasAttribute('maxLength')).toBe(false);
    expect(screen.getByTestId('reason-add-form-when-to-use').hasAttribute('maxLength')).toBe(false);
    submitForm('reason-add-form', '🙏'.repeat(121), 'ok');
    expect(screen.getByTestId('reason-add-form-missing')).toHaveTextContent(t.tooLong);
    submitForm('reason-add-form', 'ok', '🙏'.repeat(1001));
    expect(screen.getByTestId('reason-add-form-missing')).toHaveTextContent(t.tooLong);
    expect(addApprovalWarningReason).not.toHaveBeenCalled();
    submitForm('reason-add-form', '🙏'.repeat(120), '🙏'.repeat(1000));
    await waitFor(() => expect(addApprovalWarningReason).toHaveBeenCalledWith(P, { label: '🙏'.repeat(120), when_to_use: '🙏'.repeat(1000) }));
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

  it('⭐⭐ code review round 3 — a CANCELLED replace is ⛔ never sent after the step-up; the step-up closes with it', async () => {
    replaceApprovalWarningReason.mockRejectedValue(STEP_UP());
    requestStepUp.mockResolvedValue({ sent: true });
    verifyStepUp.mockResolvedValue({ verified: true });
    mountPage();
    fireEvent.click(await screen.findByTestId('reason-replace-awr_0a1b2c3d'));
    submitForm('reason-replace-form', 'Newer words', 'Newer note.');
    expect(await screen.findByTestId('reasons-step-up')).toBeInTheDocument();
    fireEvent.click(screen.getByText(t.cancel));
    expect(screen.queryByTestId('reasons-step-up')).toBeNull();
    expect(replaceApprovalWarningReason).toHaveBeenCalledTimes(1);
  });

  it('⭐⭐ code review round 3 — an Add EDITED after the step-up 403 drops the old retry: verify sends ⛔ nothing old; the edited text is submitted afresh', async () => {
    addApprovalWarningReason.mockRejectedValueOnce(STEP_UP()).mockResolvedValue({ reason: LIST.active[1], replacedReasonId: null });
    mountPage();
    await screen.findByTestId('reason-add-form');
    submitForm('reason-add-form', 'First text', 'First note.');
    expect(await screen.findByTestId('reasons-step-up')).toBeInTheDocument();
    fireEvent.change(screen.getByTestId('reason-add-form-label'), { target: { value: 'Edited text' } });
    expect(screen.queryByTestId('reasons-step-up')).toBeNull();
    fireEvent.click(screen.getByTestId('reason-add-form-submit'));
    await waitFor(() => expect(addApprovalWarningReason).toHaveBeenCalledTimes(2));
    expect(addApprovalWarningReason).toHaveBeenLastCalledWith(P, { label: 'Edited text', when_to_use: 'First note.' });
  });

  it('family 13(d) (code review round 3) — the step-up prompt is an ALERT; each failure says WHY (round 4: keyed to the status)', async () => {
    addApprovalWarningReason.mockRejectedValue(STEP_UP());
    requestStepUp
      .mockRejectedValueOnce(new ApiError(503, 'unavailable', 'x'))
      .mockRejectedValueOnce(new ApiError(429, 'auth.rate_limited', 'x'))
      .mockResolvedValue({ sent: true });
    verifyStepUp.mockRejectedValueOnce(new ApiError(400, 'auth.step_up_invalid', 'x')).mockRejectedValueOnce(new ApiError(503, 'unavailable', 'x'));
    mountPage();
    await screen.findByTestId('reason-add-form');
    submitForm('reason-add-form', 'New reason', 'Use when new.');
    const block = await screen.findByTestId('reasons-step-up');
    expect(block.querySelector('[role="alert"]')?.textContent).toBe(t.stepUpIntro);
    fireEvent.click(screen.getByText(t.stepUpSend));
    expect(await screen.findByTestId('reasons-step-up-send-error')).toHaveTextContent(t.stepUpSendError);
    fireEvent.click(screen.getByText(t.stepUpSend));
    // ⛔ Never "send it again" on a rate limit.
    await waitFor(() => expect(screen.getByTestId('reasons-step-up-send-error')).toHaveTextContent(t.stepUpSendRateLimited));
    fireEvent.click(screen.getByText(t.stepUpSend));
    fireEvent.change(await screen.findByLabelText(t.stepUpCode), { target: { value: '000000' } });
    fireEvent.click(screen.getByText(t.stepUpVerify));
    expect(await screen.findByTestId('reasons-step-up-verify-error')).toHaveTextContent(t.stepUpVerifyError);
    fireEvent.click(screen.getByText(t.stepUpVerify));
    // ⛔ Never "not accepted" when the server never judged the code.
    await waitFor(() => expect(screen.getByTestId('reasons-step-up-verify-error')).toHaveTextContent(t.stepUpVerifyUnavailable));
    expect(addApprovalWarningReason).toHaveBeenCalledTimes(1);
  });

  it('⭐ code review round 4 — after a refused replace auto-closes, a SUCCESSFUL add says "Saved." and ⛔ never shows the old refusal', async () => {
    replaceApprovalWarningReason.mockRejectedValue(new ApiError(409, 'approval_warning_reason.already_replaced', 'x'));
    addApprovalWarningReason.mockResolvedValue({ reason: LIST.active[1], replacedReasonId: null });
    mountPage();
    fireEvent.click(await screen.findByTestId('reason-replace-awr_0a1b2c3d'));
    submitForm('reason-replace-form', 'Newer words', 'Newer note.');
    expect(await screen.findByTestId('reasons-write-error')).toHaveTextContent(t.errors.already_replaced);
    submitForm('reason-add-form', 'A fresh reason', 'Use when fresh.');
    await waitFor(() => expect(screen.getByTestId('reasons-saved')).toHaveTextContent(t.saved));
    expect(screen.queryByTestId('reasons-write-error')).toBeNull();
  });

  it('code review round 4 — a past success does ⛔ not keep "Saved." up over a NEW attempt waiting on a step-up', async () => {
    replaceApprovalWarningReason.mockResolvedValue({ reason: LIST.active[1], replacedReasonId: LIST.active[1]!.reasonId });
    addApprovalWarningReason.mockRejectedValue(STEP_UP());
    mountPage();
    fireEvent.click(await screen.findByTestId('reason-replace-awr_0a1b2c3d'));
    submitForm('reason-replace-form', 'Newer words', 'Newer note.');
    await waitFor(() => expect(screen.getByTestId('reasons-saved')).toHaveTextContent(t.saved));
    submitForm('reason-add-form', 'Another', 'Use when another.');
    expect(await screen.findByTestId('reasons-step-up')).toBeInTheDocument();
    expect(screen.getByTestId('reasons-saved').textContent).toBe('');
  });

  it('code review round 4 — the alert CLEARS once the text is edited; both fields say they are required and point at it', async () => {
    mountPage();
    await screen.findByTestId('reason-add-form');
    const label = screen.getByTestId('reason-add-form-label');
    const whenToUse = screen.getByTestId('reason-add-form-when-to-use');
    for (const field of [label, whenToUse]) expect(field.getAttribute('aria-required')).toBe('true');
    submitForm('reason-add-form', '🙏'.repeat(121), 'ok');
    const alert = screen.getByTestId('reason-add-form-missing');
    for (const field of [label, whenToUse]) {
      expect(field.getAttribute('aria-invalid')).toBe('true');
      expect(field.getAttribute('aria-describedby')).toBe(alert.id);
    }
    fireEvent.change(label, { target: { value: 'Short now' } });
    expect(screen.queryByTestId('reason-add-form-missing')).toBeNull();
    expect(label.getAttribute('aria-invalid')).toBeNull();
  });

  it('code review round 3 — `already_replaced` CLOSES the replace form (⛔ never a resubmit of the same dead id) and keeps its words', async () => {
    replaceApprovalWarningReason.mockRejectedValue(new ApiError(409, 'approval_warning_reason.already_replaced', 'x'));
    mountPage();
    fireEvent.click(await screen.findByTestId('reason-replace-awr_0a1b2c3d'));
    submitForm('reason-replace-form', 'Newer words', 'Newer note.');
    expect(await screen.findByTestId('reasons-write-error')).toHaveTextContent(t.errors.already_replaced);
    expect(screen.queryByTestId('reason-replace-form')).toBeNull();
    expect(screen.getByTestId('reason-add-form')).toBeInTheDocument();
  });

  it('code review round 3 — a FAILED background refetch keeps the page, the open form and its text (⛔ never the load error over cached data)', async () => {
    const qc = mountPage();
    fireEvent.click(await screen.findByTestId('reason-replace-awr_0a1b2c3d'));
    fireEvent.change(screen.getByTestId('reason-replace-form-label'), { target: { value: 'Half typed' } });
    getApprovalWarningReasons.mockRejectedValue(new ApiError(503, 'unavailable', 'x'));
    await qc.refetchQueries();
    await waitFor(() => expect(qc.getQueryState(['approval-warning-reasons', P])?.status).toBe('error'));
    expect(screen.queryByTestId('reasons-load-error')).toBeNull();
    expect((screen.getByTestId('reason-replace-form-label') as HTMLInputElement).value).toBe('Half typed');
  });

  it('code review round 3 — the missing display name the handler ACTUALLY sends is shown in its own words; switching forms clears a banner', async () => {
    addApprovalWarningReason.mockRejectedValue(new ApiError(409, 'admin.display_name_missing', 'x'));
    mountPage();
    await screen.findByTestId('reason-add-form');
    submitForm('reason-add-form', 'New reason', 'Use when new.');
    expect(await screen.findByTestId('reasons-write-error')).toHaveTextContent(t.displayNameMissing);
    fireEvent.click(screen.getByTestId('reason-replace-awr_0a1b2c3d'));
    expect(screen.queryByTestId('reasons-write-error')).toBeNull();
  });

  it('a vocabulary refusal is shown in words', async () => {
    addApprovalWarningReason.mockRejectedValue(new ApiError(400, 'approval_warning_reason.invalid_text', 'x'));
    mountPage();
    await screen.findByTestId('reason-add-form');
    fireEvent.change(screen.getByTestId('reason-add-form-label'), { target: { value: 'x' } });
    fireEvent.change(screen.getByTestId('reason-add-form-when-to-use'), { target: { value: 'y' } });
    fireEvent.click(screen.getByTestId('reason-add-form-submit'));
    expect(await screen.findByTestId('reasons-write-error')).toHaveTextContent(t.errors.invalid_text);
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
    const link = await screen.findByTestId('nav-approval-warning-reasons');
    expect(link).toHaveAttribute('href', '/p/$pariwarId/approval-warning-reasons');
    expect(link).toHaveAttribute('data-params', JSON.stringify({ pariwarId: P }));
  });

  it('⛔ without the grant ⇒ hidden; ⛔ outside a Pariwar ⇒ hidden', async () => {
    params = { pariwarId: P };
    grants = [];
    const a = setup();
    await screen.findByTestId('nav-certificate-reminders');
    expect(screen.queryByTestId('nav-approval-warning-reasons')).toBeNull();
    a.unmount();
    params = {};
    // A national link that renders OUTSIDE a Pariwar proves the session has LOADED before absence is asserted — a bare
    // `waitFor(toBeNull)` passed on its first tick, before the session resolved (code review round 3).
    grants = ['approval_warning_reason.manage', 'claim.review_escalated_closure'];
    setup();
    await screen.findByTestId('nav-escalations-top');
    expect(screen.queryByTestId('nav-approval-warning-reasons')).toBeNull();
  });
});
