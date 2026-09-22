// <NomineeNameCheckPanel> — Story 6.18 (AC2, AC3, AC5, AC6, AC8).
//
// ⛔⛔ THE MOST IMPORTANT ASSERTIONS HERE ARE THE ABSENCES. `2026-09-19-226` cl.5 rules the system
// never acts on a name mismatch, so the console must render ⛔ no match hint, ⛔ no score and ⛔ no
// diff. A test suite that only checked the happy path would let a future "helpful" highlight land
// unnoticed and quietly reverse a ratified ruling.

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
  latest_check_is_stale: false,
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

// ── Checklist family 13(d) — REACHABLE STATES MUST BE ANNOUNCED, ⛔ not merely rendered ────────
//
// ⚠⚠ THE GAP THIS CLOSES, in the review's own words: *"reachable states are reflected but not
// announced (REAL GAP) … every selector in the three new files is `getByTestId`"*. A `data-testid`
// assertion proves a node EXISTS in the DOM. It proves ⛔ nothing about whether a screen-reader
// user is ever told the node appeared — and every state below APPEARS in response to an action,
// replacing content the user's focus was just on.
//
// ⭐ SO THESE ASSERT THE ROLE, ⛔ not the text. `role="status"` is an ARIA live region: content
// inserted into it is announced politely without stealing focus, which is the correct posture for
// a console a District Admin is working through. ⚠ A bare `<p>` with the right words is SILENT.
describe('<NomineeNameCheckPanel> — family 13(d): the states that APPEAR are announced', () => {
  const announced = (testId: string): void => {
    const el = screen.getByTestId(testId);
    expect(el, `${testId} renders but is ⛔ not in a live region — a screen reader never hears it`)
      .toHaveAttribute('role', 'status');
  };

  it('⭐ the LOADING state is announced — the one state where silence reads as a broken page', () => {
    // ⚠ This was the last one missing. Every other state announced; this one did ⛔ not, so a
    // screen-reader user who opened the console heard ⛔ nothing at all until the read resolved.
    render(<NomineeNameCheckPanel data={undefined} loading canCheck onSubmit={vi.fn()} />);
    announced('name-check-loading');
  });

  it('⭐ the recorded CURRENT check is announced (it replaces the form the user just submitted)', () => {
    setup({
      ...READ,
      current_check: {
        checked_at: '2026-09-20T11:00:00.000Z',
        checked_by_actor_display: 'Anita Kumari',
        nominee_declaration_token: 'tok-1',
        passing: true,
        accounts: [
          { account_rank: 1, account_updated_at: '2026-09-20T10:00:00.000Z', verdict: 'matches', clerical_reason: null },
          { account_rank: 2, account_updated_at: '2026-09-20T10:00:01.000Z', verdict: 'clerical_difference', clerical_reason: 'married_name' },
        ],
      },
    });
    announced('name-check-current');
  });

  it('⭐ the SENT-BACK hint is announced the moment the operator picks `does_not_match`', () => {
    // ⚠ THE HINT IS FORM-DRIVEN, ⛔ not read-driven — it keys off the LOCAL verdict state, so it
    // appears mid-interaction, while the operator's focus is on the select they just changed.
    // ⭐ That is precisely the case a live region exists for, and precisely the case a
    // `getByTestId` assertion cannot distinguish from silence.
    setup();
    // ⛔ NON-VACUITY: absent before the choice, so its appearance is caused by the verdict.
    expect(screen.queryByTestId('name-check-sent-back-hint')).toBeNull();

    fireEvent.change(screen.getByTestId('name-check-verdict-2'), { target: { value: 'does_not_match' } });
    announced('name-check-sent-back-hint');
  });

  it('⭐ the SENT-BACK hint CLEARS when the operator corrects the verdict back', () => {
    // ⚠ ADDED 2026-09-22 (code review) — the test above proves the hint APPEARS on `does_not_match`
    // but nothing proved it CLEARS if the operator reconsiders and picks `matches` or
    // `clerical_difference` instead. A hint that stuck around after a correction would tell the
    // operator "this sends the claim back" for a verdict that no longer does.
    setup();
    fireEvent.change(screen.getByTestId('name-check-verdict-2'), { target: { value: 'does_not_match' } });
    expect(screen.getByTestId('name-check-sent-back-hint')).toBeInTheDocument();

    fireEvent.change(screen.getByTestId('name-check-verdict-2'), { target: { value: 'matches' } });
    expect(
      screen.queryByTestId('name-check-sent-back-hint'),
      'the sent-back hint stayed visible after the verdict was corrected back to matches',
    ).toBeNull();
  });

  it('⭐ a STALE check is announced', () => {
    // ⚠ ADDED 2026-09-22 (code review) — the source already carried `role="status"` on
    // `name-check-stale`, but nothing asserted it; this family's own coverage claim named only 3 of
    // the panel's 5 announced states.
    setup({ ...READ, current_check: null, latest_check_is_stale: true });
    announced('name-check-stale');
  });

  it('⭐ the NEVER-CHECKED state is announced', () => {
    // ⚠ ADDED 2026-09-22 (code review), and it FOUND A REAL SOURCE GAP: `name-check-none` had
    // ⛔ NO `role="status"` at all (unlike its siblings `name-check-current` and `name-check-stale`)
    // — fixed in `NomineeNameCheckPanel.tsx` alongside this test.
    setup({ ...READ, current_check: null, latest_check_is_stale: false });
    announced('name-check-none');
  });
});

