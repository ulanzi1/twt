// The /p/:pariwarId/memorial-reviews routes + their session gate — Story 11b.4 (Task 7, AC9).
//
// The Trustee Panel's review of a family's memorial. Authorization is enforced SERVER-SIDE on every call (`memorial.review`
// at `dimension:'pariwar'`), so the client gate is only "is there a live session" — the real boundary is the handler. An
// unauthenticated session (401) bounces to /login; a 403 is the page's own "no access".
//
// `MemorialReviewGateView` is its OWN local copy (the moderation-appeals precedent: each unrelated-feature route hand-rolls
// an identically-shaped gate view rather than reaching into a sibling route file).

import { useNavigate, useParams } from '@tanstack/react-router';
import type { ReactElement, ReactNode } from 'react';
import { useEffect } from 'react';

import { useSession } from '../api/hooks.js';
import { MemorialReviewDetailPage, MemorialReviewListPage } from '../modules/memorial-review/MemorialReviewPage.js';

export interface MemorialReviewGateViewProps {
  status: 'loading' | 'error' | 'success';
  children: ReactNode;
}

export function MemorialReviewGateView({ status, children }: MemorialReviewGateViewProps): ReactElement {
  if (status === 'loading') return <p role="status">Checking your session…</p>;
  if (status === 'error') return <p role="status">Redirecting to sign in…</p>;
  return <>{children}</>;
}

function useSessionGate(): 'loading' | 'error' | 'success' {
  const session = useSession();
  const navigate = useNavigate();
  useEffect(() => {
    if (session.isError) void navigate({ to: '/login' });
  }, [session.isError, navigate]);
  return session.isLoading ? 'loading' : session.isError ? 'error' : 'success';
}

export function MemorialReviewRoute(): ReactElement {
  const status = useSessionGate();
  const { pariwarId } = useParams({ from: '/p/$pariwarId/memorial-reviews' });
  return (
    <MemorialReviewGateView status={status}>
      <MemorialReviewListPage pariwarId={pariwarId} />
    </MemorialReviewGateView>
  );
}

export function MemorialReviewDetailRoute(): ReactElement {
  const status = useSessionGate();
  const { pariwarId, submissionId } = useParams({ from: '/p/$pariwarId/memorial-reviews/$submissionId' });
  return (
    <MemorialReviewGateView status={status}>
      <MemorialReviewDetailPage pariwarId={pariwarId} submissionId={submissionId} />
    </MemorialReviewGateView>
  );
}
