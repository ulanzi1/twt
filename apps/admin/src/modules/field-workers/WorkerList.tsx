// A keyset list of field workers with "Load more" — Story 13.1a (AC11 (b), (c)). Shared by the approvals page and the finder; each
// supplies the row's action. Names arrive decrypted for this screen only (AD9); a failed page shows the server's own guidance.
//
// "Load more" moves focus to the first new row's action (the 12.2 `ModulesPage` precedent — ⛔ when the admin has moved focus
// elsewhere meanwhile) and announces how many rows arrived; an empty last page says so and focuses the list heading.

import type { FieldWorkerListItem, FieldWorkerListResponse } from '@twt/contracts';
import type { InfiniteData, UseInfiniteQueryResult } from '@tanstack/react-query';
import type { MouseEvent, ReactElement, ReactNode, RefObject } from 'react';
import { useEffect, useRef, useState } from 'react';

import { focusIfUnclaimed } from '../marketplace/focus.js';
import { fieldWorkerGuidance, formatIstDate, stateLabel } from './derive.js';
import { resolveEn as t } from './i18n-en.js';

export interface WorkerListProps {
  query: UseInfiniteQueryResult<InfiniteData<FieldWorkerListResponse>>;
  empty: string;
  headingRef: RefObject<HTMLHeadingElement | null>;
  /** The row's action; it registers its focusable element so "Load more" can move focus to the first new row. */
  action: (item: FieldWorkerListItem, register: (el: HTMLElement | null) => void) => ReactNode;
  /** A 403 on the list — the page's own words (a District Admin who chose "All districts" is told to choose one). */
  noAccessText: string;
  testId: string;
}

export function WorkerList({ query, empty, headingRef, action, noAccessText, testId }: WorkerListProps): ReactElement {
  const items = query.data?.pages.flatMap((p) => p.items) ?? [];
  const [revealed, setRevealed] = useState<{ firstId: string | null; n: number } | null>(null);
  const actions = useRef(new Map<string, HTMLElement>());
  const moreButton = useRef<HTMLButtonElement | null>(null);
  const focused = useRef(false);

  // The query's observer may render the new rows AFTER `revealed` is set, so this waits for the first new row's action to mount
  // (`items.length`) and moves focus ONCE per "Load more".
  useEffect(() => {
    if (revealed === null || focused.current) return;
    const target = revealed.firstId === null ? headingRef.current : actions.current.get(revealed.firstId);
    if (target === undefined) return;
    focused.current = true;
    focusIfUnclaimed(target, moreButton.current);
  }, [revealed, headingRef, items.length]);

  const loadMore = (e: MouseEvent<HTMLButtonElement>): void => {
    const before = items.length;
    moreButton.current = e.currentTarget;
    focused.current = false;
    setRevealed(null);
    void query.fetchNextPage().then((r) => {
      if (r.isFetchNextPageError) return;
      const after = r.data?.pages.flatMap((p) => p.items) ?? [];
      const first = after[before];
      if (first !== undefined) setRevealed({ firstId: first.field_worker_id, n: after.length - before });
      else if (!r.hasNextPage) setRevealed({ firstId: null, n: 0 });
    });
  };

  if (query.isLoading) return <p role="status">{t('fw.loading')}</p>;
  if (query.isError) {
    const g = fieldWorkerGuidance(query.error);
    return (
      <div role="alert" className="flex flex-col gap-2 text-status-fail-fg" data-testid={`${testId}-error`}>
        <p>{g.noAccess ? noAccessText : g.text}</p>
        {g.retryable && (
          <button type="button" className="self-start underline" onClick={() => void query.refetch()}>
            {t('fw.retry')}
          </button>
        )}
      </div>
    );
  }
  if (items.length === 0) return <p data-testid={`${testId}-empty`}>{empty}</p>;

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col divide-y rounded border" data-testid={testId}>
        {items.map((item) => (
          <li key={item.field_worker_id} className="flex flex-wrap items-center justify-between gap-2 p-2" data-testid={`${testId}-row`}>
            <div className="flex flex-col">
              <span className="font-medium">{item.name}</span>
              <span className="text-xs">
                {item.district} · {stateLabel(item.current_state)} · {t('fw.registeredBy', { name: item.registered_by_display })} ·{' '}
                {t('fw.registeredOn', { date: formatIstDate(item.created_at) })}
              </span>
            </div>
            {action(item, (el) => {
              if (el === null) actions.current.delete(item.field_worker_id);
              else actions.current.set(item.field_worker_id, el);
            })}
          </li>
        ))}
      </ul>
      {revealed !== null && (
        <p role="status" className="text-sm">
          {revealed.n === 0 ? t('fw.list.noMore') : revealed.n === 1 ? t('fw.list.moreShownOne') : t('fw.list.moreShown', { n: revealed.n })}
        </p>
      )}
      {query.isFetchNextPageError && <p role="alert" className="text-sm text-status-fail-fg">{t('fw.list.moreError')}</p>}
      {query.hasNextPage && (
        <button type="button" className="self-start rounded border px-3 py-1 text-sm" onClick={loadMore} disabled={query.isFetchingNextPage} data-testid={`${testId}-more`}>
          {query.isFetchingNextPage ? t('fw.loading') : t('fw.list.more')}
        </button>
      )}
    </div>
  );
}
