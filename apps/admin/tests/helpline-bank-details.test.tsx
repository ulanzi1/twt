// <BankDetailsCard> — the helpline operator's bank entry + two-names view (Story 6.18, AC6/AC7/AC12).
//
// `2026-09-19-226` cl.1: *"It's the duty of helpline_operator to make sure name doesn't mismatch."*
//
// ⭐ THE POINT OF THIS SURFACE is that the duty was previously undischargeable: the API had existed
// since Story 6.8, but the console had no bank-entry UI at all, so the operator carrying cl.1's
// responsibility could not see the declared nominee beside the name they were typing.
//
// ⛔⛔ AND IT STILL RENDERS NO COMPARISON. The operator is accountable, but cl.5 rules the SYSTEM
// never acts on a mismatch — so "these look different" at filing would be the system acting.

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { NomineeNameCheckResponse } from '@twt/contracts';

import { BankDetailsCard } from '../src/modules/helpline-claims/BankDetailsCard.js';

const CLAIM = '11111111-1111-4111-8111-111111111111';

const NAMES: NomineeNameCheckResponse = {
  claim_case_id: CLAIM,
  claim_state: 'intake_converged',
  deceased_member_id: '22222222-2222-4222-8222-222222222222',
  accounts: [
    {
      account_rank: 1,
      account_updated_at: '2026-09-20T10:00:00.000Z',
      holder_name: { state: 'readable', value: 'A. Devi' },
      name_difference_note: null,
    },
    {
      account_rank: 2,
      account_updated_at: '2026-09-20T10:00:01.000Z',
      holder_name: { state: 'readable', value: 'Ravi Kumar' },
      name_difference_note: null,
    },
  ],
  accounts_complete: true,
  declared_nominees: [
    { rank: 1, split_pct: 75, relationship: 'spouse', nominee_name: { state: 'readable', value: 'Asha Devi' } },
  ],
  nominee_declaration_token: 'tok-1',
  nominee_declared_at: '2026-01-01T00:00:00.000Z',
  claim_filed_at: '2026-09-01T00:00:00.000Z',
  current_check: null,
  correction_return: null,
};

const setup = (props: Partial<React.ComponentProps<typeof BankDetailsCard>> = {}) => {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  render(<BankDetailsCard claimCaseId={CLAIM} recorded={false} onSubmit={onSubmit} {...props} />);
  return { onSubmit };
};

const fill = (i: 1 | 2, holder: string, number: string, ifsc: string, note = ''): void => {
  fireEvent.change(screen.getByTestId(`helpline-bank-holder-${i}`), { target: { value: holder } });
  fireEvent.change(screen.getByTestId(`helpline-bank-number-${i}`), { target: { value: number } });
  fireEvent.change(screen.getByTestId(`helpline-bank-ifsc-${i}`), { target: { value: ifsc } });
  if (note !== '') {
    fireEvent.change(screen.getByTestId(`helpline-bank-note-${i}`), { target: { value: note } });
  }
};

