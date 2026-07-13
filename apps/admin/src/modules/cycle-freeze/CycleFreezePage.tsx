// State-Trustee cycle-freeze page — Story 6.13 (Task 7; AC1/AC5). The [SURFACE] demoable.
//
// The bulk-approval shell: the two-bucket pending list (ready-to-freeze + escalated) with per-case
// provenance rows + decision controls, and the single step-up-gated COMMIT action (AC5). `pariwarId` is a
// prop (from the route) so the page is testable without a router (the DegradedModePage precedent). NO
// client-side grant gate — cycle.freeze is a per-Pariwar grant, so the REAL boundary is the server's
// requirePermissionHook + requireStepUp (a non-holder / un-elevated actor sees the API 403 surfaced here).

import type { ReactElement } from 'react';
import { useState } from 'react';

import { ApiError } from '../../api/client.js';
import {
  useCommitCycleFreeze,
  useCycleFreezePending,
  usePostCycleFreezeDecision,
  useRequestStepUp,
  useVerifyStepUp,
} from '../../api/hooks.js';
import { PendingCaseCard } from './PendingCaseCard.js';

export interface CycleFreezePageProps {
  pariwarId: string;
}

/** The step-up action context the commit route is gated on (must match the server's requireStepUp arg). */
const COMMIT_STEP_UP_CONTEXT = 'cycle_freeze_commit';

function errorMessage(error: unknown): string | undefined {
  if (!error) return undefined;
  if (error instanceof ApiError) return `${error.code}: ${error.message}`;
  return error instanceof Error ? error.message : 'Something went wrong.';
}

