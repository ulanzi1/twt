// `<ConvergenceDecisionStrip>` — the ICP pending-resolution surface (Story 6.4, Task 8; AC2/AC3).
//
// ⚠ NOT `<IntakeDecisionStrip>` (UX-DR41 — Priya's unrelated in-call save/finalize/transfer/suspend
// strip). This is a DISTINCT component (this story's own spec): the trustee/operator's pending
// cross-channel-match resolution surface. It is a GENUINE pre-merge decision surface — nothing was
// auto-merged; a cross-channel second intake is recorded `pending` and awaits THIS decision:
//   · Merge    → confirm convergence (union the channel into the canonical claim). Non-destructive.
//   · Override → treat as separate (mints a SECOND canonical claim) — mandatory reason + a
//                confirmation modal, since it is irreversible-by-client.
//
// Pure presentational (all state via props → unit-testable without hooks/router/query), mirroring
// `<HelplineConsoleShell>`. The container below wires the Story 6.4 hooks around it. Co-located with
// the shipped `<HelplineConsoleShell>` (AC2 "inside the helpline console"); chrome English inline
// (the module's chrome-English precedent).

import { CONVERGENCE_OVERRIDE_REASON_MIN, type PendingIntakeAttempt } from '@twt/contracts';
import type { ReactElement } from 'react';
import { useState } from 'react';

import { ApiError } from '../../api/client.js';
import {
  useConfirmConvergenceMerge,
  useConvergencePending,
  useOverrideConvergence,
} from '../../api/hooks.js';

function messageOf(err: unknown): string | undefined {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return undefined;
}

export interface ConvergenceDecisionStripProps {
  pending: readonly PendingIntakeAttempt[];
  loading?: boolean;
  errorMessage?: string;
  onMerge: (input: { intakeAttemptId: string; claimCaseId: string }) => void;
  onOverride: (input: { intakeAttemptId: string; againstClaimCaseId: string; reason: string }) => void;
  /** The IN-FLIGHT merge target, if any — scopes the disabled state to that ONE row's button
   * instead of freezing every row (Review Finding: `mergePending: boolean` disabled all rows). */
  mergingTarget?: { intakeAttemptId: string; claimCaseId: string } | null;
  /** The IN-FLIGHT override target, if any — same per-row scoping as `mergingTarget`. */
  overridingTarget?: { intakeAttemptId: string; againstClaimCaseId: string } | null;
  actionError?: string;
  /** Called when an attempt's sole candidate turned terminal mid-resolution (`candidates` is
   * empty) and the operator chooses to escalate rather than wait (Review Finding — the row
   * previously had no path forward at all). Omit to hide the escalation action entirely. */
  onEscalateNoCandidate?: (input: { intakeAttemptId: string }) => void;
}

