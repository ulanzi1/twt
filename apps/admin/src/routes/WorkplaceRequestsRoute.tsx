// `/p/$pariwarId/workplace-requests` — the Pariwar Admin's *"isn't listed"* queue and the people-who-know-me campaign
// (Story 6.36c, SW9 A / SW16 (5)). The session gate the sibling routes use; the server's key checks (`workplace.review`,
// `known_people.run_campaign`) are the boundary.

import { useNavigate, useParams } from '@tanstack/react-router';
import { useEffect, type ReactElement } from 'react';

import { useSession } from '../api/hooks.js';
import { WorkplaceRequestsPage } from '../modules/workplaces/index.js';

export function WorkplaceRequestsRoute(): ReactElement {
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
      {/* `key` — the router REUSES this component when only `$pariwarId` changes; an open picker or a held step-up retry
          must ⛔ carry into the next Pariwar (the ApprovalWarningReasonsRoute precedent). */}
      <WorkplaceRequestsPage key={pariwarId} pariwarId={pariwarId} />
    </main>
  );
}
