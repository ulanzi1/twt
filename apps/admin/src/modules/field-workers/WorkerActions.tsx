// The acts on an opened worker — Story 13.1c (AC10; AD8). Rendered inside `WorkerDetail` (Find a worker), which hands it the worker's
// state and district from the identity it already read — ⛔ a second identity read (each is an audited decrypt).
//
// The acts shown are the ones the worker's STATE allows: waiting — Move, End; active — Move, Suspend, End; suspended — Move,
// Reactivate, End; ended — Undo ending (Story 13.1f AD6; the server decides who may). ⛔ Client-side role gating (13.1a C5): the server decides, and a 403 shows that act's "no access" line.
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

import {
  attemptKey,
  useFieldWorkerAct,
  useFieldWorkerDistricts,
  useFieldWorkerEndingAppealsOf,
  type AttemptKey,
  type FieldWorkerActInput,
} from '../../api/hooks.js';
import { focusIfUnclaimed } from '../marketplace/focus.js';
import type { WorkerSummary } from './WorkerDetail.js';
import { actGuidance, defaultEndDate, fieldWorkerGuidance, istDateOf, reasonLabel, type Guidance, type WorkerAct } from './derive.js';
import { resolveEn as t } from './i18n-en.js';
import { useSignInRedirect } from './sign-in.js';

const ACTS_BY_STATE: Record<WorkerSummary['current_state'], readonly WorkerAct[]> = {
  pending_kyc: ['move', 'end'],
  active: ['move', 'suspend', 'end'],
  suspended: ['move', 'reactivate', 'end'],
  // Story 13.1f (AD6) — an ended worker can be restored by a Pariwar Admin (the server decides who; ⛔ client-side role gating).
  terminated: ['undo'],
};

const REASONS: Record<WorkerAct, readonly string[]> = {
  move: FIELD_WORKER_POST_REASONS,
  suspend: FIELD_WORKER_SUSPEND_REASONS,
  reactivate: [],
  end: FIELD_WORKER_TERMINATE_REASONS,
  undo: [],
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
  /**
   * Another part of the panel learned its copy of the worker is out of date — "Show code" met a 409 `code_not_available` (`'state'`: no
   * longer active) or `authorization_stale` (`'moved'`): the acts are withdrawn as after their own 409, with the matching line, so none
   * is offered for a status or district the worker no longer has (review R2-5, RP-2; `-457` item 2 (k)). Announced POLITELY: the code's
   * own refusal, an alert, says it first (RP-3). ⛔ `onStale` is not called back — the code's line stays. Ignored while this panel's own
   * act is saving: that act may be what changed the worker, and its 200 updates the panel (RP-1).
   */
  externalStale?: 'state' | 'moved' | null;
}

