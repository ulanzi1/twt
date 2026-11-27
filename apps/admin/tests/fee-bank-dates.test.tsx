// Story 6.39a (Task 5; AC12; DL10, DL11) — the finance officer's bank-date page, and the console's new lines.
//
// ⭐ The load-bearing ones:
//   · the page lists the held claims — the RECORDED date, the amount, the reference's LAST FOUR — and ⛔ a name, ⛔ the date
//     of death, ⛔ the check's fee outcome; its empty, cut-list and no-access lines; the SECOND section only when non-empty,
//     under its own heading; the nav link inside a Pariwar context;
//   · the form refuses incomplete input in words BEFORE anything is sent; each `fee_bank_date.*` refusal is its approved
//     line (⛔ a raw code); `stale` reloads the list; a 403 `auth.step_up_required` HOLDS the write and the shared
//     `StepUpPanel` re-sends the SAME body;
//   · the console control: the AMENDED note only under a blocking RECORDED date (its words say "Record the check" BEFORE
//     "ask the finance officer"), today's note under a blocking BANK date, the bank line when the bank is used; the
//     `bank_date_changed` / `same_person` words; each of the three gate maps shows `bank_date_recorded`'s OWN sentence.
// The network is the only thing faked (`api/client.js`, function by function). DL11's words are pinned HERE as literals,
// so a reword of the copy file fails this test.

import { randomUUID } from 'node:crypto';

import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor, within } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FEE_BANK_DATE_REFUSAL_REASONS, FEE_BANK_DATE_STEP_UP_CONTEXT } from '@twt/contracts';
import type { FeeBankDateListResponse, FeeBankDateListRow, MembershipCheckGateStatus, MembershipCheckPreviewResponse } from '@twt/contracts';

let params: Record<string, string> = {};
const navigate = vi.fn();
vi.mock('@tanstack/react-router', () => ({
  // The mocked Link carries `params` too, so the nav leg can prove the Pariwar id is passed (code review 2026-11-27).
  Link: (p: { children: ReactNode; to: string; params?: Record<string, string>; 'data-testid'?: string }) => (
    <a href={p.to} data-params={JSON.stringify(p.params ?? {})} data-testid={p['data-testid']}>
      {p.children}
    </a>
  ),
  Outlet: () => null,
  useNavigate: () => navigate,
  useParams: () => params,
  useRouter: () => ({ invalidate: vi.fn() }),
}));

const getFeeBankDates = vi.fn();
const postFeeBankDate = vi.fn();
const postMembershipCheck = vi.fn();
const requestStepUp = vi.fn();
const verifyStepUp = vi.fn();
vi.mock('../src/api/client.js', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    getSession: async () => ({ userId: '11111111-1111-4111-8111-111111111111', nationalGrants: [] }),
    getFeeBankDates: (...a: unknown[]) => getFeeBankDates(...a),
    postFeeBankDate: (...a: unknown[]) => postFeeBankDate(...a),
    postMembershipCheck: (...a: unknown[]) => postMembershipCheck(...a),
    requestStepUp: (...a: unknown[]) => requestStepUp(...a),
    verifyStepUp: (...a: unknown[]) => verifyStepUp(...a),
  };
});

const { ApiError } = await import('../src/api/client.js');
const { MEMBERSHIP_CHECK_STALE_CODES, isAnsweredFeeBankDateRefusal, usePostMembershipCheck } = await import('../src/api/hooks.js');
const { FeeBankDatesRoute } = await import('../src/routes/FeeBankDatesRoute.js');
const { RootLayout } = await import('../src/routes/RootLayout.js');
const { feeBankDatesEn: t, feeBankDateErrorMessage } = await import('../src/modules/fee-bank-dates/index.js');
const { MembershipCheckControl } = await import('../src/modules/claim-verification/MembershipCheckControl.js');
const { verifierConsoleEn } = await import('../src/modules/claim-verification/index.js');
const { membershipCheckErrorMessage, membershipCheckRequiredMessage } = await import('../src/modules/claim-verification/nominee-errors.js');
const { stepUpEn } = await import('../src/modules/workplaces/i18n-en.js');
const mc = verifierConsoleEn.membershipCheck;

const PARIWAR = '44444444-4444-4444-8444-444444444444';
const CLAIM = '11111111-1111-4111-8111-111111111111';
const CLAIM_2 = '11111111-1111-4111-8111-222222222222';
const CHECK = '00000000-0000-4000-8000-0000000000c1';
const RECORD = '00000000-0000-4000-8000-0000000000b1';
const DEATH = '2026-05-01';

// ── DL11 — the words BigDev approved word for word (`2026-11-27-510`). ─────────────────────────────────────────
const DL11 = {
  heading: 'Joining fees to check against the bank statement',
  intro:
    "These claims are held because the joining fee was recorded on or after the date of death. If the Trust's bank statement shows the payment arrived earlier, record the date it arrived.",
  nav: 'Joining fee bank dates',
  empty: 'No claim is held on its joining fee.',
  cut: 'Only the longest-held claims are shown.',
  second: 'Bank dates already recorded on claims whose check now passes',
  noAccess: 'You do not have permission to record bank dates.',
  recorded: 'Recorded. The District Admin must now check the claim again.',
  mismatch: 'This reference does not match the payment recorded for the member. Check that you have the right line on the statement.',
  stale: 'This claim changed since you opened it. It has been reloaded — check again.',
  promptRefEmpty: 'Enter the payment reference as it appears on the statement.',
  promptRefShape: 'A payment reference is 12 digits, or 22 letters and digits.',
  promptDate: 'Enter the date the money arrived, as a real date.',
  promptReason: 'Choose why the recorded date is wrong.',
  promptNote: 'Write a note — which statement, and what you saw.',
  amendedNote:
    'No drive can open for this claim on the recorded date. Record the check. If the member may have paid before the death, then ask the finance officer to check the Trust\'s bank statement before you deny; otherwise deny the claim with the reason "Fee paid after the death".',
  todaysNote: 'No drive can open for this claim. Record the check, then deny the claim with the reason "Fee paid after the death".',
  bankChanged: "The finance officer recorded the bank's date since you opened this check. It has been reloaded — check again.",
  samePerson: "You recorded the bank's date on this claim, so another person must record this check.",
  bankWait: "The finance officer recorded the bank's date for the joining fee — check again.",
  // ⭐ Code review 2026-11-27 — EVERY approved page string pinned as a literal (⛔ the copy file checked against itself).
  refused: {
    reference_mismatch: 'This reference does not match the payment recorded for the member. Check that you have the right line on the statement.',
    before_joining: 'That date is before the member joined. Check the date on the statement.',
    in_future: 'That date is in the future.',
    not_held: 'This claim is not held on its joining fee.',
    window_closed: 'A bank date can no longer be recorded on this claim.',
    stale: 'This claim changed since you opened it. It has been reloaded — check again.',
    not_found: 'This claim could not be found. Reload the page.',
    no_fee_receipt: "The record of the member's joining fee cannot be identified, so a bank date cannot be recorded. Please tell the Super Admin.",
    missing_display: 'Your account has no display name, so a bank date cannot be attributed to you. Ask a Super Admin to set it.',
    invalid_reason: 'Something in the form is not right. Check each field and try again.',
  },
  fields: {
    reference: 'Payment reference, as shown on the statement',
    date: 'Date the money arrived, as shown on the statement',
    reasonLegend: 'Why the recorded date is wrong',
    note: 'Note — which statement, and what you saw',
  },
  reasons: {
    recorded_late_by_member: 'The member recorded the payment late',
    recorded_by_family_after_death: 'The family recorded the payment after the death',
    other: 'Other',
  },
  row: 'Recorded on {date} · ₹{amount} · reference ending {last4}',
  // `2026-11-27-512` — D1 and D2, approved word for word.
  notEarlier: "The Trust's bank statement shows the payment arrived on {date} (recorded by {name}) — not earlier than the recorded date, so the recorded date is used.",
  lostWrite: 'The bank date may not have been recorded. The list has been reloaded — check the claim before you record it again.',
} as const;

