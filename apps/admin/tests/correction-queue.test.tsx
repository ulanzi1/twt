// <CorrectionQueueRoute> — the District Admin's correction queue (Story 6.18, AC11).
//
// ⭐⭐ WHAT THIS SUITE IS REALLY PINNING. `2026-09-20-227` cl.10 sends a claim BACK to the District
// Admin with a note. A return moves ⛔ no state, so a returned claim is indistinguishable from any
// other claim in `verifier_approved` — and before this page there was no District Admin list in the
// app at all. The loop was unusable end to end: the person the claim was sent TO could not find it.
//
// ⛔ AND IT IS NOT A DENIAL. The assertions about WORDING are load-bearing: this is the surface a
// District Admin reads, so if a badge here ever says "rejected" or "denied", the ruling has been
// reversed in the UI regardless of what the domain does.

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ClaimsUnderCorrectionResponse } from '@twt/contracts';

const navigate = vi.fn();
let search: Record<string, unknown> = {};
// ⭐ A FLOOR, ⛔ not a substitute for the manual resets below: if an assertion in a test THROWS before its own
// `search = {}` runs, this still stops the leftover value crossing into the next test.
afterEach(() => {
  search = {};
});
vi.mock('@tanstack/react-router', () => ({
  useParams: () => ({ pariwarId: PARIWAR }),
  useNavigate: () => navigate,
  // Story 6.19b — `?claim=` (the highlight) and `?escalated=` (the Pariwar Admin's filter).
  useSearch: () => search,
}));

const getClaimsUnderCorrection = vi.fn();
const getCorrectionLetterScreenshot = vi.fn();
// ⭐ The route is session-gated (2026-09-23b) — a signed-in session by default; the gate test below
// makes it fail.
const getSession = vi.fn(async () => ({ actorId: 'a', grants: [] }));
vi.mock('../src/api/client.js', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    getClaimsUnderCorrection: (p: string, o?: unknown) => getClaimsUnderCorrection(p, o),
    getSession: () => getSession(),
    getCorrectionLetterScreenshot: (p: string, c: string, l: string) => getCorrectionLetterScreenshot(p, c, l),
  };
});

const PARIWAR = '44444444-4444-4444-8444-444444444444';
const CLAIM = '11111111-1111-4111-8111-111111111111';

const { CorrectionQueueRoute } = await import('../src/routes/CorrectionQueueRoute.js');

type Item = ClaimsUnderCorrectionResponse['items'][number];

const ITEM: Item = {
  claim_case_id: CLAIM,
  deceased_member_id: '22222222-2222-4222-8222-222222222222',
  claim_state: 'verifier_approved',
  claim_filed_at: '2026-09-01T00:00:00.000Z',
  returned_at: '2026-09-19T10:00:00.000Z',
  returned_by_actor_display: 'Kalpana Bharti',
  return_note: { state: 'readable', value: 'The holder name on account 2 is not the declared nominee.' },
  sent_back_by_check: false,
  accounts_complete: true,
  // Story 6.19b (AC8b) — the short reference and a quiet chase (a family run, day 3, nobody unreachable yet).
  short_reference: '11111111',
  correction_chase: {
    return_decision_id: '55555555-5555-4555-8555-555555555555',
    must_act: 'family',
    must_act_set_by: 'Pariwar Admin Two',
    must_act_set_at: '2026-09-19T10:00:00.000Z',
    run: { kind: 'family', day0: '2026-09-19', day_count: 3, open: true, ended_on: null, next_reminder_on: '2026-09-23' },
    cannot_remind: null,
    claimant_unresolved: false,
    awaiting_check: false,
    people: [
      {
        person_key: 'nominee:66666666-6666-4666-8666-666666666666',
        role: 'nominee',
        rank: 1,
        status: 'reached',
        found_dead_on: null,
        reminders_accepted: 2,
        letters: [],
      },
    ],
    escalated: false,
  },
};

const setup = (items: Item[]) => {
  getClaimsUnderCorrection.mockResolvedValue({ pariwar_id: PARIWAR, items });
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <CorrectionQueueRoute />
    </QueryClientProvider>,
  );
};

