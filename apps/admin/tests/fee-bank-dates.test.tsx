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

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FEE_BANK_DATE_REFUSAL_REASONS, FEE_BANK_DATE_STEP_UP_CONTEXT } from '@twt/contracts';
import type { FeeBankDateListResponse, FeeBankDateListRow, MembershipCheckGateStatus, MembershipCheckPreviewResponse } from '@twt/contracts';

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

const getFeeBankDates = vi.fn();
const postFeeBankDate = vi.fn();
const requestStepUp = vi.fn();
const verifyStepUp = vi.fn();
vi.mock('../src/api/client.js', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    getSession: async () => ({ userId: '11111111-1111-4111-8111-111111111111', nationalGrants: [] }),
    getFeeBankDates: (...a: unknown[]) => getFeeBankDates(...a),
    postFeeBankDate: (...a: unknown[]) => postFeeBankDate(...a),
    requestStepUp: (...a: unknown[]) => requestStepUp(...a),
    verifyStepUp: (...a: unknown[]) => verifyStepUp(...a),
  };
});

const { ApiError } = await import('../src/api/client.js');
const { MEMBERSHIP_CHECK_STALE_CODES } = await import('../src/api/hooks.js');
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

function wrap(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
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
});
afterEach(() => cleanup());

describe('the finance officer’s page (DL10, DL11)', () => {
  it('⭐ the copy is DL11 word for word', () => {
    expect([t.heading, t.intro, t.nav, t.empty, t.truncated, t.recordedHeading, t.forbidden, t.recorded]).toEqual([
      DL11.heading, DL11.intro, DL11.nav, DL11.empty, DL11.cut, DL11.second, DL11.noAccess, DL11.recorded,
    ]);
    expect(t.prompts).toEqual({ referenceEmpty: DL11.promptRefEmpty, referenceShape: DL11.promptRefShape, date: DL11.promptDate, reason: DL11.promptReason, note: DL11.promptNote });
    expect(mc.feeAfterDeathNoteRecorded).toBe(DL11.amendedNote);
    expect(mc.feeAfterDeathNote).toBe(DL11.todaysNote); // today's note, unchanged
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
    expect(screen.getByTestId('nav-fee-bank-dates')).toHaveTextContent(DL11.nav);
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
    expect(await screen.findByTestId(`fee-bank-date-recorded-${CLAIM}`)).toHaveTextContent(DL11.recorded);
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
    expect(await screen.findByTestId('fee-bank-date-refused')).toHaveTextContent(DL11.stale);
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
    // ⛔ the refusal line for a step-up — the panel is the answer.
    expect(screen.queryByTestId('fee-bank-date-refused')).toBeNull();
    fireEvent.click(within(hold).getByRole('button', { name: stepUpEn.send }));
    fireEvent.change(await screen.findByTestId('fee-bank-date-step-up-code'), { target: { value: '123456' } });
    fireEvent.click(screen.getByTestId('fee-bank-date-step-up-verify'));
    expect(await screen.findByTestId(`fee-bank-date-recorded-${CLAIM}`)).toHaveTextContent(DL11.recorded);
    expect(requestStepUp).toHaveBeenCalledWith(FEE_BANK_DATE_STEP_UP_CONTEXT);
    expect(postFeeBankDate).toHaveBeenCalledTimes(2);
    expect(postFeeBankDate.mock.calls[1]).toEqual(postFeeBankDate.mock.calls[0]);
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
