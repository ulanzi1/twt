// <NomineeNameCheckPanel> — Story 6.18 (AC2, AC3, AC5, AC6, AC8).
//
// ⛔⛔ THE MOST IMPORTANT ASSERTIONS HERE ARE THE ABSENCES. `2026-09-19-226` cl.5 rules the system
// never acts on a name mismatch, so the console must render ⛔ no match hint, ⛔ no score and ⛔ no
// diff. A test suite that only checked the happy path would let a future "helpful" highlight land
// unnoticed and quietly reverse a ratified ruling.

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { NomineeNameCheckResponse } from '@twt/contracts';

import { NomineeNameCheckPanel } from '../src/modules/claim-verification/index.js';

const READ: NomineeNameCheckResponse = {
  claim_case_id: '11111111-1111-4111-8111-111111111111',
  claim_state: 'verifier_review',
  deceased_member_id: '22222222-2222-4222-8222-222222222222',
  accounts: [
    {
      account_rank: 1,
      account_updated_at: '2026-09-20T10:00:00.000Z',
      holder_name: { state: 'readable', value: 'A. Devi' },
      name_difference_note: { state: 'readable', value: 'the bank shortened her name' },
    },
    {
      account_rank: 2,
      account_updated_at: '2026-09-20T10:00:01.000Z',
      holder_name: { state: 'readable', value: 'Asha Devi' },
      name_difference_note: null,
    },
  ],
  accounts_complete: true,
  declared_nominees: [
    { rank: 1, split_pct: 75, relationship: 'spouse', nominee_name: { state: 'readable', value: 'Asha Devi' } },
    { rank: 2, split_pct: 25, relationship: 'child', nominee_name: { state: 'readable', value: 'Ravi Kumar' } },
  ],
  nominee_declaration_token: 'tok-1',
  nominee_declared_at: '2026-01-01T00:00:00.000Z',
  claim_filed_at: '2026-09-01T00:00:00.000Z',
  current_check: null,
  correction_return: null,
};

const setup = (data: NomineeNameCheckResponse = READ, canCheck = true) => {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  render(<NomineeNameCheckPanel data={data} canCheck={canCheck} onSubmit={onSubmit} />);
  return { onSubmit };
};

describe('<NomineeNameCheckPanel> — AC2, the two names', () => {
  it('shows both the bank holder names and the declared nominees, plus the filer note', () => {
    setup();
    expect(screen.getByTestId('name-check-account-1')).toHaveTextContent('A. Devi');
    expect(screen.getByTestId('name-check-account-2')).toHaveTextContent('Asha Devi');
    expect(screen.getByTestId('name-check-nominee-1')).toHaveTextContent('Asha Devi');
    expect(screen.getByTestId('name-check-nominee-2')).toHaveTextContent('Ravi Kumar');
    expect(screen.getByTestId('name-check-note-1')).toHaveTextContent('the bank shortened her name');
  });

  it('⛔⛔ renders NO match hint, NO score and NO diff wording anywhere (Trap 1, cl.5)', () => {
    setup();
    const text = screen.getByTestId('name-check-panel').textContent ?? '';
    for (const forbidden of ['match found', 'likely', 'similar', 'score', '%match', 'mismatch detected', 'differs from']) {
      expect(text.toLowerCase(), `the panel rendered a comparison hint: ${forbidden}`).not.toContain(
        forbidden.toLowerCase(),
      );
    }
    // ⭐ And no pairing: the two columns are independent lists, so neither account element may
    // contain a nominee element (which is what a rendered pairing would look like in the DOM).
    expect(screen.getByTestId('name-check-accounts').querySelector('[data-testid^="name-check-nominee-"]')).toBeNull();
  });

  it('shows the two dates plainly, with no derived warning (AC2/AC10)', () => {
    setup();
    const dates = screen.getByTestId('name-check-dates');
    expect(dates).toHaveTextContent('2026-01-01T00:00:00.000Z');
    expect(dates).toHaveTextContent('2026-09-01T00:00:00.000Z');
    expect(dates.textContent?.toLowerCase() ?? '').not.toContain('warning');
    expect(dates.textContent?.toLowerCase() ?? '').not.toContain('after');
  });

  it('⭐ renders `unreadable` and `anonymized` as DIFFERENT, named states — never a blank', () => {
    setup({
      ...READ,
      accounts: [
        { ...READ.accounts[0]!, holder_name: { state: 'unreadable' }, name_difference_note: null },
        READ.accounts[1]!,
      ],
      declared_nominees: [{ rank: 1, split_pct: 100, relationship: 'spouse', nominee_name: { state: 'anonymized' } }],
    });
    const unreadable = screen.getByTestId('name-check-account-1').textContent ?? '';
    const anonymized = screen.getByTestId('name-check-nominee-1').textContent ?? '';
    expect(unreadable).toContain('Could not be read');
    expect(anonymized).toContain('Removed at this person’s request');
    // They must NOT read the same — one is a fault, the other is a lawful erasure.
    expect(unreadable).not.toBe(anonymized);
  });

  it('says ZERO nominees explicitly (AC2)', () => {
    setup({ ...READ, declared_nominees: [] });
    expect(screen.getByTestId('name-check-no-nominees')).toHaveTextContent('declared no nominees');
  });

  it('⭐ AC6 — says the bank details are NEEDED, and never that the claim is refused', () => {
    setup({ ...READ, accounts: [], accounts_complete: false });
    const msg = screen.getByTestId('name-check-bank-missing').textContent ?? '';
    expect(msg).toContain('waits');
    expect(msg.toLowerCase()).not.toContain('denied');
    expect(msg.toLowerCase()).not.toContain('rejected');
    // ⭐ And there is NO verdict form at all: with no accounts there is nothing to record a verdict
    // ABOUT, so offering the control would invite a judgement about data that does not exist.
    expect(screen.queryByTestId('name-check-form')).toBeNull();
  });
});

