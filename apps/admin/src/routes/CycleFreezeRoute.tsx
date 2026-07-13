// The /p/$pariwarId/cycle-freeze route component (Story 6.13, Task 7).
//
// A `/p/:pariwarId/`-scoped admin route (mirrors DegradedModeRoute). Reads the path-scoped `pariwarId` and
// threads it into the tenant-scoped API calls. An unauthenticated session (401) bounces to /login. There is
// NO client-side grant gate: cycle.freeze is a PARIWAR-scoped grant (not in the session's global-grant set),
// so the REAL boundary is the server's requirePermissionHook + requireStepUp — a non-holder sees the API's
// 403/404 surfaced in the page.

import { useNavigate, useParams } from '@tanstack/react-router';
import type { ReactElement } from 'react';
import { useEffect } from 'react';

import { useSession } from '../api/hooks.js';
import { CycleFreezePage } from '../modules/cycle-freeze/CycleFreezePage.js';

export function CycleFreezeRoute(): ReactElement {
  const session = useSession();
  const navigate = useNavigate();
  const params = useParams({ strict: false }) as { pariwarId?: string };
  const pariwarId = params.pariwarId;

  useEffect(() => {
    if (session.isError) void navigate({ to: '/login' });
  }, [session.isError, navigate]);

  if (session.isLoading) return <p role="status">Checking your session…</p>;
  if (session.isError) return <p role="status">Redirecting to sign in…</p>;
  if (!pariwarId) return <p role="alert">Missing Pariwar in route — cannot load cycle freeze.</p>;
  return <CycleFreezePage pariwarId={pariwarId} />;
}
