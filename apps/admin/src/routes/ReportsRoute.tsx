// The /p/:pariwarId/reports route + its session gate (Story 10.7, Task 7).
//
// The reports console is tenant-scoped; the per-report RBAC key is a per-Pariwar grant checked
// server-side (Decision 6), so the client gate is only "is there a live session" — the REAL boundary is
// the server guard chain + the per-template checkPermission inside the handler. An unauthenticated
// session (401) bounces to /login. Mirrors NewsRoute / HelpdeskQueueRoute.

import { useNavigate, useParams } from '@tanstack/react-router';
import type { ReactElement, ReactNode } from 'react';
import { useEffect } from 'react';

import { useSession } from '../api/hooks.js';
import { ReportsPage } from '../modules/reports/ReportsPage.js';

export interface ReportsGateViewProps {
  status: 'loading' | 'error' | 'success';
  children: ReactNode;
}

export function ReportsGateView({ status, children }: ReportsGateViewProps): ReactElement {
  if (status === 'loading') return <p role="status">Checking your session…</p>;
  if (status === 'error') return <p role="status">Redirecting to sign in…</p>;
  return <>{children}</>;
}

export function ReportsRoute(): ReactElement {
  const session = useSession();
  const navigate = useNavigate();
  const { pariwarId } = useParams({ from: '/p/$pariwarId/reports' });

  useEffect(() => {
    if (session.isError) void navigate({ to: '/login' });
  }, [session.isError, navigate]);

  const status: ReportsGateViewProps['status'] = session.isLoading
    ? 'loading'
    : session.isError
      ? 'error'
      : 'success';

  return (
    <ReportsGateView status={status}>
      <ReportsPage pariwarId={pariwarId} />
    </ReportsGateView>
  );
}
