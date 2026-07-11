// `<ScopeChrome>` + `<ScopeSwitcher>` — the cross-Pariwar scope chrome (Story 6.10, Task 4; AC3, D8).
// Pure presentational. The active Pariwar is displayed PROMINENTLY; the switcher lists the accessible
// Pariwars from the session's global-scope grants (DD-6). SWITCHING is an explicit navigation (D8):
// selecting a different Pariwar calls `onSwitch(targetPariwarId)` — the ROUTE (not this component)
// clears the current console packet + navigates to the target Pariwar's SAFE landing route (NOT the
// same claimCaseId under `/p/:otherId/`), so the old Pariwar's evidence is NEVER rendered under new
// chrome. This component never mutates state and never carries `claimCaseId` across Pariwars.

import type { ReactElement } from 'react';

import { verifierConsoleEn as t } from './i18n-en.js';

export interface PariwarOption {
  id: string;
  name: string;
}

export interface ScopeSwitcherProps {
  activePariwarId: string;
  pariwars: readonly PariwarOption[];
  /** Called with the TARGET Pariwar id on an explicit switch (never the active id). */
  onSwitch: (targetPariwarId: string) => void;
}

export function ScopeSwitcher({ activePariwarId, pariwars, onSwitch }: ScopeSwitcherProps): ReactElement | null {
  // Only meaningful when the actor can reach more than one Pariwar.
  if (pariwars.length <= 1) return null;
  return (
    <label className="flex items-center gap-2 text-sm" data-testid="scope-switcher">
      <span className="opacity-70">{t.scope.switchLabel}</span>
      <select
        className="rounded border px-2 py-1 text-sm"
        aria-label={t.scope.switchLabel}
        value={activePariwarId}
        onChange={(e) => {
          const target = e.target.value;
          if (target && target !== activePariwarId) onSwitch(target);
        }}
      >
        {pariwars.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </label>
  );
}

export interface ScopeChromeProps {
  activePariwarId: string;
  activePariwarName: string;
  pariwars: readonly PariwarOption[];
  onSwitch: (targetPariwarId: string) => void;
}

export function ScopeChrome({
  activePariwarId,
  activePariwarName,
  pariwars,
  onSwitch,
}: ScopeChromeProps): ReactElement {
  return (
    <header
      className="flex flex-wrap items-center justify-between gap-3 rounded border-b bg-gray-50 px-4 py-2"
      data-testid="scope-chrome"
    >
      <div className="flex flex-col">
        <span className="text-xs uppercase tracking-wide opacity-60">{t.scope.activeLabel}</span>
        <span className="text-base font-semibold" data-testid="active-pariwar-name" data-active-pariwar-id={activePariwarId}>
          {activePariwarName}
        </span>
      </div>
      <div className="flex flex-col items-end gap-1">
        <ScopeSwitcher activePariwarId={activePariwarId} pariwars={pariwars} onSwitch={onSwitch} />
        {pariwars.length > 1 ? <span className="text-xs opacity-50">{t.scope.switchHelp}</span> : null}
      </div>
    </header>
  );
}
