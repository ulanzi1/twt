// `<HelpdeskDetailPage>` — the responder ticket-detail container (Story 10.4, Task 7; AC2/AC3).
//
// Wires `useHelpdeskTicket` + the three transition mutations (`useHelpdeskTransitions`) around the pure
// `<HelpdeskDetailShell>`. Each mutation invalidates the ticket + queue queries so the console
// re-renders the new state + thread.

import type { ReactElement } from 'react';

import { ApiError } from '../../api/client.js';
import { useHelpdeskTicket, useHelpdeskTransitions } from '../../api/hooks.js';
import { HelpdeskDetailShell } from './HelpdeskDetailShell.js';

function messageOf(err: unknown): string | undefined {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return undefined;
}

export function HelpdeskDetailPage({ pariwarId, ticketId }: { pariwarId: string; ticketId: string }): ReactElement {
  const ticket = useHelpdeskTicket(pariwarId, ticketId);
  const { pickUp, reply, resolve } = useHelpdeskTransitions(pariwarId, ticketId);

  const actionError =
    (pickUp.isError ? messageOf(pickUp.error) : undefined) ??
    (reply.isError ? messageOf(reply.error) : undefined) ??
    (resolve.isError ? messageOf(resolve.error) : undefined);

  return (
    <HelpdeskDetailShell
      pariwarId={pariwarId}
      detail={ticket.data}
      loading={ticket.isLoading}
      error={ticket.isError ? messageOf(ticket.error) : undefined}
      onPickUp={() => pickUp.mutate()}
      onReply={(message) => reply.mutate(message)}
      onResolve={(message) => resolve.mutate(message)}
      pending={{ pickUp: pickUp.isPending, reply: reply.isPending, resolve: resolve.isPending }}
      actionError={actionError}
    />
  );
}
