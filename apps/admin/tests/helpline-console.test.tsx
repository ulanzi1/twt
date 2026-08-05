// Helpline operator-console component tests — Story 6.3 (Task 7; AC1/AC2/AC4/AC5).
//
// Pure render tests (no router/query context — the shell + cards + gate take everything as
// props). Focus areas:
//   · the intake gate: submit is enabled ONLY once identity read-back is confirmed; a nominee
//     read-back left un-confirmed does NOT block submit (AC2);
//   · the shell always renders the AR-61 escalation affordance + the non-functional
//     "convert to handover" seam (AC5 / Decision #4);
//   · <ReadBackCard> confirm + correction-log behaviour;
//   · the route gate redirects an unauthenticated session (mirrors gate.test.tsx).

import type { MemberSearchResultItem } from '@twt/contracts';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { HelplineConsoleShell, type HelplineConsoleShellProps } from '../src/modules/helpline-claims/HelplineConsoleShell.js';
import { ReadBackCard } from '../src/modules/helpline-claims/ReadBackCard.js';
import { HelplineClaimGateView } from '../src/routes/HelplineClaimRoute.js';

const MEMBER: MemberSearchResultItem = {
  memberId: '11111111-1111-1111-1111-111111111111',
  state: 'active',
  name: 'Asha Devi',
  maskedMobile: '+91·····4210',
  aadhaarMasked: 'XXXX1234',
  verificationStrength: 'aadhaar_kyc',
  nomineeSummary: [],
  contributionSection: { status: 'producer_unavailable', producer: 'story-10-24' },
  claimSection: { status: 'producer_unavailable', producer: 'epic-6' },
};

const SCRIPT = { en: 'confirm en', hi: 'confirm hi', titleEn: 'Read-back' };

/** A stateful harness so the identity/nominee checkboxes actually toggle (the shell is controlled). */
function ShellHarness(over: Partial<HelplineConsoleShellProps> = {}): ReactElement {
  const [identityConfirmed, setIdentityConfirmed] = useState(over.identityConfirmed ?? false);
  const [nomineeConfirmed, setNomineeConfirmed] = useState(over.nomineeConfirmed ?? false);
  return (
    <HelplineConsoleShell
      lookupSlot={<div data-testid="lookup-slot" />}
      selected={MEMBER}
      identityScript={SCRIPT}
      nomineeScript={SCRIPT}
      identityConfirmed={identityConfirmed}
      onIdentityConfirmedChange={setIdentityConfirmed}
      nomineeConfirmed={nomineeConfirmed}
      onNomineeConfirmedChange={setNomineeConfirmed}
      identityCorrections={[]}
      onAddIdentityCorrection={() => {}}
      nomineeCorrections={[]}
      onAddNomineeCorrection={() => {}}
      relationship="spouse"
      onRelationshipChange={() => {}}
      onSubmit={() => {}}
      submitPending={false}
      result={null}
      stepUpRequired={false}
      stepUpSlot={<div data-testid="stepup-slot" />}
      escalated={false}
      onEscalate={() => {}}
      {...over}
    />
  );
}

describe('<HelplineConsoleShell> — the intake gate (AC2)', () => {
  it('disables submit until the IDENTITY read-back is confirmed', () => {
    render(<ShellHarness />);
    const submit = screen.getByTestId('helpline-submit-intake');
    expect(submit).toBeDisabled();
    expect(screen.getByTestId('helpline-gate-hint')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('readback-confirm-identity'));
    expect(screen.getByTestId('helpline-submit-intake')).toBeEnabled();
  });

  it('a NOMINEE read-back left un-confirmed does NOT block submit (nominee is advisory)', () => {
    render(<ShellHarness />);
    // Confirm identity only; leave the nominee card un-confirmed.
    fireEvent.click(screen.getByTestId('readback-confirm-identity'));
    expect(screen.getByTestId('readback-confirm-nominee')).not.toBeChecked();
    expect(screen.getByTestId('helpline-submit-intake')).toBeEnabled();
  });

  it('calls onSubmit when the (identity-confirmed) submit is clicked', () => {
    const onSubmit = vi.fn();
    render(<ShellHarness identityConfirmed onSubmit={onSubmit} />);
    fireEvent.click(screen.getByTestId('helpline-submit-intake'));
    expect(onSubmit).toHaveBeenCalledOnce();
  });
});

