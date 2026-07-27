// The `<StatusPill>` load-bearing gate — Story 9.6 (Task 6; AC2/AC3). DB-free, mock-free (the presenter
// is `(status) → view-model` and nothing else). This is the "cannot be silently extended" gate + the
// a11y-distinctness teeth ([[feedback_gate_scope_semantic_coverage]] — meaningful semantic coverage, not
// a green scan). It asserts:
//   (a) LOCKSTEP — the spec's key set EXACTLY equals `ContributionStatus.options` (a 6th state on EITHER
//       side fails; imports the runtime zod enum VALUE so the check is against the real wire taxonomy);
//   (b) every state resolves a non-empty tone/colorTokenRole/iconName/labelKey/a11yLabelKey;
//   (c) DISTINCTNESS — the 5 tones, the 5 iconNames, and the 5 labelKeys are each a set of size 5 (proves
//       the pill is NOT color-only and every state is genuinely differentiated — AC3);
//   (d) labelKey !== a11yLabelKey for every state (the terse label and the full-prose ARIA label differ);
//   (e) every colorTokenRole exists in `@twt/tokens` `color` (no dangling token reference — and proves
//       the new `status-held` role shipped).

import { ContributionStatus } from '@twt/contracts';
import { color } from '@twt/tokens';
import { describe, expect, it } from 'vitest';

import { STATUS_PILL_SPEC, deriveStatusPillViewModel } from '../../src/status-pill/index.js';

describe('STATUS_PILL_SPEC lockstep with the canonical wire taxonomy (AC2)', () => {
  it('key set EXACTLY equals ContributionStatus.options — a 6th state on either side fails', () => {
    expect(Object.keys(STATUS_PILL_SPEC).sort()).toEqual([...ContributionStatus.options].sort());
  });
});

describe('deriveStatusPillViewModel over all 5 states', () => {
  it('echoes the status and resolves a non-empty spec for every state', () => {
    for (const status of ContributionStatus.options) {
      const vm = deriveStatusPillViewModel(status);
      expect(vm.status).toBe(status);
      expect(vm.tone.length).toBeGreaterThan(0);
      expect(vm.colorTokenRole.length).toBeGreaterThan(0);
      expect(vm.iconName.length).toBeGreaterThan(0);
      expect(vm.labelKey.length).toBeGreaterThan(0);
      expect(vm.a11yLabelKey.length).toBeGreaterThan(0);
    }
  });

  it('label and ARIA keys follow the statusPill.<state> / _a11y convention', () => {
    for (const status of ContributionStatus.options) {
      const vm = deriveStatusPillViewModel(status);
      expect(vm.labelKey).toBe(`statusPill.${status}`);
      expect(vm.a11yLabelKey).toBe(`statusPill.${status}_a11y`);
    }
  });
});

describe('semantic distinctness — NOT color-only (AC3)', () => {
  const vms = ContributionStatus.options.map((s) => deriveStatusPillViewModel(s));

  it('all 5 tones are mutually distinct', () => {
    expect(new Set(vms.map((v) => v.tone)).size).toBe(5);
  });

  it('all 5 iconNames are mutually distinct (the a11y-load-bearing shape, D5)', () => {
    expect(new Set(vms.map((v) => v.iconName)).size).toBe(5);
  });

  it('all 5 labelKeys are mutually distinct', () => {
    expect(new Set(vms.map((v) => v.labelKey)).size).toBe(5);
  });

  it('the visible label key and the ARIA label key differ for every state', () => {
    for (const vm of vms) {
      expect(vm.labelKey).not.toBe(vm.a11yLabelKey);
    }
  });
});

describe('no dangling token reference — every colorTokenRole exists in @twt/tokens (AC2/AC4)', () => {
  it('resolves every state colorTokenRole against the @twt/tokens color group', () => {
    for (const status of ContributionStatus.options) {
      const { colorTokenRole } = deriveStatusPillViewModel(status);
      expect(color, `dangling token role ${colorTokenRole}`).toHaveProperty(colorTokenRole);
    }
  });

  it('the new status-held role shipped and is distinct from status-grey-takeover (D3)', () => {
    expect(color).toHaveProperty('status-held');
    expect(color['status-held']).not.toBe(color['status-grey-takeover']);
  });
});
