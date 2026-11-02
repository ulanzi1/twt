// Story 6.22 (AC13; DL5, DL7, DL10) — the fraud investigation's staff surfaces. The api client module is mocked (the
// `helpline-certificate-replacement.test.tsx` pattern); the real hooks run.
//
//   · the console panel: radios ⛔ pre-selected; outcome, proof of life and note required; a viewer the server judged may ⛔
//     record sees every note WITHHELD and ⛔ form; a holder sees the notes; a 403 step-up HOLDS the write (the shared
//     `StepUpPanel`); a refusal is shown in words (⛔ a raw code); after a finding, the other standing claims; an
//     always-mounted `role="status"`;
//   · the helpline section: a `denied` claim is listed and can be flagged; a refusal in words;
//   · (elsewhere: the work-list's VIEW, the nav entry, `newUuid` and the audited-read registry are in `fraud-investigation-surfaces.test.tsx`
//     (the router is stubbed there); the sign-in return path is `login-return-path.test.tsx`; the four `closedClaimStateLabel` call sites
//     are in the appeal, certificate-replacement, claim-contact and withheld-note tests; the work-list's district SCOPE is proven over HTTP —
//     `apps/api/tests/integration/claims/fraud-investigation-routes.spec.ts`);
//   · `closedClaimStateLabel`: "found alive" WINS over "holder refused"; the existing labels otherwise;
//   · code review 2026-11-02 (chunk C): the honest wording (RC1), error copy (RC2), refresh on a stale refusal (RC3), a failed refresh
//     keeps the result (RC4), focus and announcements (RC5), ids with no `crypto.randomUUID` (RC6), state hygiene (RC7).

import { QueryClientProvider, onlineManager } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  FRAUD_FINDING_STEP_UP_CONTEXT,
  FRAUD_INVESTIGATION_ERROR_CODES,
  type FraudFindingResponse,
  type FraudInvestigationResponse,
  type MemberFraudClaimsResponse,
} from '@twt/contracts';

import * as api from '../src/api/client.js';
import { ApiError } from '../src/api/client.js';
import { createQueryClient, fraudInvestigationKey, memberFraudClaimsKey, openFraudInvestigationsKey, verifierConsoleKey } from '../src/api/hooks.js';
import { FraudInvestigationPanel } from '../src/modules/claim-verification/FraudInvestigationPanel.js';
import { closedClaimStateLabel, fraudInvestigationEn as t, verifierConsoleEn } from '../src/modules/claim-verification/i18n-en.js';
import { HelplineFraudFlag } from '../src/modules/helpline-claims/HelplineFraudFlag.js';
import { stepUpEn } from '../src/modules/workplaces/i18n-en.js';
import { resolveEn } from '../src/modules/helpline-claims/i18n-en.js';
import { renderWithClient } from './_helpers.js';

const CLAIM = '22222222-2222-4222-8222-222222222222';
const OTHER = '33333333-3333-4333-8333-333333333333';
const MEMBER = '11111111-1111-4111-8111-111111111111';
const AT = '2026-10-01T05:30:00.000Z';

vi.mock('../src/api/client.js', async () => {
  const actual = await vi.importActual<typeof import('../src/api/client.js')>('../src/api/client.js');
  return {
    ...actual,
    getFraudInvestigation: vi.fn(),
    postFraudFinding: vi.fn(),
    getMemberFraudClaims: vi.fn(),
    postFraudFlag: vi.fn(),
    requestStepUp: vi.fn(),
    verifyStepUp: vi.fn(),
  };
});
const mocked = vi.mocked(api);

function investigation(over: Partial<FraudInvestigationResponse> = {}): FraudInvestigationResponse {
  return {
    claim_case_id: CLAIM,
    claim_state: 'verifier_review',
    steps: [{ step: 'flagged', actor_display: 'Hema (Helpline)', acted_at: AT, alive_confirmation: null, note: { state: 'readable', value: 'Caller says she met him today.' } }],
    viewer: { can_record_finding: true, is_flagger: false },
    ...over,
  };
}

async function openPanel(): Promise<void> {
  renderWithClient(<FraudInvestigationPanel pariwarId="p1" claimCaseId={CLAIM} />);
  fireEvent.click(screen.getByTestId('fraud-investigation-disclosure'));
  await screen.findByTestId('fraud-investigation-steps');
}

