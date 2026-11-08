// A worker's history — Story 13.1c (AC10; AD7, AD8). `-441`: "Keep the full log of field worker."
//
// Nothing is read until the officer presses "Show history" (an explicit click), then the worker's log a page at a time with "Load
// more". The log holds no name, mobile or code; each entry says what happened, when (India time), by which officer — their CURRENT
// display name, or "an officer (name not recorded)", ⛔ an email (AD7) — in what role, and the reason, districts and date where the
// event has them. A worker moved between districts shows their whole history (the log follows the worker). A 403 shows the history's
// own "no access" line. The query is dropped with the panel (`gcTime: 0`).
//
// Focus and announcements (checklist family 13 (d); the `WorkerList` convention): pressing "Show history" unmounts that button, so focus
// moves to the history's heading; "Load more" says how many entries arrived in the status region and moves focus to the first new one
// (unless the officer has gone elsewhere meanwhile), or to the heading when the last page was empty.

import type { FieldWorkerLogItem } from '@twt/contracts';
import type { MouseEvent, ReactElement } from 'react';
import { useEffect, useId, useRef, useState } from 'react';

import { useFieldWorkerLog } from '../../api/hooks.js';
import { focusIfUnclaimed } from '../marketplace/focus.js';
import { fieldWorkerGuidance, formatIstDate, formatIstDateTime, needsSignIn, reasonLabel, roleLabel } from './derive.js';
import { resolveEn as t } from './i18n-en.js';
import { useSignInRedirect } from './sign-in.js';

export function WorkerHistory({ pariwarId, fieldWorkerId }: { pariwarId: string; fieldWorkerId: string }): ReactElement {
  const [shown, setShown] = useState(false);
  /** What the last "Load more" added: how many, and the first new entry (null: the page was empty). */
  const [revealed, setRevealed] = useState<{ n: number; firstVersion: number | null } | null>(null);
  const log = useFieldWorkerLog(pariwarId, fieldWorkerId, shown);
  const ids = useId();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const moreButton = useRef<HTMLButtonElement | null>(null);
  const entryRefs = useRef(new Map<number, HTMLLIElement>());
  useSignInRedirect(log.isError && needsSignIn(log.error));

  const items = log.data?.pages.flatMap((p) => p.items) ?? [];
  const g = log.isError ? fieldWorkerGuidance(log.error, 'history') : null;
  const moreFailed = log.isFetchNextPageError;

  // The new entries are in the DOM when this runs: focus the first (a `li` with `tabIndex={-1}`), the heading if there was none.
  useEffect(() => {
    if (revealed === null) return;
    const target = revealed.firstVersion === null ? titleRef.current : (entryRefs.current.get(revealed.firstVersion) ?? titleRef.current);
    focusIfUnclaimed(target, moreButton.current);
  }, [revealed]);

  const loadMore = (e: MouseEvent<HTMLButtonElement>): void => {
    const before = items.length;
    moreButton.current = e.currentTarget;
    setRevealed(null);
    void log.fetchNextPage().then((r) => {
      if (r.isFetchNextPageError) {
        // The failure is said beside the button; the pressed (disabled while fetching) button gets focus back if nothing else has it.
        focusIfUnclaimed(moreButton.current, moreButton.current);
        return;
      }
      const after = r.data?.pages.flatMap((p) => p.items) ?? [];
      const n = Math.max(0, after.length - before); // a refetch of every page can reshape the list under the count: never negative
      setRevealed({ n, firstVersion: n === 0 ? null : (after[before]?.event_version ?? null) });
    });
  };

  return (
    <section className="flex flex-col gap-2 border-t pt-2" aria-labelledby={`${ids}-title`} data-testid="fw-history">
      <h3 id={`${ids}-title`} ref={titleRef} tabIndex={-1} className="font-medium outline-none">
        {t('fw.history.title')}
      </h3>
      {!shown && (
        <button
          type="button"
          className="self-start rounded border px-3 py-1 text-sm"
          onClick={() => {
            titleRef.current?.focus(); // the pressed button unmounts: focus must not fall to the body
            setShown(true);
          }}
          data-testid="fw-history-show"
        >
          {t('fw.history.show')}
        </button>
      )}
      <div role="status" data-testid="fw-history-status">
        {shown && log.isPending && <p>{t('fw.loading')}</p>}
        {log.isSuccess && <p className="sr-only">{t('fw.history.loaded')}</p>}
        {revealed !== null && (
          <p className="text-sm" data-testid="fw-history-revealed">
            {revealed.n === 0 ? t('fw.history.noMore') : revealed.n === 1 ? t('fw.history.moreShownOne') : t('fw.history.moreShown', { n: revealed.n })}
          </p>
        )}
      </div>
      {g !== null && !moreFailed && (
        <div role="alert" className="flex flex-col gap-1 text-sm text-status-fail-fg">
          <p data-testid="fw-history-error">{g.text}</p>
          {g.retryable === true && (
            <button
              type="button"
              className="self-start underline"
              onClick={() => {
                titleRef.current?.focus(); // the refetch unmounts this button: focus stays in the panel (the module's CR42 rule)
                void log.refetch();
              }}
              data-testid="fw-history-retry"
            >
              {t('fw.retry')}
            </button>
          )}
        </div>
      )}
      {log.isSuccess && items.length === 0 && <p className="text-sm">{t('fw.history.empty')}</p>}
      {items.length > 0 && (
        <ol className="flex flex-col gap-2 text-sm" data-testid="fw-history-list">
          {items.map((e) => (
            <li
              key={e.event_version}
              ref={(el) => {
                if (el === null) entryRefs.current.delete(e.event_version);
                else entryRefs.current.set(e.event_version, el);
              }}
              tabIndex={-1}
              className="outline-none"
              data-testid="fw-history-item"
            >
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
          // As `WorkerList`'s: not while ANY fetch runs (a next page would cancel an act's refresh of the pages shown), and not after a
          // failed refresh over the rows (review PR10); a retryable failure of the next page itself leaves it pressable.
          disabled={log.isFetching || (log.isError && !(log.isFetchNextPageError && g?.retryable === true))}
          onClick={loadMore}
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
  if (e.ended_on !== null) out.push(t(e.reason_code === 'died' ? 'fw.history.dateOfDeath' : 'fw.history.lastDay', { date: formatIstDate(e.ended_on) }));
  return out;
}
