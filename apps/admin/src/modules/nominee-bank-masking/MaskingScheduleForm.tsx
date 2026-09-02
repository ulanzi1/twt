// Nominee-bank masking-schedule change form (Story 11b.3a, Task 5; AC5, AC6).
//
// ⭐⭐ THREE SETTINGS, ⛔ NOT A TOGGLE. `2026-08-28-160` cl.10(c) names `0 days` / `N days` /
// `permanent`, and cl.10(d) rules that a later "simplification" to a boolean is a **DEFECT, not a
// cleanup**. ⛔ Do not turn this into a switch, and ⛔ do not hide the day field behind one.
//
// ⚠ `0` IS A LEGAL, MEANINGFUL VALUE and the field says so: it is cl.10(c)'s zero-day setting — the
// one that masks from the close instant — and
// it is **a choice the admin makes**, ⛔ never a default the code assumes (cl.10(b) forbids that in
// terms). ⛔ Do not treat `0` as "unset" anywhere on this path — a falsy check would silently turn the
// strictest day setting into no setting at all, which under FAIL-OPEN publishes a full account number.
//
// ⚠ The disable-until-valid behaviour is a COURTESY, ⛔ not the boundary. The real rejection is the
// contract's `rationale.trim().min(1)` and `maskAfterDays` range, which answer a bad request with a
// 400 regardless of what this component allows. That server path stays reachable and is tested.
//
// ⛔ NO display-name field, and there never may be one — the acting admin's `users.display_name` is
// resolved server-side. ⛔ NO effective-from field either: a caller-supplied instant would let an
// operator BACK-DATE a window, retroactively re-characterising what the public could see and when.

import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

import { resolveEn as t } from './i18n-en.js';

/** Mirrors the contract's ceiling. ⛔ A data-sanity bound, ⛔ not a policy ceiling. */
const MAX_DAYS = 36500;

export interface MaskingScheduleFormProps {
  onSubmit: (payload: {
    setting: { mode: 'after_days'; maskAfterDays: number } | { mode: 'permanent' };
    rationale: string;
  }) => void;
  pending: boolean;
  submitError?: string;
  /**
   * Bumped by the parent after every successful change. A stale rationale carried over in the
   * textarea would otherwise be silently resubmittable as the justification for a DIFFERENT setting
   * on the very next click — corrupting the one thing this control exists to get right (the 10.30
   * review finding, which applies unchanged here).
   */
  resetToken: number;
}

interface FormValues {
  days: string;
  rationale: string;
}

export function MaskingScheduleForm({
  onSubmit,
  pending,
  submitError,
  resetToken,
}: MaskingScheduleFormProps): ReactElement {
  const [mode, setMode] = useState<'after_days' | 'permanent'>('after_days');
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ defaultValues: { days: '0', rationale: '' }, mode: 'onChange' });

  useEffect(() => {
    reset({ days: '0', rationale: '' });
    setMode('after_days');
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset() runs only when the parent bumps resetToken
  }, [resetToken]);

  const rationale = watch('rationale');
  const days = watch('days');
  const rationaleIsBlank = (rationale ?? '').trim() === '';
  // ⚠ Parsed, ⛔ not coerced: `Number('')` is 0, so a blank field would submit the STRICTEST day
  // setting under the guise of a default. An explicit integer test is the only safe read.
  const parsedDays = /^\d+$/.test((days ?? '').trim()) ? Number((days ?? '').trim()) : Number.NaN;
  const daysInvalid =
    mode === 'after_days' && (!Number.isInteger(parsedDays) || parsedDays < 0 || parsedDays > MAX_DAYS);

  const submit = handleSubmit((values) => {
    onSubmit({
      setting:
        mode === 'permanent'
          ? { mode: 'permanent' }
          : { mode: 'after_days', maskAfterDays: parsedDays },
      rationale: values.rationale.trim(),
    });
  });

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => void submit(e)}
      aria-label={t('nomineeBankMasking.form.heading')}
    >
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">{t('nomineeBankMasking.form.modeLabel')}</legend>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="masking-mode"
            checked={mode === 'after_days'}
            onChange={() => setMode('after_days')}
            data-testid="nominee-bank-masking-mode-after-days"
          />
          {t('nomineeBankMasking.form.modeAfterDays')}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="masking-mode"
            checked={mode === 'permanent'}
            onChange={() => setMode('permanent')}
            data-testid="nominee-bank-masking-mode-permanent"
          />
          {t('nomineeBankMasking.form.modePermanent')}
        </label>
      </fieldset>

      {/* ⚠ The day field is DISABLED, ⛔ not removed, under `permanent` — so the value an admin typed
          is still on screen if they change their mind, and the two settings stay visibly distinct. */}
      <div className="flex flex-col gap-1">
        <label htmlFor="nbm-days" className="text-sm font-medium">
          {t('nomineeBankMasking.form.daysLabel')}
        </label>
        <input
          id="nbm-days"
          type="text"
          inputMode="numeric"
          className="w-32 rounded border px-2 py-1 disabled:opacity-50"
          disabled={mode === 'permanent'}
          {...register('days')}
          data-testid="nominee-bank-masking-days"
        />
        <p className="text-xs opacity-60">{t('nomineeBankMasking.form.daysHint')}</p>
        {daysInvalid && (
          <p role="alert" className="text-sm text-status-fail-fg">
            {t('nomineeBankMasking.form.daysInvalid')}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="nbm-rationale" className="text-sm font-medium">
          {t('nomineeBankMasking.form.rationaleLabel')}
        </label>
        <textarea
          id="nbm-rationale"
          className="rounded border px-2 py-1"
          rows={3}
          placeholder={t('nomineeBankMasking.form.rationalePlaceholder')}
          {...register('rationale', {
            required: t('nomineeBankMasking.form.rationaleRequired'),
            maxLength: { value: 2000, message: t('nomineeBankMasking.form.rationaleTooLong') },
          })}
          data-testid="nominee-bank-masking-rationale"
        />
        <p className="text-xs opacity-60">{t('nomineeBankMasking.form.rationaleHint')}</p>
        {errors.rationale && (
          <p role="alert" className="text-sm text-status-fail-fg">
            {errors.rationale.message}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={pending || rationaleIsBlank || daysInvalid}
        aria-busy={pending}
        className="rounded bg-black px-4 py-2 text-white disabled:opacity-60"
        data-testid="nominee-bank-masking-submit"
      >
        {pending
          ? t('nomineeBankMasking.form.submitPending')
          : t('nomineeBankMasking.form.submit')}
      </button>

      {submitError && (
        <p role="alert" className="text-sm text-status-fail-fg" data-testid="nominee-bank-masking-submit-error">
          {submitError}
        </p>
      )}
    </form>
  );
}
