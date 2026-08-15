// `<HelpdeskOperatorPage>` — the helpdesk-console container (Story 10.3, Task 5; AC1/AC5).
//
// Wires the hooks + state around the pure `<HelpdeskOperatorShell>`. Orchestration:
//   search → select member → pick category (+ optional subcategory) → capture the issue → file →
//   "filed" confirmation (routing target + SLA).
//
// The member lookup REUSES the shipped Story 4.7 `<MemberLookupForm>` + `<MemberSearchResults>`
// (exact-match only — no search fork; the 6.3 `lookupSlot` injection precedent). The create POSTs the
// EXISTING 10.1 `CreateTicketRequest` with `created_via: 'helpline_call'` + `subject_member_id` = the
// selected member (`subject_actor_id` left null — v1 identifies a MEMBER); the server resolves the
// routing/scope-context/SLA + the operator_attribution from the session display_name. NO step-up.

import type {
  CreateTicketRequest,
  HelpdeskCategory,
  HelpdeskSubcategory,
  MemberSearchRequest,
  MemberSearchResultItem,
} from '@twt/contracts';
import type { ReactElement } from 'react';
import { useMemo, useState } from 'react';

import { ApiError } from '../../api/client.js';
import { useCreateHelplineTicket, useHelpdeskCategories, useMemberSearch } from '../../api/hooks.js';
import { MemberLookupForm } from '../member-status/MemberLookupForm.js';
import { MemberSearchResults } from '../member-status/MemberSearchResults.js';
import { HelpdeskOperatorShell, type HelpdeskFiledResult } from './HelpdeskOperatorShell.js';

function messageOf(err: unknown): string | undefined {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return undefined;
}

export interface HelpdeskOperatorPageProps {
  pariwarId: string;
}

export function HelpdeskOperatorPage({ pariwarId }: HelpdeskOperatorPageProps): ReactElement {
  const search = useMemberSearch(pariwarId);
  const categories = useHelpdeskCategories(pariwarId);
  const create = useCreateHelplineTicket(pariwarId);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [subCategory, setSubCategory] = useState<string | null>(null);
  // Story 10.29 — element 1's intake capture (Decision `2026-08-15-120` cl.1/cl.2).
  const [memberRequestedStaffMediation, setMemberRequestedStaffMediation] = useState(false);
  const [body, setBody] = useState('');
  const [result, setResult] = useState<HelpdeskFiledResult | null>(null);

  const results: readonly MemberSearchResultItem[] = useMemo(
    () => search.data?.results ?? [],
    [search.data],
  );
  const selected = results.find((m) => m.memberId === selectedId) ?? null;

  /** Reset the intake fields (category/subcategory/body) + any prior result — run on every member
   *  change and on "file another" so a prior ticket's state never rides onto a new filing. */
  const resetIntake = (): void => {
    setCategory(null);
    setSubCategory(null);
    // ⛔ Story 10.29 — reset with the rest of the intake. A ticked box surviving a member change would
    // record ONE member's request against ANOTHER member's ticket.
    setMemberRequestedStaffMediation(false);
    setBody('');
    setResult(null);
    create.reset();
  };

  const selectMember = (id: string | null): void => {
    setSelectedId(id);
    resetIntake();
  };

  const onSearch = (payload: MemberSearchRequest): void => {
    setSelectedId(null);
    resetIntake();
    search.mutate(payload);
  };

  const submit = (): void => {
    if (!selected || category === null || body.trim() === '') return;
    const payload = {
      subject_member_id: selected.memberId,
      category: category as HelpdeskCategory,
      sub_category: subCategory === null ? undefined : (subCategory as HelpdeskSubcategory),
      body: body.trim(),
      created_via: 'helpline_call',
      // Story 10.29 — element 1, captured at intake. ⛔ Sent only when actually ticked; the SERVER
      // stamps the instant (`2026-08-15-120` cl.1) — the wire never carries a client timestamp.
      member_requested_staff_mediated_delivery: memberRequestedStaffMediation ? true : undefined,
    } satisfies CreateTicketRequest;
    create.mutate(payload, {
      onSuccess: (ticket) => {
        setResult({
          ticketId: ticket.ticket_id,
          routedToRole: ticket.routed_to_role,
          routedToScope: ticket.routed_to_scope,
          slaFirstResponseDue: ticket.sla_first_response_due,
          slaResolutionDue: ticket.sla_resolution_due,
        });
      },
    });
  };

  const lookupSlot = (
    <div className="flex flex-col gap-4">
      <MemberLookupForm onSubmit={onSearch} pending={search.isPending} submitError={messageOf(search.error)} />
      {search.data && (
        <MemberSearchResults items={results} selectedId={selectedId} onSelect={selectMember} />
      )}
    </div>
  );

  return (
    <HelpdeskOperatorShell
      lookupSlot={lookupSlot}
      selected={selected}
      categories={categories.data?.categories ?? []}
      categoriesLoading={categories.isLoading}
      categoriesError={categories.isError ? messageOf(categories.error) : undefined}
      category={category}
      onCategoryChange={setCategory}
      subCategory={subCategory}
      onSubCategoryChange={setSubCategory}
      memberRequestedStaffMediation={memberRequestedStaffMediation}
      onMemberRequestedStaffMediationChange={setMemberRequestedStaffMediation}
      body={body}
      onBodyChange={setBody}
      onSubmit={submit}
      submitPending={create.isPending}
      submitError={create.isError ? messageOf(create.error) : undefined}
      result={result}
      onFileAnother={resetIntake}
    />
  );
}
