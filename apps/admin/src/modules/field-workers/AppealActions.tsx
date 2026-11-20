// The hearer's acts on an OPEN appeal — Story 13.1f (AC12; AD9, AD14). Allow, Refuse, or record that the worker Withdrew, each with the
// day it was decided (today in India on this browser's clock by default; the SERVER judges the bounds). The hearer records it (`-454`;
// `-465` Q5 A). ⛔ Client-side role gating: the server's 403 (another hearer's appeal) and 409s (the ender, a super admin on a Panel-heard
// appeal, an appeal no longer open, the number in use again) are shown as lines. After any act the officer is reminded "Tell the worker."
// (`-465` Q3 A). ONE Idempotency-Key per submission attempt; mounted with `key={appealId}` so one appeal never inherits another's form.
//
// Code review round 2, chunk D: the refusal lines are THIS appeal's own (`appealGuidance` — who hears it, what to do next), a STALE refusal
// is reported to the PAGE (`onStale`) because the refresh it triggers unmounts this row (R2D-2), the form's fields are held while it saves
// and its errors clear when the officer edits or changes act (R2D-9, R2D-10), and focus is kept where the module's other forms keep it
// (R2D-11).

import type { FieldWorkerEndingAppeal } from '@twt/contracts';
import type { ReactElement } from 'react';
import { useEffect, useRef, useState } from 'react';

import { attemptKey, useFieldWorkerAppealAct, type AttemptKey } from '../../api/hooks.js';
import { appealGuidance, istTodayInBrowser, type Guidance } from './derive.js';
import { resolveEn as t } from './i18n-en.js';
import { useSignInRedirect } from './sign-in.js';

type AppealAct = 'allowed' | 'refused' | 'withdrawn';

/**
 * `onDone` receives the outcome line (with the "Tell the worker." reminder): the PAGE shows it, because a decided appeal leaves an "open"
 * list on the refresh and this component unmounts with it (browser pass 2026-11-17 — the line was never seen). `onStale` receives a
 * refusal that says the list is out of date, for the same reason: the refresh it triggers removes this row, and its own line with it
 * (R2D-2). `onAttempt` tells the page a new attempt began, so a stale line about the last one is cleared.
 */
