// The acts on an opened worker — Story 13.1c (AC10; AD8). Rendered inside `WorkerDetail` (Find a worker), which hands it the worker's
// state and district from the identity it already read — ⛔ a second identity read (each is an audited decrypt).
//
// The acts shown are the ones the worker's STATE allows: waiting — Move, End; active — Move, Suspend, End; suspended — Move,
// Reactivate, End; ended — none. ⛔ Client-side role gating (13.1a C5): the server decides, and a 403 shows that act's "no access" line.
// Each act opens ONE inline confirm with a REQUIRED reason select (labels, never codes; ⛔ free text) — Reactivate has no reason —
// Move a district select (the current district excluded; an exact-text field when the Pariwar has more districts than can be listed)
// and End a date input defaulting to today in India on this browser's clock (the SERVER judges the bounds; the control only refuses a
// day before the registration, which the identity already says). End's confirm says it is final; choosing "Died" relabels the date
// "Date of death" AND EMPTIES it — a death date is a fact the officer supplies, never a default, and Confirm waits for one (`-456`
// item 1; leaving "Died" puts today back); choosing "Stopped working" shows the `-454` Q4 A line (a line, ⛔ a checkbox or a recorded
// attestation).
// ONE Idempotency-Key per SUBMISSION ATTEMPT (`attemptKey`): a retry of the same attempt after a retryable failure reuses it; opening an
// act afresh, a success or a final failure starts a new attempt (re-pressing the OPEN act's button does nothing — it must not wipe the
// form or lose the key of a try whose answer never arrived). `mutateAsync` per act (TR12 — `mutate`'s per-call callbacks fire for the
// latest call only). The mutation never pauses offline (`networkMode: 'always'`, `useFieldWorkerAct`).
//
// A 409 that says the panel's own copy of the worker is out of date (`authorization_stale`, `illegal_transition`) withdraws the acts: the
// identity is deliberately not re-read here (each read is audited), so a retry would resend the same doomed body; the panel says so and
// asks the officer to reopen the worker (review CR23). Accessibility (checklist family 13): the confirm is a NAMED form; the line that
// frames the act (Move / Suspend / Reactivate's intro, End's finality line) describes the control focus lands on; the "Stopped working"
// line arrives in a status region mounted with the form; focus never falls to the body when the form closes (Cancel returns to the act
// that opened it, a result to the panel's heading); the outcome, and "Saving…", are said in a status region mounted empty with the panel.
// ⚠ Per-worker state (`open`, the attempt's key, `stale`, the outcome line) lives in this component: mount it with `key={fieldWorkerId}`
// (`WorkerDetail`'s `key` in `FindWorkerPage` does) — a reused instance would carry one worker's withdrawn acts over to the next.

import type { FieldWorkerPostReason, FieldWorkerSuspendReason, FieldWorkerTerminateReason } from '@twt/contracts';
import { FIELD_WORKER_POST_REASONS, FIELD_WORKER_SUSPEND_REASONS, FIELD_WORKER_TERMINATE_REASONS } from '@twt/contracts';
import type { ReactElement } from 'react';
import { useEffect, useId, useRef, useState } from 'react';

import { attemptKey, useFieldWorkerAct, useFieldWorkerDistricts, type AttemptKey, type FieldWorkerActInput } from '../../api/hooks.js';
import { focusIfUnclaimed } from '../marketplace/focus.js';
import type { WorkerSummary } from './WorkerDetail.js';
import { actGuidance, defaultEndDate, istDateOf, reasonLabel, type Guidance, type WorkerAct } from './derive.js';
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

/** The contract's `ended_on` is four-digit-year `YYYY-MM-DD`; a browser date field would otherwise accept a longer year (a 400). */
const END_DATE_MAX = '9999-12-31';
/** The server refuses a district longer than 200 characters (`WireDistrict`). */
const DISTRICT_MAX_LENGTH = 200;

export interface WorkerActionsProps {
  pariwarId: string;
  fieldWorkerId: string;
  /** The worker's name, for the outcome line only. */
  name: string;
  worker: WorkerSummary;
  /** Called when a 409 says the panel's copy of the worker is out of date, so the panel can withdraw what depends on it ("Show code"). */
  onStale?: () => void;
}

