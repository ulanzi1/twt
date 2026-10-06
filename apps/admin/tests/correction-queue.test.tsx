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
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ClaimsUnderCorrectionResponse } from '@twt/contracts';

const navigate = vi.fn();
let search: Record<string, unknown> = {};
// ⭐ The `window.open` spy lives HERE so `afterEach` restores it even when an assertion throws first.
let openSpy: { mockRestore: () => void } | null = null;
// ⭐ A FLOOR, ⛔ not a substitute for the manual resets below: if an assertion in a test THROWS before its own
// `search = {}` (or `mockRestore`) runs, this still stops the leftover crossing into the next test.
afterEach(() => {
  search = {};
  openSpy?.mockRestore();
  openSpy = null;
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
  // Story 6.19c (AC8c) — the closure column: day 3 of the family run, a request would be too early.
  correction_closure: {
    state: null,
    origin: null,
    requested_at: null,
    requested_by: null,
    blocker: 'too_early',
    not_reached: null,
    family_run_day: 3,
  },
  // Story 6.23b (EA10) — ⛔ waiting on a late warning reason.
  late_warning_awaiting_reason: false,
  late_warning_uncovered_count: 0,
};

const setup = (items: Item[], lateWarningsUnavailable = false) => {
  getClaimsUnderCorrection.mockResolvedValue({ pariwar_id: PARIWAR, items, late_warnings_unavailable: lateWarningsUnavailable });
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

  it('⛔ ⛔ no trailing "·" when the time is unknown (the setter known) — nor when both are', async () => {
    search = {};
    // ⭐ The setter PRESENT and the time null — the case an unconditional " · <time>" separator got wrong.
    setup([chase({ must_act_set_by: 'Pariwar Admin Two', must_act_set_at: null })]);
    await screen.findByTestId(`correction-queue-item-${CLAIM}`);
    const line = screen.getByTestId('queue-must-act').textContent ?? '';
    expect(line).toContain('Pariwar Admin Two');
    expect(line.trim().endsWith('·')).toBe(false);
    expect(line).not.toMatch(/·\s*·/);
  });

  it('⛔ ⛔ no dangling "·" when neither the setter nor the time is known', async () => {
    search = {};
    setup([chase({ must_act_set_by: null, must_act_set_at: null })]);
    await screen.findByTestId(`correction-queue-item-${CLAIM}`);
    expect((screen.getByTestId('queue-must-act').textContent ?? '').trim().endsWith('·')).toBe(false);
  });

  it('⭐ an OPEN run past day 90 reads "past day 90" — ⛔ never "day 95 of 90"', async () => {
    search = {};
    setup([chase({ run: { kind: 'family', day0: '2026-06-01', day_count: 95, open: true, ended_on: null, next_reminder_on: null } })]);
    await screen.findByTestId(`correction-queue-item-${CLAIM}`);
    const run = screen.getByTestId('queue-run').textContent ?? '';
    expect(run).toContain('past day 90');
    expect(run).not.toContain('95');
    expect(run).not.toContain('of 90');
  });

  it('⭐ day 90 itself still reads "day 90 of 90"', async () => {
    search = {};
    setup([chase({ run: { kind: 'family', day0: '2026-06-01', day_count: 90, open: true, ended_on: null, next_reminder_on: null } })]);
    await screen.findByTestId(`correction-queue-item-${CLAIM}`);
    expect(screen.getByTestId('queue-run').textContent).toContain('day 90 of 90');
  });

  it('⭐ `?claim=` matches whatever its case — BOTH sides are lower-cased', async () => {
    search = { claim: CLAIM.toUpperCase() };
    setup([{ ...ITEM, claim_case_id: CLAIM.toUpperCase() }]);
    expect(await screen.findByTestId('queue-highlighted')).toBeInTheDocument();
    expect(screen.queryByTestId('queue-claim-not-shown')).toBeNull();
    search = { claim: CLAIM };
  });

  it('⭐ a `?claim=` that is ⛔ not in the list SAYS so — ⛔ never a silent miss', async () => {
    search = { claim: '99999999-9999-4999-8999-999999999999' };
    setup([ITEM]);
    // ⭐ Inside a PERSISTENT status region (mounted before the list arrived) — so its appearance is announced.
    const line = await screen.findByTestId('queue-claim-not-shown');
    expect(line.closest('[role="status"]')).toBe(screen.getByTestId('queue-claim-status'));
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
    openSpy = open;
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
    // ⭐ The button was swapped for the link — focus followed it, ⛔ dropped to <body>.
    await waitFor(() => expect(document.activeElement).toBe(link));
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
  const screenshotItem = () =>
    chase({
      people: [
        person({
          status: 'dead',
          found_dead_on: '2026-09-20',
          letters: [{ letter_id: LETTER, person_key: PERSON, sequence: 1, posted_on: '2026-09-21', delivered_on: '2026-09-25', overdue: false, has_screenshot: true }],
        }),
      ],
    });

  it('⛔ a 403 on the screenshot is the ROLE or the scope — a NEUTRAL line, ⛔ "Try again"', async () => {
    search = {};
    const { ApiError } = await import('../src/api/client.js');
    getCorrectionLetterScreenshot.mockRejectedValue(new ApiError(403, 'auth.forbidden', 'no'));
    setup([screenshotItem()]);
    await screen.findByTestId(`correction-queue-item-${CLAIM}`);
    const statusLine = screen.getByTestId('letter-screenshot-status');
    expect(statusLine.textContent).toBe(''); // ⭐ persistent — its text changes, so it is announced
    fireEvent.click(screen.getByRole('button', { name: 'Get the screenshot link' }));
    await waitFor(() => expect(statusLine.textContent).toBe('Your access does not cover this claim.'));
  });

  it.each([
    [404, 'correction_letter.no_screenshot', 'No screenshot is on record for this letter. Reload the page.'],
    [401, 'auth.session_required', 'Your session has ended. Sign in again to continue.'],
    [429, 'rate_limit.exceeded', 'Too many attempts in a short time. Wait a few minutes, then try again.'],
    [500, 'internal', 'The screenshot could not be opened. Try again.'],
  ])('⭐ a %s on the screenshot reads as its OWN line (fifth-pass review)', async (status, code, copy) => {
    search = {};
    const { ApiError } = await import('../src/api/client.js');
    getCorrectionLetterScreenshot.mockRejectedValue(new ApiError(status, code, 'no'));
    setup([screenshotItem()]);
    await screen.findByTestId(`correction-queue-item-${CLAIM}`);
    fireEvent.click(screen.getByRole('button', { name: 'Get the screenshot link' }));
    await waitFor(() => expect(screen.getByTestId('letter-screenshot-status').textContent).toBe(copy));
  });

  it('⭐ the link is dropped a few seconds BEFORE the signed URL expires, and focus returns to the button', async () => {
    search = {};
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      getCorrectionLetterScreenshot.mockResolvedValue({ url: 'https://storage.example/proof.png?sig=1', expires_in_seconds: 60 });
      setup([screenshotItem()]);
      await screen.findByTestId(`correction-queue-item-${CLAIM}`);
      fireEvent.click(screen.getByRole('button', { name: 'Get the screenshot link' }));
      const link = await screen.findByTestId('letter-screenshot-link');
      await waitFor(() => expect(document.activeElement).toBe(link));
      await act(async () => {
        vi.advanceTimersByTime(56_000);
      });
      expect(screen.queryByTestId('letter-screenshot-link')).toBeNull();
      // ⭐ The expiry SAYS so — ⛔ the link silently turning back into the button.
      expect(screen.getByTestId('letter-screenshot-status').textContent).toBe('The screenshot link expired. Get a new link to open it.');
      await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Get the screenshot link' })));
    } finally {
      vi.useRealTimers();
    }
  });

  it('⭐ `screenshotLinkTtlMs` validates the server value — finite, > 0, clamped, minus a margin', async () => {
    const { screenshotLinkTtlMs } = await import('../src/modules/correction-chase/CorrectionChasePanel.js');
    expect(screenshotLinkTtlMs(300)).toBe(295_000);
    expect(screenshotLinkTtlMs(10_000_000)).toBe((3600 - 5) * 1000); // a huge value would overflow `setTimeout`
    for (const bad of [0, -1, 3, Number.NaN, Number.POSITIVE_INFINITY, '300', null, undefined]) {
      expect(screenshotLinkTtlMs(bad), String(bad)).toBeNull();
    }
  });
});

// ── Fifth-pass review (2026-10-01) — a failed REFETCH keeps the list; nominee labels without a rank ────────────────
describe('<CorrectionQueueRoute> — a failed refetch is a banner, ⛔ a wiped list', () => {
  it('⭐ the list STAYS when a refetch fails, with a non-blocking banner; the full error branch is only for ⛔ no data', async () => {
    search = {};
    const { ApiError } = await import('../src/api/client.js');
    getClaimsUnderCorrection.mockReset();
    getClaimsUnderCorrection
      .mockResolvedValueOnce({ pariwar_id: PARIWAR, items: [ITEM] })
      .mockRejectedValueOnce(new ApiError(503, 'internal', 'down'));
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <CorrectionQueueRoute />
      </QueryClientProvider>,
    );
    const row = await screen.findByTestId(`correction-queue-item-${CLAIM}`);
    await act(async () => {
      await qc.refetchQueries({ queryKey: ['claims-under-correction', PARIWAR] });
    });
    expect(await screen.findByTestId('correction-queue-refetch-error')).toHaveTextContent(
      'The list could not be refreshed, so it may be out of date.',
    );
    // The SAME row node — ⛔ unmounted and re-created (which would drop a revealed address and typed fields).
    expect(screen.getByTestId(`correction-queue-item-${CLAIM}`)).toBe(row);
    expect(screen.queryByTestId('correction-queue-error')).toBeNull();
  });

  it('⛔ a first load that fails (⛔ no data) still shows the full error branch, ⛔ a banner', async () => {
    search = {};
    const { ApiError } = await import('../src/api/client.js');
    getClaimsUnderCorrection.mockReset();
    getClaimsUnderCorrection.mockRejectedValue(new ApiError(503, 'internal', 'down'));
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <CorrectionQueueRoute />
      </QueryClientProvider>,
    );
    expect(await screen.findByTestId('correction-queue-error')).toBeInTheDocument();
    expect(screen.queryByTestId('correction-queue-refetch-error')).toBeNull();
  });
});