describe('<NomineeNameCheckPanel> — AC3, recording the verdict', () => {
  it('⛔ refuses to submit until every account has a verdict', async () => {
    const { onSubmit } = setup();
    fireEvent.click(screen.getByTestId('name-check-submit'));
    await waitFor(() => expect(screen.getByTestId('name-check-validation-error')).toBeInTheDocument());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("⭐ cl.5 — a clerical difference cannot proceed without a SELECTED reason", async () => {
    const { onSubmit } = setup();
    fireEvent.change(screen.getByTestId('name-check-verdict-1'), { target: { value: 'clerical_difference' } });
    fireEvent.change(screen.getByTestId('name-check-verdict-2'), { target: { value: 'matches' } });
    fireEvent.click(screen.getByTestId('name-check-submit'));
    await waitFor(() =>
      expect(screen.getByTestId('name-check-validation-error')).toHaveTextContent('Select the reason'),
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits both verdicts with the reason and BOTH staleness tokens (D1)', async () => {
    const { onSubmit } = setup();
    fireEvent.change(screen.getByTestId('name-check-verdict-1'), { target: { value: 'clerical_difference' } });
    fireEvent.change(screen.getByTestId('name-check-reason-1'), { target: { value: 'bank_shortened_name' } });
    fireEvent.change(screen.getByTestId('name-check-verdict-2'), { target: { value: 'matches' } });
    fireEvent.click(screen.getByTestId('name-check-submit'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({
      nominee_declaration_token: 'tok-1',
      accounts: [
        {
          account_rank: 1,
          account_updated_at: '2026-09-20T10:00:00.000Z',
          verdict: 'clerical_difference',
          clerical_reason: 'bank_shortened_name',
        },
        { account_rank: 2, account_updated_at: '2026-09-20T10:00:01.000Z', verdict: 'matches' },
      ],
    });
  });

  it('⛔ clears a stale reason when the verdict leaves clerical_difference (the boundary FORBIDS one)', async () => {
    const { onSubmit } = setup();
    fireEvent.change(screen.getByTestId('name-check-verdict-1'), { target: { value: 'clerical_difference' } });
    fireEvent.change(screen.getByTestId('name-check-reason-1'), { target: { value: 'initial' } });
    fireEvent.change(screen.getByTestId('name-check-verdict-1'), { target: { value: 'matches' } });
    fireEvent.change(screen.getByTestId('name-check-verdict-2'), { target: { value: 'matches' } });
    fireEvent.click(screen.getByTestId('name-check-submit'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    // A reason on `matches` would be a 400 — and would put a "difference" on the record for a claim
    // the District Admin said had none, which AC8's highlight then reads.
    expect(onSubmit.mock.calls[0]![0].accounts[0]).not.toHaveProperty('clerical_reason');
  });

  it('⭐ AC5 — a does_not_match verdict says the claim is SENT BACK, never denied', () => {
    setup();
    fireEvent.change(screen.getByTestId('name-check-verdict-1'), { target: { value: 'does_not_match' } });
    const hint = screen.getByTestId('name-check-sent-back-hint').textContent ?? '';
    expect(hint).toContain('send the claim back');
    expect(hint).toContain('not denied');
  });

  it('⛔ AC1 — a viewer WITHOUT the check key sees the names but gets no verdict control', () => {
    setup(READ, false);
    expect(screen.getByTestId('name-check-account-1')).toBeInTheDocument();
    expect(screen.queryByTestId('name-check-form')).toBeNull();
  });
});

describe('<NomineeNameCheckPanel> — AC11, the Pariwar Admin returned it', () => {
  const returned = (resubmitted: boolean) => ({
    ...READ,
    correction_return: {
      returned_at: '2026-09-20T12:00:00.000Z',
      returned_by_actor_display: 'Dhiraj Rahul',
      note: { state: 'readable' as const, value: 'the holder name is not the declared nominee' },
      resubmitted,
    },
  });

  it("⭐ shows the Pariwar Admin's NOTE — the instruction the District Admin came here to act on", () => {
    setup(returned(false));
    expect(screen.getByTestId('name-check-return-note')).toHaveTextContent(
      'the holder name is not the declared nominee',
    );
    expect(screen.getByTestId('name-check-returned')).toHaveTextContent('Dhiraj Rahul');
  });

  it('⛔ the wording says RETURNED — never denied, rejected or failed', () => {
    setup(returned(false));
    const text = screen.getByTestId('name-check-returned').textContent?.toLowerCase() ?? '';
    expect(text).toContain('returned');
    for (const forbidden of ['denied', 'rejected', 'failed', 'refused']) {
      expect(text, `the return panel said "${forbidden}"`).not.toContain(forbidden);
    }
  });

  it('tells the District Admin what to do while the correction is outstanding, and says the claim stays open', () => {
    setup(returned(false));
    const msg = screen.getByTestId('name-check-resubmitted').textContent ?? '';
    expect(msg).toContain('Contact the claimant');
    expect(msg).toContain('claim stays open');
  });

  it('⭐ shows "re-checked" once the DERIVED resubmission holds — and offers NO resubmit button', () => {
    setup(returned(true));
    expect(screen.getByTestId('name-check-resubmitted')).toHaveTextContent('back with the Pariwar Admin');
    // ⛔ The resubmission is DERIVED: no route, no key, no control. Checking again IS the act.
    expect(screen.queryByTestId('name-check-resubmit')).toBeNull();
    expect(document.body.textContent?.toLowerCase() ?? '').not.toContain('re-submit claim');
  });

  it('⛔ renders nothing at all when the claim is not under correction', () => {
    setup();
    expect(screen.queryByTestId('name-check-returned')).toBeNull();
  });

  it('an UNREADABLE note says so — never a blank that reads as "they said nothing"', () => {
    setup({
      ...READ,
      correction_return: {
        returned_at: '2026-09-20T12:00:00.000Z',
        returned_by_actor_display: 'Dhiraj Rahul',
        note: { state: 'unreadable' as const },
        resubmitted: false,
      },
    });
    expect(screen.getByTestId('name-check-return-note')).toHaveTextContent('Could not be read');
  });
});

describe('<NomineeNameCheckPanel> — AC8, the highlight', () => {
  it('shows "Approved with a name difference" + the reason CODE when one was recorded', () => {
    setup({
      ...READ,
      current_check: {
        checked_at: '2026-09-20T11:00:00.000Z',
        checked_by_actor_display: 'Anita Kumari',
        nominee_declaration_token: 'tok-1',
        passing: true,
        accounts: [
          { account_rank: 1, account_updated_at: '2026-09-20T10:00:00.000Z', verdict: 'clerical_difference', clerical_reason: 'married_name' },
          { account_rank: 2, account_updated_at: '2026-09-20T10:00:01.000Z', verdict: 'matches', clerical_reason: null },
        ],
      },
    });
    const flag = screen.getByTestId('name-check-difference-flag').textContent ?? '';
    expect(flag).toContain('Approved with a name difference');
    expect(flag).toContain('A married name');
    // ⛔ The flag carries a reason CODE's label, never a name.
    expect(flag).not.toContain('Asha');
    expect(flag).not.toContain('Devi');
  });

  it('shows NO difference flag when every verdict was `matches`', () => {
    setup({
      ...READ,
      current_check: {
        checked_at: '2026-09-20T11:00:00.000Z',
        checked_by_actor_display: 'Anita Kumari',
        nominee_declaration_token: 'tok-1',
        passing: true,
        accounts: [
          { account_rank: 1, account_updated_at: '2026-09-20T10:00:00.000Z', verdict: 'matches', clerical_reason: null },
          { account_rank: 2, account_updated_at: '2026-09-20T10:00:01.000Z', verdict: 'matches', clerical_reason: null },
        ],
      },
    });
    expect(screen.queryByTestId('name-check-difference-flag')).toBeNull();
  });

  it('⛔ says a claim was NEVER checked rather than implying it passed (no back-fill)', () => {
    setup();
    expect(screen.getByTestId('name-check-none')).toHaveTextContent('No name check has been recorded');
  });
});
