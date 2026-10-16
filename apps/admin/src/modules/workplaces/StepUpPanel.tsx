// The step-up prompt the workplace pages share (Story 6.36c) — the `ApprovalWarningReasonsPage` block, extracted for two
// callers in ONE module: a write answered 403 `auth.step_up_required` holds its retry; the admin sends a code, verifies,
// and the held write runs. The step-up context comes from `@twt/contracts` (⛔ hard-coded).
//
// ⭐ The hold discipline (code review round 2 — `ApprovalWarningReasonsPage`'s `clearStepUp`, AC8): a held retry is a
// closure over what the admin ASKED for, and some of these writes have ⛔ admin undo (a suggestion — W4). So the panel has
// its own Cancel and names the write it holds (`label`); every gesture that CHANGES what the retry would send or backs
// out of it (an edit of the form it came from, a Cancel, a tab switch, the queue's district filter) clears it — ⛔ paging
// or a list filter, which change neither (the code the admin was sent stays usable); every other write control is
// disabled meanwhile; and the caller keys the panel by `holdKey(pending)`.
// ⭐ The SAME gestures made while the write is still IN FLIGHT (⛔ hold yet) count too: they bump an edit GENERATION
// (`useHoldGenerations`), the click captured the generation it was made at, and a 403 that lands after it moved raises
// ⛔ panel — the refused write wrote nothing, and a verify would have sent the body the admin had already changed.

import { useRef, useState, type ReactElement } from 'react';

import { ApiError } from '../../api/client.js';
import { useRequestStepUp, useVerifyStepUp } from '../../api/hooks.js';
import { stepUpEn as t } from './i18n-en.js';

/**
 * A held write, re-run after the step-up verifies. `owner` names which control's retry this is (e.g. `'add'` |
 * `'rename'` | `'toggle'`), so a DIFFERENT control's edit can clear its OWN pending retry without discarding this
 * one (code review — a cross-control edit used to clear ANY held retry). `null` ⇒ nothing is waiting.
 */
export interface PendingStepUp<Owner extends string = string> {
  owner: Owner;
  /** WHICH row the held write is for (a rename's workplace, a suggestion's request) — `undefined` for the add form. */
  target?: string;
  /** Unique per hold (code review round 2) — the panel's `key`, so two holds by the same owner never share a code. */
  id: number;
  /** WHAT is held, in the admin's words (e.g. `delist “DEO OFFICE”`) — the panel names it (code review round 2). */
  label: string;
  retry: () => void;
}
export type PendingWrite<Owner extends string = string> = PendingStepUp<Owner> | null;

/**
 * The panel's React `key` — the owner AND the hold (code review round 2). ⚠ Through today's UI it is defence-in-depth:
 * a hold is only ever replaced after `pending` went `null` (Cancel / a clearing gesture / a verify), which unmounts the
 * panel anyway; the key matters only if a hold were ever REPLACED in place.
 */
export const holdKey = (p: PendingStepUp): string => `${p.owner}:${p.target ?? ''}:${p.id}`;

/**
 * A `setPending` updater that takes a NEW hold only when nothing is held (code review round 2): a second hold used to
 * silently replace the first, whose OTP the admin may already have been typing. ⚠ Defence-in-depth, ⛔ reachable through
 * the UI: every write control is disabled while a write is in flight or a retry is held, so two holds can't overlap.
 */
export const holdOnce =
  <Owner extends string>(next: PendingStepUp<Owner>) =>
  (current: PendingWrite<Owner>): PendingWrite<Owner> =>
    current ?? next;

/**
 * The edit generations of a page's held-or-in-flight writes (code review round 2). `snapshot(owner, target)` is taken at
 * the CLICK; `bump(owner, target)` is called by every gesture that changes that control's payload or backs out of it,
 * and `bumpAll()` by a page-wide one (a tab switch); `isCurrent(snap)` is checked when a 403 lands, before holding.
 */
/** A control's edit generation at the moment of a click. */
export interface HoldSnapshot {
  key: string;
  all: number;
  own: number;
}

export interface HoldGenerations {
  snapshot: (owner: string, target?: string) => HoldSnapshot;
  bump: (owner: string, target?: string) => void;
  bumpAll: () => void;
  isCurrent: (snap: HoldSnapshot) => boolean;
}

