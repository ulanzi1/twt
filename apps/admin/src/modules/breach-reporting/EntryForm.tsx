// One entry kind's form (Story 14.3, AC6 / AC12). The fields come from `fields.ts`; the payload is validated by the contract
// the server validates (`BreachEntryAppendRequest`) through a react-hook-form resolver. Mounted with `key={kind}` by the page,
// so each kind has its own form state.

import { BREACH_DATA_CATEGORIES, type BreachEntryKind } from '@twt/contracts';
import type { ReactElement } from 'react';
import { useForm, type Resolver } from 'react-hook-form';

import type { BreachEntryAppendBody } from '../../api/client.js';
import { ENTRY_FIELDS, buildEntryBody, type EntryFormValues, type FieldSpec } from './fields.js';
import { t } from './i18n-en.js';

const KIND_NOTES: Partial<Record<BreachEntryKind, string>> = {
  assessment: 'kind.assessment.note',
  signoff_recorded: 'kind.signoff_recorded.note',
  closed: 'kind.closed.note',
  board_extension_recorded: 'kind.board_extension_recorded.note',
  board_extension_withdrawn: 'kind.board_extension_withdrawn.note',
};

/** A recorded extension that may still be withdrawn — the choices of the withdrawal form. */
export interface WithdrawableExtension {
  readonly entryId: string;
  /** How staff recognise it: the period it allowed and its reference. */
  readonly label: string;
}

export interface EntryFormProps {
  readonly kind: BreachEntryKind;
  /** Send the entry; resolve `true` once the SERVER accepted it (the form then clears). */
  readonly onSubmit: (body: BreachEntryAppendBody) => Promise<boolean>;
  readonly pending: boolean;
  readonly error?: string | undefined;
  /** The extensions a `board_extension_withdrawn` may name (empty for every other kind). */
  readonly extensions?: readonly WithdrawableExtension[];
}

