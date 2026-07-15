// The /p/:pariwarId/claims/:claimCaseId/verify route + its session gate (Story 6.10, Task 4).
//
// The verifier console is tenant-scoped (like the ground-inspection route). `claim.verify` is a
// PER-PARIWAR district-scoped grant, so — like those consoles — the CLIENT gate is only "is there a
// live session"; the REAL boundary is the server chain [adminSession, scope, resolveDistrict,
// requirePermissionHook(claim.verify, district)] (fail-closed, audited). An unauthenticated session
// (401) bounces to /login; a per-request 403 (wrong district / no-district exception) surfaces as an
// authorization message, never a stale packet.
//
// D8 SAFE SCOPE SWITCH: switching Pariwar is an explicit NAVIGATION to the target Pariwar's SAFE
// landing route (the member-search surface) — NOT the same claimCaseId under `/p/:otherId/`. Navigating
// there UNMOUNTS this route (clearing the packet + its cache-disabled query), so the old Pariwar's
// evidence is never rendered under new-scope chrome and the claimCaseId is never carried across.
//
// `VerifierConsoleGateView` is a PURE presentational decision (no hooks/router) so the gate is
// unit-testable without a router context (mirrors GroundInspectionRoute / HelplineClaimRoute).

import { useNavigate, useParams } from '@tanstack/react-router';
import type { ReactElement, ReactNode } from 'react';
import { useEffect } from 'react';

import {
  ScopeChrome,
  SignalsPanel,
  VerificationConsoleShell,
  VerificationDecisionStrip,
  type DecisionSubmit,
  verifierConsoleEn as t,
} from '../modules/claim-verification/index.js';
import { ApiError } from '../api/client.js';
import {
  usePostConcealmentAssessment,
  usePostVerifierDecision,
  useReviseVerifierDecision,
  useSession,
  useVerifierConsole,
} from '../api/hooks.js';
import type { ConcealmentAssessmentSubmit } from '../modules/claim-verification/index.js';

export interface VerifierConsoleGateViewProps {
  status: 'loading' | 'error' | 'success';
  children: ReactNode;
}

/** Pure gate: decide loading / redirecting / allowed from session state. */
export function VerifierConsoleGateView({ status, children }: VerifierConsoleGateViewProps): ReactElement {
  if (status === 'loading') return <p role="status">Checking your session…</p>;
  if (status === 'error') return <p role="status">Redirecting to sign in…</p>;
  return <>{children}</>;
}

/**
 * PURE — D8's safe-switch navigation target: the target Pariwar's SAFE landing route (member-search),
 * never the current `claimCaseId`. Independently testable without mounting the route (no router/hooks),
 * so the "does not carry claimCaseId across Pariwars" property can be asserted directly.
 */
export function verifierConsoleSwitchTarget(targetPariwarId: string): {
  to: '/p/$pariwarId/members';
  params: { pariwarId: string };
} {
  return { to: '/p/$pariwarId/members', params: { pariwarId: targetPariwarId } };
}

/** The wire codes that collapse to the same "reload — this claim moved under you" message: a repeat
 *  submit already recorded (verifier_decision.already_decided), a concurrent revision race
 *  (verifier_decision.revision_conflict), or the lifecycle-event version backstop
 *  (verifier_decision.stream_conflict). All three mean the SAME thing to the verifier: their view of
 *  the claim is stale. */
const DECISION_CONFLICT_CODES = new Set([
  'verifier_decision.already_decided',
  'verifier_decision.revision_conflict',
  'verifier_decision.stream_conflict',
]);

/**
 * PURE — map a decision-submit failure to the message the strip surfaces. Distinguishes step-up
 * (re-authenticate and retry the SAME action), missing display name (an ops fix, not a retry), a stale
 * decision/conflict (reload first), and a generic fallback for anything else (forbidden, transient 5xx,
 * validation the UI itself should already have caught). Independently testable (no router/hooks).
 */
export function decisionErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code === 'auth.step_up_required') return t.decision.stepUpRequired;
    if (err.code === 'admin.display_name_missing') return t.decision.displayNameMissing;
    if (DECISION_CONFLICT_CODES.has(err.code)) return t.decision.decisionConflict;
  }
  return t.decision.submitError;
}

