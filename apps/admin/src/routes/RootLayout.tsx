// App shell / chrome (Story 1.11b, DD-1) — the top bar + a nav region that will
// grow as more admin modules land. The "Verify audit-log integrity" nav entry is
// gated CLIENT-SIDE on the `audit.verify` grant (AC-1 / DD-6 — advisory). A
// route-level error boundary (§4.9) wraps the outlet so a thrown render error
// degrades to a recoverable message instead of a blank screen.

import { Link, Outlet, useNavigate, useParams, useRouter } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { useState } from 'react';

import * as api from '../api/client.js';
import { hasAuditVerify, hasPariwarProvision, sessionKey, useSession } from '../api/hooks.js';

function TopBar(): ReactElement {
  const session = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const authed = Boolean(session.data);
  const canVerify = hasAuditVerify(session.data?.nationalGrants);
  const canProvision = hasPariwarProvision(session.data?.nationalGrants);
  // Story 10.11 — the Trustee-Lite nav entry. The two entries above are gated on NATIONAL grants and
  // link to un-scoped routes; the worklist is per-Pariwar, so it can only be linked from inside a
  // Pariwar context. `strict: false` reads the CURRENT match's params without pinning this shared
  // layout to one route, so the link appears on any `/p/$pariwarId/...` surface and is absent
  // elsewhere. No client-side grant gate: the six section keys are checked per-section on the server,
  // and a trustee holding even one of them has a worklist worth opening.
  const { pariwarId } = useParams({ strict: false }) as { pariwarId?: string };
  const [logoutError, setLogoutError] = useState(false);

  async function onLogout(): Promise<void> {
    setLogoutError(false);
    try {
      await api.logout();
      await queryClient.invalidateQueries({ queryKey: sessionKey });
      void navigate({ to: '/login' });
    } catch {
      // Logout failed (network error or CSRF fetch failure) — session is still
      // live; tell the user so they don't walk away believing they signed out.
      setLogoutError(true);
    }
  }

  return (
    <header className="flex items-center justify-between border-b bg-white px-6 py-3">
      <div className="flex items-center gap-6">
        <span className="font-bold">TWT Admin</span>
        <nav aria-label="Primary" className="flex items-center gap-4">
          {canVerify && (
            <Link to="/audit/integrity" className="text-sm underline" data-testid="nav-integrity">
              Verify audit-log integrity
            </Link>
          )}
          {canProvision && (
            <Link to="/provisioning" className="text-sm underline" data-testid="nav-provisioning">
              Provisioning
            </Link>
          )}
          {pariwarId && (
            <Link
              to="/p/$pariwarId/trustee"
              params={{ pariwarId }}
              className="text-sm underline"
              data-testid="nav-trustee"
            >
              Trustee worklist
            </Link>
          )}
        </nav>
      </div>
      <div className="flex items-center gap-3">
        {logoutError && (
          <p role="alert" className="text-sm text-status-fail-fg">
            Sign-out failed. Please try again.
          </p>
        )}
        {authed && (
          <button type="button" onClick={() => void onLogout()} className="text-sm underline">
            Sign out
          </button>
        )}
      </div>
    </header>
  );
}

export function RootLayout(): ReactElement {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <TopBar />
      <main className="mx-auto max-w-5xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}

/** Route-level error boundary (§4.9): a recoverable panel, not a blank screen. */
export function RootErrorComponent({ error }: { error: Error }): ReactElement {
  const router = useRouter();
  return (
    <div className="mx-auto max-w-xl p-8" role="alert">
      <h1 className="text-lg font-bold text-status-fail-fg">Something went wrong</h1>
      <p className="mt-2 text-sm">{error.message}</p>
      <button
        type="button"
        className="mt-4 rounded border px-3 py-1"
        onClick={() => void router.invalidate()}
      >
        Retry
      </button>
    </div>
  );
}
