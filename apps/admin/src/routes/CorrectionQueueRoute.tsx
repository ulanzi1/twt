// The District Admin's CORRECTION QUEUE — Story 6.18 (AC11, `2026-09-20-227` cl.10).
//
// ⭐⭐ WHY THIS PAGE EXISTS, stated plainly because the story shipped once without it. cl.10 makes
// the Pariwar Admin RETURN a claim to the District Admin with a note, and asks the District Admin to
// *"contact claimant regarding discrepancy and get it corrected"*. A return does ⛔ NOT move the
// claim's state — it sits in `verifier_approved` / `reversed` / `state_trustee_freeze` looking
// exactly like every other claim in those states. And there was no District Admin list of any kind
// in this app: the only claim route is the per-claim verification console, reachable only if you
// already know the claim id. So the person the Pariwar Admin sent the claim TO had no way to
// discover it, and the return loop `-227` ratified was, end to end, unusable (code review
// 2026-09-20, D4 = option A: build it here).
//
// ⛔⛔ NO NEW PERMISSION KEY (AC1). It reads on `claim.view_nominee_name_check`, which the District
// Admin already holds — the same key that gates seeing the two names. AC11's "⛔ no new route, ⛔ no
// new key" governs the RESUBMISSION, and the resubmission stays DERIVED: there is ⛔ no Re-submit
// button anywhere on this page, because recording a fresh passing name check IS the resubmission.
// The row simply disappears from the queue when that happens.
//
// ⛔ NO NAMES. The queue carries ids, dates, states and the Pariwar Admin's note. The holder name
// and the nominee name live behind the per-claim read, decrypted ONE CLAIM AT A TIME when a District
// Admin opens that claim — ⛔ never across a list (Trap 4).

import { useNavigate, useParams } from '@tanstack/react-router';
import type { ReactElement } from 'react';
import { useEffect } from 'react';

import { ApiError } from '../api/client.js';
import { useClaimsUnderCorrection, useSession } from '../api/hooks.js';
import { verifierConsoleEn as t } from '../modules/claim-verification/i18n-en.js';

/**
 * ⭐ THE SESSION GATE every sibling route has (code review 2026-09-23b) — this was the only file in
 * `routes/` without `useSession`, so an expired session read *"The list could not be loaded"* with
 * ⛔ no way back to sign in, and a 403 looked like an outage. The queue itself is fetched only once
 * the session is known (`CorrectionQueueView`).
 */
export function CorrectionQueueRoute(): ReactElement {
  const session = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (session.isError) void navigate({ to: '/login' });
  }, [session.isError, navigate]);

  if (session.isLoading) return <p role="status">Checking your session…</p>;
  if (session.isError) return <p role="status">Redirecting to sign in…</p>;
  return <CorrectionQueueView />;
}

