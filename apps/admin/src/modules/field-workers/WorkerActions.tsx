// The acts on an opened worker — Story 13.1c (AC10; AD8). Rendered inside `WorkerDetail` (Find a worker), which hands it the worker's
// state and district from the identity it already read — ⛔ a second identity read (each is an audited decrypt).
//
// The acts shown are the ones the worker's STATE allows: waiting — Move, End; active — Move, Suspend, End; suspended — Move,
// Reactivate, End; ended — none. ⛔ Client-side role gating (13.1a C5): the server decides, and a 403 shows that act's "no access" line.
// Each act opens ONE inline confirm with a REQUIRED reason select (labels, never codes; ⛔ free text) — Reactivate has no reason —
// Move a district select (the current district excluded) and End a date input defaulting to today in India on this browser's clock
// (the SERVER judges the bounds). End's confirm says it is final; choosing "Died" relabels the date "Date of death"; choosing "Stopped
// working" shows the `-454` Q4 A line (a line, ⛔ a checkbox or a recorded attestation).
// ONE Idempotency-Key per SUBMISSION ATTEMPT (`attemptKey`): a retry of the same attempt after a retryable failure reuses it; opening an
// act afresh, a success or a final failure starts a new attempt. `mutateAsync` per act (TR12 — `mutate`'s per-call callbacks fire for
// the latest call only). The outcome is said in a status region mounted empty with the panel.

import type { FieldWorkerPostReason, FieldWorkerSuspendReason, FieldWorkerTerminateReason } from '@twt/contracts';
import { FIELD_WORKER_POST_REASONS, FIELD_WORKER_SUSPEND_REASONS, FIELD_WORKER_TERMINATE_REASONS } from '@twt/contracts';
import type { ReactElement } from 'react';
import { useEffect, useId, useRef, useState } from 'react';

import { attemptKey, useFieldWorkerAct, useFieldWorkerDistricts, type AttemptKey, type FieldWorkerActInput } from '../../api/hooks.js';
import type { WorkerSummary } from './WorkerDetail.js';
import { actGuidance, istTodayInBrowser, reasonLabel, type Guidance, type WorkerAct } from './derive.js';
import { resolveEn as t } from './i18n-en.js';
import { useSignInRedirect } from './sign-in.js';

const ACTS_BY_STATE: Record<WorkerSummary['current_state'], readonly WorkerAct[]> = {
  pending_kyc: ['move', 'end'],
  active: ['move', 'suspend', 'end'],
  suspended: ['move', 'reactivate', 'end'],
  terminated: [],
};

const REASONS: Record<WorkerAct, readonly string[]> = {
  move: FIELD_WORKER_POST_REASONS,
  suspend: FIELD_WORKER_SUSPEND_REASONS,
  reactivate: [],
  end: FIELD_WORKER_TERMINATE_REASONS,
};

export interface WorkerActionsProps {
  pariwarId: string;
  fieldWorkerId: string;
  /** The worker's name, for the outcome line only. */
  name: string;
  worker: WorkerSummary;
}

