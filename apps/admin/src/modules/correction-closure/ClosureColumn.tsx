// The District Admin's CLOSURE column on the correction queue — Story 6.19c (AC6, AC8c, AC17).
//
// One queue row's closure state and — the server's own answer, `readClosureReadiness`, through the SAME checks the
// request writer runs — why a request would refuse now, in plain words. When it would pass, the request form (a note
// is REQUIRED before Send). Beside it, "no correction needed" (D27 — a record, allowed while held). ⛔ No decision is
// made here: the request asks the Pariwar Admin, and the server re-checks everything under its locks.
// Accessibility (family 13): the state line is a live region (announced when it changes); every control is labelled;
// a missing note is SAID (`role="alert"`), ⛔ a silently disabled button.

import type { ClaimUnderCorrectionItem } from '@twt/contracts';
import type { ReactElement } from 'react';
import { useEffect, useId, useRef, useState } from 'react';

import { useRecordNoCorrectionNeeded, useRequestCorrectionClosure } from '../../api/hooks.js';
import { closureErrorText } from './errors.js';
import { correctionClosureEn as t } from './i18n-en.js';

export interface ClosureColumnProps {
  readonly pariwarId: string;
  readonly item: ClaimUnderCorrectionItem;
}

export function ClosureColumn({ pariwarId, item }: ClosureColumnProps): ReactElement {
  const c = item.correction_closure;
  const request = useRequestCorrectionClosure(pariwarId, item.claim_case_id);
  const noCorrection = useRecordNoCorrectionNeeded(pariwarId, item.claim_case_id);
  const [note, setNote] = useState('');
  const [noteMissing, setNoteMissing] = useState(false);
  const [ncNote, setNcNote] = useState('');
  const [ncNoteMissing, setNcNoteMissing] = useState(false);
  const noteId = useId();
  const ncNoteId = useId();

  // Code review patch (2026-10-02): reset both mutations whenever the SERVER-driven blocker moves on, so a
  // success banner from an earlier action doesn't keep rendering forever beside a now-current, possibly
  // contradicting blocker line. `request`/`noCorrection` are freshly re-created on every render by `useMutation`,
  // so this effect must read them through a ref to call `.reset()` without re-firing on their own identity churn.
  const requestRef = useRef(request);
  requestRef.current = request;
  const noCorrectionRef = useRef(noCorrection);
  noCorrectionRef.current = noCorrection;
  useEffect(() => {
    requestRef.current.reset();
    noCorrectionRef.current.reset();
  }, [c.blocker]);

  const roles = c.not_reached?.roles.map((r) => t.role[r] ?? r).join(', ') ?? '';
  const blockerText =
    c.blocker === null
      ? t.column.ready
      : c.blocker === 'not_reached' && c.not_reached !== null
        ? `${t.blocker.not_reached ?? ''} ${t.column.notReached(c.not_reached.count, roles)}`
        : (t.blocker[c.blocker] ?? c.blocker);

  async function onRequest(): Promise<void> {
    if (note.trim() === '') {
      setNoteMissing(true);
      return;
    }
    setNoteMissing(false);
    await request.mutateAsync(note).then(
      () => setNote(''),
      () => undefined,
    );
  }

  async function onNoCorrection(): Promise<void> {
    if (ncNote.trim() === '') {
      setNcNoteMissing(true);
      return;
    }
    setNcNoteMissing(false);
    await noCorrection.mutateAsync(ncNote).then(
      () => setNcNote(''),
      () => undefined,
    );
  }

  return (
    <section
      aria-label={t.column.heading}
      data-testid={`closure-column-${item.claim_case_id}`}
      className="mt-2 rounded border border-dashed p-2 text-xs"
    >
      <h4 className="font-semibold">{t.column.heading}</h4>
      {c.family_run_day !== null ? (
        <p>
          {t.column.day} {c.family_run_day}
        </p>
      ) : null}
      {c.state !== null ? (
        // Code review patch (2026-10-02) — `role="status"` added: a background refetch silently updates this
        // state line the same way `closure-blocker` (which already carries `role="status"`) does, and the
        // inconsistency between two state lines in the same column left this one unannounced.
        <p role="status" data-testid="closure-state">
          {t.state[c.state] ?? c.state}
          {c.requested_by !== null && c.state === 'requested' ? ` — ${t.column.requestedBy} ${c.requested_by}` : null}
        </p>
      ) : null}
      <p role="status" data-testid="closure-blocker" data-blocker={c.blocker ?? 'none'}>
        {blockerText}
      </p>

      {c.blocker === null ? (
        <div className="mt-1 flex flex-col gap-1">
          <label className="flex flex-col">
            {t.column.requestNote}
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              aria-describedby={noteMissing ? noteId : undefined}
              data-testid="closure-request-note"
            />
          </label>
          {noteMissing ? (
            <p role="alert" id={noteId}>
              {t.column.noteRequired}
            </p>
          ) : null}
          <button
            type="button"
            className="self-start rounded border px-2 py-1"
            disabled={request.isPending}
            onClick={() => void onRequest()}
            data-testid="closure-request-submit"
          >
            {t.column.request}
          </button>
        </div>
      ) : null}
      {request.isSuccess ? <p role="status">{t.column.requested}</p> : null}
      {request.isError ? (
        <p role="alert" data-testid="closure-request-error">
          {closureErrorText(request.error)}
        </p>
      ) : null}

      <details className="mt-2">
        <summary>{t.column.noCorrection.heading}</summary>
        <p>{t.column.noCorrection.help}</p>
        <label className="flex flex-col">
          {t.column.noCorrection.note}
          <textarea
            value={ncNote}
            onChange={(e) => setNcNote(e.target.value)}
            aria-describedby={ncNoteMissing ? ncNoteId : undefined}
            data-testid="no-correction-note"
          />
        </label>
        {ncNoteMissing ? (
          <p role="alert" id={ncNoteId}>
            {t.column.noteRequired}
          </p>
        ) : null}
        <button
          type="button"
          className="mt-1 rounded border px-2 py-1"
          disabled={noCorrection.isPending}
          onClick={() => void onNoCorrection()}
          data-testid="no-correction-submit"
        >
          {t.column.noCorrection.submit}
        </button>
        {noCorrection.isSuccess ? <p role="status">{t.column.noCorrection.recorded}</p> : null}
        {noCorrection.isError ? <p role="alert">{closureErrorText(noCorrection.error)}</p> : null}
      </details>
    </section>
  );
}
