// A worker's history — Story 13.1c (AC10; AD7, AD8). `-441`: "Keep the full log of field worker."
//
// Nothing is read until the officer presses "Show history" (an explicit click), then the worker's log a page at a time with "Load
// more". The log holds no name, mobile or code; each entry says what happened, when (India time), by which officer — their CURRENT
// display name, or "an officer (name not recorded)", ⛔ an email (AD7) — in what role, and the reason, districts and date where the
// event has them. A worker moved between districts shows their whole history (the log follows the worker). A 403 shows the history's
// own "no access" line. The query is dropped with the panel (`gcTime: 0`).

import type { FieldWorkerLogItem } from '@twt/contracts';
import type { ReactElement } from 'react';
import { useId, useState } from 'react';

import { useFieldWorkerLog } from '../../api/hooks.js';
import { fieldWorkerGuidance, formatIstDateTime, needsSignIn, reasonLabel, roleLabel } from './derive.js';
import { resolveEn as t } from './i18n-en.js';
import { useSignInRedirect } from './sign-in.js';

export function WorkerHistory({ pariwarId, fieldWorkerId }: { pariwarId: string; fieldWorkerId: string }): ReactElement {
  const [shown, setShown] = useState(false);
  const log = useFieldWorkerLog(pariwarId, fieldWorkerId, shown);
  const ids = useId();
  useSignInRedirect(log.isError && needsSignIn(log.error));

  const items = log.data?.pages.flatMap((p) => p.items) ?? [];
  const g = log.isError ? fieldWorkerGuidance(log.error, 'history') : null;
  const moreFailed = log.isFetchNextPageError;

  return (
    <section className="flex flex-col gap-2 border-t pt-2" aria-labelledby={`${ids}-title`} data-testid="fw-history">
      <h3 id={`${ids}-title`} className="font-medium">
        {t('fw.history.title')}
      </h3>
      {!shown && (
        <button type="button" className="self-start rounded border px-3 py-1 text-sm" onClick={() => setShown(true)} data-testid="fw-history-show">
          {t('fw.history.show')}
        </button>
      )}
      <div role="status" data-testid="fw-history-status">
        {shown && log.isPending && <p>{t('fw.loading')}</p>}
        {log.isSuccess && <p className="sr-only">{t('fw.history.loaded')}</p>}
      </div>
      {g !== null && !moreFailed && (
        <div role="alert" className="flex flex-col gap-1 text-sm text-status-fail-fg">
          <p data-testid="fw-history-error">{g.text}</p>
          {g.retryable === true && (
            <button type="button" className="self-start underline" onClick={() => void log.refetch()} data-testid="fw-history-retry">
              {t('fw.retry')}
            </button>
          )}
        </div>
      )}
      {log.isSuccess && items.length === 0 && <p className="text-sm">{t('fw.history.empty')}</p>}
      {items.length > 0 && (
        <ol className="flex flex-col gap-2 text-sm" data-testid="fw-history-list">
          {items.map((e) => (
            <li key={e.event_version} data-testid="fw-history-item">
              <p className="font-medium">{t(`fw.history.event.${e.event_type}`)}</p>
              <p>
                {formatIstDateTime(e.occurred_at)} ·{' '}
                {t('fw.history.by', { name: e.actor.display_name ?? t('fw.history.unknownOfficer'), role: roleLabel(e.actor.role) })}
              </p>
              {details(e).map((line) => (
                <p key={line}>{line}</p>
              ))}
            </li>
          ))}
        </ol>
      )}
      {moreFailed && (
        <p role="alert" className="text-sm text-status-fail-fg" data-testid="fw-history-more-error">
          {t('fw.history.moreError')}
        </p>
      )}
      {log.hasNextPage && (
        <button
          type="button"
          className="self-start text-sm underline"
          disabled={log.isFetchingNextPage}
          onClick={() => void log.fetchNextPage()}
          data-testid="fw-history-more"
        >
          {log.isFetchingNextPage ? t('fw.loading') : t('fw.history.more')}
        </button>
      )}
    </section>
  );
}

/** The lines under an entry: where it happened, a move's two ends, the reason, an ending's date (for `died`, the date of death). */
function details(e: FieldWorkerLogItem): string[] {
  const out: string[] = [];
  if (e.event_type === 'field_worker.posted' && e.from_district !== null && e.to_district !== null) {
    out.push(t('fw.history.move', { from: e.from_district, to: e.to_district }));
  } else if (e.target_district !== null) {
    out.push(t('fw.history.district', { district: e.target_district }));
  }
  if (e.reason_code !== null) out.push(t('fw.history.reason', { reason: reasonLabel(e.reason_code) }));
  if (e.ended_on !== null) out.push(t(e.reason_code === 'died' ? 'fw.history.dateOfDeath' : 'fw.history.lastDay', { date: e.ended_on }));
  return out;
}
