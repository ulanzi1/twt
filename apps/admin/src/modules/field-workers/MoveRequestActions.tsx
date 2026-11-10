// The acts on ONE move request in a list — Story 13.1d (AC9; AD10). Which acts a row offers is decided by the PAGE from the row and
// the officer (`acts`): Accept / Refuse for a request waiting for this officer's district; Withdraw on the officer's own; Close on an
// escalated one in the Pariwar Admin's view. ⛔ Client-side role gating beyond that (13.1a C5): the server decides, and a 403 shows the
// act's own line.
//
// Refuse opens an inline form with a REQUIRED reason select (labels only — AD7; ⛔ free text) that takes focus, can be cancelled (button
// or Escape, focus back on "Refuse") and is named for the worker. ONE Idempotency-Key per attempt (`attemptKey`); the mutation never
// pauses offline (`networkMode: 'always'`). A 409 that says the request has moved on refreshes the lists (the hook) — and the line that
// says so goes to the PAGE (`onStale`), because this row is about to leave the list and would take its own alert with it (AD10 "refresh
// the lists and say so"; code review CR42). A press with nothing chosen says so; "Saving…" is said in the row's status region (CR47).
// The outcome is reported to the page (`onDone`), which says it in its status region and takes focus there.

import type { FieldWorkerMoveRefusalReason, FieldWorkerMoveRequestItem } from '@twt/contracts';
import { FIELD_WORKER_MOVE_REFUSAL_REASONS } from '@twt/contracts';
import type { ReactElement } from 'react';
import { useEffect, useRef, useState } from 'react';

import { attemptKey, useFieldWorkerMoveRequestAct, type AttemptKey } from '../../api/hooks.js';
import { refusalLabel, requestGuidance, type Guidance, type RequestAct } from './derive.js';
import { resolveEn as t } from './i18n-en.js';
import { useSignInRedirect } from './sign-in.js';

export type ListAct = Exclude<RequestAct, 'ask'>;

