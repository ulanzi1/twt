// `<HelplineClaimContact>` — Story 6.19a (AC1 / AC8a) container tests. The api client module is mocked (the
// `helpline-certificate-replacement.test.tsx` pattern); the real hooks + Query cache run via `renderWithClient`.

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ClaimContactPresenceResponse } from '@twt/contracts';

import * as api from '../src/api/client.js';
import { ApiError } from '../src/api/client.js';
import { HelplineClaimContact } from '../src/modules/helpline-claims/HelplineClaimContact.js';
import { renderWithClient } from './_helpers.js';

const MEMBER_ID = '11111111-1111-1111-1111-111111111111';
const CLAIM_A = '22222222-2222-2222-2222-222222222222';
const V1 = '44444444-4444-4444-4444-444444444444';

function presence(over: Partial<ClaimContactPresenceResponse> = {}): ClaimContactPresenceResponse {
  return {
    claimCaseId: CLAIM_A,
    recorded: false,
    determination: 'not_effective',
    writeMode: 'full',
    nominees: [{ rank: 1, nomineeVersionId: V1, addressPresent: false, relationshipPresent: false, row: 'none' }],
    claimantSide: 'none',
    claimantNomineeVersionId: null,
    claimantIsAnAllowedNominee: false,
    claimantBlockNeeded: false,
    agreement: 'none',
    contactLocale: null,
    missing: 'no_record',
    ...over,
  };
}

vi.mock('../src/api/client.js', async () => {
  const actual = await vi.importActual<typeof import('../src/api/client.js')>('../src/api/client.js');
  return {
    ...actual,
    getDeathCertificateClaimsForMember: vi.fn(),
    getClaimContactPresence: vi.fn(),
    getClaimContactDetails: vi.fn(),
    recordHelplineClaimContact: vi.fn(),
  };
});
const mocked = vi.mocked(api);

function renderCard(onStepUpRequired = vi.fn()) {
  renderWithClient(
    <HelplineClaimContact
      pariwarId="p1"
      memberId={MEMBER_ID}
      identityConfirmed
      onStepUpRequired={onStepUpRequired}
      stepUpRequired={false}
    />,
  );
  return onStepUpRequired;
}

