// The /p/$pariwarId/field-workers/appeals route + its session gate — Story 13.1f (AC12; AD13): the appeals against endings. Copied from
// `FieldWorkerMoveRequestsRoute.tsx`: the field-worker keys are district / Pariwar grants (⛔ in `nationalGrants`), so the client gate is
// only "is there a live session"; the REAL boundary is the server's gate. `key={pariwarId}` — a page reused for another Pariwar starts
// fresh. ⛔ A `login-next.ts` entry: no email links here.

import { useNavigate, useParams } from '@tanstack/react-router';
import type { ReactElement } from 'react';
import { useEffect } from 'react';

import { useSession } from '../api/hooks.js';
import { AppealsPage } from '../modules/field-workers/index.js';

export function FieldWorkerAppealsRoute(): ReactElement {
  const session = useSession();
  const navigate = useNavigate();
  const { pariwarId } = useParams({ from: '/p/$pariwarId/field-workers/appeals' });
  useEffect(() => {
    if (session.isError) void navigate({ to: '/login' });
  }, [session.isError, navigate]);
  if (session.isLoading) return <p role="status">Checking your session…</p>;
  if (session.isError) return <p role="status">Redirecting to sign in…</p>;
  return <AppealsPage key={pariwarId} pariwarId={pariwarId} />;
}
