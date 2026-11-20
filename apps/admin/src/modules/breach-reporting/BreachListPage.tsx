// `/data-protection/breaches` (Story 14.3, AC12): signals to assess, open an incident, the incidents with their flags, and the
// monthly review's count. This page sends nothing.

import { Link, useNavigate } from '@tanstack/react-router';
import type { ReactElement } from 'react';
import { useRef, useState } from 'react';

import { ApiError } from '../../api/client.js';
import { attemptKey, useBreachIncidents, useBreachMembersOnRecord, useBreachSignals, useOpenBreachIncident, type AttemptKey } from '../../api/hooks.js';
import { formatIst } from '../correction-chase/ist.js';
import { errorSentence, t } from './i18n-en.js';
import { OpenIncidentForm, type OpenPrefill } from './OpenIncidentForm.js';

const badge = 'rounded border px-2 py-0.5 text-xs font-medium';

function SignalsPanel({ onOpenFrom }: { onOpenFrom: (prefill: OpenPrefill) => void }): ReactElement {
  const signals = useBreachSignals();
  return (
    <section className="flex flex-col gap-2" aria-label={t('signals.title')} data-testid="breach-signals">
      <h3 className="text-lg font-semibold">{t('signals.title')}</h3>
      <p className="text-sm opacity-80">{t('signals.subtitle')}</p>
      {signals.isLoading && <p role="status">{t('signals.loading')}</p>}
      {signals.isError && <p role="alert" className="text-sm text-status-fail-fg">{t('signals.error')}</p>}
      {signals.data && signals.data.items.length === 0 && <p className="text-sm" data-testid="breach-signals-none">{t('signals.none')}</p>}
      {signals.data && signals.data.items.length > 0 && (
        <ul className="flex flex-col gap-2">
          {signals.data.items.map((s) => (
            <li key={s.checkId} className="flex flex-wrap items-center justify-between gap-3 rounded border px-3 py-2" data-testid={`breach-signal-${s.checkId}`}>
              <span className="text-sm">
                <span className="font-medium">{t('signals.item')}</span> — {formatIst(s.verifiedAt)} · {s.rowsVerified} {t('signals.rows')}
                {s.firstBrokenSeq !== null ? ` · ${t('signals.brokenAt')} ${s.firstBrokenSeq}` : ''}
              </span>
              {s.incidentIds.length > 0 ? (
                // An incident exists for this signal: say so, and link to it, IN PLACE of the open action.
                <span className="flex items-center gap-2 text-sm" data-testid={`breach-signal-${s.checkId}-opened`}>
                  <span className={badge}>{t('signals.opened')}</span>
                  {s.incidentIds.map((incidentId) => (
                    <Link key={incidentId} to="/data-protection/breaches/$incidentId" params={{ incidentId }} className="underline">
                      {t('signals.view')}
                    </Link>
                  ))}
                </span>
              ) : (
                <button
                  type="button"
                  className="rounded border px-3 py-1 text-sm"
                  onClick={() => onOpenFrom({ detectionSource: 'audit_chain_break', detectionSignalRef: s.checkId, becameAwareAt: s.verifiedAt })}
                  data-testid={`breach-signal-${s.checkId}-open`}
                >
                  {t('signals.open')}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="text-sm opacity-70">{t('signals.ackNote')}</p>
    </section>
  );
}

function MonthlyReviewPanel(): ReactElement {
  const members = useBreachMembersOnRecord();
  return (
    <section className="flex flex-col gap-2" aria-label={t('review.title')} data-testid="breach-monthly-review">
      <h3 className="text-lg font-semibold">{t('review.title')}</h3>
      {members.isLoading && <p role="status">{t('review.loading')}</p>}
      {members.isError && <p role="alert" className="text-sm text-status-fail-fg">{t('review.error')}</p>}
      {members.data && (
        <>
          <p data-testid="breach-members-on-record">
            <span className="font-medium">{t('review.members')}:</span> <span data-testid="breach-members-total">{members.data.total}</span> · {t('review.pariwars')}:{' '}
            <span data-testid="breach-members-pariwars">{members.data.pariwarCount}</span> · {t('review.asOf')} {formatIst(members.data.asOf)}
          </p>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {Object.entries(members.data.byState).map(([state, n]) => (
              <li key={state} data-testid={`breach-members-state-${state}`}>
                {state}: {n}
              </li>
            ))}
          </ul>
        </>
      )}
      <p className="text-sm opacity-70">{t('review.note')}</p>
    </section>
  );
}

function IncidentsList(): ReactElement {
  const incidents = useBreachIncidents();
  return (
    <section className="flex flex-col gap-2" aria-label={t('incidents.title')} data-testid="breach-incidents">
      <h3 className="text-lg font-semibold">{t('incidents.title')}</h3>
      {incidents.isLoading && <p role="status">{t('incidents.loading')}</p>}
      {incidents.isError && <p role="alert" className="text-sm text-status-fail-fg">{t('incidents.error')}</p>}
      {incidents.data && incidents.data.items.length === 0 && <p className="text-sm">{t('incidents.none')}</p>}
      {incidents.data && incidents.data.items.length > 0 && (
        <ul className="flex flex-col gap-2">
          {incidents.data.items.map((i) => (
            <li key={i.incidentId} className="flex flex-col gap-1 rounded border px-3 py-2" data-testid={`breach-incident-${i.incidentId}`}>
              <span className="flex flex-wrap items-center gap-2">
                <Link to="/data-protection/breaches/$incidentId" params={{ incidentId: i.incidentId }} className="font-medium underline">
                  {i.title}
                </Link>
                <span className={badge} data-testid={`breach-incident-${i.incidentId}-status`}>{i.status === 'closed' ? t('badge.closed') : t('badge.open')}</span>
                {i.isRehearsal && <span className={badge} data-testid={`breach-incident-${i.incidentId}-rehearsal`}>{t('badge.rehearsal')}</span>}
                {i.boardReportOverdue && (
                  <span className={`${badge} border-status-fail-border bg-status-fail-bg text-status-fail-fg`} data-testid={`breach-incident-${i.incidentId}-overdue`}>
                    {t('badge.overdue')}
                  </span>
                )}
                {i.boardReportLate && (
                  <span className={`${badge} border-status-fail-border bg-status-fail-bg text-status-fail-fg`} data-testid={`breach-incident-${i.incidentId}-late`}>
                    {t('badge.late')}
                  </span>
                )}
              </span>
              <span className="text-sm opacity-80">
                {t('incidents.aware')} {formatIst(i.becameAwareAt)} · {t('incidents.opened')} {formatIst(i.openedAt)} · {t('incidents.due')} {formatIst(i.boardReportDueAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function BreachListPage(): ReactElement {
  const navigate = useNavigate();
  const open = useOpenBreachIncident();
  const [prefill, setPrefill] = useState<OpenPrefill | null>(null);
  const [openError, setOpenError] = useState<string | undefined>(undefined);
  // ONE key per attempt, kept across its retries and renewed when the body changes or the attempt succeeds.
  const attempt = useRef<AttemptKey | null>(null);

  return (
    <div className="flex flex-col gap-8" data-testid="breach-list-page">
      <header>
        <h2 className="text-xl font-bold">{t('list.title')}</h2>
        <p className="text-sm opacity-80">{t('list.subtitle')}</p>
      </header>
      <SignalsPanel
        onOpenFrom={(p) => {
          setOpenError(undefined);
          setPrefill(p);
        }}
      />
      <section className="flex flex-col gap-2" aria-label={t('open.title')}>
        <h3 className="text-lg font-semibold">{t('open.title')}</h3>
        <OpenIncidentForm
          prefill={prefill}
          onClearPrefill={() => setPrefill(null)}
          pending={open.isPending}
          error={openError}
          onSubmit={(body) => {
            setOpenError(undefined);
            open
              .mutateAsync({ body, idempotencyKey: attemptKey(attempt, body) })
              .then((detail) => {
                attempt.current = null;
                setPrefill(null);
                void navigate({ to: '/data-protection/breaches/$incidentId', params: { incidentId: detail.incident.incidentId } });
              })
              .catch((err: unknown) => {
                setOpenError(err instanceof ApiError ? errorSentence(err.code, err.status) : errorSentence(undefined));
              });
          }}
        />
      </section>
      <IncidentsList />
      <MonthlyReviewPanel />
    </div>
  );
}
