// The /p/:pariwarId/helpline route + its session gate (Story 6.3, Task 5).
//
// The helpline operator console is tenant-scoped (like the member-search route). `claim.file` is
// a PER-PARIWAR grant (not a national grant), so — like member-search — the client gate is only
// "is there a live session"; the REAL boundary is the server's guard chain on the intake route
// [adminSession, scope, requirePermissionHook(claim.file), requireStepUp('claim_file')]
// (fail-closed, audited). An unauthenticated session (401) bounces to /login.
//
// `HelplineClaimGateView` is a PURE presentational decision (no hooks/router) so the gate is
// unit-testable without a router context (mirrors MemberSearchRoute / ProvisioningRoute).

import { useNavigate, useParams } from '@tanstack/react-router';
import type { ReactElement, ReactNode } from 'react';
import { useEffect } from 'react';

import { useSession } from '../api/hooks.js';
import { HelplineClaimPage } from '../modules/helpline-claims/HelplineClaimPage.js';

export interface HelplineClaimGateViewProps {
  status: 'loading' | 'error' | 'success';
  children: ReactNode;
}

/** Pure gate: decide loading / redirecting / allowed from session state. */
export function HelplineClaimGateView({ status, children }: HelplineClaimGateViewProps): ReactElement {
  if (status === 'loading') return <p role="status">Checking your session…</p>;
  if (status === 'error') return <p role="status">Redirecting to sign in…</p>;
  return <>{children}</>;
}

export function HelplineClaimRoute(): ReactElement {
  const session = useSession();
  const navigate = useNavigate();
  const { pariwarId } = useParams({ from: '/p/$pariwarId/helpline' });

  useEffect(() => {
    if (session.isError) void navigate({ to: '/login' });
  }, [session.isError, navigate]);

  const status: HelplineClaimGateViewProps['status'] = session.isLoading
    ? 'loading'
    : session.isError
      ? 'error'
      : 'success';

  return (
    <HelplineClaimGateView status={status}>
      <HelplineClaimPage pariwarId={pariwarId} />
    </HelplineClaimGateView>
  );
}
