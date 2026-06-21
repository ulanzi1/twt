// Create/amend draft authoring form (AC1a/AC1b) — presentational. A GUIDED form over
// the trustee-entered DISPLAY fields (the payload is opaque — freeze row 14; Epic 4
// owns rule-specific semantics, so 2.4 captures the display fields + the workflow
// metadata, not a raw-JSON editor — Open Decision #4). Builds a typed CreateDraftBody
// via the pure `buildDraftBody` and hands it to `onSubmit`.

import type {
  ClauseDraftResponse,
  CreateDraftBody,
  UpdateClauseDraftRequest,
} from '@twt/contracts';
import type { ReactElement } from 'react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';

import {
  buildDraftBody,
  buildDraftPatch,
  draftToFormFields,
  type DraftFormFields,
} from './derive.js';

export interface DraftFormProps {
  onSubmit: (body: CreateDraftBody) => void;
  onUpdate?: (patch: UpdateClauseDraftRequest) => void;
  pending: boolean;
  editingDraft?: ClauseDraftResponse | null;
  onCancelEdit?: () => void;
  submitError?: string;
}

const EMPTY_VALUES: DraftFormFields = {
  operation: 'create',
  clauseId: '',
  ruleCode: '',
  titleEn: '',
  titleHi: '',
  effectiveDate: '',
  benefitMechanism: 'pool',
  affectedMemberScopeKind: 'all_members',
};

export function DraftForm({
  onSubmit,
  onUpdate,
  pending,
  editingDraft,
  onCancelEdit,
  submitError,
}: DraftFormProps): ReactElement {
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<DraftFormFields>({
    defaultValues: EMPTY_VALUES,
  });

  useEffect(() => {
    reset(editingDraft ? draftToFormFields(editingDraft) : EMPTY_VALUES);
  }, [editingDraft, reset]);

  const operation = watch('operation');
  const submit = handleSubmit((values) => {
    if (editingDraft && onUpdate) {
      onUpdate(buildDraftPatch(values));
      return;
    }
    onSubmit(buildDraftBody(values));
  });
  const isEditing = Boolean(editingDraft);

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => void submit(e)}
      aria-label="Author clause draft"
    >
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide opacity-70">
          {isEditing ? 'Edit clause draft' : 'Author a clause draft'}
        </h2>
        {isEditing && onCancelEdit && (
          <button
            type="button"
            className="ml-auto rounded border px-2 py-1 text-sm"
            onClick={onCancelEdit}
          >
            Cancel edit
          </button>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="operation" className="text-sm font-medium">
          Operation
        </label>
        <select
          id="operation"
          className="rounded border px-2 py-1"
          disabled={isEditing}
          {...register('operation')}
        >
          <option value="create">Create a new clause</option>
          <option value="amend">Amend an existing clause</option>
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="clauseId" className="text-sm font-medium">
          Clause id (niy.&lt;section&gt;.&lt;clause&gt;)
        </label>
        <input
          id="clauseId"
          className="rounded border px-2 py-1 font-mono"
          aria-invalid={errors.clauseId ? true : undefined}
          disabled={isEditing}
          {...register('clauseId', { required: 'Clause id is required' })}
        />
        {errors.clauseId && (
          <p role="alert" className="text-sm text-status-fail-fg">
            {errors.clauseId.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="ruleCode" className="text-sm font-medium">
          Rule code (display)
        </label>
        <input
          id="ruleCode"
          className="rounded border px-2 py-1"
          {...register('ruleCode', { required: 'Rule code is required' })}
        />
        {errors.ruleCode && (
          <p role="alert" className="text-sm text-status-fail-fg">
            {errors.ruleCode.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="titleEn" className="text-sm font-medium">
          Title (English)
        </label>
        <input
          id="titleEn"
          className="rounded border px-2 py-1"
          {...register('titleEn', { required: 'Title is required' })}
        />
        {errors.titleEn && (
          <p role="alert" className="text-sm text-status-fail-fg">
            {errors.titleEn.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="titleHi" className="text-sm font-medium">
          Title (Hindi, optional)
        </label>
        <input id="titleHi" className="rounded border px-2 py-1" {...register('titleHi')} />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="effectiveDate" className="text-sm font-medium">
          Effective date
        </label>
        <input
          id="effectiveDate"
          type="date"
          className="rounded border px-2 py-1"
          {...register('effectiveDate', { required: 'Effective date is required' })}
        />
        {errors.effectiveDate && (
          <p role="alert" className="text-sm text-status-fail-fg">
            {errors.effectiveDate.message}
          </p>
        )}
      </div>

      {operation === 'create' ? (
        <div className="flex flex-col gap-1">
          <label htmlFor="benefitMechanism" className="text-sm font-medium">
            Benefit mechanism
          </label>
          <select
            id="benefitMechanism"
            className="rounded border px-2 py-1"
            {...register('benefitMechanism')}
          >
            <option value="pool">Pool (crowdfunded daan)</option>
            <option value="reserve">Reserve (trust-paid)</option>
          </select>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <label htmlFor="affectedMemberScopeKind" className="text-sm font-medium">
            Affected-member scope
          </label>
          <select
            id="affectedMemberScopeKind"
            className="rounded border px-2 py-1"
            {...register('affectedMemberScopeKind')}
          >
            <option value="all_members">All members</option>
            <option value="past_lockin">Members past lock-in</option>
          </select>
          <p className="text-xs opacity-70">
            Scope it carefully — completeness is a review criterion; an incomplete scope is only
            caught later (Epic 4).
          </p>
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className="rounded bg-black px-4 py-2 text-white disabled:opacity-60"
        data-testid="create-draft-submit"
      >
        {pending ? 'Saving…' : isEditing ? 'Save changes' : 'Save draft'}
      </button>

      {submitError && (
        <p role="alert" className="text-sm text-status-fail-fg">
          {submitError}
        </p>
      )}
    </form>
  );
}
