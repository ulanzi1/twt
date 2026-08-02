// The /p/:pariwarId/banners route + its session gate (Story 10.9, Task 6).
//
// The banner/popup console is tenant-scoped; `banner.manage` is a per-Pariwar grant, so the client
// gate is only "is there a live session" — the REAL boundary is the server guard chain
// [adminSession, scope, requirePermissionHook(banner.manage @ pariwar)]. An unauthenticated session
// (401) bounces to /login. The gate view is a PURE presentational decision (mirrors NewsRoute).

import { useNavigate, useParams } from '@tanstack/react-router';
import type { ReactElement, ReactNode } from 'react';
import { useEffect } from 'react';

import { useSession } from '../api/hooks.js';
import { BannersPage } from '../modules/banners/BannersPage.js';

export interface BannersGateViewProps {
  status: 'loading' | 'error' | 'success';
  children: ReactNode;
}

export function BannersGateView({ status, children }: BannersGateViewProps): ReactElement {
  if (status === 'loading') return <p role="status">Checking your session…</p>;
  if (status === 'error') return <p role="status">Redirecting to sign in…</p>;
  return <>{children}</>;
}

export function BannersRoute(): ReactElement {
  const session = useSession();
  const navigate = useNavigate();
  const { pariwarId } = useParams({ from: '/p/$pariwarId/banners' });

  useEffect(() => {
    if (session.isError) void navigate({ to: '/login' });
  }, [session.isError, navigate]);

  const status: BannersGateViewProps['status'] = session.isLoading
    ? 'loading'
    : session.isError
      ? 'error'
      : 'success';

  return (
    <BannersGateView status={status}>
      <BannersPage pariwarId={pariwarId} />
    </BannersGateView>
  );
}