describe('<FraudInvestigationPanel>', () => {
  beforeEach(() => {
    mocked.getFraudInvestigation.mockReset();
    mocked.postFraudFinding.mockReset();
  });

  it('reads ⛔ before it is opened (the read decrypts and is audited)', () => {
    renderWithClient(<FraudInvestigationPanel pariwarId="p1" claimCaseId={CLAIM} />);
    expect(mocked.getFraudInvestigation).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent('');
  });

  it('a viewer who may ⛔ record sees every note WITHHELD and ⛔ form', async () => {
    mocked.getFraudInvestigation.mockResolvedValue(
      investigation({
        steps: [{ step: 'flagged', actor_display: 'Hema (Helpline)', acted_at: AT, alive_confirmation: null, note: { state: 'withheld' } }],
        viewer: { can_record_finding: false, is_flagger: false },
      }),
    );
    await openPanel();
    expect(screen.getByText(t.noteWithheld)).toBeInTheDocument();
    expect(screen.queryByTestId('fraud-finding-form')).toBeNull();
  });

  it('the flagger is told another District Admin must record it', async () => {
    mocked.getFraudInvestigation.mockResolvedValue(investigation({ viewer: { can_record_finding: false, is_flagger: true } }));
    await openPanel();
    expect(screen.getByTestId('fraud-investigation-you-flagged')).toHaveTextContent(t.youFlagged);
  });

  it('a holder reads the note; ⛔ radio is pre-selected; an incomplete form is refused in words, ⛔ sent', async () => {
    mocked.getFraudInvestigation.mockResolvedValue(investigation());
    await openPanel();
    expect(screen.getByText('Caller says she met him today.')).toBeInTheDocument();
    for (const id of ['fraud-finding-outcome-innocent', 'fraud-finding-outcome-guilty', 'fraud-finding-alive-in_person', 'fraud-finding-alive-video_call', 'fraud-finding-alive-ground_inspection']) {
      expect(screen.getByTestId(id)).not.toBeChecked();
    }
    fireEvent.click(screen.getByTestId('fraud-finding-outcome-innocent'));
    fireEvent.click(screen.getByTestId('fraud-finding-submit'));
    expect(await screen.findByTestId('fraud-finding-incomplete')).toHaveTextContent(t.form.incomplete);
    expect(mocked.postFraudFinding).not.toHaveBeenCalled();
  });

  it('a 403 step-up HOLDS the write in the shared StepUpPanel; a refusal is shown in words; a finding shows the other claims', async () => {
    mocked.getFraudInvestigation.mockResolvedValue(investigation());
    await openPanel();
    fireEvent.click(screen.getByTestId('fraud-finding-outcome-innocent'));
    fireEvent.click(screen.getByTestId('fraud-finding-alive-video_call'));
    fireEvent.change(screen.getByTestId('fraud-finding-note'), { target: { value: 'Seen on a video call with the block officer.' } });

    mocked.postFraudFinding.mockRejectedValueOnce(new ApiError(403, 'auth.step_up_required', 'Step-up required'));
    fireEvent.click(screen.getByTestId('fraud-finding-submit'));
    expect(await screen.findByTestId('fraud-finding-step-up')).toBeInTheDocument();
    expect(screen.queryByTestId('fraud-finding-refused')).toBeNull();
    fireEvent.click(screen.getByTestId('fraud-finding-step-up-cancel'));
    await waitFor(() => expect(screen.queryByTestId('fraud-finding-step-up')).toBeNull());

    mocked.postFraudFinding.mockRejectedValueOnce(new ApiError(409, 'fraud_investigation.finder_is_flagger', 'x'));
    fireEvent.click(screen.getByTestId('fraud-finding-submit'));
    const refused = await screen.findByTestId('fraud-finding-refused');
    expect(refused).toHaveTextContent(t.refusal['fraud_investigation.finder_is_flagger']!);
    expect(refused.textContent).not.toContain('fraud_investigation.');

    mocked.postFraudFinding.mockResolvedValueOnce({
      claim_case_id: CLAIM, step_id: OTHER, finding_id: OTHER, outcome: 'innocent', closed: true, not_closed_reason: null,
      other_standing_claims: [{ claim_case_id: OTHER, claim_state: 'denied', filed_at: AT }], replayed: false,
    });
    fireEvent.click(screen.getByTestId('fraud-finding-submit'));
    expect(await screen.findByTestId('fraud-finding-other-claims')).toHaveTextContent(t.result.otherClaims);
    expect(screen.getByTestId('fraud-finding-status')).toHaveTextContent(t.result.closedInnocent);
    // The same ids on every attempt — a retry replays, ⛔ a second finding.
    const bodies = mocked.postFraudFinding.mock.calls.map((c) => c[2]);
    expect(new Set(bodies.map((b) => b.step_id)).size).toBe(1);
    expect(new Set(bodies.map((b) => b.finding_id)).size).toBe(1);
  });
});

describe('<HelplineFraudFlag>', () => {
  beforeEach(() => {
    mocked.getMemberFraudClaims.mockReset();
    mocked.postFraudFlag.mockReset();
  });

  it('lists a DENIED claim and flags it — the note required, the outcome announced', async () => {
    mocked.getMemberFraudClaims.mockResolvedValue({ claims: [{ claim_case_id: CLAIM, claim_state: 'denied', filed_at: AT, investigation: 'none' }] });
    renderWithClient(<HelplineFraudFlag pariwarId="p1" memberId={MEMBER} identityConfirmed={true} />);
    expect(await screen.findByTestId(`helpline-fraud-status-${CLAIM}`)).toHaveTextContent(resolveEn('helpline.fraud.status.none'));
    fireEvent.click(screen.getByTestId(`helpline-fraud-open-${CLAIM}`));
    fireEvent.click(screen.getByTestId('helpline-fraud-submit'));
    expect(await screen.findByTestId('helpline-fraud-incomplete')).toBeInTheDocument();
    expect(mocked.postFraudFlag).not.toHaveBeenCalled();
    mocked.postFraudFlag.mockResolvedValue({ claim_case_id: CLAIM, step_id: OTHER, claim_state: 'denied', replayed: false });
    fireEvent.change(screen.getByTestId('helpline-fraud-note'), { target: { value: 'His wife called: he is at home.' } });
    fireEvent.click(screen.getByTestId('helpline-fraud-submit'));
    await waitFor(() => expect(screen.getByTestId('helpline-fraud-status')).toHaveTextContent(resolveEn('helpline.fraud.flagged')));
    expect(mocked.postFraudFlag).toHaveBeenCalledWith('p1', CLAIM, expect.objectContaining({ note: 'His wife called: he is at home.' }));
  });

  it('⛔ read before the member is selected and read back', async () => {
    renderWithClient(<HelplineFraudFlag pariwarId="p1" memberId={MEMBER} identityConfirmed={false} />);
    expect(screen.getByTestId('helpline-fraud-need-member')).toBeInTheDocument();
    expect(mocked.getMemberFraudClaims).not.toHaveBeenCalled();
  });

  it('an already-flagged refusal reads as words, ⛔ a code', async () => {
    mocked.getMemberFraudClaims.mockResolvedValue({ claims: [{ claim_case_id: CLAIM, claim_state: 'verifier_review', filed_at: AT, investigation: 'none' }] });
    mocked.postFraudFlag.mockRejectedValue(new ApiError(409, 'fraud_investigation.already_flagged', 'x'));
    renderWithClient(<HelplineFraudFlag pariwarId="p1" memberId={MEMBER} identityConfirmed={true} />);
    fireEvent.click(await screen.findByTestId(`helpline-fraud-open-${CLAIM}`));
    fireEvent.change(screen.getByTestId('helpline-fraud-note'), { target: { value: 'Caller says he is alive.' } });
    fireEvent.click(screen.getByTestId('helpline-fraud-submit'));
    expect(await screen.findByTestId('helpline-fraud-refused')).toHaveTextContent(resolveEn('helpline.fraud.refusal.already_flagged'));
  });
});

describe('closedClaimStateLabel (DL10 (iii))', () => {
  const r = verifierConsoleEn.nomineeDeclaration.refusals;
  it('"found alive" WINS over "holder refused"; the existing labels otherwise', () => {
    expect(closedClaimStateLabel(true, 'closed', true)).toBe('Closed — the member was found alive');
    expect(closedClaimStateLabel(false, 'closed', true)).toBe('Closed — the member was found alive');
    expect(closedClaimStateLabel(true, 'closed', false)).toBe(r.closedHolderRefused);
    expect(closedClaimStateLabel(false, 'closed', false)).toBe(r.claimStateLabels['closed']);
    expect(closedClaimStateLabel(false, 'denied', false)).toBe(r.claimStateLabels['denied']);
  });
});


