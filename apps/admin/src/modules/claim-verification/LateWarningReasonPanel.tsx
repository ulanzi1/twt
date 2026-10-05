// `<LateWarningReasonPanel>` — the District Admin's (any `claim.approve` holder's) answer to a nominee-change warning
// that appeared AFTER the approval (Story 6.23a, NW14; `-277` Q3 B; fact 3).
//
// ⭐ Its OWN record, ⛔ never a revision: the approval's words stay final (NW7), each answer is a NEW record with its own
// note, and the earlier notes stay as written (NW18). ⛔ Not inside the decision strip — a small panel with the SAME
// picker. Mounted ONLY when the server says `viewerCanRecordLateReason` (ALONE — ⛔ never also
// `uncoveredSinceApproval > 0`, which is 0 exactly when another person's reason covers the warnings for everyone but
// the approver, who must still answer — `-279` A1) — or, after a submit, for its OWN outcome (`canRecord: false` ⇒ the
// outcome alone, ⛔ no form). Pure + controlled by its parent for the write.

import { VERIFIER_RATIONALE_MAX_CHARS, type ApprovalWarningReasonOption } from '@twt/contracts';
import { useEffect, useRef, useState, type ReactElement } from 'react';

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
  /**
   * The server's `viewerCanRecordLateReason`. `false` while the panel is still mounted for its OWN outcome (the parent
   * keeps it up after a submit — code review 2026-10-05) ⇒ the OUTCOME ALONE: ⛔ no count, ⛔ no form that would 409
   * `nothing_uncovered` (code review round 3; NW8 — ⛔ never a panel that would 409).
   */
  canRecord: boolean;
}

export function LateWarningReasonPanel({
  options,
  uncoveredSinceApproval,
  lateKeysUncoveredForViewer,
  onSubmit,
  processing,
  error,
  recorded,
  canRecord,
}: LateWarningReasonPanelProps): ReactElement {
  const [code, setCode] = useState('');
  const [note, setNote] = useState('');
  const [validation, setValidation] = useState<'reason' | 'note' | null>(null);
  // A chosen code that has LEFT the active list (the Super Admin replaced it; the packet refetched) is ⛔ not a choice —
  // the picker shows none checked, and submitting asks again rather than sending a code the server refuses (round 3).
  const chosen = options.some((o) => o.code === code) ? code : '';
  // When the form LEAVES after this panel's own success, the focused Submit button unmounts and focus would fall to
  // `<body>` — a keyboard / screen-reader user is left nowhere (code review round 4). Move it to the panel's heading,
  // beside the "recorded" line. Only on that transition (`canRecord` turning false with `recorded`), ⛔ never on mount.
  const headingRef = useRef<HTMLHeadingElement>(null);
  const hadForm = useRef(canRecord);
  useEffect(() => {
    if (hadForm.current && !canRecord && recorded) headingRef.current?.focus();
    hadForm.current = canRecord;
  }, [canRecord, recorded]);

  const submit = async (): Promise<void> => {
    if (chosen === '') return setValidation('reason');
    if (note.trim() === '') return setValidation('note');
    setValidation(null);
    if (await onSubmit({ warningReasonCode: chosen, note: note.trim() })) {
      setCode('');
      setNote('');
    }
  };

  return (
    <section className="mt-4 flex flex-col gap-2 border-t pt-4" data-testid="late-warning-reason-panel" aria-labelledby="late-warning-reason-heading">
      <h3 id="late-warning-reason-heading" ref={headingRef} tabIndex={-1} className="font-semibold">
        {t.late.heading}
      </h3>
      {canRecord ? (
        <>
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
            value={chosen}
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
            // The visual `*` is `aria-hidden` — say "required" and point at the error in the accessibility tree (round 3).
            aria-required="true"
            aria-invalid={validation === 'note' ? true : undefined}
            aria-describedby={validation === 'note' ? 'late-warning-reason-note-error' : undefined}
            data-testid="late-warning-reason-note"
            onChange={(e) => {
              setNote(e.target.value);
              setValidation(null);
            }}
          />
          {validation === 'note' ? (
            <p id="late-warning-reason-note-error" className="text-xs text-status-fail-fg" role="alert" data-testid="late-warning-reason-note-error">
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
        </>
      ) : null}
      {/* `…-server-error` — ⛔ never the picker's own `late-warning-reason-error` (its "choose a reason" line): two
          different errors, two ids (code review round 3). */}
      {error ? (
        <p className="text-xs text-status-fail-fg" role="alert" data-testid="late-warning-reason-server-error">
          {error}
        </p>
      ) : null}
      {/* ALWAYS mounted, its TEXT changes — a status region that mounts already holding "recorded" is ⛔ never
          announced (family 13(d), code review round 3). */}
      <p role="status" className="text-xs" data-testid="late-warning-reason-recorded">
        {recorded && !error ? t.late.recorded : ''}
      </p>
    </section>
  );
}
