// The /audit/integrity route component + its permission gate (Story 1.11b, AC-1/DD-6).
//
// AC-1: the page is visible only to roles carrying `audit.verify`. The gate is
// CLIENT-SIDE + ADVISORY (DD-6) — `requireAdminSession` is the real server boundary
// on every endpoint; the endpoint-side `audit.verify` RBAC upgrade stays deferred
// (D4-1.11a). An unauthenticated session (401) bounces to /login; an authenticated
// session lacking the grant sees an access-denied panel (the page content never
// renders).
//
// `IntegrityGateView` is a PURE presentational decision (no hooks/router) so the
// gate is unit-testable without a router context; `IntegrityRoute` wires it to the
// live session query + navigation.

import type { ReactElement, ReactNode } from 'react';
import { useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';

import { hasAuditVerify, useSession } from '../api/hooks.js';
import { IntegrityPage } from '../modules/audit-integrity/IntegrityPage.js';

function AccessDenied(): ReactElement {
  return (
    <div
      className="rounded border-l-4 border-status-fail-border bg-status-fail-bg p-4 text-status-fail-fg"
      role="alert"
      data-testid="access-denied"
    >
      <p className="font-semibold">You don&apos;t have access to this page.</p>
      <p className="mt-1 text-sm">
        Viewing audit-log integrity requires the <code>audit.verify</code> grant at
        the national (global) scope. Contact a Super Admin if you believe this is an
        error.
      </p>
    </div>
  );
}

export interface IntegrityGateViewProps {
  status: 'loading' | 'error' | 'success';
  grants: readonly string[] | undefined;
  children: ReactNode;
}

/** Pure gate: decide loading / redirecting / denied / allowed from session state. */
export function IntegrityGateView({
  status,
  grants,
  children,
}: IntegrityGateViewProps): ReactElement {
  if (status === 'loading') {
    return <p role="status">Checking your session…</p>;
  }
  if (status === 'error') {
    // 401 (or any session-read failure) → IntegrityRoute redirects to /login.
    return <p role="status">Redirecting to sign in…</p>;
  }
  if (!hasAuditVerify(grants)) {
    return <AccessDenied />;
  }
  return <>{children}</>;
}

export function IntegrityRoute(): ReactElement {
  const session = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (session.isError) void navigate({ to: '/login' });
  }, [session.isError, navigate]);

  const status: IntegrityGateViewProps['status'] = session.isLoading
    ? 'loading'
    : session.isError
      ? 'error'
      : 'success';

  return (
    <IntegrityGateView status={status} grants={session.data?.nationalGrants}>
      <IntegrityPage />
    </IntegrityGateView>
  );
}
