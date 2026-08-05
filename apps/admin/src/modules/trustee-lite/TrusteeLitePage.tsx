// `<TrusteeLitePage>` — the Trustee-Lite container (Story 10.11, Task 5; AC9).
//
// Wires `useTrusteeLite` around the pure `<TrusteeLiteShell>` and turns a cross-link href into a
// navigation. Deliberately thin: this surface has no filters, no pagination and no actions — it is an
// INDEX, and every act happens on the surface a row links to.

import { useNavigate } from '@tanstack/react-router';
import type { ReactElement } from 'react';

import { ApiError } from '../../api/client.js';
import { useTrusteeLite } from '../../api/hooks.js';
import { TrusteeLiteShell } from './TrusteeLiteShell.js';

function messageOf(err: unknown): string | undefined {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return undefined;
}

export function TrusteeLitePage({ pariwarId }: { pariwarId: string }): ReactElement {
  const worklist = useTrusteeLite(pariwarId);
  const navigate = useNavigate();

  return (
    <TrusteeLiteShell
      pariwarId={pariwarId}
      {...(worklist.data ? { data: worklist.data } : {})}
      loading={worklist.isLoading}
      {...(worklist.isError ? { error: messageOf(worklist.error) } : {})}
      onRetry={() => void worklist.refetch()}
      // The cross-link targets are all existing routes; `to` is typed loosely here because the href
      // is derived from a data-driven kind rather than a literal route path.
      onNavigate={(href) => void navigate({ to: href })}
    />
  );
}
