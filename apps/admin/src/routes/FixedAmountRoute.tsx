// The /p/$pariwarId/pool-fixed-amount route component (Story 7.5, Task 6).
//
// A `/p/:pariwarId/`-scoped admin route (mirrors CycleFreezeRoute / R9VotingRoute). Reads the
// path-scoped `pariwarId` and threads it into the tenant-scoped API calls. An unauthenticated session
// (401) bounces to /login. There is NO client-side grant gate: pool.fixed_amount_set /
// pool.fixed_amount_emergency are PARIWAR-scoped grants (not in the session's global-grant set), so the
// REAL boundary is the server's requirePermissionHook (+ requireStepUp on the emergency route) — a
// non-holder / un-elevated actor sees the API's 403 surfaced in the page.

import { useNavigate, useParams } from '@tanstack/react-router';
import type { ReactElement } from 'react';
import { useEffect } from 'react';

import { useSession } from '../api/hooks.js';
import { FixedAmountPage } from '../modules/pool-fixed-amount/FixedAmountPage.js';

export function FixedAmountRoute(): ReactElement {
  const session = useSession();
  const navigate = useNavigate();
  const params = useParams({ strict: false }) as { pariwarId?: string };
  const pariwarId = params.pariwarId;

  useEffect(() => {
    if (session.isError) void navigate({ to: '/login' });
  }, [session.isError, navigate]);

  if (session.isLoading) return <p role="status">Checking your session…</p>;
  if (session.isError) return <p role="status">Redirecting to sign in…</p>;
  if (!pariwarId) return <p role="alert">Missing Pariwar in route — cannot load fixed-amount schedule.</p>;
  return <FixedAmountPage pariwarId={pariwarId} />;
}
