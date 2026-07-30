// The /p/:pariwarId/helpdesk/queue route + its session gate (Story 10.4, Task 7).
//
// The responder queue is tenant-scoped; `helpdesk.respond` is a per-Pariwar grant, so the client gate
// is only "is there a live session" — the REAL boundary is the server guard chain
// [adminSession, scope, requirePermissionHook(helpdesk.respond @ pariwar)]. An unauthenticated session
// (401) bounces to /login. The gate view is a PURE presentational decision (mirrors HelpdeskOperatorRoute).

import { useNavigate, useParams } from '@tanstack/react-router';
import type { ReactElement, ReactNode } from 'react';
import { useEffect } from 'react';

import { useSession } from '../api/hooks.js';
import { HelpdeskQueuePage } from '../modules/helpdesk/HelpdeskQueuePage.js';

export interface HelpdeskGateViewProps {
  status: 'loading' | 'error' | 'success';
  children: ReactNode;
}

export function HelpdeskGateView({ status, children }: HelpdeskGateViewProps): ReactElement {
  if (status === 'loading') return <p role="status">Checking your session…</p>;
  if (status === 'error') return <p role="status">Redirecting to sign in…</p>;
  return <>{children}</>;
}

export function HelpdeskQueueRoute(): ReactElement {
  const session = useSession();
  const navigate = useNavigate();
  const { pariwarId } = useParams({ from: '/p/$pariwarId/helpdesk/queue' });

  useEffect(() => {
    if (session.isError) void navigate({ to: '/login' });
  }, [session.isError, navigate]);

  const status: HelpdeskGateViewProps['status'] = session.isLoading ? 'loading' : session.isError ? 'error' : 'success';

  return (
    <HelpdeskGateView status={status}>
      <HelpdeskQueuePage pariwarId={pariwarId} />
    </HelpdeskGateView>
  );
}
