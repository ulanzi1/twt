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

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
  latest_check_is_stale: false,
  correction_return: null,
};

const setup = (props: Partial<React.ComponentProps<typeof BankDetailsCard>> = {}) => {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  render(<BankDetailsCard claimCaseId={CLAIM} recorded={false} onSubmit={onSubmit} {...props} />);
  return { onSubmit };
};

/** Two well-formed, DISTINCT accounts — the shape every write-path test needs before it can run. */
const fillValidAccounts = (): void => {
  fill(1, 'Asha Devi', '123456789012', 'SBIN0000001');
  fill(2, 'Asha Devi', '210987654321', 'HDFC0000002');
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

  it('collapses the entry form once the accounts are recorded — but ⛔ does NOT trap the operator there', () => {
    // ⚠ The old version of this test asserted only that the form was GONE, which PINNED the
    // defect: there was no way back to it. `-226` cl.1 puts the duty of making sure the names match
    // on this operator, so finding a mismatch in the names view below and being unable to act on it
    // is the one outcome the surface must not produce. The re-entry control is asserted separately.
    setup({ recorded: true, names: NAMES });
    expect(screen.queryByTestId('helpline-bank-submit')).toBeNull();
    expect(screen.getByTestId('helpline-bank-recorded')).toBeInTheDocument();
  });
});


// ── The CORRECTION path (code review 2026-09-20, D4 = option A) ───────────────────────
//
// ⭐⭐ EVERY TEST HERE COVERS SOMETHING THAT DID NOT EXIST. The card rendered only for the session
// that had just filed the intake; once `recorded` was true the form was replaced by a read-only
// names view with ⛔ no path back; it never read `correctionNeeded`; and it never sent
// `correctionReason`, which the server REQUIRES on any write over accounts already on file. So the
// operator `-226` cl.1 charges with the duty, and `-227` cl.11 names as the one who types the
// corrected details, could do neither.
describe('<BankDetailsCard> — AC5, the operator corrects the details', () => {
  it('⭐ offers a way BACK INTO the form once accounts are on file', () => {
    setup({ recorded: true, names: NAMES });
    expect(screen.getByTestId('helpline-bank-edit')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('helpline-bank-edit'));
    expect(screen.getByTestId('helpline-bank-submit')).toBeInTheDocument();
  });

  it('⛔ refuses a correction with NO reason — the server requires one, and a 409 is a bad way to learn that', () => {
    const onSubmit = vi.fn();
    setup({ recorded: true, names: NAMES, onSubmit });
    fireEvent.click(screen.getByTestId('helpline-bank-edit'));
    fillValidAccounts();
    fireEvent.click(screen.getByTestId('helpline-bank-submit'));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByTestId('helpline-bank-validation-error')).toBeInTheDocument();
  });

  it('⭐ sends `correctionReason` on a correction — and ⛔ NOT on a first save', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    setup({ recorded: true, names: NAMES, onSubmit });
    fireEvent.click(screen.getByTestId('helpline-bank-edit'));
    fillValidAccounts();
    fireEvent.change(screen.getByTestId('helpline-bank-correction-reason'), {
      target: { value: 'family gave the corrected passbook over the phone' },
    });
    fireEvent.click(screen.getByTestId('helpline-bank-submit'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]![0]).toMatchObject({
      correctionReason: 'family gave the corrected passbook over the phone',
    });

    // ⛔ A FIRST save carries none — the server forbids a reason outside the correction path.
    cleanup();
    const firstSave = vi.fn().mockResolvedValue(undefined);
    setup({ recorded: false, onSubmit: firstSave });
    fillValidAccounts();
    fireEvent.click(screen.getByTestId('helpline-bank-submit'));
    await waitFor(() => expect(firstSave).toHaveBeenCalledTimes(1));
    expect(firstSave.mock.calls[0]![0]).not.toHaveProperty('correctionReason');
  });

  it('⭐ tells the operator the details need correcting — ⛔ never "rejected" or "denied"', () => {
    setup({ recorded: true, names: NAMES, correctionNeeded: true });
    const banner = screen.getByTestId('helpline-bank-correction-needed').textContent?.toLowerCase() ?? '';
    expect(banner).toContain('correct');
    // ⚠ Asserted on the CLAIM, ⛔ not on the bare word: the copy deliberately says *"has not been
    // refused"*, which contains "refused" and is exactly the reassurance `-226` cl.6 requires. A
    // naive substring ban would have forced the copy to drop the one sentence that matters most.
    expect(banner).toContain('has not been refused');
    for (const forbidden of ['rejected', 'denied', 'your claim is refused']) {
      expect(banner, `the banner used denial wording: ${forbidden}`).not.toContain(forbidden);
    }
  });

  it('⛔ a FAILED names read says so — it must never look like "there is nothing to check"', () => {
    setup({ recorded: true, namesError: 'The two names could not be loaded.' });
    expect(screen.getByTestId('helpline-bank-names-error')).toBeInTheDocument();
    // ⛔ And the names grid is ABSENT rather than empty — an empty list reads as "no accounts".
    expect(screen.queryByTestId('helpline-bank-names')).toBeNull();
  });
});

