// Story 6.28 (`2026-10-11-319` OP14 (b)) — ONE banner for every approval surface: another claim of this death has passed
// the final vote (this claim cannot be finally approved — the surface disables its FINAL approve) or is PAID (this claim
// should be closed — "Close this claim", where the viewer holds `cycle.freeze`). The other claim by its SHORT REFERENCE
// only (⛔ a name, ⛔ an id). Decision SUPPORT: OP2's gate is the control (a forced request still meets the 409).

import type { FinallyApprovedElsewhere } from '@twt/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ReactElement } from 'react';

import { ApiError, postCloseForPaidDeath } from '../../api/client.js';
import { verifierConsoleEn } from '../claim-verification/i18n-en.js';

const t = verifierConsoleEn.onePaymentPerDeath;

export interface FinallyApprovedElsewhereBannerProps {
  readonly elsewhere: FinallyApprovedElsewhere | null;
  readonly pariwarId: string;
  readonly claimCaseId: string;
  /** Offer "Close this claim" on a PAID banner (`false` on the District Admin's console — banner only). */
  readonly canClose: boolean;
  /** After the action answered — on top of the banner's own refetch of every active read. */
  readonly onClosed?: () => void;
}

export function FinallyApprovedElsewhereBanner({
  elsewhere,
  pariwarId,
  claimCaseId,
  canClose,
  onClosed,
}: FinallyApprovedElsewhereBannerProps): ReactElement | null {
  const qc = useQueryClient();
  const close = useMutation({
    mutationFn: () => postCloseForPaidDeath(pariwarId, claimCaseId),
    onSuccess: () => {
      void qc.invalidateQueries();
      onClosed?.();
    },
  });
  if (elsewhere === null) return null;
  const paid = elsewhere.stage === 'paid';
  const result =
    close.data !== undefined
      ? close.data.this_claim_closed
        ? t.closed
        : t.notClosed
      : close.error !== null
        ? close.error instanceof ApiError && close.error.status === 503
          ? t.busy
          : t.closeFailed
        : null;
  return (
    <div
      role="note"
      id={`finally-approved-elsewhere-${claimCaseId}`}
      data-testid={`finally-approved-elsewhere-${claimCaseId}`}
      className="flex flex-col gap-2 rounded border border-status-warn-fg bg-status-warn-bg p-2 text-sm text-status-warn-fg"
    >
      <p>{paid ? t.bannerPaid(elsewhere.claim_reference) : t.bannerVoted(elsewhere.claim_reference)}</p>
      {paid && canClose ? (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            data-testid={`close-for-paid-death-${claimCaseId}`}
            className="w-fit rounded border px-3 py-1 text-sm disabled:opacity-50"
            disabled={close.isPending || close.data?.this_claim_closed === true}
            onClick={() => close.mutate()}
          >
            {t.closeAction}
          </button>
          {result !== null ? (
            <span role="status" data-testid={`close-for-paid-death-result-${claimCaseId}`}>
              {result}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
