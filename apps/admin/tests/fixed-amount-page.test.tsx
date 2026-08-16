// FixedAmountPage component/interaction tests — Story 10.13, Task 7 (AC5).
//
// ⚠ THE MODULE'S FIRST UI TESTS. `pool-fixed-amount` shipped with Story 7.5 and was, uniquely among
// the admin modules its siblings shipped, entirely untested at the component layer. These cover the
// four things Story 10.13 either introduces or must not break:
//   · the eligible-attestor PICKER renders by DISPLAY NAME and submits ACTOR IDS (AC2);
//   · the SCHEDULED region appears when `upcoming` is present and is absent when it is null (AC4);
//   · the picker's authorization / emptiness states are DISTINCT and legible, never a generic failure;
//   · the step-up 403 -> elevate -> re-submit loop still works — regression protection for the one
//     interaction most likely to break when the panel input changed shape (AC5).
//
// The api-client module is mocked so the real hooks, real query cache and real component run.

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PoolFixedAmountView } from '@twt/contracts';
import { FixedAmountPage } from '../src/modules/pool-fixed-amount/FixedAmountPage.js';
import { renderWithClient } from './_helpers.js';

const PARIWAR = '11111111-1111-1111-1111-111111111111';
const ALICE = '22222222-2222-4222-8222-222222222222';
const BHARAT = '33333333-3333-4333-8333-333333333333';

const BASE_VIEW: PoolFixedAmountView = {
  pariwar_id: PARIWAR,
  effective_amount: 310,
  effective_version: 3,
  upcoming: null,
  schedule: [],
  schedule_has_more: false,
};

const VIEW_WITH_UPCOMING: PoolFixedAmountView = {
  ...BASE_VIEW,
  upcoming: {
    version: 4,
    fixed_amount: 400,
    effective_from: '2027-08-16T00:00:00.000Z',
    change_type: 'standard',
  },
};

/** The success-path response shape the page's confirmation line reads. */
const EMERGENCY_RESULT = {
  entry: {
    version: 5,
    fixed_amount: 350,
    effective_from: '2026-08-16T00:00:00.000Z',
    effective_until: null,
    change_type: 'emergency' as const,
    created_by_actor: ALICE,
    created_at: '2026-08-16T00:00:00.000Z',
    emergency_record: null,
  },
};

const ATTESTORS = {
  pariwar_id: PARIWAR,
  attestors: [
    { actor_id: ALICE, display_name: 'Alice Trustee' },
    { actor_id: BHARAT, display_name: 'Bharat Trustee' },
  ],
};

// ⚠ Hoisted alongside the mocks: `vi.mock`'s factory is lifted to the top of the module, so an
// ApiError declared normally would not exist yet when the factory runs. The page compares against the
// class IDENTITY (`err instanceof ApiError`), so the test and the mocked module must share ONE class —
// defining a second copy inside the factory would make every `instanceof` in the page silently false.
const { ApiError, mocks } = vi.hoisted(() => {
  class ApiError extends Error {
    public constructor(
      public readonly status: number,
      public readonly code: string,
      message: string,
    ) {
      super(message);
      this.name = 'ApiError';
    }
    public get isUnauthorized(): boolean {
      return this.status === 401;
    }
    public get isForbidden(): boolean {
      return this.status === 403;
    }
  }
  return {
    ApiError,
    mocks: {
      getFixedAmountView: vi.fn(),
      getFixedAmountEligibleAttestors: vi.fn(),
      scheduleFixedAmountChange: vi.fn(),
      applyFixedAmountEmergency: vi.fn(),
      requestStepUp: vi.fn(),
      verifyStepUp: vi.fn(),
    },
  };
});

vi.mock('../src/api/client.js', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('../src/api/client.js');
  return { ...actual, ...mocks, ApiError };
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getFixedAmountView.mockResolvedValue(BASE_VIEW);
  mocks.getFixedAmountEligibleAttestors.mockResolvedValue(ATTESTORS);
  mocks.requestStepUp.mockResolvedValue({ sent: true });
  mocks.verifyStepUp.mockResolvedValue({ verified: true });
  mocks.applyFixedAmountEmergency.mockResolvedValue(EMERGENCY_RESULT);
});