export function VerifierConsoleRoute(): ReactElement {
  const session = useSession();
  const navigate = useNavigate();
  const { pariwarId, claimCaseId } = useParams({ from: '/p/$pariwarId/claims/$claimCaseId/verify' });
  const console_ = useVerifierConsole(pariwarId, claimCaseId);
  const decision = usePostVerifierDecision(pariwarId, claimCaseId);
  const revise = useReviseVerifierDecision(pariwarId, claimCaseId);
  const concealmentAssessment = usePostConcealmentAssessment(pariwarId, claimCaseId);

  useEffect(() => {
    if (session.isError) void navigate({ to: '/login' });
  }, [session.isError, navigate]);

  const status: VerifierConsoleGateViewProps['status'] = session.isLoading
    ? 'loading'
    : session.isError
      ? 'error'
      : 'success';

  // D8 — switching Pariwar navigates to the target's SAFE landing route (member-search), NOT the same
  // claimCaseId under the new tenant. Leaving this route unmounts the console → packet + query cleared.
  const onSwitch = (targetPariwarId: string): void => {
    void navigate(verifierConsoleSwitchTarget(targetPariwarId));
  };

  const packet = console_.data?.packet;

  // The revise window's pre-fill source: the transcript (oldest→newest) ends with the claim's current
  // LIVE decision whenever the claim is in a revisable state (verifier_approved/denied never re-enters
  // review, so no later escalate/adjudicate can have appended past it).
  const priorComments =
    packet?.priorVerifierComments.status === 'present' ? packet.priorVerifierComments.comments : [];
  const liveComment = priorComments[priorComments.length - 1];
  const liveDecision =
    liveComment != null
      ? {
          reasonCode: liveComment.reasonCode as DecisionSubmit['reasonCode'],
          rationale: liveComment.rationale,
        }
      : undefined;

  // Story 6.11 — the decision write. The strip is interactive only in the active window; the route wires
  // approve/deny/escalate + revise to the mutation hooks, which invalidate the console packet on success
  // so (e)/(f) + the audit trail refetch. A StepUpRequiredError (403) on revise surfaces its message.
  const submitDecision = async (input: DecisionSubmit): Promise<void> => {
    await decision.mutateAsync({
      outcome: input.outcome,
      reason_code: input.reasonCode,
      ...(input.rationale !== undefined ? { rationale: input.rationale } : {}),
    });
  };
  const submitRevise = async (input: DecisionSubmit): Promise<void> => {
    await revise.mutateAsync({
      outcome: input.outcome,
      reason_code: input.reasonCode,
      ...(input.rationale !== undefined ? { rationale: input.rationale } : {}),
    });
  };
  const submitError = decision.error ?? revise.error;
  const decisionErrorText = submitError ? decisionErrorMessage(submitError) : null;

  // Story 6.15 — record/revise a concealment-linkage assessment; the console packet is invalidated on
  // success so the concealment tri-state + the flagged banner re-render with the new signal.
  const submitConcealmentAssessment = async (input: ConcealmentAssessmentSubmit): Promise<void> => {
    await concealmentAssessment.mutateAsync({
      kind: input.kind,
      ...(input.note !== undefined ? { note: input.note } : {}),
    });
  };
  const concealmentAssessErrorText = concealmentAssessment.error
    ? decisionErrorMessage(concealmentAssessment.error)
    : null;

  return (
    <VerifierConsoleGateView status={status}>
      <VerificationConsoleShell
        claimCaseId={claimCaseId}
        deceasedMemberName={packet?.identity.deceasedName ?? null}
        claimState={packet?.claimState ?? '…'}
        scopeChrome={
          <ScopeChrome
            activePariwarId={pariwarId}
            activePariwarName={pariwarId}
            pariwars={[{ id: pariwarId, name: pariwarId }]}
            onSwitch={onSwitch}
          />
        }
        // Story 6.11 — mount the decision strip into the sticky slot; it self-gates on the claim state
        // (interactive in the active window, revise post-verdict, non-interactive summary otherwise).
        decisionSlot={
          packet ? (
            // `key` forces a fresh mount (and so a fresh outcome/reasonCode/rationale useState) whenever
            // the claim or its state changes — otherwise this instance would persist across claim
            // switches and a half-filled form (or a just-submitted decision's values) could carry over.
            <VerificationDecisionStrip
              key={`${claimCaseId}-${packet.claimState}`}
              claimState={packet.claimState}
              onDecision={submitDecision}
              onRevise={submitRevise}
              liveDecision={liveDecision}
              processing={decision.isPending || revise.isPending}
              error={decisionErrorText}
            />
          ) : undefined
        }
      >
        {console_.isLoading ? (
          <p role="status" data-testid="console-loading">
            {t.states.loading}
          </p>
        ) : console_.isError ? (
          <p role="alert" data-testid="console-error">
            {console_.error instanceof ApiError && console_.error.isForbidden
              ? t.states.forbidden
              : t.states.unavailable}
          </p>
        ) : packet ? (
          <SignalsPanel
            packet={packet}
            onAssessConcealment={submitConcealmentAssessment}
            concealmentAssessing={concealmentAssessment.isPending}
            concealmentAssessError={concealmentAssessErrorText}
          />
        ) : null}
      </VerificationConsoleShell>
    </VerifierConsoleGateView>
  );
}