/** Pure decision surface — renders pending cross-channel attempts + their candidate claims. */
export function ConvergenceDecisionStrip(props: ConvergenceDecisionStripProps): ReactElement {
  const {
    pending,
    loading = false,
    errorMessage,
    onMerge,
    onOverride,
    mergingTarget = null,
    overridingTarget = null,
    actionError,
    onEscalateNoCandidate,
  } = props;

  // The open override modal target (attempt + the candidate it is NOT being merged into) + reason.
  const [overrideTarget, setOverrideTarget] = useState<{
    intakeAttemptId: string;
    againstClaimCaseId: string;
  } | null>(null);
  const [reason, setReason] = useState('');

  const reasonValid = reason.trim().length >= CONVERGENCE_OVERRIDE_REASON_MIN;

  const closeOverride = (): void => {
    setOverrideTarget(null);
    setReason('');
  };

  const confirmOverride = (): void => {
    if (!overrideTarget || !reasonValid) return;
    onOverride({ ...overrideTarget, reason: reason.trim() });
    closeOverride();
  };

  return (
    <section
      aria-label="Cross-channel convergence decisions"
      data-testid="convergence-decision-strip"
      className="flex flex-col gap-4 rounded border p-4"
    >
      <header>
        <h2 className="text-sm font-semibold uppercase tracking-wide opacity-70">
          Pending cross-channel convergence
        </h2>
        <p className="mt-1 text-xs opacity-60">
          A second-channel intake was recorded for these deaths. Confirm convergence (merge) or treat
          it as a separate case (override).
        </p>
      </header>

      {loading && <p role="status">Loading pending convergence…</p>}

      {errorMessage && (
        <p role="alert" className="text-sm text-status-fail-fg">
          {errorMessage}
        </p>
      )}

      {!loading && pending.length === 0 && (
        <p data-testid="convergence-empty" className="text-sm opacity-70">
          No pending cross-channel convergence.
        </p>
      )}

      {pending.map((attempt) => (
        <article
          key={attempt.intakeAttemptId}
          data-testid={`convergence-attempt-${attempt.intakeAttemptId}`}
          className="flex flex-col gap-2 rounded border border-status-warn-fg bg-status-warn-bg p-3"
        >
          <p className="text-sm">
            Incoming channel:{' '}
            <span className="font-semibold" data-testid="convergence-incoming-channel">
              {attempt.intakeChannel}
            </span>{' '}
            · member <code>{attempt.deceasedMemberId}</code>
          </p>

          {attempt.candidates.length === 0 && (
            <div
              data-testid={`convergence-no-candidate-${attempt.intakeAttemptId}`}
              className="flex flex-col gap-2 rounded border bg-white/60 p-2"
            >
              <p className="text-xs opacity-70">
                No live candidate claim (it may have just settled or been denied). This attempt
                cannot be merged or overridden here.
              </p>
              {onEscalateNoCandidate && (
                <button
                  type="button"
                  onClick={() => onEscalateNoCandidate({ intakeAttemptId: attempt.intakeAttemptId })}
                  data-testid={`convergence-escalate-${attempt.intakeAttemptId}`}
                  className="self-start rounded border border-status-warn-fg px-3 py-1 text-sm text-status-warn-fg"
                >
                  File as a new case
                </button>
              )}
            </div>
          )}

          {attempt.candidates.map((candidate) => {
            const isMergingThis =
              mergingTarget?.intakeAttemptId === attempt.intakeAttemptId &&
              mergingTarget?.claimCaseId === candidate.claimCaseId;
            const isOverridingThis =
              overridingTarget?.intakeAttemptId === attempt.intakeAttemptId &&
              overridingTarget?.againstClaimCaseId === candidate.claimCaseId;
            return (
              <div
                key={candidate.claimCaseId}
                data-testid={`convergence-candidate-${candidate.claimCaseId}`}
                className="flex flex-col gap-2 rounded border bg-white/60 p-2"
              >
                <p className="text-xs opacity-80">
                  Existing claim <code>{candidate.claimCaseId}</code> ·{' '}
                  <span data-testid="convergence-candidate-channels">
                    channels: {candidate.intakeChannels.join(', ')}
                  </span>{' '}
                  · {candidate.currentState}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={isMergingThis}
                    onClick={() => onMerge({ intakeAttemptId: attempt.intakeAttemptId, claimCaseId: candidate.claimCaseId })}
                    data-testid={`convergence-merge-${attempt.intakeAttemptId}-${candidate.claimCaseId}`}
                    className="rounded bg-black px-3 py-1 text-sm text-white disabled:opacity-50"
                  >
                    Merge (confirm convergence)
                  </button>
                  <button
                    type="button"
                    disabled={isOverridingThis}
                    onClick={() =>
                      setOverrideTarget({
                        intakeAttemptId: attempt.intakeAttemptId,
                        againstClaimCaseId: candidate.claimCaseId,
                      })
                    }
                    data-testid={`convergence-override-${attempt.intakeAttemptId}-${candidate.claimCaseId}`}
                    className="rounded border border-status-warn-fg px-3 py-1 text-sm text-status-warn-fg disabled:opacity-50"
                  >
                    Override (treat as separate)
                  </button>
                </div>
              </div>
            );
          })}
        </article>
      ))}

      {actionError && (
        <p role="alert" className="text-sm text-status-fail-fg">
          {actionError}
        </p>
      )}

      {/* Override confirmation modal — mandatory reason, since it mints a SECOND claim. */}
      {overrideTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Confirm override — treat as separate case"
          data-testid="convergence-override-modal"
          className="flex flex-col gap-3 rounded border border-status-warn-fg bg-white p-4"
        >
          <p className="text-sm font-medium">
            Override will mint a SEPARATE claim for this intake and keep it apart from{' '}
            <code>{overrideTarget.againstClaimCaseId}</code>. The account stays frozen while either
            claim is open. This cannot be undone from here.
          </p>
          <label htmlFor="convergence-override-reason" className="text-sm font-medium">
            Reason (required, ≥ {CONVERGENCE_OVERRIDE_REASON_MIN} chars)
          </label>
          <textarea
            id="convergence-override-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            data-testid="convergence-override-reason"
            className="rounded border px-2 py-1 text-sm"
            rows={3}
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={
                !reasonValid ||
                (overridingTarget?.intakeAttemptId === overrideTarget.intakeAttemptId &&
                  overridingTarget?.againstClaimCaseId === overrideTarget.againstClaimCaseId)
              }
              onClick={confirmOverride}
              data-testid="convergence-override-confirm"
              className="rounded bg-black px-3 py-1 text-sm text-white disabled:opacity-50"
            >
              Confirm override
            </button>
            <button
              type="button"
              onClick={closeOverride}
              data-testid="convergence-override-cancel"
              className="rounded border px-3 py-1 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

export interface ConvergenceDecisionStripContainerProps {
  pariwarId: string;
}

/** Container: wires the Story 6.4 hooks around the pure strip (mounted in the helpline console). */
export function ConvergenceDecisionStripContainer({
  pariwarId,
}: ConvergenceDecisionStripContainerProps): ReactElement {
  const pendingQ = useConvergencePending(pariwarId);
  const merge = useConfirmConvergenceMerge(pariwarId);
  const override = useOverrideConvergence(pariwarId);

  return (
    <ConvergenceDecisionStrip
      pending={pendingQ.data?.pending ?? []}
      loading={pendingQ.isLoading}
      errorMessage={messageOf(pendingQ.error)}
      onMerge={(input) => merge.mutate(input)}
      onOverride={(input) => override.mutate(input)}
      mergingTarget={merge.isPending ? (merge.variables ?? null) : null}
      overridingTarget={override.isPending ? (override.variables ?? null) : null}
      actionError={messageOf(merge.error) ?? messageOf(override.error)}
    />
  );
}