/** Fill the emergency form's non-panel fields, leaving the panel selection to the test. */
async function fillEmergencyBasics(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  const amounts = await screen.findAllByText('New amount (₹, whole rupees)');
  // The SECOND amount field belongs to the emergency form (the first is the standard change).
  await user.type(amounts[1]!.parentElement!.querySelector('input')!, '350');
  await user.type(screen.getByLabelText(/Documented reason/i), 'Reserve adequacy review');
}

describe('FixedAmountPage — the Scheduled region (AC4)', () => {
  it('renders the SCHEDULED amount and date as its own region when a future change exists', async () => {
    mocks.getFixedAmountView.mockResolvedValue(VIEW_WITH_UPCOMING);
    renderWithClient(<FixedAmountPage pariwarId={PARIWAR} />);

    const scheduled = await screen.findByRole('region', { name: 'Scheduled change' });
    expect(scheduled).toHaveTextContent('₹400');
    expect(scheduled).toHaveTextContent('schedule version 4');
    // ⚠ It must be DISTINCT from "Effective now" — showing the future amount as the current one is
    // exactly the confusion this region exists to prevent.
    const effective = screen.getByRole('region', { name: 'Current effective amount' });
    expect(effective).toHaveTextContent('₹310');
    expect(effective).not.toHaveTextContent('₹400');
  });

  it('says plainly that nothing is scheduled when `upcoming` is null', async () => {
    renderWithClient(<FixedAmountPage pariwarId={PARIWAR} />);
    const scheduled = await screen.findByRole('region', { name: 'Scheduled change' });
    expect(scheduled).toHaveTextContent(/No change is scheduled/i);
    expect(scheduled).not.toHaveTextContent('₹');
  });
});

describe('FixedAmountPage — the attesting-panel picker (AC2)', () => {
  it('renders eligible attestors by DISPLAY NAME, not by actor id', async () => {
    renderWithClient(<FixedAmountPage pariwarId={PARIWAR} />);
    expect(await screen.findByLabelText('Alice Trustee')).toBeInTheDocument();
    expect(screen.getByLabelText('Bharat Trustee')).toBeInTheDocument();
    // The raw UUID must not be the thing a trustee is asked to read — that was the old surface's defect.
    expect(screen.queryByText(ALICE)).not.toBeInTheDocument();
  });

  it('submits ACTOR IDS for the checked attestors', async () => {
    const user = userEvent.setup();
    renderWithClient(<FixedAmountPage pariwarId={PARIWAR} />);

    await user.click(await screen.findByLabelText('Alice Trustee'));
    await user.click(screen.getByLabelText('Bharat Trustee'));
    await fillEmergencyBasics(user);
    await user.click(screen.getByRole('button', { name: /Apply emergency override/i }));

    await waitFor(() => expect(mocks.applyFixedAmountEmergency).toHaveBeenCalledTimes(1));
    expect(mocks.applyFixedAmountEmergency.mock.calls[0]![1]).toMatchObject({
      panel_actor_ids: [ALICE, BHARAT].sort(),
      documented_reason: 'Reserve adequacy review',
    });
  });

  it('does NOT submit with a single selected attestor (a lone actor is not a panel)', async () => {
    const user = userEvent.setup();
    renderWithClient(<FixedAmountPage pariwarId={PARIWAR} />);

    await user.click(await screen.findByLabelText('Alice Trustee'));
    await fillEmergencyBasics(user);
    await user.click(screen.getByRole('button', { name: /Apply emergency override/i }));

    // The client guard is the FAST PATH, not the gate — the server rejects this too.
    expect(mocks.applyFixedAmountEmergency).not.toHaveBeenCalled();
  });

  it('un-checking removes the attestor from the submitted roster', async () => {
    const user = userEvent.setup();
    renderWithClient(<FixedAmountPage pariwarId={PARIWAR} />);

    const alice = await screen.findByLabelText('Alice Trustee');
    await user.click(alice);
    await user.click(screen.getByLabelText('Bharat Trustee'));
    await user.click(alice); // toggle Alice back off
    await fillEmergencyBasics(user);
    await user.click(screen.getByRole('button', { name: /Apply emergency override/i }));

    // One remaining selection is below the floor, so nothing is submitted at all.
    expect(mocks.applyFixedAmountEmergency).not.toHaveBeenCalled();
  });

  it('explains a 403 as an authorization fact, NOT as a load failure', async () => {
    // You hold pool.fixed_amount_set but not …_emergency. That is settled, not transient, and the
    // trustee must be told which — a generic "could not load" reads as an outage and invites a retry
    // that can never succeed.
    mocks.getFixedAmountEligibleAttestors.mockRejectedValue(
      new ApiError(403, 'auth.forbidden', 'Forbidden'),
    );
    renderWithClient(<FixedAmountPage pariwarId={PARIWAR} />);
    expect(await screen.findByText(/do not hold the emergency permission/i)).toBeInTheDocument();
    expect(screen.queryByText(/Could not load the eligible attestors/i)).not.toBeInTheDocument();
  });

  it('distinguishes a genuine load failure from the 403', async () => {
    mocks.getFixedAmountEligibleAttestors.mockRejectedValue(
      new ApiError(500, 'server.error', 'Boom'),
    );
    renderWithClient(<FixedAmountPage pariwarId={PARIWAR} />);
    expect(await screen.findByText(/Could not load the eligible attestors/i)).toBeInTheDocument();
  });

  it('says a Pariwar with NO eligible attestors cannot run an emergency override', async () => {
    mocks.getFixedAmountEligibleAttestors.mockResolvedValue({ pariwar_id: PARIWAR, attestors: [] });
    renderWithClient(<FixedAmountPage pariwarId={PARIWAR} />);
    expect(await screen.findByText(/No eligible attestors in this Pariwar/i)).toBeInTheDocument();
  });

  it('says a Pariwar with ONE eligible attestor cannot form a panel', async () => {
    // The sharpest consequence of ruling Q2 option (a): eligibility can leave a Pariwar unable to use
    // the emergency path at all. The surface must SAY that, not present a picker that silently
    // cannot be satisfied.
    mocks.getFixedAmountEligibleAttestors.mockResolvedValue({
      pariwar_id: PARIWAR,
      attestors: [{ actor_id: ALICE, display_name: 'Alice Trustee' }],
    });
    renderWithClient(<FixedAmountPage pariwarId={PARIWAR} />);
    expect(await screen.findByText(/Only one eligible attestor/i)).toBeInTheDocument();
  });
});