// ── The residual edge cases (code review 2026-09-20, bullet "the admin UI halves") ─────────
describe('<BankDetailsCard> — anonymized nominee, nothing on file, and a change of claim', () => {
  it('⭐ an ANONYMIZED nominee says so — ⛔ never "could not be read", which misreports a lawful erasure as a fault', () => {
    setup({
      recorded: true,
      names: {
        ...NAMES,
        declared_nominees: [
          { rank: 1, split_pct: 100, relationship: 'spouse', nominee_name: { state: 'anonymized' } },
        ],
      },
    });
    const cell = screen.getByTestId('helpline-name-nominee-1');
    expect(cell).toHaveTextContent('Removed at this person’s request');
    expect(cell).not.toHaveTextContent('Could not be read');
  });

  it('⛔ with NOTHING on file the card offers the entry form and ⛔ no names grid — even if a names payload is passed', () => {
    // ⭐ The grid is gated on `recorded` (a SERVER fact), ⛔ not on whether a payload happens to be
    // present — an empty "names on the accounts" column must never stand in for "no accounts yet".
    setup({ recorded: false, names: { ...NAMES, accounts: [], accounts_complete: false } });
    expect(screen.getByTestId('helpline-bank-submit')).toBeInTheDocument();
    expect(screen.queryByTestId('helpline-bank-names')).toBeNull();
    expect(screen.queryByTestId('helpline-bank-recorded')).toBeNull();
  });

  it('⭐⭐ a CHANGE OF CLAIM clears every typed field — another family’s account numbers are never the default', () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const { rerender } = render(<BankDetailsCard claimCaseId={CLAIM} recorded={false} onSubmit={onSubmit} />);
    fill(1, 'Asha Devi', '123456789012', 'SBIN0000001', 'the bank shortened it');
    // ⛔ NON-VACUITY: typed first.
    expect(screen.getByTestId('helpline-bank-number-1')).toHaveValue('123456789012');

    const CLAIM_B = '99999999-9999-4999-8999-999999999999';
    rerender(<BankDetailsCard claimCaseId={CLAIM_B} recorded={false} onSubmit={onSubmit} />);
    for (const id of ['holder-1', 'number-1', 'ifsc-1', 'note-1']) {
      expect(screen.getByTestId(`helpline-bank-${id}`), `claim A's ${id} carried into claim B`).toHaveValue('');
    }
  });

  it('⭐ a change of claim also CLOSES a re-entered correction form and drops its reason', () => {
    const { rerender } = render(
      <BankDetailsCard claimCaseId={CLAIM} recorded onSubmit={vi.fn()} names={NAMES} />,
    );
    fireEvent.click(screen.getByTestId('helpline-bank-edit'));
    fireEvent.change(screen.getByTestId('helpline-bank-correction-reason'), { target: { value: 'passbook' } });

    const CLAIM_B = '99999999-9999-4999-8999-999999999999';
    rerender(<BankDetailsCard claimCaseId={CLAIM_B} recorded onSubmit={vi.fn()} names={NAMES} />);
    expect(screen.queryByTestId('helpline-bank-submit')).toBeNull();
    fireEvent.click(screen.getByTestId('helpline-bank-edit'));
    expect(screen.getByTestId('helpline-bank-correction-reason')).toHaveValue('');
  });
});

describe('<BankDetailsCard> — family 13(d), code review 2026-09-23b', () => {
  it('⭐ "Correct" moves focus INTO the opened form, and "Cancel" returns it to "Correct" — ⛔ never to <body>', () => {
    setup({ recorded: true, names: NAMES });
    fireEvent.click(screen.getByTestId('helpline-bank-edit'));
    const focused = document.activeElement;
    expect(focused?.tagName).toBe('INPUT');
    // ⭐ NON-VACUITY: the focused input is inside the form that just opened.
    expect(focused?.closest('section')).toBe(screen.getByTestId('helpline-bank-section'));

    fireEvent.click(screen.getByTestId('helpline-bank-cancel-edit'));
    expect(document.activeElement).toBe(screen.getByTestId('helpline-bank-edit'));
  });

  it('⛔ the recorded block is NOT one live region wrapping the names — only its sentence announces', () => {
    setup({ recorded: true, names: NAMES });
    const block = screen.getByTestId('helpline-bank-recorded');
    expect(block).not.toHaveAttribute('role');
    expect(screen.getByTestId('helpline-bank-recorded-message')).toHaveAttribute('role', 'status');
    // ⛔ The names are not inside any live region.
    expect(screen.getByTestId('helpline-bank-names').closest('[role="status"],[role="alert"]')).toBeNull();
  });
});

describe('<BankDetailsCard> — focus after a SUCCESSFUL correction (code review 2026-09-23c)', () => {
  it('⭐ lands on the recorded confirmation — ⛔ never on <body>', async () => {
    const onSubmit = vi.fn(async () => {});
    setup({ recorded: true, names: NAMES, onSubmit });
    fireEvent.click(screen.getByTestId('helpline-bank-edit'));
    for (const i of [1, 2] as const) {
      fireEvent.change(screen.getByTestId(`helpline-bank-holder-${i}`), { target: { value: 'Rani Devi' } });
      fireEvent.change(screen.getByTestId(`helpline-bank-number-${i}`), { target: { value: `12345678901${i}` } });
      fireEvent.change(screen.getByTestId(`helpline-bank-ifsc-${i}`), { target: { value: `SBIN000000${i}` } });
    }
    fireEvent.change(screen.getByTestId('helpline-bank-correction-reason'), { target: { value: 'the DA asked' } });
    fireEvent.click(screen.getByTestId('helpline-bank-submit'));
    // ⭐ NON-VACUITY: the save really went through.
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    await waitFor(() => expect(document.activeElement).toBe(screen.getByTestId('helpline-bank-recorded-message')));
  });
});
