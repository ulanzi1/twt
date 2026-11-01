// The Pariwar's partner offers — Story 12.2 (Task 8.2; AC8). Newest first, a state filter, and "Load more" over the
// server's opaque cursor (`next_cursor` — ⛔ offset). The server's 403 is the boundary (`module.manage`).
//
// "Load more" moves focus to the first new row's Open button (the button itself unmounts on the last page) and announces how
// many rows arrived; a last page with no rows says "No more offers." and focuses the page heading (PT9). Either focus move is
// skipped when the admin has moved focus elsewhere while the page loaded (PT2). A failed next page keeps the rows and says so
// beside the button (review RC12).

import { MODULE_STATES, type ModuleState } from '@twt/contracts';
import type { MouseEvent, ReactElement } from 'react';
import { useEffect, useRef, useState } from 'react';

import { ApiError } from '../../api/client.js';
import { useModules } from '../../api/hooks.js';
import { formatIst, moduleErrorGuidance } from './derive.js';
import { focusIfUnclaimed } from './focus.js';
import { resolveEn as t } from './i18n-en.js';

export interface ModulesPageProps {
  pariwarId: string;
  onNew: () => void;
  onOpen: (moduleId: string) => void;
}

export function ModulesPage({ pariwarId, onNew, onOpen }: ModulesPageProps): ReactElement {
  const [state, setState] = useState<ModuleState | null>(null);
  const modules = useModules(pariwarId, state);
  const items = modules.data?.pages.flatMap((p) => p.items) ?? [];
  // The rows the last "Load more" added: the first one takes focus, the count is announced. `firstId` null = an empty last page.
  const [revealed, setRevealed] = useState<{ firstId: string | null; n: number } | null>(null);
  const openButtons = useRef(new Map<string, HTMLButtonElement>());
  const headingRef = useRef<HTMLHeadingElement>(null);
  const moreButton = useRef<HTMLButtonElement | null>(null);
  const filterSeq = useRef(0);

  useEffect(() => {
    if (revealed === null) return;
    const target = revealed.firstId === null ? headingRef.current : openButtons.current.get(revealed.firstId);
    focusIfUnclaimed(target, moreButton.current);
  }, [revealed]);

  const loadMore = (e: MouseEvent<HTMLButtonElement>): void => {
    const before = items.length;
    const seq = filterSeq.current;
    moreButton.current = e.currentTarget;
    setRevealed(null); // the next count is inserted afresh, so an equal count is announced again
    void modules.fetchNextPage().then((r) => {
      if (seq !== filterSeq.current || r.isFetchNextPageError) return; // the filter changed meanwhile, or the page failed
      const after = r.data?.pages.flatMap((p) => p.items) ?? [];
      const first = after[before];
      if (first !== undefined) setRevealed({ firstId: first.module_id, n: after.length - before });
      // An empty LAST page: the button unmounts under focus and nothing new arrived (PT9).
      else if (!r.hasNextPage) setRevealed({ firstId: null, n: 0 });
    });
  };

  return (
    <section className="flex max-w-4xl flex-col gap-4 p-4" data-testid="modules-page">
      <h1 ref={headingRef} tabIndex={-1} className="text-xl font-semibold outline-none">
        {t('module.list.title')}
      </h1>
      <p className="text-sm">{t('module.list.subtitle')}</p>
      <p className="text-sm">{t('module.detail.membersCannotSee')}</p>
      <div className="flex items-end gap-4">
        <button type="button" className="rounded bg-black px-3 py-1 text-sm text-white" onClick={onNew} data-testid="modules-new">
          {t('module.list.new')}
        </button>
        <label className="flex flex-col text-xs">
          {t('module.list.filter')}
          <select
            className="rounded border px-2 py-1 text-sm"
            value={state ?? ''}
            onChange={(e) => {
              filterSeq.current += 1;
              setRevealed(null);
              setState(e.target.value === '' ? null : (e.target.value as ModuleState));
            }}
            data-testid="modules-state-filter"
          >
            <option value="">{t('module.list.filter.all')}</option>
            {MODULE_STATES.map((s) => (
              <option key={s} value={s}>
                {t(`module.state.${s}`)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* ONE always-mounted status region holds "Loading…", the empty text and the "n more offers shown." of a Load more: a status
          node that arrives already holding its text is announced unreliably, and the two used to replace each other (RP32 / PU2). */}
      <div role="status" data-testid="modules-status">
        {modules.isLoading ? <p>{t('module.loading')}</p> : null}
        {modules.isSuccess && items.length === 0 ? (
          <p data-testid="modules-empty">{t(state === null ? 'module.list.empty' : 'module.list.emptyFiltered')}</p>
        ) : null}
        {revealed !== null ? (
          <p className="sr-only">
            {revealed.n === 0
              ? t('module.list.noMore')
              : revealed.n === 1
                ? t('module.list.moreShownOne')
                : t('module.list.moreShown', { n: revealed.n })}
          </p>
        ) : null}
      </div>
      {/* A failed NEXT page is said beside "Load more", over the rows it keeps (RC12). */}
      {modules.isError && !modules.isFetchNextPageError ? (
        <p role="alert" data-testid="modules-error">
          {modules.error instanceof ApiError && modules.error.status === 403 ? t('module.error.forbidden') : modules.error instanceof ApiError ? moduleErrorGuidance(modules.error.code) : t('module.list.error')}
        </p>
      ) : null}

      <ul className="flex flex-col gap-2" data-testid="modules-list">
        {items.map((m) => (
          <li key={m.module_id} className="flex items-center justify-between gap-2 rounded border p-2" data-testid={`module-row-${m.module_id}`}>
            <div className="flex flex-col">
              <span className="font-medium">{m.name_en}</span>
              <span className="text-sm" lang="hi">
                {m.name_hi}
              </span>
              <span className="text-xs">{t('module.list.window', { from: formatIst(m.valid_from), until: formatIst(m.valid_until) })}</span>
            </div>
            <span className="text-xs" data-testid={`module-state-${m.module_id}`}>
              {t(`module.state.${m.current_state}`)}
            </span>
            <button
              type="button"
              className="text-sm underline"
              aria-label={t('module.list.openNamed', { name: m.name_en })}
              onClick={() => onOpen(m.module_id)}
              ref={(el) => {
                if (el === null) openButtons.current.delete(m.module_id);
                else openButtons.current.set(m.module_id, el);
              }}
              data-testid={`module-open-${m.module_id}`}
            >
              {t('module.list.open')}
            </button>
          </li>
        ))}
      </ul>
      {modules.isFetchNextPageError ? (
        <p role="alert" className="text-sm text-status-fail-fg" data-testid="modules-more-error">
          {t('module.list.moreError')}
        </p>
      ) : null}
      {modules.hasNextPage ? (
        <button
          type="button"
          className="w-fit rounded border px-3 py-1 text-sm disabled:opacity-50"
          disabled={modules.isFetchingNextPage}
          onClick={loadMore}
          data-testid="modules-more"
        >
          {t('module.list.more')}
        </button>
      ) : null}
    </section>
  );
}
