// <PendingCaseCard> — the Pariwar Admin's RETURN action + the AC8 highlight (Story 6.18, AC8/AC11).
//
// `2026-09-20-227` cl.10: if the Pariwar Admin does not approve, the claim *"goes back to District
// Admin for correction with Note"*.
//
// ⛔⛔ THE LOAD-BEARING ASSERTIONS ARE ABOUT WORDING AND ABSENCE. A return is ⛔ NOT a denial, and the
// surface a Pariwar Admin actually reads is where that distinction survives or dies: if this button
// ever says "reject", or the badge says "denied", the ruling has been reversed in the UI regardless
// of what the domain does.

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { CycleFreezePendingResponse } from '@twt/contracts';

// ⭐ The network is faked for the D3 disclosure suite at the bottom; every other test here still
// fetches nothing (the disclosure's query is `enabled` only once its button is pressed).
const getNomineeNameCheck = vi.fn();
vi.mock('../src/api/client.js', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, getNomineeNameCheck: (p: string, c: string) => getNomineeNameCheck(p, c) };
});

const { PendingCaseCard } = await import('../src/modules/cycle-freeze/index.js');

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

const PARIWAR = '44444444-4444-4444-8444-444444444444';

/**
 * ⚠ A `QueryClientProvider` is needed because the card now carries the ON-DEMAND names disclosure
 * (D3). ⛔ Nothing is fetched here: the disclosure's query is `enabled` only once its button is
 * pressed, so these tests still run without a network and without decrypting anything.
 */
const setup = (overrides: Partial<PendingCase> = {}, bucket: 'ready_to_freeze' | 'voted_pending_commit' = 'ready_to_freeze') => {
  const onDecision = vi.fn();
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <ul>
        <PendingCaseCard
          case_={{ ...CASE, ...overrides }}
          bucket={bucket}
          pariwarId={PARIWAR}
          onDecision={onDecision}
          pending={false}
        />
      </ul>
    </QueryClientProvider>,
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

  it('⛔ the return is NOT offered in the pre-commit window (voted_pending_commit) — D1, and this test was REVERSED', () => {
    // ⚠⚠ THIS TEST USED TO ASSERT THE OPPOSITE, and the story reversed itself deliberately
    // (code review 2026-09-20, D1 = option A). The reading behind the old expectation was not
    // silly: cl.4 makes the approval final only once the campaign goes live at commit, so the
    // window between the vote and the commit LOOKED like one the Pariwar Admin could still act in.
    // ⛔ It is not. A return written at `state_trustee_approved` could never be CLEARED — the only
    // code that supersedes a return row lives inside `voteOnFrozenClaim`, which refuses that state,
    // and the District Admin cannot record the fresh check there either. The claim would be stuck
    // with no exit, which is exactly the dead end AC5 forbids. `TRUSTEE_RETURNABLE_STATES` now
    // excludes the state, so offering the button would be offering a guaranteed 409.
    setup({ current_state: 'state_trustee_approved' }, 'voted_pending_commit');
    expect(screen.queryByTestId('return-to-district-admin')).toBeNull();
  });

  it('⛔ a BARE return click posts nothing — `-227` cl.10 requires the note, asked for BEFORE the round trip', () => {
    // ⚠ `reasonCodeValidFor('')` is `true` (an absent selection defers to the server), so a bare
    // click used to POST with no code and no note and rely on a 400 coming back. The note is the
    // ONLY thing the District Admin sees, and with ⛔ no event minted for a return it is the trail.
    const { onDecision } = setup();
    fireEvent.click(screen.getByTestId('return-to-district-admin'));
    expect(onDecision).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent?.toLowerCase()).toContain('note');
  });

  it('⛔ a return with a code but NO note posts nothing either', () => {
    const { onDecision } = setup();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'other' } });
    fireEvent.click(screen.getByTestId('return-to-district-admin'));
    expect(onDecision).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent?.toLowerCase()).toContain('note');
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
  it('renders the reason as a LABEL, ⛔ not the raw code — and the two voting surfaces now agree', () => {
    // ⚠ This printed `married_name` at a Pariwar Admin while the District Admin's own panel showed
    // "A married name" for the same fact — two surfaces disagreeing about one ruling's vocabulary.
    // ⛔ The old assertion (`toContain('married_name')`) PINNED the defect; it is replaced, not
    // merely deleted, so the fix is what is now covered.
    setup({ name_difference_reasons: ['married_name'] });
    const badge = screen.getByTestId('name-difference-badge').textContent ?? '';
    // ⭐ The SHARED headline (code review 2026-09-23) — the card used to hand-copy it in lowercase.
    expect(badge).toContain('Approved with a name difference');
    expect(badge).toContain('A married name');
    expect(badge).not.toContain('married_name');
  });

  it('falls back to the CODE for a reason it does not recognise — ⛔ never the literal "undefined"', () => {
    setup({ name_difference_reasons: ['a_future_reason' as 'initial'] });
    const badge = screen.getByTestId('name-difference-badge').textContent ?? '';
    expect(badge).toContain('a_future_reason');
    expect(badge).not.toContain('undefined');
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

// ── D3 — the Pariwar Admin sees both names, ON DEMAND (code review 2026-09-20) ────────────────
//
// ⭐ The card carries `<NomineeNameCheckDisclosure>` so the surface that owns the FINAL approval and
// the Return decision does ⛔ not decide blind — and ⛔ no test had ever pressed its button.
describe('<PendingCaseCard> — D3, the names disclosure', () => {
  const NAMES = {
    claim_case_id: CASE.claim_case_id,
    claim_state: 'verifier_approved',
    deceased_member_id: CASE.deceased_member_id,
    accounts: [
      { account_rank: 1, account_updated_at: '2026-09-20T10:00:00.000Z', holder_name: { state: 'readable', value: 'Rani Devi' }, name_difference_note: { state: 'readable', value: 'married since' } },
      { account_rank: 2, account_updated_at: '2026-09-20T10:00:01.000Z', holder_name: { state: 'readable', value: 'R. Devi' }, name_difference_note: null },
    ],
    accounts_complete: true,
    declared_nominees: [{ rank: 1, split_pct: 100, relationship: 'spouse', nominee_name: { state: 'readable', value: 'Rani Kumari' } }],
    nominee_declaration_token: 'tok-1',
    nominee_declared_at: '2026-01-01T00:00:00.000Z',
    claim_filed_at: '2026-09-01T00:00:00.000Z',
    current_check: null,
    latest_check_is_stale: false,
    correction_return: null,
  };

  it('⛔⛔ fetches NOTHING until pressed; then shows both names and the filer note, with ⛔ no verdict control', async () => {
    getNomineeNameCheck.mockReset();
    getNomineeNameCheck.mockResolvedValue(NAMES);
    setup();
    expect(getNomineeNameCheck).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId(`pending-case-name-check-${CASE.claim_case_id}`));
    expect(await screen.findByTestId('name-check-account-1')).toHaveTextContent('Rani Devi');
    expect(screen.getByTestId('name-check-nominee-1')).toHaveTextContent('Rani Kumari');
    expect(screen.getByTestId('name-check-note-1')).toHaveTextContent('married since');
    expect(getNomineeNameCheck).toHaveBeenCalledWith(PARIWAR, CASE.claim_case_id);
    // ⛔ `-226` cl.3 — recording the verdict is the District Admin's alone.
    expect(screen.queryByTestId('name-check-form')).toBeNull();
  });
});
