// The acts on ONE move request in a list — Story 13.1d (AC9; AD10). Which acts a row offers is decided by the PAGE from the row and
// the officer (`acts`): Accept / Refuse for a request waiting for this officer's district; Withdraw on the officer's own; Close on an
// escalated one in the Pariwar Admin's view. ⛔ Client-side role gating beyond that (13.1a C5): the server decides, and a 403 shows the
// act's own line.
//
// Refuse opens an inline form with a REQUIRED reason select (labels only — AD7; ⛔ free text). ONE Idempotency-Key per attempt
// (`attemptKey`); the mutation never pauses offline (`networkMode: 'always'`). A 409 that says the request has moved on refreshes the
// lists (the hook) and says so. The outcome is reported to the page (`onDone`), which says it in its status region.

import type { FieldWorkerMoveRefusalReason, FieldWorkerMoveRequestItem } from '@twt/contracts';
import { FIELD_WORKER_MOVE_REFUSAL_REASONS } from '@twt/contracts';
import type { ReactElement } from 'react';
import { useRef, useState } from 'react';

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
}: {
  pariwarId: string;
  item: FieldWorkerMoveRequestItem;
  acts: readonly ListAct[];
  onDone: (text: string) => void;
}): ReactElement | null {
  const mutation = useFieldWorkerMoveRequestAct(pariwarId);
  const [refusing, setRefusing] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState<ListAct | null>(null);
  const [problem, setProblem] = useState<Guidance | null>(null);
  const attempt = useRef<AttemptKey | null>(null);
  useSignInRedirect(problem?.signIn === true);
  if (acts.length === 0) return null;

  const run = async (act: ListAct): Promise<void> => {
    if (busy !== null) return;
    if (act === 'refuse' && reason === '') return;
    const body = act === 'refuse' ? { act, moveRequestId: item.move_request_id, reason: reason as FieldWorkerMoveRefusalReason } : { act, moveRequestId: item.move_request_id };
    const key = attemptKey(attempt, body);
    setBusy(act);
    setProblem(null);
    try {
      const r = await mutation.mutateAsync({ ...body, idempotencyKey: key } as Parameters<typeof mutation.mutateAsync>[0]);
      attempt.current = null;
      setRefusing(false);
      onDone(t(`fw.requests.done.${act}`, act === 'accept' ? { name: item.name, district: r.worker_district } : { name: item.name }));
    } catch (err) {
      const g = requestGuidance(err, act);
      if (!g.retryable) attempt.current = null;
      setProblem(g);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col gap-1" data-testid="fw-request-actions">
      <div className="flex gap-2">
        {acts.map((act) =>
          act === 'refuse' ? (
            <button key={act} type="button" className="rounded border px-3 py-1 text-sm" aria-expanded={refusing} onClick={() => setRefusing(true)} data-testid="fw-request-refuse-open">
              {t('fw.requests.refuse')}
              <span className="sr-only"> {t('fw.forName', { name: item.name })}</span>
            </button>
          ) : (
            <button
              key={act}
              type="button"
              className="rounded border px-3 py-1 text-sm"
              aria-disabled={busy !== null}
              onClick={() => void run(act)}
              data-testid={`fw-request-${act}`}
            >
              {busy === act ? t('fw.requests.saving') : t(`fw.requests.${act}`)}
              <span className="sr-only"> {t('fw.forName', { name: item.name })}</span>
            </button>
          ),
        )}
      </div>
      {refusing && (
        <form
          aria-label={t('fw.requests.refuse')}
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void run('refuse');
          }}
          data-testid="fw-request-refuse-form"
        >
          <label className="flex flex-col text-sm">
            {t('fw.requests.refuse.reason')}
            <select
              value={reason}
              onChange={(e) => {
                if (busy !== null) return;
                setReason(e.target.value);
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
          <button type="submit" aria-disabled={reason === '' || busy !== null} className="rounded bg-black px-3 py-1 text-sm text-white" data-testid="fw-request-refuse">
            {busy === 'refuse' ? t('fw.requests.saving') : t('fw.requests.refuse.confirm')}
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
