// "Ask to move" on an opened worker — Story 13.1d (AC9; AD10). Rendered in the Find panel BESIDE `WorkerActions` (13.1c's acts stay
// untouched), fed by the identity already on screen (⛔ a second audited read). Offered for the worker's states `pending_kyc`, `active`
// and `suspended` (⛔ `terminated`); ⛔ client-side role gating (13.1a C5) — the server decides, and a 403 shows its line.
//
// ⚠ Per-worker state (the form, the target, the attempt's key, the outcome line) lives in this component, and the Find panel's
// `WorkerDetail` is keyed by the open worker — everything under it, this included, remounts when another worker is opened, so one
// worker's form, retry key or status never reaches the next (CR48 (a)). ⛔ A `key` of its own here would be a no-op (code review RP-15);
// `field-worker-find-page.test.tsx` pins the reset through the page itself.
//
// One inline form: a district select excluding the worker's current district (and, when the Pariwar records more than 200 districts, a
// field to type one exactly, as `DistrictPicker` does); it sends `{ from_district: worker.district, to_district }`. ONE Idempotency-Key
// per SUBMISSION ATTEMPT (`attemptKey`): a retry of the same attempt reuses it, an edit or a new opening starts a new one. A 201
// `escalated` says the request went straight to the Pariwar Admin (AD8 (b) — the opener, as the actor, gets no notice of it). The outcome,
// "Sending…" and the hint for a press with nothing chosen are said in a status region mounted empty with the component. A refusal that says
// the panel's own copy of the worker is out of date (moved, or ended, meanwhile) withdraws the form, keeps the line here (CR48) and tells
// the panel (`onStale`), which withdraws the acts it offers on the same stale copy (RP-6). Focus goes to the select when the form opens and
// back to "Ask to move" when it closes (CR47) — or onto the stale line when the form closes into one, ⛔ the body (RP-4). Whatever held focus
// in the open form and is replaced as the districts read settles - the select replaced by "no other district" (R4-3), the districts' Try again
// gone when the retry succeeds (R5-5) - hands focus to the select, else to Cancel. A refusal that lands after
// this component unmounted (the officer opened another worker) tells the panel NOTHING: its verdict was on a copy no longer on screen, and
// the same worker reopened is a fresh read (R4-4).

import type { ReactElement } from 'react';
import { useEffect, useId, useRef, useState } from 'react';

import { ApiError } from '../../api/client.js';
import { attemptKey, useFieldWorkerDistricts, useFieldWorkerMoveRequestAct, type AttemptKey } from '../../api/hooks.js';
import type { WorkerSummary } from './WorkerDetail.js';
import { fieldWorkerGuidance, requestGuidance, type Guidance } from './derive.js';
import { resolveEn as t } from './i18n-en.js';
import { useSignInRedirect } from './sign-in.js';