export function WorkerActions({ pariwarId, fieldWorkerId, name, worker, onStale, externalStale = null }: WorkerActionsProps): ReactElement {
  const mutation = useFieldWorkerAct(pariwarId);
  const [open, setOpen] = useState<WorkerAct | null>(null);
  const [reason, setReason] = useState('');
  const [toDistrict, setToDistrict] = useState('');
  const [endedOn, setEndedOn] = useState('');
  const [busy, setBusy] = useState(false);
  /** `busy` for the effect below, which must not re-run when it changes. */
  const busyRef = useRef(false);
  const [problem, setProblem] = useState<Guidance | null>(null);
  /** The panel's copy of the worker is out of date (a 409): the acts are withdrawn until the worker is reopened. */
  const [stale, setStale] = useState<{ text: string; polite: boolean } | null>(null);
  const [announce, setAnnounce] = useState<string | null>(null);
  const attempt = useRef<AttemptKey | null>(null);
  const firstField = useRef<HTMLSelectElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const actRefs = useRef(new Map<WorkerAct, HTMLButtonElement>());
  /** The undo form's Confirm has taken focus once in THIS opening (R2D-6): a later refetch must not take it again. */
  const undoFocused = useRef(false);
  const ids = useId();
  const introId = `${ids}-intro`;

  const acts = ACTS_BY_STATE[worker.current_state];
  // Story 13.1f (AD14) — the undo confirm says when an open appeal on this ending will close (read only while that confirm is open).
  const appeals = useFieldWorkerEndingAppealsOf(pariwarId, fieldWorkerId, open === 'undo');
  const openAppeal = (appeals.data?.items ?? []).some((a) => a.state === 'open' && a.ending_event_version === worker.state_event_version);
  const undoCheckReady = appeals.isSuccess && appeals.fetchStatus === 'idle';
  /** A check that HAD answered is being read again (a refused undo re-reads it - R3-1): Confirm is held, ⛔ disabled (R3-13). */
  const undoRechecking = open === 'undo' && appeals.isSuccess && appeals.fetchStatus !== 'idle';
  const appealProblem = open === 'undo' && appeals.isError ? fieldWorkerGuidance(appeals.error, 'appeals') : null;
  useSignInRedirect(problem?.signIn === true || appealProblem?.signIn === true);

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
  useEffect(() => {
    if (externalStale === null || busyRef.current) return;
    // An open form unmounts with focus in it: focus the heading first, as the act's own 409 does (RP-1).
    focusIfUnclaimed(titleRef.current, formRef.current);
    attempt.current = null;
    setOpen(null);
    setProblem(null);
    setAnnounce(null);
    setStale((s) => s ?? { text: t(externalStale === 'moved' ? 'fw.actions.moved' : 'fw.actions.stateChanged'), polite: true });
  }, [externalStale]);
  // The confirm's first field takes focus when an act opens (Reactivate has none: its Confirm does).
  useEffect(() => {
    if (open !== null) (open === 'undo' ? formRef.current : (firstField.current ?? confirmRef.current))?.focus();
  }, [open]);
  // The undo's Confirm takes focus when its appeal check FIRST completes — and only from the form itself or the Undo button it was opened from,
  // ⛔ from a control the officer has already moved to (Cancel is inside the form, and `focusIfUnclaimed`'s "inside the form" counts it as
  // unclaimed). Once per opening: a refetch that took `undoCheckReady` false and true again moved focus from Cancel to Confirm, so Enter or
  // Space meant for Cancel confirmed an undo (code review round 2, chunk D: R2D-6).
  useEffect(() => {
    if (open !== 'undo') {
      undoFocused.current = false;
      return;
    }
    if (!undoCheckReady || undoFocused.current) return;
    undoFocused.current = true;
    const active = document.activeElement;
    if (active === null || active === document.body || active === formRef.current || active === actRefs.current.get('undo')) confirmRef.current?.focus();
  }, [open, undoCheckReady]);
  /** Editing a field clears the error that described the OLD value — ⛔ one that is not about a value (no access, sign-in). */
  const clearValueProblem = (): void => setProblem((p) => (p !== null && (p.noAccess === true || p.signIn === true) ? p : null));
  /** Entering or leaving "Died" restarts the End date at that reason's own starting point: none for a death, today for the rest (`-456`). */
  const chooseReason = (next: string): void => {
    if (busy) return; // the fields are held while an act saves (see `held` below)
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

  /**
   * While an act saves, its fields are HELD: an edit then would not be what was sent, yet the form would show it (review R2-2). Held as
   * Confirm is, `aria-disabled` and a change that is ignored, ⛔ `disabled`: Enter in the date or the typed district submits with focus
   * in that field, and a disabled field loses it. ⚠ Only while it saves: after a failure the fields are editable, and an EDITED body is a
   * new attempt with a new key (`attemptKey`, round 1 CR20) — if the first had committed, the server refuses the second (RP-9).
   */
  const held = busy || undefined;

  const ready = open !== null && (open === 'reactivate' || open === 'undo' || reason !== '') && (open !== 'undo' || undoCheckReady) && (open !== 'move' || toDistrict.trim() !== '') && (open !== 'end' || endedOn !== '');

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
        // The version the panel showed (R2A-2): a worker ended and then restored since is refused, never ended again by a stale screen.
        return {
          ...base,
          act: 'terminate',
          body: { reason_code: reason as FieldWorkerTerminateReason, ended_on: endedOn, expected_state_event_version: worker.state_event_version },
        };
      case 'undo':
        // The ending the panel showed (AD6) — the cache copies each act's version, so End then Undo names THIS ending (G24).
        return { ...base, act: 'undo', body: { expected_ending_version: worker.state_event_version } };
    }
  };

  const submit = async (): Promise<void> => {
    if (open === null || !ready || busy) return;
    const act = open;
    const built = draft(act);
    const key = attemptKey(attempt, { ...built, idempotencyKey: undefined });
    setBusy(true);
    busyRef.current = true;
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
        setStale({ text: g.text, polite: false });
        onStale?.();
      } else {
        setProblem(g);
      }
      return;
    } finally {
      setBusy(false);
      busyRef.current = false;
    }
    // Only a request that FAILED reaches the catch above: nothing below can make a committed act read as a failed one (review PR6).
    attempt.current = null;
    // The form (and the focused Confirm) unmount: the result is said in the status region and focus rests on the panel's heading —
    // unless the officer has gone elsewhere meanwhile.
    focusIfUnclaimed(titleRef.current, formRef.current);
    setOpen(null);
    // Story 13.1f (AD14) — after an End or an undo the officer is reminded to tell the worker (`-465` Q3 A).
    const done = act === 'move' ? t('fw.actions.done.move', { name, district: result.district }) : t(`fw.actions.done.${act}`, { name });
    setAnnounce(act === 'end' ? `${done} ${t('fw.actions.tell.end')}` : act === 'undo' ? `${done} ${t('fw.actions.tell')}` : done);
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
        <div role={stale.polite ? 'status' : 'alert'} className="flex flex-col gap-1 text-sm text-status-fail-fg" data-testid="fw-actions-stale">
          <p data-testid="fw-actions-stale-text">{stale.text}</p>
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
          tabIndex={-1}
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
          {open === 'undo' && (
            <div id={introId} className="flex flex-col gap-1 text-sm">
              <p data-testid="fw-act-undo-intro">{t('fw.actions.undo.intro')}</p>
              <div role="status" data-testid="fw-act-undo-check">
                {!undoCheckReady && appealProblem === null && <p>{t('fw.loading')}</p>}
                {undoCheckReady && openAppeal && <p data-testid="fw-act-undo-open-appeal">{t('fw.actions.undo.openAppeal')}</p>}
              </div>
              {appealProblem !== null && (
                <div role="alert">
                  <p>{appealProblem.text}</p>
                  {/* The refetch unmounts this alert with the button: focus goes to the form first, ⛔ falls to the body (R2D-11). */}
                  {appealProblem.retryable === true && <button type="button" onClick={() => { formRef.current?.focus(); void appeals.refetch(); }}>{t('fw.retry')}</button>}
                </div>
              )}
            </div>
          )}
          {open === 'end' && (
            <p id={introId} className="text-sm font-medium" data-testid="fw-act-end-final">
              {t('fw.actions.end.final')}
            </p>
          )}
          {open !== 'reactivate' && open !== 'undo' && (
            <label className="flex flex-col gap-1 text-sm">
              {t('fw.actions.reason')}
              <select
                ref={firstField}
                required
                value={reason}
                aria-describedby={introId}
                aria-disabled={held}
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
              held={busy}
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
                aria-disabled={held}
                onChange={(e) => {
                  if (busy) return;
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
              disabled={!ready && !undoRechecking}
              // Busy is `aria-disabled`, ⛔ `disabled`: the focused Confirm must keep focus while it saves (a disabled control loses it);
              // `submit` ignores a press while busy. The same while Undo's appeal check is RE-read (review R3-13): `ready` is false then, so
              // `submit` ignores the press, but a `disabled` Confirm would drop the officer's focus to the body, and `undoFocused` would not
              // put it back.
              aria-disabled={busy || undoRechecking || undefined}
              aria-describedby={open === 'reactivate' || open === 'undo' ? introId : undefined}
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
function MoveDistrict({ pariwarId, current, value, held, onChange }: { pariwarId: string; current: string; value: string; held: boolean; onChange: (d: string) => void }): ReactElement {
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
            aria-disabled={held || undefined}
            onChange={(e) => {
              if (held) return; // held while the move saves (review R2-2)
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
            aria-disabled={held || undefined}
            onChange={(e) => {
              if (held) return;
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
