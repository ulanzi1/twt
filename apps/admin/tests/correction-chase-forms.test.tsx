// The correction chase's two FORMS, driven as a District Admin drives them (Story 6.19b, AC5, AC16; third-pass
// review 2026-09-30). The network is the only thing faked (`api/client.js`, function by function) — the real hooks,
// the real components and the real copy run.
//
// ⭐ What these pin, each a defect the review found in the shipped form: every refusal reads as its OWN line (⛔ never
// "could not be saved. Try again." for a size limit or a role); one delivery form PER undelivered letter, keyed by
// the letter (#2's proof never lands on #1); the file input is reset after a success; a missing field is a VISIBLE
// message, ⛔ never a silent return; the step-up is announced, focus moves, and a wrong code reads differently from a
// code that was never sent; the address can be hidden; a double click is one request.
// ⭐ Fourth pass (2026-10-01): the delivery's confirmation is driven THROUGH the panel with a queue that refetches
// (the per-letter form unmounts when its letter is delivered — a static-props harness hid that); ONE persistent
// status line is announced by its text CHANGING; the address window is measured on the browser's clock.
// ⭐ Fifth pass (2026-10-01): the address / step-up state clears whenever the record form is not shown (and a late reveal
// is discarded); ONE page-wide verify clock; an absolute deadline re-checked on `visibilitychange` / `focus`; every error
// through ONE classifier (read failure, 401, 403, 429); focus to the status line after a save; the dates checked
// before the upload; the `max` IS the IST today under a mocked clock.

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ClaimsUnderCorrectionResponse, CorrectionLetterDto } from '@twt/contracts';

const recordCorrectionLetter = vi.fn();
const recordCorrectionLetterDelivery = vi.fn();
const getCorrectionLetterAddress = vi.fn();
const requestStepUp = vi.fn();
const verifyStepUp = vi.fn();
const changeCorrectionMustAct = vi.fn();
const getClaimsUnderCorrection = vi.fn();
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
    getClaimsUnderCorrection: (p: string, o?: unknown) => getClaimsUnderCorrection(p, o),
  };
});

const { ApiError } = await import('../src/api/client.js');
const { CorrectionChasePanel, CorrectionLetterForm, MustActChangeForm, correctionChaseEn: t } = await import(
  '../src/modules/correction-chase/index.js'
);
const { ADDRESS_VISIBLE_MAX_MS, ADDRESS_VISIBLE_MIN_MS, addressVisibleMs, forgetStepUpVerified, returnLetters } = await import(
  '../src/modules/correction-chase/CorrectionLetterForm.js'
);
const { istToday } = await import('../src/modules/correction-chase/ist.js');
const { useClaimsUnderCorrection } = await import('../src/api/hooks.js');

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

/** The letter form with a `rerender` that keeps ONE query client — a refetch's new props, without a remount. */
function renderRerenderable(letters: CorrectionLetterDto[], canRecord = true) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const ui = (l: CorrectionLetterDto[], c: boolean) => (
    <QueryClientProvider client={qc}>
      <CorrectionLetterForm pariwarId={PARIWAR} claimCaseId={CLAIM} personKey={PERSON} letters={l} canRecord={c} />
    </QueryClientProvider>
  );
  const r = render(ui(letters, canRecord));
  return { rerender: (l: CorrectionLetterDto[], c: boolean) => r.rerender(ui(l, c)) };
}

