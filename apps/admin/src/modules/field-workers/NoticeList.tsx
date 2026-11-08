// The officer's notices — Story 13.1d (AC9; AD9, AD10). Newest first, the unseen ones marked "New"; showing them marks the unseen ones
// on screen SEEN (one POST for the shown ids, once per set — the nav's count then refreshes). A notice unseen when THIS visit showed it
// keeps its "New" mark for the visit: the seen mark's refresh returns it with `seen_at` set, and dropping the mark then would hide which
// notices are new before the officer could read them (the browser pass, 2026-11-09). A notice carries no name: it names the
// two districts and, for a refusal, the reason's label; the accepted one reminds the opener "Tell the worker." (`-459` Q3 A). A failed
// seen mark is silent: the notices simply stay "New".

import type { ReactElement } from 'react';
import { useEffect, useRef } from 'react';

import { useFieldWorkerNotices, useMarkFieldWorkerNoticesSeen } from '../../api/hooks.js';
import { fieldWorkerGuidance, formatIstDateTime, noticeText } from './derive.js';
import { resolveEn as t } from './i18n-en.js';

export function NoticeList({ pariwarId }: { pariwarId: string }): ReactElement {
  const notices = useFieldWorkerNotices(pariwarId);
  const seen = useMarkFieldWorkerNoticesSeen(pariwarId);
  const marked = useRef(new Set<string>());
  const unseen = notices.data?.items.filter((n) => n.seen_at === null && !marked.current.has(n.notice_id)).map((n) => n.notice_id) ?? [];
  const unseenKey = unseen.join(',');
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
      {notices.isPending && <p role="status">{t('fw.loading')}</p>}
      {notices.isError && (
        <p role="alert" className="text-sm text-status-fail-fg">
          {fieldWorkerGuidance(notices.error).text}
        </p>
      )}
      {notices.isSuccess && notices.data.items.length === 0 && <p data-testid="fw-notices-empty">{t('fw.notices.empty')}</p>}
      {notices.isSuccess && notices.data.items.length > 0 && (
        <ul className="flex flex-col gap-1 text-sm">
          {notices.data.items.map((n) => (
            <li key={n.notice_id} data-testid="fw-notice" data-unseen={n.seen_at === null || marked.current.has(n.notice_id) ? 'true' : 'false'}>
              {(n.seen_at === null || marked.current.has(n.notice_id)) && <strong className="mr-1">{t('fw.notices.new')}:</strong>}
              {noticeText(n)} <span className="text-xs">{formatIstDateTime(n.created_at)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
