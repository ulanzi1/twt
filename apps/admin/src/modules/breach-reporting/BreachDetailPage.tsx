// `/data-protection/breaches/$incidentId` (Story 14.3, AC12): the rehearsal banner, the clock (IST), the timeline, one form
// per entry kind, and the three drafts. A closed incident shows no form. This page sends nothing.
// AC8: the page derives the view with the SAME `deriveBreachIncidentView` the API uses, on its own one-minute clock, so
// "overdue" turns on while the page is open (review 2026-11-20) — the server's `view` is never re-fetched just to move time on.

import {
  BREACH_ENTRY_KINDS,
  deriveBreachIncidentView,
  type BreachEntry,
  type BreachEntryKind,
  type BreachIncidentDetailResponse,
  type BreachIncidentView,
} from '@twt/contracts';
import { Link } from '@tanstack/react-router';
import type { ReactElement } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { ApiError } from '../../api/client.js';
import { attemptKey, useAppendBreachEntry, useBreachIncident, type AttemptKey } from '../../api/hooks.js';
import { formatIst } from '../correction-chase/ist.js';
import { DraftsPanel } from './DraftsPanel.js';
import { EntryForm, type WithdrawableExtension } from './EntryForm.js';
import { errorSentence, t } from './i18n-en.js';

const badge = 'rounded border px-2 py-0.5 text-xs font-medium';
const CLOCK_TICK_MS = 60_000;

/** The current time, moved on every minute — what the derived clock is judged against. */
function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), CLOCK_TICK_MS);
    return () => clearInterval(timer);
  }, []);
  return now;
}

/** The recorded extensions not yet withdrawn, newest first — what a withdrawal may name (decision `2026-11-20-471`). */
function withdrawableExtensions(entries: readonly BreachEntry[]): WithdrawableExtension[] {
  const withdrawn = new Set(entries.flatMap((e) => (e.kind === 'board_extension_withdrawn' ? [e.payload.withdrawsEntryId.toLowerCase()] : [])));
  return entries
    .flatMap((e) =>
      e.kind === 'board_extension_recorded' && !withdrawn.has(e.entryId.toLowerCase())
        ? [{ entryId: e.entryId, label: `${formatIst(e.payload.grantedUntil)} — ${e.payload.reference}` }]
        : [],
    )
    .reverse();
}
const INSTANT_FIELDS = new Set(['occurredAt', 'sentAt', 'grantedUntil']);

/** One payload value as staff read it. */
function show(name: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'string') return INSTANT_FIELDS.has(name) ? formatIst(value) : name === 'status' ? t(`field.status.${value}`) : value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.length === 0 ? '—' : value.map((v) => (name === 'dataCategories' ? t(`category.${String(v)}`) : String(v))).join(', ');
  if (typeof value === 'object' && 'count' in value) return String((value as { count: number }).count);
  if (typeof value === 'object' && 'unknown' in value) return t('field.estimatedAffected.unknown');
  return JSON.stringify(value);
}