describe('<CorrectionQueueRoute> — AC11', () => {
  it('⭐ lists a returned claim WITH the Pariwar Admin’s note — the thing that makes the loop usable', async () => {
    setup([ITEM]);
    expect(await screen.findByTestId(`correction-queue-item-${CLAIM}`)).toBeInTheDocument();
    expect(screen.getByTestId('queue-return-note').textContent).toContain('not the declared nominee');
    expect(screen.getByText('Kalpana Bharti', { exact: false })).toBeInTheDocument();
  });

  it('⛔ says "returned", ⛔ NEVER "rejected"/"denied"/"failed" — `-227` cl.10 is not a denial', async () => {
    setup([ITEM]);
    await screen.findByTestId(`correction-queue-item-${CLAIM}`);
    const text = (document.body.textContent ?? '').toLowerCase();
    expect(text).toContain('returned');
    for (const forbidden of ['rejected', 'denied', 'refused this', 'failed']) {
      expect(text, `the queue used denial wording: ${forbidden}`).not.toContain(forbidden);
    }
  });

  it('⛔ offers NO "Re-submit" control — the resubmission is DERIVED (AC11)', async () => {
    setup([ITEM]);
    await screen.findByTestId(`correction-queue-item-${CLAIM}`);
    // ⭐ Recording a fresh passing name check on the claim IS the resubmission. A button here would
    // be either a no-op or a second, undeclared write path — and AC11 forbids a new route for it.
    const text = (document.body.textContent ?? '').toLowerCase();
    expect(text).not.toContain('re-submit');
    expect(text).not.toContain('resubmit');
    expect(screen.getByTestId(`queue-open-${CLAIM}`)).toBeInTheDocument();
  });

  it('⛔ carries NO name and NO account detail — the names stay behind the per-claim read (Trap 4)', async () => {
    setup([ITEM]);
    await screen.findByTestId(`correction-queue-item-${CLAIM}`);
    const text = document.body.textContent ?? '';
    // The fixture deliberately plants none, and the DTO has no field that could carry one —
    // this pins that the page does not grow one later.
    for (const forbidden of ['Asha', 'Devi', 'Ravi Kumar', 'IFSC', 'account number']) {
      expect(text, `the queue rendered ${forbidden}`).not.toContain(forbidden);
    }
  });

  it('distinguishes the District Admin’s OWN does_not_match from a Pariwar Admin return', async () => {
    setup([
      { ...ITEM, returned_at: null, returned_by_actor_display: null, return_note: null, sent_back_by_check: true },
    ]);
    await screen.findByTestId(`correction-queue-item-${CLAIM}`);
    expect(screen.getByTestId('queue-badge-check')).toBeInTheDocument();
    expect(screen.queryByTestId('queue-badge-returned')).toBeNull();
  });

  it('⭐ an EMPTY queue says so — a blank panel would read as a failed load', async () => {
    setup([]);
    expect(await screen.findByTestId('correction-queue-empty')).toBeInTheDocument();
  });

  it('surfaces an unreadable note as such — ⛔ never as "they gave no reason"', async () => {
    setup([{ ...ITEM, return_note: { state: 'unreadable' } }]);
    await screen.findByTestId(`correction-queue-item-${CLAIM}`);
    expect(screen.getByTestId('queue-return-note').textContent).not.toBe('—');
    expect(screen.getByTestId('queue-return-note').textContent).toContain('Could not be read');
  });
});

describe('<CorrectionQueueRoute> — the session gate (code review 2026-09-23b)', () => {
  it('⛔ an expired session redirects to /login — ⛔ not "the list could not be loaded", and the queue is ⛔ never read', async () => {
    getSession.mockRejectedValueOnce(new Error('401'));
    navigate.mockClear();
    getClaimsUnderCorrection.mockClear();
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <CorrectionQueueRoute />
      </QueryClientProvider>,
    );
    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: '/login' }));
    expect(screen.queryByTestId('correction-queue-error')).not.toBeInTheDocument();
    expect(getClaimsUnderCorrection).not.toHaveBeenCalled();
  });
});