beforeEach(() => {
  for (const f of [
    recordCorrectionLetter,
    recordCorrectionLetterDelivery,
    getCorrectionLetterAddress,
    requestStepUp,
    verifyStepUp,
    changeCorrectionMustAct,
    getClaimsUnderCorrection,
  ]) {
    f.mockReset();
  }
  // ⭐ The verify clock is PAGE-wide (module state) — ⛔ leaked from one test into the next.
  forgetStepUpVerified();
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
    await waitFor(() => expect(screen.getByTestId('letter-form-status').textContent).toBe(t.letters.saved));
    expect(screen.getByTestId('letter-form-status').getAttribute('role')).toBe('status');
    expect((screen.getByLabelText(t.letters.tracking) as HTMLInputElement).value).toBe('');
    // ⭐ Focus moves to the status line (`tabIndex` -1) — ⛔ dropped to <body> (fifth-pass review).
    await waitFor(() => expect(document.activeElement).toBe(screen.getByTestId('letter-form-status')));
  });

  it('⭐ `noValidate` on the letter and delivery forms — the native `required` bubble pre-empted the specific message', () => {
    renderLetterForm([letter({ letter_id: L2, sequence: 1, delivered_on: null })]);
    expect((screen.getByTestId(`delivery-form-${L2}`) as HTMLFormElement).noValidate).toBe(true);
    renderLetterForm([]);
    expect((screen.getByRole('form', { name: t.letters.record }) as HTMLFormElement).noValidate).toBe(true);
  });

  it('⛔ a double submit is ONE request — the guard is a ref, ⛔ the render-time `isPending`', async () => {
    let resolve: (v: unknown) => void = () => undefined;
    recordCorrectionLetter.mockReturnValue(new Promise((r) => (resolve = r)));
    renderLetterForm([]);
    fireEvent.change(screen.getByLabelText(t.letters.postedOn), { target: { value: '2026-09-25' } });
    fireEvent.change(screen.getByLabelText(t.letters.tracking), { target: { value: 'EE1' } });
    const form = screen.getByRole('form', { name: t.letters.record });
    fireEvent.submit(form);
    fireEvent.submit(form);
    await waitFor(() => expect(recordCorrectionLetter).toHaveBeenCalledTimes(1));
    await act(async () => resolve(letter({})));
    expect(recordCorrectionLetter).toHaveBeenCalledTimes(1);
  });

  it('⛔ a missing field is a VISIBLE message — ⛔ never a silent return', () => {
    renderLetterForm([]);
    fireEvent.submit(screen.getByRole('form', { name: t.letters.record }));
    expect(screen.getByRole('alert').textContent).toBe(t.letters.fieldsRequired);
    expect(recordCorrectionLetter).not.toHaveBeenCalled();
  });

  it.each([
    ['2026-09-30T18:29:59.000Z', '2026-09-30'],
    ['2026-09-30T18:30:00.000Z', '2026-10-01'],
  ])('⭐ under a clock at %s the posting and delivery dates’ `max` IS the IST today (%s) — ⛔ only its format', (iso, day) => {
    vi.useFakeTimers({ now: new Date(iso), toFake: ['Date'] });
    const first = renderLetterForm([]);
    const posted = (screen.getByLabelText(t.letters.postedOn) as HTMLInputElement).max;
    expect(posted).toBe(day);
    expect(posted).toBe(istToday());
    first.unmount();
    renderLetterForm([letter({})]);
    const delivered = (screen.getByTestId(`delivery-form-${L1}`).querySelector('input[type="date"]') as HTMLInputElement).max;
    expect(delivered).toBe(day);
    expect(delivered).toBe(istToday());
  });

  it('⛔ a FUTURE posting date is refused HERE (`noValidate` cancelled the `max`) — ⛔ a round trip', () => {
    renderLetterForm([]);
    fireEvent.change(screen.getByLabelText(t.letters.postedOn), { target: { value: '2999-01-01' } });
    fireEvent.change(screen.getByLabelText(t.letters.tracking), { target: { value: 'EE1' } });
    fireEvent.submit(screen.getByRole('form', { name: t.letters.record }));
    expect(screen.getByRole('alert').textContent).toBe(t.letters.refusals.date_in_future);
    expect(recordCorrectionLetter).not.toHaveBeenCalled();
  });

  it.each([
    ['correction_letter.first_not_delivered', 409, t.letters.refusals.first_not_delivered],
    ['correction_letter.posted_before_run', 409, t.letters.refusals.posted_before_run],
    ['correction_letter.date_in_future', 400, t.letters.refusals.date_in_future],
    ['correction_letter.limit_reached', 409, t.letters.refusals.limit_reached],
    // Fourth pass — `-231` D chronology (J4) and the hash failure that now fails CLOSED (J1, a retryable 503).
    ['correction_letter.posted_before_first_delivery', 409, t.letters.refusals.posted_before_first_delivery],
    ['correction_letter.number_unverified', 503, t.letters.refusals.number_unverified],
    ['auth.forbidden', 403, t.letters.forbidden],
    // Fifth pass — the session, the rate limit, and the neutral `not_letter_eligible` (D30 `undetermined` too).
    ['auth.session_required', 401, t.letters.sessionExpired],
    ['rate_limit.exceeded', 429, t.letters.rateLimited],
    ['correction_letter.not_letter_eligible', 409, t.letters.refusals.not_letter_eligible],
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
  it('⭐ #1 delivered, #2 not ⇒ ONE form, labelled "#2 posted <date>", and it records #2 — ⛔ never #1 (and, when the form stays — no refetch — its file input is reset)', async () => {
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
    // ⭐ Static props = no refetch, so the form STAYS: its uncontrolled file input is reset (the panel suite below
    // drives the real case, where the refetch removes the form).
    await waitFor(() => expect(fileInput.value).toBe(''));
    expect(fileInput.files?.length ?? 0).toBe(0);
    expect(screen.getByTestId('letter-form-status').textContent).toBe(t.letters.deliveryRecorded(2, '2026-09-20'));
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

  it.each([
    ['a FUTURE delivery date', '2999-01-01', t.letters.refusals.date_in_future],
    ['a delivery BEFORE the posting', '2026-08-31', t.letters.refusals.delivered_before_posted],
  ])('⛔ %s is refused HERE, BEFORE the upload (`noValidate` cancelled the `min`/`max`)', async (_label, date, copy) => {
    const user = userEvent.setup();
    renderLetterForm([letter({})]);
    const form = screen.getByTestId(`delivery-form-${L1}`);
    fireEvent.change(form.querySelector('input[type="date"]')!, { target: { value: date } });
    await user.upload(form.querySelector('input[type="file"]') as HTMLInputElement, new File(['x'], 'a.png', { type: 'image/png' }));
    fireEvent.submit(form);
    expect(screen.getByRole('alert').textContent).toBe(copy);
    expect(recordCorrectionLetterDelivery).not.toHaveBeenCalled();
  });

  it('⭐ a second delivery submitted while one is in flight SAYS so — ⛔ a silent return', async () => {
    const user = userEvent.setup();
    let resolve: (v: unknown) => void = () => undefined;
    recordCorrectionLetterDelivery.mockReturnValue(new Promise((r) => (resolve = r)));
    renderLetterForm([letter({}), letter({ letter_id: L2, sequence: 2, posted_on: '2026-09-20' })]);
    const forms = [screen.getByTestId(`delivery-form-${L1}`), screen.getByTestId(`delivery-form-${L2}`)];
    for (const form of forms) {
      fireEvent.change(form.querySelector('input[type="date"]')!, { target: { value: '2026-09-28' } });
      await user.upload(form.querySelector('input[type="file"]') as HTMLInputElement, new File(['x'], 'a.png', { type: 'image/png' }));
    }
    act(() => {
      fireEvent.submit(forms[0]!);
      fireEvent.submit(forms[1]!);
    });
    expect(screen.getByTestId('letter-form-status').textContent).toBe(t.letters.deliveryBusy);
    await waitFor(() => expect(recordCorrectionLetterDelivery).toHaveBeenCalledTimes(1));
    expect(recordCorrectionLetterDelivery.mock.calls[0]![2]).toBe(L1);
    await act(async () => resolve(letter({ delivered_on: '2026-09-28' })));
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
    // ⭐ A transport refusal with ⛔ no JSON code (a proxy's 413/415) reads by its STATUS — ⛔ "Try again".
    ['http.413', 413, t.letters.refusals.too_large],
    ['http.415', 415, t.letters.refusals.unsupported_media_type],
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
  const ADDRESS = '12 Gandhi Marg, Patna';
  const status = () => screen.getByTestId('letter-form-status');

  it('⭐ step-up: ONE persistent status line ANNOUNCES each step by its text changing; focus follows every swapped control', async () => {
    getCorrectionLetterAddress
      .mockRejectedValueOnce(new ApiError(403, 'auth.step_up_required', 'elevate'))
      .mockResolvedValueOnce({ person_key: PERSON, address: ADDRESS });
    requestStepUp.mockResolvedValue({ sent: true, expiresInSeconds: 300 });
    verifyStepUp.mockResolvedValue({ elevated: true, elevatedUntil: new Date(Date.now() + 300_000).toISOString() });
    renderLetterForm([]);

    // ⭐ The region EXISTS (empty) before the first prompt — a live region that mounts holding its text is silent.
    const region = status();
    expect(region.getAttribute('role')).toBe('status');
    expect(region.textContent).toBe('');

    fireEvent.click(screen.getByRole('button', { name: t.letters.showAddress }));
    await waitFor(() => expect(status().textContent).toBe(t.letters.stepUpIntro));
    expect(status()).toBe(region); // the SAME node — its text changed
    const send = screen.getByRole('button', { name: t.letters.sendCode });
    await waitFor(() => expect(document.activeElement).toBe(send));

    fireEvent.click(send);
    await waitFor(() => expect(status().textContent).toBe(t.letters.codeSent));
    expect(requestStepUp).toHaveBeenCalledWith('correction_letter_address');
    const code = screen.getByLabelText(t.letters.code);
    await waitFor(() => expect(document.activeElement).toBe(code));

    fireEvent.change(code, { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: t.letters.verify }));
    const address = await screen.findByTestId('letter-address');
    // ⛔ The address is in NO live region (it was read twice) — it is FOCUSED; the region says only that it is shown.
    expect(address.getAttribute('role')).toBeNull();
    expect(address.closest('[role="status"],[aria-live]')).toBeNull();
    expect(address.textContent).toContain(ADDRESS);
    await waitFor(() => expect(document.activeElement).toBe(address));
    expect(status().textContent).toBe(t.letters.addressShown);
    expect(status().textContent).not.toContain('Gandhi');
    // ⭐ The code is used — the code step is gone.
    expect(screen.queryByLabelText(t.letters.code)).toBeNull();

    // ⭐ Hide ⇒ focus moves to "Show the address" (the control that replaced Hide), ⛔ never <body>.
    fireEvent.click(screen.getByRole('button', { name: t.letters.hideAddress }));
    expect(screen.queryByTestId('letter-address')).toBeNull();
    expect(document.body.textContent).not.toContain('Gandhi Marg');
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: t.letters.showAddress })));
    expect(status().textContent).toBe(t.letters.addressHidden);
  });

  it('⛔ a WRONG code and a code that was never SENT read differently — and "Send a new code" IS there to press', async () => {
    getCorrectionLetterAddress.mockRejectedValue(new ApiError(403, 'auth.step_up_required', 'elevate'));
    requestStepUp
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({ sent: true, expiresInSeconds: 300 })
      .mockResolvedValueOnce({ sent: true, expiresInSeconds: 300 });
    verifyStepUp.mockRejectedValue(new ApiError(401, 'auth.step_up_failed', 'bad'));
    renderLetterForm([]);
    fireEvent.click(screen.getByRole('button', { name: t.letters.showAddress }));
    await waitFor(() => expect(status().textContent).toBe(t.letters.stepUpIntro));

    fireEvent.click(screen.getByRole('button', { name: t.letters.sendCode }));
    expect(await screen.findByRole('alert')).toHaveTextContent(t.letters.codeNotSent);

    fireEvent.click(screen.getByRole('button', { name: t.letters.sendCode }));
    await waitFor(() => expect(status().textContent).toBe(t.letters.codeSent));
    fireEvent.change(screen.getByLabelText(t.letters.code), { target: { value: '000000' } });
    fireEvent.click(screen.getByRole('button', { name: t.letters.verify }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(t.letters.codeWrong));
    expect(screen.getByRole('alert').textContent).not.toBe(t.letters.codeNotSent);

    // ⭐ The wrong-code line says "Send a new code" — the control exists in the `sent` state, and it sends one.
    fireEvent.click(screen.getByRole('button', { name: t.letters.resendCode }));
    await waitFor(() => expect(status().textContent).toBe(t.letters.codeResent));
    expect(requestStepUp).toHaveBeenCalledTimes(3);
    expect(screen.queryByRole('alert')).toBeNull();
    expect((screen.getByLabelText(t.letters.code) as HTMLInputElement).value).toBe('');
  });

  it('⭐ a reveal REFUSED after a successful verify leaves the code step (the code is used) and focus on "Show the address"', async () => {
    getCorrectionLetterAddress
      .mockRejectedValueOnce(new ApiError(403, 'auth.step_up_required', 'elevate'))
      .mockRejectedValueOnce(new ApiError(409, 'correction_letter.agreement_not_live', 'no'));
    requestStepUp.mockResolvedValue({ sent: true, expiresInSeconds: 300 });
    verifyStepUp.mockResolvedValue({ elevated: true, elevatedUntil: new Date(Date.now() + 300_000).toISOString() });
    renderLetterForm([]);
    fireEvent.click(screen.getByRole('button', { name: t.letters.showAddress }));
    fireEvent.click(await screen.findByRole('button', { name: t.letters.sendCode }));
    fireEvent.change(await screen.findByLabelText(t.letters.code), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: t.letters.verify }));
    expect(await screen.findByRole('alert')).toHaveTextContent(t.letters.refusals.agreement_not_live!);
    expect(screen.queryByTestId('letter-step-up')).toBeNull();
    expect(screen.queryByLabelText(t.letters.code)).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: t.letters.showAddress })));
  });

  it('⛔ "Show the address" is ONE request while in flight — a double click was two decrypts + two audit lines', async () => {
    let resolve: (v: unknown) => void = () => undefined;
    getCorrectionLetterAddress.mockReturnValue(new Promise((r) => (resolve = r)));
    renderLetterForm([]);
    const show = screen.getByRole('button', { name: t.letters.showAddress });
    // ⭐ Two clicks in ONE tick — both saw the render-time state; the ref guard is what holds.
    act(() => {
      show.click();
      show.click();
    });
    expect(show).toBeDisabled();
    expect(getCorrectionLetterAddress).toHaveBeenCalledTimes(1);
    await act(async () => resolve({ person_key: PERSON, address: 'X' }));
  });

  it('⭐ a revealed address CLEARS itself on a timer, and focus moves to "Show the address"', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    getCorrectionLetterAddress.mockResolvedValue({ person_key: PERSON, address: ADDRESS });
    renderLetterForm([]);
    fireEvent.click(screen.getByRole('button', { name: t.letters.showAddress }));
    const shown = await screen.findByTestId('letter-address');
    await waitFor(() => expect(document.activeElement).toBe(shown));
    await act(async () => {
      vi.advanceTimersByTime(ADDRESS_VISIBLE_MAX_MS + 1);
    });
    expect(screen.queryByTestId('letter-address')).toBeNull();
    expect(status().textContent).toBe(t.letters.addressHidden);
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: t.letters.showAddress })));
  });

  it('⛔ a SKEWED server clock cannot flash the address away — the window is measured on the browser, ⛔ from `elevatedUntil`', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    getCorrectionLetterAddress
      .mockRejectedValueOnce(new ApiError(403, 'auth.step_up_required', 'elevate'))
      .mockResolvedValueOnce({ person_key: PERSON, address: ADDRESS });
    requestStepUp.mockResolvedValue({ sent: true, expiresInSeconds: 300 });
    // The browser runs an hour fast: the server's window already "ended" by this clock.
    verifyStepUp.mockResolvedValue({ elevated: true, elevatedUntil: new Date(Date.now() - 3_600_000).toISOString() });
    renderLetterForm([]);
    fireEvent.click(screen.getByRole('button', { name: t.letters.showAddress }));
    fireEvent.click(await screen.findByRole('button', { name: t.letters.sendCode }));
    fireEvent.change(await screen.findByLabelText(t.letters.code), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: t.letters.verify }));
    await screen.findByTestId('letter-address');
    await act(async () => {
      vi.advanceTimersByTime(ADDRESS_VISIBLE_MIN_MS);
    });
    expect(screen.getByTestId('letter-address').textContent).toContain(ADDRESS);
  });

  it('⭐ the window is recomputed PER reveal — the rest of the step-up window, ⛔ never under the 30-second floor', () => {
    expect(addressVisibleMs(null)).toBe(ADDRESS_VISIBLE_MAX_MS);
    expect(addressVisibleMs(0)).toBe(ADDRESS_VISIBLE_MAX_MS);
    expect(addressVisibleMs(60_000)).toBe(ADDRESS_VISIBLE_MAX_MS - 60_000);
    expect(addressVisibleMs(ADDRESS_VISIBLE_MAX_MS - 1_000)).toBe(ADDRESS_VISIBLE_MIN_MS);
    expect(addressVisibleMs(10 * ADDRESS_VISIBLE_MAX_MS)).toBe(ADDRESS_VISIBLE_MIN_MS);
    // A clock that went BACKWARDS, or garbage ⇒ the whole window (⛔ a 0 ms flash).
    expect(addressVisibleMs(-5_000)).toBe(ADDRESS_VISIBLE_MAX_MS);
    expect(addressVisibleMs(Number.NaN)).toBe(ADDRESS_VISIBLE_MAX_MS);
    expect(ADDRESS_VISIBLE_MIN_MS).toBe(30_000);
  });
});