const row = (over: Partial<FeeBankDateListRow> = {}): FeeBankDateListRow => ({
  claim_case_id: CLAIM,
  latest_posting_district: 'Patna',
  recorded_fee_date: '2026-05-10',
  amount_inr: 110,
  reference_last4: '9012',
  fee_date_source: 'recorded',
  expected_live_check_id: CHECK,
  expected_live_record_id: null,
  live_record: null,
  ...over,
});
const list = (over: Partial<FeeBankDateListResponse> = {}): FeeBankDateListResponse => ({
  held: [row()],
  recorded: [],
  held_truncated: false,
  recorded_truncated: false,
  ...over,
});

/** The last `wrap`'s client — for the cache / invalidation legs. */
let lastClient: QueryClient;
function wrap(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  lastClient = client;
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

async function openForm(): Promise<HTMLElement> {
  fireEvent.click((await screen.findAllByTestId('fee-bank-date-open'))[0]!);
  return screen.findByTestId(`fee-bank-date-form-${CLAIM}`);
}
function fill(form: HTMLElement, v: { reference?: string; date?: string; reason?: string | null; note?: string }) {
  if (v.reference !== undefined) fireEvent.change(within(form).getByTestId('fee-bank-date-reference'), { target: { value: v.reference } });
  if (v.date !== undefined) fireEvent.change(within(form).getByTestId('fee-bank-date-date'), { target: { value: v.date } });
  if (v.reason) fireEvent.click(within(form).getByTestId(`fee-bank-date-reason-${v.reason}`));
  if (v.note !== undefined) fireEvent.change(within(form).getByTestId('fee-bank-date-note'), { target: { value: v.note } });
}
const VALID = { reference: '123456789012', date: '2026-04-30', reason: 'recorded_by_family_after_death', note: 'SBI, May statement, line 14' };

beforeEach(() => {
  params = { pariwarId: PARIWAR };
  getFeeBankDates.mockReset();
  postFeeBankDate.mockReset();
  requestStepUp.mockReset();
  verifyStepUp.mockReset();
  postMembershipCheck.mockReset();
});
afterEach(() => {
  cleanup();
  focusManager.setFocused(undefined); // round 3 — a failed leg must ⛔ leave the focus forced for the next one
});

describe('the finance officer’s page (DL10, DL11)', () => {
  it('⭐ the copy is DL11 word for word', () => {
    expect([t.heading, t.intro, t.nav, t.empty, t.truncated, t.recordedHeading, t.forbidden, t.recorded]).toEqual([
      DL11.heading, DL11.intro, DL11.nav, DL11.empty, DL11.cut, DL11.second, DL11.noAccess, DL11.recorded,
    ]);
    expect(t.prompts).toEqual({ referenceEmpty: DL11.promptRefEmpty, referenceShape: DL11.promptRefShape, date: DL11.promptDate, reason: DL11.promptReason, note: DL11.promptNote });
    expect(mc.feeAfterDeathNoteRecorded).toBe(DL11.amendedNote);
    expect(mc.feeAfterDeathNote).toBe(DL11.todaysNote); // today's note, unchanged
    expect(t.refused).toEqual(DL11.refused);
    expect(t.fields).toEqual(DL11.fields);
    expect(t.reasons).toEqual(DL11.reasons);
    expect(t.row).toBe(DL11.row);
    expect(mc.feeBankDateNotEarlier).toBe(DL11.notEarlier);
    expect(t.lostWrite).toBe(DL11.lostWrite);
  });

  it('⭐ lists the held claims — the recorded date, the amount, the last four — and ⛔ a name, ⛔ the date of death, ⛔ a fee outcome', async () => {
    getFeeBankDates.mockResolvedValue(list());
    wrap(<FeeBankDatesRoute />);
    const r = await screen.findByTestId(`fee-bank-date-row-${CLAIM}`);
    expect(within(r).getByTestId('fee-bank-date-row-line')).toHaveTextContent('Recorded on 2026-05-10 · ₹110 · reference ending 9012');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(DL11.heading);
    const page = document.body.textContent ?? '';
    expect(page).not.toContain(DEATH);
    expect(page).not.toMatch(/after the death|on the day of death|before the death|after_death|same_day/i);
    // ⛔ second section when it is empty.
    expect(screen.queryByTestId('fee-bank-dates-recorded')).toBeNull();
  });

  it('the empty, cut-list and no-access lines', async () => {
    getFeeBankDates.mockResolvedValueOnce(list({ held: [] }));
    wrap(<FeeBankDatesRoute />);
    expect(await screen.findByTestId('fee-bank-dates-empty')).toHaveTextContent(DL11.empty);
    cleanup();
    getFeeBankDates.mockResolvedValueOnce(list({ held_truncated: true }));
    wrap(<FeeBankDatesRoute />);
    expect(await screen.findByTestId('fee-bank-dates-held-truncated')).toHaveTextContent(DL11.cut);
    cleanup();
    getFeeBankDates.mockRejectedValueOnce(new ApiError(403, 'rbac.forbidden', 'x'));
    wrap(<FeeBankDatesRoute />);
    expect(await screen.findByTestId('fee-bank-dates-forbidden')).toHaveTextContent(DL11.noAccess);
  });

  it('⭐ the SECOND section — only when non-empty, under its own heading, with the live record', async () => {
    getFeeBankDates.mockResolvedValue(
      list({
        recorded: [
          row({
            claim_case_id: CLAIM_2,
            fee_date_source: 'bank',
            expected_live_record_id: RECORD,
            live_record: { record_id: RECORD, bank_credit_date: '2026-04-28', reason_code: 'other', recorded_by_display: 'Meera', recorded_at: '2026-06-01T05:30:00.000Z' },
          }),
        ],
        recorded_truncated: true,
      }),
    );
    wrap(<FeeBankDatesRoute />);
    const second = await screen.findByTestId('fee-bank-dates-recorded');
    expect(within(second).getByRole('heading')).toHaveTextContent(DL11.second);
    expect(within(second).getByTestId('fee-bank-date-row-live')).toHaveTextContent('2026-04-28');
    expect(within(second).getByTestId('fee-bank-date-row-live')).toHaveTextContent('Meera');
    expect(within(second).getByTestId('fee-bank-dates-recorded-truncated')).toHaveTextContent(DL11.cut);
  });

  it('the nav link — inside a Pariwar context', async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <RootLayout />
      </QueryClientProvider>,
    );
    expect(await screen.findByTestId('nav-fee-bank-dates')).toHaveAttribute('href', '/p/$pariwarId/fee-bank-dates');
    expect(screen.getByTestId('nav-fee-bank-dates')).toHaveAttribute('data-params', JSON.stringify({ pariwarId: PARIWAR }));
    expect(screen.getByTestId('nav-fee-bank-dates')).toHaveTextContent(DL11.nav);
    cleanup();
    // ⛔ Outside a Pariwar context.
    params = {};
    render(
      <QueryClientProvider client={new QueryClient()}>
        <RootLayout />
      </QueryClientProvider>,
    );
    // The layout DID render (the Primary nav is there — the link is ungated, so it would be by now) — ⛔ a swallowed timeout.
    expect(await screen.findByRole('navigation', { name: 'Primary' })).toBeInTheDocument();
    expect(screen.queryByTestId('nav-certificate-reminders')).toBeNull(); // the sibling Pariwar link agrees
    expect(screen.queryByTestId('nav-fee-bank-dates')).toBeNull();
  });
});

