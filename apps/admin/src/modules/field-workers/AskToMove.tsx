// "Ask to move" on an opened worker — Story 13.1d (AC9; AD10). Rendered in the Find panel BESIDE `WorkerActions` (13.1c's acts stay
// untouched), fed by the identity already on screen (⛔ a second audited read). Offered for the worker's states `pending_kyc`, `active`
// and `suspended` (⛔ `terminated`); ⛔ client-side role gating (13.1a C5) — the server decides, and a 403 shows its line.
//
// One inline form: a district select excluding the worker's current district; it sends `{ from_district: worker.district,
// to_district }`. ONE Idempotency-Key per SUBMISSION ATTEMPT (`attemptKey`): a retry of the same attempt reuses it, an edit or a new
// opening starts a new one. A 201 `escalated` says the request went straight to the Pariwar Admin (AD8 (b) — the opener, as the actor,
// gets no notice of it). The outcome and "Sending…" are said in a status region mounted empty with the component.

import type { ReactElement } from 'react';
import { useEffect, useId, useRef, useState } from 'react';

import { attemptKey, useFieldWorkerDistricts, useFieldWorkerMoveRequestAct, type AttemptKey } from '../../api/hooks.js';
import type { WorkerSummary } from './WorkerDetail.js';
import { requestGuidance, type Guidance } from './derive.js';
import { resolveEn as t } from './i18n-en.js';
import { useSignInRedirect } from './sign-in.js';

export function AskToMove({ pariwarId, fieldWorkerId, name, worker }: { pariwarId: string; fieldWorkerId: string; name: string; worker: WorkerSummary }): ReactElement | null {
  const mutation = useFieldWorkerMoveRequestAct(pariwarId);
  const districts = useFieldWorkerDistricts(pariwarId);
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<Guidance | null>(null);
  const [announce, setAnnounce] = useState<string | null>(null);
  const attempt = useRef<AttemptKey | null>(null);
  const selectRef = useRef<HTMLSelectElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const ids = useId();
  useSignInRedirect(problem?.signIn === true);
  useEffect(() => {
    if (open) selectRef.current?.focus();
  }, [open]);

  if (worker.current_state === 'terminated') return null;
  const others = (districts.data?.districts ?? []).filter((d) => d !== worker.district);

  const submit = async (): Promise<void> => {
    if (to === '' || busy) return;
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
      buttonRef.current?.focus();
    } catch (err) {
      const g = requestGuidance(err, 'ask');
      if (!g.retryable) attempt.current = null;
      setProblem(g);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-2" data-testid="fw-ask">
      <div role="status" data-testid="fw-ask-status">
        {busy && <span className="sr-only">{t('fw.ask.sending')}</span>}
        {announce !== null && (
          <p className="rounded bg-status-ok-bg p-2 text-sm text-status-ok-fg" data-testid="fw-ask-announce">
            {announce}
          </p>
        )}
      </div>
      {!open && (
        <button
          type="button"
          ref={buttonRef}
          className="self-start rounded border px-3 py-1 text-sm"
          onClick={() => {
            attempt.current = null;
            setTo('');
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
          {others.length === 0 && districts.isSuccess ? (
            <p className="text-sm" data-testid="fw-ask-no-other">
              {t('fw.ask.noOther')}
            </p>
          ) : (
            <label className="flex flex-col text-sm">
              {t('fw.ask.to')}
              <select
                ref={selectRef}
                aria-describedby={`${ids}-intro`}
                value={to}
                onChange={(e) => {
                  if (busy) return;
                  setTo(e.target.value);
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
          <div className="flex gap-2">
            <button type="submit" aria-disabled={to === '' || busy} className="rounded bg-black px-3 py-1 text-sm text-white" data-testid="fw-ask-send">
              {busy ? t('fw.ask.sending') : problem?.retryable ? t('fw.retry') : t('fw.ask.send')}
            </button>
            <button
              type="button"
              className="rounded border px-3 py-1 text-sm"
              onClick={() => {
                if (busy) return;
                attempt.current = null;
                setOpen(false);
                setProblem(null);
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
