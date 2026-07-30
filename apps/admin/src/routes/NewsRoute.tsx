// The /p/:pariwarId/news route + its session gate (Story 10.5, Task 7).
//
// The News/Blog authoring console is tenant-scoped; `news.manage` is a per-Pariwar grant, so the client
// gate is only "is there a live session" — the REAL boundary is the server guard chain
// [adminSession, scope, requirePermissionHook(news.manage @ pariwar)]. An unauthenticated session (401)
// bounces to /login. The gate view is a PURE presentational decision (mirrors HelpdeskQueueRoute).

import { useNavigate, useParams } from '@tanstack/react-router';
import type { ReactElement, ReactNode } from 'react';
import { useEffect } from 'react';

import { useSession } from '../api/hooks.js';
import { NewsPage } from '../modules/news-blog/NewsPage.js';

export interface NewsGateViewProps {
  status: 'loading' | 'error' | 'success';
  children: ReactNode;
}

export function NewsGateView({ status, children }: NewsGateViewProps): ReactElement {
  if (status === 'loading') return <p role="status">Checking your session…</p>;
  if (status === 'error') return <p role="status">Redirecting to sign in…</p>;
  return <>{children}</>;
}

export function NewsRoute(): ReactElement {
  const session = useSession();
  const navigate = useNavigate();
  const { pariwarId } = useParams({ from: '/p/$pariwarId/news' });

  useEffect(() => {
    if (session.isError) void navigate({ to: '/login' });
  }, [session.isError, navigate]);

  const status: NewsGateViewProps['status'] = session.isLoading ? 'loading' : session.isError ? 'error' : 'success';

  return (
    <NewsGateView status={status}>
      <NewsPage pariwarId={pariwarId} />
    </NewsGateView>
  );
}
