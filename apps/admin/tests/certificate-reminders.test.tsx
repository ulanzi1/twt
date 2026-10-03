// Story 6.19d (AC5) — the District Admin's "Certificate reminders" list and its ONE-letter form: each claim by short
// reference (⛔ no name) with its cause, run day / next reminder or pause, and the "cannot remind" flag; each person BY
// POSITION AND ROLE; the escalation line ⛔ never claims the Pariwar Admin was notified; the letter states what it must
// say, says a missing field, reveals the address only after a step-up; ⭐ the "Letter recorded" line survives a REAL
// refetching `useQuery` (TanStack awaits `onSettled`'s refetch before `success` — [[project_tanstack_onsettled_before_success]])
// and the submit stays disabled while the mutation OR its refetch is pending. Plus the nav link inside a Pariwar only.

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { CertificateRemindersResponse } from '@twt/contracts';

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

const getCertificateReminders = vi.fn();
const recordCertificateLetter = vi.fn();
const getCertificateLetterAddress = vi.fn();
const getCertificateLetterScreenshot = vi.fn();
const requestStepUp = vi.fn();
const verifyStepUp = vi.fn();
vi.mock('../src/api/client.js', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    getSession: async () => ({ userId: '11111111-1111-4111-8111-111111111111', nationalGrants: [] }),
    getCertificateReminders: (...a: unknown[]) => getCertificateReminders(...a),
    recordCertificateLetter: (...a: unknown[]) => recordCertificateLetter(...a),
    getCertificateLetterAddress: (...a: unknown[]) => getCertificateLetterAddress(...a),
    getCertificateLetterScreenshot: (...a: unknown[]) => getCertificateLetterScreenshot(...a),
    requestStepUp: (...a: unknown[]) => requestStepUp(...a),
    verifyStepUp: (...a: unknown[]) => verifyStepUp(...a),
  };
});

const { ApiError } = await import('../src/api/client.js');
const { useCertificateReminders } = await import('../src/api/hooks.js');
const { CertificateRemindersList } = await import('../src/modules/certificate-reminders/index.js');
const { RootLayout } = await import('../src/routes/RootLayout.js');
const { CertificateRemindersRoute } = await import('../src/routes/CertificateReminderRoutes.js');

const PARIWAR = '44444444-4444-4444-8444-444444444444';
const CLAIM = '11111111-1111-4111-8111-111111111111';
const NOMINEE_A = 'nominee:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const NOMINEE_B = 'nominee:bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

type Item = CertificateRemindersResponse['items'][number];
const item = (over: Partial<Item> = {}): Item => ({
  claim_case_id: CLAIM,
  short_reference: '11111111',
  cause: 'rejected',
  run_state: 'open',
  pause_reason: null,
  run_day: 9,
  next_reminder_on: '2026-10-11',
  cannot_remind: null,
  people: [
    { person_key: NOMINEE_A, role: 'nominee', position: 'A', sms_state: 'number_not_working', letter_eligible: true, letter: null, escalation_recorded_on: '2026-10-09' },
    { person_key: NOMINEE_B, role: 'nominee', position: 'B', sms_state: 'reminded', letter_eligible: false, letter: null, escalation_recorded_on: null },
  ],
  ...over,
});

