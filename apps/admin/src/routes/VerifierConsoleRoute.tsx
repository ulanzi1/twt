// The /p/:pariwarId/claims/:claimCaseId/verify route + its session gate (Story 6.10, Task 4).
//
// The verifier console is tenant-scoped (like the ground-inspection route). `claim.verify` is a
// PER-PARIWAR district-scoped grant, so — like those consoles — the CLIENT gate is only "is there a
// live session"; the REAL boundary is the server chain [adminSession, scope, resolveDistrict,
// requirePermissionHook(claim.verify, district)] (fail-closed, audited). An unauthenticated session
// (401) bounces to /login; a per-request 403 (wrong district / no-district exception) surfaces as an
// authorization message, never a stale packet.
//
// D8 SAFE SCOPE SWITCH: switching Pariwar is an explicit NAVIGATION to the target Pariwar's SAFE
// landing route (the member-search surface) — NOT the same claimCaseId under `/p/:otherId/`. Navigating
// there UNMOUNTS this route (clearing the packet + its cache-disabled query), so the old Pariwar's
// evidence is never rendered under new-scope chrome and the claimCaseId is never carried across.
//
// `VerifierConsoleGateView` is a PURE presentational decision (no hooks/router) so the gate is
// unit-testable without a router context (mirrors GroundInspectionRoute / HelplineClaimRoute).

import { useNavigate, useParams } from '@tanstack/react-router';
import type { ReactElement, ReactNode } from 'react';
import { useEffect } from 'react';

import {
  ScopeChrome,
  SignalsPanel,
  VerificationConsoleShell,
  verifierConsoleEn as t,
} from '../modules/claim-verification/index.js';
import { ApiError } from '../api/client.js';
import { useSession, useVerifierConsole } from '../api/hooks.js';

export interface VerifierConsoleGateViewProps {
  status: 'loading' | 'error' | 'success';
  children: ReactNode;
}

/** Pure gate: decide loading / redirecting / allowed from session state. */
export function VerifierConsoleGateView({ status, children }: VerifierConsoleGateViewProps): ReactElement {
  if (status === 'loading') return <p role="status">Checking your session…</p>;
  if (status === 'error') return <p role="status">Redirecting to sign in…</p>;
  return <>{children}</>;
}

/**
 * PURE — D8's safe-switch navigation target: the target Pariwar's SAFE landing route (member-search),
 * never the current `claimCaseId`. Independently testable without mounting the route (no router/hooks),
 * so the "does not carry claimCaseId across Pariwars" property can be asserted directly.
 */
export function verifierConsoleSwitchTarget(targetPariwarId: string): {
  to: '/p/$pariwarId/members';
  params: { pariwarId: string };
} {
  return { to: '/p/$pariwarId/members', params: { pariwarId: targetPariwarId } };
}

export function VerifierConsoleRoute(): ReactElement {
  const session = useSession();
  const navigate = useNavigate();
  const { pariwarId, claimCaseId } = useParams({ from: '/p/$pariwarId/claims/$claimCaseId/verify' });
  const console_ = useVerifierConsole(pariwarId, claimCaseId);

  useEffect(() => {
    if (session.isError) void navigate({ to: '/login' });
  }, [session.isError, navigate]);

  const status: VerifierConsoleGateViewProps['status'] = session.isLoading
    ? 'loading'
    : session.isError
      ? 'error'
      : 'success';

  // D8 — switching Pariwar navigates to the target's SAFE landing route (member-search), NOT the same
  // claimCaseId under the new tenant. Leaving this route unmounts the console → packet + query cleared.
  const onSwitch = (targetPariwarId: string): void => {
    void navigate(verifierConsoleSwitchTarget(targetPariwarId));
  };

  const packet = console_.data?.packet;

  return (
    <VerifierConsoleGateView status={status}>
      <VerificationConsoleShell
        claimCaseId={claimCaseId}
        deceasedMemberName={packet?.identity.deceasedName ?? null}
        claimState={packet?.claimState ?? '…'}
        scopeChrome={
          <ScopeChrome
            activePariwarId={pariwarId}
            activePariwarName={pariwarId}
            pariwars={[{ id: pariwarId, name: pariwarId }]}
            onSwitch={onSwitch}
          />
        }
        // 6.10 renders NO decision controls — the sticky slot stays empty/inert (Story 6.11 owns it).
      >
        {console_.isLoading ? (
          <p role="status" data-testid="console-loading">
            {t.states.loading}
          </p>
        ) : console_.isError ? (
          <p role="alert" data-testid="console-error">
            {console_.error instanceof ApiError && console_.error.isForbidden
              ? t.states.forbidden
              : t.states.unavailable}
          </p>
        ) : packet ? (
          <SignalsPanel packet={packet} />
        ) : null}
      </VerificationConsoleShell>
    </VerifierConsoleGateView>
  );
}
