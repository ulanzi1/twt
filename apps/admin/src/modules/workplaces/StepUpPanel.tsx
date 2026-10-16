// The step-up prompt the workplace pages share (Story 6.36c) — the `ApprovalWarningReasonsPage` block, extracted for two
// callers in ONE module: a write answered 403 `auth.step_up_required` holds its retry; the admin sends a code, verifies,
// and the held write runs. The step-up context comes from `@twt/contracts` (⛔ hard-coded).

import { useState, type ReactElement } from 'react';

import { ApiError } from '../../api/client.js';
import { useRequestStepUp, useVerifyStepUp } from '../../api/hooks.js';
import { stepUpEn as t } from './i18n-en.js';

/** A held write, re-run after the step-up verifies. `null` ⇒ nothing is waiting. */
export type PendingWrite = (() => void) | null;

/** `true` when `err` asks for a step-up — the signal to hold the write, ⛔ an error to show. */
export const needsStepUp = (err: unknown): boolean => err instanceof ApiError && err.code === 'auth.step_up_required';

export function StepUpPanel({ context, pending, onDone, testId }: { context: string; pending: PendingWrite; onDone: () => void; testId: string }): ReactElement | null {
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
                  pending();
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
        <p role="alert" className="text-xs text-status-fail-fg">
          {verifyStepUp.error instanceof ApiError && verifyStepUp.error.status >= 400 && verifyStepUp.error.status < 500 ? t.verifyError : t.verifyUnavailable}
        </p>
      ) : null}
    </div>
  );
}
