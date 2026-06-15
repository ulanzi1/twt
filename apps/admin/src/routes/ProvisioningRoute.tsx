// The /provisioning route component + its permission gate (Story 1.15, AC-4).
//
// AC-4: the page + nav entry are gated CLIENT-SIDE + ADVISORY on
// `nationalGrants.includes('pariwar.provision')` — `requireGlobalPermission` (AC-1a)
// is the REAL server boundary on every endpoint. An unauthenticated session (401)
// bounces to /login; an authenticated session lacking the grant sees an access-denied
// panel (the page content never renders). Mirrors `IntegrityRoute` exactly.
//
// `ProvisioningGateView` is a PURE presentational decision (no hooks/router) so the
// gate is unit-testable without a router context.

import { useNavigate } from '@tanstack/react-router';
import type { ReactElement, ReactNode } from 'react';
import { useEffect } from 'react';

import { hasPariwarProvision, useSession } from '../api/hooks.js';
import { ProvisioningPage } from '../modules/pariwar-provisioning/ProvisioningPage.js';

function AccessDenied(): ReactElement {
  return (
    <div
      className="rounded border-l-4 border-status-fail-border bg-status-fail-bg p-4 text-status-fail-fg"
      role="alert"
      data-testid="access-denied"
    >
      <p className="font-semibold">You don&apos;t have access to this page.</p>
      <p className="mt-1 text-sm">
        Provisioning a Pariwar requires the <code>pariwar.provision</code> grant at the
        national (global) scope. Contact a Super Admin if you believe this is an error.
      </p>
    </div>
  );
}

export interface ProvisioningGateViewProps {
  status: 'loading' | 'error' | 'success';
  grants: readonly string[] | undefined;
  children: ReactNode;
}

/** Pure gate: decide loading / redirecting / denied / allowed from session state. */
export function ProvisioningGateView({
  status,
  grants,
  children,
}: ProvisioningGateViewProps): ReactElement {
  if (status === 'loading') {
    return <p role="status">Checking your session…</p>;
  }
  if (status === 'error') {
    return <p role="status">Redirecting to sign in…</p>;
  }
  if (!hasPariwarProvision(grants)) {
    return <AccessDenied />;
  }
  return <>{children}</>;
}

export function ProvisioningRoute(): ReactElement {
  const session = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (session.isError) void navigate({ to: '/login' });
  }, [session.isError, navigate]);

  const status: ProvisioningGateViewProps['status'] = session.isLoading
    ? 'loading'
    : session.isError
      ? 'error'
      : 'success';

  return (
    <ProvisioningGateView status={status} grants={session.data?.nationalGrants}>
      <ProvisioningPage />
    </ProvisioningGateView>
  );
}
