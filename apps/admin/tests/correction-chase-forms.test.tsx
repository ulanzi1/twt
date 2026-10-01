// The correction chase's two FORMS, driven as a District Admin drives them (Story 6.19b, AC5, AC16; third-pass
// review 2026-09-30). The network is the only thing faked (`api/client.js`, function by function) — the real hooks,
// the real components and the real copy run.
//
// ⭐ What these pin, each a defect the review found in the shipped form: every refusal reads as its OWN line (⛔ never
// "could not be saved. Try again." for a size limit or a role); one delivery form PER undelivered letter, keyed by
// the letter (#2's proof never lands on #1); the file input is reset after a success; a missing field is a VISIBLE
// message, ⛔ never a silent return; the step-up is announced, focus moves, and a wrong code reads differently from a
// code that was never sent; the address can be hidden; a double click is one request.

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CorrectionLetterDto } from '@twt/contracts';

const recordCorrectionLetter = vi.fn();
const recordCorrectionLetterDelivery = vi.fn();
const getCorrectionLetterAddress = vi.fn();
const requestStepUp = vi.fn();
const verifyStepUp = vi.fn();
const changeCorrectionMustAct = vi.fn();
vi.mock('../src/api/client.js', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    recordCorrectionLetter: (p: string, c: string, b: unknown) => recordCorrectionLetter(p, c, b),
    recordCorrectionLetterDelivery: (p: string, c: string, l: string, d: string, f: File) =>
      recordCorrectionLetterDelivery(p, c, l, d, f),
    getCorrectionLetterAddress: (p: string, c: string, k: string) => getCorrectionLetterAddress(p, c, k),
    requestStepUp: (ctx: string) => requestStepUp(ctx),
    verifyStepUp: (otp: string) => verifyStepUp(otp),
    changeCorrectionMustAct: (p: string, c: string, b: unknown) => changeCorrectionMustAct(p, c, b),
  };
});

const { ApiError } = await import('../src/api/client.js');
const { CorrectionLetterForm, MustActChangeForm, correctionChaseEn: t } = await import(
  '../src/modules/correction-chase/index.js'
);

const PARIWAR = '44444444-4444-4444-8444-444444444444';
const CLAIM = '11111111-1111-4111-8111-111111111111';
const PERSON = 'nominee:66666666-6666-4666-8666-666666666666';
const L1 = '77777777-7777-4777-8777-777777777777';
const L2 = '88888888-8888-4888-8888-888888888888';

const letter = (over: Partial<CorrectionLetterDto>): CorrectionLetterDto => ({
  letter_id: L1,
  person_key: PERSON,
  sequence: 1,
  posted_on: '2026-09-01',
  delivered_on: null,
  overdue: false,
  has_screenshot: false,
  ...over,
});

