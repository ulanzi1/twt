// R9 case panel — Story 6.14 (Task 9; AC1–AC5). The per-claim voting surface.
//
// Renders one queued R9 claim's panel: the registry clause snapshot (clause_id + clause_version_id badge +
// rule_code + voting_requirement), the IMMUTABLE panel roster, the live votes with per-vote provenance, the
// cast/revise-vote control, the step-up-gated finalize action (with the computed-outcome preview), and the
// cancel/correct control. When no live session exists, the open form (clause selection + panel roster). NO
// dedicated UX spec exists (UJ-7 deferred) — this mirrors the cycle-freeze module's de facto pattern.

import { R9_PANEL_MAX_MEMBERS, R9_VOTING_CLAUSE_IDS } from '@twt/contracts';
import type { ReactElement } from 'react';
import { useState } from 'react';

import { ApiError, errorMessage as apiErrorMessage } from '../../api/client.js';
import {
  claimContactRequiredMessage,
  laterApprovalWarningErrorMessage,
  trusteeDeathCertificateAcceptanceRequiredMessage,
  trusteeDeterminationRequiredMessage,
} from '../claim-verification/nominee-errors.js';
import {
  LaterApprovalWarnings,
  approvalBlockedReason,
  approvalNeedsWarningReason,
  resolvedWarningReasonCode,
} from '../claim-verification/LaterApprovalWarnings.js';

/**
 * The panel's error text. Story 6.20 (AC5) — a nominee correction can supersede the determination after
 * the verifier approved, so a vote / finalize meets the approval gate's 409 again: say WHO must act.
 */
function errorMessage(error: unknown): string | undefined {
  // Story 6.21a (D7) — the approval waits for an ACCEPTED death certificate; worded for the trustee (⛔ never a refusal).
  if (error instanceof ApiError && error.code.endsWith('.death_certificate_acceptance_required')) {
    return trusteeDeathCertificateAcceptanceRequiredMessage(error);
  }
  if (error instanceof ApiError && error.code.endsWith('.nominee_determination_required')) {
    return trusteeDeterminationRequiredMessage(error);
  }
  // Story 6.19a (D14) — the claim waits for the family's contact details; the helpline can add them.
  if (error instanceof ApiError && error.code.endsWith('.claim_contact_required')) {
    return claimContactRequiredMessage(error);
  }
  // ⭐ Story 6.23b (EA5, EA2) — the warning reason on an approve vote, the votes to revise, and the WAIT, in words.
  const warningWords = laterApprovalWarningErrorMessage(error, 'r9');
  if (warningWords !== undefined) return warningWords;
  return apiErrorMessage(error);
}
import { NomineeNameCheckDisclosure } from '../claim-verification/NomineeNameCheckDisclosure.js';
import { nameDifferenceReasonLabel, verifierConsoleEn as t } from '../claim-verification/i18n-en.js';
import {
  useCancelR9Session,
  useCastR9Vote,
  useFinalizeR9,
  useOpenR9Session,
  useR9Panel,
  useRequestStepUp,
  useSession,
  useVerifyStepUp,
} from '../../api/hooks.js';

/** Must match the server's requireStepUp arg on the finalize route. */
const FINALIZE_STEP_UP_CONTEXT = 'r9_finalize';