describe('<BankDetailsCard> — AC7, the operator records both accounts', () => {
  it('⛔ renders nothing before the claim exists (the route is keyed on it)', () => {
    render(<BankDetailsCard claimCaseId={null} recorded={false} onSubmit={vi.fn()} />);
    expect(screen.queryByTestId('helpline-bank-section')).toBeNull();
  });

  it('⭐ states the DUTY to the person cl.1 actually names', () => {
    setup();
    const duty = screen.getByTestId('helpline-bank-section').textContent ?? '';
    expect(duty).toContain('Two accounts are required');
    expect(duty).toContain('the nominee the member declared');
  });

  it('submits both accounts, with the optional note attached only where one was typed', async () => {
    const { onSubmit } = setup();
    fill(1, 'A. Devi', '123456789012', 'sbin0000001', 'the bank shortened her name');
    fill(2, 'Ravi Kumar', '210987654321', 'hdfc0000002');
    fireEvent.click(screen.getByTestId('helpline-bank-submit'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({
      accounts: [
        {
          accountHolderName: 'A. Devi',
          accountNumber: '123456789012',
          // ⭐ Upper-cased before submit — the contract's IFSC regex is uppercase-only, and an
          // operator typing lower case on a phone call must not be handed a 400 for it.
          ifsc: 'SBIN0000001',
          nameDifferenceNote: 'the bank shortened her name',
        },
        { accountHolderName: 'Ravi Kumar', accountNumber: '210987654321', ifsc: 'HDFC0000002' },
      ],
    });
  });

  it('⛔ AC6 — refuses to submit until BOTH accounts are complete', async () => {
    const { onSubmit } = setup();
    fill(1, 'A. Devi', '123456789012', 'SBIN0000001');
    fireEvent.click(screen.getByTestId('helpline-bank-submit'));
    await waitFor(() => expect(screen.getByTestId('helpline-bank-validation-error')).toBeInTheDocument());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('⛔ AC12 — refuses a non-English holder name INLINE, never as a silent server 400', async () => {
    const { onSubmit } = setup();
    fill(1, 'आशा देवी', '123456789012', 'SBIN0000001');
    fill(2, 'Ravi Kumar', '210987654321', 'HDFC0000002');
    fireEvent.click(screen.getByTestId('helpline-bank-submit'));
    await waitFor(() =>
      expect(screen.getByTestId('helpline-bank-validation-error')).toHaveTextContent('in English'),
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('⛔ refuses the SAME account number twice — a duplicate defeats the second channel', async () => {
    const { onSubmit } = setup();
    fill(1, 'A. Devi', '123456789012', 'SBIN0000001');
    fill(2, 'Ravi Kumar', '123456789012', 'HDFC0000002');
    fireEvent.click(screen.getByTestId('helpline-bank-submit'));
    await waitFor(() =>
      expect(screen.getByTestId('helpline-bank-validation-error')).toHaveTextContent('must be different'),
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe('<BankDetailsCard> — cl.1, the two names after submission', () => {
  it('⭐ shows the account holder names beside the DECLARED nominees — the duty made dischargeable', () => {
    setup({ recorded: true, names: NAMES });
    expect(screen.getByTestId('helpline-name-account-1')).toHaveTextContent('A. Devi');
    expect(screen.getByTestId('helpline-name-account-2')).toHaveTextContent('Ravi Kumar');
    expect(screen.getByTestId('helpline-name-nominee-1')).toHaveTextContent('Asha Devi');
  });

  it('⛔⛔ renders NO comparison, NO match hint and NO warning (cl.5 — the system never acts)', () => {
    setup({ recorded: true, names: NAMES });
    const text = screen.getByTestId('helpline-bank-section').textContent?.toLowerCase() ?? '';
    for (const forbidden of ['does not match', 'mismatch', 'similar', 'likely', 'score', 'differs from', 'warning']) {
      expect(text, `the card rendered a comparison hint: ${forbidden}`).not.toContain(forbidden);
    }
  });

  it('says ZERO nominees explicitly rather than showing an empty column', () => {
    setup({ recorded: true, names: { ...NAMES, declared_nominees: [] } });
    expect(screen.getByTestId('helpline-no-nominees')).toHaveTextContent('declared no nominees');
  });

  it('renders an unreadable name as itself — never as a blank the operator would read as "no name"', () => {
    setup({
      recorded: true,
      names: {
        ...NAMES,
        accounts: [{ ...NAMES.accounts[0]!, holder_name: { state: 'unreadable' } }, NAMES.accounts[1]!],
      },
    });
    expect(screen.getByTestId('helpline-name-account-1')).toHaveTextContent('Could not be read');
  });

  it('hides the entry form once the accounts are recorded', () => {
    setup({ recorded: true, names: NAMES });
    expect(screen.queryByTestId('helpline-bank-submit')).toBeNull();
    expect(screen.getByTestId('helpline-bank-recorded')).toBeInTheDocument();
  });
});
