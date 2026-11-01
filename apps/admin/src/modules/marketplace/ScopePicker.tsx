// The audience picker — Story 12.2 step (c) (QE5, QE17; AC11).
//
// The places come from the SERVER (`GET …/modules/scope-options`): the Pariwar's published geo tree, or — with no tree —
// its listed workplace districts. A kind with no places is HIDDEN, with its reason; an option over 120 characters is
// shown DISABLED with its reason (⛔ truncated — a truncated value would match nobody). The picker emits the option's
// EXACT `value` (TR7 — ⛔ its rendered label, ⛔ trimmed, ⛔ case-changed). `role` / `cohort` are not offered (QE17).
// The truncation and reach notes describe the group (`aria-describedby`), and "No place matches the search." is spoken from an
// always-mounted polite status (RC17).

import type { ModuleScopeOptionDto, ModuleScopeOptionsResponse } from '@twt/contracts';
import { useMemo, useRef, useState, type ReactElement } from 'react';

import type { ScopeKind } from './derive.js';
import { resolveEn as t } from './i18n-en.js';

export interface ScopePickerProps {
  options: ModuleScopeOptionsResponse;
  kind: ScopeKind | null;
  values: readonly string[];
  onChange: (next: { kind: ScopeKind; values: string[] }) => void;
}

function optionLabel(o: ModuleScopeOptionDto): string {
  return o.state === null ? o.value : t('module.scope.inState', { district: o.value, state: o.state });
}

export function ScopePicker({ options, kind, values, onChange }: ScopePickerProps): ReactElement {
  const [search, setSearch] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const statesAvailable = options.states.length > 0;
  const districtsAvailable = options.districts.length > 0;
  const needle = search.trim().toLowerCase();
  const shown = useMemo(() => {
    const list = kind === 'state' ? options.states : kind === 'district' ? options.districts : [];
    return needle === '' ? list : list.filter((o) => o.value.toLowerCase().includes(needle) || (o.state ?? '').toLowerCase().includes(needle));
  }, [kind, options.states, options.districts, needle]);

  // Chosen values the current options do not list (a corrected copy of a module whose district was since removed, or lies past
  // the first 200 shown): they have no checkbox, yet they count and are sent, so they are listed here and can be removed (RP21).
  const kindList = kind === 'state' ? options.states : kind === 'district' ? options.districts : [];
  const notListed = kind === 'state' || kind === 'district' ? values.filter((v) => !kindList.some((o) => o.value === v)) : [];

  // The notes that describe the group — only those on screen (a dangling id would describe nothing).
  const describedBy = [
    kind === 'district' && options.districts_truncated ? 'scope-truncated-note' : null,
    kind === 'state' || kind === 'district' ? 'scope-no-district-note' : null,
    kind === 'district' ? 'scope-unlisted-district-note' : null,
  ]
    .filter((id): id is string => id !== null)
    .join(' ');

  const pickKind = (k: ScopeKind): void => {
    setSearch('');
    // Switching kind drops the other kind's values — a state and a district list never mix.
    onChange({ kind: k, values: k === kind ? [...values] : [] });
  };
  const toggle = (value: string): void => {
    if (kind !== 'state' && kind !== 'district') return;
    onChange({ kind, values: values.includes(value) ? values.filter((v) => v !== value) : [...values, value] });
  };

  return (
    <fieldset className="flex flex-col gap-2" aria-describedby={describedBy === '' ? undefined : describedBy} data-testid="scope-picker">
      <legend className="text-sm font-medium">{t('module.wizard.step.c')}</legend>
      <label className="flex items-center gap-2 text-sm">
        <input type="radio" name="scope-kind" checked={kind === 'members-all'} onChange={() => pickKind('members-all')} data-testid="scope-kind-members-all" />
        {t('module.scope.members-all')}
      </label>
      {statesAvailable ? (
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" name="scope-kind" checked={kind === 'state'} onChange={() => pickKind('state')} data-testid="scope-kind-state" />
          {t('module.scope.state')}
        </label>
      ) : (
        <p className="text-xs text-gray-600" data-testid="scope-no-states">
          {t('module.scope.noStates')}
        </p>
      )}
      {districtsAvailable ? (
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" name="scope-kind" checked={kind === 'district'} onChange={() => pickKind('district')} data-testid="scope-kind-district" />
          {t('module.scope.district')}
        </label>
      ) : (
        <p className="text-xs text-gray-600" data-testid="scope-no-districts">
          {t('module.scope.noDistricts')}
        </p>
      )}
      <p className="text-xs" data-testid="scope-role-cohort">
        {t('module.scope.roleCohort')}
      </p>

      {kind === 'state' || kind === 'district' ? (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-gray-600" data-testid="scope-source">
            {kind === 'district' && options.district_source === 'workplace_districts' ? t('module.scope.sourceWorkplaces') : t('module.scope.sourceTree')}
          </p>
          {kind === 'district' && options.districts_truncated ? (
            <p className="text-xs" role="note" id="scope-truncated-note" data-testid="scope-truncated">
              {t('module.scope.truncated', { n: options.districts.length })}
            </p>
          ) : null}
          <label className="flex flex-col text-xs">
            {t('module.scope.search')}
            <input ref={searchRef} className="rounded border px-2 py-1 text-sm" value={search} onChange={(e) => setSearch(e.target.value)} data-testid="scope-search" />
          </label>
          <p className="text-xs" aria-live="polite" data-testid="scope-chosen">
            {t('module.scope.chosen', { n: values.length })}
          </p>
          {notListed.length > 0 ? (
            <div className="flex flex-col gap-1 text-xs" data-testid="scope-not-listed">
              <p>{t('module.scope.notListed')}</p>
              <ul className="flex flex-col gap-1">
                {notListed.map((v) => (
                  <li key={v} className="flex items-center gap-2">
                    <span>{v}</span>
                    {/* The row (or the whole box, for the last one) unmounts under the button, so focus goes to the search field (PU3). */}
                    <button
                      type="button"
                      className="underline"
                      onClick={() => {
                        toggle(v);
                        searchRef.current?.focus();
                      }}
                      data-testid={`scope-remove-${v}`}
                    >
                      {t('module.scope.removeNamed', { value: v })}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <p className="text-xs" role="status" data-testid="scope-no-match">
            {shown.length === 0 ? t('module.scope.noMatch') : null}
          </p>
          <ul className="flex max-h-64 flex-col gap-1 overflow-y-auto" data-testid="scope-options">
            {shown.map((o) => (
              <li key={`${o.state ?? ''}|${o.value}`}>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={values.includes(o.value)}
                    disabled={!o.usable}
                    onChange={() => toggle(o.value)}
                    data-testid={`scope-option-${o.value}`}
                  />
                  <span>{optionLabel(o)}</span>
                  {!o.usable ? <span className="text-xs text-status-fail-fg">{t('module.scope.tooLong')}</span> : null}
                </label>
              </li>
            ))}
          </ul>
          {/* The reach consequences of a state / district audience (Policy meaning). */}
          <p className="text-xs" id="scope-no-district-note" data-testid="scope-no-district-line">
            {t('module.audience.noDistrict')}
          </p>
          {kind === 'district' ? (
            <p className="text-xs" id="scope-unlisted-district-note" data-testid="scope-unlisted-district-line">
              {t('module.audience.unlistedDistrict')}
            </p>
          ) : null}
        </div>
      ) : null}
    </fieldset>
  );
}
