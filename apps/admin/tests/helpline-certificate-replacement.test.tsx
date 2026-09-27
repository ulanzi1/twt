// `<HelplineCertificateReplacement>` — Story 6.21b (D5) container tests.
//
// The api client module is mocked (the `helpline-claim-page.test.tsx` / `niyamavali-page.test.tsx`
// pattern); the real hooks + Query cache are exercised via `renderWithClient`.

import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { DeathCertificateHelplineClaimStatus } from '@twt/contracts';

import * as api from '../src/api/client.js';
import { createQueryClient } from '../src/api/hooks.js';
import { ApiError } from '../src/api/client.js';
import { HelplineCertificateReplacement } from '../src/modules/helpline-claims/HelplineCertificateReplacement.js';
import { renderWithClient } from './_helpers.js';

const MEMBER_ID = '11111111-1111-1111-1111-111111111111';
const CLAIM_A = '22222222-2222-2222-2222-222222222222';
const CLAIM_B = '33333333-3333-3333-3333-333333333333';

function claim(over: Partial<DeathCertificateHelplineClaimStatus> = {}): DeathCertificateHelplineClaimStatus {
  return {
    claim_case_id: CLAIM_A,
    claim_state: 'verification_in_progress',
    created_at: '2026-09-01T00:00:00.000Z',
    status: 'replacement_requested',
    replacement_reason: 'unclear_date',
    upload_allowed: true,
    reassurance: 'not_refused',
    ...over,
  };
}

vi.mock('../src/api/client.js', async () => {
  const actual = await vi.importActual<typeof import('../src/api/client.js')>('../src/api/client.js');
  return {
    ...actual,
    getDeathCertificateClaimsForMember: vi.fn(async () => ({ member_id: MEMBER_ID, claims: [] })),
    uploadHelplineDeathCertificate: vi.fn(async () => ({ documentId: CLAIM_A, status: 'processing' as const })),
  };
});

const mocked = vi.mocked(api);

