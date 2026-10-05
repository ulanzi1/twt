// `<VerificationDecisionStrip>` — the UX-DR40 sticky-bottom decision strip (Story 6.11, Task 6; AC1).
//
// The FIRST verifier WRITE surface. Mounted into the 6.10 shell's `decisionSlot`. Three actions
// (the epic's 3-action anatomy — Approve subsumes approve-with-note, no "Hold for clarification"):
//   · Approve (primary) · Deny (opens the reason-code dropdown) · Escalate to State Trustee
// Keyboard shortcuts 1/2/3 over the rendered actions; a confirmation modal IS the attestation for the
// irreversible submit (AC1(d) — no separate attestation field). A brief rationale (≤500, Tier-1
// encrypted note) is required on Deny + on the "Other" reason (AC1(b)); the dropdown offers only
// outcome-compatible codes (AC8).
//
// INTERACTIVE ONLY IN THE ACTIVE WINDOW (verification_in_progress / verifier_review). Post-verdict
// (verifier_approved / denied) renders a same-outcome REVISE affordance; terminal/frozen claims render a
// NON-INTERACTIVE summary (opening a resolved claim never reopens review — the 6.10 historical posture).

import {
  isReasonCodeValidForOutcome,
  VERIFIER_RATIONALE_MAX_CHARS,
  type ApprovalWarningKind,
  type ApprovalWarningReasonOption,
  type VerifierDecisionOutcome,
  type VerifierReasonCode,
} from '@twt/contracts';
import { useCallback, useEffect, useState, type ReactElement } from 'react';

import { ApprovalWarningReasonPicker } from './ApprovalWarningReasonPicker.js';
import { ReasonCodeDropdown } from './ReasonCodeDropdown.js';
import { verifierConsoleEn as t } from './i18n-en.js';

/** The active window a claim's decision strip is interactive in. */
const ACTIVE_STATES = new Set(['verification_in_progress', 'verifier_review']);
/** The post-verdict window a same-outcome revision is offered in. */
const REVISABLE_STATES = new Set(['verifier_approved', 'denied']);
/** The claim state → the live outcome a revision must keep. */
const STATE_TO_OUTCOME: Record<string, VerifierDecisionOutcome> = {
  verifier_approved: 'approved',
  denied: 'denied',
};

export interface DecisionSubmit {
  outcome: VerifierDecisionOutcome;
  reasonCode: VerifierReasonCode;
  rationale?: string;
  /** Story 6.23a (NW5) — the WARNING REASON, in its own field (approve only, while a warning shows). */
  warningReasonCode?: string;
}

export interface VerificationDecisionStripProps {
  claimState: string;
  /** Approve/deny/escalate (active window). Rejects surface via `error`. */
  onDecision: (input: DecisionSubmit) => Promise<void>;
  /** Same-outcome revise (post-verdict window). */
  onRevise?: (input: DecisionSubmit) => Promise<void>;
  /** The claim's current LIVE decision (reason-code + rationale), used to pre-fill the revise form so a
   *  reason-code-only correction doesn't read as "no rationale" and silently erase the recorded one. */
  liveDecision?: { reasonCode: VerifierReasonCode; rationale: string };
  processing?: boolean;
  error?: string | null;
  /**
   * Story 6.18 (AC4) — `false` when the claim has no CURRENT, PASSING nominee name check, or is
   * missing one of its two bank accounts (`-226` cl.3/cl.7).
   *
   * ⭐ IT DISABLES APPROVE ALONE. Deny and escalate stay available, because cl.6 sends a name
   * mismatch BACK for correction and cl.7 makes a claim without accounts WAIT — ⛔ neither is ever a
   * ground to refuse a death claim, and ⛔ neither may become a reason a verifier cannot record the
   * decision they actually reached. Defaults to `true` so a caller that has not wired the status
   * (a test, or a surface without the section) is never silently blocked.
   */
  canApprove?: boolean;
  /** Why approve is unavailable — shown beside the disabled control so it is never a dead button. */
  approveBlockedReason?: string | null;
  /**
   * Story 6.23a (NW9) — the nominee-change warnings and the Pariwar's warning reasons. With `kinds` non-empty an
   * APPROVAL shows the shared picker BESIDE the unchanged approval-reason dropdown, a line per warning, and a REQUIRED
   * note; the confirmation restates them. ⛔ Deny and Escalate are never gated (invariant 4).
   */
  approvalWarnings?: { kinds: readonly ApprovalWarningKind[]; reasonOptions: readonly ApprovalWarningReasonOption[] };
  /** Story 6.23a (NW7) — when non-null the revise control is REPLACED by its words (⛔ never a dead control). */
  reviseBlocked?: 'warning_approval_final' | 'warnings_not_current' | 'unavailable' | null;
}

