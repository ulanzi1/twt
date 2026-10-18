// Story 6.37c (LD10, LD11, LD12; AC7, AC9) — the delivery ladder's lines and the CALL form, driven as a District Admin
// drives them. The network is the only thing faked (`api/client.js`, function by function) — the real hooks, the real
// components and the real copy run; ONE leg drives the REAL client over a stubbed `fetch` to pin the `Idempotency-Key`.
//
// ⭐ What these pin: "Follow-up running — next step on <date>" (`2026-10-18-363` d2); "Texts were reported not delivered — <the ask>" for each
// ask; the reminders the network said were not delivered; the call list; the certificate list's REASON-AWARE owed-letter
// line; the form — "it reached the family" only when the person or a family member answered, ONE key per attempt (kept
// across a retry, renewed after a success), the step-up number reveal (elevate ⇒ retry ⇒ number shown), the nominee
// refusal in plain words. Round 2: Enter in the code box verifies (P2); "Call recorded." outlives the refetch that withdraws
// the form, on both surfaces (P3); an EDITED retry is a new key (P4); ⛔ form for ask `letter` (P6); the named radio group
// and the disabled option's reason (P30); a missing display name reads its own line (P29).

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CertificateRemindersResponse, ClaimsUnderCorrectionResponse, ContactCallDto } from '@twt/contracts';

const recordCorrectionContactCall = vi.fn();
const recordCertificateContactCall = vi.fn();
const getCorrectionContactCallNumber = vi.fn();
const requestStepUp = vi.fn();
const verifyStepUp = vi.fn();
vi.mock('../src/api/client.js', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    recordCorrectionContactCall: (p: string, c: string, b: unknown, k: string) => recordCorrectionContactCall(p, c, b, k),
    recordCertificateContactCall: (p: string, c: string, b: unknown, k: string) => recordCertificateContactCall(p, c, b, k),
    getCorrectionContactCallNumber: (p: string, c: string, k: string) => getCorrectionContactCallNumber(p, c, k),
    requestStepUp: (ctx: string) => requestStepUp(ctx),
    verifyStepUp: (otp: string) => verifyStepUp(otp),
  };
});

const { ApiError } = await import('../src/api/client.js');
const { CorrectionChasePanel, ContactCallForm, correctionChaseEn: t } = await import('../src/modules/correction-chase/index.js');
const { forgetStepUpVerified } = await import('../src/modules/correction-chase/CorrectionLetterForm.js');
const { canBeReached, callFormOffered } = await import('../src/modules/correction-chase/ContactCallForm.js');
const { CertificateRemindersList } = await import('../src/modules/certificate-reminders/CertificateRemindersList.js');
const { certificateRemindersEn } = await import('../src/modules/certificate-reminders/i18n-en.js');
const { istToday } = await import('../src/modules/correction-chase/ist.js');

const PARIWAR = '44444444-4444-4444-8444-444444444444';
const CLAIM = '11111111-1111-4111-8111-111111111111';
const PERSON = 'nominee:66666666-6666-4666-8666-666666666666';

type Item = ClaimsUnderCorrectionResponse['items'][number];
type Person = Item['correction_chase']['people'][number];
type CertItem = CertificateRemindersResponse['items'][number];
type CertPerson = CertItem['people'][number];

const CALL: ContactCallDto = {
  call_id: '99999999-9999-4999-8999-999999999999',
  person_key: PERSON,
  chase: 'correction',
  called_on: '2026-10-20',
  answered_by: 'family_member',
  outcome: 'reached',
  recorded_by: 'District Admin One',
  recorded_at: '2026-10-20T06:00:00.000Z',
};

const person = (over: Partial<Person> = {}): Person => ({
  person_key: PERSON,
  role: 'nominee',
  rank: 1,
  status: 'unreachable',
  found_dead_on: null,
  reminders_accepted: 1,
  letters: [],
  follow_up: null,
  unreachable_reason: null,
  reported_undelivered: 0,
  ask: null,
  calls: [],
  ...over,
});