// ── Code review 2026-11-02, chunk C ──────────────────────────────────────────────────────────────────────────────────────────

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function answer(over: Partial<FraudFindingResponse> = {}): FraudFindingResponse {
  return { claim_case_id: CLAIM, step_id: OTHER, finding_id: OTHER, outcome: 'innocent', closed: true, not_closed_reason: null, other_standing_claims: [], replayed: false, ...over };
}

function fillIn(o: 'innocent' | 'guilty' = 'innocent', a: 'in_person' | 'video_call' | 'ground_inspection' = 'video_call', note = 'Seen on a video call with the block officer.'): void {
  fireEvent.click(screen.getByTestId(`fraud-finding-outcome-${o}`));
  fireEvent.click(screen.getByTestId(`fraud-finding-alive-${a}`));
  fireEvent.change(screen.getByTestId('fraud-finding-note'), { target: { value: note } });
}

const flaggedStep = (note: FraudInvestigationResponse['steps'][number]['note'] = { state: 'readable', value: 'Caller says she met him today.' }): FraudInvestigationResponse['steps'][number] => ({
  step: 'flagged', actor_display: 'Hema (Helpline)', acted_at: AT, alive_confirmation: null, note,
});
const foundStep = (note: FraudInvestigationResponse['steps'][number]['note']): FraudInvestigationResponse['steps'][number] => ({
  step: 'found_innocent', actor_display: 'Ravi (District Admin)', acted_at: AT, alive_confirmation: 'in_person', note,
});