function CorrectionQueueView(): ReactElement {
  const { pariwarId } = useParams({ from: '/p/$pariwarId/claims/under-correction' });
  const navigate = useNavigate();
  const queue = useClaimsUnderCorrection(pariwarId);
  // ⭐ THE QUEUE'S OWN 401/403 (code review 2026-09-23c — the other half of the 09-23b bullet). The
  // session gate above only sees the SESSION read: a queue 401 while that read is still cached never
  // redirected, and a 403 rendered as "could not be loaded" — an outage, which it is ⛔ not.
  const queueStatus = queue.error instanceof ApiError ? queue.error.status : null;
  useEffect(() => {
    if (queueStatus === 401) void navigate({ to: '/login' });
  }, [queueStatus, navigate]);

  return (
    <main className="mx-auto max-w-4xl p-4">
      <h1 className="text-lg font-semibold">{t.correctionQueue.heading}</h1>
      <p className="mt-1 text-sm text-slate-600">{t.correctionQueue.intro}</p>

      {queue.isLoading ? (
        <p role="status" data-testid="correction-queue-loading" className="mt-4 text-sm">
          {t.correctionQueue.loading}
        </p>
      ) : queueStatus === 403 ? (
        <p role="alert" data-testid="correction-queue-forbidden" className="mt-4 text-sm">
          {t.correctionQueue.forbidden}
        </p>
      ) : queue.isError ? (
        <p role="alert" data-testid="correction-queue-error" className="mt-4 text-sm">
          {t.correctionQueue.loadError}
        </p>
      ) : (queue.data?.items.length ?? 0) === 0 ? (
        // ⭐ An EMPTY queue is good news and says so. A bare blank panel reads as a failed load —
        // and on a page whose whole job is "is anything waiting for me?", ambiguity is the one
        // thing it must not have.
        <p role="status" data-testid="correction-queue-empty" className="mt-4 text-sm text-slate-700">
          {t.correctionQueue.empty}
        </p>
      ) : (
        <ul className="mt-4 space-y-3" data-testid="correction-queue">
          {queue.data?.items.map((item) => (
            <li
              key={item.claim_case_id}
              data-testid={`correction-queue-item-${item.claim_case_id}`}
              className="rounded border p-3 text-sm"
            >
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <code className="font-mono text-xs opacity-80">{item.claim_case_id}</code>
                <span className="rounded bg-black/5 px-1.5 py-0.5 text-xs">{item.claim_state}</span>
                {/* ⛔ "returned", ⛔ never "rejected" or "denied": `-226` cl.6 and `-227` cl.10 both
                    make this NOT a denial, and this is the surface where that distinction survives
                    or dies. */}
                {item.returned_at !== null ? (
                  <span
                    data-testid="queue-badge-returned"
                    className="rounded bg-status-warn-bg px-1.5 py-0.5 text-xs text-status-warn-fg"
                  >
                    {t.correctionQueue.badgeReturned}
                  </span>
                ) : null}
                {/* ⭐ The District Admin's OWN half of "under correction" — they recorded that a
                    name does not match. Distinguished from a Pariwar Admin return because the two
                    call for different next steps. */}
                {item.sent_back_by_check ? (
                  <span
                    data-testid="queue-badge-check"
                    className="rounded bg-status-warn-bg px-1.5 py-0.5 text-xs text-status-warn-fg"
                  >
                    {t.correctionQueue.badgeSentBackByCheck}
                  </span>
                ) : null}
                {!item.accounts_complete ? (
                  <span
                    data-testid="queue-badge-accounts"
                    className="rounded bg-black/5 px-1.5 py-0.5 text-xs"
                  >
                    {t.correctionQueue.badgeAccountsMissing}
                  </span>
                ) : null}
              </div>

              {item.returned_at !== null ? (
                <dl className="mt-2 grid grid-cols-[auto,1fr] gap-x-3 gap-y-0.5 text-xs">
                  <dt className="opacity-70">{t.correctionQueue.returnedBy}</dt>
                  <dd>
                    {item.returned_by_actor_display ?? '—'} · {item.returned_at}
                  </dd>
                  <dt className="opacity-70">{t.correctionQueue.note}</dt>
                  <dd data-testid="queue-return-note">
                    {/* ⚠ The note's three states are never collapsed into a blank: a decrypt
                        failure must not read as "they gave no reason". */}
                    {item.return_note === null
                      ? '—'
                      : item.return_note.state === 'readable'
                        ? item.return_note.value
                        : t.nameCheck.unreadable}
                  </dd>
                </dl>
              ) : null}

              {/* ⭐ The only action is OPEN THE CLAIM. ⛔ There is deliberately no "Re-submit"
                  button: the resubmission is DERIVED (AC11) — the District Admin records a fresh
                  passing name check on the claim itself, and the row leaves this queue. A button
                  here would either be a no-op or a second, undeclared write path. */}
              <button
                type="button"
                data-testid={`queue-open-${item.claim_case_id}`}
                className="mt-2 rounded border px-3 py-1 text-sm"
                onClick={() =>
                  void navigate({
                    to: '/p/$pariwarId/claims/$claimCaseId/verify',
                    params: { pariwarId, claimCaseId: item.claim_case_id },
                  })
                }
              >
                {t.correctionQueue.open}
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