describe('<HelplineCertificateReplacement>', () => {
  // Each test starts from clean mocks — ⛔ no queued response or call history leaks between tests.
  beforeEach(() => {
    mocked.getDeathCertificateClaimsForMember.mockReset();
    mocked.getDeathCertificateClaimsForMember.mockResolvedValue({ member_id: MEMBER_ID, claims: [] });
    mocked.uploadHelplineDeathCertificate.mockReset();
    mocked.uploadHelplineDeathCertificate.mockResolvedValue({ documentId: CLAIM_A, status: 'processing' as const });
  });

  it('self-suppresses (a hint, not the list) before the member is selected + read-back confirmed', () => {
    renderWithClient(<HelplineCertificateReplacement pariwarId="p1" memberId={null} identityConfirmed={false} />);
    expect(screen.getByTestId('helpline-certificate-need-member')).toBeInTheDocument();
    expect(mocked.getDeathCertificateClaimsForMember).not.toHaveBeenCalled();
  });

  it('none live ⇒ "no open claim"', async () => {
    mocked.getDeathCertificateClaimsForMember.mockResolvedValueOnce({ member_id: MEMBER_ID, claims: [] });
    renderWithClient(<HelplineCertificateReplacement pariwarId="p1" memberId={MEMBER_ID} identityConfirmed={true} />);
    await waitFor(() => expect(screen.getByTestId('helpline-certificate-no-claim')).toBeInTheDocument());
  });

  it('one live claim ⇒ used AS-IS (no radio pick), shows the D4 line + the upload control when upload_allowed', async () => {
    mocked.getDeathCertificateClaimsForMember.mockResolvedValueOnce({ member_id: MEMBER_ID, claims: [claim()] });
    renderWithClient(<HelplineCertificateReplacement pariwarId="p1" memberId={MEMBER_ID} identityConfirmed={true} />);
    await waitFor(() => expect(screen.getByTestId('helpline-certificate-status')).toBeInTheDocument());
    expect(screen.queryByTestId('helpline-certificate-pick')).not.toBeInTheDocument();
    expect(screen.getByText(/doesn't show a clear date of death/)).toBeInTheDocument();
    expect(screen.getByTestId('helpline-certificate-upload-input')).toBeInTheDocument();
  });

  it('a claim with upload_allowed FALSE shows the status line but NO upload control', async () => {
    mocked.getDeathCertificateClaimsForMember.mockResolvedValueOnce({
      member_id: MEMBER_ID,
      claims: [claim({ status: 'awaiting_review', replacement_reason: null, upload_allowed: false, reassurance: null })],
    });
    renderWithClient(<HelplineCertificateReplacement pariwarId="p1" memberId={MEMBER_ID} identityConfirmed={true} />);
    await waitFor(() => expect(screen.getByTestId('helpline-certificate-status')).toBeInTheDocument());
    expect(screen.queryByTestId('helpline-certificate-upload-input')).not.toBeInTheDocument();
  });

  it('several live claims ⇒ the operator PICKS; the form appears only once chosen', async () => {
    mocked.getDeathCertificateClaimsForMember.mockResolvedValueOnce({
      member_id: MEMBER_ID,
      claims: [claim({ claim_case_id: CLAIM_A }), claim({ claim_case_id: CLAIM_B, claim_state: 'verifier_review' })],
    });
    renderWithClient(<HelplineCertificateReplacement pariwarId="p1" memberId={MEMBER_ID} identityConfirmed={true} />);
    await waitFor(() => expect(screen.getByTestId('helpline-certificate-pick')).toBeInTheDocument());
    expect(screen.queryByTestId('helpline-certificate-status')).not.toBeInTheDocument();
    await userEvent.click(screen.getByTestId(`helpline-certificate-claim-${CLAIM_A}`));
    await waitFor(() => expect(screen.getByTestId('helpline-certificate-status')).toBeInTheDocument());
  });

  it('a successful send shows "sent, being processed" and hides the upload control until the claim/server changes', async () => {
    const missingClaim = claim({ status: 'missing', replacement_reason: null });
    mocked.getDeathCertificateClaimsForMember.mockResolvedValueOnce({ member_id: MEMBER_ID, claims: [missingClaim] });
    renderWithClient(<HelplineCertificateReplacement pariwarId="p1" memberId={MEMBER_ID} identityConfirmed={true} />);
    await waitFor(() => expect(screen.getByTestId('helpline-certificate-upload-input')).toBeInTheDocument());

    // The onSuccess invalidation refetches the list (D5 — "then refetch"); the JOB has not landed
    // yet, so the SAME status comes back — this is the case the "sent, being processed" state must
    // survive.
    mocked.getDeathCertificateClaimsForMember.mockResolvedValueOnce({ member_id: MEMBER_ID, claims: [missingClaim] });
    const file = new File(['%PDF-1.4'], 'cert.pdf', { type: 'application/pdf' });
    const input = screen.getByTestId('helpline-certificate-upload-input') as HTMLInputElement;
    await userEvent.upload(input, file);

    await waitFor(() => expect(screen.getByTestId('helpline-certificate-sent-processing')).toBeInTheDocument());
    expect(screen.queryByTestId('helpline-certificate-upload-input')).not.toBeInTheDocument();
    expect(mocked.uploadHelplineDeathCertificate).toHaveBeenCalledWith('p1', CLAIM_A, file);
  });

  it('a 409 RE-READS the list, so the D4 line never contradicts the refusal beside it (code review 2026-09-27)', async () => {
    mocked.getDeathCertificateClaimsForMember.mockResolvedValueOnce({ member_id: MEMBER_ID, claims: [claim({ status: 'missing', replacement_reason: null })] });
    // The family's own upload landed after the operator's read — the server now says awaiting_review.
    mocked.getDeathCertificateClaimsForMember.mockResolvedValueOnce({
      member_id: MEMBER_ID,
      claims: [claim({ status: 'awaiting_review', replacement_reason: null, upload_allowed: false, reassurance: null })],
    });
    mocked.uploadHelplineDeathCertificate.mockRejectedValueOnce(
      new ApiError(409, 'claim_document.certificate_awaiting_review', 'already waiting'),
    );
    renderWithClient(<HelplineCertificateReplacement pariwarId="p1" memberId={MEMBER_ID} identityConfirmed={true} />);
    await waitFor(() => expect(screen.getByTestId('helpline-certificate-upload-input')).toBeInTheDocument());

    const file = new File(['%PDF-1.4'], 'cert.pdf', { type: 'application/pdf' });
    await userEvent.upload(screen.getByTestId('helpline-certificate-upload-input'), file);

    await waitFor(() => expect(screen.getByTestId('helpline-certificate-upload-error')).toBeInTheDocument());
    const errorText = screen.getByTestId('helpline-certificate-upload-error').textContent ?? '';
    expect(errorText).not.toContain('claim_document');
    expect(errorText).toMatch(/already waiting to be reviewed/);
    // The re-read status line agrees with the refusal; the stale "send another" line and control are gone.
    await waitFor(() => expect(screen.getByText(/waiting for the District Admin's review/)).toBeInTheDocument());
    expect(screen.queryByText(/doesn't show a clear date of death|family needs to send/)).not.toBeInTheDocument();
    expect(screen.queryByTestId('helpline-certificate-upload-input')).not.toBeInTheDocument();
  });

  it.each([
    ['claim_document.certificate_accepted', 409, /already been accepted/],
    ['claim_document.certificate_awaiting_review', 409, /already waiting to be reviewed/],
    ['claim_document.upload_not_allowed', 409, /can't take a new certificate in its current state/],
    ['claim_document.too_large', 413, /^That file is too large or not a supported type\. Send a JPEG, PNG or PDF\.$/],
    ['claim_document.unsupported_media_type', 415, /^That file is too large or not a supported type\. Send a JPEG, PNG or PDF\.$/],
    ['http.413', 413, /^That file is too large or not a supported type\. Send a JPEG, PNG or PDF\.$/],
    ['http.415', 415, /^That file is too large or not a supported type\. Send a JPEG, PNG or PDF\.$/],
    ['something.else', 500, /couldn't be sent\. Please try again/],
  ])('refusal %s (%i) ⇒ its own line (`-249` §6 verbatim), never a raw code', async (code, status, line) => {
    const c = claim({ status: 'missing', replacement_reason: null });
    mocked.getDeathCertificateClaimsForMember.mockResolvedValueOnce({ member_id: MEMBER_ID, claims: [c] });
    mocked.getDeathCertificateClaimsForMember.mockResolvedValueOnce({ member_id: MEMBER_ID, claims: [c] });
    mocked.uploadHelplineDeathCertificate.mockRejectedValueOnce(new ApiError(status, code, 'refused'));
    renderWithClient(<HelplineCertificateReplacement pariwarId="p1" memberId={MEMBER_ID} identityConfirmed={true} />);
    await waitFor(() => expect(screen.getByTestId('helpline-certificate-upload-input')).toBeInTheDocument());
    await userEvent.upload(
      screen.getByTestId('helpline-certificate-upload-input'),
      new File(['%PDF-1.4'], 'cert.pdf', { type: 'application/pdf' }),
    );
    await waitFor(() => expect(screen.getByTestId('helpline-certificate-upload-error')).toBeInTheDocument());
    const text = screen.getByTestId('helpline-certificate-upload-error').textContent ?? '';
    expect(text).toMatch(line);
    expect(text).not.toContain(code);
  });

  async function sendOnce(): Promise<void> {
    await waitFor(() => expect(screen.getByTestId('helpline-certificate-upload-input')).toBeInTheDocument());
    await userEvent.upload(
      screen.getByTestId('helpline-certificate-upload-input'),
      new File(['%PDF-1.4'], 'cert.pdf', { type: 'application/pdf' }),
    );
  }

  it('"sent, being processed" REPLACES the D4 line while pending, and CLEARS by itself once the server status moves on (D5, BW-J5)', async () => {
    const requested = claim();
    const awaiting = claim({ status: 'awaiting_review', replacement_reason: null, upload_allowed: false, reassurance: null });
    mocked.getDeathCertificateClaimsForMember.mockResolvedValueOnce({ member_id: MEMBER_ID, claims: [requested] });
    // The settle re-read: the job has not landed yet — the SAME status.
    mocked.getDeathCertificateClaimsForMember.mockResolvedValueOnce({ member_id: MEMBER_ID, claims: [requested] });
    const client = createQueryClient();
    render(
      <QueryClientProvider client={client}>
        <HelplineCertificateReplacement pariwarId="p1" memberId={MEMBER_ID} identityConfirmed={true} />
      </QueryClientProvider>,
    );
    await sendOnce();
    await waitFor(() => expect(screen.getByTestId('helpline-certificate-sent-processing')).toBeInTheDocument());
    // `-249` §6 — the sent line REPLACES the stale "the family needs to send another" read-out.
    expect(screen.queryByText(/family needs to send another/)).not.toBeInTheDocument();

    // A later read (⛔ not Refresh) finds the job landed — the status moved on, so the pending line clears.
    mocked.getDeathCertificateClaimsForMember.mockResolvedValueOnce({ member_id: MEMBER_ID, claims: [awaiting] });
    await client.invalidateQueries();
    await waitFor(() => expect(screen.queryByTestId('helpline-certificate-sent-processing')).not.toBeInTheDocument());
    expect(screen.getByText(/waiting for the District Admin's review/)).toBeInTheDocument();
  });

  it('Refresh CLEARS the pending line even when the status came back UNCHANGED (round-2 decision (a)) — the control is never stuck hidden', async () => {
    const requested = claim();
    mocked.getDeathCertificateClaimsForMember.mockResolvedValueOnce({ member_id: MEMBER_ID, claims: [requested] });
    mocked.getDeathCertificateClaimsForMember.mockResolvedValueOnce({ member_id: MEMBER_ID, claims: [requested] });
    renderWithClient(<HelplineCertificateReplacement pariwarId="p1" memberId={MEMBER_ID} identityConfirmed={true} />);
    await sendOnce();
    await waitFor(() => expect(screen.getByTestId('helpline-certificate-sent-processing')).toBeInTheDocument());

    // Sent → job landed → rejected again, all between two reads: the status reads `replacement_requested`
    // once more, EQUAL to its value at the send.
    mocked.getDeathCertificateClaimsForMember.mockResolvedValueOnce({ member_id: MEMBER_ID, claims: [requested] });
    await userEvent.click(screen.getByTestId('helpline-certificate-refresh'));
    await waitFor(() => expect(screen.queryByTestId('helpline-certificate-sent-processing')).not.toBeInTheDocument());
    expect(screen.getByText(/family needs to send another/)).toBeInTheDocument();
    expect(screen.getByTestId('helpline-certificate-upload-input')).toBeInTheDocument();
  });
});
