// <MustActChangeForm> — the District Admin changes WHO MUST ACT on a returned claim (Story 6.19b, AC16, key (7)).
//
// ⭐ A REQUIRED note (D25), ⛔ no default choice, and the current value is ⛔ offered as a change (the route refuses it
// with 409 `must_act.unchanged` anyway). A switch to "the family must act" starts the family's 90 days THAT day
// (`-258` detail 1); a switch to "staff" stops the family's reminders at once. The server is the boundary.
// ⚠ Shown to every queue reader: the page cannot tell whether the session holds key (7) (district-dimension; the
// session carries only the national grants), so a 403 is mapped to its own "your role cannot" line.

import { useEffect, useState, type FormEvent, type ReactElement } from 'react';

import { ApiError } from '../../api/client.js';
import { useChangeCorrectionMustAct } from '../../api/hooks.js';
import { correctionChaseEn as t } from './i18n-en.js';

export interface MustActChangeFormProps {
  readonly pariwarId: string;
  readonly claimCaseId: string;
  readonly current: 'family' | 'staff' | null;
}

export function MustActChangeForm({ pariwarId, claimCaseId, current }: MustActChangeFormProps): ReactElement {
  const change = useChangeCorrectionMustAct(pariwarId, claimCaseId);
  const [choice, setChoice] = useState<'' | 'family' | 'staff'>('');
  const [note, setNote] = useState('');
  const [problem, setProblem] = useState<string | null>(null);

  const options = (['family', 'staff'] as const).filter((o) => o !== current);

  // ⭐ If another admin changes who-must-act while this form is open, a `choice` that now equals the NEW `current`
  // would silently submit a no-op the server refuses with a confusing "already who must act" error — clear it so
  // the picker reflects the concurrent change instead.
  useEffect(() => {
    setChoice((c) => (c === current ? '' : c));
  }, [current]);

  function submit(e: FormEvent): void {
    e.preventDefault();
    setProblem(null);
    if (choice === '') return;
    if (note.trim() === '') {
      setProblem(t.mustAct.noteRequired);
      return;
    }
    change.mutate(
      { must_act: choice, note: note.trim() },
      {
        onSuccess: () => {
          setChoice('');
          setNote('');
        },
        onError: (err) => {
          const code = err instanceof ApiError ? err.code : '';
          // ⭐ A 403 is the ROLE (the page cannot see key (7) — the session carries only national grants), ⛔ never
          // "could not be saved. Try again." — a retry that can never succeed.
          const forbidden = err instanceof ApiError && err.status === 403;
          setProblem(
            code === 'must_act.unchanged'
              ? t.mustAct.unchanged
              : code === 'must_act.no_live_return'
                ? t.mustAct.noLiveReturn
                : forbidden
                  ? t.mustAct.forbidden
                  : t.mustAct.error,
          );
        },
      },
    );
  }

  return (
    <form onSubmit={submit} className="mt-2 flex flex-col gap-2 text-xs" data-testid={`must-act-form-${claimCaseId}`}>
      <fieldset className="flex flex-wrap items-center gap-3">
        <legend className="opacity-70">{t.mustAct.change}</legend>
        {options.map((o) => (
          <label key={o} className="flex items-center gap-1">
            <input
              type="radio"
              name={`must-act-change-${claimCaseId}`}
              value={o}
              checked={choice === o}
              onChange={() => setChoice(o)}
            />
            {o === 'family' ? t.mustAct.family : t.mustAct.staff}
          </label>
        ))}
      </fieldset>
      {choice !== '' ? (
        <>
          <label className="flex flex-col">
            <span className="opacity-70">{t.mustAct.note}</span>
            <textarea
              className="rounded border px-2 py-1 text-sm"
              maxLength={500}
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          <button type="submit" className="self-start rounded border px-3 py-1 text-sm" disabled={change.isPending}>
            {t.mustAct.submit}
          </button>
        </>
      ) : null}
      <p role="status" aria-live="polite" className="text-xs">
        {change.isSuccess ? t.mustAct.saved : ''}
      </p>
      {problem !== null ? (
        <p role="alert" className="text-xs text-status-fail-fg">
          {problem}
        </p>
      ) : null}
    </form>
  );
}