describe('<FraudInvestigationPanel> — the form (RC9)', () => {
  beforeEach(() => {
    mocked.getFraudInvestigation.mockReset();
    mocked.postFraudFinding.mockReset();
    mocked.requestStepUp.mockReset();
    mocked.verifyStepUp.mockReset();
  });
  afterEach(() => vi.unstubAllGlobals());

  // The third column is EXACTLY the set of controls that must be marked invalid (PD12 (b): an aggregate "at least one" passes when the wrong
  // field is marked, or when all of them are).
  const missing: [string, () => void, string[]][] = [
    ['no finding chosen', () => { fireEvent.click(screen.getByTestId('fraud-finding-alive-in_person')); fireEvent.change(screen.getByTestId('fraud-finding-note'), { target: { value: 'Seen.' } }); }, ['fraud-finding-outcome-guilty', 'fraud-finding-outcome-innocent']],
    ['no proof of life chosen', () => { fireEvent.click(screen.getByTestId('fraud-finding-outcome-innocent')); fireEvent.change(screen.getByTestId('fraud-finding-note'), { target: { value: 'Seen.' } }); }, ['fraud-finding-alive-ground_inspection', 'fraud-finding-alive-in_person', 'fraud-finding-alive-video_call']],
    ['a whitespace-only note', () => { fireEvent.click(screen.getByTestId('fraud-finding-outcome-innocent')); fireEvent.click(screen.getByTestId('fraud-finding-alive-in_person')); fireEvent.change(screen.getByTestId('fraud-finding-note'), { target: { value: '   ' } }); }, ['fraud-finding-note']],
  ];
  it.each(missing)('⭐ %s ⇒ refused in words, EXACTLY the missing field marked invalid, ⛔ sent', async (_label, act, invalid) => {
    mocked.getFraudInvestigation.mockResolvedValue(investigation());
    await openPanel();
    act();
    expect(document.querySelectorAll('[aria-invalid="true"]')).toHaveLength(0); // the CONTROL: nothing is marked before the first try
    fireEvent.click(screen.getByTestId('fraud-finding-submit'));
    expect(await screen.findByTestId('fraud-finding-incomplete')).toHaveTextContent(t.form.incomplete);
    expect(mocked.postFraudFinding).not.toHaveBeenCalled();
    const marked = [...document.querySelectorAll('[aria-invalid="true"]')].map((e) => e.getAttribute('data-testid')).sort();
    expect(marked).toEqual(invalid);
  });

  it('⭐ a held write is RE-SENT with the SAME ids and body after the step-up verifies — and it lands', async () => {
    mocked.getFraudInvestigation.mockResolvedValue(investigation());
    await openPanel();
    fillIn('guilty', 'ground_inspection');
    mocked.postFraudFinding.mockRejectedValueOnce(new ApiError(403, 'auth.step_up_required', 'Step-up required'));
    mocked.postFraudFinding.mockResolvedValueOnce(answer({ outcome: 'guilty' }));
    mocked.requestStepUp.mockResolvedValueOnce({ sent: true, expiresInSeconds: 300 });
    mocked.verifyStepUp.mockResolvedValueOnce({ elevated: true, elevatedUntil: '2026-11-02T12:00:00.000Z' });
    fireEvent.click(screen.getByTestId('fraud-finding-submit'));
    const hold = await screen.findByTestId('fraud-finding-step-up');
    fireEvent.click(within(hold).getByRole('button', { name: stepUpEn.send }));
    fireEvent.change(await screen.findByTestId('fraud-finding-step-up-code'), { target: { value: '123456' } });
    fireEvent.click(screen.getByTestId('fraud-finding-step-up-verify'));
    await waitFor(() => expect(screen.getByTestId('fraud-finding-status')).toHaveTextContent(t.result.closedGuilty));
    expect(mocked.requestStepUp).toHaveBeenCalledWith(FRAUD_FINDING_STEP_UP_CONTEXT);
    expect(mocked.postFraudFinding).toHaveBeenCalledTimes(2);
    const [first, second] = mocked.postFraudFinding.mock.calls.map((c) => c[2]);
    expect(second).toEqual(first); // the same step_id, finding_id, outcome, proof and note — a replay, ⛔ a second finding
    expect(first).toMatchObject({ outcome: 'guilty', alive_confirmation: 'ground_inspection' });
  });

  it('the submit button restates the chosen outcome, and the form names a committed claim BEFORE the write', async () => {
    mocked.getFraudInvestigation.mockResolvedValue(investigation({ claim_state: 'approved' }));
    await openPanel();
    expect(screen.getByTestId('fraud-finding-submit')).toHaveTextContent(t.form.submit);
    expect(screen.getByTestId('fraud-finding-committed-warning')).toHaveTextContent(t.form.committedWarning);
    expect(t.form.committedWarning).toMatch(/may still be paid/);
    fireEvent.click(screen.getByTestId('fraud-finding-outcome-guilty'));
    expect(screen.getByTestId('fraud-finding-submit')).toHaveTextContent(t.form.submitOutcome['guilty']!);
    fireEvent.click(screen.getByTestId('fraud-finding-outcome-innocent'));
    expect(screen.getByTestId('fraud-finding-submit')).toHaveTextContent(t.form.submitOutcome['innocent']!);
  });

  it.each(['settled', 'verifier_review'] as const)('the committed-claim warning is shown for `settled` and ⛔ for a claim still in review (%s)', async (state) => {
    mocked.getFraudInvestigation.mockResolvedValue(investigation({ claim_state: state }));
    await openPanel();
    expect(screen.queryByTestId('fraud-finding-committed-warning') !== null).toBe(state === 'settled');
  });

  const variants: [string, Partial<FraudFindingResponse>, string[], string[]][] = [
    ['innocent, closed', {}, [t.result.closedInnocent], ['locked']],
    ['GUILTY, closed — the member STAYS LOCKED, ⛔ reads like a release', { outcome: 'guilty' }, [t.result.closedGuilty, t.result.guiltyStaysLocked], ['innocent']],
    ['innocent, committed — NOT closed, may still be paid', { closed: false, not_closed_reason: 'committed' }, [t.result.committedInnocent], ['locked']],
    ['GUILTY, committed — not closed, may still be paid, and locked', { outcome: 'guilty', closed: false, not_closed_reason: 'committed' }, [t.result.committedGuilty, t.result.guiltyStaysLocked], []],
    ['innocent, already closed', { closed: false, not_closed_reason: 'already_closed' }, [t.result.alreadyClosedInnocent], []],
    ['GUILTY, already closed — the member STAYS LOCKED', { outcome: 'guilty', closed: false, not_closed_reason: 'already_closed' }, [t.result.alreadyClosedGuilty, t.result.guiltyStaysLocked], []],
    ['an UNKNOWN reason is neutral — ⛔ "already closed"', { closed: false, not_closed_reason: null }, [t.result.notClosedInnocent], ['already closed']],
    ['GUILTY, an UNKNOWN reason is neutral — ⛔ "already closed", and the member STAYS LOCKED', { outcome: 'guilty', closed: false, not_closed_reason: null }, [t.result.notClosedGuilty, t.result.guiltyStaysLocked], ['already closed']],
    ['a REPLAY says the first submission stands', { replayed: true }, [t.result.closedInnocent, t.result.replayed], []],
  ];
  // The eight base sentences — outcome × (closed / committed / already closed / neutral). Every variant above puts EXACTLY ONE of them on
  // screen (its first `includes` entry): the other seven are asserted ABSENT, so a branch that picks a neighbour's sentence is red (PD9).
  const BASES = [
    t.result.closedInnocent, t.result.closedGuilty, t.result.committedInnocent, t.result.committedGuilty,
    t.result.alreadyClosedInnocent, t.result.alreadyClosedGuilty, t.result.notClosedInnocent, t.result.notClosedGuilty,
  ];
  it('the eight base sentences are all different, and none contains another (so "the others are absent" means something)', () => {
    expect(new Set(BASES).size).toBe(8);
    for (const a of BASES) for (const b of BASES) if (a !== b) expect(a.includes(b)).toBe(false);
  });
  it.each(variants)('⭐ the result — %s', async (_label, over, includes, excludes) => {
    mocked.getFraudInvestigation.mockResolvedValue(investigation());
    await openPanel();
    fillIn(over.outcome ?? 'innocent');
    mocked.postFraudFinding.mockResolvedValueOnce(answer(over));
    fireEvent.click(screen.getByTestId('fraud-finding-submit'));
    const status = screen.getByTestId('fraud-finding-status');
    await waitFor(() => expect(status).not.toHaveTextContent(/^$/));
    const text = status.textContent ?? '';
    for (const words of includes) expect(status).toHaveTextContent(words);
    for (const words of excludes) expect(text).not.toContain(words);
    for (const base of BASES) if (base !== includes[0]) expect(text).not.toContain(base);
    // The replay line appears iff the server said `replayed` (the negative control for the one row that sets it).
    expect(text.includes(t.result.replayed)).toBe(over.replayed === true);
    // The "member stays locked" line appears iff the finding was GUILTY — an innocent one must never carry it.
    expect(text.includes(t.result.guiltyStaysLocked)).toBe(over.outcome === 'guilty');
  });

  it('⭐ the other-claims block says so when there is none — and ⛔ the "still keep" line; with some, the reverse', async () => {
    mocked.getFraudInvestigation.mockResolvedValue(investigation());
    await openPanel();
    fillIn();
    mocked.postFraudFinding.mockResolvedValueOnce(answer({ other_standing_claims: [] }));
    fireEvent.click(screen.getByTestId('fraud-finding-submit'));
    const none = await screen.findByTestId('fraud-finding-other-claims');
    expect(none).toHaveTextContent(t.result.noOtherClaims);
    expect(none.textContent).not.toContain(t.result.otherClaims);
    expect(none.querySelector('li')).toBeNull();
  });

  it('the other-claims list names a guilty-closed claim plainly "Closed" — ⛔ the trigger-blind "another claim … goes ahead"', async () => {
    mocked.getFraudInvestigation.mockResolvedValue(investigation());
    await openPanel();
    fillIn();
    mocked.postFraudFinding.mockResolvedValueOnce(answer({ other_standing_claims: [{ claim_case_id: OTHER, claim_state: 'closed', filed_at: AT }] }));
    fireEvent.click(screen.getByTestId('fraud-finding-submit'));
    const block = await screen.findByTestId('fraud-finding-other-claims');
    expect(block).toHaveTextContent(`${t.result.closedPlain} ·`);
    expect(block.textContent).not.toContain('goes ahead');
    // … and with some, the "still keep" line is shown and the "none" line is not (the reverse of the empty case above).
    expect(block).toHaveTextContent(t.result.otherClaims);
    expect(block.textContent).not.toContain(t.result.noOtherClaims);
  });

  it('focus MOVES to the result line when the form that held it unmounts', async () => {
    mocked.getFraudInvestigation.mockResolvedValue(investigation());
    await openPanel();
    fillIn();
    mocked.postFraudFinding.mockResolvedValueOnce(answer());
    fireEvent.click(screen.getByTestId('fraud-finding-submit'));
    await waitFor(() => expect(screen.getByTestId('fraud-finding-status')).toHaveFocus());
  });
});

