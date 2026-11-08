// One worker's identity panel — Story 13.1a (AC11 (b), (c); AD9, AD13). An audited read (`field_worker.view`): the name and the FULL
// mobile, fetched ONLY while the panel is open (it is mounted only then), and the query REMOVED on close (the
// `NomineeNameCheckDisclosure` precedent) so no decrypted identity outlives the panel. Both pages use it: the approvals page passes
// the approve button as `children`, the finder passes "Show code" — so a code can be asked for only with the identity on screen.
// `children` is called ONLY once the identity has loaded (never while loading, nor after a refusal). The heading takes focus when
// the panel opens. Story 13.1c (AD8): `children` also receives the worker's state and district (a SECOND argument, so the
// approvals page's one-argument child compiles unchanged) — the finder's acts read them from here, ⛔ from a second identity read
// (each is an audited decrypt); an act's 200 updates this query's data in place (`useFieldWorkerAct`).
//
// ⛔ The removal is in the explicit handlers (the Close button here; the approval in `ApprovalsPage`; a switch to another worker or
// another district in either page), NOT in an effect cleanup: a cleanup runs on StrictMode's simulated unmount too, which destroyed
// the in-flight query and made the remount read the identity a second time — a second audit line and a second decrypt for one click
// (review CR2). The hook's own `gcTime: 0` drops the query when the panel unmounts for any other reason (review CR48).

import { useQueryClient } from '@tanstack/react-query';
import type { FieldWorkerState } from '@twt/contracts';
import type { ReactElement, ReactNode } from 'react';
import { useEffect, useRef } from 'react';

import { fieldWorkerIdentityKey, fieldWorkerListIsStale, fieldWorkerListsKey, useFieldWorkerIdentity } from '../../api/hooks.js';
import { codeSmsLine, fieldWorkerGuidance, formatIstDate, needsSignIn, stateLabel, type Surface } from './derive.js';
import { resolveEn as t } from './i18n-en.js';
import { useSignInRedirect } from './sign-in.js';

export interface WorkerDetailProps {
  pariwarId: string;
  fieldWorkerId: string;
  onClose: () => void;
  /** Where the admin is — a refused read says what THAT screen needs (the 403 line differs by screen). */
  surface?: Surface;
  /** Rendered under the identity once it has loaded (the approve button, or "Show code" and the acts). */
  children?: (name: string, worker: WorkerSummary) => ReactNode;
}

/** What the acts need of the opened worker (Story 13.1c AD8) — ⛔ the mobile. `created_at` bounds the End date from below (review CR24). */
export interface WorkerSummary {
  readonly current_state: FieldWorkerState;
  readonly district: string;
  readonly created_at: string;
}

export function WorkerDetail({ pariwarId, fieldWorkerId, onClose, surface = 'approvals', children }: WorkerDetailProps): ReactElement {
  const qc = useQueryClient();
  const identity = useFieldWorkerIdentity(pariwarId, fieldWorkerId);
  const headingRef = useRef<HTMLHeadingElement>(null);
  useSignInRedirect(identity.isError && needsSignIn(identity.error));

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  // The worker moved meanwhile: the row that opened this panel is stale too, and nothing else refreshes it (review CR47).
  const staleList = identity.isError && fieldWorkerListIsStale(identity.error);
  useEffect(() => {
    if (staleList) void qc.invalidateQueries({ queryKey: fieldWorkerListsKey(pariwarId) });
  }, [staleList, qc, pariwarId]);

  const close = (): void => {
    qc.removeQueries({ queryKey: fieldWorkerIdentityKey(pariwarId, fieldWorkerId) });
    onClose();
  };

  const w = identity.data;
  const g = identity.isError ? fieldWorkerGuidance(identity.error, surface) : null;
  const codeSms = w === undefined ? null : codeSmsLine(w.code_sms_status);
  return (
    <section className="flex flex-col gap-2 rounded border p-3" aria-labelledby={`fw-detail-${fieldWorkerId}`} data-testid="fw-detail">
      <h2 id={`fw-detail-${fieldWorkerId}`} ref={headingRef} tabIndex={-1} className="text-lg font-semibold outline-none">
        {t('fw.detail.title')}
      </h2>
      {/* Mounted with the panel, and it says when the details arrive: on the Find screen that is the moment "Show code" appears (review CR39). */}
      <div role="status" data-testid="fw-detail-status">
        {/* `isPending`, not `isLoading`: a retry while offline is pending and paused, and must not leave an empty panel (review CR57). */}
        {identity.isPending && <p>{t('fw.loading')}</p>}
        {w !== undefined && <p className="sr-only">{t('fw.detail.loaded')}</p>}
      </div>
      {g !== null && (
        <div role="alert" className="flex flex-col gap-2 text-status-fail-fg">
          <p data-testid="fw-detail-error">{g.text}</p>
          {g.retryable === true && (
            <button
              type="button"
              className="self-start underline"
              onClick={() => {
                // The refetch unmounts this button: focus stays in the panel (review CR42).
                headingRef.current?.focus();
                void identity.refetch();
              }}
              data-testid="fw-detail-retry"
            >
              {t('fw.retry')}
            </button>
          )}
        </div>
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
            {codeSms !== null && (
              <>
                <dt className="font-medium">{t('fw.detail.codeSms')}</dt>
                <dd data-testid="fw-detail-code-sms">{codeSms}</dd>
              </>
            )}
          </dl>
          {children?.(w.name, { current_state: w.current_state, district: w.district, created_at: w.created_at })}
        </>
      )}
      <button type="button" className="self-start text-sm underline" onClick={close} data-testid="fw-detail-close">
        {t('fw.approvals.close')}
      </button>
    </section>
  );
}
