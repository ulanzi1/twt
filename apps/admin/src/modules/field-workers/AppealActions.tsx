// The hearer's acts on an OPEN appeal — Story 13.1f (AC12; AD9, AD14). Allow, Refuse, or record that the worker Withdrew, each with the
// day it was decided (today in India on this browser's clock by default; the SERVER judges the bounds). The hearer records it (`-454`;
// `-465` Q5 A). ⛔ Client-side role gating: the server's 403 (another hearer's appeal) and 409s (the ender, a super admin on a Panel-heard
// appeal, an appeal no longer open, the number in use again) are shown as lines. After any act the officer is reminded "Tell the worker."
// (`-465` Q3 A). ONE Idempotency-Key per submission attempt; mounted with `key={appealId}` so one appeal never inherits another's form.

import type { FieldWorkerEndingAppeal } from '@twt/contracts';
import type { ReactElement } from 'react';
import { useRef, useState } from 'react';

import { attemptKey, useFieldWorkerAppealAct, type AttemptKey } from '../../api/hooks.js';
import { fieldWorkerGuidance, istTodayInBrowser, type Guidance } from './derive.js';
import { resolveEn as t } from './i18n-en.js';
import { useSignInRedirect } from './sign-in.js';

type AppealAct = 'allowed' | 'refused' | 'withdrawn';

export function AppealActions({ pariwarId, appeal, name }: { pariwarId: string; appeal: FieldWorkerEndingAppeal; name: string }): ReactElement {
  const mutation = useFieldWorkerAppealAct(pariwarId);
  const [open, setOpen] = useState<AppealAct | null>(null);
  const [decidedOn, setDecidedOn] = useState(istTodayInBrowser());
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<Guidance | null>(null);
  const [announce, setAnnounce] = useState<string | null>(null);
  const attempt = useRef<AttemptKey | null>(null);
  useSignInRedirect(problem?.signIn === true);

  const submit = async (): Promise<void> => {
    if (open === null || busy || decidedOn === '') return;
    const act = open;
    const key = attemptKey(attempt, { appeal: appeal.appeal_id, act, decidedOn });
    setBusy(true);
    setProblem(null);
    try {
      if (act === 'withdrawn') {
        await mutation.mutateAsync({ act: 'withdraw', appealId: appeal.appeal_id, fieldWorkerId: appeal.field_worker_id, idempotencyKey: key, decidedOn });
      } else {
        await mutation.mutateAsync({ act: 'decide', appealId: appeal.appeal_id, fieldWorkerId: appeal.field_worker_id, idempotencyKey: key, body: { outcome: act, decided_on: decidedOn } });
      }
      attempt.current = null;
      setOpen(null);
      setAnnounce(`${t(`fw.appeals.done.${act}`, { name })} ${t('fw.actions.tell')}`);
    } catch (err) {
      const g = fieldWorkerGuidance(err, 'appeals');
      if (g.retryable !== true) attempt.current = null;
      setProblem(g);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-1" data-testid="fw-appeal-actions">
      <div role="status">{announce !== null && <p className="text-status-ok-fg" data-testid="fw-appeal-done">{announce}</p>}</div>
      {announce === null && (
        <div className="flex flex-wrap gap-2">
          {(['allowed', 'refused', 'withdrawn'] as const).map((act) => (
            <button key={act} type="button" className="rounded border px-3 py-1" aria-expanded={open === act} disabled={busy} onClick={() => setOpen(act)} data-testid={`fw-appeal-${act}`}>
              {t(`fw.appeals.act.${act}`)}
            </button>
          ))}
        </div>
      )}
      {open !== null && (
        <form
          aria-label={t(`fw.appeals.act.${open}`)}
          className="flex flex-col gap-2 rounded border p-2"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
          data-testid="fw-appeal-form"
        >
          {open === 'allowed' && <p data-testid="fw-appeal-allow-intro">{t('fw.appeals.allowIntro')}</p>}
          <label className="flex flex-col gap-1">
            {t('fw.appeals.decidedOn')}
            <input type="date" required value={decidedOn} max={istTodayInBrowser()} onChange={(e) => setDecidedOn(e.target.value)} data-testid="fw-appeal-decided-on" />
          </label>
          {problem !== null && (
            <p role="alert" className="text-status-fail-fg" data-testid="fw-appeal-error">
              {problem.text}
            </p>
          )}
          <div className="flex gap-2">
            <button type="submit" className="rounded bg-black px-3 py-1 text-white disabled:opacity-50" disabled={busy || decidedOn === ''} data-testid="fw-appeal-confirm">
              {busy ? t('fw.actions.saving') : t('fw.actions.confirm')}
            </button>
            <button type="button" className="underline" disabled={busy} onClick={() => setOpen(null)}>
              {t('fw.actions.cancel')}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