describe('<FraudInvestigationPanel> — the read (RC4, RC7, RC9)', () => {
  beforeEach(() => {
    mocked.getFraudInvestigation.mockReset();
    mocked.postFraudFinding.mockReset();
  });

  // jsdom does no layout, so "keeps its line breaks" is observable only as the `whitespace-pre-wrap` class plus the untouched `\n` in the text.
  it('⭐ all four note states render distinctly — readable carries its line breaks (class + exact text); withheld / anonymized / unreadable say so', async () => {
    mocked.getFraudInvestigation.mockResolvedValue(
      investigation({
        steps: [
          flaggedStep({ state: 'readable', value: 'line one\nline two' }),
          foundStep({ state: 'anonymized' }),
        ],
        viewer: { can_record_finding: false, is_flagger: false },
      }),
    );
    await openPanel();
    const readable = screen.getByText(/line one/);
    expect(readable).toHaveClass('whitespace-pre-wrap');
    expect(readable.textContent).toBe('line one\nline two');
    expect(screen.getByText(t.noteAnonymized)).toBeInTheDocument();
  });

  it.each([
    ['unreadable', { state: 'unreadable' } as const, t.noteUnreadable],
    ['withheld', { state: 'withheld' } as const, t.noteWithheld],
  ])('the %s note state shows its own words — ⛔ an empty note', async (_label, note, words) => {
    mocked.getFraudInvestigation.mockResolvedValue(investigation({ steps: [flaggedStep(note)], viewer: { can_record_finding: false, is_flagger: false } }));
    await openPanel();
    expect(screen.getByText(words)).toBeInTheDocument();
  });

  it('⭐ closing FORGETS: the notes leave the screen, and a reopen is a FRESH read (⛔ stale data shown while it loads)', async () => {
    mocked.getFraudInvestigation.mockResolvedValue(investigation());
    await openPanel();
    expect(screen.getByText('Caller says she met him today.')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('fraud-investigation-disclosure')); // close
    expect(screen.queryByText('Caller says she met him today.')).toBeNull();
    expect(mocked.getFraudInvestigation).toHaveBeenCalledTimes(1);
    let release: (v: FraudInvestigationResponse) => void = () => undefined;
    mocked.getFraudInvestigation.mockImplementationOnce(() => new Promise<FraudInvestigationResponse>((r) => { release = r; }));
    fireEvent.click(screen.getByTestId('fraud-investigation-disclosure')); // reopen
    expect(screen.getByTestId('fraud-investigation-loading')).toBeInTheDocument(); // loading — the cache did NOT hand the old data back
    expect(screen.queryByText('Caller says she met him today.')).toBeNull();
    release(investigation());
    await screen.findByTestId('fraud-investigation-steps');
    expect(mocked.getFraudInvestigation).toHaveBeenCalledTimes(2);
  });

  it('the intro ⛔ promises an unconditional close (an approved or paid claim is not closed by a finding) — in the copy AND on the screen', async () => {
    expect(t.form.intro).toMatch(/unless it is already approved or paid/);
    expect(t.form.intro).not.toMatch(/^[^.]*A finding closes the claim, and only one/);
    // The copy constant is not the screen (PD12 (d)): the form a holder is shown must carry the very same sentence.
    mocked.getFraudInvestigation.mockResolvedValue(investigation());
    await openPanel();
    expect(screen.getByTestId('fraud-finding-form')).toHaveTextContent(t.form.intro);
  });

  it('⭐ a network RECONNECT does ⛔ re-run the decrypting, audited read (`refetchOnReconnect: false`)', async () => {
    mocked.getFraudInvestigation.mockResolvedValue(investigation());
    await openPanel();
    expect(mocked.getFraudInvestigation).toHaveBeenCalledTimes(1);
    act(() => onlineManager.setOnline(false));
    act(() => onlineManager.setOnline(true));
    await new Promise((r) => setTimeout(r, 30));
    expect(mocked.getFraudInvestigation).toHaveBeenCalledTimes(1);
  });

  it('the flagger is ⛔ told another admin must find it once a finding exists', async () => {
    mocked.getFraudInvestigation.mockResolvedValue(
      investigation({ steps: [flaggedStep(), foundStep({ state: 'readable', value: 'Seen.' })], viewer: { can_record_finding: false, is_flagger: true } }),
    );
    await openPanel();
    expect(screen.queryByTestId('fraud-investigation-you-flagged')).toBeNull();
  });

  it('⭐ a refusal that proves the panel STALE refreshes it (the form goes); a step-up HOLD ⛔ refreshes (a decrypting, audited read)', async () => {
    mocked.getFraudInvestigation.mockResolvedValueOnce(investigation());
    mocked.getFraudInvestigation.mockResolvedValue(investigation({ steps: [flaggedStep(), foundStep({ state: 'readable', value: 'Seen.' })], viewer: { can_record_finding: false, is_flagger: false } }));
    await openPanel();
    fillIn();
    mocked.postFraudFinding.mockRejectedValueOnce(new ApiError(403, 'auth.step_up_required', 'x'));
    fireEvent.click(screen.getByTestId('fraud-finding-submit'));
    await screen.findByTestId('fraud-finding-step-up');
    expect(mocked.getFraudInvestigation).toHaveBeenCalledTimes(1); // the hold did not re-read
    fireEvent.click(screen.getByTestId('fraud-finding-step-up-cancel'));
    mocked.postFraudFinding.mockRejectedValueOnce(new ApiError(409, 'fraud_investigation.already_found', 'x'));
    fireEvent.click(screen.getByTestId('fraud-finding-submit'));
    expect(await screen.findByTestId('fraud-finding-refused')).toHaveTextContent(t.refusal['fraud_investigation.already_found']!);
    await waitFor(() => expect(screen.queryByTestId('fraud-finding-form')).toBeNull()); // the refresh took the form away
    expect(mocked.getFraudInvestigation).toHaveBeenCalledTimes(2);
  });

  it('⭐ a FAILED refresh after a successful finding keeps the result on screen (⛔ "could not be loaded" over it)', async () => {
    mocked.getFraudInvestigation.mockResolvedValueOnce(investigation());
    mocked.getFraudInvestigation.mockRejectedValue(new Error('network down'));
    await openPanel();
    fillIn();
    mocked.postFraudFinding.mockResolvedValueOnce(answer({ other_standing_claims: [{ claim_case_id: OTHER, claim_state: 'denied', filed_at: AT }] }));
    fireEvent.click(screen.getByTestId('fraud-finding-submit'));
    expect(await screen.findByTestId('fraud-investigation-refresh-error')).toHaveTextContent(t.refreshError);
    expect(screen.getByTestId('fraud-finding-other-claims')).toHaveTextContent(t.result.otherClaims);
    expect(screen.getByTestId('fraud-investigation-steps')).toBeInTheDocument();
    expect(screen.queryByTestId('fraud-investigation-error')).toBeNull();
  });
});

