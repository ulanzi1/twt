// The /p/:pariwarId/modules routes + their session gate — Story 12.2 (Task 8.3).
//
// `module.manage` is a per-Pariwar grant, so the client gate is only "is there a live session"; the REAL boundary is the
// server's chain [adminSession, scope, requirePermissionHook(module.manage @ pariwar)] (the BannersRoute shape). Three
// views: the list, the wizard (`/new`, `?from=<moduleId>` for a corrected copy) and one module.

import { useNavigate, useParams, useSearch } from '@tanstack/react-router';
import type { ReactElement, ReactNode } from 'react';
import { useEffect } from 'react';

import { useSession } from '../api/hooks.js';
import { ModuleDetailPage, ModulesPage, ModuleWizard } from '../modules/marketplace/index.js';

export interface ModulesGateViewProps {
  status: 'loading' | 'error' | 'success';
  children: ReactNode;
}

export function ModulesGateView({ status, children }: ModulesGateViewProps): ReactElement {
  if (status === 'loading') return <p role="status">Checking your session…</p>;
  if (status === 'error') return <p role="status">Redirecting to sign in…</p>;
  return <>{children}</>;
}

function useGateStatus(): ModulesGateViewProps['status'] {
  const session = useSession();
  const navigate = useNavigate();
  useEffect(() => {
    if (session.isError) void navigate({ to: '/login' });
  }, [session.isError, navigate]);
  return session.isLoading ? 'loading' : session.isError ? 'error' : 'success';
}

export function ModulesRoute(): ReactElement {
  const status = useGateStatus();
  const navigate = useNavigate();
  const { pariwarId } = useParams({ from: '/p/$pariwarId/modules' });
  return (
    <ModulesGateView status={status}>
      <ModulesPage
        pariwarId={pariwarId}
        onNew={() => void navigate({ to: '/p/$pariwarId/modules/new', params: { pariwarId }, search: {} })}
        onOpen={(moduleId) => void navigate({ to: '/p/$pariwarId/modules/$moduleId', params: { pariwarId, moduleId } })}
      />
    </ModulesGateView>
  );
}

/** `?from=<moduleId>` — "Start a corrected copy". Anything else is ignored. */
export function validateModuleNewSearch(search: Record<string, unknown>): { from?: string } {
  return typeof search['from'] === 'string' && search['from'] !== '' ? { from: search['from'] } : {};
}

export function ModuleNewRoute(): ReactElement {
  const status = useGateStatus();
  const navigate = useNavigate();
  const { pariwarId } = useParams({ from: '/p/$pariwarId/modules/new' });
  const { from } = useSearch({ from: '/p/$pariwarId/modules/new' });
  return (
    <ModulesGateView status={status}>
      {/* `key` — a corrected copy of ANOTHER module (or another Pariwar) starts a fresh wizard session (a fresh attempt). */}
      <ModuleWizard
        key={`${pariwarId}:${from ?? 'new'}`}
        pariwarId={pariwarId}
        fromModuleId={from ?? null}
        onCreated={(moduleId) => void navigate({ to: '/p/$pariwarId/modules/$moduleId', params: { pariwarId, moduleId } })}
      />
    </ModulesGateView>
  );
}

export function ModuleDetailRoute(): ReactElement {
  const status = useGateStatus();
  const navigate = useNavigate();
  const { pariwarId, moduleId } = useParams({ from: '/p/$pariwarId/modules/$moduleId' });
  return (
    <ModulesGateView status={status}>
      {/* `key` — the ticks, a held step-up retry and the result message are component state; a reused route instance must not carry
          them to another offer (RP25). */}
      <ModuleDetailPage
        key={`${pariwarId}:${moduleId}`}
        pariwarId={pariwarId}
        moduleId={moduleId}
        onBack={() => void navigate({ to: '/p/$pariwarId/modules', params: { pariwarId } })}
        onStartCorrectedCopy={(id) => void navigate({ to: '/p/$pariwarId/modules/new', params: { pariwarId }, search: { from: id } })}
      />
    </ModulesGateView>
  );
}
