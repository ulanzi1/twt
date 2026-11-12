// The /p/$pariwarId/field-workers/requests route + its session gate — Story 13.1d (AC9; AD10): the move requests and the officer's notices.
//
// The field-worker keys are district / Pariwar grants (⛔ in `nationalGrants`), so the client gate is only "is there a live session";
// the REAL boundary is the server's gate, and the page shows its own "no access" line on a 403 (AD11). `key={pariwarId}` — a page
// reused for another Pariwar starts fresh (no worker, no typed value carried across). Story 13.1g (AD10): a session error goes to
// `/login?next=<this page>`, so the move-notice email's link survives a sign-in.

import { useNavigate, useParams } from '@tanstack/react-router';
import type { ReactElement } from 'react';
import { useEffect } from 'react';

import { useSession } from '../api/hooks.js';
import { MoveRequestsPage } from '../modules/field-workers/index.js';
import { fieldWorkerRequestsPath } from './login-next.js';

export function FieldWorkerMoveRequestsRoute(): ReactElement {
  const session = useSession();
  const navigate = useNavigate();
  const { pariwarId } = useParams({ from: '/p/$pariwarId/field-workers/requests' });
  useEffect(() => {
    if (session.isError) void navigate({ to: '/login', search: { next: fieldWorkerRequestsPath(pariwarId) } });
  }, [session.isError, navigate, pariwarId]);
  if (session.isLoading) return <p role="status">Checking your session…</p>;
  if (session.isError) return <p role="status">Redirecting to sign in…</p>;
  return <MoveRequestsPage key={pariwarId} pariwarId={pariwarId} />;
}