describe('<HelplineConsoleShell> — AR-61 escalation + the flagged handover seam (AC5 / Decision #4)', () => {
  it('always renders the escalation affordance and the NON-FUNCTIONAL handover seam', () => {
    render(<ShellHarness />);
    expect(screen.getByTestId('helpline-escalate')).toBeInTheDocument();
    const seam = screen.getByTestId('helpline-handover-seam');
    expect(seam).toBeInTheDocument();
    expect(seam).toBeDisabled(); // flagged / coming-soon, never a live deep-link
    expect(screen.getByTestId('helpline-handover-note')).toHaveTextContent(/coming soon/i);
  });

  it('surfaces the held-for-supervisor note once escalated', () => {
    render(<ShellHarness escalated />);
    expect(screen.getByTestId('helpline-escalated-note')).toBeInTheDocument();
  });

  it('shows the created result + route-for-verification, hiding submit, once filed', () => {
    render(
      <ShellHarness
        identityConfirmed
        result={{ claimCaseId: '22222222-2222-2222-2222-222222222222', state: 'intake_pending', created: true }}
      />,
    );
    expect(screen.getByTestId('helpline-intake-result')).toHaveTextContent(/account is now in memorial/i);
    expect(screen.getByTestId('helpline-route-for-verification')).toBeInTheDocument();
    expect(screen.queryByTestId('helpline-submit-intake')).not.toBeInTheDocument();
  });

  it('shows the "claim already exists" copy on a convergence hit (created:false)', () => {
    render(
      <ShellHarness
        identityConfirmed
        result={{ claimCaseId: '22222222-2222-2222-2222-222222222222', state: 'intake_pending', created: false }}
      />,
    );
    expect(screen.getByTestId('helpline-intake-result')).toHaveTextContent(/already exists/i);
  });
});

describe('<ReadBackCard>', () => {
  it('reports confirmation up and renders a correction log', () => {
    const onConfirmedChange = vi.fn();
    const onAddCorrection = vi.fn();
    const { rerender } = render(
      <ReadBackCard
        variant="identity"
        script={SCRIPT}
        confirmed={false}
        onConfirmedChange={onConfirmedChange}
        corrections={[]}
        onAddCorrection={onAddCorrection}
      />,
    );
    fireEvent.click(screen.getByTestId('readback-confirm-identity'));
    expect(onConfirmedChange).toHaveBeenCalledWith(true);

    fireEvent.change(screen.getByTestId('readback-correction-input-identity'), {
      target: { value: 'spelling: Aasha' },
    });
    fireEvent.click(screen.getByTestId('readback-correction-add-identity'));
    expect(onAddCorrection).toHaveBeenCalledWith('spelling: Aasha');

    rerender(
      <ReadBackCard
        variant="identity"
        script={SCRIPT}
        confirmed={false}
        onConfirmedChange={onConfirmedChange}
        corrections={['spelling: Aasha']}
        onAddCorrection={onAddCorrection}
      />,
    );
    expect(screen.getByTestId('readback-correction-log-identity')).toHaveTextContent('spelling: Aasha');
  });

  it('shows both the English and Hindi read-back scripts (bilingual — AC6)', () => {
    render(
      <ReadBackCard
        variant="identity"
        script={{ en: 'English script', hi: 'हिन्दी स्क्रिप्ट', titleEn: 'Read-back' }}
        confirmed={false}
        onConfirmedChange={() => {}}
        corrections={[]}
        onAddCorrection={() => {}}
      />,
    );
    expect(screen.getByTestId('readback-script-en-identity')).toHaveTextContent('English script');
    expect(screen.getByTestId('readback-script-hi-identity')).toHaveTextContent('हिन्दी स्क्रिप्ट');
  });
});

describe('HelplineClaimGateView (session gate)', () => {
  const Page = () => <div data-testid="console-page">console</div>;

  it('shows a loading state while the session resolves', () => {
    render(
      <HelplineClaimGateView status="loading">
        <Page />
      </HelplineClaimGateView>,
    );
    expect(screen.queryByTestId('console-page')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/checking your session/i);
  });

  it('redirects (401 → /login) on a session error', () => {
    render(
      <HelplineClaimGateView status="error">
        <Page />
      </HelplineClaimGateView>,
    );
    expect(screen.queryByTestId('console-page')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/redirecting/i);
  });

  it('renders the console once the session is live', () => {
    render(
      <HelplineClaimGateView status="success">
        <Page />
      </HelplineClaimGateView>,
    );
    expect(screen.getByTestId('console-page')).toBeInTheDocument();
  });
});
