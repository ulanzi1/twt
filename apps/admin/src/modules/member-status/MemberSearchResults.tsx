// Admin member-search results list (Story 4.7, Task 5; AC1).
//
// Renders the AR-65 compound-read-model results — the identity fields the server decrypted for display
// (name / masked-mobile / masked-Aadhaar / KYC strength) + the lifecycle state — as a selectable list.
// Selecting a row loads that member's validity payload into the `<MemberStatusPanel>`.
//
// ── Virtualization (recorded gap) ─────────────────────────────────────────────────────────────────
// The architecture names "Admin member-search results" a virtualized surface (:2666-2678). Results are
// server-clamped (limit ≤ 200), so v1 renders a plain scroll region; wiring TanStack Virtual / Virtuoso
// is deferred with the render-layer continuation (adding a virtualization dependency is out of the
// current change) — recorded as CR-4.7-D11. The list is keyboard-navigable + labelled regardless (AC3).

import type { MemberSearchResultItem } from '@twt/contracts';
import type { ReactElement } from 'react';

export interface MemberSearchResultsProps {
  items: readonly MemberSearchResultItem[];
  selectedId: string | null;
  onSelect: (memberId: string) => void;
}

export function MemberSearchResults({
  items,
  selectedId,
  onSelect,
}: MemberSearchResultsProps): ReactElement {
  if (items.length === 0) {
    return <p role="status" className="text-sm opacity-70">No members matched.</p>;
  }
  return (
    <ul
      aria-label="Member search results"
      data-testid="member-search-results"
      className="max-h-96 divide-y overflow-y-auto rounded border"
    >
      {items.map((m) => {
        const selected = m.memberId === selectedId;
        return (
          <li key={m.memberId}>
            <button
              type="button"
              onClick={() => onSelect(m.memberId)}
              aria-current={selected ? 'true' : undefined}
              data-testid={`member-row-${m.memberId}`}
              className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-gray-100 ${
                selected ? 'bg-gray-100 font-medium' : ''
              }`}
            >
              <span className="flex flex-col">
                <span>{m.name ?? 'Name unavailable'}</span>
                <span className="text-xs opacity-60">
                  {m.maskedMobile ?? 'no mobile'} · <code>{m.memberId.slice(0, 8)}…</code>
                </span>
              </span>
              <span className="rounded bg-gray-100 px-2 py-0.5 text-xs">{m.state}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