/** A loose (case-insensitive) UUID-shape check — a client-side nicety mirroring the contract's
 *  `z.string().uuid()` on `panel_actor_ids`; the server remains the authoritative validator. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface R9CasePanelProps {
  pariwarId: string;
  claimCaseId: string;
}

export function R9CasePanel({ pariwarId, claimCaseId }: R9CasePanelProps): ReactElement {
  // Story 6.18 (AC2) — the names disclosure, fetched only when opened.
  const panel = useR9Panel(pariwarId, claimCaseId);
  const session = useSession();
  const open = useOpenR9Session(pariwarId, claimCaseId);
  const vote = useCastR9Vote(pariwarId, claimCaseId);
  const finalize = useFinalizeR9(pariwarId, claimCaseId);
  const cancel = useCancelR9Session(pariwarId, claimCaseId);
  const requestStepUp = useRequestStepUp();
  const verifyStepUp = useVerifyStepUp();

  // Open form state.
  const [clauseId, setClauseId] = useState<string>(R9_VOTING_CLAUSE_IDS[0]);
  const [rosterText, setRosterText] = useState('');
  // Vote form state.
  const [voteChoice, setVoteChoice] = useState<'approve' | 'deny'>('approve');
  const [rationale, setRationale] = useState('');
  // ⭐ Story 6.23b (EA5) — the warning reason on an APPROVE vote. ⛔ No default; a pick that left the list reads as none.
  const [warningPick, setWarningPick] = useState('');
  const [voteValidation, setVoteValidation] = useState<string | null>(null);
  // Cancel form state.
  const [cancelReason, setCancelReason] = useState('');
  const [cancelRationale, setCancelRationale] = useState('');
  const [cancelArmed, setCancelArmed] = useState(false);
  // Finalize step-up state.
  const [stepUpRequired, setStepUpRequired] = useState(false);
  const [otp, setOtp] = useState('');

  if (panel.isLoading) return <p role="status">Loading panel…</p>;
  if (panel.isError) return <p role="alert" className="text-status-fail-fg">{errorMessage(panel.error)}</p>;
  // Guarded explicitly (not `!`-asserted) so an unexpected react-query state surfaces as a controlled
  // message rather than a crashed render — the same discipline the `!model.tally` guard below already uses.
  if (!panel.data) return <p role="alert" className="text-status-fail-fg">Panel data unavailable — reload.</p>;
  const model = panel.data;

  const caseHeader = (
    <p className="text-xs opacity-60">
      Claim <code>{model.claim_case_id}</code> · deceased member <code>{model.deceased_member_id}</code> ·
      state <strong>{model.current_state}</strong>
    </p>
  );

  // ── Story 6.18 (AC2/AC8) — the nominee NAME CHECK, behind a disclosure ────────────────────────
  // ⭐ R9 IS ITS OWN PATH TO APPROVAL. `finalizeR9Outcome` reaches `state_trustee_approved` without
  // ever passing the District Admin's verification approval, so the panel that decides an R9 claim
  // must be able to see the same names — otherwise the only surface that can approve this claim is
  // the only one that cannot look at what it is approving.
  // ⛔ ON DEMAND, never on render: the read decrypts a LIVING nominee's Tier-1 name and writes an
  // audit line, so it must mean that somebody chose to look.
  //
  // ⭐ THE SHARED COMPONENT, ⛔ not a local copy (code review 2026-09-20). This block hand-rolled
  // the button, the `aria-label` and the error string as three English literals that bypassed the
  // copy table (`t.nameCheck.loadError` existed and was unused right beside it), and it carried a
  // dead no-op `onSubmit` plus a duplicate landmark — the wrapper `section` and the panel's own
  // `section` shared one `aria-label`. The Pariwar Admin's cycle-freeze card now renders the SAME
  // component, which is what makes D3 true on both voting surfaces.
  //
  // ⭐⭐ AC8 — THE HIGHLIGHT RIDES THIS PANEL'S OWN READ (code review 2026-09-22). The server has
  // carried `name_difference_reasons` on the R9 panel read since the 2026-09-20 review, and ⛔ nothing
  // rendered it: an R9 voter could learn that a difference had been accepted ONLY by opening the
  // disclosure below — decrypting a living nominee's Tier-1 name to see a non-PII reason code. The
  // codes arrive already filtered to the CURRENT, PASSING check (empty when stale or not passing).
  const nameSection = (
    <>
      {model.name_difference_reasons.length > 0 ? (
        <p
          data-testid="r9-name-difference-flag"
          className="mt-2 w-fit rounded bg-status-warn-bg px-2 py-0.5 text-xs text-status-warn-fg"
        >
          {t.nameCheck.approvedWithDifference}:{' '}
          {model.name_difference_reasons
            .map((r) => nameDifferenceReasonLabel(r))
            .join(', ')}
        </p>
      ) : null}
      <NomineeNameCheckDisclosure
        pariwarId={pariwarId}
        claimCaseId={claimCaseId}
        testId="r9-name-check-disclosure"
      />
    </>
  );

  const parseRoster = (): string[] =>
    rosterText
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  const roster = parseRoster();
  const rosterHasDuplicates = new Set(roster).size !== roster.length;
  const rosterHasBadShape = roster.some((id) => !UUID_RE.test(id));
  const rosterTooLarge = roster.length > R9_PANEL_MAX_MEMBERS;
  const rosterInvalid = roster.length === 0 || rosterHasDuplicates || rosterHasBadShape || rosterTooLarge;

  const runFinalize = (): void => {
    finalize.mutate(undefined, {
      onSuccess: () => {
        setStepUpRequired(false);
        setOtp('');
        requestStepUp.reset();
      },
      onError: (err) => {
        if (err instanceof ApiError && err.code === 'auth.step_up_required') setStepUpRequired(true);
        // Story 6.23b — a 409 means the votes or the warnings moved: refetch so the panel shows them as they stand.
        else if (err instanceof ApiError && err.status === 409) void panel.refetch();
      },
    });
  };
  const verifyThenFinalize = (): void => {
    const code = otp.trim();
    if (code === '') return;
    verifyStepUp.mutate(code, {
      onSuccess: () => {
        setStepUpRequired(false);
        setOtp('');
        requestStepUp.reset();
        runFinalize();
      },
    });
  };

  // ── No live session → the open form ──
  if (!model.session) {
    return (
      <section aria-label="Open R9 voting session" className="rounded border p-4">
        <h3 className="mb-2 text-sm font-semibold">No open session — open the panel</h3>
        {caseHeader}
        {nameSection}
        <p className="mb-2 mt-2 text-xs opacity-60">
          Select the applicable R9 sub-clause and designate the immutable panel roster (actor ids — each must
          hold the R9 vote permission, max {R9_PANEL_MAX_MEMBERS}). The roster cannot change after open; correcting
          it requires cancel + re-open.
        </p>
        <label className="mb-2 flex flex-col text-xs">
          <span className="opacity-70">Applicable R9 clause</span>
          <select className="rounded border px-2 py-1 text-sm" value={clauseId} onChange={(e) => setClauseId(e.target.value)}>
            {R9_VOTING_CLAUSE_IDS.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
        </label>
        <label className="mb-2 flex flex-col text-xs">
          <span className="opacity-70">Panel roster (actor ids — comma/space/newline separated)</span>
          <textarea
            className="rounded border px-2 py-1 font-mono text-xs"
            rows={3}
            value={rosterText}
            onChange={(e) => setRosterText(e.target.value)}
          />
        </label>
        {roster.length > 0 && (
          <p className="mb-2 text-xs text-status-warn-fg">
            {rosterHasDuplicates && <>Roster contains duplicate actor ids. </>}
            {rosterHasBadShape && <>Every actor id must be a UUID. </>}
            {rosterTooLarge && <>Roster exceeds the {R9_PANEL_MAX_MEMBERS}-member limit. </>}
          </p>
        )}
        <button
          type="button"
          className="rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
          disabled={open.isPending || rosterInvalid}
          onClick={() => open.mutate({ clause_id: clauseId, panel_actor_ids: roster })}
        >
          Open session
        </button>
        {errorMessage(open.error) && <p role="alert" className="mt-2 text-sm text-status-fail-fg">{errorMessage(open.error)}</p>}
      </section>
    );
  }

  const s = model.session;
  // The API always pairs a non-null session with a non-null tally (getPanel computes one whenever a
  // session is open). Guarded explicitly rather than `!`-asserted so a contract violation surfaces as a
  // controlled message, not a crashed render.
  if (!model.tally) {
    return <p role="alert" className="rounded border p-4 text-sm text-status-fail-fg">Panel data inconsistent — reload.</p>;
  }
  const tally = model.tally;
  const finalized = s.outcome !== null;
  // ⭐ Story 6.23b (EA5, EA7; RD11) — the warnings on THIS claim. An approve vote needs a warning reason while one shows
  // (its note is the rationale); FINALIZE to an approval is held — and SAYS why — while the claim waits for the District
  // Admin, while the warnings could ⛔ not be read, or while an approve vote does ⛔ not answer every current warning.
  const warnings = model.approval_warnings;
  const warningReasonCode = resolvedWarningReasonCode(model.reason_options, warningPick);
  const approveVoteWarned = approvalNeedsWarningReason(warnings);
  const votesToRevise = model.votes.filter((v) => v.covers_current_warnings === false).length;
  // Code review 2026-10-06 (P42): both blockers can hold at once (waiting for the District Admin AND carrying
  // unrevised votes) — join them rather than showing only the first, which would otherwise leave the second
  // discovered only after the user clears the one they were told about.
  const finalizeBlocked =
    tally.provisional_outcome !== 'approved'
      ? null
      : [approvalBlockedReason(warnings, 'r9'), votesToRevise > 0 ? t.approvalWarnings.errors.approveVotesNeedWarningReason(votesToRevise) : null]
          .filter((m): m is string => m !== null)
          .join(' ') || null;
  const submitVote = (): void => {
    setVoteValidation(null);
    if (voteChoice === 'approve' && !warnings.available) {
      setVoteValidation(t.approvalWarnings.unavailable);
      return;
    }
    if (voteChoice === 'approve' && approveVoteWarned && warningReasonCode === '') {
      setVoteValidation(t.approvalWarnings.reasonRequiredError);
      return;
    }
    vote.mutate(
      {
        vote: voteChoice,
        rationale: rationale.trim(),
        ...(voteChoice === 'approve' && approveVoteWarned ? { warning_reason_code: warningReasonCode } : {}),
      },
      {
        onSuccess: () => {
          setRationale('');
          setWarningPick('');
        },
        onError: (err) => {
          if (err instanceof ApiError && err.status === 409) void panel.refetch();
        },
      },
    );
  };
  const currentActorId = session.data?.userId;
  const onPanel = currentActorId !== undefined && s.panel.some((m) => m.actor_id === currentActorId);

  return (
    <section aria-label="R9 voting panel" className="flex flex-col gap-4 rounded border p-4">
      <header>
        <h3 className="text-sm font-semibold">
          R9 panel — <code>{s.rule_code}</code> ({s.voting_requirement})
        </h3>
        {caseHeader}
        <p className="text-xs opacity-60">
          Clause <code>{s.clause_id}</code> · rule version <code className="opacity-70">{s.clause_version_id}</code>
        </p>
        {/* Story 6.18 (AC2/AC8) — the names, on demand. R9 approves without the District Admin's
            verification approval, so this panel must be able to see them. */}
        {nameSection}
        <p className="text-xs opacity-60">
          Opened by {s.opened_display} · quorum {s.quorum_required} of {s.panel.length}
          {finalized && (
            <>
              {' '}· <strong>finalized: {s.outcome}</strong> by {s.finalized_display}
            </>
          )}
        </p>
      </header>

      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wide opacity-70">Panel roster</h4>
        <ul className="text-xs">
          {s.panel.map((m) => (
            <li key={m.actor_id}>
              {m.actor_display} <span className="opacity-50">({m.actor_id})</span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wide opacity-70">
          Votes — {tally.approve_count} approve / {tally.deny_count} deny ({tally.cast_votes}/{tally.panel_size} cast;
          would be <strong>{tally.provisional_outcome}</strong>{tally.quorum_met ? ', quorum met' : ', quorum NOT met'})
        </h4>
        {model.votes.length === 0 ? (
          <p className="text-xs opacity-60">No votes cast yet.</p>
        ) : (
          <ul className="flex flex-col gap-1 text-xs">
            {model.votes.map((v) => (
              <li key={v.vote_id} className="rounded border p-2">
                <strong>{v.vote}</strong> — {v.voter_display} <span className="opacity-50">({new Date(v.cast_at).toLocaleString()})</span>
                <div className="opacity-70">{v.rationale}</div>
                {/* ⭐ Story 6.23b (RD11) — the SAME answer finalize would give, BEFORE the step-up. */}
                {v.covers_current_warnings === false ? (
                  // Code review 2026-10-06 (P35): every sibling dynamically-appearing message in this diff uses
                  // `role="status"`; this one didn't, so a screen-reader user got no announcement when a vote
                  // flipped to "needs revision".
                  <p role="status" className="mt-1 font-medium text-status-warn-fg" data-testid={`r9-vote-must-revise-${v.vote_id}`}>
                    {t.approvalWarnings.later.voteMustBeRevised}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      {!finalized && (
        <>
          <div className="rounded border border-dashed p-3">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide opacity-70">Cast / revise your vote</h4>
            {!onPanel ? (
              <p className="text-xs opacity-60">You are not a member of this panel — voting is restricted to the roster above.</p>
            ) : (
              <>
                <fieldset className="mb-2 flex gap-3 text-sm">
                  <legend className="sr-only">Vote choice</legend>
                  <label className="flex items-center gap-1">
                    {/* Code review 2026-10-06 (P44): clear a stale approve-only validation (e.g. "warnings
                        unavailable") — it is not gated behind `voteChoice === 'approve'` below, so it would
                        otherwise keep showing while submitting an unrelated deny vote. */}
                    <input
                      type="radio"
                      name="vote"
                      checked={voteChoice === 'approve'}
                      onChange={() => {
                        setVoteChoice('approve');
                        setVoteValidation(null);
                      }}
                    />{' '}
                    Approve
                  </label>
                  <label className="flex items-center gap-1">
                    <input
                      type="radio"
                      name="vote"
                      checked={voteChoice === 'deny'}
                      onChange={() => {
                        setVoteChoice('deny');
                        setVoteValidation(null);
                      }}
                    />{' '}
                    Deny
                  </label>
                </fieldset>
                {/* ⭐ Story 6.23b (EA5) — an APPROVE vote while a warning shows: the lines and 6.23a's picker; a deny vote
                    is ⛔ never gated. The WAIT holds Finalize, ⛔ the vote — said beside Finalize. */}
                {voteChoice === 'approve' ? (
                  <div className="mb-2">
                    <LaterApprovalWarnings
                      summary={warnings}
                      options={model.reason_options}
                      value={warningReasonCode}
                      onChange={(code) => {
                        setWarningPick(code);
                        setVoteValidation(null);
                      }}
                      error={voteValidation === t.approvalWarnings.reasonRequiredError ? voteValidation : null}
                      disabled={vote.isPending}
                      idPrefix={`r9-${claimCaseId}`}
                      surface="r9"
                      waitBlocksHere={false}
                    />
                  </div>
                ) : null}
                <textarea
                  className="mb-2 w-full rounded border px-2 py-1 text-sm"
                  rows={2}
                  placeholder="Rationale (required, ≤500 chars)"
                  maxLength={500}
                  value={rationale}
                  onChange={(e) => setRationale(e.target.value)}
                />
                <button
                  type="button"
                  data-testid="r9-submit-vote"
                  className="rounded bg-black px-3 py-1 text-sm text-white disabled:opacity-50"
                  disabled={vote.isPending || rationale.trim() === ''}
                  onClick={submitVote}
                >
                  Submit vote
                </button>
                {voteValidation !== null && voteValidation !== t.approvalWarnings.reasonRequiredError ? (
                  <p role="alert" className="mt-1 text-xs text-status-fail-fg" data-testid="r9-vote-validation">
                    {voteValidation}
                  </p>
                ) : null}
                {errorMessage(vote.error) && <p role="alert" className="mt-1 text-xs text-status-fail-fg">{errorMessage(vote.error)}</p>}
              </>
            )}
          </div>

          <div className="rounded border border-dashed p-3">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide opacity-70">Finalize outcome (step-up)</h4>
            {!onPanel ? (
              <p className="text-xs opacity-60">You are not a member of this panel — finalizing is restricted to the roster above.</p>
            ) : (
              <>
                <p className="mb-2 text-xs opacity-60">
                  Finalizing is a separate, step-up-attested action. It requires quorum and commits the panel
                  outcome ({tally.provisional_outcome} on the current votes).
                </p>
                {/* ⭐ Story 6.23b — why an approving finalize is held, BEFORE the step-up (⛔ a 409 behind a code entry). */}
                {finalizeBlocked !== null ? (
                  <p id={`r9-${claimCaseId}-finalize-blocked`} role="status" className="mb-2 text-xs font-medium" data-testid="r9-finalize-blocked">
                    {finalizeBlocked}
                  </p>
                ) : null}
                <button
                  type="button"
                  data-testid="r9-finalize"
                  className="rounded bg-black px-3 py-1 text-sm text-white disabled:opacity-50"
                  disabled={finalize.isPending || !tally.quorum_met || finalizeBlocked !== null}
                  aria-describedby={finalizeBlocked !== null ? `r9-${claimCaseId}-finalize-blocked` : undefined}
                  onClick={runFinalize}
                >
                  Finalize
                </button>
                {stepUpRequired && (
                  <div className="mt-3 flex flex-col gap-2 rounded border border-dashed p-3">
                    <p className="text-sm">This action requires step-up verification.</p>
                    <button
                      type="button"
                      className="w-fit rounded border px-3 py-1 text-sm disabled:opacity-50"
                      disabled={requestStepUp.isPending}
                      onClick={() => requestStepUp.mutate(FINALIZE_STEP_UP_CONTEXT)}
                    >
                      Send verification code
                    </button>
                    {requestStepUp.isSuccess && (
                      <div className="flex items-end gap-2">
                        <label className="flex flex-col text-xs">
                          <span className="opacity-70">Enter code</span>
                          <input className="rounded border px-2 py-1 text-sm" value={otp} onChange={(e) => setOtp(e.target.value)} />
                        </label>
                        <button
                          type="button"
                          className="rounded bg-black px-3 py-1 text-sm text-white disabled:opacity-50"
                          disabled={verifyStepUp.isPending || otp.trim() === ''}
                          onClick={verifyThenFinalize}
                        >
                          Verify &amp; finalize
                        </button>
                      </div>
                    )}
                    {errorMessage(verifyStepUp.error) && <p role="alert" className="text-xs text-status-fail-fg">{errorMessage(verifyStepUp.error)}</p>}
                  </div>
                )}
                {finalize.isError && !(finalize.error instanceof ApiError && finalize.error.code === 'auth.step_up_required') && (
                  <p role="alert" className="mt-1 text-xs text-status-fail-fg">{errorMessage(finalize.error)}</p>
                )}
              </>
            )}
          </div>

          <div className="rounded border border-dashed p-3">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide opacity-70">Cancel / correct session</h4>
            {!onPanel ? (
              <p className="text-xs opacity-60">You are not a member of this panel — cancelling is restricted to the roster above.</p>
            ) : (
              <>
                <p className="mb-2 text-xs opacity-60">
                  Cancels this session (and its votes) so a corrected clause/panel can be re-opened. The claim stays queued.
                </p>
                <input
                  className="mb-1 w-full rounded border px-2 py-1 text-sm"
                  placeholder="Reason code (required)"
                  maxLength={64}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                />
                <textarea
                  className="mb-2 w-full rounded border px-2 py-1 text-sm"
                  rows={2}
                  placeholder="Rationale (required)"
                  maxLength={500}
                  value={cancelRationale}
                  onChange={(e) => setCancelRationale(e.target.value)}
                />
                {!cancelArmed ? (
                  <button
                    type="button"
                    className="rounded border px-3 py-1 text-sm disabled:opacity-50"
                    disabled={cancelReason.trim() === '' || cancelRationale.trim() === ''}
                    onClick={() => setCancelArmed(true)}
                  >
                    Cancel session
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-status-warn-fg">Cancel this session and all its votes?</p>
                    <button
                      type="button"
                      className="rounded border px-3 py-1 text-sm disabled:opacity-50"
                      disabled={cancel.isPending}
                      onClick={() => setCancelArmed(false)}
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      className="rounded bg-status-fail-bg px-3 py-1 text-sm text-status-fail-fg disabled:opacity-50"
                      disabled={cancel.isPending}
                      onClick={() =>
                        cancel.mutate(
                          { reason_code: cancelReason.trim(), rationale: cancelRationale.trim() },
                          { onSuccess: () => setCancelArmed(false) },
                        )
                      }
                    >
                      Confirm cancel
                    </button>
                  </div>
                )}
                {errorMessage(cancel.error) && <p role="alert" className="mt-1 text-xs text-status-fail-fg">{errorMessage(cancel.error)}</p>}
              </>
            )}
          </div>
        </>
      )}
    </section>
  );
}
