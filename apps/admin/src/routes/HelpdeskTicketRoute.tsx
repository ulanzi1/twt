// The /p/:pariwarId/helpdesk/tickets/:ticketId route + its session gate (Story 10.4, Task 7).
//
// The responder ticket detail (thread + pick-up/reply/resolve). Same tenant-scoped session gate as the
// queue route; the server guard chain [adminSession, scope, requirePermissionHook(helpdesk.respond)] is
// the real boundary.

import { useNavigate, useParams } from '@tanstack/react-router';
import type { ReactElement } from 'react';
import { useEffect } from 'react';

import { useSession } from '../api/hooks.js';
import { HelpdeskDetailPage } from '../modules/helpdesk/HelpdeskDetailPage.js';
import { HelpdeskGateView, type HelpdeskGateViewProps } from './HelpdeskQueueRoute.js';

export function HelpdeskTicketRoute(): ReactElement {
  const session = useSession();
  const navigate = useNavigate();
  const { pariwarId, ticketId } = useParams({ from: '/p/$pariwarId/helpdesk/tickets/$ticketId' });

  useEffect(() => {
    if (session.isError) void navigate({ to: '/login' });
  }, [session.isError, navigate]);

  const status: HelpdeskGateViewProps['status'] = session.isLoading ? 'loading' : session.isError ? 'error' : 'success';

  return (
    <HelpdeskGateView status={status}>
      <HelpdeskDetailPage pariwarId={pariwarId} ticketId={ticketId} />
    </HelpdeskGateView>
  );
}
