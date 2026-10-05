// `<LateWarningReasonPanel>` — the District Admin's (any `claim.approve` holder's) answer to a nominee-change warning
// that appeared AFTER the approval (Story 6.23a, NW14; `-277` Q3 B; fact 3).
//
// ⭐ Its OWN record, ⛔ never a revision: the approval's words stay final (NW7), each answer is a NEW record with its own
// note, and the earlier notes stay as written (NW18). ⛔ Not inside the decision strip — a small panel with the SAME
// picker. Mounted ONLY when the server says `viewerCanRecordLateReason` (ALONE — ⛔ never also
// `uncoveredSinceApproval > 0`, which is 0 exactly when another person's reason covers the warnings for everyone but
// the approver, who must still answer — `-279` A1). Pure + controlled by its parent for the write.

import { VERIFIER_RATIONALE_MAX_CHARS, type ApprovalWarningReasonOption } from '@twt/contracts';
import { useState, type ReactElement } from 'react';

import { ApprovalWarningReasonPicker } from './ApprovalWarningReasonPicker.js';
import { verifierConsoleEn } from './i18n-en.js';

const t = verifierConsoleEn.approvalWarnings;

export interface LateWarningReasonPanelProps {
  options: readonly ApprovalWarningReasonOption[];
  /** The current keys ⛔ covered by the District Admin's record (for everyone). */
  uncoveredSinceApproval: number;
  /** The late keys ⛔ covered by THIS viewer's own record. */
  lateKeysUncoveredForViewer: number;
  /** Resolves `true` when recorded. */
  onSubmit: (input: { warningReasonCode: string; note: string }) => Promise<boolean>;
  processing?: boolean;
  error?: string | null;
  recorded?: boolean;
}

export function LateWarningReasonPanel({
  options,
  uncoveredSinceApproval,
  lateKeysUncoveredForViewer,
  onSubmit,
  processing,
  error,
  recorded,
}: LateWarningReasonPanelProps): ReactElement {
  const [code, setCode] = useState('');
  const [note, setNote] = useState('');
  const [validation, setValidation] = useState<'reason' | 'note' | null>(null);

  const submit = async (): Promise<void> => {
    if (code === '') return setValidation('reason');
    if (note.trim() === '') return setValidation('note');
    setValidation(null);
    if (await onSubmit({ warningReasonCode: code, note: note.trim() })) {
      setCode('');
      setNote('');
    }
  };

  return (
    <section className="mt-4 flex flex-col gap-2 border-t pt-4" data-testid="late-warning-reason-panel" aria-labelledby="late-warning-reason-heading">
      <h3 id="late-warning-reason-heading" className="font-semibold">
        {t.late.heading}
      </h3>
      <p className="text-xs">{t.late.intro}</p>
      <p className="text-xs" data-testid="late-warning-reason-count">
        {t.late.uncovered(lateKeysUncoveredForViewer)}
      </p>
      {uncoveredSinceApproval === 0 ? (
        <p className="text-xs" data-testid="late-warning-reason-own-cannot-clear">
          {t.late.ownCannotClear}
        </p>
      ) : null}
      <ApprovalWarningReasonPicker
        idPrefix="late"
        options={options}
        value={code}
        onChange={(c) => {
          setCode(c);
          setValidation(null);
        }}
        disabled={processing}
        error={validation === 'reason' ? t.reasonRequiredError : null}
      />
      <label className="text-xs font-medium" htmlFor="late-warning-reason-note">
        {t.late.noteLabel}
        <span aria-hidden> *</span>
      </label>
      <textarea
        id="late-warning-reason-note"
        className="rounded border p-1 text-sm"
        maxLength={VERIFIER_RATIONALE_MAX_CHARS}
        value={note}
        disabled={processing}
        data-testid="late-warning-reason-note"
        onChange={(e) => {
          setNote(e.target.value);
          setValidation(null);
        }}
      />
      {validation === 'note' ? (
        <p className="text-xs text-status-fail-fg" role="alert" data-testid="late-warning-reason-note-error">
          {t.noteRequiredError}
        </p>
      ) : null}
      <button
        type="button"
        className="self-start rounded bg-accent px-3 py-1 text-sm font-semibold text-white"
        data-testid="late-warning-reason-submit"
        disabled={processing}
        onClick={() => void submit()}
      >
        {processing ? t.late.processing : t.late.submit}
      </button>
      {error ? (
        <p className="text-xs text-status-fail-fg" role="alert" data-testid="late-warning-reason-error">
          {error}
        </p>
      ) : null}
      {recorded && !error ? (
        <p role="status" className="text-xs" data-testid="late-warning-reason-recorded">
          {t.late.recorded}
        </p>
      ) : null}
    </section>
  );
}
