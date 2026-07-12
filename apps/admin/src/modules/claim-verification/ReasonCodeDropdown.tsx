// `<ReasonCodeDropdown>` — the UX-DR43 structured reason-code picker (Story 6.11, Task 6; AC1(a)/AC8).
//
// Pure presentational + controlled. Offers ONLY the reason codes COMPATIBLE with the chosen outcome
// (AC8 — `reasonCodesForOutcome` from the contract's value-aligned compat map, the single source of
// truth). `other` requires a mandatory free-text rationale (surfaced by the parent). The rationale field
// carries the Tier-1 "will be encrypted + access-controlled" note (D-G). Bounded categories, never free
// text (UX §11).

import {
  reasonCodesForOutcome,
  type VerifierDecisionOutcome,
  type VerifierReasonCode,
} from '@twt/contracts';
import type { ReactElement } from 'react';

import { verifierConsoleEn as t } from './i18n-en.js';

export interface ReasonCodeDropdownProps {
  /** The chosen outcome — drives which codes are offered (AC8). */
  outcome: VerifierDecisionOutcome;
  value: VerifierReasonCode | '';
  onChange: (code: VerifierReasonCode | '') => void;
  disabled?: boolean;
  /** Set when the parent has flagged a missing-reason validation error. */
  error?: string;
}

const REASON_LABELS = t.reasonCodes;

export function ReasonCodeDropdown({
  outcome,
  value,
  onChange,
  disabled,
  error,
}: ReasonCodeDropdownProps): ReactElement {
  const options = reasonCodesForOutcome(outcome);
  return (
    <div className="flex flex-col gap-1" data-testid="reason-code-dropdown">
      <label className="text-xs font-medium" htmlFor="reason-code-select">
        {t.decision.reasonLabel}
      </label>
      <select
        id="reason-code-select"
        className="rounded border p-1 text-sm"
        value={value}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        data-testid="reason-code-select"
        onChange={(e) => onChange(e.target.value as VerifierReasonCode | '')}
      >
        <option value="">{t.decision.reasonPlaceholder}</option>
        {options.map((code) => (
          <option key={code} value={code} data-testid={`reason-option-${code}`}>
            {REASON_LABELS[code]}
          </option>
        ))}
      </select>
      {error ? (
        <p className="text-xs text-status-fail-fg" role="alert" data-testid="reason-code-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
