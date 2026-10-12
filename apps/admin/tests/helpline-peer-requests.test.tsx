// `<HelplinePeerRequests>` — Story 6.27a (PM12, PM25 (b); AC6's console half). The api client is mocked (the
// `helpline-certificate-replacement.test.tsx` pattern); the real hooks + Query cache are exercised.
//   · nothing before the caller is selected AND read back; nothing at all when the server lists ⛔ request (DARK until
//     6.27c texts anyone);
//   · the served questions in English, ONLY the shown ones (the date after "died"), the caller's own answers selected;
//   · a tap records ONE answer for THAT ping; Submit needs `has_died`; a step-up 403 opens the page's panel.

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PeerRequestDetailResponse } from '@twt/contracts';

import * as api from '../src/api/client.js';
import { ApiError } from '../src/api/client.js';
import { HelplinePeerRequests } from '../src/modules/helpline-claims/HelplinePeerRequests.js';
import { renderWithClient } from './_helpers.js';

const MEMBER = '11111111-1111-4111-8111-111111111111';
const PING = '22222222-2222-4222-8222-222222222222';
const w = (en: string) => ({ en, hi: `hi:${en}` });

function item(answers: PeerRequestDetailResponse['answers'] = []): PeerRequestDetailResponse {
  return {
    pingId: PING,
    memberName: 'Ram K.',
    questionnaire: {
      versionId: 'peer_mesh.v2',
      pages: [
        {
          questions: [
            {
              key: 'has_died',
              kind: 'single',
              words: w('Has Ram K. died?'),
              options: [
                { code: 'died', words: w('Yes, they have died'), exclusive: false },
                { code: 'not_died', words: w('No, they have not died'), exclusive: false },
              ],
              optional: false,
              showIf: null,
            },
            {
              key: 'death_date',
              kind: 'date',
              words: w('If you know, on what date did they die?'),
              options: [{ code: 'unknown', words: w("I don't know the date"), exclusive: false }],
              optional: true,
              showIf: { key: 'has_died', anyOf: ['died'] },
            },
          ],
        },
      ],
      closingNote: w('Your answers are saved as you go.'),
      thankYou: w('Thank you.'),
    },
    answers,
    submitted: false,
  };
}

vi.mock('../src/api/client.js', async () => {
  const actual = await vi.importActual<typeof import('../src/api/client.js')>('../src/api/client.js');
  return {
    ...actual,
    getHelplinePeerRequests: vi.fn(async () => ({ items: [] })),
    saveHelplinePeerAnswer: vi.fn(async () => ({ answers: [] })),
    submitHelplinePeerReply: vi.fn(async () => ({ submitted: true as const })),
  };
});
const mocked = vi.mocked(api);

describe('<HelplinePeerRequests>', () => {
  beforeEach(() => {
    mocked.getHelplinePeerRequests.mockReset();
    mocked.getHelplinePeerRequests.mockResolvedValue({ items: [] });
    mocked.saveHelplinePeerAnswer.mockReset();
    mocked.saveHelplinePeerAnswer.mockResolvedValue({ answers: [] });
    mocked.submitHelplinePeerReply.mockReset();
    mocked.submitHelplinePeerReply.mockResolvedValue({ submitted: true });
  });

  it('nothing before the caller is selected and read back — and ⛔ call', () => {
    const { container } = renderWithClient(<HelplinePeerRequests pariwarId="p1" memberId={MEMBER} identityConfirmed={false} onStepUpRequired={() => {}} />);
    expect(container).toBeEmptyDOMElement();
    expect(mocked.getHelplinePeerRequests).not.toHaveBeenCalled();
  });

  it('nothing at all when the server lists ⛔ request (DARK until 6.27c texts anyone)', async () => {
    const { container } = renderWithClient(<HelplinePeerRequests pariwarId="p1" memberId={MEMBER} identityConfirmed onStepUpRequired={() => {}} />);
    await waitFor(() => expect(mocked.getHelplinePeerRequests).toHaveBeenCalledWith('p1', MEMBER));
    expect(container).toBeEmptyDOMElement();
  });

  it('the served questions in English; the date only after "died"; a tap records ONE answer for THAT ping', async () => {
    mocked.getHelplinePeerRequests.mockResolvedValue({ items: [item()] });
    renderWithClient(<HelplinePeerRequests pariwarId="p1" memberId={MEMBER} identityConfirmed onStepUpRequired={() => {}} />);
    expect(await screen.findByText('Has Ram K. died?')).toBeInTheDocument();
    expect(screen.queryByText('If you know, on what date did they die?')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Yes, they have died' }));
    await waitFor(() => expect(mocked.saveHelplinePeerAnswer).toHaveBeenCalledWith('p1', PING, 'has_died', { codes: ['died'] }));
  });

  it("the caller's own answers are selected; the date shows; Submit sends THAT ping", async () => {
    mocked.getHelplinePeerRequests.mockResolvedValue({ items: [item([{ questionKey: 'has_died', value: { codes: ['died'] }, savedAt: 'x' }])] });
    renderWithClient(<HelplinePeerRequests pariwarId="p1" memberId={MEMBER} identityConfirmed onStepUpRequired={() => {}} />);
    expect(await screen.findByText('If you know, on what date did they die?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Yes, they have died' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
    await waitFor(() => expect(mocked.submitHelplinePeerReply).toHaveBeenCalledWith('p1', PING));
  });

  it('a step-up 403 opens the page\'s step-up panel', async () => {
    mocked.getHelplinePeerRequests.mockRejectedValue(new ApiError(403, 'auth.step_up_required', 'step up'));
    const onStepUp = vi.fn();
    renderWithClient(<HelplinePeerRequests pariwarId="p1" memberId={MEMBER} identityConfirmed onStepUpRequired={onStepUp} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Confirm with a code' }));
    expect(onStepUp).toHaveBeenCalled();
  });
});
