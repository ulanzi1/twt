// The /p/:pariwarId/surveys route + its session gate (Story 10.15, Task 8).
//
// The survey/poll console is tenant-scoped; `survey.manage` is a per-Pariwar grant, so the client
// gate is only "is there a live session" — the REAL boundary is the server guard chain
// [adminSession, scope, requirePermissionHook(survey.manage @ pariwar)]. An unauthenticated session
// (401) bounces to /login. The gate view is a PURE presentational decision (mirrors BannersRoute).

import { useNavigate, useParams } from '@tanstack/react-router';
import type { ReactElement, ReactNode } from 'react';
import { useEffect } from 'react';

import { useSession } from '../api/hooks.js';
import { SurveysPage } from '../modules/surveys/SurveysPage.js';

export interface SurveysGateViewProps {
  status: 'loading' | 'error' | 'success';
  children: ReactNode;
}

export function SurveysGateView({ status, children }: SurveysGateViewProps): ReactElement {
  if (status === 'loading') return <p role="status">Checking your session…</p>;
  if (status === 'error') return <p role="status">Redirecting to sign in…</p>;
  return <>{children}</>;
}

export function SurveysRoute(): ReactElement {
  const session = useSession();
  const navigate = useNavigate();
  const { pariwarId } = useParams({ from: '/p/$pariwarId/surveys' });

  useEffect(() => {
    if (session.isError) void navigate({ to: '/login' });
  }, [session.isError, navigate]);

  const status: SurveysGateViewProps['status'] = session.isLoading
    ? 'loading'
    : session.isError
      ? 'error'
      : 'success';

  return (
    <SurveysGateView status={status}>
      <SurveysPage pariwarId={pariwarId} />
    </SurveysGateView>
  );
}
