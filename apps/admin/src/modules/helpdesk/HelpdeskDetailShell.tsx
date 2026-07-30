// `<HelpdeskDetailShell>` — the pure responder ticket-detail view (Story 10.4, Task 7; AC2/AC3/AC5).
//
// Renders the reply thread + the routing/SLA header + the cross-link nav, and exposes the pick-up /
// reply / resolve action affordances (each gated by the ticket's current state — the API guards
// legality too, this just hides an action that would 409). PURE presentational: the container wires
// the mutations. The reply/resolve message is local input state (a presentational concern).

import type { HelpdeskAdminTicketDetailResponse } from '@twt/contracts';
import type { ReactElement } from 'react';
import { useState } from 'react';

import { crossLinkNavs } from './crossLinks.js';
import { resolveEn } from './i18n-en.js';
import { formatSlaRemaining, severityLabel, severityToneClass, stateLabel } from './presentation.js';

export interface HelpdeskDetailShellProps {
  pariwarId: string;
  detail?: HelpdeskAdminTicketDetailResponse;
  loading: boolean;
  error?: string;
  onPickUp: () => void;
  onReply: (message: string) => void;
  onResolve: (message: string) => void;
  pending: { pickUp: boolean; reply: boolean; resolve: boolean };
  actionError?: string;
}

export function HelpdeskDetailShell(props: HelpdeskDetailShellProps): ReactElement {
  const { pariwarId, detail, loading, error, onPickUp, onReply, onResolve, pending, actionError } = props;
  const [message, setMessage] = useState('');

  if (loading) return <p role="status">{resolveEn('helpdesk.detail.loading')}</p>;
  if (error !== undefined) return <p role="alert" className="text-red-700">{error}</p>;
  if (!detail) return <p role="status">{resolveEn('helpdesk.detail.notFound')}</p>;

  const state = detail.current_state;
  const canPickUp = state === 'open' || state === 'reopened';
  const canAwait = state === 'open' || state === 'in_progress';
  const canResolve = state === 'in_progress' || state === 'awaiting_member';
  const messageReady = message.trim().length > 0;
  const navs = crossLinkNavs(pariwarId, detail.cross_links);

  return (
    <section aria-label={resolveEn('helpdesk.detail.title')} className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">{detail.subject}</h1>
        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
          <span>{detail.category}</span>
          <span>·</span>
          <span>{stateLabel(state)}</span>
          <span>·</span>
          <span className={`font-semibold ${severityToneClass(detail.severity)}`}>{severityLabel(detail.severity)}</span>
          <span>·</span>
          <span>{resolveEn('helpdesk.detail.routedTo')} {detail.routed_to_role}</span>
        </div>
        <div className="flex gap-4 text-xs text-gray-500">
          <span>
            {resolveEn('helpdesk.sla.firstResponse')}: {formatSlaRemaining(detail.sla_first_response.ms_remaining, detail.sla_first_response.running)}
          </span>
          <span>
            {resolveEn('helpdesk.sla.resolution')}: {formatSlaRemaining(detail.sla_resolution.ms_remaining, detail.sla_resolution.running)}
          </span>
        </div>
        {navs.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {navs.map((n) =>
              n.href ? (
                <a key={n.kind} href={n.href} className="rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                  {n.label}
                </a>
              ) : (
                <span key={n.kind} className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-400" title={resolveEn('helpdesk.crosslink.pending')}>
                  {n.label}
                </span>
              ),
            )}
          </div>
        )}
      </header>

      {/* The reply thread — role-labelled authors only (never a named individual). */}
      <ol aria-label={resolveEn('helpdesk.detail.thread')} className="flex flex-col gap-2">
        {detail.thread.map((e, i) => (
          <li key={`${e.occurred_at}-${i}`} className="rounded border border-gray-200 p-2">
            <div className="text-xs uppercase text-gray-400">
              {e.author === 'member' ? resolveEn('helpdesk.author.member') : resolveEn('helpdesk.author.staff')}
            </div>
            <div className="whitespace-pre-wrap text-sm">{e.body}</div>
          </li>
        ))}
      </ol>

      {/* Actions — hidden when illegal for the current state (the API also guards). */}
      <div className="flex flex-col gap-2 border-t pt-3">
        {actionError !== undefined && <p role="alert" className="text-red-700">{actionError}</p>}
        {canPickUp && (
          <button type="button" className="w-fit rounded bg-blue-700 px-3 py-1 text-white disabled:opacity-50" disabled={pending.pickUp} onClick={onPickUp}>
            {pending.pickUp ? resolveEn('helpdesk.action.pending') : resolveEn('helpdesk.action.pickUp')}
          </button>
        )}
        {(canAwait || canResolve) && (
          <div className="flex flex-col gap-2">
            <label className="text-sm" htmlFor="helpdesk-reply-message">
              {resolveEn('helpdesk.action.messageLabel')}
            </label>
            <textarea
              id="helpdesk-reply-message"
              className="rounded border border-gray-300 p-2 text-sm"
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={resolveEn('helpdesk.action.messagePlaceholder')}
            />
            <div className="flex gap-2">
              {canAwait && (
                <button
                  type="button"
                  className="rounded border border-blue-700 px-3 py-1 text-blue-700 disabled:opacity-50"
                  disabled={!messageReady || pending.reply}
                  onClick={() => onReply(message.trim())}
                >
                  {pending.reply ? resolveEn('helpdesk.action.pending') : resolveEn('helpdesk.action.reply')}
                </button>
              )}
              {canResolve && (
                <button
                  type="button"
                  className="rounded bg-green-700 px-3 py-1 text-white disabled:opacity-50"
                  disabled={!messageReady || pending.resolve}
                  onClick={() => onResolve(message.trim())}
                >
                  {pending.resolve ? resolveEn('helpdesk.action.pending') : resolveEn('helpdesk.action.resolve')}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
