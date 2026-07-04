// The admin member-search + status page (Story 4.7, Task 5; AC1).
//
// Orchestrates the AR-65 read model + the FR-12A validity read: the `<MemberLookupForm>` runs the search
// (a mutation); selecting a result loads that member's validity payload (a query) into the
// `<MemberStatusPanel>`. Server state is TanStack Query; the search + read are the support/dispute
// freshness class (fresh-on-mount), NOT the member self-service cached path.

import type { MemberSearchRequest, MemberSearchResultItem } from '@twt/contracts';
import type { ReactElement } from 'react';
import { useState } from 'react';

import { ApiError } from '../../api/client.js';
import { useMemberSearch, useMemberValidity } from '../../api/hooks.js';
import { MemberLookupForm } from './MemberLookupForm.js';
import { MemberSearchResults } from './MemberSearchResults.js';
import { MemberStatusPanel } from './MemberStatusPanel.js';

function messageOf(err: unknown): string | undefined {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return undefined;
}

export interface MemberSearchPageProps {
  pariwarId: string;
}

export function MemberSearchPage({ pariwarId }: MemberSearchPageProps): ReactElement {
  const search = useMemberSearch(pariwarId);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const validity = useMemberValidity(pariwarId, selectedId);

  const results: readonly MemberSearchResultItem[] = search.data?.results ?? [];
  const selectedItem = results.find((m) => m.memberId === selectedId);

  const onSearch = (payload: MemberSearchRequest): void => {
    setSelectedId(null);
    search.mutate(payload);
  };

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-xl font-bold">Member search</h1>
        <p className="mt-1 text-sm opacity-70">
          Look up a member and view their canonical validity status with rule-by-rule provenance.
        </p>
      </header>

      <section aria-label="Search" className="rounded border p-4">
        <MemberLookupForm onSubmit={onSearch} pending={search.isPending} submitError={messageOf(search.error)} />
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section aria-label="Results" className="rounded border p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide opacity-70">Results</h2>
          {search.isPending && <p role="status">Searching…</p>}
          {search.data && (
            <MemberSearchResults items={results} selectedId={selectedId} onSelect={setSelectedId} />
          )}
        </section>

        <section aria-label="Selected member" className="rounded border p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide opacity-70">Status</h2>
          {!selectedId && <p className="text-sm opacity-70">Select a member to view their status.</p>}
          {selectedId && validity.isLoading && <p role="status">Loading member status…</p>}
          {selectedId && validity.isError && (
            <p role="alert" className="text-sm text-status-fail-fg">
              Could not load member status: {messageOf(validity.error)}
            </p>
          )}
          {validity.data && (
            <MemberStatusPanel payload={validity.data.validity} identity={selectedItem} />
          )}
        </section>
      </div>
    </div>
  );
}
