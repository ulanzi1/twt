// The /p/:pariwarId/feature-flags route + its session gate (Story 10.8, Task 8).
//
// The flag console is tenant-scoped; `feature_flag.view` (read) and the narrower `feature_flag.flip`
// (write) are per-Pariwar grants checked SERVER-side, so the client gate is only "is there a live
// session" — the REAL boundary is the server guard chain. An unauthenticated session (401) bounces to
// /login. Mirrors ReportsRoute / NewsRoute / HelpdeskQueueRoute.
//
// Note there is deliberately no client-side capability check hiding the page or the flip form from a
// view-only actor. An `auditor` holds `feature_flag.view` but not `.flip`; they see the full
// inventory (that is the point of the transparency property) and get a server 403 if they submit,
// surfaced as an error. Client-side hiding would be a UI courtesy that misrepresents what exists.

import { useNavigate, useParams } from '@tanstack/react-router';
import type { ReactElement, ReactNode } from 'react';
import { useEffect } from 'react';

import { useSession } from '../api/hooks.js';
import { FeatureFlagsPage } from '../modules/feature-flags/FeatureFlagsPage.js';

export interface FeatureFlagsGateViewProps {
  status: 'loading' | 'error' | 'success';
  children: ReactNode;
}

export function FeatureFlagsGateView({ status, children }: FeatureFlagsGateViewProps): ReactElement {
  if (status === 'loading') return <p role="status">Checking your session…</p>;
  if (status === 'error') return <p role="status">Redirecting to sign in…</p>;
  return <>{children}</>;
}

export function FeatureFlagsRoute(): ReactElement {
  const session = useSession();
  const navigate = useNavigate();
  const { pariwarId } = useParams({ from: '/p/$pariwarId/feature-flags' });

  useEffect(() => {
    if (session.isError) void navigate({ to: '/login' });
  }, [session.isError, navigate]);

  const status: FeatureFlagsGateViewProps['status'] = session.isLoading
    ? 'loading'
    : session.isError
      ? 'error'
      : 'success';

  return (
    <FeatureFlagsGateView status={status}>
      <FeatureFlagsPage pariwarId={pariwarId} />
    </FeatureFlagsGateView>
  );
}
