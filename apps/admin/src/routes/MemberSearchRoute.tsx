// The /p/:pariwarId/members route + its session gate (Story 4.7, Task 5).
//
// The member-search + status surface is tenant-scoped (like the Niyamavali route). `member.view_validity`
// is a PER-PARIWAR grant (not a national grant), so — unlike the audit/provisioning routes gated on
// `nationalGrants` — the client gate is only "is there a live session"; the REAL boundary is the server's
// `requirePermissionHook(member.view_validity)` on every endpoint (fail-closed, audited). An
// unauthenticated session (401) bounces to /login.
//
// `MemberSearchGateView` is a PURE presentational decision (no hooks/router) so the gate is unit-testable
// without a router context (mirrors ProvisioningRoute).

import { useNavigate, useParams } from '@tanstack/react-router';
import type { ReactElement, ReactNode } from 'react';
import { useEffect } from 'react';

import { useSession } from '../api/hooks.js';
import { MemberSearchPage } from '../modules/member-status/MemberSearchPage.js';

export interface MemberSearchGateViewProps {
  status: 'loading' | 'error' | 'success';
  children: ReactNode;
}

/** Pure gate: decide loading / redirecting / allowed from session state. */
export function MemberSearchGateView({ status, children }: MemberSearchGateViewProps): ReactElement {
  if (status === 'loading') return <p role="status">Checking your session…</p>;
  if (status === 'error') return <p role="status">Redirecting to sign in…</p>;
  return <>{children}</>;
}

export function MemberSearchRoute(): ReactElement {
  const session = useSession();
  const navigate = useNavigate();
  const { pariwarId } = useParams({ from: '/p/$pariwarId/members' });

  useEffect(() => {
    if (session.isError) void navigate({ to: '/login' });
  }, [session.isError, navigate]);

  const status: MemberSearchGateViewProps['status'] = session.isLoading
    ? 'loading'
    : session.isError
      ? 'error'
      : 'success';

  return (
    <MemberSearchGateView status={status}>
      <MemberSearchPage pariwarId={pariwarId} />
    </MemberSearchGateView>
  );
}