function Timeline({ entries }: { entries: readonly BreachEntry[] }): ReactElement {
  return (
    <section className="flex flex-col gap-2" aria-label={t('timeline.title')} data-testid="breach-timeline">
      <h3 className="text-lg font-semibold">{t('timeline.title')}</h3>
      {entries.length === 0 ? (
        <p className="text-sm">{t('timeline.none')}</p>
      ) : (
        <ol className="flex flex-col gap-2">
          {entries.map((e) => (
            <li key={e.entryId} className="rounded border px-3 py-2" data-testid={`breach-entry-${e.entryId}`} data-kind={e.kind}>
              <p className="text-sm">
                <span className="font-medium">{t(`kind.${e.kind}`)}</span> — {formatIst(e.recordedAt)}, {t('timeline.by')} {e.recordedByDisplay}
              </p>
              <dl className="mt-1 grid grid-cols-1 gap-x-4 text-sm md:grid-cols-[max-content_1fr]">
                {Object.entries(e.payload as Record<string, unknown>).map(([name, value]) => (
                  <div key={name} className="contents">
                    <dt className="opacity-70">{t(`field.${name}`)}</dt>
                    <dd className="whitespace-pre-wrap">{show(name, value)}</dd>
                  </div>
                ))}
              </dl>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function ClockPanel({ view }: { view: BreachIncidentView }): ReactElement {
  const flag = (on: boolean) => (on ? t('clock.yes') : t('clock.no'));
  return (
    <section className="flex flex-col gap-1 rounded border px-3 py-2" aria-label={t('clock.title')} data-testid="breach-clock">
      <h3 className="text-lg font-semibold">{t('clock.title')}</h3>
      <p>
        {t('clock.aware')}: <span data-testid="breach-clock-aware">{formatIst(view.becameAwareAt)}</span>
      </p>
      <p>
        {t('clock.due')}: <span data-testid="breach-clock-due">{formatIst(view.boardReportDueAt)}</span>{' '}
        {view.boardReportOverdue && (
          <span className={`${badge} border-status-fail-border bg-status-fail-bg text-status-fail-fg`} role="alert" data-testid="breach-clock-overdue">
            {t('clock.overdue')}
          </span>
        )}
      </p>
      {view.boardReportLate && (
        <p className="rounded border-l-4 border-status-fail-border bg-status-fail-bg px-3 py-1 text-sm text-status-fail-fg" role="status" data-testid="breach-clock-late">
          {t('clock.late')}
        </p>
      )}
      <ul className="text-sm">
        <li data-testid="breach-flag-principals">{t('clock.flag.principals')}: {flag(view.principalsNoticeRecorded)}</li>
        <li data-testid="breach-flag-board-initial">{t('clock.flag.boardInitial')}: {flag(view.boardInitialRecorded)}</li>
        <li data-testid="breach-flag-board-filed">{t('clock.flag.boardReport')}: {flag(view.boardReportRecorded)}</li>
        <li data-testid="breach-flag-signoff">{t('clock.flag.signoff')}: {flag(view.signoffRecorded)}</li>
      </ul>
      <p className="text-sm opacity-70">{t('clock.ist')}</p>
    </section>
  );
}

function RecordEntry({ incidentId, entries }: { incidentId: string; entries: readonly BreachEntry[] }): ReactElement {
  const append = useAppendBreachEntry(incidentId);
  // Not memoised on the array's identity: it is cheap, and must follow every new entry.
  const extensions = withdrawableExtensions(entries);
  // A withdrawal is offered only while there is an extension to withdraw.
  const kinds = BREACH_ENTRY_KINDS.filter((k) => k !== 'board_extension_withdrawn' || extensions.length > 0);
  const [kind, setKind] = useState<BreachEntryKind>('assessment');
  const [error, setError] = useState<string | undefined>(undefined);
  const [saved, setSaved] = useState(false);
  const attempt = useRef<AttemptKey | null>(null);
  // The last extension withdrawn takes the withdrawal off the list: move the picker to a kind that IS offered (state, ⛔ only the
  // rendered value — so an extension re-appearing later can never flip the form back under what is being typed).
  const offered = kinds.includes(kind);
  useEffect(() => {
    if (!offered) setKind('assessment');
  }, [offered]);
  const shownKind: BreachEntryKind = offered ? kind : 'assessment';

  return (
    <section className="flex flex-col gap-3" aria-label={t('entry.title')} data-testid="breach-record-entry">
      <h3 className="text-lg font-semibold">{t('entry.title')}</h3>
      <p className="text-sm opacity-80" data-testid="breach-pii-hint">{t('hint.pii')}</p>
      <div className="flex flex-col gap-1">
        <label htmlFor="breach-entry-kind" className="text-sm font-medium">{t('entry.kind')}</label>
        <select
          id="breach-entry-kind"
          className="rounded border px-2 py-1"
          value={shownKind}
          // Locked while a save is in flight: switching kind mid-save would show "Recorded" under the wrong form.
          disabled={append.isPending}
          onChange={(e) => {
            setKind(e.target.value as BreachEntryKind);
            setError(undefined);
            setSaved(false);
            attempt.current = null;
          }}
          data-testid="breach-entry-kind"
        >
          {kinds.map((k) => (
            <option key={k} value={k}>{t(`kind.${k}`)}</option>
          ))}
        </select>
      </div>
      <EntryForm
        // A new set of extensions remounts the withdrawal form, so its picker starts on an extension that still stands.
        key={shownKind === 'board_extension_withdrawn' ? `${shownKind}:${extensions.map((x) => x.entryId).join(',')}` : shownKind}
        kind={shownKind}
        pending={append.isPending}
        error={error}
        extensions={extensions}
        onSubmit={async (body) => {
          setError(undefined);
          setSaved(false);
          try {
            await append.mutateAsync({ body, idempotencyKey: attemptKey(attempt, body) });
            attempt.current = null;
            setSaved(true);
            return true;
          } catch (err: unknown) {
            setError(err instanceof ApiError ? errorSentence(err.code, err.status) : errorSentence(undefined));
            return false;
          }
        }}
      />
      {saved && <p role="status" className="text-sm" data-testid="breach-entry-saved">{t('entry.saved')}</p>}
    </section>
  );
}

export function BreachDetailPage({ incidentId }: { incidentId: string }): ReactElement {
  const incident = useBreachIncident(incidentId);
  const now = useNow();
  const data = incident.data;
  const view = useMemo(() => (data ? deriveBreachIncidentView(data.incident, data.entries, now) : null), [data, now]);

  const back = (
    <Link to="/data-protection/breaches" className="text-sm underline" data-testid="breach-back">
      {t('detail.back')}
    </Link>
  );
  if (incident.isLoading) return <p role="status">{t('detail.loading')}</p>;
  // An error REPLACES the page only when there is nothing to show; a failed background refetch keeps the cached incident.
  if (!incident.data || view === null) {
    const notFound = incident.error instanceof ApiError && incident.error.status === 404;
    return (
      <div className="flex flex-col gap-3">
        {back}
        <p role="alert" className="text-status-fail-fg" data-testid="breach-detail-error">{notFound ? t('detail.notFound') : t('detail.error')}</p>
      </div>
    );
  }
  const detail: BreachIncidentDetailResponse = incident.data;
  const closed = view.status === 'closed';
  // A failed re-read keeps the last loaded copy on screen — and says so.
  const stale = incident.isError;

  return (
    <div className="flex flex-col gap-8" data-testid="breach-detail-page" data-status={view.status}>
      {back}
      {stale && (
        <p role="status" className="text-sm text-status-fail-fg" data-testid="breach-detail-stale">
          {t('detail.stale')}
        </p>
      )}
      {detail.incident.isRehearsal && (
        <p className="rounded border-l-4 border-status-fail-border bg-status-fail-bg p-3 font-semibold text-status-fail-fg" role="status" data-testid="breach-rehearsal-banner">
          {t('detail.rehearsalBanner')}
        </p>
      )}
      <header className="flex flex-col gap-1">
        <h2 className="flex flex-wrap items-center gap-2 text-xl font-bold">
          {detail.incident.title}
          <span className={badge} data-testid="breach-detail-status">{closed ? t('badge.closed') : t('badge.open')}</span>
        </h2>
        <p className="text-sm opacity-80">
          {t('detail.openedBy')} {detail.incident.openedByDisplay}, {formatIst(detail.incident.openedAt)} · {t('detail.source')}: {t(`source.${detail.incident.detectionSource}`)}
          {detail.incident.detectionSignalRef !== null ? ` · ${t('detail.signalRef')}: ${detail.incident.detectionSignalRef}` : ''}
        </p>
      </header>
      <ClockPanel view={view} />
      <Timeline entries={detail.entries} />
      {closed ? (
        <p className="rounded border px-3 py-2" role="status" data-testid="breach-closed-note">{t('detail.closedNote')}</p>
      ) : (
        <RecordEntry incidentId={incidentId} entries={detail.entries} />
      )}
      <DraftsPanel view={view} />
    </div>
  );
}
