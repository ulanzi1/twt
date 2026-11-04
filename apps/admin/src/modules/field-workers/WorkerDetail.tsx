// One worker's identity panel — Story 13.1a (AC11 (b); AD9). An audited read (`field_worker.view`): the name and the FULL mobile,
// fetched ONLY while the panel is open (`enabled`), and the query REMOVED on close (the `NomineeNameCheckDisclosure` precedent) so
// no decrypted identity outlives the panel. The approvals page passes an `approve` slot; the heading takes focus when it opens.

import { useQueryClient } from '@tanstack/react-query';
import type { ReactElement, ReactNode } from 'react';
import { useEffect, useRef } from 'react';

import { fieldWorkerIdentityKey, useFieldWorkerIdentity } from '../../api/hooks.js';
import { fieldWorkerGuidance, formatIstDate, stateLabel } from './derive.js';
import { resolveEn as t } from './i18n-en.js';

export interface WorkerDetailProps {
  pariwarId: string;
  fieldWorkerId: string;
  onClose: () => void;
  /** Rendered under the identity once it has loaded (the approve button). */
  children?: (name: string) => ReactNode;
}

export function WorkerDetail({ pariwarId, fieldWorkerId, onClose, children }: WorkerDetailProps): ReactElement {
  const qc = useQueryClient();
  const identity = useFieldWorkerIdentity(pariwarId, fieldWorkerId);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
    return () => qc.removeQueries({ queryKey: fieldWorkerIdentityKey(pariwarId, fieldWorkerId) });
  }, [qc, pariwarId, fieldWorkerId]);

  const w = identity.data;
  return (
    <section className="flex flex-col gap-2 rounded border p-3" aria-labelledby={`fw-detail-${fieldWorkerId}`} data-testid="fw-detail">
      <h2 id={`fw-detail-${fieldWorkerId}`} ref={headingRef} tabIndex={-1} className="text-lg font-semibold outline-none">
        {t('fw.detail.title')}
      </h2>
      {identity.isLoading && <p role="status">{t('fw.loading')}</p>}
      {identity.isError && (
        <p role="alert" className="text-status-fail-fg" data-testid="fw-detail-error">
          {fieldWorkerGuidance(identity.error).text}
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
            <dt className="font-medium">{stateLabel(w.current_state)}</dt>
            <dd>
              {t('fw.registeredBy', { name: w.registered_by_display })} · {t('fw.registeredOn', { date: formatIstDate(w.created_at) })}
              {w.approved_by_display !== null && <> · {t('fw.detail.approvedBy', { name: w.approved_by_display })}</>}
            </dd>
          </dl>
          {children?.(w.name)}
        </>
      )}
      <button type="button" className="self-start text-sm underline" onClick={onClose} data-testid="fw-detail-close">
        {t('fw.approvals.close')}
      </button>
    </section>
  );
}
