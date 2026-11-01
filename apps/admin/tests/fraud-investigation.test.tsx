// Story 6.22 (AC13; DL5, DL7, DL10) — the fraud investigation's staff surfaces. The api client module is mocked (the
// `helpline-certificate-replacement.test.tsx` pattern); the real hooks run.
//
//   · the console panel: radios ⛔ pre-selected; outcome, proof of life and note required; a viewer the server judged may ⛔
//     record sees every note WITHHELD and ⛔ form; a holder sees the notes; a 403 step-up HOLDS the write (the shared
//     `StepUpPanel`); a refusal is shown in words (⛔ a raw code); after a finding, the other standing claims; an
//     always-mounted `role="status"`;
//   · the helpline section: a `denied` claim is listed and can be flagged; a refusal in words;
//   · (the work-list's district scope is proven over HTTP — `apps/api/tests/integration/claims/fraud-investigation-routes.spec.ts`;
//     its view is ⛔ rendered here: it needs the router for `useNavigate`);
//   · `closedClaimStateLabel`: "found alive" WINS over "holder refused"; the existing labels otherwise.

import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { FraudInvestigationResponse } from '@twt/contracts';

import * as api from '../src/api/client.js';
import { ApiError } from '../src/api/client.js';
import { FraudInvestigationPanel } from '../src/modules/claim-verification/FraudInvestigationPanel.js';
import { closedClaimStateLabel, fraudInvestigationEn as t, verifierConsoleEn } from '../src/modules/claim-verification/i18n-en.js';
import { HelplineFraudFlag } from '../src/modules/helpline-claims/HelplineFraudFlag.js';
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
    expect(screen.getByTestId('fraud-finding-status')).toHaveTextContent(t.result.closed);
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

  it('⛔ read before the member is selected and read back; a refusal is shown in words', async () => {
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
