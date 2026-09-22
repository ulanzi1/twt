// <R9CasePanel> + <R9VotingPage> — the R9 screen's half of Story 6.18 (AC2 on demand, AC8, D3).
//
// ⭐⭐ WHY THIS FILE EXISTS. No test touched `R9CasePanel` at all (code review 2026-09-20, bullet
// "the admin UI halves"). R9 is its OWN path to approval — `finalizeR9Outcome` reaches
// `state_trustee_approved` without the District Admin's verification approval ever running (P4) —
// so the panel that decides an R9 claim is the one surface that most needs to (a) SEE the AC8
// highlight and (b) be able to look at the two names.
//
// ⚠⚠ AND WRITING IT FOUND THE AC8 HALF UN-BUILT. The server has carried `name_difference_reasons` on
// both R9 reads (queue + panel) since chunk 2 of the 2026-09-20 review, precisely so the flag could
// ride the surface's OWN, non-PII read. ⛔ Nothing in `apps/admin` rendered it: the only way an R9
// voter could learn a difference had been accepted was to open the Tier-1 names disclosure — i.e.
// to decrypt a living nominee's name — which is the exact opposite of what AC8 prescribes.
//
// ⛔ THE ON-DEMAND FETCH IS A PII CONTROL: the names read decrypts a living nominee's name and writes
// an audit line meaning "a human chose to look". The "no fetch until opened" assertions pin that.

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { NomineeNameCheckResponse, R9PanelResponse, R9QueueResponse } from '@twt/contracts';

const getR9Panel = vi.fn();
const getR9Queue = vi.fn();
const getNomineeNameCheck = vi.fn();
const getSession = vi.fn();
vi.mock('../src/api/client.js', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    getR9Panel: (p: string, c: string) => getR9Panel(p, c),
    getR9Queue: (p: string) => getR9Queue(p),
    getNomineeNameCheck: (p: string, c: string) => getNomineeNameCheck(p, c),
    getSession: () => getSession(),
  };
});

const { R9CasePanel } = await import('../src/modules/r9-voting/R9CasePanel.js');
const { R9VotingPage } = await import('../src/modules/r9-voting/R9VotingPage.js');
const { verifierConsoleEn: t } = await import('../src/modules/claim-verification/i18n-en.js');

const PARIWAR = '44444444-4444-4444-8444-444444444444';
const CLAIM = '11111111-1111-4111-8111-111111111111';
const MEMBER = '22222222-2222-4222-8222-222222222222';
const ME = '33333333-3333-4333-8333-333333333333';

const PANEL_NO_SESSION: R9PanelResponse = {
  claim_case_id: CLAIM,
  deceased_member_id: MEMBER,
  current_state: 'state_trustee_freeze',
  session: null,
  votes: [],
  tally: null,
  name_difference_reasons: [],
};

const PANEL_OPEN: R9PanelResponse = {
  ...PANEL_NO_SESSION,
  session: {
    session_id: '55555555-5555-4555-8555-555555555555',
    clause_id: 'niy.special-death.r9',
    clause_version_id: '66666666-6666-4666-8666-666666666666',
    rule_code: 'R9',
    voting_requirement: 'majority',
    panel: [{ actor_id: ME, actor_display: 'Meera Joshi' }],
    quorum_required: 1,
    opened_by_actor: ME,
    opened_display: 'Meera Joshi',
    opened_at: '2026-09-20T10:00:00.000Z',
    outcome: null,
    finalized_display: null,
    finalized_at: null,
  },
  tally: {
    approve_count: 0,
    deny_count: 0,
    cast_votes: 0,
    panel_size: 1,
    quorum_required: 1,
    provisional_outcome: 'denied',
    quorum_met: false,
  },
};

