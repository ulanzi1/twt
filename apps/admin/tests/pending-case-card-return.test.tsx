// <PendingCaseCard> — the Pariwar Admin's RETURN action + the AC8 highlight (Story 6.18, AC8/AC11).
//
// `2026-09-20-227` cl.10: if the Pariwar Admin does not approve, the claim *"goes back to District
// Admin for correction with Note"*.
//
// ⛔⛔ THE LOAD-BEARING ASSERTIONS ARE ABOUT WORDING AND ABSENCE. A return is ⛔ NOT a denial, and the
// surface a Pariwar Admin actually reads is where that distinction survives or dies: if this button
// ever says "reject", or the badge says "denied", the ruling has been reversed in the UI regardless
// of what the domain does.

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { CycleFreezePendingResponse } from '@twt/contracts';

import { PendingCaseCard } from '../src/modules/cycle-freeze/index.js';

type PendingCase = CycleFreezePendingResponse['ready_to_freeze'][number];

const CASE: PendingCase = {
  claim_case_id: '11111111-1111-4111-8111-111111111111',
  deceased_member_id: '22222222-2222-4222-8222-222222222222',
  current_state: 'verifier_approved',
  verifier_decision_id: '33333333-3333-4333-8333-333333333333',
  verifier_actor_display: 'Anita Kumari',
  verifier_reason_code: 'r8_90pct_met',
  verifier_rationale: null,
  signals_summary: 'state=verifier_approved; intake=app',
  concealment_flags: [],
  routed_to_r9: false,
  under_correction: false,
  name_difference_reasons: [],
};

const setup = (overrides: Partial<PendingCase> = {}, bucket: 'ready_to_freeze' | 'voted_pending_commit' = 'ready_to_freeze') => {
  const onDecision = vi.fn();
  render(
    <ul>
      <PendingCaseCard case_={{ ...CASE, ...overrides }} bucket={bucket} onDecision={onDecision} pending={false} />
    </ul>,
  );
  return { onDecision };
};

describe('<PendingCaseCard> — AC11, the return to the District Admin', () => {
  it('offers a RETURN action, and its label says "return" — never "reject" or "deny"', () => {
    setup();
    const btn = screen.getByTestId('return-to-district-admin');
    const label = btn.textContent?.toLowerCase() ?? '';
    expect(label).toContain('return');
    expect(label).not.toContain('reject');
    expect(label).not.toContain('deny');
    expect(label).not.toContain('denied');
  });

  it('⭐ the return is available in the PRE-COMMIT window too (voted_pending_commit)', () => {
    // cl.4 makes the Pariwar Admin's approval final only once the campaign goes live, which happens
    // at commit — so a discrepancy spotted between the vote and the commit must still be fixable.
    setup({ current_state: 'state_trustee_approved' }, 'voted_pending_commit');
    expect(screen.getByTestId('return-to-district-admin')).toBeInTheDocument();
  });

  it('posts `return_to_district_admin` with the reason code and the note', () => {
    const { onDecision } = setup();
    // `other` is the only code valid for a return; the rationale carries cl.10's NOTE.
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'other' } });
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'the holder name is not the declared nominee' },
    });
    fireEvent.click(screen.getByTestId('return-to-district-admin'));
    expect(onDecision).toHaveBeenCalledTimes(1);
    expect(onDecision.mock.calls[0]![0]).toMatchObject({
      claim_case_id: CASE.claim_case_id,
      action: 'return_to_district_admin',
      reason_code: 'other',
      rationale: 'the holder name is not the declared nominee',
    });
  });

  it('⛔ hides the return action on a claim ALREADY under correction (one open return at a time)', () => {
    setup({ under_correction: true });
    expect(screen.queryByTestId('return-to-district-admin')).toBeNull();
  });

  it('⭐ badges a returned claim as "returned for correction" — ⛔ never as denied or rejected', () => {
    setup({ under_correction: true });
    const badge = screen.getByTestId('under-correction-badge').textContent?.toLowerCase() ?? '';
    expect(badge).toContain('returned for correction');
    expect(badge).not.toContain('denied');
    expect(badge).not.toContain('rejected');
    expect(badge).not.toContain('failed');
  });
});

describe('<PendingCaseCard> — AC8, the name-difference highlight', () => {
  it('shows the recorded reason CODES, and ⛔ never a name', () => {
    setup({ name_difference_reasons: ['married_name'] });
    const badge = screen.getByTestId('name-difference-badge').textContent ?? '';
    expect(badge).toContain('approved with a name difference');
    expect(badge).toContain('married_name');
    // ⛔ The card never receives a name, so it cannot render one — this pins that.
    expect(badge).not.toMatch(/Devi|Asha|Kumar/);
  });

  it('shows NO highlight when the check recorded no difference', () => {
    setup({ name_difference_reasons: [] });
    expect(screen.queryByTestId('name-difference-badge')).toBeNull();
  });

  it('⛔⛔ the card renders NO comparison of its own — the flag is the ONLY difference signal', () => {
    setup({ name_difference_reasons: ['initial'] });
    const text = document.body.textContent?.toLowerCase() ?? '';
    for (const forbidden of ['similar', 'score', 'likely match', 'differs from', 'does not look like']) {
      expect(text, `the card rendered a comparison hint: ${forbidden}`).not.toContain(forbidden);
    }
  });
});