export function useHoldGenerations(): HoldGenerations {
  const all = useRef(0);
  const own = useRef(new Map<string, number>());
  const keyOf = (owner: string, target?: string): string => `${owner}:${target ?? ''}`;
  return {
    snapshot: (owner, target) => {
      const key = keyOf(owner, target);
      return { key, all: all.current, own: own.current.get(key) ?? 0 };
    },
    bump: (owner, target) => {
      const key = keyOf(owner, target);
      own.current.set(key, (own.current.get(key) ?? 0) + 1);
    },
    bumpAll: () => {
      all.current += 1;
    },
    isCurrent: (snap) => snap.all === all.current && snap.own === (own.current.get(snap.key) ?? 0),
  };
}

/** `true` when `err` asks for a step-up — the signal to hold the write, ⛔ an error to show. */
export const needsStepUp = (err: unknown): boolean => err instanceof ApiError && err.code === 'auth.step_up_required';

/**
 * The caller renders this ONLY while `pending` is non-null (code review — the panel used to stay mounted and
 * return `null` internally, which let its OTP text and its `requestStepUp`/`verifyStepUp` mutation state survive a
 * `pending` reset: the NEXT held retry reopened the panel already showing a stale code or a stale send/verify
 * outcome from the PREVIOUS one). Unmounting it between retries resets all of that for free.
 */
export function StepUpPanel({
  context,
  pending,
  onDone,
  onCancel,
  testId,
}: {
  context: string;
  pending: PendingWrite;
  onDone: () => void;
  /** Abandon the held write (code review round 2) — the caller clears `pending`, which unmounts this panel. */
  onCancel: () => void;
  testId: string;
}): ReactElement | null {
  const requestStepUp = useRequestStepUp();
  const verifyStepUp = useVerifyStepUp();
  const [otp, setOtp] = useState('');
  if (pending === null) return null;
  return (
    <div className="flex flex-col gap-2 rounded border border-dashed p-3" data-testid={testId}>
      {/* `role="alert"` — this block MOUNTS in answer to the 403 (family 13(d)). */}
      <p className="text-sm" role="alert">
        {t.intro}
      </p>
      {/* WHICH write is waiting (code review round 2) — paging and the list filters keep the hold, so the admin can
          always see what a verify will send. */}
      <p className="text-sm font-medium" data-testid={`${testId}-held`}>
        {t.waiting(pending.label)}
      </p>
      <button type="button" className="w-fit rounded border px-3 py-1 text-sm disabled:opacity-50" disabled={requestStepUp.isPending} onClick={() => requestStepUp.mutate(context)}>
        {t.send}
      </button>
      {requestStepUp.isError ? (
        <p role="alert" className="text-xs text-status-fail-fg">
          {requestStepUp.error instanceof ApiError && requestStepUp.error.status === 429 ? t.sendRateLimited : t.sendError}
        </p>
      ) : null}
      {requestStepUp.isSuccess ? (
        <div className="flex items-end gap-2">
          <label className="flex flex-col text-xs">
            {t.code}
            <input className="rounded border px-2 py-1 text-sm" value={otp} onChange={(e) => setOtp(e.target.value)} data-testid={`${testId}-code`} />
          </label>
          <button
            type="button"
            className="rounded bg-black px-3 py-1 text-sm text-white disabled:opacity-50"
            disabled={verifyStepUp.isPending || otp.trim() === ''}
            onClick={() =>
              verifyStepUp.mutate(otp.trim(), {
                onSuccess: () => {
                  setOtp('');
                  requestStepUp.reset();
                  onDone();
                  pending.retry();
                },
              })
            }
            data-testid={`${testId}-verify`}
          >
            {t.verify}
          </button>
        </div>
      ) : null}
      {verifyStepUp.isError ? (
        <p role="alert" className="text-xs text-status-fail-fg" data-testid={`${testId}-verify-error`}>
          {/* A 429 is "too many tries", ⛔ "not accepted" (code review round 2); "not accepted" only for a 4xx that JUDGED
              the code; an outage or a dropped request is "could not be checked". */}
          {verifyStepUp.error instanceof ApiError && verifyStepUp.error.status === 429
            ? t.verifyRateLimited
            : verifyStepUp.error instanceof ApiError && verifyStepUp.error.status >= 400 && verifyStepUp.error.status < 500
              ? t.verifyError
              : t.verifyUnavailable}
        </p>
      ) : null}
      {/* ⛔ An in-flight verify's `onSuccess` is a per-call callback: unmounting the panel (which Cancel does) detaches it,
          so a verify still in flight when Cancel is pressed ⛔ runs the held write. */}
      <button type="button" className="w-fit text-xs underline" onClick={onCancel} data-testid={`${testId}-cancel`}>
        {t.cancel}
      </button>
    </div>
  );
}
