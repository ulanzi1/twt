// Directory-publication flip form (Story 10.30, Task 4; AC3, AC5).
//
// A single governed toggle: the target state is the OPPOSITE of the current one (the switch has
// exactly two positions and both are reachable — `setDirectoryPublicationEnabled` moves in BOTH
// directions by construction), plus a REQUIRED rationale.
//
// ⚠ The disable-until-non-empty behaviour is a COURTESY, ⛔ not the boundary. The real rejection is
// the contract's `rationale.trim().min(1)`, which answers a whitespace-only rationale with a 400
// regardless of what this component allows. That server path stays reachable and is tested.
//
// ⛔ NO display-name field, and there never may be one — the acting admin's `users.display_name` is
// resolved server-side. A client-supplied display name would let an operator's browser lie about who
// pulled a Pariwar's directory listing.

import type { ReactElement } from 'react';
import { useForm } from 'react-hook-form';

import { resolveEn as t } from './i18n-en.js';

interface PublicationFormValues {
  rationale: string;
}

export interface PublicationFormProps {
  /** The CURRENT state. The form's action is to move to its opposite. */
  currentlyEnabled: boolean;
  onSubmit: (payload: { enabled: boolean; rationale: string }) => void;
  pending: boolean;
  submitError?: string;
}

export function PublicationForm({
  currentlyEnabled,
  onSubmit,
  pending,
  submitError,
}: PublicationFormProps): ReactElement {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<PublicationFormValues>({ defaultValues: { rationale: '' }, mode: 'onChange' });

  const targetEnabled = !currentlyEnabled;
  const rationale = watch('rationale');
  const rationaleIsBlank = (rationale ?? '').trim() === '';

  const submit = handleSubmit((values) => {
    onSubmit({ enabled: targetEnabled, rationale: values.rationale.trim() });
  });

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => void submit(e)}
      aria-label={t('directoryPublication.form.heading')}
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="dp-rationale" className="text-sm font-medium">
          {t('directoryPublication.form.rationaleLabel')}
        </label>
        <textarea
          id="dp-rationale"
          className="rounded border px-2 py-1"
          rows={3}
          placeholder={t('directoryPublication.form.rationalePlaceholder')}
          {...register('rationale', {
            required: t('directoryPublication.form.rationaleRequired'),
            maxLength: { value: 2000, message: t('directoryPublication.form.rationaleTooLong') },
          })}
          data-testid="directory-publication-rationale"
        />
        <p className="text-xs opacity-60">{t('directoryPublication.form.rationaleHint')}</p>
        {errors.rationale && (
          <p role="alert" className="text-sm text-status-fail-fg">
            {errors.rationale.message}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={pending || rationaleIsBlank}
        aria-busy={pending}
        className="rounded bg-black px-4 py-2 text-white disabled:opacity-60"
        data-testid="directory-publication-submit"
      >
        {pending
          ? t('directoryPublication.form.submitPending')
          : targetEnabled
            ? t('directoryPublication.form.submitPublish')
            : t('directoryPublication.form.submitUnpublish')}
      </button>

      {submitError && (
        <p role="alert" className="text-sm text-status-fail-fg" data-testid="directory-publication-submit-error">
          {submitError}
        </p>
      )}
    </form>
  );
}
