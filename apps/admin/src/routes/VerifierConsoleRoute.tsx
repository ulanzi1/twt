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
  NomineeDeclarationPanel,
  DeathCertificateHistory,
  DeathCertificateReviewControl,
  VerificationDecisionStrip,
  LateWarningReasonPanel,
  type DeathCertificateReviewSubmit,
  type DecisionSubmit,
  type NomineeNameCheckSubmit,
  type NomineeDeterminationSubmit,
  nameDifferenceReasonLabel,
  verifierConsoleEn as t,
} from '../modules/claim-verification/index.js';
import { ApiError } from '../api/client.js';
import {
  claimContactRequiredMessage,
  deathCertificateAcceptanceRequiredMessage,
  groundInspectionRequiredMessage,
  deathCertificateReviewErrorMessage,
  nomineeCorrectionErrorMessage,
  nomineeDeterminationErrorMessage,
  nomineeDeterminationRequiredMessage,
} from '../modules/claim-verification/nominee-errors.js';

export { nomineeCorrectionErrorMessage, nomineeDeterminationErrorMessage, nomineeDeterminationRequiredMessage };
import {
  useDeathCertificateHistory,
  useForgetDeathCertificateHistory,
  usePostDeathCertificateReview,
  useForgetNomineeDeclarationDetails,
  useForgetNomineeNameCheck,
  useNomineeCorrections,
  useNomineeDeclarationSnapshots,
  useNomineeDeclarationTimeline,
  useNomineeNameCheck,
  usePostNomineeCorrectionDecision,
  usePostNomineeDetermination,
  usePostConcealmentAssessment,
  usePostNomineeNameCheck,
  usePostLateWarningReason,
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
    // Story 6.20 (AC5) — the approval gate asks for the as-at-death DETERMINATION first. Name WHY (the
    // server's `details.reason`), so the District Admin knows what to do in the history — ⛔ not to retry,
    // and ⛔ not "record a determination" when they already have and it left nobody standing.
    if (err.code === 'verifier_decision.nominee_determination_required') return nomineeDeterminationRequiredMessage(err);
    // Story 6.21a (D7) — the certificate conjunct runs FIRST; name WHY (⛔ never "try again": the claim waits).
    if (err.code === 'verifier_decision.death_certificate_acceptance_required') return deathCertificateAcceptanceRequiredMessage(err);
    // Story 6.26a (GI11) — the ground inspection, after the name check: say WHY the claim waits (⛔ never "try again").
    if (err.code === 'verifier_decision.ground_inspection_required') return groundInspectionRequiredMessage(err);
    // Story 6.19a (D14) — the contact record, checked AFTER the rest of the gate: say WHY the claim waits.
    if (err.code.endsWith('.claim_contact_required')) return claimContactRequiredMessage(err);
    if (err.code === 'verifier_decision.post_death_refusal_ungrounded') return t.nomineeDeclaration.postDeathRefusalUngrounded;
    // Story 6.23a (NW6, NW7, NW14) — each new refusal in its own words; ⛔ never "try again".
    const warningMessage = approvalWarningErrorMessage(err);
    if (warningMessage !== null) return warningMessage;
  }
  return t.decision.submitError;
}

/**
 * PURE — Story 6.23a's refusals in words (the decision strip AND the late-warning panel share it). `null` for a code
 * this table does not own. ⛔ Never "Please try again": each is a rule, ⛔ not a glitch.
 */
export function approvalWarningErrorMessage(err: ApiError): string | null {
  const e = t.approvalWarnings.errors;
  switch (err.code) {
    case 'verifier_decision.warning_reason_required':
      return e.warningReasonRequired;
    case 'verifier_decision.warning_reason_ungrounded':
      return e.warningReasonUngrounded;
    case 'verifier_decision.warning_reason_unavailable':
      return e.warningReasonUnavailable;
    case 'verifier_decision.late_warning_reason.nothing_uncovered':
      return e.lateNothingUncovered;
    case 'verifier_decision.late_warning_reason.determination_required':
      return e.lateDeterminationRequired;
    case 'verifier_decision.late_warning_reason.no_district_admin_approval':
      return e.lateNoApproval;
    case 'verifier_decision.late_warning_reason.not_recordable_state':
      return e.lateNotRecordable;
    case 'verifier_decision.late_warning_reason.missing_display':
      return e.lateMissingDisplay;
    case 'verifier_decision.not_revisable': {
      const reason = (err.details as { reason?: string } | undefined)?.reason;
      if (reason === 'warning_approval_final' || reason === 'warnings_not_current') return t.approvalWarnings.reviseBlocked[reason]!;
      return null;
    }
    default:
      return null;
  }
}

