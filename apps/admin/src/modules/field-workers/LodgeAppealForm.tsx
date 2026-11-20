// Shared by the eligible list and Find's worker panel (13.1f R5). The caller keys the form by worker and ending version.
//
// Code review round 2, chunk D: the caller KEYS this form by the ending's version, so the refresh a stale refusal triggers re-keys it and
// its own line would go with it — a stale refusal is therefore reported to the CALLER (`onStale`), which says it where it stays mounted
// (R2D-2). The refusal lines are the appeal's own (`appealGuidance`: R2D-4, R2D-5); errors clear when a field is edited (R2D-9).
import type { FieldWorkerEndingAppealChannel } from '@twt/contracts';
import type { ReactElement } from 'react';
import { useRef, useState } from 'react';

import { attemptKey, useFieldWorkerAppealAct, type AttemptKey } from '../../api/hooks.js';
import { appealGuidance, istTodayNotBefore, type Guidance } from './derive.js';
import { resolveEn as t } from './i18n-en.js';
import { useSignInRedirect } from './sign-in.js';

export function LodgeAppealForm({
  pariwarId,
  fieldWorkerId,
  endingVersion,
  onLodged,
  onStale,
  onAttempt,
  heardBy,
  minDate,
  name,
  fromList,
}: {
  pariwarId: string;
  fieldWorkerId: string;
  endingVersion: number;
  onLodged: () => void;
  /** A refusal that says the lists on screen are out of date: the refresh it triggers removes or re-keys THIS form, so the caller says it. */
  onStale: (line: string) => void;
  /** A new attempt began — the caller clears a stale line about the last one. */
  onAttempt?: () => void;
  /** Who hears the appeal, when the caller knows (the eligible list does; Find does not): the 403 line then says which. */
  heardBy?: 'pariwar_admin' | 'trustee_panel';
  /** The earliest day the server will accept (the worker's registration day), when the caller has it: the control's `min`. */
  minDate?: string;
  /** The worker's name, when the page shows many forms: it names the form and its button (a screen reader hears whose it is). */
  name?: string;
  /** The form is a candidate of the Appeals page's eligible list (no worker details shown): its refusal lines name the list (R3-8). */
  fromList?: boolean;
}): ReactElement {
  const mutation = useFieldWorkerAppealAct(pariwarId);
  // Never before the control's own `min` on a browser clock behind the server's (review R3-7).
  const [receivedOn, setReceivedOn] = useState(() => istTodayNotBefore(minDate));
  const [via, setVia] = useState<FieldWorkerEndingAppealChannel | ''>('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<Guidance | null>(null);
  const [done, setDone] = useState(false);
  const attempt = useRef<AttemptKey | null>(null);
  const inFlight = useRef(false);
  useSignInRedirect(problem?.signIn === true);

  /** Editing a field clears the line that described the OLD value — ⛔ one that is not about a value (no access, sign-in). */
  const clearValueProblem = (): void => setProblem((p) => (p !== null && (p.noAccess === true || p.signIn === true) ? p : null));

  const submit = async (): Promise<void> => {
    if (inFlight.current || via === '' || receivedOn === '') return;
    const body = { expected_ending_version: endingVersion, received_on: receivedOn, received_via: via };
    const key = attemptKey(attempt, { worker: fieldWorkerId, ...body });
    inFlight.current = true;
    setBusy(true);
    setProblem(null);
    onAttempt?.();
    try {
      await mutation.mutateAsync({ act: 'lodge', fieldWorkerId, idempotencyKey: key, body });
      attempt.current = null;
      setDone(true);
      onLodged();
    } catch (err) {
      const g = appealGuidance(err, { act: 'lodge', ...(heardBy === undefined ? {} : { heardBy }), ...(fromList === true ? { fromList } : {}) });
      if (g.retryable !== true) attempt.current = null;
      if (g.stale === true) onStale(g.text);
      else setProblem(g);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  const label = (text: string): string => (name === undefined ? text : t('fw.appeals.actFor', { act: text, name }));

  // ⛔ a live region: both callers say the outcome in their own status region (which outlives this form), and a second one here was heard
  // as well (review R3-10).
  return done ? <p data-testid="fw-appeals-lodged">{t('fw.appeals.lodged')}</p> : (
    <form aria-label={label(t('fw.appeals.record'))} className="flex flex-col gap-2" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
      <label className="flex flex-col gap-1">
        {t('fw.appeals.receivedOn')}
        <input
          type="date"
          required
          value={receivedOn}
          {...(minDate === undefined ? {} : { min: minDate })}
          max={istTodayNotBefore(minDate)}
          readOnly={busy}
          onChange={(e) => {
            if (inFlight.current) return;
            setReceivedOn(e.target.value);
            clearValueProblem();
          }}
          data-testid="fw-appeals-received-on"
        />
      </label>
      <label className="flex flex-col gap-1">
        {t('fw.appeals.via')}
        <select
          required
          value={via}
          aria-disabled={busy || undefined}
          onChange={(e) => {
            if (inFlight.current) return;
            setVia(e.target.value as FieldWorkerEndingAppealChannel | '');
            clearValueProblem();
          }}
          data-testid="fw-appeals-via"
        >
          <option value="">{t('fw.appeals.via.choose')}</option>
          <option value="phone">{t('fw.appeals.via.phone')}</option>
          <option value="in_person">{t('fw.appeals.via.in_person')}</option>
        </select>
      </label>
      {problem !== null && <p role="alert" className="text-status-fail-fg" data-testid="fw-appeals-lodge-error">{problem.text}</p>}
      <button
        type="submit"
        className="self-start rounded bg-black px-3 py-1 text-white disabled:opacity-50"
        disabled={via === '' || receivedOn === ''}
        aria-disabled={busy || undefined}
        aria-label={label(busy ? t('fw.actions.saving') : t('fw.appeals.lodge'))}
        data-testid="fw-appeals-lodge"
      >
        {busy ? t('fw.actions.saving') : t('fw.appeals.lodge')}
      </button>
    </form>
  );
}
