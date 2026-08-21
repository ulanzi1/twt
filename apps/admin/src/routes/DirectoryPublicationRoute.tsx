// The /p/$pariwarId/directory-publication route component (Story 10.30, Task 5).
//
// A `/p/:pariwarId/`-scoped admin route, mirroring DegradedModeRoute EXACTLY. Reads the path-scoped
// `pariwarId` and threads it into the tenant-scoped API calls. An unauthenticated session (401)
// bounces to /login.
//
// ⛔ THERE IS NO CLIENT-SIDE GRANT GATE, AND ADDING ONE WOULD BREAK THE PAGE FOR EVERYONE.
// `pariwar.manage_directory_publication` is a PARIWAR-dimension grant and is therefore never present
// in the session's GLOBAL grant set — a gate modelled on the global-scope pattern
// (`nationalGrants.includes(...)`, correct for global-dimension permissions) would deny every
// operator, super_admin included. The REAL boundary is the server's `requirePermissionHook`; a
// non-holder sees the API's 403 surfaced as a readable page error.
//
// ⛔ Deliberately NOT linked from any nav menu — no per-Pariwar admin hub exists for any sibling tool
// (degraded-mode, feature-flags and cycle-freeze are all direct-URL and un-linked). This follows that
// convention; adding a hub is unrelated scope.

import { useNavigate, useParams } from '@tanstack/react-router';
import type { ReactElement } from 'react';
import { useEffect } from 'react';

import { useSession } from '../api/hooks.js';
import { DirectoryPublicationPage } from '../modules/directory-publication/DirectoryPublicationPage.js';

export function DirectoryPublicationRoute(): ReactElement {
  const session = useSession();
  const navigate = useNavigate();
  const params = useParams({ strict: false }) as { pariwarId?: string };
  const pariwarId = params.pariwarId;

  useEffect(() => {
    if (session.isError) void navigate({ to: '/login' });
  }, [session.isError, navigate]);

  if (session.isLoading) return <p role="status">Checking your session…</p>;
  if (session.isError) return <p role="status">Redirecting to sign in…</p>;
  if (!pariwarId)
    return <p role="alert">Missing Pariwar in route — cannot load directory publication.</p>;
  return <DirectoryPublicationPage pariwarId={pariwarId} />;
}
