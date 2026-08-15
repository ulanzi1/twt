// `<HelpdeskDetailPage>` — the responder ticket-detail container (Story 10.4, Task 7; AC2/AC3).
//
// Wires `useHelpdeskTicket` + the three transition mutations (`useHelpdeskTransitions`) around the pure
// `<HelpdeskDetailShell>`. Each mutation invalidates the ticket + queue queries so the console
// re-renders the new state + thread.

import { DPDPA_DATA_RIGHTS_SUBCATEGORY } from '@twt/contracts';
import type { ReactElement } from 'react';
import { useState } from 'react';

import { ApiError } from '../../api/client.js';
import {
  useActiveDataRightsExport,
  useDataRightsDelivery,
  useDataRightsFulfilment,
  useHelpdeskTicket,
  useHelpdeskTransitions,
  useRecordCorrection,
  useRequestDataRightsStepUp,
  useVerifyStepUp,
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
  // ⚠ `exportId` comes from the build result FIRST — freshest in the common case, and available the
  // instant a build succeeds without waiting on a refetch. ⭐ CODE-REVIEW ADDITION: falls back to
  // `useActiveDataRightsExport`'s server-recovered value so a page reload after a successful build
  // does not strand the operator (previously this was in-memory `useMutation` state ONLY, lost on
  // reload even though a `ready` export already existed server-side).
  // ⛔ The same predicate the shell uses to decide whether to SHOW the panel — see the hook.
  const isDataRightsTicket =
    ticket.data?.sub_category === DPDPA_DATA_RIGHTS_SUBCATEGORY &&
    ticket.data?.subject_member_id !== null;
  const activeExport = useActiveDataRightsExport(
    pariwarId,
    ticket.data?.subject_member_id ?? null,
    isDataRightsTicket,
  );
  const builtExportId = dataRights.buildExport.data?.export_id ?? activeExport.data?.export_id ?? null;
  const delivery = useDataRightsDelivery(
    pariwarId,
    ticketId,
    ticket.data?.subject_member_id ?? null,
    builtExportId,
  );
  const correction = useRecordCorrection(pariwarId, ticketId, ticket.data?.subject_member_id ?? null);

  // ── Story 10.21 round-2 code review — THE DATA-RIGHTS STEP-UP, which had no UI at all ────────────
  //
  // ⛔ Every route on this panel carries `requireStepUp(DATA_RIGHTS_STEP_UP_CONTEXT)`, and
  // `requestDataRightsStepUp` shipped defined-and-uncalled: an operator clicked any button, got a bare
  // 403, and there was no affordance ANYWHERE in the app to elevate. The feature was unusable
  // end-to-end while its integration test proved only that the 403 existed.
  // ⚠ Follows the shipped exemplar exactly (`ModerationSection.tsx`, and four other surfaces): a
  // `step_up_required` 403 is the SIGNAL to elevate, not a hard error; the attempted action is held so
  // the SAME action is re-submitted after verification.
  const requestStepUp = useRequestDataRightsStepUp();
  const verifyStepUp = useVerifyStepUp();
  const [stepUpRetry, setStepUpRetry] = useState<{ run: () => Promise<unknown> } | null>(null);
  const [otp, setOtp] = useState('');

  /** Wrap an action so a step-up 403 opens the elevation slot instead of dead-ending in an error. */
  const withStepUp =
    (run: () => Promise<unknown>): (() => void) =>
    (): void => {
      setStepUpRetry(null);
      void run().catch((err: unknown) => {
        if (err instanceof ApiError && err.code === 'auth.step_up_required') {
          setStepUpRetry({ run });
          requestStepUp.mutate();
        }
        // ⚠ Otherwise swallowed HERE only — every mutation's own `isError`/`error` still feeds
        // `dataRightsError` below, so the operator sees it. Rethrowing would surface as an unhandled
        // rejection from an onClick handler.
      });
    };

  const verifyStepUpCode = (): void => {
    const code = otp.trim();
    if (code === '' || stepUpRetry === null) return;
    const retry = stepUpRetry.run;
    verifyStepUp.mutate(code, {
      onSuccess: () => {
        setStepUpRetry(null);
        setOtp('');
        // Reset so a LATER elevation starts from a fresh "send code" state rather than stale isSuccess
        // (the Story 6.3 review finding).
        requestStepUp.reset();
        void retry().catch(() => undefined);
      },
    });
  };

  const stepUpSlot =
    stepUpRetry === null ? null : (
      <div className="flex flex-col gap-2 rounded border p-3" data-testid="datarights-step-up">
        <p className="text-sm">{resolveEn('helpdesk.dataRights.stepUpPrompt')}</p>
        <label className="text-xs font-medium" htmlFor="datarights-otp">
          {resolveEn('helpdesk.dataRights.stepUpLabel')}
        </label>
        <input
          id="datarights-otp"
          data-testid="datarights-otp"
          className="rounded border p-1 text-sm"
          value={otp}
          inputMode="numeric"
          onChange={(e) => setOtp(e.target.value)}
        />
        <button
          type="button"
          data-testid="datarights-otp-verify"
          className="self-start rounded bg-blue-700 px-3 py-1 text-sm font-semibold text-white disabled:opacity-50"
          disabled={verifyStepUp.isPending}
          onClick={verifyStepUpCode}
        >
          {verifyStepUp.isPending
            ? resolveEn('helpdesk.action.pending')
            : resolveEn('helpdesk.dataRights.stepUpVerify')}
        </button>
        {verifyStepUp.isError && (
          <p role="alert" className="text-xs text-red-700">{messageOf(verifyStepUp.error)}</p>
        )}
        {requestStepUp.isError && (
          <p role="alert" className="text-xs text-red-700" data-testid="datarights-otp-request-error">
            {messageOf(requestStepUp.error)}
          </p>
        )}
      </div>
    );

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
      onBuildExport={withStepUp(() => dataRights.buildExport.mutateAsync())}
      onFulfilErasure={withStepUp(() => dataRights.erasure.mutateAsync())}
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
      onDeliverMemberDirect={withStepUp(() => delivery.memberDirect.mutateAsync())}
      onDeliverStaffMediated={(attestation) => withStepUp(() => delivery.staffMediated.mutateAsync(attestation))()}
      deliveryPending={{
        memberDirect: delivery.memberDirect.isPending,
        staffMediated: delivery.staffMediated.isPending,
      }}
      onRecordCorrection={(input) => withStepUp(() => correction.mutateAsync(input))()}
      correctionPending={correction.isPending}
      dataRightsStepUp={stepUpSlot}
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