describe('<CorrectionLetterForm> — the address lifecycle (fifth-pass review 2026-10-01)', () => {
  const ADDRESS = '12 Gandhi Marg, Patna';

  it('⭐ the address CLEARS when the record form is no longer shown (a refetch flipped `canRecord`) — ⛔ back when it returns', async () => {
    getCorrectionLetterAddress.mockResolvedValue({ person_key: PERSON, address: ADDRESS });
    const view = renderRerenderable([], true);
    fireEvent.click(screen.getByRole('button', { name: t.letters.showAddress }));
    await screen.findByTestId('letter-address');
    view.rerender([], false);
    expect(screen.queryByTestId('letter-address')).toBeNull();
    await waitFor(() => expect(screen.getByTestId('letter-form-status').textContent).toBe(t.letters.addressHidden));
    view.rerender([], true);
    expect(screen.queryByTestId('letter-address')).toBeNull();
    expect(screen.getByRole('button', { name: t.letters.showAddress })).toBeInTheDocument();
    expect(document.body.textContent).not.toContain('Gandhi Marg');
  });

  it('⭐ the STEP-UP state clears too (the form waits for the first delivery, then returns) — ⛔ a stale code step', async () => {
    getCorrectionLetterAddress.mockRejectedValue(new ApiError(403, 'auth.step_up_required', 'elevate'));
    const view = renderRerenderable([], true);
    fireEvent.click(screen.getByRole('button', { name: t.letters.showAddress }));
    await screen.findByTestId('letter-step-up');
    view.rerender([letter({})], true);
    expect(screen.queryByTestId('letter-step-up')).toBeNull();
    view.rerender([letter({ delivered_on: '2026-09-10' })], true);
    expect(screen.getByRole('form', { name: t.letters.record })).toBeInTheDocument();
    expect(screen.queryByTestId('letter-step-up')).toBeNull();
  });

  it('⛔ a reveal that resolves AFTER the form hid is DISCARDED — ⛔ shown when the form returns', async () => {
    let resolve: (v: unknown) => void = () => undefined;
    getCorrectionLetterAddress.mockReturnValue(new Promise((r) => (resolve = r)));
    const view = renderRerenderable([], true);
    fireEvent.click(screen.getByRole('button', { name: t.letters.showAddress }));
    view.rerender([], false);
    await act(async () => resolve({ person_key: PERSON, address: ADDRESS }));
    view.rerender([], true);
    expect(screen.queryByTestId('letter-address')).toBeNull();
    expect(screen.getByTestId('letter-form-status').textContent).not.toBe(t.letters.addressShown);
    expect(document.body.textContent).not.toContain('Gandhi Marg');
  });

  it('⭐ ONE page-wide verify clock: a reveal in ANOTHER person’s form gets the REST of that elevation — ⛔ a fresh five minutes', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const OTHER = 'claimant';
    getCorrectionLetterAddress
      .mockRejectedValueOnce(new ApiError(403, 'auth.step_up_required', 'elevate'))
      .mockResolvedValue({ person_key: PERSON, address: ADDRESS });
    requestStepUp.mockResolvedValue({ sent: true, expiresInSeconds: 300 });
    verifyStepUp.mockResolvedValue({ elevated: true, elevatedUntil: new Date(Date.now() + 300_000).toISOString() });
    renderWithClient(
      <>
        <CorrectionLetterForm pariwarId={PARIWAR} claimCaseId={CLAIM} personKey={PERSON} letters={[]} canRecord />
        <CorrectionLetterForm pariwarId={PARIWAR} claimCaseId={CLAIM} personKey={OTHER} letters={[]} canRecord />
      </>,
    );
    const a = within(screen.getByTestId(`letter-form-${PERSON}`));
    const b = within(screen.getByTestId(`letter-form-${OTHER}`));
    // Form A verifies a code.
    fireEvent.click(a.getByRole('button', { name: t.letters.showAddress }));
    fireEvent.click(await a.findByRole('button', { name: t.letters.sendCode }));
    fireEvent.change(await a.findByLabelText(t.letters.code), { target: { value: '123456' } });
    fireEvent.click(a.getByRole('button', { name: t.letters.verify }));
    await a.findByTestId('letter-address');
    await act(async () => {
      vi.advanceTimersByTime(4 * 60_000);
    });
    // Form B reveals on the SAME elevation — one minute of it is left.
    fireEvent.click(b.getByRole('button', { name: t.letters.showAddress }));
    await b.findByTestId('letter-address');
    await act(async () => {
      vi.advanceTimersByTime(55_000);
    });
    expect(b.getByTestId('letter-address')).toBeInTheDocument();
    await act(async () => {
      vi.advanceTimersByTime(10_000);
    });
    expect(b.queryByTestId('letter-address')).toBeNull();
  });

  it.each([
    ['visibilitychange', () => document.dispatchEvent(new Event('visibilitychange'))],
    ['focus', () => window.dispatchEvent(new Event('focus'))],
  ])('⭐ the ABSOLUTE deadline is re-checked on `%s` — a slept laptop (⛔ the timer fired) still hides it', async (_label, fire) => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    getCorrectionLetterAddress.mockResolvedValue({ person_key: PERSON, address: ADDRESS });
    renderLetterForm([]);
    fireEvent.click(screen.getByRole('button', { name: t.letters.showAddress }));
    await screen.findByTestId('letter-address');
    // ⚠ The address arrived from a mocked promise OUTSIDE act — flush the passive effect that attaches the
    // `visibilitychange` / `focus` listeners, or under load the event fires before they exist (a ci:local flake).
    await act(async () => {});
    // The wall clock jumps past the deadline WITHOUT the timer firing (the machine slept).
    vi.setSystemTime(Date.now() + ADDRESS_VISIBLE_MAX_MS + 1_000);
    expect(screen.getByTestId('letter-address')).toBeInTheDocument();
    act(() => fire());
    expect(screen.queryByTestId('letter-address')).toBeNull();
    expect(screen.getByTestId('letter-form-status').textContent).toBe(t.letters.addressHidden);
  });

  it.each([
    [500, 'internal', t.letters.addressError],
    [401, 'auth.session_required', t.letters.sessionExpired],
    [403, 'auth.forbidden', t.letters.forbidden],
    [429, 'rate_limit.exceeded', t.letters.rateLimited],
    [409, 'correction_letter.not_letter_eligible', t.letters.refusals.not_letter_eligible],
  ])('⭐ a failed REVEAL (%s %s) reads as its own line — ⛔ "could not be saved"', async (status, code, copy) => {
    getCorrectionLetterAddress.mockRejectedValue(new ApiError(status, code, 'no'));
    renderLetterForm([]);
    fireEvent.click(screen.getByRole('button', { name: t.letters.showAddress }));
    expect(await screen.findByRole('alert')).toHaveTextContent(copy!);
    expect(screen.getByRole('alert').textContent).not.toBe(t.letters.error);
  });

  it.each([
    [403, 'auth.forbidden', t.letters.forbidden],
    [429, 'rate_limit.exceeded', t.letters.rateLimited],
    [401, 'auth.session_required', t.letters.sessionExpired],
  ])('⭐ "Send the code" refused (%s %s) goes through the ONE classifier — ⛔ "Try again"', async (status, code, copy) => {
    getCorrectionLetterAddress.mockRejectedValue(new ApiError(403, 'auth.step_up_required', 'elevate'));
    requestStepUp.mockRejectedValue(new ApiError(status, code, 'no'));
    renderLetterForm([]);
    fireEvent.click(screen.getByRole('button', { name: t.letters.showAddress }));
    fireEvent.click(await screen.findByRole('button', { name: t.letters.sendCode }));
    expect(await screen.findByRole('alert')).toHaveTextContent(copy);
  });

  it('⭐ the limit / second-letter line lives in a PERSISTENT status region — its content CHANGES, so it is announced', () => {
    const view = renderRerenderable([], true);
    const note = screen.getByTestId('letter-form-note');
    expect(note.getAttribute('role')).toBe('status');
    expect(note.textContent).toBe('');
    view.rerender([letter({})], true);
    expect(screen.getByTestId('letter-form-note')).toBe(note);
    expect(note.textContent).toBe(t.letters.secondWaitsForDelivery);
    view.rerender([letter({ delivered_on: '2026-09-10' }), letter({ letter_id: L2, sequence: 2, posted_on: '2026-09-20' })], true);
    expect(screen.getByTestId('letter-form-note')).toBe(note);
    expect(note.textContent).toBe(t.letters.limit);
  });
});

