// `/data-protection/breaches/$incidentId` (Story 14.3, AC12): the rehearsal banner, the clock (IST), the timeline, one form
// per entry kind, and the three drafts. A closed incident shows no form. This page sends nothing.

import { BREACH_ENTRY_KINDS, type BreachEntry, type BreachEntryKind, type BreachIncidentDetailResponse } from '@twt/contracts';
import { Link } from '@tanstack/react-router';
import type { ReactElement } from 'react';
import { useRef, useState } from 'react';

import { ApiError } from '../../api/client.js';
import { attemptKey, useAppendBreachEntry, useBreachIncident, type AttemptKey } from '../../api/hooks.js';
import { formatIst } from '../correction-chase/ist.js';
import { DraftsPanel } from './DraftsPanel.js';
import { EntryForm } from './EntryForm.js';
import { errorSentence, t } from './i18n-en.js';

const badge = 'rounded border px-2 py-0.5 text-xs font-medium';
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

function ClockPanel({ detail }: { detail: BreachIncidentDetailResponse }): ReactElement {
  const { view } = detail;
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

function RecordEntry({ incidentId }: { incidentId: string }): ReactElement {
  const append = useAppendBreachEntry(incidentId);
  const [kind, setKind] = useState<BreachEntryKind>('assessment');
  const [error, setError] = useState<string | undefined>(undefined);
  const [saved, setSaved] = useState(false);
  const attempt = useRef<AttemptKey | null>(null);

  return (
    <section className="flex flex-col gap-3" aria-label={t('entry.title')} data-testid="breach-record-entry">
      <h3 className="text-lg font-semibold">{t('entry.title')}</h3>
      <p className="text-sm opacity-80" data-testid="breach-pii-hint">{t('hint.pii')}</p>
      <div className="flex flex-col gap-1">
        <label htmlFor="breach-entry-kind" className="text-sm font-medium">{t('entry.kind')}</label>
        <select
          id="breach-entry-kind"
          className="rounded border px-2 py-1"
          value={kind}
          onChange={(e) => {
            setKind(e.target.value as BreachEntryKind);
            setError(undefined);
            setSaved(false);
            attempt.current = null;
          }}
          data-testid="breach-entry-kind"
        >
          {BREACH_ENTRY_KINDS.map((k) => (
            <option key={k} value={k}>{t(`kind.${k}`)}</option>
          ))}
        </select>
      </div>
      <EntryForm
        key={kind}
        kind={kind}
        pending={append.isPending}
        error={error}
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

  const back = (
    <Link to="/data-protection/breaches" className="text-sm underline" data-testid="breach-back">
      {t('detail.back')}
    </Link>
  );
  if (incident.isLoading) return <p role="status">{t('detail.loading')}</p>;
  if (incident.isError || !incident.data) {
    const notFound = incident.error instanceof ApiError && incident.error.status === 404;
    return (
      <div className="flex flex-col gap-3">
        {back}
        <p role="alert" className="text-status-fail-fg" data-testid="breach-detail-error">{notFound ? t('detail.notFound') : t('detail.error')}</p>
      </div>
    );
  }
  const detail = incident.data;
  const closed = detail.view.status === 'closed';

  return (
    <div className="flex flex-col gap-8" data-testid="breach-detail-page" data-status={detail.view.status}>
      {back}
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
      <ClockPanel detail={detail} />
      <Timeline entries={detail.entries} />
      {closed ? (
        <p className="rounded border px-3 py-2" role="status" data-testid="breach-closed-note">{t('detail.closedNote')}</p>
      ) : (
        <RecordEntry incidentId={incidentId} />
      )}
      <DraftsPanel view={detail.view} />
    </div>
  );
}
