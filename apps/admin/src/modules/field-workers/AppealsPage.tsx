// The Appeals page — Story 13.1f (AC12; AD7, AD9, AD13, AD14; decision `2026-11-16-464`; the Panel's `2026-11-17-465`).
//
// Two lists. "Appeals": the appeals against endings this officer may read (a Trustee Panel reader sees only those the Panel hears — the
// server's rule), filtered by state, each with its hearer, dates and — for an open one — the hearer's Allow / Refuse / Withdrawn acts
// (`AppealActions`). "Record an appeal": the ended workers this officer can record an appeal for (the server's eligible list — the only
// way a Trustee Panel holder, who cannot open Find a worker, reaches a worker), each with its own lodge form (the day the worker appealed,
// by phone or in person). Both lists DECRYPT the workers' names behind an audit line a page (`gcTime: 0` — see the hooks). ⛔ Client-side
// role gating: the server decides who may act, and its 403 / 409 lines are shown. No grounds or notes are typed — what the worker said
// stays with the officer (13.1 QE12). Each form is keyed by its worker or appeal id (13.1d CR48), so one never inherits another's state.

import type { FieldWorkerAppealEligibleItem, FieldWorkerEndingAppealChannel, FieldWorkerEndingAppealState } from '@twt/contracts';
import { FIELD_WORKER_ENDING_APPEAL_STATES } from '@twt/contracts';
import type { ReactElement } from 'react';
import { useRef, useState } from 'react';

import { attemptKey, useAppealEligibleFieldWorkers, useFieldWorkerAppealAct, useFieldWorkerEndingAppeals, type AttemptKey } from '../../api/hooks.js';
import { AppealActions } from './AppealActions.js';
import { FieldWorkerNav } from './FieldWorkerNav.js';
import { fieldWorkerGuidance, formatIstDate, istTodayInBrowser, reasonLabel, type Guidance } from './derive.js';
import { resolveEn as t } from './i18n-en.js';
import { useSignInRedirect } from './sign-in.js';

export function AppealsPage({ pariwarId }: { pariwarId: string }): ReactElement {
  const [state, setState] = useState<FieldWorkerEndingAppealState | null>('open');
  const appeals = useFieldWorkerEndingAppeals(pariwarId, state);
  const [recording, setRecording] = useState(false);
  /**
   * The last act's outcome (a decision, a withdrawal, a lodge) — said HERE, in a status region mounted with the page: the act's own row
   * leaves its list on the refresh (a decided appeal is no longer "waiting"; a lodged worker is no longer eligible), so a line inside it
   * would never be seen (browser pass 2026-11-17).
   */
  const [outcome, setOutcome] = useState<string | null>(null);
  const eligible = useAppealEligibleFieldWorkers(pariwarId, recording);
  const listProblem = appeals.isError ? fieldWorkerGuidance(appeals.error, 'appeals') : null;
  useSignInRedirect(listProblem?.signIn === true);
  const items = appeals.data?.pages.flatMap((p) => p.items) ?? [];
  const candidates = eligible.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <section className="flex max-w-3xl flex-col gap-4 p-4" data-testid="fw-appeals-page">
      <h1 className="text-xl font-semibold">{t('fw.appeals.title')}</h1>
      <FieldWorkerNav pariwarId={pariwarId} current="appeals" />
      <p className="text-sm">{t('fw.appeals.intro')}</p>
      <div role="status" data-testid="fw-appeals-outcome">
        {outcome !== null && <p className="text-sm text-status-ok-fg">{outcome}</p>}
      </div>

      <label className="flex items-center gap-2 text-sm">
        {t('fw.appeals.filter')}
        <select value={state ?? ''} onChange={(e) => setState(e.target.value === '' ? null : (e.target.value as FieldWorkerEndingAppealState))} data-testid="fw-appeals-filter">
          <option value="">{t('fw.appeals.filter.all')}</option>
          {FIELD_WORKER_ENDING_APPEAL_STATES.map((s) => (
            <option key={s} value={s}>
              {t(`fw.appeals.state.${s}`)}
            </option>
          ))}
        </select>
      </label>

      {appeals.isPending && <p className="text-sm">{t('fw.loading')}</p>}
      {listProblem !== null && (
        <p role="alert" className="text-sm text-status-fail-fg" data-testid="fw-appeals-error">
          {listProblem.text}
        </p>
      )}
      {appeals.isSuccess && items.length === 0 && <p className="text-sm" data-testid="fw-appeals-empty">{t('fw.appeals.empty')}</p>}
      {items.length > 0 && (
        <ul className="flex flex-col gap-2" data-testid="fw-appeals-list">
          {items.map((a) => (
            <li key={a.appeal_id} className="flex flex-col gap-1 rounded border p-2 text-sm" data-testid="fw-appeal-item">
              <p className="font-medium">
                {a.name} · {a.district}
              </p>
              <p>
                {t(`fw.appeals.state.${a.state}`)} · {t(`fw.appeals.heardBy.${a.heard_by}`)}
              </p>
              <p>{t('fw.appeals.received', { date: formatIstDate(a.received_on), via: t(`fw.appeals.via.${a.received_via}`) })}</p>
              {a.decided_on !== null && <p>{t('fw.appeals.decided', { date: formatIstDate(a.decided_on) })}</p>}
              {a.state === 'open' && <AppealActions key={a.appeal_id} pariwarId={pariwarId} appeal={a} name={a.name} onDone={setOutcome} />}
            </li>
          ))}
        </ul>
      )}
      {appeals.hasNextPage && (
        <button type="button" className="self-start text-sm underline" disabled={appeals.isFetching} onClick={() => void appeals.fetchNextPage()}>
          {t('fw.history.more')}
        </button>
      )}

      <section className="flex flex-col gap-2 border-t pt-2" aria-labelledby="fw-appeals-record-title">
        <h2 id="fw-appeals-record-title" className="font-medium">
          {t('fw.appeals.record')}
        </h2>
        {!recording ? (
          <button type="button" className="self-start rounded border px-3 py-1 text-sm" onClick={() => setRecording(true)} data-testid="fw-appeals-record-open">
            {t('fw.appeals.record')}
          </button>
        ) : (
          <>
            {eligible.isPending && <p className="text-sm">{t('fw.loading')}</p>}
            {eligible.isError && (
              <p role="alert" className="text-sm text-status-fail-fg">
                {fieldWorkerGuidance(eligible.error, 'appeals').text}
              </p>
            )}
            {eligible.isSuccess && candidates.length === 0 && <p className="text-sm" data-testid="fw-appeals-eligible-empty">{t('fw.appeals.eligible.empty')}</p>}
            <ul className="flex flex-col gap-2" data-testid="fw-appeals-eligible">
              {candidates.map((c) => (
                <LodgeForm key={`${c.field_worker_id}:${String(c.ending_event_version)}`} pariwarId={pariwarId} worker={c} onLodged={setOutcome} />
              ))}
            </ul>
          </>
        )}
      </section>
    </section>
  );
}

