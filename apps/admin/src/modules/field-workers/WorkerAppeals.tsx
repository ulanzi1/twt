// Find's per-worker appeal record and lodging form (13.1f AD13, Task 6.2; R5). No second identity decrypt, no client-side role gate.
import type { ReactElement } from 'react';
import { useRef, useState } from 'react';

import { useFieldWorkerEndingAppealsOf } from '../../api/hooks.js';
import { focusIfUnclaimed } from '../marketplace/focus.js';
import type { WorkerSummary } from './WorkerDetail.js';
import { LodgeAppealForm } from './LodgeAppealForm.js';
import { fieldWorkerGuidance, formatIstDate, istDateOf } from './derive.js';
import { resolveEn as t } from './i18n-en.js';
import { useSignInRedirect } from './sign-in.js';

export function WorkerAppeals({ pariwarId, fieldWorkerId, worker }: { pariwarId: string; fieldWorkerId: string; worker: WorkerSummary }): ReactElement {
  const appeals = useFieldWorkerEndingAppealsOf(pariwarId, fieldWorkerId);
  const [recording, setRecording] = useState(false);
  /**
   * The lodge's outcome, for the ENDING it was lodged against (review R3-6): an Undo in the same panel closes that appeal and moves the worker
   * to a new version, and the line went on saying the appeal "waits for a decision". It is shown only while the panel shows that ending.
   */
  const [outcome, setOutcome] = useState<{ text: string; endingVersion: number } | null>(null);
  // A stale refusal of a lodge (the ending changed, an appeal appeared) is said HERE: the refresh it triggers re-keys the lodging form, and a
  // line kept inside the form would go with it (code review round 2, chunk D: R2D-2).
  const [stale, setStale] = useState<string | null>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const problem = appeals.isError ? fieldWorkerGuidance(appeals.error, 'appeals') : null;
  useSignInRedirect(problem?.signIn === true);
  const items = appeals.data?.items ?? [];
  const current = items.filter((a) => a.ending_event_version === worker.state_event_version);
  const canRecord = worker.current_state === 'terminated' && appeals.isSuccess && !current.some((a) => a.state === 'open' || a.state === 'refused');

  return (
    <section ref={sectionRef} className="flex flex-col gap-2 border-t pt-2" aria-labelledby={`fw-worker-appeals-${fieldWorkerId}`} data-testid="fw-worker-appeals">
      <h3 id={`fw-worker-appeals-${fieldWorkerId}`} ref={titleRef} tabIndex={-1} className="font-medium">{t('fw.appeals.title')}</h3>
      <div role="status">
        {appeals.isPending && <p>{t('fw.loading')}</p>}
        {appeals.isSuccess && <p className="sr-only">{t(items.length === 0 ? 'fw.appeals.recordsNone' : items.length === 1 ? 'fw.appeals.recordsOne' : 'fw.appeals.recordsLoaded', { count: items.length })}</p>}
        {outcome !== null && outcome.endingVersion === worker.state_event_version && <p data-testid="fw-worker-appeals-outcome">{outcome.text}</p>}
      </div>
      {/* Mounted EMPTY, so the line arrives into a live region (it is heard), and it outlives the form the refusal re-keys. */}
      <div role="alert" data-testid="fw-worker-appeals-stale">{stale !== null && <p className="text-sm text-status-fail-fg">{stale}</p>}</div>
      {problem !== null && (
        <div role="alert">
          <p>{problem.text}</p>
          {/* The refetch unmounts this alert with the button: focus stays in the panel (as `WorkerDetail`, CR42), ⛔ falls to the body. */}
          {problem.retryable === true && <button type="button" onClick={() => { titleRef.current?.focus(); void appeals.refetch(); }}>{t('fw.retry')}</button>}
        </div>
      )}
      {appeals.isSuccess && items.length === 0 && <p>{t('fw.appeals.empty')}</p>}
      <ul className="flex flex-col gap-2 text-sm">
        {items.map((a) => (
          <li key={a.appeal_id} data-testid="fw-worker-appeal">
            <p>{t(`fw.appeals.state.${a.state}`)} · {t(`fw.appeals.heardBy.${a.heard_by}`)}</p>
            <p>{t('fw.appeals.received', { date: formatIstDate(a.received_on), via: t(`fw.appeals.via.${a.received_via}`) })}</p>
            {a.decided_on !== null && <p>{t('fw.appeals.decided', { date: formatIstDate(a.decided_on) })}</p>}
          </li>
        ))}
      </ul>
      {canRecord && (!recording ? (
        <button type="button" className="self-start rounded border px-3 py-1 text-sm" onClick={() => { titleRef.current?.focus(); setRecording(true); }} data-testid="fw-worker-appeals-record">{t('fw.appeals.record')}</button>
      ) : (
        <LodgeAppealForm key={`${fieldWorkerId}:${String(worker.state_event_version)}`} pariwarId={pariwarId} fieldWorkerId={fieldWorkerId} endingVersion={worker.state_event_version} minDate={istDateOf(worker.created_at)} onAttempt={() => setStale(null)} onStale={(line) => { setStale(line); focusIfUnclaimed(titleRef.current, sectionRef.current); }} onLodged={() => { setStale(null); setOutcome({ text: t('fw.appeals.lodged'), endingVersion: worker.state_event_version }); focusIfUnclaimed(titleRef.current, sectionRef.current); }} />
      ))}
    </section>
  );
}
