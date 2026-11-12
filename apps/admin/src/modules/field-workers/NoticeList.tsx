// The officer's notices — Story 13.1d (AC9; AD9, AD10). Newest first, a cursor page at a time ("Load more notices" — the older ones are
// reachable and get marked seen), the unseen ones marked "New"; showing them marks the unseen ones on screen SEEN (one POST for the
// shown ids, once per set — the nav's count then refreshes). A notice unseen when THIS visit showed it keeps its "New" mark for the visit:
// the seen mark's refresh returns it with `seen_at` set, and dropping the mark then would hide which notices are new before the officer
// could read them (the browser pass, 2026-11-09). A notice carries NO name (AD9, I6): it names the two districts and, for a refusal, the
// reason's label; the accepted one reminds the opener "Tell the worker." (`-459` Q3 A). A notice about a request has a "View", which opens
// the same AUDITED detail panel the list does — the one way to see WHICH worker, to the officers the gate already lets read it (an end of
// the request, or a Pariwar grant); a notice about no request (a direct move that superseded none) has none (code review CR44), and neither
// has a `moved_by_pariwar_admin` one, whose recipients need not be an end of the request it names (`noticeViewRequestId`; RP-7). A failed
// seen mark is silent: the notices simply stay "New". "Load more notices" says how many came, in a status region mounted with the list (RP-10);
// it waits while the notices refetch (an act's or the seen mark's refresh) and says a count only when a page was ADDED (code review R4-1).

import type { ReactElement } from 'react';
import { useEffect, useRef, useState } from 'react';

import { useFieldWorkerNotices, useMarkFieldWorkerNoticesSeen } from '../../api/hooks.js';
import { MoveRequestDetail } from './MoveRequestDetail.js';
import { fieldWorkerGuidance, formatIstDateTime, noticeText, noticeViewRequestId } from './derive.js';
import { resolveEn as t } from './i18n-en.js';
import { fieldWorkerRequestsPath } from '../../routes/login-next.js';
import { useSignInRedirect } from './sign-in.js';

export function NoticeList({ pariwarId }: { pariwarId: string }): ReactElement {
  const notices = useFieldWorkerNotices(pariwarId);
  const seen = useMarkFieldWorkerNoticesSeen(pariwarId);
  const marked = useRef(new Set<string>());
  const [viewing, setViewing] = useState<string | null>(null);
  /** The "Load more" line, with its own id: a second page of the same size says the same words and must still be announced (R5-4). */
  const [said, setSaid] = useState<{ id: number; text: string } | null>(null);
  const saidSeq = useRef(0);
  const items = notices.data?.pages.flatMap((p) => p.items) ?? [];
  const unseen = items.filter((n) => n.seen_at === null && !marked.current.has(n.notice_id)).map((n) => n.notice_id);
  const unseenKey = unseen.join(',');
  const error = notices.isError ? fieldWorkerGuidance(notices.error, 'requests') : null;
  useSignInRedirect(error?.signIn === true, fieldWorkerRequestsPath(pariwarId)); // AD10 — this page is a sign-in return route
  useEffect(() => {
    if (unseenKey === '') return;
    const ids = unseenKey.split(',');
    for (const id of ids) marked.current.add(id);
    seen.mutate(ids);
    // `seen` is stable per page; the effect runs once per new set of unseen ids.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unseenKey]);

  return (
    <section aria-labelledby="fw-notices-title" className="flex flex-col gap-2" data-testid="fw-notices">
      <h2 id="fw-notices-title" className="text-lg font-semibold">
        {t('fw.notices.title')}
      </h2>
      {/* Mounted with the section, EMPTY, so a page of older notices arriving is ANNOUNCED (checklist 13 (d); RP-10). */}
      <div role="status" data-testid="fw-notices-status">
        {said !== null && (
          <p key={said.id} className="text-sm">
            {said.text}
          </p>
        )}
      </div>
      {notices.isPending && <p role="status">{t('fw.loading')}</p>}
      {error !== null && (
        <div role="alert" className="flex flex-col gap-1 text-sm text-status-fail-fg" data-testid="fw-notices-error">
          <p>{error.text}</p>
          {error.noAccess !== true && (
            <button type="button" className="self-start rounded border px-3 py-1" onClick={() => void notices.refetch()}>
              {t('fw.retry')}
            </button>
          )}
        </div>
      )}
      {notices.isSuccess && items.length === 0 && <p data-testid="fw-notices-empty">{t('fw.notices.empty')}</p>}
      {items.length > 0 && (
        <ul className="flex flex-col gap-1 text-sm">
          {items.map((n) => {
            const isNew = n.seen_at === null || marked.current.has(n.notice_id);
            const requestId = noticeViewRequestId(n);
            // Its OWN DOM id: the same request can be open from a row and from a notice, and an id is unique (RP-13).
            const detailId = `fw-notice-detail-${n.notice_id}`;
            return (
              <li key={n.notice_id} className="flex flex-col gap-1" data-testid="fw-notice" data-unseen={isNew ? 'true' : 'false'}>
                <p>
                  {isNew && <strong className="mr-1">{t('fw.notices.new')}:</strong>}
                  {noticeText(n)}{' '}
                  {/* No stamp on `move_request_superseded`: for an ending it is the moment the ending was recorded (`-461` item 1) - the server
                      sends none for it (`-462`), so the screen shows what it is given. */}
                  {n.created_at !== null && <span className="text-xs">{formatIstDateTime(n.created_at)}</span>}{' '}
                  {requestId !== null && (
                    <button
                      type="button"
                      className="rounded border px-2 py-0.5 text-xs"
                      aria-expanded={viewing === n.notice_id}
                      aria-controls={viewing === n.notice_id ? detailId : undefined}
                      onClick={() => setViewing((v) => (v === n.notice_id ? null : n.notice_id))}
                      data-testid="fw-notice-view"
                    >
                      {viewing === n.notice_id ? t('fw.notices.hide') : t('fw.notices.view')}
                      <span className="sr-only"> {t('fw.notices.viewFor', { from: n.from_district, to: n.to_district })}</span>
                    </button>
                  )}
                </p>
                {viewing === n.notice_id && requestId !== null && <MoveRequestDetail pariwarId={pariwarId} moveRequestId={requestId} domId={detailId} />}
              </li>
            );
          })}
        </ul>
      )}
      {notices.hasNextPage && (
        <button
          type="button"
          className="self-start rounded border px-3 py-1 text-sm"
          aria-disabled={notices.fetchStatus !== 'idle'}
          onClick={() => {
            // ⛔ while ANY fetch runs or waits (R4-1, R5-3): a press during the seen mark's refetch would cancel it and extend the stale pages.
            if (notices.fetchStatus !== 'idle') return;
            const before = notices.data?.pages.length ?? 0;
            void notices.fetchNextPage().then((r) => {
              // No page added - a refresh cancelled this one and resolved it with the refetched notices: nothing came.
              if (r.isError || (r.data?.pages.length ?? 0) <= before) return;
              const count = r.data?.pages.at(-1)?.items.length ?? 0;
              setSaid({ id: ++saidSeq.current, text: count === 1 ? t('fw.notices.moreShownOne') : t('fw.notices.moreShown', { count }) });
            });
          }}
          data-testid="fw-notices-more"
        >
          {t('fw.notices.loadMore')}
        </button>
      )}
    </section>
  );
}
