// The /p/$pariwarId/niyamavali route component (Story 2.4, Task 6).
//
// The FIRST `/p/:pariwarId/`-scoped admin route (the app previously had only flat
// global routes). It reads the path-scoped `pariwarId` param and threads it into the
// page (and thus the tenant-scoped API calls). An unauthenticated session (401)
// bounces to /login. There is NO client-side grant gate: niyamavali.amend is a
// PARIWAR-scoped grant (not in the session's global-grant set), so the REAL boundary
// is the server's requirePermissionHook — a non-member sees the API's 404/403 surfaced
// in the page. Mirrors IntegrityRoute's session handling.

import { useNavigate, useParams } from '@tanstack/react-router';
import type { ReactElement } from 'react';
import { useEffect } from 'react';

import { useSession } from '../api/hooks.js';
import { NiyamavaliPage } from '../modules/niyamavali-admin/NiyamavaliPage.js';

export function NiyamavaliRoute(): ReactElement {
  const session = useSession();
  const navigate = useNavigate();
  const params = useParams({ strict: false }) as { pariwarId?: string };
  const pariwarId = params.pariwarId ?? '';

  useEffect(() => {
    if (session.isError) void navigate({ to: '/login' });
  }, [session.isError, navigate]);

  if (session.isLoading) return <p role="status">Checking your session…</p>;
  if (session.isError) return <p role="status">Redirecting to sign in…</p>;
  return <NiyamavaliPage pariwarId={pariwarId} />;
}