describe('FixedAmountPage — the step-up loop still works (AC5 regression)', () => {
  it('403 auth.step_up_required -> elevate -> re-submits with the SAME panel selection', async () => {
    // ⚠ THE REGRESSION THIS TEST EXISTS FOR. The re-submit path re-reads the panel state after
    // verification, so changing that state from a string to a Set could have silently broken
    // elevation — the one interaction a trustee hits precisely when an emergency is under way.
    const user = userEvent.setup();
    mocks.applyFixedAmountEmergency
      .mockRejectedValueOnce(new ApiError(403, 'auth.step_up_required', 'Step-up required'))
      .mockResolvedValueOnce(EMERGENCY_RESULT);

    renderWithClient(<FixedAmountPage pariwarId={PARIWAR} />);
    await user.click(await screen.findByLabelText('Alice Trustee'));
    await user.click(screen.getByLabelText('Bharat Trustee'));
    await fillEmergencyBasics(user);
    await user.click(screen.getByRole('button', { name: /Apply emergency override/i }));

    // The 403 is a SIGNAL to elevate, not a hard error.
    expect(await screen.findByText(/requires step-up verification/i)).toBeInTheDocument();

    // The elevation flow is three steps, and all three must survive the panel-input change.
    await user.click(screen.getByRole('button', { name: /Send verification code/i }));
    await user.type(await screen.findByLabelText(/Enter code/i), '123456');
    await user.click(screen.getByRole('button', { name: /Verify & apply/i }));

    await waitFor(() => expect(mocks.applyFixedAmountEmergency).toHaveBeenCalledTimes(2));
    expect(mocks.applyFixedAmountEmergency.mock.calls[1]![1]).toMatchObject({
      panel_actor_ids: [ALICE, BHARAT].sort(),
    });
  });
});
