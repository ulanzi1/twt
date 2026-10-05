// The Super Admin's WARNING-REASON LIST page — Story 6.23a (Task 11; NW16, NW17, NW18; AC12).
//
// The active list (label, when to use, added by / on, "replaces …"), the history (each replaced reason with "replaced
// by … on …"), an ADD form and a REPLACE action — both need a label and a "when to use" note. The page says plainly
// that a reason can be replaced but ⛔ never edited or deleted: there is ⛔ no edit control and ⛔ no delete control,
// because there is ⛔ no such route. The built-in generic is shown first and is ⛔ never replaceable.
// The server's key check (`approval_warning_reason.manage`, super_admin ONLY) is the boundary; a step-up-required 403
// is the signal to elevate (the FixedAmountPage pattern), ⛔ never a hard error.

import {
  APPROVAL_WARNING_REASON_LABEL_MAX,
  APPROVAL_WARNING_REASON_REFUSALS,
  APPROVAL_WARNING_REASON_WHEN_TO_USE_MAX,
  type ApprovalWarningReasonOption,
  type ApprovalWarningReasonRefusal,
} from '@twt/contracts';
import { useState, type ReactElement } from 'react';

import { ApiError } from '../../api/client.js';
import {
  useAddApprovalWarningReason,
  useApprovalWarningReasons,
  useReplaceApprovalWarningReason,
  useRequestStepUp,
  useVerifyStepUp,
} from '../../api/hooks.js';
import { formatIst } from '../claim-verification/NomineeDeclarationPanel.js';
import { approvalWarningReasonsEn as t } from './i18n-en.js';

const STEP_UP_CONTEXT = 'approval_warning_reason_manage';
const REFUSAL_PREFIX = 'approval_warning_reason.';

const isRefusal = (key: string): key is ApprovalWarningReasonRefusal => (APPROVAL_WARNING_REASON_REFUSALS as readonly string[]).includes(key);

/** A refusal's own words; ⛔ "could not be saved" only for what has none (code review round 3). */
function errorText(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code === 'admin.display_name_missing') return t.displayNameMissing;
    const key = err.code.startsWith(REFUSAL_PREFIX) ? err.code.slice(REFUSAL_PREFIX.length) : '';
    if (isRefusal(key)) return t.errors[key];
    if (err.isForbidden) return t.forbidden;
  }
  return t.generic;
}

/** Code points — Postgres `char_length()`'s unit, which the contract and 0142 count (⛔ never `maxLength`'s UTF-16). */
const codePoints = (value: string): number => [...value].length;

interface ReasonFormProps {
  heading: string;
  submitLabel: string;
  processing: boolean;
  onSubmit: (input: { label: string; when_to_use: string }) => void;
  onCancel?: () => void;
  /** Any edit — the page drops a step-up retry still holding the OLD text (code review round 3). */
  onEdit: () => void;
  testId: string;
}

