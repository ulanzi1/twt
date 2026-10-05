// `/p/$pariwarId/approval-warning-reasons` — the Super Admin's warning-reason list (Story 6.23a, NW17). The session
// gate the sibling routes use; the server's key check (`approval_warning_reason.manage`) is the boundary.

import { useNavigate, useParams } from '@tanstack/react-router';
import { useEffect, type ReactElement } from 'react';

import { useSession } from '../api/hooks.js';
import { ApprovalWarningReasonsPage } from '../modules/approval-warning-reasons/index.js';

export function ApprovalWarningReasonsRoute(): ReactElement {
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
      <ApprovalWarningReasonsPage pariwarId={pariwarId} />
    </main>
  );
}