describe('the form (DL3, DL9, DL11)', () => {
  it('⭐ refuses incomplete input IN WORDS, field by field, and sends ⛔ nothing', async () => {
    getFeeBankDates.mockResolvedValue(list());
    wrap(<FeeBankDatesRoute />);
    const form = await openForm();
    const prompt = () => within(form).getByTestId('fee-bank-date-prompt');
    fireEvent.click(within(form).getByTestId('fee-bank-date-submit'));
    expect(prompt()).toHaveTextContent(DL11.promptRefEmpty);
    fill(form, { reference: '12345' });
    fireEvent.click(within(form).getByTestId('fee-bank-date-submit'));
    expect(prompt()).toHaveTextContent(DL11.promptRefShape);
    fill(form, { reference: VALID.reference });
    fireEvent.click(within(form).getByTestId('fee-bank-date-submit'));
    expect(prompt()).toHaveTextContent(DL11.promptDate);
    fill(form, { date: VALID.date });
    fireEvent.click(within(form).getByTestId('fee-bank-date-submit'));
    expect(prompt()).toHaveTextContent(DL11.promptReason);
    fill(form, { reason: VALID.reason });
    fireEvent.click(within(form).getByTestId('fee-bank-date-submit'));
    expect(prompt()).toHaveTextContent(DL11.promptNote);
    expect(postFeeBankDate).not.toHaveBeenCalled();
  });

  it('⭐ a valid form sends the reference TRIMMED, the row\'s two tokens, and says what follows', async () => {
    getFeeBankDates.mockResolvedValue(list());
    postFeeBankDate.mockResolvedValueOnce({ claim_case_id: CLAIM, record_id: RECORD, superseded_record_id: null, event_version: 9 });
    wrap(<FeeBankDatesRoute />);
    const form = await openForm();
    fill(form, { ...VALID, reference: ` ${VALID.reference} ` });
    fireEvent.click(within(form).getByTestId('fee-bank-date-submit'));
    const done = await screen.findByTestId('fee-bank-date-recorded');
    expect(done).toHaveTextContent(DL11.recorded);
    expect(done).toHaveTextContent('reference ending 9012');
    expect(done).toHaveAttribute('role', 'status');
    // The form closes, the row can be opened again (a correction), and the result line holds the focus.
    await waitFor(() => expect(screen.queryByTestId(`fee-bank-date-form-${CLAIM}`)).toBeNull());
    expect(screen.getByTestId('fee-bank-date-open')).toBeEnabled();
    expect(document.activeElement).toBe(done);
    expect(postFeeBankDate).toHaveBeenCalledWith(PARIWAR, CLAIM, {
      statement_reference: VALID.reference,
      bank_credit_date: VALID.date,
      reason_code: VALID.reason,
      note: VALID.note,
      expected_live_check_id: CHECK,
      expected_live_record_id: null,
    });
  });

  it('⭐ every `fee_bank_date.*` refusal is its approved line — ⛔ a raw code; a 400 / 401 / 403 theirs', () => {
    for (const reason of FEE_BANK_DATE_REFUSAL_REASONS) {
      const words = feeBankDateErrorMessage(new ApiError(409, `fee_bank_date.${reason}`, 'server text'));
      expect(words, reason).toBe(t.refused[reason]);
      expect(words, reason).not.toMatch(/fee_bank_date|server text/);
    }
    expect(feeBankDateErrorMessage(new ApiError(409, 'fee_bank_date.reference_mismatch', 'x'))).toBe(DL11.mismatch);
    expect(feeBankDateErrorMessage(new ApiError(400, 'request.validation', 'x'))).toBe('Something in the form is not right. Check each field and try again.');
    expect(feeBankDateErrorMessage(new ApiError(401, 'auth.session_required', 'x'))).toBe('Your session has ended. Sign in again, then record the bank date.');
    expect(feeBankDateErrorMessage(new ApiError(403, 'rbac.forbidden', 'x'))).toBe(DL11.noAccess);
  });

  it('⭐ `stale` shows its line and RELOADS the list', async () => {
    getFeeBankDates.mockResolvedValue(list());
    postFeeBankDate.mockRejectedValueOnce(new ApiError(409, 'fee_bank_date.stale', 'x'));
    wrap(<FeeBankDatesRoute />);
    const form = await openForm();
    fill(form, VALID);
    const before = getFeeBankDates.mock.calls.length;
    fireEvent.click(within(form).getByTestId('fee-bank-date-submit'));
    expect(await screen.findByTestId('fee-bank-date-refused')).toHaveTextContent(DL11.refused.stale);
    await waitFor(() => expect(getFeeBankDates.mock.calls.length).toBeGreaterThan(before));
  });

  it('⭐⭐ a 403 `auth.step_up_required` HOLDS the write; the shared StepUpPanel re-sends the SAME body after the code verifies', async () => {
    getFeeBankDates.mockResolvedValue(list());
    postFeeBankDate.mockRejectedValueOnce(new ApiError(403, 'auth.step_up_required', 'Step-up required'));
    postFeeBankDate.mockResolvedValueOnce({ claim_case_id: CLAIM, record_id: RECORD, superseded_record_id: null, event_version: 9 });
    requestStepUp.mockResolvedValueOnce({ sent: true, expiresInSeconds: 300 });
    verifyStepUp.mockResolvedValueOnce({ elevated: true, elevatedUntil: '2026-11-27T12:00:00.000Z' });
    wrap(<FeeBankDatesRoute />);
    const form = await openForm();
    fill(form, VALID);
    fireEvent.click(within(form).getByTestId('fee-bank-date-submit'));
    const hold = await screen.findByTestId('fee-bank-date-step-up');
    // ⛔ the refusal line for a step-up — the panel is the answer; the held body is LOCKED on screen (the fields are disabled).
    expect(screen.queryByTestId('fee-bank-date-refused')).toBeNull();
    expect(within(form).getByTestId('fee-bank-date-fields')).toBeDisabled();
    fireEvent.click(within(hold).getByRole('button', { name: stepUpEn.send }));
    fireEvent.change(await screen.findByTestId('fee-bank-date-step-up-code'), { target: { value: '123456' } });
    fireEvent.click(screen.getByTestId('fee-bank-date-step-up-verify'));
    expect(await screen.findByTestId('fee-bank-date-recorded')).toHaveTextContent(DL11.recorded);
    expect(requestStepUp).toHaveBeenCalledWith(FEE_BANK_DATE_STEP_UP_CONTEXT);
    expect(postFeeBankDate).toHaveBeenCalledTimes(2);
    expect(postFeeBankDate.mock.calls[1]).toEqual(postFeeBankDate.mock.calls[0]);
  });
});

