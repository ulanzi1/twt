// WhatsApp per-category UTILITY template form (Story 5.3, Task 5; AC4).
//
// RHF + zodResolver over the SAME `WaTemplateDto` contract the server validates. Minimal: pick a category,
// enter the Meta-registered template name + language + approval status. A category with no `approved` row
// is not WA-eligible (the server's resolveApprovedTemplate returns null).

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCategory, WaTemplateApprovalStatus, WaTemplateDto } from '@twt/contracts';
import type { WaTemplateDto as WaTemplate } from '@twt/contracts';
import type { ReactElement } from 'react';
import { useForm } from 'react-hook-form';

export interface WaTemplateFormProps {
  onSubmit: (payload: WaTemplate) => void;
  pending: boolean;
  submitError?: string;
}

export function WaTemplateForm({ onSubmit, pending, submitError }: WaTemplateFormProps): ReactElement {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<WaTemplate>({
    resolver: zodResolver(WaTemplateDto),
    defaultValues: { alertCategory: 'alert_published', templateName: '', languageCode: 'en', approvalStatus: 'pending' },
  });

  const submit = handleSubmit((values) => onSubmit(values));

  return (
    <form className="flex flex-col gap-3" onSubmit={(e) => void submit(e)} aria-label="WhatsApp template mapping">
      <div className="flex flex-col gap-1">
        <label htmlFor="alertCategory" className="text-sm font-medium">Alert category</label>
        <select id="alertCategory" className="rounded border px-2 py-1" {...register('alertCategory')}>
          {AlertCategory.options.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="templateName" className="text-sm font-medium">Meta template name</label>
        <input id="templateName" className="rounded border px-2 py-1" {...register('templateName')} />
        {errors.templateName && <p role="alert" className="text-sm text-status-fail-fg">{errors.templateName.message}</p>}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="languageCode" className="text-sm font-medium">Language code (e.g. en, hi)</label>
        <input id="languageCode" className="rounded border px-2 py-1" {...register('languageCode')} />
        {errors.languageCode && <p role="alert" className="text-sm text-status-fail-fg">{errors.languageCode.message}</p>}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="approvalStatus" className="text-sm font-medium">Meta approval status</label>
        <select id="approvalStatus" className="rounded border px-2 py-1" {...register('approvalStatus')}>
          {WaTemplateApprovalStatus.options.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <button type="submit" disabled={pending} aria-busy={pending} className="rounded bg-black px-4 py-2 text-white disabled:opacity-60" data-testid="wa-template-submit">
        {pending ? 'Saving…' : 'Save template mapping'}
      </button>

      {submitError && <p role="alert" className="text-sm text-status-fail-fg">{submitError}</p>}
    </form>
  );
}