/**
 * PURE — the LATE-WARNING-REASON panel's errors (code review round 3) — ⛔ deliberately ⛔ not `decisionErrorMessage`,
 * whose fallback says "The decision could not be submitted" on a record that is ⛔ never a decision. Shares the
 * warnings table and the two gate messages the NW14 route can return (the display name; the certificate gate's 409
 * for an out-of-date determination — NW14's order).
 */
export function lateWarningReasonErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code === 'admin.display_name_missing') return t.approvalWarnings.errors.lateMissingDisplay;
    if (err.code === 'verifier_decision.death_certificate_acceptance_required') return deathCertificateAcceptanceRequiredMessage(err);
    const warningMessage = approvalWarningErrorMessage(err);
    if (warningMessage !== null) return warningMessage;
  }
  return t.approvalWarnings.late.submitError;
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
      // Story 6.23a (NW5) — the warning reason rides in its own field.
      ...(input.warningReasonCode !== undefined ? { warning_reason_code: input.warningReasonCode } : {}),
    });
  };
  const submitRevise = async (input: DecisionSubmit): Promise<void> => {
    await revise.mutateAsync({
      outcome: input.outcome,
      reason_code: input.reasonCode,
      ...(input.rationale !== undefined ? { rationale: input.rationale } : {}),
    });
  };
  // ── Story 6.23a (NW8, NW14) — the nominee-change warnings and the District Admin's late-warning reason. ──────
  const approvalWarnings = packet?.approvalWarnings;
  const lateReason = usePostLateWarningReason(pariwarId, claimCaseId);
  const resetLateReason = lateReason.reset;
  useEffect(() => {
    // A claim change drops the previous claim's late-reason outcome (the 6.18 keyed-state lesson).
    resetLateReason();
  }, [claimCaseId, resetLateReason]);
  // The mount condition below also reads `lateReason.status` (code review 2026-10-05), and a plain `useEffect`'s
  // post-paint timing would let the PREVIOUS claim's `isSuccess`/`isPending` flash the panel for one frame before the
  // effect above lands. ⭐ Round 3: the outcome is tied to the claim it was SUBMITTED for, in STATE, set by the submit
  // itself — ⛔ never a ref written during render (the round-2 shape), which StrictMode's double render and a discarded
  // concurrent render both defeat. On the first render of another claim `lateReasonFor !== claimCaseId`, so there is
  // no frame to flash, and nothing is written while rendering.
  const [lateReasonFor, setLateReasonFor] = useState<string | null>(null);
  const lateReasonHere = lateReasonFor === claimCaseId && lateReason.status !== 'idle';
  const submitLateReason = async (input: { warningReasonCode: string; note: string }): Promise<boolean> => {
    setLateReasonFor(claimCaseId);
    return lateReason
      .mutateAsync({ warning_reason_code: input.warningReasonCode, note: input.note })
      .then(() => true)
      .catch(() => false);
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

  // Story 6.20 — the nominee declaration HISTORY, behind its own disclosure, keyed to the claim it was
  // opened for (the 6.18 pattern: a claim change can ⛔ never fire a read of the next claim). The
  // timeline is metadata; the snapshots DECRYPT and are fetched only when asked for (D10).
  const [declOpenFor, setDeclOpenFor] = useState<string | null>(null);
  const declOpen = declOpenFor === claimCaseId;
  const [detailsFor, setDetailsFor] = useState<string | null>(null);
  const detailsRequested = declOpen && detailsFor === claimCaseId;
  const timelineQ = useNomineeDeclarationTimeline(pariwarId, claimCaseId, declOpen);
  const snapshotsQ = useNomineeDeclarationSnapshots(pariwarId, claimCaseId, detailsRequested);
  // ⭐ The corrections decrypt names and numbers too — fetched only with the SAME reveal (D10).
  const correctionsQ = useNomineeCorrections(pariwarId, claimCaseId, detailsRequested);
  const determine = usePostNomineeDetermination(pariwarId, claimCaseId);
  const decideCorrection = usePostNomineeCorrectionDecision(pariwarId, claimCaseId);
  const forgetDeclarationDetails = useForgetNomineeDeclarationDetails(pariwarId, claimCaseId);
  // ⭐ Keyed to the claim, the 6.18 way (code review 2026-09-24): on a claim change FORGET the previous
  // claim's decrypted details and drop both mutations' leftover errors — they used to show claim A's
  // refusal on claim B's panel. `reset` is TanStack's stable observer method.
  const resetDetermine = determine.reset;
  const resetDecide = decideCorrection.reset;
  const previousDeclClaimRef = useRef(claimCaseId);
  useEffect(() => {
    if (previousDeclClaimRef.current !== claimCaseId) {
      forgetDeclarationDetails(previousDeclClaimRef.current);
      previousDeclClaimRef.current = claimCaseId;
      // ⭐ D10 (code review 2026-09-24b): CLOSE the disclosure and drop the reveal too. Keyed to the claim,
      // they survived A→B→A — returning to A re-enabled both decrypting reads with ⛔ no click.
      setDeclOpenFor(null);
      setDetailsFor(null);
    }
    resetDetermine();
    resetDecide();
    // `forgetDeclarationDetails` is a fresh closure each render and must ⛔ not re-run this effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claimCaseId, resetDetermine, resetDecide]);

  // ── Story 6.21a (D10) — the death certificate's review + its history ─────────────────────────────
  // The item carries the review only for `death_certificate`; `viewer.canReview` is judged SERVER-side.
  const certificateItem =
    packet?.documentReview.status === 'present'
      ? packet.documentReview.reviews.find((r) => r.documentType === 'death_certificate')
      : undefined;
  const certificateReview = certificateItem?.review;
  // D7 review fix — `accepted` alone is ⛔ not enough: a re-review or replacement since the live
  // determination was recorded makes it `determination_stale`, the gate's 4th ground.
  const certificateAccepted = certificateReview?.status === 'accepted' && certificateReview.determinationStale === false;
  // The open form and the history are KEYED TO THE CLAIM they were opened for (the 6.18 lesson: a claim
  // change can ⛔ never carry a half-filled form, nor fire a decrypting read of the next claim).
  const [certModeFor, setCertModeFor] = useState<{ claim: string; mode: 'accept' | 'reject' } | null>(null);
  const certMode = certModeFor?.claim === claimCaseId ? certModeFor.mode : null;
  const setCertMode = (mode: 'accept' | 'reject' | null): void => setCertModeFor(mode ? { claim: claimCaseId, mode } : null);
  const [certHistoryFor, setCertHistoryFor] = useState<string | null>(null);
  const certHistoryOpen = certHistoryFor === claimCaseId;
  const certHistoryQ = useDeathCertificateHistory(pariwarId, claimCaseId, certHistoryOpen);
  const forgetCertHistory = useForgetDeathCertificateHistory(pariwarId, claimCaseId);
  const reviewCertificate = usePostDeathCertificateReview(pariwarId, claimCaseId);
  const resetReview = reviewCertificate.reset;
  const previousCertClaimRef = useRef(claimCaseId);
  useEffect(() => {
    if (previousCertClaimRef.current !== claimCaseId) {
      // ⭐ FORGET the previous claim's decrypted history (the A→B→A posture) and close it.
      forgetCertHistory(previousCertClaimRef.current);
      previousCertClaimRef.current = claimCaseId;
      setCertHistoryFor(null);
      setCertModeFor(null);
    }
    resetReview();
    // `forgetCertHistory` is a fresh closure each render and must ⛔ not re-run this effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claimCaseId, resetReview]);
  const submitCertificateReview = async (input: DeathCertificateReviewSubmit): Promise<boolean> => {
    if (!certificateReview?.certificateToken) return false;
    return reviewCertificate
      .mutateAsync({
        verdict: input.verdict,
        certificate_token: certificateReview.certificateToken,
        ...(input.accepted_date !== undefined ? { accepted_date: input.accepted_date } : {}),
        ...(input.rejection_reason !== undefined ? { rejection_reason: input.rejection_reason } : {}),
        note: input.note,
        expected_live_review_id: certificateReview.liveReviewId,
      })
      .then(() => true)
      .catch(() => false);
  };
  // D7 — approve waits for an ACCEPTED certificate (named FIRST, the gate's own order), then the name check.
  // ⛔ `unavailable` is ⛔ not `none`: a section that failed to load never says no certificate was sent; and a
  // legacy row (`missing`, no token) is ⛔ not "review it" — the gate answers `no_certificate` for it too.
  const certificateBlockedReason = certificateAccepted
    ? null
    : packet?.documentReview.status === 'unavailable'
      ? t.deathCertificate.approveBlocked.unavailable!
      : !certificateItem || certificateReview?.status === 'missing'
        ? t.deathCertificate.approveBlocked.no_certificate!
        : certificateReview?.status === 'rejected'
          ? t.deathCertificate.approveBlocked.rejected!
          : certificateReview?.status === 'accepted' && certificateReview.determinationStale === true
            ? t.deathCertificate.approveBlocked.determination_stale!
            : t.deathCertificate.approveBlocked.not_reviewed!;

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
              canApprove={
                certificateAccepted &&
                packet.nomineeNameCheck.currentAndPassing &&
                // Story 6.26a (GI9) — approve waits for a COMPLETE ground inspection; ⛔ never on an unknown.
                packet.groundInspectionGate.available &&
                packet.groundInspectionGate.complete &&
                packet.approvalWarnings.available
              }
              // Story 6.23a (NW9) — the warnings + the reason list; (NW7) the revise control's words when blocked.
              approvalWarnings={{ kinds: packet.approvalWarnings.kinds, reasonOptions: packet.approvalWarnings.reasonOptions }}
              reviseBlocked={packet.approvalWarnings.reviseBlocked}
              // ⚠⚠ NAME THE ACTUAL BLOCKER (code review 2026-09-20). This fell through to
              // *"Record the nominee name check before approving"* for EVERY non-passing case —
              // including the one where the District Admin had just recorded `does_not_match`
              // themselves. Telling somebody to do a thing they have visibly already done reads as
              // the console not having noticed, and hides the real instruction: get it corrected.
              approveBlockedReason={
                certificateBlockedReason !== null
                  ? certificateBlockedReason
                  : !packet.approvalWarnings.available
                  ? // Story 6.23a — ⛔ never "no warnings" on an unknown: Approve waits until the section loads.
                    t.approvalWarnings.unavailable
                  : packet.nomineeNameCheck.currentAndPassing
                  ? // Story 6.26a (GI9) — the ground inspection, AFTER the name check (the gate's own order).
                    !packet.groundInspectionGate.available
                    ? t.groundInspectionGate.approveBlocked.unavailable!
                    : packet.groundInspectionGate.complete
                      ? null
                      : t.groundInspectionGate.approveBlocked[packet.groundInspectionGate.waitReason ?? 'no_completed_inspection']!
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
              // Story 6.21a (D10) — "Request a better document" opens the reject form; only for a reviewer.
              {...(certificateReview?.viewer.canReview === true ? { onRequestBetterCertificate: () => setCertMode('reject') } : {})}
            />
            {/* Story 6.21a (D10, AC5) — the death certificate: the review control (District Admin only) and
                the on-demand history (any console reader — `claim.verify`). */}
            {certificateItem ? (
              <section className="mt-4 border-t pt-4" data-testid="death-certificate-section">
                <h3 className="font-semibold">{t.deathCertificate.heading}</h3>
                {certificateReview?.viewer.canReview === true ? (
                  <DeathCertificateReviewControl
                    key={claimCaseId}
                    review={certificateReview}
                    ocrDateOfDeath={certificateItem.extracted.dateOfDeath}
                    mode={certMode}
                    onModeChange={setCertMode}
                    onSubmit={submitCertificateReview}
                    processing={reviewCertificate.isPending}
                    error={reviewCertificate.error ? deathCertificateReviewErrorMessage(reviewCertificate.error) : null}
                    recorded={reviewCertificate.isSuccess}
                  />
                ) : null}
                <button
                  type="button"
                  className="mt-2 text-sm underline"
                  data-testid="death-certificate-history-disclosure"
                  aria-expanded={certHistoryOpen}
                  onClick={() => {
                    // ⭐ Closing FORGETS the decrypted dates and notes; a reopen is a fresh, audited look.
                    if (certHistoryOpen) forgetCertHistory();
                    setCertHistoryFor(certHistoryOpen ? null : claimCaseId);
                  }}
                >
                  {certHistoryOpen ? t.deathCertificate.history.hide : t.deathCertificate.history.show}
                </button>
                <p className="text-xs">{t.deathCertificate.history.audited}</p>
                {certHistoryOpen ? (
                  <DeathCertificateHistory
                    history={certHistoryQ.isError ? undefined : certHistoryQ.data}
                    loading={certHistoryQ.isLoading}
                    error={certHistoryQ.isError ? t.deathCertificate.history.error : null}
                  />
                ) : null}
              </section>
            ) : null}
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
            {/* Story 6.23a (NW14) — mounted on `viewerCanRecordLateReason` ALONE (the server judged NW14's whole
                predicate for THIS viewer — `-279` A1), ⛔ never also on `uncoveredSinceApproval > 0`.
                ⭐ Code review 2026-10-05: ALSO kept mounted while `lateReason.status !== 'idle'` — the mutation's
                own success invalidates the console packet, which can flip `viewerCanRecordLateReason` to `false`
                on the very next render (this recorder's reason now covers every remaining late key). Without
                this, the panel — and `t.late.recorded` inside it — unmounts before the approver can read it.
                `status !== 'idle'` (⛔ not just `isSuccess`, re-review 2026-10-05) ALSO covers a second submit
                started right after the first success: the moment a new `mutate` begins, `isSuccess` flips back
                to `false` before `isPending` is even visible, which would otherwise unmount the panel mid-submit
                and hide its processing state (and any resulting error) from the operator.
                `resetLateReason` on a claim change (above) still drops this once it no longer applies. */}
            {approvalWarnings?.viewerCanRecordLateReason === true || lateReasonHere ? (
              <LateWarningReasonPanel
                key={claimCaseId}
                options={approvalWarnings?.reasonOptions ?? []}
                uncoveredSinceApproval={approvalWarnings?.uncoveredSinceApproval ?? 0}
                lateKeysUncoveredForViewer={approvalWarnings?.lateKeysUncoveredForViewer ?? 0}
                onSubmit={submitLateReason}
                processing={lateReason.isPending}
                error={lateReason.error ? lateWarningReasonErrorMessage(lateReason.error) : null}
                recorded={lateReason.isSuccess}
                // Mounted for its own outcome after the server stopped offering it ⇒ the outcome alone (round 3).
                canRecord={approvalWarnings?.viewerCanRecordLateReason === true}
              />
            ) : null}
            {/* Story 6.20 (AC3, AC4, AC7) — the nominee declaration history, behind a disclosure. */}
            <section className="mt-4 border-t pt-4">
              <button
                type="button"
                data-testid="nominee-declaration-disclosure"
                className="text-sm underline"
                aria-expanded={declOpen}
                onClick={() => {
                  // ⭐ Closing FORGETS the decrypted details and the lingering write outcomes; a reopen is a
                  // fresh, audited look.
                  forgetDeclarationDetails();
                  resetDetermine();
                  resetDecide();
                  setDetailsFor(null);
                  setDeclOpenFor(declOpen ? null : claimCaseId);
                }}
              >
                {t.nomineeDeclaration.heading}
              </button>
              {declOpen ? (
                <NomineeDeclarationPanel
                  // ⭐ A fresh mount per claim — ⛔ no carried-over marks, date or note.
                  key={claimCaseId}
                  timeline={timelineQ.isError ? undefined : timelineQ.data}
                  loading={timelineQ.isLoading}
                  error={timelineQ.isError ? t.nomineeDeclaration.loadError : null}
                  snapshots={snapshotsQ.data}
                  snapshotsLoading={snapshotsQ.isFetching}
                  snapshotsError={snapshotsQ.isError ? t.nomineeDeclaration.detailsError : null}
                  detailsRequested={detailsRequested}
                  onShowDetails={() => {
                    // A second press (a version added since) is a fresh, audited look — a refetch.
                    if (detailsRequested) void snapshotsQ.refetch();
                    else setDetailsFor(claimCaseId);
                  }}
                  onDetermine={async (input: NomineeDeterminationSubmit) => {
                    await determine.mutateAsync(input).catch(() => undefined);
                  }}
                  determining={determine.isPending}
                  determineError={determine.error ? nomineeDeterminationErrorMessage(determine.error) : null}
                  determined={determine.isSuccess}
                  corrections={correctionsQ.data}
                  correctionsLoading={correctionsQ.isLoading}
                  correctionsError={correctionsQ.isError ? t.nomineeDeclaration.corrections.loadError : null}
                  // The console is the District Admin's surface — step 1 only (the Pariwar Admin decides on
                  // their own queue page; the helpline raises on the helpline page).
                  decideStep="district"
                  onDecide={(correctionId, step, outcome, note) =>
                    decideCorrection
                      .mutateAsync({ correctionId, step, body: { outcome, note } })
                      .then(() => true)
                      .catch(() => false)
                  }
                  deciding={decideCorrection.isPending}
                  decideError={decideCorrection.error ? nomineeCorrectionErrorMessage(decideCorrection.error, 'decide') : null}
                  decidedOutcome={decideCorrection.isSuccess ? (decideCorrection.variables?.body.outcome ?? null) : null}
                  onRetryCorrections={() => void correctionsQ.refetch()}
                />
              ) : null}
            </section>
          </>
        ) : null}
      </VerificationConsoleShell>
    </VerifierConsoleGateView>
  );
}