describe('the form and the list after an outcome (code review 2026-11-27)', () => {
  it('⭐ the fields LOCK while the write is in flight (a 403 landing after an edit can hold only what is on screen) and other rows cannot be opened', async () => {
    getFeeBankDates.mockResolvedValue(list({ held: [row(), row({ claim_case_id: CLAIM_2, reference_last4: '3333' })] }));
    let release: (v: unknown) => void = () => undefined;
    postFeeBankDate.mockReturnValueOnce(new Promise((res) => (release = res)));
    wrap(<FeeBankDatesRoute />);
    const form = await openForm();
    fill(form, VALID);
    fireEvent.click(within(form).getByTestId('fee-bank-date-submit'));
    await waitFor(() => expect(within(form).getByTestId('fee-bank-date-fields')).toBeDisabled());
    expect(within(form).getByTestId('fee-bank-date-note')).toBeDisabled();
    const otherRow = screen.getByTestId(`fee-bank-date-row-${CLAIM_2}`);
    expect(within(otherRow).getByTestId('fee-bank-date-open')).toBeDisabled();
    release({ claim_case_id: CLAIM, record_id: RECORD, superseded_record_id: null, event_version: 9 });
    expect(await screen.findByTestId('fee-bank-date-recorded')).toBeInTheDocument();
    await waitFor(() => expect(within(screen.getByTestId(`fee-bank-date-row-${CLAIM_2}`)).getByTestId('fee-bank-date-open')).toBeEnabled());
  });

  it('⭐ a refusal whose reload makes the row LEAVE the list (`not_held`) keeps its line — on the list, announced, naming the claim', async () => {
    getFeeBankDates.mockResolvedValueOnce(list()).mockResolvedValue(list({ held: [] }));
    postFeeBankDate.mockRejectedValueOnce(new ApiError(409, 'fee_bank_date.not_held', 'x'));
    wrap(<FeeBankDatesRoute />);
    const form = await openForm();
    fill(form, VALID);
    fireEvent.click(within(form).getByTestId('fee-bank-date-submit'));
    const line = await screen.findByTestId('fee-bank-date-refused');
    expect(line).toHaveTextContent(DL11.refused.not_held);
    expect(line).toHaveTextContent('reference ending 9012');
    expect(line).toHaveAttribute('role', 'alert');
    await screen.findByTestId('fee-bank-dates-empty'); // the row has gone…
    expect(screen.getByTestId('fee-bank-date-refused')).toHaveTextContent(DL11.refused.not_held); // …the line has ⛔
    expect(screen.queryByTestId(`fee-bank-date-form-${CLAIM}`)).toBeNull();
  });

  it('⭐ a success whose reload MOVES the row to the second section: the line stays, and ⛔ empty form opens there', async () => {
    getFeeBankDates
      .mockResolvedValueOnce(list())
      .mockResolvedValue(list({ held: [], recorded: [row({ fee_date_source: 'bank', expected_live_record_id: RECORD })] }));
    postFeeBankDate.mockResolvedValueOnce({ claim_case_id: CLAIM, record_id: RECORD, superseded_record_id: null, event_version: 9 });
    wrap(<FeeBankDatesRoute />);
    const form = await openForm();
    fill(form, VALID);
    fireEvent.click(within(form).getByTestId('fee-bank-date-submit'));
    const second = await screen.findByTestId('fee-bank-dates-recorded');
    expect(screen.getByTestId('fee-bank-date-recorded')).toHaveTextContent(DL11.recorded);
    expect(within(second).queryByTestId(`fee-bank-date-form-${CLAIM}`)).toBeNull();
    expect(within(second).getByTestId('fee-bank-date-open')).toBeEnabled();
  });

  it('⭐ D2 (`2026-11-27-512`) — a write with ⛔ typed answer (a 5xx) says it MAY not have been recorded and RELOADS the list', async () => {
    getFeeBankDates.mockResolvedValue(list());
    postFeeBankDate.mockRejectedValueOnce(new ApiError(502, 'upstream', 'x'));
    wrap(<FeeBankDatesRoute />);
    const form = await openForm();
    fill(form, VALID);
    const before = getFeeBankDates.mock.calls.length;
    fireEvent.click(within(form).getByTestId('fee-bank-date-submit'));
    expect(await screen.findByTestId('fee-bank-date-refused')).toHaveTextContent(DL11.lostWrite);
    await waitFor(() => expect(getFeeBankDates.mock.calls.length).toBeGreaterThan(before));
    expect(feeBankDateErrorMessage(new TypeError('Failed to fetch'))).toBe(DL11.lostWrite);
  });

  it('⭐ round 2 — a LOST write closes the form and reloads the console too; a re-open carries the FRESH tokens (⛔ a duplicate correction from the old form)', async () => {
    // The write LANDED: the reload shows the new record (the row still held — the check still blocks).
    getFeeBankDates.mockResolvedValueOnce(list()).mockResolvedValue(list({ held: [row({ expected_live_record_id: RECORD })] }));
    postFeeBankDate.mockRejectedValueOnce(new ApiError(502, 'upstream', 'x'));
    wrap(<FeeBankDatesRoute />);
    const spy = vi.spyOn(lastClient, 'invalidateQueries');
    const form = await openForm();
    fill(form, VALID);
    fireEvent.click(within(form).getByTestId('fee-bank-date-submit'));
    expect(await screen.findByTestId('fee-bank-date-refused')).toHaveTextContent(DL11.lostWrite);
    await waitFor(() => expect(screen.queryByTestId(`fee-bank-date-form-${CLAIM}`)).toBeNull());
    const keys = spy.mock.calls.map((c) => JSON.stringify((c[0] as { queryKey?: unknown }).queryKey));
    expect(keys).toEqual(expect.arrayContaining([JSON.stringify(['fee-bank-dates', PARIWAR])]));
    expect(keys.some((k) => k.includes('membership') && k.includes(CLAIM))).toBe(true);
    expect(keys.some((k) => k.includes('verifier') && k.includes(CLAIM))).toBe(true);
    await waitFor(() => expect(getFeeBankDates.mock.calls.length).toBeGreaterThan(1));
    postFeeBankDate.mockResolvedValueOnce({ claim_case_id: CLAIM, record_id: randomUUID(), superseded_record_id: RECORD, event_version: 10 });
    const again = await openForm();
    fill(again, VALID);
    fireEvent.click(within(again).getByTestId('fee-bank-date-submit'));
    await waitFor(() => expect(postFeeBankDate).toHaveBeenCalledTimes(2));
    expect(postFeeBankDate.mock.calls[1]![2]).toMatchObject({ expected_live_record_id: RECORD });
  });

  it('⭐⭐ round 2 (HIGH) + round 3 — the tokens are the row AS OPENED: a refetch that swaps them under the form is SAID (DL11\'s `stale` line, the typed fields kept); until then a press sends the OLD ones, after it the shown ones', async () => {
    // BOTH tokens move under the form: another finance officer's record AND a District Admin's re-check (still blocking). The
    // refetched row also shows a NEW district — a rendered change to wait on (⛔ a sync point the old row already had).
    const CHECK_2 = '00000000-0000-4000-8000-0000000000c2';
    let refetched = false;
    getFeeBankDates.mockImplementation(async () =>
      refetched ? list({ held: [row({ latest_posting_district: 'Gaya', expected_live_check_id: CHECK_2, expected_live_record_id: RECORD })] }) : list(),
    );
    postFeeBankDate.mockRejectedValueOnce(new ApiError(409, 'fee_bank_date.stale', 'x'));
    wrap(<FeeBankDatesRoute />);
    const form = await openForm();
    fill(form, VALID);
    // ⛔ refetch yet: the press sends the tokens AS OPENED.
    fireEvent.click(within(form).getByTestId('fee-bank-date-submit'));
    await waitFor(() => expect(postFeeBankDate).toHaveBeenCalledTimes(1));
    expect(postFeeBankDate.mock.calls[0]![2]).toMatchObject({ expected_live_check_id: CHECK, expected_live_record_id: null });
    await screen.findByTestId('fee-bank-date-refused');
    await waitFor(() => expect(screen.queryByTestId(`fee-bank-date-form-${CLAIM}`)).toBeNull()); // `stale` reloads ⇒ closes
    getFeeBankDates.mockReset();
    getFeeBankDates.mockImplementation(async () => list());
    cleanup();
    // A fresh page: open, type — then the tokens move under the form.
    refetched = false;
    getFeeBankDates.mockImplementation(async () =>
      refetched ? list({ held: [row({ latest_posting_district: 'Gaya', expected_live_check_id: CHECK_2, expected_live_record_id: RECORD })] }) : list(),
    );
    postFeeBankDate.mockResolvedValueOnce({ claim_case_id: CLAIM, record_id: randomUUID(), superseded_record_id: RECORD, event_version: 10 });
    wrap(<FeeBankDatesRoute />);
    const form2 = await openForm();
    fill(form2, VALID);
    expect(screen.queryByTestId('fee-bank-date-refused')).toBeNull();
    refetched = true;
    focusManager.setFocused(false);
    focusManager.setFocused(true);
    await waitFor(() => expect(screen.getByTestId(`fee-bank-date-row-${CLAIM}`)).toHaveTextContent('Gaya')); // the refetch RENDERED
    // SAID: DL11's `stale` line, naming the claim; the form stays, with what was typed.
    expect(await screen.findByTestId('fee-bank-date-refused')).toHaveTextContent(`reference ending 9012 — ${DL11.refused.stale}`);
    expect(screen.getByTestId(`fee-bank-date-form-${CLAIM}`)).toBe(form2);
    expect(within(form2).getByTestId('fee-bank-date-reference')).toHaveValue(VALID.reference);
    // The next press is on what was SHOWN — the new tokens.
    fireEvent.click(within(form2).getByTestId('fee-bank-date-submit'));
    await waitFor(() => expect(postFeeBankDate).toHaveBeenCalledTimes(2));
    expect(postFeeBankDate.mock.calls[1]![2]).toMatchObject({ expected_live_check_id: CHECK_2, expected_live_record_id: RECORD });
  });

  it('round 3 — a CORRECTABLE refusal (the form stays open), then a reload that moves the row: the old line is REPLACED by DL11\'s `stale` line (⛔ "check the reference" for a form that is gone)', async () => {
    let moved = false;
    getFeeBankDates.mockImplementation(async () =>
      moved ? list({ held: [], recorded: [row({ fee_date_source: 'bank', expected_live_record_id: RECORD })] }) : list(),
    );
    postFeeBankDate.mockRejectedValueOnce(new ApiError(409, 'fee_bank_date.reference_mismatch', 'x'));
    wrap(<FeeBankDatesRoute />);
    const form = await openForm();
    fill(form, VALID);
    fireEvent.click(within(form).getByTestId('fee-bank-date-submit'));
    expect(await screen.findByTestId('fee-bank-date-refused')).toHaveTextContent(DL11.refused.reference_mismatch);
    await waitFor(() => expect(within(form).getByTestId('fee-bank-date-fields')).toBeEnabled());
    moved = true;
    focusManager.setFocused(false);
    focusManager.setFocused(true);
    await screen.findByTestId('fee-bank-dates-recorded');
    await waitFor(() => expect(screen.queryByTestId(`fee-bank-date-form-${CLAIM}`)).toBeNull());
    expect(screen.getByTestId('fee-bank-date-refused')).toHaveTextContent(`reference ending 9012 — ${DL11.refused.stale}`);
  });

  it('round 3 — a reload that DROPS the open row while the officer types: the form closes with DL11\'s `stale` line, focused', async () => {
    let dropped = false;
    getFeeBankDates.mockImplementation(async () => (dropped ? list({ held: [] }) : list()));
    wrap(<FeeBankDatesRoute />);
    const form = await openForm();
    fill(form, { reference: '123' });
    dropped = true;
    focusManager.setFocused(false);
    focusManager.setFocused(true);
    await screen.findByTestId('fee-bank-dates-empty');
    await waitFor(() => expect(screen.queryByTestId(`fee-bank-date-form-${CLAIM}`)).toBeNull());
    const line = screen.getByTestId('fee-bank-date-refused');
    expect(line).toHaveTextContent(`reference ending 9012 — ${DL11.refused.stale}`);
    await waitFor(() => expect(document.activeElement).toBe(line));
  });

  it('round 2 — a reload that MOVES the open row while the officer types (⛔ write): the form closes WITH DL11\'s `stale` line, focused', async () => {
    getFeeBankDates.mockResolvedValueOnce(list()).mockResolvedValue(list({ held: [], recorded: [row({ fee_date_source: 'bank', expected_live_record_id: RECORD })] }));
    wrap(<FeeBankDatesRoute />);
    const form = await openForm();
    fill(form, { reference: '123' });
    focusManager.setFocused(false);
    focusManager.setFocused(true);
    await screen.findByTestId('fee-bank-dates-recorded');
    focusManager.setFocused(undefined);
    await waitFor(() => expect(screen.queryByTestId(`fee-bank-date-form-${CLAIM}`)).toBeNull());
    const line = screen.getByTestId('fee-bank-date-refused');
    expect(line).toHaveTextContent(`reference ending 9012 — ${DL11.refused.stale}`);
    await waitFor(() => expect(document.activeElement).toBe(line));
    expect(postFeeBankDate).not.toHaveBeenCalled();
  });

  it('round 2 — a HELD write puts the focus in the step-up panel (its first control), and the mutation cache holds ⛔ note or reference while held', async () => {
    getFeeBankDates.mockResolvedValue(list());
    postFeeBankDate.mockRejectedValueOnce(new ApiError(403, 'auth.step_up_required', 'Step-up required'));
    wrap(<FeeBankDatesRoute />);
    const form = await openForm();
    fill(form, VALID);
    fireEvent.click(within(form).getByTestId('fee-bank-date-submit'));
    const panel = await screen.findByTestId('fee-bank-date-step-up');
    await waitFor(() => expect(panel.contains(document.activeElement)).toBe(true));
    const cached = lastClient.getMutationCache().getAll().map((m) => JSON.stringify(m.state.variables ?? null));
    expect(cached.some((v) => v.includes(VALID.note) || v.includes(VALID.reference))).toBe(false);
  });

  it('D2 — an UNTYPED 4xx (a 429, a 404 with ⛔ bank-date code) shows the lost-write line, so it RELOADS too (the hook and the line share one test)', async () => {
    getFeeBankDates.mockResolvedValue(list());
    postFeeBankDate.mockRejectedValueOnce(new ApiError(429, 'rate_limited', 'x'));
    wrap(<FeeBankDatesRoute />);
    const form = await openForm();
    fill(form, VALID);
    const before = getFeeBankDates.mock.calls.length;
    fireEvent.click(within(form).getByTestId('fee-bank-date-submit'));
    expect(await screen.findByTestId('fee-bank-date-refused')).toHaveTextContent(DL11.lostWrite);
    await waitFor(() => expect(getFeeBankDates.mock.calls.length).toBeGreaterThan(before));
    // The shared predicate, both ways: every line the page HAS is an answered refusal; the rest are lost writes.
    for (const e of [new ApiError(409, 'fee_bank_date.stale', 'x'), new ApiError(400, 'validation', 'x'), new ApiError(403, 'auth.forbidden', 'x'), new ApiError(401, 'auth.session_required', 'x'), new ApiError(422, 'admin.display_name_missing', 'x')]) {
      expect(isAnsweredFeeBankDateRefusal(e), e.code).toBe(true);
      expect(feeBankDateErrorMessage(e), e.code).not.toBe(DL11.lostWrite);
    }
    for (const e of [new ApiError(404, 'http.404', 'x'), new ApiError(429, 'rate_limited', 'x'), new ApiError(503, 'x', 'x'), new TypeError('Failed to fetch')]) {
      expect(isAnsweredFeeBankDateRefusal(e)).toBe(false);
      expect(feeBankDateErrorMessage(e)).toBe(DL11.lostWrite);
    }
  });

  it('⭐ fix-diff review — a reload WHILE a write is held (a focus refetch during the step-up) does ⛔ unmount the form: the panel, the typed fields and the write survive; the fresh list renders after', async () => {
    getFeeBankDates.mockResolvedValueOnce(list()).mockResolvedValue(list({ held: [], recorded: [row({ fee_date_source: 'bank', expected_live_record_id: RECORD })] }));
    postFeeBankDate.mockRejectedValueOnce(new ApiError(403, 'auth.step_up_required', 'Step-up required'));
    wrap(<FeeBankDatesRoute />);
    const form = await openForm();
    fill(form, VALID);
    fireEvent.click(within(form).getByTestId('fee-bank-date-submit'));
    await screen.findByTestId('fee-bank-date-step-up');
    const before = getFeeBankDates.mock.calls.length;
    focusManager.setFocused(false);
    focusManager.setFocused(true);
    await waitFor(() => expect(getFeeBankDates.mock.calls.length).toBeGreaterThan(before));
    await new Promise((r) => setTimeout(r, 20));
    // Frozen: the SAME form node, its panel and its typed reference — ⛔ an empty form in the second section.
    expect(screen.getByTestId(`fee-bank-date-form-${CLAIM}`)).toBe(form);
    expect(screen.getByTestId('fee-bank-date-step-up')).toBeInTheDocument();
    expect(within(form).getByTestId('fee-bank-date-reference')).toHaveValue(VALID.reference);
    expect(screen.queryByTestId('fee-bank-dates-recorded')).toBeNull();
    focusManager.setFocused(undefined);
    // Cancel the hold ⇒ the fresh list renders; the row MOVED section, so its form closes (⛔ re-opened empty).
    fireEvent.click(screen.getByTestId('fee-bank-date-step-up-cancel'));
    const second = await screen.findByTestId('fee-bank-dates-recorded');
    expect(within(second).queryByTestId(`fee-bank-date-form-${CLAIM}`)).toBeNull();
    expect(screen.queryByTestId(`fee-bank-date-form-${CLAIM}`)).toBeNull();
  });

  it('⭐ fix-diff review — a `stale` refusal whose reload MOVES the row: the form closes, the line stays and takes the focus', async () => {
    getFeeBankDates.mockResolvedValueOnce(list()).mockResolvedValue(list({ held: [], recorded: [row({ fee_date_source: 'bank', expected_live_record_id: RECORD })] }));
    postFeeBankDate.mockRejectedValueOnce(new ApiError(409, 'fee_bank_date.stale', 'x'));
    wrap(<FeeBankDatesRoute />);
    const form = await openForm();
    fill(form, VALID);
    fireEvent.click(within(form).getByTestId('fee-bank-date-submit'));
    const line = await screen.findByTestId('fee-bank-date-refused');
    expect(line).toHaveTextContent(DL11.refused.stale);
    await screen.findByTestId('fee-bank-dates-recorded');
    await waitFor(() => expect(screen.queryByTestId(`fee-bank-date-form-${CLAIM}`)).toBeNull());
    expect(screen.getByTestId('fee-bank-date-refused')).toHaveTextContent(DL11.refused.stale);
    await waitFor(() => expect(document.activeElement).toBe(screen.getByTestId('fee-bank-date-refused')));
  });

  it('fix-diff review — a refusal while the form STAYS open keeps the focus in the form; an edit retires the line and the prompt', async () => {
    getFeeBankDates.mockResolvedValue(list());
    postFeeBankDate.mockRejectedValueOnce(new ApiError(409, 'fee_bank_date.reference_mismatch', 'x'));
    wrap(<FeeBankDatesRoute />);
    const form = await openForm();
    fill(form, VALID);
    const submit = within(form).getByTestId('fee-bank-date-submit');
    // ⛔ `submit.focus()` first (round 2): jsdom keeps the focus on a disabled control, so a pre-focused button made this leg
    // unable to fail. A click does not move the focus in jsdom — only the refocus can put it on the button.
    expect(document.activeElement).not.toBe(submit);
    fireEvent.click(submit);
    const line = await screen.findByTestId('fee-bank-date-refused');
    expect(line).toHaveTextContent(DL11.refused.reference_mismatch);
    await waitFor(() => expect(within(form).getByTestId('fee-bank-date-fields')).toBeEnabled());
    expect(document.activeElement).not.toBe(line);
    // ⚠ The focus RETURNS to the submit button (real Chrome drops it to <body> on the disabled fieldset — the browser pass
    // 2026-11-27 proved the fix there). The button was never focused before the press (asserted above), so only the refocus puts
    // the focus here — the leg can fail (round 3: the old "weak" note is gone with the pre-focus).
    expect(document.activeElement).toBe(submit);
    fill(form, { reference: '1' });
    expect(screen.queryByTestId('fee-bank-date-refused')).toBeNull();
  });

  it('fix-diff review — Cancel on a held step-up returns the focus to the form\'s submit button (⛔ <body>: the Cancel button unmounts)', async () => {
    getFeeBankDates.mockResolvedValue(list());
    postFeeBankDate.mockRejectedValueOnce(new ApiError(403, 'auth.step_up_required', 'Step-up required'));
    wrap(<FeeBankDatesRoute />);
    const form = await openForm();
    fill(form, VALID);
    fireEvent.click(within(form).getByTestId('fee-bank-date-submit'));
    const cancel = await screen.findByTestId('fee-bank-date-step-up-cancel');
    cancel.focus();
    fireEvent.click(cancel);
    await waitFor(() => expect(screen.queryByTestId('fee-bank-date-step-up')).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(within(form).getByTestId('fee-bank-date-submit')));
    expect(within(form).getByTestId('fee-bank-date-reference')).toHaveValue(VALID.reference); // the typed fields stay
  });

  it('round 2 — a District Admin\'s RECORDED check reloads the finance officer\'s list (`feeBankDatesKey`)', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const spy = vi.spyOn(client, 'invalidateQueries');
    postMembershipCheck.mockResolvedValueOnce({});
    const { result } = renderHook(() => usePostMembershipCheck(PARIWAR, CLAIM), {
      wrapper: ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>,
    });
    await act(async () => {
      await result.current.mutateAsync({} as never);
    });
    expect(spy.mock.calls.map((c) => JSON.stringify((c[0] as { queryKey?: unknown }).queryKey))).toContain(JSON.stringify(['fee-bank-dates', PARIWAR]));
  });

  it('a 401 on the write goes to sign-in (as the list\'s 401 does)', async () => {
    getFeeBankDates.mockResolvedValue(list());
    postFeeBankDate.mockRejectedValueOnce(new ApiError(401, 'auth.session_required', 'x'));
    navigate.mockClear();
    wrap(<FeeBankDatesRoute />);
    const form = await openForm();
    fill(form, VALID);
    fireEvent.click(within(form).getByTestId('fee-bank-date-submit'));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: '/login' }));
  });

  it('the prompt sits on its field (`aria-invalid`, `aria-describedby`), clears on an edit of that field, and a REPEATED prompt is a new node (announced again)', async () => {
    getFeeBankDates.mockResolvedValue(list());
    wrap(<FeeBankDatesRoute />);
    const form = await openForm();
    const submit = () => fireEvent.click(within(form).getByTestId('fee-bank-date-submit'));
    submit();
    const first = within(form).getByTestId('fee-bank-date-prompt');
    const ref = within(form).getByTestId('fee-bank-date-reference');
    expect(ref).toHaveAttribute('aria-invalid', 'true');
    expect(ref).toHaveAttribute('aria-describedby', first.id);
    submit();
    expect(within(form).getByTestId('fee-bank-date-prompt')).not.toBe(first);
    // ANY field's edit clears it (round 2 — the prompt names the reference; the officer edits the DATE).
    fill(form, { date: '2026-04-01' });
    expect(within(form).queryByTestId('fee-bank-date-prompt')).toBeNull();
    expect(ref).not.toHaveAttribute('aria-invalid');
  });
});