function renderWithClient(ui: ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

const renderLetterForm = (letters: CorrectionLetterDto[], canRecord = true) =>
  renderWithClient(
    <CorrectionLetterForm pariwarId={PARIWAR} claimCaseId={CLAIM} personKey={PERSON} letters={letters} canRecord={canRecord} />,
  );

beforeEach(() => {
  for (const f of [
    recordCorrectionLetter,
    recordCorrectionLetterDelivery,
    getCorrectionLetterAddress,
    requestStepUp,
    verifyStepUp,
    changeCorrectionMustAct,
  ]) {
    f.mockReset();
  }
});
afterEach(() => {
  vi.useRealTimers();
});

describe('<CorrectionLetterForm> — recording a posted letter', () => {
  it('⭐ records the letter (person, date, trimmed tracking number), says "Saved." and clears the fields', async () => {
    recordCorrectionLetter.mockResolvedValue(letter({}));
    renderLetterForm([]);
    fireEvent.change(screen.getByLabelText(t.letters.postedOn), { target: { value: '2026-09-25' } });
    fireEvent.change(screen.getByLabelText(t.letters.tracking), { target: { value: '  EE123456789IN ' } });
    fireEvent.click(screen.getByRole('button', { name: t.letters.save }));
    await waitFor(() => expect(recordCorrectionLetter).toHaveBeenCalledTimes(1));
    expect(recordCorrectionLetter).toHaveBeenCalledWith(PARIWAR, CLAIM, {
      person_key: PERSON,
      posted_on: '2026-09-25',
      tracking_number: 'EE123456789IN',
    });
    await waitFor(() => expect(screen.getByText(t.letters.saved)).toBeInTheDocument());
    expect((screen.getByLabelText(t.letters.tracking) as HTMLInputElement).value).toBe('');
  });

  it('⛔ a missing field is a VISIBLE message — ⛔ never a silent return', () => {
    renderLetterForm([]);
    fireEvent.submit(screen.getByRole('form', { name: t.letters.record }));
    expect(screen.getByRole('alert').textContent).toBe(t.letters.fieldsRequired);
    expect(recordCorrectionLetter).not.toHaveBeenCalled();
  });

  it('⭐ the posting date cannot be later than today (IST)', () => {
    renderLetterForm([]);
    expect((screen.getByLabelText(t.letters.postedOn) as HTMLInputElement).max).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it.each([
    ['correction_letter.first_not_delivered', 409, t.letters.refusals.first_not_delivered],
    ['correction_letter.posted_before_run', 409, t.letters.refusals.posted_before_run],
    ['correction_letter.date_in_future', 400, t.letters.refusals.date_in_future],
    ['correction_letter.limit_reached', 409, t.letters.refusals.limit_reached],
    ['auth.forbidden', 403, t.letters.forbidden],
  ])('⭐ the refusal %s reads as its OWN line', async (code, status, copy) => {
    recordCorrectionLetter.mockRejectedValue(new ApiError(status, code, 'no'));
    renderLetterForm([]);
    fireEvent.change(screen.getByLabelText(t.letters.postedOn), { target: { value: '2026-09-25' } });
    fireEvent.change(screen.getByLabelText(t.letters.tracking), { target: { value: 'EE1' } });
    fireEvent.click(screen.getByRole('button', { name: t.letters.save }));
    expect(await screen.findByRole('alert')).toHaveTextContent(copy!);
    expect(screen.getByRole('alert').textContent).not.toBe(t.letters.error);
  });

  it('⛔ `-231` D — while the first letter is undelivered, ⛔ no second-letter form; it says why', () => {
    renderLetterForm([letter({})]);
    expect(screen.queryByRole('form', { name: t.letters.record })).toBeNull();
    expect(screen.getByTestId('letter-second-waits').textContent).toBe(t.letters.secondWaitsForDelivery);
    // …and the first letter's delivery stays recordable.
    expect(screen.getByTestId(`delivery-form-${L1}`)).toBeInTheDocument();
  });

  it('⭐ a person no longer found dead keeps the DELIVERY form for a posted letter — ⛔ no new-letter form', () => {
    renderLetterForm([letter({})], false);
    expect(screen.queryByRole('form', { name: t.letters.record })).toBeNull();
    expect(screen.queryByTestId('letter-second-waits')).toBeNull();
    expect(screen.getByTestId(`delivery-form-${L1}`)).toBeInTheDocument();
  });
});

describe('<CorrectionLetterForm> — the delivery, ONE form per undelivered letter', () => {
  it('⭐ #1 delivered, #2 not ⇒ ONE form, labelled "#2 posted <date>", and it records #2 — ⛔ never #1', async () => {
    const user = userEvent.setup();
    recordCorrectionLetterDelivery.mockResolvedValue(letter({ letter_id: L2, sequence: 2, delivered_on: '2026-09-28' }));
    renderLetterForm([
      letter({ delivered_on: '2026-09-10' }),
      letter({ letter_id: L2, sequence: 2, posted_on: '2026-09-20' }),
    ]);
    expect(screen.queryByTestId(`delivery-form-${L1}`)).toBeNull();
    const form = screen.getByTestId(`delivery-form-${L2}`);
    expect(form.getAttribute('aria-label')).toContain('#2 posted 2026-09-20');
    const date = form.querySelector('input[type="date"]') as HTMLInputElement;
    expect(date.min).toBe('2026-09-20');
    fireEvent.change(date, { target: { value: '2026-09-28' } });
    const fileInput = form.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(fileInput, new File(['png'], 'proof.png', { type: 'image/png' }));
    fireEvent.submit(form);
    await waitFor(() => expect(recordCorrectionLetterDelivery).toHaveBeenCalledTimes(1));
    expect(recordCorrectionLetterDelivery.mock.calls[0]![2]).toBe(L2);
    expect(recordCorrectionLetterDelivery.mock.calls[0]![3]).toBe('2026-09-28');
    // ⭐ The uncontrolled file input is RESET after the success — it kept the old file, and the next submit no-oped.
    await waitFor(() => expect(fileInput.value).toBe(''));
    expect(fileInput.files?.length ?? 0).toBe(0);
  });

  it('⭐ two undelivered letters (older data) ⇒ two forms, each recording ITS letter', async () => {
    const user = userEvent.setup();
    recordCorrectionLetterDelivery.mockResolvedValue(letter({ delivered_on: '2026-09-28' }));
    renderLetterForm([letter({}), letter({ letter_id: L2, sequence: 2, posted_on: '2026-09-20' })]);
    expect(screen.getByTestId(`delivery-form-${L1}`)).toBeInTheDocument();
    const form2 = screen.getByTestId(`delivery-form-${L2}`);
    fireEvent.change(form2.querySelector('input[type="date"]')!, { target: { value: '2026-09-28' } });
    await user.upload(form2.querySelector('input[type="file"]') as HTMLInputElement, new File(['x'], 'b.webp', { type: 'image/webp' }));
    fireEvent.submit(form2);
    await waitFor(() => expect(recordCorrectionLetterDelivery).toHaveBeenCalledTimes(1));
    expect(recordCorrectionLetterDelivery.mock.calls[0]![2]).toBe(L2);
  });

  it('⛔ no file ⇒ a VISIBLE message, nothing posted', () => {
    renderLetterForm([letter({})]);
    const form = screen.getByTestId(`delivery-form-${L1}`);
    fireEvent.change(form.querySelector('input[type="date"]')!, { target: { value: '2026-09-28' } });
    fireEvent.submit(form);
    expect(screen.getByRole('alert').textContent).toBe(t.letters.deliveryFieldsRequired);
    expect(recordCorrectionLetterDelivery).not.toHaveBeenCalled();
  });

  it.each([
    ['correction_letter.too_large', 413, t.letters.refusals.too_large],
    ['correction_letter.unsupported_media_type', 415, t.letters.refusals.unsupported_media_type],
    ['correction_letter.empty', 400, t.letters.refusals.empty],
    ['correction_letter.date_in_future', 400, t.letters.refusals.date_in_future],
    ['correction_letter.already_delivered', 409, t.letters.refusals.already_delivered],
    ['auth.forbidden', 403, t.letters.forbidden],
  ])('⭐ the upload refusal %s reads as its OWN line', async (code, status, copy) => {
    const user = userEvent.setup();
    recordCorrectionLetterDelivery.mockRejectedValue(new ApiError(status, code, 'no'));
    renderLetterForm([letter({})]);
    const form = screen.getByTestId(`delivery-form-${L1}`);
    fireEvent.change(form.querySelector('input[type="date"]')!, { target: { value: '2026-09-28' } });
    await user.upload(form.querySelector('input[type="file"]') as HTMLInputElement, new File(['x'], 'a.png', { type: 'image/png' }));
    fireEvent.submit(form);
    expect(await screen.findByRole('alert')).toHaveTextContent(copy!);
  });
});

describe('<CorrectionLetterForm> — the address, behind a fresh step-up', () => {
  it('⭐ step-up: the prompt and "code sent" are ANNOUNCED, focus moves to the code, then to the address; Hide clears it', async () => {
    getCorrectionLetterAddress
      .mockRejectedValueOnce(new ApiError(403, 'auth.step_up_required', 'elevate'))
      .mockResolvedValueOnce({ person_key: PERSON, address: '12 Gandhi Marg, Patna' });
    requestStepUp.mockResolvedValue({ sent: true, expiresInSeconds: 300 });
    verifyStepUp.mockResolvedValue({ elevated: true, elevatedUntil: new Date(Date.now() + 300_000).toISOString() });
    renderLetterForm([]);

    fireEvent.click(screen.getByRole('button', { name: t.letters.showAddress }));
    const status = await screen.findByTestId('letter-step-up-status');
    expect(status.getAttribute('role')).toBe('status');
    expect(status.textContent).toBe(t.letters.stepUpIntro);

    fireEvent.click(screen.getByRole('button', { name: t.letters.sendCode }));
    await waitFor(() => expect(screen.getByTestId('letter-step-up-status').textContent).toBe(t.letters.codeSent));
    expect(requestStepUp).toHaveBeenCalledWith('correction_letter_address');
    const code = screen.getByLabelText(t.letters.code);
    await waitFor(() => expect(document.activeElement).toBe(code));

    fireEvent.change(code, { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: t.letters.verify }));
    const address = await screen.findByTestId('letter-address');
    expect(address.getAttribute('role')).toBe('status');
    expect(address.textContent).toContain('12 Gandhi Marg, Patna');
    await waitFor(() => expect(document.activeElement).toBe(address));

    fireEvent.click(screen.getByRole('button', { name: t.letters.hideAddress }));
    expect(screen.queryByTestId('letter-address')).toBeNull();
    expect(document.body.textContent).not.toContain('Gandhi Marg');
  });

  it('⛔ a WRONG code and a code that was never SENT read differently — ⛔ neither "could not be saved"', async () => {
    getCorrectionLetterAddress.mockRejectedValue(new ApiError(403, 'auth.step_up_required', 'elevate'));
    requestStepUp.mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce({ sent: true, expiresInSeconds: 300 });
    verifyStepUp.mockRejectedValue(new ApiError(401, 'auth.step_up_failed', 'bad'));
    renderLetterForm([]);
    fireEvent.click(screen.getByRole('button', { name: t.letters.showAddress }));
    await screen.findByTestId('letter-step-up-status');

    fireEvent.click(screen.getByRole('button', { name: t.letters.sendCode }));
    expect(await screen.findByRole('alert')).toHaveTextContent(t.letters.codeNotSent);

    fireEvent.click(screen.getByRole('button', { name: t.letters.sendCode }));
    await waitFor(() => expect(screen.getByTestId('letter-step-up-status').textContent).toBe(t.letters.codeSent));
    fireEvent.change(screen.getByLabelText(t.letters.code), { target: { value: '000000' } });
    fireEvent.click(screen.getByRole('button', { name: t.letters.verify }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(t.letters.codeWrong));
    expect(screen.getByRole('alert').textContent).not.toBe(t.letters.codeNotSent);
  });

  it('⛔ "Show the address" is ONE request while in flight — a double click was two decrypts + two audit lines', async () => {
    let resolve: (v: unknown) => void = () => undefined;
    getCorrectionLetterAddress.mockReturnValue(new Promise((r) => (resolve = r)));
    renderLetterForm([]);
    const show = screen.getByRole('button', { name: t.letters.showAddress });
    fireEvent.click(show);
    fireEvent.click(show);
    expect(show).toBeDisabled();
    expect(getCorrectionLetterAddress).toHaveBeenCalledTimes(1);
    await act(async () => resolve({ person_key: PERSON, address: 'X' }));
  });

  it('⭐ a revealed address CLEARS itself on a timer (the step-up window)', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    getCorrectionLetterAddress.mockResolvedValue({ person_key: PERSON, address: '12 Gandhi Marg, Patna' });
    renderLetterForm([]);
    fireEvent.click(screen.getByRole('button', { name: t.letters.showAddress }));
    await screen.findByTestId('letter-address');
    await act(async () => {
      vi.advanceTimersByTime(5 * 60 * 1000 + 1);
    });
    expect(screen.queryByTestId('letter-address')).toBeNull();
    expect(screen.getByTestId('letter-address-hidden').textContent).toBe(t.letters.addressHidden);
  });
});

describe('<MustActChangeForm> — change who must act', () => {
  const renderMustAct = (current: 'family' | 'staff' | null = 'family') =>
    renderWithClient(<MustActChangeForm pariwarId={PARIWAR} claimCaseId={CLAIM} current={current} />);

  it('⭐ submits the OTHER value with the trimmed note, then says "Saved."', async () => {
    changeCorrectionMustAct.mockResolvedValue({ claim_case_id: CLAIM, must_act: 'staff', opened_run: null });
    renderMustAct('family');
    fireEvent.click(screen.getByRole('radio', { name: t.mustAct.staff }));
    fireEvent.change(screen.getByLabelText(t.mustAct.note), { target: { value: '  the bank typed it wrong ' } });
    fireEvent.click(screen.getByRole('button', { name: t.mustAct.submit }));
    await waitFor(() => expect(changeCorrectionMustAct).toHaveBeenCalledTimes(1));
    expect(changeCorrectionMustAct).toHaveBeenCalledWith(PARIWAR, CLAIM, { must_act: 'staff', note: 'the bank typed it wrong' });
    await waitFor(() => expect(screen.getByText(t.mustAct.saved)).toBeInTheDocument());
  });

  it('⛔ an empty note posts nothing and asks for one', () => {
    renderMustAct('family');
    fireEvent.click(screen.getByRole('radio', { name: t.mustAct.staff }));
    fireEvent.click(screen.getByRole('button', { name: t.mustAct.submit }));
    expect(changeCorrectionMustAct).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toBe(t.mustAct.noteRequired);
  });

  it.each([
    [409, 'must_act.unchanged', t.mustAct.unchanged],
    [409, 'must_act.no_live_return', t.mustAct.noLiveReturn],
    [403, 'auth.forbidden', t.mustAct.forbidden],
    [500, 'internal', t.mustAct.error],
  ])('⭐ a %s %s maps to its own line', async (status, code, copy) => {
    changeCorrectionMustAct.mockRejectedValue(new ApiError(status, code, 'no'));
    renderMustAct('family');
    fireEvent.click(screen.getByRole('radio', { name: t.mustAct.staff }));
    fireEvent.change(screen.getByLabelText(t.mustAct.note), { target: { value: 'why' } });
    fireEvent.click(screen.getByRole('button', { name: t.mustAct.submit }));
    expect(await screen.findByRole('alert')).toHaveTextContent(copy);
    // ⭐ A failure keeps the typed note.
    expect((screen.getByLabelText(t.mustAct.note) as HTMLTextAreaElement).value).toBe('why');
  });
});
