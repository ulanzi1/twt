// The /p/:pariwarId/moderation/appeals route + its session gate — Story 10.22 (AC5).
//
// The Trustee Panel's §8.8 adjudication surface. Authorization is enforced SERVER-SIDE on every call
// (`member.decide_moderation_appeal` at `dimension:'pariwar'`, plus step-up on the determination), so
// the client gate is only "is there a live session" — the real boundary is the handler. An
// unauthenticated session (401) bounces to /login.
//
// `ModerationAppealsGateView` is its OWN local copy rather than an import from a sibling route file —
// every unrelated-feature route in this directory hand-rolls an identically-shaped gate view
// (`NewsGateView`, `ReportsGateView`, `TrusteeLiteGateView`, …). Reaching into an unrelated admin
// module's route file for presentational UI silently couples the two.

import { useNavigate, useParams } from '@tanstack/react-router';
import type { ReactElement, ReactNode } from 'react';
import { useEffect } from 'react';

import { useSession } from '../api/hooks.js';
import { ModerationAppealsPage } from '../modules/moderation-appeals/ModerationAppealsPage.js';

export interface ModerationAppealsGateViewProps {
  status: 'loading' | 'error' | 'success';
  children: ReactNode;
}

export function ModerationAppealsGateView({
  status,
  children,
}: ModerationAppealsGateViewProps): ReactElement {
  if (status === 'loading') return <p role="status">Checking your session…</p>;
  if (status === 'error') return <p role="status">Redirecting to sign in…</p>;
  return <>{children}</>;
}

export function ModerationAppealsRoute(): ReactElement {
  const session = useSession();
  const navigate = useNavigate();
  const { pariwarId } = useParams({ from: '/p/$pariwarId/moderation/appeals' });

  useEffect(() => {
    if (session.isError) void navigate({ to: '/login' });
  }, [session.isError, navigate]);

  const status = session.isLoading ? 'loading' : session.isError ? 'error' : 'success';
  return (
    <ModerationAppealsGateView status={status}>
      <ModerationAppealsPage pariwarId={pariwarId} />
    </ModerationAppealsGateView>
  );
}