export function CycleFreezePage({ pariwarId }: CycleFreezePageProps): ReactElement {
  const pending = useCycleFreezePending(pariwarId);
  const decision = usePostCycleFreezeDecision(pariwarId);
  const commit = useCommitCycleFreeze(pariwarId);
  const requestStepUp = useRequestStepUp();
  const verifyStepUp = useVerifyStepUp();

  const [stepUpRequired, setStepUpRequired] = useState(false);
  const [otp, setOtp] = useState('');
  // A stable client-generated commit_id per commit attempt — the AC5 idempotency key that survives a
  // step-up round-trip + a network retry (regenerated only after a clean commit).
  const [commitId, setCommitId] = useState(() => crypto.randomUUID());

  const runCommit = (): void => {
    commit.mutate(
      { commit_id: commitId },
      {
        onSuccess: (data) => {
          setStepUpRequired(false);
          setOtp('');
          requestStepUp.reset();
          // Only mint a fresh key once the trigger has actually been delivered — if it hasn't, the SAME
          // commit_id must survive so the next "Commit" click retries delivery instead of silently
          // abandoning a stuck trigger (the redelivery mechanism depends on resubmitting this exact id).
          if (data.trigger_delivered) setCommitId(crypto.randomUUID());
        },
        onError: (err) => {
          // A step-up-required 403 is the SIGNAL to elevate — not a hard error (AC5). The SAME commit_id
          // is retried after elevation (idempotency-safe).
          if (err instanceof ApiError && err.code === 'auth.step_up_required') setStepUpRequired(true);
        },
      },
    );
  };

  const verify = (): void => {
    const code = otp.trim();
    if (code === '') return;
    verifyStepUp.mutate(code, {
      onSuccess: () => {
        setStepUpRequired(false);
        setOtp('');
        requestStepUp.reset();
        runCommit(); // re-submit the commit with the SAME commit_id now that the session is elevated
      },
    });
  };

  const data = pending.data;
  const readyCount = data?.ready_to_freeze.length ?? 0;
  const escalatedCount = data?.escalated.length ?? 0;
  const votedCount = data?.voted_pending_commit.length ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-lg font-semibold">Cycle freeze — State-Trustee bulk approval</h1>
        <p className="text-sm opacity-70">
          Review the verifier-approved and escalated claims pending the upcoming cycle, vote per claim, then
          commit the freeze — a single step-up-attested action that advances every approved claim and triggers
          the Epic-7 pool spawn.
        </p>
      </header>

      {pending.isLoading ? (
        <p role="status">Loading pending claims…</p>
      ) : pending.isError ? (
        <p role="alert" className="text-status-fail-fg">
          {errorMessage(pending.error)}
        </p>
      ) : (
        <>
          <section aria-label="Ready to freeze" className="rounded border p-4">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide opacity-70">
              Ready to freeze ({readyCount})
            </h2>
            {readyCount === 0 ? (
              <p className="text-sm opacity-60">No verifier-approved claims pending.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {data!.ready_to_freeze.map((c) => (
                  <PendingCaseCard
                    key={c.claim_case_id}
                    case_={c}
                    bucket="ready_to_freeze"
                    onDecision={(body) => decision.mutate(body)}
                    pending={decision.isPending}
                    error={errorMessage(decision.error)}
                  />
                ))}
              </ul>
            )}
          </section>

          <section aria-label="Escalated" className="rounded border p-4">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide opacity-70">
              Escalated — awaiting resolution ({escalatedCount})
            </h2>
            {escalatedCount === 0 ? (
              <p className="text-sm opacity-60">No escalated claims awaiting resolution.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {data!.escalated.map((c) => (
                  <PendingCaseCard
                    key={c.claim_case_id}
                    case_={c}
                    bucket="escalated"
                    onDecision={(body) => decision.mutate(body)}
                    pending={decision.isPending}
                    error={errorMessage(decision.error)}
                  />
                ))}
              </ul>
            )}
          </section>

          <section aria-label="Voted, pending commit" className="rounded border p-4">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide opacity-70">
              Voted — pending commit ({votedCount})
            </h2>
            <p className="mb-2 text-xs opacity-60">
              Already voted “approved” and will be advanced to <code>approved</code> by the next Commit — review
              before committing.
            </p>
            {votedCount === 0 ? (
              <p className="text-sm opacity-60">No claims voted and awaiting commit.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {data!.voted_pending_commit.map((c) => (
                  <PendingCaseCard
                    key={c.claim_case_id}
                    case_={c}
                    bucket="voted_pending_commit"
                    onDecision={(body) => decision.mutate(body)}
                    pending={decision.isPending}
                    error={errorMessage(decision.error)}
                  />
                ))}
              </ul>
            )}
          </section>

          <section aria-label="Commit cycle freeze" className="rounded border p-4">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide opacity-70">Commit</h2>
            <p className="mb-2 text-sm opacity-70">
              Commits every claim voted “approved” (excluding any routed to R9) — a step-up-attested action.
            </p>
            <button
              type="button"
              className="rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
              disabled={commit.isPending}
              onClick={runCommit}
            >
              Commit cycle freeze
            </button>

            {stepUpRequired && (
              <div className="mt-3 flex flex-col gap-2 rounded border border-dashed p-3">
                <p className="text-sm">This action requires step-up verification.</p>
                <button
                  type="button"
                  className="w-fit rounded border px-3 py-1 text-sm disabled:opacity-50"
                  disabled={requestStepUp.isPending}
                  onClick={() => requestStepUp.mutate(COMMIT_STEP_UP_CONTEXT)}
                >
                  Send verification code
                </button>
                {requestStepUp.isSuccess && (
                  <div className="flex items-end gap-2">
                    <label className="flex flex-col text-xs">
                      <span className="opacity-70">Enter code</span>
                      <input
                        className="rounded border px-2 py-1 text-sm"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                      />
                    </label>
                    <button
                      type="button"
                      className="rounded bg-black px-3 py-1 text-sm text-white disabled:opacity-50"
                      disabled={verifyStepUp.isPending || otp.trim() === ''}
                      onClick={verify}
                    >
                      Verify &amp; commit
                    </button>
                  </div>
                )}
                {errorMessage(verifyStepUp.error) && (
                  <p role="alert" className="text-xs text-status-fail-fg">
                    {errorMessage(verifyStepUp.error)}
                  </p>
                )}
              </div>
            )}

            {commit.isSuccess && commit.data && (
              <p role="status" className="mt-2 text-sm text-status-ok-fg">
                Committed {commit.data.committed_claim_ids.length} claim(s)
                {commit.data.trigger_delivered ? ' · pool-spawn trigger delivered' : ''}
                {commit.data.idempotent_replay ? ' · (idempotent replay)' : ''}.
              </p>
            )}
            {commit.isSuccess && commit.data && !commit.data.trigger_delivered && (
              <p role="status" className="mt-1 text-xs text-status-warn-fg">
                The freeze is committed and durable, but the pool-spawn trigger hasn’t delivered yet — click
                “Commit cycle freeze” again to retry delivery (safe: it will not re-approve any claim).
              </p>
            )}
            {commit.isError && !(commit.error instanceof ApiError && commit.error.code === 'auth.step_up_required') && (
              <p role="alert" className="mt-2 text-sm text-status-fail-fg">
                {errorMessage(commit.error)}
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
