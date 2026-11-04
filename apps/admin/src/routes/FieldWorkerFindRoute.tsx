// The /p/$pariwarId/field-workers route + its session gate — Story 13.1a (Task 9.2; AC11): find a worker and show their code.
//
// The field-worker keys are district / Pariwar grants (⛔ in `nationalGrants`), so the client gate is only "is there a live session";
// the REAL boundary is the server's gate, and the page shows its own "no access" line on a 403 (AD11). `key={pariwarId}` — a page
// reused for another Pariwar starts fresh (no worker, no typed value carried across).

import { useNavigate, useParams } from '@tanstack/react-router';
import type { ReactElement } from 'react';
import { useEffect } from 'react';

import { useSession } from '../api/hooks.js';
import { FindWorkerPage } from '../modules/field-workers/index.js';

export function FieldWorkerFindRoute(): ReactElement {
  const session = useSession();
  const navigate = useNavigate();
  const { pariwarId } = useParams({ from: '/p/$pariwarId/field-workers' });
  useEffect(() => {
    if (session.isError) void navigate({ to: '/login' });
  }, [session.isError, navigate]);
  if (session.isLoading) return <p role="status">Checking your session…</p>;
  if (session.isError) return <p role="status">Redirecting to sign in…</p>;
  return <FindWorkerPage key={pariwarId} pariwarId={pariwarId} />;
}