describe('<FraudInvestigationPanel> — error copy (RC2)', () => {
  beforeEach(() => {
    mocked.getFraudInvestigation.mockReset();
    mocked.postFraudFinding.mockReset();
  });

  it('⭐ EVERY code the contract lists has words in the finding form — ⛔ the generic fallback — plus the admin display-name code', () => {
    // `already_flagged` is the FLAG route's alone (the helpline form maps it); the finding route can never answer it.
    const flagOnly = new Set(['fraud_investigation.already_flagged']);
    for (const code of FRAUD_INVESTIGATION_ERROR_CODES.filter((c) => !flagOnly.has(c))) {
      expect(Object.prototype.hasOwnProperty.call(t.refusal, code), code).toBe(true);
    }
    expect(Object.prototype.hasOwnProperty.call(t.refusal, 'admin.display_name_missing')).toBe(true);
  });

  it('a retriable `concurrent` says so, keeps the form, and the resend carries the SAME ids', async () => {
    mocked.getFraudInvestigation.mockResolvedValue(investigation());
    await openPanel();
    fillIn();
    mocked.postFraudFinding.mockRejectedValueOnce(new ApiError(409, 'fraud_investigation.concurrent', 'x'));
    fireEvent.click(screen.getByTestId('fraud-finding-submit'));
    expect(await screen.findByTestId('fraud-finding-refused')).toHaveTextContent(t.refusal['fraud_investigation.concurrent']!);
    mocked.postFraudFinding.mockResolvedValueOnce(answer());
    fireEvent.click(screen.getByTestId('fraud-finding-submit'));
    await screen.findByTestId('fraud-finding-other-claims');
    const bodies = mocked.postFraudFinding.mock.calls.map((c) => c[2]);
    expect(new Set(bodies.map((b) => b.step_id)).size).toBe(1);
    expect(new Set(bodies.map((b) => b.finding_id)).size).toBe(1);
  });

  it('a code that is not copy — even one that is a property of every object — reads as the generic line', async () => {
    mocked.getFraudInvestigation.mockResolvedValue(investigation());
    await openPanel();
    fillIn();
    mocked.postFraudFinding.mockRejectedValueOnce(new ApiError(500, 'constructor', 'x'));
    fireEvent.click(screen.getByTestId('fraud-finding-submit'));
    expect(await screen.findByTestId('fraud-finding-refused')).toHaveTextContent(t.refusalGeneric);
  });
});

describe('<FraudInvestigationPanel> — ids (RC6)', () => {
  beforeEach(() => {
    mocked.getFraudInvestigation.mockReset();
    mocked.postFraudFinding.mockReset();
  });
  afterEach(() => vi.unstubAllGlobals());

  it('⭐ with NO `crypto.randomUUID` (plain http on a LAN / staging host) the console still renders, and the finding carries UUID-shaped ids', async () => {
    const real = globalThis.crypto;
    vi.stubGlobal('crypto', { getRandomValues: real.getRandomValues.bind(real) }); // ⛔ randomUUID
    mocked.getFraudInvestigation.mockResolvedValue(investigation());
    await openPanel(); // a throw at render would fail HERE
    fillIn();
    mocked.postFraudFinding.mockResolvedValueOnce(answer());
    fireEvent.click(screen.getByTestId('fraud-finding-submit'));
    await screen.findByTestId('fraud-finding-other-claims');
    const body = mocked.postFraudFinding.mock.calls[0]![2];
    expect(body.step_id).toMatch(UUID_V4);
    expect(body.finding_id).toMatch(UUID_V4);
    expect(body.step_id).not.toBe(body.finding_id);
  });
});

