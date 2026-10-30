// `/p/$pariwarId/questionnaires` — the questionnaire chain (Story 6.33; `2026-10-30-421` QE16). The session gate the sibling
// routes use; the server's key checks (`questionnaire.propose` / `.approve` / `.publish`) are the boundary.

import { useNavigate, useParams } from '@tanstack/react-router';
import { useEffect, type ReactElement } from 'react';

import { useSession } from '../api/hooks.js';
import { QuestionnaireVersionsPage } from '../modules/questionnaire-versions/index.js';

export function QuestionnaireVersionsRoute(): ReactElement {
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
      {/* `key` — the router REUSES this component when only `$pariwarId` changes (an open editor or a pending step-up must
          ⛔ carry into the next Pariwar). */}
      <QuestionnaireVersionsPage key={pariwarId} pariwarId={pariwarId} />
    </main>
  );
}