describe('<HelplineClaimContact>', () => {
  beforeEach(() => {
    for (const fn of [
      mocked.getDeathCertificateClaimsForMember,
      mocked.getClaimContactPresence,
      mocked.getClaimContactDetails,
      mocked.recordHelplineClaimContact,
    ]) fn.mockReset();
    mocked.getDeathCertificateClaimsForMember.mockResolvedValue({
      member_id: MEMBER_ID,
      claims: [
        {
          claim_case_id: CLAIM_A,
          claim_state: 'verification_in_progress',
          created_at: '2026-09-01T00:00:00.000Z',
          status: 'awaiting_review',
          replacement_reason: null,
          upload_allowed: false,
          reassurance: null,
        },
      ],
    });
    mocked.getClaimContactPresence.mockResolvedValue(presence());
  });

  it('self-suppresses before the member is selected and the read-back confirmed — ⛔ no read fires', () => {
    renderWithClient(
      <HelplineClaimContact pariwarId="p1" memberId={null} identityConfirmed={false} onStepUpRequired={vi.fn()} stepUpRequired={false} />,
    );
    expect(screen.getByTestId('helpline-contact-need-member')).toBeInTheDocument();
    expect(mocked.getClaimContactPresence).not.toHaveBeenCalled();
  });

  it('⭐ shows what the approval still needs, and ⛔ never fetches the plaintext until asked', async () => {
    renderCard();
    expect(await screen.findByTestId('helpline-contact-missing')).toHaveTextContent(/has not yet given the nominees’ postal addresses/);
    expect(screen.getByTestId('helpline-contact-nominee-1')).toHaveTextContent('address missing');
    expect(mocked.getClaimContactDetails).not.toHaveBeenCalled();
  });

  it('⭐ the agreement is read aloud from the SAME copy the app shows — in Hindi and English', async () => {
    renderCard();
    const box = await screen.findByTestId('helpline-contact-agreement');
    expect(box).toHaveTextContent('मैं सहमति देता/देती हूँ कि ट्रस्ट इस दावे के बारे में');
    expect(box).toHaveTextContent('I agree that the Trust may contact the nominees and the claimant named here');
  });

  it('a first save sends the address BY VERSION ID, the claimant side and the agreement — then announces "saved"', async () => {
    mocked.recordHelplineClaimContact.mockResolvedValue({
      presence: presence({ recorded: true, missing: null, agreement: 'live', claimantSide: 'nominee' }),
      agreementRecorded: true,
      agreementIgnored: false,
    });
    renderCard();
    const user = userEvent.setup();
    await user.type(await screen.findByTestId('helpline-contact-address-1'), '12 Station Road, Kanpur');
    await user.click(screen.getByTestId('helpline-contact-claimant-nominee'));
    await user.selectOptions(screen.getByTestId('helpline-contact-claimant-version'), V1);
    await user.click(screen.getByTestId('helpline-contact-agreed'));
    await user.click(screen.getByTestId('helpline-contact-save'));
    await waitFor(() => expect(mocked.recordHelplineClaimContact).toHaveBeenCalledTimes(1));
    expect(mocked.recordHelplineClaimContact).toHaveBeenCalledWith('p1', CLAIM_A, {
      locale: 'hi',
      nominees: [{ nomineeVersionId: V1, address: '12 Station Road, Kanpur' }],
      claimantNomineeVersionId: V1,
      agreed: true,
    });
    expect(await screen.findByTestId('helpline-contact-saved')).toHaveAttribute('role', 'status');
  });

  it('⭐ a step-up 403 opens the page’s step-up panel and says so — ⛔ never a raw code', async () => {
    mocked.recordHelplineClaimContact.mockRejectedValue(new ApiError(403, 'auth.step_up_required', 'step up'));
    const onStepUp = renderCard();
    const user = userEvent.setup();
    await user.click(await screen.findByTestId('helpline-contact-agreed'));
    await user.click(screen.getByTestId('helpline-contact-save'));
    await waitFor(() => expect(onStepUp).toHaveBeenCalled());
    expect(await screen.findByTestId('helpline-contact-error')).toHaveTextContent(/step-up/);
  });

  it('⭐ an add-only refusal is its own line (the claim was verified; only missing details can be added)', async () => {
    mocked.getClaimContactPresence.mockResolvedValue(presence({ writeMode: 'add_only', recorded: true }));
    mocked.recordHelplineClaimContact.mockRejectedValue(new ApiError(409, 'claim_contact.add_only', 'x'));
    renderCard();
    const user = userEvent.setup();
    expect(await screen.findByTestId('helpline-contact-mode')).toHaveTextContent(/only add what is missing/);
    await user.type(screen.getByTestId('helpline-contact-address-1'), 'Another address');
    await user.click(screen.getByTestId('helpline-contact-save'));
    expect(await screen.findByTestId('helpline-contact-error')).toHaveTextContent(/cannot be changed here/);
  });

  it('an incomplete claimant block is refused locally — ⛔ no request', async () => {
    renderCard();
    const user = userEvent.setup();
    await user.click(await screen.findByTestId('helpline-contact-claimant-someone_else'));
    await user.type(screen.getByTestId('helpline-contact-claimant-name'), 'सुनीता देवी');
    await user.click(screen.getByTestId('helpline-contact-save'));
    expect(await screen.findByTestId('helpline-contact-local-error')).toHaveAttribute('role', 'alert');
    expect(mocked.recordHelplineClaimContact).not.toHaveBeenCalled();
  });

  it('the plaintext read-back fires ONLY on request', async () => {
    mocked.getClaimContactPresence.mockResolvedValue(presence({ recorded: true }));
    mocked.getClaimContactDetails.mockResolvedValue({
      claimCaseId: CLAIM_A,
      nominees: [{ rank: 1, nomineeVersionId: V1, row: 'own', address: '12 Station Road', relationship: null }],
      claimantNomineeVersionId: V1,
      claimant: null,
    });
    renderCard();
    const user = userEvent.setup();
    await user.click(await screen.findByTestId('helpline-contact-show-details'));
    expect(await screen.findByTestId('helpline-contact-details')).toHaveTextContent('12 Station Road');
    expect(mocked.getClaimContactDetails).toHaveBeenCalledTimes(1);
  });
});