// ── THE RESIDUAL v1.1 NAMED — the five cases this file was missing ─────────────────────────────
//
// ⚠ v1.1's re-scope: *"RESIDUAL — ONE FILE: `nominee-name-check-panel.test.tsx` is untouched bar
// one line; its mixed `[clerical_difference, does_not_match]`, the stale check, the
// one-testid-two-states case … all stand."*
const CHECK = (
  verdicts: readonly ['matches' | 'clerical_difference' | 'does_not_match', 'matches' | 'clerical_difference' | 'does_not_match'],
  reasons: readonly [string | null, string | null] = [null, null],
  passing = verdicts.every((v) => v !== 'does_not_match'),
): NonNullable<NomineeNameCheckResponse['current_check']> => ({
  checked_at: '2026-09-20T11:00:00.000Z',
  checked_by_actor_display: 'Anita Kumari',
  nominee_declaration_token: 'tok-1',
  passing,
  accounts: [
    { account_rank: 1, account_updated_at: '2026-09-20T10:00:00.000Z', verdict: verdicts[0], clerical_reason: reasons[0] },
    { account_rank: 2, account_updated_at: '2026-09-20T10:00:01.000Z', verdict: verdicts[1], clerical_reason: reasons[1] },
  ] as NonNullable<NomineeNameCheckResponse['current_check']>['accounts'],
});

describe('<NomineeNameCheckPanel> — the MIXED and STALE states (v1.1 residual)', () => {
  it('⭐⭐ a MIXED `[clerical_difference, does_not_match]` check SENDS BACK — the difference does ⛔ not soften it', () => {
    // ⚠⚠ THE CASE MOST LIKELY TO BE GOT WRONG, and it had ⛔ no test. One account is an accepted
    // clerical difference; the other does ⛔ not match at all. A panel that read "there IS an
    // approved difference" and rendered the reassuring state would tell a District Admin the claim
    // is fine when one of the two payout destinations belongs to somebody else.
    // ⭐ `-226` cl.6: a `does_not_match` on ANY account sends the claim back. It is ⛔ never a
    // denial, and it is ⛔ never outweighed by the other account being fine.
    setup({ ...READ, current_check: CHECK(['clerical_difference', 'does_not_match'], ['married_name', null]) });

    expect(screen.getByTestId('name-check-current')).toBeInTheDocument();
    // ⚠ TIGHTENED 2026-09-22 (code review) — `/married|difference/i` was loose enough to match any
    // incidental occurrence of "difference" in nearby UI copy, not specifically the clerical-reason
    // label for THIS account. Assert the exact rendered label pair instead.
    expect(screen.getByTestId('name-check-recorded-verdict-1')).toHaveTextContent(
      'Clerical difference (accept with a reason) — A married name',
    );
    // ⚠ The reassuring "approved with a difference" flag must ⛔ NOT appear on a failing check.
    expect(
      screen.queryByTestId('name-check-difference-flag'),
      'a sending-back check rendered the approved-with-a-difference flag',
    ).toBeNull();
  });

  it('⭐ a STALE check says so — and STALE ≠ NEVER CHECKED', () => {
    // ⚠⚠ THE WIRE SHAPE, re-derived at source after my first draft got it wrong: `current_check`
    // and `latest_check_is_stale` are MUTUALLY EXCLUSIVE, ⛔ not two flags on one record. A stale
    // check is ⛔ not returned as `current_check` at all — the panel's ternary reads
    // `current_check ? … : latest_check_is_stale ? …`. So the fixture is a NULL current check plus
    // the stale flag, ⛔ not a present check marked stale.
    // ⭐ The distinction the state exists for: saying *"no check has been recorded"* for a stale
    // one ERASES a colleague's work. A correction invalidated the earlier check — D5 working as
    // ruled (`-227` cl.12), ⛔ not an absence.
    setup({ ...READ, current_check: null, latest_check_is_stale: true });
    expect(screen.getByTestId('name-check-stale')).toBeInTheDocument();
    // ⛔ …and it must ⛔ NOT fall through to the never-checked copy, which is the erasure.
    expect(screen.queryByTestId('name-check-none')).toBeNull();
  });

  it('⛔ …and a NEVER-CHECKED claim renders the OTHER state — the non-vacuity pair', () => {
    setup({ ...READ, current_check: null, latest_check_is_stale: false });
    expect(screen.getByTestId('name-check-none')).toBeInTheDocument();
    expect(screen.queryByTestId('name-check-stale')).toBeNull();
  });

  it('⭐⭐ `name-check-current` carries TWO DIFFERENT states under ONE testid — assert the CONTENT', () => {
    // ⚠⚠ THE TRAP v1.1 NAMED. `name-check-current` renders for a PASSING check and for a SENDING-
    // BACK one. ⇒ `getByTestId('name-check-current')` is satisfied by BOTH, so a test that asserts
    // only its presence ⛔ cannot tell a reassurance from an instruction — the two things a
    // District Admin must never confuse.
    setup({ ...READ, current_check: CHECK(['matches', 'matches']) });
    const passing = screen.getByTestId('name-check-current').textContent ?? '';
    cleanup();

    setup({ ...READ, current_check: CHECK(['matches', 'does_not_match']) });
    const sendingBack = screen.getByTestId('name-check-current').textContent ?? '';

    expect(
      sendingBack,
      'the passing and sending-back states render IDENTICAL text under the same testid',
    ).not.toBe(passing);
    // ⚠ TIGHTENED 2026-09-22 (code review) — `.not.toBe(passing)` is satisfied by ANY incidental
    // difference (verdict order, a timestamp fragment) without confirming the sending-back state
    // actually renders the correction instruction the comment above says matters. Assert the
    // specific content instead: the "send back for correction" verdict label appears on the
    // sending-back render and NEVER on the passing one — the actual thing a District Admin must not
    // confuse, not merely "the two strings differ somehow".
    expect(sendingBack).toContain('Does not match — send back for correction');
    expect(passing).not.toContain('Does not match — send back for correction');
  });
});

