// `<ModerationSection>` — the moderation strip + history, wired to the server (Story 10.10, Task 8).
//
// The stateful shell around the presentational `<ModerationStrip>` / `<ModerationHistory>`: TanStack
// Query over the cookie-bearing `apiFetch`, plus the PER-ACTION step-up elevation flow.
//
// ── Step-up is per-ACTION, and that is the whole point (AC4) ────────────────────────────────────
// The server mints three DISTINCT elevation contexts (`member_moderation_{suspend|terminate|
// restore}`), so an elevation obtained for a restore can never be spent on a termination. The
// console therefore requests elevation for the action the operator actually attempted, and on
// success re-submits THAT action — it never carries an elevation forward to a different one.
//
// The console does NOT pre-elevate: a 403 `auth.step_up_required` from the attempted write is the
// SIGNAL to elevate (the Story 6.3 helpline-intake flow).

import type { ModerationAction } from '@twt/contracts';
import { useState, type ReactElement } from 'react';

import { ApiError } from '../../api/client.js';
import {
  useModerateMember,
  useModerationHistory,
  useModerationReasonCodes,
  useRequestStepUp,
  useVerifyStepUp,
} from '../../api/hooks.js';
import { moderationEn as t } from './i18n-en.js';
import { ModerationHistory, ModerationStrip, type ModerationSubmit } from './ModerationStrip.js';

/** The server's step-up action context per moderation action (must match `routes.ts` verbatim). */
const STEP_UP_CONTEXTS: Record<ModerationAction, string> = {
  suspend: 'member_moderation_suspend',
  terminate: 'member_moderation_terminate',
  restore: 'member_moderation_restore',
};

function messageOf(err: unknown): string | undefined {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return undefined;
}

export interface ModerationSectionProps {
  pariwarId: string;
  memberId: string;
}

export function ModerationSection({ pariwarId, memberId }: ModerationSectionProps): ReactElement {
  const history = useModerationHistory(pariwarId, memberId);
  const reasonCodes = useModerationReasonCodes(pariwarId);
  const moderate = useModerateMember(pariwarId, memberId);
  const requestStepUp = useRequestStepUp();
  const verifyStepUp = useVerifyStepUp();

  // The action whose elevation is being collected — NOT a bare boolean. Keeping the action here is
  // what makes the elevation per-action: on verify we re-submit exactly what was attempted.
  const [stepUpFor, setStepUpFor] = useState<{ action: ModerationAction; input: ModerationSubmit } | null>(
    null,
  );
  const [otp, setOtp] = useState('');

  const submit = async (input: ModerationSubmit): Promise<void> => {
    setStepUpFor(null);
    try {
      await moderate.mutateAsync({
        action: input.action,
        body: { reason_code: input.reasonCode, rationale: input.rationale },
      });
      setOtp('');
    } catch (err) {
      // A step-up-required 403 is the SIGNAL to elevate — not a hard error.
      if (err instanceof ApiError && err.code === 'auth.step_up_required') {
        setStepUpFor({ action: input.action, input });
        // Request the OTP for THIS action's context. A prior elevation for another action is
        // deliberately not reused — the server would reject it anyway.
        requestStepUp.mutate(STEP_UP_CONTEXTS[input.action]);
      }
      throw err;
    }
  };

  const verify = (): void => {
    const code = otp.trim();
    if (code === '' || stepUpFor === null) return;
    const retry = stepUpFor.input;
    verifyStepUp.mutate(code, {
      onSuccess: () => {
        setStepUpFor(null);
        setOtp('');
        // Reset so a LATER elevation starts from a fresh "send code" state rather than stale
        // isSuccess (the 6.3 review finding).
        requestStepUp.reset();
        // Re-submit the SAME action the elevation was minted for.
        void submit(retry).catch(() => undefined);
      },
    });
  };

  if (history.isLoading) return <p role="status">Loading moderation status…</p>;
  if (history.isError || !history.data) {
    return (
      <p role="alert" className="text-sm text-status-fail-fg">
        Could not load moderation status: {messageOf(history.error) ?? 'unknown error'}
      </p>
    );
  }

  const stepUpSlot =
    stepUpFor === null ? null : (
      <div className="flex flex-col gap-2 rounded border p-3" data-testid="moderation-step-up">
        <p className="text-sm">
          This action needs a one-time code. Enter the code sent to your registered mobile.
        </p>
        <label className="text-xs font-medium" htmlFor="moderation-otp">
          One-time code
        </label>
        <input
          id="moderation-otp"
          data-testid="moderation-otp"
          className="rounded border p-1 text-sm"
          value={otp}
          inputMode="numeric"
          onChange={(e) => setOtp(e.target.value)}
        />
        <button
          type="button"
          data-testid="moderation-otp-verify"
          className="self-start rounded bg-accent px-3 py-1 text-sm font-semibold text-white"
          disabled={verifyStepUp.isPending}
          onClick={verify}
        >
          {verifyStepUp.isPending ? t.processing : 'Verify and continue'}
        </button>
        {verifyStepUp.isError && (
          <p role="alert" className="text-xs text-status-fail-fg">
            {messageOf(verifyStepUp.error)}
          </p>
        )}
        {requestStepUp.isError && (
          <p role="alert" className="text-xs text-status-fail-fg" data-testid="moderation-otp-request-error">
            {messageOf(requestStepUp.error)}
          </p>
        )}
      </div>
    );

  // A step-up 403 is a workflow signal, not a failure to render as an error — it already drives the
  // OTP panel above, and showing it as red error text would read as "the action was rejected".
  const submitError =
    moderate.error instanceof ApiError && moderate.error.code === 'auth.step_up_required'
      ? null
      : (messageOf(moderate.error) ?? null);

  return (
    <div className="flex flex-col gap-4">
      <ModerationStrip
        moderation={history.data}
        reasonCodes={reasonCodes.data?.items ?? []}
        onSubmit={submit}
        processing={moderate.isPending}
        error={submitError}
        stepUpSlot={stepUpSlot}
      />
      <section aria-label={t.historyHeading} className="rounded border p-3">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide opacity-60">
          {t.historyHeading}
        </h3>
        <ModerationHistory entries={history.data.entries} reasonCodes={reasonCodes.data?.items ?? []} />
      </section>
    </div>
  );
}
