// `<ApprovalWarningReasonPicker>` — the ONE shared warning-reason picker (Story 6.23a, NW9; Story 6.23b mounts the
// SAME one on every later approver's surface).
//
// Approving a claim while a nominee-change warning shows needs a WARNING REASON from the Pariwar's list and a note
// (`-262` FQ2, `-264` FQ12). ⭐ BigDev's (b): the list TEACHES — every option shows its label, its "when to use" note
// and who added it, when (or *"built in"* for the generic). ⛔ NOTHING is pre-selected (invariant 5): the approver
// chooses. The selection is announced in words (a `role="status"` line), ⛔ never by colour alone.
// Pure + controlled: the parent owns the value and the validation.

import type { ApprovalWarningReasonOption } from '@twt/contracts';
import type { ReactElement } from 'react';

import { formatIst } from './NomineeDeclarationPanel.js';
import { verifierConsoleEn } from './i18n-en.js';

const t = verifierConsoleEn.approvalWarnings;

export interface ApprovalWarningReasonPickerProps {
  /** The Pariwar's ACTIVE reasons — the built-in generic first (the server's order). */
  options: readonly ApprovalWarningReasonOption[];
  /** The chosen code, or `''` — ⛔ never defaulted. */
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
  /** Set when the parent flagged "no reason chosen". */
  error?: string | null;
  /** A unique prefix so two pickers on one page never share radio names. */
  idPrefix: string;
}

export function ApprovalWarningReasonPicker({
  options,
  value,
  onChange,
  disabled,
  error,
  idPrefix,
}: ApprovalWarningReasonPickerProps): ReactElement {
  const chosen = options.find((o) => o.code === value);
  return (
    <fieldset className="flex flex-col gap-2" data-testid={`${idPrefix}-warning-reason-picker`} aria-invalid={error ? true : undefined}>
      <legend className="text-xs font-medium">{t.pickerLabel}</legend>
      <p className="text-xs opacity-70">{t.pickerHelp}</p>
      {options.map((o) => (
        <label key={o.code} className="flex items-start gap-2 rounded border p-2 text-sm" data-testid={`${idPrefix}-warning-reason-${o.code}`}>
          <input
            type="radio"
            name={`${idPrefix}-warning-reason`}
            value={o.code}
            // ⛔ NOTHING is checked until the approver checks it (invariant 5).
            checked={value === o.code}
            disabled={disabled}
            onChange={() => onChange(o.code)}
            data-testid={`${idPrefix}-warning-reason-radio-${o.code}`}
          />
          <span className="flex flex-col gap-0.5">
            <span className="font-medium">{o.label}</span>
            <span className="text-xs">
              {t.whenToUse}: {o.whenToUse}
            </span>
            <span className="text-xs opacity-70" data-testid={`${idPrefix}-warning-reason-provenance-${o.code}`}>
              {o.addedByDisplay !== null && o.addedAt !== null ? t.addedBy(o.addedByDisplay, formatIst(o.addedAt)) : t.builtIn}
              {o.replacesLabel !== null ? ` · ${t.replaces(o.replacesLabel)}` : ''}
            </span>
          </span>
        </label>
      ))}
      <p role="status" className="text-xs" data-testid={`${idPrefix}-warning-reason-selected`}>
        {chosen ? t.selected(chosen.label) : t.noneChosen}
      </p>
      {error ? (
        <p className="text-xs text-status-fail-fg" role="alert" data-testid={`${idPrefix}-warning-reason-error`}>
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