const NAMES: NomineeNameCheckResponse = {
  claim_case_id: CLAIM,
  claim_state: 'state_trustee_freeze',
  deceased_member_id: MEMBER,
  accounts: [
    {
      account_rank: 1,
      account_updated_at: '2026-09-20T10:00:00.000Z',
      holder_name: { state: 'readable', value: 'Rani Devi' },
      name_difference_note: null,
    },
    {
      account_rank: 2,
      account_updated_at: '2026-09-20T10:00:01.000Z',
      holder_name: { state: 'readable', value: 'R. Devi' },
      name_difference_note: null,
    },
  ],
  accounts_complete: true,
  declared_nominees: [
    {
      rank: 1,
      split_pct: 100,
      relationship: 'spouse',
      nominee_name: { state: 'readable', value: 'Rani Kumari' },
    },
  ],
  nominee_declaration_token: 'tok-1',
  nominee_declared_at: '2026-01-01T00:00:00.000Z',
  claim_filed_at: '2026-09-01T00:00:00.000Z',
  current_check: {
    checked_at: '2026-09-20T11:00:00.000Z',
    checked_by_actor_display: 'Kalpana Bharti',
    nominee_declaration_token: 'tok-1',
    passing: true,
    accounts: [
      {
        account_rank: 1,
        account_updated_at: '2026-09-20T10:00:00.000Z',
        verdict: 'clerical_difference',
        clerical_reason: 'married_name',
      },
      {
        account_rank: 2,
        account_updated_at: '2026-09-20T10:00:01.000Z',
        verdict: 'matches',
        clerical_reason: null,
      },
    ],
  },
  latest_check_is_stale: false,
  correction_return: null,
};

const renderIt = (ui: React.ReactElement): void => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
};

beforeEach(() => {
  getR9Panel.mockReset();
  getR9Queue.mockReset();
  getNomineeNameCheck.mockReset();
  getSession.mockReset();
  getSession.mockResolvedValue({ userId: ME, nationalGrants: [] });
  getNomineeNameCheck.mockResolvedValue(NAMES);
});

describe('<R9CasePanel> — AC8, the highlight rides the R9 panel’s OWN read', () => {
  it('⭐⭐ shows "Approved with a name difference" + the reason LABEL — WITHOUT opening the names', async () => {
    getR9Panel.mockResolvedValue({ ...PANEL_OPEN, name_difference_reasons: ['married_name'] });
    renderIt(<R9CasePanel pariwarId={PARIWAR} claimCaseId={CLAIM} />);
    const flag = await screen.findByTestId('r9-name-difference-flag');
    expect(flag).toHaveTextContent(
      `${t.nameCheck.approvedWithDifference}: ${t.nameCheck.reasons.married_name}`,
    );
    // ⛔ The raw code is never the label (the two voting surfaces agreed on LABELS in chunk 3).
    expect(flag.textContent).not.toContain('married_name');
    // ⛔⛔ AND NO NAME WAS DECRYPTED TO SHOW IT — the whole point of AC8's "rides the surface's own read".
    expect(getNomineeNameCheck).not.toHaveBeenCalled();
  });

  it('⭐ the flag shows on the OPEN form too (no live session) — the claim is still being decided', async () => {
    getR9Panel.mockResolvedValue({
      ...PANEL_NO_SESSION,
      name_difference_reasons: ['initial', 'bank_shortened_name'],
    });
    renderIt(<R9CasePanel pariwarId={PARIWAR} claimCaseId={CLAIM} />);
    expect(await screen.findByTestId('r9-name-difference-flag')).toHaveTextContent(
      `${t.nameCheck.reasons.initial}, ${t.nameCheck.reasons.bank_shortened_name}`,
    );
  });

  it('⛔ NO flag when the read carries no reason (no difference, a STALE check, or a non-passing one)', async () => {
    getR9Panel.mockResolvedValue(PANEL_OPEN);
    renderIt(<R9CasePanel pariwarId={PARIWAR} claimCaseId={CLAIM} />);
    await screen.findByTestId('r9-name-check-disclosure');
    expect(screen.queryByTestId('r9-name-difference-flag')).toBeNull();
  });

  it('falls back to the CODE for a reason it does not recognise — ⛔ never the literal "undefined"', async () => {
    getR9Panel.mockResolvedValue({
      ...PANEL_OPEN,
      name_difference_reasons: ['some_future_reason'],
    });
    renderIt(<R9CasePanel pariwarId={PARIWAR} claimCaseId={CLAIM} />);
    const flag = await screen.findByTestId('r9-name-difference-flag');
    expect(flag).toHaveTextContent('some_future_reason');
    expect(flag.textContent).not.toContain('undefined');
  });
});

