// One worker's identity panel — Story 13.1a (AC11 (b), (c); AD9, AD13). An audited read (`field_worker.view`): the name and the FULL
// mobile, fetched ONLY while the panel is open (it is mounted only then), and the query REMOVED on close (the
// `NomineeNameCheckDisclosure` precedent) so no decrypted identity outlives the panel. Both pages use it: the approvals page passes
// the approve button as `children`, the finder passes "Show code" — so a code can be asked for only with the identity on screen.
// `children` is called ONLY once the identity has loaded (never while loading, nor after a refusal). The heading takes focus when
// the panel opens.
//
// ⛔ The removal is in the explicit handlers (the Close button here; the approval in `ApprovalsPage`; a switch to another worker or
// another district in either page), NOT in an effect cleanup: a cleanup runs on StrictMode's simulated unmount too, which destroyed
// the in-flight query and made the remount read the identity a second time — a second audit line and a second decrypt for one click
// (review CR2). The client's `gcTime: 0` drops the query when the panel unmounts for any other reason.

import { useQueryClient } from '@tanstack/react-query';
import type { ReactElement, ReactNode } from 'react';
import { useEffect, useRef } from 'react';

import { fieldWorkerIdentityKey, useFieldWorkerIdentity } from '../../api/hooks.js';
import { fieldWorkerGuidance, formatIstDate, needsSignIn, stateLabel, type Surface } from './derive.js';
import { resolveEn as t } from './i18n-en.js';
import { useSignInRedirect } from './sign-in.js';

export interface WorkerDetailProps {
  pariwarId: string;
  fieldWorkerId: string;
  onClose: () => void;
  /** Where the admin is — a refused read says what THAT screen needs (the 403 line differs by screen). */
  surface?: Surface;
  /** Rendered under the identity once it has loaded (the approve button, or "Show code"). */
  children?: (name: string) => ReactNode;
}

export function WorkerDetail({ pariwarId, fieldWorkerId, onClose, surface = 'approvals', children }: WorkerDetailProps): ReactElement {
  const qc = useQueryClient();
  const identity = useFieldWorkerIdentity(pariwarId, fieldWorkerId);
  const headingRef = useRef<HTMLHeadingElement>(null);
  useSignInRedirect(identity.isError && needsSignIn(identity.error));

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const close = (): void => {
    qc.removeQueries({ queryKey: fieldWorkerIdentityKey(pariwarId, fieldWorkerId) });
    onClose();
  };

  const w = identity.data;
  return (
    <section className="flex flex-col gap-2 rounded border p-3" aria-labelledby={`fw-detail-${fieldWorkerId}`} data-testid="fw-detail">
      <h2 id={`fw-detail-${fieldWorkerId}`} ref={headingRef} tabIndex={-1} className="text-lg font-semibold outline-none">
        {t('fw.detail.title')}
      </h2>
      {identity.isLoading && <p role="status">{t('fw.loading')}</p>}
      {identity.isError && (
        <p role="alert" className="text-status-fail-fg" data-testid="fw-detail-error">
          {fieldWorkerGuidance(identity.error, surface).text}
        </p>
      )}
      {w !== undefined && (
        <>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="font-medium">{t('fw.register.name')}</dt>
            <dd data-testid="fw-detail-name">{w.name}</dd>
            <dt className="font-medium">{t('fw.detail.mobile')}</dt>
            <dd data-testid="fw-detail-mobile">{w.mobile}</dd>
            <dt className="font-medium">{t('fw.district')}</dt>
            <dd>{w.district}</dd>
            <dt className="font-medium">{t('fw.detail.state')}</dt>
            <dd>{stateLabel(w.current_state)}</dd>
            <dt className="font-medium">{t('fw.detail.registration')}</dt>
            <dd>
              {t('fw.registeredBy', { name: w.registered_by_display })} · {t('fw.registeredOn', { date: formatIstDate(w.created_at) })}
            </dd>
            {w.approved_by_display !== null && (
              <>
                <dt className="font-medium">{t('fw.detail.approval')}</dt>
                <dd data-testid="fw-detail-approved-by">{t('fw.detail.approvedBy', { name: w.approved_by_display })}</dd>
              </>
            )}
          </dl>
          {children?.(w.name)}
        </>
      )}
      <button type="button" className="self-start text-sm underline" onClick={close} data-testid="fw-detail-close">
        {t('fw.approvals.close')}
      </button>
    </section>
  );
}