describe('<CorrectionQueueRoute> — nominees WITHOUT a rank (D30) are told apart', () => {
  it('⭐ "Nominee A" / "Nominee B" by person-key order — ⛔ two rows both reading "Nominee"', async () => {
    search = {};
    const nominee = (key: string) => ({
      person_key: key,
      role: 'nominee' as const,
      rank: null,
      status: 'not_yet' as const,
      found_dead_on: null,
      reminders_accepted: 0,
      letters: [],
    });
    const K1 = 'nominee:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const K2 = 'nominee:bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    // Listed in REVERSE key order — the label follows the key, ⛔ the list position.
    setup([{ ...ITEM, correction_chase: { ...ITEM.correction_chase, cannot_remind: 'undetermined', people: [nominee(K2), nominee(K1)] } }]);
    await screen.findByTestId(`correction-queue-item-${CLAIM}`);
    expect(screen.getByTestId(`person-${K1}`).textContent).toContain('Nominee A');
    expect(screen.getByTestId(`person-${K2}`).textContent).toContain('Nominee B');
  });

  it('⭐ a known rank is used as is', async () => {
    const { personLabels } = await import('../src/modules/correction-chase/CorrectionChasePanel.js');
    const base = { status: 'reached' as const, found_dead_on: null, reminders_accepted: 0, letters: [] };
    const labels = personLabels([
      { ...base, person_key: 'nominee:2', role: 'nominee', rank: 2 },
      { ...base, person_key: 'claimant', role: 'claimant', rank: null },
      { ...base, person_key: 'nominee:1', role: 'nominee', rank: 1 },
    ]);
    expect(labels.get('nominee:1')).toBe('Nominee 1');
    expect(labels.get('nominee:2')).toBe('Nominee 2');
    expect(labels.get('claimant')).toBe('Claimant');
  });
});

