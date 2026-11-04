// Workers awaiting approval — Story 13.1a (AC11 (b); AD2, AD12; TR5, TR12, TR16).
//
// A district choice whose DEFAULT is "All districts" (the client cannot tell a Pariwar Admin from a District Admin — AD11 — so a
// District Admin who leaves it gets the server's 403 and the guidance "choose a district you manage"), the `pending_kyc` list with
// "Load more", "Review" opening the audited identity panel, and "Approve" in it.
// The approve button mints a key PER CLICK (its body is `{}`) and REUSES it only to retry that same click (TR6); `mutateAsync` per
// act (TR12 — per-call `mutate` callbacks fire for the latest call only). Success announces the approval and the row leaves the list
// (the list is refreshed); a 409 `illegal_transition` reads "already approved or no longer awaiting" (TR5).

import type { ReactElement } from 'react';
import { useRef, useState } from 'react';

import { newIdempotencyKey, useApproveFieldWorker, useFieldWorkers } from '../../api/hooks.js';
import { DistrictPicker } from './DistrictPicker.js';
import { FieldWorkerNav } from './FieldWorkerNav.js';
import { WorkerDetail } from './WorkerDetail.js';
import { WorkerList } from './WorkerList.js';
import { fieldWorkerGuidance, type Guidance } from './derive.js';
import { resolveEn as t } from './i18n-en.js';

export function ApprovalsPage({ pariwarId }: { pariwarId: string }): ReactElement {
  const [district, setDistrict] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [announce, setAnnounce] = useState<string | null>(null);
  const [problem, setProblem] = useState<(Guidance & { forId: string }) | null>(null);
  const list = useFieldWorkers(pariwarId, 'pending_kyc', district);
  const approve = useApproveFieldWorker(pariwarId);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const listHeadingRef = useRef<HTMLHeadingElement>(null);
  // The key of the click being retried — kept ONLY while that click's result is a retryable failure.
  const retryKey = useRef<{ forId: string; key: string } | null>(null);
  const inFlight = useRef(false);

  const doApprove = async (fieldWorkerId: string, name: string): Promise<void> => {
    if (inFlight.current) return;
    const key = retryKey.current?.forId === fieldWorkerId ? retryKey.current.key : newIdempotencyKey();
    retryKey.current = { forId: fieldWorkerId, key };
    inFlight.current = true;
    setProblem(null);
    setAnnounce(null);
    try {
      await approve.mutateAsync({ fieldWorkerId, idempotencyKey: key });
      retryKey.current = null;
      setOpen(null);
      setAnnounce(t('fw.approvals.approved', { name }));
      headingRef.current?.focus();
    } catch (err) {
      const g = fieldWorkerGuidance(err);
      if (!g.retryable) retryKey.current = null;
      setProblem({ ...g, forId: fieldWorkerId });
    } finally {
      inFlight.current = false;
    }
  };

  return (
    <section className="flex max-w-4xl flex-col gap-4 p-4" data-testid="fw-approvals-page">
      <h1 ref={headingRef} tabIndex={-1} className="text-xl font-semibold outline-none">
        {t('fw.approvals.title')}
      </h1>
      <FieldWorkerNav pariwarId={pariwarId} current="approvals" />
      <p className="text-sm">{t('fw.approvals.intro')}</p>
      {announce !== null && (
        <p role="status" className="rounded bg-status-ok-bg p-2 text-sm text-status-ok-fg" data-testid="fw-approvals-announce">
          {announce}
        </p>
      )}
      <DistrictPicker
        pariwarId={pariwarId}
        value={district}
        onChange={(d) => {
          setDistrict(d);
          setOpen(null);
        }}
        allowAll
        testId="fw-approvals-district"
      />
      <h2 ref={listHeadingRef} tabIndex={-1} className="sr-only">
        {t('fw.approvals.title')}
      </h2>
      <WorkerList
        query={list}
        empty={t('fw.approvals.empty')}
        headingRef={listHeadingRef}
        noAccessText={district === null ? t('fw.noAccessDistrict') : t('fw.noAccess')}
        testId="fw-approvals-list"
        action={(item, register) => (
          <button
            type="button"
            ref={register}
            className="rounded border px-3 py-1 text-sm"
            onClick={() => {
              setProblem(null);
              setOpen(item.field_worker_id);
            }}
            aria-label={t('fw.approvals.reviewNamed', { name: item.name })}
            data-testid="fw-approvals-review"
          >
            {t('fw.approvals.review')}
          </button>
        )}
      />
      {open !== null && (
        <WorkerDetail key={open} pariwarId={pariwarId} fieldWorkerId={open} onClose={() => setOpen(null)}>
          {(name) => (
            <div className="flex flex-col gap-2">
              {problem !== null && problem.forId === open && (
                <p role="alert" className="text-sm text-status-fail-fg" data-testid="fw-approvals-error">
                  {problem.text}
                </p>
              )}
              <button
                type="button"
                className="self-start rounded bg-black px-3 py-1 text-sm text-white"
                onClick={() => void doApprove(open, name)}
                disabled={approve.isPending}
                aria-label={t('fw.approvals.approveNamed', { name })}
                data-testid="fw-approvals-approve"
              >
                {approve.isPending ? t('fw.approvals.approving') : problem?.retryable && problem.forId === open ? t('fw.retry') : t('fw.approvals.approve')}
              </button>
            </div>
          )}
        </WorkerDetail>
      )}
    </section>
  );
}
