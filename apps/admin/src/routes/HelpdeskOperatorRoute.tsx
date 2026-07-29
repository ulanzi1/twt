// The /p/:pariwarId/helpdesk route + its session gate (Story 10.3, Task 5).
//
// The helpdesk operator console is tenant-scoped (like the helpline/member-search routes). `helpdesk.create`
// is a PER-PARIWAR grant, so — like member-search — the client gate is only "is there a live session"; the
// REAL boundary is the server's guard chain on the create route
// [adminSession, scope, requirePermissionHook(helpdesk.create @ dimension:'pariwar')] (fail-closed, audited).
// An unauthenticated session (401) bounces to /login.
//
// `HelpdeskOperatorGateView` is a PURE presentational decision (no hooks/router) so the gate is
// unit-testable without a router context (mirrors HelplineClaimRoute / MemberSearchRoute).

import { useNavigate, useParams } from '@tanstack/react-router';
import type { ReactElement, ReactNode } from 'react';
import { useEffect } from 'react';

import { useSession } from '../api/hooks.js';
import { HelpdeskOperatorPage } from '../modules/helpdesk/HelpdeskOperatorPage.js';

export interface HelpdeskOperatorGateViewProps {
  status: 'loading' | 'error' | 'success';
  children: ReactNode;
}

/** Pure gate: decide loading / redirecting / allowed from session state. */
export function HelpdeskOperatorGateView({ status, children }: HelpdeskOperatorGateViewProps): ReactElement {
  if (status === 'loading') return <p role="status">Checking your session…</p>;
  if (status === 'error') return <p role="status">Redirecting to sign in…</p>;
  return <>{children}</>;
}

export function HelpdeskOperatorRoute(): ReactElement {
  const session = useSession();
  const navigate = useNavigate();
  const { pariwarId } = useParams({ from: '/p/$pariwarId/helpdesk' });

  useEffect(() => {
    if (session.isError) void navigate({ to: '/login' });
  }, [session.isError, navigate]);

  const status: HelpdeskOperatorGateViewProps['status'] = session.isLoading
    ? 'loading'
    : session.isError
      ? 'error'
      : 'success';

  return (
    <HelpdeskOperatorGateView status={status}>
      <HelpdeskOperatorPage pariwarId={pariwarId} />
    </HelpdeskOperatorGateView>
  );
}