export function EntryForm({ kind, onSubmit, pending, error, extensions = [] }: EntryFormProps): ReactElement {
  const resolver: Resolver<EntryFormValues> = (values) => {
    const built = buildEntryBody(kind, values);
    if (built.ok) return { values, errors: {} };
    return { values: {}, errors: Object.fromEntries(Object.entries(built.errors).map(([name, key]) => [name, { type: 'validate', message: t(key) }])) };
  };
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EntryFormValues>({
    resolver,
    // The withdrawal picker's starting choice lives in the FORM's defaults (⛔ only the DOM's), so a clear after a save restores it.
    defaultValues: kind === 'board_extension_withdrawn' ? { withdrawsEntryId: extensions[0]?.entryId ?? '' } : {},
  });

  const submit = handleSubmit(async (values) => {
    const built = buildEntryBody(kind, values);
    if (!built.ok) return;
    if (await onSubmit(built.body)) reset();
  });

  const id = (name: string) => `breach-entry-${kind}-${name}`;
  const errId = (name: string) => `${id(name)}-error`;
  const message = (name: string): string | undefined => {
    const e = errors[name];
    return e !== undefined && typeof e.message === 'string' ? e.message : undefined;
  };
  /** A control in error says so, and names its error text (screen readers read it on focus — review 2026-11-20). */
  const invalid = (name: string) =>
    message(name) !== undefined ? ({ 'aria-invalid': true, 'aria-describedby': errId(name) } as const) : ({ 'aria-invalid': false } as const);

  function control(field: FieldSpec): ReactElement {
    const testId = `breach-entry-${field.name}`;
    const a11y = invalid(field.name);
    switch (field.type) {
      case 'textarea':
      case 'lines':
        return <textarea id={id(field.name)} className="rounded border px-2 py-1" rows={field.type === 'lines' ? 3 : 2} maxLength={field.type === 'lines' ? undefined : field.max} {...a11y} {...register(field.name)} data-testid={testId} />;
      case 'text':
        return <input id={id(field.name)} className="rounded border px-2 py-1" maxLength={field.max} {...a11y} {...register(field.name)} data-testid={testId} />;
      case 'datetime':
        return <input id={id(field.name)} type="datetime-local" className="rounded border px-2 py-1" {...a11y} {...register(field.name)} data-testid={testId} />;
      case 'date':
        return <input id={id(field.name)} type="date" className="rounded border px-2 py-1" {...a11y} {...register(field.name)} data-testid={testId} />;
      case 'integer-or-blank':
        return <input id={id(field.name)} inputMode="numeric" className="rounded border px-2 py-1" {...a11y} {...register(field.name)} data-testid={testId} />;
      case 'status':
        return (
          <select id={id(field.name)} className="rounded border px-2 py-1" defaultValue="implemented" {...a11y} {...register(field.name)} data-testid={testId}>
            <option value="implemented">{t('field.status.implemented')}</option>
            <option value="proposed">{t('field.status.proposed')}</option>
          </select>
        );
      case 'extension':
        return (
          <select id={id(field.name)} className="rounded border px-2 py-1" {...a11y} {...register(field.name)} data-testid={testId}>
            {extensions.map((x) => (
              <option key={x.entryId} value={x.entryId}>{x.label}</option>
            ))}
          </select>
        );
      case 'categories':
        // A GROUP of checkboxes is named by its legend (a <label for> cannot name a <div>) — see the fieldset below.
        return (
          <div className="flex flex-wrap gap-3">
            {BREACH_DATA_CATEGORIES.map((c) => (
              <label key={c} className="flex items-center gap-1 text-sm">
                <input type="checkbox" value={c} {...register(field.name)} data-testid={`${testId}-${c}`} />
                {t(`category.${c}`)}
              </label>
            ))}
          </div>
        );
      case 'affected':
        return (
          <div className="flex items-center gap-3">
            <input id={id(field.name)} inputMode="numeric" className="rounded border px-2 py-1" {...a11y} {...register(field.name)} data-testid={testId} />
            <label className="flex items-center gap-1 text-sm">
              <input type="checkbox" {...register(`${field.name}Unknown`)} data-testid={`${testId}-unknown`} />
              {t('field.estimatedAffected.unknown')}
            </label>
          </div>
        );
    }
  }

  const fieldError = (name: string) =>
    message(name) !== undefined && (
      <p id={errId(name)} role="alert" className="text-sm text-status-fail-fg">
        {message(name)}
      </p>
    );

  const note = KIND_NOTES[kind];
  return (
    <form className="flex flex-col gap-3" aria-label={t(`kind.${kind}`)} onSubmit={(e) => void submit(e)} data-testid={`breach-entry-form-${kind}`} noValidate>
      {note !== undefined && <p className="text-sm opacity-80" data-testid="breach-entry-kind-note">{t(note)}</p>}
      {ENTRY_FIELDS[kind].map((field) =>
        field.type === 'categories' ? (
          <fieldset key={field.name} className="flex flex-col gap-1" aria-describedby={message(field.name) !== undefined ? errId(field.name) : undefined} data-testid={`breach-entry-${field.name}-group`}>
            <legend className="text-sm font-medium">{t(`field.${field.name}`)}</legend>
            {control(field)}
            {fieldError(field.name)}
          </fieldset>
        ) : (
          <div key={field.name} className="flex flex-col gap-1">
            <label htmlFor={id(field.name)} className="text-sm font-medium">{t(`field.${field.name}`)}</label>
            {control(field)}
            {fieldError(field.name)}
          </div>
        ),
      )}
      {message('_form') !== undefined && <p role="alert" className="text-sm text-status-fail-fg">{message('_form')}</p>}
      <button type="submit" disabled={pending} aria-busy={pending} className="self-start rounded bg-black px-4 py-2 text-white disabled:opacity-60" data-testid="breach-entry-submit">
        {pending ? t('entry.pending') : t('entry.submit')}
      </button>
      {error !== undefined && <p role="alert" className="text-sm text-status-fail-fg" data-testid="breach-entry-error">{error}</p>}
    </form>
  );
}
