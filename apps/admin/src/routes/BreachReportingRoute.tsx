// `/data-protection/breaches` and `/data-protection/breaches/$incidentId` (Story 14.3, AC12). Trust-wide pages (no Pariwar in
// the path) behind the module's own gate; an unauthenticated session bounces to /login. The gate is advisory — the server's
// `requireGlobalPermission('breach.manage')` is the boundary.

import { useNavigate, useParams } from '@tanstack/react-router';
import type { ReactElement, ReactNode } from 'react';
import { useEffect } from 'react';

import { useSession } from '../api/hooks.js';
import { BreachDetailPage } from '../modules/breach-reporting/BreachDetailPage.js';
import { BreachGateView, type BreachGateViewProps } from '../modules/breach-reporting/BreachGateView.js';
import { BreachListPage } from '../modules/breach-reporting/BreachListPage.js';

function Gated({ children }: { children: ReactNode }): ReactElement {
  const session = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (session.isError) void navigate({ to: '/login' });
  }, [session.isError, navigate]);

  const status: BreachGateViewProps['status'] = session.isLoading ? 'loading' : session.isError ? 'error' : 'success';
  return (
    <BreachGateView status={status} grants={session.data?.nationalGrants}>
      {children}
    </BreachGateView>
  );
}

export function BreachReportingRoute(): ReactElement {
  return (
    <Gated>
      <BreachListPage />
    </Gated>
  );
}

export function BreachIncidentRoute(): ReactElement {
  const { incidentId } = useParams({ from: '/data-protection/breaches/$incidentId' });
  return (
    <Gated>
      <BreachDetailPage incidentId={incidentId} />
    </Gated>
  );
}