// ── K1 + `-273` §2 (Story 6.19c Task 0a): a person's letters span EVERY run of the live return — and ALL count ──────
describe('returnLetters — the two-letter rules read the RETURN’s letters (`-273` §2), ⛔ one run’s', () => {
  const run1 = [letter({ posted_on: '2026-09-02', delivered_on: '2026-09-05' }), letter({ letter_id: L2, sequence: 2, posted_on: '2026-09-08', delivered_on: '2026-09-11' })];

  it('⭐ every letter the queue lists counts (`counts_toward_limit: true`); a list without the flag counts them all', () => {
    const flagged = run1.map((l) => ({ ...l, counts_toward_limit: true }));
    expect(returnLetters(flagged).map((l) => l.letter_id)).toEqual([L1, L2]);
    expect(returnLetters(run1).map((l) => l.letter_id)).toEqual([L1, L2]);
    // A letter explicitly marked ⛔ counting is left out (⛔ a shape the queue sends today — the contract allows it).
    expect(returnLetters([letter({ counts_toward_limit: false })])).toEqual([]);
  });

  it('⭐ family → staff → family: run 1’s two delivered letters CAP the person — the record form is ⛔ offered; the limit line shows', () => {
    renderWithClient(<CorrectionLetterForm pariwarId={PARIWAR} claimCaseId={CLAIM} personKey={PERSON} letters={run1} canRecord />);
    expect(screen.queryByRole('form', { name: t.letters.record })).toBeNull();
    expect(screen.getByTestId('letter-form-note').textContent).toBe(t.letters.limit);
  });

  it('⭐ run 1’s ONE delivered letter ⇒ the second letter (in run 3) IS offered — it is the return’s second', () => {
    renderWithClient(
      <CorrectionLetterForm pariwarId={PARIWAR} claimCaseId={CLAIM} personKey={PERSON} letters={[run1[0]!]} canRecord />,
    );
    expect(screen.getByRole('form', { name: t.letters.record })).toBeInTheDocument();
  });

  it('⭐ an undelivered #1 of run 1 ⇒ its delivery form, and the second letter waits for it (whichever run is current)', () => {
    renderWithClient(
      <CorrectionLetterForm
        pariwarId={PARIWAR}
        claimCaseId={CLAIM}
        personKey={PERSON}
        letters={[letter({ posted_on: '2026-09-02', counts_toward_limit: true })]}
        canRecord
      />,
    );
    expect(screen.getByTestId(`delivery-form-${L1}`).getAttribute('aria-label')).toContain('#1 posted 2026-09-02');
    expect(screen.getByTestId('letter-second-waits')).toBeInTheDocument();
  });
});

