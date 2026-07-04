// `<MemberLookupForm>` — admin member-record search (Story 4.7, Task 5; AC1, UX Phase 1 :2175).
//
// RHF + zodResolver over the SAME `MemberSearchRequest` contract the server validates. EXACT-MATCH only
// (D3): search by member_id, by mobile (the server blind-indexes the raw value), or browse the active
// Pariwar. Prefix/fuzzy + name/Aadhaar search are out of scope (D3) — the form offers only the shipped
// dimensions so the capability is not over-promised in the UI.

import { zodResolver } from '@hookform/resolvers/zod';
import { MemberSearchRequest } from '@twt/contracts';
import type { ReactElement } from 'react';
import { useForm } from 'react-hook-form';

const blankToUndefined = (v: string): string | undefined => (v === '' ? undefined : v);

export interface MemberLookupFormProps {
  onSubmit: (payload: MemberSearchRequest) => void;
  pending: boolean;
  submitError?: string;
}

export function MemberLookupForm({ onSubmit, pending, submitError }: MemberLookupFormProps): ReactElement {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<MemberSearchRequest>({
    resolver: zodResolver(MemberSearchRequest),
    defaultValues: { by: 'mobile', value: '' },
  });

  const by = watch('by');
  const needsValue = by !== 'pariwar';
  const submit = handleSubmit((values) => onSubmit(values));

  return (
    <form className="flex flex-col gap-3" onSubmit={(e) => void submit(e)} aria-label="Member search">
      <h2 className="text-sm font-semibold uppercase tracking-wide opacity-70">Find a member</h2>

      <div className="flex flex-col gap-1">
        <label htmlFor="searchBy" className="text-sm font-medium">Search by</label>
        <select id="searchBy" className="rounded border px-2 py-1" {...register('by')}>
          <option value="mobile">Mobile (exact)</option>
          <option value="memberId">Member ID</option>
          <option value="pariwar">Browse this Pariwar</option>
        </select>
      </div>

      {needsValue && (
        <div className="flex flex-col gap-1">
          <label htmlFor="searchValue" className="text-sm font-medium">
            {by === 'mobile' ? 'Mobile number' : 'Member ID (UUID)'}
          </label>
          <input
            id="searchValue"
            className="rounded border px-2 py-1"
            aria-invalid={errors.value ? true : undefined}
            {...register('value', { setValueAs: blankToUndefined })}
          />
          {errors.value && (
            <p role="alert" className="text-sm text-status-fail-fg">{errors.value.message}</p>
          )}
          <p className="text-xs opacity-60">
            Exact match only — partial / name / Aadhaar search is not available.
          </p>
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className="self-start rounded bg-black px-4 py-2 text-white disabled:opacity-60"
        data-testid="member-search-submit"
      >
        {pending ? 'Searching…' : 'Search'}
      </button>

      {submitError && <p role="alert" className="text-sm text-status-fail-fg">{submitError}</p>}
    </form>
  );
}
