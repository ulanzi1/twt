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
import { useEffect, useRef, useState } from 'react';

import {
  ScopeChrome,
  SignalsPanel,
  VerificationConsoleShell,
  NomineeNameCheckPanel,
  VerificationDecisionStrip,
  type DecisionSubmit,
  type NomineeNameCheckSubmit,
  nameDifferenceReasonLabel,
  verifierConsoleEn as t,
} from '../modules/claim-verification/index.js';
import { ApiError } from '../api/client.js';
import {
  useForgetNomineeNameCheck,
  useNomineeNameCheck,
  usePostConcealmentAssessment,
  usePostNomineeNameCheck,
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

/**
 * The NAME-CHECK error table — ⛔ deliberately separate from `decisionErrorMessage`.
 *
 * ⚠⚠ THE NAME-CHECK ERRORS USED TO GO THROUGH THE DECISION TABLE (code review 2026-09-20), whose
 * codes are all `verifier_decision.*`. So every one of them fell through to *"The decision could
 * not be submitted. Please try again."* — wrong twice over: nothing was a DECISION (a check is not
 * a verdict on the claim), and "try again" is the one thing that cannot work for the commonest case,
 * a staleness 409, where the right action is to READ THE NAMES AGAIN because they changed.
 */
export function nameCheckErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code === 'auth.step_up_required') return t.decision.stepUpRequired;
    if (err.code === 'admin.display_name_missing') return t.decision.displayNameMissing;
    if (err.code === 'nominee_name_check.stale') return t.nameCheck.errorStale;
    if (err.code === 'nominee_name_check.bank_details_required') return t.nameCheck.bankDetailsMissing;
    if (err.code === 'nominee_name_check.not_recordable') return t.nameCheck.checkNotRecordableHere;
    if (err.code === 'nominee_name_check.invalid') return t.nameCheck.errorInvalid;
    if (err.code === 'nominee_name_check.stream_conflict') return t.decision.decisionConflict;
    if (err.isForbidden) return t.nameCheck.errorForbidden;
  }
  return t.nameCheck.errorGeneric;
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

  // Story 6.18 (AC2) — the NAMES are fetched ON DEMAND, ⛔ never as a side effect of loading the
  // console: the read decrypts a LIVING nominee's Tier-1 name and writes an audit line, so it must
  // happen when a District Admin chooses to look, and the audit line must mean they looked.
  // ⚠⚠ THE OPEN STATE IS KEYED TO THE CLAIM IT WAS OPENED FOR (code review 2026-09-23c). It was a
  // boolean reset by an EFFECT on `claimCaseId` — but effects run after the render that already
  // handed the query observer `enabled: true` with the NEW claim's key, so a same-route claim change
  // with the disclosure open fired ONE audited decrypt of the next claim before the reset landed.
  // Deriving `nameCheckOpen` from `openFor === claimCaseId` makes it false on that very render.
  const [nameCheckOpenFor, setNameCheckOpenFor] = useState<string | null>(null);
  const nameCheckOpen = nameCheckOpenFor === claimCaseId;
  const nameCheck = useNomineeNameCheck(pariwarId, claimCaseId, nameCheckOpen);
  const postNameCheck = usePostNomineeNameCheck(pariwarId, claimCaseId);
  const forgetNames = useForgetNomineeNameCheck(pariwarId, claimCaseId);
  // ⭐ THE REST OF THE TICKED 2026-09-20 BULLET (*"`key` the route/panel state (`nameCheckOpen`,
  // `postNameCheck`, verdicts) on `claimCaseId`"*). The open state is keyed above; on a claim change
  // this effect drops the previous claim's write error and FORGETS its decrypted names (they are no
  // longer on screen, and nothing else would remove them). `reset` is TanStack's stable observer method.
  const resetPostNameCheck = postNameCheck.reset;
  const previousClaimRef = useRef(claimCaseId);
  useEffect(() => {
    if (previousClaimRef.current !== claimCaseId) {
      forgetNames(previousClaimRef.current);
      previousClaimRef.current = claimCaseId;
    }
    resetPostNameCheck();
    // `forgetNames` is a fresh closure each render and must ⛔ not re-run this effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claimCaseId, resetPostNameCheck]);
  const toggleNameCheck = (): void => {
    if (nameCheckOpen) {
      // ⭐ Closing FORGETS the names (`useForgetNomineeNameCheck`) and clears a lingering write
      // error — it used to survive close + reopen and sit over freshly re-read names.
      forgetNames();
      resetPostNameCheck();
      setNameCheckOpenFor(null);
    } else {
      setNameCheckOpenFor(claimCaseId);
    }
  };
  const submitNameCheck = async (input: NomineeNameCheckSubmit): Promise<void> => {
    await postNameCheck.mutateAsync(input);
  };

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
              // Story 6.18 (AC4) — approve is unavailable until the claim carries its two bank
              // accounts AND a current, passing District Admin name check. The domain refuses it
              // anyway under the claim lock; disabling here stops the console offering a control
              // that would 409, which would read to an operator as a glitch rather than a rule.
              canApprove={packet.nomineeNameCheck.currentAndPassing}
              // ⚠⚠ NAME THE ACTUAL BLOCKER (code review 2026-09-20). This fell through to
              // *"Record the nominee name check before approving"* for EVERY non-passing case —
              // including the one where the District Admin had just recorded `does_not_match`
              // themselves. Telling somebody to do a thing they have visibly already done reads as
              // the console not having noticed, and hides the real instruction: get it corrected.
              approveBlockedReason={
                packet.nomineeNameCheck.currentAndPassing
                  ? null
                  : // ⛔ "we could not read this" is ⛔ NOT "the bank details are missing".
                    !packet.nomineeNameCheck.available
                    ? t.nameCheck.statusUnavailable
                    : !packet.nomineeNameCheck.accountsComplete
                      ? t.nameCheck.bankDetailsMissing
                      : nameCheck.data?.current_check?.accounts.some((a) => a.verdict === 'does_not_match') ===
                          true
                        ? t.nameCheck.approveBlockedSentBack
                        : t.nameCheck.approveBlocked
              }
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
          <>
            <SignalsPanel
              packet={packet}
              onAssessConcealment={submitConcealmentAssessment}
              concealmentAssessing={concealmentAssessment.isPending}
              concealmentAssessError={concealmentAssessErrorText}
            />
            {/* Story 6.18 (AC2/AC3) — the nominee name check, behind a disclosure. */}
            <section className="mt-4 border-t pt-4">
              <button
                type="button"
                data-testid="name-check-disclosure"
                className="text-sm underline"
                aria-expanded={nameCheckOpen}
                onClick={toggleNameCheck}
              >
                {t.nameCheck.heading}
                {/* AC8 — the highlight rides the console's OWN read, so it shows WITHOUT opening the
                    disclosure (and therefore without decrypting a name). */}
                {/* ⚠ LABELS, ⛔ not a bare headline. The packet carries the reason CODES and this
                    dropped them entirely, so the District Admin's own console said only "approved
                    with a name difference" while the Pariwar Admin's card named the reason — the
                    two surfaces AC8 covers, disagreeing. */}
                {packet.nomineeNameCheck.differenceReasons.length > 0 ? (
                  <span
                    data-testid="console-name-difference-flag"
                    className="ml-2 rounded bg-status-warn-bg px-2 py-0.5 text-xs text-status-warn-fg"
                  >
                    {t.nameCheck.approvedWithDifference}:{' '}
                    {packet.nomineeNameCheck.differenceReasons
                      .map((r) => nameDifferenceReasonLabel(r))
                      .join(', ')}
                  </span>
                ) : null}
                {/* ⭐ A TRANSIENT FAILURE SAYS SO. The section used to fail soft into
                    `accountsComplete: false`, which renders as "bank details missing" — sending a
                    District Admin to chase a family for documents already on file. */}
                {!packet.nomineeNameCheck.available ? (
                  <span
                    data-testid="console-name-check-unavailable"
                    className="ml-2 rounded bg-black/5 px-2 py-0.5 text-xs"
                  >
                    {t.nameCheck.statusUnavailable}
                  </span>
                ) : null}
              </button>
              {nameCheckOpen ? (
                <NomineeNameCheckPanel
                  // ⛔ NO stale names beside a read error (code review 2026-09-23c — the other half of
                  // a ticked 09-23b bullet): a failed refetch keeps `data`, and the panel rendered the
                  // OLD names next to "could not be loaded".
                  data={nameCheck.isError ? undefined : nameCheck.data}
                  loading={nameCheck.isLoading}
                  // ⚠ THE WRITE ERROR WINS. This was the other way round, so a lingering read error
                  // masked the message about the judgement the District Admin had just tried to
                  // record — the one they were waiting on.
                  error={
                    postNameCheck.isError
                      ? nameCheckErrorMessage(postNameCheck.error)
                      : nameCheck.isError
                        ? nameCheckErrorMessage(nameCheck.error)
                        : null
                  }
                  // ⭐ The SERVER is the boundary (`claim.check_nominee_name`, district-dimension),
                  // exactly as for every other write on this console — this app deliberately keeps
                  // ⛔ no client-side grant gate, so a holder of the READ key who is not a District
                  // Admin gets a 403 surfaced as an error rather than a silently-hidden control.
                  // The prop exists so a future grants-aware caller (and the tests) can drive it.
                  canCheck
                  onSubmit={submitNameCheck}
                  processing={postNameCheck.isPending}
                />
              ) : null}
            </section>
          </>
        ) : null}
      </VerificationConsoleShell>
    </VerifierConsoleGateView>
  );
}
