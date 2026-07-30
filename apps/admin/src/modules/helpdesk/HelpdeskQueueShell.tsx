// `<HelpdeskQueueShell>` — the pure presentational responder queue (Story 10.4, Task 7; AC1/AC5).
//
// A scope-respecting ticket queue: rows with live SLA timers, a derived severity chip, the lifecycle
// state, and cross-link badges. PURE (no hooks/router/fetch) so it is render-testable in isolation —
// the container (`<HelpdeskQueuePage>`) wires the data + navigation. Precedent: the claim-verification
// / helpline-claims console shells.

import { HELPDESK_TICKET_STATES, type HelpdeskQueueItem } from '@twt/contracts';
import type { ReactElement } from 'react';

import { crossLinkNavs } from './crossLinks.js';
import { resolveEn } from './i18n-en.js';
import { HELPDESK_RESPONDER_ROLES, formatSlaRemaining, severityLabel, severityRank, severityToneClass, stateLabel } from './presentation.js';

/** The queue's client-visible sort mode (AC1 newest-first default; AC4 severity-first). */
export type HelpdeskQueueSort = 'newest' | 'severity';

export interface HelpdeskQueueShellProps {
  pariwarId: string;
  tickets: readonly HelpdeskQueueItem[];
  loading: boolean;
  error?: string;
  /** The active lifecycle-state filter (`''` = all states). */
  stateFilter: string;
  onStateFilterChange: (state: string) => void;
  /** The active "my queue" role-match filter over `routed_to_role` (`''` = all roles). */
  routedToRoleFilter: string;
  onRoutedToRoleFilterChange: (role: string) => void;
  /** Newest-first (AC1 default) or severity-first (AC4: breached tickets surface first). */
  sortBy: HelpdeskQueueSort;
  onSortByChange: (sort: HelpdeskQueueSort) => void;
  /** Offset-page controls (AC1). `hasPreviousPage` is `offset > 0`; `hasNextPage` mirrors the
   *  server's `next_offset !== null`. */
  hasPreviousPage: boolean;
  hasNextPage: boolean;
  onPreviousPage: () => void;
  onNextPage: () => void;
  /** Open a ticket's detail. */
  onSelect: (ticketId: string) => void;
}

function SlaCell({ label, dueAt, running, breached, msRemaining }: { label: string; dueAt: string; running: boolean; breached: boolean; msRemaining: number }): ReactElement {
  return (
    <div className="text-sm">
      <span className="text-gray-500">{label}: </span>
      <span className={breached ? 'font-semibold text-red-700' : running ? 'text-gray-800' : 'text-gray-400'} title={dueAt}>
        {formatSlaRemaining(msRemaining, running)}
      </span>
    </div>
  );
}

