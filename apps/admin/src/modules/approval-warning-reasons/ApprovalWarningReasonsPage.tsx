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
  APPROVAL_WARNING_REASON_WHEN_TO_USE_MAX,
  type ApprovalWarningReasonOption,
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

function errorText(err: unknown): string {
  if (err instanceof ApiError) {
    const key = err.code.replace(/^approval_warning_reason\./, '');
    return t.errors[key] ?? t.errors.generic!;
  }
  return t.errors.generic!;
}

interface ReasonFormProps {
  heading: string;
  submitLabel: string;
  processing: boolean;
  onSubmit: (input: { label: string; when_to_use: string }) => void;
  onCancel?: () => void;
  testId: string;
}

function ReasonForm({ heading, submitLabel, processing, onSubmit, onCancel, testId }: ReasonFormProps): ReactElement {
  const [label, setLabel] = useState('');
  const [whenToUse, setWhenToUse] = useState('');
  const [missing, setMissing] = useState(false);
  return (
    <form
      className="flex flex-col gap-2 rounded border p-3"
      data-testid={testId}
      onSubmit={(e) => {
        e.preventDefault();
        if (label.trim() === '' || whenToUse.trim() === '') return setMissing(true);
        setMissing(false);
        onSubmit({ label: label.trim(), when_to_use: whenToUse.trim() });
      }}
    >
      <h3 className="text-sm font-semibold">{heading}</h3>
      <label className="flex flex-col text-xs">
        {t.labelField}
        <input
          className="rounded border px-2 py-1 text-sm"
          maxLength={APPROVAL_WARNING_REASON_LABEL_MAX}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          data-testid={`${testId}-label`}
        />
      </label>
      <label className="flex flex-col text-xs">
        {t.whenToUseField}
        <textarea
          className="rounded border p-1 text-sm"
          maxLength={APPROVAL_WARNING_REASON_WHEN_TO_USE_MAX}
          value={whenToUse}
          onChange={(e) => setWhenToUse(e.target.value)}
          data-testid={`${testId}-when-to-use`}
        />
      </label>
      {missing ? (
        <p role="alert" className="text-xs text-status-fail-fg" data-testid={`${testId}-missing`}>
          {t.required}
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
  // Clears both mutations' leftover success/error state before switching forms — otherwise a previous
  // attempt's banner (code review 2026-10-05) renders under the form the user is now looking at.
  const startReplacing = (option: ApprovalWarningReasonOption | null): void => {
    add.reset();
    replace.reset();
    setReplacing(option);
  };
  const runAdd = (body: { label: string; when_to_use: string }): void => {
    add.mutate(body, { onSuccess: () => setAddFormKey((k) => k + 1), onError: onError(() => runAdd(body)) });
  };
  const runReplace = (reasonId: string, body: { label: string; when_to_use: string }): void => {
    replace.mutate({ reasonId, body }, { onSuccess: () => setReplacing(null), onError: onError(() => runReplace(reasonId, body)) });
  };
  const writeError = [add.error, replace.error].find((e) => e && !(e instanceof ApiError && e.code === 'auth.step_up_required'));

  if (list.isLoading) return <p role="status">{t.loading}</p>;
  if (list.isError) {
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
          testId="reason-replace-form"
        />
      ) : (
        <ReasonForm key={addFormKey} heading={t.addHeading} submitLabel={t.addSubmit} processing={add.isPending} onSubmit={runAdd} testId="reason-add-form" />
      )}

      {pendingWrite ? (
        <div className="flex flex-col gap-2 rounded border border-dashed p-3" data-testid="reasons-step-up">
          <p className="text-sm">{t.stepUpIntro}</p>
          <button
            type="button"
            className="w-fit rounded border px-3 py-1 text-sm disabled:opacity-50"
            disabled={requestStepUp.isPending}
            onClick={() => requestStepUp.mutate(STEP_UP_CONTEXT)}
          >
            {t.stepUpSend}
          </button>
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
        </div>
      ) : null}

      {writeError ? (
        <p role="alert" className="text-sm text-status-fail-fg" data-testid="reasons-write-error">
          {errorText(writeError)}
        </p>
      ) : add.isSuccess || replace.isSuccess ? (
        <p role="status" className="text-sm" data-testid="reasons-saved">
          {t.saved}
        </p>
      ) : null}

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