export function AskToMove({
  pariwarId,
  fieldWorkerId,
  name,
  worker,
  onStale,
}: {
  pariwarId: string;
  fieldWorkerId: string;
  name: string;
  worker: WorkerSummary;
  /** A refusal that says the panel's own copy of the worker is out of date: `moved` (409 `authorization_stale`) or `state` (409 `illegal_transition`). */
  onStale?: (kind: 'state' | 'moved') => void;
}): ReactElement | null {
  const mutation = useFieldWorkerMoveRequestAct(pariwarId);
  const districts = useFieldWorkerDistricts(pariwarId);
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState('');
  const [typed, setTyped] = useState('');
  const [needTo, setNeedTo] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<Guidance | null>(null);
  const [stale, setStale] = useState<string | null>(null);
  const [announce, setAnnounce] = useState<string | null>(null);
  const attempt = useRef<AttemptKey | null>(null);
  const selectRef = useRef<HTMLSelectElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const staleRef = useRef<HTMLParagraphElement>(null);
  const wasOpen = useRef(false);
  /** False once unmounted: a late refusal must not judge the copy a reopened panel has read afresh (R4-4). */
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const ids = useId();
  const districtsError = districts.isError ? fieldWorkerGuidance(districts.error, 'find') : null;
  useSignInRedirect(problem?.signIn === true || districtsError?.signIn === true);
  // Focus follows the form: into it when it opens, back on "Ask to move" when it closes. The button is mounted only while the form is
  // CLOSED, so the return has to wait for that render — which is why this is an effect, ⛔ a call at the end of `submit`. A form that closes
  // into a STALE line has no button to return to (it is withdrawn with the form): the line itself takes focus (RP-4).
  useEffect(() => {
    if (open) {
      (selectRef.current ?? cancelRef.current)?.focus();
      wasOpen.current = true;
    } else if (wasOpen.current) {
      wasOpen.current = false;
      (buttonRef.current ?? staleRef.current)?.focus();
    }
  }, [open]);
  const truncated = districts.data?.districts_truncated === true;
  const others = (districts.data?.districts ?? []).filter((d) => d !== worker.district);
  const noOther = others.length === 0 && districts.isSuccess && !truncated;
  // R4-3 / R5-5: the element that held focus in the open form was replaced as the districts read settled (the select by "no other district",
  // Try again by the select) and focus fell to the body - the select takes it, else Cancel. ⛔ Moved from anywhere but the body.
  const districtsFailed = districtsError !== null;
  useEffect(() => {
    if (open && (document.activeElement === null || document.activeElement === document.body)) (selectRef.current ?? cancelRef.current)?.focus();
  }, [open, noOther, districtsFailed]);

  if (worker.current_state === 'terminated') return null;

  const submit = async (): Promise<void> => {
    if (busy) return;
    if (to === '') {
      setNeedTo(true);
      return;
    }
    const body = { from_district: worker.district, to_district: to };
    const key = attemptKey(attempt, body);
    setBusy(true);
    setProblem(null);
    setAnnounce(null);
    try {
      const r = await mutation.mutateAsync({ act: 'open', fieldWorkerId, idempotencyKey: key, body });
      attempt.current = null;
      setOpen(false);
      setAnnounce(r.state === 'escalated' ? t('fw.ask.escalated') : t('fw.ask.sent', { name, district: worker.district }));
    } catch (err) {
      const g = requestGuidance(err, 'ask');
      if (!g.retryable) attempt.current = null;
      if (g.stale === true) {
        setStale(g.text);
        setOpen(false);
        if (mounted.current) onStale?.(err instanceof ApiError && err.code === 'field_worker.authorization_stale' ? 'moved' : 'state');
      } else {
        setProblem(g);
      }
    } finally {
      setBusy(false);
    }
  };

  const disabled = to === '' || busy;
  return (
    <div className="flex flex-col gap-2" data-testid="fw-ask">
      <div role="status" data-testid="fw-ask-status">
        {busy && <span className="sr-only">{t('fw.ask.sending')}</span>}
        {needTo && (
          <p className="text-sm" data-testid="fw-ask-need-to">
            {t('fw.ask.needTo')}
          </p>
        )}
        {announce !== null && (
          <p className="rounded bg-status-ok-bg p-2 text-sm text-status-ok-fg" data-testid="fw-ask-announce">
            {announce}
          </p>
        )}
      </div>
      {stale !== null && (
        <p role="alert" ref={staleRef} tabIndex={-1} className="text-sm text-status-fail-fg" data-testid="fw-ask-stale">
          {stale}
        </p>
      )}
      {!open && stale === null && (
        <button
          type="button"
          ref={buttonRef}
          className="self-start rounded border px-3 py-1 text-sm"
          onClick={() => {
            attempt.current = null;
            setTo('');
            setTyped('');
            setNeedTo(false);
            setProblem(null);
            setAnnounce(null);
            setOpen(true);
          }}
          data-testid="fw-ask-open"
        >
          {t('fw.ask.button')}
        </button>
      )}
      {problem !== null && (
        <p role="alert" className="text-sm text-status-fail-fg" data-testid="fw-ask-error">
          {problem.text}
        </p>
      )}
      {open && (
        <form
          aria-label={t('fw.ask.button')}
          className="flex flex-col gap-2 rounded border p-3"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
          data-testid="fw-ask-form"
        >
          <p id={`${ids}-intro`} className="text-sm">
            {t('fw.ask.intro')}
          </p>
          {districts.isPending && <p role="status">{t('fw.loading')}</p>}
          {districtsError !== null && (
            <div role="alert" className="flex flex-col gap-1 text-sm text-status-fail-fg" data-testid="fw-ask-districts-error">
              <p>{districtsError.text}</p>
              <button type="button" className="self-start rounded border px-3 py-1" onClick={() => void districts.refetch()}>
                {t('fw.retry')}
              </button>
            </div>
          )}
          {noOther ? (
            <p className="text-sm" data-testid="fw-ask-no-other">
              {t('fw.ask.noOther')}
            </p>
          ) : (
            <label className="flex flex-col text-sm">
              {t('fw.ask.to')}
              <select
                ref={selectRef}
                aria-describedby={`${ids}-intro`}
                aria-required="true"
                value={others.includes(to) ? to : ''}
                onChange={(e) => {
                  if (busy) return;
                  setTo(e.target.value);
                  setTyped('');
                  setNeedTo(false);
                  setProblem(null);
                }}
                className="rounded border px-2 py-1"
                data-testid="fw-ask-to"
              >
                <option value="">{t('fw.ask.choose')}</option>
                {others.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
          )}
          {truncated && (
            <label className="flex flex-col text-sm">
              {t('fw.ask.typed')}
              <input
                type="text"
                value={typed}
                onChange={(e) => {
                  if (busy) return;
                  setTyped(e.target.value);
                  setTo(e.target.value);
                  setNeedTo(false);
                  setProblem(null);
                }}
                className="rounded border px-2 py-1"
                data-testid="fw-ask-typed"
              />
            </label>
          )}
          <div className="flex gap-2">
            <button type="submit" aria-disabled={disabled} className={`rounded bg-black px-3 py-1 text-sm text-white ${disabled ? 'opacity-60' : ''}`} data-testid="fw-ask-send">
              {busy ? t('fw.ask.sending') : problem?.retryable ? t('fw.retry') : t('fw.ask.send')}
            </button>
            <button
              type="button"
              ref={cancelRef}
              className="rounded border px-3 py-1 text-sm"
              onClick={() => {
                if (busy) return;
                attempt.current = null;
                setOpen(false);
                setProblem(null);
                setNeedTo(false);
              }}
              data-testid="fw-ask-cancel"
            >
              {t('fw.ask.cancel')}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
