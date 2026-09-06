// Drive-target change form (Story 11b.13, Task 4; AC5).
//
// ⭐⭐ IT OPENS ON THE TRUTH, ⛔ never on a constant. Seeding a blank amount while the Pariwar has a
// target set shows an operator a control that looks like the current state and is not — the exact
// defect a review pass caught on the sibling masking form, where a pre-selected wrong default was
// SATISFIED by every other guard on the path (required rationale, audit anchor, the permission key)
// and could only be caught by the form showing the truth.
//
// ⚠ The disable-until-valid behaviour is a COURTESY, ⛔ not the boundary. The real rejection is the
// contract's `targetInr.positive()` and `rationale.trim().min(1)`, which answer a bad request with a
// 400 regardless of what this component allows. That server path stays reachable and is tested.
//
// ⛔ NO display-name field, and there never may be one — the acting admin's `users.display_name` is
// resolved server-side. ⛔ NO effective-from field either: a caller-supplied instant would let an
// operator BACK-DATE a target, retroactively re-characterising what was in force and when.
//
// ⭐⭐ AND IT CARRIES THE `expectedVersion` IT WAS HANDED, INVISIBLY. `2026-09-05-201` cl.4/cl.5: the
// version is DISPLAYED by the page above and SENT BACK by this form. ⛔ The alternative — dropping
// the version from the UI so it stops implying a guard — was REFUSED by that ruling: it removes the
// operator's provenance view in order to avoid building the guard, on the one surface whose stated
// purpose is provenance. ⛔ Do not make this a hidden input the operator can edit, and ⛔ do not
// default it to `null` when a target exists: that is precisely the stale-write the guard refuses.

import type { ReactElement } from 'react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';

import { resolveEn as t } from './i18n-en.js';

/** Mirrors the contract + DB ceiling. ⛔ A data-sanity bound, ⛔ not a policy ceiling. */
const MAX_TARGET = 100_000_000;

export interface DriveTargetFormProps {
  onSubmit: (payload: { targetInr: number; rationale: string }) => void;
  pending: boolean;
  submitError?: string;
  /**
   * The target CURRENTLY set, or `null` when the Pariwar has never set one.
   *
   * ⭐ `null` opens the field BLANK, ⛔ never `0`. Zero is not a legal target — Story 11b.14 divides
   * by this figure — and seeding it would put the strictest-looking value on screen as though it
   * were a default the code chose.
   */
  currentTargetInr: number | null;
  /**
   * Bumped by the parent after every successful change. A stale rationale carried over in the
   * textarea would otherwise be silently resubmittable as the justification for a DIFFERENT target
   * on the very next click (the 10.30 review finding, which applies unchanged here).
   */
  resetToken: number;
}

interface FormValues {
  amount: string;
  rationale: string;
}

export function DriveTargetForm({
  onSubmit,
  pending,
  submitError,
  currentTargetInr,
  resetToken,
}: DriveTargetFormProps): ReactElement {
  const seed = currentTargetInr === null ? '' : String(currentTargetInr);
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: { amount: seed, rationale: '' },
    mode: 'onChange',
  });

  // ⚠ Re-seeds on `resetToken` (after a successful save) AND whenever the target in force changes —
  // ⛔ the second dependency is not optional: after a save the freshly-refetched target IS the new
  // truth, and resetting to a stale seed would put the form back into the same lying state this
  // component exists to prevent.
  // ⚠ `rationale` is ALWAYS blank — ⛔ never seeded and ⛔ never carried over. A justification
  // belongs to ONE change.
  useEffect(() => {
    reset({ amount: currentTargetInr === null ? '' : String(currentTargetInr), rationale: '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset() runs on an explicit parent bump or a change in the target in force
  }, [resetToken, currentTargetInr]);

  const rationale = watch('rationale');
  const amount = watch('amount');
  const rationaleIsBlank = (rationale ?? '').trim() === '';
  // ⚠ Parsed, ⛔ not coerced: `Number('')` is 0, so a blank field would submit ₹0 — which is not
  // merely wrong but is the one value Story 11b.14's meter cannot divide by. An explicit
  // digits-only test is the only safe read.
  const parsed = /^\d+$/.test((amount ?? '').trim()) ? Number((amount ?? '').trim()) : Number.NaN;
  const amountInvalid = !Number.isInteger(parsed) || parsed <= 0 || parsed > MAX_TARGET;

  const submit = handleSubmit((values) => {
    onSubmit({ targetInr: parsed, rationale: values.rationale.trim() });
  });

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => void submit(e)}
      aria-label={t('driveTarget.form.heading')}
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="dt-amount" className="text-sm font-medium">
          {t('driveTarget.form.amountLabel')}
        </label>
        <input
          id="dt-amount"
          type="text"
          inputMode="numeric"
          className="w-48 rounded border px-2 py-1"
          {...register('amount')}
          data-testid="drive-target-amount"
        />
        <p className="text-xs opacity-60">{t('driveTarget.form.amountHint')}</p>
        {amountInvalid && (amount ?? '').trim() !== '' && (
          <p role="alert" className="text-sm text-status-fail-fg">
            {t('driveTarget.form.amountInvalid')}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="dt-rationale" className="text-sm font-medium">
          {t('driveTarget.form.rationaleLabel')}
        </label>
        <textarea
          id="dt-rationale"
          className="rounded border px-2 py-1"
          rows={3}
          placeholder={t('driveTarget.form.rationalePlaceholder')}
          {...register('rationale', {
            required: t('driveTarget.form.rationaleRequired'),
            maxLength: { value: 2000, message: t('driveTarget.form.rationaleTooLong') },
          })}
          data-testid="drive-target-rationale"
        />
        <p className="text-xs opacity-60">{t('driveTarget.form.rationaleHint')}</p>
        {errors.rationale && (
          <p role="alert" className="text-sm text-status-fail-fg">
            {errors.rationale.message}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={pending || rationaleIsBlank || amountInvalid}
        aria-busy={pending}
        className="rounded bg-black px-4 py-2 text-white disabled:opacity-60"
        data-testid="drive-target-submit"
      >
        {pending ? t('driveTarget.form.submitPending') : t('driveTarget.form.submit')}
      </button>

      {submitError && (
        <p role="alert" className="text-sm text-status-fail-fg" data-testid="drive-target-submit-error">
          {submitError}
        </p>
      )}
    </form>
  );
}