// ── The selections are CLEARED when the data they were about changes (code review 2026-09-20) ──
//
// ⭐⭐ A SAFETY PROPERTY, ⛔ not tidiness, and it had ⛔ no test. `verdicts` are keyed by
// `account_rank` alone. Without the reset: a District Admin selects "matches" for account #2, the
// helpline corrects account #2 underneath them, the refetch shows the NEW name with the OLD
// "matches" still selected, and `submit` sends the FRESH `account_updated_at` — so the staleness
// check PASSES and a judgement about a name they never saw is recorded under their name.
describe('<NomineeNameCheckPanel> — a changed account or claim CLEARS the selections', () => {
  const pick = (): void => {
    fireEvent.change(screen.getByTestId('name-check-verdict-1'), { target: { value: 'matches' } });
    fireEvent.change(screen.getByTestId('name-check-verdict-2'), { target: { value: 'clerical_difference' } });
    fireEvent.change(screen.getByTestId('name-check-reason-2'), { target: { value: 'married_name' } });
  };
  const renderPanel = (data: NomineeNameCheckResponse, onSubmit = vi.fn().mockResolvedValue(undefined)) =>
    render(<NomineeNameCheckPanel data={data} canCheck onSubmit={onSubmit} />);

  it('⭐⭐ a CORRECTED account (new `account_updated_at`) clears every verdict and reason — nothing carries over', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const { rerender } = renderPanel(READ, onSubmit);
    pick();
    // ⛔ NON-VACUITY: the selections really are in place first.
    expect(screen.getByTestId('name-check-verdict-1')).toHaveValue('matches');
    expect(screen.getByTestId('name-check-reason-2')).toHaveValue('married_name');

    const corrected: NomineeNameCheckResponse = {
      ...READ,
      accounts: [
        READ.accounts[0]!,
        { ...READ.accounts[1]!, account_updated_at: '2026-09-21T09:00:00.000Z', holder_name: { state: 'readable', value: 'Someone Else' } },
      ],
    };
    rerender(<NomineeNameCheckPanel data={corrected} canCheck onSubmit={onSubmit} />);

    expect(screen.getByTestId('name-check-verdict-1')).toHaveValue('');
    expect(screen.getByTestId('name-check-verdict-2')).toHaveValue('');
    expect(screen.queryByTestId('name-check-reason-2')).toBeNull();
    // ⭐ And the consequence that matters: pressing Record now REFUSES rather than sending the old judgement.
    fireEvent.click(screen.getByTestId('name-check-submit'));
    expect(await screen.findByTestId('name-check-validation-error')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('⭐ a changed DECLARATION (new token) clears them too — the other half of the staleness pair', () => {
    const { rerender } = renderPanel(READ);
    pick();
    rerender(<NomineeNameCheckPanel data={{ ...READ, nominee_declaration_token: 'tok-2' }} canCheck onSubmit={vi.fn()} />);
    expect(screen.getByTestId('name-check-verdict-1')).toHaveValue('');
  });

  it('⛔ an IDENTICAL refetch does ⛔ not wipe what the District Admin is typing — the reset is keyed, ⛔ not on every render', () => {
    const { rerender } = renderPanel(READ);
    pick();
    // A fresh object with the same tokens — what a refetch that found nothing new returns.
    rerender(<NomineeNameCheckPanel data={{ ...READ, accounts: READ.accounts.map((a) => ({ ...a })) }} canCheck onSubmit={vi.fn()} />);
    expect(screen.getByTestId('name-check-verdict-1')).toHaveValue('matches');
    expect(screen.getByTestId('name-check-reason-2')).toHaveValue('married_name');
  });
});
