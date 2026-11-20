// The breach register's permission gate (Story 14.3, AC12) — module-local, in the `IntegrityRoute` / `ProvisioningRoute` shape.
// CLIENT-SIDE and ADVISORY: the server's `requireGlobalPermission('breach.manage')` is the boundary on every route. A PURE
// presentational decision (no hooks, no router), so it is unit-testable; the route wires it to the session query.

import type { ReactElement, ReactNode } from 'react';

import { hasBreachManage } from '../../api/hooks.js';
import { t } from './i18n-en.js';

function AccessDenied(): ReactElement {
  return (
    <div className="rounded border-l-4 border-status-fail-border bg-status-fail-bg p-4 text-status-fail-fg" role="alert" data-testid="breach-access-denied">
      <p className="font-semibold">{t('gate.denied.title')}</p>
      <p className="mt-1 text-sm">{t('gate.denied.body')}</p>
    </div>
  );
}

export interface BreachGateViewProps {
  status: 'loading' | 'error' | 'success';
  grants: readonly string[] | undefined;
  children: ReactNode;
}

/** Decide loading / redirecting / denied / allowed from the session state. */
export function BreachGateView({ status, grants, children }: BreachGateViewProps): ReactElement {
  if (status === 'loading') return <p role="status">{t('gate.loading')}</p>;
  if (status === 'error') return <p role="status">{t('gate.redirect')}</p>;
  if (!hasBreachManage(grants)) return <AccessDenied />;
  return <>{children}</>;
}
