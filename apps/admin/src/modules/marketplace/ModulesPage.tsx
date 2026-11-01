// The Pariwar's partner offers — Story 12.2 (Task 8.2; AC8). Newest first, a state filter, and "Load more" over the
// server's opaque cursor (`next_cursor` — ⛔ offset). The server's 403 is the boundary (`module.manage`).

import { MODULE_STATES, type ModuleState } from '@twt/contracts';
import type { ReactElement } from 'react';
import { useState } from 'react';

import { ApiError } from '../../api/client.js';
import { useModules } from '../../api/hooks.js';
import { formatIst, moduleErrorGuidance } from './derive.js';
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

  return (
    <section className="flex max-w-4xl flex-col gap-4 p-4" data-testid="modules-page">
      <h1 className="text-xl font-semibold">{t('module.list.title')}</h1>
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
            onChange={(e) => setState(e.target.value === '' ? null : (e.target.value as ModuleState))}
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

      {modules.isLoading ? <p role="status">…</p> : null}
      {modules.isError ? (
        <p role="alert" data-testid="modules-error">
          {modules.error instanceof ApiError && modules.error.status === 403 ? t('module.error.forbidden') : modules.error instanceof ApiError ? moduleErrorGuidance(modules.error.code) : t('module.list.error')}
        </p>
      ) : null}
      {modules.isSuccess && items.length === 0 ? <p data-testid="modules-empty">{t('module.list.empty')}</p> : null}

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
            <button type="button" className="text-sm underline" onClick={() => onOpen(m.module_id)} data-testid={`module-open-${m.module_id}`}>
              {t('module.list.open')}
            </button>
          </li>
        ))}
      </ul>
      {modules.hasNextPage ? (
        <button
          type="button"
          className="w-fit rounded border px-3 py-1 text-sm disabled:opacity-50"
          disabled={modules.isFetchingNextPage}
          onClick={() => void modules.fetchNextPage()}
          data-testid="modules-more"
        >
          {t('module.list.more')}
        </button>
      ) : null}
    </section>
  );
}
