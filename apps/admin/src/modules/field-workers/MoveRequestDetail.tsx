// One move request's detail panel — Story 13.1d (AC9; AD10 as amended by decision `-460`). Mounted only while open: its read is an
// AUDITED decrypt of the worker's name (one line a view), so the query is dropped on close (`gcTime: 0`) and never refetched in the
// background. It shows the request's history and the worker's WORK HISTORY: the current state, when they registered and started, each
// district with its dates and each suspension's dates — ⛔ a reason, an officer's name, the mobile or the code — and "Members brought in"
// with the `fw.requests.detail.notCounted` line until Story 13.8 can count them (`-460` item 4). The last district and a suspension that is
// open are OPEN-ENDED (`-460` item 1): for a worker whose work has ended, or a history cut at its cap (which keeps the OLDEST events),
// they read "from", ⛔ "since" - the worker is not there (code review CR49). A failed read says why in this surface's words, signs the
// officer back in on a 401, and can be tried again (CR46) - except a request that is gone, which says only that (RP-5). It is mounted from a
// row and from a notice's "View", so its DOM id is the mount's to choose (`domId`) - an id is unique (RP-13).

import type { ReactElement } from 'react';

import { useFieldWorkerMoveRequest } from '../../api/hooks.js';
import { formatIstDate, formatIstDateTime, requestDetailGuidance, stateLabel } from './derive.js';
import { resolveEn as t } from './i18n-en.js';
import { fieldWorkerRequestsPath } from '../../routes/login-next.js';
import { useSignInRedirect } from './sign-in.js';

/** An IST day (`YYYY-MM-DD`) as the console writes dates — read as noon UTC so it is the same day in India. */
const day = (d: string): string => formatIstDate(`${d}T12:00:00Z`);

export function MoveRequestDetail({ pariwarId, moveRequestId, domId }: { pariwarId: string; moveRequestId: string; domId?: string }): ReactElement {
  const q = useFieldWorkerMoveRequest(pariwarId, moveRequestId);
  const error = q.isError ? requestDetailGuidance(q.error) : null;
  useSignInRedirect(error?.signIn === true, fieldWorkerRequestsPath(pariwarId)); // AD10 — mounted on the Move requests page only
  if (q.isPending) return <p role="status">{t('fw.loading')}</p>;
  if (error !== null) {
    return (
      <div role="alert" className="flex flex-col gap-1 text-sm text-status-fail-fg" data-testid="fw-request-detail-error">
        <p>{error.text}</p>
        {error.noAccess !== true && error.gone !== true && (
          <button type="button" className="self-start rounded border px-3 py-1" onClick={() => void q.refetch()}>
            {t('fw.retry')}
          </button>
        )}
      </div>
    );
  }
  if (!q.isSuccess) return <p role="status">{t('fw.loading')}</p>;
  const { worker, events } = q.data;
  const notThere = worker.current_state === 'terminated' || worker.history_truncated;
  return (
    <section
      id={domId ?? `fw-request-detail-${moveRequestId}`}
      aria-label={t('fw.requests.detail.title', { name: worker.name })}
      className="flex flex-col gap-2 rounded border p-3 text-sm"
      data-testid="fw-request-detail"
    >
      <h3 className="font-semibold">{t('fw.requests.detail.title', { name: worker.name })}</h3>
      <p>{t('fw.requests.detail.state', { state: stateLabel(worker.current_state) })}</p>
      {worker.registered_on !== null && <p>{t('fw.requests.detail.registeredOn', { date: day(worker.registered_on) })}</p>}
      <p data-testid="fw-request-detail-active">
        {worker.active_since === null ? t('fw.requests.detail.notApproved') : t('fw.requests.detail.activeSince', { date: day(worker.active_since) })}
      </p>
      {worker.districts.length > 0 && (
        <>
          <h4 className="font-semibold">{t('fw.requests.detail.districts')}</h4>
          <ul data-testid="fw-request-detail-districts">
            {worker.districts.map((d, i) => (
              <li key={i}>
                {d.to !== null
                  ? t('fw.requests.detail.districtSpan', { district: d.district, from: day(d.from), to: day(d.to) })
                  : t(notThere ? 'fw.requests.detail.districtFrom' : 'fw.requests.detail.districtSince', { district: d.district, from: day(d.from) })}
              </li>
            ))}
          </ul>
        </>
      )}
      <h4 className="font-semibold">{t('fw.requests.detail.suspensions')}</h4>
      {worker.suspensions.length === 0 ? (
        <p>{t('fw.requests.detail.noSuspensions')}</p>
      ) : (
        <ul data-testid="fw-request-detail-suspensions">
          {worker.suspensions.map((s, i) => (
            <li key={i}>
              {s.to !== null
                ? t('fw.requests.detail.suspensionSpan', { from: day(s.from), to: day(s.to) })
                : t(notThere ? 'fw.requests.detail.suspensionFrom' : 'fw.requests.detail.suspensionSince', { from: day(s.from) })}
            </li>
          ))}
        </ul>
      )}
      <p data-testid="fw-request-detail-members">
        {t('fw.requests.detail.members')}: {worker.members_onboarded === null ? t('fw.requests.detail.notCounted') : worker.members_onboarded}
      </p>
      {worker.history_truncated && <p>{t('fw.requests.detail.truncated')}</p>}
      <h4 className="font-semibold">{t('fw.requests.detail.history')}</h4>
      <ol data-testid="fw-request-detail-events">
        {events.map((e) => (
          <li key={e.event_version}>
            {t(`fw.requests.event.${e.event_type}`)}
            {/* The `superseded` event has NO time (`-461` item 1: a time shown only for an ending would say "ended" by its absence). */}
            {e.occurred_at !== null && <> — {formatIstDateTime(e.occurred_at)}</>}
          </li>
        ))}
      </ol>
    </section>
  );
}