describe('<R9CasePanel> — AC2 on demand, D3: the voter can look at the two names', () => {
  it('⛔⛔ does NOT fetch the names on render — the fetch is a PII control, ⛔ not lazy loading', async () => {
    getR9Panel.mockResolvedValue(PANEL_OPEN);
    renderIt(<R9CasePanel pariwarId={PARIWAR} claimCaseId={CLAIM} />);
    await screen.findByTestId('r9-name-check-disclosure');
    expect(getNomineeNameCheck).not.toHaveBeenCalled();
    expect(screen.queryByTestId('name-check-panel')).toBeNull();
  });

  it('⭐ opening the disclosure fetches and shows BOTH columns — once, for THIS claim', async () => {
    getR9Panel.mockResolvedValue(PANEL_OPEN);
    renderIt(<R9CasePanel pariwarId={PARIWAR} claimCaseId={CLAIM} />);
    fireEvent.click(await screen.findByTestId('r9-name-check-disclosure'));
    expect(await screen.findByTestId('name-check-account-1')).toHaveTextContent('Rani Devi');
    expect(screen.getByTestId('name-check-nominee-1')).toHaveTextContent('Rani Kumari');
    expect(getNomineeNameCheck).toHaveBeenCalledTimes(1);
    expect(getNomineeNameCheck).toHaveBeenCalledWith(PARIWAR, CLAIM);
  });

  it('⛔ the R9 voter gets ⛔ NO verdict control — recording the check is the District Admin’s alone (`-226` cl.3)', async () => {
    getR9Panel.mockResolvedValue(PANEL_OPEN);
    renderIt(<R9CasePanel pariwarId={PARIWAR} claimCaseId={CLAIM} />);
    fireEvent.click(await screen.findByTestId('r9-name-check-disclosure'));
    await screen.findByTestId('name-check-panel');
    expect(screen.queryByTestId('name-check-form')).toBeNull();
    expect(screen.queryByTestId('name-check-submit')).toBeNull();
  });

  it('⭐ the disclosure is offered on the OPEN form as well — a panel is chosen for this claim there', async () => {
    getR9Panel.mockResolvedValue(PANEL_NO_SESSION);
    renderIt(<R9CasePanel pariwarId={PARIWAR} claimCaseId={CLAIM} />);
    fireEvent.click(await screen.findByTestId('r9-name-check-disclosure'));
    expect(await screen.findByTestId('name-check-account-2')).toHaveTextContent('R. Devi');
  });

  it('⛔ a FAILED names read says so — ⛔ never an empty panel that reads as "no names on this claim"', async () => {
    getR9Panel.mockResolvedValue(PANEL_OPEN);
    getNomineeNameCheck.mockRejectedValue(new Error('boom'));
    renderIt(<R9CasePanel pariwarId={PARIWAR} claimCaseId={CLAIM} />);
    fireEvent.click(await screen.findByTestId('r9-name-check-disclosure'));
    expect(await screen.findByTestId('name-check-error')).toHaveTextContent(t.nameCheck.loadError);
    expect(screen.queryByTestId('name-check-accounts')).toBeNull();
  });
});

describe('<R9VotingPage> — AC8 on the R9 QUEUE, from the queue’s own read', () => {
  it('⭐ badges a queued claim whose passing check accepted a difference — and ⛔ not one that did not', async () => {
    const OTHER = '77777777-7777-4777-8777-777777777777';
    const queue: R9QueueResponse = {
      pariwar_id: PARIWAR,
      items: [
        {
          claim_case_id: CLAIM,
          deceased_member_id: MEMBER,
          routing_actor_display: 'Kalpana Bharti',
          routing_reason_code: null,
          session_open: false,
          name_difference_reasons: ['married_name'],
        },
        {
          claim_case_id: OTHER,
          deceased_member_id: MEMBER,
          routing_actor_display: 'Kalpana Bharti',
          routing_reason_code: null,
          session_open: false,
          name_difference_reasons: [],
        },
      ],
    };
    getR9Queue.mockResolvedValue(queue);
    renderIt(<R9VotingPage pariwarId={PARIWAR} />);
    expect(await screen.findByTestId(`r9-queue-name-difference-${CLAIM}`)).toHaveTextContent(
      t.nameCheck.reasons.married_name,
    );
    expect(screen.queryByTestId(`r9-queue-name-difference-${OTHER}`)).toBeNull();
    await waitFor(() => expect(getNomineeNameCheck).not.toHaveBeenCalled());
  });
});
