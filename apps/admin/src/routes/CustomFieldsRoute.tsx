// The /p/:pariwarId/custom-fields route + its session gate (Story 10.12, Task 7).
//
// The custom-fields console is tenant-scoped; `pariwar.view_custom_fields` (read) and the narrower
// `pariwar.manage_custom_fields` (write) are per-Pariwar grants checked SERVER-side, so the client
// gate is only "is there a live session" — the REAL boundary is the server guard chain. An
// unauthenticated session (401) bounces to /login. Mirrors FeatureFlagsRoute / NewsRoute /
// ReportsRoute.
//
// ⚠ There is deliberately NO client-side capability check hiding the page or the publish form from a
// view-only actor. An `auditor` holds `pariwar.view_custom_fields` but not `.manage`; they see the
// full definition list (that is the whole point of the read/write split — a tenant's data contract
// must be auditable) and get a server 403 if they submit, surfaced as an error. Client-side hiding
// would be a UI courtesy that misrepresents what exists.

import { useNavigate, useParams } from '@tanstack/react-router';
import type { ReactElement, ReactNode } from 'react';
import { useEffect } from 'react';

import { useSession } from '../api/hooks.js';
import { CustomFieldsPage } from '../modules/custom-fields/CustomFieldsPage.js';

export interface CustomFieldsGateViewProps {
  status: 'loading' | 'error' | 'success';
  children: ReactNode;
}

/** Exported PURE so the gate's three states are testable without a router or a query client. */
export function CustomFieldsGateView({ status, children }: CustomFieldsGateViewProps): ReactElement {
  if (status === 'loading') return <p role="status">Checking your session…</p>;
  if (status === 'error') return <p role="status">Redirecting to sign in…</p>;
  return <>{children}</>;
}

export function CustomFieldsRoute(): ReactElement {
  const session = useSession();
  const navigate = useNavigate();
  const { pariwarId } = useParams({ from: '/p/$pariwarId/custom-fields' });

  useEffect(() => {
    if (session.isError) void navigate({ to: '/login' });
  }, [session.isError, navigate]);

  const status: CustomFieldsGateViewProps['status'] = session.isLoading
    ? 'loading'
    : session.isError
      ? 'error'
      : 'success';

  return (
    <CustomFieldsGateView status={status}>
      <CustomFieldsPage pariwarId={pariwarId} />
    </CustomFieldsGateView>
  );
}
