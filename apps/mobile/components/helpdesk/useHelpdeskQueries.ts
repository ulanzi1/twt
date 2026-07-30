// Helpdesk member query hooks — Story 10.2 (Task 7).
//
// TanStack Query hooks over the member-helpdesk SDK (lib/helpdesk-api). The helpdesk routes are
// Pariwar-scoped in the path, so each hook takes the pariwarId (the screens read it from the session
// context). Keys are namespaced under ['helpdesk', …] so a successful create can invalidate the
// inbox list. The category set is stable within a session, so it caches generously.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { helpdeskApi } from '../../lib/helpdesk-api'

export function useHelpdeskCategoriesQuery(pariwarId: string | undefined) {
  return useQuery({
    queryKey: ['helpdesk', 'categories', pariwarId],
    queryFn: () => helpdeskApi.categories(pariwarId as string),
    enabled: !!pariwarId,
  })
}

export function useHelpdeskInboxQuery(pariwarId: string | undefined) {
  return useQuery({
    queryKey: ['helpdesk', 'tickets', pariwarId],
    queryFn: () => helpdeskApi.listTickets(pariwarId as string),
    enabled: !!pariwarId,
  })
}

export function useHelpdeskTicketQuery(pariwarId: string | undefined, ticketId: string | undefined) {
  return useQuery({
    queryKey: ['helpdesk', 'ticket', pariwarId, ticketId],
    queryFn: () => helpdeskApi.getTicket(pariwarId as string, ticketId as string),
    enabled: !!pariwarId && !!ticketId,
  })
}

/** Story 10.4 — the member reply-append mutation (awaiting_member → in_progress). On success it
 *  invalidates the ticket + inbox queries so the detail re-renders the new thread + state. */
export function useHelpdeskReplyMutation(pariwarId: string | undefined, ticketId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (message: string) => helpdeskApi.reply(pariwarId as string, ticketId as string, message),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['helpdesk', 'ticket', pariwarId, ticketId] })
      void qc.invalidateQueries({ queryKey: ['helpdesk', 'tickets', pariwarId] })
    },
  })
}
