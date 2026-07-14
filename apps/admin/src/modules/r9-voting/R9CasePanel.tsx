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

import { ApiError, errorMessage } from '../../api/client.js';
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
                    <input type="radio" name="vote" checked={voteChoice === 'approve'} onChange={() => setVoteChoice('approve')} /> Approve
                  </label>
                  <label className="flex items-center gap-1">
                    <input type="radio" name="vote" checked={voteChoice === 'deny'} onChange={() => setVoteChoice('deny')} /> Deny
                  </label>
                </fieldset>
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
                  className="rounded bg-black px-3 py-1 text-sm text-white disabled:opacity-50"
                  disabled={vote.isPending || rationale.trim() === ''}
                  onClick={() => vote.mutate({ vote: voteChoice, rationale: rationale.trim() }, { onSuccess: () => setRationale('') })}
                >
                  Submit vote
                </button>
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
                <button
                  type="button"
                  className="rounded bg-black px-3 py-1 text-sm text-white disabled:opacity-50"
                  disabled={finalize.isPending || !tally.quorum_met}
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
