// The /p/$pariwarId/degraded-mode route component (Story 5.8, Task 6).
//
// A `/p/:pariwarId/`-scoped admin route (mirrors ChannelConfigRoute). Reads the path-scoped `pariwarId` and
// threads it into the tenant-scoped API calls. An unauthenticated session (401) bounces to /login. There is
// NO client-side grant gate: pariwar.declare_degraded_mode is a PARIWAR-scoped grant (not in the session's
// global-grant set), so the REAL boundary is the server's requirePermissionHook — a non-holder sees the
// API's 403/404 surfaced in the page.

import { useNavigate, useParams } from '@tanstack/react-router';
import type { ReactElement } from 'react';
import { useEffect } from 'react';

import { useSession } from '../api/hooks.js';
import { DegradedModePage } from '../modules/degraded-mode/DegradedModePage.js';

export function DegradedModeRoute(): ReactElement {
  const session = useSession();
  const navigate = useNavigate();
  const params = useParams({ strict: false }) as { pariwarId?: string };
  const pariwarId = params.pariwarId;

  useEffect(() => {
    if (session.isError) void navigate({ to: '/login' });
  }, [session.isError, navigate]);

  if (session.isLoading) return <p role="status">Checking your session…</p>;
  if (session.isError) return <p role="status">Redirecting to sign in…</p>;
  if (!pariwarId) return <p role="alert">Missing Pariwar in route — cannot load degraded mode.</p>;
  return <DegradedModePage pariwarId={pariwarId} />;
}
