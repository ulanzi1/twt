// `<ConcealmentAssessmentControl>` — the verifier concealment-linkage assessment capture (Story 6.15, AC7).
//
// A tri-state select (linked | not_linked | unable_to_determine) + an optional Tier-1 note, posting to
// `POST …/admin/claims/:claimCaseId/concealment-assessment` via the injected `onSubmit`. This is a review
// ANNOTATION — recording it flags/routes but NEVER decides the claim (the State Trustee decides at
// cycle-freeze, D-B). Presentational: the page/shell owns the actual mutation + its `processing`/`error`.

import {
  CONCEALMENT_ASSESSMENT_NOTE_MAX_CHARS,
  type ConcealmentAssessmentKind,
} from '@twt/contracts';
import { useState, type ReactElement } from 'react';

import { verifierConsoleEn as t } from './i18n-en.js';

export interface ConcealmentAssessmentSubmit {
  kind: ConcealmentAssessmentKind;
  note?: string;
}

export interface ConcealmentAssessmentControlProps {
  /** Records/revises the assessment. Rejects surface via `error`. */
  onSubmit: (input: ConcealmentAssessmentSubmit) => Promise<void>;
  processing?: boolean;
  error?: string | null;
}

const KINDS: readonly ConcealmentAssessmentKind[] = ['linked', 'not_linked', 'unable_to_determine'];

export function ConcealmentAssessmentControl({
  onSubmit,
  processing,
  error,
}: ConcealmentAssessmentControlProps): ReactElement {
  const [kind, setKind] = useState<ConcealmentAssessmentKind | ''>('');
  const [note, setNote] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const submit = async (): Promise<void> => {
    if (kind === '') {
      setValidationError(t.concealmentAssessment.kindRequiredError);
      return;
    }
    setValidationError(null);
    const input: ConcealmentAssessmentSubmit = {
      kind,
      ...(note.trim() !== '' ? { note: note.trim() } : {}),
    };
    try {
      await onSubmit(input);
      // Reset on success — otherwise the just-submitted kind/note stay displayed with no "saved" transition,
      // and an accidental double-click on the (briefly still-enabled) submit button silently re-records an
      // identical assessment (a spurious supersession + a duplicate claim.concealment_assessed event).
      setKind('');
      setNote('');
    } catch {
      // Swallowed — the caller's mutation hook tracks the failure in its own `error` state (flows back via prop).
    }
  };

  return (
    <div className="flex flex-col gap-2" data-testid="concealment-assessment-control">
      <h3 className="text-sm font-semibold">{t.concealmentAssessment.heading}</h3>
      <p className="text-xs opacity-60">{t.concealmentAssessment.help}</p>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium" htmlFor="concealment-kind-select">
          {t.concealmentAssessment.kindLabel}
          <span aria-hidden> *</span>
        </label>
        <select
          id="concealment-kind-select"
          className="rounded border p-1 text-sm"
          value={kind}
          disabled={processing}
          data-testid="concealment-kind-select"
          onChange={(e) => {
            setKind(e.target.value as ConcealmentAssessmentKind | '');
            setValidationError(null);
          }}
        >
          <option value="">{t.concealmentAssessment.kindPlaceholder}</option>
          {KINDS.map((k) => (
            <option key={k} value={k}>
              {t.concealmentAssessment.kinds[k]}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium" htmlFor="concealment-note-input">
          {t.concealmentAssessment.noteLabel}
        </label>
        <textarea
          id="concealment-note-input"
          className="rounded border p-1 text-sm"
          maxLength={CONCEALMENT_ASSESSMENT_NOTE_MAX_CHARS}
          placeholder={t.concealmentAssessment.notePlaceholder}
          value={note}
          disabled={processing}
          data-testid="concealment-note-input"
          aria-describedby="concealment-note-note"
          onChange={(e) => setNote(e.target.value)}
        />
        <p id="concealment-note-note" className="text-xs opacity-60">
          {t.concealmentAssessment.noteEncryptedNote}
        </p>
      </div>

      <button
        type="button"
        className="self-start rounded bg-accent px-3 py-1 text-sm font-semibold text-white"
        data-testid="concealment-assessment-submit"
        disabled={processing}
        onClick={() => void submit()}
      >
        {processing ? t.concealmentAssessment.processing : t.concealmentAssessment.submit}
      </button>

      {validationError ? (
        <p className="text-xs text-status-fail-fg" role="alert" data-testid="concealment-kind-error">
          {validationError}
        </p>
      ) : null}
      {error ? (
        <p className="text-xs text-status-fail-fg" role="alert" data-testid="concealment-assessment-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