export function AppealActions({
  pariwarId,
  appeal,
  name,
  onDone,
  onStale,
  onAttempt,
}: {
  pariwarId: string;
  appeal: FieldWorkerEndingAppeal;
  name: string;
  onDone: (line: string) => void;
  onStale: (line: string) => void;
  onAttempt?: () => void;
}): ReactElement {
  const mutation = useFieldWorkerAppealAct(pariwarId);
  const [open, setOpen] = useState<AppealAct | null>(null);
  const [decidedOn, setDecidedOn] = useState(istTodayInBrowser());
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<Guidance | null>(null);
  const attempt = useRef<AttemptKey | null>(null);
  const inFlight = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const actRefs = useRef(new Map<AppealAct, HTMLButtonElement>());
  useSignInRedirect(problem?.signIn === true);

  // The form takes focus when an act opens (as `WorkerActions`): a keyboard officer lands in it, not on the button they pressed.
  useEffect(() => {
    if (open !== null) formRef.current?.focus();
  }, [open]);

  /** Editing the date, or choosing another act, clears the line that described the OLD value — ⛔ one that is not about a value (no access, sign-in). */
  const clearValueProblem = (): void => setProblem((p) => (p !== null && (p.noAccess === true || p.signIn === true) ? p : null));

  const start = (act: AppealAct): void => {
    if (inFlight.current || open === act) return;
    clearValueProblem();
    setOpen(act);
  };
  const cancel = (): void => {
    if (inFlight.current) return;
    attempt.current = null;
    // The pressed Cancel unmounts with the form: focus goes back to the act that opened it, never to the body.
    if (open !== null) actRefs.current.get(open)?.focus();
    setOpen(null);
    setProblem(null);
  };

  const submit = async (): Promise<void> => {
    if (open === null || inFlight.current || decidedOn === '') return;
    const act = open;
    const key = attemptKey(attempt, { appeal: appeal.appeal_id, act, decidedOn });
    inFlight.current = true;
    setBusy(true);
    setProblem(null);
    onAttempt?.();
    try {
      if (act === 'withdrawn') {
        await mutation.mutateAsync({ act: 'withdraw', appealId: appeal.appeal_id, fieldWorkerId: appeal.field_worker_id, idempotencyKey: key, decidedOn });
      } else {
        await mutation.mutateAsync({ act: 'decide', appealId: appeal.appeal_id, fieldWorkerId: appeal.field_worker_id, idempotencyKey: key, body: { outcome: act, decided_on: decidedOn } });
      }
      attempt.current = null;
      setOpen(null);
      onDone(`${t(`fw.appeals.done.${act}`, { name })} ${t('fw.actions.tell')}`);
    } catch (err) {
      const g = appealGuidance(err, { act: act === 'withdrawn' ? 'withdraw' : 'decide', heardBy: appeal.heard_by });
      if (g.retryable !== true) attempt.current = null;
      if (g.stale === true) {
        // The refusal's own refresh removes this row (an appeal no longer "waiting"), and a line kept HERE would go with it: say it on the page.
        setOpen(null);
        onStale(g.text);
      } else {
        setProblem(g);
      }
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-1" data-testid="fw-appeal-actions">
      <div className="flex flex-wrap gap-2">
        {(['allowed', 'refused', 'withdrawn'] as const).map((act) => (
          <button
            key={act}
            ref={(el) => {
              if (el === null) actRefs.current.delete(act);
              else actRefs.current.set(act, el);
            }}
            type="button"
            className="rounded border px-3 py-1"
            aria-expanded={open === act}
            // Busy is `aria-disabled`, ⛔ `disabled`: the pressed control keeps focus while it saves (a disabled one loses it).
            aria-disabled={busy || undefined}
            // Every row repeats these three controls: the name says whose they are ("Allow: Ramesh Kumar"), and still contains the visible label.
            aria-label={t('fw.appeals.actFor', { act: t(`fw.appeals.act.${act}`), name })}
            onClick={() => start(act)}
            data-testid={`fw-appeal-${act}`}
          >
            {t(`fw.appeals.act.${act}`)}
          </button>
        ))}
      </div>
      {open !== null && (
        <form
          ref={formRef}
          tabIndex={-1}
          aria-label={t('fw.appeals.actFor', { act: t(`fw.appeals.act.${open}`), name })}
          className="flex flex-col gap-2 rounded border p-2 outline-none"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
          data-testid="fw-appeal-form"
        >
          {open === 'allowed' && <p data-testid="fw-appeal-allow-intro">{t('fw.appeals.allowIntro')}</p>}
          <label className="flex flex-col gap-1">
            {t('fw.appeals.decidedOn')}
            {/* Held while it saves (R2D-10): an edit then would not be what was sent, and the retry would carry a NEW key and another date. */}
            <input
              type="date"
              required
              value={decidedOn}
              // The server judges both bounds; the control offers the days that can pass: not before the day the worker appealed (R2D-13).
              min={appeal.received_on}
              max={istTodayInBrowser()}
              readOnly={busy}
              onChange={(e) => {
                if (inFlight.current) return;
                setDecidedOn(e.target.value);
                clearValueProblem();
              }}
              data-testid="fw-appeal-decided-on"
            />
          </label>
          {problem !== null && (
            <p role="alert" className="text-status-fail-fg" data-testid="fw-appeal-error">
              {problem.text}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded bg-black px-3 py-1 text-white disabled:opacity-50"
              disabled={decidedOn === ''}
              aria-disabled={busy || undefined}
              data-testid="fw-appeal-confirm"
            >
              {busy ? t('fw.actions.saving') : t('fw.actions.confirm')}
            </button>
            <button type="button" className="underline" aria-disabled={busy || undefined} onClick={cancel}>
              {t('fw.actions.cancel')}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