describe('istToday — the IST calendar day (it turns at 18:30 UTC)', () => {
  it('⭐ 18:29:59Z is still the same IST day; 18:30:00Z is the next', () => {
    expect(istToday(new Date('2026-09-30T18:29:59.000Z'))).toBe('2026-09-30');
    expect(istToday(new Date('2026-09-30T18:30:00.000Z'))).toBe('2026-10-01');
    // Across a year end.
    expect(istToday(new Date('2026-12-31T18:30:00.000Z'))).toBe('2027-01-01');
  });
});

// ── Fourth pass (2026-10-01): the DELIVERY driven through the PANEL, with a queue that REFETCHES ───────────────────
describe('<CorrectionChasePanel> — a recorded delivery survives the refetch that marks it delivered', () => {
  type Item = ClaimsUnderCorrectionResponse['items'][number];
  type Person = Item['correction_chase']['people'][number];

  const item = (person: Person, over: Partial<Item['correction_chase']> = {}): Item => ({
    claim_case_id: CLAIM,
    deceased_member_id: '22222222-2222-4222-8222-222222222222',
    claim_state: 'verifier_approved',
    claim_filed_at: '2026-09-01T00:00:00.000Z',
    returned_at: '2026-09-19T10:00:00.000Z',
    returned_by_actor_display: 'Kalpana Bharti',
    return_note: { state: 'readable', value: 'note' },
    sent_back_by_check: false,
    accounts_complete: true,
    short_reference: '11111111',
    correction_chase: {
      return_decision_id: '55555555-5555-4555-8555-555555555555',
      must_act: 'family',
      must_act_set_by: 'Pariwar Admin Two',
      must_act_set_at: '2026-09-19T10:00:00.000Z',
      run: { kind: 'family', day0: '2026-09-19', day_count: 13, open: true, ended_on: null, next_reminder_on: null },
      cannot_remind: null,
      claimant_unresolved: false,
      awaiting_check: false,
      people: [person],
      escalated: false,
      ...over,
    },
  });

  function QueueHarness(): ReactElement {
    const q = useClaimsUnderCorrection(PARIWAR);
    const first = q.data?.items[0];
    return first === undefined ? <p>loading</p> : <CorrectionChasePanel pariwarId={PARIWAR} item={first} />;
  }

  it.each([
    ['still found dead', '2026-09-20'],
    // ⭐ The harder case: ⛔ no longer letter-eligible — the form was mounted ONLY for the undelivered letter, so the
    // refetch used to unmount the whole form along with its confirmation.
    ['no longer found dead (a new number)', null],
  ])('⭐ "Delivery recorded for letter #1." renders after the queue refetches the letter as delivered (%s)', async (_label, foundDeadOn) => {
    const user = userEvent.setup();
    let delivered = false;
    const person = (): Person => ({
      person_key: PERSON,
      role: 'nominee',
      rank: 1,
      status: foundDeadOn === null ? 'reached' : 'dead',
      found_dead_on: foundDeadOn,
      reminders_accepted: 1,
      letters: [letter({ delivered_on: delivered ? '2026-09-28' : null, has_screenshot: delivered })],
    });
    getClaimsUnderCorrection.mockImplementation(async () => ({ pariwar_id: PARIWAR, items: [item(person())] }));
    recordCorrectionLetterDelivery.mockImplementation(async () => {
      delivered = true;
      return letter({ delivered_on: '2026-09-28', has_screenshot: true });
    });
    renderWithClient(<QueueHarness />);

    const form = await screen.findByTestId(`delivery-form-${L1}`);
    fireEvent.change(form.querySelector('input[type="date"]')!, { target: { value: '2026-09-28' } });
    await user.upload(form.querySelector('input[type="file"]') as HTMLInputElement, new File(['png'], 'p.png', { type: 'image/png' }));
    fireEvent.submit(form);

    // ⭐ FIRST let the refetch land and render (the letter reads delivered, its delivery form is gone) and settle…
    await waitFor(() => expect(screen.getByTestId('letter-state').textContent).toContain('2026-09-28'));
    expect(screen.queryByTestId(`delivery-form-${L1}`)).toBeNull();
    expect(getClaimsUnderCorrection.mock.calls.length).toBeGreaterThanOrEqual(2);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });
    // …THEN the confirmation must STILL be on screen — ⛔ a line that flashed before the unmount does not count.
    expect(screen.getByTestId('letter-form-status').textContent).toBe(t.letters.deliveryRecorded(1, '2026-09-01'));
    expect(screen.queryByRole('alert')).toBeNull();
    // ⭐ The form that held focus is gone — focus is on the status line, ⛔ <body> (fifth-pass review).
    expect(document.activeElement).toBe(screen.getByTestId('letter-form-status'));
  });

  it('⭐ a refusal of the delivery is shown even when the refetch removes the form (already delivered elsewhere)', async () => {
    const user = userEvent.setup();
    let delivered = false;
    getClaimsUnderCorrection.mockImplementation(async () => ({
      pariwar_id: PARIWAR,
      items: [
        item({
          person_key: PERSON,
          role: 'nominee',
          rank: 1,
          status: 'dead',
          found_dead_on: '2026-09-20',
          reminders_accepted: 0,
          letters: [letter({ delivered_on: delivered ? '2026-09-27' : null })],
        }),
      ],
    }));
    recordCorrectionLetterDelivery.mockImplementation(async () => {
      delivered = true; // another admin recorded it first
      throw new ApiError(409, 'correction_letter.already_delivered', 'no');
    });
    renderWithClient(<QueueHarness />);
    const form = await screen.findByTestId(`delivery-form-${L1}`);
    fireEvent.change(form.querySelector('input[type="date"]')!, { target: { value: '2026-09-28' } });
    await user.upload(form.querySelector('input[type="file"]') as HTMLInputElement, new File(['png'], 'p.png', { type: 'image/png' }));
    fireEvent.submit(form);
    await waitFor(() => expect(screen.queryByTestId(`delivery-form-${L1}`)).toBeNull());
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });
    expect(screen.getByRole('alert')).toHaveTextContent(t.letters.refusals.already_delivered!);
  });

  it('⭐ D30 (`cannot_remind`): the person and their letter STAY, the delivery form stays — ⛔ no NEW-letter form', async () => {
    getClaimsUnderCorrection.mockResolvedValue({
      pariwar_id: PARIWAR,
      items: [
        item(
          {
            person_key: PERSON,
            role: 'nominee',
            // J6 — under D30 a nominee arrives WITHOUT a rank.
            rank: null,
            status: 'dead',
            found_dead_on: '2026-09-20',
            reminders_accepted: 0,
            letters: [letter({}), letter({ letter_id: L2, sequence: 2, posted_on: '2026-09-10', delivered_on: '2026-09-15' })],
          },
          { cannot_remind: 'agreement_not_live' },
        ),
      ],
    });
    renderWithClient(<QueueHarness />);
    expect(await screen.findByTestId(`delivery-form-${L1}`)).toBeInTheDocument();
    expect(screen.queryByRole('form', { name: t.letters.record })).toBeNull();
    expect(screen.queryByTestId('letter-second-waits')).toBeNull();
    expect(screen.getByTestId(`person-${PERSON}`).textContent).toContain(t.people.nominee);
    expect(screen.getByTestId(`person-${PERSON}`).textContent).not.toContain('null');
  });

  it('⭐ D30 with ⛔ no letter yet: ⛔ no new-letter form (the family cannot be contacted)', async () => {
    getClaimsUnderCorrection.mockResolvedValue({
      pariwar_id: PARIWAR,
      items: [
        item(
          { person_key: PERSON, role: 'nominee', rank: null, status: 'dead', found_dead_on: '2026-09-20', reminders_accepted: 0, letters: [] },
          { cannot_remind: 'no_contact_record' },
        ),
      ],
    });
    renderWithClient(<QueueHarness />);
    expect(await screen.findByTestId(`person-${PERSON}`)).toBeInTheDocument();
    expect(screen.queryByTestId(`letter-form-${PERSON}`)).toBeNull();
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
