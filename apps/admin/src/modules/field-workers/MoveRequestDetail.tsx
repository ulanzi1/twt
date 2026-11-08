// One move request's detail panel — Story 13.1d (AC9; AD10 as amended by decision `-460`). Mounted only while open: its read is an
// AUDITED decrypt of the worker's name (one line a view), so the query is dropped on close (`gcTime: 0`) and never refetched in the
// background. It shows the request's history and the worker's WORK HISTORY: the current state, when they registered and started, each
// district with its dates and each suspension's dates — ⛔ a reason, an officer's name, the mobile or the code — and "Members brought in"
// with the `fw.requests.detail.notCounted` line until Story 13.8 can count them (`-460` item 4).

import type { ReactElement } from 'react';

import { useFieldWorkerMoveRequest } from '../../api/hooks.js';
import { fieldWorkerGuidance, formatIstDate, formatIstDateTime, stateLabel } from './derive.js';
import { resolveEn as t } from './i18n-en.js';

/** An IST day (`YYYY-MM-DD`) as the console writes dates — read as noon UTC so it is the same day in India. */
const day = (d: string): string => formatIstDate(`${d}T12:00:00Z`);

export function MoveRequestDetail({ pariwarId, moveRequestId }: { pariwarId: string; moveRequestId: string }): ReactElement {
  const q = useFieldWorkerMoveRequest(pariwarId, moveRequestId);
  if (q.isPending) return <p role="status">{t('fw.loading')}</p>;
  if (q.isError) {
    return (
      <p role="alert" className="text-sm text-status-fail-fg" data-testid="fw-request-detail-error">
        {fieldWorkerGuidance(q.error).text}
      </p>
    );
  }
  const { worker, events } = q.data;
  return (
    <section aria-label={t('fw.requests.detail.title', { name: worker.name })} className="flex flex-col gap-2 rounded border p-3 text-sm" data-testid="fw-request-detail">
      <h3 className="font-semibold">{t('fw.requests.detail.title', { name: worker.name })}</h3>
      <p>{t('fw.requests.detail.state', { state: stateLabel(worker.current_state) })}</p>
      {worker.registered_on !== null && <p>{t('fw.requests.detail.registeredOn', { date: day(worker.registered_on) })}</p>}
      <p data-testid="fw-request-detail-active">
        {worker.active_since === null ? t('fw.requests.detail.notApproved') : t('fw.requests.detail.activeSince', { date: day(worker.active_since) })}
      </p>
      <h4 className="font-semibold">{t('fw.requests.detail.districts')}</h4>
      <ul data-testid="fw-request-detail-districts">
        {worker.districts.map((d, i) => (
          <li key={i}>
            {d.to === null
              ? t('fw.requests.detail.districtSince', { district: d.district, from: day(d.from) })
              : t('fw.requests.detail.districtSpan', { district: d.district, from: day(d.from), to: day(d.to) })}
          </li>
        ))}
      </ul>
      <h4 className="font-semibold">{t('fw.requests.detail.suspensions')}</h4>
      {worker.suspensions.length === 0 ? (
        <p>{t('fw.requests.detail.noSuspensions')}</p>
      ) : (
        <ul data-testid="fw-request-detail-suspensions">
          {worker.suspensions.map((s, i) => (
            <li key={i}>
              {s.to === null ? t('fw.requests.detail.suspensionSince', { from: day(s.from) }) : t('fw.requests.detail.suspensionSpan', { from: day(s.from), to: day(s.to) })}
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
            {t(`fw.requests.event.${e.event_type}`)} — {formatIstDateTime(e.occurred_at)}
          </li>
        ))}
      </ol>
    </section>
  );
}
