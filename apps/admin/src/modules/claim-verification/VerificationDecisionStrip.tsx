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
  type VerifierDecisionOutcome,
  type VerifierReasonCode,
} from '@twt/contracts';
import { useCallback, useEffect, useState, type ReactElement } from 'react';

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
}

type PendingAction = { outcome: VerifierDecisionOutcome; label: string } | null;

export function VerificationDecisionStrip({
  claimState,
  onDecision,
  onRevise,
  liveDecision,
  processing,
  error,
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

  /** Choose an outcome (active window) — reset an incompatible reason code. */
  const chooseOutcome = useCallback(
    (next: VerifierDecisionOutcome): void => {
      setOutcome(next);
      setValidationError(null);
      setReasonCode((current) => (current !== '' && !isReasonCodeValidForOutcome(next, current) ? '' : current));
    },
    [],
  );

  // Keyboard shortcuts (1/2/3) — a real keydown listener, not the HTML `accessKey` attribute (which
  // needs a browser/OS-specific modifier chord, not a bare keypress). Ignored while typing in a
  // form field (so "1"/"2"/"3" in the rationale textarea doesn't fire an action), while processing, or
  // when the modal/non-active window means there's nothing to choose.
  useEffect(() => {
    if (!isActive || processing) return;
    const handler = (e: KeyboardEvent): void => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable) return;
      if (e.key === t.decision.approveShortcut) chooseOutcome('approved');
      else if (e.key === t.decision.denyShortcut) chooseOutcome('denied');
      else if (e.key === t.decision.escalateShortcut) chooseOutcome('escalated');
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isActive, processing, chooseOutcome]);

  // Neither active nor revisable → a non-interactive historical summary (never reopens review).
  if (!isActive && !isRevisable) {
    return (
      <div data-testid="decision-strip-historical">
        <p className="text-xs opacity-60">{t.decision.historicalNote}</p>
      </div>
    );
  }

  const rationaleRequired =
    outcome === 'denied' || reasonCode === 'other';

  /** Validate the form, then open the confirmation modal (the attestation). */
  const requestSubmit = (label: string): void => {
    if (!outcome) return;
    if (reasonCode === '') {
      setValidationError(t.decision.reasonRequiredError);
      return;
    }
    if (rationaleRequired && rationale.trim() === '') {
      setValidationError(t.decision.rationaleRequiredError);
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
    const input: DecisionSubmit = {
      outcome: pending.outcome,
      reasonCode,
      ...(rationale.trim() !== '' ? { rationale: rationale.trim() } : {}),
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
            disabled={processing}
            onClick={() => chooseOutcome('approved')}
            aria-pressed={outcome === 'approved'}
          >
            {t.decision.approveShortcut}. {t.decision.approve}
          </button>
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
      ) : (
        <p className="text-xs opacity-70" data-testid="revise-window-note">
          {t.decision.revise}
        </p>
      )}

      {outcome ? (
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
            {validationError === t.decision.rationaleRequiredError ? (
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
