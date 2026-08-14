// `<HelpdeskDetailPage>` — the responder ticket-detail container (Story 10.4, Task 7; AC2/AC3).
//
// Wires `useHelpdeskTicket` + the three transition mutations (`useHelpdeskTransitions`) around the pure
// `<HelpdeskDetailShell>`. Each mutation invalidates the ticket + queue queries so the console
// re-renders the new state + thread.

import type { ReactElement } from 'react';

import { ApiError } from '../../api/client.js';
import {
  useDataRightsDelivery,
  useDataRightsFulfilment,
  useHelpdeskTicket,
  useHelpdeskTransitions,
  useRecordCorrection,
} from '../../api/hooks.js';
import { HelpdeskDetailShell } from './HelpdeskDetailShell.js';
import { resolveEn } from './i18n-en.js';

function messageOf(err: unknown): string | undefined {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return undefined;
}

export function HelpdeskDetailPage({ pariwarId, ticketId }: { pariwarId: string; ticketId: string }): ReactElement {
  const ticket = useHelpdeskTicket(pariwarId, ticketId);
  const { pickUp, reply, resolve } = useHelpdeskTransitions(pariwarId, ticketId);
  // Story 10.21 — the DPDPA fulfilment mutations. The shell decides whether to SHOW the panel (it
  // checks the subcategory + subject member); this only supplies the actions.
  const dataRights = useDataRightsFulfilment(pariwarId, ticketId, ticket.data?.subject_member_id ?? null);
  // ⚠ `exportId` comes from the build result — delivery is only meaningful once an export exists, and
  // the hook refuses with a plain message rather than letting the server 404 opaquely.
  const builtExportId = dataRights.buildExport.data?.export_id ?? null;
  const delivery = useDataRightsDelivery(
    pariwarId,
    ticketId,
    ticket.data?.subject_member_id ?? null,
    builtExportId,
  );
  const correction = useRecordCorrection(pariwarId, ticketId, ticket.data?.subject_member_id ?? null);

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
      // ⚠ PRESENTATIONAL ONLY. The API is the real gate (permission key + distinct step-up); this just
      // avoids offering an action that would 403. ⛔ A 403 here is not a bug to route around — it means
      // the acting admin genuinely lacks `member.data_rights`.
      // ⚠ The admin app has no client-side permission introspection today, so the panel is offered and
      // the API refuses if the caller lacks the key. ⛔ Do NOT infer authority from this flag.
      canFulfilDataRights
      onBuildExport={() => dataRights.buildExport.mutate()}
      onFulfilErasure={() => dataRights.erasure.mutate()}
      dataRightsPending={{
        buildExport: dataRights.buildExport.isPending,
        erasure: dataRights.erasure.isPending,
      }}
      dataRightsError={
        (dataRights.buildExport.isError ? messageOf(dataRights.buildExport.error) : undefined) ??
        (dataRights.erasure.isError ? messageOf(dataRights.erasure.error) : undefined) ??
        (delivery.memberDirect.isError ? messageOf(delivery.memberDirect.error) : undefined) ??
        (delivery.staffMediated.isError ? messageOf(delivery.staffMediated.error) : undefined) ??
        (correction.isError ? messageOf(correction.error) : undefined)
      }
      onDeliverMemberDirect={() => delivery.memberDirect.mutate()}
      onDeliverStaffMediated={(attestation) => delivery.staffMediated.mutate(attestation)}
      deliveryPending={{
        memberDirect: delivery.memberDirect.isPending,
        staffMediated: delivery.staffMediated.isPending,
      }}
      onRecordCorrection={(input) => correction.mutate(input)}
      correctionPending={correction.isPending}
      dataRightsNotice={
        dataRights.erasure.isSuccess
          ? resolveEn('helpdesk.dataRights.erasedNotice')
          : dataRights.buildExport.isSuccess
            ? resolveEn('helpdesk.dataRights.builtNotice')
            : undefined
      }
    />
  );
}
