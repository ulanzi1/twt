// The /p/:pariwarId/trustee route + its session gate (Story 10.11, Task 5).
//
// The worklist is tenant-scoped and its authorization is PER SECTION on the server, so the client
// gate is only "is there a live session" — the real boundary is the handler's grant filter over six
// keys, which omits the sections the caller cannot act on and 403s when they hold none. An
// unauthenticated session (401) bounces to /login.
//
// `TrusteeLiteGateView` is its OWN local copy (review finding, 2026-08-05) rather than an import from
// `HelpdeskQueueRoute.js` — every unrelated-feature route in this directory hand-rolls its own
// identically-shaped gate view (`NewsGateView`, `ReportsGateView`, `VerifierConsoleGateView`, …); the
// one existing cross-import (`HelpdeskTicketRoute` → `HelpdeskGateView`) stays WITHIN the Helpdesk
// feature family. Reaching into a sibling, unrelated admin module's route file for presentational UI
// silently couples the two: a future Helpdesk-specific edit to that view would change Trustee-Lite's
// behavior too, with no signal at the Helpdesk call site. Mirrors `NewsRoute`'s shape.

import { useNavigate, useParams } from '@tanstack/react-router';
import type { ReactElement, ReactNode } from 'react';
import { useEffect } from 'react';

import { useSession } from '../api/hooks.js';
import { TrusteeLitePage } from '../modules/trustee-lite/TrusteeLitePage.js';

export interface TrusteeLiteGateViewProps {
  status: 'loading' | 'error' | 'success';
  children: ReactNode;
}

export function TrusteeLiteGateView({ status, children }: TrusteeLiteGateViewProps): ReactElement {
  if (status === 'loading') return <p role="status">Checking your session…</p>;
  if (status === 'error') return <p role="status">Redirecting to sign in…</p>;
  return <>{children}</>;
}

export function TrusteeLiteRoute(): ReactElement {
  const session = useSession();
  const navigate = useNavigate();
  const { pariwarId } = useParams({ from: '/p/$pariwarId/trustee' });

  useEffect(() => {
    if (session.isError) void navigate({ to: '/login' });
  }, [session.isError, navigate]);

  const status: TrusteeLiteGateViewProps['status'] = session.isLoading
    ? 'loading'
    : session.isError
      ? 'error'
      : 'success';

  return (
    <TrusteeLiteGateView status={status}>
      <TrusteeLitePage pariwarId={pariwarId} />
    </TrusteeLiteGateView>
  );
}
