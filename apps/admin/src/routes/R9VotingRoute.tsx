// The /p/$pariwarId/r9-voting route component (Story 6.14, Task 9).
//
// A `/p/:pariwarId/`-scoped admin route (mirrors CycleFreezeRoute). Reads the path-scoped `pariwarId` and
// threads it into the tenant-scoped API calls. An unauthenticated session (401) bounces to /login. There is
// NO client-side grant gate: claim.r9_vote is a PARIWAR-scoped grant (not in the session's global-grant
// set), so the REAL boundary is the server's requirePermissionHook (+ requireStepUp on finalize) — a
// non-holder / un-elevated actor sees the API's 403/404 surfaced in the page.

import { useNavigate, useParams } from '@tanstack/react-router';
import type { ReactElement } from 'react';
import { useEffect } from 'react';

import { useSession } from '../api/hooks.js';
import { R9VotingPage } from '../modules/r9-voting/R9VotingPage.js';

export function R9VotingRoute(): ReactElement {
  const session = useSession();
  const navigate = useNavigate();
  const params = useParams({ strict: false }) as { pariwarId?: string };
  const pariwarId = params.pariwarId;

  useEffect(() => {
    if (session.isError) void navigate({ to: '/login' });
  }, [session.isError, navigate]);

  if (session.isLoading) return <p role="status">Checking your session…</p>;
  if (session.isError) return <p role="status">Redirecting to sign in…</p>;
  if (!pariwarId) return <p role="alert">Missing Pariwar in route — cannot load R9 voting.</p>;
  return <R9VotingPage pariwarId={pariwarId} />;
}