const item = (people: Person[]): Item =>
  ({
    claim_case_id: CLAIM,
    short_reference: '11111111',
    correction_chase: {
      return_decision_id: '22222222-2222-4222-8222-222222222222',
      must_act: 'family',
      must_act_set_by: 'Pariwar Admin',
      must_act_set_at: '2026-09-19T10:00:00.000Z',
      run: { kind: 'family', day0: '2026-09-19', day_count: 12, open: true, ended_on: null, next_reminder_on: '2026-10-03' },
      cannot_remind: null,
      claimant_unresolved: false,
      awaiting_check: false,
      people,
      escalated: false,
    },
  }) as unknown as Item;

function wrap(ui: ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  forgetStepUpVerified();
  for (const f of [recordCorrectionContactCall, recordCertificateContactCall, getCorrectionContactCallNumber, requestStepUp, verifyStepUp]) f.mockReset();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('the delivery ladder lines (LD12)', () => {
  it('⭐ a RUNNING follow-up says so with its next date, and the call form is offered', () => {
    wrap(
      <CorrectionChasePanel
        pariwarId={PARIWAR}
        item={item([person({ follow_up: { state: 'running', started_on: '2026-10-11', next_step_on: '2026-10-12', concluded_on: null }, reported_undelivered: 1 })])}
      />,
    );
    const row = screen.getByTestId(`person-${PERSON}`);
    expect(within(row).getByTestId('ladder-follow-up').textContent).toBe('Follow-up running — next step on 2026-10-12.');
    expect(within(row).getByTestId('ladder-follow-up').getAttribute('role')).toBe('status');
    expect(within(row).getByTestId('ladder-reported-undelivered').textContent).toBe('1 reminder the network said was not delivered.');
    expect(within(row).getByTestId(`call-form-${PERSON}`)).toBeTruthy();
  });

  it.each([
    ['call_or_letter', 'phone the family or post them a letter'],
    ['call', 'phone the family (the letter limit is reached)'],
    ['letter', 'post them a letter'],
    ['none', 'neither a call nor a letter is possible — escalate it'],
  ] as const)('⭐ a concluded follow-up with ask %s reads "Texts were reported not delivered — %s"', (ask, words) => {
    wrap(
      <CorrectionChasePanel
        pariwarId={PARIWAR}
        item={item([
          person({
            follow_up: { state: 'concluded', started_on: '2026-10-11', next_step_on: null, concluded_on: '2026-10-18' },
            unreachable_reason: 'not_delivered',
            ask,
            reported_undelivered: 2,
          }),
        ])}
      />,
    );
    expect(screen.getByTestId('ladder-not-delivered').textContent).toBe(`Texts were reported not delivered — ${words}.`);
    expect(screen.getByTestId('ladder-follow-up').textContent).toBe('Follow-up ended on 2026-10-18 — none was reported delivered.');
    expect(screen.getByTestId('ladder-reported-undelivered').textContent).toBe('2 reminders the network said were not delivered.');
  });

  it('the call list — date, who answered, whether it reached the family, by whom; ⛔ form without a follow-up or an ask', () => {
    wrap(<CorrectionChasePanel pariwarId={PARIWAR} item={item([person({ calls: [CALL] })])} />);
    const line = screen.getByTestId(`call-${CALL.call_id}`).textContent ?? '';
    expect(line).toContain('2026-10-20 · a family member answered · reached the family · recorded by District Admin One');
    expect(screen.queryByTestId(`call-form-${PERSON}`)).toBeNull();
  });

  it('⛔ ladder ⇒ ⛔ ladder lines at all (the 6.19b row is unchanged)', () => {
    wrap(<CorrectionChasePanel pariwarId={PARIWAR} item={item([person()])} />);
    expect(screen.queryByTestId('ladder-lines')).toBeNull();
  });

  it('⭐ the CERTIFICATE list — the owed-letter line is REASON-AWARE (`unreachable_reason`), with the follow-up lines and the call form', () => {
    const cert = (over: Partial<CertPerson>): CertPerson => ({
      person_key: PERSON,
      role: 'nominee',
      position: 'A',
      sms_state: 'reminded',
      letter_eligible: true,
      letter: null,
      escalation_recorded_on: null,
      follow_up: null,
      unreachable_reason: null,
      ask: null,
      calls: [],
      ...over,
    });
    const certItem = (p: CertPerson): CertItem => ({
      claim_case_id: CLAIM,
      short_reference: '11111111',
      cause: 'rejected',
      run_state: 'open',
      pause_reason: null,
      run_day: 20,
      next_reminder_on: '2026-10-21',
      cannot_remind: null,
      people: [p],
    });
    const { unmount } = wrap(<CertificateRemindersList pariwarId={PARIWAR} items={[certItem(cert({ unreachable_reason: 'refused' }))]} />);
    expect(screen.getByTestId('certificate-letter-owed').textContent).toBe(certificateRemindersEn.letter.owed);
    unmount();
    wrap(
      <CertificateRemindersList
        pariwarId={PARIWAR}
        items={[
          certItem(
            cert({
              unreachable_reason: 'not_delivered',
              ask: 'letter',
              follow_up: { state: 'concluded', started_on: '2026-10-11', next_step_on: null, concluded_on: '2026-10-18' },
            }),
          ),
        ]}
      />,
    );
    expect(screen.getByTestId('certificate-letter-owed').textContent).toBe('A letter is owed — texts to this person were reported not delivered.');
    expect(screen.getByTestId('ladder-not-delivered').textContent).toBe('Texts were reported not delivered — post them a letter.');
    // Review round 2, P6 — ask `letter` (a nominee while nominee calls are not cleared): every call and reveal would be
    // refused, so the form is ⛔ offered.
    expect(screen.queryByTestId(`call-form-${PERSON}`)).toBeNull();
  });

  it.each([
    ['call_or_letter', true],
    ['call', true],
    ['letter', false],
    ['none', false],
  ] as const)('round 2, P6 — a CONCLUDED follow-up with ask %s offers the call form: %s (callFormOffered)', (ask, offered) => {
    expect(callFormOffered({ state: 'concluded', started_on: '2026-10-11', next_step_on: null, concluded_on: '2026-10-18' }, ask)).toBe(offered);
    expect(callFormOffered({ state: 'running', started_on: '2026-10-11', next_step_on: '2026-10-13', concluded_on: null }, ask)).toBe(true);
    expect(callFormOffered(null, null)).toBe(false);
  });
});

describe('the call form (LD10, LD11)', () => {
  const renderForm = (chase: 'correction' | 'certificate' = 'correction') =>
    wrap(<ContactCallForm pariwarId={PARIWAR} claimCaseId={CLAIM} personKey={PERSON} chase={chase} offered />);

  async function fill(user: ReturnType<typeof userEvent.setup>, answered: string, outcome: 'reached' | 'not_reached') {
    const form = screen.getByRole('form', { name: t.calls.record });
    await user.type(within(form).getByLabelText(t.calls.calledOn), '2026-10-01');
    await user.selectOptions(within(form).getByLabelText(t.calls.whoAnswered), answered);
    await user.click(within(form).getByLabelText(outcome === 'reached' ? t.calls.reached : t.calls.notReached));
  }

  it('`reached` is offered ONLY when the person or a family member answered; choosing "nobody" withdraws it', async () => {
    expect([canBeReached('the_person'), canBeReached('family_member'), canBeReached('someone_else'), canBeReached('nobody'), canBeReached('')]).toEqual([
      true,
      true,
      false,
      false,
      false,
    ]);
    const user = userEvent.setup();
    renderForm();
    const reached = screen.getByLabelText(t.calls.reached) as HTMLInputElement;
    expect(reached.disabled).toBe(true);
    await user.selectOptions(screen.getByLabelText(t.calls.whoAnswered), 'the_person');
    expect(reached.disabled).toBe(false);
    await user.click(reached);
    expect(reached.checked).toBe(true);
    await user.selectOptions(screen.getByLabelText(t.calls.whoAnswered), 'nobody');
    expect(reached.disabled).toBe(true);
    expect(reached.checked).toBe(false);
  });

  it('⭐ a save sends the body with ONE key per attempt — the SAME key on a retry after a failure, a NEW one after a success', async () => {
    const user = userEvent.setup();
    recordCorrectionContactCall.mockRejectedValueOnce(new Error('network down')).mockResolvedValue(CALL);
    renderForm();
    await fill(user, 'family_member', 'reached');
    await user.click(screen.getByRole('button', { name: t.calls.save }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe(t.calls.error));
    await user.click(screen.getByRole('button', { name: t.calls.save }));
    await waitFor(() => expect(screen.getByTestId('call-form-status').textContent).toBe(t.calls.saved));
    expect(recordCorrectionContactCall).toHaveBeenCalledTimes(2);
    const [first, second] = recordCorrectionContactCall.mock.calls;
    expect(first![2]).toEqual({ person_key: PERSON, called_on: '2026-10-01', answered_by: 'family_member', outcome: 'reached' });
    expect(first![3]).toMatch(/^[0-9a-f-]{36}$/);
    expect(second![3]).toBe(first![3]); // ⭐ the retry of the SAME attempt
    await fill(user, 'nobody', 'not_reached');
    await user.click(screen.getByRole('button', { name: t.calls.save }));
    await waitFor(() => expect(recordCorrectionContactCall).toHaveBeenCalledTimes(3));
    expect(recordCorrectionContactCall.mock.calls[2]![3]).not.toBe(first![3]); // ⭐ a NEW attempt
  });

  it('⭐ round 2, P4 — an EDITED retry after a failure is a NEW attempt (a new key); the SAME fields keep the key', async () => {
    const user = userEvent.setup();
    recordCorrectionContactCall.mockRejectedValueOnce(new Error('network down')).mockRejectedValueOnce(new Error('network down')).mockResolvedValue(CALL);
    renderForm();
    await fill(user, 'family_member', 'reached');
    await user.click(screen.getByRole('button', { name: t.calls.save }));
    await waitFor(() => expect(recordCorrectionContactCall).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe(t.calls.error));
    // The admin corrects who answered — and the outcome with it.
    await user.selectOptions(screen.getByLabelText(t.calls.whoAnswered), 'nobody');
    await user.click(screen.getByLabelText(t.calls.notReached));
    await user.click(screen.getByRole('button', { name: t.calls.save }));
    await waitFor(() => expect(recordCorrectionContactCall).toHaveBeenCalledTimes(2));
    const [first, second] = recordCorrectionContactCall.mock.calls;
    expect(second![2]).toEqual({ person_key: PERSON, called_on: '2026-10-01', answered_by: 'nobody', outcome: 'not_reached' });
    expect(second![3]).not.toBe(first![3]); // ⭐ ⛔ a replay of the first call under its key
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe(t.calls.error));
    await user.click(screen.getByRole('button', { name: t.calls.save })); // the SAME (edited) fields again
    await waitFor(() => expect(recordCorrectionContactCall).toHaveBeenCalledTimes(3));
    expect(recordCorrectionContactCall.mock.calls[2]![3]).toBe(second![3]);
  });

  it('round 2, P2 — Enter in the code box VERIFIES the code; ⛔ it saves the call', async () => {
    const user = userEvent.setup();
    getCorrectionContactCallNumber
      .mockRejectedValueOnce(new ApiError(403, 'auth.step_up_required', 'elevate'))
      .mockResolvedValue({ person_key: PERSON, number: '+919812345678' });
    requestStepUp.mockResolvedValue({ sent: true, expiresInSeconds: 300 });
    verifyStepUp.mockResolvedValue({ elevated: true, elevatedUntil: new Date(Date.now() + 300_000).toISOString() });
    renderForm();
    await fill(user, 'family_member', 'reached');
    await user.click(screen.getByRole('button', { name: t.calls.showNumber }));
    await user.click(await screen.findByRole('button', { name: t.letters.sendCode }));
    await user.type(await screen.findByLabelText(t.letters.code), '123456{Enter}');
    expect((await screen.findByTestId('call-number')).textContent).toContain('+919812345678');
    expect(verifyStepUp).toHaveBeenCalledWith('123456');
    expect(recordCorrectionContactCall).not.toHaveBeenCalled();
  });

  it('round 2, P30 — the outcome radios are a NAMED group; a disabled "reached" says why', async () => {
    const user = userEvent.setup();
    renderForm();
    expect(screen.getByRole('group', { name: t.calls.outcomeLegend })).toBeTruthy();
    const reached = screen.getByLabelText(t.calls.reached) as HTMLInputElement;
    expect(reached.disabled).toBe(true);
    const hint = document.getElementById(reached.getAttribute('aria-describedby') ?? '');
    expect(hint?.textContent).toBe(t.calls.reachedHint);
    expect(t.calls.reachedHint).not.toBe(t.calls.reachedNeedsAnswer); // ⛔ the alert's sentence twice (fix-diff review)
    await user.selectOptions(screen.getByLabelText(t.calls.whoAnswered), 'the_person');
    expect(reached.getAttribute('aria-describedby')).toBeNull();
  });

  it('round 2, P29 — a missing display name reads its own line, ⛔ "Try again"', async () => {
    const user = userEvent.setup();
    recordCorrectionContactCall.mockRejectedValue(new ApiError(409, 'admin.display_name_missing', 'x'));
    renderForm();
    await fill(user, 'nobody', 'not_reached');
    await user.click(screen.getByRole('button', { name: t.calls.save }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe(t.calls.displayNameMissing));
  });

  it('a missing field and a future date are VISIBLE messages, ⛔ a request', async () => {
    const user = userEvent.setup();
    renderForm();
    await user.click(screen.getByRole('button', { name: t.calls.save }));
    expect(screen.getByRole('alert').textContent).toBe(t.calls.fieldsRequired);
    const form = screen.getByRole('form', { name: t.calls.record });
    await user.type(within(form).getByLabelText(t.calls.calledOn), '2099-01-01');
    await user.selectOptions(within(form).getByLabelText(t.calls.whoAnswered), 'nobody');
    await user.click(within(form).getByLabelText(t.calls.notReached));
    await user.click(screen.getByRole('button', { name: t.calls.save }));
    expect(screen.getByRole('alert').textContent).toBe(t.calls.dateInFuture);
    expect(recordCorrectionContactCall).not.toHaveBeenCalled();
    expect(istToday() < '2099-01-01').toBe(true);
  });

  it('⭐ LD11 — a nominee before counsel\'s basis: the refusal reads "post them a letter" (save AND number)', async () => {
    const user = userEvent.setup();
    const refusal = new ApiError(409, 'contact_call.nominee_calls_not_cleared', 'x');
    recordCertificateContactCall.mockRejectedValue(refusal);
    renderForm('certificate');
    await fill(user, 'the_person', 'reached');
    await user.click(screen.getByRole('button', { name: t.calls.save }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('A nominee cannot be phoned yet — post them a letter.'));
    expect(recordCertificateContactCall).toHaveBeenCalledWith(PARIWAR, CLAIM, expect.objectContaining({ person_key: PERSON }), expect.any(String));
  });

  it('⭐ the number reveal — a 403 step_up_required ⇒ send the code (`contact_call_number`) ⇒ verify ⇒ the number is shown, focused, and can be hidden', async () => {
    const user = userEvent.setup();
    getCorrectionContactCallNumber
      .mockRejectedValueOnce(new ApiError(403, 'auth.step_up_required', 'elevate'))
      .mockResolvedValue({ person_key: PERSON, number: '+919812345678' });
    requestStepUp.mockResolvedValue({ sent: true, expiresInSeconds: 300 });
    verifyStepUp.mockResolvedValue({ elevated: true, elevatedUntil: new Date(Date.now() + 300_000).toISOString() });
    renderForm();
    await user.click(screen.getByRole('button', { name: t.calls.showNumber }));
    await waitFor(() => expect(screen.getByTestId('call-form-status').textContent).toBe(t.calls.stepUpIntro));
    await user.click(screen.getByRole('button', { name: t.letters.sendCode }));
    expect(requestStepUp).toHaveBeenCalledWith('contact_call_number');
    await user.type(await screen.findByLabelText(t.letters.code), '123456');
    await user.click(screen.getByRole('button', { name: t.letters.verify }));
    const shown = await screen.findByTestId('call-number');
    expect(shown.textContent).toContain('+919812345678');
    await waitFor(() => expect(document.activeElement).toBe(shown));
    expect(screen.getByTestId('call-form-status').textContent).toBe(t.calls.numberShown);
    await user.click(screen.getByRole('button', { name: t.calls.hideNumber }));
    expect(screen.queryByTestId('call-number')).toBeNull();
    expect(screen.getByTestId('call-form-status').textContent).toBe(t.calls.numberHidden);
  });

  it('a person with ⛔ number on record reads "no number"; a read fault reads its own line', async () => {
    const user = userEvent.setup();
    getCorrectionContactCallNumber
      .mockRejectedValueOnce(new ApiError(503, 'contact_call.number_unavailable', 'x'))
      .mockResolvedValue({ person_key: PERSON, number: null });
    renderForm();
    await user.click(screen.getByRole('button', { name: t.calls.showNumber }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe(t.calls.refusals['number_unavailable']));
    await user.click(screen.getByRole('button', { name: t.calls.showNumber }));
    expect((await screen.findByTestId('call-number')).textContent).toContain(t.calls.noNumber);
  });
});

describe('round 2, P3 — "Call recorded." outlives the refetch that withdraws the form', () => {
  function deferred<T>() {
    let resolve!: (v: T) => void;
    const promise = new Promise<T>((r) => {
      resolve = r;
    });
    return { promise, resolve };
  }
  const concluded = { state: 'concluded', started_on: '2026-10-11', next_step_on: null, concluded_on: '2026-10-18' } as const;

  async function saveReachedThenWithdraw(
    user: ReturnType<typeof userEvent.setup>,
    pending: ReturnType<typeof deferred<ContactCallDto>>,
    withdraw: () => void,
  ): Promise<void> {
    const form = screen.getByRole('form', { name: t.calls.record });
    await user.type(within(form).getByLabelText(t.calls.calledOn), '2026-10-01');
    await user.selectOptions(within(form).getByLabelText(t.calls.whoAnswered), 'family_member');
    await user.click(within(form).getByLabelText(t.calls.reached));
    await user.click(screen.getByRole('button', { name: t.calls.save }));
    // The refetch lands BEFORE the mutation resolves (`onSettled` runs first): the ask is answered ⇒ ⛔ form.
    withdraw();
    pending.resolve(CALL);
    await waitFor(() => expect(screen.getByTestId('call-form-status').textContent).toBe(t.calls.saved));
    expect(screen.queryByRole('form', { name: t.calls.record })).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(screen.getByTestId('call-form-status')));
  }

  it('⭐ the CORRECTION panel', async () => {
    const user = userEvent.setup();
    const pending = deferred<ContactCallDto>();
    recordCorrectionContactCall.mockReturnValue(pending.promise);
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const ui = (ask: 'call_or_letter' | null) => (
      <QueryClientProvider client={qc}>
        <CorrectionChasePanel
          pariwarId={PARIWAR}
          item={item([person({ follow_up: concluded, unreachable_reason: 'not_delivered', ask, calls: ask === null ? [CALL] : [] })])}
        />
      </QueryClientProvider>
    );
    const { rerender } = render(ui('call_or_letter'));
    await saveReachedThenWithdraw(user, pending, () => rerender(ui(null)));
  });

  it('⭐ the CERTIFICATE list', async () => {
    const user = userEvent.setup();
    const pending = deferred<ContactCallDto>();
    recordCertificateContactCall.mockReturnValue(pending.promise);
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const certPerson = (ask: 'call' | null): CertPerson => ({
      person_key: PERSON,
      role: 'nominee',
      position: 'A',
      sms_state: 'reminded',
      letter_eligible: true,
      letter: null,
      escalation_recorded_on: null,
      follow_up: concluded,
      unreachable_reason: 'not_delivered',
      ask,
      calls: ask === null ? [{ ...CALL, chase: 'certificate' }] : [],
    });
    const ui = (ask: 'call' | null) => (
      <QueryClientProvider client={qc}>
        <CertificateRemindersList
          pariwarId={PARIWAR}
          items={[
            {
              claim_case_id: CLAIM,
              short_reference: '11111111',
              cause: 'rejected',
              run_state: 'open',
              pause_reason: null,
              run_day: 20,
              next_reminder_on: '2026-10-21',
              cannot_remind: null,
              people: [certPerson(ask)],
            },
          ]}
        />
      </QueryClientProvider>
    );
    const { rerender } = render(ui('call'));
    await saveReachedThenWithdraw(user, pending, () => rerender(ui(null)));
  });

  // Fix-diff review — a withdrawn form's fields, kept key and problem go too: offered AGAIN it starts EMPTY, and a save of
  // the same fields is a NEW attempt (⛔ the old key replayed), ⛔ the old alert left behind.
  it('⛔ withdrawn then offered again ⇒ empty fields, ⛔ old problem, a NEW key', async () => {
    const user = userEvent.setup();
    recordCorrectionContactCall.mockRejectedValueOnce(new Error('network down')).mockResolvedValue(CALL);
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const ui = (offered: boolean) => (
      <QueryClientProvider client={qc}>
        <ContactCallForm pariwarId={PARIWAR} claimCaseId={CLAIM} personKey={PERSON} chase="correction" offered={offered} />
      </QueryClientProvider>
    );
    const { rerender } = render(ui(true));
    const fillReached = async () => {
      const form = screen.getByRole('form', { name: t.calls.record });
      await user.type(within(form).getByLabelText(t.calls.calledOn), '2026-10-01');
      await user.selectOptions(within(form).getByLabelText(t.calls.whoAnswered), 'family_member');
      await user.click(within(form).getByLabelText(t.calls.reached));
    };
    await fillReached();
    await user.click(screen.getByRole('button', { name: t.calls.save }));
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    rerender(ui(false));
    rerender(ui(true));
    const form = screen.getByRole('form', { name: t.calls.record });
    expect((within(form).getByLabelText(t.calls.calledOn) as HTMLInputElement).value).toBe('');
    expect((within(form).getByLabelText(t.calls.whoAnswered) as HTMLSelectElement).value).toBe('');
    expect(screen.queryByRole('alert')).toBeNull();
    await fillReached();
    await user.click(screen.getByRole('button', { name: t.calls.save }));
    await waitFor(() => expect(recordCorrectionContactCall).toHaveBeenCalledTimes(2));
    const [first, second] = recordCorrectionContactCall.mock.calls;
    expect(second![3]).not.toBe(first![3]);
  });

  // Fix-diff review (2nd) — a save that FAILS after the form was withdrawn leaves ⛔ alert (⛔ form to retry from), and a
  // form offered again does ⛔ carry the old "Call recorded." line.
  it('⛔ a refusal settling after withdrawal shows ⛔ alert; offered again ⇒ ⛔ old status line', async () => {
    const user = userEvent.setup();
    let reject!: (e: Error) => void;
    recordCorrectionContactCall
      .mockImplementationOnce(() => new Promise((_r, rej) => { reject = rej; }))
      .mockResolvedValueOnce(CALL);
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const ui = (offered: boolean) => (
      <QueryClientProvider client={qc}>
        <ContactCallForm pariwarId={PARIWAR} claimCaseId={CLAIM} personKey={PERSON} chase="correction" offered={offered} />
      </QueryClientProvider>
    );
    const { rerender } = render(ui(true));
    const fillReached = async () => {
      const form = screen.getByRole('form', { name: t.calls.record });
      await user.type(within(form).getByLabelText(t.calls.calledOn), '2026-10-01');
      await user.selectOptions(within(form).getByLabelText(t.calls.whoAnswered), 'family_member');
      await user.click(within(form).getByLabelText(t.calls.reached));
    };
    await fillReached();
    await user.click(screen.getByRole('button', { name: t.calls.save }));
    await waitFor(() => expect(recordCorrectionContactCall).toHaveBeenCalledTimes(1));
    rerender(ui(false));
    reject(new Error('network down'));
    await waitFor(() => expect(screen.queryByRole('form', { name: t.calls.record })).toBeNull());
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.queryByRole('alert')).toBeNull();
    rerender(ui(true));
    await fillReached();
    await user.click(screen.getByRole('button', { name: t.calls.save }));
    await waitFor(() => expect(screen.getByTestId('call-form-status').textContent).toBe(t.calls.saved));
    rerender(ui(false));
    expect(screen.getByTestId('call-form-status').textContent).toBe(t.calls.saved); // P3 — it outlives the withdrawal
    rerender(ui(true));
    expect(screen.getByTestId('call-form-status').textContent).toBe('');
  });
});

describe('the REAL client sends the Idempotency-Key (LD10)', () => {
  it('⭐ POST …/correction/calls carries the header and the body', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(CALL), { status: 201, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);
    const actual = await vi.importActual<typeof import('../src/api/client.js')>('../src/api/client.js');
    const dto = await actual.recordCorrectionContactCall(
      PARIWAR,
      CLAIM,
      { person_key: PERSON, called_on: '2026-10-01', answered_by: 'the_person', outcome: 'reached' },
      'key-1',
    );
    expect(dto.call_id).toBe(CALL.call_id);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`/api/v1/p/${PARIWAR}/admin/claims/${CLAIM}/correction/calls`);
    expect(new Headers(init.headers).get('Idempotency-Key')).toBe('key-1');
    expect(JSON.parse(String(init.body))).toEqual({ person_key: PERSON, called_on: '2026-10-01', answered_by: 'the_person', outcome: 'reached' });
  });
});