export function WorkerActions({ pariwarId, fieldWorkerId, name, worker, onStale }: WorkerActionsProps): ReactElement {
  const mutation = useFieldWorkerAct(pariwarId);
  const [open, setOpen] = useState<WorkerAct | null>(null);
  const [reason, setReason] = useState('');
  const [toDistrict, setToDistrict] = useState('');
  const [endedOn, setEndedOn] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<Guidance | null>(null);
  /** The panel's copy of the worker is out of date (a 409): the acts are withdrawn until the worker is reopened. */
  const [stale, setStale] = useState<string | null>(null);
  const [announce, setAnnounce] = useState<string | null>(null);
  const attempt = useRef<AttemptKey | null>(null);
  const firstField = useRef<HTMLSelectElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const actRefs = useRef(new Map<WorkerAct, HTMLButtonElement>());
  const ids = useId();
  const introId = `${ids}-intro`;
  useSignInRedirect(problem?.signIn === true);

  const acts = ACTS_BY_STATE[worker.current_state];

  const start = (act: WorkerAct): void => {
    if (open === act) {
      // Already open: a second press must not wipe the form or the attempt's key — it takes the officer to the form.
      (firstField.current ?? confirmRef.current)?.focus();
      return;
    }
    attempt.current = null; // a new attempt
    setOpen(act);
    setReason('');
    setToDistrict('');
    setEndedOn(defaultEndDate(worker.created_at));
    setProblem(null);
    setAnnounce(null);
  };
  // The confirm's first field takes focus when an act opens (Reactivate has none: its Confirm does).
  useEffect(() => {
    if (open !== null) (firstField.current ?? confirmRef.current)?.focus();
  }, [open]);
  /** Editing a field clears the error that described the OLD value — ⛔ one that is not about a value (no access, sign-in). */
  const clearValueProblem = (): void => setProblem((p) => (p !== null && (p.noAccess === true || p.signIn === true) ? p : null));
  /** Entering or leaving "Died" restarts the End date at that reason's own starting point: none for a death, today for the rest (`-456`). */
  const chooseReason = (next: string): void => {
    if (open === 'end' && (next === 'died') !== (reason === 'died')) setEndedOn(next === 'died' ? '' : defaultEndDate(worker.created_at));
    setReason(next);
    clearValueProblem();
  };
  const cancel = (): void => {
    attempt.current = null;
    // The pressed Cancel unmounts with the form: focus goes back to the act that opened it, never to the body.
    if (open !== null) actRefs.current.get(open)?.focus();
    setOpen(null);
    setProblem(null);
  };

  const ready = open !== null && (open === 'reactivate' || reason !== '') && (open !== 'move' || toDistrict.trim() !== '') && (open !== 'end' || endedOn !== '');

  /** The request WITHOUT its key: `submit` fills `idempotencyKey` from the attempt (the placeholder is never sent). */
  const draft = (act: WorkerAct): FieldWorkerActInput => {
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
    const built = draft(act);
    const key = attemptKey(attempt, { ...built, idempotencyKey: undefined });
    setBusy(true);
    setProblem(null);
    setAnnounce(null);
    let result: Awaited<ReturnType<typeof mutation.mutateAsync>>;
    try {
      result = await mutation.mutateAsync({ ...built, idempotencyKey: key });
    } catch (err) {
      const g = actGuidance(err, act);
      if (!g.retryable) attempt.current = null;
      if (g.stale === true) {
        focusIfUnclaimed(titleRef.current, formRef.current);
        setOpen(null);
        setStale(g.text);
        onStale?.();
      } else {
        setProblem(g);
      }
      return;
    } finally {
      setBusy(false);
    }
    // Only a request that FAILED reaches the catch above: nothing below can make a committed act read as a failed one (review PR6).
    attempt.current = null;
    // The form (and the focused Confirm) unmount: the result is said in the status region and focus rests on the panel's heading —
    // unless the officer has gone elsewhere meanwhile.
    focusIfUnclaimed(titleRef.current, formRef.current);
    setOpen(null);
    setAnnounce(
      act === 'move'
        ? t('fw.actions.done.move', { name, district: result.district })
        : t(`fw.actions.done.${act}`, { name }),
    );
  };

  return (
    <section className="flex flex-col gap-2 border-t pt-2" aria-labelledby={`${ids}-title`} data-testid="fw-actions">
      <h3 id={`${ids}-title`} ref={titleRef} tabIndex={-1} className="font-medium outline-none">
        {t('fw.actions.title')}
      </h3>
      <div role="status" data-testid="fw-actions-status">
        {busy && <p className="sr-only">{t('fw.actions.saving')}</p>}
        {announce !== null && <p className="text-sm text-status-ok-fg">{announce}</p>}
      </div>
      {stale !== null && (
        <div role="alert" className="flex flex-col gap-1 text-sm text-status-fail-fg" data-testid="fw-actions-stale">
          <p data-testid="fw-actions-stale-text">{stale}</p>
          <p>{t('fw.actions.reopen')}</p>
        </div>
      )}
      {stale === null &&
        (acts.length === 0 ? (
          <p className="text-sm" data-testid="fw-actions-none">
            {t('fw.actions.none')}
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {acts.map((act) => (
              <button
                key={act}
                ref={(el) => {
                  if (el === null) actRefs.current.delete(act);
                  else actRefs.current.set(act, el);
                }}
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
        ))}
      {stale === null && open !== null && (
        <form
          ref={formRef}
          aria-label={t(`fw.actions.${open}`)}
          className="flex flex-col gap-2 rounded border p-2"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
          data-testid={`fw-act-${open}-form`}
        >
          {open === 'move' && (
            <p id={introId} className="text-sm">
              {t('fw.actions.move.intro')}
            </p>
          )}
          {open === 'suspend' && (
            <p id={introId} className="text-sm">
              {t('fw.actions.suspend.intro')}
            </p>
          )}
          {open === 'reactivate' && (
            <p id={introId} className="text-sm">
              {t('fw.actions.reactivate.intro')}
            </p>
          )}
          {open === 'end' && (
            <p id={introId} className="text-sm font-medium" data-testid="fw-act-end-final">
              {t('fw.actions.end.final')}
            </p>
          )}
          {open !== 'reactivate' && (
            <label className="flex flex-col gap-1 text-sm">
              {t('fw.actions.reason')}
              <select
                ref={firstField}
                required
                value={reason}
                aria-describedby={introId}
                onChange={(e) => chooseReason(e.target.value)}
                data-testid="fw-act-reason"
              >
                <option value="">{t('fw.actions.reason.choose')}</option>
                {REASONS[open].map((r) => (
                  <option key={r} value={r}>
                    {reasonLabel(r)}
                  </option>
                ))}
              </select>
            </label>
          )}
          {/* Mounted with the End form, EMPTY: the line arrives into a live region, so choosing "Stopped working" is heard (family 13 (d)). */}
          {open === 'end' && (
            <div role="status" data-testid="fw-act-hint">
              {reason === 'inactive' && (
                <p className="text-sm" data-testid="fw-act-end-inactive-hint">
                  {t('fw.actions.end.inactiveHint')}
                </p>
              )}
            </div>
          )}
          {open === 'move' && (
            <MoveDistrict
              pariwarId={pariwarId}
              current={worker.district}
              value={toDistrict}
              onChange={(d) => {
                setToDistrict(d);
                clearValueProblem();
              }}
            />
          )}
          {open === 'end' && (
            <label className="flex flex-col gap-1 text-sm">
              {reason === 'died' ? t('fw.actions.end.dateOfDeath') : t('fw.actions.end.lastDay')}
              <input
                type="date"
                required
                value={endedOn}
                min={istDateOf(worker.created_at)}
                max={END_DATE_MAX}
                onChange={(e) => {
                  setEndedOn(e.target.value);
                  clearValueProblem();
                }}
                data-testid="fw-act-ended-on"
              />
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
              className={`rounded bg-black px-3 py-1 text-sm text-white disabled:opacity-50${busy ? ' opacity-50' : ''}`}
              disabled={!ready}
              // Busy is `aria-disabled`, ⛔ `disabled`: the focused Confirm must keep focus while it saves (a disabled control loses it);
              // `submit` ignores a press while busy.
              aria-disabled={busy || undefined}
              aria-describedby={open === 'reactivate' ? introId : undefined}
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

/**
 * Move's district choice — the Pariwar's recorded districts, the worker's current one excluded (it would be `district_unchanged`). When
 * the read says `districts_truncated` (more than can be listed) an exact-text field is offered as well, as `DistrictPicker` does: a
 * district past the list can still be chosen, sent byte for byte, and judged by the server (review CR28).
 */
function MoveDistrict({ pariwarId, current, value, onChange }: { pariwarId: string; current: string; value: string; onChange: (d: string) => void }): ReactElement {
  const districts = useFieldWorkerDistricts(pariwarId);
  const [typed, setTyped] = useState('');
  const typedId = useId();
  const hintId = useId();
  const truncated = districts.data?.districts_truncated === true;
  const others = (districts.data?.districts ?? []).filter((d) => d !== current);
  if (districts.isPending) return <p className="text-sm">{t('fw.loading')}</p>;
  // v5 keeps `data` when a REFETCH (a window refocus) fails: the controls stay, the error replaces them only with nothing to show —
  // otherwise a chosen district would stay set and submittable while its control is gone (review PR9).
  if (districts.isError && districts.data === undefined) return <p role="alert" className="text-sm text-status-fail-fg">{t('fw.district.loadError')}</p>;
  if (others.length === 0 && !truncated) return <p className="text-sm">{t('fw.actions.move.noOther')}</p>;
  return (
    <>
      {others.length > 0 && (
        <label className="flex flex-col gap-1 text-sm">
          {t('fw.actions.move.to')}
          <select
            required={typed === ''}
            value={typed === '' ? value : ''}
            onChange={(e) => {
              setTyped('');
              onChange(e.target.value);
            }}
            data-testid="fw-act-to-district"
          >
            <option value="">{t('fw.actions.move.choose')}</option>
            {others.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
      )}
      {truncated && (
        <div className="flex flex-col gap-1 text-sm">
          <p data-testid="fw-act-to-district-truncated">{t('fw.district.truncated')}</p>
          <label htmlFor={typedId}>{t('fw.district.typed')}</label>
          <input
            id={typedId}
            className="rounded border px-2 py-1"
            value={typed}
            maxLength={DISTRICT_MAX_LENGTH}
            aria-describedby={hintId}
            onChange={(e) => {
              setTyped(e.target.value);
              onChange(e.target.value);
            }}
            data-testid="fw-act-to-district-typed"
          />
          <p id={hintId} className="text-xs">
            {t('fw.district.typedHint')}
          </p>
        </div>
      )}
    </>
  );
}