function ReasonForm({ heading, submitLabel, processing, onSubmit, onCancel, onEdit, testId }: ReasonFormProps): ReactElement {
  const [label, setLabel] = useState('');
  const [whenToUse, setWhenToUse] = useState('');
  const [problem, setProblem] = useState<'missing' | 'too_long' | null>(null);
  const problemId = `${testId}-problem`;
  // An edit clears a stale "missing" / "too long" alert — ⛔ never one describing text that is now fine (round 4).
  const edited = (): void => {
    setProblem(null);
    onEdit();
  };
  // Both fields are required; the alert names itself to both (round 4 — the late note's round-3 shape).
  const fieldA11y = {
    'aria-required': true,
    'aria-invalid': problem !== null ? true : undefined,
    'aria-describedby': problem !== null ? problemId : undefined,
  } as const;
  return (
    <form
      className="flex flex-col gap-2 rounded border p-3"
      data-testid={testId}
      onSubmit={(e) => {
        e.preventDefault();
        if (label.trim() === '' || whenToUse.trim() === '') return setProblem('missing');
        // ⛔ No `maxLength` on these fields: it counts UTF-16 units and would silently cut a pasted label that the
        // contract and the DB accept (code review round 3). The limit is checked here, in code points, with words.
        if (codePoints(label.trim()) > APPROVAL_WARNING_REASON_LABEL_MAX || codePoints(whenToUse.trim()) > APPROVAL_WARNING_REASON_WHEN_TO_USE_MAX) {
          return setProblem('too_long');
        }
        setProblem(null);
        onSubmit({ label: label.trim(), when_to_use: whenToUse.trim() });
      }}
    >
      <h3 className="text-sm font-semibold">{heading}</h3>
      <label className="flex flex-col text-xs">
        {t.labelField}
        <input
          className="rounded border px-2 py-1 text-sm"
          value={label}
          onChange={(e) => {
            setLabel(e.target.value);
            edited();
          }}
          {...fieldA11y}
          data-testid={`${testId}-label`}
        />
      </label>
      <label className="flex flex-col text-xs">
        {t.whenToUseField}
        <textarea
          className="rounded border p-1 text-sm"
          value={whenToUse}
          onChange={(e) => {
            setWhenToUse(e.target.value);
            edited();
          }}
          {...fieldA11y}
          data-testid={`${testId}-when-to-use`}
        />
      </label>
      {problem !== null ? (
        <p id={problemId} role="alert" className="text-xs text-status-fail-fg" data-testid={`${testId}-missing`}>
          {problem === 'missing' ? t.required : t.tooLong}
        </p>
      ) : null}
      <div className="flex gap-2">
        <button type="submit" className="rounded bg-black px-3 py-1 text-sm text-white disabled:opacity-50" disabled={processing} data-testid={`${testId}-submit`}>
          {processing ? t.saving : submitLabel}
        </button>
        {onCancel ? (
          <button type="button" className="rounded border px-3 py-1 text-sm" onClick={onCancel}>
            {t.cancel}
          </button>
        ) : null}
      </div>
    </form>
  );
}

function ReasonCard({ option, onReplace }: { option: ApprovalWarningReasonOption; onReplace?: () => void }): ReactElement {
  return (
    <li className="flex flex-col gap-1 rounded border p-2 text-sm" data-testid={`reason-${option.code}`}>
      <span className="font-medium">{option.label}</span>
      <span className="text-xs">
        {t.whenToUse}: {option.whenToUse}
      </span>
      <span className="text-xs opacity-70">
        {option.addedByDisplay !== null && option.addedAt !== null ? t.addedBy(option.addedByDisplay, formatIst(option.addedAt)) : t.builtIn}
        {option.replacesLabel !== null ? ` · ${t.replaces(option.replacesLabel)}` : ''}
      </span>
      {onReplace ? (
        <button type="button" className="w-fit text-xs underline" onClick={onReplace} data-testid={`reason-replace-${option.code}`}>
          {t.replace}
        </button>
      ) : null}
    </li>
  );
}

