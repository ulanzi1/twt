// `<HelpdeskQueuePage>` — the responder-queue container (Story 10.4, Task 7; AC1/AC4).
//
// Wires `useHelpdeskQueue` (state + "my queue" routed_to_role filters, offset pagination) around the
// pure `<HelpdeskQueueShell>` and navigates to a ticket's detail on select. Any filter change resets
// the offset to the first page. The severity sort (AC4) is client-side in the shell — see its header.

import { useNavigate } from '@tanstack/react-router';
import type { ReactElement } from 'react';
import { useState } from 'react';

import { ApiError } from '../../api/client.js';
import { useHelpdeskQueue } from '../../api/hooks.js';
import { HelpdeskQueueShell, type HelpdeskQueueSort } from './HelpdeskQueueShell.js';

function messageOf(err: unknown): string | undefined {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return undefined;
}

const PAGE_SIZE = 50;

export function HelpdeskQueuePage({ pariwarId }: { pariwarId: string }): ReactElement {
  const [stateFilter, setStateFilter] = useState('');
  const [routedToRoleFilter, setRoutedToRoleFilter] = useState('');
  const [sortBy, setSortBy] = useState<HelpdeskQueueSort>('newest');
  const [offset, setOffset] = useState(0);
  const navigate = useNavigate();

  // Any filter change resets to the first page — an offset carried over from a differently-filtered
  // result set is meaningless.
  function updateStateFilter(next: string): void {
    setStateFilter(next);
    setOffset(0);
  }
  function updateRoutedToRoleFilter(next: string): void {
    setRoutedToRoleFilter(next);
    setOffset(0);
  }

  const queue = useHelpdeskQueue(pariwarId, {
    ...(stateFilter ? { state: stateFilter } : {}),
    ...(routedToRoleFilter ? { routedToRole: routedToRoleFilter } : {}),
    limit: PAGE_SIZE,
    offset,
  });

  return (
    <HelpdeskQueueShell
      pariwarId={pariwarId}
      tickets={queue.data?.tickets ?? []}
      loading={queue.isLoading}
      error={queue.isError ? messageOf(queue.error) : undefined}
      stateFilter={stateFilter}
      onStateFilterChange={updateStateFilter}
      routedToRoleFilter={routedToRoleFilter}
      onRoutedToRoleFilterChange={updateRoutedToRoleFilter}
      sortBy={sortBy}
      onSortByChange={setSortBy}
      hasPreviousPage={offset > 0}
      hasNextPage={queue.data?.next_offset != null}
      onPreviousPage={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
      onNextPage={() => {
        const next = queue.data?.next_offset;
        if (next != null) setOffset(next);
      }}
      onSelect={(ticketId) =>
        void navigate({ to: '/p/$pariwarId/helpdesk/tickets/$ticketId', params: { pariwarId, ticketId } })
      }
    />
  );
}