// ── Story 6.23b (EA10; AC10) — the District Admin is TOLD a claim waits for their late reason ─────────────────────────
describe('<CorrectionQueueRoute> — the late-warning row (Story 6.23b, AC10)', () => {
  const lateOnly: Item = {
    ...ITEM,
    returned_at: null,
    returned_by_actor_display: null,
    return_note: null,
    late_warning_awaiting_reason: true,
    late_warning_uncovered_count: 1,
  };

  it('⭐ a late-warning-ONLY row: the badge, the words, the open-the-claim action — and ⛔ chase, ⛔ closure actions (⛔ live return)', async () => {
    setup([lateOnly]);
    expect(await screen.findByTestId('queue-badge-late-warning')).toHaveTextContent('a late warning awaits your reason');
    expect(screen.getByTestId('queue-late-warning-line')).toHaveTextContent(/appeared after your approval.*not refused/);
    expect(screen.getByTestId(`queue-open-${CLAIM}`)).toBeInTheDocument();
    expect(screen.queryByTestId('queue-short-reference')).toBeNull();
    expect(screen.queryByTestId(`closure-column-${CLAIM}`)).toBeNull();
    expect(screen.queryByTestId('queue-badge-returned')).toBeNull();
  });

  it('a claim BOTH returned and late-warned shows both, with its chase and closure', async () => {
    setup([{ ...ITEM, late_warning_awaiting_reason: true, late_warning_uncovered_count: 2 }]);
    expect(await screen.findByTestId('queue-badge-late-warning')).toBeInTheDocument();
    expect(screen.getByTestId('queue-badge-returned')).toBeInTheDocument();
    expect(screen.getByTestId('queue-late-warning-line')).toHaveTextContent(/^2 nominee-change warnings/);
    expect(screen.getByTestId('queue-short-reference')).toBeInTheDocument();
    expect(screen.getByTestId(`closure-column-${CLAIM}`)).toBeInTheDocument();
  });

  // Code review 2026-10-06 (P39): the hide condition is a 3-way AND (`late_warning_awaiting_reason && returned_at
  // === null && !sent_back_by_check`) — only "late-only, nothing else true" and "late + returned_at set" were
  // exercised. This covers the third combination: late-warned AND sent-back-by-check, but ⛔ no live return.
  it('a claim late-warned AND sent-back-by-check (⛔ no live return) shows its chase and closure too', async () => {
    setup([{ ...lateOnly, sent_back_by_check: true }]);
    expect(await screen.findByTestId('queue-badge-late-warning')).toBeInTheDocument();
    expect(screen.getByTestId('queue-badge-check')).toBeInTheDocument();
    expect(screen.getByTestId('queue-late-warning-line')).toBeInTheDocument();
    expect(screen.getByTestId('queue-short-reference')).toBeInTheDocument();
    expect(screen.getByTestId(`closure-column-${CLAIM}`)).toBeInTheDocument();
  });

  it('⭐ invariant 7 — the late arm unavailable is SAID, and an empty list is ⛔ read as "nothing waiting"', async () => {
    setup([], true);
    expect(await screen.findByTestId('correction-queue-late-unavailable')).toHaveTextContent(/could not be checked just now/);
    expect(screen.queryByTestId('correction-queue-empty')).toBeNull();
  });
});
