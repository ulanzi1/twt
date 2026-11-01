// Story 12.2 code review round 1 (RP21, RP32, RP35) — the audience picker as a controlled component. Covers: toggling places
// adds and removes them; switching the kind drops the other kind's values; "every member" carries no values; a chosen value
// the current options do not list is SHOWN with a Remove button (it counts and is sent, so it must be visible); the count is a
// live region.

import { fireEvent, render, screen } from '@testing-library/react';
import type { ModuleScopeOptionsResponse } from '@twt/contracts';
import { useState, type ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { ScopeKind } from '../src/modules/marketplace/derive.js';
import { resolveEn as t } from '../src/modules/marketplace/i18n-en.js';
import { ScopePicker } from '../src/modules/marketplace/ScopePicker.js';

const OPTIONS: ModuleScopeOptionsResponse = {
  geo_tree_version: 2,
  states: [{ value: 'Bihar', state: null, usable: true, unusable_reason: null }],
  districts: [
    { value: 'Gaya', state: 'Bihar', usable: true, unusable_reason: null },
    { value: 'Patna', state: 'Bihar', usable: true, unusable_reason: null },
  ],
  district_source: 'geo_tree',
  districts_truncated: false,
};

function Harness({ kind: k0 = null, values: v0 = [] }: { kind?: ScopeKind | null; values?: string[] }): ReactElement {
  const [kind, setKind] = useState<ScopeKind | null>(k0);
  const [values, setValues] = useState<string[]>(v0);
  return (
    <ScopePicker
      options={OPTIONS}
      kind={kind}
      values={values}
      onChange={(next) => {
        setKind(next.kind);
        setValues(next.values);
      }}
    />
  );
}
const chosen = (): string => screen.getByTestId('scope-chosen').textContent ?? '';

describe('ScopePicker', () => {
  it('ticking places adds them to the count and unticking removes them', () => {
    render(<Harness />);
    fireEvent.click(screen.getByTestId('scope-kind-district'));
    expect(chosen()).toBe(t('module.scope.chosen', { n: 0 }));
    fireEvent.click(screen.getByTestId('scope-option-Gaya'));
    fireEvent.click(screen.getByTestId('scope-option-Patna'));
    expect(chosen()).toBe(t('module.scope.chosen', { n: 2 }));
    expect(screen.getByTestId('scope-option-Gaya')).toBeChecked();
    fireEvent.click(screen.getByTestId('scope-option-Gaya'));
    expect(chosen()).toBe(t('module.scope.chosen', { n: 1 }));
    expect(screen.getByTestId('scope-option-Gaya')).not.toBeChecked();
  });

  it('switching the kind drops the other kind’s values, and "every member" carries none', () => {
    const onChange = vi.fn();
    render(<ScopePicker options={OPTIONS} kind="district" values={['Gaya']} onChange={onChange} />);
    fireEvent.click(screen.getByTestId('scope-kind-state'));
    expect(onChange).toHaveBeenLastCalledWith({ kind: 'state', values: [] });
    fireEvent.click(screen.getByTestId('scope-kind-members-all'));
    expect(onChange).toHaveBeenLastCalledWith({ kind: 'members-all', values: [] });
  });

  it('RP21: a chosen place the options do not list is shown with a Remove button, counted, and removable', () => {
    render(<Harness kind="district" values={['Gaya', 'Delisted']} />);
    expect(chosen()).toBe(t('module.scope.chosen', { n: 2 })); // it counts…
    const box = screen.getByTestId('scope-not-listed'); // …so it must be visible
    expect(box).toHaveTextContent(t('module.scope.notListed'));
    expect(box).toHaveTextContent('Delisted');
    expect(box).not.toHaveTextContent('Gaya'); // a listed place is not in this box
    fireEvent.click(screen.getByTestId('scope-remove-Delisted'));
    expect(chosen()).toBe(t('module.scope.chosen', { n: 1 }));
    expect(screen.queryByTestId('scope-not-listed')).toBeNull();
    expect(screen.getByTestId('scope-search')).toHaveFocus(); // PU3: the Remove button unmounted, so focus is not left on <body>
  });

  it('RP32: the count is a polite live region', () => {
    render(<Harness kind="state" />);
    expect(screen.getByTestId('scope-chosen')).toHaveAttribute('aria-live', 'polite');
  });
});

describe('ScopePicker — code review round 2 (chunk C)', () => {
  it('RC17: the truncation and reach notes describe the picker’s group', () => {
    render(<ScopePicker options={{ ...OPTIONS, districts_truncated: true }} kind="district" values={[]} onChange={vi.fn()} />);
    const group = screen.getByRole('group', { name: t('module.wizard.step.c') });
    expect(group).toHaveAccessibleDescription(
      [t('module.scope.truncated', { n: 2 }), t('module.audience.noDistrict'), t('module.audience.unlistedDistrict')].join(' '),
    );
  });

  it('RC17: a state audience is described by the one note that applies to it', () => {
    render(<ScopePicker options={OPTIONS} kind="state" values={[]} onChange={vi.fn()} />);
    expect(screen.getByRole('group', { name: t('module.wizard.step.c') })).toHaveAccessibleDescription(t('module.audience.noDistrict'));
  });

  it('RC17: "No place matches the search." is a polite status that is mounted before it is needed', () => {
    render(<Harness kind="district" />);
    const status = screen.getByTestId('scope-no-match');
    expect(status).toHaveAttribute('role', 'status');
    expect(status).toBeEmptyDOMElement();
    fireEvent.change(screen.getByTestId('scope-search'), { target: { value: 'zzz' } });
    expect(status).toHaveTextContent(t('module.scope.noMatch'));
  });
});
