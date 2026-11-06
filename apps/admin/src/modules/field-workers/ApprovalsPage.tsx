// Workers awaiting approval — Story 13.1a (AC11 (b); AD2, AD12; TR5, TR12, TR16).
//
// A district choice whose DEFAULT is "All districts" (the client cannot tell a Pariwar Admin from a District Admin — AD11 — so a
// District Admin who leaves it gets the server's 403 and the guidance "choose a district you manage"), the `pending_kyc` list with
// "Load more", "Review" opening the audited identity panel, and "Approve" in it.
// The approve button mints a key PER CLICK (its body is `{}`) and REUSES it only to retry that same click (TR6); `mutateAsync` per
// act (TR12 — per-call `mutate` callbacks fire for the latest call only). Success announces the approval and the row leaves the list
// (the list is refreshed); a 409 `illegal_transition` reads "already approved or no longer awaiting" (TR5).
//
// An approval can finish while the admin is reading ANOTHER worker's panel (review CR9): the panel is closed and the heading focused
// ONLY when the finished worker is the open one; a failure for a worker whose panel is not open is said in a banner by the list.
// A failed approval of the open worker moves focus to the heading (AC11 (d)). The identity read of a finished worker is removed.

import { useQueryClient } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { useRef, useState } from 'react';

import { fieldWorkerIdentityKey, newIdempotencyKey, useApproveFieldWorker, useFieldWorkers } from '../../api/hooks.js';
import { DistrictPicker } from './DistrictPicker.js';
import { FieldWorkerNav } from './FieldWorkerNav.js';
import { WorkerDetail } from './WorkerDetail.js';
import { WorkerList } from './WorkerList.js';
import { fieldWorkerGuidance, type Guidance } from './derive.js';
import { resolveEn as t } from './i18n-en.js';
import { useSignInRedirect } from './sign-in.js';

/** `banner`: the failed worker's panel was not open when it failed, so the words are said by the list instead. */
type Problem = Guidance & { forId: string; name: string; banner: boolean };