/** One ended worker and the form that records their appeal — the hearer records it (`-454`: "recorded by the officer who hears it"). */
function LodgeForm({ pariwarId, worker, onLodged }: { pariwarId: string; worker: FieldWorkerAppealEligibleItem; onLodged: (line: string) => void }): ReactElement {
  const mutation = useFieldWorkerAppealAct(pariwarId);
  const [receivedOn, setReceivedOn] = useState(istTodayInBrowser());
  const [via, setVia] = useState<FieldWorkerEndingAppealChannel | ''>('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<Guidance | null>(null);
  const [done, setDone] = useState(false);
  const attempt = useRef<AttemptKey | null>(null);
  useSignInRedirect(problem?.signIn === true);

  const submit = async (): Promise<void> => {
    if (busy || via === '' || receivedOn === '') return;
    const body = { expected_ending_version: worker.ending_event_version, received_on: receivedOn, received_via: via };
    const key = attemptKey(attempt, { worker: worker.field_worker_id, ...body });
    setBusy(true);
    setProblem(null);
    try {
      await mutation.mutateAsync({ act: 'lodge', fieldWorkerId: worker.field_worker_id, idempotencyKey: key, body });
      attempt.current = null;
      setDone(true);
      onLodged(t('fw.appeals.lodgedFor', { name: worker.display_name }));
    } catch (err) {
      const g = fieldWorkerGuidance(err, 'appeals');
      if (g.retryable !== true) attempt.current = null;
      setProblem(g);
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="flex flex-col gap-1 rounded border p-2 text-sm" data-testid="fw-appeals-eligible-item">
      <p className="font-medium">
        {worker.display_name} · {worker.district}
      </p>
      <p>
        {t('fw.appeals.endedOn', { date: formatIstDate(worker.ended_on), reason: reasonLabel(worker.reason_code) })} · {t(`fw.appeals.heardBy.${worker.heard_by}`)}
      </p>
      {done ? (
        <p role="status" className="text-status-ok-fg" data-testid="fw-appeals-lodged">
          {t('fw.appeals.lodged')}
        </p>
      ) : (
        <form
          aria-label={t('fw.appeals.record')}
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <label className="flex flex-col gap-1">
            {t('fw.appeals.receivedOn')}
            <input type="date" required value={receivedOn} max={istTodayInBrowser()} onChange={(e) => setReceivedOn(e.target.value)} data-testid="fw-appeals-received-on" />
          </label>
          <label className="flex flex-col gap-1">
            {t('fw.appeals.via')}
            <select required value={via} onChange={(e) => setVia(e.target.value as FieldWorkerEndingAppealChannel | '')} data-testid="fw-appeals-via">
              <option value="">{t('fw.appeals.via.choose')}</option>
              <option value="phone">{t('fw.appeals.via.phone')}</option>
              <option value="in_person">{t('fw.appeals.via.in_person')}</option>
            </select>
          </label>
          {problem !== null && (
            <p role="alert" className="text-status-fail-fg" data-testid="fw-appeals-lodge-error">
              {problem.text}
            </p>
          )}
          <button type="submit" className="self-start rounded bg-black px-3 py-1 text-white disabled:opacity-50" disabled={via === '' || busy} data-testid="fw-appeals-lodge">
            {busy ? t('fw.actions.saving') : t('fw.appeals.lodge')}
          </button>
        </form>
      )}
    </li>
  );
}