describe('the District Admin’s console — the new lines (DL7, DL11)', () => {
  const gate = (over: Partial<MembershipCheckGateStatus> = {}): MembershipCheckGateStatus => ({
    available: true, passed: false, reason: 'fee_after_death', viewer: { canCheckMembership: true }, ...over,
  });
  const preview = (over: Partial<MembershipCheckPreviewResponse> = {}): MembershipCheckPreviewResponse => ({
    claim_case_id: CLAIM, window_open: true, expected_live_review_id: '00000000-0000-4000-8000-0000000000ac', date_of_death: DEATH,
    fee_paid_on: '2026-05-10', fee_receipt_found: true, fee_outcome: 'after_death', fee_blocks_approval: true, identity_required: false,
    kyc_route: 'digilocker', latest_posting_district: 'Patna', live_check: null, gate: { passed: false, reason: 'fee_after_death' },
    fee_date_source: 'recorded', fee_bank_date: null, ...over,
  });
  const show = (p: MembershipCheckPreviewResponse) =>
    render(
      <MembershipCheckControl
        gate={gate()}
        certificateAccepted
        open
        onOpenChange={() => undefined}
        preview={p}
        memberRecord={{ name: null, dateOfBirth: null }}
        documents={[]}
        onSubmit={async () => true}
      />,
    );

  it('⭐ a blocking RECORDED date ⇒ the AMENDED note, its words say "Record the check" BEFORE "ask the finance officer"; ⛔ the bank line', () => {
    show(preview());
    const note = screen.getByTestId('membership-check-fee-after-death-note');
    expect(note).toHaveTextContent(DL11.amendedNote);
    const text = note.textContent ?? '';
    expect(text.indexOf('Record the check')).toBeGreaterThanOrEqual(0);
    expect(text.indexOf('Record the check')).toBeLessThan(text.indexOf('ask the finance officer'));
    expect(screen.queryByTestId('membership-check-fee-bank-date')).toBeNull();
  });

  it('⭐ a blocking BANK date ⇒ TODAY\'s note, unchanged, and the bank line (date + who)', () => {
    show(
      preview({
        fee_outcome: 'same_day',
        fee_date_source: 'bank',
        fee_bank_date: { record_id: RECORD, bank_credit_date: DEATH, reason_code: 'other', recorded_by_display: 'Meera', recorded_at: '2026-06-01T05:30:00.000Z' },
      }),
    );
    expect(screen.getByTestId('membership-check-fee-after-death-note')).toHaveTextContent(DL11.todaysNote);
    expect(screen.getByTestId('membership-check-fee-bank-date')).toHaveTextContent(
      `The Trust's bank statement shows the payment arrived on ${DEATH} (recorded by Meera).`,
    );
  });

  it('⭐ D1 (`2026-11-27-512`) — a bank date CONSIDERED but ⛔ earlier (the recorded date is used) ⇒ D1\'s line and TODAY\'s note, ⛔ the "ask the finance officer" note', () => {
    show(
      preview({
        fee_outcome: 'same_day',
        fee_date_source: 'recorded',
        fee_bank_date: { record_id: RECORD, bank_credit_date: '2026-05-12', reason_code: 'other', recorded_by_display: 'Meera', recorded_at: '2026-06-01T05:30:00.000Z' },
      }),
    );
    expect(screen.getByTestId('membership-check-fee-bank-date')).toHaveTextContent(
      "The Trust's bank statement shows the payment arrived on 2026-05-12 (recorded by Meera) — not earlier than the recorded date, so the recorded date is used.",
    );
    expect(screen.getByTestId('membership-check-fee-after-death-note')).toHaveTextContent(DL11.todaysNote);
    expect(screen.getByTestId('membership-check-fee-after-death-note')).not.toHaveTextContent('ask the finance officer');
  });

  it('a display name with `$&` / `$\'` renders as written (the slots are filled by a replacer, ⛔ a pattern)', () => {
    show(
      preview({
        fee_outcome: 'before_death',
        fee_blocks_approval: false,
        fee_date_source: 'bank',
        fee_bank_date: { record_id: RECORD, bank_credit_date: '2026-04-28', reason_code: 'other', recorded_by_display: "A$&B$'C", recorded_at: '2026-06-01T05:30:00.000Z' },
      }),
    );
    expect(screen.getByTestId('membership-check-fee-bank-date')).toHaveTextContent("(recorded by A$&B$'C).");
  });

  it('a PASSING bank date ⇒ the bank line and ⛔ note', () => {
    show(
      preview({
        fee_outcome: 'before_death',
        fee_blocks_approval: false,
        fee_date_source: 'bank',
        fee_bank_date: { record_id: RECORD, bank_credit_date: '2026-04-28', reason_code: 'other', recorded_by_display: 'Meera', recorded_at: '2026-06-01T05:30:00.000Z' },
      }),
    );
    expect(screen.queryByTestId('membership-check-fee-after-death-note')).toBeNull();
    expect(screen.getByTestId('membership-check-fee-bank-date')).toHaveTextContent('2026-04-28');
  });

  it('⭐ `bank_date_changed` and `same_person` in their words; `bank_date_changed` refetches the preview and the packet', () => {
    expect(membershipCheckErrorMessage(new ApiError(409, 'membership_check.bank_date_changed', 'x'))).toBe(DL11.bankChanged);
    expect(membershipCheckErrorMessage(new ApiError(409, 'membership_check.same_person', 'x'))).toBe(DL11.samePerson);
    expect(MEMBERSHIP_CHECK_STALE_CODES.has('membership_check.bank_date_changed')).toBe(true);
  });

  it('⭐⭐ each of the three gate maps shows `bank_date_recorded`\'s OWN sentence — asserted ≠ the `not_checked` fallback', () => {
    for (const surface of ['console', 'final_vote', 'r9'] as const) {
      const words = membershipCheckRequiredMessage(new ApiError(409, 'x.membership_check_required', 'x', { reason: 'bank_date_recorded' }), surface);
      expect(words, surface).toBe(DL11.bankWait);
      expect(words, surface).not.toBe(mc.approveBlocked.not_checked);
    }
  });
});