function wrap(ui: ReactElement): void {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe('the "Certificate reminders" list (Story 6.19d)', () => {
  beforeEach(() => {
    params = {}; // code review, 2026-10-03 — isolate from whichever test last set it (no longer order-dependent)
  });


  it('⭐ each claim by short reference with its cause, day and next reminder; each person BY POSITION and role, ⛔ no name', () => {
    wrap(<CertificateRemindersList pariwarId={PARIWAR} items={[item()]} />);
    const row = screen.getByTestId(`certificate-reminders-item-${CLAIM}`);
    expect(row).toHaveTextContent('11111111');
    expect(row).toHaveTextContent('Certificate not accepted');
    expect(row).toHaveTextContent('day 9');
    expect(row).toHaveTextContent('next reminder on 2026-10-11');
    expect(screen.getByTestId(`certificate-person-${CLAIM}-${NOMINEE_A}`)).toHaveTextContent('nominee A · Number not working');
    expect(screen.getByTestId(`certificate-person-${CLAIM}-${NOMINEE_B}`)).toHaveTextContent('nominee B · Reminded by text');
    // ⛔ Not letter-eligible ⇒ ⛔ no letter form for B.
    expect(screen.queryByTestId(`certificate-letter-${CLAIM}-${NOMINEE_B}`)).toBeNull();
  });

  it('⭐ CR10 — the escalation line is a RECORD and says the Pariwar Admin is ⛔ not notified (⛔ never "sent")', () => {
    wrap(<CertificateRemindersList pariwarId={PARIWAR} items={[item()]} />);
    const line = screen.getByTestId('certificate-escalation-recorded').textContent ?? '';
    expect(line).toContain('Escalation recorded on 2026-10-09');
    expect(line).toContain('not notified');
    expect(line.toLowerCase()).not.toMatch(/\bsent\b|has been notified|was notified/);
  });

  it('a pause and the "cannot remind" flag are SAID', () => {
    wrap(
      <CertificateRemindersList
        pariwarId={PARIWAR}
        items={[item({ run_state: 'paused', pause_reason: 'certificate_accepted', run_day: 20, next_reminder_on: null, cannot_remind: 'agreement_not_live' })]}
      />,
    );
    expect(screen.getByText('Paused — the certificate is accepted.')).toBeInTheDocument();
    expect(screen.getByTestId('certificate-cannot-remind')).toHaveTextContent('agreement to be contacted is not in force');
  });

  it('the letter form STATES what the letter must say, and a missing field is SAID (⛔ a silently disabled button)', () => {
    wrap(<CertificateRemindersList pariwarId={PARIWAR} items={[item()]} />);
    expect(screen.getByTestId('certificate-letter-must-say')).toHaveTextContent('clearly shows the date of death');
    expect(screen.getByTestId('certificate-letter-record')).not.toBeDisabled();
    fireEvent.click(screen.getByTestId('certificate-letter-record'));
    expect(screen.getByRole('alert')).toHaveTextContent('Enter the posting date and the tracking number.');
    expect(recordCertificateLetter).not.toHaveBeenCalled();
  });

  it('⭐ the address is revealed only AFTER a fresh step-up (403 `auth.step_up_required` → a code → the address)', async () => {
    getCertificateLetterAddress.mockRejectedValueOnce(new ApiError(403, 'auth.step_up_required', 'Step up required'));
    requestStepUp.mockResolvedValueOnce({ sent: true, expiresInSeconds: 300 });
    verifyStepUp.mockResolvedValueOnce({ elevated: true });
    getCertificateLetterAddress.mockResolvedValueOnce({ person_key: NOMINEE_A, address: 'Sentinel House 9' });
    wrap(<CertificateRemindersList pariwarId={PARIWAR} items={[item()]} />);
    fireEvent.click(screen.getByTestId('certificate-letter-reveal'));
    expect(await screen.findByTestId('certificate-letter-code')).toBeInTheDocument();
    expect(requestStepUp).toHaveBeenCalledWith('certificate_letter_address');
    fireEvent.change(screen.getByTestId('certificate-letter-code'), { target: { value: '123456' } });
    fireEvent.click(screen.getByTestId('certificate-letter-verify'));
    expect(await screen.findByTestId('certificate-letter-address')).toHaveTextContent('Sentinel House 9');
  });

  it('⭐ with a REAL refetching useQuery: the submit stays disabled through the refetch, and "Letter recorded" is STILL on screen once the person shows their posted letter', async () => {
    let resolveRefetch: (v: CertificateRemindersResponse) => void = () => undefined;
    getCertificateReminders.mockResolvedValueOnce({ items: [item()], truncated: false });
    getCertificateReminders.mockImplementationOnce(() => new Promise((res) => (resolveRefetch = res)));
    recordCertificateLetter.mockResolvedValueOnce({
      letter_id: '99999999-9999-4999-8999-999999999999',
      person_key: NOMINEE_A,
      posted_on: '2026-10-03',
      delivered_on: null,
      overdue: false,
      has_screenshot: false,
    });
    function Page(): ReactElement {
      const q = useCertificateReminders(PARIWAR);
      return q.data ? <CertificateRemindersList pariwarId={PARIWAR} items={q.data.items} /> : <p>loading</p>;
    }
    wrap(<Page />);
    fireEvent.change(await screen.findByTestId('certificate-letter-posted-on'), { target: { value: '2026-10-03' } });
    fireEvent.change(screen.getByTestId('certificate-letter-tracking'), { target: { value: 'EE1' } });
    fireEvent.click(screen.getByTestId('certificate-letter-record'));
    await waitFor(() => expect(recordCertificateLetter).toHaveBeenCalledTimes(1));
    // The mutation has resolved but its refetch has ⛔ not — the button is STILL disabled (⛔ a second submit).
    await waitFor(() => expect(getCertificateReminders).toHaveBeenCalledTimes(2));
    expect(screen.getByTestId('certificate-letter-record')).toBeDisabled();
    await act(async () => {
      resolveRefetch({
        items: [
          item({
            people: [
              {
                person_key: NOMINEE_A,
                role: 'nominee',
                position: 'A',
                sms_state: 'number_not_working',
                letter_eligible: true,
                letter: { letter_id: '99999999-9999-4999-8999-999999999999', posted_on: '2026-10-03', delivered_on: null, overdue: false, has_screenshot: false },
                escalation_recorded_on: null,
              },
            ],
          }),
        ],
        truncated: false,
      });
    });
    expect(await screen.findByTestId('certificate-letter-recorded')).toHaveTextContent('Letter recorded.');
    expect(screen.getByTestId(`certificate-letter-${CLAIM}-${NOMINEE_A}`)).toHaveTextContent('posted 2026-10-03');
    expect(screen.queryByTestId('certificate-letter-record')).toBeNull();
  });

  it('⛔ code review 2026-10-03 — once a fresh code is needed, the ORIGINAL reveal button is gone (⛔ no duplicate control)', async () => {
    getCertificateLetterAddress.mockRejectedValueOnce(new ApiError(403, 'auth.step_up_required', 'Step up required'));
    requestStepUp.mockResolvedValueOnce({ sent: true, expiresInSeconds: 300 });
    wrap(<CertificateRemindersList pariwarId={PARIWAR} items={[item()]} />);
    fireEvent.click(screen.getByTestId('certificate-letter-reveal'));
    expect(await screen.findByTestId('certificate-letter-code')).toBeInTheDocument();
    expect(screen.queryByTestId('certificate-letter-reveal')).toBeNull();
    expect(screen.queryByTestId('certificate-letter-address')).toBeNull();
  });

  it('⭐ a delivery recorded LATE reads "delivered more than 14 days after posting", ⛔ never "no delivery recorded" (the letter WAS delivered)', () => {
    const lateLetter = { letter_id: '99999999-9999-4999-8999-999999999999', posted_on: '2026-09-01', delivered_on: '2026-09-20', overdue: true, has_screenshot: false };
    wrap(
      <CertificateRemindersList
        pariwarId={PARIWAR}
        items={[item({ people: [{ person_key: NOMINEE_A, role: 'nominee', position: 'A', sms_state: 'number_not_working', letter_eligible: true, letter: lateLetter, escalation_recorded_on: null }] })]}
      />,
    );
    const banner = screen.getByTestId('certificate-letter-overdue');
    expect(banner).toHaveTextContent('Delivered more than 14 days after posting.');
    expect(banner).not.toHaveTextContent('No delivery recorded');
  });

  it('⭐ the delivery screenshot — a fresh step-up, then a TTL-signed link to open it', async () => {
    const delivered = { letter_id: '99999999-9999-4999-8999-999999999999', posted_on: '2026-09-01', delivered_on: '2026-09-05', overdue: false, has_screenshot: true };
    getCertificateLetterScreenshot.mockRejectedValueOnce(new ApiError(403, 'auth.step_up_required', 'Step up required'));
    requestStepUp.mockResolvedValueOnce({ sent: true, expiresInSeconds: 300 });
    verifyStepUp.mockResolvedValueOnce({ elevated: true });
    getCertificateLetterScreenshot.mockResolvedValueOnce({ url: 'https://example.test/signed-screenshot', expires_in_seconds: 60 });
    wrap(
      <CertificateRemindersList
        pariwarId={PARIWAR}
        items={[item({ people: [{ person_key: NOMINEE_A, role: 'nominee', position: 'A', sms_state: 'reminded', letter_eligible: true, letter: delivered, escalation_recorded_on: null }] })]}
      />,
    );
    fireEvent.click(screen.getByTestId('certificate-letter-screenshot-load'));
    expect(await screen.findByTestId('certificate-letter-screenshot-code')).toBeInTheDocument();
    expect(requestStepUp).toHaveBeenCalledWith('certificate_letter_address');
    fireEvent.change(screen.getByTestId('certificate-letter-screenshot-code'), { target: { value: '654321' } });
    fireEvent.click(screen.getByTestId('certificate-letter-screenshot-verify'));
    const link = await screen.findByTestId('certificate-letter-screenshot-link');
    expect(link).toHaveAttribute('href', 'https://example.test/signed-screenshot');
    expect(link).toHaveTextContent('Open the delivery screenshot');
  });

  it('⭐ the list `truncated` flag is SHOWN — older, more-overdue claims are not silently dropped', async () => {
    params = { pariwarId: PARIWAR };
    getCertificateReminders.mockResolvedValueOnce({ items: [item()], truncated: true });
    wrap(<CertificateRemindersRoute />);
    expect(await screen.findByTestId('certificate-reminders-truncated')).toHaveTextContent('Older, more overdue ones are kept');
  });

  it('the nav link — inside a Pariwar context only', async () => {
    params = { pariwarId: PARIWAR };
    render(
      <QueryClientProvider client={new QueryClient()}>
        <RootLayout />
      </QueryClientProvider>,
    );
    expect(await screen.findByTestId('nav-certificate-reminders')).toHaveAttribute('href', '/p/$pariwarId/certificate-reminders');
  });
});
