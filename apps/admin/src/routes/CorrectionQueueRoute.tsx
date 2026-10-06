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

import { useNavigate, useParams, useSearch } from '@tanstack/react-router';
import type { ReactElement } from 'react';
import { useEffect, useRef } from 'react';

import { ApiError } from '../api/client.js';
import { useClaimsUnderCorrection, useSession } from '../api/hooks.js';
import { verifierConsoleEn as t } from '../modules/claim-verification/i18n-en.js';
import { CorrectionChasePanel, correctionChaseEn } from '../modules/correction-chase/index.js';
import { ClosureColumn } from '../modules/correction-closure/index.js';

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
  // ⭐ Story 6.19b (AC4, AC8b) — `?claim=<id>` scrolls to and highlights that row (a staff reminder names the queue;
  // the push itself cannot deep-link); `?escalated=true` is the Pariwar Admin's view of the chases escalated to them.
  const search = useSearch({ strict: false }) as { claim?: string; escalated?: boolean };
  const focusClaim = typeof search.claim === 'string' ? search.claim.toLowerCase() : null;
  const escalatedOnly = search.escalated === true;
  const queue = useClaimsUnderCorrection(pariwarId, { escalated: escalatedOnly });
  const focusedRef = useRef<HTMLLIElement | null>(null);
  // ⭐ Scroll/focus ONCE per distinct `?claim=` arrival, ⛔ not on every queue refetch — every mutation on this page
  // (a mark change, a letter, a delivery) invalidates and refetches the WHOLE queue, and re-running this on every
  // `queue.data` change would yank an admin working on a different row back to the highlighted one mid-task.
  const focusedForRef = useRef<string | null>(null);
  useEffect(() => {
    if (focusClaim === null || focusedForRef.current === focusClaim || focusedRef.current === null) return;
    focusedRef.current.scrollIntoView?.({ block: 'center' });
    focusedRef.current.focus?.();
    focusedForRef.current = focusClaim;
  }, [queue.data, focusClaim]);
  // ⭐ THE QUEUE'S OWN 401/403 (code review 2026-09-23c — the other half of the 09-23b bullet). The
  // session gate above only sees the SESSION read: a queue 401 while that read is still cached never
  // redirected, and a 403 rendered as "could not be loaded" — an outage, which it is ⛔ not.
  const queueStatus = queue.error instanceof ApiError ? queue.error.status : null;
  // ⭐ A FAILED REFETCH keeps the list (fifth-pass review 2026-10-01). TanStack keeps `data` and sets `isError` when a
  // refetch fails; branching on `isError` first replaced the whole list with "could not be loaded" — a save's
  // confirmation never showed (staff retried into `already_delivered` / `limit_reached`), and a window-focus refetch
  // wiped a revealed address and the typed fields with the forms that held them. The full error branch is for a page
  // with ⛔ no data; with data, a non-blocking banner says the list may be out of date.
  const hasData = queue.data !== undefined;
  // ⭐ A `?claim=` that is ⛔ not in the rendered list (filtered out, beyond the first page, already resubmitted)
  // SAYS so — it failed silently, and the reminder's reader was left looking for a row that is not there.
  const focusMissing =
    focusClaim !== null &&
    queue.data !== undefined &&
    !queue.data.items.some((item) => item.claim_case_id.toLowerCase() === focusClaim);
  useEffect(() => {
    if (queueStatus === 401) void navigate({ to: '/login' });
  }, [queueStatus, navigate]);

  return (
    <main className="mx-auto max-w-4xl p-4">
      <h1 className="text-lg font-semibold">{t.correctionQueue.heading}</h1>
      <p className="mt-1 text-sm text-slate-600">{t.correctionQueue.intro}</p>
      <label className="mt-2 flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          data-testid="correction-queue-escalated-only"
          checked={escalatedOnly}
          onChange={(e) =>
            void navigate({
              to: '/p/$pariwarId/claims/under-correction',
              params: { pariwarId },
              search: {
                ...(focusClaim !== null ? { claim: focusClaim } : {}),
                ...(e.target.checked ? { escalated: true } : {}),
              },
            } as never)
          }
        />
        {correctionChaseEn.queue.escalatedOnly}
      </label>
      {/* ⭐ PERSISTENT — mounted before the list arrives, so the line is ANNOUNCED when it appears (a live region that
          mounts already holding its text is ⛔ not). */}
      <p role="status" data-testid="queue-claim-status" className="text-xs">
        {focusMissing ? (
          <span className="mt-2 block" data-testid="queue-claim-not-shown">
            {correctionChaseEn.queue.claimNotShown}
          </span>
        ) : null}
      </p>

      {/* ⭐ Story 6.23b (EA10) — the late-warning arm could ⛔ not be read: the returned claims still list, and the page
          SAYS so (⛔ never "nothing waiting"); a candidate it could ⛔ not count lists as MAY wait (code review round 2).
          ⭐ PERSISTENT, as `queue-claim-status` above (family 13(d), code review round 2): the region is mounted before
          the data arrives and only its text changes — a `role="status"` that mounts holding its text is ⛔ not announced. */}
      <p role="status" data-testid="correction-queue-late-status" className="text-xs">
        {queue.data?.late_warnings_unavailable === true ? (
          <span className="mt-2 block" data-testid="correction-queue-late-unavailable">
            {t.correctionQueue.lateWarningsUnavailable}
          </span>
        ) : null}
      </p>

      {hasData && queue.isError ? (
        <p role="alert" data-testid="correction-queue-refetch-error" className="mt-2 text-xs">
          {queueStatus === 403 ? t.correctionQueue.forbidden : correctionChaseEn.queue.refetchError}
        </p>
      ) : null}

      {queue.isLoading ? (
        <p role="status" data-testid="correction-queue-loading" className="mt-4 text-sm">
          {t.correctionQueue.loading}
        </p>
      ) : !hasData && queueStatus === 403 ? (
        <p role="alert" data-testid="correction-queue-forbidden" className="mt-4 text-sm">
          {t.correctionQueue.forbidden}
        </p>
      ) : !hasData && queue.isError ? (
        <p role="alert" data-testid="correction-queue-error" className="mt-4 text-sm">
          {t.correctionQueue.loadError}
        </p>
      ) : (queue.data?.items.length ?? 0) === 0 ? (
        // ⭐ An EMPTY queue is good news and says so. A bare blank panel reads as a failed load —
        // and on a page whose whole job is "is anything waiting for me?", ambiguity is the one
        // thing it must not have. Code review round 2: shown with `late_warnings_unavailable` too — on that fault path
        // every late-warning CANDIDATE is kept (uncounted), so an empty list there IS empty (the banner above still says
        // the check could ⛔ not run).
        <p role="status" data-testid="correction-queue-empty" className="mt-4 text-sm text-slate-700">
          {t.correctionQueue.empty}
        </p>
      ) : (
        <ul className="mt-4 space-y-3" data-testid="correction-queue">
          {queue.data?.items.map((item) => (
            <li
              key={item.claim_case_id}
              data-testid={`correction-queue-item-${item.claim_case_id}`}
              ref={focusClaim === item.claim_case_id.toLowerCase() ? focusedRef : undefined}
              tabIndex={focusClaim === item.claim_case_id.toLowerCase() ? -1 : undefined}
              aria-current={focusClaim === item.claim_case_id.toLowerCase() ? 'true' : undefined}
              className={`rounded border p-3 text-sm ${focusClaim === item.claim_case_id.toLowerCase() ? 'ring-2 ring-status-warn-fg' : ''}`}
            >
              {focusClaim === item.claim_case_id.toLowerCase() ? (
                <p role="status" className="mb-1 text-xs" data-testid="queue-highlighted">
                  {correctionChaseEn.queue.highlighted}
                </p>
              ) : null}
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
                {/* ⭐ Story 6.23b (EA10) — the District Admin's approval waits on their late reason. */}
                {item.late_warning_awaiting_reason ? (
                  <span
                    data-testid="queue-badge-late-warning"
                    className="rounded bg-status-warn-bg px-1.5 py-0.5 text-xs text-status-warn-fg"
                  >
                    {item.late_warning_uncovered_count === null
                      ? t.correctionQueue.badgeLateWarningUncounted
                      : t.correctionQueue.badgeLateWarning}
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

              {item.late_warning_awaiting_reason ? (
                // Code review 2026-10-06 (P35): the sibling `correction-queue-late-unavailable` banner uses
                // `role="status"`; this per-item advisory text didn't.
                <p role="status" className="mt-2 text-xs" data-testid="queue-late-warning-line">
                  {t.correctionQueue.lateWarningLine(item.late_warning_uncovered_count)}
                </p>
              ) : null}

              {/* ⭐ Story 6.23b (EA10) — a LATE-WARNING-ONLY row has ⛔ no live return: ⛔ chase and ⛔ closure actions (its
                  chase summary is all nulls and a closure would refuse `no_live_return`). Its one action is opening the
                  claim, where the late reason is recorded. */}
              {item.late_warning_awaiting_reason && item.returned_at === null && !item.sent_back_by_check ? null : (
                <>
                  {/* ⭐ Story 6.19b (AC8b) — the correction chase: the reference, who must act, the run, the flags, each
                      person by role and their letters, and the letter form. */}
                  <CorrectionChasePanel pariwarId={pariwarId} item={item} />

                  {/* ⭐ Story 6.19c (AC8c) — the closure state, why a request would refuse now (plain words), the request
                      and "no correction needed". */}
                  <ClosureColumn pariwarId={pariwarId} item={item} />
                </>
              )}

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