describe('<HelplineFraudFlag> — code review 2026-11-02 (RC2, RC5, RC7, RC9)', () => {
  const OTHER_CLAIM = '44444444-4444-4444-8444-444444444444';
  beforeEach(() => {
    mocked.getMemberFraudClaims.mockReset();
    mocked.postFraudFlag.mockReset();
  });
  afterEach(() => vi.unstubAllGlobals());

  const list = (over: Partial<MemberFraudClaimsResponse['claims'][number]> = {}): MemberFraudClaimsResponse => ({
    claims: [{ claim_case_id: CLAIM, claim_state: 'denied', filed_at: AT, investigation: 'none', ...over }],
  });
  async function openForm(id = CLAIM): Promise<void> {
    fireEvent.click(await screen.findByTestId(`helpline-fraud-open-${id}`));
    fireEvent.change(screen.getByTestId('helpline-fraud-note'), { target: { value: 'Caller says he is alive.' } });
  }

  it.each([
    ['admin.display_name_missing', 'helpline.fraud.refusal.display_name_missing'],
    ['fraud_investigation.claim_not_found', 'helpline.fraud.refusal.claim_not_found'],
    ['fraud_investigation.concurrent', 'helpline.fraud.refusal.concurrent'],
    ['fraud_investigation.step_conflict', 'helpline.fraud.refusal.step_conflict'], // PD6 — the id is spent: a retry can never succeed
  ] as const)('⭐ a %s refusal reads in its OWN words — ⛔ "could not be flagged just now", which implies a retry', async (code, key) => {
    mocked.getMemberFraudClaims.mockResolvedValue(list());
    mocked.postFraudFlag.mockRejectedValue(new ApiError(409, code, 'x'));
    renderWithClient(<HelplineFraudFlag pariwarId="p1" memberId={MEMBER} identityConfirmed={true} />);
    await openForm();
    fireEvent.click(screen.getByTestId('helpline-fraud-submit'));
    const refused = await screen.findByTestId('helpline-fraud-refused');
    expect(refused).toHaveTextContent(resolveEn(key));
    expect(refused.textContent).not.toContain(resolveEn('helpline.fraud.refusal.generic'));
    expect(refused.textContent).not.toContain('fraud_investigation.');
  });

  it('an unrecognised failure is the generic line', async () => {
    mocked.getMemberFraudClaims.mockResolvedValue(list());
    mocked.postFraudFlag.mockRejectedValue(new ApiError(500, 'http.internal', 'x'));
    renderWithClient(<HelplineFraudFlag pariwarId="p1" memberId={MEMBER} identityConfirmed={true} />);
    await openForm();
    fireEvent.click(screen.getByTestId('helpline-fraud-submit'));
    expect(await screen.findByTestId('helpline-fraud-refused')).toHaveTextContent(resolveEn('helpline.fraud.refusal.generic'));
  });

  it('⭐ the flag\'s step id is the SAME on a retry, and a re-opened form mints a NEW one', async () => {
    mocked.getMemberFraudClaims.mockResolvedValue(list());
    mocked.postFraudFlag.mockRejectedValueOnce(new ApiError(500, 'http.internal', 'x'));
    renderWithClient(<HelplineFraudFlag pariwarId="p1" memberId={MEMBER} identityConfirmed={true} />);
    await openForm();
    fireEvent.click(screen.getByTestId('helpline-fraud-submit'));
    await screen.findByTestId('helpline-fraud-refused');
    mocked.postFraudFlag.mockRejectedValueOnce(new ApiError(500, 'http.internal', 'x'));
    fireEvent.click(screen.getByTestId('helpline-fraud-submit'));
    await waitFor(() => expect(mocked.postFraudFlag).toHaveBeenCalledTimes(2));
    const [a, b] = mocked.postFraudFlag.mock.calls.map((c) => c[2].step_id);
    expect(a).toBe(b);
    expect(a).toMatch(UUID_V4);
    fireEvent.click(screen.getByRole('button', { name: resolveEn('helpline.fraud.cancel') }));
    fireEvent.click(screen.getByTestId(`helpline-fraud-open-${CLAIM}`));
    fireEvent.change(screen.getByTestId('helpline-fraud-note'), { target: { value: 'A second call.' } });
    mocked.postFraudFlag.mockRejectedValueOnce(new ApiError(500, 'http.internal', 'x'));
    fireEvent.click(screen.getByTestId('helpline-fraud-submit'));
    await waitFor(() => expect(mocked.postFraudFlag).toHaveBeenCalledTimes(3));
    expect(mocked.postFraudFlag.mock.calls[2]![2].step_id).not.toBe(a);
  });

  it('works with NO `crypto.randomUUID` — the step id is still UUID-shaped', async () => {
    const real = globalThis.crypto;
    vi.stubGlobal('crypto', { getRandomValues: real.getRandomValues.bind(real) });
    mocked.getMemberFraudClaims.mockResolvedValue(list());
    mocked.postFraudFlag.mockResolvedValue({ claim_case_id: CLAIM, step_id: OTHER, claim_state: 'denied', replayed: false });
    renderWithClient(<HelplineFraudFlag pariwarId="p1" memberId={MEMBER} identityConfirmed={true} />);
    await openForm();
    fireEvent.click(screen.getByTestId('helpline-fraud-submit'));
    await waitFor(() => expect(mocked.postFraudFlag).toHaveBeenCalled());
    expect(mocked.postFraudFlag.mock.calls[0]![2].step_id).toMatch(UUID_V4);
  });

  it.each(['flagged', 'found'] as const)('a claim whose investigation is `%s` has ⛔ a Flag button', async (investigation_) => {
    mocked.getMemberFraudClaims.mockResolvedValue(list({ investigation: investigation_ }));
    renderWithClient(<HelplineFraudFlag pariwarId="p1" memberId={MEMBER} identityConfirmed={true} />);
    expect(await screen.findByTestId(`helpline-fraud-status-${CLAIM}`)).toHaveTextContent(resolveEn(`helpline.fraud.status.${investigation_}`));
    expect(screen.queryByTestId(`helpline-fraud-open-${CLAIM}`)).toBeNull();
  });

  it('⭐ flagging a SECOND claim is announced again — the status line names the claim; focus moves to it; each row\'s button has its own name', async () => {
    mocked.getMemberFraudClaims.mockResolvedValue({
      claims: [
        { claim_case_id: CLAIM, claim_state: 'denied', filed_at: AT, investigation: 'none' },
        { claim_case_id: OTHER_CLAIM, claim_state: 'verifier_review', filed_at: '2026-08-02T05:30:00.000Z', investigation: 'none' },
      ],
    });
    mocked.postFraudFlag.mockResolvedValue({ claim_case_id: CLAIM, step_id: OTHER, claim_state: 'denied', replayed: false });
    renderWithClient(<HelplineFraudFlag pariwarId="p1" memberId={MEMBER} identityConfirmed={true} />);
    const names = (await screen.findAllByRole('button', { name: new RegExp(resolveEn('helpline.fraud.flag')) })).map((b) => b.getAttribute('aria-label'));
    expect(new Set(names).size).toBe(2); // ⛔ two identical "Flag this claim"
    await openForm(CLAIM);
    fireEvent.click(screen.getByTestId('helpline-fraud-submit'));
    const status = screen.getByTestId('helpline-fraud-status');
    await waitFor(() => expect(status).toHaveTextContent(resolveEn('helpline.fraud.flagged')));
    await waitFor(() => expect(status).toHaveFocus());
    const first = status.textContent;
    await openForm(OTHER_CLAIM);
    expect(status).toHaveTextContent(''); // opening another form clears the stale "flagged"
    fireEvent.click(screen.getByTestId('helpline-fraud-submit'));
    await waitFor(() => expect(status.textContent).not.toBe(''));
    expect(status.textContent).not.toBe(first); // a DIFFERENT string, so a live region announces it again
  });

  it('⭐ a network RECONNECT does ⛔ re-run the audited per-member list read', async () => {
    mocked.getMemberFraudClaims.mockResolvedValue(list());
    renderWithClient(<HelplineFraudFlag pariwarId="p1" memberId={MEMBER} identityConfirmed={true} />);
    await screen.findByTestId(`helpline-fraud-status-${CLAIM}`);
    expect(mocked.getMemberFraudClaims).toHaveBeenCalledTimes(1);
    act(() => onlineManager.setOnline(false));
    act(() => onlineManager.setOnline(true));
    await new Promise((r) => setTimeout(r, 30));
    expect(mocked.getMemberFraudClaims).toHaveBeenCalledTimes(1);
  });

  it('⭐ opening the form moves focus to the note (the Flag button that held it is gone); Cancel puts focus on the section, ⛔ the page body (PD7)', async () => {
    mocked.getMemberFraudClaims.mockResolvedValue(list());
    renderWithClient(<HelplineFraudFlag pariwarId="p1" memberId={MEMBER} identityConfirmed={true} />);
    const flagButton = await screen.findByTestId(`helpline-fraud-open-${CLAIM}`);
    flagButton.focus();
    expect(flagButton).toHaveFocus(); // the CONTROL: focus starts on the button the operator pressed
    fireEvent.click(flagButton);
    const note = screen.getByTestId('helpline-fraud-note');
    await waitFor(() => expect(note).toHaveFocus());
    fireEvent.click(screen.getByRole('button', { name: resolveEn('helpline.fraud.cancel') }));
    expect(screen.queryByTestId('helpline-fraud-form')).toBeNull();
    expect(screen.getByRole('heading', { name: resolveEn('helpline.fraud.heading') })).toHaveFocus();
    expect(document.body).not.toHaveFocus();
  });

  it('the note is marked invalid only while it is empty AND a send was refused — and un-marked once it is written (PD12 (b))', async () => {
    mocked.getMemberFraudClaims.mockResolvedValue(list());
    renderWithClient(<HelplineFraudFlag pariwarId="p1" memberId={MEMBER} identityConfirmed={true} />);
    fireEvent.click(await screen.findByTestId(`helpline-fraud-open-${CLAIM}`));
    const note = screen.getByTestId('helpline-fraud-note');
    expect(note).toHaveAttribute('aria-invalid', 'false'); // not before the first try
    fireEvent.click(screen.getByTestId('helpline-fraud-submit'));
    await screen.findByTestId('helpline-fraud-incomplete');
    expect(note).toHaveAttribute('aria-invalid', 'true');
    fireEvent.change(note, { target: { value: 'He is at home.' } });
    expect(note).toHaveAttribute('aria-invalid', 'false');
    expect(mocked.postFraudFlag).not.toHaveBeenCalled();
  });

  // ⚠ What this proves is the PAIR of resets (`HelplineFraudFlag` clears the note both when the form opens and when it is cancelled): removing BOTH
  // turns it red, removing EITHER alone stays green — each covers for the other, and the unmounted form means the DOM cannot tell which one ran
  // (code review 2026-11-02, PD12 (a); mutation-checked both ways). So it pins "a re-opened form starts empty", ⛔ either reset on its own.
  it('a re-opened form starts with an EMPTY note — ⛔ the previous caller\'s words', async () => {
    mocked.getMemberFraudClaims.mockResolvedValue(list());
    renderWithClient(<HelplineFraudFlag pariwarId="p1" memberId={MEMBER} identityConfirmed={true} />);
    await openForm();
    fireEvent.click(screen.getByRole('button', { name: resolveEn('helpline.fraud.cancel') }));
    fireEvent.click(screen.getByTestId(`helpline-fraud-open-${CLAIM}`));
    expect(screen.getByTestId('helpline-fraud-note')).toHaveValue('');
  });
});