describe('<CorrectionQueueRoute> — the QUEUE read’s own 401/403 (code review 2026-09-23c)', () => {
  const renderRoute = () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <CorrectionQueueRoute />
      </QueryClientProvider>,
    );
  };

  it('⛔ a 403 on the queue says "no access" — ⛔ never "could not be loaded"', async () => {
    const { ApiError } = await import('../src/api/client.js');
    getClaimsUnderCorrection.mockRejectedValue(new ApiError(403, 'auth.forbidden', 'nope'));
    renderRoute();
    expect(await screen.findByTestId('correction-queue-forbidden')).toBeInTheDocument();
    expect(screen.queryByTestId('correction-queue-error')).not.toBeInTheDocument();
  });

  it('⛔ a 401 on the queue redirects to /login even while the session read still succeeds', async () => {
    const { ApiError } = await import('../src/api/client.js');
    navigate.mockClear();
    getClaimsUnderCorrection.mockRejectedValue(new ApiError(401, 'auth.session_required', 'expired'));
    renderRoute();
    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: '/login' }));
  });
});

// ── Story 6.19b (AC8b, AC16) — the correction chase on each row ────────────────────────────────────────────────
describe('<CorrectionQueueRoute> — the correction chase (Story 6.19b)', () => {
  const chase = (over: Partial<Item['correction_chase']>): Item => ({ ...ITEM, correction_chase: { ...ITEM.correction_chase, ...over } });

  it('⭐ shows the SHORT REFERENCE, who must act (who, when), and the run\'s day and next reminder — announced', async () => {
    search = {};
    setup([ITEM]);
    await screen.findByTestId(`correction-queue-item-${CLAIM}`);
    expect(screen.getByTestId('queue-short-reference').textContent).toBe('11111111');
    expect(screen.getByTestId('queue-must-act').textContent).toContain('The family must act');
    expect(screen.getByTestId('queue-must-act').textContent).toContain('Pariwar Admin Two');
    expect(screen.getByTestId('queue-run').getAttribute('role')).toBe('status');
    expect(screen.getByTestId('queue-run').textContent).toContain('day 3 of 90');
    expect(screen.getByTestId('queue-run').textContent).toContain('2026-09-23');
    expect(screen.getByTestId('person-status').textContent).toBe('reached');
  });

  it('⭐ every flag is ANNOUNCED (role="status"): cannot remind + why, awaiting your check, not set, escalated', async () => {
    search = {};
    setup([
      chase({ must_act: null, must_act_set_by: null, must_act_set_at: null, cannot_remind: 'no_contact_record', awaiting_check: true, escalated: true, claimant_unresolved: true, people: [] }),
    ]);
    await screen.findByTestId(`correction-queue-item-${CLAIM}`);
    for (const id of ['flag-must-act-not-set', 'flag-cannot-remind', 'flag-awaiting-check', 'flag-escalated', 'flag-claimant-unresolved']) {
      expect(screen.getByTestId(id).getAttribute('role'), id).toBe('status');
    }
    expect(screen.getByTestId('flag-cannot-remind').textContent).toContain('there is no contact record');
  });

  it('⭐ a person found unreachable: their status, the letter form, and a posted letter\'s OVERDUE flag — ⛔ no name, ⛔ no address', async () => {
    search = {};
    setup([
      chase({
        people: [
          {
            person_key: 'nominee:66666666-6666-4666-8666-666666666666',
            role: 'nominee',
            rank: 1,
            status: 'dead',
            found_dead_on: '2026-09-20',
            reminders_accepted: 0,
            letters: [
              { letter_id: '77777777-7777-4777-8777-777777777777', person_key: 'nominee:66666666-6666-4666-8666-666666666666', sequence: 1, posted_on: '2026-09-01', delivered_on: null, overdue: true, has_screenshot: false },
            ],
          },
        ],
      }),
    ]);
    await screen.findByTestId(`correction-queue-item-${CLAIM}`);
    expect(screen.getByTestId('person-status').textContent).toContain('dead number');
    expect(screen.getByTestId('letter-overdue').getAttribute('role')).toBe('status');
    expect(screen.getByTestId('letter-form-nominee:66666666-6666-4666-8666-666666666666')).toBeInTheDocument();
    // The address is ⛔ on the page until asked for (step-up).
    expect(screen.queryByTestId('letter-address')).toBeNull();
    const text = (document.body.textContent ?? '').toLowerCase();
    for (const forbidden of ['rejected', 'denied', 'failed']) expect(text).not.toContain(forbidden);
  });

  it('⭐ `?claim=<id>` highlights that row (the staff push names the queue, it cannot deep-link)', async () => {
    search = { claim: CLAIM };
    setup([ITEM]);
    expect(await screen.findByTestId('queue-highlighted')).toBeInTheDocument();
    expect(screen.getByTestId(`correction-queue-item-${CLAIM}`).getAttribute('aria-current')).toBe('true');
    search = {};
  });

  it('⭐ `?escalated=true` asks the server for the escalated chases only (the Pariwar Admin\'s filter)', async () => {
    search = { escalated: true };
    getClaimsUnderCorrection.mockClear();
    setup([ITEM]);
    await screen.findByTestId(`correction-queue-item-${CLAIM}`);
    expect(getClaimsUnderCorrection).toHaveBeenCalledWith(PARIWAR, { escalated: true });
    expect((screen.getByTestId('correction-queue-escalated-only') as HTMLInputElement).checked).toBe(true);
    search = {};
  });

  it('the change-who-must-act form offers only the OTHER value and needs a note', async () => {
    search = {};
    setup([ITEM]);
    await screen.findByTestId(`correction-queue-item-${CLAIM}`);
    const form = screen.getByTestId(`must-act-form-${CLAIM}`);
    const radios = form.querySelectorAll('input[type="radio"]');
    expect(radios).toHaveLength(1);
    expect(form.textContent).toContain('Staff must put it right');
  });

  // ── Third-pass review (2026-09-30) ──────────────────────────────────────────────────────────────────────────────
  const PERSON = 'nominee:66666666-6666-4666-8666-666666666666';
  const LETTER = '77777777-7777-4777-8777-777777777777';
  const person = (over: Partial<Item['correction_chase']['people'][number]>): Item['correction_chase']['people'][number] => ({
    person_key: PERSON,
    role: 'nominee',
    rank: 1,
    status: 'not_yet',
    found_dead_on: null,
    reminders_accepted: 0,
    letters: [],
    ...over,
  });

  it('⭐ the region is named "Correction chase — <reference>" (⛔ "Who must act")', async () => {
    search = {};
    setup([ITEM]);
    await screen.findByTestId(`correction-queue-item-${CLAIM}`);
    expect(screen.getByRole('region', { name: 'Correction chase — 11111111' })).toBeInTheDocument();
  });

  it('⭐ a number found dead AFTER an earlier "reached" still gets the letter form — the gate is `found_dead_on`', async () => {
    search = {};
    setup([chase({ people: [person({ status: 'reached', reminders_accepted: 1, found_dead_on: '2026-09-22' })] })]);
    await screen.findByTestId(`correction-queue-item-${CLAIM}`);
    expect(screen.getByTestId(`letter-form-${PERSON}`)).toBeInTheDocument();
  });

  it('⛔ ⛔ no letter form for a person never found dead', async () => {
    search = {};
    setup([chase({ people: [person({ status: 'not_yet' })] })]);
    await screen.findByTestId(`correction-queue-item-${CLAIM}`);
    expect(screen.queryByTestId(`letter-form-${PERSON}`)).toBeNull();
  });

  it('⭐ after a switch to STAFF the letter AND delivery forms stay — they follow the person, ⛔ not the headline run', async () => {
    search = {};
    setup([
      chase({
        must_act: 'staff',
        run: { kind: 'staff', day0: '2026-09-25', day_count: 2, open: true, ended_on: null, next_reminder_on: '2026-09-28' },
        people: [
          person({
            status: 'dead',
            found_dead_on: '2026-09-20',
            letters: [{ letter_id: LETTER, person_key: PERSON, sequence: 1, posted_on: '2026-09-21', delivered_on: null, overdue: false, has_screenshot: false }],
          }),
        ],
      }),
    ]);
    await screen.findByTestId(`correction-queue-item-${CLAIM}`);
    expect(screen.getByTestId(`letter-form-${PERSON}`)).toBeInTheDocument();
    expect(screen.getByTestId(`delivery-form-${LETTER}`).getAttribute('aria-label')).toContain('#1 posted 2026-09-21');
    // ⭐ The letter's own state is announced.
    expect(screen.getByTestId('letter-state').getAttribute('role')).toBe('status');
  });

  it('⭐ an ENDED run shows when it started and the day it ended — ⛔ never a day count past 90', async () => {
    search = {};
    setup([chase({ run: { kind: 'family', day0: '2026-05-01', day_count: 140, open: false, ended_on: '2026-07-30', next_reminder_on: null } })]);
    await screen.findByTestId(`correction-queue-item-${CLAIM}`);
    const run = screen.getByTestId('queue-run').textContent ?? '';
    expect(run).not.toContain('140');
    expect(run).not.toContain('of 90');
    expect(run).toContain('started on 2026-05-01');
    expect(run).toContain('ended on 2026-07-30');
  });

  it('⭐ who-must-act shows its time in IST, and ⛔ no dangling separator when nothing is known', async () => {
    search = {};
    setup([ITEM]);
    await screen.findByTestId(`correction-queue-item-${CLAIM}`);
    const line = screen.getByTestId('queue-must-act').textContent ?? '';
    expect(line).not.toContain('T10:00');
    expect(line).toContain('3:30'); // 10:00 UTC = 15:30 IST
  });

  it('⛔ ⛔ no trailing "·" when the setter and the time are unknown', async () => {
    search = {};
    setup([chase({ must_act_set_by: null, must_act_set_at: null })]);
    await screen.findByTestId(`correction-queue-item-${CLAIM}`);
    expect((screen.getByTestId('queue-must-act').textContent ?? '').trim().endsWith('·')).toBe(false);
  });

  it('⭐ a `?claim=` that is ⛔ not in the list SAYS so — ⛔ never a silent miss', async () => {
    search = { claim: '99999999-9999-4999-8999-999999999999' };
    setup([ITEM]);
    expect(await screen.findByTestId('queue-claim-not-shown')).toHaveAttribute('role', 'status');
    expect(screen.queryByTestId('queue-highlighted')).toBeNull();
    search = {};
  });

  it('⭐ the escalated filter is NEUTRALLY worded — ⛔ "escalated to me" read wrong to the District Admin', async () => {
    search = {};
    setup([ITEM]);
    await screen.findByTestId(`correction-queue-item-${CLAIM}`);
    expect(document.body.textContent).not.toContain('escalated to me');
  });

  it('⭐ the screenshot is FETCHED, then offered as a new-tab link (noopener noreferrer) — ⛔ no `window.open` after an await', async () => {
    search = {};
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    getCorrectionLetterScreenshot.mockResolvedValue({ url: 'https://storage.example/proof.png?sig=1', expires_in_seconds: 300 });
    setup([
      chase({
        people: [
          person({
            status: 'dead',
            found_dead_on: '2026-09-20',
            letters: [{ letter_id: LETTER, person_key: PERSON, sequence: 1, posted_on: '2026-09-21', delivered_on: '2026-09-25', overdue: false, has_screenshot: true }],
          }),
        ],
      }),
    ]);
    await screen.findByTestId(`correction-queue-item-${CLAIM}`);
    fireEvent.click(screen.getByRole('button', { name: 'Get the screenshot link' }));
    const link = await screen.findByTestId('letter-screenshot-link');
    expect(link.getAttribute('href')).toBe('https://storage.example/proof.png?sig=1');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    expect(open).not.toHaveBeenCalled();
    open.mockRestore();
  });

  it('⛔ a non-https screenshot URL is ⛔ not offered', async () => {
    search = {};
    getCorrectionLetterScreenshot.mockResolvedValue({ url: 'http://storage.example/proof.png', expires_in_seconds: 300 });
    setup([
      chase({
        people: [
          person({
            status: 'dead',
            found_dead_on: '2026-09-20',
            letters: [{ letter_id: LETTER, person_key: PERSON, sequence: 1, posted_on: '2026-09-21', delivered_on: '2026-09-25', overdue: false, has_screenshot: true }],
          }),
        ],
      }),
    ]);
    await screen.findByTestId(`correction-queue-item-${CLAIM}`);
    fireEvent.click(screen.getByRole('button', { name: 'Get the screenshot link' }));
    expect(await screen.findByText('The screenshot link is not a secure link — it was not opened.')).toBeInTheDocument();
    expect(screen.queryByTestId('letter-screenshot-link')).toBeNull();
  });
});