type PendingAction = { outcome: VerifierDecisionOutcome; label: string } | null;

export function VerificationDecisionStrip({
  claimState,
  onDecision,
  onRevise,
  liveDecision,
  processing,
  error,
  canApprove = true,
  approveBlockedReason,
  approvalWarnings,
  reviseBlocked: reviseBlockedProp = null,
}: VerificationDecisionStripProps): ReactElement {
  const isActive = ACTIVE_STATES.has(claimState);
  const isRevisable = REVISABLE_STATES.has(claimState);

  // The chosen outcome (in the revise window it is pinned to the live outcome).
  const revisionOutcome = STATE_TO_OUTCOME[claimState];
  const [outcome, setOutcome] = useState<VerifierDecisionOutcome | null>(
    isRevisable ? (revisionOutcome ?? null) : null,
  );
  // In the revise window, pre-fill from the live decision so leaving a field untouched really means
  // "keep this" — never a blank rationale read as "clear the recorded one" (the domain writer also
  // carries the prior rationale forward as a backstop if a caller omits it).
  const [reasonCode, setReasonCode] = useState<VerifierReasonCode | ''>(
    isRevisable ? (liveDecision?.reasonCode ?? '') : '',
  );
  const [rationale, setRationale] = useState(isRevisable ? (liveDecision?.rationale ?? '') : '');
  const [pending, setPending] = useState<PendingAction>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  // Story 6.23a (NW9) — ⛔ never pre-selected.
  const [warningReasonPick, setWarningReasonCode] = useState('');
  // A pick that has LEFT the active list (replaced by the Super Admin; the packet refetched) is ⛔ not a choice: the
  // picker shows none checked, validation asks again, and the confirmation never shows a raw code (code review round 3).
  const warningReasonCode = approvalWarnings?.reasonOptions.some((o) => o.code === warningReasonPick) ? warningReasonPick : '';
  // NW7 is about APPROVALS — a denied decision's revise is unchanged (AC4). The console's fail-soft `'unavailable'`
  // cannot tell the outcomes apart (the read that would is the one that failed), so the strip, which knows the revise
  // window's outcome from the state, applies a block to an approval only (code review round 3).
  const reviseBlocked = revisionOutcome === 'approved' ? reviseBlockedProp : null;

  /**
   * ⭐⭐ THE APPROVE FORM CLOSES WHEN APPROVAL STOPS BEING AVAILABLE (code review 2026-09-20).
   *
   * `canApprove` gated the BUTTON and the "1" keyboard shortcut — but `outcome` is local state
   * that survives. So: a District Admin selects Approve, the reason/rationale fields open, and then
   * the name check goes stale (a helpline correction) or they record `does_not_match`. The form
   * stayed open and SUBMITTABLE; only the server's 409 stopped it.
   * ⚠ This is a UX defect, ⛔ not a bypass — the server is the boundary and refuses it (family 3).
   * What it costs is trust: an operator who fills in a rationale and is then refused learns to read
   * governance refusals as glitches, which is precisely what AC4's disabled-with-a-reason exists to
   * prevent.
   */
  useEffect(() => {
    if (!canApprove && outcome === 'approved') {
      setOutcome(null);
      setValidationError(null);
    }
  }, [canApprove, outcome]);

  /** Choose an outcome (active window) — reset an incompatible reason code. */
  const chooseOutcome = useCallback(
    (next: VerifierDecisionOutcome): void => {
      // NW9 — ⛔ never pre-selected (re-review 2026-10-05): switching away from Approve and back must ⛔ not leave an
      // earlier pick showing as already chosen. ⭐ Only on an actual CHANGE (code review round 3) — re-choosing the
      // SAME outcome is ⛔ not a switch, and must ⛔ not silently drop the approver's pick.
      if (next !== outcome) setWarningReasonCode('');
      setOutcome(next);
      setValidationError(null);
      setReasonCode((current) => (current !== '' && !isReasonCodeValidForOutcome(next, current) ? '' : current));
    },
    [outcome],
  );

  // Keyboard shortcuts (1/2/3) — a real keydown listener, not the HTML `accessKey` attribute (which
  // needs a browser/OS-specific modifier chord, not a bare keypress). Ignored while typing in a
  // form field (so "1"/"2"/"3" in the rationale textarea doesn't fire an action), while processing, or
  // when the modal/non-active window means there's nothing to choose.
  useEffect(() => {
    // ⭐ `pending` too (code review round 3): while the confirmation is open the outcome is ⛔ not choosable — a "1"/"2"/
    // "3" there used to re-run `chooseOutcome` under the modal, dropping the warning pick or blanking the reason.
    if (!isActive || processing || pending !== null) return;
    const handler = (e: KeyboardEvent): void => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable) return;
      // ⚠ Story 6.18 (AC4) — the SHORTCUT must respect the gate too. Disabling only the button
      // would leave pressing "1" as an unguarded path to the approve form, which is exactly the kind
      // of second entrance a keyboard-first console makes easy to forget.
      if (e.key === t.decision.approveShortcut && canApprove) chooseOutcome('approved');
      // ⭐ BLOCKED ⇒ SAY WHY, ⛔ never a silent no-op (family 13(d), code review 2026-09-23b). On a
      // keyboard-first console a dropped "1" reads as a broken shortcut; moving focus to the
      // reason makes a screen reader speak it and shows a sighted user where to look.
      else if (e.key === t.decision.approveShortcut)
        document.getElementById('approve-blocked-reason')?.focus();
      else if (e.key === t.decision.denyShortcut) chooseOutcome('denied');
      else if (e.key === t.decision.escalateShortcut) chooseOutcome('escalated');
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
    // `canApprove` is in the deps because the handler CLOSES OVER it — without it the listener
    // would keep the value from the render that installed it, so a claim that became approvable
    // (or stopped being) would still answer to the old gate.
  }, [isActive, processing, pending, chooseOutcome, canApprove]);

  // Neither active nor revisable → a non-interactive historical summary (never reopens review).
  if (!isActive && !isRevisable) {
    return (
      <div data-testid="decision-strip-historical">
        <p className="text-xs opacity-60">{t.decision.historicalNote}</p>
      </div>
    );
  }

  // Story 6.23a — a warning on an APPROVAL needs a warning reason and a note (NW6). ⛔ Never in the revise window: a
  // warned approval is never revised (NW7), and an un-warned one being revised has ⛔ no warning to answer.
  const warningKinds = approvalWarnings?.kinds ?? [];
  const warningsApply = isActive && outcome === 'approved' && warningKinds.length > 0;
  const rationaleRequired =
    outcome === 'denied' || reasonCode === 'other' || warningsApply;

  /** Validate the form, then open the confirmation modal (the attestation). */
  const requestSubmit = (label: string): void => {
    if (!outcome) return;
    if (reasonCode === '') {
      setValidationError(t.decision.reasonRequiredError);
      return;
    }
    if (warningsApply && warningReasonCode === '') {
      setValidationError(t.approvalWarnings.reasonRequiredError);
      return;
    }
    if (rationaleRequired && rationale.trim() === '') {
      setValidationError(warningsApply ? t.approvalWarnings.noteRequiredError : t.decision.rationaleRequiredError);
      return;
    }
    setValidationError(null);
    setPending({ outcome, label });
  };

  /** The confirmation modal's Confirm — fires the actual write. Always closes the modal afterwards
   *  (success or failure) so a rejected submit doesn't leave the dialog stuck open, hiding the `error`
   *  message rendered on the form underneath it. */
  const confirm = async (): Promise<void> => {
    if (!pending || reasonCode === '') return;
    // The packet can refetch UNDER the open modal (code review round 4): the pick may have left the list, or a warning
    // may have appeared. ⛔ Never send a known-refused approval with a blank "Warning reason:" — close and ask again.
    if (warningsApply && warningReasonCode === '') {
      setPending(null);
      setValidationError(t.approvalWarnings.reasonRequiredError);
      return;
    }
    const input: DecisionSubmit = {
      outcome: pending.outcome,
      reasonCode,
      ...(rationale.trim() !== '' ? { rationale: rationale.trim() } : {}),
      ...(warningsApply && warningReasonCode !== '' ? { warningReasonCode } : {}),
    };
    const run = isRevisable && onRevise ? onRevise : onDecision;
    try {
      await run(input);
    } catch {
      // Swallowed here — the caller's mutation hook already tracks the failure in its own `error` state,
      // which flows back in via the `error` prop and renders once this modal closes below.
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="flex flex-col gap-2" data-testid="decision-strip">
      <h2 className="text-sm font-semibold">{t.decision.heading}</h2>

      {isActive ? (
        <div className="flex flex-wrap gap-2" role="group" aria-label={t.decision.heading}>
          <button
            type="button"
            className="rounded bg-status-ok-bg px-3 py-1 text-sm font-semibold text-status-ok-fg"
            data-testid="action-approve"
            disabled={processing || !canApprove}
            onClick={() => chooseOutcome('approved')}
            aria-pressed={outcome === 'approved'}
            // ⭐ A DISABLED BUTTON IS NOT FOCUSABLE, so a screen-reader user tabbing through the
            // controls never reaches it. `aria-describedby` binds the reason for browse-mode users;
            // ⚠ it does ⛔ NOT help a Tab user (corrected 2026-09-23b — this comment said it did).
            // What reaches them: the reason is a `role="status"` live region (announced when it
            // appears), and pressing "1" while blocked FOCUSES it (the shortcut handler above).
            {...(!canApprove && approveBlockedReason != null && approveBlockedReason !== ''
              ? { 'aria-describedby': 'approve-blocked-reason' }
              : {})}
          >
            {t.decision.approveShortcut}. {t.decision.approve}
          </button>
          {/* Story 6.18 (AC4) — a disabled control must never be a mystery. The domain refuses this
              approval under the claim lock; saying WHY here is what stops a District Admin reading a
              governance precondition as a broken button. ⛔ Never a name — a reason phrase only. */}
          {!canApprove && approveBlockedReason != null && approveBlockedReason !== '' ? (
            <p
              id="approve-blocked-reason"
              // Focusable by script only — the blocked "1" shortcut moves focus here.
              tabIndex={-1}
              role="status"
              className="w-full text-xs text-status-warn-fg"
              data-testid="approve-blocked-reason"
            >
              {approveBlockedReason}
            </p>
          ) : null}
          <button
            type="button"
            className="rounded bg-status-fail-bg px-3 py-1 text-sm font-semibold text-status-fail-fg"
            data-testid="action-deny"
            disabled={processing}
            onClick={() => chooseOutcome('denied')}
            aria-pressed={outcome === 'denied'}
          >
            {t.decision.denyShortcut}. {t.decision.deny}
          </button>
          <button
            type="button"
            className="rounded border px-3 py-1 text-sm font-semibold"
            data-testid="action-escalate"
            disabled={processing}
            onClick={() => chooseOutcome('escalated')}
            aria-pressed={outcome === 'escalated'}
          >
            {t.decision.escalateShortcut}. {t.decision.escalate}
          </button>
        </div>
      ) : reviseBlocked !== null ? (
        // Story 6.23a (NW7) — the revise control is REPLACED by its words, one per reason (⛔ never a dead control).
        <p className="text-xs" role="status" data-testid={`revise-blocked-${reviseBlocked}`}>
          {t.approvalWarnings.reviseBlocked[reviseBlocked]}
        </p>
      ) : (
        <p className="text-xs opacity-70" data-testid="revise-window-note">
          {t.decision.revise}
        </p>
      )}

      {outcome && !(isRevisable && reviseBlocked !== null) ? (
        <div className="flex flex-col gap-2" data-testid="decision-form">
          <ReasonCodeDropdown
            outcome={outcome}
            value={reasonCode}
            onChange={(c) => {
              setReasonCode(c);
              setValidationError(null);
            }}
            disabled={processing}
            {...(validationError === t.decision.reasonRequiredError ? { error: validationError } : {})}
          />

          {warningsApply ? (
            // Story 6.23a (NW9) — BESIDE the unchanged approval-reason dropdown: a line per warning, then the picker.
            <div className="flex flex-col gap-2 rounded border border-status-warn-fg p-2" data-testid="approval-warnings">
              <h3 className="text-xs font-semibold">{t.approvalWarnings.heading}</h3>
              <ul className="list-disc pl-4 text-xs">
                {warningKinds.map((k) => (
                  <li key={k} data-testid={`approval-warning-${k}`}>
                    {t.approvalWarnings.kindLine[k]}
                  </li>
                ))}
              </ul>
              <p className="text-xs">{t.approvalWarnings.stripIntro}</p>
              <ApprovalWarningReasonPicker
                idPrefix="decision"
                options={approvalWarnings?.reasonOptions ?? []}
                value={warningReasonCode}
                onChange={(c) => {
                  setWarningReasonCode(c);
                  setValidationError(null);
                }}
                disabled={processing}
                error={validationError === t.approvalWarnings.reasonRequiredError ? validationError : null}
              />
            </div>
          ) : null}

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" htmlFor="rationale-input">
              {t.decision.rationaleLabel}
              {rationaleRequired ? <span aria-hidden> *</span> : null}
            </label>
            <textarea
              id="rationale-input"
              className="rounded border p-1 text-sm"
              maxLength={VERIFIER_RATIONALE_MAX_CHARS}
              placeholder={t.decision.rationalePlaceholder}
              value={rationale}
              disabled={processing}
              data-testid="rationale-input"
              aria-describedby="rationale-note"
              onChange={(e) => {
                setRationale(e.target.value);
                setValidationError(null);
              }}
            />
            <p id="rationale-note" className="text-xs opacity-60">
              {t.decision.rationaleEncryptedNote} {t.decision.rationaleMaxNote}
            </p>
            {validationError === t.decision.rationaleRequiredError || validationError === t.approvalWarnings.noteRequiredError ? (
              <p className="text-xs text-status-fail-fg" role="alert" data-testid="rationale-error">
                {validationError}
              </p>
            ) : null}
          </div>

          <button
            type="button"
            className="self-start rounded bg-accent px-3 py-1 text-sm font-semibold text-white"
            data-testid="action-submit"
            disabled={processing}
            onClick={() => requestSubmit(isRevisable ? t.decision.revise : t.decision.submit)}
          >
            {processing ? t.decision.processing : isRevisable ? t.decision.revise : t.decision.submit}
          </button>

          {error ? (
            <p className="text-xs text-status-fail-fg" role="alert" data-testid="decision-submit-error">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}

      {/* Confirmation modal = the attestation (AC1(d) — no separate attestation field). */}
      {pending ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t.decision.confirmTitle}
          className="fixed inset-0 z-10 flex items-center justify-center bg-black/40"
          data-testid="confirm-modal"
        >
          <div className="flex max-w-sm flex-col gap-3 rounded bg-white p-4">
            <h3 className="text-sm font-bold">{t.decision.confirmTitle}</h3>
            <p className="text-sm">{t.decision.confirmBody}</p>
            <p className="text-sm font-semibold" data-testid="confirm-action-label">
              {pending.label}
            </p>
            {warningsApply ? (
              // Story 6.23a (NW9) — the confirmation restates the warnings and the chosen warning reason.
              <div className="text-xs" data-testid="confirm-warnings">
                <p>
                  {t.approvalWarnings.confirmWarnings}: {warningKinds.map((k) => t.approvalWarnings.kindLine[k]).join(' ')}
                </p>
                <p data-testid="confirm-warning-reason">
                  {t.approvalWarnings.confirmReason}:{' '}
                  {approvalWarnings?.reasonOptions.find((o) => o.code === warningReasonCode)?.label ?? warningReasonCode}
                </p>
              </div>
            ) : null}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="rounded border px-3 py-1 text-sm"
                data-testid="confirm-cancel"
                onClick={() => setPending(null)}
                disabled={processing}
              >
                {t.decision.confirmCancel}
              </button>
              <button
                type="button"
                className="rounded bg-accent px-3 py-1 text-sm font-semibold text-white"
                data-testid="confirm-submit"
                onClick={() => void confirm()}
                disabled={processing}
              >
                {processing ? t.decision.processing : t.decision.confirmYes}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