// ── Code review 2026-11-02, patch-diff review (PD10) ────────────────────────────────────────────────────────────────────────

// Which caches a fraud write refreshes, EXACTLY (RC3). The set is asserted whole, so a missing refresh AND a stray one are both red; the
// step-up HOLD (nothing was written, the same write is about to be re-sent) refreshes none — a refresh there is a decrypting, audited read.
describe('which caches a fraud write refreshes (RC3, PD10)', () => {
  beforeEach(() => {
    mocked.getFraudInvestigation.mockReset();
    mocked.postFraudFinding.mockReset();
    mocked.getMemberFraudClaims.mockReset();
    mocked.postFraudFlag.mockReset();
  });

  const keyText = (k: readonly unknown[]) => JSON.stringify(k);
  /** Render under a client whose `invalidateQueries` is recorded; returns the keys asked for so far. */
  function withRecordedInvalidations(ui: ReactElement): () => string[] {
    const client = createQueryClient();
    const spy = vi.spyOn(client, 'invalidateQueries');
    render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
    return () => spy.mock.calls.map((c) => keyText((c[0] as { queryKey: readonly unknown[] }).queryKey)).sort();
  }

  async function openAndFill(): Promise<void> {
    fireEvent.click(screen.getByTestId('fraud-investigation-disclosure'));
    await screen.findByTestId('fraud-investigation-steps');
    fillIn();
  }

  it('⭐ a finding refreshes the investigation, the verifier console packet and the work-list — and nothing else', async () => {
    mocked.getFraudInvestigation.mockResolvedValue(investigation());
    mocked.postFraudFinding.mockResolvedValueOnce(answer());
    const asked = withRecordedInvalidations(<FraudInvestigationPanel pariwarId="p1" claimCaseId={CLAIM} />);
    await openAndFill();
    expect(asked()).toEqual([]); // the CONTROL: opening and typing refresh nothing
    fireEvent.click(screen.getByTestId('fraud-finding-submit'));
    await waitFor(() => expect(screen.getByTestId('fraud-finding-status')).toHaveTextContent(t.result.closedInnocent));
    expect(asked()).toEqual([fraudInvestigationKey('p1', CLAIM), verifierConsoleKey('p1', CLAIM), openFraudInvestigationsKey('p1')].map(keyText).sort());
  });

  it('⭐ a refusal that proves the panel stale refreshes the same three; a step-up HOLD refreshes none', async () => {
    mocked.getFraudInvestigation.mockResolvedValue(investigation());
    const asked = withRecordedInvalidations(<FraudInvestigationPanel pariwarId="p1" claimCaseId={CLAIM} />);
    await openAndFill();
    mocked.postFraudFinding.mockRejectedValueOnce(new ApiError(403, 'auth.step_up_required', 'Step-up required'));
    fireEvent.click(screen.getByTestId('fraud-finding-submit'));
    await screen.findByTestId('fraud-finding-step-up');
    expect(asked()).toEqual([]);
    fireEvent.click(screen.getByTestId('fraud-finding-step-up-cancel'));
    await waitFor(() => expect(screen.queryByTestId('fraud-finding-step-up')).toBeNull());
    mocked.postFraudFinding.mockRejectedValueOnce(new ApiError(409, 'fraud_investigation.already_found', 'x'));
    fireEvent.click(screen.getByTestId('fraud-finding-submit'));
    await screen.findByTestId('fraud-finding-refused');
    expect(asked()).toEqual([fraudInvestigationKey('p1', CLAIM), verifierConsoleKey('p1', CLAIM), openFraudInvestigationsKey('p1')].map(keyText).sort());
  });

  it('⭐ a flag refreshes the member\'s list, that claim\'s investigation and the work-list — and nothing else', async () => {
    mocked.getMemberFraudClaims.mockResolvedValue({ claims: [{ claim_case_id: CLAIM, claim_state: 'denied', filed_at: AT, investigation: 'none' }] });
    mocked.postFraudFlag.mockResolvedValue({ claim_case_id: CLAIM, step_id: OTHER, claim_state: 'denied', replayed: false });
    const asked = withRecordedInvalidations(<HelplineFraudFlag pariwarId="p1" memberId={MEMBER} identityConfirmed={true} />);
    fireEvent.click(await screen.findByTestId(`helpline-fraud-open-${CLAIM}`));
    fireEvent.change(screen.getByTestId('helpline-fraud-note'), { target: { value: 'He is at home.' } });
    expect(asked()).toEqual([]); // the CONTROL
    fireEvent.click(screen.getByTestId('helpline-fraud-submit'));
    await waitFor(() => expect(screen.getByTestId('helpline-fraud-status')).toHaveTextContent(resolveEn('helpline.fraud.flagged')));
    expect(asked()).toEqual([memberFraudClaimsKey('p1', MEMBER), fraudInvestigationKey('p1', CLAIM), openFraudInvestigationsKey('p1')].map(keyText).sort());
  });
});
