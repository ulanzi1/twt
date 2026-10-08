// Story 6.24a (`2026-10-07-292` RF14 (b); AR-61) — the helpline APPEAL card and the appeal controls' 90-day date.
// The api client module is mocked (the `helpline-certificate-replacement.test.tsx` pattern); the real hooks run.

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { HelplineAppealClaimsResponse } from '@twt/contracts';
import { t } from '@twt/i18n';

import * as api from '../src/api/client.js';
import { ApiError } from '../src/api/client.js';
import { AppealStageControls } from '../src/modules/claim-appeal/index.js';
import { HelplineAppeal } from '../src/modules/helpline-claims/HelplineAppeal.js';
import { resolveEn } from '../src/modules/helpline-claims/i18n-en.js';
import { renderWithClient } from './_helpers.js';

const MEMBER_ID = '11111111-1111-1111-1111-111111111111';
const CAN = '22222222-2222-4222-8222-222222222222';
const ENDED = '33333333-3333-4333-8333-333333333333';
const OTHER = '44444444-4444-4444-8444-444444444444';

vi.mock('../src/api/client.js', async () => {
  const actual = await vi.importActual<typeof import('../src/api/client.js')>('../src/api/client.js');
  return {
    ...actual,
    getHelplineAppealClaims: vi.fn(),
    initiateAppealOnBehalf: vi.fn(),
  };
});
const mocked = vi.mocked(api);

function row(id: string, over: Partial<HelplineAppealClaimsResponse['claims'][number]> = {}): HelplineAppealClaimsResponse['claims'][number] {
  return { claim_case_id: id, claim_state: 'denied', created_at: '2026-09-01T00:00:00.000Z', eligibility: 'can_appeal', appeal_until: null, ...over };
}

describe('<HelplineAppeal>', () => {
  beforeEach(() => {
    mocked.getHelplineAppealClaims.mockReset();
    mocked.initiateAppealOnBehalf.mockReset();
  });

  it('self-suppresses before the member is selected + read-back confirmed (⛔ no read)', () => {
    renderWithClient(<HelplineAppeal pariwarId="p1" memberId={null} identityConfirmed={false} />);
    expect(screen.getByTestId('helpline-appeal-need-member')).toBeInTheDocument();
    expect(mocked.getHelplineAppealClaims).not.toHaveBeenCalled();
  });

  it('⭐ a `-239` refusal shows its date in the words read to the family — English AND Hindi (the real `t()`)', async () => {
    mocked.getHelplineAppealClaims.mockResolvedValue({
      member_id: MEMBER_ID,
      claims: [
        row(CAN, { appeal_until: '2026-12-30' }),
        row(ENDED, { eligibility: 'time_limit_passed', appeal_until: '2026-09-01' }),
        row(OTHER),
      ],
    });
    renderWithClient(<HelplineAppeal pariwarId="p1" memberId={MEMBER_ID} identityConfirmed={true} />);
    await waitFor(() => expect(screen.getByTestId(`helpline-appeal-claim-${CAN}`)).toBeInTheDocument());
    const can = screen.getByTestId(`helpline-appeal-readback-${CAN}`);
    expect(can).toHaveTextContent('Can be appealed until 2026-12-30.');
    expect(can).toHaveTextContent(t('appeal_helpline.until', { date: '2026-12-30' }, { locale: 'hi', namespace: 'claim' }));
    const ended = screen.getByTestId(`helpline-appeal-readback-${ENDED}`);
    expect(ended).toHaveTextContent('The time to appeal ended on 2026-09-01.');
    expect(ended).toHaveTextContent(t('appeal_helpline.ended', { date: '2026-09-01' }, { locale: 'hi', namespace: 'claim' }));
    // Another reason ⇒ ⛔ no date (⛔ no time limit); the ended one offers ⛔ no filing.
    expect(screen.queryByTestId(`helpline-appeal-readback-${OTHER}`)).not.toBeInTheDocument();
    expect(screen.queryByTestId(`helpline-appeal-file-${ENDED}`)).not.toBeInTheDocument();
    expect(screen.getByTestId(`helpline-appeal-file-${OTHER}`)).toBeInTheDocument();
  });

  it('files an appeal FOR THE FAMILY through the on-behalf route; the time-limit refusal reads in words (⛔ not a raw code)', async () => {
    mocked.getHelplineAppealClaims.mockResolvedValue({ member_id: MEMBER_ID, claims: [row(CAN, { appeal_until: '2026-12-30' })] });
    mocked.initiateAppealOnBehalf.mockResolvedValueOnce({
      appeal_id: '55555555-5555-4555-8555-555555555555', claim_case_id: CAN, current_stage: '1', status: 'open', initiated_on_behalf: true, claim_state: 'appeal_stage_1',
    });
    renderWithClient(<HelplineAppeal pariwarId="p1" memberId={MEMBER_ID} identityConfirmed={true} />);
    fireEvent.click(await screen.findByTestId(`helpline-appeal-file-${CAN}`));
    await waitFor(() => expect(mocked.initiateAppealOnBehalf).toHaveBeenCalledWith('p1', CAN));
    expect(await screen.findByTestId('helpline-appeal-filed')).toHaveTextContent(resolveEn('helpline.appeal.filed'));

    mocked.initiateAppealOnBehalf.mockRejectedValueOnce(new ApiError(409, 'appeal.suspicion_refusal_time_limit_passed', 'x', { appeal_until: '2026-12-30' }));
    fireEvent.click(await screen.findByTestId(`helpline-appeal-file-${CAN}`));
    const refused = await screen.findByTestId('helpline-appeal-refused');
    expect(refused).toHaveTextContent(resolveEn('helpline.appeal.refusal.time_limit_passed'));
    expect(refused.textContent).not.toContain('appeal.');
  });
});

describe('<AppealStageControls> — Story 6.24a, the 90-day date on a `-239` refusal', () => {
  const base = { journey: null, session: null, tally: null, sla: null } as const;
  it('shows "until" while the limit runs and "ended on" once it passed; ⛔ nothing for another reason (null)', () => {
    const { rerender } = render(<AppealStageControls claimState="denied" {...base} suspicionAppealLimit={{ appeal_until: '2026-12-30', passed: false }} />);
    expect(screen.getByTestId('suspicion-appeal-limit')).toHaveTextContent('Can be appealed until 2026-12-30.');
    rerender(<AppealStageControls claimState="denied" {...base} suspicionAppealLimit={{ appeal_until: '2026-09-01', passed: true }} />);
    expect(screen.getByTestId('suspicion-appeal-limit')).toHaveTextContent('The time to appeal ended on 2026-09-01.');
    rerender(<AppealStageControls claimState="denied" {...base} suspicionAppealLimit={null} />);
    expect(screen.queryByTestId('suspicion-appeal-limit')).not.toBeInTheDocument();
  });
});
