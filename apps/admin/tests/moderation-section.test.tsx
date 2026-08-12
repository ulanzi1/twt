// `<ModerationSection>` container tests — Story 10.10 code-review follow-up.
//
// Edge Case Hunter finding: an OTP-SEND failure (the `requestStepUp` mutation itself failing —
// e.g. the SMS gateway is down) was invisible. The operator saw the code-entry input with no code
// ever sent and no explanation, because `stepUpSlot` rendered only `verifyStepUp.isError`, never
// `requestStepUp.isError` — unlike the Story 6.3 `HelplineClaimPage` precedent this component
// claims to follow. This pins the fix: a failed `requestStepUp` now renders its own error text.
//
// The api client module is mocked (mirrors helpline-claim-page.test.tsx); the real hooks + Query
// cache are exercised via `renderWithClient`.

import type { ModerationHistoryResponse, ReasonCodesListResponse } from '@twt/contracts';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import * as api from '../src/api/client.js';
import { ModerationSection } from '../src/modules/member-status/ModerationSection.js';
import { renderWithClient } from './_helpers.js';

const PARIWAR_ID = '11111111-1111-1111-1111-111111111111';
const MEMBER_ID = '22222222-2222-2222-2222-222222222222';

function history(over: Partial<ModerationHistoryResponse> = {}): ModerationHistoryResponse {
  return {
    member_id: MEMBER_ID,
    current_status: 'none',
    current_reason_code: null,
    since: null,
    legal_actions: ['suspend'],
    // Story 10.20 (AC8) — ADDITIVE alongside `legal_actions`, never a filter on it.
    termination_available_at: null,
    entries: [],
    has_more: false,
    ...over,
  };
}

/** A minimal fixture of the reason-codes registry read — just enough for this test's flow. */
function reasonCodes(): ReasonCodesListResponse {
  return {
    items: [
      { code: 'r14-forgery', applies_to: ['suspend', 'terminate'], niyamavali_ref: 'R14', label: 'Forgery or falsified documents (R14)' , ordinarily_results_in: 'suspend' },
    ],
  };
}

vi.mock('../src/api/client.js', async () => {
  const actual = await vi.importActual<typeof import('../src/api/client.js')>('../src/api/client.js');
  return {
    ...actual,
    getModerationHistory: vi.fn(async () => history()),
    getModerationReasonCodes: vi.fn(async () => reasonCodes()),
    moderateMember: vi.fn(async () => {
      throw new actual.ApiError(403, 'auth.step_up_required', 'Elevation required.');
    }),
    requestStepUp: vi.fn(async () => {
      throw new actual.ApiError(502, 'sms.gateway_unavailable', 'The SMS gateway is unavailable.');
    }),
    verifyStepUp: vi.fn(async () => ({ ok: true })),
  };
});

describe('<ModerationSection> — OTP-send failure surfaces its own error (review fix)', () => {
  it('a failed requestStepUp renders an error, distinct from the (never-attempted) verify error', async () => {
    const user = userEvent.setup();
    renderWithClient(<ModerationSection pariwarId={PARIWAR_ID} memberId={MEMBER_ID} />);

    await waitFor(() => expect(screen.getByTestId('moderation-strip')).toBeInTheDocument());

    await user.click(screen.getByTestId('moderation-action-suspend'));
    await waitFor(() =>
      expect(screen.getByTestId('moderation-reason-code')).toHaveTextContent('Forgery or falsified documents'),
    );
    await user.selectOptions(screen.getByTestId('moderation-reason-code'), 'r14-forgery');
    await user.type(screen.getByTestId('moderation-rationale'), 'A rationale long enough to submit.');
    await user.click(screen.getByTestId('moderation-submit'));
    await user.click(screen.getByTestId('moderation-confirm-submit'));

    // The 403 step-up-required signal opens the OTP panel, which itself immediately requests a
    // code — and that request is the one mocked to fail.
    await waitFor(() => expect(screen.getByTestId('moderation-step-up')).toBeInTheDocument());
    await waitFor(() =>
      expect(screen.getByTestId('moderation-otp-request-error')).toHaveTextContent(
        'The SMS gateway is unavailable.',
      ),
    );

    // The operator was never given a code to verify, so `verifyStepUp` was never called and its
    // (separate) error slot must not be showing.
    expect(api.verifyStepUp).not.toHaveBeenCalled();
    expect(screen.queryByText('Elevation required.')).not.toBeInTheDocument();
  });
});
