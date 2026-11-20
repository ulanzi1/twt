// "Open an incident" (Story 14.3, AC5 / AC12). react-hook-form over the SAME `BreachIncidentOpenRequest` contract the server
// validates. The awareness time is a `datetime-local` typed and read as IST (never the browser's zone).

import { BREACH_DETECTION_SOURCES, BreachIncidentOpenRequest } from '@twt/contracts';
import type { ReactElement } from 'react';
import { useEffect } from 'react';
import { useForm, type Resolver } from 'react-hook-form';

import type { BreachIncidentOpenBody } from '../../api/client.js';
import { isoToIstLocalInput, istLocalInputToIso } from '../correction-chase/ist.js';
import { t } from './i18n-en.js';

export interface OpenFormValues {
  isRehearsal: boolean;
  title: string;
  becameAwareAt: string;
  detectionSource: string;
  detectionSignalRef: string;
}

/** Values a signal hands to the form: the source, the check's id, and when it was verified. */
export interface OpenPrefill {
  readonly detectionSource: string;
  readonly detectionSignalRef: string;
  /** An ISO instant. */
  readonly becameAwareAt: string;
}

const EMPTY: OpenFormValues = { isRehearsal: false, title: '', becameAwareAt: '', detectionSource: 'other', detectionSignalRef: '' };

/** The request body from the form's values, validated by the contract; or a message key per field. */
export function buildOpenBody(
  values: OpenFormValues,
): { readonly ok: true; readonly body: BreachIncidentOpenBody } | { readonly ok: false; readonly errors: Partial<Record<keyof OpenFormValues, string>> } {
  const errors: Partial<Record<keyof OpenFormValues, string>> = {};
  const aware = istLocalInputToIso(values.becameAwareAt);
  if (aware === null) errors.becameAwareAt = 'invalid.datetime';
  const ref = values.detectionSignalRef.trim();
  const body = {
    isRehearsal: values.isRehearsal,
    title: values.title,
    becameAwareAt: aware ?? '',
    detectionSource: values.detectionSource,
    ...(ref === '' ? {} : { detectionSignalRef: ref }),
  };
  const parsed = BreachIncidentOpenRequest.safeParse(body);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const name = issue.path[0];
      if (typeof name !== 'string' || !(name in EMPTY)) continue;
      const key = name as keyof OpenFormValues;
      if (errors[key] !== undefined) continue;
      errors[key] = /future/.test(issue.message)
        ? 'invalid.future'
        : /check's id/.test(issue.message)
          ? 'invalid.checkId'
          : issue.code === 'too_small'
            ? 'invalid.required'
            : 'invalid.generic';
    }
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, body: body as BreachIncidentOpenBody };
}

const resolver: Resolver<OpenFormValues> = (values) => {
  const built = buildOpenBody(values);
  if (built.ok) return { values, errors: {} };
  const errors = Object.fromEntries(Object.entries(built.errors).map(([name, key]) => [name, { type: 'validate', message: t(key) }]));
  return { values: {}, errors };
};

export interface OpenIncidentFormProps {
  readonly prefill: OpenPrefill | null;
  readonly onClearPrefill: () => void;
  readonly onSubmit: (body: BreachIncidentOpenBody) => void;
  readonly pending: boolean;
  readonly error?: string | undefined;
}

export function OpenIncidentForm({ prefill, onClearPrefill, onSubmit, pending, error }: OpenIncidentFormProps): ReactElement {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<OpenFormValues>({ resolver, defaultValues: EMPTY });

  // "Open an incident from this": take the source, the reference and the awareness time from the signal.
  useEffect(() => {
    if (prefill === null) return;
    reset({
      isRehearsal: false,
      title: '',
      becameAwareAt: isoToIstLocalInput(prefill.becameAwareAt),
      detectionSource: prefill.detectionSource,
      detectionSignalRef: prefill.detectionSignalRef,
    });
  }, [prefill, reset]);

  /** A control in error says so, and names its error text (review 2026-11-20). */
  const a11y = (name: keyof OpenFormValues) =>
    errors[name] ? ({ 'aria-invalid': true, 'aria-describedby': `breach-open-${name}-error` } as const) : ({ 'aria-invalid': false } as const);

  const submit = handleSubmit((values) => {
    const built = buildOpenBody(values);
    if (built.ok) onSubmit(built.body);
  });

  return (
    <form className="flex flex-col gap-3" aria-label={t('open.title')} onSubmit={(e) => void submit(e)} data-testid="breach-open-form" noValidate>
      {prefill !== null && (
        <p className="rounded border px-3 py-2 text-sm" role="status" data-testid="breach-open-prefilled">
          {t('open.prefilled')}{' '}
          <button
            type="button"
            className="underline"
            onClick={() => {
              reset(EMPTY);
              onClearPrefill();
            }}
          >
            {t('open.clearPrefill')}
          </button>
        </p>
      )}
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" className="mt-1" {...register('isRehearsal')} data-testid="breach-open-rehearsal" />
        <span>
          <span className="font-medium">{t('open.rehearsal')}</span>
          <span className="block opacity-70">{t('open.rehearsal.note')}</span>
        </span>
      </label>
      <div className="flex flex-col gap-1">
        <label htmlFor="breach-open-title" className="text-sm font-medium">{t('open.field.title')}</label>
        <input id="breach-open-title" className="rounded border px-2 py-1" maxLength={200} {...a11y('title')} {...register('title')} data-testid="breach-open-title" />
        <p className="text-sm opacity-70">{t('hint.pii')}</p>
        {errors.title && <p id="breach-open-title-error" role="alert" className="text-sm text-status-fail-fg">{errors.title.message}</p>}
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="breach-open-aware" className="text-sm font-medium">{t('open.field.becameAwareAt')}</label>
        <input id="breach-open-aware" type="datetime-local" className="rounded border px-2 py-1" {...a11y('becameAwareAt')} {...register('becameAwareAt')} data-testid="breach-open-aware" />
        <p className="text-sm opacity-70">{t('open.field.becameAwareAt.note')}</p>
        {errors.becameAwareAt && <p id="breach-open-becameAwareAt-error" role="alert" className="text-sm text-status-fail-fg">{errors.becameAwareAt.message}</p>}
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="breach-open-source" className="text-sm font-medium">{t('open.field.detectionSource')}</label>
        <select id="breach-open-source" className="rounded border px-2 py-1" {...register('detectionSource')} data-testid="breach-open-source">
          {BREACH_DETECTION_SOURCES.map((s) => (
            <option key={s} value={s}>{t(`source.${s}`)}</option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="breach-open-ref" className="text-sm font-medium">{t('open.field.detectionSignalRef')}</label>
        <input id="breach-open-ref" className="rounded border px-2 py-1" maxLength={200} {...a11y('detectionSignalRef')} {...register('detectionSignalRef')} data-testid="breach-open-ref" />
        {errors.detectionSignalRef && <p id="breach-open-detectionSignalRef-error" role="alert" className="text-sm text-status-fail-fg">{errors.detectionSignalRef.message}</p>}
      </div>
      <button type="submit" disabled={pending} aria-busy={pending} className="self-start rounded bg-black px-4 py-2 text-white disabled:opacity-60" data-testid="breach-open-submit">
        {pending ? t('open.pending') : t('open.submit')}
      </button>
      {error !== undefined && <p role="alert" className="text-sm text-status-fail-fg" data-testid="breach-open-error">{error}</p>}
    </form>
  );
}