export function WorkerActions({ pariwarId, fieldWorkerId, name, worker }: WorkerActionsProps): ReactElement {
  const mutation = useFieldWorkerAct(pariwarId);
  const [open, setOpen] = useState<WorkerAct | null>(null);
  const [reason, setReason] = useState('');
  const [toDistrict, setToDistrict] = useState('');
  const [endedOn, setEndedOn] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<Guidance | null>(null);
  const [announce, setAnnounce] = useState<string | null>(null);
  const attempt = useRef<AttemptKey | null>(null);
  const firstField = useRef<HTMLSelectElement>(null);
  const ids = useId();
  useSignInRedirect(problem?.signIn === true);

  const acts = ACTS_BY_STATE[worker.current_state];

  const start = (act: WorkerAct): void => {
    attempt.current = null; // a new attempt
    setOpen(act);
    setReason('');
    setToDistrict('');
    setEndedOn(istTodayInBrowser());
    setProblem(null);
    setAnnounce(null);
  };
  // The confirm's first field takes focus when an act opens (Reactivate has none: its Confirm does).
  const confirmRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (open !== null) (firstField.current ?? confirmRef.current)?.focus();
  }, [open]);
  const cancel = (): void => {
    attempt.current = null;
    setOpen(null);
    setProblem(null);
  };

  const ready = open !== null && (open === 'reactivate' || reason !== '') && (open !== 'move' || toDistrict !== '') && (open !== 'end' || endedOn !== '');

  const input = (act: WorkerAct): FieldWorkerActInput | null => {
    const base = { fieldWorkerId, idempotencyKey: '' };
    switch (act) {
      case 'move':
        return { ...base, act: 'move', body: { from_district: worker.district, to_district: toDistrict, reason_code: reason as FieldWorkerPostReason } };
      case 'suspend':
        return { ...base, act: 'suspend', body: { reason_code: reason as FieldWorkerSuspendReason } };
      case 'reactivate':
        return { ...base, act: 'reactivate' };
      case 'end':
        return { ...base, act: 'terminate', body: { reason_code: reason as FieldWorkerTerminateReason, ended_on: endedOn } };
    }
  };

  const submit = async (): Promise<void> => {
    if (open === null || !ready || busy) return;
    const act = open;
    const built = input(act)!;
    const key = attemptKey(attempt, { act: built.act, fieldWorkerId, body: 'body' in built ? built.body : {} });
    setBusy(true);
    setProblem(null);
    setAnnounce(null);
    try {
      const result = await mutation.mutateAsync({ ...built, idempotencyKey: key });
      attempt.current = null;
      setOpen(null);
      setAnnounce(
        act === 'move'
          ? t('fw.actions.done.move', { name, district: result.district })
          : t(`fw.actions.done.${act}`, { name }),
      );
    } catch (err) {
      const g = actGuidance(err, act);
      if (!g.retryable) attempt.current = null;
      setProblem(g);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="flex flex-col gap-2 border-t pt-2" aria-labelledby={`${ids}-title`} data-testid="fw-actions">
      <h3 id={`${ids}-title`} className="font-medium">
        {t('fw.actions.title')}
      </h3>
      <div role="status" data-testid="fw-actions-status">
        {announce !== null && <p className="text-sm text-status-ok-fg">{announce}</p>}
      </div>
      {acts.length === 0 ? (
        <p className="text-sm" data-testid="fw-actions-none">
          {t('fw.actions.none')}
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {acts.map((act) => (
            <button
              key={act}
              type="button"
              className="rounded border px-3 py-1 text-sm"
              aria-expanded={open === act}
              disabled={busy}
              onClick={() => start(act)}
              data-testid={`fw-act-${act}`}
            >
              {t(`fw.actions.${act}`)}
            </button>
          ))}
        </div>
      )}
      {open !== null && (
        <form
          className="flex flex-col gap-2 rounded border p-2"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
          data-testid={`fw-act-${open}-form`}
        >
          {open === 'move' && <p className="text-sm">{t('fw.actions.move.intro')}</p>}
          {open === 'suspend' && <p className="text-sm">{t('fw.actions.suspend.intro')}</p>}
          {open === 'reactivate' && <p className="text-sm">{t('fw.actions.reactivate.intro')}</p>}
          {open === 'end' && (
            <p className="text-sm font-medium" data-testid="fw-act-end-final">
              {t('fw.actions.end.final')}
            </p>
          )}
          {open !== 'reactivate' && (
            <label className="flex flex-col gap-1 text-sm">
              {t('fw.actions.reason')}
              <select ref={firstField} required value={reason} onChange={(e) => setReason(e.target.value)} data-testid="fw-act-reason">
                <option value="">{t('fw.actions.reason.choose')}</option>
                {REASONS[open].map((r) => (
                  <option key={r} value={r}>
                    {reasonLabel(r)}
                  </option>
                ))}
              </select>
            </label>
          )}
          {open === 'end' && reason === 'inactive' && (
            <p className="text-sm" data-testid="fw-act-end-inactive-hint">
              {t('fw.actions.end.inactiveHint')}
            </p>
          )}
          {open === 'move' && <MoveDistrict pariwarId={pariwarId} current={worker.district} value={toDistrict} onChange={setToDistrict} />}
          {open === 'end' && (
            <label className="flex flex-col gap-1 text-sm">
              {reason === 'died' ? t('fw.actions.end.dateOfDeath') : t('fw.actions.end.lastDay')}
              <input type="date" required value={endedOn} onChange={(e) => setEndedOn(e.target.value)} data-testid="fw-act-ended-on" />
            </label>
          )}
          {problem !== null && (
            <p role="alert" className="text-sm text-status-fail-fg" data-testid="fw-act-error">
              {problem.text}
            </p>
          )}
          <div className="flex gap-2">
            <button
              ref={confirmRef}
              type="submit"
              className="rounded bg-black px-3 py-1 text-sm text-white disabled:opacity-50"
              disabled={!ready || busy}
              data-testid="fw-act-confirm"
            >
              {busy ? t('fw.actions.saving') : problem?.retryable === true ? t('fw.retry') : t('fw.actions.confirm')}
            </button>
            <button type="button" className="text-sm underline" onClick={cancel} disabled={busy} data-testid="fw-act-cancel">
              {t('fw.actions.cancel')}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

/** Move's district select — the Pariwar's recorded districts, the worker's current one excluded (it would be `district_unchanged`). */
function MoveDistrict({ pariwarId, current, value, onChange }: { pariwarId: string; current: string; value: string; onChange: (d: string) => void }): ReactElement {
  const districts = useFieldWorkerDistricts(pariwarId);
  const others = (districts.data?.districts ?? []).filter((d) => d !== current);
  if (districts.isPending) return <p className="text-sm">{t('fw.loading')}</p>;
  if (districts.isError) return <p role="alert" className="text-sm text-status-fail-fg">{t('fw.district.loadError')}</p>;
  if (others.length === 0) return <p className="text-sm">{t('fw.actions.move.noOther')}</p>;
  return (
    <label className="flex flex-col gap-1 text-sm">
      {t('fw.actions.move.to')}
      <select required value={value} onChange={(e) => onChange(e.target.value)} data-testid="fw-act-to-district">
        <option value="">{t('fw.actions.move.choose')}</option>
        {others.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>
    </label>
  );
}
