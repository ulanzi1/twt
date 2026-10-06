// `<LaterApprovalWarnings>` — the nominee-change warnings on a LATER approver's surface (Story 6.23b, EA7): the cycle-freeze
// card, the R9 panel, the Super Admin's escalation panel and the "no correction needed" strip mount THIS one block, so the
// four can ⛔ never drift. It shows, BEFORE the approve control (invariant 5): a line per warning kind, and then either
//   · the WAIT (`-277` Q3 B) — the claim waits for the District Admin; with `own_reason_excluded`, why the viewer's own
//     late reason cannot clear their own approval (`-279` A1) — and ⛔ no picker (approving is unavailable, and the words say so);
//   · the read FAILED (Trap 15) — its own words, ⛔ never "no warnings";
//   · otherwise 6.23a's SHARED picker (⛔ nothing pre-selected) with the later approver's intro.
// Pure + controlled: the parent owns the pick, the note and the validation; `approvalBlockedReason` gives the parent the
// SAME words to disable its approve control with (⛔ a silently disabled button).

import type { ApprovalWarningReasonOption, ApprovalWarningsSummary } from '@twt/contracts';
import type { ReactElement } from 'react';

import { ApprovalWarningReasonPicker } from './ApprovalWarningReasonPicker.js';
import { verifierConsoleEn } from './i18n-en.js';

const t = verifierConsoleEn.approvalWarnings;

/**
 * Why approving is unavailable right now — the read failed, or the claim waits for the District Admin — in the words
 * the surface shows; `null` ⇔ approving is available (a warning may still need a reason and a note).
 */
export function approvalBlockedReason(summary: ApprovalWarningsSummary, surface: 'trustee' | 'r9' = 'trustee'): string | null {
  if (!summary.available) return t.unavailable;
  if (summary.waiting_for_district_admin) {
    return summary.own_reason_excluded
      ? `${t.later.waits} ${surface === 'r9' ? t.later.ownReasonExcludedR9 : t.later.ownReasonExcluded}`
      : t.later.waits;
  }
  return null;
}

/** Does an approval here need a warning reason and a note? (the read succeeded AND a warning shows) */
export function approvalNeedsWarningReason(summary: ApprovalWarningsSummary): boolean {
  return summary.available && summary.kinds.length > 0;
}

/**
 * Code review 2026-10-06 (P41) — the four later-approver surfaces each hand-copied this "is the pick still in the
 * list" fallback-to-`''` check. Centralized here, alongside the sibling logic above, specifically to stop that drift.
 */
export function resolvedWarningReasonCode(options: readonly ApprovalWarningReasonOption[], pick: string): string {
  return options.some((o) => o.code === pick) ? pick : '';
}

export interface LaterApprovalWarningsProps {
  summary: ApprovalWarningsSummary;
  options: readonly ApprovalWarningReasonOption[];
  /** The chosen code, or `''` — ⛔ never defaulted. */
  value: string;
  onChange: (code: string) => void;
  /** Set when the parent flagged "no reason chosen". */
  error?: string | null;
  disabled?: boolean;
  /** A unique prefix (the picker's radio names and every test id). */
  idPrefix: string;
  /** `false` on a surface with ⛔ approve control (e.g. a voted case) — the lines only. Default `true`. */
  showPicker?: boolean;
  surface?: 'trustee' | 'r9';
  /**
   * `false` where the WAIT holds a DIFFERENT control than the one this block serves — the R9 panel: an approve VOTE is
   * ⛔ held by the wait (finalize is), so the picker still shows and the panel says the wait beside Finalize. Default `true`.
   */
  waitBlocksHere?: boolean;
}

export function LaterApprovalWarnings({
  summary,
  options,
  value,
  onChange,
  error,
  disabled,
  idPrefix,
  showPicker = true,
  surface = 'trustee',
  waitBlocksHere = true,
}: LaterApprovalWarningsProps): ReactElement | null {
  const blocked = waitBlocksHere ? approvalBlockedReason(summary, surface) : summary.available ? null : t.unavailable;
  if (blocked === null && summary.kinds.length === 0) return null;
  return (
    <div className="flex flex-col gap-2 rounded border border-status-warn-fg p-2" data-testid={`${idPrefix}-approval-warnings`}>
      {summary.kinds.length > 0 ? (
        <>
          <h3 className="text-xs font-semibold">{t.heading}</h3>
          <ul className="list-disc pl-4 text-xs">
            {summary.kinds.map((k) => (
              <li key={k} data-testid={`${idPrefix}-approval-warning-${k}`}>
                {t.kindLine[k]}
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {blocked !== null ? (
        // The WAIT or the failed read — said in words where the approve control is (⛔ a bare disabled button).
        <p id={`${idPrefix}-approval-blocked`} role="status" className="text-xs font-medium" data-testid={`${idPrefix}-approval-blocked`}>
          {blocked}
        </p>
      ) : showPicker && options.length === 0 ? (
        // Code review 2026-10-06: a warning shows, approving is NOT blocked, but the reason list is empty — the
        // picker would otherwise render zero options with no explanation, and Approve would stay stuck silently.
        <p role="status" className="text-xs font-medium" data-testid={`${idPrefix}-no-reasons-configured`}>
          {t.later.noOptionsConfigured}
        </p>
      ) : showPicker ? (
        <>
          <p className="text-xs">{t.later.intro}</p>
          <ApprovalWarningReasonPicker
            idPrefix={idPrefix}
            options={options}
            value={value}
            onChange={onChange}
            error={error ?? null}
            {...(disabled !== undefined ? { disabled } : {})}
          />
        </>
      ) : null}
    </div>
  );
}
