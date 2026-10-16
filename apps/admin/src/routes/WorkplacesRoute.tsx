// `/p/$pariwarId/workplaces` — the Super Admin's workplace list (Story 6.36c, SW9 A). The session gate the sibling routes
// use; the server's key check (`workplace.manage`) is the boundary.

import { useNavigate, useParams } from '@tanstack/react-router';
import { useEffect, type ReactElement } from 'react';

import { useSession } from '../api/hooks.js';
import { WorkplacesPage } from '../modules/workplaces/index.js';

export function WorkplacesRoute(): ReactElement {
  const { pariwarId } = useParams({ strict: false }) as { pariwarId: string };
  const session = useSession();
  const navigate = useNavigate();
  useEffect(() => {
    if (session.isError) void navigate({ to: '/login' });
  }, [session.isError, navigate]);
  if (session.isLoading) return <p role="status">Checking your session…</p>;
  if (session.isError) return <p role="status">Redirecting to sign in…</p>;
  return (
    <main className="p-6">
      {/* `key` — the router REUSES this component when only `$pariwarId` changes; an open form or a held step-up retry
          must ⛔ carry into the next Pariwar (the ApprovalWarningReasonsRoute precedent). */}
      <WorkplacesPage key={pariwarId} pariwarId={pariwarId} />
    </main>
  );
}
