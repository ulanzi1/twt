// The /p/:pariwarId/modules routes + their session gate — Story 12.2 (Task 8.3).
//
// `module.manage` is a per-Pariwar grant, so the client gate is only "is there a live session"; the REAL boundary is the
// server's chain [adminSession, scope, requirePermissionHook(module.manage @ pariwar)] (the BannersRoute shape). Three
// views: the list, the wizard (`/new`, `?from=<moduleId>` for a corrected copy) and one module (`?created=true` straight
// after "Create draft", dropped once the page has announced it — review RC1).

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
        onOpen={(moduleId) => void navigate({ to: '/p/$pariwarId/modules/$moduleId', params: { pariwarId, moduleId }, search: {} })}
      />
    </ModulesGateView>
  );
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * `?from=<moduleId>` — "Start a corrected copy"; a value that is not a UUID is DROPPED (the API would answer 400 before any read,
 * and the wizard would offer a Try again that can never succeed — PU2). `?blank=true` — the one-shot "Start a blank offer"
 * flag (PU1), dropped once the wizard has focused its heading. Anything else is ignored.
 */
export function validateModuleNewSearch(search: Record<string, unknown>): { from?: string; blank?: true } {
  const from = search['from'];
  return {
    ...(typeof from === 'string' && UUID.test(from) ? { from } : {}),
    ...(search['blank'] === true || search['blank'] === 'true' ? { blank: true as const } : {}),
  };
}

export function ModuleNewRoute(): ReactElement {
  const status = useGateStatus();
  const navigate = useNavigate();
  const { pariwarId } = useParams({ from: '/p/$pariwarId/modules/new' });
  // Re-validated here: the router MERGES each route's validated search over its parent's, and the root route passes every raw
  // param through, so a dropped malformed `from` would otherwise still arrive (PU2).
  const { from, blank } = validateModuleNewSearch(useSearch({ from: '/p/$pariwarId/modules/new' }));
  return (
    <ModulesGateView status={status}>
      {/* `key` — a corrected copy of ANOTHER module (or another Pariwar) starts a fresh wizard session (a fresh attempt). */}
      <ModuleWizard
        key={`${pariwarId}:${from ?? 'new'}`}
        pariwarId={pariwarId}
        fromModuleId={from ?? null}
        // `replace` — the dead corrected-copy URL is not kept in history; `blank` — the new wizard focuses its heading (PU1).
        onStartBlank={() => void navigate({ to: '/p/$pariwarId/modules/new', params: { pariwarId }, search: { blank: true }, replace: true })}
        focusOnMount={blank === true}
        onMountFocused={() => void navigate({ to: '/p/$pariwarId/modules/new', params: { pariwarId }, search: from === undefined ? {} : { from }, replace: true })}
        onCreated={(moduleId) => void navigate({ to: '/p/$pariwarId/modules/$moduleId', params: { pariwarId, moduleId }, search: { created: true } })}
      />
    </ModulesGateView>
  );
}

/** `?created=true` — the wizard has just created this draft (RC1). Anything else is ignored. */
export function validateModuleDetailSearch(search: Record<string, unknown>): { created?: true } {
  return search['created'] === true || search['created'] === 'true' ? { created: true } : {};
}

export function ModuleDetailRoute(): ReactElement {
  const status = useGateStatus();
  const navigate = useNavigate();
  const { pariwarId, moduleId } = useParams({ from: '/p/$pariwarId/modules/$moduleId' });
  const { created } = useSearch({ from: '/p/$pariwarId/modules/$moduleId' });
  return (
    <ModulesGateView status={status}>
      {/* `key` — the ticks, a held step-up retry and the result message are component state; a reused route instance must not carry
          them to another offer (RP25). */}
      <ModuleDetailPage
        key={`${pariwarId}:${moduleId}`}
        pariwarId={pariwarId}
        moduleId={moduleId}
        created={created === true}
        onCreatedShown={() => void navigate({ to: '/p/$pariwarId/modules/$moduleId', params: { pariwarId, moduleId }, search: {}, replace: true })}
        onBack={() => void navigate({ to: '/p/$pariwarId/modules', params: { pariwarId } })}
        onStartCorrectedCopy={(id) => void navigate({ to: '/p/$pariwarId/modules/new', params: { pariwarId }, search: { from: id } })}
      />
    </ModulesGateView>
  );
}