export function ApprovalsPage({ pariwarId }: { pariwarId: string }): ReactElement {
  const qc = useQueryClient();
  const [district, setDistrict] = useState<string | null>(null);
  const [open, setOpenState] = useState<string | null>(null);
  const [announce, setAnnounce] = useState<string | null>(null);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const list = useFieldWorkers(pariwarId, 'pending_kyc', district);
  const approve = useApproveFieldWorker(pariwarId);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const listHeadingRef = useRef<HTMLHeadingElement>(null);
  // The panel open NOW — an approval that finishes late compares against this, not against the render it was clicked in.
  const openRef = useRef<string | null>(null);
  const reviewButtons = useRef(new Map<string, HTMLElement>());
  // The key of the click being retried — kept ONLY while that click's result is a retryable failure.
  const retryKey = useRef<{ forId: string; key: string } | null>(null);
  const inFlight = useRef(false);
  useSignInRedirect(problem?.signIn === true);

  const setOpen = (id: string | null): void => {
    openRef.current = id;
    setOpenState(id);
  };
  /** No decrypted identity outlives its panel: the explicit removal (the hook's `gcTime: 0` is only the backstop). */
  const forget = (id: string | null): void => {
    if (id !== null) qc.removeQueries({ queryKey: fieldWorkerIdentityKey(pariwarId, id) });
  };
  // The Close button (WorkerDetail) has already removed the identity; the page puts focus back where the admin pressed Review.
  const closePanel = (): void => {
    const was = openRef.current;
    setOpen(null);
    setProblem((p) => (p?.banner === true ? p : null));
    // The row may have left the list while the panel was open: a 409 refreshes it (review CR46).
    if (was !== null) (reviewButtons.current.get(was) ?? headingRef.current)?.focus();
  };

  const doApprove = async (fieldWorkerId: string, name: string): Promise<void> => {
    if (inFlight.current) return;
    const key = retryKey.current?.forId === fieldWorkerId ? retryKey.current.key : newIdempotencyKey();
    retryKey.current = { forId: fieldWorkerId, key };
    inFlight.current = true;
    setApprovingId(fieldWorkerId);
    setProblem(null);
    setAnnounce(null);
    try {
      await approve.mutateAsync({ fieldWorkerId, idempotencyKey: key });
      retryKey.current = null;
      forget(fieldWorkerId);
      setAnnounce(t('fw.approvals.approved', { name }));
      if (openRef.current === fieldWorkerId) {
        setOpen(null);
        headingRef.current?.focus();
      }
    } catch (err) {
      const g = fieldWorkerGuidance(err, 'approvals');
      if (!g.retryable) retryKey.current = null;
      const isOpen = openRef.current === fieldWorkerId;
      setProblem({ ...g, forId: fieldWorkerId, name, banner: !isOpen });
      if (isOpen) headingRef.current?.focus();
    } finally {
      inFlight.current = false;
      setApprovingId(null);
    }
  };

  return (
    <section className="flex max-w-4xl flex-col gap-4 p-4" data-testid="fw-approvals-page">
      <h1 ref={headingRef} tabIndex={-1} className="text-xl font-semibold outline-none">
        {t('fw.approvals.title')}
      </h1>
      <FieldWorkerNav pariwarId={pariwarId} current="approvals" />
      <p className="text-sm">{t('fw.approvals.intro')}</p>
      {/* Mounted empty: a status node that arrives already holding its text is announced unreliably, and a late approval has only this. */}
      <div role="status" data-testid="fw-approvals-status">
        {announce !== null && (
          <p className="rounded bg-status-ok-bg p-2 text-sm text-status-ok-fg" data-testid="fw-approvals-announce">
            {announce}
          </p>
        )}
      </div>
      {problem?.banner === true && (
        <p role="alert" className="rounded p-2 text-sm text-status-fail-fg" data-testid="fw-approvals-banner-error">
          {t('fw.approvals.failedNamed', { name: problem.name, reason: problem.text })}
        </p>
      )}
      <DistrictPicker
        pariwarId={pariwarId}
        value={district}
        onChange={(d) => {
          forget(openRef.current);
          setDistrict(d);
          setOpen(null);
          setProblem((p) => (p?.banner === true ? p : null));
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
        filterKey={JSON.stringify(district)}
        testId="fw-approvals-list"
        action={(item, register) => (
          <button
            type="button"
            ref={(el) => {
              register(el);
              if (el === null) reviewButtons.current.delete(item.field_worker_id);
              else reviewButtons.current.set(item.field_worker_id, el);
            }}
            className="rounded border px-3 py-1 text-sm"
            onClick={() => {
              // Pressed again on the worker already open: nothing to do. Replacing the panel with itself would empty its identity
              // from the cache while it stays mounted, and the next render would read (and audit) it anew.
              if (openRef.current === item.field_worker_id) return;
              forget(openRef.current);
              setProblem((p) => (p?.banner === true ? p : null));
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
        <WorkerDetail key={open} pariwarId={pariwarId} fieldWorkerId={open} onClose={closePanel}>
          {(name) => (
            <div className="flex flex-col gap-2">
              {problem !== null && !problem.banner && problem.forId === open && (
                <p role="alert" className="text-sm text-status-fail-fg" data-testid="fw-approvals-error">
                  {problem.text}
                </p>
              )}
              <button
                type="button"
                className="self-start rounded bg-black px-3 py-1 text-sm text-white"
                onClick={() => void doApprove(open, name)}
                disabled={approvingId !== null}
                data-testid="fw-approvals-approve"
              >
                {approvingId === open ? t('fw.approvals.approving') : problem?.retryable && problem.forId === open ? t('fw.retry') : t('fw.approvals.approve')}
                <span className="sr-only"> {t('fw.forName', { name })}</span>
              </button>
            </div>
          )}
        </WorkerDetail>
      )}
    </section>
  );
}
