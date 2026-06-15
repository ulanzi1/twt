// Add-Pariwar form (Story 1.15, AC-4 control (a)).
//
// RHF + zodResolver over the SAME `AddPariwarRequest` contract the server validates
// (single source of types). Optional fields (trust registration id, dark logo,
// accent colour) use `setValueAs` to coerce a blank input → undefined so the
// `.nullish()` / optional schema branches pass instead of failing `.min(1)`/`.url()`.
// Deliberately MINIMAL (AC-4): exactly the passport fields — NO Epic-10 controls.

import { zodResolver } from '@hookform/resolvers/zod';
import { AddPariwarRequest } from '@twt/contracts';
import type { ReactElement } from 'react';
import { useForm } from 'react-hook-form';

const blankToUndefined = (v: string): string | undefined => (v === '' ? undefined : v);

export interface AddPariwarFormProps {
  onSubmit: (payload: AddPariwarRequest) => void;
  pending: boolean;
  submitError?: string;
}

export function AddPariwarForm({ onSubmit, pending, submitError }: AddPariwarFormProps): ReactElement {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AddPariwarRequest>({
    resolver: zodResolver(AddPariwarRequest),
    defaultValues: {
      displayNameEn: '',
      displayNameHi: '',
      legalName: '',
      trustRegistrationId: '',
      localeDefault: 'hi',
      brandingBundle: {
        logo_url: '',
        logo_url_dark: '',
        primary_color: '#0A3D62',
        secondary_color: '#FFFFFF',
        accent_color: '',
      },
    },
  });

  const submit = handleSubmit((values) => onSubmit(values));

  return (
    <form className="flex flex-col gap-3" onSubmit={(e) => void submit(e)} aria-label="Add Pariwar">
      <h2 className="text-sm font-semibold uppercase tracking-wide opacity-70">Add Pariwar</h2>

      <div className="flex flex-col gap-1">
        <label htmlFor="displayNameEn" className="text-sm font-medium">Display name (English)</label>
        <input id="displayNameEn" className="rounded border px-2 py-1" aria-invalid={errors.displayNameEn ? true : undefined} {...register('displayNameEn')} />
        {errors.displayNameEn && <p role="alert" className="text-sm text-status-fail-fg">{errors.displayNameEn.message}</p>}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="displayNameHi" className="text-sm font-medium">Display name (Hindi)</label>
        <input id="displayNameHi" className="rounded border px-2 py-1" aria-invalid={errors.displayNameHi ? true : undefined} {...register('displayNameHi')} />
        {errors.displayNameHi && <p role="alert" className="text-sm text-status-fail-fg">{errors.displayNameHi.message}</p>}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="legalName" className="text-sm font-medium">Legal / trust name</label>
        <input id="legalName" className="rounded border px-2 py-1" aria-invalid={errors.legalName ? true : undefined} {...register('legalName')} />
        {errors.legalName && <p role="alert" className="text-sm text-status-fail-fg">{errors.legalName.message}</p>}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="trustRegistrationId" className="text-sm font-medium">Trust registration ID (optional)</label>
        <input
          id="trustRegistrationId"
          className="rounded border px-2 py-1"
          {...register('trustRegistrationId', { setValueAs: blankToUndefined })}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="localeDefault" className="text-sm font-medium">Default locale</label>
        <select id="localeDefault" className="rounded border px-2 py-1" {...register('localeDefault')}>
          <option value="hi">Hindi (hi)</option>
          <option value="en">English (en)</option>
        </select>
      </div>

      <fieldset className="flex flex-col gap-3 rounded border p-3">
        <legend className="px-1 text-sm font-medium">Branding bundle</legend>

        <div className="flex flex-col gap-1">
          <label htmlFor="logoUrl" className="text-sm font-medium">Logo URL</label>
          <input id="logoUrl" className="rounded border px-2 py-1" aria-invalid={errors.brandingBundle?.logo_url ? true : undefined} {...register('brandingBundle.logo_url')} />
          {errors.brandingBundle?.logo_url && <p role="alert" className="text-sm text-status-fail-fg">{errors.brandingBundle.logo_url.message}</p>}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="logoUrlDark" className="text-sm font-medium">Logo URL — dark (optional)</label>
          <input id="logoUrlDark" className="rounded border px-2 py-1" {...register('brandingBundle.logo_url_dark', { setValueAs: blankToUndefined })} />
          {errors.brandingBundle?.logo_url_dark && <p role="alert" className="text-sm text-status-fail-fg">{errors.brandingBundle.logo_url_dark.message}</p>}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="primaryColor" className="text-sm font-medium">Primary colour (#RRGGBB)</label>
          <input id="primaryColor" className="rounded border px-2 py-1" aria-invalid={errors.brandingBundle?.primary_color ? true : undefined} {...register('brandingBundle.primary_color')} />
          {errors.brandingBundle?.primary_color && <p role="alert" className="text-sm text-status-fail-fg">{errors.brandingBundle.primary_color.message}</p>}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="secondaryColor" className="text-sm font-medium">Secondary colour (#RRGGBB)</label>
          <input id="secondaryColor" className="rounded border px-2 py-1" aria-invalid={errors.brandingBundle?.secondary_color ? true : undefined} {...register('brandingBundle.secondary_color')} />
          {errors.brandingBundle?.secondary_color && <p role="alert" className="text-sm text-status-fail-fg">{errors.brandingBundle.secondary_color.message}</p>}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="accentColor" className="text-sm font-medium">Accent colour (#RRGGBB, optional)</label>
          <input id="accentColor" className="rounded border px-2 py-1" {...register('brandingBundle.accent_color', { setValueAs: blankToUndefined })} />
          {errors.brandingBundle?.accent_color && <p role="alert" className="text-sm text-status-fail-fg">{errors.brandingBundle.accent_color.message}</p>}
        </div>
      </fieldset>

      <button type="submit" disabled={pending} aria-busy={pending} className="rounded bg-black px-4 py-2 text-white disabled:opacity-60" data-testid="add-pariwar-submit">
        {pending ? 'Provisioning…' : 'Add Pariwar'}
      </button>

      {submitError && <p role="alert" className="text-sm text-status-fail-fg">{submitError}</p>}
    </form>
  );
}