export function MoveRequestActions({
  pariwarId,
  item,
  acts,
  onDone,
  onStale,
}: {
  pariwarId: string;
  item: FieldWorkerMoveRequestItem;
  acts: readonly ListAct[];
  onDone: (text: string) => void;
  /** A refusal that says the request moved on: the page keeps the line (this row leaves the list); `null` when a new act starts. */
  onStale?: (text: string | null) => void;
}): ReactElement | null {
  const mutation = useFieldWorkerMoveRequestAct(pariwarId);
  const [refusing, setRefusing] = useState(false);
  const [reason, setReason] = useState('');
  const [needReason, setNeedReason] = useState(false);
  const [busy, setBusy] = useState<ListAct | null>(null);
  const [problem, setProblem] = useState<Guidance | null>(null);
  const attempt = useRef<AttemptKey | null>(null);
  const selectRef = useRef<HTMLSelectElement>(null);
  const openButtonRef = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(false);
  useSignInRedirect(problem?.signIn === true);
  // The form takes focus when it opens; when it is CANCELLED focus returns to "Refuse" (a success leaves the row, and the page takes focus).
  useEffect(() => {
    if (refusing) {
      selectRef.current?.focus();
      restoreFocus.current = true;
    } else if (restoreFocus.current) {
      restoreFocus.current = false;
      openButtonRef.current?.focus();
    }
  }, [refusing]);
  if (acts.length === 0) return null;

  const closeRefuse = (): void => {
    setRefusing(false);
    setReason('');
    setNeedReason(false);
    setProblem(null);
  };

  const run = async (act: ListAct): Promise<void> => {
    if (busy !== null) return;
    if (act === 'refuse' && reason === '') {
      setNeedReason(true);
      return;
    }
    const body = act === 'refuse' ? { act, moveRequestId: item.move_request_id, reason: reason as FieldWorkerMoveRefusalReason } : { act, moveRequestId: item.move_request_id };
    const key = attemptKey(attempt, body);
    setBusy(act);
    setProblem(null);
    onStale?.(null);
    try {
      const r = await mutation.mutateAsync({ ...body, idempotencyKey: key } as Parameters<typeof mutation.mutateAsync>[0]);
      attempt.current = null;
      restoreFocus.current = false; // the row is leaving the list: the page takes focus, ⛔ a button about to unmount
      setRefusing(false);
      onDone(t(`fw.requests.done.${act}`, act === 'accept' ? { name: item.name, district: r.worker_district } : { name: item.name }));
    } catch (err) {
      const g = requestGuidance(err, act);
      if (!g.retryable) attempt.current = null;
      // A stale refusal refreshes the lists and the row leaves: the page says it, ⛔ a line that unmounts with the row.
      if (g.stale === true && onStale !== undefined) onStale(g.text);
      else setProblem(g);
    } finally {
      setBusy(null);
    }
  };

  const disabled = busy !== null;
  const forName = t('fw.forName', { name: item.name });
  return (
    <div className="flex flex-col gap-1" data-testid="fw-request-actions">
      <div className="flex gap-2">
        {acts.map((act) =>
          act === 'refuse' ? (
            <button
              key={act}
              type="button"
              ref={openButtonRef}
              className="rounded border px-3 py-1 text-sm"
              aria-expanded={refusing}
              onClick={() => {
                // A refusal in flight: closing the form now would clear the reason being sent, and a failure would have no form to retry from
                // (Cancel and Escape are guarded the same way; code review RP-9).
                if (busy !== null) return;
                if (refusing) closeRefuse();
                else setRefusing(true);
              }}
              data-testid="fw-request-refuse-open"
            >
              {t('fw.requests.refuse')}
              <span className="sr-only"> {forName}</span>
            </button>
          ) : (
            <button
              key={act}
              type="button"
              className={`rounded border px-3 py-1 text-sm ${disabled ? 'opacity-60' : ''}`}
              aria-disabled={disabled}
              onClick={() => void run(act)}
              data-testid={`fw-request-${act}`}
            >
              {busy === act ? t('fw.requests.saving') : t(`fw.requests.${act}`)}
              <span className="sr-only"> {forName}</span>
            </button>
          ),
        )}
      </div>
      {/* Mounted with the row, so a change is ANNOUNCED: "Saving…" while an act is in flight, and the hint for a press with nothing chosen. */}
      <div role="status" data-testid="fw-request-status">
        {busy !== null && <span className="sr-only">{t('fw.requests.saving')}</span>}
        {needReason && (
          <p className="text-sm" data-testid="fw-request-need-reason">
            {t('fw.requests.refuse.needReason')}
          </p>
        )}
      </div>
      {refusing && (
        <form
          aria-label={`${t('fw.requests.refuse')} ${forName}`}
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void run('refuse');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape' && busy === null) closeRefuse();
          }}
          data-testid="fw-request-refuse-form"
        >
          <label className="flex flex-col text-sm">
            {t('fw.requests.refuse.reason')}
            <select
              ref={selectRef}
              value={reason}
              aria-required="true"
              onChange={(e) => {
                if (busy !== null) return;
                setReason(e.target.value);
                setNeedReason(false);
                setProblem(null);
              }}
              className="rounded border px-2 py-1"
              data-testid="fw-request-refuse-reason"
            >
              <option value="">{t('fw.requests.refuse.choose')}</option>
              {FIELD_WORKER_MOVE_REFUSAL_REASONS.map((r) => (
                <option key={r} value={r}>
                  {refusalLabel(r)}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            aria-disabled={reason === '' || disabled}
            className={`rounded bg-black px-3 py-1 text-sm text-white ${reason === '' || disabled ? 'opacity-60' : ''}`}
            data-testid="fw-request-refuse"
          >
            {busy === 'refuse' ? t('fw.requests.saving') : t('fw.requests.refuse.confirm')}
            <span className="sr-only"> {forName}</span>
          </button>
          <button type="button" className="rounded border px-3 py-1 text-sm" onClick={() => !disabled && closeRefuse()} data-testid="fw-request-refuse-cancel">
            {t('fw.requests.refuse.cancel')}
          </button>
        </form>
      )}
      {problem !== null && (
        <p role="alert" className="text-sm text-status-fail-fg" data-testid="fw-request-error">
          {problem.text}
        </p>
      )}
    </div>
  );
}
