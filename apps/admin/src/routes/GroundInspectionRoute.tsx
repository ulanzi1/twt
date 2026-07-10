// The /p/:pariwarId/ground-inspection route + its session gate (Story 6.7, Task 6).
//
// The ground-inspection console is tenant-scoped (like the helpline route). `claim.conduct_ground_inspection`
// is a PER-PARIWAR district-scoped grant, so — like the helpline console — the CLIENT gate is only
// "is there a live session"; the REAL boundary is the server's per-endpoint guard chain
// [adminSession, scope, requirePermissionHook(claim.conduct_ground_inspection, { dimension: 'district', … })]
// (+ the inspector-identity guard on the evidence-authoring verbs) — fail-closed, audited. An
// unauthenticated session (401) bounces to /login.
//
// `GroundInspectionGateView` is a PURE presentational decision (no hooks/router) so the gate is
// unit-testable without a router context (mirrors HelplineClaimRoute).

import { useNavigate, useParams } from '@tanstack/react-router';
import type { ReactElement, ReactNode } from 'react';
import { useEffect } from 'react';

import { useSession } from '../api/hooks.js';
import { GroundInspectionPage } from '../modules/ground-inspection/GroundInspectionPage.js';

export interface GroundInspectionGateViewProps {
  status: 'loading' | 'error' | 'success';
  children: ReactNode;
}

/** Pure gate: decide loading / redirecting / allowed from session state. */
export function GroundInspectionGateView({ status, children }: GroundInspectionGateViewProps): ReactElement {
  if (status === 'loading') return <p role="status">Checking your session…</p>;
  if (status === 'error') return <p role="status">Redirecting to sign in…</p>;
  return <>{children}</>;
}

export function GroundInspectionRoute(): ReactElement {
  const session = useSession();
  const navigate = useNavigate();
  const { pariwarId } = useParams({ from: '/p/$pariwarId/ground-inspection' });

  useEffect(() => {
    if (session.isError) void navigate({ to: '/login' });
  }, [session.isError, navigate]);

  const status: GroundInspectionGateViewProps['status'] = session.isLoading
    ? 'loading'
    : session.isError
      ? 'error'
      : 'success';

  return (
    <GroundInspectionGateView status={status}>
      <GroundInspectionPage pariwarId={pariwarId} />
    </GroundInspectionGateView>
  );
}