export function HelpdeskQueueShell(props: HelpdeskQueueShellProps): ReactElement {
  const {
    pariwarId,
    tickets,
    loading,
    error,
    stateFilter,
    onStateFilterChange,
    routedToRoleFilter,
    onRoutedToRoleFilterChange,
    sortBy,
    onSortByChange,
    hasPreviousPage,
    hasNextPage,
    onPreviousPage,
    onNextPage,
    onSelect,
  } = props;

  // Client-side reorder of the CURRENT page only (AC4). Severity is derived server-side; sorting a
  // page in place keeps the "no new column, no SQL-level severity derivation" discipline (sla.ts) —
  // the newest-first order (server-sorted) is the secondary key.
  const orderedTickets = sortBy === 'severity' ? [...tickets].sort((a, b) => severityRank(a.severity) - severityRank(b.severity)) : tickets;

  return (
    <section aria-label={resolveEn('helpdesk.queue.title')} className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">{resolveEn('helpdesk.queue.title')}</h1>
          <p className="text-sm text-gray-600">{resolveEn('helpdesk.queue.subtitle')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <span>{resolveEn('helpdesk.queue.filter.state')}</span>
            <select
              aria-label={resolveEn('helpdesk.queue.filter.state')}
              className="rounded border border-gray-300 px-2 py-1"
              value={stateFilter}
              onChange={(e) => onStateFilterChange(e.target.value)}
            >
              <option value="">{resolveEn('helpdesk.queue.filter.allStates')}</option>
              {HELPDESK_TICKET_STATES.map((s) => (
                <option key={s} value={s}>
                  {stateLabel(s)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <span>{resolveEn('helpdesk.queue.filter.role')}</span>
            <select
              aria-label={resolveEn('helpdesk.queue.filter.role')}
              className="rounded border border-gray-300 px-2 py-1"
              value={routedToRoleFilter}
              onChange={(e) => onRoutedToRoleFilterChange(e.target.value)}
            >
              <option value="">{resolveEn('helpdesk.queue.filter.allRoles')}</option>
              {HELPDESK_RESPONDER_ROLES.map((r) => (
                <option key={r} value={r}>
                  {stateLabel(r)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <span>{resolveEn('helpdesk.queue.sort.label')}</span>
            <select
              aria-label={resolveEn('helpdesk.queue.sort.label')}
              className="rounded border border-gray-300 px-2 py-1"
              value={sortBy}
              onChange={(e) => onSortByChange(e.target.value as HelpdeskQueueSort)}
            >
              <option value="newest">{resolveEn('helpdesk.queue.sort.newest')}</option>
              <option value="severity">{resolveEn('helpdesk.queue.sort.severity')}</option>
            </select>
          </label>
        </div>
      </header>

      {loading && <p role="status">{resolveEn('helpdesk.queue.loading')}</p>}
      {error !== undefined && <p role="alert" className="text-red-700">{error}</p>}

      {!loading && error === undefined && tickets.length === 0 && (
        <p role="status" className="text-gray-500">{resolveEn('helpdesk.queue.empty')}</p>
      )}

      {tickets.length > 0 && (
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b text-sm text-gray-500">
              <th className="py-2">{resolveEn('helpdesk.queue.col.subject')}</th>
              <th className="py-2">{resolveEn('helpdesk.queue.col.state')}</th>
              <th className="py-2">{resolveEn('helpdesk.queue.col.severity')}</th>
              <th className="py-2">{resolveEn('helpdesk.queue.col.sla')}</th>
              <th className="py-2">{resolveEn('helpdesk.queue.col.links')}</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {orderedTickets.map((t) => {
              const navs = crossLinkNavs(pariwarId, t.cross_links);
              return (
                <tr key={t.ticket_id} className="border-b align-top">
                  <td className="py-2">
                    <div className="font-medium">{t.subject}</div>
                    <div className="text-xs text-gray-500">
                      {t.category}
                      {t.created_via === 'helpline_call' ? ` · ${resolveEn('helpdesk.badge.helpline')}` : ''}
                    </div>
                  </td>
                  <td className="py-2 text-sm">{stateLabel(t.current_state)}</td>
                  <td className="py-2">
                    <span className={`text-sm font-semibold ${severityToneClass(t.severity)}`}>{severityLabel(t.severity)}</span>
                  </td>
                  <td className="py-2">
                    <SlaCell
                      label={resolveEn('helpdesk.sla.firstResponse')}
                      dueAt={t.sla_first_response.due_at}
                      running={t.sla_first_response.running}
                      breached={t.sla_first_response.breached}
                      msRemaining={t.sla_first_response.ms_remaining}
                    />
                    <SlaCell
                      label={resolveEn('helpdesk.sla.resolution')}
                      dueAt={t.sla_resolution.due_at}
                      running={t.sla_resolution.running}
                      breached={t.sla_resolution.breached}
                      msRemaining={t.sla_resolution.ms_remaining}
                    />
                  </td>
                  <td className="py-2">
                    <div className="flex flex-wrap gap-1">
                      {navs.map((n) => (
                        <span
                          key={n.kind}
                          className={`rounded px-1.5 py-0.5 text-xs ${n.href ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-400'}`}
                          title={n.href ? undefined : resolveEn('helpdesk.crosslink.pending')}
                        >
                          {n.label}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-2">
                    <button type="button" className="text-sm text-blue-700 underline" onClick={() => onSelect(t.ticket_id)}>
                      {resolveEn('helpdesk.queue.open')}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {!loading && error === undefined && tickets.length > 0 && (
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            className="rounded border border-gray-300 px-3 py-1 text-sm disabled:opacity-40"
            disabled={!hasPreviousPage}
            onClick={onPreviousPage}
          >
            {resolveEn('helpdesk.queue.page.previous')}
          </button>
          <button
            type="button"
            className="rounded border border-gray-300 px-3 py-1 text-sm disabled:opacity-40"
            disabled={!hasNextPage}
            onClick={onNextPage}
          >
            {resolveEn('helpdesk.queue.page.next')}
          </button>
        </div>
      )}
    </section>
  );
}