export function ApprovalWarningReasonsPage({ pariwarId }: { pariwarId: string }): ReactElement {
  const list = useApprovalWarningReasons(pariwarId);
  const add = useAddApprovalWarningReason(pariwarId);
  const replace = useReplaceApprovalWarningReason(pariwarId);
  const requestStepUp = useRequestStepUp();
  const verifyStepUp = useVerifyStepUp();
  const [replacing, setReplacing] = useState<ApprovalWarningReasonOption | null>(null);
  // The write waiting on a step-up, re-run after verify.
  const [pendingWrite, setPendingWrite] = useState<(() => void) | null>(null);
  const [otp, setOtp] = useState('');
  // Remounts the Add form on a successful add (re-review 2026-10-05) — `ReasonForm` owns its own
  // `label`/`whenToUse` state, which otherwise keeps the just-submitted text and invites an
  // accidental duplicate re-click. Mirrors the Replace form's own `key={replacing.code}` remount.
  const [addFormKey, setAddFormKey] = useState(0);

  const onError = (retry: () => void) => (err: unknown) => {
    if (err instanceof ApiError && err.code === 'auth.step_up_required') setPendingWrite(() => retry);
  };
  /**
   * Drop a step-up retry and everything it was gathering (code review round 3). `pendingWrite` is a closure over the
   * body as SUBMITTED — a reason is ⛔ never edited or deleted, so a retry of text the Super Admin has since
   * cancelled, switched away from or edited would be a permanent write they did not mean. Every such gesture clears it.
   */
  const clearStepUp = (): void => {
    setPendingWrite(null);
    setOtp('');
    requestStepUp.reset();
    verifyStepUp.reset();
  };
  const onEdit = (): void => {
    if (pendingWrite !== null) clearStepUp();
  };
  // Clears both mutations' leftover success/error state before switching forms — otherwise a previous
  // attempt's banner (code review 2026-10-05) renders under the form the user is now looking at.
  const startReplacing = (option: ApprovalWarningReasonOption | null): void => {
    add.reset();
    replace.reset();
    clearStepUp();
    setReplacing(option);
  };
  // Each submit clears the OTHER write's leftover state (code review round 4): the round-3 auto-close leaves a refused
  // replace's error behind, which used to sit over a later SUCCESSFUL add (and hold "Saved." off) — inviting a duplicate
  // of a reason that can ⛔ never be deleted; a past success likewise kept "Saved." up over a new attempt.
  const runAdd = (body: { label: string; when_to_use: string }): void => {
    clearStepUp();
    replace.reset();
    add.mutate(body, { onSuccess: () => setAddFormKey((k) => k + 1), onError: onError(() => runAdd(body)) });
  };
  const runReplace = (reasonId: string, body: { label: string; when_to_use: string }): void => {
    clearStepUp();
    add.reset();
    replace.mutate(
      { reasonId, body },
      {
        onSuccess: () => setReplacing(null),
        onError: (err) => {
          // The reason is gone from the active list (replaced meanwhile, or never this Pariwar's) — close the form, which
          // would otherwise resubmit the same dead id forever; the refusal's words stay (code review round 3).
          if (err instanceof ApiError && (err.code === `${REFUSAL_PREFIX}already_replaced` || err.code === `${REFUSAL_PREFIX}not_found`)) {
            setReplacing(null);
          }
          onError(() => runReplace(reasonId, body))(err);
        },
      },
    );
  };
  const writeError = [add.error, replace.error].find((e) => e && !(e instanceof ApiError && e.code === 'auth.step_up_required'));
  const saved = !writeError && (add.isSuccess || replace.isSuccess);

  if (list.isLoading) return <p role="status">{t.loading}</p>;
  // ⛔ Only when there is NOTHING to show (code review round 3): a failed BACKGROUND refetch keeps `data`, and must
  // ⛔ not unmount the open form, its banner or a pending step-up.
  if (list.isError && !list.data) {
    return (
      <p role="alert" data-testid="reasons-load-error">
        {list.error instanceof ApiError && list.error.isForbidden ? t.forbidden : t.loadError}
      </p>
    );
  }
  const data = list.data!;

  return (
    <div className="flex flex-col gap-4" data-testid="approval-warning-reasons-page">
      <h2 className="text-lg font-semibold">{t.heading}</h2>
      <p className="text-sm">{t.intro}</p>
      <p className="text-sm font-medium" data-testid="reasons-never-edited">
        {t.neverEdited}
      </p>
      <p className="text-xs opacity-70">{t.staffText}</p>

      <section>
        <h3 className="font-semibold">{t.activeHeading}</h3>
        <ul className="flex flex-col gap-2" data-testid="reasons-active">
          {data.active.map((o) => (
            <ReasonCard key={o.code} option={o} {...(o.reasonId !== null ? { onReplace: () => startReplacing(o) } : {})} />
          ))}
        </ul>
      </section>

      {replacing ? (
        <ReasonForm
          key={replacing.code}
          heading={t.replaceHeading(replacing.label)}
          submitLabel={t.replaceSubmit}
          processing={replace.isPending}
          onSubmit={(body) => runReplace(replacing.reasonId!, body)}
          onCancel={() => startReplacing(null)}
          onEdit={onEdit}
          testId="reason-replace-form"
        />
      ) : (
        <ReasonForm
          key={addFormKey}
          heading={t.addHeading}
          submitLabel={t.addSubmit}
          processing={add.isPending}
          onSubmit={runAdd}
          onEdit={onEdit}
          testId="reason-add-form"
        />
      )}

      {pendingWrite ? (
        <div className="flex flex-col gap-2 rounded border border-dashed p-3" data-testid="reasons-step-up">
          {/* `role="alert"` — this block MOUNTS in answer to the 403, so a status region holding its text on mount
              would ⛔ never be announced (family 13(d); the `RefileConfirmationCard` precedent). */}
          <p className="text-sm" role="alert">
            {t.stepUpIntro}
          </p>
          <button
            type="button"
            className="w-fit rounded border px-3 py-1 text-sm disabled:opacity-50"
            disabled={requestStepUp.isPending}
            onClick={() => requestStepUp.mutate(STEP_UP_CONTEXT)}
          >
            {t.stepUpSend}
          </button>
          {requestStepUp.isError ? (
            <p role="alert" className="text-xs text-status-fail-fg" data-testid="reasons-step-up-send-error">
              {requestStepUp.error instanceof ApiError && requestStepUp.error.status === 429 ? t.stepUpSendRateLimited : t.stepUpSendError}
            </p>
          ) : null}
          {requestStepUp.isSuccess ? (
            <div className="flex items-end gap-2">
              <label className="flex flex-col text-xs">
                {t.stepUpCode}
                <input className="rounded border px-2 py-1 text-sm" value={otp} onChange={(e) => setOtp(e.target.value)} />
              </label>
              <button
                type="button"
                className="rounded bg-black px-3 py-1 text-sm text-white disabled:opacity-50"
                disabled={verifyStepUp.isPending || otp.trim() === ''}
                onClick={() =>
                  verifyStepUp.mutate(otp.trim(), {
                    onSuccess: () => {
                      const retry = pendingWrite;
                      setPendingWrite(null);
                      setOtp('');
                      requestStepUp.reset();
                      retry();
                    },
                  })
                }
              >
                {t.stepUpVerify}
              </button>
            </div>
          ) : null}
          {verifyStepUp.isError ? (
            <p role="alert" className="text-xs text-status-fail-fg" data-testid="reasons-step-up-verify-error">
              {/* "Not accepted" only when the server JUDGED the code (a 4xx) — ⛔ never on an outage or a dropped request. */}
              {verifyStepUp.error instanceof ApiError && verifyStepUp.error.status >= 400 && verifyStepUp.error.status < 500
                ? t.stepUpVerifyError
                : t.stepUpVerifyUnavailable}
            </p>
          ) : null}
        </div>
      ) : null}

      {writeError ? (
        <p role="alert" className="text-sm text-status-fail-fg" data-testid="reasons-write-error">
          {errorText(writeError)}
        </p>
      ) : null}
      {/* ALWAYS mounted, its TEXT changes — a status region that mounts already holding "Saved." is ⛔ never announced
          (family 13(d), code review round 3). */}
      <p role="status" className="text-sm" data-testid="reasons-saved">
        {saved ? t.saved : ''}
      </p>

      <section>
        <h3 className="font-semibold">{t.historyHeading}</h3>
        {data.history.length === 0 ? (
          <p className="text-sm opacity-70">{t.historyEmpty}</p>
        ) : (
          <ul className="flex flex-col gap-2" data-testid="reasons-history">
            {data.history.map((h) => (
              <li key={h.code} className="flex flex-col gap-1 rounded border p-2 text-sm opacity-80" data-testid={`reason-history-${h.code}`}>
                <span className="font-medium">{h.label}</span>
                <span className="text-xs">
                  {t.whenToUse}: {h.whenToUse}
                </span>
                <span className="text-xs">{t.addedBy(h.addedByDisplay, formatIst(h.addedAt))}</span>
                <span className="text-xs">
                  {h.replacedByLabel !== null && h.replacedByDisplay !== null
                    ? t.replacedBy(h.replacedByLabel, h.replacedByDisplay, formatIst(h.replacedAt))
                    : t.replacedOn(formatIst(h.replacedAt))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
